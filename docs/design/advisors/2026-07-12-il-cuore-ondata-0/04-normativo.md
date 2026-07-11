# Parere normativo indipendente — Ondata 0 «Il cuore»

**Consulente:** advisor normativo (MDR 2017/745 dispositivi su misura + FatturaPA)
**Data:** 2026-07-11
**Materiale esaminato:** `consegna.html`, `scheda-lavoro.html`, `home.html`, `tutto-il-resto.html`, `wizard.html` (mockup DS v3, worktree `mockup-il-cuore-ondata-0`)
**Fonte interna di riferimento:** `ANALISI/17_adempimenti_lab_2026.md` (v1.0, mag 2026)
**Ruolo:** advisor, non gate. Verifico che ciò che l'interfaccia *promette o mostra* sia legalmente difendibile.

---

### Giudizio complessivo

**Rischio normativo dell'ondata: MEDIO.**

Non c'è nulla di *frontalmente illecito* sulla superficie dell'UI. Anzi, l'ondata è normativamente più matura della media: il lessico SDI è corretto («scartata», non «rifiutata»), la pseudonimizzazione GDPR è rispettata ovunque (solo `PZ-####` e `n.###`, mai il nome del paziente), la base della DdC è giusta (Art. 52(8) + Allegato XIII, non Allegato IV), i due bloccanti pre-consegna sono i due giusti (lotto materiale + firma controllo finale).

Il rischio è di **formulazione e di scope delle promesse**, non di struttura. Tre punti spostano il rischio verso il medio:
1. **«Documenti e qualità · tutto in regola ✓»** — un software non può emettere un verdetto di conformità MDR complessiva → rischio di affidamento colposo.
2. **La prescrizione del dentista non è un bloccante pre-consegna** — è il fondamento giuridico del dispositivo su misura, eppure il wizard la tratta come una foto saltabile. È la non conformità MDR più seria dell'ondata.
3. **Il ramo «potrebbe concludersi in NON fatturare»** dopo una consegna completata e trattenuta — è un problema fiscale (omessa fatturazione), non un problema di copy.

Nessuno di questi blocca l'ondata: sono correzioni di formulazione e di logica di prodotto, tutte affrontabili prima del React.

---

### Ciò che è corretto

**1. Base della DdC e timing di generazione (consegna.html).**
«Dichiarazione di Conformità · pronta» generata alla consegna è coerente con l'Art. 52(8) MDR («…redigono la dichiarazione… prima dell'immissione sul mercato») e con `ANALISI/17 §1.2` («A ogni singola consegna… Una dichiarazione distinta per ogni lavoro»). Il timing è giusto. (Vedi però la riserva sulla parola «pronta» = firmata, sotto.)

**2. Lessico SDI: «Fattura n.139 scartata → Sistemala» (home.html).**
Impeccabile. In ambito B2B (fattura al dentista) l'unico esito negativo dal Sistema di Interscambio è la **notifica di scarto** (errori formali/tecnici); il «rifiuto» esiste solo verso la PA (B2G). Usare «scartata» e non «rifiutata» è la scelta terminologica corretta. L'azione «Sistemala» (correggi e ritrasmetti) è quella giusta: la fattura scartata si considera non emessa e va ritrasmessa corretta, di norma **entro 5 giorni**, mantenendo data e numero originari. → *Miglioria non bloccante:* esporre quella scadenza dei 5 giorni.

**3. I due bloccanti pre-consegna (consegna.html Frame 2).**
- «Manca il lotto della zirconia → Registralo» — corretto e importante: la tracciabilità del lotto materiale è requisito del Fascicolo Tecnico (`ANALISI/17 §1.3`, sez. 3 «Materiali e fornitori»). Ottimo bloccante.
- «Manca la firma sul controllo finale → Completa» — corretto: il controllo qualità finale è requisito TF (`§1.3` sez. 6 «Risultati di test e verifiche»). Bloccarne la mancanza prima della consegna è esattamente giusto.

