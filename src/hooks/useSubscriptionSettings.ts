import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionSettings {
  manualPdfUrl: string | null;
  manualPdfFilename: string;
  tplAtivadaName: string;
  tplPendenteName: string;
  tplCanceladaName: string;
  tplLang: string;
  onboardingFullMessage: string;
  onboardingWelcomeBackMessage: string;
  deactivationMessage: string;
}

const defaults: SubscriptionSettings = {
  manualPdfUrl: null,
  manualPdfFilename: 'Manual-de-Uso-ChatPsi.pdf',
  tplAtivadaName: 'assinatura_ativada',
  tplPendenteName: 'pagamento_pendente',
  tplCanceladaName: 'assinatura_cancelada',
  tplLang: 'pt_BR',
  onboardingFullMessage: '',
  onboardingWelcomeBackMessage: '',
  deactivationMessage: '',
};

export function useSubscriptionSettings() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription-settings'],
    queryFn: async (): Promise<SubscriptionSettings> => {
      const { data, error } = await supabase
        .from('subscription_settings' as any)
        .select('*')
        .limit(1)
        .single();

      if (error || !data) return defaults;

      const row = data as any;
      return {
        manualPdfUrl: row.manual_pdf_url ?? null,
        manualPdfFilename: row.manual_pdf_filename ?? defaults.manualPdfFilename,
        tplAtivadaName: row.tpl_ativada_name ?? defaults.tplAtivadaName,
        tplPendenteName: row.tpl_pendente_name ?? defaults.tplPendenteName,
        tplCanceladaName: row.tpl_cancelada_name ?? defaults.tplCanceladaName,
        tplLang: row.tpl_lang ?? defaults.tplLang,
        onboardingFullMessage: row.onboarding_full_message ?? '',
        onboardingWelcomeBackMessage: row.onboarding_welcome_back_message ?? '',
        deactivationMessage: row.deactivation_message ?? '',
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return {
    settings: data ?? defaults,
    loading: isLoading,
    refetch,
  };
}
