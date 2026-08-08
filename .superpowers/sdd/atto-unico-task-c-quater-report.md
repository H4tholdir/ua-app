# RESOCONTO — Task C-quater: i tre critici del Task C

**Data:** 08/08/2026 · **Ramo:** `intervento-post-consegna` · **Base:** `0fe7b400`
**Mandato:** chiudere C3 (codice vivo), C1 e C2 (prove che non potevano diventare rosse).
📌 **NESSUNA MIGRATION.** Il contratto SQL non è stato toccato: `git diff` non nomina `supabase/`.

---

## 0. IN UNA FRASE

I tre critici sono chiusi. **Uno stava nel codice** (la regola sul vuoto si fermava al primo livello, e
un livello sotto **cancellava** un contenuto obbligatorio del documento rispondendo 200 «rifatta»);
**due stavano nelle reti** — lì il codice era giusto e nessuna prova poteva accorgersi se smetteva di
esserlo.

🔑 **Il difetto del brief che pesa di più:** il brief conta **tre** mutazioni. Ce ne vogliono **cinque**,
perché **C3 è due difetti**, non uno (la profondità *e* la ripulitura ai bordi delle sotto-chiavi). Se mi
fossi fermato a tre, la riga che ripulisce le sotto-chiavi sarebbe **codice di produzione senza nessuna
prova che possa fallire** — cioè esattamente il peccato che questo compito esiste per chiudere. Dettaglio
in §5①.

| cosa | esito |
|---|---|
| C3 — la regola sul vuoto in profondità + la ripulitura ai bordi | ✅ chiuso, **2 mutazioni** rosse |
| C1 — la porta del tenant sul paziente | ✅ chiuso, mutazione rossa |
| C2 — il fail-closed sull'esito ignoto | ✅ chiuso, **2 mutazioni** rosse (anche lo specchio) |
| mutazioni **prima** della correzione | C3 si accende · C1 **verde 130/130** · C2 **verde 130/130** |
| mutazioni **dopo** la correzione | **6 su 6 rosse** |
| prove | **5606 → 5617** (+11) · file **454 → 454** (invariati, e va bene così) |
| `verify:full` | `VERIFY_EXIT=0` |
| file di produzione toccati | **uno**: `src/lib/dichiarazione/correzioni.ts` |

---

## 1. 🔴 C3 — LA REGOLA SUL VUOTO SI FERMAVA AL PRIMO LIVELLO

### La sonda PRIMA della correzione (è il rosso di C3: qui il codice era già rotto)

```
$ npx tsx scripts/tmp/sonda-c3.ts
colore:""                          => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"colore":""}}}
colore:"   "                       => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"colore":"   "}}}
elementi:[]                        => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"elementi":[]}}}
tipo:""                            => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"tipo":""}}}
colore:"  A3  " (bordi)            => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"colore":"  A3  "}}}
(controllo) descrizione:""         => {"ok":false,"errore":"La correzione di «descrizione» è vuota: …"}
(controllo) prescrizione_caratteristiche:{} => {"ok":false,"errore":"La correzione di «prescrizione_caratteristiche» è vuota: …"}
```

✅ **Riprodotto identico alla revisione**, e con **una riga in più che il giudizio non aveva misurato**:
`'  A3  '` arrivava sulla riga vera **con dentro i suoi spazi**, mentre lo stesso testo su `descrizione`
arrivava pulito. Due regole per la stessa cosa, e quella sbagliata sul campo che finisce in un documento.

### La correzione — **la stessa regola, estesa in profondità**

`src/lib/dichiarazione/correzioni.ts`. `nonDiceNiente(v): boolean` è diventata
`primoVuoto(v, percorso): string | null` — stessa idea di «vuoto» per testo, elenco e oggetto, più due
cose:

1. **si scende negli oggetti**: un oggetto qui è una **mappa di correzioni** (la penna scrive ogni
   sotto-chiave da sé, `jsonb_set` una alla volta), quindi non dice niente se è vuoto **oppure se anche
   UNA SOLA delle sue voci non dice niente**. Basta una: quella verrebbe scritta vuota, e la buona
   passerebbe insieme a lei;
