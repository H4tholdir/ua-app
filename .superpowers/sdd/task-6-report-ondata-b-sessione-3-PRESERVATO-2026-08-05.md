# Task 6 — Referto · «La lettura per la scheda (server)»

**Ramo:** `ondata-b-sessione-3` (nessun worktree) · **Data:** 04/08/2026 (orologio: `date` → `Tue Aug 4 23:12:03 CEST 2026`)
**Esito:** 🟢 completo per il mandato dato (la route) — con un difetto di premessa nel brief, riferito qui come richiesto (R-E2).

---

## 0. LA COSA PIÙ IMPORTANTE — il brief presume un lettore che non c'è

**Il fatto ① del brief** («GET /api/lavori/[id] ... la scheda non ha oggi NESSUNA via di lettura
dello snapshot») è vero, ma la conclusione implicita — che estendere QUESTA route dia alla scheda
quella via — **non lo è**. `src/app/(app)/lavori/[id]/page.tsx:21-41` (il Server Component che
renderizza `/lavori/[id]`) esegue una **sua propria query Supabase diretta**, non chiama
`GET /api/lavori/[id]`. Prova: censimento fatto **prima** di scrivere codice — nessun file del repo
importa `GET` da questa route (`grep` mirato, zero hit prima di questo task).

**Conseguenza per T7:** dopo questo task, `GET /api/lavori/[id]` sa leggere `prescrizione`, ma
**la scheda continua a non vederla**, perché non passa da qui. Il fatto ① del brief resta vero
anche a Task 6 chiuso, per la pagina reale.

**Perché non l'ho corretto (R-E1/R-E2):** il brief nomina esplicitamente
`src/app/api/lavori/[id]/route.ts` come il file da estendere e dice «NON costruire UI» — la pagina
è UI-adiacente (Server Component, firma di route Next.js diversa, comportamento SSR) e toccarla è
un salto di mandato, non un dettaglio dello stesso task.

**Cosa deve fare T7, in concreto — una delle due:**
1. Aggiungere `prescrizione:lavori_prescrizioni(*)` al select di `page.tsx:23-35` e chiamare
   `normalizzaPrescrizione` (`@/lib/domain/prescrizione-mapper`) sul risultato, esattamente come
   `page.tsx:56-57` già fa per `ddc` — la funzione è già pronta e testata, il costo è collegarla;
2. **oppure** far leggere la pagina da `GET /api/lavori/[id]` invece che da una query propria (un
   cambio più grande, non deciso qui).

La scelta di mettere `normalizzaPrescrizione` in `src/lib/domain/` (non inline nella route) invece
di duplicarla è **apposta per rendere l'opzione 1 economica**: T7 importa una funzione pura già
provata, non riscrive la normalizzazione una seconda volta.

---

## 1. Cosa è stato fatto

### 1.1 `src/lib/domain/prescrizione-mapper.ts` (nuovo)
`normalizzaPrescrizione(raw: unknown): LavoroPrescrizione | undefined` — funzione pura, modello
`risolviColore` (`colore-dente.ts`). Normalizza QUALUNQUE forma dell'embed PostgREST (oggetto,
array con 0/1/N elementi, `null`, `undefined`, valore inatteso) in un `LavoroPrescrizione` singolo
o `undefined` (mai un oggetto vuoto — V2). Guardia runtime su `fonte_tipo` via `isFonteTipo`
(casa unica `prescrizione-costanti.ts`): un valore fuori dalle 4 forme di D202 è letto come `null`
con un `console.warn` (spia, non cast cieco) — impossibile per il CHECK di tabella, ma il tipo
generato è `string | null` (R27), quindi la guardia difende un caso che il database non dovrebbe
mai produrre.

⚠️ **Riformulato dopo la review interna:** i commenti affermavano come fatto che «PostgREST
restituisce l'embed come ARRAY» deducendolo da `isOneToOne: false` nei tipi generati. È
un'**inferenza**, non una prova a banco (R-P1: un blocco senza marchio è non provato) — la stessa
riserva che `page.tsx:51-55` scrive già per `ddc` («mai verificato empiricamente»). Corretto in
entrambi i file (mapper + route) a «l'attesa è…», con la frase esplicita che la funzione normalizza
ENTRAMBE le forme apposta, cosicché il codice resti corretto anche se l'inferenza fosse sbagliata.

