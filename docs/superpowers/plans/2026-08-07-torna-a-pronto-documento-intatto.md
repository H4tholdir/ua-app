# «Torna a `pronto` col documento intatto» — piano di esecuzione

> **Per chi esegue:** SUB-SKILL RICHIESTA — `superpowers:subagent-driven-development` (consigliata) oppure
> `superpowers:executing-plans`, un task alla volta. I passi usano le caselle `- [ ]`.
> ⛔ **R-E1:** un compito a un esecutore fresco, con revisione fra l'uno e l'altro.
> ⛔ **R-E2:** un difetto trovato **fuori** dal proprio mandato si **riferisce**, non si corregge di nascosto.

**Obiettivo:** dare ai tre motivi che lo chiedono una transizione che riporta il lavoro fra i `pronto`
**lasciando viva la dichiarazione**, e costruire il bivio dei due difetti — senza aprire la strada per
cui un dispositivo esce con un documento che nomina un'altra persona.

**Architettura:** una seconda RPC affianca `riapri_lavoro_atomica` (nessun interruttore booleano: l'atto
distruttivo resta nel **nome** della funzione), con il ripristino a `pronto` estratto in una funzione
interna condivisa. La memoria della prima immissione sul mercato si sposta in una colonna immutabile.
La finestra di correzione dei campi stampati si chiude sulla PATCH e rimanda al percorso che riemette.

**Stack:** Postgres/Supabase (RPC `SECURITY DEFINER` + migration), Next.js 16 App Router, TypeScript,
Vitest.

**Spec (LEGGE):** `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md`
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, tornate **128-131**
**Ramo:** `intervento-post-consegna` (già attivo) · 🛑 **MAI un worktree in questo progetto**

---

## Vincoli globali — valgono per OGNI task

- 🛑 **`date` in un comando SEPARATO**, e il testo si scrive dopo aver letto l'output.
- 🛑 **L'uscita dietro una pipe è quella dell'ULTIMO comando.** `verify:full` si legge **da variabile**:
  `npm run verify:full > /tmp/v.log 2>&1; ESITO=$?; echo "uscita=$ESITO"`.
- ⚖️ **D284 — applicare una migration NON si chiede:** `cd "…/ua-app" && npx supabase db push --linked --yes`.
  **E dopo ogni migration la FASE 6b è dovuta:**
  `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit`.
- ⚖️ **D296 — il push del RAMO non si chiede.** 🛑 Il merge su `main` **no**: fa partire Vercel.
- Le prove d'integrazione vogliono le credenziali, o **si saltano in silenzio**:
  `set -a && . ./.env.local; set +a`.
- 🛑 **`scripts/psql.mjs` prende un PERCORSO DI FILE**, non una stringa SQL, e **non** accetta i
  meta-comandi `\echo` (`42601`).
- **Le parole:** «**manufatto**» per la cosa fisica, «**dispositivo**» solo dove parla la norma (D303).
  Ogni **testo nuovo** dice «**dichiarazione**», mai «DdC» né «la carta» (D302, guardia in
  `tests/unit/qualita-effetti.test.ts`).
- **Animazioni** solo da `src/design-system/v3/motion.ts` — MAI `duration` in linea.
- 🛑 **Prima le migration, poi il codice** (§8 della spec): fra il `DROP` e il `CREATE` di
  `crea_rifacimento_atomico` **anche la vecchia chiamata a 5 argomenti fallisce**.

---

## 📋 REGISTRO DELLE PROVE (R-P1) — eseguite il 07/08/2026, 18:2x, sul banco vero

`provato:` `set -a && . ./.env.local; set +a; node scripts/psql.mjs <file>` — output reale:

| # | assunzione | esito |
|---|---|---|
| **P1** | il CHECK biconditionale abortirebbe | `difetto_lavorazione` → **2 righe** già in banca dati, nessuna con scelta. ➡️ **si scrive solo l'implicazione singola** |
| **P2** | `lavori_rifacimenti.evento_id` esiste | **sì**, `uuid`, `is_nullable = YES`, con FK **composita** `lavori_rifacimenti_evento_fk (evento_id, laboratorio_id) → eventi_qualita(id, laboratorio_id)` |
| **P3** | nessun UNIQUE su `evento_id` | i vincoli sono 10; l'unico UNIQUE è `rifacimento_nuovo_unique (laboratorio_id, lavoro_nuovo_id)`. ➡️ **il buco di idempotenza è reale** |
| **P4** | il nome del CHECK da allargare | `lavori_rifacimenti_motivo_check`, sette valori `character varying` |
| **P5** | `lavori.prima_immissione_at` | **non esiste** (0 colonne). Da backfillare: **223** lavori consegnati con data su **224** totali (uno **senza** data: il backfill lo lascia `NULL`, ed è corretto) |
| **P6** | `eventi_qualita.scelta_intervento` | **non esiste** (0 colonne) |
| **P7** | firme vive | `riapri_lavoro_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid)` · `crea_rifacimento_atomico(p_lavoro_originale_id uuid, p_motivo text, p_rilevato_in text, p_costo_interno numeric, p_note text)` · `riemetti_ddc_atomica(…, p_nuova jsonb)` · `annulla_consegna_atomica(…, p_finestra_ms integer)` |
| **P8** | ACL viva di `crea_rifacimento_atomico` | `postgres=X/postgres \| service_role=X/postgres` — **chiusa**, e il `DROP` la butterebbe via |
| **P9** | dipendenze sul `DROP` | **0** (nessuna vista, nessun trigger) |
| **P10** | **il corpo VIVO** di `riapri_lavoro_atomica` (R-P2: il catalogo, non il file) | letto con `pg_get_functiondef`. **Diverge dal file `20260806210400`**: l'UPDATE sulla dichiarazione è `SET stato='annullata', annullata_da_evento_id = p_evento_id`. I nove campi del ripristino sono quelli attesi |

🛑 **NON eseguito, e va provato in FASE 6:** che un evento sui due difetti con
`stato_dispositivo='mai_uscito_dal_lab'` esca `non_applicabile` per il cancello di stato della RPC
(§4.4 della spec, ultima riga della tabella). Comando dell'esecutore: la prova d'integrazione di T9.

## 📖 REGISTRO DELLE LETTURE (R-P2) — l'elenco lo ha deciso il censimento, non l'autore

| file | stato |
|---|---|
| `supabase/migrations/20260806210400_riapri_lavoro_atomica.sql` | **letto** 1-164 — ⚠️ **superato**: il corpo vivo è P10 |
| `supabase/migrations/20260807143623_riemissione_ddc.sql` | **letto** per il tramite di P10 (corpo vivo) |
| `supabase/migrations/20260805201640_rifacimento_clona_tinta.sql` | **letto** 56-175 |
| `supabase/migrations/005_v1_foundation.sql` | **letto** 72-100 |
| `src/lib/qualita/effetti.ts` | **letto** 1-187 |
| `src/app/api/lavori/[id]/eventi-qualita/route.ts` | **letto** 1-533 |
| `src/app/api/lavori/[id]/rifacimento/route.ts` | **letto** 1-200 |
| `src/app/api/lavori/[id]/route.ts` | **letto** 198-243 (allowlist) e 605-615 (cancello fiscale) |
| `src/lib/pdf/generate-ddc.ts` | **letto** 366-420 (porta di idempotenza) e 251-255 (ripiego prescrittore) |
| `src/lib/consegna/precheck.ts` | **letto** — `provato:` nomina le dichiarazioni **solo nei commenti** |
| `src/lib/consegna/orchestrate.ts` | **letto** 95-160 · ⚠️ **DA LEGGERE dall'esecutore di T2**: 300-340 (la scrittura di `data_consegna_effettiva`) |
| `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` | **letto** per struttura (fasi, righe 74-290, 460-540) · ⚠️ **DA LEGGERE PER INTERO dall'esecutore di T8** |
| `src/lib/qualita/motivi-ui.ts` | ⚠️ **NON letto** — **T8 lo apre per primo**: contiene già due formulazioni della domanda del bivio (`:61` e `:66`), e una terza sarebbe «le liste scritte due volte» |

