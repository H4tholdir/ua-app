// Task 5 (spec redesign §2.5, punto 13) — GET /api/cassette/lavori-liberi: i lavori vivi del
// lab SENZA cassetta, per l'azione «Metti un lavoro» dello sheet della cassetta libera
// (CassettaSheet). Stessa verità di `getParete`/`deriveParete` (Task 3): «senza cassetta» =
// nessuna riga viva (`liberato_at IS NULL`) in `cassette_lavori`. Mock builder riusato da
// `tests/unit/parco.test.ts` / `tests/unit/helpers/supabase-chain-mock.ts` (stessa forma della
// query-chain `.from().select().eq().is()...`).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

import { GET } from '@/app/api/cassette/lavori-liberi/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const lavoro = (id: string, over: Partial<{
  numero_lavoro: string
  stato: string
  data_consegna_prevista: string | null
  descrizione: string | null
  tipo_dispositivo: string | null
  clienti: { studio_nome: string | null; nome: string | null; cognome: string | null } | null
  pazienti: { codice_paziente: string | null; nome_cognome: string | null } | null
}> = {}) => ({
  id,
  numero_lavoro: over.numero_lavoro ?? '144',
  stato: over.stato ?? 'in_lavorazione',
  // `in` (non `??`): un override esplicito `data_consegna_prevista: null` deve restare `null`
  // (caso "senza data di consegna"), NON ricadere sul default — `??` tratterebbe `null` come
  // assente e nasconderebbe il caso che i test qui sotto vogliono esercitare.
  data_consegna_prevista: 'data_consegna_prevista' in over ? over.data_consegna_prevista ?? null : '2026-08-01',
  // G8 (FIX-I) — additivi al contratto: default non-null così i test PRE-esistenti (che non li
  // conoscono) restano su un valore realistico, non un `undefined` mai esercitato dal codice reale.
  descrizione: 'descrizione' in over ? over.descrizione ?? null : 'Corona',
  tipo_dispositivo: 'tipo_dispositivo' in over ? over.tipo_dispositivo ?? null : 'protesi_fissa',
  clienti: over.clienti ?? { studio_nome: 'Studio Bruno', nome: null, cognome: null },
  pazienti: over.pazienti ?? null,
})

/** Ritorna anche le due chain-mock create, per poter asserire (sul chiamante) CHE lo scoping
 *  tenant (`.eq('laboratorio_id', labId)`) e il filtro stati siano stati invocati con gli
 *  argomenti esatti attesi — non solo che la route risponda con i lavori giusti. Stesso
 *  principio del commento in cima a `supabase-chain-mock.ts`: rispondere «giusto» con un mock
 *  che ignora gli argomenti non proverebbe che la query È scoped al lab — la riga più
 *  critica di questa route (tenant isolation). */
function mockQueries(lavoriRows: unknown[], viveRows: unknown[], errori: { lavori?: unknown; vive?: unknown } = {}) {
  const chainVive = createChain({ data: viveRows, error: errori.vive ?? null })
  const chainLavori = createChain({ data: lavoriRows, error: errori.lavori ?? null })
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'cassette_lavori') return chainVive
    if (tabella === 'lavori') return chainLavori
    throw new Error(`tabella inattesa nel mock: ${tabella}`)
  })
  return { chainVive, chainLavori }
}

