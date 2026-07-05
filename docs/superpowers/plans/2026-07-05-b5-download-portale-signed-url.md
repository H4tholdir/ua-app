# B5 — Download Portale + Fix Trasversale URL Firmati Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere davvero funzionante il download di DdC/Buono dal portale dentista, far arrivare per la prima volta il messaggio WhatsApp al dentista dopo la consegna, e correggere gli URL "pubblici" strutturalmente rotti (bucket privato) che oggi rompono anche il bottone DdC interno e le foto lavoro.

**Architecture:** Helper condiviso `getSignedUrl()` (wrapper su `createSignedUrl()`, generato sempre al momento dell'uso, mai salvato in DB) riusato in 4 punti: nuova route di download portale, SSR della pagina lavoro interna, SSR della pagina fattura, refactor di `send-pec.ts`. Una sola migration (`lavori.buono_storage_path`) — tutte le altre colonne necessarie esistono già.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase Storage (`createSignedUrl`), Vitest, Testing Library.

## Global Constraints

- Un URL firmato non va mai salvato in DB — generato solo al momento dell'uso (click o render SSR).
- Nessun cambiamento al contenuto dei PDF DdC/Buono oltre a quanto emerga dal Task 11/12 (audit).
- Nessuna modifica a retry/webhook Stripe (già risolto B13 2/2) né alla type-safety dei generatori (già risolta B4).
- Verifica finale per ogni task: `npx tsc --noEmit` (zero errori) + `npx vitest run` (nessuna regressione sul baseline corrente).
- Migration applicata al DB live solo con conferma esplicita di Francesco.

---

### Task 1: Helper condiviso `getSignedUrl()` + refactor `send-pec.ts`

**Files:**
- Create: `src/lib/storage/signed-url.ts`
- Create: `tests/unit/signed-url.test.ts`
- Modify: `src/lib/fattura/send-pec.ts:100-112`

**Interfaces:**
- Produces: `getSignedUrl(supabase: SupabaseClient, bucket: string, path: string, expiresInSeconds: number): Promise<string | null>` — usata dai Task 5, 7, 8.

- [ ] **Step 1: Scrivi il test che fallisce (RED)**

Crea `tests/unit/signed-url.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getSignedUrl } from '@/lib/storage/signed-url'

function mockSupabase(result: { data: { signedUrl: string } | null; error: unknown }) {
  const createSignedUrl = vi.fn().mockResolvedValue(result)
  return {
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
    createSignedUrl,
  }
}

describe('getSignedUrl', () => {
  it('ritorna la signedUrl quando createSignedUrl ha successo', async () => {
    const supa = mockSupabase({ data: { signedUrl: 'https://example.test/signed?token=abc' }, error: null })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await getSignedUrl(supa as any, 'documenti', 'lab-1/ddc/2026/DDC-2026-0001.pdf', 300)

    expect(url).toBe('https://example.test/signed?token=abc')
    expect(supa.storage.from).toHaveBeenCalledWith('documenti')
    expect(supa.createSignedUrl).toHaveBeenCalledWith('lab-1/ddc/2026/DDC-2026-0001.pdf', 300)
  })

  it('ritorna null se Supabase restituisce un errore', async () => {
    const supa = mockSupabase({ data: null, error: { message: 'not found' } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await getSignedUrl(supa as any, 'documenti', 'path/inesistente.pdf', 300)

    expect(url).toBeNull()
  })

  it('ritorna null se data.signedUrl è assente', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa = mockSupabase({ data: null as any, error: null })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await getSignedUrl(supa as any, 'documenti', 'path.pdf', 300)

    expect(url).toBeNull()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/signed-url.test.ts`
Expected: FALLISCE con un errore di import (`src/lib/storage/signed-url.ts` non esiste ancora).

- [ ] **Step 3: Crea l'helper**

Crea `src/lib/storage/signed-url.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Genera un URL firmato per un file su Storage privato. Va sempre chiamato
 * al momento dell'uso (click/render) — un URL firmato scade, non va mai
 * salvato in DB.
 */
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds: number
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
```

- [ ] **Step 4: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/signed-url.test.ts`
Expected: PASS — tutti e 3 i test.

- [ ] **Step 5: Refattorizza `send-pec.ts` per usare l'helper**

In `src/lib/fattura/send-pec.ts`, trova questo blocco (circa righe 100-112):

```typescript
    let downloadUrl = fattura.xml_url
    if (storagePath) {
      const { data: signed } = await supabase.storage
        .from('fatture-pdf')
        .createSignedUrl(storagePath, 60)
      if (signed?.signedUrl) downloadUrl = signed.signedUrl
    }
```

Sostituiscilo con:

```typescript
    let downloadUrl = fattura.xml_url
    if (storagePath) {
      const signedUrl = await getSignedUrl(supabase, 'fatture-pdf', storagePath, 60)
      if (signedUrl) downloadUrl = signedUrl
    }
```

Aggiungi l'import in cima al file (dopo gli import esistenti):

```typescript
import { getSignedUrl } from '@/lib/storage/signed-url'
```

- [ ] **Step 6: Verifica nessuna regressione**

Run: `npx vitest run tests/unit/pec-idempotency.test.ts`
Expected: PASS — comportamento invariato (il test non copre direttamente questo ramo, verificare solo che non si rompa nulla).

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 7: Commit**

```bash
git add src/lib/storage/signed-url.ts tests/unit/signed-url.test.ts src/lib/fattura/send-pec.ts
git commit -m "$(cat <<'EOF'
feat(storage): aggiungi helper condiviso getSignedUrl (B5)

Estrae in un helper riusabile il pattern createSignedUrl già in
produzione in send-pec.ts (unico punto del codebase che gestiva
correttamente un bucket privato) — verrà riusato dalla route di
download portale, dal SSR della pagina lavoro e da quella fattura.
send-pec.ts refattorizzato per usarlo, comportamento invariato.
EOF
)"
```

---

### Task 2: Migration `buono_storage_path` + aggiorna `generate-buono.ts`

**Files:**
- Create: `supabase/migrations/20260705200000_lavori_buono_storage_path.sql`
- Modify: `src/types/domain.ts:287` (interfaccia `Lavoro`)
- Modify: `src/lib/pdf/generate-buono.ts:59-68`
- Modify: `tests/unit/generate-buono.test.ts`

**Interfaces:**
- Produces: `Lavoro.buono_storage_path: string | null` — usato dal Task 5 (route download) per generare l'URL firmato del Buono.

- [ ] **Step 1: Crea la migration**

Crea `supabase/migrations/20260705200000_lavori_buono_storage_path.sql`:

```sql
-- supabase/migrations/20260705200000_lavori_buono_storage_path.sql
-- Aggiunge il path di Storage del Buono di Consegna, sul modello di
-- dichiarazioni_conformita.storage_path_pdf — necessario per generare un
-- URL firmato on-demand dal portale dentista (B5). Colonna additiva,
-- nullable, nessun backfill necessario (i Buoni già generati non sono
-- scaricabili dal portale finché non vengono rigenerati — accettato,
-- fuori scope backfillare dati storici), nessuna nuova policy RLS
-- (lavori è già scoped su laboratorio_id).

ALTER TABLE lavori
  ADD COLUMN buono_storage_path TEXT NULL;

COMMENT ON COLUMN lavori.buono_storage_path IS
  'Path del Buono di Consegna su Storage (bucket documenti, privato) — usato per generare un URL firmato on-demand, mai salvato come URL diretto';
```

- [ ] **Step 2: Applica la migration al DB live (richiede conferma esplicita di Francesco)**

**FERMATI QUI E CHIEDI CONFERMA A FRANCESCO PRIMA DI PROCEDERE.**

Dopo la conferma, applica la migration al progetto Supabase live (`iagibumwjstnveqpjbwq`), poi rigenera i tipi:

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```

