# REVISIONE INDIPENDENTE — Task C-ter · «la coppia `anno_ddc`+`progressivo_ddc` è indivisibile»

**Data:** 08/08/2026 · **Ramo:** `intervento-post-consegna` · **Oggetto:** `f3ae721d..c2961055`
**Revisore:** agente indipendente, non l'esecutore. **Nessuna riga di codice è stata corretta da me.**
Le mie sonde girano su una fixture **scritta da me**, con la dichiarazione vecchia nel **2091** e le
sonde che passano **2092** — anni **diversi** da quelli dell'esecutore (2098/2099) apposta: se una
delle sue prove fosse verde per combinazione, cambiando i numeri si vedrebbe.

---

## VERDETTO

| cosa | esito |
|---|---|
| **verdetto** | 🟠 **APPROVATO CON RILIEVI** |
| la regola è davvero `XOR`, provata nei **quattro** versi | ✅ **verificato da me**, sonde a·b·c·d su fixture mia |
| il ROSSO prima del verde — **riprodotto da me**, non preso per buono | ✅ corpo pre-C-ter ricreato con altro nome in transazione annullata: **entrambi i versi rinascono** |
| «nessuna delle due» resta `23505` e **non** diventa `P0001` | ✅ **verificato da me** — la guardia non ha allargato il mandato |
| il resto del corpo intatto | ✅ **verificato da me** — `diff` C-bis ↔ catalogo vivo: **2 blocchi nel corpo, ZERO righe tolte** |
| `DROP`+`CREATE`: il `REVOKE` è portante? | ✅ **misurato, e regge PIÙ di quanto l'esecutore dichiari** (§4) |
| una sola funzione in catalogo (nessun doppione da `DROP … IF EXISTS`) | ✅ `count = 1` |
| non-regressione non indebolita | ✅ **20 asserzioni su 20**, con uguaglianza **letterale** sul numero |
| FASE 6b e 7 | ✅ `tsc` **0/0** rieseguito da me · `gen types` **byte-identico** rigenerato da me |
| BP-1 | ✅ memoria voce **194**, roadmap aggiornamento **100**, guardia di coerenza **verde** |
| rilievi **CRITICI** | **nessuno** |
| rilievi **IMPORTANTI** | **1** — il `diff` di §3a è **parafrasato**, non incollato (la conclusione però è vera: l'ho rifatta io) |
| rilievi **MINORI** | **3** |

**Il perché in una frase:** il mandato è eseguito per intero e **correttamente in tutti e quattro i
versi** — l'ho riprovato dal catalogo vivo, e ho anche **fatto rinascere il difetto** invece di
crederlo — ma il resoconto presenta come output incollato un `diff` che è una parafrasi, e porta due
conti che non si ricostruiscono.

---

## 1. 🔴 DOMANDA 1 — La regola è davvero `XOR`, e non l'asimmetrica?

**Sì. Provata nei quattro versi, sull'oggetto vivo, con la vecchia in un anno DIVERSO.**

🛑 **Il metodo, perché è ciò che rende la risposta credibile.** Fixture **mia**, non dell'esecutore:
dichiarazione vecchia `DDC-2091-991001` (anno **2091**, progressivo **991001**), sonde che passano
**2092 / 992002**. Ogni sonda: **una invocazione**, `BEGIN` senza `COMMIT`, fixture **dentro** la
transazione, `SET LOCAL ROLE service_role`. E ho provato che il cambio di ruolo **succede davvero**,
perché senza quello una sonda sui permessi non prova niente:

```
prima current_user=postgres
dopo current_user=anon | puo_eseguire=false
service_role current_user=service_role | puo_eseguire=true
```

### a — solo `progressivo_ddc` → `P0001`
```
ERRORE P0001 atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, e ne è arrivata una sola
(progressivo_ddc). Da quella coppia si deriva numero_ddc: … ➡️ Manda TUTTE E DUE le chiavi, coi
valori con cui hai STAMPATO il PDF … (src/lib/pdf/generate-ddc.ts:234-236)
USCITA=1
```

### b — solo `anno_ddc` → `P0001` (il verso che il C-bis non aveva visto)
```
ERRORE P0001 atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, e ne è arrivata una sola
(anno_ddc). …
USCITA=1
```
✅ **Il nome nel messaggio cambia davvero**: la `CASE` dice quale delle due è arrivata, non una frase
fissa. Questa è la metà che l'implicazione asimmetrica avrebbe lasciato aperta.

### c — la coppia completa → `ok`, e **20 asserzioni su 20**
```
{"esito":"ok", …, "numero":"DDC-2092-992002", "numero_superato":"DDC-2091-991001", …}
a01_richiedente=true a02_paziente=true a03_snapshot=true a04_prescr=true a05_tipo=true a06_descr=true
a07_denti_tabella=true
a08_denti_denorm=true
a09_colore=true a10_elementi=true
a11_vecchia_annullata=true a12_causale=true
a13_nuova_viva=true a14_filo=true a15_numero_LETTERALE=true a16_anno_vecchio_non_ereditato=true
a17_generata=true a18_anno_colonna=true a19_progressivo_colonna=true a20_firma_azzerata=true
NUMERO=DDC-2092-992002
USCITA=0
```
🔑 **La fixture al 2091 rende `a15` falsificabile:** se l'anno si ereditasse, il numero sarebbe
`DDC-2091-992002` e `a15` (uguaglianza **letterale** con `'DDC-2092-992002'`) cadrebbe. Entrambe le
penne sono esercitate (a07-a10), il gettone è quello **vero arretrato di un'ora**, e i campi di firma
restano azzerati (a20).

### d — nessuna delle due → `23505`, **e non `P0001`**
```
ERRORE 23505 duplicate key value violates unique constraint
       "dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key"
USCITA=1
```

**E la regola è XOR anche formalmente, letta dal catalogo e non dal file:**
```
IF (p_nuova ? 'anno_ddc') IS DISTINCT FROM (p_nuova ? 'progressivo_ddc') THEN
```
`?` restituisce sempre un booleano non nullo, quindi `IS DISTINCT FROM` fra due booleani è `<>`:
alza **esattamente** quando ne arriva una sola. `a`/`b` → alza; `c`/`d` → passa. È l'`XOR`.

### 🔴 E IL ROSSO — l'ho fatto rinascere, non l'ho preso per buono

🛑 **Questo è il punto in cui la revisione del C-bis ha dovuto dichiarare un limite, e io non lo
eredito.** Ho estratto il corpo **pre-C-ter** dalla migration del C-bis
(`c2961055^:supabase/migrations/20260808103515_…`), l'ho creato **con un altro nome**
(`public.rev_pre_cter`, stessa firma) **dentro una transazione annullata**, e gli ho mandato le due
mezze mandate. 🔑 Nessun oggetto vivo toccato, nessuna migration, nessun ledger.

```
########## REV-ROSSA 1 — funzione PRE-C-ter, SOLO progressivo_ddc ##########
{"esito":"ok", …, "numero":"DDC-2091-992002", "numero_superato":"DDC-2091-991001", …}
numero=DDC-2091-991001 | anno=2091 | prog=991001 | stato=annullata
numero=DDC-2091-992002 | anno=2091 | prog=992002 | stato=generata   ← L'ANNO è quello VECCHIO
USCITA=0

########## REV-ROSSA 2 — funzione PRE-C-ter, SOLO anno_ddc ##########
{"esito":"ok", …, "numero":"DDC-2092-991001", "numero_superato":"DDC-2091-991001", …}
numero=DDC-2091-991001 | anno=2091 | prog=991001 | stato=annullata
numero=DDC-2092-991001 | anno=2092 | prog=991001 | stato=generata   ← IL PROGRESSIVO è quello VECCHIO
USCITA=0
```
🔴 **Entrambi i versi rinascono, con `esito: ok`, sui MIEI numeri.** Il difetto che l'esecutore
dichiara esisteva davvero e aveva davvero due facce; la guardia lo chiude in tutti e due.

---

## 2. 🔴 DOMANDA 2 — «Nessuna delle due» è rimasto com'era?

**Sì: `23505`, non `P0001`.** Prova incollata sopra (sonda `d`). Questo è il controllo che dice che la
guardia **non ha allargato il proprio mandato**: il caso «zero chiavi» non le era stato affidato, non
lo intercetta, e continua a morire da sé sull'indice unico della coppia
(`dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key`).

🔑 **E c'è un motivo per cui questo è più importante di come suona:** se lì fosse comparso un `P0001`,
la funzione avrebbe cambiato comportamento su un caso fuori mandato — cioè avrebbe fatto esattamente
ciò che R-E2 vieta, **senza che nessuna sonda sul caso buono se ne accorgesse.**

📌 Ho anche verificato il caso limite gemello, che nessuno aveva provato: **una sola chiave, e vale
`null`** (`{"anno_ddc": null}`) → **`P0001`**. La guardia guarda la **presenza**, come dichiara, e non
si lascia ingannare da un valore nullo.

---

## 3. 🔴 DOMANDA 3 — Il resto del corpo è INTATTO?

**Sì, e la prova è la più forte disponibile: zero righe tolte.**

🛑 **Metodo: catalogo vivo, non file.** Ho estratto il corpo con
`pg_get_functiondef` e l'ho confrontato con il corpo del file del C-bis. **Ecco l'elenco COMPLETO
delle differenze, incollato per intero e non riassunto:**

```
$ diff corpo-cbis.txt corpo-vivo.txt
78a79,100
>   END IF;
>
>   -- ─── C1-bis · LA COPPIA DA CUI IL NUMERO SI DERIVA È INDIVISIBILE ──────────
>   … (18 righe di commento)
>   IF (p_nuova ? 'anno_ddc') IS DISTINCT FROM (p_nuova ? 'progressivo_ddc') THEN
>     RAISE EXCEPTION 'atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, …',
>       CASE WHEN p_nuova ? 'anno_ddc' THEN 'anno_ddc' ELSE 'progressivo_ddc' END;
285a308,309
>   --    📌 E da C-ter in poi l'ereditarietà della coppia è o TOTALE o NULLA: la
>   --    guardia in alto rifiuta la mezza mandata, che era l'unica muta.

$ diff corpo-cbis.txt corpo-vivo.txt | grep -c '^<'
0
```

➡️ **Due blocchi nel corpo, entrambi in aggiunta, ZERO righe tolte.** (Il terzo «blocco» che il
resoconto conta è il `COMMENT`, che sta **fuori** dal corpo: sul file intero le aggiunte dopo
l'intestazione sono `200a186,207` · `407a415,416` · `468a478,490`, tutte `a`, nessuna `c` e nessuna `d`.)

**E le otto cose che il mandato proteggeva, ritrovate una per una nel corpo VIVO:**

| # | cosa | riga del corpo vivo |
|---|---|---|
| C0 | `stato` rifiutato… | `c_nuova_vietate CONSTANT text[] := ARRAY['stato', 'numero_ddc'];` — riga 16 |
| C0 | …**e** forzato a `generata` | `'stato',          'generata'` — riga 288 |
| C1 | derivazione col padding che **non tronca** | `lpad(…, greatest(4, length(…)), '0')` — righe 320-321 |
| — | ordine annulla → correggi → inserisci | `UPDATE dichiarazioni_conformita` 192 → penne 242/259 → `INSERT` 323 |
| — | fail-closed sull'annullo | `GET DIAGNOSTICS v_rows` 195 + `RAISE … annullo … fallito` 201 |
| — | allowlist delle **otto** voci | `c_su_lavori` (6) riga 6 + `c_su_penne` (2) riga 9 |
| — | chiamate alle due penne | `lavoro_denti_sostituisci_atomica(` 242 · `lavoro_prescrizione_correggi_typo(` 259 |
| — | prova dell'atterraggio | `RAISE … chiavi accettate ma NON atterrate su lavori` 236 |

**Intestazione, `SECURITY DEFINER`, `search_path` e ACL — dal catalogo:**
```
proname=correggi_e_riemetti_atomica | prosecdef=true | owner=postgres
acl={postgres=X/postgres,service_role=X/postgres} | cfg={"search_path=public, pg_temp"} | len_commento=3025
ledger: 20260808112700, 20260808103515, 20260808093513, 20260807185858, …
```
✅ Nessuna voce `PUBLIC`/`anon`/`authenticated`. Migration **registrata**, sopra il pavimento
`20260808103515`. Il `COMMENT` è passato da 2110 (misura del C-bis) a **3025** caratteri.

**E il file dice la verità sulla funzione viva:**
```
$ diff corpo-vivo.txt corpo-file-cter.txt
DIFF VUOTO
```

**Verifica anti-doppione (nessuno l'aveva fatta, ed è quella che produrrebbe il verde più falso):**
`DROP FUNCTION IF EXISTS` **riesce in silenzio** se la firma non combacia, e il `CREATE` che segue
aggiungerebbe un **secondo sovraccarico** invece di sostituire — con l'ACL letta su una funzione e le
sonde eseguite sull'altra.
```
n=1 | firme=[ 'correggi_e_riemetti_atomica(uuid,uuid,uuid,jsonb,jsonb,timestamp with time zone)' ]
```
✅ **Una sola.** E il `DROP` senza `CASCADE` è riuscito, quindi non c'erano dipendenti.

---

## 4. 🟠 DOMANDA 4 — `DROP`+`CREATE` invece di `CREATE OR REPLACE`: il ragionamento regge?

**Regge, e regge PIÙ di quanto l'esecutore dichiari. L'ho misurato invece di ragionarci.**

L'esecutore sostiene che dopo un `DROP`+`CREATE` Postgres concede `EXECUTE` a `PUBLIC`, quindi il
`REVOKE` è **portante**. `provato:` funzione usa-e-getta creata come `postgres` in transazione
annullata, ACL letta subito dopo il `CREATE`:

```
dopo_CREATE proacl={=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}
            | anon_puo=true | authenticated_puo=true
dopo_REVOKE anon_puo=false
```

🔑 **Su QUESTO database non è solo `PUBLIC`: `anon` e `authenticated` ricevono `EXECUTE`
esplicitamente** (sono i `DEFAULT PRIVILEGES` di Supabase). Cioè: senza il `REVOKE`, dopo il `DROP` la
funzione `SECURITY DEFINER` sarebbe stata **eseguibile dalla chiave pubblica**. Il `REVOKE` non è una
formalità: è l'unica cosa che sta fra la chiave anonima e una funzione che scavalca le RLS.

**E l'«idioma di casa» è vero, non un'auto-assoluzione:** la migration del C-bis — già applicata e già
approvata — usa **la stessa forma**; le righe DDL e ACL dei due file sono **identiche parola per
parola** (`DROP FUNCTION IF EXISTS …` · `CREATE FUNCTION …` · `RETURNS json` · `LANGUAGE plpgsql` ·
`SECURITY DEFINER` · `SET search_path TO 'public', 'pg_temp'` · `REVOKE ALL … FROM PUBLIC, anon,
authenticated` · `GRANT EXECUTE … TO service_role` · `COMMENT ON FUNCTION …`).

🛑 **Giudizio, con la riserva che l'esecutore non scrive:** la forma scelta è quella giusta **ma non è
la più sicura in astratto** — porta con sé il rischio del doppione silenzioso descritto in §3 e la
perdita di `COMMENT` e `GRANT`, che qui vengono rifatti a mano. Regge perché **tutte e tre le
condizioni sono state verificate sul catalogo**: una sola funzione, ACL richiusa, commento presente.
Chi ricopierà l'idioma senza rifare quei tre controlli avrà una forma che *sembra* la stessa.
➡️ **Il ragionamento è approvato; la riserva va nel prossimo brief.**

---

## 5. 🟠 DOMANDA 5 — La non-regressione tiene, e l'asserzione non è stata indebolita?

**Tiene, e l'asserzione è più forte di prima, non più debole.**

L'esecutore dichiara di aver **aggiornato** e non ricopiato la sonda del C-bis, perché quella mandava
solo `progressivo_ddc` e sotto la regola nuova **alzerebbe**. ✅ **Vero, e verificato in due modi:**

1. **Meccanicamente:** la mia sonda `a` (solo `progressivo_ddc`) è **esattamente** la forma della
   vecchia non-regressione, e risponde `P0001`. Quindi la sonda del C-bis, ricopiata, sarebbe morta.
2. **Sul contenuto:** la sonda `c` porta `'anno_ddc', 2092` accanto a `'progressivo_ddc', 992002`, e
   nel corpo del `p_nuova` non è stata tolta **nessuna** delle chiavi precedenti.

**E l'asserzione non è indebolita.** `a15` è un'uguaglianza **letterale** (`numero_ddc =
'DDC-2092-992002'`), che è strettamente più forte di qualunque `LIKE`: sussume sia il vecchio
`a16_prefisso_non_ereditato` sia il nuovo `a16_anno_vecchio_non_ereditato`. Sopra ci sono in più
`a18`/`a19` sulle **colonne** `anno_ddc`/`progressivo_ddc`, che separano le due metà della coppia — ed
è precisamente la cosa che nessuna sonda faceva. Il valore atteso è **scritto a mano**, mai ricalcolato
con l'espressione in esame.

**`42501` con la chiave pubblica — e con quella dell'utente loggato, che nessuno aveva provato:**
```
SET LOCAL ROLE anon          → ERRORE 42501 permission denied for function correggi_e_riemetti_atomica
SET LOCAL ROLE authenticated → ERRORE 42501 permission denied for function correggi_e_riemetti_atomica
```
Argomenti **costanti**, non di fixture: un permesso concesso avrebbe risposto `non_trovato` invece di
un verde ambiguo.

**Il padding non tronca — riverificato con l'espressione della funzione viva:**
```
progressivo=9999   | viva=DDC-2092-9999   | ingenua=DDC-2092-9999
progressivo=10000  | viva=DDC-2092-10000  | ingenua=DDC-2092-1000     ← il confine
progressivo=999002 | viva=DDC-2092-999002 | ingenua=DDC-2092-9990
```

---

## 6. 🔵 DOMANDA 6 — Il resoconto dice il vero?

**Nella sostanza sì: ogni affermazione tecnica che ho potuto riprovare si è riprodotta, e il conto
`2 su 4` contro `1 su 4` è esatto.** Ma un blocco è presentato come output incollato e non lo è, e due
conti non si ricostruiscono.

### 6a — R-P4 «2 su 4 / 1 su 4»: **esatto**, e l'ho rifatto meglio

🛑 L'esecutore ha **ridigitato** il predicato dentro l'abbozzo. Io l'ho **estratto dal
`pg_get_functiondef`** e parametrizzato con una sola sostituzione meccanica (`p_nuova` → `t.p`) — una
prova su un'espressione ricopiata prova la digitazione, non il codice vivo:

```
ESPRESSIONE ESTRATTA DAL CATALOGO VIVO:
IF (p_nuova ? 'anno_ddc') IS DISTINCT FROM (p_nuova ? 'progressivo_ddc') THEN

forma=a_solo_progressivo | xor_rifiuta=true  | asimmetrica_rifiuta=true
forma=b_solo_anno        | xor_rifiuta=true  | asimmetrica_rifiuta=false   ← il verso che resterebbe aperto
forma=c_coppia_completa  | xor_rifiuta=false | asimmetrica_rifiuta=false
forma=d_nessuna_delle_due| xor_rifiuta=false | asimmetrica_rifiuta=false
```
✅ **`XOR` 2 su 4, asimmetrica 1 su 4.** Il conteggio del resoconto è giusto al numero.

### 6b — La fixture incollata è quella vera
`diff` fra la fixture riportata in §11 del resoconto e il file `scripts/tmp/sonde-c-ter/00-fixture.sql`:
**nessuna differenza funzionale** — cambiano solo due commenti e manca dal resoconto l'intestazione di
14 righe del file. Il 2098 è davvero **dentro l'`INSERT`**, come dichiarato.

### 6c — Le forme non coperte: riprodotte tutte, **più una che l'esecutore non aveva provato**
```
{anno_ddc:null, progressivo_ddc:N}      → 23502 null value in column "numero_ddc" …
{anno_ddc:'duemilanovantadue', prog:N}  → 22P02 invalid input syntax for type smallint
{anno_ddc:99999, prog:N}                → 22003 value "99999" is out of range for type smallint   ← mia
{anno_ddc:null} da sola                 → P0001 (la guardia guarda la presenza — corretto)         ← mia
```
✅ E `anno_ddc` è davvero **`smallint`**; aggiungo la metà mancante: **`progressivo_ddc` è `integer`.**

### 6d — Ciò che NON torna → rilievi I1, M1, M2 in §9.

---

## 7. 🔵 DOMANDA 7 — FASE 6b e FASE 7

**Rieseguite da me, non prese per buone.**

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > types-rev.ts
GEN_EXIT=0
$ diff types-rev.ts src/types/database.types.ts
DIFF_RIGHE=0            ← rigenerato BYTE-IDENTICO al file salvato

$ npx tsc --noEmit
TSC_EXIT=0   righe_output=0
```

✅ **I tipi identici sono coerenti, e si può dimostrare invece di dichiararlo.** Questa migration
cambia **solo il corpo**; la firma esposta ai tipi resta la stessa (`database.types.ts:6320`, sei
argomenti, `Returns: Json`) e `pg_get_functiondef` conferma che la firma non è cambiata di un
carattere fra C-bis e C-ter. Un `diff` vuoto qui è il **risultato atteso**, non un passo saltato. E
l'albero è pulito: `git show --stat c2961055` elenca **quattro** file — la migration, il resoconto,
`memory/MEMORY.md`, `docs/roadmap/ROADMAP-UFFICIALE.md` — e `src/types/database.types.ts` **non è fra
questi**, coerente con «rigenerato identico».

📌 **`verify:full` non l'ho rieseguito**: il mio mandato (domanda 7) chiede `tsc`. Il numero
dichiarato (`5492 | 68 su 451`) è **identico** a quello che la revisione del C-bis ha misurato
autonomamente un'ora prima sullo stesso albero, e questo compito non tocca un solo file TypeScript —
la coerenza regge, ma **non è una mia misura**: sta in §11 fra le cose prese per buone.

🔑 **E la spiegazione del numero fermo è giusta e va riscossa:** non esiste codice applicativo da
provare perché la RPC **non ha ancora chiamanti** — `provato:` da me, `grep -rn
correggi_e_riemetti_atomica src/` → **solo** `src/types/database.types.ts:6320`, e in banca dati
nessun'altra funzione la nomina. **Se dopo il Task C `verify:full` torna ancora 5492, qualcosa non è
stato provato.**

---

## 8. 🔵 DOMANDA 8 — BP-1

**Fatto, allineato, e la guardia è verde.**

```
$ node scripts/guardia-coerenza-documenti.mjs
=== Guardia coerenza documenti — 5 documenti vivi controllati ===
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
GUARDIA_EXIT=0
```

- `memory/MEMORY.md` → **voce 194** in testa, con la 193 conservata come «Aggiornamento precedente».
  Porta il difetto nei due versi, i numeri misurati, e la regola.
- `docs/roadmap/ROADMAP-UFFICIALE.md` → **aggiornamento 100**, **voce 23** estesa col Task C-ter, e la
  **riga 26 della coda** aggiornata («le porte di scarto sono TRE, non due»).

✅ **La formula è quella giusta.** In `MEMORY.md` voce 194 e nella roadmap la citazione della coda è
scritta **«la riga 26 della coda»**, mai «voce 26»: la parola «voce» resta riservata alle sezioni della
memoria. Nessuna occorrenza sbagliata nei due documenti toccati.

✅ **E la correzione `:326` → `:323` è genuina e dichiarata.** `provato:` da me —
`src/lib/pdf/generate-ddc.ts:323` è `stato: 'generata' as const,`; `:234-236` sono `numero_ddc`,
`anno_ddc`, `progressivo_ddc` in tre righe consecutive; `:226` è il `padStart(4,'0')`. L'esecutore ha
corretto **la sola** citazione della roadmap (che stava già toccando per BP-1) e ha **riferito** le
due del piano senza toccarlo: **R-E2 rispettata.** ⚠️ Ma vedi **M1**: la correzione porta dentro un
errore suo.

---

## 9. I RILIEVI

### 🔴 CRITICO — nessuno

### 🟠 IMPORTANTE

#### I1 — Il `diff` di §3a è **parafrasato**, e sta sotto un prompt `$` come se fosse output
`.superpowers/sdd/atto-unico-task-c-ter-report.md:121-128`

```
$ diff corpo-cbis.txt corpo-cter.txt
95a96,117   > la guardia della coppia (blocco nuovo)
300a323,324 > due righe di commento nel blocco della derivazione
361a386,398 > il COMMENT: la regola nuova, con le due prove
--- righe tolte (< senza >) ---
0
```
Le intestazioni di hunk sono plausibili, ma **le righe `>` sono prosa scritta a mano**: `diff` non
stampa «*la guardia della coppia (blocco nuovo)*». È un **riassunto in forma di output**.

🛑 **Perché pesa più di quanto sembri, e perché è IMPORTANTE e non minore:** §3a è **l'unica prova
offerta** per il vincolo centrale del mandato — «il resto del corpo non si tocca» — e in un'ondata
che ha ratificato R-P1 (*un blocco senza marchio è non provato, e il marchio porta l'output reale*)
questo è precisamente il modo in cui un resoconto abbellisce. Il brief chiedeva di **elencare ogni
differenza**: da §3a non si può.

✅ **La conclusione però è VERA, e l'ho rifatta io dal catalogo vivo** (§3): due blocchi nel corpo,
entrambi in aggiunta, **zero righe tolte**, e il terzo blocco è il `COMMENT` fuori dal corpo. **Il
rilievo è sulla forma della prova, non sul fatto** — per questo non cambia il verdetto.

### 🔵 MINORE

#### M1 — La correzione del numero di riga porta dentro un numero di riga sbagliato
`.superpowers/sdd/atto-unico-task-c-ter-report.md:378` · e, peggio, `docs/roadmap/ROADMAP-UFFICIALE.md`,
riga 26 della coda

Il resoconto scrive: «*la riga `:326` è **`}`**, la chiusura dell'oggetto*». **Non è così.**
`provato:`
```
322:    data_emissione: new Date().toISOString(),
323:    stato: 'generata' as const,
324:  }
325:
326:  // Genera PDF
```
`:324` è `}`; `:326` è un commento. La sostanza — che `stato` sta a **`:323`** e non a `:326` — è
**giusta**, e la correzione era dovuta. Ma la spiegazione del *perché* è sbagliata, ed è finita
**dentro la roadmap**, cioè in un documento durevole: «*diceva `:326`, che è la parentesi di chiusura
dell'oggetto*».

🛑 **E non è una svista isolata: lo stesso paragrafo afferma e nega.** Due righe più su, §8① scrive
«*le righe 322-324 sono `data_emissione` · `stato: 'generata' as const` · `}`*» — **corretto** — e
subito dopo «*la riga `:326` è `}`*». Chi legge la prima frase esce col fatto giusto, chi legge la
seconda no. 🔑 **È esattamente il rilievo I3 della revisione del C-bis** («*lo stesso documento afferma
e nega*»), ricomparso nel documento che quel rilievo aveva generato — e stavolta la versione sbagliata
è quella finita in roadmap. Un resoconto che corregge un numero di riga sbagliato, sbagliando il
numero di riga.

#### M2 — Il conteggio R-P4 non si ricostruisce dai suoi stessi addendi
`.superpowers/sdd/atto-unico-task-c-ter-report.md:239-241`

> «*2 sonde di rifiuto (a, b) · 19 asserzioni di non-regressione + esito (c) · 1 sonda di invarianza
> (d) · 1 sonda di permesso (e) · 8 righe di abbozzo inerte (4 forme × 2 regole) = **26 asserzioni***»

`2 + 19 + 1 + 1 + 8 = 31`, non 26. Contando invece le asserzioni **effettivamente incollate**
(1 + 1 + 20 + 1 + 1 + 8) si ottiene **32**. Nessuno dei due dà 26.

🛑 **Perché lo scrivo, benché sia un numero:** il resoconto si difende in anticipo proprio su questo —
«*lo scrivo esplicito perché il rilievo M1 della revisione del C-bis era esattamente un ±1 in questo
conteggio, e sono il documento subito a valle*» — e lo sbaglio non è di ±1, è di **±5**. **R-P4 è la
misura di quanto una prova prova:** un errore lì è nel posto peggiore. La sostanza resta onesta (la
misura di forza è bassa e dichiarata bassa), e il conto che conta davvero — 2 su 4 contro 1 su 4 — è
**esatto**, verificato da me.

#### M3 — Il messaggio della guardia indica una strada sola, ed è una scelta giusta ma non dichiarata dove serve
`supabase/migrations/20260808112700_…sql:206`

Il messaggio dice «*Manda TUTTE E DUE le chiavi*» e **tace** sull'altra metà della regola («oppure
nessuna»). L'esecutore lo spiega nel resoconto §3 — quella strada finisce comunque su `23505`, quindi
consigliarla sarebbe un aiuto falso — e **ha ragione**: `provato:` sonda `d`. 🔑 Ma la spiegazione vive
**nel resoconto, che scade con la sessione**, mentre nel `COMMENT` della funzione (che invece resta) la
regola è scritta come «o tutte e due, o nessuna». Chi leggerà il `COMMENT` e poi riceverà il messaggio
vedrà due formulazioni diverse. Una riga nel `COMMENT` — «*il messaggio consiglia solo la coppia
completa, perché mandarne zero muore comunque su 23505*» — sarebbe costata nulla.

---

## 10. ✅ CIÒ CHE HO VERIFICATO ED È GIUSTO NEL RESOCONTO

Le due sonde ROSSE (e **le ho fatte rinascere**, non dedotte) · le cinque sonde di contratto a·b·c·d·e ·
il conteggio R-P4 `2 su 4` / `1 su 4` (con predicato **estratto dal catalogo**) · «il resto del corpo
intatto», rifatto da me dal catalogo · «`23505` invariato» · l'argomento sul `REVOKE` portante, e
**misurato più forte di come è scritto** · l'assenza di chiamanti · `anno_ddc` è `smallint` · la
fixture al 2098 è quella vera e il 2098 è dentro l'`INSERT` · le tre forme non coperte di §4f · il
`COMMENT` a 3025 caratteri · ACL, `prosecdef`, `search_path`, ledger, pavimento · `gen types`
byte-identico e `tsc` a zero · BP-1 fatto, guardia verde, `:323` giusto · i tre difetti del brief
segnalati (② la sonda ⑤ è davvero la `c`; ③ l'idioma) · R-E2 rispettata su tutti e cinque i
ritrovamenti fuori mandato · nessun doppione di funzione in catalogo.

---

## 11. 🛑 CHE COSA HO VERIFICATO IO E CHE COSA HO PRESO PER BUONO

### Verificato da me, con la prova incollata sopra
| # | cosa | come |
|---|---|---|
| 1 | una sola funzione in catalogo (niente doppione da `DROP … IF EXISTS`) | `count(*) FROM pg_proc` → **1** |
| 2 | corpo vivo == corpo del file di migration | `diff` → **vuoto** |
| 3 | resto del corpo intatto | `diff` C-bis ↔ catalogo: 2 blocchi, **0 righe tolte**, elenco completo incollato |
| 4 | le otto invarianti protette, una per una | grep sul **corpo vivo**, righe citate |
| 5 | firma, `SECURITY DEFINER`, `search_path`, ACL, `COMMENT` 3025 | `pg_get_functiondef` · `proacl` · `prosecdef` · `obj_description` |
| 6 | migration nel ledger, sopra il pavimento | `supabase_migrations.schema_migrations` |
| 7 | 🆕 **le due ROSSE riprodotte** sul corpo pre-C-ter, con altro nome, in transazione annullata | `DDC-2091-992002` e `DDC-2092-991001` |
| 8 | `XOR` nei quattro versi (a·b·c·d) su **fixture mia**, vecchia 2091 | una invocazione per sonda |
| 9 | «nessuna delle due» → `23505` e **non** `P0001` | sonda `d` |
| 10 | non-regressione **20 su 20**, gettone vero arretrato | sonda `c` |
| 11 | l'asserzione non è indebolita (`a15` è uguaglianza letterale) | letta e rieseguita |
| 12 | R-P4 con predicato **estratto dal catalogo**, non ridigitato | 2/4 vs 1/4 |
| 13 | `42501` con `anon` **e** con `authenticated`, argomenti costanti | `SET LOCAL ROLE` provato efficace |
| 14 | `SET LOCAL ROLE` cambia davvero utente (`current_user=postgres` di partenza) | incollato |
| 15 | 🆕 il `REVOKE` è portante: dopo `CREATE`, `anon` e `authenticated` hanno `EXECUTE` | funzione usa-e-getta in transazione annullata |
| 16 | 🆕 `{anno_ddc:null}` da sola → `P0001` (presenza, non valore) | mia |
| 17 | 🆕 `anno_ddc=99999` → `22003`; `progressivo_ddc` è `integer` | mia |
| 18 | 🆕 **tutti e sei** gli esiti gentili, fatti succedere uno per uno | `conflitto` · `evento_non_valido` · `non_trovato` · `paziente_non_valido` · `senza_prescrizione` · `nessuna_dichiarazione_viva` |
| 18b | 🆕 doppio tocco → `23505` su `ddc_evento_annulla_unique`; coppia già esistente → `23505` sull'indice della coppia | due invocazioni di fila, stesso evento |
| 18c | 🆕 le due forme sbagliate delle penne → `P0001` col messaggio giusto | `["21","22"]` e `"stringa"` |
| 19 | `p_correzioni` vuoto → `esito: ok` (C2 ancora aperto) | mia |
| 20 | padding non tronca (10000 → `10000`, non `1000`) | espressione della funzione viva |
| 21 | `gen types` byte-identico · `tsc` 0/0 | rieseguiti da me |
| 22 | BP-1 + guardia di coerenza verde | `git diff` dei due documenti + `guardia-coerenza-documenti.mjs` |
| 23 | `generate-ddc.ts` `:226` · `:234-236` · `:323` · `:324` · `:326` | righe numerate incollate |
| 24 | zero chiamanti, in `src/` e in banca dati | `grep` + `pg_proc.prosrc ILIKE` |

### 🛑 Preso per buono, NON verificato
| cosa | perché, e quanto pesa |
|---|---|
| **`npm run verify:full` → `5492 \| 68 su 451`** | Non l'ho rieseguito: la domanda 7 chiedeva `tsc`. **Peso basso**: la revisione del C-bis ha misurato gli **stessi** numeri un'ora prima sullo stesso albero, e questo compito non tocca file TypeScript. Ma il numero **non è mio**. |
| Che l'esecutore abbia **eseguito** `npx supabase db push --linked --yes` | Ho verificato l'**esito** (ledger + corpo vivo + ACL), non l'atto. Peso nullo. |
| Gli **UUID e i timestamp** incollati in §2 e §4 | Ho riprodotto i **comportamenti** sui miei numeri, non quelle esecuzioni. Nessun peso. |
| Il testo dei file di sonda oltre alla fixture | Ho `diff`ato la sola fixture (identica nella sostanza) e **riscritto le sonde da zero**. Peso nullo: le mie sono indipendenti. |
| «**sedici** sonde fra Task B e C-bis» | Aritmetica presa da altri due documenti (9 + 7). Non ricontata. Nessun peso. |
| Che la citazione `:326` sia sbagliata **anche nelle due righe del piano** | Ho verificato il fatto (`stato` è a `:323`); non ho aperto il piano per contare le occorrenze. Peso nullo: il fatto è provato. |
| **Quattro delle tredici `RAISE`** (`p_nuova`/`p_correzioni` non oggetto, `denti_coinvolti` non array) e **le quattro post-annullo** | **Lette dal corpo vivo** (`pg_get_functiondef`, righe citate in §12E), non fatte succedere. Le quattro post-annullo richiedono di rompere una penna o l'annullo dall'interno: fuori dal mandato. **Peso basso**, ma è la ragione per cui §12E porta i gradi 🟢/🔵 e non un «misurato» generico. |
| `{"denti_coinvolti": []}` cancella tutti i denti | **Ereditato** dai documenti a monte. Non riprovato. |
| «`prescrizione_caratteristiche` — sotto-chiavi `elementi · colore · tipo`» | **Ereditato** dal `COMMENT` e dalla penna. Ho provato che `A3`+`elementi` **atterrano** (a09/a10), non l'elenco completo delle sotto-chiavi ammesse. |

---

## 12. 🔑 CHE COSA IL CONTRATTO SQL IMPONE ALLA ROTTA — **il brief del Task C**

Il contratto è **fermo** dopo tre migration (`20260808093513` · `20260808103515` · `20260808112700`).

🛑 **Ogni riga porta il suo GRADO DI PROVA, e il grado non è un abbellimento: è ciò che dice al
prossimo esecutore quanto può fidarsi senza rimisurare.**

| grado | che cosa vuol dire |
|---|---|
| 🟢 **misurato** | sonda mia, sull'oggetto vivo, output incollato in questo documento o qui sotto |
| 🔵 **letto dal corpo vivo** | estratto da `pg_get_functiondef` / `information_schema`, riga citata — non fatto succedere |
| ⚪ **ereditato** | viene dai documenti a monte e **non l'ho riverificato qui** |

📌 Correzione a me stesso: la prima stesura di questa sezione si apriva con «*tutto ciò che segue è
misurato da me*». **Non era vero di tutte le righe**, ed è la stessa cosa che contesto all'esecutore
in **I1** — un riassunto che prende la forma di una misura. Ho misurato le righe mancanti (gli esiti
`paziente_non_valido` e `senza_prescrizione`, il doppio tocco, la coppia già bruciata, le due forme
sbagliate delle penne) e **marcato** quelle che restano lette o ereditate.

### A. Le chiavi che `p_nuova` NON può più mandare — tutte `P0001`
| chiave | perché | messaggio | grado |
|---|---|---|---|
| `stato` | lo decide la funzione: la nuova nasce **sempre** `generata` | `chiavi che la dichiarazione nuova NON accetta dal chiamante: {numero_ddc,stato} — …` | 🟢 |
| `numero_ddc` | si **deriva** da `anno_ddc`+`progressivo_ddc` | *(stesso messaggio, chiavi ordinate)* | 🟢 |
| qualunque nome che **non sia una colonna** di `dichiarazioni_conformita` | `jsonb_populate_record` le ignorerebbe in silenzio | `chiavi che non sono colonne di dichiarazioni_conformita: {chiave_inventata}` | 🟢 |

🛑 **Conseguenza diretta e non negoziabile:** `costruisciDichiarazione` costruisce `ddc` con
`numero_ddc` (`generate-ddc.ts:234`) **e** `stato: 'generata' as const` (**`:323`**, non `:326`), e
`riga = { ...ddc, … }` (`:354-355`). ➡️ **Il Task C deve TOGLIERE `numero_ddc` e `stato` da `riga`**
prima di chiamare, o prende un `P0001` a **ogni** invocazione. 🔵 *(righe lette da me, una per una)*

### B. La coppia indivisibile — l'unica regola nuova di questo compito
- `anno_ddc` **e** `progressivo_ddc`: **tutte e due, o nessuna delle due**.
- **Una sola** → `P0001` che **nomina quale** è arrivata.
- **Nessuna delle due** → la chiamata arriva fino all'`INSERT` e muore su **`23505`** /
  `dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key`.
➡️ **Il Task C manda SEMPRE tutte e due**, coi valori con cui ha **stampato il PDF**. Sono già
prodotti insieme a `generate-ddc.ts:235-236`: **non vanno tolti** insieme a `numero_ddc`.
⚠️ **È un controllo di PRESENZA, non di valore.** `{"anno_ddc": null, "progressivo_ddc": N}` **supera**
la guardia e muore più sotto su `23502 … column "numero_ddc"` — un messaggio che nomina una colonna
che il chiamante non ha toccato (M2 della revisione del C-bis, **ancora aperto**).

🟢 Tutte e tre le righe misurate da me (§1 · §6c). Il grado di B è 🟢 per intero.

### C. Le dodici chiavi accettate **e poi ignorate in silenzio** — 🔵 *lette dal corpo vivo*
`id` · `laboratorio_id` · `lavoro_id` · `sostituisce_id` · `created_at` · `updated_at` ·
`annullata_da_evento_id` · `firmata_at` · `firma_digitale_url` · `inviata_al_dentista` ·
`inviata_al_dentista_at` · `deleted_at`.
Sono colonne vere, quindi passano il controllo, ma la funzione le **sovrascrive**. ➡️ La rotta **non
deve fondarsi su nessuna di esse**: mandarle non alza, e non serve a niente.

### D. `p_correzioni` — otto chiavi e non una di più
- **Sei su `lavori`:** `richiedente_nome` · `paziente_id` · `paziente_nome_snapshot` ·
  `numero_prescrizione` · `tipo_dispositivo` · `descrizione`. 🔵 *lette dal corpo vivo* — 🟢 e provate
  tutte e sei insieme dalla sonda `c` (a01-a06).
- **Due alle penne:** `denti_coinvolti` → **array di OGGETTI `{fdi, ruolo, …}`**, mai stringhe FDI ·
  `prescrizione_caratteristiche` → **oggetto**, sotto-chiavi validate dalla penna (`elementi` ·
  `colore` · `tipo`). 🟢 misurate, **anche nel verso sbagliato:**
  ```
  denti_coinvolti = ["21","22"]              → P0001 atto unico: denti_coinvolti porta il CARICO
                                               DELLA PENNA (oggetti {fdi, ruolo, …}), non il valore
                                               della colonna denormalizzata (ricevuto: ["21", "22"])
  prescrizione_caratteristiche = "stringa"   → P0001 atto unico: prescrizione_caratteristiche
                                               dev'essere un oggetto (ricevuto: string)
  ```
- 🟢 Qualunque altra chiave → `P0001` **con l'allowlist completa dentro il messaggio** (comodo da
  rimandare all'utente): `chiavi che non sono voci correggibili del documento: {classe_rischio}
  (ammesse: {richiedente_nome,paziente_id,paziente_nome_snapshot,numero_prescrizione,
  tipo_dispositivo,descrizione,denti_coinvolti,prescrizione_caratteristiche})`.
- ⚠️ 🟢 **`p_correzioni = {}` NON è rifiutato:** misurato da me, torna `esito: ok` e **riemette un
  documento senza aver corretto niente**. È **C2, ed è del Task C.**
- ⚠️ ⚪ `{"denti_coinvolti": []}` cancella tutti i denti — **ereditato** dai documenti a monte, non
  riprovato da me.

### E. 🛑 Che cosa torna come `P0001`, cioè **non smistabile per SQLSTATE**
**Tredici casi, tutti con lo stesso codice**, distinguibili **solo dal testo** (elenco preso dal corpo
vivo: tredici `RAISE EXCEPTION`, nessuna con `USING ERRCODE`, quindi tutte `P0001`):

| # | caso | grado |
|---|---|---|
| 1 | `p_nuova` non è un oggetto | 🔵 |
| 2 | `p_correzioni` non è un oggetto | 🔵 |
| 3 | chiave fuori dall'allowlist di `p_correzioni` | 🟢 |
| 4 | chiave che non è colonna di `dichiarazioni_conformita` | 🟢 |
| 5 | `stato` / `numero_ddc` in `p_nuova` | 🟢 |
| 6 | **la violazione della coppia** (`XOR`) | 🟢 nei due versi |
| 7 | `denti_coinvolti` non è un array | 🔵 |
| 8 | `denti_coinvolti` non porta oggetti con `fdi` | 🟢 |
| 9 | `prescrizione_caratteristiche` non è un oggetto | 🟢 |
| 10 | 🛑 **annullo fallito** (`righe <> 1`) | 🔵 |
| 11 | 🛑 la **penna dei denti** ha risposto non-`ok` | 🔵 |
| 12 | 🛑 la **penna della prescrizione** ha risposto non-`ok` | 🔵 |
| 13 | 🛑 chiavi accettate ma **non atterrate** su `lavori` | 🔵 |

I quattro con 🛑 (10-13) succedono **dopo** che la scrittura è cominciata; gli altri nove **prima**.

🔑 **È il vincolo più pesante che l'SQL scarica sulla rotta.** I primi nove sono **colpa del
chiamante** (400) e succedono **prima di qualsiasi scrittura**; gli ultimi quattro sono **guasti
interni** (500) e succedono **dopo l'annullo**. Hanno lo **stesso** SQLSTATE. ➡️ Il Task C deve
decidere come separarli — per **prefisso del messaggio** (tutti iniziano con `atto unico: `) o
chiedendo una `RAISE … USING ERRCODE` diversa per i post-annullo — e **scriverlo nel proprio piano**,
perché tradurre un guasto interno in un 400 dice all'odontotecnico che ha sbagliato lui.

### F. Che cosa arriva invece **col suo codice**, e si può smistare
| codice | quando | grado |
|---|---|---|
| `23505` su `…_anno_ddc_progressiv_key` | **né** anno **né** progressivo mandati (si ereditano entrambi) | 🟢 |
| `23505` su `…_anno_ddc_progressiv_key` | quella coppia **esiste già** (progressivo già bruciato per quell'anno) | 🟢 *(mandata la coppia della vecchia)* |
| `23505` su `ddc_evento_annulla_unique` | lo **stesso evento** ha già annullato una dichiarazione (doppio tocco) | 🟢 *(due invocazioni di fila, stesso evento)* |
| `23502` su `numero_ddc` | una delle due metà vale `null` — ⚠️ messaggio fuorviante (M2) | 🟢 |
| `22P02` | `anno_ddc`/`progressivo_ddc` non numerici | 🟢 |
| `22003` | anno fuori dall'intervallo: **`anno_ddc` è `smallint`**, `progressivo_ddc` è `integer` | 🟢 |
| `42501` | la chiamata **non** viene da `service_role` — provato con `anon` **e** `authenticated` | 🟢 |

➡️ **La rotta deve usare il client di servizio.** Con la chiave pubblica o quella dell'utente loggato
la funzione risponde `permission denied`, non un esito.

### G. I sei esiti **gentili**, tutti **prima** di qualsiasi scrittura — arrivano come JSON, non come errore
`non_trovato` · `conflitto` (**porta `updated_at`**, cioè il gettone fresco per il secondo tentativo) ·
`evento_non_valido` · `paziente_non_valido` · `senza_prescrizione` · `nessuna_dichiarazione_viva`.
🛑 **Nessuno di questi alza.** Una rotta che guarda solo `error` li tratterebbe come **successo**.
🟢 **Tutti e sei misurati da me**, uno per uno:
```
gettone sbagliato            -> {"esito":"conflitto","updated_at":"2026-08-08T10:54:08.314024+00:00"}
evento di un altro lavoro    -> {"esito":"evento_non_valido"}
lavoro inesistente           -> {"esito":"non_trovato"}
paziente di un ALTRO lab     -> {"esito":"paziente_non_valido"}
lavoro senza prescrizione    -> {"esito":"senza_prescrizione"}
dichiarazione gia annullata  -> {"esito":"nessuna_dichiarazione_viva"}
```
📌 **E qui correggo una mia frase prima di scriverla:** avevo pensato che
`nessuna_dichiarazione_viva` fosse la seconda invocazione del doppio tocco. **Falso** — dopo la prima
riemissione la NUOVA è `generata`, cioè **viva**, e la seconda chiamata la trova. L'esito arriva solo
quando **nessuna** dichiarazione del lavoro è diversa da `annullata`. L'ho misurato invece di dedurlo.

### H. La forma del successo
```json
{"esito":"ok","nuova_id":…,"vecchia_id":…,"numero":"DDC-2092-992002",
 "numero_superato":"DDC-2091-991001","updated_at":"…"}
