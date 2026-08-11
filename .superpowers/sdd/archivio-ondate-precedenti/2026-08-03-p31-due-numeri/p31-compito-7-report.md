# Referto Compito 7 — «Le due schermate dell'anagrafica»

Data verifica: 03/08/2026 (letta dall'orologio, §0F: `date` → `Mon Aug 3 16:35:29 CEST 2026`).
Ramo: `p31-due-numeri-per-il-cliente`. Commit: `afef7f83`.

## Cosa ho fatto

Due schermate, due design system diversi, stessa regola D184 (i due numeri hanno lo stesso peso):

1. **`NuovoDentistaSheet.tsx`** (v3) — da 4 a 5 campi: Nome, Cognome, **Telefono dello studio**
   (`inputMode="tel"`, → `telefono`), **Cellulare WhatsApp** (`inputMode="tel"`, `aiuto=` il testo
   esatto D186, → `cellulare_whatsapp`), Studio. Stati rinominati (`telefonoStudio`/`cellulare`),
   `resetForm()` pulisce entrambi, `handleSubmit` scrive nei due campi separati — entrambi restano
   facoltativi (vincolo di creazione solo su nome/cognome, invariato).
2. **`ClienteEditSheet.tsx`** (v2.3 legacy) — tipo, stato iniziale, salvataggio e JSX aggiornati
   per il nuovo campo. **Non ho importato nulla da `src/components/ds/`**: l'aiuto è un `<p>` con
   uno stile locale (`aiutoStyle`, stessa famiglia/dimensione degli altri helper text del file,
   es. `PortaleFatturazioneCard.tsx:108` `pinHelperStyle`). Placeholder del telefono cambiato da
   `+39 02 1234567` a `02 1234567` (D182).
3. **I quattro anelli del passo 3-bis** — tutti e quattro verificati sul codice e chiusi (dettaglio
   sotto, "Il conteggio degli anelli").

## Il conteggio degli anelli (passo 3-bis)

Ho verificato ciascuno dei quattro **leggendo il file**, non fidandomi dell'elenco del brief:

| # | Dove | Prima | Dopo |
|---|------|-------|------|
| ① | `clienti/[id]/page.tsx` — `select()` della scheda (riga ~127) | non selezionava `cellulare_whatsapp` | aggiunta subito dopo `telefono` |
| ② | `clienti/[id]/page.tsx` — tipo `ClienteDettaglio` (riga ~20) | mancava il campo | aggiunto subito dopo `telefono: string \| null` |
| ③ | `clienti/[id]/page.tsx` — oggetto passato a `ClienteModificaButton` (riga ~266) | mancava il campo | aggiunto subito dopo `telefono: c.telefono,` |
| ④ | `api/clienti/[id]/route.ts` — `select()` della GET singolo cliente (riga ~52) | non selezionava `cellulare_whatsapp` | aggiunta subito dopo `telefono,` |

**Ho cercato un quinto anello e non l'ho trovato**: `ClienteModificaButton.tsx` inoltra `cliente`
così com'è (nessuna `select`/proiezione propria, tipizzato da `ClienteEditData` — che è la
*destinazione*, non un anello della catena di lettura). Nessun altro file nel repo consuma la GET
`/api/clienti/[id]` per popolare questo pannello (verificato con grep: gli unici `fetch` verso
quell'URL nel codice sono due `PATCH`, in `ClienteEditSheet.tsx` e in `PortaleFatturazioneCard.tsx`).

**Prova che rings ②③ erano davvero necessari, non solo "belli da avere" (R-P1):** ho reso
`cellulare_whatsapp` **obbligatorio** (non opzionale) in `ClienteEditData` PRIMA di toccare
`page.tsx`, e fatto girare `tsc` — doveva rifiutare l'oggetto letterale mancante, ed è quello che
ha fatto:
```
src/app/(app)/clienti/[id]/page.tsx(259,7): error TS2741: Property 'cellulare_whatsapp' is
missing in type '{ ... }' but required in type 'ClienteEditData'.
```
Dopo aver chiuso ②③, `tsc` è tornato pulito.

⚠️ **Ring ① NON è protetto da nessun controllo del genere**, e va detto perché non si ripeta in
silenzio: `page.tsx:141` fa `cliente as unknown as ClienteDettaglio` — un doppio cast che spezza il
legame fra la stringa del `select()` e il tipo. Se qualcuno togliesse `cellulare_whatsapp` dal
`select()` domani, `tsc` non se ne accorgerebbe: il campo tornerebbe `undefined` a runtime e
`ring ③` lo passerebbe comunque (il tipo lo dichiara presente, ma nessuno controlla che i DATI lo
siano). L'unica prova che protegge ring ① oggi è quella end-to-end del passo 3-ter (sotto), **e
solo se un giorno gira contro il database vero** — la mia prova con `render()` costruisce
`cliente` a mano e non passa da questo `select()`. Lo dichiaro come limite noto, non lo nascondo.

## Le prove TDD, con output vero

### Wizard — sequenza red→green (le 3 nuove prove del brief, Passo 1-2)

Aggiunte le 3 prove nuove **da sole**, componente ancora invariato (stashato):
```
npx vitest run tests/unit/NuovoDentistaSheet.test.tsx
```
```
Test Files  1 failed (1)
     Tests  3 failed | 7 passed (10)
```
**Esattamente 3 fallite**, come prevede il brief. Le 3 rosse: le due `D184` (etichette assenti) e
quella del corpo della richiesta.

**Abbozzo inerte (R-P4), prima di finire l'implementazione:** ho aggiunto i due campi con le
etichette giuste e l'aiuto, ma **senza** wire di `handleSubmit` su `cellulare_whatsapp`. Girate
solo le 3 prove nuove:
```
Tests  1 failed | 2 passed | 7 skipped (10)
```
**2 su 3** si accendono (i due campi esistono, l'aiuto è collegato) — la terza (quella del corpo
della richiesta) resta rossa:
```
AssertionError: expected undefined to be '333 1234567'
 expect(body.cellulare_whatsapp).toBe('333 1234567')
```
Questo isola la prova che conta davvero: le prime due controllano solo che l'interfaccia esista,
la terza controlla che il dato arrivi nel posto giusto.

**Wire completo → verde:**
```
npx vitest run tests/unit/NuovoDentistaSheet.test.tsx
```
```
Test Files  1 passed (1)
     Tests  10 passed (10)
```

### Pannello di modifica — passo 3-ter (file nuovo: non esisteva nessuna prova per questo pannello)

Scritte 3 prove in `tests/unit/ClienteEditSheet.test.tsx` (nuovo): esistenza dei due campi,
salvataggio corretto quando si tocca il cellulare, e **la prova che conta di più** — salvare
senza toccare il cellulare non lo cancella.

**Rosso, dimostrato togliendo apposta la riga del salvataggio** (`cellulare_whatsapp:
form.cellulare_whatsapp.trim() || null,` rimossa da `handleSalva`):
```
npx vitest run tests/unit/ClienteEditSheet.test.tsx
```
```
Tests  2 failed | 1 passed (3)
AssertionError: expected undefined to be '333 1234567'
  (in entrambe: "cambiare il cellulare lo salva…" e "salvare senza toccare il cellulare NON lo cancella")
```
**Verde, con la riga rimessa:**
```
Test Files  1 passed (1)
     Tests  3 passed (3)
```

**Nota tecnica su come ho reso `getByLabelText` utilizzabile in questo pannello (v2.3):** il
`FieldGroup` locale di `ClienteEditSheet.tsx` non lega il `<label>` all'`<input>` (niente
`htmlFor`/`id`, il label non avvolge il campo) — l'ho verificato con una sonda usa-e-getta prima di
scrivere le prove: `getByLabelText('Email')` falliva su TUTTI i campi del pannello, anche prima di
qualsiasi mia modifica. Ho trovato nel repo il precedente giusto per risolverlo nello STESSO stile
già in uso altrove in v2.3: `RichiestaClientForm.tsx:324` mette `aria-label="Tipo di lavoro"`
direttamente sul controllo, senza toccare `FieldGroup`. Ho fatto lo stesso, **solo sui tre campi
che il mio mandato tocca** (Telefono dello studio, Cellulare WhatsApp, Email — quest'ultimo perché
la prova del passo 3-ter lo usa per simulare "correggo un altro campo"). Gli altri ~13 campi del
pannello restano senza `aria-label`, quindi `getByLabelText` continua a fallire su di loro — non
li ho toccati, e lo segnalo sotto come ritrovamento fuori mandato (R-E2).

