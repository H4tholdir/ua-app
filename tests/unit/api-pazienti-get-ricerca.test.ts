import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain, type MockChain } from './helpers/supabase-chain-mock'

// T6 (ondata b) — `GET /api/pazienti` con `q=`.
//
// 🔑 PERCHÉ UN FILE NUOVO E NON UN'AGGIUNTA A `api-pazienti-post.test.ts`.
// Quel file si chiama «post» e ospita già un `describe` sul GET (l'errore
// grezzo, G9): il nome mente da prima di me. T6 aggiunge una trentina di
// asserzioni sul solo GET — metterle lì renderebbe il nome ancora più falso e
// un domani nessuno saprebbe dove cercare la ricerca pazienti. Il `describe`
// G9 esistente NON si sposta: spostarlo è un lavoro di riordino fuori dal
// mandato di T6 (R-E2), e sta riferito nel rapporto.
//
// 🛑 IL FINTO È GRASSO, ED È UN REQUISITO, NON UNA COMODITÀ.
// `helpers/supabase-chain-mock.ts` tiene `select` fra i metodi passanti: non
// filtra nulla, restituisce quello che gli si dà. Con righe finte MAGRE (già
// ridotte alle quattro chiavi) la prova B2 resterebbe VERDE anche con
// `select('*')` e nessuna trasformazione — cioè verde attraverso il difetto
// che esiste per vedere. Le righe qui sotto portano quindi TUTTE le colonne
// della proiezione grassa di ieri (`codice_fiscale`, `note`, `data_nascita`,
// `sesso`, `laboratorio_id`, `archiviato`…): se la rotta rimandasse le righe
// così come arrivano, B2 diventa rossa.

const { mockFrom, mockGetLabContextWithTimings } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetLabContextWithTimings: vi.fn(),
}))

vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: vi.fn(),
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/pazienti/route'

const LAB_ID = 'lab-1'
const ALTRO_LAB = 'lab-2'
const CLIENTE_ID = 'cli-1'
const CONTEXT = {
  userId: 'user-1',
  email: null,
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: null,
  cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

/** Paziente con un nome vero e un lavoro: 5 schede su 916 sono così. */
const RIGA_CON_NOME = {
  id: 'pz-1',
  laboratorio_id: LAB_ID,
  cliente_id: CLIENTE_ID,
  codice_paziente: 'PAZ/2026/0101',
  nome: 'Giuseppe',
  cognome: 'Bagheria',
  nome_cognome: 'BAGHERIA GIUSEPPE',
  data_nascita: '1980-01-01',
  codice_fiscale: 'BGHGPP80A01H501X',
  sesso: 'M',
  note: 'nota clinica riservata',
  archiviato: false,
  lavori: [{ data_ingresso: '2026-07-01' }],
}

/**
 * Paziente SENZA nome e SENZA lavori: 911 schede su 916 sono così (misurato il
 * 29/07: `cognome IS NULL AND nome IS NULL` → 911). Il trigger scrive il
 * codice dentro `nome_cognome`, quindi `derivaAlias` deve restituire `null` —
 * mai il codice travestito da nome.
 */
const RIGA_SENZA_NOME = {
  id: 'pz-2',
  laboratorio_id: LAB_ID,
  cliente_id: CLIENTE_ID,
  codice_paziente: 'PAZ/2026/0102',
  nome: null,
  cognome: null,
  nome_cognome: 'PAZ/2026/0102',
  data_nascita: null,
  codice_fiscale: null,
  sesso: null,
  note: null,
  archiviato: false,
  lavori: [],
}

const CHIAVI_ATTESE = ['alias', 'codice_paziente', 'id', 'ultimoLavoro']

let chain: MockChain

function montaTabella(result: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella !== 'pazienti') throw new Error(`Unexpected table: ${tabella}`)
    chain = createChain(result)
    return chain
  })
}

function richiesta(qs = '') {
  return new Request(`http://localhost/api/pazienti${qs}`)
}

/** L'argomento passato a `.select()` — la BANDA che esce dal database. */
function argSelect(): string {
  const call = chain.calls.find((c) => c.method === 'select')
  return String(call?.args[0] ?? '')
}

