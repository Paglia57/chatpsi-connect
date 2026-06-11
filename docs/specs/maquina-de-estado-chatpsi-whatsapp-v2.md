# Máquina de estado da conversa — ChatPsi WhatsApp-first (v2)

> **O que é este documento:** a especificação do comportamento da conversa do ChatPsi no WhatsApp oficial — o que acontece a cada mensagem, quais caminhos existem, e onde cada resultado é guardado. Serve para alinhar os donos do produto e guiar a implementação.
>
> **O que NÃO é:** um guia da API do WhatsApp nem do código. É o *modelo de comportamento*.
>
> **Contexto:** roda em paralelo ao sistema atual (n8n), num número de teste, sem afetar o atendimento de produção. As tabelas clínicas (`patients`, `evolutions`) são **as mesmas do app web** — o que é ditado no WhatsApp aparece na web automaticamente.

## O que mudou da v1 para a v2

A v1 tinha um defeito estrutural: **o estado atual decidia o significado da mensagem**. Quem estava ditando uma evolução e digitava "histórico" via o comando virar texto do prontuário. A v2 inverte a ordem — primeiro se pergunta "isso é um comando?", depois "isso é conteúdo do estado atual?" — e adiciona uma segunda regra de ouro: **nada é gravado sem prévia e confirmação**.

As mudanças, em resumo:

1. **Camada 0** — comandos reservados funcionam de qualquer lugar (seção 5).
2. **Padrão de captura** — todo fluxo que grava dado passa por rascunho → prévia → confirmação (seção 6).
3. **Sub-máquina de evoluções** — listar, ver, editar e excluir evoluções, com paridade ao que o paciente já tinha (seção 8).
4. **Resolução de nome no atalho do apressado** — trata homônimos, erros de grafia e nome inexistente; o sistema sempre anuncia em quem travou (seção 9).
5. **Conversa não grava** — em modo paciente, só ações explícitas escrevem na ficha (seção 7).
6. **Expiração de 24h preserva rascunhos** — contexto expira, conteúdo clínico não salvo sobrevive (seção 13).
7. **Menu do modo paciente vira lista interativa** — respeitando o limite real da API (3 botões por mensagem, lista de até 10 itens) (seção 14).
8. **Toda lista numerada aceita número ou nome** — um único padrão de seleção no produto inteiro.

---

## 1. A ideia em uma frase

O psicólogo conversa com o ChatPsi pelo WhatsApp como quem fala com um assistente: manda texto, áudio, imagem ou documento, escolhe um paciente, dita a sessão, pede um plano — e o sistema entende em que **contexto** está e onde **guardar** o resultado, sempre mostrando uma **prévia antes de gravar** e sempre oferecendo uma **porta de saída**. A "máquina de estado" é o que dá essa memória de contexto a um canal que, por natureza, é só uma linha solta de mensagens.

---

## 2. Por que precisa de uma máquina de estado

O WhatsApp não tem "telas" nem "modo" embutido — é texto corrido. Quando o psicólogo escreve *"agora faz o plano"*, o sistema precisa saber **de qual paciente** ele está falando. Isso exige guardar, por número de telefone, um **estado de conversa**: qual paciente está travado, em que passo de um cadastro a pessoa está, se há um rascunho aberto. Sem isso, cada mensagem seria interpretada do zero e o produto viraria um gerador de texto avulso — não um prontuário que lembra.

---

## 3. Identidade: quem está falando

Cada mensagem chega com o número de telefone já verificado pela Meta. O sistema resolve esse número para um psicólogo e decide o rumo logo na entrada. São **três situações de identidade**, antes mesmo de qualquer menu:

| Situação | Como o sistema reage |
|---|---|
| **Número não cadastrado** | Não é cliente. Entra no fluxo de **vendas/onboarding** (oferece cadastro e assinatura). |
| **Cadastrado, assinatura ativa** | É o psicólogo-cliente. Segue para o fluxo de conversa (menu e modos). |
| **Cadastrado, assinatura inativa** | Entra no **caminho de renovação**: o uso clínico fica bloqueado e o sistema orienta a renovar (direciona à web). Não aciona o assistente clínico. |

