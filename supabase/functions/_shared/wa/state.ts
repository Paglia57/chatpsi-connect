// Máquina de estado da conversa WhatsApp-first — v2.
// Implementa docs/specs/maquina-de-estado-chatpsi-whatsapp-v2.md.
//
// Ordem do pipeline de uma mensagem (spec §11):
//   Camada 0 (comando vence estado) → expiração 24h (preserva rascunho) →
//   resolução de contexto → execução → gravação SOMENTE via padrão de captura.
//
// Duas regras de ouro:
//   1) Comando vence estado: a Camada 0 roda antes de qualquer sub-fluxo; em rascunho, na dúvida
//      o sistema PERGUNTA (2 botões), nunca adivinha, nunca perde o rascunho.
//   2) Nada grava sem prévia: evolução, edição e cadastro passam por rascunho → prévia (com o nome
//      do paciente no topo) → confirmação. Conversar nunca tem efeito colateral.
//
// Isolamento por psicólogo (LGPD): TODA leitura/escrita de patients/evolutions usa o userId
// (= profiles.user_id) resolvido pelo webhook. `allowed` (allowlist de teste) trava SOMENTE a
// gravação pós-confirmação — a prévia é sempre mostrada.

import { sendButtons, sendList, sendText } from './messaging.ts';
import {
  bumpPatientSession,
  getEvolutionById,
  getPatientById,
  getSession,
  insertEvolution,
  insertPatient,
  listActivePatients,
  listEvolutionsForPatient,
  logWaMessage,
  patchSession,
  type Patient,
  recentEvolutions,
  searchPatientsByName,
  softDeleteEvolution,
  updateEvolutionContent,
  updatePatient,
  uploadSessionAudio,
} from './repo.ts';
import { chat, type ChatResult, type ChatTool } from '../llm/index.ts';
import { planoDeAcao } from '../tools/planoDeAcao.ts';
import { buscarArtigos } from '../tools/buscarArtigos.ts';

import * as ids from './v2/ids.ts';
import { normalizeText } from './v2/normalize.ts';
import { type CommandName, matchCommand, REQUIRES_PATIENT } from './v2/commands.ts';
import { resolveSelection } from './v2/selection.ts';
import { isPreviewTrigger } from './v2/drafts.ts';
import {
  type Draft,
  type FlowData,
  joinParts,
  type NameCandidate,
  readFlow,
} from './v2/draftState.ts';
import { buildCadastroPreview, buildEvolutionPreview, buildPatientEditPreview, type PreviewMessage } from './v2/preview.ts';
import { classifyMatches, findMentionedPatients } from './v2/nameResolver.ts';
import { evaluateExpiry } from './v2/expiry.ts';
import { type EvoRow, formatDeleteConfirmation, formatEvolutionList } from './v2/evolutionsMachine.ts';

const CLINICAL_ASSISTANT_ID = 'asst_ghTrVWfzgh5vtW28qDs5MnRB';
const MAX_LIST = 10;

// Campos do paciente editáveis pelo WhatsApp, com rótulo amigável.
const EDITABLE_FIELDS: Record<string, string> = {
  full_name: 'Nome',
  initials: 'Iniciais',
  approach: 'Abordagem',
  main_complaint: 'Queixa',
};

// Comandos de leitura: podem executar dentro de um rascunho (na desambiguação) e retomar a captura.
const READONLY_COMMANDS = new Set<CommandName>(['historico', 'ficha', 'ajuda', 'acoes']);

export interface ConversationInput {
  kind: 'text' | 'audio' | 'image' | 'document' | 'interactive';
  text: string;
  replyId?: string;
  audio?: { bytes: Uint8Array; mimeType: string };
}

// Seam de injeção para testes: emissores de mensagem e o gateway de IA.
export interface Io {
  sendText: typeof sendText;
  sendButtons: typeof sendButtons;
  sendList: typeof sendList;
}
export type ChatFn = (opts: Parameters<typeof chat>[0]) => Promise<ChatResult>;
const defaultIo: Io = { sendText, sendButtons, sendList };

function clinicalTools(): ChatTool[] {
  return [
    { name: 'plano_de_acao', handler: (a) => planoDeAcao({ user_query: String(a.user_query ?? '') }) },
    { name: 'buscar_artigos', handler: (a) => buscarArtigos({ user_query: String(a.user_query ?? '') }) },
  ];
}

