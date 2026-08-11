# RESOCONTO — Task D-quinquies: la sentinella che mancava a D323 (rilievo I1)

**Ramo:** `intervento-post-consegna` · **Data:** 08/08/2026 · **Nasce da:** `atto-unico-task-d-quater-review.md`, rilievo **I1**
**Consegna:** `tests/unit/lavori-gettone-spia-migration.test.ts` — **9 prove**, e tutte e nove **viste rosse**.

| cosa | esito |
|------|-------|
| Le tre mutazioni del §1 del brief | **rosse tutte e tre** (la ③ in **due forme**, entrambe rosse) |
| Mutazioni totali provate | **9 su 9 accese** — una per ogni asserzione del file |
| Modello riusato | `tests/unit/*-spia-migration.test.ts` (prescrizione + categorie-foto) |
| Accoppiamento col `PATCH` | **prova separata, decisione motivata al §3** — la metà «rotta» esisteva già |
| FASE 7 | `VERIFY_EXIT=0` · **5685 passate | 68 saltate** su **456** file (base: 5676 | 68 su 455) |
| Difetti trovati nel brief | **3** (§5) |
| Migration nuove | **zero** (come da mandato) |

---

## 1. Il modello che ho riusato, e come funziona

**Cercato per comportamento, non per nome.** L'innesco: *«prove che sorvegliano il contenuto di una
migration e che girano dentro `verify:full`»*. Il censimento ha dato **due** file, entrambi con il
suffisso `-spia-migration.test.ts`:

- `tests/unit/categorie-foto-spia-migration.test.ts`
- `tests/unit/prescrizione-costanti-spia-migration.test.ts`

E la verifica che **girino davvero in CI**: `package.json:20` — `verify:full` esegue `vitest run`
(tutte le suite), mentre le prove di `tests/integration/**` **si saltano da sole** senza
`SUPABASE_DB_URL` (le **68 saltate** della FASE 7). ➡️ Il modello giusto è la **spia unitaria**, non
una prova di integrazione: quest'ultima non avrebbe fermato nessuna delle tre mutazioni in CI.

**Come funziona, in quattro mosse — e le ho riusate tutte e quattro:**

1. **`soloIstruzioni(sql)`** — butta via le righe che cominciano con `--`. 🔴 Non è igiene: nasce da
   **due rossi veri** (02/08 su categorie-foto, poi su prescrizione), perché le migration di questo
   repo portano in testa blocchi di prosa in cui i valori compaiono *citati*. Qui serviva **ancora di
   più**: il cappello della migration di D323 **cita per esteso la forma sbagliata**
   (`- 'post_consegna_correzioni' - 'updated_at'`, righe 59-61) per spiegare perché è stata corretta.
   Una spia che leggesse il file intero sarebbe stata **rossa a prescindere**.
2. **`corpoFunzione(sql, nome)`** — lega l'estrazione alla **funzione**, non al file, e **lancia un
   errore parlante** se non la trova. È il meccanismo che rende il guasto **rumoroso** invece che
   silenzioso (ed è ciò che accende la mutazione ③a, v. §2).
3. **Confronto di INSIEMI, non di conteggi**, in **entrambe le direzioni** — un conteggio resterebbe
   verde se una chiave venisse scambiata con un'altra (è il difetto R3 già pagato su
   `colore-dente-idratazione.test.ts`).
4. **Puntatore al file dichiarato A MANO**, e la scansione automatica della cartella **scartata** dal
   modello con la sua ragione: *«scambierebbe un rosso rumoroso con un verde silenzioso»*.

### Dove mi sono discostato dal modello — dichiarato, perché è l'unico punto

Le due spie gemelle confrontano una migration con una **costante TypeScript**, perché lì la stessa
verità è scritta in **due posti vivi**. 🔑 **Qui no:** nessun modulo dell'app nomina la colonna
esente, e il secondo posto è la **decisione** (D323 + emendamento), non del codice. Inventare una
costante avrebbe creato un **consumatore finto** — cioè una seconda fonte della stessa verità, la
famiglia di difetto che questo progetto ha già pagato più volte. ➡️ L'insieme atteso è dichiarato
**nel file di prova**, che diventa il **verbale meccanico di D323**. Sta scritto nel cappello.

---

## 2. Le tre mutazioni viste diventare ROSSE — con l'output

🛑 **La ③ ha DUE forme e le ho provate entrambe** (v. §5, difetto 3 del brief). Sotto, l'output vero.

