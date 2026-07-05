# B17 — Scheda di Fabbricazione Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un nuovo documento PDF interno ("Scheda di Fabbricazione") che rende visibili le fasi di lavorazione eseguite su un lavoro (codice, descrizione, esito, operatore, data/ora), scaricabile on-demand dalla pagina dettaglio lavoro — correttamente inquadrato come registro di tracciabilità QMS interno (Art. 10(9) MDR), non come output richiesto da Allegato XIII.

**Architecture:** Generazione live on-demand (nessuna persistenza su Storage), stesso pattern già in produzione di `generate-cedolino-tecnico.ts` + struttura route di `/api/lavori/[id]/ifu/route.ts`. Nessuna migration — tutti i dati (`lavori_fasi`, `fasi_produzione`, `tecnici`) esistono già da B3.

**Tech Stack:** Next.js 16 (App Router), TypeScript, `@react-pdf/renderer`, Vitest, `pdf-parse`.

## Global Constraints

- Nessuna migration DB — tutti i dati esistono già.
- Nessun cambio di API contract esistente — solo nuovi file.
- Nessuna firma grafica, nessuna cattura in-app — solo nome operatore (risolto server-side da `tecnico_id`) + timestamp.
- Nessuna sezione materiali/lotti nel nuovo documento (già coperti da DdC/Etichetta) — scope minimo, solo fasi.
- Il documento non deve mai citare Allegato XIII come base normativa per il contenuto delle fasi — footer/sottotitolo devono inquadrarlo come registro QMS interno (Art. 10(9) MDR), come deciso nello spec.
- Font: solo Helvetica/Helvetica-Bold nei PDF (nessuna altra font), coerente con tutti i template esistenti.
- Verifica finale per ogni task: `npx tsc --noEmit` (zero errori) + `npx vitest run` (nessuna regressione sul baseline corrente).

---

### Task 1: Estensione tipo dominio — `LavoroFase.tecnico`

**Files:**
- Modify: `src/types/domain.ts:429-448` (interfaccia `LavoroFase`)

**Interfaces:**
- Produces: `LavoroFase.tecnico: { nome: string; cognome: string } | null` — nuovo campo, usato dal Task 3 (query del generatore) e dal Task 2 (rendering del template).

Nessun test dedicato per questo task (modifica di solo tipo, nessun runtime coinvolto) — stesso precedente già seguito in B13 (1/2) per l'estensione di `LavoroDettaglio` con `buono_pdf_url`/`buono_numero`. La verifica è `tsc --noEmit`.

- [ ] **Step 1: Estendi l'interfaccia**

In `src/types/domain.ts`, trova l'interfaccia `LavoroFase` (attualmente righe 429-448):

```typescript
export interface LavoroFase {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  fase_id: string;
  tecnico_id: string | null;
  eseguita_at: string | null;
  esito: 'ok' | 'non_conforme' | 'parziale' | null;
  note: string | null;
  materiali_usati: string | null;
  attrezzatura_usata: string | null;
  valore_misurato: string | null;
  non_conforme: boolean;
  azione_correttiva: string | null;
  fase: {
    codice_fase: string;
    descrizione: string;
    ordine: number;
    obbligatoria: boolean;
    misurazioni_da_rilevare: boolean;
  };
}
```

Sostituiscila con (aggiunto solo il campo `tecnico` alla fine):

```typescript
export interface LavoroFase {
  id: string;
  laboratorio_id: string;
  lavoro_id: string;
  fase_id: string;
  tecnico_id: string | null;
  eseguita_at: string | null;
  esito: 'ok' | 'non_conforme' | 'parziale' | null;
  note: string | null;
  materiali_usati: string | null;
  attrezzatura_usata: string | null;
  valore_misurato: string | null;
  non_conforme: boolean;
  azione_correttiva: string | null;
  fase: {
    codice_fase: string;
    descrizione: string;
    ordine: number;
    obbligatoria: boolean;
    misurazioni_da_rilevare: boolean;
  };
  tecnico: {
    nome: string;
    cognome: string;
  } | null;
}
```

- [ ] **Step 2: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore. Nota: questo campo è opzionale-mancante negli usi esistenti di `LavoroFase` solo se già presente un cast `as unknown as LavoroDettaglio` a valle della query (come in `lavori/[id]/page.tsx:59` e negli altri generatori) — il cast bypassa il controllo strutturale, quindi non ci si aspetta alcun errore nei call site esistenti che non popolano `tecnico` nella query (torneranno `undefined` a runtime dove il campo non è nel `select`, ma TypeScript non lo segnala per via del cast). Questo è coerente con come `LavoroDettaglio` viene già consumato in tutto il progetto.

