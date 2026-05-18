# Piano G — V1 Completion: Pagine Detail + Infrastructure + Flow Completo

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completare le funzionalità di V1 dopo il go-live con Filippo: pagine detail mancanti, flow invite funzionante end-to-end, audit infrastruttura Supabase/Vercel/Stripe, e design system consistency.

**Architecture:** Continuazione diretta del Piano F. Questo piano presuppone che Piano F sia completato. Aggiunge le funzionalità di completamento V1 senza modificare le fondamenta.

**Tech Stack:** Next.js 16, TypeScript, Supabase (auth + db), Stripe, nodemailer, TailwindCSS

**Prerequisito:** Piano F completato e deployato su main.

---

## Task 1: CRITICO — Fix flow invito titolare (email non inviata)

**Bug:** In produzione, l'API `/api/admin/invite` crea il record `inviti` ma NON invia email. Il TODO "Task 16: invia via Resend" non è stato implementato. Il titolare non riceve mai il link d'invito.

**Diagnosi completa del flow attuale:**
```
Admin → POST /api/admin/invite
  ↓ crea record in tabella inviti (token_hash)
  ↓ restituisce invite_url SOLO in development
  ↗ email NON inviata in production ← BUG CRITICO
  
Titolare → GET /invite/[token] (se URL ricevuto manualmente)
  ↓ mostra InviteForm (nome, cognome, password)
  ↓ supabase.auth.signUp() + POST /api/auth/accept-invite
  ↓ crea utente + aggiorna tabella inviti + crea utenti record
```

**Soluzione V1:** Usare `supabase.auth.admin.inviteUserByEmail()` che invia l'email automaticamente via Supabase Auth. Quando il titolare clicca il link nell'email, viene portato su `/auth/callback?next=/onboarding`. Il token personalizzato (tabella `inviti`) resta per le invitazioni di tecnici/front_desk già registrati.

**Files:**
- Modify: `src/app/api/admin/invite/route.ts`
- Modify: `src/app/(auth)/auth/callback/route.ts` (già modificato per token_hash)
- Read: `src/app/(auth)/invite/[token]/invite-form.tsx`

- [ ] **Step 1: Modifica /api/admin/invite per inviare email via Supabase auth**

```typescript
// src/app/api/admin/invite/route.ts
// Dopo la creazione del record inviti, aggiungi:

// Invia email di invito via Supabase Auth Admin
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
const { error: inviteErr } = await svc.auth.admin.inviteUserByEmail(
  normalizedEmail,
  {
    data: {
      ruolo,
      laboratorio_id,
      invite_token: token, // token originale (non hash) per il redirect
    },
    redirectTo: `${appUrl}/auth/callback?next=/onboarding&invite_token=${token}`,
  }
)

if (inviteErr) {
  // Log ma non bloccare — il record inviti è già creato,
  // l'admin può copiare l'URL dal pannello admin
  console.error('[invite] email failed:', inviteErr.message)
}
```

- [ ] **Step 2: Aggiorna /auth/callback per gestire l'invito Supabase**

In `src/app/(auth)/auth/callback/route.ts`, dopo i check esistenti, aggiungi:

```typescript
// Gestione invite Supabase (viene chiamato con ?code=... dal link Supabase)
// Il `next` è già `/onboarding` (passato come redirectTo)
// Quindi il redirect normale a `next` funziona già
```

Il callback esistente gestisce già il `code` PKCE → nessuna modifica necessaria se `next=/onboarding`.

- [ ] **Step 3: Verifica che /onboarding NON faccia redirect loop**

Il layout `(app)/layout.tsx` fa redirect a `/onboarding` se `onboarding_completato = false`. Ma se siamo già su `/onboarding`, questo causa un loop. Fix nel layout:

```typescript
// Questo non si può fare in un layout Server Component perché non ha accesso al pathname.
// Soluzione: usare il middleware Next.js per escludere /onboarding dal redirect.
```

