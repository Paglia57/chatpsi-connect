// Gateway de IA provider-agnóstico.
//
// Expõe uma interface única e estável — `chat()` — para interagir com um LLM.
// A implementação atual usa a OpenAI Assistants API, mas TODA a lógica específica
// da OpenAI fica escondida atrás de `chat()`. Trocar de provedor/modelo no futuro
// (ex.: OpenAI Responses API) deve ser uma mudança apenas neste arquivo, sem afetar
// quem chama o módulo.

const OPENAI_BASE = 'https://api.openai.com/v1';

// Limites de polling — nunca loop infinito.
const POLL_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;

// --- Interface pública (estável) ---

export type ChatTool = {
  name: string;
  handler: (args: Record<string, unknown>) => Promise<string>;
};

export type ChatOptions = {
  /** Ex.: "clinico" | "vendas". Hoje só roteia para OpenAI; serve para roteamento futuro. */
  task: string;
  /** Id do assistant da OpenAI a usar. */
  assistantId: string;
  /** Texto do usuário. */
  userText: string;
  /** Se ausente, cria uma thread nova. */
  threadId?: string;
  /** Handlers para as funções que o assistant pode chamar. */
  tools?: ChatTool[];
};

export type ChatResult = {
  text: string;
  threadId: string;
  usage?: { prompt: number; completion: number; total: number };
};

/**
 * Conversa com o LLM, resolvendo tool calls localmente quando necessário.
 * Retorna o texto final do assistant, o threadId (novo ou reutilizado) e, se
 * disponível, o uso de tokens.
 */
export async function chat(opts: ChatOptions): Promise<ChatResult> {
  // Roteamento futuro por `task` acontecerá aqui; hoje sempre OpenAI Assistants.
  return await chatViaOpenAIAssistants(opts);
}

// --- Implementação OpenAI Assistants API (privada ao módulo) ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Faz uma requisição à OpenAI Assistants API. Lança erro descritivo (sem vazar a chave). */
async function openaiRequest(path: string, options: RequestInit = {}): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada no ambiente');
  }

  const res = await fetch(`${OPENAI_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    // Não logar a chave; apenas status + corpo do erro da OpenAI.
    throw new Error(`OpenAI API error ${res.status} em ${path}: ${errText}`);
  }
  return res.json();
}

/** Executa um tool call resolvendo o handler local correspondente. */
async function runToolCall(
  toolCall: any,
  toolsByName: Map<string, ChatTool>,
): Promise<{ tool_call_id: string; output: string }> {
  const fnName: string = toolCall?.function?.name ?? '';
  const tool = toolsByName.get(fnName);

  if (!tool) {
    return {
      tool_call_id: toolCall.id,
      output: `Ferramenta "${fnName}" não disponível.`,
    };
  }

  let args: Record<string, unknown> = {};
  try {
    const rawArgs = toolCall?.function?.arguments;
    if (rawArgs) args = JSON.parse(rawArgs);
  } catch {
    args = {};
  }

  try {
    const output = await tool.handler(args);
    return { tool_call_id: toolCall.id, output };
  } catch (err) {
    return {
      tool_call_id: toolCall.id,
      output: `Erro ao executar a ferramenta "${fnName}": ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

async function chatViaOpenAIAssistants(opts: ChatOptions): Promise<ChatResult> {
  const { assistantId, userText, tools = [] } = opts;
  const toolsByName = new Map(tools.map((t) => [t.name, t]));

  // 1. Garante uma thread.
  let threadId = opts.threadId;
  if (!threadId) {
    const thread = await openaiRequest('/threads', { method: 'POST', body: '{}' });
    threadId = thread.id as string;
  }

  // 2. Adiciona a mensagem do usuário.
  await openaiRequest(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role: 'user', content: userText }),
  });

  // 3. Cria o run.
  const run = await openaiRequest(`/threads/${threadId}/runs`, {
    method: 'POST',
    body: JSON.stringify({ assistant_id: assistantId }),
  });
  const runId = run.id as string;

  // 4. Polling com tratamento de tool calls (requires_action) e limites de tempo.
  const TERMINAL = ['completed', 'failed', 'cancelled', 'expired', 'incomplete'];
  const startTime = Date.now();
  let current = run;

  while (!TERMINAL.includes(current.status)) {
    if (Date.now() - startTime > POLL_TIMEOUT_MS) {
      throw new Error(`Tempo limite excedido aguardando o run ${runId} (último status: ${current.status})`);
    }

    if (current.status === 'requires_action') {
      const toolCalls: any[] = current.required_action?.submit_tool_outputs?.tool_calls ?? [];
      const tool_outputs = await Promise.all(
        toolCalls.map((tc) => runToolCall(tc, toolsByName)),
      );

      current = await openaiRequest(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
        method: 'POST',
        body: JSON.stringify({ tool_outputs }),
      });
      continue;
    }

    await sleep(POLL_INTERVAL_MS);
    current = await openaiRequest(`/threads/${threadId}/runs/${runId}`);
  }

  if (current.status !== 'completed') {
    const lastError = current.last_error ? `: ${current.last_error.code} — ${current.last_error.message}` : '';
    throw new Error(`Run terminou com status "${current.status}"${lastError}`);
  }

  // 5. Lê a última mensagem do assistant.
  const messages = await openaiRequest(`/threads/${threadId}/messages?limit=1&order=desc`);
  const assistantMsg = messages.data?.[0];
  if (!assistantMsg || assistantMsg.role !== 'assistant') {
    throw new Error('Resposta do assistant não encontrada');
  }

  const text = (assistantMsg.content ?? [])
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text.value)
    .join('\n');

  // 6. Extrai usage de tokens, se disponível.
  let usage: ChatResult['usage'];
  if (current.usage) {
    usage = {
      prompt: current.usage.prompt_tokens ?? 0,
      completion: current.usage.completion_tokens ?? 0,
      total: current.usage.total_tokens ?? 0,
    };
  }

  // 7. Retorna o resultado.
  return { text, threadId, usage };
}
