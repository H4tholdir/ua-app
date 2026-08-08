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

- **PRONTO-8: COMPLETO come CANCELLO** (commit `59e1628e..034505a2`) — 🛑 **ma la revisione ha trovato
  un CRITICO DELL'ONDATA, non dell'esecutore: la strada che il 422 nomina riporta nella stessa stanza.**
  ✅ **Il cancello è costruito bene**, e il revisore l'ha bombardato con **nove mutazioni** senza trovare
  buchi: invertire il confronto → 10 rosse · togliere il filtro del laboratorio → 31 su 9 file ·
  predicato a elenco di stati → 27 · 422→200 → 5 · messaggio generico → 2 · fail-closed → 1 · colonne → 1.
  🔑 **L'ESECUTORE HA TROVATO UN DIFETTO DEL PIANO CHE AVREBBE RESO IL LAVORO DI SOLA LETTURA.** Il piano
  decideva chi ha toccato un campo stampato **dalla presenza della chiave** (`c in aggiornamenti`); ma
  `src/hooks/useLavoroForm.ts:316` manda `{ ...data }`, cioè **l'intera riga**, e i cinque nomi non
  vengono mai tolti → note, date, tecnico, priorità sarebbero diventati incorreggibili. Violazione della
  direttiva del 27/07 travestita da conformità. ➡️ **Il cancello guarda il VALORE: si rifiuta ciò che
  CAMBIA.** ⚠️ **E le tre prove che il piano proponeva NON distinguevano le due letture:** col cancello
  sbagliato in opera, `3 rosse su 5.555` — misurato dall'esecutore e **rifatto identico dal revisore**.
  🔴 **IL CRITICO, verificato tre volte sul codice:** il 422 dice «apri Devo intervenire → dato sbagliato
  sulla dichiarazione: l'app rifà il documento». ① **Nessuna schermata collega quella strada**
  (`DevoIntervenire.tsx` non nomina `errore_dato_dichiarazione` né `riemett`: zero occorrenze) · ②
  quando il T9 la collegherà, **il documento rifatto sarà IDENTICO nei cinque campi**, perché
  `generate-ddc.ts:251-261` li prende dalla riga del lavoro **che nessuno ha potuto correggere** · ③ e
  non c'è finestra: `riemetti_ddc_atomica` annulla e inserisce **nella stessa transazione**, per scelta
  dichiarata (`20260807143623:55-70`). ➡️ **Non si corregge prima, né durante, né dopo.** Un refuso del
  front desk sul paziente, scoperto dopo la consegna, **non ha nessun percorso veritiero** — l'unico che
  funziona è `errore_registrazione`, che dichiara una consegna mai avvenuta, cioè mente.
  🛑 **DECISIONE DOVUTA DA FRANCESCO PRIMA DEL TASK 9.**
  🟠 **DUE IMPORTANTI:** la spec §4.5 dà per chiuso dal cancello il caso (b), e **non lo è**:
  `clienti.nome`/`cognome` e `pazienti.codice_paziente` restano correggibili senza cancello, e il
  prescrittore ripiega proprio su `${cliente.cognome} ${cliente.nome}` — il documento consegnato è
  congelato (stantio, non falso), ma una **riemissione** stamperebbe un prescrittore diverso.
  🔵 **Minore utile:** il commento a `route.ts:491-493` dice che senza le quattro colonne il cancello si
  spegnerebbe «in silenzio». **È il contrario**, misurato: si accenderebbe **di più** (un valore assente
  risulta diverso), fino a un 422 su ogni salvataggio. Codice giusto, descrizione del rischio invertita.
  📈 `verify:full` **uscita 0**: 5487 passate | 68 saltate su **451** file (da 5470/450), tsc 0, build ok.

## PIANO «CORREGGI E RIFAI LA DICHIARAZIONE» (ATTO UNICO) — 08/08/2026
Piano: `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md` (5 compiti: A-E)
Base: `22cc54f2`. 🛑 I brief/report di QUESTO piano hanno prefisso `atto-unico-`.
Decisioni: **D314** (ogni campo che alimenta il documento) · **D315** (atto unico) · **D316** (sette
voci) · **D317** (il dentista va avvisato). Panel a tre, convergente.

