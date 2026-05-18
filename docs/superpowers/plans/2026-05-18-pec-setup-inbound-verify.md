# PEC Setup — Inbound Verification Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire il form PEC tecnico con un widget ultra-semplice (2 campi) che verifica end-to-end la configurazione PEC inviando un'email a `verify+{token}@uachelab.com` e confermando automaticamente la ricezione via Cloudflare Email Routing.

**Architecture:** Il componente `PecSetupWidget` rileva il provider dall'email (lookup table 8 provider italiani), salva le credenziali in Vault, invia un'email di test alla casella UÀ, e ascolta tramite polling il callback Cloudflare → Next.js che conferma la ricezione reale. Il widget è riutilizzato sia nell'onboarding wizard che in `/impostazioni/pec`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase Postgres + Vault, nodemailer, Cloudflare Email Routing + Worker (Wrangler), Vercel

**Repo:** `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app`
**Supabase project:** `iagibumwjstnveqpjbwq`

---

## File Map

| File | Azione | Responsabilità |
|------|--------|----------------|
| `supabase/migrations/20260518_pec_verification.sql` | CREATE | Nuove colonne pec_verificata, pec_verify_token |
| `src/lib/pec/providers.ts` | CREATE | Lookup table 8 provider + detectProvider() |
| `src/lib/pec/errors.ts` | CREATE | Mappa errori SMTP → messaggi italiani |
| `src/lib/pec/providers.test.ts` | CREATE | Test detectProvider |
| `src/app/api/impostazioni/pec/start-verify/route.ts` | CREATE | POST: salva credenziali + invia email + restituisce token |
| `src/app/api/impostazioni/pec/verify-status/route.ts` | CREATE | GET: polling stato verifica |
| `src/app/api/internal/pec-verify/route.ts` | CREATE | POST: callback Cloudflare Worker → marca pec_verificata=true |
| `src/components/features/pec/PecSetupWidget.tsx` | CREATE | Componente riutilizzabile con 6 stati UI |
| `cloudflare/email-worker/worker.js` | CREATE | Worker Cloudflare: riceve email, chiama /api/internal/pec-verify |
| `cloudflare/email-worker/wrangler.toml` | CREATE | Configurazione deployment Wrangler |
| `src/app/(app)/impostazioni/pec/page.tsx` | MODIFY | Sostituisce form con PecSetupWidget |
| `src/app/(app)/onboarding/wizard.tsx` | MODIFY | Step 'pec' usa PecSetupWidget |

---

## Task 1: DB Migration + env secret

**Files:**
- Create: `supabase/migrations/20260518_pec_verification.sql`

- [ ] **Step 1: Applica la migration via Supabase MCP**

```sql
-- supabase/migrations/20260518_pec_verification.sql
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS pec_verificata    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pec_verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pec_verify_token  UUID;

CREATE INDEX IF NOT EXISTS idx_laboratori_pec_verify_token
  ON laboratori(pec_verify_token)
  WHERE pec_verify_token IS NOT NULL;

-- Reset verifica se lab già esistente (le credenziali non erano verificate end-to-end)
UPDATE laboratori SET pec_verificata = false WHERE pec_smtp_configurata = true;
```

Applica via Supabase MCP: `mcp__plugin_supabase_supabase__apply_migration` con name `pec_verification`.

- [ ] **Step 2: Rigenera i tipi TypeScript**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
# Rimuovi eventuale riga CLI update notification in fondo al file
npx tsc --noEmit
```

Atteso: nessun errore TypeScript.

- [ ] **Step 3: Genera INTERNAL_SECRET e aggiungilo agli env**

```bash
# Genera un secret sicuro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copia il valore (es. a3f8b2c1...)
```

Aggiungi a `.env.local`:
```
INTERNAL_SECRET=<valore_generato>
NEXT_PUBLIC_APP_URL=https://uachelab.com
```

Aggiungi a Vercel:
```bash
echo "<valore_generato>" | npx vercel env add INTERNAL_SECRET production --force
```

- [ ] **Step 4: Crea il file migration e committa**

```bash
# Il file SQL è già stato creato manualmente
git add supabase/migrations/20260518_pec_verification.sql src/types/database.types.ts
git commit -m "feat(pec): migration pec_verificata + pec_verify_token + rigenera types"
```

---

## Task 2: Provider lookup table e error mapping

**Files:**
- Create: `src/lib/pec/providers.ts`
- Create: `src/lib/pec/errors.ts`
- Create: `src/lib/pec/providers.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `src/lib/pec/providers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { detectProvider } from './providers'

describe('detectProvider', () => {
  it('rileva Aruba PEC', () => {
    const p = detectProvider('lab@pec.aruba.it')
    expect(p?.name).toBe('Aruba PEC')
    expect(p?.host).toBe('smtps.pec.aruba.it')
    expect(p?.port).toBe(465)
  })

  it('rileva Legalmail', () => {
    const p = detectProvider('lab@cert.legalmail.it')
    expect(p?.name).toBe('Legalmail')
    expect(p?.host).toBe('sendm.cert.legalmail.it')
  })

  it('ritorna null per provider sconosciuto', () => {
    expect(detectProvider('lab@peclocale.it')).toBeNull()
  })

  it('è case-insensitive', () => {
    expect(detectProvider('LAB@PEC.ARUBA.IT')).not.toBeNull()
  })

  it('ritorna null per email malformata', () => {
    expect(detectProvider('nonunemail')).toBeNull()
  })
})
```

