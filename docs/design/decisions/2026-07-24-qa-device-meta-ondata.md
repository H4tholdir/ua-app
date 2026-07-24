# Verbale — QA device di metà ondata (Task 15, riserva FE R8)

**Data:** 24/07/2026 (sera) · **Tester:** Francesco Formicola, Xiaomi (Android, Chrome)
**Build:** worktree `redesign-parete-home` @ `1655517` servita in rete locale (`next start :3020`)
**Esito:** ⚠️ PASS PARZIALE — gesti e meccaniche ok, fix-list su proporzioni/estetica home e regressioni.

## Checklist del piano

| Punto | Esito |
|---|---|
| Swipe pile ↔ parete con parete piena | ✅ ok |
| Drag cassetta in stanza (auto-scroll, drop) | ✅ ok — ❌ MA i suoni stacco/riaggancio NON si sentono |
| Tastiera ricerca in-home: nessun cambio stanza | ✅ ok (non riprodotto sul suo device) |
| Linguetta: appare/si ritira/apprende | ✅ ok |

## Fix-list ratificata da Francesco (ordine suo)

1. **Suoni assenti nel drag** (stacco/riaggancio non udibili su device) — investigare sblocco
   AudioContext/preload nella home embedded; i file sono i SUOI wav ratificati (`ee4da5e`).
2. **Focus ricerca — direttiva NUOVA:** su dispositivi MOBILI il focus automatico sulla barra
   di ricerca entrando nella stanza parete NON deve avvenire; da desktop è accettabile.
3. **(a) Zona bassa della home spropositata:** puntini + TastoPiù + etichetta «Nuovo lavoro»
   occupano ~30% dello schermo, comprimono le stanze (pile scrollate e parete): da ricompattare —
   la stanza deve respirare, il piede deve rimpicciolirsi.
4. **(b) Intestazione della parete sparita in stanza:** ripristinare l'intestazione della stanza
   («Le cassette» + contesto) — era stata soppressa insieme all'header di pagina (Task 12).
5. **(c) Barra grigia laterale fissa nella home** = scrollbar dello scroll interno delle pile
   (`.ua-stanza-pile-scroll`): nasconderla (scrollbar invisibile, scroll resta).
6. **(d) Impostazione pagina /cassette:** Francesco: «la pagina delle cassette è totalmente
   differente da come è adesso nella pwa come impostazione e voglio che sia mantenuta» —
   ⚠️ DA CHIARIRE l'estensione esatta (lettura proposta: proporzioni/figura delle cassette
   come l'attuale produzione — tozze, non allungate — e struttura di pagina invariata;
   rete/gancetto/targa ratificati restano). In attesa della sua conferma.
7. **(e) Clip verticale:** alcune cassette toccano/clippano il gancio della riga sottostante
   (il tile reale supera lo spazio utile della traccia 176 − zona gancio): rivedere l'accoppiata
   altezza-tile/traccia coi valori misurati, senza rompere lo snap (`hook ≡ 10 mod 44`).
8. **(f) Back sbagliato dalla scheda lavoro:** tap cassetta → scheda lavoro → indietro torna
   alla HOME invece che alla pagina/stanza cassette da cui si era partiti — violazione della
   direttiva permanente «Back = pagina precedente» (22/07): correggere la provenienza.

## Incidente di processo (fuori codice)

Un subagent revisore ha cancellato con `rm -rf` troppo largo la cartella `.playwright-mcp/` in
«SOFTWARE FILIPPO» (screenshot/istantanee di sessioni passate, mag-lug 2026, non versionati,
irrecuperabili). Nessun impatto su codice/mockup/verbali (tutti nel repo). CONTROMISURA ATTUATA
E TESTATA: hook `rm-guard` (PreToolUse su Bash) che BLOCCA cancellazioni ricorsive fuori dalle
aree temporanee, per sessione principale e subagent — commit `8b8dd40` su main + settings del
worktree e della cartella padre. Regola operativa: cancellare solo file propri, per percorso
esplicito; cancellazioni ricorsive solo su richiesta esplicita di Francesco.

## Prossimi passi

