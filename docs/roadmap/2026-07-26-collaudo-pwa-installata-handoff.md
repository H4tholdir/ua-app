# Handoff — Collaudo della PWA INSTALLATA (26/07/2026, dopo il merge in produzione)

**Per:** sessione NUOVA a contesto pulito (richiesta esplicita di Francesco).
**Prima di tutto:** BP-0 — `memory/MEMORY.md` (voce 42) e
`docs/roadmap/2026-07-27-post-ondata-handoff.md` (stato del ramo appena mergiato).
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md`
§0D) · rm-guard · **Regola Advisor** · mockup PRIMA del codice.

---

## Da dove nasce questo documento

L'ondata «redesign parete/home» è stata mergiata e pubblicata il 26/07 (merge `5504a20a`, CI e
deploy verdi, `uachelab.com` verificata). Francesco ha poi **installato la PWA da icona** — la prova
che aveva rimandato «a dopo, in produzione» — e ha trovato quattro cose. Sono elencate qui **come le
ha viste lui**, con accanto solo ciò che è stato verificato nel codice, e niente di più.

Screenshot di riferimento: due catture del 26/07 alle 11:52 (home e `/cassette`, PWA installata su
Android), consegnate in chat.

---

## 1. La linguetta «LE CASSETTE» sta stretta — stato `piena`

**Osservato:** «la linguetta cassette non dà il giusto spazio al suo contenuto, la parte inferiore
si chiude troppo sotto alla scritta cassette».

### ⚠️ Correzione: questa osservazione era stata attaccata alla voce di backlog SBAGLIATA

La prima stesura di questo paragrafo appendeva le parole di Francesco alla voce **52** del backlog.
**È un errore, e seguirlo porterebbe a sistemare la cosa sbagliata.** I due argomenti sono diversi:

- **La voce 52 parla del FILO**, cioè della scheggia rossa. Testo suo, verbatim: «La colonna rossa
  **del filo** è a tutta altezza del bottone (96px) contro i ~78px dello schema del mockup». Il
  conto «22+34+22 = 78px» esce da `.lng.slim` del mockup
  (`docs/design/mockups/2026-07-25-linguetta-e-piede-proposte.html:53`, più la barretta da 34px
  della sua `::after`): è **lo schema dello stato filo**, non di quello pieno.
- **Francesco sta guardando la linguetta INTERA, quella con la scritta sopra** — «la scritta
  cassette» sono parole sue. Cioè lo stato **`piena`**, che è un altro schema del mockup e ha altri
  numeri.

### La deviazione vera dello stato `piena`: 18px di respiro ratificati, 0 nel codice

Lo schema ratificato per lo stato pieno è alla riga **51** dello stesso mockup:

```
.lng.big{width:34px;padding:18px 0;gap:8px}
```

**18px di respiro sopra e sotto il contenuto.** Nel codice spedito non ce n'è nessuno:
`src/app/ds-v3.css:1613` dichiara `padding: 0` sul bottone. È esattamente la cosa che Francesco
descrive: «non dà il giusto spazio al suo contenuto, la parte inferiore si chiude troppo sotto alla
scritta». Il valore 34px della larghezza, invece, è stato preso dal mockup ed è giusto
(`ds-v3.css:1617`): del `.lng.big` è stata importata la larghezza e **dimenticata l'imbottitura**.

Il componente è `src/components/features/home/LinguettaCassette.tsx` — **non** sta fra i componenti
del design system in `src/components/ds/`, dove chi legge il nome nudo tende a cercarlo.

### 🛑 Il caveat che va rispettato prima di toccare qualunque cosa

⚠️ **Che nello stato pieno l'altezza sia guidata dal contenuto e non da `min-height` è una LETTURA
DEL CSS, non una misura.** Il ragionamento è: il bottone ha `min-height: 96px` con `padding: 0`, la
card `::before` è ancorata `top: 0; bottom: 0` e quindi vale sempre quanto il bottone; se l'etichetta
verticale «LE CASSETTE» più freccia e retino superano i 96px, il bottone cresce con loro e il respiro
resta zero. **Plausibile, non verificato.** Quanto sia alto davvero quel contenuto sul telefono di
Francesco — con il suo font, la sua densità di pixel, la sua eventuale dimensione di testo di
sistema — **nessuno l'ha misurato**. Va misurato **sul device** prima di scrivere una riga: è la
regola di questo progetto, **«misure, non ipotesi»**, ed è la stessa regola la cui violazione ha
prodotto la conclusione sbagliata del punto 2.

### 🛑 E soprattutto: NON abbassare `min-height` da 96 a 78

È la scorciatoia che il testo sbagliato suggeriva, e farebbe **due danni in un colpo solo**:
1. **assottiglierebbe il filo**, cioè la scheggia rossa, di cui **nessuno si è lamentato** — quei
   96px sono l'altezza della colonna rossa nello stato `is-filo`;
2. **lascerebbe intatta la deviazione vera**, perché il respiro dello stato pieno non dipende da
   `min-height`: dipende dai 18px di `padding` che non ci sono.

### La voce 52 resta aperta, per conto suo

**La 52 non si chiude con questa correzione e non si fonde con essa**: resta una faccenda separata
e ancora aperta sullo stato `is-filo` (colonna rossa a 96px contro i ~78 dello schema), classificata
«cosmetica, da confermare a vista» e **mai confermata a vista** — Francesco ha guardato la linguetta
piena, non il filo. Chi la riprenderà dovrà farsela guardare da lui **in quello stato**, che si
raggiunge solo dopo 3 passaggi riusciti alla parete.

⚠️ Attenzione, per entrambi gli stati: la linguetta ha appena ricevuto due modifiche — una media
query `≥1024px` che la spegne su desktop (metà CSS in `ds-v3.css`, metà portante nel componente, che
a ≥1024px non monta affatto il portale) e il fix del reduced-motion. Qualsiasi ritocco va misurato
in **entrambi** gli stati e verificato che non riapra nessuna delle due.

---

## 2. 🛑 La barra dei gesti — LA CONCLUSIONE PRECEDENTE ERA SBAGLIATA

**Osservato sulla PWA INSTALLATA:** la barra dei gesti non ha sfondo trasparente; nella **home** il
suo colore di sfondo è diverso dal resto dell'app; su **`/cassette`** stesso problema **più una
striscia panna appena sopra**. Da browser (non installata) il fondo sotto la barra è corretto, ma
tutto il resto dei problemi resta.

### ⚠️ Va corretto il verbale, non ereditato

Il verbale del 26/07 e l'handoff dell'ondata dicevano: «**La barra gesture NON è un difetto
dell'app**: in scheda di Chrome quell'area appartiene al browser, `env(safe-area-inset-bottom)`
resta 0 e `viewport-fit: cover` non ha effetto; da PWA installata la pagina prende tutto lo
schermo». La prova sul campo dice il contrario: **installata, il problema c'è lo stesso.** Quella
spiegazione era al massimo una parte della storia, e la parte sbagliata è stata messa a verbale
come chiusa. **Non ripartire da lì.**

### Cosa è già verificato nel codice (26/07, dopo il merge)

Il rosso è dichiarato in **TRE posti, non due**:

- `public/manifest.json` → `"background_color": "#F4F0E7"` ✅ (aggiornato dall'ondata) ma
  **`"theme_color": "#D90012"`** — rosso fisso.
- `src/app/layout.tsx:28` → **`themeColor: '#D90012'`**, un valore solo.
- **`public/offline.html:6` → `<meta name="theme-color" content="#D90012">`** ⚠️ **il terzo, che
  questo elenco non aveva.** È la pagina che il service worker serve quando la rete manca: se si
  correggessero solo i primi due, **la pagina offline resterebbe rossa** e il difetto ricomparirebbe
  proprio nel momento peggiore.
- `src/app/layout.tsx:33` → `viewportFit: 'cover'` ✅ presente.

Quindi: **il colore rosso della barra di sistema è dichiarato in tre punti, e non segue né il fondo
unificato né il tema chiaro/scuro.** Quando l'ondata ha unificato il fondo in quattro posti, il
`theme_color` non è stato toccato in nessuno dei tre — nessuno lo aveva messo in lista.

⚠️ Prima di cambiarli: quel rosso **è stato messo lì di proposito** e a suo tempo era la cosa
giusta. È la voce **A5** del backlog tecnico (`docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`), chiusa
il 20/07/2026 con «`#D90012` in manifest + offline.html» — allora il fondo dell'app non era ancora
unificato. È diventato un difetto **dopo**, quando l'ondata del 26/07 ha unificato lo sfondo. Non è
una svista da correggere in silenzio: è una decisione che va **rifatta**, e la voce A5 è stata
riaperta di conseguenza.

