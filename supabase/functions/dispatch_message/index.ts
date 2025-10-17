import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');

    // Authenticate user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    
    if (authError || !user) {
      console.error('Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { nickname, threadId, type, text, audio, imagem, video, documento } = body;

    console.log('Dispatch message request:', { userId: user.id, threadId, type });

    // Input validation
    if (!threadId || typeof threadId !== 'string' || threadId.length > 100) {
      return new Response(
        JSON.stringify({ error: 'threadId inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTypes = ['Texto', 'Áudio', 'Imagem', 'Vídeo', 'Documento'];
    if (!type || !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: 'type deve ser: Texto, Áudio, Imagem, Vídeo ou Documento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate text length
    if (text && text.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Texto muito longo (máximo 10000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL formats for media
    const urlPattern = /^https?:\/\/.+/;
    if (audio && !urlPattern.test(audio)) {
      return new Response(
        JSON.stringify({ error: 'URL de áudio inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (imagem && !urlPattern.test(imagem)) {
      return new Response(
        JSON.stringify({ error: 'URL de imagem inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (video && !urlPattern.test(video)) {
      return new Response(
        JSON.stringify({ error: 'URL de vídeo inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (documento && !urlPattern.test(documento)) {
      return new Response(
        JSON.stringify({ error: 'URL de documento inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload using authenticated user ID
    const payload = {
      UserId: user.id,
      nickname: nickname,
      threadId: threadId,
      tipodemensagem: type,
      texto: text ?? null,
      audio: audio ?? null,
      imagem: imagem ?? null,
      video: video ?? null,
      documento: documento ?? null,
    };

    const webhookUrl = Deno.env.get('WEBHOOK_ENDPOINT_URL') || 'https://n8n.seconsult.com.br/webhook-test/chatprincipal';
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (webhookSecret) {
      headers['Authorization'] = `Bearer ${webhookSecret}`;
    }

    // Send to webhook
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await resp.text();
    
    // Log webhook event
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabase.from('webhook_events').insert({
      direction: 'outbound',
      payload: payload,
      status_code: resp.status,
      error: resp.ok ? null : `Webhook failed: ${resp.status}`
    });

    return new Response(responseText, {
      status: resp.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error('Error in dispatch_message:', e);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar requisição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});