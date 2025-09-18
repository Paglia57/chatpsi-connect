import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Check, X, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger, GENERIC_ERROR_MESSAGES } from '@/lib/logger';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Validação de senha
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;

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
        description: "A confirmação de senha deve ser igual à nova senha.",
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
        throw error;
      }

      toast({
        title: "Senha alterada com sucesso!",
        description: "Você será redirecionado para fazer login.",
      });

      // Redirecionar para login após sucesso
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 2000);

    } catch (error: any) {
      logger.error('Password reset failed', error);
      toast({
        title: "Erro",
        description: GENERIC_ERROR_MESSAGES.PASSWORD_RESET_FAILED,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-accent-light/30 flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-pattern-grid opacity-10 bg-[length:30px_30px]"></div>
      <Card className="w-full max-w-md mx-auto shadow-lg relative z-10 card-decorated">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-accent">Redefinir senha</CardTitle>
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
              <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium text-muted-foreground">
                  Critérios de segurança:
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {hasMinLength ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className={hasMinLength ? 'text-green-700' : 'text-red-700'}>
                      Mínimo 8 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasUpperCase ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className={hasUpperCase ? 'text-green-700' : 'text-red-700'}>
                      1 letra maiúscula
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasNumber ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className={hasNumber ? 'text-green-700' : 'text-red-700'}>
                      1 número
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {hasSpecialChar ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
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
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-green-700">Senhas coincidem</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-red-700">Senhas não coincidem</span>
                  </>
                )}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90" 
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
              className="text-sm text-muted-foreground hover:text-accent"
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