Fix 1-5, 7, 8 in lavorazione subito (subagent + review); fix 6 dopo il chiarimento.
Ri-collaudo device di Francesco sulla build corretta PRIMA di passare al Task 16.

## Addendum — Intervista post-QA (24/07 sera, decisioni ratificate)

1. **Lo swipe dalla home porta alla PAGINA /cassette vera** (non più stanza/widget): assetto
   completo della pagina (titolo, tasto menu, barra ricerca, griglia centrata, NIENTE tasto
   nuovo lavoro), con tutte le decisioni ratificate (rete P44, gancetti, targa). Il gesto
   SEGUE IL DITO (pannello fisico già montato, zero loading); al completamento si aggiorna
   solo l'indirizzo a /cassette (History API shallow) — il back del telefono torna alla home.
   La D2 originale («stanza parete embedded senza header») è SUPERATA da questa decisione.
2. **Home lato pile: NIENTE scroll** — tutto visibile a occhio, si lavora senza scrollare.
   Lo scroll interno resta solo come rete di sicurezza invisibile (scrollbar nascosta).
3. **Inviti in home: linguetta + puntini** (entrambi restano).
4. **Piede**: compatto in home; ASSENTE nel lato cassette (niente TastoPiù/etichetta lì).
5. **(nuovi, 24/07 sera, con screenshot)** Il colore di sfondo sotto/attorno alla griglia del
   muro è diverso dal fondo della pagina che la ospita: uniformare. Il tile «+ Nuova cassetta»
   tratteggiato non è leggibile sopra la maglia: dargli presenza (fondo velato/tratteggio e
   testo più marcati), senza perdere il linguaggio del tratteggio.

## Ri-collaudo device #1 (25/07 sera, build post FIX-A/B/C @ 47b3311, Xiaomi Chrome, :3020)

**Esiti sui 3 fix di FIX-C:**
- **Suoni (punto 1): ⚠️ PARZIALE.** Appena entrati nella PWA i suoni NON si sentono (es. primo
  tocco di un pulsante muto); dopo il primo gesto/navigazione i suoni funzionano tutti.
  → Nuovo punto D1 (primo tocco muto).
- **Tastiera/focus (punto 2): ✅ PASS.** La tastiera resta giù entrando nella stanza cassette.
- **Back dalla scheda (punto 8): ✅ PASS.** Con login vero si torna alle cassette, non alla home.

**Nuova fix-list ratificata da Francesco (ordine suo, con screenshot agli atti):**
- **D1 — Primo tocco muto:** al primo ingresso il primo tocco non emette suono; i suoni partono
  solo dai gesti successivi. Obiettivo: suono già dal primo tocco utile.
- **D2 (a) — Pila «Appena arrivati» tagliata in home:** la card della pila è clippata
  dall'elemento immediatamente sotto.
- **D3 (b) — DECISIONE: eliminare i dot** indicatori di pagina, sia dalla home sia dalla
  pagina delle cassette. (Supera parzialmente la voce «linguetta + puntini» dell'intervista
  24/07: i puntini SPARISCONO, la linguetta resta.)
- **D4 (c) — Linguetta «cassette» non vista:** l'invito laterale che segnala la pagina
  swipabile non è apparso durante il collaudo. Capire perché (apprendimento localStorage?
  soppressione?) e garantirne la visibilità per un utente che non ha ancora appreso il gesto.
- **D5 (d) — Pagina cassette «compressa» dopo lo swipe dalla home:** cassette schiacciate ai
  lati, scrollbar a sinistra, dot in basso. Al PRIMO drag di una cassetta il layout si
  sistema da solo (si allarga, scrollbar e dot spariscono). Da riprodurre e correggere:
  l'assetto giusto deve esserci SUBITO dopo lo swipe.
- **D6 (e) — Griglia «chiusa» anche a sinistra:** nella schermata cassette corretta la rete
  risulta rifilata/chiusa sul bordo destro; replicare la stessa chiusura sul bordo sinistro.
- **D7 (f) — Ricerca «C5» restituisce 2 cassette (C5 e C12):** capire perché e correggere
  (attese: solo C5, salvo match legittimo su contenuto — da spiegare a schermo se è questo).
