// ═══════════════════════════════════════════════════════════════════════════
// P13 — LE ROTTE CHE PRODUCONO UN DOCUMENTO SI METTONO D'ACCORDO SU CHI HA
//       SBAGLIATO, E SMETTONO DI RACCONTARE I FATTI LORO A CHI SCARICA
//
// I DUE DIFETTI, che stanno sulla STESSA RIGA e quindi si toccano una volta sola.
//
// ① LO STATO DICE LA COSA SBAGLIATA. `400` significa «hai sbagliato TU», `500`
//    significa «ho sbagliato IO». Quattro rotte su sette prendevano i guasti
//    della generazione — il database che non risponde, un modello che esplode —
//    e li raccontavano come colpa di chi ha premuto il tasto.
//    `provato:` prima di questa correzione: nomina-prrc **400** · etichetta
//    **400** · ifu **400** · ricevuta-consegna **400**, contro il **500** di
//    scheda-fabbricazione, cedolino e DPA.
//
// ② IL MESSAGGIO INTERNO USCIVA. `{ error: e.message }` va dritto nel corpo
//    della risposta: il testo di un guasto interno arriva a chi sta davanti allo
//    schermo. È **P11 visto da un'altra strada** — non passa da
//    `generaProgressivo`, ma il risultato è lo stesso.
//
// 🔑 IL MODELLO NON È STATO INVENTATO: era già in casa. `scheda-fabbricazione`
//    fa **500 + testo fisso**, che è esattamente la coppia giusta. Le altre
//    somigliano a lei.
//
// 🛑 IL DPA NON È QUI, ed è una scelta: il suo `e.message` ha una ragione
//    scritta e verificata nel file (lì arrivano solo testi fissi, chiusi a monte
//    in `generate-dpa.ts`, e il client dirama su `status` e `codice`, mai su
//    `error`). Riaprirla senza il suo panel sarebbe disfare una decisione presa.
//
// ⚠️ LA PROVA CHE VALE È LA SECONDA: che il messaggio interno NON esca. Un test
//    che guarda solo il numero 500 passerebbe anche lasciando in piedi il
//    difetto peggiore dei due.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  ctxFresh: vi.fn(),
  ctxTimings: vi.fn(),
  from: vi.fn(),
  nominaPrrc: vi.fn(),
  etichetta: vi.fn(),
  ifu: vi.fn(),
  ricevuta: vi.fn(),
  cedolino: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: h.ctxFresh,
  getLabContextWithTimings: h.ctxTimings,
}))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: h.from }) }))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/pdf/generate-nomina-prrc', () => ({ generateNominaPrrc: h.nominaPrrc }))
vi.mock('@/lib/pdf/generate-etichetta', () => ({ generateEtichettaBuffer: h.etichetta }))
vi.mock('@/lib/pdf/generate-ifu', () => ({ generateIFU: h.ifu }))
vi.mock('@/lib/pdf/generate-ricevuta-consegna', () => ({ generateRicevutaConsegna: h.ricevuta }))
vi.mock('@/lib/pdf/generate-cedolino-tecnico', () => ({ generateCedolinoTecnico: h.cedolino }))

import { GET as getNominaPrrc } from '../../src/app/api/impostazioni/nomina-prrc/route'
import { GET as getEtichetta } from '../../src/app/api/lavori/[id]/etichetta/route'
import { GET as getIfu } from '../../src/app/api/lavori/[id]/ifu/route'
import { GET as getRicevuta } from '../../src/app/api/lavori/[id]/ricevuta-consegna/route'
import { GET as getCedolino } from '../../src/app/api/tecnici/[id]/cedolino/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab di prova' },
}

// Il testo che NON deve mai uscire: è la forma tipica di un guasto interno —
// nome di tabella, di colonna, di funzione. Se compare nel corpo, il difetto ② è
// ancora lì.
const SEGRETO = 'insert into "public"."progressivi_anno" (laboratorio_id, anno) — colonna "x" inesistente'

function rigaTrovata(dati: unknown) {
  const catena: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'order', 'limit', 'gte', 'lte']) catena[m] = () => catena
  catena.single = async () => ({ data: dati, error: null })
  catena.maybeSingle = async () => ({ data: dati, error: null })
  return catena
}

beforeEach(() => {
  vi.clearAllMocks()
  h.ctxFresh.mockResolvedValue(CONTEXT)
  h.ctxTimings.mockResolvedValue({ context: CONTEXT, timings: { authMs: 1, dbMs: 2 } })
  h.from.mockImplementation(() =>
    rigaTrovata({ id: 'x-1', numero_lavoro: 'L-001', nome: 'Anna', cognome: 'Verdi' }),
  )
  // ogni generatore esplode con un guasto INTERNO, non con un errore dell'utente
  for (const g of [h.nominaPrrc, h.etichetta, h.ifu, h.ricevuta, h.cedolino]) {
    g.mockRejectedValue(new Error(SEGRETO))
  }
})

/** Le cinque rotte, con il modo di chiamarle (le firme non sono uguali). */
const ROTTE = [
  { nome: 'nomina-prrc', chiama: () => getNominaPrrc() },
  {
    nome: 'etichetta',
    chiama: () => getEtichetta(new Request('http://x/api') as never, { params: Promise.resolve({ id: 'lav-1' }) }),
  },
  {
    nome: 'ifu',
    chiama: () => getIfu(new Request('http://x/api') as never, { params: Promise.resolve({ id: 'lav-1' }) }),
  },
  {
    nome: 'ricevuta-consegna',
    chiama: () => getRicevuta(new Request('http://x/api') as never, { params: Promise.resolve({ id: 'lav-1' }) }),
  },
  {
    nome: 'cedolino',
    chiama: () => getCedolino(new Request('http://x/api?mese=2026-08') as never, { params: Promise.resolve({ id: 'tec-1' }) }),
  },
] as const

describe('P13 — quando la generazione di un documento fallisce, ha sbagliato UÀ', () => {
  for (const r of ROTTE) {
    it(`${r.nome}: risponde 500, non 400 — il guasto è del servizio, non di chi ha premuto`, async () => {
      const res = await r.chiama()
      expect(res.status).toBe(500)
    })
  }
})

describe('P13 — e il fatto interno NON esce da nessuna delle cinque', () => {
  for (const r of ROTTE) {
    it(`${r.nome}: il corpo non contiene il testo del guasto interno`, async () => {
      const res = await r.chiama()
      const corpo = await res.text()
      expect(corpo).not.toContain('progressivi_anno')
      expect(corpo).not.toContain('insert into')
      expect(corpo).not.toContain(SEGRETO)
    })

    it(`${r.nome}: al suo posto c'è una frase, non il vuoto`, async () => {
      // Un corpo svuotato «per sicurezza» non va bene: chi ripara deve leggere
      // che cosa è successo, e chi scarica deve capire che non è colpa sua.
      const res = await r.chiama()
      const corpo = (await res.json()) as { error?: string }
      expect(typeof corpo.error).toBe('string')
      expect((corpo.error ?? '').length).toBeGreaterThan(10)
    })
  }
})
