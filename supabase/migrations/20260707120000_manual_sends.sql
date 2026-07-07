-- Auditoria e idempotência do envio do Manual do WhatsApp pelo admin.
-- Um registro por (destinatário, versão do manual): evita reenvio duplicado e
-- guarda por qual canal foi (documento livre grátis vs template utility pago),
-- além do custo/entrega reportado depois pelo webhook de status (pricing).
-- RLS: apenas service_role (mesmo padrão de wa_messages/webhook_events).

CREATE TABLE IF NOT EXISTS manual_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,                 -- número normalizado (só dígitos, E.164 sem +)
  user_id uuid,                        -- profiles.user_id quando conhecido
  manual_version text NOT NULL,        -- ex.: 'whatsapp-2026-07'
  channel text CHECK (channel IN ('free_document','template')),
  wa_message_id text,                  -- wamid retornado pela Graph API (quando houver)
  status text DEFAULT 'sent' CHECK (status IN ('sent','failed','delivered','read','undelivered','skipped')),
  is_billable boolean,                 -- vem do webhook de status
  pricing_category text,               -- 'utility' | 'marketing' | 'service' (webhook)
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Idempotência: no máximo um envio bem-sucedido por número+versão.
CREATE UNIQUE INDEX IF NOT EXISTS uq_manual_sends_phone_version
  ON manual_sends (phone, manual_version);

CREATE INDEX IF NOT EXISTS idx_manual_sends_created_at ON manual_sends (created_at);

ALTER TABLE manual_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage manual_sends" ON manual_sends
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
