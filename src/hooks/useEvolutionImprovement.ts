import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ImprovementPromptType = "text" | "audio";

export interface ImproveParams {
  currentContent: string;
  promptText?: string;
  audioFile?: File;
  evolutionId?: string;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useEvolutionImprovement() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const improve = useCallback(
    async (
      params: ImproveParams,
      onDelta: (partial: string) => void
    ): Promise<string> => {
      const { currentContent, promptText, audioFile, evolutionId } = params;

      if (!currentContent?.trim()) {
        throw new Error("Prontuário atual está vazio");
      }
      if (!promptText?.trim() && !audioFile) {
        throw new Error("Envie um prompt de texto ou áudio");
      }

      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const sessionRes = await supabase.auth.getSession();
        const token = sessionRes.data.session?.access_token;
        if (!token) throw new Error("Sessão expirada");

        const promptType: ImprovementPromptType = audioFile ? "audio" : "text";
        let audioBase64: string | null = null;
        let audioFilename: string | null = null;

        if (audioFile) {
          audioBase64 = await fileToBase64(audioFile);
          audioFilename = audioFile.name;
        }

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/improve-evolution`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              evolution_content: currentContent,
              improvement_prompt: promptText || null,
              prompt_type: promptType,
              audio_base64: audioBase64,
              audio_filename: audioFilename,
              evolution_id: evolutionId || null,
            }),
            signal: controller.signal,
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
                onDelta(fullText);
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }

        if (buffer.trim()) {
          for (const raw of buffer.split("\n")) {
            if (!raw.startsWith("data: ")) continue;
            const j = raw.slice(6).trim();
            if (j === "[DONE]") continue;
            try {
              const p = JSON.parse(j);
              const c = p.choices?.[0]?.delta?.content;
              if (c) {
                fullText += c;
                onDelta(fullText);
              }
            } catch {
              // skip malformed final chunk
            }
          }
        }

        if (!fullText.trim()) {
          throw new Error("Resposta vazia do modelo");
        }

        return fullText;
      } catch (err) {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        const message = isAbort
          ? "Geração cancelada"
          : err instanceof Error
            ? err.message
            : "Falha ao aplicar melhoria";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { improve, cancel, isLoading, error };
}
