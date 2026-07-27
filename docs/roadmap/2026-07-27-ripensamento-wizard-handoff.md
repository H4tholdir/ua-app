# Handoff — Il ripensamento del wizard «Nuovo lavoro» (27/07/2026)

**Per:** la sessione successiva, con contesto pulito.
**Prima di tutto:** BP-0 — `memory/MEMORY.md` **voce 51** (e 50 per la ricerca di ieri sera), poi
`memory/SESSION_ACTIVE.md`, poi `docs/roadmap/ROADMAP-UFFICIALE.md` **voce 19** (la tabella delle
cinque voci in coda).
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md`
§0D) · **Regola Advisor** · 🆕 **«Statuto delle fonti»** (`../CLAUDE.md` §7 — v. §6 qui sotto) ·
**mockup PRIMA del codice** (§0B) · **BP-2** · **BP-1** prima di fermarsi.

---

## 0. In una riga

**La metà indipendente della tappa 1 è in produzione** (merge `9aea0f22`, CI e deploy verdi,
`uachelab.com` verificato). Il nome del paziente si corregge. **La targa della cassetta no, e non
per errore:** dipende dal wizard, e Francesco ha deciso che **il wizard va ripensato per intero**.
Quello è il prossimo lavoro, ed è **percorso GRANDE con migration**.

---

## 1. 🎯 IL PROSSIMO LAVORO — il ripensamento del wizard

### 1.1 I requisiti, con le parole di Francesco (27/07)

> «dobbiamo rivedere l'intero wizard per la creazione di un nuovo lavoro, dico questo perché, se
> arriva un lavoro che prevede la creazione di un dente e quindi indicazione di elemento e colore
> **(o più denti e quindi più elementi e colori)** allora il wizard deve dare modo di inserire
> queste info nella maniera **più semplice e bella possibile**, se invece il lavoro non lo prevede,
> es. devo fare solo uno scheletrato, allora è un info che **può essere saltata** nel wizard con la
> possibilità eventualmente di inserirle in un secondo momento. un'altra cosa che mi chiedeva un
> titolare di lab, è che spesso assieme alla prescrizione arrivano anche **documentazioni tipo
> radiografie, foto, etc etc**, tutte cose che dobbiamo studiare e decidere come inserirle nel
> wizard di creazione»

Tre richieste distinte, da non confondere:
1. **Il wizard si adatta al tipo di dispositivo** — chiede elemento e colore solo quando ha senso.
2. **Più denti, ciascuno col suo colore** — oggi impossibile, v. §1.2.
3. **Ingresso dei documenti clinici** che arrivano con la prescrizione.

E una quarta, emersa strada facendo: **il tasto «Salta»**. Verificato leggendo il codice: su una
riga **chiusa** non fa assolutamente nulla (azzera un valore già vuoto, chiude una riga già chiusa —
c'è pure il commento che lo ammette, `PassoPaziente.tsx:129-132`). Sopra le righe c'è già scritto
«Se vuoi, aggiungi». Le linee guida trovate (GOV.UK Design System, Baymard) convergono: un campo
facoltativo **si dichiara** facoltativo, non gli si affianca un secondo tasto per saltarlo.

### 1.2 🛑 Il vincolo strutturale, accertato leggendo lo schema

**Il colore oggi vive in quattro colonne del LAVORO INTERO** — `colore_dente`, `colore_collo`,
`colore_corpo`, `colore_incisale` (`src/types/database.types.ts:2375-2378`) — **non per dente**.
I denti stanno in un array (`denti_coinvolti: string[]`).

Quindi «più denti con più colori» **non è rappresentabile senza cambiare la struttura del
database**. È questo che sposta il lavoro da «media» a **GRANDE**: migration → **FASE 6b
obbligatoria** (rigenerare i tipi, `tsc`, verificare che le policy RLS non si rompano).

Le immagini invece **hanno già una casa**: la tabella `lavori_immagini`, quella che usa la foto
dell'impronta. Ma ciò che arriva da uno studio non sono solo foto — sono radiografie in formati
loro, PDF, file dello scanner intraorale: **chi li apre, quanto si conservano, chi può vederli sono
domande normative**, non solo di schermata.

### 1.3 ⚠️ Un difetto già in produzione, da chiudere dentro questo lavoro

Verificato riga per riga, **non dedotto**: il wizard propone come esempio **«es. 2.6»**
(`PassoPaziente.tsx:85`) e salva la stringa così com'è (`crea-lavoro.ts:195`). Ma l'odontogramma
conosce **solo numeri interi** e converte con `.map(Number)` (`TabClinica.tsx:28`): «2.6» non
corrisponde a nessun dente.

Conseguenza in tre passi: il dente non si accende → il tecnico ne tocca un altro per correggere →
**il lavoro dichiara due denti**. E nessuno se ne accorge, perché **il precheck di consegna non
nomina né denti né colore** (`precheck.ts`, verificato) e la Dichiarazione di Conformità stampa il
valore grezzo (`DdcTemplate.tsx:258-260`).

Col colore la beffa è simmetrica: la tendina buona ammette **19 valori VITA**
(`TabClinica.tsx:8-14`), quindi un «A22» digitato al banco si presenta come campo **vuoto**, non
come campo sbagliato. Chi apre per correggere legge «manca» e non corregge.

### 1.4 Da dove ripartire — NON da zero

**Esiste già la ricerca**, con le fonti: `docs/roadmap/2026-07-27-ricerca-presa-in-carico-lavoro.md`
(⚠️ leggere il riquadro di rettifica in cima: §2 è **declassata**, v. §6 qui sotto).

**Esistono già tre pareri di advisor**, tutti convergenti su «togliere elemento e colore dal passo
3», due su tre **a una condizione**: prima serve l'avviso alla consegna (voce 2 della coda). Il
terzo, quello tecnico, aveva raccomandato di **fondere** la modifica con l'ondata in corso — poi
Francesco ha allargato il perimetro e la fusione è diventata un ripensamento intero.

**Esiste un mockup, NON approvato:** `docs/design/mockups/2026-07-27-passo3-cognome-nome.html` con
sei screenshot. Mostra il passo 3 con le due caselle Cognome/Nome in due varianti. **Va rifatto**
perché la forma del blocco cambia — ma il lavoro sul carattere, i token e la resa è riusabile.

**Decisioni già prese da Francesco su questa materia:**
- ✅ Le due caselle si chiamano **«Cognome»** e **«Nome»**.
- ✅ **La parola «alias» si toglie del tutto.** ⚠️ Conseguenza da gestire nel nuovo disegno:
  «alias» era l'unica cosa sullo schermo che diceva *«qui puoi scrivere un soprannome, non serve il
  nome vero»*. Togliendola, un campo chiamato «Cognome» chiede implicitamente un'identità vera.
  Si rimedia col testo di aiuto sotto il campo — ma **va deciso apposta**, non perso per strada.
- ✅ L'avviso alla consegna è **voce a sé, subito dopo** — non dentro questo lavoro.

### 1.5 Il percorso, per come lo prescrive BP-2

**GRANDE.** Quindi, nell'ordine: brainstorming (FASE 2, `superpowers:brainstorming`) → **gate FASE 3
con tutte e 5 le risposte** (⚠️ «serve migration?» qui è **sì**) → **panel advisor** → spec → piano
→ mockup e approvazione → TDD → FASE 6b (migration gate) → FASE 7 → review → QA browser → **FASE 9b
gate estetico** → deploy → BP-1.

⚠️ **Non saltare il brainstorming perché «i requisiti sono chiari».** Non lo sono: «più semplice e
bella possibile» è un obiettivo, non una specifica, e il modello dati dei colori è una decisione
architetturale con dieci anni di conservazione dietro.

---

## 2. Che cos'è andato in produzione oggi (per non rifarlo)

Merge `9aea0f22`. **3.425 test verdi** (base 3364), tipi e stile puliti, build ok, CI e CD verdi,
`uachelab.com` verificato senza errori in console.

| Che cosa | Dove |
|---|---|
| La regola unica di scrittura di `pazienti.(nome, cognome)` — le 4 combinazioni, 3 invarianti, precondizione del chiamante nel JSDoc | `src/lib/domain/nome-paziente-scrittura.ts` |
| `POST` e `PATCH /api/pazienti` che la applicano, con 422 fail-closed | `src/app/api/pazienti/` |
| **Nome e cognome correggibili** dalla scheda paziente (Art. 16 GDPR + direttiva D10) | `PazienteEditSheet.tsx` |
| 4 falle chiuse: l'errore grezzo del DB non torna più al client | GET/POST/PATCH/DELETE pazienti |
| Etichetta PDF allineata verbatim a IFU e Ricevuta (codice pseudonimizzato per primo) | `EtichettaTemplate.tsx` |
| `ANALISI/17` annotata con la decisione D8 in due punti | ⚠️ **fuori dal repo git** |

🛑 **FERMI, e da riprendere dentro il ripensamento:** il mockup del passo 3, `crea-lavoro.ts`,
`PassoPaziente.tsx`, lo stato del wizard, e **il bump della bozza salvata a `v: 2`** — quest'ultimo
**deve viaggiare con loro**: aggiungere campi allo stato senza alzare la versione fa riprendere una
bozza vecchia con campi mancanti, e **uccide la creazione del lavoro** (dettaglio nel piano,
riquadro della trappola 3.2).

---

## 3. 🔑 Il metodo che ha pagato oggi, da riusare

**Provare le correzioni per mutazione.** Non «il test passa», ma: si rompe il codice **di proposito**
e si verifica che il test diventi rosso **per asserzione, non per crash**. Un test che cade perché il
finto database si sbriciola non prova niente.

Quanto è servito: una manomissione realistica — lasciare che sia il browser a scegliere su quale
laboratorio scrivere (`body.laboratorio_id ?? context.laboratorioId`) — passava **18 test su 18** in
silenzio. La rete c'era, ma non teneva.

🛑 **E il corollario trovato al collaudo:** un test di struttura **non sostituisce la misura dei
pixel a viewport reale**. Le due caselle nuove avevano spinto il tasto «Salva» **fuori dallo
schermo** su scrivania (da y=730 a y=831 su altezza 800) e sotto la barra di navigazione su
telefono. Nessuno dei 3.424 test poteva vederlo. **Il collaudo dal vivo va fatto, sempre.**

---

## 4. Base di lavoro — trappole logistiche, ancora vere

- **`main` è a `676a82a1`**, pulito, allineato al remoto. Il ramo dell'ondata è stato **cancellato**
  dopo il merge (era interamente fuso e mai spinto).
- Worktree in piedi di altre ondate: `ondata-a-mini-triage`, `redesign-parete-home`.
- 🛑 **NEL WORKTREE IL DEV SERVER NON PARTE** — doppio `package-lock.json` → Turbopack sceglie la
  radice del repo principale → **tutte le route 404** (i file statici di `public/` rispondono, e
  questo inganna). Per un'ondata con molto browser, **lavorare su un branch nel repo principale**:
  è la scelta fatta oggi ed è andata bene.
- ⚠️ Un worktree nuovo nasce **senza `.env.local`/`.env.test`**: senza copiarli `next build`
  fallisce su `/api/admin/labs` via Stripe.
- ⚠️ **`.gitignore` riga 62 ignora `*.png`:** gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ **Il pre-commit ferma su `--max-warnings=0`** e `tsc` **non** vede un import rimasto senza uso:
  dopo ogni bonifica, `npx eslint src/` **prima** di committare.
- ⚠️ **`../CLAUDE.md` e `../ANALISI/` stanno FUORI dal repo git** (`ua-app` è la radice): le loro
  modifiche **non sono versionate**. Non provare a committarle da qui — `git add` fallisce e
  interrompe l'intero comando.
- ⚠️ **La skill `ua-app:review` è inutilizzabile** (pretende un file che nel repo non esiste): la
  review si fa con revisori indipendenti.
- 🛑 **Le password non le digita l'assistente.** Per il QA dietro login: si apre la pagina di
  accesso con gli strumenti del browser, **entra Francesco**, poi si guida la verifica da lì. È così
  che è stato fatto oggi e ha funzionato.
- ⚠️ **Il tema segue il sistema quando `ua-tema` non è in `localStorage`** (modalità automatica):
  per provare il tema scuro basta cambiare lo schema di colore del browser **e ricaricare** — la
  chiave `ua-tema` non va toccata, altrimenti si altera la preferenza di Francesco.
- ⚠️ **I click sintetici del browser non sempre raggiungono React** su questa app: se un pannello
  non si apre, non è detto che sia rotto — verificare con una chiamata diretta prima di concludere.
- ⚠️ **Attenzione alle date a cavallo della mezzanotte.** Prima di datare un file, **guardare
  l'orologio**, non l'ultimo documento letto.

---

## 5. La coda dietro al wizard — ordine ratificato da Francesco

| # | Voce | Percorso |
|---|---|---|
| **2** | **Avviso alla consegna su dente/colore mancanti** — avviso, **mai blocco** (una totale non ha elemento, un bite non ha colore). Oggi `precheck.ts` non li nomina | Media, con panel su quali dispositivi esentare |
| **3** | ⚠️ **Verificare se il colore compaia nella DdC** — sembra assente dal modello e dallo snapshot, mentre `ANALISI/17:119` lo elenca fra gli obbligatori. **Possibile lacuna normativa** | verifica, poi voce propria |
| **4** | **Assistente vocale completo** che sostituisca «Dimmelo a voce» — oggi **non funziona**, e Francesco vuole rimuoverlo del tutto, non ripararlo: voce e interrogazioni su **tutta** la PWA | GRANDE, tutto da progettare |
| **5** | **Tappa 1-bis (D9)**: la fotografia congelata `paziente_nome_snapshot` + correzione dalla scheda del lavoro | GRANDE, panel normativo |

⚠️ **Nodo che lega la 1 e la 5:** correggere il paziente **non** aggiorna la fotografia sui lavori
già creati. Probabilmente giusto per i lavori consegnati, quasi certamente sbagliato per quelli
aperti — da sciogliere insieme, mai due volte.

**Più indietro, invariato:** linguetta stretta · ondata B «giro clienti» (`/agenda`, `/clienti`,
`/clienti/[id]`) · le voci aperte dal tema (`next-themes` rimovibile, `color-scheme` mai dichiarato,
`safe-area-inset-top`, iOS) · la trappola dell'edge-to-edge · **centro notifiche ULTIMO**.

**Riserve minori lasciate a verbale** (nessuna bloccante, tutte nel ledger e nelle review):
un `codice_paziente` non-stringa viene annullato invece che rifiutato · una PATCH del solo
`codice_paziente` lascia il vecchio codice dentro `cognome` (non raggiungibile dall'interfaccia) ·
`req.json()` senza rete in `pazienti/[id]/route.ts:30` · una PATCH su un paziente di un altro
laboratorio risponde `200 {ok:true}` invece di 404 · `PazienteEditSheet.test.tsx` usa un confronto
per sottoinsieme e non prova che gli altri sei campi sopravvivano all'invio.

---

## 6. 🔑 DIRETTIVA PERMANENTE NUOVA — «Statuto delle fonti» (27/07/2026)

Incisa in `../CLAUDE.md` §7. Nasce da una correzione di Francesco fatta **mentre** una ricerca era
già in mano a tre advisor:

> «lascia perdere le informazioni che hai riguardante il laboratorio di Filippo, era un laboratorio
> di test che usavo per cercare di capire come sviluppare la pwa; ad oggi ogni flusso deve essere
> **testato, confutato, ricercato, deciso e approvato**, e spesso dovremmo fare ricerche in merito e
> brainstorming.»

I documenti di `ANALISI/` che descrivono **come si lavora** — flusso di laboratorio, osservazione di
DentalMaster e derivati — sono **materiale di studio non verificato**. Possono suggerire una
domanda; **non possono chiudere una discussione**, e non vanno mai presentati come «il modo di
lavorare di Francesco» né come prassi accertata del settore.

**Ogni affermazione su come si lavora richiede una fra queste quattro prove:** una fonte esterna
verificabile (con URL) · una prova nel codice (`file:riga`) · un obbligo di legge · una decisione
esplicita di Francesco. In mancanza di tutte e quattro si scrive **«non verificato»**.

⚠️ **NON toccati:** `ANALISI/17` (MDR · FatturaPA · GDPR) e `ANALISI/23` (schema DB) — hanno fonti
primarie proprie e non dipendono da quell'osservazione.

---

## 7. 📌 Quello che questa giornata lascia

> **Le quattro cose che contavano non le hanno trovate i test: le hanno trovate le revisioni e il
> collaudo.**

Tre difetti veri sono usciti dalle review — uno avrebbe stampato il codice del paziente dentro una
Dichiarazione di Conformità; uno era stato **introdotto dalla correzione del precedente**; uno
rendeva la rettifica inutile **proprio per i pazienti che ne avevano bisogno**. Il quarto l'ha
trovato il collaudo dal vivo: il tasto «Salva» spinto fuori dallo schermo da due campi in più.

E il corollario più utile: **quando un difetto ha già una soluzione in casa, si copia quella.** Il
pannello dei clienti risolveva da sempre la sovrapposizione con la barra di navigazione. Non
serviva inventare niente — serviva guardare il gemello.
