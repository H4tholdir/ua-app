# Task 11 — report

`TabImmagini.tsx` (`src/components/features/lavori/form/TabImmagini.tsx`) è riparato: la POST porta
`categoria` invece di `descrizione` (il 422 che bloccava OGNI caricamento da T3 sparisce), il foglio
`FoglioCategoria` è montato e chiede la categoria una volta per gruppo appena scattato/selezionato, la
foto locale sparisce quando arriva quella vera (niente più doppioni), un PDF si rende come tessera
documento e mai come `<img>`, e la scrittura della categoria di una foto già in banca dati parte da
un solo punto.

**Branch:** `ondata-b-schermate`. Commit: `5507ea18` (2 file: `TabImmagini.tsx` +
`tests/unit/lavori/TabImmagini.test.tsx`) + `782fe812` (fixup solo test, dopo l'auto-revisione di
§8 primo punto: la prova sull'ancora del focus provava il render sbagliato). `memory/
SESSION_ACTIVE.md` risultava già modificato da prima di questo task e non l'ho toccato né incluso
in nessuno dei due commit.

## 1. Che cosa ho cambiato, riga per riga (tabella del brief verificata prima di editare)

Ho riletto il file com'era su `HEAD` (`267197b0`) prima di toccarlo: **tutte le righe che il brief
cita tornano esatte** — verificate una per una con `git show HEAD:…| sed -n 'Np'` prima di scrivere
qualunque cosa (`:7-10` import v2.3, `:12-22` `TipoFoto`/`TIPI_FOTO`, `:117` `totalFotos` col
`.filter(uploadedId)`, `:131` `formData.append('descrizione', tipo)`, `:198` `tipoDefault` indovinato
dalla sorgente, `:224-244`+`:247-260` i due gestori, `:287`+`:407-555` il blocco che rende le locali,
`:634` `img.descrizione`). Diversamente dal brief di T10 (dove un file citato nel piano non era nella
tabella), qui il censimento del brief era corretto su ogni riga che nominava.

| Riga (prima) | Cosa faceva | Cosa diventa |
|---|---|---|
| `:7-9` | `motionTokens`/`useReducedMotion` da `@/design-system/motion` (v2.3), `hapticLight/Success/Error` da `@/lib/feedback/haptic`, `soundError` da `@/lib/feedback/sounds` | `molla, useReducedMotion` da `@/design-system/v3/motion`, `vibra` da `@/design-system/v3/haptic`, `suona` da `@/design-system/v3/sound`. `useReducedMotion` non cambia comportamento: `v3/motion.ts:5` lo ri-esporta dallo stesso modulo v2.3. |
| `:12-22` | copia locale `type TipoFoto` + `const TIPI_FOTO` | **eliminate**; si importa `CATEGORIE_FOTO, type CategoriaFoto` da `@/lib/domain/categorie-foto` |
| `:117` | `totalFotos = immagini.length + fotoLocali.filter(f => !!f.uploadedId).length` | `totalFotos = immagini.length + fotoLocali.length` — non serve più filtrare, perché `fotoLocali` non contiene MAI più una foto già salita (v. riga sotto) |
| `:131` | `formData.append('descrizione', tipo)` | `formData.append('categoria', categoria)` |
| `:145-159` (ramo di successo di `xhr.onload`) | teneva la foto locale con `{ progress: 100, uploadedId: json.immagine.id }` per sempre | **rimuove** la foto da `fotoLocali` (`prev.filter(f => f.id !== localId)`, con `URL.revokeObjectURL` sul suo `previewUrl` — non richiesto dal brief riga per riga, ma conseguenza diretta e onesta del rimuoverla: altrimenti il blob resta in memoria senza che nessuno lo liberi mai) |
| `:198` | `const tipoDefault: TipoFoto = fromCamera ? 'impronta' : 'altro'` (indovinato dalla sorgente) | **eliminato**; `handleFiles` ora crea le carte ottimistiche e apre `FoglioCategoria` (`quante`, `anteprime` filtrate sui soli PDF-esclusi); l'upload vero parte da `handleScegliCategoria`, chiamato da `onScegli` del foglio |
| `:224-244` + `:247-260` | `handleTipoChange` (locale, con PATCH se `uploadedId` presente) + `handleTipoChangeDb` (DB) | **una sola funzione**, `handleCategoriaChange(imgId, categoria)` — PATCH verso `/api/lavori/${lavoro_id}/immagini/${imgId}`. `handleTipoChange` non aveva più senso di esistere: dal momento in cui la foto locale sparisce al successo (riga sopra), nessuna foto in `fotoLocali` ha mai un `uploadedId`, quindi quel ramo era morto — l'ho tolto insieme al blocco di UI che lo chiamava (righe sotto), non lasciato come codice raggiungibile per finta |
| `:287` + `:407-555` | rendeva tutte le `fotoLocali`, comprese quelle con `uploadedId` (già salite) → doppione visivo con la card reale nella lista «immagini allegate» | la card locale sparisce insieme allo stato (riga sopra); ho anche **tolto il blocco «Tipo select»** (righe 507-550 originali) dal rendering locale: con la foto locale che sparisce al successo, quel blocco non si accendeva più (la condizione era `foto.uploadedId \|\| foto.progress === 100`, e nessuna delle due può più essere vera su una foto ancora in `fotoLocali`) — l'ho rimosso invece di lasciarlo morto, vedi §5 |
| `:634` | `TIPI_FOTO.find((tf) => tf.value === img.descrizione)?.value ?? 'altro'` | `CATEGORIE_FOTO.find((c) => c.valore === img.categoria)?.valore ?? 'altro'` — resta `defaultValue` (non controllato): l'ho lasciato così deliberatamente, vedi §5 |
| *(nuovo, non in tabella)* | — | `TesseraDocumento` (componente locale) + `isPdfPath()`: un PDF (in upload o già in banca dati, riconosciuto da `storage_path` che finisce per `.pdf`) rende un'icona 📄 + nome file invece di un `<img>`. Riusa solo variabili CSS già in uso nel file (`--sfc`, `--t2`, `--font-v3`) — nessun colore nuovo |
| *(nuovo, non in tabella)* | — | `<FoglioCategoria>` montato, con `ancoraFocus` su un `useRef` stabile (`ancoraCategoriaRef`) assegnato al bottone Camera o Galleria in base a `fromCamera`, MAI un letterale |

## 2. Le quattro prove che il piano chiede — e quante asserzioni si accendono

Tutte e quattro scritte **prima** del codice, in `tests/unit/lavori/TabImmagini.test.tsx` (nuovo
file, 16 prove):

1. **Dopo un caricamento riuscito la foto compare una volta sola, e il contatore dice uno.**
   Due prove distinte, perché — l'ho scoperto scrivendole, non supposto — `totalFotos` **non ha mai
   un testo a schermo**: il suo unico lettore è la soglia `isSmallViewport && totalFotos >= 6` (il
   tasto «Vista lista»). Il testo «N foto allegate» visibile usa `immagini.length` direttamente, ed
   era **già corretto anche sul file rotto** (non dipende da `fotoLocali`) — una prova su quel testo
   sarebbe stata verde anche sul difetto, cioè non avrebbe morso.
   - *«un solo rendering»*: carico 1 foto, simulo successo, conto `container.querySelectorAll('img')`
     → 1 (non 2: locale+DB).
   - *«il contatore»*: forzo `isSmallViewport=true` (il mock globale di `tests/setup.ts` restituisce
     sempre `false`), carico 3 foto in un colpo solo, simulo 3 successi. Sul file rotto:
     `totalFotos = 3 (immagini) + 3 (fotoLocali con uploadedId mai rimosso) = 6` → soglia raggiunta,
     tasto presente. Dopo il fix: `3 + 0 = 3` → tasto assente. Prova tagliente su entrambi i lati.
2. **La POST porta `categoria`, non `descrizione`.** `ultimaXHR().body.get('categoria')` = valore
   scelto; `.get('descrizione')` = `null`.
3. **Un solo punto da cui parte la scrittura della categoria.** Spia sul sorgente (stesso pattern di
   `tests/unit/categorie-foto-spia-migration.test.ts`): `readFileSync` sul file, conta le occorrenze
   di `/method:\s*['"]PATCH['"]/g`, pretende **1**. Più una prova comportamentale: cambiare la
   categoria di una foto in banca dati chiama `fetch(.../immagini/img-9, { method: 'PATCH', body:
   JSON.stringify({ categoria }) })`.
4. **Un PDF non si rende come `<img>` ma come tessera documento.** Provato **due volte** nella stessa
   prova: mentre è ancora in `fotoLocali` (in upload) e dopo il successo, quando viene da `immagini`
   (via `storage_path` che finisce per `.pdf`) — `container.querySelectorAll('img')` resta 0 in
   entrambi i momenti, e `getByRole('img', { name: /Documento: referto\.pdf/ })` (il ruolo che dà
   `TesseraDocumento`) la trova.

## 3. L'abbozzo inerte — R-P4, misurato con `git stash`, non simulato

Il file NON conteneva ancora import v3 rotti da mockare via modulo: l'abbozzo inerte è quindi il file
**com'era davvero** prima di questo task. L'ho ottenuto con `git stash push -- <file>` (tenendo il
test nuovo intatto, non tracciato), lanciato la suite, poi `git stash pop` per tornare al mio fix —
mai un file scritto a mano per l'occasione.

**Comando:** `npx vitest run tests/unit/lavori/TabImmagini.test.tsx` con il file all'HEAD `267197b0`.
**Esito misurato: 15 falliti su 16 (1 solo verde).**

L'unica verde è *«nessun file selezionato: no-op»* — prova di **assenza**: `handleFiles` faceva
comunque `if (!files || files.length === 0) return` anche sul file rotto, quindi è vera su entrambi i
lati per costruzione, non perché la riparazione l'abbia toccata.

Le altre 15 mordono per un motivo reale, non per «modulo non trovato»: senza `FoglioCategoria`
montato, nessuno dei bottoni del mio stub (`scegli-colore`, `esci-senza-scegliere`, …) esiste nel DOM
— `screen.getByText(...)` lancia, e ogni prova che dipende da quel passaggio cade per assenza di
comportamento vero, non per un import mancante. Le tre prove D70/D81 restano rosse anche isolando
solo l'asserzione finale: la spia conta 2 occorrenze di `method: 'PATCH'` (non 1, i due vecchi
gestori), il PATCH manuale porta ancora `descrizione`, il `<select>` legge `img.descrizione`.

## 4. Mutazione deliberata — Passo 4

Ho rimesso un secondo gestore quasi identico (`handleTipoChangeMutazioneTest`, stesso corpo di
`handleCategoriaChange`, mai committato — file di lavoro salvato a parte con `cp`, poi ripristinato
allo stesso modo) subito dopo `handleCategoriaChange`, e rilanciato la suite intera (le 16 prove
finali, non una versione precedente):

```
$ npx vitest run tests/unit/lavori/TabImmagini.test.tsx
✓ 15 prove verdi
× un solo punto di scrittura della categoria (D70) > spia sul sorgente: un SOLO `method: 'PATCH'` nel file
  AssertionError: expected [ 'method: \'PATCH\'', …(1) ] to have a length of 1 but got 2
 Tests  1 failed | 15 passed (16)
```

Ripristinato subito (`cp` dal backup preso prima della mutazione), confermato che il file torna
identico a quello committato (`git diff --stat` vuoto sul percorso), e la suite intera torna verde
(16 su 16). Esattamente la prova che doveva accendersi si accende, e SOLO quella — nessun effetto
collaterale sulle altre 15.

## 5. Le forme di ingresso (R-P4, enumerate prima delle asserzioni)

| Forma | Coperta? | Come |
|---|---|---|
| Nessun file selezionato | ✅ | `no-op, nessun foglio, nessuna richiesta` |
| Una foto sola | ✅ | `quante=1`, categoria scelta, upload con quel valore |
| Più file insieme (batch) | ✅ | il foglio chiede una volta (`quante=2`), la scelta vale per **entrambe** le richieste |
| Un PDF | ✅ | tessera documento, locale e da banca dati (§2.4) |
| Un tipo che il server rifiuta (415/422) | ✅ | `simulaErrore`: `foto.error` impostato, `role="alert"`, `vibra('error')` + `suona('errore')` |
| Una richiesta che fallisce in rete (`xhr.onerror`) | ✅ | stesso trattamento d'errore |
| L'utente esce dal foglio senza scegliere | ✅ | lo stub riproduce ESATTAMENTE la sequenza reale di `FoglioCategoria` (`onScegli('altro')` poi `onChiudi()`, D74): l'upload parte comunque, con `categoria: 'altro'` |
| Un tipo di file non ammesso dal browser (mai raggiunge `handleFiles`, filtrato da `accept`) | ⚠️ non coperta — perché è un vincolo dell'`input`, non della logica React; il rifiuto SERVER-side (415) è la stessa cosa vista dal lato che conta ed è coperta sopra |
| Due batch di selezione sovrapposti (apri Galleria mentre il foglio della Camera è ancora aperto) | ⚠️ non coperta — vedi §7 punto 2, limite noto e dichiarato, non un buco silenzioso |

## 6. FASE 7 — output vero

```
$ npx tsc --noEmit
(nessun output — 0 errori)

$ npx vitest run
 RUN  v4.1.6 …
Not implemented: navigation to another Document
 Test Files  368 passed | 3 skipped (371)
      Tests  4207 passed | 19 skipped (4226)
   Duration  72.58s

$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 5.1s
  Running TypeScript ...
  Finished TypeScript in 11.9s ...
  Generating static pages using 15 workers (81/81) in 227ms
  Finalizing page optimization ...
(tutte le route elencate, incluse /lavori/[id] con TabImmagini, nessun errore)
```

Riferimento dato ad albero pulito: 367 file \| 3 saltati (370), 4191 prove \| 19 saltate (4210).
Aritmetica: **+1 file, +16 prove** (il mio nuovo file di test, tutte verdi) → 368\|3\|371 e
4207\|19\|4226. Torna esatto. Zero rossi in file che non ho toccato.

`npx eslint` sui due file toccati (non richiesto esplicitamente, controllo extra): pulito — due
rilievi trovati e corretti durante il lavoro (`require()` non statico nella spia → `readFileSync`
importato in testa al file; un helper `inputCamera` scritto e mai usato → gli ho dato un test vero,
l'àncora del focus quando i file vengono dalla fotocamera, invece di cancellarlo).

## 7. Che cosa resta dovuto al collaudo di T13 (e cosa serve per eseguirlo)

**La prova più importante — caricare una foto vera e vederla salire — non l'ho fatta e non la
dichiaro fatta.** Serve: l'app in esecuzione (`npm run dev` o l'ambiente di anteprima), le
credenziali di un utente con un laboratorio attivo, un lavoro vero già creato in banca dati (o creato
al volo dal wizard), e la scheda di modifica del lavoro aperta sul tab «Immagini». Il collaudo (T13,
presumo, o comunque un turno con l'app accesa) dovrebbe:
1. Aprire un lavoro, andare sul tab Immagini, toccare «Galleria», scegliere una foto reale (o un PDF).
2. Verificare che il foglio `FoglioCategoria` si apra chiedendo la categoria, con l'anteprima vera.
3. Scegliere una categoria, verificare che l'upload proceda (barra di progresso, poi la foto compare
   nella lista «foto allegate» — non prima, non doppia).
4. Ricaricare la pagina e verificare che la foto sia ancora lì con la categoria giusta (conferma che
   la riga arrivata dalla banca dati porta davvero `categoria`, non solo che il client la mostri
   ottimisticamente).
5. Ripetere con un PDF: verificare che sulla scheda appaia la tessera documento, non un'icona rotta.
6. Provare a cambiare categoria da un `<select>` di una foto già caricata e ricaricare per confermare
   che la PATCH sia stata persistita.

## 8. Auto-revisione — dove il mio lavoro è più debole

- **Un difetto vero, trovato e corretto in revisione, nella prova sull'identità di `ancoraFocus`.**
  La prima versione forzava un re-render con `window.dispatchEvent(new Event('resize'))` e basta.
  jsdom parte da `innerWidth: 1024` e quell'evento non lo cambia: `setWindowW(window.innerWidth)`
  scriveva lo STESSO valore di prima, React faceva bailout (nessun re-render, per `Object.is` sullo
  stato invariato), e lo stub di `FoglioCategoria` non veniva mai richiamato una seconda volta — la
  prova sarebbe stata verde per il motivo SBAGLIATO (nessun secondo render da confrontare, non
  un'identità stabile). L'ho trovato aggiungendo una guardia esplicita
  (`expect(foglioCalls.length).toBeGreaterThan(lunghezzaPrima)`, che infatti è andata rossa alla
  prima stesura: `expected 2 to be greater than 2`) e corretto cambiando davvero `window.innerWidth`
  a 800 con `Object.defineProperty` prima di sparare il resize. Con la correzione la guardia passa
  (il conteggio cresce) e il confronto di identità che segue prova quello che deve provare. Lo
  segnalo per esteso perché è ESATTAMENTE il tipo di prova-verde-per-il-motivo-sbagliato che R-P4
  esiste per scovare, ed è successo nella prova che il mandato indica come quella più importante da
  chiudere in questo task.
- **Ho eliminato, non «fuso», i due gestori.** Il brief dice «due gestori quasi identici → una sola
  funzione di scrittura» in un modo che suggerisce un merge dei due corpi; io ho invece osservato che
  dal momento in cui la foto locale sparisce al successo, il ramo «locale con `uploadedId`» diventa
  **irraggiungibile per costruzione** (nessuna foto in `fotoLocali` ha mai quel campo), e ho tolto sia
  la funzione morta sia il blocco di UI (il `<select>` post-upload sulla card locale) che la
  chiamava, invece di lasciarli come codice morto. È una lettura più aggressiva di quella letterale
  del brief — la ritengo corretta perché codice irraggiungibile che sopravvive «per sicurezza» è
  esattamente il tipo di cosa che questo repo chiama debito, ma la segnalo esplicitamente per chi
  rilegge: se l'intenzione era mantenere un punto di correzione PRIMA che l'upload finisse, quella
  funzionalità non esiste più su questa foto (esisteva anche prima solo in teoria, dato che la
  condizione di rendering richiedeva comunque `uploadedId` o `progress===100`, mai vera durante
  l'upload).
- **`URL.revokeObjectURL` sulla foto locale al successo non è nella tabella del brief.** L'ho aggiunta
  perché è la conseguenza onesta e a costo zero di farla sparire da `fotoLocali`: senza, quel blob URL
  non verrebbe mai più liberato. Un rilievo di revisione potrebbe chiedere se è nel perimetro — la
  ritengo sì, perché è strettamente interna alla riga che il brief cambia, non una feature nuova.
- **Il `<select>` delle foto da banca dati resta `defaultValue` (non controllato), deliberatamente.**
  La PATCH (`handleCategoriaChange`) non aggiorna mai lo stato `immagini` del genitore — solo `onAdd`
  lo fa, e aggiunge, non modifica. Se avessi reso il `<select>` controllato con `value={img.categoria}`,
  la scelta dell'utente sarebbe scattata indietro al valore vecchio a ogni re-render del genitore
  (prima ancora che la PATCH torni, e anche se torna: nessuno aggiorna quell'array). Non l'ho provato
  con un test dedicato (avrei dovuto forzare un re-render del genitore dopo la `selectOptions` e
  verificare che il valore mostrato resti quello nuovo) — la correttezza qui poggia sulla lettura del
  codice (nessun `value=` scritto) più che su una prova che lo pretenda esplicitamente.
- **La spia «un solo `method: 'PATCH'`» è scoped al file, non al concetto.** Se un giorno un task
  aggiungesse un'altra PATCH per un campo diverso (es. `ordine`, già nell'allowlist server ma mai
  scritta dal client), la spia si accenderebbe per un motivo estraneo a D70. È lo stesso limite che
  ha `categorie-foto-spia-migration.test.ts` (spia su un pattern testuale, non su un concetto
  semantico) — un compromesso consapevole, non una svista.
- **Race non gestita, e dichiarata:** se il foglio categoria fosse aperto e l'utente riuscisse
  comunque a selezionare un secondo gruppo di file (Camera o Galleria) prima di chiudere il primo,
  `pendingUploadRef.current` verrebbe sovrascritto e il primo gruppo di foto locali resterebbe fermo
  allo 0% per sempre (mai caricato). Nella UI reale questo è verosimilmente impedito dal foglio stesso
  (trappola del focus + velo che blocca il tocco sotto, pattern condiviso con `Sheet`), ma non ho
  scritto un test che lo verifichi esplicitamente, né un guard esplicito lato `TabImmagini` — è un
  limite noto, non un buco silenzioso.

## 9. 🔴 Ritrovamenti fuori mandato

1. **Il brief non nomina mai, in nessuna riga della sua tabella, il montaggio di `FoglioCategoria`.**
   È solo implicito nella riga `:198` («la categoria la chiede FoglioCategoria»), eppure è di gran
   lunga il blocco di codice nuovo più grande del task (stato del gruppo in attesa, due ref stabili,
   due nuovi handler, il mount con le sue props). La riga di chiusura del brief («questo task cambia
   cinque righe di import») è fuorviante per lo stesso motivo: gli import toccati sono in realtà sei
   (le tre righe v2.3→v3 più `CATEGORIE_FOTO`/`CategoriaFoto` e `FoglioCategoria`, quest'ultimo mai
   citato), e la vera dimensione del task è il montaggio del foglio, non gli import.
2. **La quarta prova mandataria (il PDF come tessera documento) non ha nessuna riga nella tabella del
   brief.** È nel testo dell'istruzione del mandato (§4, «quattro prove che mordono»), ma il censimento
   riga-per-riga di `.superpowers/sdd/task-11-brief.md` non la nomina da nessuna parte — chi si fosse
   fidato solo della tabella (come il brief stesso invita a fare: «tutto già censito, R-P6») avrebbe
   perso questa prova e questo comportamento. L'ho implementata comunque perché il mandato che mi ha
   dispacciato la richiede esplicitamente, ma segnalo il disallineamento fra i due documenti.
3. **La riga `:117` del brief («`totalFotos` conta doppio») descrive un sintomo che non è mai visibile
   a schermo come numero.** L'unico consumatore di `totalFotos` è la soglia del tasto «Vista lista»
   (`isSmallViewport && totalFotos >= 6`), e siccome il mock globale di `window.matchMedia` in
   `tests/setup.ts` restituisce sempre `matches: false`, quella soglia non si accende MAI di default
   nei test di questo repo — una prova ingenua sul testo «N foto allegate» sarebbe rimasta verde sul
   file rotto (l'ho scoperto scrivendo la prova, non lo sapevo prima). Non è un errore del brief, ma
   un punto dove la sua descrizione del sintomo («conta doppio») rischiava di produrre una prova che
   non morde se presa alla lettera senza controllare CHI legge quel numero.

## Verifica finale

```
$ npx tsc --noEmit         → 0 errori
$ npx vitest run           → 368 passed | 3 skipped (371) file · 4207 passed | 19 skipped (4226) prove
$ npx next build           → ✓ Compiled successfully, tutte le route generate
```

**Commit:** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` — hash riportato nella risposta
finale.
