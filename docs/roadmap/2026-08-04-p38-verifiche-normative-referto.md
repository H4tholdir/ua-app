# Referto — Quattro verifiche su fonte primaria per P38-B e D196

**Per:** il panel advisor e la spec della strada B (D201). **Quando:** 4 agosto 2026.
**Come:** ricerca su fonti primarie (EUR-Lex, Commissione UE, Gazzetta Ufficiale, Agenzia Entrate),
binario parallelo di Fase 1. Nessun file del repo modificato dalla ricerca.
**Supera** la nota storica «EUR-Lex si è troncato prima degli allegati» (P37, panel D195): il
troncamento era dello strumento di lettura, non della fonte — il consolidato completo è citato qui.

---

Metodo: i testi EUR-Lex sono stati scaricati integralmente via HTTP (HTML completo, 1,69 MB IT / 1,63 MB EN) e gli allegati estratti localmente — **il troncamento dei tre tentativi passati era del metodo di lettura, non della fonte**: il consolidato contiene tutti i 17 allegati. File di lavoro in scratchpad di sessione (nulla scritto nel repo).

---

## §1 — Allegato XIII punto 1 MDR, consolidato IT 2026 (con riscontro EN)

**Esito: VERIFICATO** (consolidato `02017R0745 — IT — 01.01.2026 — 006.001`; intestazione della pagina riscontrata).

**Testo letterale IT, Allegato XIII «PROCEDURA PER I DISPOSITIVI SU MISURA», punto 1, elenco completo:**

> «1. Per i dispositivi su misura il fabbricante o il suo mandatario redige una dichiarazione contenente tutte le seguenti informazioni:
> — il nome e l'indirizzo del fabbricante e di tutti i luoghi di fabbricazione,
> — il nome e l'indirizzo dell'eventuale mandatario,
> — i dati che consentono di identificare il dispositivo in questione,
> — una dichiarazione secondo cui il dispositivo è destinato a essere utilizzato esclusivamente da un determinato paziente o utilizzatore, identificato mediante il nome, un acronimo o un codice numerico,
> — il nome della persona che ha prescritto il dispositivo e che vi è autorizzata dal diritto nazionale in virtù delle sue qualifiche professionali e, se del caso, il nome dell'istituzione sanitaria in questione,
> — le caratteristiche specifiche del prodotto indicate nella prescrizione,
> — una dichiarazione secondo cui il dispositivo in questione è conforme ai requisiti generali di sicurezza e prestazione stabiliti nell'allegato I e, se del caso, l'indicazione dei requisiti generali di sicurezza e prestazione che non sono stati interamente rispettati, con debita motivazione,
> — se del caso, l'indicazione che il dispositivo contiene o incorpora una sostanza medicinale, compreso un derivato dal sangue o dal plasma umani, o tessuti o cellule di origine umana o di origine animale di cui al regolamento (UE) n. 722/2012.»

**Riscontro EN** (stesso consolidato, EN): «the name of the person who made out the prescription and who is authorised by national law by virtue of their professional qualifications to do so, and, where applicable, the name of the health institution concerned» · «the specific characteristics of the product as indicated by the prescription».

**Fonti:** IT: https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:02017R0745-20260101 · EN: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02017R0745-20260101 (esiste anche il PDF: stessa URL con `/PDF/`).

**Riscontri aggiuntivi (fatti, non interpretazione):** ① l'Allegato XIII IT del testo base 2017 (CELEX 32017R0745) è **byte-per-byte identico** al consolidato 2026: l'allegato non è mai stato emendato; ② la citazione che il repo aveva preso dalla riproduzione secondaria (medicaldevicenews.eu, verbale D192) **coincide parola per parola** col consolidato — D192 è ora ratificabile secondo lo standard D125; ③ punto 4: la dichiarazione si conserva **almeno 10 anni** (15 se impiantabile).

**Che cosa cambia per P38-B:** la tesi di D192/D195 regge sulla fonte primaria: sono **due caselle unite da «e»** (persona obbligatoria + istituzione «se del caso»), e il «dato prescritto strutturato» deve mappare 1:1 l'elemento «le caratteristiche specifiche del prodotto indicate nella prescrizione» — al singolare normativo: le caratteristiche stanno *nella prescrizione*, la dichiarazione le *riporta*. Quindi P38-B deve progettare il dato in modo che ciò che finisce in DdC sia una proiezione fedele di ciò che il prescrittore ha indicato, non una ricostruzione del laboratorio.

