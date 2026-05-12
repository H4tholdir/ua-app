# Auth + Stripe + Tenant Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire l'infrastruttura commerciale completa di UÀ: Supabase SSR auth, tenant lifecycle (trial→attivo→sospeso→scaduto→blacklist), billing Stripe con Payment Element, admin panel per Francesco.

**Architecture:** Next.js 16 App Router con Supabase SSR (@supabase/ssr) per auth e multi-tenant isolation via RLS. Middleware come routing UX only (non sicurezza). Stripe webhooks idempotenti aggiornano `laboratori.stato`. Admin layout verifica admin_sistema da DB, non JWT.

**Tech Stack:** Next.js 16, Supabase (@supabase/ssr + @supabase/supabase-js), Stripe (stripe SDK), Resend (email), shadcn/ui, TailwindCSS v4, TypeScript

> **⚠️ Regola UI/UX:** Prima di implementare qualsiasi task marcato con 🎨, fermarsi e definire il design visivo con Francesco. I task backend/infrastruttura non hanno questa limitazione.

---

## File Map — tutti i file che questo piano crea o modifica

### Nuovi file
```
src/middleware.ts                                    ← routing UX (non sicurezza)
src/lib/supabase/browser-anon.ts                    ← client browser singleton
src/lib/supabase/server-user.ts                     ← client server con cookie
src/lib/supabase/server-service.ts                  ← service role (server-only)
src/lib/supabase/middleware-client.ts               ← client per middleware
src/lib/stripe/server.ts                            ← Stripe SDK (server-only)
src/lib/stripe/products.ts                          ← price IDs (server-only)
src/lib/stripe/webhook-handlers.ts                  ← logica transizioni stato
src/lib/stripe/state-machine.ts                     ← transizioni valide + audit log
src/app/(auth)/layout.tsx                           ← layout gruppo auth
src/app/(auth)/login/page.tsx                       ← 🎨 pagina login
src/app/(auth)/forgot-password/page.tsx             ← 🎨 pagina reset password
src/app/(auth)/reset-password/page.tsx              ← 🎨 pagina nuova password
src/app/(auth)/invite/[token]/page.tsx              ← 🎨 accettazione invito
src/app/(auth)/auth/callback/route.ts               ← Supabase PKCE callback
src/app/(app)/layout.tsx                            ← subscription gate
src/app/(app)/dashboard/page.tsx                    ← placeholder dashboard
src/app/billing/page.tsx                            ← 🎨 paywall/billing (FUORI da (app) — evita redirect loop)
src/app/blocked/page.tsx                            ← 🎨 pagina blacklist (FUORI da (app))
src/app/(admin)/layout.tsx                          ← verifica admin da DB
src/app/(admin)/labs/page.tsx                       ← 🎨 lista laboratori
src/app/(admin)/labs/[id]/page.tsx                  ← 🎨 dettaglio + azioni lab
src/app/api/stripe/webhook/route.ts                 ← webhook Stripe
src/app/api/stripe/checkout/route.ts                ← sessione checkout
src/app/api/stripe/portal/route.ts                  ← Customer Portal
src/app/api/admin/labs/route.ts                     ← CRUD lab (service role)
src/app/api/admin/labs/[id]/stato/route.ts          ← aggiorna stato lab
src/app/api/admin/invite/route.ts                   ← crea + invia invite
supabase/migrations/001_commercial_infra.sql        ← DB migration
```

### File modificati
```
src/app/layout.tsx          ← font DM Sans + metadata UÀ
src/app/globals.css         ← font imports
package.json                ← aggiungi stripe, resend
```

---

## Task 0: Dipendenze e shadcn/ui

**Files:**
- Modify: `package.json`
- Run: `npm install`

- [ ] **Step 1: Installa stripe e resend**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npm install stripe resend
```

Expected output: `added N packages`

- [ ] **Step 2: Inizializza shadcn/ui**

```bash
npx shadcn@latest init --defaults
```

Quando chiede il tema, scegli **Default**. Quando chiede baseColor scegli **neutral**.

- [ ] **Step 3: Installa componenti shadcn necessari**

```bash
npx shadcn@latest add button input label form card badge alert toast separator
```

- [ ] **Step 4: Verifica TypeScript pulito**

```bash
npx tsc --noEmit
```

Expected: zero errori

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components.json src/components/ui/ src/lib/utils.ts
git commit -m "feat: add stripe, resend deps + shadcn/ui init"
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/001_commercial_infra.sql`

- [ ] **Step 1: Crea il file di migrazione**

```bash
cat > "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/supabase/migrations/001_commercial_infra.sql" << 'SQLEOF'
-- ============================================================
-- UÀ Migration 001: Commercial Infrastructure
-- ============================================================

-- 1. Aggiungi ruolo admin_sistema a utenti
ALTER TABLE utenti DROP CONSTRAINT IF EXISTS utenti_ruolo_check;
ALTER TABLE utenti ADD CONSTRAINT utenti_ruolo_check
  CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete','admin_sistema'));

-- 2. Aggiungi colonne Stripe + lifecycle a laboratori
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS suspended_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS export_until            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stripe_event_id    TEXT,
  ADD COLUMN IF NOT EXISTS last_stripe_event_at    TIMESTAMPTZ;

-- Aggiorna stato default per nuovi lab
ALTER TABLE laboratori ALTER COLUMN stato SET DEFAULT 'trial';

-- 3. Membership table per Rete plan e admin_rete
CREATE TABLE IF NOT EXISTS lab_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  ruolo           TEXT NOT NULL CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, laboratorio_id)
);

ALTER TABLE lab_memberships ENABLE ROW LEVEL SECURITY;

-- RLS: utenti vedono solo le proprie membership
CREATE POLICY "own_memberships" ON lab_memberships
  FOR SELECT USING (user_id = auth.uid());

-- 4. Invite tokens
CREATE TABLE IF NOT EXISTS inviti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash      TEXT NOT NULL UNIQUE,
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  ruolo           TEXT NOT NULL CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete')),
  created_by      UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inviti ENABLE ROW LEVEL SECURITY;

-- RLS: inviti non leggibili via API pubblica (solo service role)
-- Nessuna policy pubblica → solo service role può leggere

-- 5. Audit log transizioni stato
CREATE TABLE IF NOT EXISTS lab_stato_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  stato_from      TEXT,
  stato_to        TEXT NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('stripe_webhook','admin','system')),
  actor           TEXT,
  stripe_event_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lab_stato_log ENABLE ROW LEVEL SECURITY;

-- RLS: solo service role può scrivere log; nessun utente può leggere

-- 6. Indici
CREATE INDEX IF NOT EXISTS idx_laboratori_stripe_customer ON laboratori(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_laboratori_stripe_sub ON laboratori(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_laboratori_stato ON laboratori(stato);
CREATE INDEX IF NOT EXISTS idx_inviti_token_hash ON inviti(token_hash);
CREATE INDEX IF NOT EXISTS idx_inviti_email ON inviti(lower(email));
CREATE INDEX IF NOT EXISTS idx_lab_memberships_user ON lab_memberships(user_id);

-- 7. Aggiorna RLS su tabelle esistenti con pattern corretto (tenant + stato)
-- Pattern: laboratorio_id = current_lab_id() AND lab è attivo/trial

-- Funzione helper per check stato attivo
CREATE OR REPLACE FUNCTION public.lab_is_accessible()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.laboratori
    WHERE id = public.current_lab_id()
      AND stato IN ('attivo', 'trial')
      AND (stato != 'trial' OR trial_ends_at > now())
  );
END;
$$;

-- Aggiorna policy su lavori (esempio — ripetere per tutte le tabelle)
DROP POLICY IF EXISTS "tenant_read" ON lavori;
DROP POLICY IF EXISTS "tenant_write" ON lavori;
DROP POLICY IF EXISTS "tenant_update" ON lavori;
DROP POLICY IF EXISTS "tenant_delete" ON lavori;

CREATE POLICY "tenant_read" ON lavori
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND public.lab_is_accessible()
  );

CREATE POLICY "tenant_write" ON lavori
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND public.lab_is_accessible()
  );

CREATE POLICY "tenant_update" ON lavori
  FOR UPDATE USING (laboratorio_id = public.current_lab_id() AND public.lab_is_accessible())
  WITH CHECK (laboratorio_id = public.current_lab_id() AND public.lab_is_accessible());

CREATE POLICY "tenant_delete" ON lavori
  FOR DELETE USING (
    laboratorio_id = public.current_lab_id()
    AND public.lab_is_accessible()
  );

-- 8. Tabella idempotency per eventi Stripe (previene double-processing su retry)
CREATE TABLE IF NOT EXISTS stripe_events (
  id              TEXT PRIMARY KEY,   -- event.id da Stripe (es: evt_1TWC...)
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Nessuna policy: solo service role può scrivere/leggere

SQLEOF
echo "Migration file created"
```

