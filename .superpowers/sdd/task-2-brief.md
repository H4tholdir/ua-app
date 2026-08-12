### Task 2: La firma non può puntare a un altro laboratorio (riga 59)

**Files:**
- Create: `tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts`
- Modify: `tests/integration/avvisi-dentista-schema.rpc.test.ts:349` (asserzione sul nome della FK)
- Create: `supabase/migrations/<TS2>_avvisi_firma_stesso_laboratorio.sql` (TS2 dal passo 1, > TS1)

**Interfaces:**
- Consumes: niente dal Task 1 (indipendente).
- Produces: `utenti_id_lab_uk` UNIQUE (id, laboratorio_id) su `utenti` — disponibile come bersaglio per
  OGNI futura FK composita verso utenti (le altre 22 restano semplici, fuori mandato) — e
  `avvisi_dentista_comunicato_da_fk` composita al posto della `_fkey` semplice.

- [ ] **Step 1: timestamp (D311)**

```bash
date -u "+%Y%m%d%H%M%S"
```
Output = `<TS2>`. Deve superare `<TS1>` (lo supera: l'orologio UTC cresce sempre — è il punto di D311).

- [ ] **Step 2: scrivi il test che DEVE fallire** — `non eseguito` · verifica: passo 4

Crea `tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts` (stessi helper locali del file del
Task 1 — `riferimentiVeri`, `attesoRifiuto`, `inserisci`, ricopiati identici; qui si mostrano solo le
prove):

```typescript
import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'

// Riga 59 della coda (revisione finale di ramo, 11/08/2026): comunicato_da era
// una FK SEMPLICE verso utenti(id) — la chiusura poteva essere attribuita a un
// utente di UN ALTRO laboratorio (`provato:` P6b, 11/08: la firma si spostava
// perfino su un utente con laboratorio_id NULL). Il rimedio è il modello già
// applicato tre volte da 20260806142910: UNIQUE (id, laboratorio_id) sul padre
// e FK composita (comunicato_da, laboratorio_id) sul figlio.
// [helper locali identici a avvisi-chiusura-one-way.rpc.test.ts — v. quel file]

const LAB_A = '00000000-0000-0000-0000-000000000001'

// … riferimentiVeri, attesoRifiuto, inserisci: COPIARE dal file del Task 1 …

/** Un utente vero usa-e-getta, nel laboratorio scelto (ricetta avvisi-dentista-schema:335). */
async function utenteUsaEGetta(
  client: Parameters<Parameters<typeof withRollback>[0]>[0],
  laboratorioId: string | null,
  ruolo = 'tecnico'
) {
  const id = randomUUID()
  await client.query(`INSERT INTO auth.users (id) VALUES ($1)`, [id])
  await client.query(
    `INSERT INTO public.utenti (id, laboratorio_id, nome, cognome, ruolo)
     VALUES ($1, $2, 'Usa', 'E getta', $3)`, [id, laboratorioId, ruolo]
  )
  return id
}

describe.skipIf(skipIntegrationTests)('avvisi_dentista — la firma è dello stesso laboratorio (riga 59)', () => {
  // ── il catalogo: i due vincoli nuovi esistono, il vecchio non c'è più ─────
  it('① utenti ha il vincolo UNIQUE (id, laboratorio_id) — il bersaglio delle composite', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='public.utenti'::regclass AND conname='utenti_id_lab_uk'`)
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toBe('UNIQUE (id, laboratorio_id)')
    })
  })

  it('② la FK di comunicato_da è COMPOSITA e punta a utenti (id, laboratorio_id)', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid='public.avvisi_dentista'::regclass
            AND conname='avvisi_dentista_comunicato_da_fk'`)
      expect(rows).toHaveLength(1)
      expect(rows[0].def).toBe(
        'FOREIGN KEY (comunicato_da, laboratorio_id) REFERENCES utenti(id, laboratorio_id)')
    })
  })

  it('③ la vecchia FK semplice non esiste più', async () => {
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM pg_constraint
          WHERE conrelid='public.avvisi_dentista'::regclass
            AND conname='avvisi_dentista_comunicato_da_fkey'`)
      expect(rows).toHaveLength(0)
    })
  })

  // ── il comportamento: la coppia deve esistere in utenti ───────────────────
  it('④ la firma di un utente di UN ALTRO laboratorio è respinta con 23503', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const labB = randomUUID()
      await client.query(`INSERT INTO laboratori (id, nome) VALUES ($1, $2)`, [
        labB, 'Lab B — prova firma cross-tenant',
      ])
      const utenteB = await utenteUsaEGetta(client, labB)
      const e = await attesoRifiuto(client, 'avviso del lab A firmato dal lab B', () =>
        inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: utenteB,
        })
      )
      expect(e.code).toBe('23503')
      expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
    })
  })

  it('⑤ la firma di un admin_sistema senza laboratorio è respinta con 23503', async () => {
    // laboratorio_id NULL è legale per admin_sistema (CHECK
    // utenti_lab_required_for_non_admin) — ma la coppia (id, NULL) non esiste
    // per la FK. Coerente con D342: admin_rete e admin_sistema sono già
    // esclusi PER NOME dalla chiusura (RUOLI_CHIUSURA_AVVISO, ruoli.ts:72).
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const admin = await utenteUsaEGetta(client, null, 'admin_sistema')
      const e = await attesoRifiuto(client, 'avviso firmato da un admin senza lab', () =>
        inserisci(client, rif, {
          stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: admin,
        })
      )
      expect(e.code).toBe('23503')
      expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
    })
  })

  // ── le controprove ────────────────────────────────────────────────────────
  it('⑥ la firma di un utente DELLO STESSO laboratorio passa', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const utenteA = await utenteUsaEGetta(client, LAB_A)
      const { rows } = await inserisci(client, rif, {
        stato: 'comunicato_a_voce', comunicato_at: new Date(), comunicato_da: utenteA,
      })
      expect(rows[0].comunicato_da).toBe(utenteA)
    })
  })

  it('⑦ un avviso APERTO (comunicato_da NULL) nasce ancora: MATCH SIMPLE non morde sui NULL', async () => {
    await withRollback(async (client) => {
      const rif = await riferimentiVeri(client)
      const { rows } = await inserisci(client, rif, { stato: 'da_comunicare' })
      expect(rows[0].stato).toBe('da_comunicare')
      expect(rows[0].comunicato_da).toBeNull()
    })
  })
})
```

- [ ] **Step 3: aggiorna l'asserzione sul nome della FK nel test esistente** — `non eseguito` · verifica: passo 4 (rosso) e 6 (verde)

In `tests/integration/avvisi-dentista-schema.rpc.test.ts`, riga 349:

```typescript
// PRIMA:
        expect(e.message).toMatch(/avvisi_dentista_comunicato_da_fkey/)
