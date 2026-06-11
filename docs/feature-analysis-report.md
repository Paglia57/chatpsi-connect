# Relatório de Funcionalidades — ChatPsi Connect

> **Gerado em:** 28 de maio de 2026
> **Fonte:** Supabase · tabela `messages` · projeto `rrdvivxdasezvhfbetra`
> **Método:** Classificação por keywords no conteúdo das mensagens (SQL)
> **Privacidade:** nenhum conteúdo de mensagem nem dado pessoal identificável neste documento

---

## Sumário Executivo

- **2026 mensagens** em **51 conversas** de **51 usuários únicos**
- Período: **2025-08-14** → **2026-05-28**
- Funcionalidade mais usada: **Áudio / Transcrição** com **37.3%** das conversas

---

## Ranking de Funcionalidades

> Classificação ao nível de conversa (thread). Cada conversa é atribuída a uma única
> funcionalidade com base em palavras-chave identificadas nas mensagens.

| # | Funcionalidade | Conversas | Mensagens | % | Média msgs | Distribuição |
|--:|:---------------|----------:|----------:|--:|-----------:|:-------------|
| 1 | Áudio / Transcrição | 19 | 1008 | 37.3% | 53.1 | `████████████████████████` |
| 2 | Redação de Evolução | 16 | 632 | 31.4% | 39.5 | `████████████████████░░░░` |
| 3 | Chat Clínico Geral | 7 | 40 | 13.7% | 5.7 | `█████████░░░░░░░░░░░░░░░` |
| 4 | Envio de Arquivo | 7 | 334 | 13.7% | 47.7 | `█████████░░░░░░░░░░░░░░░` |
| 5 | Busca de Artigos | 2 | 12 | 3.9% | 6.0 | `███░░░░░░░░░░░░░░░░░░░░░` |

---

## Cobertura dos Keywords

> Quantidade de mensagens do usuário que contêm palavras-chave de cada categoria.
> Usado para validar que as regras de classificação capturam o volume esperado.

| Categoria | Matches | % de msgs do usuário |
|:----------|--------:|---------------------:|
| Redação de Evolução | 110 | 10.5% |
| Marketing / Conteúdo | 43 | 4.1% |
| Busca de Artigos | 21 | 2.0% |
| Cálculo Tributário | 1 | 0.1% |

---

## Distribuição por Tipo de Mídia

| Tipo | Mensagens | % |
|:-----|----------:|--:|
| text | 1844 | 91.0% |
| audio | 140 | 6.9% |
| document | 27 | 1.3% |
| image | 14 | 0.7% |
| video | 1 | 0.0% |

---

## Evolução por Funcionalidade ao Longo do Tempo

> Número de conversas iniciadas por mês em cada funcionalidade.

| Mês | Áudio | Redação de Evolução | Chat Clínico Geral | Envio de Arquivo | Busca de Artigos |
|:----|:--:|:--:|:--:|:--:|:--:|
| 2025-08 | 3 | 0 | 0 | 0 | 0 |
| 2025-09 | 6 | 1 | 2 | 1 | 0 |
| 2025-10 | 2 | 1 | 0 | 1 | 0 |
| 2025-11 | 3 | 4 | 2 | 1 | 1 |
| 2025-12 | 1 | 6 | 1 | 2 | 0 |
| 2026-01 | 1 | 1 | 0 | 1 | 0 |
| 2026-02 | 0 | 0 | 1 | 0 | 0 |
| 2026-03 | 3 | 1 | 0 | 1 | 0 |
| 2026-05 | 0 | 2 | 1 | 0 | 1 |

---

## Volume Mensal de Mensagens

| Mês | Mensagens | Usuários Ativos |
|:----|----------:|----------------:|
| 2025-08 | 133 | 3 |
| 2025-09 | 151 | 12 |
| 2025-10 | 319 | 14 |
| 2025-11 | 161 | 14 |
| 2025-12 | 502 | 18 |
| 2026-01 | 185 | 15 |
| 2026-02 | 130 | 9 |
| 2026-03 | 219 | 14 |
| 2026-04 | 93 | 8 |
| 2026-05 | 133 | 8 |

```
Volume mensal:
2025-08  ██████░░░░░░░░░░░░░░░░░░  133
2025-09  ███████░░░░░░░░░░░░░░░░░  151
2025-10  ███████████████░░░░░░░░░  319
2025-11  ████████░░░░░░░░░░░░░░░░  161
2025-12  ████████████████████████  502
2026-01  █████████░░░░░░░░░░░░░░░  185
2026-02  ██████░░░░░░░░░░░░░░░░░░  130
2026-03  ██████████░░░░░░░░░░░░░░  219
2026-04  ████░░░░░░░░░░░░░░░░░░░░  93
2026-05  ██████░░░░░░░░░░░░░░░░░░  133
```

---

## Metodologia

Cada conversa (thread) foi classificada em uma única funcionalidade usando a seguinte hierarquia de prioridade:

1. **Áudio / Transcrição** — presença de mensagem com `type = 'audio'`
2. **Envio de Arquivo** — `type IN ('document', 'image', 'video')`
3. **Redação de Evolução** — keywords: evolução, anamnese, prontuário, nota de, sessão
4. **Busca de Artigos** — keywords: artigo, pesquisa, literatura, DSM, CID, referência
5. **Cálculo Tributário** — keywords: imposto, tributário, simples nacional, MEI, INSS, faturamento
6. **Marketing / Conteúdo** — keywords: marketing, instagram, redes sociais, captação, legenda, post
7. **Chat Clínico Geral** — todas as conversas não classificadas acima

**Limitação:** keywords podem ter falsos positivos (ex: "pesquisa" num contexto não-acadêmico).
Para rastreamento preciso, recomenda-se adicionar campo `"feature"` ao metadata em `dispatch-message`.

---

*Gerado automaticamente por `scripts/analyze-features.mjs`*
