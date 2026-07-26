# GATE ESTETICO L2 (FASE 9b) — ondata «Redesign parete/home»

Data: 26/07/2026 · Worktree `.claude/worktrees/redesign-parete-home` · HEAD `75226cd`
Framework: `docs/design/audit-ui-ux/README.md` (Livello 2) · Checklist: `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`
Perimetro: **solo le superfici dell'ondata** — home nelle sue tre forme (pager a due stanze, solo pile, solo parete), parete `/cassette`, striscia di stato. Assi: 390 · 768 · 1280 × light · dark.

---

## VERDETTO

**PASS — il merge non è bloccato.**

Nessun difetto di questo gate arriva alla soglia «metterebbe in imbarazzo il prodotto davanti a un cliente».
I due difetti che *erano* bloccanti (D1/D2 del collaudo home, «Riduci movimento») risultano **chiusi e verificati
sul bundle vero** — v. §1, che è anche il contributo principale di questo gate.

Restano **6 raccomandazioni**, nessuna bloccante, e **una decisione che spetta a Francesco** (il passo fra le
righe del muro, §4.1). Una sola voce è marcata «da far vedere a Francesco prima del merge» ed è il conteggio
«e altre N» (§4.4): non perché sia sbagliato, ma perché è l'unico elemento che ha approvato a parole senza
averlo mai visto reso.

---

## 1. Provenienza delle misure — e il collaudo che mancava

Il brief avvisava che due fix (reduced-motion `c87497f`, navigazione `a0eb98a`) erano atterrati **dopo** le 124
catture del collaudo FASE 9, e che «cambiano comportamento, non aspetto statico». **Per D2 non è vero**: la
striscia restava congelata 13px più in basso e al 96%, cioè un difetto di *aspetto*, «visibile a occhio nudo»
per ammissione del collaudo stesso. E `fix-reduced-motion-report.md` §7.2 dichiarava apertamente la propria
riserva: *«Il collaudo su build vera resta da fare»* — tutti i numeri «dopo» venivano da una panchina di render
o da un'iniezione, mai dal bundle di `next build`.

**Quell'anello è ora chiuso.** La build servita su `:3020` è *successiva* al commit di testa:

```
HEAD 75226cd            2026-07-26 09:40:43
.next/BUILD_ID          2026-07-26 09:44
find src -newer .next/BUILD_ID   → (vuoto)
node scripts/guardia-stili-collaudo.mjs → ✅ stili applicati davvero
```

Nessun file di `src/` è più recente della build, e la guardia stili è verde: **il bundle servito contiene
entrambi i fix**, e ogni misura di questo documento è presa su di esso.

### D1 e D2 — misura a riposo (3s), build vera

| tema / preferenza | striscia `top` | striscia `transform` | linguetta `left` | fuori schermo |
|---|---|---|---|---|
| light / `reduce` | **131.63** | **none** | **346** | −44 (dentro) |
| light / `no-preference` | 131.63 | none | 346 | −44 (dentro) |
| dark / `reduce` | **131.63** | **none** | **346** | −44 (dentro) |
| dark / `no-preference` | 131.63 | none | 346 | −44 (dentro) |

Confronto col difetto documentato: striscia `144.55` con `matrix(0.96,…,11.90)`, linguetta `393.99` cioè
**interamente fuori dal bordo destro di 48px**. Ora i quattro casi sono **identici a riposo**: la preferenza
cambia la transizione, mai il bersaglio — esattamente la legge che il fix dichiarava di voler scrivere.
Catture: `gate-l2/390-{light,dark}-riposo3s-reduced-{attivo,controllo}.png`.

> Vale la pena dirlo esplicitamente perché è la sola cosa che avrebbe potuto bloccare il merge:
> **la parete resta raggiungibile con «Riduci movimento» acceso**, in entrambi i temi.

---

## 2. Esito per sezione della checklist

Legenda: ✅ conforme · ⚠️ da migliorare (Minor) · ❌ difetto · N/A.
Dove il verdetto non cambia fra viewport/temi è scritto una volta sola; dove cambia, è spezzato.

