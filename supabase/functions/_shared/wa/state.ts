// Máquina de estado da conversa WhatsApp-first (a "espinha").
// Mantém o comportamento descrito em docs/maquina-de-estado-chatpsi-whatsapp.md:
// menu de 3 caminhos, escolher/cadastrar paciente, MODO PACIENTE vs MODO LIVRE,
// e geração de evolução salvando na ficha real (evolutions) conforme a allowlist.
//
// Isolamento por tenant: TODA leitura/escrita de patients/evolutions usa o userId
// (= profiles.user_id, id de auth.users) resolvido pelo webhook.

import { sendButtons, sendList, sendText } from './messaging.ts';
import {
  bumpPatientSession,
  getPatientById,
  getSession,
  insertEvolution,
  insertPatient,
  listActivePatients,
  logWaMessage,
  patchSession,
  type Patient,
  recentEvolutions,
  searchPatientsByName,
  updatePatient,
  uploadSessionAudio,
} from './repo.ts';
import { chat, type ChatTool } from '../llm/index.ts';
import { planoDeAcao } from '../tools/planoDeAcao.ts';
import { buscarArtigos } from '../tools/buscarArtigos.ts';

// Persona do clínico no WhatsApp (instruções vêm do banco; o backend resolve o assistant
// correspondente quando LLM_BACKEND='assistants').
const CLINICO_WA = 'clinico_whatsapp';

// JSON Schema dos parâmetros das tools (exigido pelo backend Responses; ignorado no Assistants).
const USER_QUERY_SCHEMA = {
  type: 'object',
  properties: { user_query: { type: 'string', description: 'Tema/foco da consulta.' } },
  required: ['user_query'],
  additionalProperties: false,
};

// IDs dos componentes interativos.
const MENU_CHOOSE = 'menu_choose';
const MENU_CREATE = 'menu_create';
const MENU_FREE = 'menu_free';
const PT_EVOLUTION = 'pt_evolution';
const PT_HISTORY = 'pt_history';
const PT_PLAN = 'pt_plan';
const PT_VIEW = 'pt_view';
const PT_EDIT = 'pt_edit';
const MENU_EXIT = 'ctx_exit';
const PATIENT_PREFIX = 'patient:';
const EDIT_PREFIX = 'edit:';

const MAX_LIST = 10;

// Janela de inatividade: após 24h sem interação, a sessão volta ao menu inicial.
const STALE_MS = 24 * 60 * 60 * 1000;

// Campos do paciente que podem ser editados pelo WhatsApp, com rótulo amigável.
const EDITABLE_FIELDS: Record<string, string> = {
  full_name: 'Nome',
  initials: 'Iniciais',
  approach: 'Abordagem',
  main_complaint: 'Queixa',
};

/** Normaliza texto para comparar comandos: trim + minúsculas + sem acentos. */
function normalizeText(t: string): string {
  // Remove marcas diacríticas combinantes (U+0300–U+036F) após decompor em NFD.
  return t.trim().toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
}

/** Palavras-chave que acionam a saída de contexto (já normalizadas, sem acento). */
const ESCAPE_WORDS = new Set(['menu', 'trocar', 'trocar de paciente', 'sair', 'voltar', 'inicio']);

export interface ConversationInput {
  kind: 'text' | 'audio' | 'image' | 'document' | 'interactive';
  text: string;                                   // texto derivado (transcrição/descrição) ou body
  replyId?: string;                               // id de botão/lista (interactive)
  audio?: { bytes: Uint8Array; mimeType: string }; // bytes do áudio (p/ upload no Storage)
}

function clinicalTools(): ChatTool[] {
  return [
    {
      name: 'plano_de_acao',
      description: 'Gera um plano de ação terapêutico para o tema/foco informado.',
      parameters: USER_QUERY_SCHEMA,
      handler: (a) => planoDeAcao({ user_query: String(a.user_query ?? '') }),
    },
    {
      name: 'buscar_artigos',
      description: 'Busca artigos científicos de psicologia sobre o tema informado.',
      parameters: USER_QUERY_SCHEMA,
      handler: (a) => buscarArtigos({ user_query: String(a.user_query ?? '') }),
    },
  ];
}

