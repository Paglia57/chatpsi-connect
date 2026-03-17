import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, Trophy, Medal, Award, Loader2 } from 'lucide-react';

interface Redemption {
  id: string;
  referrer_id: string;
  redeemed_by: string;
  code_used: string;
  status: string;
  created_at: string;
  validated_at: string | null;
  validated_by: string | null;
}

interface RankingEntry {
  user_id: string;
  code: string;
  total_redeemed: number;
}

// Cache for profile lookups
const profileCache: Record<string, { name: string; email: string }> = {};

const AdminReferralsContent = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pendingRedemptions, setPendingRedemptions] = useState<Redemption[]>([]);
  const [allRedemptions, setAllRedemptions] = useState<Redemption[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, { name: string; email: string }>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchProfiles = async (userIds: string[]) => {
    const uncached = userIds.filter(id => !profileCache[id]);
    if (uncached.length === 0) {
      setProfileNames({ ...profileCache });
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', uncached);

    if (data) {
      data.forEach(p => {
        profileCache[p.user_id] = { name: p.full_name || p.email, email: p.email };
      });
    }
    setProfileNames({ ...profileCache });
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      // Fetch pending
      const { data: pending } = await supabase
        .from('referral_redemptions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      // Fetch all
      const { data: all } = await supabase
        .from('referral_redemptions')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch ranking
      const { data: rank } = await supabase
        .from('referral_codes')
        .select('user_id, code, total_redeemed')
        .gt('total_redeemed', 0)
        .order('total_redeemed', { ascending: false });

      setPendingRedemptions(pending || []);
      setAllRedemptions(all || []);
      setRanking(rank || []);

      // Collect all user IDs for name resolution
      const userIds = new Set<string>();
      (pending || []).forEach(r => { userIds.add(r.referrer_id); userIds.add(r.redeemed_by); });
      (all || []).forEach(r => { userIds.add(r.referrer_id); userIds.add(r.redeemed_by); if (r.validated_by) userIds.add(r.validated_by); });
      (rank || []).forEach(r => userIds.add(r.user_id));

      if (userIds.size > 0) {
        await fetchProfiles(Array.from(userIds));
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar dados', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase.rpc('admin_approve_referral', { p_redemption_id: id });
      if (error) throw error;
      toast({ title: 'Indicação aprovada!' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Erro ao aprovar', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const { error } = await supabase.rpc('admin_reject_referral', { p_redemption_id: id });
      if (error) throw error;
      toast({ title: 'Indicação rejeitada' });
      fetchAll();
    } catch (err: any) {
      toast({ title: 'Erro ao rejeitar', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const getName = (userId: string) => profileNames[userId]?.name || userId.slice(0, 8) + '...';
  const getEmail = (userId: string) => profileNames[userId]?.email || '';

  const filteredRedemptions = statusFilter === 'all'
    ? allRedemptions
    : allRedemptions.filter(r => r.status === statusFilter);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success text-success-foreground">Aprovado</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitado</Badge>;
      default: return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0: return <Trophy className="h-5 w-5 text-warning" />;
      case 1: return <Medal className="h-5 w-5 text-muted-foreground" />;
      case 2: return <Award className="h-5 w-5 text-primary" />;
      default: return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{position + 1}</span>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">

      <h1 className="text-3xl font-bold mb-2">Programa de Indicações</h1>
      <p className="text-muted-foreground mb-6">Gerencie os resgates de códigos de indicação</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="queue">
          <TabsList className="mb-4">
            <TabsTrigger value="queue">
              Fila de Validação
              {pendingRedemptions.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{pendingRedemptions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          {/* Tab 1: Queue */}
          <TabsContent value="queue">
            {pendingRedemptions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum resgate pendente de validação.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicador</TableHead>
                      <TableHead>Indicado</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRedemptions.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{getName(r.referrer_id)}</TableCell>
                        <TableCell>{getName(r.redeemed_by)}</TableCell>
                        <TableCell><code className="font-mono text-sm">{r.code_used}</code></TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(r.id)}
                            disabled={actionLoading === r.id}
                            className="bg-success hover:bg-success/90 text-success-foreground"
                          >
                            {actionLoading === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(r.id)}
                            disabled={actionLoading === r.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: History */}
          <TabsContent value="history">
            <div className="flex items-center gap-4 mb-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Indicado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Validado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRedemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum resgate encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRedemptions.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{getName(r.referrer_id)}</TableCell>
                        <TableCell>{getName(r.redeemed_by)}</TableCell>
                        <TableCell><code className="font-mono text-sm">{r.code_used}</code></TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{r.validated_by ? getName(r.validated_by) : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Tab 3: Ranking */}
          <TabsContent value="ranking">
            {ranking.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma indicação aprovada ainda.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Indicações Aprovadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((entry, index) => (
                      <TableRow
                        key={entry.user_id}
                        className={index < 3 ? 'bg-primary/5 font-semibold' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center justify-center">
                            {getRankIcon(index)}
                          </div>
                        </TableCell>
                        <TableCell>{getName(entry.user_id)}</TableCell>
                        <TableCell>{getEmail(entry.user_id)}</TableCell>
                        <TableCell>
                          <Badge variant="default">{entry.total_redeemed}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default function AdminReferralsPage() {
  return (
    <AdminGuard>
      <AdminReferralsContent />
    </AdminGuard>
  );
}
