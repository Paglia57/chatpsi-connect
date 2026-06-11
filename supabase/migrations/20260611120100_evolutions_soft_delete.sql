-- Exclusão lógica de evoluções (spec v2, §8/§12): prontuário é documento clínico, então
-- excluir marca deleted_at/deleted_by e a evolução some do chat e da web — o registro
-- permanece internamente. edited_at marca "editada em [data]" (visível na web).
-- Aditivo: linhas existentes ficam com deleted_at = NULL (ativas).

ALTER TABLE public.evolutions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,        -- = auth.users.id que excluiu (LGPD)
  ADD COLUMN IF NOT EXISTS edited_at  timestamptz; -- "editada em" (paridade web/WhatsApp)

-- Índice parcial: leituras "ativas" (deleted_at IS NULL) por psicólogo/paciente.
CREATE INDEX IF NOT EXISTS idx_evolutions_active
  ON public.evolutions (user_id, patient_id)
  WHERE deleted_at IS NULL;
