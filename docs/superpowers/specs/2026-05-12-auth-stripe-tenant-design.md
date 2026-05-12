# UÀ — Auth + Stripe + Tenant Infrastructure
## Design Spec v1.0

**Data:** 2026-05-12  
**Autore:** Francesco Formicola + Claude Code  
**Adversarial review:** Codex (49 issues trovati e risolti)  
**Modulo:** Infrastruttura commerciale — Fase 1  
**Status:** Approvato per implementazione

---

## 1. Obiettivo

Costruire l'infrastruttura commerciale completa di UÀ: autenticazione SSR, gestione tenant multi-stato, billing Stripe con tutti i metodi di pagamento, e admin panel per Francesco. **Built right first time** — nessun placeholder, nessuna riscrittura prevista.

---

## 2. Prodotto — Decisioni definitive

### Piani
| Piano | Prezzo mensile | Prezzo annuale | Per chi |
|-------|---------------|----------------|---------|
| **Lab** | €49/mese | €490/anno (2 mesi gratis) | 1 laboratorio, utenti illimitati, tutte le feature |
| **Rete** | €149/mese | €1.490/anno (2 mesi gratis) | N laboratori, dashboard admin_rete centralizzata |
| Trial | Gratis 30gg | — | Nessuna carta di credito richiesta |
| Migrazione dati | €299 / €599 | One-time | Servizio professionale separato |

### Metodi di pagamento (Stripe Payment Element)
- Carte di credito/debito (Visa, Mastercard, Amex)
- SEPA Direct Debit (addebito automatico — **async, attivazione solo a conferma**)
- Apple Pay (auto su Safari/iOS)
- Google Pay (auto su Chrome/Android)

### Marketing anchor
> *"UÀ costa meno di una fresa Komet al mese. E lavora al posto tuo 24 ore su 24."*

---

## 3. Architettura

### 3.1 Struttura directory

```
src/
├── middleware.ts                    ← ROOT (non in app/) — routing UX only
│
├── app/
│   ├── (auth)/                      ← gruppo: pagine pubbliche auth
│   │   ├── login/page.tsx
│   │   ├── invite/[token]/page.tsx  ← accettazione invito (non signup libero)
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── auth/callback/route.ts   ← Supabase PKCE callback (escluso da middleware)
│   │
│   ├── (app)/                       ← gruppo: app protetta
│   │   ├── layout.tsx               ← Server Component: verifica auth + stato lab
│   │   ├── dashboard/page.tsx
│   │   ├── billing/page.tsx         ← accessibile anche in stato 'sospeso'
│   │   └── ...
│   │
│   ├── (admin)/                     ← gruppo: solo Francesco
│   │   ├── layout.tsx               ← Server Component: verifica admin_sistema da DB
│   │   ├── labs/page.tsx
│   │   ├── labs/[id]/page.tsx
│   │   └── billing/page.tsx
│   │
│   └── api/
│       ├── stripe/
│       │   ├── webhook/route.ts     ← Stripe → Supabase (raw body, firma verificata)
│       │   ├── checkout/route.ts    ← crea sessione checkout
│       │   └── portal/route.ts      ← Customer Portal (solo tenant attivo/sospeso)
│       └── admin/
│           ├── labs/route.ts        ← CRUD lab (service role, admin only)
│           └── invite/route.ts      ← crea + invia invite
│
└── lib/
    ├── supabase/
    │   ├── browser-anon.ts          ← client browser (publishable key)
    │   ├── server-user.ts           ← server client (cookie session)
    │   ├── server-service.ts        ← service role (import 'server-only')
    │   └── middleware.ts            ← middleware client
    └── stripe/
        ├── server.ts                ← Stripe SDK (import 'server-only')
        ├── products.ts              ← price IDs Lab/Rete (server-only)
        └── webhook-handlers.ts      ← handler per ogni event type
```

### 3.2 Principio di sicurezza fondamentale

```
MIDDLEWARE = routing UX (redirect visivi)
RLS + SERVER ACTIONS = autorizzazione reale

Non fidarsi mai di:
- JWT claims per autorizzazione admin (usare come hint, verificare da DB)
- Middleware per proteggere dati
- Parametri client per price IDs o customer IDs
```

