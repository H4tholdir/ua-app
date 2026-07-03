# B8 (4/5) — /rete/nuova Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere raggiungibile e funzionante la creazione di una rete multi-sede, sostituendo il link rotto `/rete/nuova` con un bottom sheet a un campo, con `POST /api/rete` che applica lato server la regola "un lab amministra al massimo una rete" oltre al gating di ruolo già esistente.

**Architettura:** Nessuna nuova route. Nuovo componente client autonomo `RetiNuovaSheet` (bottone trigger + bottom sheet, gemello di `ListinoNuovoSheet.tsx`) che sostituisce il `<Link href="/rete/nuova">` rotto in `rete/page.tsx`, montato nello stesso punto (solo nell'empty state — decisione presa in brainstorming: "1 rete per lab", nessun bottone persistente aggiuntivo quando una rete esiste già). `POST /api/rete` esistente riutilizzato, esteso con un controllo server-side (409 se il lab è già `admin_laboratorio_id` di una rete) prima dell'insert.

**Tech Stack:** Next.js 16 App Router, React client components, `motion/react` (AnimatePresence), Supabase (service client lato server), Vitest + Testing Library.

## Global Constraints

- Font: DM Sans ovunque, mai Inter (spec DS v2.3)
- Animazioni: solo token da `src/design-system/motion.ts` (`motionTokens`), mai `duration`/`ease` inline
- Colori: solo `var(--token, #fallback)`, mai hex nuovo fuori da un `var()`
- `POST /api/rete`: allowlist di un solo campo (`nome`) già presente — non estenderla, solo aggiungere il guard 409
- `admin_laboratorio_id` deriva sempre da `utente.laboratorio_id` lato server, mai dal body client (già così, non toccare)
- Zero placeholder/TODO nel codice consegnato
- Verifica finale obbligatoria: `npx tsc --noEmit` 0 errori, `npx vitest run` tutti verdi, `npx next build` pulita
- Baseline attuale su `main`: 307/307 test verdi (verificato prima di scrivere questo piano)

---

### Task 1: Guard server-side "1 rete per lab" in `POST /api/rete`

**Files:**
- Modify: `src/app/api/rete/route.ts:90-109`
- Test: `tests/unit/rete-route.test.ts` (nuovo file — nessun test esiste oggi per questa route)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task
- Produces: `POST /api/rete` ora restituisce `409 { error: 'Il laboratorio amministra già una rete' }` se il lab chiamante è già `admin_laboratorio_id` di una riga in `reti` — usato dal Task 2 (`RetiNuovaSheet` mostra questo messaggio come errore inline se la POST fallisce)

- [ ] **Step 1: Scrivi il test (fallirà: il guard 409 non esiste ancora)**

Crea `tests/unit/rete-route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { POST } from '../../src/app/api/rete/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

let insertedReteData: Record<string, unknown> | null = null
let insertedMembroData: Record<string, unknown> | null = null

function mockUtenteRuolo(ruolo: string, opts: { existingRete?: { id: string } | null } = {}) {
  insertedReteData = null
  insertedMembroData = null
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { laboratorio_id: LAB_ID, ruolo }, error: null }),
          }),
        }),
      }
    }
    if (table === 'reti') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.existingRete ?? null, error: null }),
          }),
        }),
        insert: (data: Record<string, unknown>) => {
          insertedReteData = data
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: 'rete-1',
                  nome: data.nome,
                  admin_laboratorio_id: data.admin_laboratorio_id,
                  created_at: '2026-07-03T00:00:00Z',
                  updated_at: '2026-07-03T00:00:00Z',
                },
                error: null,
              }),
            }),
          }
        },
      }
    }
    if (table === 'reti_membri') {
      return {
        insert: async (data: Record<string, unknown>) => {
          insertedMembroData = data
          return { error: null }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/rete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/rete — gating ruolo e guard 1-rete-per-lab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('ruolo tecnico → 403, nessuna rete creata', async () => {
    mockUtenteRuolo('tecnico')

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))

    expect(res.status).toBe(403)
    expect(insertedReteData).toBeNull()
  })

  it('ruolo front_desk → 403', async () => {
    mockUtenteRuolo('front_desk')

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))

    expect(res.status).toBe(403)
  })

  it('ruolo titolare senza rete propria → 201, insert reti + reti_membri con ruolo admin_rete', async () => {
    mockUtenteRuolo('titolare', { existingRete: null })

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.rete.id).toBe('rete-1')
    expect(insertedReteData?.nome).toBe('Rete Toscana')
    expect(insertedReteData?.admin_laboratorio_id).toBe(LAB_ID)
    expect(insertedMembroData?.rete_id).toBe('rete-1')
    expect(insertedMembroData?.laboratorio_id).toBe(LAB_ID)
    expect(insertedMembroData?.ruolo).toBe('admin_rete')
  })

  it('ruolo admin_rete senza rete propria → 201', async () => {
    mockUtenteRuolo('admin_rete', { existingRete: null })

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))

    expect(res.status).toBe(201)
  })

  it('lab già admin di una rete → 409, nessuna nuova rete creata', async () => {
    mockUtenteRuolo('titolare', { existingRete: { id: 'rete-esistente' } })

    const res = await POST(postRequest({ nome: 'Seconda rete' }))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe('Il laboratorio amministra già una rete')
    expect(insertedReteData).toBeNull()
  })

  it('campo "nome" mancante → 422, anche con ruolo autorizzato e nessuna rete esistente (regressione)', async () => {
    mockUtenteRuolo('titolare', { existingRete: null })

    const res = await POST(postRequest({ nome: '' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('nome')
  })
})
```

- [ ] **Step 2: Esegui il test per confermare il fallimento**

Run: `npx vitest run tests/unit/rete-route.test.ts`
Expected: FAIL su `lab già admin di una rete → 409` (oggi la POST non controlla se esiste già una rete, quindi risponde 201 invece di 409). Gli altri 5 test passano già (comportamento invariato).

- [ ] **Step 3: Implementa il guard**

In `src/app/api/rete/route.ts`, sostituisci il blocco (righe 90-109):

```ts
  // Solo titolare o admin_rete possono creare una rete
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json(
      { error: 'Permesso negato — solo il Titolare puo creare una rete multi-sede' },
      { status: 403 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Campo "nome" obbligatorio' }, { status: 422 })
  }

  const labId = utente.laboratorio_id
```

con:

```ts
  // Solo titolare o admin_rete possono creare una rete
  if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json(
      { error: 'Permesso negato — solo il Titolare puo creare una rete multi-sede' },
      { status: 403 }
    )
  }

  const labId = utente.laboratorio_id

  // Un lab amministra al massimo una rete (no vincolo UNIQUE a DB, solo check applicativo)
  const { data: reteEsistente } = await svc
    .from('reti')
    .select('id')
    .eq('admin_laboratorio_id', labId)
    .maybeSingle()

  if (reteEsistente) {
    return NextResponse.json(
      { error: 'Il laboratorio amministra già una rete' },
      { status: 409 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
    return NextResponse.json({ error: 'Campo "nome" obbligatorio' }, { status: 422 })
  }
```

Nota: la riga `const labId = utente.laboratorio_id` è stata spostata più in alto (serve al guard) — il resto del file sotto (`// Crea la rete`, righe 111 in poi nell'originale) resta invariato e continua a usare `labId`.

- [ ] **Step 4: Esegui il test per confermare il successo**

Run: `npx vitest run tests/unit/rete-route.test.ts`
Expected: PASS, tutti e 6 i test verdi

- [ ] **Step 5: Esegui l'intera suite per verificare nessuna regressione**

Run: `npx vitest run`
Expected: tutti i test verdi (307 preesistenti + 6 nuovi = 313)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/rete/route.ts tests/unit/rete-route.test.ts
git commit -m "fix(rete): add server-side guard — a lab administers at most one rete"
```

---

### Task 2: Componente `RetiNuovaSheet` — bottone + bottom sheet di creazione

**Files:**
- Create: `src/components/features/rete/RetiNuovaSheet.tsx`
- Test: `tests/unit/RetiNuovaSheet.test.tsx`

**Interfaces:**
- Consumes: `POST /api/rete` (Task 1) — invia `{ nome }`, si aspetta `{ error?: string }` su risposta non-2xx
- Produces: `export function RetiNuovaSheet(): JSX.Element` — nessuna prop, componente autonomo — usato dal Task 3 in `rete/page.tsx`

- [ ] **Step 1: Scrivi il test (fallirà: il componente non esiste ancora)**

Crea `tests/unit/RetiNuovaSheet.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RetiNuovaSheet } from '../../src/components/features/rete/RetiNuovaSheet'

describe('RetiNuovaSheet', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  function openSheet() {
    render(<RetiNuovaSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Crea rete' }))
  }

  it('submit senza nome mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit valido chiama POST /api/rete con { nome } nel body e ricarica la pagina', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-1' } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: 'Rete Toscana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/rete')
    const body = JSON.parse(options.body as string)
    expect(body).toEqual({ nome: 'Rete Toscana' })
  })

  it('errore 409 (lab già admin di una rete) mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Il laboratorio amministra già una rete' }),
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: 'Seconda rete' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Il laboratorio amministra già una rete')
    expect(screen.getByLabelText('Nome rete *')).toBeInTheDocument()
  })

  it('errore 422 (nome mancante lato server) mostra messaggio inline', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Campo "nome" obbligatorio' }),
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome rete *'), { target: { value: '   a   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferma creazione' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Campo "nome" obbligatorio')
  })
})
```

- [ ] **Step 2: Esegui il test per confermare il fallimento**

Run: `npx vitest run tests/unit/RetiNuovaSheet.test.tsx`
Expected: FAIL — `Cannot find module '../../src/components/features/rete/RetiNuovaSheet'`

- [ ] **Step 3: Crea il componente**

Crea `src/components/features/rete/RetiNuovaSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