Rimuovi l'eventuale messaggio CLI residuo in fondo al file generato.

- [ ] **Step 3: Estendi il tipo dominio `Lavoro`**

In `src/types/domain.ts`, trova (circa riga 285-287):

```typescript
  // Documenti generati alla consegna (B13 1/2 — idempotenza retry orchestraConsegna)
  buono_pdf_url: string | null;
  buono_numero: string | null;
```

Sostituisci con:

```typescript
  // Documenti generati alla consegna (B13 1/2 — idempotenza retry orchestraConsegna)
  buono_pdf_url: string | null;
  buono_numero: string | null;
  buono_storage_path: string | null;
```

- [ ] **Step 4: Verifica tsc**

Run: `npx tsc --noEmit`
Expected: nessun errore (il campo è opzionale-mancante negli usi esistenti solo dove c'è un cast a valle della query, stesso comportamento già visto per `LavoroFase.tecnico` in B17).

- [ ] **Step 5: Scrivi il test che fallisce (RED) per `generate-buono.ts`**

In `tests/unit/generate-buono.test.ts`, sostituisci il test esistente `'genera un buono con dati completi'` con:

```typescript
  it('genera un buono con dati completi e salva anche buono_storage_path', async () => {
    let updatePayload: Record<string, unknown> = {}
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'lavori') {
        return {
          update: (payload: Record<string, unknown>) => {
            updatePayload = payload
            return { eq: () => ({ eq: async () => ({ count: 1, error: null }) }) }
          },
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    const result = await generateBuono(LAVORO_FIXTURE)

    expect(result.numero).toMatch(/^BUO-\d{4}-0001$/)
    expect(result.url).toBe('https://example.test/buono.pdf')
    expect(updatePayload.buono_storage_path).toMatch(/^lab-test-001\/buoni\/\d{4}\/BUO-\d{4}-0001\.pdf$/)
  })
```

- [ ] **Step 6: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/generate-buono.test.ts`
Expected: FALLISCE — `updatePayload.buono_storage_path` è `undefined` (non ancora salvato).

- [ ] **Step 7: Aggiorna `generate-buono.ts`**

Trova (circa righe 59-64):

```typescript
  // Salva url e numero sul lavoro per il recupero idempotente (fix review: buono STUB)
  const { count: buonoUpdateCount } = await supabase
    .from('lavori')
    .update({ buono_pdf_url: pdfUrl, buono_numero: numero }, { count: 'exact' })
    .eq('id', lavoro.id)
    .eq('laboratorio_id', lavoro.laboratorio_id)
```

Sostituisci con:

```typescript
  // Salva url, numero e storage path sul lavoro per il recupero idempotente
  // e per generare l'URL firmato on-demand dal portale dentista (B5).
  const { count: buonoUpdateCount } = await supabase
    .from('lavori')
    .update(
      { buono_pdf_url: pdfUrl, buono_numero: numero, buono_storage_path: storagePath },
      { count: 'exact' }
    )
    .eq('id', lavoro.id)
    .eq('laboratorio_id', lavoro.laboratorio_id)
```

- [ ] **Step 8: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/generate-buono.test.ts`
Expected: PASS — entrambi i test.

- [ ] **Step 9: Verifica globale**

Run: `npx tsc --noEmit && npx vitest run`
Expected: nessun errore, nessuna regressione.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260705200000_lavori_buono_storage_path.sql src/types/domain.ts src/types/database.types.ts src/lib/pdf/generate-buono.ts tests/unit/generate-buono.test.ts
git commit -m "$(cat <<'EOF'
feat(db): aggiungi lavori.buono_storage_path (B5)

Necessario per generare un URL firmato on-demand del Buono di
Consegna dal portale dentista — stesso pattern già esistente per
dichiarazioni_conformita.storage_path_pdf. generate-buono.ts ora
salva anche il path accanto a buono_pdf_url/buono_numero.
EOF
)"
```

---

### Task 3: Bottone "Invia messaggio WhatsApp" in `ConsegnaButton.tsx`

**Files:**
- Modify: `src/components/features/lavori/ConsegnaButton.tsx`
- Create: `tests/unit/ConsegnaButton.test.tsx`

**Interfaces:**
- Consumes: `ConsegnaResult.whatsapp_url` (già esistente in `src/types/domain.ts`, prodotto da `orchestraConsegna()` — nessun cambiamento server necessario).

- [ ] **Step 1: Scrivi il test che fallisce (RED)**

Crea `tests/unit/ConsegnaButton.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConsegnaButton } from '../../src/components/features/lavori/ConsegnaButton'

const CONSEGNA_RESULT_OK = {
  ok: true,
  lavoro_id: 'lav-1',
  numero_lavoro: 'LAV-2026-0001',
  ddc: { numero: 'DDC-2026-0001', url: 'https://x/ddc.pdf', signed_url: 'https://x/ddc.pdf' },
  buono: { numero: 'BUO-2026-0001', url: 'https://x/buono.pdf', signed_url: 'https://x/buono.pdf' },
  fattura: null,
  whatsapp_url: 'https://wa.me/?text=ciao',
  tempo_ms: 42,
}

