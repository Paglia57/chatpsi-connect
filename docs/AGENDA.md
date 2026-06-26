# Agenda do psicólogo (Nível 1)

Gestão de agenda na **web** e no **WhatsApp**: agendar, editar, cancelar, colar link e
recuperar. **Nível 1:** sem lembretes proativos, sem sync com Google Calendar, sem avisar
paciente. A agenda vive só no ChatPsi; o link da reunião é **colado** pelo psicólogo.

## Dados
Tabela `appointments` (migration `20260626130000_appointments.sql`): `user_id` (= profiles.user_id),
`patient_id` (FK, ON DELETE SET NULL), `patient_initials`, `starts_at timestamptz` (UTC),
`duration_min`, `modality` (online|presencial), `meeting_link`, `status`
(agendado|realizado|cancelado|faltou), `notes`. RLS espelha `patients` (`auth.uid()=user_id`);
Edge Functions usam service_role.

## Fuso horário
Default **America/Sao_Paulo (UTC−3**, Brasil sem horário de verão). Helpers em
`_shared/wa/tz.ts` (`spWallToUtc`, `formatSP`, `nowSP`, `startOfTodaySP`). `starts_at` é
guardado em UTC e exibido/interpretado em SP. No front, helpers equivalentes em
`AgendaEventDialog.tsx` (`buildIsoSP`, `spDateTimeParts`).

## Web (`/app/agenda`)
Visão **Dia/Semana** com navegação, lista por dia ("HH:MM — Paciente (modalidade) • link"),
e CRUD via `AgendaEventDialog` (PatientSelector, data, hora, duração pré-preenchida do
paciente, modalidade, link, observação, status). Ações rápidas **realizado/faltou/cancelar**;
botão **"ditar evolução"** (`/app/evolucao?patient=<id>`). Link na seção Clínica da sidebar.

## WhatsApp (`_shared/wa/agenda.ts`, dentro do `whatsapp-webhook`)
Encaixa na máquina de estado (`_shared/wa/state.ts`). **Regra de ouro:** agendar/editar/
cancelar/link passam por **PRÉVIA + [Salvar · Ajustar · Cancelar]** antes de gravar.

- **Entrada A — menu inicial → "Agenda":** panorama do psicólogo (hoje em detalhe + próximos
  dias resumidos). Tocar num compromisso **trava o paciente** e mostra a agenda dele (pronto
  para qualquer ação, inclusive ditar a evolução).
- **Entrada B — ações do paciente → "Agendar":** agenda daquele paciente (já travado).
- **Linguagem natural:** "agenda a Maria quinta 15h", "remarca o João pra sexta 16h",
  "cancela a sessão da Maria", "o link da Maria é https://meet…". Parser pt-BR em
  `_shared/wa/datetime.ts` (hoje/amanhã/dias da semana/"que vem"/dd-mm/horas), sempre
  resolvendo para o próximo horário futuro em SP.
- **Comandos de texto:** "agenda" / "minha agenda" abrem o panorama (ou a agenda do paciente
  travado) de qualquer lugar.
- **Bordas:** paciente não encontrado → Escolher/Cadastrar/Menu; agendamento em aberto >24h
  → Retomar/Descartar; "menu/sair" cancela um agendamento em andamento.

> O menu inicial do WhatsApp passou de **botões** para **lista** (4 itens) para caber a Agenda.

## Fora de escopo (futuro)
Lembretes proativos; detecção de conflito de horário; sync Google Calendar; notificação ao
paciente; recorrência automática.
