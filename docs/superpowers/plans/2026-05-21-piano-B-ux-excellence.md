# Piano B — UX Excellence: Portare i Score a 10

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare UÀ da "7/10 usabile" a "10/10 invidiabile" — ogni pagina con loading skeleton, form nuovo lavoro come wizard fluido, dark mode completamente verificata, CRUD completo per ogni entità, sistema notifiche push, e design "wow" che fa invidia ai colleghi.

**Architecture:** 
- Loading skeletons: componente `SkeletonCard` riusabile, applicato a ogni pagina Suspense boundary
- Wizard form: `LavoroFormClient` in modalità "nuovo" diventa 2-step (Dati + Accettazione), poi redirect a dettaglio con tutte le tab
- Dark mode: verifica sistematica con Playwright su ogni pagina, fix colori hardcoded in `/qualita`
- Push notifications: Service Worker VAPID + Supabase Realtime per trigger

**Tech Stack:** Next.js 16, Motion 12.x (motion.ts token), Web Push API, Supabase Realtime, Playwright per verifica viewport.

---

## TASK 1 — Loading Skeletons (18 pagine)

**Problema:** 18/31 pagine non hanno skeleton durante il caricamento — sembrano "rotte".

**Files:**
- Create: `src/components/ui/SkeletonCard.tsx`
- Create: `src/components/ui/SkeletonList.tsx`
- Modify: `src/app/(app)/lavori/page.tsx` (e le altre 17 pagine — lista completa sotto)

- [ ] **Step 1: Crea SkeletonCard**

```tsx
// src/components/ui/SkeletonCard.tsx
'use client'
import { motion } from 'motion/react'

interface SkeletonCardProps {
  lines?: number
  hasAvatar?: boolean
}

export function SkeletonCard({ lines = 3, hasAvatar = false }: SkeletonCardProps) {
  return (
    <motion.div
      style={{
        background: 'var(--sfc, #E4DFD9)',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 12,
      }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {hasAvatar && (
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--prs, #D4CFC9)', marginBottom: 12,
        }} />
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 14,
          background: 'var(--prs, #D4CFC9)',
          borderRadius: 7,
          marginBottom: 8,
          width: i === lines - 1 ? '60%' : '100%',
        }} />
      ))}
    </motion.div>
  )
}
```

- [ ] **Step 2: Crea SkeletonList**

```tsx
// src/components/ui/SkeletonList.tsx
import { SkeletonCard } from './SkeletonCard'

interface SkeletonListProps {
  count?: number
  hasAvatar?: boolean
}

export function SkeletonList({ count = 4, hasAvatar = false }: SkeletonListProps) {
  return (
    <div style={{ padding: '0 16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasAvatar={hasAvatar} lines={i % 2 === 0 ? 3 : 2} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Aggiungi skeleton a /lavori/page.tsx**

Nella pagina lavori, usa il pattern `Suspense` di Next.js con un `loading.tsx`:

```tsx
// src/app/(app)/lavori/loading.tsx
import { SkeletonList } from '@/components/ui/SkeletonList'
export default function Loading() {
  return <SkeletonList count={5} />
}
```

Crea `loading.tsx` per ognuna di queste pagine (copia il file con count appropriato):
- `/lavori/loading.tsx` (count=5)
- `/clienti/loading.tsx` (count=4, hasAvatar=true)
- `/pazienti/loading.tsx` (count=4)
- `/magazzino/loading.tsx` (count=6)
- `/fatture/loading.tsx` (count=4)
- `/scadenzario/loading.tsx` (count=3)
- `/tecnici/loading.tsx` (count=3, hasAvatar=true)
- `/listino/loading.tsx` (count=6)
- `/ordini/loading.tsx` (count=3)
- `/analytics/loading.tsx` (count=2)
- `/agenda/loading.tsx` (count=4)
- `/qualita/loading.tsx` (count=3)
- `/rete/loading.tsx` (count=2)
- `/lavori/[id]/loading.tsx` (count=3)
- `/clienti/[id]/loading.tsx` (count=3, hasAvatar=true)
- `/pazienti/[id]/loading.tsx` (count=3)
- `/magazzino/[id]/loading.tsx` (count=3)
- `/fatture/[id]/loading.tsx` (count=4)

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ src/app/\(app\)/*/loading.tsx src/app/\(app\)/*/*/loading.tsx
git commit -m "feat(ux): add loading skeletons to all 18 pages"
```

