import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { chat } from "../_shared/llm/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Estado da conversa (id de thread/response) em profiles.threads_marketing.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('threads_marketing')
      .eq('user_id', user.id)
      .single();

    const prevThreadId = profile?.threads_marketing || undefined;

    // Gateway: as instruções vêm da persona 'marketing'; o backend é escolhido por LLM_BACKEND.
    const result = await chat({
      task: 'marketing',
      personaSlug: 'marketing',
      userText: prompt,
      threadId: prevThreadId,
    });

    if (result.threadId && result.threadId !== prevThreadId) {
      await supabaseAdmin
        .from('profiles')
        .update({ threads_marketing: result.threadId })
        .eq('user_id', user.id);
    }

    console.log('Texto gerado com sucesso, length:', result.text.length);

    return new Response(
      JSON.stringify({ success: true, generated_text: result.text }),
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
