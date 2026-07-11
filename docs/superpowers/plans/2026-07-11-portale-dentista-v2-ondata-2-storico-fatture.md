# Portale Dentista v2 — Ondata 2: Storico Fatture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il dentista vede nel portale (dietro PIN) lo storico delle fatture emesse verso di lui e scarica la copia di cortesia PDF con signed URL (pattern B5); contestualmente si chiude l'igiene I-6 (stop alla persistenza di URL pubblici in `fatture.xml_url`).

**Architettura:** La copia di cortesia PDF nasce **nello stesso momento dell'XML** dentro `generaFatturaPA` (stessi dati in memoria → coerenza fiscale garantita; se il PDF fallisce, il draft resta draft e il retry è pulito). Il portale la serve con il pattern B5 già vivo (redirect 307 a signed URL 300s + audit fail-loud). La lista fatture riusa `guardieEconomiche` (token + interruttore + sessione PIN) e si monta dentro l'area riservata esistente di `FatturazioneSection`.

**Tech Stack:** Next.js 16 App Router · Supabase (Storage bucket privato `fatture-pdf`, service client) · @react-pdf/renderer · Vitest.

**Spec di riferimento:** `docs/superpowers/specs/2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md` §3 (Ondata 2), §4 (audit F9: azione `download_fattura`), §7 (regole trasversali API portale).

## Esito pre-check I-6 (eseguito 11/07/2026 — VERDE)

- Bucket `fatture-pdf` **privato** (`storage.buckets.public = false` sul DB live) con RLS di lettura solo membri lab (`lab_memberships` su `foldername[1] = laboratorio_id`). **Nessuna porta aperta.**
- `generaFatturaPA` persiste però un `getPublicUrl` (inerte su bucket privato) in `fatture.xml_url` → igiene inclusa in questa ondata: si smette di scrivere e leggere `xml_url` (la colonna resta in schema, deprecata via COMMENT).
- Sul DB live: 1 sola fattura (draft), 0 righe con `xml_url`, 0 con `xml_storage_path` → zero backfill.
- Consumer già pronti: `send-pec.ts` preferisce il signed URL, la pagina fattura lab usa già `getSignedUrl`; `xml_url` sopravvive solo come flag/fallback → rimosso in Task 5.

## Global Constraints

- **Dominio critico** (fiscale + portale esposto) → percorso Grande BP-2; migration ⇒ FASE 6b obbligatoria (`npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit`).
- Migration applicate al DB live SOLO da Francesco via `npx supabase db push` con conferma esplicita — MAI MCP `apply_migration` (lezione B21).
- Route economiche portale: risposta **uniforme** `{ errore: 'non_autorizzato' }` 401 per token invalido/scaduto (audit F13); mai messaggi Postgres grezzi nelle risposte; audit economico **fail-loud** con IP/UA (spec §4).
- Ogni query portale filtrata `laboratorio_id` + `cliente_id` del token (fail-closed); niente nomi paziente in chiaro (`minimizzaPhi`).
- UI nuova ⇒ gate mockup CLAUDE.md §0B: mockup HTML in `docs/design/mockups/` (MAI /tmp) → screenshot → approvazione Francesco → poi React. PNG mockup richiedono `git add -f`.
- Suite baseline: **1250 passed | 4 skipped** — mai regressioni; `tsc --noEmit` e `npx next build` puliti a fine ondata.
- QA browser: lab E2E `00000000-0000-0000-0000-000000000001`, MAI il lab Filippo; dev server nel worktree con `PORT=xxxx npm run dev` (NON `preview_start`, che lancia il checkout principale).
- Copia di cortesia: dicitura obbligatoria "Copia di cortesia priva di valore fiscale — l'originale è la fattura elettronica trasmessa al Sistema di Interscambio."
- Esecuzione in worktree dedicato (`ondata-2-storico-fatture`); copiare `.env.local` nel worktree.

---

### Task 1: Migration `fatture.pdf_storage_path` + deprecazione `xml_url` — GATE apply + FASE 6b

