// tests/unit/avvisi-portale.test.ts
//
// Task 8 dell'ondata «l'avviso al dentista» — la LOGICA di
// `src/lib/avvisi/portale.ts`: la sezione «Avvisi dal laboratorio» nel
// portale del dentista (⚖️ D346 + eredità ⚖️ D354).
//
// 🔑 PERCHÉ QUESTA LOGICA NON VIVE IN `page.tsx`, E NON È UNA PREFERENZA DI
//    STILE. `src/app/portale/[token]/page.tsx` è un componente server
//    asincrono, e nessuna prova unitaria lo rende: è la stessa lezione già
//    pagata dal Task 6 su `lavori/[id]/page.tsx` (v. `avvisi/queries.ts:176`,
//    «una mutazione al suo interno non diventa mai rossa»). Ogni riga con
//    posta in gioco normativa — l'unione dei campi (D354), il vecchio valore
//    che non deve MAI comparire (D336), quali id ricevono la ricevuta di
//    lettura — sta qui, dove una prova la esercita davvero.
//
// 🛑 LA DOMANDA CHE OGNI PROVA QUI DEVE SUPERARE: «se cambio l'implementazione
//    in un modo sbagliato, questa diventa rossa?» — stesso idioma di
//    `avvisi-queries.test.ts`.

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  raggruppaPerLavoro,
  fraseAvviso,
  lavoriPerLeCard,
  costruisciCardAvviso,
  segnaAvvisiVisti,
  type CardAvviso,
  type LavoroConAvviso,
} from '@/lib/avvisi/portale'
import type { AvvisoRiga } from '@/lib/avvisi/queries'

