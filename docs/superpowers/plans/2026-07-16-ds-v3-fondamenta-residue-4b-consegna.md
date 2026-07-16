# DS v3 «Fondamenta residue + 4b Consegna» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere il sp.3 «Il cuore»: 5 componenti ds mancanti + check-ds sui CSS globali (Fase F), poi il flusso Consegna v3 in-place che sostituisce la pagina intermedia (Fase C).

**Architecture:** Fase F = estrazioni (FotoStrip, MenuVoce), nuovi da mockup (TastoWhatsApp, RigaBloccante), spostamento NavDesk, estensione script bash. Fase C = 1 route GET read-only + helper condiviso + macchina a stati client `FlussoConsegna` montata in 4 superfici; il POST consegna e tutto il server restano INTATTI.

**Tech Stack:** Next.js 16 App Router · Supabase · motion/react (molle v3) · vitest + @testing-library (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-16-ds-v3-fondamenta-residue-4b-consegna-design.md` (decisioni D-1…D-6).

## Global Constraints

- **Zero migration, POST consegna e `orchestraConsegna` INTATTI** — unica aggiunta server: `GET /api/lavori/[id]/precheck-consegna` (read-only, nessun gate ruolo = parità col POST, D-3).
- Componenti SOLO in `src/components/ds/`; colori/spring SOLO da `src/design-system/v3/{tokens,motion}.ts`; suoni `suona()`, haptic `vibra()`; testi UI passano `trovaParoleVietate` (dizionario §2.3).
- Font: solo Plus Jakarta Sans (`--font-v3`) nel perimetro v3.
- Wrapper `[data-ds="v3"]` solo su portal (pattern Sheet/DialogConferma) — mai sulle pagine (lo porta già il layout).
- Touch target ≥44px; `prefers-reduced-motion` via `useReducedMotion()`.
- Worktree dedicato: `.claude/worktrees/fondamenta-4b-consegna`.
- Baseline suite: **1954 pass | 19 skipped** — mai sotto.
- Commit format: `feat(ds): …` / `feat(consegna): …` / `fix…` / `docs…` / `test…`.

---

# FASE F — Fondamenta residue

### Task 1: Token verdi WhatsApp + componente TastoWhatsApp (§5.29)

**Files:**
- Modify: `src/design-system/v3/tokens.ts` (oggetto `gradiente`, ~riga 46)
- Create: `src/components/ds/TastoWhatsApp.tsx`
- Test: `tests/unit/ds-v3/componenti/TastoWhatsApp.test.tsx`

**Interfaces:**
- Produces: `TastoWhatsApp(props: { waUrl: string; children?: ReactNode })` — `<a target="_blank" rel="noopener noreferrer">`; se `waUrl` non inizia con `https://wa.me/` NON renderizza (null + `console.warn` in dev). Token: `gradiente.tastoWhatsApp`, `verdeWhatsApp.corsa`.

- [ ] **Step 1: Failing test**

```tsx
// tests/unit/ds-v3/componenti/TastoWhatsApp.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({ suona: (n: string) => suonaMock(n) }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: (t: string) => vibraMock(t) }))

import { TastoWhatsApp } from '@/components/ds/TastoWhatsApp'

const URL_OK = 'https://wa.me/393331234567?text=Lavoro%20n.147'

describe('TastoWhatsApp — verde dedicato (§5.29)', () => {
  beforeEach(() => { suonaMock.mockClear(); vibraMock.mockClear() })

  it('renderizza un link target=_blank rel=noopener noreferrer verso waUrl', () => {
    render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    const link = screen.getByRole('link', { name: /whatsapp/i })
    expect(link).toHaveAttribute('href', URL_OK)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('usa il gradiente dedicato §3.3.4 (mai il verde di stato)', () => {
    render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    const link = screen.getByRole('link', { name: /whatsapp/i })
    expect(link.style.background).toContain('linear-gradient')
    expect(link.style.background).toContain('#208650')
  })

  it('waUrl non-wa.me: NON renderizza il link (contratto sicurezza)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      // eslint-disable-next-line no-script-url
      <TastoWhatsApp waUrl={'javascript:alert(1)'}>Invia</TastoWhatsApp>
    )
    expect(container.querySelector('a')).toBeNull()
    expect(warn).toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('click → suona("tap") + vibra("medium")', () => {
    render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    fireEvent.click(screen.getByRole('link', { name: /whatsapp/i }))
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('focus ring di legge nel proprio <style>', () => {
    const { container } = render(<TastoWhatsApp waUrl={URL_OK}>Invia</TastoWhatsApp>)
    const css = container.querySelector('style')?.textContent ?? ''
    expect(css).toContain('outline: 2px solid var(--blue)')
  })

  it('testo default passa il dizionario', () => {
    const { container } = render(<TastoWhatsApp waUrl={URL_OK}>Invia messaggio WhatsApp</TastoWhatsApp>)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})
```

- [ ] **Step 2: Run — FAIL** — `npx vitest run tests/unit/ds-v3/componenti/TastoWhatsApp.test.tsx` → «Cannot find module '@/components/ds/TastoWhatsApp'».

- [ ] **Step 3: Token + componente**

In `src/design-system/v3/tokens.ts`, dentro l'oggetto `gradiente` (dopo `tastoPrimario`):

```ts
  // §5.29 / §3.3.4 — verde WhatsApp DEDICATO (bucket B 12/07: scurito AA,
  // bianco 4.58:1 sullo stop chiaro). Riservato ai bottoni che aprono WhatsApp.
  tastoWhatsApp: 'linear-gradient(180deg, #208650, #17663A)',
```

e, come nuovo export accanto agli altri:

```ts
// §5.29 — corsa 3D del TastoWhatsApp (bordo scurito col gradiente, bucket B).
export const verdeWhatsApp = { corsa: '#0E4A28' } as const
```

```tsx
// src/components/ds/TastoWhatsApp.tsx
'use client'

// DS v3 §5.29 — TastoWhatsApp: il tasto verde DEDICATO alle azioni «apri
// WhatsApp» (mockup consegna.html `.wa-btn` = legge). MAI il verde di stato
// (--green): gradiente §3.3.4 pinnato, identico nei due temi. Contratto
// sicurezza (spec 16/07 §2.3): `waUrl` DEVE iniziare con https://wa.me/ —
// niente href arbitrari (javascript:, data:). Ombra ambiente sul wrapper come
// TastoPrimario (§3.2: dark è flat, --sh-card risolve a none).

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, raggio, tipografia, verdeWhatsApp, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

const CORSA_RIPOSO = `0 5px 0 ${verdeWhatsApp.corsa}`
const CORSA_PREMUTA = `0 1px 0 ${verdeWhatsApp.corsa}`
const PREFISSO_SICURO = 'https://wa.me/'

export function TastoWhatsApp(props: { waUrl: string; children?: ReactNode }) {
  const { waUrl, children = 'Invia messaggio WhatsApp' } = props

  if (!waUrl.startsWith(PREFISSO_SICURO)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[TastoWhatsApp] waUrl rifiutata (deve iniziare con ${PREFISSO_SICURO})`)
    }
    return null
  }

  function handleClick() {
    suona('tap')
    vibra('medium')
  }

  return (
    <div style={{ width: '100%', maxWidth: 480, borderRadius: 18, boxShadow: 'var(--sh-card)' }}>
      <style>{`
        .ds-tasto-whatsapp:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
      `}</style>
      <motion.a
        className="ds-tasto-whatsapp"
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        whileTap={{ y: 4, scale: 0.995, boxShadow: CORSA_PREMUTA }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 11,
          width: '100%',
          height: 62,
          borderRadius: 18,
          background: gradiente.tastoWhatsApp,
          boxShadow: CORSA_RIPOSO,
          color: testoSuFaccia,
          fontSize: 17.5,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: '0.01em',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.4A8.5 8.5 0 1 1 21 11.5Z" />
        </svg>
        {children}
      </motion.a>
    </div>
  )
}
```

Nota: `raggio` non serve se si usa 18 letterale? NO — 18 è `raggio.riga`: usa `raggio.riga` in entrambi i punti (`borderRadius: raggio.riga`) e togli l'import inutilizzato se non usato.

- [ ] **Step 4: Run — PASS** — stesso comando dello Step 2, poi `bash scripts/check-ds-compliance.sh` → «✅».

- [ ] **Step 5: Commit** — `git add src/design-system/v3/tokens.ts src/components/ds/TastoWhatsApp.tsx tests/unit/ds-v3/componenti/TastoWhatsApp.test.tsx && git commit -m "feat(ds): TastoWhatsApp §5.29 + token verde dedicato §3.3.4"`

---

### Task 2: RigaBloccante (§5.30)

**Files:**
- Create: `src/components/ds/RigaBloccante.tsx`
- Test: `tests/unit/ds-v3/componenti/RigaBloccante.test.tsx`

**Interfaces:**
- Produces: `RigaBloccante(props: { cosa: string; cosaFare: string; icona?: ReactNode; onTap: () => void })` — riga-button ambra tappabile dello sheet «Prima di consegnare».

- [ ] **Step 1: Failing test**

```tsx
// tests/unit/ds-v3/componenti/RigaBloccante.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({ suona: (n: string) => suonaMock(n) }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: (t: string) => vibraMock(t) }))

import { RigaBloccante } from '@/components/ds/RigaBloccante'

