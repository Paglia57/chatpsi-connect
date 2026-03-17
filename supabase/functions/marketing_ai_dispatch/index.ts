import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASSISTANT_ID = 'asst_RmdTDmgUPmKNSoXoQ4FMHip1';
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurado');
    }

    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    const { prompt } = await req.json();

    // Validações
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Campo "prompt" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (prompt.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Prompt muito longo (máximo 5000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(jwt);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Marketing AI request from user:', user.id);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get or create thread
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('threads_marketing')
      .eq('user_id', user.id)
      .single();

    let threadId = profile?.threads_marketing || null;

    if (!threadId) {
      console.log('Creating new OpenAI thread for marketing');
      const threadData = await openaiRequest('/threads', openaiApiKey, { method: 'POST', body: '{}' });
      threadId = threadData.id;
      console.log('Created thread:', threadId);

      await supabaseAdmin
        .from('profiles')
        .update({ threads_marketing: threadId })
        .eq('user_id', user.id);
    }

    // Add message to thread
    await openaiRequest(`/threads/${threadId}/messages`, openaiApiKey, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: prompt }),
    });

    // Create run
    const run = await openaiRequest(`/threads/${threadId}/runs`, openaiApiKey, {
      method: 'POST',
      body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
    });

    console.log('Run created:', run.id, 'status:', run.status);

    // Poll until complete
    const TIMEOUT_MS = 90_000;
    const POLL_INTERVAL = 1500;
    const startTime = Date.now();
    let runStatus = run.status;

    while (!['completed', 'failed', 'cancelled', 'expired', 'incomplete'].includes(runStatus)) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error('Tempo limite excedido aguardando resposta da IA');
      }
      await sleep(POLL_INTERVAL);
      const updated = await openaiRequest(`/threads/${threadId}/runs/${run.id}`, openaiApiKey);
      runStatus = updated.status;
      console.log('Run poll:', runStatus);
    }

    if (runStatus !== 'completed') {
      throw new Error(`A IA não conseguiu processar (status: ${runStatus})`);
    }

    // Get assistant response
    const messagesData = await openaiRequest(
      `/threads/${threadId}/messages?limit=1&order=desc`,
      openaiApiKey
    );

    const assistantMsg = messagesData.data?.[0];
    if (!assistantMsg || assistantMsg.role !== 'assistant') {
      throw new Error('Resposta da IA não encontrada');
    }

    const generatedText = assistantMsg.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text.value)
      .join('\n');

    console.log('Texto gerado com sucesso, length:', generatedText.length);

    return new Response(
      JSON.stringify({ 
        success: true,
        generated_text: generatedText
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('Error in marketing_ai_dispatch:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro ao processar requisição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
