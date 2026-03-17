import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReferralCard from '@/components/referral/ReferralCard';
import AppBreadcrumb from '@/components/ui/AppBreadcrumb';
import {
  FileText, MessageCircle, BookOpen, Target, Lightbulb, Mic, Users, Sparkles
} from 'lucide-react';

const shortcuts = [
  {
    icon: MessageCircle,
    title: 'Chat Clínico',
    description: 'Consulte protocolos e abordagens terapêuticas',
    path: '/chat',
  },
  {
    icon: BookOpen,
    title: 'Buscar Artigos',
    description: 'Encontre evidências científicas para suas intervenções',
    path: '/busca-artigos',
  },
  {
    icon: Target,
    title: 'Planos de Ação',
    description: 'Monte planos terapêuticos com apoio de IA',
    path: '/busca-plano',
  },
];

const tips = [
  { icon: Mic, text: 'Grave o áudio da sessão e gere a evolução automaticamente' },
  { icon: Users, text: 'Cadastre seus pacientes para manter o histórico organizado' },
  { icon: Sparkles, text: 'Use o Chat Clínico para discutir casos complexos com a IA' },
];

const HomePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.nickname || profile?.full_name?.split(' ')[0] || 'Profissional';

  return (
    <div className="space-y-6">
      <AppBreadcrumb items={[{ label: 'Início' }]} />

      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground font-playfair">
          Olá, {displayName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">O que vamos fazer hoje?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero CTA — Nova Evolução */}
          <Card className="border-0 bg-primary text-primary-foreground overflow-hidden relative">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  <h2 className="text-xl md:text-2xl font-bold font-playfair">
                    Gerar Evolução Clínica
                  </h2>
                </div>
                <p className="text-primary-foreground/80 text-sm md:text-base max-w-md">
                  Transforme suas anotações de sessão em documentação clínica completa com IA
                </p>
              </div>
              <Button
                variant="cta"
                size="lg"
                className="shrink-0 shadow-lg"
                onClick={() => navigate('/app/evolucao')}
              >
                Começar agora
              </Button>
            </CardContent>
          </Card>

          {/* Quick shortcuts grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {shortcuts.map((item) => (
              <Card
                key={item.path}
                className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
                onClick={() => navigate(item.path)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tips */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Dicas de uso</h3>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <tip.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span>{tip.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Referral */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Indique e Ganhe
          </h3>
          <ReferralCard />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