**Files:**
- Create: `supabase/migrations/20260711100000_fatture_pdf_cortesia.sql`
- Regenerate: `src/types/database.types.ts` (FASE 6b, dopo l'apply)

**Interfaces:**
- Produces: colonna `fatture.pdf_storage_path text NULL` (usata da Task 4, 6, 7); tipi rigenerati.

- [ ] **Step 1: Scrivi il file migration**

```sql
-- Ondata 2 Portale Dentista v2 — storico fatture (spec §3 Ondata 2).
-- Additiva, zero backfill: al 11/07/2026 in prod esiste 1 sola fattura (draft),
-- 0 righe con xml_url o xml_storage_path valorizzati.

-- Copia di cortesia PDF della fattura: path nel bucket privato 'fatture-pdf',
-- scritta da generaFatturaPA nello stesso momento dell'XML (coerenza fiscale).
ALTER TABLE public.fatture ADD COLUMN IF NOT EXISTS pdf_storage_path text NULL;
COMMENT ON COLUMN public.fatture.pdf_storage_path IS
  'Path storage (bucket privato fatture-pdf) della copia di cortesia PDF, generata insieme all''XML da generaFatturaPA. Servita solo via signed URL.';

-- Igiene I-6: il bucket è privato, gli URL "pubblici" persistiti qui sono inerti.
-- Da questa migration nessun codice scrive o legge più xml_url.
COMMENT ON COLUMN public.fatture.xml_url IS
  'DEPRECATA dall''11/07/2026 (audit I-6): il bucket fatture-pdf è privato, gli URL pubblici sono inerti. Usare xml_storage_path + signed URL. Nessun writer/reader nel codice.';
```

- [ ] **Step 2: Commit del file migration**

```bash
git add supabase/migrations/20260711100000_fatture_pdf_cortesia.sql
git commit -m "feat(db): add fatture.pdf_storage_path per copia di cortesia (Ondata 2) + deprecazione xml_url (I-6)"
```

- [ ] **Step 3: GATE — Francesco applica la migration al DB live**

FERMARSI e chiedere a Francesco di eseguire (o autorizzare esplicitamente):
```bash
npx supabase db push
```
Atteso: la sola migration `20260711100000` applicata. MAI procedere senza conferma esplicita. MAI usare MCP `apply_migration`.

- [ ] **Step 4: FASE 6b — rigenera i tipi e verifica**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
# rimuovere l'eventuale riga di messaggio CLI in fondo al file
npx tsc --noEmit
```
Atteso: `pdf_storage_path` presente nel tipo `fatture`; tsc 0 errori.

- [ ] **Step 5: Commit dei tipi**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerate database.types.ts (fatture.pdf_storage_path)"
```

---

### Task 2: Mockup sezione «Fatture» del portale — GATE approvazione Francesco

**Files:**
- Create: `docs/design/mockups/2026-07-11-portale-storico-fatture.html`
- Create: `docs/design/mockups/screenshots/2026-07-11-portale-storico-fatture-390.png` (git add -f)
- Create (dopo approvazione): `docs/design/decisions/2026-07-11-portale-storico-fatture.md`

**Interfaces:**
- Produces: layout approvato che Task 8 implementa fedelmente.

- [ ] **Step 1: Scrivi il mockup HTML**

Mockup statico mobile-first (390px) coerente con lo stile del portale esistente (sfondo `#F8F9FA`, card bianche radius 16-20px, DM Sans, shadow leggere — vedi `FatturazioneSection.tsx` e il mockup approvato `2026-07-10-portale-da-fatturare.html`). Contenuto:
- La sezione «Fatture» compare DENTRO l'area riservata (stesso contenitore sbloccato dal PIN), SOTTO la lista «Da fatturare».
- Header sezione: titolo "Fatture" (h2, 19px, 700).
- Gruppi per anno (etichetta uppercase grigia, es. "2026").
- Riga fattura (card bianca): a sinistra numero ("Fattura 2026-0001"; per TD04 "Nota di credito 2026-0003") e data estesa it-IT; a destra totale (16px, 700) e bottone "📄 PDF" (min-height 44px) che punta al download; se il PDF non è disponibile, nessun bottone.
- Stato vuoto: card con icona 🧾 e "Nessuna fattura emessa finora."
- Dati simulati realistici: 3 fatture su 2 anni (2026×2 di cui una nota di credito, 2025×1), importi con `Intl.NumberFormat it-IT EUR`.

- [ ] **Step 2: Screenshot Playwright a 390px**

```bash
# dal repo ua-app (usare lo strumento browser/gstack disponibile in sessione)
# viewport 390x844, screenshot full-page del mockup file://
```
Salva in `docs/design/mockups/screenshots/2026-07-11-portale-storico-fatture-390.png`.

- [ ] **Step 3: GATE — mostra lo screenshot a Francesco e attendi «ok procedi»**

FERMARSI. Nessun codice React della sezione prima dell'approvazione esplicita. Recepire eventuali modifiche nel mockup e ripetere lo screenshot.

- [ ] **Step 4: Documenta la decisione e committa**

`docs/design/decisions/2026-07-11-portale-storico-fatture.md`: data, screenshot di riferimento, scelte (posizione sotto Da fatturare, raggruppamento per anno, niente stato pagamento — rinviato a Ondata 3 per spec §3).

```bash
git add docs/design/mockups/2026-07-11-portale-storico-fatture.html docs/design/decisions/2026-07-11-portale-storico-fatture.md
git add -f docs/design/mockups/screenshots/2026-07-11-portale-storico-fatture-390.png
git commit -m "docs(design): mockup approvato sezione Fatture portale (Ondata 2)"
```

---

### Task 3: Template PDF copia di cortesia

**Files:**
- Create: `src/components/features/pdf/FatturaCortesiaTemplate.tsx`
- Test: `tests/unit/fattura-cortesia-template.test.ts`

**Interfaces:**
- Produces: `FatturaCortesiaTemplate(props: FatturaCortesiaProps)` e il tipo esportato:

```typescript
export interface FatturaCortesiaProps {
  lab: {
    denominazione: string
    partita_iva: string
    indirizzo: string | null
    cap: string | null
    citta: string | null
    provincia: string | null
  }
  cliente: {
    denominazione: string
    piva: string | null
    cf: string | null
    indirizzo: string
  }
  fattura: {
    numero: string
    data: string          // ISO date
    tipo_documento: string // 'TD01' | 'TD04' | ...
  }
  righe: Array<{
    descrizione: string
    quantita: number
    unita_misura: string
    prezzo_unitario: number
    importo: number
  }>
  imponibile: number
  bollo: number
  totale: number
}
```

- [ ] **Step 1: Scrivi il failing test**

```typescript
// tests/unit/fattura-cortesia-template.test.ts
// Render reale react-pdf: il template produce un PDF valido con i dati fiscali
// e la dicitura di non-valore fiscale (obbligo copia di cortesia).
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { FatturaCortesiaTemplate, type FatturaCortesiaProps } from '@/components/features/pdf/FatturaCortesiaTemplate'

const props: FatturaCortesiaProps = {
  lab: { denominazione: 'Lab Test SRL', partita_iva: '12345678901', indirizzo: 'Via Roma 1', cap: '80100', citta: 'Napoli', provincia: 'NA' },
  cliente: { denominazione: 'Studio Bianchi', piva: '01234567890', cf: null, indirizzo: 'Via Milano 2, 80100 Napoli NA' },
  fattura: { numero: '2026-0001', data: '2026-07-11', tipo_documento: 'TD01' },
  righe: [
    { descrizione: 'Corona in zirconia', quantita: 1, unita_misura: 'PZ', prezzo_unitario: 180, importo: 180 },
    { descrizione: 'Ponte 3 elementi', quantita: 1, unita_misura: 'PZ', prezzo_unitario: 450, importo: 450 },
  ],
  imponibile: 630,
  bollo: 2,
  totale: 632,
}

describe('FatturaCortesiaTemplate', () => {
  it('renderizza un PDF valido (header %PDF)', async () => {
    const buffer = await renderPdfDocument(createElement(FatturaCortesiaTemplate, props))
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('nota di credito: il titolo documento cambia (TD04)', async () => {
    const buffer = await renderPdfDocument(
      createElement(FatturaCortesiaTemplate, { ...props, fattura: { ...props.fattura, tipo_documento: 'TD04' } }),
    )
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })
})
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run tests/unit/fattura-cortesia-template.test.ts`
Expected: FAIL — modulo `FatturaCortesiaTemplate` inesistente.

- [ ] **Step 3: Implementa il template**

```tsx
// src/components/features/pdf/FatturaCortesiaTemplate.tsx
// UÀ — Copia di cortesia della fattura elettronica (Ondata 2 portale dentista).
// NON è un documento fiscale: l'originale è l'XML FatturaPA trasmesso al SDI.
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer (pattern BuonoTemplate).
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', paddingTop: 36, paddingBottom: 48, paddingLeft: 48, paddingRight: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  labNome: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  labSub: { fontSize: 8, color: '#555555', marginBottom: 1 },
  docTitolo: { fontSize: 11, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' },
  docNumero: { fontSize: 9, color: '#555555', textAlign: 'right', marginTop: 2 },
  separator: { borderBottom: '0.5pt solid #cccccc', marginBottom: 12 },
  datiLabel: { fontSize: 8, color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  datiValore: { fontSize: 10, marginBottom: 6 },
  tabellaHeader: { flexDirection: 'row', borderBottom: '1pt solid #333333', paddingBottom: 4, marginTop: 12 },
  tabellaRiga: { flexDirection: 'row', borderBottom: '0.5pt solid #dddddd', paddingVertical: 4 },
  colDescrizione: { flex: 1 },
  colQta: { width: 48, textAlign: 'right' },
  colUm: { width: 32, textAlign: 'right' },
  colPrezzo: { width: 70, textAlign: 'right' },
  colImporto: { width: 70, textAlign: 'right' },
  thText: { fontSize: 8, color: '#888888', textTransform: 'uppercase', letterSpacing: 0.5 },
  riepilogo: { marginTop: 16, alignItems: 'flex-end' },
  riepilogoRiga: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  riepilogoLabel: { fontSize: 9, color: '#555555', width: 140, textAlign: 'right', paddingRight: 8 },
  riepilogoValore: { fontSize: 9, width: 80, textAlign: 'right' },
  totaleLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', width: 140, textAlign: 'right', paddingRight: 8 },
  totaleValore: { fontSize: 11, fontFamily: 'Helvetica-Bold', width: 80, textAlign: 'right' },
  natura: { marginTop: 10, fontSize: 8, color: '#555555' },
  cortesia: { marginTop: 24, padding: 8, border: '0.5pt solid #cccccc', fontSize: 8, color: '#555555', textAlign: 'center' },
})

function formatData(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

function formatImporto(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const titoliDocumento: Record<string, string> = {
  TD01: 'Fattura',
  TD02: 'Fattura di acconto',
  TD04: 'Nota di credito',
  TD05: 'Nota di debito',
  TD06: 'Parcella',
}

export interface FatturaCortesiaProps {
  lab: { denominazione: string; partita_iva: string; indirizzo: string | null; cap: string | null; citta: string | null; provincia: string | null }
  cliente: { denominazione: string; piva: string | null; cf: string | null; indirizzo: string }
  fattura: { numero: string; data: string; tipo_documento: string }
  righe: Array<{ descrizione: string; quantita: number; unita_misura: string; prezzo_unitario: number; importo: number }>
  imponibile: number
  bollo: number
  totale: number
}

export function FatturaCortesiaTemplate({ lab, cliente, fattura, righe, imponibile, bollo, totale }: FatturaCortesiaProps) {
  const titolo = titoliDocumento[fattura.tipo_documento] ?? 'Documento'
  const labIndirizzo = [lab.indirizzo, [lab.cap, lab.citta, lab.provincia].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <Document title={`${titolo} ${fattura.numero} — copia di cortesia`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.labNome}>{lab.denominazione}</Text>
            {labIndirizzo ? <Text style={styles.labSub}>{labIndirizzo}</Text> : null}
            <Text style={styles.labSub}>P.IVA {lab.partita_iva}</Text>
          </View>
          <View>
            <Text style={styles.docTitolo}>{titolo} — copia di cortesia</Text>
            <Text style={styles.docNumero}>N. {fattura.numero} del {formatData(fattura.data)}</Text>
          </View>
        </View>
        <View style={styles.separator} />

        <Text style={styles.datiLabel}>Destinatario</Text>
        <Text style={styles.datiValore}>
          {cliente.denominazione}
          {cliente.piva ? ` — P.IVA ${cliente.piva}` : cliente.cf ? ` — CF ${cliente.cf}` : ''}
          {cliente.indirizzo ? `\n${cliente.indirizzo}` : ''}
        </Text>

        <View style={styles.tabellaHeader}>
          <Text style={[styles.colDescrizione, styles.thText]}>Descrizione</Text>
          <Text style={[styles.colQta, styles.thText]}>Q.tà</Text>
          <Text style={[styles.colUm, styles.thText]}>UM</Text>
          <Text style={[styles.colPrezzo, styles.thText]}>Prezzo</Text>
          <Text style={[styles.colImporto, styles.thText]}>Importo</Text>
        </View>
        {righe.map((r, i) => (
          <View key={i} style={styles.tabellaRiga}>
            <Text style={styles.colDescrizione}>{r.descrizione}</Text>
            <Text style={styles.colQta}>{formatImporto(r.quantita)}</Text>
            <Text style={styles.colUm}>{r.unita_misura}</Text>
            <Text style={styles.colPrezzo}>{formatImporto(r.prezzo_unitario)}</Text>
            <Text style={styles.colImporto}>{formatImporto(r.importo)}</Text>
          </View>
        ))}

        <View style={styles.riepilogo}>
          <View style={styles.riepilogoRiga}>
            <Text style={styles.riepilogoLabel}>Imponibile</Text>
            <Text style={styles.riepilogoValore}>{formatImporto(imponibile)} EUR</Text>
          </View>
          <View style={styles.riepilogoRiga}>
            <Text style={styles.riepilogoLabel}>IVA</Text>
            <Text style={styles.riepilogoValore}>Esente (N4)</Text>
          </View>
          {bollo > 0 ? (
            <View style={styles.riepilogoRiga}>
              <Text style={styles.riepilogoLabel}>Bollo</Text>
              <Text style={styles.riepilogoValore}>{formatImporto(bollo)} EUR</Text>
            </View>
          ) : null}
          <View style={styles.riepilogoRiga}>
            <Text style={styles.totaleLabel}>Totale</Text>
            <Text style={styles.totaleValore}>{formatImporto(totale)} EUR</Text>
          </View>
        </View>

        <Text style={styles.natura}>
          Operazione esente IVA — Natura N4, Art. 10 n.18 DPR 633/72.
        </Text>

        <Text style={styles.cortesia}>
          Copia di cortesia priva di valore fiscale — l&apos;originale è la fattura elettronica trasmessa al Sistema di Interscambio.
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 4: Verifica che passi**

Run: `npx vitest run tests/unit/fattura-cortesia-template.test.ts`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/pdf/FatturaCortesiaTemplate.tsx tests/unit/fattura-cortesia-template.test.ts
git commit -m "feat(fatture): FatturaCortesiaTemplate — copia di cortesia PDF react-pdf"
```

---

### Task 4: `generaFatturaPA` genera il PDF di cortesia e smette di persistire URL pubblici (I-6)

**Files:**
- Modify: `src/lib/fattura/generate-xml.ts` (blocchi: select draft ~riga 79-88; step 10-12 ~righe 243-293)
- Modify: `src/types/domain.ts:660-689` (interface `Fattura`)
- Test: `tests/unit/generate-xml-pdf-cortesia.test.ts` (nuovo)
- Modify: `tests/unit/generate-xml-lavoro-id.test.ts` (mock storage + mock render)

**Interfaces:**
- Consumes: `FatturaCortesiaTemplate` + `FatturaCortesiaProps` (Task 3), `renderPdfDocument` (`src/lib/pdf/render-document.ts`), colonna `pdf_storage_path` (Task 1).
- Produces: ogni fattura generata ha `pdf_storage_path = '{laboratorio_id}/{anno}/cortesia/{titoloFile}-{numero}.pdf'` e **non** ha più `xml_url` valorizzato. Task 6/7 leggono `pdf_storage_path`.

- [ ] **Step 1: Scrivi i failing test**

```typescript
// tests/unit/generate-xml-pdf-cortesia.test.ts
// Ondata 2 + I-6: generaFatturaPA genera la copia di cortesia PDF insieme
// all'XML (stessi dati in memoria) e NON persiste più URL pubblici (xml_url).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, uploads, insertPayloads, updatePayloads, mockRender } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  uploads: [] as Array<{ bucket: string; path: string; contentType: string }>,
  insertPayloads: [] as Array<Record<string, unknown>>,
  updatePayloads: [] as Array<Record<string, unknown>>,
  mockRender: vi.fn(async () => Buffer.from('%PDF-fake')),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _bytes: unknown, opts: { contentType: string }) => {
          uploads.push({ bucket, path, contentType: opts.contentType })
          return { error: null }
        },
      }),
    },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: vi.fn(async () => 9) }))
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: mockRender }))

import { generaFatturaPA } from '@/lib/fattura/generate-xml'

const LAB = {
  id: 'lab-1', nome: 'Lab', ragione_sociale: 'Lab SRL', partita_iva: '12345678901',
  codice_fiscale: null, indirizzo: 'Via X 1', cap: '80100', citta: 'Napoli', provincia: 'NA',
  regime_fiscale: 'RF01', pec: null, pec_host: null, pec_port: null, pec_user: null,
  pec_smtp_configurata: false, pec_vault_key_id: null,
}
const LAVORO = {
  id: 'lav-9', laboratorio_id: 'lab-1', numero_lavoro: 'n.9', descrizione: 'Corona di test',
  prezzo_unitario: 100, lavorazioni: [],
  cliente: {
    id: 'cli-1', cognome: 'Rossi', nome: 'Mario', studio_nome: 'Studio Rossi',
    codice_sdi: 'ABC1234', pec: null, partita_iva: '01234567890', codice_fiscale: null,
    indirizzo: 'Via Y 2', cap: '80100', citta: 'Napoli', provincia: 'NA',
  },
} as never

beforeEach(() => {
  vi.clearAllMocks()
  uploads.length = 0
  insertPayloads.length = 0
  updatePayloads.length = 0
  mockRender.mockResolvedValue(Buffer.from('%PDF-fake'))
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') {
      const c: Record<string, unknown> = {}
      c.select = () => c
      c.eq = () => c
      c.single = async () => ({ data: LAB, error: null })
      return c
    }
    if (table === 'fatture') {
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: { numero: '2026-0007', progressivo: 7, data: '2026-07-01' }, error: null }) }) }),
        insert: (payload: Record<string, unknown>) => { insertPayloads.push(payload); return Promise.resolve({ error: null }) },
        update: (payload: Record<string, unknown>) => { updatePayloads.push(payload); return { eq: async () => ({ error: null }) } },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('generaFatturaPA — copia di cortesia PDF + I-6', () => {
  it('ramo INSERT: upload XML + PDF, pdf_storage_path persistito, xml_url MAI scritto', async () => {
    await generaFatturaPA(LAVORO, undefined)
    expect(uploads).toHaveLength(2)
    const pdfUpload = uploads.find((u) => u.contentType === 'application/pdf')
    expect(pdfUpload?.bucket).toBe('fatture-pdf')
    expect(pdfUpload?.path).toMatch(/^lab-1\/\d{4}\/cortesia\/Fattura-\d{4}-0009\.pdf$/)
    expect(insertPayloads[0].pdf_storage_path).toBe(pdfUpload?.path)
    expect(insertPayloads[0]).not.toHaveProperty('xml_url')
  })

  it('ramo UPDATE (draft): pdf_storage_path nel payload, data del PDF = data del draft', async () => {
    await generaFatturaPA(LAVORO, 'fatt-7')
    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].pdf_storage_path).toMatch(/^lab-1\/\d{4}\/cortesia\/Fattura-2026-0007\.pdf$/)
    expect(updatePayloads[0]).not.toHaveProperty('xml_url')
    // il template riceve la data del draft, non quella odierna
    const propsPassate = mockRender.mock.calls[0][0] as { props: { fattura: { data: string } } }
    expect(propsPassate.props.fattura.data).toBe('2026-07-01')
  })

  it('render PDF fallito → generaFatturaPA lancia, nessun UPDATE/INSERT fatture (draft resta draft)', async () => {
    mockRender.mockRejectedValueOnce(new Error('render boom'))
    await expect(generaFatturaPA(LAVORO, 'fatt-7')).rejects.toThrow()
    expect(updatePayloads).toHaveLength(0)
    expect(insertPayloads).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run tests/unit/generate-xml-pdf-cortesia.test.ts`
Expected: FAIL — nessun upload PDF, `xml_url` presente nei payload.

- [ ] **Step 3: Modifica `generate-xml.ts`**

3a. Import in testa al file:
```typescript
import { createElement } from 'react'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { FatturaCortesiaTemplate, type FatturaCortesiaProps } from '@/components/features/pdf/FatturaCortesiaTemplate'
```

3b. Nel ramo `if (fatturaId)` dello step 2 (~riga 79-88), estendi la select del draft per leggere anche la data:
```typescript
      .select('numero, progressivo, data')
```
e cattura la data in una variabile a scope di funzione, dichiarata accanto a `numero`/`progressivoFattura`:
```typescript
  let dataFattura: string
  // ramo fatturaId:
  dataFattura = (draft as { data: string }).data
  // ramo else (dopo numero = ...):
  dataFattura = oggi   // `oggi` è già definita più sotto a riga ~166: spostala PRIMA dello step 2, invariata
```
Nota: `const oggi = new Date().toISOString().split('T')[0]` è oggi definita a riga ~166 — spostarla sopra lo step 2 (prima del `if (fatturaId)`), senza cambiarne il valore.

3c. Dopo l'upload XML (subito dopo il blocco `if (uploadError) { throw ... }`, ~riga 256), SOSTITUISCI il blocco `getPublicUrl` (righe 258-262) con la generazione del PDF:
```typescript
  // ── 10b. Copia di cortesia PDF — stessi dati dell'XML (Ondata 2) ─────────
  // Se il render/upload fallisce si lancia PRIMA dell'UPDATE/INSERT fatture:
  // il draft resta draft e il retry è pulito (stesso contratto dell'upload XML).
  const righeCortesia = lavoro.lavorazioni.length > 0
    ? lavoro.lavorazioni.map((r) => ({
        descrizione: r.descrizione,
        quantita: r.quantita ?? 1,
        unita_misura: r.unita_misura ?? 'PZ',
        prezzo_unitario: r.prezzo_unitario ?? 0,
        importo: r.importo ?? 0,
      }))
    : [{
        descrizione: lavoro.descrizione,
        quantita: 1,
        unita_misura: 'PZ',
        prezzo_unitario: lavoro.prezzo_unitario ?? 0,
        importo: lavoro.prezzo_unitario ?? 0,
      }]

  const propsCortesia: FatturaCortesiaProps = {
    lab: {
      denominazione: labDenominazione,
      partita_iva: labPiva,
      indirizzo: labRow.indirizzo,
      cap: labRow.cap,
      citta: labRow.citta,
      provincia: labRow.provincia,
    },
    cliente: {
      denominazione: clienteDenominazione,
      piva: cliente.partita_iva ?? null,
      cf: cliente.codice_fiscale ?? null,
      indirizzo: `${cliente.indirizzo ?? ''}, ${cliente.cap ?? ''} ${cliente.citta ?? ''} ${cliente.provincia ?? ''}`.trim(),
    },
    fattura: { numero, data: dataFattura, tipo_documento: 'TD01' },
    righe: righeCortesia,
    imponibile,
    bollo: bolloApplicato,
    totale,
  }
  const pdfBuffer = await renderPdfDocument(createElement(FatturaCortesiaTemplate, propsCortesia))
  const pdfStoragePath = `${lavoro.laboratorio_id}/${anno}/cortesia/Fattura-${numero}.pdf`

  const { error: pdfUploadError } = await supabase.storage
    .from('fatture-pdf')
    .upload(pdfStoragePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (pdfUploadError) {
    throw new Error(`Upload PDF cortesia fallito: ${pdfUploadError.message}`)
  }
```

3d. In `xmlFields` (~riga 275-290): rimuovi `xml_url: xmlUrl,` e aggiungi `pdf_storage_path: pdfStoragePath,`. Rimuovi anche la variabile `xmlUrl` ormai inutilizzata.

- [ ] **Step 4: Aggiorna `domain.ts` e il test esistente**

4a. In `src/types/domain.ts` interface `Fattura`: rimuovi `xml_url: string | null;` e aggiungi al suo posto:
```typescript
  xml_storage_path: string | null;
  pdf_storage_path: string | null;
```

4b. In `tests/unit/generate-xml-lavoro-id.test.ts`: nel mock storage sostituisci `getPublicUrl: () => (...)` con nulla (non più chiamato) e aggiungi il mock del render come nel nuovo test:
```typescript
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: vi.fn(async () => Buffer.from('%PDF-fake')) }))
```
(l'upload del mock esistente già risponde `{ error: null }` per entrambi i bucket).

- [ ] **Step 5: Verifica che passino + tsc**

Run: `npx vitest run tests/unit/generate-xml-pdf-cortesia.test.ts tests/unit/generate-xml-lavoro-id.test.ts tests/unit/fatture-xml-errori.test.ts tests/unit/fatture-batch-lavoro-id.test.ts tests/unit/orchestra-consegna-no-fattura.test.ts && npx tsc --noEmit`
Expected: tutti PASS; tsc segnalerà gli altri consumer di `xml_url` (attesi: `send-pec.ts`, `fatture/[id]/page.tsx`, `api/fatture/route.ts`, `api/fatture/[id]/xml/route.ts`) — SE tsc fallisce SOLO su quei file, va bene: li sistema il Task 5 (in tal caso esegui tsc di nuovo a fine Task 5 e committa qui solo con i test verdi).

- [ ] **Step 6: Commit**

```bash
git add src/lib/fattura/generate-xml.ts src/types/domain.ts tests/unit/generate-xml-pdf-cortesia.test.ts tests/unit/generate-xml-lavoro-id.test.ts
git commit -m "feat(fatture): copia di cortesia PDF generata con l'XML; stop persistenza publicUrl (I-6)"
```

---

### Task 5: Consumer I-6 — via ogni lettura di `xml_url`

**Files:**
- Modify: `src/lib/fattura/send-pec.ts:17-26, 34-51, 69-72, 99-119`
- Modify: `src/app/(app)/fatture/[id]/page.tsx:24, 115`
- Modify: `src/app/api/fatture/route.ts:48`
- Modify: `src/app/api/fatture/[id]/xml/route.ts:226, 242`
- Test: `tests/unit/send-pec-signed-url.test.ts` (nuovo)

**Interfaces:**
- Consumes: `getSignedUrl(svc, bucket, path, expiresInSeconds)` da `src/lib/storage/signed-url.ts`.
- Produces: zero occorrenze di `xml_url` in `src/` (verificato con grep) fuori da `database.types.ts` (generato).

- [ ] **Step 1: Scrivi il failing test**

```typescript
// tests/unit/send-pec-signed-url.test.ts
// I-6: send-pec scarica l'XML SOLO via signed URL da xml_storage_path.
// Senza storage path deve fallire con errore esplicito (mai URL pubblici).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSignedUrl: vi.fn(async () => 'https://signed.example/xml?token=abc'),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: vi.fn(async () => ({ data: 'pec-password', error: null })) }),
}))
vi.mock('@/lib/storage/signed-url', () => ({ getSignedUrl: mockGetSignedUrl }))

import { sendFatturaPEC } from '@/lib/fattura/send-pec'

function fatturaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fatt-1', numero: '2026-0001', nome_file_xml: 'IT123_00001.xml',
    xml_storage_path: 'lab-1/2026/IT123_00001.xml', laboratorio_id: 'lab-1', data: '2026-07-11',
    laboratorio: { id: 'lab-1', nome: 'Lab', pec_host: 'smtp.pec.it', pec_port: 465, pec_user: 'lab@pec.it', pec_smtp_configurata: true, pec_vault_key_id: 'k1' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSignedUrl.mockResolvedValue('https://signed.example/xml?token=abc')
})

describe('sendFatturaPEC — I-6 solo signed URL', () => {
  it('senza xml_storage_path → errore esplicito, nessun tentativo di download', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: fatturaRow({ xml_storage_path: null }), error: null }) }) }),
    }))
    await expect(sendFatturaPEC('fatt-1')).rejects.toThrow(/XML non generato/)
    expect(mockGetSignedUrl).not.toHaveBeenCalled()
  })

  it('signed URL non ottenibile → errore, mai fallback a URL pubblici', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: fatturaRow(), error: null }) }) }),
    }))
    mockGetSignedUrl.mockResolvedValueOnce(null)
    await expect(sendFatturaPEC('fatt-1')).rejects.toThrow(/Download XML fallito/)
  })
})
```

- [ ] **Step 2: Verifica che fallisca**

Run: `npx vitest run tests/unit/send-pec-signed-url.test.ts`
Expected: FAIL — oggi il guard a riga 70 controlla `xml_url` (il primo test fallisce perché la fattura senza `xml_url` nel mock… verifica che l'errore lanciato sia diverso da quello atteso) e il fallback usa `fattura.xml_url`.

- [ ] **Step 3: Modifica `send-pec.ts`**

3a. `interface FatturaRow` (riga 17-26): rimuovi `xml_url: string | null`.
3b. Select (righe 34-51): rimuovi la riga `xml_url,`.
3c. Guard step 2 (righe 69-72):
```typescript
  if (!fattura.xml_storage_path) {
    throw new Error('XML non generato — eseguire prima la generazione FatturaPA')
  }
```
3d. Step 4 download (righe 99-119) — sostituisci la risoluzione dell'URL:
```typescript
  // ── 4. Scarica XML da Storage (SOLO signed URL — bucket privato, I-6) ────
  let xmlBuffer: ArrayBuffer
  try {
    const downloadUrl = await getSignedUrl(supabase, 'fatture-pdf', fattura.xml_storage_path, 60)
    if (!downloadUrl) throw new Error('URL XML non disponibile')

    const resp = await fetch(downloadUrl)
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
    xmlBuffer = await resp.arrayBuffer()
  } catch (err) {
    throw new Error(`Download XML fallito: ${err instanceof Error ? err.message : String(err)}`)
  }
```

- [ ] **Step 4: Modifica gli altri 3 consumer**

4a. `src/app/(app)/fatture/[id]/page.tsx`: nella select a riga 24 rimuovi `xml_url,` (lascia `pdf_url` se presente nella select solo qualora usato altrove — se non usato, rimuovi anche quello); a riga 115 sostituisci:
```tsx
                <span>{f.xml_storage_path ? '✓ Generato' : 'Non generato'}</span>
```
4b. `src/app/api/fatture/route.ts:48`: nella select della lista rimuovi `xml_url,` (nessun sostituto: la lista lab non ne ha bisogno; se il client la usa come flag, sostituisci con `xml_storage_path,`) — verifica con `grep -rn "xml_url" src/` che nessun componente client legga il campo dalla risposta.
4c. `src/app/api/fatture/[id]/xml/route.ts:242`: nella select della risposta sostituisci `xml_url` con `xml_storage_path`; aggiorna il commento a riga 226.

- [ ] **Step 5: Verifica**

```bash
npx vitest run tests/unit/send-pec-signed-url.test.ts && npx tsc --noEmit && grep -rn "xml_url" src/ --include="*.ts" --include="*.tsx" | grep -v "database.types.ts"
```
Expected: test PASS; tsc pulito; il grep restituisce **zero righe**.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fattura/send-pec.ts "src/app/(app)/fatture/[id]/page.tsx" src/app/api/fatture/route.ts "src/app/api/fatture/[id]/xml/route.ts" tests/unit/send-pec-signed-url.test.ts
git commit -m "fix(fatture): I-6 — nessun consumer legge più xml_url, solo signed URL da storage path"
```

---

### Task 6: API portale — lista fatture (`GET /api/portale/[token]/fatture`)

**Files:**
- Modify: `src/lib/portale/audit.ts:9-15` (azioni nuove)
- Create: `src/app/api/portale/[token]/fatture/route.ts`
- Test: `tests/unit/portale-fatture-get-route.test.ts`

**Interfaces:**
- Consumes: `guardieEconomiche(svc, req, token)` da `src/lib/portale/guardie.ts`; `logPortaleAudit` da `src/lib/portale/audit.ts`.
- Produces:
```typescript
export type RigaFatturaPortale = {
  id: string
  numero: string
  data: string
  tipo_documento: string   // 'TD01' | 'TD04' | ...
  totale: number
  pdf: boolean             // pdf_storage_path presente
}
export type FatturePortaleResponse = {
  studio: string | null
  gruppi: Array<{ anno: number; fatture: RigaFatturaPortale[] }>
}
```
Azioni audit nuove in `AzionePortale`: `'view_fatture' | 'download_fattura'` (nessun CHECK su `portale_accessi.azione` in DB — verificato 11/07, nessuna migration necessaria).

- [ ] **Step 1: Aggiungi le azioni audit**

In `src/lib/portale/audit.ts`, estendi il tipo:
```typescript
export type AzionePortale =
  | 'view_lavori' | 'download_ddc' | 'download_buono'
  | 'view_fatturazione' | 'lista_stampata' | 'proposta_fatturazione'
  | 'view_fatture' | 'download_fattura'
  | 'pin_ok' | 'pin_errato' | 'pin_bloccato'
  | 'pin_impostato' | 'pin_reimpostato'
  | 'interruttore_on' | 'interruttore_off'
  | 'link_rigenerato'
```

- [ ] **Step 2: Scrivi i failing test**

```typescript
// tests/unit/portale-fatture-get-route.test.ts
// Ondata 2 — storico fatture nel portale, dietro PIN (spec §3).
// Esclusioni: draft (non emessa) e rifiutata (non valida verso il cliente).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/fatture/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/fatture', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest', ...(cookie ? { cookie } : {}) },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let fatture: Array<Record<string, unknown>>
let fattureErrore: { message: string } | null
let auditInserts: Array<Record<string, unknown>>
let auditErrore: { message: string } | null

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  auditErrore = null
  fattureErrore = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  fatture = [
    { id: 'f-1', numero: '2026-0002', data: '2026-07-05', tipo_documento: 'TD01', totale: 632, pdf_storage_path: 'lab-1/2026/cortesia/Fattura-2026-0002.pdf' },
    { id: 'f-2', numero: '2026-0001', data: '2026-02-10', tipo_documento: 'TD04', totale: 180, pdf_storage_path: null },
    { id: 'f-3', numero: '2025-0009', data: '2025-11-20', tipo_documento: 'TD01', totale: 450, pdf_storage_path: 'lab-1/2025/cortesia/Fattura-2025-0009.pdf' },
  ]
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    if (table === 'fatture') {
      // catena: select → eq(cliente) → eq(lab) → not(stato_sdi in) → is(deleted) → order
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.not = () => chain
      chain.is = () => chain
      chain.order = async () => (fattureErrore ? { data: null, error: fattureErrore } : { data: fatture, error: null })
      return chain
    }
    // portale_accessi
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: auditErrore } } }
  })
})

