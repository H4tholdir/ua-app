# P7 — Il registro DPA: cancello, traccia e il «chi» · Piano di esecuzione

> **Per gli esecutori:** SOTTO-SKILL RICHIESTA — `superpowers:subagent-driven-development` (consigliata) o `superpowers:executing-plans`. I passi usano le caselle `- [ ]`.
> 🛑 **R-E1: un compito alla volta, a un esecutore FRESCO**, con revisione fra l'uno e l'altro, e nel brief l'ordine esplicito di **cercare dove questo piano sbaglia**.
> 🛑 **R-E2: un difetto trovato FUORI dal proprio mandato si RIFERISCE, non si corregge di nascosto.** Si raccoglie in una sola sezione dell'handoff.

**Obiettivo:** la tabella che dovrà contenere la prova dell'accettazione smette di essere scrivibile dal client dell'utente, comincia a lasciare traccia di ogni modifica, e la traccia sa dire **chi** ha emesso.

**Architettura:** una sola migration additiva (regola di riga → `FOR SELECT`, automatismo del registro modifiche, colonna `emesso_da`), poi il percorso applicativo che la riempie con un parametro **obbligatorio** — così il compilatore impedisce la dimenticanza che ha svuotato la colonna gemella della DdC.

**Stack:** PostgreSQL (Supabase) · TypeScript · Next.js 16 · vitest.

**Spec:** `docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md` (D146 · D147 · D148 · D149).

---

## Vincoli globali — valgono per OGNI task

- 🛑 **MAI un git worktree.** Branch nel repo principale: `git checkout -b p7-registro-dpa-cancello-traccia`.
- 🛑 **`read_only: true` SEMPRE** sulle letture della Management API. ✅ **Le scritture sul database vivo sono state AUTORIZZATE da Francesco (D151)** e valgono **solo** per la migration del Task 1 Step 5 e per le prove del Task 3, che finiscono tutte in `ROLLBACK`. **Nessun'altra scrittura**: fuori da quei due punti si torna a `read_only: true`.
- 🛑 **Mai `git add -A`.** `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Nessun `BEGIN;`/`COMMIT;` dentro la migration** — il runner Supabase la avvolge già. L'idempotenza è **per singola istruzione**.
- **Ogni migration aggiorna ANCHE `supabase/schema.sql` a mano**, nello stesso commit. `provato:` `git show --name-only a7206183` → i due file insieme.
- **FASE 7 per intero, output incollato:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`. Riferimento di partenza: `tsc` **0** · **4380 | 19** prove · build **0**.
- **FASE 9 / 9b NON si applicano:** nessuna superficie UI cambia.
- **`find` di questo Mac è `bfs`** e non accetta `-newermt` relativo: usare date ISO.
- **Il guard `rm`:** negli script si usa `/bin/rm` con percorso pieno.

---

## Registro delle LETTURE (R-P2) — l'elenco NON lo decide l'autore, lo decide il censimento

| file | esito |
|---|---|
| `src/lib/pdf/generate-dpa.ts` | **letto: righe 1-40, 88-217, 270-349** — l'INSERT è alla **284-303**, un `.insert({…})` normale col client di servizio: **nessuna funzione di database da attraversare**. Il ramo di riuso è alla **162-171** e **non scrive** |
| `src/app/api/clienti/[id]/dpa/route.ts` | **letto: righe 1-60** — unico chiamante applicativo (riga **49**); `context` viene da `getLabContextWithTimings()` |
| `src/lib/supabase/lab-context.ts` | **letto: righe 1-70** — `LabContext.userId: string` alla **13**, valorizzato alla **50** |
| `tests/unit/generate-dpa.test.ts` | **letto: 1-80** — 3 chiamate, mock su `getServiceClient` |
| `tests/unit/dpa-registro.test.ts` | **letto: 1-130, 341-450, 545-575** — 50 chiamate; il payload dell'INSERT si legge con `mockInsert.mock.calls[0][0]` |
| `tests/unit/dpa-route.test.ts` | **letto: 1-30 (elenco), riga 85** — `generateDpa` è **mockata** qui: 1 asserzione sugli argomenti |
| `tests/unit/cliente-dpa-ultima-emissione.test.ts` | **NON letto** — non chiama `generateDpa` (censimento: 0 occorrenze). ⚠️ **L'esecutore del Task 2 lo apre comunque** se `tsc` o `vitest` lo toccano |
| `supabase/schema.sql` | **letto: righe 2865-2890 (tabella), 2960-2966 (il precedente `sdi_receipts`), 1261 (il precedente MORTO `generated_by`)** |
| `supabase/migrations/20260517000002_fix_audit_trigger_jsonb.sql` | **letto: 1-49** — `_audit_trigger_fn` è **generica**: legge `id` e `laboratorio_id` da `to_jsonb`, entrambe presenti sulla tabella |
| `supabase/migrations/20260704120000_b3_cicli_fasi_audit.sql` | **letto: 1-13** — la forma esatta con cui si aggancia una tabella al registro |
| `supabase/migrations/20260803150000_dpa_registro_emissioni.sql` | **letto: 1-30** — stile idempotente e intestazione col catalogo vivo |
| `supabase/migrations/20260727120200_lavori_colore_caso.sql` | **letto: 93-175** — `admin_delete_laboratorio`: DPA alla **155**, `utenti` alla **163** |
| `docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` | **letto: 598-625** — le tre strade per applicare una migration, e il ledger |