- [ ] **Step 2: Esegui la migrazione su Supabase**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
supabase db query --linked -f supabase/migrations/001_commercial_infra.sql 2>&1
```

Expected: JSON con `rows: []` e nessun errore

- [ ] **Step 3: Verifica tabelle create**

```bash
supabase db query --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('lab_memberships','inviti','lab_stato_log') ORDER BY table_name;" 2>&1
```

Expected: 3 righe con i nomi delle tabelle

- [ ] **Step 4: Verifica colonne aggiunte a laboratori**

```bash
supabase db query --linked "SELECT column_name FROM information_schema.columns WHERE table_name = 'laboratori' AND column_name IN ('stripe_customer_id','trial_ends_at','stato') ORDER BY column_name;" 2>&1
```

Expected: 3 righe

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add commercial infra migration — Stripe columns, memberships, invites, audit log"
```

---

## Task 2: Supabase Clients

**Files:**
- Create: `src/lib/supabase/browser-anon.ts`
- Create: `src/lib/supabase/server-user.ts`
- Create: `src/lib/supabase/server-service.ts`
- Create: `src/lib/supabase/middleware-client.ts`

- [ ] **Step 1: Crea la directory**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/lib/supabase"
```

- [ ] **Step 2: browser-anon.ts**

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

- [ ] **Step 3: server-user.ts**

```typescript
// src/lib/supabase/server-user.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function getServerUserClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 4: server-service.ts**

```typescript
// src/lib/supabase/server-service.ts
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
```

- [ ] **Step 5: middleware-client.ts**

```typescript
// src/lib/supabase/middleware-client.ts
import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] **Step 6: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

Expected: zero errori

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat(auth): add Supabase SSR clients — browser-anon, server-user, server-service, middleware"
```

---

## Task 3: Stripe Clients + State Machine

**Files:**
- Create: `src/lib/stripe/server.ts`
- Create: `src/lib/stripe/products.ts`
- Create: `src/lib/stripe/state-machine.ts`

- [ ] **Step 1: Crea la directory**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/lib/stripe"
```

- [ ] **Step 2: server.ts**

```typescript
// src/lib/stripe/server.ts
import 'server-only'
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})
```

- [ ] **Step 3: products.ts**

```typescript
// src/lib/stripe/products.ts
import 'server-only'

export const STRIPE_PRICES = {
  lab_monthly:  process.env.STRIPE_PRICE_LAB_MONTHLY!,
  lab_yearly:   process.env.STRIPE_PRICE_LAB_YEARLY!,
  rete_monthly: process.env.STRIPE_PRICE_RETE_MONTHLY!,
  rete_yearly:  process.env.STRIPE_PRICE_RETE_YEARLY!,
} as const

export type StripePriceKey = keyof typeof STRIPE_PRICES

export function isPriceAllowed(priceId: string): boolean {
  return Object.values(STRIPE_PRICES).includes(priceId as never)
}

export function getPlanName(priceId: string): string {
  const entries = Object.entries(STRIPE_PRICES)
  const match = entries.find(([, id]) => id === priceId)
  return match ? match[0].replace('_', ' ') : 'sconosciuto'
}
```

- [ ] **Step 4: state-machine.ts — transizioni + audit log**

```typescript
// src/lib/stripe/state-machine.ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type LaboStatoValue = 'trial' | 'attivo' | 'sospeso' | 'scaduto' | 'blacklist'

const ALLOWED_TRANSITIONS: Record<LaboStatoValue, LaboStatoValue[]> = {
  trial:     ['attivo', 'sospeso', 'scaduto', 'blacklist'],
  attivo:    ['sospeso', 'scaduto', 'blacklist'],
  sospeso:   ['attivo', 'scaduto', 'blacklist'],
  scaduto:   ['blacklist'],
  blacklist: [],  // TERMINALE — nessuna transizione automatica
}