| # | Sezione | 390 L/D | 768 L/D | 1280 L/D | Note |
|---|---|---|---|---|---|
| 1 | Layout & allineamento | ⚠️ / ⚠️ | ✅ / ✅ | ✅ / ✅ | ⚠️ = R3 (linguetta sborda 10px sulla colonna pile, solo 390, solo fase piena) |
| 2 | Proporzioni & spazio | ✅ / ✅ | ⚠️ / ⚠️ | ⚠️ / ⚠️ | ⚠️ = **R1** passo fra le righe del muro (§4.1) |
| 3 | Sovrapposizioni & z-index | ✅ | ✅ | ✅ | nessun overlap indesiderato; gancetti e ombre non tagliati (chiuso dai due collaudi, riverificato a vista) |
| 4 | Tipografia & gerarchia | ⚠️ / ⚠️ | ✅ / ✅ | ✅ / ✅ | ⚠️ = **R2** (inversione di gerarchia nella striscia, §4.4) + **R4** (etichetta «Nuova cassetta») |
| 5 | Colore, contrasto, tema | ✅ / ⚠️ | ✅ / ⚠️ | ✅ / ⚠️ | ⚠️ dark = **R5** gancetti sotto la soglia di contrasto non-testuale |
| 6 | Motion & micro-interazioni | ✅ | ✅ | ✅ | D1/D2 chiusi (§1); verdetto su `MotionConfig` globale in §5 |
| 7 | Suono & haptic | ✅ | ✅ | ✅ | verifica di codice, non d'ascolto — v. §6 |
| 8 | Touch target | ✅ | ✅ | N/A mobile | tutti ≥44px nei due collaudi; nessun controllo nuovo dopo quelle misure |
| 9 | Stati (empty/loading/error/disabled) | ✅ | ✅ | ✅ | incl. zero-risultati, riga bloccante «Butta via», sheet occupata/libera |
| 10 | Responsive (3 viewport) | ✅ | ⚠️ | ✅ | ⚠️ = terzo valore di `--track` mai documentato nella stanza parete della home (§4.1) |
| 11 | Accessibilità | ✅ | ✅ | ✅ | anello `:focus-visible` presente su **tutti** i controlli nuovi — v. §3 |
| 12 | Copy & microcopy | ✅ | ✅ | ✅ | ⚠️ minore tipografico (R6) |

**Nessun ❌.** Le 6 voci ⚠️ sono raccolte in §5 con priorità e destinazione.

---

## 3. Verifiche che questo gate ha aggiunto ai due collaudi

Cose che i collaudi funzionali non avevano misurato e che qui sono state chiuse.

**§11 — anello di fuoco sui controlli nuovi dell'ondata** (tab-through su `/cassette`, light e dark):
tutti i comandi restituiscono `outline: solid 2px rgb(91,155,255)` — le sei cassette, il tile «+ Nuova
cassetta», «‹ Indietro», «☰ Tutto il resto». Il campo di ricerca è l'unica eccezione apparente: l'anello vive
sul contenitore (`.ds-parete-cerca:focus-within`), non sull'`input`, ed è visibile nelle catture. Il gap noto
di sistema («bottoni inline-styled v3 senza ring») **non tocca questa ondata**.

**§5 — contrasto dei testi della striscia** (calcolo su colori risolti; card dark composita `rgb(55,25,24)`):

| elemento | light | dark | soglia |
|---|---|---|---|
| soggetto (bold, `--ink`) | 15.35 | 13.81 | AA 4.5 ✅ |
| «e un'altra» (`--muted`) | **5.09** | **5.85** | AA 4.5 ✅ |
| CTA «Conferma ›» | 4.65 | 4.53 | AA 4.5 ✅ (di misura) |

Tutti passano. La gerarchia *cromatica* è quindi corretta e intenzionale — il problema di §4.4 è di **spazio**,
non di colore.

