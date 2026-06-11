-- Estende wa_sessions para carregar o estado da conversa WhatsApp-first
-- (menu, modo paciente/livre, cadastro guiado). RLS já é service_role (migration anterior).

ALTER TABLE wa_sessions
  ADD COLUMN IF NOT EXISTS locked_patient_id uuid,            -- paciente travado (MODO PACIENTE)
  ADD COLUMN IF NOT EXISTS mode text,                         -- 'menu'|'paciente'|'livre'|'cadastro'|'renovacao'
  ADD COLUMN IF NOT EXISTS flow_step text,                    -- passo do cadastro guiado / submenu
  ADD COLUMN IF NOT EXISTS flow_data jsonb,                   -- dados parciais do cadastro em andamento
  ADD COLUMN IF NOT EXISTS last_intent text;                  -- 'evolution'|'plan'|... (continuidade)
