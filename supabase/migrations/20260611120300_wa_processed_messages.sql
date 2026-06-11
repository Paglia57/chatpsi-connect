-- Idempotência do webhook: a Meta pode reentregar a mesma mensagem (mesmo message.id) em caso de
-- timeout. Como a v2 grava dados irreversíveis após confirmação, registramos os ids já processados
-- para nunca processar duas vezes. RLS service_role (sem policies), padrão do canal.

CREATE TABLE IF NOT EXISTS public.wa_processed_messages (
  message_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_processed_messages ENABLE ROW LEVEL SECURITY;