> **Nota de segurança / LGPD:** o isolamento entre psicólogos depende de o sistema sempre amarrar cada operação ao psicólogo correto (o identificador interno dele). Toda leitura e escrita de paciente e evolução carrega esse vínculo — é o que impede um psicólogo de ver dado de outro.

---

## 4. Os três caminhos (o menu inicial)

Quando um psicólogo ativo manda uma mensagem **sem especificar paciente nem ação**, o sistema responde com uma saudação e **três botões** (o máximo que a API permite por mensagem):

```
Olá, [nome]! O que vamos fazer?
[ Escolher paciente ]  [ Cadastrar paciente ]  [ Falar sem paciente ]
```

### Caminho 1 — Escolher paciente
Mostra a lista de pacientes do psicólogo. Ao escolher um, o **histórico daquele paciente é carregado no contexto** e a conversa entra em **MODO PACIENTE**.
*Quando há muitos pacientes:* a lista interativa do WhatsApp comporta até 10 itens. Acima disso, o sistema **lista os nomes em texto** (numerados) e o psicólogo responde com o **número ou o nome** — o mesmo padrão de seleção usado em todas as listas do produto (ver "Regra das listas", abaixo).

### Caminho 2 — Cadastrar paciente novo
O sistema conduz um **cadastro por conversa** (pergunta nome completo, iniciais, abordagem e queixa, um de cada vez). Diferente da v1, o cadastro segue o **padrão de captura** (seção 6): o comando "voltar" corrige o passo anterior, e nada é criado sem uma **prévia da ficha completa** com os botões `[Criar] [Corrigir] [Cancelar]`. Ao confirmar, cria a ficha e já entra em **MODO PACIENTE** com esse paciente.
*(Evolução futura: substituir por um formulário dentro do chat — "WhatsApp Flow" — quando o número estiver homologado. Comportamento idêntico, só mais polido.)*

### Caminho 3 — Falar sem paciente (MODO LIVRE)
Vai direto às ferramentas, **sem amarrar a nenhum paciente**: dúvida clínica, estudo de um tema, plano de exemplo. Nada do que é gerado aqui entra na ficha de um paciente.

### Regra das listas (vale para o produto inteiro)
Toda lista numerada do sistema — pacientes, evoluções, opções de desambiguação — aceita resposta por **número ou por nome**. Um único padrão, aprendido uma vez.

### O atalho do apressado
Se o psicólogo **já manda tudo de uma vez** — *"evolução da Maria Silva, sessão de hoje, ela relatou…"* — o sistema **não mostra o menu**: resolve o nome (seção 9), trava o contexto e abre um rascunho de evolução com o conteúdo já recebido. O menu só aparece quando ele **não** disse paciente nem ação.

---

## 5. Camada 0 — comandos que funcionam de qualquer lugar

Antes de qualquer estado processar a mensagem, o sistema verifica se ela é um **comando reservado**. Essa camada é **determinística** (sem IA): previsível, sem custo e sem risco de gravar comando como prontuário.

### A regra "curta e exata"
Uma mensagem só é tratada como comando se for **curta e exata**: o texto inteiro da mensagem corresponde a uma palavra reservada (até ~3 palavras, ignorando maiúsculas e acentos). Um áudio de três minutos que *menciona* "histórico familiar" nunca é confundido com comando — não é mensagem curta exata.

### Tabela de palavras reservadas

| Comando | Variações aceitas | Efeito |
|---|---|---|
| `menu` | sair, voltar, trocar, cancelar | Destrava o paciente, encerra sub-fluxos e volta ao menu de 3 caminhos |
| `ações` | acoes, opções | Reapresenta a lista interativa de ações do modo atual |
| `nova evolução` | evolução, registrar evolução | Abre um rascunho de evolução para o paciente travado |
| `evoluções` | listar evoluções | Abre a lista numerada de evoluções (seção 8) |
| `histórico` | — | Mostra o resumo do histórico do paciente travado |
| `plano` | plano de ação | Gera/mostra o plano para o paciente travado |
| `ficha` | consultar ficha | Mostra os dados cadastrais do paciente travado |
| `editar` | editar paciente | Abre a edição de cadastro do paciente travado |
| `ajuda` | comandos, ? | Explica os comandos disponíveis no contexto atual |

