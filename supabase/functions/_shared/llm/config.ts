// Configuração central do gateway de IA: seleção de backend, mapa persona→assistant,
// modelo default e parâmetros do modo sombra. Tudo via env (Supabase secrets), para
// trocar de backend ou ligar a sombra ser um "rollback de uma linha".

export type LlmBackend = "assistants" | "responses";

/** Backend ativo. Default 'assistants' (comportamento atual) até validar a Responses. */
export function getBackend(): LlmBackend {
  const v = (Deno.env.get("LLM_BACKEND") ?? "assistants").trim().toLowerCase();
  return v === "responses" ? "responses" : "assistants";
}

/** Modelo default para a Responses API quando a persona não traz model_hint. */
export function defaultModel(): string {
  return Deno.env.get("LLM_DEFAULT_MODEL") ?? "gpt-4.1-mini";
}

/**
 * Mapa persona (slug) → Assistant ID da OpenAI. Centraliza os IDs antes espalhados no
 * código. Usado pelo backend `assistants` para resolver o assistant a partir do slug,
 * e como referência da migração. O fluxo por paciente NÃO usa este mapa (assistant
 * dinâmico, passado via `assistantId`).
 */
export const PERSONA_ASSISTANT_MAP: Record<string, string> = {
  clinico_web: "asst_4sei53DAsGVYUhyZzp3BsLJZ",
  clinico_whatsapp: "asst_ghTrVWfzgh5vtW28qDs5MnRB",
  vendas: "asst_TjXksuG8kL3Gp6xLb1QIQALE",
  marketing: "asst_RmdTDmgUPmKNSoXoQ4FMHip1",
  plano_acao: "asst_esHKfSJcaMNF99QVrILGu6pW",
};

export function assistantIdForPersona(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return PERSONA_ASSISTANT_MAP[slug];
}

/** Modo sombra ligado? (roda Responses em paralelo só para comparar, sem entregar). */
export function isShadow(): boolean {
  return (Deno.env.get("LLM_SHADOW") ?? "false").trim().toLowerCase() === "true";
}

/** Allowlist (CSV) de chaves de sombra — telefones/user_ids de teste. Vazio = ninguém. */
export function shadowAllowlist(): string[] {
  return (Deno.env.get("LLM_SHADOW_ALLOWLIST") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Decide se uma chamada entra no modo sombra, dado o shadowKey (telefone/user). */
export function shouldShadow(shadowKey: string | undefined): boolean {
  if (!isShadow()) return false;
  const list = shadowAllowlist();
  if (list.length === 0) return false; // sem allowlist => não sombrear ninguém (seguro)
  if (!shadowKey) return false;
  const digits = shadowKey.replace(/\D/g, "");
  return list.some((entry) => {
    const e = entry.replace(/\D/g, "");
    return entry === shadowKey || (e.length > 0 && e === digits);
  });
}
