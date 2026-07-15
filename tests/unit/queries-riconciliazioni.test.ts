// tests/unit/queries-riconciliazioni.test.ts
// Task 14: fetchPendenzeRiconciliazione — query-layer della pagina
// /fatture/riconciliazioni (Task 16). Aggrega 5 gruppi di pendenze in una
// sola chiamata: claim orfani, SMTP stagnanti, storni con TD04 rifiutato,
// saldi negativi (per cliente), eventi SdI parcheggiati.
import { describe, it, expect } from 'vitest'
import { fetchPendenzeRiconciliazione } from '@/lib/fattura/ricevute/queries-riconciliazioni'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

function createFakeSupabase(data: {
  fatture?: Row[]
  fatture_sdi_eventi?: Row[]
  credito_clienti_movimenti?: Row[]
  errors?: Partial<Record<'fatture' | 'fatture_sdi_eventi' | 'credito_clienti_movimenti', string>>
}) {
  const fromCalls: string[] = []

  const fake = {
    from(table: string) {
      fromCalls.push(table)
      let rows: Row[] =
        table === 'fatture' ? [...(data.fatture ?? [])] :
        table === 'fatture_sdi_eventi' ? [...(data.fatture_sdi_eventi ?? [])] :
        table === 'credito_clienti_movimenti' ? [...(data.credito_clienti_movimenti ?? [])] :
        []

      const errMsg = data.errors?.[table as 'fatture']
      const builder = {
        select() { return builder },
        eq(column: string, value: unknown) {
          rows = rows.filter((r) => r[column] === value)
          return builder
        },
        is(column: string, value: unknown) {
          rows = rows.filter((r) => (r[column] ?? null) === value)
          return builder
        },
        not(column: string, operator: string, value: unknown) {
          if (operator === 'is') {
            rows = rows.filter((r) => (r[column] ?? null) !== value)
          }
          return builder
        },
        lt(column: string, value: string) {
          rows = rows.filter((r) => r[column] != null && r[column] < value)
          return builder
        },
        or(filterStr: string) {
          const clauses = filterStr.split(',').map((c) => {
            const [field, op, value] = c.split('.')
            return { field, op, value }
          })
          rows = rows.filter((r) =>
            clauses.some(({ field, op, value }) => {
              const v = r[field] ?? null
              if (op === 'is') return value === 'null' ? v === null : v === value
              if (op === 'eq') return v === value
              return false
            })
          )
          return builder
        },
        then(resolve: (v: { data: unknown; error: { message: string } | null }) => void) {
          if (errMsg) {
            resolve({ data: null, error: { message: errMsg } })
          } else {
            resolve({ data: rows, error: null })
          }
        },
      }
      return builder
    },
  }

  return { supabase: fake as unknown as import('@supabase/supabase-js').SupabaseClient, fromCalls }
}

const ORA = Date.now()
const GIORNO_MS = 24 * 60 * 60 * 1000
const OTTO_GIORNI_FA = new Date(ORA - 8 * GIORNO_MS).toISOString()
const UN_GIORNO_FA = new Date(ORA - 1 * GIORNO_MS).toISOString()