2. **si restituisce il PERCORSO**, non un `true`: il messaggio nomina `prescrizione_caratteristiche.colore`,
   perché «le caratteristiche prescritte sono vuote» manderebbe chi sta al banco a cercare il campo
   sbagliato.

E le sotto-chiavi tenute da `normalizzaContenuto` passano ora da `testoVivo`, **senza nominare `colore` e
`tipo` a mano**: si scorre ciò che quella funzione ha tenuto, così l'elenco delle sotto-chiavi resta uno solo.

⚠️ **Il confine, che è una scelta e ha la sua prova: si scende SOLO negli oggetti, MAI negli array.** Un
array non è una mappa di correzioni, è **un** valore. Dentro `denti_coinvolti` un `null` è un'**assenza
legittima** («questo dente non ha colore») che `validaDenti` accetta e normalizza: scendere anche lì
rifiuterebbe un carico buono.

🛑 **Capacità DECLINATA e dichiarata nel codice:** `{colore: null}` è **rifiutato**, benché la penna sappia
cancellare la sotto-chiave (`contenuto - p_campo`). Il motivo è lo stesso della regola: il sesto contenuto
dell'Allegato XIII è obbligatorio, e togliergli una caratteristica la fa sparire dal documento.
➡️ **È un contratto per il Task D:** a schermo «svuota il colore» prende **422**, e cancellare una
caratteristica **non è raggiungibile da questa strada**. Se servirà, è una decisione a sé.

### Le due mutazioni DOPO la correzione

**C3a — la regola torna a fermarsi al primo livello:**

```
=== MUTAZIONE C3a (DOPO la correzione): la regola sul vuoto torna a fermarsi al PRIMO livello ===
 ❯ tests/unit/correzioni-documento.test.ts (45 tests | 6 failed)
     × colore vuoto → rifiutata
     × colore di soli spazi → rifiutata
     × tipo vuoto → rifiutata
     × elementi come array vuoto → rifiutata
     × una sotto-chiave vuota accanto a una buona → rifiutata
     × e il messaggio NOMINA la sotto-chiave, non solo la voce che la contiene
 ❯ tests/unit/riemissione-route.test.ts (53 tests | 1 failed)
     × 🛑 correggere le caratteristiche con una casella SVUOTATA → 422 prima del render (C3)
 Test Files  2 failed | 2 passed (4)
      Tests  7 failed | 134 passed (141)
```

**C3b — tolta SOLO la ripulitura ai bordi delle sotto-chiavi:**

```
=== MUTAZIONE C3b (DOPO la correzione): tolta la ripulitura ai bordi delle SOTTO-chiavi ===
     × 🔑 le sotto-chiavi arrivano RIPULITE ai bordi, come i cinque testi di primo livello (D242)
AssertionError: expected { colore: '  A3  ', tipo: ' corona ' } to deeply equal { colore: 'A3', tipo: 'corona' }
 Test Files  1 failed (1)
      Tests  1 failed | 44 passed (45)
```

**C3c — il CONFINE spostato: la regola scende anche dentro gli array.**
🔑 **Questa mutazione è nata da una domanda che mi è stata fatta, e la domanda era giusta:** la prova del
confine (`denti_coinvolti: [{fdi: 22, scala: null, codice: null}]` → `ok`) **passa sia con la regola
vecchia sia con quella nuova**, quindi fino a qui era un'asserzione che nessuna mutazione poteva rendere
rossa — cioè, secondo il metro di questo compito, non era ancora una prova. Adesso lo è:

```
=== MUTAZIONE C3c: la regola scende ANCHE dentro gli array (il confine spostato) ===
     × ⚠️ …ma NON si scende dentro gli ARRAY: un dente senza colore non è un dente vuoto
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 97 passed (98)
```

➡️ Il confine **è provato**: spostarlo di un passo rifiuta un dente senza colore, che è un carico
legittimo.

