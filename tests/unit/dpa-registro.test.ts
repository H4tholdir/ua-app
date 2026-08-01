// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { createChain, type MockChain, type ChainCall } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, CLIENTE_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpdate, mockUpload, mockDownload, mockStorageFrom, mockProgressivo } = vi.hoisted(() => {
  const mockUpload = vi.fn()
  const mockDownload = vi.fn()
  return {
    mockFrom: vi.fn(), mockInsert: vi.fn(), mockUpdate: vi.fn(), mockUpload, mockDownload, mockProgressivo: vi.fn(),
    /** Il CONTENITORE dell'archivio, ASSERIBILE — e fail-closed su tutto il resto.
     *
     *  🔑 Prima ignorava il proprio argomento, e scrivere `.from('documenti-sbagliato')`
     *  lasciava verdi tutte e tre le reti (prove, `tsc`, `eslint`): misurato dalla
     *  revisione del Task 5, rilievo I1. In produzione quel refuso vuol dire che il PDF
     *  conservato non si trova MAI, e ogni clic archivia la riga e brucia un numero.
     *  Su un registro GDPR il contenitore privato è la premessa, non un dettaglio:
     *  `documenti` è privato, e un contenitore diverso può non esserlo.
     *
     *  🛑 Contenitore sconosciuto = ECCEZIONE, mai «passa» — la stessa regola che
     *  `applicaFiltri` applica agli operatori: un mock che accetta in silenzio ciò che
     *  non sa leggere è il posto dove sopravvive il prossimo mutante. */
    mockStorageFrom: vi.fn((contenitore: string) => {
      if (contenitore !== 'documenti') {
        throw new Error(`Mock DPA: contenitore inatteso «${contenitore}» — i DPA vivono nel contenitore privato «documenti»`)
      }
      return { upload: mockUpload, download: mockDownload }
    }),
  }
})
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: mockProgressivo }))

import { generateDpa } from '@/lib/pdf/generate-dpa'
import { improntaDpa, VERSIONE_MODELLO_DPA } from '@/lib/pdf/dpa-modello'

/** L'anno civile di Roma calcolato QUI, senza passare da `annoRoma()`.
 *  🔑 Se lo calcolassi con la stessa funzione che usa l'implementazione, la prova
 *  confronterebbe l'implementazione con sé stessa e resterebbe verde anche se
 *  qualcuno passasse all'anno UTC — cioè proprio il guasto di capodanno che
 *  `src/lib/db/progressivi.ts:12-15` documenta come già pagato una volta. */
const ANNO_ROMA = Number(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric' }).format(new Date())
)

/** Le catene consegnate da `from()`, indicizzate per TABELLA.
 *  🔑 NON si selezionano per posizione in `mockFrom.mock.results`: l'ordine delle
 *  chiamate è un dettaglio dell'implementazione (`Promise.all` valuta l'array da
 *  sinistra), e una prova che ci si appoggia guarda la catena sbagliata appena
 *  qualcuno riordina due righe — restando verde o rossa per la ragione sbagliata. */
const catene: Record<string, MockChain> = {}

/** TUTTE le catene consegnate per `data_processing_agreements`, in ordine di
 *  consegna.
 *  🔑 Non UNA sola, e non è pignoleria: nel ramo dell'orfana `from()` su quella
 *  tabella è chiamato DUE volte — la lettura del guard e l'UPDATE di
 *  soft-delete. Tenerne una sola in una casella significa che la seconda
 *  sovrascrive la prima, e le asserzioni sui filtri della LETTURA finirebbero a
 *  leggere la catena dell'AGGIORNAMENTO: rosse o verdi per la ragione
 *  sbagliata. È esattamente la forma di difetto che il Task 4 ha trovato nel
 *  proprio brief (referto Task 4, §2.1). */
const cateneDpa: MockChain[] = []
const catenaGuard = (): MockChain => {
  const c = cateneDpa.find((x) => x.calls[0]?.method === 'select')
  if (!c) throw new Error('Nessuna catena di LETTURA su data_processing_agreements')
  return c
}

