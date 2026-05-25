# UÀ — Piano Master di Roadmap

> **Per chi esegue questo piano:** Leggi `memory/MEMORY.md` e `memory/PINNED.md` prima di iniziare qualsiasi sessione.
> Ogni sessione usa `superpowers:subagent-driven-development` o `superpowers:executing-plans`.
> Ogni mockup UI va in `docs/design/mockups/` **MAI in /tmp**.

**Stato al 25/05/2026:** V1.9.0 in produzione su uachelab.com. CI verde (157 test).

---

## Indice delle Sessioni

| # | Sessione | Contenuto | Stima | Gate |
|---|----------|-----------|-------|------|
| S1 | Fix residui V1.9 | LIVE badge + preferenza_dashboard UI + Da fatturare query | 2h | — |
| S2 | Rifacimento UI | Pulsante "Crea rifacimento" su lavoro consegnato | 3h | Mockup approvato |
| S3 | Dettatura vocale | Web Speech API su campi testo | 3h | — |
| S4 | Email branding | Logo UÀ nei template Supabase | 2h | — |
| S5 | Logo + firma DdC | Upload logo in /impostazioni + PDF DdC | 4h | Mockup approvato |
| S6 | Re-audit + collaudo | Playwright audit completo + handoff Filippo | 3h | S1-S5 completi |
| — | **GATE: Collaudo Filippo** | Filippo usa l'app 2-3 settimane | — | Feedback reale |
| S7 | Portale dentista V2 | Comunicazione bidirezionale | 8h | Da pianificare dopo S6 |
| S8 | Analytics avanzate | Top clienti, margini, lead time | 6h | Da pianificare dopo S6 |
| S9 | Magazzino visivo | Tile 3 col, fill-bar semaforo | 5h | Da pianificare dopo S6 |
| S10 | Sezione Rete | Dashboard multi-lab | 8h | Da pianificare dopo S6 |
| S11 | AI Assistant | Voice + Chat, metered billing | 12h | Da pianificare |
| S12 | MDR Avanzata | CAPA, Fascicolo Tecnico | 10h | Da pianificare |

---

## SESSIONE 1 — Fix Residui V1.9

**Istruzione di avvio:**
```
Esegui i 3 fix residui di V1.9 dal piano docs/superpowers/plans/2026-05-25-roadmap-master.md.
Inizia da Task 1 (LIVE badge). Usa superpowers:executing-plans.
```

### Contesto tecnico necessario
- `src/components/layout/RealtimeProvider.tsx` — contiene il badge "LIVE" fisso in top-left
- `src/components/layout/AppHeader.tsx` — già ha prop `lastUpdatedAt?: Date | null` per SyncBadge
- `src/components/layout/SyncBadge.tsx` — già esiste, mostra "Aggiornato ora / X min fa"
- `src/hooks/useRealtimeNotifiche.ts` — espone `isConnected`
- `src/app/(app)/layout.tsx` — monta `RealtimeProvider` con `laboratorioId` e `ruolo`
- `src/app/(app)/impostazioni/page.tsx` — pagina impostazioni, sezione "Preferenze"
- `src/app/(app)/dashboard/page.tsx` — fetcha `stats` con `aggiornato_at`
- `src/lib/dashboard/queries.ts` — ha `getLavoriTecnicoOggi` ma manca `getLavoriDaFatturare`

### Task 1: Rimuovi badge LIVE duplicato da RealtimeProvider

**File:**
- Modify: `src/components/layout/RealtimeProvider.tsx`
- Modify: `src/app/(app)/layout.tsx`

Il badge LIVE in `RealtimeProvider.tsx` (riga 18-61) è fisso in top-left e duplica il SyncBadge.
Il `isConnected` dal hook non viene passato a nessun componente esterno.

**Step 1:** Rimuovi il div LIVE badge da `RealtimeProvider.tsx`.
Mantieni solo `<ToastNotifiche>` e `{children}`.