**§7 — suono e haptic.** L'ondata introduce **un solo suono nuovo** (`suona('tap')` + `vibra('light')` alla
creazione riuscita di una cassetta, `NuovaCassettaSheet.tsx:87-88`), più due sole vibrazioni senza suono
(`PareteClient.tsx:443` sul drag, `StrisciaStato.tsx:152` al tap sulla striscia — con un commento che dichiara
la regola: *«MAI `suona()`, il suono è riservato ai tasti fisici»*). Tutto da `@/design-system/v3/{sound,haptic}`,
nessun autoplay, nessun suono su azioni ripetute. ✅ **Limite dichiarato:** verifica di sorgente, non d'ascolto;
il timbro e il volume non sono giudicabili in questo banco.

**§12 — copy.** Italiano corretto, nessun placeholder, registro conversazionale coerente col dizionario v3
(«Butta via» mai «Elimina», «Metti un lavoro», «Sì, esce», «Prima falla uscire», «Niente per “…” — prova con
meno lettere», «posto 1 di 6», «← Le altre azioni»). Singolare/plurale corretti su «1 cassetta trovata / 6
cassette trovate». Un solo rilievo tipografico: R6.

---

## 4. Le quattro domande instradate a questo gate

### 4.1 Il passo fra le righe del muro — **è un residuo, non l'intenzione. Decide Francesco.**

**Cosa c'è oggi** (misurato sulla build vera, non dedotto dal CSS — e i numeri smentiscono sia il brief sia
un rigo del collaudo parete):

| superficie | viewport | `--passo-maglia` risolto | `--track` | spazio fra le file | di cui riservato al gancio | **maglia vuota** | gap colonne |
|---|---|---|---|---|---|---|---|
| `/cassette` | 390 | 40px | 200px | 62px | 20px | **42px** | 16px |
| `/cassette` | 768 | 50px | 250px | 112px | 20px | **92px** | 24.48px |
| `/cassette` | 1280 | 50px | 250px | 112px | 20px | **92px** | 26px |
| **home / stanza parete** | **768** | **44.88px** | **224.4px** | **86.39px** | 20px | **66px** | 16px |

> Due correzioni al materiale in ingresso, entrambe verificate: (a) il brief dice «righe 220-250px» — sul
> telefono sono **200px** (passo 40, confermato anche misurando a occhio il passo della maglia nelle catture);
> (b) `qa-fase9-cassette-report.md` §1 scrive «`--passo-maglia` 44px a 390», che è **incompatibile** con il
> `track: 200px` misurato nella stessa tabella (5 × 44 = 220). Il valore giusto è 40. (c) **La stanza parete
> della home a 768 ha un terzo valore — `track 224.4px` — che non compare in nessuno dei due collaudi.**

**La giustificazione scritta nel CSS non è più valida.** `ds-v3.css:1058-1067` difende il moltiplicatore 5×
così: la vera altezza massima del tile, misurata in browser, è **158px**; a `track = 4·passo` (160px lì)
restavano 2px prima della zona del gancio, quindi il tile «ci entrava dentro per 18px». Ma quel numero descrive
un tile che **cresceva col contenuto**. Il fix H2 di questa stessa ondata (`8b013ac`, «la cassetta allunga la
pancia in fondo») ha fissato la sagoma: `--altezza-cassetta` = `calc(78px + 60px)` = **138px**, dichiarata con
`height` **e** `min-height`, e il collaudo parete l'ha verificata identica su tutte e sei le cassette a ogni
viewport (`altezzeUniche: [138]`). **Il vincolo che il commento documenta non esiste più.** Il commento va
corretto in ogni caso: oggi racconta una geometria che l'ondata ha superato.

**Come si legge, a occhio.** Ho costruito il muro pieno che nessuna cattura mostrava — clonando le celle nel
DOM vivo, nessuna scrittura, nessuna modifica al sorgente — a 5× (oggi) e a 4×:

| cattura | viewport | cassette | file | `track` | spazio fra le file | **altezza del muro** |
|---|---|---|---|---|---|---|
| `1280-light-muro-pieno-A-track5x-OGGI.png` | 1280 | 24 | 4 | 250px | 112px | **1342px** |
| `1280-light-muro-pieno-B-track4x-PROPOSTA.png` | 1280 | 24 | 4 | 200px | 62px | **1092px** |
| `390-light-muro-pieno-A-track5x-OGGI.png` | 390 | 18 | 6 | 200px | 62px | 1480px |
| `390-light-muro-pieno-B-track4x-PROPOSTA.png` | 390 | 18 | 6 | 160px | **22px** | 1200px |

