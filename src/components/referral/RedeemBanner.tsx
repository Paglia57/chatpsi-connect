import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useReferralSettings } from '@/hooks/useReferralSettings';
import { Gift, CheckCircle, Loader2 } from 'lucide-react';

interface RedeemBannerProps {
  /** Preview mode: skips eligibility checks and uses provided overrides */
  preview?: boolean;
  previewTitle?: string;
  previewDescription?: string;
  previewButtonText?: string;
}

const RedeemBanner = ({ preview, previewTitle, previewDescription, previewButtonText }: RedeemBannerProps) => {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const settings = useReferralSettings();
  const [eligible, setEligible] = useState<boolean | null>(preview ? true : null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  const title = preview ? (previewTitle ?? settings.bannerTitle) : settings.bannerTitle;
  const description = preview ? (previewDescription ?? settings.bannerDescription) : settings.bannerDescription;
  const buttonText = preview ? (previewButtonText ?? settings.bannerButtonText) : settings.bannerButtonText;

  useEffect(() => {
    if (preview) return;
    if (!user || !profile) return;

    const checkEligibility = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setEligible(false);
        return;
      }

      const createdAt = new Date(profileData.created_at);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const isNewAccount = daysSinceCreation <= 7;

      const subscribedAt = profile.subscribed_at ? new Date(profile.subscribed_at) : null;
      const isRecentSubscriber = subscribedAt
        ? (Date.now() - subscribedAt.getTime()) / (1000 * 60 * 60 * 24) <= 7
        : false;

      if (!isNewAccount && !isRecentSubscriber) {
        setEligible(false);
        return;
      }

      const { data, error } = await supabase
        .from('referral_redemptions')
        .select('id')
        .eq('redeemed_by', user.id)
        .limit(1);

      if (error) {
        setEligible(false);
        return;
      }

      setEligible(!data || data.length === 0);
    };

    checkEligibility();
  }, [user, profile, preview]);

  // If not preview mode, respect the enabled flag
  if (!preview && !settings.enabled) return null;

  if (!preview && (eligible === null || (eligible === false && !isAdmin))) return null;

  if (redeemed) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
          <p className="text-sm font-medium text-success">
            Código recebido! Aguarde a validação.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleRedeem = async () => {
    if (preview || !code.trim()) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('redeem_referral_code', {
        p_code: code.trim(),
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        toast({
          title: 'Erro ao resgatar',
          description: result.error || 'Código inválido',
          variant: 'destructive',
        });
      } else {
        setRedeemed(true);
        toast({
          title: 'Código resgatado!',
          description: 'Aguarde a validação pelo administrador.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao resgatar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-cta/30 bg-cta/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-cta" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="PSI-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono uppercase"
            maxLength={8}
            disabled={preview}
          />
          <Button
            size="sm"
            onClick={handleRedeem}
            disabled={preview || submitting || !code.trim()}
            className="whitespace-nowrap"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : buttonText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RedeemBanner;
