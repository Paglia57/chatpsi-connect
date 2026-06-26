import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getPersona } from "../_shared/personas/resolve.ts";
import { getBackend } from "../_shared/llm/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// As instruções do Assistant agora vêm do sistema de personas (getPersona("paciente_thread")).
// Cópia-base de fallback em supabase/functions/_shared/personas/baseline.ts.

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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

    // Backend Responses: não criamos Assistant/Thread por paciente — o contexto é montado
    // a partir do histórico do nosso lado a cada geração (generate-evolution). Retorna ids
    // vazios; patients.openai_thread_id passará a guardar o previous_response_id.
    if (getBackend() === "responses") {
      return new Response(
        JSON.stringify({ thread_id: null, assistant_id: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const openaiHeaders = {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
    };

    // 1. Create Assistant
    const clinicalInstructions = await getPersona("paciente_thread");
    console.log("Creating OpenAI Assistant...");
    const assistantResp = await fetch("https://api.openai.com/v1/assistants", {
      method: "POST",
      headers: openaiHeaders,
      body: JSON.stringify({
        name: `ChatPsi - ${patient_initials}`,
        instructions: clinicalInstructions,
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