describe('ConsegnaButton — invio WhatsApp post-consegna', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dopo consegna riuscita mostra il bottone "Invia messaggio WhatsApp" con il link corretto', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, materiali_carenti: [], mdr_incompleto: false, mdr_campi_mancanti: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => CONSEGNA_RESULT_OK })

    render(<ConsegnaButton lavoroId="lav-1" />)

    fireEvent.click(screen.getByRole('button', { name: /CONSEGNA/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Invia messaggio WhatsApp/i })).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: /Invia messaggio WhatsApp/i })
    expect(link).toHaveAttribute('href', 'https://wa.me/?text=ciao')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('non mostra il bottone WhatsApp prima della consegna', () => {
    render(<ConsegnaButton lavoroId="lav-1" />)
    expect(screen.queryByRole('link', { name: /Invia messaggio WhatsApp/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/ConsegnaButton.test.tsx`
Expected: FALLISCE — il primo test non trova il link "Invia messaggio WhatsApp" (non ancora implementato).

- [ ] **Step 3: Aggiorna `ConsegnaButton.tsx`**

In `src/components/features/lavori/ConsegnaButton.tsx`, trova la riga 7:

```typescript
import type { ConsegnaError } from '@/types/domain'
```

Sostituiscila con:

```typescript
import type { ConsegnaError, ConsegnaResult } from '@/types/domain'
```

Aggiungi il nuovo stato dopo `const [mdrCampiMancanti, setMdrCampiMancanti] = useState<string[]>([])`:

```typescript
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
```

Sostituisci il blocco `if (res.ok) { ... }` dentro `eseguiConsegna`:

```typescript
      if (res.ok) {
        const json = (await res.json()) as ConsegnaResult
        try { playSuccess() } catch { /* suono facoltativo */ }
        soundConsegna()
        setWhatsappUrl(json.whatsapp_url ?? null)
        setStato('success')
        onSuccess?.()
        return
      }
```

Aggiungi il bottone WhatsApp subito dopo la chiusura di `</motion.button>` (prima del blocco `<AnimatePresence>{errore && ...}`):

```tsx
      {stato === 'success' && whatsappUrl && (
        <motion.a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={t('fast', 'enter')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            minHeight: '48px',
            borderRadius: '12px',
            background: 'var(--elv, #EDEDEA)',
            border: '1.5px solid var(--prs, #D4CFC9)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--t2, #4A3D33)',
            textDecoration: 'none',
          }}
          aria-label="Invia messaggio WhatsApp al dentista"
        >
          📱 Invia messaggio WhatsApp
        </motion.a>
      )}
```

- [ ] **Step 4: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/ConsegnaButton.test.tsx`
Expected: PASS — entrambi i test.

- [ ] **Step 5: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/lavori/ConsegnaButton.tsx tests/unit/ConsegnaButton.test.tsx
git commit -m "$(cat <<'EOF'
feat(lavori): mostra bottone Invia WhatsApp dopo consegna (B5)

orchestraConsegna() calcola già whatsapp_url da tempo, ma nessun
componente client lo leggeva mai — il messaggio al dentista non
partiva mai. ConsegnaButton ora lo legge dalla risposta e mostra un
bottone esplicito post-successo (azione singola e deliberata, click
esplicito invece di auto-popup).
EOF
)"
```

---

### Task 4: Bottone WhatsApp esplicito post-consegna in `DashboardFrontDesk.tsx`

**Files:**
- Modify: `src/components/features/dashboard/DashboardFrontDesk.tsx`
- Create: `tests/unit/DashboardFrontDesk.whatsapp.test.tsx`

**Interfaces:**
- Consumes: `ConsegnaResult.whatsapp_url` (stesso tipo del Task 3).

**Nota di design (decisione presa con Francesco dopo revisione):** l'apertura automatica di `window.open()` dopo un `await fetch()` non è affidabile — i browser (in particolare Safari) possono bloccare l'apertura di una nuova scheda se non avviene in modo sincrono rispetto al click originale, e qui in mezzo c'è una chiamata di rete più la generazione lato server del link. Il rischio è silenzioso: il codice gira, il test passerebbe, ma su alcuni browser WhatsApp non si aprirebbe mai — lo stesso identico bug che questo lavoro deve risolvere. Soluzione: dopo consegna riuscita, la riga NON sparisce subito — il bottone "CONSEGNA" viene sostituito da un bottone "📱 WHATSAPP" che l'operatore clicca esplicitamente (click reale = affidabile in ogni browser), e solo a quel click la riga sparisce e si apre la scheda WhatsApp. Se la consegna riesce ma non c'è `whatsapp_url` (es. cliente senza telefono), la riga sparisce subito come prima.

- [ ] **Step 1: Scrivi il test che fallisce (RED)**

Prima verifica come è strutturato il componente per costruire fixture minime coerenti:

Run: `grep -n "interface FrontDeskDashboard\|interface FrontDeskConsegnaItem" src/types/domain.ts`

Crea `tests/unit/DashboardFrontDesk.whatsapp.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardFrontDesk } from '../../src/components/features/dashboard/DashboardFrontDesk'
import type { FrontDeskDashboard } from '../../src/types/domain'

const DATA: FrontDeskDashboard = {
  consegne_oggi: [
    {
      id: 'lav-1',
      numero_lavoro: 'LAV-2026-0001',
      stato: 'pronto',
      tipo_dispositivo: 'cad_cam',
      descrizione: 'Corona',
      data_consegna_prevista: '2026-07-05',
      ora_consegna: null,
      paziente_nome_snapshot: null,
      cliente_display: 'Studio Rossi',
      cliente_telefono: null,
    },
  ],
  ritiri_attesi_oggi: [],
  in_prova_rientro_oggi: [],
  da_contattare: [],
}

describe('DashboardFrontDesk — bottone WhatsApp esplicito post-consegna', () => {
  const originalOpen = window.open

  beforeEach(() => {
    global.fetch = vi.fn()
    window.open = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.open = originalOpen
  })

  it('dopo consegna riuscita mostra un bottone WhatsApp esplicito invece di aprire subito la tab', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, whatsapp_url: 'https://wa.me/?text=ciao' }),
    })

    render(<DashboardFrontDesk data={DATA} nomeUtente="Sara" labId="lab-1" />)

    fireEvent.click(screen.getByRole('button', { name: /consegna/i }))

    // Il bottone WhatsApp appare al posto di CONSEGNA — non deve aprirsi da solo
    await screen.findByRole('button', { name: /whatsapp/i })
    expect(window.open).not.toHaveBeenCalled()

    // Solo il click esplicito sul bottone WhatsApp apre la scheda e rimuove la riga
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith('https://wa.me/?text=ciao', '_blank', 'noopener,noreferrer')
    })
    expect(screen.queryByText('LAV-2026-0001')).not.toBeInTheDocument()
  })

  it('dopo consegna riuscita senza whatsapp_url rimuove subito la riga', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, whatsapp_url: null }),
    })

    render(<DashboardFrontDesk data={DATA} nomeUtente="Sara" labId="lab-1" />)

    fireEvent.click(screen.getByRole('button', { name: /consegna/i }))

    await waitFor(() => {
      expect(screen.queryByText('Studio Rossi')).not.toBeInTheDocument()
    })
    expect(window.open).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/DashboardFrontDesk.whatsapp.test.tsx`
Expected: FALLISCE — nessun bottone "whatsapp" viene mai renderizzato.

Nota: se la fixture `FrontDeskDashboard`/`FrontDeskConsegnaItem` non corrisponde esattamente ai campi reali (verificati con il comando `grep` dello Step 1), correggi la fixture del test di conseguenza prima di procedere — non modificare il tipo di dominio per questo task.

- [ ] **Step 3: Aggiorna `DashboardFrontDesk.tsx`**

Trova la riga 7:

```typescript
import type { FrontDeskDashboard, FrontDeskConsegnaItem } from '@/types/domain'
```

Sostituiscila con:

```typescript
import type { FrontDeskDashboard, FrontDeskConsegnaItem, ConsegnaResult } from '@/types/domain'
```

Subito dopo la funzione `ConsegnaButton` esistente (dopo la sua chiusura `}`), aggiungi un nuovo componente `WhatsappButton` — stesso stile 3D, colore verde semantico DS invece del rosso primario:

```typescript
function WhatsappButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'var(--c-green, #22C55E)',
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        padding: '10px 16px',
        borderRadius: 8,
        border: 'none',
        boxShadow: '0 4px 0 #16A34A, 0 5px 6px rgba(0,0,0,.18)',
        cursor: 'pointer',
        transition: 'transform 80ms ease, box-shadow 80ms ease',
        WebkitTapHighlightColor: 'transparent',
        minHeight: 52,
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(3px)'
        e.currentTarget.style.boxShadow = '0 1px 0 #16A34A, 0 2px 3px rgba(0,0,0,.15)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = '0 4px 0 #16A34A, 0 5px 6px rgba(0,0,0,.18)'
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'translateY(3px)'
        e.currentTarget.style.boxShadow = '0 1px 0 #16A34A, 0 2px 3px rgba(0,0,0,.15)'
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = '0 4px 0 #16A34A, 0 5px 6px rgba(0,0,0,.18)'
      }}
    >
      📱 WHATSAPP
    </button>
  )
}
```

Poi, dentro `DashboardFrontDesk`, aggiungi lo stato per gli URL WhatsApp in attesa di click esplicito (subito dopo la riga `const [, setLoading] = useState<string | null>(null)`):

```typescript
  const [whatsappUrls, setWhatsappUrls] = useState<Record<string, string>>({})