### Cosa NON è ancora stato misurato (da fare per prima cosa)

Nessuno ha ancora misurato **sul device installato**:
- quanto vale davvero `env(safe-area-inset-bottom)` in standalone, per rotta (home vs `/cassette`);
- quale elemento dipinge l'area sotto il contenuto, e se è il `body`, il wrapper di rotta o nulla;
- da dove nasce la **striscia panna** su `/cassette` — se è la stessa classe di difetto della
  striscia panna del piede, chiusa il 25/07 abrogando la coreografia, o una cosa diversa;
- se `theme_color` per-tema è supportato dal browser di Francesco (si dichiara con `<meta>` +
  `media="(prefers-color-scheme: dark)"`, non dal manifest).

### 🛑 METODO IMPOSTO DA FRANCESCO (26/07/2026) — vincolante, non saltabile

> «all'avvio delle operazioni, facciamo una ricerca approfondita su internet e poi ci confrontiamo
> con advisor specializzati prima di provare a risolvere»

Quindi, **in quest'ordine e prima di toccare una riga di codice**:

1. **Ricerca approfondita su internet.** Fonti vere e citate, non ricordi: come si comportano
   davvero `theme_color`, `background_color`, `viewport-fit: cover` e
   `env(safe-area-inset-*)` in una PWA **installata** su Android (WebAPK), quali versioni di
   Chrome/Android cambiano le regole, come si dichiara un `theme_color` diverso per tema chiaro e
   scuro, e quali sono i modi noti in cui compare una striscia di fondo sopra la barra dei gesti.
   Raccogliere anche i difetti noti dei browser: qui la piattaforma conta più del nostro codice.
