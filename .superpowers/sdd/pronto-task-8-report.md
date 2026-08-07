# RESOCONTO — Task 8 · D308: i cinque campi stampati non si correggono di nascosto

**Ramo:** `intervento-post-consegna` · **Base:** `59e1628e` · **Data:** 8 agosto 2026
**Piano:** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md` (Task 8)
**Spec:** `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md` §1 e §1.1
**Migration:** nessuna, come da brief.

---

## 1. Che cosa ho trovato di sbagliato nel piano

### 1.1 🔴 IL DIFETTO PRINCIPALE — il cancello del piano è TROPPO LARGO, e chiuderebbe tutto

Il piano (brief, Passo 2) decide chi ha toccato un campo stampato **dalla presenza della chiave**:

```typescript
const toccati = CAMPI_STAMPATI.filter((c) => c in aggiornamenti)
```

**Quel cancello, così, rende un lavoro di SOLA LETTURA su OGNI campo** appena esiste una
dichiarazione viva — comprese le note, le date, il tecnico, la priorità.

**La prova, non l'inferenza.** La pagina di modifica del lavoro non manda un elenco di campi
cambiati: manda **l'intera riga**, sempre.

`src/hooks/useLavoroForm.ts:316`
```typescript
const patchBody: Partial<Lavoro> = { ...data }
```
Gli unici `delete` che seguono (`:328`, `:330-332`, `:346-349`, `:360-361`) tolgono
`numero_cassetta`, i sette nomi di denti/colore e — solo se non cambiata — la tinta. **Nessuno dei
cinque nomi stampati viene mai tolto.** Quindi `descrizione`, `tipo_dispositivo`,
`richiedente_nome`, `cliente_id` e `paziente_id` sono **sempre** nel corpo, anche quando l'utente ha
scritto due parole nelle note.

➡️ Con il cancello del piano, su un lavoro con dichiarazione viva **qualunque salvataggio della
scheda avrebbe risposto 422**. Sarebbe stata una violazione della direttiva permanente del
27/07/2026 («ogni campo del lavoro si corregge, fino alla consegna») travestita da conformità — e
proprio nel punto in cui il panel del 29/07 aveva ristretto la finestra **solo** sulle cinque voci
stampate, non su tutto.

**Correzione applicata (dentro il mandato: il mandato è costruire il cancello):** il cancello guarda
il **valore**, non la chiave. Si rifiuta ciò che **cambia**.

```typescript
const stampatiCambiati = CAMPI_STAMPATI.filter(
  (campo) => campo in payload && (payload[campo] ?? null) !== (memorizzato[campo] ?? null)
)
```

⚠️ **Le tre prove del piano (brief, Passo 1 — ①②③) NON avrebbero visto questo difetto:** restano
tutte e tre verdi anche col cancello sbagliato. Il numero è misurato, sta al §2.

### 1.2 Tre identificatori del piano non esistono in questo file

Il blocco del Passo 2 non compila com'è scritto. `provato:` lettura di
`src/app/api/lavori/[id]/route.ts` per intero (708 righe prima della modifica):

| nome nel piano | che cosa esiste davvero |
|---|---|
| `err(messaggio, 422)` | è una funzione **locale** di `eventi-qualita/route.ts:121`, non esiste qui. Qui si usa `NextResponse.json({ error }, { status })` |
| `lavoro_id` | la variabile è `id` (da `await params`) |
| `aggiornamenti` | il corpo filtrato dall'allowlist si chiama `payload` (`:458`) |
| `svc` | ✅ questo esiste (`:422`) |

### 1.3 Il piano non prevedeva il ramo «la lettura è fallita» — e senza, il cancello si apre da solo

Il blocco del piano destruttura il solo `{ count }`. Se la lettura fallisce, PostgREST torna
`count: null`, `(null ?? 0) > 0` è **falso**, e **il campo stampato passa**. Un cancello che si apre
quando non riesce a guardare non è un cancello. Ho aggiunto il ramo `error` → **500** (fail-closed),
provato dal caso ⑰.

### 1.4 Il piano non diceva di rileggere le colonne da confrontare

Conseguenza diretta della correzione 1.1: senza `descrizione`, `richiedente_nome`, `cliente_id`,
`paziente_id` nella `select` della rilettura (`:498`), quelle colonne tornano `undefined`, pareggiano
con qualunque `null` in arrivo e il cancello **smetterebbe di accendersi in silenzio** su quattro
campi su cinque. Prova ⑯ + la sonda `tsc` al §4.

### 1.5 Quello che nel piano invece era GIUSTO, e l'ho verificato

- **Il predicato «viva» = `stato <> 'annullata'`**, mai un elenco di stati. `provato:` è la stessa
  definizione in quattro posti: `supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql:15-17`
  (indice `ddc_lavoro_attiva_unique`), `supabase/migrations/20260807182614_*.sql:92-94` (la RPC del
  Task 4), `src/lib/pdf/generate-ddc.ts:383-387` e `src/app/api/lavori/[id]/route.ts:381` (l'embed
  della GET).
- **`stato` è `NOT NULL`** (`supabase/schema.sql:1265`), quindi `<>` non lascia scappare righe con lo
  stato assente — un rischio reale con l'operatore `<>` su una colonna nullable, qui non presente.
- **Il motivo che il messaggio nomina esiste:** `errore_dato_dichiarazione`, etichetta di interfaccia
  «C'è un dato sbagliato sulla dichiarazione» (`src/lib/qualita/motivi-ui.ts:74-78`).
- **`count` con `head: true`** è davvero il modo giusto: non scarica la dichiarazione.

---

## 2. I numeri R-P4, e che cosa NON misurano

### 2.1 Il primo rosso — non prova niente, ed è il motivo per cui esiste il secondo passaggio

```
× ① i cinque nomi … TypeError: CAMPI_STAMPATI is not iterable
× ⑯ la riga si rilegge … TypeError: CAMPI_STAMPATI is not iterable
 Tests  10 failed | 7 passed (17)
