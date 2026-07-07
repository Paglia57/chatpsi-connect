# Manual do WhatsApp — ChatPsi

> Guia de telas do canal WhatsApp (API oficial), na ótica do psicólogo. As **mensagens** e os
> **rótulos de botões/listas** abaixo são os **textos reais do código** (`_shared/wa/*`).
> Em fase de testes (allowlist). Itens previstos mas não implementados estão marcados como
> **(planejado, ainda não disponível)**.

## Convenções

- **Mensagem** = o que o ChatPsi envia para você.
- **Resposta** = o que você digita ou dita (áudio).
- **[Botão]** = opção para tocar. Listas aparecem como **▸ opções**.
- Chaves `{nome}`, `{dd/mm}`, `{hora}` mudam conforme o caso.
- **Regra de ouro:** *nada é gravado sem antes mostrar uma prévia para você confirmar.*
- **Regra de navegação:** *toda resposta oferece um próximo passo e/ou uma saída.* Quando a
  mensagem pede algo digitado, sempre há um **[Cancelar]** ou **[Menu]**.
- Você pode digitar a qualquer momento: **menu**, **ajuda**, **agenda**, **planejar** etc. — os
  comandos de texto funcionam em paralelo aos botões.

---

## 1. Identidade e assinatura

### 1.1 Número não cadastrado
Entra no fluxo de vendas (conversa contínua, sem botões).

### 1.2 Assinatura inativa
> **Mensagem:** "Olá{, nome}! Sua assinatura do ChatPsi está inativa no momento, então o uso
> clínico está pausado. Para reativar e voltar a ditar evoluções e usar as ferramentas, é só
> renovar sua assinatura no painel web do ChatPsi (acesse sua conta e atualize o plano)."

### 1.3 Mídia não entendida
> **Mensagem:** "Não consegui processar sua mídia. Pode reenviar em texto, por favor?"

### 1.4 Fora da allowlist de teste (ao cadastrar)
> **Mensagem:** "O cadastro de paciente só é gravado para números na allowlist de teste. Fale com
> o suporte para liberar o seu número."

*(Áudio é transcrito automaticamente; imagem é descrita; PDF é lido — com OCR quando necessário.)*

---

## 2. Menu inicial (saudação "Antes · Durante · Depois")

> **Mensagem:**
> "Olá, {nome}! O ChatPsi te acompanha em toda a sua prática clínica:
> 🗓️ *Antes* — planejar e agendar
> 💬 *Durante* — conversar e anotar
> 📝 *Depois* — registrar a evolução
>
> O que vamos fazer?"
>
> **▸ Ver opções** (lista em seções):
> - **Antes:** [Planejar sessão] · [Agendar / Agenda]
> - **Durante:** [Escolher paciente] · [Cadastrar paciente] · [Conversar com chat] *(Sem vincular a
>   um paciente)*
> - **Depois:** [Nova evolução] · [Ver evoluções]
> - **Mais:** [Ajuda]

A qualquer momento, **menu** / **sair** / **voltar** retornam aqui.

### 2.1 Ajuda (item "Ajuda" ou digitar "ajuda")
> **Mensagem:**
> "*O ChatPsi te acompanha em toda a sua prática clínica:*
> 🗓️ *Antes* — planeje a próxima sessão e organize sua agenda.
> 💬 *Durante* — converse com o chat clínico (com ou sem paciente) e tire dúvidas.
> 📝 *Depois* — registre a evolução do atendimento.
>
> Toque numa opção do menu ou escreva (ex.: "agenda", "planejar", "nova evolução"). Digite *menu*
> a qualquer momento para voltar."

---

## 3. Escolher paciente

### 3.1 Sem pacientes
> **Mensagem:** "Você ainda não tem pacientes cadastrados."
> **[Cadastrar paciente]** · **[Menu]**

### 3.2 Até 10 pacientes (lista)
> **Mensagem:** "Selecione o paciente:"
> **▸ Ver pacientes:** {nome} *(iniciais)* …

### 3.3 Muitos pacientes (escolha por número ou nome)
> **Mensagem:** "Você tem {N} pacientes:
> 1. {nome} ({iniciais})
> 2. …
> Me diga o *NÚMERO* ou o *NOME* (ou parte do nome)."
>
> **Resposta:** o número (`1`, `#2`) ou o nome/parte dele.

### 3.4 Busca ambígua
> **Mensagem:** "Encontrei mais de um. Selecione:" → lista com os candidatos.

---

## 4. Menu do paciente (paciente travado)

