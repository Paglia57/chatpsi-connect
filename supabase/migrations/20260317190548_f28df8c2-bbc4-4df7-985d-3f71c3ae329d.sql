ALTER TABLE public.profiles
  ADD COLUMN seen_guides jsonb NOT NULL DEFAULT '{}'::jsonb;