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

// --- File processing helpers ---

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase() || '';
    return ext;
  } catch {
    return '';
  }
}

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', webm: 'audio/webm',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
    pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

async function downloadFile(url: string): Promise<{ data: Uint8Array; ext: string; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file: ${res.status}`);
  const data = new Uint8Array(await res.arrayBuffer());
  const ext = getExtensionFromUrl(url);
  const mime = getMimeType(ext);
  return { data, ext, mime };
}

/**
 * Transcribe audio using Whisper API. Returns transcription text.
 */
async function transcribeAudio(fileUrl: string, apiKey: string): Promise<string> {
  console.log('Transcribing audio via Whisper...');
  const { data, ext } = await downloadFile(fileUrl);
  
  const formData = new FormData();
  const blob = new Blob([data], { type: getMimeType(ext) });
  formData.append('file', blob, `audio.${ext || 'mp3'}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Whisper error:', errText);
    throw new Error(`Whisper API error ${res.status}: ${errText}`);
  }

  const result = await res.json();
  console.log('Whisper transcription length:', result.text?.length);
  return result.text;
}

/**
 * Process image: download and convert to base64 for vision content block.
 */
async function processImage(fileUrl: string): Promise<{ type: string; image_url: { url: string } }> {
  console.log('Processing image for vision...');
  const { data, ext, mime } = await downloadFile(fileUrl);
  
  // Convert to base64
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  const base64 = btoa(binary);
  const dataUrl = `data:${mime};base64,${base64}`;
  
  console.log('Image encoded, size:', data.length, 'bytes');
  return {
    type: 'image_url',
    image_url: { url: dataUrl },
  };
}

/**
 * Process document: upload to OpenAI Files API and return file_id for attachment.
 */
async function processDocument(fileUrl: string, apiKey: string): Promise<string> {
  console.log('Uploading document to OpenAI Files API...');
  const { data, ext } = await downloadFile(fileUrl);

  const formData = new FormData();
  const blob = new Blob([data], { type: getMimeType(ext) });
  formData.append('file', blob, `document.${ext || 'pdf'}`);
  formData.append('purpose', 'assistants');

  const res = await fetch(`${OPENAI_BASE}/files`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Files API error:', errText);
    throw new Error(`Files API error ${res.status}: ${errText}`);
  }

  const result = await res.json();
  console.log('File uploaded:', result.id);
  return result.id;
}

// --- Main handler ---

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

    console.log('Dispatch message request:', { userId, messageType: validatedMessageType, hasFile: !!fileUrl });

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

      await supabase
        .from('profiles')
        .update({ openai_thread_id: threadId })
        .eq('user_id', userId);
    }

    // 2. Process file and build message content
    let messageContent: any; // will be string or array of content blocks
    let attachments: any[] | undefined;
    const userText = message || '';

    if (fileUrl && validatedMessageType !== 'text') {
      try {
        switch (validatedMessageType) {
          case 'audio': {
            const transcription = await transcribeAudio(fileUrl, openaiApiKey);
            const prefix = userText ? `${userText}\n\n` : '';
            messageContent = `${prefix}[Transcrição do áudio do paciente]: ${transcription}`;
            break;
          }

          case 'image': {
            const imageBlock = await processImage(fileUrl);
            const contentBlocks: any[] = [];
            if (userText) {
              contentBlocks.push({ type: 'text', text: userText });
            }
            contentBlocks.push(imageBlock);
            messageContent = contentBlocks;
            break;
          }

          case 'document': {
            const fileId = await processDocument(fileUrl, openaiApiKey);
            messageContent = userText || 'Analise o documento enviado.';
            attachments = [{ file_id: fileId, tools: [{ type: 'file_search' }] }];
            break;
          }

          case 'video': {
            // Video: no direct processing, send as description
            messageContent = userText 
              ? `${userText}\n\n[Vídeo enviado: ${fileUrl}]`
              : `[Vídeo enviado: ${fileUrl}]`;
            break;
          }

          default: {
            messageContent = userText || 'Arquivo enviado';
          }
        }
      } catch (processingError) {
        // Fallback: send as text description if processing fails
        console.error('File processing failed, using fallback:', processingError);
        const typeLabels: Record<string, string> = {
          audio: 'Áudio', image: 'Imagem', video: 'Vídeo', document: 'Documento',
        };
        const label = typeLabels[validatedMessageType] || 'Arquivo';
        messageContent = userText 
          ? `${userText}\n\n[${label} enviado: ${fileUrl}]`
          : `[${label} enviado: ${fileUrl}]`;
      }
    } else {
      messageContent = userText || 'Arquivo enviado';
    }

    console.log('Sending message to thread:', threadId, 'type:', typeof messageContent === 'string' ? 'text' : 'content_blocks');

    // 3. Add message to thread
    const messagePayload: any = { role: 'user', content: messageContent };
    if (attachments) {
      messagePayload.attachments = attachments;
    }

    await openaiRequest(`/threads/${threadId}/messages`, openaiApiKey, {
      method: 'POST',
      body: JSON.stringify(messagePayload),
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
