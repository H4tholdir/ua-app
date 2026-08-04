# Piano sessione ② ondata B — migration + RPC + server (P38 + P37)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Quando:** 4 agosto 2026, pomeriggio (`provato:` `date` → `Tue Aug 4 14:34:27 CEST 2026`).
**Spec madre:** `docs/superpowers/specs/2026-08-04-ondata-b-prescrizione-design.md` (RATIFICATA, D214).
**Goal:** la casa dello snapshot prescrizione (`lavori_prescrizioni`), le colonne P37, le RPC dedicate (creazione, fonte, typo, divergenza, conferma, clone nel rifacimento), la chiusura della policy `ddc_laboratorio_update` — con FASE 6b in coda.
**Architettura:** tabella figlia di `lavori` sul modello ESATTO di `lavori_denti` (FK composite, REVOKE ALL anche a `service_role`, scritture solo via RPC SECURITY DEFINER); lo snapshot si compone SERVER-SIDE (route → RPC) nella stessa transazione della creazione (V3); l'immutabilità della DdC passa da convenzione a struttura (DROP della policy UPDATE, modello DPA).
**Tech stack:** Postgres/Supabase (migration SQL, PL/pgSQL), Next.js route handlers, vitest.

## Vincoli globali

- **V1-V9 di D207** (spec §2) — in questa sessione mordono: V3 (snapshot server-side, stessa transazione), V8 (congelamento DENTRO le RPC · fonte non cancellabile con DdC attiva · chiusura policy), il clone nel rifacimento (spec §3).
- **Niente backfill** (spec §1, A18): il 58% di prescrittori sbagliati e le 2 DdC `generata` di era vecchia NON si sanano. Si ripara il meccanismo.
- **Migration additiva**: rollback = drop (spec §7). NON aggiungere `BEGIN;/COMMIT;` nelle migration (il runner le avvolge — `20260727120300:2-3`).
- **MAI worktree** — branch nel repo (`git checkout -b`).
- **CREATE OR REPLACE con firma diversa = overload, non sostituzione** — `provato:` sonda S10 sotto. Cambio firma ⇒ DROP esplicito (lezione P2-9, precedente in `20260710150000:26`).
- Citazioni normative: «MDCG 2021-3, marzo 2021» (MAI «Rev.1»).
- Dopo ogni migration: FASE 6b (`supabase gen types` + `tsc --noEmit`).
- I dati in DB sono di TEST (`ua-app/CLAUDE.md` §8): fedeltà del dato migrato non richiesta; correttezza di schema/RLS a peso pieno.

---

## §A Registro delle prove (R-P1)

Sonde eseguite il 04/08/2026 su DB vivo, **tutte in transazione annullata** (script:
`scripts/tmp/sonda-lp-r-p1.mjs`, verifica post-rollback inclusa) o in sola lettura.

### A.0 Il cancello §0① — conteggio DdC fresco (sola lettura)

`provato:` `npx tsx scripts/tmp/verifica-conteggio-ddc.ts` →

```
=== TOTALE dichiarazioni_conformita in archivio: 6 ===
DDC-2026-0002    stato=generata   template_version=NULL payload_sha256=NULL created_at=2026-07-06T15:36:15
DDC-2026-0003    stato=generata   template_version=NULL payload_sha256=NULL created_at=2026-07-06T15:48:02
DDC-2026-0001    stato=annullata  template_version=NULL payload_sha256=NULL created_at=2026-07-22T14:05:33
DDC-2026-0002    stato=annullata  template_version=ddc-v1 payload_sha256=(valorizzato) created_at=2026-07-31
DDC-2026-0003    stato=annullata  template_version=ddc-v1 payload_sha256=(valorizzato) created_at=2026-08-01
DDC-2026-0004    stato=annullata  template_version=ddc-v1 payload_sha256=(valorizzato) created_at=2026-08-03
Righe con template_version NON NULL: 3 su 6
```

⚠️ **Il ricordo era sbagliato**: non «3, tutte annullate» (referti 03/08) ma **6, di cui 2 ancora
`generata`** (era pre-v1, senza impronta). Conseguenze sul piano: ① la chiusura della policy NON
strandeggia quelle 2 righe — l'annullo resta possibile via `annulla_consegna_atomica` (SECURITY
DEFINER, catalogo vivo sonda sotto); ② per l'indice `ddc_lavoro_attiva_unique` quei 2 lavori non
possono ricevere una DdC nuova finché la vecchia non è annullata — dati di test, nessuna sanatoria
(A18); ③ il commento di `tests/unit/generate-ddc.test.ts:190-196` («su 4 dichiarazioni…») è
superato: si aggiorna (Task 7).

### A.1 Catalogo vivo (sola lettura, `scripts/tmp/sql.mjs`)

- **Policy vive su `dichiarazioni_conformita`**: `ddc_laboratorio_select` (SELECT, tenant+`deleted_at IS NULL`) · `ddc_laboratorio_insert` (INSERT, tenant) · `ddc_laboratorio_update` (**UPDATE, tenant pieno — il bersaglio**). Nessuna DELETE.
- **CHECK stato vivo**: `('bozza','generata','firmata','consegnata','annullata')` — `'annullata'` C'È nel DB; manca solo nelle fotografie (`schema.sql:1265-1266`, `domain.ts:574`) → Task 7.
- **FK di `dichiarazioni_conformita.lavoro_id`**: SEMPLICE (non composita).
- **RPC vive** (`pg_proc`): `lavoro_crea_atomico(p_lab uuid, p_lavoro jsonb, p_denti jsonb)` SECDEF · `lavoro_denti_sostituisci_atomica(p_lab, p_lavoro, p_denti, p_atteso_updated_at)` SECDEF · `crea_rifacimento_atomico(p_lavoro_originale_id, p_motivo, p_rilevato_in, p_costo_interno, p_note)` SECDEF · `consegna_finalizza_atomica(uuid,uuid)` SECDEF · `annulla_consegna_atomica(uuid,uuid,integer)` SECDEF · `genera_numero_ddc(p_lab)` NON secdef.
- **`to_regclass('public.lavori_prescrizioni')` → NULL** (nome libero).
- **`lavori`**: esiste `lavori_id_lab_uk UNIQUE (id, laboratorio_id)` (nato in `20260727120000:8`) — il supporto FK composita c'è. Colonne `numero_prescrizione` e `richiedente_nome` presenti (text, nullable); `istituzione_sanitaria` ASSENTE.
- **`lavori_immagini`**: CHECK categoria vivo a 7 valori con `'prescrizione'`; **UNIQUE (id, laboratorio_id) ASSENTE** → lo istituisce la Migration A (sonda S1).
- **GRANT UPDATE su `dichiarazioni_conformita`**: `authenticated` e `anon` lo HANNO — la policy è l'unica barriera: per questo si chiude (sonda S9).
- **`current_lab_id()`**: risolve da `public.utenti` via `auth.uid()` (prosrc incollato in sessione).
- **CHECK vivo su `lavori.stato`**: 9 valori (`ricevuto`, `in_prova_esterna`, `sospeso` inclusi) — `schema.sql:926-930` ne fotografa 6. FUORI mandato: si riferisce (handoff §3-bis).
- **Scrittori applicativi della DdC**: `grep "from('dichiarazioni_conformita')" src/` → 6 hit, **nessuna `.update()`**; unico `.insert` a `generate-ddc.ts:201`. L'unico UPDATE è dentro `annulla_consegna_atomica`.

