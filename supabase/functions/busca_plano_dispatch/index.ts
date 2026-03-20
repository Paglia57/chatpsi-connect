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
    const { input_text } = await req.json();

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

    // Send to n8n webhook with extended timeout
    const webhookUrl = 'https://webhook.seconsult.com.br/webhook/buscaplano';
    console.log('Sending request to n8n webhook...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Source': 'lovable',
      },
      body: JSON.stringify({ input: input_text, user_id: userId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const statusCode = webhookResponse.status;
    console.log('Webhook response status:', statusCode);
    
    let responseData: any = null;
    let errorMessage: string | null = null;

    try {
      const responseText = await webhookResponse.text();
      console.log('Response text raw:', responseText.substring(0, 500));
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      errorMessage = `Failed to parse webhook response: ${e.message}`;
      console.error(errorMessage);
    }

    if (!webhookResponse.ok) {
      errorMessage = `Webhook returned status ${statusCode}`;
    }

    // Extract output from n8n response with fallback for multiple key names
    let outputText = '';
    let threadId: string | null = null;
    let sourceField = 'none';

    function extractFromItem(item: any): { text: string; thread: string | null; field: string } {
      for (const key of ['output', 'response']) {
        if (item[key] && typeof item[key] === 'string') return { text: item[key], thread: item.threadId || item.thread_id || null, field: key };
        if (item.body?.[key] && typeof item.body[key] === 'string') return { text: item.body[key], thread: item.body?.threadId || item.body?.thread_id || null, field: `body.${key}` };
        if (item.data?.[key] && typeof item.data[key] === 'string') return { text: item.data[key], thread: item.data?.threadId || item.data?.thread_id || null, field: `data.${key}` };
      }
      return { text: '', thread: null, field: 'none' };
    }

    if (Array.isArray(responseData) && responseData.length > 0) {
      const r = extractFromItem(responseData[0]);
      outputText = r.text; threadId = r.thread; sourceField = r.field;
      console.log('Format: array, field:', sourceField);
    } else if (responseData && typeof responseData === 'object') {
      const r = extractFromItem(responseData);
      outputText = r.text; threadId = r.thread; sourceField = r.field;
      console.log('Format: object, field:', sourceField);
    } else if (typeof responseData === 'string' && responseData.trim().length > 0) {
      outputText = responseData;
      sourceField = 'raw_string';
      console.log('Format: raw string');
    }

    console.log('Extracted output length:', outputText.length, 'field:', sourceField, 'threadId:', threadId);

    // Save to history
    await supabaseAdmin.from('plano_chat_history').insert({
      user_id: userId,
      thread_sent: threadId,
      input_text,
      http_status: statusCode,
      response_json: { output: outputText },
      error_message: errorMessage,
    });

    if (webhookResponse.ok && outputText) {
      console.log('Plano gerado com sucesso, length:', outputText.length);
      return new Response(
        JSON.stringify({ success: true, response: { output: outputText } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: errorMessage || 'Erro ao processar requisição', status: statusCode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (e) {
    console.error('Error in busca_plano_dispatch:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro ao processar requisição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
