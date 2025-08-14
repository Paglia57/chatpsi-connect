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

    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'Present' : 'Missing',
      serviceKey: supabaseServiceKey ? 'Present' : 'Missing'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração de ambiente incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { message, userId, messageType = 'text', fileUrl = null } = await req.json();

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

    // Save user message first
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: userId, // Use userId as internal thread_id
        content: message || 'Arquivo enviado',
        type: validatedMessageType,
        sender: 'user',
        media_url: fileUrl,
        metadata: { original_file_url: fileUrl }
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

    // Include OpenAI thread ID if available
    if (profile.openai_thread_id) {
      webhookPayload.openai_thread_id = profile.openai_thread_id;
    }

    // Include nickname if available
    if (profile.nickname) {
      webhookPayload.nickname = profile.nickname;
    }

    console.log('Sending to webhook:', webhookPayload);

    // Send to webhook
    const webhookResponse = await fetch('https://n8n.seconsult.com.br/webhook-test/chatprincipal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      console.error('Webhook error:', await webhookResponse.text());
      throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }

    console.log('Webhook sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
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