### A.2 Le 11 sonde della DDL e della chiusura (transazione annullata)

`provato:` `node scripts/tmp/sonda-lp-r-p1.mjs` →

```
✅ S1 UNIQUE lavori_immagini(id,laboratorio_id): ALTER TABLE riuscito
✅ S2 CREATE TABLE lavori_prescrizioni: riuscito con FK composite verso lavori e lavori_immagini
✅ S3 INSERT valido: 1 riga inserita (fonte email + riferimento)
✅ S4 fonte_tipo=pippo: rifiutato — 23514 violates check "lavori_prescrizioni_fonte_tipo_check"
✅ S5 fonte senza corpo: rifiutato — 23514 violates check "lavori_prescrizioni_fonte_ck"
✅ S6 cross-tenant: rifiutato — 23503 violates foreign key "lavori_prescrizioni_lavoro_fk"
✅ S7 doppia riga stesso lavoro: rifiutato — 23505 duplicate key "lavori_prescrizioni_lavoro_uk"
✅ S8 conferma monca: rifiutato — 23514 violates check "lavori_prescrizioni_conferma_ck"
✅ S9 chiusura policy: UPDATE client: prima=1 riga, dopo il DROP=0 righe
✅ S10 overload RPC: dopo CREATE OR REPLACE a 4 parametri: 2 funzioni; dopo DROP della vecchia: 1
✅ S11 helper updated_at: presenti: apply_updated_at_trigger, trigger_set_updated_at
── DOPO IL ROLLBACK: lavori_prescrizioni=NULL · policy update PRESENTE · lavoro_crea_atomico=1 firma
```

Ogni vincolo istituito dal piano ha il suo valore rifiutato con l'errore vero incollato (R-P1).
I corpi PL/pgSQL dei task sono marcati `non eseguito` col comando di collaudo accanto.

---

## §B Registro delle letture (R-P2)

Censimento → 8 lettori paralleli con domande falsificabili (referto integrale con tutte le
citazioni: output del workflow `letture-r-p2-sessione-2`, sintetizzato qui; ogni riga sotto porta
la sua citazione). Più tre letture dirette in sessione.

| Percorso | Esito |
|---|---|
| `supabase/schema.sql` (sez. lavori 860-935, DdC 1150-1310, progressivi 90-140, 2040-2130) | letto (L1+L2+diretta). Policy 1283-1294; CHECK stato DdC 1265-1266 (STANTIO, senza `annullata`); commenti Allegato IV a 878, 903, 919 (la 1189 è la negazione GIUSTA: non si tocca); `numero_prescrizione` a 888 |
| `supabase/migrations/20260727120100_lavori_denti_tabella.sql` | letto INTERO (diretta): il modello (FK composita 54-55, REVOKE E8 91-92, GRANT SELECT) |
| `supabase/migrations/20260727120300_lavori_denti_rpc.sql` | letto INTERO (diretta): `lavoro_crea_atomico` 132-215 (INSERT lavori 150-179 CON `richiedente_nome` a 163; denti 184-195; denormalizzazione 205-212; REVOKE/GRANT 222-226); gettone concorrenza 61-63 |
| `supabase/migrations/20260728103000_rifacimento_clona_denti_colore.sql` | letto (L3): firma vigente 68-77; clone lavori 103-147, denti 169-178; **innesto del clone snapshot fra riga 188 e 190**; REVOKE/GRANT 209-210 |
| `supabase/migrations/20260710150000` + `20260710180000` + `20260710091500` | letti (L4): `consegna_finalizza_atomica` vigente (150000:23-53, **dormiente** — la consegna vera passa da `orchestrate.ts`, dichiarato in `20260721090000:153-156`); `annulla_consegna_atomica` vigente (180000:60-132; porta la DdC a `annullata` a 114-116); precedente DROP-per-cambio-firma a 150000:26 |
| `supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql` | letto (L1): CHECK con `annullata` (:9) + `ddc_lavoro_attiva_unique` UNIQUE parziale (15-17) |
| `supabase/migrations/20260803090000` + `20260803150000` + `20260804120000` | letti (L6): `denti_snapshot` jsonb sulla DdC SENZA writer («schema prima del writer», 44-45) — il precedente strutturale; registro emissioni DPA; **il precedente ESATTO della chiusura: policy DPA ridotta a FOR SELECT (20260804120000:30-34)** + `emesso_da` (58-62) |
| `src/lib/wizard/crea-lavoro.ts` | letto INTERO (L5). ⚠️ il mandato di lettura lo cercava sotto `src/lib/lavori/` — cartella dove quel modulo NON esiste: il percorso vero è questo. Orchestrazione client fail-soft; il POST /api/lavori è l'UNICO confine atomico (22-27, 378-380); colore normalizzato client-side a 323; nessun `richiedente_nome`/`numero_prescrizione` mandato (grep 0 hit) |
| `src/app/api/lavori/route.ts` (POST) | letto (L7, mirato): `richiedente_nome: body.richiedente_nome ?? null` a :233 dentro `p_lavoro`; `colore_scartato` a 306-311 |
| `src/app/api/lavori/[id]/route.ts` | letto INTERO (L7): `PATCHABLE_FIELDS` a 178-213 (34 campi, `richiedente_nome` a 181); commento esclusi a 54-63 (⚠️ le «259-264» delle regole sono slittate: il filtro è a 370-379); nessun gettone concorrenza (E5 confermata: updated_at forzato a 464-465, UPDATE per id+lab a 467-471) |
| `src/lib/pdf/generate-ddc.ts` | letto (L6): guard idempotenza 93-107 (`.neq('stato','annullata')` a 102 — NON 85-95: citazione CLAUDE.md stantia); INSERT 199-213; `prescrizione_caratteristiche: null` CABLATO a 156; `prescrizione_id` da `lavoro.numero_prescrizione` a 148 (resta vivo in ②: la colonna su `lavori` NON si droppa) |
| `src/lib/consegna/precheck.ts` + `costanti.ts` + chiamanti | letto INTERO (L7): 6 bloccanti (21-92), warning mdr_* (94-101), output 103-108; innesto bloccanti nuovi fra r.92 e r.94 (④, non ②); chiamanti server-side: `precheck-consegna/route.ts:58`, `orchestrate.ts:226` |
| `src/types/domain.ts` (Lavoro 251-368, DdC 558-609) | letto (L8): union stato DdC a 574 SENZA `annullata`; `numero_prescrizione` 259, `richiedente_nome` 274, `richiedente_email` 275; `prescrittore_nome`/`prescrizione_id`/`prescrizione_caratteristiche` sono della DdC (582-592) |
| `tests/unit/precheck.test.ts` | letto INTERO (L8): 9 test, fixture con doppio cast a 113 |
| `tests/unit/generate-ddc.test.ts` (sez. conteggio) | letto (L8): commento conteggio a 190-196 («su 4 dichiarazioni») — superato dal cancello A.0 |
| `src/lib/domain/categorie-foto.ts` | letto (L8): `CategoriaFoto` con `'prescrizione'` a 34 |
| `supabase/migrations/002_fase2_schema.sql` (lavori_immagini 242-263, trigger 600-639) | letto (L2): FK semplici + trigger `assert_same_lab_lavoro`; RLS con `get_lab_id()` (§3-bis n.3) |
| NON letti (dichiarato): `src/lib/consegna/orchestrate.ts` intero, superfici UI wizard/scheda | fuori mandato ② (③/④); del primo sono letti i punti citati dai lettori (:226) |

