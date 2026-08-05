import { describe, it, expect } from 'vitest'
import { getDatiWizard, aggregaDatiWizard, type DatiWizard } from '@/lib/wizard/dati-wizard'
import { trovaTipo, labelTipo, CANONICI_DAY1 } from '@/lib/domain/tipi-lavoro'
import type { SupabaseClient } from '@supabase/supabase-js'

const OGGI = new Date('2026-07-12T10:00:00') // domenica 12 luglio — coerente con currentDate di sessione

type ChiamataMock = { method: string; args: unknown[] }
type QueryRegistrata = { tabella: string; chiamate: ChiamataMock[] }

/**
 * Mock router multi-tabella: ogni tabella ha una CODA di risultati
 * consumati in ordine di chiamata (FIFO, l'ultimo si ripete se le
 * chiamate superano le voci) — necessario perché `getDatiWizard` e
 * `fetchCampioniConsegna` (Task 6) interrogano ENTRAMBI `lavori`, con
 * filtri diversi, e un mock stateless-per-tabella li confonderebbe.
 *
 * Ogni query registra le chiamate ai filtri con i loro argomenti in
 * `registro` (una voce per `.from()`, in ordine di invocazione) — serve al
 * test di tenant-scoping per asserire che OGNI query riceva
 * `.eq('laboratorio_id', labId)`: una rimozione futura del filtro deve
 * far fallire il test, non solo cambiare i dati restituiti dal mock.
 */
