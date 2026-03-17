

## Redesign da HomePage — Dashboard dinâmico e full-width

### Mudanças principais

**1. Remover coluna lateral e breadcrumb**
- Eliminar o grid 12 colunas (8+4). Todo o conteúdo ocupa largura total.
- Remover `<AppBreadcrumb>` da home (redundante).

**2. Stats cards — métricas do usuário**
Adicionar uma faixa de 3 stats entre a saudação e o hero, consultando Supabase:
- **Evoluções este mês**: `SELECT count(*) FROM evolutions WHERE user_id = ? AND created_at >= primeiro_dia_mes`
- **Pacientes ativos**: `SELECT count(*) FROM patients WHERE user_id = ? AND status = 'active'`

Layout: 2 cards em linha (`grid-cols-2`), compactos com ícone + número + label.

**3. Hero contextual**
O banner muda conforme o estado do usuário:
- **Tem evoluções recentes** → "Você gerou X evoluções este mês" + botão "Ver histórico" ao lado do "Começar agora"
- **Não tem pacientes** → "Comece cadastrando seus pacientes" + CTA para `/app/pacientes`
- **Default** (fallback) → Texto atual "Gerar Evolução Clínica"

**4. Expandir grid de atalhos — 6 cards (3x2)**
Adicionar os módulos que faltam:
| Card | Ícone | Path |
|------|-------|------|
| Chat Clínico | `MessageCircle` | `/chat` |
| Buscar Artigos | `BookOpen` | `/busca-artigos` |
| Planos de Ação | `Target` | `/busca-plano` |
| **Pacientes** | `Users` | `/app/pacientes` |
| **Histórico** | `Clock` | `/app/historico` |
| **IA de Marketing** | `Megaphone` | `/marketing` |

Grid: `grid-cols-2 sm:grid-cols-3` para 2 colunas no mobile, 3 no desktop.

**5. Dicas contextuais e acionáveis**
Substituir as 3 dicas estáticas por lógica condicional:
- Se `patientsCount === 0` → "Cadastre seu primeiro paciente para organizar suas evoluções →" (link para `/app/pacientes`)
- Se `evolutionsCount === 0` → "Experimente gerar sua primeira evolução clínica →" (link para `/app/evolucao`)
- Se ambos > 0 → "Use o Chat Clínico para discutir casos complexos →" (link para `/chat`)

Cada dica é clicável (navega). Mostra no máximo 1-2 dicas relevantes.

**6. Referral card compacto no final**
Mover o `ReferralCard` para o final da página, em formato inline (sem coluna lateral). Remover o heading "INDIQUE E GANHE" em uppercase — o próprio card já tem título.

**7. Hover melhorado nos cards de atalho**
Adicionar `hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200` e uma seta `→` que aparece no hover via `group-hover:opacity-100 opacity-0`.

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/HomePage.tsx` | Rewrite completo: stats, hero contextual, 6 atalhos, dicas dinâmicas, referral no final, sem breadcrumb, full-width |

Nenhuma mudança de banco — as queries usam tabelas existentes (`evolutions`, `patients`).