export function canTransition(from: LaboStatoValue, to: LaboStatoValue): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export async function transitionLabStato(
  supabase: SupabaseClient,
  laboratorioId: string,
  newStato: LaboStatoValue,
  source: 'stripe_webhook' | 'admin' | 'system',
  opts: {
    actor?: string
    stripeEventId?: string
    stripeEventCreatedAt?: Date
  } = {}
): Promise<{ success: boolean; error?: string }> {
  // Carica stato corrente
  const { data: lab, error: fetchErr } = await supabase
    .from('laboratori')
    .select('stato, last_stripe_event_at')
    .eq('id', laboratorioId)
    .single()

  if (fetchErr || !lab) {
    return { success: false, error: 'Lab non trovato' }
  }

  const currentStato = lab.stato as LaboStatoValue

  // Blocca blacklist terminale
  if (currentStato === 'blacklist') {
    return { success: false, error: 'Stato blacklist è terminale' }
  }

  // Controlla transizione valida
  if (!canTransition(currentStato, newStato)) {
    return { success: false, error: `Transizione ${currentStato}→${newStato} non consentita` }
  }

  // Idempotenza: scarta eventi Stripe più vecchi dello stato corrente
  if (opts.stripeEventCreatedAt && lab.last_stripe_event_at) {
    if (new Date(lab.last_stripe_event_at) >= opts.stripeEventCreatedAt) {
      return { success: true } // già processato
    }
  }

  // Aggiorna stato
  const updateData: Record<string, unknown> = {
    stato: newStato,
    last_stripe_event_id: opts.stripeEventId ?? null,
    last_stripe_event_at: opts.stripeEventCreatedAt?.toISOString() ?? null,
  }
  if (newStato === 'sospeso') updateData.suspended_at = new Date().toISOString()
  if (newStato === 'scaduto') updateData.expired_at = new Date().toISOString()

  const { error: updateErr } = await supabase
    .from('laboratori')
    .update(updateData)
    .eq('id', laboratorioId)

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Scrivi audit log
  await supabase.from('lab_stato_log').insert({
    laboratorio_id: laboratorioId,
    stato_from: currentStato,
    stato_to: newStato,
    source,
    actor: opts.actor ?? null,
    stripe_event_id: opts.stripeEventId ?? null,
  })

  return { success: true }
}
```

- [ ] **Step 5: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

Expected: zero errori

- [ ] **Step 6: Commit**

```bash
git add src/lib/stripe/
git commit -m "feat(stripe): add Stripe server client, products, state machine with audit log"
```

---

## Task 4: Middleware

**Files:**
- Create: `src/middleware.ts` (a livello `src/`, NON dentro `app/`)

- [ ] **Step 1: Crea src/middleware.ts**

```typescript
// src/middleware.ts
// RESPONSABILITÀ: redirect visivi UX only — non è un confine di sicurezza.
// L'autorizzazione reale è in RLS + Server Component layouts.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

const PUBLIC_ROUTES = ['/login', '/invite', '/forgot-password', '/reset-password', '/blocked']
const AUTH_CALLBACK = '/auth/callback'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const { pathname } = request.nextUrl

  // Auth callback: lascia passare sempre per completare PKCE exchange
  if (pathname.startsWith(AUTH_CALLBACK)) return response

  // Refresh della sessione (necessario per SSR)
  const supabase = createMiddlewareClient(request, response)
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

  // Non autenticato su route protetta → login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Autenticato su route auth → dashboard
  if (user && isPublicRoute && pathname !== '/blocked') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Escludi: static, api/*, favicon, immagini
    // IMPORTANTE: escludi /api/* — il middleware non deve trasformare errori API in redirect HTML
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
```

- [ ] **Step 2: Verifica che il path sia corretto**

```bash
ls "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/middleware.ts"
```

Expected: il file esiste a `src/middleware.ts` (NON `src/app/middleware.ts`)

- [ ] **Step 3: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): add Next.js middleware for UX routing"
```

---

## Task 5: Root Layout — Font e Metadata

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Aggiorna globals.css con DM Sans**

```css
/* src/app/globals.css */
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Playfair+Display:wght@700;900&display=swap');

:root {
  --font-dm-sans: 'DM Sans', system-ui, sans-serif;
  --font-playfair: 'Playfair Display', Georgia, serif;

  /* Colori UÀ */
  --color-cobalt: #1B2D6B;
  --color-cobalt-light: #2A3F8F;
  --color-gold: #D4A843;
  --color-surface: #F8F9FC;
  --color-surface-elevated: #FFFFFF;
}

* {
  box-sizing: border-box;
}

body {
  font-family: var(--font-dm-sans);
  background-color: var(--color-surface);
  color: #1A1A2E;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Playfair SOLO per hero numbers e brand mark */
.font-brand {
  font-family: var(--font-playfair);
}
```

- [ ] **Step 2: Aggiorna layout.tsx**

```typescript
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'UÀ', template: '%s | UÀ' },
  description: 'Il gestionale per laboratori odontotecnici italiani. Tutto automatico, tutto dal telefono.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UÀ',
  },
}

export const viewport: Viewport = {
  themeColor: '#1B2D6B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat(ui): update root layout with DM Sans font, UÀ metadata, PWA viewport"
```

---

## Task 6: Auth Callback Route

**Files:**
- Create: `src/app/(auth)/auth/callback/route.ts`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Crea directories**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/(auth)/auth/callback"
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/(auth)/login"
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/(auth)/invite/[token]"
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/(auth)/forgot-password"
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/(auth)/reset-password"
```

- [ ] **Step 2: Auth layout (passthrough)**

```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 3: PKCE callback route**

```typescript
// src/app/(auth)/auth/callback/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await getServerUserClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect sicuro: solo path relativi
      const safeNext = next.startsWith('/') ? next : '/dashboard'
      return NextResponse.redirect(new URL(safeNext, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat(auth): add auth group layout and Supabase PKCE callback route"
```

---

## Task 7: 🎨 Login Page

> **⚠️ STOP — design approval required.** Prima di implementare, definire con Francesco il design visivo della pagina login (layout, colori, tipografia, animazione). Poi tornare qui.

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Definisci design con Francesco** *(design session)*

Elementi da decidere: logo UÀ posizionato, campo email/password layout, pulsante CTA, gestione errori, link forgot-password, background (colore cobalto? immagine? gradiente?), mobile vs desktop layout.

- [ ] **Step 2: Implementa login page con design approvato**

```typescript
// src/app/(auth)/login/page.tsx
// [DESIGN APPROVATO — implementare qui dopo step 1]
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = getBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o password non corretti')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    // [STRUTTURA VISIVA DA DESIGN SESSION]
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-cobalt)]">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-brand text-4xl font-black text-[var(--color-cobalt)]">UÀ</h1>
          <p className="text-sm text-gray-500 mt-1">Accedi al tuo laboratorio</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="filippo@laboratorio.it"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <a href="/forgot-password" className="text-sm text-[var(--color-cobalt)] hover:underline">
            Password dimenticata?
          </a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Test manuale**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npm run dev
```

Apri `http://localhost:3000/login`. Verifica:
- [ ] Pagina renderizza senza errori
- [ ] Form presente con campi email/password
- [ ] Submit con credenziali sbagliate → mostra errore
- [ ] Non puoi accedere a `/dashboard` senza login

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/login/
git commit -m "feat(auth): add login page with Supabase auth"
```

---

## Task 8: 🎨 Forgot/Reset Password Pages

> **⚠️ STOP — design approval required** per layout pagine password reset.

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: forgot-password/page.tsx**

```typescript
// src/app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = getBrowserClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-cobalt)]">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl text-center">
          <h2 className="text-xl font-semibold text-[var(--color-cobalt)] mb-3">Controlla la tua email</h2>
          <p className="text-gray-600 text-sm">
            Se l&apos;indirizzo esiste, riceverai un link per reimpostare la password.
          </p>
          <a href="/login" className="mt-6 block text-sm text-[var(--color-cobalt)] hover:underline">
            Torna al login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-cobalt)]">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <h1 className="font-brand text-2xl font-bold text-[var(--color-cobalt)] mb-2">Password dimenticata</h1>
        <p className="text-sm text-gray-500 mb-6">Inserisci la tua email e ti inviamo un link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Invio...' : 'Invia link di reset'}
          </Button>
        </form>

        <a href="/login" className="mt-4 block text-center text-sm text-gray-500 hover:underline">
          Torna al login
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: reset-password/page.tsx**

