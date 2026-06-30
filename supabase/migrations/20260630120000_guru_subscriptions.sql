-- Migração: assinaturas Guru no WhatsApp oficial + configuração no Super Admin
-- Cria/ajusta o que a Edge Function guru-webhook e a tela de admin precisam.
-- Não toca no n8n nem na tabela legada "usuarios".

-- ---------------------------------------------------------------------------
-- 1) webhook_events.source — distinguir a origem do evento (guru | whatsapp...)
--    O whatsapp-webhook continua inserindo sem source (fica NULL) — sem regressão.
-- ---------------------------------------------------------------------------
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS source text;

-- ---------------------------------------------------------------------------
-- 2) subscription_events — auditoria + idempotência dos eventos de assinatura.
--    Uma linha por evento processado. RLS apenas service_role (espelha webhook_events).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id text,
  email text,
  status text,
  action text CHECK (action IN ('ativou','manteve','avisou','cancelou','ignorou')),
  onboarding_case text CHECK (onboarding_case IN ('first_time','reactivation','renewal')),
  message_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_events_sub_status_idx
  ON public.subscription_events (subscription_id, status, created_at DESC);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ---------------------------------------------------------------------------
-- 3) subscription_settings — config singleton (manual + textos editáveis).
--    Leitura por qualquer autenticado; escrita só admin (padrão referral_settings).
--    A Edge Function lê via service role (bypassa RLS).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_pdf_url text,
  manual_pdf_filename text DEFAULT 'Manual-de-Uso-ChatPsi.pdf',
  tpl_ativada_name text NOT NULL DEFAULT 'assinatura_ativada',
  tpl_pendente_name text NOT NULL DEFAULT 'pagamento_pendente',
  tpl_cancelada_name text NOT NULL DEFAULT 'assinatura_cancelada',
  tpl_lang text NOT NULL DEFAULT 'pt_BR',
  onboarding_full_message text,         -- "Onboarding 7 dias" (motor futuro)
  onboarding_welcome_back_message text, -- "Bem-vindo de volta" (motor futuro)
  deactivation_message text,            -- cópia de renovação dentro do bot
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Linha única (singleton). Só insere se a tabela estiver vazia.
INSERT INTO public.subscription_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_settings);

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscription settings"
  ON public.subscription_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can update subscription settings"
  ON public.subscription_settings FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4) Bucket público "public-assets" para o Manual de Uso (leitura pública,
--    escrita apenas admin). Padrão do bucket avatars, mas gated por is_admin().
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

CREATE POLICY "Admins can upload public assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public-assets' AND public.is_admin());

CREATE POLICY "Admins can update public assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin());

CREATE POLICY "Admins can delete public assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'public-assets' AND public.is_admin());
