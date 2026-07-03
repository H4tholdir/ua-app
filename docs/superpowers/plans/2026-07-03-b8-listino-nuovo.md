# B8 (2/5) — /listino/nuovo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere raggiungibile e funzionante la creazione di una nuova voce di listino, sostituendo il link rotto `/listino/nuovo` con un bottom sheet visibile solo a `titolare`/`admin_rete`, con `POST /api/listino` che applica lo stesso vincolo lato server.

**Architettura:** Nessuna nuova route. Nuovo componente client autonomo `ListinoNuovoSheet` (bottone trigger + bottom sheet, gemello di `ListinoEditSheet.tsx` esistente) che sostituisce il `<Link>` rotto in `listino/page.tsx`, montato solo se `canEdit` (già calcolato server-side nella pagina). `POST /api/listino` esistente riutilizzato, esteso con un controllo ruolo server-side (403 se non `titolare`/`admin_rete`) e con `categoria` validata via `<select>` vincolato alle 9 opzioni del `CHECK` constraint DB (mai testo libero, a differenza dell'edit sheet esistente che non viene toccato).

**Tech Stack:** Next.js 16 App Router, React client components, `motion/react` (AnimatePresence), Supabase (service client lato server), Vitest + Testing Library.

## Global Constraints

- Font: DM Sans ovunque, mai Inter (spec DS v2.3)
- Animazioni: solo token da `src/design-system/motion.ts` (`motionTokens`), mai `duration`/`ease` inline
- Colori: solo `var(--token, #fallback)`, mai hex nuovo fuori da un `var()`
- API POST: allowlist esplicita dei campi già presente in `POST /api/listino`, non toccarla — solo aggiungere il controllo ruolo
- `categoria` è vincolata a 9 valori fissi da `CHECK` constraint DB (`ANALISI/23_ua_database_schema.md:646-652`) — il form deve usare un `<select>`, mai testo libero
- Zero placeholder/TODO nel codice consegnato
- Verifica finale obbligatoria: `npx tsc --noEmit` 0 errori, `npx vitest run` tutti verdi, `npx next build` pulita

---

### Task 1: Hardening ruolo server-side in `POST /api/listino`

**Files:**
- Modify: `src/app/api/listino/route.ts:69-80`
- Test: `tests/unit/listino-route.test.ts` (nuovo file — nessun test esiste oggi per questa route)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task
- Produces: `POST /api/listino` ora restituisce `403 { error: 'Non autorizzato a creare voci di listino' }` per ruoli diversi da `titolare`/`admin_rete` — usato dal Task 2 (`ListinoNuovoSheet` mostra questo messaggio come errore inline se la POST fallisce)

- [ ] **Step 1: Scrivi il test (fallirà: il controllo ruolo non esiste ancora)**

Crea `tests/unit/listino-route.test.ts`:

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

import { POST } from '../../src/app/api/listino/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

let insertedData: Record<string, unknown> | null = null

function mockUtenteRuolo(ruolo: string) {
  insertedData = null
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
    if (table === 'listino') {
      return {
        insert: (data: Record<string, unknown>) => {
          insertedData = data
          return {
            select: () => ({
              single: async () => ({
                data: { id: 'voce-1', codice: data.codice, nome: data.nome, categoria: data.categoria, prezzo_1: data.prezzo_1 },
                error: null,
              }),
            }),
          }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/listino', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VOCE_BODY = {
  nome: 'Corona in zirconia monolitica',
  codice: 'CAD010',
  categoria: 'cad_cam',
  tipo_dispositivo_mdr: 'Corona in zirconia monolitica',
  classe_rischio: 'classe_iia',
  da_conformare: true,
}

describe('POST /api/listino — gating ruolo e campi MDR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('ruolo tecnico → 403, nessuna voce creata', async () => {
    mockUtenteRuolo('tecnico')

    const res = await POST(postRequest(VOCE_BODY))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe('Non autorizzato a creare voci di listino')
    expect(insertedData).toBeNull()
  })

  it('ruolo front_desk → 403', async () => {
    mockUtenteRuolo('front_desk')

    const res = await POST(postRequest(VOCE_BODY))

    expect(res.status).toBe(403)
  })

  it('ruolo titolare → 201, campi MDR passati intatti all\'insert', async () => {
    mockUtenteRuolo('titolare')

    const res = await POST(postRequest(VOCE_BODY))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.voce.id).toBe('voce-1')
    expect(insertedData?.tipo_dispositivo_mdr).toBe('Corona in zirconia monolitica')
    expect(insertedData?.classe_rischio).toBe('classe_iia')
    expect(insertedData?.da_conformare).toBe(true)
  })

  it('ruolo admin_rete → 201', async () => {
    mockUtenteRuolo('admin_rete')

    const res = await POST(postRequest(VOCE_BODY))

    expect(res.status).toBe(201)
  })

  it('campo "nome" mancante → 422, anche con ruolo autorizzato (regressione)', async () => {
    mockUtenteRuolo('titolare')

    const res = await POST(postRequest({ ...VOCE_BODY, nome: '' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('nome')
  })
})
```

- [ ] **Step 2: Esegui il test per confermare il fallimento**

Run: `npx vitest run tests/unit/listino-route.test.ts`
Expected: FAIL su `ruolo tecnico → 403` e `ruolo front_desk → 403` (oggi la POST non controlla il ruolo, quindi risponde 201 invece di 403). Le altre 3 assertion passano già (comportamento invariato).

- [ ] **Step 3: Implementa il controllo ruolo**

In `src/app/api/listino/route.ts`, sostituisci il blocco (righe 69-80):

```ts
  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id
```

con:

```ts
  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const ruolo: string = utente.ruolo ?? ''
  if (ruolo !== 'titolare' && ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato a creare voci di listino' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id
```

Non toccare la funzione `GET` (righe 6-56) — resta accessibile a tutti i ruoli del lab.

- [ ] **Step 4: Esegui il test per confermare il successo**

Run: `npx vitest run tests/unit/listino-route.test.ts`
Expected: PASS, tutti e 5 i test verdi

- [ ] **Step 5: Esegui l'intera suite per verificare nessuna regressione**

Run: `npx vitest run`
Expected: tutti i test verdi (277 preesistenti + 5 nuovi = 282)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/listino/route.ts tests/unit/listino-route.test.ts
git commit -m "fix(listino): require titolare/admin_rete role to create listino voce"
```

---

### Task 2: Componente `ListinoNuovoSheet` — bottone + bottom sheet di creazione

**Files:**
- Create: `src/components/features/listino/ListinoNuovoSheet.tsx`
- Test: `tests/unit/ListinoNuovoSheet.test.tsx`

**Interfaces:**
- Consumes: `POST /api/listino` (Task 1) — invia `{ nome, codice, categoria, unita_misura, descrizione, prezzo_1, prezzo_2, prezzo_3, prezzo_4, tipo_dispositivo_mdr, classe_rischio, da_conformare }`, si aspetta `{ error?: string }` su risposta non-2xx
- Produces: `export function ListinoNuovoSheet(): JSX.Element` — nessuna prop, componente autonomo — usato dal Task 3 in `listino/page.tsx`

- [ ] **Step 1: Scrivi il test (fallirà: il componente non esiste ancora)**

Crea `tests/unit/ListinoNuovoSheet.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ListinoNuovoSheet } from '../../src/components/features/listino/ListinoNuovoSheet'

describe('ListinoNuovoSheet', () => {
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
    render(<ListinoNuovoSheet />)
    fireEvent.click(screen.getByRole('button', { name: 'Nuova voce listino' }))
  }

  it('submit senza nome mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit senza codice mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('codice')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit senza categoria mostra errore e non chiama la POST', async () => {
    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'CAD010' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('categoria')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('select categoria espone le 9 opzioni previste dal CHECK constraint DB', () => {
    openSheet()
    const select = screen.getByLabelText('Categoria *') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)

    expect(values).toEqual([
      '', 'protesi_fissa', 'protesi_mobile', 'implantologia', 'cad_cam',
      'ortodonzia', 'scheletrato', 'riparazione', 'materiale', 'altro',
    ])
  })

  it('select classe di rischio espone le 4 opzioni MDR + non specificata', () => {
    openSheet()
    const select = screen.getByLabelText('Classe di rischio MDR') as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)

    expect(values).toEqual(['', 'classe_i', 'classe_iia', 'classe_iib', 'classe_iii'])
  })

  it('submit valido chiama POST /api/listino con tutti i campi MDR nel body e ricarica la pagina', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ voce: { id: 'voce-1', codice: 'CAD010', nome: 'Corona in zirconia', categoria: 'cad_cam', prezzo_1: 120 } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'CAD010' } })
    fireEvent.change(screen.getByLabelText('Categoria *'), { target: { value: 'cad_cam' } })
    fireEvent.change(screen.getByLabelText('Tipo dispositivo MDR'), { target: { value: 'Corona in zirconia monolitica' } })
    fireEvent.change(screen.getByLabelText('Classe di rischio MDR'), { target: { value: 'classe_iia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/listino')
    const body = JSON.parse(options.body as string)
    expect(body.nome).toBe('Corona in zirconia')
    expect(body.codice).toBe('CAD010')
    expect(body.categoria).toBe('cad_cam')
    expect(body.tipo_dispositivo_mdr).toBe('Corona in zirconia monolitica')
    expect(body.classe_rischio).toBe('classe_iia')
    expect(body.da_conformare).toBe(true)
  })

  it('errore server mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Non autorizzato a creare voci di listino' }),
    })

    openSheet()
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Corona in zirconia' } })
    fireEvent.change(screen.getByLabelText('Codice *'), { target: { value: 'CAD010' } })
    fireEvent.change(screen.getByLabelText('Categoria *'), { target: { value: 'cad_cam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crea voce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Non autorizzato a creare voci di listino')
    expect(screen.getByLabelText('Nome *')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui il test per confermare il fallimento**

Run: `npx vitest run tests/unit/ListinoNuovoSheet.test.tsx`
Expected: FAIL — `Cannot find module '../../src/components/features/listino/ListinoNuovoSheet'`

- [ ] **Step 3: Crea il componente**

Crea `src/components/features/listino/ListinoNuovoSheet.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

const CATEGORIE: Array<[string, string]> = [
  ['protesi_fissa', 'Protesi fissa'],
  ['protesi_mobile', 'Protesi mobile'],
  ['implantologia', 'Implantologia'],
  ['cad_cam', 'CAD/CAM'],
  ['ortodonzia', 'Ortodonzia'],
  ['scheletrato', 'Scheletrato'],
  ['riparazione', 'Riparazione'],
  ['materiale', 'Materiale'],
  ['altro', 'Altro'],
]

const CLASSI_RISCHIO: Array<[string, string]> = [
  ['classe_i', 'Classe I'],
  ['classe_iia', 'Classe IIa'],
  ['classe_iib', 'Classe IIb'],
  ['classe_iii', 'Classe III'],
]

function emptyForm() {
  return {
    nome: '',
    codice: '',
    categoria: '',
    unita_misura: 'pz',
    descrizione: '',
    prezzo_1: 0,
    prezzo_2: 0,
    prezzo_3: 0,
    prezzo_4: 0,
    tipo_dispositivo_mdr: '',
    classe_rischio: '',
    da_conformare: true,
  }
}

export function ListinoNuovoSheet() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setForm(emptyForm())
  }

  const handleSave = async () => {
    setError(null)

    if (!form.nome.trim()) {
      setError('Il campo "nome" è obbligatorio')
      return
    }
    if (!form.codice.trim()) {
      setError('Il campo "codice" è obbligatorio')
      return
    }
    if (!form.categoria) {
      setError('Il campo "categoria" è obbligatorio')
      return
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch('/api/listino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          codice: form.codice.trim(),
          categoria: form.categoria,
          unita_misura: form.unita_misura.trim() || 'pz',
          descrizione: form.descrizione.trim() || null,
          prezzo_1: form.prezzo_1 || null,
          prezzo_2: form.prezzo_2 || null,
          prezzo_3: form.prezzo_3 || null,
          prezzo_4: form.prezzo_4 || null,
          tipo_dispositivo_mdr: form.tipo_dispositivo_mdr.trim() || null,
          classe_rischio: form.classe_rischio || null,
          da_conformare: form.da_conformare,
        }),
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    background: 'var(--elv, #EDEDEA)',
    border: '1px solid var(--prs, #D4CFC9)',
    borderRadius: 9,
    fontSize: 13,
    color: 'var(--t1)',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--t2)',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    fontFamily: 'DM Sans, sans-serif',
    marginBottom: 3,
    display: 'block',
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); hapticLight() }}
        aria-label="Nuova voce listino"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '40px',
          minHeight: '52px',
          padding: '0 16px',
          borderRadius: '12px',
          background: 'var(--primary, #D90012)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 0 16px rgba(0,0,0,.12)',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Nuova voce
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
                Nuova voce listino
              </h3>

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-nome">Nome *</label>
                  <input
                    id="listino-nuovo-nome"
                    style={inputStyle}
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle} htmlFor="listino-nuovo-codice">Codice *</label>
                    <input
                      id="listino-nuovo-codice"
                      style={inputStyle}
                      value={form.codice}
                      onChange={e => setForm(p => ({ ...p, codice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="listino-nuovo-um">U.M.</label>
                    <input
                      id="listino-nuovo-um"
                      style={inputStyle}
                      value={form.unita_misura}
                      onChange={e => setForm(p => ({ ...p, unita_misura: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-categoria">Categoria *</label>
                  <select
                    id="listino-nuovo-categoria"
                    style={inputStyle}
                    value={form.categoria}
                    onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  >
                    <option value="">Seleziona categoria</option>
                    {CATEGORIE.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-descrizione">Descrizione</label>
                  <input
                    id="listino-nuovo-descrizione"
                    style={inputStyle}
                    value={form.descrizione}
                    onChange={e => setForm(p => ({ ...p, descrizione: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Prezzi (€)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                    {(['prezzo_1', 'prezzo_2', 'prezzo_3', 'prezzo_4'] as const).map((k, i) => (
                      <div key={k}>
                        <label style={{ ...labelStyle, fontSize: 10 }} htmlFor={`listino-nuovo-${k}`}>P{i + 1}</label>
                        <input
                          id={`listino-nuovo-${k}`}
                          type="number"
                          min="0"
                          step="0.01"
                          style={{ ...inputStyle, textAlign: 'right' }}
                          value={form[k] || ''}
                          onChange={e => setForm(p => ({ ...p, [k]: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-tipo-mdr">Tipo dispositivo MDR</label>
                  <input
                    id="listino-nuovo-tipo-mdr"
                    style={inputStyle}
                    placeholder='Es. "Corona in zirconia monolitica"'
                    value={form.tipo_dispositivo_mdr}
                    onChange={e => setForm(p => ({ ...p, tipo_dispositivo_mdr: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={labelStyle} htmlFor="listino-nuovo-classe-rischio">Classe di rischio MDR</label>
                  <select
                    id="listino-nuovo-classe-rischio"
                    style={inputStyle}
                    value={form.classe_rischio}
                    onChange={e => setForm(p => ({ ...p, classe_rischio: e.target.value }))}
                  >
                    <option value="">Non specificata</option>
                    {CLASSI_RISCHIO.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--t1)' }}>
                  <input
                    type="checkbox"
                    checked={form.da_conformare}
                    onChange={e => setForm(p => ({ ...p, da_conformare: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                  Richiede Dichiarazione di Conformità
                </label>
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
                {saving ? 'Creazione...' : 'Crea voce'}
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

Run: `npx vitest run tests/unit/ListinoNuovoSheet.test.tsx`
Expected: PASS, tutti e 7 i test verdi

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 6: Esegui l'intera suite**

Run: `npx vitest run`
Expected: tutti i test verdi (282 dal Task 1 + 7 nuovi = 289)

- [ ] **Step 7: Commit**

```bash
git add src/components/features/listino/ListinoNuovoSheet.tsx tests/unit/ListinoNuovoSheet.test.tsx
git commit -m "feat(listino): add ListinoNuovoSheet bottom sheet for creating voci"
```

---

### Task 3: Wiring in `listino/page.tsx` — sostituisci il link rotto, gating su `canEdit`

**Files:**
- Modify: `src/app/(app)/listino/page.tsx`

**Interfaces:**
- Consumes: `ListinoNuovoSheet` (Task 2) — `export function ListinoNuovoSheet(): JSX.Element`, nessuna prop
- Produces: nessuna — task terminale del wiring, consumato solo dalla verifica manuale (Task 4)

- [ ] **Step 1: Rimuovi l'import di `Link` e aggiungi quello di `ListinoNuovoSheet`**

Sostituisci le righe 1-8:

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ListinoVoceRow } from '@/components/features/listino/ListinoVoceRow'
import type { VoceListino } from '@/components/features/listino/ListinoVoceRow'
```

con:

```tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ListinoVoceRow } from '@/components/features/listino/ListinoVoceRow'
import type { VoceListino } from '@/components/features/listino/ListinoVoceRow'
import { ListinoNuovoSheet } from '@/components/features/listino/ListinoNuovoSheet'
```

- [ ] **Step 2: Sostituisci il blocco `addButton`**

Sostituisci le righe 49-77 (l'intero blocco `const addButton = (<Link ...>...)`):

```tsx
  const addButton = (
    <Link
      href="/listino/nuovo"
      aria-label="Nuova voce listino"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: '40px',
        minHeight: '52px',
        padding: '0 16px',
        borderRadius: '12px',
        background: 'var(--primary, #D90012)',
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700,
        fontSize: '14px',
        textDecoration: 'none',
        boxShadow: '0 0 16px rgba(0,0,0,.12)',
        flexShrink: 0,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Nuova voce
    </Link>
  )
```

con:

```tsx
  const addButton = canEdit ? <ListinoNuovoSheet /> : undefined
```

Il resto del file (dal `return (` in poi) non cambia — `<AppHeader title="Listino" actions={addButton} />` accetta già `actions?: ReactNode`, quindi `undefined` è un valore valido (nessuna azione mostrata in header).

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: 0 errori

- [ ] **Step 4: Esegui l'intera suite**

Run: `npx vitest run`
Expected: tutti i 289 test verdi, nessuna regressione (questo file non ha test dedicati — la verifica del gating `canEdit` è manuale, Task 4)

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/listino/page.tsx"
git commit -m "fix(listino): remove dead /listino/nuovo link, mount ListinoNuovoSheet gated on canEdit"
```

---

### Task 4: Verifica finale, QA manuale e aggiornamento memoria

**Files:** nessuna modifica di codice — solo verifica e documentazione

**Interfaces:** nessuna

- [ ] **Step 1: Verifica completa automatica**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: 0 errori TypeScript, 289/289 test verdi, build production pulita

- [ ] **Step 2: QA manuale — ruolo `titolare` (o `admin_rete`), lab Filippo (sola lettura salvo pulizia dati di test)**

Con `npm run dev`:
1. Apri `/listino` con l'utente titolare → verifica bottone "+ Nuova voce" persistente in header
2. Naviga con Tab da tastiera fino al bottone → verifica che riceva il focus, premi Invio → verifica che il bottom sheet si apra
3. Compila Nome, Codice (univoco, es. `TEST-B8-002`), scegli una Categoria dal select, opzionalmente Tipo dispositivo MDR e Classe di rischio → invia
4. Verifica che non compaia alcun errore, che il browser ricarichi la pagina e che la nuova voce sia visibile nella categoria scelta
5. **Pulizia:** elimina la voce di test creata (via Supabase o soft-delete `attivo=false`) per non sporcare i dati reali del lab Filippo
6. Ripeti il submit senza compilare Nome/Codice/Categoria → verifica che compaia il messaggio di errore corrispondente e che la POST non venga chiamata (devtools Network)

- [ ] **Step 3: QA manuale — ruolo `tecnico`/`front_desk`**

1. Login con un utente di test `tecnico` (o `front_desk`) → apri `/listino`
2. Verifica che **nessuna** CTA "Nuova voce" sia visibile in header (né in DOM, ispeziona con devtools) — solo lettura del listino esistente

- [ ] **Step 4: QA multi-viewport e tema**

Ripeti almeno il flusso "crea voce" (Step 2) su 390px (mobile), 768px (tablet), 1280px (desktop), sia in light che dark mode. Verifica:
- Bottom sheet leggibile e utilizzabile su tutti e 3 i viewport
- Nessuna shadow "raised" in dark mode (solo flat, per stile admin)
- Touch target del bottone "+ Nuova voce" e del bottone "Crea voce" ≥ 44px

- [ ] **Step 5: Aggiorna memoria progetto (BP-1)**

Aggiorna `ua-app/memory/MEMORY.md` §0 con una voce "✅ B8 (2/5) RISOLTO — /listino/nuovo" seguendo lo stesso formato usato per B8 (1/5): causa, fix (gating ruolo + select categoria vincolato + campi MDR esposti), verifica (289/289 test, tsc/build puliti), commit finali. Aggiorna anche `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` marcando la riga `listino/page.tsx:51` come risolta (2/5), lasciando le altre 3 route di B8 aperte (`qualita/rischi/[id]`, `rete/nuova`, `rete/[id]`).