Rimuovi le righe 18-61 (il blocco `{isConnected && (...)}`) da:
```typescript
// ELIMINARE questo blocco da RealtimeProvider.tsx:
{isConnected && (
  <div aria-label="Aggiornamenti in tempo reale attivi" ...>
    <span ... /> {/* dot verde */}
    <span>Live</span>
  </div>
)}
```

**Step 2:** Esponi `isConnected` come prop da `RealtimeProvider` tramite context.
Non serve — SyncBadge usa `navigator.onLine` che è sufficiente per ora.

**Step 3:** Verifica TypeScript e test:
```bash
npx tsc --noEmit && npx vitest run
```
Expected: 0 errori, tutti i test passano.

**Step 4:** Commit:
```bash
git add src/components/layout/RealtimeProvider.tsx
git commit -m "fix(layout): rimuovi badge LIVE fisso — SyncBadge già gestisce l'indicatore di connessione"
```

---

### Task 2: UI preferenza_dashboard in /impostazioni

**File:**
- Modify: `src/app/(app)/impostazioni/page.tsx`
- Modify: `src/app/api/impostazioni/route.ts` (PATCH allowlist)

La colonna `utenti.preferenza_dashboard` esiste già (`'ibrido' | 'gestione_solo'`).
Manca solo l'UI per cambiarla.

**Step 1:** Aggiungi alla sezione "Preferenze" in `/impostazioni/page.tsx` dopo l'eventuale sezione tema,
un toggle:

```tsx
{/* Preferenza Dashboard — solo per titolari */}
{utente.ruolo === 'titolare' && (
  <InfoRow
    label="Vista dashboard"
    value={lab.preferenza_dashboard === 'gestione_solo' ? 'Solo gestione' : 'Ibrida (default)'}
  />
)}
```

Per il cambio, aggiungi un componente `PreferenzaDashboardToggle`:

```typescript
// src/components/features/impostazioni/PreferenzaDashboardToggle.tsx
'use client'
import { useState, useTransition } from 'react'

export function PreferenzaDashboardToggle({
  current,
}: {
  current: 'ibrido' | 'gestione_solo'
}) {
  const [val, setVal] = useState(current)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    const next = val === 'ibrido' ? 'gestione_solo' : 'ibrido'
    setVal(next)
    startTransition(async () => {
      await fetch('/api/impostazioni/preferenze', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferenza_dashboard: next }),
      })
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: 'var(--t1, #1C1916)', margin: 0 }}>
          Vista dashboard
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t2, #96918D)', margin: '2px 0 0' }}>
          {val === 'ibrido' ? 'Mostra tab Gestione + Produzione' : 'Solo vista Gestione (business)'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        style={{
          padding: '6px 14px',
          borderRadius: '100px',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'DM Sans, sans-serif',
          background: val === 'ibrido' ? 'var(--primary, #D90012)' : 'var(--prs, #D4CFC9)',
          color: val === 'ibrido' ? '#fff' : 'var(--t2, #96918D)',
          border: 'none',
          cursor: 'pointer',
          opacity: isPending ? .6 : 1,
        }}
      >
        {val === 'ibrido' ? 'Ibrida' : 'Solo gestione'}
      </button>
    </div>
  )
}
```

**Step 2:** Crea `src/app/api/impostazioni/preferenze/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function PATCH(req: NextRequest) {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const ALLOWLIST = ['preferenza_dashboard'] as const
  const allowed: Record<string, unknown> = {}
  for (const key of ALLOWLIST) {
    if (key in body) allowed[key] = body[key]
  }
  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })

  // Validate preferenza_dashboard
  if (allowed.preferenza_dashboard && !['ibrido', 'gestione_solo'].includes(allowed.preferenza_dashboard as string))
    return NextResponse.json({ error: 'Invalid preferenza_dashboard' }, { status: 400 })

  const svc = getServiceClient()
  const { error } = await svc
    .from('utenti')
    .update(allowed)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

**Step 3:** TypeScript + vitest + commit:
```bash
npx tsc --noEmit && npx vitest run
git add src/components/features/impostazioni/PreferenzaDashboardToggle.tsx \
        src/app/(app)/impostazioni/page.tsx \
        src/app/api/impostazioni/preferenze/route.ts
