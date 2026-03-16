
-- Fix artigos_chat_history: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert artigos history" ON public.artigos_chat_history;
CREATE POLICY "Service role can insert artigos history"
ON public.artigos_chat_history FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Fix plano_chat_history: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can insert plano history" ON public.plano_chat_history;
CREATE POLICY "Service role can insert plano history"
ON public.plano_chat_history FOR INSERT
TO public
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