```

Sostituisci `handleConsegna`:

```typescript
  const handleConsegna = useCallback(
    async (id: string) => {
      setLoading(id)
      try {
        const res = await fetch(`/api/lavori/${id}/consegna`, { method: 'POST' })
        if (res.ok) {
          const json = (await res.json()) as ConsegnaResult
          if (json.whatsapp_url) {
            setWhatsappUrls((prev) => ({ ...prev, [id]: json.whatsapp_url as string }))
          } else {
            setConsegneOggi((prev) => prev.filter((l) => l.id !== id))
          }
        }
      } catch {
        // Silently ignore — user can retry
      } finally {
        setLoading(null)
      }
    },
    []
  )

  const handleApriWhatsapp = useCallback((id: string, url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    setConsegneOggi((prev) => prev.filter((l) => l.id !== id))
    setWhatsappUrls((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])
```

Trova il render del bottone nella riga della lista "Da consegnare oggi":

```typescript
                  <ConsegnaButton
                    onClick={() => handleConsegna(lavoro.id)}
                  />
```

Sostituisci con:

```typescript
                  {whatsappUrls[lavoro.id] ? (
                    <WhatsappButton
                      onClick={() => handleApriWhatsapp(lavoro.id, whatsappUrls[lavoro.id])}
                    />
                  ) : (
                    <ConsegnaButton
                      onClick={() => handleConsegna(lavoro.id)}
                    />
                  )}
```

- [ ] **Step 4: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/DashboardFrontDesk.whatsapp.test.tsx`
Expected: PASS (entrambi i casi).

- [ ] **Step 5: Verifica globale**

Run: `npx tsc --noEmit && npx vitest run`
Expected: nessun errore, nessuna regressione.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/dashboard/DashboardFrontDesk.tsx tests/unit/DashboardFrontDesk.whatsapp.test.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): bottone WhatsApp esplicito dopo consegna rapida (B5)

Stesso gap di ConsegnaButton — handleConsegna ignorava whatsapp_url.
Scartata l'apertura automatica (window.open dopo un await non è
affidabile — rischio di blocco popup silenzioso, specie Safari):
dopo consegna riuscita il bottone CONSEGNA diventa un bottone
WHATSAPP esplicito, click reale = affidabile in ogni browser.
EOF
)"
```

---

### Task 5: Route di download portale — `GET /api/portale/[token]/lavori/[lavoro_id]/[documento]`

**Files:**
- Create: `src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts`
- Create: `tests/unit/portale-documento-route.test.ts`

**Interfaces:**
- Consumes: `getSignedUrl()` (Task 1), `lavori.buono_storage_path` (Task 2), `dichiarazioni_conformita.storage_path_pdf` (già esistente).
- Produces: route usata dal Task 6 (href in `LavoroCard`).

- [ ] **Step 1: Scrivi il test che fallisce (RED)**

Crea `tests/unit/portale-documento-route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/storage/signed-url', () => ({
  getSignedUrl: mockGetSignedUrl,
}))

import { GET } from '../../src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route'

const TOKEN = 'tok-abc'
const LAB_ID = 'lab-1'
const CLIENTE_ID = 'cli-1'
const LAVORO_ID = 'lav-1'

function makeParams(documento: string) {
  return { params: Promise.resolve({ token: TOKEN, lavoro_id: LAVORO_ID, documento }) }
}

function mockCliente(result: { data: unknown; error: unknown } = {
  data: { id: CLIENTE_ID, laboratorio_id: LAB_ID, portale_token_scade_at: null },
  error: null,
}) {
  return {
    select: () => ({
      eq: () => ({
        is: () => ({
          single: async () => result,
        }),
      }),
    }),
  }
}

function mockLavoro(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is']
  for (const m of methods) chain[m] = () => chain
  chain.single = async () => result
  return chain
}

describe('GET /api/portale/[token]/lavori/[lavoro_id]/[documento]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('documento non valido → 400', async () => {
    const res = await GET(new Request('http://x'), makeParams('altro'))
    expect(res.status).toBe(400)
  })

  it('token non valido → 404', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente({ data: null, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('ddc'))
    expect(res.status).toBe(404)
  })

  it('token scaduto → 403', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return mockCliente({
          data: { id: CLIENTE_ID, laboratorio_id: LAB_ID, portale_token_scade_at: '2020-01-01T00:00:00Z' },
          error: null,
        })
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('ddc'))
    expect(res.status).toBe(403)
  })

  it('lavoro non trovato, non consegnato, o di un altro cliente → 404', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: null, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('ddc'))
    expect(res.status).toBe(404)
  })

  it('buono senza storage path → 404', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID, buono_storage_path: null }, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('buono'))
    expect(res.status).toBe(404)
  })

  it('buono con storage path → redirect 307 all\'URL firmato + log accesso', async () => {
    let insertPayload: Record<string, unknown> = {}
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID, buono_storage_path: 'lab-1/buoni/2026/BUO-2026-0001.pdf' }, error: null })
      if (table === 'portale_accessi') {
        return { insert: (payload: Record<string, unknown>) => { insertPayload = payload; return Promise.resolve({ error: null }) } }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mockGetSignedUrl.mockResolvedValue('https://storage.test/signed-buono.pdf')

    const res = await GET(new Request('http://x'), makeParams('buono'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://storage.test/signed-buono.pdf')
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), 'documenti', 'lab-1/buoni/2026/BUO-2026-0001.pdf', 300)
    expect(insertPayload.azione).toBe('download_buono')
  })

  it('ddc con storage path → redirect 307 all\'URL firmato', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID }, error: null })
      if (table === 'dichiarazioni_conformita') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { storage_path_pdf: 'lab-1/ddc/2026/DDC-2026-0001.pdf' }, error: null }) }) }),
        }
      }
      if (table === 'portale_accessi') return { insert: async () => ({ error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    mockGetSignedUrl.mockResolvedValue('https://storage.test/signed-ddc.pdf')

    const res = await GET(new Request('http://x'), makeParams('ddc'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://storage.test/signed-ddc.pdf')
  })

  it('errore nella generazione dell\'URL firmato → 500', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID, buono_storage_path: 'lab-1/buoni/2026/BUO-2026-0001.pdf' }, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })
    mockGetSignedUrl.mockResolvedValue(null)

    const res = await GET(new Request('http://x'), makeParams('buono'))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/portale-documento-route.test.ts`
Expected: FALLISCE con un errore di import (la route non esiste ancora).

- [ ] **Step 3: Crea la route**

Crea `src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getSignedUrl } from '@/lib/storage/signed-url'

