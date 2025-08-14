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
    const aiBridgeUrl = Deno.env.get('AI_BRIDGE_URL');

    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'Present' : 'Missing',
      serviceKey: supabaseServiceKey ? 'Present' : 'Missing',
      aiBridgeUrl: aiBridgeUrl ? 'Present' : 'Missing'
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

    console.log('Dispatch message request:', { userId, messageType });

    // Verify user subscription and get OpenAI thread ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_active, openai_thread_id')
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
        message_type: messageType,
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

    // Prepare AI Bridge payload
    const aiPayload = {
      UserId: userId,
      tipodemensagem: messageType,
      texto: messageType === 'text' ? message : null,
      audio: messageType === 'audio' ? fileUrl : null,
      imagem: messageType === 'image' ? fileUrl : null,
      video: messageType === 'video' ? fileUrl : null,
      documento: messageType === 'document' ? fileUrl : null
    };

    // Include OpenAI thread ID if available
    if (profile.openai_thread_id) {
      aiPayload.openai_thread_id = profile.openai_thread_id;
    }

    console.log('Sending to AI Bridge:', aiPayload);

    let responseData;

    // Send to AI Bridge if URL is configured
    if (aiBridgeUrl) {
      const aiResponse = await fetch(aiBridgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiPayload),
      });

      if (!aiResponse.ok) {
        console.error('AI Bridge error:', await aiResponse.text());
        throw new Error(`AI Bridge failed: ${aiResponse.status}`);
      }

      responseData = await aiResponse.json();
      console.log('AI response received:', responseData);
    } else {
      // Fallback response when AI Bridge URL is not configured
      console.log('AI Bridge URL not configured, using fallback response');
      responseData = {
        response: "Olá! Para que eu possa funcionar completamente, o administrador precisa configurar a integração com o backend de IA. Por enquanto, estou funcionando em modo de demonstração.",
        openai_thread_id: null
      };
    }

    // Update profile with new OpenAI thread ID if provided
    if (responseData.openai_thread_id && responseData.openai_thread_id !== profile.openai_thread_id) {
      console.log('Updating OpenAI thread ID:', responseData.openai_thread_id);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ openai_thread_id: responseData.openai_thread_id })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating OpenAI thread ID:', updateError);
      }
    }

    // Save AI response to database
    const { error: aiInsertError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: userId, // Use userId as internal thread_id
        content: responseData.response || responseData.texto || 'Resposta da IA',
        message_type: 'text',
        sender: 'assistant',
        metadata: { 
          ai_bridge_response: true,
          openai_thread_id: responseData.openai_thread_id 
        }
      });

    if (aiInsertError) {
      console.error('Error saving AI response:', aiInsertError);
    }

    return new Response(
      JSON.stringify({ 
        response: responseData.response || responseData.texto || 'Resposta da IA',
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