describe('fetchPendenzeRiconciliazione', () => {
  describe('claimOrfani', () => {
    it('fattura generata con smtp_inviata_at valorizzato → inclusa', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '1/2026', stato_sdi: 'generata', smtp_inviata_at: UN_GIORNO_FA, laboratorio_id: 'lab-1' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.claimOrfani).toEqual([{ id: 'f1', numero: '1/2026', smtp_inviata_at: UN_GIORNO_FA }])
    })

    it('fattura generata SENZA smtp_inviata_at → esclusa', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '1/2026', stato_sdi: 'generata', smtp_inviata_at: null, laboratorio_id: 'lab-1' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.claimOrfani).toEqual([])
    })

    it('fattura smtp_inviata (non generata) con smtp_inviata_at → esclusa dai claim orfani', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '1/2026', stato_sdi: 'smtp_inviata', smtp_inviata_at: UN_GIORNO_FA, laboratorio_id: 'lab-1' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.claimOrfani).toEqual([])
    })
  })

  describe('smtpStagnanti', () => {
    it('smtp_inviata da oltre 7 giorni → inclusa', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '2/2026', stato_sdi: 'smtp_inviata', smtp_inviata_at: OTTO_GIORNI_FA, laboratorio_id: 'lab-1' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.smtpStagnanti).toEqual([{ id: 'f1', numero: '2/2026', smtp_inviata_at: OTTO_GIORNI_FA }])
    })

    it('smtp_inviata da meno di 7 giorni → esclusa', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '2/2026', stato_sdi: 'smtp_inviata', smtp_inviata_at: UN_GIORNO_FA, laboratorio_id: 'lab-1' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.smtpStagnanti).toEqual([])
    })
  })

  describe('stornateConTd04Rifiutato', () => {
    it('fattura stornata con TD04 collegato rifiutato → inclusa', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-10T10:00:00.000Z' },
          { id: 'td04-1', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([{ id: 'orig-1', numero: '3/2026', td04_numero: '4/2026' }])
    })

    it('fattura stornata ma TD04 collegato NON rifiutato → esclusa', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-10T10:00:00.000Z' },
          { id: 'td04-1', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'generata', fattura_collegata_id: 'orig-1' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([])
    })

    it('fattura stornata senza alcun TD04 collegato → esclusa', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-10T10:00:00.000Z' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([])
    })

    it('fattura NON stornata → esclusa anche se esiste un TD04 rifiutato collegato ad altra fattura', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: null },
          { id: 'td04-1', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([])
    })
  })

  describe('saldiNegativi — formula calcolaCreditoDisponibile aggregata per cliente', () => {
    const CLIENTE_1 = { id: 'cli-1', nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' }
    const CLIENTE_2 = { id: 'cli-2', nome: 'Luca', cognome: 'Bianchi', studio_nome: null }

    it('cliente con applicazioni > eccedenze → saldo negativo incluso', async () => {
      const { supabase } = createFakeSupabase({
        credito_clienti_movimenti: [
          { tipo: 'eccedenza', importo: 10, laboratorio_id: 'lab-1', cliente_id: 'cli-1', pagamenti: { stato: 'attivo' }, clienti: CLIENTE_1 },
          { tipo: 'applicazione', importo: 30, laboratorio_id: 'lab-1', cliente_id: 'cli-1', pagamenti: null, clienti: CLIENTE_1 },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.saldiNegativi).toEqual([{ cliente_id: 'cli-1', cliente_nome: 'Studio Rossi', saldo: -20 }])
    })

    it('cliente con saldo positivo → escluso', async () => {
      const { supabase } = createFakeSupabase({
        credito_clienti_movimenti: [
          { tipo: 'eccedenza', importo: 50, laboratorio_id: 'lab-1', cliente_id: 'cli-2', pagamenti: { stato: 'attivo' }, clienti: CLIENTE_2 },
          { tipo: 'applicazione', importo: 10, laboratorio_id: 'lab-1', cliente_id: 'cli-2', pagamenti: null, clienti: CLIENTE_2 },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.saldiNegativi).toEqual([])
    })

    it('anti-credito-fantasma: eccedenza con pagamento annullato NON conta → saldo resta negativo per le sole applicazioni', async () => {
      const { supabase } = createFakeSupabase({
        credito_clienti_movimenti: [
          // Eccedenza fantasma: il pagamento sorgente è stato annullato — non deve sommarsi.
          { tipo: 'eccedenza', importo: 100, laboratorio_id: 'lab-1', cliente_id: 'cli-1', pagamenti: { stato: 'annullato' }, clienti: CLIENTE_1 },
          { tipo: 'applicazione', importo: 15, laboratorio_id: 'lab-1', cliente_id: 'cli-1', pagamenti: null, clienti: CLIENTE_1 },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.saldiNegativi).toEqual([{ cliente_id: 'cli-1', cliente_nome: 'Studio Rossi', saldo: -15 }])
    })

    it('due clienti diversi, un solo saldo negativo → aggregazione corretta e nessun N+1 (una sola select)', async () => {
      const { supabase, fromCalls } = createFakeSupabase({
        credito_clienti_movimenti: [
          { tipo: 'eccedenza', importo: 10, laboratorio_id: 'lab-1', cliente_id: 'cli-1', pagamenti: { stato: 'attivo' }, clienti: CLIENTE_1 },
          { tipo: 'applicazione', importo: 30, laboratorio_id: 'lab-1', cliente_id: 'cli-1', pagamenti: null, clienti: CLIENTE_1 },
          { tipo: 'eccedenza', importo: 50, laboratorio_id: 'lab-1', cliente_id: 'cli-2', pagamenti: { stato: 'attivo' }, clienti: CLIENTE_2 },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.saldiNegativi).toEqual([{ cliente_id: 'cli-1', cliente_nome: 'Studio Rossi', saldo: -20 }])
      expect(fromCalls.filter((t) => t === 'credito_clienti_movimenti')).toHaveLength(1)
    })
  })

  describe('eventiParcheggiati', () => {
    it('fattura_id NULL e stato_a NULL → incluso', async () => {
      const { supabase } = createFakeSupabase({
        fatture_sdi_eventi: [{
          id: 'ev-1', laboratorio_id: 'lab-1', fattura_id: null, stato_a: null,
          nome_file_ricevuta: 'ricevuta.xml', esito_verifica_firma: null, esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toEqual([{
        id: 'ev-1', nome_file_ricevuta: 'ricevuta.xml', esito_verifica_firma: null, esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
      }])
    })

    it("esito_verifica_firma='fallita' e non completato (stato_a NULL) → incluso", async () => {
      const { supabase } = createFakeSupabase({
        fatture_sdi_eventi: [{
          id: 'ev-2', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: null,
          nome_file_ricevuta: 'rc.xml', esito_verifica_firma: 'fallita', esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toHaveLength(1)
      expect(r.eventiParcheggiati[0].id).toBe('ev-2')
    })

    it("esito_committente='EC02' e non completato (stato_a NULL) → incluso", async () => {
      const { supabase } = createFakeSupabase({
        fatture_sdi_eventi: [{
          id: 'ev-3', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: null,
          nome_file_ricevuta: 'ne.xml', esito_verifica_firma: 'valida', esito_committente: 'EC02', created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toHaveLength(1)
      expect(r.eventiParcheggiati[0].id).toBe('ev-3')
    })

    it('evento GIÀ completato (stato_a NOT NULL) → escluso anche se EC02/fallita/fattura_id null', async () => {
      const { supabase } = createFakeSupabase({
        fatture_sdi_eventi: [
          { id: 'ev-4', laboratorio_id: 'lab-1', fattura_id: null, stato_a: 'accettata', nome_file_ricevuta: 'a.xml', esito_verifica_firma: null, esito_committente: null, created_at: '2026-07-14T10:00:00.000Z' },
          { id: 'ev-5', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: 'rifiutata', nome_file_ricevuta: 'b.xml', esito_verifica_firma: 'fallita', esito_committente: null, created_at: '2026-07-14T10:00:00.000Z' },
          { id: 'ev-6', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: 'accettata', nome_file_ricevuta: 'c.xml', esito_verifica_firma: 'valida', esito_committente: 'EC02', created_at: '2026-07-14T10:00:00.000Z' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toEqual([])
    })

    it('evento risolto normalmente (fattura matchata, firma valida, non EC02) → escluso', async () => {
      const { supabase } = createFakeSupabase({
        fatture_sdi_eventi: [{
          id: 'ev-7', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: null,
          nome_file_ricevuta: 'ok.xml', esito_verifica_firma: 'valida', esito_committente: 'EC01', created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toEqual([])
    })
  })

  describe('fail-closed — errore di lettura', () => {
    it('errore su fatture (claim/smtp/storni) → throw', async () => {
      const { supabase } = createFakeSupabase({ errors: { fatture: 'boom fatture' } })
      await expect(fetchPendenzeRiconciliazione(supabase, 'lab-1')).rejects.toThrow(/boom fatture/)
    })

    it('errore su credito_clienti_movimenti → throw', async () => {
      const { supabase } = createFakeSupabase({ errors: { credito_clienti_movimenti: 'boom movimenti' } })
      await expect(fetchPendenzeRiconciliazione(supabase, 'lab-1')).rejects.toThrow(/boom movimenti/)
    })

    it('errore su fatture_sdi_eventi → throw', async () => {
      const { supabase } = createFakeSupabase({ errors: { fatture_sdi_eventi: 'boom eventi' } })
      await expect(fetchPendenzeRiconciliazione(supabase, 'lab-1')).rejects.toThrow(/boom eventi/)
    })
  })
})
