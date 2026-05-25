# Plano de Resposta a Incidentes de Segurança — ChatPsi

> ⚠️ **Versão 0.1 — preliminar**. Documento exigido pela **Resolução CD/ANPD 15/2024** (Art. 48 LGPD).

**Última atualização**: 2026-05-25
**Versão**: 0.2
**Controlador**: SECONSULT TECNOLOGIA E SAÚDE LTDA — CNPJ 40.044.401/0001-68 — Endereço: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001
**Encarregado (DPO)**: `<NOME COMPLETO DO ENCARREGADO>` — seconsult.clinica@gmail.com (preferencial) · WhatsApp secundário 11 94245-7454
**Tech Lead**: `<PREENCHER>`

---

## Objetivo

Garantir resposta tempestiva, organizada e em conformidade legal a incidentes de segurança envolvendo dados pessoais tratados pelo ChatPsi, em especial dados sensíveis de saúde mental.

## Definição (Art. 5º, IV LGPD)

**Incidente de segurança**: qualquer evento que possa acarretar risco ou dano relevante aos titulares de dados pessoais — vazamento, acesso não autorizado, perda, alteração, destruição não autorizada, ou indisponibilidade prolongada.

## Equipe de resposta (CSIRT)

| Papel | Responsável | Contato |
|---|---|---|
| Encarregado (DPO) — coordenador | `<NOME DO ENCARREGADO>` (nomeado pela SECONSULT) | seconsult.clinica@gmail.com (preferencial) · WhatsApp secundário 11 94245-7454 |
| Tech Lead — investigação técnica | `[REVISAR]` | `[REVISAR]` |
| Comunicação — porta-voz | `[REVISAR]` | `[REVISAR]` |
| Sócio/Diretor — autorização decisões críticas | `[REVISAR]` | `[REVISAR]` |
| Assessoria jurídica externa (sob demanda) | `[REVISAR]` | `[REVISAR]` |

## Matriz de classificação

| Severidade | Critério | Tempo máx. de comunicação |
|---|---|---|
| 🔴 **CRÍTICO** | Vazamento confirmado de dado sensível (prontuário, áudio clínico) com risco real ao titular | ANPD + titulares em **24h** |
| 🟠 **ALTO** | Acesso não autorizado a dados de múltiplos titulares; possível vazamento de credenciais admin; vulnerabilidade ativamente explorada | ANPD + titulares em **3 dias úteis** |
| 🟡 **MÉDIO** | Vulnerabilidade detectada sem evidência de exploração; tentativa de invasão bloqueada; perda de disponibilidade > 4h | Registrar internamente; avaliar comunicação caso a caso |
| 🟢 **BAIXO** | Falha menor sem impacto a titulares (ex.: bug de UI que expõe ID interno temporariamente) | Registrar internamente |

## Fluxo de resposta

### Fase 1 — Detecção e triagem inicial (0–2h)

**Gatilhos automáticos** (a implementar):
- Alertas Supabase Logs para padrões suspeitos (>X SELECTs de tabela `evolutions` por usuário, login de IP novo, falhas auth em série)
- Alertas Edge Functions Logs (>X erros 500/min, latência anormal)
- Reclamação de titular via canal DPO
- Comunicação de pesquisador externo (bug bounty)

**Ações imediatas**:
1. Quem detectou notifica DPO + Tech Lead via WhatsApp/email (canal definido)
2. DPO abre ticket no `incident_log` (tabela a criar — Sprint 3) com: descrição, hora de detecção, fonte, dados potencialmente afetados
3. Tech Lead reproduz e mede o escopo (quantos titulares, quais dados, vetor)
4. Classificar conforme matriz acima

### Fase 2 — Contenção (2–24h)

- Revogar credenciais comprometidas
- Bloquear IPs suspeitos
- Desativar feature/edge function vulnerável
- Snapshot do estado para análise forense
- Decidir se preserva ou descarta logs comprometidos

### Fase 3 — Comunicação (dentro do SLA da matriz)

#### 3.1. À ANPD

- Acessar formulário oficial: https://www.gov.br/anpd/pt-br
- Conteúdo mínimo (Art. 48, §1º + Res. 15/2024):
  - Descrição da natureza do incidente
  - Categorias e número aproximado de titulares afetados
  - Categorias e número aproximado de registros afetados
  - Indicação de medidas técnicas e de segurança
  - Riscos relacionados
  - Motivos de eventual demora na comunicação
  - Medidas adotadas/sugeridas para reverter ou mitigar
- Anexar evidências técnicas

#### 3.2. Aos titulares afetados

Modelo de e-mail (preencher):

```
Assunto: Comunicação de incidente de segurança — ChatPsi

Prezado(a) [NOME],

Identificamos em [DATA] um incidente de segurança que pode ter afetado
seus dados pessoais tratados pelo ChatPsi.

O que aconteceu: [DESCRIÇÃO BREVE]
Dados envolvidos: [LISTA]
Riscos para você: [AVALIAÇÃO]
Medidas que tomamos: [AÇÕES]
Recomendamos que você: [AÇÕES PRÓ-USUÁRIO]

Estamos à disposição pelo nosso Encarregado (DPO):
<NOME DO ENCARREGADO>
E-mail (preferencial): seconsult.clinica@gmail.com
WhatsApp (secundário): 11 94245-7454

Controlador: SECONSULT TECNOLOGIA E SAÚDE LTDA

ChatPsi
```

### Fase 4 — Erradicação e recuperação (1–7 dias)

- Aplicar patch / corrigir vulnerabilidade
- Rotacionar todas as credenciais potencialmente comprometidas
- Restaurar serviço a partir de backup íntegro se necessário
- Verificar integridade de dados afetados

### Fase 5 — Pós-incidente (até 30 dias)

- Relatório completo (RCA — Root Cause Analysis) arquivado em `docs/lgpd/incidentes/INC-YYYYMMDD-N.md`
- Revisão do que falhou e atualização deste plano
- Lições aprendidas comunicadas ao time
- Avaliação de eventual necessidade de RIPD adicional

## Registro permanente

**Todos os incidentes** (mesmo os que não exigem comunicação à ANPD) devem ser registrados em `incident_log` (tabela a criar Sprint 3), contendo:

- ID, severidade, hora detecção, hora resolução
- Descrição, vetor, dados afetados, titulares afetados
- Ações tomadas
- Comunicação à ANPD: sim/não + justificativa
- Comunicação aos titulares: sim/não + data

Conservar por **5 anos** mínimo.

## Treinamento e simulação

- Simulação **tabletop exercise trimestral** com toda a equipe de resposta
- Treinamento anual obrigatório de todos os colaboradores que tocam dado pessoal
- Atualização deste documento após cada simulação ou incidente real

## Contatos externos úteis

| Entidade | Contato | Uso |
|---|---|---|
| ANPD | https://www.gov.br/anpd | Comunicação de incidentes |
| Polícia Federal — Cibercrimes | denuncia@pf.gov.br | Crimes cibernéticos |
| SaferNet Brasil | https://new.safernet.org.br | Suporte vítimas |
| Supabase Suporte | support@supabase.com | Incidentes em infra Supabase |
| OpenAI Suporte Enterprise | `[REVISAR — após upgrade]` | Incidentes em fluxo IA |

---

**Histórico de versões**
- v0.1 — 2026-05-25 — plano inicial (Sprint 2 LGPD)
