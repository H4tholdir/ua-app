# Ledger — tappa 1 nome e cognome paziente

Piano: docs/superpowers/plans/2026-07-27-nome-cognome-paziente-tappa-1.md
Branch: ondata-nome-cognome-paziente
Base: 887c969e
Baseline test: 3364 passed | 19 skipped (335 file)

Task 1: FERMO (mockup prodotto ma NON approvato — il wizard va ripensato per intero, decisione Francesco 27/07)
Task 2: complete (commits 73b2422d..eb0e338b, review clean dopo 1 giro di correzioni: 2 Critical su test deboli + 1 precondizione)
Task 3: FERMO (dipende dalla forma del wizard)
Task 6: FERMO (è la schermata del wizard)
Task 7: FERMO (dipende da T3/T6 — il bump bozza v:2 viaggia con loro)
--- perimetro ridotto: si eseguono T4, T5, T8 (dopo T5), T9, T10, T11-ridotto ---
Task 4: complete (commits 04cfdd88..c46cf3e6, review APPROVATO 0 Critical; +4 correzioni: 3 asserzioni mancanti provate per mutazione + falla errore grezzo in GET)
  Minor rimasti a verbale per la review finale: (a) route.ts:107 vs :129 — codice_paziente non-stringa è null per la regola ma finisce comunque in insertData; (b) normalizzazione: un alias con spazi ai bordi ora si scrive trimmato (invisibile a valle, il trigger fa upper()); (c) il file di test si chiama ...-post.test.ts ma ora copre anche GET.
Task 5: commits 4e4d32c6..15c79dfc — review DA CORREGGERE (1 Critical: cognome salvato spogliato col codice NUOVO invece del vecchio, riprodotto sulla route vera, arrivava fino alla DdC; 2 Important: isolamento tenant provato solo in lettura, non in scrittura né su DELETE). Tutte corrette + provate per mutazione. RE-REVIEW IN CORSO.
  Minor a verbale per la review finale: PATCH senza nome/cognome su paziente di altro lab risponde 200 {ok:true} invece di 404 (asimmetria preesistente, route.ts:102-106).
Task 5: complete (commits 4e4d32c6..269374b5, 3 giri di revisione).
  Giro 2 (ri-revisione): Critical CHIUSA; ma la correzione del giro 1 aveva INTRODOTTO una regressione (doppia spogliatura cancellava un cognome vero uguale al vecchio codice — caso «Rossi», riprodotto sulla route) + 2 reti bucate (mutazione realistica `body.laboratorio_id ?? context` passava 18/18).
  Giro 3: spogliatura per ramo (body→codice nuovo, DB→codice vecchio) + 4 mutazioni realistiche tutte rosse PER ASSERZIONE. 22 test nel file, suite 3411/19.
Task 8: complete (commit 310f8c4b, review APPROVATO 0 Critical/Important)
  Minor a verbale: PazienteEditSheet.test.tsx:45 usa toMatchObject — non prova che gli altri 6 campi sopravvivano all'invio (il codice è corretto, la rete no). Fix: toEqual sull'oggetto a 8 chiavi.
  Osservazione fuori perimetro: il ramo 422 è ora raggiungibile da questo pannello e viene assorbito dal catch vuoto di handleSave (:56-57, preesistente) — l'utente vede solo che il pannello non si chiude.