## 🧬 CENSIMENTO DEGLI IDENTIFICATORI (R-P6) — ogni nome porta la sua destinazione

| identificatore | oggi | dopo | dove |
|---|---|---|---|
| `AzioneAutomatica` | `'riapri_lavoro'` | `+ 'torna_pronto' \| 'crea_rifacimento'` | T6 |
| `effettoDaMotivo` | esportata | **invariata** | — |
| `effettoDaMotivoEScelta` | non esiste | **nuova**, esportata | T6 |
| `Scelta` | non esiste | **nuovo tipo** `'si_sistema' \| 'si_rifa'`, esportato | T6 |
| `eventi_qualita.scelta_intervento` | non esiste (P6) | colonna nuova, `NULL` per sette motivi | T1 |
| `lavori.prima_immissione_at` | non esiste (P5) | colonna nuova, **immutabile** | T2 |
| `lavori_rifacimenti.motivo` | 7 valori (P4) | **9** — l'allowlist HTTP resta a **7**, deliberato | T3 |
| `lavori_rifacimenti.evento_id` | esiste, mai scritta (P2) | **scritta** dalla RPC | T5 |
| `ripristina_lavoro_a_pronto` (interna) | non esiste | **nuova**, condivisa dalle due RPC | T4 |
| `riporta_a_pronto_atomica` | non esiste | **nuova** RPC pubblica | T4 |
| `riapertura` (campo di risposta) | copre 1 azione | **rinominato `esito_azione`** — copre 3 azioni. 🛑 Il vecchio nome **non resta** come sinonimo | T7 |
| `Riapertura` (tipo in rotta) | 3 stati | rinominato `EsitoAzione`, **stessi 3 stati** | T7 |
| `PATCHABLE_FIELDS` | 5 voci stampate **libere** | le stesse 5 **rifiutate** con dichiarazione viva (D308). 🛑 **Nessun nome esce dall'allowlist**: si aggiunge un cancello, non si toglie una chiave | T8 |

---

## Struttura dei file