- **D8 (g) — Back incoerente dopo il «ripristino» del layout:** nello stato post-drag di D5,
  il primo back non fa nulla, il secondo apre il wizard nuovo lavoro, il terzo porta alla
  home. Catena history da sanare (correlato a D5).
- **D9 (h) — Sheet «Metti un lavoro»:** lo scroll della lista lavori non funziona
  correttamente; la lista va RIVISTA per identificare meglio il lavoro (design da proporre a
  Francesco con varianti); rivedere anche il comportamento del focus dopo l'inserimento di
  valori nella barra di ricerca dello sheet.
- **D10 (i) — Drag sfalsato:** durante il drag alcune cassette risultano sfalsate — l'ombra
  (anteprima/ghost) non segue il dito sul punto di appoggio. Negli screenshot: C19 doppia
  (tile trascinato + ghost fuori posizione), C3 ghost traslato.

**Decisioni ancora aperte (non toccate dal ri-collaudo):** piede P1/P2/P3 (D3 lo cambia:
senza dot il piede si compatta da sé — da rivalutare a valle), traccia 220 a vista, overflow
residuo 50px@660, forma «solo parete» senza piede.

## Ri-collaudo device #2 (25/07 mattina, build a063fd5, Xiaomi Chrome, :3020)

**Esiti wave D:** tastiera ✅ · back cassette→home ✅ · pila liberata ✅ · linguetta riappare ✅ ·
assetto post-swipe ✅ · scroll sheet ✅ · bersaglio drag ✅ · targa aggiornata subito ✅.

**Decisioni RATIFICATE da Francesco:**
- **Lista «Metti un lavoro»: V2 «targhetta»** (mockup 2026-07-25-sheet-metti-lavoro-lista.html) — da implementare.
- **Cornice della rete: V1 «filo di bordo»** (mockup 2026-07-25-rete-cornice-bordi.html) — da implementare.
- **Ricerca (ex D7): ELIMINARE il match sul codice esadecimale del colore** («inutile per un
  laboratorio»). **AGGIUNGERE la ricerca sul campo note laboratorio** (oggi assente).
  Aperto: quali altri campi rendere cercabili (tecnico? paziente? consegna?) — Francesco chiede
  l'elenco dei campi disponibili per decidere.

**Nuova fix-list ratificata (ordine suo):**
- **G1 — Suoni primo tocco ANCORA KO:** funzionano solo dal secondo tocco. (Ipotesi da
  verificare: `initSuoni()` vive nel mount DIFFERITO di PareteClient dentro il pager → il primo
  tocco precede l'accensione del motore.)
- **G2 — Pile: clip dell'ombra RIapparsa** (già risolta una volta nella PWA in produzione —
  recuperare quel fix) **+ gestione dello spazio:** più aria, pile più grandi sfruttando lo
  spazio libero tra l'ultima pila e il tasto «Nuovo lavoro».
- **G3 — Linguetta:** grafica errata (contenuto non centrato); rivederne funzionamento e
  grandezza ora che i puntini non ci sono più (proposta da presentare).
- **G4 — Piede della home nello swipe:** il blocco del TastoPiù scompare/ricompare di colpo
  durante lo swipe verso le cassette — poco elegante. Proposta di transizione da presentare.
- **G5 — Back gesture non chiude lo sheet:** con lo sheet aperto, il gesto indietro del telefono
  deve chiudere lo sheet (non navigare).
- **G6 — Gancetto sfalsato dal filo (screenshot):** il gancetto non aggancia il filo della
  griglia. (Ipotesi: pattern SVG light fisso a 44px vs `--passo-maglia` clampato — limite già
  documentato che ora è visibile.)
- **G7 — Ricerca:** attuare la decisione ratificata sopra (hex via, note dentro) + enumerare i
  campi disponibili per la scelta finale.
- **G8 — Miniatura generica dopo «Metti un lavoro»:** appena inserito un lavoro la cassetta
  mostra sempre l'SVG generico; al refresh appare quello giusto. (Causa nota e dichiarata:
  il contratto di GET /api/cassette/lavori-liberi non porta tipoDispositivo/descrizione —
  estendere la route e l'overlay ottimistico.)
- **G9 — Implementare le due ratifiche:** lista V2 «targhetta» + cornice rete V1 «filo di bordo».

