# B8 (1/5) — /magazzino/nuovo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere raggiungibile e funzionante la creazione di un nuovo articolo magazzino, sostituendo il link rotto `/magazzino/nuovo` con un bottom sheet, con CTA sia in empty state sia persistente in header.

**Architettura:** Nessuna nuova route. Nuovo bottom sheet client component (`MagazzinoAddSheet`) montato da `MagazzinoSearchList` (che diventa proprietaria dello stato lista+sheet, spostando lì la logica empty-state già in `magazzino/page.tsx`). `POST /api/magazzino` esistente riutilizzato, esteso di 2 campi nell'allowlist. `EmptyState` esteso per supportare CTA keyboard-accessibili quando non c'è `href`.

**Tech Stack:** Next.js 16 App Router, React client components, `motion/react` (AnimatePresence), Supabase (service client lato server), Vitest + Testing Library.

## Global Constraints

- Font: DM Sans ovunque, mai Inter (spec DS v2.3)
- Animazioni: solo token da `src/design-system/motion.ts` (`motionTokens`), mai `duration`/`ease` inline
- Colori: solo `var(--token, #fallback)`, mai hex nuovo fuori da un `var()`
- Touch target ≥ 44px su elementi interattivi mobile
- API PATCH/POST: allowlist esplicita dei campi, mai blocklist
- Zero placeholder/TODO nel codice consegnato
- Verifica finale obbligatoria: `npx tsc --noEmit` 0 errori, `npx vitest run` tutti verdi, `npx next build` pulita

---

### Task 1: Estendi allowlist POST /api/magazzino con scheda_tecnica_url e scheda_sicurezza_url

**Files:**
- Modify: `src/app/api/magazzino/route.ts:102-121`

**Interfaces:**
- Consumes: nessuna dipendenza da altri task
- Produces: `POST /api/magazzino` ora persiste anche `scheda_tecnica_url` e `scheda_sicurezza_url` se presenti nel body — usato dal Task 3 (`MagazzinoAddSheet` li invia già nel payload)

Nota: questo handler non ha oggi alcun test automatico (nessun file `tests/**/*magazzino*route*`), e mockare l'intera catena Supabase (`.from().insert().select().single()`) per 2 campi opzionali aggiuntivi allo stesso pattern già usato per altri 10 campi non testati sarebbe sproporzionato. La verifica di questo task è manuale, in Task 6.

- [ ] **Step 1: Leggi il file per conferma del contesto esatto**

Il blocco da modificare (righe 102-121) è:

```ts
  const insertData = {
    laboratorio_id: labId,
    codice_articolo: (body.codice_articolo as string).trim(),
    nome: (body.nome as string).trim(),
    produttore: body.produttore ?? null,
    categoria: body.categoria ?? null,
    sotto_categoria: body.sotto_categoria ?? null,
    fornitore_id: body.fornitore_id ?? null,
    um_acquisto: body.um_acquisto ?? 'pz',
    um_scarico: body.um_scarico ?? 'pz',
    quantita_per_confezione: body.quantita_per_confezione ?? 1,
    costo_unitario: body.costo_unitario ?? null,
    prezzo_unitario: body.prezzo_unitario ?? null,
    scorta_attuale: body.scorta_attuale ?? 0,
    scorta_minima: body.scorta_minima ?? 0,
    dispositivo_medico: body.dispositivo_medico ?? false,
    traccia_lotto: body.traccia_lotto ?? false,
    codice_ce: body.codice_ce ?? null,
    attivo: true,
  }
```

- [ ] **Step 2: Aggiungi i 2 campi all'allowlist**

Sostituisci il blocco sopra con:

```ts
  const insertData = {
    laboratorio_id: labId,
    codice_articolo: (body.codice_articolo as string).trim(),
    nome: (body.nome as string).trim(),
    produttore: body.produttore ?? null,
    categoria: body.categoria ?? null,
    sotto_categoria: body.sotto_categoria ?? null,
    fornitore_id: body.fornitore_id ?? null,
    um_acquisto: body.um_acquisto ?? 'pz',
    um_scarico: body.um_scarico ?? 'pz',
    quantita_per_confezione: body.quantita_per_confezione ?? 1,
    costo_unitario: body.costo_unitario ?? null,
    prezzo_unitario: body.prezzo_unitario ?? null,
    scorta_attuale: body.scorta_attuale ?? 0,
    scorta_minima: body.scorta_minima ?? 0,
    dispositivo_medico: body.dispositivo_medico ?? false,
    traccia_lotto: body.traccia_lotto ?? false,
    codice_ce: body.codice_ce ?? null,
    scheda_tecnica_url: body.scheda_tecnica_url ?? null,
    scheda_sicurezza_url: body.scheda_sicurezza_url ?? null,
    attivo: true,
  }
```

- [ ] **Step 3: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: 0 errori (il campo esiste già nello schema Supabase generato, `Insert` type di `magazzino` accetta `scheda_tecnica_url?: string | null` e `scheda_sicurezza_url?: string | null`)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/magazzino/route.ts
git commit -m "feat(magazzino): allow scheda_tecnica_url/scheda_sicurezza_url on POST /api/magazzino"
```

---

### Task 2: EmptyState — CTA keyboard-accessibile quando c'è solo onClick

**Files:**
- Modify: `src/components/ui/EmptyState.tsx`
- Test: `tests/unit/EmptyState.test.tsx` (nuovo)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task
- Produces: `EmptyState` con `cta={{label, onClick}}` (senza `href`) renderizza un `<button type="button">` invece di un `<a>` senza `href` — usato dal Task 4 (`MagazzinoSearchList` userà questa variante per il caso magazzino vuoto)

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `tests/unit/EmptyState.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState } from '../../src/components/ui/EmptyState'