**Migration (4, in quest'ordine):**
- `supabase/migrations/<ts>_evento_scelta_intervento.sql` — T1
- `supabase/migrations/<ts>_lavori_prima_immissione.sql` — T2
- `supabase/migrations/<ts>_rifacimento_motivi_e_idempotenza.sql` — T3
- `supabase/migrations/<ts>_riporta_a_pronto_atomica.sql` — T4
- `supabase/migrations/<ts>_rifacimento_evento.sql` — T5

**Codice:** `src/lib/qualita/effetti.ts` (T6) · `src/app/api/lavori/[id]/eventi-qualita/route.ts` (T7) ·
`src/app/api/lavori/[id]/route.ts` (T8) · `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` (T9)

**Prove:** `tests/unit/qualita-effetti.test.ts` (esiste) · `tests/unit/api/eventi-qualita-*.test.ts` ·
`tests/integration/torna-a-pronto.rpc.test.ts` (nuovo)

---

## Task 1 — La colonna della scelta

**File:**
- Crea: `supabase/migrations/<timestamp>_evento_scelta_intervento.sql`
- Modifica (FASE 6b): `src/types/database.types.ts` (generato)

**Interfacce:**
- Produce: la colonna `eventi_qualita.scelta_intervento TEXT NULL`, valori `'si_sistema'|'si_rifa'`.

- [ ] **Passo 1 — leggi il timestamp vero**

```bash
date -u "+%Y%m%d%H%M%S"
```
Il nome del file usa **quell'output**, mai un numero inventato.

- [ ] **Passo 2 — scrivi la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — il bivio dei due difetti (D304 · D305).
-- Spec: docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md §4.1
--
-- 🛑 PERCHÉ UNA SOLA IMPLICAZIONE E NON IL BICONDIZIONALE («presente ⇔ motivo ∈ {due}»):
-- provato: in banca dati esistono GIÀ 2 righe con motivo='difetto_lavorazione' e
-- nessuna scelta. Il biconditionale farebbe abortire questa migration (23514), e
-- NOT VALID non salva: lascerebbe quelle righe non più aggiornabili al primo UPDATE.
-- L'altra metà della regola vive nel 422 della rotta, dove sta la regola viva:
-- metterla qui creerebbe la seconda fonte di verità accanto a src/lib/qualita/effetti.ts
-- (riga 22 della coda: «le liste scritte due volte»).
ALTER TABLE public.eventi_qualita
  ADD COLUMN IF NOT EXISTS scelta_intervento TEXT;

ALTER TABLE public.eventi_qualita
  DROP CONSTRAINT IF EXISTS evento_scelta_vocabolario;
ALTER TABLE public.eventi_qualita
  ADD CONSTRAINT evento_scelta_vocabolario
  CHECK (scelta_intervento IS NULL OR scelta_intervento IN ('si_sistema','si_rifa'));

ALTER TABLE public.eventi_qualita
  DROP CONSTRAINT IF EXISTS evento_scelta_solo_sui_difetti;
ALTER TABLE public.eventi_qualita
  ADD CONSTRAINT evento_scelta_solo_sui_difetti
  CHECK (scelta_intervento IS NULL
         OR motivo IN ('difetto_lavorazione','difetto_materiale'));

COMMENT ON COLUMN public.eventi_qualita.scelta_intervento IS
  'Il bivio dei due difetti (D290 · D297 · D304): si_sistema → il lavoro torna a '
  'pronto e la dichiarazione resta valida; si_rifa → il lavoro resta consegnato e '
  'nasce un rifacimento. NULL sugli altri sette motivi.';
```

- [ ] **Passo 3 — applica e verifica che il vincolo MORDA**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
Poi scrivi `/tmp/prova-t1.sql` e lancialo con `scripts/psql.mjs`:

```sql
BEGIN;
-- ① valore fuori vocabolario: DEVE essere rifiutato
SAVEPOINT s1;
UPDATE eventi_qualita SET scelta_intervento = 'pippo'
 WHERE motivo = 'difetto_lavorazione';
ROLLBACK TO s1;
-- ② scelta su un motivo che non la ammette: DEVE essere rifiutata
SAVEPOINT s2;
UPDATE eventi_qualita SET scelta_intervento = 'si_sistema'
 WHERE motivo = 'errore_registrazione';
ROLLBACK TO s2;
-- ③ scelta legittima: DEVE passare
UPDATE eventi_qualita SET scelta_intervento = 'si_sistema'
 WHERE motivo = 'difetto_lavorazione';
SELECT count(*) AS aggiornate FROM eventi_qualita WHERE scelta_intervento = 'si_sistema';
ROLLBACK;
```
**Atteso:** ① e ② falliscono con `23514` (incolla il messaggio nel resoconto), ③ aggiorna **2** righe.
🛑 Un `CREATE`/`ALTER` riuscito prova la sintassi, **non** il comportamento: la prova è il valore rifiutato.

- [ ] **Passo 4 — FASE 6b**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
```
**Atteso:** `uscita=0`. Se il generatore lascia un messaggio in fondo al file, **toglilo**.

- [ ] **Passo 5 — salva**

```bash
git add supabase/migrations src/types/database.types.ts && git commit -m "feat(qualita): eventi_qualita.scelta_intervento — il bivio dei due difetti (D304)"
```

---

## Task 2 — La data della prima immissione sul mercato

**File:**
- Crea: `supabase/migrations/<timestamp>_lavori_prima_immissione.sql`
- Modifica: `src/lib/consegna/orchestrate.ts` (dove scrive `data_consegna_effettiva`)
- Prova: `tests/integration/torna-a-pronto.rpc.test.ts` — **no**: qui basta la sonda del Passo 3

**Interfacce:**
- Produce: `lavori.prima_immissione_at TIMESTAMPTZ NULL`, scritta **una volta sola**.

🔑 **Perché esiste questo task, in una riga:** Allegato XIII punto 4 fa decorrere i **10 anni** di
conservazione dalla **prima** immissione sul mercato (Art. 2(28)); `data_consegna_effettiva` viene
azzerata da ogni riapertura e riscritta a ogni consegna, quindi dopo una riconsegna direbbe la data
**sbagliata** — e un laboratorio che si fidasse butterebbe la dichiarazione **troppo presto**.

- [ ] **Passo 1 — apri e leggi `orchestrate.ts` righe 290-345**, e cita nel resoconto la riga esatta
  che scrive `data_consegna_effettiva`. (R-P2: la riga 324-329 è **un'indicazione**, non un fatto
  verificato da chi ha scritto il piano.)

- [ ] **Passo 2 — la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — §2 della spec.
-- 🔑 La memoria della PRIMA immissione sul mercato non può vivere in
-- data_consegna_effettiva: quella colonna viene azzerata da ogni riapertura e
-- riscritta a ogni consegna. Allegato XIII punto 4 + Art. 2(28): i 10 anni
-- decorrono dalla PRIMA messa a disposizione.
-- provato: 223 lavori consegnati su 224 hanno una data da riportare; il 224esimo
-- resta NULL, ed è corretto — non si inventa una data che non c'è.
ALTER TABLE public.lavori
  ADD COLUMN IF NOT EXISTS prima_immissione_at TIMESTAMPTZ;

UPDATE public.lavori
   SET prima_immissione_at = data_consegna_effettiva
 WHERE stato = 'consegnato'
   AND data_consegna_effettiva IS NOT NULL
   AND prima_immissione_at IS NULL;

COMMENT ON COLUMN public.lavori.prima_immissione_at IS
  'La PRIMA volta che il manufatto è stato messo a disposizione (Art. 2(28)): da '
  'qui decorrono i 10 anni di conservazione della dichiarazione (Allegato XIII p.4). '
  'Si scrive una volta sola e NESSUNA riapertura la azzera — a differenza di '
  'data_consegna_effettiva, che descrive la consegna CORRENTE.';
```

- [ ] **Passo 3 — applica, e verifica il backfill**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
Sonda (`/tmp/prova-t2.sql`): `SELECT count(*) FILTER (WHERE prima_immissione_at IS NOT NULL) AS piene, count(*) AS consegnati FROM lavori WHERE stato='consegnato';`
**Atteso:** `piene=223`, `consegnati=224`.

- [ ] **Passo 4 — la scrittura alla consegna**

In `orchestrate.ts`, nell'update che segna la consegna, aggiungi il campo **senza mai sovrascriverlo**:

```typescript
        data_consegna_effettiva: adesso,
        // 🔑 La prima immissione sul mercato si scrive UNA VOLTA SOLA (Allegato
        // XIII p.4 + Art. 2(28)): da qui decorrono i 10 anni di conservazione.
        // Una riconsegna dopo una riapertura NON la sposta, o il termine
        // ripartirebbe da capo e la dichiarazione verrebbe distrutta troppo presto.
        prima_immissione_at: lavoroPrima?.prima_immissione_at ?? adesso,
```
🛑 Se in quel punto la riga del lavoro **non** è già stata letta, leggila: `COALESCE` va fatto sul
valore vero, e un `undefined` scriverebbe `adesso` su un lavoro che aveva già la sua data.

- [ ] **Passo 5 — la prova che morde**

In `tests/unit/` (o dove vivono le prove di `orchestrate`), una prova che consegna **due volte** lo
stesso lavoro e verifica che `prima_immissione_at` **non cambi** fra la prima e la seconda, mentre
`data_consegna_effettiva` **sì**. Falla fallire prima (commenta il `??`), conta le asserzioni che si
accendono e **scrivi il numero** (R-P4).

- [ ] **Passo 6 — FASE 6b + verifica + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(consegna): prima_immissione_at — i 10 anni decorrono dalla PRIMA consegna (All. XIII p.4)"
```

---

## Task 3 — Il vocabolario del rifacimento e l'idempotenza

**File:** Crea `supabase/migrations/<timestamp>_rifacimento_motivi_e_idempotenza.sql`

**Interfacce:**
- Produce: `lavori_rifacimenti.motivo` accetta 9 valori · `UNIQUE (laboratorio_id, evento_id)`.

- [ ] **Passo 1 — la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — §4.1 e §4.2 della spec (D306 · D307).
--
-- ① IL VOCABOLARIO. I due motivi del percorso qualità non hanno un corrispondente
--    fra i sette storici (provato: lavori_rifacimenti_motivo_check). Scriverci
--    'altro' perderebbe l'unica informazione che conta.
--    ⚠️ Da qui nascono TRE allowlist sullo stesso campo, e va detto invece di
--    lasciarlo scoprire: il database ne accetta 9, la rotta HTTP del rifacimento
--    resta a 7 (deliberato — quei due non si scelgono a mano), e la RPC non valida
--    p_motivo affatto (20260805201640:113,157). L'unico guardiano dei due valori
--    nuovi è la derivazione dentro la rotta degli eventi di qualità.
ALTER TABLE public.lavori_rifacimenti
  DROP CONSTRAINT IF EXISTS lavori_rifacimenti_motivo_check;
ALTER TABLE public.lavori_rifacimenti
  ADD CONSTRAINT lavori_rifacimenti_motivo_check
  CHECK (motivo IN (
    'colore_sbagliato','misura_errata','fusione_difettosa',
    'rottura_produzione','non_confortevole','errore_prescrizione','altro',
    'difetto_lavorazione','difetto_materiale'
  ));

-- ② L'IDEMPOTENZA (D307). Da oggi il rifacimento NON nasce più da un tasto premuto
--    a mano: lo crea l'app dentro un altro flusso. Senza questo vincolo, un doppio
--    tocco o un ritentativo dopo un timeout crea DUE lavori e brucia due
--    progressivi (crea_rifacimento_atomico incrementa progressivi_anno,
--    20260805201640:65-69), e il guard del client è solo in memoria
--    (DevoIntervenire.tsx:147). Col vincolo, il secondo tentativo è un 23505
--    riconoscibile: la rotta lo traduce e restituisce il lavoro già creato.
--    provato: l'indice esistente lavori_rifacimenti_evento_idx NON è unique.
--    ⚠️ Parziale, perché evento_id è nullable: i rifacimenti creati a mano non
--    hanno un evento, e un UNIQUE pieno su NULL non li disturberebbe comunque —
--    ma il parziale dichiara l'intenzione invece di appoggiarsi a un dettaglio
--    della semantica dei NULL.
CREATE UNIQUE INDEX IF NOT EXISTS rifacimento_evento_unique
  ON public.lavori_rifacimenti (laboratorio_id, evento_id)
  WHERE evento_id IS NOT NULL;
```

- [ ] **Passo 2 — applica**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```

- [ ] **Passo 3 — provalo con i valori che DEVONO essere rifiutati**

`/tmp/prova-t3.sql`, in transazione annullata: ① un `motivo` fuori dai nove → **23514**;
② due righe con lo **stesso** `(laboratorio_id, evento_id)` → **23505** sulla seconda;
③ due righe con `evento_id = NULL` → **passano entrambe** (l'indice è parziale).
Incolla i tre messaggi nel resoconto. **Se ③ fallisce, fermati e riferisci**: vorrebbe dire che
l'indice sta bloccando i rifacimenti creati a mano.

- [ ] **Passo 4 — FASE 6b + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(rifacimento): due motivi nuovi e l'idempotenza per evento (D306 · D307)"
```

---

## Task 4 — Le due RPC di ripristino, col corpo condiviso

**File:** Crea `supabase/migrations/<timestamp>_riporta_a_pronto_atomica.sql`

**Interfacce:**
- Consuma: nulla dai task precedenti.
- Produce: `public.riporta_a_pronto_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid) RETURNS json`
  → `{"esito":"ok","ddc_viva":true|false}` · oppure `{"esito":"non_trovato"|"non_consegnato"|"evento_non_valido"}`.

- [ ] **Passo 1 — rileggi il corpo VIVO, non il file**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a; node scripts/psql.mjs /tmp/leggi-corpo.sql
```
con dentro:
```sql
SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='riapri_lavoro_atomica';
```
🛑 **Il file `20260806210400` è SUPERATO** (`provato:` P10): il corpo vivo scrive anche
`annullata_da_evento_id`. Chi copia dal file riscrive una funzione vecchia.

- [ ] **Passo 2 — la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — §3 della spec (R9, riga 23 della coda).
--
-- 🔑 PERCHÉ DUE FUNZIONI PUBBLICHE E NON UN PARAMETRO. Un booleano
-- (p_annulla_ddc) che decide se un documento a valore legale viene annullato è la
-- «coppia incoerente (motivo, azione) che arriva a un atto distruttivo», comparsa
-- TRE volte in un giorno solo il 07/08. Qui l'atto distruttivo resta nel NOME
-- della funzione: chi legge la chiamata sa che cosa sta per succedere.
--
-- 🔑 PERCHÉ IL CORPO CONDIVISO SI ESTRAE. 20260807143623:205-257 ha già dovuto
-- RICOPIARE per intero il corpo di riapri_lavoro_atomica per cambiare UNA
-- assegnazione. Con una terza copia, ogni futuro campo da azzerare andrebbe
-- applicato in tre posti — e il giorno in cui uno dei tre resta indietro nessuno
-- se ne accorge.
--
-- ⚠️ IL RIPRISTINO È IDENTICO PER LE DUE, data_consegna_effettiva COMPRESA: la
-- memoria della prima immissione non sta più lì, sta in lavori.prima_immissione_at
-- (Task 2), che nessuna riapertura tocca.

CREATE OR REPLACE FUNCTION public.ripristina_lavoro_a_pronto(
  p_lavoro_id uuid, p_laboratorio_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE v_rows int;
BEGIN
  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    -- la proposta di fatturazione pre-riapertura non deve rinascere alla
    -- riconsegna: è fatta per una consegna che questa riapertura ha invalidato
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'ripristino lavoro fallito'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) IS
  'SOLO USO INTERNO alle RPC di riapertura: riporta il lavoro a pronto e azzera i '
  'campi della consegna. NON tocca dichiarazioni_conformita — quella scelta la fa '
  'la funzione pubblica che la chiama, ed è nel suo nome.';

-- ── LA FUNZIONE NUOVA ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.riporta_a_pronto_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_lavoro RECORD;
  v_ddc_vive int;
BEGIN
  SELECT id, stato INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;

  -- La riapertura non è mai senza motivo (D263): l'evento deve esistere ed essere
  -- di QUESTO lavoro e di QUESTO laboratorio.
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  -- 🛑 LA DIFFERENZA CON LA GEMELLA, ED È TUTTA QUI: dichiarazioni_conformita NON
  -- si tocca. D293 — annullare il documento di una consegna realmente avvenuta
  -- cancella l'unica prova che quel manufatto è esistito ed è andato a un paziente.
  PERFORM public.ripristina_lavoro_a_pronto(p_lavoro_id, p_laboratorio_id);

  -- 🔑 «Resta valida» è una PROMESSA, e va verificata invece di essere affermata:
  -- se non c'è nessuna dichiarazione viva (già annullata prima, o mai emessa) la
  -- frase è falsa, e chi legge deve saperlo — alla riconsegna ne verrà generata
  -- una nuova, bruciando un progressivo (generate-ddc.ts:383-392).
  SELECT count(*) INTO v_ddc_vive FROM dichiarazioni_conformita
   WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
     AND stato <> 'annullata';

  RETURN json_build_object('esito', 'ok', 'ddc_viva', v_ddc_vive > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) IS
  'Riporta un lavoro consegnato fra i pronti LASCIANDO VIVA la dichiarazione '
  '(D291 · D290 · D297 · D298): il manufatto è uscito davvero e il documento diceva '
  'il vero. È la gemella NON distruttiva di riapri_lavoro_atomica, che invece '
  'annulla — e la scelta fra le due si legge dal nome, mai da un parametro. '
  'Restituisce ddc_viva:false quando la promessa «resta valida» non ha oggetto.';

-- ── LA GEMELLA usa lo stesso corpo condiviso ───────────────────────────────
-- 🛑 IL CORPO QUI SOTTO È RIBATTUTO DAL CATALOGO VIVO (pg_get_functiondef), non
-- dal file 20260806210400, che è SUPERATO: l'UPDATE sulla dichiarazione scrive
-- anche annullata_da_evento_id dal 07/08 (20260807143623).
CREATE OR REPLACE FUNCTION public.riapri_lavoro_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_lavoro RECORD;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  SELECT id, stato INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;

  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  PERFORM public.ripristina_lavoro_a_pronto(p_lavoro_id, p_laboratorio_id);

  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato <> 'annullata';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true;
    ELSE
      RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;
```

- [ ] **Passo 3 — applica e prova sul banco, in transazione annullata**

`/tmp/prova-t4.sql` — su un lavoro `consegnato` con dichiarazione viva:
① `riporta_a_pronto_atomica` → `esito=ok`, `ddc_viva=true`, e **la dichiarazione è ancora
`stato <> 'annullata'`** (è la prova che distingue le due funzioni: se è annullata, il task è
fallito) · ② la stessa chiamata **ripetuta** → `non_consegnato` · ③ con un `p_evento_id` di un altro
lavoro → `evento_non_valido` · ④ `riapri_lavoro_atomica` sullo stesso lavoro → la dichiarazione
**diventa** `annullata` **e** porta `annullata_da_evento_id`. Chiudi con `ROLLBACK`.

- [ ] **Passo 4 — le ACL, verificate e non assunte**

```sql
SELECT proname, array_to_string(proacl,' | ') FROM pg_proc
 WHERE proname IN ('riporta_a_pronto_atomica','ripristina_lavoro_a_pronto');
```
**Atteso:** solo `postgres` e `service_role`. **Nessun `anon`, nessun `authenticated`.**

- [ ] **Passo 5 — salva**

```bash
git add -A && git commit -m "feat(qualita): riporta_a_pronto_atomica — torna a pronto col documento intatto (R9 · D293)"
```

---

## Task 5 — Il rifacimento sa da quale evento nasce

**File:** Crea `supabase/migrations/<timestamp>_rifacimento_evento.sql`

**Interfacce:**
- Produce: `crea_rifacimento_atomico(p_lavoro_originale_id uuid, p_motivo text, p_rilevato_in text, p_costo_interno numeric, p_note text, p_evento_id uuid DEFAULT NULL)`.

🛑 **Il rischio di questo task, e non è nelle dipendenze.** `CREATE OR REPLACE` **non può** aggiungere
un parametro → serve `DROP` + `CREATE`. `provato:` il `DROP` **non rompe niente** (0 dipendenze, P9)
**ma butta via l'ACL** (P8: oggi `postgres | service_role`), e una funzione creata ex novo in `public`
nasce con `anon` e `authenticated` che possono eseguirla. Siccome `crea_rifacimento_atomico` è
`SECURITY DEFINER` e **non ha nessun filtro tenant** (`20260805201640:56`), lasciarla aperta
significherebbe: chiunque, con la chiave pubblica e un uuid, crea un lavoro nel laboratorio di
chiunque altro. ➡️ **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`, nella stessa migration.**
⚠️ Il `REVOKE` storico (`20260704180000_security_hardening_functions_revoke_drop.sql:38-39`) è scritto
sulla firma a **5** argomenti e **dopo il CREATE non copre più niente**.

- [ ] **Passo 1 — ribatti il corpo vivo dal catalogo** (come T4 Passo 1, per `crea_rifacimento_atomico`).
  🛑 Non copiare da `20260805201640`: quel file è **una** delle stesure, non necessariamente la viva.

- [ ] **Passo 2 — la migration**: `DROP FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text);`
  poi il `CREATE` col corpo ribattuto **identico**, con in coda `p_evento_id uuid DEFAULT NULL`, e
  l'`INSERT INTO lavori_rifacimenti` che scrive **`evento_id`** (colonna che esiste dal 06/08 con FK
  composita — `provato:` P2 — e che oggi **nessuno scrive**). Chiudi con `REVOKE`/`GRANT`/`COMMENT`
  sulla **firma a sei argomenti**.

