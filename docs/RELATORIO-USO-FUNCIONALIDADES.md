# Relatório de Uso — Funcionalidades Mais Utilizadas no ChatPsi

> **Gerado em:** 02/06/2026
> **Método:** Engenharia reversa de uso a partir dos dados armazenados no Supabase (não há painel de analytics nativo). Cada feature grava em uma tabela própria, então o uso foi inferido por contagem de registros, usuários distintos e tokens consumidos.
> **Projetos analisados:** `rrdvivxdasezvhfbetra` (app web ChatPsi — produção) e `jwbefwodrvwmdsufszpd` (bot de atendimento via WhatsApp).
> **Privacidade (LGPD):** todos os exemplos foram **anonimizados** — nomes de pacientes, iniciais e dados identificáveis foram substituídos por placeholders.

---

## 1. Resumo Executivo

**A funcionalidade mais usada do ecossistema ChatPsi é a geração/assistência de documentação clínica em conversa com a IA** — e ela aparece em duas superfícies distintas:

1. **Bot de WhatsApp (`jwbefwodrvwmdsufszpd`)** — de longe o canal de maior volume: **57.517 mensagens de usuários** e **107.185 respostas da IA**. As mensagens mostram psicólogos ditando sessões ("*elabore o dia de atendimento de [PACIENTE]...*") e pedindo planos de ação. É o "motor" original do produto.
2. **App web (`rrdvivxdasezvhfbetra`)** — dentro do app, o **Chat Clínico** domina com **1.049 mensagens (79% de todas as operações), 53 usuários distintos**, muito à frente das demais features.

> ⚠️ **Ressalva metodológica importante:** os dois projetos medem coisas diferentes — o bot conta *mensagens individuais* de WhatsApp, enquanto o app conta *operações de feature*. Não é uma comparação 1:1. Ainda assim, ambos apontam para o mesmo vencedor temático: **interação conversacional com a IA para apoio clínico (documentação de sessões, dúvidas clínicas e planos de tratamento).**

### Pódio (app web ChatPsi)

| # | Funcionalidade | Operações | % do total | Usuários |
|---|----------------|-----------|------------|----------|
| 🥇 | **Chat Clínico** | 1.049 | 79,1% | 53 |
| 🥈 | **Busca de Planos de Ação** | 138 | 10,4% | 32 |
| 🥉 | **Evolução Clínica** | 54 | 4,1% | 19 |
| 4 | Calculadora Tributária | 30 | 2,3% | 6 |
| 5 | Marketing IA | 28 | 2,1% | 16 |
| 6 | Busca de Artigos Científicos | 27 | 2,0% | 18 |

---

## 2. Período Analisado

O período considerado foi **todo o histórico disponível** em cada tabela:

| Superfície | Início dos dados | Fim dos dados |
|------------|------------------|---------------|
| Chat Clínico (app) | 14/08/2025 | 01/06/2026 |
| Busca de Planos (app) | 09/10/2025 | 01/06/2026 |
| Evolução Clínica (app) | 17/03/2026 | 01/06/2026 |
| Marketing IA (app) | 12/11/2025 | 30/05/2026 |
| Busca de Artigos (app) | 09/10/2025 | 28/05/2026 |
| Calculadora Tributária (app) | 07/05/2026 | 22/05/2026 |
| Bot WhatsApp (`_chat_history`) | 05/06/2025 | 02/06/2026 |

---

## 3. Ranking Detalhado — App Web ChatPsi (`rrdvivxdasezvhfbetra`)

Métrica de operação = registros gerados pelo usuário (no chat, mensagens com `sender = 'user'`). Total de operações no app: **1.326**.