**Sorprese R-E2 dei lettori** (censite, NON corrette qui — vanno nell'handoff di chiusura §3-bis):
14 nuove, le più gravi: ① `consegna_lavoro_lock(uuid,uuid)` vigente NON ha corpo nel repo (solo
marker `004`) — irreplicabile da migration; ② il rifacimento vigente NON clona
`paziente_nome_snapshot` (007 lo faceva); ③ `dichiarazioni_conformita.generated_by` mai scritto
da nessun percorso (il «chi» dell'emissione DdC non è registrato — il DPA l'ha sanato con
`emesso_da`, la DdC no); ④ commenti advisory-lock in `schema.sql:91` e `:2038` smentiti dal corpo
(FIX a 104-109); ⑤ `genera_progressivo` dichiarata SECURITY DEFINER nei commenti (`schema.sql:121`)
ma non nel DDL della fotografia; ⑥ policy UPDATE DdC non filtra `deleted_at` (muore col DROP);
⑦ paziente creato dal wizard senza compensazione se il POST lavori fallisce; ⑧ `template_version`
(DdC) vs `template_versione` (DPA); ⑨ CHECK `lavori.stato` fotografato a 6 valori, vivo a 9;
⑩ `LavoroImmagine.categoria` tipizzata `string` invece di `CategoriaFoto`; ⑪ CLAUDE.md:557 cita
il guard a 85-95 (vero: 93-107) e le regole citano il filtro allowlist a 259-264 (vero: 370-379);
⑫ fixture precheck con doppio cast che nasconde la deriva; ⑬ `consegna_precheck_passato_al_primo_tentativo`
scritto incondizionatamente; ⑭ commento «Una DoC per lavoro» su vincolo che non lo impone
(`schema.sql:1275`) — quest'ultimo si corregge nel Task 7 perché parte della fotografia DdC già a mandato.

---

## §C Censimento (R-P6)

Conteggi con `grep -rn` su `src/ supabase/ scripts/ tests/` (04/08/2026):

| Identificatore | Hit | Che cosa se ne fa il piano |
|---|---|---|
| `lavori_prescrizioni` | **0** | nasce (Migration A) |
| `istituzione_sanitaria` | **0** | nasce su `lavori` (Migration A); scrittori: RPC creazione + POST + PATCH allowlist (Task 5) |
| `fonte_tipo` / `fonte_immagine_id` / `fonte_riferimento` | **0/0/0** | nascono su `lavori_prescrizioni` |
| `numero_prescrizione` | 18 | la colonna su `lavori` RESTA (la legge `generate-ddc.ts:148`; drop = ondata ④ o mai); la casa NUOVA è `lavori_prescrizioni.numero_prescrizione`; il commento-ragione in `route.ts:54-63` si aggiorna (Task 5) |
| `richiedente_nome` | 47 | NON si tocca (già scritto da RPC:163, POST:233, PATCH:181) — P37 vi affianca l'istituzione |
| `ddc_laboratorio_update` | 1 (`schema.sql:1292`) | DROP (Migration C) + fotografia aggiornata (Task 7) |
| `crea_rifacimento_atomico` | 48 | CREATE OR REPLACE **stessa firma** col clone (Migration B) |
| `lavoro_crea_atomico` | (3 file migration) | DROP firma (uuid,jsonb,jsonb) + CREATE (uuid,jsonb,jsonb,jsonb DEFAULT NULL) — S10 |
| `Allegato IV` | 4 | si correggono 878/903/919; la 1189 è già giusta e NON si tocca |
| `template_version` / `payload_sha256` | 53/64 | non toccati (lettura di contesto) |
| `current_lab_id` | 131 | pattern RLS della tabella nuova |
| `provenienza` | 33 | non toccata: lo snapshot vive in tabella propria (spec §3) |
| `'annullata'` (stato DdC) | vivo nel DB, assente da `domain.ts:574` e `schema.sql:1265` | fotografie allineate (Task 7 — igiene già censita in handoff §3-bis n.4) |

**Nomi NUOVI istituiti** (dizionario): tabella `lavori_prescrizioni` · colonne `contenuto`,
`divergenze`, `fonte_tipo` (valori: `'foglio'`=foglio a mano, `'email'`, `'modulo'`,
`'piattaforma'` — le 4 forme di D202), `fonte_immagine_id`, `fonte_riferimento`,
`numero_prescrizione`, `confermata_da`, `confermata_at` · vincoli `lavori_prescrizioni_{lavoro_uk,lavoro_fk,fonte_img_fk,fonte_ck,conferma_ck}`,
`lavori_immagini_id_lab_uk` · RPC `lavoro_prescrizione_allega_fonte`,
`lavoro_prescrizione_correggi_typo`, `lavoro_prescrizione_registra_divergenza`,
`lavoro_prescrizione_conferma_consegna` · chiavi JSONB di `contenuto`: `elementi` (int[]),
`colore` (testo COME DIGITATO — fedeltà, MAI normalizzato), `tipo` (entra SOLO alla conferma,
D213), `numero` NO (ha la sua colonna) · chiavi di `divergenze[]`: `campo`, `motivo`
(`'richiesta_dentista'|'esigenza_tecnica'|'materiale_non_disponibile'|'altro'`, D212), `nota`,
`utente_id`, `registrata_at`.
**Semantica di `contenuto`** (V2): chiave presente = trascritta dalla prescrizione; assente = non
prescritta. MAI una dicitura «niente prescritto» (D101). **Stato V7** («in attesa di conferma
scritta»): `fonte_riferimento` valorizzato con `fonte_tipo IS NULL`.
**Nessun nome esce da allowlist**; UNO vi entra: `istituzione_sanitaria` in `PATCHABLE_FIELDS`
(direttiva §9: ogni campo nasce con la sua via di correzione).

---

## §D Decisioni di disegno (ognuna con la sua fonte)

1. **La riga snapshot nasce con `lavoro_crea_atomico`** quando la route passa `p_prescrizione`
   (V3: stessa transazione); per lavori nati prima (o senza), le RPC successive fanno UPSERT
   (`ON CONFLICT (lavoro_id) DO UPDATE`). Niente backfill (A18).
2. **`p_prescrizione jsonb DEFAULT NULL`**: la nuova firma resta chiamabile dai client esistenti
   (PostgREST risolve col default) — migration indipendente dal deploy della route.
3. **La fonte è UNA per riga** (spec §3); le immagini aggiuntive vivono già in `lavori_immagini`
   categoria `'prescrizione'`. Il caso V6 (solo scansione) si legge in ④ come «fonte presente MA
   `contenuto` vuoto»; il rimedio (conferma scritta) = nuova fonte + trascrizione.
4. **Congelamento V8**: ogni RPC di scrittura sullo snapshot rifiuta con esito `'congelata'` se
   esiste una DdC con `stato <> 'annullata'` per il lavoro. `allega_fonte` rifiuta la
   SOSTITUZIONE con DdC attiva (fonte non cancellabile); prima dell'emissione tutto si corregge
   (direttiva §9).
5. **Il rifacimento clona** `contenuto`, fonte (tipo+immagine+riferimento) e
   `numero_prescrizione`; **azzera** `divergenze` e la conferma. La FK dell'immagine regge il
   clone (vincola al laboratorio, non al lavoro): il documento del medico vale anche per il
   rifacimento.
6. **`istituzione_sanitaria` vive su `lavori`** accanto a `richiedente_nome` (All. XIII p.1: due
   caselle unite da «e»; D206: nullable, il dottore singolo la lascia vuota).
7. **La conferma V5 nasce come struttura + RPC** (`confermata_da/at`, modello `emesso_da` del
   DPA); l'aggancio a `orchestrate.ts` è della ④ (lì vive la consegna vera — la RPC
   `consegna_finalizza_atomica` è dormiente, `20260721090000:153-156`).
