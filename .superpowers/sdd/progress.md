# Ondata B — sessione ③ (wizard + scheda) · registro di avanzamento

Piano: `docs/superpowers/plans/2026-08-04-ondata-b-sessione-3-wizard-scheda.md`
Censimento allegato: `docs/superpowers/plans/2026-08-04-ondata-b-sessione-3-censimento-r-p6.md`
Decisione 0B (vincoli §3): `docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md`
Ramo: `ondata-b-sessione-3` · base: `cabfd3f0` (il commit del piano, su main)

🛑 Ledger della ② archiviato in `archivio-ondate-precedenti/2026-08-04-ondata-b-sessione-2/`
PRIMA di cominciare (lezione P31: brief di un piano diverso ingannano gli esecutori).
🛑 Worktree VIETATI (regola repo): tutto sul ramo nel repo principale.
⚠️ Il gettone updated_at è una STRINGA OPACA end-to-end (sonda S5, primo giro rosso).
⚠️ Migration (Task 5): FASE 6b obbligatoria; db push può richiedere il controllore.

## Stato

- Task 0 (branch `ondata-b-sessione-3` + ledger): ✅ fatta dal controllore (FASE 5).
- Task 1 (wizard manda trascrizione + sgancio) — ✅ COMPLETO (commit aa69e9c3..e8626269; review:
  Spec ✅, Approved). Important ADJUDICATO dal controllore: conteggio R-P4 nel report scritto
  invertito («9 su 12 accese» → corretto in 3 su 12, le rosse vere) — difetto del referto, non
  del codice; corretto in-place nel report. Osservazione R-E2 dell'esecutore (per T2/futuro
  numero_prescrizione): il client tratta «solo spazi» come vuoto (non manda), il server
  preserverebbe — entrambe coerenti con le proprie spec, ramo server oggi mai esercitato.

## Rilievi MINORI raccolti (per la revisione finale di ramo)

- **M3-T1-1** tests/unit/crea-lavoro-prescrizione.test.ts:404 — helper crea() ridichiara inline
  l'unione coloreOrigine invece di importare il tipo esportato ColoreOrigine.
- Task 2 (Passo 3 UI: framing D223 B + sgancio + sganciata + rimozione PillVoce) — ✅ COMPLETO
  (commit e8626269..9e1d7fcd: impl 0e3c9e74 + docs 2769dca7 (controllore: §4 decisione 0B,
  «valori dimostrativi ≠ testi vincolanti») + fix ac4d1f88 + fix 9e1d7fcd; re-review: Spec ✅,
  Approved). Important risolto: i commenti citavano il brief per una risoluzione che stava nel
  DISPATCH — ora citano la §4 registrata. Nota re-review: puntatore ~188 leggermente lasco ma
  reale (non riaperto).
- ⚖️ ADJUDICAZIONE DEL CONTROLLORE sull'ordine di esecuzione: il T3 da solo lascerebbe un CTA
  primario «Allega la prescrizione» senza azione fino a T9 (e T9 dipende dalla route di T4).
  Ordine nuovo: T4 → T5 → T3+T9 COMBINATI (un esecutore) → T6 → T7 → T8 → T10 → T11.
  Il perimetro dei compiti non cambia, solo l'ordine e l'accorpamento T3+T9.

## Rilievi MINORI raccolti (segue)

- **M3-T2-1** (re-review) il pattern `_Contratto` di PassoPaziente.test.tsx non cross-checka
  strutturalmente le prop reali (constatazione empirica del revisore: mismatch deliberato passa);
  morde solo se StatoWizard perde un campo. Debolezza PREESISTENTE del pattern, tutta la famiglia.
- **M3-T2-2** aiuto ricco (grassetto) senza aria-describedby (pattern preesistente FoglioConferma).
- **M3-T2-3** (prodotto) «Salta» sulla riga colore non riporta coloreOrigine a 'prescrizione':
  dopo sgancio+Salta la riga riapre come «lo scegliamo noi» da vuota — da decidere con Francesco
  o al gate L2.
