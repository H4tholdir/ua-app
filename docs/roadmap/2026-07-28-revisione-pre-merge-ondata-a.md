# Revisione pre-merge dell'ondata (a) — 28/07/2026

**Ramo:** `ondata-a-denti-colore` contro `main` (`24474b5c`) · **65 file, +12.180 / −214** · mai mergiato.
**Stato alla revisione:** 13 task su 13 + tre code · vitest **3584** · `tsc` 0 · `eslint` 0 · `next build` ok.

## Come è stata fatta, e perché non con lo strumento previsto

🛑 **La skill `ua-app:review` non è utilizzabile così com'è** — ma ⚠️ **la prima diagnosi era
SBAGLIATA e va letta nella forma corretta**, altrimenti porta a cancellare la cosa sbagliata.

**Prima diagnosi (errata):** «gstack non esiste, la skill è un guscio».
**Fatto verificato:** **gstack C'È, completo**, in **`ua-app/.agents/skills/gstack/`** — checklist,
`greptile-triage.md`, `design-checklist.md`, la cartella `specialists/`, i binari `bin/`. Il symlink
tracciato `.claude/skills/gstack` → `../../.agents/skills/gstack` risolve e funziona.
**Il difetto vero è di PERCORSI:** il `SKILL.md` della review cerca la checklist in
`.claude/skills/review/checklist.md` (dove c'è **solo** `SKILL.md`) e richiama **64 volte**
`~/.claude/skills/gstack/…`, cioè la **home dell'utente** — dove gstack **non** è installato.
Le due copie del `SKILL.md` (quella in `.claude/skills/review/` e quella dentro gstack) sono
**identiche**, e sbagliano allo stesso modo: **installazione in modalità progetto, skill scritte per
la modalità home**.
🔑 **La lezione è più fine di «una capacità dichiarata che non esiste»:** qui la capacità **esiste
per intero** e non si raggiunge, perché il percorso è scritto per un'installazione diversa. Il
sintomo è identico (la skill si ferma), la cura no: non si cancella, **si aggancia** — oppure si
toglie la scorciatoia rotta, ma è una decisione di Francesco, non una pulizia meccanica.

**Sostituita da tre revisori indipendenti a contesto fresco**, mandati in parallelo, ognuno con un
mandato disgiunto e l'istruzione di **non correggere nulla**: ① sicurezza, isolamento fra laboratori,
SQL · ② disaccordi fra superfici ed effetti condizionali · ③ **forza reale dei test**, misurata con
abbozzi inerti. Tutti e tre con SQL diretto per provare le proprie ipotesi (solo letture o
transazioni annullate; baseline 294 lavori / 0 denti verificata intatta a fine revisione).

---

## ✅ ESITO — tutte e cinque le correzioni decise da Francesco sono CHIUSE (28/07/2026)

| # | esito | commit | la prova che conta |
|---|---|---|---|
| **G1** | ✅ | `9254288c` | il rifacimento **clona le righe** e copia il colore di caso; provato in transazione annullata, 5 righe su 5, `provenienza` conservata. 🛑 `colore_dente` **si continua a copiare**: in produzione gira `main`, che legge ancora quella colonna |
| **G2** | ✅ | `8d5e90ba` | le **7 forme** ora danno **422 da entrambe le porte**, con lo **stesso messaggio e lo stesso valore**. Modulo unico `src/lib/domain/denti-validazione.ts` |
| **G3** | ✅ | `98db9114` | la guardia sull'embed **ignora i commenti**. Misurato dall'orchestratore: tolta la riga vera → **rossa**; prima restava verde |
| **M1** | ✅ | `0c5b8db9` | gettone obbligatorio **sulla porta** (422 se assente/vuoto). La RPC resta permissiva **di proposito**: non ha un esito per «non hai mandato la chiave», e `conflitto` sarebbe una bugia |
| **M2** | ✅ | `64615027` | «*Non sono riuscita a salvare il colore. Lo aggiungi dalla scheda.*» — forza provata **col sabotaggio**: 4 rossi forzando l'avviso, 14 forzandolo al contrario |

**FASE 7 rieseguita dall'orchestratore dopo l'ultima correzione:** `tsc` 0 · `eslint` 0 ·
`next build` ok · **vitest 3622 passati / 19 saltati** · **DB alla baseline (294 lavori, 0 denti)**.

🔑 **Il fatto che il G2 ha scoperto e che cambia la natura della correzione:** non bastava
**validare**, serviva **normalizzare**. Provato sulla RPC vera: `{scala:'  vita_classical  ',
codice:' A3 '}` → **`23503 lavori_denti_colore_fk`, lavoro perso**; la stessa coppia normalizzata →
`{"esito":"ok"}`. Stringhe con spazi **superano ogni controllo di forma**: il `.trim()` è la
differenza fra lavoro creato e lavoro perso.
⚠️ **Onestà sul metodo, dichiarata dall'esecutore:** il «500 sul POST» della colonna PRIMA era
**derivato in due passi** (abort della RPC osservato in banca dati + la riga della route che lo
traduce in 500), **non** osservato in un colpo solo — sotto mock il POST rispondeva 201. **È
esattamente per questo che il difetto si vedeva solo andando sul database vero.**

### 🔴 Restano aperti, con una casa scritta
- **Il catalogo non è chiuso** (coppia valida ma inesistente → 500 da entrambe): **non** è
  un'estrazione ma **un progetto**, perché l'esito corretto è **asimmetrico** — sul PUT rifiutare non
  perde nulla, sul POST perderebbe **il lavoro**, quindi lì va **scartato e detto**, e il campo per
  dirlo non esiste (`colore_scartato` parla del colore di **caso**). Scartare in silenzio ricreerebbe
  M2. → **ondata (b), col suo panel.**
- **`codice:'a3'` minuscolo non viene alzato sul percorso dei denti** (solo il colore di caso lo è):
  stesso «digitato di fretta al banco», stessa perdita di lavoro sul POST. → ondata (b).
- **Lo stesso difetto di M2 è sulla PATCH della scheda** (`[id]/route.ts` riceve `scartato` e lo
  butta): il canale ora **esiste**, basta rimandarlo nella risposta.
- **`gruppo`/`gruppo_ruolo`:** il modulo nuovo è un'**allowlist per entrambe le porte** — chi un
  domani le farà scrivere deve aggiungerle **anche lì**, o il dato sparisce in silenzio (classe
  `PATCHABLE_FIELDS`, R-P6). La destinazione è scritta accanto al nome.
- I **6 medi e 6 minori** non selezionati da Francesco restano sotto, con `file:riga`.

---

## 🔴 GRAVI — erano da chiudere prima del merge (✅ tutti e tre chiusi, v. tabella sopra)

### G1 · Il rifacimento perde i denti e il colore, e le sentinelle del ramo affermano il contrario
`crea_rifacimento_atomico` (migration `007`) è **una terza penna** sulle sette colonne. Copia
`colore_dente` e `denti_coinvolti` dal lavoro originale, **non** copia `colore_scala`/`colore_codice`
e **non** clona le righe di `lavori_denti`.
**Verificato dall'orchestratore sul catalogo vivo:** `prosrc ilike '%colore_dente%'` → **1**;
`prosrc ilike '%lavori_denti%'` → **0**.
🛑 **Smentisce due righe scritte dal ramo:** `src/app/api/lavori/[id]/route.ts:118` («QUESTE QUATTRO
COLONNE non hanno più nessuno scrittore») e `:164`. **È un fallimento R-P6** — censimento fatto sulle
colonne e non su **chi le tocca** — e il ramo *sapeva* della funzione: la nomina in
`20260727120200_lavori_colore_caso.sql:71`, ragionando però solo sulla colonna della DdC.
**Cosa vede l'utente:** `rifacimento/route.ts:9` elenca `'colore_sbagliato'` come **primo** motivo
ammesso. Il lavoro rifatto nasce con l'odontogramma pieno (dalla colonna copiata) e **la casella del
colore vuota** — proprio nel caso in cui il colore è la ragione del rifacimento.
⚠️ **La metà latente è peggiore:** il lavoro nuovo ha `denti_coinvolti` valorizzato e **zero righe**
in `lavori_denti`; il cancello dell'impronta (`useLavoroForm.ts:257`) fa sì che un salvataggio non
clinico non spedisca mai il PUT, quindi le righe **restano vuote per sempre**. All'ondata (c), quando
DdC e scheda passeranno a leggere le righe, ogni rifacimento creato da oggi diventa un lavoro **senza
denti su un documento a valore legale**.
**Correzione:** la RPC copia `colore_scala`/`colore_codice`, clona le righe di `lavori_denti`
(conservando `provenienza`), e smette di copiare `colore_dente`.

### G2 · Un dente scritto male fa perdere IL LAVORO, non il colore
Il `POST /api/lavori` valida **solo** `fdi` e i duplicati, poi passa l'oggetto **grezzo** alla RPC
(`route.ts:200`, `dentiIn.push(d)`), mentre il `PUT` gemello valida `ruolo`, `provenienza`, i cinque
campi testo, `coppia_ck` e `zone_ck`. E `lavoro_crea_atomico` **non ha exception handler** attorno
all'INSERT dei denti (dichiarato, `20260727120300:82-84`): un vincolo violato **aborta l'intera
funzione**.
**Misurato su 7 forme, 7 su 7:** `{fdi:11, ruolo:'pippo'}` · `provenienza:'boh'` · `scala:123` ·
mezza coppia · zona senza base · `codice:'   '` · `scala:{a:1}` → **422 sul PUT, e dal vero un 500
col messaggio Postgres crudo sul POST, con il lavoro che non nasce affatto.**
🛑 **È l'opposto della regola dura del ramo** (`colore-caso.ts:17`: «si perde IL COLORE, non il
lavoro»). Oggi non è raggiungibile dall'unico client vivo (il wizard manda solo costanti buone) — ma
il POST è una superficie API, e l'ondata (b) porta il colore per dente proprio lì.
✅ **Conseguenza fiscale esclusa, verificata:** `genera_progressivo` è un UPSERT su
`progressivi_anno`, non un `nextval` — l'abort annulla anche l'incremento. Nessun buco nella serie.
**Correzione:** è il **T11-bis**, che era stato messo *fuori* da questo deploy. **La conseguenza
scoperta oggi lo riporta dentro.**

