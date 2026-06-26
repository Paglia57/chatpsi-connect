-- Agenda do psicólogo (Nível 1). Etapa ADITIVA: tabela nova; nada existente é alterado.
-- RLS espelha patients/evolutions (auth.uid() = user_id). Edge Functions usam service_role.

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                                  -- = profiles.user_id (auth.users)
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_initials text,                                  -- espelho p/ exibição
  starts_at timestamptz NOT NULL,                         -- UTC; exibido no fuso do psicólogo
  duration_min int NOT NULL DEFAULT 50,
  modality text NOT NULL DEFAULT 'online' CHECK (modality IN ('online','presencial')),
  meeting_link text,
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','realizado','cancelado','faltou')),
  notes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_user_starts_idx ON public.appointments (user_id, starts_at);
CREATE INDEX appointments_user_patient_starts_idx ON public.appointments (user_id, patient_id, starts_at);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own appointments"
  ON public.appointments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own appointments"
  ON public.appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments"
  ON public.appointments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments"
  ON public.appointments FOR DELETE TO authenticated USING (auth.uid() = user_id);
