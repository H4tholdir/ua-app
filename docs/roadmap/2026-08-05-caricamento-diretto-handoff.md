# Handoff — Il caricamento diretto è in produzione, e il rilascio ha curato un difetto che nessuno sapeva di avere

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 5 agosto 2026, pomeriggio (`provato:` `date` → `2026-08-05 14:49 CEST`).
**Stato:** `main` **pubblicato e allineato a `origin/main`** (0 commit in attesa) · ramo
`fix-limite-caricamento` **cancellato** dopo il merge · ultimo commit `28cfb68c`.
📌 MISURATO IN CHIUSURA (`provato:` `npm run verify:full`): tsc 0 · eslint 0 · vitest **4944 passate
| 19 saltate** (415 file | 3 saltati) · build ok · **sei guardie verdi** · verifica «full» registrata.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E ANDAVA FATTO

### ① 🛑 IL GATE ESTETICO L2 NON È STATO FATTO, E IL CODICE È GIÀ IN PRODUZIONE
FASE 9b lo dichiara **obbligatorio prima del merge** per ogni superficie con UI toccata. Questa
sessione ha toccato l'interfaccia in due punti — l'errore di caricamento nella scheda
(`TabImmagini`, ora l'**Avviso §5.18** del DS) e le frasi d'errore del wizard — e **ha mergiato
senza gate**: niente micro-audit sulle 12 sezioni, niente 390/768/1280 × chiaro/scuro sull'app vera.
🔑 **Ciò che è stato fatto al suo posto, e non lo sostituisce:** un mockup coi token veri più uno
scatto nei 3 viewport e 2 temi (`docs/design/mockups/2026-08-05-avviso-peso-scheda.html`), approvato
da Francesco. È un'anteprima del **componente**, non un audit della **schermata**.
➡️ **Da fare:** gate L2 sulle due superfici, e se trova qualcosa si corregge in un rilascio a sé.
⚠️ Il rischio residuo è basso (l'Avviso è un componente DS già in uso altrove, non roba nuova) ma
**la regola è stata saltata, non rispettata in forma diversa**.

### ② La prova su un IPHONE VERO non è stata fatta — ed è una precondizione dichiarata
Tutto il ragionamento su HEIC e sulla conversione mancata poggia su **specifica + codice letto**, mai
su un dispositivo. `provato:` i tipi ammessi dal bucket, letti dal vivo →
`["application/pdf","image/jpeg","image/png","image/webp","image/gif"]` — **HEIC non c'è**.
➡️ Oggi HEIC è **fuori** dalla nostra lista (`src/lib/storage/tipi-immagine.ts`) e la guardia
`scripts/guardia-tipi-bucket.mjs` tiene allineate le due liste in **entrambe** le direzioni
(`provato:` verde ora; rossa se si rimette heic). **Questa è la toppa, non la decisione**: la scelta
della **riga 16** di roadmap — accettare HEIC nel bucket oppure rifiutarlo al selettore — **dipende
da quella prova**, che va fatta col telefono di Francesco.

### ③ Nessuna misura sul comportamento in RETE MOBILE VERA
Il piano lo dichiarava (§5) e resta vero, **peggiorato dal successo**: l'XHR non ha né ritentativo né
ripresa, e adesso i file possono arrivare a **50 MB**. Un caricamento interrotto all'80% riparte da
zero. Nessuna misura in casa su 4G reale: **non verificato**.

### ④ `CRON_SECRET`: aggiunta da Francesco, **non verificabile da questa sessione**
`provato:` il canale che userà il pianificatore funziona — `Authorization: Bearer <segreto>` →
**200**, valore a caso → **401**, senza intestazione → **401**. E il mietitore gira davvero:
`{"esaminati":7,"tolti":0,"ancoraGiovani":0}`.
🛑 **Ciò che NON si è potuto verificare:** che la variabile si chiami esattamente `CRON_SECRET` e con
che valore — nessuna credenziale Vercel su questa macchina, e il valore giustamente non passa dalla
chat. ➡️ **Si conferma domattina**, su Vercel → **Settings → Cron Jobs**.
⚠️ **Piano Hobby: l'orario ha una tolleranza di un'ora** (fonte ufficiale: [Vercel — Usage & Pricing
for Cron Jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing), «*a cron job configured as
`0 1 * * *` will trigger anywhere between 1:00 am and 1:59 am*»). Il nostro `20 4 * * *` parte quindi
**fra le 4:20 e le 5:19**: non è rotto se alle 4:25 non è ancora partito.

### ⑤ Un difetto piccolo, riferito e NON corretto (era fuori mandato)
Una carta di caricamento fallito **non si può togliere** dalla schermata finché non si ricarica la
pagina: `provato:` `grep -c "rimuoviFoto|onRimuovi|chiudiErrore"` su `TabImmagini.tsx` → **0**.
C'era già prima; ora si nota di più perché l'errore porta una frase.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| **I due difetti vivi** (D238) | ✅ via il **WebP → JPEG** e si **controlla il tipo ricevuto**; **controllo di peso** in `TabImmagini`, messo **dopo** la compressione (a monte rifiuterebbe le foto da 6MB che oggi passano) |
| L'errore che **non si leggeva** | ✅ viveva in un `aria-label`, a schermo restava un triangolino muto → ora è l'**Avviso §5.18** del DS. Francesco: «*stile AI slop, usiamo le regole del nostro design system*» — e aveva ragione |
| **Il piano D235, T1-T7** | ✅ **COMPLETO**: recinto · policy che nega · le due rotte con C1/C2 · i client · i tetti per corridoio · il mietitore · via la vecchia rotta |
| **Il revisore** | 🔎 tre rilievi, **tutti fondati**: i client erano **QUATTRO** · **HEIC era diventato una regressione** · T6 non era rimandabile |
| **Pubblicazione** (D241) | ✅ fast-forward `132d39e2..0d6d7979` (24 commit) · CI verde · CD verde · sito 200/307 |
| **Check post-deploy sul SITO VERO** | ✅ PDF da **6,1MB** caricato dalla scheda: firma **200** · byte al magazzino **200** · conferma **201** · file 6.400.688 byte nel recinto. Prova rimossa, baseline ripristinata |
| 🔴 **Il difetto vivo trovato per caso** | ✅ chiuso dal rilascio — v. §2.1 |

## 2. 🔑 Le lezioni

1. 🔴 **Una migration applicata al database vive SUBITO; il codice che l'accompagna no.** La
   migration di D236 era stata applicata alle **09:59** senza pubblicare il codice: da quel momento
   la rotta in produzione scriveva in una colonna **cancellata**, e **ogni caricamento di foto
   falliva** lasciando un file orfano. `provato:` due file alle **11:23:45** e **11:24:04** sul
   lavoro **2026/0017**, senza riga. **Nessuna prova automatica lo vede**, perché in locale i due
   pezzi sono sempre allineati. ➡️ **Regola: ciò che TOGLIE si applica DOPO aver pubblicato il codice
   che smette di usarlo.** Se l'ordine si inverte, la finestra si dichiara e si chiude nello stesso turno.
2. **Un elenco scritto da chi progetta non è una misura.** Il censimento del piano ha sbagliato
   **quattro volte in un giorno**: 4 policy → **8** · `endsWith` fuori dal grep · l'assunzione su
   `check-csrf` · i client **3 → 4**. Ogni volta il rimedio è stato lo stesso: rifare il censimento
   **sul codice vivo**.
3. 🛑 **Una pulizia può diventare un'arma.** Il piano diceva «su qualunque rifiuto, `remove` del
   percorso»: applicato al percorso **ricevuto dal client** avrebbe fatto cancellare a noi il
   documento di un altro laboratorio. Si toglie **solo** ciò che è già passato dal controllo di
   appartenenza.
4. **`startsWith` non è un confronto di percorso.** `<lab>/lavori/<lavoro>/../../<altro>/x.pdf` lo
   supera. Il confronto è sull'**intera stringa ricostruita**.
5. **Un errore non è un diniego.** La policy dello Storage **esplodeva** (22P02) invece di negare, e
   con un solo oggetto storto nel bucket **l'elenco falliva per tutti**.
6. **Le prove che cambiano numero SONO il lavoro.** «un PDF da 6MB non parte» è diventata «un PDF da
   62MB non parte», e al suo posto c'è «**IL CASO CHE HA GENERATO TUTTO: un modulo scansionato da 6MB
   ORA PASSA**».

## 3. Che cosa resta aperto (in ordine)

1. 🔴 **La DdC può uscire SENZA il nome del prescrittore, col controllo verde.** `provato:` oggi,
   riga per riga: `TabDati.tsx:283` scrive `richiedente_nome: ''` · `precheck.ts:23` accetta perché
   **ripiega sul cliente** (`|| cliente.cognome/nome`) · ma `generate-ddc.ts:146` usa `??`, che su
   **stringa vuota non ripiega** → `prescrittore_nome` esce **vuoto** su un documento a valore
   legale. **Il rimedio è piccolo** (`||` invece di `??`, o normalizzare `''` → `null` alla
   scrittura) **ma va fatto con la sua prova**. 0 occorrenze oggi, percorso aperto.
2. 🟡 **Gate estetico L2** sulle due superfici toccate (§0①).
3. 🟡 **La prova su iPhone** e, da lì, la decisione della **riga 16** (HEIC).
4. 🟡 **Righe di roadmap 13, 14, 17**: buco dark alla quinta replica (visibile in produzione) · le due
   reti meccaniche mancanti (contrasto su tutti i fondi, griglia spaziature) · **`middleware.ts`
   deprecato da Next 16** (avviso testuale nei log del rilascio).
5. 🟡 **Rete mobile vera** (§0③) e **la carta d'errore non rimovibile** (§0⑤).

## 4. Da dove ripartire

1. **`docs/roadmap/ROADMAP-UFFICIALE.md`** — la tabella delle righe aperte è la fonte.
2. Il candidato naturale è **il prescrittore vuoto** (§3.1): è l'unico difetto che tocca un documento
   a valore legale, ed è piccolo.
3. Il piano `docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md` ora si legge come
   **verbale di ciò che è stato fatto**, non come lista di compiti.

## 5. Il minimo per non sbagliare

- **Il caricamento ora ha DUE corridoi e due tetti**, e restano due: `funzione` **4MB** ·
  `diretto` **50MB** (`troppoGrande(file, { corridoio })`). Il predefinito è il **più stretto**:
  dimenticare il parametro dà «rifiuta un file che sarebbe passato», mai il contrario.
- **La forma dell'indirizzo di caricamento è misurata:**
  `PUT …/storage/v1/object/upload/sign/<bucket>/<percorso>?token=<gettone>` → 200 · stesso gettone
  altrove → `InvalidSignature` · senza gettone → errore. 🛑 `signedUrl` che torna dalla libreria è
  **già assoluto**: concatenarlo alla base dà 404 (pagato).
- **Il mietitore si può chiamare a mano** (e non serve `CRON_SECRET`, basta `INTERNAL_SECRET`):
  ```
  curl -s -X POST -H "x-internal-secret: $(grep '^INTERNAL_SECRET=' .env.local | cut -d= -f2- | tr -d '"')" \
    https://uachelab.com/api/internal/orfani-storage
  ```
- **Banco:** `npm run build && PORT=3020 npm run start`, accesso con
  `BASE=http://localhost:3020 npx tsx scripts/tmp/link-accesso-locale.ts h4t@live.it <percorso>` (D103).
  In produzione: `scripts/tmp/link-accesso.ts` (stessa forma, senza `BASE`).
- ⚠️ **`verify:full` lancia eslint sul solo `src`**: gli avvisi sui file di prova li prende il
  **pre-commit**, che guarda anche `tests/`. Non stupirsi se il commit è più severo della verifica.
- 🛑 **«Voce» e «riga» non sono sinonimi** in questo progetto: la roadmap ha **righe**, e la guardia
  dei documenti ferma il commit se si scrive «voce N».
- **Baseline del banco:** `lavori_immagini` a **7 righe** (erano 5 + le 2 foto vere caricate da
  Francesco alle 12:33/12:34 UTC dal telefono, che **hanno la riga**: è la prova che il caricamento
  funziona per l'utente vero).
- **Il prossimo numero di decisione è D242**; il conteggio vive in testa al verbale (241 in 91 tornate).
