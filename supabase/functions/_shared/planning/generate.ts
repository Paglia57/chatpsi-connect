// Geração reutilizável do plano de sessão. Usada pela Edge Function plan-session (web) e
// pela máquina do WhatsApp. Monta o plano a partir do histórico do paciente + direção
// opcional do psicólogo, com a persona "planejamento_sessao" (system) e materiais reais do
// catálogo (pgvector). Tom de sugestão (definido na persona). Nunca inventa links.

import { getPersona } from "../personas/resolve.ts";
import { embed } from "../llm/embeddings.ts";
import { defaultModel } from "../llm/config.ts";

const OPENAI_BASE = "https://api.openai.com/v1";
const MATCH_THRESHOLD = Number(Deno.env.get("PLANO_MATCH_THRESHOLD") ?? "0.35");

export interface SessionPlanFields {
  objetivo: string;
  roteiro: string;
  tecnicas: string;
  atencao: string;
  perguntas: string;
}

async function chatJSON(system: string, user: string, model: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada no ambiente");
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI chat error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "{}";
}

/** Gera o rascunho do plano da próxima sessão de um paciente. */
export async function generateSessionPlan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  patientId: string,
  direction?: string,
): Promise<SessionPlanFields> {
  // 1. Ficha + histórico do paciente.
  const { data: patient } = await supabase
    .from("patients").select("full_name, initials, approach, main_complaint")
    .eq("id", patientId).eq("user_id", userId).maybeSingle();
  if (!patient) throw new Error("Paciente não encontrado");

  const { data: evos } = await supabase
    .from("evolutions").select("output_content, created_at")
    .eq("patient_id", patientId).eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(5);
  const historico = (evos ?? []).slice().reverse()
    .map((e: any) => `(${(e.created_at ?? "").slice(0, 10)}) ${(e.output_content ?? "").slice(0, 800)}`)
    .join("\n---\n") || "Sem evoluções anteriores.";

  // 2. Materiais reais do catálogo (pgvector) — links nunca inventados.
  let materiais = "";
  try {
    const theme = (direction || patient.main_complaint || patient.approach || "").trim();
    if (theme) {
      const emb = await embed(theme);
      const { data: matches } = await supabase.rpc("match_planos_de_acao", {
        query_embedding: emb, match_threshold: MATCH_THRESHOLD, match_count: 3,
      });
      if (matches && matches.length) {
        materiais = "\n\nMateriais sugeridos (catálogo):\n" +
          matches.map((m: any) => `- ${m.titulo}: ${m.link}`).join("\n");
      }
    }
  } catch (e) {
    console.warn("Busca de materiais no catálogo falhou:", e instanceof Error ? e.message : e);
  }

  // 3. Geração estruturada (JSON) com a persona de planejamento.
  const system = await getPersona("planejamento_sessao");
  const userPrompt =
    `PACIENTE: ${patient.initials ?? ""} — abordagem: ${patient.approach ?? "não informada"} — queixa: ${patient.main_complaint ?? "não informada"}.\n\n` +
    `HISTÓRICO RECENTE (mais antigo → mais recente):\n${historico}\n\n` +
    (direction ? `DIRECIONAMENTO DO PSICÓLOGO:\n${direction}\n\n` : "") +
    `Gere o plano da próxima sessão em JSON com as chaves objetivo, roteiro, tecnicas, atencao, perguntas.`;

  const fields: SessionPlanFields = { objetivo: "", roteiro: "", tecnicas: "", atencao: "", perguntas: "" };
  try {
    const raw = await chatJSON(system, userPrompt, defaultModel());
    const parsed = JSON.parse(raw);
    fields.objetivo = String(parsed.objetivo ?? "");
    fields.roteiro = String(parsed.roteiro ?? "");
    fields.tecnicas = String(parsed.tecnicas ?? "");
    fields.atencao = String(parsed.atencao ?? "");
    fields.perguntas = String(parsed.perguntas ?? "");
  } catch (e) {
    console.error("Falha ao gerar/parsear o plano:", e instanceof Error ? e.message : e);
    fields.objetivo = "Não consegui estruturar o plano automaticamente. Tente regenerar ou preencha manualmente.";
  }

  if (materiais) fields.tecnicas = `${fields.tecnicas}${materiais}`.trim();
  return fields;
}