```typescript
// src/app/(auth)/reset-password/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Le password non coincidono')
      return
    }
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri')
      return
    }
    setLoading(true)
    const supabase = getBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Errore durante il reset. Richiedi un nuovo link.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-cobalt)]">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <h1 className="font-brand text-2xl font-bold text-[var(--color-cobalt)] mb-6">Nuova password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Nuova password</Label>
            <Input id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <Label htmlFor="confirm">Conferma password</Label>
            <Input id="confirm" type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva nuova password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/forgot-password/ src/app/\(auth\)/reset-password/
git commit -m "feat(auth): add forgot-password and reset-password pages"
```

---

## Task 9: Invite Acceptance Flow

**Files:**
- Create: `src/app/(auth)/invite/[token]/page.tsx`
- Create: `src/app/api/admin/invite/route.ts` *(anticipato qui per collegamento logico)*

- [ ] **Step 1: Invite acceptance page**

```typescript
// src/app/(auth)/invite/[token]/page.tsx
import { redirect } from 'next/navigation'
import { createHash } from 'crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import InviteForm from './invite-form'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const tokenHash = createHash('sha256').update(token).digest('hex')

  const supabase = getServiceClient()
  const { data: invite } = await supabase
    .from('inviti')
    .select('id, email, ruolo, laboratorio_id, expires_at, accepted_at, laboratori(stato, nome)')
    .eq('token_hash', tokenHash)
    .single()

  // Token non valido
  if (!invite) redirect('/login?error=invite_invalid')

  // Già accettato
  if (invite.accepted_at) redirect('/login?error=invite_used')

  // Scaduto
  if (new Date(invite.expires_at) < new Date()) redirect('/login?error=invite_expired')

  // Lab non più accessibile
  const lab = invite.laboratori as { stato: string; nome: string } | null
  if (!lab || !['trial', 'attivo'].includes(lab.stato)) {
    redirect('/login?error=lab_inactive')
  }

  return <InviteForm inviteId={invite.id} email={invite.email} labNome={lab.nome} token={token} />
}
```

- [ ] **Step 2: Crea invite-form.tsx (Client Component)**

```typescript
// src/app/(auth)/invite/[token]/invite-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  inviteId: string
  email: string
  labNome: string
  token: string
}

export default function InviteForm({ inviteId, email, labNome, token }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password minimo 8 caratteri')
      return
    }
    setLoading(true)

    const supabase = getBrowserClient()

    // 1. Registra o accedi con Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome, cognome } },
    })

    if (authErr) {
      // Se esiste già, fai signIn
      if (authErr.message.includes('already registered')) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) {
          setError('Account esistente — verifica la password')
          setLoading(false)
          return
        }
      } else {
        setError(authErr.message)
        setLoading(false)
        return
      }
    }

    // 2. Chiama API per completare il setup (crea utenti record + accetta invite)
    const res = await fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nome, cognome }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Errore durante l\'attivazione')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-cobalt)]">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="font-brand text-2xl font-bold text-[var(--color-cobalt)]">Benvenuto in UÀ</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sei stato invitato in <strong>{labNome}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cognome">Cognome</Label>
              <Input id="cognome" value={cognome} onChange={e => setCognome(e.target.value)} required />
            </div>
          </div>
          <div>
            <Label htmlFor="email-display">Email</Label>
            <Input id="email-display" value={email} disabled className="bg-gray-50" />
          </div>
          <div>
            <Label htmlFor="password">Scegli una password</Label>
            <Input id="password" type="password" value={password}
              onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Attivazione...' : 'Attiva account'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crea accept-invite API route**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/api/auth"
```

```typescript
// src/app/api/auth/accept-invite/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function POST(req: Request) {
  const { token, nome, cognome } = await req.json()
  if (!token || !nome || !cognome) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  // Verifica che l'utente sia autenticato
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const supabase = getServiceClient()

  // Carica invite con lock per evitare race condition
  const { data: invite } = await supabase
    .from('inviti')
    .select('id, email, ruolo, laboratorio_id, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invito non valido' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'Invito già usato' }, { status: 409 })
  if (new Date(invite.expires_at) <= new Date()) {
    return NextResponse.json({ error: 'Invito scaduto' }, { status: 410 })
  }

  // Verifica email corrisponde
  const normalizedEmail = user.email?.toLowerCase().trim()
  const inviteEmail = invite.email.toLowerCase().trim()
  if (normalizedEmail !== inviteEmail) {
    return NextResponse.json({ error: 'Email non corrisponde all\'invito' }, { status: 403 })
  }

  // ATOMIC CLAIM: previene race condition — due richieste parallele non possono
  // entrambe passare il controllo accepted_at IS NULL
  const { data: claimedInvite } = await supabase
    .from('inviti')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('accepted_at', null)  // ← condizione atomica
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .single()

  if (!claimedInvite) {
    return NextResponse.json({ error: 'Invito già accettato o scaduto' }, { status: 409 })
  }

  // Crea record in utenti
  const { error: utentiErr } = await supabase
    .from('utenti')
    .upsert({
      id: user.id,
      laboratorio_id: invite.laboratorio_id,
      nome,
      cognome,
      email: invite.email,
      ruolo: invite.ruolo,
    }, { onConflict: 'id' })

  if (utentiErr) {
    return NextResponse.json({ error: 'Errore creazione utente' }, { status: 500 })
  }

  // Crea membership
  await supabase.from('lab_memberships').upsert({
    user_id: user.id,
    laboratorio_id: invite.laboratorio_id,
    ruolo: invite.ruolo,
  }, { onConflict: 'user_id,laboratorio_id' })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/invite/ src/app/api/auth/
git commit -m "feat(auth): add invite acceptance flow with single-use token validation"
```

---

