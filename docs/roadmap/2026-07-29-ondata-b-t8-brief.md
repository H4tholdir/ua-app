# Brief — T8 · ondata (b) · «la foto si può togliere, e sparisce davvero»

**Per:** un esecutore fresco, **un compito solo** (R-E1). **Ramo:** `ondata-b-schermate` (già aperto — 🛑 **mai
un worktree**, `git checkout -b` e basta; il worktree si porta dietro un secondo `package-lock.json` e l'app
risponde 404 su tutte le route).
**Piano:** `docs/roadmap/2026-07-29-ondata-b-piano-v2.md` §6/T8 (dieci punti + i sei fatti della lettura) e §5/**P12**.
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **D51, D52** sono di oggi e
riguardano proprio te.
**Punto di ripresa della sessione:** `docs/roadmap/2026-07-29-ondata-b-blocco3-handoff.md`.

> 📍 **Perché questo file sta in `docs/roadmap/` e non in `.superpowers/sdd/` come i brief precedenti:**
> quella cartella è **ignorata da git** (`.superpowers/sdd/.gitignore` è `*`), e i brief di prima erano
> usa-e-getta *dopo* l'esecuzione. Questo invece **è il punto di ripresa di una sessione**: lasciarlo lì
> significherebbe far puntare `SESSION_ACTIVE.md` a un percorso che non sopravvive a un cambio di macchina,
> e che **la guardia dei documenti non può controllare** perché non è nel repo. Stessa regola già scritta
> per le sonde: *ciò che deve durare si incolla in un documento*.

> 🔑 **Il tuo mandato include CERCARE DOVE QUESTO BRIEF SBAGLIA.** Otto task su otto dell'ondata (a) hanno
> trovato un difetto reale nel piano che li istruiva. Se qualcosa qui non torna — una coordinata, un numero,
> una riga di ragionamento — **fermati e riferiscilo**: è lavoro, non ostruzione.

---

## 1. Il fatto, prima del compito

Oggi una fotografia caricata su un lavoro **non si può togliere**. T8 aggiunge il modo di toglierla, e
«toglierla» qui significa **scrivere una data in `deleted_at`** — cancellazione **morbida**: il file
nell'archivio **resta** e non si tocca.

🔴 **Ma il soft-delete da solo non fa sparire niente, e questa è l'intera ragione d'essere del task.**
La catena è **verificata**, non ipotizzata: la riga viene marcata cancellata → **il file resta nello
storage** → `getSignedUrl` riesce lo stesso → **la foto torna a schermo con una URL firmata fresca e
valida**. Non un'anteprima rotta: proprio la foto. Chi cancella, ricarica e se la ritrova.

**Perché il database non se ne accorge da solo:** la regola di isolamento (RLS) che filtra `deleted_at`
**esiste già** (`002_fase2_schema.sql:258-259`), e anche l'indice parziale (`:262-263`).
🛑 **Ma tutti e otto i punti che leggono le immagini usano `getServiceClient()`, che SCAVALCA la RLS**:
quella regola **non viene mai valutata**. Il filtro va scritto **a mano nella query**, o non c'è.

✅ **Nessuna migration:** `deleted_at` esiste già su `lavori_immagini` (`002_fase2_schema.sql:255`, riflessa
in `database.types.ts:3019/3030/3041`). **Non scrivere migration. Non rigenerare i tipi.**

---

## 2. Cosa NON è tuo — leggilo prima, così non lo fai

| fuori | perché | dove va |
|---|---|---|
| 🛑 **Il bottone «Elimina foto» e ogni altra UI** | **D51**: il perimetro di T8 è il **solo motore**. Una superficie nuova farebbe scattare il §0B (mockup → screenshot → approvazione di Francesco **prima** del React) | task successivo, già agganciato |
| 🛑 **Il contatore di `TabImmagini.tsx:571`** (conta anche le cancellate) | stesso motivo: è schermo | stesso task successivo. ⚠️ **Lo incontrerai** mettendo il filtro al sito 2, e da quel momento è **provabilmente sbagliato**: `riferiscilo nel rapporto, NON correggerlo` — è già deciso, e una terza correzione silenziosa è esattamente ciò che D52 è servita a evitare |
| ⚠️ **L'`update()` del `PATCH` a `:68-74` porta DUE `.eq()` invece di tre** (manca `lavoro_id`) | non è sfruttabile (`id` è chiave primaria) e **non è stato deciso** | **riferiscilo** nel rapporto (R-E2), non correggerlo. 🔑 Ma il tuo `DELETE` ne porta **tre**: non copiare quel modello |
| 🛑 **Rendere pubblico il bucket** per far funzionare le anteprime | sarebbero fotografie cliniche di pazienti **senza autenticazione** | vietato per iscritto, non è una preferenza |
| 🛑 **`url` e `tipo` su `lavori_immagini`** | `url` è **morto** (`getPublicUrl` su bucket privato); `tipo` è cablata a `'foto'` all'INSERT e il vocabolario vero vive dentro `descrizione` | non toccarle |

🛑 **E il nome della funzione, quando arriverà a schermo, è «Elimina foto».** Mai «diritto all'oblio», mai
«richiesta del paziente»: il laboratorio è **responsabile** del trattamento, non titolare, e offrire quella
funzione lo spingerebbe verso l'Art. 28(10) GDPR, cioè a **diventare titolare**. Vale già da ora per ogni
stringa che scrivi (messaggi di errore compresi).

---

## 3. Il lavoro — quattro pezzi, in quest'ordine

### (A) L'handler `DELETE`

**File:** `src/app/api/lavori/[id]/immagini/[imgId]/route.ts` — ⚠️ **esiste già**, 82 righe, oggi ha **solo
`PATCH`**. **Aggiungi un handler a un file esistente, non creare una rotta.**

La forma, ricalcando ciò che il file già fa (`:13-34`): `isSameOrigin` → `getFreshLabContext` →
`assertLabOperativo(context, 'DELETE')` → `getServiceClient()`. **Nessun gate di ruolo** (D-3: non ce l'ha
nemmeno la consegna, che emette la dichiarazione di conformità).

Poi, e qui sta la sostanza:

1. **Guardia di esistenza** — `id` + `lavoro_id` + `laboratorio_id` **e `deleted_at IS NULL`** → 404 se manca.
2. **La finestra** — si legge lo stato del lavoro: **finché `lavori.stato != 'consegnato'`** si può togliere;
   fuori finestra **409** con un messaggio che dice *perché*. Il precedente in casa per questa forma è
   `api/lavori/[id]/lavorazioni/route.ts:62-67` (409 su `incluso_in_fattura`).
   ⚠️ **Il 409 e il suo messaggio sono TUOI, e si provano QUI — non aspettano il bottone.** D51 sposta fuori
   la parte visibile, e l'unico futuro consumatore di questo 409 è quel bottone: **non è una ragione per
   rimandarlo né per lasciarlo senza prova.** Un server regge da solo. Il bottone che *mostra* la
   spiegazione (disabilitato, **mai nascosto**) arriva col task successivo e leggerà ciò che scrivi ora.
3. **La mutazione, e i suoi TRE `.eq()`** — `.update({ deleted_at: new Date().toISOString() })` con
   **`id` + `lavoro_id` + `laboratorio_id`** sulla `update()` **stessa**, non solo sul pre-controllo,
   più `.is('deleted_at', null)` e **`.select()` per contare le righe toccate**.
   🔑 **Il motivo per cui i tre `.eq()` non sono pedanteria:** la rotta usa il client di servizio, **la RLS
   è aggirata**, e quei tre confronti sono **l'unico controllo di appartenenza che esiste**. Il pre-controllo
   e la mutazione sono **due viaggi separati**: ciò che vale nel primo non vincola il secondo.
4. **Il conteggio delle righe** — se non è **esattamente una**, non si prosegue in silenzio: decidi tu il
   codice (0 righe = qualcuno l'ha già tolta nel frattempo; più di una = impossibile, ma **fail-closed**) e
   **scrivi la ragione accanto**.
5. **Il blob NON si tocca.** Nessuna chiamata a `storage.remove`. La conservazione del file è deliberata.
6. **Successo:** `{ ok: true }` (precedente: `api/cicli/[id]/route.ts:170` — *verificato oggi con `grep -n`*).

⚠️ **Il precedente più vicino porta con sé un difetto — non copiarlo.** `api/cicli/[id]/route.ts` è il
modello giusto per la forma (guardia → conteggio → 409 → soft delete → `{ ok: true }`), **ma a `:167`
rimanda `deleteError.message` grezzo al client**, che è esattamente ciò che il punto (B) qui sotto chiude.
Copia la forma, non quella riga. *(È un'occorrenza fuori dal tuo file: **riferiscila**, non correggerla.)*

### (B) I due difetti del `PATCH` — **sono nel tuo mandato** (D52)

Non è una correzione di nascosto: è **scritta qui prima che tu cominci**, quindi R-E2 è rispettata.

- **(a) La guardia di esistenza del `PATCH` (`:37-43`) non filtra `deleted_at`.** Oggi è innocua perché
  nessuna riga è cancellata. 🔴 **Dal minuto in cui il tuo `DELETE` esiste**, quella guardia lascia
  modificare una riga **già cancellata** e risponde **200 OK su un fantasma**. **È un buco che apre T8**,
  quindi lo chiude T8: aggiungi `.is('deleted_at', null)`.
- **(b) `:77` rimanda `updateError.message` GREZZO al client** (voce **G9-76** della roadmap). Messaggio
  nostro al client, dettaglio nel registro del server. Precedente in casa fatto bene:
  `api/pazienti/route.ts:227-228` — ⚠️ **coordinata riverificata oggi**: il verbale e la roadmap dicono
  `:45-50`, che era vera **prima** che T6 riscrivesse quel file. Le due righe di oggi sono
  `console.error('GET /api/pazienti — lettura fallita:', error.message)` seguito da un messaggio nostro con
  `status: 500`. 🔑 **Che una coordinata di ieri sia già stantia è la norma su questo ramo, non l'eccezione:
  ogni riferimento che usi, riaprilo.**

### (C) Gli otto siti di lettura — **pesati, non uguali**

Il filtro da aggiungere all'innesto è `.is('lavori_immagini.deleted_at', null)`.

✅ **La grafia è PROVATA (P12), e il piano NON sbagliava.** Un rilievo sosteneva che andasse scritta con
l'alias (`immagini.deleted_at`) e che quella del piano desse «un 400 o un colpo a vuoto», ragionando dal
precedente `ddc:` sulla **riga adiacente**. **Falso: PostgREST accetta entrambe le grafie ed entrambe
mordono** — sonda in sola lettura, con un valore che DEVE essere rifiutato (`tipo = 'INESISTENTE'` → figli
**0**, padri **60** intatti). Tabella completa: piano §5, **P12**. 🛑 **Il rilievo è scritto lì apposta**,
perché il ragionamento è convincente e qualcuno lo rifarà: **non «correggere» questa grafia**.
🔑 **E la stessa sonda chiude un'altra paura:** su innesto **semplice** il filtro toglie i **figli** e
**lascia i padri** — nessun lavoro sparisce perché ha tutte le foto cancellate. Nessuno degli otto usa
`!inner` (verificato uno per uno).

**Le otto coordinate sono ESATTE** (verificate sito per sito il 29/07, non a campione) — ✅ **e riverificate
al momento di scrivere questo brief**, una riga ciascuna: `provato:` `sed -n '<riga>p' <file>` su tutte e
otto → **tutte e otto restituiscono `immagini:lavori_immagini(*),`**. Non è una rilettura dei siti (vietata,
il lavoro è già pagato): è il controllo che il riferimento non sia scivolato.

| # | sito | peso |
|---|---|---|
| **1** | `src/app/(app)/lavori/[id]/page.tsx:30` | 🔴 **reale e grave** — arriva sotto gli occhi di un utente |
| **2** | `src/app/(app)/lavori/[id]/modifica/page.tsx:51` | 🔴 **reale e grave** — idem |
| 3 | `src/app/api/lavori/[id]/route.ts:302` | igiene (il `GET` non ha consumatori: ogni `fetch` verso quella rotta è un `PATCH`) |
| 4 | `src/app/api/fatture/batch/route.ts:179` | igiene |
| 5 | `src/app/api/fatture/[id]/xml/route.ts:163` | igiene |
| 6 | `src/lib/pdf/generate-ricevuta-consegna.ts:21` | igiene |
| 7 | `src/lib/pdf/generate-etichetta.ts:37` | igiene |
| 8 | `src/lib/pdf/generate-ifu.ts:21` | igiene |

🔑 **I 3-8 sono payload morto, ed è misurato:** `immagin|foto|storage_path` nei tre template PDF
(`src/components/features/pdf/*`) → **0 · 0 · 0**; in `generate-xml.ts` gli unici due riscontri sono
`xml_storage_path` e `pdf_storage_path`, che sono i percorsi **della fattura**, non le foto.
➡️ **Il filtro va messo anche lì — è igiene e si fa — ma le PROVE si spendono sui due che contano.**
Trattare gli otto come se pesassero uguale è il modo di spendere l'attenzione sui sei che non contano e
**sbagliare i due che contano**.

### (D) Le prove — e **come si provano otto siti che non si possono eseguire**

**B19 chiede un'asserzione per sito, su tutti e otto.** Rispettala, ma **pesata**: ai sei basta
un'asserzione sottile che il filtro sia applicato; **ai due serve la prova vera.**

🔴 **Il problema pratico, detto prima che ci sbatti dentro:** i siti 1 e 2 sono **componenti server
asincroni** — non si montano con la finta della catena Supabase come una rotta. E oggi **nessun test in
tutto il repo nomina `lavori_immagini`** (`provato:` `grep -rln "lavori_immagini" tests/` → **zero file**).
🛑 **Se non trovi la forma della prova, il rischio non è che tu non provi nulla: è che tu declassi in
silenzio proprio i due siti che contano** — cioè esattamente il difetto che la pesatura 2+6 esiste per
evitare.

✅ **La forma esiste già in casa, per lo STESSO problema, e la usi:**
`tests/unit/ddc-lettori-gruppo-b.test.ts` — un innesto filtrato su **cinque** lettori (fra cui **tre degli
otto tuoi**: `(app)/lavori/[id]/page.tsx`, `api/lavori/[id]/route.ts`, `api/fatture/[id]/xml/route.ts`).
Legge il **sorgente** con `readFileSync`, conta le occorrenze dell'innesto, conta quelle del filtro e
asserisce che **i due numeri siano UGUALI**, con un `it` per file.

🔑 **Perché quella forma è giusta e non ricade nella lista nera:** non elenca ciò che non deve esserci —
**lega ogni innesto al suo filtro**. Un nono sito aggiunto domani senza filtro **rompe l'uguaglianza**, e
anche un innesto in più nello stesso file. È la differenza fra «non vedo nomi vietati» e «i conti tornano».

**Quindi, in concreto:**
- **tutti e otto** → una prova statica sul modello di `ddc-lettori-gruppo-b.test.ts`, un `it` per file,
  **conteggio contro conteggio** (non «contiene il filtro»);
- **i due che contano (1 e 2)** → in più, la prova che il filtro **morde davvero**, e la strada l'ha già
  aperta **P12**: sonda **in sola lettura, solo conteggi**, sulla forma esatta della query del sito, con un
  **valore che DEVE essere rifiutato** accanto a un **controllo positivo**. 🛑 **La sonda va INCOLLATA nel
  rapporto** (query, filtri, esiti): `scripts/tmp/` è ignorato da git e sparisce con la sessione — è
  successo già, ed è per questo che P12 vive dentro il piano e non dentro uno script;
- **la rotta `DELETE`** → lì la finta della catena funziona: è dove stanno le prove eseguibili vere
  (le forme d'ingresso, i tre `.eq()`, il conteggio delle righe, il 409, i due difetti chiusi da D52).

⚠️ **Se decidi una forma diversa da questa, va bene — ma scrivila e di' perché.** Ciò che non è ammesso è
arrivare in fondo con i due siti coperti meno dei sei.

---

## 4. 🔑 Come si scrivono le prove qui — la lezione di ieri, e ti riguarda in pieno

**Ieri, su T6, una guardia sulla proiezione è rimasta verde su 104 prove su 104 mentre il difetto era
presente.** Era scritta come **lista nera**: sei nomi di colonna che non dovevano comparire.
`select('*')` **non ne contiene nessuno** — il jolly aggira tutti i divieti dell'elenco.

➡️ **La regola che ne è nata, e che vale per te:** una guardia su una **stringa costruita** (proiezione,
filtro, predicato) si scrive con **un'uguaglianza sulla stringa esatta** (`toBe`), **mai** con un elenco di
ciò che non deve esserci.

**Le tue asserzioni hanno la stessa forma di trappola.** «La risposta non contiene l'immagine cancellata»
passa **a vuoto** se l'innesto non restituisce niente del tutto, o se la finta non aveva mai una riga
cancellata. Quindi, **per i siti 1 e 2, obbligatorio**:

1. un **controllo positivo** accanto a ogni negativo — una foto **non** cancellata che **deve** comparire,
   nella stessa prova o nella sua gemella. Senza, il negativo non distingue «filtrato» da «vuoto»;
2. l'asserzione sul **filtro costruito**, con l'uguaglianza sulla stringa esatta;
3. **la mutazione**: togli il filtro dal codice di produzione e verifica che la prova **muoia**. Se resta
   verde, la prova è vuota — riscrivila e dillo nel rapporto.

⚠️ **Attenzione alla finta magra.** `tests/unit/helpers/supabase-chain-mock.ts` tiene `select` fra i passanti: con
una finta che lascia cadere i metodi, un'asserzione può restare verde qualunque cosa il codice chieda.

**R-P4 — dopo il primo rosso:** il rosso da «modulo non trovato» non prova niente. Metti un **abbozzo
inerte** (l'handler che risponde sempre la stessa cosa), **conta** quante asserzioni si accendono e
**scrivi il numero** (`N su M`). 🛑 **E incolla l'abbozzo in testa al file di prova, col comando**: ieri
«27 su 34» contro «29 su 35» — tutta la differenza stava nella forma dell'abbozzo, che nessuno aveva
scritto. **Un `N su M` senza l'abbozzo non è riproducibile, quindi non è una prova.**
Prima delle asserzioni, **enumera le forme d'ingresso** (id inesistente, immagine di un altro lavoro,
immagine di un altro laboratorio, immagine già cancellata, lavoro consegnato, lavoro inesistente, corpo
non-JSON dove serve), ognuna col suo caso **o col suo «non coperta, perché»**.

**R-P1 — i marchi:** ogni blocco che scrivi nasce `non eseguito`, **col comando accanto** che lo verifica.
Si provano le **assunzioni sull'ambiente**, non le righe di codice; e ogni vincolo si prova **con un valore
che DEVE essere rifiutato**, con l'esito incollato.

---

## 5. Le trappole operative — si leggono prima, non dopo

- ⚠️ **`vitest` su questo repo non è deterministico, e va detto invece che nascosto.** La suite intera è
  verde in **5 esecuzioni su 8**; le rosse portano **sempre un solo test**, **sempre con una durata
  anomala**, e **la vittima ruota** (`PassoTipo.test.tsx:165` 23,6 s · `lavoro-form-messaggio-errore.test.tsx`
  8,9 s · una non attribuita) — file **mai toccati sul ramo**, verdi in isolamento tre giri su tre.
  Diagnosi già in casa: `.superpowers/sdd/diagnosi-flake-vitest.md:235`.
  ➡️ **La regola, e ha DUE metà:** un solo rosso con durata anomala **in un file che non hai toccato** →
  **isolalo prima di indagare**. 🛑 **Ma la stessa firma su un file che HAI toccato — o nella zona
  immagini/lavori, che è la tua — è un difetto TUO finché non provi il contrario.** La prima metà senza la
  seconda è un permesso di ignorare un rosso vero.
- ⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` → `/usr/bin/trash .next`.
- 🛑 **Mai `git add -A`**: `git commit -F <file-messaggio> -- <percorsi>`. I **backtick nel messaggio di
  commit vengono eseguiti dalla shell**, per questo il messaggio va da file.
- 🛑 **Mai stampare righe di `pazienti`** (dato Art. 9): solo conteggi. Vale anche per le foto.
- 🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — **non è nel repo**, vive solo su questo disco.
  **Il server MCP di Supabase NON è autenticato** in questa sessione.
- 🛑 **Lascia la banca dati alla baseline e riverificala: `294 · 0 · 916 · 48`.** Solo letture.
- ⚠️ `scripts/tmp/` è ignorato da git: una sonda che deve durare si **incolla in un documento**.

---

## 6. Prima di dire «fatto» — FASE 7, con l'uscita reale incollata

```bash
npx tsc --noEmit && npx vitest run && npx next build
```

Tutti e tre, **nessuno sostituisce l'altro**: `tsc` **non valida la firma degli handler di rotta**, solo
`next build` la vede — e tu stai aggiungendo un handler.
Poi `node scripts/guardia-coerenza-documenti.mjs`.

**Nel rapporto** — **da creare** tu, `docs/roadmap/2026-07-29-ondata-b-t8-report.md`, 📍 **in `docs/` e non
in `.superpowers/sdd/` per la stessa ragione per cui ci sta questo brief**: ti si chiede di **incollare una
sonda** che altrimenti sparisce con la sessione, e i difetti che trovi devono sopravviverti. *(La guardia dei
documenti ha bloccato la prima stesura di questa riga proprio perché citava il rapporto come se esistesse:
un riferimento a una cosa futura si dichiara «da creare», o manda la sessione dopo a cercarla.)*
la misura R-P4 **con l'abbozzo incollato** · le mutazioni fatte e quali prove hanno ucciso · **i difetti del
piano e di questo brief che hai trovato** (elencali, sono la parte più preziosa) · i ritrovamenti fuori
mandato (R-E2) · l'uscita reale dei tre comandi · la baseline riverificata.

🔑 **E una cosa che vale più di un test verde: se una tua prova è debole, dillo tu.** Ieri l'esecutore di T6
ha trovato da solo un difetto vero **dentro le proprie prove** e l'ha scritto — è il motivo per cui quel
task è chiuso davvero. **Non si scrive quante istanze di un difetto restano** («chiusa alla terza» era
falso, ce n'era una quarta): si scrive **il metodo**, e lo si rilancia.