describe('GET /api/portale/[token]/fatture', () => {
  it('lista raggruppata per anno desc, pdf boolean, audit view_fatture con IP', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.gruppi.map((g: { anno: number }) => g.anno)).toEqual([2026, 2025])
    expect(json.gruppi[0].fatture).toHaveLength(2)
    expect(json.gruppi[0].fatture[0]).toEqual({ id: 'f-1', numero: '2026-0002', data: '2026-07-05', tipo_documento: 'TD01', totale: 632, pdf: true })
    expect(json.gruppi[0].fatture[1].pdf).toBe(false)
    expect(JSON.stringify(json)).not.toContain('pdf_storage_path')
    expect(auditInserts.some((a) => a.azione === 'view_fatture' && a.ip_address === '1.2.3.4')).toBe(true)
  })

  it('lettura fatture fallita → 500 senza leak', async () => {
    fattureErrore = { message: 'boom-postgres' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('boom-postgres')
  })

  it('audit fallito → 500 (fail-loud, evento economico)', async () => {
    auditErrore = { message: 'insert ko' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
  })

  it('guardie: senza sessione → 401; interruttore OFF → 403; token invalido → 401 uniforme', async () => {
    expect((await GET(req(), ctx)).status).toBe(401)
    cliente!.portale_fatturazione_attiva = false
    expect((await GET(req(cookieValido()), ctx)).status).toBe(403)
    cliente = null
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })
})
```

- [ ] **Step 3: Verifica che falliscano**

Run: `npx vitest run tests/unit/portale-fatture-get-route.test.ts`
Expected: FAIL — modulo route inesistente.

- [ ] **Step 4: Implementa la route**

```typescript
// src/app/api/portale/[token]/fatture/route.ts
// Spec §3 Ondata 2 — storico fatture dietro PIN.
// Esclusioni: stato_sdi 'draft' (non ancora emessa) e 'rifiutata' (non valida
// verso il cliente) — coerente con la doppia sorgente della lista Da fatturare.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { logPortaleAudit } from '@/lib/portale/audit'