### Prove esistenti modificate — una per una, col perché

Solo **2** (contate, non stimate): entrambe in `tests/unit/NuovoDentistaSheet.test.tsx`, entrambe
per lo stesso motivo — cercavano l'etichetta «Cellulare/WhatsApp» che apparteneva al campo unico
ora sdoppiato.

1. **`mostra SOLO i 4 campi A7: ... Cellulare/WhatsApp ...`** → **letta**: descriveva un vincolo
   reale ("sono solo 4, niente fiscali") che resta vero nella sua parte "niente fiscali"; la parte
   "4 campi / etichetta Cellulare/WhatsApp" è esattamente il design superato da D184. Rinominata
   in **"mostra SOLO i 5 campi D184"**, aggiornate le due `getByLabelText` alle nuove etichette,
   tenuta invariata la parte che verifica l'assenza dei campi fiscali.
2. **`submit valido → POST /api/clienti con {nome, cognome, telefono, studio_nome} ...`** →
   **letta**: verificava che il valore digitato nel campo unico finisse in `body.telefono` — è
   esattamente il comportamento che D184 rompe di proposito (quel valore ora deve finire in
   `cellulare_whatsapp`, non in `telefono`). Riscritta per compilare i due campi separatamente e
   verificare che il corpo della richiesta porti **entrambe** le chiavi, nell'ordine in cui il
   componente le costruisce (`nome, cognome, telefono, cellulare_whatsapp, studio_nome`).