- [ ] **Step 2: Esegui il test — deve fallire**

```bash
npx vitest run src/lib/pec/providers.test.ts
```

Atteso: FAIL — "Cannot find module './providers'"

- [ ] **Step 3: Implementa providers.ts**

Crea `src/lib/pec/providers.ts`:

```typescript
export interface PecProvider {
  name: string
  host: string
  port: number
}

const PROVIDERS: Record<string, PecProvider> = {
  'pec.aruba.it':        { name: 'Aruba PEC',          host: 'smtps.pec.aruba.it',           port: 465 },
  'cert.legalmail.it':   { name: 'Legalmail',           host: 'sendm.cert.legalmail.it',       port: 465 },
  'legalmail.it':        { name: 'Legalmail',           host: 'sendm.cert.legalmail.it',       port: 465 },
  'sicurezzapostale.it': { name: 'Namirial',             host: 'smtps.sicurezzapostale.it',     port: 465 },
  'pec.namirial.com':    { name: 'Namirial PRO',         host: 'pro-smtps.sicurezzapostale.it', port: 465 },
  'postecert.it':        { name: 'Poste Italiane',       host: 'mail.postecert.it',             port: 465 },
  'pectim.it':           { name: 'TIM PEC',              host: 'smtps.pectim.it',               port: 465 },
  'pecmessages.it':      { name: 'PEC Messages',         host: 'smtp.pecmessages.it',           port: 465 },
}

export function detectProvider(email: string): PecProvider | null {
  const atIdx = email.indexOf('@')
  if (atIdx === -1) return null
  const domain = email.slice(atIdx + 1).toLowerCase()
  return PROVIDERS[domain] ?? null
}
```

- [ ] **Step 4: Esegui il test — deve passare**

```bash
npx vitest run src/lib/pec/providers.test.ts
```

Atteso: PASS (5 test verdi)

- [ ] **Step 5: Crea errors.ts**

Crea `src/lib/pec/errors.ts`:

```typescript
export function mapSmtpError(raw: string): string {
  if (/535|authentication|invalid.*credenti|wrong.*pass/i.test(raw))
    return 'Email o password non corretti. Usa la password della casella PEC (non quella del sito web del provider).'
  if (/timeout|timed out|ETIMEDOUT|ECONNREFUSED/i.test(raw))
    return 'Non riusciamo a raggiungere il server. Controlla la connessione internet e riprova.'
  if (/ssl|tls|certificate|ECONNRESET/i.test(raw))
    return 'Problema di sicurezza con il server PEC. Contatta il supporto.'
  if (/550|relay|not allowed|spam/i.test(raw))
    return 'Il provider non permette l\'invio da applicazioni esterne. Controlla le impostazioni SMTP nel pannello del tuo provider.'
  if (/quota|storage|full/i.test(raw))
    return 'La casella PEC è piena. Libera spazio e riprova.'
  return 'Errore di connessione. Verifica le credenziali e riprova, oppure contatta il supporto.'
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/pec/providers.ts src/lib/pec/errors.ts src/lib/pec/providers.test.ts
git commit -m "feat(pec): provider lookup table 8 provider italiani + error mapping"
```

---

## Task 3: API — /api/internal/pec-verify (callback Cloudflare)

**Files:**
- Create: `src/app/api/internal/pec-verify/route.ts`