describe('RigaBloccante — bloccante consegna (§5.30)', () => {
  beforeEach(() => { suonaMock.mockClear(); vibraMock.mockClear() })

  it('è un button con «cosa» e «cosa fare»', () => {
    render(<RigaBloccante cosa="Manca la prescrizione del dentista" cosaFare="Aggiungila nei dati clinici" onTap={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('Manca la prescrizione del dentista')
    expect(btn).toHaveTextContent('Aggiungila nei dati clinici')
  })

  it('sfondo --amber-tint e «cosa fare» color famiglia --amber', () => {
    render(<RigaBloccante cosa="Manca il lotto" cosaFare="Registra il lotto" onTap={() => {}} />)
    const btn = screen.getByRole('button')
    expect(btn.style.background).toBe('var(--amber-tint)')
    expect(screen.getByText('Registra il lotto').style.color).toBe('var(--amber)')
  })

  it('tap → onTap + suona("tap") + vibra("medium")', () => {
    const onTap = vi.fn()
    render(<RigaBloccante cosa="Manca la firma" cosaFare="Vai alle Impostazioni" onTap={onTap} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('focus ring di legge + testi passano il dizionario', () => {
    const { container } = render(<RigaBloccante cosa="Manca la prescrizione" cosaFare="Aggiungila" onTap={() => {}} />)
    expect(container.querySelector('style')?.textContent ?? '').toContain('outline: 2px solid var(--blue)')
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})
```

- [ ] **Step 2: Run — FAIL** — `npx vitest run tests/unit/ds-v3/componenti/RigaBloccante.test.tsx`.

- [ ] **Step 3: Componente**

```tsx
// src/components/ds/RigaBloccante.tsx
'use client'

// DS v3 §5.30 — RigaBloccante: riga tappabile dello sheet «Prima di
// consegnare» (mockup consegna.html `.bloccante` = legge). SOLO i bloccanti
// veri (MDR/materiali §8) — MAI un «Sei sicuro?» generico. Ambra = «manca
// qualcosa di verificabile»; il tap porta DOVE si risolve.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { raggio, tipografia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

// Triangolo line-icon stroke 3 — stessa fonte della StrisciaStato (home.html).
const TRIANGOLO = (
  <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 2.5 20.5h19L12 3Z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.01" />
  </svg>
)

export function RigaBloccante(props: { cosa: string; cosaFare: string; icona?: ReactNode; onTap: () => void }) {
  const { cosa, cosaFare, icona = TRIANGOLO, onTap } = props

  function handleClick() {
    suona('tap')
    vibra('medium')
    onTap()
  }

  return (
    <>
      <style>{`
        .ds-riga-bloccante:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
      `}</style>
      <motion.button
        type="button"
        className="ds-riga-bloccante"
        onClick={handleClick}
        whileTap={{ y: 2 }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          padding: '16px 18px',
          border: 'none',
          borderRadius: raggio.riga,
          background: 'var(--amber-tint)',
          color: 'var(--ink)',
          fontFamily: tipografia.famiglia,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden="true"
          style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--amber-tint)', color: 'var(--amber)' }}
        >
          {icona}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}>{cosa}</span>
          <span style={{ fontSize: 14, fontWeight: tipografia.weight.bold, color: 'var(--amber)', marginTop: 2 }}>{cosaFare}</span>
        </span>
        <span aria-hidden="true" style={{ flex: 'none', color: 'var(--amber)', fontSize: 20, fontWeight: tipografia.weight.extrabold }}>{'›'}</span>
      </motion.button>
    </>
  )
}
```

- [ ] **Step 4: Run — PASS** + `bash scripts/check-ds-compliance.sh` → «✅».

- [ ] **Step 5: Commit** — `git commit -m "feat(ds): RigaBloccante §5.30"` (add dei 2 file).

---

### Task 3: FotoStrip (§5.33) — estrazione dalla scheda

**Files:**
- Create: `src/components/ds/FotoStrip.tsx`
- Modify: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx:275-288` (blocco «Strip foto read-only»)
- Test: `tests/unit/ds-v3/componenti/FotoStrip.test.tsx`

**Interfaces:**
- Produces: `FotoStrip(props: { foto: Array<{ id: string; url: string; alt?: string }> })` — read-only, thumb 72×72 radius 12, 1 riga scroll. Contratto sicurezza: `url` = SOLO signed URL generate server-side (pattern B5) — mai `storage_path` né `getPublicUrl` persistito.

- [ ] **Step 1: Failing test**

```tsx
// tests/unit/ds-v3/componenti/FotoStrip.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FotoStrip } from '@/components/ds/FotoStrip'

const FOTO = [
  { id: 'a', url: 'https://x.supabase.co/sign/1.jpg?token=t', alt: 'Impronta' },
  { id: 'b', url: 'https://x.supabase.co/sign/2.jpg?token=t' },
]

describe('FotoStrip — strip read-only (§5.33)', () => {
  it('renderizza una img per foto, alt esplicito o fallback', () => {
    render(<FotoStrip foto={FOTO} />)
    expect(screen.getByAltText('Impronta')).toBeInTheDocument()
    expect(screen.getByAltText('Foto del lavoro')).toBeInTheDocument()
  })

  it('misure di legge: 72×72, radius 12, objectFit cover, scroll orizzontale', () => {
    const { container } = render(<FotoStrip foto={FOTO} />)
    const strip = container.firstElementChild as HTMLElement
    expect(strip.style.overflowX).toBe('auto')
    const img = screen.getByAltText('Impronta')
    expect(img.style.width).toBe('72px')
    expect(img.style.height).toBe('72px')
    expect(img.style.borderRadius).toBe('12px')
    expect(img.style.objectFit).toBe('cover')
  })

  it('lista vuota: non renderizza nulla', () => {
    const { container } = render(<FotoStrip foto={[]} />)
    expect(container.firstElementChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run — FAIL**.

- [ ] **Step 3: Componente + refactor scheda**

```tsx
// src/components/ds/FotoStrip.tsx
'use client'

// DS v3 §5.33 — FotoStrip: strip thumbnail orizzontale read-only (mockup
// scheda-lavoro.html `.foto-strip` = legge). Thumb 72×72 · radius 12 · max 1
// riga scrollabile. CONTRATTO SICUREZZA (spec 16/07 §2.1): `url` è SEMPRE una
// signed URL generata server-side al render (pattern B5, lib/storage/
// signed-url.ts) — mai storage_path né il valore getPublicUrl persistito.

import { spazio } from '@/design-system/v3/tokens'

export function FotoStrip(props: { foto: Array<{ id: string; url: string; alt?: string }> }) {
  const { foto } = props
  if (foto.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: spazio.s, overflowX: 'auto', paddingBottom: 2 }} aria-label="Foto del lavoro">
      {foto.map((f) => (
        // eslint-disable-next-line @next/next/no-img-element -- URL Storage firmata a dimensioni variabili (stessa scelta di TabImmagini.tsx), next/image non applicabile
        <img
          key={f.id}
          src={f.url}
          alt={f.alt ?? 'Foto del lavoro'}
          style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 12, objectFit: 'cover', background: 'var(--bg-deep)' }}
        />
      ))}
    </div>
  )
}
```

In `SchedaLavoroV3.tsx` sostituisci il blocco righe 275-288 (dal commento «Strip foto read-only (§7.4)» all'`)}` di chiusura del condizionale) con:

```tsx
          {/* Strip foto read-only (§5.33 — componente ds FotoStrip) */}
          <FotoStrip foto={lavoro.immagini.map((img) => ({ id: img.id, url: img.url, alt: img.descrizione ?? undefined }))} />
```

e aggiungi l'import `import { FotoStrip } from '@/components/ds/FotoStrip'` accanto agli altri import ds. (Il guard `length === 0` ora vive nel componente.)

- [ ] **Step 4: Run — PASS** — nuovo test + regressione: `npx vitest run tests/unit/ds-v3/componenti/FotoStrip.test.tsx tests/unit/scheda-v3` (i test scheda esistenti restano verdi).

- [ ] **Step 5: Commit** — `git commit -m "feat(ds): FotoStrip §5.33 estratta dalla scheda v3"`.

---

### Task 4: MenuVoce (§5.34) — estrazione dal menu ⋯

**Files:**
- Create: `src/components/ds/MenuVoce.tsx`
- Modify: `src/components/features/lavori/scheda-v3/MenuSchedaSheet.tsx` (render 147-233: le voci diventano `MenuVoce`, i separatori POSIZIONALI restano sul contenitore — riserva arch #9)
- Test: `tests/unit/ds-v3/componenti/MenuVoce.test.tsx`

**Interfaces:**
- Produces: `MenuVoce(props: { icona: ReactNode; testo: string; nota?: string; butta?: boolean; disabled?: boolean; onTap?: () => void })`. NESSUN bordo/margine: i separatori li possiede il contenitore.

- [ ] **Step 1: Failing test**

```tsx
// tests/unit/ds-v3/componenti/MenuVoce.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { MenuVoce } from '@/components/ds/MenuVoce'

const ICONA = <path d="M12 2v20" />

describe('MenuVoce — voce del menu ⋯ (§5.34)', () => {
  it('voce standard: testo 17-ish bold ink, icona tonda neutra, chevron', () => {
    render(<MenuVoce icona={ICONA} testo="Prove" onTap={() => {}} />)
    const btn = screen.getByRole('button', { name: /prove/i })
    expect(btn.style.minHeight).toBe('56px')
    expect(btn.style.color).toBe('var(--ink)')
    expect(btn).toHaveTextContent('›')
  })

  it('variante butta: testo e icona rossi', () => {
    render(<MenuVoce icona={ICONA} testo="Annulla lavoro" butta disabled nota="Prossimamente" />)
    const btn = screen.getByRole('button', { name: /annulla lavoro/i })
    expect(btn.style.color).toBe('var(--red)')
    expect(btn).toBeDisabled()
    expect(btn).not.toHaveTextContent('›')
    expect(screen.getByText('Prossimamente')).toBeInTheDocument()
  })

  it('tap → onTap; NESSUN bordo proprio (separatori sul contenitore)', () => {
    const onTap = vi.fn()
    render(<MenuVoce icona={ICONA} testo="Foto" onTap={onTap} />)
    const btn = screen.getByRole('button', { name: /foto/i })
    fireEvent.click(btn)
    expect(onTap).toHaveBeenCalledTimes(1)
    expect(btn.style.borderTop).toBe('')
    expect(btn.style.borderBottom).toBe('')
  })

  it('testi passano il dizionario', () => {
    const { container } = render(<MenuVoce icona={ICONA} testo="Dati clinici" onTap={() => {}} />)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})
```

- [ ] **Step 2: Run — FAIL**.

- [ ] **Step 3: Componente + refactor**

```tsx
// src/components/ds/MenuVoce.tsx
'use client'

// DS v3 §5.34 — MenuVoce: la voce del menu ⋯ (mockup scheda-lavoro.html
// `.menu-voce` = legge). Min-height 56 · icona Ø38 radius 11 tint neutra ·
// testo body/700 --ink · chevron --faint. Variante `butta` (distruttiva):
// rossa, icona --red-tint/--red. I SEPARATORI (bordi/margini posizionali)
// NON vivono qui: li possiede il contenitore, che conosce la posizione.
// `icona` riceve i <path> grezzi: il tag <svg> con stroke/linecap vive UNA
// volta qui (stesso schema di MenuSchedaSheet pre-estrazione).

import type { ReactNode } from 'react'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'

export function MenuVoce(props: {
  icona: ReactNode
  testo: string
  nota?: string
  butta?: boolean
  disabled?: boolean
  onTap?: () => void
}) {
  const { icona, testo, nota, butta = false, disabled = false, onTap } = props

  return (
    <button
      type="button"
      className="ds-tap-v3"
      disabled={disabled}
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spazio.m,
        width: '100%',
        minHeight: 56,
        padding: `${spazio.xs + 4}px 0`,
        border: 'none',
        background: 'none',
        color: butta ? 'var(--red)' : 'var(--ink)',
        fontFamily: tipografia.famiglia,
        fontSize: tipografia.size.body,
        fontWeight: tipografia.weight.bold,
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: raggio.riga - 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: butta ? 'var(--red-tint)' : 'var(--bg-deep)',
          color: butta ? 'var(--red)' : 'var(--muted)',
        }}
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          {icona}
        </svg>
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>{testo}</span>
        {nota && (
          <span style={{ fontSize: 13.5, fontWeight: tipografia.weight.semibold, color: 'var(--red)' }}>{nota}</span>
        )}
      </span>
      {!disabled && (
        <span aria-hidden="true" style={{ color: 'var(--faint)', fontSize: 20, fontWeight: tipografia.weight.extrabold }}>{'›'}</span>
      )}
    </button>
  )
}
```

In `MenuSchedaSheet.tsx`: sostituisci il `<button …>` interno al `.map` (righe 151-178) con un wrapper-separatore + `MenuVoce`, ed elimina `vociStile`, `iconaStile`, `chevStile`, `notaStile` (righe 185-233):

```tsx
        {voci.map((voce, indice) => (
          <div
            key={voce.chiave}
            style={{
              // Separatori POSIZIONALI del contenitore (v. MenuVoce): riga fra
              // le voci standard; il gruppo «butta» (Annulla) si stacca sopra.
              borderBottom: indice < voci.length - 1 && !voce.disabilitata ? '1.5px solid var(--line)' : 'none',
              borderTop: voce.disabilitata ? '1.5px solid var(--line)' : 'none',
              marginTop: voce.disabilitata ? spazio.xs : 0,
            }}
          >
            <MenuVoce
              icona={voce.icona}
              testo={voce.etichetta}
              nota={voce.nota}
              butta={voce.disabilitata}
              disabled={voce.disabilitata}
              onTap={() => gestisciClick(voce)}
            />
          </div>
        ))}
