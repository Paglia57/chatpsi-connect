

## Analysis: Referral Flow Issues Found

After inspecting the database and code, I identified two issues preventing the referral flow from working:

### Issue 1: No referral codes exist for existing users

The `referral_codes` table is **empty**. The trigger `trigger_generate_referral_on_subscription` only fires when `subscription_active` changes from `false` to `true`. All 174 existing active subscribers already had `subscription_active=true` before the trigger was created, so they never got codes.

**Fix:** Run a one-time migration that backfills referral codes for all existing active subscribers by calling `generate_referral_code()` for each one.

### Issue 2: No new accounts exist to test the RedeemBanner

All accounts were created in September 2025 (>170 days ago), so the RedeemBanner correctly hides itself (accounts must be < 7 days old). This is working as designed — it will only appear for genuinely new sign-ups.

### Plan

**Single migration** to backfill referral codes for existing active users:

```sql
-- Backfill referral codes for all active subscribers who don't have one yet
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT p.user_id 
    FROM public.profiles p
    LEFT JOIN public.referral_codes rc ON rc.user_id = p.user_id
    WHERE p.subscription_active = true AND rc.id IS NULL
  LOOP
    PERFORM public.generate_referral_code(r.user_id);
  END LOOP;
END;
$$;
```

After this migration:
- All 174 active subscribers will have a PSI-XXXX code
- The ReferralCard will display in the sidebar for logged-in subscribers
- The RedeemBanner will correctly appear only for new accounts (< 7 days)
- The trigger continues working for future activations

No code changes needed — only the database backfill.

