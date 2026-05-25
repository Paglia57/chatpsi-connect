# Relatório de Auditoria LGPD + Plano de Implementação — ChatPsi

**Data**: 2026-05-25
**Auditor**: Claude Code (assistente IA) — revisão humana obrigatória antes de qualquer ação
**Branch / commit auditados**: `main` @ `11de126`
**Versão da LGPD**: Lei 13.709/2018 c/ alterações da Lei 13.853/2019
**Regulamentações ANPD aplicáveis**: Res. 1/2021, 2/2022, 4/2023, **15/2024** (incidentes), **18/2024** (encarregado), **19/2024** (transferência internacional), 23/2024, 31/2025
**Metodologia**: 11 fases do `audit-lgpd-full.md`; severidade elevada em 1 nível por se tratar de **dados sensíveis de saúde mental** (Art. 11)

> ⚠️ **Documento técnico**. Não substitui parecer jurídico. Antes de executar correções com impacto em produção (rotação de chaves, mudança de provedor, publicação de política de privacidade), valide com advogado especialista em LGPD.

---

## 1. Sumário Executivo

### Achados por severidade

| Severidade | Quantidade |
|---|---|
| 🔴 CRÍTICO | **4** |
| 🟠 ALTO | **6** |
| 🟡 MÉDIO | **5** |
| 🟢 BAIXO | **2** |
| **Total** | **17** |

- **Score de conformidade estimado**: **38 / 100** (faixa "Inadequado — requer remediação imediata")
- **Risco residual**: ❌ **Inaceitável** no estado atual
- **Próxima auditoria recomendada**: após Sprint 1 (≤ 7 dias) para reaferir CRÍTICOS

### Top 5 ações mais urgentes

1. 🔴 **Iniciar processo de SCC/DPA com OpenAI** — você está em violação ativa do Art. 33 desde 23/08/2025 por enviar áudios de sessões clínicas e prontuários ao Whisper/Assistants nos EUA sem cláusulas-padrão (AUD-LGPD-001)
2. 🔴 **Designar Encarregado/DPO e publicar contato** (AUD-LGPD-004) — Art. 41 + Res. 18/2024
3. 🔴 **Publicar Política de Privacidade pública + aviso no momento da coleta** (AUD-LGPD-002) — Art. 9º
4. 🔴 **Formalizar contrato de operador (DPA) com Supabase** (AUD-LGPD-003) — Art. 39
5. 🟠 **Iniciar RoPA** (AUD-LGPD-005) — Art. 37 — base para todo o resto

---

## 2. Escopo

- **Repositório**: `chatpsi-connect` (`https://github.com/Paglia57/chatpsi-connect`)
- **Branch / commit**: `main` @ `11de126`
- **Stack**: React 18 + TypeScript + Vite 5 + Supabase (Postgres + Auth + Storage + Edge Functions Deno) + OpenAI Assistants API v2 + Whisper
- **Papel jurídico assumido**: **Controlador** (decide finalidades e meios). Pode também ser **Operador** em relação aos pacientes do psicólogo assinante (a definir contratualmente)
- **Tipos de dados pessoais tratados**:
  - ☑ Dados comuns (Art. 5º, I) — email, telefone, dados de assinatura do profissional
  - ☑ **Dados sensíveis (Art. 5º, II) — saúde mental**: prontuários (`evolutions.output_content`), sintomas, CID-10, DSM-5, medicação (`patients.cid_10`, `dsm_5`, `medication`, `main_complaint`), áudios de sessões transcritos (`evolutions.audio_url`), conteúdo de conversas clínicas com IA (`messages.content`, `revision_history`)
  - ⚠ **Possivelmente dados de adolescentes** (Art. 14) — psicólogos atendem menores; sem segregação visível no schema
- **Volume estimado de titulares**: `[REVISAR — não declarado]`
- **Faturamento anual**: `[REVISAR — define se aplica regime simplificado da Res. 2/2022]`

---

## 3. Bases legais identificadas e necessárias

| Finalidade | Base legal sugerida | Categoria | Operações | Retenção sugerida |
|---|---|---|---|---|
| Cadastro do psicólogo assinante | Art. 7º, V (execução de contrato) | Comum | CRUD `profiles` | Contrato + 5 anos (CDC) |
| Gestão de prontuário do paciente | **Art. 11, II, "a" (tutela da saúde por profissional habilitado)** | **Sensível** | CRUD `evolutions`, `patients` | **20 anos** após última consulta (Res. CFP 001/2009) |
| Transcrição de áudio (Whisper) | Art. 11, II, "a" + necessidade (Art. 6º, III) | **Sensível** | Envio para OpenAI EUA | Não persistir áudio bruto |
| Chat clínico com IA (`messages`) | Art. 11, II, "a" | **Sensível** | INSERT/SELECT | Política a definir — sugerir 5 anos |
| Marketing/comunicações comerciais | Art. 7º, I (consentimento) | Comum | Email/WhatsApp | Até revogação |
| Cookies analíticos | Art. 7º, I (consentimento) | Comum | Tracking | 12 meses |
| Logs de auditoria | Art. 7º, II (cumprimento de obrigação legal) ou IX (legítimo interesse) | Comum | Append-only | 5 anos |