### 🔵 Una cosa che dichiaro invece di nasconderla

Nella mutazione C3a **il caso `{colore: null}` NON si accende**, e le altre sei sì. Non è una svista della
prova: quel caso è rifiutato da **un'altra regola** — `normalizzaContenuto` scarta il valore non-stringa e
scatta il rifiuto delle sotto-chiavi scartate. Resta in suite perché documenta la **capacità declinata**
(il 422 su «svuota il colore» è un contratto verso il Task D), ma **non è quella asserzione a sorvegliare
la profondità**: quella la sorvegliano le altre sei.

📌 **E nel codice CORRETTO il messaggio è invece uniforme — misurato, non dedotto**, perché mi era stato
chiesto se le tre sotto-chiavi rispondessero in due modi diversi:

```
colore:null      => La correzione di «prescrizione_caratteristiche.colore» è vuota: …
tipo:null        => La correzione di «prescrizione_caratteristiche.tipo» è vuota: …
elementi:null    => La correzione di «prescrizione_caratteristiche.elementi» è vuota: …
elementi:[]      => La correzione di «prescrizione_caratteristiche.elementi» è vuota: …
```

➡️ Tutte e tre passano da `primoVuoto`, che ora arriva prima dell'allowlist: **una sola frase per lo stesso
gesto**, e il foglio del Task D non dovrà rendere due testi diversi per «casella svuotata». Il ripiego
sull'altra regola si vede **solo sotto la mutazione**, ed è per quello che quel caso lì non si accende.

---

## 2. 🔴 C1 — LA PORTA DEL TENANT SUL PAZIENTE

### La mutazione PRIMA della correzione

```
=== MUTAZIONE C1 (PRIMA della correzione): tolto .eq('laboratorio_id') dalla lettura del paziente ===
 Test Files  4 passed (4)
      Tests  130 passed (130)
```

🛑 **Centotrenta su centotrenta**, cioè l'intero corredo del Task C. Confermata la causa scritta dalla
revisione: il finto di `pazienti` passava da `chain`, che **inghiotte i `.eq()`** e risponde uguale a una
query filtrata e a una che non lo è.

### La correzione

`tests/unit/riemissione-route.test.ts`: la lettura di `pazienti` passa ora da **`chainSpia`** — lo stesso
strumento che l'esecutore del Task C aveva costruito per `dichiarazioni_conformita` e non aveva portato fin
qui — con il suo `filtriPazienti`, azzerato dentro `banco()` insieme a `filtriDdc` (o i filtri di una prova
colerebbero nella successiva e `arrayContaining` passerebbe su un residuo). La prova nuova asserisce **le
colonne su cui si filtra**, non l'esito:

```ts
expect(filtriPazienti).toEqual(
  expect.arrayContaining([['id', PAZIENTE_ID], ['laboratorio_id', LAB_ID]])
)
```

### La mutazione DOPO

```
=== MUTAZIONE C1 (DOPO la correzione): tolto .eq('laboratorio_id') dalla lettura del paziente ===
     × 🔴 …e la lettura del paziente CHIEDE il laboratorio della sessione, non solo l'identificativo
AssertionError: expected [ [ 'id', …(1) ] ] to deeply equal ArrayContaining{…}
 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 140 passed (141)
```

---

## 3. 🔴 C2 — IL FAIL-CLOSED SULL'ESITO IGNOTO

### La mutazione PRIMA della correzione

```
=== MUTAZIONE C2 (PRIMA della correzione): fail-closed indebolito, un esito IGNOTO passa per successo ===
 Test Files  4 passed (4)
      Tests  130 passed (130)
```

### La correzione

`tests/unit/correggi-e-riemetti.test.ts` — la finta porta ora `nuova_id`, così la prova passa dalla
**prima** metà della condizione e non dalla seconda (che ha già la sua prova tre righe più giù).

### Le due mutazioni DOPO — **una per metà della condizione**

