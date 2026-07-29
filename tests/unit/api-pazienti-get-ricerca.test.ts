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
//
// 📏 R-P4 — LA MISURA CON L'ABBOZZO INERTE, E L'ABBOZZO SCRITTO PER ESTESO.
// Un `N su M` senza la forma dell'abbozzo non è riproducibile da terzi: la
// prima stesura dichiarava «27 su 34», un revisore col PROPRIO abbozzo ne
// ottenne «29 su 35», e la differenza era tutta nell'abbozzo. Quindi eccolo,
// alla lettera — si sostituisce il corpo del `GET` in
// `src/app/api/pazienti/route.ts` con:
//
//     export async function GET(req: Request) {
//       void req
//       return NextResponse.json({ pazienti: [] })
//     }
//
// Comando: `npx vitest run tests/unit/api-pazienti-get-ricerca.test.ts`
// Esito misurato il 29/07/2026, a file completo: **34 rosse su 40**.
//
// 🔑 LE SEI VERDI SONO LEGITTIME, E OGNUNA PORTA LA SUA GEMELLA POSITIVA —
// che è ciò che le distingue da una prova che passa a vuoto. Sono le sei che
// asseriscono un'uscita ANTICIPATA (`{ pazienti: [] }` senza toccare il
// database), cioè proprio la forma che l'abbozzo imita per costruzione:
// guardia sul vuoto su `q=*` · `q` di soli spazi · D49 (`?q=` con studio) ·
// e le tre di D50 (oltre 64 · confine 65 · gli asterischi contano).
// Il confine opposto è piantato da prove che sull'abbozzo MUOIONO:
// «q di ESATTAMENTE 64 caratteri passa intero» e «D50 — 40 «%» passano»
// (quest'ultima con `expect(mockFrom).toHaveBeenCalled()`). Senza quelle due
// gemelle, le sei sopra sarebbero una lista di modi per non fare niente.
//
// 🛑 E NON SI SCRIVE QUANTE NE RESTANO. La stesura precedente dichiarava la
// caccia alle prove vuote «chiusa alla terza istanza»: rieseguendo la stessa
// misura, la ri-revisione ne ha trovata una **quarta** (`:525`). Una
// dichiarazione di completezza sbagliata sulla proprietà che si sta
// correggendo è peggio del difetto, perché chiude la caccia. Si lascia il
// metodo e lo si rilancia.

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
    // 🛑 IL `toHaveLength` NON È UN DI PIÙ: senza, questa prova passa a vuoto.
    // Un `for` su un array vuoto non ha corpo, quindi contro un GET del tutto
    // inerte che risponde `{ pazienti: [] }` l'asserzione sulle chiavi non
    // viene mai eseguita e la prova resta VERDE. La gemella «SENZA q» il
    // conteggio ce l'aveva; questa l'aveva perso.
    expect(pazienti).toHaveLength(2)
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
    // 🛑 PRIMA SI ASSERISCE CHE CI SIANO DELLE RIGHE, e non è pedanteria:
    // `{"pazienti":[]}` non contiene nessuno dei tre valori qui sotto, quindi
    // contro un GET inerte questa prova passerebbe a vuoto — proprio quella
    // scritta per garantire che un dato Art. 9 non esca. Le tre `not.toContain`
    // valgono SOLO se le due righe finte, che quei dati li portano tutti, sono
    // davvero passate per la rotta.
    expect(JSON.parse(testo).pazienti).toHaveLength(2)
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
  it('la select è ESATTAMENTE la proiezione stretta, e su ENTRAMBI i percorsi', async () => {
    // 🔴 QUESTA PROVA ERA UNA LISTA NERA, E NON DIFENDEVA NIENTE.
    // Asseriva `not.toContain(<sei nomi di colonna>)`: una `select('*')` non
    // contiene nessuno di quei sei nomi. Misurato il 29/07 — sostituendo la
    // proiezione con `.select('*, nome_cognome, lavori(data_ingresso)')` (la
    // forma realistica di deriva: chi aggiunge `*` senza toccare l'innesto),
    // `npx vitest run tests/unit/api-pazienti-get-ricerca.test.ts
    // tests/unit/escape-postgrest.test.ts` restava a **55 su 55 VERDI**,
    // mentre la rotta chiedeva al database OGNI colonna di `pazienti`
    // (`codice_fiscale`, `note`, `data_nascita`, `sesso`) per fino a 500 righe
    // sul percorso senza `q`.
    // 🔑 E B2 restava verde A RAGIONE, non per un difetto suo: B2 misura ciò
    // che arriva al BROWSER (le quattro chiavi), e quello non cambia. La
    // perdita è di BANDA e di uscita dal DATABASE — un'altra proprietà, e
    // quindi un'altra prova, questa. Le due restano distinte; il difetto era
    // che la seconda era scritta come lista nera invece che come UGUAGLIANZA.
    // 🛑 L'uguaglianza è l'unica forma che non lascia spazio a una colonna in
    // più: un nuovo nome nella `select` accende questa riga da solo, senza che
    // nessuno debba ricordarsi di aggiungerlo a un elenco.
    // 🛑 E si asserisce su ENTRAMBI i percorsi: D46 vuole la proiezione
    // stretta SEMPRE, mai condizionale, e una sola chiamata non vedrebbe una
    // proiezione tornata a dipendere da `q`.
    const PROIEZIONE = 'id, codice_paziente, nome_cognome, lavori(data_ingresso)'
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}`))
    expect(argSelect()).toBe(PROIEZIONE)
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=bagheria`))
    expect(argSelect()).toBe(PROIEZIONE)
  })

  // ⚠️ Le tre prove qui sotto sono sottoinsiemi dell'uguaglianza appena
  // scritta e NON la sostituiscono: restano perché ciascuna porta il nome
  // della proprietà che difende (l'ingresso di `derivaAlias`, la forma
  // dell'innesto, il controllo negativo su `!inner`), e un rosso col nome
  // giusto vale più di un rosso su una stringa lunga. La prima porta in più la
  // metà che l'uguaglianza NON può vedere: che `nome_cognome`, entrato dalla
  // `select`, non esca dalla risposta.
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

  it('D49 — `?q=` VUOTO ma CON lo studio → 200 { pazienti: [] }, non l’elenco', async () => {
    // 🔑 D49 ha il suo caso LETTERALE e non si accontenta della copertura per
    // equivalenza della prova qui sopra: «soli spazi» e «stringa vuota» sono
    // due ingressi diversi, e il caso di D49 è quello che il pannello produce
    // davvero — la casella di ricerca SVUOTATA con lo studio già scelto.
    // 🛑 L'alternativa che D49 scarta non è «niente»: è restituire le prime
    // dieci schede dello studio per un termine che non ha cercato nulla, cioè
    // trasformare una casella vuota in un elenco.
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=`))
    expect(res.status).toBe(200)
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
    // 🔧 RETTIFICA DI RECORD — il messaggio del commit `515633ae` dichiara una
    // prova che non è quella eseguita, e la rettifica sta QUI perché è qui che
    // un lettore la incontra (la storia non si riscrive: nessun rebase su un
    // commit sepolto).
    //   Quel messaggio dice: «togliendo a `pgrestQuote` l'escape dell'apice
    //   doppio, la VECCHIA asserzione restava VERDE, la nuova diventa rossa».
    //   ❌ FALSO, e misurato il 29/07 rieseguendo la prova sul file di
    //   `6096e953` con quella mutazione addosso: la vecchia prova andava
    //   ROSSA, perché la sua metà `toContain('\\"')` la mutazione la VEDEVA.
    //   ✅ Vacua era l'ALTRA metà — il `not.toContain('laboratorio_id.eq.lab-2,')` —
    //   e non per un caso di stringhe: asseriva una proprietà FALSA COME
    //   PRINCIPIO, visto che quel testo DEVE viaggiare intero dentro il valore
    //   quotato (nessuno dei due escape tocca virgole, punti o lettere).
    //   🔑 La correzione resta giusta e questa versione è strettamente più
    //   forte — il `toBe` sul predicato intero vede tutto ciò che vedeva il
    //   `toContain` e in più la forma esatta: sotto la stessa mutazione va
    //   rossa anche lei (verificato). Cambia solo il RECORD: un buco
    //   dichiarato si chiude, una certezza sbagliata no, perché nessuno la
    //   riapre.
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

  it('q di ESATTAMENTE 64 caratteri: passa intero, e la barra di escape non è tagliata a metà', async () => {
    // Il tetto è `> 64`: 64 esatti PASSANO, ed è il lato del confine che
    // questa prova pianta (l'altro lato è la guardia di D50, qui sotto).
    // 63 «a» + un backslash = 64 caratteri digitati. Escapato: 63 «a» + DUE
    // backslash = 65 caratteri — cioè un termine che, se il tetto si misurasse
    // DOPO l'escape, sparirebbe dietro la guardia pur essendo legittimo.
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

  it('D50 — q oltre 64 caratteri → 200 { pazienti: [] }, e il database non si tocca: NON si tronca', async () => {
    // 🛑 Questa prova asseriva il TRONCAMENTO («ciò che eccede non entra nel
    // pattern»), cioè il comportamento che D50 ha rovesciato: tagliare un
    // termine di 67 caratteri a 64 lo fa combaciare DI PIÙ di quanto l'utente
    // abbia chiesto, e restituisce suggerimenti per un testo che non ha
    // scritto. Con i metacaratteri spenti, un termine così non combacia con
    // niente: la risposta onesta è «nessun risultato», con la stessa forma
    // della guardia sul vuoto.
    const q = 'a'.repeat(64) + 'ZZZ'
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent(q)}`))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ pazienti: [] })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('D50 — il confine è 65: un carattere oltre il tetto e la guardia scatta', async () => {
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${'a'.repeat(65)}`))
    expect(await res.json()).toEqual({ pazienti: [] })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('D50 — il tetto si misura sul DIGITATO, non sul termine escapato: 40 «%» passano', async () => {
    // 🛑 LA PROVA CHE DISCRIMINA le due letture possibili del tetto, e senza la
    // quale l'ordine fra misura ed escape è scritto nel codice ma non provato.
    // 40 percenti sono 40 caratteri digitati e 80 dopo `ilikeLiterale`: se il
    // tetto si misurasse dopo l'escape, questa ricerca legittima riceverebbe
    // «nessun risultato» — cioè D50 chiuderebbe il buco che esiste per
    // chiudere, aprendone lo stesso dall'altro lato.
    // Atteso derivato A MANO: ogni `%` → `\%` (ilikeLiterale) → cornice →
    // ogni `\` raddoppiato da `pgrestQuote` → `\\%` per quaranta volte.
    await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent('%'.repeat(40))}`))
    expect(mockFrom).toHaveBeenCalled()
    expect(argOr()).toContain(`codice_paziente.ilike."%${String.raw`\\%`.repeat(40)}%"`)
  })

  it('D50 — gli asterischi CONTANO nel tetto: 40 lettere + 30 asterischi non arrivano al database', async () => {
    // ⚠️ SCELTA DICHIARATA, non un effetto collaterale: dopo la rimozione
    // degli `*` questo termine tornerebbe a 40 caratteri e combacerebbe con
    // qualcosa. Per saperlo, però, la rotta dovrebbe rifare in casa ciò che fa
    // `ilikeLiterale`, e due copie della stessa regola divergono. Si conta
    // quindi ciò che l'utente ha digitato, asterischi compresi.
    const q = 'a'.repeat(40) + '*'.repeat(30)
    const res = await GET(richiesta(`?cliente_id=${CLIENTE_ID}&q=${encodeURIComponent(q)}`))
    expect(await res.json()).toEqual({ pazienti: [] })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('D50 — un termine lungo SENZA cliente_id resta un 400: la portata viene prima del tetto', async () => {
    // 🔑 Il tetto non entra nella scelta del ramo, che resta su `q !== null`:
    // se la guardia di D50 rispondesse prima, un `q` di 70 caratteri senza
    // studio uscirebbe con un 200 vuoto e il vincolo di portata di D46 si
    // aggirerebbe allungando il termine.
    const res = await GET(richiesta(`?q=${'a'.repeat(70)}`))
    expect(res.status).toBe(400)
    expect((await res.json()).motivo).toBe('studio_mancante')
    expect(mockFrom).not.toHaveBeenCalled()
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

  it('SENZA q e senza cliente_id → 200 CON le righe: il percorso legacy non cambia (fuori mandato, RATE-1)', async () => {
    const res = await GET(richiesta())
    expect(res.status).toBe(200)
    // 🛑 QUARTA istanza della classe «passa a vuoto», trovata dalla
    // ri-revisione rieseguendo la misura con l'abbozzo inerte. Il commento a
    // `:531` dichiarava la caccia chiusa alla TERZA, e quella dichiarazione è
    // il difetto peggiore dei due: un `200` da solo è ciò che restituisce
    // ANCHE una rotta che non fa niente, quindi questa prova — l'unica che
    // presidia il percorso storico di RATE-1 — restava verde contro l'abbozzo
    // e non diceva nulla su `mockFrom`.
    // 🔑 La regola che ne esce: una dichiarazione di completezza sbagliata
    // sulla proprietà stessa che si sta correggendo è peggio del difetto,
    // perché chiude la caccia. Non si scrive «chiusa alla terza»: si scrive
    // il metodo, e lo si rilancia.
    expect((await res.json()).pazienti).toHaveLength(2)
    expect(mockFrom).toHaveBeenCalled()
  })

  it('dal corpo del 400 non esce NESSUN nome di colonna (G9)', async () => {
    const res = await GET(richiesta('?q=bagheria'))
    // 🛑 Un'altra istanza della stessa classe, trovata con l'abbozzo inerte.
    // ⚠️ Qui c'era scritto «TERZA ISTANZA … (il rilievo ne nominava due)»:
    // una dichiarazione di completezza, ed era SBAGLIATA — rieseguendo la
    // stessa misura la ri-revisione ne ha trovata una quarta (`:525`). Il
    // conteggio è tolto apposta: si scrive il metodo, non «quante ne restano».
    // Senza questa riga la
    // prova è una lista nera su un corpo che potrebbe essere qualunque cosa —
    // `{"pazienti":[]}` non contiene nessuno dei cinque nomi, quindi contro un
    // GET inerte passava a vuoto. Prima si asserisce CHE CORPO si sta
    // guardando, poi cosa non contiene.
    expect(res.status).toBe(400)
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