function svcRouter(routing: Record<string, Array<{ data: unknown; error: unknown }>>): { svc: SupabaseClient; registro: QueryRegistrata[] } {
  const indici: Record<string, number> = {}
  const registro: QueryRegistrata[] = []
  const svc = {
    from: (tabella: string) => {
      const coda = routing[tabella]
      if (!coda) throw new Error(`tabella inattesa nel mock: ${tabella}`)
      const i = indici[tabella] ?? 0
      indici[tabella] = i + 1
      const risultato = coda[Math.min(i, coda.length - 1)]
      const chiamate: ChiamataMock[] = []
      registro.push({ tabella, chiamate })
      const builder: Record<string, unknown> = {}
      // ⚠️ `ilike` è nell'elenco per una ragione misurata, non per completezza:
      // senza di lui `.ilike()` esplode con «non è una funzione» PRIMA che la
      // query parta, e i quattro test fail-closed — che asseriscono
      // `rejects.toThrow()` SENZA argomento — restano VERDI su quel TypeError.
      // Misurato il 30/07 togliendolo: 2 rossi (composizione + tenant-scoping),
      // 15 verdi, di cui 4 verdi a vuoto. Un metodo che manca qui non si
      // manifesta come rosso: si manifesta come test che smette di provare.
      for (const m of ['select', 'eq', 'is', 'gte', 'not', 'like', 'ilike']) {
        builder[m] = (...args: unknown[]) => {
          chiamate.push({ method: m, args })
          return builder
        }
      }
      builder.then = (resolve: (v: unknown) => void) => resolve(risultato)
      return builder
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { svc, registro }
}

describe('aggregaDatiWizard — aggregazione pura (nessuna rete)', () => {
  const clienti = [
    { id: 'c1', nome: 'Marco', cognome: 'Esposito', studio_nome: 'Studio Esposito' },
    { id: 'c2', nome: 'Anna', cognome: 'Bianchi', studio_nome: null },
    { id: 'c3', nome: 'Luigi', cognome: 'Verdi', studio_nome: null },
  ]

  it('label dentista: studio_nome se presente, altrimenti "Dr. Cognome"', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    expect(r.dentisti.find((d) => d.id === 'c1')!.label).toBe('Studio Esposito')
    expect(r.dentisti.find((d) => d.id === 'c2')!.label).toBe('Dr. Bianchi')
  })

  // Task 10 (P37/D211) — il gate del mini-foglio «Chi ha prescritto?» in
  // WizardNuovoLavoro legge `studioNome`, PASSTHROUGH grezzo di `studio_nome`
  // (mai derivato da `label`, che collassa sulla stessa stringa ma non È la
  // fonte di verità).
  it('studioNome: passthrough grezzo di studio_nome (mai derivato da label)', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    expect(r.dentisti.find((d) => d.id === 'c1')!.studioNome).toBe('Studio Esposito')
    expect(r.dentisti.find((d) => d.id === 'c2')!.studioNome).toBeNull()
  })

  // Fix-review Task 10 (CRITICAL 1) — nome/cognome grezzi, necessari a
  // `WizardNuovoLavoro.caricaStudioEApri` per anteporre il cliente TOCCATO
  // come prima riga del mini-foglio «Chi ha prescritto?».
  it('nome/cognome: passthrough grezzo (necessari per anteporre il cliente toccato nel mini-foglio)', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    const c1 = r.dentisti.find((d) => d.id === 'c1')!
    expect(c1.nome).toBe('Marco')
    expect(c1.cognome).toBe('Esposito')
  })

  it('dentisti: TUTTI i clienti, anche con count30 zero', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    expect(r.dentisti).toHaveLength(3)
    expect(r.dentisti.every((d) => d.count30 === 0)).toBe(true)
  })

  it('count30: solo lavori con data_ingresso >= oggi-30gg (45gg fa escluso, 5gg fa incluso)', () => {
    const lavori = [
      { cliente_id: 'c1', descrizione: 'Corona zirconia', data_ingresso: '2026-07-07' }, // 5gg fa → dentro
      { cliente_id: 'c1', descrizione: 'Corona zirconia', data_ingresso: '2026-05-28' }, // 45gg fa → fuori
      { cliente_id: 'c2', descrizione: 'Riparazione', data_ingresso: '2026-07-01' }, // 11gg fa → dentro
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.dentisti.find((d) => d.id === 'c1')!.count30).toBe(1)
    expect(r.dentisti.find((d) => d.id === 'c2')!.count30).toBe(1)
    expect(r.dentisti.find((d) => d.id === 'c3')!.count30).toBe(0)
  })

  it('dentisti ordinati count30 desc poi label asc', () => {
    const lavori = [
      { cliente_id: 'c2', descrizione: 'x', data_ingresso: '2026-07-10' },
      { cliente_id: 'c2', descrizione: 'x', data_ingresso: '2026-07-09' },
      { cliente_id: 'c1', descrizione: 'x', data_ingresso: '2026-07-08' },
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    // c2 (count 2) primo, poi c1/c3 a pari conteggio (c1=1, c3=0) → c1 prima di c3 per count, non per label
    expect(r.dentisti.map((d) => d.id)).toEqual(['c2', 'c1', 'c3'])
  })

  it('dentisti a pari count30: tie-break su label asc', () => {
    const soloClienti = [
      { id: 'x1', nome: 'Zoe', cognome: 'Zeta', studio_nome: null }, // label 'Dr. Zeta'
      { id: 'x2', nome: 'Aldo', cognome: 'Alfa', studio_nome: null }, // label 'Dr. Alfa'
    ]
    const r = aggregaDatiWizard(soloClienti, [], [], OGGI)
    expect(r.dentisti.map((d) => d.label)).toEqual(['Dr. Alfa', 'Dr. Zeta'])
  })

  it('frequenzeTipi: conta i lavori 30gg la cui descrizione === labelTipo(t)', () => {
    const labelCorona = labelTipo(trovaTipo('corona_zirconia')!)
    const labelRiparazione = labelTipo(trovaTipo('riparazione')!)
    const lavori = [
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-10' },
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-09' },
      { cliente_id: 'c2', descrizione: labelRiparazione, data_ingresso: '2026-07-08' },
      { cliente_id: 'c2', descrizione: 'Descrizione a caso non tassonomica', data_ingresso: '2026-07-08' },
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.frequenzeTipi.corona_zirconia).toBe(2)
    expect(r.frequenzeTipi.riparazione).toBe(1)
    expect(r.frequenzeTipi.faccetta).toBe(0)
  })

  it('topTipi: 2 tipi con count>0 → completati con i primi 2 CANONICI_DAY1 non già presenti', () => {
    const labelCorona = labelTipo(trovaTipo('faccetta')!) // NON in CANONICI_DAY1
    const labelPonte = labelTipo(trovaTipo('ponte_zirconia')!) // NON in CANONICI_DAY1
    const lavori = [
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-10' },
      { cliente_id: 'c1', descrizione: labelCorona, data_ingresso: '2026-07-09' },
      { cliente_id: 'c2', descrizione: labelPonte, data_ingresso: '2026-07-08' },
    ]
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.topTipi).toEqual(['faccetta', 'ponte_zirconia', ...CANONICI_DAY1.slice(0, 2)])
  })

  it('topTipi: ≥4 tipi con count>0 → i 4 più frequenti, tie-break ordine canonico a pari conteggio', () => {
    // corona_zirconia e corona_disilicato precedono ponte_zirconia e faccetta
    // nell'ordine canonico di TIPI_LAVORO — tutti con lo stesso count (2), a
    // parità il tie-break deve rispettare quell'ordine.
    const tipi = ['corona_zirconia', 'corona_disilicato', 'ponte_zirconia', 'faccetta', 'intarsio'] as const
    const lavori = tipi.flatMap((id) => {
      const label = labelTipo(trovaTipo(id)!)
      return [
        { cliente_id: 'c1', descrizione: label, data_ingresso: '2026-07-10' },
        { cliente_id: 'c1', descrizione: label, data_ingresso: '2026-07-09' },
      ]
    })
    const r = aggregaDatiWizard(clienti, lavori, [], OGGI)
    expect(r.topTipi).toEqual(['corona_zirconia', 'corona_disilicato', 'ponte_zirconia', 'faccetta'])
  })

  it('prossimoPz: max numerico dei PZ-\\d+ + 1, pad 4 cifre — non-PZ ignorati', () => {
    const pazienti = [
      { codice_paziente: 'PZ-0435' },
      { codice_paziente: 'PZ-0021' },
      { codice_paziente: 'P-99' },
      { codice_paziente: 'ALTRO' },
    ]
    const r = aggregaDatiWizard(clienti, [], pazienti, OGGI)
    expect(r.prossimoPz).toBe('PZ-0436')
  })

  it('prossimoPz: lista vuota → PZ-0001', () => {
    const r = aggregaDatiWizard(clienti, [], [], OGGI)
    expect(r.prossimoPz).toBe('PZ-0001')
  })

  it('prossimoPz: codice_paziente null non rompe il match', () => {
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: null }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0001')
  })

  // ────────────────────────────────────────────────────────────────────────
  // Z3 — «il generatore guarda la stessa popolazione che l'indice arbitrerà».
  //
  // FORME D'INPUT censite (R-P4), ognuna col suo caso o col suo motivo:
  //   · minuscolo `pz-0043` .............. coperta, qui sotto (il difetto circolare)
  //   · maiuscole miste `Pz-0050` ........ coperta, qui sotto
  //   · spazi ai bordi ` PZ-0043 ` ....... coperta, qui sotto
  //   · whitespace non-spazio `PZ-0043\t`  coperta, qui sotto — e vedi la nota su btrim
  //   · stringa vuota `''` e soli spazi .. coperta, qui sotto
  //   · numero non paddato `PZ-43` ....... coperta, qui sotto — PINNING (verde già prima
  //                                        della correzione: nessuno l'aveva fissata)
  //   · `null` ........................... già coperta sopra («null non rompe il match»)
  //   · lista vuota ...................... già coperta sopra («lista vuota → PZ-0001»)
  //   · formato estraneo `P-99`/`ALTRO` .. già coperta sopra («non-PZ ignorati»)
  //   · cancellato / archiviato .......... NON copribile qui, e non per pigrizia:
  //       `RawPaziente` è `{ codice_paziente }` e basta — questa funzione non sa
  //       cosa sia `deleted_at`. Una fixture «archiviata» qui sarebbe una fixture
  //       con un nome, non una prova. La prova sta nella FORMA DELLA QUERY, ed è
  //       nel describe di `getDatiWizard` qui sotto.
  // ────────────────────────────────────────────────────────────────────────

  it('prossimoPz: un codice MINUSCOLO conta — è il difetto circolare che Z3 chiude', () => {
    // Senza `/i` questo codice è invisibile al generatore: proporrebbe PZ-0001,
    // e un indice unico su `lower(btrim(...))` rifiuterebbe... PZ-0043 dopo. Il
    // punto non è il numero: è che il generatore non deve poter proporre un
    // codice che l'arbitro rifiuta.
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: 'pz-0043' }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0044')
  })

  it('prossimoPz: maiuscole miste `Pz-0050` contano come le altre', () => {
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: 'Pz-0050' }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0051')
  })

  it("prossimoPz: spazi ai bordi — ' PZ-0043 ' conta, perché a database collide", () => {
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: ' PZ-0043 ' }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0044')
  })

  it('prossimoPz: whitespace non-spazio (tab) conta — JS trim() è più largo di btrim()', () => {
    // `btrim()` di Postgres toglie SOLO lo spazio; `String.prototype.trim()`
    // toglie anche tab, a-capo e spazi unicode. La divergenza è voluta e va
    // nella direzione sicura: qui il generatore salta un numero che a database
    // sarebbe libero — cioè è PIÙ conservativo dell'indice, mai meno.
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: 'PZ-0043\t' }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0044')
  })

  it('prossimoPz: stringa vuota e stringa di soli spazi sono ignorate, non contate', () => {
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: '' }, { codice_paziente: '   ' }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0001')
  })

  it('prossimoPz: PINNING — `PZ-43` non paddato conta come 43 (già vero prima di Z3)', () => {
    const r = aggregaDatiWizard(clienti, [], [{ codice_paziente: 'PZ-43' }], OGGI)
    expect(r.prossimoPz).toBe('PZ-0044')
  })

  it('prossimoPz: il massimo si prende su TUTTA la popolazione, maiuscola o no', () => {
    const pazienti = [
      { codice_paziente: 'PZ-0010' },
      { codice_paziente: 'pz-0043' }, // il più alto, ed è minuscolo
      { codice_paziente: ' PZ-0020 ' },
      { codice_paziente: null },
      { codice_paziente: 'PAZ/2026/0999' }, // formato estraneo → ignorato
    ]
    const r = aggregaDatiWizard(clienti, [], pazienti, OGGI)
    expect(r.prossimoPz).toBe('PZ-0044')
  })
})