### ① Rimettere `- 'updated_at'` nel predicato — *la regressione che l'emendamento nomina per intero*

```
### MUTAZIONE M1 applicata
     × ① il predicato sottrae `post_consegna_correzioni` E BASTA — lato OLD 5ms
     × ① il predicato sottrae `post_consegna_correzioni` E BASTA — lato NEW 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: ⚖️ D323 + EMENDAMENTO (141ª tornata) — il predicato di `lavori_set_updated_at` deve
sottrarre `post_consegna_correzioni` E BASTA. Sottrarre anche `updated_at` pinza un UPDATE che assegna
SOLO quel campo: `lavoro_denti_sostituisci_atomica` fa DELETE+INSERT dell'intera collezione,
l'aggiornamento perso è TOTALE. NON è un refuso da sistemare: è la regressione che l'emendamento nomina
per intero.: expected [ 'updated_at' ] to deeply equal []
      Tests  2 failed | 7 passed (9)
```

### ② Cambiare la colonna esente (`post_consegna_correzioni` → `numero_cassetta`)

```
### MUTAZIONE M2 applicata
     × ① il predicato sottrae `post_consegna_correzioni` E BASTA — lato OLD 5ms
     × ① il predicato sottrae `post_consegna_correzioni` E BASTA — lato NEW 1ms
AssertionError: ⚖️ D323 + EMENDAMENTO (141ª tornata) — … : expected [ 'numero_cassetta' ] to deeply equal []
      Tests  2 failed | 7 passed (9)
```

### ③a Non riagganciare il trigger — *il difetto B1, forma «tolgo il `CREATE TRIGGER`»*

```
### MUTAZIONE M3a applicata
     × ③ il trigger è RIAGGANCIATO alla funzione nuova, dopo il DROP 2ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
Error: `CREATE TRIGGER trg_lavori_updated_at` non c'è in
supabase/migrations/20260808195344_lavori_gettone_solo_se_cambia.sql — ⚖️ D323 — la migration fa
`DROP TRIGGER` e DEVE riagganciarlo a `public.lavori_set_updated_at()`. Senza il riaggancio la
migration è un NO-OP VERDE (o peggio: `lavori` resta senza trigger) e ogni prova misura il
comportamento vecchio. È il difetto B1, già trovato una volta nel piano.
      Tests  1 failed | 8 passed (9)
```

### ③b Non riagganciare il trigger — *forma «lo riaggancio alla CONDIVISA»* (il no-op vero)

```
### MUTAZIONE M3b applicata
     × ③ il trigger è RIAGGANCIATO alla funzione nuova, dopo il DROP 3ms
AssertionError: ⚖️ D323 — la migration fa `DROP TRIGGER` e DEVE riagganciarlo a
`public.lavori_set_updated_at()`. … : expected '\n  BEFORE UPDATE ON public.lavori\n …'
to match /EXECUTE\s+FUNCTION\s+public\.lavori_s…/
      Tests  1 failed | 8 passed (9)
```

### Le altre cinque asserzioni — perché le ho rotte anche loro

🔑 **R-P4 applicata fino in fondo:** *una prova che non ho visto rossa non ho provato che protegga
qualcosa.* Le tre del brief accendono **4 asserzioni su 9**; le altre cinque le ho accese una per una.

| mutazione | che cosa rompe | asserzione accesa |
|---|---|---|
| **M4** | predicato **asimmetrico** (`OLD - 'a' - 'b'` vs `NEW - 'a'`) | ① lato OLD + **①-bis** |
| **M5** | i due rami **scambiati** (`THEN now()` / `ELSE OLD`) | **①-ter** |
| **M6** | la migration richiama `apply_updated_at_trigger('lavori')` | **la condivisa non è toccata** |
| **M7** | una **seconda migration** ridefinisce la funzione e riaggancia il trigger | **le due prove del puntatore stantio** |
| **M8** | il `COMMENT` perde il rimando alla sentinella della PATCH | **puntatore appeso** (`throw`) |
| **M9** | la sentinella della PATCH viene **rinominata** | **puntatore appeso** (`existsSync`) |

