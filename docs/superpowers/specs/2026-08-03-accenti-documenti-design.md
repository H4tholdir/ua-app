# Spec — gli accenti nei documenti generati, e il §2 che manca

**Stato:** da ratificare · **Decide:** Francesco Formicola · **Nasce da:** voce 8 di `ROADMAP-UFFICIALE.md`,
aperta il 03/08/2026 guardando il PDF emesso durante la verifica delle due impronte
(`docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md` §5).
**Panel:** tre advisor con mandato di confutare (normativo · architettura del dato · prodotto e rischio).
**Decisioni di Francesco:** D104 · D105 · D106 · D107 (verbale `2026-07-28-wizard-ondata-b-decisioni.md`).

---

## 1. Il fatto

Il PDF della Dichiarazione di Conformità stampa parole italiane **senza accento** nei punti più letti del
foglio: il titolo, il titolo del §7, l'etichetta accanto alla firma, e la frase centrale («il presente
dispositivo **e'** conforme»). Lo stesso vale per un secondo documento, la nomina del PRRC.

🔑 **Non è un limite del carattere, ed è la prova che rende la voce non opinabile.** Nello stesso foglio il
§8 rende «*Il dispositivo **è** conforme…*» correttamente, perché quel testo arriva dalla banca dati. E una
sonda apposta (`scripts/tmp/sonda-accenti.tsx`, usa e getta) ha reso **À È É Ì Ò Ù**, gli accenti minuscoli
in tondo e in grassetto, e — il caso a rischio — la **À maiuscola prodotta da `textTransform: 'uppercase'`**,
che è la strada del titolo. Tutto leggibile.

⚠️ **Gate del panel, superato prima di scrivere questa spec.** Due dei dieci punti non finiscono sulla
pagina ma nei **metadati interni** del file, dove un carattere non-ASCII vuole UTF-16BE: se lo strato PDF lo
scrivesse in Latin-1 nudo, un lettore mostrerebbe `ConformitÃ ` — e oggi, senza accento, quel campo è
corretto. Misurato (`scripts/tmp/sonda-metadati.tsx`): i tre campi escono **UTF-16BE con BOM**, cioè la
codifica giusta. Il gate non blocca più niente.

---

## 2. Perimetro — dieci punti, nessuno di sostanza

| # | file:riga | oggi | domani |
|---|---|---|---|
| 1 | `src/components/features/pdf/DdcTemplate.tsx:292` | `title` del file: `Dichiarazione di Conformita …` | `…Conformità…` |
| 2 | `DdcTemplate.tsx:294` | `subject` del file: `…Conformita MDR 2017/745` | `…Conformità…` |
| 3 | `DdcTemplate.tsx:326` | titolo stampato (reso maiuscolo): `DICHIARAZIONE DI CONFORMITA` | `…CONFORMITÀ` |
| 4 | `DdcTemplate.tsx:446` | `'Si — vedere documentazione allegata'` | `'Sì — …'` |
| 5 | `DdcTemplate.tsx:486` | `§7 — Dichiarazione di Conformita` | `…Conformità` |
| 6 | `DdcTemplate.tsx:514` | `Responsabile della Conformita (PRRC)` | `…Conformità (PRRC)` |
| 7 | `src/components/features/pdf/NominaPrrcTemplate.tsx:341` | `Responsabilita ai sensi dell'Art. 15(1)` | `Responsabilità…` |
| 8 | `src/lib/pdf/generate-ddc.ts:132` | frase congelata: `…dispositivo e' conforme…` | `…dispositivo è conforme…` |
| 9 | `supabase/migrations/002_fase2_schema.sql:188-189` | **DEFAULT della colonna** `testo_conformita_snapshot`: seconda copia della frase con `e'` | allineato da una **migration nuova** |
| 10 | `DdcTemplate.tsx` (§1 a `:345`) | la numerazione salta: `§1 → §3` | compare **`§2 — Data di emissione`** |

### 2.1 Il vincolo sul punto 8 — solo i segni, il resto byte per byte

🛑 **Si cambia `e'` in `è` e NIENT'ALTRO.** Nessuna riformulazione, nessuna parola aggiunta o tolta. Una
modifica dentro la frase di un documento a valore legale è un invito a «già che ci siamo miglioriamo il
testo», e quella è una decisione diversa — che il panel ha già isolato (§5, referral ①).

Chi esegue confronta la stringa nuova con la vecchia **carattere per carattere** e dichiara la differenza:
deve essere **un solo carattere**, `'` → `è` (con la caduta della `e` che lo precedeva).

### 2.2 Il punto 9 — perché serve una migration nuova

Il DEFAULT vive in una migration **storica**, e le migration storiche sono il registro di ciò che è
successo: **non si riscrivono**. Serve un `ALTER TABLE … ALTER COLUMN testo_conformita_snapshot SET DEFAULT
'<testo accentato>'`.