```
=== MUTAZIONE C2 (DOPO la correzione): fail-closed indebolito — un esito IGNOTO passa per successo ===
       × 🛑 un esito che il contratto non dichiara NON si legge come successo (fail-closed)
AssertionError: promise resolved "{ stato: 'ok', …(6) }" instead of rejecting
      Tests  1 failed | 140 passed (141)

=== MUTAZIONE C2-specchio: tolta la SECONDA metà (un `ok` senza nuova_id) ===
       × un `ok` senza `nuova_id` non è un successo: mancherebbe la prova che la riga è nata
AssertionError: promise resolved "{ stato: 'ok', …(6) }" instead of rejecting
      Tests  1 failed | 20 passed (21)
```

➡️ Adesso **tutte e due le metà** di `if (esito !== 'ok' || typeof risposta.nuova_id !== 'string')` sono
provate, una per una. Prima ne era provata **una sola**, e non era quella che il brief mette al posto 1.

---

## 4. IL RIPRISTINO, E LA VERIFICA CHE NON RESTI TRACCIA

⚠️ **`git checkout --` non era utilizzabile su `correzioni.ts`**, perché lì la correzione **non è ancora
salvata**: ripristinare da git avrebbe cancellato il lavoro insieme alla mutazione. I tre file di
produzione sono stati copiati in una cartella temporanea prima di essere mutati, e rimessi da lì con un
`diff` di controllo.

```
$ git diff --stat
 src/lib/dichiarazione/correzioni.ts     | 79 +++++++++++++++++++++++++++++----
 tests/unit/correggi-e-riemetti.test.ts  | 13 +++++-
 tests/unit/correzioni-documento.test.ts | 51 +++++++++++++++++++++
 tests/unit/riemissione-route.test.ts    | 49 +++++++++++++++++++-
 4 files changed, 182 insertions(+), 10 deletions(-)
```

✅ `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts` e `src/lib/pdf/generate-ddc.ts`
**non compaiono**: nessuna traccia delle mutazioni. Nessun file sotto `supabase/`.

---

## 5. DOVE IL BRIEF SBAGLIA

### ① 🔴 Le mutazioni sono CINQUE, non tre — e questo cambia se il compito è finito

