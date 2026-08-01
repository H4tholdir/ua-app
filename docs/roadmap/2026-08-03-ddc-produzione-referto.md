# Referto — la Dichiarazione di Conformità guardata USCENDO DALLA PRODUZIONE (§0 dell'handoff del 3 agosto)

**Esito: ✅ PROVATO.** Una DdC emessa da **https://uachelab.com** dopo il rilascio degli accenti porta
**tutti e otto** i criteri verdi: il titolo con la `À`, l'etichetta del PRRC con la `à`, la frase «è
conforme», il **§2** al suo posto nella numerazione, e i **metadati del file** in forma accentata.
Una pagina sola, sezioni `§1 → §8` senza buchi.

**Chiude:** `docs/roadmap/2026-08-03-accenti-documenti-handoff.md` **§0**, per intero.

⚠️ **Sulla data.** L'orologio della macchina dice **1° agosto**; i documenti del progetto seguono la
serie del **3 agosto**, e questo referto tiene quel nome — **non c'è nulla che provi che il progetto sia
passato al 4**, e una data inventata è peggio di una ferma. **Il fatto misurato resta quello
dell'orologio della macchina:** la dichiarazione emessa oggi porta stampato **01/08/2026**. È l'orologio
della macchina che finisce sul documento a valore legale, non quello dei nomi dei file (già misurato il
03/08, riconfermato oggi).

---

## 1. Prima di premere — i due controlli, e la rete provata rompendola

**I due controlli senza i quali la prova non prova niente** (handoff §0, `CLAUDE.md` §9):

| controllo | fonte | esito |
|---|---|---|
| stato `pronto`/`in_ritardo` | `src/lib/consegna/costanti.ts:4` | ✅ `TEST-DdC-001` era `pronto` |
| **nessuna** DdC con stato ≠ `annullata` | guard di idempotenza `generate-ddc.ts:85-95` | ✅ **zero** — le due esistenti erano entrambe `annullata` |