/** dd/mm de hoje, para o cabeçalho da prévia de evolução. */
function todayLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function handleConversation(opts: {
  supabase: any;
  phone: string;
  userId: string;
  displayName: string;
  allowed: boolean;
  input: ConversationInput;
  io?: Io;
  chatFn?: ChatFn;
}): Promise<void> {
  const { supabase, phone, userId, displayName, allowed, input } = opts;
  const io = opts.io ?? defaultIo;
  const chatFn = opts.chatFn ?? chat;

  const session = await getSession(supabase, phone);
  const mode = session?.mode ?? null;
  const subState = session?.sub_state ?? null;
  const lockedId = session?.locked_patient_id ?? null;
  const flow: FlowData = readFlow(session?.flow_data);

  // Log da mensagem do usuário (entrada).
  await logWaMessage(
    supabase,
    phone,
    'user',
    input.kind === 'interactive' ? `[opção] ${input.replyId ?? ''}` : (input.text || '(vazio)'),
  );

  // ---------- helpers de persistência ----------

  const persist = (patch: Record<string, unknown>) => patchSession(supabase, phone, patch);
  // saveFlow MUTA o objeto `flow` do turno e persiste o objeto vivo. Isso evita que dois helpers
  // do mesmo turno (ex.: setar pendingIntent e depois listar pacientes), ambos partindo do mesmo
  // snapshot de flow_data, sobrescrevam um ao outro — patchSession faz upsert do jsonb inteiro.
  const saveFlow = (next: FlowData, patch: Record<string, unknown> = {}) => {
    Object.assign(flow, next);
    return persist({ flow_data: flow, ...patch });
  };

  // ---------- helpers de envio ----------

  const sendPreview = async (pm: PreviewMessage, caption: string) => {
    await io.sendText(phone, pm.text);
    await io.sendButtons(phone, caption, pm.buttons);
  };

  const sendMenu = async () => {
    await persist({
      mode: 'menu', kind: 'clinico', locked_patient_id: null,
      sub_state: 'idle', flow_step: null, flow_data: {}, last_intent: null,
    });
    await io.sendButtons(phone, `Olá, ${displayName}! O que vamos fazer?`, [
      { id: ids.MENU_CHOOSE, title: 'Escolher paciente' },
      { id: ids.MENU_CREATE, title: 'Cadastrar paciente' },
      { id: ids.MENU_FREE, title: 'Falar sem paciente' },
    ]);
  };

  const sendPatientMenu = async (patient: Patient) => {
    await io.sendList(
      phone,
      `Contexto: *${patient.full_name}*. O que vamos fazer?`,
      'Ver ações',
      [
        { id: ids.PT_EVOLUTION, title: 'Nova evolução' },
        { id: ids.PT_EVOLUTIONS, title: 'Evoluções' },
        { id: ids.PT_PLAN, title: 'Plano' },
        { id: ids.PT_VIEW, title: 'Consultar ficha' },
        { id: ids.PT_EDIT, title: 'Editar paciente' },
        { id: ids.MENU_EXIT, title: '↩ Trocar / Menu' },
      ],
      'Ações do paciente',
    );
  };

  const lockPatient = async (patient: Patient, extra: Partial<FlowData> = {}) => {
    await persist({
      mode: 'paciente', kind: 'clinico', locked_patient_id: patient.id,
      sub_state: 'idle', flow_step: null, last_intent: null,
      flow_data: { ...extra },
    });
  };

  const exitContext = async () => {
    if (mode === 'cadastro' || flow.draft?.target === 'cadastro') await io.sendText(phone, 'Cadastro cancelado.');
    await sendMenu();
  };

  // ---------- helpers de leitura ----------

  const loadLockedPatient = async (): Promise<Patient | null> =>
    lockedId ? await getPatientById(supabase, userId, lockedId) : null;

  const showPatientList = async () => {
    const patients = await listActivePatients(supabase, userId, 50);
    if (patients.length === 0) {
      await io.sendText(phone, 'Você ainda não tem pacientes cadastrados. Toque em "Cadastrar paciente" para criar a primeira ficha.');
      return;
    }
    const candidates: NameCandidate[] = patients.map((p) => ({ id: p.id, full_name: p.full_name, initials: p.initials }));
    await saveFlow({ ...flow, patientList: candidates }, { sub_state: 'choose_patient', mode: 'menu' });
    if (patients.length > MAX_LIST) {
      const linhas = patients.map((p, i) => `${i + 1}. ${p.full_name}${p.initials ? ` (${p.initials})` : ''}`).join('\n');
      await io.sendText(phone, `Você tem ${patients.length} pacientes:\n\n${linhas}\n\nResponda com o *número* ou o *nome*.`);
      return;
    }
    await io.sendList(
      phone, 'Selecione o paciente:', 'Ver pacientes',
      patients.map((p) => ({ id: `${ids.PATIENT_PREFIX}${p.id}`, title: p.full_name, description: p.initials })),
    );
  };

  const showHistory = async (patient: Patient) => {
    const evos = await recentEvolutions(supabase, userId, patient.id, 5);
    if (evos.length === 0) {
      await io.sendText(phone, `Ainda não há evoluções registradas para *${patient.full_name}*.`);
      return;
    }
    const lines = evos.map((e) => {
      const date = (e.created_at ?? '').slice(0, 10);
      const sn = e.session_number ? `· sessão ${e.session_number}` : '';
      const snippet = (e.output_content ?? '').replace(/\s+/g, ' ').slice(0, 180);
      return `📂 ${date} ${sn}\n${snippet}…`;
    });
    await io.sendText(phone, `Histórico recente de *${patient.full_name}*:\n\n${lines.join('\n\n')}`);
  };

  const showPatientDetails = async (patient: Patient) => {
    await io.sendText(phone, [
      `📋 *Ficha do paciente*`, ``,
      `*Nome:* ${patient.full_name}`,
      `*Iniciais:* ${patient.initials || '—'}`,
      `*Abordagem:* ${patient.approach || '—'}`,
      `*Queixa:* ${patient.main_complaint || '—'}`,
      `*Sessões:* ${patient.total_sessions ?? 0}`,
    ].join('\n'));
  };

  // ---------- padrão de captura: abrir rascunhos ----------

  const openEvolutionDraft = async (patient: Patient, seedText?: string) => {
    const draft: Draft = { target: 'new_evolution', patientId: patient.id, parts: [] };
    if (seedText && seedText.trim()) draft.parts.push({ kind: 'text', text: seedText.trim() });
    await saveFlow({ ...flow, draft, pendingCommand: undefined }, { sub_state: 'draft_capturing', mode: 'paciente' });
    await io.sendButtons(
      phone,
      `Pode ditar ou escrever o relato da sessão de *${patient.full_name}* (em quantas mensagens quiser). Quando terminar, toque em *Gerar prévia* ou diga "pronto".`,
      [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }],
    );
  };

  const openCadastro = async () => {
    const draft: Draft = { target: 'cadastro', parts: [], cadastro: {}, cadastroStep: 'nome' };
    await saveFlow({ ...flow, draft }, { sub_state: 'draft_capturing', mode: 'cadastro', locked_patient_id: null });
    await io.sendText(phone, 'Vamos cadastrar um paciente. Qual é o *nome completo* dele(a)? (digite "voltar" para corrigir um passo)');
  };

  const openPatientEdit = async (patient: Patient, field: string) => {
    const draft: Draft = { target: 'edit_patient', patientId: patient.id, field, parts: [] };
    await saveFlow({ ...flow, draft }, { sub_state: 'draft_capturing', mode: 'paciente' });
    await io.sendText(phone, `Envie o novo valor para *${EDITABLE_FIELDS[field]}*:`);
  };

  const openEvolutionEdit = async (patient: Patient, evoId: string, baseText: string) => {
    const draft: Draft = { target: 'edit_evolution', patientId: patient.id, evolutionId: evoId, baseText, parts: [] };
    await saveFlow({ ...flow, draft, selectedEvolutionId: undefined }, { sub_state: 'draft_capturing', mode: 'paciente' });
    await io.sendButtons(
      phone,
      'O que você quer ajustar nesta evolução? Pode ditar/escrever o ajuste; depois toque em *Gerar prévia*.',
      [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }],
    );
  };

  // ---------- padrão de captura: acumular ----------

  const accumulate = async (draft: Draft) => {
    let audioPath: string | null | undefined = undefined;
    if (input.kind === 'audio' && input.audio && allowed) {
      audioPath = await uploadSessionAudio(supabase, userId, input.audio.bytes, input.audio.mimeType);
    }
    draft.parts.push({ kind: input.kind, text: input.text ?? '', audioPath: audioPath ?? null });
    if (input.kind === 'audio') {
      draft.inputType = 'audio';
      if (!draft.audioPath && audioPath) draft.audioPath = audioPath;
    }
    await saveFlow({ ...flow, draft }, { sub_state: 'draft_capturing' });
  };

  // ---------- padrão de captura: gerar prévia ----------

  const generateEvolutionPreview = async (draft: Draft) => {
    const patient = await getPatientById(supabase, userId, draft.patientId!);
    if (!patient) { await sendMenu(); return; }
    const relato = joinParts(draft.parts);
    if (relato.trim().length < 3) {
      await io.sendText(phone, 'Ainda não recebi o relato. Pode ditar ou escrever o que aconteceu na sessão.');
      return;
    }

    const evos = await recentEvolutions(supabase, userId, patient.id, 5);
    const history = evos.length
      ? evos.slice().reverse().map((e) => `(${(e.created_at ?? '').slice(0, 10)}) ${(e.output_content ?? '').slice(0, 600)}`).join('\n---\n')
      : 'Sem evoluções anteriores.';

    const base = draft.target === 'edit_evolution'
      ? `Texto ATUAL da evolução (edite conforme o ajuste pedido, mantendo o que não foi alterado):\n${draft.baseText ?? ''}\n\nAJUSTE PEDIDO:\n${relato}`
      : `HISTÓRICO RECENTE (mais antigo → mais recente):\n${history}\n\nNOVO RELATO DA SESSÃO:\n${relato}`;

    const userText =
      `Gere uma evolução clínica para o paciente de iniciais ${patient.initials} ` +
      `(abordagem: ${patient.approach ?? 'não informada'}), coerente com o histórico.\n\n${base}`;

    const result = await chatFn({ task: 'clinico', assistantId: CLINICAL_ASSISTANT_ID, userText, tools: clinicalTools() });

    draft.previewText = result.text;
    await saveFlow({ ...flow, draft }, { sub_state: 'draft_await_preview_confirm' });
    const pm = buildEvolutionPreview({ patientName: patient.full_name, dateLabel: todayLabel(), body: result.text });
    await sendPreview(pm, 'Confira a evolução acima. O que deseja?');
  };

  const generatePatientEditPreview = async (draft: Draft) => {
    const patient = await getPatientById(supabase, userId, draft.patientId!);
    if (!patient) { await sendMenu(); return; }
    const value = joinParts(draft.parts).trim();
    if (value.length < 1) {
      await io.sendText(phone, `Não recebi o novo valor para *${EDITABLE_FIELDS[draft.field!]}*. Tente novamente.`);
      return;
    }
    const oldValue = String((patient as any)[draft.field!] ?? '');
    draft.previewText = value;
    await saveFlow({ ...flow, draft }, { sub_state: 'draft_await_preview_confirm' });
    const pm = buildPatientEditPreview({ patientName: patient.full_name, fieldLabel: EDITABLE_FIELDS[draft.field!], oldValue, newValue: value });
    await sendPreview(pm, 'Confirmar a alteração?');
  };

  const generateCadastroPreview = async (draft: Draft) => {
    const c = draft.cadastro ?? {};
    await saveFlow({ ...flow, draft }, { sub_state: 'draft_await_preview_confirm' });
    const pm = buildCadastroPreview({
      full_name: c.full_name ?? '', initials: c.initials ?? '', approach: c.approach ?? '', main_complaint: c.main_complaint ?? '',
    });
    await sendPreview(pm, 'Confirmar o cadastro?');
  };

  // ---------- padrão de captura: confirmar (gravação) ----------

  const saveEvolution = async (draft: Draft) => {
    const patient = await getPatientById(supabase, userId, draft.patientId!);
    if (!patient) { await sendMenu(); return; }
    const text = draft.previewText ?? '';
    if (!allowed) {
      await io.sendText(phone, '_(Modo teste: esta evolução não foi salva no prontuário porque seu número não está na allowlist.)_');
      await persist({ sub_state: 'idle', flow_data: { ...flow, draft: undefined } });
      await sendPatientMenu(patient);
      return;
    }
    if (draft.target === 'edit_evolution' && draft.evolutionId) {
      await updateEvolutionContent(supabase, userId, draft.evolutionId, text, joinParts(draft.parts), phone);
      await io.sendText(phone, '✅ Evolução atualizada (e já reflete na web).');
    } else {
      await insertEvolution(supabase, {
        user_id: userId,
        patient_id: patient.id,
        patient_initials: patient.initials,
        input_type: draft.inputType === 'audio' ? 'audio' : 'text',
        input_content: joinParts(draft.parts),
        output_content: text,
        approach: patient.approach,
        audio_url: draft.audioPath ?? null,
      });
      await bumpPatientSession(supabase, patient);
      await io.sendText(phone, '✅ Evolução salva na ficha (e já aparece na web).');
    }
    await persist({ sub_state: 'idle', flow_data: { ...flow, draft: undefined } });
    await sendPatientMenu(patient);
  };

  const savePatientEdit = async (draft: Draft) => {
    const patient = await getPatientById(supabase, userId, draft.patientId!);
    if (!patient) { await sendMenu(); return; }
    if (!allowed) {
      await io.sendText(phone, '_(Modo teste: a alteração não foi salva porque seu número não está na allowlist.)_');
      await persist({ sub_state: 'idle', flow_data: { ...flow, draft: undefined } });
      await sendPatientMenu(patient);
      return;
    }
    const updated = await updatePatient(supabase, userId, patient.id, { [draft.field!]: draft.previewText ?? '' });
    await persist({ sub_state: 'idle', flow_data: { ...flow, draft: undefined } });
    if (!updated) {
      await io.sendText(phone, 'Não consegui salvar a alteração agora. Tente novamente em instantes.');
      await sendPatientMenu(patient);
      return;
    }
    await io.sendText(phone, `✅ *${EDITABLE_FIELDS[draft.field!]}* atualizado(a) (e reflete na web).`);
    await sendPatientMenu(updated);
  };

  const saveCadastro = async (draft: Draft) => {
    const c = draft.cadastro ?? {};
    if (!allowed) {
      await io.sendText(phone, '_(Modo teste: o cadastro não foi salvo porque seu número não está na allowlist.)_');
      await sendMenu();
      return;
    }
    const patient = await insertPatient(supabase, {
      user_id: userId, full_name: c.full_name ?? '', initials: c.initials ?? '',
      approach: c.approach, main_complaint: c.main_complaint,
    });
    if (!patient) {
      await io.sendText(phone, 'Não consegui cadastrar o paciente agora. Tente novamente em instantes.');
      await sendMenu();
      return;
    }
    await lockPatient(patient);
    await io.sendText(phone, `Pronto! *${patient.full_name}* foi cadastrado(a) e já aparece no seu painel web.`);
    await sendPatientMenu(patient);
  };

  // ---------- sub-máquina de evoluções (spec §8) ----------

  const showEvolutionList = async (patient: Patient) => {
    const evos = await listEvolutionsForPatient(supabase, userId, patient.id, 5);
    if (evos.length === 0) {
      await io.sendText(phone, `Ainda não há evoluções registradas para *${patient.full_name}*.`);
      await sendPatientMenu(patient);
      return;
    }
    const candidates: NameCandidate[] = evos.map((e) => ({ id: e.id, full_name: (e.created_at ?? '').slice(0, 10) }));
    await saveFlow({ ...flow, evoList: candidates, selectedEvolutionId: undefined }, { sub_state: 'evo_list' });
    await io.sendList(
      phone,
      formatEvolutionList(patient.full_name, evos as EvoRow[]),
      'Ver evoluções',
      evos.map((e, i) => ({
        id: `${ids.EVO_PREFIX}${e.id}`,
        title: `${i + 1}. ${(e.created_at ?? '').slice(8, 10)}/${(e.created_at ?? '').slice(5, 7)}`,
        description: (e.output_content ?? '').replace(/\s+/g, ' ').slice(0, 60),
      })),
      'Evoluções',
    );
  };

  const showEvolutionActions = async (evoId: string) => {
    await saveFlow({ ...flow, selectedEvolutionId: evoId }, { sub_state: 'evo_selected' });
    await io.sendButtons(phone, 'O que deseja fazer com esta evolução?', [
      { id: ids.EVO_VIEW, title: 'Ver completa' },
      { id: ids.EVO_EDIT, title: 'Editar' },
      { id: ids.EVO_DELETE, title: 'Excluir' },
    ]);
  };

  // ---------- Camada 0: executar comando ----------

  const executeCommand = async (cmd: CommandName) => {
    if (cmd === 'menu') { await exitContext(); return; }

    if (REQUIRES_PATIENT[cmd] && !lockedId) {
      // Sem paciente: escolhe primeiro, executa depois.
      await saveFlow({ ...flow, pendingIntent: cmd });
      await io.sendText(phone, 'Primeiro escolha o paciente:');
      await showPatientList();
      return;
    }

    const patient = REQUIRES_PATIENT[cmd] ? await loadLockedPatient() : null;
    if (REQUIRES_PATIENT[cmd] && !patient) { await sendMenu(); return; }

    switch (cmd) {
      case 'acoes':
        if (patient) await sendPatientMenu(patient); else await sendMenu();
        return;
      case 'ajuda':
        await io.sendText(phone, [
          '*Comandos disponíveis:*',
          '• *menu* / *sair* — volta ao início',
          '• *nova evolução* — registra uma evolução (com prévia antes de salvar)',
          '• *evoluções* — listar/ver/editar/excluir evoluções',
          '• *histórico* — resumo do caso',
          '• *plano* — plano de ação',
          '• *ficha* / *editar* — consultar/editar o cadastro',
        ].join('\n'));
        return;
      case 'nova_evolucao':
        await openEvolutionDraft(patient!);
        return;
      case 'evolucoes':
        await showEvolutionList(patient!);
        return;
      case 'historico':
        await showHistory(patient!);
        return;
      case 'ficha':
        await showPatientDetails(patient!);
        return;
      case 'plano':
        await persist({ last_intent: 'plan' });
        await io.sendText(phone, 'Sobre qual tema/foco você quer o plano de ação para este paciente?');
        return;
      case 'editar':
        await io.sendList(
          phone, `O que deseja editar em *${patient!.full_name}*?`, 'Campos',
          Object.entries(EDITABLE_FIELDS).map(([field, label]) => ({ id: `${ids.EDIT_PREFIX}${field}`, title: label })),
          'Editar paciente',
        );
        return;
    }
  };

  // ---------- desambiguação de comando em rascunho ----------

  const askCommandDisambiguation = async (cmd: CommandName, raw: string) => {
    const leftLabel: Record<CommandName, string> = {
      menu: 'Ir ao menu', acoes: 'Ver ações', nova_evolucao: 'Nova evolução', evolucoes: 'Ver evoluções',
      historico: 'Ver histórico', plano: 'Ver plano', ficha: 'Ver ficha', editar: 'Editar', ajuda: 'Ver ajuda',
    };
    await saveFlow({ ...flow, pendingCommand: { command: cmd, raw } }, { sub_state: 'draft_command_disambig' });
    await io.sendButtons(phone, `"${raw}" — o que você quer?`, [
      { id: ids.DISAMBIG_COMMAND, title: leftLabel[cmd] },
      { id: ids.DISAMBIG_CONTENT, title: 'É conteúdo' },
    ]);
  };

  // ---------- MODO LIVRE / conversa (não grava) ----------

  const handleConversationalText = async (threadId?: string) => {
    const text = input.text;
    if (!text || text.trim().length < 1) {
      await io.sendText(phone, 'Pode mandar sua dúvida, um tema de estudo ou um pedido.');
      return;
    }
    const result = await chatFn({
      task: 'clinico', assistantId: CLINICAL_ASSISTANT_ID, userText: text, threadId, tools: clinicalTools(),
    });
    if (result.threadId && result.threadId !== threadId) {
      await persist({ thread_id: result.threadId, kind: 'clinico' });
    }
    await io.sendText(phone, result.text);
    await logWaMessage(supabase, phone, 'ai', result.text, result.usage);
  };

  const runPlan = async (patient: Patient) => {
    const theme = input.text;
    if (!theme || theme.trim().length < 2) {
      await io.sendText(phone, 'Sobre qual tema/foco você quer o plano de ação?');
      return;
    }
    const query = `Paciente ${patient.initials}${patient.main_complaint ? `, queixa: ${patient.main_complaint}` : ''}. Foco do plano: ${theme}`;
    const plan = await planoDeAcao({ user_query: query });
    await io.sendText(phone, plan);
    await logWaMessage(supabase, phone, 'ai', plan);
    await persist({ last_intent: null });
    await sendPatientMenu(patient);
  };

  // ---------- roteamento de respostas interativas (botões/listas) ----------

  const handleReply = async (replyId: string) => {
    // Seleção de paciente / campo / evolução (ids com prefixo).
    if (replyId.startsWith(ids.PATIENT_PREFIX)) {
      const patient = await getPatientById(supabase, userId, replyId.slice(ids.PATIENT_PREFIX.length));
      if (!patient) { await io.sendText(phone, 'Não encontrei esse paciente. Vamos recomeçar.'); await sendMenu(); return; }
      await onPatientChosen(patient);
      return;
    }
    if (replyId.startsWith(ids.EDIT_PREFIX)) {
      const field = replyId.slice(ids.EDIT_PREFIX.length);
      const patient = await loadLockedPatient();
      if (!patient || !EDITABLE_FIELDS[field]) { await sendMenu(); return; }
      await openPatientEdit(patient, field);
      return;
    }
    if (replyId.startsWith(ids.EVO_PREFIX)) {
      await showEvolutionActions(replyId.slice(ids.EVO_PREFIX.length));
      return;
    }

    switch (replyId) {
      // Menu inicial
      case ids.MENU_CHOOSE: await showPatientList(); return;
      case ids.MENU_CREATE: await openCadastro(); return;
      case ids.MENU_FREE:
        await persist({ mode: 'livre', kind: 'clinico', locked_patient_id: null, sub_state: 'idle', last_intent: null, flow_data: {} });
        await io.sendText(phone, 'Modo livre ativado. Pode mandar sua dúvida clínica, um tema de estudo ou um pedido (sem vincular a um paciente).');
        return;

      // Ações do modo paciente
      case ids.PT_EVOLUTION: { const p = await loadLockedPatient(); if (p) await openEvolutionDraft(p); else await sendMenu(); return; }
      case ids.PT_EVOLUTIONS: { const p = await loadLockedPatient(); if (p) await showEvolutionList(p); else await sendMenu(); return; }
      case ids.PT_HISTORY: { const p = await loadLockedPatient(); if (p) await showHistory(p); return; }
      case ids.PT_VIEW: { const p = await loadLockedPatient(); if (!p) { await sendMenu(); return; } await showPatientDetails(p); await sendPatientMenu(p); return; }
      case ids.PT_EDIT: { const p = await loadLockedPatient(); if (!p) { await sendMenu(); return; }
        await io.sendList(phone, `O que deseja editar em *${p.full_name}*?`, 'Campos',
          Object.entries(EDITABLE_FIELDS).map(([field, label]) => ({ id: `${ids.EDIT_PREFIX}${field}`, title: label })), 'Editar paciente');
        return; }
      case ids.PT_PLAN: { const p = await loadLockedPatient(); if (!p) { await sendMenu(); return; }
        await persist({ last_intent: 'plan' }); await io.sendText(phone, 'Sobre qual tema/foco você quer o plano de ação para este paciente?'); return; }
      case ids.MENU_EXIT: await exitContext(); return;

      // Padrão de captura
      case ids.DRAFT_PREVIEW: { const d = flow.draft; if (!d) { await sendMenu(); return; } await triggerPreview(d); return; }
      case ids.DRAFT_SAVE: { const d = flow.draft; if (!d) { await sendMenu(); return; } await confirmDraft(d); return; }
      case ids.DRAFT_ADJUST: { const d = flow.draft; if (!d) { await sendMenu(); return; }
        await saveFlow({ ...flow, draft: { ...d, previewText: undefined } }, { sub_state: 'draft_capturing' });
        await io.sendButtons(phone, 'Pode complementar ou corrigir o relato. Depois toque em *Gerar prévia*.', [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }]);
        return; }
      case ids.DRAFT_CANCEL: { const p = await loadLockedPatient();
        await persist({ sub_state: 'idle', flow_data: { ...flow, draft: undefined } });
        await io.sendText(phone, 'Rascunho descartado.');
        if (p) await sendPatientMenu(p); else await sendMenu(); return; }
      case ids.DRAFT_RESUME: { const d = flow.draft; if (!d) { await sendMenu(); return; }
        await saveFlow({ ...flow, pendingCommand: undefined }, { sub_state: 'draft_capturing' });
        await io.sendButtons(phone, 'Voltando ao seu rascunho. Pode continuar ou toque em *Gerar prévia*.', [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }]); return; }

      // Confirmações específicas
      case ids.PATIENT_EDIT_CONFIRM: { const d = flow.draft; if (d?.target === 'edit_patient') await savePatientEdit(d); else await sendMenu(); return; }
      case ids.PATIENT_EDIT_CANCEL: case ids.CADASTRO_CANCEL: { const p = await loadLockedPatient();
        await persist({ sub_state: 'idle', mode: p ? 'paciente' : 'menu', flow_data: { ...flow, draft: undefined } });
        await io.sendText(phone, 'Operação cancelada.'); if (p) await sendPatientMenu(p); else await sendMenu(); return; }
      case ids.CADASTRO_CREATE: { const d = flow.draft; if (d?.target === 'cadastro') await saveCadastro(d); else await sendMenu(); return; }
      case ids.CADASTRO_FIX: { const d = flow.draft; if (d?.target === 'cadastro') {
        await saveFlow({ ...flow, draft: { ...d, cadastroStep: 'nome' } }, { sub_state: 'draft_capturing', mode: 'cadastro' });
        await io.sendText(phone, 'Vamos corrigir. Qual é o *nome completo*?'); } else await sendMenu(); return; }

      // Desambiguação de comando em rascunho
      case ids.DISAMBIG_COMMAND: await resolveDisambiguation('command'); return;
      case ids.DISAMBIG_CONTENT: await resolveDisambiguation('content'); return;

      // Sub-máquina de evoluções
      case ids.EVO_VIEW: { const id = flow.selectedEvolutionId; if (!id) { await sendMenu(); return; }
        const evo = await getEvolutionById(supabase, userId, id);
        if (evo) await io.sendText(phone, evo.output_content ?? '(evolução vazia)');
        await showEvolutionActions(id); return; }
      case ids.EVO_EDIT: { const id = flow.selectedEvolutionId; const p = await loadLockedPatient(); if (!id || !p) { await sendMenu(); return; }
        const evo = await getEvolutionById(supabase, userId, id); if (!evo) { await sendMenu(); return; }
        await openEvolutionEdit(p, id, evo.output_content ?? ''); return; }
      case ids.EVO_DELETE: { const id = flow.selectedEvolutionId; if (!id) { await sendMenu(); return; }
        const evo = await getEvolutionById(supabase, userId, id); if (!evo) { await sendMenu(); return; }
        await saveFlow({ ...flow, selectedEvolutionId: id }, { sub_state: 'evo_delete_confirm' });
        await io.sendButtons(phone, formatDeleteConfirmation(evo as EvoRow), [
          { id: ids.EVO_DELETE_CONFIRM, title: 'Excluir' }, { id: ids.EVO_DELETE_CANCEL, title: 'Cancelar' },
        ]); return; }
      case ids.EVO_DELETE_CONFIRM: { const id = flow.selectedEvolutionId; const p = await loadLockedPatient(); if (!id) { await sendMenu(); return; }
        if (!allowed) { await io.sendText(phone, '_(Modo teste: exclusão não aplicada — número fora da allowlist.)_'); }
        else { const ok = await softDeleteEvolution(supabase, userId, id, phone);
          await io.sendText(phone, ok ? '🗑️ Evolução excluída (sumiu da web; registro preservado para auditoria).' : 'Não consegui excluir agora.'); }
        await saveFlow({ ...flow, selectedEvolutionId: undefined }, { sub_state: 'idle' });
        if (p) await showEvolutionList(p); else await sendMenu(); return; }
      case ids.EVO_DELETE_CANCEL: case ids.EVO_BACK: { const p = await loadLockedPatient();
        await saveFlow({ ...flow, selectedEvolutionId: undefined }, { sub_state: 'idle' });
        if (p) await showEvolutionList(p); else await sendMenu(); return; }

      // Resolução de nome (nenhuma correspondência)
      case ids.NAME_CREATE: await openCadastro(); return;
      case ids.NAME_CHOOSE: await showPatientList(); return;
      case ids.NAME_MENU: await sendMenu(); return;

      // Expiração preservando rascunho
      case ids.EXPIRY_RESUME: { const d = flow.draft; if (!d) { await sendMenu(); return; }
        await saveFlow({ ...flow }, { sub_state: 'draft_capturing' });
        await io.sendButtons(phone, 'Retomando seu rascunho. Pode continuar ou toque em *Gerar prévia*.', [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }]); return; }
      case ids.EXPIRY_DISCARD: await sendMenu(); return;

      default: await sendMenu();
    }
  };

  // Quando um paciente é escolhido (lista/atalho): trava e, se havia um comando pendente, executa.
  const onPatientChosen = async (patient: Patient) => {
    const intent = flow.pendingIntent as CommandName | undefined;
    await lockPatient(patient);
    if (intent) {
      // Recarrega contexto local mínimo: executa o comando agora com o paciente travado.
      await runIntentForPatient(intent, patient);
      return;
    }
    await sendPatientMenu(patient);
  };

  const runIntentForPatient = async (cmd: CommandName, patient: Patient) => {
    switch (cmd) {
      case 'nova_evolucao': await openEvolutionDraft(patient); return;
      case 'evolucoes': await showEvolutionList(patient); return;
      case 'historico': await showHistory(patient); await sendPatientMenu(patient); return;
      case 'ficha': await showPatientDetails(patient); await sendPatientMenu(patient); return;
      case 'plano': await persist({ last_intent: 'plan' }); await io.sendText(phone, 'Sobre qual tema/foco você quer o plano de ação?'); return;
      case 'editar':
        await io.sendList(phone, `O que deseja editar em *${patient.full_name}*?`, 'Campos',
          Object.entries(EDITABLE_FIELDS).map(([field, label]) => ({ id: `${ids.EDIT_PREFIX}${field}`, title: label })), 'Editar paciente');
        return;
      default: await sendPatientMenu(patient);
    }
  };

  const triggerPreview = async (draft: Draft) => {
    if (draft.target === 'edit_patient') return generatePatientEditPreview(draft);
    if (draft.target === 'cadastro') return generateCadastroPreview(draft);
    return generateEvolutionPreview(draft);
  };

  const confirmDraft = async (draft: Draft) => {
    if (draft.target === 'edit_patient') return savePatientEdit(draft);
    if (draft.target === 'cadastro') return saveCadastro(draft);
    return saveEvolution(draft);
  };

  const resolveDisambiguation = async (choice: 'command' | 'content') => {
    const pending = flow.pendingCommand;
    const draft = flow.draft;
    if (!pending || !draft) { await sendMenu(); return; }
    if (choice === 'content') {
      draft.parts.push({ kind: 'text', text: pending.raw });
      await saveFlow({ ...flow, draft, pendingCommand: undefined }, { sub_state: 'draft_capturing' });
      await io.sendButtons(phone, 'Anotado no rascunho. Pode continuar ou toque em *Gerar prévia*.', [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }]);
      return;
    }
    // choice === 'command'
    const cmd = pending.command as CommandName;
    if (cmd === 'menu') { await exitContext(); return; } // saída explícita confirmada
    if (READONLY_COMMANDS.has(cmd)) {
      // Executa o comando de leitura e RETOMA o rascunho automaticamente (nunca o perde).
      await saveFlow({ ...flow, pendingCommand: undefined }, { sub_state: 'draft_capturing' });
      const patient = await loadLockedPatient();
      if (cmd === 'historico' && patient) await showHistory(patient);
      else if (cmd === 'ficha' && patient) await showPatientDetails(patient);
      else if (cmd === 'ajuda') await executeCommand('ajuda');
      else if (cmd === 'acoes' && patient) { /* não reabrir lista para não perder o fio */ }
      await io.sendButtons(phone, 'Voltei ao seu rascunho. Pode continuar ou toque em *Gerar prévia*.', [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }]);
      return;
    }
    // Comando que troca contexto: confirmado pelo usuário → executa (descarta o rascunho atual).
    await persist({ sub_state: 'idle', flow_data: { ...flow, draft: undefined, pendingCommand: undefined } });
    await executeCommand(cmd);
  };

  // ---------- cadastro guiado (dentro de draft target=cadastro) ----------

  const continueCadastro = async (draft: Draft) => {
    const c = { ...(draft.cadastro ?? {}) };
    const step = draft.cadastroStep ?? 'nome';
    const text = (input.text ?? '').trim();

    // "voltar" corrige o passo anterior (spec §4) — tratado aqui, não como comando de menu.
    if (normalizeText(text) === 'voltar') {
      const order = ['nome', 'iniciais', 'abordagem', 'queixa'];
      const idx = order.indexOf(step);
      const prev = order[Math.max(0, idx - 1)];
      draft.cadastroStep = prev;
      await saveFlow({ ...flow, draft }, { sub_state: 'draft_capturing' });
      const prompts: Record<string, string> = {
        nome: 'Qual é o *nome completo*?', iniciais: 'Quais as *iniciais*? (ex.: M.S.)',
        abordagem: 'Qual a *abordagem* terapêutica?', queixa: 'Qual a *queixa principal*?',
      };
      await io.sendText(phone, `Voltando. ${prompts[prev]}`);
      return;
    }

    switch (step) {
      case 'nome': c.full_name = text; draft.cadastro = c; draft.cadastroStep = 'iniciais';
        await saveFlow({ ...flow, draft }, { sub_state: 'draft_capturing' });
        await io.sendText(phone, 'Quais as *iniciais* do paciente? (ex.: M.S.)'); return;
      case 'iniciais': c.initials = text; draft.cadastro = c; draft.cadastroStep = 'abordagem';
        await saveFlow({ ...flow, draft }, { sub_state: 'draft_capturing' });
        await io.sendText(phone, 'Qual a *abordagem* terapêutica? (ex.: TCC, Psicanálise)'); return;
      case 'abordagem': c.approach = text; draft.cadastro = c; draft.cadastroStep = 'queixa';
        await saveFlow({ ...flow, draft }, { sub_state: 'draft_capturing' });
        await io.sendText(phone, 'Qual a *queixa principal*?'); return;
      case 'queixa': c.main_complaint = text; draft.cadastro = c;
        await generateCadastroPreview(draft); return;
      default: await sendMenu();
    }
  };

  // ===================== PIPELINE PRINCIPAL =====================

  const hasDraft = !!flow.draft;
  const hasContext = !!(mode && mode !== 'menu') || !!lockedId || !!flow.draft || (!!subState && subState !== 'idle');

  // 1. CAMADA 0 — comando reservado (mensagem curta e exata). Só para texto.
  if (input.kind !== 'interactive') {
    // Caso especial: "voltar" dentro do cadastro corrige passo (não é menu).
    const isCadastroBack = flow.draft?.target === 'cadastro' && normalizeText(input.text ?? '') === 'voltar';
    if (!isCadastroBack) {
      const cmd = matchCommand(input.text ?? '');
      if (cmd) {
        if (hasDraft) { await askCommandDisambiguation(cmd, input.text ?? ''); return; }
        await executeCommand(cmd);
        return;
      }
    }
  }

  // 2. EXPIRAÇÃO 24h — preservando rascunho. Só avalia em mensagem de texto (não em respostas a prompts).
  if (input.kind !== 'interactive' && subState !== 'expiry_prompt') {
    const verdict = evaluateExpiry({ updatedAt: session?.updated_at ?? null, now: Date.now(), hasDraft, hasContext });
    if (verdict === 'stale_no_draft') { await sendMenu(); return; }
    if (verdict === 'stale_with_draft') {
      await persist({ sub_state: 'expiry_prompt' });
      const when = '';
      await io.sendButtons(phone, `Você tinha um rascunho de evolução em aberto${when}. O que fazer?`, [
        { id: ids.EXPIRY_RESUME, title: 'Retomar' }, { id: ids.EXPIRY_DISCARD, title: 'Descartar' },
      ]);
      return;
    }
  }

  // 3. Respostas interativas (botões/listas).
  if (input.kind === 'interactive' && input.replyId) {
    await handleReply(input.replyId);
    return;
  }

  // 4. RESOLUÇÃO DE CONTEXTO (texto) por sub-estado.

  // 4a. Rascunho em captura: a mensagem entra no rascunho (ou dispara prévia).
  if (subState === 'draft_capturing' && flow.draft) {
    const draft = flow.draft;
    if (draft.target === 'cadastro') { await continueCadastro(draft); return; }
    if (isPreviewTrigger(input.text ?? '')) { await triggerPreview(draft); return; }
    await accumulate(draft);
    return;
  }

  // 4b. Aguardando confirmação de prévia: texto extra volta a capturar (re-gera depois).
  if (subState === 'draft_await_preview_confirm' && flow.draft) {
    const draft = flow.draft;
    if (draft.target !== 'cadastro') {
      draft.previewText = undefined;
      await accumulate(draft); // acumula e segue em captura
      await io.sendButtons(phone, 'Complementei o rascunho. Toque em *Gerar prévia* quando terminar.', [{ id: ids.DRAFT_PREVIEW, title: 'Gerar prévia' }]);
    }
    return;
  }

  // 4c. Escolha de paciente por número ou nome.
  if (subState === 'choose_patient' && (flow.patientList?.length ?? 0) > 0 && input.text) {
    const sel = resolveSelection(input.text, flow.patientList!, (p) => p.full_name);
    if (sel.kind === 'item') {
      const patient = await getPatientById(supabase, userId, sel.item.id);
      if (patient) { await onPatientChosen(patient); return; }
    }
    if (sel.kind === 'ambiguous') {
      await io.sendList(phone, 'Encontrei mais de um. Selecione:', 'Ver pacientes',
        sel.items.map((p) => ({ id: `${ids.PATIENT_PREFIX}${p.id}`, title: p.full_name, description: p.initials ?? undefined })));
      return;
    }
    await io.sendText(phone, 'Não encontrei esse paciente. Tente o número da lista ou o nome.');
    return;
  }

  // 4d. Lista de evoluções: seleção por número ou data.
  if (subState === 'evo_list' && (flow.evoList?.length ?? 0) > 0 && input.text) {
    const sel = resolveSelection(input.text, flow.evoList!, (e) => e.full_name); // full_name guarda a data
    if (sel.kind === 'item') { await showEvolutionActions(sel.item.id); return; }
    await io.sendText(phone, 'Não identifiquei a evolução. Responda com o número ou a data (dd/mm).');
    return;
  }

  // 5. MODO PACIENTE — conversa NÃO grava (spec §7). Só ações explícitas escrevem.
  if (mode === 'paciente' && lockedId) {
    const patient = await loadLockedPatient();
    if (!patient) { await sendMenu(); return; }
    if (session?.last_intent === 'plan') { await runPlan(patient); return; }
    // Conversa livre sobre o caso: responde sem efeito colateral.
    await handleConversationalText(session?.thread_id ?? undefined);
    return;
  }

  // 6. MODO LIVRE.
  if (mode === 'livre') {
    await handleConversationalText(session?.thread_id ?? undefined);
    return;
  }

  // 7. ATALHO DO APRESSADO — a mensagem cita um paciente? (resolução de nome, spec §9)
  if (input.text && input.text.trim().length > 0) {
    const patients = await listActivePatients(supabase, userId, 50);
    const mentioned = findMentionedPatients(input.text, patients.map((p) => ({ id: p.id, full_name: p.full_name, initials: p.initials })));
    const klass = classifyMatches(mentioned);
    if (klass === 'one') {
      const patient = patients.find((p) => p.id === mentioned[0].id)!;
      await io.sendText(phone, `Ok, contexto: *${patient.full_name}*.`);
      // Se a mensagem tem conteúdo além do nome, abre rascunho de evolução com o que já veio.
      const words = (input.text ?? '').trim().split(/\s+/).length;
      if (words > 4) { await openEvolutionDraft(patient, input.text); }
      else { await lockPatient(patient); await sendPatientMenu(patient); }
      return;
    }
    if (klass === 'many') {
      await saveFlow({ ...flow, patientList: mentioned }, { sub_state: 'choose_patient', mode: 'menu' });
      await io.sendList(phone, 'Encontrei mais de um paciente. Selecione:', 'Ver pacientes',
        mentioned.map((p) => ({ id: `${ids.PATIENT_PREFIX}${p.id}`, title: p.full_name, description: p.initials ?? undefined })));
      return;
    }
    // nenhuma: oferece cadastrar / escolher / menu (apenas se a mensagem parecia citar um nome próprio).
    if ((input.text ?? '').trim().split(/\s+/).length <= 6) {
      await io.sendButtons(phone, 'Não encontrei esse paciente. O que deseja?', [
        { id: ids.NAME_CREATE, title: 'Cadastrar' }, { id: ids.NAME_CHOOSE, title: 'Escolher da lista' }, { id: ids.NAME_MENU, title: 'Menu' },
      ]);
      return;
    }
  }

  // 8. Sem contexto → menu inicial.
  await sendMenu();
}