**4. GDPR — pseudonimizzazione (tutte le schermate).**
Nessuna schermata mostra mai il nome del paziente: sempre `PZ-0412`, `PZ-0408`, `PZ-0436`, `n.147`. Il wizard lo esplicita bene: «Nessun nome, solo il codice (GDPR)». Coerente con `ANALISI/17 §4.3` e con la regola di progetto (CLAUDE.md: «WhatsApp template MAI con nome paziente»). Il pulsante WhatsApp «Avvisa lo studio su WhatsApp» non espone dati paziente in ciò che mostra.

**5. La fattura differita è impostata correttamente (consegna.html Frame 3).**
La sequenza «Buono di consegna · pronto» (check verde) + «Fattura · in preparazione» (orologio ambra, emissione differita) è **fiscalmente coerente**, non un difetto. È anzi la resa corretta dell'emissione differita (vedi sotto «Ciò che è corretto ma va irrobustito»).

**6. «Fatture · Tutto a posto questo mese ✓» (tutto-il-resto.html).**
Difendibile, a differenza del gemello «qualità» (vedi non conformità): sullo stato SDI UÀ *riceve le ricevute* dal Sistema di Interscambio e può quindi verificare oggettivamente lo stato di trasmissione. È un'affermazione su un fatto verificabile dal software.

---

### Ciò che è corretto ma va irrobustito

**A. «Buono di consegna» — ha una base, ma è FISCALE, non MDR.**
La memoria di progetto (oss. 14494, 5 lug) segnala che il «buono» non ha base regolatoria in ANALISI. Corretto rispetto all'MDR: il buono di consegna **non è un documento MDR**. Ma ha una base **fiscale** precisa: è il *documento di trasporto / documento equivalente* che legittima la **fattura differita** (Art. 21, co. 4, lett. a, DPR 633/72). Senza di esso, la fattura andrebbe emessa entro 12 giorni dall'operazione; con esso, si può differire al giorno 15 del mese successivo. Quindi «Buono pronto» + «Fattura in preparazione» è la coppia giusta.
→ *Requisito di prodotto:* perché la differita regga, il buono deve contenere gli elementi del documento equivalente (parti, data, natura e quantità del bene). Frame 4 riporta «consegnata a mano»: la consegna senza trasporto è ammessa alla differita purché il buono documenti l'operazione — ma il contenuto DDT-equivalente del buono va garantito nel template.

**B. «DdC pronta» — il timing è giusto, ma «pronta» deve significare anche *firmata*.**
L'Allegato XIII punto 1, elemento 8, richiede **luogo, data e firma del fabbricante (o PRRC)**; `ANALISI/17 §1.6`: «Ogni DoC deve essere firmata dal PRRC». Se «pronta» significa solo «PDF generato» senza lo step di firma, la card sovrastima lo stato reale. → *Raccomandazione:* «pronta» deve implicare firma apposta (o predisposizione firma con timestamp), non solo generazione.

---

### Non conformità o promesse rischiose

#### NC-1 — «tutto in regola ✓» sugli adempimenti MDR → affidamento colposo *(rischio: MEDIO-ALTO)*

**Testo esatto (tutto-il-resto.html, riga 194):**
> «Documenti e qualità» → «DdC e qualità · **tutto in regola ✓**»

**Problema.** Un software non può affermare che la conformità MDR complessiva del laboratorio è «tutto in regola». La conformità dipende da elementi che UÀ **non può verificare**: nomina e idoneità del PRRC (Art. 15 MDR), registrazione **ITCA** (obbligatoria, sanzione fino a **€48.500** — `ANALISI/17 §1.1`), completezza del Fascicolo Tecnico (Art. 10(4) + Allegato II/III), PSUR/PMS (Artt. 85–86), DPA firmati con gli studi (Art. 28 GDPR). Un «tutto in regola ✓» può indurre l'odontotecnico a credersi pienamente conforme quando non lo è, e in caso di contestazione il laboratorio potrebbe invocare l'affidamento sul software. Contrasto utile: il gemello «Fatture · tutto a posto ✓» è difendibile perché verificabile via ricevute SDI; «qualità tutto in regola» **non** lo è.

**Fonte:** MDR 2017/745 Artt. 10, 15, 52(8); D.Lgs. 137/2022 (sanzioni); `ANALISI/17 §1.1, §1.3, §1.6`.

---

#### NC-2 — La prescrizione del dentista non è un bloccante pre-consegna *(rischio: MEDIO-ALTO — la più seria sul piano MDR)*

