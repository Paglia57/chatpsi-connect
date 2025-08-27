import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Heart, Shield, Users } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/chat" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

      if (error) {
        toast({
          title: "Erro de autenticação",
          description: error.message,
          variant: "destructive",
        });
      } else if (!isLogin) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar sua conta.",
        });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-accent-light flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-8 text-center lg:text-left">
          <div>
            <img 
              src="/lovable-uploads/9d9f81f6-fc3f-4a89-ab09-0c171aa64a09.png" 
              alt="ChatPsi" 
              className="h-16 lg:h-24 mx-auto lg:mx-0 mb-4 object-contain"
            />
            <p className="text-xl lg:text-2xl text-muted-foreground mb-6">
              Plataforma de apoio para profissionais de saúde mental
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Conecte-se com ferramentas avançadas de chat multimodal, 
              projetadas especificamente para apoiar sua prática clínica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-4 bg-card rounded-lg shadow-sm">
              <Heart className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-card-foreground">Cuidado Centrado</h3>
              <p className="text-sm text-muted-foreground text-center">
                Ferramentas projetadas para o cuidado em saúde mental
              </p>
            </div>
            <div className="flex flex-col items-center p-4 bg-card rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-card-foreground">Seguro</h3>
              <p className="text-sm text-muted-foreground text-center">
                Proteção total dos dados dos pacientes
              </p>
            </div>
            <div className="flex flex-col items-center p-4 bg-card rounded-lg shadow-sm">
              <Users className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-card-foreground">Profissional</h3>
              <p className="text-sm text-muted-foreground text-center">
                Criado por e para profissionais de saúde mental
              </p>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLogin ? 'Entrar na plataforma' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Acesse sua conta para continuar' 
                : 'Junte-se à comunidade de profissionais'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    placeholder="Seu nome completo"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                variant="default"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline text-sm"
              >
                {isLogin 
                  ? 'Não tem conta? Criar conta' 
                  : 'Já tem conta? Fazer login'
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
