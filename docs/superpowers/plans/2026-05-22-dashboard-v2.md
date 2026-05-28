# Dashboard V2 Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ridisegnare la dashboard UÀ con layout Spotlight (Config 1), KPI cliccabili come filtri, separazione Gestione/Produzione, supporto ruolo ibrido Titolare+Tecnico, dark mode carbonio corretto, nav pill personalizzabile.

**Architecture:** DashboardShell gestisce routing per ruolo e il role-tab per utenti ibridi. Ogni vista (Titolare, Tecnico, Hybrid, FrontDesk) è un componente separato. Tre atom components (SpotlightCard, KpiCard, TaskItem) sono condivisi tra viste. Le query calcolano completamento_perc reale da lavori_fasi.eseguita_at.

**Tech Stack:** Next.js 16 App Router (Server + Client Components), Supabase JS, Vitest, Motion 12.x (token da src/design-system/motion.ts), DM Sans + Playfair Display.

**Spec:** `docs/superpowers/specs/2026-05-22-dashboard-v2-redesign.md`

---

## File Map

```
NUOVI:
src/components/features/dashboard/
  SpotlightCard.tsx           ← card hero urgenza (atom)
  KpiCard.tsx                 ← KPI cliccabile filtro (atom)
  TaskItem.tsx                ← voce task con progress reale (atom)
  DashboardShell.tsx          ← wrapper role-routing + tabs
  DashboardHybrid.tsx         ← vista ibrida Titolare+Tecnico

supabase/migrations/
  20260522120000_dashboard_v2.sql  ← index + nav_preferences

MODIFICATI:
src/app/(app)/dashboard/page.tsx           ← routing isTecnico
src/components/features/dashboard/
  DashboardTitolare.tsx       ← rewrite: solo Gestione
  DashboardTecnico.tsx        ← rewrite: Produzione + progress reale
  DashboardFrontDesk.tsx      ← align DS v2.2
  LavoroUrgente.tsx           ← già fixato in V1.8.2, aggiornare se necessario
src/components/layout/
  BottomNavPill.tsx           ← tooltip + drag&drop + pin
src/lib/dashboard/
  queries.ts                  ← getLavoriTecnicoOggi + completamento_perc
src/app/globals.css           ← dark mode divider var(--border)
```

---

## Task 1: DB Migration — Index + nav_preferences

**Files:**
- Create: `supabase/migrations/20260522120000_dashboard_v2.sql`

- [ ] **Step 1: Crea il file di migration**

```sql
-- supabase/migrations/20260522120000_dashboard_v2.sql

-- Index per query dashboard tecnico (dato reale, non hardcoded)
CREATE INDEX IF NOT EXISTS idx_lavori_tecnico_stato_data
  ON lavori(tecnico_id, stato, data_consegna_prevista)
  WHERE deleted_at IS NULL;

-- Index per calcolo completamento_perc da lavori_fasi
CREATE INDEX IF NOT EXISTS idx_lavori_fasi_lavoro_eseguita
  ON lavori_fasi(lavoro_id)
  WHERE eseguita_at IS NOT NULL;

-- Preferenze navigazione per utente (drag&drop, pin)
ALTER TABLE utenti
  ADD COLUMN IF NOT EXISTS nav_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN utenti.nav_preferences IS
  'Nav pill preferences: {"tabs":["dashboard","lavori",null,"clienti","altro"],"pinned":["tecnici"]}';
```

- [ ] **Step 2: Applica migration via Supabase MCP**

Usa `mcp__plugin_supabase_supabase__apply_migration` con il contenuto SQL sopra, oppure:
```bash
npx supabase db push
```
Expected: migration applicata senza errori.

- [ ] **Step 3: Rigenera types Supabase**

```bash
cd ua-app
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq \
  > src/types/database.types.ts
# Rimuovi eventuale messaggio CLI in fondo al file se presente
npx tsc --noEmit
```
Expected: 0 errori TypeScript.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260522120000_dashboard_v2.sql src/types/database.types.ts
git commit -m "feat(db): index dashboard query + nav_preferences column"
```

---

## Task 2: Query getLavoriTecnicoOggi con completamento reale

**Files:**
- Modify: `src/lib/dashboard/queries.ts`
- Test: `src/lib/dashboard/__tests__/getLavoriTecnicoOggi.test.ts`

- [ ] **Step 1: Scrivi il test (RED)**

Crea `src/lib/dashboard/__tests__/getLavoriTecnicoOggi.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getLavoriTecnicoOggi } from '../queries'

// Mock Supabase client
const makeSvc = (data: unknown) => ({
  from: () => ({
    select: () => ({
      eq: () => ({ eq: () => ({
        not: () => ({
          order: () => ({
            limit: () => ({ data, error: null })
          })
        })
      }) })
    })
  })
}) as unknown as import('@supabase/supabase-js').SupabaseClient

describe('getLavoriTecnicoOggi', () => {
  it('calcola completamento_perc reale da lavori_fasi', async () => {
    const mockData = [{
      id: 'abc',
      numero_lavoro: '2026/001',
      stato: 'in_lavorazione',
      priorita: 'normale',
      descrizione: 'Corona',
      data_consegna_prevista: '2026-05-23',
      ora_consegna: null,
      clienti: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' },
      lavori_fasi: [
        { id: '1', eseguita_at: '2026-05-22T10:00:00Z' },
        { id: '2', eseguita_at: null },
        { id: '3', eseguita_at: null },
        { id: '4', eseguita_at: null },
      ]
    }]
    const result = await getLavoriTecnicoOggi(makeSvc(mockData), 'lab-id', 'tech-id')
    expect(result[0].completamento_perc).toBe(25) // 1/4 = 25%
  })

  it('usa fallback da stato se nessuna fase', async () => {
    const mockData = [{
      id: 'xyz',
      numero_lavoro: '2026/002',
      stato: 'pronto',
      priorita: 'urgente',
      descrizione: 'Protesi',
      data_consegna_prevista: '2026-05-22',
      ora_consegna: '16:00',
      clienti: null,
      lavori_fasi: []
    }]
    const result = await getLavoriTecnicoOggi(makeSvc(mockData), 'lab-id', 'tech-id')
    expect(result[0].completamento_perc).toBe(90) // 'pronto' → 90
  })

  it('cliente_display usa studio_nome se disponibile', async () => {
    const mockData = [{
      id: 'ccc',
      numero_lavoro: '2026/003',
      stato: 'in_lavorazione',
      priorita: 'normale',
      descrizione: 'X',
      data_consegna_prevista: '2026-05-25',
      ora_consegna: null,
      clienti: { nome: 'Luigi', cognome: 'Bianchi', studio_nome: 'Studio Bianchi' },
      lavori_fasi: []
    }]
    const result = await getLavoriTecnicoOggi(makeSvc(mockData), 'lab-id', 'tech-id')
    expect(result[0].cliente_display).toBe('Studio Bianchi')
  })
})
```

- [ ] **Step 2: Esegui test per verificare che fallisce**

```bash
npx vitest run src/lib/dashboard/__tests__/getLavoriTecnicoOggi.test.ts
```
Expected: FAIL — `getLavoriTecnicoOggi` non esiste ancora.

- [ ] **Step 3: Aggiungi tipo + funzione a queries.ts**

Aggiungi alla fine di `src/lib/dashboard/queries.ts` (prima dell'ultima chiusa se presente):

```typescript
// ─── Tipi ───────────────────────────────────────────────────────────────────

