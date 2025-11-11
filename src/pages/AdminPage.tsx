import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit, RotateCcw, ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
  nickname: string | null;
  whatsapp: string | null;
  subscription_active: boolean;
  subscription_id: string | null;
  TokenCount: number | null;
  openai_thread_id: string | null;
}

const AdminPageContent = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, nickname, whatsapp, subscription_active, subscription_id, TokenCount, openai_thread_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProfiles(data || []);
      setFilteredProfiles(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar perfis',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProfiles(profiles);
    } else {
      const filtered = profiles.filter((profile) =>
        profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProfiles(filtered);
    }
  }, [searchTerm, profiles]);

  const handleClearThread = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('admin_clear_thread', {
        p_user_id: userId,
      });

      if (error) throw error;

      toast({
        title: 'Histórico limpo com sucesso',
        description: 'O thread OpenAI foi removido.',
      });

      fetchProfiles();
    } catch (error: any) {
      toast({
        title: 'Erro ao limpar histórico',
        description: error.message,
        variant: 'destructive',
      });
    }
  };


  const handleSaveEdit = async () => {
    if (!editingProfile) return;

    try {
      const { error } = await supabase.rpc('admin_update_profile', {
        p_user_id: editingProfile.user_id,
        p_email: editingProfile.email,
        p_full_name: editingProfile.full_name,
        p_whatsapp: editingProfile.whatsapp || null,
        p_nickname: editingProfile.nickname,
        p_subscription_active: editingProfile.subscription_active,
      });

      if (error) throw error;

      toast({
        title: 'Perfil atualizado com sucesso',
      });

      setEditingProfile(null);
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/chat')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o Chat
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Administração de Usuários</h1>
            <p className="text-muted-foreground">Gerencie os perfis dos usuários registrados</p>
          </div>

          {(() => {
            const activeSubscribers = profiles.filter(p => p.subscription_active && p.subscription_id);
            const activeCount = activeSubscribers.length;

            return (
              <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 w-full lg:min-w-[280px] lg:w-auto">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-sm font-medium text-muted-foreground">
                      Assinantes Ativos
                    </h2>
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {activeCount}
                  </p>
                </div>
                
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Detalhes
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <ScrollArea className="h-48 w-full rounded border">
                      <div className="p-2">
                        {activeSubscribers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum assinante ativo
                          </p>
                        ) : (
                          activeSubscribers.map(sub => (
                            <div 
                              key={sub.user_id} 
                              className="flex flex-col gap-1 border-b py-2 last:border-0"
                            >
                              <span className="font-medium text-sm truncate">
                                {sub.full_name || sub.email}
                              </span>
                              <Badge variant="secondary" className="font-mono text-xs w-fit">
                                ID: {sub.subscription_id || 'N/A'}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Histórico</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile.user_id}>
                  <TableCell className="font-medium">{profile.email}</TableCell>
                  <TableCell>{profile.full_name || '-'}</TableCell>
                  <TableCell>{profile.nickname || '-'}</TableCell>
                  <TableCell>
                    {profile.whatsapp || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={profile.subscription_active ? 'default' : 'secondary'}>
                      {profile.subscription_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell>{profile.TokenCount || 0}</TableCell>
                  <TableCell>
                    {profile.openai_thread_id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClearThread(profile.user_id)}
                      >
                        Limpar Histórico
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem histórico</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingProfile(profile)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingProfile} onOpenChange={() => setEditingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          {editingProfile && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={editingProfile.email}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Nome Completo</label>
                <Input
                  value={editingProfile.full_name || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, full_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apelido</label>
                <Input
                  value={editingProfile.nickname || ''}
                  onChange={(e) =>
                    setEditingProfile({ ...editingProfile, nickname: e.target.value })
                  }
                />
              </div>
              <InternationalPhoneInput
                value={editingProfile.whatsapp || ''}
                onChange={(value) => {
                  setEditingProfile({ 
                    ...editingProfile, 
                    whatsapp: value || null
                  });
                }}
                defaultCountry="55"
                label="WhatsApp"
                required={false}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingProfile.subscription_active}
                  onCheckedChange={(checked) =>
                    setEditingProfile({
                      ...editingProfile,
                      subscription_active: checked === true,
                    })
                  }
                />
                <label className="text-sm font-medium">Assinatura Ativa</label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingProfile(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  );
}
