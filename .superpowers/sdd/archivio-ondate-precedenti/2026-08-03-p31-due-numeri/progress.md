# P31 — Due numeri per il cliente · registro di avanzamento

Piano: `docs/superpowers/plans/2026-08-03-p31-due-numeri-per-il-cliente.md`
Spec: `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md`
Ramo: `p31-due-numeri-per-il-cliente` · base: **`2a2b5514`**
Decisioni: **D181** (due campi) · **D182** (il prefisso lo mette UÀ) · **D183** (il tasto lo chiede e
lo salva) · **D184** (il wizard li chiede entrambi)

🛑 **Prima di iniziare, archiviati i brief e il registro di P7** (`archivio-ondate-precedenti/2026-08-02-p7-registro-dpa/`):
in `.superpowers/sdd/` c'erano `task-1-brief.md`…`task-4-report.md` di un piano **diverso**, e un
esecutore indirizzato per nome avrebbe letto i requisiti sbagliati. **È il difetto F1 del registro di
P7, che quel registro stesso documentava** — quindi già visto una volta, e ripresentatosi identico.

## Stato

- **Compito 1 (la colonna) — ✅ COMPLETO** (commit `2a2b5514..0eadfd47`, revisione pulita:
  conformità ✅, qualità **Approvato**). La colonna è viva e tipata (sonda: `[ 'id', 'telefono',
  'cellulare_whatsapp' ]`), il registro delle migration è **riparato** (`migration repair` eseguito dal
  controllore dopo che il classificatore di permessi l'aveva bloccato per l'esecutore), e il rilievo
  Importante del revisore è stato **corretto alla fonte** (piano + spec) prima che si propagasse.
- **Compito 2 (il prefisso) — ✅ COMPLETO** (commit `0eadfd47..a3164212`, revisione: conformità ✅ dopo
  correzione, qualità **Approvato**). R-P4 rispettata: abbozzo inerte → **7 su 13** asserzioni accese,
  **combacia col numero previsto dal piano**, e il revisore l'ha verificato **riga per riga** sul codice
  delle prove. La soglia delle 11 cifre è provata **in entrambi i versi** (il revisore ha controllato che
  togliendo l'una o l'altra condizione una prova diversa si rompe). ✅ **Zero prove esistenti toccate**, e
  il revisore ha verificato in modo indipendente che non fosse un buco: le tre prove su `buildWhatsappUrl`
  passano numeri già con `+39`, quindi cadono nel ramo che rispetta il `+`.
  🔧 Corretti in seguito alla revisione: un contratto (`numeroPerWhatsapp('00')` restituiva `''` invece
  di `null` — difetto su un simbolo **esportato** che il compito 4 consumerà) e un accento in un commento.