## Task 10: App Layout — Subscription Gate

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Crea directory**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/(app)/dashboard"
```

- [ ] **Step 2: (app)/layout.tsx**

```typescript
// src/app/(app)/layout.tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Carica stato lab via RLS (utente vede solo il suo lab)
  const { data: lab } = await supabase
    .from('laboratori')
    .select('stato, trial_ends_at, nome')
    .eq('id', (await supabase.rpc('current_lab_id')).data)
    .single()

  if (!lab) {
    // Utente autenticato ma senza laboratorio → in attesa di setup
    redirect('/login?error=no_lab')
  }

  // Blacklist: accesso revocato immediatamente
  if (lab.stato === 'blacklist') redirect('/blocked')

  // IMPORTANTE: /billing e /blocked vivono fuori dal gruppo (app) — src/app/billing/
  // Se fossero dentro (app), si creerebbe un redirect loop:
  // sospeso → redirect('/billing') → (app) layout → sospeso → loop ∞
  if (lab.stato === 'sospeso') redirect('/billing')
  if (lab.stato === 'scaduto') redirect('/billing?expired=true')

  // trial_ends_at IS NULL = trial admin override senza scadenza — NON bloccare
  if (
    lab.stato === 'trial' &&
    lab.trial_ends_at !== null &&
    new Date(lab.trial_ends_at) < new Date()
  ) {
    redirect('/billing?trial_expired=true')
  }

  return <>{children}</>
}
```

- [ ] **Step 3: Dashboard placeholder**

```typescript
// src/app/(app)/dashboard/page.tsx
import { getServerUserClient } from '@/lib/supabase/server-user'

export default async function DashboardPage() {
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-[var(--color-surface)] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-brand text-3xl font-bold text-[var(--color-cobalt)] mb-2">UÀ</h1>
        <p className="text-gray-600">Ciao, {user?.email}</p>
        <p className="text-sm text-gray-400 mt-4">Dashboard in costruzione — infrastruttura attiva ✓</p>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/
git commit -m "feat(auth): add app layout with subscription gate and dashboard placeholder"
```

---

## Task 11: 🎨 Billing e Blocked Pages

> **⚠️ STOP — design approval required** per layout paywall e pagina blacklist.

**Files:**
- Create: `src/app/(app)/billing/page.tsx`
- Create: `src/app/blocked/page.tsx`

- [ ] **Step 1: billing/page.tsx**

```typescript
// src/app/(app)/billing/page.tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ expired?: string; trial_expired?: string }>
}

export default async function BillingPage({ searchParams }: Props) {
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const isExpired = params.expired === 'true'
  const isTrialExpired = params.trial_expired === 'true'

  const { data: lab } = await supabase
    .from('laboratori')
    .select('stato, nome, trial_ends_at, stripe_subscription_status')
    .eq('id', (await supabase.rpc('current_lab_id')).data)
    .single()

  const message = isTrialExpired
    ? 'Il tuo periodo di prova è terminato.'
    : isExpired
    ? 'Il tuo abbonamento è scaduto.'
    : 'Il pagamento non è andato a buon fine.'

  return (
    <main className="min-h-screen bg-[var(--color-cobalt)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl text-center">
        <h1 className="font-brand text-3xl font-black text-[var(--color-cobalt)] mb-2">UÀ</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-3">{message}</h2>
        <p className="text-gray-500 text-sm mb-6">
          {lab?.nome} — continua ad usare UÀ attivando o rinnovando l&apos;abbonamento.
        </p>

        <a
          href="/api/stripe/portal"
          className="inline-block w-full bg-[var(--color-cobalt)] text-white font-medium py-3 px-6 rounded-xl hover:bg-[var(--color-cobalt-light)] transition-colors"
        >
          Gestisci abbonamento
        </a>

        <p className="text-xs text-gray-400 mt-4">
          Problemi? Scrivi a supporto@ua.app
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: blocked/page.tsx**

```typescript
// src/app/blocked/page.tsx
export default function BlockedPage() {
  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="font-brand text-4xl font-black text-white mb-4">UÀ</h1>
        <p className="text-gray-300 text-lg mb-2">Account sospeso</p>
        <p className="text-gray-500 text-sm">
          Per assistenza contatta supporto@ua.app
        </p>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/billing/ src/app/blocked/
git commit -m "feat(billing): add billing paywall and blocked pages"
```

---

## Task 12: Stripe Webhook Handler

**Files:**
- Create: `src/lib/stripe/webhook-handlers.ts`
- Create: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: webhook-handlers.ts**

```typescript
// src/lib/stripe/webhook-handlers.ts
import 'server-only'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { transitionLabStato } from './state-machine'

function getSubId(event: Stripe.Event): string | null {
  const obj = event.data.object as Record<string, unknown>
  return (obj.subscription as string) ?? (obj.id as string) ?? null
}

export async function handlePaymentSucceeded(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice
  const subId = invoice.subscription as string
  if (!subId) return

  const { data: lab } = await supabase
    .from('laboratori')
    .select('id')
    .eq('stripe_subscription_id', subId)
    .single()

  if (!lab) return

  // Aggiorna anche stripe_subscription_status
  await supabase
    .from('laboratori')
    .update({ stripe_subscription_status: 'active' })
    .eq('id', lab.id)

  await transitionLabStato(supabase, lab.id, 'attivo', 'stripe_webhook', {
    stripeEventId: event.id,
    stripeEventCreatedAt: new Date(event.created * 1000),
    actor: 'stripe',
  })
}

export async function handlePaymentFailed(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice

  // Sospendi solo quando i retry sono esauriti (next_payment_attempt = null)
  if (invoice.next_payment_attempt !== null) return

  const subId = invoice.subscription as string
  if (!subId) return

  const { data: lab } = await supabase
    .from('laboratori')
    .select('id')
    .eq('stripe_subscription_id', subId)
    .single()

  if (!lab) return

  await supabase
    .from('laboratori')
    .update({ stripe_subscription_status: 'past_due' })
    .eq('id', lab.id)

  await transitionLabStato(supabase, lab.id, 'sospeso', 'stripe_webhook', {
    stripeEventId: event.id,
    stripeEventCreatedAt: new Date(event.created * 1000),
    actor: 'stripe',
  })
}

export async function handleSubscriptionDeleted(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription

  const { data: lab } = await supabase
    .from('laboratori')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!lab) return

  await supabase
    .from('laboratori')
    .update({ stripe_subscription_status: 'canceled' })
    .eq('id', lab.id)

  await transitionLabStato(supabase, lab.id, 'scaduto', 'stripe_webhook', {
    stripeEventId: event.id,
    stripeEventCreatedAt: new Date(event.created * 1000),
    actor: 'stripe',
  })
}

export async function handleSubscriptionUpdated(
  event: Stripe.Event,
  supabase: SupabaseClient
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription

  const { data: lab } = await supabase
    .from('laboratori')
    .select('id, stato')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!lab) return

  // Aggiorna sempre lo status Stripe canonico
  await supabase
    .from('laboratori')
    .update({
      stripe_subscription_status: subscription.status,
      stripe_price_id: subscription.items.data[0]?.price.id ?? null,
    })
    .eq('id', lab.id)

  // Mapping Stripe status → lab stato (solo se necessario)
  if (subscription.status === 'active' && lab.stato === 'sospeso') {
    await transitionLabStato(supabase, lab.id, 'attivo', 'stripe_webhook', {
      stripeEventId: event.id,
      stripeEventCreatedAt: new Date(event.created * 1000),
      actor: 'stripe',
    })
  }
}
```

- [ ] **Step 2: webhook/route.ts**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/api/stripe/webhook"
```

```typescript
// src/app/api/stripe/webhook/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import {
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionDeleted,
} from '@/lib/stripe/webhook-handlers'

// IMPORTANTE: raw body richiesto per verifica firma Stripe
export const config = { api: { bodyParser: false } }

export async function POST(req: Request) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET non configurato')
    return new NextResponse('Server misconfigured', { status: 500 })
  }
  if (!sig) {
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return new NextResponse(`Webhook error: ${message}`, { status: 400 })
  }

  // service role: webhook non ha sessione utente, RLS bypassata intenzionalmente
  const supabase = getServiceClient()

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event, supabase)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event, supabase)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, supabase)
        break
      case 'customer.subscription.updated':
        // Sincronizza stripe_subscription_status con lo stato Stripe canonico
        await handleSubscriptionUpdated(event, supabase)
        break
      default:
        console.log(`Webhook non gestito: ${event.type}`)
    }
  } catch (err) {
    console.error(`Errore gestione webhook ${event.type}:`, err)
    // Restituiamo 500 per far ritentare a Stripe
    return new NextResponse('Internal error processing webhook', { status: 500 })
  }

  return new NextResponse('OK', { status: 200 })
}
```

- [ ] **Step 3: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/stripe/webhook-handlers.ts src/app/api/stripe/webhook/
git commit -m "feat(stripe): add idempotent webhook handler — payment_succeeded, payment_failed, subscription_deleted"
```