`provato:` `npx tsx scripts/tmp/censisci-consegnabili.ts` → **`TEST-DdC-001` è l'UNICO candidato** del
banco: 57 lavori in stato `pronto`/`in_ritardo`, 56 dei quali fermati dal precheck MDR per **paziente
assente** (elemento 4 dell'Allegato XIII).

### La rete di lettura è stata provata su un foglio che DEVE fallire

Il lettore unico (`scripts/tmp/dopo-consegna.ts`) scarica il PDF dall'archivio, ne verifica l'impronta,
ne estrae il testo e applica **otto criteri scritti prima di guardare**. È stato fatto girare **sul
foglio vecchio**, `DDC-2026-0002`, emesso ieri **prima** della correzione:

```
DEVE contenere «DICHIARAZIONE DI CONFORMITÀ»           🔴 MANCA
DEVE contenere «Responsabile della Conformità»          🔴 MANCA
DEVE contenere «è conforme»                             🔴 MANCA
DEVE contenere «§2 — DATA DI EMISSIONE»                 🔴 MANCA
DEVE contenere «§7 — DICHIARAZIONE DI CONFORMITÀ»       🔴 MANCA
NON deve contenere «DICHIARAZIONE DI CONFORMITA»        🔴 PRESENTE
NON deve contenere «e' conforme»                        🔴 PRESENTE
NON deve contenere «Conformita (PRRC)»                  🔴 PRESENTE
paragrafi numerati trovati: 1 · 3 · 4 · 5 · 6 · 7 · 8   ← il §2 non c'è
```

**Otto rossi su otto.** La rete reagisce: non è una rete che dice sempre verde (lezione ① dell'handoff).

🔑 **Un criterio è stato buttato perché passava sul foglio vecchio.** Il primo tentativo cercava
«Data di emissione» — che compare **già** in testa e in calce anche nella versione senza il §2, quindi
dava ✅ su un foglio che il §2 non ce l'ha. Sostituito col **titoletto vero**, `§2 — DATA DI EMISSIONE`,
che lo stile rende maiuscolo. Trovato provando, non rileggendo.

### La valvola di sicurezza per l'annullo, provata prima di servire

Se il banner dell'annullo si perde (un ricarico, una navigazione, il browser che salta), la finestra di
dieci minuti scade e **la consegna diventa definitiva**: è l'unica cosa non reversibile del giro.
Preparata `scripts/tmp/annulla-fallback.ts`, che chiama la **stessa** RPC transazionale della route
(`annulla_consegna_atomica`, `src/app/api/lavori/[id]/annulla-consegna/route.ts:117-121`) con la
**stessa** finestra di dieci minuti — nessuna scorciatoia, nessuna finestra allargata.

`provato:` chiamata a lavoro **non** consegnato →

```
esito RPC: {"esito":"non_consegnato"}
```

La valvola arriva al motore e il gate risponde. Provata **prima** di premere, non dopo.

---

## 2. Il giro — 26 secondi dalla consegna all'annullo

Accesso col link monouso (D103, `scripts/tmp/link-accesso.ts`), scheda del lavoro su uachelab.com.

| | ora (UTC) |
|---|---|
| «Consegna» premuto → `DDC-2026-0003` + `BUO-2026-0001` | **06:37:40** |
| lettura completa + PDF scaricato dall'archivio | 06:37:48 |
| «Annulla la consegna» confermato dal banner | ~06:38:00 |
| stato riletto e confermato | **06:38:06** |

La finestra dei dieci minuti non è mai stata nemmeno sfiorata: al momento dell'annullo il banner segnava
**9:45** residui.

---

## 3. L'esito, sul dato vero

```
DDC-2026-0001  stato=annullata  payload=🔴 NULL           template=🔴 NULL      ← 22/07, prima di D102
DDC-2026-0002  stato=annullata  payload=16e98549…        template=ddc-v1      ← 31/07, prima degli accenti
DDC-2026-0003  stato=annullata  payload=2f66b3e1…        template=ddc-v1      ← OGGI, dalla catena viva
```

**Riga in esame — `DDC-2026-0003`:**

```
data_emissione     2026-08-01T06:37:40.511+00:00
payload_sha256     2f66b3e1aed410b1d5670cc072dc7d8ff31b2fa17031942cdf08a784305cefa4  ✅ 64 hex
template_version   ddc-v1                                                            ✅
pdf_sha256         7d0a72af7739c8c3943030955ebcf68554b001f5442f5cd0f7e3feaf135bd526  ✅ diverso dal payload
```

### Il testo congelato in banca dati — la domanda separata dal foglio

`testo_conformita_snapshot` è il valore **conservato dieci anni** ed è ciò che entra nell'impronta del
payload: è una domanda **diversa** da «come rende il modello». Letto direttamente sulla riga:

```
"Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza…"
  contiene «dispositivo è conforme»?   ✅ SÌ
  contiene «dispositivo e' conforme»?  ✅ no
```

🔑 Sulla riga di ieri (`DDC-2026-0002`) lo stesso campo porta ancora **`e'`**: il prima e il dopo stanno
nella stessa tabella. E come deciso (D104 · referto del 03/08 §5 ①), **le vecchie non si rigenerano**.

### Il file archiviato è quello di cui la riga risponde

```
byte scaricati     5059
sha256 del FILE    7d0a72af7739c8c3943030955ebcf68554b001f5442f5cd0f7e3feaf135bd526
pdf_sha256 in riga 7d0a72af7739c8c3943030955ebcf68554b001f5442f5cd0f7e3feaf135bd526
✅ COINCIDONO
```

### Gli otto criteri, sul foglio uscito dalla produzione

```
DEVE contenere «DICHIARAZIONE DI CONFORMITÀ»           ✅
DEVE contenere «Responsabile della Conformità»          ✅
DEVE contenere «è conforme»                             ✅
DEVE contenere «§2 — DATA DI EMISSIONE»                 ✅
DEVE contenere «§7 — DICHIARAZIONE DI CONFORMITÀ»       ✅
NON deve contenere «DICHIARAZIONE DI CONFORMITA»        ✅
NON deve contenere «e' conforme»                        ✅
NON deve contenere «Conformita (PRRC)»                  ✅
accenti nel testo estratto: Àèà
pagine: 1
paragrafi numerati trovati: 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8     ← il §2 c'è
```

### I metadati del file (il titolo che compare nella linguetta del lettore)

```
Title:   con accento (UTF-16BE) ✅ presente · senza accento (ASCII) ✅ assente
Subject: con accento (UTF-16BE) ✅ presente · senza accento (ASCII) ✅ assente
```

🔑 **La forma della prova è quella corretta secondo la lezione ① dell'handoff:** lo strato PDF passa a
UTF-16BE **solo** quando la stringa ha un carattere non-ASCII, quindi la versione accentata si cerca in
UTF-16BE e quella col refuso in **ASCII puro** — dove starebbe davvero. Sul foglio vecchio la stessa
sonda dà l'esito opposto (`ASCII 🔴 PRESENTE`), che è la sua controprova.

### E il foglio è stato GUARDATO

Non solo estratto: le pagine sono state rese e viste. Una pagina, intestazione del fabbricante, titolo
accentato, `§1` FABBRICANTE → `§2` DATA DI EMISSIONE → `§3` PRESCRITTORE → `§4` PAZIENTE → `§5`
DISPOSITIVO SU MISURA → `§6` CLASSIFICAZIONE MDR → `§7` DICHIARAZIONE DI CONFORMITÀ → `§8` RISCHI
RESIDUI, blocco firma col PRRC a destra, piè di pagina col numero. Nessuna sezione orfana, nessuno
sconfinamento a una seconda pagina.

---

## 4. Ciò che questo giro NON ha provato — dichiarato, non taciuto

🛑 **Il §6-bis (norme armonizzate) non compare, e non è un difetto.** L'elenco delle norme per
`protesi_fissa` di questo laboratorio è **vuoto** (`rischi_tipo_dispositivo.norme_json = []`, letto
**prima** di premere con `scripts/tmp/preflight-ddc.ts`). Quella sezione è stata vista popolata solo sul
foglio **reso in locale** il 03/08. **In produzione resta non percorsa**, e con lei la voce 🟡 9
dell'handoff (§6-bis e §7 attaccati, senza lo stacco che hanno le altre sezioni): con la sezione assente
non è osservabile. **Costa un giro a parte, con una riga di prova da preparare e rimettere.**

Non provato nemmeno: la **firma grafica** (questo laboratorio non ne ha una caricata, `firma_ddc_url` è
`NULL`), e il documento **come lo riceve il dentista** (portale/WhatsApp: il tasto WhatsApp manda un
messaggio vero e non è stato toccato).

---

## 5. Lo stato è tornato quello di prima

| | prima | dopo la consegna | dopo l'annullo |
|---|---|---|---|
| `lavori.stato` | `pronto` | `consegnato` | **`pronto`** ✅ |
| `data_consegna_effettiva` | `null` | `2026-08-01T06:37:40.955Z` | **`null`** ✅ |
| DdC attive | 0 | 1 (`DDC-2026-0003`) | **0** ✅ — la riga resta come storia, `annullata`, con le sue due impronte |

Contatori dopo il giro: `ddc`=**3** (la prossima sarà `DDC-2026-0004`), `buono`=**1**, `lavoro`=11.
`genera_progressivo` (`supabase/schema.sql:93`) **non recupera** i numeri annullati: nessun duplicato.

**Consumato:** un numero di dichiarazione, due PDF nell'archivio, una notifica al front desk.
**Nessun messaggio WhatsApp inviato.**

---

## 6. 🔴 RITROVAMENTO FUORI MANDATO — il buono di consegna NON si rigenera dopo un annullo

**Riferito, non corretto (R-E2).** È il ritrovamento più pesante di questo giro, ed è emerso da **un
numero che non tornava**: il contatore dei buoni è rimasto a **1** e la schermata «Consegnato!» ha
mostrato di nuovo **`BUO-2026-0001`** — lo stesso numero della consegna di ieri.

### Il fatto, misurato

```
lavori.buono_numero        BUO-2026-0001
lavori.buono_pdf_url       …/buoni/2026/BUO-2026-0001.pdf   ← ancora valorizzato DOPO l'annullo 🔴
buoni in tutto il lab      1   (BUO-2026-0001 ← TEST-DdC-001)
data stampata sul buono    22/07/2026
```

**Il PDF del buono è stato reso il 22 luglio** (`BuonoTemplate.tsx:292` stampa `new Date()` al momento
del rendering) e da allora **non è mai più stato rigenerato**: lo stesso identico file, con la data del
22 luglio, è stato allegato alla consegna di **oggi**.

📏 **Il confine della misura, dichiarato.** Per la consegna di **oggi** il riuso è **misurato**: la
schermata ha mostrato `BUO-2026-0001`, il contatore è rimasto a 1 e il file porta la data del 22/07. Per
la consegna del **31/07** è **ricostruito**, non osservato: il contatore era già a 1 prima di premere
oggi e `generate-buono.ts:18-20` è l'unica strada, ma `lavori.buono_pdf_url` **non è stato letto prima**
di quella consegna — è stato letto solo dopo. La ricostruzione è quasi certa; resta una ricostruzione.

### La causa, in due righe che non si parlano

1. `generate-buono.ts:18-20` esce subito se `lavori.buono_pdf_url` è già valorizzato, e restituisce il
   buono vecchio. L'intenzione dichiarata nel commento è l'**idempotenza sui ritenta** della stessa
   consegna (B13) — non la sopravvivenza a un annullo.
2. `annulla_consegna_atomica` (migration `20260710150000`) porta la DdC ad `annullata` ma **non tocca**
   `buono_numero`, `buono_pdf_url`, `buono_storage_path` su `lavori`.

**L'asimmetria è tutta qui:** la dichiarazione è annullata *da uno stato*, quindi rinasce; il buono è
riconosciuto *dalla presenza di un URL*, che nessuno cancella.

### 🛑 E la schermata promette il contrario

Il dialogo di conferma dice, testualmente: «*Annullando, la **Dichiarazione di Conformità e il buono**
vengono annullati*». Del buono non viene annullato nulla: la riga resta sul lavoro e il file resta
nell'archivio. **L'utente legge una promessa che il sistema non mantiene.**

### Perché conta davvero, e non solo su dati di prova

Un lavoro consegnato per sbaglio (indirizzo sbagliato, pezzo scambiato) si annulla e si riconsegna il
giorno dopo. Al dentista arriva un **buono di consegna con la data del tentativo precedente** — un
documento di accompagnamento che afferma una data falsa. La DdC, invece, sarebbe corretta: due documenti
della stessa busta che raccontano due giorni diversi.

### 📌 E la tabella `buoni_consegna` esiste in banca dati, e nessuno la scrive

```
CREATE TABLE buoni_consegna (…, stato TEXT … CHECK (stato IN ('generato','consegnato','annullato')), …)
                                   ↑ lo stato 'annullato' esiste già, previsto e mai usato
righe in buoni_consegna (TUTTI i laboratori): 0
```

Il flusso di consegna scrive **tre colonne denormalizzate su `lavori`** invece della tabella. È
**la stessa classe** della voce 🟠 4 dell'handoff (`prrc_nomine` con `has_prrc_valido()`, in banca dati
e mai letta): una tabella progettata, migrata, e scavalcata dal codice.

### ⚠️ E corregge due affermazioni del referto del 03/08 §7

Quel referto scriveva «*La consegna ha bruciato `DDC-2026-0002` e `BUO-2026-0001`*» e, di sbieco, che la
dichiarazione del 22/07 «*probabilmente non nasce da una consegna completa*» perché non risultava avere
un buono. **Entrambe false, ora misurate:** la consegna del 31/07 **non ha bruciato** nessun buono (ha
riusato quello del 22/07, contatore fermo a 1), e la consegna del 22/07 **era completa** — il suo buono
esiste, sta su `lavori` e non è collegato alla DdC, quindi cercarlo dalla parte della dichiarazione non
poteva trovarlo.

🛑 **E corregge anche una cosa detta a Francesco oggi.** Nel messaggio con cui gli ho dichiarato il
costo del giro, **prima** di premere, ho scritto che sarebbe stato consumato «un numero di buono».
**Falso:** nessun numero di buono è stato consumato, perché il buono non è stato generato.

🔑 **La lezione, che è la ⑥ dell'handoff applicata a noi stessi:** anche l'affermazione portante di un
**nostro** referto si riverifica. Quella frase è stata ripetuta per due giorni, in tre documenti e in
chat, finché non è stata misurata.

---

## 7. Altri ritrovamenti fuori mandato — riferiti, non corretti (R-E2)

### 🟠 ① La citazione dell'articolo sul dispositivo su misura è sbagliata

Il foglio stampa, nel §5:

> Dispositivo su misura ai sensi dell'**Art. 2(1)(3)** MDR — non soggetto a marcatura CE ai sensi
> dell'Art. 20(1) MDR 2017/745.

**`Art. 2(1)(3)` non esiste.** L'Articolo 2 del MDR ha **un solo periodo introduttivo** («Ai fini del
presente regolamento si applicano le definizioni seguenti:») seguito da **71 punti numerati**; non è
diviso in paragrafi `(1)`, `(2)`. Il «dispositivo su misura» è il punto **3**, quindi la citazione
corretta è **`Art. 2(3)`**.
**Fonte:** [MDR — Article 2, Definitions](https://www.medical-device-regulation.eu/2019/07/10/mdr-article-2-definitions/)
(punto (1) medical device · (2) accessory · **(3) custom-made device**).
⚠️ **È una fonte SECONDARIA.** Il testo consolidato su EUR-Lex (CELEX `02017R0745-20260101`) è stato
interrogato e ha restituito un corpo vuoto. Per un riferimento normativo su un documento a valore legale
la regola di casa vuole una fonte primaria: **prima di correggere, si riconferma su EUR-Lex** — la
versione **italiana**, che è quella che fa fede in Italia (svolta metodologica imposta da Francesco il
03/08). Per **riferire** il difetto questa fonte basta; per **cambiare il foglio** no.
`Art. 20(1)` invece è **corretto** — è l'articolo che esclude i dispositivi su misura dalla marcatura CE.

Sorgente: `src/components/features/pdf/DdcTemplate.tsx:461`. 🛑 **Non corretto qui perché è un
riferimento normativo su un documento a valore legale**, e la prassi già stabilita per questo documento
(D104, gli accenti) è che il testo si cambia **per decisione**, non di passaggio. È una riga di sola
resa: non entra in `testo_conformita_snapshot` né nell'impronta del payload, quindi la correzione
varrebbe solo in avanti e non tocca nulla di conservato.

### 🟡 ② «dell Allegato I» — un apostrofo mancante che è nei DATI, non nel codice

Il §8 stampa: «*Il dispositivo è conforme ai requisiti di sicurezza **dell** Allegato I MDR 2017/745*».
Il testo arriva da `rischi_tipo_dispositivo.rischi_residui` per `protesi_fissa` di questo laboratorio:
è **un dato inserito**, non una stringa del sorgente.
🔑 **Ed è esattamente il motivo per cui la correzione degli accenti non poteva prenderlo:** quella ha
sistemato i sorgenti. Un refuso che vive in banca dati non ha una guardia, e ogni laboratorio scriverà
il suo.

### 🟠 ③–④ Confermate dal vivo due voci già aperte

- **Il luogo di fabbricazione non è stampato** (handoff §3 voce 2, trattino 1 dell'Allegato XIII,
  obbligatorio). Il §1 mostra «Luogo emissione: Serre» — che è un'altra cosa.
- **«Sostanze / tessuti: No»** compare nel §5, affermato su un valore **codificato a mano**
  (`generate-ddc.ts:144`) mai raccolto (handoff §3 voce 3).

---

## 8. Come rifare il giro

Gli script stanno in `scripts/tmp/`, che è **ignorato da git** — vanno riscritti se la cartella si
perde. Tutti di sola lettura tranne il generatore di link e la valvola:

| script | cosa fa |
|---|---|
| `censisci-consegnabili.ts` | quali lavori passerebbero il precheck, e quali hanno già una DdC attiva |
| `preflight-ddc.ts` | **che cosa comparirà davvero sul foglio** (norme, rischi, firma, PRRC, ITCA) — le attese dichiarate prima |
| `link-accesso.ts` | link d'accesso monouso (D103) |
| `dopo-consegna.ts` | riga + PDF + impronta + metadati + testo + **gli otto criteri** — accetta un numero di DdC per il collaudo su un foglio noto |
| `annulla-fallback.ts` | 🛟 valvola: chiama la stessa RPC del banner, stessa finestra di 10 minuti |
| `sonda-buono.ts` | il ritrovamento della §6: buono riusato, con la data stampata |

**L'ordine che rispetta i dieci minuti:** preflight e criteri **prima**, valvola provata **prima**, e fra
la consegna e l'annullo restano due gesti.
