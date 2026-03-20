import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

const APPROACHES = [
  "TCC (Terapia Cognitivo-Comportamental)",
  "Psicanálise",
  "Humanista",
  "Comportamental",
  "Sistêmica",
  "Gestalt",
  "Psicodrama",
  "Outra",
];
const DURATIONS = ["30min", "40min", "50min", "60min"];
const SESSION_TYPES = ["Presencial", "Online"];
const FREQUENCIES = ["Semanal", "Quinzenal", "Mensal"];
const GENDERS = ["Feminino", "Masculino", "Não-binário", "Outro", "Prefere não informar"];

export interface PatientData {
  id?: string;
  full_name: string;
  initials: string;
  date_of_birth: string;
  gender: string;
  approach: string;
  main_complaint: string;
  cid_10: string;
  dsm_5: string;
  medication: string;
  notes: string;
  default_session_duration: string;
  default_session_type: string;
  session_day_time: string;
  session_frequency: string;
  status: string;
}

const emptyPatient: PatientData = {
  full_name: "",
  initials: "",
  date_of_birth: "",
  gender: "",
  approach: "",
  main_complaint: "",
  cid_10: "",
  dsm_5: "",
  medication: "",
  notes: "",
  default_session_duration: "",
  default_session_type: "",
  session_day_time: "",
  session_frequency: "",
  status: "active",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: PatientData | null;
  onSaved: () => void;
}

export default function PatientFormDialog({ open, onOpenChange, editData, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<PatientData>(emptyPatient);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editData ? { ...editData } : { ...emptyPatient });
    }
  }, [open, editData]);

  const set = (key: keyof PatientData, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  // Auto-suggest initials from name
  useEffect(() => {
    if (!editData && form.full_name) {
      const suggested = form.full_name
        .split(" ")
        .filter(Boolean)
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5);
      setForm(prev => ({ ...prev, initials: suggested }));
    }
  }, [form.full_name, editData]);

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_name.trim() || !form.initials.trim()) {
      toast.error("Nome e iniciais são obrigatórios");
      return;
    }
    setSaving(true);

    try {
      if (editData?.id) {
        // Update
        const { error } = await supabase
          .from("patients")
          .update({
            full_name: form.full_name,
            initials: form.initials,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            approach: form.approach || null,
            main_complaint: form.main_complaint || null,
            cid_10: form.cid_10 || null,
            dsm_5: form.dsm_5 || null,
            medication: form.medication || null,
            notes: form.notes || null,
            default_session_duration: form.default_session_duration || null,
            default_session_type: form.default_session_type || null,
            session_day_time: form.session_day_time || null,
            session_frequency: form.session_frequency || null,
            status: form.status,
          })
          .eq("id", editData.id);
        if (error) throw error;
        toast.success("Paciente atualizado!");
      } else {
        // Insert
        const { data: inserted, error } = await supabase
          .from("patients")
          .insert({
            user_id: user.id,
            full_name: form.full_name,
            initials: form.initials,
            date_of_birth: form.date_of_birth || null,
            gender: form.gender || null,
            approach: form.approach || null,
            main_complaint: form.main_complaint || null,
            cid_10: form.cid_10 || null,
            dsm_5: form.dsm_5 || null,
            medication: form.medication || null,
            notes: form.notes || null,
            default_session_duration: form.default_session_duration || null,
            default_session_type: form.default_session_type || null,
            session_day_time: form.session_day_time || null,
            session_frequency: form.session_frequency || null,
            status: form.status,
          })
          .select("id")
          .single();
        if (error) throw error;

        // Create OpenAI Thread
        try {
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          if (token && inserted) {
            const resp = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-patient-thread`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  patient_name: form.full_name,
                  patient_initials: form.initials,
                  approach: form.approach,
                  main_complaint: form.main_complaint,
                  cid_10: form.cid_10,
                  dsm_5: form.dsm_5,
                  medication: form.medication,
                  notes: form.notes,
                }),
              }
            );
            if (resp.ok) {
              const { thread_id, assistant_id } = await resp.json();
              await supabase
                .from("patients")
                .update({ openai_thread_id: thread_id, openai_assistant_id: assistant_id })
                .eq("id", inserted.id);
            } else {
              console.error("Thread creation failed:", resp.status);
              toast.warning("Paciente salvo, mas o contexto de IA será criado na próxima evolução");
            }
          }
        } catch (threadErr) {
          console.error("Thread error:", threadErr);
          toast.warning("Paciente salvo, mas o contexto de IA será criado na próxima evolução");
        }

        toast.success("Paciente cadastrado com sucesso!");
      }

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{editData?.id ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Identification */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Dados de Identificação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Nome completo do paciente" />
              </div>
              <div className="space-y-2">
                <Label>Iniciais *</Label>
                <Input value={form.initials} onChange={e => set("initials", e.target.value.toUpperCase().slice(0, 5))} placeholder="Ex: JSM" maxLength={5} />
              </div>
              <div className="space-y-2">
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select value={form.gender} onValueChange={v => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Clinical */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Dados Clínicos</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Abordagem terapêutica</Label>
                <Select value={form.approach} onValueChange={v => set("approach", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a abordagem" /></SelectTrigger>
                  <SelectContent>
                    {APPROACHES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Queixa principal / motivo do tratamento</Label>
                <Textarea value={form.main_complaint} onChange={e => set("main_complaint", e.target.value)} placeholder="Ex: Ansiedade generalizada, dificuldade de relacionamento" rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Diagnóstico CID-11</Label>
                  <Input value={form.cid_10} onChange={e => set("cid_10", e.target.value)} placeholder="Ex: F41.1" />
                </div>
                <div className="space-y-2">
                  <Label>Diagnóstico DSM-5-TR</Label>
                  <Input value={form.dsm_5} onChange={e => set("dsm_5", e.target.value)} placeholder="Ex: 300.02" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Medicação em uso</Label>
                <Textarea value={form.medication} onChange={e => set("medication", e.target.value)} placeholder="Ex: Sertralina 50mg" rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Observações gerais</Label>
                <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Observações relevantes" rows={2} />
              </div>
            </div>
          </div>

          {/* Session config */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Configurações da Sessão</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia e horário habitual</Label>
                <Input value={form.session_day_time} onChange={e => set("session_day_time", e.target.value)} placeholder="Ex: Terças 14h" />
              </div>
              <div className="space-y-2">
                <Label>Duração padrão</Label>
                <Select value={form.default_session_duration} onValueChange={v => set("default_session_duration", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de atendimento</Label>
                <Select value={form.default_session_type} onValueChange={v => set("default_session_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select value={form.session_frequency} onValueChange={v => set("session_frequency", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button variant="cta" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editData?.id ? "Salvar Alterações" : "Cadastrar Paciente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