- [ ] **Step 1: Crea la route**

Crea `src/app/api/internal/pec-verify/route.ts`:

```typescript
import 'server-only'
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'

// Chiamata da Cloudflare Email Worker quando arriva l'email di verifica
// Autenticazione: header x-internal-secret
export async function POST(req: Request) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { token?: string } | null = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body?.token || typeof body.token !== 'string') {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 })
  }

  // Valida che il token sia un UUID valido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(body.token)) {
    return NextResponse.json({ error: 'Token non valido' }, { status: 400 })
  }

  const svc = getServiceClient()
  const { error, count } = await svc
    .from('laboratori')
    .update({
      pec_verificata: true,
      pec_verified_at: new Date().toISOString(),
      pec_verify_token: null,
      pec_smtp_configurata: true,
    })
    .eq('pec_verify_token', body.token)
    .select('id', { count: 'exact' })

  if (error) {
    console.error('[pec-verify-callback] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!count || count === 0) {
    // Token non trovato — già usato o scaduto
    return NextResponse.json({ ok: false, reason: 'token_not_found' })
  }

  console.log('[pec-verify-callback] Verified lab with token:', body.token.slice(0, 8))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/internal/pec-verify/route.ts
git commit -m "feat(pec): internal webhook endpoint per callback Cloudflare Email Worker"
```

---

## Task 4: API — /api/impostazioni/pec/start-verify

**Files:**
- Create: `src/app/api/impostazioni/pec/start-verify/route.ts`

- [ ] **Step 1: Crea la route**

Crea `src/app/api/impostazioni/pec/start-verify/route.ts`:

```typescript
import 'server-only'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import nodemailer from 'nodemailer'

async function getLabId(userId: string): Promise<string | null> {
  const svc = getServiceClient()
  const { data } = await svc.from('utenti').select('laboratorio_id, ruolo').eq('id', userId).single()
  if (!data || !['titolare', 'admin_rete'].includes(data.ruolo ?? '')) return null
  return data.laboratorio_id ?? null
}

// POST /api/impostazioni/pec/start-verify
// Body: { pec_host, pec_port, pec_user, pec_password }
// 1. Salva credenziali in Vault
// 2. Testa connessione SMTP (nodemailer.verify)
// 3. Invia email a verify+{token}@uachelab.com
// 4. Salva token in DB
// 5. Restituisce { token }
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const labId = await getLabId(user.id)
  if (!labId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  let body: {
    pec_host?: string; pec_port?: number; pec_user?: string; pec_password?: string
  } | null = null
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { pec_host, pec_port, pec_user, pec_password } = body ?? {}
  if (!pec_host || !pec_port || !pec_user || !pec_password) {
    return NextResponse.json({ error: 'Tutti i campi SMTP sono obbligatori' }, { status: 422 })
  }

  const svc = getServiceClient()

  // 1. Salva campi non sensibili
  const { error: updateErr } = await svc.from('laboratori').update({
    pec_host, pec_port, pec_user,
    pec_verificata: false,
    pec_verify_token: null,
  }).eq('id', labId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 2. Salva password in Vault
  const { error: vaultErr } = await svc.rpc('upsert_pec_vault_secret', {
    p_lab_id: labId, p_password: pec_password,
  })
  if (vaultErr) return NextResponse.json({ error: 'Errore salvataggio password: ' + vaultErr.message }, { status: 500 })

  // 3. Testa connessione SMTP
  const transporter = nodemailer.createTransport({
    host: pec_host, port: pec_port,
    secure: pec_port === 465,
    auth: { user: pec_user, pass: pec_password },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  })

  try {
    await transporter.verify()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore connessione'
    return NextResponse.json({ error: msg, phase: 'smtp_connect' }, { status: 422 })
  }

  // 4. Genera token univoco
  const token = randomUUID()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
  const verifyTo = `verify+${token}@uachelab.com`

  // 5. Invia email di verifica (FROM lab PEC, TO uachelab.com)
  try {
    await transporter.sendMail({
      from: pec_user,
      to: verifyTo,
      subject: `UÀ verify ${token}`,
      text: `Verifica PEC lab ${labId} token ${token}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore invio'
    return NextResponse.json({ error: msg, phase: 'smtp_send' }, { status: 422 })
  }

  // 6. Salva token nel DB (scade automaticamente — il polling ha timeout 60s)
  await svc.from('laboratori').update({ pec_verify_token: token }).eq('id', labId)

  return NextResponse.json({ token, verifyTo })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/impostazioni/pec/start-verify/route.ts