export type TaskItemData = {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  cliente_display: string
  completamento_perc: number  // 0-100, calcolato da lavori_fasi.eseguita_at
}

// ─── Helpers privati ────────────────────────────────────────────────────────

function statoToPerc(stato: StatoLavoro): number {
  const map: Partial<Record<StatoLavoro, number>> = {
    ricevuto: 10, in_lavorazione: 40, in_prova: 60,
    in_prova_esterna: 65, pronto: 90, in_ritardo: 35,
    sospeso: 20, consegnato: 100, annullato: 0,
  }
  return map[stato] ?? 0
}

// ─── getLavoriTecnicoOggi ───────────────────────────────────────────────────
// Restituisce i lavori assegnati al tecnico, ordinati per scadenza,
// con completamento_perc calcolato realmente da lavori_fasi.eseguita_at

export async function getLavoriTecnicoOggi(
  svc: SupabaseClient,
  labId: string,
  tecnicoId: string,
  limit = 20
): Promise<TaskItemData[]> {
  const { data } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, stato, priorita,
      descrizione, data_consegna_prevista, ora_consegna,
      clienti(nome, cognome, studio_nome),
      lavori_fasi(id, eseguita_at)
    `)
    .eq('laboratorio_id', labId)
    .eq('tecnico_id', tecnicoId)
    .not('stato', 'in', '("consegnato","annullato")')
    .order('data_consegna_prevista', { ascending: true })
    .limit(limit)

  return ((data ?? []) as unknown as Array<{
    id: string
    numero_lavoro: string
    stato: StatoLavoro
    priorita: PrioritaLavoro
    descrizione: string
    data_consegna_prevista: string
    ora_consegna: string | null
    clienti: { nome: string; cognome: string; studio_nome: string | null } | null
    lavori_fasi: Array<{ id: string; eseguita_at: string | null }>
  }>).map(l => {
    const fasi = l.lavori_fasi ?? []
    const completamento = fasi.length > 0
      ? Math.round(fasi.filter(f => f.eseguita_at !== null).length / fasi.length * 100)
      : statoToPerc(l.stato)
    const c = l.clienti
    const cliente_display = c?.studio_nome ?? (c ? `${c.nome} ${c.cognome}` : '—')
    return {
      id: l.id,
      numero_lavoro: l.numero_lavoro,
      stato: l.stato,
      priorita: l.priorita,
      descrizione: l.descrizione,
      data_consegna_prevista: l.data_consegna_prevista,
      ora_consegna: l.ora_consegna,
      cliente_display,
      completamento_perc: completamento,
    }
  })
}
```

- [ ] **Step 4: Esegui test per verificare che passa**

```bash
npx vitest run src/lib/dashboard/__tests__/getLavoriTecnicoOggi.test.ts
```
Expected: 3 PASS.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/lib/dashboard/__tests__/getLavoriTecnicoOggi.test.ts src/lib/dashboard/queries.ts
git commit -m "feat(dashboard): getLavoriTecnicoOggi con completamento_perc reale da lavori_fasi"
```

---

## Task 3: SpotlightCard — card hero urgenza

**Files:**
- Create: `src/components/features/dashboard/SpotlightCard.tsx`
- Test: `src/components/features/dashboard/__tests__/SpotlightCard.test.tsx`

- [ ] **Step 1: Scrivi il test (RED)**

Crea `src/components/features/dashboard/__tests__/SpotlightCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SpotlightCard } from '../SpotlightCard'

