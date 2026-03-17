import { useEffect, useState } from "react";
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Users, ClipboardList, Brain, TrendingUp } from "lucide-react";
import PatientFormDialog from "@/components/patients/PatientFormDialog";

interface Patient {
  id: string;
  full_name: string;
  initials: string;
  approach: string | null;
  status: string;
  total_sessions: number;
  last_session_at: string | null;
}

export default function PatientsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterApproach, setFilterApproach] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPatients = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, initials, approach, status, total_sessions, last_session_at")
      .eq("user_id", user.id)
      .order("full_name");
    if (!error && data) setPatients(data);
    setLoading(false);
  };

  useEffect(() => { fetchPatients(); }, [user]);

  const approaches = [...new Set(patients.map(p => p.approach).filter(Boolean))];

  const filtered = patients
    .filter(p => {
      if (search && !p.full_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterApproach !== "all" && p.approach !== filterApproach) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "last_session") return (b.last_session_at || "").localeCompare(a.last_session_at || "");
      if (sortBy === "sessions") return b.total_sessions - a.total_sessions;
      return 0;
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-tour="page-patients">
      <AppBreadcrumb items={[
        { label: "Clínica", href: "/app/pacientes" },
        { label: "Pacientes" },
      ]} />
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="font-display text-xl text-foreground">Meus Pacientes</CardTitle>
          <Button variant="cta" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {patients.length === 0 && !loading ? (
            <div className="flex flex-col items-center text-center py-16 px-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Nenhum paciente cadastrado ainda</h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Cadastre seus pacientes para acompanhar evoluções, manter o histórico organizado e ter contexto personalizado nas sessões.
              </p>
              <Button variant="cta" size="lg" onClick={() => setDialogOpen(true)} className="mb-8">
                <UserPlus className="h-5 w-5" />
                Cadastrar primeiro paciente
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
                {[
                  { icon: ClipboardList, text: "Histórico de sessões organizado por paciente" },
                  { icon: Brain, text: "Contexto automático para a IA nas evoluções" },
                  { icon: TrendingUp, text: "Acompanhamento de progresso ao longo do tempo" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-xs text-muted-foreground leading-tight">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome..." className="pl-9" />
                </div>
                <Select value={filterApproach} onValueChange={setFilterApproach}>
                  <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Abordagem" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas abordagens</SelectItem>
                    {approaches.map(a => <SelectItem key={a!} value={a!}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Por nome</SelectItem>
                    <SelectItem value="last_session">Última sessão</SelectItem>
                    <SelectItem value="sessions">Total sessões</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* List */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum paciente encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(p => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/app/pacientes/${p.id}`)}
                      className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                          {p.initials.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{p.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {p.approach && <Badge variant="secondary" className="text-xs">{p.approach}</Badge>}
                          <span className="text-xs text-muted-foreground">{p.total_sessions} sessão(ões)</span>
                          {p.last_session_at && (
                            <span className="text-xs text-muted-foreground">
                              • Última: {new Date(p.last_session_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={p.status === "active" ? "default" : "outline"} className="shrink-0">
                        {p.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PatientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={fetchPatients} />
    </div>
  );
}
