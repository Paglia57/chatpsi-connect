// Análise de funcionalidades mais usadas no ChatPsi Connect.
// Classifica cada conversa por funcionalidade via correspondência de keywords no conteúdo
// das mensagens — todo o processamento ocorre em SQL no banco; nenhum texto é exibido.
//
// Uso: node scripts/analyze-features.mjs
//      (executar a partir do diretório chatpsi-connect/)

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID ?? 'rrdvivxdasezvhfbetra';
const PAT        = process.env.SUPABASE_PAT;
const API        = `https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`;

if (!PAT) {
  throw new Error('Defina a variável de ambiente SUPABASE_PAT (access token do Supabase) antes de rodar este script.');
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function sql(query) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase API ${res.status}: ${body}`);
  }
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data.error) throw new Error(String(data.error.message ?? data.error));
  return data.result ?? data.data ?? [];
}

function hr(title) {
  console.log(`\n${'─'.repeat(62)}\n  ${title}\n${'─'.repeat(62)}`);
}

function printTable(rows) {
  if (!rows?.length) { console.log('  (vazio)'); return; }
  const keys = Object.keys(rows[0]);
  const w = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)));
  console.log('  ' + keys.map((k, i) => k.padEnd(w[i])).join(' │ '));
  console.log('  ' + w.map(n => '─'.repeat(n)).join('─┼─'));
  for (const r of rows)
    console.log('  ' + keys.map((k, i) => String(r[k] ?? '').padEnd(w[i])).join(' │ '));
}

function asciiBar(value, max, width = 24) {
  const n = Math.round((Number(value) / max) * width);
  return '█'.repeat(Math.max(n, 0)) + '░'.repeat(Math.max(width - n, 0));
}

// ─── SQL reutilizável: CTE de classificação por thread ───────────────────────
//
// Prioridade: Áudio > Arquivo > Redação de Evolução > Busca de Artigos >
//             Cálculo Tributário > Marketing > Chat Geral
//
const CLASSIFIED_CTE = `
WITH classified AS (
  SELECT
    thread_id,
    CASE
      WHEN bool_or(type = 'audio')
        THEN 'Áudio / Transcrição'
      WHEN bool_or(type IN ('document','image','video'))
        THEN 'Envio de Arquivo'
      WHEN bool_or(
        lower(content) LIKE '%evolução%'   OR lower(content) LIKE '%evolucao%' OR
        lower(content) LIKE '%anamnese%'   OR lower(content) LIKE '%prontuário%' OR
        lower(content) LIKE '%prontuario%' OR lower(content) LIKE '%nota de%' OR
        lower(content) LIKE '%sessão%'     OR lower(content) LIKE '%sessao%' OR
        lower(content) LIKE '%relat%clín%' OR lower(content) LIKE '%relat%clin%' OR
        lower(content) LIKE '%registro%clín%'
      ) THEN 'Redação de Evolução'
      WHEN bool_or(
        lower(content) LIKE '%artigo%'     OR lower(content) LIKE '%pesquisa%' OR
        lower(content) LIKE '%literatura%' OR lower(content) LIKE '% dsm%' OR
        lower(content) LIKE '%referência%' OR lower(content) LIKE '%referencia%' OR
        lower(content) LIKE '% cid %'      OR lower(content) LIKE '%publicação%' OR
        lower(content) LIKE '%publicacao%'
      ) THEN 'Busca de Artigos'
      WHEN bool_or(
        lower(content) LIKE '%imposto%'         OR lower(content) LIKE '%tributário%' OR
        lower(content) LIKE '%tributario%'      OR lower(content) LIKE '%simples nacional%' OR
        lower(content) LIKE '% mei %'           OR lower(content) LIKE '% pj %' OR
        lower(content) LIKE '%inss%'            OR lower(content) LIKE '%faturamento%' OR
        lower(content) LIKE '%nota fiscal%'     OR lower(content) LIKE '%irpf%' OR
        lower(content) LIKE '%receita federal%'
      ) THEN 'Cálculo Tributário'
      WHEN bool_or(
        lower(content) LIKE '%marketing%'    OR lower(content) LIKE '%instagram%' OR
        lower(content) LIKE '%redes sociais%' OR lower(content) LIKE '%captação%' OR
        lower(content) LIKE '%captacao%'     OR lower(content) LIKE '%legenda%' OR
        lower(content) LIKE '%conteúdo digital%' OR lower(content) LIKE '%divulgação%' OR
        lower(content) LIKE '%post%'
      ) THEN 'Marketing / Conteúdo'
      ELSE 'Chat Clínico Geral'
    END AS funcionalidade,
    count(*)         AS msgs,
    min(created_at)  AS iniciado_em
  FROM messages
  WHERE is_deleted = false
  GROUP BY thread_id
)`;

// ── PASSO 1: Totais ──────────────────────────────────────────────────────────

hr('PASSO 1 · Totais gerais');

const [totals] = await sql(`
  SELECT
    count(*)                                    AS total_mensagens,
    count(*) FILTER (WHERE is_deleted = false)  AS ativas,
    count(DISTINCT user_id)                     AS usuarios_unicos,
    count(DISTINCT thread_id)                   AS threads_unicos,
    min(created_at)::date                       AS primeira_em,
    max(created_at)::date                       AS ultima_em
  FROM messages
`);

console.log(`\n  Mensagens : ${totals.total_mensagens} (${totals.ativas} ativas)`);
console.log(`  Usuários  : ${totals.usuarios_unicos}`);
console.log(`  Threads   : ${totals.threads_unicos}`);
console.log(`  Período   : ${totals.primeira_em} → ${totals.ultima_em}`);

// ── PASSO 2: Validação de cobertura dos keywords ──────────────────────────────

hr('PASSO 2 · Cobertura dos keywords (mensagens do usuário)');

const coverage = await sql(`
  SELECT categoria, matches, round(100.0 * matches / total, 1) AS pct_de_msgs_user
  FROM (
    SELECT 'Redação de Evolução' AS categoria,
           count(*) FILTER (WHERE
             lower(content) LIKE '%evolução%'   OR lower(content) LIKE '%evolucao%' OR
             lower(content) LIKE '%anamnese%'   OR lower(content) LIKE '%prontuário%' OR
             lower(content) LIKE '%nota de%'    OR lower(content) LIKE '%sessão%' OR
             lower(content) LIKE '%sessao%'
           ) AS matches,
           count(*) AS total
      FROM messages WHERE sender = 'user' AND is_deleted = false
    UNION ALL
    SELECT 'Busca de Artigos',
           count(*) FILTER (WHERE
             lower(content) LIKE '%artigo%'     OR lower(content) LIKE '%pesquisa%' OR
             lower(content) LIKE '%literatura%' OR lower(content) LIKE '% dsm%' OR
             lower(content) LIKE '%referência%' OR lower(content) LIKE '% cid %'
           ),
           count(*) FROM messages WHERE sender = 'user' AND is_deleted = false
    UNION ALL
    SELECT 'Cálculo Tributário',
           count(*) FILTER (WHERE
             lower(content) LIKE '%imposto%'         OR lower(content) LIKE '%tributário%' OR
             lower(content) LIKE '%simples nacional%' OR lower(content) LIKE '% mei %' OR
             lower(content) LIKE '%inss%'            OR lower(content) LIKE '%faturamento%'
           ),
           count(*) FROM messages WHERE sender = 'user' AND is_deleted = false
    UNION ALL
    SELECT 'Marketing / Conteúdo',
           count(*) FILTER (WHERE
             lower(content) LIKE '%marketing%'    OR lower(content) LIKE '%instagram%' OR
             lower(content) LIKE '%redes sociais%' OR lower(content) LIKE '%captação%' OR
             lower(content) LIKE '%legenda%'       OR lower(content) LIKE '%post%'
           ),
           count(*) FROM messages WHERE sender = 'user' AND is_deleted = false
  ) t
  ORDER BY matches DESC
`);

console.log('\nQuantas mensagens de usuário contêm keywords de cada categoria:');
printTable(coverage);

// ── PASSO 3: Distribuição de funcionalidades por thread ───────────────────────

hr('PASSO 3 · Ranking de funcionalidades (nível de conversa)');

const featureDist = await sql(`
  ${CLASSIFIED_CTE}
  SELECT
    funcionalidade,
    count(*) AS threads,
    sum(msgs) AS mensagens,
    round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
    round(avg(msgs), 1) AS media_msgs_thread
  FROM classified
  GROUP BY funcionalidade
  ORDER BY threads DESC
`);

printTable(featureDist);

// ── PASSO 4: Distribuição por tipo de mídia ──────────────────────────────────

hr('PASSO 4 · Tipo de mídia e remetente');

const typeDist = await sql(`
  SELECT type AS tipo, count(*) AS total,
         round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
  FROM messages WHERE is_deleted = false
  GROUP BY type ORDER BY total DESC
`);
console.log('\nTipo de mídia:');
printTable(typeDist);

const senderDist = await sql(`
  SELECT sender, count(*) AS total,
         round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
  FROM messages WHERE is_deleted = false
  GROUP BY sender ORDER BY total DESC
`);
console.log('\nRemetente:');
printTable(senderDist);

// ── PASSO 5: Evolução temporal por funcionalidade ────────────────────────────

hr('PASSO 5 · Evolução temporal por funcionalidade');

const temporal = await sql(`
  ${CLASSIFIED_CTE}
  SELECT
    to_char(iniciado_em, 'YYYY-MM') AS mes,
    funcionalidade,
    count(*) AS threads
  FROM classified
  GROUP BY mes, funcionalidade
  ORDER BY mes, threads DESC
`);
printTable(temporal);

const monthly = await sql(`
  SELECT
    to_char(created_at, 'YYYY-MM') AS mes,
    count(*) AS mensagens,
    count(DISTINCT user_id) AS usuarios_ativos
  FROM messages
  WHERE is_deleted = false
  GROUP BY mes ORDER BY mes
`);
console.log('\nVolume mensal total:');
printTable(monthly);

// ── PASSO 6: Relatório Markdown ──────────────────────────────────────────────

hr('PASSO 6 · Gerando relatório');

const today   = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
const maxF    = Math.max(...featureDist.map(r => Number(r.threads)));
const maxM    = Math.max(...monthly.map(r => Number(r.mensagens)));

// Pivot temporal: features × meses
const months = [...new Set(temporal.map(r => r.mes))].sort();
const features = featureDist.map(r => r.funcionalidade);
const pivot = {};
for (const r of temporal) {
  if (!pivot[r.mes]) pivot[r.mes] = {};
  pivot[r.mes][r.funcionalidade] = r.threads;
}

let md = `# Relatório de Funcionalidades — ChatPsi Connect

> **Gerado em:** ${today}
> **Fonte:** Supabase · tabela \`messages\` · projeto \`${PROJECT_ID}\`
> **Método:** Classificação por keywords no conteúdo das mensagens (SQL)
> **Privacidade:** nenhum conteúdo de mensagem nem dado pessoal identificável neste documento

---

## Sumário Executivo

- **${totals.total_mensagens} mensagens** em **${totals.threads_unicos} conversas** de **${totals.usuarios_unicos} usuários únicos**
- Período: **${totals.primeira_em}** → **${totals.ultima_em}**
- Funcionalidade mais usada: **${featureDist[0]?.funcionalidade ?? '—'}** com **${featureDist[0]?.pct ?? '—'}%** das conversas

---

## Ranking de Funcionalidades

> Classificação ao nível de conversa (thread). Cada conversa é atribuída a uma única
> funcionalidade com base em palavras-chave identificadas nas mensagens.

| # | Funcionalidade | Conversas | Mensagens | % | Média msgs | Distribuição |
|--:|:---------------|----------:|----------:|--:|-----------:|:-------------|
`;

featureDist.forEach((r, i) => {
  const b = asciiBar(r.threads, maxF);
  md += `| ${i + 1} | ${r.funcionalidade} | ${r.threads} | ${r.mensagens} | ${r.pct}% | ${r.media_msgs_thread} | \`${b}\` |\n`;
});

md += `
---

## Cobertura dos Keywords

> Quantidade de mensagens do usuário que contêm palavras-chave de cada categoria.
> Usado para validar que as regras de classificação capturam o volume esperado.

| Categoria | Matches | % de msgs do usuário |
|:----------|--------:|---------------------:|
`;
coverage.forEach(r => { md += `| ${r.categoria} | ${r.matches} | ${r.pct_de_msgs_user}% |\n`; });

md += `
---

## Distribuição por Tipo de Mídia

| Tipo | Mensagens | % |
|:-----|----------:|--:|
`;
typeDist.forEach(r => { md += `| ${r.tipo} | ${r.total} | ${r.pct}% |\n`; });

md += `
---

## Evolução por Funcionalidade ao Longo do Tempo

> Número de conversas iniciadas por mês em cada funcionalidade.

| Mês |`;
for (const f of features) md += ` ${f.split('/')[0].trim()} |`;
md += '\n|:----|';
for (const f of features) md += ':--:|';
md += '\n';

for (const m of months) {
  md += `| ${m} |`;
  for (const f of features) md += ` ${pivot[m]?.[f] ?? 0} |`;
  md += '\n';
}

md += `
---

## Volume Mensal de Mensagens

| Mês | Mensagens | Usuários Ativos |
|:----|----------:|----------------:|
`;
monthly.forEach(r => { md += `| ${r.mes} | ${r.mensagens} | ${r.usuarios_ativos} |\n`; });

md += `
\`\`\`
Volume mensal:
`;
monthly.forEach(r => {
  const b = asciiBar(r.mensagens, maxM);
  md += `${r.mes}  ${b}  ${r.mensagens}\n`;
});
md += `\`\`\`

---

## Metodologia

Cada conversa (thread) foi classificada em uma única funcionalidade usando a seguinte hierarquia de prioridade:

1. **Áudio / Transcrição** — presença de mensagem com \`type = 'audio'\`
2. **Envio de Arquivo** — \`type IN ('document', 'image', 'video')\`
3. **Redação de Evolução** — keywords: evolução, anamnese, prontuário, nota de, sessão
4. **Busca de Artigos** — keywords: artigo, pesquisa, literatura, DSM, CID, referência
5. **Cálculo Tributário** — keywords: imposto, tributário, simples nacional, MEI, INSS, faturamento
6. **Marketing / Conteúdo** — keywords: marketing, instagram, redes sociais, captação, legenda, post
7. **Chat Clínico Geral** — todas as conversas não classificadas acima

**Limitação:** keywords podem ter falsos positivos (ex: "pesquisa" num contexto não-acadêmico).
Para rastreamento preciso, recomenda-se adicionar campo \`"feature"\` ao metadata em \`dispatch-message\`.

---

*Gerado automaticamente por \`scripts/analyze-features.mjs\`*
`;

if (!existsSync(join(ROOT, 'docs'))) mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', 'feature-analysis-report.md'), md, 'utf-8');
console.log('\n✅  Relatório salvo em docs/feature-analysis-report.md\n');