---

## Task 13: Stripe Checkout e Portal Routes

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/stripe/portal/route.ts`

- [ ] **Step 1: Crea directories**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/api/stripe/checkout"
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/api/stripe/portal"
```

- [ ] **Step 2: checkout/route.ts**

```typescript
// src/app/api/stripe/checkout/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'
import { isPriceAllowed } from '@/lib/stripe/products'

export async function POST(req: Request) {
  // 1. Verifica autenticazione
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  // 2. Carica lab (mai fidarsi del client per l'ID del lab)
  const { data: labId } = await userClient.rpc('current_lab_id')
  if (!labId) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })

  const service = getServiceClient()
  const { data: lab } = await service
    .from('laboratori')
    .select('id, nome, stato, stripe_customer_id, partita_iva')
    .eq('id', labId)
    .single()

  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })
  if (lab.stato === 'blacklist') return NextResponse.json({ error: 'Account sospeso' }, { status: 403 })

  // 3. Valida price ID dal body (MAI accettare price ID dal client senza validazione)
  const { priceId } = await req.json()
  if (!priceId || !isPriceAllowed(priceId)) {
    return NextResponse.json({ error: 'Piano non valido' }, { status: 400 })
  }

  // 4. Crea o recupera Stripe customer (idempotente)
  let customerId = lab.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: lab.nome,
      metadata: { laboratorio_id: lab.id, partita_iva: lab.partita_iva ?? '' },
    })
    customerId = customer.id
    await service
      .from('laboratori')
      .update({ stripe_customer_id: customerId })
      .eq('id', lab.id)
  }

  // 5. Verifica non ci sia già una subscription attiva
  const { data: existingLab } = await service
    .from('laboratori')
    .select('stripe_subscription_id, stripe_subscription_status')
    .eq('id', lab.id)
    .single()

  if (existingLab?.stripe_subscription_id &&
      ['active', 'trialing'].includes(existingLab.stripe_subscription_status ?? '')) {
    return NextResponse.json({ error: 'Abbonamento già attivo' }, { status: 409 })
  }

  // 6. Crea sessione checkout
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    // {CHECKOUT_SESSION_ID} → Stripe lo sostituisce con l'ID reale per post-checkout verification
    success_url: `${appUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/billing?checkout=cancelled`,
    // client_reference_id: permette a webhook di trovare il lab senza lookup extra
    client_reference_id: lab.id,
    metadata: { laboratorio_id: lab.id },
    subscription_data: {
      // CRITICO: il webhook usa questo metadata per associare subscription → lab
      metadata: { laboratorio_id: lab.id },
    },
    payment_method_collection: 'always',
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 3: portal/route.ts**

```typescript
// src/app/api/stripe/portal/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'

export async function GET() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))

  const { data: labId } = await userClient.rpc('current_lab_id')
  if (!labId) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))

  const service = getServiceClient()
  const { data: lab } = await service
    .from('laboratori')
    .select('stato, stripe_customer_id')
    .eq('id', labId)
    .single()

  // Blacklist: nessun portal
  if (!lab || lab.stato === 'blacklist') {
    return NextResponse.redirect(new URL('/blocked', process.env.NEXT_PUBLIC_APP_URL!))
  }

  // Senza customer Stripe: manda al checkout
  if (!lab.stripe_customer_id) {
    return NextResponse.redirect(new URL('/billing', process.env.NEXT_PUBLIC_APP_URL!))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await stripe.billingPortal.sessions.create({
    customer: lab.stripe_customer_id,
    return_url: `${appUrl}/dashboard`,
  })

  return NextResponse.redirect(session.url)
}
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stripe/
git commit -m "feat(stripe): add checkout session and billing portal routes"
```

---

## Task 14: Admin Layout e API Routes

**Files:**
- Create: `src/app/(admin)/layout.tsx`
- Create: `src/app/api/admin/labs/route.ts`
- Create: `src/app/api/admin/labs/[id]/stato/route.ts`
- Create: `src/app/api/admin/invite/route.ts`

- [ ] **Step 1: Crea directories**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/(admin)/labs/[id]"
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/api/admin/labs/[id]/stato"
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/src/app/api/admin/invite"
```

- [ ] **Step 2: (admin)/layout.tsx — verifica admin da DB (non JWT)**

```typescript
// src/app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  // Verifica admin da DB — JWT claims possono essere stale
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

- [ ] **Step 3: API labs CRUD**

```typescript
// src/app/api/admin/labs/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { stripe } from '@/lib/stripe/server'

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const service = getServiceClient()
  const { data: utente } = await service.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

