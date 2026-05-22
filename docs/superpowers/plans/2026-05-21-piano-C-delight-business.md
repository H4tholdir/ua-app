# Piano C — Delight + Business Intelligence

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere il "wow factor" che rende UÀ invidiabile — animazioni fluide, suoni che danno il feeling dell'utilizzo, business intelligence con margini e analytics, fatturazione batch, export CSV per il commercialista, e seed-new-lab per ogni nuovo laboratorio.

**Architecture:**
- Animazioni: SOLO Motion 12.x con token da `motion.ts` — mai inline. Rive per le icone animate chiave (FAB, stato lavoro).
- Suoni: Web Audio API lazy-init (già presente in `sounds.ts`) — aggiungere nuovi pattern sonori per ogni azione significativa.
- Business Intelligence: nuove query Postgres aggregate, KPI card "Margine netto" nel dashboard.
- Fatturazione batch: API `POST /api/fatture/batch` + UI su `/fatture`.
- Export CSV: API `GET /api/fatture/export` streaming.

**Tech Stack:** Next.js 16, Motion 12.x, Rive, Web Audio API, Supabase Postgres (aggregate queries), streaming CSV response.

---

## TASK 1 — Sistema Sonoro Completo

**Problema:** L'app ha i file `sounds.ts` e `haptic.ts` ma molte azioni non hanno feedback audio.

**Files:**
- Modify: `src/lib/feedback/sounds.ts`
- Modify: `src/components/features/lavori/ConsegnaButton.tsx`
- Modify: `src/app/(app)/scadenzario/[cliente_id]/page.tsx`
- Modify: `src/components/features/dashboard/DashboardTecnico.tsx`

- [ ] **Step 1: Leggi sounds.ts attuale e lista le funzioni esistenti**

```bash
cat src/lib/feedback/sounds.ts
```

- [ ] **Step 2: Aggiungi nuovi pattern sonori**

```typescript
// src/lib/feedback/sounds.ts — aggiungi queste funzioni

// Consegna completata: C5 → E5 → G5 (accordo di Do maggiore)
export function soundConsegna(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  playNote(ctx, 523.25, 0, 0.15)   // C5
  playNote(ctx, 659.25, 0.1, 0.15) // E5
  playNote(ctx, 783.99, 0.2, 0.25) // G5
}

// Nuovo lavoro creato: breve "ding" ascendente
export function soundNuovoLavoro(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  playNote(ctx, 880, 0, 0.1)    // A5
  playNote(ctx, 1047, 0.08, 0.15) // C6
}

// Errore/warning: nota bassa staccata
export function soundError(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  playNote(ctx, 220, 0, 0.2)  // A3
}

// Segnalazione problema: due note discendenti
export function soundSegnalazione(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  playNote(ctx, 523.25, 0, 0.12)  // C5
  playNote(ctx, 392.00, 0.12, 0.2) // G4
}

// Notifica push ricevuta: breve trio ascendente
export function soundNotifica(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  playNote(ctx, 659.25, 0, 0.08)  // E5
  playNote(ctx, 783.99, 0.07, 0.08) // G5
  playNote(ctx, 1046.5, 0.14, 0.15) // C6
}
```

- [ ] **Step 3: Aggiungi soundConsegna in ConsegnaButton**

```typescript
import { soundConsegna } from '@/lib/feedback/sounds'
import { hapticSuccess } from '@/lib/feedback/haptic'

// Dopo la consegna riuscita:
hapticSuccess()
soundConsegna()
```

- [ ] **Step 4: Aggiungi soundNuovoLavoro dopo creazione lavoro**

In `/lavori/nuovo/page.tsx`, nel callback di success:
```typescript
import { soundNuovoLavoro } from '@/lib/feedback/sounds'
// Dopo router.push:
soundNuovoLavoro()
```

- [ ] **Step 5: Aggiungi soundSegnalazione in SegnalaProblemaSheet**

```typescript
import { soundSegnalazione } from '@/lib/feedback/sounds'
// Dopo invio riuscito:
soundSegnalazione()
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/feedback/sounds.ts src/components/features/lavori/ \
  src/app/\(app\)/lavori/nuovo/page.tsx
git commit -m "feat(ux): complete sound design — consegna, nuovo-lavoro, segnalazione, error"
```

