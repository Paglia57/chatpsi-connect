import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
        
        console.log('Processing callback with type:', type, 'next:', nextPath);

        // Para recuperação de senha, apenas verificar se temos acesso ao hash da URL
        if (type === 'recovery') {
          // Para password recovery, o Supabase automaticamente processa o hash
          // Apenas aguardar um momento para o processamento automático
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar se a sessão foi estabelecida
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Erro ao verificar sessão após recovery:', error);
            toast({
              title: "Link expirado",
              description: "O link de recuperação expirou ou é inválido. Solicite um novo link.",
              variant: "destructive",
            });
            setRedirectTo('/auth');
          } else if (session) {
            console.log('Sessão estabelecida com sucesso para recovery, redirecionando para:', nextPath);
            setRedirectTo(nextPath);
          } else {
            console.log('Nenhuma sessão após recovery, mas prosseguindo para reset');
            // Mesmo sem sessão, permite ir para reset-password pois o Supabase pode ter processado o token
            setRedirectTo(nextPath);
          }
        } else {
          // Para outros tipos de callback (OAuth, magic link, etc.)
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          
          if (error) {
            console.error('Erro na troca de código por sessão:', error);
            toast({
              title: "Erro de autenticação",
              description: "Não foi possível processar o link de autenticação. Tente novamente.",
              variant: "destructive",
            });
            setRedirectTo('/auth');
          } else {
            console.log('Código processado com sucesso, redirecionando para:', nextPath);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-accent-light">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Processando autenticação...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectTo} replace />;
};

export default AuthCallbackPage;