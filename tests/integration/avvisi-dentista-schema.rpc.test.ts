import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Comportamento REALE della tabella `public.avvisi_dentista` (Task 1
// dell'ondata «l'avviso al dentista»), contro il database vero, in
// transazione sempre annullata.
//
// PERCHÉ ESISTE — il piano elenca questo file fra quelli da creare ma
// nessuno dei suoi sei passi lo lancia, e il suo Passo 4 prova SOLO che un
// valore sbagliato venga rifiutato. Il rischio dichiarato dal piano stesso
// (autorevisione ③) è l'opposto: che i tre CHECK, mai eseguiti insieme,
// rendano impossibile uno stato LEGITTIMO. Qui stanno entrambe le
// direzioni — tre rifiuti attesi e tre accettazioni che DEVONO riuscire.
//
// ⚠️ IL RUOLO DELLA CONNESSIONE NON È QUELLO DELL'APPLICAZIONE.
// SUPABASE_DB_URL si connette come `postgres`, PROPRIETARIO delle tabelle e
// con BYPASSRLS: un INSERT fatto da lì riesce sempre, qualunque politica ci
// sia. Le prove sui permessi girano quindi dentro `SET LOCAL ROLE`
// (transazionale, la annulla il ROLLBACK), più controlli di CATALOGO che non
// dipendono affatto dal ruolo della connessione.
//
// 🔑 E `service_role` ha `rolbypassrls = true` (misurato): su di lui la RLS
// non morde. La frase del piano «nessuna politica di INSERT ⇒ nessun
// chiamante applicativo può crearne uno» è quindi FALSA per il ruolo che il
// server usa davvero, a meno che il permesso di tabella non sia revocato.
// Le prove (p3) e (p4) sono lì per questo.

const LAB_A = '00000000-0000-0000-0000-000000000001' // lab E2E dedicato

type Client = Parameters<Parameters<typeof withRollback>[0]>[0]

/** I quattro id veri che servono alle chiavi esterne, più l'autore. */
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
  // 🛑 Le chiavi esterne arrivano PRIMA dei CHECK: con id finti si legge
  // 23503 e non si prova niente. Se il banco non ha le fixture, si dice.
  for (const [nome, valore] of Object.entries(r)) {
    if (!valore) throw new Error(`il lab E2E ${LAB_A} non ha ${nome}: eseguire scripts/seed-e2e.ts`)
  }
  return r as {
    lavoro_id: string; cliente_id: string; dichiarazione_id: string; utente_id: string
  }
}

/**
 * Esegue `fn` dentro un SAVEPOINT e restituisce codice e messaggio
 * dell'errore atteso. Serve perché in PostgreSQL un errore aborta l'intera
 * transazione: senza savepoint, dopo il primo rifiuto ogni query successiva
 * fallirebbe con «current transaction is aborted».
 * 🛑 Se `fn` RIESCE, questo helper lancia: un rifiuto atteso che non arriva
 * è il difetto, non un caso da ignorare.
 */
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

