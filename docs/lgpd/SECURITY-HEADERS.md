# Cabeçalhos de Segurança HTTP — ChatPsi

> 📄 **Referência técnica** para aplicar quando o provedor de hospedagem for confirmado. Esta sprint NÃO aplica os headers — apenas documenta.

**Última atualização**: 2026-05-25
**Versão**: 0.1
**Achado relacionado**: AUD-LGPD-015

---

## Por quê

O **Art. 46 da LGPD** exige medidas técnicas adequadas para proteger dados pessoais. Cabeçalhos de segurança HTTP são a primeira camada de defesa contra:

- **Clickjacking** (`X-Frame-Options`)
- **MITM / downgrade attacks** (`Strict-Transport-Security`)
- **XSS / injeção de scripts** (`Content-Security-Policy`)
- **Vazamento de URL pela referência** (`Referrer-Policy`)
- **Abuso de APIs sensíveis do navegador** (`Permissions-Policy` — câmera, microfone, geolocalização)

## Headers recomendados

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://*.supabase.co;
  media-src 'self' blob: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';

X-Frame-Options: DENY

X-Content-Type-Options: nosniff

Referrer-Policy: strict-origin-when-cross-origin

Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()
```

### Observações importantes para o CSP

1. **`connect-src` deve incluir o subdomínio Supabase do seu projeto** (`https://rrdvivxdasezvhfbetra.supabase.co`). O wildcard `https://*.supabase.co` já cobre.
2. **`media-src` precisa de `blob:`** para o áudio gravado pelo microfone funcionar (MediaRecorder API).
3. **NÃO incluir `api.openai.com` no `connect-src`** — todas as chamadas para OpenAI são feitas pelas **edge functions** (servidor), não pelo navegador.
4. **`'unsafe-inline'` em `script-src`** é necessário para o Vite/Tailwind atualmente. Estudar migração para CSP com nonce em versão futura.
5. **Fontes do Google** — se você não usa Google Fonts via CDN (Inter/Montserrat estão como package via Vite), pode remover `fonts.googleapis.com` e `fonts.gstatic.com` para deixar a CSP mais restritiva.

## Como aplicar por provedor

### Vercel

Criar `vercel.json` na raiz:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" }
      ]
    }
  ]
}
```

### Netlify

Criar `public/_headers`:

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=(), usb=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

### Lovable

A plataforma Lovable não documenta uma forma direta de configurar headers customizados. Opções:

1. Abrir ticket de suporte solicitando os headers acima
2. Migrar deploy para Vercel/Netlify mantendo o repositório no GitHub
3. Usar um proxy/CDN na frente (Cloudflare Free aceita headers via Page Rules)

### Cloudflare (qualquer provedor por trás)

Painel: **Rules → Transform Rules → HTTP Response Headers** — adicionar cada header acima.

## Validação

Após aplicar, validar em:

- https://securityheaders.com — alvo: **A+**
- https://observatory.mozilla.org — alvo: **A+**

Se a CSP quebrar carregamento de algum recurso, abrir DevTools → Console → procurar mensagens `Refused to load ... violates the following Content Security Policy directive`. Ajustar a diretiva específica e retestar.

## Roadmap de hardening adicional

- [ ] Migrar `'unsafe-inline'` para nonces dinâmicos no Vite (estudo)
- [ ] Adicionar `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp` se compatível com Supabase Realtime
- [ ] Configurar HSTS preload (https://hstspreload.org) após período de testes
- [ ] Adicionar `Report-To` + `report-uri` da CSP para coletar violações

---

**Histórico de versões**
- v0.1 — 2026-05-25 — referência inicial (Sprint 2 LGPD — sem aplicar)