- **ATTO-UNICO-A: COMPLETO** — «la bugia smette di essere silenziosa».
  🛑 **I SALVATAGGI NON SONO QUELLI CHE IL TITOLO LASCEREBBE CREDERE, e va letto prima di cercarli:**
  il compito vive in **`128379ea`** (titolo: *chore(salvataggio)…11:00*) · **`b5d0d4c8`** (titolo:
  *chore(salvataggio)…tre sveglie*) · **`cd8e0ac0`** (il resoconto). Causa: `git add -A` di chi
  orchestra mentre l'esecutore lavorava in secondo piano. **Niente perso, suite verde** — il danno è
  alla rintracciabilità. ⚖️ **Chiuso da D318: un compito salva NOMINANDO i propri percorsi.**
  ✅ **ESITO.** `registra()` non decide più al posto della persona: prende `statoDichiarato` dal
  chiamante, e il ternario `sbaglio ? 'mai_uscito_dal_lab' : statoDisp` **è sparito**. La finestra che
  c'era già è passata da **conferma a DOMANDA** — «Il manufatto è uscito dal laboratorio?» — con «Sì, è
  uscito» che **non manda niente** e riporta all'elenco con la strada scritta in cima (D262), col nome
  del motivo **preso da `MOTIVI_UI`** invece che ricopiato. La fase si chiama ora `domandaUscito`.
  **R-P4: 2 su 12** (primo rosso 12/24 → abbozzo inerte 2/24 → verde 24/24).
  🔑 **TRE DIFETTI DEL PIANO, tutti miei, trovati e corretti da lui:** ① «la guardia ora può accendersi»
  era **impreciso** — dopo il Task A resta **irraggiungibile dal foglio**, ed è **voluto**: l'app indica
  la strada *prima* del giro al server invece di far guadagnare un 422 che si legge come guasto ·
  ② la mia diagnosi su `post_consegna_correzioni` era **sbagliata** (è un predicato con la sua ragione
  scritta: **non si ripara**) · ③ «esiste una guardia sul lessico» **non era vera per quel file** — le
  due prove scorrono `MOTIVI` su altri moduli, e le stringhe del componente non erano coperte da
  niente: la rete l'ha aggiunta lui.
  🟠 **FASE 9b DOVUTA E NON FATTA:** cambiano titolo, corpo ed entrambe le etichette della finestra, e
  nasce un riquadro → per **D245 è ASPETTO**. Deferita al **Passo 5 del Task D**, che copre la stessa
  superficie. 🛑 **Se il Task D non si facesse, il gate resta scoperto.**
  🟠 Altri due riferiti: `Esc` sopra la finestra fa scattare **due** ascoltatori (`Sheet.tsx:160` e
  `DialogConferma.tsx:87` — la pila di `storia-overlay.ts` protegge «indietro», non `Esc`; preesistente)
  · `Esc`, scrim e gesto «indietro» finiscono sullo stesso `onAnnulla` di «Sì, è uscito», quindi chi
  esce senza rispondere vede comunque l'avviso (distinguerli cambierebbe il contratto di
  `DialogConferma`).
  📌 **Per il Task B:** la firma `registra(statoDichiarato)` è nuova · la fase si chiama `domandaUscito`
  · il contatore resta a zero **ed è giusto** · la prova di lessico copre il **solo** percorso corto.
  📈 `verify:full` **uscita 0**: 5492 passate | 68 saltate su 451 file, tsc 0, build ok.