---

## §2 — MDCG 2021-3, Q6 (prescrizione con «specific design characteristics»)

**Esito: VERIFICATO il contenuto — ma la citazione di repo va corretta: una «Rev.1» di MDCG 2021-3 NON risulta esistere.** La pagina ufficiale della Commissione (consultata il 04/08/2026, aggiornata fino a luglio 2026) elenca sotto «Custom-Made Devices» solo: «MDCG 2021-3 — Questions and Answers on Custom-Made Devices — March 2021». PDF scaricato dalla fonte primaria e letto integralmente (8 pagine).

**Testo letterale Q6 (pag. 6):**

> «**6. What defines a written prescription containing patient specific design characteristics?**
> A written prescription must be issued by a qualified person authorised by national law. At minimum, it should contain:
> − the name of the patient (or pseudonym if relevant),
> − specific design characteristics made by the authorised person which are unique to the patient's anatomic-physiological features and/or pathological condition.
> The following (non-exhaustive) additions can accompany a written prescription and if so, also constitute specific design characteristics:
> • models (physical or 3D model data).
> • moulds (e.g. for dental or orthotic purposes).
> • dental impressions.
> Note: Dimensions and/or geometric parameters (such as DICOM files from CT scans) are not considered specific design characteristics on their own. Additional measured data or information¹⁰ by the prescribing person is necessary as part of a written prescription in order for the definition of a CMD to be met.»
> Nota 10: «Such as the thickness and trajectory of a plate, the number, type and positions of fixation screws, choice of material, shall also be provided for in the prescription to be considered as containing specific design characteristics.»

Il frammento citato dal repo («the number, type and positions of fixation screws») è quindi **la nota 10 a piè di pagina**, non il corpo di Q6 — esempi riferiti a piastre ossee, non esaustivi; vi compare anche «choice of material», molto pertinente per l'odontotecnica. Altri punti utili dello stesso documento: **Q1** (esempio esplicito: «A dental crown manufactured according to a written prescription provided by a dentist containing specific design characteristics for a particular patient's individual condition»); **Q7** (chi è «authorised person» lo decide il diritto nazionale); **Q9** (la dichiarazione Allegato XIII sostituisce la DdC e «shall be made available to the particular patient or user»).

**Fonti:** PDF: https://health.ec.europa.eu/document/download/385d7e20-d8b5-49d0-abd7-8daf269bf1b8_en?filename=mdcg_2021-3_en.pdf · pagina indice: https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en (documento «not legally binding», dichiarato in copertina).

**Che cosa cambia per P38-B:** il dato prescritto strutturato ha ora il suo requisito minimo su fonte primaria: **nome/pseudonimo del paziente + almeno una caratteristica di progetto decisa dal prescrittore e unica per quel paziente**; e deve poter registrare gli «accompagnamenti» (impronta, modello fisico, dati 3D) come parte della prescrizione, perché per Q6 *sono* caratteristiche specifiche quando accompagnano. Le sole dimensioni/scansioni non bastano: il form non dovrebbe considerare «completa» una prescrizione fatta di soli numeri senza una scelta del prescrittore (es. materiale, tipo di lavorazione). In memoria/roadmap va corretta la dicitura «Rev.1».

---

## §3 — Lo studio associato è una «società» ai fini della L. 124/2017, art. 1, c. 153?

**Precisazione preliminare:** il mandato descriveva il c. 153 come «obbligo fatturazione elettronica / identificazione» — è inesatto. Il c. 153 riguarda **chi può esercitare l'attività odontoiatrica e l'obbligo di direttore sanitario per le società** (coerente con come il repo lo usa in D196).

**Testo letterale c. 153** (GU Serie Generale n. 189 del 14/08/2017; riscontrato **identico** nella versione multivigente n. 19 della stessa banca dati GU, quindi mai modificato):

> «153. L'esercizio dell'attività odontoiatrica è consentito esclusivamente a soggetti in possesso dei titoli abilitanti di cui alla legge 24 luglio 1985, n. 409, che prestano la propria attività come liberi professionisti. L'esercizio dell'attività odontoiatrica è altresì consentito alle società operanti nel settore odontoiatrico le cui strutture siano dotate di un direttore sanitario iscritto all'albo degli odontoiatri e all'interno delle quali le prestazioni di cui all'articolo 2 della legge 24 luglio 1985, n. 409, siano erogate dai soggetti in possesso dei titoli abilitanti di cui alla medesima legge.»

