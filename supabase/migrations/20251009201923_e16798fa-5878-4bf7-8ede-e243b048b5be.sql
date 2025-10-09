-- Adicionar coluna threads_plano em profiles
ALTER TABLE public.profiles 
ADD COLUMN threads_plano TEXT NULL;

-- Criar tabela plano_chat_history
CREATE TABLE public.plano_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_sent TEXT NULL,
  input_text TEXT NOT NULL,
  http_status INTEGER NULL,
  response_json JSONB NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_plano_history_user_id ON public.plano_chat_history(user_id);
CREATE INDEX idx_plano_history_created_at ON public.plano_chat_history(created_at DESC);

-- RLS Policies
ALTER TABLE public.plano_chat_history ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver apenas seu próprio histórico
CREATE POLICY "Users can view their own plano history"
ON public.plano_chat_history
FOR SELECT
USING (auth.uid() = user_id);

-- Apenas Edge Function pode inserir (via service_role)
CREATE POLICY "Service role can insert plano history"
ON public.plano_chat_history
FOR INSERT
WITH CHECK (true);