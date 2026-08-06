import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// riapri_lavoro_atomica — Task 3 dell'ondata «si deve sempre poter intervenire».
// Spec: docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md §7.
//
// ⚠️ LA MIGRATION NON È ANCORA APPLICATA AL DATABASE VERO (va lanciata da
// Francesco: `npx supabase db push`, vedi il referto). Questo file la applica
// DENTRO la transazione di ogni test (CREATE OR REPLACE FUNCTION è DDL
// transazionale in Postgres) e la lascia sparire col ROLLBACK — mai una
// migration registrata due volte. `CREATE OR REPLACE` è idempotente: lo
// stesso identico file resta corretto anche il giorno dopo che la migration
// vera è stata applicata.
//
// Perché una RPC NUOVA e non un allargamento di annulla_consegna_atomica: §7
// della spec — quella vecchia porta i cancelli fiscali (fattura_gia_emessa,
// incluso_in_fattura) che farebbero rifiutare esattamente la correzione che
// D265 impone di lasciar passare sempre.

const MIGRATION_PATH = 'supabase/migrations/20260806210400_riapri_lavoro_atomica.sql'
const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato — mai il lab Filippo

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

/** Applica la migration DENTRO la transazione corrente (mai fuori, mai registrata). */
async function applicaMigrazione(client: Client) {
  const sql = readFileSync(MIGRATION_PATH, 'utf8')
  await client.query(sql)
}

function progressivoUnico() {
  return 700000 + (parseInt(randomUUID().replace(/-/g, '').slice(0, 6), 16) % 200000)
}

async function creaLaboratorioB(client: Client) {
  const id = randomUUID()
  await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [id, 'Lab B — prova riapertura cross-tenant'])
  return id
}

async function creaCliente(client: Client, labId: string) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO clienti (id, laboratorio_id, nome, cognome) VALUES ($1, $2, 'Studio', 'Test Riapertura')`,
    [id, labId]
  )
  return id
}

/** Un lavoro consegnato, di default fatturato (per provare che il cancello fiscale non blocca). */
async function creaLavoroConsegnato(
  client: Client,
  labId: string,
  clienteId: string,
  opts: Partial<{
    inclusoInFattura: boolean
    decisioneFatturazione: string | null
    deletedAt: string | null
    consegnaInCorso: boolean
    propostaDentista: string | null
  }> = {}
) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO lavori (
       id, laboratorio_id, numero_lavoro, cliente_id, tipo_dispositivo, descrizione,
       data_consegna_prevista, stato, conformato, data_conformazione, data_consegna_effettiva,
       consegna_completata_at, consegna_in_corso, consegna_tap_at, proposta_dentista, proposta_at,
       incluso_in_fattura, decisione_fatturazione, deleted_at
     ) VALUES ($1, $2, $3, $4, 'protesi_fissa', 'Corona test riapertura',
       CURRENT_DATE, 'consegnato', true, now(), now(),
       now(), $5, now(), $6, now(),
       $7, $8, $9)`,
    [
      id, labId, `TEST-RIAP-${id.slice(0, 8)}`, clienteId,
      opts.consegnaInCorso ?? false,
      opts.propostaDentista ?? 'fatturare',
      opts.inclusoInFattura ?? true,
      opts.decisioneFatturazione === undefined ? 'fatturare' : opts.decisioneFatturazione,
      opts.deletedAt ?? null,
    ]
  )
  return id
}

async function creaFatturaAttiva(client: Client, labId: string, clienteId: string, lavoroId: string) {
  const id = randomUUID()
  const anno = new Date().getFullYear()
  const progressivo = progressivoUnico()
  await client.query(
    `INSERT INTO fatture (
       id, laboratorio_id, cliente_id, numero, anno, progressivo, data,
       tipo_documento, stato_sdi, imponibile, cliente_denominazione, cliente_indirizzo, lavoro_id
     ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'TD01', 'accettata', 100, 'Studio Test', 'Via Test 1', $7)`,
    [id, labId, clienteId, `${anno}-${progressivo}`, anno, progressivo, lavoroId]
  )
  return id
}

