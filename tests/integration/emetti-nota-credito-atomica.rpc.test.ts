import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Lab E2E dedicato — mai il lab Filippo (stesso pattern di
// salva-fasi-ciclo-atomico.rpc.test.ts).
const LAB_E2E_ID = '00000000-0000-0000-0000-000000000001'

function progressivoUnico() {
  // Range alto per non collidere con la numerazione reale del lab E2E
  // (parte da 1 e incrementa normalmente) — la transazione viene comunque
  // sempre annullata da withRollback.
  return 500000 + (parseInt(randomUUID().replace(/-/g, '').slice(0, 6), 16) % 400000)
}

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

async function creaCliente(client: Client) {
  const clienteId = randomUUID()
  await client.query(
    `INSERT INTO clienti (id, laboratorio_id, nome, cognome)
     VALUES ($1, $2, 'Studio', 'Test Integrazione')`,
    [clienteId, LAB_E2E_ID]
  )
  return clienteId
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
  const { rows: [fattura] } = await client.query(
    `SELECT id, numero, data::text AS data, imponibile FROM fatture WHERE id = $1`,
    [fatturaId]
  )
  return fattura as { id: string; numero: string; data: string; imponibile: string }
}

async function creaLavoroConsegnato(client: Client, clienteId: string) {
  const lavoroId = randomUUID()
  await client.query(
    `INSERT INTO lavori (
       id, laboratorio_id, numero_lavoro, cliente_id, tipo_dispositivo, descrizione,
       data_consegna_prevista, stato, conformato, data_consegna_effettiva,
       incluso_in_fattura, decisione_fatturazione
     ) VALUES ($1, $2, $3, $4, 'protesi_fissa', 'Corona test integrazione',
       CURRENT_DATE, 'consegnato', true, '2026-07-01 10:00:00+00',
       true, 'fatturare')`,
    [lavoroId, LAB_E2E_ID, `TEST-${lavoroId.slice(0, 8)}`, clienteId]
  )
  return lavoroId
}

describe.skipIf(skipIntegrationTests)('emetti_nota_credito_atomica — comportamento reale (RPC, non mock)', () => {
  it('originale inesistente → non_trovato, nessuna riga TD04 creata', async () => {
    await withRollback(async (client) => {
      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [randomUUID(), 'causale test', LAB_E2E_ID]
      )
      expect(result.result).toEqual({ esito: 'non_trovato' })
    })
  })

  it('stato_sdi non ammesso (draft) → non_stornabile, stornata_at resta NULL', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const orig = await creaFatturaOriginale(client, clienteId, { statoSdi: 'draft', imponibile: 100 })

      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'causale test', LAB_E2E_ID]
      )
      expect(result.result).toEqual({ esito: 'non_stornabile' })

      const { rows: [check] } = await client.query(
        `SELECT stornata_at FROM fatture WHERE id = $1`, [orig.id]
      )
      expect(check.stornata_at).toBeNull()
    })
  })

  it('claim-first: seconda chiamata sullo stesso originale → non_stornabile (winner-takes-all)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const orig = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 100 })

      const { rows: [primo] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'prima chiamata', LAB_E2E_ID]
      )
      expect(primo.result.esito).toBe('ok')

      const { rows: [secondo] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'seconda chiamata', LAB_E2E_ID]
      )
      expect(secondo.result).toEqual({ esito: 'non_stornabile' })

      const { rows: tutte } = await client.query(
        `SELECT count(*)::int AS n FROM fatture WHERE fattura_collegata_id = $1`, [orig.id]
      )
      expect(tutte[0].n).toBe(1)
    })
  })

  it('esito ok senza lavoro: draft TD04 con snapshot corretto (data=current_date, collegata_data=originale.data, imponibile=originale.imponibile)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const orig = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 150.5 })

      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'reso materiale non conforme', LAB_E2E_ID]
      )
      expect(result.result.esito).toBe('ok')
      const td04Id = result.result.td04_id
      expect(td04Id).toBeTruthy()

      const { rows: [td04] } = await client.query(
        `SELECT tipo_documento, stato_sdi, lavoro_id,
                data = CURRENT_DATE AS data_is_oggi,
                collegata_data::text AS collegata_data, collegata_numero,
                imponibile::text AS imponibile, causale_storno,
                fattura_collegata_id, totale::text AS totale, bollo::text AS bollo
         FROM fatture WHERE id = $1`,
        [td04Id]
      )
      expect(td04.tipo_documento).toBe('TD04')
      expect(td04.stato_sdi).toBe('draft')
      expect(td04.lavoro_id).toBeNull()
      expect(td04.data_is_oggi).toBe(true)
      expect(td04.collegata_data).toBe(orig.data)
      expect(td04.collegata_numero).toBe(orig.numero)
      expect(td04.imponibile).toBe(orig.imponibile)
      expect(td04.causale_storno).toBe('reso materiale non conforme')
      expect(td04.fattura_collegata_id).toBe(orig.id)
      // imponibile 150.5 > 77.47 → bollo 2.00 (trigger trg_fatture_bollo, config default)
      expect(td04.bollo).toBe('2.00')
      expect(td04.totale).toBe('152.50')

      const { rows: [origDopo] } = await client.query(
        `SELECT stornata_at IS NOT NULL AS stornata FROM fatture WHERE id = $1`, [orig.id]
      )
      expect(origDopo.stornata).toBe(true)
    })
  })

  it('imponibile sotto soglia bollo (<=77.47) → bollo 0', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const orig = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 50 })

      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'causale', LAB_E2E_ID]
      )
      const { rows: [td04] } = await client.query(
        `SELECT bollo::text AS bollo, totale::text AS totale FROM fatture WHERE id = $1`,
        [result.result.td04_id]
      )
      expect(td04.bollo).toBe('0.00')
      expect(td04.totale).toBe('50.00')
    })
  })

  it('esito ok con lavoro collegato: reset SOLO fiscale, MDR intatto (stato/conformato/data_consegna_effettiva invariati)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const lavoroId = await creaLavoroConsegnato(client, clienteId)
      const orig = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 100, lavoroId,
      })

      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'causale', LAB_E2E_ID]
      )
      expect(result.result.esito).toBe('ok')

      const { rows: [lavoro] } = await client.query(
        `SELECT incluso_in_fattura, decisione_fatturazione, stato, conformato,
                data_consegna_effettiva IS NOT NULL AS ha_data_consegna
         FROM lavori WHERE id = $1`,
        [lavoroId]
      )
      expect(lavoro.incluso_in_fattura).toBe(false)
      expect(lavoro.decisione_fatturazione).toBe('in_attesa')
      // MDR: NON toccare stato/conformato/data_consegna_effettiva/dichiarazioni_conformita
      expect(lavoro.stato).toBe('consegnato')
      expect(lavoro.conformato).toBe(true)
      expect(lavoro.ha_data_consegna).toBe(true)
    })
  })

  it('originale incassata (pagamenti attivi + applicazione credito) → movimento storno per il totale incassato; gli annullati non contano', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const orig = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 100 })

      const { rows: [utente] } = await client.query(
        `SELECT id FROM utenti WHERE laboratorio_id = $1 LIMIT 1`, [LAB_E2E_ID]
      )
      // pagamento attivo 60 + applicazione credito 40 = incassato 100;
      // il pagamento annullato da 30 NON deve contare.
      await client.query(
        `INSERT INTO pagamenti (laboratorio_id, fattura_id, importo, metodo, data_pagamento, stato, registrato_da)
         VALUES ($1, $2, 60, 'contanti', CURRENT_DATE, 'attivo', $3),
                ($1, $2, 30, 'contanti', CURRENT_DATE, 'annullato', $3)`,
        [LAB_E2E_ID, orig.id, utente.id]
      )
      await client.query(
        `INSERT INTO credito_clienti_movimenti (laboratorio_id, cliente_id, tipo, importo, fattura_id, registrato_da)
         VALUES ($1, $2, 'applicazione', 40, $3, $4)`,
        [LAB_E2E_ID, clienteId, orig.id, utente.id]
      )

      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'storno fattura pagata', LAB_E2E_ID]
      )
      expect(result.result.esito).toBe('ok')

      const { rows: storni } = await client.query(
        `SELECT importo::text AS importo, pagamento_id, fattura_id, lavoro_id, registrato_da
         FROM credito_clienti_movimenti
         WHERE laboratorio_id = $1 AND cliente_id = $2 AND tipo = 'storno'`,
        [LAB_E2E_ID, clienteId]
      )
      expect(storni).toHaveLength(1)
      expect(storni[0].importo).toBe('100.00')
      expect(storni[0].pagamento_id).toBeNull()
      expect(storni[0].fattura_id).toBe(orig.id)
      expect(storni[0].lavoro_id).toBeNull()
      expect(storni[0].registrato_da).toBeNull() // sistema
    })
  })

  it('originale mai incassata → nessun movimento storno', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const orig = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 100 })

      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'storno fattura non pagata', LAB_E2E_ID]
      )
      expect(result.result.esito).toBe('ok')

      const { rows: [count] } = await client.query(
        `SELECT count(*)::int AS n FROM credito_clienti_movimenti
         WHERE laboratorio_id = $1 AND cliente_id = $2 AND tipo = 'storno'`,
        [LAB_E2E_ID, clienteId]
      )
      expect(count.n).toBe(0)
    })
  })

  it('laboratorio diverso → non_trovato (isolamento tenant)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const orig = await creaFatturaOriginale(client, clienteId, { statoSdi: 'accettata', imponibile: 100 })

      const altroLab = randomUUID()
      const { rows: [result] } = await client.query(
        `SELECT emetti_nota_credito_atomica($1, $2, $3) AS result`,
        [orig.id, 'causale', altroLab]
      )
      expect(result.result).toEqual({ esito: 'non_trovato' })

      const { rows: [check] } = await client.query(
        `SELECT stornata_at FROM fatture WHERE id = $1`, [orig.id]
      )
      expect(check.stornata_at).toBeNull()
    })
  })
})
