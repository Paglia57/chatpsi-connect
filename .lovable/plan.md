

## Ajustes na tela inicial (AuthPage) — 8 correções

### 1. Proposta de valor — reescrever subtítulo
Trocar o texto genérico por benefício direto:
> "Escreva evoluções clínicas, consulte artigos científicos e organize seus pacientes — tudo com IA especializada para psicólogos."

### 2. Cards — trocar por funcionalidades concretas
| Card | Ícone | Título | Descrição |
|------|-------|--------|-----------|
| 1 | `FileText` | Evolução por IA | Gere documentação clínica completa a partir de anotações da sessão |
| 2 | `MessageCircle` | Chat Especializado | Consulte protocolos e abordagens terapêuticas com IA treinada |
| 3 | `BookOpen` | Artigos Científicos | Busque evidências para embasar suas intervenções clínicas |

### 3. Prova social — contador de profissionais
Adicionar linha abaixo do subtítulo:
> "Mais de 150 profissionais de saúde mental já usam o ChatPsi"

Estilo: badge/pill discreto com ícone `Users`, texto `text-white/90`, fundo `bg-white/10 backdrop-blur-sm`.

### 4. Remover blob decorativo rosa
Remover a classe `card-decorated` do Card de auth (que adiciona o gradiente rosa/azul no topo via `::before`). Substituir por um card limpo: `shadow-xl border border-border/60 bg-white/95 backdrop-blur-xl rounded-3xl`.

### 5. Corrigir deslocamento Login ↔ Criar Conta
Adicionar `min-h-[520px]` (ou valor adequado) ao Card para que a altura não mude entre os dois estados. O conteúdo interno muda, o container fica estável.

### 6. Corrigir autofill do Chrome
Adicionar no `src/index.css` regras de `-webkit-autofill` para manter fundo branco e texto escuro nos inputs.

### 7. Hierarquia de botões — "Criar nova conta" mais discreto
Trocar o botão outline rosa por um link de texto simples (`text-cta hover:underline`), sem borda. O CTA principal continua sendo "Entrar".

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/auth/AuthPage.tsx` | Textos, cards, prova social, remover `card-decorated`, min-height no card, botão secundário como link |
| `src/index.css` | Regra `-webkit-autofill` para inputs |