**Fonte:** https://www.gazzettaufficiale.it/eli/id/2017/08/14/17G00140/sg (testo estratto dal blocco articolato, commi 148–157).

**Sulla natura dello studio associato, fonti primarie:**
- **L. 183/2011, art. 10, c. 9 (testo vigente):** «Restano salve **le associazioni professionali, nonché i diversi modelli societari** già vigenti alla data di entrata in vigore della presente legge» — la legge stessa tiene le associazioni professionali **distinte** dalle società (modifica operata dal D.L. 1/2012 conv. L. 27/2012, art. 9-bis; versioni 1–4 dell'articolo riscontrate su GU). Il c. 11 abroga la L. 1815/1939. Fonte: https://www.gazzettaufficiale.it/eli/id/2011/11/14/011G0234/sg
- **TUIR, art. 5, c. 3, lett. c)** (come citato testualmente dall'Agenzia delle Entrate, Risposta n. 171/2025): «ai fini delle imposte sui redditi "le associazioni senza personalità giuridica costituite fra persone fisiche per l'esercizio in forma associata di arti e professioni sono **equiparate alle società semplici**"» — equiparazione **solo fiscale**, non civilistica. Fonte: https://www.agenziaentrate.gov.it/portale/documents/20143/9110102/Risposta+n.+171_2025.pdf/07041c1b-de61-da3c-5e83-70a9248a75cb
- **Ma attenzione — L. 145/2018, art. 1, c. 536, secondo periodo (testo letterale, GU):** «Tutte le **strutture sanitarie private di cura** sono tenute a dotarsi di un direttore sanitario iscritto all'albo dell'ordine territoriale competente per il luogo nel quale hanno la loro sede operativa entro centoventi giorni dalla data di entrata in vigore della presente legge.» Fonte: https://www.gazzettaufficiale.it/eli/id/2018/12/31/18G00172/sg — l'obbligo qui aggancia la **struttura**, non la forma giuridica.
- Interpretazione istituzionale di un Ordine (OMCeO Firenze, FAQ «Il Direttore Sanitario nelle strutture ambulatoriali private»): negli studi professionali — anche associati e nelle STP — la direzione sanitaria non è richiesta, essendo i professionisti direttamente responsabili; è richiesta nelle strutture sanitarie. Fonte (istituzionale ma interpretativa, letta via fetch sintetico): https://www.ordine-medici-firenze.it/professione/strumenti-operativi/faq-domande-frequenti?view=article&id=164&catid=22

**Esito: AMBIGUO, con lettura prudente netta.** *Mia interpretazione dichiarata:* lo studio associato **non è** una «società» ai fini del c. 153 — i testi primari lo collocano fra le associazioni professionali (categoria che il legislatore del 2011/2012 tiene distinta dalle società), l'equiparazione alle società semplici è espressamente limitata alle imposte sui redditi, e nel c. 153 gli associati ricadono nella prima frase («liberi professionisti»). **Resta però ambiguo** il caso dello studio associato che sia anche *struttura sanitaria privata di cura* autorizzata (ambulatorio): lì l'obbligo di direttore sanitario nasce dal c. 536 L. 145/2018 e dalle leggi regionali di autorizzazione (soglia studio/struttura definita in sede regionale — non mappata in questa verifica), a prescindere dalla forma giuridica.

**Che cosa cambia per D196:** la regola «forma giuridica decide se UÀ chiede» **regge, ma il campo direttore sanitario non può essere reso obbligatorio per lo studio associato** (nessun obbligo netto ex c. 153) né escluso (può discendere dal c. 536/regioni). La domanda «chi ha prescritto» per lo studio associato resta obbligatoria per la ragione già scritta in D196 — più prescrittori possibili — che è indipendente dall'esito di questa verifica e quindi più robusta. Design prudente: per studio associato, campo «direttore sanitario» **facoltativo**, campo «prescrittore del lavoro» **sempre chiesto**.

---

## §4 — Lo studio individuale è una «istituzione sanitaria» ex Art. 2, punto 36 MDR?

**Testo letterale, consolidato 2026 (stesse URL di §1):**
- IT, Art. 2, punto 36: «**"istituzione sanitaria"**: un'organizzazione il cui fine principale è la cura o il trattamento di pazienti o la promozione della salute pubblica;»
- EN, Art. 2(36): «**'health institution'** means an organisation the primary purpose of which is the care or treatment of patients or the promotion of public health;»

**Guidance MDCG pertinente — MDCG 2023-1 (gennaio 2023), sezione 2, testo letterale:**

> «Health institution: an organisation the primary purpose of which is the care or treatment of patients or the promotion of public health […]. According to recitals 29 and 30 of the IVDR and MDR, health institutions include hospitals as well as institutions, such as laboratories and public health institutes that support the health care system and/or address patient needs, but which do not treat or care for patients directly. The concept of health institution does not cover establishments primarily claiming to pursue health interests or healthy lifestyles, such as gyms, spas, wellness and fitness centres. **The recognition as a health institution can also depend on national legislation and could thus differ between Member States.**»

Fonte: https://health.ec.europa.eu/document/download/05b15d55-1bcf-4e17-99c4-15c706325847_en?filename=mdcg_2023-1_en.pdf — due avvertenze: ① il documento riguarda l'esenzione Art. 5(5) e dice espressamente (pag. 4) «Custom-made devices are out of scope of Article 5(5)», quindi la sua glossa vale come unico chiarimento MDCG sulla *definizione*, non come guida all'Allegato XIII; ② nella sezione 3.2.2 usa due volte l'inciso «a health institution **(as opposed to an individual healthcare professional)**» — segnale testuale che l'MDCG distingue il professionista individuale dall'istituzione, ma in un contesto diverso dal nostro. Riscontro sul considerando 30 MDR, testo base 2017 IT: «il concetto di "istituzione sanitaria" non comprende le aziende i cui obiettivi principali dichiarati sono collegati alla salute e a stili di vita sani, per esempio palestre, terme, centri benessere e centri fitness» (https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:32017R0745).

**Esito: AMBIGUO — nessuna fonte primaria o guidance risponde alla domanda per l'Allegato XIII.** *Mia interpretazione dichiarata, lettura prudente:* per il **dottore singolo** il «se del caso» non scatta necessariamente: la prescrizione è della persona, e trattare lo studio individuale come «organizzazione» non ha appiglio testuale certo (e l'inciso di MDCG 2023-1 depone contro). Quindi il campo «istituzione sanitaria» della dichiarazione **deve esistere** (nasce comunque, come già deciso in D196) e per il dottore singolo **può legittimamente restare vuoto**; quando invece esiste un'entità organizzata (società, centro, ambulatorio — e prudenzialmente lo studio associato con denominazione propria) compilarlo è la scelta sicura: indicare un'informazione veritiera in più non è vietato da nessuna delle fonti lette, ometterla dove «del caso» sarebbe invece una non conformità. MDCG 2023-1 rimanda il riconoscimento al diritto nazionale: la parola definitiva per l'Italia non esiste in queste fonti.

