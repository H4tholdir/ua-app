# RESOCONTO — Task B, «Correggi e rifai la dichiarazione» (atto unico)

**Esecutore:** sessione dedicata al solo Task B (R-E1) · **Data:** 08/08/2026
**Ramo:** `intervento-post-consegna` · **Migration:** `supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql`
**Stato:** applicata al banco, FASE 6b fatta, 9 sonde su 9 al verde (una di esse è nata rossa e ha
trovato un difetto **mio**).

---

## 0. In tre righe

Costruiti l'indice `ddc_evento_annulla_unique` e la RPC `correggi_e_riemetti_atomica`, che in una
transazione sola annulla la dichiarazione viva, corregge le otto voci stampate **nei tre depositi
diversi in cui vivono**, e inserisce la nuova. Nove sonde, tutte su transazione annullata con la
fixture costruita dentro. **Il difetto più grosso trovato è nel mio codice**, e l'ha trovato una sonda
che il brief non chiedeva.

---

## 1. Passo 0 — che cosa ho letto, e che cosa ci ho trovato

| file / oggetto | trovato |
|---|---|
| `scripts/tmp/riemetti-vivo.txt` (rifatto con `pg_get_functiondef`) | il modello: guardia `evento_non_valido`, «viva» = `stato <> 'annullata'` (mai un elenco di stati), fail-closed `GET DIAGNOSTICS … IF v_rows <> 1 THEN RAISE`, il controllo R-P6 sulle chiavi, i sei campi azzerati a mano sulla nuova |
| `supabase/migrations/20260807143623_riemissione_ddc.sql` | la migration che l'ha creata: `sostituisce_id` + `annullata_da_evento_id`, `ddc_sostituisce_unique`, e la nota che **tre percorsi** portano una dichiarazione ad `annullata` ma **solo due** scrivono la causale |
| `supabase/migrations/20260727120300_lavori_denti_rpc.sql` (letto **dal catalogo vivo**) | la penna dei denti: `DELETE` + `INSERT` su `lavori_denti`, poi la **denormalizzazione obbligatoria** su `lavori.denti_coinvolti`/`denti_mancanti`/`denti_impianti`, con l'elenco dei tre lettori vivi che stamperebbero zero denti se divergesse |
| `supabase/migrations/20260807180314_*.sql:46` | il modello dell'indice unico parziale (`rifacimento_evento_unique`), col censimento delle righe esistenti fatto **prima** di crearlo |
| `lavoro_prescrizione_correggi_typo` (catalogo vivo) | la guardia `congelata`, i tre soli campi ammessi, e il fatto che il gettone si confronta **su `lavori`** |
| `src/lib/prescrizione/caratteristiche-prescritte.ts:73-120` | 🔴 la voce 6 stampata legge **solo `elementi` e `colore`** — `tipo` è escluso apposta (D213). Vedi §5, difetto ⑦ |

**Estrazione del modello vivo, comando reale:**
```
node scripts/tmp/dump-def.mjs "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n
  ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='riemetti_ddc_atomica'"
```
⚠️ `node scripts/psql.mjs -c "SELECT pg_get_functiondef(…)"` **non serve a questo scopo**: stampa con
`console.table`, e un corpo di funzione multi-riga esce illeggibile. Ho scritto un attrezzo usa-e-getta
di dieci righe (`scripts/tmp/dump-def.mjs`) che stampa il valore grezzo. **Non è committato**
(`scripts/tmp/` è ignorato): chi ripete la misura lo riscrive, oppure usa `psql` vero.

**Censimento di partenza, misurato:**
```
correggi_e_riemetti_atomica → NON esiste
ddc_evento_annulla_unique   → NON esiste
lavoro_denti_sostituisci_atomica  | prosecdef=true | postgres=X/postgres | service_role=X/postgres
lavoro_prescrizione_correggi_typo | prosecdef=true | postgres=X/postgres | service_role=X/postgres
riemetti_ddc_atomica              | prosecdef=true | postgres=X/postgres | service_role=X/postgres
owner di tutt'e tre: postgres
```

---

## 2. Che cosa ho costruito

### ① `ddc_evento_annulla_unique`
```sql
CREATE UNIQUE INDEX IF NOT EXISTS ddc_evento_annulla_unique
  ON public.dichiarazioni_conformita (laboratorio_id, annullata_da_evento_id)
  WHERE annullata_da_evento_id IS NOT NULL;
```
Riletto dal catalogo dopo il push (§4).

### ② `correggi_e_riemetti_atomica(p_lavoro_id, p_laboratorio_id, p_evento_id, p_correzioni, p_nuova, p_atteso_updated_at)`

