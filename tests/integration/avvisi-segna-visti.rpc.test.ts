import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Comportamento REALE di `public.avvisi_segna_visti` (Task 8 dell'ondata
// «l'avviso al dentista», §2 del brief), contro il database vero, in
// transazione sempre annullata.
//
// 🔑 MODELLO: le prove (e) di `tests/integration/eventi-qualita-schema.rpc.test.ts`
// su `valutazione_supera` — stessa famiglia di funzione (SECURITY DEFINER che
// riapre una colonna revocata a tutti i ruoli app), stesso schema di prova:
// il rifiuto diretto, la controprova via RPC, il cross-tenant, i permessi di
// EXECUTE dal catalogo.
//
// ⚠️ IL RUOLO DELLA CONNESSIONE È `postgres` (BYPASSRLS): le prove sui
// permessi passano da `SET LOCAL ROLE` (transazionale, la annulla il ROLLBACK).

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

/** I tre riferimenti veri del lab E2E — stesso helper di
 *  `avvisi-dentista-schema.rpc.test.ts`, ripetuto qui per non far dipendere
 *  un file di Task diverso da un altro (ogni file d'integrazione sta in piedi
 *  da solo). */
async function riferimentiVeri(client: Client) {
  const { rows } = await client.query(
    `SELECT (SELECT id FROM lavori   WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS lavoro_id,
            (SELECT id FROM clienti  WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS cliente_id,
            (SELECT id FROM dichiarazioni_conformita WHERE laboratorio_id = $1
              ORDER BY created_at LIMIT 1) AS dichiarazione_id`,
    [LAB_A]
  )
  const r = rows[0]
  for (const [nome, valore] of Object.entries(r)) {
    if (!valore) throw new Error(`il lab E2E ${LAB_A} non ha ${nome}: eseguire scripts/seed-e2e.ts`)
  }
  return r as { lavoro_id: string; cliente_id: string; dichiarazione_id: string }
}

async function creaAvviso(client: Client, laboratorioId: string, rif: { lavoro_id: string; cliente_id: string; dichiarazione_id: string }) {
  const { rows } = await client.query(
    `INSERT INTO public.avvisi_dentista (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, campi_corretti)
     VALUES ($1, $2, $3, $4, ARRAY['descrizione'])
     RETURNING id, visto_dal_dentista_at`,
    [laboratorioId, rif.lavoro_id, rif.cliente_id, rif.dichiarazione_id]
  )
  return rows[0] as { id: string; visto_dal_dentista_at: string | null }
}

async function creaLaboratorioB(client: Client) {
  const labB = randomUUID()
  await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [labB, 'Lab B — prova avvisi_segna_visti'])
  return labB
}

