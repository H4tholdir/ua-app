import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Riga 59 della coda (revisione finale di ramo, 11/08/2026): comunicato_da era
// una FK SEMPLICE verso utenti(id) — la chiusura poteva essere attribuita a un
// utente di UN ALTRO laboratorio (`provato:` P6b, 11/08: la firma si spostava
// perfino su un utente con laboratorio_id NULL). Il rimedio è il modello già
// applicato tre volte da 20260806142910: UNIQUE (id, laboratorio_id) sul padre
// e FK composita (comunicato_da, laboratorio_id) sul figlio.
//
// ⚠️ Helper locali RICOPIATI da avvisi-chiusura-one-way.rpc.test.ts
// (riferimentiVeri, attesoRifiuto, inserisci): è la convenzione viva di
// tests/integration/ (ogni file è autosufficiente). La loro estrazione in
// helpers/ è pulizia da riferire, non da fare qui (R-E2).

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

async function riferimentiVeri(client: Client) {
  const { rows } = await client.query(
    `SELECT (SELECT id FROM lavori   WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS lavoro_id,
            (SELECT id FROM clienti  WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS cliente_id,
            (SELECT id FROM dichiarazioni_conformita WHERE laboratorio_id = $1
              ORDER BY created_at LIMIT 1) AS dichiarazione_id,
            (SELECT id FROM utenti   WHERE laboratorio_id = $1 ORDER BY created_at LIMIT 1) AS utente_id`,
    [LAB_A]
  )
  const r = rows[0]
  for (const [nome, valore] of Object.entries(r)) {
    if (!valore) throw new Error(`il lab E2E ${LAB_A} non ha ${nome}: eseguire scripts/seed-e2e.ts`)
  }
  return r as {
    lavoro_id: string; cliente_id: string; dichiarazione_id: string; utente_id: string
  }
}

async function attesoRifiuto(
  client: Client, cosa: string, fn: () => Promise<unknown>
): Promise<{ code: string; message: string }> {
  const sp = `sp_${randomUUID().replace(/-/g, '').slice(0, 12)}`
  await client.query(`SAVEPOINT ${sp}`)
  try {
    await fn()
    throw new Error(`ATTESO RIFIUTO, INVECE ACCETTATO: ${cosa}`)
  } catch (e) {
    const err = e as Error & { code?: string }
    if (err.message.startsWith('ATTESO RIFIUTO')) {
      await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
      throw err
    }
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
    return { code: err.code ?? '', message: err.message.split('\n')[0] }
  }
}

function inserisci(
  client: Client,
  rif: { lavoro_id: string; cliente_id: string; dichiarazione_id: string },
  campi: Record<string, unknown>
) {
  const base: Record<string, unknown> = {
    laboratorio_id: LAB_A,
    lavoro_id: rif.lavoro_id,
    cliente_id: rif.cliente_id,
    dichiarazione_id: rif.dichiarazione_id,
    ...campi,
  }
  const nomi = Object.keys(base)
  const segnaposti = nomi.map((_, i) => `$${i + 1}`).join(', ')
  return client.query(
    `INSERT INTO public.avvisi_dentista (${nomi.join(', ')}) VALUES (${segnaposti})
     RETURNING id, stato, testo_inviato, comunicato_at, comunicato_da, visto_dal_dentista_at, campi_corretti`,
    Object.values(base)
  )
}

/** Un utente vero usa-e-getta, nel laboratorio scelto (ricetta avvisi-dentista-schema:335). */
async function utenteUsaEGetta(
  client: Parameters<Parameters<typeof withRollback>[0]>[0],
  laboratorioId: string | null,
  ruolo = 'tecnico'
) {
  const id = randomUUID()
  await client.query(`INSERT INTO auth.users (id) VALUES ($1)`, [id])
  await client.query(
    `INSERT INTO public.utenti (id, laboratorio_id, nome, cognome, ruolo)
     VALUES ($1, $2, 'Usa', 'E getta', $3)`, [id, laboratorioId, ruolo]
  )
  return id
}

describe.skipIf(skipIntegrationTests)('avvisi_dentista — la firma è dello stesso laboratorio (riga 59)', () => {
  // ── il catalogo: i due vincoli nuovi esistono, il vecchio non c'è più ─────
  it('① utenti ha il vincolo UNIQUE (id, laboratorio_id) — il bersaglio delle composite', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='public.utenti'::regclass AND conname='utenti_id_lab_uk'`)
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toBe('UNIQUE (id, laboratorio_id)')
    })
  })

  it('② la FK di comunicato_da è COMPOSITA e punta a utenti (id, laboratorio_id)', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='public.avvisi_dentista'::regclass
            AND conname='avvisi_dentista_comunicato_da_fk'`)
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toBe(
        'FOREIGN KEY (comunicato_da, laboratorio_id) REFERENCES utenti(id, laboratorio_id)')
    })
  })

  it('③ la vecchia FK semplice non esiste più', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_constraint
          WHERE conrelid='public.avvisi_dentista'::regclass
            AND conname='avvisi_dentista_comunicato_da_fkey'`)
      expect(rows).toHaveLength(0)
    })
  })

  // ── il comportamento: la coppia deve esistere in utenti ───────────────────
  it('④ la firma di un utente di UN ALTRO laboratorio è respinta con 23503', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const labB = randomUUID()
      await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [
        labB, 'Lab B — prova firma cross-tenant',
      ])
      const utenteB = await utenteUsaEGetta(client, labB)
      const e = await attesoRifiuto(client, 'avviso del lab A firmato dal lab B', () =>
        inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: utenteB,
        })
      )
      expect(e.code).toBe('23503')
      expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
    })
  })

  it('⑤ la firma di un admin_sistema senza laboratorio è respinta con 23503', async () => {
    // laboratorio_id NULL è legale per admin_sistema (CHECK
    // utenti_lab_required_for_non_admin) — ma la coppia (id, NULL) non esiste
    // per la FK. Coerente con D342: admin_rete e admin_sistema sono già
    // esclusi PER NOME dalla chiusura (RUOLI_CHIUSURA_AVVISO, ruoli.ts:72).
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const admin = await utenteUsaEGetta(client, null, 'admin_sistema')
      const e = await attesoRifiuto(client, 'avviso firmato da un admin senza lab', () =>
        inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: admin,
        })
      )
      expect(e.code).toBe('23503')
      expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
    })
  })

  // ── le controprove ────────────────────────────────────────────────────────
  it('⑥ la firma di un utente DELLO STESSO laboratorio passa', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const utenteA = await utenteUsaEGetta(client, LAB_A)
      const { rows } = await inserisci(client, rif, {
        stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: utenteA,
      })
      expect(rows[0].comunicato_da).toBe(utenteA)
    })
  })

  it('⑦ un avviso APERTO (comunicato_da NULL) nasce ancora: MATCH SIMPLE non morde sui NULL', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const { rows } = await inserisci(client, rif, { stato: 'da_comunicare' })
      expect(rows[0].stato).toBe('da_comunicare')
      expect(rows[0].comunicato_da).toBeNull()
    })
  })
})
