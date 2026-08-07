# Referto — Compito 6: «I disegni, prima del React»

🛑 **CANCELLO — nessuna riga di React scritta.** Questo compito produce solo disegni e scatti, da
mostrare a Francesco prima di qualunque codice sulle schermate.

Ramo: `p31-due-numeri-per-il-cliente` (invariato, come da mandato). Nessun commit ancora al momento
in cui scrivo questo referto (arriva subito dopo, sui soli file di disegno).

## Cosa ho disegnato

Un solo file, due fogli («scene»), uno sotto l'altro nello stesso documento (non letteralmente
affiancati — v. nota sotto «Scelte di disegno»):
`docs/design/mockups/2026-08-03-p31-due-numeri.html`

**Scena A — il wizard «Nuovo dentista», cinque campi (D184).** Sfondo: Passo 1 del wizard «Nuovo
lavoro» (semplificato — non è l'oggetto dell'approvazione), con due dentisti già in rubrica e il
tasto «＋ Nuovo dentista» che ha aperto il foglio. Il foglio (`Sheet`) contiene, in quest'ordine
(quello dettato dal brief):

1. Nome — *Vincenzo*
2. Cognome — *Telesca*
3. Telefono dello studio — *0976 74210*
4. Cellulare WhatsApp — *349 662 0187*, con l'aiuto sotto
5. Studio — *Studio Dentistico Telesca*