| Funcionalidade | Operações | % | Usuários distintos | Operações / usuário | Janela |
|----------------|-----------|---|--------------------|--------------------:|--------|
| **Chat Clínico** | 1.049 | 79,1% | 53 | 19,8 | ago/25 – jun/26 |
| **Busca de Planos** | 138 | 10,4% | 32 | 4,3 | out/25 – jun/26 |
| **Evolução Clínica** | 54 | 4,1% | 19 | 2,8 | mar/26 – jun/26 |
| **Calculadora Tributária** | 30 | 2,3% | 6 | 5,0 | mai/26 (1 mês) |
| **Marketing IA** | 28 | 2,1% | 16 | 1,8 | nov/25 – mai/26 |
| **Busca de Artigos** | 27 | 2,0% | 18 | 1,5 | out/25 – mai/26 |

**Leituras:**
- O **Chat Clínico** não é só o mais usado em volume; também tem a maior **intensidade por usuário** (≈20 mensagens/usuário), indicando uso recorrente e "pegajoso".
- A **Calculadora Tributária**, embora recente (só mai/26), já mostra boa intensidade (5 análises/usuário) — sinal de adoção forte de uma feature nova.
- **Busca de Artigos** e **Marketing IA** têm boa distribuição de usuários (16–18), mas baixa recorrência (≈1,5/usuário) — features exploradas uma vez, sem fidelização.

---

## 4. Ranking — Bot de WhatsApp (`jwbefwodrvwmdsufszpd`)

Este projeto é um assistente de WhatsApp (RAG sobre base de conhecimento — 8.598 documentos vetorizados) usado por psicólogos para **ditar sessões e pedir planos/dúvidas**. É o canal de maior tráfego de todo o ecossistema.

| Tipo de registro | Volume | Telefones distintos | Período |
|------------------|--------|---------------------|---------|
| Mensagens da **IA** (`role='ai'`) | 107.185 | 611 | jun/25 – jun/26 |
| Mensagens de **usuários** (`role='user'`) | 57.517 | 504 | jun/25 – **set/25** |
| Mensagens legadas (`role='assistant'`) | 90 | 3 | jun/25 |

**Base de usuários do bot (tabela `usuarios`, legada — congelada em set/2025):**
- 566 usuários cadastrados • 212 assinantes • 3.068 interações totais • ~632 milhões de tokens consumidos.
- Funil de remarketing: 327 leads (follow-ups: FU1 = 17, FU2 = 26, FU3 = 8).

> ⚠️ **Atenção ao registro de logs:** a partir de **outubro/2025** o bot **parou de gravar as mensagens dos usuários** (`role='user'` zera), mas continuou gravando as respostas da IA até jun/2026. Ou seja, o bot **permaneceu ativo o tempo todo** (6.000–11.000 respostas da IA por mês), mas o lado do usuário deixou de ser persistido — provável mudança de pipeline (n8n) ou migração parcial para o app. **O volume real de uso do usuário pós-set/25 está subnotificado.**

---

## 5. Tendência Mensal

### 5.1 App Web — operações por feature

| Mês | Chat | Planos | Evolução | Calc | Marketing | Artigos |
|-----|-----:|-------:|---------:|-----:|----------:|--------:|
| 2025-08 | 74 | – | – | – | – | – |
| 2025-09 | 76 | – | – | – | – | – |
| 2025-10 | 164 | 13 | – | – | – | 8 |
| 2025-11 | 82 | 7 | – | – | 4 | 3 |
| 2025-12 | **255** | 46 | – | – | 9 | 6 |
| 2026-01 | 96 | 2 | – | – | – | 1 |
| 2026-02 | 65 | 8 | – | – | – | 1 |
| 2026-03 | 110 | 36 | 16 | – | 5 | 2 |
| 2026-04 | 56 | 7 | 16 | – | 1 | 1 |
| 2026-05 | 68 | 17 | 20 | **30** | 9 | 5 |
| 2026-06 | 3 | 2 | 2 | – | – | – |

- **Pico de uso:** dez/2025 (255 mensagens de chat). 
- **Evolução Clínica** entrou em mar/2026 e cresce de forma consistente (16 → 16 → 20).
- **Calculadora Tributária** estreou em mai/2026 com 30 análises — a maior estreia de qualquer feature.
- jun/2026 está parcial (dados até o dia 01–02).

### 5.2 Bot WhatsApp — mensagens por mês

