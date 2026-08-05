# Ricerca — «si può comprimere senza perdere qualità?»

**Quando:** 5 agosto 2026. **Chiede:** Francesco — «*ma non possiamo comprimere senza perdere
qualità? non ci sono sistemi del genere? fai un controllo su github e reddit*».
**Cosa è:** input per una decisione, **nessuna riga di codice**. La decisione resta sua.
**Perché:** D235 mette in conto la compressione delle foto; ma la **prescrizione** è un documento
che sostiene la Dichiarazione di Conformità e si conserva per anni.

---

## 0. La risposta in tre righe

1. **Sì, una tecnica del genere esiste** — la ricompressione JPEG (JPEG XL `-j`, Lepton di Dropbox,
   Brunsli di Google): toglie il **20-22%** e permette di **ricostruire il file originale byte per
   byte**. Misurata su oltre 400.000 immagini.
2. **E no, oggi non la possiamo usare**: nessuna libreria matura la fa girare dentro un browser.
   Delle tre implementazioni, una è **archiviata** (Lepton, ultimo aggiornamento marzo 2024), una è
   in sola conservazione, e l'unica esposta al browser sta in un progetto da **2 stelle**.
3. **Quello che invece si può fare rende poco**, e quasi tutto il resto **peggiora le cose**.

---

## 1. I numeri (misurati, non promessi)

Su una foto di documento simulata a 12 MP (3024×4032, testo a penna, rumore di sensore):

| Cosa | Peso | Effetto |
|---|---|---|
| JPEG di partenza | 3,51 MB | — |
| `jpegtran` progressivo (**senza perdita**) | 3,10 MB | **−11,6%** |
| PNG «senza perdita» | 19,90 MB | 🛑 **×5,7 — CRESCE** |
| WebP «senza perdita» | 18,52 MB | 🛑 **×5,3 — CRESCE** |