2. **Diagnosi misurata sul device installato di Francesco** — è l'unico posto dove il difetto esiste.
   Concordare con lui come raccogliere le misure: il telefono è suo.
3. **Panel di advisor specializzati** con prospettive diverse (Regola Advisor, `ua-app/CLAUDE.md`
   §0C), **prima** di ratificare qualunque soluzione.
4. Solo dopo: piano, poi codice.

**Il motivo di questa imposizione è scritto sopra**: la volta scorsa si è ragionato invece di
misurare, e la conclusione «non è un difetto» è finita a verbale come chiusa mentre era falsa.
**Misure e fonti, mai ipotesi.**

---

## 3. Proposta di Francesco: un centro notifiche vero

**Sue parole:** «la striscia delle notifiche deve sempre far capire all'utente cosa vuole indicare».
Ragionamento: il resto dell'app avrà molte altre notifiche da gestire, forse anche una messaggistica
interna — non solo col clinico ma **fra gli operatori del laboratorio** — più notifiche fra utenti
del lab e clinici. Da qui l'idea di **costruire un centro notifiche e un sistema di notifiche vero
della PWA**, dove poi spostare definitivamente la striscia, che a quel punto diventa ridondante.

**Stato: ACCETTATA COME DIREZIONE, ma COLLOCATA IN FONDO ALLA ROADMAP.**

