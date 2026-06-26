// Admin do catálogo de planos de ação (pgvector). Apenas admin (is_admin).
// Ações: ingest (1 PDF), update (editar + re-embeddar), reindex (re-embeddar tudo),
// search (busca de teste com score). PDFs são parseados em memória; nada vai para Storage.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { complete, embed } from "../_shared/llm/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MATCH_THRESHOLD = Number(Deno.env.get("PLANO_MATCH_THRESHOLD") ?? "0.35");
const MATCH_COUNT = Number(Deno.env.get("PLANO_MATCH_COUNT") ?? "3");
const RESUMO_MAX = 800;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64; // tira data URL prefix
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const extracted = await extractText(pdf, { mergePages: true });
  const raw: unknown = extracted?.text;
  return (typeof raw === "string" ? raw : Array.isArray(raw) ? (raw as string[]).join("\n") : "").trim();
}

const LINK_RE = /https:\/\/drive\.google\.com\/[^\s)\]]+/i;
const ANY_URL_RE = /https?:\/\/[^\s)\]]+/i;

type Parsed = { titulo: string; link: string; resumo: string; issues: string[]; needsReview: boolean };

async function parseFicha(full: string, filename: string): Promise<Parsed> {
  const issues: string[] = [];
  const lines = full.split(/\r?\n/).map((l) => l.trim());
  const titleIdx = lines.findIndex((l) => l.length > 0);
  let titulo = titleIdx >= 0 ? lines[titleIdx] : "";
  if (!titulo) {
    titulo = filename.replace(/\.pdf$/i, "").trim();
    issues.push("sem_titulo");
  }

  const linkMatch = full.match(LINK_RE) ?? full.match(ANY_URL_RE);
  const link = linkMatch ? linkMatch[0].replace(/[.,;]+$/, "") : "";
  if (!link) issues.push("sem_link");

  // resumo = linhas entre o título e a linha do link
  const rest = lines.slice(titleIdx + 1);
  const linkLineIdx = rest.findIndex((l) => /https?:\/\//i.test(l));
  const resumoLines = linkLineIdx >= 0 ? rest.slice(0, linkLineIdx) : rest;
  let resumo = resumoLines.join(" ").replace(/\s+/g, " ").trim();
  let usedComplete = false;

  if (!resumo) {
    issues.push("sem_resumo");
    try {
      resumo = (await complete(
        `Resuma em 2 a 4 linhas, em português, este material de plano de ação clínico (apenas o resumo, sem títulos):\n\n${full.slice(0, 6000)}`,
      )).trim();
      usedComplete = true;
    } catch (_) {
      resumo = "";
    }
  } else if (resumo.length > RESUMO_MAX) {
    try {
      resumo = (await complete(
        `Condense em 2 a 4 linhas, em português, preservando o sentido, este resumo de um plano de ação:\n\n${resumo}`,
      )).trim();
      usedComplete = true;
    } catch (_) {
      resumo = resumo.slice(0, RESUMO_MAX);
    }
  }

  const needsReview = issues.length > 0 || usedComplete;
  return { titulo, link, resumo, issues, needsReview };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Autorização: só admin.
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: roleErr } = await userClient.rpc("is_admin");
    if (roleErr || isAdmin !== true) {
      return json({ error: "Acesso negado. Apenas administradores." }, 403);
    }

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const action = body?.action as string;

    // ---- INGEST: 1 PDF ----
    if (action === "ingest") {
      const filename = String(body.filename ?? "arquivo.pdf");
      if (!body.pdf_base64) return json({ error: "pdf_base64 ausente" }, 400);

      let full = "";
      try {
        full = await pdfText(b64ToBytes(String(body.pdf_base64)));
      } catch (e) {
        return json({ status: "problem", titulo: filename, link: "", issues: ["erro_leitura_pdf"], error: e instanceof Error ? e.message : String(e) });
      }
      if (!full) {
        return json({ status: "problem", titulo: filename, link: "", issues: ["pdf_sem_texto"] });
      }

      const parsed = await parseFicha(full, filename);
      const hash = await sha256(full.replace(/\s+/g, " ").trim());
      const embInput = `${parsed.titulo} ${parsed.resumo}`.trim() || parsed.titulo || filename;
      const embedding = await embed(embInput);

      const { data: existing } = await admin
        .from("planos_de_acao").select("id").eq("hash", hash).maybeSingle();

      const row = {
        titulo: parsed.titulo,
        resumo: parsed.resumo,
        link: parsed.link,
        arquivo_origem: filename,
        hash,
        embedding,
        revisado: !parsed.needsReview,
        ativo: true,
        atualizado_em: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await admin.from("planos_de_acao").update(row).eq("id", existing.id);
        if (error) return json({ status: "problem", titulo: parsed.titulo, link: parsed.link, issues: ["erro_db"], error: error.message });
        return json({ status: "updated", problem: parsed.issues.length > 0, titulo: parsed.titulo, link: parsed.link, issues: parsed.issues });
      } else {
        const { error } = await admin.from("planos_de_acao").insert(row);
        if (error) return json({ status: "problem", titulo: parsed.titulo, link: parsed.link, issues: ["erro_db"], error: error.message });
        return json({ status: "imported", problem: parsed.issues.length > 0, titulo: parsed.titulo, link: parsed.link, issues: parsed.issues });
      }
    }

    // ---- UPDATE: editar + re-embeddar ----
    if (action === "update") {
      const { id, titulo, resumo, link, ativo } = body;
      if (!id) return json({ error: "id ausente" }, 400);
      const embedding = await embed(`${titulo ?? ""} ${resumo ?? ""}`.trim() || String(titulo ?? ""));
      const { error } = await admin.from("planos_de_acao").update({
        titulo, resumo, link, ativo, embedding, revisado: true, atualizado_em: new Date().toISOString(),
      }).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // ---- REINDEX: re-embeddar todas ----
    if (action === "reindex") {
      const { data: rows, error } = await admin.from("planos_de_acao").select("id, titulo, resumo");
      if (error) return json({ error: error.message }, 500);
      let count = 0;
      await mapWithConcurrency(rows ?? [], 5, async (r: any) => {
        try {
          const embedding = await embed(`${r.titulo ?? ""} ${r.resumo ?? ""}`.trim() || String(r.titulo ?? ""));
          await admin.from("planos_de_acao").update({ embedding, atualizado_em: new Date().toISOString() }).eq("id", r.id);
          count++;
        } catch (e) {
          console.error("reindex falhou para", r.id, e instanceof Error ? e.message : e);
        }
      });
      return json({ ok: true, reindexed: count, total: rows?.length ?? 0 });
    }

    // ---- SEARCH: busca de teste (com score) ----
    if (action === "search") {
      const query = String(body.query ?? "").trim();
      if (!query) return json({ error: "query ausente" }, 400);
      const embedding = await embed(query);
      const threshold = body.threshold != null ? Number(body.threshold) : MATCH_THRESHOLD;
      const count = body.count != null ? Number(body.count) : MATCH_COUNT;
      const { data, error } = await admin.rpc("match_planos_de_acao", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: count,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ results: data ?? [], threshold, count });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (e) {
    console.error("planos-acao-admin error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
