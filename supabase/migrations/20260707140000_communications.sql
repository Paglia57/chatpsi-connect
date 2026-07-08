-- Módulo de Comunicações/Notificações (super admin).
-- Biblioteca de mensagens salvas + auditoria/idempotência de disparos.
-- Regras Meta: dentro da janela 24h = mensagem livre (grátis); fora = template aprovado
-- (utility ~R$0,035; marketing ~R$0,32). A categoria default é utility.
-- RLS: apenas service_role (o acesso do admin passa pelas edge functions, que checam is_admin).

CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','document','image','video')),
  body_text text,                       -- texto livre (dentro da janela) / legenda da mídia
  media_url text,                       -- URL pública da mídia (public-assets)
  media_filename text,                  -- nome exibido (documentos)
  template_name text,                   -- template Meta aprovado (envio fora da janela)
  template_lang text DEFAULT 'pt_BR',
  category text NOT NULL DEFAULT 'utility' CHECK (category IN ('utility','marketing')),
  dedupe boolean NOT NULL DEFAULT true, -- não reenviar a mesma comunicação ao mesmo número
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communication_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid REFERENCES communications(id) ON DELETE CASCADE,
  phone text NOT NULL,                  -- normalizado (só dígitos, E.164 sem +)
  user_id uuid,
  channel text CHECK (channel IN ('free_text','free_media','template')),
  status text DEFAULT 'sent' CHECK (status IN ('sent','failed','delivered','read','undelivered','skipped')),
  wa_message_id text,
  is_billable boolean,
  pricing_category text,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_sends_comm_phone
  ON communication_sends (communication_id, phone);
CREATE INDEX IF NOT EXISTS idx_comm_sends_created_at ON communication_sends (created_at);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communications' AND policyname='Service role manages communications') THEN
    CREATE POLICY "Service role manages communications" ON communications
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communication_sends' AND policyname='Service role manages communication_sends') THEN
    CREATE POLICY "Service role manages communication_sends" ON communication_sends
      FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
  -- Admin (frontend, via JWT do usuário) gerencia a biblioteca e lê o histórico de envios.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communications' AND policyname='Admins manage communications') THEN
    CREATE POLICY "Admins manage communications" ON communications
      FOR ALL USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communication_sends' AND policyname='Admins read communication_sends') THEN
    CREATE POLICY "Admins read communication_sends" ON communication_sends
      FOR SELECT USING (is_admin());
  END IF;
END $$;

-- Seed: o Manual do WhatsApp como primeira comunicação (documento).
INSERT INTO communications (name, description, kind, body_text, media_url, media_filename, template_name, template_lang, category)
SELECT
  'Manual do WhatsApp',
  'Guia rápido de uso do ChatPsi no WhatsApp (PDF).',
  'document',
  E'Olá, {{nome}}! 👋\n\n📄 *Seu guia rápido do ChatPsi no WhatsApp*\nUm passo a passo de *Antes · Durante · Depois* da sua prática clínica: planejar, conversar e registrar a evolução — tudo por aqui.\n\nÉ só abrir o arquivo. Qualquer dúvida, responda nesta conversa. 💙',
  'https://cdn.jsdelivr.net/gh/Paglia57/chatpsi-connect@main/public/manual-whatsapp-chatpsi.pdf',
  'Manual do WhatsApp - ChatPsi.pdf',
  'manual_whatsapp',
  'pt_BR',
  'utility'
WHERE NOT EXISTS (SELECT 1 FROM communications WHERE name = 'Manual do WhatsApp');
