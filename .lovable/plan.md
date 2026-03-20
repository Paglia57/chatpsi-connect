

## Corrigir exibição de links nos Planos de Ação

### Problema
Cada plano mostra **dois cards de link** (um do markdown `[Acessar Link](url)` e outro da URL crua que sobra no texto). Além disso, o card mostra o label genérico "Arquivo Google Drive" em vez do título do plano.

### Solução

**Arquivo: `src/lib/utils.ts`**

1. **Deduplicar links**: Melhorar o regex de limpeza (linha 75-77) para remover completamente a URL crua após convertê-la em markdown link. Adicionar um passo que remove URLs que já foram convertidas em `[Acessar Link](url)`.

2. **Extrair título do plano para o card**: Antes do split, fazer um pré-processamento que substitui padrões como:
   ```
   **Plano de ação: TÍTULO**\n...texto...\n[Acessar Link](url)
   ```
   por um markdown link com o título do plano como texto:
   ```
   [Plano de ação: TÍTULO](url)
   ```
   Isso faz o card exibir o nome do plano em vez de "Arquivo Google Drive".

3. **Modificar `createLinkCard`**: Aceitar um parâmetro opcional `customLabel` que, se presente, substitui o `cardInfo.label` genérico. Quando o link text não é "Acessar Link" (ou seja, é um título de plano), usar esse texto como label do card.

4. **Remover referências de arquivo do assistant**: Limpar sufixos como `【8:0†arquivo.pdf】` que o OpenAI Assistant adiciona no final das respostas.

### Resultado esperado
- Cada plano mostra **um único card** com o título do plano (ex: "Plano de ação: O que é TDAH?") e o domínio `drive.google.com/...`
- Sem duplicação de links
- Sem referências de arquivo no texto

