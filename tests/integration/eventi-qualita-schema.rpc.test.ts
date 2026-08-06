import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Comportamento REALE delle due tabelle dell'ondata «si deve sempre poter
// intervenire» (Task 1), contro il database vero, in transazione sempre
// annullata.
//
// PERCHÉ ESISTE — §0① dell'handoff 2026-08-06. Il Task 1 ha eseguito NOVE
// verifiche di rifiuto A MANO (spike usa-e-getta + rapporto fuori da git):
// serie, ma non ripetibili. Questo file le rimette in suite tutte e nove,
// riusando le stesse query della sonda `scripts/tmp/sonda-intervento-fix-r-p1.mjs`
// invece di riscriverne di nuove — un test diverso che «per caso» passa non
// prova la stessa cosa.
//
// Il gemello statico è tests/unit/eventi-qualita-schema.test.ts, che gira
// SEMPRE (anche in CI, senza credenziali) e blocca il testo delle migration.
// Questo file prova che il database si comporta come quel testo promette.
//
// ⚠️ IL RUOLO DELLA CONNESSIONE NON È QUELLO DELL'APPLICAZIONE.
// SUPABASE_DB_URL si connette come `postgres`, che è il PROPRIETARIO delle
// tabelle: un UPDATE fatto da lì riesce sempre, qualunque REVOKE ci sia. Le
// prove sui permessi girano quindi dentro `SET LOCAL ROLE service_role`
// (transazionale, la annulla il ROLLBACK), più un controllo di CATALOGO che
// non dipende affatto dal ruolo della connessione. Senza questo accorgimento
// la prova (e) leggerebbe come «copertura» del Critico che la correzione ha
// chiuso, mentre non proverebbe nulla.

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato — mai il lab Filippo

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

/** Un secondo laboratorio, creato dentro la transazione: nessuna dipendenza da quali lab esistano. */
async function creaLaboratorioB(client: Client) {
  const id = randomUUID()
  await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [
    id, 'Lab B — prova cross-tenant',
  ])
  return id
}

/** Un lavoro del lab A su cui agganciare gli eventi. */
async function primoLavoroDelLabA(client: Client) {
  const { rows } = await client.query(
    `SELECT id FROM lavori WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1`, [LAB_A]
  )
  if (rows.length === 0) throw new Error(`il lab E2E ${LAB_A} non ha lavori: eseguire scripts/seed-e2e.ts`)
  return rows[0].id as string
}

async function creaEvento(client: Client, laboratorioId: string, lavoroId: string) {
  const { rows } = await client.query(
    `INSERT INTO eventi_qualita
       (laboratorio_id, lavoro_id, motivo, natura, origine_informazione, conosciuto_il, stato_dispositivo)
     VALUES ($1, $2, 'errore_registrazione', 'errore_registrazione', 'laboratorio_interno', now(), 'non_noto')
     RETURNING id`,
    [laboratorioId, lavoroId]
  )
  return rows[0].id as string
}

/**
 * Esegue `fn` dentro un SAVEPOINT e restituisce l'errore atteso. Serve perché
 * in PostgreSQL un errore aborta l'intera transazione: senza savepoint, dopo
 * il primo rifiuto ogni query successiva fallirebbe con «current transaction
 * is aborted» e i test dopo il primo proverebbero solo quello.
 * 🛑 Se `fn` RIESCE, questo helper lancia: un rifiuto atteso che non arriva è
 * il difetto, non un caso da ignorare.
 */
async function attesoRifiuto(client: Client, cosa: string, fn: () => Promise<unknown>): Promise<string> {
  const sp = `sp_${randomUUID().replace(/-/g, '').slice(0, 12)}`
  await client.query(`SAVEPOINT ${sp}`)
  try {
    await fn()
    throw new Error(`ATTESO RIFIUTO, INVECE ACCETTATO: ${cosa}`)
  } catch (e) {
    const msg = (e as Error).message
    if (msg.startsWith('ATTESO RIFIUTO')) {
      await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
      throw e
    }
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
    return msg.split('\n')[0]
  }
}