describe('SpotlightCard', () => {
  const props = {
    lavoro_id: 'abc123',
    numero_lavoro: '2026/0002',
    cliente_display: 'ESPOSITO MASSIMO',
    descrizione_problema: 'Impronta non idonea',
    data_consegna_prevista: '2026-05-22',
    ora_consegna: '17:00',
    tipo: 'blocco' as const,
    timestamp_segnalazione: '2026-05-22T14:00:00Z',
  }

  it('mostra il titolo del problema', () => {
    render(<SpotlightCard {...props} />)
    expect(screen.getByText('Impronta non idonea')).toBeTruthy()
  })

  it('mostra il cliente', () => {
    render(<SpotlightCard {...props} />)
    expect(screen.getByText(/ESPOSITO MASSIMO/)).toBeTruthy()
  })

  it('CTA è un link al lavoro', () => {
    render(<SpotlightCard {...props} />)
    const link = screen.getByRole('link', { name: /risolvi/i })
    expect(link.getAttribute('href')).toBe('/lavori/abc123')
  })

  it('non renderizza se tipo è assente', () => {
    const { container } = render(<SpotlightCard {...props} tipo={null as never} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Esegui test per verificare che fallisce**

```bash
npx vitest run src/components/features/dashboard/__tests__/SpotlightCard.test.tsx
```
Expected: FAIL — componente non esiste.

- [ ] **Step 3: Crea SpotlightCard.tsx**

```typescript
// src/components/features/dashboard/SpotlightCard.tsx
'use client'

import Link from 'next/link'
import { t } from '@/design-system/motion'
import { motion } from 'motion/react'

// DS v2.2 — tutti via CSS variables
const DS = {
  sfc:     'var(--sfc, #E4DFD9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
  primary: 'var(--primary, #D90012)',
  shC: `inset 0 1px 0 rgba(255,255,255,.88), inset 0 -1px 2px rgba(0,0,0,.04),
        -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40),
        3px 5px 10px -2px rgba(148,128,118,.22)`,
  shRed: `inset 0 1px 0 rgba(255,255,255,.25), inset 0 -2px 3px rgba(0,0,0,.22),
          0 6px 18px -2px rgba(180,0,0,.40), 0 2px 6px rgba(180,0,0,.26)`,
} as const

export interface SpotlightCardProps {
  lavoro_id: string
  numero_lavoro: string
  cliente_display: string
  descrizione_problema: string
  data_consegna_prevista: string
  ora_consegna: string | null
  tipo: 'blocco' | 'ritardo' | 'urgente'
  timestamp_segnalazione: string | null
}

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return ''
  const diffMs = Date.now() - new Date(isoStr).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'adesso'
  if (diffMin < 60) return `${diffMin} min fa`
  return `${Math.floor(diffMin / 60)}h fa`
}

function formatOra(isoDate: string, ora: string | null): string {
  if (ora) return `oggi ore ${ora}`
  const d = new Date(isoDate + 'T00:00:00')
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - oggi.getTime()) / 86_400_000)
  if (diff === 0) return 'consegna oggi'
  if (diff === 1) return 'consegna domani'
  return `consegna ${d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}`
}

export function SpotlightCard({
  lavoro_id,
  numero_lavoro,
  cliente_display,
  descrizione_problema,
  data_consegna_prevista,
  ora_consegna,
  tipo,
  timestamp_segnalazione,
}: SpotlightCardProps) {
  if (!tipo) return null

  const eyebrowLabel =
    tipo === 'blocco' ? 'Blocco attivo' :
    tipo === 'ritardo' ? 'In ritardo' :
    'Urgente'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={t('normal', 'enter')}
      style={{
        margin: '0 14px 12px',
        background: DS.sfc,
        borderRadius: '20px',
        padding: '16px 18px',
        boxShadow: DS.shC,
      }}
    >
      {/* Eyebrow */}
      <div style={{
        fontSize: '9.5px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: DS.primary,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '5px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <span
          aria-hidden="true"
          style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: DS.primary,
            animation: 'ua-pulse 2.5s infinite',
          }}
        />
        {eyebrowLabel}
      </div>

      {/* Titolo */}
      <p style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: '17px',
        fontWeight: 400,
        color: DS.t1,
        letterSpacing: '-0.01em',
        lineHeight: 1.25,
        margin: '0 0 3px',
      }}>
        {descrizione_problema}
      </p>

      {/* Meta */}
      <p style={{
        fontSize: '11px',
        color: DS.t2,
        lineHeight: 1.4,
        margin: 0,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {cliente_display} · #{numero_lavoro}<br />
        <strong style={{ color: DS.primary }}>
          {formatOra(data_consegna_prevista, ora_consegna)}
        </strong>
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '12px',
      }}>
        <Link
          href={`/lavori/${lavoro_id}`}
          aria-label={`Risolvi blocco su lavoro ${numero_lavoro}`}
          style={{
            background: DS.primary,
            color: '#fff',
            borderRadius: '100px',
            padding: '8px 18px',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
            textDecoration: 'none',
            boxShadow: DS.shRed,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Risolvi subito →
        </Link>
        {timestamp_segnalazione && (
          <span style={{ fontSize: '9px', color: DS.t3, fontFamily: 'DM Sans, sans-serif' }}>
            {formatRelativeTime(timestamp_segnalazione)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 4: Esegui test per verificare che passa**

```bash
npx vitest run src/components/features/dashboard/__tests__/SpotlightCard.test.tsx
```
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/dashboard/SpotlightCard.tsx \
        src/components/features/dashboard/__tests__/SpotlightCard.test.tsx
git commit -m "feat(dashboard): SpotlightCard — card hero urgenza con DS v2.2"
```

---

## Task 4: KpiCard — KPI cliccabile come filtro

**Files:**
- Create: `src/components/features/dashboard/KpiCard.tsx`
- Test: `src/components/features/dashboard/__tests__/KpiCard.test.tsx`

- [ ] **Step 1: Scrivi il test (RED)**

```typescript
// src/components/features/dashboard/__tests__/KpiCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KpiCard } from '../KpiCard'

describe('KpiCard', () => {
  it('mostra il numero con Playfair Display', () => {
    const { container } = render(
      <KpiCard valore={3} label="Da consegnare" azione="oggi →" colore="blue"
               href="/lavori?filter=consegne-oggi" />
    )
    expect(screen.getByText('3')).toBeTruthy()
    const numEl = container.querySelector('[style*="Playfair"]') as HTMLElement
    expect(numEl).toBeTruthy()
  })

  it('è un link con href corretto', () => {
    render(
      <KpiCard valore={5} label="Da fatturare" azione="fattura →" colore="gold"
               href="/fatture" />
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/fatture')
  })

  it('se valore=0 non è cliccabile e non mostra azione', () => {
    render(
      <KpiCard valore={0} label="In ritardo" azione="vedi →" colore="red"
               href="/lavori?stato=in_ritardo" />
    )
    // Non deve esserci un link se valore=0
    const links = screen.queryAllByRole('link')
    expect(links.length).toBe(0)
    // L'azione non viene mostrata
    expect(screen.queryByText('vedi →')).toBeNull()
  })

  it('mostra il chevron quando cliccabile', () => {
    const { container } = render(
      <KpiCard valore={2} label="Blocchi" azione="risolvi →" colore="red"
               href="/lavori?filter=blocchi" />
    )
    expect(container.textContent).toContain('›')
  })
})
```

- [ ] **Step 2: Esegui test per verificare che fallisce**

```bash
npx vitest run src/components/features/dashboard/__tests__/KpiCard.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Crea KpiCard.tsx**

```typescript
// src/components/features/dashboard/KpiCard.tsx
'use client'

import Link from 'next/link'

type KpiColor = 'red' | 'blue' | 'gold' | 'green' | 'grey'

const COLOR_MAP: Record<KpiColor, string> = {
  red:   'var(--primary, #D90012)',
  blue:  'var(--info, #5A5FCC)',
  gold:  'var(--gold, #D4A843)',
  green: 'var(--success, #3DCB5C)',
  grey:  'var(--t2, #96918D)',
}

const DS = {
  sfc:  'var(--sfc, #E4DFD9)',
  t2:   'var(--t2, #96918D)',
  t3:   'var(--t3, #B8B3AE)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
  shI: `inset 4px 4px 9px rgba(148,128,118,.32), inset -3px -3px 7px rgba(255,255,255,.66)`,
} as const

export interface KpiCardProps {
  valore: number
  label: string
  azione: string
  colore: KpiColor
  href: string
}

export function KpiCard({ valore, label, azione, colore, href }: KpiCardProps) {
  const isZero = valore === 0
  const numColor = isZero ? DS.t2 : COLOR_MAP[colore]

  const cardStyle: React.CSSProperties = {
    background: DS.sfc,
    borderRadius: '16px',
    padding: '12px 13px',
    boxShadow: DS.shB,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'transform .12s cubic-bezier(.2,0,0,1), box-shadow .12s cubic-bezier(.2,0,0,1)',
    cursor: isZero ? 'default' : 'pointer',
    pointerEvents: isZero ? 'none' : 'auto',
    textDecoration: 'none',
  }

  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '38px',
            fontWeight: 300,
            lineHeight: 1,
            color: numColor,
          }}
        >
          {valore}
        </span>
        {!isZero && (
          <span style={{ fontSize: '12px', color: DS.t3, marginTop: '4px' }}>›</span>
        )}
      </div>
      <span style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        fontWeight: 600,
        color: DS.t2,
        marginTop: '2px',
        lineHeight: 1.3,
      }}>
        {label}
      </span>
      {!isZero && (
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '9.5px',
          color: DS.t3,
          marginTop: '3px',
        }}>
          {azione}
        </span>
      )}
    </>
  )

  if (isZero) {
    return (
      <div style={cardStyle} aria-label={`${valore} ${label}`}>
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={href}
      style={cardStyle}
      aria-label={`${valore} ${label} — ${azione}`}
    >
      {inner}
    </Link>
  )
}
```

- [ ] **Step 4: Esegui test per verificare che passa**

```bash
npx vitest run src/components/features/dashboard/__tests__/KpiCard.test.tsx
```
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/dashboard/KpiCard.tsx \
        src/components/features/dashboard/__tests__/KpiCard.test.tsx
git commit -m "feat(dashboard): KpiCard — numero Playfair, cliccabile come filtro, zero non attivo"
```