---

## TASK 2 — Wizard Form Nuovo Lavoro (9 tab → 2 step lineari)

**Problema:** 9 tab su mobile in form nuovo = cognitive overload. Solo 2 abilitate. Mostrare tutte è confuso.

**Files:**
- Modify: `src/components/features/lavori/form/LavoroFormShell.tsx`
- Modify: `src/app/(app)/lavori/nuovo/page.tsx`

- [ ] **Step 1: Aggiungi prop `isCreating` a LavoroFormShell**

In `LavoroFormShell.tsx`, aggiungi prop:
```typescript
interface LavoroFormShellProps {
  isCreating?: boolean
  // ... altri props esistenti
}
```

- [ ] **Step 2: In modalità creazione, mostra solo le 2 tab attive**

```tsx
const visibleTabs = isCreating
  ? TABS.filter(t => t.id === 'dati' || t.id === 'accettazione')
  : TABS

// Usa visibleTabs invece di TABS nel render delle tab
```

- [ ] **Step 3: Aggiungi indicatore di progresso per la creazione**

Prima della tab bar, aggiungi un mini stepper visivo (solo in modalità creazione):
```tsx
{isCreating && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', marginBottom: 8 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 13, color: 'var(--t2)',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        background: activeTab === 'dati' ? 'var(--primary)' : 'var(--gold)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>1</span>
      <span>Dati</span>
    </div>
    <div style={{ flex: 1, height: 2, background: 'var(--prs)' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--t2)' }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        background: activeTab === 'accettazione' ? 'var(--primary)' : 'var(--prs)',
        color: activeTab === 'accettazione' ? 'white' : 'var(--t3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>2</span>
      <span>Accettazione MDR</span>
    </div>
  </div>
)}
```

- [ ] **Step 4: Aggiungi bottone "Avanti →" su Tab Dati in modalità creazione**

In `TabDati.tsx`, alla fine del form (prima del bottone submit), aggiungi:
```tsx
{isCreating && (
  <button
    type="button"
    onClick={() => onTabChange?.('accettazione')}
    style={{
      marginTop: 16, width: '100%', padding: '14px',
      background: 'var(--primary)', color: 'white',
      borderRadius: 12, fontWeight: 700, fontSize: 16,
      border: 'none', cursor: 'pointer',
    }}
  >
    Avanti — Dati MDR →
  </button>
)}
```

- [ ] **Step 5: In /lavori/nuovo/page.tsx, passa isCreating al form**

```tsx
<LavoroFormClient isCreating={true} ... />
```

- [ ] **Step 6: Verifica e commit**

```bash
npx tsc --noEmit && npx vitest run
git add src/components/features/lavori/form/LavoroFormShell.tsx \
  src/app/\(app\)/lavori/nuovo/page.tsx
git commit -m "feat(ux): wizard mode for new lavoro — 2 steps instead of 9 tabs"
```

---

## TASK 3 — Inline Validation Real-Time

**Problema (UX Expert):** Messaggi di errore generici, nessun highlight campo, nessun focus automatico.

**Files:**
- Modify: `src/app/(app)/lavori/nuovo/page.tsx`
- Modify: `src/components/features/lavori/form/TabDati.tsx`

- [ ] **Step 1: Stato di validazione per campo**

In `/lavori/nuovo/page.tsx`, aggiungi:
```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

const validateField = (field: string, value: unknown): string => {
  switch (field) {
    case 'cliente_id': return !value ? 'Seleziona il dentista' : ''
    case 'tipo_dispositivo': return !value ? 'Seleziona il tipo di dispositivo' : ''
    case 'descrizione': return !String(value ?? '').trim() ? 'Inserisci una descrizione' : ''
    case 'data_consegna_prevista': return !value ? 'Seleziona la data di consegna' : ''
    default: return ''
  }
}

const handleFieldChange = (field: string, value: unknown) => {
  setFormData(prev => ({ ...prev, [field]: value }))
  const err = validateField(field, value)
  setFieldErrors(prev => ({ ...prev, [field]: err }))
}
```