async function creaEvento(client: Client, labId: string, lavoroId: string) {
  const { rows } = await client.query(
    `INSERT INTO eventi_qualita
       (laboratorio_id, lavoro_id, motivo, natura, origine_informazione, conosciuto_il, stato_dispositivo)
     VALUES ($1, $2, 'errore_dato_dichiarazione', 'dato_documentale', 'laboratorio_interno', now(), 'applicato')
     RETURNING id`,
    [labId, lavoroId]
  )
  return rows[0].id as string
}

async function creaDichiarazione(client: Client, labId: string, lavoroId: string, stato: string) {
  const id = randomUUID()
  const progressivo = progressivoUnico()
  await client.query(
    `INSERT INTO dichiarazioni_conformita (
       id, laboratorio_id, lavoro_id, numero_ddc, progressivo_ddc,
       fabbricante_nome, fabbricante_indirizzo, fabbricante_piva,
       prescrittore_nome, paziente_nome, tipo_dispositivo,
       descrizione_dispositivo, classe_rischio, testo_conformita, prrc_nome, stato
     ) VALUES ($1, $2, $3, $4, $5,
       'Lab Test', 'Via Test 1, Napoli', '00000000000',
       'Dr. Test', 'Paziente Test', 'protesi_fissa',
       'corona test', 'classe_i', 'testo di prova', 'PRRC Test', $6)`,
    [id, labId, lavoroId, `DDC-TEST-${id.slice(0, 8)}`, progressivo, stato]
  )
  return id
}

async function riapri(client: Client, lavoroId: string, labId: string, eventoId: string) {
  const { rows } = await client.query(
    `SELECT public.riapri_lavoro_atomica($1, $2, $3) AS r`,
    [lavoroId, labId, eventoId]
  )
  return rows[0].r as Record<string, unknown>
}

