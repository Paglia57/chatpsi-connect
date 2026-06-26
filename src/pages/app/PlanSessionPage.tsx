import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RefreshCw, Info } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

interface Fields {
  objetivo: string; roteiro: string; tecnicas: string; atencao: string; perguntas: string; livre: string;
}
const EMPTY: Fields = { objetivo: "", roteiro: "", tecnicas: "", atencao: "", perguntas: "", livre: "" };

const FIELD_DEFS: { key: keyof Fields; label: string; rows: number; hint?: string }[] = [
  { key: "objetivo", label: "Objetivo da sessão", rows: 3 },
  { key: "roteiro", label: "Roteiro (abertura · miolo · fechamento)", rows: 6 },
  { key: "tecnicas", label: "Técnicas / materiais sugeridos", rows: 6 },
  { key: "atencao", label: "Pontos de atenção", rows: 4 },
  { key: "perguntas", label: "Perguntas-chave", rows: 4 },
  { key: "livre", label: "Espaço livre (suas anotações)", rows: 4, hint: "Campo do psicólogo — não é gerado pela IA." },
];

const PlanSessionPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patient");
  const appointmentId = searchParams.get("appointment");

  const [patientName, setPatientName] = useState("");
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [direction, setDirection] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async (dir?: string) => {
    if (!patientId) return;
    setGenerating(true);
    try {
      const { data, error } = await sb.functions.invoke("plan-session", {
        body: { patient_id: patientId, direction: dir ?? undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFields((prev) => ({
        objetivo: data.objetivo ?? "", roteiro: data.roteiro ?? "", tecnicas: data.tecnicas ?? "",
        atencao: data.atencao ?? "", perguntas: data.perguntas ?? "", livre: prev.livre,
      }));
      setGenerated(true);
    } catch (e: any) {
      toast({ title: "Erro ao gerar o plano", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [patientId, toast]);

  useEffect(() => {
    if (!patientId || !user) return;
    sb.from("patients").select("full_name").eq("id", patientId).eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => setPatientName(data?.full_name ?? ""));
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, user]);

  const set = (key: keyof Fields, v: string) => setFields((f) => ({ ...f, [key]: v }));

  const handleSave = async () => {
    if (!user || !patientId) return;
    setSaving(true);
    try {
      const { error } = await sb.from("session_plans").insert({
        user_id: user.id,
        patient_id: patientId,
        appointment_id: appointmentId || null,
        objetivo: fields.objetivo, roteiro: fields.roteiro, tecnicas: fields.tecnicas,
        atencao: fields.atencao, perguntas: fields.perguntas, livre: fields.livre,
        input_type: direction.trim() ? "texto" : null,
        input_content: direction.trim() || null,
        status: "salvo",
      });
      if (error) throw error;
      toast({ title: "Plano salvo", description: "Disponível na próxima evolução deste paciente." });
      navigate(patientId ? `/app/pacientes/${patientId}` : "/app/agenda");
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!patientId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <AppBreadcrumb items={[{ label: "Planejar sessão" }]} />
        <Alert><Info className="h-4 w-4" /><AlertDescription>Abra o planejamento a partir de um paciente ou da agenda.</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <AppBreadcrumb items={[{ label: "Pacientes", href: "/app/pacientes" }, { label: "Planejar sessão" }]} />

      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-1">Planejar sessão{patientName ? ` — ${patientName}` : ""}</h1>
        <p className="text-muted-foreground">Rascunho gerado pela IA a partir do histórico. É uma sugestão — edite livremente.</p>
      </div>

      <div className="mb-6 rounded-lg border p-3">
        <Label className="text-sm">Direcionamento (opcional)</Label>
        <div className="flex gap-2 mt-2">
          <Input placeholder="Ex.: focar na ansiedade no trabalho" value={direction} onChange={(e) => setDirection(e.target.value)} />
          <Button variant="outline" onClick={() => generate(direction || undefined)} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Regenerar</span>
          </Button>
        </div>
      </div>

      {generating && !generated ? (
        <div className="space-y-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : (
        <div className="space-y-4">
          {FIELD_DEFS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>{f.label}</Label>
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              <Textarea rows={f.rows} value={fields[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>Cancelar</Button>
            <Button variant="cta" onClick={handleSave} disabled={saving || generating}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar plano
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanSessionPage;
