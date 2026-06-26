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
> "Olá, {nome}! O ChatPsi te acompanha na sessão inteira:
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
> "*O ChatPsi te acompanha na sessão inteira:*
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
> **▸ Ações:** [Nova evolução] · [Planejar sessão] · [Ver evoluções] · [Plano de ação] ·
> [Agendar] · [Ver ficha do paciente] · [Editar paciente] · [Trocar paciente / Menu]

---

## 5. Nova evolução (rascunho → prévia → salvar)

### 5.1 Se há um plano de sessão não usado
> **Mensagem:** "Você planejou esta sessão. Quer partir do plano?"
> **[Partir do plano]** · **[Sem o plano]**

> Ao escolher **Partir do plano:** "Ótimo — vou considerar o seu plano. Pode ditar (áudio) ou
> escrever o relato da sessão."
> Ao escolher **Sem o plano:** "Sem problema. Pode ditar (áudio) ou escrever o relato da sessão."

### 5.2 Pedir o relato
> **Mensagem:** "Pode ditar (áudio) ou escrever o relato da sessão. Vou gerar a evolução a partir
> dele."  **[Cancelar]**
>
> Se nada chegar: "Não recebi o relato da sessão. Pode ditar (áudio) ou escrever o que aconteceu."
> **[Cancelar]**

### 5.3 Evolução gerada
A IA envia o texto da evolução. Em modo teste (fora da allowlist), acrescenta:
> "_(Modo teste: esta evolução não foi salva no prontuário porque seu número não está na
> allowlist.)_"

> Em seguida: "Evolução pronta. Próximo passo?"
> **[Planejar próxima]** · **[Agendar]** · **[Menu]**

*(A geração segue a regra de ouro: o texto é mostrado para você revisar; o que é gravado é a
evolução exibida.)*

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

Fluxo guiado em 4 passos; cada pergunta traz **[Cancelar]**:
1. > "Vamos cadastrar um paciente. Qual é o *nome completo* dele(a)?" **[Cancelar]**
2. > "Quais as *iniciais* do paciente? (ex.: M.S.)" **[Cancelar]**
3. > "Qual a *abordagem* terapêutica? (ex.: TCC, Psicanálise)" **[Cancelar]**
4. > "Qual a *queixa principal*?" **[Cancelar]**

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

> **Gerando:** "Gerando o plano da próxima sessão… um instante. 📝"
>
> **Prévia (regra de ouro):**
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

---

## 13. Comandos de texto (sempre disponíveis)

- **menu**, **sair**, **voltar**, **trocar**, **trocar de paciente**, **inicio** → menu / destrava paciente.
- **ajuda**, **help**, **?**, **duvida(s)** → painel de ajuda.
- **agenda**, **agendar**, **minha agenda**, **agenda da semana** → agenda.
- **planejar** (ou "planeja …") → planejamento de sessão.
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
