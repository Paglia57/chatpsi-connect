import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import AgendaEventDialog, { type AppointmentRow, spDateTimeParts } from "@/components/agenda/AgendaEventDialog";
import { ChevronLeft, ChevronRight, Plus, Check, X, Edit, FileText, Ban, ClipboardList } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;
const SP = "America/Sao_Paulo";

function todaySP(): string {
  return spDateTimeParts(new Date().toISOString()).date;
}
function addDaysStr(dateStr: string, n: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function dayStartUtc(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0) + 3 * 3600 * 1000).toISOString();
}
function fmtHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: SP, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
function fmtDiaLongo(dateStr: string): string {
  const iso = dayStartUtc(dateStr);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: SP, weekday: "long", day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  agendado: "default", realizado: "secondary", faltou: "destructive", cancelado: "outline",
};

const AgendaPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [view, setView] = useState<"dia" | "semana">("dia");
  const [anchor, setAnchor] = useState<string>(todaySP());
  const [appts, setAppts] = useState<AppointmentRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);

  const days = useMemo(
    () => view === "dia" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDaysStr(anchor, i)),
    [view, anchor],
  );

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const from = dayStartUtc(days[0]);
      const to = dayStartUtc(addDaysStr(days[days.length - 1], 1));
      const [{ data: aData }, { data: pData }] = await Promise.all([
        sb.from("appointments")
          .select("id, patient_id, patient_initials, starts_at, duration_min, modality, meeting_link, status, notes")
          .eq("user_id", user.id).gte("starts_at", from).lt("starts_at", to)
          .order("starts_at", { ascending: true }),
        sb.from("patients").select("id, full_name").eq("user_id", user.id),
      ]);
      setAppts((aData ?? []) as AppointmentRow[]);
      const map: Record<string, string> = {};
      for (const p of (pData ?? [])) map[p.id] = p.full_name;
      setNames(map);
    } catch (e: any) {
      toast({ title: "Erro ao carregar agenda", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, days, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const byDay = useMemo(() => {
    const m: Record<string, AppointmentRow[]> = {};
    for (const a of appts) {
      const k = spDateTimeParts(a.starts_at).date;
      (m[k] ??= []).push(a);
    }
    return m;
  }, [appts]);

  const setStatus = async (a: AppointmentRow, status: string) => {
    try {
      const { error } = await sb.from("appointments")
        .update({ status, atualizado_em: new Date().toISOString() }).eq("id", a.id);
      if (error) throw error;
      toast({ title: `Marcado como ${status}` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const nome = (a: AppointmentRow) => (a.patient_id && names[a.patient_id]) || a.patient_initials || "Sem paciente";

  const shift = (dir: number) => setAnchor(addDaysStr(anchor, dir * (view === "dia" ? 1 : 7)));

  return (
    <div className="container mx-auto py-8 px-4">
      <AppBreadcrumb items={[{ label: "Agenda" }]} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Agenda</h1>
          <p className="text-muted-foreground">Suas sessões agendadas.</p>
        </div>
        <Button variant="cta" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo compromisso
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(todaySP())}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex rounded-lg border p-0.5">
          <Button variant={view === "dia" ? "secondary" : "ghost"} size="sm" onClick={() => setView("dia")}>Dia</Button>
          <Button variant={view === "semana" ? "secondary" : "ghost"} size="sm" onClick={() => setView("semana")}>Semana</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day}>
              <h2 className="text-sm font-semibold capitalize text-muted-foreground mb-2">{fmtDiaLongo(day)}</h2>
              {(byDay[day] ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground pl-1">Sem compromissos.</p>
              ) : (
                <div className="space-y-2">
                  {byDay[day].map((a) => (
                    <div key={a.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fmtHora(a.starts_at)}</span>
                          <span className="truncate">{nome(a)}</span>
                          <Badge variant={STATUS_VARIANT[a.status] ?? "default"}>{a.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.duration_min}min · {a.modality}
                          {a.meeting_link && <> · <a href={a.meeting_link} target="_blank" rel="noreferrer" className="text-primary underline">link</a></>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" title="Editar" onClick={() => { setEditing(a); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" title="Realizado" onClick={() => setStatus(a, "realizado")}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" title="Faltou" onClick={() => setStatus(a, "faltou")}><X className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" title="Cancelar" onClick={() => setStatus(a, "cancelado")}><Ban className="h-4 w-4" /></Button>
                        {a.patient_id && (
                          <Button size="sm" variant="ghost" title="Planejar esta sessão" onClick={() => navigate(`/app/planejar-sessao?patient=${a.patient_id}&appointment=${a.id}`)}>
                            <ClipboardList className="h-4 w-4" />
                          </Button>
                        )}
                        {a.patient_id && (
                          <Button size="sm" variant="ghost" title="Ditar evolução" onClick={() => navigate(`/app/evolucao?patient=${a.patient_id}`)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AgendaEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editData={editing}
        defaultDate={anchor}
        onSaved={fetchData}
      />
    </div>
  );
};

export default AgendaPage;
