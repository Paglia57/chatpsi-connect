-- Máquina de estado v2: adiciona o sub-estado da conversa em wa_sessions.
-- O rascunho (padrão de captura), o comando pendente de desambiguação, a evolução
-- selecionada e os candidatos de nome continuam vivendo em flow_data (jsonb) — sub_state
-- é apenas o roteador determinístico do pipeline. RLS já é service_role (migration anterior).

ALTER TABLE wa_sessions
  ADD COLUMN IF NOT EXISTS sub_state text;  -- idle | draft_capturing | draft_await_preview_confirm
                                            -- | draft_command_disambig | evo_list | evo_selected
                                            -- | name_disambig | edit_field_pick | expiry_prompt
