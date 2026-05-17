# Design Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Risolvere tutti i problemi trovati nell'audit taste-skill filtro-compatibile: 11 loading.tsx mancanti, 1 not-found.tsx, skip link accessibilità, transition:all anti-pattern, animate height violation, touch targets sotto-soglia, useEffect senza cleanup.

**Architecture:** Sette task indipendenti raggruppati per tipo. I task 1-5 sono fix tecnici puri (no nuovi componenti visivi). I task 6-7 aggiungono nuovi file seguendo pattern già stabiliti nel codebase. Ogni task è committabile separatamente.

**Tech Stack:** Next.js 16 App Router, React inline styles, Framer Motion 12 (`motion/react`), design tokens da `src/design-system/motion.ts`, CSS vars da `globals.css`.

---

## File Map

**Modificati:**
- `src/app/(app)/lavori/page.tsx:197-199` — transition:all + minHeight 40→52
- `src/app/(app)/layout.tsx` — skip link + id="main-content"
- `src/components/features/scadenzario/ScadenzarioList.tsx:200-210,332-345` — animate height + AbortController
- `src/components/features/dashboard/DashboardFrontDesk.tsx:101` — minHeight 40→52
- `src/hooks/useDashboard.ts:23-40` — AbortController cleanup

**Creati (nuovi):**
- `src/app/not-found.tsx`
- `src/app/(app)/agenda/loading.tsx`
- `src/app/(app)/analytics/loading.tsx`
- `src/app/(app)/fatture/loading.tsx`
- `src/app/(app)/impostazioni/loading.tsx`
- `src/app/(app)/listino/loading.tsx`
- `src/app/(app)/magazzino/loading.tsx`
- `src/app/(app)/pazienti/loading.tsx`
- `src/app/(app)/qualita/loading.tsx`
- `src/app/(app)/rete/loading.tsx`
- `src/app/(app)/scadenzario/loading.tsx`
- `src/app/(app)/tecnici/loading.tsx`

---

## Task 1: Fix `transition: all` e touch target nei filtri tab lavori

**Files:**
- Modify: `src/app/(app)/lavori/page.tsx:197-199`

- [ ] **Step 1: Apri lavori/page.tsx e individua i filtri tab (intorno alla riga 183)**

Il blocco da modificare è il `<Link>` che renderizza i tab di filtro. Cerca:
```
transition: 'all var(--tr, 0.18s cubic-bezier(0.2,0,0,1))',
minHeight: 40,
```

- [ ] **Step 2: Sostituisci transition:all e porta il touch target a 52px**

Cambia le due righe trovate in:
```typescript
transition: 'background var(--tr, 0.18s cubic-bezier(0.2,0,0,1)), box-shadow var(--tr, 0.18s cubic-bezier(0.2,0,0,1)), color var(--tr, 0.18s cubic-bezier(0.2,0,0,1))',
minHeight: 52,
```