**L'ordine, che è il compito:**
① lock `FOR UPDATE` sul lavoro (è anche il controllo di appartenenza) · ② gettone · ③ evento valido ·
④ paziente dello stesso laboratorio · ⑤ prescrizione presente se la si vuole correggere ·
⑥ dichiarazione viva → **da qui in poi si scrive** → ⑦ **annullo** con `annullata_da_evento_id` ·
⑧ le sei voci su `lavori` · ⑨ `lavoro_denti_sostituisci_atomica` · ⑩ `lavoro_prescrizione_correggi_typo`,
una chiamata per sotto-chiave · ⑪ `INSERT` della nuova con `sostituisce_id`.

**Le quattro decisioni che reggono il tutto, e perché:**

1. **Non chiama `riemetti_ddc_atomica`, ne ribatte il corpo.** Non è duplicazione gratuita: quella
   funzione fa annullo e inserimento nella stessa istruzione, e le correzioni devono passare **in
   mezzo**. Non si può spezzare, quindi non si può chiamare. La ragione sta scritta nel file, così che
   la prossima revisione non «unifichi» le due rompendo tutto.
2. **Dopo la prima scrittura non si torna con un `RETURN`, si alza.** Un `RETURN` con un esito di
   errore **non annulla** ciò che è già scritto: chiamata via PostgREST ogni `rpc()` è la sua
   transazione, e quel `RETURN` **committa**. Un annullo committato senza la nuova lascerebbe un
   lavoro consegnato **senza nessuna dichiarazione viva** — lo stato che nessun indice sa segnalare,
   perché «zero dichiarazioni» è legittimo per un lavoro mai consegnato. Tutti gli esiti gentili
   stanno **prima** dell'annullo. Provato dalla sonda 9.
3. **La risposta delle penne si cattura, non si `PERFORM`a.** Un `PERFORM` butterebbe il json, e
   `congelata`/`conflitto`/`campo_non_valido` diventerebbero un nulla di fatto **silenzioso** dentro
   una transazione che poi committa: l'utente leggerebbe «corretto» su un documento che non lo è. È lo
   scarto muto di `route.ts:259-264` rifatto dentro una RPC.
4. **La prova dell'atterraggio sta DENTRO la funzione.** L'allowlist e l'elenco del `SET` sono due
   scritture della stessa verità: se un domani si aggiunge un nome all'allowlist e si scorda la riga
   del `SET`, quel dato smetterebbe di salvarsi **in silenzio**. Dopo l'`UPDATE` la funzione confronta
   la riga **attesa** con quella **scritta**, chiave per chiave, e alza se qualcosa non è atterrato.

---

## 3. Le sonde — output reale incollato

🛑 Tutte in **transazione annullata**, con la fixture (lavoro clonato + denti + prescrizione +
dichiarazione viva + due eventi) costruita **dentro** la transazione. Una invocazione per sonda.
Sonde 1·1b·2·3·5·6·7·8 girano come **`service_role`**, la 4 come **`anon`** (vedi §5, difetto ④).

### 🔑 La riga della fixture senza la quale metà delle sonde sarebbe un falso verde
```
[11] SELECT — FIXTURE PRONTA
gettone_ingresso: 2026-08-08T08:39:30.386Z   adesso_transazione: 2026-08-08T09:39:30.386Z
```
Il lavoro nasce con `updated_at` **arretrato di un'ora** (sull'`INSERT` non c'è trigger). Senza,
gettone d'ingresso e gettone dopo la prima scrittura sarebbero **identici** e la catena non si
potrebbe misurare. Vedi §5, difetto ①.

### Sonda 1 — stesso `evento_id` due volte → `23505`
```
❌ 23505 duplicate key value violates unique constraint "ddc_evento_annulla_unique"
   dettaglio: Key (laboratorio_id, annullata_da_evento_id)=(971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c, f121f7d1-46fa-497c-b460-e6740f461f78) already exists.
```

### Sonda 1b — controprova: con un evento **diverso** il secondo giro passa
Senza questa, la sonda 1 proverebbe solo che «qualcosa esplode», non che a fermare sia il **riuso
dell'evento**.
```
primo_invio:   {"esito":"ok","nuova_id":"7643e673-…","vecchia_id":"bbbfc645-…","numero":"SONDA-2099-0002","numero_superato":"SONDA-2099-0001","updated_at":"2026-08-08T09:40:43.342755+00:00"}
secondo_invio: {"esito":"ok","nuova_id":"0a7f3514-…","vecchia_id":"7643e673-…","numero":"SONDA-2099-0003","numero_superato":"SONDA-2099-0002","updated_at":"2026-08-08T09:40:43.342755+00:00"}
dichiarazioni_totali: 3 | vive: 1 | descrizione_finale: 'SECONDO invio, altro evento'
```

### Sonda 2 — `p_atteso_updated_at` sbagliato → `conflitto`, e niente si muove
```
esito: {"esito" : "conflitto", "updated_at" : "2026-08-08T08:41:43.089602+00:00"}
b1_lavoro_intatto: true | b2_vecchia_ancora_viva: true | b3_nessuna_nuova: true | b4_nessuna_causale: true
```