/** Applica DAVVERO i filtri della query alla riga candidata.
 *
 *  🔑 Perché non basta `createChain`: quella restituisce il suo `result`
 *  QUALUNQUE filtro riceva. Con quella, togliere dal guard
 *  `.eq('template_versione', …)` — cioè una delle quattro colonne su cui
 *  l'indice `dpa_emissione_viva_unica` deduplica — lascia le prove VERDI, e il
 *  dentista si ritrova col testo vecchio mentre il laboratorio crede di avergli
 *  mandato quello nuovo (D133). Misurato: v. referto §1.4.
 *
 *  🛑 Sconosciuto = ECCEZIONE, mai «passa». Un mock che ignora in silenzio un
 *  operatore che non sa leggere diventa il posto dove sopravvive il prossimo
 *  mutante: sostituire `.not('stato','in',…)` con `.neq('stato','revocato')`
 *  DEVE far esplodere la prova, non passarla di soppiatto. */
function applicaFiltri(riga: Record<string, unknown> | null, calls: ChainCall[]): Record<string, unknown> | null {
  if (!riga) return null
  const esigiColonna = (col: string) => {
    if (!(col in riga)) throw new Error(`Mock DPA: filtro sulla colonna «${col}», assente dalla fixture della riga`)
  }
  for (const c of calls) {
    // Non sono filtri: non restringono l'insieme, non hanno nulla da applicare.
    // 🔑 `select` è escluso QUI perché non restringe le RIGHE — restringe le
    //    COLONNE, e quello lo fa `proietta()` DOPO. È l'ordine del database:
    //    il WHERE vede la riga intera, la proiezione arriva dopo. Per questo
    //    un filtro su una colonna che la `select` non chiede resta legittimo.
    if (c.method === 'select' || c.method === 'order' || c.method === 'limit' || c.method === 'maybeSingle') continue
    if (c.method === 'eq') {
      const [col, val] = c.args as [string, unknown]
      esigiColonna(col)
      if (riga[col] !== val) return null
      continue
    }
    if (c.method === 'is') {
      const [col, val] = c.args as [string, unknown]
      if (val !== null) throw new Error(`Mock DPA: .is() con valore non gestito: ${String(val)}`)
      esigiColonna(col)
      if (riga[col] !== null) return null
      continue
    }
    if (c.method === 'not') {
      const [col, operatore, val] = c.args as [string, string, string]
      if (operatore !== 'in') throw new Error(`Mock DPA: .not() con operatore non gestito: ${operatore}`)
      esigiColonna(col)
      // '("revocato","scaduto")' → ['revocato','scaduto']
      const esclusi = val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/^"|"$/g, ''))
      if (esclusi.includes(String(riga[col]))) return null
      continue
    }
    throw new Error(`Mock DPA: metodo di filtro non gestito dal mock: ${c.method}`)
  }
  return riga
}

/** Rende SOLO le colonne che la `select` ha davvero chiesto.
 *
 *  🔑 Perché adesso e non «quando servirà»: senza questa proiezione il mock
 *  restituisce la riga INTERA qualunque cosa la query chieda, e togliere
 *  `storage_path_pdf` dalla `select` del guard lascia la suite VERDE — il PDF
 *  conservato non verrebbe più trovato in produzione e nessuna prova lo
 *  direbbe. Oggi quel mutante lo prende solo `tsc` (TS2339 sull'accesso a una
 *  colonna non chiesta), cioè una rete che c'è ma è DIVERSA da quella che si
 *  crede: `tsc` vede il typo, non la colonna dimenticata di proposito.
 *  Misurato dalla revisione del Task 5, rilievo I2.
 *
 *  🔑 Perché conviene metterla qui e non nell'helper condiviso: il costo sono
 *  dodici righe in un file solo, il beneficio lo ereditano il Task 6 e il
 *  Task 7 — che rileggono la STESSA tabella con la STESSA select — mentre
 *  toccare `createChain` cambierebbe il comportamento di 373 file di prova per
 *  un guadagno che nessuno di loro ha chiesto.
 *
 *  🛑 Fail-closed su tutto ciò che non sa fare: una lettura senza `select`, una
 *  select annidata (`cliente(nome)`) o una colonna che la fixture non ha sono
 *  ECCEZIONI, non silenzi. */
