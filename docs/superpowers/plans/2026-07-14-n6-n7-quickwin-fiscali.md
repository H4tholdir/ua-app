# Quick-win fiscali N6 + N7 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blindare la route di generazione XML contro la rigenerazione di una fattura già emessa (N7) e fissare in modo durevole l'invariante "il bollo €2 non entra nel dovuto pre-fattura" come decisione intenzionale (N6-C).

**Architecture:** N7 = gate allowlist `stato_sdi === 'draft'` nella route API (non nell'helper condiviso), risposta 409 prima di qualsiasi side-effect. N6 = zero logica nuova: commento-invariante nella contabilità + un test-decisione che congela la semantica del bollo + aggiornamento backlog.

**Tech Stack:** Next.js 16 route handlers, Vitest, TypeScript, Supabase (mock nei test).

## Global Constraints

- Dominio **FatturaPA** → percorso GRANDE (BP-2): TDD puro, review fiscale, output reale FASE 7.
- **Commit separati** per N7 e N6 (item indipendenti, rollback indipendente).
- **Nessuna migration**, nessun tocco a schema/RLS.
- N7 status code = **409** (conflitto di stato, non 422).
- N7 gate nella **route** [src/app/api/fatture/[id]/xml/route.ts], **mai** dentro `generaFatturaPA` (condiviso col flusso Consegna auto-emit).
- `prezzoEffettivoLavoro` **non deve mai** includere il bollo (alimenta l'imponibile XML che deve restare bollo-free).
- Naming test in `tests/unit/`, kebab-case. Commit format: `feat(fattura): …` / `docs(fattura): …`.
- Spec di riferimento: `docs/superpowers/specs/2026-07-14-n6-n7-quickwin-fiscali-design.md`.

---

### Task 1: N7 — Gate `stato_sdi` sulla route XML

**Files:**
- Create: `tests/unit/fatture-xml-gate-stato-sdi.test.ts`
- Modify: `src/app/api/fatture/[id]/xml/route.ts` (dopo il blocco `fatturaCheck`, righe 63-72)

**Interfaces:**
- Consumes: `POST` da `src/app/api/fatture/[id]/xml/route.ts`; `fatturaCheck.stato_sdi` (già selezionato, riga 65).
- Produces: nuovo comportamento della route — `409` quando `stato_sdi !== 'draft'`. Nessuna nuova esportazione.

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `tests/unit/fatture-xml-gate-stato-sdi.test.ts` (stesso harness di `fatture-xml-errori.test.ts`):

```typescript
// tests/unit/fatture-xml-gate-stato-sdi.test.ts
// N7: POST /api/fatture/[id]/xml deve rifiutare (409) la rigenerazione di una
// fattura già emessa (stato_sdi !== 'draft'). Il gate vive nella ROUTE, PRIMA
// del loop generaFatturaPA — così non ri-deriva l'imponibile dal lavoro vivo e
// NON brucia un progressivo SDI (generaProgressivo è dentro generaFatturaPA).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockGeneraFatturaPA, lavoriResult, fatturaStato } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockGeneraFatturaPA: vi.fn(),
  lavoriResult: { value: { data: [] as unknown, error: null as unknown } },
  fatturaStato: { value: 'draft' as string },
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: mockGeneraFatturaPA }))
vi.mock('@/lib/fattura/send-pec', () => ({ sendFatturaPEC: vi.fn() }))

import { POST } from '../../src/app/api/fatture/[id]/xml/route'

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  c.single = async () => result
  return c
}
function lavoriChain() {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  Object.defineProperty(c, 'data', { get: () => (lavoriResult.value as { data: unknown }).data })
  Object.defineProperty(c, 'error', { get: () => (lavoriResult.value as { error: unknown }).error })
  return c
}
function req() {
  return new Request('http://localhost/api/fatture/fat-1/xml', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify({ lavori_ids: ['lav-1'] }),
  })
}
const ctx = { params: Promise.resolve({ id: 'fat-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  lavoriResult.value = { data: [{ id: 'lav-1', numero_lavoro: 'n.1', laboratorio_id: 'lab-1' }], error: null }
  fatturaStato.value = 'draft'
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockGeneraFatturaPA.mockResolvedValue({ numero: '2026-0001', stato_sdi: 'generata' })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1' }, error: null })
    if (table === 'fatture')
      return chain({ data: { id: 'fat-1', numero: '2026-0001', stato_sdi: fatturaStato.value }, error: null })
    if (table === 'lavori') return lavoriChain()
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/fatture/[id]/xml — gate stato_sdi (N7)', () => {
  it('fattura già generata → 409 e generaFatturaPA NON chiamata (nessun progressivo SDI bruciato)', async () => {
    fatturaStato.value = 'generata'
    const res = await POST(req(), ctx)
    expect(res.status).toBe(409)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it('fattura in stato inviata → 409 (allowlist: solo draft passa)', async () => {
    fatturaStato.value = 'inviata'
    const res = await POST(req(), ctx)
    expect(res.status).toBe(409)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
  })

  it('fattura draft → procede: generaFatturaPA chiamata, non 409', async () => {
    fatturaStato.value = 'draft'
    const res = await POST(req(), ctx)
    expect(res.status).not.toBe(409)
    expect(mockGeneraFatturaPA).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/fatture-xml-gate-stato-sdi.test.ts`
Expected: FAIL — i due test `generata`/`inviata` ottengono uno status ≠ 409 (la route oggi procede e chiama `generaFatturaPA`).

- [ ] **Step 3: Implementa il gate minimale**

In `src/app/api/fatture/[id]/xml/route.ts`, subito **dopo** il blocco `fatturaCheck` (la `if (fatturaCheckErr || !fatturaCheck)` che finisce a riga 72), **prima** del commento `// ── Carica i lavori associati`, inserisci:

```typescript
  // ── Gate stato_sdi (N7) ───────────────────────────────────────────────────
  // Allowlist: solo una fattura ancora in bozza può essere (ri)generata. Una
  // fattura già emessa (generata/inviata/…) ri-deriverebbe l'imponibile dal
  // lavoro VIVO e brucerebbe un progressivo SDI (generaProgressivo è dentro
  // generaFatturaPA). Il gate vive qui, PRIMA del loop, non nell'helper
  // (condiviso col flusso Consegna auto-emit). Spec: N7 2026-07-14.
  if (fatturaCheck.stato_sdi !== 'draft') {
    return NextResponse.json(
      { error: `Fattura già emessa (stato: ${fatturaCheck.stato_sdi ?? 'sconosciuto'}). Rigenerazione non consentita.` },
      { status: 409 }
    )
  }
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `npx vitest run tests/unit/fatture-xml-gate-stato-sdi.test.ts`
Expected: PASS (3 test verdi).

- [ ] **Step 5: Regressione mirata + tsc**

Run: `npx vitest run tests/unit/fatture-xml-errori.test.ts tests/unit/fatture-xml-gate-stato-sdi.test.ts && npx tsc --noEmit`
Expected: tutti verdi, 0 errori TypeScript. (I test errori usano `stato_sdi: 'draft'` nel mock → non toccati dal gate.)

- [ ] **Step 6: Commit**

```bash
git add tests/unit/fatture-xml-gate-stato-sdi.test.ts src/app/api/fatture/[id]/xml/route.ts
git commit -m "feat(fattura): gate stato_sdi su route XML (N7 — 409 se non draft)

Rifiuta la rigenerazione di una fattura già emessa PRIMA del loop
generaFatturaPA: evita la ri-derivazione dell'imponibile dal lavoro vivo e
il consumo di un progressivo SDI. Gate allowlist nella route, non nell'helper
condiviso col flusso Consegna. Spec: 2026-07-14-n6-n7-quickwin-fiscali-design.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: N6 — Documenta l'invariante "bollo fuori dal dovuto pre-fattura" (decisione C)

**Files:**
- Create: `tests/unit/contabilita-bollo-n6.test.ts`
- Modify: `src/lib/contabilita/queries.ts` (commento-invariante presso il calcolo residuo dei lavori diretti, ~riga 277)
- Modify: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (§N6 → ✅ documentato)

**Interfaces:**
- Consumes: `prezzoEffettivoLavoro` da `@/lib/domain/prezzo-lavoro`.
- Produces: nessuna nuova API. Un test-decisione che congela la semantica; un commento durevole; backlog aggiornato.

- [ ] **Step 1: Scrivi il test-decisione che documenta l'invariante N6**

Crea `tests/unit/contabilita-bollo-n6.test.ts`:

```typescript
// tests/unit/contabilita-bollo-n6.test.ts
// N6 (decisione C, spec 2026-07-14): il dovuto PRE-FATTURA è tenuto
// sull'imponibile SENZA bollo; il bollo di €2 (imponibile > 77,47€) è
// un'imposta documentale che matura con l'EMISSIONE e finisce solo in
// fatture.totale. La differenza di €2 tra pre-fattura e fatturato è
// INTENZIONALE, non un drift.
//
// Questo test congela la decisione: se un domani qualcuno "correggesse" il
// salto piegando il bollo dentro prezzoEffettivoLavoro (opzione A fatta male),
// questo test rompe e punta alla spec.
import { describe, it, expect } from 'vitest'
import { prezzoEffettivoLavoro } from '@/lib/domain/prezzo-lavoro'

// Regola bollo, unica fonte in generate-xml.ts (qui replicata SOLO per
// asserire il contrasto pre/post — NON è codice di produzione).
const bolloAtteso = (imponibile: number) => (imponibile > 77.47 ? 2.0 : 0)

describe('N6 — il bollo NON entra nel dovuto pre-fattura', () => {
  it('prezzoEffettivoLavoro (dovuto pre-fattura) resta bollo-free anche sopra soglia', () => {
    // Lavoro con righe che sommano a 100 (> 77,47): imponibile puro.
    const lavoro = {
      prezzo_unitario: 999,
      lavorazioni: [{ importo: 60 }, { importo: 40 }],
    } as never
    const dovutoPreFattura = prezzoEffettivoLavoro(lavoro)
    expect(dovutoPreFattura).toBe(100) // nessun +2: il bollo non esiste ancora
  })

  it('il totale fattura per lo stesso imponibile include il bollo: salto di €2 intenzionale', () => {
    const imponibile = prezzoEffettivoLavoro({
      prezzo_unitario: null,
      lavorazioni: [{ importo: 100 }],
    } as never)
    const totaleFattura = imponibile + bolloAtteso(imponibile)
    expect(imponibile).toBe(100)          // pre-fattura (contabilità)
    expect(totaleFattura).toBe(102)       // post-fattura (fatture.totale)
    expect(totaleFattura - imponibile).toBe(2) // il salto documentato
  })

  it('sotto soglia (≤ 77,47€) non c\'è bollo: nessun salto', () => {
    const imponibile = prezzoEffettivoLavoro({
      prezzo_unitario: null,
      lavorazioni: [{ importo: 50 }],
    } as never)
    expect(imponibile + bolloAtteso(imponibile)).toBe(50)
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che passi (documenta lo stato attuale)**

Run: `npx vitest run tests/unit/contabilita-bollo-n6.test.ts`
Expected: PASS (3 test verdi) — il test documenta il comportamento già corretto; non richiede modifiche al codice di produzione. Se fallisce, `prezzoEffettivoLavoro` sta già facendo qualcosa di inatteso col bollo → fermarsi e verificare.

- [ ] **Step 3: Aggiungi il commento-invariante nella contabilità**

In `src/lib/contabilita/queries.ts`, dentro `getContabilitaCliente`, **subito prima** della riga `const residuo = calcolaResiduo(totaleLav, pagamentiAttivi, applicazioni)` (~riga 277), inserisci:

```typescript
    // INVARIANTE N6 (decisione C, spec 2026-07-14): il dovuto pre-fattura è
    // calcolato sull'imponibile SENZA bollo. Il bollo di €2 (imponibile >
    // 77,47€) è imposta documentale che nasce con l'emissione e vive solo in
    // fatture.totale — la differenza di €2 tra "lavoro dovuto" e "fattura" è
    // INTENZIONALE, non un drift. NON piegare mai il bollo dentro
    // prezzoEffettivoLavoro: alimenta l'imponibile XML, che deve restare
    // bollo-free. Guardia: tests/unit/contabilita-bollo-n6.test.ts.
```

- [ ] **Step 4: Verifica che nulla si sia rotto (tsc + suite contabilità)**

Run: `npx vitest run tests/unit/contabilita-queries.test.ts tests/unit/contabilita-bollo-n6.test.ts && npx tsc --noEmit`
Expected: verdi, 0 errori (il commento non cambia la logica).

- [ ] **Step 5: Aggiorna il BACKLOG (§N6 → documentato)**

In `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`, nella riga di intestazione della sezione N6 (attualmente `### N6. "Bollo nel dovuto": …`), aggiungi lo stato risolto all'inizio del corpo della sezione. Inserisci **subito dopo** il titolo `### N6.` una riga:

```markdown
> ✅ **DOCUMENTATO (14/07/2026, decisione C)** — spec `docs/superpowers/specs/2026-07-14-n6-n7-quickwin-fiscali-design.md`. Il bollo è imposta documentale che matura con l'emissione: il dovuto pre-fattura resta sull'imponibile per correttezza fiscale, il salto di €2 è intenzionale. Invariante congelato in `src/lib/contabilita/queries.ts` + guardia `tests/unit/contabilita-bollo-n6.test.ts`. Nessuna modifica di logica.
```

- [ ] **Step 6: Commit**

```bash
git add tests/unit/contabilita-bollo-n6.test.ts src/lib/contabilita/queries.ts docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "docs(fattura): fissa invariante bollo fuori dal dovuto pre-fattura (N6 — decisione C)

Il bollo €2 matura con l'emissione della fattura; il dovuto pre-fattura resta
sull'imponibile per correttezza fiscale. Salto di €2 intenzionale, documentato
con commento-invariante nella contabilità + test-decisione che congela la
semantica (guardia anti-regressione). Nessuna logica cambiata.
Spec: 2026-07-14-n6-n7-quickwin-fiscali-design.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## FASE 7 — Verifica finale (dopo entrambi i task)

- [ ] `npx tsc --noEmit` → 0 errori
- [ ] `npx vitest run` → suite intera verde (inclusi i 2 nuovi file)
- [ ] `npx next build` → build production ok

## FASE 8-9 — Review + QA

- [ ] Review indipendente (`/gsd-code-review` + `superpowers:requesting-code-review`), focus fiscale su N7.
- [ ] QA N7 nel lab E2E `00000000-0000-0000-0000-000000000001`: emetti una fattura (draft→generata), ri-invoca `POST /api/fatture/[id]/xml` → **409**, verifica progressivo SDI **non** incrementato.
- [ ] Nessun gate estetico L2 (nessuna superficie UI toccata).

## FASE 10-11 — Merge (gate Francesco) + BP-1

- [ ] Merge/push solo dopo OK esplicito di Francesco; attendi CI verde + verifica uachelab.com.
- [ ] BP-1: aggiorna MEMORY.md + ROADMAP-UFFICIALE.md + BACKLOG (N6/N7) + SESSION_ACTIVE.md.

---

## Self-Review (svolto)

- **Spec coverage:** N7 gate → Task 1; N6 documentazione+test+backlog → Task 2. Vincolo "prezzoEffettivoLavoro bollo-free" → asserito in Task 2 Step 1. FASE 7/QA/rollback → sezioni finali. ✅
- **Placeholder scan:** nessun TBD/TODO; ogni step ha codice/comando reale. ✅
- **Type consistency:** `fatturaCheck.stato_sdi` esiste (select riga 65); `prezzoEffettivoLavoro(lavoro)` firma esistente; harness mock identico a `fatture-xml-errori.test.ts`. ✅