- **Compito 3 (le due allowlist) — ✅ COMPLETO** (revisione: conformità ✅, qualità **Approvato**, **nessun rilievo**) (commit `5d2a1333..00dab602`).
  ⚠️ **L'esecutore è stato interrotto a metà da un errore di rete DOPO il commit**, quindi non ha potuto
  riferire: **le verifiche le ha rifatte il controllore**, non date per buone —
  `provato:` `tsc --noEmit` → **0** · `vitest run` → **4507 passate | 19 saltate** (386 file) ·
  la prova dell'allowlist → **3 passate**, e contiene i valori che **devono** essere rifiutati.
  🔑 **Il revisore ha verificato che quei valori non fossero scelti a caso:** `portale_token` (il token
  di accesso al portale del dentista) e `laboratorio_id` (la chiave che isola un laboratorio dall'altro)
  sono campi per cui una scrittura dal browser sarebbe **un buco di sicurezza vero** — quindi la prova
  **dimostra** l'allowlist invece di decorarla.
- **Compito 4 (i punti WhatsApp + il trasporto) — ✅ COMPLETO** (commit `ff9a951c..ef67f0da`, 12 file;
  revisione: conformità ✅, qualità **Approvato**, **zero rilievi Critici o Importanti**).
  📌 **SEI punti d'uso** spostati e **TREDICI** di trasporto, di cui **DUE non erano nel brief** e senza
  i quali il codice del brief **non avrebbe compilato**: il tipo `Cliente` in `domain.ts` e il tipo
  locale `ClienteSnap` in `ScadenzarioList.tsx`.
  🔑 **L'esecutore ha scritto una prova NON richiesta e ha provato che funziona**, regredendo
  temporaneamente il codice per vederla diventare rossa (1 su 2 per ciascun ramo), poi ripristinando e
  verificando il diff identico. Il revisore l'ha ricontrollata **ricalcolando a mano** `numeroPerWhatsapp`
  sui due numeri di prova: se il codice leggesse `telefono`, entrambe le asserzioni fallirebbero.
  ✅ **Zero ripieghi:** il revisore ha cercato ogni forma di `cellulare_whatsapp ?? telefono` — **non
  esiste**. ✅ **Zero prove esistenti modificate**, con il motivo scritto per ciascuna.
  🔑 **Rinominare invece di redirigere:** le prop `telefono` sono diventate `cellulare`, così ripassare
  il campo sbagliato diventa **impossibile**, non solo sbagliato.
- **Compito 5 (`CampoTesto`: aiuto + tastiera) — ✅ COMPLETO** (commit `ef67f0da..06f5f626`; revisione:
  conformità ✅, qualità **Approvato**, **zero rilievi Critici o Importanti**).
  📌 Primo rosso **2 fallite / 2 passate**, esattamente l'atteso: le due che passano **prima** del
  cambiamento sono la rete di non-regressione per le altre **13** schermate, ed è il fatto che passino
  prima a renderle una rete e non una decorazione.
  🔑 **Il revisore ha provato la non-regressione in due modi indipendenti:** strutturale (gli attributi
  nuovi collassano a `undefined`, quindi React non li emette affatto) ed empirico — ha cercato se
  qualche consumatore usasse lo *spread* delle prop, che avrebbe reso invisibile il passaggio a un
  semplice `grep`. **Zero.**
- **Compito 6 (§0B: disegni) — ✅ COMPLETO E APPROVATO (D186)** (commit `4e7a377e`, 12 scatti).
  🚪 **IL CANCELLO È APERTO:** si può scrivere React.
  📌 Contrasti **misurati due volte** (dai token e dal DOM reso, combaciano): la riga di spiegazione in
  scuro **6,13:1** · le etichette dei campi **4,75:1** — passano ma **di poco**, ed è lo stesso punto di
  **P34**.
- **Compito 7 (le due schermate) — ✅ COMPLETO** (revisione: conformità ✅, qualità **Approvato**) (commit `4ed6499a..afef7f83`, 6 file
  invece dei 3 del brief: ci sono anche i due anelli di trasporto e il file di prova del pannello, che
  **non esisteva**). Prove: wizard **10/10**, pannello **3/3**, suite **4521**, `tsc` e `next build`
  puliti — e il red→green **dimostrato togliendo e rimettendo** la riga che salva il cellulare, per
  provare che la prova discrimina davvero.
  🔧 **Corretto dopo la revisione: mancava la RETE su un anello.** Il revisore ha verificato anello per
  anello *«fallirebbe se ne mancasse uno?»* e ha trovato che ② e ③ li protegge `tsc` (il campo è
  **obbligatorio** in `ClienteEditData`, toglierlo dà `TS2741`), ④ non è sul percorso di lettura, ma
  **① no**: la stringa del `.select()` ha il legame col tipo **spezzato** da un doppio cast
  `as unknown as`, e la prova unitaria costruisce l'oggetto cliente **a mano**, bypassando la pagina.
  ✅ Chiuso con un **tripwire** sul modello già in casa (`prezzo-tripwire.test.ts`): una prova statica
  che **legge i sorgenti**. Discriminazione verificata su **entrambe** le `select`, non su una sola.
- **Compito 8 (il tasto che chiede, D183 + D185) — ✅ COMPLETO** (commit `5c80db03..3f66b8ed`;
  revisione: conformità ✅, qualità **Approvato**). **4/4** punti montati, **3/3** gate del compito 4
  rimossi, `cliente_id` verificato in tutti e tre i punti dello scadenzario **prima** di scrivere e
  **zero** chiamate di rete aggiuntive.
  🔑 **Il revisore ha verificato che la prova dell'ordine DISCRIMINA:** l'array è riempito dai finti nel
  momento in cui vengono chiamati, quindi se WhatsApp si aprisse prima del salvataggio la prova
  fallirebbe. Idem la seconda: salvataggio fallito → WhatsApp **non** si apre.
  ✅ **Controllo di sicurezza intatto:** `TastoWhatsApp` non è stato toccato, e il caso «manca il numero»
  usa un **tasto**, non un collegamento.
  ✅ **Confine v3/v2.3 verificato sul codice:** il foglio è v3 anche dentro schermate v2.3 perché `Sheet`
  porta `data-ds="v3"` sul **proprio portale**, che vive fuori dal sottoalbero della pagina — eccezione
  **preesistente e documentata**, non inventata per l'occasione.
  📌 FASE 7: `tsc` pulito · `vitest` **4536 passati / 19 saltati / 0 falliti** · `next build` uscita 0.
- Compito 9 (FASE 7 · 9 · 9b · collaudo) — da fare

## Rilievi MINORI raccolti (per la revisione finale di ramo)

- **M7** (compito 4) accento mancante nel messaggio del commit `ef67f0da` («lo porta fino **li**»).
- **M8** (compito 4) il titolo del brief del compito 4 diceva ancora «i cinque punti» pur contenendo il
  passo 7-bis che porta il conteggio a **sei**. ✅ Corretto dal controllore.

- **M4** (compito 2) **R-P4, seconda metà non applicata.** La regola chiede, per ogni forma d'ingresso
  enumerata, «il suo caso **oppure** il suo "non coperta, perché"». L'autorevisione elencava solo ciò
  che era coperto: manca la riga per `'00'` da solo, per 11 cifre che **non** cominciano per `39`, e per
  `'+39'` senza cifre dopo. ✅ Il primo dei tre è stato poi **coperto** dalla correzione del contratto.
- **M5** (compito 2) l'avviso jsdom `Not implemented: navigation to another Document` compare
  nell'output della suite. **Preesistente** (verificato con `git stash` dall'esecutore), non introdotto
  qui — ma è rumore, e rumore preesistente è il posto dove un avviso nuovo si nasconde.