function proietta(riga: Record<string, unknown>, calls: ChainCall[]): Record<string, unknown> {
  const select = calls.find((c) => c.method === 'select')
  if (!select) throw new Error('Mock DPA: lettura senza select — il mock non sa quali colonne rendere')
  const lista = String(select.args[0] ?? '')
  if (lista.includes('(')) throw new Error(`Mock DPA: select annidata non gestita dal mock: ${lista}`)
  const colonne = lista.split(',').map((s) => s.trim()).filter(Boolean)
  if (colonne.includes('*')) return riga
  const proiettata: Record<string, unknown> = {}
  for (const col of colonne) {
    if (!(col in riga)) throw new Error(`Mock DPA: select sulla colonna «${col}», assente dalla fixture della riga`)
    proiettata[col] = riga[col]
  }
  return proiettata
}

function montaTabelle(emissioneEsistente: Record<string, unknown> | null) {
  for (const k of Object.keys(catene)) delete catene[k]
  cateneDpa.length = 0
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'laboratori') {
      return (catene.laboratori = createChain({ data: LAB_FIXTURE, error: null }))
    }
    if (tabella === 'clienti') {
      return (catene.clienti = createChain({ data: CLIENTE_FIXTURE, error: null }))
    }
    if (tabella === 'data_processing_agreements') {
      const c = createChain({ data: null, error: null })
      c.insert = mockInsert
      // `createChain` non espone `update` (v. il suo elenco di passthrough):
      // il guard di riuso è il primo a servirsene, per il soft-delete
      // dell'orfana. Va da `mockUpdate` e non da un passthrough della catena
      // perché così l'ORDINE rispetto all'insert è asseribile.
      c.update = mockUpdate
      c.maybeSingle = async () => {
        c.calls.push({ method: 'maybeSingle', args: [] })
        // Prima il WHERE sulla riga intera, POI la proiezione: l'ordine del database.
        const trovata = applicaFiltri(emissioneEsistente, c.calls)
        return { data: trovata === null ? null : proietta(trovata, c.calls), error: null }
      }
      cateneDpa.push(c)
      return c
    }
    throw new Error(`Tabella inattesa nel mock: ${tabella}`)
  })
}

describe('emissione nuova', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockProgressivo.mockResolvedValue(7)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-1' }, error: null }))
  })

  it('quando non esiste nulla: carica il file, prende un progressivo, scrive la riga', async () => {
    montaTabelle(null)
    const r = await generateDpa('lab-test-001', 'cli-001')

    expect(r.riemessa).toBe(true)
    expect(r.numero_dpa).toBe(`DPA-${ANNO_ROMA}-0007`)
    expect(r.emissione_id).toBe('em-1')
    expect(r.buffer.length).toBeGreaterThan(0)

    // il FILE prima della RIGA
    expect(mockUpload).toHaveBeenCalledBefore(mockInsert as never)

    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.tipo_controparte).toBe('dentista')
    expect(riga.dentista_id).toBe('cli-001')
    expect(riga.laboratorio_id).toBe('lab-test-001')
    expect(riga.stato).toBe('da_firmare')
    expect(riga.template_versione).toBe(VERSIONE_MODELLO_DPA)   // 🛑 D133: MAI il letterale
    expect(riga.progressivo_dpa).toBe(7)
    expect(riga.anno_dpa).toBe(ANNO_ROMA)
    expect(riga.numero_dpa).toBe(`DPA-${ANNO_ROMA}-0007`)
    expect(String(riga.storage_path_pdf)).toMatch(/^lab-test-001\/dpa\/\d{4}\/DPA-\d{4}-0007\.pdf$/)
    // 🔑 Non `toHaveLength(64)`: il vincolo vero in banca dati è
    // `dpa_impronte_esadecimali` (`^[0-9a-f]{64}$`), e una prova più debole del
    // vincolo lascia passare proprio la forma che il vincolo esiste per fermare.
    expect(String(riga.pdf_sha256)).toMatch(/^[0-9a-f]{64}$/)
    expect(String(riga.payload_sha256)).toMatch(/^[0-9a-f]{64}$/)
    expect(riga.emesso_at).toBeTruthy()
  })

  it("il progressivo è chiesto col tipo «dpa» e con l'anno di Roma", async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    expect(mockProgressivo).toHaveBeenCalledWith(expect.anything(), 'lab-test-001', 'dpa', ANNO_ROMA)
  })

  it("la lettura del cliente porta SEMPRE il filtro laboratorio_id (il client di servizio aggira la RLS)", async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    expect(catene.clienti.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-test-001'] })
  })

  it('la riga di registro nasce dentro il proprio laboratorio, e il percorso del file pure', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.laboratorio_id).toBe('lab-test-001')
    // Stesso invariante del CHECK `dpa_percorso_nel_proprio_laboratorio`:
    // il percorso sta SOTTO la cartella del laboratorio che lo possiede.
    expect(String(riga.storage_path_pdf).startsWith('lab-test-001/')).toBe(true)
    expect(mockUpload.mock.calls[0][0]).toBe(riga.storage_path_pdf)
  })

  it('🛑 due emissioni a dati IMMUTATI portano LA STESSA impronta dei dati — è la premessa del guard', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    const prima = (mockInsert.mock.calls[0][0] as Record<string, unknown>).payload_sha256
    vi.clearAllMocks(); mockUpload.mockResolvedValue({ error: null }); mockProgressivo.mockResolvedValue(8)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-2' }, error: null }))
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    expect((mockInsert.mock.calls[0][0] as Record<string, unknown>).payload_sha256).toBe(prima)
  })

  it('🛑 l\'impronta dei DATI non è quella del FILE: sono due cose diverse', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    // 🔑 Le due `toMatch` PRIMA del confronto, e non è pignoleria: senza,
    //    `expect(undefined).not.toBe(<hash>)` è VERDE sul difetto vivo.
    //    La casa ha già pagato questo errore — v. generate-ddc.test.ts:244-247.
    expect(riga.pdf_sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(riga.payload_sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(riga.payload_sha256).not.toBe(riga.pdf_sha256)
  })
})