---

## TASK 2 — Animazioni "Wow" sulle Azioni Chiave

**Files:**
- Modify: `src/design-system/motion.ts` (aggiungi nuovi token se necessari)
- Modify: `src/components/features/lavori/ConsegnaButton.tsx`
- Modify: `src/components/features/lavori/LavoroCard.tsx`
- Modify: `src/components/layout/BottomNavPill.tsx`

- [ ] **Step 1: Aggiungi token "celebration" a motion.ts**

In `src/design-system/motion.ts`, aggiungi:
```typescript
export const CELEBRATION = {
  scale: { initial: { scale: 0.8 }, animate: { scale: [0.8, 1.15, 1] }, transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] } },
  checkmark: { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { duration: 0.5, ease: 'easeOut' } },
}
```

- [ ] **Step 2: Animazione "consegnato" su ConsegnaButton**

Dopo consegna riuscita, mostra un checkmark animato:
```tsx
const [delivered, setDelivered] = useState(false)

// Dopo success:
setDelivered(true)

// Nel render:
{delivered ? (
  <motion.div
    initial={CELEBRATION.scale.initial}
    animate={CELEBRATION.scale.animate}
    transition={CELEBRATION.scale.transition}
    style={{ color: '#16A34A', fontSize: 24 }}
  >
    ✓ Consegnato
  </motion.div>
) : (
  <button>CONSEGNA</button>
)}
```

- [ ] **Step 3: Stagger animation sulle card lista lavori**

