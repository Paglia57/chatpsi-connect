

# Plano de Revisao — Dashboard e Onboarding

Este plano cobre exclusivamente as duas areas de maior impacto na ativacao do profissional. Nenhuma funcionalidade sera quebrada — apenas CSS, copy e layout serao alterados.

---

## A. ONBOARDING (5 etapas)

### A1. StepWelcome (etapa 0)

**Layout**: Centralizado, mobile-first (cabe em 375px sem scroll). Remover emoji do titulo.

**Copy atual → novo**:
- Titulo: "Bem-vindo ao ChatPsi, {nome}! 🎉" → "Bem-vindo ao ChatPsi, {nome}"
- Subtitulo: "Vamos configurar tudo em 3 passos rapidos..." → "Vamos preparar seu consultorio virtual em menos de 2 minutos para voce gerar sua primeira evolucao clinica com IA."
- CTA: "Vamos comecar →" → "Configurar meu consultorio"
- Skip: manter texto "Pular configuracao" mas reduzir destaque (opacity menor)

**Componentes**: Nenhuma mudanca estrutural.

### A2. StepProfile (etapa 1)

**Layout**: Manter card unico. Ajustar grid de especialidades para `grid-cols-2 sm:grid-cols-3` para aproveitar melhor o espaco.

**Copy**:
- Titulo: "Sobre voce" → "Seu perfil clinico"
- Subtitulo: manter ("Essas informacoes personalizam a IA para sua pratica clinica.")
- Label "Como podemos te chamar?" → "Como prefere ser chamado?"
- Label "Qual sua abordagem principal?" → "Abordagem terapeutica principal"
- Label "Quais suas especialidades? *" → "Areas de atuacao *"
- Helper text abaixo de abordagem: "Influencia o estilo e a terminologia das evolucoes geradas."
- Helper text abaixo de especialidades: "Selecione ao menos uma. A IA priorizara conteudos dessas areas."
- Mensagem de erro: "Selecione ao menos uma especialidade" → "Selecione ao menos uma area de atuacao para personalizar a IA"
- CTA: "Continuar →" → "Salvar e continuar"

**Componentes**: Remover cores hardcoded `teal-50`/`teal-200` dos checkboxes selecionados — usar `bg-primary/10 border-primary/30` (tokens do sistema).

### A3. StepPatient (etapa 2)

**Copy**:
- Titulo: "Seu primeiro paciente" → "Cadastre seu primeiro paciente"
- Subtitulo: manter copy atual (ja esta bom)
- Label "Nome ou iniciais do paciente *" → "Nome completo ou iniciais do paciente *"
- Helper text abaixo do nome: "Use iniciais para maior sigilo. Voce podera editar depois."
- Label "Abordagem terapeutica" → "Abordagem para este paciente"
- CTA: "Cadastrar e continuar →" → "Cadastrar paciente e continuar"
- Skip: "Pular, cadastro depois" → "Cadastrar depois"

### A4. StepEvolution (etapa 3)

**Copy**:
- Titulo: "Sua primeira evolucao com IA ✨" → "Gere sua primeira evolucao clinica"
- Subtitulo: manter ("Descreva brevemente o que aconteceu na sessao. A IA faz o resto.")
- Labels de sessao: "N sessao" → "Numero da sessao", "Duracao" e "Tipo" mantidos
- CTA: "✨ Gerar minha primeira evolucao" → "Gerar evolucao clinica" (remover emoji duplicado, ja tem icone Sparkles)
- Mensagens de loading: manter (ja estao boas)
- Placeholder do textarea: manter (ja esta contextual e clinico)

**Componentes**: Remover emoji do Sparkles no botao (redundante com o icone SVG).

### A5. StepCelebration (etapa 4)

**Copy**:
- Titulo: "Sua primeira evolucao foi gerada! 🎉" → "Evolucao clinica gerada com sucesso"
- Subtitulo adicionar: "Copie o texto abaixo ou explore as outras ferramentas do ChatPsi."
- Label dos features: manter textos atuais (ja estao bons)
- CTA: "Explorar o ChatPsi →" → "Ir para o painel"

**Componentes**: Remover emojis dos cards de features (💬📚🎯✍️) — ja tem icones SVG (MessageCircle, BookOpen, etc). Manter confetti (funcional, celebra marco importante).

### A6. OnboardingWizard (container)

**Layout**: Manter estrutura atual (fullscreen, progress bar, logo no topo). Sem mudancas estruturais.

**Copy**:
- STEP_LABELS: `['Boas-vindas', 'Seu perfil', 'Primeiro paciente', 'Primeira evolucao', 'Pronto!']` → `['Boas-vindas', 'Perfil clinico', 'Primeiro paciente', 'Primeira evolucao', 'Conclusao']`

