# 🌙 Domande per Francesco — notte D168 (2→3 agosto 2026)

> Raccolte **tutte qui**, come vuole la regola della notte. Ognuna con le opzioni e il loro prezzo,
> così si può rispondere in fila. **Nessuna è stata indovinata**: dove serviva una scelta, il lavoro
> è passato alla voce dopo.

---

## D-Q1 — Playwright non gira in nessuna macchina automatica: lo accendiamo? *(nata da P15)*

**Il fatto.** Le prove «a schermo» (quelle che aprono davvero il sito e cliccano) sono **30**, e stanno
in 5 file. Girano **solo se qualcuno le lancia a mano** sul proprio computer: il controllo automatico
che parte a ogni salvataggio (`.github/workflows/ci.yml`) esegue il controllo dei tipi, il controllo
di stile, le 4439 prove veloci e la costruzione dell'app — e **basta**.

**Perché è una domanda e non una correzione.** Accenderle richiede due cose che non decido io:
① una **banca dati raggiungibile** dalla macchina automatica (oggi le credenziali di prova stanno solo
sul tuo Mac, in `.env.local`), ② **minuti di calcolo** che si pagano.

| opzione | cosa si ottiene | prezzo |
|---|---|---|
| **A — non si accende** (come oggi) | niente | le 30 prove restano un'arma che nessuno impugna: se una si rompe, lo scopriamo per caso |
| **B — si accendono solo le «pubbliche»** (login, redirect, PWA, sicurezza delle API: ~20 prove su 30) | il grosso della rete, senza toccare la banca dati | ~3-5 minuti in più a ogni salvataggio; serve comunque il sito acceso nella macchina automatica |
| **C — si accende tutto**, comprese quelle che entrano nel gestionale | rete piena | serve un progetto Supabase **dedicato alle prove** con dati finti (oggi non esiste) + i segreti nella macchina automatica. È mezza giornata di lavoro, e un costo mensile in più |

➡️ **Non fatto stanotte, apposta.** La correzione di P15 fa un'altra cosa (v. sotto).

---

## D-Q2 — I quattro controlli che nessuno ha mai scritto: quali servono davvero? *(nata da P15)*

**Il fatto.** Il file di configurazione delle prove a schermo dichiarava **cinque squadre**, e **tre**
di queste puntavano a file che **non esistono**. Cioè: qualcuno, mesi fa, ha scritto «qui ci vanno le
prove X» e quelle prove non sono mai state scritte. Il risultato è la cosa peggiore: sembrava esserci
una rete, e la rete era un buco dipinto sul muro.

I quattro nomi mai nati, e cosa avrebbero dovuto controllare (dedotto dal nome, non da un documento):

| nome del file mai scritto | cosa controllerebbe | quanto vale, secondo me |
|---|---|---|
| `rls-cross-tenant.spec.ts` | che un laboratorio **non veda i dati di un altro laboratorio** | 🔴 **altissimo** — è la promessa che regge tutto il prodotto |
| `precheck-mdr-errori.spec.ts` | che i controlli di legge prima della consegna blocchino davvero | 🟠 alto — è normativa |
| `consegna-completa.spec.ts` | il giro intero: lavoro → consegna → documento | 🟠 alto |
| `api-coverage.spec.ts` | che ogni porta d'ingresso dell'app rifiuti chi non ha diritto | 🟡 medio (in parte già coperto dalle prove veloci) |

➡️ **Stanotte NON li ho scritti**: sono quattro ondate di lavoro vere, non una correzione. Ho fatto in
modo che la loro **assenza sia scritta e visibile** invece che nascosta in un file che nessuno esegue.

