import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'Present' : 'Missing',
      serviceKey: supabaseServiceKey ? 'Present' : 'Missing',
      n8nWebhookUrl: n8nWebhookUrl ? 'Present' : 'Missing'
    });

    if (!supabaseUrl || !supabaseServiceKey || !n8nWebhookUrl) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração de ambiente incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      message, 
      userId, 
      messageType = 'text', 
      fileUrl = null,
      nickname = null,
      openai_thread_id = null
    } = await req.json();

    // Validate userId as UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('Invalid userId format:', userId);
      return new Response(
        JSON.stringify({ error: 'userId deve ser um UUID válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate messageType - use only allowed values, default to 'text'
    const validTypes = ['text', 'audio', 'image', 'video', 'document'];
    const validatedMessageType = validTypes.includes(messageType) ? messageType : 'text';

    console.log('Dispatch message request:', { userId, messageType: validatedMessageType });

    // Verify user subscription and get OpenAI thread ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_active, openai_thread_id, nickname')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.subscription_active) {
      console.error('User subscription not active:', profileError);
      return new Response(
        JSON.stringify({ error: 'Assinatura inativa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always use userId as conversationId for database thread_id
    const conversationId = userId;
    console.log('Using conversationId (thread_id):', conversationId);

    // Save user message first
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: conversationId,
        content: message || 'Arquivo enviado',
        type: validatedMessageType,
        sender: 'user',
        media_url: fileUrl,
        metadata: { 
          original_file_url: fileUrl,
          openai_thread_id: openai_thread_id || profile.openai_thread_id || null
        }
      });

    if (insertError) {
      console.error('Error saving user message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar mensagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      UserId: userId,
      tipodemensagem: validatedMessageType,
      texto: validatedMessageType === 'text' ? message : null,
      audio: validatedMessageType === 'audio' ? fileUrl : null,
      imagem: validatedMessageType === 'image' ? fileUrl : null,
      video: validatedMessageType === 'video' ? fileUrl : null,
      documento: validatedMessageType === 'document' ? fileUrl : null
    };

    // Include OpenAI thread ID for n8n (from input or profile)
    const openaiThreadForN8n = openai_thread_id || profile.openai_thread_id;
    if (openaiThreadForN8n) {
      webhookPayload.openai_thread_id = openaiThreadForN8n;
    }

    // Include nickname if available (from input or profile)
    const finalNickname = nickname || profile.nickname;
    if (finalNickname) {
      webhookPayload.nickname = finalNickname;
    }

    console.log('Sending to webhook:', webhookPayload);

    // Send to webhook and wait for response
    const webhookResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', errorText);
      throw new Error(`Webhook failed with status ${webhookResponse.status}: ${errorText}`);
    }

    // Parse webhook response
    const webhookData = await webhookResponse.json();
    console.log('Webhook response received:', webhookData);

    if (!webhookData.response) {
      console.error('Invalid webhook response format:', webhookData);
      throw new Error('Resposta do webhook em formato inválido');
    }

    // Save assistant message using conversationId (always userId)
    const { error: assistantInsertError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: conversationId,
        content: webhookData.response,
        type: 'text',
        sender: 'assistant',
        media_url: null,
        metadata: {
          ai_bridge_response: true
        }
      });

    if (assistantInsertError) {
      console.error('Error saving assistant message:', assistantInsertError);
      // Don't fail the request, but log the error
      console.warn('Assistant message could not be saved, but continuing...');
    }

    console.log('Flow completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: webhookData.response
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dispatch-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});