Comandos que dependem de paciente ("evoluções", "plano", "ficha"…) recebidos **sem paciente travado** levam primeiro à escolha de paciente, e o comando é executado em seguida.

### Comando no meio de um rascunho: pausar e perguntar
Se a mensagem é uma palavra reservada **e há um rascunho aberto** (evolução, edição, cadastro), o sistema **não adivinha** — pausa o rascunho e pergunta com dois botões:

```
"Histórico" — o que você quer?
[ Ver o histórico ]  [ Faz parte da evolução ]
```

- **Ver o histórico:** executa o comando e, ao final, oferece **retomar o rascunho** de onde parou.
- **Faz parte da evolução:** o texto entra no rascunho e a captura continua.

Em nenhum dos dois caminhos o rascunho é perdido.

> Princípio: o psicólogo **nunca fica preso** num contexto nem num sub-fluxo. Em todo estado há uma saída visível (botão) e uma saída por texto (Camada 0).

---

## 6. Padrão de captura: rascunho → prévia → confirmação

Todo fluxo que **escreve dado** segue o mesmo ciclo, sem exceção. Vale para: nova evolução, edição de evolução, edição de paciente e cadastro de paciente.

```
Ação explícita (ex.: Nova evolução)
   │
   ▼
RASCUNHO ABERTO ──── acumula tudo que chega (texto, áudios, imagens)
   │                  comandos reservados pausam e perguntam (seção 5)
   ▼
PRÉVIA ───────────── o sistema mostra o resultado formatado,
   │                  com o NOME DO PACIENTE no topo
   ▼
[ Salvar ]  [ Ajustar ]  [ Cancelar ]
   │            │             │
   ▼            ▼             ▼
grava na     volta ao      descarta e volta
ficha (web)  rascunho      ao modo paciente
```

Regras do padrão:

- **Acúmulo:** o psicólogo pode mandar várias mensagens e áudios em sequência; tudo entra no mesmo rascunho. A prévia é gerada quando ele sinaliza que terminou — pelo botão `[Gerar prévia]` que acompanha o rascunho, ou por mensagem curta como "pronto" / "só isso".
- **Prévia identifica o paciente:** toda prévia de gravação exibe o nome do paciente no topo (*"Evolução — Maria Silva de Souza, 11/06"*). É a última barreira contra gravar na ficha errada.
- **Nada grava sem confirmação.** Inclusive a edição de paciente, que na v1 atualizava "na hora": agora mostra `campo: valor antigo → valor novo` e pede `[Confirmar] [Cancelar]`.
- **No máximo 3 botões** em cada etapa — dentro do limite da API (a prévia usa exatamente 3; a desambiguação, 2).

---

## 7. Os dois modos: PACIENTE e LIVRE

As **ferramentas são as mesmas** nos dois modos. O que muda é **onde o resultado é guardado**.

| | MODO PACIENTE | MODO LIVRE |
|---|---|---|
| Contexto | um paciente travado | nenhum paciente |
| Evolução | salva na ficha do paciente (com prévia) | avulsa (não entra em ficha) |
| Plano de ação | registrado para o paciente | genérico / estudo |
| Dúvida clínica | no contexto do caso | geral (uso mais comum aqui) |
| Histórico | acumula na ficha | não acumula |

### Conversa não grava — só ação explícita escreve
Dentro do MODO PACIENTE, **conversar é só conversar**. Perguntas, dúvidas e discussões — gerais ou sobre o caso — não geram nenhuma escrita na ficha. A **única porta de escrita** são as ações explícitas (evolução, plano, edição), e toda ação explícita passa pela prévia da seção 6.

