# REFERTO DI REVISIONE INDIPENDENTE — Task 8 · D308

**Oggetto:** `fdbaa753` (il cancello) + `034505a2` (la coppia ⑤/⑥ aggiunta dopo autorevisione)
**Ramo:** `intervento-post-consegna` · **Revisore:** indipendente, non autore del codice
**Data:** 8 agosto 2026 · **Contratto:** piano Task 8 (righe 989-1055) · spec §1 e §1.1
**Niente è stato corretto.** Ogni mutazione applicata per misurare è stata ripristinata (`git checkout --`).

---

## Verdetto in una tabella

| cosa | esito |
|---|---|
| Il cancello **chiude** sui cinque campi | ✅ provato campo per campo, non dedotto (M9) |
| Il cancello **non è troppo largo** | ✅ i quattro confini ①②③④ verificati da me, non presi dal resoconto |
| **Isolamento fra laboratori** | ✅ integro: nessun identificativo arriva dal corpo della richiesta |
| **Predicato unico** (`<> 'annullata'`) | ✅ uno solo, identico in cinque posti |
| **Fail-closed** sulla lettura fallita | ✅ presente e provato (500, nessun UPDATE) |
| Le prove **misurano** o passerebbero comunque? | ✅ misurano — l'esperimento «cancello sbagliato» **rifatto da me** dà **3 su 5.555**, esattamente il numero dichiarato |
| Verde di stato | `vitest` 5487 passati, uscita 0 · `tsc` uscita 0, zero righe |
| **Critici** | **1** — la strada che il messaggio nomina non porta la correzione |
| Importanti · Minori · Note | 2 · 2 · 4 |

**Il cancello, di per sé, è costruito bene.** L'unico Critico non sta nel codice del Task 8: sta nella
promessa che il suo messaggio fa all'utente, e nel fatto che il percorso a cui rimanda — progettato
dalla spec §1.1/§4.5 e costruito dal Task 5 — non può mantenerla. Va riferito (R-E2), non corretto qui.

---

## 🔴 CRITICO — 1

### C1 — «apri Devo intervenire e l'app rifà il documento»: la strada c'è, ma riporta nella stessa stanza

**Il testo del 422** (`src/app/api/lavori/[id]/route.ts:590`) dice all'operatrice:

> «Per correggerlo apri «Devo intervenire» e scegli «dato sbagliato sulla dichiarazione»:
> **l'app rifà il documento** e conserva quello vecchio.»

**Quella frase è falsa in due modi indipendenti, e nessuno dei due è un'inferenza.**

**① Oggi quella strada non ha nessun chiamante.**
`grep -rn "errore_dato_dichiarazione\|riemett" src/components` → **una sola occorrenza**, ed è di un
altro dominio (`fatture/NotaCreditoButton.tsx:542`, «*potrai riemettere una nuova fattura*»). In
`scheda-v3/DevoIntervenire.tsx` — il foglio che il Task 9 dovrà toccare — sono **zero**. E
`grep -rn "dichiarazione/riemetti" src tests` trova la rotta e la sua prova unitaria
(`tests/unit/riemissione-route.test.ts`), **nessuna schermata**. Il Task 9 la collegherà; finché non
lo fa, il messaggio manda l'utente a una porta che nel foglio non esiste.

**② Quando il Task 9 la collegherà, il documento rifatto sarà IDENTICO nei cinque campi stampati.**
La catena, letta riga per riga:

| passo | file:riga | che cosa fa |
|---|---|---|
| l'effetto del motivo | `src/lib/qualita/effetti.ts:112-117` | `documento: 'riemetti'`, **`azione: null`** — registrare l'evento non tocca la dichiarazione |
| la rotta | `dichiarazione/riemetti/route.ts:144` | rilegge **la riga del lavoro dal database** e la passa a `riemettiDdC` |
| la costruzione | `generate-ddc.ts:251-261` | `prescrittore_nome`, `paziente_nome`, `tipo_dispositivo`, `descrizione_dispositivo` vengono **da quella riga**, che nessuno ha potuto correggere |
| la transazione | `riemetti_ddc_atomica` | annulla la vecchia **e inserisce la nuova nello stesso atto** — non esiste un istante con zero dichiarazioni vive |

