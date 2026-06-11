# ChatPsi — Especificação do modelo WhatsApp-first

> **Tipo:** documento de **referência** (não é um prompt). Deixe em `docs/` para o Claude Code ler e entender o comportamento esperado.
> **Para:** quem está desenvolvendo a integração com a API oficial do WhatsApp.
> **O que é:** o **modelo de produto** do ChatPsi rodando majoritariamente no WhatsApp, com Edge Functions no Supabase e uma web de apoio. Não é um guia da API do WhatsApp — é o comportamento a implantar em cima dela.
> **Stack assumida:** WhatsApp Cloud API (oficial) + Supabase (Edge Functions, Postgres com RLS, pgvector para o RAG, Storage para áudio/PDF).

---

## 1. Visão geral — a inversão de modelo

O ChatPsi passa a ser **WhatsApp-first**. O WhatsApp deixa de ser "um bot auxiliar" e vira o produto: é o consultório-bolso do psicólogo, onde ele dita sessões, pede planos, tira dúvidas e gera materiais conversando em linguagem natural (texto, áudio, imagem ou documento).

A aplicação web **não some, mas muda de papel**: vira um painel de apoio ("varanda") para cadastro, assinatura/pagamento, histórico detalhado, preferências e exportação de prontuário em PDF. **Ninguém precisa abrir a web para trabalhar no dia a dia.** Se for obrigatório abrir a web para uma tarefa clínica corriqueira, o modelo falhou.

### Três camadas
1. **Entrada** — WhatsApp Cloud API (texto, áudio, imagem, documento).
2. **Cérebro** — Edge Functions no Supabase: webhook de ingestão, worker de IA (conversão de mídia em texto + RAG + LLM), roteador de intenção e emissor de resposta.
3. **Memória** — Postgres (com RLS e pgvector) + Storage (áudio e PDFs).

---

## 2. Multi-tenant por número de telefone (regra central)

**Cada psicólogo é identificado pelo número de telefone dele.** Não há login/senha no canal: o número já vem verificado pela Meta em cada mensagem, então o próprio fato de a mensagem chegar daquele número autentica o psicólogo.

Fluxo de identificação no webhook:
- Mensagem chega → extrai o número de origem → resolve para o psicólogo (o "tenant").
- Número **não cadastrado** → não é cliente → responde oferecendo cadastro/assinatura.
- Número **cadastrado e ativo** → vira o tenant, e **toda** consulta a pacientes/evoluções/materiais já sai filtrada por ele.
- Número **cadastrado com assinatura inativa** → caminho de renovação (bloqueia uso clínico).

### Isolamento por tenant
O isolamento entre psicólogos não pode depender de "lembrar de filtrar" no código por acaso. No app web, isso é garantido por RLS por usuário. No canal WhatsApp (Edge Functions com service role), como o service role ignora RLS, o isolamento é garantido pelo **código sempre resolver e aplicar o identificador correto do psicólogo** (o `user_id` dono) em toda leitura e escrita.

> Requisito de segurança e de LGPD (dado clínico sensível): toda operação fica amarrada ao psicólogo dono do dado.

---

## 3. Início da conversa — TRÊS caminhos

Quando o psicólogo manda uma mensagem sem especificar paciente nem ação, o sistema responde com saudação + **menu de três opções** (botões de resposta):

> "Olá, [nome]! O que vamos fazer?
> 1) Escolher um paciente
> 2) Cadastrar um paciente novo
> 3) Falar sem paciente (modo livre)"

### Caminho 1 — Escolher paciente (existente)
Mostra a lista de pacientes do psicólogo. Ao escolher, o histórico do paciente é carregado no contexto e entra-se no **MODO PACIENTE**.

### Caminho 2 — Cadastrar paciente novo
Cria a ficha. No MVP, por **conversa guiada** ("me diz o nome completo, a abordagem…"). Evolução futura: **WhatsApp Flow** (formulário no chat). Ao terminar, já entra em MODO PACIENTE.

### Caminho 3 — Falar sem paciente (MODO LIVRE)
Vai direto às ferramentas, sem amarrar a nenhum paciente: dúvida clínica, estudo de um tema, material avulso. Nada do que for gerado aqui é salvo na ficha de um paciente.

### Atalho do apressado
Se o psicólogo já manda tudo de uma vez — *"evolução da Maria Silva, sessão de hoje…"* — o sistema **não exibe o menu**: reconhece "Maria Silva", trava o contexto nela e processa direto. O menu só aparece quando não há paciente nem ação especificados.

---

## 4. Ficha de paciente

- **Nome completo** é o identificador (sem apelido). Desambiguação de homônimos pelo nome completo.
- A ficha pertence ao psicólogo (isolamento por tenant).
- Toda evolução, plano, material e nota fica ligada à ficha, formando o histórico.
- Criada por conversa (ou Flow no futuro), e também pode nascer no meio de um ditado ("não tenho a Joana ainda — crio a ficha agora?").

