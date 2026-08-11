import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'
import { CAMPI_CORREGGIBILI_DOCUMENTO } from '@/lib/dichiarazione/correzioni'

/**
 * `correggi_e_riemetti_atomica` — Task 2 dell'ondata «l'avviso al dentista»:
 * **l'avviso nasce DENTRO la transazione della riemissione.** La firma non
 * cambia (sei parametri), cambia il corpo.
 *
 * 🛑 PERCHÉ UN FILE NUOVO E NON UN BLOCCO IN `avvisi-dentista-schema.rpc.test.ts`.
 * Il piano (Passo 2 del Task 2) dice «🆕 da creare» quel file: **esiste dal
 * Task 1 e porta 27 prove di SCHEMA** — vincoli, permessi, catalogo, cioè
 * proprietà della TABELLA. Queste sono prove del COMPORTAMENTO DI UNA
 * FUNZIONE, e il nome dice quale: la convenzione `<nome-rpc>.rpc.test.ts` è
 * già quella degli altri sette file di questa cartella. Sovrascrivere le 27
 * sarebbe stato il danno peggiore possibile in questo task.
 *
 * 🛑 E PERCHÉ QUESTE PROVE NON POSSONO VIVERE NEI TEST UNITARI. Ciò che il
 * Task 2 garantisce non è «il codice chiama la funzione»: è che **la
 * riemissione e il suo promemoria siano una scrittura sola**. Quella proprietà
 * vive nella transazione di Postgres, e una finzione non ce l'ha.
 *
 * ⚠️ IL LIMITE DELLA PROVA ②, DICHIARATO INVECE CHE ADDOLCITO. Tutte le
 * chiavi esterne di `avvisi_dentista` sono `NOT DEFERRABLE` (misurato in
 * `pg_constraint`), quindi `dichiarazione_id` pretende che la dichiarazione
 * nuova sia GIÀ inserita: l'`INSERT` dell'avviso non può che stare **dopo**
 * quello della dichiarazione, cioè **ultimo**. Non esiste quindi, dal
 * contratto pubblico, un guasto raggiungibile DOPO la nascita dell'avviso: la
 * prova ② non può mostrare «un avviso scritto e poi tolto». Ciò che mostra —
 * e che non è vacuo — è che il guasto arriva **dopo l'annullo e dopo la
 * correzione su `lavori`**, cioè dopo due scritture vere, e che di quelle due
 * non resta niente. È il rollback osservabile.
 */

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato

/** Un anno lontano: `dichiarazioni_conformita` non ne ha nessuna >= 2080 nel
 *  lab E2E (misurato), quindi la coppia (anno, progressivo) delle prove non
 *  può collidere per caso con i dati di banco. */
const ANNO_PROVA = 2099

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

function progressivoUnico() {
  return 700000 + (parseInt(randomUUID().replace(/-/g, '').slice(0, 6), 16) % 290000)
}

async function creaCliente(client: Client) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO clienti (id, laboratorio_id, nome, cognome) VALUES ($1, $2, 'Studio', 'Test Avviso')`,
    [id, LAB_A]
  )
  return id
}

async function creaLavoroConsegnato(client: Client, clienteId: string) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO lavori (id, laboratorio_id, numero_lavoro, cliente_id, tipo_dispositivo,
       descrizione, richiedente_nome, data_consegna_prevista, stato, conformato, data_consegna_effettiva)
     VALUES ($1, $2, $3, $4, 'protesi_fissa', 'Corona ORIGINALE', 'Dr. Originale',
       CURRENT_DATE, 'consegnato', true, now())`,
    [id, LAB_A, `TEST-AVV-${id.slice(0, 8)}`, clienteId]
  )
  return id
}

async function creaEvento(client: Client, lavoroId: string) {
  const { rows } = await client.query(
    `INSERT INTO eventi_qualita
       (laboratorio_id, lavoro_id, motivo, natura, origine_informazione, conosciuto_il, stato_dispositivo)
     VALUES ($1, $2, 'errore_dato_dichiarazione', 'dato_documentale', 'laboratorio_interno', now(), 'applicato')
     RETURNING id`,
    [LAB_A, lavoroId]
  )
  return rows[0].id as string
}