```
Due dei dieci rossi erano «il nome non esiste», non «il comportamento manca».

### 2.2 Abbozzo inerte (la sola const esportata, nessun cancello) — **9 casi su 17**

```
× ② con dichiarazione viva, cambiare `descrizione` → 422, e il messaggio NOMINA la strada
× ⑥ lo STESSO corpo intero, ma con UNA voce davvero cambiata → 422
× ⑦ i cinque, uno per uno, cambiati da soli → 422 ciascuno
× ⑨ `null` su un valore che c’era è un CAMBIO → 422
× ⑫ tipo SBAGLIATO su un campo stampato → si rifiuta lo stesso (fail-closed)
× ⑭ la dichiarazione viva di un ALTRO laboratorio non blocca nulla
× ⑮ la lettura è un CONTEGGIO senza righe: `head: true`
× ⑯ la riga si rilegge CON i cinque campi
× ⑰ se il conteggio FALLISCE non si passa: 500, nessun UPDATE
 Tests  9 failed | 8 passed (17)
```

⚠️ **Il numero è in CASI, non in asserzioni, e la ragione è onesta:** vitest ferma un caso alla prima
asserzione che cade, quindi «quante asserzioni si accenderebbero» non è misurabile lanciando —
sarebbe un conto a mano, cioè un'affermazione senza prova. Le asserzioni scritte sono **45** (i casi
⑦ e ⑯ ne contengono cinque ciascuno in un ciclo); il numero **misurato** è 9 su 17 casi.

### 2.3 🛑 CHE COSA QUEL NUMERO NON MISURA — e il secondo numero, misurato

Il 9 su 17 misura **che il cancello si accende**. Non misura **quanto è largo**. Per misurarlo ho
messo in opera il cancello SBAGLIATO del piano (solo il predicato del filtro, `c in payload`,
lasciando tutto il resto identico) e ho rilanciato:

```
### SOLO IL FILE D308 ###
× ⑤ corpo INTERO della scheda coi cinque INVARIATI + una nota cambiata → 200
× ⑩ `null` su un valore già assente NON è un cambio → 200
× ⑪ D242: `richiedente_nome: ""` contro un nome ASSENTE non è un cambio → 200
 Tests  3 failed | 14 passed (17)
### SUITE INTERA ###
 Test Files  1 failed | 444 passed | 6 skipped (451)
      Tests  3 failed | 5484 passed | 68 skipped (5555)