- **M6** (compito 2) il referto del compito dichiarava di aver corretto **due** commenti e ne aveva
  corretto **uno**. 🔑 Non cambia il codice, ma è esattamente il tipo di affermazione per cui il referto
  va **verificato** e non creduto — e il revisore l'ha trovata contando.

- **M1** (compito 1) `supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql:7` — il commento
  `-- provato: l'unico numero in banca dati è un fisso (0976...)` porta il marchio `provato:` ma **non
  la prova a corredo** (né comando né output). Il marchio c'è, la prova no. Non blocca — la semantica
  della colonna non dipende da quell'affermazione — ma è un marchio «vuoto» ormai committato.
- **M3** (compito 1) il messaggio del commit `0eadfd47` è **in inglese**, unico fra gli ultimi 20 su
  questo ramo — la prassi osservata è italiana al 100%. `provato:` dal revisore su `git log --oneline -20`.
  ⚠️ **Non è una violazione di regola scritta:** gli esempi in `CLAUDE.md` (root §Commit format e
  `ua-app/CLAUDE.md` §5) sono **in inglese**, la prassi no — quindi la fonte scritta e la pratica
  divergono, e vale la pena allinearne una alla prossima occasione.
  🛑 **NON corretto con `--amend`:** quel commit non è più l'ultimo (ne segue `56b39ecb`), quindi
  riscriverlo richiederebbe un rebase di tre salvataggi. Rischio sproporzionato al beneficio.
- **M2** (compito 1) `supabase/schema.sql:374` — l'allineamento a colonna di `TEXT` si rompe di una
  posizione, perché `cellulare_whatsapp` (18 caratteri) satura il riempimento usato per i nomi più
  corti. Puramente estetico.

## 🔴 DA DECIDERE CON FRANCESCO — prima del merge in produzione

