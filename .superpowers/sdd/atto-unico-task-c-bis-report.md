# RESOCONTO — Task C-bis · L'irrigidimento di `p_nuova` (C0 + C1)

**Data:** 08/08/2026 · **Ramo:** `intervento-post-consegna` · **Migration:**
`supabase/migrations/20260808103515_atto_unico_p_nuova_irrigidita.sql` (applicata e nel ledger)

| cosa | esito |
|---|---|
| sonde ROSSE prima della correzione | **2 su 2 rosse** — il difetto si vede, output incollato §2 |
| sonde VERDI dopo | **6 su 6** (le due chiuse + non-regressione 17/17 + `42501` con `anon` + «non ho chiuso troppo» + il valore forzato) |
| equivalenza numero SQL ↔ TypeScript | **provata su 10 valori, `diff` VUOTO** — e la forma ingenua è sbagliata (§4) |
| catalogo riletto dopo il push | corpo **identico** al file · `prosecdef=true` · `acl=postgres=X, service_role=X` · commento 2110 caratteri |
| FASE 6b | `gen types` → **diff dei tipi VUOTO** (firma invariata) · `tsc` **0 errori, 0 righe** |
| FASE 7 piena | `VERIFY_EXIT=0` · **5492 prove passate**, 68 saltate — il numero è fermo, e il perché è scritto §7 |
| difetti trovati nel brief / nella revisione che lo regge | **3**, di cui **uno che avrebbe introdotto un difetto NUOVO** (§5) |

---

## 1. Passo 0 — che cosa ho trovato aprendo

- **Corpo vivo di `correggi_e_riemetti_atomica`, dal catalogo** (`pg_get_functiondef`, 265 righe):
  **identico** al file `20260808093513_correggi_e_riemetti_atomica.sql` a meno dell'intestazione che
  Postgres riscrive (`CREATE OR REPLACE …` su una riga, `$function$` invece di `$$`).
  `diff` sul corpo → **vuoto**. Il file del Task B è quindi una fonte fedele, ma la misura l'ho rifatta
  invece di fidarmi della riga del revisore.
- **L'allowlist delle otto** (righe 149-152 del file): due array `CONSTANT text[]`, `c_su_lavori` (sei
  nomi) e `c_su_penne` (due), uniti con `||` in un solo controllo `k <> ALL (…)`.
  **La guardia di `p_nuova` è invece ereditata dal modello** e chiede solo «è una colonna di
  `dichiarazioni_conformita`?» — è la porta che questo compito chiude.
- **`src/lib/pdf/generate-ddc.ts:225-226`** — il numero nasce così:
  `` const numero = `DDC-${anno}-${String(progressivo).padStart(4, '0')}` ``, con `anno = annoRoma()`
  (numero) e `progressivo` dalla RPC `genera_progressivo`. La riga costruita (`:233-364`) porta
  `numero_ddc`, `anno_ddc`, `progressivo_ddc` **e** `stato: 'generata'` (`:323`).
- **`.superpowers/sdd/atto-unico-task-b-review.md`** §2.6 e §3 R1 — le due prove di C0 e C1, che ho
  **riprodotto io** (§2 qui sotto) invece di citarle.
- **Chiamanti oggi:** `grep -rn correggi_e_riemetti_atomica src/` → **una sola riga**,
  `src/types/database.types.ts:6320`. La RPC **non ha chiamanti**: irrigidire il contratto adesso non
  rompe nessuno, e Task C nascerà già sul contratto nuovo.
- **Vincoli e colonne, dal catalogo:** `numero_ddc text NOT NULL`, `anno_ddc smallint NOT NULL`,
  `progressivo_ddc integer NOT NULL`, `stato text NOT NULL`; i CHECK sono tre
  (`ddc_no_self_ref`, `…_classe_rischio_check`, `…_stato_check` con
  `bozza · generata · firmata · consegnata · annullata`) — **nessuno lega `numero_ddc` alla sua coppia**.
  Tutte e 6 le dichiarazioni in banca dati hanno prefisso `DDC-`.