- [ ] **Step 2: Border rosso e messaggio inline per ogni campo**

In `TabDati.tsx`, per ogni campo obbligatorio:
```tsx
<div>
  <input
    style={{
      // ... stile esistente
      borderColor: fieldErrors?.cliente_id ? 'var(--primary, #D90012)' : 'var(--prs)',
      borderWidth: fieldErrors?.cliente_id ? 2 : 1,
    }}
    aria-invalid={!!fieldErrors?.cliente_id}
    aria-describedby="error-cliente"
  />
  {fieldErrors?.cliente_id && (
    <span
      id="error-cliente"
      role="alert"
      style={{ color: 'var(--primary)', fontSize: 12, marginTop: 4, display: 'block' }}
    >
      {fieldErrors.cliente_id}
    </span>
  )}
</div>
```

- [ ] **Step 3: Auto-focus al primo campo in errore al submit**

In `/lavori/nuovo/page.tsx`, nel `handleSubmit`:
```typescript
const handleSubmit = async () => {
  const errors: Record<string, string> = {}
  const required = ['cliente_id', 'tipo_dispositivo', 'descrizione', 'data_consegna_prevista']
  for (const field of required) {
    const err = validateField(field, formData[field])
    if (err) errors[field] = err
  }
  
  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors)
    // Focus al primo campo in errore
    const firstErrorField = required.find(f => errors[f])
    if (firstErrorField) {
      document.getElementById(`field-${firstErrorField}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.getElementById(`field-${firstErrorField}`)?.focus()
    }
    return
  }
  // ... resto del submit
}
```

- [ ] **Step 4: Verifica e commit**

```bash
npx tsc --noEmit
git add src/app/\(app\)/lavori/nuovo/page.tsx src/components/features/lavori/form/TabDati.tsx
git commit -m "feat(ux): inline field validation with auto-focus on error"
```

---

## TASK 4 — Empty States Completi

**Problema:** Varie pagine mostrano schermo bianco quando non ci sono dati.

**Files:**
- Create: `src/components/ui/EmptyState.tsx`
- Modify: `src/app/(app)/clienti/page.tsx`
- Modify: `src/app/(app)/magazzino/page.tsx`
- Modify: `src/app/(app)/fatture/page.tsx`
- Modify: `src/app/(app)/pazienti/page.tsx`
- Modify: `src/app/(app)/ordini/page.tsx`

- [ ] **Step 1: Crea EmptyState component**

```tsx
// src/components/ui/EmptyState.tsx
'use client'
import { motion } from 'motion/react'
import { t } from '@/design-system/motion'

interface EmptyStateProps {
  icon?: string  // emoji o SVG path
  title: string
  description?: string
  cta?: { label: string; href?: string; onClick?: () => void }
}

