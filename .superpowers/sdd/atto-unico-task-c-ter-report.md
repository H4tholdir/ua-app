# RESOCONTO — Task C-ter · La coppia `anno_ddc`/`progressivo_ddc` è INDIVISIBILE

**Data:** 08/08/2026 · **Ramo:** `intervento-post-consegna` · **Base:** `f3ae721d`
**Mandato:** imporre la regola `XOR` sulla coppia da cui `correggi_e_riemetti_atomica` deriva
`numero_ddc` — o entrambe le chiavi, o nessuna. **Una migration nuova. Il resto del corpo non si tocca.**

---

## 0. IN UNA TABELLA

| cosa | esito |
|---|---|
| le due sonde ROSSE, riprodotte da me sull'oggetto vivo, **con la vecchia nel 2098** | ✅ **entrambe rosse** — §2 |
| la regola `XOR`, in una migration nuova | ✅ `20260808112700_atto_unico_coppia_indivisibile.sql`, applicata e nel ledger |
| il resto del corpo intatto | ✅ `diff` col file del C-bis: **3 blocchi, tutti in aggiunta, ZERO righe tolte** — §3 |
| il catalogo vivo riletto dopo il push (`pg_get_functiondef` · `proacl` · ledger) | ✅ `diff` catalogo ↔ file **VUOTO**; ACL senza `PUBLIC`/`anon`/`authenticated` — §5 |
| le sonde VERDI | ✅ **5 sonde di contratto** (a·b·c·d·e) · la coppia completa **19 asserzioni su 19** — §4 |
| in più, sull'oggetto vivo | **3 misure**: l'abbozzo inerte di R-P4 e le **due forme non coperte** (§4e · §4f) — **8 invocazioni in tutto** |
| R-P4 — forza della regola misurata su un abbozzo inerte | **XOR rifiuta 2 forme su 4; l'asimmetrica del C-bis ne rifiuta 1 su 4** — §4e |
| FASE 6b (`gen types` → `diff` → `tsc`) | ✅ `DIFF_RIGHE=0` · `TSC_EXIT=0`, 0 righe — §6 |
| FASE 7 piena (`verify:full`) | ✅ **uscita 0** · `5492 \| 68 su 451` — **fermo, e previsto prima di lanciarlo** — §7 |
| difetti trovati nel brief e nel piano | **3** — §8 |
| ritrovamenti fuori mandato (R-E2: riferiti, MAI corretti) | **5** — §9 |

**In una frase:** il difetto aveva **due versi** e non uno, la regola scritta è quella che li chiude
tutti e due, e l'ho provato **prima** con due rossi su una fixture costruita apposta perché l'anno
**non potesse coincidere per combinazione**.

---

## 1. 🔴 IL BUCO IN UNA RIGA, E PERCHÉ LA REGOLA È `XOR`

`numero_ddc` non si accetta più dal chiamante: **si deriva** da `anno_ddc` + `progressivo_ddc`
(Task C-bis). Ma la coppia da cui si deriva **non era protetta**. Se ne arriva **una sola**, l'altra se
la prende `jsonb_populate_record` dalla dichiarazione **vecchia**, in silenzio — e il numero che ne esce
è **plausibile e sbagliato**, con `esito: ok`.

🛑 **Il difetto ha due versi, e sono due difetti, non lo stesso visto da due lati.** La regola
asimmetrica che il resoconto del C-bis proponeva («pretendi l'anno quando c'è il progressivo») chiude il
primo e lascia il secondo **esattamente com'è**. §4e lo misura invece di affermarlo.

---

## 2. 🔴 IL ROSSO PRIMA DEL VERDE — le due sonde, riprodotte da me sull'oggetto vivo

🛑 **La fixture è la parte che conta, e non è quella del Task B.** Là la dichiarazione vecchia viveva
nel **2099**, cioè nello stesso anno che le sonde passavano: l'anno ereditato **coincideva per
combinazione** e l'asserzione sul numero restava verde **senza aver mai guardato l'anno**. È il motivo
per cui **sedici** sonde fra Task B e C-bis non hanno preso questo buco — e non è distrazione, è
struttura.

