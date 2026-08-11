# Resoconto — Task 4-ter: la firma dei messaggi è il NOME DEL LABORATORIO (⚖️ D345)

**Data:** 09/08/2026, 19:45. **Ramo:** `intervento-post-consegna`. **Esecutore:** Task 4-ter.
**Mandato:** `.superpowers/sdd/avviso-dentista-task-4ter-brief.md` ·
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, centoquarantanovesima tornata ·
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, Task 4-ter.

---

## ① L'elenco VERO dei file toccati — dal censimento, non dal brief

Il censimento è partito da tre inneschi e si è **chiuso con `tsc`**: resa obbligatoria la chiave
`nomeLaboratorio`, ogni chiamante si è rotto, e **l'elenco dei rotti è l'elenco vero**.

`provato:` `grep -rn "UÀ Lab" src/` → **3 punti** (`src/lib/avvisi/messaggio.ts:62` ·
`src/lib/consegna/whatsapp-template.ts:18,30`)
`provato:` `grep -rn "whatsapp-template" src/ tests/` → 4 componenti + `orchestrate.ts` + 5 prove
`provato:` `npx tsc --noEmit` dopo il cambio di firma → **20 errori su 5 file**, di cui **uno che
nessuno dei tre inneschi aveva nominato**: `tests/unit/scadenzario-chiede-il-cellulare.test.tsx`.

### Modificati (9)

| percorso | che cosa | letto |
|---|---|---|
| `src/lib/messaggi/firma.ts` | 🆕 **la regola della firma in un posto solo**: forma del gallone + cosa fa un nome che manca | scritto |
| `src/lib/avvisi/messaggio.ts` | via la costante `MITTENTE`; `buildAvvisoMessage` riceve `nomeLaboratorio` | `letto: 1-199 (intero)` |
| `src/lib/consegna/whatsapp-template.ts` | `buildWhatsappMessage` **e** `buildWhatsappSollecito` ricevono `nomeLaboratorio`; corretta l'intestazione GDPR | `letto: 1-91 (intero)` |
| `src/lib/consegna/orchestrate.ts` | incastro `laboratorio:laboratori(nome)` sulle **due** letture del lavoro + `nomeLaboratorioDa()` + 2 chiamate | `letto: 104-230, 375-410` |
| `src/app/(app)/scadenzario/page.tsx` | `getLabContext()` → prop `nomeLaboratorio` | `letto: 1-18 (intero)` |
| `src/components/features/scadenzario/ScadenzarioList.tsx` | prop nuova su `ScadenzarioList` e su `InsolutoCard`, passata al sollecito | `letto: 1-135, 395-445, 570-590` |
| `src/app/(app)/scadenzario/[cliente_id]/page.tsx` | prop `nomeLaboratorio` da `context.lab?.nome` | `letto: 1-70 (intero)` |
| `src/components/features/scadenzario/EstrattoContoView.tsx` | prop nuova su `Props` e su `BottomSheetProps`, passata ai **due** solleciti | `letto: 1-70, 239-280, 399-420` |
| — prove — | v. sotto | |

### Prove (4)

| percorso | che cosa |
|---|---|
| `tests/unit/firma-messaggi-nome-laboratorio.test.ts` | 🆕 **38 prove** — le tre gambe di D345 + la sentinella sul sorgente + la guardia sul campo delle due pagine server |
| `tests/unit/avviso-messaggio.test.ts` | fixture della firma + **le tre sonde `@ts-expect-error` salvate dal degrado** (v. ④) |
| `tests/unit/consegna-whatsapp.test.ts` | l'unica asserzione esistente sulla firma, ora sulla firma giusta |
| `tests/unit/scadenzario-chiede-il-cellulare.test.tsx` | 6 punti di montaggio aggiornati + **2 prove nuove**: il nome arriva fino al collegamento `wa.me` |

### NON toccati, e perché — i punti che `tsc` **non** ha rotto (li ho guardati tutti, era il sospetto del brief)

- **`src/components/features/lavori/form/TabAccettazione.tsx`** — chiama solo `buildWhatsappUrl`, la cui
  firma non cambia. 🔑 **E guardarlo è servito:** riga 272, `labNome ? \`— ${labNome}\` : ''` +
  `.filter(Boolean)` — **questo punto firmava già col nome del laboratorio**, da prima di D345, ed è
  **il precedente di casa** su cui ho modellato il ramo «nome assente». Non un buco: la risposta.