export function EmptyState({ icon = '📋', title, description, cta }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={t('normal', 'enter')}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
        minHeight: 300,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24, maxWidth: 280 }}>
          {description}
        </p>
      )}
      {cta && (
        <a
          href={cta.href}
          onClick={cta.onClick}
          style={{
            display: 'inline-block', padding: '12px 24px',
            background: 'var(--primary, #D90012)', color: 'white',
            borderRadius: 12, fontWeight: 700, fontSize: 14,
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          {cta.label}
        </a>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Applica a /clienti/page.tsx**

Dove c'è il render della lista, aggiungi:
```tsx
{clienti.length === 0 && (
  <EmptyState
    icon="🦷"
    title="Nessun cliente ancora"
    description="Aggiungi il tuo primo studio dentistico per iniziare."
    cta={{ label: '+ Aggiungi cliente', href: '/clienti/nuovo' }}
  />
)}
```

- [ ] **Step 3: Applica a /magazzino, /fatture, /pazienti, /ordini**

Stesso pattern per ogni pagina con messaggi specifici:
- Magazzino: icon="📦", title="Magazzino vuoto", cta="+ Aggiungi articolo"
- Fatture: icon="💳", title="Nessuna fattura", description="Le fatture vengono create automaticamente alla consegna."
- Pazienti: icon="👤", title="Nessun paziente", description="I pazienti appaiono quando crei un lavoro."
- Ordini: icon="🛒", title="Nessun ordine aperto", cta="+ Nuovo ordine"

- [ ] **Step 4: Verifica e commit**

```bash
npx tsc --noEmit
git add src/components/ui/EmptyState.tsx src/app/\(app\)/*/page.tsx
git commit -m "feat(ux): add EmptyState component with CTA to all list pages"
```

---

## TASK 5 — Dark Mode: Fix Colori Hardcoded

**Problema (Designer + UX + Sistematico):** `/qualita/page.tsx` usa colori hardcoded `#1B4FCC`, `#0A3D2E`, `#3A1A1A` che si rompono in dark mode.

**Files:**
- Modify: `src/app/(app)/qualita/page.tsx`

- [ ] **Step 1: Trova i colori hardcoded**

```bash
grep -n "#1B4FCC\|#0A3D2E\|#3A1A1A\|#16A34A\|#DC2626" src/app/\(app\)/qualita/page.tsx
```

- [ ] **Step 2: Sostituisci con token CSS**

```tsx
// Crea un mapping colori:
const STATUS_COLORS = {
  ok:       { bg: 'rgba(22,163,74,0.15)',  text: 'var(--success-text, #16A34A)' },
  warning:  { bg: 'rgba(212,168,67,0.15)', text: 'var(--gold, #D4A843)' },
  critical: { bg: 'rgba(217,0,18,0.15)',   text: 'var(--primary, #D90012)' },
  info:     { bg: 'rgba(27,45,107,0.15)',  text: 'var(--cobalt, #1B2D6B)' },
}
```

Sostituisci ogni colore hardcoded con il token corrispondente.

- [ ] **Step 3: Verifica dark mode con Playwright**

```typescript
// Aggiungi test in playwright (se configurato):
await page.emulateMedia({ colorScheme: 'dark' })
await page.goto('/qualita')
await page.screenshot({ path: '/tmp/qualita-dark.png' })
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/qualita/page.tsx
git commit -m "fix(design): replace hardcoded colors in /qualita with CSS tokens for dark mode"
```

---

## TASK 6 — CRUD Completo: Audit e Fix

**Problema:** Alcuni entità non hanno UI per Create/Update/Delete completo.

**Files da verificare e fixare:**
- `src/app/(app)/clienti/` — Edit + Delete
- `src/app/(app)/pazienti/` — Edit + Delete
- `src/app/(app)/listino/` — Edit + Delete singola voce
- `src/app/(app)/tecnici/` — Edit profilo tecnico
- `src/app/(app)/magazzino/` — Edit + Delete articolo

- [ ] **Step 1: Verifica presenza di bottoni Edit/Delete su ogni entità**

Per ogni pagina dell'elenco, controlla se c'è:
- Bottone "Modifica" o icona matita sul card/row
- Bottone "Elimina" o swipe-to-delete
- Pagina di edit `/entità/[id]/edit` o modal di modifica

- [ ] **Step 2: Per entità senza delete — aggiungi soft-delete**

Pattern standard per soft-delete su Supabase:
```typescript
// API route: DELETE /api/[entità]/[id]
const { error } = await svc
  .from('tabella')
  .update({ attivo: false, deleted_at: new Date().toISOString() })
  .eq('id', id)
  .eq('laboratorio_id', labId)
```

- [ ] **Step 3: Per entità senza edit — aggiungi form di modifica**

Il pattern standard è una bottom sheet con form:
```tsx
// In ListaCard.tsx
const [editOpen, setEditOpen] = useState(false)
// Long-press → sheet edit
```

Documenta quali entità mancano di quale CRUD e implementa i mancanti uno alla volta.

- [ ] **Step 4: Commit per ogni entità fixata**

```bash
git commit -m "feat(crud): add edit/delete to [entità]"
```

---

## TASK 7 — Push Notifications (Service Worker + Supabase Realtime)

**Problema:** App completamente pull-only — nessuno sa cosa succede senza riaprire l'app.

**Notifiche da implementare:**
1. Tecnico: "Prova rientrata per [lavoro]"
2. Titolare: "Nuovo problema segnalato da [tecnico]"
3. Front desk: "Lavoro [N] pronto per consegna"

**Files:**
- Modify: `public/sw.js`
- Create: `src/lib/notifications/push.ts`
- Create: `src/app/api/notifications/subscribe/route.ts`
- Create: `src/app/api/notifications/send/route.ts`
- Modify: `src/app/(app)/layout.tsx` (register push subscription)

- [ ] **Step 1: Genera VAPID keys**

```bash
npx web-push generate-vapid-keys --json
```

Salva in `.env.local`:
```
VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK...
```

- [ ] **Step 2: Aggiungi push handler al Service Worker**

In `public/sw.js`, aggiungi:
```javascript
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  const { title = 'UÀ', body = '', url = '/' } = data
  
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? '/')
  )
})
```

- [ ] **Step 3: Crea lib/notifications/push.ts**

```typescript
// src/lib/notifications/push.ts
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:support@uachelab.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToUser(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<void> {
  await webpush.sendNotification(
    subscription as webpush.PushSubscription,
    JSON.stringify(payload)
  )
}
```

Aggiungi dipendenza: `npm install web-push && npm install -D @types/web-push`

- [ ] **Step 4: API route subscribe**

```typescript
// src/app/api/notifications/subscribe/route.ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'

export async function POST(req: Request) {
  const { supabase, user, labId } = await getServerUserClient()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const subscription = await req.json()
  
  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    laboratorio_id: labId,
    subscription: JSON.stringify(subscription),
    updated_at: new Date().toISOString(),
  })
  
  return NextResponse.json({ ok: true })
}
```

Nota: crea la migration per la tabella `push_subscriptions`:
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratorio_id UUID NOT NULL,
  subscription JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 5: Registra subscription in layout**

In `src/app/(app)/layout.tsx`, aggiungi client-side registration:
```typescript
// Solo client-side, dopo login
useEffect(() => {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.ready.then(async (registration) => {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        })
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' },
        })
      }
    })
  }
}, [])
```

- [ ] **Step 6: Trigger notifica da Supabase Realtime**

In `src/lib/consegna/orchestrate.ts`, dopo il cambio stato "pronto", aggiungi:
```typescript
// Notifica front desk che il lavoro è pronto
await triggerPushNotification({
  laboratorio_id: labId,
  role: 'front_desk',
  payload: {
    title: 'Lavoro pronto per consegna',
    body: `${lavoro.numero_lavoro} — ${cliente.nome}`,
    url: `/lavori/${lavoro.id}`,
  }
})
```

- [ ] **Step 7: Commit**

```bash
git add public/sw.js src/lib/notifications/ src/app/api/notifications/
git commit -m "feat(pwa): add Web Push notifications for ready/problem/rientro events"
```

---

## TASK 8 — Dark Mode: Verifica Sistematica con Playwright

**Files:**
- Create: `tests/dark-mode.spec.ts`

- [ ] **Step 1: Scrivi test Playwright per dark mode**

```typescript
// tests/dark-mode.spec.ts
import { test, expect } from '@playwright/test'

const PAGES = [
  '/dashboard', '/lavori', '/clienti', '/pazienti', '/magazzino',
  '/fatture', '/scadenzario', '/tecnici', '/listino', '/ordini',
  '/qualita', '/impostazioni', '/analytics',
]

test.describe('Dark mode — no broken layouts', () => {
  for (const page of PAGES) {
    test(`${page} renders correctly in dark mode`, async ({ page: p }) => {
      await p.emulateMedia({ colorScheme: 'dark' })
      await p.goto(page)
      await p.waitForLoadState('networkidle')
      
      // Check no white flash (background should not be white)
      const bg = await p.evaluate(() => 
        getComputedStyle(document.body).backgroundColor
      )
      expect(bg).not.toBe('rgb(255, 255, 255)')
      
      // Screenshot per review manuale
      await p.screenshot({ path: `tests/screenshots/dark-${page.replace(/\//g, '-')}.png` })
    })
  }
})
```

- [ ] **Step 2: Esegui i test e identifica le pagine rotte**

```bash
npx playwright test tests/dark-mode.spec.ts --reporter=list
```

- [ ] **Step 3: Fix per ogni pagina con layout rotto**

Per ogni pagina che fallisce il test, identifica i colori non-token e sostituiscili con `var(--bg)`, `var(--sfc)`, `var(--t1)`, etc.

- [ ] **Step 4: Commit**

```bash
git add tests/dark-mode.spec.ts
git commit -m "test(playwright): dark mode verification for all 13 pages"
```

---

## TASK 9 — PWA: Splash Screens iOS + viewport-fit=cover

**Problema (PWA Engineer):** Nessun splash screen iOS, niente viewport-fit=cover per Dynamic Island iPhone 14+.

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `public/splash/` (immagini)

- [ ] **Step 1: Aggiungi viewport-fit=cover**

In `src/app/layout.tsx`, trova il metadata viewport:
```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',     // ← aggiunto
  themeColor: '#D90012',    // ← verifica sia presente
}
```

- [ ] **Step 2: Aggiorna BottomNavPill per safe-area**

In `src/components/layout/BottomNavPill.tsx`, assicurati che il padding bottom includa safe area:
```css
paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))'
```

- [ ] **Step 3: Genera splash screens**

Crea le immagini splash (640×1136, 750×1334, 1125×2436, 1242×2688 px) con sfondo `#DDD8D3` e logo UÀ centrato. Salvale in `public/splash/`.