---

## Task 5: TaskItem — voce task con progress bar reale

**Files:**
- Create: `src/components/features/dashboard/TaskItem.tsx`
- Test: `src/components/features/dashboard/__tests__/TaskItem.test.tsx`

- [ ] **Step 1: Scrivi il test (RED)**

```typescript
// src/components/features/dashboard/__tests__/TaskItem.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TaskItem } from '../TaskItem'

const baseProps = {
  rank: 1,
  id: 'lavoro-abc',
  numero_lavoro: '2026/001',
  cliente_display: 'Studio Rossi',
  stato_fase_attuale: 'Finitura',
  completamento_perc: 78,
  data_consegna_prevista: '2026-05-22',
  ora_consegna: '18:30',
  colore_fase: 'gold' as const,
}

describe('TaskItem', () => {
  it('mostra cliente e numero lavoro', () => {
    render(<TaskItem {...baseProps} />)
    expect(screen.getByText('Studio Rossi')).toBeTruthy()
  })

  it('è un link al dettaglio lavoro', () => {
    render(<TaskItem {...baseProps} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/lavori/lavoro-abc')
  })

  it('mostra l\'ora di consegna', () => {
    render(<TaskItem {...baseProps} />)
    expect(screen.getByText('18:30')).toBeTruthy()
  })

  it('progress bar ha larghezza proporzionale al completamento', () => {
    const { container } = render(<TaskItem {...baseProps} />)
    const fill = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(fill?.style.width).toBe('78%')
  })
})
```

- [ ] **Step 2: Esegui test per verificare che fallisce**

```bash
npx vitest run src/components/features/dashboard/__tests__/TaskItem.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Crea TaskItem.tsx**

```typescript
// src/components/features/dashboard/TaskItem.tsx
'use client'

import Link from 'next/link'

type FaseColor = 'gold' | 'green' | 'blue' | 'red' | 'grey'

const COLOR_MAP: Record<FaseColor, string> = {
  gold:  'var(--gold, #D4A843)',
  green: 'var(--success, #3DCB5C)',
  blue:  'var(--info, #5A5FCC)',
  red:   'var(--primary, #D90012)',
  grey:  'var(--t2, #96918D)',
}

const DS = {
  sfc:  'var(--sfc, #E4DFD9)',
  prs:  'var(--prs, #D4CFC9)',
  t1:   'var(--t1, #1C1916)',
  t2:   'var(--t2, #96918D)',
  t3:   'var(--t3, #B8B3AE)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
} as const

function faseEmoji(fase: string | null, colore: FaseColor): string {
  if (!fase) return '·'
  if (colore === 'green') return '🟢'
  if (colore === 'gold') return '🟡'
  if (colore === 'red') return '🔴'
  return '🔵'
}

export interface TaskItemProps {
  rank: number
  id: string
  numero_lavoro: string
  cliente_display: string
  stato_fase_attuale: string | null
  completamento_perc: number
  data_consegna_prevista: string
  ora_consegna: string | null
  colore_fase: FaseColor
}