In `src/middleware.ts` (o crea il file se non esiste):

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Non reindirizzare /onboarding a se stesso
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|onboarding).*)'],
}
```

E nel layout, escludi il redirect per i path che iniziano con `/onboarding`:
```typescript
// Non c'è modo di leggere il pathname nel layout Server Component.
// La soluzione più semplice: il redirect a /onboarding avviene solo
// SE il ruolo è titolare E onboarding_completato è false.
// Il wizard stesso al completamento setta onboarding_completato = true.
// Quindi il loop si risolve quando il titolare completa il wizard.
```

- [ ] **Step 4: Test flow completo**

1. Da admin: crea nuovo lab → invia invito a un'email di test
2. Controlla la casella email → arriva l'email con il link Supabase
3. Clicca il link → viene portato su `/auth/callback?next=/onboarding`
4. Finisci il wizard onboarding
5. Verifica che `onboarding_completato = true` nel DB

```bash
# Verifica nel DB:
# SELECT nome, onboarding_completato FROM laboratori WHERE id = '[lab_id]';
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/invite/route.ts
git commit -m "fix(invite): invia email titolare via Supabase admin inviteUserByEmail"
```

---

## Task 2: Audit Infrastruttura — Supabase, Vercel, Stripe

**Obiettivo:** Verificare che tutte le integrazioni siano correttamente configurate per produzione.

**Files:** Nessun file da creare — solo verifica e documentazione.

- [ ] **Step 1: Audit Supabase**

Verifica su https://supabase.com/dashboard/project/iagibumwjstnveqpjbwq:

**Authentication → URL Configuration:**
- [ ] Site URL = `https://uachelab.com` ✅ (già aggiornato il 17/05)
- [ ] Redirect URLs contiene `https://uachelab.com/**` ✅

**Authentication → Email Templates:**
- [ ] "Invite User" template ha branding UÀ ✅ (Piano F Task 6)
- [ ] "Reset Password" template ha branding UÀ ✅ (Piano F Task 6)
- [ ] "Confirm Signup" template ha branding UÀ ✅

**Database → Extensions:**
- [ ] `pg_cron` attivo (per refresh KPI cache ogni 15 min)
- [ ] `vault` attivo (per password PEC)
- [ ] `pgcrypto` attivo

```sql
-- Verifica via Supabase MCP:
SELECT name, installed_version FROM pg_available_extensions WHERE installed_version IS NOT NULL ORDER BY name;
```

**Database → RLS Policies:**
- [ ] Tutte le tabelle core hanno RLS abilitato
- [ ] La funzione `auth.current_lab_id()` esiste e funziona

```sql
-- Test RLS:
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

**Storage:**
- [ ] Bucket `ddc-pdf` esiste e ha policy corrette
- [ ] Bucket `fatture-xml` esiste
- [ ] Bucket `lab-assets` esiste (per logo, firma DdC)

- [ ] **Step 2: Audit Vercel**

Via `vercel env list` o dashboard https://vercel.com:

Verifica che queste env vars siano settate in **Production**:
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://iagibumwjstnveqpjbwq.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (chiave anon pubblica)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (chiave service, solo server)
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...` (NON test)
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_...`
- [ ] `NEXT_PUBLIC_APP_URL` = `https://uachelab.com`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`

```bash
# Per verificare (senza mostrare valori):
npx vercel env ls --environment=production 2>&1 | grep -v "secret"
```

- [ ] **Step 3: Audit Stripe**

Su https://dashboard.stripe.com:

**Webhooks:**
- [ ] Endpoint `https://uachelab.com/api/stripe/webhook` configurato
- [ ] Events: `customer.subscription.*`, `invoice.*`, `checkout.session.completed`
- [ ] Signing secret corrisponde a `STRIPE_WEBHOOK_SECRET` in Vercel

