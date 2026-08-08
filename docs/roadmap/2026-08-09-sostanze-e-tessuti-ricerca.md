# `contiene_sostanze_o_tessuti` — la ricerca, categoria per categoria

**Quando:** 9 agosto 2026, notte (`provato:` `date`, letto in un comando separato).
**Chi l'ha chiesta:** Francesco — «*si deve fare una ricerca accurata se tutte le tipologie di lavoro
che trattiamo possano presentare questa possibilità, se sì allora per quelle categorie va pensato il
campo nel modo giusto*».
**Esito:** ⚖️ **D325 · D327** — verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
**centoquarantaduesima tornata**. 🔑 **Il segno sta sul MATERIALE, non sul lavoro.**
**Validata da:** panel a tre (normativo MDR · architettura · UX), lanciato **prima** della ratifica.

---

## 0. LA CORREZIONE PRELIMINARE — che cosa fa il codice davvero

🔄 **Era stato detto a Francesco «cablato a `false` e STAMPATO sul documento». La seconda metà è falsa.**

`provato:` `DdcTemplate.tsx:508` — la riga vive dentro un `? :` sul dato: con `false` **non compare
affatto**. Il documento **tace**, non dichiara «no».

🔑 **Perché la differenza conta.** Il testo di legge dice «**se del caso**, l'indicazione che…»: quando
la sostanza non c'è, **tacere è la forma giusta**. ➡️ Oggi UÀ **non stampa una bugia**. Il difetto è
l'altro verso: **se un dispositivo contenesse davvero quei materiali, non esiste nessuna strada per
dirlo**. *Non una falsa dichiarazione: un'omissione che non si può correggere.*

📌 Restano veri: `generate-ddc.ts:349` cabla `false`, e **nessuna schermata chiede il dato**.

---

## 1. CHE COSA CHIEDE LA NORMA

**Allegato XIII, punto 1, ULTIMO trattino** (MDR 2017/745):

> «— se del caso, l'indicazione che il dispositivo contiene o incorpora una sostanza medicinale,
> compreso un derivato dal sangue o dal plasma umani, o tessuti o cellule di origine umana o di
> origine animale **di cui al regolamento (UE) n. 722/2012**.»

🔴 **Difetto di citazione, riferito e NON corretto (R-E2):** `src/types/domain.ts:1223` scrive
«Allegato XIII **§1(e)**». Quel punto **non usa lettere, usa trattini**, e l'elemento è l'**ultimo**,
non il quinto — **il quinto è il nome del prescrittore**.

### Il perimetro animale è chiuso — 🛑 ma **SOLO quello**

`provato:` reg. (UE) **722/2012** art. 1 (EUR-Lex, CELEX 32012R0722):

| voce | contenuto |
|---|---|
| **Specie** | **bovini · ovini · caprini · cervi · alci · visoni · gatti** (le sensibili alle TSE) |
| **Materiali** | **collagene · gelatina · sego** |
| **Ambito** | dispositivi fabbricati con **tessuti animali NON VITALI** o loro derivati |
| **Esclusi (art. 1 §4)** | **derivati del sego** trattati coi metodi rigorosi dell'All. I sez. 3 · dispositivi che **non toccano il corpo** o toccano **solo cute integra** |

🛑 **CORREZIONE DELL'ADVISOR NORMATIVO — la prima stesura di questa ricerca sbagliava qui.**
Il rinvio al 722/2012 **lega soltanto il ramo animale**: «**sostanza medicinale**» e «**origine
umana**» restano **senza perimetro**. *Era stata presentata mezza risposta come se chiudesse tutta la
domanda.*

✅ **La cera d'api è fuori, e la fonte buona è un'altra:** **MDCG 2021-24 Rev.1, Nota 1** esclude i
prodotti *fatti* dagli animali — **cera d'api, lanolina, seta**. Migliore dell'argomento sulle specie.
⚠️ **Nota 2**: il sego in tracce da stampo è escluso, ma testualmente «*only to classification, and not
to other obligations*» → **non tocca l'ottavo trattino**. La riga «quasi certamente escluso» vale per
la **classe**, non per la **dichiarazione**.

### 🛑 IL CAMPO NON È UNA CASELLA: È UN INNESCO DI CLASSIFICAZIONE