async function creaDichiarazione(
  client: Client,
  lavoroId: string,
  opts: { anno?: number; progressivo?: number; stato?: string } = {}
) {
  const id = randomUUID()
  const anno = opts.anno ?? ANNO_PROVA
  const progressivo = opts.progressivo ?? progressivoUnico()
  await client.query(
    `INSERT INTO dichiarazioni_conformita (
       id, laboratorio_id, lavoro_id, numero_ddc, anno_ddc, progressivo_ddc,
       fabbricante_nome, fabbricante_indirizzo, fabbricante_piva,
       prescrittore_nome, paziente_nome, tipo_dispositivo, descrizione_dispositivo,
       classe_rischio, testo_conformita, prrc_nome, stato
     ) VALUES ($1, $2, $3, $4, $5, $6,
       'Lab Test', 'Via Test 1, Napoli', '00000000000',
       'Dr. Sbagliato', 'Paziente Test', 'protesi_fissa', 'corona test',
       'classe_i', 'testo di prova', 'PRRC Test', $7)`,
    [id, LAB_A, lavoroId, `DDC-${anno}-${progressivo}`, anno, progressivo, opts.stato ?? 'generata']
  )
  return { id, anno, progressivo }
}

/** Il corpo minimo della dichiarazione NUOVA. 🛑 `stato` e `numero_ddc` NON
 *  ci vanno (il contratto li rifiuta) e la coppia anno+progressivo è
 *  INDIVISIBILE: o entrambe, o `23505` sull'unico ereditato. */
function corpoNuovo(extra: Record<string, unknown> = {}) {
  return {
    anno_ddc: ANNO_PROVA,
    progressivo_ddc: progressivoUnico(),
    prescrittore_nome: 'Dr. Corretto',
    ...extra,
  }
}

async function correggiERiemetti(
  client: Client,
  lavoroId: string,
  eventoId: string,
  correzioni: Record<string, unknown> | null,
  nuova: Record<string, unknown>
) {
  const { rows } = await client.query(
    `SELECT public.correggi_e_riemetti_atomica($1, $2, $3, $4::jsonb, $5::jsonb, NULL::timestamptz) AS r`,
    [lavoroId, LAB_A, eventoId, correzioni === null ? null : JSON.stringify(correzioni), JSON.stringify(nuova)]
  )
  return rows[0].r as Record<string, unknown>
}

async function avvisiDi(client: Client, lavoroId: string) {
  const { rows } = await client.query(
    `SELECT * FROM avvisi_dentista WHERE lavoro_id = $1 ORDER BY created_at, id`,
    [lavoroId]
  )
  return rows as Array<Record<string, unknown>>
}