**Restano in coda decisioni:** funzionamento/grandezza linguetta (dopo proposta G3) ·
transizione piede (dopo proposta G4) · campi ricerca aggiuntivi (dopo elenco G7).

### Aggiunta al ri-collaudo #2 (stessa sessione, screenshot vecchia PWA agli atti)

- **G10 — Design della cassetta (nuova richiesta):** nella vecchia visualizzazione di
  produzione il bordo in alto della cassetta (vicino al gancetto) è SOTTILE e lo spazio
  «vuoto» che accoglie l'SVG del lavoro (la finestra/cavità) è PIÙ GRANDE. Francesco chiede
  di portare le cassette v3 verso quel rapporto, con conferma visiva PRIMA del codice:
  presentare varianti sia del punto specifico (bordo sottile + finestra più grande) sia
  della cassetta intera. Vincolo: targa ratificata (pill + clinico/paziente) resta salvo
  esplicita deroga; geometria gancetto/snap invariata.

### G10 — orientamento di Francesco (25/07, su mockup rev.2)

Francesco orienta sulla **P3 «fascia etichetta»** e chiede il mockup «pari alla situazione
reale» (pagina cassette completa) prima della ratifica, con UNA variante in più: il bordino
super sottile tra la fascia dell'etichetta e la finestra (il vuoto) mostrato anche in
versione PIÙ SPESSA. Ratifica attesa sul mockup rev.3.

### G10 — RATIFICA parziale (25/07, su mockup rev.3)

- **RATIFICATO: P3b «fascia etichetta» col bordino SPESSO (8px)** — finestra 66, fascia
  ancorata in basso, tile 132.
- **Vincolo nuovo ratificato: grafica UNIFORME** — la cassetta NON cambia veste tra occupata
  e libera: sempre la veste della versione «libera» (targa ad anello, stessa fascia); a
  cambiare è solo il contenuto (miniatura nella finestra, nomi al posto di «libera»).
  ⚠ Deroga consapevole alla targa piena bianca del gate targa (Task 10) per le occupate.
- **Aperto: trattamento dei nomi lunghi** — «non troncare di netto i nomi dei medici»:
  varianti da presentare (due righe / sfumatura / abbreviazione) su mockup rev.4.

### G10 — RATIFICA FINALE (25/07, chiusa)

**La cassetta nuova (da implementare, valori dai mockup committati):**
- Base: **P3b «fascia etichetta», bordino spesso 8px** (rev.3, `2026-07-25-cassetta-g10-rev3-p3-reale.html`):
  tile 132 · finestra 8..74 (h 66) · fascia ancorata in basso.
- **Veste UNIFORME = ESATTAMENTE la grafica delle cassette VUOTE della rev.3** (indicazione
  esplicita di Francesco: «usa esattamente la grafica di queste due cassette vuote e non
  quella che mi hai proposto» — quindi NON la fascia ad altezza fissa della rev.4):
  fascia compatta che abbraccia il contenuto (margin 0 4px 4px, radius 4/4/9/9, padding
  5px 8px 6px, fondo rgba(0,0,0,.28) — is-chiara rgba(29,25,19,.14)), **targa SEMPRE ad
  anello** (come le libere: inset ring 2px, testo bianco .9 / scuro .7 su faccia chiara),
  identica per occupate e libere; contenuto: «libera» oppure clinico (regular) + paziente
  (bold), contrasto-auto invariato.
- **Nomi lunghi: OPZIONE A «due righe»** — il clinico va a capo (corpo 10px, line-height
  1.15, max 2 righe poi tronca; meccanica shrink T2 riusata); il paziente resta 1 riga bold.
  Conseguenza accettata: la fascia cresce di ~10px sui nomi lunghi.
- Restano ratificati: gancetto/aggancio invariati · cornice V1 filo di bordo · geometria
  passo/track invariata. La targa piena bianca del gate targa (Task 10) è SOSTITUITA da
  questa ratifica per la superficie parete.

→ In coda di implementazione come **FIX-L** (dopo FIX-J/K: stesso file ds-v3.css).

### G10 — precisazione di Francesco (25/07, vincolante)

