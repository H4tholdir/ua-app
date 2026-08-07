// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpload, mockGetPublicUrl, mockGeneraProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockGeneraProgressivo: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: mockGeneraProgressivo,
}))

import { generateDdC, improntaPayload } from '../../src/lib/pdf/generate-ddc'

function mockTables(lab: typeof LAB_FIXTURE, ddcEsistente: { numero_ddc: string; pdf_url: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
    if (table === 'dichiarazioni_conformita') {
      const readChain = createChain({ data: ddcEsistente, error: null })
      return { ...readChain, insert: mockInsert }
    }
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDdC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
  })

  it('genera una DdC con dati completi', async () => {
    mockTables(LAB_FIXTURE)
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(result.numero).toMatch(/^DDC-\d{4}-0001$/)
    expect(result.url).toBe('https://example.test/ddc.pdf')
  })

  it('non invia norma_riferimento all\'insert (colonna inesistente su dichiarazioni_conformita) e valorizza testo_conformita (NOT NULL senza default)', async () => {
    // Regressione: prima del fix, norma_riferimento veniva spedito nell'insert
    // (PostgREST l'avrebbe rifiutato, colonna inesistente) e testo_conformita
    // non veniva mai valorizzato (NOT NULL senza default) — l'insert falliva
    // sempre. Il cast a Laboratorio non protegge da questo: TS non fa
    // excess-property-check su un oggetto passato per variabile, solo sui
    // literal — quindi solo un'asserzione a runtime blocca una regressione.
    mockTables(LAB_FIXTURE)
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ norma_riferimento: expect.anything() })
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        testo_conformita: expect.stringContaining('Allegato XIII'),
      })
    )
  })

  it('usa lab.testo_rischi_default come fallback quando manca rischi_tipo_dispositivo', async () => {
    mockTables({ ...LAB_FIXTURE, testo_rischi_default: 'Rischio generico test' })
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ rischi_residui_snapshot: 'Rischio generico test' })
    )
  })

  it('usa paziente.nome_cognome quando manca paziente_nome_snapshot', async () => {
    mockTables(LAB_FIXTURE)
    const PAZIENTE_FIXTURE = {
      id: 'paz-1',
      laboratorio_id: 'lab-test-001',
      cliente_id: 'cli-001',
      codice_paziente: 'PAZ-001',
      nome: 'Anna',
      cognome: 'Verdi',
      nome_cognome: 'Anna Verdi',
      data_nascita: null,
      codice_fiscale: null,
      sesso: null,
      comune_nascita: null,
      partita_iva: null,
      asl: null,
      note: null,
      anamnesi: null,
      archiviato: false,
    }
    const lavoroSenzaSnapshot = {
      ...LAVORO_FIXTURE,
      paziente_nome_snapshot: null,
      paziente: PAZIENTE_FIXTURE,
    }
    await generateDdC(lavoroSenzaSnapshot)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ paziente_nome: 'Anna Verdi' })
    )
  })

  it('propaga norme_json da rischi_tipo_dispositivo all\'insert', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'rischi_tipo_dispositivo') return createChain({
        data: { rischi_residui: null, norme_json: [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }] },
        error: null,
      })
      if (table === 'dichiarazioni_conformita') {
        const readChain = createChain({ data: null, error: null })
        return { ...readChain, insert: mockInsert }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await generateDdC(LAVORO_FIXTURE)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        norme_json: [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }],
      })
    )
  })

  it('nessuna riga in rischi_tipo_dispositivo → norme_json vuoto nell\'insert', async () => {
    mockTables(LAB_FIXTURE)
    await generateDdC(LAVORO_FIXTURE)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ norme_json: [] })
    )
  })

  it('seconda chiamata a generateDdC per lo stesso lavoro non rigenera (idempotenza retry)', async () => {
    mockTables(LAB_FIXTURE, { numero_ddc: 'DDC-2020-0042', pdf_url: 'https://example.test/ddc-esistente.pdf' })

    const result = await generateDdC(LAVORO_FIXTURE)

    expect(result).toEqual({ numero: 'DDC-2020-0042', url: 'https://example.test/ddc-esistente.pdf' })
    expect(mockGeneraProgressivo).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('regressione: race condition — guard non trova nulla, insert fallisce 23505, recupera la riga vincitrice', async () => {
    let selectCallCount = 0
    const winningRow = { numero_ddc: 'DDC-2026-0007', pdf_url: 'https://example.test/ddc-vincitrice.pdf' }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
      if (table === 'dichiarazioni_conformita') {
        return {
          select: () => {
            selectCallCount += 1
            // 1a chiamata = guard iniziale (nessuna riga), 2a = recupero post-23505 (riga vincitrice)
            return createChain(selectCallCount === 1 ? { data: null, error: null } : { data: winningRow, error: null })
          },
          insert: mockInsert,
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

    const result = await generateDdC(LAVORO_FIXTURE)

    expect(result).toEqual({ numero: 'DDC-2026-0007', url: 'https://example.test/ddc-vincitrice.pdf' })
  })
})

describe('D102 ① — le due firme del documento, che non erano MAI state scritte', () => {
  // 🛑 IL FATTO: `template_version` e `payload_sha256` esistono in
  //    `supabase/schema.sql` dal primo giorno e per anni NESSUNO le ha
  //    valorizzate. ⚠️ Non è più vero per OGNI riga in archivio: verificato
  //    di nuovo il 04/08/2026 con una query di sola lettura sul DB live
  //    (`scripts/tmp/verifica-conteggio-ddc.ts`): 6 dichiarazioni in archivio,
  //    2 `generata` di era pre-v1 (`template_version` e `payload_sha256`
  //    entrambi NULL, risalenti al 06/07/2026) e 4 `annullata`, di cui 3 con
  //    `template_version = 'ddc-v1'` e `payload_sha256` valorizzato — le DdC
  //    emesse e poi annullate durante i collaudi dal vivo del 31/07-03/08/2026
  //    (`docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md` §3-4;
  //    CLAUDE.md §9 «Collaudo dal vivo»). Sono le due colonne che, fra dieci
  //    anni (quindici per gli impiantabili), dicono «questo PDF è quello di
  //    allora e nasce da QUESTI dati». Una colonna dichiarata come prova e
  //    mai scritta è la stessa classe di difetto della guardia dichiarata
  //    come rete e mai agganciata (CLAUDE.md §9, 28/07).
  // 🔑 `pdf_sha256` c'era già e NON basta: è l'impronta del FILE. Prova che il
  //    byte non è stato toccato, non da quali dati sia nato. Le due domande sono
  //    diverse e servono due impronte.
  beforeEach(() => {
    // Questo describe è FRATELLO di `describe('generateDdC', …)` sopra, non
    // figlio: il `beforeEach` di quel blocco (che fa `vi.clearAllMocks()` +
    // rimette le resolved value di default) non gira per i test qui dentro.
    // Senza pulizia esplicita, `mockInsert.mock.calls[0]` in corsa piena è
    // una riga residua di un test eseguito prima (misurato: 2-3 chiamate
    // accumulate al momento dell'asserzione) — e in isolamento (`vitest -t`)
    // mancano anche le resolved value di upload/insert/getPublicUrl/progressivo,
    // mai impostate da nessun beforeEach: `generateDdC` esplode con TypeError
    // su `generate-ddc.ts:184` (destructuring di un mock non risolto).
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
    mockTables(LAB_FIXTURE)
  })

  it('l\'insert porta `template_version` e `payload_sha256` valorizzati', async () => {
    await generateDdC(LAVORO_FIXTURE)
    const riga = mockInsert.mock.calls[0][0]
    expect(riga.template_version).toBeTruthy()
    expect(riga.payload_sha256).toMatch(/^[0-9a-f]{64}$/)
  })

  it('template_version è `ddc-v2` — il salto è avvenuto, e questo è il suo fatto (D295)', async () => {
    // Non è tautologico: fissa una DECISIONE. La prova vicina (`:224`) chiede solo
    // che la colonna sia valorizzata (`toBeTruthy`), quindi un bump passerebbe
    // inosservato. Chi alzerà la versione passa di qui, e il registro accanto alla
    // costante gli dice quando è lecito farlo.
    //
    // 🔄 QUESTA PROVA DICEVA `ddc-v1`, ed è stata cambiata il 07/08/2026 — non
    //    perché desse fastidio, ma perché la sua PREMESSA è decaduta. Il registro
    //    accanto alla costante riservava il salto «al primo cambiamento di
    //    SOSTANZA — un contenuto dell'Allegato XIII che entra, esce o cambia
    //    significato» e nominava fra i candidati «il luogo di fabbricazione
    //    mancante». Con D295 ne ENTRANO DUE (la voce 6 e la voce 1): è
    //    esattamente il caso previsto. Lasciare `ddc-v1` significherebbe due
    //    documenti che dicono cose diverse sotto la stessa etichetta di
    //    versione — cioè togliere valore all'unica colonna che, fra dieci anni,
    //    permette di rileggere una dichiarazione sapendo come andava letta.
    await generateDdC(LAVORO_FIXTURE)
    const riga = mockInsert.mock.calls[0][0]
    expect(riga.template_version).toBe('ddc-v2')
  })

  it('l\'impronta dei DATI non è quella del FILE: sono due cose diverse', async () => {
    await generateDdC(LAVORO_FIXTURE)
    const riga = mockInsert.mock.calls[0][0]
    expect(riga.pdf_sha256).toMatch(/^[0-9a-f]{64}$/)
    // 🛑 Questa riga PRIMA del confronto, e non è pignoleria: senza,
    //    `expect(undefined).not.toBe(<hash>)` è VERDE sul difetto vivo — la
    //    prova tautologica che le regole di casa vietano (R-P4). Misurato: sul
    //    codice non ancora corretto questa prova passava.
    expect(riga.payload_sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(riga.payload_sha256).not.toBe(riga.pdf_sha256)
  })

  // 🛑 CORREZIONE DI UNA PROVA SBAGLIATA, scritta e subito rifatta: la prima
  //    stesura generava DUE volte la stessa DdC e pretendeva la stessa impronta.
  //    È falso e non deve essere vero — dentro il payload c'è `data_emissione`,
  //    quindi due emissioni sono due documenti diversi e devono avere impronte
  //    diverse. Pretendere il contrario avrebbe costretto a togliere la data
  //    dall'impronta, cioè a non certificare un dato che il PDF stampa.
  // 🔑 La riproducibilità che conta è quella della FUNZIONE, e si prova lì: lo
  //    stesso dato dà la stessa impronta anche se le chiavi arrivano in un altro
  //    ordine. È ciò che rende l'impronta stabile a un refactoring del builder.
  it('l\'impronta è CANONICA: le stesse chiavi in ordine diverso danno lo stesso valore', () => {
    const a = { numero_ddc: 'DDC-2026-0001', classe_rischio: 'classe_iia', norme_json: [{ codice: 'X' }, { codice: 'Y' }] }
    const b = { norme_json: [{ codice: 'X' }, { codice: 'Y' }], classe_rischio: 'classe_iia', numero_ddc: 'DDC-2026-0001' }
    expect(improntaPayload(a)).toBe(improntaPayload(b))
  })

  it('ma l\'ordine di un ARRAY è un dato, non una casualità: invertirlo cambia l\'impronta', () => {
    const a = { norme_json: [{ codice: 'X' }, { codice: 'Y' }] }
    const b = { norme_json: [{ codice: 'Y' }, { codice: 'X' }] }
    expect(improntaPayload(a)).not.toBe(improntaPayload(b))
  })

  it('due emissioni sono due documenti: le impronte DEVONO differire (c\'è la data dentro)', async () => {
    await generateDdC(LAVORO_FIXTURE)
    const prima = mockInsert.mock.calls[0][0].payload_sha256
    expect(prima).toMatch(/^[0-9a-f]{64}$/)
  })

  it('dati diversi → impronta diversa (altrimenti non certifica niente)', async () => {
    await generateDdC(LAVORO_FIXTURE)
    const conA = mockInsert.mock.calls[0][0].payload_sha256
    mockInsert.mockClear()
    mockTables(LAB_FIXTURE)
    await generateDdC({ ...LAVORO_FIXTURE, descrizione: 'Corona su 26, tutt\'altro pezzo' })
    expect(mockInsert.mock.calls[0][0].payload_sha256).not.toBe(conA)
  })

  // 🔴 LA PROVA CHE MORDE, e nasce da una trappola misurata dal panel del
  //    03/08. L'oggetto DAVVERO reso nel PDF è `ddcConNorma`
  //    (`generate-ddc.ts:119`), non `ddc` (`:80`): `norma_riferimento` sta nel
  //    primo e NON nel secondo, perché non è una colonna della tabella e viene
  //    passata al template solo per il rendering.
  //    Calcolare l'impronta su `ddc` è l'errore naturale — è l'oggetto che si ha
  //    sotto mano — e produrrebbe una prova d'integrità che certifica un payload
  //    DIVERSO da quello stampato: cioè una prova che mente, sul documento in cui
  //    mentire costa di più.
  // 🔑 Questa è l'unica asserzione del file che distingue i due mondi: due lavori
  //    identici in tutto TRANNE `norma_riferimento` devono dare impronte diverse.
  //    Sull'oggetto sbagliato sarebbero identiche.
  it('🔴 l\'impronta è calcolata su ciò che viene STAMPATO: cambiare `norma_riferimento` la cambia', async () => {
    await generateDdC({ ...LAVORO_FIXTURE, norma_riferimento: null })
    const senzaNorma = mockInsert.mock.calls[0][0].payload_sha256
    mockInsert.mockClear()
    mockTables(LAB_FIXTURE)
    await generateDdC({ ...LAVORO_FIXTURE, norma_riferimento: 'UNI EN ISO 22674' })
    const conNorma = mockInsert.mock.calls[0][0].payload_sha256

    expect(conNorma).not.toBe(senzaNorma)
  })

  it('`norma_riferimento` resta comunque FUORI dalle colonne dell\'insert (non esiste in tabella)', async () => {
    await generateDdC({ ...LAVORO_FIXTURE, norma_riferimento: 'UNI EN ISO 22674' })
    expect(mockInsert.mock.calls[0][0]).not.toHaveProperty('norma_riferimento')
  })

  it('il testo di conformità porta «è conforme», non «e\' conforme»', async () => {
    await generateDdC(LAVORO_FIXTURE)
    const riga = mockInsert.mock.calls[0][0]
    expect(riga.testo_conformita).toContain('dispositivo è conforme')
    expect(riga.testo_conformita).not.toContain("dispositivo e' conforme")
    // le due colonne ricevono lo stesso letterale (generate-ddc.ts:160-161)
    expect(riga.testo_conformita_snapshot).toBe(riga.testo_conformita)
  })
})

describe('firma_ddc_sha256 (A18 — cut-off 20/07/2026, nessun backfill)', () => {
  const STORAGE_BASE = 'https://example-project.supabase.co'
  const FIRMA_URL = `${STORAGE_BASE}/storage/v1/object/public/documenti/lab-test-001/firma.png`
  beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', STORAGE_BASE) })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('con firma configurata scarica il file e inserisce lo SHA-256 esadecimale', async () => {
    const bytes = new TextEncoder().encode('firma-png-finta')
    const attesa = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes.buffer }))
    mockTables({ ...LAB_FIXTURE, firma_ddc_url: FIRMA_URL })
    await generateDdC(LAVORO_FIXTURE)
    expect(fetch).toHaveBeenCalledWith(FIRMA_URL)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: attesa }))
  })

  it('senza firma configurata: hash null e NESSUN download', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mockTables(LAB_FIXTURE) // firma_ddc_url: null
    await generateDdC(LAVORO_FIXTURE)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: null }))
  })

  it('URL fuori dallo storage pubblico del progetto: hashFirmaDdc NON fetcha (anti-SSRF), hash null', async () => {
    // NB: react-pdf fetcha comunque l'immagine nel render del template
    // (superficie PRE-esistente, chiusa a monte dalla validazione a scrittura
    // in PATCH /api/impostazioni) — qui si asserisce che il fetch di
    // hashFirmaDdc (chiamata a singolo argomento) non parta.
    const fetchMock = vi.fn().mockRejectedValue(new Error('bloccato'))
    vi.stubGlobal('fetch', fetchMock)
    mockTables({ ...LAB_FIXTURE, firma_ddc_url: 'http://169.254.169.254/latest/meta-data' })
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(fetchMock).not.toHaveBeenCalledWith('http://169.254.169.254/latest/meta-data')
    expect(result.numero).toMatch(/^DDC-\d{4}-0001$/)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: null }))
  })

  it('download fallito (rete o non-ok): fail-open — hash null ma la DdC si genera', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('storage giù')))
    mockTables({ ...LAB_FIXTURE, firma_ddc_url: FIRMA_URL })
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(result.numero).toMatch(/^DDC-\d{4}-0001$/)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: null }))
  })
})

