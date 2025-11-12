import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

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
      console.error('Prompt vazio ou inválido');
      return new Response(
        JSON.stringify({ error: 'Campo "prompt" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (prompt.length > 5000) {
      console.error('Prompt muito longo:', prompt.length);
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
      console.error('Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Marketing AI request from user:', user.id);

    // Chamar webhook externo para IA de marketing
    const webhookUrl = Deno.env.get('MARKETING_AI_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.error('MARKETING_AI_WEBHOOK_URL não configurado');
      throw new Error('MARKETING_AI_WEBHOOK_URL não configurado');
    }

    console.log('Chamando webhook para gerar texto de marketing');
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Source': 'chatpsi',
      },
      body: JSON.stringify({
        user_id: user.id,
        prompt: prompt,
      }),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', webhookResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao gerar texto com IA',
          status: webhookResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = await webhookResponse.json();
    console.log('Texto gerado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        generated_text: responseData.generated_text || responseData.response || ''
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