### 1.2 `src/types/domain.ts`
- **`PrescrizioneContenuto`** (nuovo): `{ elementi?: number[]; colore?: string; tipo?: string }` —
  dedotto da `componiSnapshot` (`elementi`/`colore`) e da
  `lavoro_prescrizione_conferma_consegna` (`tipo`, migration `20260804152403:357-360`).
- **`Divergenza`** (nuovo): `{ campo: CampoTypo; motivo: MotivoDivergenza; nota: string | null;
  utente_id: string; registrata_at: string }` — forma fissata dal `jsonb_build_object` della RPC
  `lavoro_prescrizione_registra_divergenza` (migration `20260804211256:85-91`), non inventata.
- **`LavoroPrescrizione`**: `contenuto`/`divergenze`/`fonte_tipo` ora tipizzati (erano
  `Record<string, unknown>` / `unknown[]` / una QUARTA copia a mano dell'unione). `fonte_tipo` ora
  è `FonteTipo | null`, importato da `src/lib/domain/prescrizione-costanti.ts` (casa unica, T4) —
  non ridichiarato.
- **`LavoroDettaglio.prescrizione?: LavoroPrescrizione`** (nuovo) — opzionale sul modello di
  `denti?`.
- **`LavoroImmagine.categoria: string` → `CategoriaFoto`** — tutti gli scrittori già validavano con
  `isCategoriaFoto` prima di questo task (`immagini/route.ts:98`, `immagini/[imgId]/route.ts:75`);
  il tipo ora lo dichiara.
- Import in testa al file da `@/lib/domain/categorie-foto` e `@/lib/domain/prescrizione-costanti`
  (prima `domain.ts` non importava nulla — nessun rischio di ciclo: verificato che nessuno dei due
  moduli importi da `@/types/domain`, e che `@/lib/domain/tipi-lavoro.ts` già importa DA
  `@/types/domain` nella direzione opposta senza problemi).

### 1.3 `src/app/api/lavori/[id]/route.ts` — GET
- Select esteso con `prescrizione:lavori_prescrizioni(*)`.
- Dopo il fetch: `lavoro.prescrizione = normalizzaPrescrizione(lavoro.prescrizione)` — stessa forma
  di riassegnazione già usata per `ddc` in `page.tsx:57`.
- Commento sopra `GET` esteso con la spiegazione UNIQUE-vs-FK-composita (§1.1 sopra).
- **Un secondo effetto collaterale onesto, in mandato:** il commento sopra `PATCHABLE_FIELDS`
  (righe 26-33) elenca le chiavi relazionali che il GET restituisce e che il PATCH scarta in
  silenzio (comportamento sicuro, allowlist — nessun 500). Ho aggiunto `prescrizione` a
  quell'elenco, perché è la mia modifica a renderlo incompleto altrimenti. Scrivendo la riga ho
  trovato che **`denti` mancava già da quell'elenco da prima di questo task** (l'embed è del
  Task 10, mai aggiunto lì) — **non l'ho aggiunto**: è un difetto preesistente fuori mandato,
  segnalato con una riga di commento nel file e qui (R-E2).

---

## 2. TDD — R-P4, entrambe le misure fatte con l'abbozzo inerte

