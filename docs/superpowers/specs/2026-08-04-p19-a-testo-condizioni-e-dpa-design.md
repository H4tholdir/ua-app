# Spec — P19 (a): il TESTO delle Condizioni di Servizio di UÀ, col contratto sui dati dentro

**Data:** 4 agosto 2026 · **Stato:** progetto approvato in sessione, spec da rileggere
**Decide:** Francesco Formicola · **Nasce da:** voce di roadmap **P19**, panel su **D128** §4-bis ① e panel su **D136**
**Decisioni che la vincolano:** **D135** (b) · **D136** · **D137** (a)(b)(c) · **D140** · **D141** · **D142** · **D143**

---

## 0. 🛑 Che cosa questa spec NON è

**Non è un contratto pronto da firmare.** Il prodotto di questa ondata è **una bozza completa PIÙ l'elenco numerato di ciò che deve decidere un avvocato** (§7). Sono dati sanitari: l'ultima parola non è di Claude e non è di Francesco.

🔑 **Perché sta per prima:** un documento che *sembra* chiuso viene usato come se lo fosse. È la classe di difetto di **D126** — un contratto consegnato a clienti che affermava tre misure di sicurezza inesistenti — e stavolta il firmatario sarebbe **UÀ**, non un laboratorio.

**Non copre** il momento dell'accettazione né la traccia (**P19-b**), né il secondo passaggio con firma leggera (**P19-c**). Sono sottoprogetti distinti, ognuno con la propria spec: v. §8.

---

## 1. Il problema, in una riga

**UÀ non ha un contratto sulla protezione dei dati con i laboratori che la usano, e il documento che quei laboratori consegnano ai dentisti dice che ce l'ha.**

`provato:` `src/components/features/pdf/DpaTemplate.tsx:210` afferma al dentista: «*Il Responsabile impone a ciascuno di essi, **per contratto**, obblighi di protezione dei dati equivalenti a quelli del presente accordo (Art. 28(4) GDPR)*».
`provato:` nessuna pagina di condizioni o privacy in `src/app` · nessuna colonna di accettazione su `laboratori` · confermato da Francesco: «*no, oggi non firma niente*».

⚠️ **E l'obbligo è di ENTRAMBE le parti** (Art. 28(3); EDPB §102-103): la mancanza è una violazione **anche di UÀ**, non solo del laboratorio.

✅ **Perché adesso costa solo il lavoro di scriverlo:** `provato:` **3 laboratori in banca dati, tutti di prova**. Non c'è nessuno da rincorrere. Dopo, significherebbe tornare da clienti acquisiti a chiedere una firma.

---

## 2. Le precondizioni — che cosa deve esistere prima che qualcuno accetti

🛑 **Nessuna di queste blocca la SCRITTURA del testo. Tutte bloccano l'ACCETTAZIONE.** Vanno scritte qui perché il testo le promette.

| # | precondizione | stato | dove |
|---|---|---|---|
| **P0** | 🔴 **UÀ deve esistere come soggetto giuridico** | **non esiste** (D140) | domanda per commercialista e avvocato |
| **L1** | 🔴 copie di sicurezza e prova di ripristino | **a metà**: salvataggio automatico locale in funzione (D139), **piano a pagamento da comprare** | **P20** |
| **L2** | 🔴 la cancellazione deve cancellare davvero | **da costruire** | **P21** |
| **L3** | 🔴 tracciare l'accesso di UÀ ai dati del cliente, mai sotto l'identità del cliente | **da costruire** | **P22** |

🔑 **P0 è la precondizione che sta PRIMA di tutte** e non era nell'elenco del panel: senza un soggetto giuridico manca **la controparte**, e un contratto con una parte sola non è un contratto. Il panel l'aveva vista come la condizione **T6** — «mettere i dati identificativi di UÀ, che oggi nel prodotto non ci sono» — cioè come una riga da aggiungere. **Non lo è: è un soggetto da costituire** (D140).

### 🛑 Il vincolo che rende sicura D142

D142 ratifica che **il contratto promette la cancellazione piena e la cancellazione vera si costruisce dopo**. Regge **solo** se il blocco è **meccanico**:

> **L'accettazione non si può accendere finché P21 non è chiusa, e il controllo dev'essere automatico** — non un promemoria in un documento.

🔑 **La ragione, misurata in casa:** `scripts/guardia-navigazione-overlay.mjs` è esistito per settimane «a protezione» di una direttiva permanente **senza essere agganciato a nulla** (verificato il 28/07/2026). Una precondizione affidata alla memoria di qualcuno è una precondizione che salterà. Il come — dove vive quel controllo — è materia di **P19-b**, che è il sottoprogetto che accende l'accettazione; qui si fissa **che deve esserci**.

---

## 3. Struttura del documento

**Un solo atto, tre parti, numerazione continua.** L'unità è ciò che rende vero il meccanismo di D136: il contratto sui dati **viaggia dentro** le condizioni, quindi la firma delle condizioni **è** la firma del contratto sui dati — esattamente come fanno Supabase, Vercel e Resend verso UÀ (`verificato alla fonte il 04/08`).

### Parte I — Condizioni di Servizio

Chi è UÀ (§4: spazio dichiarato) · oggetto del servizio, **e che cosa il servizio NON è** · come nasce e come finisce il rapporto · corrispettivo e durata (rimando al listino: i prezzi vivono in Stripe, non nel testo) · **sospensione** · uso consentito e vietato · **limitazioni di responsabilità** · **modifica delle condizioni** · legge applicabile e **foro**.

🔴 **Regola strutturale:** **tutte e sole** le clausole che proteggono UÀ stanno qui, e sono **marcate una per una**. Sono quelle che andranno nel secondo passaggio (**P19-c**), perché la Cassazione dice che la spunta non basta.

### Parte II — Contratto sulla protezione dei dati (DPA)

🔑 **I ruoli sono ROVESCIATI** rispetto al DPA che il laboratorio consegna ai dentisti: là il laboratorio è **responsabile**; qui il laboratorio è **titolare** e UÀ è **responsabile**. Chi riusa il testo esistente scambiando i nomi produce un documento sbagliato.

Oggetto, durata, natura e finalità · **categorie di dati e di interessati** — con le aggiunte del panel (**T4**): il **personale del laboratorio** e i **dentisti** fra gli interessati, le **immagini di lavorazione** fra i dati · istruzioni documentate del titolare · riservatezza degli autorizzati · **misure di sicurezza** (§5) · **sub-responsabili** (§6) · assistenza sui diritti degli interessati · **violazione dei dati** — formula «**senza ingiustificato ritardo**» dell'Art. 33(2), 🛑 **mai «entro 24 ore»**, come fa oggi il contratto ai dentisti, perché **non esiste niente che rilevi una violazione** · **cancellazione e restituzione** (§5-bis) · verifiche e audit · **obblighi del Titolare** (**T3**: l'Art. 28(3) li nomina, l'EDPB li ribadisce al §102).

🔴 **La Parte II resta PULITA** (**F3**): nessuna limitazione di responsabilità, nessuna facoltà di sospensione infilata qui dentro. Se una clausola vessatoria finisce nella Parte II, l'art. 1341 se la porta via **insieme al contratto sui dati**.

### Parte III — Allegati

**A** le misure di sicurezza in dettaglio · **B** l'elenco dei sub-responsabili · **C** — **in sezione separata** (**T2**) — i destinatari **per obbligo di legge**: Sistema di Interscambio (Agenzia delle Entrate) e Ministero della Salute, che **non sono sub-responsabili** ma titolari autonomi ex Art. 6(1)(c).

---

## 4. I dati della parte: **spazio dichiarato**, mai finto

Il testo porta un unico segnaposto, **visibile e dichiarato**:

```
[DATI DELLA PARTE — DA COMPLETARE: denominazione · forma giuridica · sede legale ·
 partita IVA · PEC · legale rappresentante. 🛑 Finché questo blocco è qui, il
 documento NON è accettabile da nessuno: manca la controparte. — D140]
```

🛑 **Il segnaposto non si riempie con valori verosimili «per far vedere come verrà».** Un contratto con dati finti è indistinguibile da un contratto vero per chiunque lo apra.
✅ **E la guardia di P19-b dovrà rifiutare di accendere l'accettazione finché quel blocco esiste nel file** — un controllo di testo, banale da scrivere e impossibile da dimenticare.

