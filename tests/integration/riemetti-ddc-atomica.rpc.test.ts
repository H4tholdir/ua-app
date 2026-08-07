import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

/**
 * `riemetti_ddc_atomica` — Task 5, LA RIEMISSIONE contro il database VERO.
 * Migration: `supabase/migrations/20260807143623_riemissione_ddc.sql` (già applicata).
 * Spec §8.1 (l'ordine è portante) e §8.2 (le due colonne che mancavano).
 *
 * 🛑 PERCHÉ QUESTE PROVE NON POSSONO VIVERE NEI TEST UNITARI. Ciò che il Task 5
 * deve garantire non è «il codice chiama la funzione»: è che **le due scritture
 * siano una sola**. Quella proprietà vive nella transazione di Postgres, e una
 * finzione non ce l'ha. La prova che conta è la ⑦: si fa fallire l'inserimento e
 * si controlla che la vecchia dichiarazione sia **ancora viva**.
 *
 * ⚖️ D293 — `annullata` significa SUPERATA, mai «nulla»: la vecchia resta in
 * archivio, ed è l'unica prova che quel manufatto è esistito.
 */

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

function progressivoUnico() {
  return 800000 + (parseInt(randomUUID().replace(/-/g, '').slice(0, 6), 16) % 190000)
}

async function creaCliente(client: Client, labId: string) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO clienti (id, laboratorio_id, nome, cognome) VALUES ($1, $2, 'Studio', 'Test Riemissione')`,
    [id, labId]
  )
  return id
}

async function creaLavoroConsegnato(client: Client, labId: string, clienteId: string) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO lavori (id, laboratorio_id, numero_lavoro, cliente_id, tipo_dispositivo,
       descrizione, data_consegna_prevista, stato, conformato, data_consegna_effettiva)
     VALUES ($1, $2, $3, $4, 'protesi_fissa', 'Corona test riemissione',
       CURRENT_DATE, 'consegnato', true, now())`,
    [id, labId, `TEST-RIEM-${id.slice(0, 8)}`, clienteId]
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