- **`src/components/features/lavori/consegna-v3/FrameConsegnato.tsx`** — usa `numeroPerWhatsapp` e
  riceve `esito.whatsapp_url` **già composto dal server**. La forma dell'URL non cambia, quindi la sua
  guardia (`startsWith('https://wa.me/?')`, riga 137) resta valida.
- **`src/components/features/clienti/PortaleLinkButtons.tsx`** — nomina `whatsapp-template` **in un
  commento**, non lo importa. Compone un messaggio suo (v. ⑧).
- **`src/app/api/lavori/[id]/avviso/route.ts`** — nomina `buildAvvisoMessage` in un commento sul limite
  di 1000 caratteri. 📌 **Fatto utile: `buildAvvisoMessage` non ha ancora nessun chiamante in
  produzione** — il suo chiamante nasce col Task 5. I due punti in produzione erano quelli di
  `whatsapp-template.ts`.

🛑 **Niente migration, niente interfaccia nuova.** Nessuna colonna, nessuna RPC, nessun `gen types`:
`laboratori.nome` esiste già e la FK dell'incastro (`lavori_laboratorio_id_fkey`) esiste già.

---

## ② Quale campo — **`laboratori.nome`**, e non `ragione_sociale`

Quattro ragioni, la prima delle quali è la sola che si può puntare a `tsc`:

1. 🔑 **`nome` è `NOT NULL`, `ragione_sociale` è nullable.** `provato:`
   `src/types/database.types.ts`, tabella `laboratori`: `nome: string` · `ragione_sociale: string | null`.
   ➡️ Scegliere `ragione_sociale` **garantirebbe** il ramo «messaggio senza firma» che tutto questo
   lavoro esiste per evitare. Il campo giusto è quello che non può mancare.
2. **È il nome che il dentista già vede.** L'intestazione del portale è `lab?.nome`
   (`src/app/portale/[token]/page.tsx:428`): il messaggio e il posto dove il messaggio manda dicono
   **lo stesso nome**. Con `ragione_sociale` il dentista leggerebbe due nomi diversi per lo stesso
   laboratorio.
3. **È già nel contesto che tutta l'app usa**, quindi non serve una seconda via di lettura:
   `SELECT_CONTEXT` di `src/lib/supabase/lab-context.ts:24` porta `laboratori(stato, trial_ends_at,
   nome)`. `ragione_sociale` non c'è, e prenderlo avrebbe voluto dire una query in più su una pagina
   che oggi non ne fa nessuna.
4. **Un messaggio a un dentista è una comunicazione commerciale, non un documento fiscale.**
   `ragione_sociale` in casa compare sul **foglio stampato** della zona economica
   (`FatturazioneSection.tsx:849`): è il nome per le carte, non per parlare.

---

## ③ Da dove arriva il nome, in ognuno dei punti di partenza — e cosa succede se manca

### La regola del «se manca», decisa in un posto solo

`src/lib/messaggi/firma.ts` → `firmaMessaggio(nome)` torna `— <nome ripulito>` oppure **`null`**.
Con `null`, **la riga della firma non esiste** (e sparisce con lei la riga vuota che la precede).

Le quattro strade e perché ho scelto la quarta:

| ripiego | esito | verdetto |
|---|---|---|
| `— undefined` / `— null` | un messaggio rotto sotto gli occhi di un dentista | 🛑 è il caso che il mandato vieta per nome |
| gallone nudo (`—`) | dice che qualcosa si è rotto, non dice chi scrive | 🛑 peggio di niente |
| `«UÀ Lab»` come ripiego | ciò che D345 vieta, rientrato dalla porta di servizio | 🛑 |
| **nessuna riga di firma** | il messaggio esce senza firma invece che con una firma falsa | ✅ **e non è inventato oggi:** è già il comportamento di `TabAccettazione.tsx:272` |

📌 **Asimmetria dichiarata:** per il **sollecito** il ramo senza nome torna **esattamente il messaggio
di oggi** (finiva a «Cordiali saluti» e finisce lì) — un no-op stretto. Per **consegna** e **avviso**
perde una riga che oggi c'è. È corretto (la firma vecchia non può sopravvivere come ripiego) ed è una
conseguenza **decisa**, non un incidente.