> **Mensagem:** "Paciente *{nome}* selecionado. O que deseja?"
> **▸ Ações:** [Nova evolução] · [Planejar sessão] · [Ver planejamentos] · [Ver evoluções] ·
> [Plano de ação] · [Agendar] · [Ver ficha do paciente] · [Editar paciente] ·
> [Trocar paciente / Menu]

---

## 5. Nova evolução (rascunho → gerar → prévia → salvar)

O fluxo acumula o relato em quantas mensagens (áudio/texto) você quiser e **só gera quando você
manda** — nada é gravado sem a prévia + Salvar.

### 5.1 Se há um plano de sessão não usado
> **Mensagem:** "Você planejou esta sessão. Quer partir do plano?"
> **[Partir do plano]** · **[Sem o plano]**

Qualquer das opções abre o rascunho (a "Partir do plano" usa o plano como base).

### 5.2 Abrir o rascunho (acumular o relato)
> **Mensagem:** "Pode ditar (enviar Áudio) ou escrever o relato da sessão de *{nome}* (em quantas
> mensagens quiser). Quando terminar, toque em *Gerar evolução* — você poderá revisar e editar
> antes de salvar."  **[Gerar evolução]** · **[Cancelar]**
>
> Você manda um ou vários áudios/textos — **eles são acumulados** e o sistema **não responde a cada
> mensagem** (acúmulo silencioso).

### 5.3 Gerar a prévia
Toque em **[Gerar evolução]** ou diga **pronto**.
> Se não houver relato: "Ainda não recebi o relato. Pode ditar (enviar Áudio) ou escrever o que
> aconteceu na sessão." **[Gerar evolução]** · **[Cancelar]**

A IA gera e mostra o texto da evolução (**prévia**), seguido de:
> **Mensagem:** "Isso é apenas um rascunho. A responsabilidade de revisar e editar é sua.
>
> Salvar esta evolução?"
> **[Salvar]** · **[Ajustar]** · **[Cancelar]**

- **Salvar** → grava na ficha: "✅ Evolução salva na ficha." e oferece o próximo passo:
  > "Evolução pronta. Próximo passo?" **[Planejar próxima]** · **[Agendar]** · **[Menu]**
  > Em modo teste (fora da allowlist): "_(Modo teste: esta evolução não foi salva no prontuário
  > porque seu número não está na allowlist.)_"
- **Ajustar** → "O que você quer complementar ou corrigir? Pode ditar (enviar Áudio) ou escrever;
  depois toque em *Gerar evolução*." (volta a acumular e regenera) **[Gerar evolução]** · **[Cancelar]**
- **Cancelar** → "Evolução descartada. Nada foi salvo." → menu do paciente.

*(Regra de ouro: nada é gravado antes da prévia + Salvar.)*

---

## 6. Ver evoluções (histórico)

> **Com evoluções:** "Histórico recente de *{nome}*:
> 📂 {data} · sessão {n}
> {trecho}…"  (até 5 recentes) → seguido do menu do paciente.
>
> **Sem evoluções:** "Ainda não há evoluções registradas para *{nome}*."

*(Editar/excluir evolução completos ficam no web app — ver MANUAL-WEB-APP.md.)*

---

## 7. Cadastrar paciente

Fluxo guiado em 3 passos; cada pergunta traz **[Cancelar]**:
1. > "Vamos cadastrar um paciente. Qual é o *nome completo* dele(a)?" **[Cancelar]**
2. > "Quais as *iniciais* do paciente? (ex.: M.S.)" **[Cancelar]**
3. > "Qual a *queixa principal*?" **[Cancelar]**

*(A abordagem terapêutica não é mais perguntada no cadastro: vem do perfil do psicólogo.)*

> **Conclusão:** "Pronto! *{nome}* foi cadastrado(a) e já aparece no seu painel web." → abre o menu
> do paciente.
> **Erro:** "Não consegui cadastrar o paciente agora. Tente novamente em instantes."
> **Cancelado:** "Cadastro cancelado." → menu.

---

## 8. Ver ficha / Editar paciente

### 8.1 Ficha
> **Mensagem:**
> "📋 *Ficha do paciente*
> *Nome:* {nome}
> *Iniciais:* {iniciais}
> *Abordagem:* {abordagem}
> *Queixa:* {queixa}
> *Sessões:* {n}"

### 8.2 Editar
> **Mensagem:** "O que deseja editar em *{nome}*?"
> **▸** [Nome] · [Iniciais] · [Abordagem] · [Queixa]
>
> Depois: "Envie o novo valor para *{campo}*:" **[Cancelar]**
> Confirmação: "✅ *{campo}* atualizado(a)."

---

## 9. Modo livre (conversar com o chat, sem paciente)