8. **Le route dei gesti (typo/divergenza/conferma) NON nascono in ②**: nascono in ③/④ accanto
   alle loro UI (niente API orfane). In ② nascono le RPC e il lato server della creazione.

---

## Task 1 — FASE 5: branch dedicata

**Files:** nessuno (git).

- [ ] **Step 1.1** `git -C ua-app checkout -b ondata-b-sessione-2` (MAI worktree).
- [ ] **Step 1.2** `git status` → albero pulito prima di cominciare (a parte `scripts/tmp/` di sonda).

## Task 2 — Migration A: strutture (tabella + P37)

**Files:**
- Create: `supabase/migrations/<TS>_ondata_b_lavori_prescrizioni.sql` (TS = `date +%Y%m%d%H%M%S` — D155: la data si legge dall'orologio)

**Interfaces (produce):** tabella `lavori_prescrizioni` (DDL sotto), vincolo
`lavori_immagini_id_lab_uk`, colonna `lavori.istituzione_sanitaria text`.

- [ ] **Step 2.1** Scrivere la migration — contenuto INTEGRALE (DDL `provato:` sonde S1-S8; RLS/REVOKE `non eseguito`, collaudo in Step 2.3):

```sql
-- <TS>_ondata_b_lavori_prescrizioni.sql — Ondata B, sessione ②, parte 1/3.
-- Spec §3 (D214). NON aggiungere BEGIN;/COMMIT;.
-- Modello: lavori_denti (20260727120100) — FK composite, scrittura solo via RPC.

-- Il supporto per la FK composita verso l'immagine fonte (assente fino a oggi;
-- su lavori esiste già come lavori_id_lab_uk, 20260727120000:8).
ALTER TABLE lavori_immagini
  ADD CONSTRAINT lavori_immagini_id_lab_uk UNIQUE (id, laboratorio_id);

-- La casa dello snapshot: la trascrizione della prescrizione, fotografata al
-- momento T (D204). JSONB deliberato: fedeltà > integrità referenziale — il
-- vincolo UNIQUE(lavoro_id,fdi) + DELETE&INSERT di lavoro_denti_sostituisci_atomica
-- cancellerebbe la trascrizione alla prima modifica in lavorazione (spec §3).
CREATE TABLE lavori_prescrizioni (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id      uuid NOT NULL REFERENCES laboratori(id),
  lavoro_id           uuid NOT NULL,

  -- Chiave presente = trascritta dal documento; assente = non prescritta (V2).
  -- MAI una dicitura "nessuna caratteristica prescritta" (D101).
  -- Chiavi note: elementi int[] · colore testo COME DIGITATO (mai normalizzato)
  -- · tipo (entra SOLO alla conferma di consegna, D213).
  contenuto           jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Divergenze prescritto/eseguito col motivo (V9, D212): array di
  -- {campo, motivo, nota, utente_id, registrata_at}. Il rifacimento le azzera.
  divergenze          jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Le 4 forme di D202. NULL con fonte_riferimento valorizzato = V7,
  -- "in attesa di conferma scritta" (a voce/telefono non è MAI una fonte).
  fonte_tipo          text CHECK (fonte_tipo IN ('foglio','email','modulo','piattaforma')),
  fonte_immagine_id   uuid,
  fonte_riferimento   text,

  -- P38: il numero facoltativo trova casa QUI; lavori.numero_prescrizione resta
  -- (la legge generate-ddc.ts:148) con la sua ragione scritta nella route.
  numero_prescrizione text,

  -- V5: la conferma guardando il foglio, registrata server-side (chi, quando).
  -- Modello: data_processing_agreements.emesso_da (20260804120000:58-62).
  confermata_da       uuid REFERENCES utenti(id),
  confermata_at       timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Una trascrizione per lavoro; il rifacimento è un ALTRO lavoro e clona.
  CONSTRAINT lavori_prescrizioni_lavoro_uk UNIQUE (lavoro_id),

  -- FK COMPOSITE anti cross-tenant (modello lavori_denti_lavoro_fk).
  CONSTRAINT lavori_prescrizioni_lavoro_fk FOREIGN KEY (lavoro_id, laboratorio_id)
    REFERENCES lavori (id, laboratorio_id),
  CONSTRAINT lavori_prescrizioni_fonte_img_fk FOREIGN KEY (fonte_immagine_id, laboratorio_id)
    REFERENCES lavori_immagini (id, laboratorio_id),

  -- Una fonte dichiarata deve avere un corpo: immagine o riferimento (V1 morde
  -- al precheck; qui si impedisce solo la forma vuota).
  CONSTRAINT lavori_prescrizioni_fonte_ck CHECK (
    fonte_tipo IS NULL OR fonte_immagine_id IS NOT NULL OR fonte_riferimento IS NOT NULL
  ),

  -- Il "chi" e il "quando" della conferma viaggiano insieme.
  CONSTRAINT lavori_prescrizioni_conferma_ck CHECK ((confermata_da IS NULL) = (confermata_at IS NULL))
);

CREATE INDEX lavori_prescrizioni_lab_idx ON lavori_prescrizioni (laboratorio_id);

SELECT apply_updated_at_trigger('lavori_prescrizioni');

-- ============ RLS: lettura per tenant, scrittura SOLO via RPC ============
ALTER TABLE lavori_prescrizioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY lavori_prescrizioni_tenant_select ON lavori_prescrizioni
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

-- E8: service_role nella lista del REVOKE (default privileges Supabase gli
-- darebbero tutto; il DELETE cross-tenant è già stato riprodotto — nota E8,
-- 20260721090000). Le RPC scrivono perché SECURITY DEFINER.
REVOKE ALL ON lavori_prescrizioni FROM anon, authenticated, service_role;
GRANT SELECT ON lavori_prescrizioni TO authenticated, service_role;

COMMENT ON TABLE lavori_prescrizioni IS
  'Trascrizione della prescrizione (spec ondata B §3, D214). Scrittura SOLO via RPC lavoro_crea_atomico / lavoro_prescrizione_*: REVOKE ALL, service_role compreso. Il rifacimento clona contenuto+fonte+numero, azzera divergenze e conferma.';

-- ============ P37: la seconda casella dell'Allegato XIII p.1 ============
-- "il nome della persona che ha prescritto ... e, se del caso, il nome
-- dell'istituzione sanitaria" — due caselle unite da "e" (spec §0).
-- Nullable: il dottore singolo la lascia legittimamente vuota (D206②).
ALTER TABLE lavori ADD COLUMN istituzione_sanitaria text;

COMMENT ON COLUMN lavori.istituzione_sanitaria IS
  'All. XIII p.1: istituzione sanitaria "se del caso" (P37, D206). Persona: richiedente_nome.';
```

- [ ] **Step 2.2** Applicare: `npx supabase db push` (progetto `iagibumwjstnveqpjbwq`). Expected: `Applying migration <TS>_ondata_b_lavori_prescrizioni.sql... Finished`.
- [ ] **Step 2.3** Collaudo strutture vive (sola lettura):
`node scripts/tmp/sql.mjs "SELECT conname FROM pg_constraint WHERE conrelid='public.lavori_prescrizioni'::regclass ORDER BY conname"` → attesi i 5 vincoli + PK + FK lab/utenti;
`node scripts/tmp/sql.mjs "SELECT policyname, cmd FROM pg_policies WHERE tablename='lavori_prescrizioni'"` → SOLO `lavori_prescrizioni_tenant_select, SELECT`;
`node scripts/tmp/sql.mjs "SELECT column_name FROM information_schema.columns WHERE table_name='lavori' AND column_name='istituzione_sanitaria'"` → 1 riga.
- [ ] **Step 2.4** Commit: `git add supabase/migrations/ && git commit -m "feat(db): tabella lavori_prescrizioni + colonna P37 istituzione_sanitaria (ondata B ②, spec §3)"`.

## Task 3 — Migration B: le RPC

**Files:**
- Create: `supabase/migrations/<TS2>_ondata_b_prescrizioni_rpc.sql`
- Create: `scripts/tmp/collaudo-lp-rpc.mjs` (collaudo usa-e-getta, transazione annullata)

**Interfaces (produce):**
`lavoro_crea_atomico(p_lab uuid, p_lavoro jsonb, p_denti jsonb, p_prescrizione jsonb DEFAULT NULL) RETURNS json`
· `lavoro_prescrizione_allega_fonte(p_lab uuid, p_lavoro uuid, p_fonte_tipo text, p_fonte_immagine_id uuid, p_fonte_riferimento text) RETURNS json`
· `lavoro_prescrizione_correggi_typo(p_lab uuid, p_lavoro uuid, p_campo text, p_valore jsonb, p_atteso_updated_at timestamptz) RETURNS json`
· `lavoro_prescrizione_registra_divergenza(p_lab uuid, p_lavoro uuid, p_campo text, p_motivo text, p_nota text, p_utente uuid) RETURNS json`
· `lavoro_prescrizione_conferma_consegna(p_lab uuid, p_lavoro uuid, p_utente uuid) RETURNS json`
· `crea_rifacimento_atomico` (stessa firma, clona lo snapshot).
Esiti json: `{esito:'ok'|...}` con `'non_trovato'`, `'conflitto'`, `'congelata'`,
`'senza_prescrizione'`, `'motivo_non_valido'`, `'fonte_congelata'` — stile
`lavoro_denti_sostituisci_atomica`.

Blocchi `non eseguito` — collaudo: Step 3.3. Punti fermi già provati: S10 (DROP prima del
CREATE a firma nuova), innesto clone fra le righe 188-190 della definizione vigente (L3).

- [ ] **Step 3.1** Scrivere la migration. Scheletro vincolante (corpi completi nel file, qui i punti di legge):

```sql
-- <TS2>_ondata_b_prescrizioni_rpc.sql — Ondata B, sessione ②, parte 2/3.
-- NON aggiungere BEGIN;/COMMIT;. Tutte SECURITY DEFINER SET search_path = public, pg_temp.
-- REVOKE FROM PUBLIC, anon, authenticated + GRANT TO service_role per OGNI firma (modello 20260727120300:222-226).

-- 1) Firma nuova: DROP esplicito, MAI CREATE OR REPLACE con firma diversa
--    (provato in sonda: l'OR REPLACE crea un overload — 2 funzioni).
DROP FUNCTION public.lavoro_crea_atomico(uuid, jsonb, jsonb);
CREATE FUNCTION public.lavoro_crea_atomico(
  p_lab uuid, p_lavoro jsonb, p_denti jsonb, p_prescrizione jsonb DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- Corpo IDENTICO al vigente (20260727120300:136-215) con DUE aggiunte:
  -- a) nell'INSERT INTO lavori: istituzione_sanitaria = p_lavoro->>'istituzione_sanitaria'
  -- b) dopo la denormalizzazione, prima del RETURN:
  --    IF p_prescrizione IS NOT NULL THEN
  --      INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, contenuto, numero_prescrizione)
  --      VALUES (p_lab, v_id,
  --              COALESCE(p_prescrizione->'contenuto', '{}'::jsonb),
  --              p_prescrizione->>'numero_prescrizione');
  --    END IF;
$$;

-- 2) allega_fonte: UPSERT sulla riga del lavoro (i lavori nati prima non hanno
--    la riga: ON CONFLICT (lavoro_id) DO UPDATE). Guardie in ordine:
--    lock lavoro (FOR UPDATE, tenant) → 'non_trovato';
--    fonte_tipo valido o NULL (IN lista) → 'fonte_tipo_non_valido';
--    se DdC attiva (stato <> 'annullata') E la riga ha già fonte_tipo/immagine/riferimento
--      → 'fonte_congelata' (V8: la fonte non si cancella né si sostituisce);
--    altrimenti scrive fonte_tipo/fonte_immagine_id/fonte_riferimento.
-- 3) correggi_typo: gettone p_atteso_updated_at (modello lavoro_denti_sostituisci_atomica:61-63)
--    → 'conflitto'; DdC attiva → 'congelata' (V8); riga assente → 'senza_prescrizione';
--    p_campo IN ('elementi','colore','tipo') → altrimenti 'campo_non_valido';
--    contenuto = jsonb_set(contenuto, ARRAY[p_campo], p_valore). Il valore NULL
--    jsonb ('null') RIMUOVE la chiave (contenuto - p_campo): "non era sulla prescrizione".
-- 4) registra_divergenza: DdC attiva → 'congelata'; riga assente → 'senza_prescrizione';
--    p_motivo IN ('richiesta_dentista','esigenza_tecnica','materiale_non_disponibile','altro')
--      → altrimenti 'motivo_non_valido' (D212);
--    divergenze = divergenze || jsonb_build_object('campo',p_campo,'motivo',p_motivo,
--      'nota',p_nota,'utente_id',p_utente,'registrata_at',now());
-- 5) conferma_consegna: riga assente → 'senza_prescrizione'; DdC attiva → 'congelata';
--    scrive confermata_da=p_utente, confermata_at=now() E
--    contenuto = jsonb_set(contenuto, '{tipo}', to_jsonb(v_tipo_dispositivo))
--    (D213: il TIPO entra nello snapshot alla conferma, dalla riga viva di lavori).
-- 6) crea_rifacimento_atomico: CREATE OR REPLACE (STESSA firma) — corpo vigente
--    (20260728103000:78-215) con l'innesto FRA il clone denti e il registro:
--      INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, contenuto,
--        fonte_tipo, fonte_immagine_id, fonte_riferimento, numero_prescrizione)
--      SELECT laboratorio_id, v_nuovo_id, contenuto, fonte_tipo, fonte_immagine_id,
--             fonte_riferimento, numero_prescrizione
--        FROM lavori_prescrizioni
--       WHERE lavoro_id = p_lavoro_originale_id AND laboratorio_id = v_lavoro.laboratorio_id;
--    (divergenze e conferma NON si clonano: default '[]' e NULL.)
```

- [ ] **Step 3.2** Applicare: `npx supabase db push`. Expected: `Finished`.
- [ ] **Step 3.3** Scrivere ed eseguire `scripts/tmp/collaudo-lp-rpc.mjs` (pattern `sonda-lp-r-p1.mjs`: BEGIN → casi → ROLLBACK, dati veri di test). Casi MINIMI, ciascuno con l'esito atteso asserito e contato (R-P4 applicato al collaudo — le forme d'input enumerate):
  1. `lavoro_crea_atomico` a 4 argomenti con `p_prescrizione` `{contenuto:{elementi:[11],colore:"a3 chiaro"},numero_prescrizione:"RX-77"}` → riga in `lavori_prescrizioni` con contenuto FEDELE (minuscole preservate);
  2. stessa RPC a 3 argomenti (default) → lavoro creato, NESSUNA riga snapshot;
  3. `allega_fonte` su lavoro senza riga → UPSERT crea la riga; `fonte_tipo='pippo'` → `'fonte_tipo_non_valido'`; senza corpo → errore CHECK 23514 (fonte_ck);
  4. `correggi_typo` con gettone stantio → `'conflitto'`; con valore `'null'` → chiave rimossa;
  5. `registra_divergenza` con motivo `'pippo'` → `'motivo_non_valido'`; valido → array cresce di 1 con `utente_id` e `registrata_at`;
  6. simulare DdC attiva (INSERT DdC minima in transazione) → `correggi_typo`/`registra_divergenza`/`conferma_consegna` → `'congelata'`; `allega_fonte` su riga con fonte → `'fonte_congelata'`;
  7. `conferma_consegna` valida → `confermata_da/at` scritti E `contenuto->>'tipo'` = tipo del lavoro;
  8. `crea_rifacimento_atomico` su lavoro con snapshot+fonte+divergenze → il nuovo lavoro ha snapshot e fonte clonati, `divergenze='[]'`, conferma NULL;
  9. `SELECT count(*) FROM pg_proc WHERE proname='lavoro_crea_atomico'` → **1**.
  Expected: tutti ✅, e il conteggio dei casi verdi stampato (`N su N`).