In `src/app/(app)/lavori/page.tsx`, aggiungi stagger sulle card:
```tsx
<motion.div
  variants={{
    container: { transition: { staggerChildren: 0.06 } },
    item: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } },
  }}
  initial="container"
  animate="container"
>
  {lavori.map(l => (
    <motion.div key={l.id} variants={{ item: {} }}>
      <LavoroCard lavoro={l} />
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 4: Bounce sul FAB al primo render**

In `BottomNavPill.tsx`, il bottone centrale (FAB "Nuovo"):
```tsx
<motion.button
  initial={{ scale: 0, rotate: -180 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
>
  +
</motion.button>
```

- [ ] **Step 5: Commit**

```bash
git add src/design-system/motion.ts src/components/features/lavori/ \
  src/components/layout/BottomNavPill.tsx src/app/\(app\)/lavori/page.tsx
git commit -m "feat(animation): celebration on delivery, stagger list, FAB entrance bounce"
```

---

## TASK 3 — Margine Netto nel Dashboard

**Problema (Titolare audit):** Il titolare non sa mai il suo margine reale. KPI fondamentale assente.

**Files:**
- Create: migration SQL per `listino.costo_materiali_estimated`
- Modify: `src/lib/dashboard/queries.ts`
- Modify: `src/components/features/dashboard/DashboardTitolare.tsx`

- [ ] **Step 1: Aggiungi campo costo_materiali_estimated al listino**

Crea una migration:
```sql
ALTER TABLE listino
ADD COLUMN IF NOT EXISTS costo_materiali_estimated NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN listino.costo_materiali_estimated IS 
  'Costo stimato dei materiali per questa lavorazione. Usato per calcolo margine lordo.';
```

Esegui in Supabase SQL editor, poi rigenera i types:
```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

- [ ] **Step 2: Aggiungi calcolo margine in getTitolareKpi**

In `src/lib/dashboard/queries.ts`, nella funzione `getTitolareKpi` (o equivalente):
```typescript
// Calcola margine netto mese
const { data: margineData } = await svc
  .from('fatture')
  .select(`
    importo_totale,
    lavori_lavorazioni!inner(
      quantita,
      listino!inner(
        costo_materiali_estimated,
        compenso_tecnico
      )
    )
  `)
  .eq('laboratorio_id', labId)
  .gte('created_at', startOfMonth)
  .eq('stato_sdi', 'inviata')  // solo fatture emesse

const fatturato = margineData?.reduce((sum, f) => sum + f.importo_totale, 0) ?? 0
const costiMateriali = margineData?.reduce((sum, f) => 
  sum + f.lavori_lavorazioni.reduce((s, l) => 
    s + (l.listino.costo_materiali_estimated * l.quantita), 0
  ), 0) ?? 0
const compensiTecnici = margineData?.reduce((sum, f) =>
  sum + f.lavori_lavorazioni.reduce((s, l) =>
    s + (l.listino.compenso_tecnico * l.quantita), 0
  ), 0) ?? 0

const margineNetto = fatturato - costiMateriali - compensiTecnici
const percentualeMargine = fatturato > 0 ? (margineNetto / fatturato * 100).toFixed(1) : '0'
```

- [ ] **Step 3: Aggiungi KPI card "Margine netto" in DashboardTitolare**

```tsx
<KpiCard
  label="Margine netto mese"
  value={`€${margineNetto.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`}
  sub={`${percentualeMargine}% del fatturato`}
  color={Number(percentualeMargine) > 30 ? '#16A34A' : '#D4A843'}
  icon="📊"
/>
```

- [ ] **Step 4: Aggiungi campo costo_materiali nell'UI listino**

In `src/app/(app)/listino/page.tsx`, aggiungi un campo editabile per `costo_materiali_estimated`:
```tsx
<input
  type="number"
  placeholder="Costo mat. €"
  value={voce.costo_materiali_estimated ?? 0}
  onChange={e => updateCostoMateriali(voce.id, Number(e.target.value))}
  style={{ width: 80 }}
/>
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard/queries.ts src/components/features/dashboard/DashboardTitolare.tsx \
  src/app/\(app\)/listino/page.tsx
git commit -m "feat(business): add margine netto KPI to dashboard + costo_materiali field on listino"
```

---

## TASK 4 — Fatturazione Batch

**Problema:** Non esiste modo di fatturare più lavori in una volta. Filippo deve entrare in ogni lavoro.

**Files:**
- Create: `src/app/api/fatture/batch/route.ts`
- Modify: `src/app/(app)/fatture/page.tsx`

- [ ] **Step 1: Crea API batch**

```typescript
// src/app/api/fatture/batch/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { isSameOrigin } from '@/lib/utils/csrf'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  
  const { supabase, user, labId } = await getServerUserClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { lavoro_ids }: { lavoro_ids: string[] } = await req.json()
  if (!lavoro_ids?.length) return NextResponse.json({ error: 'Nessun lavoro selezionato' }, { status: 400 })
  
  const results = []
  for (const lavoro_id of lavoro_ids) {
    // Verifica che il lavoro appartenga al lab e sia in stato consegnato senza fattura
    const { data: lavoro } = await supabase
      .from('lavori')
      .select('id, stato, numero_lavoro')
      .eq('id', lavoro_id)
      .eq('laboratorio_id', labId)
      .eq('stato', 'consegnato')
      .single()
    
    if (!lavoro) {
      results.push({ lavoro_id, ok: false, error: 'Lavoro non trovato o non consegnato' })
      continue
    }
    
    // Genera fattura (chiama la stessa logica di orchestraConsegna ma solo fatturazione)
    // ... implementa la logica di generazione fattura
    results.push({ lavoro_id, ok: true, numero_lavoro: lavoro.numero_lavoro })
  }
  
  return NextResponse.json({ results, generati: results.filter(r => r.ok).length })
}
```

- [ ] **Step 2: UI di selezione in /fatture/page.tsx**

Aggiungi una sezione "Pronti da fatturare" in cima alla pagina:
```tsx
// Stato selezione
const [selectedLavori, setSelectedLavori] = useState<string[]>([])
const [batchLoading, setBatchLoading] = useState(false)

// Query lavori consegnati senza fattura
const lavoriDaFatturare = /* fetch dalla query del server */

// UI
{lavoriDaFatturare.length > 0 && (
  <div style={{ marginBottom: 24, padding: 16, background: 'var(--sfc)', borderRadius: 14 }}>
    <h3>📋 {lavoriDaFatturare.length} lavori pronti da fatturare</h3>
    {lavoriDaFatturare.map(l => (
      <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
        <input
          type="checkbox"
          checked={selectedLavori.includes(l.id)}
          onChange={e => setSelectedLavori(prev =>
            e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id)
          )}
        />
        {l.numero_lavoro} — {l.cliente?.nome}
      </label>
    ))}
    <button
      onClick={handleBatchFattura}
      disabled={selectedLavori.length === 0 || batchLoading}
      style={{
        marginTop: 12, padding: '12px 24px',
        background: selectedLavori.length > 0 ? 'var(--primary)' : 'var(--prs)',
        color: 'white', borderRadius: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
      }}
    >
      {batchLoading ? 'Generando...' : `Fattura ${selectedLavori.length} selezionati`}
    </button>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fatture/batch/route.ts src/app/\(app\)/fatture/page.tsx
git commit -m "feat(business): batch invoice generation for multiple delivered jobs"
```

---

## TASK 5 — Export CSV per Commercialista

**Problema:** Il commercialista non può fare niente senza CSV delle fatture.

**Files:**
- Create: `src/app/api/fatture/export/route.ts`
- Modify: `src/app/(app)/fatture/page.tsx`

- [ ] **Step 1: Crea API export CSV**

```typescript
// src/app/api/fatture/export/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function GET(req: Request) {
  const { supabase, user, labId } = await getServerUserClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from') ?? new Date(new Date().getFullYear(), 0, 1).toISOString()
  const dateTo = searchParams.get('to') ?? new Date().toISOString()
  
  const { data: fatture } = await supabase
    .from('fatture')
    .select('numero_fattura, data_emissione, clienti(nome), imponibile, iva, totale, stato_sdi')
    .eq('laboratorio_id', labId)
    .gte('data_emissione', dateFrom)
    .lte('data_emissione', dateTo)
    .order('data_emissione')
  
  // Genera CSV
  const headers = ['Numero,Data,Cliente,Imponibile,IVA,Totale,StatoSDI']
  const rows = (fatture ?? []).map(f =>
    [
      f.numero_fattura,
      f.data_emissione?.split('T')[0] ?? '',
      `"${(f.clienti as { nome: string })?.nome ?? ''}"`,
      f.imponibile?.toFixed(2) ?? '0.00',
      f.iva?.toFixed(2) ?? '0.00',
      f.totale?.toFixed(2) ?? '0.00',
      f.stato_sdi ?? '',
    ].join(',')
  )
  
  const csv = [...headers, ...rows].join('\n')
  const filename = `fatture-${new Date().toISOString().split('T')[0]}.csv`
  
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Step 2: Aggiungi bottone Export in /fatture/page.tsx**

```tsx
<a
  href="/api/fatture/export"
  download
  style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', background: 'var(--sfc)',
    border: '1px solid var(--prs)', borderRadius: 10,
    fontSize: 14, fontWeight: 600, textDecoration: 'none', color: 'var(--t1)',
  }}
>
  ⬇ Esporta CSV
</a>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fatture/export/route.ts src/app/\(app\)/fatture/page.tsx
git commit -m "feat(business): CSV export for invoices (commercialista integration)"
```

---

## TASK 6 — Seed New Lab Script

**Problema:** Ogni nuovo laboratorio che si iscrive parte da zero. Mancano cicli di produzione, fasi, lookup tables precaricate.

**Files:**
- Create: `scripts/seed-new-lab.ts`

- [ ] **Step 1: Crea lo script**

```typescript
// scripts/seed-new-lab.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seedNewLab(laboratorioId: string) {
  console.log(`Seeding lab ${laboratorioId}...`)
  
  // 1. Copia cicli di produzione generici (da lab template o da hardcoded list)
  const { data: cicliTemplate } = await svc
    .from('cicli_produzione')
    .select('*')
    .eq('laboratorio_id', '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c') // lab Filippo come template
    .limit(134)
  
  if (cicliTemplate) {
    const cicliNuovi = cicliTemplate.map(c => ({
      ...c,
      id: undefined,  // nuovo UUID
      laboratorio_id: laboratorioId,
    }))
    await svc.from('cicli_produzione').insert(cicliNuovi)
    console.log(`  ✓ ${cicliNuovi.length} cicli produzione inseriti`)
  }
  
  // 2. Copia lookup_valori standard (colori, leghe, tipi pagamento)
  const { data: lookup } = await svc
    .from('lookup_valori')
    .select('*')
    .is('laboratorio_id', null)  // solo i globali
  
  if (lookup) {
    const lookupNuovi = lookup.map(l => ({
      ...l,
      id: undefined,
      laboratorio_id: laboratorioId,
    }))
    await svc.from('lookup_valori').insert(lookupNuovi)
    console.log(`  ✓ ${lookupNuovi.length} lookup valori inseriti`)
  }
  
  // 3. Crea listino base con le lavorazioni più comuni
  // (hardcoded list delle 20 lavorazioni più comuni in Italia)
  console.log(`  ✓ Seed completato per lab ${laboratorioId}`)
}

