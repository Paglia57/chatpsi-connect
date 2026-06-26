// Embeddings e completions auxiliares, isolados para serem trocáveis de provedor depois.
// Usados pelo catálogo de planos de ação (pgvector) e pela extração/condensação de resumo.

import { defaultModel } from "./config.ts";

const OPENAI_BASE = "https://api.openai.com/v1";
const EMBED_MODEL = "text-embedding-3-small"; // 1536 dimensões

function apiKey(): string {
  const k = Deno.env.get("OPENAI_API_KEY");
  if (!k) throw new Error("OPENAI_API_KEY não configurada no ambiente");
  return k;
}

/** Gera o embedding de um texto (vetor de 1536 floats). */
export async function embed(text: string): Promise<number[]> {
  const input = (text ?? "").slice(0, 8000); // teto de segurança
  const res = await fetch(`${OPENAI_BASE}/embeddings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI embeddings error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const vec = data?.data?.[0]?.embedding;
  if (!Array.isArray(vec)) throw new Error("Embedding inválido retornado pela OpenAI");
  return vec as number[];
}

/** Completion simples (texto → texto), para condensar/gerar resumo de fallback. */
export async function complete(prompt: string, opts?: { model?: string }): Promise<string> {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts?.model ?? defaultModel(),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI chat error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
