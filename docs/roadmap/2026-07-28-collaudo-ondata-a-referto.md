# Referto — FASE 9, collaudo nel browser dell'ondata (a) (28/07/2026)

**Chi:** sessione di ripresa da `docs/roadmap/2026-07-28-ondata-a-chiusura-handoff.md`.
**Ramo:** `ondata-a-denti-colore` (74 commit avanti a `main`, albero pulito, **nessun commit di codice
in questa sessione**).
🛑 **Il merge NON è stato fatto: lo autorizza Francesco.**

---

## 0. Esito in una riga

**Le cinque prove del collaudo sono passate tutte**, provate nell'applicazione vera con richieste
HTTP vere e verificate ogni volta contro la banca dati. **Nessun difetto nuovo introdotto
dall'ondata.** Due rilievi trovati per strada sono **preesistenti** (i file non sono toccati dal
ramo) e due difetti **già censiti** sono stati confermati dal vivo.
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

**Comportamento osservato e coerente col disegno:** salvando dalla scheda, il colore «di caso» viene
riscritto **sulle righe dei denti** e le colonne del lavoro restano nulle — «il caso si scrive dove
si legge». La provenienza passa da `prescritto` a `eseguito`.

⚠️ **Dichiarato:** per far comparire il tasto «Crea rifacimento» il lavoro di prova è stato portato a
stato `pronto` **con una UPDATE diretta** (`SchedaLavoroV3.tsx:201` lo mostra solo per
`consegnato|pronto|sospeso`). Dato di test, riga poi cancellata.

---

## 3. I tre schermi, i due temi

Superficie provata: la **scheda clinica** (odontogramma + colori), cioè ciò che l'ondata rende
leggibile, più il wizard e l'avviso.

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

### 4.1 Disallineamento di idratazione sulla home — **preesistente**
`LinguettaCassette` dentro `StanzePager` (`HomeV3`): il ramo di pagina che il server prepara e quello
che il browser ricostruisce non coincidono (`<div data-ds="v3" style="display:contents">` in più sul
client), e React rigenera quel ramo. Visibile nel pannello di sviluppo di Next («1 Issue»).
**Notato anche da Francesco durante il collaudo.**
**Perché è preesistente:** `git diff --stat main...HEAD` su `LinguettaCassette`/`StanzePager`/`HomeV3`
e su `src/components/features/lavori/scheda-v3/`, `src/components/ds/`, `dashboard/` è **vuoto** —
il ramo non tocca nessuno di quei file. ⚠️ **Non verificato eseguendo `main`** (richiederebbe cambio
di ramo + ricompilazione): l'affermazione poggia sul diff, non su un'esecuzione.
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

1. 🛑 **Merge — lo autorizza Francesco.** `git checkout main && git merge ondata-a-denti-colore`
2. Push → **attendere CI verde** → verificare `uachelab.com`
3. **BP-1 finale**: spostare la voce 58 di `MEMORY.md` da «sul ramo» a «in produzione» e chiudere la
   voce 1 della `ROADMAP-UFFICIALE.md`

🛑 **Da ricordare al merge:** le migration sono **già applicate sul database vivo**, `DROP COLUMN`
compreso. Il codice si annulla con un `revert`, lo schema no.
