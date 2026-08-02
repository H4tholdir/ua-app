# P30 — La pagina per correggere i dati di un dentista: tre strade, una da scegliere

**Per:** Francesco · **Preparato:** notte fra il 2 e il 3 agosto 2026 (**D168**) · **Stato:** 🟡 **in attesa della tua firma**
**Che cos'è questo documento:** l'anteprima che sta *prima* del codice. Sono disegni, non programma —
nessuna riga di React è stata scritta, ed è voluto: **§0B dice che la tua approvazione sta in mezzo.**

**Da guardare:** `docs/design/mockups/2026-08-03-p30-modifica-dentista-{A,B,C}.html` (si aprono nel browser,
si toccano davvero) · **40 scatti** in `docs/design/mockups/screenshots/2026-08-03-p30/`.

---

## 1. Il problema, in due righe

Oggi la scheda di un dentista **non si può correggere da un indirizzo suo**. La modifica esiste solo come
pannello che si apre da un tasto dentro la scheda: non ha un indirizzo web proprio, quindi **da nessun altro
punto dell'app puoi mandare qualcuno a correggere un dato**.

Si è visto lavorando al contratto sulla privacy: il disegno approvato prevedeva un tasto «Aggiungi il dato»
per il caso «manca la Partita IVA dello studio», e in produzione **sarebbe stato un tasto morto** — si preme
e non succede niente. Non è un difetto nato lì: è una mancanza che quel lavoro ha solo reso visibile.

---

## 2. La domanda vera, che non è «come la disegniamo»

Le istruzioni del progetto dicono due cose che, messe insieme, stringono parecchio:

- **Legge 1 — «Una cosa alla volta».** Ogni schermata ha **un solo scopo**; quando l'app chiede qualcosa,
  chiede **una cosa per schermata**.
- **Regola sui campi da compilare** (§5.27): le caselle in cui si scrive vivono **solo dentro i fogli che
  salgono dal basso e dentro le procedure guidate** — **non** sparse in una pagina.

Un dentista ha **22 dati**. Metterli tutti in fila in una pagina è la cosa che ogni gestionale fa — ed è
esattamente quello che quelle due regole dicono di non fare.

🔑 **Quindi la scelta non è estetica: è dove mettere il confine fra «rispettare la regola di casa» e
«far correggere un dato in fretta a chi ha le mani sporche di gesso».** Le tre varianti sono tre risposte
diverse a questa domanda, e nessuna è sbagliata.

---

## 3. Le tre strade

### 🅰️ Variante A — «Le righe che si toccano»

La pagina mostra i dati **come sono**, in righe: a sinistra il nome del dato, a destra il valore.
Tocchi la riga → sale un **foglio con quel solo dato** e la domanda in chiaro («Qual è il telefono dello
studio?»). Salvi, il foglio scende, la riga è aggiornata.

| | |
|---|---|
| ✅ **Il meglio** | È la variante **più fedele alle regole di casa**: una domanda per volta, davvero. Vedi tutti i dati in un colpo d'occhio **senza toccare niente** — quindi la stessa pagina serve anche solo per *guardare*. Sbagliare è quasi impossibile: hai davanti un campo solo |
| ⚠️ **Il prezzo** | Correggere **cinque** dati vuol dire **cinque** aperture e cinque salvataggi. Se l'addetta al front desk ha sbagliato mezza anagrafica, è lunga |
| 👀 **Guarda** | `A-righe-390-light.png` · `A-righe-390-light-foglio.png` (il foglio aperto) · e gli stessi in scuro |

### 🅱️ Variante B — «I quattro cartoncini»

La pagina mostra **quattro cartoncini**: *Chi è* · *Dove sta* · *Per la fattura* · *Come si lavora insieme*.
Ogni cartoncino porta scritto dentro il suo riassunto. Tocchi un cartoncino → sale un foglio con **i campi di
quel gruppo** (tre o quattro), li sistemi tutti insieme, salvi una volta.

| | |
|---|---|
| ✅ **Il meglio** | **Due tocchi per sistemare un pezzo intero** di anagrafica. Rispetta comunque la regola dei campi (si scrive dentro un foglio). E il cartoncino «Per la fattura» può portarsi addosso l'avvertimento **MANCA UN DATO**, così il difetto si vede da fuori senza aprire niente |
| ⚠️ **Il prezzo** | Un po' meno «una cosa alla volta»: nel foglio ci sono quattro caselle, non una. E per *leggere* un dato preciso devi fidarti del riassunto o aprire il cartoncino |
| 👀 **Guarda** | `B-gruppi-390-light.png` · `B-gruppi-390-light-foglio.png` · e gli stessi in scuro |

### 🅲 Variante C — «La pagina intera»