**Perché non `DROP DEFAULT`, che pure sarebbe più pulito:** la colonna è `NOT NULL` e `supabase/seed.sql`
inserisce righe **senza** valorizzarla — toglierlo romperebbe il seme. Si allinea, non si toglie.

⚠️ **Comporta la FASE 6b** (`supabase gen types` + `tsc`) anche se il default non compare nei tipi generati:
la regola non ammette eccezioni «tanto è piccola».

### 2.3 Il punto 10 — dove entra il §2, e cosa esce

I paragrafi del documento ricalcano gli **otto elementi dell'Allegato XIII punto 1**; il n. 2 è la **data di
emissione** (`src/lib/consegna/precheck.ts:8`). Il dato c'è già, stampato **due volte** — nell'intestazione
accanto al numero (`DdcTemplate.tsx:337`) e nel blocco della firma — ma senza il suo titoletto.

**Forma scelta:** nasce la sezione **`§2 — Data di emissione`** subito dopo il §1, e **l'intestazione perde
la data** (le resta il numero). Il blocco della firma **non si tocca**: lì la data è parte della
sottoscrizione, non della numerazione. Così il dato resta in due posti come oggi, non in tre.

⚠️ **Rischio dichiarato dal panel:** un titoletto in più sposta il flusso e può spingere contenuto oltre il
salto di pagina. Il collaudo guarda **il PDF intero**, non solo la sezione nuova.

---

## 3. La versione del modello — resta `ddc-v1` (D105), e per la prima volta si scrive cosa significa

**Decisione di Francesco: nessun salto di versione.** Il salto si tiene per il primo cambiamento che
altera *ciò che il documento dice*.

🛑 **Ma così com'è, quella decisione lascia il codice a dichiarare una regola e ad applicarne un'altra:**
`generate-ddc.ts:33-34` dice "la versione della FORMA del documento — cambia quando cambia ciò che il PDF
rende", e qui il PDF rende diversamente. Perciò la decisione si realizza **scrivendo il registro**:

1. accanto alla costante (`generate-ddc.ts:41`) nasce il **registro delle versioni**: cosa copre `ddc-v1`,
   da quando, e la riga esplicita «*la correzione ortografica del 03/08 e il §2 stanno dentro v1 per
   decisione D105: il salto a v2 è riservato al primo cambiamento di sostanza*»;
2. la definizione si riformula in modo che sia **vera**: la versione cambia quando cambia **ciò che il
   documento dice**, non ogni volta che cambia un glifo;
3. si allinea `supabase/schema.sql:1249`, che oggi promette un formato diverso (`-- Es. "ddc-v1.2.0"`,
   tre numeri) da quello in uso (`ddc-v1`). **Due definizioni contraddittorie della stessa colonna** sono il
   difetto che il panel ha isolato come bloccante; la contraddizione va tolta comunque si decida il numero.

📌 **Fatto misurato, contro un'affermazione del panel.** Il parere normativo sosteneva che *nessuna* riga
porti `ddc-v1` e che quindi la v1 non sia mai esistita. **Falso, verificato sul database:** su 4
dichiarazioni in archivio, **una porta `ddc-v1`** (`DDC-2026-0002` del laboratorio `971061a1`, emessa e
annullata durante la verifica del 03/08); le altre tre hanno `NULL`. La conclusione del parere resta
difendibile per altra via — una sola istanza, di prova, annullata — ma **non poggia sul fatto che dichiarava**.

---

## 4. Come si prova

**① Un test in casa fissa il difetto e va girato.**
`tests/unit/ddc-pdf-content.test.ts:111` oggi pretende `toContain('dichiarazione di conformita')` — cioè
**asserisce il refuso**. Va invertito: deve pretendere l'accento. Senza questo, una regressione futura
tornerebbe **silenziosa** in entrambe le direzioni.

**② La fixture porta il testo vecchio.**
`tests/unit/ddc-pdf-content.test.ts:68-69` congela la frase con `e'`. Va allineata, o la suite continuerebbe
a rendere un payload che il generatore non produce più.

**③ La riga 4 non è coperta da nessuna asserzione — e va dichiarato.**
`DdcTemplate.tsx:446` si raggiunge solo con `contiene_sostanze_o_tessuti = true`, ma la fixture lo mette a
`false` (`:62`). Chi corregge quella riga oggi **non ha rete**. Serve un caso che la renda raggiungibile,
altrimenti si scrive «non coperta, perché» (R-P4).

**④ Il §2 vuole la sua prova**: il testo estratto dal PDF contiene `§2` e la data.

**⑤ Prima del verde, un documento vero.** Le prove leggono testo estratto; il difetto di partenza è stato
trovato **guardando un foglio**. Si emette una DdC di prova e si guarda il PDF — titolo, §7, firma,
numerazione, e che il §2 non abbia spostato niente oltre il salto di pagina.