### Sonda 3 — chiave fuori dalle otto → rifiutata
Chiave scelta: **`stato`**, non `pippo`. `stato` **è** una colonna vera di `lavori`: il controllo del
*modello* («è una colonna della tabella?») l'avrebbe **accettata**. Questa sonda prova che qui
l'allowlist è l'elenco delle **otto voci stampate**, non «i campi di `lavori`».
```
❌ P0001 atto unico: chiavi che non sono voci correggibili del documento: {stato} (ammesse: {richiedente_nome,paziente_id,paziente_nome_snapshot,numero_prescrizione,tipo_dispositivo,descrizione,denti_coinvolti,prescrizione_caratteristiche})
```

### Sonda 4 — chiamata con la chiave pubblica (`anon`) → `42501`
```
❌ 42501 permission denied for function correggi_e_riemetti_atomica
```

### Sonda 5 — P12: la chiamata annidata funziona **davvero**, e come `service_role`
```
chi_chiama: 'service_role'
esito: {"esito":"ok","nuova_id":"7a4d4423-…","vecchia_id":"02925f1b-…","numero":"SONDA-2099-0002","numero_superato":"SONDA-2099-0001","updated_at":"2026-08-08T09:42:05.805052+00:00"}
c1_denti_tabella: true | c2_denorm_solo_elementi: true | c3_denorm_mancanti: true
c4_prescr_colore: true | c5_prescr_intatta: true | c6_lavori_non_toccato: true
```
🔑 `c2`/`c3` provano che la penna **ha fatto il suo mestiere**: `fdi 36` (elemento) finisce in
`denti_coinvolti`, `fdi 37` (mancante) in `denti_mancanti`. Un `UPDATE` gemello scritto a mano avrebbe
messo tutti e due nello stesso posto.

### Sonda 6 — IL GIRO BUONO, con l'atterraggio letto **una voce per volta**
Eseguita **due volte**: dentro la transazione prima del push, e di nuovo contro la **funzione viva**
dopo il push (stesso esito). Vedi §3-bis per le tre rieseguite dopo il push.
```
esito: {"esito":"ok","nuova_id":"2243734a-ed9b-4dba-8aee-70f57c5da783","vecchia_id":"881e20d9-3d9e-4e21-9003-e22c32b899da","numero":"SONDA-2099-0002","numero_superato":"SONDA-2099-0001","updated_at":"2026-08-08T09:39:46.626207+00:00"}

a01_richiedente_nome        true   ← lavori.richiedente_nome
a02_paziente_id             true   ← lavori.paziente_id
a03_paziente_nome_snapshot  true   ← lavori.paziente_nome_snapshot
a04_numero_prescrizione     true   ← lavori.numero_prescrizione
a05_tipo_dispositivo        true   ← lavori.tipo_dispositivo
a06_descrizione             true   ← lavori.descrizione
a07_denti_tabella           true   ← lavori_denti (la FONTE)
a08_denti_denormalizzati    true   ← lavori.denti_coinvolti (la DENORMALIZZAZIONE che il documento stampa)
a09_prescr_colore           true   ← lavori_prescrizioni.contenuto->>'colore'
a10_prescr_elementi         true   ← lavori_prescrizioni.contenuto->'elementi'
a11_vecchia_annullata       true
a12_causale_scritta         true   ← annullata_da_evento_id (la riga che rende efficace l'indice)
a13_nuova_viva              true
a14_filo_sostituisce        true   ← sostituisce_id

verdi_su_14: 14
```

### Sonda 7 — `paziente_id` di un **altro laboratorio** → rifiutato, e niente scritto
```
esito: {"esito" : "paziente_non_valido"}
d1_paziente_intatto: true | d2_vecchia_ancora_viva: true | d3_nessuna_nuova: true
```

### 🔴 Sonda 8 — `denti_coinvolti` nella forma sbagliata — **È NATA ROSSA, E IL DIFETTO ERA MIO**

**Prima versione della guardia** (solo `jsonb_typeof(…) = 'array'`) — passava `["21","22"]`:
```
❌ 23502 null value in column "fdi" of relation "lavori_denti" violates not-null constraint
   dettaglio: Failing row contains (f5061758-…, 971061a1-…, 1855a0d0-…, null, elemento, null, null, null, null, null, null, null, prescritto, 2026-08-08 09:43:10.745445+00, …)
```
Fail-closed (niente resta scritto), **ma con un messaggio che parla di una tabella che il chiamante
non ha nominato** e che nasce due funzioni più in giù. Guardia rafforzata: si guarda anche **dentro**
l'array. **Dopo la correzione:**
```
❌ P0001 atto unico: denti_coinvolti porta il CARICO DELLA PENNA (oggetti {fdi, ruolo, …}), non il valore della colonna denormalizzata (ricevuto: ["21", "22"])
```

### 🔑 Sonda 9 — una penna che risponde «no» **dopo l'annullo** → l'annullo si disfa
La sonda più importante del gruppo, e **il brief non la chiedeva**. Prova due cose insieme: che la
risposta della penna non viene buttata via, e che l'errore **annulla anche l'annullo**.
```
nota: 'P0001 — atto unico: la penna della prescrizione ha risposto {"esito" : "campo_non_valido"} sul campo pippo'
e1_annullo_disfatto: true | e2_causale_disfatta: true | e3_lavoro_disfatto: true | e4_nessuna_nuova: true
```

