# Brief — «Il documento dice tutto il dovuto»: la voce 6, il luogo di fabbricazione, e il cancello che mentiva

**Per:** l'esecutore fresco di questo compito (R-E1: un compito solo, questo).
**Ramo:** `intervento-post-consegna`, già attivo, albero pulito. 🛑 **Worktree VIETATI.**
**Scritto il:** 07/08/2026 (`provato:` `date` → `07/08/2026, 10:11 CEST`).
**Decisione che serve:** **D295**, verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
centoventiduesima tornata.

🛑 **QUESTO COMPITO NON TAGLIA NIENTE.** I quindici campi da togliere dal documento sono il compito
**successivo**, di un altro esecutore. Tu **aggiungi ciò che manca** e **ripari un controllo che mente**.
Se ti viene la tentazione di togliere qualcosa «già che ci sei», **fermati e riferisci** (R-E2).

---

## 0. Perché questo compito esiste, in tre righe

La dichiarazione ex Allegato XIII che il laboratorio emette a ogni consegna deve contenere **otto**
informazioni. **Una di queste non c'è mai stata**, e il controllo che avrebbe dovuto accorgersene
**verifica un elenco che non è quello della norma**. Il tuo compito è chiudere entrambi i buchi.

⚠️ **È un documento a valore legale.** Nessuna scorciatoia, nessun «poi si sistema».

---

## 1. Il metro — gli OTTO contenuti, verbatim dal consolidato italiano ufficiale

Allegato XIII punto 1 del Reg. (UE) 2017/745: «*Per i dispositivi su misura il fabbricante o il suo
mandatario redige una dichiarazione contenente tutte le seguenti informazioni:*»

1. «il nome e l'indirizzo del fabbricante e **di tutti i luoghi di fabbricazione**,»
2. «il nome e l'indirizzo dell'eventuale mandatario,»
3. «i dati che consentono di identificare il dispositivo in questione,»
4. «una dichiarazione secondo cui il dispositivo è destinato a essere utilizzato esclusivamente da un determinato paziente o utilizzatore, identificato mediante il nome, un acronimo o un codice numerico,»
5. «il nome della persona che ha prescritto il dispositivo e che vi è autorizzata dal diritto nazionale in virtù delle sue qualifiche professionali e, se del caso, il nome dell'istituzione sanitaria in questione,»
6. «**le caratteristiche specifiche del prodotto indicate nella prescrizione**,»
7. «una dichiarazione secondo cui il dispositivo in questione è conforme ai requisiti generali di sicurezza e prestazione stabiliti nell'allegato I e, **se del caso**, l'indicazione dei requisiti generali di sicurezza e prestazione che **non sono stati interamente rispettati**, con debita motivazione,»
8. «**se del caso**, l'indicazione che il dispositivo contiene o incorpora una sostanza medicinale, compreso un derivato dal sangue o dal plasma umani, o tessuti o cellule di origine umana o di origine animale di cui al regolamento (UE) n. 722/2012.»

📌 Copia integrale del Regolamento consolidato italiano, per ogni verifica tua:
`/private/tmp/claude-501/-Users-hatholdir-Downloads-SOFTWARE-FILIPPO/4fc8c1af-7ffb-4986-a92b-2d470cdddcbe/scratchpad/mdr_it.txt`

---

## 2. I tre lavori, in quest'ordine

### 🔴 A — La voce 6: collegare le caratteristiche prescritte

`provato:` `src/lib/pdf/generate-ddc.ts:166` → `prescrizione_caratteristiche: null as string | null`.
**Cablato a `null`.** Il modello lo rende in modo condizionale (`DdcTemplate.tsx:442-447`), quindi la
riga **non compare mai**. E `generate-ddc.ts:210` è **l'unico** inseritore della tabella.

🔑 **Il dato ESISTE.** Le ondate precedenti hanno costruito **`lavori_prescrizioni`** con il suo
contenuto (elementi, colore). **Il tuo lavoro è collegarlo, non inventarlo.**

**Prima di scrivere una riga, apri e capisci** (R-P2, e ogni percorso torna nel referto come
`letto: righe X-Y` oppure `NON letto`):
- `src/lib/domain/prescrizione-mapper.ts` — **il normalizzatore già costruito** per la scheda lavoro
- `src/lib/domain/prescrizione-costanti.ts` e `src/types/domain.ts` (cerca `PrescrizioneContenuto`)
- la migration che crea `lavori_prescrizioni` (cercala in `supabase/migrations/`)
- `src/lib/pdf/generate-ddc.ts` **per intero** — è il file che tocchi
- `src/components/features/pdf/DdcTemplate.tsx`, righe 442-447 e dintorni

