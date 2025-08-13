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
    const webhookUrl = 'https://n8n.seconsult.com.br/webhook-test/chatprincipal';

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

    const { message, userId, messageType = 'text', fileUrl = null, threadId } = await req.json();

    console.log('Dispatch message request:', { userId, messageType, threadId });

    // Verify user subscription is active
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_active')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.subscription_active) {
      console.error('User subscription not active:', profileError);
      return new Response(
        JSON.stringify({ error: 'Assinatura inativa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      UserId: userId,
      threadId: threadId || userId, // Use userId as threadId if not provided
      tipodemensagem: messageType,
      texto: messageType === 'text' ? message : null,
      audio: messageType === 'audio' ? fileUrl : null,
      imagem: messageType === 'image' ? fileUrl : null,
      video: messageType === 'video' ? fileUrl : null,
      documento: messageType === 'document' ? fileUrl : null
    };

    console.log('Sending to webhook:', webhookPayload);

    // Send to external webhook
    const webhookResponse = await fetch(webhookUrl, {
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

    const aiResponse = await webhookResponse.text();
    console.log('AI response received:', aiResponse);

    // Save AI response to database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: threadId || userId,
        content: aiResponse,
        message_type: 'text',
        sender: 'assistant',
        metadata: { webhook_response: true }
      });

    if (insertError) {
      console.error('Error saving AI response:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        success: true 
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