---

## 3-bis. Le sonde rieseguite contro l'oggetto VIVO, dopo il push

⚠️ **Un rilievo che mi sono fatto e che vale la pena scrivere:** le sonde 1·1b·2·3·5·7·8·9 nascono
concatenando **il testo della migration** dentro la transazione, cioè provano una **copia** della
funzione e — per la sonda 1 — una **copia dell'indice**. La coppia «indice vivo + funzione viva» non
era stata provata **insieme** da nessuna parte. Rieseguite senza il testo della migration
(`00-fixture.sql` + corpo della sonda), contro ciò che sta davvero in banca dati:

**Sonda 1 (indice vivo + funzione viva):**
```
❌ 23505 duplicate key value violates unique constraint "ddc_evento_annulla_unique"
   dettaglio: Key (laboratorio_id, annullata_da_evento_id)=(971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c, e4958216-5cb5-458c-ad87-6bb8fd7ec2a6) already exists.
```
**Sonda 6:** `verdi_su_14: 14` (§3).
**Sonda 9:**
```
nota: 'P0001 — atto unico: la penna della prescrizione ha risposto {"esito" : "campo_non_valido"} sul campo pippo'
e1_annullo_disfatto: true | e2_causale_disfatta: true | e3_lavoro_disfatto: true | e4_nessuna_nuova: true
```

---

## 3-ter. La fixture e la sonda 6, **per intero** — perché `scripts/tmp/` sparisce

🔑 Le sonde vivono in `scripts/tmp/sonde-b/`, che **git ignora**: fra una sessione e l'altra non
esistono più. Chi scrive il **Task C** ha bisogno della forma delle asserzioni di atterraggio per
rifarle al livello della rotta, e le sole uscite incollate non bastano a ricostruirle. Quindi il
codice sta qui, ed è la copia che sopravvive.

<details><summary><b>fixture (<code>00-fixture.sql</code>)</b></summary>

```sql
BEGIN;

CREATE TEMP TABLE f ON COMMIT DROP AS
SELECT
  '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'::uuid AS lab,
  '314cd040-0893-4e9d-9ad8-786e4eefd75f'::uuid AS lab_altro,
  gen_random_uuid()                            AS lavoro,
  gen_random_uuid()                            AS evento,
  gen_random_uuid()                            AS evento2,
  gen_random_uuid()                            AS ddc,
  (SELECT id FROM lavori
    WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
      AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1)              AS src,
  (SELECT id FROM pazienti
    WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
    ORDER BY id LIMIT 1)                                                    AS paz_nuovo,
  (SELECT id FROM pazienti
    WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
    ORDER BY id OFFSET 1 LIMIT 1)                                           AS paz_vecchio,
  (SELECT id FROM pazienti
    WHERE laboratorio_id = '314cd040-0893-4e9d-9ad8-786e4eefd75f'
    ORDER BY id LIMIT 1)                                                    AS paz_altro_lab;

-- 🔑 `updated_at` ARRETRATO DI UN'ORA: sull'INSERT non c'è trigger, e dentro una
--    transazione now() è costante. Senza questo scarto la catena dei gettoni non
--    si può misurare e la sonda 6 è verde anche con la catena rotta.
INSERT INTO lavori
SELECT (jsonb_populate_record(l, jsonb_build_object(
  'id',                     (SELECT lavoro       FROM f),
  'anno_lavoro',            2099,
  'numero_lavoro',          'SONDA-B-001',
  'stato',                  'consegnato',
  'deleted_at',             NULL,
  'paziente_id',            (SELECT paz_vecchio  FROM f),
  'paziente_nome_snapshot', NULL,
  'richiedente_nome',       'VECCHIO Prescrittore',
  'numero_prescrizione',    'VECCHIA-PRESCR',
  'tipo_dispositivo',       'protesi_fissa',
  'descrizione',            'VECCHIA descrizione',
  'denti_coinvolti',        jsonb_build_array('11','12'),
  'denti_mancanti',         '[]'::jsonb,
  'denti_impianti',         '[]'::jsonb,
  'tinta_famiglia',         NULL,
  'tinta_codice',           NULL,
  'created_at',             now(),
  'updated_at',             now() - interval '1 hour'
))).*
FROM lavori l WHERE l.id = (SELECT src FROM f);

INSERT INTO lavori_denti (laboratorio_id, lavoro_id, fdi, ruolo)
SELECT f.lab, f.lavoro, v, 'elemento' FROM f, unnest(ARRAY[11,12]::smallint[]) AS v;

INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, contenuto)
SELECT f.lab, f.lavoro, '{"elementi":[11,12],"colore":"A2"}'::jsonb FROM f;

INSERT INTO dichiarazioni_conformita (
  id, laboratorio_id, lavoro_id, numero_ddc, anno_ddc, progressivo_ddc,
  fabbricante_nome, fabbricante_indirizzo, fabbricante_piva,
  prescrittore_nome, paziente_nome, tipo_dispositivo, descrizione_dispositivo,
  classe_rischio, testo_conformita, prrc_nome, stato)
SELECT f.ddc, f.lab, f.lavoro, 'SONDA-2099-0001', 2099, 999001,
       'Lab Sonda', 'Via Sonda 1', 'IT00000000000',
       'VECCHIO Prescrittore', 'VECCHIO Paziente', 'protesi_fissa',
       'VECCHIA descrizione', 'classe_iia', 'testo di prova', 'PRRC Sonda', 'generata'
FROM f;

INSERT INTO eventi_qualita (id, laboratorio_id, lavoro_id, motivo, natura,
  origine_informazione, conosciuto_il, stato_dispositivo)
SELECT f.evento, f.lab, f.lavoro, 'errore_dato_dichiarazione', 'dato_documentale',
       'laboratorio_interno', now(), 'consegnato_non_applicato' FROM f;
INSERT INTO eventi_qualita (id, laboratorio_id, lavoro_id, motivo, natura,
  origine_informazione, conosciuto_il, stato_dispositivo)
SELECT f.evento2, f.lab, f.lavoro, 'errore_dato_dichiarazione', 'dato_documentale',
       'laboratorio_interno', now(), 'consegnato_non_applicato' FROM f;

CREATE TEMP TABLE g ON COMMIT DROP AS
SELECT updated_at AS u0 FROM lavori WHERE id = (SELECT lavoro FROM f);

-- 🛑 Senza questo GRANT la sonda muore sul PROPRIO 42501 invece che su quello
--    che sta misurando: le tabelle d'appoggio sono di `postgres`.
GRANT SELECT ON f, g TO service_role;
```
</details>