Le altre 5 prove preesistenti nello stesso file (submit vuoto, label Dr., errore rete/500, errore
fetch throw, bottone disabled) non toccano il campo telefono/cellulare e sono rimaste **invariate,
verdi prima e dopo**.

### Suite intera + FASE 7

```
npx vitest run
```
```
Test Files  390 passed | 3 skipped (393)
     Tests  4521 passed | 19 skipped (4540)
```
(L'avviso jsdom `Not implemented: navigation to another Document` è preesistente, non tocca questi
file — già documentato come tale nei referti dei compiti precedenti.)

```
npx tsc --noEmit
```
→ nessun output, zero errori.

```
npx next build
```
→ completata, tutte le route compilate (incluse `/clienti/[id]` e le API `clienti`).

## File cambiati

- `src/app/(app)/clienti/[id]/page.tsx` — ring ①②③ (select, tipo, oggetto per il pannello).
- `src/app/api/clienti/[id]/route.ts` — ring ④ (select della GET singolo cliente).
- `src/components/features/clienti/ClienteEditSheet.tsx` — Passo 4: tipo, stato, salvataggio,
  campo nuovo, `aria-label` sui 3 campi toccati, `aiutoStyle`.
- `src/components/features/wizard/NuovoDentistaSheet.tsx` — Passo 3: 5 campi, stati, submit.
- `tests/unit/NuovoDentistaSheet.test.tsx` — 3 prove nuove (Passo 1) + 2 prove riscritte (sopra).
- `tests/unit/ClienteEditSheet.test.tsx` — **nuovo**, 3 prove (non esisteva nessuna prova per
  questo pannello prima di oggi).

⚠️ Il Passo 6 del brief elencava solo 3 file per il commit (`ClienteEditSheet.tsx`,
`NuovoDentistaSheet.tsx`, `tests/unit/NuovoDentistaSheet.test.tsx`) — un elenco scritto prima che
il passo 3-bis esistesse. Ho committato **tutti e sei** i file toccati davvero (compresi i due
anelli in `page.tsx`/`api/clienti/[id]/route.ts` e il test nuovo del pannello): un commit che
lasciasse fuori i ring ①④ o la prova del passo 3-ter avrebbe reintrodotto esattamente il difetto
distruttivo che il compito doveva chiudere.

## Autorevisione

- **Completezza:** tutti e quattro gli anelli del passo 3-bis verificati sul codice (non
  sull'elenco) e chiusi; cercato un quinto, non trovato, cercato con grep non con la memoria.
  La prova del passo 3-ter c'è **e discrimina** (dimostrato togliendo la riga e rimettendola).
- **Qualità:** il testo dell'aiuto è stato copiato — non ritrascritto — dal mockup approvato
  (`docs/design/mockups/2026-08-03-p31-due-numeri.html:230`, id `a-cell-wa-aiuto`) in ENTRAMBI i
  file, e confrontato byte per byte con uno script (`È`/em-dash inclusi): identico nei tre posti
  (mockup, wizard, pannello). L'ordine dei cinque campi (Nome, Cognome, Telefono dello studio,
  Cellulare WhatsApp, Studio) verificato anch'esso a tre vie (task, brief, mockup) con grep.