> Atualmente **nenhuma dessas bases legais está formalmente documentada** no projeto. RoPA pendente.

---

## 4. Achados detalhados

### 🔴 CRÍTICOS

```yaml
id: AUD-LGPD-001
severidade: CRÍTICO
arquivo: supabase/functions/generate-evolution/index.ts, supabase/functions/improve-evolution/index.ts, supabase/functions/dispatch-message/index.ts
linha: várias (chamadas para api.openai.com)
descricao: |
  O projeto envia DADOS SENSÍVEIS DE SAÚDE (áudios de sessões terapêuticas
  transcritos pelo Whisper, conteúdo clínico para reescrita pelo Chat
  Completions, e histórico clínico persistido em threads OpenAI por
  paciente) para servidores da OpenAI nos EUA. Não há SCC/DPA assinada
  documentada no repositório.
  A Resolução CD/ANPD 19/2024 entrou em vigor em 23/08/2025 SEM período
  de graça. Toda transferência internacional posterior sem uma das
  hipóteses do Art. 33 é violação.
artigo_LGPD: Art. 33 (transferência internacional) + Art. 11 (dados sensíveis)
regulamentacao_ANPD: Resolução CD/ANPD 19/2024
estrategia_Hoepman: SEPARATE + DEMONSTRATE
snippet_violador: |
  // supabase/functions/generate-evolution/index.ts
  const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", { ... });
  // áudio cru de sessão clínica vai pros EUA sem SCC documentada
snippet_correto: |
  // 1. Contratar OpenAI Enterprise (oferece DPA + ZDR — zero data retention)
  // 2. Anexar SCC da Res. 19/2024 ao DPA
  // 3. Documentar transferência no RoPA
  // 4. Considerar alternativa nacional: Azure OpenAI região Brasil South
  //    ou modelos rodando em infra própria (Whisper local)
remediacao_passo_a_passo:
  - 1. Contratar OpenAI Enterprise (planos pessoais NÃO oferecem DPA suficiente)
  - 2. Solicitar DPA + ZDR (Zero Data Retention) — fundamental para saúde
  - 3. Anexar Cláusulas-Padrão Contratuais da Resolução 19/2024 ao DPA
  - 4. Avaliar alternativa: Azure OpenAI Service na região Brazil South (mesmas APIs, dados em SP)
  - 5. Documentar a transferência no RoPA com finalidade, salvaguardas e tempo
  - 6. Atualizar Política de Privacidade declarando a transferência
  - 7. Consentimento específico do titular se a transferência não couber em outra hipótese
responsavel_sugerido: DPO + Tech Lead + Jurídico
prazo_recomendado: 7d (iniciar processo) / 30d (assinar) / 60d (migrar se opção for Azure BR)
```

```yaml
id: AUD-LGPD-002
severidade: CRÍTICO
arquivo: (ausente em todo o projeto)
linha: N/A
descricao: |
  O projeto NÃO possui Política de Privacidade pública, Termos de Uso,
  nem Aviso de Privacidade exibido no momento da coleta. Grep por
  "privacidade|privacy|termos|LGPD|cookie" em src/ retorna apenas
  componentes UI (sidebar, breadcrumb) — nenhuma página, modal ou link
  para documento legal.
  O Art. 9º exige transparência sobre tratamento, com informações claras
  ao titular no momento da coleta.
artigo_LGPD: Art. 9º (transparência) + Art. 6º, VI (transparência como princípio)
regulamentacao_ANPD: Guia ANPD de Política de Privacidade
estrategia_Hoepman: INFORM
snippet_violador: |
  // src/pages/AuthCallbackPage.tsx (cadastro novo)
  // → nenhum link/aviso para Política de Privacidade ou Termos no signup
snippet_correto: |
  // 1. Página /politica-de-privacidade pública (rota não-autenticada)
  // 2. Checkbox obrigatório no signup:
  //    "Li e aceito a [Política de Privacidade] e os [Termos de Uso]"
  // 3. Aviso em destaque no primeiro uso de cada feature que coleta dado
  //    sensível (ex.: ao gerar primeira evolução clínica)
remediacao_passo_a_passo:
  - 1. Redigir Política de Privacidade (usar template `.claude/templates/privacy-policy-template.md` do framework)
  - 2. Validar com jurídico
  - 3. Publicar em /politica-de-privacidade e /termos
  - 4. Link visível no rodapé + sidebar + login + signup
  - 5. Checkbox no signup com versão da política aceita (registrar `policy_version_accepted`, `accepted_at`)
  - 6. Aviso contextual ao gerar primeira evolução (Art. 9º — "informações claras no momento da coleta")
responsavel_sugerido: DPO + Jurídico + Frontend
prazo_recomendado: 30d
```

