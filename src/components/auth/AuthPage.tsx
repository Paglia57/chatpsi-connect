import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Heart, Shield, Stethoscope } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const {
    user,
    signIn,
    signUp
  } = useAuth();
  const {
    toast
  } = useToast();

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/chat" replace />;
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const {
        error
      } = isLogin ? await signIn(email, password) : await signUp(email, password, fullName);
      if (error) {
        toast({
          title: "Erro de autenticação",
          description: error.message,
          variant: "destructive"
        });
      } else if (!isLogin) {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar sua conta."
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 xl:gap-12 items-center">
        {/* Hero Section */}
        <div className="text-center lg:text-left space-y-5 text-white flex flex-col justify-center">
          <div className="animate-slide-up">
            <img 
              src="/logo.png" 
              alt="ChatPsi" 
              className="h-24 lg:h-28 xl:h-32 w-auto mx-auto lg:mx-0 mb-3 object-contain filter brightness-0 invert drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]"
            />
            
            <p className="text-xl lg:text-2xl text-white/90 mb-4 leading-relaxed font-light">
              Plataforma de apoio para profissionais de saúde mental com IA multimodal 
              para otimizar suas sessões e organização.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 hover:scale-105 card-hover">
                <Heart className="h-10 w-10 text-cta mx-auto mb-4" />
                <h3 className="font-display font-semibold text-white mb-3 text-lg">Cuidado Centrado</h3>
                <p className="text-white/80 leading-relaxed">Foque no que importa: seus pacientes</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 hover:scale-105 card-hover">
                <Shield className="h-10 w-10 text-cta mx-auto mb-4" />
                <h3 className="font-display font-semibold text-white mb-3 text-lg">Seguro</h3>
                <p className="text-white/80 leading-relaxed">Proteção total dos dados dos seus pacientes</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 hover:scale-105 card-hover">
                <Stethoscope className="h-10 w-10 text-cta mx-auto mb-4" />
                <h3 className="font-display font-semibold text-white mb-3 text-lg">Profissional</h3>
                <p className="text-white/80 leading-relaxed">Desenvolvido por e para profissionais</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md mx-auto place-self-center shadow-xl border border-border/60 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden card-hover card-decorated relative">
          <CardHeader className="text-center pb-6 pt-8">
            <CardTitle className="text-3xl font-display font-bold text-primary mb-2">
              {isLogin ? 'Entrar na sua conta' : 'Criar conta'}
            </CardTitle>
            <CardDescription className="text-muted-foreground/90 text-lg">
              {isLogin ? 'Entre com suas credenciais para acessar a plataforma' : 'Crie sua conta para começar a usar o ChatPsi'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && <div className="space-y-3">
                  <Label htmlFor="fullName" className="text-foreground font-medium">Nome completo</Label>
                  <Input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required={!isLogin} placeholder="Digite seu nome completo" disabled={loading} className="h-12 rounded-xl border-2 focus:border-primary transition-colors" />
                </div>}
              
              <div className="space-y-3">
                <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Digite seu email" disabled={loading} className="h-12 rounded-xl border-2 focus:border-primary transition-colors" />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-foreground font-medium">Senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Digite sua senha" disabled={loading} minLength={6} className="h-12 rounded-xl border-2 focus:border-primary transition-colors" />
              </div>

              <Button type="submit" className="w-full h-14 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl text-lg btn-hover-lift shadow-lg" disabled={loading}>
                {loading ? <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {isLogin ? 'Entrando...' : 'Criando conta...'}
                  </div> : isLogin ? 'Entrar' : 'Criar conta'}
              </Button>
            </form>

            {isLogin && <div className="text-center">
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-cta hover:text-cta-hover transition-colors font-medium" disabled={loading}>
                  Esqueceu sua senha?
                </button>
              </div>}

            <div className="text-center border-t pt-6 mt-6">
              <p className="text-muted-foreground mb-4 text-lg">
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
              </p>
              <Button type="button" variant="outline" onClick={() => setIsLogin(!isLogin)} disabled={loading} className="w-full h-12 border-2 border-cta text-cta hover:bg-cta hover:text-white transition-all duration-200 rounded-xl font-semibold btn-hover-lift">
                {isLogin ? 'Criar nova conta' : 'Fazer login'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de recuperação de senha */}
      <ForgotPasswordModal open={showForgotPassword} onOpenChange={setShowForgotPassword} />
    </div>;
};
export default AuthPage;