- [ ] **Step 3: Commit**

```bash
git add src/types/domain.ts
git commit -m "$(cat <<'EOF'
feat(types): estendi LavoroFase con campo tecnico

Aggiunge tecnico: { nome, cognome } | null a LavoroFase per
supportare il rendering del nome operatore nella nuova Scheda
di Fabbricazione (B17), senza dover risolvere tecnico_id lato
client — il nome viene sempre da un join server-side.
EOF
)"
```

---

### Task 2: Template PDF — `SchedaFabbricazioneTemplate.tsx`

**Files:**
- Create: `src/components/features/pdf/SchedaFabbricazioneTemplate.tsx`
- Create: `tests/unit/scheda-fabbricazione-pdf-content.test.ts`

**Interfaces:**
- Consumes: `LavoroDettaglio`, `Laboratorio` da `@/types/domain` (nessun cambio, tipi già esistenti); `LavoroFase.tecnico` prodotto dal Task 1.
- Produces: `SchedaFabbricazioneTemplate` — componente React con props `{ lavoro: LavoroDettaglio; lab: Laboratorio }`, usato dal Task 3.

- [ ] **Step 1: Scrivi il test che fallisce (RED)**

Crea `tests/unit/scheda-fabbricazione-pdf-content.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { createElement } from 'react'
import { PDFParse } from 'pdf-parse'
import { SchedaFabbricazioneTemplate } from '@/components/features/pdf/SchedaFabbricazioneTemplate'
import type { LavoroDettaglio, LavoroFase } from '@/types/domain'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const FASE_OK: LavoroFase = {
  id: 'fase-lav-001',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  fase_id: 'fp-001',
  tecnico_id: 'tec-001',
  eseguita_at: '2026-05-11T09:00:00.000Z',
  esito: 'ok',
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: false,
  azione_correttiva: null,
  fase: {
    codice_fase: 'MODELLAZIONE',
    descrizione: 'Modellazione CAD/CAM',
    ordine: 1,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
  tecnico: { nome: 'Luca', cognome: 'Verdi' },
}

const FASE_NON_CONFORME: LavoroFase = {
  id: 'fase-lav-002',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  fase_id: 'fp-002',
  tecnico_id: 'tec-002',
  eseguita_at: '2026-05-12T14:30:00.000Z',
  esito: 'non_conforme',
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: true,
  azione_correttiva: 'Ripassata lucidatura, esito positivo al secondo controllo',
  fase: {
    codice_fase: 'RIFINITURA',
    descrizione: 'Rifinitura e lucidatura',
    ordine: 2,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
  tecnico: { nome: 'Anna', cognome: 'Bianchi' },
}

const FASE_IN_ATTESA: LavoroFase = {
  id: 'fase-lav-003',
  laboratorio_id: 'lab-test-001',
  lavoro_id: 'lav-test-001',
  fase_id: 'fp-003',
  tecnico_id: null,
  eseguita_at: null,
  esito: null,
  note: null,
  materiali_usati: null,
  attrezzatura_usata: null,
  valore_misurato: null,
  non_conforme: false,
  azione_correttiva: null,
  fase: {
    codice_fase: 'CONTROLLO_FINALE',
    descrizione: 'Controllo qualità finale',
    ordine: 3,
    obbligatoria: true,
    misurazioni_da_rilevare: false,
  },
  tecnico: null,
}

const LAVORO_CON_FASI: LavoroDettaglio = {
  ...LAVORO_FIXTURE,
  fasi: [FASE_OK, FASE_NON_CONFORME, FASE_IN_ATTESA],
}

let pdfText = ''

describe('SchedaFabbricazioneTemplate — PDF content validation', () => {
  beforeAll(async () => {
    const element = createElement(SchedaFabbricazioneTemplate, {
      lavoro: LAVORO_CON_FASI,
      lab: LAB_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    pdfText = result.text
  }, 30_000)

  it('PDF > 1 KB', async () => {
    const element = createElement(SchedaFabbricazioneTemplate, {
      lavoro: LAVORO_CON_FASI,
      lab: LAB_FIXTURE,
    })
    const buffer = await renderPdfDocument(element)
    expect(buffer.length).toBeGreaterThan(1024)
  })

  it('titolo contiene "scheda di fabbricazione" (case-insensitive)', () => {
    expect(pdfText.toLowerCase()).toContain('scheda di fabbricazione')
  })

  it('footer NON cita Allegato XIII come base del contenuto fasi (corregge l\'errore di attribuzione originale)', () => {
    expect(pdfText).not.toContain('Allegato XIII')
  })

  it('footer cita Art. 10(9) MDR come base normativa corretta', () => {
    expect(pdfText).toContain('10(9)')
  })

  it('stampa numero lavoro', () => {
    expect(pdfText).toContain(LAVORO_FIXTURE.numero_lavoro)
  })

  it('stampa codice ITCA del laboratorio', () => {
    expect(pdfText).toContain('ITCA01051686')
  })

  // ── Fase OK ──────────────────────────────────────────────────────────────

  it('fase OK: stampa codice fase', () => {
    expect(pdfText).toContain('MODELLAZIONE')
  })

  it('fase OK: stampa nome operatore', () => {
    expect(pdfText).toContain('Luca Verdi')
  })

  it('fase OK: stampa esito "OK"', () => {
    expect(pdfText).toContain('OK')
  })

  // ── Fase non conforme ────────────────────────────────────────────────────

  it('fase non conforme: stampa esito "Non conforme"', () => {
    expect(pdfText).toContain('Non conforme')
  })

  it('fase non conforme: stampa azione correttiva', () => {
    expect(pdfText).toContain('Ripassata lucidatura, esito positivo al secondo controllo')
  })

  // ── Fase in attesa ───────────────────────────────────────────────────────

  it('fase in attesa: stampa "In attesa" (esito null, non ancora eseguita)', () => {
    expect(pdfText).toContain('In attesa')
  })

  it('fase in attesa: stampa comunque il codice fase (nessun crash su tecnico/eseguita_at null)', () => {
    expect(pdfText).toContain('CONTROLLO_FINALE')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/scheda-fabbricazione-pdf-content.test.ts`