type RouteContext = {
  params: Promise<{ token: string; lavoro_id: string; documento: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { token, lavoro_id, documento } = await params

  if (documento !== 'ddc' && documento !== 'buono') {
    return NextResponse.json({ error: 'Documento non valido' }, { status: 400 })
  }

  const svc = getServiceClient()

  const { data: cliente } = await svc
    .from('clienti')
    .select('id, laboratorio_id, portale_token_scade_at')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .single()

  if (!cliente) {
    return NextResponse.json({ error: 'Link non valido' }, { status: 404 })
  }

  const scadenza = (cliente as { portale_token_scade_at: string | null }).portale_token_scade_at
  if (scadenza && new Date(scadenza) < new Date()) {
    return NextResponse.json({ error: 'Link scaduto' }, { status: 403 })
  }

  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, buono_storage_path')
    .eq('id', lavoro_id)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  let storagePath: string | null = null

  if (documento === 'buono') {
    storagePath = (lavoro as { buono_storage_path: string | null }).buono_storage_path
  } else {
    const { data: ddc } = await svc
      .from('dichiarazioni_conformita')
      .select('storage_path_pdf')
      .eq('lavoro_id', lavoro_id)
      .maybeSingle()
    storagePath = (ddc as { storage_path_pdf: string | null } | null)?.storage_path_pdf ?? null
  }

  if (!storagePath) {
    return NextResponse.json({ error: 'Documento non disponibile' }, { status: 404 })
  }

  const signedUrl = await getSignedUrl(svc, 'documenti', storagePath, 300)

  if (!signedUrl) {
    return NextResponse.json({ error: 'Errore nella generazione del link' }, { status: 500 })
  }

  await svc.from('portale_accessi').insert({
    cliente_id: cliente.id,
    laboratorio_id: cliente.laboratorio_id,
    azione: documento === 'ddc' ? 'download_ddc' : 'download_buono',
  })

  return NextResponse.redirect(signedUrl, 307)
}
```

- [ ] **Step 4: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/portale-documento-route.test.ts`
Expected: PASS — tutti e 8 i test.

- [ ] **Step 5: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts" tests/unit/portale-documento-route.test.ts
git commit -m "$(cat <<'EOF'
feat(portale): aggiungi route download on-demand DdC/Buono (B5)

Verifica token + TTL + cross-tenant + stato consegnato, genera un
URL firmato (5 min, scadenza breve per minimizzare l'esposizione di
un link non autenticato) al momento del click, mai in anticipo,
redirect 307. Log su portale_accessi (stesso audit trail già
esistente per le viste pagina).
EOF
)"
```

---

### Task 6: Link di download in `LavoroCard` del portale

**Files:**
- Modify: `src/app/portale/[token]/page.tsx`

**Interfaces:**
- Consumes: route del Task 5, campi `LavoroPortale.ddc_signed_url`/`buono_signed_url` (già esistenti nel tipo).

Nessun test dedicato — coerente con l'assenza di test diretti per `page.tsx` in questo progetto (stesso precedente di B17 Task 5). Verifica tramite `tsc`/`build` + QA browser a fine piano.

- [ ] **Step 1: Estendi la query dei lavori consegnati**

In `src/app/portale/[token]/page.tsx`, trova la query `lavoriConsegnatiRaw` (circa righe 307-319):

```typescript
  const { data: lavoriConsegnatiRaw } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, stato, tipo_dispositivo, descrizione,
      data_consegna_prevista, data_consegna_effettiva,
      paziente_nome_snapshot, conformato, spedizione_stato, spedizione_tracking
    `)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .order('data_consegna_effettiva', { ascending: false })
    .limit(10)
```

Sostituisci il `.select(...)` con:

```typescript
    .select(`
      id, numero_lavoro, stato, tipo_dispositivo, descrizione,
      data_consegna_prevista, data_consegna_effettiva,
      paziente_nome_snapshot, conformato, spedizione_stato, spedizione_tracking,
      buono_storage_path,
      ddc:dichiarazioni_conformita(storage_path_pdf)
    `)
```

- [ ] **Step 2: Aggiungi il mapper per i lavori consegnati**

Subito dopo la funzione `mapLavoro` esistente (dopo la sua chiusura `})`), aggiungi:

```typescript
  const mapLavoroConsegnato = (l: Record<string, unknown>): LavoroPortale => {
    const base = mapLavoro(l)
    // Normalizzazione difensiva: PostgREST può restituire una relazione
    // embedded come oggetto singolo o array a seconda di come inferisce la
    // cardinalità — non assumere una forma specifica per questo confine esterno.
    const ddcRaw = l.ddc as { storage_path_pdf: string | null } | { storage_path_pdf: string | null }[] | null
    const ddcRow = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw
    const hasDdc = !!ddcRow?.storage_path_pdf
    const hasBuono = !!(l.buono_storage_path as string | null)
    return {
      ...base,
      ddc_signed_url: hasDdc ? `/api/portale/${token}/lavori/${l.id as string}/ddc` : null,
      buono_signed_url: hasBuono ? `/api/portale/${token}/lavori/${l.id as string}/buono` : null,
    }
  }
```

- [ ] **Step 3: Usa il nuovo mapper per i lavori consegnati**

Trova:

```typescript
  const lavoriAperti = (lavoriApertiRaw ?? []).map(mapLavoro)
  const lavoriConsegnati = (lavoriConsegnatiRaw ?? []).map(mapLavoro)
```

Sostituisci con:

```typescript
  const lavoriAperti = (lavoriApertiRaw ?? []).map(mapLavoro)
  const lavoriConsegnati = (lavoriConsegnatiRaw ?? []).map(mapLavoroConsegnato)
```

- [ ] **Step 4: Aggiungi i link di download in `LavoroCard`**

Trova il blocco tracking in `LavoroCard` (circa righe 151-170):

```typescript
      {lavoro.spedizione_stato && lavoro.spedizione_tracking && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            background: '#F3F4F6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280' }}>
            Tracking:
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {lavoro.spedizione_tracking}
          </span>
        </div>
      )}
    </div>
  )
}
```

Sostituiscilo con (aggiunta la sezione download subito dopo il blocco tracking):

```typescript
      {lavoro.spedizione_stato && lavoro.spedizione_tracking && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            background: '#F3F4F6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280' }}>
            Tracking:
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {lavoro.spedizione_tracking}
          </span>
        </div>
      )}

      {(lavoro.ddc_signed_url || lavoro.buono_signed_url) && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {lavoro.ddc_signed_url && (
            <a
              href={lavoro.ddc_signed_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                background: '#F3F4F6',
                borderRadius: '8px',
                padding: '6px 10px',
                textDecoration: 'none',
              }}
              aria-label="Scarica Dichiarazione di Conformità"
            >
              📄 Dichiarazione di Conformità
            </a>
          )}
          {lavoro.buono_signed_url && (
            <a
              href={lavoro.buono_signed_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                background: '#F3F4F6',
                borderRadius: '8px',
                padding: '6px 10px',
                textDecoration: 'none',
              }}
              aria-label="Scarica Buono di Consegna"
            >
              🧾 Buono di Consegna
            </a>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx next build`
Expected: build pulita, route `/api/portale/[token]/lavori/[lavoro_id]/[documento]` presente nel manifest.

- [ ] **Step 6: Commit**

```bash
git add "src/app/portale/[token]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(portale): mostra link download DdC/Buono per lavori consegnati (B5)

LavoroCard era già predisposta per i campi ddc_signed_url/
buono_signed_url ma non li renderizzava mai. Ora, solo per la
sezione "Ultimi consegnati", mostra i link verso la nuova route
on-demand (Task 5) quando il rispettivo storage path esiste —
nessun link per lavori storici senza DdC/Buono generati.
EOF
)"
```

---

### Task 7: Fix interni — `TabDocumenti.tsx` (DdC) e `TabImmagini.tsx` (foto) via SSR signing

**Files:**
- Modify: `src/app/(app)/lavori/[id]/page.tsx`

**Interfaces:**
- Consumes: `getSignedUrl()` (Task 1).

Nessun test dedicato per la pagina (stesso precedente di B17 Task 5) — `TabDocumenti.tsx`/`TabImmagini.tsx` continuano a leggere `ddc.pdf_url`/`img.url` senza modifiche, ricevono semplicemente valori già firmati dalla SSR. Verifica tramite `tsc`/`build` + QA browser a fine piano.

- [ ] **Step 1: Aggiungi la firma degli URL nella pagina lavoro**