- **Disciplina:** nessun import da `src/components/ds/` in `ClienteEditSheet.tsx` (grep verificato
  post-modifica). Nessun `duration` in linea (le uniche transizioni del pannello restano
  `t('fast','exit')` e `motionTokens.spring.soft`, invariate). Bersagli tappabili: nel pannello
  (v2.3) i nuovi input ereditano `inputStyle` invariato (`height: '44px'`, riga dichiarata nel
  file); nel wizard (v3) i nuovi `CampoTesto` ereditano `ALTEZZA_CAMPO` da `Campo.tsx:20` (64px) —
  componente che non ho modificato, cito la fonte invece di dichiarare una misura mia.
- **Prove:** output pulito su tutti e tre i comandi FASE 7, incollato sopra, non parafrasato.

## Ritrovamenti fuori mandato (R-E2 — riferiti, non corretti)

1. **`FieldGroup` di `ClienteEditSheet.tsx` non lega `<label>` a `<input>` per ~13 campi.**
   `getByLabelText` fallisce oggi su Studio/Clinica, Nome, Cognome, Indirizzo, CAP, Città, Prov.,
   Partita IVA, Codice fiscale, Codice SDI, PEC, Listino, Sconto %, Modalità pagamento — verificato
   empiricamente con una sonda usa-e-getta prima di scrivere le prove di questo compito. È anche un
   difetto di accessibilità reale (i lettori di schermo non associano l'etichetta visibile al
   campo), non solo un limite dei test. Ho aggiunto `aria-label` **solo** ai 3 campi che il mio
   mandato tocca (necessario per far girare la prova del passo 3-ter); estendere la correzione agli
   altri 13 è un lavoro a parte, fuori da "due numeri per il cliente".
2. **Quinto anello, un livello più sotto i quattro del brief — verificato, non corretto.**
   `ClienteEditSheet.tsx:91-110` inizializza `form` con un OGGETTO letterale (non una funzione
   lazy) dentro `useState`: React lo usa solo al PRIMO mount dell'istanza. Il componente che porta
   quello stato è `ClienteEditSheet` stesso — e `ClienteModificaButton.tsx:51-55` lo monta
   **sempre**, **senza `key`**: l'apertura/chiusura è governata dalla prop `isOpen`, che fa
   smontare/rimontare solo il sottoalbero DENTRO `<AnimatePresence>{isOpen && (…)}</AnimatePresence>`
   — non l'istanza di `ClienteEditSheet` che possiede l'hook. Il caso riproducibile: **si apre il
   pannello, non si tocca nulla, si chiude; nel frattempo un ALTRO percorso (es. il foglio di
   consegna D183) aggiorna `cellulare_whatsapp` per quel cliente; si riapre il pannello — il campo
   mostra ancora il valore del PRIMO mount**, non quello appena scritto altrove. Da lì, premere
   Salva senza accorgersene sovrascrive il valore nuovo con quello vecchio. Stessa classe di
   difetto che questo compito doveva chiudere, un livello più in profondità e per QUALSIASI campo,
   non solo `cellulare_whatsapp`. Non l'ho corretto: precede questo compito, e la correzione (un
   `useEffect` di resync, o un `key={cliente.id}` sul componente) è una modifica di comportamento
   più ampia di "due numeri per il cliente".
3. **Il mockup approvato (D186) NON raffigura il pannello di modifica.** L'ho verificato prima di
   scrivere il layout: gli scatti/il disegno coprono la scena A (wizard, "Nuovo dentista") e la
   scena B ("Il foglio della consegna" — un foglio a UN campo solo, D183, per quando manca il
   cellulare al momento della consegna). **Questa è un'altra schermata**, di un altro compito della
   serie P31 — non l'ho costruita. Il layout del pannello di modifica (i due numeri affiancati
   nella stessa griglia 1fr/1fr già esistente, Email spostata sulla propria riga) è una scelta mia,
   non pre-approvata: applica meccanicamente D184 (stesso peso, stessa colonna, stesso
   `inputStyle`) ma **deve ancora passare per il GATE ESTETICO L2 (FASE 9b)** — non l'ho eseguito,
   non è nel perimetro TDD di questo compito, e lo segnalo esplicitamente qui perché non resti un
   buco silenzioso a fine ondata.
