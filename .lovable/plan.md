

## Ajustes: WhatsApp no Perfil + Suporte expandido

### 1. Campo WhatsApp na página de Perfil

**Problema:** O `InternationalPhoneInput` está dentro de um grid `sm:grid-cols-2`, mas ele já renderiza seu próprio `Label` + 3 inputs lado a lado, ficando apertado na metade da tela. A descrição também está genérica.

**Solução em `ProfilePage.tsx`:**
- Mover o campo WhatsApp para fora do grid de 2 colunas, dando-lhe largura total (`col-span-full` ou bloco separado abaixo do grid)
- Atualizar a descrição para: "Usado para contato, suporte e futura integração com WhatsApp"

### 2. Suporte com duas opções no ChatSidebar

**Atualmente:** O botão "Suporte" abre direto o WhatsApp (`wa.me/5511942457454`).

**Solução em `ChatSidebar.tsx`:**
- Substituir o botão simples por um `Popover` ou `Collapsible` com duas opções:
  1. **Falar com o suporte** — mantém o link WhatsApp atual (`wa.me/5511942457454`)
  2. **Revisitar onboarding e orientações** — reseta `has_completed_onboarding` para false e `onboarding_step` para 0 no Supabase, reseta `seen_guides` para `{}`, e navega para `/app` (onde o onboarding será acionado)

- No modo collapsed (ícones), o clique no ícone de Suporte abre o mesmo Popover

**Arquivos a alterar:**

| Arquivo | Mudança |
|---------|---------|
| `src/pages/app/ProfilePage.tsx` | WhatsApp em largura total + nova descrição |
| `src/components/chat/ChatSidebar.tsx` | Suporte com Popover de 2 opções (WhatsApp + revisitar onboarding) |