- [ ] **Passo 3 — le prove che devono mordere**

① la chiamata **a 5 argomenti** (quella della rotta HTTP esistente) **funziona ancora** — è la
prova che il default non ha rotto i chiamanti · ② la chiamata a 6 scrive `evento_id` sulla riga ·
③ **le ACL non contengono `anon` né `authenticated`** · ④ due chiamate con lo **stesso** evento →
la seconda esce **23505** (il vincolo di T3). Tutto in transazione annullata, messaggi incollati.

- [ ] **Passo 4 — FASE 6b + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(rifacimento): la RPC scrive evento_id, e il DROP non regala EXECUTE ad anon"
```

---

## Task 6 — L'elenco degli effetti impara il bivio

**File:**
- Modifica: `src/lib/qualita/effetti.ts`
- Prova: `tests/unit/qualita-effetti.test.ts` (esiste)

**Interfacce:**
- Produce: `export type Scelta = 'si_sistema' | 'si_rifa'` ·
  `export function effettoDaMotivoEScelta(motivo: Motivo, scelta: Scelta | null): Effetto` ·
  `AzioneAutomatica = 'riapri_lavoro' | 'torna_pronto' | 'crea_rifacimento'` ·
  `export const MOTIVI_CON_SCELTA: readonly Motivo[]`.

- [ ] **Passo 1 — le prove, PRIMA del codice**

```typescript
describe('effettoDaMotivoEScelta — il bivio dei due difetti (D304)', () => {
  it('difetto_lavorazione + si_sistema → il lavoro torna pronto, la dichiarazione resta valida', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', 'si_sistema')
    expect(e.lavoro).toBe('torna_pronto')
    expect(e.documento).toBe('resta_valido')
    expect(e.azione).toBe('torna_pronto')
  })
  it('difetto_materiale + si_rifa → nasce un lavoro nuovo, il vecchio resta consegnato', () => {
    const e = effettoDaMotivoEScelta('difetto_materiale', 'si_rifa')
    expect(e.lavoro).toBe('lavoro_nuovo')
    expect(e.documento).toBe('resta_valido')
    expect(e.azione).toBe('crea_rifacimento')
  })
  it('senza scelta restituisce la riga NON risolta, e nessuna azione', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', null)
    expect(e.lavoro).toBe('scelta_richiesta')
    expect(e.azione).toBeNull()
  })
  it('una scelta su un motivo che non la ammette NON produce nessuna azione', () => {
    const e = effettoDaMotivoEScelta('errore_prezzo_quantita', 'si_rifa')
    expect(e).toEqual(effettoDaMotivo('errore_prezzo_quantita'))
    expect(e.azione).toBeNull()
  })
  it('una chiave del prototipo non risale a Object e non porta azioni', () => {
    const e = effettoDaMotivoEScelta('constructor' as never, 'si_rifa' as never)
    expect(e.azione).toBeNull()
    expect(typeof e.perche).toBe('string')
  })
  it('il testo risolto NON ripete la domanda a cui la persona ha già risposto', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', 'si_sistema')
    expect(e.perche).not.toMatch(/oppure se ne fa uno nuovo\?/)
  })
})
```
🔑 **L'ultima prova non è cosmesi:** `DevoIntervenire.tsx:468` stampa `effetto.perche`, e il testo di
`effetti.ts:113` è **una domanda aperta**. Senza questa prova, la schermata finale richiede una scelta
già fatta.

- [ ] **Passo 2 — falle fallire, e CONTA** (R-P4)

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run tests/unit/qualita-effetti.test.ts 2>&1 | tail -20
```
**Atteso:** rosso da «`effettoDaMotivoEScelta` is not a function». Poi metti un **abbozzo inerte**
(`export const effettoDaMotivoEScelta = () => NEUTRO`) e **conta quante asserzioni si accendono**:
scrivi il numero nel resoconto (`N su M`).

