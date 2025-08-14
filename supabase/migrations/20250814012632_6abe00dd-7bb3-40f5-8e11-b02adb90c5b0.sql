-- Remover foreign key constraint problemática
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;

-- Remover coluna default_thread_id que não é mais necessária
ALTER TABLE public.profiles DROP COLUMN IF EXISTS default_thread_id;

-- Adicionar coluna para OpenAI thread ID (opcional)
ALTER TABLE public.profiles ADD COLUMN openai_thread_id TEXT;

-- Simplificar política RLS para mensagens - validar apenas subscription_active
DROP POLICY IF EXISTS "Active subscribers can insert messages" ON public.messages;

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