---

## CENSIMENTO degli identificatori (R-P6) — non solo le colonne

| identificatore | oggi | dopo | destinazione se cambia |
|---|---|---|---|
| `dpa_laboratorio` (regola) | `FOR ALL`, `with_check` NULL | **`FOR SELECT`**, stessa `USING` | — |
| `data_processing_agreements` | 22 colonne | **23** | — |
| `emesso_da` | **non esiste** | `UUID REFERENCES utenti(id)`, annullabile | riempita da `generate-dpa.ts:286` |
| `data_processing_agreements_emesso_da_fkey` | — | nome generato da Postgres | citato nel Task 3 |
| `_audit_data_processing_agreements` (automatismo) | **non esiste** | `AFTER INSERT OR DELETE OR UPDATE` | — |
| `_audit_trigger_fn` | esiste, **10** agganci | **11** agganci | invariata |
| `generateDpa(a, b)` | 2 parametri | **3, il terzo OBBLIGATORIO** | **55 chiamate**, ma solo **54 tipizzate contro la firma vera**: `dpa-registro.test.ts` **50** · `generate-dpa.test.ts` **3** · `route.ts` **1**. 🛑 **La 55ª è in `dpa-route.test.ts` e NON conta per `tsc`:** lì `generateDpa` è **sostituita da una finta** (`vi.mock` → `mockGenerateDpa`, un `vi.fn()` senza tipo), quindi il compilatore non la guarda. **Si rompe a prove, non a compilazione** (riga **85**: `toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)`, che dopo il Task 2 riceverà **tre** argomenti) |
| `EmissioneDpa` | 4 campi | **invariata** | 🛑 `emesso_da` **non entra** nel valore di ritorno: nessuno lo consuma (YAGNI) |
| `LabContext.userId` | esiste, non usato qui | passato a `generateDpa` | — |
| `database.types.ts` | 22 colonne nel tipo | **23** | **generato**, mai a mano (FASE 6b) |
| `PATCHABLE_FIELDS` | — | **non toccata** | `emesso_da` non è correggibile a mano: lo scrive il server (ragione valida per la direttiva del 27/07) |

🛑 **Nessun nome viene TOLTO da nessuna allowlist in questo lavoro.** L'unica allowlist vicina (`PATCHABLE_FIELDS` in `src/app/api/lavori/[id]/route.ts`) riguarda `lavori`, non questa tabella.

---

## Registro delle PROVE (R-P1) — fail-closed: ciò che non è marcato è NON provato

