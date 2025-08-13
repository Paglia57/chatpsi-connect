-- Habilitar RLS na tabela webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para webhook_events (apenas admin pode acessar)
CREATE POLICY "Service role can manage webhook events" ON webhook_events
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Atualizar RLS policies das mensagens para usar thread_id corretamente
DROP POLICY IF EXISTS "Active subscribers can insert messages" ON messages;

CREATE POLICY "Active subscribers can insert messages" ON messages
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND thread_id = (
    SELECT default_thread_id 
    FROM profiles 
    WHERE user_id = auth.uid() 
    AND subscription_active = true
  )
);