describe.skipIf(skipIntegrationTests)('correggi_e_riemetti_atomica — l\'avviso nasce nella stessa transazione', () => {
  it('① una riemissione riuscita lascia UN avviso «da_comunicare», che punta alla dichiarazione NUOVA', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)
      const lavoro = await creaLavoroConsegnato(client, cliente)
      const evento = await creaEvento(client, lavoro)
      const vecchia = await creaDichiarazione(client, lavoro)

      const r = await correggiERiemetti(
        client, lavoro, evento,
        { descrizione: 'Corona CORRETTA', richiedente_nome: 'Dr. Giusto' },
        corpoNuovo()
      )
      expect(r.esito).toBe('ok')

      const avvisi = await avvisiDi(client, lavoro)
      expect(avvisi).toHaveLength(1)
      const a = avvisi[0]
      expect(a.stato).toBe('da_comunicare')
      expect(a.laboratorio_id).toBe(LAB_A)
      expect(a.cliente_id).toBe(cliente)
      // 🔑 LA NUOVA, non la vecchia: l'avviso dice al dentista QUALE carta
      //    tiene in mano adesso. Puntare alla superata sarebbe rimandarlo al
      //    documento sbagliato.
      expect(a.dichiarazione_id).toBe(r.nuova_id)
      expect(a.dichiarazione_id).not.toBe(vecchia.id)
      expect(a.campi_corretti).toEqual(['descrizione', 'richiedente_nome'])
      // Nasce APERTO: nessuno l'ha ancora comunicato, e non c'è testo mandato.
      expect(a.comunicato_at).toBeNull()
      expect(a.comunicato_da).toBeNull()
      expect(a.testo_inviato).toBeNull()
      expect(a.visto_dal_dentista_at).toBeNull()
    })
  })

  it('①-bis `campi_corretti` porta le chiavi mandate, e in ordine STABILE (non quello di jsonb)', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)
      const lavoro = await creaLavoroConsegnato(client, cliente)
      const evento = await creaEvento(client, lavoro)
      await creaDichiarazione(client, lavoro)

      // 🛑 QUESTA COPPIA È SCELTA, NON CASUALE. `jsonb` conserva le chiavi
      //    ordinate per LUNGHEZZA e poi per byte, quindi
      //    `ARRAY(SELECT jsonb_object_keys(…))` restituisce
      //    {descrizione, denti_coinvolti} — l'ordine di come è fatto jsonb,
      //    non un ordine che qualcuno ha scelto.
      //    provato: ARRAY(SELECT jsonb_object_keys('{"denti_coinvolti":[],"descrizione":"x"}'))
      //             → {descrizione,denti_coinvolti}
      //             con ORDER BY k → {denti_coinvolti,descrizione}
      //    Un elenco che finisce in un messaggio al dentista non può avere
      //    l'ordine deciso da un dettaglio di memorizzazione.
      const r = await correggiERiemetti(
        client, lavoro, evento,
        { descrizione: 'Corona CORRETTA', denti_coinvolti: [{ fdi: '11' }] },
        corpoNuovo()
      )
      expect(r.esito).toBe('ok')

      const avvisi = await avvisiDi(client, lavoro)
      expect(avvisi).toHaveLength(1)
      expect(avvisi[0].campi_corretti).toEqual(['denti_coinvolti', 'descrizione'])
    })
  })

  it('② se la riemissione FALLISCE non resta niente: né l\'avviso, né l\'annullo, né la correzione', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)
      const lavoro = await creaLavoroConsegnato(client, cliente)
      const evento = await creaEvento(client, lavoro)
      const vecchia = await creaDichiarazione(client, lavoro)

      // Il guasto si fabbrica con una coppia (anno, progressivo) GIÀ PRESA da
      // un altro lavoro dello stesso laboratorio: l'inserimento della
      // dichiarazione nuova sbatte sull'unico. Arriva DOPO l'annullo e DOPO
      // l'UPDATE su `lavori`, quindi due scritture vere sono già avvenute.
      const altroLavoro = await creaLavoroConsegnato(client, cliente)
      const occupata = await creaDichiarazione(client, altroLavoro)

      await client.query('SAVEPOINT prima_del_guasto')
      // 🛑 SI NOMINA IL VINCOLO, non il codice `23505`: un codice può arrivare
      //    da un vincolo diverso e la prova passerebbe per il motivo sbagliato
      //    (difetto ⑦ della revisione del Task 1).
      await expect(
        correggiERiemetti(
          client, lavoro, evento,
          { descrizione: 'Corona CORRETTA' },
          corpoNuovo({ anno_ddc: occupata.anno, progressivo_ddc: occupata.progressivo })
        )
      ).rejects.toThrow(/dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key/)
      await client.query('ROLLBACK TO SAVEPOINT prima_del_guasto')

      expect(await avvisiDi(client, lavoro)).toHaveLength(0)

      const { rows: d } = await client.query(
        `SELECT stato, annullata_da_evento_id FROM dichiarazioni_conformita WHERE id = $1`,
        [vecchia.id]
      )
      expect(d[0].stato).toBe('generata')
      expect(d[0].annullata_da_evento_id).toBeNull()

      const { rows: l } = await client.query(`SELECT descrizione FROM lavori WHERE id = $1`, [lavoro])
      expect(l[0].descrizione).toBe('Corona ORIGINALE')

      const { rows: n } = await client.query(
        `SELECT count(*)::int AS n FROM dichiarazioni_conformita WHERE lavoro_id = $1`,
        [lavoro]
      )
      expect(n[0].n).toBe(1)
    })
  })

  it('③ due riemissioni di fila sullo stesso lavoro fanno DUE avvisi, non uno aggiornato', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)
      const lavoro = await creaLavoroConsegnato(client, cliente)
      await creaDichiarazione(client, lavoro)

      // Due eventi distinti: `ddc_evento_annulla_unique` non permette allo
      // stesso evento di annullare due dichiarazioni.
      const primo = await correggiERiemetti(
        client, lavoro, await creaEvento(client, lavoro),
        { descrizione: 'Prima correzione' }, corpoNuovo()
      )
      expect(primo.esito).toBe('ok')
      const secondo = await correggiERiemetti(
        client, lavoro, await creaEvento(client, lavoro),
        { richiedente_nome: 'Dr. Secondo' }, corpoNuovo()
      )
      expect(secondo.esito).toBe('ok')

      const avvisi = await avvisiDi(client, lavoro)
      // 🔑 DUE, e non uno aggiornato: ogni riemissione è un fatto a sé, e il
      //    dentista va avvisato di ognuna. Un avviso riscritto cancellerebbe
      //    la prova della prima comunicazione (GDPR Art. 5(2)).
      expect(avvisi).toHaveLength(2)
      const dichiarazioni = avvisi.map((a) => a.dichiarazione_id)
      expect(new Set(dichiarazioni).size).toBe(2)
      expect(dichiarazioni).toContain(primo.nuova_id)
      expect(dichiarazioni).toContain(secondo.nuova_id)
      expect(avvisi.map((a) => a.stato)).toEqual(['da_comunicare', 'da_comunicare'])
      // 🛑 SI APPAIA PER DICHIARAZIONE, NON PER ORDINE — e la prima stesura di
      //    questa prova sbagliava proprio qui. `now()` è COSTANTE dentro una
      //    transazione: i due avvisi nascono con lo STESSO `created_at`, e il
      //    ripiego su `id` è un uuid casuale. L'ordine fra due avvisi nati nella
      //    stessa transazione non è definito, quindi non si può asserire.
      //    (In esercizio le due riemissioni sono due transazioni distinte e i
      //    `created_at` differiscono; resta una nota per chi ordinerà l'archivio.)
      const perDichiarazione = new Map(avvisi.map((a) => [a.dichiarazione_id, a.campi_corretti]))
      expect(perDichiarazione.get(primo.nuova_id as string)).toEqual(['descrizione'])
      expect(perDichiarazione.get(secondo.nuova_id as string)).toEqual(['richiedente_nome'])
    })
  })

  it('④ l\'avviso nasce anche per un chiamante che NON può inserire: lo scrive il SECURITY DEFINER', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)
      const lavoro = await creaLavoroConsegnato(client, cliente)
      const evento = await creaEvento(client, lavoro)
      await creaDichiarazione(client, lavoro)

      // Il ruolo che il server usa davvero. La connessione dei test è
      // `postgres`, PROPRIETARIO delle tabelle: chiamare la funzione da lì
      // non proverebbe niente sul `SECURITY DEFINER`, perché il salto di
      // ruolo non avverrebbe.
      await client.query('SET LOCAL ROLE service_role')

      await client.query('SAVEPOINT insert_diretto')
      await expect(
        client.query(
          `INSERT INTO avvisi_dentista (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id)
           SELECT $1, $2, $3, id FROM dichiarazioni_conformita WHERE lavoro_id = $2 LIMIT 1`,
          [LAB_A, lavoro, cliente]
        )
      ).rejects.toThrow(/permission denied/i)
      await client.query('ROLLBACK TO SAVEPOINT insert_diretto')

      const r = await correggiERiemetti(client, lavoro, evento, { descrizione: 'Da service_role' }, corpoNuovo())
      expect(r.esito).toBe('ok')

      await client.query('RESET ROLE')
      // 🔑 La riga esiste benché `service_role` non abbia `INSERT` sulla
      //    tabella: è la funzione, che gira come il proprietario, a scriverla.
      //    ⚠️ Fragilità dichiarata: regge perché `avvisi_dentista` NON ha
      //    `FORCE ROW LEVEL SECURITY` (misurato: `relforcerowsecurity=false`).
      //    Accenderlo farebbe fallire questo `INSERT`, perché una politica di
      //    `INSERT` non esiste per scelta.
      const avvisi = await avvisiDi(client, lavoro)
      expect(avvisi).toHaveLength(1)
      expect(avvisi[0].dichiarazione_id).toBe(r.nuova_id)
    })
  })

  it('⑤ `campi_corretti` non può portare un settimo nome, e le sei ammesse sono quelle del TypeScript', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)
      const lavoro = await creaLavoroConsegnato(client, cliente)
      const evento = await creaEvento(client, lavoro)
      const vecchia = await creaDichiarazione(client, lavoro)

      await client.query('SAVEPOINT chiave_ignota')
      let messaggio = ''
      try {
        await correggiERiemetti(client, lavoro, evento, { colore_preferito: 'A3' }, corpoNuovo())
        throw new Error('la chiave fuori dalle sei NON è stata rifiutata')
      } catch (e) {
        messaggio = (e as Error).message
      }
      await client.query('ROLLBACK TO SAVEPOINT chiave_ignota')
      expect(messaggio).toMatch(/non sono voci correggibili del documento/)

      // Niente è stato scritto: il rifiuto arriva PRIMA di ogni scrittura.
      expect(await avvisiDi(client, lavoro)).toHaveLength(0)
      const { rows: d } = await client.query(
        `SELECT stato FROM dichiarazioni_conformita WHERE id = $1`, [vecchia.id]
      )
      expect(d[0].stato).toBe('generata')

      // 🔑 IL SOLO LEGAME MISURATO fra `campi_corretti` e il TypeScript.
      //    `tests/unit/correzioni-documento.test.ts:67` confronta la costante
      //    con un elenco SCRITTO A MANO nel test: due copie della stessa
      //    verità che si aggiornano insieme solo se qualcuno se ne ricorda.
      //    Qui l'elenco arriva dal messaggio della funzione VIVA.
      const ammesse = messaggio.match(/\(ammesse: \{([^}]+)\}\)/)?.[1]
      expect(ammesse).toBeDefined()
      const seiVive = ammesse!.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).sort()
      // Prima la cardinalità: senza, una lettura sbagliata passerebbe a vuoto.
      expect(seiVive).toHaveLength(6)
      expect(seiVive).toEqual([...CAMPI_CORREGGIBILI_DOCUMENTO].sort())
    })
  })

  it('⑥ una riemissione SENZA correzioni di campo genera comunque il promemoria', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)

      // (a) correzioni vuote
      const lavoroA = await creaLavoroConsegnato(client, cliente)
      await creaDichiarazione(client, lavoroA)
      const a = await correggiERiemetti(client, lavoroA, await creaEvento(client, lavoroA), {}, corpoNuovo())
      expect(a.esito).toBe('ok')
      const avvisiA = await avvisiDi(client, lavoroA)
      expect(avvisiA).toHaveLength(1)
      expect(avvisiA[0].campi_corretti).toEqual([])

      // (b) correzioni NULL — il contratto le normalizza a `{}`, e l'avviso
      //     deve nascere anche qui: la carta è nuova, il dentista ha in mano
      //     quella vecchia.
      const lavoroB = await creaLavoroConsegnato(client, cliente)
      await creaDichiarazione(client, lavoroB)
      const b = await correggiERiemetti(client, lavoroB, await creaEvento(client, lavoroB), null, corpoNuovo())
      expect(b.esito).toBe('ok')
      const avvisiB = await avvisiDi(client, lavoroB)
      expect(avvisiB).toHaveLength(1)
      expect(avvisiB[0].campi_corretti).toEqual([])
    })
  })

  it('⑦ un rifiuto GENTILE non lascia un promemoria dietro di sé', async () => {
    await withRollback(async (client) => {
      const cliente = await creaCliente(client)
      const lavoro = await creaLavoroConsegnato(client, cliente)
      const altroLavoro = await creaLavoroConsegnato(client, cliente)
      const eventoAltrui = await creaEvento(client, altroLavoro)
      const vecchia = await creaDichiarazione(client, lavoro)

      const r = await correggiERiemetti(
        client, lavoro, eventoAltrui, { descrizione: 'mai scritta' }, corpoNuovo()
      )
      // Un esito gentile è un `RETURN`, non un `RAISE`: nulla è stato scritto,
      // quindi non c'è niente da annullare — ma nemmeno un avviso da mostrare.
      expect(r.esito).toBe('evento_non_valido')
      expect(await avvisiDi(client, lavoro)).toHaveLength(0)
      const { rows: d } = await client.query(
        `SELECT stato FROM dichiarazioni_conformita WHERE id = $1`, [vecchia.id]
      )
      expect(d[0].stato).toBe('generata')
    })
  })
})