---

## 4. Database — Aggiunte allo schema esistente

```sql
-- Aggiunte alla tabella laboratori (già esistente)
ALTER TABLE laboratori ADD COLUMN IF NOT EXISTS
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  stripe_price_id         TEXT,           -- 'price_lab_monthly' | 'price_rete_monthly' | ecc.
  stripe_subscription_status TEXT,        -- mirror dello stato Stripe canonico
  trial_ends_at           TIMESTAMPTZ,
  suspended_at            TIMESTAMPTZ,
  expired_at              TIMESTAMPTZ,
  deletion_scheduled_at   TIMESTAMPTZ,
  export_until            TIMESTAMPTZ,
  last_stripe_event_id    TEXT,           -- idempotenza webhook
  last_stripe_event_at    TIMESTAMPTZ;

-- Membership table per admin_rete e Rete plan (non FK singola su utenti)
CREATE TABLE lab_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  ruolo           TEXT NOT NULL CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, laboratorio_id)
);

-- Invite tokens (hashed, single-use, expiring)
CREATE TABLE inviti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash      TEXT NOT NULL UNIQUE,   -- SHA-256 del token inviato via email
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id),
  email           TEXT NOT NULL,           -- email normalizzata
  ruolo           TEXT NOT NULL,
  created_by      UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transizioni di stato audit log
CREATE TABLE lab_stato_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id),
  stato_from      TEXT,
  stato_to        TEXT NOT NULL,
  source          TEXT NOT NULL,   -- 'stripe_webhook' | 'admin' | 'system'
  actor           TEXT,            -- user_id o 'stripe'
  stripe_event_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.1 Transizioni di stato valide

```
             ┌──────────┐
             │  trial   │──────────────────────────────┐
             └──────────┘                              │
                  │ checkout completato                │ trial scaduto
                  ▼                                    ▼
             ┌──────────┐    pagamento fallisce   ┌──────────┐
             │  attivo  │────────────────────────▶│ sospeso  │
             └──────────┘                         └──────────┘
                  │                                    │
                  │ Francesco blacklista               │ 30gg sospeso
                  ▼                                    ▼
             ┌──────────┐                        ┌──────────┐
             │blacklist │                        │ scaduto  │
             └──────────┘                        └──────────┘

Regole:
- blacklist è TERMINALE: nessun webhook, nessun pagamento può uscirne
- Stripe webhooks NON gestiscono blacklist (solo Francesco via admin)
- SEPA pending → attivo solo su invoice.payment_succeeded (non su subscription.created)
- trial → scaduto: job schedulato ogni ora verifica trial_ends_at < now()
```

---

## 5. Supabase SSR — Client

### 5.1 browser-anon.ts
```typescript
// src/lib/supabase/browser-anon.ts
import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
```

### 5.2 server-user.ts
```typescript
// src/lib/supabase/server-user.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getServerUserClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(),
                 setAll: (cs) => cs.forEach(({ name, value, options }) =>
                   cookieStore.set(name, value, options)) } }
  )
}
```

### 5.3 server-service.ts
```typescript
// src/lib/supabase/server-service.ts
import 'server-only'              // ← non importabile da browser
import { createClient } from '@supabase/supabase-js'

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
```

---

## 6. Middleware (src/middleware.ts — routing UX only)

```typescript
// Responsabilità: redirect visivi SOLO
// Non è un confine di sicurezza — RLS è il confine reale

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  // Auth callback: mai toccare
  if (pathname.startsWith('/auth/callback')) return response

  const supabase = createServerClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser()

  // Non autenticato → login (eccetto route pubbliche)
  const isPublicRoute = pathname.startsWith('/login') || 
                        pathname.startsWith('/invite') ||
                        pathname.startsWith('/forgot-password')
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Autenticato su route auth → dashboard
  if (user && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
  // NB: stato lab, ruolo admin, subscription gate → verificati nei layout Server Components
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook).*)'],
}
```

---

## 7. Stripe Integration

### 7.1 server.ts
```typescript
// src/lib/stripe/server.ts
import 'server-only'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})
```

### 7.2 products.ts
```typescript
// src/lib/stripe/products.ts
import 'server-only'