poi il tasto fisico **«Crea dentista»** (testo reale, verbatim da `NuovoDentistaSheet.tsx` — non
l'ho reinventato) e il link di fuga **«Chiudi»** che il componente `Sheet` aggiunge da solo.

Dentista scelto: **non** il caso reale già in banca dati (Studio Piegari, Muro Lucano — che esiste
già, quindi non avrebbe senso ricrearlo in un wizard di creazione), ma un secondo studio plausibile
nello stesso comune («per esempio uno studio di Muro Lucano», come indica il brief): Vincenzo
Telesca, prefisso telefonico reale della zona (0976).

**Scena B — il foglio della consegna, un campo solo (D183).** Sfondo: la schermata «Consegnato!»
(semplificata rispetto a `FrameConsegnato.tsx` reale), per un lavoro **del vero caso in banca
dati**: Studio Odontoiatrico Piegari Gianfranco, Muro Lucano (PZ) — l'unico cliente su 39 che ha un
numero valorizzato, ed è un fisso (`0976 71439`); **zero** clienti hanno oggi un
`cellulare_whatsapp` (fatto confermato in `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md:27`).
È esattamente lo scenario che questo foglio deve gestire: si è toccato «Invia messaggio WhatsApp»,
il cellulare manca, si apre un foglio con un campo solo:

- una riga di contesto («Per lo **Studio Piegari** manca ancora un cellulare...»)
- **Cellulare WhatsApp** — vuoto, placeholder `333 1234567`, con lo stesso aiuto sotto
- il tasto fisico **«Salva e apri WhatsApp»**
- «Chiudi»

## Le misure — copiate dai componenti veri, non a occhio

Letti prima di disegnare: `src/components/ds/Campo.tsx`, `TastoPrimario.tsx`, `Sheet.tsx`,
`LinkQuieto.tsx`, `TastoWhatsApp.tsx`, `src/design-system/v3/tokens.ts`, `src/app/ds-v3.css`.
Ogni valore nel CSS del mockup è una trascrizione diretta di quei file (colori, radius, altezze,
padding, ombre) — non una stima.

**Scoperta che mi ha fatto fermare a controllare, invece di fidarmi:** il mockup gemello dello
stesso giorno (`2026-08-03-p30-modifica-dentista-A-righe.html`, righe 20/93) dipinge il fondo del
foglio in tema scuro con `--elv` (#2B2620) — che è quello che **la spec DS v3 §3.2** assegna ai
fogli. Ma `Sheet.tsx:508` (il componente vero, oggi) scrive `background: 'var(--card)'`
(#211D18 in scuro), **non** `--elv`. Questa divergenza fra spec e codice è **già tracciata** come
bug **P34** in `ROADMAP-UFFICIALE.md` (trovata dall'esecutore del compito 5, allargata dal
revisore) — riferita, non corretta, esattamente come deve restare (R-E2). Il mio disegno copia il
**codice vero di oggi** (`--card`) e non il precedente del mockup P30: ripetere quella convenzione
qui avrebbe rifotografato la spec anziché il componente, cioè lo stesso scarto che ha generato P34
— l'ho evitato deliberatamente, l'ho scritto come commento nel file (righe vicino a `.foglio`).

## I 12 scatti

`docs/design/mockups/screenshots/2026-08-03-p31/` — 3 formati × 2 temi × 2 fogli:

| Foglio | 390 chiaro | 390 scuro | 768 chiaro | 768 scuro | 1280 chiaro | 1280 scuro |
|---|---|---|---|---|---|---|
| Wizard (Scena A) | `wizard-390-light.png` | `wizard-390-dark.png` | `wizard-768-light.png` | `wizard-768-dark.png` | `wizard-1280-light.png` | `wizard-1280-dark.png` |
| Consegna (Scena B) | `consegna-390-light.png` | `consegna-390-dark.png` | `consegna-768-light.png` | `consegna-768-dark.png` | `consegna-1280-light.png` | `consegna-1280-dark.png` |

Presi con Playwright (server statico locale sul file, non `file://` — bloccato dal plugin),
screenshot **per elemento** (`#scena-a`/`#scena-b`, non l'intera pagina): ogni `.scena` è
`height:100vh` col viewport realmente ridimensionato a 390×844 / 768×1024 / 1280×800, quindi ogni
scatto mostra esattamente ciò che un vero schermo a quella misura vedrebbe — non un ritaglio a
mano. Tema scuro attivato via `data-tema="dark"` sull'`<html>` prima degli scatti (stesso metodo
del mockup P30 dello stesso giorno: nessun tasto di cambio tema in pagina).

Verificati a schermo tutti e 12 prima di scriverli qui (non solo generati): leggibili, nessun
troncamento, nessuna sovrapposizione, lo scroll interno del foglio (`overflow-y:auto`,
`max-height:92%`) si vede correttamente a 1280×800 quando il contenuto supera l'altezza disponibile
— comportamento vero di `Sheet.tsx`, non un difetto del disegno.

## I contrasti MISURATI (non dichiarati)

Calcolati due volte, indipendentemente, con la stessa formula WCAG (luminanza relativa): una volta
da riga di comando sugli hex dei token, una volta **dal DOM renderizzato** (`getComputedStyle` +
`getBoundingClientRect`, dentro il file vero, in tema scuro) — i due calcoli combaciano al
centesimo, quindi il CSS del mockup non ha errori di trascrizione rispetto ai token dichiarati.

**⚠️ Il punto che il brief chiede di misurare per primo — l'aiuto in tema scuro:**

| Testo | Colore | Fondo | Rapporto | Soglia WCAG 1.4.3 | Esito |
|---|---|---|---|---|---|
| Aiuto sotto il campo (`--muted` #A69B8C) | su `--card` #211D18 (fondo vero del foglio, `Sheet.tsx:508`) | | **6,13:1** | 4,5:1 (testo piccolo) | ✅ sopra soglia, largo margine |
| *(per confronto, non usato)* stesso `--muted` su `--elv` #2B2620 (il fondo che la SPEC assegnerebbe) | | | 5,49:1 | 4,5:1 | ✅ regge comunque |
| *(per confronto, non usato)* `--faint` #928778 su `--elv` (quello che l'etichetta userebbe SE fosse usata per l'aiuto) | | | **4,25:1** | 4,5:1 | ❌ sotto soglia — è **P30-bis**, motivo per cui l'aiuto usa `--muted` e non `--faint` |

Tutti gli altri testi del disegno, entrambi i temi:

| Testo | Chiaro | Scuro |
|---|---|---|
| Etichetta campo (`--faint`, 13px/800, maiuscolo) su fondo del foglio | 5,14:1 | **4,75:1** ⚠️ misurato, sopra soglia ma con margine stretto |
| Valore digitato nel campo (`--ink`, 19px/700) su fondo del foglio | 17,33:1 | 14,49:1 |
| Titolo del foglio / domanda (`--ink`, 21px/800) | 17,33:1 | 14,49:1 |
| Riga di contesto (Scena B, `--muted`, 15,5px/600) | 5,74:1 | 6,13:1 |
| Link «Chiudi» (`--muted`, 14,5px/600, sottolineato) | 5,74:1 | 6,13:1 |
| Testo bianco sul tasto fisico rosso (21px/800 — categoria «testo grande», soglia 3:1) | 5,30–8,06:1 | **3,52:1** al punto più chiaro del gradiente (55%) — sopra 3:1, sotto 4,5:1: passa SOLO perché è testo grande/grassetto, stesso ragionamento già verificato per P30 |

⚠️ **Nota non richiesta esplicitamente ma misurata per onestà:** il bordo del campo (`--line`
#342E26) sul fondo del foglio in scuro (`--card` #211D18) è a **1,25:1** — molto sotto i 3:1 di
WCAG 1.4.11 (confini di componenti UI). Il campo resta comunque identificabile (etichetta sopra +
placeholder/valore dentro), quindi non l'ho trattato come blocco per questo compito — solo
misurato e segnalato, perché il bordo di un campo dentro un foglio scuro è quasi invisibile di suo
(fuori mandato: non è un difetto introdotto da questo disegno, è così ovunque `Campo` vive dentro
`Sheet` in tema scuro).

## Bersagli tappabili — misurati sul DOM vero, non assunti

| Elemento | Attesa da codice | Misurato (390×844) | Esito |
|---|---|---|---|
| Ogni campo (`CampoTesto`) | 64px altezza | **327×64** | ✅ |
| Tasto fisico, mobile (<1024px) | 70px | **327×70** | ✅ |
| Tasto fisico, desktop (≥1024px) | 60px | **417×60** / **432×60** (misurato a 1280px) | ✅ |
| Link «Chiudi» | area tappabile 44px (padding 13+margin −13, non il testo visivo di 18px) | **45×44** | ✅ — copiato da `LinkQuieto.tsx`, non inventato |
| Maniglia del foglio (visiva) | 36×4 visivo, area di presa reale 44px+ via `::before` in `ds-v3.css:103-108` | 36×4 (solo visivo — v. nota sotto) | — |

**Nota sulla maniglia:** il mio mockup non riproduce l'estensione dell'area di presa
(`ds-v3.css:103-108`, `inset:-20px -8px` sul `::before`) perché in questo file statico la maniglia
non è trascinabile (nessun drag implementato — non serve al giudizio del disegno). Il componente
vero **ce l'ha già** (verificato leggendo il file), quindi non è un difetto: è solo un dettaglio
che il mockup non deve dimostrare.

## «Lo stesso peso» (D184) — verificato, non solo dichiarato

Tutti e cinque i campi del wizard condividono **la stessa classe `.label`** (13px/800/maiuscolo/
`--faint`) e **la stessa classe `.campo`** (altezza 64px, font 19px/700, stesso padding, stesso
bordo) — nessuna variazione di dimensione, peso o colore fra Telefono dello studio e Cellulare
WhatsApp. L'unica differenza è che sotto il Cellulare compare la riga di aiuto: è informazione
**aggiuntiva**, non una riduzione del campo sopra di lei — il campo del telefono resta identico in
tutto, non «più piccolo» né «meno importante». Ho verificato che questo non introduce un'asimmetria
di lettura: nello scatto a 390px entrambi i campi restano nella stessa colonna, stessa larghezza,
stesso stile, uno via via sotto l'altro.

## Scelte di disegno da sottoporre a Francesco

1. **Il testo dell'aiuto.** Il piano propone: *«Qui arrivano i messaggi di consegna. Dev'essere un
   cellulare, non il fisso.»* Nel disegno ho usato una formulazione alternativa, che riprende un
   giro di frase già proposto (e non ancora bocciato) nel mockup P30 dello stesso giorno per un
   campo telefono: **«È il numero a cui UÀ manda i messaggi di consegna su WhatsApp — ci vuole un
   cellulare, non il fisso dello studio.»** Nessuna delle due usa gergo (dizionario §2.3 conferma
   che «cellulare»/«fisso» sono parole di casa) — la differenza è solo di tono: la mia dice *perché
   esiste il campo* prima di dire *quale numero vuole*, l'originale fa il contrario. Decisione di
   Francesco: quale delle due (o una terza).
2. **Lo stesso identico aiuto compare in ENTRAMBI i fogli** (wizard e consegna). Alternativa
   scartata: nel foglio della consegna il contesto è già dato dalla riga sopra il campo («Per lo
   Studio Piegari manca ancora un cellulare...»), quindi lì l'aiuto potrebbe essere più corto. Ho
   preferito il testo identico per un motivo preciso — **un solo posto dove imparare questa
   frase** — ma è una scelta, non un fatto: da confermare.
3. **Il tasto della consegna è un `TastoPrimario` rosso («Salva e apri WhatsApp»), non un tasto
   verde in stile `TastoWhatsApp`.** Non è stata una scelta a piacere: `TastoWhatsApp.tsx` ha un
   **contratto di sicurezza** dichiarato nel suo stesso file — è riservato ad ancore `<a
   href="https://wa.me/...">` con un URL già pronto, e qui il tasto deve prima **salvare** il
   numero (chiamata di rete), non aprire subito un link. Uso `TastoPrimario` perché la regola di
   quel componente è proprio questa: «UNO per schermata, massimo — l'unica azione che conta». Resta
   da confermare solo **l'etichetta**: «Salva e apri WhatsApp» è più lunga dei verbi secchi che il
   resto dell'app usa lì («CONSEGNA», «FATTO», «RIORDINA») — un'alternativa più corta potrebbe
   essere «Salva il cellulare».
4. **L'ordine dei cinque campi** è quello scritto nel brief (Nome · Cognome · Telefono dello studio
   · Cellulare WhatsApp · Studio) — l'ho seguito alla lettera, non l'ho deciso io: lo riporto qui
   solo perché il compito lo elenca esplicitamente fra le cose da approvare.
5. **Il dentista scelto per il wizard** (Vincenzo Telesca, Muro Lucano) è inventato ma plausibile,
   nello stesso comune del caso vero in banca dati (Studio Piegari) — l'ho tenuto distinto da
   Piegari apposta, perché Piegari esiste già e ricrearlo in un wizard di creazione avrebbe confuso
   il senso della scena.

## Dubbi e ritrovamenti fuori mandato (riferiti, non corretti — R-E2)

- **Nessun ritrovamento nuovo.** Ho solo **confermato leggendo il codice sorgente** un fatto già
  tracciato (P34/P30-bis: `Sheet.tsx:508` dipinge `--card`, non `--elv` come vorrebbe la spec) — non
  l'ho corretto (non è nel mio mandato) e non l'ho ri-registrato come nuovo, era già in
  `ROADMAP-UFFICIALE.md`.
- **`NuovoDentistaSheet.tsx` (il componente React vero) ha oggi ancora 4 campi**, col vecchio
  «Cellulare/WhatsApp» unico — invariato, perché questo compito è un disegno, non codice. Lo scrivo
  solo per chiarezza: nessuna riga di quel file è stata toccata.
- **`FrameConsegnato.tsx` non ha oggi alcuna gestione del cellulare mancante** — monta
  incondizionatamente `TastoWhatsApp` con `esito.whatsapp_url`. Il flusso «il tasto chiede e salva»
  (D183) non esiste ancora nel codice: è previsto per un compito successivo (presumibilmente il
  compito 8, dopo l'approvazione di questi disegni). Non l'ho toccato.
- **Bordo del campo quasi invisibile in tema scuro dentro un foglio** (1,25:1, v. sopra) — misurato
  per completezza, non è un difetto introdotto qui e non è nel mandato di questo compito.

## Stato

✅ **FATTO — in attesa dell'approvazione di Francesco.** Nessuna riga di React scritta, come da
cancello. Il prossimo passo (Passo 5 del brief, «scrivi la decisione») resta **non fatto
apposta**: non esiste ancora una decisione da scrivere finché Francesco non si è espresso sulle
cinque scelte sopra.
