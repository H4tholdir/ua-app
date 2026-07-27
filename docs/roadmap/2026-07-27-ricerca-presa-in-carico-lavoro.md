# Ricerca — Elemento e colore nella presa in carico del lavoro (27/07/2026)

**Domanda del proprietario di prodotto:** nel Passo 3 del wizard «Nuovo lavoro» («Se vuoi,
aggiungi»), **Elemento** (il numero del dente, es. «2.6») e **Colore** (la scala colore, es.
«A2») sono due righe facoltative. Siamo sicuri che questo sia il momento giusto per chiederli?

**Metodo:** solo raccolta di fatti, con fonte per ognuno. Nessuna proposta di soluzione — la
decisione spetta a Francesco con un panel di advisor, dopo aver letto questo documento. Ogni
termine tecnico è spiegato la prima volta che compare.

---

> ## 🛑 RETTIFICA DI FONTE — Francesco, 27/07/2026, dopo la prima stesura
>
> **`ANALISI/05_workflow_completo.md` NON è una fonte autorevole, e questo documento lo trattava
> come tale.** La prima stesura lo presentava come «il flusso di lavoro reale del laboratorio di
> Filippo» e ne faceva il fatto numero 2 della sintesi. È sbagliato.
>
> Parole di Francesco: *«lascia perdere le informazioni che hai riguardante il laboratorio di
> Filippo, era un laboratorio di test che usavo per cercare di capire come sviluppare la pwa».*
>
> Quel laboratorio serviva a farsi un'idea in fase di studio. **Non descrive il modo di lavorare di
> Francesco, né una prassi accertata del settore.** Va letto come materiale di studio non
> verificato: può suggerire una domanda, non può chiudere una discussione.
>
> ### La regola che ne discende, e che vale da qui in avanti
>
> > *«ad oggi ogni flusso deve essere testato, confutato, ricercato, deciso e approvato, e spesso
> > dovremmo fare ricerche in merito e brainstorming.»*
>
> Nessun flusso si dà per buono perché sta scritto in un documento della cartella `ANALISI/`.
> Ogni affermazione su **come si lavora** va sostenuta da: una fonte esterna verificabile, una
> prova nel codice, un obbligo di legge, oppure una decisione esplicita di Francesco. In mancanza
> di una di queste quattro, si scrive «non verificato» e si va avanti.
>
> ### Che cosa cade e che cosa resta di questo documento
>
> | | Stato |
> |---|---|
> | §2 e ogni passaggio fondato su `ANALISI/05` | ⬇️ **declassato a indizio non verificato** |
> | §3 — che cosa fa oggi il codice (letto `file:riga`) | ✅ **regge**: verificabile da chiunque riaprendo i file |
> | §2 — normativa MDR da `ANALISI/17` | ✅ **regge**: riguarda il regolamento europeo, non quel laboratorio |
> | §1 e §4 — fonti esterne con URL | ✅ **reggono**, col grado di affidabilità dichiarato caso per caso |
> | `ANALISI/15` (DentalMaster) | ⚠️ **da riqualificare**: descrive un software concorrente osservato dal vivo, quindi non ricade nella stessa rettifica — ma la sua autorevolezza sul «come si lavora» non è mai stata stabilita |
>
> **La conclusione della ricerca non cambia** — cambia il suo fondamento: non regge più su «così
> lavora il laboratorio», regge su ciò che il codice fa oggi, su quando la legge pretende quei dati,
> e sul difetto verificato descritto in fondo a questo riquadro.
>
> ### La prova che sostituisce quella caduta (verificata riga per riga il 27/07)
>
> Il wizard propone come esempio **«es. 2.6»** (`PassoPaziente.tsx:85`) e salva la stringa così
> com'è (`crea-lavoro.ts:195`). La mappa dei denti però conosce **solo numeri interi**: converte con
> `.map(Number)` (`TabClinica.tsx:28`), e `2.6` non corrisponde ad alcun dente. Risultato: il dente
> non si accende, il tecnico tocca il 26, e il lavoro finisce per dichiarare **due** denti. Nessuno
> controlla: il precheck di consegna **non guarda né denti né colore** (verificato: `precheck.ts`
> non li nomina), e la Dichiarazione di Conformità stampa il valore grezzo
> (`DdcTemplate.tsx:258-260`). Stesso schema per il colore: la tendina della scheda clinica ammette
> **19 valori VITA** (`TabClinica.tsx:8-14`); un «A22» digitato al banco non ne trova nessuno e si
> presenta come campo **vuoto**, non come campo sbagliato.
>
> **Questa catena non dipende da nessun documento di flusso.** È nel codice, oggi.

---

## 1. Come funziona davvero la presa in carico in un laboratorio odontotecnico

### 1.1 Che cosa arriva dallo studio insieme all'impronta