> Decisione di Francesco, 26/07/2026: «per il centro notifiche, ok, ma implementiamolo alla fine
> della roadmap che abbiamo».

Quindi: **non si comincia adesso e non si infila davanti a niente.** Prima si finisce quello che è
già in roadmap; il centro notifiche è l'ultimo lavoro della lista. Quando arriverà il suo turno
richiede il percorso BP-2 pieno e, per dimensione, il **percorso GRANDE** (`ua-app/CLAUDE.md` §0C),
con panel di advisor prima di ratificare l'architettura.

⚠️ Da non dimenticare quando toccherà: **la striscia probabilmente NON diventa ridondante.** Sono
due mestieri diversi — la striscia è «la cosa di adesso, senza cercarla», il centro è «tutto, in
ordine, quando lo vuoi». Il pezzo che oggi manca davvero è il secondo, soprattutto la messaggistica
fra le persone del laboratorio, che non ha nessun posto dove stare. La decisione se togliere la
striscia si prende **dopo** aver visto il centro funzionante, non prima.

Cose da mettere sul tavolo al brainstorming, perché cambiano l'architettura:
- **Oggi la striscia non è una notifica**: è calcolata dal vivo, sul server, dallo stato corrente
  (`src/lib/dashboard/striscia.ts`). Non esiste nessun record di notifica, nessun letto/non letto,
  nessuna storia. Un centro notifiche è un dominio nuovo (tabella, RLS, stato di lettura, consegna),
  non uno spostamento di UI.
- **Due famiglie diverse** che è facile confondere: gli *allarmi derivati dallo stato* (un lavoro in
  ritardo — smette da solo quando il fatto smette) e i *messaggi/eventi* (qualcuno ti ha scritto —
  restano finché non li leggi). Un centro unico deve saper fare entrambe senza mentire.
- **Multi-tenant e ruoli**: le notifiche vivono dentro un laboratorio, e i quattro ruoli vedono cose
  diverse. RLS con `public.current_lab_id()`, mai `auth.`.
- **Clinici = utenti esterni**: il portale del clinico è un'altra superficie con un'altra
  autenticazione. Una messaggistica lab↔clinico è un pezzo a sé.
- **GDPR**: vale già la regola che i template WhatsApp non portano MAI il nome del paziente. Una
  messaggistica va progettata con lo stesso vincolo dal primo giorno.
- **Notifiche push**: se si vuole la notifica anche ad app chiusa servono service worker e permessi
  — è un altro capitolo ancora, da decidere se dentro o fuori perimetro.

**Nel frattempo la striscia resta**, e resta l'unica cosa che avvisa in home.

---

## 4. «Abbiamo lasciato lavori incompiuti?» — la risposta onesta

**No, ma non è un no secco, quindi vale la pena essere precisi.**

Dei 69 rilievi accumulati durante l'ondata: **17 si erano già risolti da soli** lungo il lavoro,
**19 non erano problemi** una volta guardati nel codice, **30 sono stati rimandati con motivazione**
e **3 erano visivi**, chiusi al gate estetico. **Zero bloccanti.**

I 30 rimandati **non sono lavoro lasciato a metà**: sono cose viste, valutate una per una e
giudicate non urgenti, ognuna con scritto **cosa costa rimandarla** e **cosa la renderebbe urgente**.
Vivono in `docs/roadmap/2026-07-26-backlog-ondata-parete-home.md`, che è dentro il repo apposta
perché non sparisse.

⚠️ **Ma è arrivato un lavoro NUOVO, che nel backlog non c'era**: il respiro della linguetta nello
stato **`piena`** (18px ratificati contro 0 spediti) — è il punto 1 di questo documento. ⚠️ **Qui era
scritto che a scadere era la voce 52**: non è così. La 52 riguarda lo stato **`is-filo`**, resta
«cosmetica, da confermare a vista» e **non è ancora stata confermata a vista** — Francesco ha
guardato la linguetta piena, non il filo. Quindi le rimandate restano **30**, la 52 compresa, e il
punto 1 si aggiunge.