```

➡️ **Col cancello sbagliato restano verdi 14 casi su 17 di questo file, e 5.484 prove su 5.487
dell'intero repository.** Le tre prove del piano (①②③ del brief) sono fra quelle verdi. **Solo tre
casi — ⑤, ⑩, ⑪ — distinguono il cancello giusto da quello sbagliato**, e li ho scritti io: senza,
il difetto del §1.1 sarebbe arrivato in produzione con tutto verde.

⚠️ **Precisazione su questa misura, perché altrimenti direbbe più del vero:** l'esperimento ha
cambiato **solo il predicato del filtro**, tenendo la `select` allargata. Il piano «tale e quale»
non avrebbe nemmeno chiesto le quattro colonne nuove, quindi avrebbe fatto cadere **anche ⑯**
(4 casi discriminanti invece di 3). Ho misurato la variante più favorevole al piano.

### 2.4 Le forme d'ingresso, censite una per una

| forma d'ingresso | caso | esito atteso |
|---|---|---|
| chiave assente (nessuno dei cinque) | ⑧ | 200, e la dichiarazione **non si legge nemmeno** (`chiamateDdc === 0`) |
| `null` su un valore che c'era | ⑨ | 422 — il ripensamento è un cambio |
| `null` su un valore già assente | ⑩ | 200 — non è un cambio |
| stringa vuota / soli spazi contro `null` (D242) | ⑪ | 200 — `''` e `null` sono la stessa ortografia di «non c'è» |
| tipo sbagliato (`descrizione: 123`) | ⑫ | 422, fail-closed |
| corpo non-JSON | ⑬ | 400, e il cancello non parte affatto |
| i cinque campi **uno per uno** | ⑦ | 422 ciascuno |
| un campo **fuori** dai cinque | ③ | 200, con dichiarazione viva |
| più campi insieme, di cui **solo uno** vietato | ⑥ | 422 |
| più campi insieme, **nessuno** davvero cambiato | ⑤ | 200 |
| dichiarazione viva di un **altro laboratorio** | ⑭ | 200 (non blocca, non è osservabile) |
| solo dichiarazioni **annullate** | ④ | 200 |
| la lettura **fallisce** | ⑰ | 500, nessun UPDATE |

**Non coperte, e perché:**
- **`undefined` esplicito** su una delle cinque chiavi: JSON non lo trasporta (`JSON.stringify` lo
  omette). Non è una forma raggiungibile da questa rotta, che legge solo `req.json()`.
- **Array od oggetto al posto di uno scalare** (`descrizione: []`): ricade in «tipo sbagliato», caso
  ⑫ — il confronto è per identità, quindi qualunque non-scalare risulta ≠ dal valore memorizzato e
  viene **rifiutato**, che è il verso giusto. Non ho scritto un caso a sé perché proverebbe lo stesso
  ramo con un valore diverso.
- **Due dichiarazioni vive sullo stesso lavoro:** impossibile per struttura — l'indice parziale
  `ddc_lavoro_attiva_unique` ne ammette una sola. Il conteggio `> 0` regge comunque.

---

## 3. Le modifiche, file per file

### `src/app/api/lavori/[id]/route.ts` (+132 righe)

| righe | che cosa |
|---|---|
| 265-300 | Cappello `⚖️ D308` — il fatto che l'ha generata, Art. 21(2) MDR, il percorso che riemette, il confine dichiarato con la direttiva del 27/07, e il perché la regola è più larga del perimetro dell'ondata (spec §1.1) |
| 301-307 | `export const CAMPI_STAMPATI` — i cinque nomi. Esportata **solo** perché le prove possano leggerla, come `PATCHABLE_FIELDS` |
| 488-498 | La rilettura della riga chiede **quattro colonne in più** (`descrizione`, `richiedente_nome`, `cliente_id`, `paziente_id`), col commento che dice perché non sono decoro |
| 521-544 | Il commento del cancello: perché sta **subito dopo l'allowlist** (la normalizzazione D242 di `richiedente_nome` è già avvenuta) e perché guarda **il valore, non la chiave** — con la citazione di `useLavoroForm.ts:316` |
| 545-551 | `memorizzato` — i cinque valori letti dalla riga, scritti campo per campo invece che con un indice: così **`tsc` si accorge** se una colonna esce dalla `select` (sonda al §4) |
| 552-554 | `stampatiCambiati` — il filtro per valore |
| 555-583 | La lettura (`count` + `head: true`, dentro il laboratorio del chiamante, `stato <> 'annullata'`), il ramo **fail-closed** su errore → 500, e il **422** col messaggio che nomina «Devo intervenire» → «dato sbagliato sulla dichiarazione» |

⚠️ **Nessuna firma di handler è cambiata** (la PATCH resta `(req: Request, { params }: RouteContext)`),
quindi la nota «`tsc` non vede le firme di rotta» non morde qui.
**Nessun nome è uscito da `PATCHABLE_FIELDS`**: i cinque restano correggibili, si aggiunge un cancello
sopra di loro. Nessun dato smette di salvarsi in silenzio.

### `tests/unit/lavori-patch-campi-stampati-d308.test.ts` (nuovo, 17 casi)

Il finto di `dichiarazioni_conformita` **applica i filtri invece di ignorarli** (tiene un elenco di
righe con `lavoro_id`/`laboratorio_id`/`stato` e conta quelle che passano): così «nessuna
dichiarazione viva», «solo annullate» e «di un altro laboratorio» sono prove vere e non un contatore
messo a mano. La catena è indifferente all'ordine delle chiamate (`then` sull'oggetto stesso), così
prova l'**effetto** dei filtri e non l'ortografia della catena.

### Otto file di prova già esistenti (+59 righe in tutto)

`api-lavori-tipo-validazione` · `lavori-id-route` · `lavori-patch-colore-caso` ·
`lavori-patch-colore-scartato` · `lavori-patch-invariante-d7` · `lavori-patch-mezza-coppia` ·
`lavori-prescrittore-confine` · `tinte-patch`

A ciascuno ho aggiunto **un solo ramo** al finto: `dichiarazioni_conformita` → `{ count: 0 }`, cioè
«su questo lavoro non c'è nessuna dichiarazione viva». Il cancello resta quindi un no-op e quelle
prove continuano a misurare esattamente ciò che misuravano.

🔑 **Il fallimento era RUMOROSO, non silenzioso**, ed è la parte buona:
`TypeError: svc.from(...).select(...).eq(...).eq(...).neq is not a function` — 25 prove rosse su 8
file al primo giro della suite intera. Un finto che avesse risposto a caso avrebbe tenuto tutto verde
nascondendo il ramo nuovo.

---

## 4. L'output vero

### `vitest` — suite INTERA

```
cd "…/ua-app" && npx vitest run 2>&1 | tail -8

 Test Files  445 passed | 6 skipped (451)
      Tests  5487 passed | 68 skipped (5555)
   Start at  00:16:12
   Duration  48.72s
