import { useState, useRef } from "react";
import EvolutionInput from "@/components/evolution/EvolutionInput";
import EvolutionOutput from "@/components/evolution/EvolutionOutput";
import AppBreadcrumb from "@/components/ui/AppBreadcrumb";
import FirstTimeGuide from "@/components/ui/FirstTimeGuide";
import TrialLimitBanner from "@/components/ui/TrialLimitBanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTrialLimit } from "@/hooks/useTrialLimit";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { FileText } from "lucide-react";

export default function EvolutionPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { tourActive } = (useOutletContext<{ tourActive?: boolean }>() || {});
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [evolutionContent, setEvolutionContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastParamsRef = useRef<any>(null);
  const trial = useTrialLimit("evolutions", 2);

  const handleGenerate = async (data: {
    approach: string;
    patient_initials: string;
    session_number: number | null;
    session_duration: string;
    session_type: string;
    input_type: "audio" | "text";
    input_content: string;
    audio_file?: File;
    patient_id?: string;
  }) => {
    if (!user) return;
    setIsGenerating(true);
    setEvolutionContent("");
    lastParamsRef.current = data;

    try {
      let inputContent = data.input_content;
      let audioBase64: string | null = null;
      let audioFilename: string | null = null;

      if (data.input_type === "audio" && data.audio_file) {
        const arrayBuffer = await data.audio_file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioBase64 = btoa(binary);
        audioFilename = data.audio_file.name;
      }

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-evolution`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            input_type: data.input_type,
            input_content: inputContent,
            approach: data.approach,
            patient_initials: data.patient_initials,
            session_number: data.session_number,
            session_duration: data.session_duration,
            session_type: data.session_type,
            audio_base64: audioBase64,
            audio_filename: audioFilename,
            patient_id: data.patient_id || null,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta do servidor");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              setEvolutionContent(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw || !raw.startsWith("data: ")) continue;
          const j = raw.slice(6).trim();
          if (j === "[DONE]") continue;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              fullText += c;
              setEvolutionContent(fullText);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao gerar evolução");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (lastParamsRef.current) {
      handleGenerate(lastParamsRef.current);
    }
  };

  const handleSave = async (content: string) => {
    if (!user || !lastParamsRef.current) return;
    setIsSaving(true);
    try {
      const params = lastParamsRef.current;
      const { error } = await supabase.from("evolutions").insert({
        user_id: user.id,
        patient_initials: params.patient_initials,
        session_number: params.session_number,
        session_duration: params.session_duration,
        session_type: params.session_type,
        approach: params.approach,
        input_type: params.input_type,
        input_content: params.input_content,
        output_content: content,
        patient_id: params.patient_id || null,
      });
      if (error) throw error;
      toast.success("Evolução salva com sucesso!");
      trial.refetch();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-tour="page-evolution">
      <AppBreadcrumb items={[
        { label: "Clínica", href: "/app/evolucao" },
        { label: "Evolução", href: "/app/evolucao" },
        { label: "Nova Evolução" },
      ]} />
      {!guideDismissed && (!(profile?.seen_guides as any)?.evolution || tourActive) ? (
        <FirstTimeGuide
          guideKey="evolution"
          icon={<FileText className="h-8 w-8 text-primary" />}
          title="Evolução Clínica com IA"
          description="Gere evoluções estruturadas a partir de texto ou áudio das suas sessões."
          tips={[
            "Envie anotações em texto ou grave/envie áudio da sessão",
            "Selecione o paciente para contextualizar a evolução automaticamente",
            "O texto gerado é editável — ajuste antes de salvar",
          ]}
          examples={[
            "Sessão de TCC com foco em reestruturação cognitiva",
            "Paciente relatou melhora nos sintomas de ansiedade",
            "Trabalhamos técnicas de regulação emocional",
          ]}
          ctaText="Entendi, criar uma evolução!"
          onDismiss={async () => {
            setGuideDismissed(true);
            if (user && !tourActive) {
              const current = (profile?.seen_guides as any) || {};
              await supabase.from('profiles').update({ seen_guides: { ...current, evolution: true } }).eq('user_id', user.id);
              await refreshProfile();
            }
          }}
          onExampleClick={(text) => {
            setGuideDismissed(true);
            if (user && !tourActive) {
              const current = (profile?.seen_guides as any) || {};
              supabase.from('profiles').update({ seen_guides: { ...current, evolution: true } }).eq('user_id', user.id).then(() => refreshProfile());
            }
          }}
        />
      ) : (
        <EvolutionInput onGenerate={handleGenerate} isLoading={isGenerating} />
      )}
      {(evolutionContent || isGenerating) && (
        <EvolutionOutput
          content={evolutionContent}
          isLoading={isGenerating}
          onRegenerate={handleRegenerate}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