// Usage: npx tsx scripts/seed-new-lab.ts <laboratorio_id>
const labId = process.argv[2]
if (!labId) { console.error('Usage: npx tsx scripts/seed-new-lab.ts <laboratorio_id>'); process.exit(1) }
seedNewLab(labId).catch(console.error)
```

- [ ] **Step 2: Testa lo script su un lab di test**

```bash
npx tsx scripts/seed-new-lab.ts 314cd040-0893-4e9d-9ad8-786e4eefd75f  # lab Arturo Pepe come test
```

Expected: output con ✓ per ogni categoria seedata.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-new-lab.ts
git commit -m "feat(ops): add seed-new-lab.ts script for new laboratory onboarding"
```

---

## TASK 7 — Analytics Avanzate (Trend 12 Mesi)

**Files:**
- Modify: `src/app/(app)/analytics/page.tsx`
- Modify: `src/lib/dashboard/queries.ts`

- [ ] **Step 1: Aggiungi query trend mensile**

In `queries.ts`:
```typescript
export async function getTrendMensile(svc: SupabaseClient, labId: string, months = 12) {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)
  
  const { data } = await svc
    .from('fatture')
    .select('data_emissione, totale')
    .eq('laboratorio_id', labId)
    .gte('data_emissione', startDate.toISOString())
    .order('data_emissione')
  
  // Raggruppa per mese
  const byMonth: Record<string, number> = {}
  for (const f of data ?? []) {
    const month = f.data_emissione?.slice(0, 7) ?? ''
    byMonth[month] = (byMonth[month] ?? 0) + (f.totale ?? 0)
  }
  
  return Object.entries(byMonth).map(([month, totale]) => ({ month, totale }))
}
```