Isso elimina a regra vaga da v1 ("o sistema solta o paciente quando necessário"): não há mais decisão arriscada a tomar, porque conversar nunca tem efeito colateral. O psicólogo pode fazer uma pergunta geral no meio do modo paciente sem cerimônia.

### Trazer paciente no meio do modo livre
Se, durante uma conversa livre, o psicólogo disser *"na verdade isso é da Maria Silva"*, o sistema oferece **amarrar aquele conteúdo à ficha dela** (gerando um rascunho de evolução com prévia) e passa para MODO PACIENTE. Evita que uma evolução real fique órfã por ter começado no modo errado.

### A lista de ações do MODO PACIENTE
A API permite no máximo 3 botões por mensagem — os 6 atalhos da v1 não cabem. A solução é a **lista interativa** (até 10 itens): ao travar um paciente, o sistema anuncia o contexto e oferece um único botão `[Ver ações]`, que abre:

```
Contexto: Maria Silva. O que vamos fazer?
[ Ver ações ]
   ├─ Nova evolução
   ├─ Evoluções
   ├─ Plano
   ├─ Consultar ficha
   ├─ Editar paciente
   └─ Trocar de paciente / Menu
```

Um toque a mais, mas tudo visível — e quem já decorou os comandos digita direto pela Camada 0 ("plano", "ficha", "editar"), sem abrir a lista. A lista é a vitrine de quem está aprendendo; o texto é o atalho de quem já sabe.

- **Consultar ficha:** mostra os dados cadastrais — nome, iniciais, abordagem, queixa principal e número de sessões.
- **Editar paciente:** escolhe um campo (nome, iniciais, abordagem ou queixa), envia o novo valor e **confirma na prévia** (`antigo → novo`); só então a ficha é atualizada (e na web).

### Sair do contexto
Depois que um paciente é travado, as mensagens seguintes valem para ele — até que o psicólogo saia de propósito. A saída é **sempre disponível**:
- item **"Trocar de paciente / Menu"** na lista de ações; ou
- **comando de texto** a qualquer momento: "menu", "trocar", "sair", "voltar" (Camada 0 — funciona inclusive dentro de rascunhos, com a pergunta de desambiguação).

Há ainda a saída **automática** por inatividade de 24h (seção 13), que agora **preserva rascunhos não salvos**.

---

## 8. Gestão de evoluções (sub-máquina)

A evolução ganha paridade com o paciente: além de criar, o psicólogo pode **listar, ver, editar e excluir**. O item "Evoluções" da lista de ações (ou o comando "evoluções") abre:

```
Evoluções — Maria Silva
1. 09/06 — "Sessão focada em ansiedade no trabalho…"
2. 02/06 — "Paciente relatou melhora no sono…"
3. 26/05 — "Aplicada técnica de exposição…"
(últimas 5 · responda com o número ou peça "mais antigas")
[ Voltar ]
```

Ao selecionar uma evolução (número ou data), abre o menu de ações:

| Ação | Comportamento |
|---|---|
| **Ver completa** | Mostra o texto integral da evolução (e oferece PDF quando fizer sentido). |
| **Editar** | Abre o padrão de captura (seção 6) com o texto atual como base: o psicólogo dita o ajuste, vê a **prévia do texto final** e confirma. |
| **Excluir** | **Confirmação dupla:** mostra a evolução (data + primeiras linhas) e pergunta *"Excluir esta evolução? Esta ação não pode ser desfeita pelo chat."* com `[Excluir] [Cancelar]`. |
| **Voltar** | Retorna à lista de evoluções (e dali ao modo paciente). |

Regras da sub-máquina:

- **Exclusão é registrada:** toda exclusão guarda quem excluiu e quando (trilha de auditoria). Recomenda-se exclusão lógica (a evolução some do chat e da web, mas o registro é preservado internamente) — prontuário é documento clínico.
- **Edição preserva a origem:** a evolução editada mantém a marcação de origem (texto/áudio) e ganha a marcação de "editada em [data]", visível na web.
- **O atalho "Histórico" continua existindo** como leitura corrida/resumo do caso; "Evoluções" é a porta de **gestão** registro a registro. São coisas diferentes e ambas ficam na lista de ações.