**Le domande a cui devi rispondere nel referto, con le righe citate:**
1. Che cosa contiene davvero una prescrizione salvata? (elementi? colore? testo libero? un'immagine?)
2. **Come si compone una frase leggibile da un umano** a partire da quel contenuto? 🛑 Il documento lo
   legge una persona, non una macchina: `{"colore":"A3","elementi":[26]}` **non è una caratteristica
   prescritta**, è un oggetto. Cerca se esiste già in casa una funzione che rende quel contenuto in
   parole (guarda come la scheda lavoro lo mostra all'utente) — **e riusa quella** invece di scriverne
   una seconda che diverge.
3. **E se la prescrizione non c'è?** Un lavoro può non averne (non tutti nascono da una prescrizione
   digitale). La voce 6 dice «indicate nella prescrizione»: **se non c'è prescrizione, non c'è nulla da
   riportare**, e il campo resta vuoto **legittimamente**. ⚠️ Ma se la prescrizione **c'è** e il campo
   resta vuoto, quello è il buco di oggi che si ripresenta: **distingui i due casi**, e fai in modo che
   il secondo non possa passare inosservato.

### 🟢 B — Il luogo di fabbricazione (voce 1)

`provato:` `luogo_fabbricazione` è **`NOT NULL`** in banca dati (`supabase/schema.sql:1251`) e **non è
mai stampato**, mentre la voce 1 chiede «*tutti i luoghi di fabbricazione*».
➡️ Va **stampato**. Verifica da dove arriva il valore e **che cosa contiene davvero oggi** (se fosse
una stringa vuota o un valore di comodo, dillo: è un ritrovamento, non un dettaglio).
⚠️ **Non confonderlo con `luogo_emissione`** (`lab.citta`), che è un'altra cosa e nel compito successivo
**esce dal documento**.

### 🛑 C — Il cancello che mente

`provato:` `src/lib/consegna/precheck.ts:5-18` dichiara di verificare «*gli 8 elementi obbligatori
Allegato XIII MDR 2017/745*» e poi elenca: **1** fabbricante · **2 data emissione** · **8 conformità** ·
**3** prescrittore · **4** paziente · **5** descrizione · **6 classe di rischio** · **7 data consegna
prevista**.
🛑 **Non è la numerazione dell'Allegato XIII.** Tre voci sono **inventate** (data emissione, classe di
rischio, data consegna prevista: **nessuna** è nell'Allegato) e **tre voci vere mancano**: la **2**
(mandatario), la **6** (caratteristiche prescritte), la **8** (sostanze/tessuti).

**Che cosa devi fare, e con quale confine:**
- **Il commento va riscritto sulla numerazione VERA.** Un commento che descrive un elenco inesistente è
  la ragione per cui il buco A è sopravvissuto.
- La stessa numerazione inventata è in **`src/types/domain.ts:762`**, **e da lì arriva all'operatore**:
  va allineata.
- ⚠️ **Il controllo deve accorgersi del caso «prescrizione presente ma caratteristiche vuote»** — è il
  buco che stai chiudendo, e senza rete si riapre.
- 🛑 **CONFINE, e non superarlo senza riferire:** *aggiungere* controlli che oggi mancano è nel mandato.
  **Rendere BLOCCANTE un controllo che oggi non lo è NON lo è** — «la PWA non dà blocchi, dà aiuti»
  (D262), e un cancello nuovo sulla consegna è una decisione di Francesco. Se pensi che una voce debba
  bloccare, **proponilo nel referto**, non farlo.
- Le voci **7** e **8** sono **condizionali** («se del caso»): un controllo che le pretende sempre è
  sbagliato quanto uno che le ignora.
- 📌 Terza occorrenza dello stesso errore, **da riferire e NON correggere** (fuori mandato): i commenti
  di `supabase/schema.sql:1197+` citano «MDR §9…§12», mentre **l'Allegato XIII ha cinque punti** e le
  otto voci sono trattini del punto 1.

---

## 3. Le regole del progetto che valgono su di te

- **TDD pieno:** prima le prove che falliscono, poi l'**abbozzo inerte**, poi **conta** quante asserzioni
  si accendono (R-P4, il numero `N su M` va nel referto), poi implementa.
  ⚠️ **Prima delle asserzioni, enumera le forme d'ingresso:** lavoro **senza** prescrizione · con
  prescrizione **vuota** · con solo colore · con soli elementi · con entrambi · con contenuto
  malformato · `luogo_fabbricazione` vuoto o di soli spazi.
- **FASE 7 completa:** `npx tsc --noEmit` && `npx vitest run` && `npx next build`, output reale.
- **NESSUNA MIGRATION.** I campi esistono già in tabella: se ti sembra servirne una, **fermati e
  riferisci**.
- **R-E2:** un difetto fuori mandato si **riferisce**, non si corregge.
- Nessun `git push`. Salva con `fix(mdr): …`.
- **La lingua dei testi che un umano legge è l'italiano**, piano. Sul documento **mai** «dichiarazione
  di conformità»: per i su misura quel nome è improprio — si dice **«la dichiarazione»**.

## 4. La prova che il lavoro è servito

🛑 **Non basta che i test passino: devi GUARDARE il documento.** Genera una dichiarazione **prima** e
**dopo** su un lavoro che ha una prescrizione, e **confronta**. La riga delle caratteristiche prescritte
deve comparire, e deve essere **leggibile da una persona**. Scrivi nel referto che cosa hai visto.
📌 Se non riesci a generare il PDF nel tuo ambiente, **dillo**: è un limite dichiarato, non un dettaglio
da saltare.

## 5. Il referto

`.superpowers/sdd/intervento-task-doc-1-report.md` (🛑 prefisso `intervento-` obbligatorio).
Dentro: le letture R-P2 · il conteggio R-P4 · le forme d'ingresso coperte e quelle no col perché · la
frase esatta che finisce sul documento per un caso reale · l'output della FASE 7 · **RITROVAMENTI
(R-E2)** · e le decisioni prese da solo, dichiarate.
⚠️ **I numeri del referto si misurano due volte:** in quest'ondata **cinque conteggi su cinque** non
hanno retto alla verifica di chi controllava.