### G3 · Un test che non può fallire — e a disarmarlo è stato il commento che lo spiega
`tests/unit/lavoro-form-colore-idratazione.test.tsx:126` fa
`expect(readFileSync(f)).toContain('denti:lavori_denti(*)')` su due file. **Verificato
dall'orchestratore:** quella stringa compare **due volte in ciascuno** — nel **commento** (`modifica/
page.tsx:10`, `[id]/route.ts:266`) e nel codice vero (`:55`, `:306`).
**Misurato dal revisore:** tolta la riga vera dalla select in **entrambi** i file → `5 passed (5)`,
zero rossi.
**Cosa proteggeva:** senza l'embed, `idrataColoreScheda` riceve `undefined` e la scheda torna a
mostrare le colonne orfane — l'utente scrive un colore, lo salva davvero, ricarica e vede tornare il
vecchio. **Cioè esattamente il difetto che quel test esiste per impedire.** Terza volta in questa
ondata che si trova un test incapace di fallire.
**Correzione:** ancorare la guardia al codice, non al testo del file (o cercare una stringa che nel
commento non compare).

---

## 🟠 MEDI

- **M1 · Il lucchetto anti-sovrascrittura è facoltativo.** `20260727120300:61` —
  `IF p_atteso_updated_at IS NOT NULL AND …`: se il gettone non arriva, **nessun controllo**. La route
  lo permette (`denti/route.ts:95-98`, `?? null`). **Riprodotto:** due chiamate con `NULL`, entrambe
  `ok`, la seconda ha cancellato il dente della prima. Il PUT è a **sostituzione integrale**: chi non
  manda la chiave cancella la lista di un collega e riceve 200. **Correzione:** 422 se assente.
- **M2 · Il colore digitato male sparisce senza una parola.** `colore-caso.ts:70` degrada, ma il POST
  non lo comunica e `FrameFatto` non ha un'etichetta per il colore (verificato: `ETICHETTE_ACCESSORIO`
  conosce solo `elementi` e `foto`). Al banco si digita `A3,5` con la virgola: lavoro creato, colore
  buttato, schermata «Fatto!». La regola «si perde il colore, mai il lavoro» giustifica il **non far
  fallire**, non il **non dirlo** — e il canale esiste già a tre righe di distanza.
- **M3 · La traccia «prescritto dal dentista» si perde a ogni modifica.** `useLavoroForm.ts:172`
  scrive `provenienza:'eseguito'` su **tutte** le righe, anche i denti non toccati (conseguenza della
  sostituzione integrale). La colonna esiste apposta perché il precheck di consegna possa dire «questo
  colore non è mai stato confrontato con la prescrizione»: dopo una qualsiasi modifica dalla scheda,
  quel controllo non distingue più. **Rileva per l'ondata (c).**
- **M4 · La «stretta di mano» copre una funzione, non il wizard.** `lavori-post-atomico.test.ts:366`
  ricostruisce `ruolo`/`provenienza`/normalizzazione **a mano** invece di prenderli da
  `creaLavoroDaWizard`: se domani il wizard smettesse di mandare `provenienza`, entrambe le metà
  restano verdi. Il ponte vale per l'uscita di `mappaElementi` e basta. **E sul lato PUT non c'è
  nessun ponte.**
- **M5 · Un test che può passare eseguendo ZERO asserzioni.** `crea-lavoro-denti.test.ts:151-166`: il
  ciclo non gira se non c'è nessuna chiamata, e tutte le asserzioni sono negative. Il file accanto ha
  la forma giusta (`lavoro-form-denti-endpoint.test.ts:70-78` lancia se la PATCH manca).
- **M6 · I decidui sono invisibili proprio dove si correggono.** `OdontogrammaFDI.tsx:721` parte
  sempre da `'adulto'` e `:810` filtra il riepilogo sulla dentizione mostrata. Un `5.5` scritto nel
  wizard ora arriva davvero in banca dati (dominio a 52 codici), la scheda v3 mostra il chip **55**, e
  l'odontogramma è **spento**. Non è perdita (i gestori filtrano l'array intero), è invisibilità.

## 🟢 MINORI

- **m1 · La PATCH è l'unica delle tre a non difendersi da un corpo non-oggetto** (`[id]/route.ts:350`):
  `JSON.parse('null')` non lancia, e `hasOwnProperty.call(null, …)` sì → **500 invece di 400**. Il
  ramo ha chiuso questa classe negli altri due file nello stesso commit. **Trovato da due revisori
  indipendenti.**
- **m2 · La guardia tenant salta silenziosamente sui tipi non-stringa** (`lavori/route.ts:152`,
  `if (fkId && typeof fkId === 'string')`). Oggi non sfruttabile (il cast `::uuid` uccide la
  richiesta), ma è **fragile per costruzione**: la condizione dovrebbe rifiutare, non saltare.
- **m3 · `colore_scala` non-stringa viene trattata come assente**: `'pippo'` perde il colore, `999` /
  `true` / `{}` lo **tengono** con la scala dedotta. Solo il ramo stringa è coperto dai test.
- **m4 · Commento ormai falso** in `colore-dente-idratazione.test.ts:105-116` (dichiara permanente un
  limite chiuso dal T12-bis). **m5 · `provenienza` validata e mai provata** sul PUT. **m6 ·
  `numero_lavoro` mancante con `esito:'ok'`** non è coperto: il client mostrerebbe `undefined`.

---

## ⚙️ Fatto di processo, non un difetto — ma va ratificato

🛑 **Le migration dell'ondata sono GIÀ APPLICATE sul progetto Supabase vivo** (`iagibumwjstnveqpjbwq`,
lo stesso che `CLAUDE.md` §1 indica come produzione). **Verificato dall'orchestratore:**
`to_regclass('public.lavori_denti')` non è nullo, e la colonna `dichiarazioni_conformita.colore_dente`
**non esiste più** — un `DROP COLUMN` **irreversibile** su una tabella di documenti a valore legale.
La frase «niente in produzione» è vera per il **codice** e **falsa per lo schema**.
✅ **Oggi non rompe nulla**, verificato su `main`: nessun codice scrive quella colonna.
⚠️ **Ma:** se il ramo non venisse mergiato, un `git revert` **non riporterebbe indietro lo schema**.
Il rischio sul *dato* resta basso (`CLAUDE.md` §8: dati di prova, si ripuliscono alla consegna); il
punto è che vada **saputo e messo per iscritto**, non scoperto dopo.

## ✅ Dove il lavoro regge — con cosa è stato controllato

- **Isolamento fra laboratori: nessun secondo buco.** `p_lab` in **ogni** `WHERE` di entrambe le RPC ·
  attacco cross-tenant **riprodotto** (`{"esito":"non_trovato"}`, zero righe) · `p_denti` non può
  iniettare il tenant (liste di colonne fisse) · `laboratorioId` non è influenzabile dal client ·
  **tutti i 115 `route.ts`** scansionati per `.eq('id', …)` senza filtro laboratorio: 19 riscontri,
  **tutti pre-esistenti e fuori dall'ondata** · l'embed sulla FK **composita** provato via HTTP (200).
- **SQL injection: nessun rilievo.** Nessun `EXECUTE`, nessun `format()`, nessuna stringa costruita
  nelle quattro migration; i valori passano da `URLSearchParams`.
- **Permessi delle RPC: corretti.** `prosecdef=t`, `search_path=public, pg_temp`, `proacl` solo
  `postgres`/`service_role`. `lavori_denti`: RLS attiva, `service_role` non può scrivere direttamente.
- **Il difetto della data è chiuso davvero:** reintrodotto `new Date().getFullYear()` → **1 test su
  21 rosso**, quello giusto (`expected 2026 to be 2027`), e `vi.stubEnv('TZ','UTC')` sposta davvero
  l'orologio su questa macchina.
- **La sentinella dell'allowlist ha il suo controllo positivo:** 7/9 rossi rimettendo i sette nomi.
- **Gli 8 test modificati dal ramo, uno per uno: nessuno ammorbidito** per farlo passare. Due sono
  diventati **più** specifici. Uno ha cambiato proposizione (da «errore di rete a metà sequenza» a
  «elemento illeggibile») per forza di cose, e va saputo.

## 📌 Nota latente (non un rilievo)

Quando le righe portano il colore, `lavori.colore_scala`/`colore_codice` restano al valore vecchio.
L'argomento a difesa («un caso rimasto indietro dietro righe colorate non è leggibile») è corretto
**solo perché oggi esiste un unico lettore del caso** — cioè è una validità **condizionata a un fatto
che l'ondata (b) cambia**, quando il colore diventerà per dente. Va nell'eredità della (b).
