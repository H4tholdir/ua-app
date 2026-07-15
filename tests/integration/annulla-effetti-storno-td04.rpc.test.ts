import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Gemello di emetti-nota-credito-atomica.rpc.test.ts, dedicato al RIFIUTO SdI
// del TD04 (Task 8b). Quando un TD04 passa a stato_sdi='rifiutata' il trigger
// trg_fatture_td04_rifiutata annulla ATOMICAMENTE gli effetti dello storno:
//   1. stornata_at=NULL sull'originale (ri-stornabile);
//   2. movimento credito 'storno' eliminato (il TD04 non è mai esistito
//      fiscalmente);
//   3. lavoro ripristinato allo stato «già fatturato» (incluso_in_fattura=true,
//      decisione_fatturazione='fatturare');
//   4. MDR intoccato (stato/conformato/data_consegna_effettiva).
// Nessun writer applicativo setta 'rifiutata' oggi → trigger DB (protegge anche
// gli update manuali dalla dashboard Supabase).

const LAB_E2E_ID = '00000000-0000-0000-0000-000000000001'

function progressivoUnico() {
  return 500000 + (parseInt(randomUUID().replace(/-/g, '').slice(0, 6), 16) % 400000)
}

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

async function creaCliente(client: Client) {
  const clienteId = randomUUID()
  await client.query(
    `INSERT INTO clienti (id, laboratorio_id, nome, cognome)
     VALUES ($1, $2, 'Studio', 'Test Rifiuto TD04')`,
    [clienteId, LAB_E2E_ID]
  )
  return clienteId
}

async function creaLavoroConsegnato(client: Client, clienteId: string) {
  const lavoroId = randomUUID()
  await client.query(
    `INSERT INTO lavori (
       id, laboratorio_id, numero_lavoro, cliente_id, tipo_dispositivo, descrizione,
       data_consegna_prevista, stato, conformato, data_consegna_effettiva,
       incluso_in_fattura, decisione_fatturazione
     ) VALUES ($1, $2, $3, $4, 'protesi_fissa', 'Corona test rifiuto',
       CURRENT_DATE, 'consegnato', true, '2026-07-01 10:00:00+00',
       true, 'fatturare')`,
    [lavoroId, LAB_E2E_ID, `TEST-${lavoroId.slice(0, 8)}`, clienteId]
  )
  return lavoroId
}

async function creaFatturaOriginale(
  client: Client,
  clienteId: string,
  opts: { statoSdi: string; imponibile: number; lavoroId?: string | null }
) {
  const fatturaId = randomUUID()
  const anno = new Date().getFullYear()
  const progressivo = progressivoUnico()
  const numero = `${anno}-${progressivo}`
  await client.query(
    `INSERT INTO fatture (
       id, laboratorio_id, cliente_id, numero, anno, progressivo, data,
       tipo_documento, stato_sdi, imponibile,
       cliente_denominazione, cliente_indirizzo, lavoro_id
     ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'TD01', $7, $8, 'Studio Test', 'Via Test 1', $9)`,
    [fatturaId, LAB_E2E_ID, clienteId, numero, anno, progressivo, opts.statoSdi, opts.imponibile, opts.lavoroId ?? null]
  )
  return fatturaId
}

async function pagaFattura(client: Client, fatturaId: string, importo: number) {
  const { rows: [utente] } = await client.query(
    `SELECT id FROM utenti WHERE laboratorio_id = $1 LIMIT 1`, [LAB_E2E_ID]
  )
  await client.query(
    `INSERT INTO pagamenti (laboratorio_id, fattura_id, importo, metodo, data_pagamento, stato, registrato_da)
     VALUES ($1, $2, $3, 'contanti', CURRENT_DATE, 'attivo', $4)`,
    [LAB_E2E_ID, fatturaId, importo, utente.id]
  )
}

