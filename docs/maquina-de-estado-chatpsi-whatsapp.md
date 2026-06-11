# Máquina de estado da conversa — ChatPsi WhatsApp-first

> **O que é este documento:** a especificação do comportamento da conversa do ChatPsi no WhatsApp oficial — o que acontece a cada mensagem, quais caminhos existem, e onde cada resultado é guardado. Serve para alinhar os donos do produto e guiar a implementação.
>
> **O que NÃO é:** um guia da API do WhatsApp nem do código. É o *modelo de comportamento*.
>
> **Contexto:** roda em paralelo ao sistema atual (n8n), num número de teste, sem afetar o atendimento de produção. As tabelas clínicas (`patients`, `evolutions`) são **as mesmas do app web** — o que é ditado no WhatsApp aparece na web automaticamente.

---

## 1. A ideia em uma frase

O psicólogo conversa com o ChatPsi pelo WhatsApp como quem fala com um assistente: manda texto, áudio, imagem ou documento, escolhe um paciente, dita a sessão, pede um plano — e o sistema entende em que **contexto** está e onde **guardar** o resultado. A "máquina de estado" é o que dá essa memória de contexto a um canal que, por natureza, é só uma linha solta de mensagens.

---

## 2. Por que precisa de uma máquina de estado

O WhatsApp não tem "telas" nem "modo" embutido — é texto corrido. Quando o psicólogo escreve *"agora faz o plano"*, o sistema precisa saber **de qual paciente** ele está falando. Isso exige guardar, por número de telefone, um **estado de conversa**: qual paciente está travado, em que passo de um cadastro a pessoa está, qual foi a última intenção. Sem isso, cada mensagem seria interpretada do zero e o produto viraria um gerador de texto avulso — não um prontuário que lembra.

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

Quando um psicólogo ativo manda uma mensagem **sem especificar paciente nem ação**, o sistema responde com uma saudação e **três botões**:

```
Olá, [nome]! O que vamos fazer?
[ Escolher paciente ]  [ Cadastrar paciente ]  [ Falar sem paciente ]
```

### Caminho 1 — Escolher paciente
Mostra a lista de pacientes do psicólogo. Ao escolher um, o **histórico daquele paciente é carregado no contexto** e a conversa entra em **MODO PACIENTE**.
*Quando há muitos pacientes:* a lista interativa comporta poucos itens; acima disso, o sistema pede o nome por texto ("me diz o nome da paciente") em vez de listar todos.

### Caminho 2 — Cadastrar paciente novo
O sistema conduz um **cadastro por conversa** (pergunta nome completo, iniciais, abordagem e queixa, um de cada vez). Ao terminar, cria a ficha e já entra em **MODO PACIENTE** com esse paciente.
*(Evolução futura: substituir por um formulário dentro do chat — "WhatsApp Flow" — quando o número estiver homologado. Comportamento idêntico, only mais polido.)*

### Caminho 3 — Falar sem paciente (MODO LIVRE)
Vai direto às ferramentas, **sem amarrar a nenhum paciente**: dúvida clínica, estudo de um tema, plano de exemplo. Nada do que é gerado aqui entra na ficha de um paciente.

### O atalho do apressado
Se o psicólogo **já manda tudo de uma vez** — *"evolução da Maria Silva, sessão de hoje, ela relatou…"* — o sistema **não mostra o menu**: reconhece "Maria Silva" na base, trava o contexto nela e processa direto. O menu só aparece quando ele **não** disse paciente nem ação.

---

## 5. Os dois modos: PACIENTE e LIVRE

As **ferramentas são as mesmas** nos dois modos. O que muda é **onde o resultado é guardado**.

| | MODO PACIENTE | MODO LIVRE |
|---|---|---|
| Contexto | um paciente travado | nenhum paciente |
| Evolução | salva na ficha do paciente | avulsa (não entra em ficha) |
| Plano de ação | registrado para o paciente | genérico / estudo |
| Dúvida clínica | no contexto do caso | geral (uso mais comum aqui) |
| Histórico | acumula na ficha | não acumula |

### O contexto liga e desliga — não é prisão
- **Trazer paciente no meio do modo livre:** se, durante uma conversa livre, o psicólogo disser *"na verdade isso é da Maria Silva"*, o sistema oferece **amarrar aquilo à ficha dela** e passa para MODO PACIENTE. Evita que uma evolução real fique órfã por ter começado no modo errado.
- **Soltar o paciente no meio do modo paciente:** estando em MODO PACIENTE, ele pode fazer uma pergunta geral sem encerrar tudo — o sistema "solta" o paciente quando necessário e volta depois.

### Atalhos rápidos no MODO PACIENTE
Com um paciente travado, o sistema oferece botões de ação:
```
[ Nova evolução ]  [ Histórico ]  [ Plano ]
[ ↩ Trocar de paciente / Menu ]
```

### Sair do contexto (trocar de paciente ou voltar ao menu)
Depois que um paciente é travado, **todas** as mensagens seguintes valem para ele — até que o psicólogo saia do contexto de propósito. A saída é **sempre disponível**, de duas formas equivalentes:
- **Botão** "↩ Trocar de paciente / Menu" (junto dos atalhos acima); ou
- **Comando de texto** a qualquer momento: "menu", "trocar", "sair" ou "voltar".

Ao acionar a saída, o sistema **destrava o paciente atual** (limpa o paciente travado e volta ao modo menu) e reexibe o menu dos três caminhos — de onde o psicólogo escolhe **outro paciente**, **cadastra um novo** ou vai para o **modo livre**. O mesmo comando de escape funciona dentro do modo livre e no meio de um cadastro guiado (cancela o cadastro em andamento e volta ao menu).