- [ ] **Step 3.4** Commit: `git commit -m "feat(db): RPC prescrizione (crea/fonte/typo/divergenza/conferma V5) + clone nel rifacimento (ondata B ②)"`.

## Task 4 — Migration C: chiusura `ddc_laboratorio_update`

**Files:**
- Create: `supabase/migrations/<TS3>_ondata_b_ddc_chiusura_update.sql`

`provato:` S9 (prima=1, dopo=0) + censimento A.1 (zero `.update()` applicativi; l'annullo passa
da `annulla_consegna_atomica` SECURITY DEFINER, che non è toccato dalle policy).

- [ ] **Step 4.1** Scrivere la migration:

```sql
-- <TS3>_ondata_b_ddc_chiusura_update.sql — Ondata B, sessione ②, parte 3/3.
-- L'immutabilità della DdC era una CONVENZIONE (policy UPDATE tenant piena,
-- schema.sql:1292-1294): da oggi è struttura. Modello: il cancello DPA
-- (20260804120000:30-34). Censimento 04/08: NESSUN .update() applicativo su
-- dichiarazioni_conformita in src/ — l'unico UPDATE legittimo è dentro
-- annulla_consegna_atomica (SECURITY DEFINER: le policy non la toccano).
-- Rollback: CREATE POLICY inversa (spec §7) — il testo esatto è in schema.sql
-- alla versione precedente di questo commit.
DROP POLICY "ddc_laboratorio_update" ON dichiarazioni_conformita;
```