---

## 5. Le misure di sicurezza: **solo quelle provate**

Il panel su D136 ha **misurato** riga per riga. Il testo dichiara queste, e **niente altro** (D141):

| misura | si può scrivere | prova |
|---|---|---|
| cifratura **in transito** | ✅ sì | `strict-transport-security: max-age=63072000` su `uachelab.com` |
| **dati in area UE** | ✅ sì | `region: eu-west-1` (Irlanda) · `x-vercel-id: fra1` (Francoforte) |
| **isolamento fra laboratori** | ✅ sì | **69 tabelle su 70** con protezione di riga attiva |
| **archivio non pubblico** | ✅ sì | contenitori `documenti` e `fatture-pdf` privati; URL pubblico → **400** |
| cifratura **a riposo** | ⚠️ **solo per attribuzione** all'infrastruttura (**T1**) | nessuna prova nostra |
| copie di sicurezza gestite | 🔴 **no** | `pitr_enabled:false`, `backups:[]` → **L1 / P20** |
| accesso a più fattori | 🔴 **no** | colonne esistenti, nessun lettore, **0 utenti su 7** |
| registro di **tutti** gli accessi | 🔴 **no** | si registrano le modifiche; **le letture no** |
| verifica periodica dell'efficacia (Art. 32(1)(d)) | 🔴 **no** | nessun controllo di sicurezza in CI |

🔑 **La regola che genera la tabella:** *si scrive ciò che si può dimostrare il giorno di una contestazione.* Ogni riga 🔴 che finisse nel testo sarebbe **D126 di nuovo**.

### 5-bis. Cancellazione e restituzione

Il testo promette **cancellazione completa entro 30 giorni** dalla fine del rapporto (D142), con **un'unica eccezione**: ciò che **la legge impone** di conservare — le **fatture**, per obbligo fiscale.

🛑 **Oggi il prodotto non lo fa** (`provato:` **15 righe** di registro appartengono a **5 laboratori** che non esistono più; su `lavori`, **82 cancellazioni su 82** portano dentro il nome del paziente; **nove tabelle** con `laboratorio_id` restano fuori dalla funzione di cancellazione; **nessuna riga di codice cancella `auth.users`**). ➡️ **P21**, che è precondizione dell'accettazione (§2).

⚠️ **«Restituzione» si può scrivere solo se l'esportazione comprende le IMMAGINI** (**L6**): oggi non le comprende. O si costruisce, o la parola non entra nel testo — si scrive **cancellazione**, e basta.

---

## 6. I sub-responsabili vengono dalla TABELLA, non scritti a mano

`provato:` `sub_processors` ha **6 righe** (Supabase, Vercel, Resend, Stripe, AdE/Sogei, Ministero Salute) ed è **popolata e mai letta dall'applicazione**. L'elenco che oggi il contratto mostra al dentista è **scritto a mano** dentro `DpaTemplate.tsx:207-209` — ed è la ragione per cui aggiungere un fornitore obbliga a **riemettere tutto**.

➡️ **L'allegato B si genera dalla tabella.** ⚠️ Le sei righe non sono tutte sub-responsabili: **AdE/Sogei e Ministero della Salute sono titolari autonomi** e vanno nell'allegato **C**. La distinzione è di sostanza, non di forma, e la tabella oggi **non la porta**: serve una colonna che dica di che tipo è ciascuno — dettaglio da progettare in **P19-b**, dove si tocca la banca dati.

⚠️ `dpa_firmato_at` è **NULL su tutte e sei**. Il testo **non afferma** che ogni fornitore ha firmato: dice ciò che è `verificato alla fonte il 04/08` — che i DPA di **Supabase** (v1, 01/08/2026), **Vercel** (in vigore 31/03/2026) e **Resend** (agg. 31/12/2025) si perfezionano **automaticamente** con l'accettazione delle condizioni. 🛑 **Riserva aperta:** per **Vercel** l'automatismo è riferito ai piani **Enterprise e Pro** — **quale piano sia in uso non è stato verificato**, ed è un'azione di Francesco.

---

## 7. 🛑 Che cosa deve decidere un AVVOCATO — l'elenco numerato