**Allegato VIII, Regola 18:** dispositivi fabbricati con tessuti o cellule di origine umana o animale
**non vitali** → **CLASSE III**, salvo contatto con **sola cute integra**.
➡️ Per i su misura **impiantabili di classe III**: **Art. 52(8) secondo comma** → Allegato IX capo I
**oppure Allegato XI parte A** (l'alternativa mancava dalla prima stesura), più la registrazione
**EUDAMED** (D.Lgs. 137/2022 art. 12 c. 2, `CLAUDE.md` §6).
➕ **E l'indicazione va ANCHE SULL'ETICHETTA** — Allegato I, cap. III, **23.2**.

🔴 **IL BUCO STRUTTURALE, misurato.** Il catalogo (`src/lib/domain/tipi-lavoro.ts`, **38 voci**) produce
**solo** `classe_i` (14) e `classe_iia` (24): `provato:` `grep -o "classeRischio: '[a-z_]*'" … | sort |
uniq -c`. **`classe_iib` e `classe_iii` non sono raggiungibili**; `altro` ripiega su `classe_i`
(`crea-lavoro.ts:153`); `classe_rischio` **non è in `PATCHABLE_FIELDS`**.
➡️ **Un lavoro che contenesse davvero quei materiali non ha oggi nessuno stato in cui esistere.**

---

## 2. IL VERDETTO PER CATEGORIA — le dieci di `TipoDispositivo`, con le 38 voci sotto

**Criterio:** il materiale deve **restare nel dispositivo consegnato** ed essere collagene, gelatina o
sego **delle sette specie**. Ciò che serve solo alla lavorazione (cere, masse di duplicazione,
isolanti) **non conta**: non è il dispositivo.

| # | categoria | voci | materiali tipici | può contenere? |
|---|---|---|---|---|
| 1 | **protesi_fissa** | corona zirconia · disilicato · metallo-ceramica · ponte · faccetta · intarsio · perno moncone (7) | zirconia, disilicato di litio, leghe, ceramica | **NO** |
| 2 | **protesi_mobile** | totale · totale digitale · parziale resina · flessibile · duplicato (5) | PMMA, nylon, denti prefabbricati | **NO** |
| 3 | **implantologia** | corona/ponte su impianto · toronto · barra · overdenture · **abutment** · provvisorio (7) | titanio, zirconia, leghe, PMMA | **NO** ⚠️ ma v. §3② |
| 4 | **scheletrato** | scheletrato · attacchi · SLM · PEEK (4) | leghe CrCo, PEEK, resina | **NO** |
| 5 | **cad_cam** | dima chirurgica · modello 3D (2) | resine da stampa, PETG | **NO** ⚠️ v. §3① |
| 6 | **ortodonzia** | placca · funzionale · contenzione · allineatori (4) | acciaio, resine, PETG, lattice (vegetale) | **NO** |
| 7 | **provvisorio** | resina · CAD · mock-up (3) | PMMA, compositi | **NO** |
| 8 | **riparazione** | riparazione · ribasatura (2) | resine, silicone | **NO** — eredita ciò che ripara |
| 9 | **bite_splint** | Michigan · morbido · paradenti · anti-russamento (4) | PMMA, PETG, EVA, silicone | **NO** |
| 10 | **altro** | testo libero, ripiega su `classe_i` | **qualunque cosa** | **🔴 SÌ in linea di principio** |

**Sintesi:** *nella pratica odontotecnica standard italiana nessuna delle 38 voci incorpora collagene,
gelatina o sego delle sette specie nel dispositivo consegnato.*

📊 **E «altro» non è marginale:** `provato:` sul banco — **24 lavori su 299, il TERZO tipo più usato
(~8%)**. ⚠️ **Tutti e 24 in `classe_iia`**, non nella `classe_i` che il wizard cabla: quella classe
**non la sceglie nessuno, capita** (il ripiego del database è `classe_iia`, quello dell'API `classe_i`).

⚠️ **«Non verificato», e va scritto** (Statuto delle fonti): non esiste qui un censimento delle schede
di sicurezza fornitore per fornitore. La riga sopra regge su **di che cosa sono fatti i manufatti**.
🔑 **È esattamente la verifica che solo il laboratorio può fare — ed è il motivo di D327.**

---

## 3. I DUE CASI CHE NON SONO TEORICI

### ① I blocchi ossei su misura — esistono, e sono classe III
Blocchi **allogenici** fresati CAD/CAM sulla TAC del paziente e blocchi **xenogenici bovini
deproteinizzati** su misura. Sono **dispositivi su misura** con tessuto umano o animale.
🔑 **Non li fabbrica il laboratorio odontotecnico** — sono banche dei tessuti e aziende specializzate.
**Ma dimostrano che il «sì» non è ipotetico in odontoiatria**, e cade dove UÀ è più debole.

### ② 🔴 IL MONCONE — un difetto VIVO, e NON è in «altro» (⚖️ **D328**)
`tipi-lavoro.ts:68` mette **`abutment`** in **`classe_iia`**. **MDCG 2021-24 Rev.1**, tabella della
**Regola 8**, mette «*Dental implants **and abutments***» in **classe IIb**; **Nota 4** conferma.
🛑 **Non risolto**, e la cautela è dell'advisor: dipende da una domanda che **l'app non fa mai** — se il
moncone nasca da un **ti-base CE** (alias `'ti-base'`, riga 63), cioè **chi sia il fabbricante**.
📌 **Conseguenza misurabile:** `classe_rischio` alimenta `GruppoClassePsur` (`domain.ts:89-105`), e
**Art. 86(1)** chiede il PSUR **almeno biennale** per la IIa, **almeno annuale** per IIb/III →
**la scadenza detta all'odontotecnico è quella sbagliata**.

### ③ Il sego, e perché era il caso interessante
Stearati e acido stearico possono derivare da **sego bovino** e comparire come additivi in resine e
cere. Quasi certamente esclusi dall'art. 1 §4, e oggi in larga parte vegetali.
🛑 **Ma «quasi certamente» è una valutazione del FABBRICANTE su documentazione del fornitore.**
*Questa asimmetria è la risposta, ed è ciò che D327 mette al posto giusto.*

---

## 4. LA DECISIONE PRESA — D327: il segno sta sul MATERIALE

**Il difetto vero, in una frase:** UÀ **afferma per conto del laboratorio**, su un documento a valore
legale, un fatto che **solo la documentazione dei materiali del laboratorio può stabilire**.

Tre strade erano state presentate (A: dichiarazione di laboratorio · B: domanda sul lavoro · C: A + la
classe che segue il campo). **Il panel ne ha trovata una quarta, e Francesco ha scelto quella:**

> **Il segno si spunta UNA VOLTA SOLA sul materiale, al carico in magazzino, e da lì lo ereditano
> tutti i lavori che quel materiale usano.**

**Perché batte la domanda sul lavoro** — due advisor indipendenti, da estremi opposti:
- **Normativo:** «*il flag appartiene al materiale, non al tipo di lavoro… una domanda per-lavoro
  diventa **stantia** il giorno in cui il laboratorio compra un ribasante nuovo*». Aggancio già in
  casa: `tracciabilita_materiali_ok`.
- **UX:** «*una domanda la cui risposta non cambia mai **addestra il riflesso del tocco automatico**, e
  poi scatta sull'unico caso che contava*».

⚠️ **Resta di D325, e non è toccato da D327:** «altro» diventa il **lavoro neutro a compilazione
manuale** — tutte le opzioni scegliibili a mano, **classe di rischio compresa**. È anche la prima
strada che rende la **classe III rappresentabile**.

### Riserve del panel ancora aperte
1. **L'impiantabile non è un dato** — e `DpaTemplate.tsx:162` **promette già** i 15 anni per gli impiantabili.
2. Il campo **deve entrare in `CAMPI_CORREGGIBILI_DOCUMENTO`** (`correzioni.ts:58`) o nasce una voce obbligatoria non correggibile.
3. **Il ripiego «Sì — vedere documentazione allegata» promette un allegato che può non esistere** → dettaglio obbligatorio con «sì», ripiego da togliere.
4. **Un solo blocco duro è difendibile:** «sì» insieme a `classe_i`/`classe_iia`. **Mai bloccare l'emissione.**
5. **Non chiedere la classe: chiedere la famiglia** e suggerire la classe dicendo la ragione.
6. **Non verificato:** se il macchinario consultivo del 722/2012 tocchi i su misura sotto la classe III impiantabile.
7. **Il dimensionamento va rifatto sul magazzino**, non ereditato dal lavoro: la colonna cambia bersaglio.

---

## 5. FONTI

- MDR 2017/745 — **Allegato XIII punto 1** · **Allegato VIII Regola 18** · **Art. 52(8)** · **Art. 86(1)** · **Allegato I cap. III 23.2**
- **[MDCG 2021-24 Rev.1](https://health.ec.europa.eu/system/files/2021-10/mdcg_2021-24_en_0.pdf)** — regole di classificazione, Regola 8 (impianti e monconi) e Note 1-2 (cera d'api, sego)
- **[Reg. (UE) n. 722/2012](https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32012R0722)** — art. 1-2
- **[MDCG 2021-3](https://health.ec.europa.eu/system/files/2021-03/mdcg_2021-3_en_0.pdf)** — Q&A sui su misura
- **[Allegato XIII, testo italiano](https://www.medicaldevicenews.eu/MDR/pagina/allegato-xiii-procedura-per-i-dispositivi-su-misura-5cdeaa63b1c61131d9c646ee.html)**
- Letteratura clinica sui blocchi ossei su misura CAD/CAM: [allogenici](https://pmc.ncbi.nlm.nih.gov/articles/PMC8435223) · [xenogenici bovini](https://doi.org/10.3390/app10082659)
- Codice: `tipi-lavoro.ts` · `crea-lavoro.ts:151-157` · `sequenza-passi.ts:73-96` · `generate-ddc.ts:349` · `DdcTemplate.tsx:504-516` · `domain.ts:222-232, 248, 1223` · `api/lavori/[id]/route.ts:211+` · `api/lavori/route.ts:293` · `precheck.ts:137-143` · `api/qualita/psur/route.ts:37-49`