export const STRIPE_PRICES = {
  lab_monthly:   process.env.STRIPE_PRICE_LAB_MONTHLY!,
  lab_yearly:    process.env.STRIPE_PRICE_LAB_YEARLY!,
  rete_monthly:  process.env.STRIPE_PRICE_RETE_MONTHLY!,
  rete_yearly:   process.env.STRIPE_PRICE_RETE_YEARLY!,
} as const

export type StripePriceKey = keyof typeof STRIPE_PRICES

export function isPriceAllowed(priceId: string): boolean {
  return Object.values(STRIPE_PRICES).includes(priceId as any)
}
```

### 7.3 Webhook handler — idempotente e ordinato

```typescript
// src/app/api/stripe/webhook/route.ts
import 'server-only'
import { stripe } from '@/lib/stripe/server'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function POST(req: Request) {
  // 1. Verifica firma su raw body (non JSON parsato)
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  
  if (!secret) return new Response('Missing webhook secret', { status: 500 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  // 2. Idempotenza: scarta eventi già processati
  const supabase = getServiceClient()
  const { data: lab } = await supabase
    .from('laboratori')
    .select('id, stato, last_stripe_event_at')
    .eq('stripe_subscription_id', getSubscriptionId(event))
    .single()

  if (lab?.last_stripe_event_at && 
      new Date(lab.last_stripe_event_at) >= new Date(event.created * 1000)) {
    return new Response('Already processed', { status: 200 })
  }

  // 3. Gestione per tipo evento
  await handleStripeEvent(event, supabase)
  
  return new Response('OK', { status: 200 })
}

async function handleStripeEvent(event: Stripe.Event, supabase: any) {
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'trial':    ['attivo', 'scaduto', 'blacklist'],
    'attivo':   ['sospeso', 'scaduto', 'blacklist'],
    'sospeso':  ['attivo', 'scaduto', 'blacklist'],
    'scaduto':  ['blacklist'],
    'blacklist': [],  // TERMINALE
  }

  switch (event.type) {
    case 'invoice.payment_succeeded':
      await transitionStato('attivo', event, supabase, ALLOWED_TRANSITIONS)
      break
    case 'invoice.payment_failed':
      // Solo dopo Smart Retry esauriti (subscription.status = past_due)
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.next_payment_attempt === null) {
        await transitionStato('sospeso', event, supabase, ALLOWED_TRANSITIONS)
      }
      break
    case 'customer.subscription.deleted':
      await transitionStato('scaduto', event, supabase, ALLOWED_TRANSITIONS)
      break
  }
}
```

---

## 8. Admin Panel — Funzionalità

### Layout server (verifica DB, non solo JWT)
```typescript
// src/app/(admin)/layout.tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica da DB (non JWT claims che possono essere stale)
  const service = getServiceClient()
  const { data: utente } = await service
    .from('utenti')
    .select('ruolo')
    .eq('id', user.id)
    .single()

  if (utente?.ruolo !== 'admin_sistema') redirect('/dashboard')
  
  return <>{children}</>
}
```

### Azioni admin disponibili
| Azione | Endpoint | Note |
|--------|----------|------|
| Crea laboratorio | `POST /api/admin/labs` | Crea lab + Stripe customer + invia invite |
| Invita titolare | `POST /api/admin/invite` | Token hash SHA-256, scadenza 7gg |
| Imposta stato | `PATCH /api/admin/labs/[id]/stato` | Solo transizioni valide; blacklist → terminale |
| Visualizza labs | `GET /api/admin/labs` | Lista con stato, pagamento, last login |
| Override trial | `PATCH /api/admin/labs/[id]/trial` | Estende trial manualmente con audit log |

---

## 9. Invite Flow

```
Francesco → POST /api/admin/invite →
  1. Verifica lab non blacklist/scaduto
  2. Genera token random (crypto.randomUUID())
  3. Salva SHA-256(token) in inviti table
  4. Invia email con link: /invite/[token]
  5. Link valido 7 giorni, single-use

