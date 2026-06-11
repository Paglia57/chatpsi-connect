// Resolve mídia recebida pela WhatsApp Cloud API em bytes + mimeType.
// A Cloud API entrega mídia em dois passos: primeiro um GET no media id devolve
// uma URL temporária; depois um GET nessa URL (com o MESMO Bearer) baixa os bytes.

const GRAPH_API_VERSION = 'v21.0';

export async function fetchWhatsappMedia(
  mediaId: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const token = Deno.env.get('WHATSAPP_TOKEN');
  if (!token) {
    throw new Error('WHATSAPP_TOKEN não configurada no ambiente');
  }

  // Passo (a): metadados — url temporária + mime_type.
  const metaRes = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
    { headers: { 'Authorization': `Bearer ${token}` } },
  );
  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Erro ao obter metadados da mídia ${mediaId} (${metaRes.status}): ${errText}`);
  }
  const meta = await metaRes.json();
  const url: string | undefined = meta?.url;
  const mimeType: string = meta?.mime_type ?? 'application/octet-stream';
  if (!url) {
    throw new Error(`Metadados da mídia ${mediaId} não trouxeram url`);
  }

  // Passo (b): baixar os bytes (a URL da Meta exige o mesmo Bearer).
  const binRes = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!binRes.ok) {
    const errText = await binRes.text();
    throw new Error(`Erro ao baixar a mídia ${mediaId} (${binRes.status}): ${errText}`);
  }
  const bytes = new Uint8Array(await binRes.arrayBuffer());

  return { bytes, mimeType };
}