Quando un dentista manda un lavoro al laboratorio, il documento che accompagna l'impronta (o il
file dello scanner digitale) si chiama in vari modi a seconda della fonte: **prescrizione
odontotecnica** (Italia), **dental laboratory prescription**, **lab slip**, **Rx form**, **work
authorization form** (mondo anglosassone). Sono nomi diversi per lo stesso oggetto: il "biglietto
d'ordine" scritto dal dentista per il tecnico.

**Chi lo compila e quando:** il dentista (o odontoiatra abilitato), al momento della visita col
paziente — prima o insieme alla consegna dell'impronta al laboratorio. Fonte:
[Odontoiatria33 — Prescrizione di un dispositivo medico su misura](https://www.odontoiatria33.it/approfondimenti/20860/prescrizione-di-un-dispositivo-medico-su-misura-ecco-le-indicazioni.html)
— citando le FAQ del **MDCG** (Medical Device Coordination Group, il gruppo di esperti che
scrive le linee guida interpretative del regolamento europeo sui dispositivi medici): la
prescrizione «deve precedere o accompagnare la richiesta al laboratorio odontotecnico», è
firmata da «una persona qualificata autorizzata dalla legislazione nazionale» (il dentista
iscritto all'Albo).

**Che campi contiene, secondo le fonti trovate:**
- dati del prescrittore (nome, iscrizione all'Albo, dati dello studio) — fonte come sopra;
- dati del paziente: nome o pseudonimo (codice) — stessa fonte;
- «caratteristiche progettuali specifiche» — la fonte precisa che **modelli, impronte e file
  digitali da scanner intraorale contano già come caratteristiche progettuali**: cioè l'impronta
  stessa, fisicamente, porta già molte informazioni (dove si trova il dente da restaurare, la sua
  forma) senza che qualcuno debba riscriverle a parole — stessa fonte Odontoiatria33/MDCG.
- fonti di moduli commerciali americani: la ricerca ha restituito estratti (snippet) aggregati da
  più siti di laboratori — Preferred Dental Lab, PFD Digital, IDA Smiles, Cadmus Dental Lab,
  Williams Dental Lab, DDS Lab, Distinctive Dental Studio — che elencano comunemente: nome/codice
  paziente, tipo di restauro, **numero del dente**, materiale, **colore**, istruzioni specifiche,
  firma e data del dentista. **Nessuno di questi moduli è stato letto per intero** (i PDF
  recuperati non erano estraibili come testo, si veda punto 2 delle domande aperte): quanto sopra
  viene dagli estratti di ricerca, non da una lettura diretta del modulo. **Attenzione:** questa è
  prassi commerciale statunitense osservata su più siti, non un obbligo di legge italiano
  verificato.
- un modulo governativo militare USA (**DD Form 2322**, "Dental Laboratory Work Authorization")
  compare più volte nei risultati come esempio strutturato, ma è normativa USA, non italiana —
  citato solo come controprova che il pattern "modulo con numero dente + colore" è diffuso a
  livello internazionale, non che sia legge in Italia.

Non ho trovato, in italiano, un **modulo ufficiale del Ministero della Salute con un elenco
tassativo di campi obbligatori** per la prescrizione odontotecnica cartacea: i risultati (Mr
Dental, Format Dental, AlfaDocs, Buffetti) descrivono moduli commerciali o gestionali software,
non un testo di legge con un fac-simile vincolante. **Questo punto resta segnato come «non
verificato»** — vedi sezione finale.

### 1.2 Quando si sceglie il colore del dente: in studio o in laboratorio?

Le fonti reperite (tutte in ambito internazionale, non specificamente italiano) sono concordi:
**il colore si sceglie in studio, col paziente presente, prima o all'inizio della seduta in cui
si prepara il dente** — non in laboratorio.

- [Burbank Dental Lab — Teeth Shades: Increasing Predictability](https://burbankdental.com/teeth-shades-increasing-predictability/):
  «take the shade at the beginning of the process, especially before prepping» — perché la
  disidratazione del dente durante la seduta (bocca aperta, luci) altera il colore percepito nel
  giro di pochi minuti. Il dentista sceglie con una **mazzetta colore** (shade guide, es. VITA
  Classic o VITA 3D Master — tavolette di riferimento fisiche) tenuta accanto al dente del
  paziente, poi documenta con foto e la invia al laboratorio.
- [MedCrave — Basics of shade selection and importance of laboratory communication](https://medcraveonline.com/JDHODT/basics-of-shade-selection-and-importance-of-laboratory-communication-restorative-dentistry.html):
  stessa indicazione — «selected at the start of the appointment, before dehydration» — con il
  dentista come selettore primario, l'assistente a conferma, e talvolta il tecnico (ceramista)
  consultato **a distanza per i casi difficili**. Strumenti citati: mazzette colore VITA,
  illuminazione a luce corretta (6500K), e in alcuni studi più attrezzati **spettrofotometri o
  colorimetri** (strumenti elettronici che misurano il colore in modo oggettivo invece che a
  occhio).

**Conclusione di questa parte (prassi diffusa, non legge):** il colore nasce come decisione dello
studio, non del laboratorio. Il laboratorio lo **riceve**, non lo **genera**. Se UÀ chiede il
colore, lo sta chiedendo a chi lo ha appena osservato (chi prende in carico il lavoro, spesso
front desk/odontotecnico che trascrive quanto comunicato dal dentista) — non lo sta inventando.

**Attenzione a non confondere due fatti distinti**, che il paragrafo successivo tiene separati:
*quando l'informazione sul colore esiste* (in studio, subito — quanto appena visto) è una cosa;
*quando il laboratorio la registra come dato strutturato nel proprio gestionale* è un'altra. Il
§1.3 che segue riguarda il secondo punto, non il primo.

### 1.3 La fonte più diretta trovata: il flusso reale del laboratorio su cui UÀ è modellato

La fonte più forte trovata in questa ricerca non viene dal web, ma dal repository stesso:
`ANALISI/05_workflow_completo.md`, intitolato **«Workflow Completo — Laboratorio Odontotecnico
di Filippo Opromolla»** — cioè non un caso generico, ma la ricostruzione del flusso di lavoro
reale, osservato nel laboratorio che ha ispirato UÀ, con il gestionale DentalMaster.

Il diagramma di flusso principale del documento elenca, fase per fase, quali dati vengono
inseriti e quando. La primissima fase — «Registra Lavoro», subito dopo l'arrivo della
prescrizione cartacea dal dentista — elenca esplicitamente i dati richiesti in quel momento:

> «Registra Lavoro (Cliente, Paziente, Tipo dispositivo, Data consegna, Ciclo produzione)»
> (`ANALISI/05_workflow_completo.md:9-13`)

**Né l'elemento dentale né il colore compaiono in questo elenco.** Il colore compare invece
molto più avanti nel flusso, dentro la fase «Completamento»:

> «Completamento (Ceramica, colore, sinterizzazione, lucidatura)»
> (`ANALISI/05_workflow_completo.md:26-29`)

Il dettaglio fase-per-fase dello stesso documento (righe 49-157) conferma questa collocazione con
un secondo riferimento indipendente: la fase «1. RICEZIONE LAVORO» (righe 51-64, quella che
corrisponde alla creazione del lavoro nel wizard UÀ) elenca come azioni: creare il record,
inserire Cliente/Richiedente/Paziente/Tipo dispositivo, scegliere il Ciclo di produzione,
registrare le date, **verificare le impronte** (tipo, disinfettante, confezione), segnare i
materiali allegati, assegnare il tecnico. **Elemento e colore non compaiono in nessuna di queste
azioni.** Il colore ricompare solo nella fase «3. PRODUZIONE FISICA» (righe 90-104):

> «Tecnico marca fasi OL331 (fresatura), OL27 **(colorazione)**, OL35 (sinterizzazione)»
> (`ANALISI/05_workflow_completo.md:94`)

**Questo è un fatto verificato, non un'inferenza:** nel flusso di lavoro reale del laboratorio di
riferimento di UÀ, il colore entra a far parte del lavoro **due fasi dopo** la sua ricezione —
quando il dispositivo viene fisicamente colorato in produzione (fase 3), non quando il lavoro
viene aperto (fase 1). Il documento non tratta l'elemento dentale come voce separata in nessuna
fase — non compare né alla ricezione né in produzione come dato a sé stante — un punto che
lascio segnato in «domande aperte» perché il documento non lo scioglie esplicitamente.

### 1.4 Il numero dell'elemento: conferma da una seconda fonte (DentalMaster)

Il repository contiene anche l'analisi del gestionale concorrente **DentalMaster**
(`ANALISI/15_dentalmaster_funzionalita_complete.md`), usato da UÀ come riferimento di prassi di
settore più ampio (non solo il laboratorio di Filippo). Lì la sequenza delle fasi di un ciclo
reale osservato (corona in zirconia-ceramica) è:

> `OL01 RICEVIMENTO IMPRONTE DEI MODELLI, CODIFICA` → `OL02 DISINFEZIONE` → `OL03 ANALISI
> IMPRONTE` → `OL04 SVILUPPO MODELLI` → ...
> (`ANALISI/15_dentalmaster_funzionalita_complete.md:667-671`)

Cioè: si riceve l'impronta (fase 1), si disinfetta (fase 2), **e SOLO alla fase 3 si analizza
l'impronta**. Coerente con quanto appena visto in §1.3, ma su un caso diverso.

Nello stesso documento, la scheda di un lavoro reale mostra il numero dell'elemento scritto
dentro il campo libero «Descrizione» (`Descrizione: ELEMENTO CERAMICA 14`,
`ANALISI/15_dentalmaster_funzionalita_complete.md:635`) e lo stesso accade nei documenti di
**consegna**, non di apertura lavoro: il Buono di Consegna mostra «14 - ELEMENTO CERAMICA»
(`ANALISI/15_dentalmaster_funzionalita_complete.md:308`), e la Ricevuta di Consegna per il
dentista cita esplicitamente «prescrittore del DM su misura ELEMENTO CERAMICA 14»
(`ANALISI/15_dentalmaster_funzionalita_complete.md:277-278`). **In nessuno dei tre documenti
osservati l'elemento compare nella schermata di apertura/creazione del lavoro** — compare nella
scheda del lavoro (già aperto) e nei documenti generati alla consegna.

**Riassunto onesto:** non ho trovato una fonte che dica esplicitamente «il numero del dente non
si conosce all'apertura del lavoro». Ho trovato, in due fonti indipendenti del repository (il
flusso reale del laboratorio di Filippo e l'analisi di DentalMaster), che né l'elemento né il
colore compaiono tra i dati raccolti nella fase di ricezione/registrazione del lavoro, e che il
colore in particolare è documentato come dato che entra due fasi più avanti, in produzione.

---

## 2. Che cosa dice la normativa

Fonte: `ANALISI/17_adempimenti_lab_2026.md`, sezione 1.2 «Dichiarazione di Conformità (DoC) per
Dispositivi Su Misura». Riferimento normativo: **Art. 52(8) + Allegato XIII del Regolamento (UE)
2017/745 (MDR)** — non l'Allegato IV, citato per errore in una versione precedente e corretto
esplicitamente nel documento (`ANALISI/17_adempimenti_lab_2026.md:88-91`).

**Che cos'è la DoC, in parole semplici:** è il documento con cui il laboratorio dichiara che il
dispositivo su misura (la corona, la protesi...) rispetta i requisiti di sicurezza previsti dalla
legge. Non è il modulo con cui il dentista *chiede* il lavoro (quello è la prescrizione, §1) — è
il documento con cui il laboratorio *conferma* di averlo fatto a regola d'arte.

### 2.1 Quando deve esistere la DoC

`ANALISI/17_adempimenti_lab_2026.md:101`:
> «**Quando va generata:** A ogni singola consegna di un dispositivo su misura. Una dichiarazione
> distinta per ogni lavoro/ordine.»

Questo è confermato anche da una fonte esterna, il produttore tedesco BEGO (fornitore di sistemi
CAD/CAM per odontotecnica), che descrive la Dichiarazione di Conformità come documento creato
**dopo** la consegna al paziente: [BEGO — Declaration of Conformity for Customized
Products](https://www.bego.com/cad-cam-solutions/services/declaration-of-conformity/).

**Punto chiave: la DoC è un obbligo legato alla CONSEGNA, non alla creazione del lavoro.**

### 2.2 Che cosa deve contenere la DoC (gli 8 elementi obbligatori)

`ANALISI/17_adempimenti_lab_2026.md:114-125` elenca gli 8 elementi obbligatori del punto 1
dell'Allegato XIII MDR. Il secondo è quello che riguarda direttamente la nostra domanda:

> «2. **Dati identificativi del dispositivo** — tipologia, dente/arcata, materiale, colore,
> numero lavoro» (`ANALISI/17_adempimenti_lab_2026.md:119`)

Quindi: **sì, «dente/arcata» e «colore» sono dati obbligatori per legge** — ma sono obbligatori
**nella Dichiarazione di Conformità**, cioè nel documento generato alla consegna. La norma non
dice che debbano esistere già al momento in cui il lavoro viene aperto in laboratorio — dice che
devono esistere **prima che il dispositivo venga immesso sul mercato** (consegnato), come recita
il testo dell'Art. 52(8) MDR citato alla riga 94 dello stesso file: «prima dell'immissione di tali
dispositivi sul mercato».

**Nota su una possibile ambiguità nel repository:** lo schema del database
(`ANALISI/23_ua_database_schema.md:959`) ha un commento che dice «Contiene i 12 elementi
obbligatori per la DoC (Allegato IV MDR)» — questo è il riferimento normativo **vecchio e
corretto altrove** (Allegato IV era per dispositivi con marcatura CE, non su misura — la
correzione ad Allegato XIII è documentata in `ANALISI/17_adempimenti_lab_2026.md:88-91`, datata
12/05/2026). Il commento nello schema DB non è stato aggiornato con la stessa correzione: è un
disallineamento testuale nella documentazione, segnalato qui perché chi legge lo schema grezzo
potrebbe prendere «12 elementi Allegato IV» come riferimento attuale, mentre non lo è più.

### 2.3 Creazione vs consegna: la distinzione esplicita

| Momento | Che cosa richiede la norma (Allegato XIII, `ANALISI/17_adempimenti_lab_2026.md:114-125`) |
|---|---|
| **Creazione del lavoro** (apertura in laboratorio) | Nessun obbligo diretto di legge trovato nel documento sul *contenuto* a questo stadio. Il fatto giuridicamente rilevante a questo punto è un altro: deve **esistere una prescrizione** del dentista che precede o accompagna la richiesta (§1.1, fonte Odontoiatria33/MDCG) — non che i suoi contenuti (dente, colore) siano già stati ritrascritti in campi strutturati del gestionale del laboratorio. La norma non parla di "apertura lavoro" come evento giuridico a sé. |
| **Consegna del dispositivo** | Obbligatori: nome/indirizzo fabbricante, **dente/arcata**, materiale, **colore**, numero lavoro, dichiarazione "su misura", nome paziente, nome prescrittore, dichiarazione conformità Allegato I, luogo/data/firma (elenco completo `ANALISI/17_adempimenti_lab_2026.md:118-125`) |

**In sintesi normativa:** elemento e colore sono obbligatori per legge **al più tardi alla
consegna** (quando si genera la DoC). Il documento ANALISI/17 non stabilisce — e io non ho
trovato altrove — un obbligo di legge che imponga di raccoglierli già al momento dell'apertura
del lavoro.

---

## 3. Che cosa fa oggi UÀ (letto dal codice)

### 3.1 Il Passo 3 del wizard — `src/components/features/wizard/PassoPaziente.tsx`

Le tre righe facoltative sono renderizzate alle righe **80-105**, sotto il titolo «Se vuoi,
aggiungi» (`stileOpzCap`, riga 81 nel JSX):

```
RigaOpzionale «Elemento» (esempio «2.6»)   — righe 83-90
RigaOpzionale «Colore»   (esempio «A2»)    — righe 91-98
RigaOpzionale «Nome o alias»               — righe 99-105
```

Ogni riga è gestita dal componente `RigaOpzionale` (righe 138-193): **chiusa** di default se
vuota (mostra solo nome + esempio + link «Salta»), **aperta** se già compilata o se l'utente ci
tocca sopra (mostra un campo di testo + lo stesso link «Salta», che qui richiude la riga E svuota
il valore — riga 149-152, `function salta()`).

Il commento in testa al file (righe 6-13) chiarisce l'intento GDPR: nessun nome del paziente è
mai obbligatorio, solo il codice `PZ-####` proposto automaticamente; l'alias è una scelta
esplicita di chi compila, non un campo urgente.

### 3.2 Dove finiscono elemento e colore — `src/lib/wizard/crea-lavoro.ts`

Il file descrive esplicitamente (commento righe 6-11) una sequenza di **5 passi fail-soft**: i
primi 3 sono il percorso primario (bloccanti — se falliscono, nessun lavoro viene creato); gli
ultimi 2 (elemento/colore, foto) sono «accessori»: possono fallire **senza invalidare il lavoro
già creato**.

Concretamente:

1. Risolvi/crea il paziente (righe 122-154) — bloccante.
2. `POST /api/lavori` — crea il lavoro vero e proprio (righe 162-182) — bloccante. **Il corpo
   della richiesta (righe 168-175) non contiene né `elemento` né `colore` in nessuna forma.**
3. **Solo se `elemento` o `colore` sono stati compilati** (riga 188: `if (elemento || colore)`),
   viene fatta una **chiamata separata**, una `PATCH /api/lavori/${lavoro.id}` (righe 190-198):

   ```ts
   body: JSON.stringify({
     denti_coinvolti: elemento.split(/[,\s]+/).filter(Boolean),
     colore_dente: colore,
   }),
   ```

   Se questa PATCH fallisce, il lavoro esiste comunque: viene solo segnalato un avviso
   (`accessoriFalliti.push('dettagli')`, riga 199).
4. Se c'è una foto, altra chiamata separata (righe 206-220), stesso principio fail-soft.

**Fatto rilevante:** elemento e colore **non fanno mai parte della creazione del lavoro** nel
codice attuale — sono già, tecnicamente, un passo successivo e non bloccante (una PATCH dopo il
POST), anche se nell'interfaccia sembrano parte dello stesso "Passo 3". Il wizard li tratta come
dato accessorio fin dall'architettura, non solo nella UI.

### 3.3 Che cosa richiede il POST — `src/app/api/lavori/route.ts`

La validazione server-side (righe 104-119) impone come obbligatori solo: `cliente_id`,
`tipo_dispositivo`, `descrizione`, `data_consegna_prevista`. L'oggetto scritto nel database
(`insertData`, righe 171-193) **non include in nessun punto `denti_coinvolti` o `colore_dente`** —
questi due campi non sono nemmeno previsti come opzionali in questa route: **si scrivono solo
tramite la PATCH separata descritta al punto 3.2**.

### 3.4 Elemento e colore sono correggibili dopo? — `src/app/api/lavori/[id]/route.ts`

Sì. La lista `PATCHABLE_FIELDS` (righe 73-110) include esplicitamente:

- `denti_coinvolti` (riga 89), `denti_mancanti` (riga 90), `denti_impianti` (riga 91)
- `colore_dente` (riga 92), `colore_collo` (riga 93), `colore_corpo` (riga 94), `colore_incisale`
  (riga 95)
- `effetti_speciali` (riga 96), `tecnica_colore` (riga 97)

Il commento nel codice (righe 36-39) attribuisce questi campi a un writer già esistente:
**`TabClinica.tsx`**. Verificato leggendo quel file
(`src/components/features/lavori/form/TabClinica.tsx`):

- un **odontogramma FDI** interattivo (righe 24-35, componente `OdontogrammaFDI`) per selezionare
  denti coinvolti, mancanti e con impianto — molto più espressivo del campo di testo libero
  «2.6» del wizard;
- quattro menu a tendina colore (dente, collo, corpo, incisale — righe 50-128) basati sulla
  **scala VITA completa**, 19 tonalità (`VITA_SCALE`, righe 8-14: A1...D4, T, BL, OM) — invece del
  campo testo libero «A2» del wizard;
- due campi di testo per «effetti speciali» e «tecnica colore» (righe 132-159).

Questo tab è montato dentro `LavoroFormClient.tsx` (righe 15 e 148:
`<TabClinica data={data} onChange={update} />`), che a sua volta è la pagina
`src/app/(app)/lavori/[id]/modifica/page.tsx`. **Conclusione: esiste già oggi una schermata
completa — più ricca del wizard — da cui inserire o correggere elemento e colore DOPO la
creazione del lavoro: la scheda di modifica del lavoro, tab «Clinica».**

### 3.5 Contesto di progetto già registrato in memoria

`memory/MEMORY.md` (voce del 12 luglio 2026 notte, sull'Ondata 2 del wizard) registra esplicitamente,
tra i «fatti verificati» prima ancora di scrivere il wizard: **«PATCH allowlist ha già
denti_coinvolti/colore_dente»** — cioè la possibilità di correggere questi due campi dopo la
creazione **esisteva già ed era nota** prima che le due righe opzionali del Passo 3 venissero
progettate. Le due righe del wizard non hanno creato una via di correzione: si sono aggiunte a
una che c'era da prima.

Va anche segnalato — perché è un vincolo di prodotto già ratificato che riguarda direttamente
questa famiglia di campi — che `ua-app/CLAUDE.md` registra una **direttiva permanente di
Francesco (27/07/2026)**: ogni campo del lavoro deve restare correggibile dalla creazione fino
alla consegna/fatturazione, perché l'errore di digitazione al banco è «il caso normale, non
l'eccezione». Lo stesso documento nota che oggi questo principio è rispettato solo in parte: 16
campi sono esclusi da `PATCHABLE_FIELDS` con la motivazione «nessun writer nel form React
attuale» — tra questi **`arcata`** (superiore/inferiore/entrambe), un campo dentario adiacente a
elemento e colore che oggi, a differenza loro, **non ha ancora una schermata da cui correggerlo**.
Questo è un punto di censimento già aperto in roadmap, non specifico alla domanda di questo
documento, ma pertinente: mostra che «elemento» e «colore» sono già nella condizione più
matura (hanno un writer), mentre un campo dentario cugino (`arcata`) non ce l'ha ancora.

---

## 4. Pattern UI/UX di riferimento, con fonti

### 4.1 Progressive disclosure — differire un dato invece di chiederlo subito

La **progressive disclosure** ("divulgazione progressiva") è un pattern di design coniato da
Jakob Nielsen nel 1995: invece di mostrare tutte le opzioni possibili subito, si mostra solo ciò
che serve al passo corrente, lasciando il resto disponibile "a richiesta". Fonte:
[Wikipedia — Progressive disclosure](https://en.wikipedia.org/wiki/Progressive_disclosure);
ripreso in chiave di form design da [NN/g — video Progressive
Disclosure](https://www.nngroup.com/videos/progressive-disclosure/). **Attenzione:** NN/g avverte
anche che oltre due livelli di divulgazione tendono a peggiorare l'usabilità (l'utente si perde
tra i livelli) — non è un pattern da applicare senza limite.

### 4.2 Il costo cognitivo dei campi facoltativi — NN/g

[NN/g — Few Guesses, More Success: 4 Principles to Reduce Cognitive Load in
Forms](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/) (Nielsen Norman
Group — ente di ricerca su usabilità fondato da Jakob Nielsen e Don Norman) formula 4 principi:
struttura, trasparenza, chiarezza, supporto. Sui campi facoltativi in particolare:

> «minimizzare del tutto le domande facoltative, perché ogni domanda aggiunge lunghezza al
> modulo e sforzo percepito nel completarlo. Se un campo facoltativo è necessario, va segnalato
> chiaramente come tale accanto agli indicatori dei campi obbligatori.»

L'articolo raccomanda anche di **ordinare le domande** per familiarità, priorità, dipendenza,
complessità e sensibilità — partendo dalle informazioni più semplici e meno personali. Questo è
un'opinione di design basata su ricerca di usabilità, non un obbligo di legge.

### 4.3 Marcare i campi facoltativi (o rimuoverli) — Baymard Institute

Il **Baymard Institute** è un ente di ricerca specializzato in test di usabilità su form di
e-commerce. Fonte diretta:
[Baymard — E-Commerce Checkouts Need to Mark Both Required and Optional Fields
Explicitly](https://baymard.com/blog/required-optional-form-fields):

- solo il 14% dei siti e-commerce marca esplicitamente sia i campi obbligatori sia quelli
  facoltativi; marcarne solo uno dei due tipi produce più errori di validazione o più abbandono;
- punto rilevante per UÀ: **«molti dei campi comunemente facoltativi è meglio nasconderli del
  tutto dietro un link» (es. "Indirizzo riga 2")** — nei test, questo è bastato da solo a
  comunicare "è facoltativo", senza bisogno di altre etichette. **Questo è esattamente il pattern
  che `RigaOpzionale` in UÀ già implementa** (riga chiusa con nome + esempio, che si apre al tocco
  — `PassoPaziente.tsx:138-193`).

### 4.4 «Chiedi solo ciò che ti serve davvero» — GOV.UK Design System

Il **GOV.UK Design System** è la guida di design ufficiale del governo britannico per i servizi
digitali pubblici, con anni di test di usabilità su milioni di utenti reali. Fonte:
[GOV.UK Design System — Names](https://design-system.service.gov.uk/patterns/names/):

> «Chiedi il nome delle persone solo se ti serve quell'informazione per erogare il servizio.»

E, sul secondo nome (campo tipicamente facoltativo): la guida raccomanda di **non** scrivere
"(opzionale)" nell'etichetta — «gli utenti scriveranno il secondo nome se ce l'hanno e salteranno
il campo se non ce l'hanno». Il principio di fondo: se un campo è ovviamente non essenziale nel
contesto, non serve nemmeno l'etichetta "opzionale" — tanto meno un controllo aggiuntivo.

### 4.5 Il tasto «Salta» accanto a un campo facoltativo: pattern riconosciuto o ridondante?

**Non ho trovato uno studio dedicato specificamente a un tasto "Salta"/"Skip" accanto a un
singolo campo già dichiarato facoltativo** in un form — le ricerche mirate su questo punto esatto
non hanno restituito una fonte diretta che lo tratti come pattern a sé (solo articoli generali su
come marcare i campi facoltativi, es. [UX Movement — Always Mark Optional Form Fields Not
Required Ones](https://uxmovement.com/forms/always-mark-optional-form-fields-not-required-ones/)).
Questo resta un limite della ricerca (vedi anche punto 4 delle domande aperte). Detto questo, tre
fatti — due dalle fonti già citate, uno dal codice — permettono una risposta diretta alla
domanda, senza bisogno di uno studio dedicato al tasto in sé:

1. **Le fonti di design citate sopra convergono su "marcare/nascondere", non "aggiungere un
   secondo controllo".** GOV.UK (§4.4) non mette nemmeno l'etichetta "(opzionale)" su un campo
   ovviamente non essenziale, perché «gli utenti scriveranno [il dato] se ce l'hanno e salteranno
   il campo se non ce l'hanno» — cioè: lasciarlo vuoto è già "saltarlo", senza bisogno di un
   controllo dedicato. Baymard (§4.3) arriva alla stessa conclusione per un'altra via: nascondere
   il campo facoltativo dietro un link/riga chiusa è **già sufficiente da solo** a comunicare che
   è opzionale, nei test reali che ha condotto.
2. **Nessuna delle due fonti descrive o raccomanda un controllo dedicato per "confermare" di
   voler saltare un campo facoltativo.** Non è che lo sconsiglino esplicitamente: è che il pattern
   non compare nella letteratura consultata come soluzione a un problema — perché il problema
   (l'utente non sa se può ignorare il campo) è già risolto, in queste fonti, dalla marcatura o
   dal nascondimento del campo stesso.
3. **Riletto con attenzione, il codice di `RigaOpzionale` mostra che «Salta» è visibile SEMPRE, in
   entrambi gli stati** — non solo quando la riga è aperta. Nello stato chiuso (di default, quando
   `valore === ''`), la riga rende sia il bottone nome+esempio sia il link «Salta» fianco a fianco
   (`PassoPaziente.tsx:178-193`, in particolare riga 190: `<LinkQuieto onClick={salta}>Salta</LinkQuieto>`
   dentro il ramo "chiuso"). Ma la funzione che quel link chiama (`function salta()`, righe
   149-152: `setAperto(false); onCambia('')`) su una riga **già chiusa e già vuota** non cambia
   nulla di osservabile: `setAperto(false)` non ha effetto se `aperto` è già `false`, e
   `onCambia('')` non ha effetto se il valore è già `''`. **In questo stato, verificato leggendo
   il codice, il tasto «Salta» è un'azione a vuoto** — la riga comunica già "puoi ignorarla" con
   la sua sola presenza tra le voci sotto «Se vuoi, aggiungi», e il tasto non aggiunge una
   funzione che non ci sia già. Il link riacquista un compito reale solo quando la riga è
   **aperta** (righe 162-170): lì «Salta» richiude la riga **e cancella** quanto l'utente ha
   appena iniziato a scrivere — un annulla, non un salta.

**In sintesi:** nella letteratura consultata non esiste un pattern riconosciuto e nominato «Skip
accanto a un campo opzionale» — l'assenza è essa stessa un dato, non solo una lacuna di ricerca,
perché le fonti che discutono esplicitamente questo problema lo risolvono per altra via (marcatura
o nascondimento). E nel codice di UÀ, verificato riga per riga, il tasto «Salta» sulla riga chiusa
è ridondante rispetto alla riga stessa (che comunica già la stessa cosa restando chiusa); il suo
solo effetto reale è sulla riga aperta, dove serve ad annullare una digitazione in corso, non a
"saltare" un campo che il layout ha già dichiarato facoltativo.

---

## Le domande che restano aperte

Cose che questa ricerca non è riuscita a stabilire, e perché:

1. **Non esiste, nelle fonti trovate, un modulo ufficiale italiano con un elenco tassativo di
   campi obbligatori per la "prescrizione odontotecnica" cartacea.** I risultati di ricerca
   mostrano moduli commerciali (gestionali, associazioni di categoria) ma non un testo di legge
   italiano con un fac-simile vincolante distinto dal Regolamento europeo MDR. Non è chiaro se
   tale modulo standardizzato esista e io non l'abbia trovato, o se in Italia la prescrizione sia
   effettivamente libera nella forma (basta che sia scritta, firmata, datata) fino a quando non
   dà luogo alla DoC — che invece **è** normata nel dettaglio (§2).

2. **Non ho potuto leggere il testo completo di nessun modulo di prescrizione reale (italiano o
   estero) in formato PDF.** Diversi PDF recuperati (moduli di laboratori USA, un documento
   dell'Ordine dei Medici di Messina) non sono stati estraibili come testo dallo strumento di
   lettura usato in questa ricerca — sono stati scaricati ma non letti riga per riga. Le
   informazioni sul loro contenuto derivano dagli estratti (snippet) dei risultati di ricerca, non
   da una lettura diretta e completa del documento.

3. **Non ho trovato una fonte esplicita e diretta sul momento esatto in cui il numero
   dell'elemento dentale "diventa noto"** — se è sempre scritto dal dentista sulla prescrizione al
   momento della presa d'impronta, o se in una parte dei casi il tecnico lo deduce guardando
   l'impronta/il modello. Ho trovato due indizi concreti e convergenti (il flusso reale del
   laboratorio di Filippo, `ANALISI/05_workflow_completo.md`, §1.3; e la sequenza di fasi di
   DentalMaster, §1.4) che mostrano dove l'elemento **compare per iscritto** (descrizione del
   lavoro, documenti di consegna) e dove **non** compare mai come campo obbligatorio a sé
   (ricezione lavoro) — ma nessuna delle due fonti dimostra che il numero sia *sconosciuto* al
   ricevimento: potrebbe benissimo essere già scritto sulla prescrizione cartacea e semplicemente
   non ancora trascritto in un campo strutturato, o non ancora *verificato/confermato* dal
   tecnico leggendo l'impronta.

4. **Non ho trovato uno studio dedicato specificamente al pattern «tasto Salta accanto a un campo
   già dichiarato facoltativo»** come oggetto nominato di ricerca (si veda §4.5) — solo letteratura
   adiacente su come marcare i campi facoltativi in generale, da cui ho comunque potuto trarre una
   risposta diretta incrociandola con la lettura del codice (`PassoPaziente.tsx`). Resta aperto se
   esistano studi dedicati che io non ho reperito con le query usate.

5. **Non ho dati quantitativi reali sull'uso del wizard UÀ** — quante «Nuovo lavoro» venivano
   completate lasciando Elemento e/o Colore vuoti, quante volte la PATCH di step 4 (§3.2) fallisce
   in produzione, o quanto spesso l'odontotecnico poi torna sulla scheda «Clinica» per
   completarli. Questi dati, se esistono in un log applicativo o in Supabase, non sono stati
   consultati in questa ricerca (mandato: solo codice sorgente, ANALISI, e web).

6. **Non ho verificato se altre normative italiane (es. linee guida degli Ordini professionali,
   norme tecniche di settore UNI) impongano obblighi aggiuntivi sul contenuto della prescrizione**,
   oltre a quanto già coperto da MDR/Allegato XIII in `ANALISI/17`. La ricerca si è fermata alle
   fonti reperibili via ricerca web generalista in italiano e inglese.