---

## 5. Fuori perimetro — riferiti, NON accorpati (R-E2)

Il panel, leggendo il documento contro l'Allegato XIII, ha trovato cose **più pesanti del refuso**. Nessuna
entra qui: ognuna è una voce propria.

| | ritrovamento | dove |
|---|---|---|
| ① | La frase del §7 dice il dispositivo conforme «**e ai disposti dell'Allegato XIII**»: quello è una **procedura che il fabbricante segue** (Art. 52(8)), non un requisito a cui un dispositivo è conforme. Il trattino 7 chiede la conformità ai soli RGSP dell'Allegato I. ⚠️ `supabase/seed.sql:198` porta una versione **migliore e già accentata** («…dichiara **sotto la propria responsabilità**…», senza la clausola): la stringa in uso è una **regressione**, non una scelta | `generate-ddc.ts:132` |
| ② | **Il luogo di fabbricazione non è mai stampato**, ed è il **trattino 1**, obbligatorio: la colonna esiste (`schema.sql:1242`, default `'Italia'`) e non arriva sul foglio | `DdcTemplate.tsx` §1 |
| ③ | Il foglio **afferma «Sostanze / tessuti: No»** con un valore **codificato a mano** (`contiene_sostanze_o_tessuti: false`), mai raccolto né verificato. Il trattino 8 è condizionale: l'indicazione serve **solo se vero**. Una negazione affermata è surplus volontario, e su materiali di origine animale (Reg. UE 722/2012) è un falso negativo | `generate-ddc.ts:144` |
| ④ | **L'identificazione del paziente può svanire**: la catena termina in `?? ''`, la colonna è `NOT NULL` quindi `''` passa, e il template rende `—`. Un foglio che dichiara «esclusivamente per il paziente indicato» **senza indicare il paziente** viola il trattino 4 | `generate-ddc.ts:137` · `DdcTemplate.tsx:265-268` |
| ⑤ | Citazione errata: **«Art. 2(1)(3)»**. L'Art. 2 MDR non ha paragrafi (è «Definizioni», a punti): la forma corretta è **«Art. 2, punto 3»**. *(Art. 20(1) e Art. 52(8) nel documento sono invece esatti)* | `DdcTemplate.tsx:451` · `seed.sql:198` |
| ⑥ | **La nomina del PRRC non viene conservata e si riscrive la data a ogni scaricamento** (`new Date().toLocaleDateString('it-IT')`): due copie firmate dello stesso atto portano date diverse. E tiene in duro `prrc_cognome: ''`, `ha_accettato: false`, mentre la tabella `prrc_nomine` e la funzione `has_prrc_valido()` **esistono in banca dati e nessuno le legge** | `src/lib/pdf/generate-nomina-prrc.ts:15-23` |
| ⑦ | **`payload_sha256` oggi non è ricalcolabile**, misurato: `data_emissione` non sopravvive al giro di andata e ritorno (scritta `…983Z`, riletta `…983+00:00`) e `norma_riferimento` entra nell'impronta senza essere una colonna della riga. Verificatori esistenti: **zero** | `generate-ddc.ts:156` · voce 7 dell'handoff |
| ⑧ | **Contraddizione fra due panel, da sciogliere**: il parere normativo sostiene che la base della conservazione decennale sia l'**Allegato XIII punto 4 da solo**, perché l'Art. 10(5) rimanda alla documentazione tecnica (All. XIII **punto 2**), non alla dichiarazione. Il panel del 29/07 aveva ratificato «Art. 10(5) + Allegato XIII punto 4», e quella citazione vive in **tre documenti**. Non ratifico né scarto: **va verificata sul testo** | `../CLAUDE.md` §7 e i due documenti citati lì |
| ⑨ | Lo stesso refuso vive **fuori dai PDF**: «Non Conformita Recenti» in una schermata | `src/app/(app)/qualita/page.tsx:83` |

---

## 6. Cosa NON si fa

- ❌ **Non si rigenera nessuna dichiarazione già emessa.** Rigenerare cambierebbe l'impronta di documenti già
  consegnati, che è esattamente ciò che l'impronta esiste per impedire. Nessun obbligo di legge lo chiede:
  l'unica norma di correzione (Art. 10(12)) si attacca alla **non conformità del dispositivo**, non a un
  refuso tipografico. **È una decisione, non un'omissione.**
- ❌ **Niente guardia automatica anti-refuso** (D107). Il panel ne aveva proposta una a dizionario sui soli
  modelli di documento; Francesco ha scelto di non aggiungerla. ⚠️ **Conseguenza dichiarata:** il prossimo
  refuso arriverà sui documenti come questo, e si troverà solo guardando un foglio stampato.
- ❌ **Nessun salto di versione** (D105) — v. §3.
- ❌ **Niente riformulazioni** della frase del §7: è il referral ①, non questa voce.