<details><summary><b>sonda 6 — la chiamata e le 14 asserzioni di atterraggio</b></summary>

```sql
SET LOCAL ROLE service_role;

SELECT public.correggi_e_riemetti_atomica(
  f.lavoro, f.lab, f.evento,
  jsonb_build_object(
    'richiedente_nome',       'NUOVO Prescrittore',
    'paziente_id',            f.paz_nuovo,
    'paziente_nome_snapshot', 'NUOVO Paziente Snapshot',
    'numero_prescrizione',    'NUOVA-PRESCR-2026',
    'tipo_dispositivo',       'cad_cam',
    'descrizione',            'NUOVA descrizione',
    'denti_coinvolti',        jsonb_build_array(
                                jsonb_build_object('fdi', 21, 'ruolo', 'elemento'),
                                jsonb_build_object('fdi', 22, 'ruolo', 'elemento')),
    'prescrizione_caratteristiche', jsonb_build_object(
                                'colore', 'A3', 'elementi', jsonb_build_array(21, 22))
  ),
  jsonb_build_object(
    'numero_ddc',              'SONDA-2099-0002',
    'progressivo_ddc',         999002,
    'prescrittore_nome',       'NUOVO Prescrittore',
    'paziente_nome',           'NUOVO Paziente Snapshot',
    'tipo_dispositivo',        'cad_cam',
    'descrizione_dispositivo', 'NUOVA descrizione'),
  (SELECT u0 FROM g)
)::text AS esito
FROM f;

RESET ROLE;

SELECT
  COALESCE((SELECT richiedente_nome FROM lavori WHERE id = f.lavoro) = 'NUOVO Prescrittore', false)                      AS a01_richiedente_nome,
  COALESCE((SELECT paziente_id      FROM lavori WHERE id = f.lavoro) = f.paz_nuovo, false)                               AS a02_paziente_id,
  COALESCE((SELECT paziente_nome_snapshot FROM lavori WHERE id = f.lavoro) = 'NUOVO Paziente Snapshot', false)           AS a03_paziente_nome_snapshot,
  COALESCE((SELECT numero_prescrizione FROM lavori WHERE id = f.lavoro) = 'NUOVA-PRESCR-2026', false)                    AS a04_numero_prescrizione,
  COALESCE((SELECT tipo_dispositivo FROM lavori WHERE id = f.lavoro) = 'cad_cam', false)                                 AS a05_tipo_dispositivo,
  COALESCE((SELECT descrizione      FROM lavori WHERE id = f.lavoro) = 'NUOVA descrizione', false)                       AS a06_descrizione,
  COALESCE((SELECT array_agg(fdi::text ORDER BY fdi) FROM lavori_denti
             WHERE lavoro_id = f.lavoro AND ruolo = 'elemento') = ARRAY['21','22'], false)                               AS a07_denti_tabella,
  COALESCE((SELECT denti_coinvolti FROM lavori WHERE id = f.lavoro) = ARRAY['21','22'], false)                           AS a08_denti_denormalizzati,
  COALESCE((SELECT contenuto->>'colore' FROM lavori_prescrizioni WHERE lavoro_id = f.lavoro) = 'A3', false)              AS a09_prescr_colore,
  COALESCE((SELECT contenuto->'elementi' FROM lavori_prescrizioni WHERE lavoro_id = f.lavoro) = '[21,22]'::jsonb, false) AS a10_prescr_elementi,
  COALESCE((SELECT stato FROM dichiarazioni_conformita WHERE id = f.ddc) = 'annullata', false)                           AS a11_vecchia_annullata,
  COALESCE((SELECT annullata_da_evento_id FROM dichiarazioni_conformita WHERE id = f.ddc) = f.evento, false)             AS a12_causale_scritta,
  COALESCE((SELECT count(*) FROM dichiarazioni_conformita
             WHERE lavoro_id = f.lavoro AND stato <> 'annullata' AND id <> f.ddc) = 1, false)                            AS a13_nuova_viva,
  COALESCE((SELECT sostituisce_id FROM dichiarazioni_conformita
             WHERE lavoro_id = f.lavoro AND stato <> 'annullata' AND id <> f.ddc) = f.ddc, false)                        AS a14_filo_sostituisce
FROM f;

ROLLBACK;
```
</details>

