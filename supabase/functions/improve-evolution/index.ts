import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getPersona } from "../_shared/personas/resolve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// O system prompt agora vem do sistema de personas (getPersona("prontuario_refinar")).
// Cópia-base de fallback em supabase/functions/_shared/personas/baseline.ts.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      evolution_content,
      improvement_prompt,
      prompt_type,
      audio_base64,
      audio_filename,
      evolution_id,
    } = await req.json();

    if (!evolution_content || !prompt_type) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios não fornecidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prompt_type === "text" && !improvement_prompt) {
      return new Response(JSON.stringify({ error: "Prompt de melhoria vazio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prompt_type === "audio" && !audio_base64) {
      return new Response(JSON.stringify({ error: "Áudio não fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave da OpenAI não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalPromptText = improvement_prompt || "";

    if (prompt_type === "audio" && audio_base64) {
      console.log("Transcribing improvement audio with Whisper...");
      const binaryString = atob(audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const filename = audio_filename || "audio.webm";
      const ext = filename.split(".").pop()?.toLowerCase() || "webm";
      const mimeMap: Record<string, string> = {
        mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", webm: "audio/webm",
      };

      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: mimeMap[ext] || "audio/webm" }), filename);
      formData.append("model", "whisper-1");
      formData.append("language", "pt");
      formData.append("response_format", "text");

      const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });

      if (!whisperResp.ok) {
        const errText = await whisperResp.text();
        console.error("Whisper error:", whisperResp.status, errText);
        return new Response(JSON.stringify({ error: "Erro na transcrição do áudio: " + whisperResp.status }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      finalPromptText = (await whisperResp.text()).trim();
      console.log("Improvement transcription completed, length:", finalPromptText.length);
    }

    if (!finalPromptText.trim()) {
      return new Response(JSON.stringify({ error: "Não foi possível identificar a solicitação de melhoria" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `PRONTUÁRIO ATUAL:
${evolution_content}

---

SOLICITAÇÃO DE MELHORIA DO PROFISSIONAL:
${finalPromptText}

Reescreva o prontuário aplicando a melhoria solicitada. MANTENHA OBRIGATORIAMENTE a estrutura completa (cabeçalhos IDENTIFICAÇÃO E CONTEXTO, QUEIXA PRINCIPAL, RELATO E TEMAS ABORDADOS, ESTADO MENTAL, INTERVENÇÕES, EVOLUÇÃO E ANÁLISE, CONDUTA, PLANEJAMENTO), o tom clínico e as iniciais do paciente. Devolva APENAS o prontuário completo reescrito, sem comentários adicionais.`;

    const systemPrompt = await getPersona("prontuario_refinar");

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!openaiResp.ok) {
      if (openaiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (openaiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await openaiResp.text();
      console.error("OpenAI gateway error:", openaiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao aplicar melhoria" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openaiResp.body) {
      return new Response(JSON.stringify({ error: "Sem resposta do modelo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream: one branch goes to the client, the other aggregates the full
    // text so we can persist the revision after the model finishes — even if the
    // client aborts mid-stream.
    const [clientBranch, persistBranch] = openaiResp.body.tee();

    const persistTask = (async () => {
      try {
        const reader = persistBranch.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) fullText += delta;
            } catch {
              // ignore malformed chunk
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
              if (c) fullText += c;
            } catch {}
          }
        }

        if (!fullText.trim()) {
          console.warn("Improvement stream completed empty — skipping persistence");
          return;
        }

        if (!evolution_id) {
          // Pre-save flow: nothing to persist server-side.
          return;
        }

        const { data: cur, error: fetchErr } = await supabaseAdmin
          .from("evolutions")
          .select("output_content, revision_history")
          .eq("id", evolution_id)
          .eq("user_id", user.id)
          .single();

        if (fetchErr || !cur) {
          console.error("Failed to load evolution for revision:", fetchErr);
          return;
        }

        const prev = Array.isArray(cur.revision_history) ? cur.revision_history : [];
        const nextHistory = [
          ...prev,
          {
            version: prev.length + 1,
            content: cur.output_content,
            prompt_text: finalPromptText,
            prompt_type,
            created_at: new Date().toISOString(),
          },
        ];

        const { error: updateErr } = await supabaseAdmin
          .from("evolutions")
          .update({
            output_content: fullText,
            revision_history: nextHistory,
          })
          .eq("id", evolution_id)
          .eq("user_id", user.id);

        if (updateErr) {
          console.error("Failed to persist evolution revision:", updateErr);
        }
      } catch (e) {
        console.error("Persist branch error:", e);
      }
    })();

    // Keep the persistence task alive even if the client disconnects.
    // @ts-ignore — EdgeRuntime is provided by Supabase Edge Functions runtime.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(persistTask);
    }

    return new Response(clientBranch, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("improve-evolution error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
