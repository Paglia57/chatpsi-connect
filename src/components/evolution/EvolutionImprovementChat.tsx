import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, Send, Sparkles, Loader2, X, AudioLines } from "lucide-react";
import { toast } from "sonner";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { useEvolutionImprovement } from "@/hooks/useEvolutionImprovement";

type TurnStatus = "applying" | "done" | "error";

interface Turn {
  id: string;
  prompt: string;
  type: "text" | "audio";
  status: TurnStatus;
  timestamp: string;
  version?: number;
  errorMessage?: string;
}

interface EvolutionImprovementChatProps {
  evolutionContent: string;
  onContentUpdate: (newContent: string) => void;
  onApplied?: () => void;
  evolutionId?: string;
}

const PLACEHOLDER_TEXT =
  "Ex.: 'Detalhe melhor o estado mental', 'Reescreva a conduta em tom mais formal', 'Adicione uma seção sobre medicação'";

export default function EvolutionImprovementChat({
  evolutionContent,
  onContentUpdate,
  onApplied,
  evolutionId,
}: EvolutionImprovementChatProps) {
  const [promptText, setPromptText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const { improve, isLoading } = useEvolutionImprovement();
  const {
    state: recordingState,
    duration,
    formatDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    destroy: destroyAudio,
  } = useAudioRecording();

  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  useEffect(() => {
    return () => {
      destroyAudio();
    };
  }, [destroyAudio]);

  const isRecording = recordingState === "recording";
  const isRequestingPerm = recordingState === "requesting-permission";
  const isProcessingAudio = recordingState === "processing";
  const canInteract = !isLoading && !isRecording && !isRequestingPerm && !isProcessingAudio;

  const appendTurn = (turn: Turn) => {
    setTurns(prev => [...prev, turn]);
  };

  const updateTurn = (id: string, patch: Partial<Turn>) => {
    setTurns(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const runImprovement = async (params: {
    promptText?: string;
    audioFile?: File;
    type: "text" | "audio";
    displayText: string;
  }) => {
    const turnId = crypto.randomUUID();
    const turn: Turn = {
      id: turnId,
      prompt: params.displayText,
      type: params.type,
      status: "applying",
      timestamp: new Date().toISOString(),
    };
    appendTurn(turn);

    try {
      const finalText = await improve(
        {
          currentContent: evolutionContent,
          promptText: params.promptText,
          audioFile: params.audioFile,
          evolutionId,
        },
        (partial) => onContentUpdate(partial)
      );
      onContentUpdate(finalText);
      updateTurn(turnId, {
        status: "done",
        version: turns.filter(t => t.status === "done").length + 2,
      });
      toast.success("Prontuário atualizado");
      onApplied?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível aplicar a melhoria";
      updateTurn(turnId, { status: "error", errorMessage: message });
      toast.error(message);
    }
  };

  const handleSendText = async () => {
    const trimmed = promptText.trim();
    if (!trimmed || !canInteract) return;
    setPromptText("");
    await runImprovement({
      promptText: trimmed,
      type: "text",
      displayText: trimmed,
    });
  };

  const handleMicClick = async () => {
    if (isRecording) {
      const result = await stopRecording();
      if (!result) return;
      const seconds = formatDuration(result.duration);
      await runImprovement({
        audioFile: result.file,
        type: "audio",
        displayText: `Áudio (${seconds})`,
      });
      return;
    }
    if (isRequestingPerm || isProcessingAudio) return;
    const started = await startRecording();
    if (!started) {
      toast.error("Não foi possível iniciar a gravação");
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
    toast.info("Gravação descartada");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Refinar com IA
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Envie instruções por texto ou áudio para a IA reescrever o prontuário mantendo a estrutura clínica.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {turns.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {turns.map((turn) => (
              <div
                key={turn.id}
                className="rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {turn.type === "audio" ? (
                        <AudioLines className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(turn.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                      {turn.prompt}
                    </p>
                    {turn.status === "error" && turn.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{turn.errorMessage}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {turn.status === "applying" && (
                      <Badge variant="secondary" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Aplicando
                      </Badge>
                    )}
                    {turn.status === "done" && (
                      <Badge variant="default" className="gap-1">
                        Aplicada{turn.version ? ` v${turn.version}` : ""}
                      </Badge>
                    )}
                    {turn.status === "error" && (
                      <Badge variant="destructive">Erro</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={listEndRef} />
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <Mic className="h-5 w-5 text-destructive animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Gravando...</p>
              <p className="text-xs text-muted-foreground">{formatDuration(duration)}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelRecording}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              variant="cta"
              size="sm"
              onClick={handleMicClick}
            >
              <Send className="h-4 w-4" />
              Enviar áudio
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDER_TEXT}
              disabled={!canInteract}
              className="min-h-[64px] resize-none text-sm"
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleMicClick}
                disabled={isLoading || isProcessingAudio}
                title="Gravar áudio"
              >
                {isRequestingPerm || isProcessingAudio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                variant="cta"
                size="icon"
                onClick={handleSendText}
                disabled={!canInteract || !promptText.trim()}
                title="Enviar"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