- [ ] **Step 2: Aggiungi mini-grafico SVG in analytics**

In `analytics/page.tsx`, sostituisci la griglia statica con tab + grafico:
```tsx
// Grafico SVG semplice (nessuna libreria esterna)
function BarChart({ data }: { data: { month: string; totale: number }[] }) {
  const max = Math.max(...data.map(d => d.totale), 1)
  const w = 300, h = 120, barW = Math.floor(w / data.length) - 4
  
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const x = i * (barW + 4)
        const barH = (d.totale / max) * h
        const y = h - barH
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={barW} height={barH}
              fill="var(--primary, #D90012)" rx={4} opacity={0.8} />
            <text x={x + barW/2} y={h + 15} textAnchor="middle"
              fontSize={8} fill="var(--t3)">
              {d.month.slice(5)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/analytics/page.tsx src/lib/dashboard/queries.ts
git commit -m "feat(analytics): 12-month revenue trend chart with SVG bar chart"
```

---

## TASK 8 — Portale Dentista: Link Distribuibile dal Dettaglio Cliente

**Problema:** Il portale dentista `/portale/[token]` esiste ma non c'è UI per condividere il link.

**Files:**
- Modify: `src/app/(app)/clienti/[id]/page.tsx`
- Create: `src/app/api/clienti/[id]/portale-token/route.ts`

- [ ] **Step 1: API per generare/ottenere token portale**

```typescript
// src/app/api/clienti/[id]/portale-token/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { supabase, labId } = await getServerUserClient()
  
  // Verifica che il cliente appartenga al lab
  const { data: cliente } = await supabase
    .from('clienti')
    .select('id, portale_token')
    .eq('id', params.id)
    .eq('laboratorio_id', labId)
    .single()
  
  if (!cliente) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  // Genera token se non esiste
  if (!cliente.portale_token) {
    const token = crypto.randomUUID()
    await supabase.from('clienti').update({ portale_token: token }).eq('id', params.id)
    return NextResponse.json({ token, url: `${process.env.NEXT_PUBLIC_APP_URL}/portale/${token}` })
  }
  
  return NextResponse.json({
    token: cliente.portale_token,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/portale/${cliente.portale_token}`,
  })
}
```

- [ ] **Step 2: UI nel dettaglio cliente**

In `src/app/(app)/clienti/[id]/page.tsx`, aggiungi sezione portale:
```tsx
<section style={{ marginTop: 24 }}>
  <h3>Link Portale Dentista</h3>
  <p style={{ fontSize: 13, color: 'var(--t2)' }}>
    Condividi questo link con il dentista per permettergli di seguire i propri lavori.
  </p>
  <button onClick={handleSharePortale} style={{ /* stile primario */ }}>
    📤 Condividi link portale via WhatsApp
  </button>