/** L'argomento passato a `.or()` — il PREDICATO costruito. */
function argOr(): string | null {
  const call = chain.calls.find((c) => c.method === 'or')
  return call ? String(call.args[0]) : null
}

function chiamate(metodo: string) {
  return chain.calls.filter((c) => c.method === metodo).map((c) => c.args)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetLabContextWithTimings.mockResolvedValue({
    context: CONTEXT,
    timings: { authMs: 0, dbMs: 0 },
  })
  montaTabella({ data: [RIGA_CON_NOME, RIGA_SENZA_NOME], error: null })
})

// ---------------------------------------------------------------------------
// B2 — la forma della risposta. Si asserisce sul CORPO HTTP PARSATO.
// L'asserzione sulla stringa di `.select()` è un'ALTRA prova, più sotto, con un
// altro nome: confonderle è la prova tautologica che ha ingannato T4.
// ---------------------------------------------------------------------------
describe('GET /api/pazienti — B2: la forma della risposta, corpo HTTP parsato', () => {
  it('SENZA q: esattamente quattro chiavi, mai una quinta', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(res.status).toBe(200)
    const { pazienti } = await res.json()
    expect(pazienti).toHaveLength(2)
    for (const riga of pazienti) {
      expect(Object.keys(riga).sort()).toEqual(CHIAVI_ATTESE)
    }
  })

  it('CON q: la stessa identica forma — una sola forma su entrambi i percorsi (D46)', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    expect(res.status).toBe(200)
    const { pazienti } = await res.json()
    for (const riga of pazienti) {
      expect(Object.keys(riga).sort()).toEqual(CHIAVI_ATTESE)
    }
  })

  it('la riga intera, valore per valore: alias da derivaAlias, ultimoLavoro da data_ingresso', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    const { pazienti } = await res.json()
    expect(pazienti[0]).toEqual({
      id: 'pz-1',
      codice_paziente: 'PAZ/2026/0101',
      alias: 'BAGHERIA GIUSEPPE',
      ultimoLavoro: '2026-07-01',
    })
  })

  it('paziente SENZA nome: alias vale null, mai il codice travestito da nome', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    const { pazienti } = await res.json()
    expect(pazienti[1].alias).toBeNull()
    expect(pazienti[1].codice_paziente).toBe('PAZ/2026/0102')
  })

  it('paziente SENZA lavori: ultimoLavoro è null e la CHIAVE C’È lo stesso', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    const { pazienti } = await res.json()
    expect(pazienti[1].ultimoLavoro).toBeNull()
    // 🔑 «presente e null» ≠ «assente»: un null che significhi anche «non
    // calcolato» sarebbe un valore che mente (D46).
    expect('ultimoLavoro' in pazienti[1]).toBe(true)
  })

  it('nessun dato sanitario nel corpo: né codice fiscale, né note, né data di nascita', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    const testo = await res.text()
    expect(testo).not.toContain('BGHGPP80A01H501X')
    expect(testo).not.toContain('nota clinica riservata')
    expect(testo).not.toContain('1980-01-01')
  })
})

