# Piano — Il caricamento si rifà alla radice (D235): foto E pdf, direttamente allo storage

**Quando:** 5 agosto 2026 (`provato:` `date` → `2026-08-05 09:36 CEST`).
**Decide:** Francesco — D235, tornata 86.
**Nasce da:** il check post-deploy M3-T39-6 della sessione ③, che doveva confermare una frase e
ha trovato un difetto vivo. Voci di roadmap **15** (caricamento diretto) e **16** (HEIC).
**Ramo:** `fix-limite-caricamento` (già aperto, contiene il modulo del limite e i suoi test).
🛑 **MAI un worktree** (regola del repo).

---

## 0. Il fatto che cambia il perimetro

Non stiamo «alzando un limite». Stiamo **rimettendo le foto dentro il recinto**.

Le quattro policy di isolamento del bucket `documenti` chiedono che **la prima cartella sia il
laboratorio**. I documenti generati (DdC, buoni, DPA, ricevute) la rispettano. **Le foto dei lavori
no**: stanno sotto `lavori/<lavoro_id>/…`.

`provato:` `SELECT (storage.foldername('lavori/7dba9a57-…/1785523592465.webp'))[1]::uuid`
→ **`ERRORE [22P02]: invalid input syntax for type uuid: "lavori"`**

🔑 **La policy non NEGA: va in ERRORE.** Oggi dorme perché ogni scrittura e ogni lettura passa dal
client di servizio, che salta le policy. Ma il caricamento diretto porta il browser dentro quel
corridoio, ed è esattamente lì che quella mina esplode.

---

## 1. Registro delle prove (R-P1) — ciò che è MISURATO, non dedotto

Sonde: `scripts/tmp/sonda-upload-firmato.mjs`, `sonda-durata-token.mjs`, `sonda-residui.mjs`
(cartella `__sonda__/`, ripulita da sé — `provato:` zero residui su 4 prefissi).

