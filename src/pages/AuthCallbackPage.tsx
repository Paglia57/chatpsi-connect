import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { logger, GENERIC_ERROR_MESSAGES } from '@/lib/logger';

const AuthCallbackPage = () => {
  const [processing, setProcessing] = useState(true);
  const [redirectTo, setRedirectTo] = useState('/auth');
  const { toast } = useToast();

  useEffect(() => {
    let settled = false;
    const finish = (to: string) => {
      if (settled) return;
      settled = true;
      setRedirectTo(to);
      setProcessing(false);
    };

    // Cinto de segurança: nunca deixar o usuário preso no spinner "Processando
    // autenticação..." pra sempre. Se algo travar além disso, cai pro /auth.
    const safety = setTimeout(() => {
      logger.warn('Auth callback safety timeout reached');
      finish('/auth');
    }, 12000);

    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const type = urlParams.get('type') || hashParams.get('type');
        const nextPath = urlParams.get('next') || '/reset-password';
        const code = urlParams.get('code');
        // Link já consumido (ex.: scanner de e-mail que faz prefetch) ou expirado
        const urlError = hashParams.get('error_description') || hashParams.get('error')
          || urlParams.get('error_description') || urlParams.get('error');

        logger.debug('Processing auth callback', { type, nextPath, hasCode: !!code });

        if (urlError) {
          logger.error('Auth callback received error in URL', urlError);
          toast({
            title: "Link expirado",
            description: GENERIC_ERROR_MESSAGES.PASSWORD_RESET_LINK_EXPIRED,
            variant: "destructive",
          });
          finish('/auth');
          return;
        }

        // OAuth / magic link com PKCE: trocar o code por sessão explicitamente
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            logger.error('Code exchange failed', error);
            toast({
              title: "Erro de autenticação",
              description: GENERIC_ERROR_MESSAGES.AUTH_FAILED,
              variant: "destructive",
            });
            finish('/auth');
            return;
          }
        }

        // Fluxo implícito (recovery/magic link): detectSessionInUrl já processou o
        // hash no init do client; getSession aguarda esse init e retorna a sessão.
        // Com processLock no client, getSession não trava mais em WebView de mobile.
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          logger.debug('Session established from callback');
          finish(nextPath);
          return;
        }

        // Sem sessão ainda: aguardar breve por um evento tardio antes de desistir
        const gotLate = await new Promise<boolean>((resolve) => {
          const t = setTimeout(() => resolve(false), 4000);
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            if (s) {
              clearTimeout(t);
              subscription.unsubscribe();
              resolve(true);
            }
          });
        });

        if (gotLate) {
          finish(nextPath);
        } else {
          logger.error('No valid session after callback - link expired or already used');
          toast({
            title: "Link expirado",
            description: GENERIC_ERROR_MESSAGES.PASSWORD_RESET_LINK_EXPIRED,
            variant: "destructive",
          });
          finish('/auth');
        }
      } catch (error) {
        console.error('Erro inesperado no callback:', error);
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao processar a autenticação. Tente novamente.",
          variant: "destructive",
        });
        finish('/auth');
      } finally {
        clearTimeout(safety);
      }
    };

    handleCallback();
  }, [toast]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent-light/30 relative">
        <div className="absolute inset-0 bg-pattern-grid opacity-10 bg-[length:30px_30px]"></div>
        <div className="text-center space-y-4 relative z-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectTo} replace />;
};

export default AuthCallbackPage;