In `src/app/(app)/lavori/[id]/page.tsx`, aggiungi in cima al file (dopo l'ultimo import esistente, riga 11):

```typescript
import { getSignedUrl } from '@/lib/storage/signed-url'
```

Trova la riga 12 (import esistente, esatto):

```typescript
import type { LavoroDettaglio } from '@/types/domain'
```

Sostituiscila con:

```typescript
import type { LavoroDettaglio, DichiarazioneConformita } from '@/types/domain'
```

Trova:

```typescript
  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio

  const subtitle =
    lavoroDettaglio.paziente_nome_snapshot ?? lavoroDettaglio.descrizione
```

Sostituisci con:

```typescript
  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio

  // Fix trasversale B5: le "public URL" salvate in DB sono rotte (bucket
  // documenti privato) — firma gli URL al momento del render, mai in anticipo.
  // Normalizzazione difensiva: PostgREST può restituire `dichiarazioni_conformita`
  // embedded come oggetto singolo o array a seconda della cardinalità inferita —
  // non assumere una forma specifica per questo confine esterno (mai verificato
  // empiricamente). Riassegna la proprietà così tutto il resto della pagina
  // (incluso il passaggio a TabDocumenti) vede sempre un oggetto singolo coerente.
  const ddcRaw = lavoroDettaglio.ddc as unknown as DichiarazioneConformita | DichiarazioneConformita[] | null
  lavoroDettaglio.ddc = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw

  if (lavoroDettaglio.ddc?.storage_path_pdf) {
    const signedDdcUrl = await getSignedUrl(svc, 'documenti', lavoroDettaglio.ddc.storage_path_pdf, 3600)
    if (signedDdcUrl) lavoroDettaglio.ddc.pdf_url = signedDdcUrl
  }

  if (lavoroDettaglio.immagini.length > 0) {
    await Promise.all(
      lavoroDettaglio.immagini.map(async (img) => {
        const signedImgUrl = await getSignedUrl(svc, 'documenti', img.storage_path, 3600)
        if (signedImgUrl) img.url = signedImgUrl
      })
    )
  }

  const subtitle =
    lavoroDettaglio.paziente_nome_snapshot ?? lavoroDettaglio.descrizione
```

- [ ] **Step 2: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: nessuna regressione sul baseline corrente.

Run: `npx next build`
Expected: build pulita.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/lavori/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
fix(lavori): firma URL DdC/foto in SSR — erano rotti (B5)

Il bucket documenti è privato (verificato: 400 "Bucket not found"
su ogni "public URL" salvata) — il bottone "Apri PDF DdC" in
TabDocumenti.tsx e le foto in TabImmagini.tsx erano quindi rotti
oggi in produzione. Fix: firma server-side al momento del render
della pagina lavoro, scadenza 1h (sessione interna autenticata più
lunga di un link portale pubblico) — nessuna modifica ai componenti
client, ricevono semplicemente url già validi.
EOF
)"
```

---

### Task 8: Bottone "Scarica XML" in `/fatture/[id]`

**Files:**
- Modify: `src/app/(app)/fatture/[id]/page.tsx`

**Interfaces:**
- Consumes: `getSignedUrl()` (Task 1), `fatture.xml_storage_path` (già esistente).

Nessun test dedicato (stesso precedente delle altre pagine SSR di questo piano).

- [ ] **Step 1: Estendi la query e firma l'URL**

In `src/app/(app)/fatture/[id]/page.tsx`, aggiungi l'import:

```typescript
import { getSignedUrl } from '@/lib/storage/signed-url'
```

Trova (riga 24):

```typescript
      xml_url, pdf_url, pec_message_id, pec_consegnata_at,
```

Sostituiscila con:

```typescript
      xml_url, pdf_url, xml_storage_path, pec_message_id, pec_consegnata_at,
```

Trova (righe 32-34):

```typescript
  if (!fattura) redirect('/fatture')

  const f = fattura as Record<string, unknown>
```

Sostituiscile con:

```typescript
  if (!fattura) redirect('/fatture')

  const f = fattura as Record<string, unknown>
  let xmlSignedUrl: string | null = null
  if (f.xml_storage_path) {
    xmlSignedUrl = await getSignedUrl(svc, 'fatture-pdf', f.xml_storage_path as string, 3600)
  }
```

- [ ] **Step 2: Sostituisci il testo statico con un link**

Trova:

```typescript
            <div style={row}><span style={{ color: 'var(--t2)' }}>XML</span><span>{f.xml_url ? '✓ Generato' : 'Non generato'}</span></div>