export function TaskItem({
  rank,
  id,
  numero_lavoro,
  cliente_display,
  stato_fase_attuale,
  completamento_perc,
  data_consegna_prevista,
  ora_consegna,
  colore_fase,
}: TaskItemProps) {
  const displayTime = ora_consegna ?? (() => {
    const d = new Date(data_consegna_prevista + 'T00:00:00')
    const oggi = new Date(); oggi.setHours(0,0,0,0)
    const diff = Math.round((d.getTime() - oggi.getTime()) / 86_400_000)
    if (diff === 0) return 'oggi'
    if (diff === 1) return 'dom'
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  })()

  return (
    <Link
      href={`/lavori/${id}`}
      aria-label={`Lavoro ${numero_lavoro} — ${cliente_display} — ${completamento_perc}% completato`}
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        background: DS.sfc,
        borderRadius: '13px',
        padding: '10px 12px',
        boxShadow: DS.shB,
        textDecoration: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform .12s cubic-bezier(.2,0,0,1)',
      }}
    >
      {/* Rank */}
      <span style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: '13px',
        fontWeight: 300,
        color: DS.t3,
        width: '16px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {rank}
      </span>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          color: DS.t1,
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}>
          {cliente_display}
        </p>
        {stato_fase_attuale && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px',
            color: DS.t2,
            margin: '2px 0 0',
          }}>
            {faseEmoji(stato_fase_attuale, colore_fase)} {stato_fase_attuale}
          </p>
        )}
        {/* Progress bar */}
        <div
          style={{
            height: '3px',
            background: DS.prs,
            borderRadius: '2px',
            marginTop: '5px',
            overflow: 'hidden',
          }}
        >
          <div
            role="progressbar"
            aria-valuenow={completamento_perc}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '100%',
              width: `${completamento_perc}%`,
              borderRadius: '2px',
              background: COLOR_MAP[colore_fase],
              transition: 'width .4s cubic-bezier(.2,0,0,1)',
            }}
          />
        </div>
      </div>

      {/* Time */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 700,
          color: DS.t1,
          margin: 0,
          lineHeight: 1.2,
        }}>
          {displayTime}
        </p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Esegui test per verificare che passa**

```bash
npx vitest run src/components/features/dashboard/__tests__/TaskItem.test.tsx
```
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/dashboard/TaskItem.tsx \
        src/components/features/dashboard/__tests__/TaskItem.test.tsx
git commit -m "feat(dashboard): TaskItem — progress bar reale, link lavoro, fase emoji"
```

---

## Task 6: DashboardShell + isTecnico routing in page.tsx

**Files:**
- Create: `src/components/features/dashboard/DashboardShell.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Crea DashboardShell.tsx**

```typescript
// src/components/features/dashboard/DashboardShell.tsx
'use client'

import { useState, useEffect } from 'react'
import { t } from '@/design-system/motion'
import { motion, AnimatePresence } from 'motion/react'

const DS = {
  prs:  'var(--prs, #D4CFC9)',
  elv:  'var(--elv, #EDEDEA)',
  t1:   'var(--t1, #1C1916)',
  t2:   'var(--t2, #96918D)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
  shI: `inset 4px 4px 9px rgba(148,128,118,.32), inset -3px -3px 7px rgba(255,255,255,.66)`,
} as const

type DashView = 'gestione' | 'produzione'

interface DashboardShellProps {
  /** Se null: nessun tab (vista singola) */
  defaultView?: DashView
  renderGestione: React.ReactNode
  renderProduzione: React.ReactNode
  /** Se false: mostra solo renderGestione senza tab */
  showTabs?: boolean
}

export function DashboardShell({
  defaultView = 'produzione',
  renderGestione,
  renderProduzione,
  showTabs = true,
}: DashboardShellProps) {
  const [view, setView] = useState<DashView>(() => {
    if (typeof window === 'undefined') return defaultView
    return (localStorage.getItem('ua-dashboard-view') as DashView) ?? defaultView
  })

  // Persiste la view scelta
  useEffect(() => {
    localStorage.setItem('ua-dashboard-view', view)
  }, [view])

  if (!showTabs) {
    return <>{renderGestione}</>
  }

  return (
    <>
      {/* Role tabs */}
      <div
        role="tablist"
        aria-label="Vista dashboard"
        style={{
          margin: '0 14px 12px',
          background: DS.prs,
          borderRadius: '15px',
          padding: '3px',
          display: 'flex',
          boxShadow: DS.shI,
        }}
      >
        {(['gestione', 'produzione'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            aria-controls={`panel-${v}`}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              padding: '7px 5px',
              borderRadius: '12px',
              fontSize: '10.5px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              textAlign: 'center',
              color: view === v ? DS.t1 : DS.t2,
              background: view === v ? DS.elv : 'transparent',
              boxShadow: view === v ? DS.shB : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all .15s cubic-bezier(.2,0,0,1)',
              WebkitTapHighlightColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            {v === 'gestione' ? '📊 Gestione' : '🔧 Produzione'}
            <small style={{ display: 'block', fontSize: '8px', opacity: .5, fontWeight: 400, marginTop: '1px' }}>
              {v === 'gestione' ? 'business' : 'i miei lavori'}
            </small>
          </button>
        ))}
      </div>

      {/* Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          id={`panel-${view}`}
          role="tabpanel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={t('fast', 'enter')}
        >
          {view === 'gestione' ? renderGestione : renderProduzione}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 2: Aggiorna dashboard/page.tsx — rilevamento isTecnico**

Modifica `src/app/(app)/dashboard/page.tsx`. Trova il blocco subito dopo il recupero di `utente` (circa riga 84) e inserisci:

```typescript
// Dopo: const { ruolo, laboratorio_id: labId } = utente
// Aggiungi prima del blocco if (ruolo === 'titolare') :

const isTitolare = ruolo === 'titolare' || ruolo === 'admin_rete'

// Controlla se il titolare è anche registrato come tecnico
let tecnicoIdPerTitolare: string | null = null
if (isTitolare) {
  const { data: tecnicoRow } = await svc
    .from('tecnici')
    .select('id')
    .eq('utente_id', user.id)
    .eq('laboratorio_id', labId)
    .eq('attivo', true)
    .maybeSingle()
  tecnicoIdPerTitolare = tecnicoRow?.id ?? null
}

const isHybrid = isTitolare && !!tecnicoIdPerTitolare
```

Poi nel blocco `if (ruolo === 'titolare' || ruolo === 'admin_rete')`, passa `isHybrid` e `tecnicoIdPerTitolare` al componente dashboard.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/dashboard/DashboardShell.tsx \
        src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(dashboard): DashboardShell role-tabs + isTecnico routing"
```

---

## Task 7: Rewrite DashboardTitolare (vista Gestione)

**Files:**
- Modify: `src/components/features/dashboard/DashboardTitolare.tsx`

Questo è un rewrite completo. Il file esistente viene sostituito interamente. Mantieni le props dello stesso tipo per non rompere i caller in page.tsx.

- [ ] **Step 1: Leggi il componente esistente per capire le props attuali**

```bash
head -80 src/components/features/dashboard/DashboardTitolare.tsx
```
Nota le props usate da `page.tsx` per passare i dati. Mantieni la stessa interfaccia esterna.

