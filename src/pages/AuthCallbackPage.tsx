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
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get('type');
        const nextPath = urlParams.get('next') || '/reset-password';
        
        logger.debug('Processing auth callback', { type, nextPath });

        // Para recuperação de senha, aguardar estabelecimento da sessão
        if (type === 'recovery') {
          logger.debug('Processing password recovery callback');
          
          // Aguardar até 5 segundos pelo evento de sessão via onAuthStateChange
          const sessionPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              logger.warn('Recovery session timeout - no PASSWORD_RECOVERY event received');
              resolve(false);
            }, 5000);
            
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
              logger.debug('Auth state change during recovery', { event, hasSession: !!session });
              
              if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
                clearTimeout(timeout);
                subscription.unsubscribe();
                resolve(true);
              }
            });
          });
          
          const hasSession = await sessionPromise;
          
          if (hasSession) {
            logger.debug('Recovery session established successfully');
            setRedirectTo(nextPath);
          } else {
            // Verificar sessão existente como fallback
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              logger.error('Session verification failed after recovery', error);
            }
            
            if (session) {
              logger.debug('Recovery session found in fallback check');
              setRedirectTo(nextPath);
            } else {
              // Sem sessão válida - link expirado ou já usado
              logger.error('No valid session after recovery - link expired or already used');
              toast({
                title: "Link expirado",
                description: GENERIC_ERROR_MESSAGES.PASSWORD_RESET_LINK_EXPIRED,
                variant: "destructive",
              });
              setRedirectTo('/auth');
            }
          }
        } else {
          // Para outros tipos de callback (OAuth, magic link, etc.)
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          
          if (error) {
            logger.error('Code exchange failed', error);
            toast({
              title: "Erro de autenticação",
              description: GENERIC_ERROR_MESSAGES.AUTH_FAILED,
              variant: "destructive",
            });
            setRedirectTo('/auth');
          } else {
            logger.debug('Code processed successfully');
            setRedirectTo(nextPath);
          }
        }
      } catch (error) {
        console.error('Erro inesperado no callback:', error);
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao processar a autenticação. Tente novamente.",
          variant: "destructive",
        });
        setRedirectTo('/auth');
      } finally {
        setProcessing(false);
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