```
### MUTAZIONE M5 applicata
     × ①-ter il confronto è `IS NOT DISTINCT FROM`, e i due rami non sono scambiati 3ms
AssertionError: … expected '\n    NEW.updated_at = now();\n  ' to match /NEW\.updated_at\s*=\s*OLD\.updated_at/

### MUTAZIONE M6 applicata
     × la condivisa `trigger_set_updated_at` NON è toccata da questa migration 3ms
AssertionError: ⚖️ D323 — `trigger_set_updated_at()` è CONDIVISA da ~20 tabelle e NON si tocca …
expected '\n\nDROP TRIGGER IF EXISTS trg_lavori…' not to match /apply_updated_at_trigger/

### M7 — una SECONDA migration ridefinisce la funzione e riaggancia il trigger
     × nessun'ALTRA migration ridefinisce `lavori_set_updated_at` 10ms
     × nessun'ALTRA migration riaggancia `trg_lavori_updated_at` (né richiama `apply_updated_at_trigger`) 5ms
AssertionError: ⚖️ D323 — il corpo VIVO della funzione non sta più in
supabase/migrations/20260808195344_lavori_gettone_solo_se_cambia.sql: sposta il puntatore in testa a
questa spia, o proverà un testo che il database non esegue più.: expected [ Array(1) ] to deeply equal []

### M9 — la sentinella della PATCH viene RINOMINATA
     × il file che il `COMMENT` della funzione indica come sentinella esiste davvero 5ms
AssertionError: ⚖️ D323 + EMENDAMENTO — il `COMMENT` in banca dati rimanda a una sentinella che non
esiste più. È l'accoppiamento fra il trigger e la riga `payload.updated_at` della PATCH: se quella
prova è stata spostata, aggiorna il `COMMENT` nella migration; se è stata cancellata, D323 vale per metà.
```

🔑 **Il messaggio dice PERCHÉ, e l'output lo dimostra:** ogni fallimento porta in chiaro **⚖️ D323 +
EMENDAMENTO (141ª tornata)** e la ragione in una riga. Chi lo vede rosso fra sei mesi **non può**
scambiarlo per un refuso: la frase «*NON è un refuso da sistemare*» è dentro l'asserzione.

🛑 **Le due prove del «puntatore stantio» (M7) non me le ha chieste il brief, e sono il buco più
grande che ho trovato** — v. §5, difetto 2.

**L'albero è stato ripristinato dopo ogni mutazione** (`git checkout --` / `rm` / `mv` inverso):
`git status --short` al termine mostra **solo** il file nuovo.

---

## 3. L'accoppiamento col `PATCH` — che cosa ho deciso, e perché

**Decisione: la metà «rotta» resta dov'è; qui ci va il controllo di PUNTATORE. E il brief dava per
scoperto qualcosa che era già coperto.**

**Il fatto, misurato prima di decidere:** `tests/unit/lavori-patch-senza-updated-at.test.ts`
**esiste già** (nato col Task D-quater) e prova la metà «rotta» **per COMPORTAMENTO** — invoca
l'handler vero e pretende `expect(updatePayload).not.toHaveProperty('updated_at')`. Il `COMMENT` sulla
funzione, riga 172 della migration, **lo nomina come propria sentinella**.

**Perché non l'ho riscritta qui dentro:** l'unica forma che avrei potuto darle in una spia che legge
file è una **ricerca di testo nel sorgente della rotta**. È **strettamente più debole** della prova
che c'è (una riga che assegna `updated_at` per un'altra via non la vedrebbe), e sarebbe una **seconda
fonte della stessa verità** in un posto che può divergere. ➡️ Duplicarla avrebbe **peggiorato** la
protezione, non aumentata.

**Quello che invece NON era coperto, e adesso lo è:** che le due metà **si perdessero di vista**. Il
testo che vive **in banca dati** (`COMMENT ON FUNCTION`) rimanda a un percorso, e **nessuno
controllava che quel percorso puntasse ancora a qualcosa**. La prova estrae il percorso **dal testo
della migration** — non lo riscrive a mano, altrimenti sarebbero due stringhe che possono divergere —
e verifica che il file esista. **M8** (il rimando sparisce) e **M9** (il file viene rinominato) la
accendono entrambe.

⚠️ **Detto onestamente, perché è il confine della cosa:** questo è un **controllo di puntatore non
appeso**, **non una prova dell'accoppiamento**. La metà SQL è tenuta ferma qui, la metà rotta è tenuta
ferma là, e questa riga impedisce che una delle due sparisca senza che l'altra se ne accorga.
🛑 **Quello che NON copre** — ed è il rilievo **I2**, già noto e fuori mandato: **una rotta NUOVA** che
mettesse `updated_at` nel proprio carico si sfilerebbe dalla pinzatura in silenzio. La guardia contro
quello sarebbe un censimento di **tutti** gli scrittori di `lavori`, e non è questo compito.

---

## 4. FASE 7 — uscita letta da variabile

