# Auditoria de navegação — WhatsApp (nenhum beco sem saída)

> **Regra de ouro:** nenhuma resposta enviada ao psicólogo termina "nua". Toda mensagem
> oferece **pelo menos um** destes caminhos: (a) botão(ões) de **próximo passo** coerente
> com o contexto; e/ou (b) uma **saída** sempre disponível (*Menu* / *Cancelar*).
> Mensagens que **pedem input digitado** trazem botão de saída (*Cancelar* / *Menu*) — mas
> **digitar continua funcionando** como alternativa.

**Escopo:** `_shared/wa/state.ts`, `_shared/wa/agenda.ts`, `_shared/wa/planning.ts`.
**Não alterado:** regras de negócio, gravação, prévias/confirmações, comandos de texto.
**Limites WhatsApp respeitados:** botões ≤ 3 (~20 chars); listas ≤ 10 itens em seções.

## Padrões aplicados (helpers reutilizados)

Para não duplicar e não poluir, foram criados helpers curtos em cada módulo:

| Módulo | Helper | Uso | Botão |
|---|---|---|---|
| `state.ts` | `askExit(body)` | prompt que pede input digitado | **[Cancelar]** (`ctx_exit`) |
| `state.ts` | `menuExit(body)` | informativo/erro terminal | **[Menu]** (`ctx_exit`) |
| `agenda.ts` | `ask(ctx, body)` | prompt de input (data/hora/duração) | **[Cancelar]** (`AG_CANCEL`) |
| `agenda.ts` | `info(ctx, body)` | informativo/erro/borda | **[Menu]** (`ctx_exit`) |
| `planning.ts` | `plAsk(ctx, body)` | prompt de ajuste | **[Cancelar]** (`PL_CANCEL`) |
| `planning.ts` | `plInfo(ctx, body)` | erro/borda | **[Menu]** (`ctx_exit`) |

`ctx_exit` já está roteado em `handleReply` → `exitContext` → `sendMenu` (menu inicial).

### Orquestração cross-módulo

`agenda.ts`/`planning.ts` **não** renderizam o menu inicial nem o menu do paciente (essas são
closures do `state.ts`). Para cancelamentos/voltas, os handlers **retornam um `action`** e o
`state.ts` decide o que mostrar:

- `handleAgendaReply` → `action: "menu"` ⇒ `state.ts` chama `sendMenu()`.
- `handlePlanningReply` → `action: "patient_menu"` ⇒ `sendPatientMenu(patient)` (fallback `sendMenu`).
- `handlePlanningReply` → `action: "patient_agenda"` ⇒ `showPatientAgenda` + `sendPatientMenu`.
- `handlePlanningReply` → `action: "agendar"` ⇒ inicia agendamento do paciente.

---

## Inventário de pontos de envio e status

Legenda: **OK** já tinha saída · **CORRIGIDO** estava nu/sem saída e foi ajustado.

### `state.ts` — menu, cadastro, paciente, evolução, plano, modo livre

| Ponto | Antes | Depois | Status |
|---|---|---|---|
| Saudação inicial + menu seccionado (Antes/Durante/Depois) | lista interativa | — (já oferece opções) | OK |
| Menu do paciente travado (`sendPatientMenu`) | botões de ação | — | OK |
| Cadastro: "nome completo?" | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Cadastro: "iniciais?" | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Cadastro: "abordagem?" | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Cadastro: "queixa principal?" | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Editar campo: "Envie o novo valor para *X*" | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Editar campo: "Não recebi o novo valor para *X*" | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Plano de ação: "Sobre qual tema…?" (`PT_PLAN`) | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Plano de ação: "Sobre qual tema…?" (`runPlan` reentrada) | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Plano de ação: resultado (`runPlan` fim) | texto nu | + `sendPatientMenu(patient)` | CORRIGIDO |
| Evolução: pedir relato (`startEvolutionForPatient`) | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Evolução: "Ótimo, vou usar o plano…" (`EV_USE_PLAN`) | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Evolução: "Sem problema…" (`EV_NO_PLAN`) | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Evolução: "Não recebi o relato da sessão." | `sendText` nu | `askExit` **[Cancelar]** | CORRIGIDO |
| Histórico (`PT_HISTORY`/`showHistory`) | texto nu | + `sendPatientMenu(patient)` | CORRIGIDO |
| Modo livre: resposta do chat | `sendText` nu | + `_Digite *menu* para voltar…_` | CORRIGIDO |
| Lista vazia: "ainda não tem pacientes" | `sendText` nu | botões **[Cadastrar paciente · Menu]** | CORRIGIDO |
| `await_name`: "Não encontrei paciente com esse nome" | `sendText` nu | botões **[Ver lista · Menu]** | CORRIGIDO |
| `await_name`: "Não encontrei. Responda com o número…" | `sendText` nu | `menuExit` **[Menu]** | CORRIGIDO |
| "Para planejar, escolha um paciente…" | `sendText` nu | botões **[Escolher paciente · Menu]** | CORRIGIDO |
| Prévia da evolução + [Salvar · Editar · Descartar] | botões | — (prévia, inalterada) | OK |
| Confirmações de gravação (evolução/plano salvos) + próximos passos | botões | — | OK |
| Allowlist: "cadastro só é gravado para…" + `sendMenu` | seguido de menu | — | OK |