Expected: FALLISCE con un errore di import (`src/components/features/pdf/SchedaFabbricazioneTemplate.tsx` non esiste ancora).

- [ ] **Step 3: Crea il template**

Crea `src/components/features/pdf/SchedaFabbricazioneTemplate.tsx`:

```typescript
// UÀ — SchedaFabbricazioneTemplate
// Registro tracciabilità fasi di lavorazione — documento interno QMS
// Art. 10(9) MDR 2017/745 — NON un output richiesto da Allegato XIII
// Usa SOLO proprietà CSS supportate da @react-pdf/renderer

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { LavoroDettaglio, Laboratorio, LavoroFase } from '@/types/domain'

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    paddingTop: 28,
    paddingBottom: 40,
    paddingLeft: 36,
    paddingRight: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1pt solid #cccccc',
  },
  headerLeft: {
    flex: 1,
  },
  labNome: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  headerMeta: {
    fontSize: 7.5,
    color: '#555555',
    marginBottom: 1,
  },
  titoloPrinc: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#1a1a1a',
    marginBottom: 3,
    marginTop: 8,
  },
  sottotitolo: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  fieldLabel: {
    width: 110,
    fontSize: 8,
    color: '#888888',
  },
  fieldValue: {
    flex: 1,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  // Tabella fasi
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #1a1a1a',
    paddingBottom: 4,
    marginTop: 10,
    marginBottom: 4,
  },
  colCodiceH: {
    flex: 2,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  colEsitoH: {
    width: 70,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  colOperatoreH: {
    flex: 1.5,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  colDataH: {
    width: 75,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#555555',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 5,
    paddingBottom: 5,
    borderBottom: '0.5pt solid #eeeeee',
  },
  colCodice: {
    flex: 2,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  colCodiceDescr: {
    fontSize: 7.5,
    color: '#888888',
    marginTop: 1,
  },
  colEsito: {
    width: 70,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  colEsitoNonConforme: {
    width: 70,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#B91C1C',
  },
  colOperatore: {
    flex: 1.5,
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  colData: {
    width: 75,
    fontSize: 8,
    color: '#1a1a1a',
  },
  azioneCorrettivaRow: {
    paddingTop: 2,
    paddingBottom: 4,
    paddingLeft: 4,
    borderBottom: '0.5pt solid #eeeeee',
  },
  azioneCorrettivaLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#B91C1C',
  },
  azioneCorrettivaText: {
    fontSize: 7.5,
    color: '#555555',
    lineHeight: 1.3,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: '0.5pt solid #cccccc',
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: '#888888',
    lineHeight: 1.3,
  },
})

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDataOra(isoString: string | null): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function esitoLabel(fase: LavoroFase): string {
  if (!fase.eseguita_at) return 'In attesa'
  if (fase.esito === 'ok') return 'OK'
  if (fase.esito === 'non_conforme') return 'Non conforme'
  if (fase.esito === 'parziale') return 'Parziale'
  return '—'
}

function operatoreLabel(fase: LavoroFase): string {
  if (!fase.tecnico) return '—'
  return `${fase.tecnico.nome} ${fase.tecnico.cognome}`
}

function labIndirizzoCompleto(lab: Laboratorio): string {
  const parts = [lab.indirizzo, lab.cap, lab.citta, lab.provincia].filter(Boolean)
  return parts.join(', ') || '—'
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface SchedaFabbricazioneTemplateProps {
  lavoro: LavoroDettaglio
  lab: Laboratorio
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SchedaFabbricazioneTemplate({ lavoro, lab }: SchedaFabbricazioneTemplateProps) {
  const dataEmissione = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const labNome = lab.ragione_sociale ?? lab.nome
  const tipoFormatted = lavoro.tipo_dispositivo.replace(/_/g, ' ')
  const fasiOrdinate = [...lavoro.fasi].sort((a, b) => a.fase.ordine - b.fase.ordine)

  return (
    <Document
      title={`Scheda di Fabbricazione ${lavoro.numero_lavoro}`}
      creator="UA PWA"
      subject="Registro tracciabilità fasi di lavorazione — documento interno"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.labNome}>{labNome}</Text>
            {lab.codice_itca && (
              <Text style={styles.headerMeta}>ITCA: {lab.codice_itca}</Text>
            )}
            <Text style={styles.headerMeta}>{labIndirizzoCompleto(lab)}</Text>
          </View>
        </View>

        {/* ── TITOLO ── */}
        <Text style={styles.titoloPrinc}>SCHEDA DI FABBRICAZIONE</Text>
        <Text style={styles.sottotitolo}>
          Registro tracciabilità fasi di lavorazione — documento interno,
          parte del Fascicolo Tecnico (Art. 10(9) MDR 2017/745)
        </Text>

        {/* ── IDENTIFICAZIONE LAVORO ── */}
        <Text style={styles.sectionTitle}>Identificazione Lavoro</Text>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Numero lavoro:</Text>
          <Text style={styles.fieldValue}>{lavoro.numero_lavoro}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Tipo dispositivo:</Text>
          <Text style={styles.fieldValue}>{tipoFormatted}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Descrizione:</Text>
          <Text style={styles.fieldValue}>{lavoro.descrizione}</Text>
        </View>

        {/* ── TABELLA FASI ── */}
        <Text style={styles.sectionTitle}>Fasi di Lavorazione</Text>
        <View style={styles.tableHeader} fixed>
          <Text style={styles.colCodiceH}>Fase</Text>
          <Text style={styles.colEsitoH}>Esito</Text>
          <Text style={styles.colOperatoreH}>Operatore</Text>
          <Text style={styles.colDataH}>Data/ora</Text>
        </View>

        {fasiOrdinate.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={{ ...styles.colCodice, color: '#999999' }}>
              Nessuna fase configurata per questo lavoro
            </Text>
          </View>
        ) : (
          fasiOrdinate.map((f) => (
            <View key={f.id}>
              <View style={styles.tableRow}>
                <View style={styles.colCodice}>
                  <Text>{f.fase.codice_fase}</Text>
                  <Text style={styles.colCodiceDescr}>{f.fase.descrizione}</Text>
                </View>
                <Text style={f.non_conforme ? styles.colEsitoNonConforme : styles.colEsito}>
                  {esitoLabel(f)}
                </Text>
                <Text style={styles.colOperatore}>{operatoreLabel(f)}</Text>
                <Text style={styles.colData}>{formatDataOra(f.eseguita_at)}</Text>
              </View>
              {f.non_conforme && f.azione_correttiva && (
                <View style={styles.azioneCorrettivaRow}>
                  <Text style={styles.azioneCorrettivaLabel}>Azione correttiva: </Text>
                  <Text style={styles.azioneCorrettivaText}>{f.azione_correttiva}</Text>
                </View>
              )}
            </View>
          ))
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Emesso da: {labNome}
            {lab.codice_itca ? ` — ITCA ${lab.codice_itca}` : ''} — {dataEmissione}
          </Text>
          <Text style={styles.footerText}>
            Documento interno di tracciabilità QMS — Art. 10(9) MDR 2017/745.
            Non costituisce Dichiarazione di Conformità né documento consegnato al paziente/prescrittore.
          </Text>
        </View>

      </Page>
    </Document>
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/scheda-fabbricazione-pdf-content.test.ts`
Expected: PASS — tutti i test.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/pdf/SchedaFabbricazioneTemplate.tsx tests/unit/scheda-fabbricazione-pdf-content.test.ts
git commit -m "$(cat <<'EOF'
feat(pdf): aggiungi SchedaFabbricazioneTemplate (B17)