const LAB = '11111111-1111-1111-1111-111111111111'
const CLIENTE = '44444444-4444-4444-4444-444444444444'
const LAVORO_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const LAVORO_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function riga(over: Partial<AvvisoRiga> = {}): AvvisoRiga {
  return {
    id: 'avv-1',
    lavoro_id: LAVORO_A,
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

// ═══ raggruppaPerLavoro — UNA card per lavoro, unione dei campi (⚖️ D354) ═══
describe('raggruppaPerLavoro', () => {
  it('nessun avviso → nessun gruppo', () => {
    expect(raggruppaPerLavoro([])).toEqual([])
  })

  it('avvisi di DUE lavori diversi → DUE gruppi', () => {
    const righe = [riga({ id: 'a1', lavoro_id: LAVORO_A }), riga({ id: 'a2', lavoro_id: LAVORO_B })]
    const gruppi = raggruppaPerLavoro(righe)
    expect(gruppi).toHaveLength(2)
    expect(gruppi.map((g) => g.lavoroId).sort()).toEqual([LAVORO_A, LAVORO_B].sort())
  })

  it('due avvisi sullo STESSO lavoro → UN gruppo, con l\'UNIONE dei campi_corretti', () => {
    const righe = [
      riga({ id: 'a1', lavoro_id: LAVORO_A, campi_corretti: ['descrizione'] }),
      riga({ id: 'a2', lavoro_id: LAVORO_A, campi_corretti: ['denti_coinvolti'] }),
    ]
    const gruppi = raggruppaPerLavoro(righe)
    expect(gruppi).toHaveLength(1)
    expect(gruppi[0].campiCorretti.sort()).toEqual(['denti_coinvolti', 'descrizione'])
  })

  it('lo stesso campo corretto in due avvisi diversi NON si duplica nell\'unione (senza doppioni)', () => {
    const righe = [
      riga({ id: 'a1', lavoro_id: LAVORO_A, campi_corretti: ['descrizione'] }),
      riga({ id: 'a2', lavoro_id: LAVORO_A, campi_corretti: ['descrizione', 'denti_coinvolti'] }),
    ]
    const gruppi = raggruppaPerLavoro(righe)
    expect(gruppi[0].campiCorretti).toEqual(['descrizione', 'denti_coinvolti'])
  })

  it('la data del gruppo è quella dell\'avviso PIÙ RECENTE, indipendentemente dall\'ordine di input', () => {
    const righe = [
      riga({ id: 'a1', lavoro_id: LAVORO_A, created_at: '2026-08-01T10:00:00.000Z' }),
      riga({ id: 'a2', lavoro_id: LAVORO_A, created_at: '2026-08-09T08:00:00.000Z' }),
      riga({ id: 'a3', lavoro_id: LAVORO_A, created_at: '2026-08-05T10:00:00.000Z' }),
    ]
    expect(raggruppaPerLavoro(righe)[0].dataPiuRecente).toBe('2026-08-09T08:00:00.000Z')
  })

  it('avvisoIds accumula TUTTI gli id del lavoro — servono a scrivere il visto su ognuno', () => {
    const righe = [riga({ id: 'a1', lavoro_id: LAVORO_A }), riga({ id: 'a2', lavoro_id: LAVORO_A })]
    expect(raggruppaPerLavoro(righe)[0].avvisoIds.sort()).toEqual(['a1', 'a2'])
  })

  it('l\'ordine dei gruppi segue il primo incontro nell\'input (coerente con archivioCliente, dal più recente)', () => {
    const righe = [riga({ id: 'a1', lavoro_id: LAVORO_B }), riga({ id: 'a2', lavoro_id: LAVORO_A })]
    expect(raggruppaPerLavoro(righe).map((g) => g.lavoroId)).toEqual([LAVORO_B, LAVORO_A])
  })
})

// ═══ fraseAvviso — la frase delle voci, SOLO nel portale (⚖️ D334) ═══
describe('fraseAvviso', () => {
  it('nessun campo → frase generica, senza due punti', () => {
    expect(fraseAvviso([])).toBe('La dichiarazione è stata rifatta.')
  })

  it('un campo solo', () => {
    expect(fraseAvviso(['descrizione'])).toBe('La dichiarazione è stata rifatta: la descrizione.')
  })

  it('due campi — uniti da "e", non da virgola', () => {
    expect(fraseAvviso(['denti_coinvolti', 'prescrizione_caratteristiche'])).toBe(
      'La dichiarazione è stata rifatta: i denti indicati e le caratteristiche prescritte.'
    )
  })

  it('tre campi — virgola fra i primi, "e" prima dell\'ultimo', () => {
    expect(fraseAvviso(['paziente_id', 'denti_coinvolti', 'descrizione'])).toBe(
      'La dichiarazione è stata rifatta: il paziente, i denti indicati e la descrizione.'
    )
  })

  it('un campo non più previsto ricade sul ripiego — non scompare, di sponda a D336: mai il valore, sempre il fatto', () => {
    expect(fraseAvviso(['numero_prescrizione'])).toBe('La dichiarazione è stata rifatta: una voce del documento.')
  })
})

// ═══ costruisciCardAvviso — la card ⟺ lavoro risolto; il chip ⟺ DdC viva E lavoro consegnato ═══
describe('costruisciCardAvviso', () => {
  const GRUPPO_A: CardAvviso = {
    lavoroId: LAVORO_A,
    avvisoIds: ['a1', 'a2'],
    campiCorretti: ['descrizione'],
    dataPiuRecente: '2026-08-09T10:00:00.000Z',
  }
  const GRUPPO_B: CardAvviso = {
    lavoroId: LAVORO_B,
    avvisoIds: ['b1'],
    campiCorretti: ['denti_coinvolti'],
    dataPiuRecente: '2026-08-02T10:00:00.000Z',
  }
  const LAVORO_INFO_A: LavoroConAvviso = {
    lavoroId: LAVORO_A,
    numeroLavoro: '2026/0042',
    pazienteNomeSnapshot: 'ROSSI MARIO',
    descrizione: 'Corona',
    stato: 'consegnato',
    ddcStoragePathPdf: 'lab/ddc-a.pdf',
  }

  it('un gruppo SENZA lavoro risolto (difensivo) non produce una card, e i suoi id NON finiscono fra quelli da segnare', () => {
    const cards = costruisciCardAvviso([GRUPPO_A, GRUPPO_B], [LAVORO_INFO_A], { token: 'tok' })
    expect(cards).toHaveLength(1)
    expect(cards.flatMap((c) => c.avvisoIds)).toEqual(['a1', 'a2'])
  })

  it('il paziente si mostra minimizzato come nel resto del portale (ROSSI MARIO → R. MARIO)', () => {
    const cards = costruisciCardAvviso([GRUPPO_A], [LAVORO_INFO_A], { token: 'tok' })
    expect(cards[0].pazienteMostrato).toBe('R. MARIO')
  })

  it('senza lo snapshot del paziente, il fallback è la descrizione — come fa già LavoroCard oggi', () => {
    const senzaPaziente: LavoroConAvviso = { ...LAVORO_INFO_A, pazienteNomeSnapshot: null, descrizione: 'Corona ceramica' }
    const cards = costruisciCardAvviso([GRUPPO_A], [senzaPaziente], { token: 'tok' })
    expect(cards[0].pazienteMostrato).toBe('Corona ceramica')
  })

  it('DdC viva E lavoro "consegnato" → il chip porta l\'URL della rotta di download esistente', () => {
    const cards = costruisciCardAvviso([GRUPPO_A], [LAVORO_INFO_A], { token: 'tok123' })
    expect(cards[0].ddcUrl).toBe(`/api/portale/tok123/lavori/${LAVORO_A}/ddc`)
  })

  it('nessuna DdC viva → niente chip, ma la card resta (D354: nessun filtro di stato sull\'avviso)', () => {
    const senzaDdc: LavoroConAvviso = { ...LAVORO_INFO_A, ddcStoragePathPdf: null }
    const cards = costruisciCardAvviso([GRUPPO_A], [senzaDdc], { token: 'tok' })
    expect(cards).toHaveLength(1)
    expect(cards[0].ddcUrl).toBeNull()
  })

  it('DdC viva MA lavoro non più "consegnato" (es. riaperto) → niente chip: la rotta di download lo rifiuterebbe comunque', () => {
    const riaperto: LavoroConAvviso = { ...LAVORO_INFO_A, stato: 'pronto' }
    const cards = costruisciCardAvviso([GRUPPO_A], [riaperto], { token: 'tok' })
    expect(cards).toHaveLength(1)
    expect(cards[0].ddcUrl).toBeNull()
  })

  it('la frase e il numero del lavoro arrivano dal gruppo/lavoro corrispondenti', () => {
    const cards = costruisciCardAvviso([GRUPPO_A], [LAVORO_INFO_A], { token: 'tok' })
    expect(cards[0].numeroLavoro).toBe('2026/0042')
    expect(cards[0].frase).toBe('La dichiarazione è stata rifatta: la descrizione.')
    expect(cards[0].dataPiuRecente).toBe('2026-08-09T10:00:00.000Z')
  })
})

// ═══ lavoriPerLeCard — i lavori con avviso: due campi per la card + la DdC viva ═══
describe('lavoriPerLeCard', () => {
  it('lavoroIds vuoto → [] SENZA interrogare il banco', async () => {
    const from = vi.fn()
    const svc = { from }
    const risultato = await lavoriPerLeCard(svc as never, { lavoroIds: [], clienteId: CLIENTE, laboratorioId: LAB })
    expect(risultato).toEqual([])
    expect(from).not.toHaveBeenCalled()
  })

  function catenaConRighe(righe: Array<Record<string, unknown>>, guasto = false) {
    const spia: Array<[string, unknown]> = []
    const catena = {
      eq(c: string, v: unknown) {
        spia.push([`eq:${c}`, v])
        return catena
      },
      in(c: string, v: unknown) {
        spia.push([`in:${c}`, v])
        return catena
      },
      is(c: string, v: unknown) {
        spia.push([`is:${c}`, v])
        return catena
      },
      neq(c: string, v: unknown) {
        spia.push([`neq:${c}`, v])
        return catena
      },
      then(risolvi: (v: unknown) => unknown, rifiuta?: (e: unknown) => unknown) {
        const esito = guasto ? { data: null, error: { message: 'connessione caduta' } } : { data: righe, error: null }
        return Promise.resolve(esito).then(risolvi, rifiuta)
      },
    }
    const svc = { from: () => ({ select: () => catena }) }
    return { svc, spia }
  }

  it('applica TUTTI i filtri di isolamento e normalizza l\'embed ddc quando arriva come OGGETTO', async () => {
    const { svc, spia } = catenaConRighe([
      {
        id: LAVORO_A,
        numero_lavoro: '2026/0042',
        paziente_nome_snapshot: 'ROSSI MARIO',
        descrizione: 'Corona',
        stato: 'consegnato',
        ddc: { storage_path_pdf: 'lab/x.pdf' },
      },
    ])
    const risultato = await lavoriPerLeCard(svc as never, { lavoroIds: [LAVORO_A], clienteId: CLIENTE, laboratorioId: LAB })
    expect(risultato).toEqual([
      {
        lavoroId: LAVORO_A,
        numeroLavoro: '2026/0042',
        pazienteNomeSnapshot: 'ROSSI MARIO',
        descrizione: 'Corona',
        stato: 'consegnato',
        ddcStoragePathPdf: 'lab/x.pdf',
      },
    ])
    expect(spia).toContainEqual(['in:id', [LAVORO_A]])
    expect(spia).toContainEqual(['eq:cliente_id', CLIENTE])
    expect(spia).toContainEqual(['eq:laboratorio_id', LAB])
    expect(spia).toContainEqual(['is:deleted_at', null])
    expect(spia).toContainEqual(['neq:ddc.stato', 'annullata'])
  })

  it('embed ddc come ARRAY (PostgREST può inferirlo così) si normalizza allo stesso modo', async () => {
    const { svc } = catenaConRighe([
      {
        id: LAVORO_A,
        numero_lavoro: '2026/0042',
        paziente_nome_snapshot: null,
        descrizione: 'Corona',
        stato: 'consegnato',
        ddc: [{ storage_path_pdf: 'lab/y.pdf' }],
      },
    ])
    const risultato = await lavoriPerLeCard(svc as never, { lavoroIds: [LAVORO_A], clienteId: CLIENTE, laboratorioId: LAB })
    expect(risultato[0].ddcStoragePathPdf).toBe('lab/y.pdf')
  })

  it('embed ddc assente (array vuoto o null) → ddcStoragePathPdf null', async () => {
    const { svc } = catenaConRighe([
      { id: LAVORO_A, numero_lavoro: '2026/0042', paziente_nome_snapshot: null, descrizione: 'Corona', stato: 'pronto', ddc: [] },
    ])
    const risultato = await lavoriPerLeCard(svc as never, { lavoroIds: [LAVORO_A], clienteId: CLIENTE, laboratorioId: LAB })
    expect(risultato[0].ddcStoragePathPdf).toBeNull()
  })

  it('un guasto di lettura torna [] — non fa cadere la pagina', async () => {
    const { svc } = catenaConRighe([], true)
    const risultato = await lavoriPerLeCard(svc as never, { lavoroIds: [LAVORO_A], clienteId: CLIENTE, laboratorioId: LAB })
    expect(risultato).toEqual([])
  })
})

// ═══ segnaAvvisiVisti — la ricevuta di lettura via RPC, MAI un UPDATE diretto ═══
describe('segnaAvvisiVisti', () => {
  it('ids vuoto → true SENZA chiamare la RPC', async () => {
    const rpc = vi.fn()
    const svc = { rpc }
    const esito = await segnaAvvisiVisti(svc as never, [], LAB)
    expect(esito).toBe(true)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('chiama avvisi_segna_visti PER NOME DI ARGOMENTO — PostgREST non è posizionale', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { esito: 'ok', aggiornati: 2 }, error: null })
    const svc = { rpc }
    const esito = await segnaAvvisiVisti(svc as never, ['a1', 'a2'], LAB)
    expect(esito).toBe(true)
    expect(rpc).toHaveBeenCalledWith('avvisi_segna_visti', { p_ids: ['a1', 'a2'], p_laboratorio_id: LAB })
  })

  it('un guasto della RPC torna false e non lancia', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const svc = { rpc }
    const esito = await segnaAvvisiVisti(svc as never, ['a1'], LAB)
    expect(esito).toBe(false)
  })
})