**La targa che si «riempie» RESTA:** l'uniformità ratificata riguarda la STRUTTURA della
cassetta (fascia etichetta compatta, finestra, bordino — identiche per tutte), NON il
segnale di stato della targa. La targa dentro la fascia resta: **ad anello quando la
cassetta è libera, PIENA (bianca) quando contiene un lavoro** — comportamento attuale
conservato. Decade quindi la deroga al gate targa (Task 10) annotata nella ratifica
precedente: il gate resta pienamente in vigore.

## Ri-collaudo device #3 (25/07 pomeriggio, build aa4993a, Xiaomi Chrome, :3020)

**PASS confermati da Francesco:** gancetto sul filo a ogni larghezza ✅ · cornice filo di
bordo su entrambi i lati ✅ · back del telefono chiude lo sheet ✅ · miniatura giusta subito
dopo «Metti un lavoro» ✅ · lista «Metti un lavoro» V2 targhetta ✅ · pile più grandi e
ariose ✅ · ricerca (niente hex, note laboratorio) ✅.

**Decisioni RATIFICATE:** linguetta **F2 «impara e si assottiglia»** + taglia **T2 (34px)** ·
piede **C2 «il tasto si ritira»** — MA Francesco vuole VEDERE le due animazioni (C1 vs C2)
in demo animata prima della conferma definitiva: preparare la demo PRIMA di implementare.

**Nuova fix-list ratificata (wave H, ordine suo):**
- **H1 — Suoni primo tocco ANCORA KO (terzo giro):** il suono parte sempre dal secondo tocco.
  Direttiva di Francesco: BASTA fix alla cieca — prima RICERCA dedicata (policy audio di
  Chrome Android/WebView, user activation, timing di resume/decode) e CONFRONTO CON PANEL DI
  ADVISOR SPECIALIZZATI (Regola Advisor 17/07) con evidenza raccolta DAL DEVICE (es. overlay
  diagnostico come il P-STATUSBAR del Collaudo R3), POI il fix.
- **H2 — Cassetta nuova: NON ci siamo (tre difetti, sue parole):**
  (a) «avevo chiesto espressamente di avere la forma delle cassette tutte come quella libera,
  invece ne vedo due tipi» — a schermo le occupate hanno fascia più alta/tile più alto
  (colpevoli: fascia che abbraccia il contenuto + is-nome-lungo min-height 142). UNA SOLA
  sagoma, SEMPRE.
  (b) «le etichette non devono stare sul bordo, ma nella pancia della cassetta come quelle
  libere; l'altezza delle etichette deve essere SEMPRE FISSA, piena e vuota» — fascia in
  posizione e altezza IDENTICHE per tutte, come la resa delle libere.
  (c) «i nomi non mi sembra restino interi, li vedo ancora troncati» — BARALE S.…,
  DI SANTI C.…, STUDI MEDICI DI SANTI… Il troncamento netto non va bene. ⚠ (b) altezza
  fissa e (c) nomi interi sono in tensione: serve una PROPOSTA DESIGN con mockup di
  conferma PRIMA del codice (niente altra implementazione al buio).
- **H3 — BUG riordino (nuovo):** «quando tengo premuto e la cassetta si stacca, si
  auto-ordinano altre cassette non riferite a quella ancor prima che io rilasci il dito o
  decida la posizione». Indagare `useDragRiordino`: quando scatta il primo ricalcolo
  dell'ordine ottimistico al lift; distinguere bug (indice sbagliato al distacco) da design
  percepito male (FLIP che «apre la buca» troppo presto).
- **H4 — Implementare le ratifiche:** linguetta F2+T2; piede C2 SOLO dopo la demo animata
  C1 vs C2 e conferma.

**Direttiva di processo (Francesco, vincolante):** contesto della sessione al ~60% — da qui
in poi ogni lavoro va scritto, appuntato, certificato e SVOLTO IN UNA NUOVA SESSIONE a
contesto pulito. Handoff: `docs/roadmap/2026-07-25-redesign-parete-home-wave-h-handoff.md`.

---

## APPEND — 25/07 pomeriggio, wave H: H1 CHIUSO SUL DEVICE (Francesco: «abbiamo risolto»)