```
cd "…/ua-app" && npm run verify:full > "$LOG" 2>&1; ESITO=$?; echo "VERIFY_EXIT=$ESITO"

VERIFY_EXIT=0
 Test Files  450 passed | 6 skipped (456)
      Tests  5685 passed | 68 skipped (5753)
```

| | base dichiarata dal brief | dopo |
|---|---|---|
| prove passate | 5676 | **5685** (**+9**, esattamente le mie) |
| saltate | 68 | **68** (invariate — nessuna prova di integrazione toccata) |
| file | 455 | **456** (**+1**) |

🔴 **Una correzione a me stesso, e va scritta.** Il **primo** giro di FASE 7 l'ho lanciato come
`npm run verify:full 2>&1 | tail -40; ESITO=$?` — e quel `$?` legge l'uscita di **`tail`**, non di
`npm`: avrebbe detto `VERIFY_EXIT=0` **anche con la verifica rossa**. Me ne sono accorto e l'ho
rifatto nella forma sopra (redirezione su file, niente pipe). ⚠️ È esattamente la specie di difetto
che il brief chiede di evitare imponendo «*uscita da variabile*»: **la variabile non basta se in mezzo
c'è una pipe.**

---

## 5. 🔴 Dove questo brief sbaglia — tre difetti

### Difetto 1 — Il Passo 5 dà per SCOPERTO un accoppiamento che era già coperto a metà

> «*il trigger e la riga `payload.updated_at = new Date()…` di `PATCH /api/lavori/[id]` sono
> accoppiati… L'emendamento dice «serve una sentinella che li tenga insieme»: **questa è quella
> sentinella**.*»

**La metà «rotta» era già una sentinella, e per comportamento**, dal Task D-quater:
`tests/unit/lavori-patch-senza-updated-at.test.ts`. **La migration stessa la nomina** (riga 172), e il
sorgente della rotta pure (`src/app/api/lavori/[id]/route.ts:816`). ➡️ Un esecutore che avesse preso
il Passo 5 alla lettera avrebbe **riscritto qui una prova più debole di una che già c'era**, in un
secondo posto che può divergere — cioè avrebbe *diminuito* la protezione credendo di aggiungerla.
**Il buco vero era solo la metà SQL**, più il fatto che nessuno controllasse che il rimando reggesse.

### Difetto 2 — Il «perimetro minimo» guarda SOLO dentro il file, e lascia aperto il verde silenzioso

Le tre voci del Passo 2 stanno **tutte dentro** `20260808195344_…`. Nessuna protegge dal caso più
probabile nella vita vera: **una migration FUTURA** che ridefinisca `lavori_set_updated_at` o
riagganci `trg_lavori_updated_at`. In quel caso la spia — legata a un file, come vuole il modello —
resterebbe **VERDE su un corpo MORTO**, provando un testo che il database non esegue più.

🔑 **E non è un'ipotesi di scuola: è esattamente il pericolo che la migration dichiara di temere** nel
proprio `COMMENT` («*una pulizia futura non la «unifichi ai duplicati» riaprendo tutto in silenzio*»)
e che il modello stesso nomina come il modo in cui una spia muore («*un verde silenzioso*»).
➡️ Ho aggiunto **due prove** che il brief non chiedeva: nessun'altra migration ridefinisce la
funzione, nessun'altra riaggancia il trigger o richiama `apply_updated_at_trigger('lavori')`. Non
seguono il file più recente (sarebbe il verde silenzioso): **pretendono** che questa resti l'unica, e
dicono di spostare il puntatore. Accese da **M7**.

### Difetto 3 — «Non riagganciare il trigger» sono DUE mutazioni, e la conseguenza descritta vale solo per una

Il §1 dice: «*Non riagganciare il trigger… applicata così, la migration sarebbe **un no-op verde***».
**Vero per il blocco del piano vecchio**, che non toccava il trigger. **Falso per una mutazione del
file di oggi**, che comincia con `DROP TRIGGER IF EXISTS trg_lavori_updated_at`:

- **③a** — si toglie il `CREATE TRIGGER`: `lavori` resta **senza nessun trigger**, e `updated_at`
  **smette di muoversi per sempre**. Non è un no-op: è **peggio** del difetto originale.
- **③b** — si lascia il `CREATE TRIGGER` puntato alla **condivisa**: *quello* è il no-op verde.

Le due si accendono **in modo diverso** (③a fa scattare il `throw` di `corpoFunzione`, ③b una
`AssertionError`), e chi legge il resoconto deve saperlo. **Provate entrambe.**

