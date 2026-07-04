import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Lab E2E dedicato — mai il lab Filippo. Stessi id già usati per le
// verifiche manuali durante B18.
const LAB_E2E_ID = '00000000-0000-0000-0000-000000000001'
const USER_E2E_ID = '33d98966-71f8-4600-ba60-7cc6499afe5b'

async function creaCiclo(client: Parameters<Parameters<typeof withRollback>[0]>[0]) {
  const cicloId = randomUUID()
  await client.query(
    `INSERT INTO cicli_produzione (id, laboratorio_id, codice, nome, tipo_dispositivo)
     VALUES ($1, $2, $3, $4, $5)`,
    [cicloId, LAB_E2E_ID, `TEST-${cicloId.slice(0, 8)}`, 'Ciclo test integrazione', 'protesi_fissa']
  )
  return cicloId
}

describe.skipIf(skipIntegrationTests)('salva_fasi_ciclo_atomico — comportamento reale (RPC, non mock)', () => {
  it('un batch di fasi nuove resta attivo dopo il salvataggio — avrebbe rilevato il bug B18', async () => {
    await withRollback(async (client) => {
      const cicloId = await creaCiclo(client)

      const { rows: [result] } = await client.query(
        `SELECT salva_fasi_ciclo_atomico($1, $2, $3, $4) AS result`,
        [cicloId, LAB_E2E_ID, USER_E2E_ID, JSON.stringify([
          { codice_fase: 'OL01', descrizione: 'Ricevimento' },
          { codice_fase: 'OL02', descrizione: 'Disinfezione' },
        ])]
      )
      expect(result.result.ok).toBe(true)

      const { rows: fasi } = await client.query(
        `SELECT codice_fase, deleted_at FROM fasi_produzione WHERE ciclo_id = $1 ORDER BY codice_fase`,
        [cicloId]
      )
      expect(fasi).toHaveLength(2)
      expect(fasi.every((f) => f.deleted_at === null)).toBe(true)
    })
  })

  it('batch misto: fase aggiornata + fase nuova restano attive, fase omessa viene rimossa', async () => {
    await withRollback(async (client) => {
      const cicloId = await creaCiclo(client)
      const fase1Id = randomUUID()
      const fase2Id = randomUUID()
      await client.query(
        `INSERT INTO fasi_produzione (id, ciclo_id, laboratorio_id, ordine, codice_fase, descrizione, updated_by)
         VALUES ($1, $2, $3, 1, 'F1', 'Fase 1 originale', $4),
                ($5, $2, $3, 2, 'F2', 'Fase 2 originale (da rimuovere)', $4)`,
        [fase1Id, cicloId, LAB_E2E_ID, USER_E2E_ID, fase2Id]
      )

      const { rows: [result] } = await client.query(
        `SELECT salva_fasi_ciclo_atomico($1, $2, $3, $4) AS result`,
        [cicloId, LAB_E2E_ID, USER_E2E_ID, JSON.stringify([
          { id: fase1Id, codice_fase: 'F1', descrizione: 'Fase 1 aggiornata' },
          { codice_fase: 'F3', descrizione: 'Fase 3 nuova' },
        ])]
      )
      expect(result.result.ok).toBe(true)

      const { rows: fasi } = await client.query(
        `SELECT codice_fase, descrizione, (deleted_at IS NOT NULL) AS soft_deleted
         FROM fasi_produzione WHERE ciclo_id = $1 ORDER BY codice_fase`,
        [cicloId]
      )
      expect(fasi).toEqual([
        { codice_fase: 'F1', descrizione: 'Fase 1 aggiornata', soft_deleted: false },
        { codice_fase: 'F2', descrizione: 'Fase 2 originale (da rimuovere)', soft_deleted: true },
        { codice_fase: 'F3', descrizione: 'Fase 3 nuova', soft_deleted: false },
      ])
    })
  })

  it('riuso di un codice_fase appena rimosso in una richiesta successiva → nessun errore (indice parziale B18.2)', async () => {
    await withRollback(async (client) => {
      const cicloId = await creaCiclo(client)

      await client.query(
        `SELECT salva_fasi_ciclo_atomico($1, $2, $3, $4)`,
        [cicloId, LAB_E2E_ID, USER_E2E_ID, JSON.stringify([{ codice_fase: 'RIUSO', descrizione: 'Prima versione' }])]
      )
      await client.query(
        `SELECT salva_fasi_ciclo_atomico($1, $2, $3, $4)`,
        [cicloId, LAB_E2E_ID, USER_E2E_ID, JSON.stringify([])]
      )
      const { rows: [result] } = await client.query(
        `SELECT salva_fasi_ciclo_atomico($1, $2, $3, $4) AS result`,
        [cicloId, LAB_E2E_ID, USER_E2E_ID, JSON.stringify([{ codice_fase: 'RIUSO', descrizione: 'Riusata dopo rimozione' }])]
      )

      expect(result.result.ok).toBe(true)
      const { rows: fasi } = await client.query(
        `SELECT descrizione, (deleted_at IS NOT NULL) AS soft_deleted
         FROM fasi_produzione WHERE ciclo_id = $1 AND codice_fase = 'RIUSO' ORDER BY created_at`,
        [cicloId]
      )
      expect(fasi.filter((f) => !f.soft_deleted)).toEqual([
        { descrizione: 'Riusata dopo rimozione', soft_deleted: false },
      ])
    })
  })

  it('ciclo di un altro laboratorio → { ok: false }, nessuna scrittura', async () => {
    await withRollback(async (client) => {
      const result = await client.query(
        `SELECT salva_fasi_ciclo_atomico($1, $2, $3, $4) AS result`,
        [randomUUID(), LAB_E2E_ID, USER_E2E_ID, JSON.stringify([{ codice_fase: 'X', descrizione: 'Y' }])]
      )
      expect(result.rows[0].result).toEqual({ ok: false, error: 'Ciclo non trovato' })
    })
  })
})