- [ ] **Step 3: Verifica TypeScript**
```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 4: Commit**
```bash
git add src/app/\(app\)/lavori/page.tsx
git commit -m "fix(lavori): specific transition props e touch target 52px sui filtri tab"
```

---

## Task 2: Fix `animate height` in ScadenzarioList

**Files:**
- Modify: `src/components/features/scadenzario/ScadenzarioList.tsx`

**Contesto:** `ScadenzarioList.tsx` usa Framer Motion `animate={{ height: 'auto' }}` per l'accordion espandibile. Questo anima una proprietà di layout violando la design policy. La soluzione è sostituire con CSS `grid-template-rows: 0fr → 1fr` che i browser moderni ottimizzano senza thrash, mantenendo il supporto a `prefers-reduced-motion` già presente.

- [ ] **Step 1: Individua il blocco AnimatePresence in ScadenzarioList.tsx (intorno alla riga 200)**

Cerca questo blocco:
```tsx
<AnimatePresence initial={false}>
  {expanded && (
    <motion.div
      key="detail"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : t('fast', 'standard')}
      style={{ overflow: 'hidden', margin: '0 16px' }}
    >
```

- [ ] **Step 2: Sostituisci con approccio CSS grid-template-rows**

Rimuovi il blocco `<AnimatePresence>` e `<motion.div>` e sostituisci con CSS puro. Il wrapper esterno usa `grid-template-rows` per l'espansione, e la `motion.div` rimane solo per l'opacity:

```tsx
<div
  style={{
    display: 'grid',
    gridTemplateRows: expanded ? '1fr' : '0fr',
    transition: reducedMotion ? 'none' : 'grid-template-rows var(--tr, 0.18s cubic-bezier(0.2,0,0,1))',
    margin: '0 16px',
    overflow: 'hidden',
  }}
>
  <div style={{ minHeight: 0 }}>
```

Aggiungi il tag di chiusura `</div></div>` in corrispondenza della fine del vecchio `</motion.div>` e `</AnimatePresence>`.

- [ ] **Step 3: Rimuovi l'import di AnimatePresence se non usato altrove nel file**

Controlla se `AnimatePresence` è importato e usato in altri punti del file. Se è usato solo per l'accordion, rimuovilo dall'import:
```typescript
// Cambia
import { AnimatePresence, motion } from 'motion/react'
// In (se motion è ancora usato altrove nel file)
import { motion } from 'motion/react'
// O se nessuno dei due serve più
// rimuovi la riga
```

- [ ] **Step 4: Verifica TypeScript**
```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 5: Commit**
```bash
git add src/components/features/scadenzario/ScadenzarioList.tsx
git commit -m "fix(scadenzario): accordion usa grid-template-rows invece di animate height"
```

---

## Task 3: Fix touch target in DashboardFrontDesk

**Files:**
- Modify: `src/components/features/dashboard/DashboardFrontDesk.tsx`

- [ ] **Step 1: Individua il touch target da 40px (intorno alla riga 101)**

Cerca:
```
minHeight: 40,
```

- [ ] **Step 2: Portalo a 52px**

```typescript
minHeight: 52,
```

- [ ] **Step 3: Verifica TypeScript**
```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 4: Commit**
```bash
git add src/components/features/dashboard/DashboardFrontDesk.tsx
git commit -m "fix(dashboard): touch target front-desk portato a 52px"
```

---

## Task 4: useEffect cleanup con AbortController

**Files:**
- Modify: `src/hooks/useDashboard.ts`
- Modify: `src/components/features/scadenzario/ScadenzarioList.tsx`

**Contesto:** Due fetch non cancellano la richiesta in volo se il componente si smonta prima del completamento. Con l'AbortController, al cleanup React la richiesta viene annullata e `setState` non viene chiamato su un componente smontato.

- [ ] **Step 1: Aggiorna useDashboard.ts**

Sostituisci l'intero `useEffect` in `useDashboard.ts`:

```typescript
useEffect(() => {
  const controller = new AbortController()

  fetch('/api/dashboard/kpi', { signal: controller.signal })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then((d: DashboardApiResponse | { error: string }) => {
      if ('error' in d) {
        setError(d.error)
      } else {
        setResponse(d)
      }
      setLoading(false)
    })
    .catch((e: unknown) => {
      if (e instanceof Error && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
      setLoading(false)
    })

  return () => controller.abort()
}, [])
```

- [ ] **Step 2: Aggiorna ScadenzarioList.tsx — il fetch useEffect (intorno alla riga 332)**

Individua:
```typescript
useEffect(() => {
  fetch('/api/scadenzario')
    .then((res) => {
      if (!res.ok) throw new Error(`Errore ${res.status}`)
      return res.json() as Promise<InsolutoCliente[]>
    })
    .then(setItems)
    .catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    })
}, [])
```

Sostituisci con:
```typescript
useEffect(() => {
  const controller = new AbortController()

  fetch('/api/scadenzario', { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`Errore ${res.status}`)
      return res.json() as Promise<InsolutoCliente[]>
    })
    .then(setItems)
    .catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    })

  return () => controller.abort()
}, [])
```

- [ ] **Step 3: Verifica TypeScript**
```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 4: Commit**
```bash
git add src/hooks/useDashboard.ts src/components/features/scadenzario/ScadenzarioList.tsx
git commit -m "fix(hooks): AbortController cleanup sui fetch useDashboard e ScadenzarioList"
```