---

## B. DASHBOARD (HomePage)

### B1. Saudacao

**Copy atual → novo**:
- "Ola, {nome}! 👋" → "Ola, {nome}"
- "O que vamos fazer hoje?" → "Seu painel clinico"

**Componentes**: Remover emoji. Usar `font-semibold` no subtitulo para criar hierarquia.

### B2. Cards de metricas

**Layout**: Manter grid 2 colunas. Sem mudancas estruturais.

**Copy**:
- "Evolucoes este mes" → "Evolucoes geradas este mes"
- "Pacientes ativos" → "Pacientes em acompanhamento"

### B3. Hero CTA

**Copy — estado sem pacientes**:
- Titulo: "Comece cadastrando seus pacientes" → "Cadastre seu primeiro paciente"
- Descricao: manter
- CTA: "Cadastrar paciente" → "Adicionar paciente"

**Copy — estado com evolucoes**:
- Titulo: "Gerar Evolucao Clinica" → manter
- Descricao: manter (ja e dinamica e boa)
- CTA: "Comecar agora" → "Gerar nova evolucao"
- CTA secundario: "Ver historico" → "Consultar historico"

**Copy — estado padrao (com pacientes, sem evolucoes)**:
- Titulo: "Gerar Evolucao Clinica" → manter
- CTA: "Comecar agora" → "Gerar primeira evolucao"

### B4. Grid de atalhos

**Copy**:
- "Chat Clinico" → manter
- Descricao: "Consulte protocolos e abordagens terapeuticas" → "Tire duvidas sobre manejo clinico, CID e protocolos"
- "Buscar Artigos" → "Artigos Cientificos"
- Descricao: "Encontre evidencias cientificas para suas intervencoes" → "Busque evidencias para suas hipoteses diagnosticas"
- "Planos de Acao" → "Planos Terapeuticos"
- Descricao: "Monte planos terapeuticos com apoio de IA" → "Estruture objetivos e intervencoes com IA"
- "Pacientes" → manter
- Descricao: "Gerencie seus pacientes e fichas clinicas" → "Acesse prontuarios e fichas clinicas"
- "Historico" → "Historico de Evolucoes"
- Descricao: "Veja todas as evolucoes clinicas geradas" → "Consulte evolucoes anteriores por paciente"
- "IA de Marketing" → manter
- Descricao: manter

### B5. Dicas contextuais (tips)

**Copy**:
- "Cadastre seu primeiro paciente para organizar suas evolucoes" → "Cadastre um paciente para gerar evolucoes vinculadas ao prontuario"
- "Experimente gerar sua primeira evolucao clinica" → "Gere sua primeira evolucao clinica com IA"
- "Use o Chat Clinico para discutir casos complexos com a IA" → "Explore o Chat Clinico para consultar protocolos e discutir casos"
- Label "Proximo passo" → "Sugestao"

### B6. Banner de retomada do onboarding

**Copy**:
- "⚡ Voce ainda nao completou a configuracao inicial..." → "Voce ainda nao finalizou a configuracao do seu consultorio. Complete para personalizar a IA."
- CTA: "Retomar →" → "Retomar configuracao"
- Remover emoji ⚡

### B7. Sidebar tooltip

**Copy**: Manter texto atual (ja esta bom e contextual).

---

## C. DESIGN TOKENS (mudancas transversais aplicadas nos componentes acima)

Nenhum novo token sera criado. Mudancas pontuais:

1. **Checkboxes selecionados no onboarding**: `bg-teal-50 border-teal-200` → `bg-primary/10 border-primary/30` (usar tokens existentes)
2. **Remocao de emojis decorativos**: 🎉👋✨💬📚🎯✍️⚡ — substituidos por icones Lucide ja presentes ou simplesmente removidos
3. **Skip buttons**: adicionar `opacity-60` para reduzir destaque visual sem esconder

---

## Arquivos a modificar

| Arquivo | Tipo de mudanca |
|---|---|
| `src/components/onboarding/StepWelcome.tsx` | Copy + remover emoji |
| `src/components/onboarding/StepProfile.tsx` | Copy + tokens de cor |
| `src/components/onboarding/StepPatient.tsx` | Copy |
| `src/components/onboarding/StepEvolution.tsx` | Copy + remover emoji |
| `src/components/onboarding/StepCelebration.tsx` | Copy + remover emojis |
| `src/components/onboarding/OnboardingWizard.tsx` | Copy (labels) |
| `src/pages/app/HomePage.tsx` | Copy + remover emojis |

Nenhum arquivo de logica, rotas ou backend sera alterado.

