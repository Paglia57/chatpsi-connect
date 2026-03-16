
-- Create referral_codes table
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  total_redeemed int NOT NULL DEFAULT 0,
  CONSTRAINT unique_user_referral UNIQUE (user_id)
);

-- Create referral_redemptions table
CREATE TABLE public.referral_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_used text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_at timestamptz,
  validated_by uuid REFERENCES auth.users(id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS for referral_codes
CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can look up a referral code by code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can view all referral codes"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (public.is_admin());

-- RLS for referral_redemptions
CREATE POLICY "Users can view own redemptions as referrer or redeemed"
  ON public.referral_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = redeemed_by);

CREATE POLICY "Admins can view all redemptions"
  ON public.referral_redemptions FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update redemptions"
  ON public.referral_redemptions FOR UPDATE TO authenticated
  USING (public.is_admin());

-- RLS for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_attempts int := 0;
  v_existing text;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_existing FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  LOOP
    v_code := 'PSI-';
    FOR i IN 1..4 LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    END LOOP;

    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Não foi possível gerar código único após 10 tentativas';
      END IF;
    END;
  END LOOP;
END;
$$;

-- Function: redeem_referral_code
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_referrer_id uuid;
  v_account_age interval;
  v_already_redeemed boolean;
  v_redemption_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Check account age (< 7 days)
  SELECT (now() - created_at) INTO v_account_age
  FROM public.profiles WHERE user_id = v_user_id;

  IF v_account_age > interval '7 days' THEN
    RETURN json_build_object('success', false, 'error', 'Apenas contas com menos de 7 dias podem resgatar códigos');
  END IF;

  -- Check if already redeemed
  SELECT EXISTS(
    SELECT 1 FROM public.referral_redemptions WHERE redeemed_by = v_user_id
  ) INTO v_already_redeemed;

  IF v_already_redeemed THEN
    RETURN json_build_object('success', false, 'error', 'Você já resgatou um código de indicação');
  END IF;

  -- Find referrer
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes WHERE code = upper(trim(p_code));

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código de indicação inválido');
  END IF;

  -- No self-referral
  IF v_referrer_id = v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Você não pode usar seu próprio código');
  END IF;

  -- Create redemption
  INSERT INTO public.referral_redemptions (referrer_id, redeemed_by, code_used, status)
  VALUES (v_referrer_id, v_user_id, upper(trim(p_code)), 'pending')
  RETURNING id INTO v_redemption_id;

  RETURN json_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$;

-- Function: admin_approve_referral
CREATE OR REPLACE FUNCTION public.admin_approve_referral(p_redemption_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id uuid;
  v_redeemed_by uuid;
  v_code_used text;
  v_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  SELECT referrer_id, redeemed_by, code_used, status
  INTO v_referrer_id, v_redeemed_by, v_code_used, v_status
  FROM public.referral_redemptions WHERE id = p_redemption_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Resgate não encontrado';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Este resgate já foi processado';
  END IF;

  -- Update redemption
  UPDATE public.referral_redemptions
  SET status = 'approved', validated_at = now(), validated_by = auth.uid()
  WHERE id = p_redemption_id;

  -- Increment total_redeemed
  UPDATE public.referral_codes
  SET total_redeemed = total_redeemed + 1
  WHERE code = v_code_used;

  -- Notify referrer
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (v_referrer_id, 'referral_reward', 'Sua indicação foi aprovada! Seu prêmio está disponível.');

  -- Notify redeemed user
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (v_redeemed_by, 'referral_reward', 'Seu resgate foi aprovado! Aproveite seu prêmio.');
END;
$$;

-- Function: admin_reject_referral
CREATE OR REPLACE FUNCTION public.admin_reject_referral(p_redemption_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  SELECT status INTO v_status
  FROM public.referral_redemptions WHERE id = p_redemption_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Resgate não encontrado';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Este resgate já foi processado';
  END IF;

  UPDATE public.referral_redemptions
  SET status = 'rejected', validated_at = now(), validated_by = auth.uid()
  WHERE id = p_redemption_id;
END;
$$;

-- Trigger: auto-generate referral code when subscription_active becomes true
CREATE OR REPLACE FUNCTION public.on_subscription_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.subscription_active = true AND (OLD.subscription_active IS NULL OR OLD.subscription_active = false) THEN
    PERFORM public.generate_referral_code(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_generate_referral_on_subscription
  AFTER UPDATE OF subscription_active ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_subscription_activated();