export function RetiNuovaSheet() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setNome('')
  }

  const handleSave = async () => {
    setError(null)

    if (!nome.trim()) {
      setError('Il campo "nome" è obbligatorio')
      return
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch('/api/rete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setSaving(false)
        return
      }

      hapticMedium()
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); hapticLight() }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '44px',
          padding: '0 20px',
          borderRadius: '10px',
          background: 'var(--primary, #D90012)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Crea rete
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={motionTokens.spring.gentle}
              onClick={handleClose}
              style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 40 }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={motionTokens.spring.soft}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--sfc, #E4DFD9)',
                borderRadius: '20px 20px 0 0',
                padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
                zIndex: 50,
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--prs)', borderRadius: 2, margin: '0 auto 20px' }} />

              <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                Crea rete multi-sede
              </h3>

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div>
                <label
                  htmlFor="rete-nuovo-nome"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    fontFamily: 'DM Sans, sans-serif',
                    marginBottom: 3,
                    display: 'block',
                  }}
                >
                  Nome rete *
                </label>
                <input
                  id="rete-nuovo-nome"
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    background: 'var(--elv, #EDEDEA)',
                    border: '1px solid var(--prs, #D4CFC9)',
                    borderRadius: 9,
                    fontSize: 13,
                    color: 'var(--t1)',
                    fontFamily: 'DM Sans, sans-serif',
                    boxSizing: 'border-box',
                  }}
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '13px',
                  background: saving ? 'var(--prs)' : 'var(--primary, #D90012)',
                  color: 'white',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  minHeight: 44,
                }}
              >
                {saving ? 'Creazione...' : 'Conferma creazione'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 4: Esegui il test per confermare il successo**

Run: `npx vitest run tests/unit/RetiNuovaSheet.test.tsx`
Expected: PASS, tutti e 4 i test verdi

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 6: Esegui l'intera suite**

Run: `npx vitest run`
Expected: tutti i test verdi (313 dal Task 1 + 4 nuovi = 317)

- [ ] **Step 7: Commit**

```bash
git add src/components/features/rete/RetiNuovaSheet.tsx tests/unit/RetiNuovaSheet.test.tsx
git commit -m "feat(rete): add RetiNuovaSheet bottom sheet for creating a rete"
```

---

### Task 3: Wiring in `rete/page.tsx` — sostituisci il link rotto

**Files:**
- Modify: `src/app/(app)/rete/page.tsx:1-7` (import) e `src/app/(app)/rete/page.tsx:148-166` (bottone)

**Interfaces:**
- Consumes: `RetiNuovaSheet` (Task 2) — `export function RetiNuovaSheet(): JSX.Element`, nessuna prop
- Produces: nessuna — task terminale del wiring, consumato solo dalla verifica manuale (Task 4)

- [ ] **Step 1: Aggiungi l'import di `RetiNuovaSheet`**

Sostituisci le righe 1-7:

```tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'

export const metadata = { title: 'Rete Multi-Sede' }
```

con:

```tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'
import { RetiNuovaSheet } from '@/components/features/rete/RetiNuovaSheet'

export const metadata = { title: 'Rete Multi-Sede' }
```

Non rimuovere l'import di `Link`: resta usato più sotto per "Gestisci rete →" (riga 276-293, route `/rete/[id]`, fuori scope — B8 5/5).

- [ ] **Step 2: Sostituisci il `<Link href="/rete/nuova">` rotto**

Sostituisci le righe 148-166:

```tsx
            <Link
              href="/rete/nuova"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '44px',
                padding: '0 20px',
                borderRadius: '10px',
                background: 'var(--primary, #D90012)',
                color: '#fff',
                fontFamily,
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Crea rete
            </Link>
```

con:

```tsx
            <RetiNuovaSheet />
```

Nessun'altra modifica al file: il resto dell'empty state (righe 125-147 e 167) e la sezione "reti già configurate" (righe 168-297, incluso il link "Gestisci rete →") non cambiano.

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Esegui l'intera suite**

Run: `npx vitest run`
Expected: tutti i 317 test verdi, nessuna regressione (questo file non ha test dedicati — la verifica manuale è Task 4)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/rete/page.tsx"
git commit -m "fix(rete): remove dead /rete/nuova link, mount RetiNuovaSheet in empty state"
```

---

### Task 4: Verifica finale, QA manuale e aggiornamento memoria

**Files:** nessuna modifica di codice — solo verifica e documentazione

**Interfaces:** nessuna

- [ ] **Step 1: Verifica completa automatica**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: 0 errori TypeScript, 317/317 test verdi, build production pulita

- [ ] **Step 2: QA manuale — flusso di creazione, lab E2E isolato (mai il lab Filippo)**

Con `npm run dev`, e con `npx tsx scripts/seed-e2e.ts` già eseguito per assicurare fixture pulite:

1. Login `e2e-titolare@ua-test.local` → apri `/rete`. Se il lab E2E ha già una rete dal seed, elimina la riga `reti`/`reti_membri` corrispondente via query diretta su Supabase prima di iniziare (per testare l'empty state e la creazione da zero) — non toccare mai il lab Filippo.
2. Verifica che compaia l'empty state "Nessuna rete configurata" con il bottone "Crea rete".
3. Naviga con Tab da tastiera fino al bottone → verifica che riceva il focus, premi Invio → verifica che il bottom sheet si apra.
4. Submit a vuoto (nessun nome compilato) → verifica messaggio d'errore inline (`role="alert"`) e **zero chiamate `POST /api/rete`** in rete (devtools Network).
5. Compila "Nome rete" (es. `Rete Toscana Test`) → submit → verifica **1 sola** `POST /api/rete`, status 201, nessun errore, la pagina si ricarica e ora mostra la rete appena creata con 1 sede (il lab stesso, ruolo Admin).
6. Riapri il bottom sheet (se ancora raggiungibile) o richiama direttamente `POST /api/rete` una seconda volta con un nome diverso (via devtools/fetch dalla console) → verifica **409** con messaggio "Il laboratorio amministra già una rete" — conferma che il guard server-side funziona anche bypassando la UI (che ora non mostra più alcun bottone, essendoci già una rete).
7. **Pulizia:** elimina la rete di test creata (righe `reti`/`reti_membri` per il lab E2E, query diretta) per riportare il lab E2E allo stato baseline, poi ri-esegui `scripts/seed-e2e.ts` se necessario.

- [ ] **Step 3: QA manuale — ruolo `tecnico`/`front_desk`**

1. Login con un utente di test `tecnico` (o `front_desk`) → apri `/rete`.
2. Verifica che compaia solo il messaggio "Nessuna rete configurata. Piano UA Rete richiesto..." (il gate esistente, invariato) — nessun bottone "Crea rete", nessun contenuto rete, per nessuno dei due ruoli.

- [ ] **Step 4: QA multi-viewport e tema**

Ripeti almeno apertura sheet + validazione campo vuoto (Step 2, punti 2-4) su 390px (mobile), 768px (tablet), 1280px (desktop), sia in light che dark mode. Verifica:
- Bottom sheet leggibile e utilizzabile su tutti e 3 i viewport
- Nessuna shadow "raised" in dark mode (solo flat, per stile admin) — verifica `getComputedStyle` sul container dello sheet
- Touch target del bottone "Crea rete" e del bottone "Conferma creazione" ≥ 44px

- [ ] **Step 5: Aggiorna memoria progetto (BP-1)**

Aggiorna `ua-app/memory/MEMORY.md` §0 con una voce "✅ B8 (4/5) RISOLTO — /rete/nuova" seguendo lo stesso formato usato per B8 (1/5)/(2/5)/(3/5): causa, fix (bottom sheet + guard server-side 1-rete-per-lab), scoperte/decisioni di design (CTA solo in empty state, nessun redirect a `/rete/[id]` perché non esiste ancora), verifica (317/317 test, tsc/build puliti, QA manuale su lab E2E), commit finali. Aggiorna anche `ua-app/memory/SESSION_ACTIVE.md` (sostituire, non appendere) indicando che B8 (4/5) è chiuso e il prossimo step è **B8 (5/5) — `/rete/[id]`** (ultima route del backlog B8). Aggiorna `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` marcando la riga `rete/page.tsx:148` come risolta (4/5), lasciando aperta solo `rete/[id]` (5/5).
