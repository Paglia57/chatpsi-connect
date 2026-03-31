CREATE TABLE public.referral_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  banner_title text NOT NULL DEFAULT 'Foi indicado por alguém?',
  banner_description text NOT NULL DEFAULT 'Insira o código de quem te indicou e resgate seu prêmio.',
  banner_button_text text NOT NULL DEFAULT 'Resgatar',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.referral_settings (id) VALUES (gen_random_uuid());

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read referral settings"
  ON public.referral_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can update referral settings"
  ON public.referral_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());