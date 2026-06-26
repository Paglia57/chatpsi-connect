# Manual do Web App — ChatPsi

> Guia de uso do painel web na ótica do psicólogo. Fiel às telas implementadas em `src/`.
> Itens previstos mas não implementados estão marcados como **(planejado, ainda não disponível)**.
> Linguagem de usuário final — sem jargão técnico.

---

## Visão geral da navegação

**Menu lateral (desktop)** — agrupado em seções:
- **Início** → Painel inicial
- **Clínica** → Evolução (Nova evolução · Histórico), Pacientes, Agenda
- **Ferramentas IA** → Chat Clínico, Planos de Ação, Artigos Científicos, Calculadora Tributária *(BETA)*
- **Marketing** → IA de Marketing
- **Administração** *(só admin)* → Administração, Validar Indicações, Personas da IA, Planos de Ação
- **Indique e Ganhe** *(quando habilitado)*
- Rodapé: **Meu Perfil**, **Privacidade & DPO**, **Suporte**, **Sair**

**Menu inferior (celular):** Início · Evolução · Agenda · Pacientes · Chat · **Mais** (abre o menu
completo).

O **Suporte** (rodapé) abre opções: falar com o suporte no WhatsApp, revisitar orientações e
refazer o onboarding.

---

## 1. Acesso (login e cadastro) — `/auth`

**O que faz:** entrar na conta ou criar uma nova.

**Criar conta:**
1. Clique em **Criar nova conta**.
2. Preencha **nome completo**, **e‑mail** e **senha** (mín. 6 caracteres).
3. **Aceite** a Política de Privacidade e os Termos de Uso (obrigatório).
4. Clique **Criar conta** e confirme pelo e‑mail recebido.

**Entrar:** informe e‑mail e senha → **Entrar**. Esqueceu a senha? Use **Esqueceu sua senha?**
para receber o link de redefinição.

**Ao salvar:** a conta é criada e seu perfil (`profiles`) é gerado. No primeiro acesso ao painel,
aparece o **assistente de onboarding** (boas‑vindas → perfil → primeiro paciente → primeira
evolução → conclusão), que pode ser pulado e retomado depois.

---

## 2. Início (painel) — `/app`

**O que faz:** ponto de partida após o login.

Mostra:
- Saudação ("Olá, {nome}").
- **Indicadores:** evoluções geradas no mês e pacientes em acompanhamento.
- **Ação principal:** cadastrar o primeiro paciente (se ainda não houver) ou **Gerar evolução
  clínica**.
- **Atalhos:** Chat Clínico, Artigos Científicos, Planos de Ação, Pacientes, Histórico, IA de
  Marketing.
- **Dicas** contextuais conforme seu estágio de uso.

---

## 3. Pacientes — `/app/pacientes`

**O que faz:** lista, busca e cadastro de pacientes.

**Usar:**
- **Buscar** por nome; **filtrar** por abordagem e status; **ordenar** por nome, última sessão
  ou total de sessões.
- Clique em um paciente para abrir a **ficha**.
- **Adicionar paciente** abre o formulário (ver abaixo).

**Sem pacientes:** a tela mostra benefícios e o botão **Adicionar primeiro paciente**.

### 3.1 Cadastro / edição da ficha

Campos por seção:
- **Identificação:** Nome completo* · Iniciais* (até 5, sugeridas a partir do nome) · Data de
  nascimento · Gênero.
- **Informações clínicas:** Abordagem (TCC, Psicanálise, Humanista, Fenomenologia, Comportamental,
  Sistêmica, Gestalt, Psicodrama, Outra) · Queixa principal · Hipótese diagnóstica (CID‑11) ·
  Hipótese diagnóstica (DSM‑5‑TR) · Medicação atual · Observações clínicas.
- **Atendimento:** Dia e horário · Duração padrão (30/40/50/60 min) · Modalidade (Presencial/
  Online) · Frequência (Semanal/Quinzenal/Mensal).
- **Status:** Em acompanhamento / Pausado.

**Ao salvar (novo):** grava em `patients` e tenta criar o **contexto clínico de IA** (uma "memória"
por paciente). Se isso falhar, o paciente é salvo mesmo assim e o contexto é ativado na primeira
evolução. **Ao editar:** atualiza a ficha.

### 3.2 Ficha do paciente — `/app/pacientes/:id`

Mostra o cabeçalho (iniciais, nome, status, abordagem) e botões **Editar**, **Planejar sessão** e
**Gerar evolução**. Abaixo: informações clínicas, lista de **evoluções** (clique para ver) e o
status do **contexto clínico acumulado** (com botão para ativá‑lo, se ainda não estiver).

---

## 4. Evolução clínica — `/app/evolucao`

**O que faz:** gera a evolução da sessão a partir de texto ou áudio, com IA.

**Passo a passo:**
1. **Paciente:** selecionado automaticamente se você veio da ficha; senão escolha no seletor ou
   marque **evolução avulsa** (sem prontuário, só iniciais).
2. **Dados da sessão:** abordagem, número da sessão (sugerido), duração e modalidade.
3. **Conteúdo:** aba **Texto** (digite as anotações, mín. 10 caracteres) ou aba **Áudio** (grave,
   envie arquivo ou arraste — .mp3/.m4a/.wav/.ogg/.webm, até 200 MB).