---

## 2. Passo 1 — LE SONDE ROSSE, sull'oggetto vivo di prima della correzione

Transazione annullata, fixture creata **dentro**, `SET LOCAL ROLE service_role`, una invocazione per
sonda. La fixture è quella del Task B (`atto-unico-task-b-report.md` §3-ter), ripresa verbatim perché
la non-regressione dovesse girare **sullo stesso banco**.

### 🔴 ROSSA ① — C0 · `p_nuova` con `{"stato":"annullata"}`

```
[12] SELECT — 1 righe
esito: {"esito" : "ok", "nuova_id" : "e3d8f5e1-d3c4-499d-a0b0-bffe50d4e985",
        "vecchia_id" : "5b8edbd3-2705-4ce0-b038-5518b505d5be",
        "numero" : "SONDA-2099-0002", "numero_superato" : "SONDA-2099-0001",
        "updated_at" : "2026-08-08T10:34:56.990557+00:00"}

[14] SELECT — 1 righe
totali: 2 | vive: 0 | stato_lavoro: consegnato
```
🔴 Un lavoro **consegnato** con **zero dichiarazioni vive**, raggiunto dalla porta principale, ed
`esito: ok`. È lo stato che il commento della funzione stessa (righe 111-118) dichiara **non
segnalabile da nessun indice**.

### 🔴 ROSSA ② — C1 · `p_nuova` con un `numero_ddc` incoerente con la sua coppia

Ingresso: `numero_ddc = 'SONDA-2099-0001'` (**il numero della vecchia**) con `progressivo_ddc = 999002`.

```
[12] SELECT — 1 righe
esito: {"esito" : "ok", "nuova_id" : "04cfbe5f-8fc4-40ef-84ae-b738b8d5f430",
        "vecchia_id" : "be13b272-5b88-4058-a34e-c738134d8379",
        "numero" : "SONDA-2099-0001", "numero_superato" : "SONDA-2099-0001", …}

[14] SELECT — 2 righe
numero_ddc        progressivo_ddc  stato       e_la_vecchia
SONDA-2099-0001   999001           annullata   true
SONDA-2099-0001   999002           generata    false      ← STESSO NUMERO STAMPATO

[15] SELECT — 1 righe
numeri_distinti: 1 | righe: 2
```
🔴 **Due documenti a valore legale con lo stesso numero stampato**, nessuna collisione, `esito: ok`.
Il valore di ritorno lo **dichiara** (`numero` = `numero_superato`) e nessuno lo guarda.

---

## 3. Passo 2 — che cosa ho cambiato (e che cosa NON ho toccato)

Una sola ridefinizione della funzione, `DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`, in una
migration **nuova**. Tre modifiche al corpo, tutte dentro il mandato:

1. **Un terzo elenco, `c_nuova_vietate CONSTANT text[] := ARRAY['stato','numero_ddc']`**, e una guardia
   su `p_nuova` che **ALZA** se una delle due arriva. È una lista **a parte** perché il criterio che le
   esclude non è la loro esistenza come colonne (lo sono), è **chi ha il diritto di deciderle**.
2. **`'stato', 'generata'` fra i valori forzati** della catena di override.
3. **`v_nuova.numero_ddc := 'DDC-' || anno::text || '-' || lpad(prog::text, greatest(4, length(prog::text)), '0')`**,
   assegnato **dopo** `jsonb_populate_record` e **prima** sia dell'`INSERT` sia del `RETURN`.