type RouteContext = { params: Promise<{ token: string }> }

export type RigaFatturaPortale = {
  id: string
  numero: string
  data: string
  tipo_documento: string
  totale: number
  pdf: boolean
}
export type FatturePortaleResponse = {
  studio: string | null
  gruppi: Array<{ anno: number; fatture: RigaFatturaPortale[] }>
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const { data: fatture, error: fatErr } = await svc
      .from('fatture')
      .select('id, numero, data, tipo_documento, totale, pdf_storage_path')
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .not('stato_sdi', 'in', '("draft","rifiutata")')
      .is('deleted_at', null)
      .order('data', { ascending: false })
    if (fatErr) {
      console.error('[portale fatture] lettura fatture:', fatErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }

    const righe: RigaFatturaPortale[] = (fatture ?? []).map((f) => ({
      id: f.id,
      numero: f.numero,
      data: f.data,
      tipo_documento: f.tipo_documento,
      totale: Number(f.totale ?? 0),
      pdf: f.pdf_storage_path != null,
    }))

    const gruppiMap = new Map<number, RigaFatturaPortale[]>()
    for (const r of righe) {
      const anno = Number((r.data ?? '').slice(0, 4)) || 0
      const gruppo = gruppiMap.get(anno) ?? []
      gruppo.push(r)
      gruppiMap.set(anno, gruppo)
    }
    const gruppi = [...gruppiMap.entries()]
      .sort(([a], [b]) => b - a)
      .map(([anno, fattureAnno]) => ({ anno, fatture: fattureAnno }))

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'view_fatture', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const risposta: FatturePortaleResponse = { studio: cliente.studio_nome, gruppi }
    return NextResponse.json(risposta)
  } catch (err) {
    console.error('[portale fatture] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Verifica che passino**

Run: `npx vitest run tests/unit/portale-fatture-get-route.test.ts`
Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/portale/audit.ts "src/app/api/portale/[token]/fatture/route.ts" tests/unit/portale-fatture-get-route.test.ts
git commit -m "feat(portale): GET /api/portale/[token]/fatture — storico fatture dietro PIN"
```

---

### Task 7: API portale — download PDF (`GET /api/portale/[token]/fatture/[fattura_id]/pdf`)

**Files:**
- Create: `src/app/api/portale/[token]/fatture/[fattura_id]/pdf/route.ts`
- Test: `tests/unit/portale-fattura-pdf-route.test.ts`

**Interfaces:**
- Consumes: `guardieEconomiche`, `logPortaleAudit` (azione `'download_fattura'` dal Task 6), `getSignedUrl(svc, 'fatture-pdf', path, 300)`.
- Produces: redirect 307 al signed URL (pattern B5, come la route `[documento]`). Audit **fail-loud PRIMA del redirect** (evento economico, spec §4 — a differenza di download_ddc/buono che sono best-effort).

- [ ] **Step 1: Scrivi i failing test**

```typescript
// tests/unit/portale-fattura-pdf-route.test.ts
// Ondata 2 — download copia di cortesia, pattern B5 (signed URL 300s + 307).
// Audit download_fattura fail-loud: se l'insert fallisce NIENTE redirect.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSignedUrl: vi.fn(async () => 'https://signed.example/f.pdf?token=abc'),
}))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/storage/signed-url', () => ({ getSignedUrl: mockGetSignedUrl }))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { GET } from '../../src/app/api/portale/[token]/fatture/[fattura_id]/pdf/route'

