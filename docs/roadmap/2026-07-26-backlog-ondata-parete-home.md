# Backlog dell'ondata «Redesign parete/home» — esito del triage del 26/07/2026

> **QUESTO FILE È IL BACKLOG, NON UNA LISTA DI COSE DA FARE SUBITO.** Nasce come estrazione
> meccanica (sotto) ed è stato poi **triagiato voce per voce** alla FASE 8. Leggi prima l'esito.
>
> ⚠️ **Allineamento del 26/07/2026 — le due metà del file adesso concordano.** Fino a oggi la
> tabella qui sotto diceva «30 rimandate», ma l'elenco nel corpo del documento mostrava ancora
> **65 caselle vuote** e chiudeva con «Aperte: 65»: era l'estrazione meccanica, scritta *prima* del
> triage e mai riaperta dopo. Voci che il triage aveva dichiarato «GIÀ RISOLTO» o «NON È UN
> PROBLEMA» continuavano quindi a leggersi come lavoro da fare. Il verdetto è stato **propagato voce
> per voce**, senza rigiudicare niente. Oggi: **36 chiuse `[x]` · 30 da fare dopo `[ ]` · 3 da
> approfondire `[ ]` · 0 bloccanti.** Unica voce riscritta nel merito, la **52**: le erano state
> attribuite per errore parole di Francesco che riguardavano un altro stato della linguetta — v. la
> sua riga e `docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md` §1.

## Esito del triage — 69 voci, **0 bloccanti**

Nessuna delle 69 voci produce un risultato sbagliato che un utente subisce e da cui non si
riprende. Il triage non ne ha fabbricato uno per sembrare accurato, e ha dichiarato le due
chiamate più vicine al confine (entrambe non promosse): il desync di history con `DialogConferma`
sopra uno `Sheet` — **poi risolto comunque** dal fix della review finale, `storia-overlay.ts` — e
il possibile clip di gancetti e ombre sul percorso home, non dimostrabile senza browser e già
dentro il gate estetico L2 obbligatorio prima del merge.

| Verdetto | N. | Voci |
|---|---|---|
| **BLOCCANTE** | **0** | — |
| GIÀ RISOLTO | 17 | 3, 14, 17, 18, 23, 27, 33, 37, 46, 48, 49, 50, 54, 62, 64, 65, 68 |
| NON È UN PROBLEMA | 19 | 2, 4, 10, 12, 15, 20, 26, 29, 35, 36, 44, 45, 51, 55, 56, 58, 59, 60, 63 |
| **DA FARE DOPO** | **30** | 1, 5, 6, 7, 8, 9, 11, 16, 19, 21, 22, 24, 25, 28, 30, 31, 32, 34, 38, 39, 40, 41, 43, 47, 52, 57, 61, 66, 67, 69 |
| DA APPROFONDIRE (visive, al gate estetico) | 3 | 13, 42, 53 |

Tre grappoli si sono dissolti da soli durante l'ondata: il canale diagnostico dei suoni (rimosso
in `ac04f4b` → voci 48/49/50/64/65), i banchi di misura in `scripts/tmp/` (`de100a1` → voce 62),
e due costanti che il redesign ha eliminato del tutto (`SOGLIA_NOME_LUNGO`, `.is-nome-lungo` →
voci 14 e 46). Le voci 22 e 69 sono **la stessa cosa** (la prop `footer` morta di `StanzePager`),
segnalata due volte nel ledger.

### Le più rilevanti fra le 30 rimandate

- **25 + 34 — i suoni si possono spegnere per sempre, e si scaricano anche a suoni spenti.**
  `precarica()` inghiotte ogni errore per file e non ritenta: su una PWA aperta con rete ballerina
  i buffer restano vuoti per tutta la sessione e non suona più niente. In più `initSuoni()` non ha
  alcun gate su `suoniAttivi()`, quindi scarica oltre 300 KB di wav anche a chi i suoni li ha
  spenti. **Le due vanno fatte insieme**: il gate rende il ritentativo obbligatorio.
- **30 — il paziente «—» ottimistico.** Assegnando un lavoro dalla scheda cassetta, la targa
  mostra `—` invece del codice paziente fino al successivo caricamento vero, perché la rotta
  `lavori-liberi` non restituisce `paziente`. Il commento nel codice sostiene che è «identico a
  quanto la targa farebbe comunque»: non lo è. Fix minimo: aggiungere `paziente` a `LavoroLibero`.
- **39 + 40 — il numero nel chip G9 viene tagliato a metà glifo**, non lasciato con l'ellissi:
  manca sia `overflow` sia `text-overflow` mentre il genitore clippa. Da chiudere in coppia.
- **31 — il riordino sulla home sembra annullarsi** dopo un'altra azione di overlay (rinomina,
  colore, frecce): cambia l'identità di `pareteVista` e l'ordine ottimistico si azzera. Il dato sul
  server è giusto; è la vista che mente fino al prossimo caricamento di `/cassette`.
- **11 — un verbale ratificato prescrive `align-self:start` dove la proprietà giusta è
  `align-items:start`**, e cita `track=176` quando oggi è 220. Chi reimplementasse da lì
  scriverebbe un no-op.
- **61 — il 500-vs-600 della fascia**: la resa è chiusa e ratificata, ma il sorgente dichiara
  ancora «⚠️ PUNTO APERTO» e nessun verbale attesta la chiusura. Da riscrivere, o la prossima
  review la riapre.

## Aggiunte al backlog dalla review finale (FASE 8) e dalla review delta

Non fanno parte delle 69: sono emerse dalle cinque review di area e dalla review dei commit di fix.

- **`consegneOggiTotali` è codice morto** (`pile-home-shared.ts`): calcolato a ogni caricamento
  della home e serializzato al client per nessuno — il suo unico lettore, il vecchio segnale
  «Tutto a posto», è morto in quest'ondata. ⚠️ `prossimaOra`, sulla stessa riga, **è ancora viva**.
- **`targheInCollisione` è esportata per un chiamante che non esiste** (`parco-shared.ts`): il
  commento la giustifica con «la usa la ricerca», e la ricerca non la chiama. O si aggancia o si
  cancella con il suo test.