describe('riuso dell\'emissione', () => {
  /** La riga già in registro. Porta anche le colonne su cui il guard FILTRA
   *  (`laboratorio_id`, `dentista_id`, `stato`, `deleted_at`) e non solo quelle
   *  che la `select` chiede: senza, il mock non potrebbe applicare i filtri, e
   *  `applicaFiltri` lo dice esplodendo invece di lasciar passare. */
  const ESISTENTE = {
    id: 'em-vecchia',
    laboratorio_id: 'lab-test-001',
    dentista_id: 'cli-001',
    numero_dpa: 'DPA-2026-0003',
    storage_path_pdf: 'lab-test-001/dpa/2026/DPA-2026-0003.pdf',
    payload_sha256: null as string | null, template_versione: VERSIONE_MODELLO_DPA,  // 🛑 D133: MAI il letterale
    stato: 'da_firmare',
    deleted_at: null as string | null,
  }
  /** La riga che il guard DEVE riconoscere come corrente. */
  const CORRENTE = { ...ESISTENTE, payload_sha256: improntaDpa(LAB_FIXTURE, CLIENTE_FIXTURE) }

  let catenaAggiornamento: MockChain
  /** Scatta quando la catena dell'UPDATE viene DAVVERO risolta — cioè spedita.
   *
   *  🔑 Perché una spia sulla RISOLUZIONE e non basta guardare gli argomenti:
   *  in supabase-js la catena non è una richiesta già in volo, è un oggetto che
   *  la richiesta HTTP la manda dentro il proprio `then()`
   *  (`PostgrestBuilder`, node_modules/@supabase/postgrest-js). Senza `await`
   *  davanti, l'UPDATE è COSTRUITO E MAI SPEDITO: gli argomenti sono tutti
   *  giusti — `mockUpdate` è chiamato, i due `.eq()` ci sono, l'ordine rispetto
   *  all'insert pure — e la chiave dell'indice resta OCCUPATA. Cioè esattamente
   *  la porta chiusa permanente per cui quel blocco esiste.
   *  🛑 Misurato: togliendo l'`await` da `generate-dpa.ts:101` la suite restava
   *  VERDE (19/19), `tsc` 0, `eslint` 0 — nessuna delle tre reti lo vedeva
   *  (revisione del Task 5, rilievo C1). Le prove vedevano il soft-delete
   *  ASSENTE, non il soft-delete INERTE.
   *  🔑 Il `then` originale resta in mezzo e la risoluzione va avanti: una spia
   *  che non risolve farebbe pendere l'`await` per sempre, e il segnale sarebbe
   *  un timeout invece di una prova rossa. */
  let aggiornamentoSpedito: Mock<() => void>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockProgressivo.mockResolvedValue(7)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-1' }, error: null }))
    catenaAggiornamento = createChain({ data: null, error: null })
    aggiornamentoSpedito = vi.fn<() => void>()
    const risolviDavvero = catenaAggiornamento.then as (r: (v: unknown) => void) => unknown
    catenaAggiornamento.then = (resolve: (v: unknown) => void) => {
      aggiornamentoSpedito()
      return risolviDavvero(resolve)
    }
    mockUpdate.mockReturnValue(catenaAggiornamento)
    // 🔑 Il default è «il file C'È». Il contrario (archivio vuoto) manderebbe
    //    OGNI prova di riemissione nel ramo dell'orfana, e le prove «RIEMETTE»
    //    diventerebbero verdi passando da un cammino che non è il loro.
    mockDownload.mockResolvedValue({ data: new Blob([Buffer.from('%PDF-vecchio')]), error: null })
  })
  afterEach(() => { vi.useRealTimers() })

  it('stessi dati e stessa versione: restituisce il PDF conservato, NESSUN numero nuovo', async () => {
    montaTabelle(CORRENTE)

    const r = await generateDpa('lab-test-001', 'cli-001')

    expect(r.riemessa).toBe(false)
    expect(r.numero_dpa).toBe('DPA-2026-0003')
    expect(r.emissione_id).toBe('em-vecchia')
    expect(mockProgressivo).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(r.buffer.toString()).toContain('%PDF-vecchio')
  })

  it('🔑 il filtro del guard è LO STESSO dell\'indice dpa_emissione_viva_unica — colonne E predicato', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    const filtri = catenaGuard().calls

    // Le QUATTRO colonne dell'indice, nell'ordine che si vuole.
    expect(filtri).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-test-001'] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['dentista_id', 'cli-001'] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['payload_sha256', improntaDpa(LAB_FIXTURE, CLIENTE_FIXTURE)] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['template_versione', VERSIONE_MODELLO_DPA] })
    // E il PREDICATO dell'indice, tutto intero (D132).
    expect(filtri).toContainEqual({ method: 'is', args: ['deleted_at', null] })
    expect(filtri).toContainEqual({ method: 'not', args: ['stato', 'in', '("revocato","scaduto")'] })
  })

  it('🛑 due scarichi in GIORNI diversi restituiscono la STESSA emissione (la data è fuori dall\'impronta)', async () => {
    montaTabelle(CORRENTE)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T10:00:00Z'))
    const a = await generateDpa('lab-test-001', 'cli-001')
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'))
    const b = await generateDpa('lab-test-001', 'cli-001')

    // 🔑 `toBe('em-vecchia')` e non solo `a === b`: se la data entrasse
    //    nell'impronta, ENTRAMBE le chiamate riemetterebbero e tornerebbero
    //    l'id dell'insert — uguali fra loro, e la prova sarebbe verde sul
    //    guasto che esiste per trovare.
    expect(a.emissione_id).toBe('em-vecchia')
    expect(b.emissione_id).toBe('em-vecchia')
    expect(a.emissione_id).toBe(b.emissione_id)
    expect(mockProgressivo).not.toHaveBeenCalled()
  })

  it('versione del modello diversa: RIEMETTE', async () => {
    montaTabelle({ ...CORRENTE, template_versione: 'dpa-v1' })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('dati diversi: RIEMETTE', async () => {
    montaTabelle({ ...ESISTENTE, payload_sha256: 'f'.repeat(64) })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  // 🔑 I quattro casi qui sotto NON sono zelo: sono le altre due colonne
  //    dell'indice e il suo predicato. Senza, un guard che dimentica
  //    `.eq('laboratorio_id', …)`, `.eq('dentista_id', …)`, `.is('deleted_at',
  //    null)` o `.not('stato','in',…)` resta VERDE — e le prime due sono
  //    isolamento fra laboratori su un client che la RLS la aggira.
  it('🛑 l\'emissione di un ALTRO laboratorio non fa da corrente: RIEMETTE', async () => {
    montaTabelle({ ...CORRENTE, laboratorio_id: 'lab-altrui-999' })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('🛑 l\'emissione di un ALTRO dentista non fa da corrente: RIEMETTE', async () => {
    montaTabelle({ ...CORRENTE, dentista_id: 'cli-altro-999' })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it.each(['revocato', 'scaduto'])(
    '🛑 un\'emissione %s non fa da corrente: RIEMETTE (D132 — «viva» comprende lo STATO)',
    async (stato) => {
      montaTabelle({ ...CORRENTE, stato })
      const r = await generateDpa('lab-test-001', 'cli-001')
      expect(r.riemessa).toBe(true)
      expect(mockProgressivo).toHaveBeenCalled()
    }
  )

  // 🔑 L'ALTRA metà di D132, e senza di lei la denylist non è provata: le due
  //    prove qui sopra dicono che `revocato` e `scaduto` NON valgono, nessuna
  //    dice che tutto il resto SÌ. Un guard scritto al contrario —
  //    `.eq('stato', 'da_firmare')`, cioè una allowlist — le passa tutte e
  //    undici, e poi in produzione non vede il DPA `firmato`, riemette, e prende
  //    23505: perché l'indice `firmato` lo considera vivo eccome.
  //    Il predicato è una denylist DI PROPOSITO (piano, T1: «uno stato NUOVO
  //    resta NELL'indice, cioè continua a deduplicare»).
  it('🔑 uno stato vivo FUORI dalla denylist si RIUSA: «firmato» è corrente a tutti gli effetti', async () => {
    montaTabelle({ ...CORRENTE, stato: 'firmato' })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(false)
    expect(r.emissione_id).toBe('em-vecchia')
    expect(mockProgressivo).not.toHaveBeenCalled()
  })

  it('🛑 una riga già archiviata (deleted_at) non fa da corrente: RIEMETTE', async () => {
    montaTabelle({ ...CORRENTE, deleted_at: '2026-07-01T10:00:00.000Z' })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('il PDF conservato non si trova più nell\'archivio: RIEMETTE invece di rispondere errore', async () => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: { message: 'Object not found' } })
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('🛑 …e PRIMA di riemettere ARCHIVIA l\'orfana: senza, la riemissione è una porta chiusa permanente', async () => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: { message: 'Object not found' } })

    await generateDpa('lab-test-001', 'cli-001')

    // La chiave dell'indice va liberata: il predicato è `WHERE deleted_at IS NULL`.
    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String) })
    expect(catenaAggiornamento.calls).toContainEqual({ method: 'eq', args: ['id', 'em-vecchia'] })
    // 🛑 Il client di servizio aggira la RLS: senza questo filtro l'UPDATE
    //    potrebbe archiviare la riga di UN ALTRO laboratorio.
    expect(catenaAggiornamento.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-test-001'] })
    // 🔑 PRIMA dell'insert, non dopo: liberare la chiave dopo averla già
    //    ricalpestata non serve a niente — l'insert avrebbe già preso 23505.
    expect(mockUpdate).toHaveBeenCalledBefore(mockInsert as never)
  })

  it('🛑 …e l\'UPDATE dev\'essere SPEDITO, non solo costruito: senza `await` la chiave resta occupata', async () => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: { message: 'Object not found' } })

    await generateDpa('lab-test-001', 'cli-001')

    // 🔑 Le tre asserzioni qui sopra guardano gli ARGOMENTI dell'UPDATE; questa
    //    guarda il suo ESITO. La differenza non è formale: la richiesta parte
    //    dentro `then()`, quindi una catena costruita e mai attesa ha argomenti
    //    perfetti e non arriva mai al database. La riga orfana continuerebbe a
    //    occupare (laboratorio, dentista, impronta, versione), l'INSERT qui
    //    sotto prenderebbe 23505, e ogni clic brucerebbe un progressivo prima
    //    di fallire.
    expect(aggiornamentoSpedito).toHaveBeenCalled()
    // E spedito PRIMA dell'insert: la chiave dev'essere già libera quando si
    // ricalpesta. `mockUpdate` prima di `mockInsert` non lo dice — dice solo
    // che l'oggetto era stato costruito prima.
    expect(aggiornamentoSpedito).toHaveBeenCalledBefore(mockInsert as never)
  })

  it('🛑 il PDF conservato si cerca nel contenitore PRIVATO «documenti»', async () => {
    montaTabelle(CORRENTE)

    await generateDpa('lab-test-001', 'cli-001')

    // 🔑 Il contenitore non è un dettaglio di percorso: è ciò che rende privato
    //    un contratto GDPR. E un contenitore sbagliato non dà errore di
    //    compilazione — dà un download che non trova MAI nulla, quindi una
    //    riga archiviata e un numero bruciato a ogni scarico.
    expect(mockStorageFrom).toHaveBeenCalledWith('documenti')
    expect(mockDownload).toHaveBeenCalledWith('lab-test-001/dpa/2026/DPA-2026-0003.pdf')
  })
})
