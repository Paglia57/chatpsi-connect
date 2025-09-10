import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, User, MessageCircle, LogOut, Menu, X, Sparkles, Star, Heart } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/useResponsive';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ChatSidebar = () => {
  const {
    open
  } = useSidebar();
  const {
    user,
    profile,
    signOut,
    updateProfileBasicInfo
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    isMobile
  } = useResponsive();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    nickname: '',
    whatsapp: ''
  });

  // Sincronizar dados do perfil quando carregados
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        nickname: profile.nickname || '',
        whatsapp: profile.whatsapp || ''
      });
    }
  }, [profile]);

  // Atualizar dados quando o modal abrir
  useEffect(() => {
    if (isProfileOpen && profile) {
      setProfileData({
        full_name: profile.full_name || '',
        nickname: profile.nickname || '',
        whatsapp: profile.whatsapp || ''
      });
    }
  }, [isProfileOpen, profile]);
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      error
    } = await updateProfileBasicInfo(profileData.full_name, profileData.whatsapp, profileData.nickname);
    if (error) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso."
      });
      setIsProfileOpen(false);
    }
  };
  
  const handleSupportClick = () => {
    window.open('https://wa.me/5511942457454', '_blank', 'noopener,noreferrer');
  };
  
  const menuItems = [{
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
    description: "Conversar com IA especializada",
    gradient: "from-primary to-cta"
  }];

  // Generate avatar from user name/nickname
  const getAvatarText = () => {
    const name = profile?.nickname || profile?.full_name || user?.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  if (isMobile) {
    return <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 touch-target bg-primary hover:bg-primary/90 border border-primary/30 transition-all duration-200 shadow-lg hover:shadow-xl">
            <Menu className="h-5 w-5 text-white" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 bg-background">
          <div className="flex flex-col h-full animate-slide-in-right">
            {/* Hero Header with Gradient */}
            <div className="relative bg-gradient-hero p-6 text-white overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-12 -translate-x-12"></div>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-12 w-12 ring-2 ring-white/30 shadow-lg">
                    <AvatarFallback className="bg-white/20 text-white font-semibold text-lg backdrop-blur-sm">
                      {getAvatarText()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-semibold text-lg text-white truncate">
                      {profile?.nickname || profile?.full_name || 'Usuário'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      {profile?.subscription_active ? <>
                          <Star className="h-3 w-3 text-yellow-300" />
                          <span className="text-xs text-white/90">Premium Ativo</span>
                        </> : <span className="text-xs text-white/70">Conta Gratuita</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="ChatPsi" className="h-6 w-auto object-contain opacity-90" />
                  
                  <div className="ml-auto flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                    <span className="text-xs text-white/80">IA Especializada</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation Section */}
            <div className="flex-1 p-4">
              <div className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Navegação
                </h3>
                {menuItems.map(item => <NavLink key={item.title} to={item.url} className={({
                isActive
              }) => `group flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 touch-target ${isActive ? 'bg-gradient-primary text-white shadow-md' : 'hover:bg-muted/60 hover:shadow-sm hover:scale-[1.02]'}`}>
                    {({
                  isActive
                }) => <>
                        <div className={`p-2 rounded-md ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                          <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-primary'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${isActive ? 'text-white' : 'text-foreground'}`}>
                            {item.title}
                          </p>
                          <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {item.description}
                          </p>
                        </div>
                        {isActive && <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></div>}
                      </>}
                  </NavLink>)}
              </div>
            </div>
            
            {/* Account Section */}
            <div className="border-t bg-muted/30 p-4 space-y-2">
              <h3 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Conta
              </h3>
              
              <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start touch-target group hover:bg-white hover:shadow-md transition-all duration-200">
                    <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="ml-3 font-medium">Meu Perfil</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="h-3 w-3 text-primary" />
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Editar Perfil
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Nome completo</Label>
                      <Input id="full_name" value={profileData.full_name} onChange={e => setProfileData(prev => ({
                      ...prev,
                      full_name: e.target.value
                    }))} placeholder="Seu nome completo" className="focus-visible:ring-primary" />
                    </div>
                    <div>
                      <Label htmlFor="nickname">Apelido</Label>
                      <Input id="nickname" value={profileData.nickname} onChange={e => setProfileData(prev => ({
                      ...prev,
                      nickname: e.target.value
                    }))} placeholder="Como gosta de ser chamado" className="focus-visible:ring-primary" />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input id="whatsapp" value={profileData.whatsapp} onChange={e => setProfileData(prev => ({
                      ...prev,
                      whatsapp: e.target.value
                    }))} placeholder="+55 11 99999-9999" className="focus-visible:ring-primary" />
                    </div>
                    <Button onClick={handleProfileUpdate} className="w-full touch-target bg-gradient-primary hover:shadow-lg transition-all duration-200">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="ghost" className="w-full justify-start touch-target group hover:bg-success/10 hover:shadow-md transition-all duration-200" onClick={handleSupportClick}>
                <div className="p-1.5 rounded-md bg-success/10 group-hover:bg-success/20 transition-colors">
                  <MessageCircle className="h-4 w-4 text-success" />
                </div>
                <span className="ml-3 font-medium">Falar com suporte</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart className="h-3 w-3 text-success" />
                </div>
              </Button>
              
              <Button variant="ghost" className="w-full justify-start touch-target group hover:bg-destructive/10 hover:shadow-md transition-all duration-200" onClick={signOut}>
                <div className="p-1.5 rounded-md bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                  <LogOut className="h-4 w-4 text-destructive" />
                </div>
                <span className="ml-3 font-medium text-destructive">Sair</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3 text-destructive" />
                </div>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>;
  }

  // Desktop sidebar with mobile-style design
  return <Sidebar className={`${!open ? 'w-16' : 'w-80'} border-r bg-background`} collapsible="icon">
      <SidebarTrigger className="absolute -right-4 top-6 z-10" />
      
      <div className="flex flex-col h-full">
        {/* Hero Header with Gradient */}
        <div className={`relative bg-gradient-hero text-white overflow-hidden ${!open ? 'p-2' : 'p-6'}`}>
          {open && (
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-12 -translate-x-12"></div>
            </div>
          )}
          
          <div className="relative z-10">
            <div className={`flex items-center ${!open ? 'justify-center' : 'gap-4 mb-4'}`}>
              <Avatar className={`${!open ? 'h-8 w-8' : 'h-12 w-12'} ring-2 ring-white/30 shadow-lg`}>
                <AvatarFallback className="bg-white/20 text-white font-semibold backdrop-blur-sm">
                  {getAvatarText()}
                </AvatarFallback>
              </Avatar>
              {open && (
                <div className="flex-1 min-w-0">
                  <h2 className="font-display font-semibold text-lg text-white truncate">
                    {profile?.nickname || profile?.full_name || 'Usuário'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {profile?.subscription_active ? (
                      <>
                        <Star className="h-3 w-3 text-yellow-300" />
                        <span className="text-xs text-white/90">Premium Ativo</span>
                      </>
                    ) : (
                      <span className="text-xs text-white/70">Conta Gratuita</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {open && (
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="ChatPsi" className="h-6 w-auto object-contain opacity-90" />
                
                <div className="ml-auto flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  <span className="text-xs text-white/80">IA Especializada</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Section */}
        <div className={`flex-1 ${!open ? 'p-2' : 'p-4'}`}>
          <div className="space-y-1">
            {open && (
              <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Navegação
              </h3>
            )}
            
            {menuItems.map(item => (
              <NavLink 
                key={item.title} 
                to={item.url} 
                title={!open ? item.title : undefined}
                className={({ isActive }) => 
                  `group flex items-center ${!open ? 'justify-center p-2' : 'gap-3 px-3 py-3'} rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-primary text-white shadow-md' 
                      : 'hover:bg-muted/60 hover:shadow-sm hover:scale-[1.02]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`${!open ? 'p-1.5' : 'p-2'} rounded-md ${isActive ? 'bg-white/20' : 'bg-primary/10'}`}>
                      <item.icon className={`${!open ? 'h-4 w-4' : 'h-5 w-5'} ${isActive ? 'text-white' : 'text-primary'}`} />
                    </div>
                    {open && (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium truncate ${isActive ? 'text-white' : 'text-foreground'}`}>
                            {item.title}
                          </p>
                          <p className={`text-xs truncate ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {item.description}
                          </p>
                        </div>
                        {isActive && <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></div>}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
        
        {/* Account Section */}
        <div className={`border-t bg-muted/30 space-y-2 ${!open ? 'p-2' : 'p-4'}`}>
          {open && (
            <h3 className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Conta
            </h3>
          )}
          
          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className={`w-full group hover:bg-white hover:shadow-md transition-all duration-200 ${
                  !open ? 'px-2 py-2' : 'justify-start'
                }`}
                title={!open ? "Meu Perfil" : undefined}
              >
                <div className={`${!open ? 'p-1' : 'p-1.5'} rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors`}>
                  <User className={`${!open ? 'h-3 w-3' : 'h-4 w-4'} text-primary`} />
                </div>
                {open && (
                  <>
                    <span className="ml-3 font-medium">Meu Perfil</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="h-3 w-3 text-primary" />
                    </div>
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Editar Perfil
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input 
                    id="full_name" 
                    value={profileData.full_name} 
                    onChange={e => setProfileData(prev => ({
                      ...prev,
                      full_name: e.target.value
                    }))} 
                    placeholder="Seu nome completo" 
                    className="focus-visible:ring-primary" 
                  />
                </div>
                <div>
                  <Label htmlFor="nickname">Apelido</Label>
                  <Input 
                    id="nickname" 
                    value={profileData.nickname} 
                    onChange={e => setProfileData(prev => ({
                      ...prev,
                      nickname: e.target.value
                    }))} 
                    placeholder="Como gosta de ser chamado" 
                    className="focus-visible:ring-primary" 
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input 
                    id="whatsapp" 
                    value={profileData.whatsapp} 
                    onChange={e => setProfileData(prev => ({
                      ...prev,
                      whatsapp: e.target.value
                    }))} 
                    placeholder="+55 11 99999-9999" 
                    className="focus-visible:ring-primary" 
                  />
                </div>
                <Button onClick={handleProfileUpdate} className="w-full bg-gradient-primary hover:shadow-lg transition-all duration-200">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="ghost" 
            className={`w-full group hover:bg-success/10 hover:shadow-md transition-all duration-200 ${
              !open ? 'px-2 py-2' : 'justify-start'
            }`} 
            onClick={handleSupportClick}
            title={!open ? "Falar com suporte" : undefined}
          >
            <div className={`${!open ? 'p-1' : 'p-1.5'} rounded-md bg-success/10 group-hover:bg-success/20 transition-colors`}>
              <MessageCircle className={`${!open ? 'h-3 w-3' : 'h-4 w-4'} text-success`} />
            </div>
            {open && (
              <>
                <span className="ml-3 font-medium">Falar com suporte</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart className="h-3 w-3 text-success" />
                </div>
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            className={`w-full group hover:bg-destructive/10 hover:shadow-md transition-all duration-200 ${
              !open ? 'px-2 py-2' : 'justify-start'
            }`} 
            onClick={signOut}
            title={!open ? "Sair" : undefined}
          >
            <div className={`${!open ? 'p-1' : 'p-1.5'} rounded-md bg-destructive/10 group-hover:bg-destructive/20 transition-colors`}>
              <LogOut className={`${!open ? 'h-3 w-3' : 'h-4 w-4'} text-destructive`} />
            </div>
            {open && (
              <>
                <span className="ml-3 font-medium text-destructive">Sair</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3 text-destructive" />
                </div>
              </>
            )}
          </Button>
        </div>
      </div>
    </Sidebar>;
};

export default ChatSidebar;