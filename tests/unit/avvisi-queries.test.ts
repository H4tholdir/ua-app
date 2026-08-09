// tests/unit/avvisi-queries.test.ts
//
// Task 6 dell'ondata «l'avviso al dentista» — LE DUE LETTURE della tabella
// `avvisi_dentista`. Qui si prova `src/lib/avvisi/queries.ts`; il CABLAGGIO
// sulla scheda sta in `tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx`.
//
// 🔴 LA FORMA DEBOLE È GIÀ STATA MISURATA IN QUESTA CASA, e riguarda esattamente
//    ciò che fa questo modulo. Dal ledger dell'ondata precedente: «*il finto
//    rispondeva per ordine di chiamata e inghiottiva i filtri → le prove
//    restavano verdi con le letture invertite*». Un finto che ignora i filtri e
//    restituisce le righe che gli hai dato **non può** provare che una riga di un
//    altro laboratorio non arrivi: gliela daresti tu.
//
// ✅ QUINDI IL FINTO QUI REGISTRA I FILTRI, E OGNI FILTRO HA LA SUA ASSERZIONE.
//    È l'idioma di `tests/unit/tinta-scheda.test.ts` («ogni occhio
//    dell'osservatore è asserito da almeno una prova»), con una correzione
//    misurata: là la spia tiene **l'ultimo** valore di `.eq()`, e qui i filtri
//    sono TRE — una spia a campo singolo resterebbe verde togliendone due.
//    Si registra la LISTA delle coppie, e si asserisce l'insieme intero.
//
// 🛑 LA DOMANDA CHE OGNI PROVA QUI DEVE SUPERARE: «se tolgo il filtro, questa
//    diventa rossa?». Misurato togliendo una riga per volta dal sorgente — v.
//    il conteggio nel resoconto del Task 6.
//
// 📌 Perché NON una prova d'integrazione: `avvisi_dentista` ha l'`INSERT`
//    REVOCATO a `service_role` (migration 20260809123206), quindi per il
//    percorso PostgREST — cioè quello che questo modulo usa davvero — non si può
//    creare una riga senza passare dalla RPC della riemissione, col suo corredo
//    di lavoro, evento e dichiarazione. Quel giro è il mandato del **Task 10**
//    («il giro completo sul banco vero»), e duplicarlo qui vorrebbe dire due
//    prove che si allontanano.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { avvisiDaComunicare, archivioCliente, avvisoPerLaScheda } from '@/lib/avvisi/queries'
import { STATI_AVVISO, STATI_CHIUSI } from '@/lib/avvisi/stati'

const LAB = '11111111-1111-1111-1111-111111111111'
const ALTRO_LAB = '22222222-2222-2222-2222-222222222222'
const LAVORO = '33333333-3333-3333-3333-333333333333'
const CLIENTE = '44444444-4444-4444-4444-444444444444'

type Spia = {
  consultato: number
  tabella: string | null
  colonne: string | null
  /** OGNI filtro applicato, nell'ordine: `['eq:laboratorio_id', '…']`. È una
   *  LISTA e non un campo per colonna, perché è la lista che si può contare. */
  filtri: Array<[string, unknown]>
  /** OGNI `.order()`: `['created_at', true]` = crescente. */
  ordini: Array<[string, boolean | undefined]>
}

function svcFinto(righe: Array<Record<string, unknown>>, guasto = false) {
  const spia: Spia = { consultato: 0, tabella: null, colonne: null, filtri: [], ordini: [] }

  // La catena è un oggetto solo, «thenable»: `.eq()/.in()/.order()` tornano se
  // stessi e l'`await` finale legge `then`. Così l'ordine delle chiamate non
  // vincola la prova (non è quello che si sta provando), ma NIENTE si perde:
  // ogni chiamata lascia la sua riga nella spia.
  const catena = {
    eq(colonna: string, valore: unknown) {
      spia.filtri.push([`eq:${colonna}`, valore])
      return catena
    },
    in(colonna: string, valore: unknown) {
      spia.filtri.push([`in:${colonna}`, valore])
      return catena
    },
    order(colonna: string, opzioni?: { ascending?: boolean }) {
      spia.ordini.push([colonna, opzioni?.ascending])
      return catena
    },
    then(risolvi: (v: unknown) => unknown, rifiuta?: (e: unknown) => unknown) {
      const esito = guasto
        ? { data: null, error: { message: 'connessione caduta' } }
        : { data: righe, error: null }
      return Promise.resolve(esito).then(risolvi, rifiuta)
    },
  }

  const svc = {
    from(tabella: string) {
      spia.consultato++
      spia.tabella = tabella
      return {
        select(colonne: string) {
          spia.colonne = colonne
          return catena
        },
      }
    },
  }

  return { svc: svc as never, spia }
}