**Ricetta d'esecuzione**, una invocazione per sonda:
```bash
cd "…/ua-app"
set -a && . ./.env.local; set +a
cat scripts/tmp/sonde-b/00-fixture.sql scripts/tmp/sonde-b/06-corpo-giro-buono.sql > /tmp/S6.sql
node scripts/psql.mjs /tmp/S6.sql
```

---

## 4. Il catalogo vivo dopo il push — *il file non è la prova*

```
$ npx supabase db push --linked --yes
Applying migration 20260808093513_correggi_e_riemetti_atomica.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260808093513_correggi_e_riemetti_atomica.sql"],…,"message":"Finished supabase db push."}
```
```
correggi_e_riemetti_atomica | secdef=true | acl=postgres=X/postgres , service_role=X/postgres
  | cfg=search_path=public, pg_temp
  | args=p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid, p_correzioni jsonb, p_nuova jsonb, p_atteso_updated_at timestamp with time zone

CREATE UNIQUE INDEX ddc_evento_annulla_unique ON public.dichiarazioni_conformita
  USING btree (laboratorio_id, annullata_da_evento_id) WHERE (annullata_da_evento_id IS NOT NULL)
```
`COMMENT` della funzione e dell'indice riletti dal catalogo: presenti, con la tabella
chiave → destinazione dentro il commento della funzione.

**FASE 6b:**
```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
EXIT=0    (nessun messaggio CLI in coda al file: l'ultima riga è `} as const`)
$ git diff --stat src/types/database.types.ts
 src/types/database.types.ts | 11 +++++++++++
$ grep -n correggi_e_riemetti_atomica src/types/database.types.ts
6320:      correggi_e_riemetti_atomica: {
$ npx tsc --noEmit
TSC_EXIT=0   (zero righe di output)
```

---

## 5. R-P4 — il conteggio, e le forme d'ingresso

**Il rosso di partenza: `14 su 14`.** Con l'**abbozzo inerte** (firma identica, corpo
`SELECT json_build_object('esito','ok')`, con lo stesso `REVOKE`/`GRANT`) creato dentro la transazione:
```
a01…a14: false, false, false, false, false, false, false, false, false, false, false, false, false, false
verdi_su_14: 0        →  14 asserzioni su 14 si accendono
```
🛑 **Non «funzione inesistente»**: quel rosso (`42883`) proverebbe solo che il nome non c'è — è
esattamente il «modulo non trovato» contro cui R-P4 è scritta.

**Due asserzioni erano nate cieche e sono state rifatte prima di contare:**
- `a02_paziente_id` — la fixture metteva **lo stesso** paziente della correzione: sarebbe stata `true`
  anche con l'abbozzo. Ora la fixture parte da un paziente **diverso** dello stesso laboratorio.
- `a13_nuova_viva` — «esiste una dichiarazione viva» era `true` anche senza fare niente, perché la
  vecchia lo è. Ora chiede una viva **con id diverso** da quella di partenza.

**Le forme d'ingresso, enumerate:**

