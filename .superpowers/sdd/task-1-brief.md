### Task 1: Vincolo one-way sulla chiusura (riga 58)

**Files:**
- Create: `tests/integration/avvisi-chiusura-one-way.rpc.test.ts`
- Create: `supabase/migrations/<TS1>_avvisi_chiusura_one_way.sql` (TS1 dal passo 1)

**Interfaces:**
- Consumes: helper `withRollback`/`skipIntegrationTests` da `tests/integration/helpers/pg-client` (esistenti, invariati).
- Produces: trigger `trg_avviso_chiusura_one_way` + funzione `public.avviso_chiusura_one_way()` sul banco. Il Task 2 non dipende da questo task; il Task 3 verifica entrambi.

- [ ] **Step 1: timestamp della migration (D311)**

```bash
date -u "+%Y%m%d%H%M%S"
```
Output = `<TS1>`. Deve superare `20260810072748` (lo supera per costruzione: oggi è l'11/08).

- [ ] **Step 2: scrivi il test che DEVE fallire** — `non eseguito` · verifica: passo 3

Crea `tests/integration/avvisi-chiusura-one-way.rpc.test.ts`:

```typescript
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
```

⚠️ Nota su ⑨: il valore di ritorno di `avvisi_segna_visti` — la chiave `aggiornati` — va verificato
sul corpo vivo PRIMA di fidarsi dell'asserzione: `node scripts/psql.mjs -c "SELECT prosrc FROM pg_proc WHERE proname='avvisi_segna_visti'"`.
Se la chiave è diversa (es. `json_build_object` con altro nome), l'asserzione si adegua al corpo vero.

- [ ] **Step 3: RED — esegui e CONTA (R-P4)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-chiusura-one-way.rpc.test.ts
```
Atteso: **6 rossi su 11** — ①-⑥ falliscono con `ATTESO RIFIUTO, INVECE ACCETTATO` (il banco accetta
ancora tutto) e ⑪ fallisce con `expected [] to have length 1` (il trigger non esiste); ⚠️ sono 7 rossi
contando ⑪. **Conteggio da scrivere nel report: `7 su 11`** (6 di comportamento + 1 di catalogo);
⑦-⑩ verdi da subito (controprove: passano anche senza trigger).
Le forme d'input enumerate: riapertura · riattribuzione · retrodatazione · riscrittura testo · scambio
chiusa→chiusa · ruolo service_role · chiusura legittima ×2 · ricevuta su chiusa · campi_corretti su chiusa.
Non coperta, e perché: l'UPDATE no-op su riga chiusa (`SET stato=stato`) — `IS DISTINCT FROM` lo lascia
passare per costruzione e nessun flusso lo esegue.

- [ ] **Step 4: scrivi la migration** — `non eseguito` · verifica: passi 5-6

Crea `supabase/migrations/<TS1>_avvisi_chiusura_one_way.sql`:

```sql
-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- Riga 58 della coda (revisione finale di ramo, 11/08/2026, area banca dati):
-- un avviso GIÀ COMUNICATO restava riscrivibile — e perfino riapribile — da
-- chiunque avesse il GRANT delle quattro colonne (20260809124517): il ritorno
-- a 'da_comunicare' coi tre NULL soddisfa avviso_comunicato_ha_autore_e_data
-- e avviso_testo_solo_se_dall_app, e nessun trigger esisteva (pg_trigger: 0).
-- `provato:` 11/08/2026, transazione annullata sul banco vero — riapertura coi
-- tre NULL: RIUSCITA; riattribuzione della firma a un altro utente: RIUSCITA.
-- COMMENT ON TABLE dichiara questa tabella «la prova che è avvenuta» (GDPR
-- Art. 5(2)): una prova riscrivibile a piacere non è una prova.
--
-- ═══ IL RIMEDIO: TRIGGER DI TRANSIZIONE ONE-WAY ══════════════════════════════
-- Una riga con stato ≠ 'da_comunicare' non cambia MAI più le quattro colonne
-- della chiusura: stato, comunicato_at, comunicato_da, testo_inviato. Le altre
-- colonne restano libere DI PROPOSITO: visto_dal_dentista_at è la ricevuta di
-- lettura (avvisi_segna_visti scrive DOPO la chiusura, è il suo mestiere) e
-- campi_corretti ha già una nota che ne anticipa gli update su avvisi vecchi
-- (20260809133546:60-67).
--
-- PERCHÉ IL TRIGGER E NON IL MODELLO REVOKE+RPC (valutazione_supera,
-- 20260806142910): là l'UPDATE era revocabile PER INTERO perché nessuna rotta
-- lo usava; qui la chiusura legittima È un UPDATE di rotta
-- (src/app/api/lavori/[id]/avviso/route.ts:414-420, ridisegnato da D354 e
-- collaudato sul banco vero il 10/08). Revocare e spostare in RPC
-- riscriverebbe una rotta appena approvata; il trigger chiude il buco per
-- OGNI attore (service_role col suo BYPASSRLS compreso) senza toccare una
-- riga di server. Il GRANT per colonna resta: serve alle righe APERTE.
--
-- I flussi vivi NON incontrano il trigger, misurato prima di scriverlo:
-- · la rotta di chiusura filtra .in('stato', STATI_APERTI) — mai una riga chiusa;
-- · correggi_e_riemetti_atomica fa un INSERT, mai update (20260809133546:488);
-- · avvisi_segna_visti tocca solo visto_dal_dentista_at (20260810072748:41-45).

CREATE FUNCTION public.avviso_chiusura_one_way()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stato         IS DISTINCT FROM OLD.stato
  OR NEW.comunicato_at IS DISTINCT FROM OLD.comunicato_at
  OR NEW.comunicato_da IS DISTINCT FROM OLD.comunicato_da
  OR NEW.testo_inviato IS DISTINCT FROM OLD.testo_inviato
  THEN
    RAISE EXCEPTION
      'trg_avviso_chiusura_one_way: l''avviso % è già comunicato (stato %): stato, autore, data e testo non si riscrivono — la riga è la prova (GDPR Art. 5(2))',
      OLD.id, OLD.stato;
  END IF;
  RETURN NEW;
END;
$$;

-- Una funzione RETURNS trigger non è chiamabile direttamente («trigger
-- functions can only be called as triggers»), ma l'idioma di casa REVOca
-- comunque: dopo un CREATE, Postgres concede EXECUTE a PUBLIC.
REVOKE ALL ON FUNCTION public.avviso_chiusura_one_way() FROM PUBLIC, anon, authenticated;

-- La WHEN tiene il trigger FUORI dal percorso caldo: sulle righe aperte
-- (la chiusura legittima, l'unico UPDATE che l'app esegue) non scatta affatto.
CREATE TRIGGER trg_avviso_chiusura_one_way
  BEFORE UPDATE ON public.avvisi_dentista
  FOR EACH ROW
  WHEN (OLD.stato <> 'da_comunicare')
  EXECUTE FUNCTION public.avviso_chiusura_one_way();

COMMENT ON FUNCTION public.avviso_chiusura_one_way() IS
  'Riga 58: dopo la chiusura, stato/comunicato_at/comunicato_da/testo_inviato '
  'sono congelati per OGNI attore (service_role compreso). visto_dal_dentista_at '
  'e campi_corretti restano liberi di proposito. La riga è la prova ex Art. 5(2) '
  'GDPR: one-way, senza strada di ritorno.';
```

- [ ] **Step 5: applica (D284)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
Atteso: applica `<TS1>_avvisi_chiusura_one_way.sql` senza errori.

- [ ] **Step 6: GREEN — riesegui e verifica sul catalogo**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-chiusura-one-way.rpc.test.ts
```
Atteso: **11 passed** (nessuno saltato: controlla il conteggio).
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && node scripts/psql.mjs -c "SELECT tgname FROM pg_trigger WHERE tgrelid='public.avvisi_dentista'::regclass AND NOT tgisinternal"
```
Atteso: `trg_avviso_chiusura_one_way` — il file non è la prova, il catalogo sì.

- [ ] **Step 7: FASE 6b + suite avvisi esistente**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit
```
Atteso: tsc pulito; `git diff --stat src/types/database.types.ts` → **nessun diff** (un trigger non
appare nei types). Se un diff c'è, si legge e si capisce PRIMA di proseguire.
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts tests/integration/avvisi-segna-visti.rpc.test.ts
```
Atteso: tutti passed — il trigger non rompe le prove esistenti (in particolare (p8) e la famiglia D274).

- [ ] **Step 8: commit (D318)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git status --short
git add supabase/migrations/<TS1>_avvisi_chiusura_one_way.sql tests/integration/avvisi-chiusura-one-way.rpc.test.ts
git commit -F <file-messaggio>
```
Messaggio: `feat(db): trigger one-way sulla chiusura degli avvisi — la prova non si riscrive (riga 58)`
più due righe sul perché (trigger e non RPC; le due colonne lasciate libere).

---