**Perché rifiutare E forzare, e non uno dei due:**
- **rifiutare** e basta lascerebbe `stato` **ereditato** dalla vecchia (letta prima dell'annullo): con una
  vecchia `firmata`/`consegnata` la nuova nascerebbe firmata **con `firmata_at` NULL** — un difetto
  **nuovo**, introdotto dalla chiusura. Misurato, sonda ⑥.
- **forzare** e basta sarebbe un override **muto** su `numero_ddc`, e il numero è già **stampato sul
  PDF**, reso e caricato **prima** della transazione (`generate-ddc.ts:457-460`): la riga in banca dati
  direbbe un numero e il file un altro, e nessuno se ne accorgerebbe.

**Non toccato** (ribattuto identico dal catalogo): ordine annulla → correggi → inserisci · fail-closed
sull'annullo (`GET DIAGNOSTICS` + `RAISE`) · allowlist delle otto voci di `p_correzioni` · guardia di
forma di `denti_coinvolti` · pre-volo su paziente e prescrizione · chiamate alle due penne con il
gettone passato avanti · prova dell'atterraggio su `lavori` · esiti gentili tutti prima della prima
scrittura. Il `COMMENT` è stato **esteso**, non riscritto: porta ora anche il confine di `p_nuova`.

---

## 4. LA DOMANDA DI PERIMETRO CHE IL BRIEF CHIEDEVA DI NON DECIDERE DI FRETTA

> «la derivazione di `numero_ddc` in SQL **deve produrre esattamente la stessa stringa** di
> `costruisciDichiarazione`. Se non ci riesci in modo equivalente, **fermati e riferisci**.»

**Ci riesce, ma NON nel modo ovvio — e il modo ovvio è sbagliato in silenzio.**

🛑 `lpad(x, 4, '0')` **non è** `padStart(4, '0')`: `lpad` **TRONCA** quando la stringa è più lunga del
bersaglio, `padStart` lascia intatto.

```
$ node scripts/psql.mjs -c "SELECT lpad('999002',4,'0'), lpad('999002', greatest(4, length('999002')), '0')"
lpad_troncato: '9990'   lpad_giusto: '999002'
```
E il caso peggiore non è quello: con `progressivo = 10000` la forma ingenua produce
`DDC-2099-1000` — **un numero plausibile**, che è la specie di errore che nessuno vede.

**La prova di equivalenza, fatta fianco a fianco su dieci valori** (0, 1, 7, 42, **999, 1000, 9999,
10000** — il confine delle quattro cifre —, 999002, −5):

```
$ node -e 'for (const p of [0,1,7,42,999,1000,9999,10000,999002,-5]) console.log(`DDC-2099-${String(p).padStart(4,"0")}`)' > ts-numeri.txt
$ node dump.mjs "SELECT 'DDC-' || 2099::smallint::text || '-' || lpad(p::text, greatest(4, length(p::text)), '0') FROM unnest(ARRAY[0,1,7,42,999,1000,9999,10000,999002,-5]) AS p" > sql-numeri.txt
$ diff ts-numeri.txt sql-numeri.txt && echo "EQUIVALENTI: diff vuoto"
EQUIVALENTI: diff vuoto
```
```
e la forma INGENUA, per confronto (valori 999,1000,9999,10000,999002):
DDC-2099-0999
DDC-2099-1000
DDC-2099-9999
DDC-2099-1000     ← 10000 diventa 1000
DDC-2099-9990     ← 999002 diventa 9990
```
➡️ **Non mi fermo**: la derivazione è equivalente con `greatest(4, length(…))`, e la forma sbagliata è
esclusa da una misura, non da un'opinione.

📌 **Il costo che resta, e va detto:** il formato del numero ora vive in **due posti**
(`generate-ddc.ts:226` e la RPC). Il piano lo ordina sapendolo — la derivazione **deve** stare in SQL,
perché la RPC non conosce i suoi chiamanti futuri — ma è una seconda scrittura della stessa verità.
L'ho messo **dentro il `COMMENT` della funzione**, non solo qui, così la prossima revisione non
«unifica» le due rompendo la stampa.

---

## 5. Passo 3 — LE SONDE VERDI

### ✅ ① C0 chiuso
```
❌ P0001 atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante: {stato}
   — stato lo decide questa funzione (la nuova nasce «generata»), numero_ddc si deriva da anno_ddc+progressivo_ddc
USCITA_PONTE=1
```
### ✅ ② C1 chiuso
```
❌ P0001 atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante: {numero_ddc}
   — stato lo decide questa funzione (la nuova nasce «generata»), numero_ddc si deriva da anno_ddc+progressivo_ddc
USCITA_PONTE=1
```
### ✅ ③ LA NON-REGRESSIONE — il giro buono del Task B, **17 asserzioni su 17**

È il giro del Task B **meno `numero_ddc`** (quella chiave ora è rifiutata: è il punto), con
`progressivo_ddc = 999002` invariato.

```
esito: {"esito" : "ok", "nuova_id" : "e99ce422-…", "vecchia_id" : "a63a3060-…",
        "numero" : "DDC-2099-999002", "numero_superato" : "SONDA-2099-0001",
        "updated_at" : "2026-08-08T10:40:20.91936+00:00"}

a01_richiedente_nome        true   a10_prescr_elementi          true
a02_paziente_id             true   a11_vecchia_annullata        true
a03_paziente_nome_snapshot  true   a12_causale_scritta          true
a04_numero_prescrizione     true   a13_nuova_viva               true
a05_tipo_dispositivo        true   a14_filo_sostituisce         true
a06_descrizione             true   a15_numero_derivato          true   ← 'DDC-2099-999002', letterale
a07_denti_tabella           true   a16_prefisso_non_ereditato   true   ← non più 'SONDA-…'
a08_denti_denormalizzati    true   a17_nuova_generata           true
a09_prescr_colore           true
```
⚠️ Le tre asserzioni nuove usano il valore atteso **scritto a mano**, mai ricalcolato con l'espressione
in esame: una prova che si ricalcola da sola non può fallire.

### ✅ ④ `42501` con la CHIAVE PUBBLICA
```
❌ 42501 permission denied for function correggi_e_riemetti_atomica
USCITA_PONTE=1
```
🔑 **Non è cerimonia:** `DROP` → `CREATE` **rifà l'ACL da zero**, e `CREATE FUNCTION` concede EXECUTE a
`PUBLIC` per difetto. Gli argomenti sono costanti e non la fixture, così se il permesso passasse la
risposta sarebbe `non_trovato`: **il verde e il rosso si distinguono**. Confermato in parallelo dal
catalogo: `acl = postgres=X/postgres , service_role=X/postgres` — **nessuna voce PUBLIC**, e per
differenza nemmeno `anon` né `authenticated`.

### ✅ ⑤ NON HO CHIUSO TROPPO
`p_nuova` con `anno_ddc`, `progressivo_ddc` e una colonna di contenuto (`prescrittore_nome`):
```
esito: {"esito" : "ok", …, "numero" : "DDC-2099-999003", "numero_superato" : "SONDA-2099-0001", …}

b01_progressivo_ammesso  true   b03_contenuto_ammesso            true
b02_anno_ammesso         true   b04_numero_segue_il_progressivo  true
```
🔑 `progressivo_ddc` è la chiave che **doveva** restare: è il modo in cui il numero **prenotato** dal
chiamante arriva qui dentro. Se C1 l'avesse mangiata, avrebbe divorato il meccanismo che proteggeva.

### ✅ ⑥ IL VALORE FORZATO SERVE DAVVERO (e senza questa sonda, `a17` era decorativa)

Banco con la vecchia dichiarazione **`firmata`**, con la sua data di firma.
```
(a) il ROSSO dell'assunzione — che cosa farebbe jsonb_populate_record da solo:
    a_eredita_lo_stato: 'firmata'   a_eredita_la_firma: true

(b) la funzione vera:
    esito: {"esito" : "ok", …, "numero" : "DDC-2099-999004", …}
    b_nuova_generata  true    b_senza_data_firma  true
    b_senza_firma     true    b_vecchia_annullata true
```
🔑 **È la sonda che dimostra il difetto che avrei introdotto** rifiutando `stato` senza forzarlo: con una
vecchia `firmata`, la nuova sarebbe nata **firmata con `firmata_at` NULL**. Sulla fixture normale
(vecchia `generata`) l'asserzione `a17` sarebbe stata **verde anche senza il valore forzato** — cioè
inutile. *Una prova che non può fallire non è una prova.*

### 📐 R-P4 — quante asserzioni si ACCENDONO davvero: **7 su 35**

| sonda | asserzioni | discriminano il cambiamento |
|---|---|---|
| ① stato | 2 | **2** |
| ② numero_ddc | 2 | **2** |
| ③ non-regressione | 18 | **2** (`a15`, `a16`) — le altre 16 sono non-regressione, ed è il loro mestiere |
| ④ permessi | 1 | 0 (protegge il `DROP`/`CREATE`, non C0/C1) |
| ⑤ non ho chiuso troppo | 5 | 0 (misura che la porta si è stretta su DUE nomi, non su tutti) |
| ⑥ valore forzato | 7 | **1** (`b_nuova_generata`) + le 2 del rosso d'assunzione |
| **totale** | **35** | **7** |

**Forme d'ingresso di `p_nuova` NON coperte da una sonda, dichiarate invece che nascoste:**
`stato` con un valore **valido diverso da `annullata`** (es. `'bozza'`: rifiutato dallo stesso ramo, non
riprovato) · `numero_ddc` **coerente** con la coppia (rifiutato lo stesso — è il senso della regola, ma
non l'ho misurato separatamente) · `progressivo_ddc` **assente** (collisione `23505` rumorosa, già
misurata dal Task B e non rimisurata) · `progressivo_ddc` di tipo sbagliato (stringa) · `anno_ddc` fuori
dal campo di `smallint` · `p_nuova` con `stato`/`numero_ddc` **e** una chiave non-colonna insieme
(l'ordine dei due controlli decide quale messaggio esce: il primo è quello delle non-colonne).

---

## 6. DOVE IL BRIEF (e la revisione che lo regge) SBAGLIA

### 🔴 ① «rifiuta **oppure** forza» — e sono necessari **tutti e due**

La revisione del Task B (§3 R1) suggerisce la chiusura così: «*un nome da forzare in più nell'oggetto
degli azzerati, **oppure** — meglio, perché vale anche per il modello — un'allowlist di `p_nuova`*». Il
brief eredita la seconda («`stato` non si accetta più»). 🛑 **La seconda DA SOLA introduce un difetto
nuovo:** senza il valore forzato, `jsonb_populate_record` **eredita** `stato` dalla vecchia — letta
**prima** dell'annullo — e con una vecchia `firmata`/`consegnata` la nuova nasce firmata **senza firma**
(`firmata_at`, `firma_digitale_url` azzerati due righe sotto). Oggi non si vede **solo** perché il
chiamante manda `stato` esplicito: chiudere la porta accende il difetto. Misurato, sonda ⑥.
➡️ Ho fatto **entrambe**, e il `COMMENT` dice perché.

### 🟠 ② «una sola `CREATE OR REPLACE`» e «l'idioma di casa è `DROP` → `CREATE` → …» non sono la stessa cosa

Il brief usa le due formule come sinonimi. Non lo sono: `CREATE OR REPLACE` **conserva** l'ACL,
`DROP` + `CREATE` la **azzera** — e `CREATE FUNCTION` concede EXECUTE a `PUBLIC` per difetto. La seconda
forma **richiede** il `REVOKE`/`GRANT` che la prima renderebbe superfluo. Ho seguito l'idioma di casa
(che è quello scritto per esteso, ed è quello del Task B) **e** ho misurato l'ACL dopo il push, invece
di darla per riportata.

### 🟠 ③ La trappola di `lpad` non è nominata da nessuna parte

Il brief pone la domanda giusta («deve produrre **esattamente** la stessa stringa») ma non dice dove sta
il rischio. La traduzione ovvia — `lpad(x, 4, '0')` — **è sbagliata e silenziosa** (§4). Un esecutore di
fretta la scrive e passa tutte le sonde con progressivi a quattro cifre.

### ✅ Ciò che nel brief ho verificato ed è **giusto**
Pavimento `20260808093513` (letto dal ledger: `20260808093513`, `20260808103515` dopo il mio push) ·
la prova di C0 (`ok` · `totali 2` · `VIVE 0`) si riproduce parola per parola · la prova di C1 idem ·
P16 e P17 (la RPC **non ha chiamanti**: `grep -rn correggi_e_riemetti_atomica src/` → solo
`database.types.ts:6320`) · P12 (le penne annidate si chiamano: la sonda ③ le esercita entrambe).

---

## 7. Passi 4 e 5 — applicare, rileggere, verificare

```
$ date -u "+%Y%m%d%H%M%S"        # comando SEPARATO, D311
20260808103515                    # > pavimento 20260808093513 ✅

$ npx supabase db push --linked --yes
Applying migration 20260808103515_atto_unico_p_nuova_irrigidita.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260808103515_atto_unico_p_nuova_irrigidita.sql"],…,"message":"Finished supabase db push."}
```

**Riletto dal catalogo — il file non è la prova:**
```
proname=correggi_e_riemetti_atomica | prosecdef=true | owner=postgres
acl=postgres=X/postgres , service_role=X/postgres | ha_commento=true | len_commento=2110

ledger: 20260808093513, 20260808103515

le righe vive che contano, da pg_get_functiondef:
 22:  c_nuova_vietate CONSTANT text[] := ARRAY['stato', 'numero_ddc'];
 82:   WHERE k = ANY (c_nuova_vietate);
 84:    RAISE EXCEPTION 'atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante: % …'
272:           'stato',          'generata'
301:  v_nuova.numero_ddc := 'DDC-' || v_nuova.anno_ddc::text || '-' ||
303:         greatest(4, length(v_nuova.progressivo_ddc::text)), '0');

diff corpo catalogo ↔ corpo file → CORPO IDENTICO
```

**FASE 6b:**
```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
GEN_EXIT=0
$ tail -1 src/types/database.types.ts
} as const                        ← nessun messaggio CLI in coda
$ diff types-prima.ts src/types/database.types.ts
DIFF_TIPI_RIGHE=0                 ← file rigenerato IDENTICO
$ npx tsc --noEmit
TSC_EXIT=0   righe_output=0
```
📌 **Il diff vuoto è atteso e va dichiarato, non taciuto:** la **firma** della funzione non è cambiata
(stessi sei argomenti, stesso `Returns: Json`) — è cambiato il **corpo**, che i tipi non descrivono. Un
«nessun cambiamento» non spiegato somiglia a un passo saltato.

**FASE 7 PIENA:**
```
$ npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
Test Files  445 passed | 6 skipped (451)
     Tests  5492 passed | 68 skipped (5560)
… next build completato (elenco rotte) …
✅ DS compliance OK · ✅ Guardia CSRF · ✅ reduced-motion · ✅ Coerenza documenti
✅ salvataggio automatico · ✅ progetti Playwright · ✅ verifica «full» registrata
VERIFY_EXIT=0
```
📌 **5492 come dichiarato dal brief, e il perché:** questo compito **non tocca nessun file TypeScript**
(la sola modifica fuori da `supabase/migrations/` è `src/types/database.types.ts`, rigenerato **identico**),
e la RPC **non ha chiamanti** — non c'è codice applicativo di cui scrivere una prova. La rete di
sicurezza di questo cambiamento sono le **sei sonde sul database vero**, che vivono nel resoconto perché
`scripts/tmp/` non sopravvive alla sessione. 🛑 **Le prove automatiche di questo irrigidimento le scrive
il Task C**, quando la rotta avrà un contratto da rispettare.

---

## 8. RITROVAMENTI FUORI MANDATO — riferiti, NON corretti (R-E2)

### 🔴 A · `riemetti_ddc_atomica` porta **ENTRAMBI** i buchi, ed è quella con un chiamante VIVO

`provato:` sul catalogo (`pg_get_functiondef`, righe 62-90): la catena di override forza
`id · laboratorio_id · lavoro_id · sostituisce_id · created_at · updated_at` e azzera
`annullata_da_evento_id · firmata_at · firma_digitale_url · inviata_al_dentista* · deleted_at` —
**`stato` non c'è, `numero_ddc` non c'è, e nessuna guardia rifiuta l'uno o l'altro.**
Il suo chiamante è vivo: `riemettiDdC` (`src/lib/pdf/generate-ddc.ts:463`), dalla rotta
`POST /api/lavori/[id]/dichiarazione/riemetti`.

🛑 **La cosa che una sessione futura ha più probabilità di sbagliare:** da oggi le due funzioni
**sembrano gemelle e non lo sono più**. Chi legge `correggi_e_riemetti_atomica` e conclude «allora anche
l'altra è a posto» sbaglia. Non l'ho toccata perché è fuori mandato — e perché toccarla **rompe subito
il suo chiamante**, che manda `numero_ddc` e `stato` dentro `riga`: è un compito con una sua rotta da
adeguare, non una riga in più qui.

### 🟠 B · In `p_nuova` resta una famiglia di chiavi **accettate e poi ignorate in silenzio**

`id`, `laboratorio_id`, `lavoro_id`, `sostituisce_id`, `created_at`, `updated_at`,
`annullata_da_evento_id`, `firmata_at`, `firma_digitale_url`, `inviata_al_dentista`,
`inviata_al_dentista_at`, `deleted_at`: sono tutte colonne, quindi superano la guardia, e vengono poi
sovrascritte dalla catena di override **senza dirlo**. È **la stessa famiglia di C0 e C1** — cambia solo
che sovrascriverle è innocuo, mentre sovrascrivere `stato` e `numero_ddc` non lo era. Solo due porte
erano nel mandato; se un domani si volesse la regola generale, la forma è già scritta
(`c_nuova_vietate` diventa l'elenco di tutto ciò che la funzione decide da sé).

### 🟠 C · Una conseguenza da consegnare al Task C, non un difetto

La rotta che nascerà **non può passare `riga` di `costruisciDichiarazione` così com'è**: quella porta
`numero_ddc` (`:234`) e `stato` (`:323`), e ora sono **due `P0001`**. Vanno tolte prima della chiamata —
e la coppia `anno_ddc`+`progressivo_ddc` va passata **così com'è**, perché è con quella che il PDF è
stato stampato.

### 📌 Già noti, non miei, non toccati
`{"denti_coinvolti": []}` cancella tutti i denti · **C2** (`p_correzioni` non rifiuta mai il vuoto — è
del Task C) · `numero_prescrizione` vive in due posti · `tipo` accettato dalla penna della prescrizione
ma mai stampato (D213).

---

## 9. COSA NON HO FATTO

- **Non ho toccato `riemetti_ddc_atomica`** (§8 A), benché porti gli stessi due buchi e abbia l'unico
  chiamante vivo.
- **Non ho toccato il resto del corpo**: ordine dei passi, fail-closed sull'annullo, allowlist delle
  otto, guardia di forma dei denti, chiamate alle penne, prova dell'atterraggio. Ribattuti identici.
- **Non ho chiuso C2** (il vuoto in `p_correzioni`): è del Task C ed è nella rotta.
- **Non ho scritto prove automatiche** (`vitest`): non c'è codice TypeScript nuovo e la RPC non ha
  chiamanti — la copertura di questo cambiamento sono le sei sonde di §5, e le prove automatiche
  nascono col Task C.
- **Non ho toccato la rotta** `…/dichiarazione/riemetti/route.ts` né scritto la rotta nuova: è il
  Task C, dopo la revisione di questo.
- **Non ho fatto FASE 9 / 9b** (prove a schermo, gate estetico): nessuna superficie è stata toccata.
- **Non ho aggiornato `memory/MEMORY.md` né `ROADMAP-UFFICIALE.md`**: sono BP-1 dell'orchestratore a
  fine ondata, e la funzione non ha ancora chiamanti da annunciare. **Se questa lettura è sbagliata, è
  il buco più probabile di questo resoconto.**
- **Non ho pubblicato niente** (`git push`): resta un salvataggio locale sul ramo.