- **ATTO-UNICO-B: COMPLETO** (commit `bfcafc2f..13e010fe`, revisione **APPROVATO CON RILIEVI, nessun
  critico**). Migration `20260808093513_correggi_e_riemetti_atomica.sql`, **applicata e registrata nel
  ledger** (pavimento nuovo: `20260808093513`). Indice `ddc_evento_annulla_unique` + RPC
  `correggi_e_riemetti_atomica(p_lavoro_id, p_laboratorio_id, p_evento_id, p_correzioni, p_nuova,
  p_atteso_updated_at)`, `SECURITY DEFINER`, ACL `postgres` + `service_role` soli.
  ✅ **ESITO.** Ordine **annulla → correggi → inserisci** (rovesciato rispetto al piano, v. P9). Le voci
  fuori da `lavori` si **chiamano**, non si ricopiano. Dopo la prima scrittura **nessuna uscita è un
  `RETURN`**: si alza, perché via PostgREST un `RETURN` committerebbe l'annullo lasciando un lavoro
  consegnato **senza dichiarazione viva**. Sonde **9 su 9**, giro buono con **14 atterraggi su 14**
  verificati voce per voce. **R-P4: 14 su 14.**
  🔑 **CINQUE DIFETTI DEL BRIEF/PIANO trovati dall'esecutore**, di cui due miei e uno grave:
  ① **P10 descriveva un meccanismo inesistente** — `now()` è costante in transazione (`provato:`
  `now() = transaction_timestamp()` → `true`), quindi il gettone si muove **una volta sola**; la forma
  prescritta resta giusta, la ragione era sbagliata, **e il rischio vero era peggiore**: una fixture
  costruita nel modo ovvio rende la sonda del conflitto un **falso verde**, perché non può fallire ·
  ② 🛑 **`scripts/psql.mjs` si collega come `postgres`, cioè come PROPRIETARIO** (`provato:`
  `current_user = postgres`): **una sonda sui permessi senza `SET LOCAL ROLE` non prova niente** — vale
  per ogni sonda futura di questo repo · ③ la guardia su `denti_coinvolti` accettava `["21","22"]` (la
  forma della **colonna**, che il nome della chiave invita a usare) e moriva due funzioni più in là con
  `23502` · ④ la sonda «chiave fuori dalle otto» era sotto-specificata · ⑤ **l'elenco di sonde aveva un
  buco sul modo di fallire più pericoloso**: nessuna verificava che una penna che dice no facesse
  **disfare l'annullo**.
  🔴 **QUATTRO RILIEVI CHE PASSANO AL TASK C** (dettaglio nel piano, sezione «Task C», voci C0-C3):
  **C0** `p_nuova` accetta `stato` → `{"stato":"annullata"}` dà `ok` e lascia **zero dichiarazioni vive**
  (**ereditato**: `riemetti_ddc_atomica` fa lo stesso) · **C1** il §7d del resoconto è **sbagliato a
  metà**: omettere `numero_ddc` **non** collide (nessun indice unico) → **due documenti legali con lo
  stesso numero stampato** · **C2** `p_correzioni` non rifiuta mai il **vuoto** (una chiamata ha svuotato
  cinque campi con `esito: ok`) · **C3** `23505` ora vale **tre vincoli**: la traduzione ramifica sul
  **nome**, e la porta d'idempotenza diventa **portante**.
  🟠 Altri riferiti (R-E2): il nuovo indice **irrigidisce `riapri_lavoro_atomica`** (`correggi(E) →
  riapri(E)` dà `23505`) — giudicato dalla revisione **irrigidimento accettabile, non regressione** ·
  `{"denti_coinvolti": []}` cancella tutti i denti ed è indistinguibile da una correzione voluta ·
  `tipo` è accettato dalla penna della prescrizione ma **non arriva mai sul documento** (D213): domanda
  di perimetro per il nome `CAMPI_CORREGGIBILI_DOCUMENTO` · `numero_prescrizione` vive in **due posti**.
  🛑 **A SCHERMO NON CAMBIA NIENTE: la RPC non ha chiamanti.** Nessun test vitest — le prove sono sonde
  SQL, che **non girano in CI**; fixture e sonde sono salvate per intero nel resoconto perché
  `scripts/tmp/` è ignorato da git.
  ✅ **FASE 7 COMPLETA, e non l'aveva fatta nessuno dei due:** né l'esecutore (si era fermato a `tsc`,
  dichiarandolo) né il revisore (aveva rieseguito il solo `tsc`). `provato:` `npm run verify:full`,
  **uscita `VERIFY_EXIT=0` letta da variabile**: tsc 0 · eslint 0 · `next build` ok · **sette guardie
  verdi** · `vitest` **5492 passate | 68 saltate** su **451 file** (445 passati, 6 saltati).
  📌 **Il numero delle prove NON è salito** rispetto a stamattina (5492 | 68 su 451), **ed è coerente**:
  questo compito non ha aggiunto prove automatiche, perché le sue sono sonde SQL che in CI non girano.
  🔑 *Dichiararlo serve: un numero fermo che nessuno spiega somiglia a una misura non fatta.*
  📌 **Verificato da me, non ricopiato:** funzione e indice esistono sul **catalogo vivo** con ACL
  giuste; migration **nel ledger**; `tsc` 0; `now()` costante in transazione.