describe.skipIf(skipIntegrationTests)('avvisi_segna_visti — comportamento reale', () => {
  it('un UPDATE diretto di visto_dal_dentista_at come service_role resta rifiutato (specchio di p8, non un doppione: qui si prova che la RPC esiste PER QUESTO)', async () => {
    // 🛑 SAVEPOINT, non un try/catch nudo: in Postgres un errore aborta
    // l'INTERA transazione, e le istruzioni dopo (incluso `RESET ROLE`)
    // fallirebbero con «current transaction is aborted» — misurato qui, prima
    // di questa correzione. Stesso idioma di `attesoRifiuto` in
    // `avvisi-dentista-schema.rpc.test.ts`.
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const avviso = await creaAvviso(client, LAB_A, rif)

      await client.query('SET LOCAL ROLE service_role')
      await client.query('SAVEPOINT prima_dello_update_diretto')
      let fallito = false
      try {
        await client.query(`UPDATE public.avvisi_dentista SET visto_dal_dentista_at = now() WHERE id = $1`, [avviso.id])
      } catch (e) {
        fallito = true
        expect((e as Error).message).toMatch(/permission denied/i)
        await client.query('ROLLBACK TO SAVEPOINT prima_dello_update_diretto')
      }
      expect(fallito).toBe(true)
      await client.query('RESET ROLE')
    })
  })

  it('la RPC, chiamata PER NOME DI ARGOMENTO, scrive now() sulla prima visione', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const avviso = await creaAvviso(client, LAB_A, rif)
      expect(avviso.visto_dal_dentista_at).toBeNull()

      await client.query('SET LOCAL ROLE service_role')
      const { rows: [esito] } = await client.query(
        `SELECT public.avvisi_segna_visti(p_ids => $1::uuid[], p_laboratorio_id => $2::uuid) AS r`,
        [[avviso.id], LAB_A]
      )
      expect(esito.r).toEqual({ esito: 'ok', aggiornati: 1 })
      await client.query('RESET ROLE')

      const { rows: [dopo] } = await client.query(
        `SELECT visto_dal_dentista_at FROM public.avvisi_dentista WHERE id = $1`, [avviso.id]
      )
      expect(dopo.visto_dal_dentista_at).not.toBeNull()
    })
  })

  it('un SECONDO giro sullo STESSO id NON riscrive il timestamp — la ricevuta è la PRIMA visione', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const avviso = await creaAvviso(client, LAB_A, rif)

      await client.query('SET LOCAL ROLE service_role')
      await client.query(
        `SELECT public.avvisi_segna_visti(p_ids => $1::uuid[], p_laboratorio_id => $2::uuid)`, [[avviso.id], LAB_A]
      )
      const { rows: [primo] } = await client.query(
        `SELECT visto_dal_dentista_at FROM public.avvisi_dentista WHERE id = $1`, [avviso.id]
      )

      // Aspetta un istante misurabile: se il secondo giro riscrivesse, il
      // timestamp cambierebbe di sicuro, non per un pareggio di clock.
      await client.query('SELECT pg_sleep(0.05)')

      const { rows: [secondo] } = await client.query(
        `SELECT public.avvisi_segna_visti(p_ids => $1::uuid[], p_laboratorio_id => $2::uuid) AS r`,
        [[avviso.id], LAB_A]
      )
      expect(secondo.r).toEqual({ esito: 'ok', aggiornati: 0 }) // 0 righe: NULL→now() non ritrova nulla da scrivere

      const { rows: [dopo] } = await client.query(
        `SELECT visto_dal_dentista_at FROM public.avvisi_dentista WHERE id = $1`, [avviso.id]
      )
      expect(new Date(dopo.visto_dal_dentista_at).getTime()).toBe(new Date(primo.visto_dal_dentista_at).getTime())
      await client.query('RESET ROLE')
    })
  })

  it('due id nello stesso array — entrambi vengono segnati in un giro solo (⚖️ D354: tutte le righe mostrate)', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const primoAvviso = await creaAvviso(client, LAB_A, rif)
      const secondoAvviso = await creaAvviso(client, LAB_A, rif)

      await client.query('SET LOCAL ROLE service_role')
      const { rows: [esito] } = await client.query(
        `SELECT public.avvisi_segna_visti(p_ids => $1::uuid[], p_laboratorio_id => $2::uuid) AS r`,
        [[primoAvviso.id, secondoAvviso.id], LAB_A]
      )
      expect(esito.r).toEqual({ esito: 'ok', aggiornati: 2 })
      await client.query('RESET ROLE')

      const { rows } = await client.query(
        `SELECT id, visto_dal_dentista_at FROM public.avvisi_dentista WHERE id = ANY($1::uuid[])`,
        [[primoAvviso.id, secondoAvviso.id]]
      )
      expect(rows.every((r: { visto_dal_dentista_at: string | null }) => r.visto_dal_dentista_at !== null)).toBe(true)
    })
  })

  it('la RPC è scoped su laboratorio_id — un id vero con il lab SBAGLIATO non viene toccato (difesa in profondità)', async () => {
    await withRollback(async (client) => {
      const labB = await creaLaboratorioB(client)
      const rif = await riferimentiVeri(client)
      const avviso = await creaAvviso(client, LAB_A, rif)

      await client.query('SET LOCAL ROLE service_role')
      const { rows: [esito] } = await client.query(
        `SELECT public.avvisi_segna_visti(p_ids => $1::uuid[], p_laboratorio_id => $2::uuid) AS r`,
        [[avviso.id], labB]
      )
      expect(esito.r).toEqual({ esito: 'ok', aggiornati: 0 })
      await client.query('RESET ROLE')

      const { rows: [dopo] } = await client.query(
        `SELECT visto_dal_dentista_at FROM public.avvisi_dentista WHERE id = $1`, [avviso.id]
      )
      expect(dopo.visto_dal_dentista_at).toBeNull() // la riga di A resta intatta
    })
  })

  it('un array vuoto risponde «ok, 0 aggiornati» — non è un errore', async () => {
    await withRollback(async (client) => {
      await client.query('SET LOCAL ROLE service_role')
      const { rows: [esito] } = await client.query(
        `SELECT public.avvisi_segna_visti(p_ids => $1::uuid[], p_laboratorio_id => $2::uuid) AS r`,
        [[], LAB_A]
      )
      expect(esito.r).toEqual({ esito: 'ok', aggiornati: 0 })
      await client.query('RESET ROLE')
    })
  })

  it('EXECUTE sulla RPC è concesso a service_role e a NESSUN altro ruolo dell\'app', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(`
        SELECT grantee FROM information_schema.role_routine_grants
         WHERE routine_schema = 'public' AND routine_name = 'avvisi_segna_visti'
           AND privilege_type = 'EXECUTE' AND grantee IN ('anon','authenticated','service_role','PUBLIC')
         ORDER BY grantee`)
      expect(rows.map((r) => r.grantee)).toEqual(['service_role'])
    })
  })

  it('il CATALOGO conferma i nomi degli argomenti — PostgREST chiama per nome, non per posizione', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_function_arguments('public.avvisi_segna_visti'::regproc) AS argomenti`
      )
      expect(rows[0].argomenti).toBe('p_ids uuid[], p_laboratorio_id uuid')
    })
  })

  it('un id inesistente non lancia: risponde «ok, 0 aggiornati»', async () => {
    await withRollback(async (client) => {
      await client.query('SET LOCAL ROLE service_role')
      const { rows: [esito] } = await client.query(
        `SELECT public.avvisi_segna_visti(p_ids => $1::uuid[], p_laboratorio_id => $2::uuid) AS r`,
        [['00000000-0000-0000-0000-000000000000'], LAB_A]
      )
      expect(esito.r).toEqual({ esito: 'ok', aggiornati: 0 })
      await client.query('RESET ROLE')
    })
  })
})
