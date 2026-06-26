// Gateway de IA provider-agnóstico.
//
// Expõe uma interface única e estável — `chat()` — para interagir com um LLM. A
// implementação por baixo é selecionada por env `LLM_BACKEND` ('assistants' | 'responses'),
// permitindo trocar/rollback sem mexer em quem chama. Os system prompts vêm do sistema de
// personas no banco (getPersona). Tipos públicos ficam em ./types.ts.

import type { ChatContentPart, ChatOptions, ChatResult, ResolvedChat } from "./types.ts";
import { assistantIdForPersona, defaultModel, getBackend, shouldShadow } from "./config.ts";
import { executeTool, toolsToMap } from "./toolrunner.ts";
import { chatViaOpenAIResponses } from "./responses.ts";
import { runShadow } from "./shadow.ts";
import { getPersona } from "../personas/resolve.ts";

export type { ChatContentPart, ChatOptions, ChatResult, ChatTool } from "./types.ts";

const OPENAI_BASE = "https://api.openai.com/v1";
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;

/**
 * Conversa com o LLM, resolvendo tool calls localmente quando necessário.
 * Resolve instruções (persona) e assistant, escolhe o backend e — sob 'assistants' com
 * sombra ligada — dispara a comparação com a Responses em paralelo.
 */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const instructions = opts.instructions ??
    (opts.personaSlug ? await getPersona(opts.personaSlug) : undefined);
  const assistantId = opts.assistantId ?? assistantIdForPersona(opts.personaSlug);
  // model_hint da persona pode ser ligado aqui no futuro; hoje todas usam o default.
  const model = opts.model ?? defaultModel();
  const resolved: ResolvedChat = { instructions, assistantId, model };

  if (getBackend() === "responses") {
    return await chatViaOpenAIResponses(opts, resolved);
  }

  const started = Date.now();
  const result = await chatViaOpenAIAssistants(opts, resolved);
  if (shouldShadow(opts.shadowKey)) {
    runShadow(opts, resolved, result, Date.now() - started);
  }
  return result;
}

// --- Implementação OpenAI Assistants API (privada ao módulo) ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openaiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada no ambiente");

  const res = await fetch(`${OPENAI_BASE}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status} em ${path}: ${errText}`);
  }
  return res.json();
}

/** Monta o content (e attachments) da mensagem da thread a partir de userText/content. */
function buildAssistantMessage(opts: ChatOptions): { content: unknown; attachments?: unknown[] } {
  if (opts.content && opts.content.length) {
    const blocks: unknown[] = [];
    const attachments: unknown[] = [];
    for (const p of opts.content as ChatContentPart[]) {
      if (p.type === "text") blocks.push({ type: "text", text: p.text });
      else if (p.type === "image") blocks.push({ type: "image_url", image_url: { url: p.dataUrl } });
      else attachments.push({ file_id: p.fileId, tools: [{ type: "file_search" }] });
    }
    if (blocks.length === 0) blocks.push({ type: "text", text: opts.userText || "Analise o anexo enviado." });
    return { content: blocks, attachments: attachments.length ? attachments : undefined };
  }
  return { content: opts.userText ?? "" };
}

async function chatViaOpenAIAssistants(opts: ChatOptions, resolved: ResolvedChat): Promise<ChatResult> {
  const assistantId = resolved.assistantId;
  if (!assistantId) {
    throw new Error("Backend 'assistants': assistantId não resolvido (personaSlug sem mapa e sem assistantId).");
  }
  const toolsByName = toolsToMap(opts.tools);

  // 1. Garante uma thread.
  let threadId = opts.threadId;
  if (!threadId) {
    const thread = await openaiRequest("/threads", { method: "POST", body: "{}" });
    threadId = thread.id as string;
  }

  // 2. Adiciona a mensagem do usuário (texto/imagens/anexos).
  const { content, attachments } = buildAssistantMessage(opts);
  const messagePayload: Record<string, unknown> = { role: "user", content };
  if (attachments) messagePayload.attachments = attachments;
  await openaiRequest(`/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify(messagePayload),
  });

  // 3. Cria o run.
  const run = await openaiRequest(`/threads/${threadId}/runs`, {
    method: "POST",
    body: JSON.stringify({ assistant_id: assistantId }),
  });
  const runId = run.id as string;

  // 4. Polling com tratamento de tool calls e limite de tempo.
  const TERMINAL = ["completed", "failed", "cancelled", "expired", "incomplete"];
  const startTime = Date.now();
  let current = run;

  while (!TERMINAL.includes(current.status)) {
    if (Date.now() - startTime > POLL_TIMEOUT_MS) {
      throw new Error(`Tempo limite excedido aguardando o run ${runId} (último status: ${current.status})`);
    }

    if (current.status === "requires_action") {
      const toolCalls: any[] = current.required_action?.submit_tool_outputs?.tool_calls ?? [];
      const tool_outputs = await Promise.all(
        toolCalls.map(async (tc) => ({
          tool_call_id: tc.id,
          output: await executeTool(toolsByName, tc?.function?.name ?? "", tc?.function?.arguments),
        })),
      );
      current = await openaiRequest(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
        method: "POST",
        body: JSON.stringify({ tool_outputs }),
      });
      continue;
    }

    await sleep(POLL_INTERVAL_MS);
    current = await openaiRequest(`/threads/${threadId}/runs/${runId}`);
  }

  if (current.status !== "completed") {
    const lastError = current.last_error ? `: ${current.last_error.code} — ${current.last_error.message}` : "";
    throw new Error(`Run terminou com status "${current.status}"${lastError}`);
  }

  // 5. Lê a última mensagem do assistant.
  const messages = await openaiRequest(`/threads/${threadId}/messages?limit=1&order=desc`);
  const assistantMsg = messages.data?.[0];
  if (!assistantMsg || assistantMsg.role !== "assistant") {
    throw new Error("Resposta do assistant não encontrada");
  }

  const text = (assistantMsg.content ?? [])
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text.value)
    .join("\n");

  // 6. Extrai usage de tokens, se disponível.
  let usage: ChatResult["usage"];
  if (current.usage) {
    usage = {
      prompt: current.usage.prompt_tokens ?? 0,
      completion: current.usage.completion_tokens ?? 0,
      total: current.usage.total_tokens ?? 0,
    };
  }

  return { text, threadId, usage };
}
