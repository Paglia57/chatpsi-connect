import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em saúde mental clínica com vasta experiência em psicologia e psiquiatria. Sua função é gerar evoluções clínicas estruturadas a partir das informações fornecidas sobre sessões terapêuticas.

REGRAS FUNDAMENTAIS:
1. Gere APENAS com base nas informações fornecidas. NUNCA invente dados.
2. Use terminologia técnica adequada à abordagem terapêutica informada.
3. Mantenha tom profissional e clínico — isto é um documento de prontuário.
4. Use APENAS iniciais do paciente, nunca nomes completos.
5. Respeite o sigilo profissional em todos os aspectos.
6. Se alguma informação não foi fornecida, indique "Não informado" ou "A ser complementado pelo profissional".

ESTRUTURA OBRIGATÓRIA DA EVOLUÇÃO:

EVOLUÇÃO CLÍNICA
Data: [data atual] | Paciente: [iniciais] | Sessão nº: [número] | Abordagem: [abordagem] | Duração: [duração] | Modalidade: [tipo]

---

IDENTIFICAÇÃO E CONTEXTO
[Breve contextualização do paciente e do momento do tratamento]

QUEIXA PRINCIPAL / DEMANDA DA SESSÃO
[Principal demanda trazida pelo paciente nesta sessão]

RELATO E TEMAS ABORDADOS
[Descrição dos temas discutidos, relatos do paciente, situações apresentadas]

ESTADO MENTAL E COMPORTAMENTO OBSERVADO
[Aparência, humor, afeto, pensamento, percepção, orientação, atenção, memória, juízo crítico, insight — conforme observado]

INTERVENÇÕES REALIZADAS
[Técnicas e intervenções utilizadas pelo profissional durante a sessão]

EVOLUÇÃO E ANÁLISE CLÍNICA
[Análise da evolução do caso, progressos, dificuldades, padrões identificados]

CONDUTA E ENCAMINHAMENTOS
[Decisões tomadas, encaminhamentos, orientações dadas]

PLANEJAMENTO PARA PRÓXIMA SESSÃO
[Objetivos e planejamento para a continuidade do tratamento]

---

ADAPTAÇÃO POR ABORDAGEM:
- TCC: Use termos como pensamentos automáticos, distorções cognitivas, registro de pensamentos, reestruturação cognitiva, exposição, dessensibilização, tarefas entre sessões.
- Psicanálise: Use termos como transferência, contratransferência, associação livre, resistência, mecanismos de defesa, conteúdo latente/manifesto, complexos, pulsões.
- Humanista: Use termos como congruência, empatia, aceitação incondicional, tendência atualizante, autoconceito, experiência organísmica.
- Comportamental: Use termos como reforço, extinção, modelagem, análise funcional, contingências, esquema de reforçamento.
- Sistêmica: Use termos como sistema familiar, padrões interacionais, triangulação, fronteiras, homeostase, circularidade.
- Gestalt: Use termos como awareness, contato, figura/fundo, ciclo de contato, interrupções do contato, experimento.
- Psicodrama: Use termos como protagonista, ego-auxiliar, diretor, aquecimento, dramatização, compartilhamento, inversão de papéis.`;

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
      input_type,
      input_content,
      approach,
      patient_initials,
      session_number,
      session_duration,
      session_type,
      audio_base64,
      audio_filename,
    } = await req.json();

    if (!input_type || !patient_initials) {
      return new Response(JSON.stringify({ error: "Dados obrigatórios não fornecidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let finalInputContent = input_content || "";

    // Transcribe audio using OpenAI Whisper if audio is provided
    if (input_type === "audio" && audio_base64) {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: "Chave da OpenAI não configurada para transcrição" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Transcribing audio with Whisper...");

      // Decode base64 to binary
      const binaryString = atob(audio_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const filename = audio_filename || "audio.webm";
      const ext = filename.split(".").pop()?.toLowerCase() || "webm";
      const mimeMap: Record<string, string> = {
        mp3: "audio/mpeg",
        m4a: "audio/mp4",
        wav: "audio/wav",
        ogg: "audio/ogg",
        webm: "audio/webm",
      };
      const mimeType = mimeMap[ext] || "audio/webm";

      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: mimeType }), filename);
      formData.append("model", "whisper-1");
      formData.append("language", "pt");
      formData.append("response_format", "text");

      const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
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

      finalInputContent = await whisperResp.text();
      console.log("Transcription completed, length:", finalInputContent.length);
    }

    const today = new Date().toLocaleDateString("pt-BR");
    const userPrompt = `Gere uma evolução clínica completa com base nas seguintes informações:

Data: ${today}
Paciente: ${patient_initials}
Sessão nº: ${session_number || "Não informado"}
Abordagem terapêutica: ${approach || "Não especificada"}
Duração: ${session_duration || "Não informada"}
Modalidade: ${session_type || "Não informada"}
Tipo de input: ${input_type}

${input_type === "audio" ? "TRANSCRIÇÃO DO ÁUDIO DA SESSÃO" : "ANOTAÇÕES DO PROFISSIONAL"}:
${finalInputContent}

Gere a evolução clínica completa seguindo a estrutura obrigatória, adaptando a terminologia para a abordagem ${approach || "geral"}.`;

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave da OpenAI não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar evolução" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-evolution error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