git commit -m "feat(impostazioni): toggle preferenza_dashboard — ibrido vs gestione_solo"
```

---

### Task 3: Filtro "Da fatturare" — aggiunta query inline

**File:**
- Modify: `src/lib/dashboard/queries.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/features/dashboard/DashboardTitolare.tsx`

Attualmente il KPI "Da fatturare" mostra `stats.pronti_non_fatturati` (numero) ma quando si tocca
il filtro, non c'è una lista — solo un link navigate. Va aggiunta una query che porta i lavori.

**Step 1:** Aggiungi in `src/lib/dashboard/queries.ts`:

```typescript
// ─── getLavoriDaFatturare ────────────────────────────────────────────────────
export type LavoroDaFatturareItem = {
  id: string
  numero_lavoro: string
  cliente_display: string
  data_consegna_effettiva: string | null
  prezzo_unitario: number
}

export async function getLavoriDaFatturare(
  svc: SupabaseClient,
  labId: string,
  limit = 20
): Promise<LavoroDaFatturareItem[]> {
  const { data } = await svc
    .from('lavori')
    .select('id, numero_lavoro, data_consegna_effettiva, prezzo_unitario, clienti(nome, cognome, studio_nome)')
    .eq('laboratorio_id', labId)
    .eq('stato', 'consegnato')
    .eq('incluso_in_fattura', false)
    .is('deleted_at', null)
    .order('data_consegna_effettiva', { ascending: true })
    .limit(limit)

  return ((data ?? []) as unknown as Array<{
    id: string; numero_lavoro: string; data_consegna_effettiva: string | null;
    prezzo_unitario: number;
    clienti: { nome: string; cognome: string; studio_nome: string | null } | null
  }>).map(l => ({
    id: l.id,
    numero_lavoro: l.numero_lavoro,
    cliente_display: l.clienti?.studio_nome ?? (l.clienti ? `${l.clienti.nome} ${l.clienti.cognome}` : '—'),
    data_consegna_effettiva: l.data_consegna_effettiva,
    prezzo_unitario: l.prezzo_unitario,
  }))
}
```

**Step 2:** In `src/app/(app)/dashboard/page.tsx`, nel blocco `isTitolare`, aggiungi a `Promise.all`:
```typescript
// Aggiunge getLavoriDaFatturare al Promise.all esistente
import { getLavoriDaFatturare } from '@/lib/dashboard/queries'

const [stats, pagamentiTop, materialiEsaurimento, inProvaRientro, lavoriDaFatturare] =
  await Promise.all([
    getTitolareKpi(svc, labId, stale),
    getPagamentiScadutiTop(svc, labId, 3),
    getMaterialiEsaurimento(svc, labId, 5),
    getLavoriInProvaRientro(svc, labId),
    getLavoriDaFatturare(svc, labId),
  ])
