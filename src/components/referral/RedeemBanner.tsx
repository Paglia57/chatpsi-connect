import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Gift, CheckCircle, Loader2 } from 'lucide-react';

const RedeemBanner = () => {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const checkEligibility = async () => {
      // Check account age < 7 days via profiles table
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

      // Check if already redeemed
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
  }, [user, profile]);

  if (eligible === null || eligible === false) return null;

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
    if (!code.trim()) return;
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
          <span className="text-sm font-semibold text-foreground">Foi indicado por alguém?</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Insira o código de quem te indicou e resgate seu prêmio.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="PSI-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono uppercase"
            maxLength={8}
          />
          <Button
            size="sm"
            onClick={handleRedeem}
            disabled={submitting || !code.trim()}
            className="whitespace-nowrap"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resgatar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RedeemBanner;
