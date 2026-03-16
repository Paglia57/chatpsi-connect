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