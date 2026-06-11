-- Canal novo de WhatsApp (Cloud API oficial), rodando em paralelo ao n8n num número de teste.
-- Tabelas PRÓPRIAS deste canal — não tocam em profiles, userinativos nem _chat_history (do n8n).
-- Todas com RLS habilitado e acesso apenas via service_role (mesmo padrão de webhook_events).

-- Sessão/thread por número (uma thread própria do canal novo, separada da thread de produção).
CREATE TABLE IF NOT EXISTS wa_sessions (
  phone text PRIMARY KEY,
  kind text CHECK (kind IN ('clinico','vendas')),
  thread_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Histórico de mensagens do canal novo.
CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  role text CHECK (role IN ('user','ai')),
  content text,
  usage jsonb,
  created_at timestamptz DEFAULT now()
);

-- Leads (números não cadastrados em profiles) — substitui userinativos para o canal novo.
CREATE TABLE IF NOT EXISTS wa_leads (
  phone text PRIMARY KEY,
  name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_created_at
  ON wa_messages (phone, created_at);

-- RLS: apenas service_role pode acessar (padrão de webhook_events).
ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage wa_sessions" ON wa_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage wa_messages" ON wa_messages
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage wa_leads" ON wa_leads
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