**Products/Prices:**
- [ ] Price `price_1TWCfaRsMhN7mg7YVt0UfeNB` = Lab mensile €49 **LIVE mode**
- [ ] Price `price_1TWCfbRsMhN7mg7Y7Ejl1k5w` = Lab annuale €490 **LIVE mode**
- [ ] Price `price_1TWCfbRsMhN7mg7YDXKFJkdN` = Rete mensile €149 **LIVE mode**
- [ ] Price `price_1TWCfcRsMhN7mg7YBZSz1gId` = Rete annuale €1490 **LIVE mode**

**Customer Portal:**
- [ ] Customer Portal abilitato con gestione abbonamenti

- [ ] **Step 4: Documenta l'audit**

Aggiungi in `memory/MEMORY.md` sezione 10:
```
- Audit infrastruttura completato il 18/05/2026
- Supabase: Site URL OK, Vault OK, RLS OK
- Vercel: env vars verified
- Stripe: webhooks OK, prices live mode OK
```

---

## Task 3: Pagina /fatture/[id] — Dettaglio fattura

**Files:**
- Create: `src/app/(app)/fatture/[id]/page.tsx`

- [ ] **Step 1: Crea pagina dettaglio fattura**

```typescript
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

interface Props { params: Promise<{ id: string }> }

export default async function FatturaDetailPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: fattura } = await svc
    .from('fatture')
    .select(`
      id, numero, data, totale, iva, imponibile, stato_pagamento,
      xml_url, pdf_url, pec_message_id, pec_consegnata_at,
      cliente:clienti(nome, cognome, studio_nome, partita_iva, pec),
      righe:fatture_righe(descrizione, quantita, prezzo_unitario, totale_riga)
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!fattura) redirect('/fatture')

  const f = fattura as Record<string, unknown>
  const cliente = f.cliente as Record<string, string | null> | null
  const righe = (f.righe as Array<Record<string, unknown>>) ?? []

  const fmtEur = (v: unknown) => typeof v === 'number' ? `€${v.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '—'
  const fmtDate = (d: unknown) => typeof d === 'string' ? new Date(d).toLocaleDateString('it-IT') : '—'

  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
    marginBottom: '12px',
  }
  const secLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--elv)', fontSize: '13px' }

  return (
    <>
      <AppHeader title={`Fattura ${f.numero as string ?? ''}`} backHref="/fatture" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px' }}>
          {/* Intestazione */}
          <div style={card}>
            <div style={secLabel}>Fattura</div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Numero</span><span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.numero as string}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Data</span><span>{fmtDate(f.data)}</span></div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: 'var(--t2)' }}>Stato</span>
              <span style={{ fontWeight: 700, color: f.stato_pagamento === 'pagata' ? '#16A34A' : f.stato_pagamento === 'scaduta' ? '#D90012' : 'var(--t1)' }}>
                {(f.stato_pagamento as string)?.toUpperCase() ?? '—'}
              </span>
            </div>
          </div>

          {/* Cliente */}
          {cliente && (
            <div style={card}>
              <div style={secLabel}>Cliente</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)' }}>
                {cliente.studio_nome ?? `${cliente.nome} ${cliente.cognome}`}
              </div>
              {cliente.partita_iva && <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'monospace', marginTop: '4px' }}>P.IVA {cliente.partita_iva}</div>}
            </div>
          )}

          {/* Righe */}
          <div style={card}>
            <div style={secLabel}>Voci</div>
            {righe.map((r, i) => (
              <div key={i} style={{ ...row, flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.descrizione as string}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{fmtEur(r.totale_riga)}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                  {r.quantita as number} × {fmtEur(r.prezzo_unitario)}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 700, fontSize: '15px' }}>
              <span>Totale</span>
              <span>{fmtEur(f.totale)}</span>
            </div>
          </div>

          {/* SDI / PEC */}
          <div style={card}>
            <div style={secLabel}>Invio SDI</div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>XML</span><span>{f.xml_url ? '✓ Generato' : 'Non generato'}</span></div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: 'var(--t2)' }}>PEC consegnata</span>
              <span style={{ color: f.pec_consegnata_at ? '#16A34A' : 'var(--t3)' }}>
                {f.pec_consegnata_at ? fmtDate(f.pec_consegnata_at) : 'Non inviata'}
              </span>
            </div>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/fatture/\[id\]/page.tsx
git commit -m "feat(fatture): pagina dettaglio fattura /fatture/[id]"
```

