// Ferramenta plano_de_acao — busca no catálogo próprio (pgvector) por similaridade.
// Transição com fallback: enquanto o catálogo estiver VAZIO, cai no assistant atual da
// OpenAI (via gateway), sem regressão. Com catálogo populado, retorna até K fichas no
// formato exato (resumo + link em texto puro); sem match relevante → "não encontrei".

import { chat } from "../llm/index.ts";
import { embed } from "../llm/embeddings.ts";

const MATCH_THRESHOLD = Number(Deno.env.get("PLANO_MATCH_THRESHOLD") ?? "0.35");
const MATCH_COUNT = Number(Deno.env.get("PLANO_MATCH_COUNT") ?? "3");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;
async function db() {
  if (_client) return _client;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  _client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return _client;
}

function deriveTema(q: string): string {
  const t = (q ?? "").replace(/\s+/g, " ").trim();
  return t.length > 80 ? t.slice(0, 80) + "…" : t;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPlanos(results: any[], nome: string | undefined, userQuery: string): string {
  const n = results.length;
  const plural = n === 1 ? "plano de ação" : "planos de ação";
  const tema = deriveTema(userQuery);
  const head = nome && nome.trim()
    ? `${nome.trim()}, aqui estão ${n} ${plural} para ${tema} que podem ajudar na sua prática clínica:`
    : `Aqui estão ${n} ${plural} para ${tema} que podem ajudar na sua prática clínica:`;
  const items = results.map((r, i) =>
    `${i + 1}. ${r.titulo}\n${(r.resumo ?? "").trim()}\nLink: ${r.link}`
  );
  return `${head}\n\n${items.join("\n\n")}`;
}

async function legacyAssistant(user_query: string): Promise<string> {
  try {
    const result = await chat({ task: "plano", personaSlug: "plano_acao", userText: user_query });
    return result.text;
  } catch (err) {
    console.error("Erro no fallback legado de planoDeAcao:", err instanceof Error ? err.message : err);
    return "Não consegui gerar o plano de ação agora.";
  }
}

export async function planoDeAcao(args: { user_query: string; nome_psicologo?: string }): Promise<string> {
  const userQuery = args.user_query ?? "";
  try {
    const client = await db();

    // Catálogo vazio → fallback legado (assistant da OpenAI), sem regressão.
    const { count } = await client
      .from("planos_de_acao")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true);
    if (!count || count === 0) {
      return await legacyAssistant(userQuery);
    }

    const embedding = await embed(userQuery);
    const { data, error } = await client.rpc("match_planos_de_acao", {
      query_embedding: embedding,
      match_threshold: MATCH_THRESHOLD,
      match_count: MATCH_COUNT,
    });
    if (error) throw error;

    const results = data ?? [];
    if (results.length === 0) {
      return "Não encontrei um plano de ação para esse tema. Tente descrever de outro jeito — por exemplo, o foco terapêutico, a queixa ou a faixa etária.";
    }
    return formatPlanos(results, args.nome_psicologo, userQuery);
  } catch (err) {
    console.error("Erro em planoDeAcao (pgvector):", err instanceof Error ? err.message : err);
    return "Não consegui buscar os planos de ação agora.";
  }
}