- [ ] **Passo 3 — il codice**

```typescript
/** Il bivio dei due difetti: la sceglie chi registra, e non si indovina (D290 · D297 · D304). */
export type Scelta = 'si_sistema' | 'si_rifa'

/** I soli motivi che ammettono — e pretendono — una scelta. 🔑 Questa è la FONTE:
 *  il database porta solo l'implicazione «se c'è una scelta, il motivo è uno di
 *  questi», perché il biconditionale abortirebbe sulle righe già esistenti. */
export const MOTIVI_CON_SCELTA = ['difetto_lavorazione', 'difetto_materiale'] as const satisfies readonly Motivo[]

export function richiedeScelta(motivo: Motivo): boolean {
  return (MOTIVI_CON_SCELTA as readonly string[]).includes(motivo)
}

/** L'effetto RISOLTO. Senza scelta restituisce la riga non risolta — che dichiara
 *  `scelta_richiesta` e non agisce — invece di indovinare un ramo. */
export function effettoDaMotivoEScelta(motivo: Motivo, scelta: Scelta | null): Effetto {
  const base = effettoDaMotivo(motivo)
  if (!richiedeScelta(motivo) || scelta === null) return base
  if (scelta === 'si_sistema') {
    return {
      lavoro: 'torna_pronto',
      documento: 'resta_valido',
      azione: 'torna_pronto',
      perche:
        'Si sistema questo manufatto. Il lavoro torna fra quelli pronti e la dichiarazione resta valida: il manufatto è lo stesso, e nessuno dei dati stampati cambia.',
      decisione: `${base.decisione} · D304 · D310`,
    }
  }
  if (scelta === 'si_rifa') {
    return {
      lavoro: 'lavoro_nuovo',
      documento: 'resta_valido',
      azione: 'crea_rifacimento',
      perche:
        'Se ne fa uno nuovo. Nasce subito un lavoro nuovo, collegato a questo; il lavoro di prima resta consegnato con la sua dichiarazione, e il manufatto nuovo avrà la sua quando lo consegnerai.',
      decisione: `${base.decisione} · D304 · D306`,
    }
  }
  return base
}
```
E in cima al file, l'unione allargata:
```typescript
/** Le cose che l'app fa DA SOLA, senza altre domande. */
export type AzioneAutomatica = 'riapri_lavoro' | 'torna_pronto' | 'crea_rifacimento'
```