- [ ] **Step 2: Riscrivi DashboardTitolare.tsx**

Il componente ora renderizza SOLO la vista "Gestione" (business KPI, fatturato, urgenze). Il layout Spotlight + task list per il ruolo ibrido è in `DashboardHybrid`.

Il componente deve:
1. Mostrare SpotlightCard se c'è una segnalazione aperta
2. Mostrare KpiGrid 2×2 (consegne oggi, in ritardo, da fatturare, materiali)
3. Mostrare mini-chart fatturato mensile (bar chart semplice SVG)
4. Mostrare sezione "Urgenze lab" (top 3 pagamenti scaduti)
5. Usare SOLO `var(--bg)`, `var(--sfc)`, `var(--sh-b)` etc. — nessun colore hardcoded

Principi DS obbligatori nel rewrite:
- KPI numeri: `fontFamily: 'Playfair Display, Georgia, serif'`, `fontSize: '38px'`, `fontWeight: 300`
- Sezione label: `fontFamily: 'DM Sans, sans-serif'`, `fontSize: '10px'`, `fontWeight: 700`, `textTransform: 'uppercase'`, `color: 'var(--t3)'`
- Cards: `background: 'var(--sfc)'`, `borderRadius: '16px'`, `boxShadow: 'var(--sh-b)'`
- MAI `rgba(0,0,0,.06)` come border — divide usa `borderBottom: '1px solid var(--border, rgba(0,0,0,.06))'`
- Separatori tra righe lista: `borderBottom: '1px solid var(--border, rgba(0,0,0,.06))'` → in dark mode `--border` è `rgba(255,255,255,.06)` automaticamente

- [ ] **Step 3: Verifica visiva con Playwright**

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto("http://localhost:3001/login", wait_until="domcontentloaded")
    time.sleep(2)
    page.fill('input[type="email"]', process.env.TEST_EMAIL!)
    page.fill('input[type="password"]', process.env.TEST_PASSWORD!)
    page.click('button[type="submit"]')
    page.wait_for_url(lambda u: "dashboard" in u, timeout=15000)
    time.sleep(2)
    page.screenshot(path="/tmp/dash_gestione_light.png", full_page=False)
    print("Screenshot: /tmp/dash_gestione_light.png")
    browser.close()
EOF
```

Apri `/tmp/dash_gestione_light.png` e verifica: background warm panna, KPI grandi, nessun colore hardcoded.

- [ ] **Step 4: TypeScript check + vitest**

```bash
npx tsc --noEmit && npx vitest run
```
Expected: 0 errori, tutti i test passano.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/dashboard/DashboardTitolare.tsx
git commit -m "refactor(dashboard): rewrite DashboardTitolare — Gestione view DS v2.2"
```

---

## Task 8: Rewrite DashboardTecnico (vista Produzione)

**Files:**
- Modify: `src/components/features/dashboard/DashboardTecnico.tsx`

- [ ] **Step 1: Identifica dati tecnico da query**

La query `getTecnicoDashboard` in `queries.ts` non usa ancora `getLavoriTecnicoOggi`. Aggiorna `dashboard/page.tsx` (blocco tecnico) per usare la nuova funzione:

```typescript
// In page.tsx, blocco if (ruolo === 'tecnico'):
// Trova tecnicoId dall'utente
const { data: tecnicoRow } = await svc
  .from('tecnici')
  .select('id')
  .eq('utente_id', user.id)
  .eq('laboratorio_id', labId)
  .maybeSingle()

if (!tecnicoRow) redirect('/login?error=no_lab')

const [lavoriOggi, tecnicoDash] = await Promise.all([
  getLavoriTecnicoOggi(svc, labId, tecnicoRow.id),
  getTecnicoDashboard(svc, labId, tecnicoRow.id),
])
```

- [ ] **Step 2: Riscrivi DashboardTecnico.tsx usando TaskItem**

Il componente renderizza:
1. Header greeting (con sync badge)
2. SpotlightCard se c'è un blocco assegnato a questo tecnico
3. KPI row compatta: urgenti, oggi, puntualità (ora placeholder "—" se non disponibile — NO hardcoded 84%)
4. Section "I miei lavori" con `<TaskItem>` per ogni lavoro
5. Empty state se nessun lavoro

```typescript
// Sostituire puntualità hardcoded (riga ~282 del vecchio file):
// PRIMA: { value: 84, label: 'Puntualità %' }
// DOPO:  { value: tecnicoDash.puntualita_perc ?? null, label: 'Puntualità %' }
// Se null → mostra "—" invece del numero
```

- [ ] **Step 3: TypeScript + vitest**

```bash
npx tsc --noEmit && npx vitest run
```
Expected: 0 errori, tutti i test passano.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/dashboard/DashboardTecnico.tsx \
        src/app/\(app\)/dashboard/page.tsx
git commit -m "refactor(dashboard): DashboardTecnico usa TaskItem + progress reale"
```

---

## Task 9: DashboardHybrid — vista ibrida Titolare+Tecnico

**Files:**
- Create: `src/components/features/dashboard/DashboardHybrid.tsx`

- [ ] **Step 1: Crea DashboardHybrid.tsx**

```typescript
// src/components/features/dashboard/DashboardHybrid.tsx
import { DashboardShell } from './DashboardShell'
import { DashboardTitolare } from './DashboardTitolare'
import { DashboardTecnico } from './DashboardTecnico'
import type { DashboardTitolareProps } from './DashboardTitolare'
import type { DashboardTecnicoProps } from './DashboardTecnico'

interface DashboardHybridProps {
  titolareData: DashboardTitolareProps
  tecnicoData: DashboardTecnicoProps
}

export function DashboardHybrid({ titolareData, tecnicoData }: DashboardHybridProps) {
  return (
    <DashboardShell
      showTabs={true}
      defaultView="produzione"
      renderGestione={<DashboardTitolare {...titolareData} />}
      renderProduzione={<DashboardTecnico {...tecnicoData} />}
    />
  )
}
```

- [ ] **Step 2: Aggiorna page.tsx per usare DashboardHybrid quando isHybrid**

Nel blocco `if (isTitolare)` di `page.tsx`, dopo i `Promise.all`:

```typescript
if (isHybrid && tecnicoIdPerTitolare) {
  const lavoriTecnico = await getLavoriTecnicoOggi(svc, labId, tecnicoIdPerTitolare)
  return (
    <DashboardHybrid
      titolareData={{ stats, consegneOggi, lavoriInRitardo, /* ... */ }}
      tecnicoData={{ lavoriOggi: lavoriTecnico, /* ... */ }}
    />
  )
}
// Altrimenti continua con DashboardTitolare normale
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/components/features/dashboard/DashboardHybrid.tsx \
        src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(dashboard): DashboardHybrid per ruolo Titolare+Tecnico"