---

## Task 5: Skip link accessibilità

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Contesto:** Gli screen reader e gli utenti da tastiera non hanno modo di saltare la BottomNavPill e raggiungere direttamente il contenuto principale. Il skip link è visivamente nascosto (`sr-only`) ma diventa visibile al focus (standard WCAG 2.4.1).

- [ ] **Step 1: Aggiungi lo skip link al layout**

In `src/app/(app)/layout.tsx`, all'inizio del `return`, aggiungi il skip link come primo elemento:

```tsx
return (
  <>
    <a
      href="#main-content"
      style={{
        position: 'absolute',
        top: '-40px',
        left: 0,
        zIndex: 9999,
        padding: '8px 16px',
        background: 'var(--primary, #D90012)',
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
        textDecoration: 'none',
        borderRadius: '0 0 8px 0',
        transition: 'top 0.2s',
      }}
      onFocus={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = '0' }}
      onBlur={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = '-40px' }}
    >
      Vai al contenuto
    </a>
    <main id="main-content">
      {children}
    </main>
    <BottomNavPill />
    <SwRegistration />
  </>
)
```

**Nota:** Il `<main>` wrapper con `id="main-content"` è semanticamente corretto e aggiunge struttura HTML senza impatto visivo.

- [ ] **Step 2: Verifica TypeScript**
```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 3: Commit**
```bash
git add src/app/\(app\)/layout.tsx
git commit -m "fix(a11y): skip link e landmark main per screen reader"
```

---

## Task 6: 11 loading.tsx skeleton screens

**Files:**
- Create: `src/app/(app)/agenda/loading.tsx`
- Create: `src/app/(app)/analytics/loading.tsx`
- Create: `src/app/(app)/fatture/loading.tsx`
- Create: `src/app/(app)/impostazioni/loading.tsx`
- Create: `src/app/(app)/listino/loading.tsx`
- Create: `src/app/(app)/magazzino/loading.tsx`
- Create: `src/app/(app)/pazienti/loading.tsx`
- Create: `src/app/(app)/qualita/loading.tsx`
- Create: `src/app/(app)/rete/loading.tsx`
- Create: `src/app/(app)/scadenzario/loading.tsx`
- Create: `src/app/(app)/tecnici/loading.tsx`

**Pattern:** Ogni file usa la funzione `pulse()` identica ai 3 loading.tsx esistenti. La struttura skeleton rispecchia la shape reale della pagina corrispondente (header + lista card, o header + sezioni, etc.).

- [ ] **Step 1: Crea `src/app/(app)/agenda/loading.tsx`**

```tsx
export default function AgendaLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={pulse({ width: 100, height: 28, borderRadius: 8 })} />
      </div>
      {/* Giorni con appuntamenti */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <div style={{ ...pulse({ width: 120, height: 14, borderRadius: 6 }), marginBottom: 10 }} />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} style={{ marginBottom: 8, ...pulse({ height: 80, borderRadius: 14 }) }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 2: Crea `src/app/(app)/analytics/loading.tsx`**

```tsx
export default function AnalyticsLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 140, height: 28, borderRadius: 8 })} />
      </div>
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 20 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={pulse({ width: 88, height: 76, borderRadius: 16, flexShrink: 0 })} />
        ))}
      </div>
      {/* Grafici skeleton */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 16, ...pulse({ height: 160, borderRadius: 16 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 3: Crea `src/app/(app)/fatture/loading.tsx`**

```tsx
export default function FattureLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 100, height: 28, borderRadius: 8 })} />
        <div style={{ marginLeft: 'auto', ...pulse({ width: 52, height: 52, borderRadius: 14 }) }} />
      </div>
      {/* Filtri */}
      <div style={{ display: 'flex', gap: 8, paddingBottom: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={pulse({ width: 72, height: 36, borderRadius: 32, flexShrink: 0 })} />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8, ...pulse({ height: 88, borderRadius: 14 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 4: Crea `src/app/(app)/impostazioni/loading.tsx`**

```tsx
export default function ImpostazioniLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <div style={pulse({ width: 160, height: 28, borderRadius: 8 })} />
      </div>
      {/* Sezioni impostazioni */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div style={{ ...pulse({ width: 140, height: 14, borderRadius: 6 }), marginBottom: 12 }} />
          <div style={pulse({ height: 72, borderRadius: 16 })} />
        </div>
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 5: Crea `src/app/(app)/listino/loading.tsx`**

```tsx
export default function ListinoLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 100, height: 28, borderRadius: 8 })} />
        <div style={{ marginLeft: 'auto', ...pulse({ width: 52, height: 52, borderRadius: 14 }) }} />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8, ...pulse({ height: 64, borderRadius: 14 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 6: Crea `src/app/(app)/magazzino/loading.tsx`**

```tsx
export default function MagazzinoLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 130, height: 28, borderRadius: 8 })} />
        <div style={{ marginLeft: 'auto', ...pulse({ width: 52, height: 52, borderRadius: 14 }) }} />
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8, ...pulse({ height: 72, borderRadius: 14 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 7: Crea `src/app/(app)/pazienti/loading.tsx`**

```tsx
export default function PazientiLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={pulse({ width: 100, height: 28, borderRadius: 8 })} />
        <div style={{ marginLeft: 'auto', ...pulse({ width: 52, height: 52, borderRadius: 14 }) }} />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8, ...pulse({ height: 72, borderRadius: 14 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 8: Crea `src/app/(app)/qualita/loading.tsx`**

```tsx
export default function QualitaLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 110, height: 28, borderRadius: 8 })} />
      </div>
      {/* 3 sezioni qualità */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div style={{ ...pulse({ width: 160, height: 16, borderRadius: 6 }), marginBottom: 12 }} />
          {Array.from({ length: 2 }).map((_, j) => (
            <div key={j} style={{ marginBottom: 8, ...pulse({ height: 80, borderRadius: 14 }) }} />
          ))}
        </div>
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 9: Crea `src/app/(app)/rete/loading.tsx`**

```tsx
export default function ReteLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={pulse({ width: 80, height: 28, borderRadius: 8 })} />
        <div style={{ marginLeft: 'auto', ...pulse({ width: 52, height: 52, borderRadius: 14 }) }} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 12, ...pulse({ height: 96, borderRadius: 16 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 10: Crea `src/app/(app)/scadenzario/loading.tsx`**

```tsx
export default function ScadenzarioLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={pulse({ width: 150, height: 28, borderRadius: 8 })} />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 8, ...pulse({ height: 84, borderRadius: 14 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 11: Crea `src/app/(app)/tecnici/loading.tsx`**

```tsx
export default function TecniciLoading() {
  return (
    <div style={{ padding: '0 20px' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={pulse({ width: 100, height: 28, borderRadius: 8 })} />
        <div style={{ marginLeft: 'auto', ...pulse({ width: 52, height: 52, borderRadius: 14 }) }} />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: 10, ...pulse({ height: 80, borderRadius: 16 }) }} />
      ))}
    </div>
  )
}

function pulse(style: React.CSSProperties): React.CSSProperties {
  return {
    ...style,
    background: 'linear-gradient(90deg, #E4DFD9 25%, #EDEDEA 50%, #E4DFD9 75%)',
    backgroundSize: '200% 100%',
    animation: 'ua-skeleton-pulse 1.4s ease-in-out infinite',
  }
}
```

- [ ] **Step 12: Verifica TypeScript su tutti i file creati**
```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 13: Commit**
```bash
git add src/app/\(app\)/agenda/loading.tsx \
        src/app/\(app\)/analytics/loading.tsx \
        src/app/\(app\)/fatture/loading.tsx \
        src/app/\(app\)/impostazioni/loading.tsx \
        src/app/\(app\)/listino/loading.tsx \
        src/app/\(app\)/magazzino/loading.tsx \
        src/app/\(app\)/pazienti/loading.tsx \
        src/app/\(app\)/qualita/loading.tsx \
        src/app/\(app\)/rete/loading.tsx \
        src/app/\(app\)/scadenzario/loading.tsx \
        src/app/\(app\)/tecnici/loading.tsx
git commit -m "feat(loading): skeleton screens per 11 route senza loading state"
```

---

## Task 7: Branded `not-found.tsx` 404

**Files:**
- Create: `src/app/not-found.tsx`

**Contesto:** Next.js mostra la sua schermata generica per ogni URL non trovato. `src/app/not-found.tsx` (livello root) intercetta tutti i 404 nell'intera app. Il design segue esattamente il pattern di `src/app/(app)/error.tsx` già approvato: sfondo `var(--bg)`, pietra haptimorphica, bottone rosso pill 52px, link ghost per tornare alla dashboard. Il numero "404" usa Playfair Display (The Number Rule dal DESIGN.md).

- [ ] **Step 1: Crea `src/app/not-found.tsx`**

```tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--bg, #DDD8D3)',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      {/* Numero 404 — Playfair per The Number Rule */}
      <p
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '96px',
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: 'var(--t1, #1C1916)',
          margin: 0,
          opacity: 0.12,
        }}
        aria-hidden="true"
      >
        404
      </p>

      <div style={{ marginTop: '-64px' }}>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--t1, #1C1916)',
            margin: '0 0 8px',
          }}
        >
          Pagina non trovata
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: 'var(--t2, #96918D)',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: '280px',
          }}
        >
          L&apos;indirizzo che hai cercato non esiste o è stato spostato.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '280px',
          marginTop: '8px',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            height: '52px',
            borderRadius: '32px',
            background: 'var(--primary, #D90012)',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,.20), 9px 13px 22px -4px rgba(148,128,118,.44)',
          }}
        >
          Torna alla dashboard
        </Link>
        <Link
          href="javascript:history.back()"
          style={{
            height: '52px',
            borderRadius: '32px',
            background: 'var(--elv, #EDEDEA)',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,.88), 9px 12px 22px -4px rgba(148,128,118,.40)',
          }}
        >
          Torna indietro
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verifica TypeScript**
```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 3: Commit**
```bash
git add src/app/not-found.tsx
git commit -m "feat(404): branded not-found page con design haptimorphic"
```

---

## Commit finale e push

- [ ] **Verifica tutto il build**
```bash
cd ua-app && npm run build
```
Expected: Build completato senza errori TypeScript o lint.

- [ ] **Push e verifica CI**
```bash
git push origin main
```
Attendi che la pipeline GitHub Actions completi (TypeScript → ESLint → build → deploy Vercel).

---

## Self-Review

**Spec coverage:**
- ✅ A1 transition:all → Task 1
- ✅ A3 animate height → Task 2
- ✅ D touch targets → Task 1 + Task 3
- ✅ E useEffect cleanup → Task 4
- ✅ C2 skip link → Task 5
- ✅ B loading.tsx × 11 → Task 6
- ✅ C1 not-found.tsx → Task 7

**Esclusioni deliberate:**
- `ui/badge.tsx` e `ui/button.tsx` con `transition-all`: sono file shadcn auto-generati. Modificarli crea debt di manutenzione (si sovrascrivono ad ogni regen). Lasciarli invariati.
- `NominaPrrcTemplate.tsx` borderLeft: è in un PDF template (react-pdf), non in UI web. La design policy non si applica.
- `error.tsx`, `admin-nav.tsx`, `SwRegistration.tsx`: i "2 useEffect" del grep includono la riga di import — 1 solo useEffect reale, nessuno dei quali richiede cleanup.
