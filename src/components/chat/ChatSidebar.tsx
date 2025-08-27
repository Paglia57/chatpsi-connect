import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  User, 
  MessageCircle, 
  HeadphonesIcon, 
  LogOut, 
  ExternalLink,
  Crown,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

const ChatSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, profile, signOut, updateProfileBasicInfo } = useAuth();
  const { toast } = useToast();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    nickname: '',
    email: '',
    whatsapp: '',
  });

  // Sincronizar dados do perfil quando carregados
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        nickname: profile.nickname || '',
        email: profile.email || '',
        whatsapp: profile.whatsapp || '',
      });
    }
  }, [profile]);

  // Atualizar dados quando o modal abrir
  useEffect(() => {
    if (isProfileOpen && profile) {
      setProfileData({
        full_name: profile.full_name || '',
        nickname: profile.nickname || '',
        email: profile.email || '',
        whatsapp: profile.whatsapp || '',
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
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      setIsProfileOpen(false);
    }
  };

  const handleSupportClick = () => {
    window.open('https://wa.me/5511942457454', '_blank', 'noopener,noreferrer');
  };

  const menuItems = [
    {
      title: 'Chat',
      url: '/chat',
      icon: MessageCircle,
      description: 'Conversar com IA especializada'
    }
  ];

  return (
    <Sidebar
      className={collapsed ? "w-14" : "w-64"}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent className="p-2">
        {/* Header */}
        <div className={`mb-6 ${collapsed ? 'hidden' : 'block'}`}>
          <img 
            src="/lovable-uploads/e8ce6c19-f769-4a4f-a8d0-9c93492a7f76.png" 
            alt="ChatPsi" 
            className="h-6 w-auto object-contain px-4"
          />
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-accent hover:text-accent-foreground'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <div>
                          <span className="font-medium">{item.title}</span>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subscription Status */}
        {!collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Status da Assinatura</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-4 py-3 bg-card rounded-lg border">
                {profile?.subscription_active ? (
                  <div className="flex items-center gap-2 text-success">
                    <Crown className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Assinatura Ativa</p>
                      {profile.subscription_tier && (
                        <p className="text-xs text-muted-foreground">
                          Plano: {profile.subscription_tier}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-warning">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm font-medium">Assinatura Inativa</p>
                    </div>
                    <Button variant="cta" size="sm" className="w-full">
                      Assinar Agora
                    </Button>
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Profile & Support */}
        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Profile */}
              <SidebarMenuItem>
                <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                  <DialogTrigger asChild>
                    <SidebarMenuButton className="flex items-center gap-3">
                      <User className="h-4 w-4" />
                      {!collapsed && <span>Meu Perfil</span>}
                    </SidebarMenuButton>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Editar Perfil</DialogTitle>
                      <DialogDescription>
                        Atualize suas informações pessoais
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Nome completo</Label>
                        <Input
                          id="fullName"
                          value={profileData.full_name}
                          onChange={(e) => setProfileData(prev => ({ 
                            ...prev, 
                            full_name: e.target.value 
                          }))}
                          placeholder="Seu nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nickname">Apelido</Label>
                        <Input
                          id="nickname"
                          value={profileData.nickname}
                          onChange={(e) => setProfileData(prev => ({ 
                            ...prev, 
                            nickname: e.target.value 
                          }))}
                          placeholder="Como gostaria de ser chamado(a)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData(prev => ({ 
                            ...prev, 
                            email: e.target.value 
                          }))}
                          placeholder="seu@email.com"
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Para alterar o e-mail, entre em contato com o suporte
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                        <Input
                          id="whatsapp"
                          value={profileData.whatsapp}
                          onChange={(e) => setProfileData(prev => ({ 
                            ...prev, 
                            whatsapp: e.target.value 
                          }))}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          Salvar
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsProfileOpen(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>

              {/* Support */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleSupportClick}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <HeadphonesIcon className="h-4 w-4" />
                  {!collapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span>Suporte</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Logout */}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={signOut}
                  className="flex items-center gap-3 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default ChatSidebar;