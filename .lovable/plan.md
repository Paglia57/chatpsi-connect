

## Restaurar campos Apelido e WhatsApp na página de Perfil

Os campos `nickname` e `whatsapp` existem na tabela `profiles` mas foram removidos do `ProfilePage.tsx` em algum momento. Precisam ser restaurados.

### Mudanças em `src/pages/app/ProfilePage.tsx`

1. **Estado**: Adicionar `nickname` e `whatsapp` como estados (`useState("")`)
2. **Fetch**: Incluir `nickname, whatsapp` no `.select()` e popular os estados
3. **Save**: Incluir `nickname` e `whatsapp` no `.update()` do `handleSave`
4. **UI**: Adicionar dois campos no grid após Nome/CRP:
   - **Apelido** (`nickname`) — Input simples com helper text "Como você quer ser chamado dentro do app"
   - **WhatsApp** — Usar o componente `InternationalPhoneInput` já existente em `src/components/ui/international-phone-input.tsx`, com `value={whatsapp}` e `onChange={setWhatsapp}`

### Nenhuma mudança de banco necessária
Os campos `nickname` e `whatsapp` já existem na tabela `profiles` e a RLS policy permite update desses campos.