const ctx = { params: Promise.resolve({ token: 'tok-1', fattura_id: 'f-1' }) }
function req(cookie?: string): Request {
  return new Request('http://localhost/api/portale/tok-1/fatture/f-1/pdf', {
    headers: { 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest', ...(cookie ? { cookie } : {}) },
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let fattura: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let auditErrore: { message: string } | null

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  auditErrore = null
  mockGetSignedUrl.mockResolvedValue('https://signed.example/f.pdf?token=abc')
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true,
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  fattura = { id: 'f-1', numero: '2026-0002', pdf_storage_path: 'lab-1/2026/cortesia/Fattura-2026-0002.pdf' }
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    if (table === 'fatture') {
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      chain.not = () => chain
      chain.is = () => chain
      chain.maybeSingle = async () => ({ data: fattura, error: null })
      return chain
    }
    return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: auditErrore } } }
  })
})

describe('GET /api/portale/[token]/fatture/[fattura_id]/pdf', () => {
  it('successo: 307 al signed URL, audit download_fattura con dettaglio', async () => {
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://signed.example/f.pdf?token=abc')
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), 'fatture-pdf', 'lab-1/2026/cortesia/Fattura-2026-0002.pdf', 300)
    const audit = auditInserts.find((a) => a.azione === 'download_fattura')
    expect(audit).toBeTruthy()
    expect((audit!.dettaglio as { fattura_id: string }).fattura_id).toBe('f-1')
    expect(audit!.ip_address).toBe('1.2.3.4')
  })

  it('fattura inesistente/di altro cliente → 404', async () => {
    fattura = null
    expect((await GET(req(cookieValido()), ctx)).status).toBe(404)
  })

  it('pdf_storage_path NULL → 404 documento non disponibile', async () => {
    fattura = { id: 'f-1', numero: '2026-0002', pdf_storage_path: null }
    expect((await GET(req(cookieValido()), ctx)).status).toBe(404)
  })

  it('audit fallito → 500, NESSUN redirect (fail-loud)', async () => {
    auditErrore = { message: 'ko' }
    const res = await GET(req(cookieValido()), ctx)
    expect(res.status).toBe(500)
    expect(res.headers.get('location')).toBeNull()
  })

  it('signed URL non ottenibile → 500', async () => {
    mockGetSignedUrl.mockResolvedValueOnce(null)
    expect((await GET(req(cookieValido()), ctx)).status).toBe(500)
  })

  it('guardie: senza sessione → 401; token invalido → 401 uniforme', async () => {
    expect((await GET(req(), ctx)).status).toBe(401)
    cliente = null
    expect((await GET(req(cookieValido()), ctx)).status).toBe(401)
  })
})
```

- [ ] **Step 2: Verifica che falliscano**

Run: `npx vitest run tests/unit/portale-fattura-pdf-route.test.ts`
Expected: FAIL — modulo route inesistente.

- [ ] **Step 3: Implementa la route**

```typescript
// src/app/api/portale/[token]/fatture/[fattura_id]/pdf/route.ts
// Download copia di cortesia — pattern B5 (signed URL 300s, redirect 307).
// Evento economico: audit fail-loud PRIMA del redirect (spec §4).
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { guardieEconomiche } from '@/lib/portale/guardie'
import { logPortaleAudit } from '@/lib/portale/audit'
import { getSignedUrl } from '@/lib/storage/signed-url'