Task 9: complete (commit e6eed248, DONE_WITH_CONCERNS: deviazione dichiarata — aggiunti cast `as Paziente` sui 3 literal di test perché il codice del brief non passava tsc). REVIEW IN CORSO.
Task 10: complete (ANALISI/17 annotato con D8 in 2 punti — ⚠️ FUORI dal repo git, non versionato)
--- FASE 7: tsc 0 errori · eslint pulito · vitest 3418 passati / 19 saltati (baseline 3364, +54) · next build IN CORSO ---
REVIEW FINALE DEL RAMO: DA CORREGGERE → 1 Critical (rettifica rotta sui pazienti del wizard: '' su data_nascita/sesso faceva fallire l'UPDATE, 500 assorbito da catch vuoto) + 2 Alti (codice non-stringa divergente fra regola e scrittura; catch vuoto). Tutti chiusi in e98279dd, 3 mutazioni rosse per asserzione.
FASE 7 FINALE: tsc 0 · eslint pulito · vitest 3424/19 · next build ok (exit 0).
BP-1 fatto: MEMORY voce 51 · ROADMAP voce 19 (con le 5 voci successive) · SESSION_ACTIVE.
APERTO PRIMA DEL MERGE: gate estetico L2 sulle 2 caselle nuove della scheda paziente (dietro login, serve Francesco).
BACKLOG a verbale: codice_paziente non-stringa ora viene annullato invece che rifiutato (unico punto in cui una richiesta malformata perde un dato) · PATCH del solo codice_paziente lascia il vecchio codice in cognome (non raggiungibile da UI) · req.json() senza try/catch in [id]/route.ts:30 · PazienteEditSheet.test.tsx toMatchObject · 200 invece di 404 su paziente di altro lab.
COLLAUDO DAL VIVO (Francesco loggato, dev server, 27/07):
  🔴 Trovato al collaudo: il tasto «Salva» del pannello finiva SOTTO il bordo su desktop (misurato: era y=730, con le 2 caselle nuove y=831 su viewport 800) e restava coperto dalla barra di navigazione su telefono (preesistente, peggiorato). Causa: stesso zIndex 50 di barra e foglio + tasto dentro l'area che scorre.
  ✅ Chiuso in 0e7e9caa allineando alla struttura del pannello gemello ClienteEditSheet (zIndex 80/81, maxHeight 92dvh, piede fisso fuori dallo scorrimento). Rimisurato nel browser vero: Salva dentro schermo e non coperto a 390/768/1280 (elementFromPoint restituisce il tasto stesso).
  ✅ PROVA FUNZIONALE END-TO-END su PZ-0003 (paziente creato dal wizard, codice dentro la colonna cognome): casella Cognome mostrata VUOTA (guardia del «codice travestito» funziona nell'app vera) → digitato Bagheria/Giuseppe → PATCH 200 → il titolo della scheda diventa «BAGHERIA GIUSEPPE» (trigger ricompone COGNOME NOME) → riaperto il pannello, valori corretti e codice ancora fuori dalla casella cognome.
  ⚠️ Il dato di prova PZ-0003 resta rinominato (DB di test, CLAUDE.md §8). Reversibile dallo stesso pannello.
  ⚠️ FASE 9b: screenshot non archiviati su disco — la pagina è dietro login e le credenziali non le digita l'assistente. Verifica fatta dal vivo con Francesco loggato.
FASE 10 COMPLETA: merge 9aea0f22 su main -> push -> CI 30271359461 verde -> CD 30271948601 success -> uachelab.com risponde, zero errori in console.
ONDATA CHIUSA. Ramo locale ondata-nome-cognome-paziente conservato (cancellabile).

═══════════════════════════════════════════════════════════════════
ONDATA (b) — wizard «Nuovo lavoro» · ramo ondata-b-schermate · dal 29/07/2026
Piano: docs/roadmap/2026-07-29-ondata-b-piano-v2.md (i task sono T1..T23, §6)
═══════════════════════════════════════════════════════════════════
T1: complete — ramo `ondata-b-schermate` aperto dal commit b4b09d52 su main (NIENTE worktree),
    .next rimosso, baseline DB riverificata dal vivo: 294 lavori · 0 denti · 916 pazienti · 48 colori.
    Verifica di PRESENZA (non di verita') dei registri del piano: §3 registro letture ✅ · §4 censimento
    identificatori ✅ · §5 registro prove con i marchi `provato:` ✅. Nessun registro mancante -> non mi fermo.
    ⚠️ Il commit b4b09d52 NON e' pubblicato su origin/main (push non chiesto: su main il push innesca il
    deploy in produzione). Da decidere con Francesco.
PRIMA DI T2 — decisioni raccolte e numerate nello stesso turno (§0A-bis):
    D38 cassetta del wizard = nasce col lavoro · D39 briciola = nome corto dedicato ·
    D41 dima chirurgica = niente passo colore · D40 = PROPOSTA in panel (colore non dentale col
    selettore delle cassette, saltabile) — **blocca la forma di `prevedeColore` in T2**.
T4: IN CORSO (contratto della macchina dei passi, src/lib/wizard/passi.ts). Eseguito PRIMA di T2/T3
    perche' non dipende dai flag; il piano stesso lo dichiara «spostato in testa».
PANEL D40: 3 advisor in corso (architettura del dato · banco/DS v3 · documenti e norma).
D42 ratificata da Francesco dopo il panel: la tinta non dentale si fa DOPO, con i nomi, catalogo separato.
    -> in T2 `prevedeColore: 'catalogo' | 'libero' | 'nessuno'`. Roadmap voce 6 creata. Commit b31ca1c5.
T4: consegnato DONE_WITH_CONCERNS. src/lib/wizard/passi.ts + tests/unit/wizard-passi.test.ts.
    Contratto: NomePasso (7 nomi, «Fatto» ESCLUSO e provato), SEQUENZA_CANONICA, e 6 funzioni pure che
    lavorano sulla sequenza PASSATA (mai una globale). Casi limite dichiarati; `mostraUscita` per un nome
    fuori sequenza torna true — scelta dichiarata «fallisce aperta verso l'uscita».
    FASE 7: tsc 0 · vitest 3698 passati / 19 saltati / 0 falliti · next build ok, 81 pagine.
    R-P4: abbozzo inerte -> 13 blocchi rossi su 25 (12 verdi per coincidenza); conteggio per-asserzione
    dichiarato COME FATTO A MANO (vitest non lo fornisce) e incrociato col dato di blocco.
    🔴 DIFETTO MIO, non suo: il commit b31ca1c5 mescola il suo codice con i MIEI documenti, perche' ho
    fatto `git add -A docs memory` mentre i suoi file erano gia' in stage. Da qui in avanti: commit coi
    percorsi espliciti. Non riscrivo la storia con un altro esecutore vivo sul ramo.
    R-E2 riferito da lui: `persistenza.ts:17` tipizza il passo salvato come INDICE, in tensione con la
    Legge 1 del contratto. ⚠️ Lui lo manda a T13: la destinazione giusta e' **T9** (StatoSalvato -> v:2,
    «il NOME del passo, non l'indice»). Corretto qui, da portare nel brief di T9.
    REVIEW T4: in corso (diff dei soli 2 file, escluso il rumore documentale).
T2: IN CORSO (i 38 tipi imparano prevedeDenti/prevedeColore/prevedeArcata).
REVIEW T4: A (mandato) ✅ — nessuna lacuna, nessuna aggiunta fuori mandato; il revisore ha RIVERIFICATO
    di persona le due coordinate e la ricerca di collisioni (zero riscontri), e ha rilanciato tsc + vitest
    ottenendo gli stessi numeri (3698/19). B (qualita') = DA CORREGGERE, 2 Importanti + 2 Minori:
    · IMP-1 `tests/unit/wizard-passi.test.ts:163-173` — asserzione TAUTOLOGICA: attende
      `!isPrimoPasso(...)` mentre l'implementazione E' `!isPrimoPasso(...)`. Non puo' fallire.
      🔑 E il meccanismo R-P4 NON poteva vederla: contro lo stub inerte quel blocco si accendeva.
    · IMP-2 `mostraUscita` e' l'unica delle 6 senza il caso «sequenza vuota» dichiarato e provato.
    · MIN-1 `SEQUENZA_CANONICA` e' readonly solo per TypeScript, non congelata a runtime.
    · MIN-2 il conteggio 23/47 di R-P4 e' a mano (dichiarato tale) e non piu' riproducibile.
    ✅ Il contratto in se' e' stato giudicato difendibile, con un argomento PIU' FORTE di quello
    dell'esecutore: nel desync `passoPrecedente` torna null, quindi la ✕ e' l'unica uscita che regge.
    FIX T4: da fare quando T2 ha finito (un solo scrittore per volta sul ramo). Tocca il solo file di test.
T2: consegnato DONE, commit b7c38819 (src/lib/domain/tipi-lavoro.ts + tests/unit/tipi-lavoro.test.ts).
    38 tipi con prevedeDenti / prevedeColore ('catalogo'|'libero'|'nessuno') / prevedeArcata.
    FASE 7: tsc 0 · vitest 3708 passati / 19 saltati / 0 falliti · next build ok.
    R-P4: 3 su 10 asserzioni nuove si accendevano sull'abbozzo inerte, poi 18/18 verdi.
    R-E2 riferiti da lui: ① la leva W17 «saltabile» (riparazione/ribasatura) NON e' persistita da nessuna
    parte — lui propone T21, non T3, perche' non decide la sequenza ma il comportamento del passo;
    ② 🔧 DIFETTO MIO NEL VERBALE, gia' corretto in a7905a70: D41 scriveva `prevedeColore: false`, cioe' la
    forma booleana di prima che D42 (riga sopra, stessa tornata) portasse il campo a tre valori.
    Auto-revisione onesta: la riga piu' debole e' il gruppo scheletrato («colore si' SE porta denti» ->
    'catalogo' incondizionato) e la tabella del test e' scritta dagli stessi occhi del sorgente.
REVIEW T2: in corso. FIX T4 (i 2 Importanti): in corso — unico scrittore sul ramo.
T4: COMPLETO. commit b31ca1c5 (codice, misto ai documenti per colpa mia) + 7d92ab7d (fix dei 2 Importanti).
    Il fix ha valori attesi SCRITTI A MANO al posto della tautologia, il caso «sequenza vuota» su
    mostraUscita e la riga di JSDoc. Provato invertendo il segno dell'implementazione: 6 rossi, fra cui
    per nome sia il blocco riscritto sia quello nuovo; ripristinato, 27/27 verdi. tsc 0.
    MINORI a verbale per la review finale del ramo: SEQUENZA_CANONICA non congelata a runtime; il
    conteggio 23/47 di R-P4 e' a mano e non piu' riproducibile.
T2: COMPLETO. review A ✅ / B approvato, 0 Critici, 0 Importanti, 3 Minori a verbale.
    🔑 Il revisore ha RICOSTRUITO A MANO tutte e 24 le righe della fonte (38 id) senza guardare la tabella
    del rapporto, e poi confrontate: **38/38 corrette, zero divergenze**; id del verbale = id del codice.
    Ha rieseguito tsc (0) e il file di test (18/18). Consumatori dei tre campi nuovi: NESSUNO ancora
    (li usera' T3) — verificato con grep.
    MINORI a verbale: le 3 prove obbligatorie senza messaggio custom (stile) · i `typeof ... === 'boolean'`
    sono quasi vacui a runtime (la guardia vera e' lunghezza fissa + fixture a 38 chiavi + tsc) · la
    tabella del test e' una trascrizione parallela: un refuso identico in sorgente E test non lo vedrebbe
    nessun test — solo il confronto con la fonte, che il revisore ha rifatto.
    ✅ CHIARITO il dubbio sollevato dal revisore: `a7905a70` (correzione di D41) l'ho applicato IO come
    orchestratore dopo aver letto il rapporto, non l'esecutore di T2. Il flusso R-E2 e' stato rispettato.
    🔑 Il revisore CHIUDE la preoccupazione sugli scheletrati: «colore si' SE porta denti» e' recuperabile
    a valle (prevedeDenti true -> il consumatore condiziona su «denti indicati non vuoti»), come gia' fa
    «arcata: dedotta». Non serve un campo nuovo.
    ⚠️ E precisa la destinazione della leva «saltabile»: la SEDE naturale e' un campo su tipi-lavoro.ts
    (e' un default PER TIPO), il CONSUMO sta in W17/T21. Da portare a Francesco.
T3: IN CORSO (sequenza-passi.ts: sequenzaPassi + cosaSiPerde a DUE STATI, D17).
T3: COMPLETO. commit 858a345b. review A ✅ / B approvato, 0 Critici, 0 Importanti, 4 Minori.
    Il revisore ha fatto un TEST DI MUTAZIONE: rimesso `!== null` al posto di `!= null` -> si accendono
    esattamente le 2 prove dedicate (un falso positivo + un TypeError), le altre 24 restano verdi.
    Verificato che `cosaSiPerde` poggia DAVVERO su `sequenzaPassi` (nessuna seconda lista a mano) e che
    `'libero'` NON apre il passo colore (confronto stretto === 'catalogo'). Zero collisioni di nomi.
    MINORI a verbale: la tabella §2.3 e' 2 righe + una regola inline invece di 3 righe · l'ordine di
    ritorno e' per causa, non per ordine dei passi (se T21 lo vuole diverso, si tocca qui) ·
    `NomeDatoPerso` e `NomePasso` divergono su singolare/plurale (`colori` vs `colore`) · una forma
    d'input non enumerata (equivalente per costruzione a una gia' coperta).
    ➡️ DA PORTARE A T21: un tipo scelto come TESTO LIBERO cadrebbe nel ramo «id ignoto» -> sequenza
    minima, mai denti ne' colore. Difendibile ma SILENZIOSO se T21 non lo tiene a mente.
D43: Francesco autorizza l'indice unico DIRETTAMENTE in produzione. P2 rieseguita nello stesso turno:
    0 duplicati grezzi, 0 normalizzati, baseline 294/0/916/48. Commit del verbale: vedi git log.
T5: IN CORSO (migration: indice unico su pazienti + FASE 6b a tre righe + prove B21).
T5: COMPLETO. commit 70ca315e. review (modello piu' capace, mandato in SOLA LETTURA sul DB):
    A rispettato «al millimetro» · B approvato con rilievi, 0 Critici.
    Il revisore ha riverificato di persona le tre affermazioni su cui il rapporto poteva bluffare:
    ① predicato letto da pg_indexes (identico al ratificato, indisvalid/indisunique true, 64 kB);
    ② ledger: 86 righe, e insiemi versioni-ledger vs file-su-disco CONFRONTATI, biunivoci;
    ③ `gen types` RIGENERATO da zero e confrontato: diff vuoto, nessun drift.
    🔑 E ha smontato il metodo del rapporto sulle RLS: «byte-identiche prima e dopo» era un'ASSERZIONE
    (nessuna fotografia del prima). Conclusione comunque VERA, provata da lui con una fonte anteriore
    indipendente: supabase/schema.sql:505-516, file non toccato dal commit.
    Dove hanno girato le sonde: provato con TRE riscontri (la riga di ledger contiene UNA sola istruzione;
    zero residui; e l'aritmetica di pg_stat_user_tables — 933 inserite, 916 vive, 8 cancellate = 9 tuple
    annullate, e n_tup_del INVARIATO: se avessero scritto sui dati veri e poi ripulito, sarebbe salito).
    MINORI: la terza forma umana (`PZ-0042 `) non e' provata sull'indice applicato (il brief ne chiedeva
    due) — il meccanismo e' chiuso in sola lettura (le 4 forme collassano sulla stessa chiave), la prova
    comportamentale la chiude T7/T15 · lo script della sonda e' stato CANCELLATO: andava incollato nel
    rapporto · `IF NOT EXISTS` maschera un omonimo diverso · un ritrovamento del rapporto ha la causa
    sbagliata (il seed non fallisce per il rilancio: fallisce se esiste gia' un paziente con quel codice
    e id diverso).
    IMPORTANTI, nessuno imputabile a T5:
    · I-1 BP-1 non fatto -> ✅ CHIUSO DA ME, commit 369fc427 (MEMORY voce 67 + ROADMAP).
    · I-2 requisito di portata per T7/T15: tre regole di visibilita' diverse sullo stesso dato
      (RLS -> deleted_at · rotta -> archiviato + limit 500 + un solo dentista · indice -> nessuno stato,
      tutto il laboratorio). Il riconoscimento e' piu' cieco del divieto. -> nel brief di T7.
    · I-3 `btrim` non toglie tabulazioni ne' spazi unicode, `trim()` di JS si': buco aperto solo per le
      scritture che NON passano dalle rotte (seed oggi, primo importatore domani). -> in ROADMAP.
PANEL B2-vs-T6, parere 1 (banco/UX): raccomanda ricerca in OR su `cognome` e `codice_paziente` (NON su
    `nome_cognome`, che restituirebbe 911 righe indistinguibili), max 5 risultati in un pannello
    SOVRAPPOSTO ad altezza fissa (l'unico modo per non far ballare «Continua», D9), nessun messaggio
    «nessun risultato» — con questi dati «non trovato» e' l'esito NORMALE, non un'eccezione da segnalare.
    🔑 Ha contestato il numero 911/916 come «non verificato» (la spec stessa lo dichiarava tale).
    ✅ RIMISURATO DA ME sul database vero: 916 totali · 911 senza cognome · 5 con cognome vero ·
    911 con nome_cognome = codice_paziente · 1 senza codice. Il numero regge; la nota «non verificato»
    della spec (riga 472) e' stata CHIUSA con la misura incollata.
    ⚠️ Rilievo suo, vero e da portare nel piano: ne' la spec ne' le decisioni dicono QUANTI suggerimenti
    mostrare — la spec limita la proiezione dei dati, non il numero a schermo.
    ➡️ E il limite del dato, detto bene: gli 911 senza nome NON sono ritrovabili per cognome in nessun
    modo, perche' quel nome non esiste in nessuna colonna. Non e' un difetto della ricerca.
PANEL B2-vs-T6, parere 2 (contratto): raccomanda (b) ma VERSO IL BASSO — quattro chiavi
    `id, codice_paziente, alias, ultimoLavoro` con `derivaAlias` (gia' in casa, torna string|null).
    (a) scartata con prova: `cognome` sarebbe colonna in scrittura e derivato in lettura, e un client che
    rimanda `cognome: ''` fa scrivere il CODICE dentro il cognome (200, silenzioso) — e B2 sarebbe rimasta
    VERDE attraverso il cambiamento che e' nata per vedere, perche' guarda la forma.
    -> ✅ RATIFICATO IO come D44, dopo aver riverificato di persona i due fatti-perno (derivaAlias esiste
    e torna null quando il nome visibile e' il codice; la trappola del PATCH si chiude davvero).
    Emendate: la prova B2 nella spec (5 chiavi -> 4) e il task T6 nel piano. Commit 47dc3358.
D45 (commit 1c974078): RILIEVO DI FRANCESCO — «i dati sono di test, potrebbero sviarti». Aveva ragione su
    UNA conclusione, ritirata: «nessun messaggio quando non si trova nulla» valeva solo per l'archivio di
    prova. T15 mostra «nessun risultato». Il resto regge perche' NON dipendeva dai dati (la causa dei 911
    senza cognome e' `crea-lavoro.ts:229-230`, cioe' il CODICE; `nome_cognome` la compone un trigger; il
    tetto serve di piu' con un archivio pieno; i codici generati hanno tutti lo stesso prefisso).
    🔑 REGOLA DI METODO che entra col caso: prima di fare di una misura una regola, si chiede da dove
    viene il numero — dal codice (vale domani) o dai dati di prova (sparisce con la pulizia).
T7: consegnato, commit 28d7e01c — `trovaOccupanteCodice` in src/lib/domain/codice-paziente-unicita.ts,
    funzione di LIBRERIA (non rotta), 17 test, FASE 7 verde (tsc 0 · 3752 test · build ok).
    Ha usato `derivaAlias` DA SOLO, coerente con D44 ratificata in parallelo. Ha riferito il SESTO
    riferimento stantio del piano (il mio brief lo mandava su `nome-paziente-scrittura.ts`).
REVIEW T7: A ✅ / B da correggere — 1 Importante + 2 Minori. Il revisore ha fatto curl diretti contro
    PostgREST per provare `!inner` e la forma per-padre, e ha letto la finta RIGA PER RIGA.
    🔴 IMPORTANTE (provato sul catalogo vivo): il pattern `%chiave%` NON trova se stesso se la chiave
    contiene un BACKSLASH — per Postgres e' l'escape di default e sparisce dal pattern ma resta nel dato.
    -> la funzione direbbe «libero» su un codice OCCUPATO, in silenzio: la classe di difetto che T7
    esisteva per chiudere. Oggi zero righe con backslash (verificato), quindi non attivo ma raggiungibile.
    🔑 E la finta non poteva vederlo: simula ILIKE con `.includes()`, che non ha semantica di
    metacarattere — buco di FEDELTA' della finta, non errore di chi l'ha scritta.
    MINORI: `trim()` JS vs `btrim()` anche nell'uguaglianza (falso «occupato», mai falso «libero») ·
    un pattern con `%` iniziale non usa mai l'indice btree: irrilevante a 916 righe, collo di bottiglia
    se T15 lo chiama a ogni battitura -> debounce, responsabilita' di chi costruisce quella UI.
    ➡️ DA PORTARE A T15: il contratto FAIL-OPEN su errore (mai trattare «libero» come «sicuro scrivere»).
    ➡️ E un avviso: T6 dovra' costruire lo STESSO innesto «ultimo lavoro» — attenzione a non farne due
    copie che decidono diversamente.
FIX T7 (backslash): IN CORSO.
FIX T7 (backslash): FATTO, commit 068fc2f0. Raddoppiato SOLO il backslash prima di comporre `%…%`
    (`%`/`_` intoccati). Prova nuova in ISOLAMENTO sulla costruzione del pattern, con atteso scritto a
    mano: provata rossa togliendo la correzione, verde rimettendola. 19/19 sul file, tsc 0.
    ⚠️ Dichiarato: la finta condivisa resta infedele alla semantica ILIKE per gli altri 17 test — scelta
    deliberata, non un difetto rimosso di nascosto.
T7: COMPLETO (28d7e01c + 068fc2f0).
--- FASE 7 SUL RAMO, eseguita dal COORDINATORE con output reale ---
    tsc --noEmit: 0 errori · vitest run: 355 file, 3754 passati / 19 saltati / 0 falliti ·
    next build: EXIT=0. Baseline DB invariata: 294 · 0 · 916 · 48.
--- CHIUSURA SESSIONE 29/07 ---
BP-1 fatto: MEMORY voci 67 e 68 + testa · ROADMAP (indice in produzione + voce 6 tinte) ·
    SESSION_ACTIVE · handoff docs/roadmap/2026-07-29-ondata-b-fondamenta-handoff.md.
🛑 NIENTE PUBBLICATO SU origin: il push su main innesca il deploy e non e' stato chiesto.
➡️ SI RIPARTE DA T6 (sbloccato da D44), poi T8. I mockup denti/colore e la portata di B7 restano gate.
--- RIPRESA 29/07, contesto pulito: sciolto il bloccante 4-ter PRIMA di T6 (il piano lo vietava «dentro») ---
PANEL D46-D48: 3 advisor (contratto API · costi DB · sicurezza e dati). NESSUNO ha confermato la proposta
    che gli era stata portata («due forme di risposta, innesto solo con q»). Fatti-perno riverificati DA ME
    prima di ratificare, come per D44.
D46 (forma UNICA su entrambi i percorsi): la proposta a due forme e' caduta su due argomenti che non avevo —
    ① zero precedenti in casa di risposta che cambia col parametro (clienti/route.ts:28-30,38-40 e
    fasi-produzione/ricerca:34-36 usano q come SOLO filtro); ② il risparmio e' misurato: +911 buffer e
    +1,6 ms, una volta per creazione di lavoro. `ultimoLavoro` sempre presente, null = «nessun lavoro».
    + tetto FUORI dal ramo · archiviato su entrambi · cliente_id obbligatorio con q, ramo su `q !== null`
    (MAI `if (q)`: `?q=` vuoto cadrebbe nel legacy e il vincolo si aggira togliendo un carattere) ·
    400 non 422 (precedente: impostazioni/pec/verify-status:11; i 422 in casa sono semantica di CORPO).
D47 (EMENDA D44): nome_cognome RIENTRA nel filtro, 4 colonne. L'aritmetica di D44 e' void — su quelle 911
    righe nome_cognome E' codice_paziente carattere per carattere, il di piu' e' ZERO (provato: paz 0 ·
    2026 0 · 101 0). E l'esclusione rompeva il caso piu' naturale: q='bagheria giuseppe' -> 0 senza, 1 con.
    4 e non 2 perche' il soprainsieme NON e' garantito (trigger 002_fase2_schema.sql:124 ricompone solo se
    entrambi non-null).
D48 (escape): 4 metacaratteri, non 2, e un ORDINE. `*` sopravvive alle virgolette (provato: q='*' col solo
    pgrestQuote -> 911/911) e si RIMUOVE; la rimozione apre il buco che chiude senza GUARDIA SUL VUOTO dopo
    l'escape (provato: pattern %% -> tutto); pgrestQuote per ULTIMO. Isolamento provato IN ATTACCO: q nudo
    con `laboratorio_id.eq.<altro lab>` dentro .or() -> 0 righe. Regge per STRUTTURA (postgrest-js mette il
    gruppo in un parametro separato, dist/index.cjs:2988-2990, ANDato).
    -> I test di T6 asseriscono anche sul PREDICATO COSTRUITO. B2 con finto GRASSO (supabase-chain-mock.ts
    tiene `select` fra i passanti: con un finto magro resterebbe verde anche con select('*')).
DOCUMENTI ALLINEATI: verbale (D46-D48 + R11-R17, testa a «Quarantotto ... in dieci tornate», guardia verde) ·
    piano §6 T6 riscritto (punti 3,4,4-bis,4-ter,5 + 6,7,8 nuovi) + §9 1-bis/1-ter CHIUSI + §6-bis nuovo +
    B25 riscritta + 2 coordinate stantie corrette (T7 :209->:250, T16 :229-230->:270-271) ·
    spec §5 e §14.3 emendate + B2 (percorso + come si scrive) + :213->:255 · ROADMAP 7 voci nuove ·
    MEMORY voce 69 · SESSION_ACTIVE.
🔴 FUORI PERIMETRO, ALTA, DECISIONE DI FRANCESCO: GET /api/clienti proietta `portale_token` -> apre DdC e
    buono di lavorazione SENZA PIN, nel browser di ogni utente autenticato (roadmap TOK-1).
Baseline DB riverificata: 294 · 0 · 916 · 48. Solo letture.
T6: CONSEGNATO. commits 6096e953 (implementazione) + 515633ae (correzione di una SUA prova).
    src/app/api/pazienti/route.ts (solo GET) · src/lib/utils/escape-postgrest.ts (+ ilikeLiterale) ·
    tests/unit/api-pazienti-get-ricerca.test.ts (35, file nuovo con la ragione dichiarata) ·
    tests/unit/escape-postgrest.test.ts (+12).
    FASE 7: tsc 0 · vitest 3801 passati / 19 saltati · next build exit 0. Baseline 294/0/916/48.
    R-P4: 27 su 34 sulla rotta contro l'abbozzo inerte; 8 su 12 su ilikeLiterale. 12 mutazioni, ognuna
    accende le prove giuste PER NOME.
    🔑 AUTO-REVISIONE ONESTA, e ha trovato un difetto VERO nelle proprie prove: la prova di attacco al
    tenant asseriva `not.toContain('laboratorio_id.eq.…')` — proprieta' che NON vale (nessuno dei due
    escape tocca virgole/punti/lettere: quel testo DEVE viaggiare intero dentro il valore quotato).
    Passava per un caso (il `_` di laboratorio_id viene escapato). Provata vuota rompendo pgrestQuote:
    restava verde. Riscritta sulla proprieta' vera (il testo non diventa mai una CONDIZIONE) + controllo
    strutturale sugli apici non escapati. Ora la mutazione su pgrestQuote la uccide.
    DIFETTI DEL PIANO riferiti da lui (8): §2 del gate diceva 422 contro il 400 del proprio task
    (CORRETTO da me) · una coordinata stantia nel mio brief (:208-213 vs :214) · la giustificazione della
    «passata unica» nell'escape e' imprecisa (rompe solo in UN ordine; la conclusione regge) · la frase
    del brief sul finto grasso fonde due prove distinte · ?q= vuoto CON cliente_id non era coperto da
    nessun documento -> D49 · il conteggio di D44 ha una sfumatura mai scritta -> R18.
    DICHIARATO: l'asserzione sul deleted_at dei lavori e' fatta SUL FINTO (0 lavori soft-cancellati su
    294) e scritta come tale dentro il test. E ogni prova sul predicato asserisce la stringa consegnata
    a .or(), mai cio' che PostgREST poi ne fa — buco ridotto con una sonda, non chiuso.
    BP-1 lasciato al coordinatore di proposito (un esecutore che scrive in memory/ su un ramo condiviso
    si fa inglobare da un git add -A altrui). Fatto: MEMORY voce 69 + verbale D49/R18 + piano §2.
REVIEW T6: in corso (revisore fresco, mandato di riverificare DI PERSONA i tre numeri su cui il rapporto
    poteva bluffare + tre mutazioni scelte da lui).
REVIEW T6: DA CORREGGERE. Il revisore ha rilanciato i 3 comandi (3801/19, tsc 0, build 0 — confermati),
    fatto 13 mutazioni SCELTE DA LUI (11 accendono la prova giusta per nome) e riverificato le tre
    affermazioni su cui il rapporto poteva bluffare (34 blocchi it in 6096e953: esatto; 0 lavori
    soft-cancellati: esatto; le sonde ci sono ancora).
    🔴 IMP-1 — la prova scritta APPOSTA per difendere la proiezione e' una LISTA NERA di 6 nomi di
      colonna, e `select('*')` non ne contiene nessuno. Provato: `.select('*, nome_cognome,
      lavori(data_ingresso))'` -> 104 prove su 104 VERDI, e la rotta chiede OGNI colonna di pazienti per
      500 righe. B2 resta verde A RAGIONE (misura il browser, che non cambia): la perdita e' banda e
      uscita dal DB. -> REGOLA: una guardia sulla proiezione si scrive con un toBe sulla stringa esatta,
      MAI con un elenco di cio' che non deve esserci.
    🔴 IMP-2 — il messaggio di 515633ae dichiara una prova per mutazione CHE NON E' QUELLA ESEGUITA: la
      meta' `toContain('\\"')` la mutazione la vedeva; vacua era l'altra meta' (`not.toContain`). Codice
      giusto, RECORD sbagliato. Rettifica accanto alla prova, niente riscrittura di storia.
    🟡 MANDATO: MAX_CARATTERI_Q = 64 era entrato SENZA NUMERO (zero occorrenze in piano/verbale/spec, e
      nessuna rotta in casa taglia un termine) -> D50: il tetto resta, ma NON TRONCA (troncare fa
      combaciare piu' di quanto l'utente ha scritto, in silenzio). Oltre 64 -> 200 { pazienti: [] }.
    🟡 2 asserzioni passano a vuoto sull'elenco vuoto (:149-156 senza toHaveLength, :185-191 su res.text)
      · il «controllo negativo sull'ordine» in escape-postgrest.test.ts NON guarda l'ordine (M2 del
      revisore lo ha lasciato verde) · «27 su 34» non riproducibile (l'abbozzo non e' scritto: col suo,
      29 su 35) · le due funzioni di escape non si nominano a vicenda -> trappola per chi le unifichera'
      · D49 senza un it col suo nome.
    ✅ Detto anche cio' che e' ben fatto: finto GRASSO vero, corpo parsato e stringa di select in due
      describe distinti CON IL MOTIVO ACCANTO, attesi in String.raw scritti a mano, archiviato provato su
      entrambi i percorsi. Chiamante vivo (crea-lavoro.ts:250-256) non rotto.
D50 ratificata (tetto 64 senza troncamento). Verbale a CINQUANTA decisioni, guardia verde.
FIX T6: IN CORSO (esecutore fresco, 8 rilievi).
FIX T6: commit b4cd0e12, tutti e 8 i rilievi chiusi.
    ⚠️ L'ESECUTORE SI E' INTERROTTO PER UN ERRORE DI RETE DOPO IL COMMIT: il suo rapporto NON ESISTE.
    Nessun numero di R-P4 suo, nessuna sua lista di mutazioni. -> FASE 7 e le mutazioni le ho RIESEGUITE
    IO, e sotto ci sono solo cose che ho misurato di persona. Non si dichiara «fatto» su un rapporto
    che non c'e'.
    FASE 7 (mia, output reale): tsc --noEmit EXIT=0, zero righe · vitest run 3806 passati / 19 saltati
    (3825, 356 file) · next build: v. sotto.
    MUTAZIONE 1 (la piu' importante, quella che la review ha aperto): rimessa
    `.select('*, nome_cognome, lavori(data_ingresso)')` -> la prova «la select e' ESATTAMENTE la
    proiezione stretta, e su ENTRAMBI i percorsi» va ROSSA (1 su 60). Prima del fix restavano 104/104
    verdi: il buco e' chiuso e la chiusura e' provata.
    MUTAZIONE 2: rimesso il troncamento (`ilikeLiterale(grezzo.slice(0, MAX))`) -> 3 rosse, tutte D50,
    per nome: «NON si tronca» · «il confine e' 65» · «gli asterischi CONTANO nel tetto».
    Albero ripristinato e pulito dopo entrambe (git diff vuoto). Baseline DB riverificata: 294/0/916/48.
    COSA HO CONTROLLATO LEGGENDO IL DIFF: il toBe sulla stringa esatta su ENTRAMBI i percorsi (non piu'
    lista nera) · la rettifica di record su 515633ae scritta ACCANTO ALLA PROVA, niente riscrittura di
    storia · D50 senza troncamento, con la misura sul DIGITATO e la ragione dichiarata (misurando dopo
    l'escape, 40 `%` sparirebbero dietro la guardia) · i due toHaveLength che tolgono le asserzioni
    vacue · il commento incrociato FRA LE DUE funzioni di escape, in entrambi i file, che dice PERCHE'
    sono diverse (unificarle riaprirebbe il difetto di T7) · la prova di D49 col suo nome · il
    «controllo negativo sull'ordine» rinominato, con misura incollata (invertendo l'ordine nella rotta:
    8 rosse la', ZERO qui — una prova su funzioni pure non puo' sorvegliare l'ordine di un chiamante).
    MUTAZIONE 3 (mia, il dubbio che avevo sollevato nel brief della ri-revisione): issata la guardia del
    tetto SOPRA il 400 di portata -> 1 rossa, «D50 — un termine lungo SENZA cliente_id resta un 400: la
    portata viene prima del tetto». L'esecutore l'aveva gia' anticipata con un it col suo nome
    (api-pazienti-get-ricerca.test.ts:485). Ordine nel codice verificato leggendo: il 400 sta a :111-116,
    la guardia del tetto a :129-131 — la portata viene prima. Albero pulito dopo.
    D49 ha il suo it letterale (verificato nel diff).
⚠️ RI-REVISIONE: due tentativi caduti per errore di rete (uno dopo il commit senza rapporto, uno prima di
    cominciare). Terzo tentativo lanciato con mandato STRETTO sui soli 5 punti che restano non provati:
    (a) le asserzioni vacue sono davvero sparite (misura con abbozzo inerte) · (b) il numero «8 rosse la',
    ZERO qui» dichiarato in un commento va RIPRODOTTO (in questa sessione due numeri dichiarati si sono
    gia' rivelati falsi) · (c) i commenti incrociati fra le due funzioni di escape sono VERI o plausibili ·
    (d) caccia alle tautologie fra le prove NUOVE · (e) rilievo 6 (l'abbozzo inerte non scritto da nessuna
    parte) NON e' chiuso: doveva stare nel rapporto, e il rapporto non esiste.
RI-REVISIONE (terzo tentativo, riuscito): DA CORREGGERE -> chiusa da f5b7aa03.
    (a) asserzioni vacue: chiuse, MA ne ha trovata una QUARTA — «senza q e senza cliente_id -> 200»
      asseriva SOLO lo stato, che e' cio' che restituisce anche una rotta inerte, ed era l'unica prova a
      presidiare il percorso storico di RATE-1. CORRETTA (righe + mockFrom chiamato).
      🔑 E il difetto peggiore non era la prova: era il COMMENTO accanto, «TERZA ISTANZA, il rilievo ne
      nominava due» — una dichiarazione di completezza SBAGLIATA sulla proprieta' che si stava
      correggendo. Chiude la caccia a chi legge. REGOLA: non si scrive quante ne restano, si scrive il
      METODO e lo si rilancia. Conteggio tolto dal commento.
    (b) il numero dichiarato nel commento («8 rosse la', ZERO qui») e' VERO, riprodotto: 8/40 e 0/20.
    (c) i commenti incrociati fra le due funzioni di escape REGGONO, e il revisore ha tirato la freccia
      fino in fondo: con `ilikeLiterale` al posto della replace a mano, un codice `PZ*42` non troverebbe
      se stesso -> «libero» su un codice OCCUPATO. Precisazione sua: la mezza frase su `%`/`_` resta un
      «potrebbe», e il file gia' lo ammetteva.
    (d) nessuna prova nuova e' tautologica (attesi riderivati a mano UNO PER UNO, non a campione).
    (e) rilievo 6 NON era chiuso (l'abbozzo non era scritto da nessuna parte, e il rapporto non esiste)
      -> CHIUSO da me: abbozzo PER ESTESO in intestazione + comando + numero misurato da me a file
      completo (34 rosse su 40) + le 6 verdi elencate una per una ACCANTO ALLA LORO GEMELLA POSITIVA.
    R-E2 nuovo: api/lavori/route.ts:72 ilike('descrizione') SENZA escape — terza occorrenza. Portata
      minore (eq + limit a monte, colonna non anagrafica). -> verbale R19 + roadmap ESC-1.
--- FASE 7 FINALE (mia, detta com'e' andata) ---
    tsc --noEmit EXIT=0 · next build EXIT=0 · vitest 3806 passati / 19 saltati.
    ⚠️ La suite intera e' VERDE IN 2 ESECUZIONI SU 4. Le due rosse portano UN SOLO test, sempre lo stesso:
    tests/unit/PassoTipo.test.tsx:165, durata 23,6 s. NON e' una regressione di T6, prova tripla:
    ① `git log b4b09d52..HEAD --` su quel file e sul suo componente e' VUOTO (mai toccato dal ramo);
    ② 14/14 in isolamento, tre giri su tre; ③ e' NOMINATO PER NOME in .superpowers/sdd/
    diagnosi-flake-vitest.md:235 fra i file che cedono sotto contesa multi-worker.
T6: COMPLETO (6096e953 + 515633ae + b4cd0e12 + f5b7aa03, due revisioni e due giri di correzione).
➡️ PROSSIMO: T8 (DELETE immagine soft + le otto letture).
CHIUSURA: due cose che i miei controlli non coprivano, trovate all'ultimo giro.
  ① Il requisito ereditato dall'handoff «l'innesto ultimo lavoro non diventi due copie che decidono
    diversamente» era soddisfatto MA IN SILENZIO. Verificati tutti e cinque i punti: select, order
    discendente su data_ingresso, limit(1) per padre, is('lavori.deleted_at', null), estrazione
    `lavori?.[0]?.data_ingresso ?? null` — IDENTICI. Sono due copie DELIBERATE (portate diverse: T7 e'
    cieca allo stato e larga su tutto il lab, T6 e' ristretta a uno studio e filtra archiviato). I due
    file ORA SI NOMINANO A VICENDA e dicono che chi tocca uno tocca l'altro: senza, la divergenza non la
    vedrebbe nessun test (i due file non si incontrano mai), si vedrebbe solo a schermo come due date
    diverse per lo stesso paziente. A verbale per la review finale: ultimoLavoro (T6) e dataUltimoLavoro
    (T7) sono lo stesso valore con due nomi.
  ② L'handoff «fondamenta» era diventato FALSO nel punto che una sessione nuova legge per primo:
    «sei task», «si riparte da T6», «45 decisioni». La guardia non poteva vederlo (controlla conteggi e
    riferimenti, non se una frase di prosa e' ancora vera). -> handoff successore
    docs/roadmap/2026-07-29-ondata-b-blocco3-handoff.md, SESSION_ACTIVE ripuntata.
⚠️ CORREZIONE A UN MIO NUMERO: le esecuzioni intere di vitest sono state CINQUE, non quattro — 2 verdi,
  3 rosse — e le vittime RUOTANO: PassoTipo.test.tsx:165 (23,6 s), lavoro-form-messaggio-errore.test.tsx
  (8,9 s), una non attribuita. Sempre UN solo test per esecuzione, sempre con durata anomala. Nessuno dei
  due file e' mai stato toccato sul ramo (git log b4b09d52..HEAD -- <file> vuoto) e entrambi passano in
  isolamento 3 giri su 3. La diagnosi in casa (diagnosi-flake-vitest.md:235) descrive esattamente questo:
  file «variabili tra i 9 run, mai lo stesso set».
  ➡️ REGOLA PRATICA scritta nell'handoff: un solo rosso con durata anomala in un file che NON hai toccato
  -> isolalo prima di indagare. Ma la stessa firma su un file che HAI toccato resta un difetto tuo finche'
  non provi il contrario.
CONTROLLO FINALE (richiesto da Francesco): albero PULITO · ramo ondata-b-schermate, 28 commit da b4b09d52,
  NESSUN upstream (niente su origin) · tsc EXIT=0 · next build EXIT=0 · baseline DB 294 · 0 · 916 · 48 ·
  guardia coerenza VERDE · vitest: TRE esecuzioni intere di fila, tutte 3806/19 VERDI.
  Conteggio finale del flake: 8 esecuzioni intere, 5 verdi 3 rosse, vittime che ruotano su file mai
  toccati dal ramo. I documenti (handoff, MEMORY, SESSION_ACTIVE) portano ora il conteggio 5/8.
  ⚠️ Corretta una riga rimasta indietro: SESSION_ACTIVE portava ancora «2 su 4» e un solo nome di vittima.
--- T8: LETTURA R-P2 FATTA (29/07), brief non ancora scritto ---
Lettore su tutti e otto i siti, con domande falsificabili e divieto di riassumere. Sei fatti:
  ① le OTTO coordinate del piano sono ESATTE (per una volta zero riferimenti stantii, verificato sito per
    sito). Tutti innesti SEMPLICI con alias `immagini:lavori_immagini(*)`, NESSUN !inner.
  ② 🔴 SOLO DUE degli otto raggiungono un utente: siti 1 (scheda) e 2 (modifica). Catena verificata:
    soft delete -> il file resta -> getSignedUrl riesce lo stesso -> la foto torna a schermo con URL
    FRESCA E VALIDA; e sul sito 2 il contatore conta anche le cancellate (TabImmagini.tsx:571).
    I siti 3-8 sono PAYLOAD MORTO — riverificato DA ME: immagin|foto|storage_path nei 3 template PDF
    (percorso vero src/components/features/pdf/) = 0·0·0; in generate-xml.ts i 2 riscontri sono
    xml_storage_path e pdf_storage_path, cioe' i percorsi DELLA FATTURA, non le foto; il GET del sito 3
    non ha consumatori (ogni fetch verso /api/lavori/${id} e' un PATCH).
    ➡️ il filtro va messo anche li' (igiene) ma le PROVE si spendono sui due che contano.
  ③ NESSUNA MIGRATION: deleted_at esiste, la RLS lo filtra e l'indice parziale c'e' — ma tutti e otto
    usano getServiceClient() e SCAVALCANO la RLS. E' l'intera ragione d'essere di T8.
  ④ Il file [imgId]/route.ts ESISTE GIA' (82 righe, solo PATCH): T8 aggiunge un handler.
  ⑤ La «mutazione fratella»: il piano ne racconta meta'. Guardia :37-43 con TRE .eq(), update() :68-74
    con DUE (manca lavoro_id). Non sfruttabile oggi (id e' PK) ma e' il modello che T8 copierebbe.
  ⑥ 🔴 DUE buchi che T8 APRE: (a) la guardia del PATCH non filtra deleted_at -> 200 OK su un fantasma
    appena il soft-delete esiste; (b) :77 rimanda updateError.message GREZZO al client (G9-76).
P12 PROVATA — e ha SMENTITO il rilievo piu' forte del lettore. Sosteneva che la grafia del piano
  (.is('lavori_immagini.deleted_at', null)) fosse sbagliata a favore dell'alias, «o un 400 o un colpo a
  vuoto», ragionando dal precedente ddc: sulla riga adiacente. Sonda in sola lettura: ENTRAMBE le grafie
  funzionano ed ENTRAMBE mordono (valore INESISTENTE -> figli 0, padri 60 intatti). La grafia del piano
  RESTA. Il rilievo e' scritto nel piano APPOSTA: senza, una sessione futura rifarebbe lo stesso
  ragionamento e «correggerebbe» un non-problema.
  🔑 E la sonda chiude anche un'altra domanda: su innesto SEMPLICE il filtro toglie i FIGLI e lascia i
  PADRI — nessun lavoro sparisce perche' ha tutte le foto cancellate.
--- CHIUSURA SESSIONE 29/07 (organizzata per ripresa a contesto pulito) ---
BP-1 fatto: MEMORY voce 69 (testa riscritta: T6 chiuso + D46-D50 + le tre lezioni) · verbale a CINQUANTA
  decisioni + R11-R19 · ROADMAP (7 voci del panel + ESC-1) · SESSION_ACTIVE · handoff successore
  docs/roadmap/2026-07-29-ondata-b-blocco3-handoff.md (§5 riscritto: T8 e' ISTRUITO, manca il brief).
🛑 NIENTE PUBBLICATO SU origin: il push su main innesca il deploy e non e' stato chiesto.
➡️ IL PRIMO PASSO DELLA PROSSIMA SESSIONE: scrivere il brief di T8. NON rileggere gli otto file — la
  lettura R-P2 e' gia' nel piano (§3 registro letture, §5 P12, §6 T8 coi sei fatti). Rileggerli sarebbe
  rifare un lavoro gia' pagato.
🔴 IN ATTESA DI FRANCESCO, fuori dall'ondata: TOK-1 (portale_token nella proiezione clienti).
--- RIPRESA 29/07 (contesto pulito): il brief di T8 e' SCRITTO, e tre decisioni nuove ---
BP-0 fatto: SESSION_ACTIVE -> handoff blocco3 -> piano v2 (§5 P12, §6 T8) -> ledger. Nessuna rilettura
  degli otto siti (lavoro gia' pagato), ma CONTROLLO DI NON-STANTIO su tutte e otto le coordinate:
  `sed -n '<riga>p' <file>` -> tutte e otto portano `immagini:lavori_immagini(*),`. Esatte.
D51 (perimetro T8): SOLO il motore — rotta DELETE + filtro sugli 8 siti. Bottone «Elimina foto» e contatore
  (TabImmagini.tsx:571) ESCONO e diventano un task proprio con §0B (mockup -> approvazione -> React).
  🔴 Costo dichiarato, e ha gia' un nome in casa: R14 — T7 e' mergiata e INERTE per mancanza di chiamanti.
  Una rotta DELETE senza bottone e' la stessa forma. -> il task UI si aggancia SUBITO dopo T8.
  Il comportamento del server (409 fuori finestra, tre .eq(), conteggio righe) resta in T8 e si prova in T8.
D52 (i due difetti del PATCH): ENTRANO nel mandato di T8, quindi non e' correzione di nascosto (R-E2 vieta
  il nascosto, non il dichiarato). (a) guardia :37-43 senza filtro deleted_at -> lo APRE T8, quindi lo chiude
  T8; (b) :77 updateError.message grezzo (G9-76). ⚠️ RESTA FUORI e va riferito: l'update :68-74 con DUE .eq().
D53 (TOK-1): si chiude a FINE ondata (b), prima della pubblicazione, insieme a CLI-1 (stesso file).
  🛑 La PRIMA formulazione della domanda portava una premessa FALSA («nulla e' online, il rischio resta
  locale»): vero per il ramo, falso per TOK-1. `provato:` git show origin/main:src/app/api/clienti/route.ts
  -> portale_token E' nella proiezione, quindi il difetto e' VIVO IN PRODUZIONE OGGI. Domanda RIFATTA col
  fatto giusto; risposta invariata. La roadmap ora porta la correzione accanto alla voce.
BRIEF SCRITTO: docs/roadmap/2026-07-29-ondata-b-t8-brief.md — mandato, fuori-mandato, i 4 pezzi (handler DELETE ·
  i due difetti · gli 8 siti pesati 2+6 · le prove), la lezione «guardia = uguaglianza sulla stringa esatta,
  mai lista nera» applicata a T8 (controllo POSITIVO accanto a ogni negativo, o «non contiene» passa a vuoto),
  R-P4 con l'abbozzo DA INCOLLARE, il flake in ENTRAMBE le meta', FASE 7 a tre comandi.
  Coordinate riverificate DENTRO il brief: cicli:169 -> :170 (ok:true) · pazienti/route.ts:45-50 -> :227-228
  (T6 ha spostato il file: il verbale e la roadmap portano la coordinata vecchia) · supabase-chain-mock sta in
  tests/unit/helpers/, non tests/unit/.
➡️ PROSSIMO PASSO: l'esecutore fresco di T8 (R-E1), su richiesta di Francesco.
CORREZIONI AL BRIEF dopo il giro di advisor (stesso turno):
  ① SPOSTATO in docs/roadmap/2026-07-29-ondata-b-t8-brief.md — .superpowers/sdd/ e' ignorato da git
    (.gitignore = *), e un PUNTO DI RIPRESA non puo' vivere solo su un disco ne' restare invisibile alla
    guardia. I brief precedenti erano usa-e-getta dopo l'esecuzione: questo no.
  ② LA FORMA DELLE PROVE per gli 8 siti, che mancava ed e' il punto dove il task sarebbe scivolato:
    i siti 1 e 2 sono server component asincroni (la finta della catena non li monta) e
    `grep -rln "lavori_immagini" tests/` -> ZERO file. Senza una forma indicata, l'esecutore avrebbe
    declassato in silenzio i due che contano — il difetto che la pesatura 2+6 esiste per evitare.
    ➡️ PRECEDENTE IN CASA, stesso problema: tests/unit/ddc-lettori-gruppo-b.test.ts — legge il sorgente,
    CONTA gli innesti, CONTA i filtri, asserisce UGUAGLIANZA, un it per file; 3 degli 8 siti di T8 sono
    gia' nella sua lista. Non e' lista nera: lega ogni innesto al suo filtro (un nono sito rompe il conto).
    Per i due che contano, in piu': sonda in sola lettura sul modello P12 (valore che DEVE essere rifiutato
    + controllo positivo), INCOLLATA nel rapporto perche' scripts/tmp/ sparisce.
  ③ Il 409 e il suo messaggio sono di T8 e si provano ALLA ROTTA — non aspettano il bottone che D51 sposta
    fuori. E il contatore TabImmagini.tsx:571, che l'esecutore incontrera' al sito 2: riferire, NON correggere.
--- T8: ESEGUITO (98fa1e43), da esecutore FRESCO su modello LEGGERO (D54) — REVISIONE SEVERA DOVUTA ---
Contesto D54: 5 lanci dell'esecutore caduti con 529 Overloaded (sovraccarico server, albero intatto ogni
  volta); un esecutore leggero partiva al primo colpo -> Francesco ha scelto: esecutore fresco leggero
  SUBITO + revisione severa col modello potente appena disponibile. R-E1 salva (chi esegue non ha scritto
  il brief); il costo dichiarato e' il giudizio sulle prove vuote, che la revisione deve pesare a fondo.
CONSEGNATO: handler DELETE (soft su deleted_at, 3 .eq() sulla mutazione + .is(deleted_at,null) + .select()
  con conteggio 0->404 / >1->500 fail-closed, 409 su stato='consegnato', niente storage.remove, niente gate
  di ruolo) · D52-a guardia PATCH con .is('deleted_at', null) · D52-b errore mascherato con console.error
  (ricalca pazienti:227-228) · filtro sugli 8 siti, grafia P12 invariata.
PROVE: 28 sulla rotta + 16 sugli 8 siti (conteggio embed == conteggio filtri, forma ddc-lettori-gruppo-b,
  + not-!inner per file). R-P4: 6/28 con abbozzo inerte, abbozzo INCOLLATO (test file + referto).
VERIFICA DEL COORDINATORE (non solo fiducia nel rapporto): commit e file elencati OK · diff dell'handler
  letto per intero, forma conforme al brief · 44/44 verdi rieseguiti da me · MUTAZIONE A CAMPIONE mia:
  tolto il filtro dal sito 1 -> 1 rossa su 16, esattamente quella del sito, ripristinato pulito ·
  tsc 0 rieseguito · guardia documenti verde · baseline 294/0/916/48 nel referto.
DIFETTO VERO DEL BRIEF trovato dall'esecutore: il nome di rapporto PRESCRITTO dal brief
  (...-t8-report.md) cade in `.gitignore:77` (`*-report.*`) — il brief imponeva docs/ proprio per la
  durabilita' e poi dettava un nome che git avrebbe ignorato. Esecutore ha rinominato in -t8-referto.md.
  + 2 coordinate minori stantie (file a 81 righe non 82; 2 delle 3 righe citate di database.types.ts).
R-E2 riferiti, non toccati: TabImmagini.tsx:571 (contatore) · update() PATCH a 2 .eq() · `tipo` morta
  nell'allowlist PATCH.
FASE 7 dell'esecutore: tsc 0 · vitest 358 file verdi (nessun flake nel giro) · next build exit 0 (la
  route table mostra il DELETE) · guardia verde. Referto: docs/roadmap/2026-07-29-ondata-b-t8-referto.md.
➡️ PROSSIMO: revisione severa di T8 (D54, modello potente) — poi il task UI «Elimina foto» (D51).
--- T8: REVISIONE SEVERA FATTA (D54, modello potente) — APPROVATO ---
T8: COMPLETO (98fa1e43, esecuzione leggera D54 + revisione severa potente).
REVISIONE: 12 mutazioni vere oltre a quella del coordinatore, TUTTE uccise dalla prova giusta (tabella nel
  rapporto del revisore, M1-M12: filtri siti 2 e 6, i tre .eq(), le due guardie deleted_at, finestra
  invertita -> 15 rosse, conteggio 0->200, fail-closed >1, i due messaggi grezzi, storage.remove aggiunta
  -> 13 rosse). R-P4 RIPRODOTTA da zero: 6/28 identico al referto. FASE 7 rieseguita dal revisore:
  tsc 0 · vitest 3850 verdi (nessun flake nel giro) · next build con la rotta DELETE in tabella · guardia
  verde. Baseline 294/0/916/48 + immagini 3/0. Fuori-mandato rispettato, censimento indipendente: gli 8
  siti sono TUTTI i lettori, nessun nono. Le prove vuote attese dal modello leggero NON si sono
  materializzate.
2 IMPORTANT del revisore (difetti di PROVA DOCUMENTATA e di RIFERIMENTO, non di comportamento):
  ① la «prova vera» dei siti 1/2 nel referto non esercitava MAI il predicato deleted_at (surrogati su
    altre colonne; con 0 righe cancellate in banca un filtro inerte avrebbe dato lo stesso output).
    CHIUSA DAL REVISORE con la sonda inversa in sola lettura: .not('lavori_immagini.deleted_at','is',null)
    -> padri 60 · figli 0 (riferimento figli 2): il predicato viene valutato davvero. Codice giusto,
    prova documentata incompleta.
  ② RACE RESIDUA NEL PATCH, non riferita da nessuno e EREDITATA DAL BRIEF (che chiedeva solo il fix della
    guardia): dopo D52-a la guardia filtra deleted_at ma l'update() del PATCH no — fra i due viaggi un
    DELETE concorrente lascia il PATCH rispondere 200 su un fantasma. Impatto basso (solo
    descrizione/tipo/ordine; deleted_at non risuscitabile, fuori allowlist). -> AL TASK DEL BOTTONE.
5 MINOR a verbale: 409 provato solo come error.length>0 · TOCTOU sulla finestra anche nel DELETE (forma
  del piano) · conteggio-contro-conteggio per FILE non per QUERY (oggi teorico) · test !inner in forma
  lista-nera ma supplementare · guardia esistenza DELETE senza asserzione su .eq('id').
➡️ PROSSIMO: task UI «Elimina foto» (D51 — bottone + contatore + race del PATCH ereditata da ②).
--- TASK UI «Elimina foto» (D51): orientamento fatto, DUE fatti che cambiano il perimetro ---
① 🔧 D51 CORRETTA (lavoro CANCELLATO, scritto per primo come vuole §0A-bis n.2): il contatore
  TabImmagini.tsx:571 NON conta piu' le cancellate. immagini.length <- lavoro.immagini
  (LavoroFormClient.tsx:74) <- query del sito 2 (modifica/page.tsx:51), a cui T8 HA AGGIUNTO il filtro.
  Al caricamento e' ora strutturalmente giusto. Il brief prevedeva l'OPPOSTO («da quel momento e'
  provabilmente sbagliato»): previsione ROVESCIATA — il filtro al sito 2 e' cio' che l'ha aggiustato.
  Ne' esecutore ne' revisore l'hanno colto (il revisore l'ha registrato «intatto, riferito» senza
  verificare se fosse ANCORA sbagliato). ➡️ Il lavoro che resta e' un altro: dopo l'eliminazione dal
  browser la tessera deve USCIRE DALLO STATO LOCALE. Canale da specchiare: onAdd ->
  setImmagini((prev) => [...prev, img]) (LavoroFormClient.tsx:129) vuole il gemello in rimozione.
② ✅ /lavori/[id]/modifica NON ha nessuna guardia di stato (`grep consegnat|redirect|readOnly` su
  page.tsx, LavoroFormClient.tsx e la cartella: zero riscontri) -> e' raggiungibile e USABILE anche a
  lavoro CONSEGNATO. Quindi lo stato «fuori finestra» del 409 e' raggiungibile da un utente vero e il
  bottone disabilitato-con-spiegazione ha una casa. Precedente di forma: TastoPrimario +
  motivoDisabilitato (§7.4), gia' in casa nella scheda v3.
  🔴 RITROVAMENTO FUORI MANDATO (R-E2), da riferire: la finestra dichiarata dalla direttiva permanente
  di Francesco («ogni campo si corregge FINO ALLA CONSEGNA») oggi NON e' fatta rispettare dalla
  schermata di modifica — il nostro 409 sarebbe il PRIMO posto in cui quel confine morde davvero.
③ FotoStrip (scheda) resta FUORI per difetto: e' un componente DS dichiarato read-only (§5.33) e ha un
  secondo consumatore (ds-v3-catalogo:1166) — dargli l'eliminazione vuol dire emendare una spec
  ratificata e toccare il catalogo. D51 letta alla lettera mette il bottone dove si modifica.
④ Perimetro del task, cinque voci (perche' nessuna si perda): affordance in TabImmagini nelle DUE viste
  (griglia: la fascia bassa 44px e' GIA' il select categoria; lista: riga con nome file, nessuna fascia) ·
  coerenza dello stato locale · lo stato 409 fuori finestra · la conferma (da chiedere: e «annulla» NON
  e' gratis — deleted_at e' fuori dall'allowlist PATCH, non esiste rotta per resuscitare) · 🔴 LA RACE
  DEL PATCH ereditata da T8, che e' server-side e NON passa dal §0B: se il task si chiama «task UI»,
  e' la voce che si perde.
--- 🔴 T8 È CONDIZIONALE (D59, 29/07): il codice regge, DUE sue scelte sono in discussione ---
Francesco, davanti al primo mockup, ha contestato: «se la foto deve essere cancellata, va cancellata
  punto» e «deve poter essere cancellata fino alla fine, cosi come poter aggiungerne di altre fino alla
  fine». Sono ESATTAMENTE le due scelte che T8 ha implementato (soft su deleted_at; finestra 409 su
  stato='consegnato').
🛑 IL BUCO DI PROCESSO, ed e' il ritrovamento vero: nessuna delle due era di Francesco. Le ha chiuse il
  PANEL del 29/07 (panel-validazione.md, tabella «le quattro domande normative»), dove la domanda 3
  porta «📌 da ratificare da Francesco» e le domande 1-2 NON lo portano: sono passate come chiuse.
  E il piano le attribuiva a «D34/panel» (piano-v2:191 e :394) — D34 E' IL CODICE DEL PAZIENTE
  ARCHIVIATO, non le foto. Citazione sbagliata RIPETUTA DAL COORDINATORE nel brief di T8.
➡️ COSA RESTA VERO DI T8, comunque vada il panel: i tre .eq() sulla mutazione, il conteggio fail-closed,
  l'errore mascherato, la guardia deleted_at del PATCH, e il fatto che le 8 letture devono filtrare
  cio' che non va mostrato. ➡️ COSA DIVENTA CONDIZIONALE: la scrittura di deleted_at invece della
  cancellazione vera (+ il file in storage), la finestra del 409, e la frase della conferma.
  Se il panel dice «materiale di lavoro»: il filtro sugli 8 siti diventa codice morto e la finestra cade.
⚠️ Percio' il ledger NON dice piu' «T8 completo» senza aggettivo: dice COMPLETO E CONDIZIONALE.
--- D57-D59 registrate (quattordicesima tornata) ---
D57: la scheda non mostra piu' le foto come striscia 72px — ALBUM da riprogettare, con ricerca e panel
  PRIMA di ogni variante. Cancella le tre varianti A1/A2/A3 del mockup di oggi (domanda sbagliata).
  🔑 Il piano SAPEVA: l'ondata (c) «Le foto, per bene» (§1) prevede editor + «le stesse azioni sulla
  scheda» — disegnare una X sulla striscia avrebbe cementato una forma gia' destinata a cambiare.
D58: ogni proposta di UI va mostrata DENTRO la schermata vera e nei TRE formati, mai come frammento.
  Il mockup di oggi violava la regola (griglia estratta dal contesto). §0B chiedeva i 3 viewport, NON
  l'intera schermata: e' la riga da aggiungere.
D59: cancellazione VERA + finestra «fino alla fine» — registrata, ratificabile solo dopo panel normativo.
  La domanda centrale che nessuno ha ancora posto: UNA FOTO E' DOCUMENTAZIONE CONSERVATA O MATERIALE DI
  LAVORO? 🔑 E la prova piu' forte e' GIA' IN CASA, dalla lettura di T8: immagin|foto|storage_path nei tre
  template PDF = 0·0·0, e i 2 riscontri di generate-xml sono i percorsi DELLA FATTURA. Le foto non
  entrano OGGI in nessun documento conservato. Secondo asse per il panel: il lab e' RESPONSABILE, non
  titolare (base dell'Art. 28(10) sul nome del bottone) — le istruzioni di conservazione/cancellazione
  sono del TITOLARE, cioe' il dentista.
⚠️ AMBIGUITA' DA CHIARIRE CON FRANCESCO, e possibile conflitto costruito da me: «fino alla fine» letto
  contro la sua direttiva del 27/07 («fino a poi la consegna con l'eventuale fatturazione») significa
  probabilmente «fino alla fine della vita del lavoro», cioe' la consegna — e allora la finestra NON e'
  contestata affatto. Chiesto.
--- Due risposte di Francesco che RESTRINGONO il problema (stesso turno) ---
D59 EMENDATA: «fino alla fine» = «FINO ALLA CONSEGNA, COMPRESA» (scelta esplicita fra tre letture).
  ➡️ La finestra NON era contestata: il 409 su stato='consegnato' di T8 RESTA VALIDO. Di T8 resta
  condizionale UNA cosa sola: morbida contro vera. 🛑 Il conflitto sulla finestra l'avevo COSTRUITO io
  leggendo «fino alla fine» come «anche dopo»; la lettura piana, contro la direttiva del 27/07, era
  l'altra. Mandato del panel normativo RESTRETTO a lavoro in corso (messaggio inviato all'advisor).
D60 (perimetro, ed e' la sostanza): l'album entra ADESSO insieme all'eliminazione — la meta' «guardare
  le foto» dell'ondata (c) si sposta nella (b). DENTRO: album su entrambe le superfici, INGRANDIMENTO
  (oggi impossibile), categoria leggibile, eliminazione + conferma + stato fuori finestra.
  FUORI (resta alla (c)): ruota e ritaglia. Costo dichiarato: l'ondata si allarga in corsa e il gate
  estetico L2 dovra' coprire anche questa superficie.
PANEL LANCIATO (Francesco l'ha chiesto esplicitamente: «fai una ricerca... confrontati con advisor
  specializzati»): 3 advisor in parallelo — normativa (foto = documentazione conservata o materiale di
  lavoro? + cancellazione fisica ammissibile? + chi decide, dato lab=responsabile e dentista=titolare) ·
  esperienza d'uso (2-3 direzioni per l'album, con fonti e URL, e cosa preclude all'ondata (c)) ·
  dati/archiviazione (atomicita' DB+storage, irreversibilita', che succede al lavoro di T8, terza via).
  🔑 REGOLA DI FORMA imposta a tutti e tre, e nasce dal difetto del panel precedente: ogni riga
  etichettata FATTO NORMATIVO/FONTE/PROVATO (con fonte) oppure SCELTA DI PRODOTTO (con opzioni e costi).
  Nessuna riga senza etichetta. E' l'istruzione che avrebbe intercettato il difetto trovato oggi.
🔴 BLOCCO su D58 (catture dell'app vera): NESSUNA delle due credenziali di test documentate funziona.
  `h4t@live.it` con .env.local TEST_PASSWORD (12 caratteri, chiave presente) -> auth 400 «Email o password
  non corretti». `e2e-tecnico@ua-test.local` / `TestE2E!2026` (MEMORY §1) -> stesso 400.
  ➡️ MEMORY §1 «Credenziali test» e' STANTIA su entrambe le righe. Serve un intervento di Francesco
  (aggiornare .env.local, o resettare la password dell'utente di test, o autorizzare la creazione di un
  utente di prova). Il dev server gira su :3000 e la pagina di login e' sana (selettori verificati col
  browser: input[type=email], input[type=password], button[type=submit]).
  Script pronto e in attesa: scripts/tmp/scatti-foto-stato-attuale.mjs (lavoro 2026/0002, stato
  `ricevuto`, 1 foto; scheda + modifica, fullPage, 390/768/1280 x light/dark, deviceScaleFactor 2).
  ⚠️ Il lavoro con piu' foto in banca dati ne ha UNA SOLA (3 lavori con 1 foto ciascuno): le catture
  mostreranno il contesto, non il problema dell'album affollato. Da dichiarare quando arrivano.
--- ✅ D58 SODDISFATTA: catture dell'app VERA (6 file) + il login era un difetto MIO ---
🔑 IL LOGIN: le credenziali di .env.local (TEST_EMAIL + TEST_PASSWORD) FUNZIONANO — provato chiamando
  direttamente /auth/v1/token: 200, access_token presente, email h4t@live.it. Il mio script sbagliava:
  `page.fill` su un form React PRIMA dell'idratazione scrive nel DOM ma NON nello stato del componente
  -> si invia una password vuota e il servizio risponde 400 «credenziali non corrette», che SEMBRA una
  password sbagliata. ➡️ Corretto con waitForSelector su submit non-disabled + pressSequentially.
  ⚠️ Avevo dichiarato «MEMORY §1 e' stantia»: FALSO, la riga era giusta. Ritratto.
  🔑 La lezione e' scritta nel commento dello script: un 400 di auth dopo un fill non prova nulla sulle
  credenziali finche' non si e' provato il fill stesso.
CATTURE: docs/design/screenshots/2026-07-29-foto-stato-attuale/ — scheda + modifica, lavoro 2026/0002,
  fullPage, 390/768/1280 x light/dark, deviceScaleFactor 2.
🔴 CIO' CHE SOLO L'APP VERA MOSTRA (nessun mockup di frammenti lo avrebbe rivelato):
  ① sulla SCHEDA la foto e' un QUADRATO NERO 72px SENZA NOME, appeso fra la carta delle note e il tasto
    CONSEGNA: tutte le altre carte hanno un'intestazione, la striscia foto no. Non si capisce nemmeno
    che sia una foto.
  ② nella MODIFICA la fascia scura con «Impronta» e' INVISIBILE perche' la foto e' nera: testo bianco su
    nero, la fascia non si distingue dall'immagine.
  ③ sotto la griglia c'e' una tessera bianca con 📦 che sembra parte dell'album: NON e' un difetto delle
    foto, e' il pulsante «Pacchetto Documenti MDR» (LavoroFormClient.tsx:395-417) — ma nel contesto reale
    e' appiccicato sotto le foto, e questo si vede solo guardando la pagina intera.
--- ✅ PANEL DI TRE CHIUSO, e D61-D63 ratificate (quindicesima tornata) ---
D61: la foto e' MATERIALE DI LAVORO -> la cancellazione FISICA e' legittima. La norma non classifica la
  foto: All. XIII p.2 e' clausola APERTA, p.3 dice che e' il processo documentato del fabbricante a
  stabilire cosa sia documentazione, e i 10/15 anni di p.4 gravano sulla DICHIARAZIONE. Stato di fatto
  misurato dal panel (e corregge il mio 0·0·0): 0 riscontri in NOVE template su dieci, e i 2 del decimo
  (DdcTemplate:496,498) sono firma_ddc_storage_path = la FIRMA del lab. GDPR 5(1)(c)/(e) + Garante
  7/3/2019 spingono nella direzione della cancellazione. 🛑 Cade la giustificazione del panel del 29/07
  («il QMS potrebbe designarla»): scelta di prodotto travestita da conclusione di legge.
  Scartata «dipende dalla categoria»: non costruibile oggi (categoria in `descrizione` testo libero con
  default indovinato, colonna `tipo` morta).
D62: il DPA va corretto — via i 10 anni sulle foto, e NON ci sono copie firmate su carta (confermato da
  Francesco). 🔴 Il vero ostacolo non era la legge ma un impegno CONTRATTUALE nostro (DpaTemplate:149,
  169,197). Rimediabile a costo quasi nullo: il DPA si RIGENERA a ogni scarico, zero righe persistite.
  Nello stesso passaggio si correggono due errori che arrivano al cliente: cita Art. 10(8) (norma dei NON
  su misura) e dice «10 anni» piatto dove gli impiantabili sono 15.
D63: rete = CONFERMA + TRACCIA (chi, quando, quale lavoro, quale storage_path — mai l'immagine).
  Art. 28(3)(h) «demonstrate compliance»; oggi lavori_immagini non ha alcun audit. Forme in casa:
  lab_stato_log, fatture_sdi_eventi, cassette_backfill_audit. Scartato il cestino a tempo: per quei
  giorni la foto NON e' cancellata, e il meccanismo di pulizia non esiste piu' (pg_net rimosso, nessun
  cron in vercel.json). ⚠️ «Punto» non e' letterale: PITR 7 giorni dichiarato in spec + coda cache
  fino a ~60s (Smart CDN) o 1h (cacheControl '3600', default mai scelto).
➡️ T8 NON E' PIU' CONDIZIONALE: D61 ratifica la cancellazione fisica, quindi T8 va EMENDATO nella sua
  unica riga di sostanza (.update({deleted_at}) -> .delete() + rimozione del file), non rifatto.
  Il parere dati dice: 8 filtri restano (RLS + indice parziale + 4 migrazioni hard-delete lab li usano),
  ordine file-prima-riga-dopo, conteggio esatto-uno anche su storage.remove, 28 test da rivedere in parte.
🔧 GUARDIA ESTESA: NUMERI_A_PAROLE si fermava a «sessanta» e il verbale e' arrivato a SESSANTATRE — terza
  volta che quella tabella finisce prima del documento (dopo «quaranta» e «trentatre»). Estesa a CENTO.
  PROVATA rompendo il conteggio a «sessantadue»: la guardia si accende e legge 63 reali.
--- ✅ FORMA E PERIMETRO CHIUSI (D64-D66, sedicesima tornata) — dopo il confronto in contesto vero ---
D64: la forma NON e' «A» pura, ed e' giusto scriverlo: e' la CARTA di A (carta con titolo «Foto», foto
  grande ~4,7x, striscia sotto, categoria + «1 di 4») PIU' il VISORE di B come secondo livello, che si
  apre al tocco sulla foto principale. 🔑 Ed e' la combinazione che scioglie il contro di A («si
  disegnera' due volte»): col visore la superficie per l'editor esiste gia'.
  Conseguenze per la spec: componente NUOVO (in casa non esiste nulla di riusabile) · deve entrare in
  storia-overlay.ts + useNavigaDaOverlay, e la sua guardia E' MANUALE · chiede un VELO piu' coprente nei
  token (materia.scrim rgba(29,25,19,.35) e' troppo trasparente per una foto) · vale identico su scheda e
  modifica (D56) · l'emendamento a DS v3 §5.33 diventa piu' largo.
D65: la categoria si CHIEDE allo scatto (oggi indovinata: TabImmagini.tsx:198 mette 'impronta' per la
  fotocamera e 'altro' per la galleria). Deroga consapevole al «percorso minimo a 3 tocchi» (§7.3).
  Da progettare: domanda DOPO lo scatto, e per lo scatto multiplo UNA volta per gruppo, non per foto.
D66: l'EDITOR (ruota/ritaglia) NON entra ora — il visore nasce PREDISPOSTO, l'editor e' il lavoro subito
  successivo. Ragione tecnica: non esiste modo di sostituire i byte (allowlist PATCH = descrizione, tipo,
  ordine); ritagliare = nuova foto + cancellazione dell'originale, e con D61+D63 quella cancellazione e'
  VERA -> ritaglio storto = definitivo. Piu' la ricompressione che si accumula (webp q.85, max 1920).
  L'editor non distruttivo e' la forma giusta e merita panel proprio.
➡️ PROSSIMO PASSO: la spec di design della superficie (album + visore + eliminazione), poi il piano.
   ⚠️ Da portare nella spec, oltre alle decisioni: l'ORDINE delle foto non esiste (ordine 0 fisso, nessuna
   query ordina) -> «la prima foto» non ha referente: va sistemato o l'album mette in cima una foto a caso.
   E il TTL delle URL firmate e' 1h contro i 5 minuti del portale: su un visore a schermo pieno e' un
   link al portatore che gira per un'ora.

────────────────────────────────────────────────────────────────────────
PIANO DELL'ALBUM — docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md
ramo ondata-b-schermate · ripreso in modalità subagent-driven il 01/08/2026
(le righe sotto ricostruiscono lo stato dai commit e dai referti: questo ledger
si era fermato prima che il piano dell'album esistesse)

Task 6 (CartaAlbum §5.38): complete (commit 3b27c576, referto in docs/roadmap)
Task 7 (VisoreFoto §5.39): complete (commit f00436bd, docs/roadmap/2026-07-31-t7-referto.md)
Task 8 (TendinaMenu §5.40): complete (commits f7a9a72e..095ea820, docs/roadmap/2026-08-01-t8-referto.md)
  Difetto trovato DOPO il primo commit da revisione: «riduci movimento» spegneva anche la
  dissolvenza (forma intera copiata dal vicino). Corretto in 095ea820.
Task 9 (FoglioCategoria §5.41): complete (commits 4fd96cee..d0659c60, docs/roadmap/2026-08-01-t9-referto.md)
  Correzioni da revisione in d0659c60: velo che spegneva la dissolvenza · contatore «{n} foto»
  annidato nelle anteprime · handoff che prescriveva un import di movimento fra componenti pari.

Task 9-bis (FoglioConferma §5.42): IN CORSO — base d0659c60
  ⚠️ PRE-FLIGHT: il testo del task contraddice il proprio riquadro «MANDATO CORRETTO» in TRE punti.
     Regola di precedenza dichiarata nel piano stesso: riquadro > corpo, e sopra tutti la spec §5.42.
     ① scorrimento: il corpo dice «NON blocca» e chiede la prova+mutazione di quel comportamento;
        riquadro e §5.42 dicono `bloccaScorrimento()`. → si blocca; la prova è la ricetta §1.4 e la
        mutazione si INVERTE (togli il blocco → atteso rosso).
     ② z-index: il corpo dice «intervallo 302-999», riquadro e §5.42 dicono 1030. → 1030.
     ③ firma: «Interfacce → Produce» non ha `ancoraFocus`, né l'anteprima, né l'etichetta sicura —
        tutte e tre richieste dal riquadro (punti 3 e 5) e da §5.42. → firma estesa.
  È lo STESSO difetto di forma trovato in T8 e T9: tre task su tre.
  IMPLEMENTER: commit 3bbbfd18 (DONE, 37 prove). REVISIONE 1: conformità ❌ + qualità DA CORREGGERE
    — 4 Importanti, 5 Minori, verificati dal revisore con 17 mutazioni proprie.
    I due rilievi giudicati FUORI MANDATO da me (si riferiscono, non si correggono):
      · l'`exit` delle varianti non gira mai: nessuno dei quattro strati nuovi monta `AnimatePresence`
        — condiviso con VisoreFoto (T7) e FoglioCategoria (T9), già in casa;
      · l'effect del focus dipende dall'IDENTITÀ di `ancoraFocus`: un chiamante che passasse un
        letterale inline si farebbe rubare il focus a ogni rerender — condiviso con FoglioCategoria.
  FIX: commit c3929e01 (nove rilievi chiusi). ⚠️ Il conteggio R-P4 rifatto con un abbozzo DAVVERO
    inerte dà **3 su 47**, non «4 su 37»: il numero del rapporto originale era gonfiato perché
    l'abbozzo conteneva già la `variantePannello` vera. RE-REVISIONE IN CORSO.
Task 9-bis: complete (commits 3bbbfd18..e013b961, 3 commit, 2 giri di revisione)
  Verdetti finali: conformità ✅ · qualità APPROVATO. 50 prove. R-P4: 3 su 47 (abbozzo davvero inerte).
  Il revisore ha verificato le correzioni con mutazioni PROPRIE (19 nel primo giro, 6 nel secondo),
  non credendo al rapporto: due sottostime trovate (una mutazione accendeva 2 prove invece di 1).
  MINORI a verbale per la REVISIONE FINALE DI RAMO (cinque):
   m1 il commento «GARANTITO E PROVATO» cita solo metà delle prove che lo reggono (una riga)
   m2 il CABLAGGIO dello swipe resta scoperto: togliendo drag="y"/dragControls/l'innesco del manico
      nessuna prova si accende — in un browser il gesto sarebbe morto e la suite verde
   m3 collaudo a browser dovuto: il focus che il browser sposta sul body quando il tasto distruttivo
      si disabilita mentre lo tiene (jsdom non lo riproduce)
   m4 il brief di T12 deve portarsi il testo ratificato §5.42 VERBATIM e il <strong> su «e dall'archivio»
   m5 screenshot 390/768/1280 × chiaro/scuro mancanti, e con essi il contrasto di «Annulla» in scuro
  RIFERITI, NON CORRETTI (fuori mandato):
   · l'`exit` delle varianti non gira: nessuno dei QUATTRO strati monta AnimatePresence (verificato dal
     revisore: AnimatePresence esiste solo in Sheet, DialogConferma, RigaFase, Avviso) — si decide
     INSIEME al gate estetico L2 (T13), non per un componente solo
   · l'effect del focus dipende dall'IDENTITÀ di `ancoraFocus` (condiviso con FoglioCategoria.tsx:183)
   · TastoPrimario avvisa in sviluppo se `disabled` arriva senza `motivoDisabilitato`, ma §5.42 ha
     un'anatomia CHIUSA che non prevede una dida: conflitto scritto sul posto, TastoPrimario non toccato
   · in tema scuro TastoSecondario e il pannello userebbero entrambi var(--elv): contrasto da guardare
  + referto e memoria: commit 8792de27 (docs/roadmap/2026-08-01-t9-bis-referto.md). BLOCCO C CHIUSO.

Task 10 (la carta album sulla scheda): complete (commits fbda7ff2..bef087ed, 1 giro di revisione)
  Conformità ✅ · qualità APPROVATO. I siti erano CINQUE, non i tre del piano (il 4° l'ho trovato io
  nel pre-flight: la voce dell'indice del catalogo; il 5° l'esecutore: catalogo.test.tsx:128).
  RILIEVO IMPORTANTE CHIUSO: distruggendo il passaggio di categoria/created_at restavano 11 prove su 11
  verdi (etichettaCategoria ripiega sul valore grezzo invece di fallire) → due guardie indipendenti.
  Prove: 370 file | 4191 (CALA di 1: -3 il test della striscia eliminato, +1 objectFit, +1 innesto).
  MINORI per la revisione finale di ramo: il rapporto sovrastima una propria riserva («entrambi i bottoni
  vibrano»: falso) · contraddizione di numerazione nel piano (:54, :148) · la correzione del tempo verbale
  nella spec di design va oltre il marcatore richiesto dalla guardia · QA visiva non fatta (strumento di
  screenshot guasto) · UNDICI file .superpowers/ ancora tracciati in git contro il .gitignore.
  ⚠️ STATO INTERMEDIO: due bottoni veri che non aprono niente su /lavori/[id] fino a T12.

Task 11 (TabImmagini) + Task 11-bis: complete (commits 5507ea18..d57ed0f3, 1 giro di revisione)
  Conformità ✅ · qualità APPROVATO (zero Importanti). R-P4: 15 su 16, RIPRODOTTO dal revisore.
  🔴 LA REVISIONE HA TROVATO DUE CHIAMANTI ROTTI CHE NESSUNO AVEVA CERCATO (grep su tutto il repo):
     crea-lavoro.ts:393 e FrameFatto.tsx:170 mandavano ancora `descrizione` → il caricamento dal WIZARD
     era rotto. Da lì T11-bis (commit d57ed0f3). 'prescrizione' non era nemmeno una delle sei categorie.
  🔑 L'esecutore ha trovato un difetto NEL PROPRIO LAVORO: la prova sull'àncora del focus passava per la
     ragione sbagliata (resize senza cambiare innerWidth → React bailout). Verificato dal revisore mettendo
     il difetto sotto la PRIMA versione del test: 16 su 16 verdi.
  MINORI per la revisione finale di ramo: tre comportamenti non sorvegliati (foglio che non si chiude · PDF
    fra le anteprime · rilascio dell'anteprima temporanea) · in vista elenco sparisce il selettore di
    categoria (delta di comportamento non dichiarato) · lo stub di prova ricopia i sei valori a mano ·
    innerWidth forzata e mai ripristinata · la spia del punto unico è testuale e limitata a un file.
  DA DECIDERE (Francesco): il dettaglio «era la prescrizione» non è più registrato da nessuna parte.
  ⚠️ RESTANO T12 e T13. T13 porta: caricamento reale, text-zoom 200%, guardia-navigazione-overlay,
     screenshot 390/768/1280 × chiaro/scuro, gate estetico L2, e la decisione sull'AnimatePresence.

────────────────────────────────────────────────────────────────────────
01/08/2026 sera — D91: LA PRESCRIZIONE DIVENTA LA SETTIMA CATEGORIA (decisione di Francesco).
  🛑 NON eseguita: il lavoro si apre nella sessione nuova, brief già scritto col censimento:
     docs/roadmap/2026-08-02-prescrizione-settima-categoria-brief.md
  ⚠️ Quattro cose da decidere con Francesco PRIMA del codice (nome · posto nell'ordine D71 · emoji ·
     la griglia che diventa dispari → mockup §0B).
  ⚠️ T11-bis aveva instradato la prescrizione su 'altro' DUE ORE PRIMA della decisione, come ripiego
     dichiarato: quel codice è ciò che il prossimo lavoro sostituisce, non una scelta da rispettare.
  ➡️ Dopo la prescrizione: T12 (l'eliminazione dal visore) e T13 (la chiusura) del piano dell'album.