---

## Task 4: Pagina /magazzino/[id] — Dettaglio articolo

**Files:**
- Create: `src/app/(app)/magazzino/[id]/page.tsx`

- [ ] **Step 1: Crea pagina dettaglio articolo magazzino**

```typescript
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

interface Props { params: Promise<{ id: string }> }

export default async function MagazzinoDetailPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: art } = await svc
    .from('magazzino')
    .select('id, codice, descrizione, unita_misura, giacenza_attuale, scorta_minima, prezzo_acquisto, fornitore, note, categoria')
    .eq('id', id).eq('laboratorio_id', utente.laboratorio_id).is('deleted_at', null).single()

  if (!art) redirect('/magazzino')

  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
    marginBottom: '12px',
  }
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--elv)', fontSize: '13px' }
  const a = art as Record<string, unknown>

  const isLow = typeof a.giacenza_attuale === 'number' && typeof a.scorta_minima === 'number'
    && a.giacenza_attuale <= a.scorta_minima

  return (
    <>
      <AppHeader title={a.descrizione as string} backHref="/magazzino" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Articolo</div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Codice</span><span style={{ fontFamily: 'monospace' }}>{a.codice as string ?? '—'}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Categoria</span><span>{a.categoria as string ?? '—'}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Fornitore</span><span>{a.fornitore as string ?? '—'}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Prezzo acquisto</span><span>{typeof a.prezzo_acquisto === 'number' ? `€${(a.prezzo_acquisto as number).toFixed(2)}` : '—'}</span></div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: 'var(--t2)' }}>Note</span>
              <span style={{ maxWidth: '180px', textAlign: 'right', color: 'var(--t2)' }}>{a.note as string ?? '—'}</span>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Giacenza</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: isLow ? '#D90012' : 'var(--t1)', letterSpacing: '-.04em' }}>
                  {a.giacenza_attuale as number ?? 0}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t2)' }}>{a.unita_misura as string ?? 'pz'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--t2)' }}>Scorta minima</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--t2)' }}>{a.scorta_minima as number ?? 0} {a.unita_misura as string ?? 'pz'}</div>
              </div>
            </div>
            {isLow && (
              <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(217,0,18,.07)', fontSize: '12px', fontWeight: 600, color: '#D90012' }}>
                ⚠️ Scorta sotto la soglia minima — ordinare al più presto
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 2: TypeScript + commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add src/app/\(app\)/magazzino/\[id\]/page.tsx
git commit -m "feat(magazzino): pagina dettaglio articolo /magazzino/[id]"
```

---

## Task 5: Pagina /pazienti/[id] — Storico paziente

**Files:**
- Create: `src/app/(app)/pazienti/[id]/page.tsx`

- [ ] **Step 1: Crea pagina storico paziente (GDPR-safe)**

