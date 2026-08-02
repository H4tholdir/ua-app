// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach, onTestFinished, type Mock } from 'vitest'
import { createChain, type MockChain, type ChainCall } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, CLIENTE_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpdate, mockUpload, mockDownload, mockRemove, mockStorageFrom, mockProgressivo } = vi.hoisted(() => {
  const mockUpload = vi.fn()
  const mockDownload = vi.fn()
  /** Il `remove` dell'archivio: lo usa SOLO chi perde la corsa, per togliere il
   *  PDF che ha già caricato e che nessuna riga nominerà mai. */
  const mockRemove = vi.fn()
  return {
    mockFrom: vi.fn(), mockInsert: vi.fn(), mockUpdate: vi.fn(), mockUpload, mockDownload, mockRemove, mockProgressivo: vi.fn(),
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
      return { upload: mockUpload, download: mockDownload, remove: mockRemove }
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
import { ErroreDatiDpa } from '@/lib/pdf/errori-dpa'

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
/** La SECONDA lettura del registro: la rilettura dopo il 23505 (Task 6).
 *  🔑 Serve distinta dalla prima perché l'invariante da provare è che porti gli
 *  STESSI sei filtri del guard — e una prova che guardasse la catena del guard
 *  sarebbe verde anche con una rilettura che non filtra niente. */
const catenaRilettura = (): MockChain => {
  const letture = cateneDpa.filter((x) => x.calls[0]?.method === 'select')
  if (letture.length < 2) throw new Error(`Attese 2 LETTURE su data_processing_agreements, trovate ${letture.length}`)
  return letture[1]
}

/** Il messaggio dell'errore sollevato, per poterlo confrontare ESATTAMENTE.
 *
 *  🔑 Perché non basta `rejects.not.toThrow(/segreto/)`: quella negativa è verde
 *  per QUALUNQUE messaggio che non contenga quella stringa — compreso il
 *  messaggio vuoto, e compreso un mutante che al posto di `erroreRiga.message`
 *  facesse uscire `erroreRiga.code`. Una negativa senza la sua positiva non
 *  misura niente: qui ogni «non esce» è appaiato a un «esce ESATTAMENTE questo». */
/** L'ERRORE intero, non solo il suo messaggio: serve dove conta anche lo STATO
 *  HTTP che l'errore porta con sé (`ErroreDatiDpa.stato`). Un controllo sul solo
 *  testo resterebbe verde con lo stato sbagliato, o senza stato affatto. */
async function erroreSollevato(fn: () => Promise<unknown>): Promise<unknown> {
  const RIUSCITA = Symbol('la chiamata non ha sollevato')
  let esito: unknown = RIUSCITA
  try { await fn() } catch (e) { esito = e }
  if (esito === RIUSCITA) throw new Error('La chiamata doveva fallire e invece è riuscita')
  return esito
}

async function messaggioDiErrore(fn: () => Promise<unknown>): Promise<string> {
  const RIUSCITA = Symbol('la chiamata non ha sollevato')
  let esito: string | symbol = RIUSCITA
  try { await fn() } catch (e) { esito = e instanceof Error ? e.message : String(e) }
  if (typeof esito === 'symbol') throw new Error('La chiamata doveva fallire e invece è riuscita')
  return esito
}

/** Il LOG del server, raccolto e leggibile come un testo solo.
 *
 *  🔑 Perché il testo e non `expect(spia).toHaveBeenCalled()`: nei rami che
 *  interessano `console.error` è chiamato ANCHE dal blocco che solleva
 *  (`generate-dpa.ts:342`), quindi «è stato chiamato» resta VERDE anche
 *  cancellando la riga di log che si vuole provare. Ciò che va asserito è il
 *  DETTAGLIO — il pezzo che serve a chi ripara e che non deve uscire dal server.
 *  🛑 La spia si rimette da sola a fine prova (`onTestFinished`): una spia
 *  lasciata in piedi si porterebbe dietro le prove successive del file. */
function spiaIlLog(): () => string {
  const spia = vi.spyOn(console, 'error').mockImplementation(() => {})
  onTestFinished(() => spia.mockRestore())
  return () => spia.mock.calls.map((c) => c.map(String).join(' ')).join('\n')
}

/** Sentinella: «dalla seconda lettura in poi il registro contiene la stessa
 *  cosa della prima». Distinta da `null`, che invece vuol dire «vuoto». */
const IDENTICA = Symbol('stessa riga della prima lettura')

/** ═══ Gli errori dell'ARCHIVIO, nella forma che l'archivio VERO produce ═══
 *
 *  🔑 Non sono inventati: sono la risposta misurata sul progetto vero il
 *  03/08/2026, con la chiave di servizio.
 *  `provato:` `curl -w "HTTP=%{http_code}" "$URL/storage/v1/object/documenti/<inesistente>"`
 *    → `HTTP=400` · `{"statusCode":"404","error":"not_found","message":"Object not found","code":"NoSuchKey"}`
 *  `provato:` `curl … "$URL/storage/v1/object/<bucket-inesistente>/x.pdf"`
 *    → `HTTP=400` · `{"statusCode":"404","error":"Bucket not found","message":"Bucket not found","code":"NoSuchBucket"}`
 *  `provato:` la STESSA richiesta SENZA credenziali → identica alla precedente.
 *
 *  🛑 Da qui le due trappole che queste fixture esistono per tenere aperte:
 *  ① `status` vale **400**, non 404 — un codice che cercasse `status === 404`
 *     non archivierebbe MAI l'orfana, e la riemissione sarebbe una porta chiusa
 *     permanente. Prima di questo Task la fixture portava il solo `message`, e
 *     quella trappola non era né provata né provabile.
 *  ② `statusCode` è la STRINGA `'404'` — e la dice anche il bucket mancante,
 *     cioè una chiave di servizio ruotata male. Archiviare su quel segnale
 *     vorrebbe dire archiviare OGNI riga del registro, comprese le `firmato`.
 *
 *  Mappatura in `@supabase/storage-js` (`src/lib/common/fetch.ts:75-83`):
 *  `statusCode = err.statusCode || err.code || String(status)`, e senza nessuna
 *  risposta HTTP (rete caduta) si ottiene uno `StorageUnknownError`, cioè un
 *  errore SENZA `status` né `statusCode`: v. `RETE_CADUTA` qui sotto. */
const SPARITO_DAVVERO = { message: 'Object not found', status: 400, statusCode: '404' }
/** Lo STESSO messaggio del file davvero sparito, ma SENZA lo `statusCode` '404'.
 *
 *  🔑 Perché serve: `fileDavveroAssente` è una CONGIUNZIONE, e finché ogni
 *  fixture con `message: 'Object not found'` porta anche `statusCode: '404'`,
 *  metà della congiunzione non è provata — togliendo `statusCode === '404'`
 *  dall'allowlist le prove restavano tutte e 48 VERDI (misurato dalla revisione
 *  del Task 6, rilievo R1). È la stessa classe di difetto già pagata su questo
 *  ramo con `de70930d`: «la denylist di D132 non era provata — solo metà di essa
 *  lo era».
 *
 *  ⚠️ `derivato:` NON misurato — l'archivio vero, interrogato il 03/08/2026,
 *  manda `statusCode: '404'`, quindi questa forma col `curl` non si produce. La
 *  fixture nasce dalla MAPPATURA di `@supabase/storage-js`
 *  (`src/lib/common/fetch.ts:78`): `statusCode = err?.statusCode || err?.code ||
 *  status + ''` — se un giorno il corpo non portasse `statusCode`, al suo posto
 *  finirebbe `code`, cioè `NoSuchKey`.
 *
 *  🛑 E la risposta giusta a quella forma è NON ARCHIVIARE, anche se il
 *  messaggio «suona» come un file mancante: l'allowlist riconosce ciò che ha
 *  visto, tutto il resto è un DUBBIO. Il prezzo è un errore rumoroso; il prezzo
 *  opposto è archiviare una riga `firmato` su un segnale mal letto. */
const OGGETTO_ASSENTE_SENZA_404 = { message: 'Object not found', status: 400, statusCode: 'NoSuchKey' }
const BUCKET_ASSENTE = { message: 'Bucket not found', status: 400, statusCode: '404' }
const ARCHIVIO_GIU = { message: 'Service Unavailable', status: 503, statusCode: '503' }
const RETE_CADUTA = { message: 'fetch failed' }   // StorageUnknownError: niente status

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

/** Monta le tabelle del mock.
 *
 *  @param emissioneEsistente la riga che il registro contiene alla PRIMA lettura
 *  @param dopoLaCorsa        la riga che il registro contiene dalla SECONDA lettura in
 *                            poi — cioè quella scritta dall'ALTRA richiesta mentre la
 *                            nostra era per strada. `IDENTICA` = non è cambiato niente.
 *  @param erroreLettura      se valorizzato, ogni lettura del registro FALLISCE: serve a
 *                            provare che un guasto di lettura non venga scambiato per
 *                            «non c'è nessuna emissione».
 *  @param letturaCheFallisce quale lettura colpisce `erroreLettura`: `null` = TUTTE (il
 *                            comportamento storico), `2` = solo la RILETTURA dopo il
 *                            23505. Serve al ramo in cui la rilettura fallisce, che
 *                            altrimenti non è raggiungibile: un errore su TUTTE le
 *                            letture ferma già il guard, e la rilettura non avviene.
 */
function montaTabelle(
  emissioneEsistente: Record<string, unknown> | null,
  dopoLaCorsa: Record<string, unknown> | null | typeof IDENTICA = IDENTICA,
  erroreLettura: { message: string; code?: string } | null = null,
  letturaCheFallisce: number | null = null,
) {
  for (const k of Object.keys(catene)) delete catene[k]
  cateneDpa.length = 0
  // 🔑 Il contatore vive QUI e non dentro la catena: ogni lettura riceve una
  //    catena NUOVA, quindi un contatore per catena varrebbe sempre 1.
  let letture = 0
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
        // 🔑 Il contatore sale PRIMA del guasto, altrimenti `letturaCheFallisce`
        //    non saprebbe mai a che lettura siamo.
        letture += 1
        if (erroreLettura && (letturaCheFallisce === null || letture === letturaCheFallisce)) {
          return { data: null, error: erroreLettura }
        }
        const candidata = letture === 1 || dopoLaCorsa === IDENTICA ? emissioneEsistente : dopoLaCorsa
        // Prima il WHERE sulla riga intera, POI la proiezione: l'ordine del database.
        const trovata = applicaFiltri(candidata, c.calls)
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
  afterEach(() => { vi.useRealTimers() })

  it('quando non esiste nulla: carica il file, prende un progressivo, scrive la riga', async () => {
    montaTabelle(null)
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')

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
    // 🔑 Non `toBeTruthy()`: con quella, `emesso_at: 'ieri mattina'` è VERDE.
    //    La colonna è un timestamp, e la forma ISO è ciò che la rende tale.
    expect(String(riga.emesso_at)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('🛑 il caricamento non SOVRASCRIVE mai: `upsert: false`, nel contenitore privato', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    // 🔑 È la riga che impedisce di sovrascrivere un documento CONSERVATO.
    //    Con `upsert: true` un secondo giro sullo stesso numero rimpiazzerebbe
    //    in silenzio il PDF a cui una riga di registro punta già, e l'impronta
    //    `pdf_sha256` in banca dati certificherebbe un file che non esiste più.
    //    Senza questa asserzione il mutante `upsert: true` resta VERDE.
    expect(mockUpload.mock.calls[0][2]).toEqual({ contentType: 'application/pdf', upsert: false })
    expect(mockStorageFrom).toHaveBeenCalledWith('documenti')
  })

  it("🛑 `emesso_at` è l'ISTANTE dell'emissione, non un testo qualsiasi", async () => {
    // 🔑 Solo `Date` è finto: `setTimeout` resta vero, altrimenti il rendering
    //    del PDF resterebbe appeso e il segnale sarebbe un timeout, non un rosso.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-03T14:25:36.123Z'))
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.emesso_at).toBe('2026-08-03T14:25:36.123Z')
  })

  it("🛑 il 31 dicembre alle 23:30 UTC a Roma è già l'anno DOPO — e il numero lo segue", async () => {
    // 🔑 Il 1° agosto Roma e UTC cadono nello stesso anno, quindi `ANNO_ROMA`
    //    non morde: l'anno UTC passerebbe. Qui mordono entrambi, sempre.
    //    È il guasto di capodanno che `src/lib/db/progressivi.ts:12-15`
    //    documenta come già pagato una volta.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-31T23:30:00.000Z'))   // → 2027-01-01 00:30 a Roma
    montaTabelle(null)
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    expect(r.numero_dpa).toBe('DPA-2027-0007')
    expect(mockProgressivo).toHaveBeenCalledWith(expect.anything(), 'lab-test-001', 'dpa', 2027)
    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.anno_dpa).toBe(2027)
    expect(String(riga.storage_path_pdf)).toBe('lab-test-001/dpa/2027/DPA-2027-0007.pdf')
  })

  it("il progressivo è chiesto col tipo «dpa» e con l'anno di Roma", async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(mockProgressivo).toHaveBeenCalledWith(expect.anything(), 'lab-test-001', 'dpa', ANNO_ROMA)
  })

  it("la lettura del cliente porta SEMPRE il filtro laboratorio_id (il client di servizio aggira la RLS)", async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(catene.clienti.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-test-001'] })
  })

  it('la riga di registro nasce dentro il proprio laboratorio, e il percorso del file pure', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.laboratorio_id).toBe('lab-test-001')
    // Stesso invariante del CHECK `dpa_percorso_nel_proprio_laboratorio`:
    // il percorso sta SOTTO la cartella del laboratorio che lo possiede.
    expect(String(riga.storage_path_pdf).startsWith('lab-test-001/')).toBe(true)
    expect(mockUpload.mock.calls[0][0]).toBe(riga.storage_path_pdf)
  })

  it('🛑 due emissioni a dati IMMUTATI portano LA STESSA impronta dei dati — è la premessa del guard', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    const prima = (mockInsert.mock.calls[0][0] as Record<string, unknown>).payload_sha256
    vi.clearAllMocks(); mockUpload.mockResolvedValue({ error: null }); mockProgressivo.mockResolvedValue(8)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-2' }, error: null }))
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect((mockInsert.mock.calls[0][0] as Record<string, unknown>).payload_sha256).toBe(prima)
  })

  it('🛑 l\'impronta dei DATI non è quella del FILE: sono due cose diverse', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    // 🔑 Le due `toMatch` PRIMA del confronto, e non è pignoleria: senza,
    //    `expect(undefined).not.toBe(<hash>)` è VERDE sul difetto vivo.
    //    La casa ha già pagato questo errore — v. generate-ddc.test.ts:244-247.
    expect(riga.pdf_sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(riga.payload_sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(riga.payload_sha256).not.toBe(riga.pdf_sha256)
  })

  it('✅ T3a — su un\'emissione NUOVA il registro sa dire CHI ha premuto', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    // 🔑 `toBe`, non `toBeDefined()`: una colonna che esiste ed e' vuota e'
    //    ESATTAMENTE il difetto di dichiarazioni_conformita.generated_by
    //    (5 righe, 0 riempite — voce P26). «Definita» non basta.
    expect(riga.emesso_da).toBe('utente-007')
    // 🛑 E non si e' scritto nella colonna sbagliata: `firmato_da` e' il nome
    //    della CONTROPARTE allo studio, non chi opera in UA.
    expect(riga.firmato_da).toBeUndefined()
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

    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    expect(r.riemessa).toBe(false)
    expect(r.numero_dpa).toBe('DPA-2026-0003')
    expect(r.emissione_id).toBe('em-vecchia')
    expect(mockProgressivo).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(r.buffer.toString()).toContain('%PDF-vecchio')
  })

  it('🔑 il filtro del guard è LO STESSO dell\'indice dpa_emissione_viva_unica — colonne, predicato E ordinamento', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    const filtri = catenaGuard().calls

    // Le QUATTRO colonne dell'indice, nell'ordine che si vuole.
    expect(filtri).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-test-001'] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['dentista_id', 'cli-001'] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['payload_sha256', improntaDpa(LAB_FIXTURE, CLIENTE_FIXTURE)] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['template_versione', VERSIONE_MODELLO_DPA] })
    // E il PREDICATO dell'indice, tutto intero (D132).
    expect(filtri).toContainEqual({ method: 'is', args: ['deleted_at', null] })
    expect(filtri).toContainEqual({ method: 'not', args: ['stato', 'in', '("revocato","scaduto")'] })
    // 🔑 E l'ORDINAMENTO, che non è una settima CONDIZIONE: le sei dicono quali
    //    righe entrano, questo dice QUALE si prende. Oggi
    //    `dpa_emissione_viva_unica` ne ammette al più una viva, quindi non
    //    morde; il giorno in cui l'indice cambiasse sarebbe l'unica riga a
    //    decidere il vincitore, e dev'essere la PIÙ RECENTE. Senza questa
    //    asserzione il mutante `ascending: true` restava VERDE su tutte e 48 le
    //    prove (revisione del Task 6, rilievo R5).
    expect(filtri).toContainEqual({ method: 'order', args: ['emesso_at', { ascending: false }] })
  })

  it('🛑 due scarichi in GIORNI diversi restituiscono la STESSA emissione (la data è fuori dall\'impronta)', async () => {
    montaTabelle(CORRENTE)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T10:00:00Z'))
    const a = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'))
    const b = await generateDpa('lab-test-001', 'cli-001', 'utente-007')

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
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('dati diversi: RIEMETTE', async () => {
    montaTabelle({ ...ESISTENTE, payload_sha256: 'f'.repeat(64) })
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
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
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('🛑 l\'emissione di un ALTRO dentista non fa da corrente: RIEMETTE', async () => {
    montaTabelle({ ...CORRENTE, dentista_id: 'cli-altro-999' })
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it.each(['revocato', 'scaduto'])(
    '🛑 un\'emissione %s non fa da corrente: RIEMETTE (D132 — «viva» comprende lo STATO)',
    async (stato) => {
      montaTabelle({ ...CORRENTE, stato })
      const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
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
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(r.riemessa).toBe(false)
    expect(r.emissione_id).toBe('em-vecchia')
    expect(mockProgressivo).not.toHaveBeenCalled()
  })

  it('🛑 una riga già archiviata (deleted_at) non fa da corrente: RIEMETTE', async () => {
    montaTabelle({ ...CORRENTE, deleted_at: '2026-07-01T10:00:00.000Z' })
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('il PDF conservato non si trova più nell\'archivio: RIEMETTE invece di rispondere errore', async () => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: SPARITO_DAVVERO })
    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    expect(r.riemessa).toBe(true)
    expect(mockProgressivo).toHaveBeenCalled()
  })

  it('🛑 …e PRIMA di riemettere ARCHIVIA l\'orfana: senza, la riemissione è una porta chiusa permanente', async () => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: SPARITO_DAVVERO })

    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

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
    mockDownload.mockResolvedValue({ data: null, error: SPARITO_DAVVERO })

    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

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

    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    // 🔑 Il contenitore non è un dettaglio di percorso: è ciò che rende privato
    //    un contratto GDPR. E un contenitore sbagliato non dà errore di
    //    compilazione — dà un download che non trova MAI nulla, quindi una
    //    riga archiviata e un numero bruciato a ogni scarico.
    expect(mockStorageFrom).toHaveBeenCalledWith('documenti')
    expect(mockDownload).toHaveBeenCalledWith('lab-test-001/dpa/2026/DPA-2026-0003.pdf')
  })

  it('🛑 T3b — sul RIUSO il «chi» NON si riscrive, nemmeno se scarica un altro utente', async () => {
    montaTabelle(CORRENTE)   // esiste gia' un'emissione riusabile

    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-DIVERSO')

    // 🔑 Perche' questa prova esiste: senza di lei, chi legge solo T3a fa
    //    riscrivere `emesso_da` sul ramo di riuso «per coerenza» — cioe'
    //    riscrive un campo del REGISTRO DELLE PROVE, che e' il difetto che P7
    //    esiste per chiudere. La colonna dice CHI HA EMESSO, e l'emissione e'
    //    avvenuta una volta sola.
    expect(r.riemessa).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('fail-closed e corsa', () => {
  /** La riga viva che il guard trova, col suo PDF conservato. */
  const CORRENTE = {
    id: 'em-vecchia',
    laboratorio_id: 'lab-test-001',
    dentista_id: 'cli-001',
    numero_dpa: 'DPA-2026-0003',
    storage_path_pdf: 'lab-test-001/dpa/2026/DPA-2026-0003.pdf',
    payload_sha256: improntaDpa(LAB_FIXTURE, CLIENTE_FIXTURE),
    template_versione: VERSIONE_MODELLO_DPA,
    stato: 'da_firmare',
    deleted_at: null as string | null,
  }
  /** La riga scritta dall'ALTRA richiesta mentre la nostra era per strada.
   *  🔑 Il suo numero è DIVERSO dal nostro apposta: `genera_progressivo` dà ai
   *  due concorrenti progressivi diversi, quindi la vincitrice ha un percorso
   *  suo — ed è ciò che rende asseribile «il perdente toglie il PROPRIO file». */
  const VINCITRICE = { ...CORRENTE, id: 'em-vincitrice', numero_dpa: 'DPA-2026-0011', storage_path_pdf: 'lab-test-001/dpa/2026/DPA-2026-0011.pdf' }

  /** Il percorso su cui il PERDENTE (cioè noi) ha già caricato il proprio PDF. */
  const NOSTRO_PERCORSO = `lab-test-001/dpa/${ANNO_ROMA}/DPA-${ANNO_ROMA}-0007.pdf`

  const DUPLICATO_SULLA_CHIAVE_VIVA = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "dpa_emissione_viva_unica"',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockProgressivo.mockResolvedValue(7)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-1' }, error: null }))
    mockUpdate.mockReturnValue(createChain({ data: null, error: null }))
    mockRemove.mockResolvedValue({ data: [], error: null })
    mockDownload.mockResolvedValue({ data: new Blob([Buffer.from('%PDF-vecchio')]), error: null })
  })
  afterEach(() => { vi.useRealTimers() })

  // ════════════════════ ② il FILE prima della RIGA ════════════════════

  it("🛑 se l'archivio rifiuta il file, NESSUNA riga viene scritta", async () => {
    montaTabelle(null)
    mockUpload.mockResolvedValue({ error: { message: 'storage giù' } })

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    // 🔑 QUESTA è la prova che protegge l'invariante «il file prima della riga».
    //    `toHaveBeenCalledBefore` prova solo il cammino felice: togliendo il
    //    `throw` dopo il caricamento fallito, quelle restavano tutte VERDI
    //    (7 su 7, misurato dalla revisione del Task 4, rilievo I3) — e in
    //    produzione il registro avrebbe una riga che nomina un file inesistente.
    expect(msg).toBe('DPA: non è stato possibile conservare il documento')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  // ════════════ ① nessun messaggio del sottosuolo esce dal server ════════════
  //
  // `src/app/api/clienti/[id]/dpa/route.ts:43-44` rimanda `e.message` al
  // browser dentro un JSON. Tutto ciò che questa funzione mette in un `Error`
  // è quindi TESTO PUBBLICO: nomi di vincoli, di tabelle e di colonne compresi.
  // Il dettaglio serve a chi ripara, e chi ripara legge i log.

  it("① il messaggio dell'ARCHIVIO non esce verso il browser", async () => {
    montaTabelle(null)
    mockUpload.mockResolvedValue({ error: { message: 'chiave segreta xyz nel bucket documenti' } })

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: non è stato possibile conservare il documento')
    expect(msg).not.toMatch(/chiave segreta/)
  })

  it('🛑 ① il messaggio del DATABASE non esce verso il browser — né il VINCOLO, né la TABELLA', async () => {
    montaTabelle(null)
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    // 🔑 La positiva PRIMA della negativa, e non è pignoleria: `not.toMatch` da
    //    sola è verde su QUALUNQUE messaggio che non contenga quelle parole —
    //    compreso il vuoto, e compreso un mutante che facesse uscire
    //    `erroreRiga.code` invece di `erroreRiga.message`.
    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(msg).not.toMatch(/dpa_emissione_viva_unica|duplicate key|data_processing_agreements|23505/)
  })

  it('🛑 ① il messaggio del database non esce nemmeno dalla SERIE DEI NUMERI — né INSERT, né tabella, né funzione', async () => {
    // 🔑 È la fuga che restava aperta UNA RIGA SOPRA quelle già chiuse, ed è la
    //    più larga di tutte: `generaProgressivo` interpola `error.message` nel
    //    proprio `Error` (`src/lib/db/progressivi.ts:30-32`), la chiamata qui non
    //    aveva `try`, e `route.ts:41-43` rimanda `e.message` al browser dentro un
    //    JSON. Su un guasto vero il testo PUBBLICO conteneva l'INSERT per
    //    intero, il nome di `public.progressivi_anno` e la firma della funzione.
    //    Trovata dalla revisione del Task 6 (rilievo IMPORTANTE 1).
    montaTabelle(null)
    const log = spiaIlLog()
    // Il testo nella forma VERA: quella che `progressivi.ts:31` costruisce
    // interpolando il messaggio che PostgreSQL manda su una RPC rifiutata.
    mockProgressivo.mockRejectedValue(new Error(
      'generaProgressivo fallito (tipo=dpa): duplicate key value violates unique constraint "progressivi_anno_pkey" — INSERT INTO public.progressivi_anno (laboratorio_id, tipo, anno, ultimo) VALUES (…) · CONTEXT: PL/pgSQL function public.genera_progressivo(uuid,text,integer)'
    ))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    // 🔑 La positiva PRIMA della negativa: `not.toMatch` da sola è verde su
    //    qualunque messaggio, compreso il vuoto.
    expect(msg).toBe('DPA: non è stato possibile assegnare il numero al documento')
    expect(msg).not.toMatch(/progressivi_anno|INSERT INTO|genera_progressivo|duplicate key/)
    // 🔑 Il dettaglio non si PERDE: si sposta dove deve stare. Chi ripara legge
    //    i log, e senza queste due righe un `try/catch` che inghiotte tutto
    //    passerebbe per una correzione.
    expect(log()).toContain('progressivo non assegnato')
    expect(log()).toContain('public.progressivi_anno')
    // E a valle non si brucia niente: nessun PDF caricato, nessuna riga scritta.
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  // ════════════════════ la corsa fra due richieste ════════════════════

  it('🛑 corsa: l\'insert dà 23505, si rilegge la riga vincitrice e si restituisce QUELLA', async () => {
    // Alla prima lettura il registro è vuoto (il guard non trova niente e si
    // riemette); alla seconda c'è la riga dell'altra richiesta.
    montaTabelle(null, VINCITRICE)
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))
    mockDownload.mockResolvedValue({ data: new Blob([Buffer.from('%PDF-della-vincitrice')]), error: null })

    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    expect(r.emissione_id).toBe('em-vincitrice')
    expect(r.numero_dpa).toBe('DPA-2026-0011')
    // 🔑 `riemessa: false`: chi perde NON ha emesso niente. La riga di registro
    //    è dell'altro, e il numero pure.
    expect(r.riemessa).toBe(false)
    // 🛑 E il PDF consegnato è quello della VINCITRICE, non il proprio: sono
    //    due file diversi, e il secondo non è nominato da nessuna riga.
    expect(r.buffer.toString()).toContain('%PDF-della-vincitrice')
    expect(mockDownload).toHaveBeenCalledWith(VINCITRICE.storage_path_pdf)
  })

  it('🔑 la RILETTURA porta le STESSE sei condizioni del guard e dell\'indice dpa_emissione_viva_unica — e lo stesso ordinamento', async () => {
    montaTabelle(null, VINCITRICE)
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))

    await generateDpa('lab-test-001', 'cli-001', 'utente-007')
    const filtri = catenaRilettura().calls

    // 🛑 L'INVARIANTE dell'ondata: colonne E predicato dell'indice = filtro del
    //    guard = filtro della rilettura. Tutti e tre uguali, o chi perde la
    //    corsa rilegge la riga sbagliata e consegna al dentista il testo di
    //    un'ALTRA versione del contratto — precisamente il guasto che questo
    //    registro esiste per impedire.
    expect(filtri).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-test-001'] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['dentista_id', 'cli-001'] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['payload_sha256', improntaDpa(LAB_FIXTURE, CLIENTE_FIXTURE)] })
    expect(filtri).toContainEqual({ method: 'eq', args: ['template_versione', VERSIONE_MODELLO_DPA] })
    expect(filtri).toContainEqual({ method: 'is', args: ['deleted_at', null] })
    expect(filtri).toContainEqual({ method: 'not', args: ['stato', 'in', '("revocato","scaduto")'] })
    // 🔑 E lo STESSO ordinamento del guard — l'invariante è «indice = guard =
    //    rilettura», e due letture che ordinano al contrario sceglierebbero
    //    righe diverse dallo stesso insieme il giorno in cui l'insieme avesse
    //    più di una riga. Mutante `ascending: true`: 48 su 48 verdi prima di
    //    questa riga (revisione del Task 6, rilievo R4).
    expect(filtri).toContainEqual({ method: 'order', args: ['emesso_at', { ascending: false }] })
  })

  it('🛑 …e i filtri della rilettura MORDONO: una vincitrice di un\'ALTRA versione di modello non si consegna', async () => {
    // 🔑 Le sei asserzioni qui sopra dicono che i filtri sono STATI CHIAMATI;
    //    questa dice che RESTRINGONO. Senza, un `.eq('template_versione', …)`
    //    scritto su una costante sbagliata resterebbe verde.
    montaTabelle(null, { ...VINCITRICE, template_versione: 'dpa-v1' })
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))
    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    // 🔑 Le due righe che rendono questa prova COMPORTAMENTALE e non un
    //    controllo di testo: la rilettura dev'essere AVVENUTA (e `catenaRilettura`
    //    esplode se non c'è) e non deve aver consegnato niente. Senza,
    //    un codice PRIVO di recupero passerebbe — misurato sull'abbozzo inerte.
    expect(catenaRilettura().calls).toContainEqual({ method: 'eq', args: ['template_versione', VERSIONE_MODELLO_DPA] })
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it.each([
    ['revocato'], ['scaduto'],
  ])('🛑 …e una vincitrice %s non si consegna: l\'indice la considera morta (D132)', async (stato) => {
    montaTabelle(null, { ...VINCITRICE, stato })
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))
    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(catenaRilettura().calls).toContainEqual({ method: 'not', args: ['stato', 'in', '("revocato","scaduto")'] })
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it('🛑 chi perde toglie il PROPRIO file, non quello della vincitrice', async () => {
    montaTabelle(null, VINCITRICE)
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))

    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    // Il caricamento precede l'INSERT (ed è giusto così): il perdente ha già
    // scritto un PDF su un percorso che nessuna riga nominerà MAI. Un file coi
    // dati dello studio che nessuno può più raggiungere né cancellare è un
    // problema di minimizzazione (GDPR), non di ordine.
    expect(mockRemove).toHaveBeenCalledWith([NOSTRO_PERCORSO])
    // 🛑 E MAI quello della vincitrice: toglierlo vorrebbe dire lasciare la
    //    riga di registro dell'altro a puntare nel vuoto — cioè fabbricare
    //    l'orfana che il guard poi archivierebbe.
    expect(mockRemove).not.toHaveBeenCalledWith([VINCITRICE.storage_path_pdf])
    expect(mockStorageFrom).toHaveBeenCalledWith('documenti')
  })

  it('🛑 un 23505 dal NUMERO è un\'anomalia vera: la rilettura non trova niente e si SOLLEVA', async () => {
    // Dai due indici arriva lo STESSO codice, e da dentro il codice non sono
    // distinguibili. `dpa_emissione_numero_unico` vuol dire NUMERO RIUSATO: la
    // rilettura, che cerca sulla chiave di deduplicazione, non trova nessuna
    // vincitrice — e allora si solleva. È il comportamento voluto, non un caso
    // dimenticato: consegnare qualcosa qui vorrebbe dire consegnare a caso.
    montaTabelle(null, null)
    mockInsert.mockReturnValue(createChain({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "dpa_emissione_numero_unico"' },
    }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(msg).not.toMatch(/dpa_emissione_numero_unico|duplicate key/)
    // 🔑 Il proprio PDF va tolto ANCHE su questa strada, non solo sul cammino
    //    felice del recupero: la riga non è stata scritta né qui né là, quindi
    //    il file è orfano in tutti e due i casi.
    expect(mockRemove).toHaveBeenCalledWith([NOSTRO_PERCORSO])
  })

  it("🛑 un errore d'insert che NON è il 23505 non si ripara consegnando il documento di un altro", async () => {
    // 🔑 Il recupero esiste per UNA cosa sola: la corsa sulla chiave di
    //    deduplicazione. Allargarlo a qualunque errore vuol dire che un vincolo
    //    violato — un CHECK, una policy — verrebbe COPERTO restituendo la riga
    //    di qualcun altro, e chi guarda vedrebbe un'emissione riuscita dove il
    //    database ha rifiutato di scrivere. Misurato: senza questa prova il
    //    mutante `if (erroreRiga)` al posto di `if (erroreRiga?.code === …)`
    //    resta VERDE.
    montaTabelle(null, VINCITRICE)
    mockInsert.mockReturnValue(createChain({
      data: null,
      error: { code: '23514', message: 'new row violates check constraint "dpa_impronte_esadecimali"' },
    }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(msg).not.toMatch(/dpa_impronte_esadecimali|check constraint/)
    // Nessun tentativo di consegnare il documento della vincitrice.
    expect(mockDownload).not.toHaveBeenCalled()
    // Il proprio PDF resta comunque da togliere: la riga non è stata scritta.
    expect(mockRemove).toHaveBeenCalledWith([NOSTRO_PERCORSO])
  })

  it("🛑 un insert senza errore ma anche senza riga non si dà per riuscito", async () => {
    montaTabelle(null)
    mockInsert.mockReturnValue(createChain({ data: null, error: null }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))
    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(mockRemove).toHaveBeenCalledWith([NOSTRO_PERCORSO])
  })

  it("🛑 una vincitrice SENZA percorso non si consegna: non c'è niente da consegnare", async () => {
    montaTabelle(null, { ...VINCITRICE, storage_path_pdf: null })
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))
    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it("🛑 se il PDF della vincitrice non si scarica, si solleva — non si consegna il PROPRIO", async () => {
    // 🔑 Il buffer che abbiamo in mano è il NOSTRO, e porta un altro numero:
    //    consegnarlo sotto il numero della vincitrice vorrebbe dire un PDF che
    //    non corrisponde né alla riga di registro né alla sua impronta.
    montaTabelle(null, VINCITRICE)
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))
    mockDownload.mockResolvedValue({ data: null, error: ARCHIVIO_GIU })
    const log = spiaIlLog()

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))
    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    // 🔑 …e il PERCHÉ finisce nel log. Era il difetto che il Task 6 ha chiuso —
    //    l'errore della vincitrice non ci finiva nemmeno — e senza queste righe
    //    cancellare quel `console.error` lasciava tutte e 48 le prove verdi
    //    (revisione del Task 6, rilievo R7). Chi ripara resterebbe con un «non è
    //    stato possibile registrare» che non dice niente.
    expect(log()).toContain('PDF della vincitrice non scaricabile')
    expect(log()).toContain(VINCITRICE.storage_path_pdf)
    expect(log()).toContain('Service Unavailable')
  })

  // ═══ ③ la rimozione del PDF orfano: l'unico guasto che NON deve sollevare ═══

  it('🛑 se la RIMOZIONE del PDF orfano fallisce, non si solleva per quello: la vincitrice si consegna lo stesso', async () => {
    // 🔑 La decisione è scritta in `generate-dpa.ts:280-282` («l'errore da
    //    raccontare è un altro») e fino a qui NON era provata: `mockRemove` non
    //    falliva in nessuna delle 48 prove (revisione del Task 6, rilievo 3).
    //    Una decisione dichiarata e non provata è una decisione che il prossimo
    //    che passa può ribaltare senza accorgersene.
    montaTabelle(null, VINCITRICE)
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))
    mockDownload.mockResolvedValue({ data: new Blob([Buffer.from('%PDF-della-vincitrice')]), error: null })
    mockRemove.mockResolvedValue({ data: null, error: { message: 'remove rifiutato: chiave sk_live_xyz' } })
    const log = spiaIlLog()

    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    // Un PDF di troppo nell'archivio è meno grave di un errore sostituito da un
    // altro errore — e chi ha chiesto il documento lo riceve comunque.
    expect(r.emissione_id).toBe('em-vincitrice')
    expect(r.numero_dpa).toBe('DPA-2026-0011')
    expect(r.riemessa).toBe(false)
    expect(r.buffer.toString()).toContain('%PDF-della-vincitrice')
    // 🔑 Ma il guasto NON si perde: percorso e motivo finiscono nel log, o resta
    //    un file coi dati dello studio che nessuno sa di dover togliere (GDPR).
    expect(log()).toContain('PDF orfano non rimosso')
    expect(log()).toContain(NOSTRO_PERCORSO)
    expect(log()).toContain('remove rifiutato')
  })

  it("🛑 …e se la rimozione fallisce mentre si sta già sollevando, il messaggio dell'archivio non esce lo stesso", async () => {
    // 🛑 IL CANALE DI FUGA misurato dalla revisione (rilievo R6): trasformando
    //    quel `console.error` in un `throw new Error(erroreRimozione.message)`,
    //    tutte e 48 le prove restavano VERDI — cioè il messaggio dell'archivio
    //    poteva tornare a uscire verso il browser (`route.ts:41-43` rimanda
    //    `e.message`) senza che nessuna delle tre reti se ne accorgesse.
    montaTabelle(null, null)
    mockInsert.mockReturnValue(createChain({
      data: null,
      error: { code: '23514', message: 'new row violates check constraint "dpa_impronte_esadecimali"' },
    }))
    mockRemove.mockResolvedValue({ data: null, error: { message: 'remove rifiutato: chiave sk_live_xyz' } })

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(msg).not.toMatch(/sk_live_xyz|remove rifiutato/)
  })

  it('🔑 se la RILETTURA dopo il 23505 fallisce, il suo errore finisce nel LOG — e non nel messaggio', async () => {
    // La rilettura è l'ULTIMA rete della corsa: se si guasta anche lei, chi
    // ripara deve sapere PERCHÉ. Cancellando quel `console.error` restavano
    // tutte e 48 le prove verdi (revisione del Task 6, rilievo R7).
    // 🔑 Il quarto argomento è ciò che rende raggiungibile questo ramo: un
    //    errore su TUTTE le letture fermerebbe già il guard, e la rilettura non
    //    avverrebbe mai.
    montaTabelle(null, VINCITRICE, { message: 'rilettura rifiutata: connessione col database interrotta', code: '08006' }, 2)
    mockInsert.mockReturnValue(createChain({ data: null, error: DUPLICATO_SULLA_CHIAVE_VIVA }))
    const log = spiaIlLog()

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: non è stato possibile registrare il documento')
    expect(msg).not.toMatch(/rilettura rifiutata|08006/)
    expect(log()).toContain('rilettura dopo 23505 fallita')
    expect(log()).toContain('rilettura rifiutata: connessione col database interrotta')
    // Senza vincitrice non si consegna niente: non c'è nessun documento da dare.
    expect(mockDownload).not.toHaveBeenCalled()
  })

  // ═══════ ①-bis fail-closed: nel dubbio non si distrugge niente ═══════
  //
  // Il soft-delete PRECEDE il caricamento del nuovo file. Su un'indisponibilità
  // passeggera scambiata per «file sparito» la riga viene ARCHIVIATA, poi
  // fallisce anche il caricamento e si solleva: il registro vivo resta SENZA
  // nessun DPA per quel dentista. E se la riga archiviata era `firmato`,
  // `firmato_da`/`firmato_at` restano nella riga morta — da lì in poi ogni
  // lettura vede «da firmare» dove esiste un accordo FIRMATO.

  it.each([
    ['un archivio momentaneamente giù (503)', ARCHIVIO_GIU],
    ['il CONTENITORE che non risponde — statusCode «404» come il file mancante', BUCKET_ASSENTE],
    ['la rete caduta, senza nessuna risposta HTTP', RETE_CADUTA],
    ['un esito che il client non sa spiegare: né file né errore', null],
    // 🔑 L'ALTRA metà dell'allowlist, e senza di lei metà del `&&` non è provata:
    //    finché ogni fixture con «Object not found» porta anche `statusCode:
    //    '404'`, togliere `statusCode === '404'` lascia tutte e 48 le prove
    //    VERDI (revisione del Task 6, rilievo R1 — stessa classe del difetto
    //    D132 chiuso in `de70930d`). Qui il MESSAGGIO è quello del file sparito e
    //    lo `statusCode` no: forma non riconosciuta = DUBBIO = non si distrugge.
    ['un «Object not found» che NON porta lo statusCode «404»', OGGETTO_ASSENTE_SENZA_404],
  ])('🛑 %s NON è «file sparito»: si solleva e non si archivia NIENTE', async (_titolo, errore) => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: errore })

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: archivio non raggiungibile, riprovare fra qualche istante')
    // 🛑 Le quattro asserzioni che contano: nel dubbio non si tocca NIENTE.
    expect(mockUpdate).not.toHaveBeenCalled()      // nessuna riga archiviata
    expect(mockProgressivo).not.toHaveBeenCalled() // nessun numero bruciato
    expect(mockUpload).not.toHaveBeenCalled()      // nessun PDF orfano
    expect(mockInsert).not.toHaveBeenCalled()      // nessuna riga nuova
  })

  it("① …e il messaggio dell'archivio non esce nemmeno da questa strada", async () => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: { message: 'token di servizio scaduto: sk_live_xyz', status: 503, statusCode: '503' } })

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: archivio non raggiungibile, riprovare fra qualche istante')
    expect(msg).not.toMatch(/sk_live_xyz/)
  })

  it('🔑 …mentre il file DAVVERO assente resta riconosciuto: si archivia e si riemette', async () => {
    // 🔑 La gemella delle quattro qui sopra, e senza di lei quelle non provano
    //    niente: un codice che si sollevasse SEMPRE le passerebbe tutte e
    //    quattro. È la riga che tiene la porta APERTA quando dev'esserlo.
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: SPARITO_DAVVERO })

    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    expect(r.riemessa).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ deleted_at: expect.any(String) })
  })

  // ════════ ①-bis gli errori di LETTURA non si scartano più ════════

  it('🛑 un guasto di LETTURA del registro non è «nessuna emissione»: si solleva invece di riemettere', async () => {
    // Scartare l'errore qui vuol dire leggere «non c'è niente» da una rete
    // caduta: si brucia un progressivo, si carica un PDF orfano, e l'INSERT
    // prende 23505 dalla riga viva che c'era e non si è vista.
    montaTabelle(CORRENTE, IDENTICA, { message: 'connessione col database interrotta', code: '08006' })

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(msg).toBe('DPA: non è stato possibile leggere il registro')
    expect(msg).not.toMatch(/connessione col database|08006/)
    expect(mockProgressivo).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("🛑 se l'ARCHIVIAZIONE dell'orfana fallisce, non si va avanti: la chiave è ancora occupata", async () => {
    montaTabelle(CORRENTE)
    mockDownload.mockResolvedValue({ data: null, error: SPARITO_DAVVERO })
    mockUpdate.mockReturnValue(createChain({ data: null, error: { message: 'update rifiutato dalla policy', code: '42501' } }))

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    // Andare avanti a chiave occupata è la porta chiusa permanente: ogni clic
    // brucerebbe un progressivo e lascerebbe un PDF orfano prima di fallire.
    expect(msg).toBe("DPA: non è stato possibile archiviare l'emissione senza file")
    expect(msg).not.toMatch(/policy|42501/)
    expect(mockProgressivo).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("🛑 un guasto di lettura su laboratorio/cliente non si racconta come «non trovato»", async () => {
    montaTabelle(null)
    const conFalla = mockFrom.getMockImplementation() as (t: string) => unknown
    mockFrom.mockImplementation((tabella: string) => {
      if (tabella === 'laboratori') return createChain({ data: null, error: { message: 'connessione persa', code: '08006' } })
      return conFalla(tabella)
    })

    const msg = await messaggioDiErrore(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    // 🔑 «Laboratorio non trovato» a chi ha solo perso la rete per due secondi
    //    manda a cercare un dato che c'è. Il dato ASSENTE e il dato NON LETTO
    //    sono due fatti diversi e vanno detti diversi.
    expect(msg).toBe('DPA: non è stato possibile leggere i dati di laboratorio e cliente')
    expect(msg).not.toMatch(/connessione persa|08006/)
    expect(mockProgressivo).not.toHaveBeenCalled()
  })

  // 🛑 «Cliente non trovato» è il cammino di questa famiglia che si vede DAVVERO
  //    in produzione, e fino a oggi non lo copriva nessuna prova.
  //    `generate-dpa.ts:84` filtra il cliente anche per `laboratorio_id`: un
  //    collegamento vecchio, un cliente cancellato o l'id di un ALTRO
  //    laboratorio cadono tutti qui. Non è un guasto di UÀ → 404, non 500.
  it('🛑 il cliente assente si dice «non trovato», e porta un 404 — non è colpa del servizio', async () => {
    montaTabelle(null)
    const conFalla = mockFrom.getMockImplementation() as (t: string) => unknown
    mockFrom.mockImplementation((tabella: string) => {
      if (tabella === 'clienti') return createChain({
        data: null,
        // stessa forma vera di `.single()` su zero righe: PGRST116, non `error: null`
        error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' },
      })
      return conFalla(tabella)
    })

    const e = await erroreSollevato(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect(e).toBeInstanceOf(ErroreDatiDpa)
    expect((e as ErroreDatiDpa).message).toBe('Cliente non trovato')
    expect((e as ErroreDatiDpa).stato).toBe(404)
    // e non si è bruciato nessun numero per un cliente che non c'è
    expect(mockProgressivo).not.toHaveBeenCalled()
  })

  it("🔑 …ma il laboratorio DAVVERO assente continua a dirsi «non trovato»", async () => {
    // 🛑 La fixture NON è `{ data: null, error: null }`: quella forma il client
    //    reale non la produce MAI su `.single()`.
    //    `provato:` `curl -H 'Accept: application/vnd.pgrst.object+json' …&id=eq.<inesistente>`
    //      → `HTTP 406` · `{"code":"PGRST116","details":"The result contains 0 rows",…}`
    //    Cioè: «riga assente» ARRIVA COME UN ERRORE. Un codice che si
    //    sollevasse su qualunque errore di lettura risponderebbe «non è stato
    //    possibile leggere» a un cliente semplicemente cancellato — e questa
    //    prova, con la fixture sbagliata, non l'avrebbe visto.
    montaTabelle(null)
    const conFalla = mockFrom.getMockImplementation() as (t: string) => unknown
    mockFrom.mockImplementation((tabella: string) => {
      if (tabella === 'laboratori') return createChain({
        data: null,
        error: { code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object' },
      })
      return conFalla(tabella)
    })

    const e = await erroreSollevato(() => generateDpa('lab-test-001', 'cli-001', 'utente-007'))

    expect((e as Error).message).toBe('Laboratorio non trovato')
    // …e anche questo è un 404: il dato non c'è, non è UÀ a essere rotta.
    // 📌 Attraverso la rotta del DPA questo cammino non si raggiunge, e la
    //    ragione è la CHIAVE ESTERNA, non il lab-guard:
    //    `provato:` `utenti_laboratorio_id_fkey FOREIGN KEY (laboratorio_id)
    //    REFERENCES laboratori(id)` → `laboratorioId` non nullo ⇒ la riga esiste.
    //    🛑 Il guard NON basterebbe: `lab-guard.ts:50` esce per `admin_sistema`
    //    prima ancora di leggere `ctx.lab` (`:51`).
    //    Lo stato si fissa lo stesso: `generateDpa` non è di questa rotta sola.
    expect(e).toBeInstanceOf(ErroreDatiDpa)
    expect((e as ErroreDatiDpa).stato).toBe(404)
  })
})