Le più concrete fra le altre 29, se si cerca cosa fare dopo:
- **25 + 34 — i suoni possono spegnersi per sempre** e si scaricano anche a suoni spenti: se la rete
  balla al primo caricamento i buffer restano vuoti per tutta la sessione e non suona più niente; e
  oltre 300 KB di file audio partono anche per chi i suoni li ha disattivati. **Vanno fatte insieme.**
- **30 — il paziente «—»**: assegnando un lavoro dalla scheda cassetta la targa mostra un trattino
  invece del codice paziente fino al caricamento successivo.
- **39 + 40 — un numero tagliato a metà lettera** in un chip, senza nemmeno i puntini di sospensione.
- **31 — il riordino sulla home sembra annullarsi** dopo un'altra modifica, pur essendo salvato.

---

## Ordine consigliato per la sessione nuova

1. **Punto 2 — la barra dei gesti.** È l'unico che l'utente vede appena apre l'app, ed è l'unico con
   un verbale da correggere. **Si parte dalla ricerca su internet e dal panel di advisor, per ordine
   esplicito di Francesco** (§ sopra) — non dal codice. Il `theme_color` rosso fisso è già un pezzo
   accertato del problema, ma è un pezzo, non la spiegazione.
2. **Punto 1 — la linguetta stretta, stato `piena`.** Piccolo e circoscritto, ma **si misura prima**
   (l'altezza guidata dal contenuto è una lettura del CSS, non un dato) e va guardato in **entrambi**
   gli stati (`piena` e `is-filo`), verificando che non riapra la media query desktop né il fix del
   reduced-motion, entrambi appena messi. 🛑 **Non abbassare `min-height` da 96 a 78**: sistemerebbe
   ciò di cui nessuno si è lamentato e lascerebbe in piedi la deviazione vera.
3. **Poi il resto della roadmap già esistente** — a partire da nome+cognome del paziente nel wizard,
   che era già in coda con le sei proposte disegnate e in attesa della scelta di Francesco.
4. **Punto 3 — il centro notifiche: ULTIMO.** Per sua decisione esplicita, «alla fine della roadmap
   che abbiamo». Non prima.

---

## Base di lavoro

- **Il codice è su `main`**, già in produzione (`8c482e90`). 🛑 **Si misura su `main`, o su un ramo
  aperto da `main` — MAI nei worktree.** Quelli rimasti su disco
  (`.claude/worktrees/redesign-parete-home` @ `ca913236` e `.claude/worktrees/ondata-a-mini-triage`
  @ `50e6b79d`) sono **indietro** rispetto a `main`: misurare lì vuol dire misurare codice vecchio e
  credere a un numero falso. ⚠️ È l'esatto contrario della regola scritta negli handoff precedenti
  («il checkout PADRE è su `main`: ogni misura va fatta NEL WORKTREE»), che era giusta finché il
  lavoro nuovo stava sul ramo e si è rovesciata col merge. Per lavoro nuovo si apre un ramo nuovo
  da `main` (`superpowers:using-git-worktrees`).
- **Banco di collaudo:** `npx next build && npx next start -p 3020 -H 0.0.0.0`, IP
  `ipconfig getifaddr en0`. ⚠️ Dopo OGNI build **riavvia il server** e lancia
  **`node scripts/guardia-stili-collaudo.mjs`**: senza quel controllo la pagina sembra giusta ma
  ogni misura è falsa. ⚠️ `setsid` non esiste su macOS: usare `nohup … &` e verificare con `curl`.
- **Per i difetti del punto 2 il banco non basta**: si vedono solo da **PWA installata sul device di
  Francesco**. Serve concordare con lui come raccogliere le misure (è lui che ha il telefono).
- ⚠️ `.gitignore` **riga 62** ignora `*.png`: gli screenshot vanno aggiunti con `git add -f` e
  verificati con `git show --stat`. È già ricapitato tre volte.
