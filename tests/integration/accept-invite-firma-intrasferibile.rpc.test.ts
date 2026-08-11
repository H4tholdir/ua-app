import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Dalla revisione finale del ramo code-58-59 (11/08/2026), l'unico Important:
// la FK composita `avvisi_dentista_comunicato_da_fk` (riga 59) blocca l'UPDATE
// di utenti.laboratorio_id dentro `accept_invite_atomic` quando l'utente ha
// firmato avvisi chiusi — `provato:` sonda dal vivo annullata, 23503 NON
// GESTITO. Il blocco è giusto (la firma è una prova: rispuntarla su un altro
// lab ricreerebbe la firma cross-tenant); dalla migration 20260811162235 il
// fallimento è PULITO: {ok:false, error:…} e invito ri-disponibile. Il flusso
// vero di trasferimento è la riga 62 della coda.
//
// ⚠️ Helper locali RICOPIATI (convenzione viva di tests/integration/: ogni
// file autosufficiente; consolidamento a carico dell'ondata di pulizia, R-E2).

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

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

/** Un utente vero usa-e-getta nel lab scelto, con la sua email (per l'invito). */
async function utenteUsaEGetta(client: Client, laboratorioId: string) {
  const id = randomUUID()
  const email = `usa-e-getta-${id.slice(0, 8)}@prova.ua`
  await client.query(`INSERT INTO auth.users (id) VALUES ($1)`, [id])
  await client.query(
    `INSERT INTO public.utenti (id, laboratorio_id, nome, cognome, email, ruolo)
     VALUES ($1, $2, 'Usa', 'E getta', $3, 'front_desk')`, [id, laboratorioId, email]
  )
  return { id, email }
}

/** Un avviso già comunicato a voce, firmato dall'utente dato. */
async function avvisoFirmatoDa(client: Client, utenteId: string) {
  const rif = await riferimentiVeri(client)
  await client.query(
    `INSERT INTO public.avvisi_dentista
       (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, stato, comunicato_at, comunicato_da)
     VALUES ($1, $2, $3, $4, 'comunicato_a_voce', now(), $5)`,
    [LAB_A, rif.lavoro_id, rif.cliente_id, rif.dichiarazione_id, utenteId]
  )
}

/** Un laboratorio usa-e-getta in stato che passa il cancello ('trial'/'attivo'). */
async function laboratorioUsaEGetta(client: Client) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO laboratori (id, nome, stato) VALUES ($1, 'Lab B — prova invito firma', 'attivo')`, [id]
  )
  return id
}

/** Un invito valido nel lab dato per l'email data; torna il token e l'id riga. */
async function invitoPer(client: Client, laboratorioId: string, email: string) {
  const token = `tok-prova-${randomUUID()}`
  const { rows: [riga] } = await client.query(
    `INSERT INTO inviti (token_hash, laboratorio_id, email, ruolo)
     VALUES ($1, $2, $3, 'front_desk') RETURNING id`, [token, laboratorioId, email]
  )
  return { token, invitoId: riga.id as string }
}

function accetta(client: Client, token: string, utenteId: string, email: string) {
  return client.query(
    `SELECT accept_invite_atomic($1, $2, $3, 'Usa', 'E getta') AS r`,
    [token, utenteId, email]
  )
}

describe.skipIf(skipIntegrationTests)('accept_invite_atomic — la firma non si trasferisce (riga 62)', () => {
  it('① chi ha firmato NON cambia lab via invito: {ok:false} pulito, invito ri-disponibile, utente fermo', async () => {
    await withRollback(async (client) => {
      const { id: utenteId, email } = await utenteUsaEGetta(client, LAB_A)
      await avvisoFirmatoDa(client, utenteId)
      const labB = await laboratorioUsaEGetta(client)
      const { token, invitoId } = await invitoPer(client, labB, email)

      const { rows: [ris] } = await accetta(client, token, utenteId, email)
      expect(ris.r.ok).toBe(false)
      expect(ris.r.error).toMatch(/firmato/)

      const { rows: [inv] } = await client.query(
        `SELECT accepted_at FROM inviti WHERE id = $1`, [invitoId]
      )
      expect(inv.accepted_at).toBeNull()

      const { rows: [dopo] } = await client.query(
        `SELECT laboratorio_id FROM utenti WHERE id = $1`, [utenteId]
      )
      expect(dopo.laboratorio_id).toBe(LAB_A)
    })
  })

  it('② controprova: chi NON ha firmato cambia lab normalmente', async () => {
    await withRollback(async (client) => {
      const { id: utenteId, email } = await utenteUsaEGetta(client, LAB_A)
      const labB = await laboratorioUsaEGetta(client)
      const { token } = await invitoPer(client, labB, email)

      const { rows: [ris] } = await accetta(client, token, utenteId, email)
      expect(ris.r.ok).toBe(true)
      expect(ris.r.laboratorio_id).toBe(labB)

      const { rows: [dopo] } = await client.query(
        `SELECT laboratorio_id FROM utenti WHERE id = $1`, [utenteId]
      )
      expect(dopo.laboratorio_id).toBe(labB)
    })
  })

  it('③ controprova: il re-accept nello STESSO lab resta possibile anche per chi ha firmato', async () => {
    // Postgres non ricontrolla la FK referenziata se la coppia (id, lab) non cambia.
    await withRollback(async (client) => {
      const { id: utenteId, email } = await utenteUsaEGetta(client, LAB_A)
      await avvisoFirmatoDa(client, utenteId)
      const { token } = await invitoPer(client, LAB_A, email)

      const { rows: [ris] } = await accetta(client, token, utenteId, email)
      expect(ris.r.ok).toBe(true)
      expect(ris.r.laboratorio_id).toBe(LAB_A)
    })
  })

  it('④ il catalogo: search_path resta agganciato alla funzione (CREATE OR REPLACE lo aveva perso in silenzio)', async () => {
    // `CREATE OR REPLACE` scarta i SET applicati con ALTER: la 20260811162235
    // aveva perso il pin dell'hardening 20260704190000 (provato: proconfig
    // null sul catalogo, ri-revisione finale 11/08). Ripristinato dalla
    // 20260811164953 — e questa prova impedisce che si riperda in silenzio.
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT p.proconfig
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'accept_invite_atomic'`)
      expect(rows).toHaveLength(1)
      expect(rows[0].proconfig).toEqual(
        expect.arrayContaining([expect.stringMatching(/^search_path=/)])
      )
    })
  })
})
