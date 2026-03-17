import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLINICAL_SYSTEM_PROMPT = `Você é um assistente clínico especializado em saúde mental, projetado para auxiliar profissionais (psicólogos e psiquiatras) na documentação clínica.

Seu papel:
- Gerar evoluções clínicas estruturadas e profissionais a partir de relatos de sessão
- Manter coerência e continuidade entre sessões do mesmo paciente
- Usar terminologia clínica adequada à abordagem terapêutica utilizada
- Acompanhar a evolução do paciente ao longo do tratamento
- Identificar padrões, progressos e pontos de atenção entre sessões

Regras obrigatórias:
- NUNCA invente informações que não estejam no relato fornecido
- NUNCA inclua dados identificáveis além das iniciais do paciente
- Use linguagem clínica profissional, compatível com prontuários
- Adapte a terminologia à abordagem terapêutica indicada
- Quando houver histórico de sessões anteriores, faça referências à evolução do quadro
- Mantenha objetividade clínica — sem juízos de valor pessoais

Formato de saída — sempre gerar nesta estrutura:

1. IDENTIFICAÇÃO E CONTEXTO
2. QUEIXA PRINCIPAL / DEMANDA DA SESSÃO
3. RELATO E TEMAS ABORDADOS
4. ESTADO MENTAL E COMPORTAMENTO OBSERVADO
5. INTERVENÇÕES REALIZADAS
6. EVOLUÇÃO E ANÁLISE CLÍNICA
7. CONDUTA E ENCAMINHAMENTOS
8. PLANEJAMENTO PARA PRÓXIMA SESSÃO`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      patient_name,
      patient_initials,
      approach,
      main_complaint,
      cid_10,
      dsm_5,
      medication,
      notes,
    } = await req.json();

    if (!patient_name || !patient_initials) {
      return new Response(JSON.stringify({ error: "Nome e iniciais são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiHeaders = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
    };

    // 1. Create Assistant
    console.log("Creating OpenAI Assistant...");
    const assistantResp = await fetch("https://api.openai.com/v1/assistants", {
      method: "POST",
      headers: openaiHeaders,
      body: JSON.stringify({
        name: `ChatPsi - ${patient_initials}`,
        instructions: CLINICAL_SYSTEM_PROMPT,
        model: "gpt-4.1-mini",
      }),
    });

    if (!assistantResp.ok) {
      const err = await assistantResp.text();
      console.error("Assistant creation failed:", assistantResp.status, err);
      throw new Error(`Erro ao criar Assistant: ${assistantResp.status}`);
    }

    const assistant = await assistantResp.json();
    console.log("Assistant created:", assistant.id);

    // 2. Create Thread
    console.log("Creating OpenAI Thread...");
    const threadResp = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: openaiHeaders,
      body: JSON.stringify({}),
    });

    if (!threadResp.ok) {
      const err = await threadResp.text();
      console.error("Thread creation failed:", threadResp.status, err);
      throw new Error(`Erro ao criar Thread: ${threadResp.status}`);
    }

    const thread = await threadResp.json();
    console.log("Thread created:", thread.id);

    // 3. Send initial context message
    const contextParts = [
      `Paciente: ${patient_initials}`,
      approach ? `Abordagem: ${approach}` : null,
      main_complaint ? `Queixa principal: ${main_complaint}` : null,
      cid_10 ? `CID-10: ${cid_10}` : null,
      dsm_5 ? `DSM-5: ${dsm_5}` : null,
      medication ? `Medicação em uso: ${medication}` : null,
      notes ? `Observações: ${notes}` : null,
      "Este é o início do acompanhamento.",
    ].filter(Boolean).join(". ");

    console.log("Sending initial context message...");
    const msgResp = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: openaiHeaders,
      body: JSON.stringify({
        role: "user",
        content: contextParts,
      }),
    });

    if (!msgResp.ok) {
      console.error("Initial message failed:", msgResp.status);
      // Non-fatal — thread still created
    }

    return new Response(
      JSON.stringify({
        thread_id: thread.id,
        assistant_id: assistant.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("create-patient-thread error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