4. **Plano (opcional):** se houver um plano de sessão **não usado** para este paciente, aparece o
   aviso "Você planejou esta sessão. Usar o plano como base?" — ative para incluí‑lo.
5. **Gerar evolução clínica:** a IA produz o texto em tempo real (streaming).
6. **Melhorar:** use o chat de melhorias para ajustes pontuais.
7. **Salvar evolução:** grava em `evolutions`. Se um plano foi usado, ele passa a status **"usado"**
   e fica vinculado a esta evolução.

**Limite (trial):** sem assinatura ativa, são **2 evoluções/mês**; com assinatura, ilimitadas. Ao
atingir o limite, o botão vira um convite para assinar.

---

## 5. Histórico — `/app/historico`

**O que faz:** lista todas as evoluções (mais recentes primeiro).

**Usar:** buscar por iniciais/conteúdo e filtrar por abordagem. Ao abrir uma evolução, você pode:
- **Editar** (salva em `evolutions`),
- **Excluir** (com confirmação — ação irreversível),
- **Copiar** para a área de transferência,
- **Exportar PDF** (cabeçalho, seções e rodapé formatados).

---

## 6. Agenda — `/app/agenda`

**O que faz:** visualizar e organizar sessões (fuso de São Paulo).

**Usar:**
- Alterne entre **Dia** e **Semana**; navegue com ← / **Hoje** / →.
- **Novo compromisso:** data e hora, paciente, duração, modalidade, link da reunião (online) e
  notas → salva em `appointments`.
- Em cada sessão, marque o status: **Realizado**, **Faltou** ou **Cancelado** (padrão: agendado).
- Atalhos no card: **Editar**, **Planejar sessão** e **Ditar evolução** (já com o paciente).

---

## 7. Planejamento de sessão — `/app/planejar-sessao`

**O que faz:** gera um rascunho da próxima sessão com IA, a partir do histórico do paciente.

**Usar:**
1. Abra pela ficha do paciente ou pela agenda (ou pela URL com `?patient=…`).
2. Opcional: escreva um **direcionamento** (ex.: "focar na ansiedade no trabalho") e clique
   **Regenerar**.
3. Revise/edite os campos: **Objetivo**, **Roteiro**, **Técnicas/materiais**, **Pontos de atenção**,
   **Perguntas‑chave** e **Espaço livre** (este último é só seu, não gerado pela IA).
4. **Salvar plano** → grava em `session_plans` (status "salvo").

**Efeito:** na próxima evolução desse paciente, aparece o aviso para usar o plano como base.

---

## 8. Chat Clínico — `/chat`

**O que faz:** conversa com a IA clínica para consultar protocolos, técnicas e discutir casos.
Use o campo de mensagem; a IA pode acionar as ferramentas de **artigos** e **planos de ação**.

---

## 9. Planos de Ação — `/busca-plano`

**O que faz:** busca e filtra planos de ação do catálogo, úteis como modelo. (Catálogo próprio em
pgvector, com sugestões por IA.)

## 10. Artigos Científicos — `/busca-artigos`

**O que faz:** busca artigos por palavra‑chave, priorizando suas áreas de atuação; retorna links
de fontes.

## 11. IA de Marketing — `/marketing`

**O que faz:** gera conteúdo para redes sociais (posts, legendas) contextualizado à sua
especialidade.

## 12. Calculadora Tributária *(BETA)* — `/app/calculadora-tributaria`

**O que faz:** estima tributação (PF × PJ) para o psicólogo. Recurso em **BETA**; para não
assinantes vale o limite de uso mensal.

---

## 13. Meu Perfil — `/app/perfil`

**O que faz:** seus dados e preferências clínicas.

**Usar:** foto de perfil; **nome do profissional** (vai no cabeçalho das evoluções); **apelido**
(como o app te chama); **CRP/registro**; **WhatsApp**; **abordagem principal** (pré‑selecionada nas
evoluções) e **áreas de atuação** (a IA prioriza esses temas). **Salvar** atualiza o perfil.

A seção de **Privacidade e direitos** traz LGPD, links de políticas e o contato do DPO.

---

## 14. Indique e Ganhe — `/app/indicacoes` *(quando habilitado)*

**O que faz:** seu código de indicação e o acompanhamento dos resgates. Disponível conforme a
configuração de indicações.

---

## 15. Áreas de administração *(somente admin)*

- **Administração — `/admin`:** lista de usuários, edição de perfil (inclui marcar assinatura
  ativa), contagem de assinantes e limpeza de histórico de IA por usuário.
- **Validar Indicações — `/admin/referrals`:** aprova/rejeita resgates do programa de indicação.
- **Personas da IA — `/admin/personas`:** edita os prompts da IA com **versionamento** (cada save
  é uma nova versão), histórico com diferença entre versões e **restaurar**. *Observação do próprio
  painel: a troca efetiva no atendimento depende da migração para a Responses API; por ora o texto
  fica salvo.*
- **Planos de Ação — `/admin/planos-acao`:** administra o catálogo de planos de ação.

---

## Itens planejados (ainda não disponíveis)
- Envio de evolução **para o paciente** via WhatsApp.
- Webhook de cobrança/assinatura (Guru) conectado ao fluxo.
- Personas `clinico_web` / `clinico_whatsapp` / `vendas` / `marketing` / `plano_acao` ainda usam o
  prompt legado (placeholder no banco).
- Lembretes/templates proativos e relatórios consolidados por paciente.