Nuovo template PDF interno per la tracciabilità delle fasi di
lavorazione (codice, descrizione, esito, operatore, data/ora),
inquadrato correttamente come registro QMS Art. 10(9) MDR — non
come output richiesto da Allegato XIII (errore di attribuzione
corretto durante la ricerca propedeutica a questo lavoro). Nessuna
firma grafica, nessuna sezione materiali/lotti (già coperti da
DdC/Etichetta).
EOF
)"
```

---

### Task 3: Generatore — `generate-scheda-fabbricazione.ts`

**Files:**
- Create: `src/lib/pdf/generate-scheda-fabbricazione.ts`
- Create: `tests/unit/generate-scheda-fabbricazione.test.ts`

**Interfaces:**
- Consumes: `SchedaFabbricazioneTemplate` (Task 2), `getTypedServiceClient()` da `@/lib/pdf/typed-service-client`, `renderPdfDocument()` da `@/lib/pdf/render-document`.
- Produces: `generateSchedaFabbricazione(lavoro_id: string, laboratorio_id: string): Promise<Buffer>`, usata dal Task 4.

- [ ] **Step 1: Scrivi il test che fallisce (RED)**

Crea `tests/unit/generate-scheda-fabbricazione.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateSchedaFabbricazione } from '../../src/lib/pdf/generate-scheda-fabbricazione'