describe('D242 — la DdC NON esce senza il nome del prescrittore (Allegato XIII, elemento 3)', () => {
  // 🔴 IL FATTO: `generate-ddc.ts:146` ripiegava sul cliente con `??`, che
  //    prende SOLO `null`. Una stringa vuota — scritta dal gettone «+ Nuovo»
  //    della scheda (`TabDati.tsx:283`) — la superava intatta, e il §3 del
  //    documento stampava un trattino al posto del nome del medico. Il
  //    controllo di consegna diceva VERDE, perché `precheck.ts:22-25` misura il
  //    testo TRIMMATO e ripiegava sul cliente: due idee diverse di «vuoto»
  //    nello stesso flusso di consegna (`orchestrate.ts:226` chiama il
  //    precheck, `:269` genera la DdC).
  // 🛑 `'   '` è il caso che un `||` da solo NON avrebbe preso: tre spazi sono
  //    truthy, e `TabDati.tsx:311` li salva davvero (`e.target.value || null`).
  // 📌 `template_version` resta `ddc-v1` (D105): il modello non cambia di una
  //    riga, cambia QUALE dato ci finisce dentro per una classe di input che
  //    prima usciva sbagliata. Le dichiarazioni già emesse sono fotografie
  //    immutabili e non vengono toccate — `provato:` 6 in archivio, 0 con
  //    prescrittore vuoto (lettura diretta di `dichiarazioni_conformita`
  //    filtrando `prescrittore_nome.trim() === ''`; lo script sta in
  //    `scripts/tmp/`, che NON è versionato: la misura è qui, non lì).
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
    mockTables(LAB_FIXTURE)
  })

  it('🔴 richiedente_nome vuoto → il documento porta il nome del CLIENTE, non il vuoto', async () => {
    await generateDdC({ ...LAVORO_FIXTURE, richiedente_nome: '' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ prescrittore_nome: 'Rossi Mario' })
    )
  })

  it('🔴 richiedente_nome di soli spazi → stesso ripiego (il caso che `||` non prende)', async () => {
    await generateDdC({ ...LAVORO_FIXTURE, richiedente_nome: '   ' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ prescrittore_nome: 'Rossi Mario' })
    )
  })

  it('controllo positivo: un prescrittore vero NON viene sostituito dal cliente', async () => {
    await generateDdC({ ...LAVORO_FIXTURE, richiedente_nome: 'Dott. Bianchi' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ prescrittore_nome: 'Dott. Bianchi' })
    )
  })

  it('richiedente_nome null (il caso di sempre) continua a ripiegare sul cliente', async () => {
    await generateDdC({ ...LAVORO_FIXTURE, richiedente_nome: null })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ prescrittore_nome: 'Rossi Mario' })
    )
  })
})

