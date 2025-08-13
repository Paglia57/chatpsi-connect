-- Migração simplificada: adicionar campos à tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS plan text, 
ADD COLUMN IF NOT EXISTS subscribed_at timestamptz,
ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
ADD COLUMN IF NOT EXISTS default_thread_id uuid DEFAULT gen_random_uuid();

-- Poplar default_thread_id para usuários existentes que não têm
UPDATE profiles 
SET default_thread_id = gen_random_uuid() 
WHERE default_thread_id IS NULL;

-- Tornar default_thread_id NOT NULL após popular
ALTER TABLE profiles 
ALTER COLUMN default_thread_id SET NOT NULL;

-- Atualizar tabela messages para usar nomenclatura padrão
ALTER TABLE messages 
RENAME COLUMN content TO text;

ALTER TABLE messages 
RENAME COLUMN message_type TO type;

ALTER TABLE messages 
RENAME COLUMN file_url TO media_url;

-- Adicionar thread_id às mensagens existentes usando o default_thread_id do usuário
UPDATE messages 
SET thread_id = (
  SELECT default_thread_id 
  FROM profiles 
  WHERE profiles.user_id = messages.user_id
) 
WHERE thread_id IS NULL;

-- Tornar thread_id NOT NULL
ALTER TABLE messages 
ALTER COLUMN thread_id SET NOT NULL;

-- Criar tabela para logs de webhook
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text CHECK (direction IN ('outbound','inbound')),
  payload jsonb,
  status_code int,
  error text,
  created_at timestamptz DEFAULT now()
);

-- Atualizar constraints da tabela messages
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE messages 
ADD CONSTRAINT messages_type_check CHECK (type IN ('Texto','Áudio','Imagem','Vídeo','Documento'));

-- Atualizar trigger para updated_at em profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();