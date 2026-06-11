# Relatório de Intenções nas Conversas do ChatPsi

> **Gerado em:** 02/06/2026
> **Pergunta de negócio:** *o que* os psicólogos mais pedem dentro das conversas (não *qual feature* — isso está no `RELATORIO-USO-FUNCIONALIDADES.md`).
> **Método:** classificação de cada **turno de conversa por intenção**, usando a **resposta da IA como fonte principal** (o lado do usuário é parcialmente invisível). Heurística por palavras-chave em 100% dos turnos + validação semântica por amostra.
> **Projetos:** `rrdvivxdasezvhfbetra` (App web — Chat Clínico) e `jwbefwodrvwmdsufszpd` (Bot de WhatsApp).
> **Privacidade (LGPD):** todos os exemplos foram anonimizados (`[PACIENTE]`, `[NOME]`, `[DATA]`).

---

## ⚠️ Ressalva metodológica obrigatória (leia antes dos números)

Os dois projetos **medem coisas diferentes** e **não devem ser somados nem comparados 1:1**:

- O **Bot** conta *mensagens individuais* de WhatsApp (turnos curtos, muita "cola" conversacional).
- O **App** conta *turnos de resposta do assistente* no Chat Clínico.

A comparação entre eles é **temática** (qual intenção domina em cada canal), **não numérica**. Além disso, **classificar intenção por texto é aproximado** — a acurácia medida foi de **~65–70%** (ver §8).

---

## 1. Universo classificado e período

| | **App** (`messages`) | **Bot** (`_chat_history`) |
|---|---|---|
| Respostas da IA classificadas | **985** | **106.929** |
| Conteúdo não-clínico (e-commerce/produto) excluído | 0 | 267 |
| Turnos com pergunta do usuário em **texto** | 831 (84,4%) | 28.078 (26,3%) |
| Turnos **`inferido_sem_pergunta`** (só pela resposta da IA) | 154 (15,6%) | **78.729 (73,7%)** |
| Usuários / telefones distintos | 53 usuários | 611 telefones |
| Primeira data | 14/08/2025 | 05/06/2025 |
| Última data | 01/06/2026 | lado IA: **02/06/2026** / lado usuário: **25/09/2025** |

**Ponto cego:** no Bot, **74% das classificações** dependem só da resposta da IA (o usuário deixou de ser gravado em out/2025). No App, 16% (áudios/mídia, que **não são transcritos** — o `content` guarda só o nome do arquivo).

### Taxonomia (estendida a partir dos dados)
Às 7 categorias originais foram acrescentadas **3 que emergiram com volume relevante** — sinalizado conforme combinado:
**Documentos clínicos** (atestado/declaração/laudo/parecer), **Material terapêutico** (fichas/escalas/exercícios) e **Saudação/meta-conversação**. Ordem de prioridade para turnos multi-intenção (1ª regra que casa vence): **Evolução > Documentos > Plano > Material > Artigo > Marketing > Ajuste > Dúvida > Saudação > Outros**.

---

## 2. App Web — Ranking de Intenções

> Total: 985 turnos. Em **todas** as tabelas abaixo, `% inferido` = fração classificada só pela resposta da IA.

| # | Intenção | Turnos | % | Usuários | Pedidos/usuário | % inferido |
|---|----------|-------:|--:|---------:|----------------:|-----------:|
| 🥇 | **Evolução / registro de sessão** | 219 | 22,2% | 32 | 6,8 | 26,5% |
| 🥈 | **Plano de ação / tratamento** | 184 | 18,7% | 39 | 4,7 | 11,4% |
| 🥉 | **Material terapêutico** | 184 | 18,7% | 32 | 5,8 | 8,2% |
| 4 | Dúvida clínica / psicoeducação | 112 | 11,4% | 27 | 4,1 | 9,8% |
| 5 | Documentos clínicos | 96 | 9,7% | 24 | 4,0 | 13,5% |
| 6 | Busca de artigo / evidência | 24 | 2,4% | 12 | 2,0 | 12,5% |
| 7 | Marketing clínico | 9 | 0,9% | 4 | 2,3 | 0% |
| — | Saudação / meta | 47 | 4,8% | 13 | — | — |
| — | Outros / não classificável | 110 | 11,2% | 33 | — | 25,5% |

### Recorrência (o que fideliza)
| Intenção | Usuários | % que repetem | Pedidos/usuário |
|----------|---------:|--------------:|----------------:|
| Plano | 39 | 79,5% | 4,7 |
| Material | 32 | 78,1% | 5,8 |
| Documentos | 24 | 66,7% | 4,0 |
| Evolução | 32 | 65,6% | 6,8 |
| Dúvida | 27 | 63,0% | 4,1 |
| Artigo | 12 | 41,7% | 2,0 |

