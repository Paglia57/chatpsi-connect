// Converte mídia (bytes + mimeType) em texto, usando OpenAI Whisper (áudio) e
// Vision (imagem/documento visual). Reutiliza os padrões de dispatch-message.
//
// PDF: usamos `unpdf` (https://github.com/unjs/unpdf). Escolha sobre `pdfjs-serverless`/
// `pdfjs-dist` porque o unpdf empacota o pdf.js de forma agnóstica de runtime (sem
// dependências nativas nem polyfills de DOM), feito para serverless/Deno — roda no
// runtime das Edge Functions do Supabase. Extração de texto via `extractText`; para
// PDFs escaneados (sem camada de texto), renderização de página via `renderPageAsImage`
// + Vision (`imageToText`). A versão pode ser ajustada se o ambiente exigir.
import { extractText, getDocumentProxy, renderPageAsImage } from 'https://esm.sh/unpdf@0.12.1';

const OPENAI_BASE = 'https://api.openai.com/v1';

// Limites de leitura de PDF (controle de custo/tempo).
const MAX_OCR_PAGES = 10;          // páginas processadas via Vision no fallback OCR
const MIN_CHARS_PER_PAGE = 20;     // abaixo disso (em média), tratamos como PDF escaneado
const MAX_TEXT_CHARS = 100_000;    // teto do texto extraído (trunca e avisa)
const VISION_MODEL = 'gpt-4o-mini';
const IMAGE_PROMPT =
  'Descreva de forma objetiva e em português o conteúdo desta imagem, incluindo qualquer texto visível.';

function getApiKey(): string {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no ambiente');
  return apiKey;
}

/** Extensão de arquivo a partir do mime (para nomear o upload do Whisper). */
function extFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/opus': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/mp4': 'm4a',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/amr': 'amr',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] ?? 'bin';
}

/** Converte bytes em base64 em chunks (evita estouro de pilha em arquivos grandes). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Transcreve áudio via Whisper. */
export async function audioToText(bytes: Uint8Array, mimeType: string): Promise<string> {
  const apiKey = getApiKey();
  const ext = extFromMime(mimeType);

  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: mimeType }), `audio.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper error ${res.status}: ${errText}`);
  }

  const result = await res.json();
  return result.text ?? '';
}

/** Descreve uma imagem via Vision (chat completions com image_url em data URL). */
export async function imageToText(bytes: Uint8Array, mimeType: string): Promise<string> {
  const apiKey = getApiKey();
  const dataUrl = `data:${mimeType};base64,${bytesToBase64(bytes)}`;

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IMAGE_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vision error ${res.status}: ${errText}`);
  }

  const result = await res.json();
  return result?.choices?.[0]?.message?.content ?? '';
}

/**
 * Converte documento em texto.
 * - imagem (image/*): rota Vision.
 * - PDF (application/pdf): extração de texto real, com OCR de fallback para escaneados.
 * - demais formatos (docx, xlsx, ...): aviso amigável (não suportado nesta etapa).
 */
export async function documentToText(bytes: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType.startsWith('image/')) {
    return await imageToText(bytes, mimeType);
  }
  if (mimeType === 'application/pdf') {
    return await pdfToText(bytes);
  }
  return `(formato ${mimeType} ainda não suportado — por favor, envie um PDF ou uma imagem.)`;
}

/** Extrai o texto de um PDF; se for escaneado (sem camada de texto), cai no OCR. */
async function pdfToText(bytes: Uint8Array): Promise<string> {
  let totalPages = 0;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    totalPages = pdf.numPages ?? 0;

    const extracted = await extractText(pdf, { mergePages: true });
    const raw = extracted?.text;
    const text = (typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join('\n') : '').trim();

    const avgPerPage = totalPages > 0 ? text.length / totalPages : text.length;
    if (text.length > 0 && avgPerPage >= MIN_CHARS_PER_PAGE) {
      // PDF com camada de texto.
      if (text.length > MAX_TEXT_CHARS) {
        return text.slice(0, MAX_TEXT_CHARS) +
          `\n\n(Documento truncado: texto excedeu ${MAX_TEXT_CHARS} caracteres.)`;
      }
      return text;
    }
  } catch (err) {
    console.error('Erro ao extrair texto do PDF:', err instanceof Error ? err.message : err);
    // Segue para tentar OCR antes de desistir.
  }

  // Fallback OCR: renderiza páginas como imagem e descreve via Vision.
  return await ocrPdf(bytes, totalPages);
}

/** OCR de fallback: renderiza até MAX_OCR_PAGES páginas e passa cada uma pela Vision. */
async function ocrPdf(bytes: Uint8Array, totalPages: number): Promise<string> {
  const pageCount = Math.min(totalPages > 0 ? totalPages : 1, MAX_OCR_PAGES);
  const parts: string[] = [];

  for (let page = 1; page <= pageCount; page++) {
    try {
      const imageBuffer = await renderPageAsImage(new Uint8Array(bytes), page, { scale: 2 });
      const description = await imageToText(new Uint8Array(imageBuffer), 'image/png');
      if (description.trim()) parts.push(`[Página ${page}]\n${description.trim()}`);
    } catch (err) {
      console.error(`OCR da página ${page} falhou:`, err instanceof Error ? err.message : err);
    }
  }

  if (parts.length === 0) {
    return '(documento PDF recebido, mas não consegui ler o conteúdo)';
  }

  let out = parts.join('\n\n');
  if (totalPages > MAX_OCR_PAGES) {
    out += `\n\n(Documento truncado: processadas ${MAX_OCR_PAGES} de ${totalPages} páginas.)`;
  }
  return out;
}
