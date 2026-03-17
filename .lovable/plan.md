

## Plano: Empty State Rico na Página de Pacientes

### Mudança em `src/pages/app/PatientsPage.tsx`

Substituir o empty state atual (linhas ~114-118) — que mostra apenas ícone `Users` + texto "Nenhum paciente cadastrado" — por um componente mais orientador:

**Quando `patients.length === 0` (nenhum paciente cadastrado):**
- Esconder os filtros (search, approach, status, sort) — não fazem sentido sem dados
- Mostrar um empty state centralizado com:
  - Ícone `Users` maior (h-16 w-16) com fundo circular `bg-primary/10`
  - Título: "Nenhum paciente cadastrado ainda"
  - Texto explicativo: "Cadastre seus pacientes para acompanhar evoluções, manter o histórico organizado e ter contexto personalizado nas sessões."
  - Botão CTA primário `variant="cta"` com ícone `UserPlus`: "Cadastrar primeiro paciente"
  - 3 mini-bullets abaixo com ícones pequenos mostrando benefícios:
    - "Histórico de sessões organizado por paciente"
    - "Contexto automático para a IA nas evoluções"  
    - "Acompanhamento de progresso ao longo do tempo"

**Quando `filtered.length === 0` mas `patients.length > 0` (filtro sem resultado):**
- Manter o estado atual simples: ícone + "Nenhum paciente encontrado"

### Arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/PatientsPage.tsx` | Empty state rico com CTA, texto explicativo e benefícios; esconder filtros quando não há pacientes |