**Leitura:** Evolução tem a maior intensidade (6,8 pedidos/usuário) e Plano/Material a maior taxa de retorno (~79%). Artigo é exploratório (baixa recorrência).

---

## 3. Bot WhatsApp — Ranking de Intenções

> Total clínico: 106.929 turnos. Note o alto `% inferido` (o usuário sumiu pós-out/25).

| # | Intenção | Turnos | % | Telefones | Pedidos/telefone | % inferido |
|---|----------|-------:|--:|----------:|-----------------:|-----------:|
| 🥇 | **Evolução / registro de sessão** | 20.241 | 19,0% | 437 | 46,3 | 67,2% |
| 🥈 | **Plano de ação / tratamento** | 14.877 | 13,9% | 494 | 30,1 | 63,3% |
| 🥉 | **Dúvida clínica / psicoeducação** | 13.152 | 12,3% | 463 | 28,4 | 74,6% |
| 4 | Material terapêutico | 13.004 | 12,2% | 439 | 29,6 | 68,1% |
| 5 | Documentos clínicos | 5.078 | 4,8% | 364 | 14,0 | 69,1% |
| 6 | Busca de artigo / evidência | 3.727 | 3,5% | 310 | 12,0 | 77,7% |
| 7 | Marketing clínico | 1.212 | 1,1% | 134 | 9,0 | 53,0% |
| 8 | Ajuste / continuação | 120 | 0,1% | 58 | 2,1 | 56,7% |
| — | Saudação / meta | 6.839 | 6,4% | 450 | — | — |
| — | Outros / não classificável | 28.473 | 26,7% | 536 | — | 85,3% |

### Recorrência
| Intenção | Telefones | % que repetem | Pedidos/telefone |
|----------|----------:|--------------:|-----------------:|
| Plano | 494 | 90,9% | 30,1 |
| Material | 439 | 88,6% | 29,6 |
| Evolução | 437 | 88,3% | 46,3 |
| Dúvida | 463 | 82,7% | 28,4 |
| Documentos | 364 | 76,9% | 14,0 |
| Artigo | 310 | 70,6% | 12,0 |
| Marketing | 134 | 68,7% | 9,0 |

**Leitura:** recorrência altíssima — 88–91% dos telefones que pedem Plano/Material/Evolução **voltam a pedir**. Evolução de novo é a mais intensa (46 pedidos/telefone). O Bot é uma ferramenta de trabalho diário, não eventual.

> **Sobre `Outros` (26,7%) e `Saudação` (6,4%):** característico de WhatsApp — muitos turnos curtos (cumprimentos, confirmações "quer que eu…?", esclarecimentos, mensagens operacionais). A amostragem (§8) confirma que `Outros` é majoritariamente conteúdo genuinamente fora das categorias ou multi-intenção, não uma categoria perdida.

---

## 4. Pedidos mais repetidos (sub-temas clínicos)

Temas concretos dentro dos turnos clínicos (contagem por ocorrência de tema; um turno pode citar mais de um):

| Tema | App | Bot |
|------|----:|----:|
| Ansiedade / pânico | 330 | 21.191 |
| Família | 263 | 19.631 |
| Casal / relacionamento | 115 | 9.000 |
| Infantil / criança | 92 | 8.433 |
| TCC | 98 | 7.516 |
| Depressão | 98 | 6.197 |
| TEA / autismo | 41 | 4.240 |
| TDAH | 50 | 3.541 |
| Trauma / TEPT | 69 | 3.069 |
| Luto | — | 2.130 |
| Quadros graves (bipolar/borderline) | — | 2.276 |
| Psicanálise / junguiana | — | 846 |

**Ansiedade e família/casal dominam** em ambos os canais. A TCC é a abordagem mais citada explicitamente.

---

## 5. Tendência Mensal

### 5.1 Bot — contagem indicativa por intenção (regex independente por categoria)
| Mês | Evolução | Plano | Material |
|-----|---------:|------:|---------:|
| 2025-06 | 460 | 579 | 604 |
| 2025-07 | 1.481 | 1.170 | 1.076 |
| 2025-08 | 2.129 | 1.302 | 1.171 |
| 2025-09 | 1.943 | 1.549 | 1.231 |
| 2025-10 | 1.629 | 1.272 | 970 |
| 2025-11 | 1.924 | 788 | 812 |
| 2025-12 | 1.056 | 429 | 676 |
| 2026-01 | 1.331 | 367 | 501 |
| 2026-02 | 1.100 | 332 | 527 |
| 2026-03 | 1.072 | 470 | 680 |
| 2026-04 | 689 | 301 | 617 |
| 2026-05 | 729 | 262 | 634 |

Evolução é a intenção mais estável ao longo de todo o período; Plano teve pico em ago–set/2025 e recuou. O volume geral do Bot declina conforme usuários migram (telefones ativos/mês caem de ~270 para ~110).