> Princípio: o psicólogo **nunca fica preso** num contexto. Há sempre uma porta de saída visível (botão) e uma por texto (comando), sem precisar de gambiarra como "mandar oi de novo".

---

## 6. O que cada estado guarda

Por número de telefone, o sistema mantém um estado leve de conversa:

| Campo | O que significa |
|---|---|
| **paciente travado** | quem está em foco agora (vazio = sem paciente / modo livre) |
| **modo** | menu, paciente, livre, cadastro ou renovação |
| **passo** | em que ponto de um cadastro guiado a pessoa está |
| **dados parciais** | o que já foi respondido num cadastro em andamento |
| **última intenção** | para entender "agora faz o plano" como continuação |

Esse estado é o que permite a conversa fluir naturalmente entre mensagens.

---

## 7. O ciclo de uma mensagem (visão de comportamento)

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
   ├─ 3. Resolve o contexto
   │       ├─ comando de saída ("menu"/"trocar"/"sair")? → destrava e volta ao MENU
   │       ├─ já há paciente travado? ........→ MODO PACIENTE
   │       ├─ a mensagem cita um paciente? ...→ trava nele (atalho do apressado)
   │       ├─ está no meio de um cadastro? ...→ continua o cadastro
   │       └─ nada disso ......................→ mostra o MENU (3 caminhos)
   │
   ├─ 4. Executa a ferramenta pedida (evolução / plano / dúvida / material)
   │       usando o histórico do paciente quando em MODO PACIENTE
   │
   ├─ 5. Guarda o resultado
   │       ├─ MODO PACIENTE → salva na ficha do paciente (aparece na web)
   │       └─ MODO LIVRE ....→ não entra em ficha
   │
   └─ 6. Responde no WhatsApp (texto e, quando fizer sentido, áudio/PDF/botões)
```

---

## 8. Onde o resultado é guardado (dado compartilhado com a web)

Este é o ponto que faz o WhatsApp e a web serem **o mesmo produto**, não dois sistemas paralelos:

- **Paciente cadastrado pelo WhatsApp** entra na mesma tabela de pacientes do app — aparece na web na hora.
- **Evolução ditada pelo WhatsApp** (texto ou áudio) entra na mesma tabela de evoluções, ligada ao paciente, com a marcação de origem (texto/áudio) e, no caso de áudio, o arquivo guardado. O psicólogo abre a web e vê a evolução que ditou no celular.
- **Modo livre não guarda em ficha** — fica como produção avulsa.

> **Regra de ouro do produto:** ninguém precisa abrir a web para trabalhar no dia a dia. A web é a "varanda" — cadastro, pagamento, histórico detalhado, exportação de PDF. Se uma tarefa clínica corriqueira exigir abrir a web, o modelo falhou.

---

## 9. A janela de 24 horas (molda o que é possível)

A API oficial separa dois comportamentos, e isso desenha o produto:

- **Reativo (dentro de 24h após a mensagem do psicólogo):** o sistema responde texto livre e usa botões/listas/formulários sem custo por mensagem. **É aqui que vive 95% do valor** — ditar, perguntar, pedir, receber. Como o psicólogo está conversando, a janela está sempre aberta no uso normal.
- **Proativo (fora da janela):** para o sistema **iniciar** conversa (lembrete de "põe o prontuário em dia", resgate de quem sumiu, onboarding), **não se pode mandar texto livre** — só modelos de mensagem pré-aprovados pela Meta, e há custo por conversa.

**Implicação:** o uso clínico do dia a dia é todo reativo (fluido e barato). Já qualquer motor de lembrete/retenção precisa ser desenhado como mensagens-modelo aprovadas desde o início — não dá para descobrir isso depois.

---

## 10. O que entra agora e o que fica para depois

Para validar o fluxo no número de teste sem se perder, o escopo do MVP é a **espinha**:

**Agora (MVP de teste):**
- Identidade com os três casos (novo / ativo / inativo).
- Menu de três caminhos com botões.
- Escolher paciente, cadastrar por conversa, modo livre.
- MODO PACIENTE com histórico do paciente no contexto.
- Evolução por texto, áudio, imagem e documento, salva na ficha (e visível na web).
- Atalhos de Histórico e Plano no modo paciente.

**Depois (evoluções):**
- Formulário no chat (WhatsApp Flow) no lugar do cadastro por conversa.
- Detecção automática de "evolução órfã" (oferecer vincular um ditado a uma ficha).
- Roteador de intenção por IA (hoje guiado por botões/menu).
- Base de conhecimento com fontes oficiais (CFP, CID) e citação.
- Motor de lembretes/retenção por mensagens-modelo aprovadas.

---

## 11. Princípios inegociáveis

1. **Não afeta o sistema atual.** Roda em paralelo, em número de teste, sem tocar no atendimento de produção.
2. **Web e WhatsApp compartilham o mesmo dado.** Nada de tabelas paralelas — o que se faz no celular aparece na web.
3. **Isolamento por psicólogo é obrigatório.** Toda operação amarrada ao psicólogo dono do dado.
4. **Paciente é contexto que liga e desliga**, não uma obrigação. Os três caminhos ficam sempre acessíveis, e há **sempre uma saída visível** (botão "Trocar de paciente / Menu" ou comando "menu"/"trocar") para destravar o paciente e voltar ao início — o psicólogo nunca fica preso num contexto.
5. **Nada de evolução órfã.** Quando um conteúdo de modo livre parece ser de paciente real, o sistema oferece vinculá-lo a uma ficha.
6. **Dado clínico é sensível.** Cuidado com informação pessoal em registros e logs.