- [ ] **Passo 4 — verde, e la guardia dei testi**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run tests/unit/qualita-effetti.test.ts 2>&1 | tail -8
```
**Atteso:** tutte verdi, **compresa** la guardia che vieta «pezzo» e «carta» nei testi degli effetti.

- [ ] **Passo 5 — salva**

```bash
git add -A && git commit -m "feat(qualita): effettoDaMotivoEScelta — il bivio risolto, mai indovinato (D304)"
```

---

## Task 7 — La rotta: le guardie, le due azioni nuove, e il nome onesto

**File:**
- Modifica: `src/app/api/lavori/[id]/eventi-qualita/route.ts`
- Prova: `tests/unit/api/` (segui il nome dei vicini)

**Interfacce:**
- Consuma: `effettoDaMotivoEScelta`, `richiedeScelta`, `MOTIVI_CON_SCELTA` (T6);
  `riporta_a_pronto_atomica` (T4); `crea_rifacimento_atomico(..., p_evento_id)` (T5).
- Produce: risposta `{ evento, proposta, effetto, esito_azione? }`, dove
  `esito_azione = { stato:'applicato', dichiarazione_assente?:boolean, dichiarazione_viva?:boolean, lavoro_nuovo?:{id,numero_lavoro} } | { stato:'non_applicabile', motivo } | { stato:'fallito', messaggio }`.

- [ ] **Passo 1 — le prove di rotta, prima**

Cinque righe della §4.4 della spec, ognuna col **valore che deve essere rifiutato** e il messaggio
atteso: ① motivo con scelta, `scelta` assente → **422** · ② motivo senza scelta, `scelta` presente →
**422** · ③ `scelta: 'forse'` → **422** · ④ `destinatario_errato` + `mai_uscito_dal_lab` → **422** ·
⑤ `difetto_lavorazione` + `si_sistema` su un lavoro **non consegnato** → **201** con
`esito_azione.stato === 'non_applicabile'` (🛑 è la riga che il piano dichiara **non provata**: se
esce diversa, **fermati e riferisci**, non aggiustare il codice per farla tornare).
Più: ⑥ `si_rifa` risponde **201** con `esito_azione.lavoro_nuovo.numero_lavoro` valorizzato ·
⑦ un secondo invio con lo stesso evento **non** crea un secondo lavoro (23505 tradotto).

- [ ] **Passo 2 — falle fallire e conta le asserzioni** (R-P4), poi implementa.

- [ ] **Passo 3 — la validazione, dopo quella del motivo e PRIMA dell'insert**

```typescript
  // ── il bivio (D304 · D305) ──────────────────────────────────────────────
  // 🛑 La guardia sta QUI e non nell'interfaccia: è la lezione pagata tre volte
  // il 07/08 — una coppia incoerente (motivo, azione) che arriva a un atto che
  // crea o sposta cose non si ferma con una schermata.
  const sceltaGrezza = corpo.scelta_intervento
  let scelta: Scelta | null = null
  if (richiedeScelta(motivo)) {
    if (!inVocabolario(SCELTE, sceltaGrezza)) {
      return err('Dicci come si procede: si sistema questo manufatto, oppure se ne fa uno nuovo?', 422)
    }
    scelta = sceltaGrezza
  } else if (sceltaGrezza !== undefined && sceltaGrezza !== null) {
    // Non si scarta in silenzio: è la classe di difetto «Salvato su un dato che
    // non c'è» — stesso trattamento già riservato a `natura` (:199-201).
    return err('Su questo motivo non c\'è nessuna scelta da fare: l\'effetto si ricava dal motivo stesso.', 422)
  }

  // 🛑 GEMELLA DELLA GUARDIA SU `errore_registrazione`: se il manufatto non è mai
  // uscito dal laboratorio, non può essere andato alla persona sbagliata — quel
  // caso è «ho premuto consegna per sbaglio», che ha il suo motivo e la sua
  // transizione (distruttiva, e per questo va scelta apposta).
  if (motivo === 'destinatario_errato' && statoDispositivo === 'mai_uscito_dal_lab') {
    return err('Se il manufatto non è mai uscito dal laboratorio non può essere andato alla persona sbagliata: se hai premuto «consegna» per errore, scegli quel motivo.', 422)
  }
```
con, in cima al file: `const SCELTE = ['si_sistema', 'si_rifa'] as const`.

- [ ] **Passo 4 — l'effetto risolto e le tre azioni**

`daScrivere.scelta_intervento = scelta` (solo quando non è `null`), e poi:

```typescript
  const effetto = effettoDaMotivoEScelta(motivo, scelta)

  let esitoAzione: EsitoAzione | undefined
  if (effetto.azione === 'riapri_lavoro') {
    esitoAzione = await chiamaRipristino(svc, 'riapri_lavoro_atomica', lavoro_id, context.laboratorioId, eventoId)
  } else if (effetto.azione === 'torna_pronto') {
    esitoAzione = await chiamaRipristino(svc, 'riporta_a_pronto_atomica', lavoro_id, context.laboratorioId, eventoId)
  } else if (effetto.azione === 'crea_rifacimento') {
    esitoAzione = await creaRifacimento(svc, context.laboratorioId, lavoro_id, eventoId, motivo)
  }
```
🛑 **Il campo di risposta si chiama `esito_azione`, e `riapertura` NON resta come sinonimo**: un nome
che dice «riapertura» su un'azione che **crea** un lavoro è un testo falso, cioè il difetto già chiuso
in `classifica.ts` il 07/08. Rinomina anche il tipo (`Riapertura` → `EsitoAzione`) e **aggiorna il
lettore in `DevoIntervenire.tsx`** — se resti a metà, `tsc` te lo dice (ed è il motivo per cui la
rinomina si fa qui e non «dopo»).

- [ ] **Passo 4-bis — 🔴 EMENDAMENTO (revisione del Task 5): NESSUNO LEGA L'EVENTO AL LAVORO**

`provato:` il trigger `assert_same_lab_rifacimento` guarda **solo** `lavoro_originale_id` e
`lavoro_nuovo_id`, **mai** `evento_id`. La FK composita difende il caso «evento di un altro
laboratorio»; **non** difende «evento dello stesso laboratorio ma di un ALTRO lavoro», che passa in
silenzio. E si aggrava: `rifacimento_evento_unique` a quel punto **brucia quell'evento**, così un
rifacimento legittimo successivo su di esso uscirebbe `23505`.
➡️ **Questa rotta è l'ultimo punto in cui l'identificativo giusto può essere garantito**, e ce l'ha
già in mano: l'evento lo ha appena inserito lei, su questo lavoro. Passa **quello**, mai un valore
che arriva dal corpo della richiesta.

- [ ] **Passo 5 — `creaRifacimento`, con l'idempotenza tradotta**

```typescript
/**
 * Crea il rifacimento (D306). **NON è fail-soft** sul lavoro nuovo: se non nasce,
 * l'utente deve saperlo. È fail-soft SOLO sul trasferimento della cassetta (D309),
 * come già fa il percorso HTTP esistente — un cassetto non spostato non annulla un
 * lavoro già creato.
 */
