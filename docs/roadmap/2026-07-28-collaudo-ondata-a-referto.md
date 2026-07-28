# Referto — FASE 9, collaudo nel browser dell'ondata (a) (28/07/2026)

**Chi:** sessione di ripresa da `docs/roadmap/2026-07-28-ondata-a-chiusura-handoff.md`.
**Ramo:** `ondata-a-denti-colore` (74 commit avanti a `main`, albero pulito, **nessun commit di codice
in questa sessione**).
🛑 **Il merge NON è stato fatto: lo autorizza Francesco.**

---

## 0. Esito in una riga

**Le cinque prove del collaudo sono passate tutte**, provate nell'applicazione vera con richieste
HTTP vere e verificate ogni volta contro la banca dati.
🔴 **MA c'è un difetto NUOVO, dell'ondata, trovato dopo le cinque prove: le frasi nuove non arrivano
all'utente — al loro posto compare «⚠ Errore — riprova».** Dettaglio e prova in **§4.0**. Nessun dato
si perde (il salvataggio viene fermato correttamente), si perde **il perché**. **La correzione è una
riga e la finestra è adesso: decide Francesco.**
Due rilievi trovati per strada sono **preesistenti** (i file non sono toccati dal ramo) e tre difetti
**già censiti** sono stati confermati dal vivo.
**Database riportato esattamente alla baseline: 294 lavori · 0 righe in `lavori_denti` · 916 pazienti
· 48 colori.**

---

## 1. Come si è entrati (dichiarato, come chiede l'handoff §2)

Utente **sintetico** dell'E2E: `e2e-titolare@ua-test.local`, credenziale **versionata nel repo**
(`scripts/seed-e2e.ts:201`), creata dal seed per i test automatici, dominio `.local` inesistente.
**Non è la credenziale di una persona.** Scelta approvata da Francesco prima di iniziare.

⚠️ **Fatto nuovo, che smentisce un timore dell'handoff:** l'accesso via **browser** con quell'utente
**funziona** (login → `/dashboard`). Il problema noto della voce 58 («l'accesso E2E non ha mai avuto
una sessione») riguarda la **configurazione di Playwright** (`TEST_USER_EMAIL` vs `TEST_EMAIL`), non
la credenziale in sé.

---

## 2. Le cinque prove — esito e prova

Ambiente: `preview_start {name: "ua-dev"}` → Next 16.2.6, pronto in **291 ms**, `/login` 200.
🔑 **Il primo avvio è anche la prova che la rimozione di gstack (53 cartelle) non ha toccato niente di
vivo**: il server parte e serve le pagine.

| # | Prova | Esito | Evidenza |
|---|---|---|---|
| 1 | Creazione con dente e colore | ✅ | `2026/0014`: riga in `lavori_denti` (`fdi 26`, `provenienza 'prescritto'`), `colore_codice 'A3'`, `colore_scala 'vita_classical'`, `denti_coinvolti ['26']`. Riaperta la scheda: odontogramma col **26 acceso** e **COLORE DENTE = A3** |
| 2 | Colore digitato male (`A3,5`, virgola) | ✅ | `2026/0015`: **l'avviso compare** («Non sono riuscita a salvare il colore. Lo aggiungi dalla scheda.») e **il lavoro nasce lo stesso** — dente 11 salvato, colore `NULL` |
| 3 | Modifica → salva → **ricarica** | ✅ | Aggiunto il 27: dopo il ricaricamento 26+27 ancora lì. Azzerato il colore: sparito **da tutti i posti** (`lavori_denti.codice` NULL su entrambi **e** `lavori.colore_codice`/`colore_scala` NULL) e **non riappare** dopo il ricaricamento. Era la coda del 12-bis |
| 4 | Rifacimento eredita denti e colore | ✅ | `2026/0016` nato **con 26 e 27 e colore `C2` (scala `vita_classical`) su entrambi**, più `denti_coinvolti ['26','27']`. Era **G1**, il difetto più grave della revisione |
| 5 | Due salvataggi di fila | ✅ | 4 cicli `PUT /denti` + `PATCH`, **tutti 200**, nessun 409 e nessun avviso «qualcun altro ha modificato». L'ultimo salvataggio consecutivo (senza ricaricare in mezzo) è passato |
| 5-bis | **Il controllo di conflitto scatta davvero** (controllo positivo, R-P1) | ✅ | `PUT /denti` con `atteso_updated_at: '2020-01-01T00:00:00Z'` → **409** `{"error":"Il lavoro è stato modificato da qualcun altro","updated_at":"2026-07-26T06:18:02.140876+00:00"}`. **E non ha scritto nulla**: `updated_at` del lavoro invariato, baseline invariata |

