import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Gift, Users, Loader2 } from 'lucide-react';
import RedeemBanner from '@/components/referral/RedeemBanner';

const ReferralsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState<string | null>(null);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCode = async () => {
      try {
        const { data, error } = await supabase
          .from('referral_codes')
          .select('code, total_redeemed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setCode(data.code);
          setTotalRedeemed(data.total_redeemed);
        }
      } catch (err: any) {
        console.error('Erro ao buscar código:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCode();
  }, [user]);

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Código copiado!', description: code });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    if (!code) return;
    const shareData = {
      title: 'ChatPsi - Indicação',
      text: `Use meu código de indicação no ChatPsi: ${code}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Programa de Indicações</h1>
        <p className="text-muted-foreground mt-1">
          Compartilhe seu código de indicação e ganhe recompensas quando seus colegas se cadastrarem.
        </p>
      </div>

      <RedeemBanner />

      {code ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-cta" />
              Meu Código de Indicação
            </CardTitle>
            <CardDescription>
              Compartilhe seu código com outros profissionais de saúde mental. Quando alguém assinar e resgatar, vocês dois ganham um prêmio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={code}
                className="font-mono text-lg font-bold text-primary text-center tracking-wider"
              />
              <Button variant="outline" size="icon" onClick={handleCopy} title="Copiar código">
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" className="w-full" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar código
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
              <Users className="h-4 w-4" />
              <span>
                {totalRedeemed} {totalRedeemed === 1 ? 'indicação realizada' : 'indicações realizadas'}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>Você ainda não possui um código de indicação.</p>
            <p className="text-sm mt-1">Entre em contato com o suporte para solicitar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReferralsPage;