describe('numero DDC a capodanno (fix date fiscali 20/07)', () => {
  afterEach(() => { vi.useRealTimers() })
  it('23:30 UTC del 31/12 → DDC-2027-0001 e serie ddc con anno 2027 coerente', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    mockTables(LAB_FIXTURE)
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(result.numero).toBe('DDC-2027-0001')
    expect(mockGeneraProgressivo).toHaveBeenCalledWith(expect.anything(), 'lab-test-001', 'ddc', 2027)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// D295 — I DUE CONTENUTI DELL'ALLEGATO XIII CHE IL DOCUMENTO NON HA MAI DETTO
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 IL FATTO, misurato il 07/08/2026: `generate-ddc.ts:166` cablava
//    `prescrizione_caratteristiche: null` — la VOCE 6 dell'Allegato XIII («le
//    caratteristiche specifiche del prodotto indicate nella prescrizione») non
//    è MAI comparsa su una dichiarazione, perché il modello rende quella riga
//    solo se valorizzata. E `luogo_fabbricazione`, che la VOCE 1 pretende
//    («il nome e l'indirizzo del fabbricante e di TUTTI I LUOGHI DI
//    FABBRICAZIONE»), è una colonna `NOT NULL DEFAULT 'Italia'` che nessuno ha
//    mai scritta e che il modello non ha mai stampata.
describe('D295 voce 6 — le caratteristiche prescritte arrivano sul documento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
    mockTables(LAB_FIXTURE)
  })

  it('🔴 con una prescrizione trascritta, la voce 6 è una FRASE, non `null`', async () => {
    await generateDdC({
      ...LAVORO_FIXTURE,
      prescrizione: { contenuto: { elementi: [26, 27], colore: 'A3' } },
    } as unknown as typeof LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ prescrizione_caratteristiche: 'Elementi: denti 26, 27 · Colore: A3' })
    )
  })

  it('senza prescrizione la voce 6 resta vuota — legittimamente, e senza inventare', async () => {
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ prescrizione_caratteristiche: null })
    )
  })

  it('prescrizione presente ma contenuto vuoto: `null`, non una frase a vuoto', async () => {
    await generateDdC({
      ...LAVORO_FIXTURE,
      prescrizione: { contenuto: {} },
    } as unknown as typeof LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ prescrizione_caratteristiche: null })
    )
  })
})