async function creaDichiarazione(
  client: Client, labId: string, lavoroId: string, stato = 'generata',
  extra: { firmataAt?: boolean; inviata?: boolean; paziente?: string } = {}
) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO dichiarazioni_conformita (
       id, laboratorio_id, lavoro_id, numero_ddc, progressivo_ddc,
       fabbricante_nome, fabbricante_indirizzo, fabbricante_piva,
       prescrittore_nome, paziente_nome, tipo_dispositivo, descrizione_dispositivo,
       classe_rischio, testo_conformita, prrc_nome, stato,
       firmata_at, inviata_al_dentista, inviata_al_dentista_at
     ) VALUES ($1, $2, $3, $4, $5,
       'Lab Test', 'Via Test 1, Napoli', '00000000000',
       'Dr. Sbagliato', $6, 'protesi_fissa', 'corona test',
       'classe_i', 'testo di prova', 'PRRC Test', $7,
       $8, $9, $10)`,
    [
      id, labId, lavoroId, `DDC-TEST-${id.slice(0, 8)}`, progressivoUnico(),
      extra.paziente ?? 'Paziente Test', stato,
      extra.firmataAt ? new Date().toISOString() : null,
      extra.inviata ?? false,
      extra.inviata ? new Date().toISOString() : null,
    ]
  )
  return id
}

async function riemetti(client: Client, lavoroId: string, labId: string, eventoId: string, nuova: Record<string, unknown>) {
  const { rows } = await client.query(
    `SELECT public.riemetti_ddc_atomica($1, $2, $3, $4::jsonb) AS r`,
    [lavoroId, labId, eventoId, JSON.stringify(nuova)]
  )
  return rows[0].r as Record<string, unknown>
}

/** Il corpo minimo di una dichiarazione NUOVA: solo ciò che cambia. Tutto il
 *  resto lo eredita dalla riga vecchia — è il punto di `jsonb_populate_record`
 *  su una riga base. */
function corpoNuovo(extra: Record<string, unknown> = {}) {
  return {
    numero_ddc: `DDC-NUOVA-${randomUUID().slice(0, 8)}`,
    progressivo_ddc: progressivoUnico(),
    prescrittore_nome: 'Dr. Corretto',
    stato: 'generata',
    ...extra,
  }
}

describe.skipIf(skipIntegrationTests)('riemetti_ddc_atomica — comportamento reale sul database', () => {
  it('① annulla la vecchia CON la causale, e la nuova la SUPERA', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      const vecchia = await creaDichiarazione(client, LAB_A, lavoro)

      const r = await riemetti(client, lavoro, LAB_A, evento, corpoNuovo())
      expect(r.esito).toBe('ok')
      expect(r.vecchia_id).toBe(vecchia)

      const { rows } = await client.query(
        `SELECT id, stato, sostituisce_id, annullata_da_evento_id, prescrittore_nome
           FROM dichiarazioni_conformita WHERE lavoro_id = $1 ORDER BY created_at`,
        [lavoro]
      )
      expect(rows).toHaveLength(2)

      const vecchiaRiga = rows.find((x) => x.id === vecchia)!
      expect(vecchiaRiga.stato).toBe('annullata')
      // §8.2 — il MOTIVO dell'annullamento, collegato e non duplicato.
      expect(vecchiaRiga.annullata_da_evento_id).toBe(evento)

      const nuovaRiga = rows.find((x) => x.id === r.nuova_id)!
      // §8.2 — il filo va DETTO, non fatto dedurre dal lavoro comune.
      expect(nuovaRiga.sostituisce_id).toBe(vecchia)
      expect(nuovaRiga.stato).toBe('generata')
      expect(nuovaRiga.prescrittore_nome).toBe('Dr. Corretto')
      // 🛑 La nuova NON eredita la causale: è viva, non annullata.
      expect(nuovaRiga.annullata_da_evento_id).toBeNull()
    })
  })

  it('② alla fine resta ESATTAMENTE UNA dichiarazione viva — mai zero, mai due', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      await creaDichiarazione(client, LAB_A, lavoro)

      await riemetti(client, lavoro, LAB_A, evento, corpoNuovo())

      const { rows } = await client.query(
        `SELECT count(*)::int AS vive FROM dichiarazioni_conformita
          WHERE lavoro_id = $1 AND stato <> 'annullata'`,
        [lavoro]
      )
      expect(rows[0].vive).toBe(1)
    })
  })

  it('③ i dati NON mandati si ereditano dalla vecchia, quelli mandati si sovrascrivono', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      await creaDichiarazione(client, LAB_A, lavoro, 'generata', { paziente: 'Mario Rossi' })

      const r = await riemetti(client, lavoro, LAB_A, evento, corpoNuovo())
      const { rows } = await client.query(
        `SELECT paziente_nome, prescrittore_nome, fabbricante_indirizzo
           FROM dichiarazioni_conformita WHERE id = $1`,
        [r.nuova_id]
      )
      // non mandato → ereditato (non `NULL`, che è il difetto di
      // `jsonb_populate_record` con una base vuota)
      expect(rows[0].paziente_nome).toBe('Mario Rossi')
      expect(rows[0].fabbricante_indirizzo).toBe('Via Test 1, Napoli')
      // mandato → sovrascritto
      expect(rows[0].prescrittore_nome).toBe('Dr. Corretto')
    })
  })

  it('④ la vita del documento VECCHIO non si eredita: firma, invio e cancellazione si azzerano', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      await creaDichiarazione(client, LAB_A, lavoro, 'generata', { firmataAt: true, inviata: true })

      const r = await riemetti(client, lavoro, LAB_A, evento, corpoNuovo())
      const { rows } = await client.query(
        `SELECT firmata_at, inviata_al_dentista, inviata_al_dentista_at, deleted_at
           FROM dichiarazioni_conformita WHERE id = $1`,
        [r.nuova_id]
      )
      // 🛑 Un documento nuovo che si dichiarasse già firmato e già inviato
      // affermerebbe il falso su sé stesso.
      expect(rows[0].firmata_at).toBeNull()
      expect(rows[0].inviata_al_dentista).toBe(false)
      expect(rows[0].inviata_al_dentista_at).toBeNull()
      expect(rows[0].deleted_at).toBeNull()
    })
  })

  // ═══ ⑦ LA PROVA CHE GIUSTIFICA TUTTA LA RPC ════════════════════════════════
  it('🛑 ⑤ se l\'inserimento FALLISCE, l\'annullo si ANNULLA: la vecchia resta VIVA', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      const vecchia = await creaDichiarazione(client, LAB_A, lavoro)

      // `stato = 'pippo'` viola il CHECK della tabella: l'INSERT esplode DOPO
      // che l'UPDATE ha già annullato la vecchia.
      await client.query('SAVEPOINT prima_del_guasto')
      await expect(
        riemetti(client, lavoro, LAB_A, evento, corpoNuovo({ stato: 'pippo' }))
      ).rejects.toThrow()
      await client.query('ROLLBACK TO SAVEPOINT prima_del_guasto')

      const { rows } = await client.query(
        `SELECT stato, annullata_da_evento_id FROM dichiarazioni_conformita WHERE id = $1`,
        [vecchia]
      )
      // 🔑 SE QUESTA RIGA DICESSE 'annullata', il lavoro sarebbe rimasto senza
      // nessuna dichiarazione viva — e nessun vincolo potrebbe accorgersene,
      // perché «zero» è legittimo per un lavoro mai consegnato.
      expect(rows[0].stato).toBe('generata')
      expect(rows[0].annullata_da_evento_id).toBeNull()

      const { rows: conta } = await client.query(
        `SELECT count(*)::int AS n FROM dichiarazioni_conformita WHERE lavoro_id = $1`,
        [lavoro]
      )
      expect(conta[0].n).toBe(1)
    })
  })

  it('🛑 ⑥ una chiave che non è una colonna viene RIFIUTATA, non ignorata (R-P6)', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      const vecchia = await creaDichiarazione(client, LAB_A, lavoro)

      await client.query('SAVEPOINT prima_della_chiave_ignota')
      await expect(
        riemetti(client, lavoro, LAB_A, evento, corpoNuovo({ norma_riferimento: 'UNI EN ISO 22674' }))
      ).rejects.toThrow(/chiavi che non sono colonne/)
      await client.query('ROLLBACK TO SAVEPOINT prima_della_chiave_ignota')

      // …e niente è successo: senza il controllo, quel dato sarebbe sparito in
      // silenzio e la riemissione sarebbe RIUSCITA con un campo in meno.
      const { rows } = await client.query(
        `SELECT stato FROM dichiarazioni_conformita WHERE id = $1`, [vecchia]
      )
      expect(rows[0].stato).toBe('generata')
    })
  })

  it('⑦ nessuna dichiarazione viva → lo dice, e non inventa una prima emissione', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      await creaDichiarazione(client, LAB_A, lavoro, 'annullata')

      const r = await riemetti(client, lavoro, LAB_A, evento, corpoNuovo())
      expect(r.esito).toBe('nessuna_dichiarazione_viva')

      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM dichiarazioni_conformita WHERE lavoro_id = $1`, [lavoro]
      )
      expect(rows[0].n).toBe(1)
    })
  })

  it('⑧ un evento di UN ALTRO lavoro è rifiutato (D263: mai senza motivo, e il motivo dev\'essere il suo)', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const altroLavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const eventoAltrui = await creaEvento(client, LAB_A, altroLavoro)
      const vecchia = await creaDichiarazione(client, LAB_A, lavoro)

      const r = await riemetti(client, lavoro, LAB_A, eventoAltrui, corpoNuovo())
      expect(r.esito).toBe('evento_non_valido')

      const { rows } = await client.query(
        `SELECT stato FROM dichiarazioni_conformita WHERE id = $1`, [vecchia]
      )
      expect(rows[0].stato).toBe('generata')
    })
  })

  it('⑨ i due vincoli nuovi sulla catena reggono: niente auto-riferimento, e una sola erede', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const vecchia = await creaDichiarazione(client, LAB_A, lavoro, 'annullata')

      await client.query('SAVEPOINT s1')
      await expect(
        client.query(`UPDATE dichiarazioni_conformita SET sostituisce_id = id WHERE id = $1`, [vecchia])
      ).rejects.toThrow()
      await client.query('ROLLBACK TO SAVEPOINT s1')

      // due dichiarazioni che affermano di superare la STESSA renderebbero la
      // catena illeggibile a un ispettore
      const altroLavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const erede1 = await creaDichiarazione(client, LAB_A, lavoro)
      const erede2 = await creaDichiarazione(client, LAB_A, altroLavoro)
      await client.query(`UPDATE dichiarazioni_conformita SET sostituisce_id = $1 WHERE id = $2`, [vecchia, erede1])
      await client.query('SAVEPOINT s2')
      await expect(
        client.query(`UPDATE dichiarazioni_conformita SET sostituisce_id = $1 WHERE id = $2`, [vecchia, erede2])
      ).rejects.toThrow()
      await client.query('ROLLBACK TO SAVEPOINT s2')
    })
  })

  it('🛑 ⑨-bis L\'ORDINE INVERSO NON È SCONSIGLIATO: È IMPOSSIBILE — e questo è il perché della §8.1', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      await creaDichiarazione(client, LAB_A, lavoro) // la viva

      // Inserire la nuova PRIMA di annullare la vecchia: è la strada che sembra
      // naturale a chi legge il TypeScript, e il database la rifiuta.
      await client.query('SAVEPOINT s3')
      await expect(creaDichiarazione(client, LAB_A, lavoro)).rejects.toThrow(/duplicate key|ddc_lavoro_attiva_unique/)
      await client.query('ROLLBACK TO SAVEPOINT s3')

      // 🔑 Ed è per questo che la §8.1 dice «prima si annulla, poi si riemette»:
      // non è una preferenza di stile, è l'unico ordine che il vincolo ammette.
      // Da lì la conseguenza che rende necessaria la RPC: fra l'annullo e
      // l'inserimento c'è un momento a ZERO dichiarazioni vive.
      const { rows } = await client.query(
        `SELECT count(*)::int AS n FROM dichiarazioni_conformita WHERE lavoro_id = $1`, [lavoro]
      )
      expect(rows[0].n).toBe(1)
    })
  })

  it('⑩ la funzione non è raggiungibile da anon né da authenticated', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(`
        SELECT has_function_privilege('anon', 'public.riemetti_ddc_atomica(uuid,uuid,uuid,jsonb)', 'EXECUTE') AS anon,
               has_function_privilege('authenticated', 'public.riemetti_ddc_atomica(uuid,uuid,uuid,jsonb)', 'EXECUTE') AS auth,
               has_function_privilege('service_role', 'public.riemetti_ddc_atomica(uuid,uuid,uuid,jsonb)', 'EXECUTE') AS svc
      `)
      expect(rows[0].anon).toBe(false)
      expect(rows[0].auth).toBe(false)
      expect(rows[0].svc).toBe(true)
    })
  })

  it('⑪ anche `riapri_lavoro_atomica` registra ora la causale dell\'annullo', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client, LAB_A)
      const lavoro = await creaLavoroConsegnato(client, LAB_A, cliente)
      const evento = await creaEvento(client, LAB_A, lavoro)
      const ddc = await creaDichiarazione(client, LAB_A, lavoro)

      const { rows: r } = await client.query(
        `SELECT public.riapri_lavoro_atomica($1, $2, $3) AS r`, [lavoro, LAB_A, evento]
      )
      expect(r[0].r.esito).toBe('ok')

      const { rows } = await client.query(
        `SELECT stato, annullata_da_evento_id FROM dichiarazioni_conformita WHERE id = $1`, [ddc]
      )
      expect(rows[0].stato).toBe('annullata')
      // 🔑 Senza questa riga la colonna sarebbe popolata da UNO dei due percorsi
      // vivi, e una causale mancante si leggerebbe come «non c'era un motivo».
      expect(rows[0].annullata_da_evento_id).toBe(evento)
    })
  })
})
