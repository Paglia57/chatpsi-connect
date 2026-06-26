// Núcleo de resolução de personas. getPersona(slug) lê o system prompt da versão ATIVA
// no banco (via service_role) com cache curto em memória. Se não houver versão ativa
// válida (ausente, vazia, curta demais ou placeholder), cai no baseline.ts — nunca
// retorna vazio, para jamais quebrar o atendimento.

import { getBaseline, PLACEHOLDER_MARK } from "./baseline.ts";

type CacheEntry = { text: string; ts: number };

const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60s — não há invalidação cross-instância; o TTL é o mecanismo.
const MIN_VALID_LENGTH = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;
async function getClient() {
  if (_client) return _client;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _client;
}

function isUsable(content: string | null | undefined): content is string {
  return (
    !!content &&
    content.trim().length >= MIN_VALID_LENGTH &&
    !content.trimStart().startsWith(PLACEHOLDER_MARK)
  );
}

/** Retorna o system prompt da persona (versão ativa no banco ou baseline). Nunca vazio. */
export async function getPersona(slug: string): Promise<string> {
  const now = Date.now();
  const cached = CACHE.get(slug);
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.text;

  let resolved: string | null = null;
  try {
    const client = await getClient();
    const { data: persona, error } = await client
      .from("ai_personas")
      .select("active_version_id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;

    if (persona?.active_version_id) {
      const { data: version, error: vErr } = await client
        .from("ai_persona_versions")
        .select("content")
        .eq("id", persona.active_version_id)
        .maybeSingle();
      if (vErr) throw vErr;
      if (isUsable(version?.content)) resolved = version!.content as string;
    }
  } catch (e) {
    console.warn(
      `[personas] erro ao resolver '${slug}', usando baseline:`,
      e instanceof Error ? e.message : e,
    );
  }

  if (!resolved) {
    if (!cached) {
      console.warn(
        `[personas] persona '${slug}' usando FALLBACK do baseline (sem versão ativa válida no banco).`,
      );
    }
    resolved = getBaseline(slug);
  }

  CACHE.set(slug, { text: resolved, ts: now });
  return resolved;
}

/** Limpa o cache (uso opcional; o TTL de 60s já expira naturalmente). */
export function invalidatePersonaCache(slug?: string) {
  if (slug) CACHE.delete(slug);
  else CACHE.clear();
}