---

## §5 — Domande residue per il panel

1. **Definizione nazionale di «istituzione sanitaria»**: MDCG 2023-1 dice che il riconoscimento «can also depend on national legislation». Esiste una presa di posizione del Ministero della Salute italiano applicabile all'Allegato XIII? Non trovata in questa sessione (non verificato).
2. **Soglia studio/struttura**: quando uno studio (individuale o associato) diventa «struttura sanitaria privata di cura» ex c. 536 L. 145/2018 dipende dalle autorizzazioni regionali (art. 8-ter D.Lgs. 502/1992) — mappa regionale non eseguita. Serve al panel solo se si vuole rendere «intelligente» l'obbligatorietà del campo direttore sanitario; per il design attuale basta il facoltativo.
3. **Identificazione del prescrittore**: l'Allegato XIII chiede solo «il nome»; Q6 chiede persona «authorised by national law». Nessuna fonte letta impone il numero di iscrizione all'albo sulla dichiarazione — aggiungerlo è scelta prudenziale libera, non obbligo (interpretazione).
4. **L. 409/1985, art. 2** (contenuto riservato dell'attività odontoiatrica, base dell'autorizzazione nazionale a prescrivere): citata dal c. 153 ma non riletta in testo letterale in questa sessione — non verificato.
5. **Correzioni di memoria repo**: ① «MDCG 2021-3 Rev.1» → non esiste una Rev.1: citare «MDCG 2021-3, marzo 2021»; ② la nota «EUR-Lex si è troncato prima degli allegati» va aggiornata: il consolidato HTML completo si scarica e contiene gli allegati (il limite era dello strumento di fetch); ③ D196 descrive il c. 153 correttamente, ma il mandato circolante lo etichetta «fatturazione elettronica» — refuso da non propagare.

Nessun file del repo è stato modificato.