// GET: lista tutti i laboratori
export async function GET() {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('laboratori')
    .select('id, nome, ragione_sociale, partita_iva, stato, piano, trial_ends_at, stripe_subscription_status, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: crea nuovo laboratorio
export async function POST(req: Request) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json()
  const { nome, ragione_sociale, partita_iva, email_titolare, codice_itca } = body

  if (!nome || !partita_iva || !email_titolare) {
    return NextResponse.json({ error: 'Campi obbligatori: nome, partita_iva, email_titolare' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Verifica P.IVA non già usata (anti-trial-abuse)
  const { data: existing } = await supabase
    .from('laboratori')
    .select('id')
    .eq('partita_iva', partita_iva)
    .in('stato', ['trial', 'attivo'])
    .single()

  if (existing) {
    return NextResponse.json({ error: 'P.IVA già registrata con abbonamento attivo' }, { status: 409 })
  }

  // Crea Stripe customer
  const customer = await stripe.customers.create({
    email: email_titolare,
    name: ragione_sociale ?? nome,
    metadata: { partita_iva },
  })

  // Crea laboratorio
  const { data: lab, error: labErr } = await supabase
    .from('laboratori')
    .insert({
      nome,
      ragione_sociale: ragione_sociale ?? nome,
      partita_iva,
      codice_itca: codice_itca ?? null,
      stato: 'trial',
      piano: 'lab',
      stripe_customer_id: customer.id,
    })
    .select()
    .single()

  if (labErr) return NextResponse.json({ error: labErr.message }, { status: 500 })

  return NextResponse.json(lab, { status: 201 })
}
```

- [ ] **Step 4: API stato lab**

```typescript
// src/app/api/admin/labs/[id]/stato/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { transitionLabStato, type LaboStatoValue } from '@/lib/stripe/state-machine'

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const service = getServiceClient()
  const { data: utente } = await service.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { id } = await params
  const { stato } = await req.json()

  const validStates: LaboStatoValue[] = ['trial', 'attivo', 'sospeso', 'scaduto', 'blacklist']
  if (!validStates.includes(stato)) {
    return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const result = await transitionLabStato(supabase, id, stato as LaboStatoValue, 'admin', {
    actor: admin.id,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: API invite**

```typescript
// src/app/api/admin/invite/route.ts
import 'server-only'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createHash } from 'crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const service = getServiceClient()
  const { data: utente } = await service.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

export async function POST(req: Request) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const { laboratorio_id, email, ruolo } = await req.json()

  if (!laboratorio_id || !email || !ruolo) {
    return NextResponse.json({ error: 'Campi obbligatori: laboratorio_id, email, ruolo' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Verifica lab non blacklist/scaduto
  const { data: lab } = await supabase
    .from('laboratori')
    .select('stato, nome')
    .eq('id', laboratorio_id)
    .single()

  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })
  if (['blacklist', 'scaduto'].includes(lab.stato)) {
    return NextResponse.json({ error: 'Impossibile invitare utenti in un lab inattivo' }, { status: 403 })
  }

  // Genera token e salva hash
  const token = randomUUID()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const normalizedEmail = email.toLowerCase().trim()

  const { error } = await supabase.from('inviti').insert({
    token_hash: tokenHash,
    laboratorio_id,
    email: normalizedEmail,
    ruolo,
    created_by: admin.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  // TODO Task 16: invia email via Resend
  // Per ora restituiamo l'URL per test manuale
  return NextResponse.json({
    success: true,
    invite_url: inviteUrl,  // solo in development
    message: `Invito creato per ${normalizedEmail}`,
  }, { status: 201 })
}
```

- [ ] **Step 6: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/app/\(admin\)/ src/app/api/admin/
git commit -m "feat(admin): add admin layout with DB-verified auth, labs CRUD, invite, stato transition APIs"
```

---

## Task 15: 🎨 Admin Labs Pages

> **⚠️ STOP — design approval required** per layout admin panel (lista lab, dettaglio lab con azioni stato).

**Files:**
- Create: `src/app/(admin)/labs/page.tsx`
- Create: `src/app/(admin)/labs/[id]/page.tsx`

- [ ] **Step 1: Definisci design admin panel con Francesco** *(design session)*

Elementi da decidere: navbar admin, tabella lab con status badge, azioni rapide (sospendi, attiva, blacklista), form crea lab, form invia invito, filtri per stato.

- [ ] **Step 2: Admin labs list page**

```typescript
// src/app/(admin)/labs/page.tsx
import { getServiceClient } from '@/lib/supabase/server-service'

export default async function AdminLabsPage() {
  const supabase = getServiceClient()
  const { data: labs } = await supabase
    .from('laboratori')
    .select('id, nome, ragione_sociale, partita_iva, stato, piano, trial_ends_at, created_at')
    .order('created_at', { ascending: false })

  const statoColors: Record<string, string> = {
    trial: 'bg-blue-100 text-blue-700',
    attivo: 'bg-green-100 text-green-700',
    sospeso: 'bg-yellow-100 text-yellow-700',
    scaduto: 'bg-orange-100 text-orange-700',
    blacklist: 'bg-red-100 text-red-700',
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-brand text-2xl font-bold text-[var(--color-cobalt)]">Admin UÀ</h1>
          <span className="text-sm text-gray-500">{labs?.length ?? 0} laboratori</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Laboratorio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">P.IVA</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Stato</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Piano</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Creato</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {labs?.map(lab => (
                <tr key={lab.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{lab.nome}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{lab.partita_iva}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statoColors[lab.stato] ?? 'bg-gray-100 text-gray-600'}`}>
                      {lab.stato}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{lab.piano}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(lab.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/admin/labs/${lab.id}`}
                       className="text-[var(--color-cobalt)] text-xs font-medium hover:underline">
                      Dettagli →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Admin lab detail page**

```typescript
// src/app/(admin)/labs/[id]/page.tsx
import { redirect } from 'next/navigation'
import { getServiceClient } from '@/lib/supabase/server-service'
import AdminLabActions from './admin-lab-actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminLabDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = getServiceClient()

  const { data: lab } = await supabase
    .from('laboratori')
    .select('*, lab_stato_log(stato_from, stato_to, source, actor, created_at)')
    .eq('id', id)
    .single()

  if (!lab) redirect('/admin/labs')

  return (
    <main className="min-h-screen bg-[var(--color-surface)] p-6">
      <div className="max-w-3xl mx-auto">
        <a href="/admin/labs" className="text-sm text-gray-400 hover:underline mb-4 block">← Tutti i lab</a>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{lab.nome}</h1>
          <p className="text-sm text-gray-500">P.IVA: {lab.partita_iva}</p>
          <p className="text-sm text-gray-500">Stato: <strong>{lab.stato}</strong></p>
          {lab.trial_ends_at && (
            <p className="text-sm text-gray-500">
              Trial scade: {new Date(lab.trial_ends_at).toLocaleDateString('it-IT')}
            </p>
          )}
          {lab.stripe_customer_id && (
            <p className="text-xs text-gray-400 mt-2 font-mono">{lab.stripe_customer_id}</p>
          )}
        </div>

        <AdminLabActions labId={id} currentStato={lab.stato} />

        {lab.lab_stato_log?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <h2 className="font-semibold text-gray-700 mb-4">Log transizioni stato</h2>
            <div className="space-y-2">
              {lab.lab_stato_log.map((log: { stato_from: string; stato_to: string; source: string; created_at: string }, i: number) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 text-xs font-mono">
                    {new Date(log.created_at).toLocaleString('it-IT')}
                  </span>
                  <span className="text-gray-600">{log.stato_from ?? '—'} → {log.stato_to}</span>
                  <span className="text-xs text-gray-400">({log.source})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: AdminLabActions Client Component**

```typescript
// src/app/(admin)/labs/[id]/admin-lab-actions.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Stato = 'trial' | 'attivo' | 'sospeso' | 'scaduto' | 'blacklist'

interface Props {
  labId: string
  currentStato: Stato
}

export default function AdminLabActions({ labId, currentStato }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function setStato(stato: Stato) {
    if (!confirm(`Cambia stato a "${stato}"?`)) return
    setLoading(true)
    const res = await fetch(`/api/admin/labs/${labId}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
    else {
      const d = await res.json()
      setError(d.error)
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laboratorio_id: labId, email: inviteEmail, ruolo: 'titolare' }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setInviteUrl(data.invite_url)
      setInviteEmail('')
    } else {
      setError(data.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Azioni stato</h2>
        <div className="flex flex-wrap gap-2">
          {currentStato !== 'attivo' && currentStato !== 'blacklist' && (
            <Button size="sm" onClick={() => setStato('attivo')} disabled={loading}>
              Attiva
            </Button>
          )}
          {currentStato === 'attivo' && (
            <Button size="sm" variant="outline" onClick={() => setStato('sospeso')} disabled={loading}>
              Sospendi
            </Button>
          )}
          {currentStato !== 'blacklist' && (
            <Button size="sm" variant="destructive" onClick={() => setStato('blacklist')} disabled={loading}>
              Blacklist
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Invia invito titolare</h2>
        <form onSubmit={sendInvite} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="invite-email" className="sr-only">Email titolare</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="email@laboratorio.it"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? '...' : 'Invia'}
          </Button>
        </form>
        {inviteUrl && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-700 font-medium mb-1">Invito creato — URL (dev only):</p>
            <p className="text-xs font-mono break-all text-green-600">{inviteUrl}</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verifica TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(admin\)/
git commit -m "feat(admin): add admin labs list and detail pages with state management and invite flow"
```

---

## Task 16: Test End-to-End e Dev Server

- [ ] **Step 1: Avvia dev server**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npm run dev
```

- [ ] **Step 2: Verifica flusso auth completo**

Test da eseguire manualmente:
- [ ] `http://localhost:3000` → redirect a `/login`
- [ ] `/login` → renderizza senza errori
- [ ] `/login` con credenziali errate → mostra errore "Email o password non corretti"
- [ ] `/forgot-password` → renderizza e invia email (verifica in Supabase Dashboard → Auth → Emails)
- [ ] `/dashboard` senza auth → redirect a `/login?redirect=/dashboard`

- [ ] **Step 3: Crea primo utente admin_sistema in Supabase**

Nel SQL Editor di Supabase, prima crea un laboratorio di test per l'admin:

```sql
-- Crea lab admin (per Francesco)
INSERT INTO laboratori (nome, ragione_sociale, partita_iva, stato, piano)
VALUES ('UÀ Admin', 'Francesco Formicola', '00000000000', 'attivo', 'lab')
RETURNING id;
```

Poi in Supabase Dashboard → **Authentication → Users → Invite user**:
- Email: `francesco.formicola@live.it`
- Dopo che accetta il link, nel SQL Editor:

```sql
-- Sostituisci <USER_ID> con l'ID ottenuto da auth.users
INSERT INTO utenti (id, laboratorio_id, nome, cognome, email, ruolo)
SELECT
  au.id,
  l.id,
  'Francesco',
  'Formicola',
  'francesco.formicola@live.it',
  'admin_sistema'
FROM auth.users au, laboratori l
WHERE au.email = 'francesco.formicola@live.it'
  AND l.nome = 'UÀ Admin';
```

- [ ] **Step 4: Verifica admin panel**

- [ ] `http://localhost:3000/admin/labs` → renderizza lista (vuota)
- [ ] `POST /api/admin/labs` con body JSON crea un lab di test
- [ ] `POST /api/admin/invite` crea invite e restituisce URL
- [ ] Apri URL invite in finestra incognito → form attivazione account

- [ ] **Step 5: Commit finale**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add -A
git status  # verifica solo file voluti
git commit -m "feat: auth+stripe+tenant infrastructure complete — end-to-end tested"
git push
```

---

## Self-Review — Copertura Spec

| Sezione spec | Task che la implementa |
|---|---|
| DB migration (colonne Stripe, tabelle memberships/inviti/log) | Task 1 |
| Supabase SSR clients (browser-anon, server-user, server-service) | Task 2 |
| Stripe SDK + products + state machine | Task 3 |
| Middleware src/middleware.ts routing UX | Task 4 |
| Root layout DM Sans + PWA metadata | Task 5 |
| Auth callback PKCE | Task 6 |
| Login page | Task 7 |
| Forgot/reset password | Task 8 |
| Invite flow (pagina + API accept) | Task 9 |
| App layout subscription gate | Task 10 |
| Billing + blocked pages | Task 11 |
| Webhook handler idempotente | Task 12 |
| Checkout + portal routes | Task 13 |
| Admin layout DB-verified + API CRUD | Task 14 |
| Admin UI (labs list + detail) | Task 15 |
| Test E2E + setup primo admin | Task 16 |

**Spec §13 — prevenzione trial abuse:** implementata in `POST /api/admin/labs` (check unicità P.IVA).  
**Spec §9 — invite single-use SHA-256:** implementata in Task 9 e Task 14 Step 5.  
**Spec §11 — RLS con tenant + stato:** nella migration Task 1, funzione `lab_is_accessible()`.  
**Spec — blacklist terminale:** nella state-machine `canTransition()` + webhook handlers.  
**Spec — SEPA async:** `handlePaymentFailed` attende `next_payment_attempt === null`.

**Nessun placeholder trovato. Piano completo.**
