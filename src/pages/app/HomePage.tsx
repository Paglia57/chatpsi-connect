import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ReferralCard from '@/components/referral/ReferralCard';
import RedeemBanner from '@/components/referral/RedeemBanner';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, MessageCircle, BookOpen, Target, Users, Clock,
  Megaphone, Lightbulb, ArrowRight, BarChart3, UserCheck, X,
} from 'lucide-react';

const shortcuts = [
  { icon: MessageCircle, title: 'Chat Clínico', description: 'Consulte protocolos e abordagens terapêuticas', path: '/chat' },
  { icon: BookOpen, title: 'Buscar Artigos', description: 'Encontre evidências científicas para suas intervenções', path: '/busca-artigos' },
  { icon: Target, title: 'Planos de Ação', description: 'Monte planos terapêuticos com apoio de IA', path: '/busca-plano' },
  { icon: Users, title: 'Pacientes', description: 'Gerencie seus pacientes e fichas clínicas', path: '/app/pacientes' },
  { icon: Clock, title: 'Histórico', description: 'Veja todas as evoluções clínicas geradas', path: '/app/historico' },
  { icon: Megaphone, title: 'IA de Marketing', description: 'Crie conteúdo para redes sociais e divulgação', path: '/marketing' },
];

const HomePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [showSidebarTooltip, setShowSidebarTooltip] = useState(false);

  // Onboarding logic
  useEffect(() => {
    if (!profile) return;
    if (profile.has_completed_onboarding) {
      setShowOnboarding(false);
      // Show sidebar tooltip once after completing onboarding
      const hasSeen = localStorage.getItem('has_seen_sidebar_tooltip');
      if (!hasSeen) {
        setShowSidebarTooltip(true);
      }
      return;
    }
    // Not completed
    const step = profile.onboarding_step ?? 0;
    if (step === 0) {
      setShowOnboarding(true);
      setOnboardingInitialStep(0);
    } else {
      // Partial progress — show banner if not dismissed 3 times
      const dismissKey = 'onboarding_banner_dismiss_count';
      const dismissCount = parseInt(localStorage.getItem(dismissKey) || '0', 10);
      if (dismissCount < 3) {
        setShowBanner(true);
      }
    }
  }, [profile]);

  // Sidebar tooltip auto-dismiss after 8s + click anywhere
  useEffect(() => {
    if (!showSidebarTooltip) return;
    const timer = setTimeout(() => dismissTooltip(), 8000);
    const handleClick = () => dismissTooltip();
    document.addEventListener('click', handleClick, { once: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [showSidebarTooltip]);

  const dismissTooltip = useCallback(() => {
    setShowSidebarTooltip(false);
    localStorage.setItem('has_seen_sidebar_tooltip', 'true');
  }, []);

  const handleDismissBanner = () => {
    const dismissKey = 'onboarding_banner_dismiss_count';
    const dismissCount = parseInt(localStorage.getItem(dismissKey) || '0', 10);
    localStorage.setItem(dismissKey, String(dismissCount + 1));
    setShowBanner(false);
  };

  const handleResume = () => {
    setOnboardingInitialStep(profile?.onboarding_step ?? 0);
    setShowOnboarding(true);
    setShowBanner(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowBanner(false);
    refreshProfile();
  };

  const displayName = profile?.nickname || profile?.full_name?.split(' ')[0] || 'Profissional';

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const { data: evolutionsCount = 0, isLoading: loadingEvolutions } = useQuery({
    queryKey: ['home-evolutions-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('evolutions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .gte('created_at', firstDayOfMonth.toISOString());
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: patientsCount = 0, isLoading: loadingPatients } = useQuery({
    queryKey: ['home-patients-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'active');
      return count ?? 0;
    },
    enabled: !!user,
  });

  const loadingStats = loadingEvolutions || loadingPatients;

  const tips: { text: string; path: string }[] = [];
  if (patientsCount === 0) tips.push({ text: 'Cadastre seu primeiro paciente para organizar suas evoluções', path: '/app/pacientes' });
  if (evolutionsCount === 0) tips.push({ text: 'Experimente gerar sua primeira evolução clínica', path: '/app/evolucao' });
  if (patientsCount > 0 && evolutionsCount > 0) tips.push({ text: 'Use o Chat Clínico para discutir casos complexos com a IA', path: '/chat' });

  const getHeroContent = () => {
    if (patientsCount === 0 && !loadingStats) {
      return { title: 'Comece cadastrando seus pacientes', description: 'Organize suas fichas clínicas para gerar evoluções personalizadas com IA', ctaLabel: 'Cadastrar paciente', ctaPath: '/app/pacientes', secondaryCta: null };
    }
    if (evolutionsCount > 0 && !loadingStats) {
      return { title: 'Gerar Evolução Clínica', description: `Você gerou ${evolutionsCount} ${evolutionsCount === 1 ? 'evolução' : 'evoluções'} este mês. Continue documentando suas sessões!`, ctaLabel: 'Começar agora', ctaPath: '/app/evolucao', secondaryCta: { label: 'Ver histórico', path: '/app/historico' } };
    }
    return { title: 'Gerar Evolução Clínica', description: 'Transforme suas anotações de sessão em documentação clínica completa com IA', ctaLabel: 'Começar agora', ctaPath: '/app/evolucao', secondaryCta: null };
  };

  const hero = getHeroContent();

  if (showOnboarding) {
    return <OnboardingWizard initialStep={onboardingInitialStep} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-tour="page-home">
      {/* Resume onboarding banner */}
      {showBanner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-foreground flex-1">
            ⚡ Você ainda não completou a configuração inicial. Complete agora para personalizar a IA.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleResume}>
              Retomar →
            </Button>
            <button onClick={handleDismissBanner} className="text-muted-foreground hover:text-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar tooltip (shown once after completing onboarding) */}
      {showSidebarTooltip && (
        <div className="fixed left-[270px] top-1/3 z-50 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="relative bg-primary text-primary-foreground rounded-xl p-4 shadow-xl max-w-xs">
            {/* Arrow pointing left */}
            <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2">
              <div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-primary" />
            </div>
            <p className="text-sm leading-relaxed">
              Seu app está organizado aqui: <strong>Clínica</strong> para atendimentos, <strong>Ferramentas IA</strong> para consultas, e <strong>Marketing</strong> para divulgação.
            </p>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground font-playfair">Olá, {displayName}! 👋</h1>
        <p className="text-muted-foreground mt-1">O que vamos fazer hoje?</p>
      </div>

      {/* Redeem referral banner for new/recent users */}
      <RedeemBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              {loadingStats ? <Skeleton className="h-7 w-10" /> : <p className="text-2xl font-bold text-foreground">{evolutionsCount}</p>}
              <p className="text-xs text-muted-foreground">Evoluções este mês</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              {loadingStats ? <Skeleton className="h-7 w-10" /> : <p className="text-2xl font-bold text-foreground">{patientsCount}</p>}
              <p className="text-xs text-muted-foreground">Pacientes ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hero CTA */}
      <Card className="border-0 bg-primary text-primary-foreground overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <h2 className="text-xl md:text-2xl font-bold font-playfair">{hero.title}</h2>
            </div>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-lg">{hero.description}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {hero.secondaryCta && (
              <Button variant="ghost" size="lg" className="text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate(hero.secondaryCta!.path)}>
                {hero.secondaryCta.label}
              </Button>
            )}
            <Button variant="cta" size="lg" className="shadow-lg" onClick={() => navigate(hero.ctaPath)}>{hero.ctaLabel}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Shortcuts grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {shortcuts.map((item) => (
          <Card key={item.path} className="cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group" onClick={() => navigate(item.path)}>
            <CardContent className="p-4 space-y-2">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <item.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contextual tips */}
      {!loadingStats && tips.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold text-foreground">Próximo passo</h3>
            </div>
            <ul className="space-y-2">
              {tips.slice(0, 2).map((tip, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-primary cursor-pointer hover:underline" onClick={() => navigate(tip.path)}>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                  <span>{tip.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ReferralCard />
    </div>
  );
};

export default HomePage;
