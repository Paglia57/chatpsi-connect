// Implementação do backend OpenAI Responses API (substitui Assistants v2).
// Mantém a MESMA interface de resultado do gateway. O estado da conversa é encadeado via
// `previous_response_id` (guardado pelos chamadores no mesmo lugar onde guardavam o thread).
// Escolha comentada: `previous_response_id` (preferência da spec) mantém o histórico do
// lado da OpenAI por encadeamento; o histórico 100% próprio (store:false, replay completo)
// fica como evolução para o roteamento multi-provedor.

import type { ChatContentPart, ChatOptions, ChatResult, ChatTool, ResolvedChat } from "./types.ts";
import { executeTool, toolsToMap } from "./toolrunner.ts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_TOOL_ROUNDS = 6;

/**
 * Só encadeia via previous_response_id se o id guardado for realmente da Responses
 * (`resp_...`). Ids legados das Assistants (`thread_...`) são ignorados — o turno começa
 * do zero e o novo `resp_...` retornado passa a ser guardado, auto-curando o estado no flip.
 */
export function asPreviousResponseId(id: string | undefined): string | undefined {
  return id && id.startsWith("resp_") ? id : undefined;
}

async function responsesRequest(body: Record<string, unknown>): Promise<any> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada no ambiente");

  const res = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Responses API error ${res.status}: ${errText}`);
  }
  return res.json();
}

function partToResponses(p: ChatContentPart): Record<string, unknown> {
  if (p.type === "text") return { type: "input_text", text: p.text };
  if (p.type === "image") return { type: "input_image", image_url: p.dataUrl };
  return { type: "input_file", file_id: p.fileId };
}

function buildInitialInput(opts: ChatOptions): string | unknown[] {
  if (opts.content && opts.content.length) {
    return [{ role: "user", content: opts.content.map(partToResponses) }];
  }
  return opts.userText ?? "";
}

function mapTools(tools: ChatTool[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    name: t.name,
    description: t.description ?? "",
    parameters: t.parameters ?? { type: "object", properties: {}, additionalProperties: true },
  }));
}

function extractText(resp: any): string {
  if (typeof resp.output_text === "string" && resp.output_text.length) return resp.output_text;
  const parts: string[] = [];
  for (const item of resp.output ?? []) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c.type === "output_text" && typeof c.text === "string") parts.push(c.text);
      }
    }
  }
  return parts.join("\n");
}

function extractFunctionCalls(resp: any): any[] {
  return (resp.output ?? []).filter((i: any) => i.type === "function_call");
}

function extractUsage(resp: any): ChatResult["usage"] {
  if (!resp.usage) return undefined;
  return {
    prompt: resp.usage.input_tokens ?? 0,
    completion: resp.usage.output_tokens ?? 0,
    total: resp.usage.total_tokens ?? 0,
  };
}

/** Conversa via Responses API, resolvendo tool calls localmente (mesmo formato de resultado). */
export async function chatViaOpenAIResponses(opts: ChatOptions, resolved: ResolvedChat): Promise<ChatResult> {
  const toolsByName = toolsToMap(opts.tools);
  const toolsPayload = opts.tools?.length ? mapTools(opts.tools) : undefined;
  const toolsFields = toolsPayload ? { tools: toolsPayload, tool_choice: "auto" } : {};

  let resp = await responsesRequest({
    model: resolved.model,
    instructions: resolved.instructions,
    input: buildInitialInput(opts),
    previous_response_id: asPreviousResponseId(opts.threadId),
    store: true,
    ...toolsFields,
  });

  let rounds = 0;
  while (true) {
    const calls = extractFunctionCalls(resp);
    if (!calls.length) break;
    if (++rounds > MAX_TOOL_ROUNDS) {
      throw new Error(`Excedido o limite de ${MAX_TOOL_ROUNDS} rodadas de tool calls (Responses)`);
    }
    const outputs = await Promise.all(
      calls.map(async (call: any) => ({
        type: "function_call_output",
        call_id: call.call_id,
        output: await executeTool(toolsByName, call.name, call.arguments),
      })),
    );
    resp = await responsesRequest({
      model: resolved.model,
      instructions: resolved.instructions,
      previous_response_id: resp.id,
      input: outputs,
      store: true,
      ...toolsFields,
    });
  }

  return { text: extractText(resp), threadId: resp.id, usage: extractUsage(resp) };
}

/**
 * Variante com streaming para os caminhos que hoje devolvem SSE ao frontend
 * (generate-evolution track paciente). Converte os eventos da Responses API para o MESMO
 * formato SSE Chat-Completions que o frontend já consome. Sem tools neste caminho.
 * `onComplete(responseId, usage)` é chamado ao final para o caller persistir o id.
 */
export async function chatStreamViaResponses(
  opts: ChatOptions,
  resolved: ResolvedChat,
  onComplete?: (responseId: string, usage: ChatResult["usage"]) => void,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada no ambiente");

  const upstream = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: resolved.model,
      instructions: resolved.instructions,
      input: buildInitialInput(opts),
      previous_response_id: asPreviousResponseId(opts.threadId),
      store: true,
      stream: true,
    }),
  });
  if (!upstream.ok || !upstream.body) {
    const errText = upstream.body ? await upstream.text() : "";
    throw new Error(`OpenAI Responses API error ${upstream.status}: ${errText}`);
  }

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    const reader = upstream.body!.getReader();
    let buffer = "";
    let responseId = "";
    let usage: ChatResult["usage"];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;
          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: evt.delta } }] })}\n\n`));
            } else if (evt.type === "response.completed" || evt.type === "response.incomplete" || evt.type === "response.failed") {
              if (evt.response?.id) responseId = evt.response.id;
              if (evt.response?.usage) {
                usage = {
                  prompt: evt.response.usage.input_tokens ?? 0,
                  completion: evt.response.usage.output_tokens ?? 0,
                  total: evt.response.usage.total_tokens ?? 0,
                };
              }
            } else if (evt.type === "response.created" && evt.response?.id) {
              responseId = evt.response.id;
            }
          } catch {
            // ignora chunk malformado
          }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("Erro no stream Responses:", e instanceof Error ? e.message : e);
    } finally {
      try {
        if (responseId && onComplete) onComplete(responseId, usage);
      } catch (_) { /* noop */ }
      await writer.close();
    }
  })();

  return readable;
}