async function emettiTd04(client: Client, originaleId: string, causale = 'reso') {
  const { rows: [r] } = await client.query(
    `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
    [originaleId, causale, LAB_E2E_ID]
  )
  expect(r.result.esito).toBe('ok')
  return r.result.td04_id as string
}

async function rifiuta(client: Client, td04Id: string) {
  await client.query(
    `UPDATE fatture SET stato_sdi = 'rifiutata' WHERE id = $1`, [td04Id]
  )
}

describe.skipIf(skipIntegrationTests)('trigger rifiuto TD04 — annulla effetti storno (DB reale)', () => {
  it('rifiuto TD04: stornata_at azzerato, movimento storno eliminato, lavoro ripristinato (incluso=true, decisione=fatturare), MDR intatto', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const lavoroId = await creaLavoroConsegnato(client, clienteId)
      const originaleId = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 100, lavoroId,
      })
      await pagaFattura(client, originaleId, 102) // incassata → movimento storno creato
      const td04Id = await emettiTd04(client, originaleId)

      // Pre-condizioni: storno effettuato
      const { rows: [pre] } = await client.query(
        `SELECT stornata_at IS NOT NULL AS stornata FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(pre.stornata).toBe(true)
      const { rows: [preStorno] } = await client.query(
        `SELECT count(*)::int AS n FROM credito_clienti_movimenti
         WHERE fattura_id = $1 AND tipo = 'storno'`, [originaleId]
      )
      expect(preStorno.n).toBe(1)

      // Rifiuto SdI
      await rifiuta(client, td04Id)

      // 1. Originale ri-stornabile
      const { rows: [orig] } = await client.query(
        `SELECT stornata_at FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(orig.stornata_at).toBeNull()

      // 2. Movimento storno eliminato
      const { rows: [storno] } = await client.query(
        `SELECT count(*)::int AS n FROM credito_clienti_movimenti
         WHERE fattura_id = $1 AND tipo = 'storno'`, [originaleId]
      )
      expect(storno.n).toBe(0)

      // 3. Lavoro ripristinato allo stato «già fatturato» + 4. MDR intatto
      const { rows: [lavoro] } = await client.query(
        `SELECT incluso_in_fattura, decisione_fatturazione, stato, conformato,
                data_consegna_effettiva IS NOT NULL AS ha_data_consegna
         FROM lavori WHERE id = $1`, [lavoroId]
      )
      expect(lavoro.incluso_in_fattura).toBe(true)
      expect(lavoro.decisione_fatturazione).toBe('fatturare')
      expect(lavoro.stato).toBe('consegnato')
      expect(lavoro.conformato).toBe(true)
      expect(lavoro.ha_data_consegna).toBe(true)
    })
  })

  it('originale senza lavoro: rifiuto azzera stornata_at senza errori (nessun lavoro da ripristinare)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const originaleId = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 50, // sotto soglia → non incassata comunque
      })
      const td04Id = await emettiTd04(client, originaleId)

      await rifiuta(client, td04Id)

      const { rows: [orig] } = await client.query(
        `SELECT stornata_at FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(orig.stornata_at).toBeNull()
    })
  })

  it('doppio-rifiuto idempotente: un secondo UPDATE con stato già rifiutata non ri-innesca il trigger', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const originaleId = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 100,
      })
      await pagaFattura(client, originaleId, 102)
      const td04Id = await emettiTd04(client, originaleId)

      await rifiuta(client, td04Id)
      // Simula un re-storno sull'originale (ora ri-stornabile) → nuovo movimento
      const nuovoTd04 = await emettiTd04(client, originaleId, 'secondo storno')
      const { rows: [dopoRistorno] } = await client.query(
        `SELECT count(*)::int AS n FROM credito_clienti_movimenti
         WHERE fattura_id = $1 AND tipo = 'storno'`, [originaleId]
      )
      expect(dopoRistorno.n).toBe(1) // il primo eliminato, il secondo creato

      // Ri-SET stato_sdi='rifiutata' sul PRIMO td04 (OLD già 'rifiutata') →
      // il WHEN OLD.stato_sdi IS DISTINCT FROM 'rifiutata' è falso → non
      // ri-innesca (nessun secondo annullamento sul movimento del re-storno).
      await client.query(
        `UPDATE fatture SET stato_sdi = 'rifiutata' WHERE id = $1`, [td04Id]
      )
      // Update su colonna diversa da stato_sdi → AFTER UPDATE OF stato_sdi non
      // scatta nemmeno (trigger a scope di colonna).
      await client.query(
        `UPDATE fatture SET causale_storno = 'tocco innocuo' WHERE id = $1`, [td04Id]
      )
      const { rows: [invariato] } = await client.query(
        `SELECT count(*)::int AS n FROM credito_clienti_movimenti
         WHERE fattura_id = $1 AND tipo = 'storno'`, [originaleId]
      )
      expect(invariato.n).toBe(1) // il movimento del secondo storno NON è stato toccato

      // Rifiuto del secondo td04 → annulla di nuovo
      await rifiuta(client, nuovoTd04)
      const { rows: [dopoSecondoRifiuto] } = await client.query(
        `SELECT count(*)::int AS n FROM credito_clienti_movimenti
         WHERE fattura_id = $1 AND tipo = 'storno'`, [originaleId]
      )
      expect(dopoSecondoRifiuto.n).toBe(0)
    })
  })

  it('isolamento fra originali: il rifiuto di un TD04 non tocca lo storno di un altro originale', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const origA = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 100 })
      const origB = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 100 })
      await pagaFattura(client, origA, 102)
      await pagaFattura(client, origB, 102)
      const td04A = await emettiTd04(client, origA)
      await emettiTd04(client, origB)

      await rifiuta(client, td04A)

      // A annullato
      const { rows: [a] } = await client.query(
        `SELECT stornata_at,
                (SELECT count(*)::int FROM credito_clienti_movimenti WHERE fattura_id = $1 AND tipo='storno') AS storni
         FROM fatture WHERE id = $1`, [origA]
      )
      expect(a.stornata_at).toBeNull()
      expect(a.storni).toBe(0)

      // B intatto
      const { rows: [b] } = await client.query(
        `SELECT stornata_at IS NOT NULL AS stornata,
                (SELECT count(*)::int FROM credito_clienti_movimenti WHERE fattura_id = $1 AND tipo='storno') AS storni
         FROM fatture WHERE id = $1`, [origB]
      )
      expect(b.stornata).toBe(true)
      expect(b.storni).toBe(1)
    })
  })

  it('collisione fatture_lavoro_attiva_unique: se il lavoro è già ri-fatturato su un nuovo TD01, il rifiuto NON crasha — il rifiuto è registrato e lo storno eliminato (stornata_at resta valorizzato, gestione manuale)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const lavoroId = await creaLavoroConsegnato(client, clienteId)
      const originaleId = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 100, lavoroId,
      })
      await pagaFattura(client, originaleId, 102)
      const td04Id = await emettiTd04(client, originaleId)

      // Lavoro ri-fatturato su un NUOVO TD01 attivo (occupa lo slot dell'indice
      // parziale fatture_lavoro_attiva_unique su (lab, lavoro)).
      await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 100, lavoroId,
      })

      // Il rifiuto NON deve lanciare 23505 (altrimenti l'intero UPDATE del
      // rifiuto verrebbe annullato e il TD04 resterebbe non-rifiutato).
      await rifiuta(client, td04Id)

      // Rifiuto registrato
      const { rows: [td04] } = await client.query(
        `SELECT stato_sdi FROM fatture WHERE id = $1`, [td04Id]
      )
      expect(td04.stato_sdi).toBe('rifiutata')

      // Storno eliminato comunque (il TD04 non è mai esistito fiscalmente)
      const { rows: [storno] } = await client.query(
        `SELECT count(*)::int AS n FROM credito_clienti_movimenti
         WHERE fattura_id = $1 AND tipo = 'storno'`, [originaleId]
      )
      expect(storno.n).toBe(0)

      // stornata_at resta valorizzato: azzerarlo collideerebbe con il nuovo TD01
      // → gestione manuale (FLAG COMMERCIALISTA).
      const { rows: [orig] } = await client.query(
        `SELECT stornata_at IS NOT NULL AS stornata FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(orig.stornata).toBe(true)
    })
  })
})