```

**Step 3:** Aggiungi `lavoriDaFatturare: LavoroDaFatturareItem[]` a `DashboardTitolareProps` e sostituisci il CTA placeholder nel filtro "fattura" con una lista reale.

**Step 4:** TypeScript + vitest + commit:
```bash
npx tsc --noEmit && npx vitest run
git commit -m "feat(dashboard): getLavoriDaFatturare — filtro KPI Da fatturare ora mostra lista inline"
```

---

## SESSIONE 2 — Rifacimento UI

**Istruzione di avvio:**
```
Implementa l'UI "Crea rifacimento" sul dettaglio lavoro consegnato.
Piano: docs/superpowers/plans/2026-05-25-roadmap-master.md, Sessione 2.
Mockup richiesto prima dell'implementazione React.
```

### Contesto tecnico necessario
- `src/app/(app)/lavori/[id]/page.tsx` — pagina dettaglio lavoro
- `src/app/api/lavori/[id]/rifacimento/route.ts` — API già esiste (POST)
- L'API accetta: body vuoto → crea rifacimento atomico via RPC
- La RPC `crea_rifacimento_atomico()` restituisce il nuovo lavoro `{ id, numero_lavoro }`
- Il rifacimento è consentito su lavori `consegnato`, `sospeso`, `pronto` (NON `annullato`)
- Attualmente nella pagina dettaglio esiste `AnnullaConsegnaBanner` (grazia 5 min)

### Task 1: Mockup HTML

Crea `docs/design/mockups/2026-05-25-rifacimento-ui.html` con:
- Mobile 390px: un pulsante "Crea rifacimento" nella sezione inferiore del dettaglio lavoro consegnato
- Il pulsante apre un bottom sheet con:
  - Titolo: "Crea rifacimento"
  - Testo: "Verrà creato un nuovo lavoro identico a #XXXX. Il lavoro originale resta archiviato."
  - CTA primaria: "Crea" (rosso)
  - CTA secondaria: "Annulla"
- Dopo creazione: toast di successo + navigazione al nuovo lavoro

Screenshot con Playwright → approvazione Francesco → implementazione React.

### Task 2: Componente RifacimentoButton

**File:**
- Create: `src/components/features/lavori/RifacimentoButton.tsx`

```typescript
'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function RifacimentoButton({ lavoroId, numeroLavoro }: { lavoroId: string; numeroLavoro: string }) {
  const [showSheet, setShowSheet] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleCrea() {
    startTransition(async () => {
      const res = await fetch(`/api/lavori/${lavoroId}/rifacimento`, { method: 'POST' })
      if (!res.ok) return
      const { id: newId } = await res.json()
      setShowSheet(false)
      router.push(`/lavori/${newId}`)
    })
  }

  // ... bottom sheet JSX
}
```

### Task 3: Inserisci nel dettaglio lavoro

In `src/app/(app)/lavori/[id]/page.tsx`, dopo `AnnullaConsegnaBanner`:

```tsx
{lavoroDettaglio.stato === 'consegnato' && (
  <RifacimentoButton
    lavoroId={id}
    numeroLavoro={lavoroDettaglio.numero_lavoro}
  />
)}
```

### Task 4: Test + build + commit
```bash
npx tsc --noEmit && npx vitest run
git commit -m "feat(lavori): RifacimentoButton — crea rifacimento da lavoro consegnato"
```

---

## SESSIONE 3 — Dettatura Vocale

**Istruzione di avvio:**
```
Implementa la dettatura vocale (Web Speech API) per i campi testo chiave.
Piano: docs/superpowers/plans/2026-05-25-roadmap-master.md, Sessione 3.
```

### Contesto tecnico necessario
- Web Speech API: `window.SpeechRecognition || window.webkitSpeechRecognition`
- Safari iOS: supporta dal 2020, richiede gesto utente per attivare
- Campi target: `descrizione` (new lavoro), note cliniche, nome paziente
- Pattern: pulsante microfono accanto al campo, append text (non sostituzione)

### Task 1: Hook useSpeechInput

**File:**
- Create: `src/hooks/useSpeechInput.ts`

```typescript
import { useState, useCallback, useRef } from 'react'

type SpeechState = 'idle' | 'listening' | 'error'