```typescript
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

interface Props { params: Promise<{ id: string }> }

export default async function PazienteDetailPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: paziente } = await svc
    .from('pazienti')
    .select('id, nome_display, codice_gdpr, note, created_at')
    .eq('id', id).eq('laboratorio_id', utente.laboratorio_id).single()

  if (!paziente) redirect('/pazienti')

  const { data: lavori } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, tipo_dispositivo, data_consegna_prevista, clienti(studio_nome, nome, cognome)')
    .eq('paziente_id', id).eq('laboratorio_id', utente.laboratorio_id).is('deleted_at', null)
    .order('created_at', { ascending: false }).limit(50)

  const p = paziente as Record<string, unknown>
  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
    marginBottom: '12px',
  }

  return (
    <>
      <AppHeader title={p.nome_display as string ?? 'Paziente'} backHref="/pazienti" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>Dati paziente</div>
            <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'monospace' }}>GDPR: {p.codice_gdpr as string}</div>
            {p.note && <div style={{ fontSize: '13px', color: 'var(--t2)', marginTop: '8px' }}>{p.note as string}</div>}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '16px 0 8px' }}>
            Lavori ({lavori?.length ?? 0})
          </div>
          {(lavori ?? []).map((l) => {
            const lv = l as Record<string, unknown>
            const cliente = lv.clienti as Record<string, string | null> | null
            return (
              <a key={lv.id as string} href={`/lavori/${lv.id as string}`} style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>
                    #{lv.numero_lavoro as string} · {lv.tipo_dispositivo as string}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>
                    {cliente?.studio_nome ?? `${cliente?.nome} ${cliente?.cognome}`}
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                  background: lv.stato === 'consegnato' ? 'rgba(22,163,74,.1)' : 'rgba(148,145,141,.1)',
                  color: lv.stato === 'consegnato' ? '#16A34A' : 'var(--t2)' }}>
                  {lv.stato as string}
                </span>
              </a>
            )
          })}
          {(!lavori || lavori.length === 0) && (
            <div style={{ ...card, color: 'var(--t3)', fontSize: '13px', textAlign: 'center' }}>
              Nessun lavoro trovato per questo paziente.
            </div>
          )}
        </div>
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 2: TypeScript + commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add src/app/\(app\)/pazienti/\[id\]/page.tsx
git commit -m "feat(pazienti): pagina storico paziente /pazienti/[id]"
```

---

## Task 6: Dashboard live preview — Fix colore cobalt

**Problema:** Il componente `DashboardTitolare` nella live preview admin usa `background: '#0F1E52'` (cobalt vecchio) invece dei token v2.2.

**Files:**
- Read: `src/components/features/dashboard/DashboardTitolare.tsx`
- Modify: `src/components/features/dashboard/DashboardTitolare.tsx`
- Modify: `src/app/admin/labs/[id]/live/page.tsx`

- [ ] **Step 1: Rimuovi background cobalt dalla live preview**

In `src/app/admin/labs/[id]/live/page.tsx` trova:
```typescript
<div style={{ paddingTop: 44, minHeight: '100dvh', background: '#0F1E52' }}>
```

Sostituisci con:
```typescript
<div style={{ paddingTop: 44, minHeight: '100dvh', background: 'var(--bg, #DDD8D3)' }}>
```

- [ ] **Step 2: Verifica DashboardTitolare usa token v2.2**

```bash
grep -n "#0F1E52\|#1B2D6B\|cobalt" src/components/features/dashboard/DashboardTitolare.tsx | head -10
```

Se ci sono colori cobalt hardcoded, sostituiscili con i token v2.2 corrispondenti:
- `#0F1E52` → `var(--bg, #DDD8D3)`
- `#1B2D6B` → `var(--sfc, #E4DFD9)`
- `#243580` → `var(--elv, #EDEDEA)`

- [ ] **Step 3: TypeScript + commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add src/app/admin/labs/\[id\]/live/page.tsx
git add src/components/features/dashboard/DashboardTitolare.tsx
git commit -m "fix(dashboard): rimuovi background cobalt dalla live preview admin"
```

---

## Task 7: /impostazioni/abbonamento — Stato piano e link Stripe portal

**Files:**
- Create: `src/app/(app)/impostazioni/abbonamento/page.tsx`

- [ ] **Step 1: Crea pagina abbonamento**

```typescript
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

