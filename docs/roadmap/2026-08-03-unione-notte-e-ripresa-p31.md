# L'unione della notte è in produzione — e si riparte da P31

**Per:** Francesco, e per la sessione nuova a contesto pulito.
**Quando:** lunedì **3 agosto 2026**, dalle **11:56** (`provato:` `date` → `2026-08-03 11:56:48 CEST`).
**Stato:** ✅ **`main` = `8d06ea5b`**, pubblicato (`fdf90dac..8d06ea5b`).

> 📅 **Sulla data del nome:** oggi è **davvero** il 3 agosto (`date`, D155/§0F). ⚠️ Nell'archivio
> esistono altri file `2026-08-03-*` nati l'**1 agosto**, dalla vecchia deriva di date: la
> distinzione è dichiarata in `../../CLAUDE.md` §0F e non si ricava dal nome.

---

## 0. 🔴 LE COSE DA SAPERE PRIMA DI TUTTO

### ① ✅ **La precondizione più pericolosa della notte è ESEGUITA — e provata in quattro modi**

`bash scripts/installa-salvataggio-programmato.sh` è stato lanciato **subito dopo l'unione**, prima di
ogni altra cosa, come chiedeva il referto della notte
(`docs/roadmap/2026-08-03-notte-autonoma-referto.md` §0①).

🛑 **Ma l'installatore che esce 0 non prova niente**, ed è precisamente la forma del difetto che P23
esisteva per chiudere: uno script che stampa «✅ salvataggio completo» inghiottendo il fallimento.
Quindi quattro prove indipendenti:

| # | prova | esito |
|---|---|---|
| ① | `guardia-salvataggio-installato.mjs` **prima** dell'installatore | ❌ **2 disallineamenti** — e stavolta il rosso era **VERO**: la copia installata era del **02/08 alle 12:04**, cioè precedente a tutta P23 |
| ① | la stessa guardia **dopo** | ✅ `copia allineata al progetto` |
| ② | `diff` byte-per-byte sui tre file (`salvataggio-database.sh` · `salvataggio-archivio.mjs` · `salvataggio-programmato.sh`) | ✅ **identici** |
| ③ | **la logica della REVISIONE dentro la copia che gira di notte**, non solo la prima correzione | ✅ `scarto += pagina.length` (riga 131, **non** `+= 1000`) · `if (pagina.length === 0) break` (riga 130 — arresto sulla pagina **vuota**) · `set -euo pipefail` (riga 41 di `salvataggio-database.sh`) |
| ④ | `launchctl print gui/$(id -u)/com.uachelab.salvataggio-database` | ✅ punta alla **copia**, `Hour 3` / `Minute 0`, `watching = 1` |

🔑 **La prova vera è la transizione ①: rosso→verde.** Il verde da solo non distingue «riparato» da «non
guardato» — prima dell'unione quel rosso sarebbe stato **falso** (la copia corrispondeva a `main`, cioè
allo stato approvato), dopo l'unione è **vero**. È il passaggio a portare l'informazione, non lo stato.

### ② ⚠️ **Il conteggio dei salvataggi era sbagliato in DUE documenti**

`MEMORY.md` diceva **nove**, `SESSION_ACTIVE.md` diceva **dieci**, il messaggio di apertura diceva
**undici**. Il numero vero è **11**, e i tre numeri sono tutti spiegabili:

> **11 salvataggi = 9 correzioni + il referto di chiusura (`7a540fa3`) + il verbale D177-D180 (`21553bcf`)**

**Nove** è il conteggio delle *correzioni*, non di ciò che entra in `main`. ✅ Corretto in entrambi i
documenti. 🔑 **Non è cosmesi:** è l'elenco che qualcuno rileggerà se qualcosa va storto in produzione,
e allora un numero che non torna costringe a rifare da capo il lavoro di capire cosa è entrato.

### ③ 🔎 **UN RITROVAMENTO FUORI MANDATO (R-E2): il difetto di P31 è più largo di come la roadmap lo descrive**

La voce P31 cita **un** punto che manda WhatsApp col telefono del cliente. `provato:` ce ne sono **tre**,
e **tre** altri lo usano nel senso opposto:

| uso | dove |
|---|---|
| 📱 **serve il CELLULARE** (WhatsApp) | `src/lib/consegna/orchestrate.ts:123` (consegna) · `src/components/features/scadenzario/EstrattoContoView.tsx:223-224` (sollecito) · `src/components/features/scadenzario/ScadenzarioList.tsx:85` (sollecito) |
| ☎️ **serve il NUMERO DELLO STUDIO** | `src/components/features/scadenzario/ClienteInfoCard.tsx:54` (ci costruisce sopra un `href="tel:"`) · `src/app/(app)/clienti/[id]/page.tsx:294` (riga «Telefono») · `src/components/features/clienti/ClientiSearchList.tsx:243-252` (elenco) |

Più la vista SQL `cliente_telefono` (`supabase/schema.sql:2405`) e i due punti che la leggono
(`src/lib/contabilita/queries.ts:38` · `src/lib/dashboard/queries.ts:157`).

🔑 **Lo stesso campo è già oggi in aperta contraddizione in sei posti.** ⚠️ È la lezione ⑤ della notte
(«un elenco completo non lo è») per la **quarta** volta — e stavolta l'elenco incompleto stava in una
voce di roadmap scritta **il giorno prima**, cioè nel momento in cui un elenco sembra più affidabile.
📌 **Riferito, non corretto:** la voce di roadmap è stata aggiornata coi sei punti; il codice **non è
stato toccato** — è mandato di P31.

### ④ 🛑 **UN DIFETTO INTRODOTTO E CHIUSO NELLA STESSA MEZZ'ORA — e vale come lezione**

Aggiornando `memory/SESSION_ACTIVE.md` ho puntato il **punto di ripresa** su `memory/MEMORY.md`.
`guardia-coerenza-documenti.mjs` è passata da «**7 documenti vivi controllati**» a «**1**», **restando
verde**.

**Perché.** La guardia non elenca i documenti vivi: li **segue**, partendo da `SESSION_ACTIVE.md` e
facendo due salti. E gli **archivi** (`MEMORY.md`, `ROADMAP-UFFICIALE.md`) sono esclusi dalla catena
apposta — hanno un trattamento a parte, «solo la testa» (righe 179-189 dello script). Puntare la porta
d'ingresso su un archivio **svuota la catena**: la guardia non ha più niente da controllare, e non
avendo trovato errori dice ✅.

🔑 **È la stessa forma di P15**, il difetto che quella notte ha chiuso: *un progetto Playwright che non
trova nessun file lo esegue vuoto e ne esce VERDE.* Qui era una **guardia** che non trovava nessun
documento. ⚠️ **E si vede solo guardando il NUMERO, non il colore** — il colore era giusto in entrambi i
casi.

✅ **Chiuso da questo documento stesso:** il punto di ripresa torna a essere un documento vivo di
`docs/roadmap/`, e la catena si riempie. **La verifica è il conteggio, non il verde.**

🛑 **MA IL DIFETTO VERO NON È QUELLO, ed è aperto come voce `P32`.** `SALTI` è **fisso a 2**: questo
documento, mettendosi **fra** la porta e il referto della notte, ha **spinto giù di un anello** tutto ciò
che stava sotto — e i tre documenti in fondo (verbale delle decisioni, domande, piani) sono scivolati al
terzo salto, cioè **fuori dal controllo, in silenzio**. `misurato:` **4** documenti vivi, non 7. Rimediato
a mano citandoli direttamente (§2), **ma la prossima sessione che scrive un handoff rifarà lo stesso buco
senza saperlo.** 🔑 **Una lezione scritta solo nel documento che l'ha causata non arriva a chi scrive il
prossimo:** per questo sta in `ROADMAP-UFFICIALE.md` come **P32**, con tre strade e il perché la seconda
è l'unica che non chiede a nessuno di ricordarsi di niente.

---

## 1. Che cosa è stato fatto

