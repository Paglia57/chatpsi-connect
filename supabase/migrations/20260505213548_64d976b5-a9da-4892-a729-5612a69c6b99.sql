-- Fix referral_codes mass exposure: drop overly permissive policy
DROP POLICY IF EXISTS "Anyone can look up a referral code by code" ON public.referral_codes;

-- Add explicit INSERT policy denying all direct inserts on referral_redemptions
-- (inserts must go through the SECURITY DEFINER redeem_referral_code RPC)
CREATE POLICY "Block direct inserts on referral_redemptions"
  ON public.referral_redemptions FOR INSERT TO authenticated
  WITH CHECK (false);

-- Remove messages from realtime publication if present (no per-user channel auth configured)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.messages';
  END IF;
END $$;