**Metodo eseguito come da direttiva (niente fix alla cieca):**
ricerca con fonti primarie (`.superpowers/sdd/h1a-ricerca-report.md`) → overlay diagnostico
temporaneo `?diag=suoni` (pattern P-STATUSBAR; commit `d91f2ac`+`59b7cfd`, review a due stadi)
→ evidenza DAL device (screenshot 14:09) → PANEL 3 ADVISOR (Regola 17/07; sintesi in
`.superpowers/sdd/h1-diagnosi.md`) → fix `6823daa` (review APPROVED) → collaudo device 14:48.

**Diagnosi provata (misure 14:09):** `pointerdown` da tocco non conferisce user activation
(`isActive=false` a schermo) → il `resume()` chiamato lì restava appeso; `suona('tap')` del
click veniva scartata (`!sbloccato`) 11ms PRIMA del resolve dei resume. Race di ordinamento,
non latenza hardware (resume in 8-15ms una volta attivato).

**Fix ratificato dal panel (3/3 con riserve, tutte integrate):** suono accodato SINCRONAMENTE
dentro il gesto (`connect`→`start()` anche a contesto non-running) + `resume()` esplicito in
coppia (obbligo iOS/WebKit) · guardia `userActivation.isActive` (mai enqueue fuori gesto —
niente suoni fantasma) · scadenza 150ms + max 1 pending (requisiti UX) · copertura stato
`interrupted` (bug NUOVO scoperto dal panel: post-telefonata il motore restava muto per
sempre) · fallback legacy esatto dove `userActivation` manca.

**Evidenza di chiusura (screenshot 14:48, Chrome Android):** primo tap:
`[gesto] pointerdown isActive=false` → `[suona] tap esito=enqueued (state=suspended) Δpd=71ms`
→ `[statechange] running` 16ms dopo → suono UDITO da Francesco. Tap successivi `giocato`;
sulla parete `stacco` e `riaggancio` `giocato`. Conferma verbale di Francesco in chat:
«abbiamo risolto».

**Coda:** overlay diagnostico e canale (`sound-diag.ts`) restano montati per il ri-collaudo
#4 di fine wave; rimozione con commit dedicato dopo (pattern `9416d25`). Nota per T17: spec
DS v3 §9 da allineare (7 suoni + semantica enqueue-nel-gesto).

---

## APPEND — 25/07 sera, RI-COLLAUDO #4 (wave H completa, build 44ce44c)

Esiti di Francesco (chat, 19:08, con screenshot /cassette):

1. **Suoni — PASS** («ok tutto bene»).
2. **Linguetta F2/T2 — PASS** («tutto ok»).
3. **Cassetta B — PASS con 2 richieste di rifinitura:**
   (a) paziente su PIÙ RIGHE se non entra, come il clinico (oggi 1 riga + sfumatura —
   screenshot: «Ciruzzo Toz» sfumato su C12);
   (b) «valutiamo come rendere più leggibili le scritte, in alcuni casi un po' difficili
   da leggere, soprattutto sul cellulare».
   → Trattate INSIEME (stessa fascia a budget fisso): proposta design con varianti su
   screenshot, scelta di Francesco, poi codice.
4. **Riordino aggancio-al-dito — PASS** («tutto ok»). [dati muro non più necessari:
   comportamento corretto confermato → ipotesi C (collasso gridAutoRows su device)
   di fatto smentita dal PASS a dito fermo]
5. **Piede C2 — FAIL, 2 difetti:**
   (a) dopo lo swipe, sulla pagina cassette resta un BLOCCO PANNA che copre la pagina
   (screenshot: il piede col tasto + visibile sopra /cassette);
   (b) animazione ok se lenta; veloce → scattering/rimbalzo brutto, a volte non avviene,
   a volte il pulsante SPARISCE dalla home o APPARE sulla pagina cassette.
   → Coincide (aggravato) coi concern dichiarati da implementer e reviewer H4c
   (flick senza velocità · contesa molla↔scroll-snap · riconciliazione da stanzaAttiva
   annotata come mitigazione): fix con riproduzione flick-veloci obbligatoria.

### Addendum ri-collaudo #4 — appunto iPad (Francesco, 19:2x, foto /cassette da tablet)

