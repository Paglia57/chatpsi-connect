import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { UserId, resposta, openai_thread_id } = await req.json();

    console.log('Received webhook response:', { UserId, hasResponse: !!resposta, openai_thread_id });

    // Validate required fields
    if (!UserId || !resposta) {
      console.error('Missing required fields:', { UserId: !!UserId, resposta: !!resposta });
      return new Response(
        JSON.stringify({ error: 'UserId and resposta are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate UserId format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(UserId)) {
      console.error('Invalid UserId format:', UserId);
      return new Response(
        JSON.stringify({ error: 'Invalid UserId format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify user exists in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', UserId)
      .single();

    if (profileError || !profile) {
      console.error('User not found or error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare metadata object
    const metadata: any = {};
    if (openai_thread_id) {
      metadata.openai_thread_id = openai_thread_id;
    }

    // Insert AI response message into messages table
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        user_id: UserId,
        thread_id: UserId, // Use userId as thread_id (same pattern as dispatch-message)
        content: resposta,
        type: 'text',
        sender: 'ai',
        metadata: Object.keys(metadata).length > 0 ? metadata : null
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error inserting AI message:', messageError);
      return new Response(
        JSON.stringify({ error: 'Failed to save AI response' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('AI response saved successfully:', message.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'AI response received and saved',
        messageId: message.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in receive-webhook-response function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});