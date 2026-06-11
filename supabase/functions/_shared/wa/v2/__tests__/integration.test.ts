import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleConversation } from '../../state.ts';
import * as ids from '../ids.ts';
import { fakeChat, makeIo, makeSupabase, seedSession, type SentMessage } from './harness.ts';

const USER = 'user-1';
const PHONE = '5511999999999';

function txt(text: string) {
  return { kind: 'text' as const, text };
}
function tap(replyId: string) {
  return { kind: 'interactive' as const, text: '', replyId };
}

async function run(
  supabase: any,
  input: { kind: any; text: string; replyId?: string; audio?: any },
  io: { io: any },
  opts: { allowed?: boolean; chatText?: string } = {},
) {
  await handleConversation({
    supabase,
    phone: PHONE,
    userId: USER,
    displayName: 'Dra. Ana',
    allowed: opts.allowed ?? true,
    input,
    io: io.io,
    chatFn: fakeChat(opts.chatText) as any,
  });
}

const last = (sent: SentMessage[]) => sent[sent.length - 1];
const bodies = (sent: SentMessage[]) => sent.map((s) => s.body).join(' || ');
const hasButton = (sent: SentMessage[], id: string) =>
  sent.some((s) => s.buttons?.some((b) => b.id === id));

function patient(over: Record<string, any> = {}) {
  return {
    id: over.id ?? 'patients_seed', user_id: USER, full_name: 'Maria Silva de Souza',
    initials: 'M.S.', approach: 'TCC', main_complaint: 'ansiedade', status: 'active',
    total_sessions: 0, last_session_at: null, ...over,
  };
}

// ---------------- Camada 0 ----------------

Deno.test('Camada 0: "menu" de dentro do modo paciente sai para o menu', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, txt('menu'), io);
  assert(hasButton(io.sent, ids.MENU_CHOOSE), 'deve mostrar o menu de 3 caminhos');
  assertEquals(store.wa_sessions[PHONE].mode, 'menu');
  assertEquals(store.wa_sessions[PHONE].locked_patient_id, null);
});

Deno.test('Camada 0: comando que exige paciente sem paciente pede para escolher', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient(), patient({ id: 'p2', full_name: 'João Lima' })] });
  seedSession(store, PHONE, { mode: 'menu', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, txt('plano'), io);
  assertEquals(store.wa_sessions[PHONE].flow_data.pendingIntent, 'plano');
  assertEquals(store.wa_sessions[PHONE].sub_state, 'choose_patient');
});

// ---------------- Padrão de captura ----------------

Deno.test('Captura: nova evolução acumula, gera prévia com nome do paciente e salva (allowed)', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();

  await run(supabase, tap(ids.PT_EVOLUTION), io); // abre rascunho
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_capturing');

  await run(supabase, txt('paciente relatou ansiedade no trabalho'), io); // acumula
  await run(supabase, txt('e melhora no sono'), io); // acumula
  assertEquals(store.wa_sessions[PHONE].flow_data.draft.parts.length, 2);

  await run(supabase, txt('pronto'), io); // gera prévia
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_await_preview_confirm');
  assert(bodies(io.sent).includes('Maria Silva de Souza'), 'prévia deve ter o nome do paciente no topo');
  assert(hasButton(io.sent, ids.DRAFT_SAVE) && hasButton(io.sent, ids.DRAFT_CANCEL));

  await run(supabase, tap(ids.DRAFT_SAVE), io); // confirma
  assertEquals(store.evolutions.length, 1, 'evolução gravada na ficha');
  assertEquals(store.evolutions[0].user_id, USER);
  assertEquals(store.evolutions[0].patient_id, 'patients_seed');
  assertEquals(store.patients[0].total_sessions, 1, 'sessão incrementada');
  assertEquals(store.wa_sessions[PHONE].flow_data.draft, undefined, 'rascunho limpo após salvar');
});

Deno.test('Captura: allowed=false mostra prévia mas NÃO grava', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, tap(ids.PT_EVOLUTION), io, { allowed: false });
  await run(supabase, txt('relato da sessão de hoje'), io, { allowed: false });
  await run(supabase, txt('pronto'), io, { allowed: false });
  await run(supabase, tap(ids.DRAFT_SAVE), io, { allowed: false });
  assertEquals(store.evolutions.length, 0, 'nada gravado fora da allowlist');
  assert(bodies(io.sent).toLowerCase().includes('modo teste'));
});

Deno.test('Captura: [Cancelar] descarta o rascunho', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, tap(ids.PT_EVOLUTION), io);
  await run(supabase, txt('algo'), io);
  await run(supabase, tap(ids.DRAFT_CANCEL), io);
  assertEquals(store.wa_sessions[PHONE].flow_data.draft, undefined);
  assertEquals(store.evolutions.length, 0);
});