describe('GET /api/cassette/lavori-liberi (spec redesign §2.5, punto 13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })
  afterEach(() => vi.restoreAllMocks())

  it('ritorna i lavori vivi del lab SENZA riga viva in cassette_lavori, ordinati per urgenza (consegna più vicina prima)', async () => {
    mockQueries(
      [
        lavoro('l1', { numero_lavoro: '144', data_consegna_prevista: '2026-08-10' }),
        lavoro('l2', { numero_lavoro: '145', data_consegna_prevista: '2026-08-01' }),
      ],
      [{ lavoro_id: 'l2' }], // l2 ha già cassetta
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const { lavori } = await res.json()
    expect(lavori.map((l: { id: string }) => l.id)).toEqual(['l1'])
  })

  it('proietta esattamente il contratto {id, numero, dentista, pazienteAlias, urgenza, tipoDispositivo, descrizione}', async () => {
    mockQueries(
      [lavoro('l1', {
        numero_lavoro: '151',
        descrizione: 'Corona',
        tipo_dispositivo: 'protesi_fissa',
        clienti: { studio_nome: 'Studio Bruno', nome: null, cognome: null },
        pazienti: { codice_paziente: 'PZ-9', nome_cognome: 'ROSSI MARIO' },
      })],
      [],
    )
    const res = await GET()
    const { lavori } = await res.json()
    expect(lavori).toEqual([
      {
        id: 'l1', numero: '151', dentista: 'Studio Bruno', pazienteAlias: 'ROSSI MARIO', urgenza: expect.any(Number),
        tipoDispositivo: 'protesi_fissa', descrizione: 'Corona',
      },
    ])
  })

  // G8 (FIX-I) — additivo: un lavoro senza tipo/descrizione (dati storici incompleti) non deve
  // crashare né degradare a stringhe vuote inventate — `null` verbatim, come la colonna DB.
  it('tipoDispositivo/descrizione assenti (colonna null in DB) → null verbatim, mai stringa vuota inventata', async () => {
    mockQueries(
      [lavoro('l1', { numero_lavoro: '160', descrizione: null, tipo_dispositivo: null })],
      [],
    )
    const res = await GET()
    const { lavori } = await res.json()
    expect(lavori[0].tipoDispositivo).toBeNull()
    expect(lavori[0].descrizione).toBeNull()
  })

  it('due lavori liberi con date di consegna diverse → ordinati con la consegna più vicina in testa (urgenza decrescente)', async () => {
    mockQueries(
      [
        lavoro('l-lontano', { numero_lavoro: '200', data_consegna_prevista: '2026-12-01' }),
        lavoro('l-vicino', { numero_lavoro: '201', data_consegna_prevista: '2026-07-25' }),
      ],
      [],
    )
    const res = await GET()
    const { lavori } = await res.json()
    expect(lavori.map((l: { id: string }) => l.id)).toEqual(['l-vicino', 'l-lontano'])
    expect(lavori[0].urgenza).toBeGreaterThan(lavori[1].urgenza)
  })

  it('lavoro senza data di consegna finisce in fondo alla lista', async () => {
    mockQueries(
      [
        lavoro('l-senza-data', { numero_lavoro: '210', data_consegna_prevista: null }),
        lavoro('l-con-data', { numero_lavoro: '211', data_consegna_prevista: '2026-08-01' }),
      ],
      [],
    )
    const res = await GET()
    const { lavori } = await res.json()
    expect(lavori.map((l: { id: string }) => l.id)).toEqual(['l-con-data', 'l-senza-data'])
  })

  it('entrambe le query sono scoped al lab del context (isolamento tenant) e filtrano righe/stati vivi', async () => {
    const { chainVive, chainLavori } = mockQueries([lavoro('l1')], [])
    await GET()
    expect(chainVive.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
    expect(chainVive.calls).toContainEqual({ method: 'is', args: ['liberato_at', null] })
    expect(chainLavori.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
    expect(chainLavori.calls).toContainEqual({ method: 'is', args: ['deleted_at', null] })
    // Contratto stati chiusi: STESSO Set esportato da `parco-shared.ts` (`consegnato`,
    // `annullato`), sintassi letterale PostgREST con valori tra virgolette — stessa forma di
    // `pile-home.ts`/`dashboard/queries.ts` (`'("consegnato","annullato")'`).
    expect(chainLavori.calls).toContainEqual({ method: 'not', args: ['stato', 'in', '("consegnato","annullato")'] })
  })

  it('401 senza contesto lab', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('403 se il contesto non ha laboratorio', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('403 laboratorio in blacklist (assertLabOperativo)', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('errore sulla query lavori → 500 {errore: lettura_fallita} (fail-CLOSED, non degradato)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQueries([], [], { lavori: { message: 'query lavori abortita' } })
    const res = await GET()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ errore: 'lettura_fallita' })
  })

  it('errore sulla query cassette_lavori → 500 {errore: lettura_fallita} (fail-CLOSED)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockQueries([lavoro('l1')], [], { vive: { message: 'query cassette_lavori abortita' } })
    const res = await GET()
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ errore: 'lettura_fallita' })
  })
})