```

Sostituisci con:

```typescript
            <div style={row}>
              <span style={{ color: 'var(--t2)' }}>XML</span>
              {xmlSignedUrl ? (
                <a
                  href={xmlSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--c-amber, #F59E0B)', fontWeight: 700, textDecoration: 'none' }}
                >
                  Scarica XML
                </a>
              ) : (
                <span>{f.xml_url ? '✓ Generato' : 'Non generato'}</span>
              )}
            </div>
```

- [ ] **Step 3: Verifica globale**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: tutto pulito, nessuna regressione.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/fatture/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(fatture): aggiungi bottone Scarica XML in /fatture/[id] (B5)

Il campo xml_url era già salvato rotto (stesso bug bucket privato)
ma non era mai stato esposto come link cliccabile — solo testo
statico "✓ Generato". Nuovo bottone con URL firmato on-demand in
SSR, stesso pattern del Task 7.
EOF
)"
```

---

### Task 9: Pulizia — elimina `generateEtichetta()` morta

**Files:**
- Modify: `src/lib/pdf/generate-etichetta.ts`
- Modify: `tests/unit/generate-etichetta.test.ts`

**Interfaces:** nessuna — `generateEtichettaBuffer` (la variante realmente usata dalla route `/api/lavori/[id]/etichetta`) resta invariata.

- [ ] **Step 1: Verifica finale che non ci siano chiamanti**

Run: `grep -rn "generateEtichetta\b" src/ tests/ --include="*.ts" --include="*.tsx" | grep -v "generateEtichettaBuffer"`
Expected: solo il file sorgente (definizione) e il test da rimuovere — nessun chiamante applicativo.

- [ ] **Step 2: Elimina la funzione morta**

In `src/lib/pdf/generate-etichetta.ts`, elimina il blocco (dal commento al termine del file, righe 65-103):

```typescript
// ─── Con upload Storage (per orchestratore consegna) ──────────────────────

export async function generateEtichetta(lavoro: LavoroDettaglio) {
  const supabase = getTypedServiceClient()
  const anno = new Date().getFullYear()

  const { data: labRaw } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', lavoro.laboratorio_id)
    .single()
  if (!labRaw) throw new Error('Laboratorio non trovato')
  // Cast puntuale: lo schema reale tipizza laboratori.piano come stringa
  // generica invece della union letterale di domain.ts (vedi generate-dpa.ts).
  const lab = labRaw as Laboratorio

  const installareEntro = calcInstallareEntro(lavoro)

  // Genera PDF
  const buffer = await renderPdfDocument(createElement(EtichettaTemplate, { lavoro, lab, installareEntro }))

  const storagePath = `${lavoro.laboratorio_id}/etichette/${anno}/${lavoro.id}.pdf`

  // Upload su Supabase Storage
  const { error: upErr } = await supabase.storage
    .from('documenti')
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr && !upErr.message.includes('not found')) {
    console.error('[Etichetta] Storage upload failed:', upErr.message)
  }

  const { data: urlData } = supabase.storage
    .from('documenti')
    .getPublicUrl(storagePath)
  const pdfUrl = urlData?.publicUrl ?? ''

  return { url: pdfUrl }
}
```

Il file deve terminare con la chiusura di `generateEtichettaBuffer` (riga 63).

- [ ] **Step 3: Aggiorna il test — rimuovi il describe block morto**

In `tests/unit/generate-etichetta.test.ts`, sostituisci l'intero contenuto con:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateEtichettaBuffer } from '../../src/lib/pdf/generate-etichetta'

describe('generateEtichettaBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera il buffer etichetta con dati completi', async () => {
    const buffer = await generateEtichettaBuffer('lav-test-001', 'lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 4: Verifica**

Run: `npx tsc --noEmit && npx vitest run tests/unit/generate-etichetta.test.ts`
Expected: nessun errore, 1/1 test passa.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-etichetta.ts tests/unit/generate-etichetta.test.ts
git commit -m "$(cat <<'EOF'
chore(pdf): elimina generateEtichetta() — codice morto (B5)

Nessun chiamante in produzione (verificato con grep su tutto il
repo) — solo il proprio test unitario la esercitava. Persisteva su
Storage con lo stesso getPublicUrl() rotto degli altri generatori,
ma non veniva mai invocata: nessun impatto rimuovendola.
generateEtichettaBuffer (la variante realmente usata dalla route
/api/lavori/[id]/etichetta) resta invariata.
EOF
)"
```

---

### Task 10: Pulizia — elimina route API portale orfana

**Files:**
- Delete: `src/app/api/portale/[token]/route.ts`

**Interfaces:** nessuna — nessun consumer esistente (verificato: la pagina SSR `/portale/[token]/page.tsx` fa le proprie query dirette).

- [ ] **Step 1: Verifica finale che non ci siano consumer**

Run: `grep -rn "api/portale/\[token\]'\|api/portale/\${token}\|fetch(\`/api/portale" src/ --include="*.ts" --include="*.tsx" | grep -v "route.ts"`
Expected: nessun risultato (nessun client-side fetch verso questa route).

- [ ] **Step 2: Elimina il file**

```bash
rm "src/app/api/portale/[token]/route.ts"
```

- [ ] **Step 3: Verifica**

Run: `npx tsc --noEmit && npx vitest run && npx next build`
Expected: nessun errore, nessuna regressione, build pulita (la route sparisce dal manifest, atteso).

- [ ] **Step 4: Commit**

```bash
git add -A "src/app/api/portale/[token]/route.ts"
git commit -m "$(cat <<'EOF'
chore(portale): elimina GET /api/portale/[token] — mai consumata (B5)

La pagina SSR /portale/[token]/page.tsx fa le proprie query dirette
e duplica la stessa logica — nessun client fetch mai verso questa
route (verificato su tutto il repo). Nessun impatto rimuovendola.
EOF
)"
```

---

### Task 11: Audit contenuto DdC contro gli 8 elementi Allegato XIII

**Files:**
- Modify (solo se emergono gap reali): `src/components/features/pdf/DdcTemplate.tsx`
- Modify (solo se serve): `tests/unit/ddc-pdf-content.test.ts`

**Interfaces:** nessuna nuova — audit di contenuto, non di struttura.

- [ ] **Step 1: Leggi il template e la checklist normativa**

Run: `cat src/components/features/pdf/DdcTemplate.tsx`
Run: `sed -n '85,135p' ../ANALISI/17_adempimenti_lab_2026.md` (checklist 8 elementi Allegato XIII, già riportata nella spec di questo lavoro)

Run: `grep -n "it(" tests/unit/ddc-pdf-content.test.ts` per vedere cosa è già testato.

- [ ] **Step 2: Verifica ciascuno degli 8 elementi contro il template + i test esistenti**

Per ciascuno di questi 8 punti, verifica se il template lo renderizza E se un test esistente lo copre. Segna ogni gap trovato:

1. Nome e indirizzo del fabbricante (ragione sociale, sede, P.IVA, ITCA, **SRN EUDAMED**) — verificato: §1 testa ragione sociale/indirizzo/P.IVA/ITCA, **verifica se SRN EUDAMED è testato** (non risulta nella lista attuale — cerca `srn_eudamed` nel template).
2. Dati identificativi del dispositivo (tipologia, dente/arcata, materiale, colore, **numero lavoro**) — §5 copre tipo/descrizione/dente/materiale, **verifica se il numero lavoro è esplicitamente testato in questa sezione** (potrebbe esserlo solo implicitamente altrove).
3. Dichiarazione "fabbricato su misura" — **cerca nel template la formula esatta** (non risulta un test dedicato con questo titolo — verifica se il testo è presente comunque, magari dentro il blocco §7).
4. Nome del paziente — coperto (§4).
5. Nome del prescrittore — coperto (§3).
6. Caratteristiche specifiche Classe IIa — §6 copre la classe di rischio; verifica se per Classe IIa specificamente il template aggiunge dettagli tecnici particolari o se tratta tutte le classi allo stesso modo (potrebbe essere corretto anche se identico, la normativa non impone un contenuto extra specifico oltre alla classificazione stessa — annota la conclusione).
7. Dichiarazione conformità Allegato I — §7 copre Allegato XIII/Reg UE 2017/745/Art 52(8)/"conforme ai requisiti" — **verifica esplicitamente se il testo cita "Allegato I"** (la formula esatta da `ANALISI/17` include entrambi "Allegato I" e "Allegato XIII" — un test che verifica solo "Allegato XIII" potrebbe non coprire la citazione separata di "Allegato I").
8. Luogo, data, firma — §2 copre la data di emissione; **verifica se `luogo_emissione` è renderizzato e testato** (il campo esiste nel tipo `DichiarazioneConformita.luogo_emissione` — verifica se il template lo stampa e se un test lo asserisce).

Verifica anche:
- Nessun riferimento residuo a "93/42/CEE" nel template (`grep -n "93/42" src/components/features/pdf/DdcTemplate.tsx` — expected: 0 risultati).
- Dicitura corretta per dispositivi su misura: "non soggetto a marcatura CE ai sensi dell'Art. 20(1) MDR" presente nel template.

- [ ] **Step 3: Per ogni gap reale trovato, scrivi un test che fallisce (RED)**

Per ciascun elemento risultato mancante o non testato allo Step 2, aggiungi in `tests/unit/ddc-pdf-content.test.ts` un test con lo stesso pattern degli esistenti (stessa fixture `beforeAll`, stesso `pdfText`), ad esempio (adatta al gap reale trovato):

```typescript
  it('§1 stampa SRN EUDAMED del fabbricante', () => {
    expect(pdfText).toContain(LAB_FIXTURE.srn_eudamed)
  })
```

Esegui `npx vitest run tests/unit/ddc-pdf-content.test.ts` dopo ogni nuovo test aggiunto — se PASSA subito, il template era già corretto e il test serve solo da documentazione/regressione (nessun fix necessario per quel punto). Se FALLISCE, procedi allo Step 4 per quel gap specifico.

- [ ] **Step 4: Se un test fallisce, correggi `DdcTemplate.tsx` (solo per i gap reali confermati)**

Applica la modifica minima al template per soddisfare il test fallito — non modificare altro contenuto del template oltre al gap specifico. Rilancia il test dopo ogni fix per confermare GREEN.

Nota: se allo Step 2/3 **non emerge alcun gap reale** (tutti gli 8 elementi già presenti e già testati), questo task produce solo i nuovi test aggiuntivi come documentazione/regressione (es. SRN EUDAMED, luogo emissione, dicitura marcatura CE) senza toccare il template — è un esito legittimo, non un fallimento del task.

- [ ] **Step 5: Verifica globale**

Run: `npx tsc --noEmit && npx vitest run`
Expected: nessun errore, nessuna regressione, tutti i nuovi test verdi.

- [ ] **Step 6: Commit**

```bash
git add tests/unit/ddc-pdf-content.test.ts src/components/features/pdf/DdcTemplate.tsx
git commit -m "$(cat <<'EOF'
test(pdf): audit contenuto DdC contro 8 elementi Allegato XIII (B5)

Verifica sistematica di DdcTemplate.tsx contro la checklist
normativa completa (ANALISI/17 §1.2) — aggiunti test di copertura
per gli elementi non ancora verificati esplicitamente (SRN EUDAMED,
luogo emissione, dicitura marcatura CE Art. 20(1), citazione
esplicita Allegato I). [Aggiungere qui, se presente: descrizione
del fix applicato al template per il gap reale trovato.]
EOF
)"
```

---

### Task 12: Audit contenuto Buono (completezza, nessun vincolo normativo)

**Files:**
- Modify (solo se emergono gap reali): `src/components/features/pdf/BuonoTemplate.tsx`
- Modify (solo se serve): nuovo test o estensione di uno esistente per il contenuto del Buono

**Interfaces:** nessuna nuova.

- [ ] **Step 1: Verifica se esiste già un test di contenuto per il Buono**

Run: `grep -n "it(" tests/unit/*.test.ts | grep -i buono`

Se non esiste un test di contenuto dedicato (solo `generate-buono.test.ts` che testa il generatore, non il rendering), crea `tests/unit/buono-pdf-content.test.ts` seguendo lo stesso pattern di `tests/unit/scheda-fabbricazione-pdf-content.test.ts` (render reale + `pdf-parse`, fixture da `./helpers/pdf-fixtures`):

```typescript
// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { BuonoTemplate } from '@/components/features/pdf/BuonoTemplate'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

let pdfText = ''

describe('BuonoTemplate — audit di completezza (nessun vincolo normativo MDR)', () => {
  beforeAll(async () => {
    const element = createElement(BuonoTemplate, { lavoro: LAVORO_FIXTURE, lab: LAB_FIXTURE, numeroBuono: 'BUO-2026-0001' })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    pdfText = result.text
  }, 30_000)

  it('stampa il numero del buono', () => {
    expect(pdfText).toContain('BUO-2026-0001')
  })

  it('stampa il numero lavoro', () => {
    expect(pdfText).toContain(LAVORO_FIXTURE.numero_lavoro)
  })

  it('stampa la ragione sociale del laboratorio', () => {
    expect(pdfText).toContain(LAB_FIXTURE.ragione_sociale)
  })

  it('stampa i dati del cliente/studio', () => {
    expect(pdfText).toContain(LAVORO_FIXTURE.cliente.studio_nome ?? LAVORO_FIXTURE.cliente.cognome)
  })
})
```

- [ ] **Step 2: Esegui il test**

Run: `npx vitest run tests/unit/buono-pdf-content.test.ts`

Se un'asserzione fallisce, leggi `BuonoTemplate.tsx` per capire se il dato manca davvero nel rendering o se la fixture/asserzione va corretta (es. campo con nome diverso). Se è un gap reale di contenuto (dato atteso ma non renderizzato), applica il fix minimo al template.

- [ ] **Step 3: Verifica globale**

Run: `npx tsc --noEmit && npx vitest run`
Expected: nessun errore, nessuna regressione.

- [ ] **Step 4: Commit**

```bash
git add tests/unit/buono-pdf-content.test.ts src/components/features/pdf/BuonoTemplate.tsx
git commit -m "$(cat <<'EOF'
test(pdf): audit completezza contenuto Buono (B5)

Nessun vincolo normativo MDR per il Buono (verificato: ANALISI/17
non lo menziona — documento commerciale/di consegna interno).
Audit di completezza generale: numero buono, numero lavoro, dati
laboratorio e cliente presenti nel PDF renderizzato.
EOF
)"
```

---

### Task 13: Verifica finale e aggiornamento memoria progetto

**Files:**
- Modify: `memory/MEMORY.md`
- Modify: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B5)
- Modify: `memory/SESSION_ACTIVE.md`

Nessun nuovo codice in questo task — solo verifica end-to-end e aggiornamento della documentazione obbligatoria (BP-1, CLAUDE.md §0A).

- [ ] **Step 1: Verifica finale completa**

Run: `npx tsc --noEmit`
Expected: 0 errori.

Run: `npx vitest run`
Expected: baseline (verificare il conteggio reale a inizio task) + tutti i nuovi test dei Task 1-8, 11, 12 — nessuna regressione.

Run: `npx next build`
Expected: build production pulita, nuova route `/api/portale/[token]/lavori/[lavoro_id]/[documento]` presente nel manifest, route `/api/portale/[token]` (semplice) assente (eliminata Task 10).

- [ ] **Step 2: Aggiorna `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`**

Nella sezione `### B5.`, aggiungi un paragrafo "✅ RISOLTO (data)" in testa alla sezione narrativa esistente (stesso pattern già usato per B9/B10/B11/B12/B15/B17/B20), senza cancellare la descrizione originale (etichettata "Descrizione originale del bug (storico)"). Includi: la scoperta del gap WhatsApp mai inviato, il bug trasversale delle "public URL" rotte (bucket privato), tutti i fix applicati, riferimento a spec (`docs/superpowers/specs/2026-07-05-b5-download-portale-e-signed-url-design.md`) e piano. Aggiorna la riga tabella B5 da `⏳` a `✅` con data/commit.

- [ ] **Step 3: Aggiorna `memory/MEMORY.md`**

Aggiungi una nuova voce in testa al file (stesso stile prosa densa già usato): cosa era rotto (WhatsApp mai inviato, portale senza UI, URL pubbliche rotte su bucket privato — impatto anche su TabDocumenti/TabImmagini/fatture), causa radice comune, fix applicato per ciascun filone, migration applicata, esito dell'audit contenuto DdC/Buono (Task 11/12), verifica finale (conteggio test reale, tsc/build puliti).

- [ ] **Step 4: Aggiorna `memory/SESSION_ACTIVE.md`**

Sostituisci il contenuto (non appendere) con un handoff sintetico: B5 risolto in questo lavoro (worktree/branch secondo lo schema usato), non ancora mergiato su `main`, prossima priorità da decidere tra i blocker rimanenti (B6, B14, B16, B20).

- [ ] **Step 5: Commit della documentazione**

```bash
git add memory/MEMORY.md memory/SESSION_ACTIVE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "$(cat <<'EOF'
docs: aggiorna memoria progetto — B5 risolto (download portale + URL firmati)

Ricerca approfondita aveva ampliato lo scope oltre la descrizione
originale: WhatsApp al dentista mai inviato, URL pubbliche rotte su
bucket privato (rompeva anche TabDocumenti/TabImmagini/fatture).
Tutti i filoni corretti con helper condiviso getSignedUrl(), un'unica
migration. Audit contenuto DdC/Buono eseguito. Verificato: tsc/vitest/
next build puliti.
EOF
)"
```

## Nota su isolamento (worktree)

Da eseguire in un worktree isolato dedicato (`superpowers:using-git-worktrees`), separato da qualunque altro worktree attivo. Una migration (Task 2) — applicarla al DB live solo con conferma esplicita di Francesco, poi rigenerare i tipi.

## Nota per la prossima sessione — QA browser consigliata post-merge

Prima del merge finale, nel lab E2E isolato (mai il lab Filippo):
- Consegna reale da `/lavori/[id]/consegna` → verificare che il bottone "Invia messaggio WhatsApp" appaia e apra `wa.me` con il link portale corretto
- Consegna reale da Front Desk → bottone CONSEGNA diventa bottone WHATSAPP esplicito, click apre la scheda WhatsApp corretta e la riga scompare
- Portale dentista, lavoro consegnato con DdC/Buono generati → entrambi i link di download funzionano, PDF scaricato è quello corretto
- Portale, lavoro consegnato senza DdC/Buono (storico) → nessun link mostrato, nessun errore
- `/lavori/[id]` tab Docs → "Apri PDF" apre il PDF correttamente (non più 400)
- `/lavori/[id]` tab Foto → foto del lavoro visibili (non più immagini rotte)
- `/fatture/[id]` → bottone "Scarica XML" funzionante quando XML generato

Dati di test da rimuovere a fine QA, mai sul lab Filippo.
