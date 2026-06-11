// Ferramenta buscar_artigos — consulta a Perplexity API e devolve artigos científicos
// com os links das citações em texto puro ao final.

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const FRIENDLY_ERROR = 'Não consegui buscar os artigos científicos agora.';

/** Extrai a URL de uma citação, que pode vir como string ou objeto. */
function citationUrl(c: unknown): string {
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object') {
    const obj = c as Record<string, unknown>;
    return String(obj.url ?? obj.link ?? '');
  }
  return '';
}

export async function buscarArtigos(args: { user_query: string }): Promise<string> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');
  if (!apiKey) {
    console.error('PERPLEXITY_API_KEY não configurada no ambiente');
    return FRIENDLY_ERROR;
  }

  const userPrompt =
    `Liste artigos científicos sobre psicologia tema: ${args.user_query} relevantes com título, ` +
    `autores, ano de publicação, breve resumo e link de acesso, priorizando publicações revisadas ` +
    `por pares e fontes acadêmicas renomadas, com preferência por conteúdos em português do Brasil.`;

  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        temperature: 0.2,
        top_p: 0.9,
        top_k: 0,
        presence_penalty: 0,
        frequency_penalty: 1,
        stream: false,
        return_images: false,
        return_related_questions: false,
        web_search_options: { search_context_size: 'low' },
        messages: [
          { role: 'system', content: 'Be precise and concise.' },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Perplexity error ${res.status}:`, errText);
      return FRIENDLY_ERROR;
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const citations: unknown[] = Array.isArray(data?.citations) ? data.citations : [];

    const links = citations
      .map(citationUrl)
      .filter((u) => u.length > 0);

    if (links.length > 0) {
      return `${content}\n\n${links.join('\n')}`;
    }
    return content || FRIENDLY_ERROR;
  } catch (err) {
    console.error('Erro em buscarArtigos:', err instanceof Error ? err.message : err);
    return FRIENDLY_ERROR;
  }
}
