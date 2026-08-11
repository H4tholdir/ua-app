# Task 3 — Migration B: le RPC della prescrizione — REPORT

**Esecutore:** sessione fresca, branch `ondata-b-sessione-2` (nessun worktree).
**Commit:** `18e60bb8` — `feat(db): RPC prescrizione (crea/fonte/typo/divergenza/conferma V5) + clone nel rifacimento (ondata B ②)`
**Data:** 04/08/2026 (timestamp migration letto dall'orologio: `date +%Y%m%d%H%M%S` → `20260804152403`, D155).

---

## 1. Cosa ho implementato

Migration `supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql` (522 righe), applicata al DB vivo:

1. **`lavoro_crea_atomico`** — `DROP FUNCTION public.lavoro_crea_atomico(uuid, jsonb, jsonb)` PRIMA del `CREATE` a 4 parametri (`p_prescrizione jsonb DEFAULT NULL`). Corpo IDENTICO al vigente (20260727120300:136-215) + due aggiunte marcate «⬇️ AGGIUNTA B②»: `istituzione_sanitaria` nell'INSERT su lavori (P37) e l'INSERT condizionale su `lavori_prescrizioni` dopo la denormalizzazione, prima del RETURN (D214).
2. **`lavoro_prescrizione_allega_fonte(uuid,uuid,text,uuid,text)`** — lock lavoro → `non_trovato`; dizionario fonte → `fonte_tipo_non_valido`; DdC attiva + fonte già presente → `fonte_congelata` (V8); UPSERT `ON CONFLICT (lavoro_id) DO UPDATE` (i lavori pre-ondata non hanno la riga). «Fonte senza corpo» la respinge il CHECK `fonte_ck` (23514, fail-loud).
3. **`lavoro_prescrizione_correggi_typo(uuid,uuid,text,jsonb,timestamptz)`** — lock → gettone (modello 20260727120300:61-63) → `conflitto` con updated_at corrente; DdC attiva → `congelata`; riga assente → `senza_prescrizione`; campo fuori da ('elementi','colore','tipo') → `campo_non_valido`; jsonb `'null'` rimuove la chiave (`contenuto - p_campo`), altrimenti `jsonb_set`.
4. **`lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid)`** — lock → congelata → senza_prescrizione → motivo fuori dizionario (D212) → `motivo_non_valido`; append `{campo, motivo, nota, utente_id, registrata_at}`.
5. **`lavoro_prescrizione_conferma_consegna(uuid,uuid,uuid)`** — lock → senza_prescrizione → congelata; scrive `confermata_da/confermata_at` E `contenuto = jsonb_set(contenuto,'{tipo}',to_jsonb(v_tipo))` con `v_tipo` dalla riga viva di `lavori.tipo_dispositivo` (D213).
6. **`crea_rifacimento_atomico`** — `CREATE OR REPLACE` (STESSA firma), corpo vigente (20260728103000:78-200) + innesto del clone FRA il clone di lavori_denti e l'INSERT su lavori_rifacimenti: contenuto+fonte(3 colonne)+numero_prescrizione; divergenze e conferma restano ai default ('[]' e NULL).

Tutte le funzioni: `SECURITY DEFINER SET search_path = public, pg_temp` + `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE TO service_role` per OGNI firma + `COMMENT ON FUNCTION`.

**Prova di fedeltà ai vigenti (fatta PRIMA di scrivere):** `pg_get_functiondef` dal catalogo vivo confrontato coi file migration — corpi identici (solo formattazione dell'header diversa). Dopo il push, diff codice (commenti esclusi) vecchio→nuovo: per `crea_rifacimento_atomico` l'UNICA differenza è l'innesto; per `lavoro_crea_atomico` le UNICHE differenze sono firma, istituzione_sanitaria (2 righe) e il blocco prescrizione. Output dei due diff incollati in §5.

## 2. Scelte fatte dove lo scheletro lasciava libertà (ESPLICITE)

1. **Il gettone di `correggi_typo` è `lavori.updated_at`** (letto dal `FOR UPDATE`), non l'updated_at della riga di lavori_prescrizioni: il brief cita il modello alle righe ESATTE 61-63, dove il confronto è sul valore restituito dal lock su `lavori`; ed è l'unico ordine implementabile così com'è scritto nel brief (gettone PRIMA di `senza_prescrizione`: il gettone di una riga assente non esisterebbe). Conseguenza coerente col modello: **a fine funzione il gettone avanza** (`UPDATE lavori SET updated_at = now()` esplicito, stessa ragione del commento 20260727120300:108-114), e l'esito ok restituisce il nuovo `updated_at`.
2. **`p_valore` SQL NULL trattato come jsonb `'null'`** (rimozione): `jsonb_set` con new_value SQL NULL restituisce NULL e annienterebbe l'INTERO contenuto → 23502. Un typo non può costare la trascrizione.
3. **`p_campo`/`p_motivo` NULL → esito non-valido** (un `NOT IN` con NULL non morde da solo).
4. **Ordine guardie** = quello letterale dei commenti del brief: correggi_typo lock→gettone→congelata→senza_prescrizione→campo; conferma lock→senza_prescrizione→congelata; divergenza lock→congelata→senza_prescrizione→motivo.
5. **«DdC attiva» = `stato <> 'annullata'` senza filtro su deleted_at** — stessa definizione dell'indice `ddc_lavoro_attiva_unique` (20260710090000:16-17) e del guard generate-ddc.ts:102.
6. **Riconferma**: sovrascrive (ultima conferma vince) finché non c'è DdC attiva; `p_utente` NULL abortisce col CHECK `conferma_ck` (fail-loud, nessuna conferma anonima).
7. **Esiti ok arricchiti**: correggi_typo → `updated_at` nuovo; divergenza → conteggio elementi; conferma → `confermata_at`; allega_fonte → solo esito.
8. **`DO UPDATE ... WHERE lavori_prescrizioni.laboratorio_id = p_lab`**: cintura e bretelle sul tenant (la FK composita + il lock lo garantiscono già).
9. **Collaudo**: `tipo_dispositivo='protesi_fissa'` (il CHECK `lavori_tipo_dispositivo_check` respinge 'corona' — scoperto al primo giro, 23514); i gettoni viaggiano come TESTO (`updated_at::text` → `::timestamptz`) per non perdere i microsecondi nel round-trip di node-pg.

## 3. Output REALE del push (Step 3.2)

```
Initialising login role...
Connecting to remote database...
Skipping migration MANUAL_000_auth_helpers.sql... (file name must match pattern "<timestamp>_name.sql")
Applying migration 20260804152403_ondata_b_prescrizioni_rpc.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260804152403_ondata_b_prescrizioni_rpc.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

## 4. Output REALE del collaudo (Step 3.3 — `node scripts/tmp/collaudo-lp-rpc.mjs`)

```
✅ Caso 1 — crea a 4 argomenti + snapshot fedele: esito=ok; contenuto={"colore":"a3 chiaro","elementi":[11]} (minuscole preservate); numero=RX-77; istituzione_sanitaria scritta
✅ Caso 2 — crea a 3 argomenti, nessuna riga snapshot: esito=ok; righe snapshot=0 (atteso 0: il default risolve la chiamata vecchia)
✅ Caso 3 — allega_fonte: UPSERT, tipo non valido, fonte senza corpo: UPSERT=ok (riga creata: email); pippo=fonte_tipo_non_valido; senza corpo=23514 lavori_prescrizioni_fonte_ck new row for relation "lavori_prescrizioni" violates che
✅ Caso 4 — correggi_typo: conflitto su gettone stantio, null rimuove: stantio=conflitto (updated_at corrente restituito); null=ok; contenuto dopo={"elementi":[11]} (chiave colore rimossa)
✅ Caso 5 — registra_divergenza: motivo non valido, poi appesa con chi/quando: pippo=motivo_non_valido; valido=ok; array=1 elemento con utente_id e registrata_at=2026-08-04T13:29:27
✅ Caso 6 — DdC attiva: congelata (typo, divergenza, conferma) + fonte_congelata: fonte pre-DdC=ok; typo=congelata; divergenza=congelata; conferma=congelata; fonte post-DdC=fonte_congelata
✅ Caso 7 — conferma_consegna valida: esito=ok; confermata_da=utente, confermata_at scritti; contenuto->>'tipo'=protesi_fissa (= lavori.tipo_dispositivo, D213)
✅ Caso 8 — rifacimento: clona contenuto+fonte+numero, azzera divergenze e conferma: nuovo=7d1b052c…; contenuto clonato={"elementi":[11]}; fonte=foglio/foglio in cassetta; numero=RX-77; divergenze=[]; conferma NULL
✅ Caso 9 — pg_proc conta 1 sola lavoro_crea_atomico: count=1 (atteso 1: niente overload)

── DOPO IL ROLLBACK: lavori di collaudo residui = 0 (atteso 0)

═══ COLLAUDO: 9 su 9 casi verdi ═══
```

Pattern: BEGIN → casi (SAVEPOINT per i fallimenti attesi) → ROLLBACK; dati veri di test; RPC chiamate via `SELECT public.<rpc>(...)` dalla connessione diretta. Il caso 6 inserisce una DdC minima in transazione (14 colonne NOT NULL senza default, `stato` default 'bozza' = attiva, `progressivo_ddc` 999999 per non urtare l'unique).

## 5. Verifica GRANT/SECURITY DEFINER post-push

Query (nel collaudo, DOPO il rollback — la connessione diretta bypassa i GRANT, quindi si leggono dal catalogo): `pg_proc` + `LEFT JOIN LATERAL aclexplode(proacl)`, filtrando `privilege_type='EXECUTE'`. Output reale:

```
✅ crea_rifacimento_atomico(uuid,text,text,numeric,text) · SECURITY DEFINER=true · proconfig=["search_path=public, pg_temp"] · EXECUTE=postgres, service_role
✅ lavoro_crea_atomico(uuid,jsonb,jsonb,jsonb) · SECURITY DEFINER=true · proconfig=["search_path=public, pg_temp"] · EXECUTE=postgres, service_role
✅ lavoro_prescrizione_allega_fonte(uuid,uuid,text,uuid,text) · SECURITY DEFINER=true · proconfig=["search_path=public, pg_temp"] · EXECUTE=postgres, service_role
✅ lavoro_prescrizione_conferma_consegna(uuid,uuid,uuid) · SECURITY DEFINER=true · proconfig=["search_path=public, pg_temp"] · EXECUTE=postgres, service_role
✅ lavoro_prescrizione_correggi_typo(uuid,uuid,text,jsonb,timestamp with time zone) · SECURITY DEFINER=true · proconfig=["search_path=public, pg_temp"] · EXECUTE=postgres, service_role
✅ lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid) · SECURITY DEFINER=true · proconfig=["search_path=public, pg_temp"] · EXECUTE=postgres, service_role
Permessi: tutti corretti (solo owner + service_role, mai PUBLIC/anon/authenticated)
```

Diff codice vecchio→nuovo dal catalogo (commenti esclusi) — rifacimento, UNICA differenza:

```
64a65,73
>   INSERT INTO lavori_prescrizioni (
>     laboratorio_id, lavoro_id, contenuto,
>     fonte_tipo, fonte_immagine_id, fonte_riferimento, numero_prescrizione
>   )
>   SELECT laboratorio_id, v_nuovo_id, contenuto,
>          fonte_tipo, fonte_immagine_id, fonte_riferimento, numero_prescrizione
>     FROM lavori_prescrizioni
>    WHERE lavoro_id = p_lavoro_originale_id
>      AND laboratorio_id = v_lavoro.laboratorio_id;
```

— e `lavoro_crea_atomico`, SOLE differenze: firma a 4 parametri, `istituzione_sanitaria` (colonna+valore) e il blocco `IF p_prescrizione IS NOT NULL THEN INSERT ... END IF;`.

## 6. File cambiati

- `supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql` — CREATO, committato (`18e60bb8`), applicato.
- `scripts/tmp/collaudo-lp-rpc.mjs` — CREATO, usa-e-getta. **Verificato con git:** `scripts/tmp/` è in `.gitignore` (riga 136, `git check-ignore` conferma) e `git ls-files scripts/tmp/` è vuoto → NON tracciato, come previsto.

## 7. Self-review findings

- I due diff dal catalogo (§5) provano che i corpi vigenti sono stati ripresi alla lettera: nessuna modifica fuori dalle aggiunte mandate.
- Tenant imposto in ogni WHERE delle funzioni nuove (lock, EXISTS DdC, EXISTS riga, UPDATE, UPSERT). `crea_rifacimento_atomico` mantiene il suo perimetro originario (nessun p_lab in firma — invariato, fuori mandato cambiarlo).
- Apostrofi raddoppiati ('') nelle stringhe dei COMMENT; lettere accentate mai toccate.
- Il collaudo al primo giro è caduto su `lavori_tipo_dispositivo_check` ('corona' non è nel dizionario): corretto il DATO del collaudo ('protesi_fissa'), non il codice — il CHECK che morde è il comportamento giusto.
- Dove ho cercato l'errore del piano (mandato esplicito): confrontate firme/colonne/nomi dello scheletro con le definizioni vigenti e col catalogo vivo — nessuna contraddizione trovata. L'ordine delle guardie del punto 3 del brief (gettone prima di `senza_prescrizione`) è implementabile SOLO col gettone su `lavori.updated_at`: l'ho preso come conferma della lettura, non come errore (v. §2.1).

## 8. Difetti fuori mandato (R-E2 — riferiti, NON corretti)

1. **`crea_rifacimento_atomico` non copia `lavori.istituzione_sanitaria` sul lavoro nuovo.** La colonna (P37, nata nel Task 2) non è nell'elenco colonne dell'INSERT su `lavori` del corpo vigente, e l'innesto prescritto dal brief riguarda solo `lavori_prescrizioni`. Un rifacimento nasce dallo stesso prescrittore/istituzione: il lavoro clonato perde la seconda casella dell'Allegato XIII p.1 mentre lo snapshot della prescrizione viaggia. Da valutare se aggiungerla al clone (una coppia di righe nella stessa funzione).
2. **`src/types/database.types.ts` è ora stantio rispetto al DB**: descrive ancora `lavoro_crea_atomico` a 3 argomenti e non conosce le 4 RPC nuove. La FASE 6b (gen types + `tsc --noEmit`) non era fra gli step del brief (3.1-3.4) — presumo appartenga al task della route (parte 3/3); va fatta prima del merge in ogni caso.
3. **Pre-esistente, già noto**: `supabase/schema.sql:1266` mostra il CHECK di `dichiarazioni_conformita.stato` SENZA 'annullata' (il vivo ce l'ha, da 20260710090000) — il dump non è aggiornato; nessuna azione presa.