describe.skipIf(skipIntegrationTests)('eventi_qualita + valutazioni_evento — comportamento reale', () => {
  it('la connessione è il proprietario delle tabelle: le prove sui permessi devono cambiare ruolo', async () => {
    // Non è un test di dominio: è la dichiarazione, misurata, del motivo per
    // cui la prova (e) qui sotto usa SET LOCAL ROLE. Se un giorno
    // SUPABASE_DB_URL puntasse a un ruolo non privilegiato, questo test lo
    // direbbe subito invece di lasciare (e) verde per il motivo sbagliato.
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT current_user AS utente,
                has_table_privilege(current_user, 'public.valutazioni_evento', 'UPDATE') AS puo_aggiornare`
      )
      expect(rows[0].puo_aggiornare).toBe(true)
    })
  })

  // ── (b) — evento su un lavoro di un ALTRO laboratorio ───────────────────
  it('(b) un evento non può puntare al lavoro di un altro laboratorio', async () => {
    await withRollback(async (client) => {
      const labB = await creaLaboratorioB(client)
      const lavoroA = await primoLavoroDelLabA(client)

      const errore = await attesoRifiuto(client, 'evento del lab B sul lavoro del lab A', () =>
        creaEvento(client, labB, lavoroA)
      )
      expect(errore).toMatch(/eventi_qualita_lavoro_fk/)
    })
  })

  // ── (c) — valutazione su un evento di un ALTRO laboratorio ──────────────
  it('(c) una valutazione non può giudicare l\'evento di un altro laboratorio', async () => {
    await withRollback(async (client) => {
      const labB = await creaLaboratorioB(client)
      const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))

      const errore = await attesoRifiuto(client, 'valutazione del lab B sull\'evento del lab A', () =>
        client.query(
          `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
           VALUES ($1, $2, 'nessuna_azione', 'prova cross-tenant')`,
          [labB, eventoA]
        )
      )
      expect(errore).toMatch(/valutazioni_evento_evento_fk/)
    })
  })

  // ── (d) — controprova: senza questa, (a) e (c) non provano niente ───────
  it('(d) CONTROPROVA: una valutazione legittima passa — i vincoli non rifiutano tutto', async () => {
    await withRollback(async (client) => {
      const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))

      const { rows } = await client.query(
        `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
         VALUES ($1, $2, 'nessuna_azione', 'controprova: questa deve passare')
         RETURNING id, superata`,
        [LAB_A, eventoA]
      )
      expect(rows[0].superata).toBe(false)
    })
  })

  // ── (a) — una sola valutazione viva per evento ──────────────────────────
  it('(a) due valutazioni VIVE sullo stesso evento sono rifiutate', async () => {
    await withRollback(async (client) => {
      const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
      const inserisci = (nota: string) =>
        client.query(
          `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
           VALUES ($1, $2, 'nessuna_azione', $3)`,
          [LAB_A, eventoA, nota]
        )

      await inserisci('prima viva')
      const errore = await attesoRifiuto(client, 'seconda valutazione viva sullo stesso evento', () =>
        inserisci('seconda viva')
      )
      expect(errore).toMatch(/valutazione_viva_unique/)
    })
  })

  it('(a-bis) ma una seconda valutazione è ammessa se la prima è stata SUPERATA', async () => {
    // È il movimento della riclassificazione (spec §9): l'indice è PARZIALE
    // apposta, altrimenti un evento non si potrebbe mai riclassificare.
    await withRollback(async (client) => {
      const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
      const { rows: [prima] } = await client.query(
        `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
         VALUES ($1, $2, 'nessuna_azione', 'prima') RETURNING id`,
        [LAB_A, eventoA]
      )
      await client.query(`SELECT public.valutazione_supera($1, $2)`, [prima.id, LAB_A])

      const { rows: [seconda] } = await client.query(
        `INSERT INTO valutazioni_evento
           (laboratorio_id, evento_id, esito, sostituisce_id, motivo_riclassificazione)
         VALUES ($1, $2, 'reclamo', $3, 'riclassificata dopo il parere del dentista')
         RETURNING id, superata`,
        [LAB_A, eventoA, prima.id]
      )
      expect(seconda.superata).toBe(false)
    })
  })

  // ── (e) — la sola-aggiunta la impone il DATABASE, non il codice ─────────
  describe('(e) la sola-aggiunta regge contro service_role, il ruolo che l\'app usa davvero', () => {
    it('il CATALOGO dice che service_role non ha né UPDATE né DELETE (nota E8)', async () => {
      // Controllo indipendente dal ruolo della connessione: nessun
      // SET ROLE lo può falsare. ⚠️ Anche PUBLIC conta: se PUBLIC avesse
      // UPDATE, service_role lo erediterebbe e queste due righe sarebbero true.
      await withRollback(async (client) => {
        const { rows } = await client.query(`
          SELECT has_table_privilege('service_role', 'public.valutazioni_evento', 'UPDATE') AS upd,
                 has_table_privilege('service_role', 'public.valutazioni_evento', 'DELETE') AS del,
                 has_table_privilege('service_role', 'public.valutazioni_evento', 'INSERT') AS ins,
                 has_table_privilege('service_role', 'public.valutazioni_evento', 'SELECT') AS sel`)
        expect(rows[0]).toEqual({ upd: false, del: false, ins: true, sel: true })
      })
    })

    it('un UPDATE diretto come service_role è rifiutato', async () => {
      await withRollback(async (client) => {
        const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
        const { rows: [val] } = await client.query(
          `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
           VALUES ($1, $2, 'nessuna_azione', 'riga per la prova (e)') RETURNING id`,
          [LAB_A, eventoA]
        )

        await client.query('SET LOCAL ROLE service_role')
        const { rows: [chi] } = await client.query('SELECT current_user AS u')
        expect(chi.u).toBe('service_role') // se non fosse così, il resto non proverebbe niente

        const errore = await attesoRifiuto(client, 'UPDATE diretto come service_role', () =>
          client.query(`UPDATE valutazioni_evento SET superata = true WHERE id = $1`, [val.id])
        )
        expect(errore).toMatch(/permission denied/i)
        await client.query('RESET ROLE')
      })
    })

    it('un DELETE diretto come service_role è rifiutato', async () => {
      await withRollback(async (client) => {
        const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
        const { rows: [val] } = await client.query(
          `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
           VALUES ($1, $2, 'nessuna_azione', 'riga per la prova (e) delete') RETURNING id`,
          [LAB_A, eventoA]
        )

        await client.query('SET LOCAL ROLE service_role')
        const errore = await attesoRifiuto(client, 'DELETE diretto come service_role', () =>
          client.query(`DELETE FROM valutazioni_evento WHERE id = $1`, [val.id])
        )
        expect(errore).toMatch(/permission denied/i)
        await client.query('RESET ROLE')
      })
    })

    it('la stessa operazione via valutazione_supera() RIESCE — controprova del rifiuto sopra', async () => {
      await withRollback(async (client) => {
        const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
        const { rows: [val] } = await client.query(
          `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
           VALUES ($1, $2, 'nessuna_azione', 'riga per la controprova RPC') RETURNING id`,
          [LAB_A, eventoA]
        )

        await client.query('SET LOCAL ROLE service_role')
        const { rows: [esito] } = await client.query(
          `SELECT public.valutazione_supera($1, $2) AS r`, [val.id, LAB_A]
        )
        expect(esito.r).toEqual({ esito: 'ok' })
        await client.query('RESET ROLE')

        const { rows: [dopo] } = await client.query(
          `SELECT superata FROM valutazioni_evento WHERE id = $1`, [val.id]
        )
        expect(dopo.superata).toBe(true)
      })
    })

    it('la RPC non supera la valutazione di un ALTRO laboratorio: risponde «non trovata»', async () => {
      await withRollback(async (client) => {
        const labB = await creaLaboratorioB(client)
        const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
        const { rows: [val] } = await client.query(
          `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
           VALUES ($1, $2, 'nessuna_azione', 'riga per la prova cross-tenant sulla RPC') RETURNING id`,
          [LAB_A, eventoA]
        )

        await client.query('SET LOCAL ROLE service_role')
        const { rows: [esito] } = await client.query(
          `SELECT public.valutazione_supera($1, $2) AS r`, [val.id, labB]
        )
        expect(esito.r).toEqual({ esito: 'non_trovata' })
        await client.query('RESET ROLE')

        const { rows: [dopo] } = await client.query(
          `SELECT superata FROM valutazioni_evento WHERE id = $1`, [val.id]
        )
        expect(dopo.superata).toBe(false) // la riga di A è rimasta intatta
      })
    })

    it('la RPC su un id inesistente risponde «non trovata», non un errore', async () => {
      await withRollback(async (client) => {
        await client.query('SET LOCAL ROLE service_role')
        const { rows: [esito] } = await client.query(
          `SELECT public.valutazione_supera('00000000-0000-0000-0000-000000000000'::uuid, $1) AS r`,
          [LAB_A]
        )
        expect(esito.r).toEqual({ esito: 'non_trovata' })
        await client.query('RESET ROLE')
      })
    })

    it('EXECUTE sulla RPC è concesso a service_role e a nessun altro ruolo dell\'app', async () => {
      await withRollback(async (client) => {
        const { rows } = await client.query(`
          SELECT grantee FROM information_schema.role_routine_grants
           WHERE routine_schema = 'public' AND routine_name = 'valutazione_supera'
             AND privilege_type = 'EXECUTE' AND grantee IN ('anon','authenticated','service_role','PUBLIC')
           ORDER BY grantee`)
        expect(rows.map((r) => r.grantee)).toEqual(['service_role'])
      })
    })
  })

  // ── I quattro CHECK, provati con un valore che DEVE essere rifiutato ────
  describe('i vincoli di contenuto rifiutano davvero (R-P1: si prova col valore che deve fallire)', () => {
    it('motivo «altro» senza testo libero è rifiutato', async () => {
      await withRollback(async (client) => {
        const lavoroA = await primoLavoroDelLabA(client)
        const errore = await attesoRifiuto(client, 'motivo=altro senza motivo_libero', () =>
          client.query(
            `INSERT INTO eventi_qualita
               (laboratorio_id, lavoro_id, motivo, natura, origine_informazione, conosciuto_il, stato_dispositivo)
             VALUES ($1, $2, 'altro', 'nessun_difetto', 'laboratorio_interno', now(), 'non_noto')`,
            [LAB_A, lavoroA]
          )
        )
        expect(errore).toMatch(/evento_altro_ha_testo/)
      })
    })

    it('esito «nessuna azione» senza giustificazione è rifiutato', async () => {
      await withRollback(async (client) => {
        const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
        const errore = await attesoRifiuto(client, 'nessuna_azione senza giustificazione', () =>
          client.query(
            `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito)
             VALUES ($1, $2, 'nessuna_azione')`,
            [LAB_A, eventoA]
          )
        )
        expect(errore).toMatch(/valutazione_nessuna_azione_giustificata/)
      })
    })

    it('una riclassificazione senza motivo è rifiutata', async () => {
      await withRollback(async (client) => {
        const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
        const { rows: [prima] } = await client.query(
          `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
           VALUES ($1, $2, 'nessuna_azione', 'prima') RETURNING id`,
          [LAB_A, eventoA]
        )
        await client.query(`SELECT public.valutazione_supera($1, $2)`, [prima.id, LAB_A])

        const errore = await attesoRifiuto(client, 'sostituisce_id senza motivo_riclassificazione', () =>
          client.query(
            `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, sostituisce_id)
             VALUES ($1, $2, 'reclamo', $3)`,
            [LAB_A, eventoA, prima.id]
          )
        )
        expect(errore).toMatch(/valutazione_riclassifica_motivata/)
      })
    })

    it('un esito fuori vocabolario è rifiutato (e «non_conformita» NON è un esito valido)', async () => {
      await withRollback(async (client) => {
        const eventoA = await creaEvento(client, LAB_A, await primoLavoroDelLabA(client))
        const errore = await attesoRifiuto(client, "esito='non_conformita'", () =>
          client.query(
            `INSERT INTO valutazioni_evento (laboratorio_id, evento_id, esito, giustificazione)
             VALUES ($1, $2, 'non_conformita', 'valore inesistente')`,
            [LAB_A, eventoA]
          )
        )
        expect(errore).toMatch(/valutazioni_evento_esito_check/)
      })
    })
  })
})