**Testo esatto (wizard.html):**
- Frame 3 (riga 389): «Aggiungi la foto dell'**impronta**» — la prescrizione **non è nominata** in questo blocco opzionale.
- Frame 4 (riga 444): «Fotografa **impronta e prescrizione**» come CTA, ma con via di fuga «Torna alla home» (riga 445).
- Frame 2 consegna.html: i bloccanti pre-consegna sono lotto + firma controllo. **La prescrizione non compare tra i bloccanti.**

**Problema.** Un dispositivo su misura è **per definizione** fabbricato sulla base di una **prescrizione scritta** di persona autorizzata (Art. 2(1)(3) + Allegato XIII MDR); la dichiarazione Allegato XIII nomina il prescrittore (`ANALISI/17 §1.2`, elemento 5, e §1.3 sez. 2 «prescrizione medica»). Consegnare senza prescrizione a fascicolo significa che il manufatto **non è validamente un dispositivo su misura**: è una vera non conformità MDR, non un semplice buco UX. Eppure il flusso permette di creare un lavoro e portarlo fino alla consegna senza mai acquisire la prescrizione, e i due bloccanti pre-consegna — per quanto giusti — **non la includono**.

**Raccomandazione.** La prescrizione va trattata con più peso dell'impronta: renderla un **terzo bloccante pre-consegna** («Manca la prescrizione del dentista → Aggiungila»). Non serve un gate rigido alla *creazione* del lavoro (dove «impronta e prescrizione» come CTA finale è accettabile), ma non deve poter esistere una **consegna** senza prescrizione a fascicolo. Distinguere nel copy l'impronta (input di progettazione) dalla prescrizione (mandato legale), invece di accorparle in «impronta e prescrizione».

**Fonte:** MDR Art. 2(1)(3), Allegato XIII punto 1; `ANALISI/17 §1.2 (elemento 5), §1.3 (sez. 2)`.

---

#### NC-3 — Ramo «potrebbe concludersi in NON fatturare» dopo consegna completata *(rischio: MEDIO — architetturale, non di copy)*

**Contesto (spec §9, riportato nel brief):** l'emissione è differita e «concordata col dentista via portale (che potrebbe anche concludersi in NON fatturare)».

**Problema.** La corona è un **bene** (cessione di dispositivo medico su misura). L'operazione si considera **effettuata alla consegna** (Art. 6 DPR 633/72). Una volta che il bene è consegnato e trattenuto dal dentista, **la fatturazione è obbligatoria** — differibile (fattura differita, grazie al buono), ma non omissibile. Un ramo che, dopo una consegna *completata e trattenuta*, si conclude in «non fatturare» configurerebbe **omessa fatturazione**. Gli unici esiti «niente fattura» legittimi sono i flussi in cui il bene **non resta** al dentista: annullo entro 10 minuti, reso, «è tornata» (scheda-lavoro.html Frame 5, `in_prova_esterna`). Il «non fatturare» **non** deve essere una libera scelta post-consegna.