// DOPO (il nome nuovo; le virgolette ancorano il nome ESATTO nel messaggio Postgres):
        expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
```
⚠️ SOLO questa riga: il resto del file non si tocca (il test a riga 306-317 asserisce `/comunicato_da/`,
che il nome nuovo soddisfa; il test-catalogo a riga 285-304 cerca per COLONNA, non per nome).

- [ ] **Step 4: RED — esegui e CONTA (R-P4)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts tests/integration/avvisi-dentista-schema.rpc.test.ts
```
Atteso: **6 rossi** nel file nuovo — ①②③ (catalogo: i vincoli non esistono ancora) e ④⑤ (`ATTESO
RIFIUTO, INVECE ACCETTATO`: il banco accetta ancora le firme altrui) più la riga 349 aggiornata (nel
messaggio c'è ancora `_fkey`) — **conteggio da scrivere: `5 su 7` nel file nuovo + `1` nell'esistente**;
⑥⑦ verdi da subito. Forme d'input: cross-tenant · lab NULL · stesso lab · NULL (riga aperta) ·
uuid inesistente (già coperto dall'esistente:306) · DELETE dell'autore (già coperto dall'esistente:319).

- [ ] **Step 5: scrivi la migration** — `non eseguito` · verifica: passi 6-7

Crea `supabase/migrations/<TS2>_avvisi_firma_stesso_laboratorio.sql`:

```sql
-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- Riga 59 della coda (revisione finale di ramo, 11/08/2026): comunicato_da era
-- una FK SEMPLICE verso utenti(id) — la RLS vincola solo laboratorio_id, quindi
-- la chiusura poteva essere attribuita a un utente di UN ALTRO laboratorio.
-- `provato:` 11/08, transazione annullata: la firma di un avviso chiuso si
-- spostava su un utente con laboratorio_id NULL, senza errori.
-- È la stessa classe che il ramo ha bollato CRITICA e chiuso con la FK
-- COMPOSITA in 20260806142910 (tre volte: eventi_qualita→lavori,
-- valutazioni_evento→eventi_qualita, lavori_rifacimenti→eventi_qualita) —
-- qui non applicata perché a utenti mancava il bersaglio UNIQUE.
--
-- ═══ I DUE ATTI ══════════════════════════════════════════════════════════════
-- ① Il bersaglio: UNIQUE (id, laboratorio_id) su utenti. id è già PK, quindi
--    la coppia è unica per costruzione: il vincolo non può fallire sui dati
--    esistenti e costa un indice. Modello di nome: lavori_id_lab_uk
--    (20260727120000), eventi_qualita_id_lab_uk (20260806142910).
-- ② La sostituzione: via la _fkey semplice, dentro la composita. MATCH SIMPLE
--    (default): sulle righe APERTE comunicato_da è NULL e la FK non morde;
--    sulle righe CHIUSE la coppia (autore, laboratorio dell'avviso) DEVE
--    esistere in utenti — cioè l'autore è del laboratorio dell'avviso.
--    NO ACTION (default), come il modello e come la _fkey che sostituisce.
--
-- `provato:` prima di scrivere: 0 firme cross-tenant nei dati vivi (la ADD
-- CONSTRAINT valida le righe esistenti senza pulizia) · admin_delete_laboratorio
-- porta via gli avvisi IN CASCATA (dichiarazioni_conformita e lavori) PRIMA di
-- toccare utenti, quindi la composita non cambia la cancellazione di un lab ·
-- l'unico admin_sistema (lab NULL) non è mai una firma legittima: D342 esclude
-- admin_rete e admin_sistema PER NOME dalla chiusura (RUOLI_CHIUSURA_AVVISO).
--
-- ⚠️ Il nome cambia (…_fkey → …_fk, convenzione delle composite): i tre punti
-- che lo nominavano sono censiti nel piano — database.types.ts (rigenerato),
-- avvisi-dentista-schema.rpc.test.ts:349 (aggiornato nello stesso task),
-- ROADMAP riga 43 (citazione storica, resta).

ALTER TABLE public.utenti
  ADD CONSTRAINT utenti_id_lab_uk UNIQUE (id, laboratorio_id);

ALTER TABLE public.avvisi_dentista
  DROP CONSTRAINT avvisi_dentista_comunicato_da_fkey,
  ADD CONSTRAINT avvisi_dentista_comunicato_da_fk
    FOREIGN KEY (comunicato_da, laboratorio_id)
    REFERENCES public.utenti (id, laboratorio_id);

COMMENT ON CONSTRAINT avvisi_dentista_comunicato_da_fk ON public.avvisi_dentista IS
  'Riga 59: la firma della chiusura è un utente DELLO STESSO laboratorio. '
  'Composita anti cross-tenant, modello 20260806142910. MATCH SIMPLE: le righe '
  'aperte (comunicato_da NULL) non sono vincolate.';
```

- [ ] **Step 6: applica (D284) e GREEN**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts tests/integration/avvisi-dentista-schema.rpc.test.ts
```
Atteso: **tutti passed** (7 nuovi + l'intero file esistente, riga 349 compresa).

- [ ] **Step 7: FASE 6b — i types CAMBIANO qui**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit
```
Atteso: `git diff src/types/database.types.ts` mostra SOLO la Relationship di `comunicato_da`:
`foreignKeyName: "avvisi_dentista_comunicato_da_fk"` e `columns: ["comunicato_da", "laboratorio_id"]`
(o forma equivalente del generatore). tsc pulito. Un diff più ampio si legge e si capisce PRIMA di
proseguire. Controllo finale del censimento:
```bash
grep -rn "comunicato_da_fkey" src tests supabase --include="*.ts" --include="*.sql"
```
Atteso: **0 hit**.

- [ ] **Step 8: commit (D318)**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git status --short
git add supabase/migrations/<TS2>_avvisi_firma_stesso_laboratorio.sql tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts tests/integration/avvisi-dentista-schema.rpc.test.ts src/types/database.types.ts
git commit -F <file-messaggio>
```
Messaggio: `feat(db): la firma dell'avviso è dello stesso laboratorio — FK composita (riga 59)`
più il censimento del nome in due righe.

---