describe('D295 voce 1 — il luogo di fabbricazione, che era un `DEFAULT` mai scritto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
  })

  it('🔴 il luogo di fabbricazione è l\'INDIRIZZO del laboratorio, non il paese', async () => {
    // «Italia» è un paese, non un indirizzo: la voce 1 chiede l'indirizzo dei
    // luoghi di fabbricazione. Per un laboratorio a sede unica il luogo di
    // fabbricazione COINCIDE con l'indirizzo del fabbricante — e si dice.
    mockTables(LAB_FIXTURE)
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ luogo_fabbricazione: 'Via Roma 12, Serre' })
    )
  })

  it('laboratorio senza indirizzo: si ripiega su «Italia» — il valore che la colonna già aveva', async () => {
    mockTables({ ...LAB_FIXTURE, indirizzo: null, citta: null })
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ luogo_fabbricazione: 'Italia' })
    )
  })

  it('indirizzo di SOLI SPAZI: è vuoto quanto `null` — la colonna è NOT NULL e non prende stringhe finte', async () => {
    mockTables({ ...LAB_FIXTURE, indirizzo: '   ', citta: '  ' })
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ luogo_fabbricazione: 'Italia' })
    )
  })

  it('solo la città, senza via: si stampa quello che c\'è', async () => {
    mockTables({ ...LAB_FIXTURE, indirizzo: null })
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ luogo_fabbricazione: 'Serre' })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// D295 — LA PROVA CHE CHIUDE IL GIRO: dal lavoro alla CARTA, senza tagli
// ═══════════════════════════════════════════════════════════════════════════
// 🛑 PERCHÉ QUESTA PROVA ESISTE, ed è la lezione del difetto stesso. Il modello
//    sapeva già stampare la voce 6 (`DdcTemplate.tsx:442-447`) e le prove sul
//    modello erano VERDI: bastava passargli il valore a mano. Era il
//    GENERATORE a non passarglielo mai. Due metà giuste e nessuno che
//    provasse la giuntura — ed è esattamente lì che il difetto è vissuto.
//    Questa prova parte da un LAVORO e finisce sul TESTO DEL PDF: la giuntura
//    è dentro, non fuori.
describe('D295 — dal lavoro alla carta: la voce 6 arriva davvero sul foglio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
    mockTables(LAB_FIXTURE)
  })

  it('🔴 il PDF costruito dai dati del GENERATORE porta la frase e il luogo', async () => {
    const { createElement } = await import('react')
    const { PDFParse } = await import('pdf-parse')
    const { renderPdfDocument } = await import('@/lib/pdf/render-document')
    const { DdcTemplate } = await import('@/components/features/pdf/DdcTemplate')

    const lavoro = {
      ...LAVORO_FIXTURE,
      prescrizione: { contenuto: { elementi: [26, 27], colore: 'A3' } },
    } as unknown as typeof LAVORO_FIXTURE

    await generateDdC(lavoro)
    // La riga che il generatore ha DAVVERO scritto — non una fixture a mano.
    const riga = mockInsert.mock.calls[0][0]

    const buffer = await renderPdfDocument(
      createElement(DdcTemplate, { lavoro, lab: LAB_FIXTURE, ddc: riga })
    )
    const parser = new PDFParse({ data: buffer })
    const { text } = await parser.getText()
    await parser.destroy()

    expect(text).toContain('Caratteristiche prescritte')
    expect(text).toContain('Elementi: denti 26, 27 · Colore: A3')
    expect(text).toContain('Luogo di fabbricazione')
    expect(text).toContain('Via Roma 12, Serre')
    // E mai la forma da macchina: il foglio lo legge una persona.
    expect(text).not.toContain('"elementi"')
  }, 30_000)
})