### 5.2 App — turnos por intenção
| Mês | Evolução | Plano | Material | Dúvida | Documentos |
|-----|---------:|------:|---------:|-------:|-----------:|
| 2025-08 | 5 | 14 | 4 | 4 | 1 |
| 2025-09 | 16 | 15 | 3 | 12 | 14 |
| 2025-10 | 38 | 34 | 17 | 16 | 9 |
| 2025-11 | 32 | 9 | 9 | 2 | 4 |
| 2025-12 | **46** | **47** | **40** | **36** | **45** |
| 2026-01 | 22 | 22 | 22 | 6 | 5 |
| 2026-02 | 19 | 8 | 25 | 8 | 1 |
| 2026-03 | 21 | 22 | 29 | 12 | 11 |
| 2026-04 | 14 | 7 | 9 | 5 | 2 |
| 2026-05 | 6 | 5 | 25 | 10 | 4 |

Pico geral em dez/2025. **Material terapêutico** vem ganhando peso relativo no App em 2026 (frequentemente a intenção mais pedida nos meses recentes).

---

## 6. Origem da Classificação (tamanho do ponto cego)

Quanto de cada canal foi classificado **com** a pergunta do usuário em texto vs. **só pela resposta da IA**:

| | Com pergunta em texto | Inferido só pela resposta |
|---|----------------------:|--------------------------:|
| **App** | 831 (84,4%) | 154 (15,6%) — quase tudo áudio/mídia não transcrita |
| **Bot** | 28.078 (26,3%) | **78.729 (73,7%)** — usuário não gravado pós-out/2025 |

Por categoria, o `% inferido` está nas tabelas §2–§3. No Bot ele é alto e relativamente uniforme (53–85%), então **as conclusões do Bot repousam fortemente sobre o texto da IA** — robusto para temas estruturados (Evolução, Plano), mais frágil para intenções sutis.

---

## 7. Exemplos Reais (Anonimizados)

### App Web
**Evolução:** "Este conteúdo foi transcrito de um áudio. Relatório de sessão — Paciente: [PACIENTE]…" · "sugestão de evolução para prontuário eletrônico baseada no seu relato sobre o paciente [PACIENTE]"
**Plano:** "elaborei um plano de ação personalizado para o tratamento de ansiedade, depressão e bipolaridade tipo 2…" · "encontrei três planos de ação que podem ajudar na sua sessão sobre pensamentos intrusivos e ansiedade"
**Material:** "organizar os textos prontos para impressão: 1) Folheto sobre crise de ansiedade…" · "exercícios práticos para trabalhar autoestima baixa e imagem corporal"
**Dúvida:** "passo a passo prático para aplicar a reestruturação cognitiva na terapia…" · "Alteridade é um conceito fundamental na psicanálise…"
**Documentos:** discussões sobre estruturação de **laudos e pareceres** clínicos
**Artigo:** "Segue a referência segundo as normas da ABNT: BECK, Judith S. *Terapia Cognitiva*…"

### Bot WhatsApp
**Evolução:** "[NOME], aqui está um resumo de ~5 linhas para atualizar o prontuário dessa sessão: a paciente relatou uma semana tensa…" · "envie os áudios para que eu faça a transcrição e elabore o resumo da sessão, formatado para prontuário"
**Plano:** "vou preparar um plano de ação detalhado com técnicas específicas para a elaboração do trauma…" · "não encontrei um plano pronto para depressão com baixa adesão à medicação, mas posso elaborar…"
**Material:** "vou estruturar o Big Five Inventory (BFI) para impressão…" · "questionário estruturado para avaliação de burnout, baseado no CID-10…"
**Documentos:** "segue o parecer simplificado — Paciente: [PACIENTE]…" · "modelo de declaração informando que o paciente está em tratamento terapêutico" *(a IA recusou emitir atestado médico — guardrail ético correto)*
**Dúvida:** "roteiro detalhado para material psicoeducativo sobre TDAH…" · metáfora do "alarme falso" para explicar ansiedade
**Artigo:** "as referências são de livros e artigos reconhecidos em psicologia de casais: [AUTOR]…"
**Marketing:** "texto completo para um post sobre burnout, pensado para gerar identificação e incentivar a busca pela terapia"

---

## 8. Validação e Acurácia

Validação semântica por **leitura manual de amostras aleatórias** (40 turnos do Bot, 25 do App), comparando o rótulo do keyword com o julgamento humano:

- **Concordância observada: ~65–70%** em ambos os projetos.
- **Margem de erro:** ampla pelo tamanho da amostra (≈ ±15 pp no Bot, ±19 pp no App, IC 95%). Trate os percentuais como **ordem de grandeza**, não medida exata.
- **% resolvido por keyword numa categoria substantiva:** ~67% (Bot) / ~84% (App). O restante caiu em Saudação/Outros; a leitura semântica foi usada para validar e caracterizar esses baldes.
- **Principal fonte de erro:** a fronteira **Evolução ↔ Plano ↔ Material** e turnos **multi-intenção** (ex.: "plano terapêutico" que também descreve a evolução). A ordem de prioridade (Evolução antes de Plano) tende a **inflar Evolução** e subestimar Plano.

---

## 9. App vs. WhatsApp — Comparação Temática

| Aspecto | App Web | Bot WhatsApp |
|---------|---------|--------------|
| Intenção #1 | **Evolução (22%)** | **Evolução (19%)** |
| Top 3 | Evolução, Plano, Material (empate) | Evolução, Plano, Dúvida |
| "Ruído" conversacional | baixo (Outros+Saud ≈ 16%) | alto (Outros+Saud ≈ 33%) |
| Material terapêutico | muito alto (18,7%) | alto (12,2%) |
| Documentos clínicos | 9,7% | 4,8% |
| Ponto cego (inferido) | 16% | 74% |

**A hipótese do relatório anterior ("WhatsApp = ditar sessão; App = mais variado") confirma-se parcialmente:** Evolução lidera nos **dois** canais — documentar sessão é o coração do produto em qualquer superfície. A diferença real é que o **App tem menos ruído e mais "material terapêutico/documentos"** (uso mais deliberado e produtivo), enquanto o **Bot tem muito mais conversa-cola** e dependência da inferência.

**Indício de migração:** o lado-usuário do Bot some em out/2025 e os telefones ativos caem (~270 → ~110/mês), enquanto o App cresce a partir de ago/2025 com o mesmo perfil de intenção (Evolução/Plano/Material). Sugere transferência do uso de documentação clínica do WhatsApp para o App.

---

## 10. Insights Acionáveis

1. **Evolução/registro de sessão é a função-âncora** dos dois canais — deve ser o fluxo central do produto. **Gargalo crítico:** no App o áudio **não é transcrito** (só o nome do arquivo é salvo) e no Bot 74% do uso é invisível. Investir em **transcrição nativa confiável de áudio→evolução** destrava produto *e* métrica.
2. **"Material terapêutico" é a demanda escondida** (12–19%) — fichas, escalas, questionários (BFI, burnout), exercícios, quadros de rotina. **Não existe feature dedicada.** Forte candidato a um **gerador de materiais/worksheets com biblioteca** e exportação para impressão.
3. **"Documentos clínicos" é uma segunda demanda escondida** (5–10%) — atestados, declarações, laudos, pareceres, encaminhamentos, sem atalho próprio. Candidato a um **gerador de documentos com modelos e guardrails éticos** (a IA já recusa atestado médico — manter).
4. **Conteúdo e templates devem priorizar Ansiedade e Família/Casal** (temas dominantes), com TCC como abordagem mais citada.
5. **Migrar usuários do WhatsApp para o App** reduz o "ruído" conversacional (33% → 16%), corta custo de tokens e restaura a rastreabilidade do lado do usuário (hoje invisível no Bot).

---

## 11. Limitações

- **(a) Classificação por texto é aproximada** — acurácia ~65–70%, com margem de erro ampla pela amostra de validação.
- **(b) Fonte principal = resposta da IA**, que pode misturar assuntos. Turnos **multi-intenção** foram resolvidos por **ordem de prioridade** (1ª regra que casa vence), o que enviesa contagens nas fronteiras (sobretudo Evolução vs. Plano).
- **(c) Turnos `inferido_sem_pergunta`** (74% do Bot, 16% do App) dependem 100% da resposta da IA, sem o pedido original para conferência.
- **(d) Turnos sem resposta da IA gravada** não foram classificados.
- **(e) Base de usuários do Bot é legada** (tabela `usuarios` congelada em set/2025) — métricas de usuário/assinante do Bot podem estar desatualizadas; aqui usamos `telefones distintos` de `_chat_history`, que segue ativo.
- **(f) Filtro clínico vs. e-commerce é heurístico** — excluídos 267 turnos de conteúdo de produto/moda (nível de turno); pode haver falsos positivos/negativos residuais.
- **(g) Restrições técnicas:** acentuação precisou ser normalizada via `translate()` no Postgres (o cliente corrompia caracteres acentuados); as séries mensais do Bot usam regex independente por categoria (não a classificação priorizada), por isso são **indicativas** e não somam exatamente aos totais do ranking.

---

## 12. Nota de Segurança

O **token de gerenciamento do Supabase** (`sbp_…`) usado nesta análise foi compartilhado em texto puro. **Recomenda-se rotacioná-lo** (Supabase → Account → Access Tokens).

---

*Análise read-only via Supabase Management API. Nenhum dado foi modificado. Exemplos anonimizados conforme LGPD.*