| Mês | Usuário | IA | Telefones |
|-----|--------:|---:|----------:|
| 2025-06 | 4.102 | 5.873 | 175 |
| 2025-07 | 8.759 | 10.999 | 272 |
| 2025-08 | **36.068** | 12.803 | 206 |
| 2025-09 | 8.588 | 12.456 | 221 |
| 2025-10 | 0* | 11.237 | 210 |
| 2025-11 | 0* | 10.330 | 183 |
| 2025-12 | 0* | 8.229 | 145 |
| 2026-01 | 0* | 7.873 | 126 |
| 2026-02 | 0* | 6.826 | 126 |
| 2026-03 | 0* | 7.530 | 125 |
| 2026-04 | 0* | 6.116 | 118 |
| 2026-05 | 0* | 6.738 | 112 |
| 2026-06 | 0* | 175 | 25 |

*\* mensagens de usuário deixaram de ser gravadas a partir de out/2025 (ver §4). A atividade da IA prova que o bot seguiu em uso intenso.*

- O bot teve um **pico explosivo em ago/2025** (36 mil mensagens de usuários).
- O número de telefones ativos/mês cai gradualmente (272 → ~112), sugerindo migração de usuários para o app web ou churn do canal WhatsApp.

---

## 6. Breakdowns Qualitativos (App Web)

### 6.1 Chat Clínico — por tipo de entrada

| Tipo | Mensagens | % |
|------|----------:|--:|
| Texto | 867 | 82,6% |
| Áudio | 140 | 13,3% |
| Documento | 27 | 2,6% |
| Imagem | 14 | 1,3% |
| Vídeo | 1 | 0,1% |

O chat é predominantemente textual, mas o **áudio é relevante (13%)** — psicólogos ditam conteúdo. Razão de mensagens user/assistant ≈ 1.049 / 985 (conversas equilibradas, ida-e-volta real).

### 6.2 Evolução Clínica — por abordagem terapêutica

| Abordagem | Evoluções | % |
|-----------|----------:|--:|
| TCC (Cognitivo-Comportamental) | 29 | 53,7% |
| Psicanálise | 12 | 22,2% |
| Humanista | 5 | 9,3% |
| Outra | 4 | 7,4% |
| Comportamental | 2 | 3,7% |
| (não informada) | 2 | 3,7% |

**TCC é a abordagem dominante** entre os usuários do app. Por tipo de entrada: **texto 37 (69%) vs. áudio 17 (31%)** — o áudio tem peso ainda maior na evolução do que no chat.

---

## 7. Tokens e Custo de IA

| Métrica | App Web (`profiles`) | Bot WhatsApp (`usuarios`, legado) |
|---------|---------------------:|----------------------------------:|
| Tokens totais consumidos | **1.341.331.853** (~1,34 bi) | 632.068.148 (~632 mi) |
| Usuários com consumo | 237 (de 328 perfis) | 566 cadastrados |
| Assinantes ativos | 147 | 212 |
| Média de tokens/usuário ativo | ~5,66 milhões | — |

O app web já consome **mais que o dobro de tokens** do que o bot legado acumulou — coerente com o chat conversacional intenso ser a feature campeã. ~72% dos perfis têm consumo registrado; ~45% são assinantes ativos.

---

## 8. Exemplos Reais (Anonimizados)

> Dados de pacientes substituídos por `[PACIENTE]`/`[DATA]` conforme LGPD.

**Chat Clínico** (dúvidas clínicas e apoio a planos — o coração do uso):
- "exemplo de questionamento socrático"
- "Identificar e desafiar crenças disfuncionais (incapacidade, desconfiança, medo de troca)."
- "o que é estresse crônico?"
- "quero que faça um plano de tratamento com número de sessões dentro da TCC, para uma paciente de 18 anos…"
- "ChatPsi, voltar ao cronograma original, porém deixar o horário editável"