In `layout.tsx`, aggiungi i meta tag:
```html
<link rel="apple-touch-startup-image" href="/splash/splash-640x1136.png" media="..." />
```

- [ ] **Step 4: Commit**

```bash
git add public/splash/ src/app/layout.tsx src/components/layout/BottomNavPill.tsx
git commit -m "feat(pwa): add iOS splash screens and viewport-fit=cover for Dynamic Island"
```

---

## TASK 10 — Refresh Button Dashboard + Last Cliente Memory

**Quick wins dall'audit (15 minuti totali):**

- [ ] **Step 1: Refresh KPI button in DashboardTitolare**

In `src/components/features/dashboard/DashboardTitolare.tsx`, aggiungi un bottone di refresh:
```tsx
const [refreshing, setRefreshing] = useState(false)

const handleRefresh = async () => {
  setRefreshing(true)
  router.refresh()  // Next.js App Router: revalida i dati server-side
  setTimeout(() => setRefreshing(false), 1000)
}

// Nel header del dashboard:
<button
  onClick={handleRefresh}
  aria-label="Aggiorna dati"
  style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}
>
  <motion.span
    animate={refreshing ? { rotate: 360 } : {}}
    transition={{ duration: 0.5 }}
  >
    ↻
  </motion.span>
</button>
```

