import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { chat, type ChatContentPart } from "../_shared/llm/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OPENAI_BASE = 'https://api.openai.com/v1';

// --- File processing helpers ---

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('.').pop()?.toLowerCase() || '';
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

/** Transcribe audio using Whisper API. */
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
  return result.text;
}

/** Process image: download and return a base64 data URL for a vision content part. */
async function processImageDataUrl(fileUrl: string): Promise<string> {
  console.log('Processing image for vision...');
  const { data, mime } = await downloadFile(fileUrl);
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  const base64 = btoa(binary);
  return `data:${mime};base64,${base64}`;
}

/** Process document: upload to OpenAI Files API and return file_id for a file content part. */
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

    // Authenticate user from JWT — use verified identity, never trust body-supplied userId
    const authHeader = req.headers.get('authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    if (authError || !user) {
      console.error('Authentication failed');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      message,
      messageType = 'text',
      fileUrl = null,
      openai_thread_id = null,
    } = await req.json();

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
    const threadIdIn = openai_thread_id || profile.openai_thread_id || undefined;

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
        metadata: { original_file_url: fileUrl, openai_thread_id: threadIdIn || null }
      });

    if (insertError) {
      console.error('Error saving user message:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar mensagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Build the chat input (text and/or rich content parts) ---
    const userText = message || '';
    let chatUserText: string | undefined;
    let chatContent: ChatContentPart[] | undefined;

    if (fileUrl && validatedMessageType !== 'text') {
      try {
        switch (validatedMessageType) {
          case 'audio': {
            const transcription = await transcribeAudio(fileUrl, openaiApiKey);
            const prefix = userText ? `${userText}\n\n` : '';
            chatUserText = `${prefix}[Transcrição do áudio do paciente]: ${transcription}`;
            break;
          }
          case 'image': {
            const dataUrl = await processImageDataUrl(fileUrl);
            chatContent = [];
            if (userText) chatContent.push({ type: 'text', text: userText });
            chatContent.push({ type: 'image', dataUrl });
            break;
          }
          case 'document': {
            const fileId = await processDocument(fileUrl, openaiApiKey);
            chatContent = [
              { type: 'text', text: userText || 'Analise o documento enviado.' },
              { type: 'file', fileId },
            ];
            break;
          }
          case 'video': {
            chatUserText = userText
              ? `${userText}\n\n[Vídeo enviado: ${fileUrl}]`
              : `[Vídeo enviado: ${fileUrl}]`;
            break;
          }
          default: {
            chatUserText = userText || 'Arquivo enviado';
          }
        }
      } catch (processingError) {
        console.error('File processing failed, using fallback:', processingError);
        const typeLabels: Record<string, string> = {
          audio: 'Áudio', image: 'Imagem', video: 'Vídeo', document: 'Documento',
        };
        const label = typeLabels[validatedMessageType] || 'Arquivo';
        chatUserText = userText
          ? `${userText}\n\n[${label} enviado: ${fileUrl}]`
          : `[${label} enviado: ${fileUrl}]`;
      }
    } else {
      chatUserText = userText || 'Arquivo enviado';
    }

    // --- Gateway: persona clínico web; backend escolhido por LLM_BACKEND ---
    const result = await chat({
      task: 'clinico',
      personaSlug: 'clinico_web',
      userText: chatContent ? undefined : chatUserText,
      content: chatContent,
      threadId: threadIdIn,
      shadowKey: userId,
    });

    // Persiste o id de conversa (thread/response) no perfil, como antes.
    if (result.threadId && result.threadId !== profile.openai_thread_id) {
      await supabase
        .from('profiles')
        .update({ openai_thread_id: result.threadId })
        .eq('user_id', userId);
    }

    const responseText = result.text;
    if (!responseText) {
      throw new Error('Resposta da IA veio vazia');
    }

    console.log('Assistant response length:', responseText.length);

    // Save assistant message
    const { error: assistantInsertError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: conversationId,
        content: responseText,
        type: 'text',
        sender: 'assistant',
        media_url: null,
        metadata: { openai_thread_id: result.threadId }
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