- **ATTO-UNICO-C-bis: COMPLETO** (`60cb4828..aabfd385`, revisione **APPROVATO CON RILIEVI**, nessun
  critico). Migration `20260808103515`. `p_nuova` non accetta più `stato` (che ora è **forzato** a
  `generata`) né `numero_ddc` (**derivato** da `anno_ddc`+`progressivo_ddc`).
  🔑 **Il difetto stava nella chiusura che l'orchestratore aveva prescritto:** «rifiuta **oppure** forza»
  — servono **tutti e due**. Rifiutare `stato` senza forzarlo lo fa **ereditare** dalla vecchia: con una
  vecchia `firmata`, la nuova nasce **firmata con la firma vuota**. Difetto *nuovo*, creato dalla
  correzione. Misurato dall'esecutore.
  🔑 **E `lpad` TRONCA:** `lpad('10000',4,'0')` → `'1000'`, un numero **plausibile** su un documento di
  legge. Chiuso con `greatest(4, length(…))`, equivalenza provata su 18 valori (`diff` vuoto) coi confini
  999/1000/9999/10000.

- **ATTO-UNICO-C-ter: COMPLETO** (`c2961055`, revisione **APPROVATO CON RILIEVI**, nessun critico).
  Migration `20260808112700`. La coppia `anno_ddc`/`progressivo_ddc` è **indivisibile** (`XOR`).
  🔑 **Non è un compito nuovo: è la seconda metà di C1.** E la regola asimmetrica proposta dal C-bis ne
  avrebbe chiusa **metà** — la revisione ha provato il verso opposto (`anno_ddc` da solo → progressivo
  **mai prenotato** per quell'anno).
  ⚠️ **Perché SEDICI sonde non l'avevano visto:** fixture e dichiarazione vecchia vivevano **entrambe nel
  2099**, quindi l'anno ereditato **coincideva per caso**. *Una fixture che sceglie i propri valori può
  nascondere proprio il difetto che dovrebbe mostrare.*

- **ATTO-UNICO-C: COMPLETO** (`28de17d0..8d201e54`, revisione **APPROVATO CON RILIEVI**, **tre critici**
  → chiusi dal C-quater). La rotta `…/dichiarazione/riemetti` **estesa, non riscritta**: il confine è
  **una chiave sola** (`correzioni`), e senza di essa fa esattamente ciò che faceva prima.
  Moduli nuovi: `src/lib/dichiarazione/{correzioni,atto-unico-errori}.ts` · `correggiERiemettiDdC`
  accanto a `riemettiDdC`, che **non** è stata toccata. **Nessuna migration.**
  📈 **`5492 | 68 su 451` → `5606 | 68 su 454`** — la promessa riscossa.
  🔴 **DUE DIFETTI DEL PIANO, entrambi dell'orchestratore:** ① il Passo 4 diceva «restituisci **quella**»
  — ma quella è la **annullata**: restituirla significa **consegnare il documento vecchio dicendo
  «rifatto»**, cioè il difetto che il piano stesso chiama il peggiore possibile. Si restituisce il
  **successore** · ② **correggere `paziente_id` senza scambiare l'embed stampa il nome della persona
  SBAGLIATA** (`generate-ddc.ts:258` ripiega sull'anagrafica ancora vecchia) — non era scritto in
  **nessun** documento.

- **ATTO-UNICO-C-quater: COMPLETO** (`691e94c4`) — i **tre critici** del Task C.
  **C3 (codice vivo):** la regola sul vuoto **si fermava al primo livello**, quindi
  `prescrizione_caratteristiche: {colore: ''}` passava e il documento **perdeva un contenuto
  dell'Allegato XIII** con un **200 «rifatta»**. Chiusa **estendendo in profondità la regola esistente**,
  col percorso nel messaggio. **C1 · C2 (prove):** due mutazioni del codice di produzione restavano
  **verdi su 130 prove su 130** — la porta del tenant sul paziente (il finto inghiottiva i filtri) e il
  fail-closed sull'esito ignoto (verde **per il motivo sbagliato**).
  🔑 **E le mutazioni erano SEI, non tre** (trovato dall'esecutore): C3 sono **due** difetti, e la più
  istruttiva è **C3c** — una prova che passava **sia con la regola vecchia sia con quella nuova**, cioè
  che **nessuna mutazione poteva rendere rossa**. *Era decorazione; ora è una prova.*
  📈 **`5606` → `5617`** · `VERIFY_EXIT=0`.
  🟠 Riferiti e non toccati: **I3** la porta d'idempotenza ha **una sola** asserzione (con le colonne
  invertite le due prove di comportamento restano verdi) · **M1** lo `switch` della rotta senza `default`
  né guardia di esaustività · **I2** `paziente_nome_snapshot` vince sull'embed, e il **primo writer**
  dello snapshot sta per essere questa rotta — **da decidere nel Task D**.

- **ATTO-UNICO-C-quinquies: COMPLETO** (`e9094cc4`) — esegue **D319**: il numero di prescrizione esce
  **dal foglio del PDF, dal costruttore, dalle due allowlist TypeScript e dall'allowlist SQL**
  (migration `20260808142358`). **Nessuna colonna cancellata**, come D319 prescrive: le orfane portano la
  loro riga scritta accanto.
  🔑 **E SONO TRE, NON DUE** (trovato dall'esecutore): il brief censiva `lavori.numero_prescrizione` e
  `lavori_prescrizioni.numero_prescrizione`, ma manca **`dichiarazioni_conformita.prescrizione_id`**, che
  perde il suo **unico** scrittore proprio con questo compito. R-P6 alla lettera, sulla colonna che il
  mandato stesso orfanizza.
  🔴 **«Nessuno le scrive» era FALSO, e lo era già in D319**: `POST /api/lavori` **valida e scrive**
  `lavori_prescrizioni.numero_prescrizione` (`route.ts:234-240` → `componiSnapshot` →
  `lavoro_crea_atomico`), il clone del rifacimento la propaga, `prescrizione-mapper:291` la legge.
  ➡️ **Chiusa da D321** (centotrentanovesima tornata, 08/08 17:24): *si elimina ovunque*.
  📈 `5617 | 68 su 454` → **`5621 | 68 su 454`** · `VERIFY_EXIT=0` · FASE 6b: `gen types` **nessuna
  differenza** (la firma della RPC non cambia, cambia il corpo) · `tsc` 0.
  🟠 Riferiti: `firma_ddc_sha256` e `prescrizione_id` sono **due chiavi morte dello stesso oggetto
  trattate in modo opposto** (tenuta a `null` l'una, tolta l'altra), misurate **entrambe 0/6**, senza
  decisione numerata che dica quale sia la regola.
  🛑 **Questa voce mancava dalla mappa di recupero fino al 08/08 17:30**: il compito era fatto, salvato e
  con resoconto, ma il documento che serve **proprio a non perdere i compiti** non lo sapeva. Aggiunta
  all'apertura della sessione successiva. *La mappa di recupero è l'ultimo posto in cui ci si può
  permettere un buco.*

- **ATTO-UNICO-C-sexies: COMPLETO** (`f595f171`, revisione **APPROVATO CON RILIEVI**, **zero critici**)
  — esegue **D320**: `paziente_nome_snapshot` esce dalle **due** allowlist (TypeScript
  `correzioni.ts`, e SQL dentro `correggi_e_riemetti_atomica` — migration **`20260808154033`**, applicata
  e **nel ledger**; pavimento nuovo). **Sette nomi → SEI.** Nessuna colonna cancellata; generatore,
  precheck, `PATCHABLE_FIELDS`, `riemetti_ddc_atomica`, `PATCH /api/pazienti/[id]` e il foglio **intatti**.
  📈 `5621 | 68 su 454` → **`5628 | 68 su 454`** (+7, zero cancellate) · `VERIFY_EXIT=0` **rilanciato dal
  revisore**, non ricopiato · FASE 6b: `gen types` **nessuna differenza** (`GEN_EXIT=0`, `diff` vuoto) ·
  **R-P4: 7 su 8** (l'ottava è una controprova voluta — `paziente_id` da solo **resta** correggibile, e
  deve restare verde con entrambe le regole).
  ✅ **LE QUATTRO AFFERMAZIONI DELL'ESECUTORE, TUTTE E QUATTRO CONFERMATE dal revisore**, due con sonde
  che l'esecutore non aveva fatto: la riga del `SET` tolta è sicura (**provato in positivo**: copia
  usa-e-getta col `SET` di `richiedente_nome` tolto e il nome lasciato in allowlist → `P0001 … chiavi
  accettate ma NON atterrate su lavori: {richiedente_nome}` — **la guardia d'atterraggio esiste
  davvero**) · **zero scrittori** su censimento più largo (`prokind` senza filtro, tutti gli schemi,
  6 trigger su `lavori` e `pazienti`) · corpo del file committato **byte-identico** al corpo vivo
  (355=355) · `REVOKE` portante (`SET LOCAL ROLE authenticated` → `42501`).
  🔑 **UN DATO CHE VALE PIÙ DEL COMPITO, misurato dal revisore:** il file di prova **vecchio** contro il
  codice **nuovo** dà **1 fallita su 49** — cioè prima di questo compito l'intero cambiamento era
  sorvegliato da **una sola asserzione**. *Quanto una modifica sia coperta si misura così, non contando
  le prove che passano.*
  🔴 **QUATTRO DIFETTI DEL BRIEF, tutti dell'orchestratore**, il primo serio: ① **«si corregge in
  anagrafica» non vale sempre** — `PATCH /api/pazienti/[id]` scrive su `pazienti`, nessun trigger
  propaga, e `generate-ddc.ts:304` legge lo snapshot **per primo**: la destinazione vale dove lo snapshot
  è nullo, **298 lavori su 299**. 🛑 E l'unica riga che ce l'ha (`TEST-DdC-001`, snapshot `'F.R.'`) ha
  **`paziente_id = NULL`**: quel nome **non è più correggibile da nessuna strada**, e su quel lavoro lo
  snapshot è **l'unica cosa che soddisfa l'elemento 4 dell'Allegato XIII** al cancello di consegna
  (`precheck.ts:99-101`) — *una colonna senza scrittori regge un cancello di consegna* · ②
  `fondiCorrezioni` non può più riparare l'embed su un lavoro con snapshot (non è una regressione: è una
  riparazione che il Task D non potrà offrire) · ③ **`007_rpc_rifacimento.sql:52-60` non è la verità
  viva** — il corpo vivo di `crea_rifacimento_atomico` **non nomina affatto** la colonna (terza volta
  in quest'ondata che un file superato passa per vivo) · ④ P3 del piano sbagliava la **provenienza**
  della riga con lo snapshot (non è la fixture del seed; il numero 1/299 era giusto).
  🟠 **R1 — L'UNICO RILIEVO CHE NON SI PUÒ SOLO ACCODARE, e sta nel CATALOGO VIVO:** la riga 8 del corpo
  vivo dice `-- 🧬 L'ALLOWLIST — SETTE NOMI SCRITTI A MANO` sopra un elenco di **sei**. 🛑 **Si
  auto-propaga**, perché la regola di casa è *ribattere il corpo dal catalogo*: chi riemette la funzione
  ricopia la riga sbagliata. ➡️ **Chiunque emetta una `CREATE OR REPLACE` su
  `correggi_e_riemetti_atomica` corregge quella riga NELLO STESSO ATTO, prima di ribattere il corpo.**
  Scritto anche nel piano. ⚠️ Attenuante misurata: tre righe più sotto c'è la storia esatta
  («*erano otto fino a D319 e sette fino a D320*»), quindi il lettore attento vede la contraddizione
  subito. I due gemelli in TypeScript (`correzioni.ts` «le otto chiavi» e «i cinque testi») sono stati
  **chiusi dall'orchestratore** chiudendo la revisione.
  🟠 Altri riferiti, **preesistenti e non toccati**: `anon`/`authenticated` hanno `UPDATE` sulla colonna
  (default Supabase, due politiche RLS di UPDATE presenti) — **domanda di perimetro vera**, perché
  un'allowlist applicativa non protegge da una scrittura diretta · l'indice GIN `idx_lavori_search` è
  **inerte** (la ricerca è `ilike('descrizione')`, `textSearch`/`to_tsquery` **zero occorrenze** in
  `src/`) · `lavori/[id]/route.ts:69-73` motiva ancora l'esclusione con «*nessun writer nel form React
  attuale*» — che CLAUDE.md §9 chiama «un buco che aspetta» — mentre **da D320 una ragione vera c'è**.
  ⚠️ **Limiti dichiarati dal revisore, e vanno letti:** nessuna prova a schermo · **`PATCH
  /api/pazienti/[id]` NON esercitato dal vivo**, ed è l'anello su cui poggia l'intera tesi «il nome si
  corregge altrove» · nessun PDF generato · nessun giro HTTP · RLS letta ma non esercitata.

- **ATTO-UNICO-D: COMPLETO** (`b88fc37c` · `bd0175bc` · `80ba8ca9`, revisione **APPROVATO CON RILIEVI**,
  **zero critici, QUATTRO importanti** → passano al **D-ter**). ⚖️ **D322, variante A**: il passo di
  correzione esiste a schermo, ordine `motivo → correzione → dettagli → proposta/esito`, **solo** per
  `errore_dato_dichiarazione`. 🔑 **È il primo pezzo di quest'ondata che SI VEDE.**
  📈 `5628 | 68 su 454` → **`5649 | 68 su 454`** (+21) · `VERIFY_EXIT=0` **rilanciato dal revisore** e
  identico · **R-P4: 18 su 20** (primo rosso 19/20) · **21 mutazioni su 21** viste diventare rosse
  dall'esecutore, **14 dal revisore**, e la caccia alla decorazione (tutti i motivi instradati al
  percorso vecchio) accende **20 delle 21 prove nuove**: **nessuna decorazione**.
  ✅ **Il gettone:** proprietà obbligatoria `documento: VociDocumento`, composta da `SchedaLavoroV3` con
  la funzione pura `vociDelDocumento(lavoro)` — *si entra con un lavoro e si esce con tutto,
  `updated_at` compreso*, così **la firma stessa impedisce di rinfrescare un valore lasciando indietro
  il gettone**. Viaggia intatto, e la prova lo sorveglia con un valore **che porta i microsecondi**.
  🔴 **DUE DIFETTI DEL BRIEF, entrambi dell'orchestratore, e il primo è grave:**
  ① 🛑 **IL MOCKUP APPROVATO DISEGNAVA `elementi` COME CAMPO DI TESTO, e un campo di testo lì prende
  422 A OGNI INVIO**: `PrescrizioneContenuto.elementi` è `number[]`, `normalizzaContenuto` scarta un
  `elementi` non-numerico e `validaCorrezioni` **rifiuta ciò che è stato scartato**. 🔑 **È la stessa
  confusione fra valore MOSTRATO e valore DA MANDARE** che il brief segnalava per `denti_coinvolti` —
  scritta e poi commessa nello stesso documento. **E le prove unitarie sarebbero rimaste verdi**, perché
  il rifiuto arriva dal server: sarebbe uscito al primo uso vero. Chiuso riusando **l'odontogramma che
  esiste già**. ② **il brief non scioglieva dove sta il tasto finale**: il Passo 4 lo metteva in fondo
  all'elenco (come il mockup), ma la variante A mette l'elenco **prima** delle quattro caselle — insieme
  descrivevano **un tasto che promette un atto e poi apre altre quattro domande**. Sciolto: sull'elenco
  «Continua», il tasto vero dopo le caselle. ③ minore: `{"denti_coinvolti": []}` **non** cancella i denti
  da questa rotta — `primoVuoto` lo rifiuta con 422.
  🔑 **DUE CORREZIONI DELL'ESECUTORE A SÉ STESSO, e la seconda vale come lezione:** una prova sul
  paziente era **decorazione** (`queryByLabelText` è vero anche su una pagina vuota) — riscritta contando
  i campi scrivibili · **il nastro del percorso mancava del tutto**, e non era neppure fra gli
  scostamenti dichiarati: *proprio l'elemento che il mockup indica come «ciò che distingue le due
  varianti»*. Aggiunto, con la sua prova.
  🔴 **I QUATTRO RILIEVI DELLA REVISIONE → Task D-ter.** ① 🛑 **il censimento delle prove è incompleto, e
  vale più degli altri tre**: cinque mutazioni del revisore, **45 su 45 verdi tutte e cinque le volte**.
  Delle sei voci solo **tre** hanno un'asserzione sul carico che parte; senza sono `paziente_id`,
  `tipo_dispositivo` e `prescrizione_caratteristiche` — **la trappola del compito, trecento parole di
  resoconto e zero asserzioni**. 🔴 E una sesta, peggiore: **`stato_dispositivo` ricablato sul percorso
  NUOVO non accende niente** → *il difetto del Task A può rinascere sulla strada nuova con la rete tutta
  verde* (la prova di lessico del Task A copre **il solo** percorso corto). ② **un commento nuovo dice il
  FALSO**: dentro `RigaVoce` afferma che in scuro `--bg-deep` è più chiaro di `--card`, mentre
  `ds-v3.css:52` dà `#100E0B` contro `#211D18` — 🔑 *è un commento che dichiara una verifica d'aspetto
  già fatta, quindi **spegne** il gate L2 che dovrebbe accendersi.* ③ **dopo un 409 si resta in un vicolo
  cieco** e ogni ritentativo crea un evento orfano. ④ **F1 rende quel 409 l'esito PROBABILE.**
  🟠 **Riferiti dall'esecutore, confermati dal revisore, non corretti:** **F1** — dopo una modifica dal
  foglietto della scheda il gettone locale resta **stantìo** (`ModificaRigaSheet` passa al padre il patch
  della **richiesta**, non la **risposta**, benché la PATCH restituisca `updated_at`): chi corregge le
  note e poi apre «Devo intervenire» prende **un 409 che dà la colpa a «qualcun altro»**. Fail-closed,
  nessun dato perso; la ricetta giusta è già in casa (`handleColoreSalvato`) · **F2**
  `tipo_dispositivo` entra nell'atto unico **senza controllo di vocabolario** (l'unico argine è la CHECK,
  che scatta **dopo** il render del PDF) · **F3** la carta stampa «Protesi **F**issa», la schermata
  «Protesi fissa».
  🛑 **E UNA COSA CHE NESSUNO DEI DUE HA FATTO, dichiarata da entrambi:**
  `scripts/guardia-navigazione-overlay.mjs` **non è stata lanciata**, benché il passo nuovo aggiunga
  **due navigazioni da dentro un overlay**. È **manuale** (vuole l'app accesa, le credenziali del banco e
  una fixture preparata). ➡️ **Va al Task D-bis**, che l'app accesa ce l'ha già.
  ⚠️ **Candidato numero uno a un ❌ al gate L2, segnalato da entrambi:** **l'odontogramma dentro il
  foglio**, nato per una pagina intera e con token **v2.3**. Più le tinte delle quattro superfici nuove
  (**scostamento numero sette, non dichiarato**: il mockup scrive `--elv`, il codice `--bg-deep`).

> 🔑 **IL FILO DELLA GIORNATA, e vale più di ogni singolo compito: QUATTRO VOLTE una prova che non
> poteva fallire.** ① `now()` è costante in transazione → la sonda sul conflitto era verde per forza ·
> ② `scripts/psql.mjs` si collega come **`postgres`**, cioè come proprietario → ogni sonda sui permessi
> senza `SET LOCAL ROLE` non provava niente · ③ la fixture viveva nell'anno che faceva **coincidere per
> caso** il valore ereditato · ④ il finto rispondeva **per ordine di chiamata** e inghiottiva i filtri →
> le prove restavano verdi **con le letture invertite**. *Nessuna era una svista: tutte e quattro erano
> prove scritte bene che non avevano modo di accendersi.*

> 🛑 **E IL LIMITE CHE RESTA, dichiarato da tutti e quattro gli esecutori: NULLA DI QUESTA ONDATA HA MAI
> GIRATO CONTRO POSTGRES DA UN CHIAMANTE REALE.** Tre migration e una rotta sono verdi su prove unitarie
> **col contratto finto** — e i finti hanno già mentito una volta. ➡️ **Il Task 10 non è l'adempimento di
> chiusura: è il primo momento in cui sapremo se i pezzi si parlano.**