```

---

## Task 10: BottomNavPill — Tooltip + Drag&Drop + Pin

**Files:**
- Modify: `src/components/layout/BottomNavPill.tsx`

- [ ] **Step 1: Aggiungi tooltip permanente sul FAB (+)**

Nella sezione del CTA button (cerca `isCta` nella render function), aggiungi il tooltip:

```tsx
{tab.isCta && (
  <motion.div key={tab.href} /* ... existing ... */ >
    <Link href={tab.href} /* ... existing style ... */ >
      {tab.icon}
      {/* Tooltip permanente — sempre visibile su mobile come hint */}
      <span
        role="tooltip"
        style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          background: 'var(--t1, #1C1916)',
          color: 'var(--elv, #EDEDEA)',
          fontSize: '9.5px',
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: '7px',
          whiteSpace: 'nowrap',
          fontFamily: 'DM Sans, sans-serif',
          pointerEvents: 'none',
        }}
      >
        Nuovo lavoro
        <span style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '4px solid var(--t1, #1C1916)',
        }} />
      </span>
    </Link>
  </motion.div>
)}
```

- [ ] **Step 2: Aggiungi stato editMode e long-press handler**

All'inizio del componente `BottomNavPill`, aggiungi:

```typescript
const [editMode, setEditMode] = useState(false)
const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

function handleNavPressStart() {
  longPressTimer.current = setTimeout(() => setEditMode(true), 500)
}

function handleNavPressEnd() {
  if (longPressTimer.current) clearTimeout(longPressTimer.current)
}
```

Sul wrapper `<nav>` principale, aggiungi:
```tsx
onMouseDown={handleNavPressStart}
onMouseUp={handleNavPressEnd}
onTouchStart={handleNavPressStart}
onTouchEnd={handleNavPressEnd}
```

In edit mode, mostra outline tratteggiata sulla pill:
```typescript
const pillStyle: React.CSSProperties = {
  /* ... existing styles ... */
  outline: editMode ? '2px dashed rgba(217,0,18,.30)' : 'none',
  outlineOffset: editMode ? '3px' : '0',
}
```

- [ ] **Step 3: Aggiungi logica pin — persistenza localStorage**

```typescript
const STORAGE_KEY = 'ua-nav-preferences'

function loadNavPrefs(): { pinned: string[] } {
  if (typeof window === 'undefined') return { pinned: [] }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch { return { pinned: [] } }
}

const [navPrefs, setNavPrefs] = useState(loadNavPrefs)

function togglePin(href: string) {
  setNavPrefs(prev => {
    const pinned = prev.pinned.includes(href)
      ? prev.pinned.filter(h => h !== href)
      : [...prev.pinned, href]
    const next = { ...prev, pinned }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    return next
  })
}
```

Mostra badge 📌 sui tab pinnati:
```tsx
{navPrefs.pinned.includes(tab.href) && (
  <span style={{ position: 'absolute', top: 0, right: 0, fontSize: '7px' }}>📌</span>
)}
```

- [ ] **Step 4: Hint drag sotto la nav (in edit mode)**

```tsx
{editMode && (
  <div style={{
    textAlign: 'center',
    fontSize: '9px',
    color: 'var(--t3, #B8B3AE)',
    fontFamily: 'DM Sans, sans-serif',
    marginTop: '4px',
    paddingBottom: '4px',
  }}>
    Tieni premuto per spostare · Tocca per pin · Tocca fuori per chiudere
  </div>
)}
```

Chiudi editMode su click fuori:
```typescript
useEffect(() => {
  if (!editMode) return
  const close = () => setEditMode(false)
  document.addEventListener('click', close, { once: true })
  return () => document.removeEventListener('click', close)
}, [editMode])
```

- [ ] **Step 5: TypeScript + vitest**

```bash
npx tsc --noEmit && npx vitest run
```
Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/BottomNavPill.tsx
git commit -m "feat(nav): tooltip Nuovo lavoro + editMode long-press + pin persistence"
```

---

## Task 11: Dark Mode Global Fix — divider var(--border)

**Files:**
- Modify: `src/app/globals.css`
- Grep nei file dashboard per `rgba(0,0,0,.06)` hardcoded come border

- [ ] **Step 1: Aggiungi --border a globals.css**

In `globals.css`, nella sezione `:root { }` (dopo i token UÀ v2.2), aggiungi:

```css
/* Divider — si inverte automaticamente in dark mode */
--border: rgba(0,0,0,.06);
```

In `.dark { }`, aggiungi:

```css
--border: rgba(255,255,255,.06);
```

- [ ] **Step 2: Cerca e sostituisci divider hardcoded**

```bash
grep -rn "rgba(0,0,0,.06)" src/components/features/dashboard/ src/components/layout/
```

Per ogni occorrenza usata come `borderBottom` o `borderTop`, sostituisci con `var(--border, rgba(0,0,0,.06))`.

- [ ] **Step 3: Verifica dark mode con Playwright**

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto("http://localhost:3001/login", wait_until="domcontentloaded")
    time.sleep(2)
    page.fill('input[type="email"]', process.env.TEST_EMAIL!)
    page.fill('input[type="password"]', process.env.TEST_PASSWORD!)
    page.click('button[type="submit"]')
    page.wait_for_url(lambda u: "dashboard" in u, timeout=15000)
    time.sleep(2)
    # Attiva dark mode via JS (simula sistema dark)
    page.evaluate("""
        document.documentElement.classList.add('dark');
        localStorage.setItem('ua-theme', 'dark');
    """)
    time.sleep(0.5)
    page.screenshot(path="/tmp/dash_dark_after.png", full_page=False)
    print("Dark: /tmp/dash_dark_after.png")
    browser.close()
EOF
```

Verifica: sfondo `#1A1916`, testo avorio, nessun border bianco visibile, separatori quasi impercettibili.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css \
        src/components/features/dashboard/ \
        src/components/layout/