Tutti i 22 campi in pagina, divisi in quattro sezioni, e in fondo una **barra che resta ferma** e dice cosa
hai cambiato: «*Hai cambiato 2 cose: telefono e Partita IVA*» + il tasto **Salva**.

| | |
|---|---|
| ✅ **Il meglio** | È **la più veloce quando le correzioni sono tante**: scrivi tutto e salvi una volta sola. Ed è la più familiare per chi arriva da un gestionale — assomiglia a quello che già conosce |
| ⚠️ **Il prezzo** | 🛑 **Va contro le due regole di casa** dette sopra: 22 caselle in una pagina non sono «una cosa alla volta». Sul telefono si scorre parecchio. E ricorda un modulo da compilare, che è proprio la sensazione che UÀ vuole togliere |
| 👀 **Guarda** | `C-pagina-390-light-schermo.png` (con la barra al suo posto) · `C-pagina-390-light.png` (tutta la pagina) |

---

## 4. Il mio consiglio, con la ragione

➡️ **La B.** Non perché sia la più bella — perché è **quella che regge il caso vero**.

Il caso vero l'hai descritto tu il 27 luglio: *«se l'addetta al front desk che si occupa di creare i nuovi
lavori fa un errore di digitazione, bisogna sempre poter intervenire»*. Un errore di digitazione al banco
**raramente è uno solo**: chi sbaglia il telefono ha spesso sbagliato anche l'email, perché li ha copiati
insieme dallo stesso foglietto. La **A** costringe a due giri; la **B** li prende insieme.

E il secondo caso vero è quello che ha aperto questa voce: **manca la Partita IVA**. Nella **B** il
cartoncino «Per la fattura» **si vede da fuori che è quello messo male**, senza aprire niente — che è la
Legge 3 («lo stato si legge senza leggere»).

⚠️ **Ma la A ha una cosa che la B non ha, e non è poco:** la pagina della A **si può anche solo guardare**.
È già una scheda leggibile, non solo un posto dove correggere. Se ti dico «guarda che dati abbiamo di
Bianchi», la A risponde subito.

🔑 **E c'è una quarta strada, se la vuoi:** **B per correggere, A come scheda di lettura** — cioè la scheda
del dentista che già esiste mostra i dati come righe, e il tasto «Modifica» porta ai quattro cartoncini.
Costa un po' di più, ma non sceglie.

---

## 5. Che cosa NON è stato deciso, e aspetta te