### 2.1 `tests/unit/prescrizione-mapper.test.ts` (nuovo, 15 test)
Abbozzo: `normalizzaPrescrizione` che ritorna sempre `undefined`.
```
npx vitest run tests/unit/prescrizione-mapper.test.ts
```
**9 rosse su 14** (all'epoca della misura, prima dell'aggiunta del test array>1 fatta dopo la
review — con quel test in più il totale sale a 15, non rimisurato perché la sua natura è identica
alle 9 già contate: muore sull'abbozzo per costruzione, prende sempre l'unico elemento che
l'abbozzo non ha). Le 5 verdi a vuoto sono le uscite anticipate che l'abbozzo imita per costruzione
(`null`/`undefined`/`[]` in ingresso → `undefined` in uscita, e i due input non-oggetto). Le 9 rosse
sono la prova vera: oggetto singolo, array con un elemento (in due varianti di contenuto),
divergenze con più voci, divergenze vuote, le 4 forme valide di `fonte_tipo`, il fuori-unione letto
come `null`, e la spia `console.warn` chiamata.

Dopo l'implementazione vera: **14 verdi su 14** (poi **15 su 15** con l'aggiunta post-review).

### 2.2 `tests/unit/lavori-id-route-get-prescrizione.test.ts` (nuovo, 5 test)
Nessun test esisteva per `GET` di questa route prima di oggi (censito: `lavori-id-route.test.ts`
testa solo `PATCH`). Abbozzo: la riga
`lavoro.prescrizione = normalizzaPrescrizione(lavoro.prescrizione)` commentata nella route (la GET
torna a restituire la forma grezza, come prima del task).
```
npx vitest run tests/unit/lavori-id-route-get-prescrizione.test.ts
```
**3 rosse su 5** (misurato due volte: una prima di scrivere la riga vera, e una seconda volta
ri-commentandola apposta dopo — stesso risultato entrambe le volte, `3 rosse su 5`). Le 2 verdi
sono: il select nomina l'embed (non tocca la normalizzazione) e «il resto della risposta resta
intatto» (vera anche senza normalizzazione, perché non tocca `numero_lavoro`/`descrizione`). Le 3
rosse provano la normalizzazione vera: array→oggetto singolo, array vuoto→assente dal JSON,
`null`→assente dal JSON.

Con la riga riattivata: **5 verdi su 5**.

Questo secondo file chiude il rischio «funzione di mapping scritta ma mai collegata alla route» —
la stessa classe di difetto silenzioso di un campo tolto da un'allowlist senza destinazione (R-P6).

---

## 3. Fix applicati dopo la review interna (prima del commit)

1. **Softening della riformulazione «PostgREST restituisce un ARRAY»** da fatto a inferenza
   dichiarata (§1.1) — sia nel commento del mapper sia in quello della route.
2. **Test `fonte_tipo` non più hardcoded**: `for (const valore of ['foglio', 'email', 'modulo',
   'piattaforma'])` → `for (const valore of FONTE_TIPI)`, importato dalla casa unica. Prima una
   quinta forma aggiunta in banca dati sarebbe passata dal test senza che il test la coprisse
   davvero (la spia di migrazione sorveglia solo `prescrizione-costanti.ts`, non i test che lo
   copiano a mano). Aggiunta anche una sentinella `expect(FONTE_TIPI.length).toBe(4)`.
3. **Aggiunto un test per array con più di un elemento** (impossibile per `UNIQUE(lavoro_id)`, ma
   il tipo TypeScript non lo esclude): dichiara esplicitamente «si prende il primo» invece di
   lasciarlo indefinito per omissione.
4. **`PATCHABLE_FIELDS`**: aggiunto `prescrizione` all'elenco delle chiavi relazionali scartate dal
   PATCH (§1.3), e segnalato (non corretto) che `denti` mancava già.

---

## 4. Verifiche — output reale

