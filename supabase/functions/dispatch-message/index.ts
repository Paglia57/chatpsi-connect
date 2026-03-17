import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ASSISTANT_ID = 'asst_ghTrVWfzgh5vtW28qDs5MnRB';
const OPENAI_BASE = 'https://api.openai.com/v1';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function openaiRequest(path: string, apiKey: string, options: RequestInit = {}) {
  const res = await fetch(`${OPENAI_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error(`OpenAI error ${res.status} on ${path}:`, errText);
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
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
      return new Response(
        JSON.stringify({ error: 'userId deve ser um UUID válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validTypes = ['text', 'audio', 'image', 'video', 'document'];
    const validatedMessageType = validTypes.includes(messageType) ? messageType : 'text';

    console.log('Dispatch message request:', { userId, messageType: validatedMessageType });

    // Verify subscription and get thread ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_active, openai_thread_id, nickname')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.subscription_active) {
      return new Response(
        JSON.stringify({ error: 'Assinatura inativa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversationId = userId;

    // Save user message
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

    // --- OpenAI Assistants API ---

    // 1. Get or create thread
    let threadId = openai_thread_id || profile.openai_thread_id;

    if (!threadId) {
      console.log('Creating new OpenAI thread for user:', userId);
      const threadData = await openaiRequest('/threads', openaiApiKey, { method: 'POST', body: '{}' });
      threadId = threadData.id;
      console.log('Created thread:', threadId);

      // Save thread ID to profile
      await supabase
        .from('profiles')
        .update({ openai_thread_id: threadId })
        .eq('user_id', userId);
    }

    // 2. Build message content
    let contentText = message || '';
    if (fileUrl && validatedMessageType !== 'text') {
      const typeLabels: Record<string, string> = {
        audio: 'Áudio',
        image: 'Imagem',
        video: 'Vídeo',
        document: 'Documento',
      };
      const label = typeLabels[validatedMessageType] || 'Arquivo';
      contentText = contentText 
        ? `${contentText}\n\n[${label} enviado: ${fileUrl}]`
        : `[${label} enviado: ${fileUrl}]`;
    }

    if (!contentText) {
      contentText = 'Arquivo enviado';
    }

    console.log('Sending message to thread:', threadId);

    // 3. Add message to thread
    await openaiRequest(`/threads/${threadId}/messages`, openaiApiKey, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: contentText }),
    });

    // 4. Create run
    const run = await openaiRequest(`/threads/${threadId}/runs`, openaiApiKey, {
      method: 'POST',
      body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
    });

    console.log('Run created:', run.id, 'status:', run.status);

    // 5. Poll run until terminal state
    const TIMEOUT_MS = 90_000;
    const POLL_INTERVAL = 1500;
    const startTime = Date.now();
    let runStatus = run.status;
    let runId = run.id;

    while (!['completed', 'failed', 'cancelled', 'expired', 'incomplete'].includes(runStatus)) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error('Tempo limite excedido aguardando resposta da IA');
      }
      await sleep(POLL_INTERVAL);
      const updated = await openaiRequest(`/threads/${threadId}/runs/${runId}`, openaiApiKey);
      runStatus = updated.status;
      console.log('Run poll:', runStatus);
    }

    if (runStatus !== 'completed') {
      console.error('Run ended with status:', runStatus);
      throw new Error(`A IA não conseguiu processar a mensagem (status: ${runStatus})`);
    }

    // 6. Get assistant's latest message
    const messagesData = await openaiRequest(
      `/threads/${threadId}/messages?limit=1&order=desc`,
      openaiApiKey
    );

    const assistantMsg = messagesData.data?.[0];
    if (!assistantMsg || assistantMsg.role !== 'assistant') {
      throw new Error('Resposta da IA não encontrada');
    }

    // Extract text from content blocks
    const responseText = assistantMsg.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text.value)
      .join('\n');

    if (!responseText) {
      throw new Error('Resposta da IA veio vazia');
    }

    console.log('Assistant response length:', responseText.length);

    // 7. Save assistant message
    const { error: assistantInsertError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: conversationId,
        content: responseText,
        type: 'text',
        sender: 'assistant',
        media_url: null,
        metadata: { openai_thread_id: threadId }
      });

    if (assistantInsertError) {
      console.error('Error saving assistant message:', assistantInsertError);
    }

    console.log('Flow completed successfully');

    return new Response(
      JSON.stringify({ success: true, response: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dispatch-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