export function useSpeechInput(lang = 'it-IT') {
  const [state, setState] = useState<SpeechState>('idle')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = useCallback((onResult: (text: string) => void) => {
    if (!isSupported) return
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const rec = new SpeechRecognition()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? ''
      onResult(text)
      setState('idle')
    }
    rec.onerror = () => setState('error')
    rec.onend = () => setState('idle')
    recognitionRef.current = rec
    setState('listening')
    rec.start()
  }, [isSupported, lang])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setState('idle')
  }, [])

  return { state, start, stop, isSupported }
}
```

### Task 2: Componente VoiceInputButton

**File:**
- Create: `src/components/ui/VoiceInputButton.tsx`

```typescript
'use client'
import { useSpeechInput } from '@/hooks/useSpeechInput'
import { useReducedMotion } from '@/design-system/motion'

export function VoiceInputButton({
  onAppend,
  size = 20,
}: {
  onAppend: (text: string) => void
  size?: number
}) {
  const { state, start, stop, isSupported } = useSpeechInput('it-IT')
  const reduced = useReducedMotion()
  if (!isSupported) return null

  const isListening = state === 'listening'

  return (
    <button
      type="button"
      aria-label={isListening ? 'Ferma dettatura' : 'Avvia dettatura vocale'}
      onClick={() => isListening ? stop() : start(onAppend)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px', borderRadius: '10px', border: 'none',
        background: isListening ? 'var(--primary, #D90012)' : 'var(--sfc, #E4DFD9)',
        color: isListening ? '#fff' : 'var(--t2, #96918D)',
        cursor: 'pointer', flexShrink: 0,
        boxShadow: isListening
          ? 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)'
          : 'inset 0 1px 0 rgba(255,255,255,.90), 9px 13px 22px -4px rgba(148,128,118,.44)',
        animation: isListening && !reduced ? 'ua-pulse 1.5s infinite' : 'none',
      }}
    >
      {/* Mic SVG */}
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </button>
  )
}
```

### Task 3: Integrazione nel form nuovo lavoro

In `src/app/(app)/lavori/nuovo/page.tsx` (o il form client),
per il campo `descrizione`:

```tsx
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'

// Nel form, accanto al textarea descrizione:
<div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
  <textarea
    value={descrizione}
    onChange={e => setDescrizione(e.target.value)}
    // ... existing props
  />
  <VoiceInputButton
    onAppend={text => setDescrizione(prev => (prev ? prev + ' ' + text : text))}
  />
</div>
```

### Task 4: Test useSpeechInput

**File:**
- Create: `tests/unit/useSpeechInput.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSpeechInput } from '../../src/hooks/useSpeechInput'

describe('useSpeechInput', () => {
  it('reports isSupported=false when API absent', () => {
    const { result } = renderHook(() => useSpeechInput())
    // jsdom non ha SpeechRecognition
    expect(result.current.isSupported).toBe(false)
  })

  it('initial state is idle', () => {
    const { result } = renderHook(() => useSpeechInput())
    expect(result.current.state).toBe('idle')
  })
})
```

### Task 5: Commit
```bash
npx tsc --noEmit && npx vitest run
git commit -m "feat(voice): VoiceInputButton + useSpeechInput — dettatura vocale it-IT"
```

---

## SESSIONE 4 — Email Template Branding

**Istruzione di avvio:**
```
Aggiorna i template email Supabase con il branding UÀ (logo + colori warm panna).
Piano: docs/superpowers/plans/2026-05-25-roadmap-master.md, Sessione 4.
Usa mcp__plugin_supabase_supabase__apply_migration per aggiornare gli auth templates.
```

### Contesto tecnico necessario
- Supabase project ID: `iagibumwjstnveqpjbwq`
- I template si aggiornano via Supabase dashboard (Auth → Email Templates) O via SQL
- Templates da aggiornare: `confirm_signup`, `magic_link`, `invite`, `email_change`, `recovery`
- Il logo UÀ va inserito come SVG inline o come img con URL pubblico
- Colori: `#DDD8D3` bg, `#D90012` primary, `#1C1916` text, `#E4DFD9` surface

### Task 1: Crea template HTML base