| forma | coperta da |
|---|---|
| chiave ignota (`pippo`) | ✅ implicito nella sonda 3 (stesso ramo) |
| chiave **plausibile** ma fuori dalle otto (`stato`, colonna vera) | ✅ sonda 3 |
| tipo sbagliato su `denti_coinvolti` (array di stringhe = forma della colonna) | ✅ sonda 8 |
| tipo sbagliato su `prescrizione_caratteristiche` (non-oggetto) | ⚠️ **non coperta** — stessa riga di codice della guardia dei denti, provata dalla gemella |
| sotto-chiave non ammessa dalla penna (`pippo`) | ✅ sonda 9 |
| `p_correzioni` vuoto `{}` | ⚠️ **non coperta da una sonda** — scelta dichiarata: degenera in una riemissione semplice, ed è legittimo |
| `p_correzioni` `NULL` | ⚠️ **non coperta** — trattato come `{}` (`COALESCE`) |
| `p_nuova` non-oggetto / `NULL` | ⚠️ **non coperta** — guardia ribattuta dal modello, riga per riga |
| `p_nuova` con chiavi che non sono colonne | ⚠️ **non coperta** — guardia ribattuta dal modello |
| gettone sbagliato | ✅ sonda 2 |
| gettone `NULL` | ⚠️ **non coperta** — scelta dichiarata: `NULL` = «non controllare», identica al modello `…/denti` |
| evento di un altro lavoro/laboratorio | ⚠️ **non coperta** — guardia ribattuta dal modello |
| `paziente_id` di un altro laboratorio | ✅ sonda 7 |
| lavoro inesistente / di un altro laboratorio | ⚠️ **non coperta** — il `FOR UPDATE` filtrato è la guardia, ribattuta dal modello |
| nessuna dichiarazione viva | ⚠️ **non coperta** — guardia ribattuta dal modello |
| ruolo `anon` | ✅ sonda 4 · ruolo `authenticated` ⚠️ **non coperto** (stesso `REVOKE`) |

---

## 6. I difetti del brief e del piano che ho trovato

**① 🔴 «Il gettone si rinfresca a ogni passaggio» (P10) descrive un meccanismo che non esiste — e la
conseguenza è una sonda che può essere un falso verde.**
`trigger_set_updated_at()`, letto dal catalogo, fa `NEW.updated_at = now()`. In Postgres `now()` è
`transaction_timestamp()`: **costante dentro una transazione**. Quindi il gettone **non** si rinfresca
a ogni passaggio — si muove **una volta sola**, alla prima scrittura su `lavori`, e poi resta fermo.
Misurato: gettone `08:39:30.386Z` (arretrato apposta di un'ora), `now()` della transazione
`09:39:30.386Z`, e **tutte** le scritture successive hanno portato lo stesso valore.
➡️ **L'istruzione operativa del brief resta giusta** (si passa avanti il valore restituito) e l'ho
implementata così **apposta**: resta corretta anche se un domani il trigger passasse a
`clock_timestamp()`. **Ma la conseguenza sulle prove non è nel brief e costa la sonda migliore:** su
una fixture normale, gettone d'ingresso e gettone dopo la prima scrittura sarebbero **uguali**, e la
sonda 6 sarebbe verde **anche con la catena rotta**. Per questo la fixture nasce con `updated_at`
arretrato di un'ora.

**② 🔴 Il brief non dice che `scripts/psql.mjs` si collega come `postgres` — e senza saperlo, tre
sonde su nove sono decorative.**
Misurato: `SELECT current_user` → `postgres`, che è **il proprietario** delle tre funzioni. Da
proprietario la chiamata annidata passa **comunque**, qualunque cosa dicano i `GRANT`: la sonda 5
(P12) sarebbe stata un verde che non prova niente. Le sonde 4·5·6 (e per uniformità 1·1b·2·3·7·8)
girano con `SET LOCAL ROLE service_role` / `anon`.
⚠️ Effetto collaterale già pagato: le tabelle di appoggio della fixture sono di `postgres`, e la prima
esecuzione è morta sul **proprio** 42501 —
`❌ 42501 permission denied for table f` · `GRANT SELECT ON f, g TO service_role` risolve.

**③ 🔴 `denti_coinvolti` è una trappola di NOME, e il brief non la segnala.** La chiave si chiama come
la colonna denormalizzata (`text[]` di FDI) ma deve portare il **carico della penna** (array di
oggetti `{fdi, ruolo, …}`). **Difetto trovato nel mio codice** dalla sonda 8, non nel brief — ma la
trappola è nel perimetro, e chi scriverà il Task C ci cade uguale se non la legge: ora sta nel
`COMMENT` della funzione e in un messaggio d'errore che la nomina.

**④ La sonda «chiave fuori dalle otto» del brief è sotto-specificata.** Con `pippo` non proverebbe
niente di interessante: la sonda giusta usa un nome **plausibile e vero** (`stato`), che il controllo
del modello avrebbe accettato.

**⑤ 🔴 L'elenco di sonde del brief ha un buco, ed è sul modo di fallire più pericoloso del disegno.**
Nessuna delle sei sonde chieste verifica che una penna che risponde «no» **dopo l'annullo** faccia
disfare anche l'annullo. È il caso che lascerebbe un lavoro consegnato **senza nessuna dichiarazione
viva** — stato che nessun indice e nessun CHECK sanno segnalare. Aggiunta come sonda 9.

**⑥ P2 confermata falsa-per-vacuità, indipendentemente.** `annullata_da_evento_id` NULL su **6 righe
su 6** (e `sostituisce_id` idem): l'indice si crea, ma non perché i dati l'abbiano provato. Il brief lo
diceva già; lo confermo perché l'ho rimisurato.

**⑦ 🟠 Domanda di perimetro, non un difetto da tappare (come il brief chiede di fare in questi casi).**
`caratteristichePrescritte` (`src/lib/prescrizione/caratteristiche-prescritte.ts:73-120`) legge **solo
`elementi` e `colore`**: `tipo` è escluso **apposta** (D213 — è ciò che il laboratorio *ha fatto*, non
ciò che il medico *ha prescritto*). Ma la penna `lavoro_prescrizione_correggi_typo` accetta **tre**
campi. ➡️ Una correzione su `tipo` **atterra** in `lavori_prescrizioni.contenuto` e **non cambia niente
sul documento stampato**. L'allowlist del Task C si chiamerà `CAMPI_CORREGGIBILI_DOCUMENTO`: sotto quel
nome, `tipo` non ci sta. **Non ho deciso io** e non ho ricopiato i tre nomi dentro la mia RPC (sarebbe
una seconda fonte della stessa verità): la sotto-chiave si passa alla penna e risponde lei.

---

## 7. R-E2 — ritrovamenti FUORI dal mio mandato (riferiti, non corretti)

**a) `numero_prescrizione` in due posti** — `lavori.numero_prescrizione` (quello **stampato**,
`generate-ddc.ts:256`) e `lavori_prescrizioni.numero_prescrizione`. Già noto dal piano. Ho corretto
**solo** quello su `lavori`. **Non toccato l'altro.**