- [ ] **Step 2: Ricorda ultimo cliente in form nuovo lavoro**

In `src/app/(app)/lavori/nuovo/page.tsx`:
```typescript
// Leggi da localStorage
const lastClienteId = typeof window !== 'undefined'
  ? localStorage.getItem('ua_last_cliente_id') ?? ''
  : ''

const [clienteId, setClienteId] = useState(lastClienteId)

// Salva dopo submit con successo:
localStorage.setItem('ua_last_cliente_id', clienteId)
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/dashboard/DashboardTitolare.tsx \
  src/app/\(app\)/lavori/nuovo/page.tsx
git commit -m "feat(ux): dashboard refresh button + remember last cliente in new lavoro form"
```

---

## TASK 11 — Run Full Verification

- [ ] **TypeScript:** `npx tsc --noEmit` → zero errori
- [ ] **ESLint:** `npx eslint src/ --ext .ts,.tsx --max-warnings 0` → zero warning
- [ ] **Tests:** `npx vitest run` → tutti verdi
- [ ] **Build:** `npx next build` → successo
- [ ] **Deploy:** `git push origin main` → Vercel CI/CD

```bash
git tag v1.6.0-ux
git push origin main --tags
```

---

*Piano B generato il 2026-05-21. Da eseguire DOPO il Piano A.*