Titolare → GET /invite/[token] →
  1. Verifica token hash, scadenza, accepted_at IS NULL
  2. Verifica laboratorio.stato IN ('trial','attivo')
  3. Supabase: signUp o signIn con email
  4. Crea record in utenti e lab_memberships
  5. Marca invite come accepted_at = now()
  6. Redirect → /dashboard
```

---

## 10. Subscription Gate (layout app protetta)

```typescript
// src/app/(app)/layout.tsx — Server Component
export default async function AppLayout({ children }) {
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carica lab state con RLS (user vede solo il suo lab)
  const { data: lab } = await supabase
    .from('laboratori')
    .select('stato, trial_ends_at, suspension_at')
    .eq('id', supabase.rpc('current_lab_id'))  // usa RLS, non parametro client
    .single()

  if (!lab) redirect('/login')
  
  if (lab.stato === 'blacklist') redirect('/blocked')
  if (lab.stato === 'sospeso') redirect('/billing')
  if (lab.stato === 'scaduto') redirect('/billing?expired=true')
  
  // trial scaduto ma non ancora aggiornato dal job
  if (lab.stato === 'trial' && 
      lab.trial_ends_at && 
      new Date(lab.trial_ends_at) < new Date()) {
    redirect('/billing?trial_expired=true')
  }

  return <>{children}</>
}
```

---

## 11. RLS — Pattern corretto per ogni tabella

```sql
-- Template da applicare a OGNI tabella con dati lab
-- Deve avere ENTRAMBE le condizioni: tenant + stato

CREATE POLICY "tenant_read" ON <tabella>
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND EXISTS (
      SELECT 1 FROM laboratori
      WHERE id = public.current_lab_id()
        AND stato IN ('attivo', 'trial')
        AND (stato != 'trial' OR trial_ends_at > now())
    )
  );

CREATE POLICY "tenant_write" ON <tabella>
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND EXISTS (
      SELECT 1 FROM laboratori
      WHERE id = public.current_lab_id()
        AND stato IN ('attivo', 'trial')
        AND (stato != 'trial' OR trial_ends_at > now())
    )
  );

-- billing/export: accessibile anche in 'sospeso' (solo le proprie fatture UÀ)
CREATE POLICY "billing_read_sospeso" ON ua_subscriptions
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND EXISTS (
      SELECT 1 FROM laboratori
      WHERE id = public.current_lab_id()
        AND stato IN ('attivo', 'trial', 'sospeso')
    )
  );
```

---

## 12. Variabili d'ambiente aggiuntive

```bash
# .env.local — aggiunte rispetto a quanto già presente
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LAB_MONTHLY=price_...
STRIPE_PRICE_LAB_YEARLY=price_...
STRIPE_PRICE_RETE_MONTHLY=price_...
STRIPE_PRICE_RETE_YEARLY=price_...
STRIPE_PUBLISHABLE_KEY=pk_live_...   # NEXT_PUBLIC_

# Email (Resend per transazionale)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@ua.app
```

---

## 13. Prevenzione trial abuse

Il campo `partita_iva` già presente in `laboratori` è il gate naturale:
- Il titolare inserisce P.IVA durante l'onboarding
- Sistema verifica unicità P.IVA su laboratori attivi/trial
- Stesso P.IVA → messaggio "Il tuo laboratorio esiste già, contattaci"
- Francesco ha visibilità sulla lista P.IVA nel panel admin

---

## 14. Checklist pre-implementazione

- [ ] Creare i 4 price IDs su Stripe dashboard (Lab monthly/yearly, Rete monthly/yearly)
- [ ] Configurare Stripe webhook endpoint in dashboard → `POST /api/stripe/webhook`
- [ ] Copiare webhook secret in `.env.local`
- [ ] Aggiungere colonne mancanti a `laboratori` (via Supabase SQL editor)
- [ ] Creare tabelle `lab_memberships`, `inviti`, `lab_stato_log`
- [ ] Aggiornare RLS policies esistenti con pattern corretto (tenant + stato)
- [ ] Aggiungere `admin_sistema` come ruolo speciale in `utenti.ruolo` CHECK constraint
- [ ] Configurare Resend per email transazionale
- [ ] Verifica domain Apple Pay/Google Pay su Stripe

---

*Spec review by Codex adversarial reviewer — 49 issues found and addressed.*
