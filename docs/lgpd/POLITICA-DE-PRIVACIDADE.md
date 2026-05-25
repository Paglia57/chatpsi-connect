# Política de Privacidade — ChatPsi

> ⚠️ **Versão 0.1 — preliminar**. Este documento foi redigido com base em auditoria automatizada (Claude Code) e templates de mercado. **Validar integralmente com advogado especialista em LGPD antes de publicação institucional definitiva.** Pontos marcados `[REVISAR JURÍDICO]` exigem decisão legal.

**Última atualização**: 2026-05-25
**Versão**: 0.1
**Vigência**: a partir da aceitação no cadastro

---

## 1. Controlador

O ChatPsi é operado pelo seguinte Controlador (Art. 5º, VI LGPD):

- **Razão social**: SECONSULT TECNOLOGIA E SAÚDE LTDA
- **CNPJ**: 40.044.401/0001-68
- **Endereço**: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001

O ChatPsi é um software como serviço (SaaS) destinado exclusivamente a **profissionais de saúde mental** (psicólogos, psiquiatras e correlatos) regularmente inscritos em seus respectivos conselhos profissionais. A SECONSULT atua como **Controlador** dos dados dos profissionais assinantes e como **Operador** dos dados de pacientes inseridos pelos profissionais (a relação contratual específica é definida nos Termos de Uso).

## 2. Encarregado pelo Tratamento de Dados (DPO)

Em conformidade com o Art. 41 da LGPD e Res. CD/ANPD 18/2024, a SECONSULT nomeou como Encarregado:

- **Nome completo**: `<NOME COMPLETO DO ENCARREGADO>`
- **E-mail (preferencial)**: seconsult.clinica@gmail.com
- **WhatsApp (secundário)**: +55 11 94245-7454

Use esse canal para exercer seus direitos do Art. 18 da LGPD ou para qualquer questão relativa ao tratamento dos seus dados. O **RIPD** (Relatório de Impacto à Proteção de Dados) está disponível mediante solicitação ao Encarregado.

## 3. Quais dados tratamos

### 3.1. Dados do profissional assinante (controlador é o ChatPsi)

| Categoria | Dados | Onde armazenamos |
|---|---|---|
| Identificação | Nome completo, e-mail, telefone/WhatsApp, foto opcional | Supabase (Postgres, região `[REVISAR]`) |
| Profissional | CRP, especialidades, abordagem terapêutica principal | Supabase |
| Assinatura | Status, plano, datas, histórico de pagamento | Supabase |
| Autenticação | Hash de senha (gerenciado pela Supabase Auth) | Supabase Auth |

### 3.2. Dados dos pacientes inseridos pelo profissional (ChatPsi é Operador)

Estes dados são **dados pessoais sensíveis de saúde** (Art. 5º, II da LGPD) e exigem cuidado redobrado:

| Categoria | Dados | Onde armazenamos |
|---|---|---|
| Identificação pseudonimizada | Iniciais do paciente (ex.: J.S.), data de nascimento, gênero | Supabase |
| Clínica | CID-10, DSM-5-TR, queixa principal, medicação, observações | Supabase |
| Sessões | Data, duração, modalidade, número da sessão | Supabase |
| Prontuários | Texto integral da evolução clínica gerada pela IA + revisões | Supabase (`evolutions.output_content`, `revision_history`) |
| Áudios | Áudios da sessão enviados para transcrição | Supabase Storage (quando salvos pelo profissional) |
| Chat IA | Conversas do profissional com a IA sobre o caso | Supabase (`messages.content`) + OpenAI (thread por paciente) |

> **Importante**: o ChatPsi NÃO solicita nome completo do paciente. Recomendamos uso exclusivo de iniciais para minimizar a exposição (princípio da necessidade — Art. 6º, III).

## 4. Finalidades e bases legais

| Finalidade | Base legal (LGPD) | Categoria |
|---|---|---|
| Cadastro e operação da conta do profissional | Art. 7º, V (execução de contrato) | Comum |
| Gestão de prontuário clínico | **Art. 11, II, "a" — tutela da saúde por profissional habilitado** | **Sensível** |
| Transcrição de áudio (Whisper) | Art. 11, II, "a" + Art. 6º, III (necessidade) | Sensível |
| Geração e refinamento de evolução clínica por IA | Art. 11, II, "a" | Sensível |
| Chat clínico de apoio | Art. 11, II, "a" | Sensível |
| Comunicações transacionais (e-mail de senha, recibo) | Art. 7º, V (execução de contrato) | Comum |
| Marketing/comunicações comerciais | Art. 7º, I (consentimento) | Comum |
| Cookies analíticos opcionais | Art. 7º, I (consentimento) | Comum |
| Logs de auditoria e segurança | Art. 7º, IX (legítimo interesse) + Art. 46 | Comum |

## 5. Compartilhamento de dados e operadores

Compartilhamos dados com os seguintes operadores (Art. 39 LGPD), mediante contrato (DPA):

