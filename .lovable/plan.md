

## Correção: descrição dos planos sendo removida

### Problema
A regex na linha 75-78 de `src/lib/utils.ts` usa `[\s\S]*?` entre o título em negrito e a URL, o que engole toda a descrição do plano. O resultado é que o texto descritivo desaparece e só sobra o card de link com o título.

Além disso, a URL crua (`Link: https://...`) continua no texto após o markdown link ser criado pelo regex, gerando um segundo card genérico "Arquivo Google Drive".

### Solução

**Arquivo: `src/lib/utils.ts`**

1. **Remover o regex de pré-processamento das linhas 74-78** — ele é destrutivo e remove as descrições.

2. **Substituir por um regex mais cirúrgico** que apenas converte a linha `Link: URL` em um markdown link `[Plano de ação: TÍTULO](URL)`, preservando o título bold e a descrição como texto normal. A lógica:
   - Encontrar cada bloco: `**Plano de ação: TÍTULO**\n   Descrição...\n   Link: URL`
   - Manter o `**título**` e a descrição intactos
   - Substituir apenas `Link: URL` por `[Plano de ação: TÍTULO](URL)` (card com título)
   - Isso preserva a descrição e gera apenas UM card por plano

3. **Manter a remoção de citações** (linha 72) e de `[Acessar Link]` (linha 81).

### Regex proposto

```typescript
// Converte "Link: URL" em markdown link usando o título bold mais recente
// Captura: **Plano de ação: TÍTULO**  seguido eventualmente de  Link: URL
normalizedContent = normalizedContent.replace(
  /\*\*(Plano de ação:[^*]+)\*\*([\s\S]*?)Link:\s*(https?:\/\/[^\s\n]+)/g,
  '**$1**$2[$1]($3)'
);
```

Isso mantém `**título**`, preserva `$2` (descrição), e converte `Link: url` em `[título](url)` que renderiza como card com o nome do plano.

4. **Remover URLs cruas duplicadas**: após a conversão, URLs que já viraram markdown links não serão duplicadas porque o `Link: URL` foi substituído.

### Resultado esperado
- Título em negrito visível
- Descrição completa visível
- UM único card por plano com o título do plano como label
- Sem cards genéricos "Arquivo Google Drive"