| # | assunzione | stato |
|---|---|---|
| A1 | la finestra è ancora gratuita | `provato:` `{"righe":2,"con_firmato_at":0,"con_firmato_da":0}` · `{"stato":"da_firmare","n":2}` |
| A2 | la regola vale anche in scrittura | `provato:` `cmd=ALL`, `with_check=null`, `rls_attiva=true`, `rls_forzata=false` |
| A3 | il precedente in casa è `FOR SELECT` | `provato:` `sdi_receipts_laboratorio`, `cmd=SELECT` |
| A4 | la tabella NON è sorvegliata | `provato:` le 10 agganciate elencate; questa non c'è |
| A5 | passare a sola lettura non rompe la cancellazione del laboratorio | `provato:` `admin_delete_laboratorio` è `security_definer=true`, proprietario `postgres`; `postgres` possiede la tabella; `relforcerowsecurity=false` |
| A6 | agganciare il registro non rompe la cancellazione | `provato:` `audit_log` ha **solo** `audit_log_pkey` e `audit_log_operation_check` → **nessuna chiave esterna** · e già registra `lavori` **82** DELETE, `clienti` **6**, `laboratori` **4** |
| A7 | la chiave esterna nuda non morde | `provato:` DPA cancellati alla riga **155**, `utenti` alla **163** · `provato:` **18 su 18** le chiavi esterne verso `utenti` sono nude · `provato:` nessun percorso applicativo cancella un utente singolo |
| A8 | il chiamante ha già il «chi» | `provato:` `LabContext.userId: string` (`lab-context.ts:13`) |
| A9 | l'INSERT non passa da una funzione di database | `provato:` `generate-dpa.ts:284-303` è un `.insert({…})` diretto |
| A10 | il ramo di riuso non scrive | `provato:` `generate-dpa.ts:162-171` restituisce e basta |
| **B1** | **il DDL di questa migration è corretto** | 🛑 **non eseguito** — l'esecutore lo verifica col Task 1 Step 5 (sonde) e Step 6 (applicazione) |
| **B2** | **la regola nuova RIFIUTA davvero una scrittura** | 🛑 **non eseguito** — è **T1**, Task 3. Un `CREATE POLICY` riuscito prova la sintassi, **non** il comportamento |
| **B3** | **`_audit_trigger_fn` funziona su QUESTA tabella** | 🛑 **non eseguito** — è **T2**, Task 3 |
| **B4** | **`tsc` si accende su ogni chiamata a due argomenti** | 🛑 **non eseguito** — atteso: **54 errori `TS2554`** (50 + 3 + 1, **non 55**: la chiamata di `dpa-route.test.ts` è a una funzione **finta** e il compilatore non la guarda), Task 2 Step 2. ⚠️ **Anche questa previsione è un blocco e porta il suo marchio:** 🔑 **la prima stesura di questo piano diceva 55, e sbagliava** — il numero è stato corretto aprendo `dpa-route.test.ts:85`. Se l'esecutore ne conta un numero **diverso da 54**, il censimento è sbagliato: si ferma e riferisce |

---

# Task 1 — La migration: cancello, traccia, colonna

**File:**
- 🆕 Crea (nuovo): `supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql`
- Modifica: `supabase/schema.sql` (righe **2876-2878** per la regola; il blocco colonne intorno a **2864-2884**)
- Modifica: `src/types/database.types.ts` (**generato**, mai a mano)

**Interfacce:**
- Produce: la colonna `emesso_da` nel tipo `data_processing_agreements` di `database.types.ts` — **il Task 2 non compila senza**.

- [ ] **Step 0: il ramo, e lo stato di partenza**

```bash
git checkout -b p7-registro-dpa-cancello-traccia && git status -sb
```

- [ ] **Step 1: rileggere il catalogo VIVO, in sola lettura, PRIMA di scrivere il file**

🔑 Le misure di questo piano sono del 04/08. Si rileggono: un numero vecchio ha l'aria di un numero fresco.

```bash
node scripts/tmp/p7-riverifica.mjs
```

Atteso: **2 righe, 0 firmate** · `dpa_laboratorio` con `cmd=ALL` e `ha_with_check=false` · `data_processing_agreements` **assente** dall'elenco degli automatismi di audit.
🛑 **Se la tabella non è più vuota di firme, ci si FERMA e si riferisce:** la finestra a costo zero si è chiusa e il piano va ripensato.

- [ ] **Step 2: scrivere la migration**