describe('EmptyState', () => {
  it('con href renderizza un link navigabile', () => {
    render(<EmptyState title="Vuoto" cta={{ label: 'Vai', href: '/altrove' }} />)
    const link = screen.getByRole('link', { name: 'Vai' })
    expect(link.getAttribute('href')).toBe('/altrove')
  })

  it('con solo onClick renderizza un bottone accessibile da tastiera, non un link senza href', () => {
    const onClick = vi.fn()
    render(<EmptyState title="Vuoto" cta={{ label: 'Apri', onClick }} />)
    expect(screen.queryByRole('link')).toBeNull()
    const button = screen.getByRole('button', { name: 'Apri' })
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('senza cta non renderizza alcun trigger', () => {
    render(<EmptyState title="Vuoto" />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/EmptyState.test.tsx`
Expected: FAIL sul secondo test — `getByRole('button', { name: 'Apri' })` non trova nulla (il codice attuale renderizza `<a onClick={...}>` senza `href`, che non ha ruolo accessibile `button`)

- [ ] **Step 3: Implementa il fix**

Sostituisci il contenuto di `src/components/ui/EmptyState.tsx` con:

```tsx
'use client'
import { motion } from 'motion/react'
import { motionTokens } from '@/design-system/motion'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  cta?: { label: string; href?: string; onClick?: () => void }
}

const ctaStyle: React.CSSProperties = {
  display: 'inline-block', padding: '12px 24px',
  background: 'var(--primary, #D90012)', color: 'white',
  borderRadius: 12, fontWeight: 700, fontSize: 14,
  textDecoration: 'none', cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  border: 'none',
}

export function EmptyState({ icon = '📋', title, description, cta }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.enter }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
        minHeight: 280,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{icon}</div>
      <h3 style={{
        fontSize: 18, fontWeight: 700, color: 'var(--t1, #1C1916)',
        marginBottom: description ? 8 : cta ? 20 : 0, fontFamily: 'DM Sans, sans-serif',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 14, color: 'var(--t2, #4A3D33)',
          marginBottom: cta ? 24 : 0, maxWidth: 280, lineHeight: 1.5,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {description}
        </p>
      )}
      {cta && (
        cta.href ? (
          <a href={cta.href} onClick={cta.onClick} style={ctaStyle}>
            {cta.label}
          </a>
        ) : (
          <button type="button" onClick={cta.onClick} style={ctaStyle}>
            {cta.label}
          </button>
        )
      )}
    </motion.div>
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/EmptyState.test.tsx`
Expected: PASS su tutti e 3 i test

- [ ] **Step 5: Verifica che nessun chiamante esistente si sia rotto**

Run: `npx vitest run`
Expected: tutti i test verdi, inclusi quelli di `OrdiniList`/`InvitaCollaboratoreSheet` se esistenti (nessuno di quei componenti dipende dal fatto che `EmptyState` con `onClick` renderizzi un `<a>` invece che un `<button>` — il comportamento click resta identico)

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/EmptyState.tsx tests/unit/EmptyState.test.tsx
git commit -m "fix(ui): EmptyState renders a real button when cta has no href (keyboard a11y)"
```

---

### Task 3: Nuovo componente MagazzinoAddSheet

**Files:**
- Create: `src/components/features/magazzino/MagazzinoAddSheet.tsx`
- Test: `tests/unit/MagazzinoAddSheet.test.tsx` (nuovo)

**Interfaces:**
- Consumes: `hapticMedium` da `@/lib/feedback/haptic`, `motionTokens`/`useReducedMotion` da `@/design-system/motion`, `POST /api/magazzino` (esteso da Task 1, ma il componente funziona anche senza quell'estensione — i 2 campi extra verrebbero solo ignorati dal server)
- Produces: `export function MagazzinoAddSheet(props: MagazzinoAddSheetProps)`, `export interface FornitoreOption { id: string; ragione_sociale: string }`, `export interface ArticoloCreato { id: string; codice_articolo: string; nome: string; produttore: string | null; categoria: string | null; um_scarico: string; scorta_attuale: number; scorta_minima: number; dispositivo_medico: boolean }` — usati dal Task 4 (`MagazzinoSearchList`)

`MagazzinoAddSheetProps`:
```ts
interface MagazzinoAddSheetProps {
  open: boolean
  categorieEsistenti: string[]
  fornitori: FornitoreOption[]
  onClose: () => void
  onArticoloCreato: (articolo: ArticoloCreato) => void
}
```

- [ ] **Step 1: Scrivi il test di validazione client che fallisce**

Crea `tests/unit/MagazzinoAddSheet.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MagazzinoAddSheet } from '../../src/components/features/magazzino/MagazzinoAddSheet'

describe('MagazzinoAddSheet', () => {
  const noop = () => {}

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('submit senza nome mostra errore e non chiama la POST', async () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('nome')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('submit senza codice articolo mostra errore e non chiama la POST', async () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Gesso extra-duro' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('codice')
    expect(fetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/MagazzinoAddSheet.test.tsx`
Expected: FAIL — il modulo `../../src/components/features/magazzino/MagazzinoAddSheet` non esiste ancora

- [ ] **Step 3: Implementa il componente completo**

Crea `src/components/features/magazzino/MagazzinoAddSheet.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticMedium } from '@/lib/feedback/haptic'

export interface FornitoreOption {
  id: string
  ragione_sociale: string
}

export interface ArticoloCreato {
  id: string
  codice_articolo: string
  nome: string
  produttore: string | null
  categoria: string | null
  um_scarico: string
  scorta_attuale: number
  scorta_minima: number
  dispositivo_medico: boolean
}

interface MagazzinoAddSheetProps {
  open: boolean
  categorieEsistenti: string[]
  fornitori: FornitoreOption[]
  onClose: () => void
  onArticoloCreato: (articolo: ArticoloCreato) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  padding: '0 14px',
  borderRadius: '12px',
  border: '1px solid rgba(0,0,0,.06)',
  background: 'var(--bg, #DDD8D3)',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.10), inset -2px -2px 5px rgba(255,255,255,.70)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px',
}

function emptyForm() {
  return {
    nome: '',
    codiceArticolo: '',
    categoria: '',
    umAcquisto: 'pz',
    umScarico: 'g',
    scortaMinima: 0,
    dispositivoMedico: false,
    tracciaLotto: false,
    tracciaLottoTouched: false,
    produttore: '',
    fornitoreId: '',
    sottoCategoria: '',
    quantitaPerConfezione: 1,
    costoUnitario: '',
    prezzoUnitario: '',
    scortaAttuale: 0,
    codiceCe: '',
    schedaTecnicaUrl: '',
    schedaSicurezzaUrl: '',
  }
}

export function MagazzinoAddSheet({
  open,
  categorieEsistenti,
  fornitori,
  onClose,
  onArticoloCreato,
}: MagazzinoAddSheetProps) {
  const reducedMotion = useReducedMotion()

  const [form, setForm] = useState(emptyForm())
  const [showAltriDettagli, setShowAltriDettagli] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDispositivoMedicoChange = (checked: boolean) => {
    setForm((f) => ({
      ...f,
      dispositivoMedico: checked,
      tracciaLotto: f.tracciaLottoTouched ? f.tracciaLotto : checked,
    }))
  }

  const handleTracciaLottoChange = (checked: boolean) => {
    setForm((f) => ({ ...f, tracciaLotto: checked, tracciaLottoTouched: true }))
  }

  const handleClose = () => {
    setForm(emptyForm())
    setShowAltriDettagli(false)
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)

    if (!form.nome.trim()) {
      setError('Il campo "nome" è obbligatorio')
      return
    }
    if (!form.codiceArticolo.trim()) {
      setError('Il campo "codice articolo" è obbligatorio')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/magazzino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          codice_articolo: form.codiceArticolo.trim(),
          categoria: form.categoria.trim() || null,
          um_acquisto: form.umAcquisto,
          um_scarico: form.umScarico,
          scorta_minima: form.scortaMinima,
          dispositivo_medico: form.dispositivoMedico,
          traccia_lotto: form.tracciaLotto,
          produttore: form.produttore.trim() || null,
          fornitore_id: form.fornitoreId || null,
          sotto_categoria: form.sottoCategoria.trim() || null,
          quantita_per_confezione: form.quantitaPerConfezione,
          costo_unitario: form.costoUnitario === '' ? null : Number(form.costoUnitario),
          prezzo_unitario: form.prezzoUnitario === '' ? null : Number(form.prezzoUnitario),
          scorta_attuale: form.scortaAttuale,
          codice_ce: form.codiceCe.trim() || null,
          scheda_tecnica_url: form.schedaTecnicaUrl.trim() || null,
          scheda_sicurezza_url: form.schedaSicurezzaUrl.trim() || null,
        }),
      })

      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setLoading(false)
        return
      }

      const { articolo } = await res.json() as {
        articolo: { id: string; codice_articolo: string; nome: string; scorta_attuale: number; scorta_minima: number }
      }
      hapticMedium()

      onArticoloCreato({
        id: articolo.id,
        codice_articolo: articolo.codice_articolo,
        nome: articolo.nome,
        produttore: form.produttore.trim() || null,
        categoria: form.categoria.trim() || null,
        um_scarico: form.umScarico,
        scorta_attuale: articolo.scorta_attuale,
        scorta_minima: articolo.scorta_minima,
        dispositivo_medico: form.dispositivoMedico,
      })

      setForm(emptyForm())
      setShowAltriDettagli(false)
    } catch {
      setError('Errore di rete — controlla la connessione')
    } finally {
      setLoading(false)
    }
  }

  const sheetTransition = reducedMotion ? { duration: 0 } : motionTokens.spring.soft
  const overlayTransition = reducedMotion
    ? { duration: 0 }
    : { duration: motionTokens.duration.normal, ease: motionTokens.easing.standard }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="magazzino-add-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,22,.55)', zIndex: 200 }}
            aria-hidden="true"
          />

          <motion.div
            key="magazzino-add-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="magazzino-add-title"
            initial={{ transform: 'translateY(100%)' }}
            animate={{ transform: 'translateY(0%)' }}
            exit={{ transform: 'translateY(100%)' }}
            transition={sheetTransition}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              background: 'var(--sfc, #E4DFD9)',
              borderRadius: '20px 20px 0 0',
              padding: '0 0 env(safe-area-inset-bottom, 20px)',
              maxHeight: '92dvh',
              overflowY: 'auto',
            }}
          >
            <div aria-hidden="true" style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--t3, #6B5C51)', margin: '12px auto 0' }} />

            <div style={{ padding: '16px 20px 20px' }}>
              <h2 id="magazzino-add-title" style={{ margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--t1, #1C1916)' }}>
                Nuovo articolo
              </h2>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-nome" style={labelStyle}>Nome *</label>
                <input
                  id="magazzino-nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  style={inputStyle}
                  aria-required="true"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-codice" style={labelStyle}>Codice articolo *</label>
                <input
                  id="magazzino-codice"
                  type="text"
                  value={form.codiceArticolo}
                  onChange={(e) => setForm((f) => ({ ...f, codiceArticolo: e.target.value }))}
                  style={inputStyle}
                  aria-required="true"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-categoria" style={labelStyle}>Categoria</label>
                <input
                  id="magazzino-categoria"
                  type="text"
                  list="magazzino-categorie-esistenti"
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  style={inputStyle}
                  placeholder="Es. Gessi, Ceramiche, Leghe..."
                />
                <datalist id="magazzino-categorie-esistenti">
                  {categorieEsistenti.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="magazzino-um-acquisto" style={labelStyle}>UM acquisto</label>
                  <select
                    id="magazzino-um-acquisto"
                    value={form.umAcquisto}
                    onChange={(e) => setForm((f) => ({ ...f, umAcquisto: e.target.value }))}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="pz">pz</option>
                    <option value="Kg">Kg</option>
                    <option value="litro">litro</option>
                    <option value="confezione">confezione</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="magazzino-um-scarico" style={labelStyle}>UM scarico</label>
                  <select
                    id="magazzino-um-scarico"
                    value={form.umScarico}
                    onChange={(e) => setForm((f) => ({ ...f, umScarico: e.target.value }))}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="pezzo">pezzo</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-scorta-minima" style={labelStyle}>Scorta minima</label>
                <input
                  id="magazzino-scorta-minima"
                  type="number"
                  min={0}
                  value={form.scortaMinima}
                  onChange={(e) => setForm((f) => ({ ...f, scortaMinima: Number(e.target.value) }))}
                  style={inputStyle}
                />
              </div>

              <div style={checkboxRowStyle}>
                <input
                  id="magazzino-dispositivo-medico"
                  type="checkbox"
                  checked={form.dispositivoMedico}
                  onChange={(e) => handleDispositivoMedicoChange(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="magazzino-dispositivo-medico" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)' }}>
                  È un dispositivo medico
                </label>
              </div>

              <div style={checkboxRowStyle}>
                <input
                  id="magazzino-traccia-lotto"
                  type="checkbox"
                  checked={form.tracciaLotto}
                  onChange={(e) => handleTracciaLottoChange(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="magazzino-traccia-lotto" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)' }}>
                  Richiede tracciabilità lotto in lavorazione
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowAltriDettagli((v) => !v)}
                aria-expanded={showAltriDettagli}
                aria-controls="magazzino-altri-dettagli"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 0',
                  marginBottom: showAltriDettagli ? '16px' : '20px',
                  color: 'var(--t2, #4A3D33)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showAltriDettagli ? '− Nascondi altri dettagli' : '+ Altri dettagli'}
              </button>

              {showAltriDettagli && (
                <div id="magazzino-altri-dettagli">
                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-produttore" style={labelStyle}>Produttore</label>
                    <input
                      id="magazzino-produttore"
                      type="text"
                      value={form.produttore}
                      onChange={(e) => setForm((f) => ({ ...f, produttore: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-fornitore" style={labelStyle}>Fornitore</label>
                    <select
                      id="magazzino-fornitore"
                      value={form.fornitoreId}
                      onChange={(e) => setForm((f) => ({ ...f, fornitoreId: e.target.value }))}
                      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Nessun fornitore</option>
                      {fornitori.map((f) => (
                        <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-sotto-categoria" style={labelStyle}>Sotto-categoria</label>
                    <input
                      id="magazzino-sotto-categoria"
                      type="text"
                      value={form.sottoCategoria}
                      onChange={(e) => setForm((f) => ({ ...f, sottoCategoria: e.target.value }))}
                      style={inputStyle}
                      placeholder="Es. Denti confezionati"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-qta-confezione" style={labelStyle}>Quantità per confezione</label>
                    <input
                      id="magazzino-qta-confezione"
                      type="number"
                      min={0}
                      value={form.quantitaPerConfezione}
                      onChange={(e) => setForm((f) => ({ ...f, quantitaPerConfezione: Number(e.target.value) }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="magazzino-costo-unitario" style={labelStyle}>Costo unitario</label>
                      <input
                        id="magazzino-costo-unitario"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.costoUnitario}
                        onChange={(e) => setForm((f) => ({ ...f, costoUnitario: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="magazzino-prezzo-unitario" style={labelStyle}>Prezzo unitario</label>
                      <input
                        id="magazzino-prezzo-unitario"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.prezzoUnitario}
                        onChange={(e) => setForm((f) => ({ ...f, prezzoUnitario: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-scorta-attuale" style={labelStyle}>Scorta attuale</label>
                    <input
                      id="magazzino-scorta-attuale"
                      type="number"
                      min={0}
                      value={form.scortaAttuale}
                      onChange={(e) => setForm((f) => ({ ...f, scortaAttuale: Number(e.target.value) }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-codice-ce" style={labelStyle}>Codice CE</label>
                    <input
                      id="magazzino-codice-ce"
                      type="text"
                      value={form.codiceCe}
                      onChange={(e) => setForm((f) => ({ ...f, codiceCe: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-scheda-tecnica" style={labelStyle}>Scheda tecnica (URL)</label>
                    <input
                      id="magazzino-scheda-tecnica"
                      type="text"
                      value={form.schedaTecnicaUrl}
                      onChange={(e) => setForm((f) => ({ ...f, schedaTecnicaUrl: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="magazzino-scheda-sicurezza" style={labelStyle}>Scheda di sicurezza (URL)</label>
                    <input
                      id="magazzino-scheda-sicurezza"
                      type="text"
                      value={form.schedaSicurezzaUrl}
                      onChange={(e) => setForm((f) => ({ ...f, schedaSicurezzaUrl: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  style={{
                    minHeight: '52px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--primary, #D90012)',
                    color: '#fff',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Salvataggio...' : 'Salva articolo'}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    minHeight: '48px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(0,0,0,.08)',
                    background: 'transparent',
                    color: 'var(--t2, #4A3D33)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Esegui i test di validazione e verifica che passino**

Run: `npx vitest run tests/unit/MagazzinoAddSheet.test.tsx`
Expected: PASS sui 2 test già scritti

- [ ] **Step 5: Aggiungi i test di sincronizzazione traccia_lotto/dispositivo_medico**

Aggiungi a `tests/unit/MagazzinoAddSheet.test.tsx`, dentro il blocco `describe`:

```tsx
  it('attivare "dispositivo medico" sincronizza "traccia lotto" finché non viene toccato manualmente', () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    const dm = screen.getByLabelText('È un dispositivo medico') as HTMLInputElement
    const tl = screen.getByLabelText('Richiede tracciabilità lotto in lavorazione') as HTMLInputElement

    expect(tl.checked).toBe(false)
    fireEvent.click(dm)
    expect(tl.checked).toBe(true)
    fireEvent.click(dm)
    expect(tl.checked).toBe(false)
  })

  it('dopo un tocco manuale su "traccia lotto" non si sincronizza più con "dispositivo medico"', () => {
    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={noop} />
    )

    const dm = screen.getByLabelText('È un dispositivo medico') as HTMLInputElement
    const tl = screen.getByLabelText('Richiede tracciabilità lotto in lavorazione') as HTMLInputElement

    fireEvent.click(tl)
    expect(tl.checked).toBe(true)
    fireEvent.click(dm)
    expect(tl.checked).toBe(true)
    fireEvent.click(dm)
    expect(tl.checked).toBe(true)
  })
```

Run: `npx vitest run tests/unit/MagazzinoAddSheet.test.tsx`
Expected: PASS su tutti e 4 i test (l'implementazione dello Step 3 copre già questa logica)

- [ ] **Step 6: Aggiungi i test di submit (successo ed errore)**

Aggiungi a `tests/unit/MagazzinoAddSheet.test.tsx`:

```tsx
  it('submit valido chiama POST /api/magazzino e notifica onArticoloCreato con i dati arricchiti', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articolo: { id: 'art-1', codice_articolo: 'GES01', nome: 'Gesso extra-duro', scorta_attuale: 0, scorta_minima: 5 } }),
    })
    const onArticoloCreato = vi.fn()

    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={noop} onArticoloCreato={onArticoloCreato} />
    )

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Gesso extra-duro' } })
    fireEvent.change(screen.getByLabelText('Codice articolo *'), { target: { value: 'GES01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    await waitFor(() => expect(onArticoloCreato).toHaveBeenCalledTimes(1))
    expect(onArticoloCreato).toHaveBeenCalledWith({
      id: 'art-1',
      codice_articolo: 'GES01',
      nome: 'Gesso extra-duro',
      produttore: null,
      categoria: null,
      um_scarico: 'g',
      scorta_attuale: 0,
      scorta_minima: 5,
      dispositivo_medico: false,
    })

    const [url, options] = fetchMock().mock.calls[0]
    expect(url).toBe('/api/magazzino')
    const body = JSON.parse(options.body as string)
    expect(body.nome).toBe('Gesso extra-duro')
    expect(body.codice_articolo).toBe('GES01')
  })

  it('errore server mostra messaggio inline e non chiude lo sheet', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'codice_articolo duplicato' }),
    })
    const onClose = vi.fn()

    render(
      <MagazzinoAddSheet open categorieEsistenti={[]} fornitori={[]} onClose={onClose} onArticoloCreato={vi.fn()} />
    )

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Gesso extra-duro' } })
    fireEvent.change(screen.getByLabelText('Codice articolo *'), { target: { value: 'GES01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('codice_articolo duplicato')
    expect(onClose).not.toHaveBeenCalled()
  })
```

Run: `npx vitest run tests/unit/MagazzinoAddSheet.test.tsx`
Expected: PASS su tutti e 6 i test

- [ ] **Step 7: Commit**

```bash
git add src/components/features/magazzino/MagazzinoAddSheet.tsx tests/unit/MagazzinoAddSheet.test.tsx
git commit -m "feat(magazzino): add MagazzinoAddSheet bottom sheet for new articolo"
```

---

### Task 4: MagazzinoSearchList — wiring sheet, CTA persistente, empty state onClick

**Files:**
- Modify: `src/components/features/magazzino/MagazzinoSearchList.tsx`
- Test: `tests/unit/MagazzinoSearchList.test.tsx` (nuovo)

**Interfaces:**
- Consumes: `MagazzinoAddSheet`, `FornitoreOption`, `ArticoloCreato` da `./MagazzinoAddSheet` (Task 3); `EmptyState` da `@/components/ui/EmptyState` (comportamento `onClick` da Task 2)
- Produces: `MagazzinoSearchList` con nuova prop signature `{ articoli: ArticoloRow[]; categorieEsistenti: string[]; fornitori: FornitoreOption[] }` — usato dal Task 5 (`magazzino/page.tsx`)

- [ ] **Step 1: Scrivi il test che fallisce (empty state con bottone)**

Crea `tests/unit/MagazzinoSearchList.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MagazzinoSearchList } from '../../src/components/features/magazzino/MagazzinoSearchList'

