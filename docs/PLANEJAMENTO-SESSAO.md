# Planejamento de sessão (web + WhatsApp)

Gera, com IA, um **rascunho do plano da próxima sessão** de um paciente, a partir do
histórico dele (+ direcionamento opcional por texto/áudio). Estrutura: **objetivo,
roteiro, técnicas/materiais, atenção, perguntas** + **espaço livre**, tudo editável.
Conecta com a evolução: **incentiva sem obrigar**.

> **Tom clínico:** o plano é **sugestão, não prescrição**. A responsabilidade é do
> psicólogo, que revisa e edita. Sempre ligado a um paciente.

## Dados
Tabela `session_plans` (migration `20260627120000_session_plans.sql`): `user_id`
(= profiles.user_id), `patient_id` (FK), `target_date`, `appointment_id` (FK), campos
`objetivo/roteiro/tecnicas/atencao/perguntas/livre`, `input_type`, `input_content`,
`status` (`rascunho`|`salvo`|`usado`), `used_in_evolution_id` (FK evolutions). RLS
`auth.uid()=user_id`; Edge Functions via service_role.

## Geração
- Persona **`planejamento_sessao`** no banco (editável em `/admin/personas`; baseline real
  no código). Saída em **JSON** com as 5 chaves estruturadas.
- `_shared/planning/generate.ts` → `generateSessionPlan(supabase, userId, patientId, direction?)`:
  carrega ficha + últimas evoluções; consulta o **catálogo pgvector** (`match_planos_de_acao`)
  para anexar **materiais com links reais** às técnicas (nunca inventa links); chama Chat
  Completions com a persona.

## Web (`/app/planejar-sessao?patient=<id>&appointment=<id?>`)
- Edge Function `plan-session` gera (transcreve áudio de direcionamento via Whisper).
- `PlanSessionPage`: 6 campos editáveis, **regenerar** com direcionamento, **salvar** em
  `session_plans` (status `salvo`).
- Entradas: botão **"Planejar sessão"** em `PatientDetailPage` e em cada compromisso da
  `AgendaPage`.

## WhatsApp (`_shared/wa/planning.ts`)
- Item **"Planejar sessão"** no menu do paciente + comando de texto **"planejar"**.
- Pedido ou **áudio de direcionamento** → gera → plano em seções + **PRÉVIA + [Salvar ·
  Ajustar · Cancelar]**. "Ajustar" recaptura direção e regenera. "Salvar" grava em `session_plans`.

## Conexão com a evolução (incentivar sem obrigar)
- `generate-evolution` aceita `plan_context` opcional (prepended ao prompt; sem ele, idêntico).
- **Web (`EvolutionInput`):** ao escolher um paciente com plano recente salvo → oferta
  (Switch) "Usar o plano como base?". Ao gerar, envia o contexto; ao salvar, marca o plano
  `usado` + `used_in_evolution_id`.
- **WhatsApp (`state.ts`):** ao tocar "Nova evolução", se houver plano recente → botões
  **[Partir do plano / Sem o plano]**. Sem plano → fluxo normal; **nunca bloqueia** a evolução.

## Fora de escopo
Planejamento sem paciente (tema solto); biblioteca de modelos; compartilhar plano com o paciente.
