import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Search, FileText, CheckCircle, Mic, Upload, X, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

const DURATIONS = ["30min", "40min", "50min", "60min"];
const SESSION_TYPES = ["Presencial", "Online"];
const ACCEPTED_AUDIO = ".mp3,.m4a,.wav,.ogg,.webm";
const LOADING_STEPS = [
  { icon: Search, text: "Analisando suas anotações..." },
  { icon: FileText, text: "Estruturando a evolução clínica..." },
  { icon: CheckCircle, text: "Aplicando formato profissional..." },
];

interface CreatedPatient {
  id: string;
  full_name: string;
  initials: string;
  approach: string;
}

interface StepEvolutionProps {
  selectedApproach: string;
  createdPatient: CreatedPatient | null;
  onNext: (evolutionContent: string) => void;
  onSkip: () => void;
}

export default function StepEvolution({ selectedApproach, createdPatient, onNext, onSkip }: StepEvolutionProps) {
  const { user } = useAuth();
  const [sessionNumber, setSessionNumber] = useState('1');
  const [sessionDuration, setSessionDuration] = useState('50min');
  const [sessionType, setSessionType] = useState('Presencial');
  const [textContent, setTextContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [activeTab, setActiveTab] = useState('text');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recording = useAudioRecording();

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingTextIdx(prev => (prev + 1) % LOADING_STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const canSubmit =
    (activeTab === 'text' && textContent.trim().length >= 10) ||
    (activeTab === 'audio' && audioFile !== null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(mp3|m4a|wav|ogg|webm)$/i.test(file.name)) {
      setAudioFile(file);
    }
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:...;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!user || !canSubmit) {
      toast.error(activeTab === 'text'
        ? 'Descreva o que aconteceu na sessão (mínimo 10 caracteres)'
        : 'Selecione um arquivo de áudio');
      return;
    }
    setIsGenerating(true);
    setLoadingTextIdx(0);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      let body: Record<string, any> = {
        approach: selectedApproach,
        patient_initials: createdPatient?.initials || 'Paciente',
        session_number: sessionNumber ? parseInt(sessionNumber) : null,
        session_duration: sessionDuration,
        session_type: sessionType,
        patient_id: createdPatient?.id || null,
      };

      if (activeTab === 'audio' && audioFile) {
        const base64 = await fileToBase64(audioFile);
        body = {
          ...body,
          input_type: 'audio',
          audio_base64: base64,
          audio_filename: audioFile.name,
        };
      } else {
        body = {
          ...body,
          input_type: 'text',
          input_content: textContent,
        };
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-evolution`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }
      if (!resp.body) throw new Error('Sem resposta do servidor');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullText += delta;
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        for (const raw of buffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const j = raw.slice(6).trim();
          if (j === '[DONE]') continue;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {}
        }
      }

      if (!fullText) throw new Error('Nenhum conteúdo gerado');

      // Save evolution
      await supabase.from('evolutions').insert({
        user_id: user.id,
        patient_initials: createdPatient?.initials || 'Paciente',
        session_number: sessionNumber ? parseInt(sessionNumber) : null,
        session_duration: sessionDuration,
        session_type: sessionType,
        approach: selectedApproach,
        input_type: activeTab,
        input_content: activeTab === 'text' ? textContent : audioFile?.name || '',
        output_content: fullText,
        patient_id: createdPatient?.id || null,
      });

      // Update onboarding step
      await supabase.from('profiles').update({ onboarding_step: 3 }).eq('user_id', user.id);

      onNext(fullText);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao gerar evolução');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground font-playfair">Gere sua primeira evolução clínica</h2>
        <p className="text-muted-foreground">Descreva brevemente o que aconteceu na sessão. A IA faz o resto.</p>
      </div>

      {createdPatient && (
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            Paciente: {createdPatient.full_name} ✓
          </Badge>
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            Abordagem: {selectedApproach} ✓
          </Badge>
        </div>
      )}

      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Número da sessão</Label>
              <Input type="number" value={sessionNumber} onChange={e => setSessionNumber(e.target.value)} placeholder="1" min={1} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duração</Label>
              <Select value={sessionDuration} onValueChange={setSessionDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SESSION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="text" className="flex-1">Texto</TabsTrigger>
              <TabsTrigger value="audio" className="flex-1">Áudio</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-3">
              <div className="space-y-1.5">
                <Label>Anotações da sessão</Label>
                <AutoTextarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Ex: Paciente relatou dificuldade com insônia e ansiedade. Trabalhamos técnicas de reestruturação cognitiva sobre pensamentos catastróficos..."
                  minRows={6}
                  maxRows={14}
                />
              </div>
            </TabsContent>

            <TabsContent value="audio" className="mt-3">
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
              ) : recording.state === 'recording' ? (
                <div className="border border-primary/30 bg-primary/5 rounded-lg p-6 space-y-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
                      <Mic className="h-6 w-6 text-destructive" />
                    </div>
                    <p className="text-lg font-medium text-foreground font-mono">{recording.formatDuration(recording.duration)}</p>
                    <p className="text-xs text-muted-foreground">Gravando áudio da sessão...</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={() => { recording.cancelRecording(); }}>
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button variant="cta" size="sm" onClick={async () => {
                      const result = await recording.stopRecording();
                      if (result) setAudioFile(result.file);
                    }}>
                      <Square className="h-4 w-4 mr-1" /> Parar gravação
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-20 flex-col gap-2"
                      onClick={async () => { await recording.startRecording(); }}
                    >
                      <Mic className="h-6 w-6 text-primary" />
                      <span className="text-sm">Gravar áudio</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-20 flex-col gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm">Enviar arquivo</span>
                    </Button>
                  </div>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                      isDragging ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">
                      Ou arraste um arquivo de áudio aqui — .mp3, .m4a, .wav, .ogg, .webm (até 15MB)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_AUDIO}
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 15 * 1024 * 1024) {
                          toast.error('Arquivo muito grande. Limite de 15MB para áudio.');
                          return;
                        }
                        setAudioFile(file);
                      }
                    }}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isGenerating ? (
        <Card className="rounded-2xl shadow-md border">
          <CardContent className="p-6 flex flex-col items-center space-y-5">
            {(() => {
              const step = LOADING_STEPS[loadingTextIdx];
              const Icon = step.icon;
              return (
                <div key={loadingTextIdx} className="flex flex-col items-center gap-3 animate-fade-in">
                  <Icon className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium text-foreground">{step.text}</p>
                </div>
              );
            })()}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-primary rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="cta" className="w-full" size="lg" onClick={handleGenerate} disabled={!canSubmit}>
          <Sparkles className="h-4 w-4" />
          Gerar evolução clínica
        </Button>
      )}
    </div>
  );
}