**Busca de Planos de Ação:**
- "plano de tratamento dentro da TCC para paciente de 18 anos após trauma…"
- "explicação sobre o que é TDAH (fisiológico e transtorno) e métodos de lidar no dia a dia"
- "Plano clínico para TDAH em adulto na Abordagem Fenomenológica Existencial"

**Busca de Artigos Científicos:**
- "Eficácia da TCC para TEPT"
- "Evidências sobre mindfulness na ansiedade"
- "Avaliação Neuropsicológica TDAH"

**Marketing IA:**
- "Crie um post para Instagram sobre a satisfação de realizar atendimentos psicológicos…"
- "Gere um post sobre os impactos da comparação na saúde mental e o que a TCC fala sobre isso"

**Calculadora Tributária** (entradas estruturadas):
- `{ atuacao: "PF", prioridade: "ECONOMIA", faturamentoMensal: 7000 }`
- `{ atuacao: "PF", prioridade: "APOSENTADORIA", faturamentoMensal: 2000 }`

**Bot WhatsApp** (ditado de sessões — uso massivo, anonimizado):
- "Agora, elabore o dia de atendimento de [PACIENTE], que foi atendida no dia [DATA]. [PACIENTE] disse que foi à psiquiatra com a mãe…"
- "olá, tenho uma paciente adolescente que mora com o pai. os pais são separados…"
- "Quero plano de ação"

---

## 9. Observações e Insights

1. **O produto é, na essência, um copiloto conversacional clínico.** Em ambas as superfícies, o uso esmagador é conversa com a IA para: (a) documentar/ditar sessões e (b) montar planos de tratamento. As features "utilitárias" (tributária, marketing, artigos) são satélites de baixo volume.
2. **Adoção (largura) vs. intensidade (profundidade):**
   - Alta intensidade e largura: **Chat Clínico** (53 usuários × 20 msgs).
   - Boa largura, baixa intensidade: **Artigos** e **Marketing** (16–18 usuários, ~1,5 usos) — bom para descoberta, fraco em retenção.
   - Nicho intenso: **Calculadora Tributária** (poucos usuários, mas muitas análises cada).
3. **Migração de canal:** o WhatsApp foi a porta de entrada original (pico de 36k mensagens em ago/25) e vem perdendo telefones ativos enquanto o app cresce — indício de migração do WhatsApp para o app web.
4. **Evolução Clínica é a aposta em ascensão:** lançada em mar/26, cresce mês a mês e tem o maior uso de áudio (31%) — replica no app o que os psicólogos já faziam no WhatsApp.
5. **Gap de instrumentação:** o bot deixou de logar mensagens de usuários em out/25. Recomenda-se restaurar esse log (ou instrumentar eventos) para medir uso de forma confiável daqui pra frente.

---

## 10. Limitações Metodológicas

- **Proxy, não telemetria.** O "uso" foi inferido por registros gravados, não por eventos de clique/sessão. Ações que não persistem dados (navegação, visualizações, tentativas que falharam) não aparecem.
- **Métricas não comparáveis entre projetos.** O bot conta mensagens individuais; o app conta operações de feature. O ranking unificado é temático, não numérico.
- **Subnotificação do bot pós-out/2025** (mensagens de usuário não gravadas).
- **Tabela `usuarios` do bot é legada** (congelada em set/2025) — números de assinatura/tokens podem estar desatualizados.
- **Features sem tabela dedicada** (ex.: melhoria de evolução via `improve-evolution`, exportação de PDF, gestão de pacientes) não entraram no ranking de "uso", apenas as 6 features com persistência própria.
- **Tabelas `wa_messages`/`wa_sessions`** (novo canal WhatsApp Cloud API) **não existem ainda** no banco de produção — a migração correspondente não foi aplicada.

---

## 11. Nota de Segurança

O **token de gerenciamento do Supabase** (`sbp_…`) usado nesta análise foi compartilhado em texto puro. **Recomenda-se rotacioná-lo** no painel Supabase (*Account → Access Tokens*) por ter ficado exposto no histórico da sessão.

---

*Relatório gerado por análise automatizada read-only via Supabase Management API. Nenhum dado foi modificado.*
