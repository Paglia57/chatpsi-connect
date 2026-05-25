# Registro de Operações de Tratamento de Dados (RoPA) — ChatPsi

> ⚠️ **Versão 0.1 — preliminar**. Documento exigido pelo **Art. 37 da LGPD**. Atualizar a cada nova feature que toque dado pessoal.

**Última atualização**: 2026-05-25
**Versão**: 0.2
**Controlador**: SECONSULT TECNOLOGIA E SAÚDE LTDA — CNPJ 40.044.401/0001-68 — Endereço: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001
**Encarregado (DPO)**: `<NOME COMPLETO DO ENCARREGADO>` — seconsult.clinica@gmail.com (preferencial) · WhatsApp secundário 11 94245-7454

---

## Visão geral

| Item | Valor |
|---|---|
| Papel jurídico | Controlador (dados do profissional) + Operador (dados de paciente, sob controle do profissional) |
| Volume estimado de titulares | `[REVISAR — N profissionais × N pacientes]` |
| Trata dados sensíveis? | **Sim** — saúde mental (Art. 5º, II + Art. 11) |
| Trata dados de menores? | Possivelmente (pacientes adolescentes) — sob responsabilidade do profissional |
| Transferência internacional? | **Sim** — OpenAI (EUA), em formalização SCCs (Res. 19/2024) |

---

## Operações de tratamento

### OPER-001 — Cadastro do profissional assinante

| Atributo | Valor |
|---|---|
| Finalidade | Habilitar conta para uso do SaaS |
| Base legal | Art. 7º, V (execução de contrato) |
| Categoria de dados | Comum |
| Titulares | Psicólogos / psiquiatras |
| Dados tratados | Nome, e-mail, telefone, CRP, especialidades, abordagem, foto opcional |
| Operações | Coleta, armazenamento, atualização, exclusão |
| Tabela(s) | `profiles` |
| Compartilhamento | Supabase (Operador) |
| Transferência internacional | Não (se região Supabase = sa-east-1) — `[REVISAR confirmar]` |
| Retenção | Vida do contrato + 5 anos (CDC Art. 27) |
| Salvaguardas | TLS, RLS por `auth.uid()`, Supabase Auth |

### OPER-002 — Autenticação e gestão de sessão

| Atributo | Valor |
|---|---|
| Finalidade | Controle de acesso |
| Base legal | Art. 7º, V |
| Categoria | Comum |
| Dados | E-mail, hash de senha, tokens JWT, IP de login |
| Operações | Verificação, refresh, revogação |
| Compartilhamento | Supabase Auth |
| Retenção | Tokens: 7 dias; logs de acesso: 5 anos |
| Salvaguardas | bcrypt-equivalente, MFA disponível, rate limiting |

### OPER-003 — Cadastro de paciente (pelo profissional)

| Atributo | Valor |
|---|---|
| Finalidade | Suporte à prática clínica do profissional |
| Base legal | **Art. 11, II, "a"** (tutela da saúde por profissional habilitado) |
| Categoria | **Sensível** (saúde) |
| Titulares | Pacientes atendidos pelos profissionais |
| Dados | Iniciais, data de nascimento, gênero, CID-10, DSM-5-TR, queixa principal, medicação, observações, frequência de sessão |
| Tabela | `patients` |
| Compartilhamento | Supabase + OpenAI (thread por paciente, ver OPER-006) |
| Retenção | **20 anos** após última sessão (Res. CFP 001/2009) |
| Salvaguardas | RLS, pseudonimização (iniciais), TLS, AES-256 em repouso |

### OPER-004 — Geração de evolução clínica (IA)

| Atributo | Valor |
|---|---|
| Finalidade | Estruturar prontuário a partir de notas/áudio da sessão |
| Base legal | Art. 11, II, "a" |
| Categoria | **Sensível** |
| Dados | Texto digitado pelo profissional, transcrição de áudio, contexto histórico do paciente |
| Operações | Coleta → envio à OpenAI → recebimento da resposta → exibição → salvamento em `evolutions.output_content` |
| Tabela | `evolutions` |
| Compartilhamento | Supabase + **OpenAI (EUA)** |
| Transferência internacional | **Sim** — Chat Completions / Assistants API em servidores OpenAI EUA |
| Salvaguardas previstas | DPA + SCC OpenAI (em assinatura), prompt review humano obrigatório antes de salvar |
| Retenção | 20 anos (CFP) |

### OPER-005 — Transcrição de áudio (Whisper)