- **La sotto-vista «Metti un lavoro» non è un passo di storia**: il back del telefono chiude tutta
  la scheda invece di tornare all'elenco delle azioni, e alla chiusura si vede lo scambio a vuoto.
- **`StanzePager` ha due prop morte** (`footer`, `onStanzaChange`), già annotate come tali.
- **`Cassetta.tsx` è a 813 righe e contiene due macchine indipendenti**: i gesti e il motore di
  adattamento del testo. I due effetti di misura (studio e paziente) sono quasi identici e la
  correzione H2c ha dovuto essere applicata a mano su entrambi.
- **La maglia scura è sfasata di mezzo periodo** rispetto a quella chiara: il filo più a sinistra
  finisce sotto il filo di bordo e si legge come una riga più spessa su quel solo lato.
- ~~**`--track` riserva un passo di maglia in più** del necessario: la motivazione scritta è
  precedente al ridimensionamento del tile.~~ **CHIUSA il 26/07/2026** — Francesco ha deciso
  «avvicino le righe», v. R1 nella sezione delle raccomandazioni del gate qui sotto.
  ⚠️ **Due numeri di questa riga erano sbagliati** e vanno corretti dove sono stati ripetuti:
  le righe NON erano «da 220-250px». Sul telefono sono **200px**, perché lì il passo della maglia
  sta al suo pavimento di **40px** (5 × 40); i 220 nascono da un `--passo-maglia: 44px` che è solo
  il valore della regola base, mai quello risolto dentro la shell. E i valori non erano due ma
  **tre**: la stanza parete della home a 768 ne aveva un terzo mai documentato in nessun
  collaudo — **track 224,4px** a passo 44,88 — perché il suo container è largo 440px contro i 680
  di `/cassette` alla stessa larghezza di finestra. Tutti e tre misurati sulla build vera il
  26/07/2026.
- **Residuo A3 dichiarato**: esiste un fotogramma transitorio (studio già a 2 righe, paziente non
  ancora ricapato a 1) con una pila da ~77,5px, che richiederebbe una fascia da 88px. Preesistente,
  non misurato, fuori dal perimetro della decisione del 26/07.
- **`storia-overlay.ts` dipende da un'invariante che non dichiara**: la pila è ordinata per
  registrazione degli effetti, non per z-order. Oggi nessun chiamante la viola (verificato su tutti
  e sette), ma un compositore che aprisse due overlay nello stesso commit, o ne chiudesse uno
  aprendone un altro, farebbe tornare il difetto originale. Va scritta nell'intestazione del modulo,
  con un'asserzione di sviluppo che scatti se la pila cresce di più di uno per commit.
- **Due file di test citano ancora 132px come altezza della cassetta** (`use-drag-riordino.test.ts`,
  `riordino-core.test.ts`): oggi sono 138. Inerte per il comportamento, fuorviante per chi legge.
- **`ds-v3.css` è fuori dalla guardia nuova sui commenti sbilanciati**, pur essendo la superficie
  CSS più grande del progetto e quella riscritta di più in quest'ondata.
- **Le due etichette «Salva il nome/il colore» non rimandano al loro verbale**: l'eccezione è
  registrata nel dizionario, ma chi le «corregge» sta editando `CassettaSheet.tsx`, che tace.
  Stesso trattamento meriterebbe il numero di lavoro rimesso nel nome accessibile della cassetta.

## Le sei raccomandazioni del gate estetico L2 (26/07/2026)

Il gate estetico L2 dell'ondata (FASE 9b — verdetto PASS, nessun difetto bloccante) ha lasciato
sei raccomandazioni. Vivevano solo dentro il suo rapporto, che è un file di lavoro e non entra nel
repo: qui restano. **Due sono CHIUSE**, decise da Francesco il 26/07/2026 e implementate nello
stesso giro di commit di questa riga. Le altre quattro sono da fare dopo.

### CHIUSE — decise da Francesco il 26/07/2026, fatte

- **R1 — «Avvicino le righe.» CHIUSA.** Lo spazio riservato a ogni fila del muro era 5 maglie
  ovunque. Quel quinto passo serviva a un tile che cresceva col contenuto; l'H2 di quest'ondata ha
  fissato la cassetta a 138px, quindi non serviva più, e su un muro pieno a 1280 spezzava la
  parete in strisce staccate. Ora sono **4 maglie dal tablet in su, 5 sul telefono** (a 390 il
  passo è al pavimento di 40px: con 4 i gancetti della fila sotto sfiorerebbero la cassetta sopra).
  La soglia è una media query sui 768px del viewport e non una container query, perché le due
  pareti — `/cassette` e la stanza parete della home — hanno container di larghezza diversa alla
  stessa finestra e su una soglia di container cambierebbero passo in due momenti diversi.
  `src/app/ds-v3.css`, guardia `tests/unit/ds-v3/parete-gancio-cornice.test.ts`.
- **R2 — «Il numero del lavoro non si taglia mai.» CHIUSA.** Numero e frase stavano nello stesso
  blocco con una sola ellissi, quindi a 390 spariva il numero: si leggeva `n.2026/000…`, che non
  distingue il lavoro 0001 dal 0009. Ora il numero ha un blocco suo e a stringersi è solo la frase;
  il conteggio «e altre N» resta intoccabile com'era. `src/components/ds/StrisciaStato.tsx`,
  guardia `tests/unit/ds-v3/componenti/pila-striscia.test.tsx`.

### Da fare dopo

- **R3 — i 10px con cui la linguetta sborda sulla colonna delle pile non li presidia nessuno.**
  A 390, in fase piena, la card della linguetta entra di 10px oltre il bordo destro della colonna
  delle pile. Non è un difetto estetico: a vedersi legge come una linguetta attaccata al bordo
  dello schermo, che è esattamente quello che è, e le due bande verticali oggi non si toccano.
  È un difetto di **durabilità**: colonna e linguetta sono ancorate a due riferimenti diversi (la
  colonna al centro con `max-width: 480px`, la linguetta a `right: 0`) e nessun test guarda quei
  10px. **Rimandarla non costa niente oggi.** Diventa urgente il giorno in cui una pila cresce in
  altezza o il piede si abbassa: le due bande si incontrerebbero e non se ne accorgerebbe nessuno.
  `src/components/features/home/LinguettaCassette.tsx` / `.ua-home` — ⚠️ il componente **non** sta
  fra quelli del design system in `src/components/ds/`, dove il nome nudo porterebbe a cercarlo.
  ⚠️ **Possibile doppione della voce 53** («la card piena da 34px si estende 8px più a sinistra
  rispetto alle Pile»): stesso viewport, stessi due elementi, stesso fenomeno, misurato 10px qui e
  8px là. **Non verificato se siano la stessa cosa.** Guardarle insieme prima di lavorarci.
