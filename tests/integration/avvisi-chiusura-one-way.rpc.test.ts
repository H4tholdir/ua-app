import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Riga 58 della coda (revisione finale di ramo, 11/08/2026): un avviso GIÀ
// COMUNICATO restava riscrivibile e riapribile — `provato:` in transazione
// annullata l'11/08 la riapertura coi tre NULL e la riattribuzione della firma
// RIUSCIVANO entrambe. La tabella è «la prova che è avvenuta» (GDPR Art. 5(2)):
// da questa migration un trigger one-way congela stato, autore, data e testo
// DOPO la chiusura. Le altre colonne (visto_dal_dentista_at, campi_corretti)
// restano libere: la ricevuta di lettura e le correzioni future devono passare.
//
// ⚠️ Helper locali RICOPIATI da avvisi-dentista-schema.rpc.test.ts (riferimentiVeri,
// attesoRifiuto, inserisci): è la convenzione viva di tests/integration/ (ogni file
// è autosufficiente). La loro estrazione in helpers/ è pulizia da riferire, non da
// fare qui (R-E2).

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

/** Un avviso già comunicato a voce, nato dentro la transazione. */
async function avvisoChiusoAVoce(client: Client) {
  const rif = await riferimentiVeri(client)
  const { rows: [avviso] } = await inserisci(client, rif, {
    stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: rif.utente_id,
  })
  return { rif, avviso }
}

/** Un avviso già comunicato dall'app (col testo), nato dentro la transazione. */
async function avvisoChiusoDallApp(client: Client) {
  const rif = await riferimentiVeri(client)
  const { rows: [avviso] } = await inserisci(client, rif, {
    stato: 'comunicato_dall_app', comunicato_at: new Date(),
    comunicato_da: rif.utente_id, testo_inviato: 'La dichiarazione e stata corretta e rifatta.',
  })
  return { rif, avviso }
}

