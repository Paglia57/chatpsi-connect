-- Primeiro, dropar a política que referencia default_thread_id
DROP POLICY IF EXISTS "Active subscribers can insert messages" ON public.messages;

-- Remover foreign key constraint problemática
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;

-- Agora posso remover a coluna default_thread_id
ALTER TABLE public.profiles DROP COLUMN IF EXISTS default_thread_id;

-- Adicionar coluna para OpenAI thread ID (opcional)
ALTER TABLE public.profiles ADD COLUMN openai_thread_id TEXT;

-- Criar nova política RLS simplificada
CREATE POLICY "Active subscribers can insert messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND subscription_active = true
  )
);