
-- Add new columns to profiles for professional info
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crp text,
  ADD COLUMN IF NOT EXISTS main_approach text,
  ADD COLUMN IF NOT EXISTS specialties text[],
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create evolutions table
CREATE TABLE public.evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_initials text NOT NULL,
  session_number integer,
  session_duration text,
  session_type text,
  approach text,
  input_type text NOT NULL,
  input_content text,
  output_content text,
  audio_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add updated_at trigger
CREATE TRIGGER update_evolutions_updated_at
  BEFORE UPDATE ON public.evolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;

-- RLS policies for evolutions
CREATE POLICY "Users can view own evolutions"
  ON public.evolutions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evolutions"
  ON public.evolutions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evolutions"
  ON public.evolutions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own evolutions"
  ON public.evolutions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for session audios
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-audios', 'session-audios', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload session audios"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'session-audios' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own session audios"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'session-audios' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own session audios"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'session-audios' AND (storage.foldername(name))[1] = auth.uid()::text);