🔑 **Perché la 5-bis esiste.** La prova 5 da sola dimostra che il controllo **non scatta a sproposito**,
non che scatti quando deve — e un controllo inerte sarebbe **peggio** del falso allarme che cercava di
escludere (due tecnici sulla stessa scheda si sovrascriverebbero in silenzio). È la regola R-P1: un
vincolo si prova con **un valore che DEVE essere rifiutato**. Stessa lezione della §4.2.
⚠️ Una prova intermedia ha risposto **404** invece di 409: il lavoro scelto era **di un altro
laboratorio** — cioè l'isolamento fra laboratori che si comporta come deve (404, non 403).

**Comportamento osservato e coerente col disegno:** salvando dalla scheda, il colore «di caso» viene
riscritto **sulle righe dei denti** e le colonne del lavoro restano nulle — «il caso si scrive dove
si legge». La provenienza passa da `prescritto` a `eseguito`.

⚠️ **Dichiarato:** per far comparire il tasto «Crea rifacimento» il lavoro di prova è stato portato a
stato `pronto` **con una UPDATE diretta** (`SchedaLavoroV3.tsx:201` lo mostra solo per
`consegnato|pronto|sospeso`). Dato di test, riga poi cancellata.

---

## 3. I tre schermi, i due temi

Superficie provata a tutti e sei i tagli: la **scheda clinica** (odontogramma + colori), cioè ciò che
l'ondata rende leggibile. ⚠️ **Il wizard e l'avviso sono stati visti solo a 390 chiaro** — non a 768,
1280 né in scuro.

| | 390 | 768 | 1280 |
|---|---|---|---|
| **chiaro** | ✅ | ✅ | ⚠️ v. §4.2 |
| **scuro** | ✅ | ✅ | ⚠️ v. §4.2 |

🔑 **La frase nuova a 390px NON si tronca**: «Non sono riuscita a salvare il colore. Lo aggiungi dalla
scheda.» sta in **due righe piene** dentro `Avviso.tsx`. Il rischio segnalato nell'handoff §3 **non si
verifica su questa frase** (resta aperto per la variante più lunga, con tutti e tre gli accessori).

⚠️ **Screenshot non archiviati su disco:** sono nella conversazione, non in
`docs/design/screenshots/`. Il **gate estetico L2 (FASE 9b) è derogato di proposito** per
quest'ondata (handoff §2), quindi l'archivio non è dovuto qui; se serve, si produce nell'ondata (b).

---

## 4. Ritrovamenti — riferiti e NON toccati (R-E2)

### 4.0 🔴 NUOVO, DELL'ONDATA — le frasi nuove non arrivano all'utente

**Come è stato trovato:** provando a schermo la seconda delle tre frasi dell'handoff §3 (le uniche
cose visibili dell'ondata), che fino a quel momento **non era mai stata vista rendered**.

**Il repro, sulla scheda clinica di un lavoro senza denti selezionati:** si imposta `COLORE COLLO` e
si salva. Il salvataggio **viene fermato correttamente** (nessuna richiesta parte — verificato nei
log del server: nessuna `PUT /denti` dopo il gesto), quindi **nessun dato si perde**. Ma a schermo
compare **solo** `⚠ Errore — riprova` sul tasto Salva. **La frase progettata non è da nessuna parte
nella pagina** (verificato cercando il testo in `document.body.innerText`: non trovato).

**Perché.** Le frasi nuove passano tutte da `setSaveError(...)` in `src/hooks/useLavoroForm.ts`
(riga 141 «Le zone del colore…», riga 162 «Colore «X» non riconosciuto…», riga 279 «Qualcun altro ha
modificato questo lavoro…»). Chi le mostra è `LavoroFormClient.tsx:357`, sotto la condizione
**`saveError && !isDirty`** — e dopo un salvataggio fallito il form **è** ancora modificato, quindi
`isDirty` è vero e il paragrafo `role="alert"` (riga 376) **non viene mai reso**. Resta solo
l'etichetta del tasto (riga 353).
**Prova che `isDirty` è vero in quel momento:** nel DOM il tasto mostra `⚠ Errore — riprova` (quindi
`saveError` è valorizzato) **e** il paragrafo d'errore è assente — le due cose insieme sono vere solo
se `!isDirty` è falso.

**Di chi è la colpa, con onestà:** la condizione `saveError && !isDirty` **c'era già in `main`**
(verificato con `git show main:…`). È l'ondata a mandarci dentro i messaggi nuovi: prima quel canale
serviva a un altro caso. Quindi il difetto **nasce con l'ondata** anche se la riga è vecchia.

⚠️ **Provato per la frase delle zone. Per le altre due NON è stato osservato a schermo** — passano
dalla stessa `setSaveError` e quindi hanno lo stesso destino, ma questa è un'inferenza dal codice,
non una misura. Dichiarato, non nascosto.

**Perché conta:** l'handoff §3 chiama queste frasi «le uniche cose visibili di tutta l'ondata». Se
non compaiono, l'utente legge «riprova», riprova, e riottiene lo stesso — senza mai sapere che deve
selezionare un dente. **Il rischio è di comunicazione, non di dato.**