/** Una riga come la restituisce il banco: nasce sempre `da_comunicare`, e i tre
 *  campi della chiusura sono nulli finché qualcuno non chiude (CHECK
 *  `avviso_comunicato_ha_autore_e_data`). */
function rigaAperta(over: Record<string, unknown> = {}) {
  return {
    id: 'avv-1',
    lavoro_id: LAVORO,
    cliente_id: CLIENTE,
    dichiarazione_id: 'ddc-1',
    stato: 'da_comunicare',
    campi_corretti: ['descrizione'],
    testo_inviato: null,
    comunicato_at: null,
    comunicato_da: null,
    visto_dal_dentista_at: null,
    created_at: '2026-08-09T10:00:00.000Z',
    ...over,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('avvisiDaComunicare — il promemoria aperto di QUEL lavoro', () => {
  it('interroga `avvisi_dentista` e applica TUTTI E TRE i filtri, nessuno escluso', async () => {
    const { svc, spia } = svcFinto([rigaAperta()])
    await avvisiDaComunicare(svc, { lavoroId: LAVORO, laboratorioId: LAB })

    expect(spia.consultato).toBe(1)
    expect(spia.tabella).toBe('avvisi_dentista')

    // 🛑 L'INSIEME INTERO, non «almeno uno». Con `toContainEqual` togliere un
    //    filtro dal sorgente lascerebbe verdi le altre due asserzioni.
    expect(spia.filtri).toEqual([
      ['eq:lavoro_id', LAVORO],
      ['eq:laboratorio_id', LAB],
      ['in:stato', ['da_comunicare']],
    ])
  })

  it('🛑 il filtro sul laboratorio c’è ANCHE se nessuno lo chiede: il client di servizio scavalca la RLS', async () => {
    // La politica del Task 1 (`laboratorio_id = public.current_lab_id()`) NON
    // protegge questa strada: `service_role` ha `rolbypassrls = true`. Su questa
    // lettura l'isolamento fra laboratori è QUESTA riga e nient'altro — la stessa
    // ragione per cui la rotta del Task 4 porta lo stesso filtro sull'UPDATE.
    const { svc, spia } = svcFinto([])
    await avvisiDaComunicare(svc, { lavoroId: LAVORO, laboratorioId: ALTRO_LAB })

    const perLaboratorio = spia.filtri.filter(([c]) => c === 'eq:laboratorio_id')
    expect(perLaboratorio).toHaveLength(1)
    expect(perLaboratorio[0][1]).toBe(ALTRO_LAB)
  })

  it('lo stato NON è una stringa scritta a mano: è derivato da `stati.ts`, e nessuno stato chiuso ci entra', async () => {
    // 🔑 È QUI che vive la prova «un avviso già chiuso non compare». Non si può
    //    provare dando al finto una riga chiusa: un finto che ignora i filtri
    //    (la forma debole del ledger) la restituirebbe comunque, e la prova
    //    direbbe il falso. Ciò che si prova è il FILTRO — che è la cosa che
    //    davvero esclude quella riga sul banco.
    const { svc, spia } = svcFinto([])
    await avvisiDaComunicare(svc, { lavoroId: LAVORO, laboratorioId: LAB })

    const [, statiChiesti] = spia.filtri.find(([c]) => c === 'in:stato') as [string, string[]]
    for (const chiuso of STATI_CHIUSI) {
      expect(statiChiesti).not.toContain(chiuso)
    }
    // E l'elenco chiesto è un sottoinsieme del vocabolario vero: uno stato
    // inventato qui sarebbe zero righe per sempre, in silenzio.
    for (const stato of statiChiesti) {
      expect(STATI_AVVISO as readonly string[]).toContain(stato)
    }
  })

  it('nessun avviso → nessuna riga, e non è un errore', async () => {
    const { svc } = svcFinto([])
    await expect(avvisiDaComunicare(svc, { lavoroId: LAVORO, laboratorioId: LAB })).resolves.toEqual([])
  })

  it('un avviso aperto torna con l’id da chiudere e le voci corrette', async () => {
    const { svc } = svcFinto([rigaAperta()])
    const esito = await avvisiDaComunicare(svc, { lavoroId: LAVORO, laboratorioId: LAB })

    expect(esito).toHaveLength(1)
    expect(esito[0].id).toBe('avv-1')
    expect(esito[0].cliente_id).toBe(CLIENTE)
    expect(esito[0].campi_corretti).toEqual(['descrizione'])
  })

  it('DUE riemissioni fanno DUE avvisi aperti: si chiedono in ordine di nascita, il più vecchio per primo', async () => {
    // 🔑 Il caso esiste davvero: `correggi_e_riemetti_atomica` fa un `INSERT`
    //    INCONDIZIONATO (migration 20260809133546:488), e nessun indice unico
    //    parziale impedisce due righe aperte sullo stesso lavoro.
    // ⚖️ L'ordine è CRESCENTE, e non è un gusto: i due avvisi portano
    //    `campi_corretti` DIVERSI e sono due rettifiche distinte ai sensi
    //    dell'Art. 19 GDPR. Si consuma prima l'obbligo nato prima.
    // 🛑 `id` come secondo criterio: due righe nate nello stesso microsecondo
    //    senza un secondo criterio escono in ordine indefinito, e la scheda
    //    mostrerebbe ora l'una ora l'altra.
    const { svc, spia } = svcFinto([
      rigaAperta({ id: 'avv-vecchio', created_at: '2026-08-09T10:00:00.000Z' }),
      rigaAperta({ id: 'avv-nuovo', created_at: '2026-08-09T18:00:00.000Z' }),
    ])
    const esito = await avvisiDaComunicare(svc, { lavoroId: LAVORO, laboratorioId: LAB })

    expect(spia.ordini).toEqual([
      ['created_at', true],
      ['id', true],
    ])
    // E la funzione non rimescola ciò che il banco ha già ordinato.
    expect(esito.map((a) => a.id)).toEqual(['avv-vecchio', 'avv-nuovo'])
  })

  it('se il banco non risponde la scheda NON muore — ma il promemoria che sparisce si DICE nei log', async () => {
    // La scelta è quella di `caricaTinteScheda` («un catalogo irraggiungibile non
    // porta giù la scheda»), con una differenza dichiarata: qui ciò che sparisce
    // è un obbligo di legge, non un'etichetta di colore. Quindi si torna vuoto —
    // la pagina si vede e il lavoro si consegna — ma il silenzio no.
    const spiaLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { svc } = svcFinto([], true)

    await expect(avvisiDaComunicare(svc, { lavoroId: LAVORO, laboratorioId: LAB })).resolves.toEqual([])
    expect(spiaLog).toHaveBeenCalled()
  })
})

describe('avvisoPerLaScheda — il cancello di ⚖️ D342 E la lettura, nella stessa funzione', () => {
  // 🔴 QUESTE PROVE HANNO PRESO IL POSTO DI UN TERNARIO CHE NESSUNA PROVA VEDEVA.
  //    Prima stava in `lavori/[id]/page.tsx`:
  //      `puoVedereAvviso(ruolo) ? avvisiDaComunicare(…) : Promise.resolve([])`
  //    `provato:` capovolgendolo (`!mostraIlPromemoria ? …`) **tutte e 68 le prove
  //    restavano verdi**, mentre a vedere il promemoria sarebbero rimasti solo
  //    `admin_rete` e `admin_sistema` — i due che D342 esclude. Quel file è un
  //    componente server asincrono che nessuna prova unitaria rende: una mutazione
  //    scritta lì dentro **non può** diventare rossa. Spostata la decisione qui,
  //    può — ed è l'unica ragione per cui queste righe esistono.
  //
  // 🔑 E SI GUARDA LA SPIA, NON SOLO IL VALORE DI RITORNO. «Torna `null`» da solo
  //    non distingue «non ha letto» da «ha letto e non c'era»: la differenza è
  //    tutta lì, perché il senso del cancello è che l'identificativo dell'avviso
  //    NON entri nemmeno nella pagina di chi non potrebbe chiuderlo. Si asserisce
  //    `spia.consultato`, cioè se il banco è stato interrogato.
  //
  // 🛑 I CINQUE NOMI SCRITTI A MANO, mai un ciclo su `RUOLI_CHIUSURA_AVVISO`:
  //    un ciclo sulla costante è tautologico (lezione di `api-avviso.test.ts:559`).

  const AMMESSI = ['titolare', 'tecnico', 'front_desk'] as const
  const ESCLUSI = ['admin_rete', 'admin_sistema'] as const

  for (const ruolo of AMMESSI) {
    it(`«${ruolo}» VEDE il promemoria: il banco è interrogato, e torna l’avviso aperto`, async () => {
      const { svc, spia } = svcFinto([rigaAperta()])
      const esito = await avvisoPerLaScheda({ svc, lavoroId: LAVORO, laboratorioId: LAB, ruolo })

      expect(spia.consultato, `${ruolo}: il banco doveva essere interrogato`).toBe(1)
      expect(esito?.id).toBe('avv-1')
    })
  }

  for (const ruolo of ESCLUSI) {
    it(`🛑 «${ruolo}» NON vede niente, e il banco non viene nemmeno interrogato`, async () => {
      const { svc, spia } = svcFinto([rigaAperta()])
      const esito = await avvisoPerLaScheda({ svc, lavoroId: LAVORO, laboratorioId: LAB, ruolo })

      // Il finto HA una riga aperta da restituire: se il cancello guardasse dal
      // verso sbagliato, `esito` sarebbe quella riga. È la mutazione che questa
      // prova esiste per prendere.
      expect(esito, `${ruolo} non deve vedere nessun avviso`).toBeNull()
      expect(spia.consultato, `${ruolo}: il banco non doveva essere interrogato`).toBe(0)
    })
  }

  it('🛑 FAIL-CLOSED: ruolo assente, nullo o sconosciuto → niente, e nessuna lettura', async () => {
    // `SchedaLavoroV3` riceve `ruolo?: string | null`, quindi i due casi sono
    // veri. La chiave `ruolo` è OBBLIGATORIA nel tipo: chi la dimentica non
    // compila — la chiusura è per costruzione, non per disciplina.
    for (const ruolo of [null, undefined, '', 'admin', 'front-desk']) {
      const { svc, spia } = svcFinto([rigaAperta()])
      const esito = await avvisoPerLaScheda({ svc, lavoroId: LAVORO, laboratorioId: LAB, ruolo })

      expect(esito, `«${String(ruolo)}» non deve vedere nessun avviso`).toBeNull()
      expect(spia.consultato, `«${String(ruolo)}»: nessuna lettura`).toBe(0)
    }
  })

  it('i filtri della lettura arrivano interi anche passando di qui', async () => {
    // L'involucro non deve perdere per strada l'isolamento fra laboratori: il
    // client di servizio scavalca la RLS, quindi la `.eq()` è tutto ciò che c'è.
    const { svc, spia } = svcFinto([rigaAperta()])
    await avvisoPerLaScheda({ svc, lavoroId: LAVORO, laboratorioId: ALTRO_LAB, ruolo: 'titolare' })

    expect(spia.filtri).toEqual([
      ['eq:lavoro_id', LAVORO],
      ['eq:laboratorio_id', ALTRO_LAB],
      ['in:stato', ['da_comunicare']],
    ])
  })

  it('nessun avviso aperto → `null`, e non è un guasto', async () => {
    const { svc, spia } = svcFinto([])
    const esito = await avvisoPerLaScheda({ svc, lavoroId: LAVORO, laboratorioId: LAB, ruolo: 'titolare' })

    expect(esito).toBeNull()
    // 🔑 E la differenza col ruolo escluso è QUI: il banco è stato interrogato.
    expect(spia.consultato).toBe(1)
  })

  it('DUE avvisi aperti → si mostra il PIÙ VECCHIO, uno solo', async () => {
    // ⚖️ I due avvisi portano `campi_corretti` diversi e sono due rettifiche
    // distinte ex Art. 19 GDPR: si consuma prima l'obbligo nato prima. Chiudendo
    // il primo la riga ricompare per il secondo — è la verità, non un difetto.
    // 🔑 Questa scelta stava in `page.tsx` (`avvisiAperti[0] ?? null`) e nessuna
    //    prova la guardava, per lo stesso motivo del ternario. Ora è qui.
    const { svc } = svcFinto([
      rigaAperta({ id: 'avv-vecchio', created_at: '2026-08-09T10:00:00.000Z' }),
      rigaAperta({ id: 'avv-nuovo', created_at: '2026-08-09T18:00:00.000Z' }),
    ])
    const esito = await avvisoPerLaScheda({ svc, lavoroId: LAVORO, laboratorioId: LAB, ruolo: 'titolare' })

    expect(esito?.id).toBe('avv-vecchio')
  })

  it('se il banco non risponde: `null` per la scheda, e il guasto scritto nei log', async () => {
    const spiaLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { svc } = svcFinto([], true)

    await expect(
      avvisoPerLaScheda({ svc, lavoroId: LAVORO, laboratorioId: LAB, ruolo: 'titolare' })
    ).resolves.toBeNull()
    expect(spiaLog).toHaveBeenCalled()
  })
})

describe('archivioCliente — tutte le comunicazioni di QUEL cliente (consumatore: Task 9)', () => {
  it('filtra sul cliente E sul laboratorio, e NON filtra lo stato', async () => {
    // 🛑 È un ARCHIVIO, non un allarme (piano, Task 9): le righe chiuse sono
    //    proprio quelle che servono — sono la PROVA ex Art. 5(2) GDPR che il
    //    dentista fu avvisato. Un filtro di stato qui cancellerebbe l'archivio.
    const { svc, spia } = svcFinto([rigaAperta()])
    await archivioCliente(svc, { clienteId: CLIENTE, laboratorioId: LAB })

    expect(spia.tabella).toBe('avvisi_dentista')
    expect(spia.filtri).toEqual([
      ['eq:cliente_id', CLIENTE],
      ['eq:laboratorio_id', LAB],
    ])
    expect(spia.filtri.some(([c]) => c === 'in:stato' || c === 'eq:stato')).toBe(false)
  })

  it('l’archivio si legge dal più recente, ed è l’ordine che l’indice serve', async () => {
    // `idx_avvisi_per_cliente (cliente_id, created_at DESC)` — migration
    // 20260809123206. L'ordine non è solo una preferenza di lettura: è quello
    // che l'indice sa dare senza ordinare a parte.
    const { svc, spia } = svcFinto([])
    await archivioCliente(svc, { clienteId: CLIENTE, laboratorioId: LAB })

    expect(spia.ordini).toEqual([
      ['created_at', false],
      ['id', false],
    ])
  })

  it('porta i campi con cui il Task 9 dirà quando · come · chi · se l’ha aperta', async () => {
    const { svc, spia } = svcFinto([
      rigaAperta({
        id: 'avv-chiuso',
        stato: 'comunicato_dall_app',
        testo_inviato: 'Ciao, la dichiarazione è stata rifatta',
        comunicato_at: '2026-08-09T12:00:00.000Z',
        comunicato_da: 'utente-1',
        visto_dal_dentista_at: '2026-08-09T13:00:00.000Z',
      }),
    ])
    const esito = await archivioCliente(svc, { clienteId: CLIENTE, laboratorioId: LAB })

    // Le quattro domande del piano hanno tutte la loro colonna CHIESTA: senza
    // questa asserzione una `select` accorciata passerebbe, e il Task 9
    // troverebbe `undefined` al posto di «chi».
    for (const colonna of ['created_at', 'stato', 'comunicato_at', 'comunicato_da', 'visto_dal_dentista_at']) {
      expect(spia.colonne).toContain(colonna)
    }
    expect(esito[0].stato).toBe('comunicato_dall_app')
    expect(esito[0].comunicato_da).toBe('utente-1')
    expect(esito[0].visto_dal_dentista_at).toBe('2026-08-09T13:00:00.000Z')
  })

  it('un cliente senza comunicazioni ha un archivio vuoto, non un guasto', async () => {
    const { svc } = svcFinto([])
    await expect(archivioCliente(svc, { clienteId: CLIENTE, laboratorioId: LAB })).resolves.toEqual([])
  })

  it('se il banco non risponde, l’archivio è vuoto e lo dice nei log', async () => {
    const spiaLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { svc } = svcFinto([], true)

    await expect(archivioCliente(svc, { clienteId: CLIENTE, laboratorioId: LAB })).resolves.toEqual([])
    expect(spiaLog).toHaveBeenCalled()
  })
})