A 1280, con 5×, **il muro smette di leggersi come un muro**: le file diventano quattro strisce separate da un
canale di maglia vuota alto quasi quanto una cassetta (92px contro 138px), e la catena visiva gancio→fila→gancio
si spezza. Il rapporto fra passo verticale e passo orizzontale è **4.3×** (112 contro 26). A 4× le cassette
tornano a essere un *campo* appeso a una rete, con la maglia che si vede fra le file senza separarle — ed è
**esattamente il ritmo che il telefono ha già oggi** (62px).

**Perché non si può applicare ovunque** — ed è la ragione per cui la raccomandazione è vincolata al breakpoint:
a 390 il passo è 40, quindi 4× darebbe `track 160px`, cioè **22px** fra le file e **2px soli** liberi oltre la
zona del gancio. La cattura `390-…-B-track4x-PROPOSTA.png` lo mostra: i gancetti della fila sotto sfiorano il
fondo della cassetta sopra e la sensazione di «appeso» sparisce. È il difetto originale che il 5× era andato a
correggere: su telefono il 5× **è giusto e va lasciato**.

**Raccomandazione (P1, ma è una decisione di Francesco).** Portare il moltiplicatore a **4× solo dove il passo
ha già raggiunto il suo tetto di 50px** — cioè da `@container (min-width: 660px)` in su, la soglia che il foglio
usa già per le colonne. Effetti:
- spazio fra le file **62px su ogni viewport e su entrambe le superfici** — un solo ritmo, oggi ce ne sono tre;
- congruenza gancio↔filo **intatta**: 4 è ancora un multiplo intero del passo, che è tutto ciò da cui quella
  garanzia dipende (lo dice il commento stesso, riga 1071-1076);
- margine oltre la zona del gancio **42px**, ben sopra i 20 riservati — nessuna delle condizioni che avevano
  motivato il 5× si ripresenta;