⚠️ **Quanto è raggiungibile:** `nome` è `NOT NULL`, quindi non si arriva qui con un dato mancante in
banca dati. Si arriva con **una lettura che non porta l'incastro del laboratorio** — è già il modo in
cui `orchestrate.ts` produce un gettone vuoto (`?? ''`) — e con l'unico caso legittimo per progetto:
**`admin_sistema` ha `laboratorio_id` NULL**, quindi `LabContext.lab` è `null`
(`lab-context.ts:16,23`). ➡️ Provato con **tre** forme di assenza (`null`, `''`, soli spazi) **più**
un `undefined` arrivato per cast, su **tutti e cinque** i rami che producono messaggi.

### I punti di partenza, uno per uno

| punto di partenza | da dove arriva il nome | se manca |
|---|---|---|
| **`orchestrate.ts:133`** — ramo idempotente `gia_consegnato` | **incastro `laboratorio:laboratori(nome)`** sulla lettura del lavoro che c'è già (FK `lavori_laboratorio_id_fkey`). 🔑 Nessuna andata in più al banco: la consegna è un flusso fiscale e un round trip su ogni consegna si paga per sempre | `nomeLaboratorioDa()` torna `null` → messaggio senza firma. Fail-soft, coerente col resto del file |
| **`orchestrate.ts:396`** — ramo normale (Step 6) | **stesso incastro**, aggiunto alla `select('*, cliente:clienti(*), …')` che c'era già | idem — **e per costruzione identico**, perché i due rami passano dalla **stessa funzione** `nomeLaboratorioDa()`: era il posto dove due letture dello stesso dato erano già divergute una volta |
| **`ScadenzarioList` → `InsolutoCard`** (sollecito dall'elenco) | **`getLabContext()` nella pagina server** `(app)/scadenzario/page.tsx`, poi prop. La pagina è diventata `async` per questo | prop `null` → sollecito senza firma = **il messaggio di oggi** |
| **`EstrattoContoView`** (sollecito totale) | `context.lab?.nome` dal `getLabContext()` che **quella pagina già faceva**, poi prop | idem |
| **`EstrattoContoView` → `DovutoBottomSheet`** (sollecito sul singolo dovuto) | stessa prop, un passaggio di mano in più | idem |
| **`buildAvvisoMessage`** (Task 5, non ancora montato) | 🔑 **lo passerà il chiamante del Task 5**: la firma della funzione ora lo **pretende**, quindi il Task 5 non può dimenticarselo — `tsc` non lo lascia compilare | messaggio senza firma |

🛑 **Nessuna seconda via di lettura, ed era una richiesta esplicita del mandato.** I due pattern usati
sono i due che esistevano già: `getLabContext()` lato server (il contesto che `(app)/layout.tsx:22` usa
per tutta l'app, `cache()`ato per richiesta) e l'**incastro PostgREST** sulla lettura già presente. Il
nome **non** è stato messo dentro `/api/scadenzario` né dentro `EstrattoContoResponse`: quei contratti
descrivono il **cliente**, e il mittente non è un dato del cliente.

⚠️ **Perché l'incastro regge due forme.** `nomeLaboratorioDa()` accetta oggetto **e** array: questo file
porta già la lezione pagata — «*PostgREST restituisce `prescrizione` come ARRAY*» (FK composita) — e
passarlo così a valle aveva dato un campo sempre `undefined`, cioè il difetto mascherato da correzione.
Qui la FK è a colonna singola e dà un oggetto; la difesa costa una riga e l'alternativa è **una firma
che sparisce in silenzio**.

---

## ④ Una prova esistente è arrossita? **Sì, due file — e il fatto interessante è QUALI**

`provato:` prima di toccare l'implementazione, `grep -rn "UÀ Lab" tests/` → **3 punti in 2 file**:

- `tests/unit/consegna-whatsapp.test.ts:43` — `expect(msg).toContain('UÀ Lab')`
- `tests/unit/avviso-messaggio.test.ts:115,120` — le due fixture del testo atteso

Entrambi sono diventati rossi, ed **è il comportamento giusto**. Ma la risposta piena non è «sì»:

🔴 **Le due prove che sorvegliavano la firma coprivano CONSEGNA e AVVISO. Il SOLLECITO non era
sorvegliato da nessuno.** Nessuna delle 5793 prove diceva niente su come finisce un messaggio di
sollecito — cioè esattamente il messaggio con cui un laboratorio **chiede soldi a un dentista**. Una
firma sbagliata su quel canale sarebbe passata in silenzio, e infatti ci è passata: v. ⑧.

🔴 **E c'è un secondo fatto, che sarebbe passato per verde.** Le tre sonde di tipo di
`avviso-messaggio.test.ts:84-94` (`@ts-expect-error` su `pazienteNome`, `valorePrecedente`,
`campiCorretti` — il cancello GDPR del §9, dichiarato fail-closed) **si stavano degradando in
silenzio**: aggiunta la chiave obbligatoria `nomeLaboratorio`, ognuna di quelle chiamate era in errore
perché la chiave **mancava**, non perché la proprietà vietata è **rifiutata**. La direttiva restava
«usata», `tsc` restava verde, `TS2578` non si accendeva — e un cancello che dice di essere fail-closed
avrebbe smesso di provare qualcosa **senza un solo segnale**. Corretto: le tre sonde ora passano
`nomeLaboratorio`, così il solo errore che resta da sopprimere è la proprietà vietata.
📌 È un difetto **generato dalla mia stessa modifica**, quindi corretto qui e non riferito — ma la
lezione è generale: **una sonda `@ts-expect-error` va rivisitata ogni volta che cambia la firma che
sorveglia**, altrimenti misura la propria incompletezza invece del divieto.

---

## ⑤ `N su M` — **11 su 36** (abbozzo inerte, R-P4)

**Primo rosso** (implementazione vera, firma nuova nelle prove): `15 falliti | 21 passati (36)`.
**Abbozzo inerte** (le tre funzioni con la firma nuova e `return ''`): **`11 falliti | 25 passati (36)`**.

➡️ **`N = 11` su `M = 36`.** M sono i casi di prova del file nuovo (vitest conta `it`, non asserzioni:
le asserzioni sono più numerose, il numero riportato è quello misurabile).

📌 **Il file oggi ha 38 prove, non 36**, e il conto sopra resta quello misurato: le **due** in più sono
la guardia sul campo delle due pagine server (v. ⑦-1), aggiunte in un **secondo giro dopo la
revisione**, quindi fuori dalla misura dell'abbozzo inerte. Non le ho conteggiate dentro `N su M`
perché sarebbe stato ricalcolare un numero a cose fatte.

🔑 **Che cosa dice il numero, e non è un bel numero per caso.** Le **25** che sopravvivono a un
`return ''` sono quasi tutte **negative** (`not.toContain('UÀ Lab')`, `not.toContain('undefined')`,
nessun gallone nudo): un messaggio vuoto le passa tutte. La forza sta nelle **11** — i confronti per
intero e le presenze del nome. ⚠️ Le negative **non sono inutili**: sono la metà che dice «e non
tornare», e senza di loro `nomeLaboratorio ?? 'UÀ Lab'` passerebbe tutto. Ma da sole non provavano
niente, e questo è il senso di contarle separatamente.

📌 **Un dettaglio misurato che vale scrivere:** la **sentinella sul sorgente** è rossa **anche** contro
l'abbozzo inerte, perché guarda il codice e non il comportamento. È l'unica gamba che vede le funzioni
di **domani**.

### Le forme d'ingresso, censite prima delle asserzioni (R-P4)

| forma | coperta |
|---|---|
| nome presente | ✅ tutti e 5 i rami |
| `null` | ✅ tutti e 5 |
| stringa vuota `''` | ✅ tutti e 5 |
| soli spazi `'   '` | ✅ tutti e 5 (e il nome si presenta ripulito ai bordi: provato) |
| `undefined` a run time (per cast, non per tipo) | ✅ tutti e 5 |
| nome con spazi in coda | ✅ (`trim`) |
| ramo «senza collegamento al portale» | ✅ è un ramo a sé nella tabella dei produttori, perché è dove la firma sta da sola |
| nome con un **ritorno a capo** dentro | ❌ **non coperta, perché:** romperebbe l'impaginazione del messaggio, non la sua sicurezza; e il valore arriva da `laboratori.nome` digitato in impostazioni, dove il divieto va messo se lo si vuole — non in cinque punti a valle |
| nome molto lungo (oltre il limite di 1000 caratteri della rotta del Task 4) | ❌ **non coperta, perché:** il tetto è della rotta che **registra** il testo (`avviso/route.ts:97`), non di chi lo compone; e il conto del margine sta lì |

---

## ⑥ I numeri misurati

| | prima | dopo |
|---|---|---|
| **File di prova** | `454 passati \| 9 saltati (463)` | `455 passati \| 9 saltati (464)` |
| **Prove** | **`5793 passate \| 119 saltate (5912)`** | **`5833 passate \| 119 saltate (5952)`** |

`provato:` prima — `npx vitest run` su albero pulito (09/08/2026, 19:28).
`provato:` dopo — `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` → **`VERIFY_EXIT=0`**
(senza pipe, da variabile).

➡️ **+40 passate, saltate INVARIATE (119).** Il conto torna esatto: **38** del file nuovo (36 del
primo giro + 2 della guardia sulle pagine) + **2** di `scadenzario-chiede-il-cellulare.test.tsx`. Le mie
prove sono unitarie, quindi le saltate non si muovono — e non si sono mosse.

📌 Due passate di `verify:full`, entrambe `VERIFY_EXIT=0`: la prima a `5831` (19:47), la seconda a
`5833` (19:55) dopo le due prove aggiunte in revisione. Il numero di riferimento è **5833**.

Dentro il `verify:full`: `tsc --noEmit` verde · `eslint src --max-warnings 0` verde ·
`next build` «Compiled successfully» · **6 guardie su 6 verdi** (compresa `check-ds-compliance`:
scadenzario è superficie v2.3 legacy e non l'ho spostata).

### Falsificazione delle due prove di collegamento

`provato:` scollegata a mano la prop (`nomeLaboratorio={null}` alla card e `nomeLaboratorio: null` al
sollecito totale) → `2 falliti | 6 passati (8)`, e i due falliti sono **esattamente** le due prove
nuove. Ripristinato → `8 passati`. ➡️ Provano il **passaggio di mano**, non la propria esistenza.

---

## ⑦ Che cosa resta `non provato`, col motivo

1. ✅ **CHIUSO in revisione — era il punto più fragile e non è più `non provato`.** Il rischio:
   `context?.lab?.nome` (il laboratorio) e `context?.nome` (il nome di **battesimo dell'utente**) hanno
   lo **stesso tipo** `string | null`, quindi `tsc` non distingue, il difetto compila, e un dentista
   riceve un sollecito firmato «— Francesco». Le due pagine sono **componenti server** e in casa nessuna
   prova le monta. ➡️ Aggiunta una **guardia statica** sulle due pagine (stesso idioma della sentinella:
   `tests/unit/firma-messaggi-nome-laboratorio.test.ts`), che pretende `nomeLaboratorio={context…lab?.nome`
   e **rifiuta** `nomeLaboratorio={context?.nome`.
   `provato:` sostituito a mano `context?.lab?.nome` con `context?.nome` in `(app)/scadenzario/page.tsx`
   → `1 fallito | 37 passati (38)`; ripristinato → `38 passati` (09/08/2026).
   ⚠️ Resta il limite dichiarato nella prova: la guardia conosce **due** pagine e non trova da sé una
   terza. Chi ne aggiunge una la aggiunge all'elenco.
2. **Il comportamento a schermo del ramo `admin_sistema`.** Che `LabContext.lab` sia `null` per un
   `laboratorio_id` NULL è letto sul tipo e sull'embed LEFT (`lab-context.ts:23`), **non** provato con
   una sessione `admin_sistema` vera. L'esito, comunque, è quello provato in unità: sollecito senza firma.
3. ✅ **VERIFICATO in revisione: l'incastro nuovo non finisce in nessuna SCRITTURA.** Era il rischio
   vero e invisibile: `lavoro` porta ora una chiave in più (`laboratorio`) e **scorre per righe che non
   avevo aperto** (230-375, il cuore del flusso fiscale). Se una scrittura facesse `.update({...lavoro})`
   o passasse l'oggetto intero a una RPC, Postgres rifiuterebbe la colonna sconosciuta e **la consegna
   darebbe 400 in produzione** — e né `tsc` né le 5833 prove lo vedrebbero, perché le prove di
   `orchestrate` girano su un banco finto.
   `provato:` `grep -n "\.update(\|\.insert(\|\.upsert(\|\.\.\.lavoro\|Object.keys(lavoro)\|Object.entries(lavoro)\|JSON.stringify(lavoro)\|p_lavoro" src/lib/consegna/orchestrate.ts`
   → **tre `.update()` (216, 301, 357), tutte con le colonne NOMINATE una per una, zero spread**; e le
   RPC ricevono `lavoro_id`, non l'oggetto. Controllati anche i quattro consumatori a valle
   (`precheck.ts`, `traccia-materiali.ts`, `generate-ddc.ts`, `generate-buono.ts`): **nessuno** fa spread,
   `Object.keys`/`entries` o `JSON.stringify` del lavoro. ➡️ La chiave in più è **in sola lettura**.
4. **L'incastro `laboratori(nome)` non è stato provato contro il banco vero.** La FK
   `lavori_laboratorio_id_fkey` è letta su `database.types.ts` (colonna singola verso la chiave
   primaria → oggetto), e `nomeLaboratorioDa()` regge comunque **anche la forma array**. Ma la sintassi
   dell'incastro non è stata eseguita su Postgres in questa sessione: le prove di `orchestrate` girano
   su un banco finto. ⚠️ **È l'unico punto che un collaudo dal vivo (D103) chiuderebbe e che una prova
   unitaria non chiude.**
5. **Nessuna FASE 9 / 9b.** Non ho cambiato **l'aspetto** di nessuna superficie: zero token, zero
   classi, zero stili, zero struttura di markup, nessun testo **visibile nell'interfaccia** — solo il
   contenuto di un `href` `wa.me` e due prop. Per ⚖️ **D245** è **CONTENUTO**, quindi il gate estetico
   L2 non è dovuto. 🛑 **Ma la FASE 9 «non dovuta» non è la stessa cosa di «fatta»:** la prova a schermo
   sui 390/768/1280 chiaro+scuro **non l'ho eseguita**, e il motivo è che nessun pixel di quelle
   pagine cambia — l'unica cosa osservabile è il testo che si apre **dentro WhatsApp**, che sta fuori
   dall'app. Se chi rivede la vuole comunque, è una passata sullo scadenzario.
6. **Il messaggio vero visto in WhatsApp** (impaginazione della firma su un telefono vero): fuori
   dall'app, non simulabile qui.

---

## ⑧ Ritrovamenti FUORI dal mandato (R-E2 — riferiti, non corretti)

### 🔴 1. Il verbale di D345 cita un fatto che la misura contraddice

Il *fondamento* di ⚖️ D345 (centoquarantanovesima tornata) e il brief dicono: «*ogni sollecito mandato
finora si firma col nome dello strumento invece che del mittente*».

`provato:` misurato il 09/08/2026 — **`buildWhatsappSollecito` non conteneva la stringa «UÀ Lab»**:
finiva a «Cordiali saluti» e lì si fermava. Il conto esatto dei quattro componenti nominati:

| componente | che cosa chiama | firmava «UÀ Lab»? |
|---|---|---|
| `ScadenzarioList.tsx` | `buildWhatsappSollecito` + `buildWhatsappUrl` | ❌ non firmava **affatto** |
| `EstrattoContoView.tsx` | `buildWhatsappSollecito` + `buildWhatsappUrl` | ❌ non firmava affatto |
| `TabAccettazione.tsx` | solo `buildWhatsappUrl` | ❌ firmava **già col nome del laboratorio** |
| `FrameConsegnato.tsx` | solo `numeroPerWhatsapp` | ❌ riceve l'URL già fatto |

➡️ **Zero dei quattro emetteva «UÀ Lab».** L'unica strada di produzione che lo emetteva è
`orchestrate.ts:133,396` → `buildWhatsappMessage`, cioè **il messaggio della consegna**.

🔑 **Questo non riduce il lavoro e non tocca D345**, che resta giusta e anzi copre un caso che il suo
stesso fondamento non aveva visto: un messaggio firmato da **nessuno** viola D345 quanto uno firmato
male, e il sollecito era squadratamente nel mandato perché il verbale lo nomina come il danno. Ma **una
riga ratificata cita un fatto che la misura smentisce**, e la forma del danno era diversa da come è
scritta: *non firmato*, non *mal firmato*. **Riferito perché correggere un verbale ratificato non è
mio** — e perché è lo stesso genere di fatto per cui la riga EUDAMED e la riga dei cinque ruoli sono
state emendate.

### 2. `NuovoOrdineSheet.tsx:151` — l'ordine al fornitore esce senza firma, e la costante è morta

```ts
const labNome = '' // non disponibile qui — viene dal lab del server
…
labNome ? `Lab: ${labNome}` : '',
```

Il messaggio WhatsApp **e** l'e-mail d'ordine a un fornitore (`:193`, `:208`) non nominano il
laboratorio, e la riga che dovrebbe nominarlo è **spenta per costruzione** — un ramo che non può
accendersi. È un messaggio che l'app propone, quindi **nel perimetro dello spirito di D345**; **fuori
dal mio censimento** perché non contiene «UÀ Lab», non importa `whatsapp-template`, e il nome non
esiste in quel componente. **Che cosa servirebbe:** due passaggi di prop — `(app)/ordini/page.tsx` (che
fa già `getLabContext()`) → `OrdiniList.tsx:55` → `NuovoOrdineSheet`. Mezz'ora, in un'area di
funzionalità che non è questa ondata.

### 3. `PortaleLinkButtons.tsx:86` — il messaggio più vicino al confine

«*Gentile {clienteNome}, può seguire i Suoi lavori in tempo reale qui: {url}*» — **senza firma**. È un
messaggio **a un dentista**, sul portale: territorio di D332 e D345. Lo lascio fuori perché non è nel
censimento (nessun «UÀ Lab», non importa i moduli toccati) e perché quel componente sta nella scheda
cliente, non nelle superfici di questo task — **ma è il caso di confine che consiglio di prendere per
primo**, prima del fornitore.

### 4. `PecSetupWidget.tsx:166` — **deciso fuori, per sostanza**

«*Ciao Francesco, ho bisogno di aiuto per configurare la PEC…*»: va **dall'odontotecnico al
fornitore del software**, e il mittente è identificato dal proprio numero di telefono. Non è una
comunicazione del laboratorio verso un suo interlocutore, ed è l'unico dei casi di confine che **non**
sta nel perimetro di D345 per ragione di merito, non di comodità.

### 6. I documenti portano ancora la firma vecchia — e uno di loro è l'ingresso del Task 5

`provato:` `grep -rn "UÀ Lab" --include="*.ts" --include="*.tsx" --include="*.html" --include="*.md" .`
(senza `node_modules`) → fuori da `src/` e `tests/` restano **solo documenti**, nessuna prova Playwright,
nessun sorgente:

- **`docs/design/mockups/2026-08-09-avviso-al-dentista.html:202,297`** — il mockup **approvato** mostra
  ancora la firma vecchia nei due riquadri del messaggio proposto. 🔑 **È l'ingresso di disegno del Task
  5**, cioè chi lo apre domani legge la firma sbagliata come se fosse quella approvata. Non l'ho
  toccato: è l'artefatto che ha **generato** D345 e correggerlo a posteriori cambierebbe la prova di che
  cosa Francesco ha visto quando ha deciso.
- **`docs/superpowers/plans/2026-08-09-avviso-al-dentista.md:292`** — lo stesso, dentro il blocco di
  testo atteso del Task 3.
- **`memory/MEMORY.md:2` e `docs/roadmap/ROADMAP-UFFICIALE.md:2`** — ripetono la frase «*ogni sollecito
  mandato finora si firma col nome dello strumento*», cioè **il fatto smentito al punto 1**. ➡️ Sono i
  due file che la BP-1 di chiusura tocca comunque: **è là che la correzione va scritta**, non da me a
  metà di un task.

### 7. Pre-esistenti, invariati

- **`indirizzoApp()` è l'ottava copia** del ripiego su `NEXT_PUBLIC_APP_URL` (8 punti). Già riferito dal
  Task 3, non toccato.
- **La sentinella sul sorgente non distingue codice e prosa.** Un commento che ricopia la firma vecchia
  per intero la accende — **è già successo mentre scrivevo**, e la risposta giusta è riscrivere il
  commento, non ammorbidire la guardia. Scritto dentro la prova, perché il prossimo che ci sbatte deve
  trovare la spiegazione lì.

---

## FASE 3 — validazione architetturale (tocco la PRODUZIONE: scadenzario, consegna) — percorso Medio

**□ Tenant isolation — tocca RLS o `current_lab_id()`?**
**No**, nessuna policy e nessuna funzione di RLS cambia. Ma il dato nuovo **è** un dato di tenant, e
vale dire perché non può sbagliare inquilino: `orchestrate.ts` usa il client di servizio (fuori da RLS)
e la lettura è già filtrata `.eq('laboratorio_id', laboratorio_id)` — l'incastro **segue la FK di quella
riga**, quindi può tornare solo il laboratorio che possiede il lavoro. Le due pagine dello scadenzario
prendono il nome da `getLabContext()`, cioè dal laboratorio **della sessione**. ➡️ Un messaggio non può
uscire firmato col nome di un altro laboratorio: entrambe le fonti derivano dal tenant del record o
della sessione, mai da un parametro del client.

**□ Schema drift — serve una migration? Va rifatto `supabase gen types`?**
**Nessuna delle due.** Zero DDL. `laboratori.nome` e la FK `lavori_laboratorio_id_fkey` esistono già ed
erano già nei tipi generati: `tsc --noEmit` è verde **senza** rigenerare niente, che è la prova che non
c'è drift. ➡️ **FASE 6b non dovuta.** (Se mi fosse sembrato di aver bisogno di una migration mi sarei
fermato: non è servito.)

**□ API contract — il cambio di payload rompe client esistenti?**
**Nessun contratto HTTP cambia.** `/api/scadenzario` e `EstrattoContoResponse` sono intatti — scelta
deliberata: il mittente non è un dato del cliente. Quello che cambia sono **firme di funzione interne**
(3) e **prop di componente** (4), tutte dentro il repo e **tutte trovate da `tsc`**: 20 errori, 5 file,
zero chiamanti fuori dall'albero. Cambia il **contenuto** di `ConsegnaResult.whatsapp_url` (il testo
dentro l'URL), non la sua **forma**: `FrameConsegnato` lo tratta come URL opaco e la sua guardia
`startsWith('https://wa.me/?')` continua a valere. 🔑 La chiave è stata resa **obbligatoria** proprio
per questo: con `nomeLaboratorio?:` nessun chiamante si sarebbe rotto e il censimento non sarebbe
esistito.

**□ Rollback — come si annulla se va in produzione e fallisce?**
`git revert <hash>` del singolo commit sul ramo `intervento-post-consegna`, e si è tornati indietro
**per intero**: nessuna migration da disfare, nessun dato scritto, nessuno stato persistito. I messaggi
si compongono **a ogni richiesta**, quindi il testo vecchio torna al primo deploy successivo; e per
⚖️ D339 la bozza proposta non si conserva, quindi non c'è nessuna copia salvata da ripulire. **Il caso
peggiore in produzione** è un messaggio che esce senza riga di firma (nome non arrivato) — cioè, per il
sollecito, esattamente il messaggio di oggi, e per consegna/avviso una riga in meno: **nessuna via che
porti a `— undefined`**, provata.

**□ Dominio critico? (RLS / Stripe / FatturaPA / auth → percorso GRANDE)**
**No** — nessuno dei quattro. ⚠️ Ma la modifica **entra nell'orchestratore della consegna**, che è il
flusso da cui nascono DdC e fattura: per questo là dentro ho tenuto tutto **additivo e in sola
lettura** (un incastro su una `select` esistente, nessun riordino del blocco di query — la guardia a
testo `tests/unit/ddc-lettori-gruppo-a.test.ts`, che cerca `.neq('stato','annullata')` nel sorgente, è
verde) e nessuna riga di scrittura è stata sfiorata. Percorso **Medio**, come prescritto dal mandato,
con FASE 3 piena e FASE 7 intera.

---

## ⑨ Il salvataggio

`git status` guardato prima (⚖️ D318), `git add <percorsi>` nominati uno per uno, **mai `-A`**.
Niente `push`, niente `main`, niente worktree.

**Hash del lavoro: `8ae9bc05`** — `fix(messaggi): la firma dei messaggi è il nome del laboratorio, non
«UÀ Lab» (D345)`, 13 file, +1015 / −60. Contiene il codice, le prove e questo resoconto.

📌 Questa riga dell'hash è arrivata con un secondo salvataggio minimo (un resoconto non può contenere
l'hash del salvataggio che lo contiene). Il salvataggio del **lavoro** è `8ae9bc05`.