```sql
-- supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql
-- P7 — il registro DPA smette di essere scrivibile dal client dell'utente,
-- comincia a lasciare traccia, e la traccia sa dire CHI ha emesso.
-- Spec: docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md
-- Decisioni: D146 (si parte da P7) · D147 (cancello + traccia) · D148 (il «chi»).
--
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge gia' la migration.
-- L'idempotenza e' per SINGOLA istruzione: il file sopravvive a una seconda
-- esecuzione anche se la prima si e' fermata a meta'.
--
-- Stato del catalogo VIVO letto il 04/08/2026 PRIMA di scrivere questo file
-- (Management API, read_only:true) — le query in forma copiabile stanno nel
-- piano, Task 1 Step 1, che e' in git e sopravvive a questo file:
--   docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md
--   · dpa_laboratorio: polcmd = '*' (ALL), polwithcheck = NULL
--     → PostgreSQL riusa USING come WITH CHECK: un utente del laboratorio,
--       anche un `tecnico`, potrebbe riscrivere le righe del proprio lab.
--   · nessun automatismo di audit sulla tabella (10 tabelle agganciate, non questa);
--   · emesso_da NON esiste (22 colonne censite una per una);
--   · 2 righe, 0 firmate → nessun ADD COLUMN puo' abortire su dati veri.

-- ── ① IL CANCELLO ────────────────────────────────────────────────────────────
-- Il modello e' `sdi_receipts_laboratorio` (schema.sql:2963-2966), FOR SELECT,
-- col commento «mai UPDATE/DELETE su documenti fiscali». Qui la ragione e' la
-- stessa: una prova che la parte interessata puo' riscrivere non e' una prova.
-- Il filtro `deleted_at IS NULL` RESTA: ora che la regola e' di sola lettura,
-- fa il mestiere per cui era stato scritto — nascondere le righe archiviate.
-- Nessun WITH CHECK: senza comando di scrittura ammesso non c'e' scrittura da
-- controllare, e aggiungerlo darebbe l'idea di una porta dove non c'e' piu' porta.
DROP POLICY IF EXISTS "dpa_laboratorio" ON public.data_processing_agreements;
CREATE POLICY "dpa_laboratorio" ON public.data_processing_agreements
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id() AND deleted_at IS NULL
  );

-- ── ② LA TRACCIA ─────────────────────────────────────────────────────────────
-- Da DIECI tabelle sorvegliate a UNDICI. `_audit_trigger_fn` e' generica: legge
-- `id` e `laboratorio_id` da to_jsonb(NEW/OLD), entrambe presenti qui.
-- ⚠️ La traccia dira' COSA e QUANDO, non CHI: auth.uid() e' vuoto quando scrive
-- il client di servizio (1.587 righe su 1.588 in audit_log — voce P25). Il «chi»
-- di QUESTA tabella arriva dal blocco ③, dentro la fotografia della riga.
DROP TRIGGER IF EXISTS _audit_data_processing_agreements ON public.data_processing_agreements;
CREATE TRIGGER _audit_data_processing_agreements
  AFTER INSERT OR DELETE OR UPDATE ON public.data_processing_agreements
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

-- ── ③ IL «CHI» ───────────────────────────────────────────────────────────────
-- Sta accanto a `emesso_at`: c'era il quando, mancava il chi.
-- 🛑 NON e' `firmato_da`, che e' TEXT ed e' il nome della CONTROPARTE allo studio.
-- Annullabile per scelta: le 2 righe esistenti sono nate prima e non si sa chi le
-- abbia emesse — riempirle sarebbe inventare una prova. Il vincolo vive nel
-- compilatore (terzo parametro OBBLIGATORIO di generateDpa), non in un valore finto.
-- Chiave esterna NUDA come tutte le altre 18 verso `utenti`: nessun percorso
-- cancella un utente singolo, e dentro admin_delete_laboratorio le righe DPA se ne
-- vanno alla 155, `utenti` alla 163. ⚠️ Quell'ORDINE e' ora PORTANTE.
-- Scartato ON DELETE SET NULL: cancellerebbe il «chi» quando un tecnico lascia il
-- laboratorio, cioe' proprio quando serve — contraddirebbe D148 in silenzio.
ALTER TABLE public.data_processing_agreements
  ADD COLUMN IF NOT EXISTS emesso_da UUID REFERENCES public.utenti(id);

COMMENT ON COLUMN public.data_processing_agreements.emesso_da IS
  'Utente di UA che ha EMESSO il documento (chi ha premuto). Distinto da firmato_da, che e'' il nome della controparte allo studio. Vuoto sulle righe nate prima del 04/08/2026: non si inventa. Sul RIUSO di un''emissione esistente NON si riscrive (spec P7, T3b).';
```

- [ ] **Step 3: aggiornare `supabase/schema.sql` a mano, nello stesso commit**

Due punti. ① Alla riga della colonna, dopo `emesso_at TIMESTAMPTZ,`:

```sql
  emesso_at         TIMESTAMPTZ,
  emesso_da         UUID REFERENCES utenti(id),        -- chi ha PREMUTO (≠ firmato_da, che e' la controparte)
```

② Alla regola (righe **2876-2878**), sostituendo il testo attuale:

```sql
CREATE POLICY "dpa_laboratorio" ON data_processing_agreements
  FOR SELECT USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
-- Solo SELECT (P7, 04/08/2026) — una prova che la parte interessata puo'
-- riscrivere non e' una prova. Stesso principio di sdi_receipts.
CREATE TRIGGER _audit_data_processing_agreements
  AFTER INSERT OR DELETE OR UPDATE ON data_processing_agreements
  FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();
```

- [ ] **Step 4: verificare che il file sia coerente con sé stesso**

```bash
grep -v '^--' supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql | grep -c "BEGIN;\|COMMIT;"
```

Atteso: **0**.
🔄 **CORRETTO dopo il Task 1, e il difetto era del piano:** qui c'era `grep -c "BEGIN;\|COMMIT;" <file>` senza escludere i commenti — e l'intestazione **obbligatoria** dello Step 2 contiene proprio le parole `BEGIN;`/`COMMIT;` dentro un commento. Il criterio dava **1** ed era **impossibile da soddisfare**, chiunque lo eseguisse. Trovato **due volte in modo indipendente** (esecutore e revisore del Task 1). 🔑 **Un controllo che non può mai passare insegna a ignorare i controlli.**