Questo elenco **fa parte del prodotto**: la bozza senza di esso è un contratto che sembra chiuso.

1. **La forma giuridica di UÀ** (D140) — e, su dati sanitari, se una ditta individuale sia sostenibile viste le conclusioni del panel sull'art. 1341 (§sotto).
2. **Se un tetto al risarcimento sia ammissibile** quando il danno riguarda dati sanitari, e a quale importo.
3. 🔴 **Il censimento delle clausole ex art. 1341 co. 2 c.c.** (**F2**) — l'elenco di legge va trattato come **minimo, non massimo**: quali clausole delle nostre condizioni ci ricadono davvero.
4. **Se un dipendente possa accettare validamente per il laboratorio**, o se debba essere il titolare. ⚠️ La pronuncia **non lo dice**: la cautela «solo il titolare» è **nostra**, non imposta.
5. **Foro e legge applicabile**, sapendo che una deroga alla competenza è essa stessa una clausola dell'elenco 1341.
6. **La clausola di modifica** (**T5**): preavviso, facoltà di opposizione, recesso senza penale — l'Art. 28(2) la vuole **separata** da quella che modifica le condizioni commerciali.
7. **Se la formula «senza ingiustificato ritardo»** basti, o se serva un termine, sapendo che oggi **non esiste rilevamento delle violazioni**.
8. **Se l'eccezione fiscale alla cancellazione** (fatture) sia formulata correttamente rispetto all'Art. 28(3)(g).

### Il contesto giuridico che l'avvocato deve avere sotto mano

