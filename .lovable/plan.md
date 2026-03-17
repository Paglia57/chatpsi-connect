

## Plano: Ajustar sidebar — ADMINISTRAÇÃO só para admin, "Indique e Ganhe" independente

### Mudanças em `src/components/chat/ChatSidebar.tsx`

**1. Grupo ADMINISTRAÇÃO (linhas 167-181)** — envolver TODO o bloco (label + separator + itens) em `{isAdmin && (...)}`, e adicionar "Validar Indicações" como segundo item:

```
{isAdmin && (
  <>
    <Separator className="my-3" />
    <SectionLabel>Administração</SectionLabel>
    <NavLink to="/admin" ...>Administração</NavLink>
    <NavLink to="/admin/referrals" ...>Validar Indicações</NavLink>
  </>
)}
```

**2. "Indique e Ganhe"** — item independente, visível para TODOS, posicionado após o grupo Marketing (e após o bloco admin se existir). Sem label de seção, apenas um Separator e o link:

```
<Separator className="my-3" />
<NavLink to="/app/indicacoes" ...>
  <Gift /> Indique e Ganhe
</NavLink>
```

**3. View colapsada (icon-only, ~linhas 250-290)** — aplicar a mesma lógica:
- Ícones admin só dentro de `{isAdmin && (...)}`
- Ícone Gift (Indique e Ganhe) visível para todos, fora do bloco admin

### Resumo

| Arquivo | Mudança |
|---------|---------|
| `src/components/chat/ChatSidebar.tsx` | Grupo ADMINISTRAÇÃO inteiro condicional a `isAdmin`, adicionar "Validar Indicações", mover "Indique e Ganhe" para fora como item independente para todos |