### `agenda.ts` — agendar, remarcar, cancelar, listar

| Ponto | Antes | Depois | Status |
|---|---|---|---|
| "Quando?" (data/hora ao agendar) | `sendText` nu | `ask` **[Cancelar]** | CORRIGIDO |
| "Para que horário?" | `sendText` nu | `ask` **[Cancelar]** | CORRIGIDO |
| "Quantos minutos de duração?" | `sendText` nu | `ask` **[Cancelar]** | CORRIGIDO |
| "Para quando remarcar?" | `sendText` nu | `ask` **[Cancelar]** | CORRIGIDO |
| "Não entendi a data/hora. Tente de novo." | `sendText` nu | `ask` **[Cancelar]** | CORRIGIDO |
| "Paciente não encontrado." (3 ocorrências) | `sendText` nu | `info` **[Menu]** | CORRIGIDO |
| "*X* não tem sessão futura agendada." | `sendText` nu | `info` **[Menu]** | CORRIGIDO |
| "Não identifiquei o paciente." | `sendText` nu | `info` **[Menu]** | CORRIGIDO |
| "Esse compromisso não está vinculado…" | `sendText` nu | `info` **[Menu]** | CORRIGIDO |
| `AG_CANCEL` / `AG_DISCARD` (cancelar fluxo) | texto nu | "Cancelado." + `action:"menu"` ⇒ `sendMenu` | CORRIGIDO |
| `AG_RESUME` (retomar) | — | `action:"menu"` no fim | CORRIGIDO |
| Agenda do dia/lista (`showAgenda`/`showPatientAgenda`) + próximos passos | botões | — | OK |
| Prévia "Confirmar agendamento?" [Confirmar · Cancelar] | botões | — (prévia, inalterada) | OK |
| Confirmação "Agendado ✅" + [Planejar · Agendar outro · Menu] | botões | — | OK |

### `planning.ts` — planejar próxima sessão

| Ponto | Antes | Depois | Status |
|---|---|---|---|
| "O que você quer ajustar?" (`PL_ADJUST`) | `sendText` nu | `plAsk` **[Cancelar]** | CORRIGIDO |
| "Não consegui gerar o plano agora." | `sendText` nu | `plInfo` **[Menu]** | CORRIGIDO |
| "Não há plano pendente para salvar." | `sendText` nu | `plInfo` **[Menu]** | CORRIGIDO |
| "Não consegui salvar o plano agora." | `sendText` nu | `plInfo` **[Menu]** | CORRIGIDO |
| `PL_CANCEL` (descartar plano) | texto nu | "Plano descartado." + `action:"patient_menu"` | CORRIGIDO |
| "Gerando o plano… 📝" | `sendText` informativo | — (transitório, prévia logo a seguir) | OK |
| Prévia do plano + [Salvar · Ajustar · Cancelar] | botões | — (prévia, inalterada) | OK |
| "Plano salvo ✅" + [Agendar/Ver agenda · Voltar ao paciente · Menu] | botões | — | OK |

---

## Critério de pronto (verificação)

- [x] `deno check` limpo em `state.ts`, `agenda.ts`, `planning.ts`.
- [x] Todo prompt de input (cadastro, editar campo, agenda data/hora/duração, tema do plano,
      relato da evolução, ajuste do plano) traz **[Cancelar]/[Menu]** — e digitar ainda funciona.
- [x] Histórico, plano de ação e modo livre terminam com saída (menu/ações), não "nu".
- [x] Cancelar agendamento → menu inicial; cancelar plano → menu do paciente.
- [x] Erros/bordas (paciente não encontrado, sem sessão futura, compromisso não vinculado)
      oferecem recuperação por botão.
- [x] Prévias/gravação/comandos de texto **inalterados**; limites do WhatsApp respeitados.
- [x] Sem poluição: pontos simples usam 1 botão (**Menu**); pontos de decisão, 2–3 botões.

**Resultado:** nenhum ponto permanece *SEM SAÍDA* ou *PEDE INPUT SEM SAÍDA*.

---

## Adendo — novos fluxos (mantêm a regra)

Fluxos adicionados depois desta auditoria já seguem o princípio (próximo passo e/ou saída em toda
mensagem; prompts de input com botão de saída):

| Ponto | Saída/Botões | Status |
|---|---|---|
| Evolução — abrir rascunho (`openEvoCapture`) | **[Gerar evolução] · [Cancelar]** | OK |
| Evolução — aviso "sem relato" | **[Gerar evolução] · [Cancelar]** | OK |
| Evolução — prévia | **[Salvar] · [Ajustar] · [Cancelar]** | OK |
| Planejamento — escolha (`offerPlanningChoice`) | **[Dar mais contexto] · [Gerar agora] · [Menu]** | OK |
| Planejamento — rascunho de direcionamento | **[Gerar planejamento] · [Cancelar]** | OK |
| Ver planejamentos — lista vazia | **[Planejar sessão] · [Menu]** | OK |
| Ver planejamentos — opções do plano | **[Ver completo] · [Editar] · [Usar na evolução] · [Menu]** | OK |
| Ver planejamentos — escolha por número/data (>10) | reaviso com **[Menu]** | OK |