type RouteContext = { params: Promise<{ token: string; fattura_id: string }> }

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const { token, fattura_id } = await params
    const svc = getServiceClient()
    const g = await guardieEconomiche(svc, req, token)
    if (!g.ok) return g.res
    const cliente = g.cliente

    const { data: fattura, error: fatErr } = await svc
      .from('fatture')
      .select('id, numero, pdf_storage_path')
      .eq('id', fattura_id)
      .eq('cliente_id', cliente.id)
      .eq('laboratorio_id', cliente.laboratorio_id)
      .not('stato_sdi', 'in', '("draft","rifiutata")')
      .is('deleted_at', null)
      .maybeSingle()
    if (fatErr) {
      console.error('[portale fattura pdf] lettura fattura:', fatErr.message)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }
    if (!fattura || !fattura.pdf_storage_path) {
      return NextResponse.json({ errore: 'documento_non_disponibile' }, { status: 404 })
    }

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id,
      cliente_id: cliente.id,
      azione: 'download_fattura',
      dettaglio: { fattura_id: fattura.id, numero: fattura.numero },
      req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const signedUrl = await getSignedUrl(svc, 'fatture-pdf', fattura.pdf_storage_path, 300)
    if (!signedUrl) {
      console.error('[portale fattura pdf] signed URL non generato per', fattura.id)
      return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    }

    return NextResponse.redirect(signedUrl, 307)
  } catch (err) {
    console.error('[portale fattura pdf] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Verifica che passino**

Run: `npx vitest run tests/unit/portale-fattura-pdf-route.test.ts`
Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/portale/[token]/fatture/[fattura_id]/pdf/route.ts" tests/unit/portale-fattura-pdf-route.test.ts
git commit -m "feat(portale): download copia di cortesia fattura con signed URL (pattern B5, audit fail-loud)"
```

---

### Task 8: UI — sezione «Fatture» nell'area riservata del portale

**PREREQUISITO: mockup Task 2 approvato da Francesco.** Implementazione fedele al mockup.

**Files:**
- Create: `src/components/features/portale/FattureStoricoSection.tsx`
- Modify: `src/components/features/portale/FatturazioneSection.tsx` (mount del nuovo componente in fase `lista`)

**Interfaces:**
- Consumes: `GET /api/portale/[token]/fatture` → `FatturePortaleResponse` (forma ridefinita localmente, stesso pattern documentato in testa a `FatturazioneSection.tsx`); download via link `/api/portale/[token]/fatture/[id]/pdf`.
- Produces: `FattureStoricoSection({ token }: { token: string })` — montato SOLO quando la sessione economica è già validata (fase `lista` del padre): nessun tastierino PIN duplicato.

- [ ] **Step 1: Implementa `FattureStoricoSection.tsx`**

```tsx
'use client'
// Storico fatture del portale (spec §3 Ondata 2) — fedele al mockup approvato:
// docs/design/mockups/2026-07-11-portale-storico-fatture.html
// Montato da FatturazioneSection SOLO in fase 'lista' (sessione economica già
// validata): il PIN gate vive nel padre, qui nessun tastierino.
// Stile: CSS inline esadecimale, pattern del portale (vedi FatturazioneSection).
import { useEffect, useState } from 'react'

type RigaFattura = {
  id: string
  numero: string
  data: string
  tipo_documento: string
  totale: number
  pdf: boolean
}
type Gruppo = { anno: number; fatture: RigaFattura[] }
type Dati = { studio: string | null; gruppi: Gruppo[] }

type Stato =
  | { fase: 'caricamento' }
  | { fase: 'errore' }
  | { fase: 'dati'; dati: Dati }

const currencyFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const dataFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

const tipoDocLabels: Record<string, string> = {
  TD01: 'Fattura',
  TD02: 'Fattura di acconto',
  TD04: 'Nota di credito',
  TD05: 'Nota di debito',
  TD06: 'Parcella',
}

export function FattureStoricoSection({ token }: { token: string }) {
  const [stato, setStato] = useState<Stato>({ fase: 'caricamento' })

  useEffect(() => {
    let attivo = true
    async function carica() {
      try {
        const res = await fetch(`/api/portale/${token}/fatture`, { credentials: 'same-origin' })
        if (!attivo) return
        if (!res.ok) {
          setStato({ fase: 'errore' })
          return
        }
        const dati = (await res.json()) as Dati
        if (attivo) setStato({ fase: 'dati', dati })
      } catch {
        if (attivo) setStato({ fase: 'errore' })
      }
    }
    carica()
    return () => {
      attivo = false
    }
  }, [token])

  if (stato.fase === 'caricamento') return null

  if (stato.fase === 'errore') {
    return (
      <div style={{ padding: '0 20px 20px' }}>
        <div role="alert" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '10px 14px', fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', fontWeight: 600, color: '#92400E' }}>
          Impossibile caricare le fatture. Ricarica la pagina.
        </div>
      </div>
    )
  }

  const { dati } = stato
  const vuoto = dati.gruppi.length === 0 || dati.gruppi.every((g) => g.fatture.length === 0)

  return (
    <div className="ua-fatt-no-print">
      <div style={{ padding: '20px 20px 12px' }}>
        <h2 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '19px', fontWeight: 700, color: '#111827', margin: 0 }}>
          Fatture
        </h2>
      </div>

      {vuoto ? (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}>
            <div aria-hidden="true" style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>
              🧾
            </div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14.5px', fontWeight: 600, color: '#6B7280' }}>
              Nessuna fattura emessa finora.
            </div>
          </div>
        </div>
      ) : (
        dati.gruppi.map((g) => (
          <div key={g.anno}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 20px 10px', fontFamily: 'DM Sans, sans-serif' }}>
              {g.anno}
            </div>
            {g.fatture.map((f) => (
              <div key={f.id} style={{ background: '#FFFFFF', borderRadius: '16px', margin: '0 16px 12px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                    {(tipoDocLabels[f.tipo_documento] ?? 'Documento')} {f.numero}
                  </div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', color: '#6B7280' }}>
                    {f.data ? dataFmt.format(new Date(`${f.data}T00:00:00`)) : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                    {currencyFmt.format(f.totale)}
                  </div>
                  {f.pdf && (
                    <a
                      href={`/api/portale/${token}/fatture/${f.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Scarica PDF ${tipoDocLabels[f.tipo_documento] ?? 'documento'} ${f.numero}`}
                      style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: '#374151', background: '#F3F4F6', borderRadius: '8px', padding: '9px 12px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                    >
                      📄 PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
```
NOTA: adattare markup/copy al mockup APPROVATO se differisce — il mockup vince.

- [ ] **Step 2: Monta il componente in `FatturazioneSection.tsx`**

2a. Import in testa:
```typescript
import { FattureStoricoSection } from './FattureStoricoSection'
```
2b. Nella fase `lista`, DENTRO il contenitore dell'area riservata (`<div className="ua-fatt-no-print">` → dopo la chiusura del blocco totale sticky, prima della chiusura del div con `background: '#F8F9FA'`), aggiungi:
```tsx
          <FattureStoricoSection token={token} />
```
Posizione esatta: subito dopo il frammento `</>` che chiude la lista Da fatturare (dopo il div sticky del totale) e comunque coerente col mockup approvato (sezione Fatture sotto Da fatturare, stesso contenitore).

- [ ] **Step 3: Verifica compilazione e suite**

```bash
npx tsc --noEmit && npx vitest run
```
Expected: tsc pulito; suite completa verde (baseline 1250 + i nuovi test delle Task 3-7).

- [ ] **Step 4: Commit**

```bash
git add src/components/features/portale/FattureStoricoSection.tsx src/components/features/portale/FatturazioneSection.tsx
git commit -m "feat(portale): sezione Fatture nell'area riservata (storico + download PDF)"
```

---

### Task 9: Verifica finale + QA browser E2E

**Files:** nessun file nuovo (fix eventuali emergenti).

- [ ] **Step 1: FASE 7 — verifica completa con output reale**

```bash
npx tsc --noEmit
npx vitest run
npx next build
```
Expected: 0 errori tsc; suite tutta verde (≥ 1250 pass, 4 skipped, + nuovi); build pulita.

- [ ] **Step 2: QA browser sul lab E2E (MAI lab Filippo)**

Dev server DAL WORKTREE: `PORT=3013 npm run dev` (MAI `preview_start`: lancia il checkout principale).
Scenario completo sul lab `00000000-0000-0000-0000-000000000001`:
1. Attiva interruttore portale + imposta PIN per un cliente E2E (scheda cliente).
2. Crea un lavoro consegnato con decisione `fatturare`, genera la fattura via batch (`POST /api/fatture/batch`).
3. Verifica sul DB: la fattura ha `pdf_storage_path` valorizzato, `xml_url` NULL; il file PDF esiste nel bucket `fatture-pdf`.
4. Portale: sblocca col PIN → la sezione «Fatture» mostra la fattura (numero, data, totale, gruppo anno) e il lavoro è SPARITO dalla lista «Da fatturare» (passaggio allo storico, spec §5).
5. Tap «📄 PDF» → il PDF si apre (redirect 307 → signed URL); verifica contenuto (denominazioni, righe, totale, dicitura di cortesia).
6. Verifica audit: righe `view_fatture` e `download_fattura` in `portale_accessi` con IP/UA e dettaglio.
7. URL del PDF firmato incollato dopo >300s → scaduto (403 da Supabase).
8. Senza sessione PIN: `GET /api/portale/[token]/fatture` → 401; con interruttore OFF → 403 e sezione nascosta.
9. Pagina lab `/fatture/[id]`: "XML SDI: ✓ Generato" ancora corretto (ora da `xml_storage_path`); scarica XML dal lab OK.
10. Viewport 390px (portale mobile-first); screenshot di evidenza.

- [ ] **Step 3: Cleanup QA a baseline esatto**

Rimuovi dal lab E2E: lavori/fatture/audit di test via query dirette + file Storage via API (pattern Ondata 1); verifica 0 residui.

- [ ] **Step 4: Commit finale (eventuali fix QA) e chiusura**

```bash
git add -A && git commit -m "test(qa): fix emersi dalla QA browser Ondata 2"  # solo se ci sono fix
```
Poi: review whole-branch (`superpowers:requesting-code-review`) → gate merge con Francesco → merge fast-forward su main → push → CI verde → verifica uachelab.com → **BP-1** (MEMORY.md + ROADMAP + SESSION_ACTIVE).

---

## Fuori scope (spec §12 + rinvii espliciti)

- Stato pagamento per fattura e saldo → **Ondata 3** (situazione economica).
- Backfill PDF per fatture emesse pre-deploy (in prod 0 fatture emesse — non esiste il caso; se mai emergesse, la riga mostra `pdf: false` e nessun bottone).
- Drop della colonna `xml_url` (deprecata via COMMENT; drop in una futura migration di pulizia).
- Copia di cortesia visibile lato lab (la pagina fattura lab resta con XML; evoluzione futura).
