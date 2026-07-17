// tests/unit/queries-riconciliazioni.test.ts
// Task 14: fetchPendenzeRiconciliazione — query-layer della pagina
// /fatture/riconciliazioni (Task 16). Aggrega 5 gruppi di pendenze in una
// sola chiamata: claim orfani, SMTP stagnanti, storni con TD04 rifiutato,
// saldi negativi (per cliente), eventi SdI parcheggiati.
import { describe, it, expect } from 'vitest'
import { fetchPendenzeRiconciliazione } from '@/lib/fattura/ricevute/queries-riconciliazioni'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

// Embed helper (Task 12, R2d): simula gli embed PostgREST usati dal
// refactor self-join/LEFT — solo quanto serve a queries-riconciliazioni.ts.
// - Embed aliased con FK esplicita `alias:table!fkColumn(cols)` → to-many
//   (self-join fatture!fattura_collegata_id): array dei figli con
//   figlio[fkColumn] === genitore.id, filtrato SOLO dai filtri registrati
//   per quell'alias (eq/is con prefisso `alias.`) — semantica LEFT: i filtri
//   embed non eliminano la riga padre, riducono solo l'array annidato.
// - Embed "nudo" `table(cols)` → to-one (fatture su fatture_sdi_eventi via
//   fattura_id): oggetto o null, MAI filtrato (LEFT semplice).
const EMBED_FK: Record<string, string> = { fatture: 'fattura_id' }

interface EmbedSpec {
  alias: string
  table: string
  fkColumn: string
  toMany: boolean
}

function parseEmbeds(selectStr: string): EmbedSpec[] {
  const embeds: EmbedSpec[] = []
  const aliasedRe = /(\w+):(\w+)!(\w+)\(([^)]*)\)/g
  let m: RegExpExecArray | null
  while ((m = aliasedRe.exec(selectStr))) {
    embeds.push({ alias: m[1], table: m[2], fkColumn: m[3], toMany: true })
  }
  const stripped = selectStr.replace(aliasedRe, '')
  const bareRe = /(?:^|,)\s*(\w+)\(([^)]*)\)/g
  while ((m = bareRe.exec(stripped))) {
    const table = m[1]
    // Solo le tabelle con un join riconosciuto (EMBED_FK) sono calcolate come
    // embed: `pagamenti(stato)`/`clienti(...)` in fetchSaldiNegativi arrivano
    // GIÀ appiattite nelle fixture (non c'è una tabella 'pagamenti'/'clienti'
    // separata nel fake) — computarle qui le sovrascriverebbe con null.
    if (!(table in EMBED_FK)) continue
    embeds.push({ alias: table, table, fkColumn: EMBED_FK[table], toMany: false })
  }
  return embeds
}

function tableRows(data: {
  fatture?: Row[]
  fatture_sdi_eventi?: Row[]
  credito_clienti_movimenti?: Row[]
}, table: string): Row[] {
  if (table === 'fatture') return data.fatture ?? []
  if (table === 'fatture_sdi_eventi') return data.fatture_sdi_eventi ?? []
  if (table === 'credito_clienti_movimenti') return data.credito_clienti_movimenti ?? []
  return []
}

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
      let selectStr = ''
      const embedFilters: Record<string, Array<{ column: string; op: 'eq' | 'is'; value: unknown }>> = {}

      const builder = {
        select(str?: string) {
          selectStr = str ?? ''
          return builder
        },
        eq(column: string, value: unknown) {
          if (column.includes('.')) {
            const [alias, col] = column.split('.')
            embedFilters[alias] = embedFilters[alias] ?? []
            embedFilters[alias].push({ column: col, op: 'eq', value })
          } else {
            rows = rows.filter((r) => r[column] === value)
          }
          return builder
        },
        is(column: string, value: unknown) {
          if (column.includes('.')) {
            const [alias, col] = column.split('.')
            embedFilters[alias] = embedFilters[alias] ?? []
            embedFilters[alias].push({ column: col, op: 'is', value })
          } else {
            rows = rows.filter((r) => (r[column] ?? null) === value)
          }
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
        in(column: string, values: unknown[]) {
          rows = rows.filter((r) => values.includes(r[column]))
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
            return
          }
          const embeds = parseEmbeds(selectStr)
          if (embeds.length === 0) {
            resolve({ data: rows, error: null })
            return
          }
          const enriched = rows.map((row) => {
            const out: Row = { ...row }
            for (const embed of embeds) {
              if (embed.toMany) {
                const children = tableRows(data, embed.table).filter(
                  (c) => c[embed.fkColumn] === row.id
                )
                const filters = embedFilters[embed.alias] ?? []
                out[embed.alias] = children.filter((c) =>
                  filters.every((f) => {
                    if (f.op === 'is') return (c[f.column] ?? null) === f.value
                    return c[f.column] === f.value
                  })
                )
              } else {
                const fkValue = row[embed.fkColumn]
                out[embed.alias] =
                  fkValue == null
                    ? null
                    : tableRows(data, embed.table).find((c) => c.id === fkValue) ?? null
              }
            }
            return out
          })
          resolve({ data: enriched, error: null })
        },
      }
      return builder
    },
  }

  return { supabase: fake as unknown as import('@supabase/supabase-js').SupabaseClient, fromCalls }
}

