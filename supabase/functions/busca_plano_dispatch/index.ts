import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSISTANT_ID = 'asst_esHKfSJcaMNF99QVrILGu6pW';
const OPENAI_BASE = 'https://api.openai.com/v1';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function openaiRequest(path: string, apiKey: string, options: RequestInit = {}) {
  const res = await fetch(`${OPENAI_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`OpenAI error ${res.status} on ${path}:`, errText);
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function cancelActiveRuns(threadId: string, apiKey: string) {
  const runs = await openaiRequest(`/threads/${threadId}/runs?limit=5`, apiKey);
  for (const run of runs.data || []) {
    if (['in_progress', 'queued', 'requires_action'].includes(run.status)) {
      console.log(`Cancelling active run ${run.id} (status: ${run.status})`);
      try {
        await openaiRequest(`/threads/${threadId}/runs/${run.id}/cancel`, apiKey, { method: 'POST' });
      } catch (e) {
        console.warn(`Failed to cancel run ${run.id}:`, e);
      }
      await sleep(1000);
    }
  }
}

async function handleToolCalls(threadId: string, runId: string, run: any, apiKey: string) {
  const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls || [];
  if (toolCalls.length === 0) return;

  console.log(`Handling ${toolCalls.length} tool call(s) for run ${runId}`);

  const toolOutputs = toolCalls.map((tc: any) => {
    console.log(`Tool call: ${tc.function.name}, args: ${tc.function.arguments}`);
    return {
      tool_call_id: tc.id,
      output: JSON.stringify({ status: "ok", message: "Tool execution acknowledged by backend." }),
    };
  });

  await openaiRequest(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`, apiKey, {
    method: 'POST',
    body: JSON.stringify({ tool_outputs: toolOutputs }),
  });

  console.log('Tool outputs submitted successfully');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error('OPENAI_API_KEY não configurado');

    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    const { input_text, reset_thread } = await req.json();

    if (!input_text || typeof input_text !== 'string') {
      return new Response(JSON.stringify({ error: 'Campo obrigatório: input_text (string)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (input_text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'input_text não pode estar vazio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (input_text.length > 5000) {
      return new Response(JSON.stringify({ error: 'input_text muito longo (máximo 5000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = user.id;
    console.log('Busca Plano request from user:', userId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // If reset requested, clear the thread
    if (reset_thread) {
      console.log('Resetting thread for user:', userId);
      await supabaseAdmin.from('profiles').update({ threads_plano: null }).eq('user_id', userId);
    }

    // Get or create thread
    let threadId: string | null = null;

    if (!reset_thread) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles').select('threads_plano').eq('user_id', userId).single();
      if (profileError) throw new Error('Erro ao buscar perfil do usuário');
      threadId = profile?.threads_plano || null;
    }

    if (!threadId) {
      const threadData = await openaiRequest('/threads', openaiApiKey, { method: 'POST', body: '{}' });
      threadId = threadData.id;
      await supabaseAdmin.from('profiles').update({ threads_plano: threadId }).eq('user_id', userId);
    } else {
      await cancelActiveRuns(threadId, openaiApiKey);
    }

    // Add message to thread
    await openaiRequest(`/threads/${threadId}/messages`, openaiApiKey, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: input_text }),
    });

    // Create run — let the assistant use its tools naturally
    const run = await openaiRequest(`/threads/${threadId}/runs`, openaiApiKey, {
      method: 'POST',
      body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
    });
    console.log('Run created:', run.id, 'status:', run.status);

    // Poll until complete — handle requires_action by submitting tool outputs
    const TIMEOUT_MS = 120_000;
    const POLL_INTERVAL = 1500;
    const MAX_TOOL_ROUNDS = 5;
    const startTime = Date.now();
    let runStatus = run.status;
    let currentRunId = run.id;
    let toolRounds = 0;

    while (!['completed', 'failed', 'cancelled', 'expired', 'incomplete'].includes(runStatus)) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        try { await openaiRequest(`/threads/${threadId}/runs/${currentRunId}/cancel`, openaiApiKey, { method: 'POST' }); } catch (_) {}
        throw new Error('Tempo limite excedido aguardando resposta da IA');
      }

      await sleep(POLL_INTERVAL);
      const updated = await openaiRequest(`/threads/${threadId}/runs/${currentRunId}`, openaiApiKey);
      runStatus = updated.status;
      console.log('Run poll:', runStatus);

      if (runStatus === 'requires_action') {
        toolRounds++;
        if (toolRounds > MAX_TOOL_ROUNDS) {
          try { await openaiRequest(`/threads/${threadId}/runs/${currentRunId}/cancel`, openaiApiKey, { method: 'POST' }); } catch (_) {}
          throw new Error('Número máximo de rodadas de ferramentas excedido');
        }

        await handleToolCalls(threadId, currentRunId, updated, openaiApiKey);
        // Continue polling — the run will resume after tool outputs are submitted
      }
    }

    if (runStatus !== 'completed') {
      throw new Error(`A IA não conseguiu processar (status: ${runStatus})`);
    }

    // Get assistant response
    const messagesData = await openaiRequest(`/threads/${threadId}/messages?limit=1&order=desc`, openaiApiKey);
    const assistantMsg = messagesData.data?.[0];
    if (!assistantMsg || assistantMsg.role !== 'assistant') throw new Error('Resposta da IA não encontrada');

    const outputText = assistantMsg.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text.value)
      .join('\n');

    console.log('Plano gerado com sucesso, length:', outputText.length);

    // Save to history
    await supabaseAdmin.from('plano_chat_history').insert({
      user_id: userId, thread_sent: threadId, input_text,
      http_status: 200, response_json: { output: outputText }, error_message: null,
    });

    return new Response(
      JSON.stringify({ success: true, response: { output: outputText } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('Error in busca_plano_dispatch:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro ao processar requisição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