**Nota di copy (opposta all'ipotesi iniziale):** «Fattura in preparazione» è la resa **corretta** per una consegna completata — **non va ammorbidita** in «da concordare». Ciò che va vincolato è la *logica*: l'esito «non fatturare» va confinato ai rami annullo/reso, mai offerto come opzione dopo una consegna che resta valida.

**Fonte:** DPR 633/72 Artt. 6, 21 co. 4; esenzione N4 = Art. 10 n. 18 (`ANALISI/17 §2.1`).

---

#### NC-4 — Annullo 10 min: cosa succede alla DdC «pronta»? Non è comunicato *(rischio: BASSO-MEDIO)*

**Testo esatto (consegna.html Frame 3/4):**
> «Aspetta, annulla la consegna (9:47)» · «Puoi ancora annullare per **9:47**»

Il commento tecnico (righe 254–258) dice che l'annullo «ripulisce solo stato/DdC/tracciabilità» e «non incontra MAI documenti fiscali».

**Problema.** L'utente **non è informato** che annullando si revoca la DdC dichiarata «pronta» pochi secondi prima. Sul piano MDR la DdC è numerata progressivamente (`ANALISI/17 §1.2`: es. DOC-2026-001234): se il numero viene «bruciato» a t=0 e poi l'annullo lo «ripulisce», si crea un buco nella numerazione o una DdC cancellata silenziosamente.

**Raccomandazione.**
1. *Copy:* il banner annullo espliciti che documenti e tracciabilità vengono annullati (onestà: la DdC «pronta» non è definitiva finché la finestra è aperta).
2. *Architettura:* assegnare il **numero** DdC solo al **commit dei 10 minuti**, mostrando «DdC pronta» come anteprima finché la finestra è aperta — così l'annullo non lascia buchi e la parola «pronta» non mente. (Copre anche la riserva B sulla firma.)

**Fonte:** MDR Allegato XIII punto 1; `ANALISI/17 §1.2` (numerazione progressiva, conservazione 10 anni).

---

#### NC-5 — Fasi «firmate» coi tecnici: attribuzione del tap non garantita *(rischio: BASSO — valore probatorio TF)*

**Testo esatto (scheda-lavoro.html / consegna.html Frame 4):**
> «Modellazione ✓ Ciro · ieri 14:20» · «Controllo finale ✓ Ciro · oggi 14:55» · «Rifinitura ✓ Salvatore · oggi 11:40»
> Pulsante «FATTA ✓» sulla prossima fase (`.pill-fase`).

**Valore.** Positivo: fase + tecnico + timestamp danno buona tracciabilità interna (chi-cosa-quando), utile al Fascicolo Tecnico (`§1.3` sez. 6).

**Rischio.** Il mockup non mostra **chi viene attribuito** quando si tappa «FATTA ✓». Se venisse registrato il nome pre-impostato sulla scheda (es. «Ciro») anziché l'**utente autenticato** che tappa, si potrebbe segnare FATTA una fase a nome di un altro tecnico → tracciabilità indebolita. Il «Controllo finale» è il più sensibile: è il QC finale MDR, l'attestazione da cui dipende la consegna.

**Raccomandazione (implementazione, non mockup).**
1. Il tap «FATTA ✓» registra sempre l'**utente autenticato**, mai un nome pre-impostato.
2. Valutare che il **Controllo finale** sia firmabile solo da ruoli abilitati al QC.
3. Tenere distinto questo log di fase (tap operativo) dalla **firma della DdC** (fabbricante/PRRC, Art. 15 + Allegato XIII): il mockup non li confonde — mantenere così.

**Fonte:** MDR Art. 10(4), Art. 15; `ANALISI/17 §1.3, §1.6, §4.3` (RBAC: il tecnico vede solo lo pseudonimo).

---

### Raccomandazioni di formulazione (copy alternativo)

| # | Dove | Testo attuale | Testo alternativo proposto |
|---|------|---------------|-----------------------------|
| NC-1 | tutto-il-resto.html | «DdC e qualità · **tutto in regola ✓**» | «DdC generate per ogni consegna» / «Documenti pronti» — descrivere ciò che UÀ *ha fatto*, non un verdetto di conformità MDR |
| NC-2 | consegna.html Frame 2 | *(bloccante assente)* | Aggiungere terzo bloccante: «Manca la prescrizione del dentista → **Aggiungila**» |
| NC-2 | wizard.html Frame 3 | «Aggiungi la foto dell'**impronta**» | Separare: «Foto impronta» + «Foto prescrizione del dentista» (quest'ultima con peso maggiore, non solo saltabile) |
| NC-3 | logica, non copy | «Fattura in preparazione» | **Mantenere** «in preparazione». Vincolare invece la *logica*: «non fatturare» solo nei rami annullo/reso |
| NC-4 | consegna.html Frame 3/4 | «Puoi ancora annullare per 9:47» | «Puoi annullare per 9:47 — DdC e buono verranno annullati» + assegnare numero DdC al commit |
| — | home.html | «Fattura n.139 scartata → Sistemala» | Corretto. Facoltativo: aggiungere la scadenza «ritrasmetti entro 5 giorni» |

---

*Parere reso come advisor indipendente. Le citazioni normative certe sono riportate per lettera/comma; dove `ANALISI/17` è già la fonte del progetto, vi si rinvia. Verificare sempre gli aggiornamenti con il consulente legale/tributario del laboratorio.*
