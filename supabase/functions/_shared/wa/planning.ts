// Planejamento de sessão no WhatsApp. Paciente travado → gera o plano (a partir do
// histórico + direção opcional), mostra PRÉVIA + [Salvar · Ajustar · Cancelar] (regra de
// ouro), e salva em session_plans. Reaproveita generateSessionPlan.

import { sendButtons, sendText } from "./messaging.ts";
import { type Patient, patchSession } from "./repo.ts";
import { generateSessionPlan } from "../planning/generate.ts";

export const PL_SAVE = "pl_save";
export const PL_ADJUST = "pl_adjust";
export const PL_CANCEL = "pl_cancel";

type PlInput = { kind: string; text: string; replyId?: string };
type Session = { mode?: string | null; flow_step?: string | null; flow_data?: Record<string, unknown> | null } | null;

export interface PlanningCtx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  phone: string;
  userId: string;
  displayName: string;
  session: Session;
  input: PlInput;
}

interface PendingPlan {
  patient_id: string;
  patient_name: string;
  objetivo: string;
  roteiro: string;
  tecnicas: string;
  atencao: string;
  perguntas: string;
  direction: string | null;
  input_type: "texto" | "audio" | null;
}

function previewText(p: PendingPlan): string {
  return [
    `*Plano da próxima sessão — ${p.patient_name}*`,
    "",
    `*Objetivo:* ${p.objetivo || "—"}`,
    "",
    `*Roteiro:* ${p.roteiro || "—"}`,
    "",
    `*Técnicas/materiais:* ${p.tecnicas || "—"}`,
    "",
    `*Atenção:* ${p.atencao || "—"}`,
    "",
    `*Perguntas:* ${p.perguntas || "—"}`,
  ].join("\n");
}

async function runAndPreview(ctx: PlanningCtx, patientId: string, patientName: string, direction: string | null, inputType: "texto" | "audio" | null) {
  await sendText(ctx.phone, "Gerando o plano da próxima sessão… um instante. 📝");
  let fields;
  try {
    fields = await generateSessionPlan(ctx.supabase, ctx.userId, patientId, direction ?? undefined);
  } catch (e) {
    console.error("Erro ao gerar plano (WA):", e instanceof Error ? e.message : e);
    await sendText(ctx.phone, "Não consegui gerar o plano agora. Tente novamente em instantes.");
    return;
  }
  const pending: PendingPlan = {
    patient_id: patientId, patient_name: patientName,
    objetivo: fields.objetivo, roteiro: fields.roteiro, tecnicas: fields.tecnicas,
    atencao: fields.atencao, perguntas: fields.perguntas,
    direction: direction ?? null, input_type: inputType,
  };
  await patchSession(ctx.supabase, ctx.phone, { mode: "planning", flow_step: "preview", flow_data: pending as unknown as Record<string, unknown> });
  await sendText(ctx.phone, previewText(pending));
  await sendText(ctx.phone, "_Sugestão de rascunho — você revisa e edita. A responsabilidade clínica é sua._");
  await sendButtons(ctx.phone, "Salvar este plano?", [
    { id: PL_SAVE, title: "Salvar" },
    { id: PL_ADJUST, title: "Ajustar" },
    { id: PL_CANCEL, title: "Cancelar" },
  ]);
}

/** Inicia o planejamento para o paciente travado (texto/áudio de direcionamento opcional). */
export async function startPlanning(ctx: PlanningCtx, patient: Patient, rawText?: string): Promise<void> {
  const inputType: "texto" | "audio" | null = ctx.input.kind === "audio" ? "audio" : (rawText ? "texto" : null);
  // Remove o verbo de comando para deixar só o direcionamento.
  const direction = (rawText ?? "")
    .replace(/^\s*(planeja(r)?)\b/i, "")
    .replace(/\ba pr[oó]xima sess[aã]o\b/i, "")
    .replace(/\bsess[aã]o\b/i, "")
    .trim() || null;
  await runAndPreview(ctx, patient.id, patient.full_name, direction, inputType);
}

/** Continua um planejamento em andamento (mode==='planning'). Retorna true se tratou. */
export async function continuePlanning(ctx: PlanningCtx): Promise<boolean> {
  const step = ctx.session?.flow_step ?? null;
  const data = (ctx.session?.flow_data ?? {}) as Record<string, any>;
  if (step === "adjust" && data.patient_id) {
    const inputType: "texto" | "audio" | null = ctx.input.kind === "audio" ? "audio" : "texto";
    await runAndPreview(ctx, data.patient_id, data.patient_name ?? "", (ctx.input.text ?? "").trim() || null, inputType);
    return true;
  }
  return false;
}

/** Trata os botões do planejamento. Retorna true se tratou. */
export async function handlePlanningReply(ctx: PlanningCtx, replyId: string): Promise<boolean> {
  const data = (ctx.session?.flow_data ?? {}) as unknown as PendingPlan;

  if (replyId === PL_ADJUST) {
    await patchSession(ctx.supabase, ctx.phone, { mode: "planning", flow_step: "adjust", flow_data: data as unknown as Record<string, unknown> });
    await sendText(ctx.phone, "O que você quer ajustar? (ex.: \"foca na ansiedade no trabalho\" ou mande um áudio)");
    return true;
  }
  if (replyId === PL_CANCEL) {
    await patchSession(ctx.supabase, ctx.phone, { mode: "paciente", flow_step: null, flow_data: null });
    await sendText(ctx.phone, "Plano descartado. Nada foi salvo.");
    return true;
  }
  if (replyId === PL_SAVE) {
    if (!data?.patient_id) { await sendText(ctx.phone, "Não há plano pendente para salvar."); return true; }
    const { error } = await ctx.supabase.from("session_plans").insert({
      user_id: ctx.userId,
      patient_id: data.patient_id,
      objetivo: data.objetivo, roteiro: data.roteiro, tecnicas: data.tecnicas,
      atencao: data.atencao, perguntas: data.perguntas,
      input_type: data.input_type ?? null,
      input_content: data.direction ?? null,
      status: "salvo",
    });
    await patchSession(ctx.supabase, ctx.phone, { mode: "paciente", flow_step: null, flow_data: null });
    if (error) {
      console.error("Erro ao salvar session_plan (WA):", error.message);
      await sendText(ctx.phone, "Não consegui salvar o plano agora. Tente novamente.");
    } else {
      await sendText(ctx.phone, `✅ Plano salvo para *${data.patient_name}*. Ele aparece no painel web e será oferecido na próxima evolução.`);
    }
    return true;
  }
  return false;
}
