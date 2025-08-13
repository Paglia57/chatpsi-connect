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

    // Parse request body
    const body = await req.json();
    const { userId, nickname, threadId, type, text, audio, imagem, video, documento } = body;

    console.log('Dispatch message request:', { userId, threadId, type });

    if (!threadId || !type) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: threadId, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload
    const payload = {
      UserId: userId,
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
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});