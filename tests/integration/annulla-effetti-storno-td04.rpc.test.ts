import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Gemello di emetti-nota-credito-atomica.rpc.test.ts, dedicato al RIFIUTO SdI
// del TD04. Quando un TD04 passa a stato_sdi='rifiutata' il trigger
// trg_fatture_td04_rifiutata annulla ATOMICAMENTE gli effetti dello storno:
//   1. stornata_at=NULL sull'originale (ri-stornabile), salvo collisione con
//      fatture_lavoro_attiva_unique → in quel caso evento 'collisione_rifatturazione';
//   2. il credito da storno è neutralizzato da un CONTRO-MOVIMENTO A DELTA
//      'annullo_storno' — il ledger è APPEND-ONLY, il movimento 'storno' NON
//      viene mai eliminato;
//   3. lavoro ripristinato allo stato «già fatturato» (incluso_in_fattura=true,
//      decisione_fatturazione='fatturare');
//   4. MDR intoccato (stato/conformato/data_consegna_effettiva);
//   5. evento di audit 'annullo_credito_storno' con l'importo nel payload.
// Nessun writer applicativo setta 'rifiutata' oggi → trigger DB (protegge anche
// gli update manuali dalla dashboard Supabase).
//
// 🛑 IL DELETE NON ESISTE PIÙ — decisione D-2, spec
//    docs/superpowers/specs/2026-07-15-riconciliazioni-ricevute-pec-design.md §6.
//    Il DELETE fu sostituito dal contro-movimento a delta (migration
//    20260716091000_annullo_storno_trigger_delta.sql) perché la guardia «a
//    esistenza» rompeva il ciclo legittimo storno→rifiuto→ri-storno→rifiuto,
//    lasciando CREDITO FANTASMA dal secondo ciclo in poi (bloccante panel).
//    Invariante che regge tutto: delta = SUM(storno) − SUM(annullo_storno),
//    che torna a 0 dopo ogni rifiuto e non va mai sotto zero.
//    Il saldo cliente segue src/lib/contabilita/saldo.ts:57.
//
// ⚠️ now() è COSTANTE dentro una transazione: qui si gira in withRollback,
//    quindi created_at è identico su tutte le righe. Nessuna asserzione ordina
//    o distingue i movimenti per created_at — si contano e si sommano.

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

/**
 * Fotografia del ledger credito legato a UN originale: conteggi, somme e il
 * DELTA — che è l'invariante vera del disegno D-2, non il numero di righe.
 */
async function ledgerStorno(client: Client, originaleId: string) {
  const { rows: [r] } = await client.query(
    `SELECT count(*) FILTER (WHERE tipo = 'storno')::int         AS storni,
            count(*) FILTER (WHERE tipo = 'annullo_storno')::int AS annulli,
            COALESCE(SUM(importo) FILTER (WHERE tipo = 'storno'), 0)::float8         AS somma_storni,
            COALESCE(SUM(importo) FILTER (WHERE tipo = 'annullo_storno'), 0)::float8 AS somma_annulli
       FROM credito_clienti_movimenti
      WHERE laboratorio_id = $1 AND fattura_id = $2`,
    [LAB_E2E_ID, originaleId]
  )
  return {
    storni: r.storni as number,
    annulli: r.annulli as number,
    sommaStorni: r.somma_storni as number,
    sommaAnnulli: r.somma_annulli as number,
    delta: (r.somma_storni as number) - (r.somma_annulli as number),
  }
}

/**
 * Saldo credito del cliente con la STESSA formula dei lettori applicativi
 * (`src/lib/contabilita/saldo.ts:57`): se il trigger e il lettore divergono,
 * qui si vede — ed è l'unico posto dove si vedrebbe.
 */
async function saldoCliente(client: Client, clienteId: string) {
  const { rows: [r] } = await client.query(
    `SELECT (  COALESCE(SUM(importo) FILTER (WHERE tipo = 'eccedenza'), 0)
             + COALESCE(SUM(importo) FILTER (WHERE tipo = 'storno'), 0)
             - COALESCE(SUM(importo) FILTER (WHERE tipo = 'applicazione'), 0)
             - COALESCE(SUM(importo) FILTER (WHERE tipo = 'rimborso'), 0)
             - COALESCE(SUM(importo) FILTER (WHERE tipo = 'annullo_storno'), 0)
            )::float8 AS saldo
       FROM credito_clienti_movimenti
      WHERE laboratorio_id = $1 AND cliente_id = $2`,
    [LAB_E2E_ID, clienteId]
  )
  return r.saldo as number
}