/** Inserisce un avviso, lasciando scegliere al chiamante i campi di stato. */
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
     RETURNING id, stato, testo_inviato, comunicato_at, comunicato_da, campi_corretti, created_at`,
    Object.values(base)
  )
}

describe.skipIf(skipIntegrationTests)('avvisi_dentista — comportamento reale', () => {
  it('la connessione è il proprietario e AGGIRA la RLS: le prove sui permessi devono cambiare ruolo', async () => {
    // Non è un test di dominio: è la dichiarazione, misurata, del motivo per
    // cui le prove (p1)-(p4) usano SET LOCAL ROLE. Se un giorno
    // SUPABASE_DB_URL puntasse a un ruolo non privilegiato, questo test lo
    // direbbe subito invece di lasciarle verdi per il motivo sbagliato.
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT current_user AS utente,
                (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS aggira_rls,
                (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role') AS sr_aggira_rls`
      )
      expect(rows[0].aggira_rls).toBe(true)
      // 🔑 Il fatto che rende falsa la riga 148 del piano.
      expect(rows[0].sr_aggira_rls).toBe(true)
    })
  })

  // ── ③ direzione «rifiuto»: i valori che DEVONO essere respinti ──────────
  describe('③a i vincoli rifiutano davvero (R-P1: si prova col valore che deve fallire)', () => {
    it('uno stato fuori vocabolario è rifiutato — con gli altri due CHECK SODDISFATTI', async () => {
      // 🛑 L'ISOLAMENTO NON È PEDANTERIA, È LA PROVA STESSA. Il Passo 4 del
      // piano sonda `stato='pippo'` lasciando data e autore a NULL: in quella
      // forma è violato ANCHE `avviso_comunicato_ha_autore_e_data` (il suo
      // secondo ramo pretende la data quando lo stato non è `da_comunicare`),
      // e Postgres riporta quello che valuta per primo.
      // `provato:` la sonda del piano, verbatim → 23514 su
      // «avviso_comunicato_ha_autore_e_data». Cioè: la sola prova R-P1 del
      // Task 1 sarebbe passata NOMINANDO IL VINCOLO SBAGLIATO, e non avrebbe
      // detto niente sul vocabolario. Qui data e autore sono valorizzati, e il
      // testo è assente: resta un solo vincolo che può fallire.
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, "stato='pippo' con data e autore veri", () =>
          inserisci(client, rif, {
            stato: 'pippo', comunicato_at: new Date(), comunicato_da: rif.utente_id,
          })
        )
        expect(e.code).toBe('23514')
        expect(e.message).toMatch(/avviso_stato_vocabolario/)
      })
    })

    it('SENTINELLA — la sonda del piano (solo `stato`) inciampa nell\'ALTRO vincolo', async () => {
      // Questa prova non difende un requisito: fissa il fatto misurato, così
      // se un giorno i due CHECK venissero ridisegnati si sappia subito che la
      // sovrapposizione è cambiata. È il motivo per cui la prova qui sopra
      // deve valorizzare data e autore.
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, "stato='pippo' nudo, come nel piano", () =>
          inserisci(client, rif, { stato: 'pippo' })
        )
        expect(e.code).toBe('23514')
        expect(e.message).toMatch(/avviso_comunicato_ha_autore_e_data/)
      })
    })

    it('«da_comunicare» con una data di comunicazione è rifiutato', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, 'da_comunicare con comunicato_at', () =>
          inserisci(client, rif, { stato: 'da_comunicare', comunicato_at: new Date() })
        )
        expect(e.code).toBe('23514')
        expect(e.message).toMatch(/avviso_comunicato_ha_autore_e_data/)
      })
    })

    it('un avviso comunicato SENZA autore è rifiutato (D335: chi e quando)', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, 'comunicato_dall_app senza comunicato_da', () =>
          inserisci(client, rif, {
            stato: 'comunicato_dall_app', comunicato_at: new Date(), testo_inviato: 'x',
          })
        )
        expect(e.code).toBe('23514')
        expect(e.message).toMatch(/avviso_comunicato_ha_autore_e_data/)
      })
    })

    it('«comunicato_dall_app» senza il testo mandato è rifiutato', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, 'comunicato_dall_app senza testo_inviato', () =>
          inserisci(client, rif, {
            stato: 'comunicato_dall_app', comunicato_at: new Date(), comunicato_da: rif.dichiarazione_id,
          })
        )
        // ⚠️ comunicato_da qui è volutamente un id NON di utenti: se il CHECK
        // non scattasse prima, leggeremmo 23503 e sapremmo che il vincolo di
        // contenuto non c'è. Il codice atteso resta 23514.
        expect(e.code).toBe('23514')
        expect(e.message).toMatch(/avviso_testo_solo_se_dall_app/)
      })
    })

    // ── ④ il CHECK che prometteva più di quel che faceva ──────────────────
    it('④ «comunicato_a_voce» CON un testo inviato è rifiutato — D339: si registra solo il testo MANDATO', async () => {
      // 🔴 Con la formulazione del piano
      //    CHECK (stato <> 'comunicato_dall_app' OR testo_inviato IS NOT NULL)
      // questo INSERT RIUSCIVA: il vincolo imponeva il testo sull'invio
      // dall'app ma non lo vietava altrove, mentre il suo nome
      // («testo solo se dall'app») promette il divieto.
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, 'comunicato_a_voce con testo_inviato', () =>
          inserisci(client, rif, {
            stato: 'comunicato_a_voce', comunicato_at: new Date(),
            comunicato_da: rif.utente_id, testo_inviato: 'detto a voce, ma scritto qui',
          })
        )
        expect(e.code).toBe('23514')
        expect(e.message).toMatch(/avviso_testo_solo_se_dall_app/)
      })
    })

    it('④ e nemmeno una BOZZA su «da_comunicare» si conserva (D339)', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, 'da_comunicare con testo_inviato', () =>
          inserisci(client, rif, { stato: 'da_comunicare', testo_inviato: 'bozza proposta' })
        )
        expect(e.code).toBe('23514')
        expect(e.message).toMatch(/avviso_testo_solo_se_dall_app/)
      })
    })
  })

  // ── ③ direzione «accettazione»: il rischio che il piano DICHIARA ────────
  describe('③b i tre stati legittimi passano tutti — i CHECK non rendono impossibile la vita', () => {
    it('① «da_comunicare» nasce senza autore e senza data', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows } = await inserisci(client, rif, {
          stato: 'da_comunicare', campi_corretti: ['paziente_nome', 'descrizione_dispositivo'],
        })
        expect(rows[0].stato).toBe('da_comunicare')
        expect(rows[0].comunicato_at).toBeNull()
        expect(rows[0].comunicato_da).toBeNull()
        expect(rows[0].campi_corretti).toEqual(['paziente_nome', 'descrizione_dispositivo'])
      })
    })

    it('② «comunicato_dall_app» con autore, data e testo inviato', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows } = await inserisci(client, rif, {
          stato: 'comunicato_dall_app', comunicato_at: new Date(),
          comunicato_da: rif.utente_id, testo_inviato: 'La dichiarazione e stata corretta e rifatta.',
        })
        expect(rows[0].stato).toBe('comunicato_dall_app')
        expect(rows[0].comunicato_da).toBe(rif.utente_id)
        expect(rows[0].testo_inviato).not.toBeNull()
      })
    })

    it('③ «comunicato_a_voce» con autore e data, e SENZA testo (D335)', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows } = await inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: rif.utente_id,
        })
        expect(rows[0].stato).toBe('comunicato_a_voce')
        expect(rows[0].comunicato_da).toBe(rif.utente_id)
        expect(rows[0].testo_inviato).toBeNull()
      })
    })

    it('e il valore di default è «da_comunicare»: l\'avviso nasce aperto', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows } = await inserisci(client, rif, {})
        expect(rows[0].stato).toBe('da_comunicare')
        expect(rows[0].campi_corretti).toEqual([])
      })
    })
  })

  // ── ② l'autore punta a public.utenti, non a auth.users ──────────────────
  describe('② «chi ha comunicato» punta a public.utenti — non a auth.users', () => {
    it('il CATALOGO dice utenti: senza questo, il nome dell\'autore non è leggibile via PostgREST', async () => {
      // 🔑 Perché conta più della coerenza: D335 chiede di registrare CHI, e
      // la scheda del dentista (Task 9) deve mostrarne il nome. Lo schema
      // `auth` non è esposto da PostgREST, quindi una FK verso auth.users
      // rende l'incorporazione dell'autore impossibile. 17 colonne sorelle su
      // 18 puntano già a utenti (l'unica eccezione, inviti.created_by, è una
      // tabella PRE-account).
      await withRollback(async (client) => {
        const { rows } = await client.query(`
          SELECT c.confrelid::regclass::text AS punta_a, pg_get_constraintdef(c.oid) AS def
            FROM pg_constraint c
            JOIN unnest(c.conkey) AS k(attnum) ON true
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
           WHERE c.contype = 'f' AND c.conrelid = 'public.avvisi_dentista'::regclass
             AND a.attname = 'comunicato_da'`)
        expect(rows).toHaveLength(1)
        expect(rows[0].punta_a).toBe('utenti')
      })
    })

    it('un autore che non è un utente del laboratorio è rifiutato con 23503', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const e = await attesoRifiuto(client, 'comunicato_da con un uuid inesistente', () =>
          inserisci(client, rif, {
            stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: randomUUID(),
          })
        )
        expect(e.code).toBe('23503')
        expect(e.message).toMatch(/comunicato_da/)
      })
    })

    it('cancellare l\'autore di un avviso chiuso è BLOCCATO, non azzerato', async () => {
      // 🛑 Perché NON `ON DELETE SET NULL`: l'azione referenziale è un UPDATE,
      // che rivaluta `avviso_comunicato_ha_autore_e_data` — il quale pretende
      // l'autore quando lo stato è chiuso. Con SET NULL la cancellazione di un
      // utente morirebbe con un 23514 incomprensibile invece del 23503 giusto.
      // NO ACTION è anche la scelta di dichiarazioni_conformita.generated_by.
      // ⚠️ L'autore NON può essere un utente del banco: i tre utenti del lab
      // E2E sono già puntati da altre tabelle (`lavoro_prove.created_by` per
      // primo), quindi il DELETE morirebbe su una chiave esterna ALTRUI e la
      // prova non direbbe niente sulla nostra. `provato:` col primo utente del
      // banco → 23503 su `lavoro_prove_created_by_fkey`. Serve un autore
      // usa-e-getta, puntato SOLO dall'avviso: nasce e muore in questa
      // transazione annullata.
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const autoreId = randomUUID()
        await client.query(`INSERT INTO auth.users (id) VALUES ($1)`, [autoreId])
        await client.query(
          `INSERT INTO public.utenti (id, laboratorio_id, nome, cognome, ruolo)
           VALUES ($1, $2, 'Autore', 'Usa e getta', 'front_desk')`,
          [autoreId, LAB_A]
        )
        await inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: autoreId,
        })

        const e = await attesoRifiuto(client, 'DELETE dell\'utente autore', () =>
          client.query(`DELETE FROM public.utenti WHERE id = $1`, [autoreId])
        )
        expect(e.code).toBe('23503')
        expect(e.message).toMatch(/avvisi_dentista_comunicato_da_fkey/)
      })
    })
  })

  // ── ⑤ i permessi: la RLS da sola non basta, perché service_role la aggira ─
  describe('⑤ nessuno crea un avviso dall\'applicazione — e non è la RLS a garantirlo', () => {
    it('(p1) come `authenticated` l\'INSERT è rifiutato: nessuna politica di INSERT', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        await client.query('SET LOCAL ROLE authenticated')
        const { rows: [chi] } = await client.query('SELECT current_user AS u')
        expect(chi.u).toBe('authenticated') // se non fosse così, il resto non proverebbe niente
        const e = await attesoRifiuto(client, 'INSERT come authenticated', () =>
          inserisci(client, rif, { stato: 'da_comunicare' })
        )
        expect(e.message).toMatch(/permission denied|row-level security/i)
        await client.query('RESET ROLE')
      })
    })

    it('(p2) il CATALOGO: i tre ruoli hanno SELECT e UPDATE, mai INSERT/DELETE/TRUNCATE', async () => {
      // Controllo indipendente dal ruolo della connessione: nessun SET ROLE lo
      // può falsare. È l'unica cosa che prova che REVOKE/GRANT siano atterrati
      // — `db push` che esce 0 non lo mostra.
      await withRollback(async (client) => {
        const { rows } = await client.query(`
          SELECT r AS ruolo,
                 has_table_privilege(r, 'public.avvisi_dentista', 'SELECT')   AS sel,
                 has_table_privilege(r, 'public.avvisi_dentista', 'UPDATE')   AS upd,
                 has_table_privilege(r, 'public.avvisi_dentista', 'INSERT')   AS ins,
                 has_table_privilege(r, 'public.avvisi_dentista', 'DELETE')   AS del,
                 has_table_privilege(r, 'public.avvisi_dentista', 'TRUNCATE') AS trunc
            FROM unnest(ARRAY['anon','authenticated','service_role']) AS r`)
        expect(rows).toHaveLength(3)
        for (const p of rows) {
          expect(p).toMatchObject({ sel: true, upd: true, ins: false, del: false, trunc: false })
        }
      })
    })

    it('(p3) e nemmeno `service_role` — che AGGIRA la RLS — riesce a inserire', async () => {
      // 🔴 Questa è la prova che smentisce la riga 148 del piano. Senza il
      // REVOKE, qui l'INSERT RIUSCIREBBE: service_role ha BYPASSRLS, quindi
      // «nessuna politica di INSERT» non lo tocca affatto.
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        await client.query('SET LOCAL ROLE service_role')
        const { rows: [chi] } = await client.query('SELECT current_user AS u')
        expect(chi.u).toBe('service_role')
        const e = await attesoRifiuto(client, 'INSERT come service_role', () =>
          inserisci(client, rif, { stato: 'da_comunicare' })
        )
        expect(e.message).toMatch(/permission denied/i)
        await client.query('RESET ROLE')
      })
    })

    it('(p4) TRUNCATE è rifiutato ai tre ruoli — e TRUNCATE ignora la RLS', async () => {
      // Stessa famiglia del difetto D274 ②, già pagato su valutazioni_evento:
      // i privilegi di default di questo progetto concedono `arwdDxtm` (ALL,
      // TRUNCATE compreso) a anon/authenticated/service_role su OGNI tabella
      // nuova di `public`. Senza REVOKE, un TRUNCATE avrebbe svuotato gli
      // avvisi di TUTTI i laboratori insieme.
      await withRollback(async (client) => {
        for (const ruolo of ['anon', 'authenticated', 'service_role']) {
          await client.query(`SET LOCAL ROLE ${ruolo}`)
          const e = await attesoRifiuto(client, `TRUNCATE come ${ruolo}`, () =>
            client.query('TRUNCATE public.avvisi_dentista')
          )
          expect(e.message).toMatch(/permission denied/i)
          await client.query('RESET ROLE')
        }
      })
    })

    it('(p5) la lettura resta isolata per laboratorio: la politica c\'è e usa public.current_lab_id()', async () => {
      await withRollback(async (client) => {
        const { rows } = await client.query(`
          SELECT policyname, cmd, qual, with_check
            FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'avvisi_dentista'
           ORDER BY policyname`)
        expect(rows.map((r) => `${r.policyname}:${r.cmd}`))
          .toEqual(['avvisi_lettura_lab:SELECT', 'avvisi_scrittura_lab:UPDATE'])
        for (const p of rows) {
          expect(p.qual).toMatch(/current_lab_id/)
          expect(p.qual).not.toMatch(/auth\.current_lab_id/)
        }
        expect(rows[1].with_check).toMatch(/current_lab_id/)
      })
    })

    it('(p6) la RLS è ACCESA: senza, le politiche sarebbero decorative', async () => {
      await withRollback(async (client) => {
        const { rows } = await client.query(
          `SELECT relrowsecurity, relforcerowsecurity FROM pg_class
            WHERE oid = 'public.avvisi_dentista'::regclass`
        )
        expect(rows[0].relrowsecurity).toBe(true)
      })
    })
  })

  // ── gli indici, che il piano dichiara e nessun passo verifica ───────────
  it('i due indici dichiarati esistono, e quello del promemoria è PARZIALE', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(`
        SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'avvisi_dentista'
         ORDER BY indexname`)
      const nomi = rows.map((r) => r.indexname)
      expect(nomi).toContain('idx_avvisi_da_comunicare')
      expect(nomi).toContain('idx_avvisi_per_cliente')
      const promemoria = rows.find((r) => r.indexname === 'idx_avvisi_da_comunicare')!
      // Se il WHERE cadesse, l'indice del promemoria coprirebbe anche gli
      // avvisi già chiusi: la lettura più frequente diventerebbe la più lenta.
      expect(promemoria.indexdef).toMatch(/WHERE \(stato = 'da_comunicare'::text\)/)
    })
  })

  // ── D274, quarta volta nella stessa famiglia ────────────────────────────
  it('cancellare un laboratorio che ha un avviso arriva in fondo (famiglia D274 ①)', async () => {
    // 🔴 `avvisi_dentista` NON è nell'elenco di admin_delete_laboratorio, che
    // cancella le tabelle A MANO. La funzione sopravvive SOLO perché tutte e
    // quattro le chiavi esterne di questa tabella sono ON DELETE CASCADE: le
    // righe muoiono con le dichiarazioni, che l'elenco cancella per prime.
    // Con `ON DELETE RESTRICT` su cliente_id/dichiarazione_id — come il piano
    // li scriveva — questa prova fallirebbe con 23503.
    await withRollback(async (client) => {
      const labB = randomUUID()
      await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [
        labB, 'Lab B — prova cancellazione con avviso',
      ])
      const clienteId = randomUUID()
      await client.query(
        `INSERT INTO clienti (id, laboratorio_id, nome, cognome)
         VALUES ($1, $2, 'Studio', 'Prova avvisi')`, [clienteId, labB]
      )
      const { rows: [lavoro] } = await client.query(
        `INSERT INTO lavori (laboratorio_id, numero_lavoro, cliente_id, tipo_dispositivo,
                             descrizione, data_consegna_prevista)
         VALUES ($1, 'AVV-001', $2, 'protesi_fissa', 'lavoro di prova avvisi', current_date)
         RETURNING id`, [labB, clienteId]
      )
      const { rows: [ddc] } = await client.query(
        `INSERT INTO dichiarazioni_conformita
           (laboratorio_id, lavoro_id, numero_ddc, progressivo_ddc, fabbricante_nome,
            fabbricante_indirizzo, fabbricante_piva, prescrittore_nome, paziente_nome,
            tipo_dispositivo, descrizione_dispositivo, classe_rischio, testo_conformita, prrc_nome)
         VALUES ($1, $2, 'AVV/2026/1', 1, 'Lab B', 'Via Prova 1', '00000000000',
                 'Dott. Prova', 'P. P.', 'protesi_fissa', 'prova', 'classe_iia', 'conforme', 'PRRC Prova')
         RETURNING id`, [labB, lavoro.id]
      )
      await client.query(
        `INSERT INTO public.avvisi_dentista
           (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, campi_corretti)
         VALUES ($1, $2, $3, $4, ARRAY['paziente_nome'])`,
        [labB, lavoro.id, clienteId, ddc.id]
      )

      const { rows: [esito] } = await client.query(
        `SELECT public.admin_delete_laboratorio($1) AS r`, [labB]
      )
      expect(esito.r.ok).toBe(true)
      // 🛑 E l'elenco NON nomina avvisi_dentista: il conteggio restituito è
      // MUTO su quelle righe. Riferito fuori mandato, non corretto qui.
      expect(esito.r.deleted).not.toHaveProperty('avvisi_dentista')
      const { rows: [dopo] } = await client.query(
        `SELECT count(*)::int AS n FROM public.avvisi_dentista WHERE laboratorio_id = $1`, [labB]
      )
      expect(dopo.n).toBe(0)
    })
  })
})