// ---------------- Desambiguação de comando em rascunho ----------------

Deno.test('Desambiguação: comando em rascunho pergunta e "É conteúdo" preserva o rascunho', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, tap(ids.PT_EVOLUTION), io);
  await run(supabase, txt('relato inicial'), io);
  await run(supabase, txt('histórico'), io); // comando curto-exato dentro do rascunho
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_command_disambig');
  assert(hasButton(io.sent, ids.DISAMBIG_COMMAND) && hasButton(io.sent, ids.DISAMBIG_CONTENT));

  await run(supabase, tap(ids.DISAMBIG_CONTENT), io); // é conteúdo
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_capturing');
  const parts = store.wa_sessions[PHONE].flow_data.draft.parts;
  assert(parts.some((p: any) => p.text === 'histórico'), 'o texto vira parte do rascunho');
});

Deno.test('Desambiguação: "Ver histórico" executa e mantém o rascunho', async () => {
  const { supabase, store } = makeSupabase({
    patients: [patient()],
    evolutions: [{ id: 'e1', user_id: USER, patient_id: 'patients_seed', output_content: 'sessão anterior', created_at: '2026-06-01', session_number: 1 }],
  });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, tap(ids.PT_EVOLUTION), io);
  await run(supabase, txt('relato'), io);
  await run(supabase, txt('histórico'), io);
  await run(supabase, tap(ids.DISAMBIG_COMMAND), io);
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_capturing', 'volta a capturar');
  assert(store.wa_sessions[PHONE].flow_data.draft, 'rascunho preservado');
});

// ---------------- Sub-máquina de evoluções ----------------

Deno.test('Evoluções: listar → selecionar → excluir com confirmação dupla grava auditoria (soft-delete)', async () => {
  const { supabase, store } = makeSupabase({
    patients: [patient()],
    evolutions: [
      { id: 'e1', user_id: USER, patient_id: 'patients_seed', output_content: 'sessão A', created_at: '2026-06-09', session_number: 2, deleted_at: null },
      { id: 'e2', user_id: USER, patient_id: 'patients_seed', output_content: 'sessão B', created_at: '2026-06-02', session_number: 1, deleted_at: null },
    ],
  });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();

  await run(supabase, tap(ids.PT_EVOLUTIONS), io);
  assertEquals(store.wa_sessions[PHONE].sub_state, 'evo_list');

  await run(supabase, tap(`${ids.EVO_PREFIX}e1`), io);
  assertEquals(store.wa_sessions[PHONE].sub_state, 'evo_selected');
  assert(hasButton(io.sent, ids.EVO_DELETE));

  await run(supabase, tap(ids.EVO_DELETE), io); // confirmação dupla
  assertEquals(store.wa_sessions[PHONE].sub_state, 'evo_delete_confirm');
  assert(hasButton(io.sent, ids.EVO_DELETE_CONFIRM) && hasButton(io.sent, ids.EVO_DELETE_CANCEL));

  await run(supabase, tap(ids.EVO_DELETE_CONFIRM), io);
  const e1 = store.evolutions.find((e) => e.id === 'e1')!;
  assert(e1.deleted_at, 'exclusão lógica: deleted_at preenchido');
  assertEquals(e1.deleted_by, USER);
  assertEquals(store.wa_audit.length, 1, 'auditoria registrada');
  assertEquals(store.wa_audit[0].action, 'evolution_soft_delete');
  assertEquals(store.wa_audit[0].entity_id, 'e1');
});

Deno.test('Evoluções: seleção da lista por NÚMERO funciona', async () => {
  const { supabase, store } = makeSupabase({
    patients: [patient()],
    evolutions: [
      { id: 'e1', user_id: USER, patient_id: 'patients_seed', output_content: 'A', created_at: '2026-06-09', session_number: 2, deleted_at: null },
      { id: 'e2', user_id: USER, patient_id: 'patients_seed', output_content: 'B', created_at: '2026-06-02', session_number: 1, deleted_at: null },
    ],
  });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, tap(ids.PT_EVOLUTIONS), io);
  await run(supabase, txt('1'), io); // escolhe a 1ª da lista (mais recente, e1)
  assertEquals(store.wa_sessions[PHONE].sub_state, 'evo_selected');
  assertEquals(store.wa_sessions[PHONE].flow_data.selectedEvolutionId, 'e1');
});

// ---------------- Conversa não grava ----------------