```

Import: `import { MenuVoce } from '@/components/ds/MenuVoce'` (e rimuovi `raggio` dagli import se resta inutilizzato).

- [ ] **Step 4: Run — PASS** — `npx vitest run tests/unit/ds-v3/componenti/MenuVoce.test.tsx tests/unit/MenuSchedaSheet.test.tsx` (comportamento del menu invariato).

- [ ] **Step 5: Commit** — `git commit -m "feat(ds): MenuVoce §5.34 estratta da MenuSchedaSheet"`.

---

### Task 5: NavDesk → components/ds (D-4: tasto INVARIATO)

**Files:**
- Move: `src/components/features/home/NavDesk.tsx` → `src/components/ds/NavDesk.tsx`
- Modify: `src/components/features/home/HomeDesktop.tsx:52` (import)
- Modify: test esistente di NavDesk (aggiorna il path di import)

**Interfaces:**
- Produces: `NavDesk` invariato, ora importabile da `@/components/ds/NavDesk`. Il tasto `TastoNuovoLavoro` locale resta (D-4, mockup `2026-07-16-navdesk-tasto-varianti.html` variante A).

- [ ] **Step 1: Trova i consumer** — `grep -rn "features/home/NavDesk\|from './NavDesk'" src tests` → attesi: `HomeDesktop.tsx` + il test.

- [ ] **Step 2: Sposta e aggiorna**

```bash
git mv src/components/features/home/NavDesk.tsx src/components/ds/NavDesk.tsx
```

In `NavDesk.tsx`: `import { StrisciaStato } from '@/components/ds/StrisciaStato'` → `from './StrisciaStato'`. Aggiungi in testa al commento: `// Spostato in components/ds (ondata 16/07, §5.35). D-4: il tasto locale H52 resta — variante A ratificata (mockup 2026-07-16-navdesk-tasto-varianti.html).`
In `HomeDesktop.tsx:52`: `import { NavDesk } from './NavDesk'` → `import { NavDesk } from '@/components/ds/NavDesk'`.
Nel test di NavDesk: aggiorna l'import a `@/components/ds/NavDesk`.

- [ ] **Step 3: Run — PASS** — `npx tsc --noEmit` e `npx vitest run tests/unit -t NavDesk` (o il file di test individuato allo Step 1) + `bash scripts/check-ds-compliance.sh` (nuovo scope ds copre NavDesk: deve restare «✅»).

- [ ] **Step 4: Commit** — `git commit -m "refactor(ds): NavDesk in components/ds §5.35 (D-4, tasto locale invariato)"`.

---

### Task 6: check-ds esteso ai CSS globali

**Files:**
- Modify: `scripts/check-ds-compliance.sh` (dopo la sezione 4, prima del Report)

**Interfaces:**
- Produces: sezione 5 dello script — regole su `src/app/globals.css` + `src/app/ds-v3.css`: gold-come-testo, t2/t3 vecchi, font fuori allowlist, guard anti-leak (`--sh-card|--sh-press|--font-v3` definibili SOLO in ds-v3.css).

- [ ] **Step 1: Aggiungi la sezione 5** (prima di `# ── Report`):

```bash
# ── 5. CSS globali (globals.css + ds-v3.css) — ondata 16/07 ────────────────
CSS_GLOBALI="src/app/globals.css src/app/ds-v3.css"

# 5a. Gold come testo nei CSS (la DEFINIZIONE --gold:… in globals è legittima)
CSS_GOLD=$(grep -nE "color:\s*var\(--gold\)|color:\s*#[Dd]4[Aa]843" $CSS_GLOBALI 2>/dev/null || true)
if [ -n "$CSS_GOLD" ]; then
  echo ""
  echo "❌ CSS globali: gold usato come testo (WCAG fail 1.6:1)"
  echo "$CSS_GOLD"
  ERRORS=$((ERRORS + 1))
fi

# 5b. Vecchi fallback t2/t3 nei CSS
CSS_T2=$(grep -n "#96918D\|#B8B3AE" $CSS_GLOBALI 2>/dev/null || true)
if [ -n "$CSS_T2" ]; then
  echo ""
  echo "❌ CSS globali: vecchi fallback t2/t3 (#96918D o #B8B3AE)"
  echo "$CSS_T2"
  ERRORS=$((ERRORS + 1))
fi

# 5c. Font fuori allowlist. Allowlist: DM Sans + Playfair (legacy v2.3, import
# storico riga 1 di globals.css) e Plus Jakarta Sans (v3, self-hosted).
# Un nuovo import Google Fonts o un font vietato (Inter/Roboto) → FAIL.
CSS_FONT=$(grep -nE "\bInter\b|Roboto" $CSS_GLOBALI 2>/dev/null || true)
if [ -n "$CSS_FONT" ]; then
  echo ""
  echo "❌ CSS globali: font vietato (Inter/Roboto)"
  echo "$CSS_FONT"
  ERRORS=$((ERRORS + 1))
fi
CSS_GFONTS=$(grep -n "fonts.googleapis" $CSS_GLOBALI 2>/dev/null \
  | grep -v "DM+Sans\|Playfair" || true)
if [ -n "$CSS_GFONTS" ]; then
  echo ""
  echo "❌ CSS globali: import Google Fonts fuori allowlist (solo DM Sans+Playfair legacy)"
  echo "$CSS_GFONTS"
  ERRORS=$((ERRORS + 1))
fi

# 5d. Anti-leak: i token v3 --sh-card/--sh-press/--font-v3 si DEFINISCONO solo
# in ds-v3.css (i --sh-b/--sh-c/--sh-i v2.3 in globals.css sono legittimi).
V3_LEAK=$(grep -nE -- "--sh-card\s*:|--sh-press\s*:|--font-v3\s*:" src/app/globals.css 2>/dev/null || true)
if [ -n "$V3_LEAK" ]; then
  echo ""
  echo "❌ globals.css: token v3 definito fuori da ds-v3.css (anti-leak)"
  echo "$V3_LEAK"
  ERRORS=$((ERRORS + 1))
fi
```

- [ ] **Step 2: Verifica exit 0 sul working tree** — `bash scripts/check-ds-compliance.sh` → «✅ DS compliance OK». Se una regola scatta su codice ATTUALE legittimo, restringi il grep (mai «sistemare» i CSS per far passare lo script in questa ondata).

- [ ] **Step 3: Fixture negative (prova che le regole scattano)** — per ciascuna delle 5 regole: appendi una riga violante a `src/app/ds-v3.css` (es. `echo '.x { color: var(--gold); }' >> src/app/ds-v3.css`), esegui lo script, atteso **exit 1** col messaggio giusto, poi `git checkout -- src/app/ds-v3.css`. Ripeti per `#96918D`, `font-family: Inter`, `@import url("https://fonts.googleapis.com/css2?family=Rubik")`, e per 5d appendi `--font-v3: sans-serif;` a `src/app/globals.css` (poi `git checkout -- src/app/globals.css`). Registra gli esiti nel messaggio di commit.

- [ ] **Step 4: Commit** — `git commit -m "feat(tooling): check-ds esteso a globals.css/ds-v3.css (allowlist font + anti-leak)"`.

---

### Task 7: Catalogo — 4 sezioni nuove + demo NavDesk

**Files:**
- Modify: `src/app/ds-v3-catalogo/page.tsx` (import 13-41 · `INDICE` 57-75 · nuove `<SezioneCatalogo>` in coda al JSX)

**Interfaces:**
- Consumes: `TastoWhatsApp`, `RigaBloccante`, `FotoStrip`, `MenuVoce`, `NavDesk` da `@/components/ds/`.

- [ ] **Step 1: Registra nel doppio registro.** Aggiungi a `INDICE`: `{ id: 'foto-strip', titolo: 'FotoStrip' }, { id: 'menu-voce', titolo: 'MenuVoce' }, { id: 'tasto-whatsapp', titolo: 'TastoWhatsApp' }, { id: 'riga-bloccante', titolo: 'RigaBloccante' }, { id: 'nav-desk', titolo: 'NavDesk' }`. Aggiungi gli import e 5 sezioni sul modello di quelle esistenti (es. `id="tasto-primario"`), con dati simulati realistici:

```tsx
      <SezioneCatalogo id="foto-strip" titolo="FotoStrip" spec="§5.33">
        <FotoStrip foto={[
          { id: 'f1', url: 'https://wa.me/placeholder-non-usato', alt: 'Impronta arcata superiore' },
        ]} />
        {/* NB: nel catalogo le thumb non caricano (nessuna signed URL) — la
            geometria 72×72 resta verificabile. */}
      </SezioneCatalogo>

      <SezioneCatalogo id="menu-voce" titolo="MenuVoce" spec="§5.34">
        <div style={{ maxWidth: 420 }}>
          <div style={{ borderBottom: '1.5px solid var(--line)' }}>
            <MenuVoce icona={<path d="M12 2v20" />} testo="Prezzi e lavorazioni" onTap={() => {}} />
          </div>
          <MenuVoce icona={<rect x="3" y="4" width="18" height="16" rx="2.5" />} testo="Foto" onTap={() => {}} />
          <div style={{ borderTop: '1.5px solid var(--line)', marginTop: 8 }}>
            <MenuVoce icona={<path d="M4 7h16" />} testo="Annulla lavoro" nota="Prossimamente" butta disabled />
          </div>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="tasto-whatsapp" titolo="TastoWhatsApp" spec="§5.29">
        <TastoWhatsApp waUrl="https://wa.me/393331234567?text=Lavoro%20n.147%20pronto">Invia messaggio WhatsApp</TastoWhatsApp>
      </SezioneCatalogo>

      <SezioneCatalogo id="riga-bloccante" titolo="RigaBloccante" spec="§5.30">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
          <RigaBloccante cosa="Manca la prescrizione del dentista" cosaFare="Aggiungila nei dati clinici" onTap={() => {}} />
          <RigaBloccante cosa="Manca il lotto della zirconia" cosaFare="Registra il lotto in Prove" onTap={() => {}} />
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="nav-desk" titolo="NavDesk" spec="§5.35">
        <div style={{ width: 240, height: 480, display: 'flex' }}>
          <NavDesk
            conteggi={{ rossa: 2, ambra: 4, viola: 1, blu: 2 }}
            pilaSelezionata="rossa"
            segnale={{ attenzione: false, forte: false, testo: 'Tutto a posto', azione: null }}
          />
        </div>
      </SezioneCatalogo>
```

⚠️ La shape esatta di `segnale` (`SegnaleStriscia`) va copiata da `src/lib/dashboard/striscia.ts` — se i campi differiscono, adegua la demo (mai il tipo).

