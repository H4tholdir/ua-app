import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

/**
 * `riporta_a_pronto_atomica` — Task 10, LA GEMELLA NON DISTRUTTIVA contro il
 * database VERO. Migration: `supabase/migrations/20260807182614_riporta_a_pronto_atomica.sql`
 * (applicata). Spec §6 · D291 · D293 · D304.
 *
 * 🛑 PERCHÉ QUESTE PROVE NON POSSONO VIVERE NEI TEST UNITARI, e non è una
 * preferenza. Le prove unitarie della rotta fingono il client Supabase: `rpc()`
 * restituisce ciò che la prova ha deciso, quindi possono controllare **che la
 * funzione venga chiamata col nome giusto**, mai **che cosa quella funzione fa
 * al database**. Le due cose che questo file misura — che la dichiarazione
 * resti VIVA e che un fallimento dentro la chiamata annidata non lasci il
 * lavoro a metà — vivono nella transazione di Postgres, e una finzione non ce
 * l'ha.
 *
 * 🔑 LA DIFFERENZA CON LA GEMELLA, ED È TUTTA QUI (D293): `riapri_lavoro_atomica`
 * annulla la dichiarazione, questa la lascia in vita. Annullare il documento di
 * una consegna realmente avvenuta cancellerebbe l'unica prova che quel manufatto
 * è esistito ed è andato a un paziente. Nessun parametro decide fra le due:
 * decide il nome della funzione chiamata.
 *
 * 📌 Il corpo provato è quello del CATALOGO, mai un file riapplicato: nessuna
 * `applicaMigrazione` qui. È la correzione fatta il 09/08 sul file gemello, che
 * per tre giorni ha misurato il corpo del 6 agosto credendolo quello vivo.
 */

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato — mai il lab Filippo
const UUID_ZERO = '00000000-0000-0000-0000-000000000000'

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

// Intervallo di progressivi tutto suo: i tre file d'integrazione che inseriscono
// dichiarazioni girano in parallelo sullo stesso laboratorio (riapri: 700k-900k,
// riemetti: 800k-990k). Qui 100k-190k, che non incrocia nessuno dei due.
function progressivoUnico() {
  return 100000 + (parseInt(randomUUID().replace(/-/g, '').slice(0, 6), 16) % 90000)
}

async function creaLaboratorioB(client: Client) {
  const id = randomUUID()
  await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [id, 'Lab B — prova torna-a-pronto cross-tenant'])
  return id
}