- **R4 — a 390 l'etichetta «Nuova cassetta» arriva sopra i trattini del suo bordo.** Il testo è
  largo 90,81px dentro un tile da 95,33px con un bordo tratteggiato da 2,5px. Non è tagliato
  (sforo zero, misurato), è stretto: il testo tocca il tratteggio invece di respirarci dentro. A
  768 e 1280 il tile è largo 140-150px e il problema non esiste. **Rimandarla costa un tile un po'
  sciatto sul telefono**, l'unico elemento della parete che si vede sempre. Diventa urgente se
  quella parola cambia o si allunga (o alla prima lingua diversa dall'italiano).
  `ds-v3.css`, `.ds-tray-nuova`.
- **R5 — in tema scuro i gancetti si appiattiscono in una macchia.** Non è un problema di stacco
  sul muro: è il gancetto che perde il proprio chiaroscuro interno, cioè quello che gli dà forma
  di pezzo di metallo. Lo scarto fra la sua luce e la sua ombra passa da 3,21:1 in chiaro a
  **1,68:1 in scuro**. Il tema scuro *è* stato considerato (l'override esiste), ma è stato portato
  troppo giù. **Rimandarla costa l'idea su cui poggia tutto il redesign**: in scuro il gesto
  «appeso al muro» non si legge. Diventa urgente al primo utente che tiene il telefono in tema
  scuro tutto il giorno — cioè presto. `ds-v3.css` (`--gan-metal-*`).
- **R6 — apostrofo dritto accanto a virgolette curve.** `un'altra`, `c'è` con l'apostrofo dritto
  della tastiera, e nella stessa schermata `“…”` con le virgolette tipografiche. È
  un'incoerenza tipografica, non un errore d'italiano. **Rimandarla non costa quasi niente.**
  Si fa insieme al prossimo giro sulle parole, mai da sola. Trasversale.

### Aggiunta di questo giro — non era nel gate, l'ha trovata la decisione 1

- **Nel rail del desktop la striscia non ha spazio per dire DI CHE COSA parla.** A 1280 la
  striscia non vive più nella colonna della home ma nel rail di `NavDesk`, che le lascia **178px**
  di larghezza utile. Icona, conteggio e CTA da soli ne chiedono 208: il soggetto resta a zero e
  la CTA esce di 30px oltre il bordo interno della card. A schermo si legge «**! e un'altra
  Conferma ›**» — un allarme senza soggetto, cioè esattamente la classe di difetto per cui il
  conteggio era stato inventato. **È PREESISTENTE alla decisione del 26/07** e non è peggiorata:
  misurata identica prima e dopo (stesso sforo di 30,03px, stesso soggetto a zero) — la decisione
  «il numero non si taglia mai» semplicemente **là non è applicabile**, perché non c'è lo spazio
  fisico per applicarla. **Rimandarla costa una striscia muta su desktop** ogni volta che gli
  allarmi accesi sono due o più. Diventa urgente appena qualcuno usa UÀ da computer sul serio.
  Non si risolve con il layout della striscia: o il rail diventa più largo, o lì la striscia va su
  due righe, o su desktop il conteggio si racconta in un altro modo — è una decisione di forma,
  da portare a Francesco. `src/components/ds/NavDesk.tsx`, cattura
  `docs/design/screenshots/2026-07-26-redesign-parete-home/gate-l2/1280-{light,dark}-striscia-rail-navdesk-DOPO.png`.

## Una voce che è una DECISIONE di Francesco, non una pulizia

**`PAROLE_CATEGORIA_STUDIO` è asimmetrica**: contiene `clinica`/`cliniche` ma non
`clinico`/`clinici`, e `policlinico`/`policlinici` ma non `policlinica`. Effetto: `ISTITUTO CLINICO
SAN PAOLO` si accorcia in `CLINICO SAN PAOLO`. La direzione dell'errore è sicura (accorcia di meno,
non sbaglia mai il nome), e il file dichiara la lista deliberatamente corta — ma queste quattro
parole sono le stesse già ammesse in un altro genere, non un'esclusione ragionata.
⚠️ **È la stessa classe di decisione su cui Francesco si è già pronunciato** il 26/07 («i due nomi
non li aggiungere», per `stomatologico` e `dentista`). **Non aggiungere niente senza chiederglielo.**

---

# Checklist Minor (per review finale) — Task 17 / FASE 8

Generato il 26/07/2026. Estrazione meccanica di tutte le voci «Minor (per review finale)» e
varianti equivalenti dal ledger `.superpowers/sdd/progress.md` (ondata «Redesign parete/home»).
Ogni riga del ledger che segnalava più difetti separati da `;`, `·` o numerazione `(1)(2)(3)` è
stata spezzata in una riga di checklist per ciascun difetto distinto, con la fonte esatta.
Questo file è l'input per la FASE 8 (review finale di tutto il branch) del Task 17: nessuna voce
qui sotto è stata valutata nel merito, chiusa o corretta in questa estrazione — solo restituita
in forma di lista azionabile. La numerazione è unica e progressiva su tutto il documento (1–69),
nell'ordine in cui le voci compaiono nel ledger, così da poter incrociare ogni riga con la sua
fonte anche quando le sezioni la separano.

---

## L'elenco delle 69 voci, ciascuna col verdetto del triage

> ⚠️ **Questa sezione si chiamava «Aperte» e mostrava 65 caselle tutte vuote.** Era l'estrazione
> meccanica dal ledger, scritta **prima** del triage e mai più toccata dopo: quindi voci che il
> triage aveva dichiarato «GIÀ RISOLTO» o «NON È UN PROBLEMA» continuavano a leggersi come aperte,
> e il file si contraddiceva con la propria tabella d'apertura. Il 26/07/2026 il verdetto è stato
> **propagato voce per voce**, senza rigiudicare niente: il triage resta quello, qui è solo scritto
> accanto a ogni riga.
>
> **Come leggere le caselle, da qui in poi:**
> - `[x]` = **chiusa dal triage** — «GIÀ RISOLTO» oppure «NON È UN PROBLEMA». Non c'è lavoro.
> - `[ ]` = **ancora aperta** — «DA FARE DOPO» (le 30 rimandate) oppure «DA APPROFONDIRE» (le 3
>   visive).
>
> Il verdetto sta in fondo a ogni voce, in grassetto. Il testo originale del rilievo non è stato
> toccato.

- [ ] **1.** Il branch di `derivaAlias` in cui `codice_paziente` è null non è coperto da test.
  · fonte: riga 10 del ledger
  · file/simbolo: `src/lib/cassette/parco-shared.ts` — `derivaAlias` (simbolo risolto da codice, non nominato nel ledger)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **2.** Il caso di collisione a 3 (tre cassette con la stessa coppia dentista+paziente sulla stessa parete) non è esercitato dai test di rilevamento collisione targhe.
  · fonte: riga 10 del ledger
  · file/simbolo: `src/lib/cassette/parco-shared.ts` — `targheInCollisione` (simbolo risolto da codice, non nominato nel ledger)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **3.** Il collegamento (wiring) di `scrollerRef` dentro l'hook non è testato end-to-end; il ledger nota che il primo esercizio reale sarebbe avvenuto al Task 12.
  · fonte: riga 12 del ledger
  · file/simbolo: `scrollerRef` (hook drag/scroll — area `useDragRiordino.ts` / `StanzePager.tsx`)
  · stato dichiarato: deferita (routing esplicito a Task 12, già completato nel frattempo — da riverificare se la copertura è arrivata con quel task)
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **4.** C'è una doppia lettura di `innerHeight` dentro una funzione `max()`.
  · fonte: riga 12 del ledger
  · file/simbolo: funzione `max()` — file non indicato nella riga del ledger
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **5.** Il commento nel file di test di `sound.ts` dice ancora «5 suoni», ma non è più vero (ora sono 7).
  · fonte: riga 15 del ledger
  · file/simbolo: `sound.ts` (test)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **6.** Il collegamento (wiring) dei suoni dentro l'hook non ha un test comportamentale dedicato.
  · fonte: riga 15 del ledger
  · file/simbolo: hook suoni — nome esatto non indicato nella riga del ledger
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **7.** Lo smontaggio (unmount) del componente con timer pendenti non è testato.
  · fonte: riga 23 del ledger
  · file/simbolo: non indicato (area Task 4)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **8.** La funzione `segnalaDragBloccato` non è memoizzata.
  · fonte: riga 23 del ledger
  · file/simbolo: `segnalaDragBloccato`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **9.** C'è un cast `as unknown` sul risultato di una query (il ledger nota che è un pattern già esistente altrove, non introdotto qui).
  · fonte: riga 25 del ledger
  · file/simbolo: non indicato (area Task 5)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **10.** La classe `ds-sheet-hint` è usata su paragrafi statici, un caso di riuso del nome oltre il significato originale (overload naming).
  · fonte: riga 25 del ledger
  · file/simbolo: `ds-sheet-hint`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **11.** C'è un disallineamento tra `align-self` e `align-items`: la prosa del verbale non è allineata al codice del mockup (correzione di una riga).
  · fonte: riga 40 del ledger
  · file/simbolo: non indicato (verbale mockup Task 8)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **12.** Il test `css-sync.test.ts`, usando `match()` non globale, ispeziona solo il primo blocco `[data-ds]` invece di tutti quelli presenti.
  · fonte: riga 42 del ledger
  · file/simbolo: `css-sync.test.ts`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **13.** Il gancetto della cassetta protrude nella variante "home compatta"; il ledger lo instrada esplicitamente alla verifica del QA Task 15.
  · fonte: riga 42 del ledger
  · file/simbolo: home compatta (gancetto cassetta, `ds-v3.css`)
  · stato dichiarato: deferita (→ QA T15)
  · **VERDETTO DEL TRIAGE (26/07/2026): DA APPROFONDIRE, perché è visiva** — instradata al gate estetico L2. Il gate è poi passato (PASS, 0 ❌), ma **non risulta che abbia chiuso le tre voci una per una**: nessun documento lo attesta, quindi qui restano **da guardare** e non dichiarate chiuse. Se il rapporto del gate dicesse il contrario, vince quello.

- [x] **14.** `SOGLIA_NOME_LUNGO=20` è un valore interpolato (stimato), da ritarare al Task 15.
  · fonte: riga 44 del ledger (etichetta «Minor (per review finale/QA)»)
  · file/simbolo: `SOGLIA_NOME_LUNGO`
  · stato dichiarato: deferita (ritarare a T15)
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **15.** Nel catalogo `ds-v3-catalogo` ci sono 7 valori demo letterali (literal) senza paziente associato: mostrano `'—'`. Segnalato come «follow-up rapido».
  · fonte: riga 44 del ledger (etichetta «Minor (per review finale/QA)»)
  · file/simbolo: `ds-v3-catalogo` (7 literal demo)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **16.** Il commento in `ds-v3.css` alle righe 626-628 è superato (l'ondata a cui si riferiva è ormai arrivata).
  · fonte: riga 47 del ledger
  · file/simbolo: `ds-v3.css:626-628`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

  · **17.** → vedi «Già chiuse o adjudicate»: la classe CSS `.ds-tile-tutte` era orfana, chiusa.

- [x] **18.** Il rapporto tra `touch-action` e lo swipe del pager va verificato; il ledger lo instrada esplicitamente al QA su device.
  · fonte: riga 47 del ledger
  · file/simbolo: `touch-action` / `StanzePager`
  · stato dichiarato: deferita (→ QA device)
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [ ] **19.** Il commento a `StanzePager` riga 13 è superato (parla ancora di 28px).
  · fonte: riga 49 del ledger
  · file/simbolo: `StanzePager.tsx:13`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **20.** L'API di `vaiA` espone un parametro booleano usato come via di fuga (escape-hatch), da rivedere.
  · fonte: riga 49 del ledger
  · file/simbolo: `vaiA`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **21.** Lo z-index 40 ha una collisione latente con `ds-grana`.
  · fonte: riga 49 del ledger
  · file/simbolo: z-index 40 / `ds-grana`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **22.** La prop `footer` di `StanzePager` è morta (non più usata). Stesso item della voce 69 (riga 261) — segnalato due volte nel ledger, in due momenti diversi.
  · fonte: riga 54 del ledger
  · file/simbolo: `StanzePager` — prop `footer`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **23.** Il commento che descrive il limite della guardia testuale è impreciso, da rivedere.
  · fonte: riga 54 del ledger
  · file/simbolo: non indicato
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [ ] **24.** In `stanze-pager.test.tsx` (~riga 707) c'è un'asserzione vacua (`activeElement !== null`, sempre vera): andrebbe semplificata.
  · fonte: riga 74 del ledger
  · file/simbolo: `stanze-pager.test.tsx:~707`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **25.** Se `creaContesto` fallisce al mount ma poi riesce dentro `sblocca()`, il precaricamento non viene ritentato: i buffer restano vuoti per sempre. Rimedio proposto nel ledger: aggiungere `if(!buffers.size) precarica()` dentro `sblocca()`.
  · fonte: riga 81 del ledger (item numerato (1))
  · file/simbolo: `creaContesto` / `sblocca()` / `precarica()`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **26.** L'attivazione da tastiera (Enter/Space) resta muta al primo colpo: l'evento keydown non è registrato tra i listener di sblocco.
  · fonte: riga 81 del ledger (item numerato (2))
  · file/simbolo: listener di unlock suoni (tastiera)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **27.** La corsa (race) tra `resume` e `onClick` non è esercitabile in un test unitario; il ledger nota che il collaudo su device non è ridondante rispetto a questo limite.
  · fonte: riga 81 del ledger (item numerato (3))
  · file/simbolo: `resume` vs `onClick` (area `sound.ts`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [ ] **28.** C'è un import circolare tra `CassettaSheet` e `PareteClient` per la costante `DEBOUNCE_FILTRO_MS` (oggi sicuro a runtime secondo il ledger, ma da estrarre in un modulo condiviso).
  · fonte: riga 91 del ledger (item numerato (1))
  · file/simbolo: `CassettaSheet` ↔ `PareteClient` — `DEBOUNCE_FILTRO_MS`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **29.** L'area cliccabile (`::before`) del grabber sborda di circa 12px sopra il bordo dello sheet: quella porzione cade sullo scrim e può causare la chiusura (dismiss) involontaria. Il ledger chiede verifica su device, impatto valutato basso.
  · fonte: riga 91 del ledger (item numerato (2))
  · file/simbolo: grabber `::before` (componente Sheet)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **30.** Quando si assegna un lavoro tramite l'overlay, i dati mostrati sono parziali (miniatura generica, paziente `'—'` senza alias); causa indicata: il contratto della route lavori-liberi. Il ledger propone di valutare un'estensione della route.
  · fonte: riga 102 del ledger (item numerato (1))
  · file/simbolo: route `/api/cassette/lavori-liberi`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **31.** `ordineDrag` resta persistente in modalità embedded dopo un drop riuscito. Il ledger lo segnala come difetto pre-esistente, non introdotto da questa ondata.
  · fonte: riga 102 del ledger (item numerato (2))
  · file/simbolo: `ordineDrag`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **32.** Non c'è un test sulla sequenza di due azioni consecutive in modalità embedded (il merge degli overrides non è provato).
  · fonte: riga 102 del ledger (item numerato (3))
  · file/simbolo: embedded — merge overrides
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

  · **33.** → vedi «Già chiuse o adjudicate»: il commento in `stanze-pager.test` riga 138 era segnalato come superato, dichiarato fixato.

- [ ] **34.** `initSuoni` parte anche quando la preferenza suoni è OFF (crea comunque contesto audio e fa 7 fetch); il ledger nota che è un pattern identico a quello preesistente in `PareteClient` e propone di valutare un gate su `suoniAttivi`.
  · fonte: riga 111 del ledger (item numerato (1))
  · file/simbolo: `initSuoni`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **35.** Manca una guardia a livello di `HomeV3` contro il doppio mount di `initSuoni` (oggi coperta solo da `initFatto` + test in `sound.test`).
  · fonte: riga 111 del ledger (item numerato (2))
  · file/simbolo: `HomeV3` — `initSuoni`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **36.** Il test `parete-gancio-cornice` ri-deriva i valori direttamente in JavaScript invece di verificarli in modo indipendente: è una tautologia sul modulo (le vere guardie restano le 3 regex testuali).
  · fonte: riga 122 del ledger
  · file/simbolo: test `parete-gancio-cornice`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

  · **37.** → vedi «Già chiuse o adjudicate»: un rumor di 3 fallimenti transitori fuori dal diff, verificato estraneo.

- [ ] **38.** Desincronizzazione tra `DialogConferma` e lo `Sheet` sottostante. Il ledger la definisce «limitazione pinnata» (nota e accettata): servirebbe una entry di history propria per `DialogConferma` — stessa radice del limite «blind-ref».
  · fonte: riga 131 del ledger
  · file/simbolo: `DialogConferma` / `Sheet`
  · stato dichiarato: aperta (limitazione accettata come nota permanente, non una chiusura formale)
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **39.** Il chip G9 non ha l'ellissi per i numeri molto lunghi; il ledger annota che va verificato su device.
  · fonte: riga 131 del ledger
  · file/simbolo: chip G9
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **40.** L'abbreviazione del numero e il conteggio «N lavori» sono stati esplicitamente rimandati alla verifica su device.
  · fonte: riga 131 del ledger
  · file/simbolo: conteggio «N lavori» (chip G9)
  · stato dichiarato: deferita (esplicitamente «rimandati (device)»)
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **41.** I fili della cornice sono più corti di 8-12px rispetto al clip reale del mockup (stop piatto a 18 invece di ~9,75 geometrico); dichiarato in commento/test, il ledger suggerisce di eventualmente raffinare a vista con Francesco al collaudo.
  · fonte: riga 133 del ledger (item numerato (1))
  · file/simbolo: cornice V1 (`ds-v3.css`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **42.** C'è un "bleed" laterale delle ombre elevate/gancetti agli angoli. Il ledger lo definisce comportamento pre-esistente a G9, non introdotto da questa ondata.
  · fonte: riga 133 del ledger (item numerato (2))
  · file/simbolo: gancetti/ombre agli angoli
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA APPROFONDIRE, perché è visiva** — instradata al gate estetico L2. Il gate è poi passato (PASS, 0 ❌), ma **non risulta che abbia chiuso le tre voci una per una**: nessun documento lo attesta, quindi qui restano **da guardare** e non dichiarate chiuse. Se il rapporto del gate dicesse il contrario, vince quello.

- [ ] **43.** Il marker `uaSheet` (usato per il pattern back-chiude-sheet) è condiviso e non per-istanza: gli sheet annidati risultano indistinguibili. Il ledger nota che è la stessa famiglia del limite già noto di `DialogConferma`, non una regressione.
  · fonte: riga 137 del ledger (etichetta «Minor aggiuntivo (per review finale)»)
  · file/simbolo: `uaSheet` (history state marker; descrizione «pattern back-chiude-sheet» risolta da codice/ledger righe 126-138, non nominata per esteso alla riga 137)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **44.** `RawLavoro.note_interne` è opzionale mentre il campo gemello dello stesso tipo è required: asimmetria documentata, il ledger propone un TODO se si normalizza il tipo.
  · fonte: riga 147 del ledger
  · file/simbolo: `RawLavoro.note_interne`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **45.** Manca un caso di test combinatorio per la parete mista con colore hex + note (i due casi sono oggi coperti solo isolatamente).
  · fonte: riga 147 del ledger
  · file/simbolo: filtro cassette (hex + `note_interne`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **46.** La classe `is-nome-lungo` scatta anche quando il campo ci starebbe con 10px di margine residuo (soglia del tile a 142 giudicata un filo conservativa, accettata dal brief).
  · fonte: riga 154 del ledger
  · file/simbolo: `is-nome-lungo`
  · stato dichiarato: aperta (tradeoff accettato dal brief, non una chiusura formale)
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [ ] **47.** La guardia sul valore della traccia (`track`) è solo aritmetica: rete di regressione dichiarata debole sulla clearance reale.
  · fonte: riga 154 del ledger
  · file/simbolo: guardia `track` (clearance)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **48.** Lo «scroll interno» è reso con un taglio di coda `slice(-14)`: deviazione dichiarata, motivata da `pointer-events:none` — il reviewer la giudica migliore del valore letterale.
  · fonte: riga 168 del ledger
  · file/simbolo: `slice(-14)` — overlay diagnostico suoni
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **49.** Il fallback `t0 ?? 0` di `formattaDelta` stampa un valore assoluto nei primissimi millisecondi prima dell'init: cosmetico, si autocorregge da solo.
  · fonte: riga 168 del ledger
  · file/simbolo: `formattaDelta`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **50.** L'esito diagnostico «scartato: soppiantato» risulta falso in un caso limite (interrupted entro 150ms). Riguarda solo il canale diagnostico temporaneo, non il motore audio.
  · fonte: riga 177 del ledger
  · file/simbolo: canale diagnostico suoni (`?diag=suoni`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **51.** ⚠️ Vincolo dal piano (plan-mandated): la garanzia dei 150ms usa lo stato del contesto audio come proxy dell'udibilità reale (brief §4a) — da tenere presente in review finale.
  · fonte: riga 177 del ledger
  · file/simbolo: garanzia 150ms (`sound.ts`)
  · stato dichiarato: aperta (vincolo di piano da confermare, non un difetto di per sé)
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **52.** La colonna rossa **del filo** è a tutta altezza del bottone (96px) contro i ~78px
  dello schema del mockup. I valori sono comunque quelli ratificati verbatim; l'estensione va
  confermata a vista. **Riguarda lo stato `is-filo`**, cioè la scheggia rossa che appare dopo 3
  passaggi riusciti alla parete — non la linguetta intera.
  ⚠️ **CORREZIONE (26/07/2026).** Questa voce era stata riscritta come «**NON PIÙ RIMANDATA —
  Francesco l'ha vista sulla PWA installata e non gli va bene**», citando le sue parole «la
  linguetta non dà il giusto spazio al suo contenuto, la parte inferiore si chiude troppo sotto alla
  scritta cassette». **Era un'attribuzione sbagliata:** Francesco parla della linguetta **intera,
  con la scritta sopra** — lo stato `piena` — mentre questa voce parla del **filo**. Il suo rilievo
  è un lavoro **diverso e nuovo** (lo schema `.lng.big` del mockup dà `padding:18px 0`, il codice
  spedisce `padding: 0` in `ds-v3.css:1613`), descritto in
  `docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md` §1.
  **Quindi la 52 torna quello che era**: rimandata, «cosmetica, da confermare a vista», e la
  conferma a vista **non è ancora avvenuta** — va guardata da Francesco *nello stato filo*.
  🛑 Chi la riprenderà: **non abbassare `min-height` da 96 a 78** credendo di risolvere anche il
  rilievo di Francesco. Assottiglierebbe il filo e lascerebbe intatta la deviazione dello stato
  pieno, che non dipende da `min-height`.
  · fonte: riga 191 del ledger (etichetta «Minor (per review finale + collaudo #4)»)
  · file/simbolo: linguetta/colonna rossa, stato `is-filo` (area F2/T2) —
    `src/components/features/home/LinguettaCassette.tsx`, `src/app/ds-v3.css`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **53.** La card piena da 34px si estende 8px più a sinistra rispetto alle Pile: da controllare l'eventuale collisione a 390/768/1280px.
  · fonte: riga 191 del ledger (etichetta «Minor (per review finale + collaudo #4)»)
  · file/simbolo: card piena / Pile (area F2/T2)
  · stato dichiarato: aperta
  · ⚠️ **POSSIBILE DOPPIONE DELLA RACCOMANDAZIONE R3** («i 10px con cui la linguetta sborda sulla
    colonna delle pile», sezione «Da fare dopo» del gate estetico, più su in questo file). Sono lo
    stesso viewport (390), gli stessi due elementi (card piena della linguetta / colonna delle pile)
    e lo stesso fenomeno — uno sbordo laterale — misurato però **8px** qui e **10px** là. **Non è
    stato verificato se siano la stessa cosa**: potrebbero essere due misure dello stesso difetto
    prese in momenti diversi, oppure due sbordi distinti. Chi ne prende una in mano **guardi prima
    l'altra**, o si rischia di fare due volte lo stesso lavoro.
  · **VERDETTO DEL TRIAGE (26/07/2026): DA APPROFONDIRE, perché è visiva** — instradata al gate estetico L2. Il gate è poi passato (PASS, 0 ❌), ma **non risulta che abbia chiuso le tre voci una per una**: nessun documento lo attesta, quindi qui restano **da guardare** e non dichiarate chiuse. Se il rapporto del gate dicesse il contrario, vince quello.

- [x] **54.** `max-height: calc(2*1.16em)` è accoppiato al font-size della stessa regola CSS: basterebbe un commento esplicativo.
  · fonte: riga 198 del ledger
  · file/simbolo: `ds-v3.css` (clamp 2 righe cassetta)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **55.** C'è una doppia meccanica di fade tra paziente e dentista, documentata ma da tenere a mente.
  · fonte: riga 198 del ledger
  · file/simbolo: fade paziente/dentista (`Cassetta.tsx`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **56.** Il caso limite «ritorno sullo slot di origine dopo un riordino» è corretto ma non è testato esplicitamente.
  · fonte: riga 202 del ledger
  · file/simbolo: `indiceRettangoloDaPunto` / hook riordino drag
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [ ] **57.** Le colonne restano congelate al momento del sollevamento (lift) durante il drag: comportamento non documentato, limite preesistente.
  · fonte: riga 202 del ledger
  · file/simbolo: drag riordino (colonne)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **58.** La "dead zone" su `gapX` è un compromesso accettato nella decisione di design del riordino.
  · fonte: riga 202 del ledger
  · file/simbolo: `gapX` (drag riordino)
  · stato dichiarato: aperta (tradeoff accettato, non una chiusura formale)
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **59.** Il selettore CSS `.foot > div > span:last-child` è accoppiato alla struttura interna di `TastoPiu`: debito tecnico dichiarato nel codice stesso.
  · fonte: riga 207 del ledger
  · file/simbolo: `.foot > div > span:last-child` — `TastoPiu`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **60.** C'è una molla (spring animation) orfana di circa 110ms allo smontaggio a metà rilascio del piede; una pulizia con `stop()` sarebbe utile ma non urgente.
  · fonte: riga 207 del ledger
  · file/simbolo: molla piede (`TastoPiu`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

  · **61.** → vedi «Già chiuse o adjudicate»: chiusura formale della scelta tra font-weight 500/600 nella fascia C.

- [x] **62.** Lo script `scripts/tmp/shot-rete-ancorata.mjs` è rimasto nel repo per via dei commit di documentazione sulla funzionalità "rete" (oggi parcheggiata). Il ledger lo instrada esplicitamente alla pulizia nel Task 17.
  · fonte: riga 228 del ledger
  · file/simbolo: `scripts/tmp/shot-rete-ancorata.mjs`
  · stato dichiarato: deferita (pulizia assegnata dal ledger a T17)
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **63.** `suoniAttivi()` non viene rivalutata al riavvio (restart) della source audio: se l'utente disattiva i suoni entro 150ms, caso estremo.
  · fonte: riga 246 del ledger
  · file/simbolo: `suoniAttivi()` — restart source
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): NON È UN PROBLEMA.** Guardata nel codice: non c'è niente da correggere — **CHIUSA**.

- [x] **64.** L'ordine di emissione della diagnostica «riavviata-prima-di-statechange» è solo estetico (riguarda l'overlay diagnostico).
  · fonte: riga 246 del ledger
  · file/simbolo: overlay diagnostico suoni — ordine emit
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **65.** Nel catch di `riavviaAlRunning` l'emit diagnostico riporta `nome: null`: estetica diagnostica.
  · fonte: riga 246 del ledger
  · file/simbolo: `riavviaAlRunning`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [ ] **66.** La guardia sul valore "8" (margine della fascia cassetta) è ancorata in due punti in modo letterale: debole nella forma.
  · fonte: riga 252 del ledger
  · file/simbolo: guardia 8px (fascia cassetta)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [ ] **67.** Il `ResizeObserver` chiama `getComputedStyle` a ogni "fire" sul lato paziente: trascurabile in termini di performance secondo il ledger.
  · fonte: riga 252 del ledger
  · file/simbolo: `ResizeObserver` — lato paziente (`Cassetta.tsx`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

- [x] **68.** `onStanzaChange` resta una prop no-op (pensata per usi futuri): andrebbe annotata come tale nel codice.
  · fonte: riga 261 del ledger
  · file/simbolo: `onStanzaChange` (`StanzePager`)
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [ ] **69.** La prop `footer` di `StanzePager` è morta, comportamento preesistente. Stesso item della voce 22 (riga 54) — segnalato due volte nel ledger, in due momenti diversi.
  · fonte: riga 261 del ledger
  · file/simbolo: `StanzePager` — prop `footer`
  · stato dichiarato: aperta
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** Rimandata con motivazione — **RESTA APERTA**. È una delle 30.

---

## Già chiuse o adjudicate (non ri-aprire senza motivo)

- [x] **17.** La classe CSS `.ds-tile-tutte` era orfana (nel ledger, alla riga 47, segnalata solo come «task separato»). Chiusa come follow-up del Task 12: rimossa nel commit `1655517`, suite verde, build ok.
  · fonte: riga 47 del ledger — chiusura documentata alla riga 55 del ledger («Follow-up Task 12: CSS orfano `.ds-tile-tutte` rimosso, commit `1655517`, suite verde, build ok»)
  · file/simbolo: `.ds-tile-tutte`
  · stato dichiarato: già chiusa dal controller
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **33.** Il commento in `stanze-pager.test` riga 138, segnalato come superato, viene dichiarato FIXATO nel giro di commit `0b0fa9b`/`a063fd5`. Il ledger stesso chiede però di «verificare in finale» — quindi la chiusura è dichiarata ma non ancora riconfermata.
  · fonte: riga 102 del ledger (item numerato (4))
  · file/simbolo: `stanze-pager.test.tsx:138`
  · stato dichiarato: già chiusa dal controller — con nota esplicita del ledger di riconfermare in FASE 8
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [x] **37.** Un rumor di 3 fallimenti transitori fuori dal diff dell'ondata H2b/FIX-H era stato osservato; verificato dal controller come estraneo al lavoro di questa ondata (sessione concorrente).
  · fonte: riga 122 del ledger
  · file/simbolo: non indicato
  · stato dichiarato: già chiusa dal controller (verificata estranea)
  · **VERDETTO DEL TRIAGE (26/07/2026): GIÀ RISOLTO.** Si era già sistemata da sé durante l'ondata — **CHIUSA**, non c'è niente da fare.

- [ ] **61.** La scelta tra font-weight 500 e 600 nella fascia C (H2b) è stata chiusa formalmente dal controller: resta 500, perché è la resa che Francesco ha visto e ratificato negli screenshot, con i contrasti già sopra soglia WCAG.
  · fonte: riga 228 del ledger
  · file/simbolo: font-weight 500 vs 600 (fascia C, `ds-v3.css`)
  · stato dichiarato: già chiusa dal controller
  · **VERDETTO DEL TRIAGE (26/07/2026): DA FARE DOPO.** ⚠️ **Attenzione, questa voce sta a cavallo
    delle due sezioni e il triage l'ha messa fra le 30 apposta.** La **decisione** è chiusa (resta
    500, ratificata sugli screenshot che Francesco ha visto, contrasti sopra soglia WCAG) e non si
    riapre. Quello che **resta aperto è il documento**: il sorgente dichiara ancora «⚠️ PUNTO
    APERTO» e nessun verbale attesta la chiusura, quindi la prossima review la riaprirebbe da capo.
    Il lavoro da fare è **riscrivere quel commento e mettere la chiusura a verbale**, niente di più.
    **RESTA APERTA** in questo senso, ed è una delle 30.

---

## Conteggio

### ✅ Conteggio VERO, dopo il triage (26/07/2026) — è questo che vale

| | N. |
|---|---|
| Voci estratte in tutto | **69** |
| **Chiuse dal triage** (GIÀ RISOLTO 17 + NON È UN PROBLEMA 19) | **36** |
| **Ancora aperte — DA FARE DOPO**, le 30 rimandate con motivazione | **30** |
| **Ancora da guardare — DA APPROFONDIRE**, le 3 visive | **3** |
| Bloccanti | **0** |

36 + 30 + 3 = 69. Nel corpo dell'elenco qui sopra ci sono quindi **36 caselle `[x]`** e **33 caselle
`[ ]`**, e i numeri tornano con la tabella in testa al file.

⚠️ **Prima qui era scritto «Aperte: 65».** Non era un errore di calcolo: era il conteggio
dell'**estrazione meccanica**, fatto **prima** del triage e mai aggiornato dopo. Restava a fondo
pagina a contraddire la tabella d'apertura, che diceva 30. Le due metà del file adesso concordano.

### Come si era arrivati a 69 (conteggio d'estrazione, storico — NON è lo stato)

- **Righe del ledger che contengono la stringa «per review finale»:** 33 (grep `per review finale` su `progress.md`), di cui:
  - 32 sono voci reali di tipo «Minor (per review finale)» o varianti equivalenti («Minor (per review finale/QA)» alla riga 44, «Minor aggiuntivo (per review finale)» alla riga 137, «Minor (per review finale + collaudo #4)» alla riga 191);
  - 1 (riga 269) è la voce di chiusura dell'audit di sessione: NON è una voce Minor, ma un riferimento meta che cita testualmente «29 voci «Minor (per review finale)»» per confermare il totale del solo pattern letterale stretto (vedi nota sotto). Non è stata estratta come finding: i suoi 3 «buchi» sono difetti di processo/sessione già trovati e chiusi nello stesso respiro (file di debug rimosso, memoria non committata, server morto riavviato), categoria diversa dai Minor di codice qui raccolti.
  - Nota di coerenza: il pattern letterale stretto `Minor (per review finale)` (senza varianti) matcha esattamente 30 righe, di cui 29 voci reali + la riga 269 stessa — combaciando esattamente con l'affermazione della riga 269 («29 voci»). Le 3 voci aggiuntive (righe 44, 137, 191) usano etichette leggermente diverse e quindi non erano incluse in quel conteggio stretto, ma restano a tutti gli effetti voci «per review finale» da triare in FASE 8.
  - Esclusi deliberatamente dal conteggio: righe 62 e 221, che usano la label generica «Minor:» (senza «per review finale») — convenzione diversa del ledger, non indirizzata esplicitamente alla review finale.
- **Findings distinti estratti:** 69 (da 32 righe reali; ogni riga con `;`, `·` o numerazione `(1)(2)(3)` è stata spezzata in una riga per difetto).
- ~~**Aperte:** 65 (di cui 6 con stato dichiarato «deferita» — instradate esplicitamente a un gate futuro nominato: voci 3, 13, 14, 18, 40, 62 — restano comunque da triare in FASE 8, non sono chiuse).~~ ⚠️ **SUPERATO dal triage:** erano 65 *prima* che il triage le guardasse. Dopo il triage le aperte sono **30** (più 3 da approfondire) — v. la tabella qui sopra.
- **Già chiuse o adjudicate dal controller:** 4 (voci 17, 33, 37, 61) — *prima* del triage. Il triage ne ha poi chiuse **36** in tutto.