- [ ] **Step 4.2** Applicare: `npx supabase db push`. Expected: `Finished`.
- [ ] **Step 4.3** Verifica del rifiuto sul VIVO (il valore che DEVE essere rifiutato):
`node scripts/tmp/sql.mjs "SELECT policyname FROM pg_policies WHERE tablename='dichiarazioni_conformita' ORDER BY policyname"` → SOLO `ddc_laboratorio_insert` e `ddc_laboratorio_select`;
poi rieseguire la parte S9 della sonda SENZA il DROP (UPDATE come `authenticated` su una DdC del proprio lab) → **0 righe**.
E il giro d'annullo resta vivo: `node scripts/tmp/sql.mjs "SELECT prosecdef FROM pg_proc WHERE proname='annulla_consegna_atomica'"` → `true`.
- [ ] **Step 4.4** Commit: `git commit -m "feat(db): immutabilita DdC — chiusa la policy ddc_laboratorio_update (ondata B ②, V8)"`.

## Task 5 — Server: composizione snapshot + POST/PATCH (TDD)

**Files:**
- Create: `src/lib/prescrizione/componi-snapshot.ts` (funzione pura)
- Test: `tests/unit/componi-snapshot.test.ts`
- Modify: `src/app/api/lavori/route.ts` (POST: ~riga 233, blocco `p_lavoro`/chiamata RPC)
- Test: il file di test esistente della route POST (censirlo: `grep -rl "api/lavori/route" tests/unit/`)
- Modify: `src/app/api/lavori/[id]/route.ts:178-213` (allowlist) e `:54-63` (commento-ragioni)
- Modify: `src/types/domain.ts` (tipo `LavoroPrescrizione` + `Lavoro.istituzione_sanitaria`)

