

## Sistema de Orientações de Primeiro Uso

### 1. Migração de banco de dados

Adicionar coluna `seen_guides` à tabela `profiles`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN seen_guides jsonb NOT NULL DEFAULT '{}'::jsonb;
```

A RLS existente de UPDATE permite atualizar campos não-bloqueados. `seen_guides` não está na lista de bloqueio do WITH CHECK, então funciona via client-side.

### 2. Atualizar AuthProvider

Adicionar `seen_guides` à interface `Profile` como `seen_guides?: Record<string, boolean>`.

### 3. Criar componente reutilizável

**Arquivo:** `src/components/ui/FirstTimeGuide.tsx`

Props conforme especificado. Layout: card inline centralizado com ícone, título, descrição, dicas (💡), exemplos clicáveis (chips teal), botão CTA. Animação fade-in + scale via CSS. Fade-out de 300ms ao dispensar antes de remover do DOM.

Lógica interna:
- Estado `visible` + `exiting` para controlar fade-out
- `onDismiss` chamado após a animação de saída
- Exemplos clicáveis disparam `onExampleClick(text)` prop callback

### 4. Integrar em cada página

| Página | Arquivo | Condição de exibição |
|--------|---------|---------------------|
| Chat | `ChatInterface.tsx` | `messages.length === 0` E `!profile?.seen_guides?.chat` |
| Busca Plano | `BuscaPlanoInterface.tsx` | `messages.length === 0` E `!profile?.seen_guides?.busca_plano` |
| Busca Artigos | `BuscaArtigosInterface.tsx` | `messages.length === 0` E `!profile?.seen_guides?.busca_artigos` |
| Marketing | `MarketingInterface.tsx` | `activeTab === 'novo'` E `prompt === ''` E `!profile?.seen_guides?.marketing` |

Ao dispensar (CTA ou exemplo clicado):
1. Atualizar `seen_guides` no Supabase via merge JSONB
2. Atualizar profile local via `updateProfile`
3. Se exemplo clicado: preencher o campo de input da página e dar focus
4. Fade-out do guia

Para o Chat e Busca Plano/Artigos, o guia substitui o empty state atual. Para Artigos, aparece acima dos chips de sugestão existentes. Para Marketing, aparece acima do formulário na tab "Novo Texto".

### 5. Helper para atualizar seen_guides

Função utilitária em cada página:
```ts
const markGuideSeen = async (key: string) => {
  const current = profile?.seen_guides || {};
  await supabase.from('profiles').update({
    seen_guides: { ...current, [key]: true }
  }).eq('user_id', user.id);
  // refresh profile locally
};
```

### Arquivos a criar
- `src/components/ui/FirstTimeGuide.tsx`

### Arquivos a alterar
- `src/components/auth/AuthProvider.tsx` (adicionar `seen_guides` à interface Profile)
- `src/components/chat/ChatInterface.tsx` (integrar guia no empty state)
- `src/components/busca-plano/BuscaPlanoInterface.tsx` (integrar guia)
- `src/components/busca-artigos/BuscaArtigosInterface.tsx` (integrar guia acima dos chips)
- `src/components/marketing/MarketingInterface.tsx` (integrar guia na tab Novo)
- Migration SQL para adicionar coluna `seen_guides`