---

## 9. Resolução de nome (o atalho do apressado, agora seguro)

Quando a mensagem cita um nome ("evolução da Maria…"), o sistema busca o nome na base **do psicólogo** e segue conforme o número de correspondências:

| Correspondências | Comportamento |
|---|---|
| **Uma** | Trava no paciente e **anuncia o contexto**: *"Ok, contexto: Maria Silva de Souza."* Em seguida processa a ação pedida (abrindo rascunho, se for evolução). |
| **Várias** (homônimos, nome parcial) | Mostra **lista numerada** dos candidatos; o psicólogo responde com número ou nome completo. |
| **Nenhuma** (erro de grafia, paciente novo) | Informa que não encontrou e **oferece cadastrar**: `[Cadastrar paciente] [Escolher da lista] [Menu]`. |

Redes de proteção em camadas: (1) o anúncio do contexto dá a primeira chance de pegar um engano; (2) a **prévia com o nome do paciente no topo** (seção 6) dá a segunda, antes de qualquer gravação. O pior erro possível do produto — evolução na ficha errada — exige passar por duas barreiras explícitas.

---

## 10. O que cada estado guarda

Por número de telefone, o sistema mantém um estado leve de conversa:

| Campo | O que significa |
|---|---|
| **psicólogo** | o dono da conversa (vínculo obrigatório de toda operação) |
| **paciente travado** | quem está em foco agora (vazio = sem paciente / modo livre) |
| **modo** | menu, paciente, livre, cadastro ou renovação |
| **sub-estado** | ocioso, rascunho de evolução, editando evolução, editando paciente, lista de evoluções, aguardando desambiguação, aguardando confirmação de prévia |
| **rascunho** | conteúdo acumulado de uma captura em andamento + o alvo (nova evolução, evolução existente, campo do paciente, ficha em cadastro) |
| **evolução selecionada** | qual evolução está em foco na sub-máquina da seção 8 |
| **comando pendente** | o comando reservado que disparou uma pergunta de desambiguação e aguarda resposta |
| **passo / dados parciais** | em que ponto de um cadastro guiado a pessoa está e o que já respondeu |
| **última intenção** | para entender "agora faz o plano" como continuação |
| **última atualização** | quando o estado mudou pela última vez — usado para expirar o contexto após 24h sem interação |

Esse estado é o que permite a conversa fluir naturalmente entre mensagens.

---

## 11. O ciclo de uma mensagem (visão de comportamento)

```
Mensagem chega
   │
   ├─ 1. Identifica o telefone → psicólogo?
   │       ├─ não cadastrado ............→ fluxo de vendas / onboarding
   │       ├─ cadastrado, assinatura OFF .→ caminho de renovação (bloqueia clínico)
   │       └─ cadastrado, assinatura ON ..→ segue ↓
   │
   ├─ 2. Se não for texto → converte em texto
   │       ├─ áudio ......→ transcrição
   │       ├─ imagem .....→ descrição (lê texto visível também)
   │       └─ documento ..→ extração / descrição do conteúdo
   │
   ├─ 3. CAMADA 0 — é palavra reservada (mensagem curta e exata)?
   │       ├─ sim, sem rascunho aberto ....→ executa o comando e responde
   │       ├─ sim, com rascunho aberto ....→ pausa o rascunho e pergunta
   │       │                                 (comando ou conteúdo?) — 2 botões
   │       └─ não ..........................→ segue ↓
   │
   ├─ 4. Contexto expirou (+24h sem interação)?
   │       ├─ sim, com rascunho não salvo .→ oferece [Retomar] [Descartar] antes do menu
   │       └─ sim, sem rascunho ...........→ reinicia no MENU
   │
   ├─ 5. Resolve o contexto
   │       ├─ há rascunho aberto? ..........→ a mensagem entra no rascunho
   │       ├─ aguardando desambiguação
   │       │   ou confirmação de prévia? ...→ trata a resposta (botão ou texto)
   │       ├─ já há paciente travado? ......→ MODO PACIENTE (conversa não grava)
   │       ├─ a mensagem cita um paciente? .→ resolve o nome (uma/várias/nenhuma)
   │       ├─ está no meio de um cadastro? .→ continua o cadastro ("voltar" corrige)
   │       └─ nada disso ....................→ mostra o MENU (3 caminhos)
   │
   ├─ 6. Executa a ferramenta pedida (evolução / plano / dúvida / material)
   │       usando o histórico do paciente quando em MODO PACIENTE
   │
   ├─ 7. Grava SOMENTE via padrão de captura
   │       ├─ ação explícita → rascunho → PRÉVIA (com nome do paciente) → confirmação
   │       ├─ MODO PACIENTE confirmado → salva na ficha (aparece na web)
   │       └─ MODO LIVRE ................→ não entra em ficha
   │
   └─ 8. Responde no WhatsApp (texto e, quando fizer sentido, áudio/PDF/botões/lista)
```