4. **BP-1 (`memory/MEMORY.md` / `ROADMAP-UFFICIALE.md`)** non aggiornato da me: con 9 compiti in
   sequenza su un solo ramo, presumo sia lavoro dell'orchestratore a fine ondata — lo segnalo
   invece di deciderlo di mia iniziativa in silenzio.

## Dubbi

Nessuno bloccante. Un solo punto di giudizio, dichiarato sopra e non nascosto: la scelta di layout
per il pannello di modifica (punto 3 dei ritrovamenti) non ha un mockup approvato alle spalle — ho
scelto la soluzione che applica D184 nel modo più meccanico possibile, ma è FASE 9b a doverla
promuovere o bocciare, non questo referto.

---

## Addendum (03/08/2026) — chiusura del rilievo Importante della revisione, più una piccola cosa

**Cosa chiudeva:** l'unico rilievo di livello Importante rimasto aperto dopo la revisione di
questo compito — ring ① (`page.tsx`, sopra, §"Il conteggio degli anelli") non aveva NESSUNA rete
che impedisse di reintrodurre in silenzio l'assenza di `cellulare_whatsapp` dalla select del
pannello. Ring ②③ sono protetti da `tsc` (campo obbligatorio in `ClienteEditData`, provato con
`TS2741` — vedi sopra); ring ④ (select GET della rotta) non è sul percorso di lettura del
pannello, ma è la stessa forma di rischio, senza rete. Più una piccola correzione: il commento di
intestazione di `NuovoDentistaSheet.test.tsx:7-10`, rimasto al disegno a quattro campi con
l'etichetta unica «Cellulare/WhatsApp» — il disegno di PRIMA di D184.

### La prova nuova

