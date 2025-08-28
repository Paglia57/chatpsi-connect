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
        // Processar código de autorização do Supabase
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error('Erro na troca de código por sessão:', error);
          toast({
            title: "Erro de autenticação",
            description: "Não foi possível processar o link de recuperação. Tente novamente.",
            variant: "destructive",
          });
          setRedirectTo('/auth');
        } else {
          // Ler parâmetro 'next' da URL para saber onde redirecionar
          const urlParams = new URLSearchParams(window.location.search);
          const nextPath = urlParams.get('next') || '/reset-password';
          
          console.log('Código processado com sucesso, redirecionando para:', nextPath);
          setRedirectTo(nextPath);
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