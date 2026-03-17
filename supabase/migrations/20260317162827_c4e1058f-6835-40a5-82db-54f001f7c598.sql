DROP POLICY "Users can update basic profile fields only" ON public.profiles;

CREATE POLICY "Users can update basic profile fields only"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (NOT (subscription_active IS DISTINCT FROM (SELECT p.subscription_active FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (subscription_id IS DISTINCT FROM (SELECT p.subscription_id FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (subscription_tier IS DISTINCT FROM (SELECT p.subscription_tier FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (plan IS DISTINCT FROM (SELECT p.plan FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (subscribed_at IS DISTINCT FROM (SELECT p.subscribed_at FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (current_period_end IS DISTINCT FROM (SELECT p.current_period_end FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (subscription_end IS DISTINCT FROM (SELECT p.subscription_end FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT ("TokenCount" IS DISTINCT FROM (SELECT p."TokenCount" FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (openai_thread_id IS DISTINCT FROM (SELECT p.openai_thread_id FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (threads_plano IS DISTINCT FROM (SELECT p.threads_plano FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (threads_artigos IS DISTINCT FROM (SELECT p.threads_artigos FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (threads_marketing IS DISTINCT FROM (SELECT p.threads_marketing FROM profiles p WHERE p.user_id = auth.uid())))
);