async function creaRifacimento(
  svc: ReturnType<typeof getServiceClient>,
  laboratorio_id: string, lavoro_id: string, evento_id: string, motivo: Motivo
): Promise<EsitoAzione> {
  try {
    const { data, error } = await svc.rpc('crea_rifacimento_atomico', {
      p_lavoro_originale_id: lavoro_id,
      p_motivo: motivo,               // 'difetto_lavorazione' | 'difetto_materiale' — il CHECK li accetta da T3
      p_rilevato_in: 'post_consegna', // l'unico valore vero qui: il problema è emerso dopo la consegna
      p_costo_interno: null,
      p_note: null,
      p_evento_id: evento_id,
    })
    if (error) {
      // 23505 = questo evento ha già il suo rifacimento (T3). Non è un guasto: è
      // il secondo tocco, o il ritentativo dopo un timeout. Si restituisce quello
      // che c'è invece di crearne un altro e bruciare un progressivo.
      if (error.code === '23505') {
        const { data: gia } = await svc
          .from('lavori_rifacimenti')
          .select('lavoro_nuovo:lavori!lavori_rifacimenti_lavoro_nuovo_id_fkey(id, numero_lavoro)')
          .eq('laboratorio_id', laboratorio_id)
          .eq('evento_id', evento_id)
          .maybeSingle()
        const nuovo = (gia as { lavoro_nuovo?: { id: string; numero_lavoro: string } } | null)?.lavoro_nuovo
        if (nuovo) return { stato: 'applicato', lavoro_nuovo: nuovo }
      }
      console.error('[EVENTI-QUALITA] crea_rifacimento_atomico fallita:', error)
      return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
    }
    const r = data as { lavoro_nuovo_id?: string; numero_lavoro?: string }
    if (!r?.lavoro_nuovo_id || !r?.numero_lavoro) {
      console.error('[EVENTI-QUALITA] crea_rifacimento_atomico: risposta inattesa', data)
      return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
    }
    await trasferisciCassetta(svc, laboratorio_id, lavoro_id, r.lavoro_nuovo_id) // D309, fail-soft
    return { stato: 'applicato', lavoro_nuovo: { id: r.lavoro_nuovo_id, numero_lavoro: r.numero_lavoro } }
  } catch (e) {
    console.error('[EVENTI-QUALITA] crea_rifacimento_atomico — eccezione:', e)
    return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
  }
}

const MESSAGGIO_RIFACIMENTO_FALLITO =
  'La registrazione è salva, ma il lavoro nuovo non è stato creato: crealo dalla scheda, oppure riprova fra un momento.'
```
🛑 **`trasferisciCassetta` NON si riscrive**: la funzione esiste in
`src/app/api/lavori/[id]/rifacimento/route.ts` (`trasferisciCassettaAlRifacimento`). **Estraila** in
un modulo condiviso — `src/lib/rifacimento/cassetta.ts` — e falla importare da **entrambe** le rotte.
Due copie sono «le liste scritte due volte» in forma di codice, e il difetto è che i due percorsi che
creano lo stesso oggetto **divergerebbero**.

- [ ] **Passo 6 — verde + `tsc` + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run tests/unit/api 2>&1 | tail -8 && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(qualita): la rotta deriva il bivio, chiama le due azioni nuove e dice l'esito vero"
```

---

## Task 8 — D308: i campi stampati non si correggono di nascosto

**File:**
- Modifica: `src/app/api/lavori/[id]/route.ts`
- Prova: le prove della PATCH (segui i vicini)

**Interfacce:**
- Consuma: nulla. Produce: **422** su cinque campi quando esiste una dichiarazione viva.

🔑 **Perché questo task è dentro quest'ondata e non è fuori tema:** senza, la transizione di T4 apre la
strada per cui un manufatto esce con una dichiarazione che nomina **un'altra persona** — l'annullamento
del documento era anche il meccanismo che faceva arrivare le correzioni sulla carta (§1 della spec).

- [ ] **Passo 1 — la prova, prima**

Su un lavoro **con** dichiarazione viva: ① `PATCH { descrizione: 'x' }` → **422**, e il messaggio
**nomina il percorso** («Devo intervenire» → «dato sbagliato sulla dichiarazione») · ② `PATCH { note:
'x' }` sullo **stesso** lavoro → **200** (la finestra si chiude su cinque voci, non su tutto) ·
③ su un lavoro **senza** dichiarazione viva, `PATCH { descrizione: 'x' }` → **200**.

- [ ] **Passo 2 — il codice**, dopo aver letto la riga del lavoro e prima di applicare l'aggiornamento:

```typescript
/**
 * ⚖️ D308 — I CINQUE CAMPI STAMPATI NON SI CORREGGONO FINCHÉ LA DICHIARAZIONE È VIVA.
 *
 * 🔑 Il fatto che l'ha generata: togliere l'annullamento della dichiarazione (per
 * non cancellare la prova di una consegna avvenuta, D293) ha spento il meccanismo
 * che faceva arrivare le correzioni sul documento. Senza questo cancello, un
 * manufatto può uscire con una dichiarazione che nomina un'altra persona, e ogni
 * controllo resta verde: precheckMDR misura il lavoro vivo, mai la dichiarazione,
 * e generateDdC restituisce quella già emessa.
 *
 * 🛑 NON è un blocco cieco (D262: la PWA dà aiuti, non blocchi): il messaggio
 * nomina il percorso che RIEMETTE, costruito ieri e già provato.
 */
const CAMPI_STAMPATI = ['paziente_id', 'cliente_id', 'richiedente_nome', 'tipo_dispositivo', 'descrizione'] as const

// … dentro la PATCH, dopo aver caricato il lavoro:
const toccati = CAMPI_STAMPATI.filter((c) => c in aggiornamenti)
if (toccati.length > 0) {
  const { count } = await svc
    .from('dichiarazioni_conformita')
    .select('id', { count: 'exact', head: true })
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .neq('stato', 'annullata')
  if ((count ?? 0) > 0) {
    return err(
      'Questo dato è già stampato sulla dichiarazione consegnata, e cambiarlo qui la lascerebbe indietro. Per correggerlo apri «Devo intervenire» e scegli «dato sbagliato sulla dichiarazione»: l\'app rifà il documento e conserva quello vecchio.',
      422
    )
  }
}
```
⚠️ **`count` con `head: true` non porta righe**: è il modo giusto di chiedere «ce n'è almeno una»
senza scaricare la dichiarazione intera.