Il brief e il giudizio contano tre critici e chiedono «tutte e tre devono diventare rosse». Ma **C3 è due
difetti**: la profondità della regola **e** la ripulitura ai bordi delle sotto-chiavi (il giudizio la nomina
nella riga di §13, e la sonda l'ha confermata: `'   '` sopravviveva non ripulito). Sono due righe di codice
diverse, e vogliono **due mutazioni**. Con tre sole mutazioni, la riga che ripulisce sarebbe rimasta
**produzione senza una prova che possa fallire**.
➡️ Aggiunta anche la **mutazione a specchio** su C2 (l'altra metà della condizione), perché una condizione
con due metà vuole due prove — e una **sesta** sul confine degli array (§1, C3c), perché quella prova
passava sia con la regola vecchia sia con quella nuova: **sei in tutto**, non tre.

### ② 🟠 Il Passo 5 e il Passo 6 sono nell'ordine sbagliato

Il brief mette **prima il salvataggio, poi BP-1**. Così memoria e roadmap restano fuori dal salvataggio, e
la guardia di coerenza con `--staged` avvisa proprio quando un salvataggio tocca un verbale o una spec
**senza toccare la memoria** (§0A-bis) — e questo salvataggio tocca un resoconto in `.superpowers/sdd/`.
➡️ Fatto nell'ordine giusto: correzione → mutazioni → ripristino → `verify:full` → **BP-1** → un solo
salvataggio con i percorsi nominati.

### ③ 🔵 «Per C3 riproduci la mutazione» non è letterale

Per C1 e C2 si **rompe** un codice giusto. Per C3 il codice era **già rotto**: non c'è niente da mutare
prima: ciò che «si accende» è la **sonda** (e poi le prove nuove). Il brief lo lascia intendere ma non lo
dice, e una lettura letterale porterebbe a mutare codice funzionante per cercare un rosso che sta altrove.

### ④ 🔵 «Il numero deve salire»: sale quello delle PROVE, non quello dei FILE

Base `5606 | 68 su 454` → adesso `5617 | 68 su 454`. I file restano **454** perché le prove nuove
estendono i file che c'erano, ed è la cosa giusta: inventare un file nuovo per far salire quel numero
sarebbe stato un numero fatto salire, non una prova in più.

### ⑤ 🔵 In MEMORY.md la trappola delle «voci» è reale, e la guardia l'ha presa

Scrivendo la memoria ho usato la formula naturale «la voce 6 dell'Allegato XIII», e
`guardia-coerenza-documenti.mjs` è andata **rossa**: «*l'aggiornamento in testa rimanda alla «voce 6», che
NON esiste*». È esattamente l'avvertimento del brief, e la guardia lo fa rispettare da sé. Riscritto «il
sesto contenuto dell'Allegato XIII» → verde. 📌 Nella **roadmap** la stessa formula non dà problemi: il
vincolo è solo su MEMORY.md.

---

## 6. FASE 7 — LA VERIFICA PIENA

```
$ npm run verify:full ; ESITO=$? ; echo "VERIFY_EXIT=$ESITO"
 Test Files  448 passed | 6 skipped (454)
      Tests  5617 passed | 68 skipped (5685)
✓ Compiled successfully  (next build)
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde · ✅ reduced-motion · ✅ Coerenza verde · ✅ copia allineata
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
VERIFY_EXIT=0
```

📌 `verify:full` è girata **prima** delle scritture di BP-1 (che sono solo Markdown). L'unico controllo che
quelle scritture toccano è la guardia di coerenza, **rilanciata dopo**: `GUARDIA_EXIT=0`.

---

## 7. CHE COSA **NON** HO FATTO

### Fuori mandato — riferiti e non corretti (R-E2)

- 🟠 **I3 — la porta d'idempotenza è sorvegliata da UNA SOLA asserzione.** Con le due colonne invertite,
  «200 col successore» e «409 senza successore» **restano verdi**: la rete regge per il filo dedicato, non
  perché il comportamento sia sorvegliato. **Ho lavorato dentro quel file e non l'ho toccato.**
- 🔵 **M1 — lo `switch` della rotta non ha `default` né guardia di esaustività**, e non ha un `return`
  dopo. La rete è a tempo di compilazione ed è **accidentale**: nasce dal file di prova, non dalla rotta.
- 🟠 **I2 — `paziente_nome_snapshot` vince sull'embed** (`generate-ddc.ts:259`): correggere il solo
  `paziente_id` con lo snapshot pieno stampa il nome vecchio. Oggi 1 lavoro su 299, ma **il primo writer
  dello snapshot sta per essere questa rotta**: va deciso nel Task D.
- Già noti e non toccati: `riemetti_ddc_atomica` accetta ancora tutto (**la riga 26 della coda**) ·
  `{anno_ddc: null}` supera il controllo di presenza · **`numero_prescrizione`** (decisione di Francesco
  già presa: si sistema la radice, ed è un compito a sé).

### Dentro il mandato, ma non fatto — e lo dichiaro

- 🛑 **Nessuna prova contro il database vero.** Come per l'esecutore del Task C e per il revisore, **l'atto
  unico non è mai stato invocato**. Tutto ciò che questo compito misura è statico o unitario: in
  particolare, che il 422 su una caratteristica svuotata arrivi **prima** che un file finisca su Storage è
  provato sul finto, non sul banco. Resta il **Task 10**.
- 🛑 **Nessuna FASE 9 / 9b.** Nessuna superficie è toccata: si tocca un file di libreria e tre di prove.
  Restano dovute al **Task D**.
- **La prova a livello di rotta per C3 è una sola** (una casella svuotata → 422): le altre forme
  (`elementi: []`, `tipo: ''`, `null`) sono provate alla porta della libreria, dove vive la regola.
- **Il resto del giudizio non è stato riverificato.** Ho ripreso per buone le misure della revisione su
  ciò che non toccavo (i tredici `P0001`, le 36 chiavi di `riga`, gli indici unici, il gettone).