| Comando | Esito |
|---|---|
| `npx vitest run tests/unit/prescrizione-mapper.test.ts tests/unit/lavori-id-route-get-prescrizione.test.ts tests/unit/lavori-id-route.test.ts` | **41 passed** (0 failed) |
| `npx tsc --noEmit` | **0** errori (exit 0, rieseguito 3 volte: dopo l'implementazione, dopo i fix di review, dopo il commento PATCHABLE_FIELDS) |
| `npx vitest run` (suite intera) | **405 file passed \| 3 skipped** (408) — **4728 passed \| 19 skipped** (4747), exit 0 |
| `npx next build` | **exit 0**, tutte le route compilate incluse `/api/lavori/[id]` — nessun errore di firma handler |

L'unica riga di rumore nella suite intera, `Not implemented: navigation to another Document`, è di
jsdom ed è preesistente (non nasce da questo task).

---

## 5. File toccati

| File | Cosa |
|---|---|
| `src/lib/domain/prescrizione-mapper.ts` | **nuovo** — `normalizzaPrescrizione`, funzione pura |
| `src/types/domain.ts` | `PrescrizioneContenuto` + `Divergenza` (nuovi), `LavoroPrescrizione` tipizzato (era `Record<string, unknown>`/`unknown[]`/quarta copia dell'unione), `LavoroDettaglio.prescrizione?` (nuovo), `LavoroImmagine.categoria` → `CategoriaFoto`, due import in testa |
| `src/app/api/lavori/[id]/route.ts` | select GET esteso con `prescrizione:lavori_prescrizioni(*)`, normalizzazione dopo il fetch, commento `GET` esteso, `prescrizione` aggiunto all'elenco di `PATCHABLE_FIELDS` (riga di commento) |
| `tests/unit/prescrizione-mapper.test.ts` | **nuovo** — 15 test sulla funzione pura |
| `tests/unit/lavori-id-route-get-prescrizione.test.ts` | **nuovo** — 5 test di wiring sulla route GET |

---

## 6. R-E2 — ritrovamenti FUORI mandato (riferiti, NON corretti)

0. **Vedi §0 sopra — è il più importante, ripetuto qui per il formato standard del referto:** la
   scheda (`page.tsx`) non consuma questa route; il fatto ① del brief resta vero anche a task
   chiuso. T7 deve collegare `page.tsx` a `normalizzaPrescrizione` (o alla route) esplicitamente.

1. **`denti` manca dall'elenco di commento sopra `PATCHABLE_FIELDS`** (righe 26-33 di
   `route.ts`) da prima di questo task — l'embed `denti:lavori_denti(*)` è del Task 10, mai
   aggiunto a quell'elenco. Comportamento a runtime **sicuro** (l'allowlist scarta comunque la
   chiave, come per `prescrizione` prima di oggi): è un difetto di documentazione, non di
   comportamento. Segnalato con una riga nel file; non corretto oltre la segnalazione, perché non
   è una conseguenza della mia modifica.

2. ✅ **CHIUSO dall'APPENDICE B (fix del coordinatore, vedi sotto).** *(Testo originale, per
   memoria: «`divergenze` tipizzata `campo: CampoTypo` presume che ogni riga rispetti il dizionario
   chiuso — non è garantito per righe nate PRIMA della migration `20260804211256`... Non l'ho
   difesa con una guardia runtime aggiuntiva, fuori dal perimetro esplicito del brief».)* Il
   perimetro si è allargato con una richiesta esplicita del coordinatore, arrivata dopo la review
   di questo referto: ora `campo`/`motivo` fuori dizionario NON sono più un rischio silenzioso —
   sono letti e marcati onestamente (`ValoreDizionario<T>`), mai scartati.

3. **BP-1 (aggiornamento di `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md`) è dovuto per
   il cambio di contratto della GET, ma non l'ho fatto qui.** La convenzione di questa sessione
   (vedi referto Task 5 §8, stesso punto) è che l'aggiornamento grosso di memoria/roadmap lo fa la
   chiusura di sessione (`/chiudi`), che ha la visione di tutti i task dell'ondata. Segnalo che è
   dovuto, non lo eseguo qui.

---

## 7. Self-review