| Operador | Finalidade | Dados compartilhados | País | Salvaguarda |
|---|---|---|---|---|
| Supabase (Supabase Inc.) | Hospedagem (banco, autenticação, storage, edge functions) | Todos os dados acima | `[REVISAR — confirmar região do projeto: ideal sa-east-1/São Paulo]` | DPA padrão Supabase (https://supabase.com/legal/dpa) — **a assinar [REVISAR]** |
| OpenAI (OpenAI LLC) | Transcrição de áudio (Whisper) + geração/refinamento de evoluções (Chat Completions + Assistants API) | Áudios de sessão, texto clínico digitado, contexto do prontuário | **Estados Unidos** | DPA + Cláusulas-Padrão Contratuais (Res. CD/ANPD 19/2024) **— em processo de assinatura [REVISAR]** |

> ⚠️ **Transferência internacional para os Estados Unidos** (Art. 33 LGPD): há fluxo de dados clínicos para servidores OpenAI nos EUA. Estamos em processo de formalização das Cláusulas-Padrão Contratuais (SCCs) da Resolução CD/ANPD 19/2024. **Avalie esse risco** ao decidir usar o serviço com pacientes que considerem essa transferência inaceitável.

**Não compartilhamos** dados com terceiros para fins de marketing, publicidade, score de crédito ou qualquer outra finalidade não declarada acima.

## 6. Por quanto tempo guardamos seus dados

| Categoria | Tempo de retenção | Base |
|---|---|---|
| Prontuário clínico do paciente (`evolutions`) | **20 anos após a última sessão** | Resolução CFP 001/2009 |
| Histórico de revisões de prontuário | 20 anos (vinculado ao prontuário) | Resolução CFP 001/2009 |
| Áudios de sessão (quando armazenados) | `[REVISAR — recomendamos: não persistir após transcrição]` | Princípio da necessidade |
| Dados do profissional ativo | Enquanto durar o contrato + 5 anos | Art. 27 CDC + Art. 16, II LGPD |
| Logs de auditoria | 5 anos | Boa prática + Art. 46 |
| Conversas de chat com IA | `[REVISAR — sugestão: 12 meses]` | Princípio da necessidade |
| Cookies analíticos | 12 meses | Boa prática |

Após o término dos prazos, os dados são **eliminados ou anonimizados** em até 30 dias.

## 7. Seus direitos como titular (Art. 18)

Você tem direito a, a qualquer momento, solicitar:

1. **Confirmação** da existência de tratamento dos seus dados
2. **Acesso** aos seus dados
3. **Correção** de dados incompletos, inexatos ou desatualizados
4. **Anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos ou tratados em desconformidade
5. **Portabilidade** dos dados a outro fornecedor de serviço, mediante requisição expressa
6. **Eliminação** dos dados tratados com base no consentimento
7. **Informação** sobre as entidades públicas e privadas com as quais compartilhamos dados
8. **Informação** sobre a possibilidade de não fornecer consentimento e suas consequências
9. **Revogação do consentimento** (Art. 8º, §5º) — tão simples quanto a sua concessão

### Como exercer

- **E-mail (preferencial)**: seconsult.clinica@gmail.com (Encarregado)
- **WhatsApp (secundário)**: 11 94245-7454
- **Portal de direitos do titular**: `/direitos-do-titular` (em implementação — Sprint 3)

O **RIPD** (Relatório de Impacto à Proteção de Dados) para o tratamento de áudios clínicos e geração automatizada de evoluções está disponível mediante solicitação ao Encarregado.

**Prazo de resposta**: até **15 dias corridos** (Art. 19, II LGPD).

> **Atenção**: por se tratar de prontuário clínico, a eliminação pode ser limitada pela obrigação de retenção da Resolução CFP 001/2009 (20 anos). Em caso de pedido de eliminação, informaremos quais dados podemos eliminar e quais devemos preservar por imposição legal.

## 8. Segurança

Implementamos medidas técnicas e administrativas adequadas (Art. 46 LGPD):

- **Criptografia em trânsito**: TLS 1.2+ em todas as conexões
- **Criptografia em repouso**: AES-256 no Postgres da Supabase e no Storage
- **Controle de acesso por linha (RLS)**: cada usuário só acessa os próprios dados via Postgres Row Level Security
- **Autenticação**: gerenciada pela Supabase Auth (JWT, hash bcrypt-equivalente)
- **Logs de auditoria** dos acessos administrativos
- **Backups automáticos** diários (Supabase)
- **Sanitização de logs** no frontend (`src/lib/logger.ts`) que redact secrets

## 9. Incidentes de segurança

Em caso de incidente de segurança que possa acarretar risco ou dano relevante (Art. 48 LGPD + Res. CD/ANPD 15/2024), comunicaremos:

- **À ANPD**: em até 3 dias úteis após o conhecimento
- **Aos titulares afetados**: pelo mesmo prazo, por e-mail e/ou notificação no app

Consulte nosso [Plano de Resposta a Incidentes](./PLANO-RESPOSTA-INCIDENTES.md).

## 10. Cookies

Usamos cookies estritamente necessários (autenticação Supabase) sem necessidade de consentimento, e cookies opcionais mediante seu aceite no banner. Veja a [Política de Cookies](/cookies) para detalhes.

## 11. Crianças e adolescentes

O ChatPsi é destinado a **profissionais maiores de idade**. Pacientes menores podem ser registrados pelo profissional, sob responsabilidade clínica e mediante consentimento dos responsáveis legais quando aplicável (Art. 14 LGPD). O profissional é responsável por garantir que possui as autorizações necessárias antes de inserir dados de menores.

## 12. Alterações desta política

Esta política pode ser atualizada periodicamente. Notificaremos alterações relevantes por e-mail e dentro do aplicativo. O histórico de versões é mantido em `docs/lgpd/POLITICA-DE-PRIVACIDADE.md` do nosso repositório.

## 13. Foro

`[REVISAR JURÍDICO — definir foro de eleição]`

---

**Histórico de versões**
- v0.1 — 2026-05-25 — primeira redação (Sprint 2 LGPD); validação jurídica pendente