| # | domanda | perché non l'ho decisa io |
|---|---|---|
| **1** | **Quale variante** (A · B · C · la quarta strada del §4) | è la firma di §0B: nessuna riga di React prima |
| **2** | **Il salvataggio è subito o alla fine?** Nelle A e B ogni foglio salva per conto suo (se chiudi l'app a metà, quello che hai già salvato resta). Nella C si salva tutto in fondo (o tutto o niente) | cambia cosa succede quando la connessione cade al banco — e questa è una scelta tua, non mia |
| **3** | **I campi che oggi NON si possono correggere restano fuori?** Il pannello di adesso ne mostra ~16 dei 22. Fuori restano fra gli altri il **tecnico predefinito**, l'**IBAN**, e tre interruttori (*non soggetto a fattura elettronica*, *fatturare al paziente*, *è un altro laboratorio*) | ⚠️ Il primo di quei tre **si vede già oggi nella scheda** come stato «Non soggetto a fattura elettronica»: è un dato che l'app mostra e non lascia correggere |
| **4** | **La pagina nuova è a indirizzo suo** (`/clienti/[id]/modifica`), **come il lavoro** — confermi? È tutto il senso della voce: serve **poterci mandare qualcuno** da un tasto | è una scelta di struttura, e la registro solo se la dici tu |

---

## 6. Come sono stati fatti, e che cosa NON è stato guardato

**Fatti così:** colori, misure, angoli e ombre sono **copiati dai token v3** (`src/design-system/v3/tokens.ts`),
mai inventati — la casella alta 64, l'etichetta piccola maiuscola sopra, il tasto rosso con la corsa di 5px,
il foglio con l'angolo da 28. In modo scuro le ombre spariscono e le card si distinguono col bordo, come vuole
la spec. I dati sono di uno studio finto ma **completo**: niente «Lorem ipsum», niente caselle vuote.

**Un difetto trovato guardando, e corretto:** nei primi scatti il codice fiscale si spezzava a metà parola
(`BNCMRC70A01F2 / 05X`) nella variante A a 390px. Mancavano venti pixel: etichetta da 104 a 92, spazio da 12
a 10. 🔑 **Un disegno che mostra un dato spezzato fa scegliere su un difetto che non c'è.**

**E un difetto nel MODO di fotografare, che vale la pena raccontare:** i primi scatti a pagina intera
mettevano il foglio e la barra **in mezzo al contenuto**, perché una cosa ancorata al bordo dello schermo, in
una foto lunga, non sa più dov'è il bordo. Quegli scatti *sembravano* buoni. Ora ogni schermata ha **due**
scatti: uno lungo per vedere tutto il contenuto, uno **a schermo** per vedere le cose al loro posto vero.

---

## 7. I contrasti: **misurati**, non dichiarati — e hanno trovato tre cose

Prima li avevo elencati fra le cose non fatte. Poi c'era tempo, e la lezione di ieri è che ciò che si rimanda
sparisce: quindi sono stati **misurati davvero**. **442 testi**, tre varianti × due temi × col foglio aperto e
chiuso, ognuno **contro il colore che ha DAVVERO dietro** (che può nascere da una tinta trasparente sopra una
card sopra il fondo). Referto: `screenshots/2026-08-03-p30/CONTRASTI-misurati.txt`.

### ✅ Esito finale: **442 misurati, 0 sotto soglia**

Ma ci è arrivato dopo aver trovato **tre** cose, e due erano difetti veri:

**① 🔴 Nella variante B, in tema scuro, i quattro cartoncini erano quasi INVISIBILI.** `misurato:` testo
**nero puro** `rgb(0,0,0)` su fondo `rgb(33,29,24)` → **1,25:1**. La ragione è una trappola classica: un
tasto **non eredita** il colore del testo dalla pagina, si tiene quello predefinito del browser — che è nero.
In tema chiaro nero su bianco *sembra* giusto, quindi il difetto **si vedeva solo al buio**.
🔑 **E non l'avevo visto guardando gli scatti**: avevo aperto la A in scuro e la C in chiaro, non la B in
scuro. **La macchina ha visto quello che l'occhio ha saltato** — che è l'esatto contrario della lezione di
ieri, e serve a ricordare che le due cose non si sostituiscono in *nessuna* delle due direzioni. ✅ Corretto.

**② 🟠 Le etichette dentro il foglio, in tema scuro, erano a 4,25:1** (serve 4,5). Non per un colore
sbagliato: `--faint` passa su `--bg` e su `--card`, ma il foglio ha un fondo **più chiaro** (`--elv`), e lì
cade. ✅ Corretto usando `--muted`. ⚠️ **Questo è uno scostamento proposto dalla spec** (§5.27 dice
«etichetta `--faint`»), scritto nel disegno con la sua ragione: approvando la A o la B, approvi anche questa
micro-modifica. 🛑 **E il difetto non è di questi disegni: è del `Campo` v3 dentro un `Sheet` v3, cioè di
codice già scritto.** Riferito in roadmap.

**③ 🎣 Una misura che stava per farmi riferire un difetto INESISTENTE.** La sonda diceva che il tasto rosso
in tema scuro era a **3,52:1** contro il 4,5 richiesto, e sembrava un difetto grosso del design system —
c'era perfino il precedente perfetto: la spec §5.4 racconta lo **stesso** identico caso risolto per il verde
(«stop pinnati in hex, MAI `var(--green)` come faccia»). Sembrava che la stessa correzione non fosse mai
arrivata al rosso.
🛑 **Non era vero.** Il tasto primario **vero** scrive a **21px**, il mio disegno l'aveva scritto a **17**.
Sopra i 18,66px in grassetto la soglia scende da 4,5 a **3**, e 3,52 la supera: **il componente reale è a
posto, era il disegno a essere diverso da lui.** ✅ Allineato a 21px.
🔑 **La lezione, ed è la terza volta in due giorni:** prima di credere a una misura sorprendente si guarda
**che cosa** ha misurato. Un disegno che non usa le misure vere del componente **inventa difetti** — e un
difetto inventato costa quanto uno vero, perché manda a riparare ciò che è già a posto.

---

## 8. 🛑 Che cosa non è stato guardato — dichiarato

- **Nessun lettore di schermo.** Le etichette e i ruoli sono scritti secondo la regola, ma VoiceOver non è
  stato acceso. È lo stesso vuoto del gate di ieri, e resta.
- **Un motore solo.** Gli scatti e le misure vengono da Chromium. La resa dei caratteri su un altro motore
  non è stata vista.
- **Nessuna prova col dito.** Le aree tappabili sono disegnate sopra i 44px richiesti, ma **non sono state
  misurate** una per una come si fa al gate.
- **Nessun dato vero.** Lo studio Bianchi è inventato; nessuna lettura dalla banca dati (era la regola della
  notte).
- **Nessun movimento provato.** I fogli salgono con la molla giusta nel disegno, ma il comportamento con
  «Riduci movimento» acceso non è stato guardato.
