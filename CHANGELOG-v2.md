# CHANGELOG — Máquina de estado WhatsApp v2

Branch: `feat/maquina-estado-v2` · Spec: `docs/specs/maquina-de-estado-chatpsi-whatsapp-v2.md`

A v2 corrige o defeito estrutural da v1 (*"o estado decidia o significado da mensagem"*) e adiciona
a segunda regra de ouro: **nada é gravado sem prévia e confirmação**. Roda em paralelo ao n8n de
produção, no número de teste (gating por `WA_TEST_ALLOWLIST`). Nenhuma mudança no fluxo de produção.

## Adicionado

- **Camada 0 — comando vence estado (§5).** Comandos reservados (`menu/sair/voltar`, `ações`,
  `nova evolução`, `evoluções`, `histórico`, `plano`, `ficha`, `editar`, `ajuda`) funcionam de
  qualquer lugar, com a regra **curta e exata** (≤ ~3 palavras + correspondência integral). Um áudio
  longo que *menciona* "histórico" nunca é confundido com comando.
- **Padrão de captura — rascunho → prévia → confirmação (§6).** Toda escrita em `patients`/
  `evolutions` passa por acúmulo multi-mensagem, **prévia com o nome do paciente no topo** e
  confirmação (`Salvar/Ajustar/Cancelar`). Vale para nova evolução, edição de evolução, edição de
  paciente (`antigo → novo`) e cadastro (`Criar/Corrigir/Cancelar`). `allowed` trava **só a
  gravação** pós-confirmação — a prévia é sempre mostrada.
- **Comando dentro de rascunho pergunta, nunca adivinha (§5).** Pausa o rascunho e oferece 2 botões
  (`[Ver …] [É conteúdo]`). Em nenhum caminho o rascunho é perdido.
- **Sub-máquina de evoluções (§8).** Listar (últimas 5), ver completa, **editar** (via captura,
  preservando origem e marcando `edited_at` + `revision_history`) e **excluir** com **confirmação
  dupla**. Exclusão é **lógica** (`deleted_at`/`deleted_by`) com **trilha de auditoria** (`wa_audit`).
- **Resolução de nome — atalho do apressado, agora seguro (§9).** Uma → trava e anuncia o contexto;
  várias (homônimos) → desambiguação; nenhuma → oferece `Cadastrar/Escolher/Menu`.
- **Conversa não grava (§7).** No modo paciente, perguntas e discussões respondem sem efeito
  colateral na ficha. Só ações explícitas escrevem.
- **Expiração de 24h preservando rascunhos (§13).** Contexto expira, mas conteúdo clínico não salvo
  sobrevive: `[Retomar] [Descartar]` antes do menu.
- **Seleção única "número ou nome"** em todas as listas (pacientes, evoluções, desambiguação).
- **Idempotência do webhook.** `message.id` já processado é ignorado (tabela `wa_processed_messages`),
  evitando gravações duplicadas em reentregas da Meta.

## Alterado

- `supabase/functions/_shared/wa/state.ts` reescrito como **orquestrador fino** do pipeline da §11
  (Camada 0 → expiração → resolução de contexto → execução → gravação via captura), com seam de
  injeção (`io`/`chatFn`) para testes sem rede.
- Lógica determinística extraída para módulos puros e testáveis em `_shared/wa/v2/`
  (`normalize`, `commands`, `selection`, `nameResolver`, `drafts`, `draftState`, `preview`,
  `expiry`, `evolutionsMachine`, `ids`).
- `_shared/wa/repo.ts`: novas funções `listEvolutionsForPatient`, `getEvolutionById`,
  `softDeleteEvolution`, `updateEvolutionContent`, `insertWaAudit`, `markMessageProcessed`; histórico
  e listagens passam a filtrar `deleted_at IS NULL`.
- **Web (dado compartilhado):** leituras de `evolutions` filtram `deleted_at IS NULL`
  (`HistoryPage`, `PatientDetailPage`, `HomePage`); o botão de excluir da web vira **soft-delete**
  (`deleted_at/deleted_by`) e a edição passa a marcar `edited_at`. Tipos do Supabase regenerados.

## Banco de dados (migrations aditivas — aplicadas no projeto remoto)

