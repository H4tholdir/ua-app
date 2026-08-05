# Handoff — La sessione ③ è IN PRODUZIONE, e il check post-deploy ha aperto un cantiere

**Per:** Francesco, e per la sessione che eseguirà il piano del caricamento diretto.
**Quando:** 5 agosto 2026, mattina (`provato:` `date` → `2026-08-05 10:24 CEST`).
**Stato:** ramo **`fix-limite-caricamento`** · **8 commit non ancora su `main`** · `main` **pubblicato
e allineato a `origin/main`** (0 commit in attesa).
📌 MISURATO IN CHIUSURA (`provato:` `npm run verify:full`): tsc 0 · eslint 0 · vitest **4868 passate
| 19 saltate** (411 file | 3 saltati) · build ok · **sei guardie verdi** · verifica «full» registrata.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E VA FATTO

### ① Il piano del caricamento diretto è SCRITTO ma NON ESEGUITO — zero dei sette compiti
Piano: **`docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md`** (T1-T7, coi registri).
Nessun compito è iniziato. Il ramo contiene **solo** il modulo del limite (D236 compresa), non la
soluzione.

### ② 🛑 DUE DIFETTI VIVI IN PRODUZIONE, trovati dalla ricerca e NON ancora corretti
Sono nel codice **pubblicato** stamattina, non nel ramo. `provato:` col grep, non ricordati:

**(a) Comprimiamo in WebP, che per specifica NON PUÒ avere il colore pieno.**
`provato:` `grep image/webp src/components/features/lavori/form/TabImmagini.tsx` → **riga 29**.
WebP con perdita è **obbligato** al colore dimezzato (RFC 6386 · FAQ Google · MDN): non è
un'impostazione, è nel codec. E il colore dimezzato è **proprio ciò che danneggia di più il tratto
colorato** — misurato: blu a qualità 75 col colore **pieno** è **3,4× più leggero E più fedele** del
blu a qualità 95 col colore dimezzato. Le prescrizioni si scrivono a penna blu.
🛑 **E su Safari/iPhone quella conversione NON AVVIENE:** il browser non ha mai saputo scrivere WebP
dal canvas e **non dà errore** — restituisce un PNG. La libreria non controlla mai cosa ha ricevuto
(verificato nel suo codice), e per rientrare nel tetto di 0,4 MB **taglia la risoluzione**, che è
l'unica cosa che non abbiamo da regalare. ⚠️ **Non provato su un iPhone vero** — è la prova che manca.

**(b) `TabImmagini` non ha ALCUN controllo di peso, e accetta i PDF senza comprimerli.**
`provato:` `grep -c troppoGrande …/TabImmagini.tsx` → **0**. È il **terzo** percorso di caricamento,
e il modulo del limite dichiara di coprirne due. Un modulo scansionato da 6 MB dalla scheda prende
oggi il 413 grezzo della piattaforma, la risposta non è JSON, e l'utente legge «**Upload fallito: 413**».

### ③ 🟡 HEIC: le due liste NON combaciano — e ora la strada è decisa, non fatta
`provato:` la rotta ammette `image/heic` (`immagini/route.ts:19`); il bucket **no**
(`allowed_mime_types` senza heic, contato: **0**). Un HEIC supera il nostro controllo e viene
rifiutato dopo, dal magazzino, con una frase generica. **È il formato predefinito della fotocamera
iPhone.**
➡️ **Con D237 la strada coerente è ACCETTARE HEIC nel bucket**, non convertirlo: la conversione via
browser è esattamente il percorso che quella decisione esclude. ⚠️ **La prova su un iPhone vero viene
prima del rimedio** (riga 16 di roadmap).

### ④ Il fix del limite NON è pubblicato, e per scelta
`provato:` `git log --oneline main --grep=limite` → il commit **non è su main**. D235: il cerotto non
si pubblica da solo, va in produzione **con** la soluzione.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| **Gate estetico L2** (D226-D234) | ✅ 18 ❌ trovati, **13 chiusi**, 5 deferiti col motivo. Il maggiore era **una riga**: il «Fatto!» senza la colonna del wizard (7 ❌ da lì, divergenza da D224). Il primo l'ha trovato **Francesco** su uno scatto: il messaggio d'errore troncato |
| Revisione del **delta** del gate | ✅ DS **APPROVED** · correttezza **NEEDS FIXES** — e aveva ragione: il compattamento aveva lasciato **1px** d'aria fra due bersagli da 44px. Corretto a 20 (7px, più di prima) |
| **Merge e pubblicazione** della ③ | ✅ fast-forward `636f9b61..701a433e` (39 commit) + `132d39e2` · **CI verde** · **CD «Deploy to Vercel» success** · sito 200 |
| **Check M3-T39-6** (post-deploy) | 🔴 **doveva confermare una frase, ha trovato un difetto vivo**: la piattaforma taglia fra **4,10 MB (401)** e **4,30 MB (413)**, il codice diceva **20 MB** |
| **D236** — via la colonna `url` | ✅ FATTA: migration applicata, tipi rigenerati. 5 righe su 5 avevano una URL «pubblica» su un bucket privato |
| **Ricerca compressione** (D237) | ✅ tre filoni, fonti primarie, misure eseguite → `docs/roadmap/2026-08-05-ricerca-compressione-senza-perdita.md` |
| **Piano del caricamento diretto** | ✅ scritto coi registri (T1-T7) — **non eseguito** |

