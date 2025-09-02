import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, User, MessageCircle, LogOut, Menu, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useResponsive } from '@/hooks/useResponsive';

const ChatSidebar = () => {
  const { collapsed } = useSidebar();
  const { user, profile, signOut, updateProfileBasicInfo } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useResponsive();
  
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
    const { error } = await updateProfileBasicInfo(
      profileData.full_name,
      profileData.whatsapp,
      profileData.nickname
    );

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

  const menuItems = [
    {
      title: "Chat",
      url: "/chat",
      icon: MessageSquare,
      description: "Conversar com IA especializada"
    }
  ];

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 touch-target">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="ChatPsi" 
                  className="h-8 w-auto object-contain"
                />
                <div>
                  <h2 className="font-semibold text-lg">ChatPsi</h2>
                  <p className="text-xs text-muted-foreground">Assistente de IA</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 p-4">
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-md transition-colors touch-target ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    </div>
                  </NavLink>
                ))}
              </nav>
            </div>
            
            <div className="p-4 border-t space-y-2">
              <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start touch-target">
                    <User className="h-4 w-4 mr-2" />
                    Meu Perfil
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Editar Perfil</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="full_name">Nome completo</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="nickname">Apelido</Label>
                      <Input
                        id="nickname"
                        value={profileData.nickname}
                        onChange={(e) => setProfileData(prev => ({ ...prev, nickname: e.target.value }))}
                        placeholder="Como gosta de ser chamado"
                      />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={profileData.whatsapp}
                        onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="+55 11 99999-9999"
                      />
                    </div>
                    <Button onClick={handleProfileUpdate} className="w-full touch-target">
                      Salvar Alterações
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start touch-target"
                onClick={handleSupportClick}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar com suporte
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 touch-target"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sidebar className={`${collapsed ? 'w-24' : 'w-64'} border-r`} collapsible>
      <SidebarTrigger className="absolute -right-4 top-6 z-10" />
      
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="ChatPsi" 
            className="h-8 w-auto object-contain flex-shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-semibold text-lg truncate">ChatPsi</h2>
              <p className="text-xs text-muted-foreground truncate">Assistente de IA</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 ${
                          isActive ? 'bg-primary text-primary-foreground' : ''
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.title}</span>
                      {!collapsed && (
                        <span className="text-xs text-muted-foreground ml-auto truncate max-w-24">
                          {item.description}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <div className="mt-auto p-2 border-t space-y-1">
        {profile?.subscription_active && (
          <div className={`px-3 py-2 rounded-md text-xs ${
            collapsed ? 'text-center' : ''
          }`}>
            <div className="flex items-center gap-2 text-success">
              <div className="w-2 h-2 bg-success rounded-full flex-shrink-0" />
              {!collapsed && <span>Assinatura ativa</span>}
            </div>
          </div>
        )}
        
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              className={`w-full ${collapsed ? 'px-2' : 'justify-start'}`}
              title={collapsed ? "Meu Perfil" : undefined}
            >
              <User className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Meu Perfil</span>}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nome completo</Label>
                <Input
                  id="full_name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <Label htmlFor="nickname">Apelido</Label>
                <Input
                  id="nickname"
                  value={profileData.nickname}
                  onChange={(e) => setProfileData(prev => ({ ...prev, nickname: e.target.value }))}
                  placeholder="Como gosta de ser chamado"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={profileData.whatsapp}
                  onChange={(e) => setProfileData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <Button onClick={handleProfileUpdate} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button 
          variant="ghost" 
          className={`w-full ${collapsed ? 'px-2' : 'justify-start'}`}
          onClick={handleSupportClick}
          title={collapsed ? "Falar com suporte" : undefined}
        >
          <MessageCircle className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Suporte</span>}
        </Button>
        
        <Button 
          variant="ghost" 
          className={`w-full ${collapsed ? 'px-2' : 'justify-start'} text-destructive hover:text-destructive hover:bg-destructive/10`}
          onClick={signOut}
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </Sidebar>
  );
};

export default ChatSidebar;