🔑 **Perché cresce.** Un JPEG ha già buttato via la ridondanza facile. Quello che resta nei pixel è
il peggio possibile per un compressore senza perdita: rumore del sensore, alonatura attorno ai
tratti di penna, discontinuità ai bordi dei blocchi. Il compressore deve **memorizzare il rumore**
che il JPEG aveva scartato. Non è un'opinione: è scritto nella documentazione ufficiale di Google —
«*If the source is in lossy format, using lossless WebP compression … will typically result in a
larger file*» ([WebP FAQ](https://developers.google.com/speed/webp/faq)).

⚠️ Il **−11,6%** è **sovrastimato** perché la foto è sintetica. Su sei foto vere di fotocamera lo
stesso strumento dà **−7,3%**, e **zero** su una foto già passata da WhatsApp (già ottimizzata).

---

## 2. Il confine vero sul testo: non è la qualità, è il COLORE

Misurando l'errore **solo sui pixel d'inchiostro** (dove sta l'informazione), non sull'intera pagina:

| Impostazione | Peso | Errore sull'inchiostro | Errore sull'intera pagina |
|---|---|---|---|
| qualità 100, colore pieno | 59,6 KB | 0,45 | 0,34 |
| qualità 95, colore pieno | 36,9 KB | 2,74 | 0,44 |
| qualità 95, **colore dimezzato** | 26,0 KB | **10,78** | 0,59 |
| qualità 80, colore dimezzato | 17,2 KB | 14,52 | 0,75 |

**Due cose che cambiano il modo di ragionare:**

🔑 **(a) Le misure standard guardano la cosa sbagliata.** L'errore sull'intera pagina resta minuscolo
ovunque (0,34 → 0,75), perché fa la media su tutta la carta bianca dove non succede niente. È per
questo che i controlli automatici di qualità dicono sempre «va benissimo».

🔑 **(b) Il colore pieno conta più della qualità.** A **parità di peso**:

```
qualità 80 con colore pieno     24,4 KB   errore sull'inchiostro  8,67
qualità 95 con colore dimezzato 26,0 KB   errore sull'inchiostro 10,78
```

🛑 **E il browser dà quello sbagliato:** Chromium disattiva il dimezzamento del colore **solo a
qualità 100** ([bug 972180](https://bugs.chromium.org/p/chromium/issues/detail?id=972180)); Firefox
verso 90, Photoshop verso 50. **Comportamento di Safari: non verificato.**

---

## 3. Il vincolo che decide: non abbiamo risoluzione da regalare

**Arizona State Library**, standard minimi rev. 10/2023: per documenti conservati **10 anni o più**
con **note scritte a mano**, il minimo è **600 dpi**. E il principio che conta più della tabella:
«*Meeting minimum standards does not imply legibility… All scans must be legible to the smallest
font on the record.*»

**Aritmetica sul nostro caso:** un A4 fotografato a pieno schermo con un telefono da 12 MP dà
**~345 dpi** teorici, che coi margini reali scendono a **~280-320 dpi**. Da 24 MP si arriva a ~490.

➡️ **Siamo già sotto lo standard di un archivio pubblico prima di comprimere qualsiasi cosa.**

**Cosa rifiutano gli archivi di Stato:**
- **NARA** (agg. 08/2025): «*NARA will not accept digitized records in PDF that have been saved with
  lossy compression to reduce file size (e.g., JPEG, JBIG2).*»
- **AgID**, Allegato 2 alle Linee Guida — direttamente sul nostro caso: «*Qualora si disponga delle
  medesime immagini in un formato di maggiore qualità … si consiglia di **non riversare mai in
  JPEG** il medesimo contenuto*»; e «*la modifica di tali metadati compromette l'integrità del
  documento informatico*» — e il ridimensionamento nel browser i metadati **li azzera sempre**.

---

## 4. 🛑 Il pericolo che nessuno si aspetta: la compressione che riscrive i numeri

**Luglio 2013.** David Kriesel scansiona planimetrie con una fotocopiatrice Xerox e trova **le
misure cambiate**: una stanza di 22 m² etichettata 14 m². Causa: **JBIG2 in modalità «riconosci e
sostituisci»** — il compressore salva una volta sola le forme che giudica uguali e le riusa. Quando
il confronto sbaglia, **incolla il carattere sbagliato**. «*A lot of sixes were replaced by eights.*»
Xerox ammise: difetto vecchio di **otto anni**, centinaia di migliaia di macchine — e poi, peggio,
che «*anche le impostazioni di fabbrica e la qualità massima non risolvono completamente il
problema*».

### 🔑 Il numero che chiude la discussione

Dalla documentazione dell'encoder stesso (`jbig2enc`), su 90 pagine scansionate:

| Modo | Peso | |
|---|---|---|
| senza dizionario (**sicuro**) | 3.435.177 byte | — |
| con dizionario (**rischioso**) | 1.075.185 byte | **3,2× più piccolo** |
| con dizionario + verifica pixel («senza perdita») | 3.382.605 byte | **torna come il sicuro** |

➡️ **Tutto il vantaggio di quella compressione viene esattamente dal pezzo che può scambiare un 6
con un 8.** Renderla sicura la riporta al punto di partenza. **Non esiste la versione «forte e
sicura»**: è una cosa o l'altra.

### Gli Stati l'hanno vietata — anche nella versione «senza perdita»

**Germania, BSI TR-03138 (RESISCAN), requisito A.SC.12**, vincolante per le agenzie federali dal
16/03/2015: «*Verfahren, die zur Bildkompression das sog. „Symbol Coding" verwenden, **DÜRFEN
NICHT** eingesetzt werden*». E la nota: anche con un'implementazione **corretta**, la certezza
giuridica non è garantibile. Il divieto copre **entrambe** le varianti, compresa quella dichiarata
senza perdita.

**Svizzera, KOST**, con l'osservazione più inquietante: «*l'errore è irreversibile e non si può
stabilire se il metodo rischioso sia stato usato o no*».

⚠️ **Sfumatura utile:** si può rilevare **che** un PDF usa quella compressione (basta cercare il
filtro `/JBIG2Decode`). **Non** si può rilevare **se** ha corrotto qualcosa. Il primo controllo è
automatizzabile all'ingresso; il secondo no.

**Oggi il rischio è ridotto ma non estinto:** OCRmyPDF ha **rimosso** la modalità pericolosa
(verificato leggendo il sorgente, non la documentazione). Adobe Acrobat la offre ancora nel percorso
«Optimize Scanned Pages» — **fonte secondaria, da riverificare in Acrobat**.

📌 **MRC** (la compressione «a strati» dei PDF scansionati) usa JBIG2 per lo strato del testo:
**eredita in blocco lo stesso rischio**, ed è lossy di suo.

---

## 5. I PDF

| Strumento | Senza perdita? | Cosa fa davvero |
|---|---|---|
| **qpdf** (attivo, Apache-2.0) | ✅ sì | Ricomprime la **struttura**, non le immagini → su una scansione il guadagno **tende a zero** |
| `mutool clean`, `cpdf -squeeze` | ✅ sì | Stessa categoria |
| **Ghostscript** | 🛑 **NO** | **Ricampiona**: `/ebook` a 150 dpi, e persino `/prepress` — il preset «massima qualità» — **taglia a 300 dpi** |

**Nel browser non esiste oggi uno strumento maturo e con licenza compatibile:** `pdf-lib` è fermo dal
2021, `mupdf.js` è **AGPL** (problema serio per un prodotto commerciale chiuso), `qpdf-wasm` è alla
**v0.1.0**. L'unica via seria è `qpdf` lato server — che però sulle scansioni non recupera quasi
niente, proprio perché è onesto.

---

## 6. La proposta (da ratificare — Regola Advisor)

### Prescrizione (documento probatorio) → **NON si comprime**

Tre fatti, non prudenza generica:
1. **Il guadagno vero non esiste**: la tecnica che darebbe il 20% conservando l'identità del file non
   è disponibile nel browser; quella disponibile dà il 7%, e **zero** se la foto è già passata da
   WhatsApp.
2. **Non c'è risoluzione da regalare** (§3).
3. **Comprimere nel browser rompe cose che non volevamo toccare**: azzera i metadati (data di scatto,
   orientamento) e **forza il dimezzamento del colore**, che è proprio ciò che danneggia di più il
   testo colorato (§2).

Se un giorno servisse davvero: qualità **non sotto 90**, **colore pieno obbligatorio** (quindi
**fuori dal canvas**, con un encoder dedicato), e la compressione **prima** di calcolare l'impronta
del file, mai dopo.

🛑 **Regola senza eccezioni:** mai far passare una prescrizione da JBIG2 a dizionario, da MRC, o da
Ghostscript.

✅ **Controllo che costa poco:** sui PDF ricevuti per email, cercare `/JBIG2Decode` e **segnalare**.
Non dice se è corrotto — dice che appartiene alla categoria in cui la corruzione è invisibile, e che
vale la pena chiedere l'originale.

### Impronte (cliniche, non probatorie) → **si comprimono, senza esitare**

Qualità 80-85 toglie il **55-60%** del peso (misurato: da 3,51 MB a 1,65-2,14 MB). Sono materiale di
lavoro: nessuno ci leggerà sopra un «A3,5» in un contenzioso.

### Il conto vero

🔑 **La prescrizione è UN file per lavoro; le impronte sono PARECCHI.** Comunque si girino i numeri,
**il file probatorio è la minoranza dei byte**: comprimerlo fa risparmiare pochissimo e mette a
rischio l'unica cosa che in una contestazione conta. E il costo vero delle foto d'impronta non è lo
spazio: **è il tempo di caricamento** sul wifi del laboratorio o in 4G — quello sì, ed è il motivo
onesto per comprimerle.

📌 **Dettaglio del nostro impianto, verificato:** Supabase **non altera l'originale** nel magazzino.
Ma le sue trasformazioni d'immagine, se le usassimo, applicano di default **qualità 80** e
**convertono in WebP**: va bene per l'anteprima a schermo, **mai** per ciò che si esporta o si stampa
in caso di contestazione (`format=origin` disattiva la conversione).

---

## 7. Ciò che NON è verificato (dichiarato, non riempito)

1. Comportamento di **Safari** sul dimezzamento del colore (soglia nota per Chromium e Firefox).
2. **Adobe Acrobat**: JBIG2 lossy come opzione predefinita — fonte secondaria, da riverificare.
3. **Nuovi casi di sostituzione caratteri 2023-2026**: cercati espressamente, non trovati.
4. Tempo di codifica JPEG XL/AVIF su iPhone per immagini da 8-24 MP: nessuna misura pubblicata.
5. Requisiti di risoluzione nelle Linee Guida **AgID**: non presenti nell'Allegato 2.
6. **I volumi reali del laboratorio**: nessuna delle quattro prove dello Statuto delle fonti.

**Metodo:** misure eseguite con `jpegtran` (libjpeg-turbo), `cwebp` 1.6.0, Python+Pillow+NumPy. Stato
dei repository letto via API di GitHub e registro npm il 05/08/2026, non da pagine HTML. Testi di BSI
e AgID estratti dai PDF ufficiali con `pdftotext`, non da fonti secondarie.

---

# APPENDICE — Tre misure che riguardano il NOSTRO codice adesso

Aggiunte il 05/08/2026 da due filoni di ricerca paralleli, più una verifica sul codice in casa.

## A1. 🔴 Il colore conta più della qualità — e riguarda proprio l'inchiostro delle prescrizioni

Misurando l'errore **solo sui pixel del tratto** (non su tutta la pagina), su testo simulato a penna:

| Inchiostro | Qualità | Colore | Peso | **Errore sul tratto** |
|---|---|---|---|---|
| **blu** | 95 | pieno (4:4:4) | 114,4 KB | **5,47** |
| **blu** | 95 | dimezzato (4:2:0) | 80,3 KB | **17,79** |
| **blu** | **75** | **pieno** | **23,9 KB** | **13,29** |
| nero | 95 | pieno | 102,7 KB | 4,41 |
| nero | 95 | dimezzato | 74,7 KB | 4,76 |

🔑 **Il blu a qualità 75 col colore pieno è 3,4 volte più piccolo E più fedele del blu a qualità 95
col colore dimezzato.** Non c'è compromesso: è meglio su entrambi gli assi.

🔑 **Sul nero il dimezzamento del colore è quasi irrilevante** (+8%): il nero su bianco vive nella
luminanza, che quel meccanismo non tocca. ⚠️ Quindi «il 4:2:0 rovina il testo» è **falso**; «rovina
il testo COLORATO» è vero. La prescrizione del dentista è scritta a penna blu.

## A2. 🛑 Il nostro codice comprime in WebP — che **non può** avere il colore pieno

`TabImmagini.tsx:25-31` converte in `image/webp`. Ma WebP con perdita è **obbligato** al colore
dimezzato — non è una scelta, è nella specifica del codec sottostante (RFC 6386: «*VP8 works
exclusively with an 8-bit YUV 4:2:0 image format*»), confermato dalla FAQ di Google e da MDN.

➡️ **Non esiste un WebP con perdita a colore pieno.** Il formato che abbiamo scelto per comprimere
è, per costruzione, quello che secondo A1 danneggia di più il tratto colorato.

## A3. 🛑 E su iPhone quella conversione **non avviene affatto** — in silenzio

- La libreria che usiamo comprime passando dal `canvas` del browser (`toBlob`).
- **Safari, né su Mac né su iPhone, ha mai saputo scrivere WebP** da lì
  ([caniuse](https://caniuse.com/mdn-api_htmlcanvaselement_toblob_type_parameter_webp)).
- E il fallimento **non dà errore**: la specifica dice che se il formato non è supportato «*i dati
  saranno esportati come `image/png`*» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)).
- ✅ **Verificato nel codice della libreria in casa**: passa il tipo richiesto a `toBlob` e **non
  controlla mai** che tipo abbia ricevuto indietro.

**La catena, e perché è peggio di come sembra:** su iPhone si ottiene un **PNG**, che su una foto è
molto **più pesante** del JPEG di partenza. La libreria però ha un tetto (0,4 MB) e per rispettarlo
continua a **ridurre i pixel** — cioè, per rientrare in un formato sbagliato, **butta risoluzione**.
Su una prescrizione, la risoluzione è esattamente ciò che non abbiamo da regalare (§3).

⚠️ **Non misurato su un iPhone vero** — è la prova che manca, e va fatta. Ma il meccanismo è certo:
sta nella specifica del browser e nel codice della libreria, non in un'inferenza.

## A4. E se pensassimo di comprimere i PDF: il tetto è **lo 0,1%**

Misurato su un PDF di 3 pagine A4 scansionate a 300 dpi (5,16 MB):

| | |
|---|---|
| Peso delle immagini dentro il PDF | **99,91% del file** |
| Risparmio ottenuto con ottimizzazione **senza perdita** completa | **0,02%** |
| **Tetto teorico** se la struttura sparisse del tutto | **0,09%** |

(Impronta digitale dei flussi immagine **identica** prima e dopo → la prova che l'operazione era
davvero senza perdita.) Per confronto, **con** perdita: da −65% (300 dpi, qualità 60) a −90%
(150 dpi). **Non esiste una terza via**: su una scansione, o si accetta una perdita, o non si scende.

## A5. Il vincolo italiano, testuale

**AgID**, Allegato 2 §2.6 punto 5: «*[i formati] con algoritmi di compressione privi di perdita sono
i più adatti alla conservazione. Possono essere adatti anche il formato JPEG … **ma solo qualora le
immagini siano state nativamente generate in codesti formati** (p.es. provenienti da fotocamere
ovvero **scanner digitali**). **Sono dunque esclusi dalla conservazione i riversamenti di immagini in
formati che aggiungono (o cambiano) algoritmi di compressione adottati.***»

👉 **Lettura operativa:** il JPEG che esce dal telefono o dallo scanner del dentista è ammesso
«nativamente». **Ricomprimerlo** è un riversamento che cambia l'algoritmo — proprio ciò che quella
frase esclude. E §3.3 punto 6 aggiunge che, quando si usa una compressione con perdita, va prodotta
«*un'analisi puntuale o statistica dell'**ammontare di informazione persa***».
🔑 **Comprimere non è vietato in assoluto: costa un adempimento documentale che oggi non abbiamo.**