```yaml
id: AUD-LGPD-003
severidade: CRÍTICO
arquivo: (contratual — não está no código)
linha: N/A
descricao: |
  Não há registro no repositório (READMEs, docs, anexos) de contrato
  de operador formal com Supabase nem OpenAI, conforme exigido pelo
  Art. 39 — todo controlador DEVE garantir cláusulas LGPD com seus
  operadores.
  Supabase oferece DPA gratuito (https://supabase.com/legal/dpa).
  OpenAI Enterprise oferece DPA; planos pessoais NÃO oferecem garantias
  suficientes para dado clínico.
artigo_LGPD: Art. 39 (operador) + Art. 5º, VII (definição de operador)
regulamentacao_ANPD: Guia ANPD de Agentes de Tratamento
estrategia_Hoepman: DEMONSTRATE + ENFORCE
snippet_violador: |
  N/A — ausência documental
snippet_correto: |
  docs/lgpd/contratos/
    ├── DPA-supabase-assinado-YYYY-MM-DD.pdf
    ├── DPA-openai-assinado-YYYY-MM-DD.pdf
    └── lista-operadores.md  (mantida atualizada)
remediacao_passo_a_passo:
  - 1. Solicitar e assinar DPA da Supabase (https://supabase.com/legal/dpa — gratuito)
  - 2. Confirmar região do projeto (preferir sa-east-1 / São Paulo)
  - 3. Migrar para OpenAI Enterprise e assinar DPA + SCC
  - 4. Listar todos os operadores em docs/lgpd/operadores.md
  - 5. Reauditar quando integrar novo provedor (Stripe, SendGrid, etc.)
responsavel_sugerido: DPO + Jurídico
prazo_recomendado: 30d
```

```yaml
id: AUD-LGPD-004
severidade: CRÍTICO  # elevado de ALTO devido a dado sensível de saúde
arquivo: (ausente — não há designação documental)
linha: N/A
descricao: |
  Não há Encarregado/DPO designado publicamente. Art. 41 obriga a
  designação E a publicação do contato (nome, e-mail) de forma clara
  e acessível, em conformidade com a Resolução CD/ANPD 18/2024.
  Para SaaS de saúde, ausência de DPO é prioridade máxima de
  fiscalização ANPD.
artigo_LGPD: Art. 41 (encarregado) + §§ 1º, 2º, 3º
regulamentacao_ANPD: Resolução CD/ANPD 18/2024 (atribuições e divulgação)
estrategia_Hoepman: DEMONSTRATE + INFORM
snippet_violador: |
  // Rodapé do site — nenhuma menção a "Encarregado" ou "DPO"
snippet_correto: |
  // Rodapé global:
  // Encarregado de Proteção de Dados (DPO): Nome — dpo@chatpsi.com.br
  // (Política de Privacidade) (Termos) (Direitos do Titular)
remediacao_passo_a_passo:
  - 1. Designar DPO (interno OU consultoria externa especializada em saúde digital)
  - 2. Registrar designação por ato formal (ata, contrato)
  - 3. Publicar nome + e-mail no rodapé do site e na Política de Privacidade
  - 4. Criar canal de comunicação (e-mail dedicado dpo@... e formulário no portal de direitos)
  - 5. Estabelecer SLA interno de resposta (15 dias por padrão — Art. 19, II)
responsavel_sugerido: Sócios + Jurídico
prazo_recomendado: 7d (designar) / 14d (publicar)
```

### 🟠 ALTOS

```yaml
id: AUD-LGPD-005
severidade: ALTO
arquivo: (ausente — docs/lgpd/ropa.md não existe)
descricao: |
  Sem Registro de Operações de Tratamento (RoPA). Art. 37 obriga
  o controlador a manter registro detalhado das operações.
  Pode ser solicitado pela ANPD a qualquer momento; ausência é
  evidência de descumprimento sistêmico.
artigo_LGPD: Art. 37
regulamentacao_ANPD: Guia ANPD para Elaboração de Relatório de Impacto
estrategia_Hoepman: DEMONSTRATE
remediacao_passo_a_passo:
  - 1. Mapear PII (rodar /audit-data-mapping do framework ou manual)
  - 2. Preencher template ropa-template.md do framework
  - 3. Detalhar cada finalidade: dados envolvidos, base legal, prazo, compartilhamentos
  - 4. Atualização contínua: incluir RoPA em DoD de nova feature que toque dado pessoal
responsavel_sugerido: DPO + Tech Lead
prazo_recomendado: 30d
```

