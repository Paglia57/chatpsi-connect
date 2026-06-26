import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PatientSelector, { type SelectedPatient } from "@/components/patients/PatientSelector";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;
const SP = "America/Sao_Paulo";

export interface AppointmentRow {
  id: string;
  patient_id: string | null;
  patient_initials: string | null;
  starts_at: string;
  duration_min: number;
  modality: string;
  meeting_link: string | null;
  status: string;
  notes: string | null;
}

function durFromText(t: string | null): number {
  const m = String(t ?? "").match(/\d+/);
  return m ? +m[0] : 50;
}

/** Componentes de parede (SP) de um ISO UTC → { date:'YYYY-MM-DD', time:'HH:MM' }. */
export function spDateTimeParts(iso: string): { date: string; time: string } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: SP, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = {};
  for (const x of f.formatToParts(new Date(iso))) p[x.type] = x.value;
  const hh = p.hour === "24" ? "00" : p.hour;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hh}:${p.minute}` };
}

/** Monta um ISO UTC a partir de data (YYYY-MM-DD) + hora (HH:MM) interpretadas em SP (UTC−3). */
export function buildIsoSP(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) + 3 * 3600 * 1000).toISOString();
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editData?: AppointmentRow | null;
  defaultDate?: string; // YYYY-MM-DD
  onSaved: () => void;
}

export default function AgendaEventDialog({ open, onOpenChange, editData, defaultDate, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patient, setPatient] = useState<SelectedPatient | null>(null);
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("09:00");
  const [duration, setDuration] = useState(50);
  const [modality, setModality] = useState("online");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("agendado");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editData) {
      const { date, time } = spDateTimeParts(editData.starts_at);
      setDateStr(date); setTimeStr(time);
      setDuration(editData.duration_min || 50);
      setModality(editData.modality || "online");
      setLink(editData.meeting_link ?? "");
      setNotes(editData.notes ?? "");
      setStatus(editData.status || "agendado");
      // carrega o paciente p/ o seletor
      if (editData.patient_id) {
        sb.from("patients")
          .select("id, full_name, initials, approach, default_session_duration, default_session_type, total_sessions, last_session_at, openai_thread_id")
          .eq("id", editData.patient_id).maybeSingle()
          .then(({ data }: any) => setPatient(data ?? null));
      } else {
        setPatient(null);
      }
    } else {
      setPatient(null);
      setDateStr(defaultDate || spDateTimeParts(new Date().toISOString()).date);
      setTimeStr("09:00"); setDuration(50); setModality("online");
      setLink(""); setNotes(""); setStatus("agendado");
    }
  }, [open, editData, defaultDate]);

  // Pré-preenche a duração com o default do paciente selecionado (em novo agendamento).
  useEffect(() => {
    if (patient && !editData) setDuration(durFromText(patient.default_session_duration));
  }, [patient, editData]);

  const handleSave = async () => {
    if (!user) return;
    if (!dateStr || !timeStr) {
      toast({ title: "Data e hora são obrigatórias", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const row = {
        user_id: user.id,
        patient_id: patient?.id ?? null,
        patient_initials: patient?.initials ?? editData?.patient_initials ?? null,
        starts_at: buildIsoSP(dateStr, timeStr),
        duration_min: Number(duration) || 50,
        modality,
        meeting_link: link.trim() || null,
        notes: notes.trim() || null,
        status,
      };
      if (editData?.id) {
        const { error } = await sb.from("appointments")
          .update({ ...row, atualizado_em: new Date().toISOString() }).eq("id", editData.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("appointments").insert(row);
        if (error) throw error;
      }
      toast({ title: editData ? "Compromisso atualizado" : "Compromisso agendado" });
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <PatientSelector value={patient} onChange={setPatient} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min={10} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={modality} onValueChange={setModality}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Link da reunião</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet..." />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="faltou">Faltou</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button variant="cta" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editData ? "Salvar" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