```
`numero` è quello **derivato dalla funzione**: la rotta lo **usa**, non lo ricalcola.
`updated_at` è il **gettone aggiornato** da restituire al client.

### I. Tre obblighi che non sono errori
1. **`p_atteso_updated_at = NULL` significa «non controllare»**: passarlo nullo **spegne** il controllo
   di concorrenza. La rotta manda il gettone che ha letto.
2. **Il formato del numero vive in DUE posti** — `generate-ddc.ts:226` e il corpo della RPC. Chi ne
   cambia uno cambia l'altro, o la riga in banca dati e il numero **stampato sul PDF** divergono.
   ⚠️ E `lpad(x,4,'0')` **non** è `padStart(4,'0')`: `lpad` **tronca** sopra le quattro cifre.
3. **`riemetti_ddc_atomica` NON è la gemella di questa funzione**, benché lo sembri: accetta ancora
   `stato`, `numero_ddc` **e** la mezza coppia. 🔵 Il suo chiamante è **vivo e pubblicato**, e l'ho
   letto: `riemettiDdC` → `supabase.rpc('riemetti_ddc_atomica', …)` a `generate-ddc.ts:463`, chiamata
   da `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts:144`. Roadmap, **la riga 26 della
   coda**. 📌 ⚪ Sollievo **ereditato** dal resoconto, non rimisurato: il suo chiamante manda
   `anno_ddc` e `progressivo_ddc` insieme (`:235-236`, righe che ho letto io), quindi la mezza mandata
   lì oggi non capita.

### J. E la promessa da riscuotere
`verify:full` è fermo a **`5492 | 68 su 451`** da **tre** migration, perché non c'è codice applicativo
da provare (`grep` → zero chiamanti). **Il Task C è il primo che avrà una rotta**: se dopo il Task C
quel numero è ancora 5492, qualcosa non è stato provato.

---

## 13. COME RIPRODURRE LE MIE SONDE

Vivono in `scripts/tmp/` (ignorata da git) e nella cartella temporanea di sessione: **non
sopravvivono**. La ricetta, però, sì.

```bash
cd "…/ua-app"
set -a && . ./.env.local; set +a
# fixture MIA (vecchia 2091/991001, sonde a 2092/992002), poi un corpo per sonda
cat 00-fix.sql p-b.sql > /tmp/RUN.sql
node scripts/psql.mjs /tmp/RUN.sql
```
🛑 Tutte in **transazione annullata** (`BEGIN` senza `COMMIT`), fixture **dentro**, **una invocazione
per sonda**, e ogni sonda sui permessi con `SET LOCAL ROLE` — `scripts/psql.mjs` si collega come
`postgres`, cioè come **proprietario**.

🔑 **E la ricetta che vale più di tutte, perché toglie un limite che la revisione precedente aveva
dovuto dichiarare:** per far **rinascere** un difetto già corretto non serve toccare l'oggetto vivo.
Si estrae il corpo vecchio dalla migration precedente (`git show <sha>^:supabase/migrations/<file>`),
si sostituisce **solo il nome** nella `CREATE FUNCTION`, e lo si crea **dentro la transazione
annullata** insieme alla fixture. Niente ledger, niente catalogo toccato, e il rosso torna
riproducibile.

---

## 14. NOTA DI CONSEGNA

**Questo giudizio non è stato salvato in git da me**, come il precedente della stessa ondata: un
revisore che tocca la storia del ramo che sta giudicando è una cosa a sé. ➡️ Il file è sul disco, non
tracciato: lo salva l'orchestratore, con
`git add .superpowers/sdd/atto-unico-task-c-ter-review.md` (**D318: percorsi nominati, mai `git add -A`**).
