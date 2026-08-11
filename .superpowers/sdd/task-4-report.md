# Task 4 — Le route dei gesti della prescrizione (`fonte` · `typo` · `divergenza`) — REPORT

Ramo: `ondata-b-sessione-3` · Commit: `feat(api): route dei gesti della prescrizione (fonte · typo · divergenza)`
Stato: **COMPLETO**. Solo file NUOVI: nessun file esistente toccato, quindi superficie di regressione zero.

---

## 1. Che cosa è stato costruito

### La casa unica dei dizionari — `src/lib/domain/prescrizione-costanti.ts` (NUOVO)
`FONTE_TIPI` (foglio·email·modulo·piattaforma) · `CAMPI_TYPO` (elementi·colore·tipo) ·
`MOTIVI_DIVERGENZA` (richiesta_dentista·esigenza_tecnica·materiale_non_disponibile·altro), ognuno
col suo type guard (`isFonteTipo` · `isCampoTypo` · `isMotivoDivergenza`). Modello: `categorie-foto.ts`.

Il commento-spia dichiara ciò che la spia sorveglia davvero, e cita R27 (i quattro fabbricanti del
client non passano `<Database>`, quindi `tsc` non vede mai una query: la spia è l'UNICA rete).

### La spia — `tests/unit/prescrizione-costanti-spia-migration.test.ts` (NUOVO)
**QUATTRO estrazioni, non tre**: `fonte_tipo` è scritto DUE volte in banca dati — il `CHECK` di
tabella (`20260804150306:30`, che rifiuta) e la guardia dentro `lavoro_prescrizione_allega_fonte`
(`20260804152403:163`, che risponde `fonte_tipo_non_valido` invece di far esplodere il CHECK). Se i
due divergessero, la RPC accetterebbe un valore che la tabella respinge: 23514 → 500 al posto di un
esito parlante. Confronto di INSIEMI in entrambe le direzioni, su SQL privato dei commenti
(`soloIstruzioni`: `20260804152403` cita le quattro forme in prosa PRIMA di scriverle nell'IF).

🔴 **L'estrazione è legata alla FUNZIONE, non al file** (`corpoFunzione`), e non è pedanteria:
`p_campo NOT IN (…)` comparirà in DUE funzioni — oggi solo `correggi_typo`, dal Task 5 anche
`registra_divergenza`. Una ricerca sul file intero prende la PRIMA occorrenza: il giorno in cui il
puntatore si sposta alla migration di T5 (che contiene `registra_divergenza` e non `correggi_typo`),
la prova di `CAMPI_TYPO` leggerebbe il dizionario della DIVERGENZA chiamandolo dizionario del typo —
verde, provando la cosa sbagliata, fino al giorno in cui i due divergono. Legandola alla funzione,
quello stesso spostamento LANCIA.
`provato:` copia della spia col puntatore spostato alla migration di tabella →
`Tests 3 failed | 4 passed`, con *«la funzione lavoro_prescrizione_correggi_typo non è definita in
questo file: la spia non può provare nulla — il puntatore va aggiornato»*.

### Il lettore del corpo — `src/lib/api/corpo-json.ts` (NUOVO)
`leggiCorpoJson(req, chiaviNote)`: 400 su corpo non-JSON / `null` / array / scalare, **422 su chiavi
ignote** (nota ② 6: 422 nelle route NUOVE; il POST `/api/lavori` resta com'è per D218).
**Perché estratto e non in linea:** la regola delle chiavi ignote nasce in TRE posti nello stesso
minuto — è esattamente la classe R3 («due copie della stessa regola, una che si aggiorna e l'altra
no»). Il preambolo di autenticazione resta invece IN LINEA in ogni route, come in tutto il repo:
`check-csrf.sh` cerca `isSameOrigin` **dentro il file**, e spostarlo in un helper renderebbe rossa
la guardia.

### Le tre route (NUOVE)
`src/app/api/lavori/[id]/prescrizione/{fonte,typo,divergenza}/route.ts` — POST, `isSameOrigin` +
`getFreshLabContext` + `assertLabOperativo` + service client + `callRpcWithRetry`.
Nessuna entra in `LAB_CONTEXT_ROUTE_ALLOWLIST` (e non deve).

**Mappa esiti → HTTP** (uniforme sulle tre):

| esito RPC | HTTP | corpo |
|---|---|---|
| `ok` | 200 | fonte: `{fonte:{…}}` · typo: `{updated_at}` · divergenza: `{divergenze:n}` |
| `non_trovato` | 404 | `{errore}` — anche il cross-tenant (R4: non esiste, non è «vietato») |
| `conflitto` | 409 | `{errore, esito, updated_at}` (gettone corrente, intatto) |
| `congelata` / `fonte_congelata` | 409 | `{errore, esito}` |
| `senza_prescrizione` | 409 | `{errore: «…prima allega il foglio», esito}` |
| `campo_non_valido` / `motivo_non_valido` / `fonte_tipo_non_valido` | 422 | `{errore, esito}` (difesa in profondità) |
| errore PostgREST · esito ignoto · esito incompleto | 500 | `{errore}` |

---

## 2. Le decisioni di contratto, con la loro ragione

1. **Regola unica «almeno un corpo» sulla fonte** (più larga di quella letterale del brief, e la
   copre): serve almeno uno fra `fonte_immagine_id` e `fonte_riferimento`. Chiude **due** buchi con
   una porta sola — S2 (tre parametri NULL → la RPC risponde `ok` e crea una riga VUOTA che poi mente
   al precheck della DdC) **e** il CHECK `lavori_prescrizioni_fonte_ck` (`fonte_tipo` valorizzato
   senza corpo → 23514 → 500 illeggibile). Il corpo dev'essere un valore NON VUOTO: `'' IS NOT NULL`
   è VERO, quindi una stringa vuota passerebbe il CHECK e la riga sembrerebbe avere una fonte.
2. **Gettone `atteso_updated_at` OBBLIGATORIO sul typo** — decisione oltre la lettera del brief.
   La RPC salta il confronto quando è NULL (`20260804152403:222`): senza gettone due correzioni
   concorrenti tornano ENTRAMBE `ok` e l'ultima vince in silenzio. È il rilievo M1 del PUT denti,
   riprodotto sul database vero il 28/07/2026, sullo stesso campo che la DdC fotografa. La guardia
   sta nella porta e la RPC resta permissiva, per la stessa ragione di vocabolario del PUT denti
   («non hai mandato la chiave» non è `conflitto`, e dirlo sarebbe una bugia all'utente).
   ✅ **Contratto esigibile, verificato**: `GET /api/lavori/[id]` fa `select('*')` su `lavori`
   (`route.ts:302-315`) e `Lavoro.updated_at` è nel tipo — chi apre la scheda ha già il gettone.
3. **Gettone = stringa OPACA end-to-end** (S5): si controlla, non si normalizza; il `.trim()` decide
   solo se è vuota. Provato dai test che il valore arriva alla RPC identico, microsecondi compresi.
4. **`{valore: null}` esplicito rimuove, chiave assente = 422** (S6): si guarda la CHIAVE
   (`'valore' in corpo`), non il valore — `JSON.stringify` fa sparire gli `undefined`, e derivare la
   rimozione da lì farebbe cancellare una caratteristica trascritta a un client con un bug di
   costruzione del corpo, che leggerebbe 200.
5. **Asimmetria deliberata e documentata**: sulla fonte «assente ≡ null» (l'UPSERT sostituisce tutte
   e tre le colonne); sul typo `null` è un ATTO e l'assenza è un errore (la scrittura è puntuale).
6. **Si prova la FORMA, non il DOMINIO**: `elementi` = lista di interi, senza controllo FDI;
   `colore` = testo, senza confronto col catalogo. `contenuto` è una TRASCRIZIONE e la sua regola
   fondativa è la fedeltà al foglio (D210; fatto 6: un colore fuori catalogo è scartato dal CASO ma
   resta trascritto). Importare qui `denti-validazione` contraddirebbe lo snapshot.
7. **Due rifiuti aggiunti, con la stessa ragione** (entrambi rimandano a `{valore: null}`):
   `elementi: []` e `colore`/`tipo` `''`. Creerebbero un TERZO stato — «chiave presente ma vuota» —
   che nessun altro pezzo del sistema produce (`componiSnapshot` OMETTE la chiave) e che ogni
   lettore dovrebbe imparare a distinguere dall'assenza. Nessun vicolo cieco: la UI ha sempre l'atto
   giusto a disposizione. ⚠️ «solo spazi» invece PASSA, come in `componiSnapshot`.
8. **Controllo di tenant su `fonte_immagine_id`** → 403, col precedente delle FK del POST
   `/api/lavori` (`route.ts:158-174`), `deleted_at` filtrato. Senza, la FK composita morde con 23503
   → 500. UUID validato per sintassi (altrimenti 22P02 → 500), regex LOCALE alla route.
9. **`p_utente` dalla sessione, mai dal corpo**: la divergenza è una firma, e una firma che il
   firmatario si sceglie da sé non vale niente. `utente_id` nel corpo è una chiave ignota → 422.
10. **Niente gettone sulla divergenza** (fatto 12): la RPC non tocca `updated_at` e l'operazione è un
    APPEND — due divergenze concorrenti sono due righe legittime. Non si promette un 409 che non
    esiste; `atteso_updated_at` cade su chiave ignota → 422 (rifiuto esplicito invece di un campo
    accettato e ignorato).
11. **Il dizionario del CAMPO della divergenza vive oggi SOLO nella route** (S3: la RPC accetta
    `'pippo'` e `NULL` e risponde `ok`). T5 lo chiude anche in SQL; la porta resta comunque la prima.
    `campo_non_valido` è **già mappato a 422**: il giorno del deploy di T5 questa porta risponde
    correttamente senza toccare niente.
12. **Tipi generati**: `Args` di `allega_fonte` marca NOT NULL tre parametri che la funzione accetta
    NULL — ed è col NULL che si esprimono la V7 e la sostituzione integrale. La chiamata non si
    tipizza sui generati: commento motivato nella route. Nessun cast scritto, perché **non servirebbe
    a niente**: `getServiceClient()` costruisce il client senza il generico `<Database>` (R27), quindi
    nessun tipo generato incontra mai questa chiamata. Il commento resta per chi chiuderà R27.

---

## 3. TDD — evidenza R-P4

| passo | comando | esito |
|---|---|---|
| ① primo rosso | `npx vitest run tests/unit/api-prescrizione* …` | 4 file falliti, **«no tests»** — *«Failed to resolve import»*. **Non prova niente** |
| ② abbozzo inerte | tre route che rispondono `NextResponse.json({})` + dizionari VUOTI + guardie sempre `false` | **58 su 61 accese** |
| ③ rinforzo | le 3 prove passate erano VACUE (v. sotto) | **61 su 61 accese** |
| ④ implementazione | | **61 su 61 verdi** |

🔑 **Il conteggio ha trovato un difetto nelle prove, ed è il suo scopo.** Le tre uniche prove passate
contro l'abbozzo inerte erano i cicli sui type guard: `for (const v of FONTE_TIPI) expect(...)` su
una lista VUOTA non esegue **nessuna** asserzione — la prova diceva «la guardia riconosce i valori»
senza guardarne mai uno. Aggiunto `nonVuoto(dizionario)` a ciascuna, col commento che racconta come è
stata trovata. Due forme d'input aggiunte in fase ④ (decisione 7) vivono dentro casi già rossi in ②.

⚠️ **Nota di misura**, dopo il refuso di conteggio del Task 1 registrato nel ledger: N = le prove che
**si accendono** contro l'abbozzo, cioè le ROSSE. Il conteggio è per caso di prova (`it`), l'unità che
vitest riporta.

### Le forme d'input, enumerate per route

**Comuni alle tre:** corpo non-JSON → 400 · `null` → 400 · array → 400 · scalare → 400 · chiave
ignota → 422 · fuori origine → 403 · senza sessione → 401 · senza laboratorio → 403.

**fonte** (`fonte_tipo` · `fonte_immagine_id` · `fonte_riferimento`): `{}` → 422 (S2) · solo
`fonte_tipo` → 422 · tipo fuori dizionario / non stringa / array / `'FOGLIO'` / `' foglio '` → 422 ·
`fonte_tipo: null` + riferimento → **200** (V7) · riferimento vuoto o di soli spazi → 422 ·
riferimento non stringa → 422 · immagine non stringa / non-UUID → 422 · immagine di un altro lab o
cancellata → 403 · esiti `ok`/`non_trovato`/`fonte_congelata`/`fonte_tipo_non_valido` · errore
PostgREST / esito ignoto / `data` nullo → 500.
*Non coperte:* lunghezza del riferimento (la colonna è `text`, nessun limite in banca dati:
inventarne uno sarebbe una regola senza autorità).

**typo** (`campo` · `valore` · `atteso_updated_at`): campo assente / non stringa / array / `null` /
fuori dizionario → 422 · **`valore` assente → 422** (S6) · `valore: null` → 200 (rimozione) ·
colore/tipo non stringa o `''` → 422 · `elementi` non array / con non-interi / `[]` → 422 · gettone
assente / `null` / `''` / soli spazi / numerico → 422 · gettone valido → arriva INTATTO · esiti
`ok`/`non_trovato`/`conflitto`/`congelata`/`senza_prescrizione`/`campo_non_valido` · `ok` senza
`updated_at` → 500.
*Non coperte, con la ragione:* duplicati o FDI fuori numerazione in `elementi` (fedeltà > catalogo,
decisione 6) · **gettone non vuoto ma non interpretabile come istante (`'pippo'`): LIMITE DICHIARATO**
— supera la porta e sbatte su 22007 → 500, identico al limite già dichiarato sul PUT denti
(`route.ts:100-103`); chiuderlo vorrebbe dire riconoscere qui tutte le forme che Postgres accetta.

**divergenza** (`campo` · `motivo` · `nota`): campo assente / `null` / non stringa / array / fuori
dizionario → 422 (S3) · motivo assente / `null` / non stringa / array / fuori dizionario / `'ALTRO'`
→ 422 · nota assente / `null` / vuota / soli spazi → 200 con `p_nota` NULL · nota non stringa → 422 ·
nota valida → viaggia intatta · `p_utente` = sessione · esiti
`ok`/`non_trovato`/`congelata`/`senza_prescrizione`/`motivo_non_valido`/`campo_non_valido` · `ok`
senza conteggio → 500.
*Non coperte, con la ragione:* gettone di concorrenza (NON ESISTE per questo gesto, decisione 10) ·
`nota` obbligatoria quando il motivo è `altro` (la RPC non la chiede e nessuna decisione ratificata la
impone: sarebbe una regola inventata dalla porta — se servirà, la porta la UI del T7 con la sua D).

---

## 4. Verifica (FASE 7, output reale)

- `npx vitest run tests/unit/api-prescrizione* tests/unit/prescrizione-costanti-spia-migration.test.ts` → **61 passed (61)**
- `npx vitest run` (intero) → **4645 passed | 19 skipped**, 402 file, 0 falliti
- `npx tsc --noEmit` → **uscita 0**
- `npx next build` → **✓ Compiled successfully**, e le tre route compaiono nel manifesto:
  `ƒ /api/lavori/[id]/prescrizione/{divergenza,fonte,typo}`
- `bash scripts/check-csrf.sh` → **verde**

## 5. File toccati (tutti NUOVI)

```
src/lib/domain/prescrizione-costanti.ts
src/lib/api/corpo-json.ts
src/app/api/lavori/[id]/prescrizione/fonte/route.ts
src/app/api/lavori/[id]/prescrizione/typo/route.ts
src/app/api/lavori/[id]/prescrizione/divergenza/route.ts
tests/unit/api-prescrizione-fonte.test.ts
tests/unit/api-prescrizione-typo.test.ts
tests/unit/api-prescrizione-divergenza.test.ts
tests/unit/prescrizione-costanti-spia-migration.test.ts
```

---

## 6. Self-review

- Ogni forma d'input enumerata ha il suo caso o il suo «non coperta, perché» scritto (§3).
- Ogni rifiuto che la porta aggiunge rispetto alla RPC ha la sua ragione nel codice, non solo qui.
- Nessun dizionario ricopiato: le route importano, e la spia sorveglia SQL×2 + TS.
- Le due decisioni oltre la lettera del brief (gettone obbligatorio · rifiuto del terzo stato vuoto)
  sono dichiarate qui e commentate nel codice, non fatte di nascosto.
- Zero file esistenti modificati.
- **BP-1 non eseguita di proposito**: il piano assegna memoria + roadmap al T11 (chiusura), e questo
  compito non cambia lo stato dichiarato del progetto finché le route non hanno un chiamante (T9/T7).

---

## 7. Rilievi FUORI MANDATO — riferiti, NON corretti (R-E2)

1. 🔴 **DUE cose per il Task 5, e la seconda è già disinnescata.**
   **(a)** T5 fa `CREATE OR REPLACE` di `lavoro_prescrizione_registra_divergenza` in una migration
   NUOVA. Da quel momento il corpo VIVO di quella funzione non è più in `20260804152403`, ma il testo
   vecchio resta nel file: la spia continuerebbe a leggerlo e a dichiararsi verde.
   **`MIGRATION_RPC` va spostata alla migration di T5 nello stesso salvataggio**, e il nuovo
   `p_campo NOT IN (…)` guadagna la sua estrazione (il posto è già marcato nella spia).
   Il puntatore si sposta A MANO, come nel modello categorie-foto: la scansione automatica della
   cartella è stata scartata con ragione — scambierebbe un rosso rumoroso con un verde silenzioso.
   **(b)** ✅ **Chiusa in questo commit**: lo spostamento di (a) avrebbe fatto leggere alla prova di
   `CAMPI_TYPO` il dizionario della DIVERGENZA (prima occorrenza di `p_campo NOT IN` nel file
   nuovo), restando verde perché oggi i due elenchi coincidono. L'estrazione è ora legata alla
   FUNZIONE: lo stesso spostamento LANCIA, con un messaggio che dice cosa fare. Prova incollata in §1.
2. **QUARTA copia del dizionario `fonte_tipo`**: `src/types/domain.ts` — `LavoroPrescrizione.fonte_tipo`
   è scritto a mano come `'foglio' | 'email' | 'modulo' | 'piattaforma' | null`, e NON è sorvegliato
   da niente. **T6 tocca proprio quel tipo**: è l'occasione per farlo diventare
   `FonteTipo | null` importando da `@/lib/domain/prescrizione-costanti`. Non l'ho fatto io perché
   `domain.ts` oggi non ha NESSUN import e cambiarlo è fuori dal mio mandato.
3. ⚠️ **Divergenza di convenzione sulla chiave d'errore, per T7/T9.** Queste tre route rispondono
   `{errore, esito?}` (come richiesto dal brief e come fanno le route più nuove: portale,
   preferenze). **La famiglia `lavori` usa invece `{error}`** (112 route). I client di T9 e T7 devono
   leggere `errore` e ramificare su `esito` — un `.error` letto per abitudine darebbe `undefined` e
   un messaggio generico. Nessun consumatore esiste oggi, quindi non ho emesso entrambe le chiavi
   (sarebbe la classe R3).
4. **Citazione stantia già nota**: il cappello di `20260804152403:24-25` cita «route.ts:225» per la
   chiamata a `lavoro_crea_atomico`, che vive a `:264-265`. Già censita dal piano (§Fuori mandato 1)
   — la riporto solo per confermarla ancora vera.
5. **`leggiCorpoJson` rimanda al chiamante i nomi delle chiavi che ha mandato** (`Chiavi non
   riconosciute: …`). È l'unico punto in cui queste route riflettono input non validato, e sta
   nell'helper CONDIVISO — quindi lo erediterà anche la quarta route (`conferma` della ④). Non l'ho
   cambiato: è JSON, non HTML, e le route esistenti già rimandano `valore` preso dal corpo (non è
   una classe nuova per questo repo). ⚠️ **Da sapere per T7/T9**: se `errore` finisse reso
   direttamente nel DOM, quell'accoppiamento diventerebbe rilevante — si renda come TESTO, mai come
   HTML.

---

## 8. Fix da review — 04/08/2026 (Important + Minor, adjudicati dal controllore)

Commit: `fix(api): la route typo chiude il campo tipo (si corregge sul lavoro) e la fonte esige
l'immagine del SUO lavoro`. File toccati: solo i 2 di route + i loro 2 test — nessun altro (§7 di
questo report resta interamente aperto, nessuna riga qui lo chiude).

### Fix 1 (Important) — `prescrizione/typo/route.ts`: la route chiudeva il campo 'tipo'

**Il difetto:** `CAMPI_TYPO` (dizionario della RPC, sessione ②) include `'tipo'`, e la route lo
accettava passandolo intatto a `lavoro_prescrizione_correggi_typo` — che risponde 200 e scrive
`contenuto.tipo`. Ma `lavoro_prescrizione_conferma_consegna` sovrascrive quel campo
INCONDIZIONATAMENTE da `lavori.tipo_dispositivo` alla conferma (D213): la correzione veniva accettata
e poi scartata in silenzio — «Salvato» su un dato che la conferma non avrebbe mai letto.

**Adjudicazione:** `CAMPI_TYPO` resta intatto (è la spia del CHECK SQL, la RPC continua ad accettare
'tipo' legittimamente). La chiusura sta nella ROTTA, fino a quando la sessione ④ non costruisce il
momento in cui correggere il tipo ha senso — la conferma stessa.

**Implementato:** `CAMPI_TYPO_ROUTE` in `typo/route.ts:43-61`, derivata per `filter` da `CAMPI_TYPO`
(non una copia scritta a mano — rispetta il divieto "NESSUNA COPIA LOCALE" del file dei dizionari) con
`CAMPO_TIPO_ESCLUSO = 'tipo' satisfies CampoTypo`: se `'tipo'` sparisse un giorno da `CAMPI_TYPO`, la
riga smette di compilare, non fallisce muta a runtime. `campo: 'tipo'` → 422 dedicato («il tipo si
corregge sul lavoro, non sulla trascrizione: usa la scheda del lavoro»); ogni altro campo fuori
dizionario → 422 generico («usa elementi o colore»).

**Test** (`api-prescrizione-typo.test.ts`): nuovo caso ⑦-bis che manda `campo: 'tipo'` e verifica
messaggio + `rpcMock` mai chiamato. I due casi `campo: 'tipo'` nel test ⑩ (che provavano la FORMA del
valore) sono stati rimossi: dopo il fix quel codice non si raggiunge più per 'tipo' — tenerli avrebbe
testato un ramo morto.

### Fix 2 (Minor) — `prescrizione/fonte/route.ts`: la fonte non verificava `lavoro_id`

**Il difetto:** il lookup dell'immagine (righe ~128-141 prima del fix) filtrava `id` + `deleted_at` +
confrontava `laboratorio_id`, ma MAI `lavoro_id`: un'immagine di un ALTRO lavoro dello stesso
laboratorio veniva accettata come fonte della prescrizione di QUESTO lavoro — e la fonte è la base
probatoria della Dichiarazione di Conformità.

**Implementato:** `.select('laboratorio_id, lavoro_id')` (prima solo `laboratorio_id`) + confronto
applicativo `img.lavoro_id !== id` dopo il controllo di tenant esistente, con 422 dedicato
(«fonte_immagine_id non appartiene a questo lavoro»). Il controllo di laboratorio resta un 403
separato, invariato: l'adjudicazione ha chiesto esplicitamente 422 per il nuovo caso, e il file usa
già il proprio `errore422` per questa famiglia di rifiuti (coerenza con `fonte_tipo`/`fonte_riferimento`
sopra nello stesso file). **Nessun impatto sul clone del rifacimento**: `crea_rifacimento_atomico`
copia `fonte_immagine_id` via RPC, non passa da questa route.

**Test** (`api-prescrizione-fonte.test.ts`): nuovo caso ⑰ (rinumerati ⑰→⑱, ⑱→⑲ gli esiti RPC e
l'errore PostgREST, invariati nel contenuto). Il mock di default ora include `lavoro_id: 'L1'`
(combacia con `params.id`) così i test esistenti restano muti sul nuovo controllo. Aggiunta anche una
spia sul `select()` (`selectMock`) che verifica che la query chieda davvero `lavoro_id`: senza,
un domani che togliesse quella colonna dalla proiezione farebbe *ogni* richiesta con
`fonte_immagine_id` rispondere 422 (falso positivo totale) e il test ⑰ resterebbe verde lo stesso,
perché il mock fabbrica la forma che gli si passa a prescindere dalla query reale.

**Prova che il test ⑰ prova qualcosa (R-P1):** rimosso temporaneamente il controllo
`img.lavoro_id !== id` dalla route (fuori dal repo, mai committato) → `npx vitest run
tests/unit/api-prescrizione-fonte.test.ts` → `1 failed`, `⑰ … AssertionError: expected 200 to be
422`. Ripristinato, verde di nuovo.

### Verifica finale

```
npx vitest run tests/unit/api-prescrizione-typo.test.ts tests/unit/api-prescrizione-fonte.test.ts
→ Test Files  2 passed (2) · Tests  43 passed (43)

npx tsc --noEmit
→ (nessun output, 0 errori)

npx vitest run   (suite intera)
→ Test Files  402 passed | 3 skipped (405) · Tests  4647 passed | 19 skipped (4666)
```

`git status --porcelain` dopo lo stage: solo i 4 file dichiarati (2 route + 2 test) — niente altro a
bordo.
