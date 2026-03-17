
-- Create patients table
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  initials text NOT NULL,
  date_of_birth date,
  gender text,
  approach text,
  main_complaint text,
  cid_10 text,
  dsm_5 text,
  medication text,
  notes text,
  default_session_duration text,
  default_session_type text,
  session_day_time text,
  session_frequency text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  openai_thread_id text,
  openai_assistant_id text,
  total_sessions integer NOT NULL DEFAULT 0,
  last_session_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own patients" ON public.patients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patients" ON public.patients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own patients" ON public.patients FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Index
CREATE INDEX patients_user_name_idx ON public.patients(user_id, full_name);

-- Trigger for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add patient_id to evolutions
ALTER TABLE public.evolutions ADD COLUMN patient_id uuid REFERENCES public.patients(id);
