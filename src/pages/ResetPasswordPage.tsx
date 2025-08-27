import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Validações de senha
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;

  useEffect(() => {
    // Verificar se há uma sessão de recuperação de senha ativa
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Verificar se há evento de PASSWORD_RECOVERY na URL ou sessão
        const urlParams = new URLSearchParams(window.location.search);
        const hasRecoveryToken = urlParams.has('access_token') || urlParams.has('refresh_token');
        
        if (session && hasRecoveryToken) {
          setIsValidSession(true);
        } else {
          setIsValidSession(false);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setIsValidSession(false);
      } finally {
        setSessionChecked(true);
      }
    };

    checkSession();

    // Listener para eventos de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Redirecionar se já autenticado (não em sessão de recuperação)
  if (user && !isValidSession && sessionChecked) {
    return <Navigate to="/chat" replace />;
  }

  // Redirecionar se não há sessão de recuperação válida
  if (!isValidSession && sessionChecked) {
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast({
        title: "Senha inválida",
        description: "A senha deve atender a todos os critérios de segurança.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, confirme sua nova senha corretamente.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha alterada com sucesso!",
          description: "Você será redirecionado para fazer login.",
          duration: 3000,
        });

        // Fazer logout para forçar novo login
        await supabase.auth.signOut();
        
        // Redirecionar para página de login após um breve delay
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-light via-background to-accent-light">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-accent-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="text-center">
          <img 
            src="/lovable-uploads/e8ce6c19-f769-4a4f-a8d0-9c93492a7f76.png" 
            alt="ChatPsi" 
            className="h-12 w-auto object-contain mx-auto mb-4"
          />
          <CardTitle className="text-2xl">Redefinir senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova senha */}
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Digite sua nova senha"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirme sua nova senha"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {/* Critérios de validação da senha */}
            {password && (
              <div className="space-y-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium text-muted-foreground">
                  Critérios de segurança:
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {hasMinLength ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={hasMinLength ? 'text-green-700' : 'text-red-700'}>
                      Mínimo 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasUpperCase ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={hasUpperCase ? 'text-green-700' : 'text-red-700'}>
                      1 letra maiúscula
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasNumber ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={hasNumber ? 'text-green-700' : 'text-red-700'}>
                      1 número
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasSpecialChar ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={hasSpecialChar ? 'text-green-700' : 'text-red-700'}>
                      1 caractere especial
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Validação de confirmação de senha */}
            {confirmPassword && (
              <div className="flex items-center gap-2 text-sm">
                {passwordsMatch ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-700">Senhas coincidem</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-700">Senhas não coincidem</span>
                  </>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !isPasswordValid || !passwordsMatch}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redefinir senha
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground hover:text-primary"
              disabled={loading}
            >
              Voltar para o login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;