**Interfaces (produce):**
```typescript
// src/lib/prescrizione/componi-snapshot.ts
export interface PrescrizioneInput {
  colore?: string          // testo COME DIGITATO dall'addetta (D210) — mai normalizzato qui
  numero_prescrizione?: string
}
export interface DentiInput { fdi: number; provenienza?: string }
// Ritorna il jsonb per p_prescrizione, o null se non c'è NULLA di prescritto (V2).
export function componiSnapshot(denti: DentiInput[], p?: PrescrizioneInput):
  { contenuto: Record<string, unknown>; numero_prescrizione: string | null } | null
```

- [ ] **Step 5.1** Test RED di `componiSnapshot` — forme d'input enumerate (R-P4): denti vuoti+niente → `null`; denti [11,12] → `{contenuto:{elementi:[11,12]}}`; colore `" a3 "` → PRESERVATO ESATTO (`" a3 "`, con spazi: fedeltà D210); colore assente → chiave assente (V2, MAI `colore:null`); solo numero → contenuto `{}` con numero; denti con `provenienza:'eseguito'` → ESCLUSI dagli elementi (solo i prescritti entrano, W20); `tipo` MAI presente (entra in conferma, D213). Run: `npx vitest run tests/unit/componi-snapshot.test.ts` → Expected: FAIL (modulo non trovato).
- [ ] **Step 5.2** R-P4: abbozzo inerte (`return null`) → contare le asserzioni che si accendono, scrivere `N su M` nel report del task.
- [ ] **Step 5.3** Implementare `componiSnapshot` (pura, ~20 righe). Run → Expected: PASS.
- [ ] **Step 5.4** POST `route.ts`: accettare `body.istituzione_sanitaria` (→ `p_lavoro`) e `body.prescrizione` (`PrescrizioneInput`); comporre `p_prescrizione = componiSnapshot(denti, body.prescrizione)` e passarlo alla RPC SOLO se non null. Il client non manda MAI testo MDR composto (V3): manda dati, il server compone. Test: body senza campi nuovi → chiamata RPC identica a oggi (retro-compatibilità); body con prescrizione → `p_prescrizione` presente e fedele.
- [ ] **Step 5.5** PATCH: `'istituzione_sanitaria'` in `PATCHABLE_FIELDS` (dopo `'richiedente_nome'`, r.181) + commento 54-63 aggiornato: `numero_prescrizione` esce dall'elenco «senza ragione» e riceve la sua — «vive su lavori_prescrizioni, scrittura via RPC dedicate (ondata B, spec §3)». Test: PATCH con `istituzione_sanitaria` → salvata; con `numero_prescrizione` → ancora scartata.
- [ ] **Step 5.6** `domain.ts`: `istituzione_sanitaria: string | null` su `Lavoro` (dopo r.275) + interfaccia `LavoroPrescrizione` (rispecchia la tabella).
- [ ] **Step 5.7** Run mirato dei test toccati → PASS. Commit: `git commit -m "feat(lavori): snapshot prescrizione server-side nel POST + istituzione_sanitaria patchabile (ondata B ②, V3)"`.

## Task 6 — FASE 6b: gate migration