Crea `docs/design/email-templates/base-template.html` con:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#DDD8D3;font-family:'DM Sans',Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <!-- Logo UÀ -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#D90012;color:#fff;font-size:22px;font-weight:800;
                  padding:8px 16px;border-radius:12px;letter-spacing:-0.02em">UÀ</div>
    </div>
    <!-- Content card -->
    <div style="background:#E4DFD9;border-radius:20px;padding:28px 24px;
                box-shadow:inset 0 1px 0 rgba(255,255,255,.90),-5px -5px 11px rgba(255,255,255,.78),
                           9px 13px 22px -4px rgba(148,128,118,.44)">
      {{ .Body }}
    </div>
    <!-- Footer -->
    <p style="text-align:center;font-size:11px;color:#96918D;margin-top:24px">
      UÀ — Laboratorio Odontotecnico Digitale<br>
      <a href="{{ .SiteURL }}" style="color:#D90012;text-decoration:none">uachelab.com</a>
    </p>
  </div>
</body>
</html>
```

### Task 2: Aggiorna template via Supabase MCP

Usa `mcp__plugin_supabase_supabase__apply_migration` con SQL per aggiornare
ogni template. Esempio per magic_link:

```sql
-- Nota: Supabase email templates si aggiornano da dashboard, non via SQL migration.
-- Navigare su: https://supabase.com/dashboard/project/iagibumwjstnveqpjbwq/auth/templates
-- Oppure via Supabase Management API (non MCP disponibile per templates)
```

**Alternativa:** Usa `mcp__plugin_supabase_supabase__search_docs` per trovare
l'API corretta per aggiornare i template, oppure navigare manualmente nel dashboard.

### Task 3: Commit del template file
```bash
git add docs/design/email-templates/
git commit -m "feat(email): template branding UÀ — warm panna, logo, colori DS v2.2"
```

---

## SESSIONE 5 — Logo + Firma DdC

**Istruzione di avvio:**
```
Implementa l'upload del logo e della firma per la DdC.
Piano: docs/superpowers/plans/2026-05-25-roadmap-master.md, Sessione 5.
La sezione "Marchio" in /impostazioni esiste già ma non ha upload.
Le colonne logo_url, logo_print_url, firma_ddc_url esistono già in laboratori.
```

### Contesto tecnico necessario
- `src/app/(app)/impostazioni/page.tsx` — sezione "Marchio" (righe 287-380 circa)
- Colonne già esistenti: `laboratori.logo_url`, `laboratori.logo_print_url`, `laboratori.firma_ddc_url`
- Storage: Supabase Storage bucket da creare `lab-assets` (public read, auth write)
- PDF DdC: `src/lib/pdf/DdcTemplate.tsx` — include logo se `logo_url` presente
- API PATCH impostazioni: `src/app/api/impostazioni/route.ts` (allowlist da estendere)

### Task 1: Mockup HTML per upload UI

Crea `docs/design/mockups/2026-05-25-logo-upload.html` con:
- Mobile 390px: sezione "Marchio" con 3 upload (Logo app, Logo stampa, Firma)
- Ogni upload: preview immagine se presente, pulsante "Carica" / "Rimuovi"
- UX: tap → file picker → upload progress → aggiornamento immediato

Screenshot + approvazione Francesco → implementazione.

### Task 2: Storage bucket Supabase

```sql
-- Via MCP apply_migration:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-assets',
  'lab-assets',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']
) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated can upload own lab assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab-assets' AND
  (storage.foldername(name))[1] = (SELECT laboratorio_id::text FROM utenti WHERE id = auth.uid())
);