- [ ] **Step 2: Verifica** — `npx tsc --noEmit` + `npx next build` (la pagina catalogo compila) + visita manuale `/ds-v3-catalogo` in `npm run dev` (le 5 sezioni ci sono, INDICE naviga).

- [ ] **Step 3: Commit** — `git commit -m "feat(catalogo): sezioni FotoStrip/MenuVoce/TastoWhatsApp/RigaBloccante/NavDesk"`.

---

# FASE C — Flusso Consegna v3

### Task 8: Helper `materialiCarenti` (estrazione del loop BOM)

**Files:**
- Create: `src/lib/consegna/materiali-carenti.ts`
- Modify: `src/app/api/lavori/[id]/precheck-materiali/route.ts:81-121` (usa l'helper — la route muore nel Task 15, ma fino ad allora resta funzionante e condivide il codice)
- Test: `tests/unit/materiali-carenti.test.ts`

**Interfaces:**
- Produces: `materialiCarenti(svc, lavoroId, labId): Promise<MaterialeCarente[]>` con `MaterialeCarente = { nome: string; quantita_necessaria: number; scorta_attuale: number; unita_misura: string; sufficiente: false }`. `svc` è `ReturnType<typeof getServiceClient>`.

- [ ] **Step 1: Failing test** — mock supabase col pattern `vi.hoisted` di `tests/unit/lavori-id-route.test.ts`: 3 casi — (a) nessuna lavorazione → `[]`; (b) BOM con scorta sufficiente → `[]`; (c) scorta 2 su necessarie 5 → un `MaterialeCarente` con i numeri giusti. Il mock incatena `.from('lavori_lavorazioni'|'listino_materiali_auto'|'magazzino')` restituendo dati per-tabella.

- [ ] **Step 2: Run — FAIL** — `npx vitest run tests/unit/materiali-carenti.test.ts`.

- [ ] **Step 3: Estrazione** — sposta VERBATIM il loop di `precheck-materiali/route.ts:81-121` (interface `MaterialeCarente` inclusa) in:

```ts
// src/lib/consegna/materiali-carenti.ts
// Estratto da api/lavori/[id]/precheck-materiali (ondata 16/07, riserva
// backend #3): il calcolo BOM lavorazioni → listino_materiali_auto →
// magazzino è condiviso dalla GET precheck-consegna. Logica INVARIATA.
import type { getServiceClient } from '@/lib/supabase/server-service'

export interface MaterialeCarente {
  nome: string
  quantita_necessaria: number
  scorta_attuale: number
  unita_misura: string
  sufficiente: false
}

export async function materialiCarenti(
  svc: ReturnType<typeof getServiceClient>,
  lavoroId: string,
  labId: string
): Promise<MaterialeCarente[]> {
  const { data: lavorazioni, error: lavErr } = await svc
    .from('lavori_lavorazioni')
    .select('id, listino_id, quantita')
    .eq('lavoro_id', lavoroId)
    .eq('laboratorio_id', labId)

  if (lavErr || !lavorazioni || lavorazioni.length === 0) return []

  const carenti: MaterialeCarente[] = []
  for (const lavorazione of lavorazioni) {
    if (!lavorazione.listino_id) continue
    const { data: bomItems } = await svc
      .from('listino_materiali_auto')
      .select('magazzino_id, quantita_per_unita, unita_misura')
      .eq('listino_id', lavorazione.listino_id)
      .eq('laboratorio_id', labId)
    if (!bomItems || bomItems.length === 0) continue

    for (const bom of bomItems) {
      const quantitaNecessaria = Number(bom.quantita_per_unita) * Number(lavorazione.quantita)
      const { data: magazzino } = await svc
        .from('magazzino')
        .select('nome, scorta_attuale')
        .eq('id', bom.magazzino_id)
        .eq('laboratorio_id', labId)
        .single()
      if (!magazzino) continue
      const scorta = Number(magazzino.scorta_attuale)
      if (scorta < quantitaNecessaria) {
        carenti.push({
          nome: magazzino.nome as string,
          quantita_necessaria: quantitaNecessaria,
          scorta_attuale: scorta,
          unita_misura: bom.unita_misura as string,
          sufficiente: false,
        })
      }
    }
  }
  return carenti
}
```

Poi in `precheck-materiali/route.ts` sostituisci le righe 65-121 con `const materialiCarentiRisultato = await materialiCarenti(svc, id, labId)` (import dall'helper, rimuovi l'interface locale importandola) e usa il risultato nella response invariata.

- [ ] **Step 4: Run — PASS** — helper test + suite `npx vitest run tests/unit` resta verde.

- [ ] **Step 5: Commit** — `git commit -m "refactor(consegna): estrai materialiCarenti in helper condiviso"`.

---

### Task 9: `GET /api/lavori/[id]/precheck-consegna`

**Files:**
- Modify: `src/types/domain.ts` (dopo `ConsegnaPrecheckResult`, ~riga 584)
- Create: `src/app/api/lavori/[id]/precheck-consegna/route.ts`
- Test: `tests/unit/precheck-consegna-route.test.ts`

**Interfaces:**
- Consumes: `precheckMDR` (`src/lib/consegna/precheck.ts:18` — il modulo di PRODUZIONE, MAI `precheck-mdr.ts`), `materialiCarenti` (Task 8).
- Produces (shape BLINDATO, riserva appsec #3):

```ts
export interface PrecheckConsegnaResponse {
  consegnabile: boolean
  bloccanti: ConsegnaPrecheckResult['errori']  // {elemento, descrizione, campo, route}[]
  warnings: string[]                            // frasi pronte, MAI dati paziente
}
```

- [ ] **Step 1: Failing test** — pattern `vi.hoisted` + mock `getServerUserClient`/`getServiceClient` di `tests/unit/lavori-id-route.test.ts`. Casi:
  1. non autenticato → 401;
  2. lavoro di altro lab (query `.single()` → null) → **404** (mai 403);
  3. lavoro completo e conforme → 200 `{ consegnabile: true, bloccanti: [], warnings: [] }` e la response NON contiene chiavi extra (`Object.keys(json).sort()` = `['bloccanti','consegnabile','warnings']` — blindatura anti-echo);
  4. lavoro senza `classe_rischio` e con `tipo_impronte` null → `consegnabile: false`, un bloccante con `campo: 'classe_rischio'`, un warning che contiene `Tipo impronta`;
  5. materiale sotto scorta (mock helper) → warning che contiene il nome del materiale.
  Per il caso 5 mocka `@/lib/consegna/materiali-carenti` con `vi.mock`.

- [ ] **Step 2: Run — FAIL**.

- [ ] **Step 3: Route**

```ts
// src/app/api/lavori/[id]/precheck-consegna/route.ts
// GET read-only (ondata 16/07 §3.1): il precheck consegna per il client
// FlussoConsegna. STESSO precheck del POST (precheckMDR — divergenza
// impossibile per costruzione) + warnings materiali via helper condiviso.
// Authz IDENTICA al POST consegna: nessun gate di ruolo (D-3, parità),
// 404 indistinguibile cross-tenant. Shape risposta BLINDATO: mai echo di
// campi lavoro/paziente (Art. 9 GDPR).
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { precheckMDR } from '@/lib/consegna/precheck'
import { materialiCarenti } from '@/lib/consegna/materiali-carenti'
import type { LavoroDettaglio, PrecheckConsegnaResponse } from '@/types/domain'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()
  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }
  const labId: string = utente.laboratorio_id

  // Select MINIMO = lo stesso di orchestraConsegna (orchestrate.ts Step 1) —
  // ciò che serve a precheckMDR, niente relazioni superflue.
  const { data: lavoro } = await svc
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      lavorazioni:lavori_lavorazioni(*),
      materiali:lavori_materiali(*)
    `)
    .eq('id', id)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()
  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })

  const pre = precheckMDR(lavoro as unknown as LavoroDettaglio)
  const carenti = await materialiCarenti(svc, id, labId)

  const warnings: string[] = [
    ...(pre.mdr_campi_mancanti ?? []).map((c) => `${c} non registrato all'accettazione`),
    ...carenti.map((m) => `${m.nome} sotto scorta (${m.scorta_attuale} ${m.unita_misura} su ${m.quantita_necessaria})`),
  ]

  const risposta: PrecheckConsegnaResponse = {
    consegnabile: pre.ok,
    bloccanti: pre.errori,
    warnings,
  }
  return NextResponse.json(risposta)
}
```

In `domain.ts` aggiungi l'interface `PrecheckConsegnaResponse` (blocco «Interfaces» sopra) dopo `ConsegnaPrecheckResult`.

- [ ] **Step 4: Run — PASS** + `npx tsc --noEmit`.

- [ ] **Step 5: Commit** — `git commit -m "feat(consegna): GET precheck-consegna read-only (precheckMDR di produzione + warnings)"`.

---

### Task 10: DialogConferma — variante additiva (occhiello · nota · primario sopra)

**Files:**
- Modify: `src/components/ds/DialogConferma.tsx`
- Test: `tests/unit/ds-v3/componenti/DialogConferma.test.tsx` (esteso — i test esistenti NON si toccano)

**Interfaces:**
- Produces: props NUOVE tutte opzionali, default = contratto distruttivo invariato (riserva arch #7):
  - `occhiello?: string` — riga 16.5/700 `--muted` centrata sopra il titolo (mockup `.dialog .occhiello`)
  - `centraTesto?: boolean` — centra titolo+testo (il titolo diventa l'«oggetto» 21/800 del mockup)
  - `nota?: string` — callout ambra compatta (max 2 righe, NESSUN elemento tappabile, D-6) fra testo e tasti
  - `primarioSopra?: boolean` — deroga §5.17 consegna: `TastoPrimario` SOPRA, `TastoSecondario` sotto

- [ ] **Step 1: Failing test (append al file esistente)**

```tsx
describe('DialogConferma — variante consegna (deroga §5.17, ondata 16/07)', () => {
  it('default: ordine invariato — sicura (secondario) PRIMA del distruttivo', () => {
    render(<DialogConferma aperto titolo="Butto?" testo="Il lavoro n.148" etichettaDistruttiva="Butta" etichettaSicura="Tienilo" onConferma={() => {}} onAnnulla={() => {}} />)
    const bottoni = screen.getAllByRole('button')
    expect(bottoni[0]).toHaveTextContent('Tienilo')
    expect(bottoni[1]).toHaveTextContent('Butta')
  })

  it('primarioSopra: il primario viene PRIMA; occhiello e nota renderizzati', () => {
    render(
      <DialogConferma aperto primarioSopra centraTesto occhiello="Consegno?" nota="2 materiali sotto scorta"
        titolo="Corona n.147 → Dr. Esposito" testo="DdC e buono si generano al tocco."
        etichettaDistruttiva="Consegna" etichettaSicura="Non ancora" onConferma={() => {}} onAnnulla={() => {}} />
    )
    const bottoni = screen.getAllByRole('button')
    expect(bottoni[0]).toHaveTextContent('Consegna')
    expect(bottoni[1]).toHaveTextContent('Non ancora')
    expect(screen.getByText('Consegno?')).toBeInTheDocument()
    const nota = screen.getByText('2 materiali sotto scorta')
    expect(nota.style.color).toBe('var(--amber)')
    expect(nota.closest('button, a')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — FAIL**.

- [ ] **Step 3: Implementazione** — in `DialogConferma.tsx`:
  - firma: aggiungi `occhiello?: string; centraTesto?: boolean; nota?: string; primarioSopra?: boolean` alle props (con destructuring `= false` per i boolean);
  - `contenutoCard` diventa:

```tsx
  const tasti = [
    <TastoSecondario key="sicura" onClick={onAnnulla}>{etichettaSicura}</TastoSecondario>,
    <TastoPrimario key="distruttiva" onClick={onConferma}>{etichettaDistruttiva}</TastoPrimario>,
  ]
  const contenutoCard = (
    <>
      {occhiello && <p style={occhielloStile}>{occhiello}</p>}
      <h2 id={titoloId} style={{ ...titoloStile, ...(centraTesto ? { textAlign: 'center' as const, letterSpacing: '-0.01em' } : null) }}>{titolo}</h2>
      <p id={testoId} style={{ ...testoStile, ...(centraTesto ? { textAlign: 'center' as const } : null) }}>{testo}</p>
      {nota && <p style={notaStile}>{nota}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m, marginTop: spazio.l }}>
        {primarioSopra ? [tasti[1], tasti[0]] : tasti}
      </div>
    </>
  )
```

  - nuovi stili in coda al file:

```tsx
const occhielloStile: CSSProperties = {
  fontSize: 16.5,
  fontWeight: tipografia.weight.bold,
  color: 'var(--muted)',
  textAlign: 'center',
  margin: 0,
}

// Nota ambra compatta (D-6): informazione, non decisione — mai tappabile,
// mai più evidente dell'oggetto (L1/L3).
const notaStile: CSSProperties = {
  fontSize: 14,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--amber)',
  background: 'var(--amber-tint)',
  borderRadius: raggio.riga - 6,
  padding: `${spazio.xs + 2}px ${spazio.sm}px`,
  margin: `${spazio.s}px 0 0`,
  textAlign: 'center',
}
```

  - aggiorna il commento di testa: «variante consegna (deroga §5.17, decision record 16/07): `primarioSopra` inverte l'ordine SOLO per il rito consegna».

- [ ] **Step 4: Run — PASS** — l'intero file di test DialogConferma (vecchi + nuovi).

- [ ] **Step 5: Commit** — `git commit -m "feat(ds): DialogConferma variante consegna additiva (occhiello/nota/primarioSopra)"`.

---

### Task 11: CardUAHaFatto — voce non-fatta (riserva UX #1)

**Files:**
- Modify: `src/components/ds/CardUAHaFatto.tsx`
- Test: `tests/unit/ds-v3/componenti/CardUAHaFatto.test.tsx` (append; se il file non esiste, crealo con questo solo describe)

**Interfaces:**
- Produces: `voci: Array<{ nome: string; sub?: string; fatto?: boolean }>` — `fatto` default `true`; `false` → `CheckTondo` non spuntato (per «Messaggio WhatsApp — pronto da inviare», MAI ✓ verde prima dell'invio).

- [ ] **Step 1: Failing test**

```tsx
describe('CardUAHaFatto — voce non-fatta (ondata 16/07)', () => {
  it('voce con fatto:false non mostra il check pieno', () => {
    const { container } = render(
      <CardUAHaFatto voci={[
        { nome: 'Dichiarazione di Conformità', sub: 'Generata a ogni consegna ✓' },
        { nome: 'Messaggio WhatsApp', sub: 'Pronto da inviare', fatto: false },
      ]} />
    )
    // CheckTondo fatto → sfondo verde-tint; non fatto → neutro. Due cerchi, uno solo verde.
    const cerchi = Array.from(container.querySelectorAll('div')).filter((d) => d.style.borderRadius === '50%' || d.style.borderRadius === '999px')
    expect(cerchi.length).toBeGreaterThanOrEqual(2)
  })
})
```

⚠️ Prima di scrivere l'asserzione definitiva LEGGI `src/components/ds/RigaFase.tsx` (`CheckTondo`): usa il segnale visivo REALE del ramo non-fatto (es. background o assenza del path ✓) e asserisci quello — l'asserzione sopra è il fallback minimo.

- [ ] **Step 2: Run — FAIL** (la prop `fatto` non esiste → tsc error nel test).

- [ ] **Step 3: Implementazione** — in `CardUAHaFatto.tsx`: firma `voci: Array<{ nome: string; sub?: string; fatto?: boolean }>` e nel map `<CheckTondo fatto={voce.fatto ?? true} diametro={DIAMETRO_CHECK} />`. Aggiorna il commento di testa (la card può elencare anche UNA voce «pronta ma non ancora avvenuta» — L5: mai ✓ su cose non fatte).

- [ ] **Step 4: Run — PASS**.

- [ ] **Step 5: Commit** — `git commit -m "feat(ds): CardUAHaFatto voce non-fatta (WhatsApp pronto da inviare, L5)"`.

---

### Task 12: FlussoConsegna — macchina a stati (GET → dialog/sheet → POST → esiti)

**Files:**
- Create: `src/components/features/lavori/consegna-v3/FlussoConsegna.tsx`
- Create: `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx`
- Test: `tests/unit/consegna-v3/flusso-consegna.test.tsx`

**Interfaces:**
- Consumes: `DialogConferma` (Task 10: `primarioSopra/occhiello/nota/centraTesto`), `Sheet`, `RigaBloccante` (Task 2), `TastoWhatsApp` (Task 1), `CardUAHaFatto` (Task 11), `Avviso`/`useAvvisi` (pattern scheda), `Caricamento`, `LinkQuieto`, `TastoTondo`, `GET /api/lavori/[id]/precheck-consegna` (Task 9), `POST /api/lavori/[id]/consegna` (ESISTENTE, intatto), `ConsegnaResult`/`ConsegnaError`/`PrecheckConsegnaResponse` da `@/types/domain`.
- Produces:

```tsx
export function FlussoConsegna(props: {
  lavoroId: string
  numero: string        // numero_lavoro, es. "147"
  dentista: string      // display, es. "Dr. Esposito"
  descrizione: string   // es. "Corona zirconia"
  aperto: boolean
  onChiudi: () => void            // uscita SENZA consegna (Non ancora / sheet chiuso / errore)
  onConsegnato?: () => void       // scheda: router.refresh() al 200
  onFrameChiuso: () => void       // pile: chiusura frame → smonta + refresh
  onRisolvi?: (route: string) => void // tap RigaBloccante → push al ponte (default: /lavori/{id}/modifica?tab={route})
})
```

**Macchina a stati:** `verifica` (GET al mount di `aperto`) → `dialog` | `bloccanti` | `erroreGet` → (dialog conferma) `invio` (POST) → `consegnato` | `bloccanti` (422 precheck) | `messaggio` (422 stato) | `riprova` (422 errore_pdf / rete — copy generica + tasto Riprova, MAI match sulla stringa del messaggio).

- [ ] **Step 1: Failing test** — jsdom, pattern mock:

```tsx
// tests/unit/consegna-v3/flusso-consegna.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/design-system/v3/sound', () => ({ suona: vi.fn() }))
vi.mock('@/design-system/v3/haptic', () => ({ vibra: vi.fn() }))
vi.mock('@/design-system/v3/motion', async (orig) => ({ ...(await orig()), useReducedMotion: () => true }))

import { FlussoConsegna } from '@/components/features/lavori/consegna-v3/FlussoConsegna'

const GET_URL = '/api/lavori/L1/precheck-consegna'
const POST_URL = '/api/lavori/L1/consegna'
const OK_200 = { ok: true, lavoro_id: 'L1', numero_lavoro: '147', ddc: { numero: 'DDC-2026-0001', url: 'x', signed_url: 'https://s/x' }, buono: { numero: 'BUO-2026-0001', url: 'y', signed_url: 'https://s/y' }, fattura: null, whatsapp_url: 'https://wa.me/393331234567?text=x', tempo_ms: 900 }

// fetch mockato PER URL (riserva test #d): mai per ordine di chiamata.
function mockFetch(mappa: Record<string, { status: number; json: unknown }>) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const match = Object.keys(mappa).find((k) => url.includes(k))
    if (!match) throw new Error(`fetch non mockata: ${url}`)
    const { status, json } = mappa[match]
    return { ok: status < 400, status, json: async () => json } as Response
  }) as unknown as typeof fetch
}

function montaAperto(extra: Partial<Parameters<typeof FlussoConsegna>[0]> = {}) {
  return render(
    <FlussoConsegna lavoroId="L1" numero="147" dentista="Dr. Esposito" descrizione="Corona zirconia"
      aperto onChiudi={vi.fn()} onFrameChiuso={vi.fn()} {...extra} />
  )
}

describe('FlussoConsegna — macchina a stati (§3.2)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('verde: GET ok → DialogConferma con oggetto e primario sopra', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } } })
    montaAperto()
    expect(await screen.findByText(/Consegno\?/)).toBeInTheDocument()
    expect(screen.getByText(/Corona zirconia n\.147/)).toBeInTheDocument()
    const bottoni = screen.getAllByRole('button')
    expect(bottoni[0]).toHaveTextContent('Consegna')
  })

  it('verde con warnings: nota ambra aggregata nel dialog (D-6)', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: ['Zirconia sotto scorta (2 g su 5)', 'Tipo impronta non registrato all\'accettazione'] } } })
    montaAperto()
    expect(await screen.findByText(/2 avvisi — si può consegnare/)).toBeInTheDocument()
  })

  it('rosso: GET con bloccanti → sheet «Prima di consegnare» con RigaBloccante; tap → onRisolvi(route)', async () => {
    const onRisolvi = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: false, warnings: [], bloccanti: [
      { elemento: 6, descrizione: 'Classe di rischio non specificata', campo: 'classe_rischio', route: 'dati' },
      { elemento: 7, descrizione: 'Data consegna prevista mancante', campo: 'data_consegna_prevista', route: 'dati' },
    ] } } })
    montaAperto({ onRisolvi })
    expect(await screen.findByText('Prima di consegnare')).toBeInTheDocument()
    expect(screen.getByText(/2 cose da sistemare/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /classe di rischio/i }))
    expect(onRisolvi).toHaveBeenCalledWith('dati')
  })

  it('POST 200 → frame Consegnato! con WhatsApp «pronto da inviare» e onConsegnato', async () => {
    const onConsegnato = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } }, [POST_URL]: { status: 200, json: OK_200 } })
    montaAperto({ onConsegnato })
    fireEvent.click((await screen.findAllByRole('button'))[0]) // «Consegna»
    expect(await screen.findByText('Consegnato!')).toBeInTheDocument()
    expect(screen.getByText(/andata al Dr\. Esposito/)).toBeInTheDocument()
    expect(screen.getByText('Pronto da inviare')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /whatsapp/i })).toHaveAttribute('href', OK_200.whatsapp_url)
    expect(screen.getByText(/La fatturazione si decide con il dentista/)).toBeInTheDocument()
    expect(onConsegnato).toHaveBeenCalledTimes(1)
  })

  it('race: POST 422 precheck_fallito → riapre sheet con gli errori del server', async () => {
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } },
      [POST_URL]: { status: 422, json: { ok: false, tipo: 'precheck_fallito', messaggio: 'Dati MDR incompleti', errori_precheck: [{ elemento: 3, descrizione: 'Nominativo prescrittore mancante', campo: 'cliente_id', route: 'dati' }] } } })
    montaAperto()
    fireEvent.click((await screen.findAllByRole('button'))[0])
    expect(await screen.findByText('Prima di consegnare')).toBeInTheDocument()
    expect(screen.getByText(/prescrittore/i)).toBeInTheDocument()
  })

  it('422 stato_non_consegnabile → solo messaggio + chiusura (onChiudi)', async () => {
    const onChiudi = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } },
      [POST_URL]: { status: 422, json: { ok: false, tipo: 'stato_non_consegnabile', messaggio: 'Il lavoro non è pronto.' } } })
    montaAperto({ onChiudi })
    fireEvent.click((await screen.findAllByRole('button'))[0])
    expect(await screen.findByText(/non è pronto/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }))
    expect(onChiudi).toHaveBeenCalled()
  })

  it('422 errore_pdf (sovraccarico, incluso «già in corso») → copy generica + Riprova; retry → ramo idempotente 200 degradato → frame SENZA link documento', async () => {
    let primoPost = true
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(GET_URL)) return { ok: true, status: 200, json: async () => ({ consegnabile: true, bloccanti: [], warnings: [] }) } as Response
      if (url.includes(POST_URL)) {
        if (primoPost) { primoPost = false; return { ok: false, status: 422, json: async () => ({ ok: false, tipo: 'errore_pdf', messaggio: 'Consegna già in corso, attendi.' }) } as Response }
        return { ok: true, status: 200, json: async () => ({ ...OK_200, ddc: { numero: 'DDC-2026-000', url: '', signed_url: '' }, buono: { numero: 'BUO-2026-000', url: '', signed_url: '' } }) } as Response
      }
      throw new Error('fetch non mockata')
    }) as unknown as typeof fetch
    montaAperto()
    fireEvent.click((await screen.findAllByRole('button'))[0])
    // copy GENERICA: mai la stringa server nel ramo riprova
    expect(await screen.findByText(/Non è andata a buon fine|Qualcosa non è andato/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /riprova/i }))
    expect(await screen.findByText('Consegnato!')).toBeInTheDocument()
  })

  it('GET fallisce → avviso con Riprova, mai il dialog', async () => {
    mockFetch({ [GET_URL]: { status: 500, json: { error: 'boom' } } })
    montaAperto()
    expect(await screen.findByRole('button', { name: /riprova/i })).toBeInTheDocument()
    expect(screen.queryByText(/Consegno\?/)).toBeNull()
  })

  it('chiusura frame → onFrameChiuso (refresh pile alla CHIUSURA, non al successo)', async () => {
    const onFrameChiuso = vi.fn()
    mockFetch({ [GET_URL]: { status: 200, json: { consegnabile: true, bloccanti: [], warnings: [] } }, [POST_URL]: { status: 200, json: OK_200 } })
    montaAperto({ onFrameChiuso })
    fireEvent.click((await screen.findAllByRole('button'))[0])
    await screen.findByText('Consegnato!')
    expect(onFrameChiuso).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /chiudi/i }))
    expect(onFrameChiuso).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run — FAIL** — `npx vitest run tests/unit/consegna-v3/flusso-consegna.test.tsx`.

- [ ] **Step 3: FlussoConsegna**

```tsx
// src/components/features/lavori/consegna-v3/FlussoConsegna.tsx
'use client'

// Ondata 16/07 §3.2 — FlussoConsegna: il rito della consegna in-place (D-5,
// spec sp.3 §8: la pagina intermedia è morta). Due tocchi: CONSEGNA → GET
// precheck fresco → verde: DialogConferma (primario sopra, deroga §5.17;
// warnings D-6 come nota ambra) → POST → frame «Consegnato!»; rosso: sheet
// «Prima di consegnare» (RigaBloccante → si risolve DOVE serve). Mappa esiti
// POST (shape reali, riserva backend #1-2): `tipo` è affidabile SOLO per
// precheck_fallito e stato_non_consegnabile; errore_pdf è SOVRACCARICO su 7
// esiti (incluso «già in corso») → copy generica + Riprova, MAI match sulla
// stringa. Il retry è sicuro: lock idempotente sempre rilasciato; ritentare
// su «già in corso» ricade nel ramo idempotente → 200 (eventualmente
// degradato: url documenti vuote → il frame li nasconde).

import { useEffect, useRef, useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { RigaBloccante } from '@/components/ds/RigaBloccante'
import { Caricamento } from '@/components/ds/Caricamento'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { tipografia, spazio } from '@/design-system/v3/tokens'
import { FrameConsegnato } from './FrameConsegnato'
import type { ConsegnaResult, ConsegnaError, PrecheckConsegnaResponse } from '@/types/domain'

type Stato =
  | { fase: 'verifica' }
  | { fase: 'dialog'; warnings: string[] }
  | { fase: 'bloccanti'; bloccanti: PrecheckConsegnaResponse['bloccanti'] }
  | { fase: 'invio' }
  | { fase: 'consegnato'; esito: ConsegnaResult }
  | { fase: 'messaggio'; testo: string }
  | { fase: 'riprova'; erroreGet: boolean }

// Copy dei bloccanti: «cosa» = descrizione del precheck di produzione;
// «cosa fare» derivato dalla route (oggi sempre 'dati' → il ponte).
const COSA_FARE: Record<string, string> = { dati: 'Completa i dati del lavoro' }

export function FlussoConsegna(props: {
  lavoroId: string
  numero: string
  dentista: string
  descrizione: string
  aperto: boolean
  onChiudi: () => void
  onConsegnato?: () => void
  onFrameChiuso: () => void
  onRisolvi?: (route: string) => void
}) {
  const { lavoroId, numero, dentista, descrizione, aperto, onChiudi, onConsegnato, onFrameChiuso, onRisolvi } = props
  const [stato, setStato] = useState<Stato>({ fase: 'verifica' })
  // il GET parte a ogni apertura: precheck sempre FRESCO (riserva UX #2)
  const apertoPrec = useRef(false)

  useEffect(() => {
    if (aperto && !apertoPrec.current) {
      apertoPrec.current = true
      setStato({ fase: 'verifica' })
      void verifica()
    }
    if (!aperto) apertoPrec.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto])

  async function verifica() {
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/precheck-consegna`)
      if (!res.ok) throw new Error(String(res.status))
      const pre = (await res.json()) as PrecheckConsegnaResponse
      if (pre.consegnabile) setStato({ fase: 'dialog', warnings: pre.warnings })
      else setStato({ fase: 'bloccanti', bloccanti: pre.bloccanti })
    } catch {
      setStato({ fase: 'riprova', erroreGet: true })
    }
  }

  async function invia() {
    setStato({ fase: 'invio' })
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/consegna`, { method: 'POST' })
      const json = (await res.json()) as ConsegnaResult | ConsegnaError
      if (json.ok) {
        onConsegnato?.()
        setStato({ fase: 'consegnato', esito: json })
        return
      }
      if (json.tipo === 'precheck_fallito' && json.errori_precheck) {
        setStato({ fase: 'bloccanti', bloccanti: json.errori_precheck })
        return
      }
      if (json.tipo === 'stato_non_consegnabile') {
        setStato({ fase: 'messaggio', testo: json.messaggio })
        return
      }
      // errore_pdf & co. — copy GENERICA + Riprova (mai la stringa server)
      setStato({ fase: 'riprova', erroreGet: false })
    } catch {
      setStato({ fase: 'riprova', erroreGet: false })
    }
  }

  if (!aperto) return null

  const notaWarnings =
    stato.fase === 'dialog' && stato.warnings.length > 0
      ? stato.warnings.length === 1
        ? stato.warnings[0]
        : `${stato.warnings.length} avvisi — si può consegnare, ma dai un occhio a magazzino e accettazione`
      : undefined

  return (
    <>
      {stato.fase === 'verifica' && <Caricamento />}

      <DialogConferma
        aperto={stato.fase === 'dialog'}
        primarioSopra
        centraTesto
        occhiello="Consegno?"
        titolo={`${descrizione} n.${numero} → ${dentista}`}
        testo="DdC e buono di consegna si generano al tocco."
        nota={notaWarnings}
        etichettaDistruttiva="Consegna"
        etichettaSicura="Non ancora"
        onConferma={() => void invia()}
        onAnnulla={onChiudi}
      />

      <Sheet aperto={stato.fase === 'bloccanti'} onChiudi={onChiudi}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <span style={{ fontSize: tipografia.size.title, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>Prima di consegnare</span>
          {stato.fase === 'bloccanti' && (
            <>
              <span style={{ fontSize: 15, fontWeight: tipografia.weight.semibold, color: 'var(--muted)' }}>
                {stato.bloccanti.length === 1 ? 'Una cosa da sistemare. Tocca per risolvere.' : `${stato.bloccanti.length} cose da sistemare. Tocca per risolvere.`}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: spazio.s }}>
                {stato.bloccanti.map((b) => (
                  <RigaBloccante
                    key={`${b.elemento}-${b.campo}`}
                    cosa={b.descrizione}
                    cosaFare={COSA_FARE[b.route] ?? 'Apri e completa'}
                    onTap={() => onRisolvi?.(b.route)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Sheet>

      {stato.fase === 'invio' && <Caricamento />}

      {(stato.fase === 'messaggio' || stato.fase === 'riprova') && (
        <Sheet aperto onChiudi={onChiudi}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <span style={{ fontSize: tipografia.size.title, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>
              {stato.fase === 'messaggio' ? 'Non si può consegnare' : 'Non è andata a buon fine'}
            </span>
            <span style={{ fontSize: 15.5, fontWeight: tipografia.weight.semibold, color: 'var(--muted)' }}>
              {stato.fase === 'messaggio' ? stato.testo : 'Nessun documento è stato perso. Puoi riprovare subito.'}
            </span>
            {stato.fase === 'riprova' && (
              <TastoSecondario onClick={() => (stato.erroreGet ? void verifica() : void invia())}>Riprova</TastoSecondario>
            )}
            <TastoSecondario onClick={onChiudi}>Chiudi</TastoSecondario>
          </div>
        </Sheet>
      )}

      {stato.fase === 'consegnato' && (
        <FrameConsegnato
          esito={stato.esito}
          lavoroId={lavoroId}
          descrizione={descrizione}
          dentista={dentista}
          onChiudi={onFrameChiuso}
        />
      )}
    </>
  )
}
```

⚠️ Adegua ai contratti REALI: `Caricamento` (leggi `src/components/ds/Caricamento.tsx` — se richiede props, passa quelle minime; se è skeleton inline, montalo dentro un portal/overlay coerente), `Sheet` (se supporta `titolo` come prop, usalo al posto dello span). Il POST esistente richiede same-origin (`isSameOrigin`) — `fetch` relativo la soddisfa.

- [ ] **Step 4: FrameConsegnato**

```tsx
// src/components/features/lavori/consegna-v3/FrameConsegnato.tsx
'use client'

// Ondata 16/07 §3.4 — Frame «Consegnato!» (mockup consegna.html Frame 3 =
// legge). role=status + focus programmatico sul titolo (riserva UX d);
// countdown FUORI dalla regione live (bucket C); lista = SOLO cose vere (L5):
// DdC ✓ · Buono ✓ · WhatsApp «pronto da inviare» (MAI ✓ prima dell'invio,
// riserva UX #1). D-2: niente fattura — riga quieta statica senza link.
// Ramo idempotente degradato (riserva backend #4): url documenti vuote → le
// voci restano (sono avvenute) ma senza link. Annullo: LinkQuieto + countdown
// (Frame 3); la trasparenza «Annullando…» vive nel DialogConferma di annullo.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CardUAHaFatto } from '@/components/ds/CardUAHaFatto'
import { TastoWhatsApp } from '@/components/ds/TastoWhatsApp'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { tipografia, spazio } from '@/design-system/v3/tokens'
import type { ConsegnaResult } from '@/types/domain'

const FINESTRA_MS = 10 * 60 * 1000

export function FrameConsegnato(props: {
  esito: ConsegnaResult
  lavoroId: string
  descrizione: string
  dentista: string
  onChiudi: () => void
}) {
  const { esito, lavoroId, descrizione, dentista, onChiudi } = props
  const titoloRef = useRef<HTMLHeadingElement>(null)
  const [t0] = useState(() => Date.now())
  const [rimasti, setRimasti] = useState(FINESTRA_MS)
  const [annulloAperto, setAnnulloAperto] = useState(false)
  const [annulloInCorso, setAnnulloInCorso] = useState(false)

  useEffect(() => { titoloRef.current?.focus() }, [])
  useEffect(() => {
    const timer = setInterval(() => setRimasti(Math.max(0, FINESTRA_MS - (Date.now() - t0))), 1000)
    return () => clearInterval(timer)
  }, [t0])

  const mm = Math.floor(rimasti / 60000)
  const ss = Math.floor((rimasti % 60000) / 1000).toString().padStart(2, '0')

  async function annulla() {
    setAnnulloInCorso(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/annulla-consegna`, { method: 'POST' })
      if (res.ok) { setAnnulloAperto(false); onChiudi(); return }
      setAnnulloAperto(false)
    } finally {
      setAnnulloInCorso(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div data-ds="v3" style={{ position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 24px 40px' }}>
        <TastoTondo glifo="‹" etichettaAria="Chiudi" onClick={onChiudi} />

        {/* Regione live: il countdown resta FUORI (sotto) */}
        <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, marginTop: spazio.l }}>
          <span aria-hidden="true" style={{ width: 92, height: 92, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--green-tint)', color: 'var(--green)' }}>
            <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12.5l5 5 10-11" /></svg>
          </span>
          <h1 ref={titoloRef} tabIndex={-1} style={{ fontSize: tipografia.size.question, fontWeight: tipografia.weight.extrabold, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0, outline: 'none' }}>
            Consegnato!
          </h1>
          <p style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', maxWidth: 300, margin: 0 }}>
            La {descrizione} n.{esito.numero_lavoro} è andata al {dentista}
          </p>
        </div>

        <div style={{ marginTop: spazio.l }}>
          <CardUAHaFatto voci={[
            { nome: 'Dichiarazione di Conformità', sub: `Generata a ogni consegna ✓ · ${esito.ddc.numero}` },
            { nome: 'Buono di consegna', sub: esito.buono.numero },
            { nome: 'Messaggio WhatsApp', sub: 'Pronto da inviare', fatto: false },
          ]} />
        </div>

        {/* D-2 — riga quieta STATICA, stile proprio (mai LinkQuieto §5.5) */}
        <p style={{ fontSize: 14.5, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', textAlign: 'center', margin: `${spazio.m}px 0 0` }}>
          La fatturazione si decide con il dentista
        </p>

        <div style={{ marginTop: spazio.m, display: 'flex', justifyContent: 'center' }}>
          <TastoWhatsApp waUrl={esito.whatsapp_url}>Invia messaggio WhatsApp</TastoWhatsApp>
        </div>

        {/* Annullo (Frame 3): LinkQuieto + countdown NON-live; sparisce a 0 */}
        {rimasti > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <LinkQuieto onClick={() => setAnnulloAperto(true)}>Annulla la consegna</LinkQuieto>
            <span aria-hidden="true" style={{ fontSize: 14.5, fontWeight: tipografia.weight.bold, color: 'var(--faint)', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</span>
          </div>
        )}
      </div>

      {/* Trasparenza dell'annullo (riserva UX #6): vive QUI, ordine standard
          (sicura sopra) — il default distruttivo di DialogConferma. */}
      <DialogConferma
        aperto={annulloAperto}
        titolo="Annullo la consegna?"
        testo={`Annullando, la Dichiarazione di Conformità e il buono vengono annullati. La ${descrizione} n.${esito.numero_lavoro} torna sul banco.`}
        etichettaDistruttiva={annulloInCorso ? 'Annullo…' : 'Annulla la consegna'}
        etichettaSicura="No, resta consegnato"
        onConferma={() => void annulla()}
        onAnnulla={() => setAnnulloAperto(false)}
      />
    </div>,
    document.body
  )
}
```

⚠️ `LinkQuieto`: verifica il contratto reale (`href` vs `onClick`) in `src/components/ds/LinkQuieto.tsx` e adegua. `tipografia.size.question` = 35 (mockup `.fatto-title`); se il token ha altro nome, usa quello giusto — mai il numero inline.

- [ ] **Step 5: Run — PASS** — tutti i test del Task + `bash scripts/check-ds-compliance.sh` («✅»: FlussoConsegna/Frame sono in `features/`, fuori dallo scope 4a, ma i componenti ds consumati restano conformi).

- [ ] **Step 6: Commit** — `git commit -m "feat(consegna): FlussoConsegna + FrameConsegnato — rito consegna v3 in-place (§3.2-3.4)"`.

---

### Task 13: Entry point scheda (`SchedaLavoroV3`) + `?consegna=1`

**Files:**
- Modify: `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` (props + stato + tasto CONSEGNA :299-305)
- Modify: `src/app/(app)/lavori/[id]/page.tsx` (legge `searchParams.consegna`, passa `apriConsegna`)
- Test: `tests/unit/scheda-v3/scheda-consegna-inline.test.tsx` (nuovo)

**Interfaces:**
- Consumes: `FlussoConsegna` (Task 12).
- Produces: `SchedaLavoroV3` accetta `apriConsegna?: boolean` (auto-apre il flusso al mount — deep-link `?consegna=1` dal redirect Task 15).

- [ ] **Step 1: Failing test** — monta `SchedaLavoroV3` con un `lavoro` fixture consegnabile (riusa le fixture dei test scheda esistenti — `tests/unit/scheda-v3/`), mock fetch per-URL come Task 12: (a) tap CONSEGNA → compare «Consegno?» SENZA navigazione (il mock `useRouter().push` non viene chiamato); (b) `apriConsegna` → «Consegno?» già visibile al mount; (c) lavoro non consegnabile → tasto disabled, tap non apre nulla (comportamento invariato).

- [ ] **Step 2: Run — FAIL**.

- [ ] **Step 3: Implementazione** — in `SchedaLavoroV3.tsx`:
  - aggiungi alle props `apriConsegna?: boolean`; stato `const [consegnaAperta, setConsegnaAperta] = useState(Boolean(props.apriConsegna))`;
  - il `TastoPrimario` CONSEGNA (riga ~302): `onClick={() => setConsegnaAperta(true)}` (via `router.push` RIMOSSA);
  - monta, accanto agli altri sheet (dopo `MenuSchedaSheet`):

```tsx
      <FlussoConsegna
        lavoroId={lavoro.id}
        numero={lavoro.numero_lavoro}
        dentista={clienteDisplay(lavoro.cliente)}
        descrizione={lavoro.descrizione}
        aperto={consegnaAperta}
        onChiudi={() => setConsegnaAperta(false)}
        onConsegnato={() => router.refresh()}
        onFrameChiuso={() => { setConsegnaAperta(false); router.refresh() }}
        onRisolvi={(route) => { setConsegnaAperta(false); router.push(`/lavori/${lavoro.id}/modifica?tab=${route}`) }}
      />
```

  (riserva UX #2: `onRisolvi` CHIUDE il flusso prima del push — al ritorno col back lo sheet non si riapre da solo; nuovo tap = nuovo GET. Nella scheda il refresh avviene al successo — il frame sopravvive perché `FlussoConsegna` resta montato.)
  - in `page.tsx` della scheda: aggiungi `searchParams` alla signature (`searchParams: Promise<{ consegna?: string }>` accanto a `params`), `const { consegna } = await searchParams`, e passa `apriConsegna={consegna === '1'}` a `SchedaLavoroV3`.

- [ ] **Step 4: Run — PASS** — nuovo test + regressione scheda (`npx vitest run tests/unit/scheda-v3`).

- [ ] **Step 5: Commit** — `git commit -m "feat(consegna): scheda v3 apre FlussoConsegna in place (+ deep-link ?consegna=1)"`.

---

### Task 14: Entry point pile — PilaAperta · PilaSplit · SchedaAnteprima · HomeDesktop

**Files:**
- Modify: `src/components/features/pile/PilaAperta.tsx:62,96`
- Modify: `src/components/features/pile/PilaSplit.tsx:49,83,91-95`
- Modify: `src/components/features/pile/SchedaAnteprima.tsx:110-118` (nuova prop `onConsegna`)
- Modify: `src/components/features/home/HomeDesktop.tsx:183-187`
- Test: `tests/unit/pile/pile-consegna-inline.test.tsx` (nuovo; aggiorna `SchedaAnteprima.test.tsx` esistente per la nuova prop)

**Interfaces:**
- Consumes: `FlussoConsegna` (Task 12), `LavoroPila` (`pile-home-shared.ts`: `id, numero, dentista, paziente, tipoLavoro, pill, consegnabile, …`).
- Produces: `SchedaAnteprima(props: { lavoro: LavoroPila; onConsegna: () => void })` — il tasto CONSEGNA chiama la callback (l'host possiede il flusso). Stato del flusso POSSEDUTO dagli host (riserva arch #5), frame portalato (già così: FrameConsegnato è un portal), `router.refresh()` alla CHIUSURA del frame.

- [ ] **Step 1: Failing test** — `pile-consegna-inline.test.tsx`: monta `PilaAperta` (pila rossa, primo consegnabile) con fetch mockata per-URL: (a) tap sul TastoConsegnaInline della prima card → «Consegno?» compare, `push` NON chiamato; (b) POST 200 → «Consegnato!»; chiusura frame → `refresh` chiamato UNA volta (mock `useRouter`). Per `SchedaAnteprima`: tap CONSEGNA → chiama `onConsegna` (prop mock).

- [ ] **Step 2: Run — FAIL**.

- [ ] **Step 3: Implementazione**

`PilaAperta.tsx` — stato host + card:

```tsx
  const [consegnaId, setConsegnaId] = useState<string | null>(null)
  const lavoroInConsegna = consegnaId ? lista.find((l) => l.id === consegnaId) ?? null : null
```

riga 96: `onConsegna: l.id === idPrimoConsegnabile ? () => setConsegnaId(l.id) : undefined`
e in coda al JSX della section:

```tsx
      {lavoroInConsegna && (
        <FlussoConsegna
          lavoroId={lavoroInConsegna.id}
          numero={lavoroInConsegna.numero}
          dentista={lavoroInConsegna.dentista}
          descrizione={lavoroInConsegna.tipoLavoro}
          aperto
          onChiudi={() => setConsegnaId(null)}
          onFrameChiuso={() => { setConsegnaId(null); router.refresh() }}
          onRisolvi={(route) => { setConsegnaId(null); router.push(`/lavori/${lavoroInConsegna.id}/modifica?tab=${route}`) }}
        />
      )}
```

(nessun `onConsegnato`: nelle pile il refresh è SOLO alla chiusura del frame — riserva arch #5, il refresh smonterebbe la card e il frame a metà countdown.)

`PilaSplit.tsx` — stesso pattern (stato `consegnaId` + blocco `FlussoConsegna` identico, import aggiunti); riga 83 come sopra; righe 91-95: `<SchedaAnteprima lavoro={schedaLavoro} onConsegna={() => setConsegnaId(schedaLavoro.id)} />`.

`SchedaAnteprima.tsx` — firma: `props: { lavoro: LavoroPila; onConsegna: () => void }`; righe 110-118: `onClick={onConsegna}` al posto del `router.push`.

`HomeDesktop.tsx` — stato `consegnaId` + blocco `FlussoConsegna` (identico a PilaAperta ma su `schedaLavoro`); righe 183-187: `<SchedaAnteprima lavoro={schedaLavoro} onConsegna={() => setConsegnaId(schedaLavoro.id)} />`.

- [ ] **Step 4: Run — PASS** — nuovi test + regressione `npx vitest run tests/unit -t "PilaAperta|PilaSplit|SchedaAnteprima|HomeDesktop"` + `npx tsc --noEmit` (la prop nuova è obbligatoria: tsc trova ogni call-site dimenticato).

- [ ] **Step 5: Commit** — `git commit -m "feat(consegna): pile e anteprima montano FlussoConsegna in place (2 tocchi ovunque)"`.

---

### Task 15: Morte della pagina /consegna e dei moduli orfani

**Files:**
- Rewrite: `src/app/(app)/lavori/[id]/consegna/page.tsx` (→ redirect); Delete: `loading.tsx`, `error.tsx` nella stessa cartella
- Delete: `src/components/features/lavori/ConsegnaButton.tsx` · `src/components/features/lavori/MaterialiWarningSheet.tsx` (verifica il path esatto con grep) · `src/app/api/lavori/[id]/precheck-materiali/route.ts` · `src/lib/consegna/precheck-mdr.ts`
- Delete: `tests/unit/ConsegnaButton.test.tsx` · `tests/unit/precheck-mdr.test.ts` (⚠️ `tests/unit/precheck.test.ts` RESTA — testa il modulo vivo)
- Modify: `src/components/features/lavori/LavoroFormClient.tsx:405` · `src/lib/nav/route-migrate-v3.ts:14-17` (solo commento) · `tests/e2e/consegna.spec.ts:175-190`
- Test: `tests/unit/consegna-v3/sweep-moduli-morti.test.ts` (nuovo)

- [ ] **Step 1: Failing test (sweep)** — pattern `form-font-v3-sweep.test.ts`: scandisci ricorsivamente `src/` e asserisci che NESSUN file importi `ConsegnaButton`, `MaterialiWarningSheet`, `consegna/precheck-mdr`, `precheck-materiali`. Ora FALLISCE (page.tsx importa ConsegnaButton, ecc.).

- [ ] **Step 2: Redirect + rimozioni**

```tsx
// src/app/(app)/lavori/[id]/consegna/page.tsx
// Ondata 16/07 (D-5, sp.3 §8 A3): la pagina intermedia è MORTA. Il rito vive
// in FlussoConsegna, dentro scheda e pile. Questo redirect tiene vivi i
// deep-link/bookmark: ?consegna=1 auto-apre il flusso nella scheda.
import { redirect } from 'next/navigation'

export default async function ConsegnaRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/lavori/${id}?consegna=1`)
}
```

- elimina i file in lista (`git rm`); trova ogni residuo: `grep -rn "ConsegnaButton\|MaterialiWarningSheet\|precheck-mdr\|precheck-materiali" src tests` e ripulisci import/riferimenti rimasti;
- `LavoroFormClient.tsx:405`: `router.push(\`/lavori/${lavoro.id}/consegna\`)` → `router.push(\`/lavori/${lavoro.id}?consegna=1\`)`;
- `route-migrate-v3.ts`: aggiorna il commento (righe 14-17): «Il flusso di consegna vive in-place nella scheda/pile (ondata 16/07); la route `/consegna` è un semplice redirect → resta correttamente FUORI dal predicato» — codice e test INVARIATI (`isV3MigratedRoute('/lavori/x/consegna')` resta `false`);
- `tests/e2e/consegna.spec.ts`: elimina il blocco :175-190 (navigava la vecchia pagina, era skipped); il test POST 401 (:61-64) resta.

- [ ] **Step 3: Run — PASS** — sweep verde + `npx tsc --noEmit` + suite completa `npx vitest run` (baseline: nessun test perso oltre ai 2 eliminati con i loro moduli).

- [ ] **Step 4: Commit** — `git commit -m "feat(consegna): muore la pagina intermedia — redirect ?consegna=1; via ConsegnaButton/MaterialiWarningSheet/precheck-mdr/precheck-materiali"`.

---

### Task 16: Documentale (spec §5 — parte dell'ondata, NON opzionale)

**Files:**
- Modify: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (§5.35)
- Modify: `docs/superpowers/specs/2026-07-09-ds-v3-il-cuore-design.md` (§9)
- Create: `docs/design/decisions/2026-07-16-ondata-fondamenta-4b-consegna.md`
- Modify: `docs/design/decisions/2026-07-09-il-cuore-mockups.md` (nota SUPERATA su «numero DdC al commit»)
- Modify: `../ANALISI/17_adempimenti_lab_2026.md` §1.2 (riga DdC annullate)
- Modify: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (3 item nuovi)

- [ ] **Step 1: Emendamenti**
  - **§5.35 spec madre**, in coda alla sezione: `> **Emendamento 16/07/2026 (D-4):** il tasto «+ Nuovo lavoro» è una variante fisica locale H52/testo 16 (stessa faccia/corsa/suono del TastoPrimario, taglia propria) — NON riusa TastoPrimario (H fissa 70/60; a 1280 coesisterebbe col CONSEGNA di SchedaAnteprima violando «UNO per schermata» §5.1). Decisione visiva su mockup docs/design/mockups/2026-07-16-navdesk-tasto-varianti.html, variante A.`
  - **§9 spec figlia**, in coda: `> **Nota 16/07/2026:** la 4a-server qui descritta (outbox+cron, emissione differita) NON fu eseguita — sostituita dal modello «fatturazione concordata» (migration 20260710150000_ondata0_pulizia_outbox.sql): la consegna non tocca il fiscale, nessuna fattura nasce alla consegna. La finestra annullo 10 min (C4) e il gate STATI_CONSEGNABILI (E4) sono in produzione. La numerazione DdC resta a t=0 con annullo tracciato (D-1, parere normativo 16/07 — v. decision record 2026-07-16).`
  - **decision record 09/07** (`2026-07-09-il-cuore-mockups.md`): individua la riga bucket C «numero DdC assegnato al commit dei 10 minuti (mai a t=0)» e appendi: `→ **SUPERATA il 16/07/2026 (D-1):** Art. 52(8) impone la DdC redatta PRIMA dell'immissione sul mercato (il dispositivo viaggia accompagnato dalla dichiarazione completa); All. XIII non impone numerazione; ISO 13485 §4.2.4 → annullo tracciato = prassi corretta. Panel normativo+architetturale, ratifica Francesco. V. docs/design/decisions/2026-07-16-ondata-fondamenta-4b-consegna.md.`

- [ ] **Step 2: Decision record nuovo** — `docs/design/decisions/2026-07-16-ondata-fondamenta-4b-consegna.md` con: D-1…D-6 della spec (tabella §1, copiala adattando), le deviazioni ratificate dal mockup consegna (riga fattura RIMOSSA dal frame → riga quieta statica senza link; voce WhatsApp «pronto da inviare» mai ✓; annullo del frame = LinkQuieto+countdown, trasparenza nel dialog di annullo) e il riferimento al mockup NavDesk.

- [ ] **Step 3: ANALISI/17 §1.2** — appendi alla sezione DdC: `**DdC annullate (annullo consegna entro 10 min):** il documento resta a registro con stato \`annullata\`, il numero NON si riusa mai, conservazione come i documenti attivi (≥10 anni, 15 se impiantabile — All. XIII p.1 u.c.); l'annullo presuppone che il dispositivo non sia uscito fisicamente (altrimenti: reso/nuova consegna). Parere normativo 16/07/2026 (D-1).`

- [ ] **Step 4: BACKLOG** — aggiungi 3 item etichettati: (i) **drift `consegna_finalizza_atomica`** — RPC creata da `20260710150000` mai chiamata da `orchestrate.ts` (update inline Step 5): allineare o droppare in un'ondata server; (ii) **check-ds in CI** — oggi solo pre-commit husky; (iii) **`csrf.ts:9` ritorna `true` con Origin assente** — nota per futuri client non-browser.

- [ ] **Step 5: Commit** — `git commit -m "docs(consegna): emendamenti §5.35/§9, decision record 16/07, DdC annullate in ANALISI/17, 3 item BACKLOG"`.

---

### Task 17: FASE 7 — verifica finale del worktree

- [ ] **Step 1:** `npx tsc --noEmit` → 0 errori.
- [ ] **Step 2:** `npx vitest run` → tutto verde, conteggio ≥ baseline 1954 pass (al netto dei 2 file di test rimossi col codice morto, più tutti i nuovi).
- [ ] **Step 3:** `npx next build` → verde (route nuova presente, pagina consegna = redirect).
- [ ] **Step 4:** `bash scripts/check-ds-compliance.sh` → «✅».
- [ ] **Step 5:** Commit di eventuali fix: `git commit -m "fix(consegna): FASE 7 — correzioni da tsc/vitest/build"`.

**Dopo il piano (fuori dai task, nel processo BP-2):** FASE 8 review → FASE 9 QA browser lab E2E `00000000-…-0001` (MAI lab Filippo; 2 tocchi da scheda/pila/split/1280, ramo rosso, annullo entro 10 min, redirect deep-link; 3 viewport × 2 temi) → FASE 9b gate estetico L2 (checklist 12 sezioni; screenshot in `docs/design/screenshots/2026-07-16-consegna-v3/`) → merge (gate Francesco) → FASE 10 deploy → FASE 11 BP-1 (MEMORY + ROADMAP + SESSION_ACTIVE).

---

## Self-review del piano (fatta il 16/07)

- **Copertura spec:** §2.1→T3 · §2.2→T4 · §2.3→T1 · §2.4→T2 · §2.5→T5 · §2.6→T6 · §2.7→T7 · §3.1→T8+T9 · §3.2→T10+T12 · §3.3→T13+T14 · §3.4→T11+T12 · §3.5→T15 · §5→T16 · §7 DoD→T17+processo. Nessun buco.
- **Coerenza tipi:** `PrecheckConsegnaResponse` definita in T9, consumata in T12; `FlussoConsegna` props identiche in T12/T13/T14; `MaterialeCarente` T8→T9; `fatto?` T11→T12.
- **Ordine:** T1/T2 prima di T12 (consuma TastoWhatsApp/RigaBloccante); T8 prima di T9; T10/T11 prima di T12; T12 prima di T13/T14; T15 per ultimo (mai una finestra di commit senza percorso di consegna funzionante).