| | |
|---|---|
| ✅ **Unione (D177)** | `p30-secondo-motore-e-bersagli` → `main` con **nodo di unione esplicito** (`--no-ff`). `main` era un antenato pulito, quindi il salto diretto avrebbe funzionato — ma undici salvataggi che atterrano insieme sul ramo che pubblica in produzione meritano **un solo punto di ritorno** (`git revert -m 1`) invece di undici. Costo: zero |
| ✅ **Installatore del salvataggio** | eseguito **per primo**, verificato quattro volte (§0①) |
| ✅ **Le guardie sull'ALBERO UNITO** | 🔑 **nessuno le aveva mai eseguite lì:** sei salvataggi su undici avevano scavalcato il gancio del commit (per la ragione buona e scritta nel referto della notte §0③), quindi il gruppo completo aveva girato solo sui singoli rami, mai sull'unione. Esiti: coerenza documenti **verde** (7 documenti vivi) · progetti Playwright **verde** (2 progetti, 5 file) · CSRF **verde** · conformità DS **verde** · reduced-motion **verde** |
| ✅ **FASE 7 sull'unione** | `tsc --noEmit` → **0** · `vitest run` → **4490 passate \| 19 saltate** (384 file passati \| 3 saltati) · `next build` → **uscita 0**. 🔑 **Numeri IDENTICI alla misura di chiusura della notte**, ed è il confronto a essere la prova: i rami erano stati misurati uno per uno, l'unione no |
| ✅ **Pubblicazione** | `git push origin main` → `fdf90dac..8d06ea5b`. ⚠️ **`origin/main` era a `fdf90dac`, non a `89541135`:** c'era **un** salvataggio locale mai pubblicato, il documento di chiusura della sessione precedente — fatto **già dichiarato** nella memoria (blocco 123) e non un buco |
| ✅ **CI e CD** | CI **verde** (7m55s, `30804080068`) · CD — Deploy to Vercel **verde** (3m3s, `30804654361`) |

### 1-bis. ✅ La verifica su `uachelab.com` — fatta col banco vero (D103), non col solo `curl`

🛑 **Che il sito risponda `200` non prova che sia il codice nuovo:** la notte non ha toccato **nessuna
pagina pubblica**, quindi non esiste un marcatore osservabile da fuori. Serviva entrare, e le credenziali
sono in `.env.local` (**D103**): link d'accesso **monouso**, `npx tsx scripts/tmp/link-accesso.ts`.

**Tre cose provate in un colpo solo, sulla scheda di `STUDIO ODONTOIATRICO PIEGARI GIANFRANCO`:**

1. ✅ **IL VUOTO DICHIARATO NEL REFERTO DELLA NOTTE È CHIUSO.** §0④ diceva: «*la scheda risponde 200 e
   resta sullo scheletro di caricamento; il contenuto non arriva mai. Causa non identificata*».
   `provato:` **in produzione la scheda si carica per intero** — anagrafica, dati fiscali, commerciale,
   portale dentista, privacy GDPR. 🔑 **Era la lentezza della prima compilazione in locale, non un
   difetto:** l'ipotesi meno allarmante era quella giusta, ma **solo perché è stata verificata**.
2. ✅ **P18 verificata dal vivo:** il collegamento del portale è
   `https://uachelab.com/richiedi/7b67ac4c-…` — **dominio canonico**. ⚠️ **Con un limite dichiarato:** in
   produzione l'origine della navigazione **coincide già** col dominio giusto, quindi questa prova
   mostra che il link è **corretto**, non che sia **indipendente** da dove si naviga. Quella proprietà è
   provata dalle prove unitarie, non da qui.
