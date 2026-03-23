import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Mic, Upload, X, Loader2, Lock } from "lucide-react";
import PatientSelector, { type SelectedPatient } from "@/components/patients/PatientSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

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

interface EvolutionInputProps {
  onGenerate: (data: {
    approach: string;
    patient_initials: string;
    session_number: number | null;
    session_duration: string;
    session_type: string;
    input_type: "audio" | "text";
    input_content: string;
    audio_file?: File;
    patient_id?: string;
  }) => void;
  isLoading: boolean;
  trialReached?: boolean;
}

export default function EvolutionInput({ onGenerate, isLoading, trialReached }: EvolutionInputProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);
  const [avulsoMode, setAvulsoMode] = useState(false);

  const [approach, setApproach] = useState("");
  const [patientInitials, setPatientInitials] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [sessionDuration, setSessionDuration] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [activeTab, setActiveTab] = useState("text");
  const [textContent, setTextContent] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_AUDIO = ".mp3,.m4a,.wav,.ogg,.webm";

  useEffect(() => {
    const patientId = searchParams.get("patient");
    if (patientId && user) {
      supabase
        .from("patients")
        .select("id, full_name, initials, approach, default_session_duration, default_session_type, total_sessions, last_session_at, openai_thread_id")
        .eq("id", patientId)
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedPatient(data);
            setAvulsoMode(false);
          }
        });
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (selectedPatient) {
      if (selectedPatient.approach) setApproach(selectedPatient.approach);
      if (selectedPatient.default_session_duration) setSessionDuration(selectedPatient.default_session_duration);
      if (selectedPatient.default_session_type) setSessionType(selectedPatient.default_session_type);
      setSessionNumber(String((selectedPatient.total_sessions || 0) + 1));
      setPatientInitials(selectedPatient.initials);
    }
  }, [selectedPatient]);

  const canSubmit =
    (selectedPatient || (avulsoMode && patientInitials.trim())) &&
    ((activeTab === "text" && textContent.trim().length > 10) ||
      (activeTab === "audio" && audioFile));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(mp3|m4a|wav|ogg|webm)$/i.test(file.name)) {
      setAudioFile(file);
    }
  }, []);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onGenerate({
      approach,
      patient_initials: selectedPatient ? selectedPatient.initials : patientInitials,
      session_number: sessionNumber ? parseInt(sessionNumber) : null,
      session_duration: sessionDuration,
      session_type: sessionType,
      input_type: activeTab as "audio" | "text",
      input_content: activeTab === "text" ? textContent : "",
      audio_file: audioFile || undefined,
      patient_id: selectedPatient?.id,
    });
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setApproach("");
    setPatientInitials("");
    setSessionNumber("");
    setSessionDuration("");
    setSessionType("");
  };

  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-xl text-foreground">Nova Evolução Clínica</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Patient selector with Switch toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">Paciente *</Label>
            <div className="flex items-center gap-2">
              <Label htmlFor="avulso-switch" className="text-xs text-muted-foreground cursor-pointer">
                Sem paciente cadastrado
              </Label>
              <Switch
                id="avulso-switch"
                checked={avulsoMode}
                onCheckedChange={(checked) => {
                  setAvulsoMode(checked);
                  if (checked) handleClearPatient();
                }}
              />
            </div>
          </div>
          {avulsoMode ? (
            <div className="space-y-1.5">
              <Input
                value={patientInitials}
                onChange={e => setPatientInitials(e.target.value)}
                placeholder="Nome ou iniciais do paciente (ex: J.S.)"
              />
              <p className="text-xs text-muted-foreground">Evoluções sem paciente cadastrado não acumulam contexto na IA</p>
            </div>
          ) : (
            <PatientSelector value={selectedPatient} onChange={(p) => {
              setSelectedPatient(p);
              if (!p) handleClearPatient();
            }} />
          )}
        </div>

        {/* Approach */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Abordagem terapêutica</Label>
          <Select value={approach} onValueChange={setApproach}>
            <SelectTrigger><SelectValue placeholder="Selecione a abordagem" /></SelectTrigger>
            <SelectContent>
              {APPROACHES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Session info - shorter labels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-medium text-foreground">Nº sessão</Label>
            <Input
              type="number"
              value={sessionNumber}
              onChange={e => setSessionNumber(e.target.value)}
              placeholder="Ex: 12"
              min={1}
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-medium text-foreground">Duração</Label>
            <Select value={sessionDuration} onValueChange={setSessionDuration}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-0">
            <Label className="text-sm font-medium text-foreground">Tipo</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Input tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1">Anotações em Texto</TabsTrigger>
            <TabsTrigger value="audio" className="flex-1">Áudio da Sessão</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4">
            <div className="relative">
              <AutoTextarea
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                placeholder="Descreva o que aconteceu na sessão: queixas do paciente, temas abordados, intervenções realizadas, observações clínicas, humor, comportamento observado..."
                minRows={8}
                maxRows={20}
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {textContent.length} caracteres
              </span>
            </div>
          </TabsContent>

          <TabsContent value="audio" className="mt-4">
            {audioFile ? (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mic className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{audioFile.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setAudioFile(null)} className="h-7 w-7 shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <audio controls src={URL.createObjectURL(audioFile)} className="w-full" />
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? "border-primary bg-primary-light" : "border-border hover:border-muted-foreground"
                }`}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Arraste o áudio da sessão aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: .mp3, .m4a, .wav, .ogg, .webm — até 200MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_AUDIO}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) setAudioFile(file);
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Submit */}
        {trialReached ? (
          <Button
            variant="cta"
            className="w-full"
            asChild
          >
            <a href="https://wa.me/5511942457454?text=Olá!%20Quero%20assinar%20o%20ChatPsi" target="_blank" rel="noopener noreferrer">
              <Lock className="h-4 w-4" />
              Assinar para continuar gerando
            </a>
          </Button>
        ) : (
          <Button
            variant="cta"
            className="w-full"
            onClick={handleSubmit}
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando evolução...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Evolução
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