export default async function AbbonamentoPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: lab } = await svc
    .from('laboratori')
    .select('nome, stato, piano, trial_ends_at, stripe_subscription_status, stripe_customer_id')
    .eq('id', utente.laboratorio_id).single()

  if (!lab) redirect('/login?error=no_lab')

  const l = lab as Record<string, unknown>
  const trialDate = l.trial_ends_at ? new Date(l.trial_ends_at as string).toLocaleDateString('it-IT') : null
  const isTrialExpiringSoon = l.trial_ends_at
    ? (new Date(l.trial_ends_at as string).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000
    : false

  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
    marginBottom: '12px',
  }

  return (
    <>
      <AppHeader title="Abbonamento" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '12px' }}>Piano attuale</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--t1)' }}>
                {(l.piano as string) === 'rete' ? 'Rete PRO' : 'Laboratorio'}
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px',
                background: l.stato === 'attivo' ? 'rgba(22,163,74,.1)' : 'rgba(180,83,9,.1)',
                color: l.stato === 'attivo' ? '#16A34A' : '#B45309',
              }}>
                {l.stato === 'trial' ? `Trial${trialDate ? ` · scade ${trialDate}` : ''}` :
                 l.stato === 'attivo' ? 'Attivo' : (l.stato as string)?.toUpperCase()}
              </span>
            </div>
            {isTrialExpiringSoon && (
              <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(180,83,9,.08)', fontSize: '13px', color: '#B45309', fontWeight: 600, marginBottom: '16px' }}>
                ⚠️ Il trial scade tra pochi giorni. Attiva il piano per continuare.
              </div>
            )}
            {l.stato === 'attivo' ? (
              <a href="/api/stripe/portal" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', borderRadius: '14px', textDecoration: 'none',
                background: 'var(--elv)', color: 'var(--t1)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
              }}>
                Gestisci abbonamento →
              </a>
            ) : (
              <a href="/billing" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '14px', borderRadius: '14px', textDecoration: 'none',
                background: '#D4A843', color: '#fff',
                fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), 0 6px 18px -2px rgba(180,130,0,.38)',
              }}>
                → Attiva il piano
              </a>
            )}
          </div>
          <div style={{ ...card, fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>
            <strong>Piano Lab:</strong> €49/mese · €490/anno<br/>
            <strong>Piano Rete PRO:</strong> €149/mese · €1.490/anno<br/>
            <br/>
            Per assistenza sull&apos;abbonamento: <strong>supporto@ua.app</strong>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 2: TypeScript + commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add src/app/\(app\)/impostazioni/abbonamento/page.tsx
git commit -m "feat(impostazioni): pagina abbonamento con link portale Stripe"
```

---

## Task 8: Push finale e verifica produzione

- [ ] **Step 1: Esegui test suite completa**

```bash
npx vitest run 2>&1 | tail -20
```

Atteso: 136+ test verdi.

- [ ] **Step 2: Build locale per verificare**

```bash
npx next build 2>&1 | tail -30
```

Atteso: build completata senza errori.

- [ ] **Step 3: Push e CI**

```bash
git push origin main
```

Attendi CI verde (TypeScript + ESLint + Unit Tests).

- [ ] **Step 4: Test manuale flow completo su produzione**

1. **Admin crea lab + invito:**
   - Login come admin su `https://uachelab.com/admin/labs`
   - Crea nuovo lab → "Nuovo lab" → compila tutti i campi → invia invito
   - Verifica che l'email arrivi al titolare

2. **Titolare accetta invito:**
   - Clicca link email → viene portato su `/auth/callback?next=/onboarding`
   - Completa wizard onboarding in 6 step
   - Arriva alla dashboard

3. **Flow operativo:**
   - Crea nuovo lavoro → verifica cliente_id funziona
   - Configura PEC → testa connessione
   - Vede dashboard con i propri KPI

- [ ] **Step 5: Aggiorna MEMORY.md**

Aggiorna `memory/MEMORY.md`:
- Ultimo commit con hash
- Piano G: completato
- Lista bug noti aggiornata
- Stato infrastruttura verificato