const ARTICOLO_BASE = {
  id: 'art-1',
  codice_articolo: 'GES01',
  nome: 'Gesso extra-duro',
  produttore: null,
  categoria: null,
  um_scarico: 'g',
  scorta_attuale: 10,
  scorta_minima: 5,
  dispositivo_medico: false,
}

describe('MagazzinoSearchList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista vuota mostra EmptyState con CTA (bottone) che apre il bottom sheet', () => {
    render(<MagazzinoSearchList articoli={[]} categorieEsistenti={[]} fornitori={[]} />)

    expect(screen.getByText('Magazzino vuoto')).toBeTruthy()
    const cta = screen.getByRole('button', { name: '+ Aggiungi articolo' })

    fireEvent.click(cta)
    expect(screen.getByRole('dialog', { name: 'Nuovo articolo' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/MagazzinoSearchList.test.tsx`
Expected: FAIL — `MagazzinoSearchList` non accetta ancora `categorieEsistenti`/`fornitori` e non mostra un bottone (mostra ancora il link `href` verso la route rotta, gestito dal padre)

- [ ] **Step 3: Implementa il componente aggiornato**

Sostituisci il contenuto di `src/components/features/magazzino/MagazzinoSearchList.tsx` con:

```tsx
'use client'

import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { MagazzinoAddSheet } from './MagazzinoAddSheet'
import type { FornitoreOption, ArticoloCreato } from './MagazzinoAddSheet'

type ArticoloRow = {
  id: string
  codice_articolo: string
  nome: string
  produttore: string | null
  categoria: string | null
  um_scarico: string
  scorta_attuale: number
  scorta_minima: number
  dispositivo_medico: boolean
}

interface MagazzinoSearchListProps {
  articoli: ArticoloRow[]
  categorieEsistenti: string[]
  fornitori: FornitoreOption[]
}

export function MagazzinoSearchList({ articoli, categorieEsistenti, fornitori }: MagazzinoSearchListProps) {
  const [query, setQuery] = useState('')
  const [localArticoli, setLocalArticoli] = useState<ArticoloRow[]>(articoli)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleArticoloCreato = (articolo: ArticoloCreato) => {
    setLocalArticoli((prev) => [articolo, ...prev])
    setSheetOpen(false)
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? localArticoli.filter(
        (a) =>
          a.nome.toLowerCase().includes(q) ||
          a.codice_articolo.toLowerCase().includes(q) ||
          (a.produttore ?? '').toLowerCase().includes(q) ||
          (a.categoria ?? '').toLowerCase().includes(q)
      )
    : localArticoli

  return (
    <>
      <MagazzinoAddSheet
        open={sheetOpen}
        categorieEsistenti={categorieEsistenti}
        fornitori={fornitori}
        onClose={() => setSheetOpen(false)}
        onArticoloCreato={handleArticoloCreato}
      />

      {localArticoli.length === 0 ? (
        <section style={{ padding: '0 20px 32px' }}>
          <EmptyState
            icon="📦"
            title="Magazzino vuoto"
            description="Aggiungi i materiali che usi in laboratorio per tenere traccia delle scorte."
            cta={{ label: '+ Aggiungi articolo', onClick: () => setSheetOpen(true) }}
          />
        </section>
      ) : (
        <>
          <div
            style={{
              padding: '0 20px 12px',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'var(--bg, #DDD8D3)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--bg, #DDD8D3)',
                borderRadius: '14px',
                padding: '0 14px',
                boxShadow:
                  'inset 4px 4px 9px rgba(148,128,118,.32), inset -3px -3px 7px rgba(255,255,255,.66)',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                style={{ flexShrink: 0, color: 'var(--t3, #6B5C51)' }}
              >
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>

              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca articolo, codice o produttore..."
                aria-label="Cerca articoli in magazzino"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  height: '48px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '16px',
                  fontWeight: 400,
                  color: 'var(--t1, #1C1916)',
                }}
              />

              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Cancella ricerca"
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--prs, #D4CFC9)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--t2, #4A3D33)',
                    padding: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2 2l8 8M10 2L2 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="Aggiungi articolo"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                border: 'none',
                background: 'var(--primary, #D90012)',
                color: '#fff',
                fontSize: '22px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(0,0,0,.12)',
              }}
            >
              +
            </button>
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                background: 'var(--surface, #E4DFD9)',
                borderRadius: '16px',
                padding: '36px 20px',
                margin: '0 20px',
                textAlign: 'center',
                boxShadow: 'var(--sh-b)',
              }}
            >
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'var(--t2, #4A3D33)', margin: 0 }}>
                {q ? `Nessun articolo trovato per "${query.trim()}"` : 'Nessun articolo in magazzino'}
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map((articolo) => {
                const scorteAlert = articolo.scorta_attuale < articolo.scorta_minima

                return (
                  <li key={articolo.id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'var(--surface, #E4DFD9)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        boxShadow: 'var(--sh-b)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <p
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '15px',
                              fontWeight: 600,
                              color: 'var(--t1, #1C1916)',
                              margin: 0,
                              flex: 1,
                              minWidth: 0,
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                              whiteSpace: 'normal',
                            }}
                          >
                            {articolo.nome}
                          </p>

                          {articolo.dispositivo_medico && (
                            <span
                              aria-label="Dispositivo medico"
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--info, #2563EB)',
                                background: 'hsl(228 89% 63% / 0.15)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                flexShrink: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              DM
                            </span>
                          )}

                          {scorteAlert && (
                            <span
                              aria-label="Scorta sotto il minimo"
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--primary, #D90012)',
                                background: 'hsl(0 95% 64% / 0.15)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                flexShrink: 0,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              Scorta bassa
                            </span>
                          )}
                        </div>

                        {articolo.produttore && (
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t2, #4A3D33)', margin: '0 0 4px' }}>
                            {articolo.produttore}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: scorteAlert ? 'var(--primary, #D90012)' : 'var(--success, #16A34A)',
                            }}
                          >
                            {articolo.scorta_attuale}
                          </span>
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t2, #4A3D33)' }}>
                            / {articolo.scorta_minima} {articolo.um_scarico}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </>
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/MagazzinoSearchList.test.tsx`
Expected: PASS

- [ ] **Step 5: Aggiungi i test per lista non vuota (CTA persistente) e per la creazione live**

Aggiungi a `tests/unit/MagazzinoSearchList.test.tsx`:

```tsx
  it('lista non vuota mostra un bottone persistente "Aggiungi articolo" che apre il bottom sheet', () => {
    render(<MagazzinoSearchList articoli={[ARTICOLO_BASE]} categorieEsistenti={[]} fornitori={[]} />)

    expect(screen.queryByText('Magazzino vuoto')).toBeNull()
    const cta = screen.getByRole('button', { name: 'Aggiungi articolo' })

    fireEvent.click(cta)
    expect(screen.getByRole('dialog', { name: 'Nuovo articolo' })).toBeTruthy()
  })

  it('creare un articolo dal sheet lo aggiunge subito alla lista (nessun reload)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ articolo: { id: 'art-2', codice_articolo: 'CER02', nome: 'Ceramica feldspatica', scorta_attuale: 0, scorta_minima: 0 } }),
    })

    render(<MagazzinoSearchList articoli={[ARTICOLO_BASE]} categorieEsistenti={[]} fornitori={[]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi articolo' }))
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Ceramica feldspatica' } })
    fireEvent.change(screen.getByLabelText('Codice articolo *'), { target: { value: 'CER02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva articolo' }))

    expect(await screen.findByText('Ceramica feldspatica')).toBeTruthy()
  })
```

Run: `npx vitest run tests/unit/MagazzinoSearchList.test.tsx`
Expected: PASS su tutti e 3 i test

- [ ] **Step 6: Commit**

```bash
git add src/components/features/magazzino/MagazzinoSearchList.tsx tests/unit/MagazzinoSearchList.test.tsx
git commit -m "feat(magazzino): wire MagazzinoAddSheet into MagazzinoSearchList with persistent header CTA"
```

---

### Task 5: magazzino/page.tsx — carica categorie/fornitori, rimuove il link rotto

**Files:**
- Modify: `src/app/(app)/magazzino/page.tsx`

**Interfaces:**
- Consumes: `MagazzinoSearchList` con nuova prop signature (Task 4)
- Produces: nessuno (ultimo anello della catena per questa route)

- [ ] **Step 1: Sostituisci il contenuto del file**

Sostituisci l'intero contenuto di `src/app/(app)/magazzino/page.tsx` con:

```tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { MagazzinoSearchList } from '@/components/features/magazzino/MagazzinoSearchList'
import { OrdinaBatchBanner } from '@/components/features/magazzino/OrdinaBatchBanner'

// Tipo base — usato dalla search list
export type ArticoloRow = {
  id: string
  codice_articolo: string
  nome: string
  produttore: string | null
  categoria: string | null
  um_scarico: string
  scorta_attuale: number
  scorta_minima: number
  dispositivo_medico: boolean
}

// Tipo esteso — usato per la logica batch ordini
export type ArticoloRowConOrdine = ArticoloRow & {
  fornitore_id: string | null
  um_acquisto: string
  conf_da_ordinare: number | null
}

export default async function MagazzinoPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  let articoli: ArticoloRowConOrdine[] = []
  let categorieEsistenti: string[] = []
  let fornitori: Array<{ id: string; ragione_sociale: string }> = []

  if (labId) {
    const { data } = await svc
      .from('magazzino')
      .select('id, codice_articolo, nome, produttore, categoria, um_scarico, um_acquisto, fornitore_id, conf_da_ordinare, scorta_attuale, scorta_minima, dispositivo_medico')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('nome', { ascending: true })
      .limit(500)
    articoli = (data ?? []) as ArticoloRowConOrdine[]

    categorieEsistenti = Array.from(
      new Set(articoli.map((a) => a.categoria).filter((c): c is string => !!c))
    ).sort()

    const { data: fornitoriData } = await svc
      .from('fornitori')
      .select('id, ragione_sociale')
      .eq('laboratorio_id', labId)
      .eq('attivo', true)
      .order('ragione_sociale', { ascending: true })
    fornitori = fornitoriData ?? []
  }

  const articoliAlert = articoli.filter((a) => a.scorta_attuale < a.scorta_minima)

  return (
    <PageWrapper>
      <AppHeader
        title="Magazzino"
        subtitle={articoliAlert.length > 0 ? `${articoliAlert.length} sotto scorta minima` : undefined}
      />

      {articoliAlert.length > 0 && (
        <OrdinaBatchBanner articoliSottoScorta={articoliAlert} />
      )}
      {/* Search + lista lato client — gestisce anche stato vuoto e creazione nuovo articolo */}
      <MagazzinoSearchList articoli={articoli} categorieEsistenti={categorieEsistenti} fornitori={fornitori} />
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: 0 errori (`ArticoloRowConOrdine[]` è assegnabile a `ArticoloRow[]` come già accadeva prima di questa modifica)

- [ ] **Step 3: Esegui l'intera suite**

Run: `npx vitest run`
Expected: tutti i test verdi, inclusi quelli aggiunti nei Task 2-4

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/magazzino/page.tsx"
git commit -m "fix(magazzino): remove dead /magazzino/nuovo link, always render MagazzinoSearchList"
```

---

### Task 6: Verifica finale e QA manuale

**Files:** nessuna modifica — solo verifica

**Interfaces:** nessuna

- [ ] **Step 1: Verifica completa automatica**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: 0 errori TypeScript, tutti i test verdi, build production pulita

- [ ] **Step 2: QA manuale — magazzino vuoto**

Con `npm run dev`, usando un utente di test con `laboratorio_id` che punta a un lab senza articoli (o svuotare temporaneamente `magazzino` per un lab di test, mai il lab Filippo):
1. Apri `/magazzino` → verifica EmptyState "Magazzino vuoto" con bottone "+ Aggiungi articolo"
2. Naviga con Tab da tastiera fino al bottone → verifica che riceva il focus (conferma il fix Task 2)
3. Premi Invio sul bottone focalizzato → verifica che il bottom sheet si apra
4. Compila nome + codice, invia → verifica che l'articolo appaia nella lista senza reload di pagina

- [ ] **Step 3: QA manuale — magazzino popolato (lab Filippo, sola lettura salvo pulizia dati di test)**

1. Apri `/magazzino` con l'utente titolare lab Filippo (187 articoli attesi) → verifica bottone "+" persistente accanto alla barra di ricerca
2. Click sul bottone → sheet si apre
3. Spunta "È un dispositivo medico" → verifica che "traccia lotto" si spunti automaticamente; despunta "traccia lotto" manualmente, poi spunta/despunta "dispositivo medico" → verifica che "traccia lotto" NON si risincronizzi più
4. Digita una categoria parziale già esistente (es. "Ges") → verifica che il datalist suggerisca "Gessi" o simile
5. Crea un articolo di test con `codice_articolo` univoco (es. `TEST-B8-001`), compila anche "Scheda tecnica (URL)" nella sezione Altri dettagli → invia
6. Verifica che l'articolo compaia subito in lista senza reload
7. Verifica via `GET /api/magazzino` (devtools Network o query diretta) che il campo `scheda_tecnica_url` sia stato effettivamente persistito (conferma Task 1)
8. **Pulizia:** elimina l'articolo di test creato (via Supabase o soft-delete `attivo=false`) per non sporcare i dati reali del lab Filippo

- [ ] **Step 4: QA multi-viewport e tema**

Ripeti almeno il flusso "crea articolo" su 390px (mobile), 768px (tablet), 1280px (desktop), sia in light che dark mode. Verifica:
- Bottom sheet leggibile e utilizzabile su tutti e 3 i viewport
- Nessuna shadow "raised" in dark mode (solo flat, per stile admin)
- Touch target del bottone "+" e dei bottoni submit/annulla ≥ 44px

- [ ] **Step 5: Aggiorna memoria progetto (BP-1)**

Aggiorna `ua-app/memory/MEMORY.md` §0 con una voce "✅ B8 (1/5) RISOLTO — /magazzino/nuovo" seguendo lo stesso formato usato per B1/B2/B7 (causa, fix, verifica, commit finali). Aggiorna anche `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` marcando la riga `magazzino/page.tsx:71` come risolta, lasciando le altre 4 righe di B8 aperte.