- **L'argomento di isolamento tenant per il nuovo embed, scritto per intero** (perché è l'unica
  cosa qui che bloccherebbe se fosse sbagliata): la sicurezza NON dipende da un filtro esplicito
  dentro `normalizzaPrescrizione` (non ce n'è uno, e non serve). Poggia su due meccanismi
  indipendenti, entrambi già in banca dati: (a) la query filtra il `lavori` padre con
  `.eq('laboratorio_id', labId)`; (b) `lavori_prescrizioni` porta una FK **composita**
  `(lavoro_id, laboratorio_id) → lavori(id, laboratorio_id)` (`20260804150306:51-52`), che impedisce
  strutturalmente a una riga di `lavori_prescrizioni` di avere un `laboratorio_id` diverso da quello
  del `lavoro_id` a cui punta; e la sua RLS (`lavori_prescrizioni_tenant_select`,
  `20260804150306:73-74`) filtra comunque per `laboratorio_id = current_lab_id()` in autonomia.
  Tre barriere indipendenti per lo stesso invariante, nessuna delle quali passa dal mio codice —
  non ho scritto un test cross-tenant apposito per questo file perché non c'è logica di scoping
  mia da provare: sto solo leggendo ciò che la query e RLS hanno già filtrato.
- **`contenuto` non ha una guardia runtime equivalente a `fonte_tipo`.** Cast diretto
  `(r.contenuto ?? {}) as PrescrizioneContenuto`. Motivato nel commento del mapper: è scritto SOLO
  dalle RPC (tabella REVOKE ALL), e il perimetro scrivibile è chiuso a monte — una guardia qui
  sarebbe difesa in profondità senza un percorso concreto che la attivi, diversamente da
  `fonte_tipo` dove il tipo GENERATO (non solo il valore) è esplicitamente più largo del dominio
  (R27). Se questa lettura fosse sbagliata, è la prima cosa da rivedere.
- **Non ho toccato `page.tsx`.** Deciso e motivato in §0 — è la scelta più importante di questo
  task ed è la ragione per cui l'esito non è «100% completo», ma «completo per il mandato dato».
- **`next build` è stato eseguito per intero** (non saltato): il brief lo chiede esplicitamente
  quando cambia la risposta della GET, e qui cambia (`prescrizione` nel payload). Ha impiegato circa
  2 minuti la prima volta più una riconferma via `grep` su una seconda esecuzione — non
  eccessivamente lento, nessun bisogno di passarlo al controllore.
- **Non ho aperto nessuna decisione nuova.** Le forme di `contenuto`/`Divergenza`/`fonte_tipo` sono
  tutte derivate da codice e migration già scritti (componiSnapshot, le due migration RPC) — questo
  task legge e tipizza, non decide.

---

## Stato finale

- `GET /api/lavori/[id]` embedda ed espone `prescrizione` normalizzata, con guardia su `fonte_tipo`.
- `LavoroDettaglio`/`LavoroPrescrizione`/`Divergenza`/`PrescrizioneContenuto`/`LavoroImmagine.categoria`
  tipizzati contro le case uniche del dominio, zero copie a mano residue.
- 20 test nuovi (15 + 5), tutti verdi; `tsc` 0; suite intera verde; `next build` verde.
- **Aperto per T7:** la scheda (`page.tsx`) non legge ancora da qui — vedi §0.

---

# APPENDICE A — Fix dal coordinatore: guardie simmetriche su `contenuto`/`divergenze` (04/08/2026)

Richiesta arrivata dopo la consegna di questo referto, PRIMA che T7 costruisca una UI che si fida
di `Divergenza.campo`: `contenuto` e `divergenze` avevano cast ciechi da `Json` (righe ~78-79 della
prima stesura del mapper), mentre `fonte_tipo` aveva già la sua guardia — un'asimmetria segnalata
anche nel §6.2 originale di questo referto («fuori dal perimetro esplicito del brief»), ma non
ancora chiusa quando il coordinatore l'ha sollevata di nuovo.

## A.1 La forma scelta per le voci non conformi

`ValoreDizionario<T extends string> = T | { readonly noto: false; readonly valore: string }`
(`src/types/domain.ts`) — un valore valido resta la stringa stretta `T`, nuda (tutte le asserzioni
sui valori validi scritte nel Task 6 restano vere senza modifiche); un valore fuori dizionario
diventa l'oggetto marcato, che porta il testo grezzo via `comeTesto()` (stringa così com'è, o
`JSON.stringify` per tutto il resto, con `String()` come ultimo ripiego).