| # | Domanda | Esito misurato |
|---|---|---|
| S0 | Il limite della piattaforma qual è? | `provato:` in produzione — **4,10MB → 401** (arriva) · **4,30MB → 413** `FUNCTION_PAYLOAD_TOO_LARGE`. Non configurabile su alcun piano ([Vercel docs](https://vercel.com/docs/functions/limitations)) |
| S1 | La chiave di servizio può firmare un caricamento? | ✅ sì — restituisce `{signedUrl, path, token}` |
| S2 | La chiave **anonima** (quella del browser) può firmare? | ✅ **NO** — «*new row violates row-level security policy*». Solo il server concede |
| S3 | Col permesso il browser carica davvero? | ✅ sì |
| **S4** | **Il permesso vale per un ALTRO percorso?** (valore che DEVE essere rifiutato) | ✅ **NO** — «*Invalid signature*». Il percorso è **inchiodato nel permesso** |
| S5 | Il permesso si riusa sullo stesso percorso? | ✅ no — «*The resource already exists*» |
| S6 | Il bucket filtra il tipo anche per via firmata? | ✅ sì — «*mime type image/heic is not supported*» |
| **S7** | **Quanto dura il permesso?** | **7200 s = 2 ore** (letta la scadenza dentro il permesso: `iat` 1785915178 → `exp` 1785922378). Scioglie il conflitto docblock «2 ore» vs default servizio «60 s» |
| S8 | `storage.remove` su una chiave inesistente? | 🛑 **NESSUN ERRORE**, `data: []` — una cancellazione a vuoto «riesce» in silenzio |
| S9 | Quanti file e quanti orfani? | 6 oggetti sotto `lavori/`, **5 righe** → **1 orfano** (`…/00000000-…-0030/1785514040247.webp`, forma di id da seed). Una foto reale pesa **3.974.947 byte**: a un soffio dal tetto |

**Non eseguito, e dichiarato:** HEIC su un iPhone vero (voce 16) — la prova sul dispositivo viene
prima del rimedio, e il rimedio dipende da lei.

---

## 2. 🛑 Il rischio nuovo che il disegno ovvio introduce — e come si chiude

**Non** è che il browser scriva dove non deve: S4 lo esclude, il percorso è nel permesso.
**È che il browser, alla CONFERMA, dica al server quale percorso scrivere in tabella.**

Perché è grave: `src/app/(app)/lavori/[id]/page.tsx:90` firma **qualunque** `storage_path` trovi in
riga, con il client di servizio, senza chiedere a chi appartiene. Una riga avvelenata —
`{lavoro_id: <mio>, storage_path: "<altro-lab>/ddc/2026/DDC-2026-0002.pdf"}` — diventerebbe una URL
valida un'ora **sul documento di un altro laboratorio**. E il gemello in scrittura: la DELETE di
`[imgId]/route.ts:274` cancellerebbe quel file.

**Oggi non esiste** perché il percorso lo costruisce interamente il server (`route.ts:121`) da un
`lavoro_id` già verificato. Spezzare il caricamento in due chiamate è ciò che apre quella voce.

🔒 **C1 — NON NEGOZIABILE: la conferma non accetta un percorso dal client.** Ricalcola il prefisso
atteso dalla sessione (`<laboratorio_id>/lavori/<lavoro_id>/`) e **rifiuta** tutto ciò che non ci
ricade. In revisione, un endpoint di conferma con `storage_path` libero nel corpo si respinge.

🔒 **C2 — la conferma PROVA che l'oggetto esiste** (`list` sul prefisso) e legge da lì **peso e tipo
VERI**, non quelli dichiarati dal client. Ragione misurata (S8): una riga che punta al nulla non dà
errore in cancellazione — il fail-closed di `[imgId]/route.ts:274-279` la cancellerebbe pulita e
scriverebbe pure la traccia. Una bugia silenziosa dentro il meccanismo costruito per non mentire.

---

## 3. I compiti, in ordine (R-E1: uno alla volta, esecutore fresco, revisione fra l'uno e l'altro)

### T1 — Il percorso entra nel recinto, e i file esistenti si spostano
`<laboratorio_id>/lavori/<lavoro_id>/<crypto.randomUUID()>.<ext>` — `Date.now()` esce (chiude R23,
collisione nello stesso millisecondo), `upsert: false` esplicito.
**Migrazione:** `storage.move()` dei 5 file → `UPDATE` dei 5 `storage_path` → cancellazione
dell'orfano. `provato:` nessuno **interpreta** `storage_path` (grep con `split|slice|match|substr|
startsWith|foldername` su 102 occorrenze → **0 hit**): è opaco, quindi non serve un doppio lettore.
⚠️ Le righe di `lavori_immagini_eliminazioni` restano col vecchio percorso: sono il registro di ciò
che **è stato** cancellato, non un puntatore.
🛑 **Da aggiornare:** `tests/unit/lavori-id-immagini-imgid-route.test.ts:145-146` e
`tests/unit/lavori/TabImmagini.test.tsx:167,286` portano il vecchio percorso come costante.

### T2 — La policy smette di poter andare in errore
Guardia di forma **prima** del cast: la prima cartella si confronta come testo, o si verifica che sia
un uuid, prima di castarla. **Prova R-P1 richiesta: un percorso con prima cartella non-uuid deve dare
NEGATO, non ERRORE.**
🛑 **Le 4 policy NON sono in `supabase/migrations/`** (`provato:` grep `'documenti'` su `supabase/`
→ 0 hit): sono nate da pannello. L'irrobustimento **si scrive come migration**, o vivrà solo lì.

### T3 — I due endpoint
`POST …/immagini/firma` — stessa intestazione di sicurezza della rotta attuale (`isSameOrigin` →
`getFreshLabContext` → `assertLabOperativo` → appartenenza del lavoro coi tre `.eq`), **più** ciò che
oggi sta dopo: `categoria` (`isCategoriaFoto`), tipo, peso dichiarato. Deriva il percorso, minta il
permesso, restituisce `{percorso, token}`.
`POST …/immagini/conferma` — stessa intestazione **ripetuta** (fra firma e conferma passano fino a 2
ore: il lavoro può essere cancellato, l'abbonamento sospeso) + C1 + C2, poi l'`INSERT`.
Su qualunque rifiuto: `storage.remove` del percorso, poi la risposta.
⚠️ Entrambi vanno aggiunti a `scripts/check-csrf.sh`.
⚠️ **Limite di frequenza sull'endpoint di firma**: oggi un caricamento costa all'attaccante
un'invocazione e vale 4MB; domani una richiesta da 200 byte autorizza 50MB scritti diretti. Non
esiste un meccanismo generico in casa — la forma da riusare è quella di `api/portale/richiedi`.

### T4 — I tre client (sono TRE, non due)
`FrameFatto` · `AllegaPrescrizioneSheet` · **`TabImmagini`** — quest'ultimo è il difetto vivo che il
panel ha trovato: **non ha alcun controllo di peso**, accetta PDF e **salta la compressione per i
non-immagine**. Un modulo scansionato da 6MB dalla scheda oggi prende il 413 grezzo, `responseText`
non è JSON, e l'utente legge «**Upload fallito: 413**».
L'avanzamento si prende dall'XHR già in casa (`TabImmagini.tsx:204-212`), non si reinventa.
📌 **Compressione:** `TabImmagini` comprime a 0,4MB **e converte in webp** — non è solo un
rimpicciolimento, è **l'unico normalizzatore di formato** su quella superficie. È per questo che
il difetto HEIC vive proprio sul percorso della prescrizione, che non comprime.

### T5 — Le costanti di peso si SDOPPIANO (censimento R-P6, non un ritocco)
`MAX_UPLOAD_BYTES` **non diventa 50MB**: restano due tetti con due ragioni scritte — **4MB** per ciò
che passa ancora dalla funzione, **~50MB** per il corridoio diretto. È la lezione del difetto
20MB/4MB: un numero solo per due corridoi diversi torna a mentire su uno dei due.

| Identificatore | Dove | Destinazione |
|---|---|---|
| `MAX_UPLOAD_BYTES` | `limite-caricamento.ts`, `immagini/route.ts` | resta 4MB — corridoio funzione |
| `MAX_UPLOAD_ETICHETTA` | idem + `AllegaPrescrizioneSheet` | segue il tetto del suo corridoio |
| `troppoGrande` | `FrameFatto`, `AllegaPrescrizioneSheet` | parametrizzata sul corridoio |
| `fraseErroreImmagine` (ramo 413) | `AllegaPrescrizioneSheet` | idem |
| **frase 413 scritta a mano** | `FrameFatto` | 🛑 **non porta numero: un grep sulla costante NON la trova** |
| *(assente)* | `TabImmagini` | **manca del tutto** — v. T4 |

### T6 — Il mietitore degli orfani
Il file atterra prima della riga: se il browser non conferma (rete persa, scheda chiusa, ascensore),
resta un file senza riga. Oggi ne esiste **già uno**, col server in mezzo; il caricamento diretto
allarga la finestra da «guasto del database fra due istruzioni» a «l'utente entra in ascensore».
🔑 **Perché non è solo igiene:** `DpaTemplate.tsx:163` dichiara ai clienti che le immagini di
lavorazione «*sono conservate per il solo tempo necessario alla lavorazione*». Un file che
l'applicazione non sa di avere non lo cancella nessuno — la cancellazione parte sempre dalla riga.
È una promessa scritta che il sistema non può mantenere (GDPR art. 5(1)(e), limitazione della
conservazione).
**Forma:** `pg_cron` è già in casa con due lavori attivi, e uno è esattamente un mietitore
(`portale-accessi-purge`). Il terzo si scrive con la stessa forma. Finestra proposta: 24h.

### T7 — La vecchia rotta si toglie SOLO dopo
`POST /api/lavori/[id]/immagini` resta finché tutti e tre i client non sono passati, poi esce in un
passo dichiarato. `uploadToStorage` muore con lei (`provato:` un solo chiamante).

---

## 4. 🟡 Le due decisioni che restano a Francesco

**① La prescrizione si comprime?** Comprimere riduce la qualità di un documento su cui si appoggia
la Dichiarazione di Conformità, e che va conservato per anni. **La scelta ha una conseguenza
meccanica obbligata**, e sono tre prodotti diversi:
- **si comprime** → il problema HEIC sparisce da sé (la conversione normalizza il formato), ma un
  foglio scritto a mano fitto potrebbe diventare meno leggibile;
- **non si comprime** → allora *bisogna* scegliere per HEIC: il bucket lo accetta (e servono
  anteprima e visore che lo mostrino), oppure il client lo **converte** senza ricomprimere (cosa
  diversa dal comprimere), oppure il selettore lo rifiuta in partenza dicendolo.
🛑 **I PDF non si comprimono in nessun caso** — ed è la classe che oggi non passa.

**② `lavori_immagini.url`** è `NOT NULL` ed è **inerte**: tutte le righe portano una URL pubblica su
un bucket privato, e ogni lettore la **sovrascrive** con una firmata prima di mostrarla. Il suo unico
effetto reale è costringere ogni scrittore a inventare un valore. Si rende opzionale (non rompe
niente) o si toglie (più onesto)?

---

## 5. Il minimo per non sbagliare

- **C1 e C2 del §2 non sono raccomandazioni**: senza, questa modifica apre una lettura arbitraria fra
  laboratori. Vanno provate con un valore che DEVE essere rifiutato.
- Le RLS dello storage **non** sono nel cammino del caricamento firmato (il servizio carica
  `asSuperUser`): l'isolamento è garantito **al 100% dalla riga di codice che sceglie il percorso**.
  Non c'è una seconda rete sotto. La policy resta la rete per gli altri corridoi — e per questo va
  comunque irrobustita (T2).
- La voce 16 (HEIC) è una **precondizione**, non un lavoro adiacente: oggi quel rifiuto arriva in
  fondo a un caricamento da 4MB, domani in fondo a uno da 50MB su rete mobile.
- Nessuna misura in casa sul comportamento del caricamento diretto su **rete mobile vera** (ripresa,
  timeout, taglio): l'XHR attuale non ha né ritentativo né ripresa, e con file fino a 50MB quella
  mancanza smette di essere teorica.
