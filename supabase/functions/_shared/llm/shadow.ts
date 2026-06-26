// Modo sombra: roda o backend Responses EM PARALELO ao ativo (best-effort), sem entregar
// a saída ao usuário, e grava ambas em llm_shadow_log para comparação manual de paridade.
// Nunca bloqueia nem quebra o fluxo principal.
//
// Limitação consciente: a run de sombra é feita SEM previous_response_id (o estado do
// backend ativo é um thread da Assistants, incompatível com a Responses). Portanto a
// comparação é mais fiel em turnos isolados/de turno único.

import type { ChatOptions, ChatResult, ResolvedChat } from "./types.ts";
import { chatViaOpenAIResponses } from "./responses.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;
async function getClient() {
  if (_client) return _client;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _client;
}

function summarizeInput(opts: ChatOptions): string {
  if (opts.userText) return opts.userText;
  if (opts.content) {
    return opts.content.map((p) => (p.type === "text" ? p.text : `[${p.type}]`)).join(" ");
  }
  return "";
}

const normalize = (s: string) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

/** Dispara a run de sombra sem bloquear (EdgeRuntime.waitUntil quando disponível). */
export function runShadow(
  opts: ChatOptions,
  resolved: ResolvedChat,
  activeResult: ChatResult,
  activeLatencyMs?: number,
): void {
  const task = async () => {
    const started = Date.now();
    let responsesText = "";
    let err = "";
    try {
      const r = await chatViaOpenAIResponses({ ...opts, threadId: undefined }, resolved);
      responsesText = r.text;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    const latency = Date.now() - started;
    try {
      const client = await getClient();
      const a = activeResult.text ?? "";
      const diverged = normalize(a) !== normalize(responsesText);
      await client.from("llm_shadow_log").insert({
        task: opts.task,
        persona_slug: opts.personaSlug ?? null,
        shadow_key: opts.shadowKey ?? null,
        input: summarizeInput(opts).slice(0, 8000),
        output_assistants: a.slice(0, 16000),
        output_responses: responsesText.slice(0, 16000),
        latency_assistants_ms: activeLatencyMs ?? null,
        latency_responses_ms: latency,
        diverged,
        diff_summary: diverged ? `len assistants=${a.length} responses=${responsesText.length}` : null,
        error_responses: err || null,
      });
    } catch (e) {
      console.error("Falha ao gravar llm_shadow_log:", e instanceof Error ? e.message : e);
    }
  };

  // @ts-ignore — EdgeRuntime é provido pelo runtime das Edge Functions.
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(task());
  } else {
    void task();
  }
}