3. 🔴 **P31 NON È PIÙ TEORICA — c'è un dato vero che la mostra.** `provato:` il campo **TELEFONO** di
   quello studio vale **`097671439`**, e `0976` è il prefisso di **Muro Lucano (PZ)** — coerente con
   l'indirizzo della stessa scheda, «*VIA ROMA, 12, 85054, MURO LUCANO, PZ*». 🛑 **È un numero FISSO in
   un campo che lo schema dichiara «Usato per WhatsApp».** 🔑 **Questo cambia il peso di P31:** non è un
   difetto latente in attesa di un caso limite, è un difetto **già mordente su un dato già inserito**.
   🔄 **CORRETTA la sera stessa — la prima stesura di questa riga diceva «*non arriverebbe a nessuno, e
   nessuno se ne accorgerebbe, perché il messaggio parte lo stesso*». Era una DEDUZIONE, non una misura.**
   `provato:` `buildWhatsappUrl` (`src/lib/consegna/whatsapp-template.ts:35-40`) costruisce
   `https://wa.me/<solo le cifre>` — quindi il collegamento **si forma** e **si apre**; `curl` mostra che
   `wa.me` reindirizza a `api.whatsapp.com` **allo stesso modo** per un fisso, per un cellulare senza
   prefisso e per uno col prefisso: **la validazione avviene nell'app, non nel server**. 🛑 **Che cosa
   veda esattamente chi preme — un errore, una chat vuota, nient'altro — NON È VERIFICATO**, e per
   verificarlo serve un telefono vero. **Resta un vuoto dichiarato**, non un fatto.
   ⚠️ **E la deduzione sbagliata rendeva il difetto più drammatico di quanto sia provato**: è la forma
   della lezione ① della notte (*una misura sorprendente si smonta prima di crederle*) applicata a una
   frase **mia**.

---

## 2. Da dove ripartire

**L'ordine è di Francesco (D180) e non si scambia:**

1. **P31** — il telefono dello studio ≠ cellulare WhatsApp. **Difetto vivo**, tocca la banca dati
   (migration + `gen types` + **FASE 6b**), quindi **dominio critico → percorso GRANDE**. Va per primo
   perché **un campo che si sdoppia cambia la schermata** di P30.
   📌 Il censimento di §0③ è il punto di partenza: **sei** punti d'uso, non uno.
2. **P30-a** — **ricerca** chiesta da Francesco: l'anagrafica del cliente non è mai stata progettata,
   sono le colonne che c'erano. Cosa serve davvero a uno studio odontoiatrico e a un **laboratorio
   committente** (`clienti.laboratorio_odontotecnico` esiste già come flag), cosa impongono
   fatturazione elettronica e MDR, e cosa va **tolto**. Guardare anche perché `pazienti` tiene
   `nome_cognome TEXT` in un campo solo e `clienti` li tiene separati — nessun documento dice perché.
3. **P30-b** — con la variante A, scheda e modifica sono quasi la stessa pagina: decidere se diventa
   **una sola**, e come ci si arriva dal tasto «Aggiungi il dato».
4. **POI il React di P30**, sul disegno 🅰️ già approvato.

❓ **Restano due domande minori:** **D-Q2** (quale prova a schermo scrivere per prima — il consiglio
resta: quella che un laboratorio **non veda i dati di un altro**) e **D-Q5** (le etichette dei campi in
tema scuro, oggi a 4,25 contro 4,5 — v. **P30-bis**).

📎 **Documenti da leggere:** il referto della notte
(`docs/roadmap/2026-08-03-notte-autonoma-referto.md`, §0 e §3) · il documento delle tre varianti
(`docs/design/2026-08-03-p30-tre-varianti-da-scegliere.md`) · le voci **P31 · P30-a · P30-b · P30 ·
P30-bis** in `docs/roadmap/ROADMAP-UFFICIALE.md` · il verbale delle decisioni
(`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`) · le domande come erano state poste
(`docs/roadmap/2026-08-03-notte-autonoma-domande.md`) · i due piani della notte
(`docs/roadmap/2026-08-03-notte-autonoma-piani.md`).

> 🛠️ **Perché quei tre ultimi sono citati QUI e non solo dentro il referto.**
> `guardia-coerenza-documenti.mjs` segue la catena dei documenti vivi per **due salti** a partire da
> `memory/SESSION_ACTIVE.md`. Questo documento si è messo **in mezzo**, fra la porta e il referto: senza
> queste tre citazioni dirette i documenti in fondo alla catena scivolano al terzo salto e **smettono di
> essere controllati**, in silenzio. `misurato:` **4** documenti vivi senza queste righe, **7** con.
> 🔑 **È lo stesso difetto di §0④, un piano più in là:** lì la catena si era svuotata, qui si sarebbe
> **accorciata** — e il colore sarebbe stato verde in entrambi i casi. **Un documento nuovo in cima alla
> catena costa un anello a tutti quelli sotto.**

📌 **180** decisioni in **66** tornate; la prossima è **D181**. L'unione è **esecuzione di D177**, non
una decisione nuova: non prende un numero.
