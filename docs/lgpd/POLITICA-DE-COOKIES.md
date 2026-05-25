# Política de Cookies — ChatPsi

> ⚠️ **Versão 0.1 — preliminar**. Validar com jurídico antes de uso institucional.

**Última atualização**: 2026-05-25
**Versão**: 0.2

---

> ⚠️ O ChatPsi trata **dados sensíveis de saúde mental**. Para conhecer todas as finalidades, bases legais, prazos de retenção e seus direitos como titular, consulte nossa [Política de Privacidade](./POLITICA-DE-PRIVACIDADE.md) e o **RIPD** (Relatório de Impacto à Proteção de Dados), disponível mediante solicitação ao Encarregado.

---

## O que são cookies?

Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles servem para lembrar preferências, manter você autenticado, medir uso e personalizar a experiência.

O ChatPsi usa também tecnologias equivalentes (localStorage, sessionStorage), tratadas com o mesmo rigor de privacidade.

## Categorias de cookies que usamos

### 1. Estritamente necessários (sempre ativos — não exigem consentimento)

Sem estes, o ChatPsi não funciona. São cobertos pelo Art. 7º, V (execução de contrato) e Art. 7º, VI (exercício regular de direitos) da LGPD.

| Cookie / Storage | Origem | Finalidade | Duração |
|---|---|---|---|
| `sb-<projeto>-auth-token` | Supabase | Manter o usuário autenticado entre páginas | Sessão / até logout |
| `sb-<projeto>-refresh-token` | Supabase | Renovar a sessão de autenticação sem novo login | 7 dias |
| `chatpsi_cookie_consent` | ChatPsi | Lembrar suas escolhas neste banner | 12 meses |
| `chatpsi_seen_guides` | ChatPsi | Lembrar quais tutoriais você já viu (não recriar onboarding) | 24 meses |

### 2. Analíticos (opt-in — exigem consentimento)

Hoje **não usamos** cookies analíticos. Se passarmos a usar, listaremos aqui e exigiremos seu consentimento antes de carregar.

### 3. Marketing (opt-in — exigem consentimento)

Hoje **não usamos** cookies de marketing. O ChatPsi não tem pixels de redes sociais (Meta, TikTok), não tem remarketing nem publicidade direcionada.

## Como gerenciar suas preferências

- Acesse `/cookies` a qualquer momento para revisar e alterar suas escolhas
- Use as configurações do seu navegador para bloquear/excluir cookies (pode afetar funcionalidade)
- Revogar o consentimento é **tão simples quanto concedê-lo** (Art. 8º, §5º LGPD)

## O que acontece se eu rejeitar?

- **Estritamente necessários**: não há como rejeitar — sem eles você não consegue acessar o app
- **Analíticos/Marketing**: nada de funcional muda; apenas perdemos visibilidade agregada do uso

## Cookies de terceiros

| Terceiro | Quando carregamos | Cookies que pode setar | Política |
|---|---|---|---|
| Supabase | Sempre (autenticação) | os listados acima como "necessários" | https://supabase.com/privacy |
| OpenAI | Não carrega cookies no browser do usuário — toda comunicação é via edge function do servidor para a API OpenAI | — | https://openai.com/policies/privacy-policy |

## Alterações nesta política

Versões anteriores e mudanças são listadas em `docs/lgpd/POLITICA-DE-COOKIES.md` no repositório do projeto.

## Controlador

**SECONSULT TECNOLOGIA E SAÚDE LTDA**
CNPJ: 40.044.401/0001-68
Endereço: Rua Sete de Setembro, 543 — Apt 121, Centro, Sorocaba/SP, CEP 18035-001

## Encarregado (DPO)

**`<NOME COMPLETO DO ENCARREGADO>`**
E-mail (preferencial): seconsult.clinica@gmail.com
WhatsApp (secundário): 11 94245-7454

Canal preferencial: e-mail. SLA de resposta: até 15 dias corridos (Art. 19, II LGPD).

---

**Histórico de versões**
- v0.2 — 2026-05-25 — separação Controlador (SECONSULT) × Encarregado; aviso sobre dados sensíveis + RIPD
- v0.1 — 2026-05-25 — primeira redação (modelo incorreto: Seconsult como DPO externo)