`tests/unit/cellulare-whatsapp-tripwire.test.ts` — stessa forma di `tests/unit/prezzo-tripwire.test.ts`,
seguita e non reinventata: TRIPWIRE dichiarato esplicitamente come euristica onesta (non
enforcement forte), header che spiega COSA si rompe e QUAL È LA CONSEGUENZA (non solo "campo
mancante nella select"), e un describe finale "ha i denti" con fixture sintetiche che provano che
la regex non è vacua (trova il campo quando c'è, non lo trova quando manca, non confonde la
select di `clienti` con quella di un'altra tabella). Estrae il corpo del `.select()` incatenato a
`.from('clienti')` da due file — `src/app/(app)/clienti/[id]/page.tsx` e
`src/app/api/clienti/[id]/route.ts` — e verifica che contenga `cellulare_whatsapp`. Se l'estrazione
stessa fallisse (query riscritta in una forma che la regex non riconosce più), il test lancia un
errore esplicito invece di passare in silenzio (fail-closed, R-P1): un tripwire che tace quando
non capisce più cosa sta leggendo non è un tripwire.

🔑 **Perché la rete giusta è una prova statica che legge i sorgenti, e non un test che esegue la
pagina:** `page.tsx` è un Server Component async che chiama `getLabContext()` e un client Supabase
reale (`getServiceClient()`) — farlo girare in vitest richiederebbe mock pesanti di Next.js e del
database. Ma anche costruendo quei mock, NON basterebbe a intercettare questo difetto: il
problema non è che la pagina si rompe se manca il campo, è che **`tsc` non protegge la stringa del
`.select()`** a causa del doppio cast `cliente as unknown as ClienteDettaglio` (page.tsx, riga
142). Un mock tipizzato secondo `ClienteDettaglio` avrebbe SEMPRE `cellulare_whatsapp`, anche se
la query reale avesse smesso di chiederlo al database — il tipo non nasce dalla query, il cast
rompe quel legame. L'unico modo per accorgersi che qualcuno ha tolto la parola
`cellulare_whatsapp` dalla stringa del `.select()` è leggere quella stringa. Un test comportamentale
verificherebbe il tipo, non la query; qui serve verificare la query.

### Prova che discrimina — rosso col campo tolto, verde col campo rimesso (output vero)

**Verde, prima di toccare nulla** (`cellulare_whatsapp` presente in `page.tsx:129`):
```
$ npx vitest run tests/unit/cellulare-whatsapp-tripwire.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

**Tolto temporaneamente** `cellulare_whatsapp` dalla select di `page.tsx:129`
(da `telefono, cellulare_whatsapp, email,` a `telefono, email,`):
```
$ npx vitest run tests/unit/cellulare-whatsapp-tripwire.test.ts

 ❯ tests/unit/cellulare-whatsapp-tripwire.test.ts (5 tests | 1 failed) 4ms
     × src/app/(app)/clienti/[id]/page.tsx: la select del cliente include cellulare_whatsapp

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/cellulare-whatsapp-tripwire.test.ts > TRIPWIRE — cellulare_whatsapp nella select del cliente (P31/Task 7) > src/app/(app)/clienti/[id]/page.tsx: la select del cliente include cellulare_whatsapp
AssertionError: src/app/(app)/clienti/[id]/page.tsx: la select del cliente NON include più cellulare_whatsapp. tsc non se ne accorge (il doppio cast `cliente as unknown as ClienteDettaglio` lo zittisce): il campo arriverebbe VUOTO al pannello di modifica, e ClienteEditSheet.tsx salva `form.cellulare_whatsapp.trim() || null` — aprire il pannello per correggere un altro campo (es. l'email) CANCELLEREBBE il cellulare del cliente in silenzio. Rimetti cellulare_whatsapp nella select.: expected '\n      id, studio_nome, nome, cognom…' to match /\bcellulare_whatsapp\b/

- Expected:
/\bcellulare_whatsapp\b/

+ Received:
"
      id, studio_nome, nome, cognome, telefono, email,
      partita_iva, codice_fiscale, codice_sdi, pec,
      indirizzo, cap, citta, provincia, paese,
      listino_numero, sconto_percentuale, modalita_pagamento,
      non_soggetto_fe, portale_token, portale_fatturazione_attiva, portale_pin_hash, note
    "

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```
Rosso confermato, e SOLO su quella prova: le altre 4 (select GET della rotta + i 3 fixture
sintetici "ha i denti") restano verdi — la regressione è isolata al file giusto, non un fallimento
a cascata.

**Rimesso a posto**, e verificato che il file sia tornato IDENTICO a prima:
```
$ git diff --stat "src/app/(app)/clienti/[id]/page.tsx"
(nessun output — git non vede alcuna differenza)

$ diff "src/app/(app)/clienti/[id]/page.tsx" <copia di backup fatta prima della modifica>
(nessun output — i due file sono byte per byte identici)
```
E il test torna verde:
```
$ npx vitest run tests/unit/cellulare-whatsapp-tripwire.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

**Stessa prova ripetuta sulla SECONDA asserzione (`route.ts`)**, perché una prova osservata verde
una volta sola su un vincolo non è provata (R-P1 — «un vincolo si prova con un valore che DEVE
essere rifiutato»): la prima stesura di questo addendum aveva verificato il rosso/verde SOLO su
`page.tsx`, lasciando l'asserzione su `route.ts` osservata solo verde. Chiuso rifacendo lo stesso
giro anche lì.

Tolto temporaneamente `cellulare_whatsapp` dalla select GET di `route.ts` (da
`telefono,\n cellulare_whatsapp,\n email,` a `telefono,\n email,`):
```
$ npx vitest run tests/unit/cellulare-whatsapp-tripwire.test.ts

 ❯ tests/unit/cellulare-whatsapp-tripwire.test.ts (5 tests | 1 failed) 4ms
     × src/app/api/clienti/[id]/route.ts: la select GET del cliente include cellulare_whatsapp

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/cellulare-whatsapp-tripwire.test.ts > TRIPWIRE — cellulare_whatsapp nella select del cliente (P31/Task 7) > src/app/api/clienti/[id]/route.ts: la select GET del cliente include cellulare_whatsapp
AssertionError: src/app/api/clienti/[id]/route.ts: la select GET del cliente NON include più cellulare_whatsapp. Questa rotta non è sul percorso di lettura del pannello di modifica (quello passa da page.tsx), ma è la stessa forma di rischio: se il campo sparisce da qui, ogni consumer che legge il cliente da questa API riceve un cellulare vuoto senza che tsc se ne accorga. Rimettilo nella select.: expected '\n        id,\n        laboratorio_id…' to match /\bcellulare_whatsapp\b/

 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```
Rosso confermato, e SOLO sulla prova di `route.ts` — le altre 4 (inclusa quella di `page.tsx`)
restano verdi.

Rimesso a posto e riverificato:
```
$ git diff --stat "src/app/api/clienti/[id]/route.ts"
(nessun output)
$ diff "src/app/api/clienti/[id]/route.ts" <copia di backup fatta prima della modifica>
(nessun output — file identico)
$ npx vitest run tests/unit/cellulare-whatsapp-tripwire.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)
```
Ora entrambe le asserzioni della prova nuova sono state osservate rosse E verdi, non solo verdi.

### La piccola cosa

`tests/unit/NuovoDentistaSheet.test.tsx:7-15` (righe 7-10 nella versione segnalata dalla
revisione) — il commento di intestazione descriveva ancora il wizard a QUATTRO campi con
l'etichetta unica «Cellulare/WhatsApp», il disegno di prima di D184. Aggiornato per descrivere i
CINQUE campi attuali — Nome, Cognome, **Telefono dello studio** e **Cellulare WhatsApp** distinti
e di **pari peso** (D184), Studio — e il testo di aiuto approvato in **D186**.

### Verifiche rieseguite, output vero

```
$ npx vitest run tests/unit/cellulare-whatsapp-tripwire.test.ts
 Test Files  1 passed (1)
      Tests  5 passed (5)

$ npx vitest run tests/unit/NuovoDentistaSheet.test.tsx tests/unit/ClienteEditSheet.test.tsx
 Test Files  2 passed (2)
      Tests  13 passed (13)

$ npx tsc --noEmit
$ echo $?
0
```
(`tsc --noEmit` non produce output quando non trova errori: zero righe stampate, exit code 0.)

### File toccati in questo addendum

- `tests/unit/cellulare-whatsapp-tripwire.test.ts` — nuovo.
- `tests/unit/NuovoDentistaSheet.test.tsx` — solo il commento di intestazione, righe 7-15.
- `src/app/(app)/clienti/[id]/page.tsx` — toccato SOLO durante la prova di discriminazione
  (rimozione/ripristino manuale del campo dalla select), poi ripristinato byte per byte prima del
  commit: `git diff` su questo file è vuoto, non entra nel commit.
- `src/app/api/clienti/[id]/route.ts` — stesso trattamento, stesso esito: toccato solo per la
  prova di discriminazione, ripristinato byte per byte, `git diff` vuoto, non entra nel commit.

### Ritrovamenti fuori mandato (R-E2)

1. Già nel referto originale sopra (§"Ritrovamenti fuori mandato"): il quinto anello
   (`ClienteEditSheet.tsx:91-110`, `useState` inizializzato con un oggetto letterale invece che con
   una funzione lazy — stessa famiglia di rischio, un livello più sotto). Resta fuori da questo
   addendum, come già dichiarato lì.
2. **Il brief di questo addendum localizza la select di `page.tsx` a "riga 52-59"**: nel file reale
   è alle righe **126-138** (129 per `cellulare_whatsapp`). "52-59" corrisponde invece a dove
   `cellulare_whatsapp` compare nella select GET di **`route.ts`** (riga 52) — una citazione
   incrociata fra i due file nel brief, non un difetto del codice. Il doppio cast a "riga ~142" in
   `page.tsx`, invece, era citato correttamente. Non ho corretto il brief (non è mio da toccare),
   lo segnalo perché non resti un riferimento sbagliato per chi lo rilegge.
3. **`docs/superpowers/plans/2026-08-03-p31-due-numeri-per-il-cliente.md` risultava già modificato
   nel working tree prima che io iniziassi questo compito** (`git status` all'avvio lo mostrava
   `M`, 2 righe). Non l'ho toccato e non l'ho incluso nel commit di questo addendum — resta
   modificato e non salvato nel working tree, non è un effetto collaterale del mio lavoro.

### Dubbi

Nessuno bloccante. Il tripwire copre esattamente i due anelli nominati dal brief di questo
addendum (le due select, page.tsx e route.ts), entrambi ora osservati rosso E verde; non copre — e
non doveva coprire — il resto della catena, già protetto da `tsc` o già fuori mandato per
dichiarazione esplicita.