// ---------------------------------------------------------------------------
// La proiezione SQL — banda e dati che escono dal DATABASE, non ciò che arriva
// al browser. Prova distinta da B2, per costruzione.
// ---------------------------------------------------------------------------
describe('GET /api/pazienti — la proiezione SQL (banda), prova distinta da B2', () => {
  it('la select non chiede più le colonne senza lettori', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    const sel = argSelect()
    for (const colonna of ['codice_fiscale', 'data_nascita', 'sesso', 'note', 'archiviato', 'laboratorio_id']) {
      expect(sel).not.toContain(colonna)
    }
  })

  it('la select CHIEDE nome_cognome — è l’ingresso di derivaAlias, e non esce mai', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(argSelect()).toContain('nome_cognome')
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    const { pazienti } = await res.json()
    expect(Object.keys(pazienti[0])).not.toContain('nome_cognome')
  })

  it("l'innesto è lavori(data_ingresso), e NON è !inner", async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    const sel = argSelect()
    expect(sel).toContain('lavori(data_ingresso)')
    // 🛑 `!inner` restituirebbe [] e cancellerebbe i pazienti senza lavori
    // (controllo negativo di P6-forma).
    expect(sel).not.toContain('!inner')
  })

  it('order + limit PER PADRE sull’innesto: senza, la risposta è la cronologia delle prestazioni', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(chiamate('order')).toContainEqual([
      'data_ingresso',
      { referencedTable: 'lavori', ascending: false },
    ])
    expect(chiamate('limit')).toContainEqual([1, { referencedTable: 'lavori' }])
  })

  it('i lavori soft-cancellati sono esclusi dall’innesto', async () => {
    // ⚠️ DICHIARATO: in banca dati non esiste NESSUN lavoro con `deleted_at`
    // valorizzato (0 righe su 294, verificato). Un’asserzione «il lavoro
    // cancellato non compare» fatta sui dati veri passerebbe a vuoto. Si
    // asserisce quindi che il FILTRO sia stato chiamato, che è tutto ciò che
    // questo livello di prova può onestamente garantire.
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(chiamate('is')).toContainEqual(['lavori.deleted_at', null])
  })
})