git commit -m "fix(dark-mode): divider usa var(--border) invertito — nessun colore hardcoded"
```

---

## Task 12: Sync Badge — sostituisce "LIVE"

**Files:**
- Create: `src/components/layout/SyncBadge.tsx`
- Modify: `src/components/layout/AppHeader.tsx`
- Modify: `src/components/layout/RealtimeProvider.tsx` (se necessario esporre isConnected)

- [ ] **Step 1: Crea SyncBadge.tsx**

```typescript
// src/components/layout/SyncBadge.tsx
'use client'

import { useState, useEffect } from 'react'

export function SyncBadge({ lastUpdatedAt }: { lastUpdatedAt?: Date }) {
  const [label, setLabel] = useState('Aggiornato ora')
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Online/offline detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const update = () => {
      if (!lastUpdatedAt) { setLabel('Aggiornato ora'); return }
      const diffSec = Math.floor((Date.now() - lastUpdatedAt.getTime()) / 1000)
      if (diffSec < 60) setLabel('Aggiornato ora')
      else if (diffSec < 3600) setLabel(`${Math.floor(diffSec / 60)} min fa`)
      else setLabel(`${Math.floor(diffSec / 3600)}h fa`)
    }
    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [lastUpdatedAt])

  const dotColor = !isOnline ? 'var(--primary, #D90012)'
    : lastUpdatedAt && Date.now() - lastUpdatedAt.getTime() > 5 * 60_000
    ? 'var(--warning, #B45309)'
    : 'var(--success, #3DCB5C)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '9px',
      fontWeight: 500,
      color: 'var(--t2, #96918D)',
      background: 'var(--sfc, #E4DFD9)',
      padding: '3px 8px',
      borderRadius: '100px',
      fontFamily: 'DM Sans, sans-serif',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
                  -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
    }}>
      <span
        aria-hidden="true"
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: dotColor,
          transition: 'background .3s',
          ...(isOnline && { animation: 'ua-pulse 2.5s infinite' }),
        }}
      />
      {!isOnline ? 'Offline' : label}
    </div>
  )
}
```

- [ ] **Step 2: Rimuovi il vecchio LIVE badge da AppHeader**

In `AppHeader.tsx`, cerca la riga che renderizza il badge "LIVE" e sostituiscila con:

```tsx
import { SyncBadge } from './SyncBadge'
// ...
// Dove era il LIVE badge:
<SyncBadge lastUpdatedAt={lastUpdatedAt} />
```

Se `AppHeader` non riceve `lastUpdatedAt`, aggiungi la prop opzionale all'interface.

- [ ] **Step 3: TypeScript + vitest**

```bash
npx tsc --noEmit && npx vitest run
```
Expected: 0 errori, tutti passano.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/SyncBadge.tsx src/components/layout/AppHeader.tsx
git commit -m "feat(layout): SyncBadge sostituisce LIVE — timestamp reale + offline detection"
```

---

## Task 13: Verifica finale TypeScript + Vitest + Playwright

- [ ] **Step 1: Run completo TypeScript**

```bash
cd ua-app && npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 2: Run completo Vitest**

```bash
npx vitest run
```
Expected: tutti i test passano (inclusi i 7+ nuovi).

- [ ] **Step 3: Playwright — 3 viewport × 2 temi**

```bash
python3 - <<'EOF'
from playwright.sync_api import sync_playwright
import os, time

BASE = "http://localhost:3001"
OUT = "/tmp/dash_v2_verify"
os.makedirs(OUT, exist_ok=True)

def login(page):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    time.sleep(2)
    page.fill('input[type="email"]', process.env.TEST_EMAIL!)
    page.fill('input[type="password"]', process.env.TEST_PASSWORD!)
    page.click('button[type="submit"]')
    page.wait_for_url(lambda u: "dashboard" in u, timeout=20000)
    page.wait_for_load_state("networkidle")
    time.sleep(1.5)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for vp, w, h in [("390", 390, 844), ("768", 768, 1024), ("1280", 1280, 900)]:
        for theme in ["light", "dark"]:
            ctx = browser.new_context()
            page = ctx.new_page()
            page.set_viewport_size({"width": w, "height": h})
            login(page)
            if theme == "dark":
                page.evaluate("""
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('ua-theme', 'dark');
                """)
                time.sleep(0.4)
            page.screenshot(path=f"{OUT}/dash_{vp}_{theme}.png", full_page=False)
            print(f"  {vp}px {theme}: OK")
            ctx.close()
    browser.close()
    print(f"\n✅ Screenshots in {OUT}/")
EOF
```

Apri tutti gli screenshot e verifica:
- Light: sfondo `#DDD8D3`, KPI numeri grandi (Playfair), nessun bordo visibile
- Dark: sfondo `#1A1916`, testo avorio `#F0EDE8`, ombre profonde, nessun bordo bianco
- 390px: SpotlightCard visibile, 2×2 KPI grid, task list, nav pill con tooltip
- 768px: 4 KPI in riga, task 2 col
- 1280px: layout 2 colonne (Produzione | Gestione)

- [ ] **Step 4: Commit finale + push**

```bash
git add -A
git commit -m "feat(dashboard): V2 completo — Spotlight, KPI filtri, ibrido, dark carbonio, nav personalizzabile"
git push origin main
```

Expected: CI verde (TypeScript 0, ESLint 0, Vitest tutti passano).

---

## Self-Review: Spec coverage check

| Sezione spec | Task che la implementa |
|---|---|
| Token light/dark corretti | Task 11 (--border) + tutti i componenti nuovi |
| SpotlightCard | Task 3 |
| KpiCard cliccabile | Task 4 |
| TaskItem progress reale | Task 5 |
| DashboardShell + role tabs | Task 6 |
| getLavoriTecnicoOggi + completamento_perc | Task 2 |
| Routing isTecnico | Task 6 |
| DashboardHybrid | Task 9 |
| DashboardTitolare rewrite | Task 7 |
| DashboardTecnico rewrite | Task 8 |
| BottomNavPill tooltip + drag + pin | Task 10 |
| SyncBadge (sostituisce LIVE) | Task 12 |
| DB migration index + nav_preferences | Task 1 |
| Viewport 390/768/1280 | Task 13 verifica |
| Dark mode var(--border) divider | Task 11 |

**Nessun gap rilevato.**