> **Ao entrar:** "Modo livre ativado. Pode mandar sua dúvida clínica, um tema de estudo ou um
> pedido (sem vincular a um paciente)."
>
> **A cada resposta da IA:** o texto vem seguido de "_Digite *menu* para voltar ao início._"

---

## 10. Plano de ação

> **Mensagem:** "Sobre qual tema/foco você quer o plano de ação?" **[Cancelar]**
>
> Depois de gerar, o plano é enviado e o **menu do paciente** reaparece.

---

## 11. Agenda

Digite **agenda** (ou toque em **Agendar / Agenda**).

### 11.1 Panorama do psicólogo
> **Vazio:** "Sua agenda dos próximos dias está vazia."  **[Agendar sessão]** · **[Menu]**
>
> **Com compromissos:** um resumo dos próximos dias seguido de "Toque num compromisso para abrir o
> paciente:" → lista de compromissos ({hora} {iniciais}).

### 11.2 Agenda do paciente travado
> **Sem sessões:** "*{nome}* não tem sessões agendadas. Para marcar, toque em *Agendar* no menu do
> paciente — ou escreva, por exemplo, *agenda {primeiro nome} quinta 15h*."
>
> **Com sessões:** "*Agenda de {nome}:*" + datas/horários, e a dica: "Para remarcar/cancelar ou
> colar link, é só escrever (ex.: "remarca para sexta 16h", "o link é https://…")."

### 11.3 Agendar (fluxo guiado)
1. Paciente (se ainda não escolhido):
   > "Para qual paciente é a sessão?" **[Selecionar paciente]** · **[Cadastrar]** · **[Menu]**
2. Quando:
   > "Quando você quer agendar *{nome}*? (ex.: quinta 15h, amanhã 10h, 12/06 14h)" **[Cancelar]**
   > (se você der só o dia) "Para que horário no dia {dd/mm}? (ex.: 15h ou 15:30)" **[Cancelar]**
3. Duração:
   > "Duração da sessão? (padrão: {n} min)" → **[30 min]** · **[50 min]** · **[60 min]** · **[Outro]**
   > Em "Outro": "Quantos minutos? (ex.: 45) — ou toque numa das opções." **[Cancelar]**
4. **Prévia (regra de ouro):**
   > "*Agendar* / Sessão — {nome}, {dia}, {hora} ({n}min), {modalidade}"
   > **[Salvar]** · **[Ajustar]** · **[Cancelar]**
5. **Salvo:**
   > "✅ Sessão agendada para *{nome}* — {dia} {hora}. Envie a *URL* do link da reunião, ou toque em
   > *Pular*." **[Pular]**
6. **Próximos passos:**
   > "Tudo certo! E agora?" **[Planejar a sessão]** · **[Agendar outra]** · **[Menu]**

### 11.4 Remarcar / Cancelar (por texto)
Escreva, por exemplo, "remarca para sexta 16h" ou "cancela a sessão da Maria".
> **Remarcado:** "✅ Sessão de *{nome}* remarcada para {dia} {hora}."
> **Cancelado:** "✅ Sessão de *{nome}* cancelada."

### 11.5 Erros/bordas da agenda (cada um com **[Menu]**)
- "Não entendi a data/hora. Tente: quinta 15h, amanhã 10h, 12/06 14h."
- "Não entendi o horário. Envie como 15h ou 15:30."
- "Não identifiquei o paciente para essa alteração. Tente: "cancela a sessão da Maria"."
- "*{nome}* não tem sessão futura agendada."
- "*{nome}* não tem sessão futura para anexar o link."
- "Paciente não encontrado."
- "Operação cancelada. Nada foi gravado."

---

## 12. Planejamento de sessão

### 12.1 Escolha antes de gerar
Ao tocar em **Planejar sessão** (ou digitar "planejar"):
> **Mensagem:** "Vamos planejar a sessão de *{nome}*. Como prefere?"
> **[Quero dar contexto]** · **[Gerar agora]** · **[Menu]**

- **Gerar agora** → gera a partir do histórico do paciente (vai direto à prévia).
- **Quero dar contexto** → abre um **rascunho de direcionamento**:
  > "Pode ditar (enviar Áudio) ou escrever o foco do planejamento de *{nome}* (em quantas mensagens
  > quiser). Quando terminar, toque em *Gerar planejamento*." **[Gerar planejamento]** · **[Cancelar]**
  >
  > Acúmulo silencioso (vários áudios/textos). Gere com **[Gerar planejamento]** ou diga **pronto**.
  > Sem direcionamento: "Ainda não recebi o direcionamento. Pode ditar (enviar Áudio) ou escrever o
  > foco do planejamento." **[Gerar planejamento]** · **[Cancelar]**