➡️ **Il ciclo si chiude su sé stesso.** Il dato sbagliato non si può correggere prima (422 del
cancello), non si può correggere durante (la transazione è atomica), non si può correggere dopo (la
nuova dichiarazione è viva e il cancello richiude). Ogni giro brucia un progressivo e produce un
documento con lo stesso contenuto errato, marcando il precedente come «superato».

**Scenario di fallimento concreto** — è il caso della direttiva del 27/07, non un'ipotesi di
laboratorio: l'addetta al front desk sbaglia a digitare il paziente; il lavoro viene consegnato; la
dichiarazione nomina il paziente A mentre il manufatto è del paziente B. Da quel momento **l'app non
ha nessun percorso** che produca una dichiarazione corretta. **Art. 21(2) MDR** — la dichiarazione è
messa a disposizione di *un determinato paziente, identificato mediante il nome, un acronimo o un
codice numerico* — resta violato sul manufatto vero, che è esattamente il difetto che la spec §1
descrive e che D308 esiste per chiudere.

🔑 **Dove sta il difetto, perché non venga mandato all'esecutore sbagliato.** Il cancello del Task 8 è
**giusto**: la mia batteria lo prova. Il difetto sta nel **disegno dell'ondata** — spec §1.1 e §4.5
rimandano la correzione a un percorso che, così com'è costruito (Task 5), non la può portare. Il
contributo del Task 8 è **la frase** che rende la promessa esplicita all'utente. Per R-E2 lo
**riferisco e non propongo il rimedio**: quale sia la strada giusta (una finestra di correzione
aperta dall'evento? una riemissione che accetti i dati corretti? un documento di azione correttiva?)
è una decisione dell'ondata, non del revisore.

---

## 🟠 IMPORTANTI — 2

### I1 — La spec dice che §1.1 «chiude il caso (b) da sola». Non lo chiude: `clienti.nome`/`cognome` non hanno nessun cancello

Spec §4.5 distingue due letture di `destinatario_errato` e conclude: «*correggere `cliente_id`/
`richiedente_nome` su un lavoro con dichiarazione viva è rifiutato… Chi sbaglia intestazione passa di
lì.*»

**Ma il nome del prescrittore che finisce sul foglio non viene sempre dal lavoro.**
`generate-ddc.ts:251-255` — le righe che la spec §4.5(b) **cita lei stessa** — ripiegano su
`${cliente.cognome} ${cliente.nome}` **ogni volta che `richiedente_nome` è vuoto**, cioè nel caso
normale per cui il ripiego esiste. E `nome` e `cognome` sono in
`PATCHABLE_FIELDS_CLIENTE` (`src/app/api/clienti/[id]/route.ts:16-23`), **senza nessun cancello**.

➡️ La voce ⑤ dell'Allegato XIII punto 1 si cambia da una seconda porta, aperta. Il documento già
consegnato è congelato (il PDF porta uno snapshot), quindi **non diventa falso: diventa stantio** — ed
è per questo che è Importante e non Critico. Ma una dichiarazione **riemessa** stamperebbe un
prescrittore diverso senza che niente lo fermi, e la frase della spec «lo chiude da sola» è
sopravvalutata.
**Fuori mandato (R-E2): riferito, non corretto.**

### I2 — `codice_paziente` è correggibile senza cancello, ed è un identificativo del paziente ai sensi dell'Art. 21(2)

`src/app/api/pazienti/[id]/route.ts:35` — l'allowlist della PATCH pazienti contiene
`codice_paziente`. E `generate-ddc.ts:258` costruisce `paziente_nome` come
`paziente_nome_snapshot ?? paziente.nome_cognome ?? paziente.codice_paziente`.

**Art. 21(2) nomina il codice numerico come identificativo valido del paziente**, alla pari del nome.
Quindi l'identità del paziente ha una porta che il cancello D308 non guarda. Stessa natura di I1
(documento congelato → diventa stantio, non falso) e stessa collocazione: **fuori mandato, riferito**.

---

## 🟡 MINORI — 2

### m1 — Il commento del codice descrive il rischio **al contrario**, e il prossimo lettore sbaglierà diagnosi

`src/app/api/lavori/[id]/route.ts:491-493` (e resoconto §1.4) dicono che, senza le quattro colonne
nuove nella rilettura, «*il cancello smetterebbe di accendersi **in silenzio** su quel campo*».

**Misurato: è il contrario.** Senza la colonna, `existing.<campo>` è `undefined`, `?? null` lo porta a
`null`, e un valore **immutato e non nullo** in arrivo risulta **diverso** → il cancello si accende
**di più**, non di meno. Siccome `descrizione`, `cliente_id` e `tipo_dispositivo` sono `NOT NULL`
(`supabase/schema.sql`, tabella `lavori`) e la scheda rimanda sempre il valore corrente, l'effetto
dominante sarebbe **un 422 su ogni salvataggio della scheda** — cioè proprio il difetto «cancello
troppo largo» che il Task 8 ha giustamente evitato altrove. Il silenzio si verifica solo nel caso
minoritario in cui arriva `null`.

Il difetto è di **descrizione**, non di comportamento: il codice è giusto e `tsc` ferma comunque la
rimozione di una colonna (sonda del resoconto §4, `TS2339`). Ma un commento che sbaglia verso è un
commento che manderà il prossimo a cercare la cosa sbagliata.

### m2 — Il messaggio è asserito su 2 campi su 5

Solo ② (`descrizione`, entrambe le frasi: «Devo intervenire» e «dato sbagliato sulla dichiarazione») e
⑥ (`paziente_id`, la sola prima frase) controllano il testo. Per `cliente_id`, `richiedente_nome` e
`tipo_dispositivo` si controlla soltanto lo stato 422 e l'assenza di UPDATE.

**Perché è Minore e non peggio:** M9 (sotto) prova che quel 422 è del cancello e non di un altro ramo
della rotta, e M3 prova che il testo è inchiodato — e il ramo di codice che produce il messaggio è
**uno solo**. La copertura è quindi sufficiente; la scrivo perché la domanda 1 del mandato chiedeva
esplicitamente «cinque campi, cinque prove **col messaggio**», e la risposta onesta è «cinque prove
sullo stato, due sul messaggio, con la ragione per cui basta».

---

## Note — 4

**n1 — `ModificaRigaSheet` butta via il messaggio: già trovato dall'esecutore, e confermato.**
Resoconto §5.1. Verificato in modo indipendente: `ModificaRigaSheet.tsx:190-193` fa
`if (!res.ok) { onErrore(MESSAGGIO_ERRORE); return }` senza leggere il corpo, e
`MESSAGGIO_ERRORE` (`:65`) è «*Non è stato possibile salvare la modifica. Riprova.*». Il ramo
«Dentista» (`:303-310`) manda `salva({ cliente_id: id })`, cioè uno dei cinque. L'autorevisione era
esatta, compreso il rilievo che «Riprova» è un consiglio **sbagliato**. L'altra porta
(`useLavoroForm.ts:385-389`) legge `json.error` e il messaggio arriva intero: confermato anche
quello. **Non lo riconto come mio ritrovamento.**

**n2 — La prova ⑭ misura meno del suo titolo, come l'esecutore stesso dichiara (resoconto §6④).**
Confermato: nel finto «il laboratorio di chi chiama» e la stringa `'lab-1'` coincidono per
costruzione. Che il filtro porti davvero il laboratorio dell'utente lo stabiliscono altre due cose,
entrambe verificate da me: la lettura di `getFreshLabContext` (`src/lib/supabase/lab-context.ts:88-100`
→ `fetchUtenteRow` → `utenti.laboratorio_id`), e la mutazione M5, che togliendo il filtro accende
**31 prove su 9 file**.

**n3 — La riemissione non filtra per laboratorio, il cancello sì.** `generate-ddc.ts:383-387` conta le
dichiarazioni vive col solo `lavoro_id`; il cancello D308 aggiunge `laboratorio_id`. Non è una
divergenza di predicato (lo stato è trattato allo stesso modo) e non apre nulla — il cancello è il più
stretto dei due, cioè il verso sicuro. La segnalo perché la prossima persona che confronta i due
blocchi noterà la differenza e si chiederà se sia voluta.

**n4 — Il conteggio delle prove in `ua-app/CLAUDE.md` §2 dice 3283, oggi sono 5555.** Già segnalato
dall'esecutore (§5.2). Confermato dal mio giro di base.

---

## Le sette domande del mandato, con la misura

### 1. Il cancello CHIUDE davvero, su tutti e cinque? — **sì, e nessuno è dedotto**

La prova ⑦ passa i cinque uno per uno. Per escludere che qualcuno di quei 422 venisse **da un altro
ramo della rotta** (il sospetto vero è `tipo_dispositivo`, che ha una validazione enum che risponde
anch'essa **422**, `route.ts:662-664`) ho tolto dal confronto **solo** `tipo_dispositivo`:

```
AssertionError: campo tipo_dispositivo: expected 200 to be 422
      Tests  1 failed | 16 passed (17)
```

➡️ **Il 422 di `tipo_dispositivo` è del cancello.** (`bite_splint`, il valore usato dalla prova, è in
`MACRO_SLUGS` — `src/lib/domain/tipi-lavoro.ts:40,43` — quindi la validazione enum non scatta.)
Stessa verifica per `descrizione` con M8: togliendola dal confronto accende **6 prove**.

### 2. Il cancello NON è troppo largo? — **no, e i quattro confini li ho verificati io**

| confine chiesto dal mandato | come l'ho verificato | esito |
|---|---|---|
| ① un campo **fuori** dai cinque passa con dichiarazione viva | prova ③ + M4 (che sposta il 422 a 200) non la tocca | ✅ |
| ② i cinque passano **senza** dichiarazione viva | prova ④ (solo annullate) e ⑧ (chiave assente: la dichiarazione **non si legge nemmeno**) | ✅ |
| ③ mandare uno dei cinque **con lo stesso valore** non dà 422 | prova ⑤ + **E1**: col cancello a chiave-presente ⑤ diventa rossa | ✅ |
| ④ più campi di cui **solo uno** vietato | coppia ⑤/⑥ — corpi identici tranne `paziente_id`: 200 contro 422 | ✅ |

**E il confine regge anche sui bordi che nessuno aveva chiesto**, che ho verificato risalendo dal
codice all'interfaccia — perché il modo classico di essere «troppo larghi» è un `''` che pareggia con
un `null`:

- `descrizione`, `cliente_id`, `tipo_dispositivo` sono **`NOT NULL`** in banca dati → un `''` in
  arrivo è sempre un cambio vero, mai un falso positivo.
- `richiedente_nome` passa da `testoVivoDaCorpo` **prima** del cancello (D242): `''` e `'   '`
  diventano `null` e pareggiano. Prova ⑪.
- `paziente_id` è l'unico nullable dei cinque, e **non ha nessuno scrittore nell'interfaccia**
  (`grep -rn "paziente_id" src/components src/hooks` → **0 righe**): non può arrivare come `''`.
- Il ramo «Dentista» di `ModificaRigaSheet` è protetto da `if (id)` (`:307`), quindi non manda mai
  stringa vuota.

➡️ **Nessun percorso reale dell'interfaccia produce un 422 su un campo non cambiato.**

### 3. La lettura resta dentro il laboratorio del chiamante? — **sì**

- `id` viene dall'URL (`await params`), mai dal corpo.
- `context.laboratorioId` viene da `utenti.laboratorio_id` dell'utente autenticato
  (`lab-context.ts:88-100`), mai dal corpo.
- La rilettura del lavoro (`route.ts:496-502`) filtra già per `laboratorio_id`: **un lavoro di un
  altro laboratorio prende 404 prima che il cancello esista**.
- Il conteggio delle dichiarazioni (`:568-573`) filtra per `lavoro_id` **e** `laboratorio_id`.
  Siccome gira col client di servizio (RLS scavalcata), quel filtro è **portante**: M5 lo toglie e
  accende **31 prove su 9 file**.

➡️ **Un lavoro di un altro laboratorio non può influenzare l'esito, e nemmeno essere osservato.**

### 4. Il predicato è UNO SOLO? — **sì, `<> 'annullata'` in cinque posti, mai un elenco**

| posto | forma |
|---|---|
| `supabase/migrations/20260710090000_…:15-17` (indice `ddc_lavoro_attiva_unique`) | `WHERE stato <> 'annullata'` |
| `supabase/migrations/20260807182614_…:92-94` (RPC `riporta_a_pronto_atomica`) | `AND stato <> 'annullata'` |
| `supabase/migrations/20260804211256_…:60` | `AND stato <> 'annullata'` |
| `src/lib/pdf/generate-ddc.ts:387` e `:412` | `.neq('stato', 'annullata')` |
| **il cancello D308**, `route.ts:573` | `.neq('stato', 'annullata')` |

Il censimento su tutto `src/` e `supabase/` non trova **nessuna** formulazione a elenco. E la forma è
inchiodata da una prova: M7 la sostituisce con `.eq('stato','consegnata')` e accende **27 prove su 9
file** — comprese ④ e ⑭, che cadono per ragione di comportamento e non solo di forma del finto.
`stato` è `NOT NULL` (`schema.sql:1266`), quindi `<>` non lascia scappare righe.

### 5. Fail-closed sulla lettura fallita? — **sì**

`route.ts:579-584`: se la lettura torna errore → **500**, nessun UPDATE. Prova ⑰. M6 toglie il ramo:
accende **esattamente 1 prova**. È una rete sottile ma corretta: quel ramo ha una sola conseguenza
osservabile, e c'è una prova che la osserva.

### 6. L'esperimento «cancello sbagliato», rifatto da me — **il numero dell'esecutore è vero**

`git diff` vuoto, applicato **solo** il predicato del filtro (`(campo) => campo in payload`), suite
intera:

```
### E1-chiave  uscita=1
 Test Files  1 failed | 444 passed | 6 skipped (451)
      Tests  3 failed | 5484 passed | 68 skipped (5555)
× ⑤ 🛑 corpo INTERO della scheda coi cinque INVARIATI + campi non stampati cambiati → 200
× ⑩ `null` su un valore già assente NON è un cambio → 200
× ⑪ D242: `richiedente_nome: ""` contro un nome ASSENTE non è un cambio → 200
```

➡️ **Confermato: 3 rosse su 5.555.** Le tre prove del piano (①②③ del brief) sono **fra le verdi**.
Se il Task 8 avesse messo in opera il cancello proposto dal piano, **tutto il repository sarebbe stato
verde su un difetto che rendeva il lavoro di sola lettura**. La correzione dell'esecutore non è una
rifinitura: è il compito.

⚠️ E la sua precisazione è corretta: ho misurato la **variante più favorevole al piano**. Il piano
«tale e quale» non avrebbe chiesto le quattro colonne nuove, quindi avrebbe fatto cadere anche ⑯.

### 7. Le mie mutazioni — nove, di cui otto diverse da quelle dell'esecutore

| # | mutazione | prove accese | su 5.555 |
|---|---|---|---|
| E1 | il cancello guarda la **chiave** invece del valore *(replica)* | 3 — ⑤ ⑩ ⑪ | 3 |
| M1 | confronto **invertito** (`===`) | 10 | 10 |
| M2 | le **quattro colonne** tolte dalla rilettura | 1 — solo ⑯ | 1 |
| M3 | messaggio reso **generico** | 2 — ② ⑥ | 2 |
| M4 | **422 → 200** | 5 | 5 |
| M5 | via il filtro **`laboratorio_id`** | 31 su 9 file | 31 |
| M6 | via il ramo **fail-closed** | 1 — ⑰ | 1 |
| M7 | predicato a **elenco di stati** | 27 su 9 file | 27 |
| M8 | `descrizione` tolta dal confronto | 6 | 6 |
| M9 | `tipo_dispositivo` tolto dal confronto | 1, e nomina il campo | 1 |

**Nessuna mutazione è passata inosservata.** La più sottile — M2 — accende una sola prova, e per un
motivo strutturale dichiarato: il finto della riga del lavoro restituisce tutte le colonne
indipendentemente da quelle chieste, quindi ⑯ (che guarda le **colonne chieste**) è l'unica rete
possibile a livello unitario. Il secondo strato è `tsc`, e la sonda del resoconto §4 lo prova con un
valore che **deve** essere rifiutato (`TS2339`).

### 8. Il confronto campo per campo è completo? — **sì, tutte e cinque le colonne**

`route.ts:498` chiede `descrizione, richiedente_nome, cliente_id, paziente_id` in aggiunta a
`tipo_dispositivo`, che c'era già. `memorizzato` (`:545-551`) è scritto **campo per campo** invece
che con un indice: è la scelta che fa accorgere `tsc` se una colonna esce dalla `select`, e la sonda
del resoconto §4 lo dimostra con l'errore incollato. Prova ⑯ come terza rete.

---

## Verifiche di stato — output reale

```
cd "…/ua-app" && npx vitest run 2>&1 | tail -8
 Test Files  445 passed | 6 skipped (451)
      Tests  5487 passed | 68 skipped (5555)
   Duration  40.76s
uscita=0            ← letta da variabile, non dalla pipe

cd "…/ua-app" && npx tsc --noEmit > /tmp/tsc-rev8.log 2>&1; echo "uscita=$?"
uscita=0
$ wc -l < /tmp/tsc-rev8.log
       0
```

`npm run verify:full` **non lanciato**, come chiede il mandato.

**Albero alla consegna:**

```
git diff --stat        → vuoto (ogni mutazione ripristinata)
git log --oneline -1   → 034505a2
git status --porcelain → ?? .superpowers/sdd/pronto-task-8-review.md
```

⚠️ L'unico file non tracciato è **questo referto**. Non l'ho salvato con un commit: farlo sposterebbe
`HEAD` da `034505a2`, che il mandato chiede di lasciare fermo.

---

## Che cosa deve sapere chi esegue il Task 9

1. 🔴 **Prima di collegare il tasto, leggere C1.** Il Task 9 collega «Devo intervenire» alla
   riemissione. Così com'è, quel collegamento **rifà un documento identico** nei cinque campi
   stampati e non corregge niente. Non è una cosa che il Task 9 possa sistemare da solo scrivendo
   sei testi: è una decisione dell'ondata su **dove** cade la finestra di correzione. Va portata a
   Francesco prima, non dopo.
2. **Il criterio è il VALORE, mai la chiave.** Se la schermata disabilita dei campi, la domanda è
   «*questo valore cambierebbe?*», non «*questo campo è nel corpo?*». Il numero che lo giustifica è
   3 su 5.555 (§6): la differenza fra le due letture è invisibile a quasi tutta la rete di prove.
3. **`ModificaRigaSheet` butta via il messaggio** (n1). Il ramo «Dentista» manda uno dei cinque
   campi e mostra «Riprova», che è un consiglio sbagliato: riprovando non funzionerà mai.
4. **`CAMPI_STAMPATI` è esportata** da `src/app/api/lavori/[id]/route.ts`. Se all'interfaccia serve
   sapere quali sono i cinque, il nome esiste: una lista scritta due volte diverge.
5. **La guardia sta nell'API e ci resta.** Qualunque cosa faccia la schermata, il 422 c'è: provato da
   17 casi, di cui 9 si spengono se il cancello sparisce.
6. **Due porte laterali restano aperte** (I1, I2): il nome del cliente e il codice del paziente si
   correggono senza cancello, e ognuno dei due cambia una voce dell'Allegato XIII punto 1. Non sono
   del Task 9, ma vanno in coda prima che l'ondata si chiuda — la spec §4.5 oggi dice che quel caso
   è chiuso, e non lo è.