CREATE POLICY "Public read lab assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lab-assets');
```

### Task 3: LogoUploadSection component

**File:**
- Create: `src/components/features/impostazioni/LogoUploadSection.tsx`

Il componente riceve `labId`, `currentUrl: string | null`, `field: 'logo_url' | 'logo_print_url' | 'firma_ddc_url'`
e gestisce: upload → storage → PATCH API → refresh.

### Task 4: Integrazione nel PDF DdC

In `src/lib/pdf/DdcTemplate.tsx`, aggiungi il logo in header se `logo_url` presente:
```tsx
{logoUrl && (
  <Image src={logoUrl} style={{ width: 60, height: 'auto', objectFit: 'contain' }} />
)}
```

### Task 5: TypeScript + build + commit
```bash
npx tsc --noEmit && npx next build && npx vitest run
git commit -m "feat(impostazioni): upload logo e firma DdC — storage Supabase + PDF integration"
```

---

## SESSIONE 6 — Re-audit + Pre-Collaudo

**Istruzione di avvio:**
```
Esegui il re-audit completo della PWA e prepara il documento di collaudo per Filippo.
Piano: docs/superpowers/plans/2026-05-25-roadmap-master.md, Sessione 6.
Requisito: Sessioni S1-S5 tutte completate.
```

### Task 1: Visual audit Playwright

Usa lo stesso script delle sessioni precedenti:
- Login come `h4t@live.it` / `>[REDACTED]`
- 13 pagine × 390/768/1280px × light/dark = 78 screenshot
- Confronta con score baseline (media 6.8/10 da MEMORY.md)
- Target: media ≥ 8.0/10 su tutti gli agenti

### Task 2: Fix P0 da audit

Aggiusta qualsiasi bug visivo o funzionale trovato con score < 7.0.

### Task 3: Aggiorna COLLAUDO-HANDOFF-FILIPPO.md

File: `docs/test-filippo/COLLAUDO-HANDOFF-FILIPPO.md`
- Aggiorna con le nuove feature aggiunte in S1-S5
- Aggiungi test specifici per: rifacimento, dettatura, logo, email

### Task 4: Aggiorna MEMORY.md con V2.0 milestone

Aggiorna `memory/MEMORY.md` con versione `V2.0.0-rc` e stato di tutte le sessioni completate.

---

## 🚧 GATE: Collaudo con Filippo

**Durata:** 2-3 settimane di uso reale in laboratorio.

**Output attesi:**
- Lista di bug operativi trovati durante l'uso quotidiano
- Feedback su UX (cosa è lento, cosa non si capisce)
- Richieste di feature mancanti rispetto al workflow reale
- Decisione: quali feature V2.0 hanno priorità reale?

**Questo gate sblocca** la pianificazione dettagliata di S7-S12.

---

## SESSIONI V2.0 (da pianificare dopo il gate collaudo)

Ogni sessione qui sotto richiede un PIANO SEPARATO da scrivere con
`superpowers:writing-plans` nella sessione di pianificazione.

### S7 — Portale Dentista V2

**Obiettivo:** Da portale read-only a comunicazione bidirezionale.

**Feature:**
- Dentista può richiedere un nuovo lavoro dal portale (form pre-compilato → notifica al lab)
- Dentista può rispondere a segnalazioni aperte
- Download DdC diretto (già parzialmente funziona, completare)

**Dipendenze:** Schema `richieste_portale` da progettare, webhook o polling.

**Stima:** 8h. Piano da scrivere: `docs/superpowers/plans/YYYY-MM-DD-portale-v2.md`.

---

### S8 — Analytics Avanzate

**Obiettivo:** Dashboard /analytics con dati reali di business.

**Feature:**
- Top 5 clienti per fatturato (ultimi 12 mesi)
- Margine per tipo dispositivo (implantoprotesi vs scheletrato vs corone)
- Lead time medio per consegna (giorni da ricevuto a consegnato)
- Tasso rifacimento mensile

**Dipendenze:** Query aggregate su `lavori` + `fatture` + `lavorazioni`.

**Stima:** 6h. Piano: `docs/superpowers/plans/YYYY-MM-DD-analytics-avanzate.md`.

---

### S9 — Magazzino Visivo

**Obiettivo:** Vista a tile come Mixel per il magazzino.

**Feature:**
- 3 colonne di tile per materiale
- Fill-bar semaforo (rosso/arancio/verde)
- Toggle lista↔vetrina
- 12 icone SVG per categorie materiali

**Dipendenze:** Nessuna. Vedi `docs/roadmap/MAGAZZINO-VISIVO-BRAINSTORM.md` per i concept.

**Stima:** 5h. Piano: `docs/superpowers/plans/YYYY-MM-DD-magazzino-visivo.md`.

---

### S10 — Sezione Rete Multi-Lab

**Obiettivo:** Dashboard per `admin_rete` che supervisiona più lab.

**Feature:**
- Lista lab della rete con KPI compatti
- Aggregato fatturato rete
- Alert lab con problemi (ritardi, materiali esauriti)

**Dipendenze:** Tabelle `reti` e `reti_members` già in DB. Architettura multi-tenant confermata.

**Stima:** 8h. Piano: `docs/superpowers/plans/YYYY-MM-DD-sezione-rete.md`.

---

## SESSIONI V2.1 — AI Assistant (da pianificare)

**Trigger:** Filippo richiede esplicitamente l'assistente vocale.

**Architettura:**
- Stripe metered billing: €24,90/mese base + €11/1.000 msg extra
- Smart routing: 40% Haiku 4.5 + 60% Sonnet = ~€0.008/msg blended
- Cache prompt: 8.000 token system → costo input $0.0024/msg
- Phase 1: Web Speech API (gratuita, già in S3)
- Phase 2: Whisper API per accuracy su termini tecnici italiani

**Piano:** `docs/superpowers/plans/YYYY-MM-DD-ai-assistant.md` (da scrivere).

---

## SESSIONI V2.2 — MDR Avanzata (da pianificare)

**Trigger:** Filippo cerca certificazione ISO 13485 o ha clienti PA.

**Feature:**
- CAPA (Corrective and Preventive Action) — link a incidenti
- Fascicolo Tecnico MDR — 6 tab
- PMCF follow-up — reminder automatico 6/12 mesi
- Firma Digitale P7M — richiede accordi AgID
- Nota di credito XML TD04

**Piano:** `docs/superpowers/plans/YYYY-MM-DD-mdr-avanzata.md` (da scrivere).

---

## SESSIONI V3.0 — Platform Scale (da pianificare)

**Trigger:** Secondo cliente acquisito + espansione.

**Feature principale:** Onboarding self-service (nuovo lab → Stripe → seed automatico).
**Altre:** SDI diretto, API pubblica, CAD/CAM integration, White label.

**Piano:** `docs/superpowers/plans/YYYY-MM-DD-platform-scale.md` (da scrivere dopo V2.0).

---

## Regole operative per ogni sessione

### BP-0 obbligatorio (all'inizio di ogni sessione):
1. Leggi `memory/SESSION_ACTIVE.md` → contesto corrente
2. Leggi `memory/MEMORY.md` → versione e stato
3. Identifica il dominio → leggi `memory/domains/[dominio].md` se esiste
4. Se navigazione strutturale (>2 file): `graphify query "<domanda>"`

### Fine sessione:
- Aggiorna `memory/SESSION_ACTIVE.md` (max 200 token, sostituisci il file)
- Se versione cambiata: aggiorna `memory/MEMORY.md`
- Push su main solo dopo: TypeScript 0 errori + Vitest tutti passano + Build verde

### Mockup workflow (obbligatorio per UI):
1. Crea `docs/design/mockups/YYYY-MM-DD-nome.html` (**MAI /tmp**)
2. Screenshot con `python3` + Playwright (`playwright.sync_api`)
3. Approvazione Francesco → poi React

---

*Piano creato: 25/05/2026 — Francesco Formicola + Claude*
