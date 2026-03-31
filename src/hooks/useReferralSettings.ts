import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralSettings {
  enabled: boolean;
  bannerTitle: string;
  bannerDescription: string;
  bannerButtonText: string;
}

const defaults: ReferralSettings = {
  enabled: true,
  bannerTitle: 'Foi indicado por alguém?',
  bannerDescription: 'Insira o código de quem te indicou e resgate seu prêmio.',
  bannerButtonText: 'Resgatar',
};

export function useReferralSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['referral-settings'],
    queryFn: async (): Promise<ReferralSettings> => {
      const { data, error } = await supabase
        .from('referral_settings' as any)
        .select('enabled, banner_title, banner_description, banner_button_text')
        .limit(1)
        .single();

      if (error || !data) return defaults;

      const row = data as any;
      return {
        enabled: row.enabled ?? true,
        bannerTitle: row.banner_title ?? defaults.bannerTitle,
        bannerDescription: row.banner_description ?? defaults.bannerDescription,
        bannerButtonText: row.banner_button_text ?? defaults.bannerButtonText,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return {
    ...(data ?? defaults),
    loading: isLoading,
  };
}