- [ ] **Passo 3 — verde + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run 2>&1 | tail -8
git add -A && git commit -m "feat(lavori): i cinque campi stampati si correggono riemettendo, non di nascosto (D308)"
```

---

## Task 9 — Il foglio: il terzo passaggio, e sei testi che oggi non esistono

**File:**
- Modifica: `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx`
- **Apri PRIMA:** `src/lib/qualita/motivi-ui.ts` — 🛑 contiene **già** due formulazioni della domanda
  del bivio (`:61` e `:66`). **Riusa quella**, non scriverne una terza.

- [ ] **Passo 1 — leggi il file per intero** e scrivi nel resoconto: le fasi esistenti, chi chiama
  `ricomincia()`, e come il tasto «indietro» del telefono agisce sull'overlay.

- [ ] **Passo 2 — il bivio come `DialogConferma` sopra il foglio, non come fase**

🔑 **La ragione, e non è estetica:** come **fase**, la pressione «indietro» del telefono chiama
`alPop → chiudi() → ricomincia()` e **butta via tutto il modulo compilato**. Come **dialogo
sovrapposto**, `alPop` chiude **solo il più alto** e **ri-spinge** l'entry per chi resta sotto
(`storia-overlay.ts:110-118`) — ed è il pattern che `confermaSbaglio` **già usa** per il ramo
distruttivo. Il bivio va nello stesso posto, **subito prima dell'invio**, dopo i dettagli.

- [ ] **Passo 3 — l'affordance: il ramo che crea un lavoro non può avere il tasto più debole**

Oggi il ramo reversibile (riporta indietro un lavoro) passa da un `DialogConferma` con etichetta
esplicita «Sì, riportalo indietro»; il ramo che **brucia un progressivo di anno** avrebbe un
«Continua». ➡️ Le due opzioni del bivio portano **etichette che dicono che cosa succede**:
«Si sistema questo manufatto» e «**Se ne fa uno nuovo — nasce subito un lavoro nuovo**».

- [ ] **Passo 4 — impedisci la combinazione, non servirla come vicolo cieco**

`destinatario_errato` + «Mai uscito dal laboratorio» oggi è **liberamente componibile** a schermo
(`:399-405`) e il 422 di T7 arriverebbe **a modulo compilato**. Disabilita quella pastiglia quando il
motivo è `destinatario_errato`, con la ragione a schermo. 🛑 **La guardia dell'API resta comunque**:
è lì che sta il confine.

- [ ] **Passo 5 — la schermata finale: prima che cosa è successo al LAVORO**

Oggi la prima card è sempre «Registrato» (verde, incondizionata) e l'eventuale guasto è la **terza**,
su 390px facilmente sotto la piega. ➡️ **Inverti**: in cima l'esito dell'azione, sotto la conferma che
l'evento è agli atti. E i testi sono **sei**, tre stati × due azioni nuove — quelli esistenti dicono
«il lavoro è tornato fra i pronti», che su un rifacimento è **falso**:

| azione | applicato | non applicabile | fallito |
|---|---|---|---|
| `torna_pronto` | «Il lavoro è tornato fra quelli pronti, e la dichiarazione resta valida.» — e se `dichiarazione_viva === false`: «⚠️ Su questo lavoro non c'era una dichiarazione valida: quando lo riconsegnerai ne verrà emessa una nuova.» | «Questo lavoro non era da riportare indietro.» | «La registrazione è salva, ma il lavoro non è tornato fra i pronti: riportalo tu, oppure riprova fra un momento.» |
| `crea_rifacimento` | «È nato il lavoro **{numero}**. Questo resta consegnato con la sua dichiarazione.» + una via per **aprirlo** | «Non c'era niente da rifare su questo lavoro.» | «La registrazione è salva, ma il lavoro nuovo non è stato creato: crealo dalla scheda, oppure riprova.» |

🛑 **Per aprire il lavoro nuovo si usa `useNavigaDaOverlay`**, MAI `router.push`: da dentro un overlay
v3 un `push` impila la pagina sopra un doppione di history e lascia un «indietro» morto (direttiva
permanente, `CLAUDE.md` §9).

- [ ] **Passo 6 — FASE 9: la prova a schermo, sul banco vero**

🛑 **Non è un rituale, ed è la lezione del 07/08:** quindici prove verdi e sullo schermo il foglio non
si apriva **mai**, perché quel difetto vive nella `history` del browser, che jsdom non simula.
Tre viewport (390 · 768 · 1280) × chiaro e scuro, e **un giro completo per ciascuno dei tre motivi**
contro il database vero. Accesso: `npx tsx scripts/link-accesso.ts` (D103) — il link è **monouso**, e
`navigate` **perde i parametri**: si apre con `javascript_tool` (`window.location.href = …`).

- [ ] **Passo 7 — salva**

```bash
git add -A && git commit -m "feat(lavori): il bivio a schermo, e la schermata finale dice prima che cosa è successo al lavoro"
```

---

## Task 10 — Le prove d'integrazione e la chiusura

**File:** Crea `tests/integration/torna-a-pronto.rpc.test.ts`

- [ ] **Passo 0 — 🔴 EMENDAMENTO DEL 07/08 (revisione del Task 4): UN FILE DI PROVE GUARDA UNA FUNZIONE MORTA**

`provato:` `tests/integration/riapri-lavoro-atomica.rpc.test.ts:22` e `:28-31` **riscrivono la
funzione con il corpo del 06/08 dentro la propria transazione**, e la chiamano in **14 punti**. I suoi
**15 verdi non hanno mai visto il corpo vivo**: la correzione del 07/08 (`annullata_da_evento_id`) non
è coperta da nessuno di essi, e il motivo scritto in testa al file — «la migration non è ancora
applicata al database vero» — è **scaduto dal 6 agosto sera**.
➡️ **Togli `applicaMigrazione` e prova la funzione VIVA**, come già fa
`tests/integration/riemetti-ddc-atomica.rpc.test.ts:7`, aggiungendo l'asserzione su
`annullata_da_evento_id`.
🔑 **Perché sta qui e non nel Task 4:** è la stessa famiglia della lezione del 07/08 — *una prova non
può vedere un difetto che vive nella cosa che la prova sostituisce*. Lì era il framework del browser,
qui è la funzione stessa.

**E aggiungi al file nuovo i quattro rami che le sonde del Passo 1 non toccano:**
`evento_non_valido` · `non_consegnato` · `ddc_viva:false` · e **l'atomicità attraverso la chiamata
annidata** (se `ripristina_lavoro_a_pronto` solleva, il lavoro deve restare `consegnato`) — misurata
a mano dall'esecutore del Task 4 e oggi **non ripetibile da nessuno**.

- [ ] **Passo 1 — il giro completo, sul banco vero** (`set -a && . ./.env.local; set +a`):
  ① `destinatario_errato` → lavoro a `pronto`, **dichiarazione ancora viva**, `prima_immissione_at`
  **invariata** · ② riconsegna → **nessun progressivo bruciato** (numero di dichiarazione **identico**
  prima e dopo) e `prima_immissione_at` **ancora** quella della prima consegna · ③ `si_sistema` →
  come ① · ④ `si_rifa` chiamato **due volte** → **un solo** lavoro nuovo, e la cassetta segue ·
  ⑤ `errore_registrazione` → la dichiarazione **è** annullata (la gemella non è stata rotta).

- [ ] **Passo 2 — la verifica piena, con l'uscita letta da variabile**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npm run verify:full > /tmp/verify.log 2>&1; ESITO=$?; echo "uscita=$ESITO"; tail -25 /tmp/verify.log
```
**Atteso:** `uscita=0`. 🛑 Se leggi l'uscita dietro una pipe stai leggendo quella di `tail`.

- [ ] **Passo 3 — FASE 9b: il GATE ESTETICO L2**, dovuto **prima del merge** (D245) — micro-audit a
  12 sezioni × 390/768/1280 × chiaro/scuro contro `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`,
  screenshot in `docs/design/screenshots/2026-08-XX-intervento/`.

- [ ] **Passo 4 — BP-1:** aggiorna `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` (la riga
  **23** si chiude, la **24** cambia di natura: la porta di idempotenza ora si percorre di routine).

---

## Autorevisione del piano

**Copertura della spec:** §1 → T8 · §2 → T2 · §3 → T4 · §4.1 → T1, T3, T5 · §4.2 → T3, T7 ·
§4.3 → T6 · §4.4 → T7, T9 · §4.5 → chiusa da T8 (nessun task separato, per disegno) · §5.1 → riferiti,
nessun task (fuori mandato) · §5.2 → D310, già fatta · §6 → T6, T7, T10 · §7 → i gate dentro i task ·
§8 → vincoli globali.

**Segnaposto:** nessun «TBD». I due punti **dichiarati non provati** sono marcati come tali: la riga
`mai_uscito_dal_lab` sui due difetti (T7 Passo 1 ⑤) e la riga esatta di `orchestrate.ts` (T2 Passo 1).

**Coerenza dei nomi:** `effettoDaMotivoEScelta` · `richiedeScelta` · `MOTIVI_CON_SCELTA` · `Scelta` ·
`EsitoAzione` · `esito_azione` · `ripristina_lavoro_a_pronto` · `riporta_a_pronto_atomica` ·
`prima_immissione_at` · `scelta_intervento` · `rifacimento_evento_unique` — usati identici in ogni task.