const ORA = Date.now()
const GIORNO_MS = 24 * 60 * 60 * 1000
const ORA_MS = 60 * 60 * 1000
const OTTO_GIORNI_FA = new Date(ORA - 8 * GIORNO_MS).toISOString()
const UN_GIORNO_FA = new Date(ORA - 1 * GIORNO_MS).toISOString()
const ADESSO = new Date(ORA).toISOString()
const DUE_ORE_FA = new Date(ORA - 2 * ORA_MS).toISOString()

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

    // Finding 3 (review finale Task 17): claimInvioPec valorizza
    // smtp_inviata_at PRIMA di sendMail — durante l'invio reale (finestra di
    // secondi) la fattura NON deve apparire come claim orfano sbloccabile,
    // altrimenti rischio di doppio invio se il titolare sblocca in quella
    // finestra. Solo i claim più vecchi di 1h sono orfani reali.
    it('claim fresco (smtp_inviata_at = ora) → escluso, finestra d\'invio in corso', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '1/2026', stato_sdi: 'generata', smtp_inviata_at: ADESSO, laboratorio_id: 'lab-1' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.claimOrfani).toEqual([])
    })

    it('claim vecchio (smtp_inviata_at = 2h fa) → incluso, orfano reale', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '1/2026', stato_sdi: 'generata', smtp_inviata_at: DUE_ORE_FA, laboratorio_id: 'lab-1' }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.claimOrfani).toEqual([{ id: 'f1', numero: '1/2026', smtp_inviata_at: DUE_ORE_FA }])
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

    // Finding 1 (review finale Task 17): falso positivo permanente dopo
    // re-storno riuscito — TD04-A rifiutata seguita da TD04-B che ri-emette
    // lo storno e viene accettata. L'originale ha ANCORA TD04-A rifiutata
    // collegata, ma il ciclo è stato ri-risolto: deve uscire dal gruppo.
    it('re-storno riuscito (TD04-A rifiutata + TD04-B accettata, stessa originale) → gruppo vuoto', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-16T10:00:00.000Z' },
          { id: 'td04-a', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
          { id: 'td04-b', numero: '5/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'accettata', fattura_collegata_id: 'orig-1' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([])
    })

    it('re-storno in corso (TD04-A rifiutata + TD04-B ancora generata, non rifiutata) → gruppo vuoto', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-16T10:00:00.000Z' },
          { id: 'td04-a', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
          { id: 'td04-b', numero: '5/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'generata', fattura_collegata_id: 'orig-1' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([])
    })

    it('solo TD04 rifiutata (nessun altro TD04 collegato) → resta presente', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-16T10:00:00.000Z' },
          { id: 'td04-a', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([{ id: 'orig-1', numero: '3/2026', td04_numero: '4/2026' }])
    })

    it('due TD04 entrambe rifiutate (nessun re-storno risolto) → resta presente', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-16T10:00:00.000Z' },
          { id: 'td04-a', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
          { id: 'td04-b', numero: '5/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
        ],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([{ id: 'orig-1', numero: '3/2026', td04_numero: '4/2026' }])
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

    // Finding 2 (review finale Task 17): eventi parcheggiati senza fine-vita
    // nel fallback quarantena-all — l'override del titolare risolve la
    // fattura (stato_sdi terminale) ma NON completa l'evento (stato_a resta
    // NULL). Fix minimo: escludere gli eventi la cui fattura è già in stato
    // terminale ('accettata'/'rifiutata').
    it('evento in quarantena firma su fattura risolta (accettata) via override → escluso', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '9/2026', stato_sdi: 'accettata', laboratorio_id: 'lab-1' }],
        fatture_sdi_eventi: [{
          id: 'ev-8', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: null,
          nome_file_ricevuta: 'rc.xml', esito_verifica_firma: 'fallita', esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toEqual([])
    })

    it('evento in quarantena firma su fattura risolta (rifiutata) via override → escluso', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '9/2026', stato_sdi: 'rifiutata', laboratorio_id: 'lab-1' }],
        fatture_sdi_eventi: [{
          id: 'ev-8b', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: null,
          nome_file_ricevuta: 'rc.xml', esito_verifica_firma: 'fallita', esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toEqual([])
    })

    it('evento in quarantena firma su fattura NON ancora risolta (smtp_inviata) → presente', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '9/2026', stato_sdi: 'smtp_inviata', laboratorio_id: 'lab-1' }],
        fatture_sdi_eventi: [{
          id: 'ev-9', laboratorio_id: 'lab-1', fattura_id: 'f1', stato_a: null,
          nome_file_ricevuta: 'rc.xml', esito_verifica_firma: 'fallita', esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toHaveLength(1)
      expect(r.eventiParcheggiati[0].id).toBe('ev-9')
    })

    it('evento non matchato (fattura_id NULL) resta presente anche con altre fatture del lab già terminali', async () => {
      const { supabase } = createFakeSupabase({
        fatture: [{ id: 'f1', numero: '9/2026', stato_sdi: 'accettata', laboratorio_id: 'lab-1' }],
        fatture_sdi_eventi: [{
          id: 'ev-10', laboratorio_id: 'lab-1', fattura_id: null, stato_a: null,
          nome_file_ricevuta: 'ignoto.xml', esito_verifica_firma: null, esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.eventiParcheggiati).toHaveLength(1)
      expect(r.eventiParcheggiati[0].id).toBe('ev-10')
    })
  })

  describe('consolidamento query (Task 12, R2d) — 4 query → 2, nessun N+1 residuo', () => {
    it('gruppo 3 (storni+TD04) e gruppo 5 (eventi) risolti con 1 query ciascuno: 5 select totali, non 6', async () => {
      const { supabase, fromCalls } = createFakeSupabase({
        fatture: [
          { id: 'orig-1', numero: '3/2026', laboratorio_id: 'lab-1', stornata_at: '2026-07-16T10:00:00.000Z' },
          { id: 'td04-a', numero: '4/2026', laboratorio_id: 'lab-1', tipo_documento: 'TD04', stato_sdi: 'rifiutata', fattura_collegata_id: 'orig-1' },
        ],
        fatture_sdi_eventi: [{
          id: 'ev-1', laboratorio_id: 'lab-1', fattura_id: null, stato_a: null,
          nome_file_ricevuta: 'r.xml', esito_verifica_firma: null, esito_committente: null, created_at: '2026-07-14T10:00:00.000Z',
        }],
      })
      const r = await fetchPendenzeRiconciliazione(supabase, 'lab-1')
      expect(r.stornateConTd04Rifiutato).toEqual([{ id: 'orig-1', numero: '3/2026', td04_numero: '4/2026' }])
      expect(r.eventiParcheggiati).toHaveLength(1)
      // claimOrfani + smtpStagnanti + storni (ora 1 sola query, non più 2) = 3
      // su 'fatture'; eventi = 1 su 'fatture_sdi_eventi'; saldi = 1 su
      // 'credito_clienti_movimenti'. Totale 5 (prima del refactor: 6).
      expect(fromCalls.filter((t) => t === 'fatture')).toHaveLength(3)
      expect(fromCalls.filter((t) => t === 'fatture_sdi_eventi')).toHaveLength(1)
      expect(fromCalls).toHaveLength(5)
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