// ---------------------------------------------------------------------------
// Il PREDICATO COSTRUITO — il secondo canale verso le colonne che la proiezione
// ha appena tolto (D48). Nessuna prova, oggi, lo guardava.
// ---------------------------------------------------------------------------
describe('GET /api/pazienti — il predicato costruito (D48)', () => {
  it('il filtro tocca ESATTAMENTE quattro colonne (D47), e nessun’altra', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    const predicato = argOr() ?? ''
    const colonne = predicato.split('.ilike.').slice(0, -1).map((p) => p.split(',').pop())
    expect(colonne).toEqual(['codice_paziente', 'nome_cognome', 'cognome', 'nome'])
  })

  it('nome_cognome È nel filtro: senza, «bagheria giuseppe» non trova nulla (D47 emenda D44)', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria giuseppe`))
    expect(argOr()).toContain('nome_cognome.ilike.')
  })

  it('il termine viaggia INCORNICIATO e QUOTATO: pgrestQuote per ultimo', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    expect(argOr()).toBe(
      'codice_paziente.ilike."%bagheria%",nome_cognome.ilike."%bagheria%",cognome.ilike."%bagheria%",nome.ilike."%bagheria%"'
    )
  })

  it('q=% → il percento arriva LETTERALE, mai come jolly', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent('%')}`))
    // `%` → ilikeLiterale → `\%` → cornice → `%\%%` → pgrestQuote → `"%\\%%"`
    expect(argOr()).toContain(String.raw`codice_paziente.ilike."%\\%%"`)
  })

  it('q=_ → il trattino basso arriva letterale', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent('_')}`))
    expect(argOr()).toContain(String.raw`codice_paziente.ilike."%\\_%"`)
  })

  it('q=* → GUARDIA SUL VUOTO: nessuna query, nessuna riga, mai l’anagrafica intera', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent('*')}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ pazienti: [] })
    // Il database non viene nemmeno interrogato: `%%` non deve poter nascere.
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('q di soli spazi → stessa guardia', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent('   ')}`))
    expect(await res.json()).toEqual({ pazienti: [] })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('una virgola nel termine non spezza il predicato in due condizioni', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent('rossi, mario')}`))
    const predicato = argOr() ?? ''
    // Quattro condizioni, non cinque: la virgola resta DENTRO gli apici.
    expect(predicato.split('.ilike.')).toHaveLength(5)
    expect(predicato).toContain('"%rossi, mario%"')
  })

  it("un q che tenta di iniettare un altro laboratorio resta un VALORE, e l'.eq esterno c'è comunque", async () => {
    const attacco = `zzz",laboratorio_id.eq.${ALTRO_LAB},codice_paziente.ilike."%`
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent(attacco)}`))
    const predicato = argOr() ?? ''

    // 🛑 QUI SI ASSERISCE LA PROPRIETÀ GIUSTA, E NON È «il testo dell'attacco
    // sparisce»: `ilikeLiterale` tocca `* \ % _`, `pgrestQuote` tocca `\ "` —
    // nessuno dei due tocca virgole, punti o lettere. Il testo `laboratorio…
    // .eq.lab-2` VIAGGIA per intero, ed è giusto così: è un VALORE. La
    // proprietà di sicurezza è un'altra — che non diventi mai una CONDIZIONE.
    // Ciò che glielo impedisce è l'apice doppio dell'attacco, che esce
    // ESCAPATO (`\"`) e quindi non chiude la stringa quotata.
    //
    // Pattern derivato A MANO, passaggio per passaggio (mai ricalcolato
    // riapplicando le funzioni, che sarebbe una tautologia):
    //   ①  ilikeLiterale: i due `_` di `laboratorio_id`/`codice_paziente`
    //      diventano `\_`, il `%` finale diventa `\%`
    //   ②  cornice: `%…%`
    //   ③  pgrestQuote: ogni `\` raddoppia, ogni `"` diventa `\"`
    const pattern = String.raw`"%zzz\",laboratorio\\_id.eq.lab-2,codice\\_paziente.ilike.\"\\%%"`
    expect(predicato).toBe(
      `codice_paziente.ilike.${pattern},` +
        `nome_cognome.ilike.${pattern},` +
        `cognome.ilike.${pattern},` +
        `nome.ilike.${pattern}`
    )

    // Controllo strutturale, indipendente dalla stringa attesa: gli apici
    // doppi NON escapati sono esattamente 8 — due per pattern, quattro
    // pattern. Un apice dell'attacco lasciato nudo ne farebbe 9 o più, e
    // sarebbe il momento in cui il valore smette di essere un valore.
    const apiciNudi = predicato.split(/(?<!\\)"/).length - 1
    expect(apiciNudi).toBe(8)

    // E comunque il gruppo `.or()` è ANDato con lo scoping esplicito: finisce
    // in un parametro SEPARATO della query string, che PostgREST parentesizza
    // per conto suo (provato in attacco a runtime: P11, §5 del piano).
    expect(chiamate('eq')).toContainEqual(['laboratorio_id', LAB_ID])
  })

  it('q oltre 64 caratteri: il taglio avviene PRIMA dell’escape', async () => {
    // 63 «a» + un backslash = 64 caratteri esatti, nessun taglio.
    // Escapato: 63 «a» + DUE backslash = 65 caratteri. Se il taglio avvenisse
    // DOPO l'escape, resterebbe un backslash orfano che si mangerebbe il `%` di
    // chiusura della cornice — il jolly sparirebbe in silenzio.
    // Dopo `pgrestQuote` le due barre diventano QUATTRO: l'atteso è scritto a
    // mano con `String.raw`, mai ricalcolato riapplicando `pgrestQuote`.
    const q = 'a'.repeat(63) + '\\'
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent(q)}`))
    expect(argOr()).toContain(
      `codice_paziente.ilike."%${'a'.repeat(63)}${String.raw`\\\\`}%"`
    )
  })

  it('q = un solo backslash: si raddoppia, non cancella il carattere seguente', async () => {
    // §2.1 elenca `\` fra le forme d'input, e merita il suo caso di rotta: per
    // Postgres il backslash è il carattere di escape DENTRO ILIKE, e lasciato
    // grezzo si mangerebbe il `%` di chiusura della cornice.
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent('\\')}`))
    expect(argOr()).toContain(String.raw`codice_paziente.ilike."%\\\\%"`)
  })

  it('q oltre 64 caratteri: ciò che eccede il tetto non entra nel pattern', async () => {
    const q = 'a'.repeat(64) + 'ZZZ'
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent(q)}`))
    expect(argOr()).toContain(`"%${'a'.repeat(64)}%"`)
    expect(argOr()).not.toContain('ZZZ')
  })

  it('SENZA q non si costruisce nessun predicato di ricerca', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(argOr()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// B25 — il ramo si sceglie su `q !== null`, e ogni riga è un valore che DEVE
// essere rifiutato.
// ---------------------------------------------------------------------------
describe('GET /api/pazienti — B25: q senza cliente_id, e il ramo su q !== null', () => {
  it('q presente senza cliente_id → 400, col motivo leggibile a macchina', async () => {
    const res = await GET(richiesta('?q=bagheria'))
    expect(res.status).toBe(400)
    const corpo = await res.json()
    expect(corpo.motivo).toBe('studio_mancante')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('?q= VUOTO senza cliente_id → 400 anch’esso: è LA prova che il ramo è su q !== null', async () => {
    // 🛑 Con `if (q)` questa richiesta cadrebbe nel ramo legacy (200, tetto
    // 500, cliente_id facoltativo): il vincolo di portata si aggirerebbe
    // togliendo un carattere.
    const res = await GET(richiesta('?q='))
    expect(res.status).toBe(400)
    expect((await res.json()).motivo).toBe('studio_mancante')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('SENZA q e senza cliente_id → 200: il percorso legacy non cambia (fuori mandato, RATE-1)', async () => {
    const res = await GET(richiesta())
    expect(res.status).toBe(200)
  })

  it('dal corpo del 400 non esce NESSUN nome di colonna (G9)', async () => {
    const res = await GET(richiesta('?q=bagheria'))
    const testo = await res.text()
    for (const colonna of ['cliente_id', 'laboratorio_id', 'codice_paziente', 'nome_cognome', 'archiviato']) {
      expect(testo).not.toContain(colonna)
    }
  })

  it('con q e cliente_id, lo scoping per studio è DAVVERO applicato alla query', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    // Il 400 garantisce la PRESENZA del parametro; solo questa asserzione
    // garantisce che sia cablato al filtro.
    expect(chiamate('eq')).toContainEqual(['cliente_id', CLIENTE_ID])
  })
})

// ---------------------------------------------------------------------------
// Tetto, ordinamento, stato.
// ---------------------------------------------------------------------------
describe('GET /api/pazienti — tetto, ordine totale, archiviato', () => {
  it('con q il tetto è 10 — e sta FUORI dal ramo if', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    expect(chiamate('limit')).toContainEqual([10])
  })

  it('senza q il tetto resta 500 (percorso legacy invariato)', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(chiamate('limit')).toContainEqual([500])
  })

  it('ordine TOTALE a tre criteri: cognome, nome, id', async () => {
    // 🔑 911 righe su 916 hanno cognome E nome entrambi NULL (misurato): senza
    // un terzo criterio, QUALI righe finiscono nelle 10 non è deterministico
    // fra due chiamate — e il pannello si ridisegna a ogni tasto.
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=paz`))
    const ordini = chiamate('order')
      .filter((a) => !(a[1] as { referencedTable?: string })?.referencedTable)
      .map((a) => a[0])
    expect(ordini).toEqual(['cognome', 'nome', 'id'])
  })

  it('archiviato = false su ENTRAMBI i percorsi', async () => {
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(chiamate('eq')).toContainEqual(['archiviato', false])
    vi.clearAllMocks()
    montaTabella({ data: [], error: null })
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    expect(chiamate('eq')).toContainEqual(['archiviato', false])
  })
})

// ---------------------------------------------------------------------------
// Errori.
// ---------------------------------------------------------------------------
describe('GET /api/pazienti — errori del database mai grezzi al client (G9)', () => {
  it('cliente_id non-UUID: PostgREST dà 22P02 e la rotta degrada in un 500 generico', async () => {
    montaTabella({
      data: null,
      error: {
        code: '22P02',
        message: 'invalid input syntax for type uuid: "non-un-uuid" (column cliente_id)',
      },
    })
    const res = await GET(richiesta('?cliente_id=non-un-uuid&q=bagheria'))
    expect(res.status).toBe(500)
    const testo = await res.text()
    expect(testo).not.toContain('cliente_id')
    expect(testo).not.toContain('22P02')
    expect(JSON.parse(testo).error).toBe('Non è stato possibile leggere i pazienti')
  })

  it('errore di lettura sul percorso con q → stesso messaggio generico', async () => {
    montaTabella({
      data: null,
      error: { message: 'column "nome_cognome" does not exist in relation "pazienti"' },
    })
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Non è stato possibile leggere i pazienti')
  })
})