```yaml
id: AUD-LGPD-006
severidade: ALTO
arquivo: supabase/functions/generate-evolution/index.ts, improve-evolution/index.ts
descricao: |
  O tratamento de áudios de sessões clínicas + uso de IA generativa
  para redação automatizada de prontuários é "tratamento de alto
  risco" por definição (dado sensível + decisão automatizada + grande
  volume). Art. 38 faculta à ANPD exigir Relatório de Impacto à
  Proteção de Dados (RIPD); melhores práticas mandam fazer
  proativamente.
artigo_LGPD: Art. 38 + Art. 20 (decisões automatizadas)
regulamentacao_ANPD: Guia ANPD de RIPD (em consulta pública 2025)
estrategia_Hoepman: DEMONSTRATE + MINIMISE
remediacao_passo_a_passo:
  - 1. Usar template ripd-template.md do framework
  - 2. Identificar fluxos: gravação → transcrição → geração → revisão
  - 3. Avaliar riscos: reidentificação, deriva do modelo, viés clínico, vazamento
  - 4. Documentar salvaguardas: pseudonimização (iniciais), criptografia em trânsito, supervisão humana obrigatória
  - 5. Garantir direito a revisão humana (Art. 20) — o psicólogo SEMPRE revê antes de salvar (já é o caso, documentar)
responsavel_sugerido: DPO + Tech Lead + Psicólogo Consultor
prazo_recomendado: 60d
```

```yaml
id: AUD-LGPD-007
severidade: ALTO
arquivo: (ausente — sem rota /direitos-do-titular)
descricao: |
  Não há portal/endpoint cobrindo os 9 direitos do Art. 18:
  confirmação, acesso, correção, anonimização/bloqueio/eliminação,
  portabilidade, eliminação dos dados consentidos, informação sobre
  compartilhamentos, informação sobre não consentir, revogação do
  consentimento.
  SLA de 15 dias (Art. 19, II) não tem fila/worker que garanta cumprimento.
artigo_LGPD: Art. 18 + Art. 19 (SLA 15 dias) + Art. 8º, §5º (revogação)
regulamentacao_ANPD: -
estrategia_Hoepman: CONTROL + ENFORCE
remediacao_passo_a_passo:
  - 1. Criar rota /direitos-do-titular (autenticada para titulares; formulário público para terceiros)
  - 2. Implementar UI para cada um dos 9 direitos
  - 3. Endpoint POST /api/dsr (Data Subject Request) que cria ticket na tabela `dsr_requests`
  - 4. Worker que envia notificação ao DPO e marca prazo de 15 dias
  - 5. "Exportar meus dados" (Art. 18, II e V) — gerar JSON/PDF com tudo do titular
  - 6. "Excluir minha conta" (Art. 18, VI) — fluxo separado de soft delete vs hard delete
  - 7. Documentar política de retenção que sobreescreve eliminação (ex.: prontuário CFP 20 anos)
responsavel_sugerido: Frontend + Backend + DPO
prazo_recomendado: 60-90d
```

```yaml
id: AUD-LGPD-008
severidade: ALTO
arquivo: index.html, src/App.tsx
descricao: |
  Não há banner de cookies / Consent Mode v2 / mecanismo de
  revogação. Embora o site atualmente não use SDKs de tracking
  (bom!), cookies de sessão e localStorage de autenticação Supabase
  ainda precisam ser informados.
  Quando integrar Stripe, Sentry ou similar, isso vira CRÍTICO.
artigo_LGPD: Art. 8º, §5º (revogação tão simples quanto a concessão) + Art. 9º
regulamentacao_ANPD: Guia ANPD de Cookies (em revisão 2025)
estrategia_Hoepman: CONTROL + INFORM
remediacao_passo_a_passo:
  - 1. Implementar banner com 3 botões: "Aceitar todos", "Rejeitar não-essenciais", "Personalizar" (mesma proeminência)
  - 2. Cookies estritamente necessários (auth Supabase) podem ser carregados sem consentimento — documentar
  - 3. Quando integrar tracking futuro: bloquear scripts até consentimento (Google Consent Mode v2 default 'denied')
  - 4. Rota /preferencias-de-cookies acessível a qualquer momento (revogação)
  - 5. Registrar consentimento em `consent_logs` (versão, timestamp, IP/UA, escolhas)
responsavel_sugerido: Frontend + DPO
prazo_recomendado: 30d
```

```yaml
id: AUD-LGPD-009
severidade: ALTO
arquivo: (ausente — sem playbook documentado)
descricao: |
  Não há Plano de Resposta a Incidentes. Resolução CD/ANPD 15/2024
  exige comunicação à ANPD e aos titulares em até 3 DIAS ÚTEIS após
  o controlador tomar conhecimento de incidente "que possa acarretar
  risco ou dano relevante".
  Sem playbook, o prazo é praticamente impossível de cumprir.
artigo_LGPD: Art. 48 + Art. 46 (segurança)
regulamentacao_ANPD: Resolução CD/ANPD 15/2024
estrategia_Hoepman: ENFORCE + DEMONSTRATE
remediacao_passo_a_passo:
  - 1. Usar template incident-response-playbook.md do framework
  - 2. Definir matriz de classificação (baixo/médio/alto/crítico) com gatilhos automáticos
  - 3. Designar equipe de resposta (DPO, Tech Lead, Comunicação)
  - 4. Configurar alertas no Supabase Logs + Edge Functions Logs para padrões anômalos
  - 5. Modelo de comunicação à ANPD pronto (formulário do site da ANPD)
  - 6. Modelo de comunicação ao titular (e-mail) pronto
  - 7. Tabela `incident_log` para registrar TODOS os incidentes (mesmo os sem comunicação obrigatória)
  - 8. Testar com simulação trimestral (tabletop exercise)
responsavel_sugerido: DPO + Tech Lead + Comunicação
prazo_recomendado: 30d
```