## 2. 🔑 Le lezioni

1. **Un check che «conferma una frase» va fatto lo stesso.** M3-T39-6 sembrava una formalità post-deploy
   e ha trovato un difetto che rendeva inservibile una funzione appena pubblicata. Il check debole è
   quello che nessuno fa perché sa già la risposta.
2. **Due posti che si accordano possono mentire insieme.** Il limite diceva 20 MB nel controllo e
   «20 MB» nella frase: **d'accordo fra loro, falsi entrambi**. È il motivo per cui ora il numero e la
   sua ragione vivono in un file solo.
3. **`tsc` non protegge dove il client non è tipizzato.** È rimasto **verde** mentre la rotta scriveva
   in una colonna appena cancellata: `getServiceClient()` non porta il generic. Lì la rete è il test
   sulle chiavi del payload — ed è la ragione per cui esiste (R27).
4. **Una prova che non gira non è verde, è assente.** La sonda della migration aveva un difetto mio:
   senza `SAVEPOINT` il primo errore abortiva la transazione e la seconda prova non veniva eseguita
   affatto — e sembrava tutto a posto.
5. **Il compattamento ha rotto la regola scritta tre righe sopra.** `LinkQuieto` ha un margine
   negativo di 13px che risale dentro il `marginTop`: ridurlo a 14 lasciava **1px**. La stessa
   aritmetica era già spiegata in un commento, per i due link fra loro. **Un vincolo protetto solo da
   un commento si rompe dal lato che il commento non nomina.**
6. **«Voce» in questo progetto significa due cose** (indice di MEMORY / righe di roadmap) e la guardia
   me l'ha fatto notare fermando un commit. Due numerazioni con lo stesso nome confondono anche chi legge.

## 3. Che cosa resta aperto (in ordine)

1. 🔴 **Il percorso della DdC col prescrittore VUOTO** (dal panel di D232, unanime, indipendente da
   tutto il resto): `TabDati.tsx:283` scrive `richiedente_nome: ''`, `precheck.ts:22-25` passa lo
   stesso, `generate-ddc.ts:146` usa `??` — che su stringa vuota **non ripiega**. **Una Dichiarazione
   può uscire senza il nome del prescrittore, col controllo verde.** 0 occorrenze oggi, percorso aperto.
2. 🔴 **I due difetti vivi della §0②** (WebP + `TabImmagini` senza controllo peso).
3. 🔴 **Il piano del caricamento diretto**, T1-T7 — con dentro il rischio nominato: se la conferma
   accettasse un percorso dal client, sarebbe **lettura arbitraria fra laboratori** (chi firma per la
   scheda usa il client di servizio e non chiede a chi appartiene il file).
4. 🟡 **Le foto dei lavori fuori dal recinto**: le policy vogliono il laboratorio come prima cartella;
   `lavori/…` non lo è, e su quel percorso la policy **va in ERRORE** (22P02), non nega.
5. 🟡 **Righe di roadmap 13-16**: buco dark alla quinta replica (visibile in produzione) · le due reti
   meccaniche mancanti (contrasto e griglia spaziature) · caricamento diretto · HEIC.
6. 🟡 **Auto-cattura del prescrittore** (D232, sostanza decisa, meccanismo alla ④) · **back del
   telefono** in `Sheet.tsx` (D233②, primo compito della ④, con la sua guardia manuale).

## 4. Da dove ripartire

1. **`docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md`** — il piano, con le prove già
   fatte (dieci misure) e le due condizioni non negoziabili.
2. Prima di T1, i due difetti della §0② — sono piccoli, sono vivi, e T4 li tocca comunque.
3. Il ramo `fix-limite-caricamento` va portato in produzione **insieme** alla soluzione (D235).

## 5. Il minimo per non sbagliare

- **Il limite di 4,5 MB è di Vercel e NON si compra**: uguale su tutti i piani, nessuna impostazione.
  Il magazzino invece accetta già **50 MB**: il collo di bottiglia è il corridoio, non la destinazione.
- **Il permesso di caricamento firmato è INCHIODATO al suo percorso** (provato: «Invalid signature»
  altrove) e **dura 2 ore** (letta la scadenza dentro il permesso). La chiave anonima **non può**
  firmare. Il bucket filtra il tipo **anche** per via firmata.
- 🛑 **`storage.remove` su una chiave inesistente NON dà errore**: una riga che punta al nulla verrebbe
  cancellata «con successo», traccia compresa. Per questo la conferma deve **provare che il file c'è**.
- **Sonde pronte:** `scripts/tmp/sonda-upload-firmato.mjs` · `sonda-durata-token.mjs` ·
  `sonda-drop-url.mjs` · `sonda-residui.mjs` (tutte ripuliscono da sé, zero residui verificati).
- **Banco:** `npm run build && PORT=3020 npm run start`, accesso con
  `BASE=http://localhost:3020 npx tsx scripts/tmp/link-accesso-locale.ts h4t@live.it <percorso>` (D103).
- ⚠️ **`progressivi_anno('lavoro', 2026)` è a 16** e lì resta (contatore, non `max()`): i conteggi delle
  tabelle sono alla **baseline esatta** (295 · 0 · 5 · 3 · 39 · 917), manca un numero nella serie, non
  un dato.
- **Il prossimo numero di decisione è D238**; il conteggio vive in testa al verbale (237 in 88 tornate).