Tre difetti dalla visualizzazione su iPad (griglia a 6 colonne):
1. **Cassette NON agganciate correttamente ai fili** della rete (gancetti fuori maglia).
2. **Alcune cassette «rotte», altre no** (foto a verbale): nei tile rotti la finestra
   e la fascia appaiono DISALLINEATE rispetto al corpo (finestra spostata in alto/sx,
   fascia in basso/dx, pezzi che sporgono dalla sagoma). Colpite tra le altre:
   C9, C12, C3, C21, C4, C16, C19, C20; normali: C5, C10, C8, C1, C7. Pattern non
   ovvio dalla foto (miste libere/occupate) — da isolare in riproduzione.
3. **Animazione del drag scattosa** su iPad (si collega al filone «iOS fluidità» già
   in ROADMAP, ma da diagnosticare qui per distinguere cause nuove della wave).

### Addendum 2 — screenshot desktop (Francesco, 25/07 sera, Chrome ~6 colonne)

Su desktop: cassette TUTTE integre e animazioni ok → «cassette rotte» e «drag scattoso»
sono SOLO-iPad (WebKit). I gancetti però risultano fuori filo ANCHE su desktop →
il disallineamento dalla maglia è cross-engine e cross-larghezza: geometria nostra.

### Addendum 3 — Rete/ganci: PARCHEGGIATO per ordine di Francesco (25/07 sera)

Parole a verbale: «lasciamo stare questa cosa della rete e della centratura delle cassette
sul desktop, poi ci torneremo, non mi convincono questi mock, stai usando le cassette
vecchie, cambi il filo, a me serve solo che venga centrato nella visualizzazione tablet e
desktop punto, nient'altro». Il difetto 1 dell'indagine H5 (ganci/maglia) NON si implementa
in questa wave. REQUISITO VERO da cui ripartire quando si riprenderà: parete CENTRATA nella
visualizzazione tablet e desktop — niente redesign del filo. I mockup f1236d5/105c6ba
restano in docs come materiale di studio, non ratificati.

---

## APPEND — 25/07 notte, VERIFICA FINALE wave H (build 22aed23, esiti Francesco 21:26-21:31)

1. **Piede — MIGLIORATO ma non chiuso:** animazione ok, niente più flicker/stati persi; MA
   subito dopo lo swipe, sulla pagina cassette compare un QUADRATO PANNA che copre le
   cassette e POI scompare (transiente, non più permanente). Ipotesi di Francesco a
   verbale: «l'animazione della scomparsa del pulsante nuovo lavoro si chiude in quella
   pagina e quindi non fa scomparire in tempo il riquadro». Coerente col design del fix:
   il collasso del box avviene solo al riposo esatto (scrollend+molla ~110ms dopo
   l'arrivo) — nel frattempo il box del piede resta dipinto sopra la pagina nuova.
2. **Fascia C — PASS con 2 difetti:** (a) il paziente lungo NON va su due righe nella
   pratica (screenshot: «Ciruzzo Toz» sfumato su C12/C4) — causa strutturale: alla
   larghezza mobile quasi OGNI nome di clinico va a capo su 2 righe («BARALE S.A.S.»,
   «DI SANTI CATERINA», «STUDI MEDICI DI SANTI») → il budget condiviso ratificato
   (clinico 2 → paziente 1) non lascia praticamente mai le 2 righe al paziente;
   (b) leggera sfumatura in basso sul nome di ALCUNI medici che NON sbordano (falso
   positivo del rilevatore is-troncato, da tarare).
3. **iPad — cassette ANCORA «rotte»** nella pancia (zona fascia: etichetta+nomi), con
   hardening text-size-adjust+overflow a bordo → meccanismo (A) insufficiente/escluso;
   resta (B) compositore o una terza causa WebKit. Prossimo gradino: Safari macOS reale.
4. **Suoni — 2 casi residui device-specifici (scoperta di Francesco, prima azione a PWA
   fresca):** (a) primo gesto = swipe+DRAG → suono di sgancio MUTO, riaggancio al
   rilascio OK, poi tutto ok — su TUTTI i mobili; (b) primo gesto = TAP su pulsante →
   suono OK sui telefoni, MUTO su iPad, OK su desktop.