/** Eventi di audit scritti dal trigger su un originale (spec §6.1 e §6.3). */
async function eventiTrigger(client: Client, originaleId: string) {
  const { rows } = await client.query(
    `SELECT motivo, lista_errori FROM fatture_sdi_eventi
      WHERE laboratorio_id = $1 AND fattura_id = $2 AND origine = 'trigger_td04'`,
    [LAB_E2E_ID, originaleId]
  )
  return rows as Array<{ motivo: string; lista_errori: { importo?: number; td04_id?: string } | null }>
}

describe.skipIf(skipIntegrationTests)('trigger rifiuto TD04 — annulla effetti storno (DB reale)', () => {
  it('rifiuto TD04: stornata_at azzerato, credito neutralizzato dal contro-movimento annullo_storno (delta 0, storno MAI eliminato), lavoro ripristinato, MDR intatto, evento di audit scritto', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const lavoroId = await creaLavoroConsegnato(client, clienteId)
      const originaleId = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 100, lavoroId,
      })
      // imponibile 100 + bollo 2 (> 77,47) + IVA 0 (natura N4) = totale 102,
      // incassato per intero → il TD04 genera credito 102 al cliente.
      await pagaFattura(client, originaleId, 102)
      const td04Id = await emettiTd04(client, originaleId)

      // Pre-condizioni: storno effettuato, credito 102 spendibile
      const { rows: [pre] } = await client.query(
        `SELECT stornata_at IS NOT NULL AS stornata FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(pre.stornata).toBe(true)
      const preLedger = await ledgerStorno(client, originaleId)
      expect(preLedger).toMatchObject({ storni: 1, annulli: 0, sommaStorni: 102, delta: 102 })
      expect(await saldoCliente(client, clienteId)).toBe(102)

      // Rifiuto SdI
      await rifiuta(client, td04Id)

      // 1. Originale ri-stornabile
      const { rows: [orig] } = await client.query(
        `SELECT stornata_at FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(orig.stornata_at).toBeNull()

      // 2. Ledger APPEND-ONLY: lo 'storno' resta, l'annullo lo neutralizza a delta.
      const post = await ledgerStorno(client, originaleId)
      expect(post.storni).toBe(1)          // 🛑 MAI eliminato (D-2)
      expect(post.annulli).toBe(1)
      expect(post.sommaAnnulli).toBe(102)  // importo = delta al momento del rifiuto
      expect(post.delta).toBe(0)
      // …e il credito non è più spendibile secondo la formula dei lettori.
      expect(await saldoCliente(client, clienteId)).toBe(0)

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

      // 5. Evento di audit con l'importo annullato e il TD04 che l'ha causato
      const eventi = await eventiTrigger(client, originaleId)
      expect(eventi.map((e) => e.motivo)).toEqual(['annullo_credito_storno'])
      expect(eventi[0].lista_errori).toMatchObject({ importo: 102, td04_id: td04Id })
    })
  })

  it('originale senza credito: rifiuto azzera stornata_at e NON scrive alcun annullo_storno (guardia v_delta > 0)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const originaleId = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 50, // non incassata → nessun credito da storno
      })
      const td04Id = await emettiTd04(client, originaleId)
      expect(await ledgerStorno(client, originaleId)).toMatchObject({ storni: 0, delta: 0 })

      await rifiuta(client, td04Id)

      const { rows: [orig] } = await client.query(
        `SELECT stornata_at FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(orig.stornata_at).toBeNull()

      // delta = 0 → nessun contro-movimento e nessun evento: il trigger non
      // deve inventare un annullo da zero (né un saldo negativo).
      expect(await ledgerStorno(client, originaleId)).toMatchObject({ storni: 0, annulli: 0, delta: 0 })
      expect(await saldoCliente(client, clienteId)).toBe(0)
      expect(await eventiTrigger(client, originaleId)).toEqual([])
    })
  })

  it('doppio ciclo storno→rifiuto→ri-storno→rifiuto: il secondo annullo scatta lo stesso (nessun credito fantasma) e i tocchi che non devono innescare non innescano', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client)
      const originaleId = await creaFatturaOriginale(client, clienteId, {
        statoSdi: 'accettata', imponibile: 100,
      })
      await pagaFattura(client, originaleId, 102)
      const td04Id = await emettiTd04(client, originaleId)

      await rifiuta(client, td04Id)
      expect(await ledgerStorno(client, originaleId)).toMatchObject({
        storni: 1, annulli: 1, sommaStorni: 102, sommaAnnulli: 102, delta: 0,
      })

      // Re-storno sull'originale (ora ri-stornabile) → SECONDO movimento storno.
      // 🛑 Il primo NON è stato eliminato: il ledger è append-only, quindi i
      //    movimenti 'storno' salgono a 2 e restano 2 per sempre. È l'opposto
      //    di quanto asseriva questo test prima della correzione del disegno.
      const nuovoTd04 = await emettiTd04(client, originaleId, 'secondo storno')
      expect(await ledgerStorno(client, originaleId)).toMatchObject({
        storni: 2, annulli: 1, sommaStorni: 204, sommaAnnulli: 102, delta: 102,
      })
      expect(await saldoCliente(client, clienteId)).toBe(102) // credito del secondo storno

      // Ri-SET stato_sdi='rifiutata' sul PRIMO td04 (OLD già 'rifiutata') →
      // il WHEN OLD.stato_sdi IS DISTINCT FROM 'rifiutata' è falso → non
      // ri-innesca, e il credito del re-storno resta intatto.
      await client.query(
        `UPDATE fatture SET stato_sdi = 'rifiutata' WHERE id = $1`, [td04Id]
      )
      expect(await ledgerStorno(client, originaleId)).toMatchObject({ annulli: 1, delta: 102 })

      // Update su colonna diversa da stato_sdi → AFTER UPDATE OF stato_sdi non
      // scatta nemmeno (trigger a scope di colonna).
      await client.query(
        `UPDATE fatture SET causale_storno = 'tocco innocuo' WHERE id = $1`, [td04Id]
      )
      expect(await ledgerStorno(client, originaleId)).toMatchObject({ annulli: 1, delta: 102 })

      // 🔑 IL CASO CHE HA IMPOSTO IL DELTA (bloccante panel): rifiutando il
      //    secondo TD04, una guardia «a esistenza» (NOT EXISTS su annullo_storno)
      //    avrebbe visto l'annullo del PRIMO ciclo e saltato — lasciando 102 di
      //    credito fantasma spendibile. Col delta scatta, e il saldo torna a 0.
      await rifiuta(client, nuovoTd04)
      expect(await ledgerStorno(client, originaleId)).toMatchObject({
        storni: 2, annulli: 2, sommaStorni: 204, sommaAnnulli: 204, delta: 0,
      })
      expect(await saldoCliente(client, clienteId)).toBe(0)

      const eventi = await eventiTrigger(client, originaleId)
      expect(eventi.filter((e) => e.motivo === 'annullo_credito_storno')).toHaveLength(2)
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

      // A annullato: delta a zero, storno conservato
      const { rows: [a] } = await client.query(
        `SELECT stornata_at FROM fatture WHERE id = $1`, [origA]
      )
      expect(a.stornata_at).toBeNull()
      expect(await ledgerStorno(client, origA)).toMatchObject({ storni: 1, annulli: 1, delta: 0 })

      // B intatto: nessun contro-movimento, credito ancora vivo
      const { rows: [b] } = await client.query(
        `SELECT stornata_at IS NOT NULL AS stornata FROM fatture WHERE id = $1`, [origB]
      )
      expect(b.stornata).toBe(true)
      expect(await ledgerStorno(client, origB)).toMatchObject({
        storni: 1, annulli: 0, sommaStorni: 102, delta: 102,
      })
      expect(await eventiTrigger(client, origB)).toEqual([])

      // Saldo del cliente = solo il credito di B (quello di A è neutralizzato)
      expect(await saldoCliente(client, clienteId)).toBe(102)
    })
  })

  it('collisione fatture_lavoro_attiva_unique: se il lavoro è già ri-fatturato su un nuovo TD01, il rifiuto NON crasha — rifiuto registrato, credito annullato, stornata_at resta valorizzato ed è tracciato da un evento', async () => {
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

      // Credito annullato comunque (il TD04 non è mai esistito fiscalmente):
      // il ramo credito è indipendente dal ramo stornata_at.
      expect(await ledgerStorno(client, originaleId)).toMatchObject({
        storni: 1, annulli: 1, sommaAnnulli: 102, delta: 0,
      })
      expect(await saldoCliente(client, clienteId)).toBe(0)

      // stornata_at resta valorizzato: azzerarlo colliderebbe con il nuovo TD01
      // → gestione manuale, ma non più muta: c'è l'evento (spec §6.1).
      const { rows: [orig] } = await client.query(
        `SELECT stornata_at IS NOT NULL AS stornata FROM fatture WHERE id = $1`, [originaleId]
      )
      expect(orig.stornata).toBe(true)

      const motivi = (await eventiTrigger(client, originaleId)).map((e) => e.motivo).sort()
      expect(motivi).toEqual(['annullo_credito_storno', 'collisione_rifatturazione'])
    })
  })
})