---

## 12. Onde o resultado é guardado (dado compartilhado com a web)

Este é o ponto que faz o WhatsApp e a web serem **o mesmo produto**, não dois sistemas paralelos:

- **Paciente cadastrado pelo WhatsApp** entra na mesma tabela de pacientes do app — aparece na web na hora (após a confirmação da prévia).
- **Evolução ditada pelo WhatsApp** (texto ou áudio) entra na mesma tabela de evoluções, ligada ao paciente, com a marcação de origem (texto/áudio) e, no caso de áudio, o arquivo guardado. O psicólogo abre a web e vê a evolução que ditou no celular.
- **Evolução editada ou excluída pelo WhatsApp** reflete na web imediatamente; edições marcam "editada em [data]" e exclusões deixam trilha de auditoria (quem/quando), preferencialmente como exclusão lógica.
- **Modo livre não guarda em ficha** — fica como produção avulsa.

> **Regra de ouro do produto:** ninguém precisa abrir a web para trabalhar no dia a dia. A web é a "varanda" — cadastro, pagamento, histórico detalhado, exportação de PDF. Se uma tarefa clínica corriqueira exigir abrir a web, o modelo falhou.

---

## 13. A janela de 24 horas (molda o que é possível)

A API oficial separa dois comportamentos, e isso desenha o produto:

- **Reativo (dentro de 24h após a mensagem do psicólogo):** o sistema responde texto livre e usa botões/listas/formulários sem custo por mensagem. **É aqui que vive 95% do valor** — ditar, perguntar, pedir, receber. Como o psicólogo está conversando, a janela está sempre aberta no uso normal.
- **Proativo (fora da janela):** para o sistema **iniciar** conversa (lembrete de "põe o prontuário em dia", resgate de quem sumiu, onboarding), **não se pode mandar texto livre** — só modelos de mensagem pré-aprovados pela Meta, e há custo por conversa.

**Implicação:** o uso clínico do dia a dia é todo reativo (fluido e barato). Já qualquer motor de lembrete/retenção precisa ser desenhado como mensagens-modelo aprovadas desde o início — não dá para descobrir isso depois.

### Expiração de contexto (24h sem interação) — agora preservando rascunhos
Se a conversa fica mais de 24 horas sem nenhuma interação, o contexto é considerado expirado. Na mensagem seguinte:

- **Sem rascunho pendente:** o sistema reinicia no menu (comportamento da v1).
- **Com rascunho não salvo** (evolução ditada ontem à noite, cadastro pela metade): o contexto expira, mas o rascunho **sobrevive**. O sistema abre com *"Você tinha um rascunho de evolução da Maria de ontem (09/06). O que fazer?"* `[Retomar] [Descartar]` — só depois mostra o menu. Conteúdo clínico nunca some em silêncio.

(Isso é diferente do *Motor de reativação*, que é o sistema **iniciando** conversa proativamente.)

---

## 14. Limites da interface do WhatsApp (restrições que desenham as telas)

A API oficial impõe limites que a especificação respeita por construção:

