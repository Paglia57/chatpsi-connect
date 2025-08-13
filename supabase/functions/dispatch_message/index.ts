import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookUrl = Deno.env.get('WEBHOOK_ENDPOINT_URL') || 'https://n8n.seconsult.com.br/webhook-test/chatprincipal';
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');

    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'Present' : 'Missing',
      serviceKey: supabaseServiceKey ? 'Present' : 'Missing',
      webhookUrl: webhookUrl ? 'Present' : 'Missing',
      webhookSecret: webhookSecret ? 'Present' : 'Missing'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração de ambiente incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract JWT from Authorization header
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');

    if (!jwt) {
      console.error('Missing JWT token');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, nickname, threadId, type, text, audio, imagem, video, documento } = await req.json();

    console.log('Dispatch message request:', { userId, nickname, threadId, type });

    if (!userId || !threadId || !type) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: userId, threadId, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user from token
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !userData.user) {
      console.error('Invalid JWT:', userError);
      return new Response(
        JSON.stringify({ error: 'Token de autenticação inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate userId matches JWT user
    if (userData.user.id !== userId) {
      console.error('UserId mismatch:', { jwtUserId: userData.user.id, requestUserId: userId });
      return new Response(
        JSON.stringify({ error: 'UserId não corresponde ao token' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user subscription is active
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_active, nickname')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.subscription_active) {
      console.error('User subscription not active:', profileError);
      return new Response(
        JSON.stringify({ error: 'Assinatura inativa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload according to contract
    const webhookPayload = {
      UserId: userId,
      nickname: nickname || profile.nickname || null,
      threadId: threadId,
      tipodemensagem: type,
      texto: text || null,
      audio: audio || null,
      imagem: imagem || null,
      video: video || null,
      documento: documento || null
    };

    console.log('Sending to webhook:', webhookPayload);

    let webhookResponse;
    let responseText = '';
    let statusCode = 0;
    let error = null;

    try {
      // Send to external webhook
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (webhookSecret) {
        headers['Authorization'] = `Bearer ${webhookSecret}`;
      }

      webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookPayload),
      });

      statusCode = webhookResponse.status;
      responseText = await webhookResponse.text();

      if (!webhookResponse.ok) {
        error = `Webhook failed: ${webhookResponse.status} - ${responseText}`;
        console.error('Webhook error:', error);
      } else {
        console.log('Webhook response received:', responseText);
      }

    } catch (webhookError) {
      error = `Webhook request failed: ${webhookError.message}`;
      statusCode = 0;
      console.error('Webhook request error:', webhookError);
    }

    // Store webhook event
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        direction: 'outbound',
        payload: webhookPayload,
        status_code: statusCode,
        error: error
      });

    if (insertError) {
      console.error('Error saving webhook event:', insertError);
    }

    // Return response
    if (error) {
      return new Response(
        JSON.stringify({ error }),
        { 
          status: statusCode > 0 ? statusCode : 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      responseText,
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in dispatch_message:', error);
    
    // Try to log the error to webhook_events if possible
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('webhook_events')
          .insert({
            direction: 'outbound',
            payload: { error: 'Function error occurred' },
            status_code: 500,
            error: error.message
          });
      }
    } catch (logError) {
      console.error('Failed to log error to webhook_events:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});