| Atributo | Valor |
|---|---|
| Finalidade | Converter áudio de sessão em texto para gerar evolução |
| Base legal | Art. 11, II, "a" + Art. 6º, III (necessidade) |
| Categoria | **Sensível** (voz + conteúdo clínico) |
| Dados | Áudio bruto |
| Operações | Captura → upload base64 → envio Whisper → transcrição retornada → áudio descartado pela edge function |
| Compartilhamento | **OpenAI Whisper (EUA)** |
| Transferência internacional | **Sim** |
| Retenção | Áudio bruto: idealmente não persistido. Quando persistido em `evolutions.audio_url` (Storage), seguir CFP 20 anos (avaliar separar áudio do prontuário) |
| Salvaguardas previstas | DPA OpenAI Enterprise + ZDR (Zero Data Retention) — em assinatura |

### OPER-006 — Threads OpenAI por paciente (contexto acumulado)

| Atributo | Valor |
|---|---|
| Finalidade | Manter contexto clínico para que a IA evolua a qualidade das evoluções ao longo das sessões |
| Base legal | Art. 11, II, "a" |
| Categoria | **Sensível** |
| Dados | Histórico de mensagens com conteúdo clínico vinculado ao paciente |
| Armazenamento | OpenAI (Assistants API thread) — `patients.openai_thread_id` armazena referência |
| Compartilhamento | **OpenAI (EUA)** |
| Transferência internacional | **Sim** |
| Risco identificado | **AUD-LGPD-014**: thread NÃO é deletada quando o paciente é excluído (vazamento por inação) — corrigir Sprint 3 |
| Retenção | Definir: alinhar com CFP 20 anos OU purge ao excluir paciente |

### OPER-007 — Chat clínico de apoio (`messages`)

| Atributo | Valor |
|---|---|
| Finalidade | Conversa do profissional com IA sobre manejo clínico |
| Base legal | Art. 11, II, "a" |
| Categoria | **Sensível** se conversar sobre caso real; Comum se hipotético |
| Dados | Texto livre, arquivos opcionais |
| Tabela | `messages` |
| Compartilhamento | Supabase + OpenAI (Assistants API) |
| Transferência internacional | **Sim** |
| Retenção | `[REVISAR — sugerir 12 meses]` |

### OPER-008 — Histórico de revisões de evolução (`revision_history`)

| Atributo | Valor |
|---|---|
| Finalidade | Auditoria clínica e capacidade de reverter melhorias |
| Base legal | Art. 11, II, "a" + Art. 16, II (cumprimento de obrigação) |
| Categoria | **Sensível** |
| Dados | Versão anterior do prontuário + prompt de melhoria + timestamp |
| Tabela | `evolutions.revision_history` (JSONB) |
| Retenção | 20 anos (vinculado ao prontuário) |
| Risco identificado | **AUD-LGPD-012**: cresce indefinidamente — definir política de retenção |

### OPER-009 — Comunicações transacionais

| Atributo | Valor |
|---|---|
| Finalidade | E-mails de cadastro, recuperação de senha, recibos |
| Base legal | Art. 7º, V |
| Categoria | Comum |
| Dados | E-mail, conteúdo da notificação |
| Compartilhamento | Supabase Auth (e-mail engine) |
| Retenção | 5 anos |

### OPER-010 — Marketing e comunicações comerciais

| Atributo | Valor |
|---|---|
| Finalidade | Newsletter, novidades, ofertas |
| Base legal | Art. 7º, I (consentimento) |
| Categoria | Comum |
| Dados | E-mail, preferências |
| Compartilhamento | `[REVISAR — ferramenta de envio]` |
| Retenção | Até revogação |

### OPER-011 — Cookies analíticos

| Atributo | Valor |
|---|---|
| Finalidade | Estatística agregada de uso |
| Base legal | Art. 7º, I (consentimento) |
| Categoria | Comum |
| Status atual | **Não implementado** — quando for, registrar aqui |

### OPER-012 — Logs de auditoria e segurança

| Atributo | Valor |
|---|---|
| Finalidade | Detecção de incidentes, conformidade Art. 46 |
| Base legal | Art. 7º, IX (legítimo interesse) |
| Categoria | Comum + identificadores |
| Compartilhamento | Supabase Logs + Edge Functions Logs |
| Retenção | 5 anos |
| Risco identificado | **AUD-LGPD-010**: 87 `console.log` em edge functions sem sanitização — refatorar Sprint próxima |

---

## Resumo de transferências internacionais

| Destino | Operações | Status SCC |
|---|---|---|
| OpenAI EUA (Chat Completions, Whisper, Assistants API) | OPER-004, 005, 006, 007 | **Em formalização** (SCC Res. 19/2024) — risco regulatório ativo até assinatura |
| Supabase | OPER-001 a 012 (Postgres + Storage + Auth) | DPA padrão Supabase **a assinar** (gratuito em https://supabase.com/legal/dpa). Confirmar região: ideal **sa-east-1 (São Paulo)** para evitar nova transferência internacional |

---

## Histórico de versões
- v0.1 — 2026-05-25 — RoPA inicial gerado a partir da auditoria LGPD do framework (Sprint 2)
