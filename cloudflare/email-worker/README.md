# UÀ — PEC Email Verification Worker

Cloudflare Email Worker che riceve le email di verifica PEC e chiama il callback Next.js.

## Deploy

```bash
cd cloudflare/email-worker

# Login (una volta sola)
npx wrangler login

# Imposta il secret (interattivo)
npx wrangler secret put INTERNAL_SECRET
# → incolla il valore da .env.local (INTERNAL_SECRET=...)

# Deploy
npx wrangler deploy
```

## Configurazione Cloudflare

Dashboard Cloudflare → uachelab.com → Email → Email Routing:
1. Enable Email Routing
2. Custom addresses → Add → verify+* → Send to Worker → ua-pec-verify