➡️ Nella mia fixture la vecchia è **`anno_ddc = 2098`, `progressivo_ddc = 998001`,
`numero_ddc = 'DDC-2098-998001'`**, e il 2098 sta **dentro l'`INSERT`**, non in un `UPDATE` posticcio
aggiunto in coda (com'era nelle sonde della revisione): una riga di correzione appiccicata dopo è una
riga che il prossimo copia-incolla dimentica. Le sonde passano **2099**. Se l'anno si eredita, si **vede**.

Ogni sonda: **una invocazione**, transazione **annullata** (`BEGIN` senza `COMMIT`), fixture **dentro**
la transazione, `SET LOCAL ROLE service_role`. Fixture e sonde per intero in §11.

### 🔴 ROSSA ① — il chiamante manda SOLO `progressivo_ddc`

```
########## ROSSA ① — SOLO progressivo_ddc (vecchia 2098) ##########
esito={"esito" : "ok", "nuova_id" : "b76e05ac-cbee-43c7-838f-e52c1c7c5683", "vecchia_id" : "e5c756f7-42f6-46ad-9217-7b558d55a330", "numero" : "DDC-2098-999005", "numero_superato" : "DDC-2098-998001", "updated_at" : "2026-08-08T10:26:14.61977+00:00"}
numero_ddc=DDC-2098-998001 | anno_ddc=2098 | progressivo_ddc=998001 | stato=annullata
numero_ddc=DDC-2098-999005 | anno_ddc=2098 | progressivo_ddc=999005 | stato=generata
USCITA=0
```
🔴 **`esito: ok`, e il numero nuovo porta l'anno VECCHIO** — `DDC-2098-999005`. Il chiamante non ha
nominato l'anno e se l'è preso dalla dichiarazione superata, senza che niente lo dicesse.

### 🔴 ROSSA ② — il chiamante manda SOLO `anno_ddc` (il verso che il C-bis non aveva visto)

```
########## ROSSA ② — SOLO anno_ddc (vecchia 2098) ##########
esito={"esito" : "ok", "nuova_id" : "43fe1129-aec7-4d74-8099-4ba9175cd788", "vecchia_id" : "8f837f85-7088-44a0-b079-02b8b58df85c", "numero" : "DDC-2099-998001", "numero_superato" : "DDC-2098-998001", "updated_at" : "2026-08-08T10:26:21.616136+00:00"}
numero_ddc=DDC-2098-998001 | anno_ddc=2098 | progressivo_ddc=998001 | stato=annullata
numero_ddc=DDC-2099-998001 | anno_ddc=2099 | progressivo_ddc=998001 | stato=generata
USCITA=0
```
🔴 **`esito: ok`, e nasce `DDC-2099-998001`: un progressivo che per il 2099 nessuno ha mai prenotato.**
La coppia `(lab, 2099, 998001)` è libera, quindi **non collide con niente** — è la stessa classe di
difetto di C1, sull'altra metà della coppia. Un documento a valore legale con un numero che nessun
contatore ha emesso.

📌 **Entrambe riprodotte da me, non prese dal brief.** È l'unica cosa che questo compito non poteva
delegare: dopo il push non sono più riproducibili, ed è il limite che la revisione del C-bis ha dovuto
dichiarare per le proprie (§7 di quel documento).

---

## 3. LA CORREZIONE — che cosa ho scritto, e che cosa NON ho toccato

**File:** `supabase/migrations/20260808112700_atto_unico_coppia_indivisibile.sql`
🕛 Marca oraria presa con `date -u "+%Y%m%d%H%M%S"` **in un comando separato** (D311) →
`20260808112700`, sopra il pavimento `20260808103515`.

**La guardia, per intero** — una `RAISE`, subito dopo il blocco `c_nuova_vietate` del C-bis e **prima**
del `SELECT … FOR UPDATE` su `lavori`, cioè nella zona di pre-volo: una chiamata rifiutata **non scrive
niente**, e lo si legge dall'ordine del corpo senza bisogno di una sonda.

```sql
IF (p_nuova ? 'anno_ddc') IS DISTINCT FROM (p_nuova ? 'progressivo_ddc') THEN
  RAISE EXCEPTION 'atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, e ne è arrivata una sola (%). …',
    CASE WHEN p_nuova ? 'anno_ddc' THEN 'anno_ddc' ELSE 'progressivo_ddc' END;
END IF;
```

**Il messaggio dice che cosa fare, non solo che è vietato** (D262 — «la PWA non dà blocchi, dà aiuti»,
e qui il lettore è chi scriverà il Task C): nomina **quale** delle due è arrivata, spiega **perché** una
sola è pericolosa (l'altra si eredita in silenzio e il numero esce plausibile e sbagliato) e indica la
strada — *manda tutte e due le chiavi, coi valori con cui hai stampato il PDF, che è ciò che
`costruisciDichiarazione` già produce insieme*.

🛑 **Il messaggio NON suggerisce «oppure nessuna delle due»**, benché la regola lo permetta: mandarne
zero fa ereditare entrambe e l'`INSERT` sbatte comunque sull'indice unico (§4d). Consigliare una strada
che finisce contro un muro sarebbe un aiuto falso.

### 3a — Il resto del corpo: `diff` col file del C-bis, PRIMA di applicare

```
$ diff corpo-cbis.txt corpo-cter.txt
95a96,117   > la guardia della coppia (blocco nuovo)
300a323,324 > due righe di commento nel blocco della derivazione
361a386,398 > il COMMENT: la regola nuova, con le due prove
--- righe tolte (< senza >) ---
0
```
✅ **Tre blocchi, tutti in aggiunta, ZERO righe tolte.** È la prova più forte disponibile che l'ordine
`annulla → correggi → inserisci`, il fail-closed sull'annullo, l'allowlist delle otto voci, le due
penne, la prova dell'atterraggio e gli esiti gentili sono **quelli di prima**.

### 3b — `DROP`+`CREATE` invece di `CREATE OR REPLACE`, e perché

Il brief chiedeva una `CREATE OR REPLACE`; ho scritto `DROP` → `CREATE` → `REVOKE` → `GRANT` →
`COMMENT`, che è l'idioma della migration immediatamente precedente e quello che la revisione del C-bis
indica in §11 come «l'idioma di casa». Due ragioni, entrambe scritte nell'intestazione del file:
`pg_get_functiondef` non conosce le modifiche parziali (una funzione si sostituisce tutta o niente,
quindi il file porta il corpo **intero** ed è leggibile come la verità di quella funzione), e i due file
consecutivi si leggono allo stesso modo.

🔑 **E non sono equivalenti su una cosa che conta:** dopo un `DROP`+`CREATE` Postgres concede `EXECUTE`
a **`PUBLIC`** per impostazione predefinita, quindi il `REVOKE` qui è **portante**, non cerimoniale. Con
`CREATE OR REPLACE` l'ACL preesistente sopravvive e il `REVOKE` sarebbe una seconda rete. Ho scelto la
forma in cui la rete è quella dichiarata — e §5 rilegge l'ACL dal catalogo per provarlo.

---

## 4. LE SONDE VERDI — cinque di contratto, più tre misure

🛑 **Le sonde di CONTRATTO sono cinque, non sei**, e il perché è in §8 (difetto ② del brief): la «⑤ la
coppia completa passa» che il brief aggiunge **è già** la sonda **c** della revisione.

📌 **E il conto onesto è 8 invocazioni**, non 5: alle cinque si aggiungono l'**abbozzo inerte** di R-P4
(§4e) e le **due forme non coperte** misurate invece che supposte (§4f). Le tengo separate perché
misurano cose diverse — le prime cinque dicono che il contratto fa ciò che deve, le altre tre dicono
**quanto vale** la regola e **dove finisce**. 🔑 Lo scrivo esplicito perché il rilievo **M1** della
revisione del C-bis era esattamente un ±1 in questo conteggio, e sono il documento subito a valle.

### ✅ a — solo `progressivo_ddc` → `P0001` (era la ROSSA ①)
```
########## VERDE a — SOLO progressivo_ddc ##########
ERRORE P0001 atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, e ne è arrivata una sola (progressivo_ddc). Da quella coppia si deriva numero_ddc: mandandone una sola, l'altra si eredita in silenzio dalla dichiarazione superata e il numero che ne esce è plausibile e sbagliato, con esito ok. ➡️ Manda TUTTE E DUE le chiavi, coi valori con cui hai STAMPATO il PDF — è ciò che costruisciDichiarazione già produce insieme (src/lib/pdf/generate-ddc.ts:234-236)
USCITA=1
```

### ✅ b — solo `anno_ddc` → `P0001` (era la ROSSA ②, il verso che il C-bis non vide)
```
########## VERDE b — SOLO anno_ddc ##########
ERRORE P0001 atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, e ne è arrivata una sola (anno_ddc). Da quella coppia si deriva numero_ddc: mandandone una sola, l'altra si eredita in silenzio dalla dichiarazione superata e il numero che ne esce è plausibile e sbagliato, con esito ok. ➡️ Manda TUTTE E DUE le chiavi, coi valori con cui hai STAMPATO il PDF — è ciò che costruisciDichiarazione già produce insieme (src/lib/pdf/generate-ddc.ts:234-236)
USCITA=1
```
🔑 **Il nome nel messaggio cambia** (`progressivo_ddc` / `anno_ddc`): la `CASE` dice davvero quale delle
due è arrivata, non una frase fissa.

### ✅ c — la coppia COMPLETA passa, ed è il caso vero — 19 asserzioni su 19
🛑 **Questa non è la non-regressione del C-bis ricopiata: è AGGIORNATA.** Quella manda **solo**
`progressivo_ddc`, quindi sotto la regola nuova **alzerebbe** — ed è la correzione che la revisione ha
fatto a sé stessa (§11 del suo giudizio). Le ho aggiunto `'anno_ddc', 2099`, che è ciò che
`costruisciDichiarazione` già produce insieme al progressivo.
```
########## VERDE c — LA COPPIA COMPLETA (non-regressione aggiornata) ##########
esito={"esito" : "ok", "nuova_id" : "3c155246-638c-4888-87e0-843f3b5b32e2", "vecchia_id" : "0ddc2c68-6026-44df-8572-e58b98535e41", "numero" : "DDC-2099-999002", "numero_superato" : "DDC-2098-998001", "updated_at" : "2026-08-08T11:32:44.832645+00:00"}
a01_richiedente_nome=true            a11_vecchia_annullata=true
a02_paziente_id=true                 a12_causale_scritta=true
a03_paziente_nome_snapshot=true      a13_nuova_viva=true
a04_numero_prescrizione=true         a14_filo_sostituisce=true
a05_tipo_dispositivo=true            a15_numero_derivato_letterale=true   ← 'DDC-2099-999002' scritto a mano
a06_descrizione=true                 a16_anno_vecchio_non_ereditato=true  ← NOT LIKE 'DDC-2098-%'
a07_denti_tabella=true               a17_nuova_generata=true
a08_denti_denormalizzati=true        a18_anno_colonna=true                ← anno_ddc = 2099
a09_prescr_colore=true               a19_progressivo_colonna=true         ← progressivo_ddc = 999002
a10_prescr_elementi=true
USCITA=0
```
🔑 **`numero: DDC-2099-999002` mentre la superata è `DDC-2098-998001`.** Su questa fixture `a15` guarda
**davvero** l'anno: con la fixture del Task B sarebbe verde anche con l'anno ereditato. `a16`, `a18` e
`a19` sono nuove e separano le due metà della coppia, che è precisamente ciò che nessuna sonda faceva.
Il gettone è quello **vero, arretrato di un'ora** (`u0`), non `NULL` e non `now()`.

### ✅ d — né anno né progressivo → `23505` **invariato** (e non un `P0001`)
```
########## VERDE d — NÉ anno NÉ progressivo ##########
ERRORE 23505 duplicate key value violates unique constraint "dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key"
USCITA=1
```
✅ **La guardia NON si è presa questo caso, ed è il punto.** Fallisce da sé, rumorosamente, sull'indice
della coppia — ed è la ragione per cui la regola è «o entrambe o nessuna» e non «entrambe sempre».
Se qui fosse comparso un `P0001`, la mia guardia avrebbe **allargato** il proprio mandato.

### ✅ e — il permesso: `42501` con la chiave pubblica
```
########## VERDE e — SET LOCAL ROLE anon ##########
ERRORE 42501 permission denied for function correggi_e_riemetti_atomica
USCITA=1
```
🛑 Argomenti **costanti**, non di fixture: un permesso concesso avrebbe risposto `non_trovato` invece di
un verde ambiguo. E con `SET LOCAL ROLE`, perché **`scripts/psql.mjs` si collega come `postgres`, cioè
come proprietario**: senza quel cambio di ruolo questa sonda non proverebbe niente.

### 4e — 📏 R-P4 · L'ABBOZZO INERTE, e quante asserzioni si accendono

**Il rosso da solo non misura la forza di una regola.** Ho quindi confrontato, sulle stesse quattro
forme, la regola **scritta** (`XOR`) con quella **asimmetrica** proposta dal resoconto del C-bis
(«pretendi l'anno quando c'è il progressivo»):

```
########## R-P4 — abbozzo inerte: XOR vs asimmetrica ##########
forma=a_solo_progressivo  | xor_rifiuta=true  | asimmetrica_rifiuta=true
forma=b_solo_anno         | xor_rifiuta=true  | asimmetrica_rifiuta=false   ← IL VERSO CHE RESTEREBBE APERTO
forma=c_coppia_completa   | xor_rifiuta=false | asimmetrica_rifiuta=false
forma=d_nessuna_delle_due | xor_rifiuta=false | asimmetrica_rifiuta=false
USCITA=0
```
➡️ **`XOR` rifiuta 2 forme su 4. L'asimmetrica ne rifiuta 1 su 4** — e la forma che lascia passare è
**esattamente** quella della ROSSA ②, misurata in §2. Il brief aveva ragione, e ora è misurato invece
che affermato.

**Conteggio delle asserzioni (R-P4):** 2 sonde di rifiuto (a, b) · 19 asserzioni di non-regressione +
esito (c) · 1 sonda di invarianza (d) · 1 sonda di permesso (e) · 8 righe di abbozzo inerte (4 forme ×
2 regole) = **26 asserzioni**, di cui **le 4 che discriminano davvero questo compito** sono `a`, `b`,
`a16`/`a18` (l'anno non ereditato) e la riga `b_solo_anno` dell'abbozzo. Le altre misurano che **non ho
rotto niente**, che è un'altra cosa e vale meno.

### 4f — Le forme d'ingresso NON coperte, e perché — misurate, non supposte

| forma | esito misurato | perché non è coperta |
|---|---|---|
| `{anno_ddc: null, progressivo_ddc: N}` | `23502 null value in column "numero_ddc" … violates not-null constraint` | Le due chiavi **ci sono**: la guardia guarda la **presenza**, non i valori. Fail-closed e rumoroso, ma il messaggio nomina una colonna che il chiamante non ha toccato — è il **rilievo M2** della revisione, e sta **fuori dal mandato** (§9). |
| `{anno_ddc: 'duemilanovantanove', progressivo_ddc: N}` | `22P02 invalid input syntax for type smallint: "duemilanovantanove"` | Idem: presenza sì, tipo no. Fail-closed. 📌 E si scopre così che `anno_ddc` è **`smallint`**. |
| `p_nuova` non oggetto / `NULL` | già coperta dalla guardia **preesistente** del Task B | Non è mia e non l'ho toccata. |
| chiave che non è colonna | già coperta dalla guardia **preesistente** | idem |
| `stato` / `numero_ddc` in `p_nuova` | già coperte dal **C-bis** | idem |

---

## 5. IL CATALOGO VIVO DOPO IL PUSH — *il file non è la prova*

```
$ npx supabase db push --linked --yes
Applying migration 20260808112700_atto_unico_coppia_indivisibile.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260808112700_atto_unico_coppia_indivisibile.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```
```
proname=correggi_e_riemetti_atomica | prosecdef=true | owner=postgres
acl={postgres=X/postgres,service_role=X/postgres} | cfg={"search_path=public, pg_temp"} | len_commento=3025

ledger: 20260808112700, 20260808103515, 20260808093513, 20260807185858
```
✅ **Nessuna voce `PUBLIC`, `anon`, `authenticated`** — il `REVOKE` dopo il `DROP` ha fatto il suo
lavoro (§3b) · `SECURITY DEFINER` conservato · `search_path` conservato · migration **registrata** e
sopra il pavimento · il `COMMENT` è passato da **2110** a **3025** caratteri, cioè la regola nuova vive
anche lì, dove la legge chi tocca la funzione.

**E la guardia, letta dal catalogo vivo, non dal file:**
```
104:  IF (p_nuova ? 'anno_ddc') IS DISTINCT FROM (p_nuova ? 'progressivo_ddc') THEN
105:    RAISE EXCEPTION 'atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, e ne è arrivata una sola (%). …'
```

**E il file è una fonte fedele:**
```
=== diff CATALOGO VIVO ↔ FILE DI MIGRATION ===
DIFF VUOTO — il file dice la verità sulla funzione viva
```

---

## 6. FASE 6b

🛑 **Generato in un file TEMPORANEO e confrontato, non riversato sopra quello salvato:** `ua-app/CLAUDE.md`
§9 avverte che la CLI può appendere un messaggio in fondo, e la firma non è cambiata, quindi il diff
**deve** essere vuoto. Riversarlo avrebbe rischiato di sporcare un file che non ho ragione di toccare.

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > types-rigen.ts
GEN_EXIT=0
   6686 types-rigen.ts
   6686 src/types/database.types.ts
$ diff types-rigen.ts src/types/database.types.ts
DIFF_RIGHE=0        ← rigenerato BYTE-IDENTICO al file salvato

$ npx tsc --noEmit
TSC_EXIT=0   righe_output=0
```
✅ **Il diff vuoto è il risultato ATTESO, non un passo saltato:** è cambiato il **corpo** della
funzione, che i tipi non descrivono. La firma esposta resta a sei argomenti con `Returns: Json`.
📌 Corroborazione: `git status --short` elenca **due** file, ed `src/types/database.types.ts` non è fra
questi.

---

## 7. FASE 7 — `verify:full`

📌 **Previsione scritta PRIMA di lanciarlo:** `5492 | 68 su 451`, fermo — questo compito è solo SQL.

```
$ npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"

 Test Files  445 passed | 6 skipped (451)
      Tests  5492 passed | 68 skipped (5560)
✓ Compiled successfully in 3.4s
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo, la molla resta a preferenza spenta
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti: nessuna squadra vuota, nessuna prova orfana
✅ verifica «full» registrata (.claude/state/ultima-verifica)
VERIFY_EXIT=0
```
✅ **Previsione azzeccata al numero**: `5492 | 68` su `451`, sette guardie verdi, uscita **0**.

**Perché il numero è fermo, e non è una scusa:** questo compito non tocca **nessun** file TypeScript —
`git status` ne elenca due, una migration e questo resoconto — e la RPC **non ha ancora chiamanti**
(`provato:` `grep -rn correggi_e_riemetti_atomica src/` → solo `src/types/database.types.ts:6320`).
Non esiste codice applicativo di cui scrivere una prova automatica. La rete di sicurezza di questo
cambiamento sono le **sonde SQL** di §4, che in CI non girano.
🛑 **Le prove automatiche le deve il Task C**, quando la rotta avrà un contratto da rispettare: il piano
se lo scrive da solo come aspettativa dichiarata («*se dopo il Task C `verify:full` torna ancora 5492,
qualcosa non è stato provato*»), ed è la promessa da riscuotere.

---

## 8. I DIFETTI DEL BRIEF E DEL PIANO — cercati, non incontrati

### ① 🔴 Il piano dice `generate-ddc.ts:326` per `stato`. **È `:323`.**
`provato:` `grep -n "stato: 'generata'" src/lib/pdf/generate-ddc.ts` → **323**; e le righe 322-324 sono
`data_emissione` · `stato: 'generata' as const` · `}`.
Lo sbaglio è in **tre posti**, tutti scritti oggi:
- `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md:226` (misura **P16**)
- lo stesso piano, **Passo 5-bis del Task C**: «`stato` e `numero_ddc`, che `costruisciDichiarazione`
  mette sempre (`:234`, `:326`)»
- `docs/roadmap/ROADMAP-UFFICIALE.md`, **la riga 26 della coda**

🔑 **Perché non è cosmesi:** la riga `:326` è **`}`**, la chiusura dell'oggetto. Chi apre quel punto per
togliere `stato` prima di chiamare la RPC nuova (è **letteralmente il Passo 5-bis del Task C**) trova
una parentesi e non il campo. E la revisione del C-bis, che ha corretto **il fatto**, aveva scritto il
numero giusto (`:323`) — quindi il piano è andato **indietro** rispetto a un documento già corretto.
➡️ Ho corretto la **sola** citazione nella roadmap, perché la stavo già toccando per BP-1 e l'ho
dichiarato qui. **Il piano non l'ho toccato: è dell'orchestratore, e R-E2 dice di riferire.**

### ② 🟠 Il brief conta SEI sonde dove ce ne sono CINQUE
Il Passo 3 rimanda alle «quattro dovute» della revisione — `a` (solo progressivo → `P0001`) · `b` (solo
anno → `P0001`) · `c` (**coppia completa → `ok`, numero `DDC-A-N`**) · `d` (nessuna delle due →
`23505`) — e **poi aggiunge**: «*In più: ⑤ la coppia completa passa (è il caso vero) · ⑥ `42501` con la
chiave pubblica*». **La ⑤ è la `c`.** La revisione lo dice pure esplicitamente, correggendo sé stessa:
«*R5 va aggiornata aggiungendo `'anno_ddc', 2099`, e diventa la sonda **c***».
➡️ Le invocazioni distinte sono **cinque**: a · b · c(=R5 aggiornata) · d · il `42501`. Ho eseguito
quelle, e l'ho scritto in §4 invece di gonfiare il conto a sei.

### ③ 🔵 Il brief chiede `CREATE OR REPLACE`; la casa e la revisione dicono `DROP`+`CREATE`
Il brief lo scrive due volte; la revisione §11 e il precedente immediato (C-bis) prescrivono `DROP` →
`CREATE` → `REVOKE` → `GRANT` → `COMMENT`. Con la stessa firma arrivano allo stesso posto, **ma non
sono equivalenti sull'ACL** (§3b). Ho seguito l'idioma di casa e scritto la ragione nell'intestazione
della migration. Non è un difetto grave: è una riga del brief che, presa alla lettera, avrebbe reso il
`REVOKE` una formalità senza dirlo.

### ✅ Ciò che nel brief ho verificato ed è GIUSTO
- Le due prove di partenza: riprodotte **entrambe**, parola per parola (§2).
- «*mandarne zero già fallisce rumorosamente (`23505`)*» — `provato:` sonda d.
- «*l'unico chiamante legittimo le manda sempre tutte e due*» — `provato:`
  `src/lib/pdf/generate-ddc.ts:234-236` porta `numero_ddc`, `anno_ddc` e `progressivo_ddc` in tre righe
  consecutive dentro l'oggetto `ddc`.
- «*la funzione non ha ancora chiamanti*» — `provato:` `grep -rn` → solo `database.types.ts:6320`.
- `src/lib/pdf/generate-ddc.ts:225-226` (`generaProgressivo` → `` `DDC-${anno}-${…padStart(4,'0')}` ``):
  **giusto**, sono proprio quelle righe.
- La trappola dell'anno che coincide per combinazione: **giusta, ed è la cosa più utile del brief.**
- Pavimento `20260808103515`: giusto, e il mio nome ci sta sopra.

---

## 9. RITROVAMENTI FUORI MANDATO — R-E2: riferiti, MAI corretti

1. 🟠 **`riemetti_ddc_atomica` porta anche QUESTO buco**, oltre ai due del C-bis, ed è quella con il
   **chiamante vivo** (`riemettiDdC`, `generate-ddc.ts:463`). Da oggi lo scarto fra le due funzioni è di
   **tre** porte, non due. Non l'ho toccata: è la **riga 26 della coda** in roadmap, ed è un compito con
   **una rotta attaccata**. 📌 Nota di sollievo, misurata: il suo chiamante passa `riga`, che porta
   `anno_ddc` **e** `progressivo_ddc` insieme (`:235-236`), quindi la mezza mandata **oggi non capita**
   nemmeno lì.
2. 🔵 **M2 della revisione — il messaggio di `{anno_ddc: null}` nomina la colonna sbagliata**
   (`23502 … column "numero_ddc"`, misurato in §4f). La revisione suggeriva di chiuderlo «*visto che il
   C-ter tocca comunque questa zona*». 🛑 **Non l'ho fatto, ed è una scelta.** «Costa zero perché sono
   già qui» è esattamente il ragionamento per cui R-E2 esiste, e il brief ripete due volte che il resto
   del corpo non si tocca. La regola scritta guarda la **presenza** delle chiavi; i **valori** sono un
   altro mandato.
3. 🟠 **`p_correzioni` non rifiuta il vuoto** (C2) — è del Task C, non toccato.
4. 🔵 **In `p_nuova` restano accettate-e-poi-ignorate in silenzio** dodici colonne (`id`,
   `laboratorio_id`, `lavoro_id`, `sostituisce_id`, `created_at`, `updated_at`,
   `annullata_da_evento_id`, `firmata_at`, `firma_digitale_url`, `inviata_al_dentista`,
   `inviata_al_dentista_at`, `deleted_at`): stessa famiglia di C0/C1, fuori mandato, elencate nel
   `COMMENT` e nell'intestazione della migration.
5. 🔵 **`anno_ddc` è `smallint`** (scoperto in §4f): un anno fuori intervallo darebbe `22003`, non un
   messaggio nostro. Nessuno lo aveva scritto finora; non è un difetto, è un fatto che serve al Task C.

---

## 10. 🛑 CHE COSA NON HO FATTO

| cosa | perché |
|---|---|
| **Non ho toccato il resto del corpo** della funzione | mandato esplicito; `diff` in §3a: **zero righe tolte** |
| **Non ho toccato `riemetti_ddc_atomica`** | R-E2 · roadmap, la riga 26 della coda |
| **Non ho chiuso M2** (messaggio di `{anno_ddc: null}`) | R-E2 · §9 punto 2 — è una scelta, non una dimenticanza |
| **Non ho toccato le due migration già applicate** | sono nel ledger: modificarle lo disallineerebbe dal catalogo |
| **Non ho modificato il piano** (nemmeno le due citazioni `:326` sbagliate) | è dell'orchestratore. Riferite in §8① |
| **Non ho scritto prove automatiche** (`vitest`) | non c'è codice applicativo: la RPC non ha chiamanti. Le deve il Task C, ed è scritto |
| **FASE 9 / 9b (viewport, gate estetico)** | **non dovute**: nessuna superficie toccata, nessun file di `src/`. Non è né aspetto né contenuto a schermo |
| **Non ho pubblicato su `main`** | l'ondata è a metà (Task C · D · E aperti) e la roadmap lo vieta esplicitamente |
| **Non ho riprovato le sonde del C-bis** oltre alla non-regressione | fuori mandato: quella revisione è chiusa e approvata |

---

## 11. LA FIXTURE E LE SONDE, PER INTERO — perché `scripts/tmp/` sparisce

Vivono in `scripts/tmp/sonde-c-ter/`, che **git ignora**: fra una sessione e l'altra non esistono più.
Chi revisiona questo compito, o chi scrive il Task C, ha bisogno della **fixture al 2098** — è l'unica
che rende falsificabile un'asserzione sull'anno.

**Ricetta, una invocazione per sonda:**
```bash
cd "…/ua-app"
set -a && . ./.env.local; set +a
cat scripts/tmp/sonde-c-ter/00-fixture.sql scripts/tmp/sonde-c-ter/b-solo-anno.sql > /tmp/B.sql
node scripts/tmp/rev-dump.mjs -f /tmp/B.sql     # o: node scripts/psql.mjs /tmp/B.sql
```
🛑 Tutte in **transazione annullata** (`BEGIN` senza `COMMIT`), fixture **dentro**, e ogni sonda sui
permessi con `SET LOCAL ROLE`.

<details><summary><b>fixture — <code>00-fixture.sql</code> (la differenza è il 2098, ed è DENTRO l'INSERT)</b></summary>

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

INSERT INTO lavori
SELECT (jsonb_populate_record(l, jsonb_build_object(
  'id',                     (SELECT lavoro       FROM f),
  'anno_lavoro',            2099,
  'numero_lavoro',          'SONDA-CTER-001',
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
  'updated_at',             now() - interval '1 hour'   -- il gettone VERO, arretrato
))).*
FROM lavori l WHERE l.id = (SELECT src FROM f);

INSERT INTO lavori_denti (laboratorio_id, lavoro_id, fdi, ruolo)
SELECT f.lab, f.lavoro, v, 'elemento' FROM f, unnest(ARRAY[11,12]::smallint[]) AS v;

INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, contenuto)
SELECT f.lab, f.lavoro, '{"elementi":[11,12],"colore":"A2"}'::jsonb FROM f;

-- 🛑 QUI STA LA DIFFERENZA COL TASK B: 2098, e dentro l'INSERT.
INSERT INTO dichiarazioni_conformita (
  id, laboratorio_id, lavoro_id, numero_ddc, anno_ddc, progressivo_ddc,
  fabbricante_nome, fabbricante_indirizzo, fabbricante_piva,
  prescrittore_nome, paziente_nome, tipo_dispositivo, descrizione_dispositivo,
  classe_rischio, testo_conformita, prrc_nome, stato)
SELECT f.ddc, f.lab, f.lavoro, 'DDC-2098-998001', 2098, 998001,
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

-- Senza questo GRANT la sonda muore sul PROPRIO 42501 invece che su quello che misura.
GRANT SELECT ON f, g TO service_role;
```
</details>

<details><summary><b>le sonde a · b · d (i corpi, brevi)</b></summary>

```sql
-- a — solo progressivo
SET LOCAL ROLE service_role;
SELECT public.correggi_e_riemetti_atomica(f.lavoro, f.lab, f.evento, '{}'::jsonb,
  jsonb_build_object('progressivo_ddc', 999005), (SELECT u0 FROM g))::text FROM f;
ROLLBACK;

-- b — solo anno
SET LOCAL ROLE service_role;
SELECT public.correggi_e_riemetti_atomica(f.lavoro, f.lab, f.evento, '{}'::jsonb,
  jsonb_build_object('anno_ddc', 2099), (SELECT u0 FROM g))::text FROM f;
ROLLBACK;

-- d — nessuna delle due (solo una colonna di contenuto)
SET LOCAL ROLE service_role;
SELECT public.correggi_e_riemetti_atomica(f.lavoro, f.lab, f.evento, '{}'::jsonb,
  jsonb_build_object('descrizione_dispositivo', 'SOLO CONTENUTO'), (SELECT u0 FROM g))::text FROM f;
ROLLBACK;
```
</details>

<details><summary><b>la sonda c — la non-regressione AGGIORNATA (19 asserzioni)</b></summary>

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
    'anno_ddc',                2099,          -- ← LA VOCE AGGIUNTA DAL C-TER
    'progressivo_ddc',         999002,
    'prescrittore_nome',       'NUOVO Prescrittore',
    'paziente_nome',           'NUOVO Paziente Snapshot',
    'tipo_dispositivo',        'cad_cam',
    'descrizione_dispositivo', 'NUOVA descrizione'),
  (SELECT u0 FROM g)
)::text AS esito
FROM f;
RESET ROLE;
-- a01…a14 = le quattordici del Task B, invariate. Le cinque nuove:
--   a15_numero_derivato_letterale  numero_ddc = 'DDC-2099-999002'   (letterale, mai ricalcolato)
--   a16_anno_vecchio_non_ereditato numero_ddc NOT LIKE 'DDC-2098-%'
--   a17_nuova_generata             stato = 'generata'
--   a18_anno_colonna               anno_ddc = 2099
--   a19_progressivo_colonna        progressivo_ddc = 999002
ROLLBACK;
```
</details>

<details><summary><b>l'abbozzo inerte (R-P4) e le due forme non coperte</b></summary>

```sql
-- R-P4: quante forme accende la regola scritta, e quante quella asimmetrica
SELECT t.forma,
       ((p ? 'anno_ddc') IS DISTINCT FROM (p ? 'progressivo_ddc'))  AS xor_rifiuta,
       ((p ? 'progressivo_ddc') AND NOT (p ? 'anno_ddc'))           AS asimmetrica_rifiuta
FROM (VALUES
  ('a_solo_progressivo',  '{"progressivo_ddc":999005}'::jsonb),
  ('b_solo_anno',         '{"anno_ddc":2099}'::jsonb),
  ('c_coppia_completa',   '{"anno_ddc":2099,"progressivo_ddc":999002}'::jsonb),
  ('d_nessuna_delle_due', '{"descrizione_dispositivo":"x"}'::jsonb)
) AS t(forma, p);

-- forme non coperte, misurate: p_nuova con anno_ddc NULL, e con anno_ddc testuale
```
</details>
