

## Ordenar por Tokens no Admin

Adicionar um botão/toggle na coluna "Tokens" da tabela de administração que permite ordenar os usuários pelo consumo de tokens (maior para menor e vice-versa).

### Mudanças em `src/pages/AdminPage.tsx`

**1. Novo estado de ordenação**

Adicionar estado para controlar a direção da ordenação:
```typescript
const [sortByTokens, setSortByTokens] = useState<'none' | 'asc' | 'desc'>('none');
```

**2. Aplicar ordenação no useEffect de filtro (linhas 80-89)**

Após filtrar por nome, aplicar a ordenação por tokens:
- `desc`: usuários com mais tokens primeiro
- `asc`: usuários com menos tokens primeiro
- `none`: ordem padrão (por data de criação)

Valores `null` de `TokenCount` serao tratados como `0`.

**3. Cabeçalho clicável na coluna "Tokens" (linha ~230)**

Trocar o `<TableHead>Tokens</TableHead>` por um botao clicavel com icone de seta indicando a direção atual:
- Clique alterna entre `none` -> `desc` -> `asc` -> `none`
- Icone `ArrowUpDown` (neutro), `ArrowDown` (desc), `ArrowUp` (asc) do lucide-react

### Detalhes Técnicos

- Importar `ArrowUpDown`, `ArrowDown`, `ArrowUp` do lucide-react
- A ordenação é aplicada no frontend sobre `filteredProfiles`, sem nova query ao banco
- O ciclo de clique: sem ordenação -> maior primeiro -> menor primeiro -> sem ordenação