### Recuperação do histórico (o valor central)
Ao selecionar/mencionar um paciente, o sistema puxa sessões/planos anteriores e injeta no contexto do LLM, para a nova evolução sair coerente com o histórico. É o que transforma o ChatPsi de "gerador de texto avulso" em "prontuário que lembra".

---

## 5. Componentes interativos da API oficial

- **Lista interativa** — menu rolável; usada para "qual paciente?". ~10 itens por seção; acima disso, busca por nome.
- **Botões de resposta** — até 3 por mensagem; menu inicial e atalhos pós-seleção ("Nova evolução · Histórico · Plano").
- **WhatsApp Flow** — formulário no chat; cadastro estruturado (evolução futura; exige número/app homologado).

> Todos só podem ser enviados **dentro da janela de 24h** (ver §6). Como o psicólogo está conversando, a janela está aberta. Não usar em disparo proativo fora da janela.

---

## 6. Janela de 24 horas e templates

- **Reativo (dentro de 24h):** responde texto livre e usa componentes interativos, sem custo por mensagem. **95% do valor vive aqui:** ditar, perguntar, pedir, receber.
- **Proativo (fora da janela):** para o sistema **iniciar** conversa (lembrete, resgate, onboarding), não se pode enviar texto livre — só **template pré-aprovado pela Meta**, com custo por conversa.

Implicação: o motor de ativação/retenção precisa ser desenhado como templates aprovados desde o começo. O uso clínico do dia a dia é todo reativo (barato e fluido).

---

## 7. MODO PACIENTE vs MODO LIVRE

As **ferramentas são as mesmas**; muda **onde o resultado é guardado**.

| | MODO PACIENTE | MODO LIVRE |
|---|---|---|
| Contexto | um paciente travado | nenhum paciente |
| Evolução | salva na ficha | avulsa (não entra em ficha) |
| Plano de ação | registrado para o paciente | genérico / estudo |
| Dúvida clínica | no contexto do caso | geral (uso mais comum aqui) |
| Material | ligado ao paciente | avulso |
| Histórico | acumula | não acumula |

### O contexto liga e desliga (não é prisão)
- **Trazer paciente no meio do modo livre:** se disser "na verdade isso é da Maria", o sistema oferece amarrar à ficha dela e converte para MODO PACIENTE.
- **Soltar o paciente no meio do modo paciente:** pode fazer uma pergunta geral sem encerrar tudo.

### O modo livre não pode virar lixeira de evolução
Se um texto em MODO LIVRE parece uma evolução de paciente real, oferecer vinculá-lo a uma ficha (evita evolução órfã).

---

## 8. Implicação no modelo de dados

A distinção entre modos cai em algo simples: **o vínculo com paciente é opcional** — `paciente_id` nullable (preenchido no MODO PACIENTE, nulo no LIVRE).

> **Importante (reutilização):** o app já tem `patients` e `evolutions`. O canal WhatsApp **reutiliza essas tabelas** em vez de criar novas — gravando com o `user_id` correto do psicólogo (id de `auth.users`, obtido via `profiles.user_id`) — para que web e WhatsApp compartilhem o mesmo dado. Ver o relatório de schema para colunas exatas.

Campos relevantes de `evolutions` já existentes: `input_type` ('text'|'audio'), `input_content`, `output_content`, `audio_url`, `patient_id` (nullable), `revision_history`.

---

## 9. Fluxo de uma mensagem (resumo para o webhook)

1. **Webhook recebe** e responde rápido (a Meta reentrega se demorar). Processa em background.
2. **Resolve o tenant:** telefone → psicólogo. Se não existe, fluxo de cadastro; se inativo, renovação.
3. **Converte mídia em texto:** áudio (transcrição), imagem (descrição + texto visível), documento (extração/descrição).
4. **Resolve o contexto:** há paciente travado? a mensagem menciona um paciente? é menu inicial?
5. **Worker de IA:** monta o prompt com o histórico do paciente (se MODO PACIENTE) e chama o LLM.
6. **Persiste:** grava a produção em `evolutions` com `user_id` e `patient_id` (ou nulo). Áudio/PDF no Storage.
7. **Emissor de resposta:** devolve ao WhatsApp dentro da janela de 24h (texto e, se aplicável, PDF/botões).

### Estado da conversa
Manter, por psicólogo, um estado leve de conversa (paciente travado, última intenção, passo de cadastro) para entender "agora faz o plano" como sendo do mesmo paciente. Guardar em `wa_sessions`.

---

## 10. Limites e princípios

- **Web é opcional para o uso diário.** Só configuração, detalhamento, pagamento e exportação.
- **Isolamento por psicólogo é obrigatório** — toda operação amarrada ao `user_id` dono.
- **Componentes interativos só dentro da janela de 24h.** Proativo = template aprovado.
- **Paciente é contexto que liga/desliga**, não obrigação. Os três caminhos sempre acessíveis.
- **Nada de evolução órfã** — oferecer vincular a uma ficha quando um conteúdo de modo livre parecer de paciente real.
- **Dado clínico é sensível (LGPD)** — isolamento forte e cuidado com dados pessoais em logs.