git commit -m "feat(pec): start-verify endpoint — salva credenziali + testa SMTP + invia email verifica"
```

---

## Task 5: API — /api/impostazioni/pec/verify-status

**Files:**
- Create: `src/app/api/impostazioni/pec/verify-status/route.ts`

- [ ] **Step 1: Crea la route**

Crea `src/app/api/impostazioni/pec/verify-status/route.ts`:

```typescript
import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

// GET /api/impostazioni/pec/verify-status?token={token}
// Polling chiamato ogni 2s dal client durante la verifica
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Token mancante' }, { status: 400 })

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) return NextResponse.json({ error: 'Lab non trovato' }, { status: 403 })

  const { data: lab } = await svc
    .from('laboratori')
    .select('pec_verificata, pec_verified_at, pec_verify_token')
    .eq('id', utente.laboratorio_id)
    .single()

  if (!lab) return NextResponse.json({ error: 'Lab non trovato' }, { status: 404 })

  // Sicurezza: verifica che il token richiesto corrisponda a quello del lab
  // (o che pec_verificata=true, segno che il callback lo ha già resettato)
  const tokenMatches = lab.pec_verify_token === token || lab.pec_verificata

  return NextResponse.json({
    verified: lab.pec_verificata && tokenMatches,
    verified_at: lab.pec_verified_at,
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/impostazioni/pec/verify-status/route.ts
git commit -m "feat(pec): verify-status polling endpoint"
```

---

## Task 6: PecSetupWidget — Componente React

**Files:**
- Create: `src/components/features/pec/PecSetupWidget.tsx`

- [ ] **Step 1: Crea il componente completo**

Crea `src/components/features/pec/PecSetupWidget.tsx`:

```typescript
'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { detectProvider, type PecProvider } from '@/lib/pec/providers'
import { mapSmtpError } from '@/lib/pec/errors'

type Phase = 'idle' | 'provider_found' | 'provider_unknown' | 'verifying' | 'success' | 'error'

interface Props {
  onSuccess?: () => void  // wizard: avanza allo step successivo
  onSkip?: () => void     // wizard: salta per ora
}

// Stili design system v2.2
const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '12px', border: 'none',
  background: 'var(--prs, #D4CFC9)', fontFamily: 'DM Sans, sans-serif',
  fontSize: '14px', color: 'var(--t1, #1C1916)', outline: 'none', boxSizing: 'border-box',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
}
const lbl: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: 'var(--t2, #96918D)',
  textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px', display: 'block',
  fontFamily: 'DM Sans, sans-serif',
}
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '12px' }
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
  background: 'var(--primary, #D90012)', color: '#fff',
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
}