**b) 🟠 Il mio indice cambia il comportamento di `riapri_lavoro_atomica`, che non è mia.** Anche quella
funzione scrive `annullata_da_evento_id`. La sequenza «riapri → riconsegna → **riapri di nuovo con lo
stesso evento**» oggi riesce; da adesso darebbe `23505` e abortirebbe. Rischio reale **basso**
(l'interfaccia conia un evento nuovo a ogni giro) e l'invariante affermata dall'indice — *un evento
annulla al più una dichiarazione per laboratorio* — è quella voluta: l'ho scritta nel `COMMENT`
dell'indice perché si legga come un'affermazione, non come un incidente. **Non corretto.**

**c) 🟠 `{"denti_coinvolti": []}` cancella TUTTI i denti.** La penna fa `DELETE` e porta
`denti_coinvolti` a `'{}'`: una dichiarazione con zero denti è un elemento dell'Allegato XIII che
sparisce. Dal mio livello è **indistinguibile** da una correzione voluta. Non l'ho bloccato — è una
decisione di perimetro del **Task C** (allowlist e schermata), non della banca dati. **Riferito.**

**d) 🟠 `p_nuova` DEVE portare `numero_ddc` e `progressivo_ddc` nuovi**, o `jsonb_populate_record`
eredita quelli della vecchia e l'`INSERT` sbatte su
`dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key`. È comportamento **ereditato** da
`riemetti_ddc_atomica`, non introdotto da me, e **non è scritto da nessuna parte**: chi scrive il
Task C deve saperlo. **Riferito.**

**e) `riemetti_ddc_atomica` non era mai stata eseguita sul banco** (P11). Le mie sonde sono la prima
esecuzione a runtime di quella logica, sia pure nella forma ribattuta. **Niente si è comportato male**
— ma è un fatto che vale la pena sapere prima di chiamarla «collaudata».

---

## 8. Che cosa NON ho fatto — dichiarato

- ❌ **Nessuna rotta, nessun TypeScript applicativo, nessuna schermata.** Sono Task C e D.
  `CAMPI_CORREGGIBILI_DOCUMENTO` **non esiste** ancora.
- ❌ **Nessun test `vitest`.** Le prove di questo compito sono **sonde SQL** — è ciò che il brief
  chiede, ed è dove vive il comportamento. ⚠️ Ma va detto chiaro: **le sonde non girano in CI**, e
  vivono in `scripts/tmp/`, che è **ignorato da git**. Quando il Task C aggiungerà la rotta, la rete
  permanente su questa RPC sarà quella dei test della rotta, non queste.
- ❌ **Non ho lanciato `npm run verify:full` né `next build`.** Solo `tsc --noEmit`, che è ciò che la
  FASE 6b prescrive dopo una migration. Non ho toccato codice applicativo se non il file **generato**
  `src/types/database.types.ts`.
- ❌ **Non ho corretto `riapri_lavoro_atomica`** né `lavori_prescrizioni.numero_prescrizione`
  (R-E2, §7).
- ❌ **Non ho ricopiato l'allowlist dei tre sotto-campi** della penna della prescrizione dentro la mia
  RPC, e non ho costruito un validatore di schema per il carico dei denti: solo un controllo di
  **forma**. I valori li giudicano le penne.
- ❌ **Non ho bloccato `denti_coinvolti: []`** (§7c) né deciso la sorte di `tipo` (§6⑦): sono domande
  di perimetro, e le domande di perimetro si riferiscono.
- ❌ **Non ho pubblicato niente su `origin`.**