- **DF-3 (dal compito 8) — una stringa che nessuno ha approvato.** Il foglio contiene una riga di
  contesto col nome del destinatario. `provato:` (revisore) **non è in D186** (che ratifica solo il
  tasto e il testo di aiuto) e **non è nemmeno fedele al mockup**: il disegno dice «*Per lo Studio
  Piegari manca ancora un cellulare: il messaggio **di consegna** parte da qui*», il codice dice «*Manca
  ancora un cellulare per Studio Piegari: il messaggio parte da qui*» — ordine invertito, «di consegna»
  tolto (ragionevole, visto che D185 allarga il foglio ai solleciti). È una **riformulazione onesta in
  cerca di conferma**, dichiarata dall'esecutore, non un difetto nascosto.

- **DF-4 (dal compito 8, ritrovamento del revisore) — IL QUINTO PUNTO.** `provato:`
  `src/components/features/lavori/form/TabAccettazione.tsx:679` ha **lo stesso identico pattern**
  «il tasto sparisce se manca il cellulare» per il messaggio di **conferma ricezione** al dentista
  («abbiamo ricevuto il lavoro»). 🛑 **Non è fra i quattro punti che D185 elenca** (consegna +
  solleciti), quindi l'esecutore ha fatto bene a **non toccarlo** (R-E2). ➡️ **La domanda: la logica di
  D185 vale anche lì?**