export async function handleConversation(opts: {
  supabase: any;
  phone: string;
  userId: string;
  displayName: string;
  allowed: boolean;
  input: ConversationInput;
}): Promise<void> {
  const { supabase, phone, userId, displayName, allowed, input } = opts;
  const session = await getSession(supabase, phone);
  const mode = session?.mode ?? null;
  const lockedId = session?.locked_patient_id ?? null;

  // Item 1 — inatividade: sessão parada há mais de 24h é considerada expirada.
  const stale = !!session?.updated_at && (Date.now() - new Date(session.updated_at).getTime() > STALE_MS);

  // Log da mensagem do usuário (entrada).
  await logWaMessage(
    supabase,
    phone,
    'user',
    input.kind === 'interactive' ? `[opção] ${input.replyId ?? ''}` : (input.text || '(vazio)'),
  );

  // --- helpers (closures sobre o contexto) ---

  const lockPatient = async (patient: Patient) => {
    await patchSession(supabase, phone, {
      mode: 'paciente', kind: 'clinico', locked_patient_id: patient.id,
      flow_step: null, flow_data: null, last_intent: null,
    });
  };

  const sendMenu = async () => {
    await patchSession(supabase, phone, {
      mode: 'menu', kind: 'clinico', locked_patient_id: null,
      flow_step: null, flow_data: null, last_intent: null,
    });
    await sendButtons(phone, `Olá, ${displayName}! O que vamos fazer?`, [
      { id: MENU_CHOOSE, title: 'Escolher paciente' },
      { id: MENU_CREATE, title: 'Cadastrar paciente' },
      { id: MENU_FREE, title: 'Falar sem paciente' },
    ]);
  };

  // Usamos LISTA (não botões) no modo paciente: cabem as 3 ações + a saída de
  // contexto numa única mensagem (botões de resposta são limitados a 3).
  const sendPatientMenu = async (patient: Patient) => {
    await sendList(
      phone,
      `Paciente *${patient.full_name}* selecionado. O que deseja?`,
      'Ações',
      [
        { id: PT_EVOLUTION, title: 'Nova evolução' },
        { id: PT_HISTORY, title: 'Histórico' },
        { id: PT_PLAN, title: 'Plano' },
        { id: PT_VIEW, title: 'Consultar ficha' },
        { id: PT_EDIT, title: 'Editar paciente' },
        { id: MENU_EXIT, title: '↩ Trocar / Menu' },
      ],
      'Ações do paciente',
    );
  };

  // Saída de contexto: destrava o paciente / cancela cadastro e volta ao menu.
  const exitContext = async () => {
    if (session?.mode === 'cadastro') {
      await sendText(phone, 'Cadastro cancelado.');
    }
    await sendMenu(); // sendMenu já zera locked_patient_id/mode/flow_step/flow_data/last_intent
  };

  const showPatientList = async () => {
    const patients = await listActivePatients(supabase, userId, 50);
    if (patients.length === 0) {
      await sendText(phone, 'Você ainda não tem pacientes cadastrados. Toque em "Cadastrar paciente" para criar a primeira ficha.');
      return;
    }
    if (patients.length > MAX_LIST) {
      // Lista interativa não comporta tantos itens: mostra os nomes em texto e pede o nome.
      await patchSession(supabase, phone, { mode: 'menu', flow_step: 'await_name' });
      const linhas = patients
        .map((p, i) => `${i + 1}. ${p.full_name}${p.initials ? ` (${p.initials})` : ''}`)
        .join('\n');
      await sendText(
        phone,
        `Você tem ${patients.length} pacientes:\n\n${linhas}\n\nMe diga o *nome* (ou parte do nome) de quem você quer atender.`,
      );
      return;
    }
    await sendList(
      phone,
      'Selecione o paciente:',
      'Ver pacientes',
      patients.map((p) => ({ id: `${PATIENT_PREFIX}${p.id}`, title: p.full_name, description: p.initials })),
    );
  };

  const showHistory = async (patient: Patient) => {
    const evos = await recentEvolutions(supabase, userId, patient.id, 5);
    if (evos.length === 0) {
      await sendText(phone, `Ainda não há evoluções registradas para *${patient.full_name}*.`);
      return;
    }
    const lines = evos.map((e) => {
      const date = (e.created_at ?? '').slice(0, 10);
      const sn = e.session_number ? `· sessão ${e.session_number}` : '';
      const snippet = (e.output_content ?? '').replace(/\s+/g, ' ').slice(0, 180);
      return `📂 ${date} ${sn}\n${snippet}…`;
    });
    await sendText(phone, `Histórico recente de *${patient.full_name}*:\n\n${lines.join('\n\n')}`);
  };

  // Item 3 — Consultar ficha: mostra os dados cadastrais do paciente.
  const showPatientDetails = async (patient: Patient) => {
    const linhas = [
      `📋 *Ficha do paciente*`,
      ``,
      `*Nome:* ${patient.full_name}`,
      `*Iniciais:* ${patient.initials || '—'}`,
      `*Abordagem:* ${patient.approach || '—'}`,
      `*Queixa:* ${patient.main_complaint || '—'}`,
      `*Sessões:* ${patient.total_sessions ?? 0}`,
    ];
    await sendText(phone, linhas.join('\n'));
  };

  // Item 2 — Editar paciente: aplica o novo valor do campo escolhido e volta ao menu do paciente.
  const applyPatientEdit = async (patient: Patient) => {
    const field = String((session?.flow_data as Record<string, unknown>)?.field ?? '');
    const label = EDITABLE_FIELDS[field];
    const value = (input.text ?? '').trim();
    if (!label) {
      await patchSession(supabase, phone, { last_intent: null, flow_step: null, flow_data: null });
      await sendPatientMenu(patient);
      return;
    }
    if (value.length < 1) {
      await sendText(phone, `Não recebi o novo valor para *${label}*. Tente novamente.`);
      return;
    }
    const updated = await updatePatient(supabase, userId, patient.id, { [field]: value });
    await patchSession(supabase, phone, { last_intent: null, flow_step: null, flow_data: null });
    if (!updated) {
      await sendText(phone, 'Não consegui salvar a alteração agora. Tente novamente em instantes.');
      await sendPatientMenu(patient);
      return;
    }
    await sendText(phone, `✅ *${label}* atualizado(a).`);
    await sendPatientMenu(updated);
  };

  const generateEvolution = async (patient: Patient) => {
    const relato = input.text;
    if (!relato || relato.trim().length < 3) {
      await sendText(phone, 'Não recebi o relato da sessão. Pode ditar (áudio) ou escrever o que aconteceu.');
      return;
    }

    const evos = await recentEvolutions(supabase, userId, patient.id, 5);
    const history = evos.length
      ? evos.slice().reverse()
          .map((e) => `(${(e.created_at ?? '').slice(0, 10)}) ${(e.output_content ?? '').slice(0, 600)}`)
          .join('\n---\n')
      : 'Sem evoluções anteriores.';

    const userText =
      `Gere uma evolução clínica para o paciente de iniciais ${patient.initials} ` +
      `(abordagem: ${patient.approach ?? 'não informada'}), coerente com o histórico.\n\n` +
      `HISTÓRICO RECENTE (mais antigo → mais recente):\n${history}\n\n` +
      `NOVO RELATO DA SESSÃO:\n${relato}`;

    const result = await chat({
      task: 'clinico', personaSlug: CLINICO_WA, userText, tools: clinicalTools(), shadowKey: phone,
    });

    await sendText(phone, result.text);
    await logWaMessage(supabase, phone, 'ai', result.text, result.usage);

    if (allowed) {
      let audioUrl: string | null = null;
      if (input.kind === 'audio' && input.audio) {
        audioUrl = await uploadSessionAudio(supabase, userId, input.audio.bytes, input.audio.mimeType);
      }
      await insertEvolution(supabase, {
        user_id: userId,
        patient_id: patient.id,
        patient_initials: patient.initials,
        input_type: input.kind === 'audio' ? 'audio' : 'text',
        input_content: relato,
        output_content: result.text,
        approach: patient.approach,
        audio_url: audioUrl,
      });
      await bumpPatientSession(supabase, patient);
    } else {
      await sendText(phone, '_(Modo teste: esta evolução não foi salva no prontuário porque seu número não está na allowlist.)_');
    }
    await patchSession(supabase, phone, { last_intent: null });
  };

  const runPlan = async (patient: Patient) => {
    const theme = input.text;
    if (!theme || theme.trim().length < 2) {
      await sendText(phone, 'Sobre qual tema/foco você quer o plano de ação?');
      return;
    }
    const query = `Paciente ${patient.initials}${patient.main_complaint ? `, queixa: ${patient.main_complaint}` : ''}. Foco do plano: ${theme}`;
    const plan = await planoDeAcao({ user_query: query });
    await sendText(phone, plan);
    await logWaMessage(supabase, phone, 'ai', plan);
    if (allowed) {
      await insertEvolution(supabase, {
        user_id: userId,
        patient_id: patient.id,
        patient_initials: patient.initials,
        input_type: 'text',
        input_content: `[plano de ação] ${theme}`,
        output_content: plan,
        approach: patient.approach,
      });
    }
    await patchSession(supabase, phone, { last_intent: null });
  };

  const handleFree = async () => {
    const text = input.text;
    if (!text || text.trim().length < 1) {
      await sendText(phone, 'Modo livre ativo. Pode mandar sua dúvida, um tema de estudo ou um pedido.');
      return;
    }
    const result = await chat({
      task: 'clinico', personaSlug: CLINICO_WA, userText: text,
      threadId: session?.thread_id ?? undefined, tools: clinicalTools(), shadowKey: phone,
    });
    if (result.threadId && result.threadId !== session?.thread_id) {
      await patchSession(supabase, phone, { thread_id: result.threadId, kind: 'clinico' });
    }
    await sendText(phone, result.text);
    await logWaMessage(supabase, phone, 'ai', result.text, result.usage);
  };

  const handleReply = async (replyId: string) => {
    if (replyId.startsWith(PATIENT_PREFIX)) {
      const patient = await getPatientById(supabase, userId, replyId.slice(PATIENT_PREFIX.length));
      if (!patient) { await sendText(phone, 'Não encontrei esse paciente. Vamos recomeçar.'); await sendMenu(); return; }
      await lockPatient(patient);
      await sendPatientMenu(patient);
      return;
    }
    // Item 2 — escolha do campo a editar: arma o passo que aguarda o novo valor.
    if (replyId.startsWith(EDIT_PREFIX)) {
      const field = replyId.slice(EDIT_PREFIX.length);
      const label = EDITABLE_FIELDS[field];
      if (!lockedId || !label) { await sendMenu(); return; }
      await patchSession(supabase, phone, { last_intent: 'edit', flow_step: 'edit_value', flow_data: { field } });
      await sendText(phone, `Envie o novo valor para *${label}*:`);
      return;
    }
    switch (replyId) {
      case MENU_CHOOSE:
        await showPatientList();
        return;
      case MENU_CREATE:
        if (!allowed) {
          await sendText(phone, 'O cadastro de paciente só é gravado para números na allowlist de teste. Fale com o suporte para liberar o seu número.');
          await sendMenu();
          return;
        }
        await patchSession(supabase, phone, { mode: 'cadastro', flow_step: 'nome', flow_data: {}, locked_patient_id: null });
        await sendText(phone, 'Vamos cadastrar um paciente. Qual é o *nome completo* dele(a)?');
        return;
      case MENU_FREE:
        await patchSession(supabase, phone, { mode: 'livre', kind: 'clinico', locked_patient_id: null, last_intent: null });
        await sendText(phone, 'Modo livre ativado. Pode mandar sua dúvida clínica, um tema de estudo ou um pedido (sem vincular a um paciente).');
        return;
      case PT_EVOLUTION:
        await patchSession(supabase, phone, { last_intent: 'evolution' });
        await sendText(phone, 'Pode ditar (áudio) ou escrever o relato da sessão. Vou gerar a evolução a partir dele.');
        return;
      case PT_HISTORY: {
        if (!lockedId) { await sendMenu(); return; }
        const patient = await getPatientById(supabase, userId, lockedId);
        if (patient) await showHistory(patient);
        return;
      }
      case PT_VIEW: {
        if (!lockedId) { await sendMenu(); return; }
        const patient = await getPatientById(supabase, userId, lockedId);
        if (!patient) { await sendMenu(); return; }
        await showPatientDetails(patient);
        await sendPatientMenu(patient);
        return;
      }
      case PT_EDIT: {
        if (!lockedId) { await sendMenu(); return; }
        const patient = await getPatientById(supabase, userId, lockedId);
        if (!patient) { await sendMenu(); return; }
        await sendList(
          phone,
          `O que deseja editar em *${patient.full_name}*?`,
          'Campos',
          Object.entries(EDITABLE_FIELDS).map(([field, label]) => ({ id: `${EDIT_PREFIX}${field}`, title: label })),
          'Editar paciente',
        );
        return;
      }
      case PT_PLAN:
        await patchSession(supabase, phone, { last_intent: 'plan' });
        await sendText(phone, 'Sobre qual tema/foco você quer o plano de ação para este paciente?');
        return;
      case MENU_EXIT:
        await exitContext();
        return;
      default:
        await sendMenu();
    }
  };

  const continueCadastro = async () => {
    const data = { ...(session?.flow_data ?? {}) } as Record<string, string>;
    const text = input.text?.trim() ?? '';
    switch (session?.flow_step) {
      case 'nome':
        data.full_name = text;
        await patchSession(supabase, phone, { flow_data: data, flow_step: 'iniciais' });
        await sendText(phone, 'Quais as *iniciais* do paciente? (ex.: M.S.)');
        return;
      case 'iniciais':
        data.initials = text;
        await patchSession(supabase, phone, { flow_data: data, flow_step: 'abordagem' });
        await sendText(phone, 'Qual a *abordagem* terapêutica? (ex.: TCC, Psicanálise)');
        return;
      case 'abordagem':
        data.approach = text;
        await patchSession(supabase, phone, { flow_data: data, flow_step: 'queixa' });
        await sendText(phone, 'Qual a *queixa principal*?');
        return;
      case 'queixa': {
        data.main_complaint = text;
        const patient = await insertPatient(supabase, {
          user_id: userId,
          full_name: data.full_name,
          initials: data.initials,
          approach: data.approach,
          main_complaint: data.main_complaint,
        });
        if (!patient) {
          await sendText(phone, 'Não consegui cadastrar o paciente agora. Tente novamente em instantes.');
          await sendMenu();
          return;
        }
        await lockPatient(patient);
        await sendText(phone, `Pronto! *${patient.full_name}* foi cadastrado(a) e já aparece no seu painel web.`);
        await sendPatientMenu(patient);
        return;
      }
      default:
        await sendMenu();
    }
  };

  // --- roteamento principal ---

  // Item 1 — Inatividade > 24h: descarta o contexto antigo e volta ao menu inicial.
  if (stale && (session?.mode || session?.locked_patient_id || session?.flow_step)) {
    await sendMenu();
    return;
  }

  // 0. Saída de contexto por TEXTO — prioridade máxima (antes de paciente/cadastro).
  if (input.kind !== 'interactive' && ESCAPE_WORDS.has(normalizeText(input.text ?? ''))) {
    await exitContext();
    return;
  }

  // 1. Resposta de botão/lista.
  if (input.kind === 'interactive' && input.replyId) {
    await handleReply(input.replyId);
    return;
  }

  // 2. Escolha de paciente por nome (lista grande).
  if (mode === 'menu' && session?.flow_step === 'await_name' && input.text) {
    const matches = await searchPatientsByName(supabase, userId, input.text.trim());
    if (matches.length === 0) {
      await sendText(phone, 'Não encontrei nenhum paciente com esse nome. Pode tentar de novo?');
    } else if (matches.length === 1) {
      await lockPatient(matches[0]);
      await sendPatientMenu(matches[0]);
    } else {
      await sendList(
        phone, 'Encontrei mais de um. Selecione:', 'Ver pacientes',
        matches.map((p) => ({ id: `${PATIENT_PREFIX}${p.id}`, title: p.full_name, description: p.initials })),
      );
    }
    return;
  }

  // 3. Cadastro guiado em andamento.
  if (mode === 'cadastro') {
    await continueCadastro();
    return;
  }

  // 4. MODO PACIENTE (paciente travado).
  if (mode === 'paciente' && lockedId) {
    const patient = await getPatientById(supabase, userId, lockedId);
    if (!patient) { await sendMenu(); return; }
    if (session?.last_intent === 'edit') {
      await applyPatientEdit(patient);
    } else if (session?.last_intent === 'plan') {
      await runPlan(patient);
    } else {
      await generateEvolution(patient);
    }
    return;
  }

  // 5. MODO LIVRE.
  if (mode === 'livre') {
    await handleFree();
    return;
  }

  // 6. Atalho do apressado: a mensagem cita um paciente?
  if (input.text && input.text.trim().length > 0) {
    const patients = await listActivePatients(supabase, userId, 50);
    const lower = input.text.toLowerCase();
    const match = patients.find((p) => p.full_name && lower.includes(p.full_name.toLowerCase()));
    if (match) {
      await lockPatient(match);
      await sendText(phone, `Selecionei *${match.full_name}*.`);
      await sendPatientMenu(match);
      return;
    }
  }

  // 7. Sem contexto → menu inicial.
  await sendMenu();
}
