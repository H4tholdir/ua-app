# Ledger — accenti nei documenti generati (voce 8)

Piano: docs/superpowers/plans/2026-08-03-accenti-documenti.md
Spec:  docs/superpowers/specs/2026-08-03-accenti-documenti-design.md
Branch: accenti-documenti
Base: 870569a9
Riferimento test ad albero pulito: vitest 370|3 file e 4267|19 prove · tsc 0

(ledger dell'ondata precedente archiviato in progress-2026-07-nome-cognome-paziente.md)

Task 1: commit 50b0b72d — revisione: ADERENZA ✅, qualità approvata con 1 Importante «imposto dal piano» + 2 Minori.
  Importante (in correzione): il test legge mockInsert.mock.calls[0][0], che NON è la chiamata della propria
  `await generateDdC` — il describe D102 non fa clearAllMocks, 3 chiamate accumulate. Funziona per coincidenza
  (la costante è globale), ma il commento dichiara un meccanismo falso. Corretto insieme al Minore del commento
  a :190 che afferma «ogni DdC ha NULL», dimostrato falso (1 riga su 4 porta ddc-v1).
  → CORRETTO (commit 333a8e47): clearAllMocks + resolved value nel beforeEach del blocco D102.
  `provato:` chiamate accumulate all'asserzione 3→1 e 2→1; entrambi i test ora passano anche in isolamento
  (prima: TypeError su generate-ddc.ts:184). Il commento falso è stato riscritto col fatto verificato sul DB.
Task 1: COMPLETO (commits 870569a9..333a8e47, revisione pulita dopo un giro di correzioni)
  Riferito per la review finale (R-E2, non corretto): lo stesso difetto strutturale dei describe fratelli
  esiste in altri due blocchi dello stesso file, lì mascherato da `toHaveBeenCalledWith` invece di
  `mock.calls[0][0]`.
Task 2: commits 3e2e4521 (+ 05238264 del coordinatore sul piano) — 39/39 verdi. Revisione: ADERENZA ✅ (sei stringhe verificate una per una sul file vero, nessuna settima occorrenza), qualità APPROVATA.
  🛑 DIFETTO DEL PIANO trovato dall'esecutore, che si è FERMATO invece di adattare l'asserzione al risultato:
  il piano pretendeva «§7 — Dichiarazione di Conformità» in forma mista, ma styles.sectionTitle
  (DdcTemplate.tsx:84-88) ha textTransform:'uppercase' → il foglio stampa MAIUSCOLO. firmaLabel (:145-149)
  invece non ce l'ha: le due asserzioni hanno forme diverse perché i due stili sono diversi. Piano corretto.
  Trovata dall'esecutore anche un'asserzione MORTA nel piano: not.toContain('DICHIARAZIONE DI CONFORMITA ')
  con lo spazio finale non si accende mai. Sostituita con una rete su tutto il foglio (not.toContain
  'CONFORMITA'/'Conformita'), che alla prova per mutazione si è accesa su un punto NON suo bersaglio: 2 rossi.
  Importante corretto dal coordinatore (commit cb999bac): il commento della rete prometteva «nessun punto del
  foglio», ma la fixture lascia §6-bis, §8 e le righe di prescrizione non renderizzati. Limite ora scritto.
  Minore a verbale per la review finale: la rete non copre un ipotetico refuso tutto minuscolo («conformita»);
  fuori mandato, riferito: src/app/(app)/qualita/page.tsx:83 «Non Conformita Recenti».
Task 2: COMPLETO (commits 3e2e4521..cb999bac, revisione pulita)
Task 3: COMPLETO (commit 930d757f, revisione ✅ senza rilievi Critici/Importanti).
  `provato:` word-diff → UNA sola differenza (e' → è), verificato dal revisore in proprio, byte c3 a8 = U+00E8
  precomposta. Entrambe le colonne (testo_conformita e _snapshot) ricevono lo stesso letterale.
  Il revisore ha CORRETTO un'affermazione del referto: l'asserzione «snapshot === corrente» non è tautologica —
  facendo divergere le due colonne si accende. È una guardia di regressione, non una prova morta.
  Scarto del piano (2° riferito): il brief citava generate-ddc.ts:119, la riga vera è 132 (il registro del
  Task 1 ha spostato le righe) → piano e spec allineati dal coordinatore.
  Minore a verbale: il nuovo test vive nel describe «D102» pur testando D104 (etichettatura, imposta dal piano).
Task 4: commit 7348be8f (+ 20673cdc del coordinatore sui documenti) — 40/40 verdi, PDF guardato: UNA pagina,
  §1·§2·§3 in fila, firma intatta. Revisione: ADERENZA ✅ (una pagina verificata dal revisore con TRE metodi indipendenti; firma intatta; i due
  test preesistenti «§2 …» verdi e non rinominati). Qualità: 1 Importante corretto (commit 0cd99d47).
  Importante: `toContain('15/05/2026')` NON discriminava — la data c'è comunque sopra la firma, quindi
  svuotando la sezione §2 i 40 test restavano verdi (provato dal revisore). Sostituito con un CONTEGGIO:
  la data deve comparire esattamente DUE volte. `provato:` mutazione «sezione svuotata» → «expected 1 to be 2»;
  mutazione «data rimessa in intestazione» → «expected 3 to be 2». Si accende in entrambe le direzioni.
  Minore riferito (R-E2): doppia numerazione «§8» preesistente — il template rende «§8 — Rischi residui»
  mentre il commento del file di test chiama «§8 PRRC firma» il blocco della firma.
Task 4: COMPLETO (commits 7348be8f..0cd99d47)
  🛑 TERZO difetto dello stesso tipo nel piano: pretendeva «§2 — Data di emissione» in forma mista, ma ogni
  titolo di sezione è reso MAIUSCOLO. Al Task 2 avevo corretto solo l'occorrenza del §7 invece della classe.
Task 5: COMPLETO (commits 6bc7691b + rafforzamento asserzione). Revisione ✅ senza Critici/Importanti.
  Lo stile impone MAIUSCOLO anche qui (sectionTitle uppercase, NominaPrrcTemplate.tsx:111): l'esecutore l'ha
  verificato PRIMA di scrivere l'asserzione — quarto scarto del piano, stavolta previsto e non subito.
  Il revisore ha riprodotto il rosso in proprio e ha colmato una lacuna del referto (R-P4): mutando in due
  modi distinti, ENTRAMBE le asserzioni si accendono singolarmente, non per corto-circuito.
  Minore applicato dal coordinatore: l'asserzione ora pretende il titolo intero — copre anche l'apostrofo di
  dell&apos;Art., che non aveva nessuna prova dedicata in tutto il progetto.
  Riferito (R-E2): lo stesso refuso vive nei commenti del sorgente, righe 232 e 339.
Task 6: COMPLETO (commit a94fa335, migration 20260803120000 APPLICATA sul progetto reale).
  Revisione ✅✅: il revisore ha riletto il default dal catalogo IN PROPRIO e confrontato programmaticamente
  con la stringa del generatore → EQUAL, 190/190 caratteri. Ha spinto oltre: 0 funzioni/viste dipendono dal
  default; una sola colonna in tutto il DB porta quella stringa; grep repo-wide su «dispositivo e'» → un solo
  hit, la migration storica che NON si tocca. FASE 6b: tipi rigenerati dal revisore, 0 differenze; tsc pulito.
  Minore NON corretto di proposito: il commento della migration cita generate-ddc.ts:147-148 invece di 160-161.
  🛑 Il file è GIÀ APPLICATO al database: non lo si riscrive per un commento — il rischio di disallineare il
  ledger delle migration supera il beneficio. Annotato qui, che è dove sopravvive.
  Minore di sostanza, corretto qui: il referto motivava il non-backfill delle 4 righe vecchie con «sono dati
  di test». È la ragione SBAGLIATA, e applicata a dati veri legittimerebbe un backfill. La ragione giusta:
  un documento già emesso NON si riscrive mai, perché ne cambierebbe l'impronta — è ciò che l'impronta esiste
  per impedire (spec §6).
Task 7: COMPLETO (commit ff85b40e). FASE 7: vitest 370|3 file e 4274|19 prove · tsc 0 · next build ok.
  Il documento GUARDATO con tutte le sezioni popolate: una pagina, §1→§8 in fila, accenti a posto.

── REVISIONE FINALE DEL RAMO (opus) ────────────────────────────────────────────────────────────
Verdetto: pronto al merge DOPO un intervento, poi chiuso. Verificato in proprio dal revisore:
le tre copie della frase (generatore · migration · fixture) sono IDENTICHE, 190 codepoint, SHA uguale,
e coincidono col DEFAULT vivo in banca dati. Dieci punti su dieci coperti. Nessun consumatore rotto.
🔴 Importante trovato SOLO qui: i due METADATI del file (title/subject) non avevano NESSUNA prova —
rimettendo il refuso, 40/40 restavano verdi, perché l'estrattore legge il contenuto della pagina e quei
campi vivono nel dizionario /Info. CHIUSO con un test sui byte.
🔑 E la prima stesura di quel test NON MORDEVA: cercava il refuso in UTF-16BE, ma lo strato PDF passa a
UTF-16BE solo quando la stringa ha un carattere non-ASCII — senza accento quei campi tornano a un byte per
carattere. `provato:` ora si accende su ENTRAMBE le mutazioni (title e subject) e resta verde col codice
corretto. È l'ottavo difetto della lavorazione, e il terzo in una prova che sembrava solida.
Minori → roadmap (raccomandazione del revisore): rete cieca al minuscolo · describe fratelli negli altri
blocchi · qualita/page.tsx:83 · test D104 nel describe D102 · refusi nei commenti di NominaPrrcTemplate ·
§6-bis e §7 attaccati. Il commento della migration che cita 147-148 si ACCETTA così: il file è applicato.