🔴 **Cassazione civile, Sez. III, ordinanza n. 20945 del 20 giugno 2026:** in un contratto **fra professionisti** concluso online, la sola **spunta** della casella **non basta** ad approvare una clausola vessatoria; serve una **firma elettronica anche semplice** (la Corte fa l'esempio del **codice usa-e-getta** per SMS o email).
⚠️ **Come è stata verificata, e il limite:** il **PDF della Corte non si apre** (errore di certificato su `italgiure.giustizia.it`). La citazione è **riscontrata verbatim su fonte giuridica indipendente** e confermata da altre nove, fra cui *Il Sole 24 Ore*. **Non è una lettura alla fonte primaria.** Ed è **una** ordinanza di sezione semplice: **non ancora orientamento consolidato**.

🔑 **L'asimmetria che l'avvocato deve valutare per prima.** L'art. 1341 co. 2 **non annulla il contratto**: rende inefficaci **singole clausole**, e colpisce **solo** limitazioni di responsabilità, sospensione, decadenze, rinnovo tacito, deroghe al foro — cioè **tutte e sole le difese di UÀ**. Il contratto sui dati **non è in quell'elenco e sopravvive**. Quindi, in causa, **UÀ resterebbe legata a ogni proprio dovere e priva di ogni propria difesa**, su dati sanitari, **senza tetto**.

🛑 **E «lo fanno Supabase, Vercel e Resend» NON è un argomento qui:** sono società non italiane, rette da legge non italiana, **dove l'art. 1341 non esiste**. Quel precedente vale per l'Art. 28(9) e per nient'altro.

---

## 8. Dove vive il testo, e come si congela

**Il file sta nel repository** (D143), in una cartella di contenuti leggibile mentre l'app gira:

```
src/content/legale/condizioni-ua-v1.md        ← la versione 1, per sempre
src/content/legale/condizioni-ua-v2.md        ← la 2 è un FILE NUOVO, non una modifica
```

⚠️ **Nome senza accento, di proposito:** un file che si chiama `condizioni-uà-…` porta un carattere accentato in un percorso che viaggia fra `git`, il sistema operativo e l'impronta — e macOS e Linux normalizzano gli accenti **in modo diverso**, il che basta a far cambiare l'impronta senza che il testo sia cambiato. **Il marchio è UÀ; il nome del file è `ua`.**

- **Ogni versione è un file nuovo.** Le vecchie non si toccano e non si cancellano: qualcuno le ha accettate e deve poter dimostrare cosa dicevano.
- **L'impronta** (SHA-256 del file) si calcola al rilascio e si registra con l'accettazione (**F5**).
- **Una pagina pubblica** rende il testo leggibile, **stampabile e salvabile PRIMA** di accettare — requisito esplicito di **CGUE C-322/14**, non un vezzo (**F4**).
- **Un controllo automatico** — sullo stesso principio della guardia introdotta con D139 — **ferma il salvataggio del codice** se: ① un'accettazione registrata punta a una versione il cui file non esiste più; ② l'impronta registrata non combacia col file; ③ **il segnaposto dei dati della parte è ancora nel testo mentre l'accettazione è accesa** (§4).

🔑 **Perché non in banca dati** (scartata B): un contratto già accettato diventerebbe **modificabile a caldo, senza traccia** — il primo appiglio che cerca un avvocato avversario.
🔑 **Perché non dentro un componente React** (scartata C, pur essendo ciò che il progetto già fa): mescola le parole col modo di mostrarle, ed è il difetto che il contratto ai dentisti **sta già pagando** (§6).

---

## 9. I tre sottoprogetti, e l'ordine

| | cosa | stato |
|---|---|---|
| **P19-a** | **il TESTO** — questa spec | in corso |
| **P19-b** | **il MOMENTO e la TRACCIA** — accettazione al primo accesso dentro la transazione atomica dell'invito (`supabase/migrations/20260525000002_invite_atomic.sql:20-57`), **tabella nuova in sola aggiunta**, blocco per chi è già dentro, fascicolo della prova | da progettare |
| **P19-c** | **il SECONDO PASSAGGIO** — firma elettronica semplice (codice usa-e-getta) per le sole clausole marcate della Parte I | da progettare |

🛑 **La macchina dell'ondata 1 NON si riusa** — `provato:` sul catalogo vivo: `dpa_emissione_coerente` pretende `dentista_id IS NOT NULL AND tipo_controparte='dentista'`, e `dpa_emissione_viva_unica` è costruito sul dentista → **col dentista NULL la deduplicazione smette di funzionare in silenzio**. **Si copia il modo di fare** — progressivo, conservazione, impronta del testo, versione — **non il codice**. (Effetto collaterale buono: resta libera la riga `tipo_controparte='sub_responsabile'` per ciò a cui la tabella la destina davvero, il registro dei sub-responsabili **del laboratorio**.)

⚠️ **Una differenza che il brief dava per scontata e non regge:** il contratto al dentista è **un testo diverso per ogni dentista** (stampa l'anagrafica dello studio); le condizioni di UÀ sono **lo stesso identico testo per tutti**. Quindi il documento si conserva **una volta per versione**, non una per accettazione, e l'impronta che conta è **quella del testo**.

---

## 10. Come si prova che questa ondata è fatta

1. Il file della versione 1 esiste, e l'impronta si calcola in modo ripetibile.
2. **Ogni riga 🔴 della tabella §5 NON compare nel testo** — controllo per parole chiave, incollato nel referto.
3. Il segnaposto §4 è presente **e dichiarato**, e nessun dato è verosimile-ma-finto.
4. Il testo è leggibile, stampabile e salvabile **prima** di qualunque accettazione.
5. L'elenco §7 è completo e **consegnato insieme alla bozza**.
6. **Nessuna clausola dell'elenco 1341 sta nella Parte II** — censimento incollato.
7. Le guardie del progetto restano verdi; `tsc` · `vitest` · `next build` con output reale (FASE 7).

---

## 11. Che cosa resta NON VERIFICATO

1. 🔴 **Il piano Vercel** — l'automatismo del loro DPA è riferito a Enterprise e Pro. **Azione di Francesco.**
2. 🔴 **Il piano Supabase** — la Management API non espone l'abbonamento. **Azione di Francesco.**
3. 🟠 **Cassazione 20945/2026** — non letta sul PDF della Corte (§7), e non ancora orientamento consolidato.
4. 🟠 **Tassatività dell'elenco dell'art. 1341 co. 2** — trattato come **minimo**.
5. 🟠 **Se un dipendente accetti validamente** per il laboratorio — la cautela «solo il titolare» è nostra.
6. 🟠 **Cifratura a riposo** — nessuna prova nostra: si scrive **per attribuzione**.
7. 🟡 **Regione dei dati di Resend** — è un valore della **nostra** tabella, non un fatto verificato alla fonte.