- [ ] **Step 5: APPLICARE la migration — Management API, `read_only:false` (D151)**

🔄 **Questo Step era il numero 6, e prima di lui ce n'era un altro che è stato TOLTO.** Lo Step 5 originale prometteva «le sonde su transazione annullata» e conteneva un `CREATE TEMP TABLE` seguito da `SELECT 1`: **non provava niente**. 🔑 **Un passo che finge una verifica è peggio di un passo assente** — chi lo esegue lo spunta e crede di aver provato qualcosa (R-P1: si marca solo ciò che è provato). Le prove vere di questa migration sono **T1-T5, nel Task 3**, e girano sulla tabella **vera**.

**Chi la applica:** Claude, con la Management API. ✅ **Deciso da Francesco (D151)**, fra tre strade presentate col loro prezzo.
🔑 **La decisione è esistita perché il divieto non era tecnico:** `.env.local` ha sempre avuto `SUPABASE_ACCESS_TOKEN` e `SUPABASE_DB_URL`. Un motivo falso è un motivo che smette di funzionare.
✅ **Rischio misurato:** la banca dati ha **solo dati di prova** (3 laboratori finti) e ogni istruzione è **idempotente**, quindi una seconda passata non fa nulla.

```bash
# le tre istruzioni della migration, una chiamata per blocco, read_only:false
# (il file è la fonte: si legge da lì, non si ricopia a mano)
```

⚠️ **Il ledger resta indietro di una riga e va rimesso in pari:**

```bash
npx supabase migration repair --status applied 20260804120000
```

- [ ] **Step 6: verificare che il database sia DAVVERO cambiato — in sola lettura**

```bash
node scripts/tmp/p7-riverifica.mjs
```

Atteso, e sono tre cose diverse: `dpa_laboratorio` con `comando: "r"` (era `"*"`) · `data_processing_agreements` **presente** fra gli automatismi · la colonna `emesso_da` nell'elenco.
🛑 **Questo Step NON prova il comportamento**, solo che il catalogo è cambiato. Il comportamento è il Task 3.

- [ ] **Step 7: FASE 6b — rigenerare i tipi (solo dopo lo Step 6)**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: **0 errori**. Togliere l'eventuale messaggio del CLI in fondo al file generato.

```bash
grep -c "emesso_da" src/types/database.types.ts
```