- `20260611120000_wa_sessions_v2_substate.sql` — coluna `sub_state` em `wa_sessions`.
- `20260611120100_evolutions_soft_delete.sql` — `deleted_at`/`deleted_by`/`edited_at` + índice parcial.
- `20260611120200_wa_audit.sql` — tabela de auditoria (RLS service_role).
- `20260611120300_wa_processed_messages.sql` — idempotência do webhook.

## Testes

Suíte Deno em `supabase/functions/_shared/wa/v2/__tests__/` (`deno test --allow-net …`): **33 testes,
todos verdes**. Cobrem Camada 0, captura/prévia (incl. `allowed` on/off), desambiguação em rascunho,
sub-máquina de evoluções (incl. exclusão lógica + auditoria), resolução de nome (uma/várias/nenhuma),
expiração preservando rascunho, seleção número-ou-nome e cadastro com prévia.

---

## Roteiro de teste manual (número de teste)

Pré-requisitos: função `whatsapp-webhook` implantada; seu número na `WA_TEST_ALLOWLIST` (para gravar)
ou fora dela (para validar o "modo teste" sem gravar). Tenha ao menos 1 paciente cadastrado na web.

1. **Identidade.** Envie "oi" de um número não cadastrado → fluxo de vendas. De um assinante ativo →
   menu de 3 botões. De um inativo → mensagem de renovação (uso clínico bloqueado).
2. **Menu → Escolher paciente.** Toque em *Escolher paciente* → lista. Selecione um → entra em
   *Contexto: <nome>* com a lista de ações.
3. **Camada 0 de qualquer lugar.** No modo paciente, digite `plano` → pergunta o tema. Digite `menu`
   → volta ao menu. Digite `ficha` → mostra o cadastro.
4. **Nova evolução com prévia.** Ação *Nova evolução* → dite/escreva o relato em 2-3 mensagens →
   `pronto` (ou *Gerar prévia*). Confira a **prévia com o nome do paciente no topo** → *Salvar*.
   Abra a web: a evolução aparece. (Fora da allowlist: aparece "modo teste", nada é gravado.)
5. **Comando dentro de rascunho.** Comece uma nova evolução, dite uma frase e então digite
   `histórico`. Deve **perguntar** `[Ver histórico] [É conteúdo]`. Teste os dois: em ambos o rascunho
   **não some** (em "É conteúdo", a palavra entra no relato; em "Ver histórico", volta a capturar).
6. **Evoluções (sub-máquina).** Ação *Evoluções* → lista (responda por número **ou** data). Selecione
   uma → *Ver completa* / *Editar* (dite o ajuste → prévia → confirma; na web aparece "editada em") /
   *Excluir* → **confirmação dupla** → *Excluir*. Abra a web: a evolução **sumiu** (soft-delete).
7. **Áudio.** Em nova evolução, mande um **áudio** ditando a sessão → transcrição entra no rascunho →
   prévia → salvar. Confira na web (origem áudio).
8. **Atalho do apressado.** Sem paciente travado, mande "evolução da <nome>, hoje ela relatou…" →
   anuncia *Ok, contexto: <nome>* e abre o rascunho com o conteúdo. Com homônimos → desambiguação.
   Com nome inexistente → `[Cadastrar] [Escolher] [Menu]`.
9. **Conversa não grava.** No modo paciente, faça uma pergunta clínica geral → responde, e **nada**
   é escrito na ficha (confira a web).
10. **Cadastro com prévia.** Menu → *Cadastrar paciente* → responda nome/iniciais/abordagem/queixa
    (teste `voltar` para corrigir) → **prévia da ficha** → *Criar*. Aparece na web.
11. **Expiração 24h.** Deixe um rascunho aberto e aguarde >24h (ou simule). Na próxima mensagem:
    `[Retomar] [Descartar]`. *Retomar* recupera o conteúdo ditado.
12. **Idempotência.** (Opcional) Reenvio da mesma mensagem pela Meta não gera evolução duplicada.

> Segurança/LGPD: todas as operações são amarradas ao `user_id` do psicólogo. Conteúdo clínico nunca
> some em silêncio (rascunho preservado na expiração; exclusão exige confirmação dupla + auditoria).