```yaml
id: AUD-LGPD-010
severidade: ALTO
arquivo: supabase/functions/*/index.ts (87 ocorrências em 9 funções)
linha: várias
descricao: |
  87 chamadas a console.log/info/error em edge functions de produção.
  Logs do Supabase Edge Functions são persistidos e indexados; expor
  identificadores como openai_thread_id, threadId, user_id em logs
  facilita correlação de tráfego e PII.
  Exemplo já encontrado:
    generate-evolution/index.ts:197 → console.log("Adding message to thread:", patient.openai_thread_id);
    dispatch-message/index.ts:318 → console.log('Sending message to thread:', threadId, ...);
  Frontend usa logger.ts seguro (bom!), mas backend não.
artigo_LGPD: Art. 46 (segurança) + Art. 6º, VII (segurança como princípio)
regulamentacao_ANPD: -
estrategia_Hoepman: HIDE
snippet_violador: |
  console.log("Adding message to thread:", patient.openai_thread_id);
  console.log("Transcribing audio with Whisper...");
snippet_correto: |
  // Criar supabase/functions/_shared/logger.ts (similar ao src/lib/logger.ts)
  // que sanitize/redact chaves sensíveis e respeite NODE_ENV/DEBUG flag.
  import { logger } from "../_shared/logger.ts";
  logger.info("Thread message attached"); // sem ID exposto
  logger.debug("Whisper start", { bytes: audio.length });
remediacao_passo_a_passo:
  - 1. Criar supabase/functions/_shared/logger.ts (já existe a pasta _shared)
  - 2. Sanitizar: openai_thread_id, user_id, email, content, audio_url, qualquer FK de paciente
  - 3. Substituir os 87 console.* pelo logger
  - 4. Configurar flag de DEBUG via env var (default OFF em produção)
  - 5. Adicionar lint rule para banir console.* em supabase/functions/
responsavel_sugerido: Tech Lead
prazo_recomendado: 14d
```

### 🟡 MÉDIOS

```yaml
id: AUD-LGPD-011
severidade: MÉDIO
arquivo: .env (versionado), .gitignore
descricao: |
  .env está rastreado no git. Atualmente contém SOMENTE chaves
  públicas (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_PROJECT_ID). Anon/publishable key da Supabase é
  pública por design; não há vazamento de secret AGORA.
  Risco: qualquer dev pode adicionar uma secret nova no .env e
  acidentalmente versionar — é só questão de tempo.
artigo_LGPD: Art. 46 (segurança)
estrategia_Hoepman: HIDE
remediacao_passo_a_passo:
  - 1. Criar .env.example com as MESMAS chaves SEM valores (placeholder)
  - 2. Adicionar .env, .env.local, .env.production ao .gitignore
  - 3. git rm --cached .env
  - 4. Commit + push
  - 5. Pre-commit hook ou GitHub Action que bloqueia commits com strings de alta-entropia (gitleaks/trufflehog)
responsavel_sugerido: Tech Lead
prazo_recomendado: 7d
```

```yaml
id: AUD-LGPD-012
severidade: MÉDIO
arquivo: supabase/migrations/20260525120000_add_revision_history_to_evolutions.sql, schema evolutions
descricao: |
  evolutions.revision_history (JSONB) armazena cada prompt + versão
  anterior do prontuário. Pode acumular conteúdo clínico
  indefinidamente. messages.content idem.
  Princípio da necessidade (Art. 6º, III): manter apenas o necessário.
artigo_LGPD: Art. 6º, III (necessidade) + V (qualidade) + Art. 15 (eliminação)
estrategia_Hoepman: MINIMISE
remediacao_passo_a_passo:
  - 1. Definir política de retenção: revisões > N versões antigas são purgadas; ou TTL de X meses
  - 2. Job/cron mensal que executa purge respeitando obrigações de retenção (Res. CFP 001/2009: 20 anos)
  - 3. Documentar política no RoPA e na Política de Privacidade
responsavel_sugerido: Tech Lead + DPO + Psicólogo Consultor
prazo_recomendado: 60d
```

