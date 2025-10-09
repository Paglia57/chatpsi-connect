-- Criar tabela artigos_chat_history se não existir
CREATE TABLE IF NOT EXISTS public.artigos_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_sent text,
  input_text text NOT NULL,
  http_status integer,
  response_json jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Índices para performance (drop se existir, depois criar)
DROP INDEX IF EXISTS public.idx_artigos_chat_history_user_id;
CREATE INDEX idx_artigos_chat_history_user_id ON public.artigos_chat_history(user_id);

DROP INDEX IF EXISTS public.idx_artigos_chat_history_created_at;
CREATE INDEX idx_artigos_chat_history_created_at ON public.artigos_chat_history(created_at DESC);

-- Comentários
COMMENT ON TABLE public.artigos_chat_history IS 'Histórico de buscas de artigos científicos';
COMMENT ON COLUMN public.artigos_chat_history.thread_sent IS 'ID da thread OpenAI enviada (threads_artigos do perfil)';
COMMENT ON COLUMN public.artigos_chat_history.response_json IS 'Resposta completa do webhook buscaartigos';

-- Habilitar RLS
ALTER TABLE public.artigos_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: usuários veem apenas seus próprios registros
DROP POLICY IF EXISTS "Users can view their own artigos history" ON public.artigos_chat_history;
CREATE POLICY "Users can view their own artigos history"
  ON public.artigos_chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: apenas service role pode inserir
DROP POLICY IF EXISTS "Service role can insert artigos history" ON public.artigos_chat_history;
CREATE POLICY "Service role can insert artigos history"
  ON public.artigos_chat_history
  FOR INSERT
  WITH CHECK (true);

-- Adicionar coluna threads_artigos na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS threads_artigos text;

COMMENT ON COLUMN public.profiles.threads_artigos IS 'Thread OpenAI para busca de artigos científicos';