async function creaCliente(client: Client, labId: string) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO clienti (id, laboratorio_id, nome, cognome) VALUES ($1, $2, 'Studio', 'Test Torna A Pronto')`,
    [id, labId]
  )
  return id
}

/**
 * Un lavoro consegnato. `prima_immissione_at` è valorizzata di proposito e
 * **indietro nel tempo**: è la memoria della PRIMA messa a disposizione
 * (Art. 2(28) MDR), quella da cui decorrono i dieci anni di conservazione, e
 * l'invariante che nessun ritorno fra i pronti può spostare.
 */
async function creaLavoroConsegnato(
  client: Client,
  labId: string,
  clienteId: string,
  opts: Partial<{ deletedAt: string | null; stato: string }> = {}
) {
  const id = randomUUID()
  await client.query(
    `INSERT INTO lavori (
       id, laboratorio_id, numero_lavoro, cliente_id, tipo_dispositivo, descrizione,
       data_consegna_prevista, stato, conformato, data_conformazione, data_consegna_effettiva,
       consegna_completata_at, consegna_in_corso, consegna_tap_at, proposta_dentista, proposta_at,
       prima_immissione_at, deleted_at
     ) VALUES ($1, $2, $3, $4, 'protesi_fissa', 'Corona test torna a pronto',
       CURRENT_DATE, $5, true, now(), now(),
       now(), false, now(), 'fatturare', now(),
       now() - interval '40 days', $6)`,
    [id, labId, `TEST-TAP-${id.slice(0, 8)}`, clienteId, opts.stato ?? 'consegnato', opts.deletedAt ?? null]
  )
  return id
}

async function creaEvento(client: Client, labId: string, lavoroId: string) {
  const { rows } = await client.query(
    `INSERT INTO eventi_qualita
       (laboratorio_id, lavoro_id, motivo, natura, origine_informazione, conosciuto_il, stato_dispositivo)
     VALUES ($1, $2, 'destinatario_errato', 'identificazione_destinatario', 'laboratorio_interno', now(), 'consegnato_non_applicato')
     RETURNING id`,
    [labId, lavoroId]
  )
  return rows[0].id as string
}

async function creaDichiarazione(client: Client, labId: string, lavoroId: string, stato: string) {
  const id = randomUUID()
  const progressivo = progressivoUnico()
  await client.query(
    `INSERT INTO dichiarazioni_conformita (
       id, laboratorio_id, lavoro_id, numero_ddc, progressivo_ddc,
       fabbricante_nome, fabbricante_indirizzo, fabbricante_piva,
       prescrittore_nome, paziente_nome, tipo_dispositivo,
       descrizione_dispositivo, classe_rischio, testo_conformita, prrc_nome, stato
     ) VALUES ($1, $2, $3, $4, $5,
       'Lab Test', 'Via Test 1, Napoli', '00000000000',
       'Dr. Test', 'Paziente Test', 'protesi_fissa',
       'corona test', 'classe_i', 'testo di prova', 'PRRC Test', $6)`,
    [id, labId, lavoroId, `DDC-TAP-${id.slice(0, 8)}`, progressivo, stato]
  )
  return id
}

async function tornaAPronto(client: Client, lavoroId: string, labId: string, eventoId: string) {
  const { rows } = await client.query(
    `SELECT public.riporta_a_pronto_atomica($1, $2, $3) AS r`,
    [lavoroId, labId, eventoId]
  )
  return rows[0].r as Record<string, unknown>
}

describe.skipIf(skipIntegrationTests)('riporta_a_pronto_atomica — la funzione VIVA del catalogo', () => {
  // ── IL CASO NORMALE, e la promessa che il nome fa (D293) ──────────────────
  it('il lavoro torna a pronto e la dichiarazione resta VIVA e INTATTA — nessuna causale di annullamento', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      const ddcId = await creaDichiarazione(client, LAB_A, lavoroId, 'generata')

      const r = await tornaAPronto(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('ok')
      expect(r.ddc_viva).toBe(true)

      const { rows: [lavoro] } = await client.query(
        `SELECT stato, conformato, data_conformazione, data_consegna_effettiva,
                consegna_completata_at, consegna_in_corso, consegna_tap_at,
                proposta_dentista, proposta_at
         FROM lavori WHERE id = $1`, [lavoroId]
      )
      expect(lavoro.stato).toBe('pronto')
      expect(lavoro.conformato).toBe(false)
      expect(lavoro.data_conformazione).toBeNull()
      expect(lavoro.data_consegna_effettiva).toBeNull()
      expect(lavoro.consegna_completata_at).toBeNull()
      expect(lavoro.consegna_in_corso).toBe(false)
      expect(lavoro.consegna_tap_at).toBeNull()
      expect(lavoro.proposta_dentista).toBeNull()
      expect(lavoro.proposta_at).toBeNull()

      // 🛑 IL CUORE DI D293. Non basta che lo `stato` non sia 'annullata': si
      // controlla anche che nessuna CAUSALE sia stata scritta, perché è quella
      // riga (`annullata_da_evento_id`) a rendere efficace l'annullamento nella
      // gemella distruttiva. Una funzione che scrivesse la causale senza
      // cambiare lo stato lascerebbe una dichiarazione viva ma marchiata.
      const { rows: [ddc] } = await client.query(
        `SELECT stato, annullata_da_evento_id FROM dichiarazioni_conformita WHERE id = $1`, [ddcId]
      )
      expect(ddc.stato).toBe('generata')
      expect(ddc.annullata_da_evento_id).toBeNull()
    })
  })

  // ── L'INVARIANTE DI LEGGE: la prima immissione non si sposta ──────────────
  it('`prima_immissione_at` NON si muove: il ritorno fra i pronti non riscrive la prima messa a disposizione', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      await creaDichiarazione(client, LAB_A, lavoroId, 'generata')

      const { rows: [prima] } = await client.query(
        `SELECT prima_immissione_at FROM lavori WHERE id = $1`, [lavoroId]
      )
      expect(prima.prima_immissione_at).not.toBeNull()

      expect((await tornaAPronto(client, lavoroId, LAB_A, eventoId)).esito).toBe('ok')

      const { rows: [dopo] } = await client.query(
        `SELECT prima_immissione_at FROM lavori WHERE id = $1`, [lavoroId]
      )
      // 🔑 Il confronto è sull'istante ESATTO, non su «non è nullo»: il termine
      // di conservazione dell'Allegato XIII p.4 decorre da qui, e una data
      // spostata in avanti accorcerebbe un obbligo di legge senza dirlo.
      // ⚠️ Il valore della fixture è nel PASSATO apposta (40 giorni): con
      // `now()` una riscrittura sarebbe invisibile, perché `now()` è costante
      // dentro una transazione e i due valori coinciderebbero comunque.
      expect(dopo.prima_immissione_at).toEqual(prima.prima_immissione_at)
    })
  })

  // ── RAMO ① — evento_non_valido, nelle sue DUE forme ───────────────────────
  it('p_evento_id inesistente → evento_non_valido, e il lavoro non si muove', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)

      const r = await tornaAPronto(client, lavoroId, LAB_A, UUID_ZERO)
      expect(r.esito).toBe('evento_non_valido')
      expect(r.ddc_viva).toBeUndefined()

      const { rows: [dopo] } = await client.query(`SELECT stato FROM lavori WHERE id = $1`, [lavoroId])
      expect(dopo.stato).toBe('consegnato')
    })
  })

  it('p_evento_id di UN ALTRO LAVORO dello stesso laboratorio → evento_non_valido', async () => {
    // La FK composita difende dal caso «evento di un altro laboratorio»; questo
    // caso — stesso laboratorio, lavoro sbagliato — passerebbe in silenzio se il
    // filtro `lavoro_id` non ci fosse. È il valore che DEVE essere rifiutato.
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const altroLavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoAltrui = await creaEvento(client, LAB_A, altroLavoroId)

      const r = await tornaAPronto(client, lavoroId, LAB_A, eventoAltrui)
      expect(r.esito).toBe('evento_non_valido')

      const { rows: [dopo] } = await client.query(`SELECT stato FROM lavori WHERE id = $1`, [lavoroId])
      expect(dopo.stato).toBe('consegnato')
    })
  })

  // ── RAMO ② — non_consegnato ───────────────────────────────────────────────
  it('lavoro già in stato "pronto" → non_consegnato (non è un guasto: non c\'era niente da fare)', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId, { stato: 'pronto' })
      const eventoId = await creaEvento(client, LAB_A, lavoroId)

      const r = await tornaAPronto(client, lavoroId, LAB_A, eventoId)
      expect(r.esito).toBe('non_consegnato')
    })
  })

  it('lavoro inesistente → non_trovato · lavoro con deleted_at → non_trovato (anche se "consegnato")', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const cancellato = await creaLavoroConsegnato(client, LAB_A, clienteId, {
        deletedAt: new Date().toISOString(),
      })
      const eventoId = await creaEvento(client, LAB_A, cancellato)

      expect((await tornaAPronto(client, UUID_ZERO, LAB_A, UUID_ZERO)).esito).toBe('non_trovato')
      expect((await tornaAPronto(client, cancellato, LAB_A, eventoId)).esito).toBe('non_trovato')
    })
  })

  it('cross-tenant: lab B chiama sul lavoro di lab A → non_trovato, la riga di A è intatta', async () => {
    // SECURITY DEFINER bypassa la RLS: il filtro esplicito su laboratorio_id
    // dentro la funzione è la SOLA protezione tenant qui.
    await withRollback(async (client) => {
      const labB = await creaLaboratorioB(client)
      const clienteA = await creaCliente(client, LAB_A)
      const lavoroA = await creaLavoroConsegnato(client, LAB_A, clienteA)
      const eventoA = await creaEvento(client, LAB_A, lavoroA)

      const r = await tornaAPronto(client, lavoroA, labB, eventoA)
      expect(r.esito).toBe('non_trovato')

      const { rows: [dopo] } = await client.query(`SELECT stato FROM lavori WHERE id = $1`, [lavoroA])
      expect(dopo.stato).toBe('consegnato')
    })
  })

  // ── RAMO ③ — ddc_viva:false, e il caveat che la schermata deve leggere ────
  // 🔑 «La dichiarazione resta valida» è una PROMESSA. Se non c'è nessuna
  // dichiarazione viva la frase è FALSA, e chi legge deve saperlo: alla
  // riconsegna ne verrà generata una nuova, bruciando un progressivo.
  it.each([
    ['nessuna dichiarazione (dato legacy)', null],
    ['unica dichiarazione già annullata', 'annullata'],
  ])('ddc_viva=false quando c\'è %s — il lavoro torna a pronto lo stesso', async (_nome, stato) => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      if (stato) await creaDichiarazione(client, LAB_A, lavoroId, stato)

      const r = await tornaAPronto(client, lavoroId, LAB_A, eventoId)
      // 🛑 Qui NON c'è fail-closed, ed è la differenza voluta con la gemella:
      // là «nessuna riga viva ma una in archivio» è uno stato incoerente e
      // solleva; qui è un fatto normale (una consegna già corretta prima) che
      // si segnala e si lascia passare.
      expect(r.esito).toBe('ok')
      expect(r.ddc_viva).toBe(false)

      const { rows: [dopo] } = await client.query(`SELECT stato FROM lavori WHERE id = $1`, [lavoroId])
      expect(dopo.stato).toBe('pronto')
    })
  })

  it('«viva» NON è un elenco di stati: bozza · firmata · consegnata contano tutte come vive', async () => {
    // La definizione è `stato <> 'annullata'`, la stessa dell'indice
    // `ddc_lavoro_attiva_unique`. Un elenco scritto a mano diventerebbe muto il
    // giorno in cui il vocabolario cresce — ed è il difetto già pagato sulla
    // gemella il 06/08.
    await withRollback(async (client) => {
      for (const stato of ['bozza', 'firmata', 'consegnata']) {
        await client.query('SAVEPOINT per_stato')
        const clienteId = await creaCliente(client, LAB_A)
        const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
        const eventoId = await creaEvento(client, LAB_A, lavoroId)
        const ddcId = await creaDichiarazione(client, LAB_A, lavoroId, stato)

        const r = await tornaAPronto(client, lavoroId, LAB_A, eventoId)
        expect({ stato, ...r }).toMatchObject({ esito: 'ok', ddc_viva: true })

        const { rows: [ddc] } = await client.query(
          `SELECT stato FROM dichiarazioni_conformita WHERE id = $1`, [ddcId]
        )
        expect(ddc.stato).toBe(stato) // intatta, nemmeno di stato
        await client.query('ROLLBACK TO SAVEPOINT per_stato')
      }
    })
  })

  // ── RAMO ④ — L'ATOMICITÀ ATTRAVERSO LA CHIAMATA ANNIDATA ─────────────────
  /**
   * 🔴 QUESTO RAMO ERA STATO MISURATO A MANO DALL'ESECUTORE DEL TASK 4 E NON ERA
   * PIÙ RIPETIBILE DA NESSUNO. Il piano lo chiede esplicitamente: «se
   * `ripristina_lavoro_a_pronto` solleva, il lavoro deve restare `consegnato`».
   *
   * 🔑 PERCHÉ NON BASTA GUARDARE IL CODICE. Oggi `riporta_a_pronto_atomica` non
   * ha nessun blocco `EXCEPTION`, quindi l'eccezione della funzione annidata
   * risale e la transazione salta. Ma in PL/pgSQL un blocco `EXCEPTION`
   * apre un punto di ripristino IMPLICITO: il giorno in cui qualcuno ne
   * aggiungesse uno «per non far vedere un errore all'utente», la scrittura
   * annidata verrebbe annullata **e la funzione restituirebbe `ok` lo stesso** —
   * cioè fallirebbe dichiarando successo (§8.1 della spec). Nessuna lettura del
   * corpo di QUESTA funzione mostrerebbe il difetto: starebbe nel modo in cui
   * il linguaggio tratta l'annidamento.
   *
   * 🛑 COME SI FA SOLLEVARE, dato che nella pratica non solleva mai. La rete
   * difensiva dentro `ripristina_lavoro_a_pronto` (`v_rows = 0 → RAISE`) è
   * dichiarata «oggi irraggiungibile» nel commento della migration, perché la
   * riga è già stata bloccata con `FOR UPDATE` dal chiamante. Si rende
   * raggiungibile con un trigger `BEFORE UPDATE` che RESTITUISCE NULL sul
   * passaggio a 'pronto': la riga viene saltata, `ROW_COUNT` vale 0, e la
   * guardia parte. Il trigger nasce e muore dentro la transazione annullata
   * (il DDL in Postgres è transazionale) — nessuna migration registrata.
   *
   * ⚠️ IL PREZZO, SCRITTO QUI PERCHÉ NON SI PAGHI DUE VOLTE: `CREATE TRIGGER …
   * ON public.lavori` prende un lock **ACCESS EXCLUSIVE sull'intera tabella**
   * per tutta la transazione. Vitest gira i file in parallelo, e gli altri file
   * d'integrazione scrivono `lavori` sullo stesso laboratorio di prova: se un
   * giorno questa suite si pianta invece di fallire, **è questa riga**, non un
   * difetto del database. Oggi è accettabile perché la transazione dura
   * millisecondi e il banco è di sole prove; se dà noia, si lancia
   * `npx vitest run tests/integration --no-file-parallelism`.
   *
   * ➡️ Effetto collaterale utile: prova che quella «rete difensiva
   * irraggiungibile» è viva e non codice morto.
   */
  it('se la chiamata annidata solleva, il lavoro resta consegnato — e la funzione NON risponde ok', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)
      await creaDichiarazione(client, LAB_A, lavoroId, 'generata')

      // `zz_` per girare DOPO i trigger di casa (l'ordine è alfabetico): così
      // non ne altera nessuno, si limita a saltare la riga alla fine.
      await client.query(`
        CREATE FUNCTION pg_temp.sonda_blocca_pronto() RETURNS trigger LANGUAGE plpgsql AS $t$
        BEGIN
          IF NEW.stato = 'pronto' THEN RETURN NULL; END IF;
          RETURN NEW;
        END $t$;
        CREATE TRIGGER zz_sonda_blocca_pronto BEFORE UPDATE ON public.lavori
          FOR EACH ROW EXECUTE FUNCTION pg_temp.sonda_blocca_pronto();
      `)

      await client.query('SAVEPOINT prima_del_raise')
      await expect(tornaAPronto(client, lavoroId, LAB_A, eventoId)).rejects.toThrow(/ripristino lavoro fallito/)
      await client.query('ROLLBACK TO SAVEPOINT prima_del_raise')

      const { rows: [dopo] } = await client.query(
        `SELECT stato, conformato, data_consegna_effettiva FROM lavori WHERE id = $1`, [lavoroId]
      )
      expect(dopo.stato).toBe('consegnato')
      expect(dopo.conformato).toBe(true)
      expect(dopo.data_consegna_effettiva).not.toBeNull()

      await client.query(`DROP TRIGGER zz_sonda_blocca_pronto ON public.lavori`)
    })
  })

  // ── I permessi si leggono dal CATALOGO, non dal ruolo della connessione ───
  it('permessi: solo service_role esegue le due funzioni (PUBLIC/anon/authenticated no)', async () => {
    // 🛑 `scripts/psql.mjs` e questo client si collegano come PROPRIETARIO: una
    // sonda che si limitasse a «riesco a eseguirla» non proverebbe niente. Si
    // interroga il catalogo dei privilegi, che è indipendente da chi chiede.
    await withRollback(async (client) => {
      const { rows } = await client.query(`
        SELECT
          has_function_privilege('anon', 'public.riporta_a_pronto_atomica(uuid,uuid,uuid)', 'EXECUTE') AS anon_tap,
          has_function_privilege('authenticated', 'public.riporta_a_pronto_atomica(uuid,uuid,uuid)', 'EXECUTE') AS auth_tap,
          has_function_privilege('service_role', 'public.riporta_a_pronto_atomica(uuid,uuid,uuid)', 'EXECUTE') AS svc_tap,
          has_function_privilege('anon', 'public.ripristina_lavoro_a_pronto(uuid,uuid)', 'EXECUTE') AS anon_rip,
          has_function_privilege('authenticated', 'public.ripristina_lavoro_a_pronto(uuid,uuid)', 'EXECUTE') AS auth_rip
      `)
      expect(rows[0]).toEqual({
        anon_tap: false, auth_tap: false, svc_tap: true,
        // 🔑 La funzione INTERNA va chiusa quanto la sua chiamante: è
        // SECURITY DEFINER e non chiede nessun evento, quindi eseguirla
        // direttamente riporterebbe un lavoro fra i pronti SENZA MOTIVO — cioè
        // aggirerebbe D263, che è l'invariante dell'intera ondata.
        anon_rip: false, auth_rip: false,
      })
    })
  })
})

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  L'ALTRO RAMO DEL BIVIO — «se ne fa uno nuovo», e la sua unica proprietà
 *  che nessun'altra prova tocca.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🛑 PERCHÉ STA IN QUESTO FILE. Il bivio di D304 ha due rami: uno RIPORTA
 * indietro (tutto il resto di questo file), l'altro CREA. Il Passo 1 del piano
 * chiede «`si_rifa` chiamato **due volte** → **un solo** lavoro nuovo», ed è la
 * sola voce di quel passo che **non si può misurare dal browser**: a ogni giro
 * il foglio conia un evento nuovo, quindi lo stesso evento non si ripresenta
 * mai a schermo. La ripetizione vera nasce da un secondo tocco o da un
 * ritentativo dopo un timeout — cioè dal livello che qui si può riprodurre.
 *
 * 🔑 Ed è un progressivo d'anno: senza il vincolo, un doppio tocco fa nascere
 * DUE lavori e ne brucia due. Il guard che c'era prima viveva nella memoria del
 * client (`DevoIntervenire.tsx:147`), cioè spariva a ogni ricarico.
 */
describe.skipIf(skipIntegrationTests)('crea_rifacimento_atomico — lo stesso evento non crea due lavori', () => {
  it('secondo tentativo con lo STESSO evento → 23505 su rifacimento_evento_unique, e nessun secondo lavoro', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)

      const { rows: [primo] } = await client.query(
        `SELECT public.crea_rifacimento_atomico($1, 'difetto_lavorazione', 'post_consegna', NULL, NULL, $2) AS r`,
        [lavoroId, eventoId]
      )
      const nuovo = primo.r as { lavoro_nuovo_id?: string; numero_lavoro?: string }
      expect(nuovo.lavoro_nuovo_id).toBeTruthy()

      await client.query('SAVEPOINT prima_del_secondo')
      await expect(
        client.query(
          `SELECT public.crea_rifacimento_atomico($1, 'difetto_lavorazione', 'post_consegna', NULL, NULL, $2) AS r`,
          [lavoroId, eventoId]
        )
      ).rejects.toThrow(/rifacimento_evento_unique/)
      await client.query('ROLLBACK TO SAVEPOINT prima_del_secondo')

      // 🔑 UN SOLO lavoro nuovo, e la rotta sa ritrovarlo: è la lettura che fa
      // `creaRifacimento` sul ramo 23505 (`eventi-qualita/route.ts:627-641`),
      // qui provata contro l'indice vero invece che contro una finzione.
      const { rows } = await client.query(
        `SELECT lavoro_nuovo_id FROM lavori_rifacimenti
          WHERE laboratorio_id = $1 AND evento_id = $2`,
        [LAB_A, eventoId]
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].lavoro_nuovo_id).toBe(nuovo.lavoro_nuovo_id)
    })
  })

  it('il lavoro nato NON eredita la consegna: nasce fra quelli da fare, e l\'originale resta consegnato', async () => {
    await withRollback(async (client) => {
      const clienteId = await creaCliente(client, LAB_A)
      const lavoroId = await creaLavoroConsegnato(client, LAB_A, clienteId)
      const eventoId = await creaEvento(client, LAB_A, lavoroId)

      const { rows: [r] } = await client.query(
        `SELECT public.crea_rifacimento_atomico($1, 'difetto_materiale', 'post_consegna', NULL, NULL, $2) AS r`,
        [lavoroId, eventoId]
      )
      const nuovoId = (r.r as { lavoro_nuovo_id: string }).lavoro_nuovo_id

      const { rows: [nuovo] } = await client.query(
        `SELECT stato, conformato, data_consegna_effettiva, prima_immissione_at FROM lavori WHERE id = $1`, [nuovoId]
      )
      expect(nuovo.conformato).toBe(false)
      expect(nuovo.data_consegna_effettiva).toBeNull()
      // 🛑 Il manufatto nuovo non è MAI stato immesso sul mercato: se ereditasse
      // la data del vecchio, il termine dell'Allegato XIII p.4 partirebbe da un
      // fatto che non lo riguarda.
      expect(nuovo.prima_immissione_at).toBeNull()

      const { rows: [vecchio] } = await client.query(
        `SELECT stato FROM lavori WHERE id = $1`, [lavoroId]
      )
      // ⚖️ D304 — questo ramo NON riporta indietro niente: il lavoro di prima
      // resta consegnato, con la sua dichiarazione.
      expect(vecchio.stato).toBe('consegnato')
    })
  })
})
