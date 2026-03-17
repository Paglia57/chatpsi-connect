import { useEffect, useState } from "react";
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Sparkles, Brain, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PatientFormDialog, { type PatientData } from "@/components/patients/PatientFormDialog";

interface Patient {
  id: string;
  full_name: string;
  initials: string;
  date_of_birth: string | null;
  gender: string | null;
  approach: string | null;
  main_complaint: string | null;
  cid_10: string | null;
  dsm_5: string | null;
  medication: string | null;
  notes: string | null;
  default_session_duration: string | null;
  default_session_type: string | null;
  session_day_time: string | null;
  session_frequency: string | null;
  status: string;
  openai_thread_id: string | null;
  openai_assistant_id: string | null;
  total_sessions: number;
  last_session_at: string | null;
}

interface Evolution {
  id: string;
  output_content: string | null;
  created_at: string;
  session_number: number | null;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEvo, setSelectedEvo] = useState<Evolution | null>(null);
  const [activatingThread, setActivatingThread] = useState(false);

  const fetchData = async () => {
    if (!user || !id) return;
    setLoading(true);
    const [pRes, eRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).eq("user_id", user.id).single(),
      supabase.from("evolutions").select("id, output_content, created_at, session_number").eq("patient_id", id).order("created_at", { ascending: false }),
    ]);
    if (pRes.data) setPatient(pRes.data as Patient);
    if (eRes.data) setEvolutions(eRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, id]);

  const handleActivateThread = async () => {
    if (!patient) return;
    setActivatingThread(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-patient-thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patient_name: patient.full_name,
          patient_initials: patient.initials,
          approach: patient.approach,
          main_complaint: patient.main_complaint,
          cid_10: patient.cid_10,
          dsm_5: patient.dsm_5,
          medication: patient.medication,
          notes: patient.notes,
        }),
      });

      if (!resp.ok) throw new Error("Falha ao criar contexto de IA");
      const { thread_id, assistant_id } = await resp.json();
      await supabase.from("patients").update({ openai_thread_id: thread_id, openai_assistant_id: assistant_id }).eq("id", patient.id);
      setPatient(prev => prev ? { ...prev, openai_thread_id: thread_id, openai_assistant_id: assistant_id } : null);
      toast.success("Contexto de IA ativado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao ativar contexto");
    } finally {
      setActivatingThread(false);
    }
  };

  const editData: PatientData | null = patient ? {
    id: patient.id,
    full_name: patient.full_name,
    initials: patient.initials,
    date_of_birth: patient.date_of_birth || "",
    gender: patient.gender || "",
    approach: patient.approach || "",
    main_complaint: patient.main_complaint || "",
    cid_10: patient.cid_10 || "",
    dsm_5: patient.dsm_5 || "",
    medication: patient.medication || "",
    notes: patient.notes || "",
    default_session_duration: patient.default_session_duration || "",
    default_session_type: patient.default_session_type || "",
    session_day_time: patient.session_day_time || "",
    session_frequency: patient.session_frequency || "",
    status: patient.status,
  } : null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Paciente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/app/pacientes")}>Voltar</Button>
      </div>
    );
  }

  const InfoItem = ({ label, value }: { label: string; value: string | null }) =>
    value ? (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    ) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <AppBreadcrumb items={[
        { label: "Clínica", href: "/app/pacientes" },
        { label: "Pacientes", href: "/app/pacientes" },
        { label: patient.full_name },
      ]} />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/pacientes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-accent text-accent-foreground text-lg font-semibold">{patient.initials.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl font-semibold text-foreground">{patient.full_name}</h1>
            <span className="text-sm text-muted-foreground">({patient.initials})</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={patient.status === "active" ? "default" : "outline"}>
              {patient.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
            {patient.approach && <Badge variant="secondary">{patient.approach}</Badge>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button variant="cta" size="sm" onClick={() => navigate(`/app/evolucao?patient=${patient.id}`)}>
            <Sparkles className="h-4 w-4" /> Nova Evolução
          </Button>
        </div>
      </div>

      {/* Clinical data */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader><CardTitle className="font-display text-lg">Dados Clínicos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem label="Queixa principal" value={patient.main_complaint} />
          <InfoItem label="CID-10" value={patient.cid_10} />
          <InfoItem label="DSM-5" value={patient.dsm_5} />
          <InfoItem label="Medicação" value={patient.medication} />
          <InfoItem label="Observações" value={patient.notes} />
          <InfoItem label="Gênero" value={patient.gender} />
          <InfoItem label="Data de nascimento" value={patient.date_of_birth ? new Date(patient.date_of_birth + "T12:00:00").toLocaleDateString("pt-BR") : null} />
          <InfoItem label="Dia/horário habitual" value={patient.session_day_time} />
          <InfoItem label="Duração padrão" value={patient.default_session_duration} />
          <InfoItem label="Tipo de atendimento" value={patient.default_session_type} />
          <InfoItem label="Frequência" value={patient.session_frequency} />
        </CardContent>
      </Card>

      {/* Evolution history */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader><CardTitle className="font-display text-lg">Histórico de Evoluções</CardTitle></CardHeader>
        <CardContent>
          {evolutions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma evolução registrada para este paciente.</p>
          ) : (
            <div className="space-y-2">
              {evolutions.map(ev => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvo(ev)}
                  className="p-3 rounded-lg border border-border hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">
                      {new Date(ev.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                    {ev.session_number && <span className="text-muted-foreground">• Sessão {ev.session_number}</span>}
                  </div>
                  {ev.output_content && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ev.output_content.slice(0, 150)}...</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Context */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex items-center gap-4 py-4">
          <Brain className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Contexto Acumulado da IA</p>
            {patient.openai_thread_id ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {patient.total_sessions} sessão(ões) no contexto. A IA acumula o histórico de todas as sessões deste paciente.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                O contexto de IA ainda não foi ativado para este paciente.
              </p>
            )}
          </div>
          {!patient.openai_thread_id && (
            <Button variant="outline" size="sm" onClick={handleActivateThread} disabled={activatingThread}>
              {activatingThread && <Loader2 className="h-4 w-4 animate-spin" />}
              Ativar contexto de IA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Evolution detail dialog */}
      <Dialog open={!!selectedEvo} onOpenChange={open => { if (!open) setSelectedEvo(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Evolução — {selectedEvo && new Date(selectedEvo.created_at).toLocaleDateString("pt-BR")}
            </DialogTitle>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {selectedEvo?.output_content}
          </div>
        </DialogContent>
      </Dialog>

      <PatientFormDialog open={editOpen} onOpenChange={setEditOpen} editData={editData} onSaved={fetchData} />
    </div>
  );
}
