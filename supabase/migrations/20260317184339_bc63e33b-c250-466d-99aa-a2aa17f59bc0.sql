ALTER TABLE public.profiles
  ADD COLUMN has_completed_onboarding boolean NOT NULL DEFAULT false,
  ADD COLUMN onboarding_step integer NOT NULL DEFAULT 0;