```

### `tsc`

```
cd "…/ua-app" && npx tsc --noEmit > /tmp/tsc-t8.log 2>&1; echo "uscita=$?"
uscita=0
$ wc -l < /tmp/tsc-t8.log
       0
```

### 🛑 La sonda che prova il vincolo col valore che DEVE essere rifiutato

«`memorizzato` scritto campo per campo fa accorgere `tsc` di una colonna che esce dalla `select`» è
un'affermazione, non un fatto — finché non si toglie la colonna. Tolta `descrizione` dalla `select`
della rilettura:

```
uscita=2
src/app/api/lavori/[id]/route.ts(550,27): error TS2339: Property 'descrizione' does not exist on
type '{ incluso_in_fattura: any; tecnico_id: any; numero_lavoro: any; tipo_dispositivo: any;
tinta_famiglia: any; tinta_codice: any; richiedente_nome: any; cliente_id: any; paziente_id: any; }'.
```

File ripristinato subito dopo (la sonda non è nel salvataggio).

### Perché non `next build`

Nessuna firma di handler è cambiata, quindi `tsc` + `vitest` è la coppia giusta per questo compito.
`npm run verify:full` **non è stato lanciato**, come chiede il brief (supera i due minuti e si
interrompe sembrando un guasto).

---

## 5. Fuori mandato — riferito, non corretto (R-E2)

### 5.1 🟠 Una delle due porte dell'interfaccia BUTTA VIA il messaggio del cancello

`src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx:303-309` — il ramo «Dentista» manda
`salva({ cliente_id: id })`, cioè **uno dei cinque campi stampati**. E `:190-193`:

```typescript
if (!res.ok) {
  onErrore(MESSAGGIO_ERRORE)   // 'Non è stato possibile salvare la modifica. Riprova.'
  return
}
```

Il corpo della risposta non viene nemmeno letto. ➡️ Chi cambia il dentista su un lavoro con
dichiarazione viva **non legge la strada**: legge «Riprova», che è per giunta un consiglio sbagliato
— riprovando non funzionerà mai. **D262 dice che la PWA dà aiuti, non blocchi**, e qui l'aiuto c'è
ma si ferma prima dello schermo.
🔑 **L'altra porta invece va bene:** la pagina di modifica (`useLavoroForm.ts:385-389`) legge
`json.error` e lo mostra, quindi il messaggio D308 arriva intero.
**Non l'ho corretto:** è interfaccia, ed è fuori dal mandato di questo compito, che è il cancello
nell'API. È materiale per il Task 9 o per un'ondata di interfaccia.

### 5.2 🟡 Il conteggio delle prove in `CLAUDE.md` §2 è vecchio di quasi il doppio

`ua-app/CLAUDE.md` §2 dice «3283 test unitari (26/07/2026)». Oggi sono **5.555**. La riga stessa
avverte di fidarsi dell'output — la segnalo solo perché il divario è ormai grande abbastanza da
sembrare un guasto a chi legge.

### 5.3 Niente altro

Nessun altro difetto trovato fuori mandato. In particolare **non** ho toccato `MEMORY.md` né
`ROADMAP-UFFICIALE.md`: nel registro di questo ramo il BP-1 arriva come salvataggio a sé dopo la
revisione, e anticiparlo qui sarebbe fuori mandato.

---

## 6. Autorevisione — dove questo lavoro è debole

**① La prova è tutta con i finti. Non ho toccato il banco.** Nessuna PATCH vera contro
`iagibumwjstnveqpjbwq`: quindi so che la catena `select().eq().eq().neq()` è quella che scrivo, **non
che PostgREST risponda `count` come mi aspetto su quella forma esatta**. Il rischio è basso — la
stessa forma con `count: 'exact', head: true` è già in produzione due righe più sotto, sulle righe di
lavorazione (`:622-626`) — ma è una somiglianza, non una misura. Se qualcuno può, la prova da fare è
quella del §6 di `2026-08-03-verifica-impronte-ddc-referto.md`: consegna, poi PATCH `descrizione`.

**② Il confronto per identità è la scelta giusta ma ha un bordo dichiarato.** `(a ?? null) !== (b ?? null)`
tratta come «cambio» anche un tipo sbagliato o una data mandata in un formato diverso da quello
memorizzato. Sui cinque campi in questione sono tutte colonne di testo o UUID, quindi il bordo non
morde; e quando morde, morde **verso il rifiuto**, che è il verso sicuro. Se un giorno uno dei cinque
diventasse numerico o strutturato, il confronto va rivisto — e la prova ⑫ è quella che lo renderà
visibile.

**③ Non ho provato che il cancello si accende sui lavori CONSEGNATI in modo diverso da quelli
`pronto`.** Non doveva: il cancello non guarda `lavori.stato` per niente, guarda solo la
dichiarazione (spec §1.1, confine deliberato). Lo scrivo perché è una domanda che verrà.

**④ Il caso ⑤ usa un corpo «della scheda» che ho costruito io.** È fedele a
`useLavoroForm.ts:316` per i cinque nomi, ma **non è il corpo vero della scheda**: non porta le altre
trenta colonne. Prova la regola giusta; non prova che un salvataggio completo della scheda passi.
Sarebbe una prova a schermo, non unitaria.

### Che cosa il Task 9 deve sapere

1. **Il cancello guarda il valore, non la chiave** (§1.1). Se il Task 9 disegna una schermata che
   disabilita dei campi, il criterio è lo stesso: *questo valore cambierebbe?*, non *questo campo è
   nel corpo?*
2. **La guardia sta nell'API e ci resta.** Qualunque cosa faccia l'interfaccia, il 422 c'è.
3. **C'è una porta dell'interfaccia che butta via il messaggio** (§5.1): `ModificaRigaSheet`, ramo
   «Dentista». Va chiusa da qualcuno.
4. **`CAMPI_STAMPATI` è esportata** da `src/app/api/lavori/[id]/route.ts` — se serve all'interfaccia
   sapere quali sono i cinque, il nome esiste già e non va riscritto altrove (una lista scritta due
   volte diverge).
5. **Il messaggio del 422 è testo definitivo**, non un segnaposto: nomina «Devo intervenire» e «dato
   sbagliato sulla dichiarazione», che sono l'etichetta vera del motivo (`motivi-ui.ts:74-78`).