```yaml
id: AUD-LGPD-013
severidade: MÉDIO
arquivo: evolutions.audio_url, Supabase Storage
descricao: |
  evolutions.audio_url referencia áudio em Storage (quando salvo).
  Sem política de retenção/eliminação documentada. Áudio de sessão
  clínica é dado sensível com risco máximo de reidentificação por voz.
  Hoje o framework de melhoria (improve-evolution) NÃO persiste áudio
  — bom — mas o fluxo de geração inicial pode persistir.
artigo_LGPD: Art. 6º, III + Art. 15 + Art. 16
estrategia_Hoepman: MINIMISE + HIDE
remediacao_passo_a_passo:
  - 1. Auditar bucket de Storage: quem tem permissão de leitura?
  - 2. Política Storage: signed URLs com TTL curto, sem listagem pública
  - 3. Definir retenção: idealmente NÃO persistir áudio bruto após transcrição
  - 4. Se persistir, criptografia adicional em repouso (além do AES-256 padrão da Supabase)
  - 5. Job de purge respeitando obrigação CFP
responsavel_sugerido: Tech Lead + DPO
prazo_recomendado: 60d
```

```yaml
id: AUD-LGPD-014
severidade: MÉDIO
arquivo: patients.openai_thread_id, supabase/functions/create-patient-thread/index.ts
descricao: |
  Cada paciente tem uma thread OpenAI que acumula histórico clínico
  indefinidamente. Quando o psicólogo excluir um paciente
  (eliminação Art. 18, VI), a thread permanece no servidor da OpenAI.
  Sem mecanismo automático de purge → vazamento por inação.
artigo_LGPD: Art. 16 + Art. 18, VI
estrategia_Hoepman: MINIMISE + ENFORCE
remediacao_passo_a_passo:
  - 1. Trigger ON DELETE patients que chama edge function delete-patient-thread
  - 2. delete-patient-thread chama DELETE https://api.openai.com/v1/threads/{thread_id}
  - 3. Log de auditoria em incident_log com timestamp e thread_id
  - 4. Documentar no RoPA: tempo entre exclusão do titular e purge da thread
responsavel_sugerido: Tech Lead
prazo_recomendado: 30d
```

```yaml
id: AUD-LGPD-015
severidade: MÉDIO
arquivo: index.html, vite.config.ts, hospedagem (Vercel/Lovable)
descricao: |
  index.html não declara Content-Security-Policy, HSTS,
  X-Frame-Options, Referrer-Policy, Permissions-Policy.
  Cabeçalhos de segurança são parte do Art. 46 (medidas de segurança).
artigo_LGPD: Art. 46
estrategia_Hoepman: HIDE + ENFORCE
remediacao_passo_a_passo:
  - 1. Configurar headers no provedor de hospedagem (Vercel/Netlify/Lovable):
       Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
       Content-Security-Policy: default-src 'self'; ... (revisar para Supabase + OpenAI)
       X-Frame-Options: DENY
       Referrer-Policy: strict-origin-when-cross-origin
       Permissions-Policy: camera=(), microphone=(self), geolocation=()
  - 2. Validar com securityheaders.com (alvo: A+)
  - 3. Documentar exceções (necessárias pra Whisper usar microfone)
responsavel_sugerido: DevOps + Tech Lead
prazo_recomendado: 14d
```

### 🟢 BAIXOS

```yaml
id: AUD-LGPD-016
severidade: BAIXO
arquivo: README.md
descricao: |
  README do projeto não menciona LGPD, base legal, direitos do
  titular, contato do DPO. Documentação básica de governança.
artigo_LGPD: Art. 50 (programa de governança em privacidade)
estrategia_Hoepman: DEMONSTRATE
remediacao_passo_a_passo:
  - 1. Adicionar seção "Privacidade e LGPD" no README com link para Política e contato do DPO
  - 2. Adicionar CONTRIBUTING.md com diretrizes de não-vazamento de PII em PRs
responsavel_sugerido: Tech Lead
prazo_recomendado: 30d
```

```yaml
id: AUD-LGPD-017
severidade: BAIXO
arquivo: (ausente — política de backup não documentada)
descricao: |
  Supabase faz backups automáticos do Postgres (planos pagos),
  mas não há documentação de:
    - frequência de testes de restore
    - retenção de backup
    - quem tem acesso aos backups
    - como backups respondem a pedidos de eliminação (Art. 18, VI)
artigo_LGPD: Art. 46 (princípio de prevenção)
estrategia_Hoepman: DEMONSTRATE
remediacao_passo_a_passo:
  - 1. Documentar política de backup: frequência, retenção, criptografia, acesso
  - 2. Teste de restore semestral (registrar evidência)
  - 3. Política de purge de backup ao receber pedido de eliminação irrevogável
responsavel_sugerido: DevOps + DPO
prazo_recomendado: 90d
```

---

## 5. Pontos positivos (já em conformidade ou caminhando bem)

| Item | Status |
|---|---|
| **Row Level Security (RLS)** habilitado em ~33 tabelas, com policies por `auth.uid()` | ✅ Art. 46 / Hoepman:ENFORCE |
| **Logger seguro** em frontend (`src/lib/logger.ts`) sanitiza `password\|token\|key\|secret\|auth\|session` e só loga em dev | ✅ Art. 46 / Hoepman:HIDE |
| **Supabase Auth** (JWT, hashing seguro de senhas) — sem custom auth caseira | ✅ Art. 46 |
| **Edge functions** com `verify_jwt: true` na maioria; as com `false` validam Bearer manualmente | ✅ Art. 46 |
| **Sem terceiros ad-tech** (sem Google Analytics, Meta Pixel, Hotjar, Sentry, etc) — superfície de transferência internacional limitada à OpenAI | ✅ MINIMISE |
| **Iniciais** em vez de nome completo em alguns fluxos (`patient_initials` em `evolutions`) — pseudonimização parcial | ✅ Hoepman:HIDE (parcial) |
| **Estrutura de prontuário padronizada** com cabeçalhos obrigatórios — facilita auditoria clínica | ✅ Art. 6º, V (qualidade) |

