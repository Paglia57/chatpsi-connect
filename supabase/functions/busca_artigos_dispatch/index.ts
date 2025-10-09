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
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: input_text (string)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Busca Artigos request from user:', userId);

    // Buscar threads_artigos do perfil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('threads_artigos')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Erro ao buscar perfil do usuário');
    }

    const threadsArtigos = profile?.threads_artigos || null;

    const payload: any = { 
      input: input_text,
      user_id: userId
    };
    if (threadsArtigos) {
      payload.thread = threadsArtigos;
    }

    console.log('Payload to webhook (input preview):', input_text.substring(0, 50) + '...', 'Has thread:', !!threadsArtigos);

    const webhookUrl = 'https://webhook.seconsult.com.br/webhook/buscaartigos';
    const apiKey = Deno.env.get('BUSCA_ARTIGOS_API_KEY');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-Source': 'lovable',
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const statusCode = webhookResponse.status;
    let responseData: any = null;
    let errorMessage: string | null = null;

    try {
      const responseText = await webhookResponse.text();
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      errorMessage = `Failed to parse webhook response: ${e.message}`;
      console.error(errorMessage);
    }

    if (!webhookResponse.ok) {
      errorMessage = `Webhook returned status ${statusCode}`;
    }

    // Salvar no histórico de artigos
    const { error: historyError } = await supabaseAdmin
      .from('artigos_chat_history')
      .insert({
        user_id: userId,
        thread_sent: threadsArtigos,
        input_text,
        http_status: statusCode,
        response_json: responseData,
        error_message: errorMessage,
      });

    if (historyError) {
      console.error('Error saving history:', historyError);
    }

    if (webhookResponse.ok && responseData) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          response: responseData 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage || 'Erro ao processar requisição',
          status: statusCode 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (e) {
    console.error('Error in busca_artigos_dispatch:', e);
    return new Response(
      JSON.stringify({ error: String(e.message || e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