</section>

// handleSharePortale:
const handleSharePortale = async () => {
  const res = await fetch(`/api/clienti/${cliente.id}/portale-token`)
  const { url } = await res.json()
  const text = `Gentile ${cliente.nome}, può seguire i suoi lavori qui: ${url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/clienti/\[id\]/portale-token/route.ts src/app/\(app\)/clienti/\[id\]/page.tsx
git commit -m "feat(clinico): portal link sharing button in client detail"
```

---

## TASK 9 — Tooltip Contestuali su Campi MDR

**Problema (UX Expert):** Campi come "Tipo impronta" e "Disinfettante" sono oscuri per chi non conosce la normativa.

**Files:**
- Create: `src/components/ui/InfoTooltip.tsx`
- Modify: `src/components/features/lavori/form/TabAccettazione.tsx`

- [ ] **Step 1: Crea InfoTooltip**

```tsx
// src/components/ui/InfoTooltip.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { t } from '@/design-system/motion'

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--prs)', border: 'none', cursor: 'pointer',
          fontSize: 11, color: 'var(--t2)', fontWeight: 700,
        }}
        aria-label="Informazione"
      >
        ?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={t('fast', 'enter')}
            style={{
              position: 'absolute', bottom: '100%', left: '50%',
              transform: 'translateX(-50%)', marginBottom: 8,
              background: 'var(--t1)', color: 'var(--bg)',
              padding: '8px 12px', borderRadius: 8,
              fontSize: 12, width: 220, zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
```

- [ ] **Step 2: Aggiungi tooltip in TabAccettazione**

```tsx
<label>
  Tipo impronta{' '}
  <InfoTooltip text="MDR Allegato XIII: il tipo di impronta usato per la lavorazione. Alginato = impronta tradizionale. STL = scansione digitale intraoral." />
</label>

<label>
  Disinfettante usato{' '}
  <InfoTooltip text="Registra il disinfettante usato per igienizzare l'impronta/modello ricevuto. Obbligatorio per la tracciabilità MDR Art. 13(8)." />
</label>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/InfoTooltip.tsx src/components/features/lavori/form/TabAccettazione.tsx
git commit -m "feat(ux): contextual MDR tooltips to reduce anxiety on acceptance form"
```

---

## TASK 10 — Final: Build, Test, Deploy, Tag

- [ ] **TypeScript:** `npx tsc --noEmit` → zero errori
- [ ] **ESLint:** `npx eslint src/ --ext .ts,.tsx --max-warnings 0`
- [ ] **Tests:** `npx vitest run` → tutti verdi
- [ ] **Build:** `npx next build`
- [ ] **Deploy e tag:**

```bash
git tag v1.6.0
git push origin main --tags
```

---

## Roadmap V2 (NON in questo piano)

Queste feature sono state discusse ma escluse deliberatamente dalla V1.5/V1.6:

| Feature | Motivo esclusione | Quando |
|---------|------------------|--------|
| PMCF follow-up automatico | Richiede email automation avanzata | V2 |
| STS XML export | Solo se fattura diretta al paziente | V2 |
| Firma digitale P7M | Richiede integrazione AgID | V2 |
| CAPA ISO 13485 | Solo se Filippo chiede certificazione | V2 |
| Colorazione 4D | Feature avanzata di nicchia | V2 |
| Terzismo inter-lab | Richiede rarchitettura tenant | V2 |
| SDI diretto | Richiede accordi con HUB SDI | V2 |
| Fascicolo Tecnico MDR | Feature complessa, basso uso quotidiano | V2 |

---

*Piano C generato il 2026-05-21. Da eseguire dopo Piano A e Piano B.*
