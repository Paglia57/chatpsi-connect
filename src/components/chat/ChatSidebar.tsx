import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarHeader, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Home, ClipboardList, Plus, History, Users, MessageCircle, Target, BookOpen,
  PenTool, Settings, Gift, User, HelpCircle, LogOut, Menu, ChevronDown,
  ChevronRight, Star, MessageSquare, RotateCcw
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useResponsive } from '@/hooks/useResponsive';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ChatSidebar = () => {
  const { open } = useSidebar();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { isMobile } = useResponsive();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPath = location.pathname;

  // Auto-expand evolution group when on sub-routes
  const isEvolutionRoute = currentPath === '/app/evolucao' || currentPath === '/app/historico';
  const [evolutionOpen, setEvolutionOpen] = useState(true);

  useEffect(() => {
    if (isEvolutionRoute) setEvolutionOpen(true);
  }, [isEvolutionRoute]);

  // Toggle body class when sidebar state changes (desktop only)
  useEffect(() => {
    const root = document.body;
    if (!root) return;
    if (open) {
      root.classList.add('sidebar-open');
    } else {
      root.classList.remove('sidebar-open');
    }
  }, [open]);

  const getAvatarText = () => {
    const name = profile?.nickname || profile?.full_name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const handleSupportWhatsApp = () => {
    window.open('https://wa.me/5511942457454', '_blank', 'noopener,noreferrer');
  };

  const handleResetGuides = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({
      seen_guides: {},
    }).eq('user_id', user.id);
    if (!error) {
      toast.success('Guias reativados! Visite cada ferramenta para revê-los.');
      navigate('/app');
    }
  };

  const handleResetOnboarding = async () => {
    if (!user) return;
    await supabase.from('profiles').update({
      has_completed_onboarding: false,
      onboarding_step: 0,
      seen_guides: {},
    }).eq('user_id', user.id);
    navigate('/app');
    window.location.reload();
  };

  const SupportPopoverContent = () => (
    <div className="flex flex-col gap-1 w-56">
      <button
        onClick={handleSupportWhatsApp}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
      >
        <MessageSquare className="h-4 w-4 shrink-0 text-green-600" />
        <div>
          <p className="font-medium">Falar com o suporte</p>
          <p className="text-xs text-muted-foreground">Via WhatsApp</p>
        </div>
      </button>
      <button
        onClick={handleResetGuides}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
      >
        <RotateCcw className="h-4 w-4 shrink-0 text-primary" />
        <div>
          <p className="font-medium">Revisitar orientações</p>
          <p className="text-xs text-muted-foreground">Rever guias das ferramentas</p>
        </div>
      </button>
      <button
        onClick={handleResetOnboarding}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
      >
        <RotateCcw className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Refazer onboarding</p>
          <p className="text-xs text-muted-foreground">Reiniciar wizard completo</p>
        </div>
      </button>
    </div>
  );

  const isActive = (path: string) => currentPath === path;
  const isActivePrefix = (path: string) => currentPath.startsWith(path);

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
      active
        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
    }`;

  const subNavLinkClass = (active: boolean) =>
    `flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg transition-all duration-200 text-sm ${
      active
        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
    }`;

  const footerBtnClass = "w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors";

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <h3 className="px-3 mt-6 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </h3>
  );

  const SidebarNavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-sidebar-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getAvatarText()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-sidebar-foreground truncate">
              {profile?.nickname || profile?.full_name || 'Usuário'}
            </p>
            {profile?.subscription_active ? (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-success text-success-foreground">
                <Star className="h-2.5 w-2.5 mr-0.5" />
                Premium Ativo
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Free
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* INÍCIO */}
        <NavLink to="/app" end onClick={onNavigate} className={navLinkClass(isActive('/app'))} data-tour="nav-inicio">
          <Home className="h-4 w-4 shrink-0" />
          <span>Início</span>
        </NavLink>

        {/* CLÍNICA */}
        <SectionLabel>Clínica</SectionLabel>

        {/* Evolução - Collapsible */}
        <Collapsible open={evolutionOpen} onOpenChange={setEvolutionOpen}>
          <CollapsibleTrigger data-tour="nav-evolucao" className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
            isEvolutionRoute ? 'text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
          }`}>
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Evolução</span>
            {evolutionOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <NavLink to="/app/evolucao" onClick={onNavigate} className={subNavLinkClass(isActive('/app/evolucao'))}>
              <Plus className="h-4 w-4 shrink-0" />
              <span>Nova Evolução</span>
            </NavLink>
            <NavLink to="/app/historico" onClick={onNavigate} className={subNavLinkClass(isActive('/app/historico'))}>
              <History className="h-4 w-4 shrink-0" />
              <span>Histórico</span>
            </NavLink>
          </CollapsibleContent>
        </Collapsible>

        <NavLink to="/app/pacientes" onClick={onNavigate} className={navLinkClass(isActivePrefix('/app/pacientes'))} data-tour="nav-pacientes">
          <Users className="h-4 w-4 shrink-0" />
          <span>Pacientes</span>
        </NavLink>

        <Separator className="my-3" />

        {/* FERRAMENTAS IA */}
        <SectionLabel>Ferramentas IA</SectionLabel>

        <NavLink to="/chat" onClick={onNavigate} className={navLinkClass(isActive('/chat'))}>
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span>Chat Clínico</span>
        </NavLink>
        <NavLink to="/busca-plano" onClick={onNavigate} className={navLinkClass(isActive('/busca-plano'))}>
          <Target className="h-4 w-4 shrink-0" />
          <span>Planos de Ação</span>
        </NavLink>
        <NavLink to="/busca-artigos" onClick={onNavigate} className={navLinkClass(isActive('/busca-artigos'))}>
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Artigos Científicos</span>
        </NavLink>

        <Separator className="my-3" />

        {/* MARKETING */}
        <SectionLabel>Marketing</SectionLabel>

        <NavLink to="/marketing" onClick={onNavigate} className={navLinkClass(isActive('/marketing'))}>
          <PenTool className="h-4 w-4 shrink-0" />
          <span>IA de Marketing</span>
        </NavLink>

        {/* ADMINISTRAÇÃO - apenas superadmin */}
        {isAdmin && (
          <>
            <Separator className="my-3" />
            <SectionLabel>Administração</SectionLabel>
            <NavLink to="/admin" onClick={onNavigate} className={navLinkClass(isActive('/admin'))}>
              <Settings className="h-4 w-4 shrink-0" />
              <span>Administração</span>
            </NavLink>
            <NavLink to="/admin/referrals" onClick={onNavigate} className={navLinkClass(isActive('/admin/referrals'))}>
              <Gift className="h-4 w-4 shrink-0" />
              <span>Validar Indicações</span>
            </NavLink>
          </>
        )}

        {/* INDIQUE E GANHE - todos os usuários */}
        <Separator className="my-3" />
        <NavLink to="/app/indicacoes" onClick={onNavigate} className={navLinkClass(isActive('/app/indicacoes'))}>
          <Gift className="h-4 w-4 shrink-0" />
          <span>Indique e Ganhe</span>
        </NavLink>
      </div>

      {/* Footer - always visible */}
      <div className="mt-auto border-t border-sidebar-border p-2 space-y-0.5">
        <NavLink to="/app/perfil" onClick={onNavigate} className={footerBtnClass}>
          <User className="h-4 w-4 mr-3 shrink-0" />
          Meu Perfil
        </NavLink>
        <Popover>
          <PopoverTrigger asChild>
            <button className={`${footerBtnClass} flex items-center`}>
              <HelpCircle className="h-4 w-4 mr-3 shrink-0" />
              Suporte
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="p-2 w-auto">
            <SupportPopoverContent />
          </PopoverContent>
        </Popover>
        <button onClick={signOut} className={`${footerBtnClass} flex items-center`}>
          <LogOut className="h-4 w-4 mr-3 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-sidebar-border flex items-center px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="touch-target">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0 bg-sidebar-background">
              <SidebarNavContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex-1 flex justify-center">
            <img src="/logo.png" alt="ChatPsi" className="h-8" />
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
        <div className="h-14" /> {/* Push content below fixed header */}
      </>
    );
  }

  // Desktop sidebar
  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar-background z-30"
      collapsible="icon"
      style={{
        '--sidebar-width': '18rem',
        '--sidebar-width-icon': '4rem'
      } as React.CSSProperties}
    >
      <SidebarTrigger className="absolute -right-4 top-6 z-40" />

      {open ? (
        <SidebarNavContent />
      ) : (
        /* Collapsed icon-only view */
        <div className="flex flex-col h-full items-center py-4 gap-2">
          <Avatar className="h-8 w-8 mb-2">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getAvatarText()}
            </AvatarFallback>
          </Avatar>
          <Separator className="w-6 my-1" />
          <NavLink to="/app" end title="Início"
            className={`p-2 rounded-lg transition-colors ${isActive('/app') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
            <Home className="h-4 w-4" />
          </NavLink>
          <Separator className="w-6 my-1" />
          {[
            { icon: ClipboardList, path: '/app/evolucao', title: 'Evolução' },
            { icon: Users, path: '/app/pacientes', title: 'Pacientes' },
          ].map(item => (
            <NavLink key={item.path} to={item.path} title={item.title}
              className={`p-2 rounded-lg transition-colors ${isActive(item.path) || (item.path === '/app/evolucao' && isActive('/app/historico')) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
              <item.icon className="h-4 w-4" />
            </NavLink>
          ))}
          <Separator className="w-6 my-1" />
          {[
            { icon: MessageCircle, path: '/chat', title: 'Chat Clínico' },
            { icon: Target, path: '/busca-plano', title: 'Planos de Ação' },
            { icon: BookOpen, path: '/busca-artigos', title: 'Artigos Científicos' },
          ].map(item => (
            <NavLink key={item.path} to={item.path} title={item.title}
              className={`p-2 rounded-lg transition-colors ${isActive(item.path) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
              <item.icon className="h-4 w-4" />
            </NavLink>
          ))}
          <Separator className="w-6 my-1" />
          <NavLink to="/marketing" title="IA de Marketing"
            className={`p-2 rounded-lg transition-colors ${isActive('/marketing') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
            <PenTool className="h-4 w-4" />
          </NavLink>
          {isAdmin && (
            <>
              <Separator className="w-6 my-1" />
              <NavLink to="/admin" title="Administração"
                className={`p-2 rounded-lg transition-colors ${isActive('/admin') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
                <Settings className="h-4 w-4" />
              </NavLink>
              <NavLink to="/admin/referrals" title="Validar Indicações"
                className={`p-2 rounded-lg transition-colors ${isActive('/admin/referrals') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
                <Gift className="h-4 w-4" />
              </NavLink>
            </>
          )}
          <Separator className="w-6 my-1" />
          <NavLink to="/app/indicacoes" title="Indique e Ganhe"
            className={`p-2 rounded-lg transition-colors ${isActive('/app/indicacoes') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}>
            <Gift className="h-4 w-4" />
          </NavLink>

          {/* Footer icons */}
          <div className="mt-auto space-y-1">
            <NavLink to="/app/perfil" title="Meu Perfil"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors block">
              <User className="h-4 w-4" />
            </NavLink>
            <Popover>
              <PopoverTrigger asChild>
                <button title="Suporte"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors block">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="p-2 w-auto">
                <SupportPopoverContent />
              </PopoverContent>
            </Popover>
            <button onClick={signOut} title="Sair"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors block">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Sidebar>
  );
};

export default ChatSidebar;