---

## 6. Ritrovamenti fuori mandato — R-E2, riferiti e NON corretti

### F1 — `supabase/schema.sql:1000` può REVOCARE D323 in silenzio, e non c'è nessuna rete meccanica

`SELECT apply_updated_at_trigger('lavori');` è ancora lì. Chi ricostruisse lo schema da quel file
rimetterebbe la **condivisa** su `lavori` e riaprirebbe il difetto per intero. Il file **lo dichiara**
(righe 985-999, avviso lungo e corretto) — ma **è prosa**, ed è la stessa prosa che il rilievo I1 ha
misurato non accendersi.

🛑 **Perché NON l'ho messo nella spia, e la scelta è deliberata:** l'unica forma possibile sarebbe
«controlla che l'avviso sia ancora vicino a quella riga», cioè asserire **che un commento c'è**. Ogni
altra asserzione di questo file guarda **ciò che il database esegue**, e il modello dice a chiare
lettere di non guardare *ciò che il file racconta*. Una prova che diventa rossa perché qualcuno ha
ri-mandato a capo un commento **insegna a modificare la prova**. ➡️ Va risolto altrove: o `schema.sql`
smette di essere ricostruibile alla lettera, o l'avviso diventa un `RAISE`/una guardia dedicata.

### F2 — `src/hooks/useLavoroForm.ts:392-393`: un commento vivo che descrive un comportamento rimosso da D323

> «*anche la PATCH scrive `updated_at` (route.ts:382, poi il trigger `trg_lavori_updated_at`)*»

**Due cose non vere oggi:** la PATCH **non scrive più** `updated_at` (D323 ha tolto la riga), e
`route.ts:382` non è più quel punto (il blocco vive intorno a **riga 802**). Il **riallineamento che
il commento giustifica resta giusto** — la rotta restituisce comunque il gettone e il trigger può
averlo mosso — ma la **ragione scritta accanto è scaduta**, ed è il modo classico in cui una pulizia
futura toglie una riga corretta credendo di togliere un residuo.
⚠️ Diverso dal `useLavoroForm.ts:291` (`?? null`) già elencato fra i noti: quello è un altro punto.

### F3 — Due commenti storici in migration passate ora dicono il falso (minore, nessuna azione proposta)

`20260727120300_lavori_denti_rpc.sql:109` e `20260808093513_correggi_e_riemetti_atomica.sql:98`
descrivono `trg_lavori_updated_at` come collegato a `trigger_set_updated_at()` che fa
`NEW.updated_at = now()` incondizionato. **Da D323 non è più così.** 📌 Le lascio: una migration è il
**verbale di quel giorno**, e riscriverla a posteriori è peggio del difetto. Lo segnalo perché chi le
legge per capire il presente si sbaglierebbe — e la ③ dell'ironia è che il commento del 27/07 aveva
**previsto per iscritto** proprio l'aggiornamento perso che l'emendamento ha poi misurato.

---

## 7. Che cosa NON ho fatto

- ❌ **Nessuna migration nuova**, e non è servita: il database è già a posto (mandato esplicito).
  Il file `20260809999999_finta_pulizia_unifica_duplicati.sql` è **esistito 4 secondi** dentro la
  mutazione M7 ed è stato cancellato — non è mai stato salvato né applicato.
- ❌ **FASE 9 e gate estetico L2**: fuori mandato (Task D-bis, dopo di me). Nessuna superficie toccata:
  la consegna è un solo file di prova.
- ❌ **Nessuna correzione ai ritrovamenti del §6** (R-E2): riferiti, non toccati.
- ❌ **Non ho riscritto la metà «rotta» dell'accoppiamento** nella spia — motivo per esteso al §3.
- ❌ **Non ho messo `schema.sql` nella scansione** delle prove «nessun'altra migration»: contiene
  legittimamente `apply_updated_at_trigger('lavori')` come storia della tabella, e includerlo avrebbe
  richiesto una deroga scritta apposta — cioè una prova che nasce con la sua eccezione. F1 al §6.
- ❌ **Non ho aggiornato `MEMORY.md` / `ROADMAP-UFFICIALE.md`** (BP-1): questo è un task di un'ondata
  in corso, l'allineamento è dell'orchestratore a fine ondata.
- ❌ **Nessuna prova di integrazione** (`tests/integration/**`): si salta da sola senza
  `SUPABASE_DB_URL`, quindi **non fermerebbe nulla in CI** — è l'onestà n°1 del rilievo I1, e regge.
