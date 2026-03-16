import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Gift, Users, Loader2 } from 'lucide-react';

const ReferralCard = () => {
  const { user, profile } = useAuth();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!code) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Código copiado!', description: code });
    } catch {
      toast({ title: 'Erro ao copiar', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
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

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-cta" />
          <span className="text-sm font-semibold text-foreground">Meu código de indicação</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-background rounded-lg border-2 border-primary/30 px-3 py-2 text-center">
            <span className="font-mono text-lg font-bold text-primary tracking-wider">{code}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopy} title="Copiar código">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{totalRedeemed} {totalRedeemed === 1 ? 'pessoa indicada' : 'pessoas indicadas'} com sucesso</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Compartilhe seu código. Quando alguém assinar e resgatar, vocês dois ganham um prêmio.
        </p>

        <Button variant="outline" size="sm" className="w-full" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar código
        </Button>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