describe('getDatiWizard — wiring Supabase + fail-closed', () => {
  const clientiData = [{ id: 'c1', nome: 'Marco', cognome: 'Esposito', studio_nome: 'Studio Esposito' }]

  it('compone dentisti/frequenzeTipi/topTipi/prossimoPz/giorniPerTipo dalle query', async () => {
    const { svc } = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [
        { data: [{ cliente_id: 'c1', descrizione: 'Corona zirconia', data_ingresso: '2026-07-10' }], error: null }, // query wizard (30gg)
        { data: [], error: null }, // query interna a fetchCampioniConsegna (storico consegne)
      ],
      pazienti: [{ data: [{ codice_paziente: 'PZ-0010' }], error: null }],
    })
    const r: DatiWizard = await getDatiWizard(svc, 'lab-1', OGGI)
    expect(r.dentisti).toEqual([
      { id: 'c1', label: 'Studio Esposito', count30: 1, studioNome: 'Studio Esposito', nome: 'Marco', cognome: 'Esposito' },
    ])
    expect(r.frequenzeTipi.corona_zirconia).toBe(1)
    expect(r.prossimoPz).toBe('PZ-0011')
    expect(r.giorniPerTipo.corona_zirconia).toEqual({ giorni: 5, daStoria: false }) // nessuno storico → fallback tassonomia
  })

  it('fail-closed: errore sulla query clienti → throw', async () => {
    const { svc } = svcRouter({
      clienti: [{ data: null, error: { message: 'boom clienti' } }],
      lavori: [{ data: [], error: null }, { data: [], error: null }],
      pazienti: [{ data: [], error: null }],
    })
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow()
  })

  it('fail-closed: errore sulla query lavori → throw', async () => {
    const { svc } = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: null, error: { message: 'boom lavori' } }],
      pazienti: [{ data: [], error: null }],
    })
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow()
  })

  it('fail-closed: errore sulla query pazienti → throw', async () => {
    const { svc } = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: [], error: null }, { data: [], error: null }],
      pazienti: [{ data: null, error: { message: 'boom pazienti' } }],
    })
    // Messaggio asserito, non un throw qualsiasi: `rejects.toThrow()` nudo
    // accetta anche un TypeError del mock, e quel test resterebbe verde su una
    // query che non è mai partita (misurato — v. la nota su `ilike` a :37).
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow(/lettura pazienti/)
  })

  it('fail-closed: errore sulla query storico consegne (fetchCampioniConsegna) → throw', async () => {
    const { svc } = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: [], error: null }, { data: null, error: { message: 'boom storico' } }],
      pazienti: [{ data: [], error: null }],
    })
    await expect(getDatiWizard(svc, 'lab-1', OGGI)).rejects.toThrow()
  })

  it('tenant-scoping: TUTTE e 4 le query (clienti, lavori 30gg, pazienti, storico consegne) filtrano laboratorio_id = labId', async () => {
    const { svc, registro } = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: [], error: null }, { data: [], error: null }],
      pazienti: [{ data: [], error: null }],
    })
    await getDatiWizard(svc, 'lab-tenant-test', OGGI)

    // Esattamente 4 query: clienti + lavori (finestra 30gg) + pazienti +
    // lavori di nuovo (storico consegne dentro fetchCampioniConsegna).
    expect(registro.map((q) => q.tabella).sort()).toEqual(['clienti', 'lavori', 'lavori', 'pazienti'])

    // OGNI query deve portare lo scoping tenant: se un refactor futuro
    // rimuove il filtro da una qualsiasi delle 4, questo test fallisce.
    for (const q of registro) {
      expect(q.chiamate, `query su "${q.tabella}" senza .eq('laboratorio_id', labId)`).toContainEqual({
        method: 'eq',
        args: ['laboratorio_id', 'lab-tenant-test'],
      })
    }
  })

  // Le due prove di Z3 che NON sono verificabili dall'aggregazione pura: il
  // mock non filtra niente, quindi «il minuscolo viene letto» e «l'archiviato
  // viene letto» si provano sulla FORMA della query, non sui dati che torna.
  it('query pazienti: ilike su %PZ-% — nessun `.like` case-sensitive sopravvive', async () => {
    const { svc, registro } = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: [], error: null }, { data: [], error: null }],
      pazienti: [{ data: [], error: null }],
    })
    await getDatiWizard(svc, 'lab-1', OGGI)

    const q = registro.find((r) => r.tabella === 'pazienti')!
    // `%PZ-%` e non `PZ-%`: il pattern è valutato da Postgres sulla colonna
    // GREZZA, quindi ' PZ-0043 ' con un ancoraggio a sinistra non verrebbe mai
    // letto e nessun trim in JS potrebbe recuperarlo.
    expect(q.chiamate).toContainEqual({ method: 'ilike', args: ['codice_paziente', '%PZ-%'] })
    expect(q.chiamate.filter((c) => c.method === 'like')).toEqual([])
  })

  it("filtro deleted_at: presente su clienti e lavori, ASSENTE su pazienti", async () => {
    const { svc, registro } = svcRouter({
      clienti: [{ data: clientiData, error: null }],
      lavori: [{ data: [], error: null }, { data: [], error: null }],
      pazienti: [{ data: [], error: null }],
    })
    await getDatiWizard(svc, 'lab-1', OGGI)

    // Asserzione a doppio senso, di proposito: toglierlo dai pazienti è Z3,
    // ma lasciarlo su clienti e lavori è altrettanto vincolante — quelle due
    // query non c'entrano col codice paziente e non vanno allargate.
    for (const q of registro) {
      const haFiltro = q.chiamate.some(
        (c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null
      )
      expect(haFiltro, `query su "${q.tabella}": filtro deleted_at inatteso o mancante`).toBe(
        q.tabella !== 'pazienti'
      )
    }
  })
})