describe.skipIf(skipIntegrationTests)('avvisi_dentista — la chiusura è one-way (riga 58)', () => {
  // ── i cinque movimenti che DEVONO essere respinti ─────────────────────────
  describe('una riga comunicata non si riscrive', () => {
    it('① la RIAPERTURA (ritorno a da_comunicare coi tre NULL) è respinta', async () => {
      // `provato:` l'11/08, PRIMA del trigger, questo UPDATE riusciva (P6a).
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const e = await attesoRifiuto(client, 'riapertura di un avviso comunicato', () =>
          client.query(
            `UPDATE public.avvisi_dentista
                SET stato='da_comunicare', comunicato_at=NULL, comunicato_da=NULL, testo_inviato=NULL
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('② la RIATTRIBUZIONE della firma è respinta', async () => {
      // `provato:` P6b — prima del trigger la firma si spostava perfino su un
      // utente con laboratorio_id NULL.
      await withRollback(async (client) => {
        const { rif, avviso } = await avvisoChiusoAVoce(client)
        // un secondo utente vero, usa-e-getta (ricetta avvisi-dentista-schema:335)
        const altroId = randomUUID()
        await client.query(`INSERT INTO auth.users (id) VALUES ($1)`, [altroId])
        await client.query(
          `INSERT INTO public.utenti (id, laboratorio_id, nome, cognome, ruolo)
           VALUES ($1, $2, 'Altro', 'Autore', 'tecnico')`, [altroId, LAB_A]
        )
        void rif
        const e = await attesoRifiuto(client, 'cambio di comunicato_da su riga chiusa', () =>
          client.query(
            `UPDATE public.avvisi_dentista SET comunicato_da = $2 WHERE id = $1`,
            [avviso.id, altroId]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('③ la RETRODATAZIONE di comunicato_at è respinta', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const e = await attesoRifiuto(client, 'retrodatazione della comunicazione', () =>
          client.query(
            `UPDATE public.avvisi_dentista SET comunicato_at = comunicato_at - interval '30 days'
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('④ la RISCRITTURA del testo già mandato è respinta', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoDallApp(client)
        const e = await attesoRifiuto(client, 'riscrittura di testo_inviato', () =>
          client.query(
            `UPDATE public.avvisi_dentista SET testo_inviato = 'un testo mai mandato'
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('⑤ lo SCAMBIO fra i due stati chiusi è respinto', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const e = await attesoRifiuto(client, 'comunicato_a_voce → comunicato_dall_app', () =>
          client.query(
            `UPDATE public.avvisi_dentista
                SET stato='comunicato_dall_app', testo_inviato='fabbricato dopo'
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
      })
    })

    it('⑥ e vale anche per service_role, il ruolo VERO delle rotte: il GRANT resta, il trigger morde', async () => {
      // È la minaccia della riga 58 così com'è scritta: «riscrivibile dai ruoli
      // col GRANT delle quattro colonne». Il GRANT c'è ancora (serve alla
      // chiusura legittima): a fermare la riscrittura ora è il trigger.
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        await client.query('SET LOCAL ROLE service_role')
        const { rows: [chi] } = await client.query('SELECT current_user AS u')
        expect(chi.u).toBe('service_role')
        const e = await attesoRifiuto(client, 'riapertura come service_role', () =>
          client.query(
            `UPDATE public.avvisi_dentista
                SET stato='da_comunicare', comunicato_at=NULL, comunicato_da=NULL, testo_inviato=NULL
              WHERE id = $1`, [avviso.id]
          )
        )
        expect(e.code).toBe('P0001')
        expect(e.message).toMatch(/trg_avviso_chiusura_one_way/)
        await client.query('RESET ROLE')
      })
    })
  })

  // ── le controprove: ciò che DEVE continuare a passare ─────────────────────
  describe('i flussi legittimi non sono toccati', () => {
    it('⑦ la chiusura di un avviso APERTO passa (a voce)', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows: [aperto] } = await inserisci(client, rif, { stato: 'da_comunicare' })
        const { rows } = await client.query(
          `UPDATE public.avvisi_dentista
              SET stato='comunicato_a_voce', comunicato_at=now(), comunicato_da=$2
            WHERE id = $1 RETURNING stato`, [aperto.id, rif.utente_id]
        )
        expect(rows[0].stato).toBe('comunicato_a_voce')
      })
    })

    it('⑧ la chiusura di un avviso APERTO passa (dall\'app, col testo)', async () => {
      await withRollback(async (client) => {
        const rif = await riferimentiVeri(client)
        const { rows: [aperto] } = await inserisci(client, rif, { stato: 'da_comunicare' })
        const { rows } = await client.query(
          `UPDATE public.avvisi_dentista
              SET stato='comunicato_dall_app', comunicato_at=now(), comunicato_da=$2,
                  testo_inviato='Il documento del lavoro e stato rifatto.'
            WHERE id = $1 RETURNING stato, testo_inviato`, [aperto.id, rif.utente_id]
        )
        expect(rows[0].stato).toBe('comunicato_dall_app')
        expect(rows[0].testo_inviato).not.toBeNull()
      })
    })

    it('⑨ la ricevuta di lettura passa ANCHE su una riga chiusa (avvisi_segna_visti)', async () => {
      // visto_dal_dentista_at è FUORI dalle quattro colonne congelate, di
      // proposito: il dentista legge QUANDO legge, anche dopo la chiusura.
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const { rows: [ris] } = await client.query(
          `SELECT public.avvisi_segna_visti(ARRAY[$1]::uuid[], $2) AS r`,
          [avviso.id, LAB_A]
        )
        expect(ris.r.aggiornati).toBe(1)
        const { rows: [dopo] } = await client.query(
          `SELECT visto_dal_dentista_at FROM public.avvisi_dentista WHERE id = $1`,
          [avviso.id]
        )
        expect(dopo.visto_dal_dentista_at).not.toBeNull()
      })
    })

    it('⑩ campi_corretti resta correggibile anche dopo la chiusura (20260809133546:60-67 lo anticipa)', async () => {
      await withRollback(async (client) => {
        const { avviso } = await avvisoChiusoAVoce(client)
        const { rows } = await client.query(
          `UPDATE public.avvisi_dentista SET campi_corretti = ARRAY['paziente_nome']
            WHERE id = $1 RETURNING campi_corretti`, [avviso.id]
        )
        expect(rows[0].campi_corretti).toEqual(['paziente_nome'])
      })
    })
  })

  // ── il catalogo: il trigger esiste ed è BEFORE UPDATE per riga ────────────
  it('⑪ il trigger è nel catalogo: BEFORE UPDATE, FOR EACH ROW, con la sua WHEN', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
          WHERE tgrelid = 'public.avvisi_dentista'::regclass AND NOT tgisinternal
            AND tgname = 'trg_avviso_chiusura_one_way'`
      )
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toMatch(/BEFORE UPDATE/)
      expect(rows[0].def).toMatch(/FOR EACH ROW/)
      expect(rows[0].def).toMatch(/WHEN \(\(old\.stato <> 'da_comunicare'::text\)\)/)
      expect(rows[0].def).toMatch(/EXECUTE FUNCTION avviso_chiusura_one_way\(\)/)
    })
  })
})
