import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

/**
 * D286 — «ogni orario dell'app è quello italiano di Roma» — propagata a
 * `GET /api/cassette/lavori-liberi`.
 *
 * 🛑 QUESTE PROVE NON PROVANO NIENTE SE GIRANO NEL FUSO DI ROMA. La rotta
 * chiedeva «che giorno è oggi?» al PROCESSO (`new Date()` + `getFullYear/
 * getMonth/getDate`, senza `UTC`), e il processo in produzione gira a UTC.
 * Sulla macchina di sviluppo, che è `Europe/Rome`, la domanda e la risposta
 * coincidono e il difetto è INVISIBILE. Per questo il fuso si forza a UTC in
 * `beforeAll` — stessa ragione, e stessa forma, di `tests/unit/istante-roma.test.ts`.
 *
 * ⚠️ E si RIMETTE com'era in `afterAll`: `tests/unit/striscia-trial.test.ts:51`
 * dipende esplicitamente dal fatto che la macchina di prova sia `Europe/Rome`.
 * Un file che sposta il fuso e non lo restituisce fa fallire i file che gli
 * capitano dopo nello stesso worker, con un rosso che sembra di qualcun altro.
 *
 * 🔑 IL DANNO VERO, e per questo le asserzioni guardano `urgenza` e non una data:
 * `CassettaSheet.tsx:487` accende il segno di urgenza con `l.urgenza > 0`, cioè
 * «consegna già scaduta». Fra le 00:00 e le 02:00 italiane il giorno del processo
 * è ancora quello PRIMA, quindi un lavoro scaduto ieri riceve `urgenza: 0` e
 * PERDE il segno di urgenza. Non è un numero storto in un JSON: è un lavoro in
 * ritardo che smette di sembrarlo.
 */

const FUSO_ORIGINALE = process.env.TZ

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

beforeAll(() => {
  process.env.TZ = 'UTC'
})
afterAll(() => {
  if (FUSO_ORIGINALE === undefined) delete process.env.TZ
  else process.env.TZ = FUSO_ORIGINALE
})

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

/**
 * 🔑 L'ISTANTE CHE FA MORDERE TUTTO IL FILE, ed è scelto, non capitato:
 * le 01:30 del 20 agosto a Roma. A UTC quello stesso istante è ancora il 19.
 * I due giorni civili DIVERGONO — è l'unica finestra in cui la differenza fra
 * «oggi a Roma» e «oggi per il processo» si vede.
 */
const NOTTE_ITALIANA = new Date('2026-08-19T23:30:00Z')
const OGGI_A_ROMA = '2026-08-20'
const IERI_A_ROMA = '2026-08-19' // …che per il processo a UTC è ancora «oggi»

const lavoro = (id: string, dataConsegna: string | null) => ({
  id,
  numero_lavoro: '144',
  stato: 'in_lavorazione',
  data_consegna_prevista: dataConsegna,
  descrizione: 'Corona',
  tipo_dispositivo: 'protesi_fissa',
  clienti: { studio_nome: 'Studio Bruno', nome: null, cognome: null },
  pazienti: null,
})

function mockQueries(lavoriRows: unknown[], viveRows: unknown[] = []) {
  const chainVive = createChain({ data: viveRows, error: null })
  const chainLavori = createChain({ data: lavoriRows, error: null })
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'cassette_lavori') return chainVive
    if (tabella === 'lavori') return chainLavori
    throw new Error(`tabella inattesa nel mock: ${tabella}`)
  })
}

async function urgenzaDi(dataConsegna: string | null): Promise<number> {
  mockQueries([lavoro('l1', dataConsegna)])
  const res = await GET()
  expect(res.status).toBe(200)
  const { lavori } = await res.json()
  return lavori[0].urgenza
}

describe('GET /api/cassette/lavori-liberi — «oggi» è il giorno civile di ROMA, non del processo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
    vi.useFakeTimers()
    vi.setSystemTime(NOTTE_ITALIANA)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('il banco è davvero straddle: fuso del processo UTC, e i due giorni civili DIVERGONO', () => {
    // Senza questa sonda le prove qui sotto potrebbero passare per il motivo
    // sbagliato — un istante che non attraversa la mezzanotte non distingue
    // niente. Qui si legge in chiaro che il processo dice 19 e Roma dice 20.
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')
    expect(new Date().toISOString().slice(0, 10)).toBe(IERI_A_ROMA)
    expect(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
    ).toBe(OGGI_A_ROMA)
  })

  it('🛑 IL DIFETTO CHE CHIUDE: un lavoro scaduto IERI ha urgenza 1, quindi resta urgente', async () => {
    // `CassettaSheet.tsx:487` → `urgente = l.urgenza > 0`. Col giorno del
    // processo veniva 0: il lavoro in ritardo perdeva il segno di urgenza.
    const urgenza = await urgenzaDi(IERI_A_ROMA)
    expect(urgenza).toBe(1)
    expect(urgenza).toBeGreaterThan(0)
  })

  it('un lavoro da consegnare OGGI ha urgenza 0 — non 1 (non è in ritardo) e non −1 (non è domani)', async () => {
    expect(await urgenzaDi(OGGI_A_ROMA)).toBe(0)
  })

  it('un lavoro da consegnare DOMANI ha urgenza −1', async () => {
    expect(await urgenzaDi('2026-08-21')).toBe(-1)
  })

  it('un lavoro senza data resta in fondo con la sentinella, non tocca il fuso', async () => {
    expect(await urgenzaDi(null)).toBe(-9999)
  })

  it('ORA SOLARE — la stessa notte a gennaio (scarto +1, non +2) si comporta uguale', async () => {
    // 🔑 La prova che l'offset è RISOLTO per la data e non cablato: le 00:30
    // del 15 gennaio a Roma sono le 23:30 UTC del 14. Se qualcuno scrivesse
    // «+2 ore» fisso, questa riga diventerebbe rossa e quella d'agosto no.
    vi.setSystemTime(new Date('2026-01-14T23:30:00Z'))
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-01-14')
    expect(await urgenzaDi('2026-01-14')).toBe(1) // ieri a Roma → in ritardo
    expect(await urgenzaDi('2026-01-15')).toBe(0) // oggi a Roma
  })

  it('IN PIENO GIORNO i due orologi coincidono: nessuna regressione sul caso normale', async () => {
    // La correzione non deve spostare nulla nelle 22 ore in cui il giorno
    // civile di Roma e quello del processo sono lo stesso.
    vi.setSystemTime(new Date('2026-08-20T10:00:00Z'))
    expect(await urgenzaDi('2026-08-19')).toBe(1)
    expect(await urgenzaDi('2026-08-20')).toBe(0)
    expect(await urgenzaDi('2026-08-25')).toBe(-5)
  })
})