- **250px risparmiati** su un muro da 24 cassette a 1280 (il 19% dell'altezza), 50px per ogni fila. Su una
  parete davvero piena a 768 (4 colonne, 40 cassette = 10 file) sono **450px**, cioè quasi mezzo schermo.

Il brief chiedeva di quantificare il costo: **non è «una schermata intera» sui muri di oggi** — è ~1/4 di
schermata a 1280 con 24 cassette, e diventa mezza schermata solo oltre le ~40 cassette. Detto onestamente,
il costo vero qui è di *aspetto*, non di scorrimento.

⚠️ **Prima di eseguire, decidere anche la stanza parete della home**: sta dentro `.ds-parete-shell` (verificato:
`dentroShell: true` su tutte e tre le viewport), quindi una regola scritta sul container **la muoverebbe con sé**.
A 768 il suo container è più stretto, il passo si ferma a 44.88 e la soglia 660 non scatta: resterebbe a 5×,
cioè a un ritmo diverso da `/cassette` alla stessa larghezza di finestra. Va detto a Francesco, non scoperto dopo.

### 4.2 L'anello blu durante la ricerca — **tolto bene, non manca nulla**

Il caso che decide non è «un match» (con una sola cassetta su un muro vuoto nessun anello serve: non puoi
perderla) ma **«tutte le cassette corrispondono»**, dove l'unica cosa che cambia è il tile «+» che sparisce.
Misurato e catturato in entrambi i temi (`gate-l2/390-{light,dark}-ricerca-molti-match-senza-anello.png`):
6 cassette in pagina, riga `6 cassette trovate`, `aria-current` = 0, `is-accesa` = 0.

**Il segnale «trovato» arriva comunque, per tre vie indipendenti e nessuna è il colore:** la riga di conteggio
lo dice *in parole* (ed è insieme testo visibile e annuncio per chi ascolta); il tile tratteggiato sparisce, il
che cambia visibilmente la forma del muro; e l'anello blu ora sta dove l'utente sta effettivamente guardando —
**sul campo in cui sta digitando** (`.ds-parete-cerca:focus-within`, `outline: 2px solid var(--blue)`, ben
visibile nelle catture).

Un anello su tutte e sei non avrebbe distinto niente: avrebbe detto «queste sono correnti» di ogni voce, cioè
niente. La rimozione è un **guadagno**, non una perdita, e vale sia per chi guarda sia per chi ascolta. ✅
Nessuna azione.

### 4.3 Lo sforo della linguetta — **si legge come voluto. Minore.**

A 390 la card della linguetta piena entra di **10px** oltre il bordo **destro** della colonna delle pile
(356 contro 366). Guardando `390-light-due-stanze-linguetta-piena.png`: la linguetta legge come **una linguetta
attaccata al bordo dello schermo**, che è esattamente ciò che è — ancorata a `right: 0`, mezza fuori dal
viewport per invito. Non c'è collisione: in verticale la sua banda (620.91→760) e l'ultima pila (fino a 567.72)
**non si incontrano**, e nella fascia condivisa col piede l'unico elemento dipinto (il tasto «+», 140→250) è a
106px. In fase filo lo sforo è 0; a 768 la distanza è 134px; a 1280 il nodo non esiste.

**Non è una svista** — è la lettura corretta di un elemento ancorato al bordo, e nessuna delle due bande
verticali si tocca. Resta però vero, e va tenuto, il rilievo di durabilità del collaudo home (D3): colonna e
linguetta sono ancorate a due riferimenti diversi (la colonna al centro con `max-width: 480px`, la linguetta a
`right: 0`) e **i 10px non sono presidiati da nulla** — una pila più alta o un piede più basso farebbero
incontrare le bande senza che alcun test se ne accorga. → backlog come voce di durabilità, non come difetto
estetico (R3).

### 4.4 Il conteggio «e altre N» — **l'aspetto è giusto; l'ordine delle priorità no** ⚠️ **DA FAR VEDERE A FRANCESCO**

**Come si presenta** (misurato sul nodo reso, non sul mockup):

| nodo | corpo | peso | colore | contrasto L/D | si restringe? |
|---|---|---|---|---|---|
| glifo `!` | 13px | 800 | rosso | — | no |
| soggetto («n.2026/0004 …») | 14.5px | **700** | `--ink` | 15.35 / 13.81 | **sì** (`flex: 1 1 auto`) |
| **«e un'altra»** | 14.5px | **500** | `--muted` | **5.09 / 5.85** | **no** (`flex: none`) |
| CTA «Conferma ›» | 14.5px | 800 | rosso | 4.65 / 4.53 | no |

**Sul «come appare», la risposta è buona.** Stesso corpo del soggetto ma peso 500 contro 700 e colore muted
contro ink: legge come un inciso sottovoce, non compete con l'allarme, e l'occhio fa correttamente
`!` → numero in nero → CTA in rosso, incontrando il conteggio come una nota di passaggio. I 12px che lo
separano dalla CTA sono giusti — non si appiccica al tasto. In dark il rapporto fra i tre pesi è conservato.
**Non è brutto e non è fuori posto.**

**Ma c'è un'inversione di gerarchia che il collaudo non poteva vedere**, perché ha misurato se il *conteggio*
si tronca (no, mai — corretto) e non se il *soggetto* resta riconoscibile. Sul dato reale di questo laboratorio
il messaggio è **«n.2026/0004 aspetta conferma da ieri»**: larghezza naturale **267px**, spazio concesso
**104px**. Ne resta visibile circa il **39%** — in pratica il solo numero, e nella cattura committata
`390-light-striscia-allarme-altri-reale.png` **nemmeno quello per intero**: si legge `n.2026/000…`, che non
distingue il lavoro 0001 dal 0009.

Nel frattempo «e un'altra» si tiene **62px garantiti** — il 60% di quanto ottiene l'intero messaggio, il 18%
della card — perché è l'unico nodo dichiarato `flex: none`.

Il commento a `StrisciaStato.tsx:216-218` spiega la scelta, ed è ragionata: dentro il testo troncabile il
conteggio *«sarebbe la prima cosa a sparire, perdendo esattamente l'informazione che giustifica la sua
esistenza»*. Vero. Ma la decisione è stata presa come un aut-aut — «dentro e muore per primo» oppure «fuori e
non muore mai» — e c'è una terza via che nessuno ha considerato: **fuori, ma primo a cedere quando lo spazio
finisce**.

**Raccomandazione (P1, solo layout, nessuna parola cambiata):** dare al nodo del conteggio `flex: 0 1 auto` con
`min-width: 0` (o nasconderlo sotto una soglia di larghezza). Nel caso comune resta intero e identico a oggi;
quando il messaggio non ci sta, cede lui per primo e il soggetto guadagna **62 + 12 = 74px** — abbastanza per
arrivare a «n.2026/0004 aspetta co…», cioè per capire *che cosa* aspetta quel lavoro.

> Una seconda strada — accorciare in «+1» / «+8», che libererebbe ~40px — **la sconsiglio**: cambia parole che
> Francesco ha già approvato e rompe il registro conversazionale del dizionario v3. Se si vuole, è una decisione
> di copy, separata da quella di layout.

**Perché serve il suo occhio:** è l'unico elemento dell'ondata approvato a parole e mai visto reso. Le catture
da guardare sono `390-{light,dark}-striscia-allarme-altri-reale.png` (dato vero, con il troncamento in atto) e
`390-{light,dark}-striscia-altri-peggiore.png`.

---

## 5. Raccomandazioni — priorità e destinazione

Nessuna blocca il merge.

| # | Rilievo | Sez. | Dove | Priorità | Destinazione |
|---|---|---|---|---|---|
| **R1** | Passo fra le file del muro: 5× è un residuo, la sua giustificazione nel CSS non è più valida (tile ora fisso a 138px). Proposta: 4× da `@container 660px` in su → 62px ovunque, −250px su 24 cassette a 1280. **In ogni caso il commento `ds-v3.css:1058-1067` va corretto: descrive una geometria superata.** | 2, 10 | `src/app/ds-v3.css:1058-1077`, `:1277` | **P1 — decisione di Francesco** | §4.1 + backlog ondata |
| **R2** | Striscia: il conteggio `flex: none` è protetto, il messaggio (`flex: 1 1 auto`) si tronca al 39%. Invertire la priorità di restringimento. | 4 | `src/components/ds/StrisciaStato.tsx:220` | **P1** | §4.4 — **mostrare a Francesco** |
| **R3** | Linguetta: i 10px di sforo sulla colonna pile a 390 non sono presidiati da nulla (due ancoraggi diversi). Non è un difetto estetico, è durabilità. | 1 | `LinguettaCassette.tsx` / `.ua-home` | P3 | backlog (voce di durabilità; conferma D3 del collaudo home) |
| **R4** | «Nuova cassetta»: a 390 l'etichetta è larga **90.81px** dentro un tile da **95.33px** con bordo tratteggiato 2.5px — il testo arriva *sopra* i trattini. Non è clippato (`scrollWidth = clientWidth = 91`, sforo 0), è stretto. A 768/1280 il tile è 140-150px e il problema non esiste. | 4 | `ds-v3.css:1296-1299` (`.ds-tray-nuova`) | P2 | backlog ondata |
| **R5** | Gancetti in dark: nessuno stop del gradiente arriva alla soglia di contrasto non-testuale. Light `lo` **3.33:1** (passa), dark il migliore (`hi`) **1.91:1**, il peggiore 1.13:1. Il dark *è* stato considerato (esiste l'override `--gan-metal-*`), ma è stato portato troppo giù: il gesto «appeso al muro» — l'idea su cui poggia tutto il redesign — in dark non si legge. | 5 | `ds-v3.css:488-492` | P2 | backlog ondata |
| **R6** | Tipografia: apostrofo dritto (`un'altra`, `c'è`) accanto a virgolette curve (`“…”`, `PareteClient.tsx:429`). Incoerenza tipografica, non un errore d'italiano. | 12 | trasversale | P3 | backlog ondata |

### Verdetto richiesto dal fix reduced-motion (§7.1): `MotionConfig reducedMotion="user"` resta **globale**

Il rapporto del fix chiedeva esplicitamente a questo gate se l'involucro vada ristretto a un sottoalbero.
**Va lasciato dov'è, alla radice.** È lo strato che chiude la finestra dell'idratazione — la sola in cui nessuno
stato di React può conoscere la preferenza — e restringerlo la riaprirebbe per tutto ciò che sta fuori dal
sottoalbero, cioè si tornerebbe al difetto appena chiuso. A preferenza spenta non fa nulla (verificato frame per
frame nel rapporto, e riconfermato qui: le due colonne `no-preference` di §1 sono identiche a prima). L'effetto
collaterale dichiarato — le animazioni di layout (`layoutId`, morph pila→lista) che saltano invece di morphare
sotto reduced-motion — **è ciò che la legge §8.4 chiede**, non un danno. Accettato consapevolmente.

---

## 6. Che cosa questo gate NON ha coperto

1. **Timbro e volume dei suoni** — verificati per provenienza e punto di chiamata (§3), mai ascoltati.
2. **Il racconto reale e il suo dedup** — restano non raggiunti con i dati di questo laboratorio (servono
   `cassette_lavori.liberato_per='consegna'` nelle ultime 24h). Non ho scritto sul DB. Eredità dichiarata del
   collaudo home §7.1, non riaperta qui.
3. **Gesto del dito vero / `touch-action`** — instradato al collaudo su device, invariato.
4. **1280 per la home mobile** — spenta per progetto (`HomeDesktop`), registrata N/A e mai come PASS. Verificato
   di nuovo qui: la sonda sulla stanza parete a 1280 restituisce rettangoli a zero, ed è per questo che quella
   riga della tabella §4.1 è vuota invece di dire «0».
5. **Il resto dell'app** — fuori perimetro per definizione del Livello 2. L'unica eccezione consapevole è il
   verdetto su `MotionConfig`, che il fix aveva instradato qui e che tocca anche superfici v2.3.

---

## 7. Evidenze prodotte da questo gate

In `docs/design/screenshots/2026-07-26-redesign-parete-home/gate-l2/`:

| file | a che serve |
|---|---|
| `390-{light,dark}-riposo3s-reduced-attivo.png` | D1/D2 chiusi sulla build vera — striscia a filo, linguetta in campo |
| `390-{light,dark}-riposo3s-reduced-controllo.png` | controllo positivo (preferenza spenta): identici ai precedenti |
| `1280-light-muro-pieno-A-track5x-OGGI.png` | il muro pieno com'è oggi — le file si staccano |
| `1280-light-muro-pieno-B-track4x-PROPOSTA.png` | lo stesso muro a 4× — il ritmo del telefono, 250px più corto |
| `390-light-muro-pieno-A-track5x-OGGI.png` | il telefono oggi: il 5× qui è giusto |
| `390-light-muro-pieno-B-track4x-PROPOSTA.png` | **contro-prova**: a 390 il 4× schiaccia i gancetti — per questo la proposta è vincolata al breakpoint |
| `390-{light,dark}-ricerca-molti-match-senza-anello.png` | il caso che decide sull'anello blu: 6 su 6, nessun anello, il segnale arriva lo stesso |

I muri pieni sono ottenuti **clonando celle nel DOM vivo** della pagina reale, dopo guardia stili verde:
nessuna scrittura su database, nessuna modifica al sorgente. Le due varianti differiscono per la sola
`--track` impostata sull'elemento.

Banchi di misura (gitignorati, usa e getta): `scripts/tmp/gate-l2-misure{,2}.mjs` → `.json` omonimi.

---

## 8. Raccomandazione per il merge

**Procedere.** I due difetti bloccanti dell'ondata sono chiusi *e ora verificati sul bundle vero*, il che chiude
anche la riserva che il rapporto del fix aveva lasciato aperta.

Prima di premere il tasto, due cose che costano poco e che vale la pena fare guardare a Francesco:
1. **R2 / §4.4** — il conteggio «e altre N» reso, che ha approvato a parole senza mai vederlo;
2. **R1 / §4.1** — le due catture del muro pieno a 1280, per decidere se il passo fra le file è quello che
   voleva. Se dice «sta bene così», resta comunque da correggere il commento nel CSS, che oggi difende quella
   scelta con un numero che l'ondata ha reso falso.

Tutto il resto (R3-R6) è backlog.