- Task 4 (route dei gesti: fonte · typo · divergenza + costanti) — ✅ COMPLETO (commit
  9e1d7fcd..25728c29: impl 7cc5a5a0 + fix spia 9683eeed + fix review 25728c29; review opus:
  Approved, spec completa, tenant isolation verificata; re-review: Approved). Important
  ADJUDICATO: la route typo CHIUDE il campo 'tipo' (conferma_consegna lo sovrascriverebbe —
  classe «Salvato su un dato che non c'è»); dizionario RPC intatto (②), riapertura nella ④;
  divergenza su 'tipo' resta lecita (sopravvive alla conferma). Minor accolto: l'immagine-fonte
  deve essere DEL lavoro del path (422 dedicato). Due decisioni oltre-brief APPROVATE dal
  revisore: gettone obbligatorio sul typo · rifiuto stati «presente ma vuoto».
  ⚠️ NOTE AVANTI (T6/T7/T9): le route nuove rispondono {errore, esito?} NON {error} — 
  useLavoroForm.ts legge .error e prenderebbe undefined; ramificare su `esito`. Il gettone
  atteso_updated_at è OBBLIGATORIO sul typo (il GET della scheda fa select('*'): c'è già).
  T6: src/types/domain.ts tiene una QUARTA copia a mano di fonte_tipo → farla diventare FonteTipo.
  T5: spostare MIGRATION_RPC della spia alla migration nuova + estrazione del p_campo NOT IN nuovo
  (posto già marcato, trappola del puntatore chiusa e provata).

## Rilievi MINORI raccolti (segue T4)

- **M3-T4-1** id di path non validato UUID → 22P02 diventa 500 con messaggio Postgres grezzo
  (coerente col preesistente denti/route.ts; incoerente però con la validazione sintattica di
  fonte_immagine_id nello stesso file).
- **M3-T4-2** una fonte si può sostituire ma mai AZZERARE via route ({} = 422, mandato da S2) —
  conseguenza da dire alla UI (T9) e semmai da portare a Francesco.
- **M3-T4-3** asimmetria di rigore: ramo conflitto inoltra esito.updated_at senza il presence-check
  del ramo ok (nessun percorso di fallimento reale).
- **M3-T4-4** (re-review) prescrizione-costanti.ts descrive 'tipo' come correggibile senza dire
  che la route typo lo esclude — una riga di rimando aiuterebbe il prossimo che apre una seconda
  porta sulla RPC.
- Task 5 (migration: dizionario divergenza in RPC + clone P37) — ✅ COMPLETO (commit
  25728c29..eed7ef80 + docs controllore 010b/…: impl 7715028f + c95b92b5 + fix eed7ef80;
  review opus: fedeltà BYTE-PER-BYTE dei corpi verificata contro il vigente, collaudo R-P1 6/6
  sul vivo, FASE 6b piena, RLS invariate; re-review: Approved). Migration 20260804211256
  APPLICATA AL DB VIVO. Adjudicazioni: NULLIF sul clone correttamente RIMANDATO a monte
  (P37/riga 12 — la stringa vuota di TabDati:283 è il male a monte, 0 su 295 oggi);
  spia a DUE puntatori (migliore dell'istruzione del marker). Lezione ricorrente pagata TRE
  volte nel fix: un numero di riga è un riferimento che si rompe da solo — maniglia giusta =
  il testo (ora scritta nella nota del censimento).

## Rilievi MINORI raccolti (segue T5)

- **M3-T5-1** clone senza NULLIF: richiedente_nome='' (scrivibile da TabDati:283) ora si
  eredita nel rifacimento — DdC stamperebbe prescrittore vuoto col precheck che passa; 0
  occorrenze oggi; rimedio A MONTE (P37/riga 12), non nella RPC. PER L'HANDOFF.
- **M3-T5-2** spia: un puntatore stantio fallisce VERDE se la migration vecchia contiene ancora
  la funzione (limite di disegno documentato nel file) — riga per l'handoff.
- **M3-T5-3** lavori_rifacimenti.rilevato_in/.motivo: dizionari chiusi in DB senza casa TS
  (stessa classe chiusa per la prescrizione) — riga 12.
- **M3-T5-4** la tabella dei rimandi del censimento resta dichiaratamente non esaustiva
  (~7 citazioni corte residue) — coperta dalla regola del testo, avvertenza aggiunta.
- Task 3+9 COMBINATI (Fatto a due carte + CTA che cambia mestiere + foglio a2) — ✅ COMPLETO
  (commit e483b3d4..3dd7dd1e: 6aae91a9 foglio + e2e2ced3 Fatto + c28162cf prova di confine +
  fix 3dd7dd1e; review opus: testi a2 verbatim confermati, contratto {errore,esito} rispettato;
  re-review: Approved, i 3 Important chiusi alla radice). ERRORE DEL PIANO trovato dall'esecutore
  e confermato dal revisore: colore sganciato+fuori catalogo NON compare (non salvato da nessuna
  parte). EMENDAMENTO T1 adjudicato e fixato: trascriviPrescrizione = denti>0 OR coloreTrascritto
  — senza, un lavoro coi soli elementi non creava NESSUNO snapshot (contenuto.elementi mai
  atterrato); percorso prescrizione:{} verificato su 4 salti fino ai CHECK. Risoluzione
  controllore sulla voce ③ dell'a2 (pastiglie email/piattaforma + riferimento facoltativo):
  DA MOSTRARE A FRANCESCO al gate L2. WATCH 9b: gap 44 aggiunge ~32px — «Torna alla home»
  sopra la piega a 390 da confermare allo scatto.

## Rilievi MINORI raccolti (segue T3+T9)

- **M3-T39-1** drift non argomentato dentro la duplicazione dichiarata di MenuVoce (gap 1 vs 2,
  sub 13 vs 13.5, chevron 19 vs 20, chevron tenuto da disabled) + 13/19 fuori scala §4.1.
- **M3-T39-2** pastiglia ambra in DUE implementazioni (stilePastigliaAmbraSola in FrameFatto vs
  RigaDato.pastiglia in CardInfo) — da piegare nella ratifica §5.10 del T7.
- **M3-T39-3** caricandoFoto disabilita il CTA ma non il quieto gemello (innocuo, incoerente).
- **M3-T39-4** nessun feedback di avanzamento durante l'upload nel foglio (20MB su rete mobile
  = secondi muti).
- **M3-T39-5 (R-E2)** il percorso impronta preesistente in FrameFatto:299-311 ha lo stesso
  ciclo chiuso «Riprova» (fuori mandato del fix).
- **M3-T39-6 (R-E2)** la frase «20MB» del 413 presuppone che il limite piattaforma Vercel non
  sia più basso — non verificato sul deployment vivo.
- **M3-T39-7 (R-E2)** avviso M2 «Non sono riuscita a salvare il colore» contraddice la carta
  quando la trascrizione c'è comunque — testo ratificato altrove, da riaprire con Francesco.
- **M3-T39-8 (R-E2)** MenuVoce §5.34 non sa fare una riga secondaria quieta (la sua è rossa) —
  gap del DS da censire.
- Task 6 (lettura per la scheda: embed + mapper + tipi) — ✅ COMPLETO (commit 3dd7dd1e..2d3d54f7:
  impl d3c00faa + fix guardie 2d3d54f7; review: Approved; re-review: Approved, guardie verificate
  riga per riga contro la RPC vera). Important chiuso: niente cast ciechi — ValoreDizionario<T>
  (fuori-dizionario = membro vero dell'unione, assertNever-abile in UI) · voce senza utente_id
  sopravvive con null (auto-scoperta dell'esecutore: scartarla avrebbe riprodotto la classe del
  difetto) · solo registrata_at mancante scarta. 🔑 RITROVAMENTO CHIAVE (R-E2): la PAGINA scheda
  (src/app/(app)/lavori/[id]/page.tsx) fa query diretta e NON passa dalla GET — il T7 innesta
  l'embed + normalizzaPrescrizione (src/lib/domain/prescrizione-mapper.ts, costruito apposta)
  in page.tsx, pattern «ddc». Conteggio R-P4 del fix corretto dal controllore su misura del
  revisore (14/32, non 13/31) — seconda volta nella sessione: il numero R-P4 va MISURATO due volte.
- Task 7 (scheda: riga Colore + stati + gesto D212 + emendamenti spec) — ✅ COMPLETO (chiuso con 2f013a6d)
  [storia: era 🔄 IN FIX del Critical]
  (impl 550c47c2 + spec 244b2d56 + prove 93b19d5e; review opus: Needs fixes). ADJUDICAZIONI:
  ① via typo scrive ENTRAMBI (trascrizione + colore vivo) — APPROVATA (lo scostamento muto è
  peggio; cucitura typo già fail-loud con stato «scostato»); ② colore per-dente → riga visibile
  ma NON modificabile — APPROVATA. CRITICAL in fix: il registro divergenze (append-only,
  DdC-destinato) poteva ricevere voci FALSE — (A) fuori catalogo appeso prima del check,
  (B) da stato già-divergente la typo lasciava la divergenza orfana. Fix adjudicato: catalogo
  PRIMA della via · PATCH prima dell'append (nota mancante si riprova, nota falsa resta) ·
  da stato (c) dritti al «Perché cambia?» (testi ratificati). Caso d'angolo «trascrizione
  sbagliata su lavoro divergente» → R-E2 per la ④/Francesco.

## Rilievi MINORI raccolti (segue T7)

- **M3-T7-1** hardware back al passo 'motivo' chiude tutto il foglio mentre «Torna indietro»
  torna al gesto — incoerenza dichiarabile (una riga di commento o fix futuro).
- **M3-T7-2** fixture denti castate oltre il tipo reale (as unknown as) — un drift della forma
  dell'embed non romperebbe quei test.
- **M3-T7-3** coloreDaUnaRiga manca il raffinamento isScala del predicato che dichiara di
  specchiare (irraggiungibile oggi per FK; il commento afferma identità falsa).
- **M3-T7-4** Via e PastigliaMotivo duplicano primitive del DS in un file feature (stessa
  griglia di FoglioCategoria) — drift futuro.
- **M3-T7-5** §5.10 ora si contraddice (max 5 righe vs 6 della card approvata) — APERTO nella
  spec, ogni render dev della scheda logga il warning finché Francesco non decide (gate L2).
- **M3-T7-6 (R-E2)** la PATCH azzera in silenzio un colore fuori catalogo (scartato non esce
  dalla rotta) — rete lato client messa; il difetto rotta è fuori mandato.
- Task 7 — CHIUSURA: commit 2d3d54f7..2f013a6d (550c47c2 codice · 244b2d56 spec · 93b19d5e prove ·
  88353a3b fix Critical · 2f013a6d quarta guardia). Re-review: Critical chiuso ALLA RADICE (append
  strutturalmente a valle di una PATCH confermata; D212 mai da stato divergente; caccia al quarto
  percorso: nessuno). Quarta guardia (valore invariato ≠ evento) con prova di mutazione: 1 rossa
  su 29, solo quella. R-E2 NUOVI per handoff: ① «trascrizione sbagliata su lavoro già divergente»
  = questione normativa per la ④/Francesco · ② la finestra fra le due scritture non è atomica dal
  client — chiuderla = una RPC sola in transazione (decisione di dominio, candidata ④/riga 12) ·
  ③ specchio client del catalogo vs colori_dentali: PATCH 200 su coppia azzerata in silenzio
  (scartato non esce dalla rotta) — rete client attiva, difetto rotta fuori mandato.
- Task 8 (cancellazione immagini: pre-check prima della distruzione + fail-closed) — ✅ COMPLETO
  (commit 2f013a6d..28a7891b: impl e632db29 + fail-closed 28a7891b ordinato dal controllore;
  review: Approved — ordine provato da spia call-time, 23503 mappabile a UNA sola FK, messaggio
  clone-aware provato su RPC+REVOKE, {error} della route vecchia rispettato). Important = testo
  stantio nel report (corretto in-place con nota del controllore). Minori: conteggi del report
  discordanti (88/88 vero, non 97/97) — TERZA volta nella sessione che un numero di referto non
  regge alla misura: i numeri dei referti si verificano sempre.
- Task 10 (mini-foglio «Chi ha prescritto?», P37/D211) — 🔄 IN FIX (impl 2a9cbcdd; review opus:
  Needs fixes). CRITICAL in fix: studio-members ESCLUDE il cliente toccato (.neq) e il foglio lo
  consumava tale e quale → il medico appena toccato non era MAI offerto; unica via visibile =
  duplicarlo in anagrafica. Passato ai test perché la fixture restituiva una risposta impossibile
  per la rotta vera (lezione: le fixture si specchiano sulla ROTTA, non sulla forma). Fix: nome
  nella select + toccato ANTEPOSTO dal client + conteggio vero + istituzione quando nota +
  aggancio dark ratificato (L2 22/07) + «Torna all'elenco».

## Rilievi MINORI raccolti (segue T10)

- **M3-T10-1 (R-E2, per handoff/Francesco)** «proposta dell'ultimo prescrittore» di D211 NON
  implementata: serve una via server (candidata: estendere studio-members con l'ultimo
  richiedente_nome per cliente). Righe pari + toccato anteposto nel frattempo. DEGRADAZIONE
  dal mockup ratificato: da dire a Francesco al gate L2.
- **M3-T10-2 (R-E2)** il back del telefono sul foglio AVANZA il wizard (popstate → onChiudi →
  commit+avanti): contro la direttiva «back = pagina precedente»; distinguere popstate da
  «Chiudi» richiede Sheet.tsx (fuori mandato). Candidata alla riga igiene/gate L2.
- **M3-T10-3** nessun riscontro visivo durante la GET di studio-members (tile inerte su rete
  lenta; doppio tocco su tile diversi → vince l'ultima risposta, etichette identiche).
- **M3-T10-4 (R-E2)** «È un altro» crea righe clienti che condividono studio_nome — il difetto
  preesistente dei tile duplicati cresce; nessun vincolo di unicità nel POST /api/clienti.
- **M3-T10-5** divergenza formato nome prescrittore fra foglio (pieno) e TabDati (abbreviato).
- Task 10 — ✅ COMPLETO (commit 28a7891b..b983870e: impl 2a9cbcdd + fix b983870e; review opus:
  Needs fixes → re-review: Approved). Critical chiuso: toccato ANTEPOSTO con nome pieno da catena
  grezza, conteggio vero, istituzione autoritativa dai due percorsi, dark col rimedio ratificato,
  fixture specchiata sulla rotta vera. Minori nuovi (re-review, tutti latenti): dedup locale
  assente sull'anteposizione (poggia su .neq di un file non posseduto) · nome/cognome opzionali
  nel tipo ma richiesti dal percorso · «Torna all'elenco» non disabilitato durante il POST.
  R-E2: focus-visible mancante sulle righe medico.
- Task 11 (chiusura) — 🔄 IN CORSO: FASE 7 verify:full → review finale di ramo → giro end-to-end
  (banco 3020) → FASE 9/9b → BP-1 + handoff.
- REVIEW FINALE DI RAMO (fable, cabfd3f0..b983870e, 28 commit) — ✅ READY TO MERGE: zero
  Critical/Important; 6 rischi trasversali verificati e reggono (dialetti errore, gettone
  stringa, pastiglia mai bugiarda, fedeltà migration, tenant, registro mai-falso). 3 Minor nuovi
  di cerniera: frase di ripiego a2 promette una via di scheda che non esiste (debito ④) ·
  gettone stantio dopo PATCH di altro campo (409 fuorviante ma recuperabile) · doppio upload
  possibile dal Fatto (guardia in-flight). Triage completo dei 31 M3-* nel verdetto (in questo
  file, sezione sopra). M3-T39-6 (limite piattaforma vs frase 20MB) NON provabile sul banco
  locale: check post-deploy nell'handoff. FASE 7 verify:full VERDE (tsc 0 · suite verde ·
  build ok · 6 guardie).
- Task 11 — GIRO END-TO-END ✅ COMPLETO (8/8): lavori_prescrizioni 0→1→0, ogni passo verificato
  a DB (contenuto {"colore":"A3","elementi":[26]} · fonte foglio+immagine · typo B1 su entrambi ·
  divergenza esigenza_tecnica col dizionario chiuso · 409 fonte_in_uso · baseline ESATTA).
  60 scatti in docs/design/screenshots/2026-08-05-ondata-b3-giro/. Ritrovamenti: G1 il banco in
  DEV non collauda P37 (StrictMode rimonta lo Sheet; in build di produzione NON succede, provato
  — collaudo fatto su build prod porta 3020) · G2 P37 di fatto DORMIENTE nel dataset (18/18
  clienti-entità mono-medico: il gate «almeno un collega» non apre mai il foglio — da Francesco:
  candidata auto-cattura per studio mono-medico) · G3 gettone stantio non riprodotto (2 inneschi)
  · G4 nessun utente tecnico nel lab · G5 progressivi_anno resta a 12 (contatore, dichiarato).
  RESTANO: gate L2 formale con Francesco (8 decisioni in lista) · merge/push (autorizza
  Francesco) · M3-T39-6 post-deploy.

---

## Ondata D42 «le tinte del manufatto» — ramo `tinte-manufatto` (05/08/2026)

⚠️ Questo file conteneva SOLO l'ondata `ondata-b-sessione-3`, mai archiviata: la
numerazione `task-N` di questa cartella NON è distinta per ondata, e il Task 6 di
D42 ha riusato il nome `task-6-report.md`. L'originale è salvo in
`task-6-report-ondata-b-sessione-3-PRESERVATO-2026-08-05.md`. Gli altri file di
sessione-3 restano esposti alla stessa sorte finché non si archiviano.

- Task 6: complete (commit d288d647, revisione: specifica ✅ · qualità approvata,
  nessun Critico). Allineamento posizionale colonne↔valori verificato due volte
  in modo indipendente (lettura statica del diff + chiamata reale alla RPC su
  transazione annullata). Grant SECURITY DEFINER invariati. Riscontri Minori
  chiusi: il ponte SQL ora dichiara il suo indebolimento TLS.

---

## Ondata «si deve sempre poter intervenire» — ramo `intervento-post-consegna` (06/08/2026)

Piano: `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md` (9 compiti).
BASE del ramo: `167dd2d7`.
🛑 **Nomi dei file distinti per ondata** — `intervento-task-N-*.md`, mai `task-N-*.md`: la collisione
del 05/08 (Task 6 di due ondate diverse sullo stesso nome) è già stata pagata una volta.

Task 1: complete (commit 167dd2d7..09551b14, revisione: 2 Critici trovati e CHIUSI, 4 riferiti aperti)

## Ondata «si deve sempre poter intervenire» (2026-08-06) — piano `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md`

⚠️ I nomi in questa cartella NON sono distinti per ondata: si usa il prefisso `intervento-`.

Task 1: complete (commit 167dd2d7..09551b14; revisione: 2 Critici trovati e CHIUSI, 4 riferiti aperti)
Task 1-bis (§0① dell'handoff): prove in suite create — tests/unit/eventi-qualita-schema.test.ts (19) +
  tests/integration/eventi-qualita-schema.rpc.test.ts (22, contro il database vivo). Commit 42cf9089, 9a284eeb.
D274: i due difetti vivi chiusi e APPLICATI al database (migration 20260806170700, registro allineato).
Task 2: complete (commit 10c2da7b..a00a5c0f — impl 10c2da7b · correzioni D277-D279 953874f8 ·
  chiusura rilievi ri-revisione a00a5c0f).
  Revisione: mandato ✅ in tutti e tre i giri · qualità ❌ due volte, poi chiusa.
  Decisioni nate qui: D276 (controllo pre-volo) · D277-D279 (revisione).
  `verify:full` uscita 0: vitest 5168 passate | 41 saltate su 436 file.
  🟠 APERTI, da portare nel brief del Task 4 come PRECONDIZIONI DICHIARATE:
   · `classifica(null)` (l'intero oggetto) lancia ancora TypeError invece di degradare — preesistente,
     ma se il Task 4 costruisce `FattiEvento` con uno spread da un body parzialmente null, l'eccezione
     arriva da `classifica()` e non dalla rotta. ⚠️ Va deciso se la proposta si calcola PRIMA o DOPO
     il salvataggio dell'evento: da lì dipende se D262 regge (un 500 al posto di un 422 È un blocco).
   · `naturaDaMotivo` restituisce `null` solo per `altro` (firma stretta ripristinata); la spazzatura
     la intercetta la guardia separata `isMotivo`. Il confine HTTP deve distinguerli.
   · `ramoIso` e `termineOre` non hanno colonne in `valutazioni_evento`: due dei quattro campi che
     `classifica()` produce oggi non sono salvabili.
   · Il vocabolario delle risposte sulla gravità non ha colonna in banca dati né spia di migration.
  🟡 DUE DECISIONI APERTE DI FRANCESCO (v. handoff): la forma della domanda sulla gravità (tre risposte
   «grave» distinte + la regola quando ne valgono due: vince il termine più breve) e la conferma che
   «commerciale/errore_registrazione + mai uscito» dia `nessuna_azione` e non non-conformità interna.
Task 3: complete (commit 7317b7b0..e8a9b36b — impl 7317b7b0 · rilievi revisione e8a9b36b).
  Revisione: mandato ✅ · qualità BUONA con un Importante (l'elenco degli stati → `<> 'annullata'`),
  chiuso. Migration 20260806210400 APPLICATA (D284, senza chiedere), registro allineato,
  FASE 6b fatta: i tipi hanno una voce nuova, `tsc` 0.
  Integrazione 15/15 contro la funzione VERA. `verify:full` uscita 0: 5168 | 56 saltate su 437 file.
  🔴 RITROVAMENTO FUORI ONDATA, GRAVE E PREESISTENTE: `tests/integration/annulla-effetti-storno-td04.rpc.test.ts`
    ha 4 prove su 5 ROTTE, e lo erano già al punto di partenza del ramo (7427a680) — misurato
    lanciandole lì. Nessuno poteva accorgersene: le prove di integrazione si SALTANO da sole senza
    SUPABASE_DB_URL, e in CI quella variabile non c'è. È lo schema già pagato con la guardia mai
    agganciata: una prova che non gira non è una prova. Tocca il mondo FISCALE (note di credito),
    non quest'ondata → voce di roadmap a sé, priorità alta.
  🟠 Per il Task 4 (precondizioni dichiarate): il `p_laboratorio_id` deve venire dalla SESSIONE, mai
    dal corpo della richiesta · l'eccezione del fail-closed arriverà a un operatore e va tradotta in
    un messaggio che dica cosa fare · `classifica(null)` lancia ancora TypeError (v. Task 2).
  🟠 Riferito e non toccato: `dichiarazioni_conformita_lavoro_id_fkey` è una FK SEMPLICE e il trigger
    di coerenza è solo BEFORE INSERT — quest'ondata impone le FK composite, e il Task 1 l'ha già
    fatto su `eventi_qualita`. Quella tabella no.

⚖️ D285 (06/08/2026, 22:31 — centosedicesima tornata): le DUE PORTE restano due e si distinguono per
  *che cosa* era sbagliato. «errore_registrazione»/«commerciale» = il fatto è successo, è stato
  esaminato, esito `nessuna_azione`, la riga RESTA in elenco e nel conto delle cose esaminate. Il
  RITIRO (D273) = la riga non doveva esistere → fuori da elenchi e da OGNI conteggio, in archivio col
  motivo obbligatorio. ➡️ Predicato dei conteggi: UNO SOLO, «non ritirata».
  🟠 Conseguenza per il compito del ritiro: il commento di `src/lib/qualita/classifica.ts:158-160`
  («non entrano nei conteggi del rapporto periodico») è TROPPO LARGO e va corretto lì, insieme al
  predicato. Panel di 3 advisor (normativo · database · prodotto) lanciato con mandato di SMONTARE:
  le sue condizioni si integrano nel verbale prima della ratifica piena.

Task 4 (le due rotte: crea l'evento, deposita la valutazione): 🔄 IN CORSO — esecutore fresco dispacciato
  con `.superpowers/sdd/intervento-task-4-brief.md`.
  ✅ PRECONDIZIONE ③ SCIOLTA PRIMA DEL DISPACCIO: `classifica(null)` non è una decisione da prendere.
  `classifica(f: FattiEvento, …)` (classifica.ts:127) pretende quattro campi obbligatori di unioni
  chiuse: se la rotta valida il corpo PRIMA di costruire `FattiEvento`, il TypeError è irraggiungibile
  dalla rotta e D262 regge per costruzione. 🛑 Ma è un'affermazione: il brief impone di PROVARLA
  (body null · body non-JSON · campi null → mai 500).
  🔴 DUE BUCHI DEL PIANO trovati leggendo lo schema e messi nel brief (il piano non li nomina):
   ① `natura` è NOT NULL (20260806140823:16-18) ma `naturaDaMotivo` restituisce `null` per `altro`
     (qualita-costanti.ts:139) → un POST con `motivo:'altro'` non ha natura da scrivere. Scelta
     dell'esecutore, motivata, + punto per Francesco.
   ② `isMotivo` (guardia su `unknown`) e `naturaDaMotivo` (firma stretta) non sono intercambiabili:
     il confine HTTP deve chiamarle in quest'ordine.
   ③ La seconda rotta deposita la PRIMA valutazione e NON riclassifica (la riclassificazione è fuori
     ondata per D273): niente `sostituisce_id`/`motivo_riclassificazione` dal client, niente
     `valutazione_supera()`. `valutazione_viva_unique` fa sbattere la seconda deposizione: il codice
     HTTP va scelto, non lasciato uscire come 500.

Task 4: complete (commit a3abf4aa..d60ae140 — impl a3abf4aa · tre forme d'ingresso 245c81f2 ·
  sei rilievi di revisione aefeb4a0 · autocorrezione ISO 8601 d60ae140).
  Revisione a DUE verdetti: conformità ✅ (dieci punti con file:riga, nessun Critico) ·
  qualità ⚠️ con un CRITICO trovato con una MUTAZIONE — la fixture restituiva una riga che Postgres
  non potrebbe produrre (`potenziale_di_danno:'nessuno'` su una colonna NOT NULL DEFAULT 'da_valutare'),
  e con essa la proprietà portante (proposta calcolata sulla riga SALVATA) restava senza asserzioni:
  mutando la rotta, 66 su 66 restavano verdi. Dopo il fix la stessa mutazione accende 1 rossa.
  Prove del file 66 → 81.
  ⚖️ ADJUDICATO: lo scostamento dichiarato sulla regola 3 (`post_consegna_correzioni` incrementata solo
  se il manufatto era uscito) è ACCETTATO — censimento rifatto: sei righe, nessun documento fiscale la
  legge. 🟡 Resta da RATIFICARE da Francesco (rilievo M1 della conformità).
  ⛔ Un rilievo NON corretto per scelta: il guasto transitorio del DB che esce come «Lavoro non trovato»
  è l'idioma di casa (`rifacimento/route.ts:123-133`) — correggerlo qui creerebbe due dialetti.
  🔴 PER FRANCESCO: il fuso orario di `conosciuto_il` (C-R4) — senza fuso, server e telefono danno due
  istanti diversi e lo scarto va IN AVANTI su una scadenza dell'Art. 87.
  🔴 APERTI DAL TASK 4, versionati nel piano: R1 (`riapri_lavoro_atomica` senza chiamanti e senza un
  compito che ne prenda uno) · R1-bis (la §4 promette una colonna che non esiste; §6 contro §7 su cosa
  faccia `errore_registrazione` — domanda aperta a Francesco) · R2 (§17.2 assegnata al Task 4 ma il
  CHECK del Task 1 la rende impossibile per un laboratorio non certificato).

---

## PIANO «TORNA A PRONTO COL DOCUMENTO INTATTO» — 07/08/2026 sera
Piano: `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md` (10 task)
Base del piano: `be6e2c59`. 🛑 I brief/report di QUESTO piano hanno prefisso `pronto-`.

- **PRONTO-1: COMPLETO** (commit `be6e2c59..35292c72`, revisione pulita).
  Colonna `eventi_qualita.scelta_intervento` + due CHECK, entrambi `convalidated`, provati con valori
  RIFIUTATI (23514 × 2) e uno accettato. Migration `20260807171033`, registrata nel ledger Supabase.
  🟡 Minori: ① la conferma con `SET LOCAL ROLE authenticated` è inconcludente senza JWT vero (RLS
  nasconde le righe prima del CHECK) — rimandata al task della rotta; ② BP-1 non toccato, è a livello
  di ondata.
  🔑 **DUE DIFETTI DEL PIANO trovati dall'esecutore, e valgono per i task 2-10:**
  ① `SAVEPOINT`/`ROLLBACK TO` in un solo file NON funziona con `scripts/psql.mjs` — il protocollo
  semplice interrompe in silenzio tutto il lotto al primo errore: **una invocazione per sonda**;
  ② una sonda che aggiorna righe inesistenti dà **falso verde**: la riga da rifiutare va INSERITA
  nella stessa transazione annullata.

- **PRONTO-2: COMPLETO** (commit `35292c72..b7d7802c`, revisione pulita **dopo un giro di correzione**).
  Colonna `lavori.prima_immissione_at` + backfill (223 piene su 224 consegnati, il 224esimo è la
  fixture E2E senza data — corretto che resti `NULL`) + scrittura in `orchestrate.ts:337`
  (`lavoro.prima_immissione_at ?? now`: **il valore esistente vince sempre**). R-P4: **2 su 9**.
  🔴 **UN CRITICO TROVATO DALLA REVISIONE, e nasce da un buco del PIANO, non dell'esecutore:** il
  brief chiedeva la riga di `orchestrate.ts` e **non un censimento delle RPC**. `consegna_finalizza_atomica`
  (`20260710150000:28-50`) segna una consegna e **non scriveva** `prima_immissione_at` — dormiente, ma
  con `GRANT … TO service_role` e già indicata come percorso di consegna futuro
  (`20260721090000:152-155`). ✅ Corretta con `20260807174850`, verificata **sul catalogo vivo**:
  verso del `COALESCE` giusto, `SECURITY DEFINER` + `search_path` + ACL invariati, nessun overload orfano.
  ✅ Chiuso anche l'Importante: `scripts/import-lavori-storici.ts` avrebbe ricreato il buco alla prima
  migrazione dati di un laboratorio vero.
  🟡 Minori: il resoconto dichiarava «94 occorrenze» di `data_consegna_effettiva`, la riconta ne trova
  **109** (falsa precisione, conclusione invariata) · `prima_immissione_at` nasce **senza lettori**:
  nessun codice calcola oggi una scadenza a dieci anni.
  📌 Fuori mandato, **riferito e dichiarato nel corpo del commit**: rimosso un `type Stato` morto in
  `scripts/import-lavori-storici.ts` che bloccava il gate pre-commit su qualunque modifica a quel file.
  ⚠️ **LEZIONE PER I TASK CHE RESTANO: quando un task tocca una colonna che segna un fatto, il
  censimento va fatto anche sulle RPC del catalogo, non solo su `src/`.**

- **PRONTO-3: COMPLETO** (commit `b7d7802c..22650db1`, revisione pulita al primo giro).
  `lavori_rifacimenti_motivo_check` da 7 a **9** valori (i sette storici tutti conservati, verificati
  contro `005_v1_foundation.sql:77-82` come testimone indipendente) + indice **unico parziale**
  `rifacimento_evento_unique (laboratorio_id, evento_id) WHERE evento_id IS NOT NULL`.
  Le tre sonde **rifatte anche dal revisore**: ① `23514` su motivo inventato · ② `23505` su evento
  duplicato · ③ due righe con `evento_id NULL` passano entrambe (l'indice parziale non blocca i
  rifacimenti creati a mano). L'allowlist della rotta HTTP resta a **7**, come voluto.
  🟡 Minori, da tenere per chi toccherà il vocabolario dei motivi: ① le allowlist sullo stesso campo
  sono **QUATTRO**, non tre — la quarta è `src/components/features/lavori/RifacimentoButton.tsx:7-15`
  (coerente, ferma a 7, non citata dal commento della migration); ② `pg_constraint` non elenca i
  **trigger**: ne esiste uno che vieta i riferimenti fra laboratori diversi (`P0001 Cross-tenant
  violation`), incontrato dal revisore e non censito dal resoconto.

- **PRONTO-4: COMPLETO** (commit `22650db1..966024b6`, revisione pulita, **nessun Critico**).
  `riporta_a_pronto_atomica` (la gemella NON distruttiva) + `ripristina_lavoro_a_pronto` (il corpo
  condiviso) + `riapri_lavoro_atomica` ribattuta dal **catalogo vivo**. Verificato dal revisore sul
  catalogo, non sui file: la nuova **non ha nessun UPDATE su `dichiarazioni_conformita`** · la gemella
  **scrive ancora `annullata_da_evento_id`** (la correzione di ieri è sopravvissuta) · **nessuna delle
  tre azzera `prima_immissione_at`** · nove campi su nove identici · ACL solo `postgres`+`service_role`
  su tutte e tre · nessun overload orfano. Sonde: **6 su 6**.
  🟡 **DUE IMPORTANTI, entrambi RIFERITI e non corretti (R-E2):**
  ① `tests/integration/riapri-lavoro-atomica.rpc.test.ts:22,28-31` **riscrive la funzione col corpo
  del 06/08 dentro la propria transazione** e la chiama in 14 punti: i suoi **15 verdi guardano una
  funzione morta**, e il motivo scritto in testa al file è scaduto dal 6 agosto sera. ➡️ **Il piano è
  stato EMENDATO: è il Passo 0 del Task 10.**
  ② **La terza copia dei nove campi esiste già**: `annulla_consegna_atomica` li porta in linea e non
  chiama la funzione condivisa — cioè lo scenario che il commento dell'estrazione dichiara di
  prevenire è **già in essere**. Non è una regressione (era separata da prima).
  🟢 Il brief aveva un difetto nella sonda ④ (lanciata sul lavoro già riportato indietro, avrebbe dato
  un verde su una funzione mai entrata in azione): corretto dall'esecutore **sulla sonda**, dichiarato.
  📌 Le 4 prove rosse del TD04 sono **preesistenti** e non nominano nessuna delle tre funzioni
  (rimisurate dal revisore: 4 falliti | 16 passati sui due file).

- **PRONTO-5: COMPLETO** (commit `b101e4d4..899bf0a4`, revisione pulita, **nessun Critico**).
  `crea_rifacimento_atomico` ricreata con `p_evento_id uuid DEFAULT NULL` in coda, e la colonna
  `lavori_rifacimenti.evento_id` — che esisteva dal 06/08 e **nessuno scriveva** — ora si scrive.
  🔑 **Il rischio del DROP è stato chiuso e VERIFICATO AL CONFINE VERO, non sull'array dei permessi:**
  il revisore ha fatto una POST reale con la **chiave pubblica** → `42501 permission denied`. `proacl`
  = solo `postgres` + `service_role`, `prosecdef` e `search_path` conservati, **una sola** funzione nel
  catalogo (nessun residuo a cinque argomenti), corpo identico allo storico tranne le tre differenze
  volute, e **nessuno scivolamento fra la lista delle colonne e quella dei valori** (riletta la riga
  scritta, campo per campo). La chiamata a **cinque** argomenti della rotta manuale funziona ancora.
  🟠 **DUE IMPORTANTI, entrambi rivolti al FUTURO:**
  ① **IL LEDGER DELLE MIGRATION HA DUE OROLOGI, e il passaggio è avvenuto DENTRO quest'ondata.** Fino a
  `20260807143623` i nomi sono in ora **locale**; da `20260807171033` in poi in **UTC**, perché il
  piano prescrive `date -u`. Nulla di applicato è compromesso (il ledger è monotòno), ma **la trappola
  è la migration SUCCESSIVA**: `supabase db push` con un file fuori ordine si **ferma**
  (`LegacyDbPushMissingRemoteError`), e chi sbloccasse con `--include-all` farebbe divergere per sempre
  l'ordine vivo da quello dei file. ⚖️ **Serve una decisione: quale orologio. Va scritta in D155.**
  ② **Niente lega `p_evento_id` a `p_lavoro_originale_id`:** un evento dello stesso laboratorio ma di
  un ALTRO lavoro passa in silenzio, e l'indice unico **brucia quell'evento**. ➡️ **Il piano è stato
  EMENDATO: è il Passo 4-bis del Task 7**, che l'evento giusto ce l'ha già in mano.
  🔵 Minore: il `23505` reso possibile oggi non è ancora tradotto dalla rotta manuale (500 col messaggio
  grezzo) — non raggiungibile finché l'unico chiamante passa cinque chiavi; il Task 7 lo traduce.

- **PRONTO-6: COMPLETO** (commit `190018ad..8dd4a7dd`, revisione indipendente **senza Critici**; giro di correzione su 2 Importanti). ORIGINE: (07/08/2026, 22:0x — esecutore fresco, R-E1). Brief:
  `.superpowers/sdd/pronto-task-6-brief.md`.
  ⚖️ **IL TASK È STATO EMENDATO PRIMA DI PARTIRE — D312, ed è il QUINTO difetto trovato in questo
  piano: il primo trovato PRIMA che il codice esistesse.** Il censimento di apertura ha misurato che
  `destinatario_errato` — il **terzo** dei tre motivi che la spec §0 vuole «a `pronto` con la
  dichiarazione viva» — **non aveva un padrone in nessuno dei dieci task**: vive in una riga fissa di
  `EFFETTI_PER_MOTIVO` con `azione: null`, che `effettoDaMotivoEScelta` non raggiunge.
  Sarebbe emerso al **Task 10**, come prova rossa con l'aria di una regressione.
  ➡️ Francesco: «*sì, prendilo nel Task 6*». Piano emendato con un **Passo 0**, più due emendamenti
  minori nati dallo stesso censimento: ① la **guardia D301/D302** delle parole «pezzo»/«carta» scorre
  la sola tabella fissa e **non vede i testi nuovi** (verde che non sorveglia niente — stessa famiglia
  dei due falsi verdi di quest'ondata) · ② il conteggio R-P4 va dichiarato **in due numeri**, perché
  tre prove su sette poggiano su valori della tabella fissa e possono passare col bivio sbagliato.
  ✅ **ESITO.** `effettoDaMotivoEScelta` + `Scelta` + `MOTIVI_CON_SCELTA` + `richiedeScelta`,
  `AzioneAutomatica` da 1 a **3** valori, e la riga fissa di `destinatario_errato` che passa a
  `azione: 'torna_pronto'` (D312). **R-P4: 17 su 24** sul perimetro intero, **6 su 7** sulle sole prove
  del ramo nuovo — il secondo è quello che parla del bivio, e la prova del testo non si accende contro
  l'abbozzo perché è un'asserzione **negativa** (dichiarato, non nascosto).
  🔴 **DUE IMPORTANTI DALLA REVISIONE, stessa radice — l'allargamento è arrivato nel DATO e non in ciò
  che lo DESCRIVE — e sono stati CORRETTI (sono dentro il mandato):** ① l'invariante gemella
  (`perche`/`decisione`) è rimasta cieca sui quattro esiti risolti mentre la guardia D301/D302 veniva
  allargata, **sei righe più su nello stesso `describe`** → ingresso unificato in `tutteLeRighe()`, e
  **provata rompendola** (`decisione: 'boh'` → l'errore nomina `difetto_lavorazione + si_sistema`);
  ② l'intestazione del modulo contava «due righe con azione, sette descrittori» → ora conta **tre
  gruppi** (2 subito · 2 dopo la scelta · 5 descrittori).
  🟠 **UN IMPORTANTE FUORI MANDATO, riferito e NON corretto (R-E2):** `DevoIntervenire.tsx:492-513`
  disegna i riquadri d'esito solo per `riapertura`, cioè solo per `riapri_lavoro` — **le due azioni
  nuove non hanno canale di risposta a schermo**. ➡️ Perimetro **T7** (la rotta) e **T9** (i testi).
  🔵 **Minore misurato dalle mutazioni:** togliere `|| scelta === null` **non fa fallire nessuna prova**
  — la clausola è ridondante per comportamento e scritta per intenzione. Il nome della prova prometteva
  più di quanto misuri: ora è scritto nel file che cosa garantisce davvero.
  📌 **Un difetto del piano era MIO:** il marchio `provato:` del Passo 0 misurava **il documento in cui
  vive**, quindi si è invalidato appena l'emendamento l'ha cambiato. Riscritto su un riferimento
  **fermo** (`git show 83a899fd:… | grep -c` → `0`). ⚠️ Anche le «Interfacce» del brief e il blocco di
  codice si contraddicevano sul tipo di `MOTIVI_CON_SCELTA` (`readonly Motivo[]` contro `as const
  satisfies`): è stata spedita la seconda forma — **il T7 deve saperlo**.
  📈 `verify:full` **uscita 0**: 5444 passate | 68 saltate su 450 file (da 5436), tsc 0, build ok,
  sette guardie verdi.

- **PRONTO-7: COMPLETO** (commit `2ede802d..ad82e708`, revisione indipendente: **UN CRITICO**, corretto).
  La rotta deriva il bivio, chiama le due azioni nuove, lega l'evento al lavoro (Passo 4-bis) e
  rinomina `riapertura` → `esito_azione` fino ai file di prove dei componenti. **R-P4: 31 su 37**
  (sei erano già verdi: sorvegliano regressioni di questa stessa modifica — dichiarato, non misurato).
  🔴 **IL CRITICO, e non era nella rotta: era nella FRASE.** `DevoIntervenire.tsx` diceva «*La
  dichiarazione è stata annullata*» **proprio sul ramo che la tiene viva** — il ternario guardava
  `dichiarazione_assente`, che su `torna_pronto` non arriva (la rotta manda `dichiarazione_viva`),
  quindi cadeva sempre nel ramo dell'annullamento. **Inversione esatta di D293 e dell'Art. 21(2)**, e
  raggiungibile oggi: `destinatario_errato` non ha cancelli a monte. ✅ Corretto con i testi **già
  ratificati** nel Passo 5 del T9, e **provato rompendolo** (2 prove si accendono citando la frase
  falsa). ⚠️ Il resoconto dell'esecutore lo chiamava «incompleto»: era **invertito**, e quella parola
  avrebbe mandato il T9 a trattarlo come copywriting.
  🔑 **DUE FIXTURE CONDIVISE TENEVANO IN OSTAGGIO ALTRI FILE, e la seconda è la lezione:**
  `corpoValido` usava `difetto_lavorazione`, che da questo task pretende una scelta → ~40 prove
  sarebbero uscite 422. La stessa fixture esisteva **una seconda volta** in
  `tests/unit/istante-roma.test.ts:264`: tre prove rosse, **e trenta verdi per il motivo sbagliato** —
  la guardia del bivio sta prima della lettura di `conosciuto_il`, quindi un intero file sui **termini
  di legge** avrebbe smesso di misurarli restando verde. Trovata solo perché l'esecutore ha lanciato
  più prove di quelle che il mandato nominava.
  🟠 **DUE IMPORTANTI RIFERITI:** ① l'idempotenza `23505` **non è raggiungibile da questa rotta** (ogni
  POST inserisce un evento nuovo; `postgrest-js` ritenta solo `GET/HEAD/OPTIONS`): il doppio invio vero
  crea **due lavori e brucia due progressivi**, trattenuto solo dalla spia del componente, cioè da una
  schermata · ② la porta della spec §1 è aperta ora da **tre** motivi invece di uno → **D308 (Task 8)
  è urgente, non solo dovuto**.
  📌 Il piano aveva **tre difetti**, fra cui uno che si dichiarava verde senza provare niente:
  `npx vitest run tests/unit/api` esce **0 su 221 prove di altri task** — quella cartella non esiste, e
  vitest tratta l'argomento come frammento di nome.
  📈 `verify:full` **uscita 0**: 5470 passate | 68 saltate su 450 file (da 5444), tsc 0, build ok.