**Perché non `T | string` (esplicitamente rifiutato nella richiesta):** `string` accetta qualunque
valore, quindi non fa nessuna differenza per un compilatore che guarda uno switch — con o senza
quel cast, un `case` dimenticato compila comunque. La differenza vera si vede quando la UI scrive
l'esaustività ESPLICITAMENTE (`default: assertNever(valore)`, pattern già in uso nel dominio): con
`T | string` quel `default` sembra irraggiungibile ma non lo è davvero (`tsc` non lo segnala mai
come «vivo», perché una stringa qualunque soddisfa il tipo); con `ValoreDizionario`, il ramo
`{ noto: false, valore: string }` è un membro REALE dell'unione — un `default` che lo dimentica è un
errore di compilazione con un nome, non un buco silenzioso. (Correzione fatta nel merito rispetto
alla prima stesura del commento: la forma NON rende il ramo scoperto «visibile» di per sé — lo
rende **rilevabile dal compilatore quando la UI dichiara di essere esaustiva**, che è il beneficio
vero e l'unico che conta.)

**Nota per T7, esplicita perché è la cosa che deve sapere prima di scrivere la UI:** il formato sul
filo (nel JSON della risposta) di `campo`/`motivo` è ora POLIMORFO — o una stringa nuda, o un
oggetto `{noto: false, valore: string}`. La UI deve controllare `typeof divergenza.campo === 'string'`
PRIMA di qualunque switch, non dare per scontata la forma stringa.

## A.2 Le tre guardie NON sono simmetriche fra loro, ed è voluto

| Campo | Fuori dizionario / forma sbagliata | Perché |
|---|---|---|
| `fonte_tipo` | ripiega su `null` (spia) | `null` è GIÀ uno stato legittimo del dominio (V7) — non si perde niente di vero |
| `campo`/`motivo` di una divergenza | **mai scartati** — marcati `{noto:false, valore}` (spia) | dizionario chiuso, ma nessun ripiego legittimo: un valore fuori unione è un FATTO realmente accaduto (una divergenza registrata) |
| `utente_id` di una divergenza | ripiega su `null` (spia) | **nessun dizionario**, ma `null` è comunque il ripiego onesto di «attore assente» — vedi A.3, è il punto del secondo giro di review |
| `registrata_at` di una divergenza | **la voce intera si scarta** (spia) | `now()` lato RPC, nessun chiamante lo può omettere: la sua assenza è corruzione strutturale della riga, non un'anomalia isolata |
| `nota` di una divergenza | ripiega su `null` (nessuna spia se assente/null) | nullable per schema E dichiarata facoltativa dall'unico chiamante — `null` non è un'anomalia qui |
| `contenuto.elementi`/`.colore`/`.tipo` | la SOLA chiave si scarta (spia) | un `contenuto` malformato non è un fatto avvenuto in forma inattesa, è rumore — tenerlo si spaccerebbe per una trascrizione vera (V2) |
| `contenuto` non oggetto/array | letto come `{}` (spia se non null/undefined) | stessa ragione di cui sopra, a livello dell'intero valore |

## A.3 Il difetto trovato E CORRETTO nello stesso salvataggio (non un R-E2 — nasce dentro questo fix)

La PRIMA stesura di questo fix scartava una voce di `divergenze` priva di un `utente_id` stringa
valido, con la stessa logica usata per `registrata_at` («nessun dizionario da cui derivare un
valore onesto»). **Il ragionamento era sbagliato**: letto in banco, `lavoro_prescrizione_registra_
divergenza` (`20260804211256:38-44`) NON ha un `CHECK` su `p_utente` — a differenza di
`lavori_prescrizioni_conferma_ck`, che rende una conferma anonima impossibile per costruzione
(commento esplicito nella migration: «una conferma anonima non esiste»). Nessuna protezione
equivalente esiste per `p_utente` nella RPC delle divergenze. Un `utente_id` mancante è quindi
un'anomalia — l'unico chiamante applicativo oggi (`divergenza/route.ts:103`) passa sempre
`context.userId`, mai null — ma NON uno stato strutturalmente impossibile, e la voce che lo porta è
comunque una divergenza REALMENTE registrata. Scartarla avrebbe riprodotto, su `utente_id` invece
che su `campo`/`motivo`, ESATTAMENTE la classe di difetto che questo fix doveva chiudere: un dato
vero, perso in silenzio (dietro un `console.warn` che nessuno legge in produzione).

**Corretto prima del commit** (nessuna migration coinvolta, solo tipo + mapper + test):
- `Divergenza.utente_id: string` → `string | null` (`src/types/domain.ts`), con il perché scritto
  nel commento del campo.
- `normalizzaDivergenze` non scarta più per `utente_id` mancante/malformato: `leggiUtenteId` marca
  con una spia e ripiega su `null`, la voce resta.
- Il test corrispondente (`voce senza utente_id valido`) è stato **capovolto**: prima asseriva lo
  scarto (`toHaveLength(0)`), ora asserisce la sopravvivenza con `utente_id: null`. Aggiunto un test
  gemello per `registrata_at` (quello sì scartato — è l'unica condizione di scarto rimasta).

## A.4 Misura R-P4

Le 16 nuove asserzioni sono state scritte PRIMA della guardia vera, e misurate contro il codice del
Task 6 già consegnato (i due cast ciechi `as PrescrizioneContenuto` / `as Divergenza[]`) come
abbozzo — una misura legittima: quel codice era già scritto, verificato e in produzione nel ramo,
non un abbozzo costruito apposta per il test.
```
npx vitest run tests/unit/prescrizione-mapper.test.ts
14 rosse su 17 nuove (32 totali, 18 verdi) — CORRETTO DAL CONTROLLORE su misura empirica del revisore (abbozzo da d3c00faa: «Tests 14 failed | 18 passed (32)»); il referto dichiarava 13/31
```
Le 3 verdi a vuoto fra le 16 nuove sono uscite già corrette anche dal cast cieco: le forme valide di
`CAMPI_TYPO`/`MOTIVI_DIVERGENZA` passano intatte con o senza guardia, un `contenuto` con le tre
chiavi ben formate passa intatto, e `contenuto` assente/null era già `?? {}`. Le 13 rosse sono la
prova vera della guardia.

Dopo l'implementazione: **31 su 31**. Dopo il fix di A.3 (utente_id): **37 su 37** (incluso il file
di wiring della GET, invariato in questo giro — nessuna delle sue asserzioni tocca `divergenze`/
`contenuto`).

## A.5 Verifiche — output reale

| Comando | Esito |
|---|---|
| `npx vitest run tests/unit/prescrizione-mapper* tests/unit/lavori-id-route-get-prescrizione*` | **37 passed** |
| `npx tsc --noEmit` | **0** errori |
| `npx vitest run` (suite intera, PRIMA del fix A.3) | **405 file passed \| 3 skipped**, **4744 passed \| 19 skipped** |
| suite intera dopo A.3 | non ri-eseguita (indicazione esplicita: il cambio è confinato a `domain.ts` + `prescrizione-mapper.ts` + i loro test — censito con `grep -rln "Divergenza\b"`, nessun altro file nel repo importa il tipo `Divergenza`; nessuna firma di route toccata, `next build` non dovuto) |

## A.6 File toccati in questa appendice

| File | Cosa |
|---|---|
| `src/types/domain.ts` | `ValoreDizionario<T>` (nuovo), `Divergenza.campo`/`.motivo` → `ValoreDizionario<...>`, `Divergenza.utente_id` → `string \| null` |
| `src/lib/domain/prescrizione-mapper.ts` | `normalizzaContenuto`, `normalizzaDivergenze`, `leggiValoreDizionario`, `leggiNota`, `leggiUtenteId`, `comeTesto` (nuove funzioni); i due cast ciechi rimossi |
| `tests/unit/prescrizione-mapper.test.ts` | 16 test nuovi (2 blocchi: divergenze non conformi, contenuto malformato) + 1 test capovolto (utente_id) |
| `.superpowers/sdd/task-6-report.md` | questa appendice; §6 punto 2 marcato chiuso |