Atteso: **≥ 3** (Row, Insert, Update).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql supabase/schema.sql src/types/database.types.ts
git commit -F <messaggio fuori dal repo>
```

---

# Task 2 — Il «chi» nel codice: il parametro obbligatorio

**File:**
- Modifica: `src/lib/pdf/generate-dpa.ts:88` (firma) e `:286` (payload)
- Modifica: `src/app/api/clienti/[id]/dpa/route.ts:49`
- Modifica: `tests/unit/dpa-registro.test.ts` (**50** chiamate) · `tests/unit/generate-dpa.test.ts` (**3**) · `tests/unit/dpa-route.test.ts` (**1** + l'asserzione sugli argomenti alla riga **85**)

**Interfacce:**
- Consuma: la colonna `emesso_da` nei tipi generati (Task 1).
- Produce: `generateDpa(laboratorio_id: string, cliente_id: string, emesso_da: string): Promise<EmissioneDpa>`. 🛑 `EmissioneDpa` resta **a 4 campi**.

- [ ] **Step 1: scrivere le due prove nuove — PRIMA del codice**

In `tests/unit/dpa-registro.test.ts`, in coda al blocco che asserisce sul payload:

```typescript
  it('✅ T3a — su un\'emissione NUOVA il registro sa dire CHI ha premuto', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    // 🔑 `toBe`, non `toBeDefined()`: una colonna che esiste ed e' vuota e'
    //    ESATTAMENTE il difetto di dichiarazioni_conformita.generated_by
    //    (5 righe, 0 riempite — voce P26). «Definita» non basta.
    expect(riga.emesso_da).toBe('utente-007')
    // 🛑 E non si e' scritto nella colonna sbagliata: `firmato_da` e' il nome
    //    della CONTROPARTE allo studio, non chi opera in UA.
    expect(riga.firmato_da).toBeUndefined()
  })

  it('🛑 T3b — sul RIUSO il «chi» NON si riscrive, nemmeno se scarica un altro utente', async () => {
    montaTabelle(CORRENTE)   // esiste gia' un'emissione riusabile

    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-DIVERSO')

    // 🔑 Perche' questa prova esiste: senza di lei, chi legge solo T3a fa
    //    riscrivere `emesso_da` sul ramo di riuso «per coerenza» — cioe'
    //    riscrive un campo del REGISTRO DELLE PROVE, che e' il difetto che P7
    //    esiste per chiudere. La colonna dice CHI HA EMESSO, e l'emissione e'
    //    avvenuta una volta sola.
    expect(r.riemessa).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: farle fallire, e CONTARE (R-P4)**

```bash
npx tsc --noEmit 2>&1 | grep -c "TS2554"
```

🔄 **CORRETTO dopo l'esecuzione del Task 2 — questo passo era SBAGLIATO, e l'errore era di ordine.** Diceva: «atteso **54** errori *Expected 3 arguments, but got 2*». **Non a questo punto.** Prima di allargare la firma, la funzione ne prende ancora **due**, quindi gli unici errori sono i **2** dei test nuovi (*Expected 2 arguments, but got 3*). I **54** arrivano **subito dopo** l'abbozzo inerte, cioè quando la firma passa a tre parametri obbligatori. 🔑 **Un piano che chiede il numero giusto nel momento sbagliato manda l'esecutore a cercare un difetto che non c'è.**

**Il conteggio corretto, in due tempi:**

```bash
npx tsc --noEmit 2>&1 | grep -c "TS2554"
```

- **Ora, prima di toccare la firma:** atteso **2** (i due test nuovi che passano tre argomenti a una funzione che ne prende due).
- **Subito dopo l'abbozzo inerte** (terzo parametro accettato e **ignorato**, Step 3): atteso **54** — 50 da `dpa-registro.test.ts`, 3 da `generate-dpa.test.ts`, 1 dalla rotta.
🛑 **Se il secondo numero non è 54, il censimento di questo piano è sbagliato: fermarsi e riferire.**
⚠️ **La 55ª chiamata NON compare in nessuno dei due conteggi:** in `dpa-route.test.ts` `generateDpa` è sostituita da una finta, quindi `tsc` non la vede mai. Quel file si rompe **a prove**, allo Step 6.

```bash
npx vitest run tests/unit/dpa-registro.test.ts -t "T3a"
```

Atteso: **FAIL** — `expected undefined to be 'utente-007'`.

🔑 **Il rosso da «argomento in più» non prova che la prova provi qualcosa.** Dopo il primo rosso: si mette un **abbozzo inerte** (terzo parametro accettato e **ignorato**), si rilancia, e si **CONTA quante asserzioni si accendono**. Si scrive il numero: **N su M**.
✅ **Misurato eseguendo: 1 su 5.** Si accende `riga.emesso_da` di T3a; **1** non viene mai raggiunta (il test si ferma prima); **3** restano verdi ed è **T3b**. 🔑 **Quelle tre verdi non sono una debolezza, sono il progetto:** T3b è una prova di **NON-REGRESSIONE** — esiste per restare verde e diventare rossa solo se qualcuno tocca il ramo di riuso. Va scritto nel referto, o sembrerà una prova che non misura niente.

**Forme d'input da enumerare** (R-P4), sul terzo parametro: id valido ✅ (T3a) · stringa vuota ⚠️ **non coperta, perché**: `tsc` non la distingue da un id e la chiave esterna la rifiuterebbe solo a runtime — si copre col Task 3 T5 · `undefined` esplicito ✅ (lo blocca `tsc`) · id di un utente di **altro laboratorio** ⚠️ **non coperta, perché**: il chiamante è la rotta, che passa `context.userId` — un utente di un altro laboratorio non arriva mai lì · id inesistente ✅ (Task 3 T5, la chiave esterna deve mordere).

- [ ] **Step 3: la firma e il payload**

In `src/lib/pdf/generate-dpa.ts`, riga **88**:

```typescript
export async function generateDpa(
  laboratorio_id: string,
  cliente_id: string,
  /** Chi ha PREMUTO. 🛑 OBBLIGATORIO per scelta, non per rigore inutile: la
   *  colonna gemella della DdC (`dichiarazioni_conformita.generated_by`) e'
   *  facoltativa da mesi e ha 5 righe con ZERO valori. Una colonna che si puo'
   *  dimenticare e' una colonna dimenticata, e la dimenticanza non fa rumore.
   *  Qui il rumore lo fa `tsc`. */
  emesso_da: string,
): Promise<EmissioneDpa> {
```

E dentro il payload dell'INSERT, riga **~300**, accanto a `emesso_at`:

```typescript
      emesso_at: new Date().toISOString(),
      emesso_da,
```

🛑 **Non si tocca il ramo di riuso (162-171).** È T3b.

- [ ] **Step 4: il chiamante vero**

In `src/app/api/clienti/[id]/dpa/route.ts`, riga **49**:

```typescript
      const emissione = await generateDpa(labId, clienteId, context.userId)
```

- [ ] **Step 5: i 55 punti di prova**

I test passano un id **riconoscibile**, non un uuid a caso: un valore che, se finisse dove non deve, si vede.

```bash
sed -i '' "s/generateDpa('lab-test-001', 'cli-001')/generateDpa('lab-test-001', 'cli-001', 'utente-007')/g" tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts
npx tsc --noEmit 2>&1 | grep -c "TS2554"
```

`provato:` la forma esatta cercata dalla `sed` esiste **53 volte** (`grep -c` → `dpa-registro.test.ts` **50**, `generate-dpa.test.ts` **3**). La **54ª** è la rotta, già sistemata allo Step 4.
Atteso dopo la `sed`: **0**.

🛑 **Ma `dpa-route.test.ts` è ancora ROSSO, e non lo dice `tsc`.**
🔄 **CORRETTO dopo l'esecuzione: le asserzioni da sistemare sono TRE, non una** — righe **86**, **271**, **370**, tutte **misurate rosse** prima della correzione. Il piano ne indicava **una sola**, e citava la riga **85**, che è il **commento** sopra: l'asserzione vera è la **86**. 🔑 **Un piano che dice "una" quando sono tre non fa sbagliare chi legge il rosso — fa sbagliare chi NON lo legge**, e conclude di aver finito perché la prima è verde.
Ognuna delle tre asserisce `expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)`: la rotta ora ne passa **tre**, quindi falliscono **a esecuzione**. Vanno portate a:

```typescript
    // …e l'emissione è stata chiesta per QUESTO laboratorio, QUESTO cliente e
    // da QUESTO utente, in quest'ordine (`generateDpa(laboratorio_id, cliente_id, emesso_da)`).
    expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID, CONTESTO.userId)
```

`provato:` **il contesto finto porta già il «chi»** — `tests/unit/dpa-route.test.ts:42` ha `userId: 'user-1'` dentro `CONTESTO`. **Nessun mock da toccare**, e nessuna costante nuova da inventare.
🔑 **Questa asserzione è la prova che il «chi» arriva DALLA ROTTA e non è inventato dentro `generateDpa`** — senza di lei, un'implementazione che ci scrivesse una costante resterebbe verde.

- [ ] **Step 6: verde**

```bash
npx vitest run tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts tests/unit/dpa-route.test.ts
```

Atteso: tutte verdi, **due prove in più** di prima.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pdf/generate-dpa.ts "src/app/api/clienti/[id]/dpa/route.ts" tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts tests/unit/dpa-route.test.ts
git commit -F <messaggio fuori dal repo>
```

---

# Task 3 — Le prove di COMPORTAMENTO sul database vivo

🛑 **Questo task è la ragione per cui il lavoro non è finito col Task 2.** Una migration applicata prova che il database ha accettato una frase.

**File:**
- 🆕 Crea (nuovo): `scripts/tmp/p7-prove-comportamento.mjs` (usa e getta, **non si committa**)
- 🆕 Crea (nuovo): `docs/roadmap/2026-08-04-p7-referto-prove.md` (l'output incollato, questo **sì** in git)

- [ ] **Step 1: T1 — il RIFIUTO vero**

Dentro una transazione **annullata**, impersonando un utente del laboratorio:

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"<uuid di un utente vero del lab>","role":"authenticated"}';

  -- ① la LETTURA deve continuare a funzionare
  SELECT count(*) FROM public.data_processing_agreements;   -- atteso: ≥ 1

  -- ② la SCRITTURA deve essere RESPINTA — è il valore che DEVE essere rifiutato
  UPDATE public.data_processing_agreements SET firmato_da = 'FALSIFICATO';
  -- atteso: 0 righe toccate (la regola FOR SELECT non ammette UPDATE)
ROLLBACK;
```

🔑 **Si incolla il numero di righe toccate.** ⚠️ **Attenzione a come si legge l'esito:** con RLS, un `UPDATE` che non trova righe visibili **riesce con 0 righe**, non solleva. **«0 righe toccate» È il rifiuto**, e va detto — un esecutore che aspetta un'eccezione conclude che la prova è fallita.
🛑 **Prima si esegue lo stesso UPDATE con la regola VECCHIA** (su una transazione annullata, ricreando la policy `FOR ALL`): deve toccare **≥ 1 riga**. Senza questo controllo positivo, «0 righe» non distingue «la regola blocca» da «non c'erano righe».

- [ ] **Step 2: T2 — la traccia esiste**

```sql
SELECT count(*) FROM public.audit_log WHERE table_name = 'data_processing_agreements';
```

Prima di un'emissione e dopo. Atteso: **+1**, con `operation='INSERT'` e `new_data` che contiene la riga intera.

- [ ] **Step 3: T3 dal vivo — il «chi» c'è**

```sql
SELECT numero_dpa, emesso_da FROM public.data_processing_agreements
 WHERE emesso_da IS NOT NULL ORDER BY emesso_at DESC LIMIT 1;
```

Atteso: **una riga**, con `emesso_da` uguale all'utente che ha premuto.
🔑 **È la prova che alla DdC è mancata per mesi.**

- [ ] **Step 4: T4 — la cancellazione del laboratorio, con `emesso_da` DAVVERO riempito**

```sql
BEGIN;
  UPDATE public.data_processing_agreements
     SET emesso_da = (SELECT id FROM public.utenti WHERE laboratorio_id = '<lab>' LIMIT 1)
   WHERE laboratorio_id = '<lab>';
  SELECT public.admin_delete_laboratorio('<lab>');   -- deve ARRIVARE IN FONDO
ROLLBACK;
```

🛑 **`ROLLBACK`, non `COMMIT`.** ⚠️ È il cammino che la DdC **non ha mai percorso con un valore dentro**: la chiave esterna non è mai stata esercitata.

- [ ] **Step 5: T5 — la chiave esterna morde**

```sql
BEGIN;
  UPDATE public.data_processing_agreements SET emesso_da = gen_random_uuid();
  -- atteso: ERRORE 23503, violazione di chiave esterna — si incolla il messaggio
ROLLBACK;
```

- [ ] **Step 6: il referto, con l'output incollato**

🆕 Il referto (nuovo, da creare): `docs/roadmap/2026-08-04-p7-referto-prove.md` — una riga per prova, esito e **output reale**. Ogni prova non eseguita si dichiara **non eseguita**, col motivo.

- [ ] **Step 7: Commit** (solo il referto; `scripts/tmp/` è ignorato da git)

---

# Task 4 — FASE 7, memoria, chiusura

- [ ] **Step 1: FASE 7 per intero, output incollato**

```bash
npx tsc --noEmit && npx vitest run && npx next build
```

Atteso: `tsc` **0** · prove **4382 | 19** (le 4380 di partenza **+2**) · build uscita **0**.
🛑 **I tre comandi sono tre:** `tsc` non valida la firma degli handler di rotta, solo `next build` la vede.

- [ ] **Step 2: la guardia dei documenti**

```bash
node scripts/guardia-coerenza-documenti.mjs
```

- [ ] **Step 3: BP-1 — memoria e roadmap**

`memory/MEMORY.md` + `memory/SESSION_ACTIVE.md` + `docs/roadmap/ROADMAP-UFFICIALE.md`: la voce **P7** passa a ✅ **solo se** T1-T5 sono tutte verdi e il referto è in git. 🛑 **La guardia controlla che una voce ✅ non citi una spec che non si dichiara eseguita:** aggiornare anche l'intestazione della spec da «NON ESEGUITA» a «eseguita».

- [ ] **Step 4: merge e pubblicazione**

🛑 **La pubblicazione si CHIEDE a Francesco.** Merge su `main`, poi `git push` **solo se autorizzato**, poi CI verde, poi verifica su `uachelab.com`.

---

## Auto-revisione del piano

**Copertura della spec:** ① cancello → Task 1 Step 2 · ② traccia → Task 1 Step 2 · ③ colonna → Task 1 Step 2 + Task 2 · §4 parametro obbligatorio → Task 2 Step 2-5 · T1 → Task 3 Step 1 · T2 → Step 2 · T3a/T3b → Task 2 Step 1 (unità) + Task 3 Step 3 (vivo) · T4 → Task 3 Step 4 · T5 FASE 6b → Task 1 Step 7 · T6 FASE 7 → Task 4 Step 1. **Nessuna sezione della spec resta senza task.**

**Segnaposto:** nessun «TBD», nessun «gestire gli errori», ogni passo che tocca codice porta il codice.

**Coerenza dei nomi:** `emesso_da` (colonna, parametro, commento) · `_audit_data_processing_agreements` (automatismo) · `dpa_laboratorio` (regola) — un solo nome per cosa, in tutti i task.

**Ciò che questo piano NON copre, con destinazione:** la guardia «una firma non si riscrive» → **P19-b** · il «chi» per le altre dieci tabelle → **P25** · `dichiarazioni_conformita.generated_by` → **P26**.