Deno.test('Conversa no modo paciente NÃO grava na ficha', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  seedSession(store, PHONE, { mode: 'paciente', locked_patient_id: 'patients_seed', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, txt('o que você acha de usar exposição gradual neste caso?'), io, { chatText: 'Resposta clínica.' });
  assertEquals(store.evolutions.length, 0, 'conversa não escreve na ficha');
  assert(bodies(io.sent).includes('Resposta clínica.'));
});

// ---------------- Resolução de nome (atalho do apressado) ----------------

Deno.test('Nome: uma correspondência com conteúdo abre rascunho de evolução e anuncia contexto', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  seedSession(store, PHONE, { mode: 'menu', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, txt('evolução da Maria, ela relatou melhora importante esta semana'), io);
  assert(bodies(io.sent).includes('Ok, contexto: *Maria Silva de Souza*'));
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_capturing');
  assert(store.wa_sessions[PHONE].flow_data.draft, 'abre rascunho com o conteúdo recebido');
});

Deno.test('Nome: várias correspondências (homônimos) pede desambiguação', async () => {
  const { supabase, store } = makeSupabase({
    patients: [patient({ id: 'p1', full_name: 'Maria Silva' }), patient({ id: 'p2', full_name: 'Maria Antônia' })],
  });
  seedSession(store, PHONE, { mode: 'menu', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, txt('Maria'), io);
  assertEquals(store.wa_sessions[PHONE].sub_state, 'choose_patient');
  assert(last(io.sent).type === 'list');
});

Deno.test('Nome: nenhuma correspondência oferece cadastrar/escolher/menu', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient({ full_name: 'João Lima' })] });
  seedSession(store, PHONE, { mode: 'menu', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, txt('Joana'), io);
  assert(hasButton(io.sent, ids.NAME_CREATE) && hasButton(io.sent, ids.NAME_CHOOSE));
});

// ---------------- Expiração preservando rascunho ----------------

Deno.test('Expiração 24h: com rascunho oferece Retomar/Descartar e Retomar preserva', async () => {
  const { supabase, store } = makeSupabase({ patients: [patient()] });
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  store.wa_sessions[PHONE] = {
    phone: PHONE, updated_at: old, mode: 'paciente', locked_patient_id: 'patients_seed',
    sub_state: 'draft_capturing',
    flow_data: { draft: { target: 'new_evolution', patientId: 'patients_seed', parts: [{ kind: 'text', text: 'relato de ontem' }] } },
  };
  const io = makeIo();
  await run(supabase, txt('continuando o relato'), io);
  assertEquals(store.wa_sessions[PHONE].sub_state, 'expiry_prompt');
  assert(hasButton(io.sent, ids.EXPIRY_RESUME) && hasButton(io.sent, ids.EXPIRY_DISCARD));

  await run(supabase, tap(ids.EXPIRY_RESUME), io);
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_capturing');
  assert(store.wa_sessions[PHONE].flow_data.draft, 'rascunho sobrevive à expiração');
});

// ---------------- Cadastro com prévia ----------------

Deno.test('Cadastro: passos → prévia da ficha → criar grava o paciente', async () => {
  const { supabase, store } = makeSupabase({ patients: [] });
  seedSession(store, PHONE, { mode: 'menu', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, tap(ids.MENU_CREATE), io);
  await run(supabase, txt('Carlos Eduardo'), io);
  await run(supabase, txt('C.E.'), io);
  await run(supabase, txt('Psicanálise'), io);
  await run(supabase, txt('insônia'), io); // último passo → prévia
  assertEquals(store.wa_sessions[PHONE].sub_state, 'draft_await_preview_confirm');
  assert(bodies(io.sent).includes('Carlos Eduardo'));
  assert(hasButton(io.sent, ids.CADASTRO_CREATE));

  await run(supabase, tap(ids.CADASTRO_CREATE), io);
  assertEquals(store.patients.length, 1, 'paciente criado');
  assertEquals(store.patients[0].full_name, 'Carlos Eduardo');
  assertEquals(store.wa_sessions[PHONE].mode, 'paciente', 'entra em modo paciente após criar');
});

Deno.test('Cadastro: "voltar" corrige o passo anterior (não vira menu)', async () => {
  const { supabase, store } = makeSupabase({ patients: [] });
  seedSession(store, PHONE, { mode: 'menu', sub_state: 'idle' });
  const io = makeIo();
  await run(supabase, tap(ids.MENU_CREATE), io);
  await run(supabase, txt('Carlos'), io); // step nome → iniciais
  await run(supabase, txt('voltar'), io); // corrige
  assertEquals(store.wa_sessions[PHONE].flow_data.draft.cadastroStep, 'nome');
  assertEquals(store.wa_sessions[PHONE].mode, 'cadastro', 'não saiu para o menu');
});