describe('generateSchedaFabbricazione', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('genera una Scheda di Fabbricazione con fasi presenti', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    const buffer = await generateSchedaFabbricazione('lav-test-001', 'lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('la query su lavori include il join tecnico:tecnici(nome, cognome) dentro fasi', async () => {
    let selectArg = ''
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') {
        const chain = createChain({ data: LAVORO_FIXTURE, error: null })
        const originalSelect = chain.select as (...args: unknown[]) => unknown
        chain.select = (...args: unknown[]) => {
          selectArg = String(args[0])
          return originalSelect(...args)
        }
        return chain
      }
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await generateSchedaFabbricazione('lav-test-001', 'lab-test-001')
    expect(selectArg).toContain('tecnico:tecnici(nome, cognome)')
  })

  it('lavoro non trovato → lancia errore esplicito', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: null, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await expect(
      generateSchedaFabbricazione('lav-inesistente', 'lab-test-001')
    ).rejects.toThrow('Lavoro non trovato')
  })

  it('laboratorio non trovato → lancia errore esplicito', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: null, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await expect(
      generateSchedaFabbricazione('lav-test-001', 'lab-inesistente')
    ).rejects.toThrow('Laboratorio non trovato')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/generate-scheda-fabbricazione.test.ts`
Expected: FALLISCE con un errore di import (`src/lib/pdf/generate-scheda-fabbricazione.ts` non esiste ancora).

- [ ] **Step 3: Crea il generatore**

Crea `src/lib/pdf/generate-scheda-fabbricazione.ts`:

```typescript
import 'server-only'
import { createElement } from 'react'
import { getTypedServiceClient } from '@/lib/pdf/typed-service-client'
import { renderPdfDocument } from '@/lib/pdf/render-document'
import { SchedaFabbricazioneTemplate } from '@/components/features/pdf/SchedaFabbricazioneTemplate'
import type { LavoroDettaglio, Laboratorio } from '@/types/domain'

export async function generateSchedaFabbricazione(
  lavoro_id: string,
  laboratorio_id: string
): Promise<Buffer> {
  const supabase = getTypedServiceClient()

  const { data: lavoro, error } = await supabase
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      fasi:lavori_fasi(*, fase:fasi_produzione(*), tecnico:tecnici(nome, cognome))
    `)
    .eq('id', lavoro_id)
    .eq('laboratorio_id', laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (error || !lavoro) throw new Error('Lavoro non trovato')

  const { data: lab } = await supabase
    .from('laboratori')
    .select('*')
    .eq('id', laboratorio_id)
    .single()
  if (!lab) throw new Error('Laboratorio non trovato')

  return renderPdfDocument(
    createElement(SchedaFabbricazioneTemplate, {
      lavoro: lavoro as unknown as LavoroDettaglio,
      lab: lab as Laboratorio,
    })
  )
}
```

- [ ] **Step 4: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/generate-scheda-fabbricazione.test.ts`
Expected: PASS — tutti e 4 i test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-scheda-fabbricazione.ts tests/unit/generate-scheda-fabbricazione.test.ts
git commit -m "$(cat <<'EOF'
feat(pdf): aggiungi generateSchedaFabbricazione (B17)

Generatore live on-demand (nessuna persistenza Storage, a
differenza di DdC/Buono/IFU) — il contenuto cambia ogni volta che
una fase viene eseguita, pre-generare non avrebbe senso. Stesso
scheletro di generate-ifu.ts/generate-cedolino-tecnico.ts. Query
lavori estesa con join tecnico:tecnici(nome, cognome) dentro fasi
per risolvere il nome operatore server-side.
EOF
)"
```

---

### Task 4: Route API — `GET /api/lavori/[id]/scheda-fabbricazione`

**Files:**
- Create: `src/app/api/lavori/[id]/scheda-fabbricazione/route.ts`
- Create: `tests/unit/scheda-fabbricazione-route.test.ts`

**Interfaces:**
- Consumes: `generateSchedaFabbricazione(lavoro_id, laboratorio_id)` (Task 3).
- Produces: `GET` handler Next.js route, usato dal Task 5 (link nella pagina lavoro).

**Nota di design (deviazione intenzionale dal sibling `/api/lavori/[id]/ifu/route.ts`):** quella route esistente ritorna `{ error: e.message }` con status 400 su fallimento del generatore, esponendo il messaggio grezzo. Questo piano adotta invece il pattern più recente e già rivisto (B10 hardening): status 500 + messaggio generico, nessun leak di dettagli interni. Non è un'incoerenza dimenticata — è una scelta esplicita già presa nello spec di questo lavoro.

- [ ] **Step 1: Scrivi il test che fallisce (RED)**

Crea `tests/unit/scheda-fabbricazione-route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockGenerate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockGenerate: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/pdf/generate-scheda-fabbricazione', () => ({
  generateSchedaFabbricazione: mockGenerate,
}))

import { GET } from '../../src/app/api/lavori/[id]/scheda-fabbricazione/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const LAVORO_ID = 'lav-1'

function mockUtenteELavoro(lavoroResult: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }),
          }),
        }),
      }
    }
    if (table === 'lavori') {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'is']
      for (const m of methods) chain[m] = () => chain
      chain.single = async () => lavoroResult
      return chain
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/lavori/[id]/scheda-fabbricazione', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 404 (utente non trovato)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(404)
  })

  it('lavoro non trovato o di un altro lab → 404', async () => {
    mockUtenteELavoro({ data: null, error: null })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(404)
  })

  it('lavoro trovato → 200, Content-Type application/pdf, Content-Disposition con numero lavoro', async () => {
    mockUtenteELavoro({ data: { id: LAVORO_ID, numero_lavoro: 'LAV-2026-0007' }, error: null })
    mockGenerate.mockResolvedValue(Buffer.from('finto-pdf'))

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('LAV-2026-0007')
    expect(mockGenerate).toHaveBeenCalledWith(LAVORO_ID, LAB_ID)
  })

  it('errore nella generazione del PDF → 500, messaggio generico (nessun leak errore grezzo)', async () => {
    mockUtenteELavoro({ data: { id: LAVORO_ID, numero_lavoro: 'LAV-2026-0007' }, error: null })
    mockGenerate.mockRejectedValue(new Error('connection error, socket 5432 refused'))

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).not.toContain('connection error')
    expect(json.error).not.toContain('5432')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `npx vitest run tests/unit/scheda-fabbricazione-route.test.ts`
Expected: FALLISCE con un errore di import (`src/app/api/lavori/[id]/scheda-fabbricazione/route.ts` non esiste ancora).

- [ ] **Step 3: Crea la route**

Crea `src/app/api/lavori/[id]/scheda-fabbricazione/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generateSchedaFabbricazione } from '@/lib/pdf/generate-scheda-fabbricazione'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id: lavoro_id } = await params

  const supabaseService = getServiceClient()
  const { data: utente } = await supabaseService
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Verifica appartenenza al lab (guard cross-tenant)
  const { data: lavoro } = await supabaseService
    .from('lavori')
    .select('id, numero_lavoro')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()
  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

  try {
    const buffer = await generateSchedaFabbricazione(lavoro_id, utente.laboratorio_id)
    const filename = `Scheda_Fabbricazione_${lavoro.numero_lavoro}.pdf`.replace(/\s+/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Errore nella generazione del documento' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Esegui il test e verifica che passi (GREEN)**

Run: `npx vitest run tests/unit/scheda-fabbricazione-route.test.ts`
Expected: PASS — tutti e 5 i test.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/lavori/\[id\]/scheda-fabbricazione/route.ts tests/unit/scheda-fabbricazione-route.test.ts
git commit -m "$(cat <<'EOF'
feat(api): aggiungi GET /api/lavori/[id]/scheda-fabbricazione (B17)

Route di download on-demand, stessa struttura auth/guard cross-tenant
di /api/lavori/[id]/ifu — deviazione intenzionale sul fallimento del
generatore: 500 + messaggio generico invece di 400 + e.message grezzo
(pattern hardening già stabilito in B10, non ancora applicato al
sibling ifu/route.ts, fuori scope qui).
EOF
)"
```

---

### Task 5: Link di download nella pagina dettaglio lavoro

**Files:**
- Modify: `src/app/(app)/lavori/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/lavori/[id]/scheda-fabbricazione` (Task 4), `lavoroDettaglio.fasi` (già caricato dalla query esistente in questo file).

Nessun test dedicato — coerente con l'assenza di test diretti per gli altri file `page.tsx` in questo progetto (verificato: nessun test esiste per `lavori/[id]/page.tsx` stesso). Verifica tramite `tsc`/`build` + QA browser raccomandata a fine piano.

- [ ] **Step 1: Aggiungi il link condizionale**

In `src/app/(app)/lavori/[id]/page.tsx`, dopo il blocco `{/* Rifacimento — disponibile su consegnato, pronto, sospeso */}` (righe 93-101 attuali, subito prima della chiusura `</PageWrapper>`), aggiungi:

```typescript
      {/* Scheda di Fabbricazione — download on-demand, disponibile se esistono fasi */}
      {lavoroDettaglio.fasi.length > 0 && (
        <div style={{ padding: '0 20px 24px' }}>
          <a
            href={`/api/lavori/${id}/scheda-fabbricazione`}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              height: 44,
              borderRadius: 12,
              background: 'var(--elv, #EDEDEA)',
              border: '1.5px solid var(--prs, #D4CFC9)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--t2, #4A3D33)',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
            aria-label="Scarica Scheda di Fabbricazione"
          >
            📄 Scarica Scheda di Fabbricazione
          </a>
        </div>
      )}
```

Il file completo dopo questa modifica (solo la sezione finale, dal blocco Rifacimento in poi):

```typescript
      {/* Rifacimento — disponibile su consegnato, pronto, sospeso */}
      {(['consegnato', 'pronto', 'sospeso'] as const).includes(lavoroDettaglio.stato as 'consegnato' | 'pronto' | 'sospeso') && (
        <div style={{ padding: '0 20px 24px' }}>
          <RifacimentoButton
            lavoroId={id}
            numeroLavoro={lavoroDettaglio.numero_lavoro}
          />
        </div>
      )}

      {/* Scheda di Fabbricazione — download on-demand, disponibile se esistono fasi */}
      {lavoroDettaglio.fasi.length > 0 && (
        <div style={{ padding: '0 20px 24px' }}>
          <a
            href={`/api/lavori/${id}/scheda-fabbricazione`}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              height: 44,
              borderRadius: 12,
              background: 'var(--elv, #EDEDEA)',
              border: '1.5px solid var(--prs, #D4CFC9)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--t2, #4A3D33)',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
            aria-label="Scarica Scheda di Fabbricazione"
          >
            📄 Scarica Scheda di Fabbricazione
          </a>
        </div>
      )}
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Verifica globale**

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: baseline + tutti i nuovi test dei Task 2-4, nessuna regressione.

Run: `npx next build`
Expected: build pulita, route `/api/lavori/[id]/scheda-fabbricazione` presente nel manifest.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/lavori/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(lavori): aggiungi link download Scheda di Fabbricazione (B17)

Link stile bottone (non un client component — il download via GET
diretto del browser non richiede stato React, a differenza di
RifacimentoButton che fa una POST con conferma/loading/errore),
visibile solo se il lavoro ha almeno una fase configurata.
EOF
)"
```

---

### Task 6: Verifica finale e aggiornamento memoria progetto

**Files:**
- Modify: `memory/MEMORY.md`
- Modify: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B17)
- Modify: `memory/SESSION_ACTIVE.md`

Nessun nuovo codice in questo task — solo verifica end-to-end e aggiornamento della documentazione obbligatoria (BP-1, CLAUDE.md §0A).

- [ ] **Step 1: Verifica finale completa**

Run: `npx tsc --noEmit`
Expected: 0 errori.

Run: `npx vitest run`
Expected: baseline (verificare il conteggio reale a inizio task, atteso baseline + ~13-15 nuovi test tra Task 2/3/4) — nessuna regressione.

Run: `npx next build`
Expected: build production pulita, route `/api/lavori/[id]/scheda-fabbricazione` presente nel manifest, nessun errore TypeScript.

- [ ] **Step 2: Aggiorna `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`**

Nella sezione `### B17.` (riga 35 tabella + sezione narrativa `## 🔴 BLOCKER`), aggiungi un paragrafo "✅ RISOLTO (data)" in testa alla sezione narrativa esistente, seguendo lo stesso pattern già usato per B9/B10/B11/B12/B15/B20 in questo file — senza cancellare la descrizione originale, che resta sotto etichettata "Descrizione originale del bug (storico)". Includi esplicitamente la correzione normativa (Allegato XIII → Art. 10(9) MDR/QMS interno) nel testo, con riferimento allo spec `docs/superpowers/specs/2026-07-05-b17-scheda-fabbricazione-design.md`. Aggiorna la riga tabella B17 da `⏳` a `✅` con data/commit.