- [ ] **Step 6.1** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` — rimuovere l'eventuale coda CLI dal fondo del file.
- [ ] **Step 6.2** `npx tsc --noEmit` → Expected: 0 errori (o SOLO errori attesi da tipi nuovi, da sanare subito).
- [ ] **Step 6.3** Verifica RLS complessiva (sola lettura): `node scripts/tmp/sql.mjs "SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('lavori_prescrizioni','dichiarazioni_conformita','lavori','lavori_immagini','lavori_denti') ORDER BY tablename, policyname"` → nessuna policy sparita fuori mandato; su DdC niente UPDATE; su lavori_prescrizioni solo SELECT.
- [ ] **Step 6.4** Commit types: `git commit -m "chore(types): gen types dopo le migration ondata B ②"`.

## Task 7 — Igiene dichiarata (spec §3 + §3-bis n.4)

**Files:**
- Modify: `supabase/schema.sql:878, :903, :919` (Allegato IV → XIII) — la `:1189` NON si tocca (già corretta)
- Modify: `supabase/schema.sql:1265-1266` (CHECK stato + `'annullata'`), `:1275` (commento vero: la UNIQUE è sul numero; il vincolo per-lavoro è `ddc_lavoro_attiva_unique`, parziale, in `20260710090000`), dopo `:1302` (fotografare l'indice parziale)
- Modify: `src/types/domain.ts:574` (union + `'annullata'`)
- Modify: `tests/unit/generate-ddc.test.ts:190-196` (commento conteggio: «6 in archivio al 04/08/2026 — 2 `generata` di era pre-v1, 4 `annullata` di cui 3 con ddc-v1»; citare `scripts/tmp/verifica-conteggio-ddc.ts`)
- La sezione DdC di `schema.sql` fotografa anche l'assenza della policy UPDATE (righe 1292-1294 sostituite da un commento che rimanda alla migration di chiusura)

- [ ] **Step 7.1** Applicare le correzioni (testuali, nessuna migration: schema.sql è la fotografia).
- [ ] **Step 7.2** `npx tsc --noEmit` + `npx vitest run tests/unit/generate-ddc.test.ts` → PASS.
- [ ] **Step 7.3** Commit: `git commit -m "docs(schema): fotografia DdC allineata (Allegato XIII, stato annullata, indice parziale) + union domain (ondata B ②)"`.

## Task 8 — FASE 7: verifica

- [ ] **Step 8.1** `npm run verify:fast` → incollare l'output vero (tsc 0 · vitest N passate · build ok). Il numero della guardia coerenza SI LEGGE (P32).
- [ ] **Step 8.2** Se tutto verde: la sessione decide con Francesco per merge/push (D215 ha il suo protocollo; NON si pubblica senza autorizzazione).

---

## Note VINCOLANTI per le sessioni ③ e ④ (dalla review finale di ramo, 04/08/2026)

La ② è stata eseguita (9 commit, `3fc71e70..16f71ab5`, review finale: Ready to merge). La ③ e la
④ partono cieche: queste note sono parte del contratto.

**Per la ③ (wizard + scheda):**
1. **La via «trascrivo a posteriori» passa OBBLIGATORIAMENTE da `allega_fonte` prima del typo:**
   solo `allega_fonte` fa UPSERT; `correggi_typo`/`registra_divergenza`/`conferma_consegna`
   rispondono `'senza_prescrizione'` su riga assente. Per un lavoro legacy: prima `allega_fonte`
   (crea la riga, contenuto `{}`), poi `correggi_typo` crea le chiavi.
2. **M-T3-1 esteso:** la guardia su `p_campo` di `registra_divergenza` va anche NELLA RPC
   (CREATE OR REPLACE stessa firma), non solo nella route — oggi il campo è un dizionario APERTO
   (qualsiasi testo passa), mentre `correggi_typo` valida `IN ('elementi','colore','tipo')`.
   L'asimmetria non deve arrivare alla ④ (le divergenze si stampano sulla DdC).
3. **La route del gesto deve rendere la rimozione un atto dichiarato** (M-T3-3): jsonb `'null'`
   esplicito = rimuovi la chiave; chiave assente = non toccare. `JSON.stringify` fa sparire gli
   `undefined`: mai derivare la rimozione da un default.
4. **FK dell'immagine-fonte** (`lavori_prescrizioni_fonte_img_fk`): quando una foto diventa
   fonte, la sua cancellazione da TabImmagini fallirà con 23503 SEMPRE (anche senza DdC attiva —
   più forte di V8). La route di cancellazione immagini deve gestire l'esito «fonte in uso».
5. **`allega_fonte` coi tre parametri fonte NULL crea una riga vuota** su lavoro senza riga: la
   route deve validare «almeno un corpo» prima di chiamare.
6. Chiavi ignote in `body.prescrizione` oggi scartate in silenzio (M-T5-2): quando il contratto
   del wizard si fissa, valutare il 422.
7. `domain.ts` sottodichiara `divergenze` (`unknown[]`): la forma è già fissata
   (`{campo, motivo, nota, utente_id, registrata_at}`) — tipizzarla in ③/④.

**Per la ④ (DdC a due righe + precheck):**
8. **`generate-ddc.ts:148` legge ancora `lavori.numero_prescrizione`, che ora non ha PIÙ nessuno
   scrittore:** il numero catturato dal wizard vive SOLO in `lavori_prescrizioni`. La ④ DEVE
   spostare quella lettura sulla tabella figlia, o la DdC stamperà `prescrizione_id` NULL per
   ogni lavoro nuovo.
9. L'ordine delle guardie non è uniforme fra le RPC (`conferma`: senza_prescrizione prima di
   congelata; `typo`/`divergenza`: viceversa): non dedurre l'ordine dagli esiti.
10. Fino alla ④ una DdC può ancora nascere senza fonte: V1 morde al precheck, che è ④ (buco di
    perimetro dichiarato, non un difetto della ②).

**Decisioni d'attuazione prese in ② da ratificare con Francesco** (nessun D-numero assegnato —
non sono scelte sue): gate sulla presenza della chiave `prescrizione` nel POST (i lavori del
wizard legacy non creano righe snapshot fino alla ③) · stringa vuota = assente per colore/numero
(M-T5-4) · retrocompat semantica del POST (M-T5-1) · adjudicazioni del controllore sui rilievi
dei task (nel ledger di sessione).

## Self-review (fatto in scrittura)

- Spec coverage ②: tabella §3 ✅ (Task 2) · RPC dedicate ✅ (Task 3) · clone rifacimento ✅ (3.6)
  · conferma V5 struttura+RPC ✅ (2, 3.5) · congelamento V8 ✅ (3.2-3.5, Task 4) · P37 colonne ✅
  (2, 5) · chiusura policy ✅ (4) · igiene Allegato IV ✅ (7) · FASE 6b ✅ (6). Fuori ②,
  dichiarato: UI wizard/scheda (③), precheck V1/V6/V7 e DdC a due righe (④), route dei gesti (③/④).
- Placeholder scan: i corpi RPC riassunti in commento nello scheletro 3.1 portano TUTTI i punti di
  legge (guardie, esiti, ordine); il collaudo 3.3 enumera gli esiti attesi caso per caso. Nessun «TBD».
- Coerenza nomi: `lavori_prescrizioni_*`, esiti json, `componiSnapshot` usati identici nei task 2/3/5.