| Recurso | Limite | Onde usamos |
|---|---|---|
| Botões de resposta rápida | **3 por mensagem** | Menu inicial (3 caminhos), prévia (Salvar/Ajustar/Cancelar), desambiguação (2), confirmações |
| Lista interativa | **10 itens, 1 botão de abertura** | Lista de ações do modo paciente, escolha de paciente (≤10), lista de evoluções |
| Texto livre | sem limite prático | Listas longas (>10) numeradas em texto, respondidas por número ou nome |

Decisão de produto: o modo paciente usa **lista interativa** (`[Ver ações]` → 6 itens) em vez de espalhar botões por várias mensagens. Um toque a mais, tudo visível; os comandos da Camada 0 cobrem quem prefere digitar direto.

---

## 15. O que entra agora e o que fica para depois

Para validar o fluxo no número de teste sem se perder, o escopo do MVP é a **espinha**:

**Agora (MVP de teste):**
- Identidade com os três casos (novo / ativo / inativo).
- **Camada 0** com a tabela de palavras reservadas e a pergunta de desambiguação em rascunho.
- Menu de três caminhos com botões.
- Escolher paciente (lista interativa até 10; acima disso, lista em texto respondida por número ou nome).
- Cadastro por conversa com "voltar" e **prévia da ficha** antes de criar.
- MODO PACIENTE com histórico no contexto, **lista interativa de ações** e regra "conversa não grava".
- **Padrão de captura** (rascunho → prévia → confirmação) para evolução, edição de evolução, edição de paciente e cadastro.
- Evolução por texto, áudio, imagem e documento, salva na ficha após confirmação (e visível na web).
- **Sub-máquina de evoluções:** listar (últimas 5), ver completa, editar, excluir com confirmação dupla e auditoria.
- **Resolução de nome** no atalho do apressado (uma/várias/nenhuma) com anúncio de contexto.
- Atalhos de Histórico e Plano; Consultar ficha e Editar paciente (com prévia).
- **Expiração de contexto após 24h preservando rascunhos** (Retomar/Descartar).

**Depois (evoluções):**
- Formulário no chat (WhatsApp Flow) no lugar do cadastro por conversa.
- Detecção automática de "evolução órfã" (oferecer vincular um ditado a uma ficha).
- Roteador de intenção por IA por cima da Camada 0 (hoje a navegação é determinística; a IA cuida do atalho do apressado e da redação).
- Paginação completa da lista de evoluções ("mais antigas") e busca por data/tema.
- Base de conhecimento com fontes oficiais (CFP, CID) e citação.
- Motor de lembretes/retenção por mensagens-modelo aprovadas.

---

## 16. Princípios inegociáveis

1. **Não afeta o sistema atual.** Roda em paralelo, em número de teste, sem tocar no atendimento de produção.
2. **Web e WhatsApp compartilham o mesmo dado.** Nada de tabelas paralelas — o que se faz no celular aparece na web.
3. **Isolamento por psicólogo é obrigatório.** Toda operação amarrada ao psicólogo dono do dado.
4. **Comando vence estado.** A Camada 0 roda antes de qualquer sub-fluxo; em rascunho, na dúvida o sistema **pergunta**, nunca adivinha. O psicólogo nunca fica preso: todo estado tem saída visível (botão/lista) e saída por texto.
5. **Nada grava sem prévia.** Evolução, edição e cadastro passam por rascunho → prévia (com o nome do paciente no topo) → confirmação. Conversar nunca tem efeito colateral.
6. **Conteúdo clínico nunca some em silêncio.** Expiração de contexto preserva rascunhos; exclusão exige confirmação dupla e deixa trilha de auditoria.
7. **Paciente é contexto que liga e desliga**, não uma obrigação. Os três caminhos ficam sempre acessíveis.
8. **Nada de evolução órfã.** Quando um conteúdo de modo livre parece ser de paciente real, o sistema oferece vinculá-lo a uma ficha.
9. **Dado clínico é sensível.** Cuidado com informação pessoal em registros e logs.
