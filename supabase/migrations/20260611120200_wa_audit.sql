-- Trilha de auditoria do canal WhatsApp (spec v2, §8): toda exclusão (e edição) de evolução
-- guarda quem fez e quando. Tabela dedicada — sobrevive a um eventual hard-delete da linha e
-- é consultável de forma independente. RLS habilitado sem policies: apenas service_role
-- (mesmo padrão de wa_sessions/webhook_events).

CREATE TABLE IF NOT EXISTS public.wa_audit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,                          -- psicólogo dono do dado (LGPD)
  action     text NOT NULL,                          -- 'evolution_soft_delete' | 'evolution_edit' | ...
  entity     text NOT NULL DEFAULT 'evolution',
  entity_id  uuid,
  phone      text,                                   -- número que originou a ação (canal WhatsApp)
  metadata   jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_audit_user_entity
  ON public.wa_audit (user_id, entity, entity_id);

ALTER TABLE public.wa_audit ENABLE ROW LEVEL SECURITY;
-- Sem policies → nenhum papel autenticado/anon acessa; só service_role (que ignora RLS).
