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
