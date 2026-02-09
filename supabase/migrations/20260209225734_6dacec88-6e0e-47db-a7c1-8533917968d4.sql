
-- Fix 1: Make chat-uploads bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-uploads';

-- Fix 2: Replace overly permissive profile UPDATE policy with restricted one
-- Drop existing permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restricted UPDATE policy that only allows updating basic fields
-- All subscription/admin fields are locked by comparing against current values
CREATE POLICY "Users can update basic profile fields only"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND subscription_active IS NOT DISTINCT FROM (SELECT p.subscription_active FROM public.profiles p WHERE p.user_id = auth.uid())
  AND subscription_id IS NOT DISTINCT FROM (SELECT p.subscription_id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND subscription_tier IS NOT DISTINCT FROM (SELECT p.subscription_tier FROM public.profiles p WHERE p.user_id = auth.uid())
  AND plan IS NOT DISTINCT FROM (SELECT p.plan FROM public.profiles p WHERE p.user_id = auth.uid())
  AND subscribed_at IS NOT DISTINCT FROM (SELECT p.subscribed_at FROM public.profiles p WHERE p.user_id = auth.uid())
  AND current_period_end IS NOT DISTINCT FROM (SELECT p.current_period_end FROM public.profiles p WHERE p.user_id = auth.uid())
  AND subscription_end IS NOT DISTINCT FROM (SELECT p.subscription_end FROM public.profiles p WHERE p.user_id = auth.uid())
  AND "TokenCount" IS NOT DISTINCT FROM (SELECT p."TokenCount" FROM public.profiles p WHERE p.user_id = auth.uid())
  AND openai_thread_id IS NOT DISTINCT FROM (SELECT p.openai_thread_id FROM public.profiles p WHERE p.user_id = auth.uid())
  AND threads_plano IS NOT DISTINCT FROM (SELECT p.threads_plano FROM public.profiles p WHERE p.user_id = auth.uid())
  AND threads_artigos IS NOT DISTINCT FROM (SELECT p.threads_artigos FROM public.profiles p WHERE p.user_id = auth.uid())
);