export function PecSetupWidget({ onSuccess, onSkip }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [provider, setProvider] = useState<PecProvider | null>(null)
  const [host, setHost] = useState('')
  const [port, setPort] = useState('465')
  const [smtpUser, setSmtpUser] = useState('')
  const [verifyStepLabel, setVerifyStepLabel] = useState('Connessione al server…')
  const [errorMsg, setErrorMsg] = useState('')
  const [token, setToken] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const handleEmailBlur = useCallback(() => {
    if (!email) return
    const p = detectProvider(email)
    if (p) {
      setProvider(p); setPhase('provider_found')
    } else {
      setProvider(null); setSmtpUser(email); setPhase('provider_unknown')
    }
  }, [email])

  const canSubmit = email && password && (phase === 'provider_found' || (phase === 'provider_unknown' && host && smtpUser))

  const startVerify = useCallback(async () => {
    setPhase('verifying')

    // Animazione step UI (client-side)
    setVerifyStepLabel('Connessione al server…')
    const t1 = setTimeout(() => setVerifyStepLabel('Autenticazione in corso…'), 800)
    const t2 = setTimeout(() => setVerifyStepLabel('Invio email di verifica a UÀ…'), 2000)

    try {
      const res = await fetch('/api/impostazioni/pec/start-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pec_host:     provider ? provider.host : host,
          pec_port:     provider ? provider.port : parseInt(port),
          pec_user:     provider ? email : smtpUser,
          pec_password: password,
        }),
      })

      clearTimeout(t1); clearTimeout(t2)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Errore sconosciuto')
      }

      const { token: newToken } = await res.json()
      setToken(newToken)
      setVerifyStepLabel('Attendo conferma da UÀ…')

      // Polling ogni 2s, timeout 60s
      let elapsed = 0
      pollRef.current = setInterval(async () => {
        elapsed += 2
        if (elapsed > 60) {
          clearInterval(pollRef.current)
          setPhase('error')
          setErrorMsg('Verifica scaduta (60s). La tua email potrebbe essere bloccata da un filtro antispam. Contatta il supporto.')
          return
        }
        try {
          const sr = await fetch(`/api/impostazioni/pec/verify-status?token=${newToken}`)
          if (!sr.ok) return
          const { verified } = await sr.json()
          if (verified) {
            clearInterval(pollRef.current)
            setPhase('success')
            setTimeout(() => onSuccess?.(), 2000)
          }
        } catch { /* ignora errori di rete nel polling */ }
      }, 2000)

    } catch (err) {
      clearTimeout(t1); clearTimeout(t2)
      setPhase('error')
      setErrorMsg(mapSmtpError(err instanceof Error ? err.message : ''))
    }
  }, [email, password, provider, host, port, smtpUser, onSuccess])

  useEffect(() => () => clearInterval(pollRef.current), [])

  // ── Stato SUCCESS ──
  if (phase === 'success') return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(22,163,74,.12)', border: '2px solid rgba(22,163,74,.3)', display: 'grid', placeItems: 'center', fontSize: '28px' }}>✅</div>
      <div style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A', fontFamily: 'DM Sans, sans-serif' }}>PEC confermata!</div>
      <div style={{ fontSize: '13px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
        UÀ ha ricevuto la tua email PEC e verificato l'intera catena.
      </div>
      <div style={{ background: 'rgba(22,163,74,.08)', borderRadius: '12px', padding: '12px 16px', width: '100%', textAlign: 'left' }}>
        {['Connessione SMTP', 'Autenticazione', 'Invio email', 'Ricezione confermata da UÀ'].map(s => (
          <div key={s} style={{ fontSize: '12px', color: '#16A34A', fontFamily: 'DM Sans, sans-serif', padding: '2px 0' }}>✓ {s}</div>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>Avanzamento automatico…</div>
      <div style={{ width: '100%', height: 4, background: 'var(--prs)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#16A34A', borderRadius: 99, animation: 'pec-fill 2s linear forwards', width: 0 }} />
      </div>
      <style>{`@keyframes pec-fill { to { width: 100%; } }`}</style>
    </div>
  )

  // ── Stato VERIFYING ──
  if (phase === 'verifying') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '13px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>Stiamo verificando la connessione…</div>
      <div style={{ background: 'var(--elv, #EDEDEA)', borderRadius: '12px', padding: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>Verifica in corso</div>
        {[
          { label: 'Connessione al server', done: verifyStepLabel !== 'Connessione al server…' },
          { label: 'Autenticazione', done: verifyStepLabel === 'Invio email di verifica a UÀ…' || verifyStepLabel === 'Attendo conferma da UÀ…' },
          { label: 'Email inviata a UÀ', done: verifyStepLabel === 'Attendo conferma da UÀ…' },
          { label: verifyStepLabel === 'Attendo conferma da UÀ…' ? 'Attendo conferma da UÀ…' : 'Attendo conferma da UÀ', done: false, active: verifyStepLabel === 'Attendo conferma da UÀ…' },
        ].map(({ label, done, active }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', padding: '3px 0',
            color: done ? '#16A34A' : active ? '#B45309' : 'var(--t2)' }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: done ? 'rgba(22,163,74,.15)' : active ? 'rgba(180,83,9,.15)' : 'rgba(150,145,141,.1)', display: 'grid', placeItems: 'center', fontSize: 9, flexShrink: 0 }}>
              {done ? '✓' : active ? '⟳' : '○'}
            </span>
            {label}
          </div>
        ))}
      </div>
      {token && (
        <div style={{ background: 'var(--elv)', borderRadius: '10px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--t2)' }}>
          <div style={{ fontSize: '9px', color: 'var(--t3)', marginBottom: 3, fontFamily: 'DM Sans, sans-serif' }}>Email inviata a:</div>
          verify+{token.slice(0, 8)}…@uachelab.com
        </div>
      )}
      <div style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
        UÀ riceve l'email e conferma che tutto funziona.<br/>Attendi fino a 60 secondi.
      </div>
      <button style={{ ...btnPrimary, opacity: .5, cursor: 'not-allowed' }} disabled>Verifica in corso…</button>
    </div>
  )

  // ── Stato ERROR ──
  const waText = encodeURIComponent(`Ciao Francesco, ho bisogno di aiuto per configurare la PEC su UÀ. Il mio provider è: ${provider?.name ?? 'sconosciuto'}`)
  const waUrl = `https://wa.me/39${process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '3XXXXXXXXX'}?text=${waText}`

  // ── Form principale (idle, provider_found, provider_unknown, error) ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
        UÀ invierà le fatture al SDI via PEC in automatico. Servono solo 2 dati.
      </div>

      {/* Email PEC */}
      <div style={field}>
        <label style={lbl}>Indirizzo PEC</label>
        <div style={{ position: 'relative' }}>
          <input style={{ ...inp, paddingRight: provider ? '110px' : undefined }}
            type="email" value={email} placeholder="lab@pec.aruba.it"
            onChange={e => { setEmail(e.target.value); setPhase('idle') }}
            onBlur={handleEmailBlur} />
          {provider && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: '#fff', background: '#16A34A', padding: '2px 8px', borderRadius: '5px', fontFamily: 'DM Sans, sans-serif' }}>
              ✓ {provider.name}
            </span>
          )}
          {phase === 'provider_unknown' && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: '5px', fontFamily: 'DM Sans, sans-serif' }}>
              ? Non riconosciuto
            </span>
          )}
        </div>
      </div>

      {/* Badge provider */}
      {phase === 'provider_found' && (
        <div style={{ background: 'rgba(22,163,74,.09)', borderRadius: '10px', padding: '8px 12px', fontSize: '11px', color: '#16A34A', fontFamily: 'DM Sans, sans-serif', display: 'flex', gap: '6px' }}>
          <span>✅</span><span>Impostazioni SMTP precompilate in automatico</span>
        </div>
      )}

      {/* Accordion provider sconosciuto */}
      {phase === 'provider_unknown' && (
        <div style={{ background: 'var(--elv, #EDEDEA)', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px' }}>⚙️ Inserisci le impostazioni SMTP manualmente</div>
          <div style={field}>
            <label style={lbl}>Host SMTP</label>
            <input style={inp} value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.tuoprovider.it" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px' }}>
            <div style={field}>
              <label style={lbl}>Porta</label>
              <input style={inp} type="number" value={port} onChange={e => setPort(e.target.value)} />
            </div>
            <div style={field}>
              <label style={lbl}>Utente SMTP</label>
              <input style={inp} type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="lab@pec.it" />
            </div>
          </div>
        </div>
      )}

      {/* Password */}
      <div style={field}>
        <label style={lbl}>Password PEC</label>
        <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
      </div>

      {/* Provider comuni hint */}
      {phase === 'idle' && (
        <div style={{ background: 'var(--elv)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--t1)' }}>Supportiamo:</strong><br/>
          Aruba PEC · Legalmail · Namirial · Tim PEC · Poste Italiane e altri
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div style={{ background: 'rgba(217,0,18,.07)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#D90012', fontFamily: 'DM Sans, sans-serif', marginBottom: '6px' }}>❌ Verifica non riuscita</div>
          <div style={{ fontSize: '12px', color: '#4A4845', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, marginBottom: '12px' }}>{errorMsg}</div>
          <div style={{ fontSize: '11px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px' }}>Francesco ti aiuta a risolvere in pochi minuti.</div>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '10px', background: '#25D366', color: '#fff',
            textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700,
          }}>💬 Contatta il supporto</a>
        </div>
      )}

      {/* CTA */}
      <button style={{ ...btnPrimary, opacity: canSubmit ? 1 : .5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        disabled={!canSubmit} onClick={canSubmit ? startVerify : undefined}>
        Connetti e verifica →
      </button>

      {onSkip && (
        <button onClick={onSkip} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
          Configura dopo
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/pec/PecSetupWidget.tsx
git commit -m "feat(pec): PecSetupWidget — 6 stati UI con auto-detect provider e polling verifica"
```

---

## Task 7: Cloudflare Email Worker

**Files:**
- Create: `cloudflare/email-worker/worker.js`
- Create: `cloudflare/email-worker/wrangler.toml`

- [ ] **Step 1: Crea il worker**

Crea `cloudflare/email-worker/worker.js`:

```javascript
// Cloudflare Email Worker — riceve email su verify+*@uachelab.com
// e chiama il callback Next.js per confermare la verifica PEC
export default {
  async email(message, env, ctx) {
    const to = message.to ?? ''

    // Estrai il token dall'indirizzo: verify+{token}@uachelab.com
    const match = to.match(/verify\+([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})@/i)
    if (!match) {
      console.log('[pec-worker] No UUID token found in TO:', to)
      return
    }

    const token = match[1]
    console.log('[pec-worker] Received verification email, token:', token.slice(0, 8))

    try {
      const res = await fetch(`${env.APP_URL}/api/internal/pec-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('[pec-worker] Callback failed:', res.status, text)
      } else {
        console.log('[pec-worker] Verification confirmed for token:', token.slice(0, 8))
      }
    } catch (err) {
      console.error('[pec-worker] Network error:', err.message)
    }
  },
}
```

- [ ] **Step 2: Crea wrangler.toml**

Crea `cloudflare/email-worker/wrangler.toml`:

```toml
name = "ua-pec-verify"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
APP_URL = "https://uachelab.com"

# INTERNAL_SECRET: impostalo via wrangler secret (non nel file)
# npx wrangler secret put INTERNAL_SECRET
```

- [ ] **Step 3: Deploya il worker**

```bash
cd cloudflare/email-worker

# Se non hai wrangler installato:
npm install -g wrangler

# Login (una volta sola):
npx wrangler login

# Imposta il secret (interattivo, incolla il valore da .env.local):
npx wrangler secret put INTERNAL_SECRET

# Deploy:
npx wrangler deploy

# Output atteso: "Published ua-pec-verify (..."
```

- [ ] **Step 4: Configura Cloudflare Email Routing**

Nel dashboard Cloudflare → `uachelab.com` → **Email** → **Email Routing**:

1. **Enable Email Routing** (se non già attivo)
2. **Custom addresses** → **Add address**:
   - Address: `verify`  (matching `verify+*@uachelab.com` gestito da Cloudflare automaticamente col catch-all)
   - Action: **Send to a Worker**
   - Worker: `ua-pec-verify`
3. Aggiungi anche la regola catch-all per `verify+*`:
   - Pattern: `verify+*`
   - Action: **Send to a Worker** → `ua-pec-verify`

**Nota:** Cloudflare Email Routing richiede che `uachelab.com` abbia i record MX di Cloudflare (già presenti dal DNS Resend setup — verifica che MX non sia in conflitto).

- [ ] **Step 5: Testa il worker manualmente**

```bash
# Simula una chiamata callback (usa il secret da .env.local)
curl -X POST https://uachelab.com/api/internal/pec-verify \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: $(grep INTERNAL_SECRET /Users/hatholdir/Downloads/SOFTWARE\ FILIPPO/ua-app/.env.local | cut -d= -f2)" \
  -d '{"token":"00000000-0000-4000-8000-000000000001"}'
# Atteso: { "ok": false, "reason": "token_not_found" } (token non esiste = ok)
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
git add cloudflare/email-worker/worker.js cloudflare/email-worker/wrangler.toml
git commit -m "feat(pec): Cloudflare Email Worker per ricezione email di verifica PEC"
```

---

## Task 8: Aggiorna Wizard — Step PEC

**Files:**
- Modify: `src/app/(app)/onboarding/wizard.tsx`

- [ ] **Step 1: Sostituisci il case 'pec' nel wizard**

In `src/app/(app)/onboarding/wizard.tsx`, aggiungi l'import in cima:

```typescript
import { PecSetupWidget } from '@/components/features/pec/PecSetupWidget'
```

Poi sostituisci il case `'pec':` con:

```typescript
case 'pec':
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
        Configurazione PEC
      </h2>
      <p style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '20px', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
        UÀ invierà le fatture al SDI in automatico via PEC.
      </p>
      <PecSetupWidget
        onSuccess={() => setStep('ddc')}
        onSkip={() => setStep('ddc')}
      />
    </div>
  )
```

- [ ] **Step 2: Rimuovi le variabili del form PEC non più usate**

Nell'initialState del form, rimuovi le chiavi PEC (`pec`, `pec_host`, `pec_port`, `pec_user`, `pec_password`) dal `useState` del wizard — ora gestite internamente da `PecSetupWidget`.

Cerca nel file le righe:
```typescript
pec: (initialData.pec as string) ?? '',
pec_host: '', pec_port: '465', pec_user: '', pec_password: '',
```
e rimuovile.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

Atteso: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/onboarding/wizard.tsx
git commit -m "feat(onboarding): step PEC usa PecSetupWidget con verifica end-to-end"
```

---

## Task 9: Aggiorna /impostazioni/pec

**Files:**
- Modify: `src/app/(app)/impostazioni/pec/page.tsx`

- [ ] **Step 1: Riscrivi la pagina usando PecSetupWidget**

Sostituisci il contenuto di `src/app/(app)/impostazioni/pec/page.tsx`:

```typescript
'use client'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PecSetupWidget } from '@/components/features/pec/PecSetupWidget'
import { useRouter } from 'next/navigation'

export default function PecPage() {
  const router = useRouter()

  return (
    <>
      <AppHeader title="Configurazione PEC" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>
          <PecSetupWidget
            onSuccess={() => router.push('/impostazioni?pec=ok')}
          />
        </div>
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 2: Mostra feedback dopo verifica in /impostazioni**

In `src/app/(app)/impostazioni/page.tsx`, aggiorna la sezione PEC per mostrare lo stato verificato. Trova la parte che mostra `pec_smtp_configurata` e aggiungi `pec_verificata` alla query del laboratorio:

```typescript
// Nella SELECT del laboratorio aggiungi:
pec_smtp_configurata, pec_verificata, pec_verified_at
```

E nel render, dopo il badge "Configurato/Non configurato", aggiungi:
```typescript
{lab.pec_verificata && (
  <div style={{ fontSize: '11px', color: '#16A34A', fontFamily: 'DM Sans, sans-serif', marginTop: '4px' }}>
    ✅ Verificata end-to-end
  </div>
)}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/impostazioni/pec/page.tsx src/app/\(app\)/impostazioni/page.tsx
git commit -m "feat(impostazioni): pagina PEC usa PecSetupWidget + mostra stato verificata"
```

---

## Task 10: NEXT_PUBLIC_SUPPORT_PHONE + push finale

**Files:**
- Modify: `.env.local` e Vercel env

- [ ] **Step 1: Aggiungi il numero WhatsApp supporto**

In `.env.local` aggiungi:
```
NEXT_PUBLIC_SUPPORT_PHONE=3XXXXXXXXX   # sostituisci col tuo numero WhatsApp (solo cifre, no +39)
```

```bash
echo "3XXXXXXXXX" | npx vercel env add NEXT_PUBLIC_SUPPORT_PHONE production --force
```

- [ ] **Step 2: Build finale**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx next build 2>&1 | tail -20
```

Atteso: build completata senza errori. Le nuove route devono apparire:
- `ƒ /impostazioni/pec`
- `ƒ /onboarding`

- [ ] **Step 3: Test suite**

```bash
npx vitest run 2>&1 | tail -10
```

Atteso: 141+ test verdi (136 esistenti + 5 nuovi provider tests).

- [ ] **Step 4: Push**

```bash
git push origin main
```

- [ ] **Step 5: Test manuale flow completo**

1. Accedi come Filippo su `https://uachelab.com`
2. Vai a `/impostazioni/pec`
3. Inserisci email PEC + password
4. Clicca "Connetti e verifica →"
5. Osserva i 4 step animati
6. Attendi la conferma (max 60s)
7. Verifica che la pagina `/impostazioni` mostri "✅ Verificata end-to-end"

- [ ] **Step 6: Aggiorna MEMORY.md**

In `memory/MEMORY.md` aggiorna la sezione "Prossimi step":
```markdown
- [x] RESEND_API_KEY reale → configurata
- [x] Email templates Supabase → branding UÀ
- [x] PEC Setup Widget → inbound verification loop implementato
- [ ] Test flow invito end-to-end con lab reale
```

---

## Checklist finale

- [ ] Migration DB applicata + types rigenerati
- [ ] 8 provider PEC italiani con lookup automatico
- [ ] Verifica end-to-end: lab PEC → Cloudflare → Edge Function → DB → frontend
- [ ] 6 stati UI chiari e animati
- [ ] Fallback accordion per provider sconosciuti
- [ ] WhatsApp support per errori persistenti
- [ ] Zero campi tecnici visibili all'utente (host/porta nascosti)
- [ ] Componente riutilizzato in wizard e in /impostazioni/pec
- [ ] TypeScript zero errori
- [ ] Build production green
- [ ] Test suite verde