### 4.1 Disallineamento di idratazione sulla home — **preesistente**
`LinguettaCassette` dentro `StanzePager` (`HomeV3`): il ramo di pagina che il server prepara e quello
che il browser ricostruisce non coincidono (`<div data-ds="v3" style="display:contents">` in più sul
client), e React rigenera quel ramo. Visibile nel pannello di sviluppo di Next («1 Issue»).
**Notato anche da Francesco durante il collaudo.**
**Perché è preesistente — due argomenti, entrambi dichiarati per quello che valgono:**
① sull'**intero** ramo (75 file cambiati) `git diff --name-only main...HEAD` non contiene **nessun**
percorso che nomini dashboard, home, stanze, linguetta o cassette: il ramo non tocca né quei
componenti né la loro via dei dati;
② l'errore catturato è un `<div data-ds="v3" style="display:contents">` **in più sul client**, cioè
una differenza **di struttura**, non di dati — quindi non è il tipo di guasto che un cambio di
modello dati può provocare.
⚠️ **Non verificato eseguendo `main`** (richiederebbe cambio di ramo + ricompilazione, e `.next`
stantio è una trappola nota): l'affermazione poggia sul diff e sulla natura dell'errore, non su
un'esecuzione.
**Casa:** ondata (b) o coda della roadmap.

### 4.2 A 1280×800 due campi colore sono coperti finché non si scorre — **preesistente**
**Misurato**, non visto a occhio: in cima alla pagina, `document.elementFromPoint` sul centro di
**COLORE CORPO** e **COLORE INCISALE** restituisce un `DIV` **sticky** (`z-index 10`,
`pointer-events: auto`, sfondo trasparente, 1265×76) — la fascia in fondo che porta il tasto 📦.
**Dopo uno scorrimento di 300px tutti e quattro i campi risultano liberi** (pagina alta 1352 su
finestra 800). Quindi: **fastidio, non blocco**. A 390 e 768 non si verifica.
🔑 **Nota di metodo, da tenere:** il primo tentativo di prova (contare i `mousedown` sul campo) ha
dato 0 **anche sul campo NON coperto** — cioè il controllo positivo ha smascherato una misura che non
misurava nulla. Vale la regola già scritta: un test che non può fallire non è una rete.
**Casa:** ondata (b) — è materiale da gate estetico L2, qui derogato.

### 4.3 Il tema segue la preferenza di sistema solo al caricamento — minore
Cambiando chiaro/scuro a pagina aperta, `data-theme` resta quello di prima finché non si ricarica.
Potrebbe essere voluto (un tema deciso lato server). **Non indagato.**

### 4.4 Due difetti GIÀ CENSITI, ora confermati dal vivo
- **`incidenti_mdr` non viene scritto dal rifacimento**: creato un rifacimento vero, la tabella
  resta a **0 righe** per quel lavoro. Una non conformità non lascia traccia MDR. *(era già in coda
  alla roadmap; ora ha la sua prova)*
- **Route e funzione non concordano sugli stati**: `rifacimento/route.ts:136` rifiuta solo
  `annullato`, mentre la funzione viva `crea_rifacimento_atomico` accetta solo
  `('consegnato','pronto','sospeso')` (letto da `pg_proc.prosrc`) → da ogni altro stato esce un 500
  col messaggio del database. *(già censito)*
- **L'originale non viene annullato**: dopo il rifacimento, `2026/0014` è rimasto `pronto`. *(già
  censito)*

---

## 5. Pulizia — eseguita e verificata

Creati e poi rimossi: **3 lavori** (`2026/0014`, `0015`, `0016`), **5 righe** in `lavori_denti`,
**1 riga** in `lavori_rifacimenti`, **2 pazienti**.
Verifica finale: `294 lavori · 0 denti · 916 pazienti · 48 colori` = **baseline esatta**.
⚠️ I progressivi bruciati (0014-0016) non tornano indietro: atteso e innocuo su dati di test.

---

## 6. Cosa resta

0. 🔴 **DECISIONE DI FRANCESCO, prima del merge: si corregge §4.0 adesso o va in coda?** È una riga
   (la condizione `!isDirty` a `LavoroFormClient.tsx:357`), e riguarda **le uniche tre frasi visibili
   di tutta l'ondata**. Correggerla ora costa poco; dopo il merge diventa un'altra ondata. ⚠️ La
   correzione va **provata**, non solo scritta: rifare il repro di §4.0 e vedere la frase a schermo,
   più un controllo che il messaggio sparisca quando si riprende a scrivere.
1. 🛑 **Merge — lo autorizza Francesco.** `git checkout main && git merge ondata-a-denti-colore`
2. Push → **attendere CI verde** → verificare `uachelab.com`
3. **BP-1 finale**: spostare la voce 58 di `MEMORY.md` da «sul ramo» a «in produzione» e chiudere la
   voce 1 della `ROADMAP-UFFICIALE.md`

🛑 **Da ricordare al merge:** le migration sono **già applicate sul database vivo**, `DROP COLUMN`
compreso. Il codice si annulla con un `revert`, lo schema no.