---

## 6. Roadmap de remediação

### Sprint 1 — Quick wins (≤ 7 dias) — atacar CRÍTICOS

| # | Ação | Achado | Responsável | Esforço |
|---|---|---|---|---|
| 1 | Iniciar contato comercial com OpenAI Enterprise para DPA + ZDR + SCC | AUD-001 | Sócio + Jurídico | 2h + tempo OpenAI |
| 2 | Solicitar e assinar DPA da Supabase (https://supabase.com/legal/dpa) | AUD-003 | Jurídico | 1h |
| 3 | Designar Encarregado/DPO (interno ou contratar consultoria) | AUD-004 | Sócios | 1d |
| 4 | Remover `.env` do git (após confirmar que só tem chaves públicas) | AUD-011 | Tech Lead | 30min |
| 5 | Adicionar `.env*` ao `.gitignore`, criar `.env.example` | AUD-011 | Tech Lead | 15min |

### Sprint 2 — Documentação obrigatória (≤ 30 dias) — atacar ALTOS

| # | Ação | Achado | Responsável | Esforço |
|---|---|---|---|---|
| 6 | Redigir + publicar Política de Privacidade | AUD-002 | DPO + Jurídico + Frontend | 5d |
| 7 | Redigir + publicar Termos de Uso | AUD-002 | Jurídico | 3d |
| 8 | Publicar contato DPO no rodapé + Política | AUD-004 | Frontend | 30min |
| 9 | Iniciar RoPA (`/audit-data-mapping` ou manual) | AUD-005 | DPO + Tech Lead | 3d |
| 10 | Banner de cookies + página `/preferencias-de-cookies` | AUD-008 | Frontend | 3d |
| 11 | Plano de Resposta a Incidentes (playbook) | AUD-009 | DPO + Tech Lead | 5d |
| 12 | Substituir `console.*` em edge functions por logger sanitizado | AUD-010 | Tech Lead | 2d |
| 13 | Configurar security headers no provedor de hospedagem | AUD-015 | DevOps | 1d |

### Sprint 3 — Implementação técnica (≤ 90 dias) — atacar ALTOS técnicos + MÉDIOS

| # | Ação | Achado | Responsável | Esforço |
|---|---|---|---|---|
| 14 | RIPD para tratamento de áudios clínicos | AUD-006 | DPO + Tech Lead + Psicólogo | 5d |
| 15 | Portal de Direitos do Titular (9 direitos + worker SLA 15 dias) | AUD-007 | Fullstack | 15d |
| 16 | Política de retenção e jobs de purge (revisions, messages, áudios) | AUD-012, 013 | Tech Lead + DPO | 7d |
| 17 | Trigger DELETE patient → purga thread OpenAI | AUD-014 | Tech Lead | 2d |
| 18 | Migração para OpenAI Enterprise ou Azure OpenAI BR (decisão estratégica) | AUD-001 | Sócios + Tech Lead | 30d |

### Sprint 4 — Governança contínua

- Auditoria LGPD trimestral (rodar `/audit-lgpd-full` quando o framework estiver instalado)
- Revisão anual de SCCs, DPAs, Política de Privacidade
- Treinamento interno em LGPD para devs + psicólogos parceiros
- Atualizar RoPA a cada nova feature que toque dado pessoal (DoD)

---

## 7. Documentação obrigatória — status

| Documento | Status | Obrigatório por |
|---|---|---|
| Política de Privacidade pública e versionada | ❌ Ausente | Art. 9º |
| Política de Cookies | ❌ Ausente | Art. 8º + Guia ANPD |
| Aviso de privacidade na coleta | ❌ Ausente | Art. 9º |
| Termos de Uso | ❌ Ausente | Boa prática |
| Contato do Encarregado publicado | ❌ Ausente | Art. 41, §1º + Res. 18/2024 |
| Designação formal do Encarregado | ❌ Ausente | Res. 18/2024 |
| RoPA | ❌ Ausente | Art. 37 |
| RIPD para tratamento de áudios clínicos | ❌ Ausente | Art. 38 |
| DPA Supabase assinado | ❌ Pendente | Art. 39 |
| DPA + SCCs OpenAI assinados | ❌ Pendente | Art. 39 + Art. 33 |
| Plano de Resposta a Incidentes | ❌ Ausente | Res. 15/2024 |
| Programa de Governança em Privacidade (Art. 50) | ❌ Ausente | Art. 50 |

**Conformidade documental atual**: 0 / 12

---

## 8. Estimativa de risco residual

| Vetor de risco | Probabilidade | Impacto | Risco bruto |
|---|---|---|---|
| Vazamento de prontuário via thread OpenAI órfã | Médio | **Crítico** | **Alto** |
| Reclamação de titular sem canal de atendimento | Alto | Médio | **Alto** |
| Notificação pela ANPD por ausência de DPO + Política | Alto | Alto | **Crítico** |
| Multa por transferência internacional sem SCC | Médio | Alto | **Alto** |
| Incidente de segurança sem playbook de resposta em 3 dias úteis | Baixo | **Crítico** | Médio |

**Risco residual no estado atual**: ❌ **Inaceitável** para SaaS de saúde mental.

Após Sprint 1 + 2: ⚠ Moderado.
Após Sprint 3: ✅ Aceitável (com auditoria recorrente).

---

## 9. Próximos passos concretos

### Hoje (≤ 2h)
1. Ler este relatório e validar achados com o time
2. `git rm --cached .env` + adicionar `.env*` ao `.gitignore` (commit + push)
3. Solicitar DPA da Supabase em https://supabase.com/legal/dpa

### Esta semana
4. Designar DPO (interno OU contratar consultoria de LGPD/saúde digital — orçamento típico R$ 3-8k/mês)
5. Abrir conversa comercial com OpenAI Enterprise — pedir DPA + ZDR + SCC; em paralelo, avaliar Azure OpenAI Brazil South como plano B
6. Definir orçamento e responsáveis para Sprint 2 (documentação)

### Este mês
7. Publicar Política de Privacidade v1 + contato DPO no rodapé
8. Iniciar RoPA
9. Banner de cookies + Plano de Resposta a Incidentes
10. Substituir `console.*` em edge functions

### Decisão estratégica pendente
**Continuar com OpenAI Enterprise** (DPA + ZDR) **ou migrar para Azure OpenAI Brazil South**?
- OpenAI Enterprise: simplifica migração (mesmas APIs), mas mantém transferência internacional → exige SCC robusta
- Azure OpenAI BR: dados ficam em São Paulo → elimina transferência internacional, simplifica RoPA e Política de Privacidade, mas custos diferentes e SLA novo

Recomendo decidir até **Sprint 3 (90 dias)** após avaliar custos e maturidade de cada opção.

---

## 10. Anexos

### Glossário
- **PII**: Personally Identifiable Information — dado pessoal identificável
- **DPO / Encarregado**: pessoa que atua como canal entre controlador, titulares e ANPD
- **DPA**: Data Processing Agreement — contrato de operador (Art. 39)
- **SCC**: Standard Contractual Clauses — cláusulas-padrão contratuais para transferência internacional (Res. 19/2024)
- **RoPA**: Record of Processing Activities — registro das operações (Art. 37)
- **RIPD**: Relatório de Impacto à Proteção de Dados (Art. 38)
- **ZDR**: Zero Data Retention — política da OpenAI Enterprise de não reter dados de prompt/response
- **RLS**: Row Level Security — controle de acesso a nível de linha no Postgres
- **Estratégias de Hoepman**: 8 estratégias de privacy design — MINIMISE, HIDE, SEPARATE, AGGREGATE, INFORM, CONTROL, ENFORCE, DEMONSTRATE

### Referências normativas
- LGPD — Lei 13.709/2018 c/ Lei 13.853/2019
- Resoluções CD/ANPD: 1/2021, 2/2022, 4/2023, **15/2024** (incidentes), **18/2024** (encarregado), **19/2024** (SCCs), 23/2024, 31/2025
- Resolução CFP 001/2009 (retenção de prontuário psicológico — 20 anos)
- CDC Lei 8.078/1990 (retenção de contratos — 5 anos)
- ISO/IEC 27701, NIST Privacy Framework, OWASP ASVS L2

### Nota metodológica
- Auditoria automatizada por Claude Code seguindo as 11 fases do `audit-lgpd-full.md`
- Análise estática do código (read-only) — nenhum dado de produção foi acessado
- Achados elevados em 1 nível conforme regra do framework para tratamento de dado sensível
- Severidades baseadas na matriz CRÍTICO/ALTO/MÉDIO/BAIXO definida no `CLAUDE.md` do framework
- Este relatório não substitui parecer jurídico; valide com advogado especialista em LGPD antes de qualquer ação com impacto contratual ou regulatório

### Comandos do framework recomendados para validação contínua
| Após executar | Rodar |
|---|---|
| Sprint 1 itens 1-3 | `/audit-international-transfer` (validar SCC) |
| Sprint 2 item 9 (RoPA) | `/audit-data-mapping` (atualizar) |
| Sprint 2 item 10 (banner) | `/audit-cookies` + `/audit-consent` |
| Sprint 2 item 12 (logger) | `/audit-logs-pii` |
| Sprint 3 item 15 (portal) | `/audit-rights` |
| Antes de qualquer release | `/audit-lgpd-full` |