- [ ] **Step 3: Aggiorna `memory/MEMORY.md`**

Aggiungi una nuova voce in testa al file (sopra l'attuale prima voce), stesso stile prosa densa già usato nel file: cosa era il gap originale, la correzione normativa scoperta (errore di attribuzione Allegato XIII, deep-research 108 agent), il design scelto (Scheda di Fabbricazione, generazione live on-demand, nessuna firma), riferimento al piano/spec, verifica (conteggio test reale post-fix, tsc/build puliti). Menziona anche l'apertura di B20 come effetto collaterale della ricerca.

- [ ] **Step 4: Aggiorna `memory/SESSION_ACTIVE.md`**

Sostituisci il contenuto (non appendere) con un handoff sintetico: B17 risolto in questo lavoro (worktree/branch secondo lo schema usato), B20 aperto separatamente, non ancora mergiato su `main`, prossima priorità da decidere tra i blocker rimanenti (B5, B6, B14, B16, B20).

- [ ] **Step 5: Commit della documentazione**

```bash
git add memory/MEMORY.md memory/SESSION_ACTIVE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "$(cat <<'EOF'
docs: aggiorna memoria progetto — B17 risolto (Scheda di Fabbricazione)

Nuovo documento PDF interno per tracciabilità fasi di lavorazione,
corretta l'attribuzione normativa errata del backlog originale
(non un requisito Allegato XIII, ma QMS Art. 10(9) MDR). Verificato:
tsc/vitest/next build puliti.
EOF
)"
```

## Nota su isolamento (worktree)

Da eseguire in un worktree isolato dedicato (`superpowers:using-git-worktrees`), separato da qualunque altro worktree attivo. Nessuna migration, impatto contenuto a 3 file nuovi (template, generatore, route) + 2 file modificati (domain.ts, lavori/[id]/page.tsx).

## Nota per la prossima sessione — QA browser consigliata post-merge

Prima del merge finale: scaricare la Scheda di Fabbricazione per un lavoro E2E con fasi miste (eseguita OK, non conforme con azione correttiva, in attesa) — creare un ciclo/fasi di test se non già presenti (stesso pattern già usato nella QA del bundle B12+B15+B11), verificare visivamente la tabella, il footer (nessun riferimento a Allegato XIII, presente riferimento Art. 10(9)), e che il link non compaia su un lavoro senza fasi configurate. Dati di test da rimuovere a fine QA, mai sul lab Filippo.