- **DF-2 (dal compito 7, ritrovamento dell'esecutore) — IL PIANO HA MANCATO UNA SUPERFICIE.**
  Il compito 6 ha disegnato **due** fogli (wizard + foglio della consegna) e Francesco li ha approvati
  (**D186**). Ma le superfici che cambiano sono **tre**: c'è anche il **pannello di modifica del
  cliente** (`ClienteEditSheet.tsx`, v2.3), che riceve un campo nuovo e un'etichetta cambiata.
  🛑 **Quindi il suo aspetto non è mai passato da un disegno approvato:** è una scelta dell'esecutore.
  ⚠️ **§0B è categorico** («ogni pagina o feature con UI passa dai disegni»), quindi questo è un buco
  del piano, non dell'esecutore — che infatti l'ha **riferito**.
  ➡️ **Proposta:** poiché il cambiamento è piccolo e simmetrico (un campo accanto a uno esistente,
  nella stessa griglia a due colonne), **non** rifare il giro dei disegni: fare gli **scatti della
  pagina vera** in FASE 9 (compito 9) e mostrarli a Francesco allora, con la **FASE 9b** che comunque
  li richiede. **Da confermare.**

- ✅ **DF-1 CHIUSA — è diventata D185** (03/08): il tasto del sollecito **resta e chiede** il cellulare
  che manca, come alla consegna. Il foglio nasce **condiviso** e lo montano **quattro** schermate. Spec
  §6 e piano compito 8 aggiornati, brief rigenerato.

  <details><summary>testo originale della domanda</summary>

  **DF-1 (dal compito 4, rilievo del revisore).** Nello **scadenzario**, il tasto «manda un sollecito
  WhatsApp» ora compare **solo** se il cliente ha il cellulare. Prima compariva se aveva un telefono
  qualsiasi — ma con un fisso il collegamento era **rotto**, quindi il tasto prometteva una cosa che non
  poteva fare. ✅ Il revisore giudica la scelta **dentro mandato e giusta** (è la stessa che il piano
  prescrive esplicitamente per l'analogo dell'estratto conto). 🛑 **Ma è una conseguenza di prodotto
  visibile** — un cliente col solo fisso perde un tasto che vedeva — e per la regola «il numero si dà
  subito» (§0A-bis) **serve una decisione di Francesco con il suo numero**, non una scelta di esecutore.
  ➡️ **La domanda:** allo scadenzario si applica la stessa idea di **D183** (il tasto c'è sempre e
  chiede il numero che manca), oppure il tasto sparisce e basta?

  </details>

## Fuori mandato (R-E2) — da portare in roadmap, NON correggere qui

- **F-P31-4** (compito 7) `FieldGroup` del pannello di modifica **non lega l'etichetta all'input** per
  ~13 campi: chi usa un lettore di schermo non sente il nome del campo su cui sta scrivendo.
  **Preesistente.** L'esecutore l'ha corretto **solo sui tre campi che toccava**, riferendo il resto.
- **F-P31-5** (compito 7) lo stato del pannello di modifica **non si risincronizza** se il cliente
  cambia mentre il pannello resta montato e viene richiuso/riaperto. **Preesistente e più ampio:**
  riguarda **tutti** i campi, non solo il cellulare.

- **F-P31-3** `supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql:62` ha lo
  **stesso** difetto degli accenti raddoppiati (`e''` invece di `è`) dentro una stringa SQL —
  **preesistente**, trovato dal revisore del compito 1. Non corretto qui: è di P7, già in produzione.

- **F-P31-2** ✅ **già portata in roadmap come voce `P33`.** La vecchia deriva di date (D155) blocca le
  MIGRATION: `db push` rifiuta ogni migration datata sotto `20260804120000` (che è del 2 agosto).
  Trovata dall'esecutore del compito 1, che si è **fermato invece di inventare**. Strada: **D151**
  (Management API + `migration repair`). La finestra si chiude da sola il 04/08 alle 12:00.

- **F-P31-1** `src/components/features/ordini/NuovoOrdineSheet.tsx:193` costruisce un link WhatsApp col
  telefono del **fornitore** senza prefisso internazionale — **stesso difetto** di §1③ della spec.
  `provato:` **0 fornitori** in banca dati. Merita una voce di roadmap propria.

## Difetti del PIANO trovati eseguendo

- **Compito 3 — 🔴 QUATTRO ANELLI DI TRASPORTO MANCANTI, e il difetto sarebbe stato DISTRUTTIVO.**
  Ritrovamento fuori mandato dell'esecutore del compito 3 (ne aveva visto **uno**; guardandolo sono
  risultati **quattro**). La catena che porta il cliente al pannello di modifica —
  `(app)/clienti/[id]/page.tsx` (la `select` :127-133, il tipo `ClienteDettaglio` :15-39, l'oggetto
  passato :258-270) e `api/clienti/[id]/route.ts` (la `select` della GET :45-77) — **non nominava** il
  campo nuovo.
  🛑 **Conseguenza:** il campo nel pannello sarebbe stato vuoto, e `ClienteEditSheet.tsx:132` salva
  `form.<campo>.trim() || null` → **aprire il pannello per correggere l'email e premere Salva avrebbe
  CANCELLATO il cellulare**, senza avvisare.
  🔑 **È la stessa forma del difetto che P31 chiude, ma peggiore: lì un messaggio non arrivava, qui un
  dato sparisce** — e si vedrebbe solo alla consegna successiva.
  ✅ **Corretto nel piano (compito 7, passi 3-bis e 3-ter) e nella spec (§4.2-ter) PRIMA che quel
  compito parta**, con in più la prova del caso distruttivo: *salvare senza toccare il cellulare non lo
  cancella*.
  ⚠️ **Quarta volta che un elenco «completo» non lo è** — e la prima sui punti di **trasporto**, che
  sono più insidiosi: non compaiono in nessuna ricerca per comportamento, perché contengono solo un
  nome di colonna dentro una lista.

- **Compito 1 — gli accenti raddoppiati dentro `COMMENT ON`.** Il piano scriveva `Puo''` e `e''`
  credendo che l'accento andasse raddoppiato come l'apostrofo. **È falso:** in SQL due apici
  consecutivi valgono **un apostrofo letterale**, quindi `Puo''` finisce nel database come `Puo'`,
  non come `Può`. L'accento non richiede alcun escaping.
  `provato:` dal revisore — `supabase/migrations/20260803090000_*.sql`, stessa cartella e stesso
  giorno, usa l'accento **vero** non raddoppiato accanto a un apostrofo **correttamente** raddoppiato
  (`dell''emissione`).
  🔑 **Solo l'apostrofo si raddoppia, mai la lettera accentata.**
  ✅ **Corretto alla fonte** (piano §Compito 1 e spec §3) prima di propagarsi ai compiti successivi.