**La domanda:** quale di questi quattro vuoi per primo, quando ci sarà tempo? (Il mio consiglio è
`rls-cross-tenant`, perché è l'unico la cui rottura sarebbe un danno verso un cliente e non verso di noi.)

---

## D-Q3 — Tre documenti non hanno una «data di emissione»: da dove la prendono? *(nata da P9)*

**Il fatto.** Lavorando sul fuso orario dei documenti ho trovato una cosa più seria del fuso stesso.
Quattro documenti — **buono di consegna**, **ricevuta di consegna**, **istruzioni per l'uso**, **scheda
di fabbricazione** — scrivono come data di emissione **l'ora del momento in cui il file viene creato**.
Cioè: se ristampi domani lo stesso buono, quel buono porta la data di domani.

**Perché conta.** Il fuso sbagliato spostava la data di **un giorno**, e solo fra mezzanotte e le due.
Questo la sposta **di quanto vuoi**, ogni volta che il documento viene rigenerato. Su una ricevuta di
consegna la data dice **quando la cosa è successa**.

**Per uno dei quattro la risposta c'è già.** Il buono di consegna ha la sua colonna in banca dati
(`buoni_consegna.data_emissione`): basta usarla, e questo lo faccio senza disturbarti.

**Per gli altri tre serve la tua risposta**, perché quella colonna **non esiste** e la risposta non è la
stessa per tutti e tre:

| documento | possibili sorgenti | il mio parere |
|---|---|---|
| **Ricevuta di consegna** | la data di **consegna effettiva** del lavoro · una colonna nuova «emessa il» | la data di consegna: la ricevuta *attesta* quella |
| **Istruzioni per l'uso** | la data di consegna · la data di **fabbricazione** · nessuna data | è un foglio informativo, non un attestato: forse la data **non ci vuole affatto** |
| **Scheda di fabbricazione** | l'ultima fase eseguita · una colonna nuova | l'ultima fase eseguita: è il registro di ciò che è stato fatto |

⚠️ **Non ho indovinato nessuna delle tre.** Ho corretto solo il **fuso** su tutti e quattro (è un
miglioramento indipendente) e ho lasciato scritto, **accanto a ognuno dei quattro punti nel codice**, che
la sorgente resta da decidere. Voce di roadmap: **P9-bis**.

---

## D-Q4 — 🎨 **LA DOMANDA PRINCIPALE: quale delle tre?** *(P30 — la pagina per correggere un dentista)*

**Tutto il documento sta qui:** `docs/design/2026-08-03-p30-tre-varianti-da-scegliere.md`
**I disegni si aprono nel browser e si toccano davvero:** `docs/design/mockups/2026-08-03-p30-modifica-dentista-{A,B,C}.html`
**40 scatti:** `docs/design/mockups/screenshots/2026-08-03-p30/`

| | in una riga | il prezzo |
|---|---|---|
| 🅰️ **Le righe che si toccano** | vedi tutti i dati, tocchi quello sbagliato, si apre un foglio con **quel solo dato** | correggere 5 dati = 5 aperture |
| 🅱️ **I quattro cartoncini** ⭐ | quattro cartoncini (*Chi è · Dove sta · Per la fattura · Come si lavora insieme*), tocchi quello messo male e sistemi **tutto il gruppo** | nel foglio ci sono 4 caselle, non una |
| 🅲 **La pagina intera** | tutti i 22 campi in pagina, salvi una volta sola in fondo | va contro due regole di casa, e sul telefono si scorre parecchio |

⭐ **Il mio consiglio è la B**, e la ragione è tua: il 27 luglio hai detto che l'addetta al front desk sbaglia
una digitazione e bisogna poter intervenire. **Chi sbaglia il telefono ha spesso sbagliato anche l'email**,
perché li ha copiati insieme dallo stesso foglietto — la A costringe a due giri, la B li prende insieme.
⚠️ **Ma la A ha una cosa che la B non ha:** si può anche solo **guardare**. È già una scheda leggibile.
🔑 **C'è anche una quarta strada:** B per correggere, A come scheda di lettura. Costa un po' di più, e non sceglie.

**E con la variante servono altre tre risposte** (§5 del documento): ① il salvataggio è **subito** (ogni
foglio salva per conto suo) o **alla fine** (tutto o niente)? ② i campi che oggi non si possono correggere
— **tecnico predefinito**, **IBAN**, e i tre interruttori fra cui *«non soggetto a fattura elettronica»*, che
l'app **già mostra** nella scheda — entrano o restano fuori? ③ la pagina ha un **indirizzo suo**
(`/clienti/[id]/modifica`), come il lavoro? (È tutto il senso della voce: serve **poterci mandare qualcuno**.)

---

## D-Q5 — Le etichette dei campi in tema scuro sono un filo sotto la soglia: quale delle due strade? *(P30-bis)*

**Il fatto, misurato stanotte.** Dentro un foglio che sale dal basso, in tema scuro, l'etichetta piccola sopra
la casella (`TELEFONO`, `PARTITA IVA`…) sta a **4,25** contro il **4,5** che la norma di accessibilità chiede.
🔑 **Il colore non è sbagliato:** su tutti gli altri fondi dell'app quello stesso grigio passa. È il **fondo
del foglio**, che è più chiaro, a farlo cadere — e lì nessuno l'aveva mai misurato.

⚠️ **Non riguarda i disegni di P30: riguarda il codice già scritto** — ogni casella dentro ogni foglio
dell'app, procedura guidata compresa.

| opzione | cosa cambia | prezzo |
|---|---|---|
| **A** — l'etichetta usa un grigio più chiaro **solo dentro i fogli** (fatto nei disegni) | passa a 6:1 abbondanti | è uno **scostamento dalla spec** §5.27, che va scritto |
| **B** — si schiarisce quel grigio **ovunque** in tema scuro | una regola sola, nessuna eccezione | ⚠️ **va rimisurato dappertutto**: quel colore è già stato corretto una volta per lo stesso motivo |

---

<!-- Le voci successive si aggiungono qui man mano che nascono. -->