describe.skipIf(skipIntegrationTests)('riapri_lavoro_atomica — comportamento reale (DB, migration non applicata)', () => {
  // ── Passo 2 del brief — IL CANCELLO FISCALE NON BLOCCA (senso di D265) ────
  it('lavoro CON FATTURA EMESSA: riapre comunque — esito ok, non fattura_gia_emessa', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId, { inclusoInFattura: true })
      await creaFatturaAttiva(client, LAB_A, clienteId, lavoroId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      await creaDichiarazione(client, LAB_A, lavoroId, 'generata')

      const r = await riapri(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('ok')

      const { rows: [dopo] } = await client.query(
        `SELECT stato, incluso_in_fattura, decisione_fatturazione FROM lavori WHERE id = $1`, [lavoroId]
      )
      expect(dopo.stato).toBe('pronto')
      // §7: il cancello commerciale non è qui — la fattura resta un fatto a sé.
      expect(dopo.incluso_in_fattura).toBe(true)
      expect(dopo.decisione_fatturazione).toBe('fatturare')
    })
  })

  // ── R-P1 — p_evento_id inesistente DEVE essere rifiutato ──────────────────
  it('p_evento_id inesistente → evento_non_valido (rifiuto)', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)

      const r = await riapri(client, lavoroId, LAB_A, '00000000-0000-0000-0000-000000000000')
      expect(r.esito).toBe('evento_non_valido')

      const { rows: [dopo] } = await client.query(`SELECT stato FROM lavori WHERE id = $1`, [lavoroId])
      expect(dopo.stato).toBe('consegnato') // nessuna mutazione se l'evento non è valido
    })
  })

  it('p_evento_id di UN ALTRO LAVORO (stesso laboratorio) → evento_non_valido (rifiuto)', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const altroLavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoDiAltroLavoro = await creaEvento(client, LAB_A, altroLavoroId)

      const r = await riapri(client, lavoroId, LAB_A, eventoDiAltroLavoro)
      expect(r.esito).toBe('evento_non_valido')
    })
  })

  // ── R-P1 — cross-tenant: p_laboratorio_id di B, p_lavoro_id di A ──────────
  it('cross-tenant: lab B chiama sul lavoro di lab A → non_trovato, riga di A intatta', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const labB = await creaLaboratorioB(client)
      const clienteA = await creaCliente(client, LAB_A)
      const lavoroA = await creaLavoroConsegnato(client, LAB_A, clienteA)
      const eventoA = await creaEvento(client, LAB_A, lavoroA)

      // SECURITY DEFINER bypassa la RLS: il filtro esplicito su laboratorio_id
      // dentro la funzione è la SOLA protezione tenant qui — va provato con un
      // valore che deve essere rifiutato.
      const r = await riapri(client, lavoroA, labB, eventoA)
      expect(r.esito).toBe('non_trovato')

      const { rows: [dopo] } = await client.query(`SELECT stato FROM lavori WHERE id = $1`, [lavoroA])
      expect(dopo.stato).toBe('consegnato') // la riga di A non è stata toccata da B
    })
  })

  // ── R-P1 — lavoro non consegnato ──────────────────────────────────────────
  it('lavoro in stato "pronto" (non consegnato) → non_consegnato (rifiuto)', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      await client.query(`UPDATE lavori SET stato = 'pronto' WHERE id = $1`, [lavoroId])
      const eventoId = await creaEvento(client, LAB_A, lavoroId)

      const r = await riapri(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('non_consegnato')
    })
  })

  it('lavoro inesistente → non_trovato (rifiuto)', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const r = await riapri(
        client, '00000000-0000-0000-0000-000000000000', LAB_A, '00000000-0000-0000-0000-000000000000'
      )
      expect(r.esito).toBe('non_trovato')
    })
  })

  // ── R-P1 — lavoro con soft-delete non va riaperto ─────────────────────────
  it('lavoro con deleted_at IS NOT NULL → non_trovato (rifiuto, anche se stato="consegnato")', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId, { deletedAt: new Date().toISOString() })
      const eventoId = await creaEvento(client, LAB_A, lavoroId)

      const r = await riapri(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('non_trovato')
    })
  })

  // ── La divergenza dal corpo vivo, PROVATA: 'consegnata' viene annullata ──
  it('dichiarazione in stato "consegnata": viene annullata e lo slot attivo resta libero (divergenza voluta dal corpo vivo)', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      await creaDichiarazione(client, LAB_A, lavoroId, 'consegnata')

      const r = await riapri(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('ok')
      expect(r.ddc_assente).toBe(false)

      // Lo slot ddc_lavoro_attiva_unique (stato <> 'annullata') è di nuovo libero:
      // senza questo, la riemissione successiva (§8.1) urterebbe l'indice.
      const { rows: [conta] } = await client.query(
        `SELECT count(*)::int AS n FROM dichiarazioni_conformita
         WHERE lavoro_id = $1 AND laboratorio_id = $2 AND stato <> 'annullata'`,
        [lavoroId, LAB_A]
      )
      expect(conta.n).toBe(0)
    })
  })

  // ── R-P1 — fail-closed: la garanzia conservata dal corpo vivo ─────────────
  it('fail-closed: dichiarazione esistente ma GIÀ tutta annullata (nessuna riga da annullare, ma non è "assente") → RAISE EXCEPTION', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      // Unica dichiarazione del lavoro, già 'annullata': non è più «viva»
      // (0 righe da aggiornare) né "assente" (ce n'è una) → stato incoerente.
      await creaDichiarazione(client, LAB_A, lavoroId, 'annullata')

      await expect(riapri(client, lavoroId, LAB_A, eventoId)).rejects.toThrow(/dichiarazione in stato incoerente/)
    })
  })

  // ── ATOMICA: è la parola nel nome della funzione, e nessuna prova la controllava ──
  it('quando il fail-closed solleva, il ripristino del lavoro NON sopravvive: la funzione è davvero atomica', async () => {
    // Il ripristino a 'pronto' avviene PRIMA del controllo sulla dichiarazione.
    // Se l'eccezione non annullasse anche quello, resterebbe un lavoro riaperto
    // con la sua dichiarazione ancora viva: lo stato peggiore dei due.
    // Serve un SAVEPOINT perché in PostgreSQL l'errore aborta l'intera
    // transazione, e senza non si potrebbe leggere niente dopo.
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      await creaDichiarazione(client, LAB_A, lavoroId, 'annullata')

      await client.query('SAVEPOINT prima_del_raise')
      await expect(riapri(client, lavoroId, LAB_A, eventoId)).rejects.toThrow(/dichiarazione in stato incoerente/)
      await client.query('ROLLBACK TO SAVEPOINT prima_del_raise')

      const { rows: [dopo] } = await client.query(
        `SELECT stato, conformato FROM lavori WHERE id = $1`, [lavoroId]
      )
      expect(dopo).toEqual({ stato: 'consegnato', conformato: true })
    })
  })

  // ── il filtro «viva» vale per OGNI stato non annullato, non solo per due ──
  it.each(['bozza', 'firmata'])(
    'una dichiarazione in stato "%s" viene annullata come le altre — il filtro non elenca, esclude',
    async (stato) => {
      await withRollback(async (client) => {
        await applicaMigrazione(client)
        const clienteId = await creaCliente(client, LAB_A)
        const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
        const eventoId = await creaEvento(client, LAB_A, lavoroId)
        await creaDichiarazione(client, LAB_A, lavoroId, stato)

        const r = await riapri(client, lavoroId, LAB_A, eventoId)
        expect(r.esito).toBe('ok')
        expect(r.ddc_assente).toBe(false)

        const { rows: [conta] } = await client.query(
          `SELECT count(*)::int AS n FROM dichiarazioni_conformita
           WHERE lavoro_id = $1 AND laboratorio_id = $2 AND stato <> 'annullata'`,
          [lavoroId, LAB_A]
        )
        expect(conta.n).toBe(0)
      })
    }
  )

  // ── dato legacy: nessuna dichiarazione per il lavoro → si procede, si segnala ───────
  it('nessuna dichiarazione per il lavoro (dato legacy) → ok, ddc_assente=true', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      // Nessuna dichiarazioni_conformita inserita.

      const r = await riapri(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('ok')
      expect(r.ddc_assente).toBe(true)
    })
  })

  // ── Il ripristino completo, inclusi i quattro campi in più del mandato ───
  it('ripristino completo: pronto + i 4 campi extra azzerati (consegna_in_corso/tap/proposta) — non solo i 2 elencati nel mandato', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId, {
        consegnaInCorso: true, propostaDentista: 'fatturare',
      })
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      await creaDichiarazione(client, LAB_A, lavoroId, 'generata')

      const r = await riapri(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('ok')

      const { rows: [dopo] } = await client.query(
        `SELECT stato, conformato, data_conformazione, data_consegna_effettiva,
                consegna_completata_at, consegna_in_corso, consegna_tap_at,
                proposta_dentista, proposta_at
         FROM lavori WHERE id = $1`, [lavoroId]
      )
      expect(dopo.stato).toBe('pronto')
      expect(dopo.conformato).toBe(false)
      expect(dopo.data_conformazione).toBeNull()
      expect(dopo.data_consegna_effettiva).toBeNull()
      expect(dopo.consegna_completata_at).toBeNull()
      expect(dopo.consegna_in_corso).toBe(false)
      expect(dopo.consegna_tap_at).toBeNull()
      expect(dopo.proposta_dentista).toBeNull()
      expect(dopo.proposta_at).toBeNull()
    })
  })

  // ── Permessi dal CATALOGO — indipendenti dal ruolo della connessione ──────
  it('permessi: solo service_role può eseguire la RPC (PUBLIC/anon/authenticated no)', async () => {
    await withRollback(async (client) => {
      await applicaMigrazione(client)
      const { rows } = await client.query(`
        SELECT has_function_privilege('anon', 'public.riapri_lavoro_atomica(uuid,uuid,uuid)', 'EXECUTE') AS anon_puo,
               has_function_privilege('authenticated', 'public.riapri_lavoro_atomica(uuid,uuid,uuid)', 'EXECUTE') AS auth_puo,
               has_function_privilege('service_role', 'public.riapri_lavoro_atomica(uuid,uuid,uuid)', 'EXECUTE') AS service_puo
      `)
      expect(rows[0]).toEqual({ anon_puo: false, auth_puo: false, service_puo: true })
    })
  })
})
