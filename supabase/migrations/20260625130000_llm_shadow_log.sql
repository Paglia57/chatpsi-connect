-- Tabela de log do MODO SOMBRA da migração Assistants → Responses.
-- Registra, para chamadas da allowlist, a entrada e as saídas dos dois backends para
-- comparação manual de paridade. Escrita pelas Edge Functions via service_role (bypassa
-- RLS); leitura só pelo admin.

CREATE TABLE public.llm_shadow_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  task text,
  persona_slug text,
  shadow_key text,
  input text,
  output_assistants text,
  output_responses text,
  latency_assistants_ms int,
  latency_responses_ms int,
  diverged boolean,
  diff_summary text,
  error_responses text
);

CREATE INDEX idx_llm_shadow_log_created_at ON public.llm_shadow_log (created_at DESC);

ALTER TABLE public.llm_shadow_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view shadow log"
  ON public.llm_shadow_log FOR SELECT TO authenticated
  USING (public.is_admin());
-- Sem policies de escrita: inserção apenas via service_role nas Edge Functions.