### 12.2 Prévia (regra de ouro)
> **Gerando:** "Gerando o plano da próxima sessão… um instante. 📝"
>
> "*Plano da próxima sessão — {nome}*
> *Objetivo:* … *Roteiro:* … *Técnicas/materiais:* … *Atenção:* … *Perguntas:* …"
> "_Sugestão de rascunho — você revisa e edita. A responsabilidade clínica é sua._"
> **[Salvar]** · **[Ajustar]** · **[Cancelar]**
>
> **Ajustar:** "O que você quer ajustar? (ex.: "foca na ansiedade no trabalho" ou mande um áudio)"
> **[Cancelar]**
> **Cancelar:** "Plano descartado. Nada foi salvo." → volta ao menu do paciente.
>
> **Salvo:** "✅ Plano salvo para *{nome}*." → "Plano salvo. E agora?"
> **[Agendar sessão / Ver agenda]** · **[Voltar ao paciente]** · **[Menu]**
>
> **Erros (com [Menu]):** "Não consegui gerar o plano agora. Tente novamente em instantes." ·
> "Não há plano pendente para salvar." · "Não consegui salvar o plano agora. Tente novamente."

### 12.3 Ver planejamentos (recuperar salvos)
Pela ação **Ver planejamentos** (ou digitar "planejamentos"):
> **Com planos:** "Planejamentos de *{nome}*:" → lista ({dd/mm}, "· usado" quando aplicável, com um
> trecho do objetivo). Se forem muitos (>10): "Me diga o *número* ou a *data*."
>
> **Sem planos:** "Ainda não há planejamentos salvos para *{nome}*." **[Planejar sessão]** · **[Menu]**

Ao escolher um planejamento:
> **Mensagem:** "Planejamento de {dd/mm}. O que deseja?"
> **[Ver completo]** · **[Editar]** · **[Usar na evolução]** · **[Menu]**

- **Ver completo** → exibe objetivo/roteiro/técnicas/atenção/perguntas (+ espaço livre).
- **Editar** → "O que você quer ajustar neste planejamento? Pode ditar (enviar Áudio) ou escrever;
  depois toque em *Gerar planejamento*." → nova **prévia**; **Salvar atualiza** o mesmo plano
  ("✅ Plano atualizado.").
- **Usar na evolução** → inicia uma **Nova evolução** já partindo deste plano como base (o plano é
  marcado como *usado* ao salvar a evolução).

---

## 13. Comandos de texto (sempre disponíveis)

- **menu**, **sair**, **voltar**, **trocar**, **trocar de paciente**, **inicio** → menu / destrava paciente.
- **ajuda**, **help**, **?**, **duvida(s)** → painel de ajuda.
- **agenda**, **agendar**, **minha agenda**, **agenda da semana** → agenda.
- **planejar** (sozinho) → abre a escolha *Quero dar contexto / Gerar agora*; **"planeja {foco}"**
  (com direção) → gera direto com esse foco.
- **planejamentos** → ver os planejamentos salvos do paciente travado.
- **pronto** → fecha o rascunho e gera a prévia (na **Nova evolução** e no **Dar mais contexto** do
  planejamento).
- **remarca/adia/muda/transfere …**, **cancela/desmarca …** → remarcar/cancelar.
- Colar uma **URL** de reunião → anexa o link à próxima sessão.
- Citar o **nome** de um paciente ativo → trava o paciente e abre o menu dele.
- Datas naturais ("quinta 15h", "amanhã 10h", "12/06 14h") são entendidas no contexto de agenda.

---

## 14. Casos de borda

- **Agendamento aberto há mais de 24h:**
  > "Você tem um agendamento em aberto de mais de 24h. O que deseja?"  **[Retomar]** · **[Descartar]**
  > Descartar: "Agendamento descartado." → menu.
- **Sessão inativa há 24h:** volta ao menu na próxima mensagem.
- **Paciente não encontrado (ao retomar):** "Não encontrei esse paciente. Vamos recomeçar." → menu.
- **Texto que parece comando:** os comandos de texto têm prioridade; em modo livre, o texto é
  tratado como conversa.

---

## Diferenças entre canais
- **Editar/excluir evolução** e **exportar PDF**: completos só no web app.
- **Histórico** no WhatsApp mostra os 5 mais recentes (resumo); a lista completa fica na web.
- **Marketing**, **Calculadora Tributária**, **perfil/preferências** e **admin**: só web.

*(Ver também: `MAPA-DO-SISTEMA.md` e `MANUAL-WEB-APP.md`.)*
