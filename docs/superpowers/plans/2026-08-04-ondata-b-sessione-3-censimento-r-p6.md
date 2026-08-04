# Registro R-P6 — Censimento degli identificatori, sessione ③ ondata B

**Quando:** 4 agosto 2026, sera (`provato:` `date` → `Tue Aug 4 18:00:37 CEST 2026`, sonde eseguite ~19:15).
**Come:** 6 censori paralleli (workflow `wf_c3b73d11-d32`), ognuno su una superficie, con l'ordine di
citare file:righe VERI e di segnalare come SORPRESA ogni contraddizione con le attese.
**Consumato da:** `2026-08-04-ondata-b-sessione-3-wizard-scheda.md` (il piano della ③).

---

========================= SUPERFICIE 1 =========================
SUPERFICIE 1 — Wizard «Nuovo lavoro» lato client+server: stato del wizard (WizardNuovoLavoro/PassoPaziente), orchestrazione creazione (crea-lavoro.ts), esito «Fatto!» (FrameFatto), POST /api/lavori con gate 'prescrizione' (D216) + componiSnapshot + risolviColoreCaso, persistenza 24h (persistenza.ts)
  identificatori: 36 · letture: 11

· StatoWizard [simbolo-esportato] — src/components/features/wizard/WizardNuovoLavoro.tsx:50-59
  P37 aggiunge qui le chiavi nuove (richiedente_nome/istituzione_sanitaria). Importato da PassoPaziente.tsx:33, persistenza.ts:10, tests/unit/PassoPaziente.test.tsx:6. Chiavi attuali: passo, cliente, tipo, pz, alias, elemento, colore, foto. STATO_INIZIALE (module-private, :61-70) va esteso in pari.
· colore (stato wizard) [chiave-json] — WizardNuovoLavoro.tsx:57 · PassoPaziente.tsx:91-98 · crea-lavoro.ts:239,323,360
  La casella del Passo 3 su cui la ③ innesta il framing trascrizione (D223 var. B). UN valore, DUE destini: normalizzato client-side (:323 trim+toUpperCase) → colore_codice del POST; per la trascrizione D210 vuole il testo COME DIGITATO → la ③ deve mandare `colore` grezzo, MAI `coloreCodice`.
· pz / alias / elemento / foto [chiave-json] — WizardNuovoLavoro.tsx:54-58 → crea-lavoro.ts:243,255,271,306,397
  pz→codice_paziente (riuso o POST /api/pazienti), alias→cognome, elemento→mappaElementi→denti[], foto→immagine 'impronta'. Il payload di creaLavoroDaWizard si allarga con P37.
· salvaStato payload (enumerazione a mano) [chiave-json] — WizardNuovoLavoro.tsx:161-173 · riprendi :180-189
  Le chiavi persistite sono elencate UNA PER UNA (v, salvatoA, userId, labId, passo, cliente, tipo, pz, alias, elemento, colore — foto esclusa). Un campo P37 aggiunto a StatoWizard ma non qui NON sopravvive al reload SENZA errore di compilazione (StatoSalvato non lo richiede): esattamente la classe R-P6 «smette di salvarsi in silenzio».
· StatoSalvato [simbolo-esportato] — src/lib/wizard/persistenza.ts:12-24
  Specchio manuale delle chiavi di StatoWizard. Versione `v: 1` (:13, guardia :69) e CHIAVE_WIZARD 'ua:wizard-lavoro:v1' (:26): aggiungere campi opzionali è retro-compatibile, campi obbligatori richiedono decidere il destino dei salvataggi v1 esistenti.
· creaLavoroDaWizard [simbolo-esportato] — src/lib/wizard/crea-lavoro.ts:233-242 (firma input) · chiamato in WizardNuovoLavoro.tsx:371-380
  La ③ ne estende l'input (P37 + trascrizione). Test che ne fissano il contratto con toEqual: tests/unit/crea-lavoro.test.ts:8, crea-lavoro-denti.test.ts:2 (sei toEqual sull'esito, v. commento :100-104).
· POST /api/lavori (body dal wizard) [route] — crea-lavoro.ts:328-362 (client) · src/app/api/lavori/route.ts:89-363 (server)
  Chiavi mandate OGGI: cliente_id, paziente_id, tipo_dispositivo, descrizione, data_consegna_prevista, classe_rischio, denti[]?, colore_codice?. NON manda: prescrizione, richiedente_nome, istituzione_sanitaria — sono i tre innesti della ③.
· denti[].fdi / ruolo:'elemento' / provenienza:'prescritto' [chiave-json] — crea-lavoro.ts:342-359 · route.ts:202-209 (validaDenti) · componi-snapshot.ts:35-37
  componiSnapshot filtra provenienza==='prescritto' per comporre contenuto.elementi: i denti del wizard sono già tutti 'prescritto', quindi la trascrizione degli elementi nasce gratis dal payload esistente.
· prescrizione (gate D216) [chiave-json] — route.ts:211-245 (gate `body.prescrizione !== undefined` a :221)
  ESISTE GIÀ lato server, completo: 422 se non-oggetto (:223-224), 422 se colore non-stringa (:230-231), 422 se numero_prescrizione non-stringa (:233-234). Chi DEVE mandarla: creaLavoroDaWizard — oggi non la manda mai. Forma: {colore?: string COME DIGITATO, numero_prescrizione?: string}.
· componiSnapshot / PrescrizioneInput [simbolo-esportato] — src/lib/prescrizione/componi-snapshot.ts:20-24,31-52 · usato in route.ts:22,245
  Puro, server-side. Ritorna {contenuto:{elementi?,colore?}, numero_prescrizione}|null. Stringa vuota = niente trascritto; «solo spazi» si preserva (D210, no trim). null → p_prescrizione OMESSA (route.ts:302, M-T3-2: jsonb 'null' ≠ SQL NULL). La ③ non tocca il modulo, ne consuma il contratto.
· p_prescrizione [chiave-json] — route.ts:302 · migrations/20260804152403:36 (DEFAULT NULL),120-125 · database.types.ts:6149 (opzionale)
  Quarto parametro di lavoro_crea_atomico. INSERT in lavori_prescrizioni con solo (laboratorio_id, lavoro_id, contenuto, numero_prescrizione): la fonte NON nasce alla creazione — arriva solo via allega_fonte, coerente col CTA «Allega la prescrizione».
· 'prescrizione' (categoria foto) [categoria] — FrameFatto.tsx:185 (fd.append('categoria','prescrizione'))
  Confermata la posizione attesa. Il commento D97 (:174-184) motiva il valore attuale: con il CTA nuovo che torna «Fotografa l'impronta», valore e commento vanno riscritti insieme.
· 'impronta' (categoria foto) [categoria] — crea-lavoro.ts:401 (fd.append('categoria','impronta'))
  Confermata la posizione attesa (passo 4 fail-soft del wizard, commento D97 :395-396: l'ambiguità era dell'ALTRO punto). Categorie valide: le 7 di CATEGORIE_FOTO, elenco CHIUSO.
· CATEGORIE_FOTO / isCategoriaFoto [simbolo-esportato] — src/lib/domain/categorie-foto.ts:29-37,51-53
  Unica fonte dei 7 valori; la rotta immagini valida con isCategoriaFoto e risponde 422 al vecchio `descrizione`. Spia migration: tests/unit/categorie-foto-spia-migration.test.ts (citata a :23-27). La ③ usa valori esistenti, non ne aggiunge.
· colore_codice / colore_scala [colonna] — route.ts:263,293-294 · src/lib/api/colore-caso.ts:72-101 · vincoli citati a colore-caso.ts:52-56
  Colore di CASO (default del lavoro). Fuori catalogo → COLORE_SCARTATO {null,null,scartato:true}: il lavoro nasce comunque, il colore si perde E si dice. La scala non viaggia dal wizard: dedotta dal catalogo (48 codici distinti; ambiguità → scarto, :98-99).
· colore_scartato [chiave-json] — route.ts:357-362 (sempre presente nel 201) · crea-lavoro.ts:366,373 (letto `=== true`)
  Ponte server→client dell'esito colore: accende accessoriFalliti 'colore' (:386). Con il framing trascrizione la ③ deve decidere se il colore scartato dal CASO resta comunque TRASCRITTO nello snapshot (D210 dice sì: fedeltà al foglio, non al catalogo).
· AccessorioFallito ('elementi'|'colore'|'foto') [simbolo-esportato] — crea-lavoro.ts:78 · Record ETICHETTE_ACCESSORIO/PRONOME_SINGOLO in FrameFatto.tsx:69-91
  Unione a UNA casa: un quarto membro aggiunto dalla ③ (es. esito trascrizione) spegne la compilazione di FrameFatto finché non ha frase e pronome — è la guardia voluta, non un ostacolo.
· EsitoCreazione / MotivoBloccante ('codice_gia_in_uso') [simbolo-esportato] — crea-lavoro.ts:92-109 · motivoDalCorpo :218-225 · gestito in WizardNuovoLavoro.tsx:415-418
  Sei toEqual in crea-lavoro.test.ts confrontano l'esito PER INTERO: una proprietà nuova sull'esito fa cadere le asserzioni — da mettere in conto se la ③ arricchisce l'esito.
· richiedente_nome [colonna] — route.ts:273 · RPC 20260804152403:54,67 · PATCH allowlist src/app/api/lavori/[id]/route.ts:186 · consumatori: generate-ddc.ts:146, precheck.ts:23, BuonoTemplate.tsx:312
  Il POST la accetta già (`?? null`); il wizard NON la manda mai (verificato: assente da crea-lavoro.ts:332-361). Il mini-foglio «Chi ha prescritto?» (P37) la instrada qui. Già correggibile dalla scheda (TabDati.tsx:224-311).
· istituzione_sanitaria [colonna] — route.ts:278 · RPC 20260804152403:60,83 · PATCH allowlist [id]/route.ts:189 · colonna nata in 20260804150306:89
  Stesso stato di richiedente_nome: server pronto, wizard muto. Per la RPC chiave-a-null e chiave-assente sono lo stesso SQL NULL (commento route.ts:274-277): il wizard può mandarla sempre col `?? null` senza gate.
· crea_rifacimento_atomico — INSERT INTO lavori (clone D221) [colonna] — supabase/migrations/20260804152403:411-444
  CONFERMATO il buco che D221 chiude: la colonna-list del clone NON contiene né richiedente_nome né istituzione_sanitaria — il rifacimento nasce senza prescrittore. Il fix è SOLO aggiungere le due colonne + i due v_lavoro.* nel VALUES. Attenzione alla trappola documentata :373-375: CREATE OR REPLACE azzera proconfig → ridichiarare SET search_path e ri-emettere REVOKE/GRANT (:511-522).
· esito lavoro_crea_atomico ('ok'|'errore' + id/numero_lavoro/stato/dettaglio) [esito-rpc] — 20260804152403:47,127 · letto in route.ts:311-323
  La route controlla tutti e tre i campi. La ③ non cambia l'esito, ma il POST col p_prescrizione passa di qui: un errore nell'INSERT prescrizione abortisce l'intera creazione (nessun exception handler, by design R1).
· esiti lavoro_prescrizione_allega_fonte ('ok'|'non_trovato'|'fonte_tipo_non_valido'|'fonte_congelata') [esito-rpc] — 20260804152403:157,164,176,190 · types database.types.ts:6162
  La RPC dietro il CTA «Allega la prescrizione»/foglio a2. NESSUNA route né UI la chiama oggi (grep: solo database.types.ts + ModificaRigaSheet.tsx/SchedaLavoroV3.tsx): la route del gesto è tutta da costruire nella ③. UPSERT deliberato (lavori pre-ondata senza riga, D101).
· fonte_tipo ('foglio'|'email'|'modulo'|'piattaforma') [membro-allowlist] — 20260804152403:163 (+ CHECK lavori_prescrizioni_fonte_ck citato :139-140)
  Le 4 forme di D202; NULL legittimo (V7). Il foglio a2 deve offrire esattamente questi valori; «fonte senza corpo» la respinge il CHECK 23514, fail-loud.
· esiti lavoro_prescrizione_correggi_typo ('ok'|'non_trovato'|'conflitto'|'congelata'|'senza_prescrizione'|'campo_non_valido') [esito-rpc] — 20260804152403:219,223,232,239,243,258
  Gettone di concorrenza su lavori.updated_at ('conflitto' ritorna il valore corrente); jsonb null RIMUOVE la chiave. La route del gesto typo (ModificaRigaSheet) deve mappare OGNI esito su una frase.
· p_campo ('elementi'|'colore'|'tipo') [membro-allowlist] — 20260804152403:242
  Campi correggibili della trascrizione. 'tipo' è nella lista ma entra nello snapshot solo alla conferma di consegna (D213): il gesto sulla riga «Colore» usa 'colore'.
· esiti lavoro_prescrizione_registra_divergenza ('ok'|'non_trovato'|'congelata'|'senza_prescrizione'|'motivo_non_valido') + divergenze[] [esito-rpc] — 20260804152403:282,289,296,300,313 · append jsonb {campo,motivo,nota,utente_id,registrata_at} :304-309
  'ok' porta anche il conteggio `divergenze`. Non tocca il contenuto (V9/D212).
· p_motivo ('richiesta_dentista'|'esigenza_tecnica'|'materiale_non_disponibile'|'altro') [membro-allowlist] — 20260804152403:299
  Dizionario chiuso del motivo di divergenza — il foglio del gesto typo-vs-divergenza lo espone così com'è.
· «Fotografa impronta e prescrizione» (CTA) [campo-ui] — FrameFatto.tsx:250-252
  Il testo che la ③ sostituisce con la coppia «Allega la prescrizione» (apre foglio a2) → poi «Fotografa l'impronta». Unico TastoPrimario/rosso del frame (vincolo di anatomia, commento :9-10).
· aria-label «Carica la foto di impronta e prescrizione» [campo-ui] — FrameFatto.tsx:259
  SECONDA copia della promessa del CTA, sull'input file nascosto: si dimentica facilmente quando si rinomina il tasto. Va cambiata in pari col CTA e con la categoria a :185.
· card «Il lavoro» / «Consegna suggerita» [campo-ui] — FrameFatto.tsx:228-247 (stileCardTitolo :320-327)
  Il «Fatto! a due carte» attuale: D224 aggiunge la card «La prescrizione» come terza superficie. RigaDato Dentista/Lavoro/Paziente (:231-233): il pattern da riusare.
· riga «Colore» (es. A2) [campo-ui] — PassoPaziente.tsx:91-98 (RigaOpzionale nome="Colore")
  Bersaglio del framing trascrizione D223 variante B. Nota: «Salta» a riga chiusa chiama comunque onCambia('') (:149-152,190) — svuota il valore; comportamento da conservare o ridiscutere col framing nuovo.
· CampoAttivo / pillOnTesto [campo-ui] — PassoPaziente.tsx:35-36,53-68
  Instradamento della dettatura (PillVoce) per campo attivo: un campo nuovo del mini-foglio P37 nel Passo 3 deve entrare nello switch o dichiararsi fuori dal routing voce.
· FrameFatto (props) [simbolo-esportato] — FrameFatto.tsx:112-124 · costruito da CorpoWizard via StatoFatto (WizardNuovoLavoro.tsx:324-333,426-435)
  La card «La prescrizione» (D224) richiede dati nuovi nelle props → StatoFatto → continuaPaziente: tre punti da toccare in fila, tutti enumerati a mano.
· PassoPaziente (props pz/alias/elemento/colore/foto/onCambia/onContinua/inCreazione) [simbolo-esportato] — PassoPaziente.tsx:38-47 · consumato in WizardNuovoLavoro.tsx:533-544
  Componente controllato: ogni campo P37 nuovo passa da qui e da cambiaPaziente (:266-269). Test: tests/unit/PassoPaziente.test.tsx.
· POST/GET /api/pazienti · POST /api/lavori/[id]/immagini [route] — crea-lavoro.ts:250,260,402 · FrameFatto.tsx:186
  Le altre tre chiamate della sequenza fail-soft: la ③ non le cambia ma il censimento le registra perché il flusso CTA nuovo ri-usa la rotta immagini con categoria diversa.

LETTURE (R-P2): src/lib/wizard/crea-lavoro.ts — righe 1-415 (intero) | src/components/features/wizard/WizardNuovoLavoro.tsx — righe 1-583 (intero) | src/components/features/wizard/PassoPaziente.tsx — righe 1-368 (intero) | src/components/features/wizard/FrameFatto.tsx — righe 1-360 (intero) | src/app/api/lavori/route.ts — righe 1-363 (intero) | src/lib/prescrizione/componi-snapshot.ts — righe 1-52 (intero) | src/lib/api/colore-caso.ts — righe 1-101 (intero) | src/lib/domain/categorie-foto.ts — righe 1-88 (intero) | src/lib/wizard/persistenza.ts — righe 1-88 (intero) | supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql — righe 1-522 (intero) | grep componiSnapshot su src/+supabase (5 hit) · grep richiedente_nome/istituzione_sanitaria su src/+supabase (42 hit, tutte censite sopra) · grep importatori di crea-lavoro/WizardNuovoLavoro/FrameFatto/PassoPaziente (21 hit) · grep allega_fonte/ModificaRigaSheet (3 file) · grep RPC in database.types.ts (righe 6144-6186) · ls src/components/features/wizard/ (10 file, nessun foglio a2 esistente)

SORPRESE: Nessuna contraddizione con le attese del piano: FrameFatto:185='prescrizione' ✓, crea-lavoro:401='impronta' ✓, gate D216 già completo server-side ✓, POST già pronto per richiedente_nome/istituzione_sanitaria ✓, clone D221 conferma il buco (entrambe le colonne P37 assenti da 20260804152403:411-444). QUATTRO rilievi però vanno nel piano della ③: (1) TRAPPOLA D210 — crea-lavoro.ts:323 normalizza il colore (trim+toUpperCase) in `coloreCodice`; la trascrizione deve usare la variabile grezza `colore`, riusare `coloreCodice` violerebbe la fedeltà «come digitato». (2) PERSISTENZA MUTA — salvaStato (WizardNuovoLavoro.tsx:161-173) e StatoSalvato (persistenza.ts:12-24) enumerano le chiavi A MANO: un campo P37 aggiunto a StatoWizard ma non lì si perde al reload SENZA alcun errore di compilazione — la classe esatta che R-P6 esiste per uccidere; decidere anche il destino dei salvataggi `v:1` esistenti. (3) COPIA NASCOSTA DEL CTA — l'aria-label a FrameFatto.tsx:259 ripete la promessa del tasto; rinominare il CTA senza toccarla lascia un'etichetta a11y che promette la cosa vecchia. (4) RIFERIMENTO STANTIO — il commento della migration (20260804152403:24-25) dichiara la chiamata a 3 argomenti a «route.ts:225», ma la chiamata reale è a route.ts:264-265 ed è GIÀ condizionalmente a 4 argomenti (:302): il commento fotografa lo stato pre-B, non quello corrente. Inoltre: nessun «foglio a2» esiste oggi nel codice (allega_fonte compare solo nei tipi generati) — la route e la UI del gesto sono da costruire da zero, non da estendere.

========================= SUPERFICIE 2 =========================
SUPERFICIE 2 — Route API dei lavori (ondata B ③): POST /api/lavori con gate 'prescrizione', PATCH /api/lavori/[id] con PATCHABLE_FIELDS e scarto silenzioso, punto d'innesto delle route dei gesti (allega_fonte / correggi_typo / registra_divergenza — RPC già in banca, NESSUNA route le chiama), DELETE 
  identificatori: 52 · letture: 11

· POST /api/lavori [route] — src/app/api/lavori/route.ts:89-363
  Guardie: isSameOrigin :91, getFreshLabContext :96, assertLabOperativo :105. Il wizard P37 della ③ scrive qui — il server è GIÀ pronto (richiedente_nome :273, istituzione_sanitaria :278).
· prescrizione [chiave-json] — src/app/api/lavori/route.ts:211-240
  IL GATE della trascrizione (framing casella colore, D223-B): presenza chiave = si trascrive; assente = chiamata RPC identica al legacy; null/non-oggetto/array = 422 (:223). La ③ vi appoggia la variante B del Passo 3.
· prescrizione.colore [chiave-json] — src/app/api/lavori/route.ts:230-232, src/lib/prescrizione/componi-snapshot.ts:22,41
  COME DIGITATO (D210), solo string, mai trim/uppercase; stringa vuota = non trascritto. È il testo che la casella colore del Passo 3 manda.
· prescrizione.numero_prescrizione [chiave-json] — src/app/api/lavori/route.ts:233-235, componi-snapshot.ts:23,43-46
  Facoltativo; '' → null; {} con numero presente è riga legittima (M-T3-3).
· p_prescrizione [chiave-json] — src/app/api/lavori/route.ts:297-302
  Chiave RPC OMESSA (spread condizionale) quando snapshot null — M-T3-2: jsonb 'null' non è SQL NULL, nascerebbe una riga fantasma. Pattern da rispettare in ogni route nuova che chiama RPC con jsonb.
· cliente_id · tipo_dispositivo · descrizione · data_consegna_prevista [chiave-json] — src/app/api/lavori/route.ts:128-142
  Le 4 obbligatorie del body POST (422 se mancanti); tipo_dispositivo validato su MACRO_SLUGS :140.
· denti [chiave-json] — src/app/api/lavori/route.ts:202-209
  Facoltativa; presente-ma-non-lista = 422 (mai lista vuota silenziosa); validaDenti unica per POST e PUT /denti.
· ora_consegna · priorita · dispositivo_semilavorato · note_interne · paziente_id · tecnico_id · ciclo_id · classe_rischio · da_conformare · codice_iva · natura_iva · colore_scala · colore_codice [chiave-json] — src/app/api/lavori/route.ts:263,272-294
  Facoltative del body POST con default ?? null/'normale'/false/'classe_i'/true/'N4'; colore_scala+codice normalizzate da risolviColoreCaso :263. Chiavi IGNOTE del POST: ignorate in silenzio (prelievo puntuale, nessun loop allowlist).
· colore_scartato [chiave-json] — src/app/api/lavori/route.ts:357-362
  Chiave di risposta 201, SEMPRE presente anche false; con lavoro{id,numero_lavoro,stato} :325.
· PATCH /api/lavori/[id] [route] — src/app/api/lavori/[id]/route.ts:335-506
  Scarto silenzioso chiavi fuori allowlist: commento :378-381, ciclo :382-387 — NON :370-379 come dice l'handoff (lì c'è la .eq della lettura existing).
· GET /api/lavori/[id] [route] — src/app/api/lavori/[id]/route.ts:281-333
  Embed :303-315: cliente, paziente, tecnico, lavorazioni, appuntamenti, immagini, fasi, materiali, ddc, denti — MANCA lavori_prescrizioni: la card «La prescrizione» (D224) e la riga «Colore» non hanno oggi via di lettura da questa risposta.
· /api/lavori/[id]/prescrizione [route] — src/app/api/lavori/[id]/ — NON ESISTE (ls: 17 sottocartelle, nessuna prescrizione)
  Punto d'innesto ③: da creare da zero. Nessuna route chiama oggi le tre RPC (grep: solo database.types.ts e migrations). Modelli in casa: [id]/denti (PUT+RPC), [id]/segnala + [id]/segnala/risolvi (azioni annidate).
· PATCHABLE_FIELDS [simbolo-esportato] — src/app/api/lavori/[id]/route.ts:183-221
  export const SOLO per il test di sentinella (commento :79-81), non per riuso. 35 membri totali (31 nominati + 4 spread LOCKED_PRICE_FIELDS).
· tipo_dispositivo [membro-allowlist] — src/app/api/lavori/[id]/route.ts:184
  Validato MACRO_SLUGS :418-420. D213: entra nello snapshot prescrizione come 'tipo' SOLO alla conferma consegna (RPC), lo snapshot non lo insegue.
· descrizione [membro-allowlist] — src/app/api/lavori/[id]/route.ts:185
  Writer: TabDati.tsx (commento :33-34).
· richiedente_nome [membro-allowlist] — src/app/api/lavori/[id]/route.ts:186
  P37: il mini-foglio «Chi ha prescritto?» della ③ corregge da qui fino alla consegna.
· istituzione_sanitaria [membro-allowlist] — src/app/api/lavori/[id]/route.ts:187-189
  P37 GIÀ in allowlist (ondata B ②, direttiva §9); test tests/unit/lavori-patch-istituzione-sanitaria.test.ts (:68). La ③ non deve aggiungerla: c'è.
· data_consegna_prevista · ora_consegna · priorita · dispositivo_semilavorato · note_interne [membro-allowlist] — src/app/api/lavori/[id]/route.ts:190-194
  Writer TabDati.tsx; priorita anche LavoroCard.tsx (:48-49). Non toccati dalla ③.
· tipo_impronte · disinfettante_usato · lotto_disinfettante · materiali_allegati · anamnesi_bruxismo · anamnesi_difficolta_manuali · anamnesi_precauzioni [membro-allowlist] — src/app/api/lavori/[id]/route.ts:195-201
  Writer TabAccettazione.tsx (:36-38). Non toccati dalla ③.
· effetti_speciali · tecnica_colore · anamnesi_altri_dispositivi [membro-allowlist] — src/app/api/lavori/[id]/route.ts:202-204
  Writer TabClinica.tsx (:39-40). Non toccati dalla ③.
· data_prima_prova · data_seconda_prova · data_terza_prova · spedizione_corriere · spedizione_tracking · spedizione_data_prevista [membro-allowlist] — src/app/api/lavori/[id]/route.ts:205-210
  Writer TabDate.tsx (:45-47). Non toccati dalla ③.
· cliente_id · paziente_id · tecnico_id · ciclo_id [membro-allowlist] — src/app/api/lavori/[id]/route.ts:211-214
  FK validate cross-tenant :447-470 (403 se di altro lab); tecnico_id innesca push A1 :495-503.
· colore_scala [membro-allowlist] — src/app/api/lavori/[id]/route.ts:215-218
  GRUPPO C (Task 12-bis): mai copiata, sempre normalizzata con risolviColoreCaso :411-415 (vincoli lavori_colore_caso_fk/coppia_ck/scala_check, :393-397). ⚠️ Per la riga «Colore» della ③: il CASO si corregge QUI, la TRASCRIZIONE via correggi_typo — due penne su due fatti DIVERSI (eseguito vs prescritto), il gesto typo-vs-divergenza non deve confonderle.
· colore_codice [membro-allowlist] — src/app/api/lavori/[id]/route.ts:219
  Gemella di colore_scala: le due si scrivono insieme o nessuna (:403-415).
· prezzo_unitario · listino_id · codice_iva · natura_iva [membro-allowlist] — src/app/api/lavori/[id]/route.ts:14-19 (LOCKED_PRICE_FIELDS), spread :220
  Rimossi dal payload se incluso_in_fattura :423-427; prezzo_unitario anche 422 se righe di lavorazione attive :434-443.
· numero_prescrizione [membro-allowlist] — src/app/api/lavori/[id]/route.ts:64-68 (ESCLUSO con ragione)
  Vive su lavori_prescrizioni, scrittura via RPC dedicate (ondata B spec §3); la colonna omonima su lavori è legacy (la legge generate-ddc.ts:148 — citato in migration 20260804150306:35-36). La ③ NON deve riaprirlo qui. NB: nemmeno correggi_typo lo copre (campo ∉ elenco :242).
· proposta_dentista · proposta_at [membro-allowlist] — src/app/api/lavori/[id]/route.ts:69-73 (SENTINELLA D7 — mai in allowlist)
  Solo API portale; test lavori-patch-invariante-d7.test.ts.
· numero_cassetta [membro-allowlist] — src/app/api/lavori/[id]/route.ts:74-82 (SENTINELLA — mai in allowlist)
  Solo RPC cassetta_assegna/libera_atomica; test lavori-patch-sentinella-cassetta.test.ts. È il modello di regime citato per le prescrizioni.
· denti_coinvolti · denti_mancanti · denti_impianti · colore_dente · colore_collo · colore_corpo · colore_incisale [membro-allowlist] — src/app/api/lavori/[id]/route.ts:83-182 (SENTINELLA DENTI+COLORE — mai in allowlist)
  Gruppo A denormalizzato dalle RPC, gruppo B senza scrittori; test lavori-patch-sentinella-denti.test.ts. Non toccati dalla ③ ma la tabella di destinazione (:101-182) è il modello R-P6 del file.
· lavoro_prescrizione_allega_fonte [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:141-191; args database.types.ts:6162-6170
  Esiti: non_trovato :157 · fonte_tipo_non_valido :164 · fonte_congelata :176 (V8, DdC attiva + fonte già presente) · ok :190. UPSERT: crea la riga se manca (lavori pre-ondata B). Args: p_lab, p_lavoro, p_fonte_tipo, p_fonte_immagine_id, p_fonte_riferimento. Il CTA «Allega la prescrizione» della ③ arriva qui.
· lavoro_prescrizione_correggi_typo [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:203-259; args database.types.ts:6176-6184
  Esiti: non_trovato :219 · conflitto+updated_at :223 · congelata :232 · senza_prescrizione :239 · campo_non_valido :243 · ok+updated_at :258. Gettone p_atteso_updated_at su lavori.updated_at, che la RPC fa avanzare (:254-256): la route del gesto deve trasportarlo. p_valore jsonb null RIMUOVE la chiave (:246-251).
· lavoro_prescrizione_registra_divergenza [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:265-314; args database.types.ts:6186-6195
  Esiti: non_trovato :282 · congelata :289 · senza_prescrizione :296 · motivo_non_valido :300 · ok+divergenze(conteggio) :313. ⚠️ p_campo NON validato (solo p_motivo): entra libero nel jsonb — la route valida lei, o niente. p_utente lo passa la route (context.userId).
· lavoro_prescrizione_conferma_consegna [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:322-365
  QUARTA RPC, fuori dal mandato ③ ma esistente: esiti non_trovato/senza_prescrizione/congelata/ok+confermata_at; D213 copia tipo_dispositivo in contenuto.tipo.
· REVOKE/GRANT solo service_role [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:512-520
  authenticated NON può eseguire le RPC: le route nuove DEVONO usare getServiceClient() (pattern POST :108).
· fonte_tipo ∈ {foglio, email, modulo, piattaforma} [categoria] — 20260804152403:163 + CHECK 20260804150306:31
  Le 4 forme di D202; NULL legittimo (V7 in attesa di conferma scritta). Il foglio a2 della ③ = 'foglio'.
· campo typo ∈ {elementi, colore, tipo} [categoria] — 20260804152403:242
  Dizionario chiuso di correggi_typo. Il gesto sulla riga «Colore» passa campo='colore'.
· motivo divergenza ∈ {richiesta_dentista, esigenza_tecnica, materiale_non_disponibile, altro} [categoria] — 20260804152403:299
  Dizionario chiuso di registra_divergenza (V9/D212).
· categoria foto 'prescrizione' [categoria] — src/lib/domain/categorie-foto.ts:36 (D91/D92 — quinta, non prima)
  Il CTA «Allega la prescrizione» carica via POST /api/lavori/[id]/immagini con questa categoria (isCategoriaFoto valida: immagini/route.ts:97-104, [imgId] PATCH :75-79). MAI ricopiare l'elenco: si importa isCategoriaFoto (spia migration).
· lavori_prescrizioni.contenuto [colonna] — supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql:23
  jsonb, chiavi note: elementi int[] · colore come digitato · tipo (solo alla conferma, D213). Chiave presente = trascritta; assente = non prescritta (V2).
· lavori_prescrizioni.divergenze [colonna] — 20260804150306:27; entry costruita 20260804152403:304-309
  Array di {campo, motivo, nota, utente_id, registrata_at}; il rifacimento le azzera (default '[]').
· lavori_prescrizioni.fonte_tipo · fonte_immagine_id · fonte_riferimento [colonna] — 20260804150306:31-33
  Le tre colonne della fonte; CHECK fonte_ck :58-60 (fonte dichiarata senza corpo = 23514, fail-loud — il precheck V1 morde in route).
· lavori_prescrizioni.numero_prescrizione · confermata_da · confermata_at [colonna] — 20260804150306:37,41-42
  P38 il numero vive qui; conferma_ck :63 (chi e quando insieme).
· lavori.istituzione_sanitaria [colonna] — 20260804150306:89-92
  P37, nullable (D206②): All. XIII p.1 seconda casella. Persona = richiedente_nome.
· lavori_prescrizioni_fonte_img_fk [colonna] — 20260804150306:53-54 (+ appoggio lavori_immagini_id_lab_uk :7-8)
  FK composita (fonte_immagine_id, laboratorio_id) → lavori_immagini SENZA clausola ON DELETE = NO ACTION: il DELETE dell'immagine-fonte solleva 23503. Vedi sorpresa sull'ordine file-prima-riga-dopo.
· lavori_prescrizioni_lavoro_uk · lavoro_fk · RLS select-only · REVOKE ALL (anche service_role) [colonna] — 20260804150306:48,51-52,71-80
  Una trascrizione per lavoro; scrittura SOLO via RPC SECURITY DEFINER (E8: service_role stesso è revocato sulla tabella).
· DELETE /api/lavori/[id]/immagini/[imgId] [route] — src/app/api/lavori/[id]/immagini/[imgId]/route.ts:148-280
  Cancellazione VERA (D61): storage.remove PRIMA :214, .delete() riga DOPO :227-234. Errore DB: generico, console.error + 500 «Non è stato possibile eliminare la foto» :236-239 — NESSUNA lettura di error.code, quindi un 23503 dalla FK fonte_img NON è distinto. Finestra: solo stato==='consegnato' → 409 :200-205; nessun controllo DdC né riferimento prescrizione.
· PATCH /api/lavori/[id]/immagini/[imgId] [route] — src/app/api/lavori/[id]/immagini/[imgId]/route.ts:20-127
  Allowlist ALLOWED_PATCH_FIELDS = descrizione, categoria, ordine (:17); categoria validata isCategoriaFoto → 422 :75-79; conteggio righe fail-closed :117-124.
· isSameOrigin [simbolo-esportato] — src/lib/utils/csrf.ts:7-18
  Guardia CSRF di OGNI mutazione: Origin assente = PASSA (:9, server-to-server), Origin≠Host = 403. Le route dei gesti la chiamano per PRIMA (pattern: POST route.ts:91, PATCH [id]:339, immagini :24,:152).
· getFreshLabContext + assertLabOperativo + getServiceClient + callRpcWithRetry [simbolo-esportato] — src/app/api/lavori/route.ts:3-9 (import), uso :96-109,264; [id]/route.ts:343-355
  Stack completo che ogni route nuova replica: 401 senza context, 403 senza laboratorioId, guard lab operativo col verbo, service client, retry sulle RPC.
· componiSnapshot · PrescrizioneInput · DentiInput [simbolo-esportato] — src/lib/prescrizione/componi-snapshot.ts:20-52
  Pura, server-side: il client MAI manda testo MDR composto. Ritorno null = niente riga; elementi = solo provenienza 'prescritto' (W20).
· validaDenti/DenteNormalizzato · risolviColoreCaso [simbolo-esportato] — src/lib/domain/denti-validazione (import route.ts:14) · src/lib/api/colore-caso (import route.ts:18, [id]/route.ts:11)
  Le due normalizzazioni UNICHE a monte del DB — classe R3 se duplicate.
· crea_rifacimento_atomico — INSERT INTO lavori senza richiedente_nome/istituzione_sanitaria [colonna] — 20260804152403:411-444 (colonne clonate), :471-479 (clone prescrizione B② già fatto)
  IL FIX D221: la lista colonne del clone NON contiene né richiedente_nome né istituzione_sanitaria — il rifacimento oggi perde entrambe le caselle P37. Il clone dello snapshot prescrizione (contenuto+fonte+numero) invece c'è già; divergenze e conferma azzerate di proposito.

LETTURE (R-P2): src/app/api/lavori/route.ts — righe 1-363 (intero) | src/app/api/lavori/[id]/route.ts — righe 1-506 (intero) | src/app/api/lavori/[id]/immagini/[imgId]/route.ts — righe 1-280 (intero) | src/lib/utils/csrf.ts — righe 1-18 (intero) | src/lib/prescrizione/componi-snapshot.ts — righe 1-52 (intero) | src/lib/domain/categorie-foto.ts — righe 1-80 (parziale: head; il resto è raggruppaPerCategoria, non letto) | src/app/api/lavori/[id]/immagini/route.ts — SOLO grep (righe 7, 85-132: import e blocco categoria) — NON letto intero | supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql — righe 1-92 (intero, il file è 93 righe) | supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql — righe 130-369 e 405-494 lette; righe 1-129 (lavoro_crea_atomico) e 370-404 coperte solo da grep mirati (esiti, istituzione_sanitaria) — NON lette riga per riga | src/types/database.types.ts — righe 6155-6200 (Args delle RPC prescrizione) | find/ls dell'albero src/app/api/lavori/ (23 file route, 17 sottocartelle di [id]/)

SORPRESE: ① RIGHE DELLO SCARTO SBAGLIATE NELL'HANDOFF: lo scarto silenzioso del PATCH sta a [id]/route.ts:382-387 (commento :378-381), NON a 370-379 (lì c'è la lettura di `existing`); anche la citazione in CLAUDE.md §R-P6 (:259-264) è stantia — due riferimenti morti allo stesso blocco. ② IL 23503 ARRIVA DOPO LA DISTRUZIONE DEL FILE: il DELETE immagini rimuove il blob dallo storage PRIMA della riga (:214 prima di :227-234, ordine D61 deliberato); con la FK lavori_prescrizioni_fonte_img_fk (NO ACTION, senza ON DELETE) la cancellazione della riga fallirebbe 23503 → 500 generico (:236-239, error.code mai letto), riga viva ma FILE DELLA FONTE PRESCRIZIONE GIÀ DISTRUTTO e non ripristinabile — la ③ deve mettere un pre-check sul riferimento prescrizione PRIMA dello storage.remove (la finestra attuale guarda solo stato==='consegnato', :200). ③ LE RPC ESISTONO GIÀ, LE ROUTE NO: le tre RPC dei gesti sono in migration 20260804152403 e nei tipi generati, nessuna route le chiama e src/app/api/lavori/[id]/prescrizione/ NON esiste; esiste anche una QUARTA RPC (conferma_consegna) che il mandato non nomina. ④ P37 SERVER-SIDE È GIÀ FATTO: istituzione_sanitaria è già nel POST (:278) e nell'allowlist PATCH (:189) con test dedicato — per il wizard resta solo il client; il clone P37 del rifacimento invece MANCA DAVVERO: l'INSERT di crea_rifacimento_atomico (:411-444) non elenca né richiedente_nome né istituzione_sanitaria (fix D221 confermato necessario, e riguarda ENTRAMBE le colonne, non solo l'istituzione). ⑤ GET [id] NON EMBEDDA lavori_prescrizioni (:303-315): la card «La prescrizione» e la riga «Colore» non hanno oggi una via di lettura — la ③ deve aggiungere l'embed (RLS select per tenant c'è: 20260804150306:73-74). ⑥ correggi_typo copre SOLO elementi|colore|tipo (:242): numero_prescrizione e la fonte NON sono correggibili via typo-RPC — se ModificaRigaSheet promette la correzione del numero, manca la via. ⑦ registra_divergenza NON valida p_campo (solo p_motivo :299): la validazione del campo tocca alla route nuova. ⑧ correggi_typo esige il gettone di concorrenza p_atteso_updated_at su lavori.updated_at e lo fa avanzare (:222-223, :254-258): la route del gesto deve leggere, passare e restituire updated_at, o ogni secondo salvataggio uscirà 'conflitto'.

========================= SUPERFICIE 3 =========================
SUPERFICIE 3 — le RPC vive nel database (catalogo pg_proc del progetto Supabase iagibumwjstnveqpjbwq, interrogato via node scripts/tmp/sql.mjs in sola lettura): lavoro_crea_atomico, crea_rifacimento_atomico e le quattro RPC dei gesti col prefisso vivo lavoro_prescrizione_{allega_fonte, correggi_typo
  identificatori: 42 · letture: 14

· lavoro_prescrizione_allega_fonte [simbolo-esportato] — pg_proc (DB vivo iagibumwjstnveqpjbwq) — firma: (p_lab uuid, p_lavoro uuid, p_fonte_tipo text, p_fonte_immagine_id uuid, p_fonte_riferimento text) → json; SECURITY DEFINER, EXECUTE solo postgres+service_role
  La route del CTA «Allega la prescrizione» (foglio a2) chiama QUESTO nome, non 'allega_fonte' nudo. È un UPSERT: crea la riga lavori_prescrizioni se assente (prosrc r.36-42) — NON ha la guardia senza_prescrizione.
· lavoro_prescrizione_correggi_typo [simbolo-esportato] — pg_proc — firma: (p_lab uuid, p_lavoro uuid, p_campo text, p_valore jsonb, p_atteso_updated_at timestamptz) → json; SECURITY DEFINER, solo service_role
  Il gesto typo della riga «Colore» passa di qui. Lock ottimistico su lavori.updated_at; p_valore NULL/'null' RIMUOVE la chiave dal contenuto (prosrc r.38-43); aggiorna lavori.updated_at e lo restituisce (r.46-50).
· lavoro_prescrizione_registra_divergenza [simbolo-esportato] — pg_proc — firma: (p_lab uuid, p_lavoro uuid, p_campo text, p_motivo text, p_nota text, p_utente uuid) → json; SECURITY DEFINER, solo service_role
  Il gesto divergenza della riga «Colore». Appende a lavori_prescrizioni.divergenze (r.32-40). NON tocca lavori.updated_at e NON ha p_atteso_updated_at: niente lock ottimistico, la route non può passarlo.
· lavoro_prescrizione_conferma_consegna [simbolo-esportato] — pg_proc — firma: (p_lab uuid, p_lavoro uuid, p_utente uuid) → json; SECURITY DEFINER, solo service_role
  V5: scrive confermata_da = p_utente e confermata_at = now() insieme (prosrc r.32-37) e fotografa contenuto.tipo ← lavori.tipo_dispositivo (r.35, D213). p_utente NULL NON è validato in funzione: abortisce col CHECK 23514, fail-loud (commento r.29-31).
· lavoro_crea_atomico [simbolo-esportato] — pg_proc — firma: (p_lab uuid, p_lavoro jsonb, p_denti jsonb, p_prescrizione jsonb DEFAULT NULL) → json; SECURITY DEFINER, solo service_role
  La via del wizard (P37 incluso). p_prescrizione NULL = nessuna riga in lavori_prescrizioni, non una riga vuota (V2, prosrc r.84-89). La chiave 'tipo' NON entra nel contenuto alla creazione — solo alla conferma (commento r.79-83).
· crea_rifacimento_atomico [simbolo-esportato] — pg_proc — firma: (p_lavoro_originale_id uuid, p_motivo text, p_rilevato_in text DEFAULT NULL, p_costo_interno numeric DEFAULT NULL, p_note text DEFAULT NULL) → json; SECURITY DEFINER, solo service_role
  Bersaglio del fix D221: la colonna-list del clone (prosrc r.26-42) NON include richiedente_nome né istituzione_sanitaria — il rifacimento oggi nasce senza P37. Clona già la prescrizione (contenuto+fonte+numero, r.86-94) MA non divergenze/conferma (D212).
· esito: 'ok' [esito-rpc] — allega_fonte r.44 · correggi_typo r.50 (+updated_at) · registra_divergenza r.42 (+divergenze=conteggio) · conferma_consegna r.39 (+confermata_at) · lavoro_crea_atomico r.91 (+id, numero_lavoro, stato:'ricevuto')
  Ogni 'ok' porta chiavi accessorie DIVERSE: le route ③ le leggono per aggiornare la UI senza rifetch.
· esito: 'non_trovato' [esito-rpc] — allega_fonte r.11 · correggi_typo r.11 · registra_divergenza r.11 · conferma_consegna r.12
  Lavoro assente/di altro lab/soft-deleted (filtro deleted_at IS NULL + laboratorio_id). Comune alle 4 lp.
· esito: 'congelata' [esito-rpc] — correggi_typo r.24 · registra_divergenza r.18 · conferma_consegna r.26
  DdC con stato <> 'annullata' esistente. ORDINE GUARDIE (nota 9 piano ②, verificato sul vivo): in correggi_typo e registra_divergenza viene PRIMA di senza_prescrizione; in conferma_consegna viene DOPO. Asimmetria reale.
· esito: 'senza_prescrizione' [esito-rpc] — correggi_typo r.31 · registra_divergenza r.25 · conferma_consegna r.19
  ASSENTE in allega_fonte (che upserta e crea la riga). Le route dei gesti devono mappare questo esito; la route allega no.
· esito: 'fonte_congelata' [esito-rpc] — allega_fonte r.30
  Nome DIVERSO da 'congelata'. Scatta SOLO se una fonte esiste GIÀ (una delle 3 colonne non-NULL) E c'è DdC attiva (r.21-31): con DdC attiva ma fonte assente, l'allegato PASSA.
· esito: 'fonte_tipo_non_valido' [esito-rpc] — allega_fonte r.17-19
  p_fonte_tipo fuori dalle 4 forme di D202. NULL è legittimo (V7: riferimento in attesa di conferma scritta).
· esito: 'conflitto' [esito-rpc] — correggi_typo r.14-16
  Lock ottimistico: p_atteso_updated_at IS DISTINCT FROM lavori.updated_at. Restituisce l'updated_at vero. Solo correggi_typo ce l'ha.
· esito: 'campo_non_valido' [esito-rpc] — correggi_typo r.34-36
  p_campo NULL o fuori da ('elementi','colore','tipo').
· esito: 'motivo_non_valido' [esito-rpc] — registra_divergenza r.28-30
  p_motivo NULL o fuori dai 4 motivi. Il p_campo invece NON è validato (aperto).
· esito: 'errore' + 'dettaglio' [esito-rpc] — lavoro_crea_atomico r.10-12
  'progressivo non generato' — unico esito d'errore json della RPC di creazione.
· ritorno {lavoro_nuovo_id, numero_lavoro} SENZA chiave 'esito' [esito-rpc] — crea_rifacimento_atomico r.104; errori via RAISE EXCEPTION r.10 e r.12-13
  Contratto DIVERSO dalle altre 5: niente busta {esito}, errori come eccezioni SQL. Il clone P37 (D221) non deve cambiare questo contratto.
· updated_at [chiave-json] — correggi_typo r.15 (esito conflitto) e r.50 (esito ok)
  La route del gesto typo la rimanda al client per il round successivo del lock ottimistico.
· divergenze (conteggio) [chiave-json] — registra_divergenza r.40-42 (jsonb_array_length)
  Nell'esito ok è un NUMERO (conteggio post-append), non l'array.
· confermata_at [chiave-json] — conferma_consegna r.37-39
  Il 'quando' di V5, restituito al chiamante.
· p_campo = 'colore' | 'elementi' | 'tipo' [membro-allowlist] — correggi_typo r.34 (dizionario CHIUSO)
  'colore' è il membro che la riga «Colore» della scheda usa nel gesto typo. 'tipo' è correggibile qui pur entrando nel contenuto solo alla conferma.
· p_campo (registra_divergenza) — APERTO [membro-allowlist] — registra_divergenza r.34: p_campo entra nel jsonb SENZA alcuna validazione
  CONFERMA della nota 2 del piano ②: il dizionario è aperto nel prosrc vivo. Qualsiasi stringa (o NULL) diventa 'campo' della divergenza.
· p_motivo = 'richiesta_dentista' | 'esigenza_tecnica' | 'materiale_non_disponibile' | 'altro' [membro-allowlist] — registra_divergenza r.28
  Dizionario CHIUSO dei motivi di divergenza — il foglio del gesto divergenza offre questi 4.
· fonte_tipo = 'foglio' | 'email' | 'modulo' | 'piattaforma' [membro-allowlist] — allega_fonte r.17 + CHECK lavori_prescrizioni_fonte_tipo_check (pg_constraint, DB vivo)
  Le 4 forme di D202, doppiate RPC+tabella. NULL legittimo (V7). Il foglio a2 sceglie fra queste.
· lavori_prescrizioni.contenuto [colonna] — information_schema (DB vivo): jsonb NOT NULL DEFAULT '{}'
  Chiavi vive: elementi/colore/tipo. Il colore resta COME DIGITATO, mai normalizzato (commento lavoro_crea_atomico r.79-83, D214). Il framing trascrizione del Passo 3 scrive qui via p_prescrizione.
· lavori_prescrizioni.divergenze [colonna] — DB vivo: jsonb NOT NULL DEFAULT '[]'
  Append-only via registra_divergenza. NON clonata nel rifacimento (crea_rifacimento r.78-94, D212): riparte da '[]'.
· lavori_prescrizioni.fonte_tipo / fonte_immagine_id / fonte_riferimento [colonna] — DB vivo, tutte nullable; CHECK fonte_ck; FK composita fonte_img_fk → lavori_immagini(id, laboratorio_id)
  Le 3 colonne della fonte che il foglio a2 scrive via allega_fonte; clonate nel rifacimento (r.88,91).
· lavori_prescrizioni.numero_prescrizione [colonna] — DB vivo: text nullable; scritta da lavoro_crea_atomico r.85-88; clonata da crea_rifacimento r.88,91
  Viaggia col wizard (p_prescrizione->>'numero_prescrizione') e col clone.
· lavori_prescrizioni.confermata_da / confermata_at [colonna] — DB vivo: uuid/timestamptz nullable; FK confermata_da → utenti(id); CHECK conferma_ck
  Il chi/quando di V5. NON clonate nel rifacimento: la conferma riparte da NULL (D212).
· lavori.richiedente_nome [colonna] — DB vivo: text nullable; letta da lavoro_crea_atomico r.18,31; ASSENTE dalla colonna-list del clone (crea_rifacimento r.26-42)
  Metà del P37. Nel wizard è GIÀ cablata nella RPC viva; nel rifacimento va aggiunta al clone — è il fix D221.
· lavori.istituzione_sanitaria [colonna] — DB vivo: text nullable; lavoro_crea_atomico r.24,47 (commento «AGGIUNTA B② — P37, colonna nata nel Task 2»); ASSENTE dal clone r.26-42
  Seconda casella Allegato XIII p.1. GIÀ viva lato wizard-RPC; manca SOLO nel clone del rifacimento (D221).
· p_lavoro->>'istituzione_sanitaria' (e 'richiedente_nome') [chiave-json] — lavoro_crea_atomico r.47 e r.31
  Le chiavi che la route del wizard P37 (mini-foglio «Chi ha prescritto?») deve mettere nel payload: la RPC viva le legge GIÀ.
· p_prescrizione->'contenuto' e p_prescrizione->>'numero_prescrizione' [chiave-json] — lavoro_crea_atomico r.85-88
  Il framing trascrizione del Passo 3 (D223-B) confeziona questo oggetto; NULL totale = nessuna riga (V2).
· divergenze[]: campo · motivo · nota · utente_id · registrata_at [chiave-json] — registra_divergenza r.33-38 (jsonb_build_object)
  Le 5 chiavi di ogni divergenza appesa. La card «La prescrizione» del Fatto! (D224) e la scheda le rileggono.
· lavori.updated_at [colonna] — correggi_typo r.5-8 (lettura FOR UPDATE), r.14-16 (confronto), r.46-48 (touch)
  Perno del lock ottimistico del gesto typo. registra_divergenza NON lo tocca.
· lavori.tipo_dispositivo [colonna] — conferma_consegna r.6 (lettura) e r.35 (snapshot in contenuto.tipo)
  D213: il 'tipo' della prescrizione si congela solo alla conferma di consegna, copiandolo dal lavoro.
· lavori.colore_scala / colore_codice [colonna] — lavoro_crea_atomico r.21,45-46 (scrittura wizard) · crea_rifacimento r.33,50 (clone, AGGIUNTA G1)
  La riga «Colore» della scheda confronta questi valori del lavoro con contenuto.colore per il gesto typo-vs-divergenza.
· lavori.colore_dente [colonna] — crea_rifacimento r.47-49
  Legacy: «main la legge ancora in produzione», rimozione rimandata all'ondata (c). La ③ NON deve toglierla dal clone.
· lavori_prescrizioni_conferma_ck [simbolo-esportato] — pg_constraint: CHECK ((confermata_da IS NULL) = (confermata_at IS NULL))
  La route di conferma deve saper riconoscere l'abort 23514 (conferma anonima): la RPC non lo intercetta, fail-loud voluto.
· lavori_prescrizioni_fonte_ck [simbolo-esportato] — pg_constraint: CHECK (fonte_tipo IS NULL OR fonte_immagine_id IS NOT NULL OR fonte_riferimento IS NOT NULL)
  Il foglio a2 non può salvare un tipo di fonte senza né immagine né riferimento: abortirebbe 23514 (la RPC non dà un esito parlante per questo caso).
· lavori_prescrizioni_lavoro_uk [simbolo-esportato] — pg_constraint: UNIQUE (lavoro_id)
  Perno dell'ON CONFLICT (lavoro_id) dell'upsert di allega_fonte (r.38): una prescrizione per lavoro.
· dichiarazioni_conformita.stato <> 'annullata' [categoria] — allega_fonte r.26-29 · correggi_typo r.20-23 · registra_divergenza r.14-17 · conferma_consegna r.22-25
  La definizione operativa di «congelata» in tutte e 4 le RPC: esiste una DdC non annullata. Identica parola per parola.

LETTURE (R-P2): /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/scripts/tmp/sql.mjs:1-26 (verifica che lo script sia sola-lettura-per-uso: esegue la query passata, connessione da .env.local) | prosrc vivo lavoro_crea_atomico → dump scratchpad/lavoro_crea_atomico.sql:1-91, letto integrale | prosrc vivo crea_rifacimento_atomico → dump scratchpad/crea_rifacimento_atomico.sql:1-105, letto integrale | prosrc vivo lavoro_prescrizione_allega_fonte → dump scratchpad/lavoro_prescrizione_allega_fonte.sql:1-44, letto integrale | prosrc vivo lavoro_prescrizione_correggi_typo → dump scratchpad/lavoro_prescrizione_correggi_typo.sql:1-50, letto integrale | prosrc vivo lavoro_prescrizione_registra_divergenza → dump scratchpad/lavoro_prescrizione_registra_divergenza.sql:1-42, letto integrale | prosrc vivo lavoro_prescrizione_conferma_consegna → dump scratchpad/lavoro_prescrizione_conferma_consegna.sql:1-39, letto integrale | QUERY Q1 pg_proc sui 6 nomi nudi del mandato (lavoro_crea_atomico, allega_fonte, correggi_typo, registra_divergenza, conferma_consegna, crea_rifacimento_atomico) → 2 righe (solo le due atomiche: i 4 nomi nudi dei gesti NON esistono) | QUERY Q2 pg_proc WHERE prosrc ILIKE '%lavori_prescrizioni%' → 6 righe (le 2 atomiche + le 4 lavoro_prescrizione_*: il censimento per comportamento è chiuso, non esistono altre funzioni che toccano la tabella) | QUERY Q3 prosecdef+proacl WHERE proname LIKE 'lavoro_prescrizione_%' → 4 righe (tutte SECURITY DEFINER, EXECUTE solo postgres+service_role) | QUERY Q4 information_schema.columns su lavori_prescrizioni → 13 righe (colonne complete con default) | QUERY Q5 pg_constraint su lavori_prescrizioni → 9 righe (PK, UK, 3 CHECK, 4 FK di cui 2 composite col tenant) | QUERY Q6 information_schema.columns su lavori per richiedente_nome/istituzione_sanitaria/colore_scala/colore_codice/colore_dente → 5 righe (tutte vive, text nullable) | QUERY Q7 prosecdef+proacl delle 2 atomiche UNION proname LIKE 'lp\_%' → 2 righe (varianti con prefisso lp_: ZERO hit)

SORPRESE: 1) NOMI: i 4 nomi nudi del mandato (allega_fonte, correggi_typo, registra_divergenza, conferma_consegna) NON esistono in pg_proc (Q1: 2 righe su 6 nomi cercati) — i nomi vivi portano il prefisso lavoro_prescrizione_*; nessuna variante lp_ (Q7: 0 hit). Le route dei gesti della ③ devono usare i nomi con prefisso. 2) P37 WIZARD GIÀ INNESTATO LATO DB: lavoro_crea_atomico vivo legge già p_lavoro->>'richiedente_nome' (r.31) e p_lavoro->>'istituzione_sanitaria' (r.47, commento «AGGIUNTA B② — P37... Task 2») — per il wizard la ③ tocca solo UI/route/payload, NON la RPC. 3) allega_fonte NON ha la guardia senza_prescrizione: l'upsert CREA la riga se manca (contenuto default '{}') — un lavoro «senza prescrizione» acquisisce una riga per sola via della fonte; inoltre l'esito di congelamento si chiama 'fonte_congelata' (non 'congelata') e scatta SOLO se una fonte esiste già: con DdC attiva ma fonte assente l'allegato passa (r.21-31). 4) ORDINE GUARDIE ASIMMETRICO (nota 9 piano ②, misurato sul vivo): correggi_typo e registra_divergenza controllano congelata PRIMA di senza_prescrizione (r.20-32 e r.14-26); conferma_consegna fa l'INVERSO, senza_prescrizione prima di congelata (r.15-27). 5) Nota 2 CONFERMATA: p_campo in registra_divergenza è APERTO nel prosrc vivo (r.34, nessuna validazione — perfino NULL passa). 6) registra_divergenza non tocca lavori.updated_at e non ha p_atteso_updated_at: il gesto divergenza non può avere lock ottimistico, quello typo sì. 7) D221 CONFERMATO SUL VIVO: la colonna-list del clone in crea_rifacimento_atomico (r.26-42) non include né richiedente_nome né istituzione_sanitaria — il bersaglio del fix puntuale è esattamente lì (nota a margine: nemmeno ora_consegna e dispositivo_semilavorato sono clonati, ma sono fuori dal mandato ③). 8) FUORI MANDATO, RIFERITO (R-E2, non corretto): crea_rifacimento_atomico non ha parametro tenant e cerca il lavoro SENZA filtro laboratorio_id (r.9: WHERE id = p_lavoro_originale_id) — l'isolamento dipende interamente dal chiamante service_role; inoltre il suo contratto è anomalo: errori via RAISE EXCEPTION e ritorno json senza chiave 'esito' (r.104), diverso dalle altre 5 RPC.

========================= SUPERFICIE 4 =========================
SUPERFICIE 4 — LA SCHEDA E LE IMMAGINI: SchedaLavoroV3 (CardInfo/RigaEditabile/album T12), ModificaRigaSheet (tipo Campo, TITOLI, rami, salva), RigaLavoroDenti (ponte ?tab=clinica), TabImmagini del form (via Galleria), route immagini /api/lavori/[id]/immagini/[imgId] (PATCH+DELETE), allowlist PATCH 
  identificatori: 47 · letture: 14

· Campo (tipo locale, DUE copie) [campo-ui] — ModificaRigaSheet.tsx:24 e SchedaLavoroV3.tsx:96
  'consegna'|'tecnico'|'dentista'|'note' — la ③ aggiunge 'colore'. NON è un tipo condiviso: due definizioni identiche in due file, vanno toccate ENTRAMBE o il compilatore non se ne accorge (il campo passa come stringa via props)
· TITOLI [campo-ui] — ModificaRigaSheet.tsx:26-31
  Record<Campo,string> — 'colore' senza voce qui rompe tsc (Record esaustivo, rete di sicurezza vera). Titoli attuali: 'Data di consegna','Tecnico assegnato','Dentista','Note interne'
· MESSAGGIO_ERRORE [campo-ui] — ModificaRigaSheet.tsx:33
  'Non è stato possibile salvare la modifica. Riprova.' — unico messaggio per tutti i rami; il ramo colore col gesto typo-vs-divergenza avrà esiti RPC parlanti (conflitto/congelata) che questo messaggio appiattirebbe
· salva(patch) [campo-ui] — ModificaRigaSheet.tsx:113-132
  UNICA via al backend di tutti i rami: PATCH /api/lavori/{lavoroId}. Il ramo colore che chiama le RPC dei gesti NON può passare di qui senza biforcare — salva() conosce solo il PATCH
· note_interne [chiave-json] — ModificaRigaSheet.tsx:145 → route.ts:194
  chiave PATCH del ramo note; in PATCHABLE_FIELDS
· data_consegna_prevista + ora_consegna [chiave-json] — ModificaRigaSheet.tsx:227-230 (ValoreConsegna :40-43) → route.ts:190-191
  chiavi PATCH del ramo consegna; i nomi di stato rispecchiano di proposito le colonne DB (patch = stato, senza rimappature)
· tecnico_id [chiave-json] — ModificaRigaSheet.tsx:167 → route.ts:213
  chiave PATCH ramo tecnico; FK → handleSalvato fa router.refresh()
· cliente_id [chiave-json] — ModificaRigaSheet.tsx:177 → route.ts:211
  chiave PATCH ramo dentista; FK → router.refresh()
· PATCHABLE_FIELDS [simbolo-esportato] — src/app/api/lavori/[id]/route.ts:183-221
  allowlist esportata (per il test sentinella); il ciclo :383-387 SCARTA IN SILENZIO ogni chiave fuori lista — una chiave colore sbagliata nel patch non darebbe errore
· colore_scala / colore_codice [membro-allowlist] — route.ts:218-219 + blocco «IL COLORE DI CASO» :389-416
  GIÀ in allowlist (Task 12-bis, GRUPPO C): il default di caso che una riga Colore della scheda può patchare. Mai copiati: normalizzati da risolviColoreCaso; le due chiavi viaggiano sempre insieme
· colore_dente/colore_collo/colore_corpo/colore_incisale [membro-allowlist] — route.ts:83-99 (SENTINELLA DENTI + COLORE) e :123-154
  MAI in allowlist: il per-dente vive in lavori_denti via PUT /api/lavori/[id]/denti. Un ramo colore che patcha questi nomi vedrebbe il dato scartato in silenzio
· istituzione_sanitaria [membro-allowlist] — route.ts:187-189 (colonna: migration 20260804150306:89)
  P37 — GIÀ entrata in allowlist con la sessione ② («nasce dal POST e si corregge da qui fino alla consegna»)
· richiedente_nome [membro-allowlist] — route.ts:186
  P37 — già in allowlist; la casella «persona» dell'All. XIII p.1
· numero_prescrizione (su lavori) [colonna] — route.ts:64-67
  ESCLUSA con ragione scritta: legacy, il fatto vive su lavori_prescrizioni via RPC — riaprirla qui = seconda penna (classe numero_cassetta)
· handleSalvato(patch) [campo-ui] — SchedaLavoroV3.tsx:328-331
  merge locale scalari + refresh SOLO se 'cliente_id'|'tecnico_id' in patch — un colore scritto in lavori_denti o via RPC non rientra in nessuno dei due casi: serve decidere il ramo di riconciliazione
· valoreInizialePer(campo) [campo-ui] — SchedaLavoroV3.tsx:336-347
  switch esaustivo su Campo — il caso 'colore' va aggiunto; oggi legge solo colonne di lavoroLocale
· key={campoAttivo} [campo-ui] — SchedaLavoroV3.tsx:494-505
  lo Sheet si monta FRESCO per campo: il ramo colore erediterà questo ciclo di vita (valoreIniziale letto all'apertura)
· RigaEditabile [campo-ui] — SchedaLavoroV3.tsx:858-877
  guscio <button> + RigaDato, aria-label d'azione — il modello per la nuova riga «Colore» (ariaAzione tipo «Modifica colore»)
· RigaLavoroDenti [simbolo-esportato] — RigaLavoroDenti.tsx:31-128, montata in SchedaLavoroV3.tsx:406-410
  riga «Lavoro»: descrizione + chips FDI da lavoro.denti_coinvolti (denormalizzazione, non lavori_denti). Il colore NON è mostrato in nessun punto della scheda oggi
· denti_coinvolti [colonna] — SchedaLavoroV3.tsx:408; regime GRUPPO A route.ts:113-121
  denorm. riscritta dalle RPC denti; arriva col select('*') di page.tsx. Il commento route.ts:179 la cita a «SchedaLavoroV3.tsx:286» — riferimento stantio (oggi riga 408)
· /lavori/[id]/modifica?tab=clinica [route] — SchedaLavoroV3.tsx:409
  il ponte odontogramma: router.push NUDO (legittimo, non parte da overlay). Secondo ponte parametrico: onRisolvi FlussoConsegna → navigaDaOverlay(`?tab=${route}`) :541 — da overlay MAI push nudo
· LavoroDettaglio.denti (embed opzionale) [campo-ui] — domain.ts:427-431; select page.tsx:23-35
  «Chi mostra o corregge il colore DEVE chiederlo» — la select della scheda NON embedda lavori_denti: una riga Colore con precedenza riga→caso richiede di toccare page.tsx o accontentarsi del solo caso
· risolviColore / SCALE_COLORE / risolviColoreCaso [simbolo-esportato] — src/lib/domain/colore-dente.ts:11,36; src/lib/api/colore-caso.ts (import route.ts:11)
  la precedenza riga→caso per LEGGERE il colore; risolviColoreCaso normalizza il caso nel PATCH (vincoli lavori_colore_caso_fk + coppia_ck: 'a3' minuscolo o mezza coppia = 500)
· eliminabile [campo-ui] — SchedaLavoroV3.tsx:241-245
  stato !== 'consegnato' → la voce Elimina si OMETTE (mai spenta); rispecchia il 409 della route :200-205. La nota 4 (fonte in uso) introduce un secondo motivo di non-eliminabilità che questo boolean non conosce
· voce 'elimina' (TendinaMenu) [campo-ui] — SchedaLavoroV3.tsx:622-646
  bottone di innesco cancellazione → FoglioConferma :649-674 (testo D61 «e dall'archivio») → eliminaFotoCorrente
· eliminaFotoCorrente() [campo-ui] — SchedaLavoroV3.tsx:261-294
  DELETE /api/lavori/{id}/immagini/{imgId}; su OGNI !res.ok mostra l'unico messaggio «Non sono riuscita a eliminare la foto. Riprova.» via useAvvisi().errore — il 23503 «fonte in uso» oggi uscirebbe così, indistinguibile
· DELETE /api/lavori/[id]/immagini/[imgId] [route] — src/app/api/lavori/[id]/immagini/[imgId]/route.ts:148-280
  ordine: guardia esistenza :175-186 → finestra consegnato 409 :200-205 → storage.remove PRIMA :214 → .delete() DOPO :227-234 → deleteError→500 generico :236-239 (QUI arriverebbe il 23503) → conteggio righe :245-252 → traccia fail-soft :267-276 → {ok:true} :279
· lavori_prescrizioni_fonte_img_fk [colonna] — supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql:53-54
  FK composita (fonte_immagine_id, laboratorio_id) → lavori_immagini(id, laboratorio_id), SENZA ON DELETE → NO ACTION → 23503 alla .delete() dell'immagine referenziata. Appoggio: UNIQUE lavori_immagini_id_lab_uk :7-8
· lavori_immagini_eliminazioni [colonna] — [imgId]/route.ts:267-273
  tabella traccia (D63): laboratorio_id, lavoro_id, lavori_immagine_id, storage_path, eliminata_da — scrittura fail-soft dopo il delete
· ALLOWED_PATCH_FIELDS (immagini) [membro-allowlist] — [imgId]/route.ts:17
  'descrizione','categoria','ordine' — PATCH categoria con validazione valore (422 categoria_non_valida :75-79); usata dalla scheda (correggiCategoria :296-325) e da TabImmagini (:329-342)
· categoria 'prescrizione' [categoria] — src/lib/domain/categorie-foto.ts:34
  quinta voce di CATEGORIE_FOTO (D91/D92) — la categoria che il CTA «Allega la prescrizione» e allega_fonte incrociano; guard isCategoriaFoto :51
· via Galleria (input file) [campo-ui] — form/TabImmagini.tsx:388-400 (input, accept='image/*,application/pdf', multiple) + bottone :447-470
  handleFiles(files,false) → FoglioCategoria per gruppo → uploadFile POST /api/lavori/{id}/immagini :244. NESSUNA cancellazione esiste in questo file (v. sorprese)
· lavori_prescrizioni [colonna] — migration 20260804150306:14-64; tipi database.types.ts:3352-3428
  colonne: contenuto (jsonb), divergenze (jsonb []), fonte_tipo, fonte_immagine_id, fonte_riferimento, numero_prescrizione (P38: vive QUI), confermata_da/at; UNIQUE(lavoro_id); RLS SELECT tenant :73-74; REVOKE ALL scrittura ma GRANT SELECT a authenticated+service_role :79-80 (la lettura dalla scheda È possibile — il commento domain.ts:400 parla della sola scrittura)
· contenuto.elementi / contenuto.colore / contenuto.tipo [chiave-json] — migration 20260804150306:19-22; allowlist typo rpc 20260804152403:242
  chiavi note dello snapshot; colore COME DIGITATO (D210), mai normalizzato — la casella colore del Passo 3 (D223-B) scrive qui; tipo entra SOLO alla conferma di consegna (D213)
· lavoro_prescrizione_allega_fonte [simbolo-esportato] — migration 20260804152403:141-191; firma database.types.ts:6162-6171
  RPC SECURITY DEFINER, GRANT solo service_role (:518). Args: p_lab, p_lavoro, p_fonte_tipo, p_fonte_immagine_id, p_fonte_riferimento. UPSERT (lavori pre-ondata senza riga). NESSUN chiamante in src/ oggi: la route del CTA è tutta da creare
· lavoro_prescrizione_correggi_typo [simbolo-esportato] — migration :203-259; firma types :6176-6185
  Args: p_lab, p_lavoro, p_campo, p_valore (jsonb; 'null' RIMUOVE la chiave), p_atteso_updated_at (gettone su lavori.updated_at). Nessun chiamante in src/ oggi
· lavoro_prescrizione_registra_divergenza [simbolo-esportato] — migration :265-314; firma types :6186-6196
  Args: p_lab, p_lavoro, p_campo, p_motivo, p_nota, p_utente. Appende {campo,motivo,nota,utente_id,registrata_at} a divergenze. Nessun chiamante in src/ oggi
· lavoro_prescrizione_conferma_consegna [simbolo-esportato] — migration :322-365; firma types :6172-6175
  QUARTA RPC (non nel brief ③): copia tipo_dispositivo nello snapshot alla consegna; esiti non_trovato|senza_prescrizione|congelata|ok(+confermata_at)
· esiti allega_fonte: non_trovato · fonte_tipo_non_valido · fonte_congelata · ok [esito-rpc] — migration :157,164,176,190
  fonte_congelata = DdC attiva E fonte già presente (V8); riga ancora senza fonte resta completabile anche dopo
· esiti correggi_typo: non_trovato · conflitto(+updated_at) · congelata · senza_prescrizione · campo_non_valido · ok(+updated_at) [esito-rpc] — migration :219,223,232,239,243,258
  la route del gesto typo deve mappare SEI esiti in messaggi; 'conflitto' porta l'updated_at corrente per il retry
· esiti registra_divergenza: non_trovato · congelata · senza_prescrizione · motivo_non_valido · ok(+divergenze) [esito-rpc] — migration :282,289,296,300,313
  'ok' torna il conteggio divergenze (jsonb_array_length)
· allowlist p_campo: 'elementi','colore','tipo' [membro-allowlist] — migration :242
  il gesto sulla riga Colore passa p_campo='colore'; qualsiasi altro nome → campo_non_valido
· allowlist p_motivo: 'richiesta_dentista','esigenza_tecnica','materiale_non_disponibile','altro' [membro-allowlist] — migration :299
  dizionario chiuso del foglio divergenza (V9/D212)
· allowlist fonte_tipo: 'foglio','email','modulo','piattaforma' [membro-allowlist] — migration 150306:31 (CHECK) + rpc :163
  le 4 forme di D202; NULL legittimo (V7 con fonte_riferimento)
· LavoroPrescrizione [simbolo-esportato] — src/types/domain.ts:404-422
  tipo GIÀ scritto dalla ② ma senza NESSUN consumatore: la ③ è il primo lettore
· select scheda (embed) [route] — src/app/(app)/lavori/[id]/page.tsx:21-41
  10 embed (cliente, paziente, tecnico, lavorazioni, appuntamenti, immagini, fasi, materiali, ddc, laboratorio) — NIENTE prescrizione, NIENTE denti. La card «La prescrizione» (D224) e la riga Colore devono estendere QUESTA select (la FK composita lavori_prescrizioni_lavoro_fk consente l'embed PostgREST)
· { ok: true } / { error, motivo } [chiave-json] — [imgId]/route.ts:279 e :77
  forme di risposta della route immagini: il client legge solo res.ok — la nota 4 dovrà aggiungere un motivo distinguibile (es. 409 con motivo 'fonte_in_uso') che eliminaFotoCorrente oggi non sa leggere

LETTURE (R-P2): src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx — INTERO, righe 1-262 | src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx — INTERO, righe 1-877 | src/components/features/lavori/scheda-v3/RigaLavoroDenti.tsx — INTERO, righe 1-128 | src/components/features/lavori/form/TabImmagini.tsx — INTERO, righe 1-754 | src/app/api/lavori/[id]/immagini/[imgId]/route.ts — INTERO, righe 1-280 | src/app/api/lavori/[id]/route.ts — righe 55-234 (allowlist + sentinelle) e 370-430 (ciclo filtro + blocco colore di caso); NON letto il resto (handler PATCH oltre :430, POST push) | src/app/(app)/lavori/[id]/page.tsx — INTERO, righe 1-77 | src/types/domain.ts — righe 390-449 letti + grep 'prescrizione' su tutto il file (hit: 259, 397-422, 614, 623, 1004) | src/types/database.types.ts — righe 3352-3428 (tabella) e 6155-6204 (RPC); resto NON letto (generato) | supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql — INTERO, righe 1-93 | supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql — righe 130-365 e 440-522 lette; 1-129 solo via grep (lavoro_crea_atomico p_prescrizione :36, :115-127) | src/lib/domain/categorie-foto.ts — righe 25-79 (sed+grep export) | src/lib/domain/colore-dente.ts — export via grep (righe 11-110); corpo NON letto | grep repo-wide: lavori_prescrizioni / lavoro_prescrizione_* / allega_fonte / correggi_typo / registra_divergenza in src/ → NESSUN chiamante fuori da types e commenti; from('lavori_prescrizioni') → zero hit

SORPRESE: SETTE, due gravi. ① GRAVE — l'ordine «file prima, riga dopo» della DELETE immagini ([imgId]/route.ts:214 storage.remove, POI :227 .delete()) collide frontalmente con la nota 4: il 23503 di lavori_prescrizioni_fonte_img_fk scatterebbe alla .delete(), quando il file è GIÀ USCITO dall'archivio — resterebbe una riga viva con foto rotta, e la prescrizione punterebbe a una fonte senza file. Il precheck «fonte in uso» DEVE stare PRIMA di storage.remove, non basta mappare l'errore. Oggi deleteError→500 generico, nessuna gestione 23503. ② GRAVE/mandato — TabImmagini.tsx NON contiene NESSUNA cancellazione di immagine (nessun bottone, nessuna DELETE): il mandato chiedeva «la CANCELLAZIONE... quale route chiama» in quel file, ma l'unica via di cancellazione è l'album T12 della scheda (TendinaMenu→FoglioConferma→eliminaFotoCorrente). Inoltre il file sta in features/lavori/form/, non in features/lavori/. ③ Il rifacimento CLONA fonte_immagine_id (rpc :471-479): la stessa immagine può essere fonte di DUE prescrizioni, e la prescrizione del clone referenzia un'immagine appartenente a un ALTRO lavoro — il 23503 può arrivare da un lavoro diverso da quello su cui si sta eliminando, e il messaggio d'errore deve tenerne conto. ④ Il tipo Campo è definito DUE volte (ModificaRigaSheet.tsx:24, SchedaLavoroV3.tsx:96) senza condivisione: 'colore' va aggiunto in entrambi. ⑤ Nessuna lettura di lavori_prescrizioni esiste in src/ (solo tipi e commenti) e la select della scheda non embedda né prescrizione né denti — ma la lettura È permessa (GRANT SELECT a service_role, migration :80): il commento domain.ts:399-400 «REVOKE ALL, service_role compreso» descrive solo la scrittura e può ingannare chi pianifica la card D224. ⑥ Esiste una QUARTA RPC (lavoro_prescrizione_conferma_consegna) non nominata nel brief della ③ — se la ③ tocca il flusso consegna, va censita da chi ha quel mandato. ⑦ Minori: richiedente_nome e istituzione_sanitaria sono GIÀ in PATCHABLE_FIELDS (route.ts:186-189, lavoro della ②, non da fare); il commento route.ts:179 cita «SchedaLavoroV3.tsx:286» per denti_coinvolti ma oggi è la riga 408 (riferimento stantio); il messaggio errore-eliminazione della scheda è unico e generico per ogni !res.ok (SchedaLavoroV3.tsx:270,290) — il 409 «consegnato» e il futuro «fonte in uso» oggi sarebbero indistinguibili.

========================= SUPERFICIE 5 =========================
SUPERFICIE 5 — DOMINIO E TIPI (ondata B, sessione ③). Il «domain.ts» atteso in src/lib/lavori-prescrizioni/ NON esiste: il dominio puro vive in src/lib/prescrizione/componi-snapshot.ts, i tipi in src/types/domain.ts (1007 righe, 58 export), i tipi generati in src/types/database.types.ts. ① Lo snapsh
  identificatori: 31 · letture: 8

· componiSnapshot [simbolo-esportato] — src/lib/prescrizione/componi-snapshot.ts:31-52
  Funzione PURA che compone p_prescrizione. Importata da src/app/api/lavori/route.ts:22 (chiamata a :245) e tests/unit/componi-snapshot.test.ts:2. La ③ NON deve ricomporla client-side: il client manda dati grezzi.
· PrescrizioneInput [simbolo-esportato] — src/lib/prescrizione/componi-snapshot.ts:20-24
  {colore?, numero_prescrizione?} — importata da route.ts:22 (usata a :220-239 per la validazione 422). Se la ③ aggiunge campi al Passo 3, questa è la porta.
· DentiInput [simbolo-esportato] — src/lib/prescrizione/componi-snapshot.ts:26-29
  {fdi, provenienza?} — ZERO importatori esterni (solo uso interno). Default provenienza 'prescritto' a :36.
· contenuto.elementi [chiave-json] — src/lib/prescrizione/componi-snapshot.ts:35-40; supabase/migrations/20260804150306:21
  int[] dei soli fdi 'prescritto', ordine d'ingresso. Chiave OMESSA se vuota (mai []). Membro dell'allowlist typo (:242 della RPC).
· contenuto.colore [chiave-json] — src/lib/prescrizione/componi-snapshot.ts:41
  COME DIGITATO (D210): no trim, no uppercase; '' esclusa, ' ' preservata. La casella colore col framing trascrizione (D223-B) scrive QUI, non su colore_scala/codice del lavoro.
· contenuto.tipo [chiave-json] — supabase/migrations/20260804152403:360 (jsonb_set in conferma_consegna); componi-snapshot.ts:14
  MAI alla creazione (D213): entra SOLO alla conferma di consegna, copiato server-side da lavori.tipo_dispositivo. È però nell'allowlist di correggi_typo (:242).
· numero_prescrizione (snapshot) [chiave-json] — componi-snapshot.ts:43-46,51; migration 150306:37; database.types.ts:3365
  Vive su lavori_prescrizioni (P38); '' → null. Colonna legacy omonima su lavori resta (domain.ts:259, database.types.ts:2484 — la legge generate-ddc.ts:148).
· p_prescrizione [chiave-json] — src/app/api/lavori/route.ts:297-302; migration 152403:36,120-125
  Quarto parametro DEFAULT NULL di lavoro_crea_atomico. Si OMETTE se snapshot null (M-T3-2: JSON null via PostgREST = 'null'::jsonb ≠ SQL NULL → riga fantasma).
· prescrizione (gate del body POST) [chiave-json] — src/app/api/lavori/route.ts:211-240
  La trascrizione nasce SOLO se il client dichiara la chiave; presente ma malformata = 422, null = 422. Il wizard ③ deve mandarla esplicitamente.
· divergenze [colonna] — src/types/domain.ts:409-411 (unknown[]); database.types.ts:3358 (Json); migration 150306:25-27
  Oggi unknown[] con nota «la forma arriva con la sua ondata» — quella ondata è la ③: la forma è GIÀ fissata altrove (voce sotto). Il rifacimento le azzera (152403:463-470).
· {campo, motivo, nota, utente_id, registrata_at} [chiave-json] — migration 152403:303-311 (jsonb_build_object) e :500-501 (COMMENT); migration 150306:26; piano docs/superpowers/plans/2026-08-04-ondata-b-sessione-2-migration-rpc.md:165,245,381,403,523
  La forma fissata della voce di divergenza (V9, D212): il piano della ② dice testualmente «tipizzarla in ③/④». registrata_at = now() server-side.
· LavoroPrescrizione [simbolo-esportato] — src/types/domain.ts:404-422
  ZERO importatori oggi (grep su src+tests: solo la definizione). La ③ sarà il primo consumatore — nessun rischio di rottura, ma nessuna rete esistente.
· LavoroDettaglio [simbolo-esportato] — src/types/domain.ts:427-442
  NON ha un membro `prescrizione` — la riga «Colore» della scheda non può leggere lo snapshot senza aggiungerlo. 10 importatori: pagine lavori/[id] e /modifica, fatture batch+xml, precheck-consegna, SchedaLavoroV3, 4 template PDF.
· LavoroImmagine.categoria [colonna] — src/types/domain.ts:519-521 (string); database.types.ts:3054 (string)
  Ritrovamento ⑦ della ②: tipizzata string invece di CategoriaFoto. Il commento a :519-520 già indica la fonte (src/lib/domain/categorie-foto.ts). SchedaLavoroV3.tsx:682 restringe a runtime con isCategoriaFoto — sintomo del tipo largo. Consumatori di LavoroImmagine: LavoroFormClient.tsx, TabImmagini.tsx, SchedaLavoroV3.tsx (+ test).
· CategoriaFoto [simbolo-esportato] — src/lib/domain/categorie-foto.ts:39 (7 valori, :29-37)
  Il tipo giusto per LavoroImmagine.categoria. Importato da FoglioCategoria.tsx:81, TabImmagini.tsx:11, SchedaLavoroV3.tsx:68. Rete: tests/unit/categorie-foto-spia-migration.test.ts (UNICA, per R27).
· fonte_tipo [membro-allowlist] — CHECK: migration 150306:31; guardia RPC con esito parlante: 152403:163-165; unione TS: domain.ts:412; generato string|null: database.types.ts:3361
  Le 4 forme D202: 'foglio'|'email'|'modulo'|'piattaforma'. NULL legittimo (V7: fonte_riferimento in attesa di conferma scritta). Le 4 stringhe in src esistono SOLO in domain.ts:412 — il foglio a2 della ③ non ha ancora una costante-lista da cui pescare.
· fonte_immagine_id · fonte_riferimento [colonna] — migration 150306:32-33, FK composita :53-54, CHECK fonte_ck :58-60; database.types.ts:3359-3360
  Fonte dichiarata deve avere un corpo (immagine O riferimento) — la respinge il CHECK 23514, il precheck V1 deve mordere prima in route. FK composita anti cross-tenant verso lavori_immagini(id, laboratorio_id).
· confermata_da · confermata_at [colonna] — migration 150306:41-42, CHECK conferma_ck :63; domain.ts:418-419
  Viaggiano insieme (CHECK di uguaglianza NULL). Il rifacimento NON le clona (152403:466-470).
· lavoro_prescrizione_allega_fonte [route] — RPC: migration 152403:141-191; tipi generati: database.types.ts:6162-6171
  Il CTA «Allega la prescrizione» arriva qui. UPSERT deliberato (lavori pre-ondata senza riga). ⚠️ Args generati p_fonte_immagine_id/p_fonte_riferimento tipizzati string NON nullable benché la RPC accetti NULL.
· esiti di allega_fonte: ok · non_trovato · fonte_tipo_non_valido · fonte_congelata [esito-rpc] — migration 152403:157,164,176,190
  'fonte_congelata' SOLO se la fonte c'era già e c'è DdC attiva; riga ancora senza fonte resta completabile anche dopo (V8).
· lavoro_prescrizione_correggi_typo [route] — RPC: migration 152403:203-259; tipi generati: database.types.ts:6176-6185
  Ramo «typo» del gesto su ModificaRigaSheet (il componente esiste: src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx). Gettone di concorrenza su lavori.updated_at; jsonb 'null' E SQL NULL rimuovono la chiave (jsonb_set con NULL annienterebbe il contenuto).
· esiti di correggi_typo: ok(+updated_at) · non_trovato · conflitto(+updated_at) · congelata · senza_prescrizione · campo_non_valido [esito-rpc] — migration 152403:219,223,232,239,243,258
  6 esiti da instradare nella route della ③; 'conflitto' riporta l'updated_at corrente per il retry.
· p_campo ∈ {'elementi','colore','tipo'} [membro-allowlist] — migration 152403:242
  Allowlist chiusa dei campi correggibili — la riga «Colore» usa 'colore'. Un campo nuovo nello snapshot richiede di toccare QUESTA lista nella RPC, non solo il TS.
· lavoro_prescrizione_registra_divergenza [route] — RPC: migration 152403:265-314; tipi generati: database.types.ts:6186-6196
  Ramo «divergenza» del gesto: APPENDE al registro, NON tocca contenuto. p_utente arriva dal server (utente_id nella voce).
· esiti di registra_divergenza: ok(+divergenze=n) · non_trovato · congelata · senza_prescrizione · motivo_non_valido [esito-rpc] — migration 152403:282,289,296,300,313
  'ok' riporta la nuova lunghezza dell'array (jsonb_array_length).
· p_motivo ∈ {'richiesta_dentista','esigenza_tecnica','materiale_non_disponibile','altro'} [membro-allowlist] — migration 152403:299
  Dizionario chiuso dei motivi (D212). In src NON esiste ancora una costante con questi 4 valori: la UI della ③ deve importarli da un posto solo, non ricopiare (lezione categorie-foto).
· lavoro_prescrizione_conferma_consegna [route] — RPC: migration 152403:322-365; tipi generati: database.types.ts:6172-6175; esiti :337,344,351,364
  Fuori dal perimetro ③ (è D213, consegna) ma condivide tabella e semantica 'congelata' — non instradarla per sbaglio dai gesti.
· istituzione_sanitaria [colonna] — nasce: migration 150306:89-92; domain.ts:276-278; database.types.ts:2472; scritta da route.ts:278 e RPC 152403:60,83
  P37: seconda casella All. XIII p.1, nullable (D206②). Il mini-foglio «Chi ha prescritto?» del wizard la manda nel body POST; la PATCH la corregge fino alla consegna (direttiva §9).
· richiedente_nome [colonna] — domain.ts:274; database.types.ts:2497; route.ts:273; RPC 152403:54,67
  Prima casella P37, già esistente. Nel rifacimento NON viene clonata (vedi sorpresa D221).
· crea_rifacimento_atomico — INSERT INTO lavori senza richiedente_nome/istituzione_sanitaria [colonna] — migration 152403:411-444 (elenco colonne :411-427)
  Il fix puntuale D221 della ③: il clone P37 manca — entrambe le colonne sono assenti dall'INSERT del rifacimento; la trascrizione invece È già clonata (:471-479, contenuto+fonte+numero, divergenze e conferma azzerate).
· lavori_prescrizioni (tabella: contenuto · divergenze · fonte_* · numero_prescrizione · confermata_*) [colonna] — migration 150306:14-64; Row generata: database.types.ts:3352-3397
  REVOKE ALL anche a service_role (:79): le UNICHE penne sono le RPC SECURITY DEFINER. SELECT per tenant via RLS (:73-74). UNIQUE(lavoro_id): una trascrizione per lavoro.

LETTURE (R-P2): src/lib/prescrizione/componi-snapshot.ts — righe 1-52 (intero) | src/types/domain.ts — righe 255-289, 360-539, 805-849 (le sezioni Lavoro/LavoroDente/LavoroPrescrizione/LavoroDettaglio/LavoroImmagine + verifica categoria di VoceListino:815 e ArticoloMagazzino:841, entità NON in perimetro) | src/types/database.types.ts — righe 3052-3121 (lavori_immagini), 3352-3431 (lavori_prescrizioni), 6150-6209 (Functions lavoro_prescrizione_*); sezione lavori localizzata col grep (Row a 2418; istituzione_sanitaria:2472, numero_prescrizione:2484, richiedente_nome:2497) | supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql — righe 1-93 (intero) | supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql — righe 1-523 (intero) | src/lib/domain/categorie-foto.ts — righe 20-58 | src/app/api/lavori/route.ts — righe 200-333 | grep senza apertura: importatori di componiSnapshot/PrescrizioneInput/DentiInput, LavoroPrescrizione, LavoroImmagine, LavoroDettaglio, CategoriaFoto, 'lavoro_prescrizione' in src/app+lib+components, le 4 stringhe fonte_tipo in src, ModificaRigaSheet, registrata_at in src+supabase+docs

SORPRESE: 1) Il file atteso src/lib/lavori-prescrizioni/domain.ts NON esiste: il dominio è spezzato fra src/lib/prescrizione/componi-snapshot.ts (funzione pura) e src/types/domain.ts (tipi) — il piano della ③ deve citare i percorsi veri. 2) LavoroDettaglio (domain.ts:427-442) NON ha un membro `prescrizione`: la riga «Colore» della scheda non ha oggi un canale tipizzato per lo snapshot — va aggiunto (embed opzionale, come `denti?`). 3) LavoroPrescrizione ha ZERO importatori: esportato e mai consumato. 4) Nessun codice applicativo chiama le tre RPC dei gesti (grep: solo migrations e tipi generati) — le route dei gesti sono interamente da costruire, come atteso. 5) D221 CONFERMATO nel SQL: l'INSERT del rifacimento (152403:411-444) non elenca né richiedente_nome né istituzione_sanitaria; la trascrizione invece è GIÀ clonata (:471-479) — il fix è davvero solo puntuale. 6) I tipi generati sono più larghi del dominio (fonte_tipo string|null a 3361, divergenze Json a 3358) E — rilievo R27, citato in categorie-foto.ts:23-27 — i quattro fabbricanti del client non passano il generico <Database>: le firme generate non vincolano nessuno, la rete vera sono le guardie runtime + le spie. 7) Nei tipi generati gli Args di allega_fonte (database.types.ts:6163-6169) marcano p_fonte_immagine_id e p_fonte_riferimento come string NON nullable, ma la RPC accetta NULL (V7): se la ③ tipizza la chiamata sui generati, dovrà aggirarli. 8) Le 4 stringhe di fonte_tipo e i 4 motivi di divergenza NON hanno una costante condivisa in src (esistono solo nell'unione TS e nel SQL): il foglio a2 e il gesto divergenza rischiano la terza copia scritta a mano — lo stesso pericolo che categorie-foto.ts:45-50 documenta per le categorie.

========================= SUPERFICIE 6 =========================
SUPERFICIE 6 — DS e P37 (base: /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app). RIGHE DI SPEC DA EMENDARE (docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md): §5.10 righe 244-247 — la 246 fissa l'anatomia chiave/valore della RigaDato (caption maiuscola a sx, valore 17/700
  identificatori: 37 · letture: 22

· RigaDato [simbolo-esportato] — src/components/ds/CardInfo.tsx:27-81
  NON ha file proprio: vive in CardInfo.tsx. Prop attuali: chiave, valore (ReactNode), sub?, urgente?. La pastiglia di provenienza (vincolo 7) entra qui come prop nuova; `urgente` colora solo il valore in --red (riga 60)
· CardInfo [simbolo-esportato] — src/components/ds/CardInfo.tsx:89-120
  Prop: children. Inserisce separatori 1.5 --line e warna in dev oltre 5 righe (MASSIMO_RIGHE=5, riga 15). La card «La prescrizione» del Fatto (D224) probabilmente la riusa
· Sheet [simbolo-esportato] — src/components/ds/Sheet.tsx:136-429
  Prop: aperto, onChiudi, titolo?, children. z-index 1000 cablato (riga 479), LinkQuieto «Chiudi» sempre in fondo (377), trappola focus + storia-overlay + bloccaScorrimento integrati. Base del foglio a2 e del mini-foglio d1
· deveChiudere [simbolo-esportato] — src/components/ds/Sheet.tsx:41-44
  Soglia pura dello swipe-giù, esportata per i test — non toccarla
· MenuVoce [simbolo-esportato] — src/components/ds/MenuVoce.tsx:14-82
  ESISTE come componente. Prop: icona (path SVG grezzi), testo, nota?, butta?, disabled?, onTap?. ⚠️ `nota` è SEMPRE rossa (riga 74): se la ③ la usa per una nota non-distruttiva serve emendare. Separatori posseduti dal contenitore, non da lei (righe 6-7)
· LinkQuieto [simbolo-esportato] — src/components/ds/LinkQuieto.tsx:19-78
  Prop: children, onClick?, href?. Riservato vie di fuga (L6), silenzioso, hit area 44px. Il CTA «Allega la prescrizione» NON può essere un LinkQuieto: è un'azione
· TileScelta [simbolo-esportato] — src/components/ds/TileScelta.tsx:48-153
  Prop: nome, nomeRiga2?, sotto?, avatar?, glifo?, onClick. vibra('selection'), mai suona(). Candidata per le scelte del mini-foglio d1 «Chi ha prescritto?»
· TileNuovo [simbolo-esportato] — src/components/ds/TileScelta.tsx:164-216
  Prop: etichetta, onClick. Bordo dashed, suona('tap')+vibra('medium')
· NuovoDentistaSheet [simbolo-esportato] — src/components/features/wizard/NuovoDentistaSheet.tsx:42-148
  IL pattern che d1 riusa: prop aperto/onChiudi/onCreato({id,label}); vincolo inline senza rete (76-79); errore via useAvvisi senza svuotare il form (96-100); label = studio_nome ?? `Dr. ${cognome}` (103) calcolata dalla RISPOSTA del server
· nome, cognome, telefono, cellulare_whatsapp, studio_nome [chiave-json] — src/components/features/wizard/NuovoDentistaSheet.tsx:83-86
  Body del POST /api/clienti; risposta { cliente: {id, nome, cognome, studio_nome} } (righe 40, 102)
· GET /api/clienti/[id]/studio-members [route] — src/app/api/clienti/[id]/studio-members/route.ts:7-61
  Parametro: id (path). CONFRONTO CASE-SENSITIVE: .eq('studio_nome', cliente.studio_nome) riga 50 — «Studio Rossi» ≠ «studio rossi». Esclude il cliente stesso (.neq('id', id), riga 51), soft-delete filtrato, ordine per cognome asc
· [{id, nome, cognome, studio_nome}] (array NUDO) [chiave-json] — src/app/api/clienti/[id]/studio-members/route.ts:42,48,59
  La risposta OK è un array nudo, NON un oggetto: [] se studio_nome è null (42), righe con le 4 chiavi (48). Errori: {error} con 401 (17), 403 (20), 404 (37), 500 (56). Consumer odierno UNICO: TabDati.tsx:90 (form legacy v2.3)
· 'app/api/clienti/[id]/studio-members/route.ts' [membro-allowlist] — src/lib/supabase/lab-context-allowlist.ts:9
  LAB_CONTEXT_ROUTE_ALLOWLIST (categoria A, getLabContext claims-based; guardia lab-context-guard.test.ts). Le route NUOVE dei gesti ne restano FUORI → getFreshLabContext, salvo decisione contraria con destinazione scritta
· lavoro_prescrizione_allega_fonte [simbolo-esportato] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:141-191 + src/types/database.types.ts:6162-6171
  Funzione DB SECURITY DEFINER, service_role only (REVOKE :512, GRANT :518) → la route del gesto usa getServiceClient. Args: p_lab, p_lavoro, p_fonte_tipo, p_fonte_immagine_id, p_fonte_riferimento. UPSERT su lavori_prescrizioni
· foglio | email | modulo | piattaforma [categoria] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:163
  Dizionario chiuso di fonte_tipo (D202); NULL legittimo (V7). Stesso elenco del CHECK fonte_ck di tabella — il foglio a2 lo parla
· non_trovato · fonte_tipo_non_valido · fonte_congelata · ok [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:157,164,176,190
  Esiti di allega_fonte, chiave 'esito' nel json. fonte_congelata = fonte già presente + DdC attiva (V8): la route deve tradurli tutti
· lavoro_prescrizione_correggi_typo [simbolo-esportato] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:203-259 + src/types/database.types.ts:6176-6185
  Args: p_lab, p_lavoro, p_campo, p_valore (jsonb; 'null' RIMUOVE la chiave), p_atteso_updated_at (gettone concorrenza su lavori.updated_at, NULL = nessun controllo). Avanza lavori.updated_at (254-256)
· elementi | colore | tipo [categoria] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:242
  Dizionario chiuso di p_campo per correggi_typo — il gesto sulla riga «Colore» passa 'colore'
· non_trovato · conflitto(+updated_at) · congelata · senza_prescrizione · campo_non_valido · ok(+updated_at) [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:219,223,232,239,243,258
  Esiti di correggi_typo. 'conflitto' porta l'updated_at corrente per il retry; 'ok' porta il gettone nuovo
· lavoro_prescrizione_registra_divergenza [simbolo-esportato] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:265-314 + src/types/database.types.ts:6186-6196
  Args: p_lab, p_lavoro, p_campo, p_motivo, p_nota, p_utente. APPENDE al registro, non tocca contenuto (D212)
· richiesta_dentista | esigenza_tecnica | materiale_non_disponibile | altro [categoria] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:299
  Dizionario chiuso di p_motivo per registra_divergenza — il foglio del gesto divergenza lo mostra
· {campo, motivo, nota, utente_id, registrata_at} [chiave-json] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:304-309
  Forma della singola divergenza appesa a lavori_prescrizioni.divergenze
· non_trovato · congelata · senza_prescrizione · motivo_non_valido · ok(+divergenze) [esito-rpc] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:282,289,296,300,313
  Esiti di registra_divergenza; 'ok' porta il conteggio divergenze
· lavori_prescrizioni (colonne) [colonna] — src/types/database.types.ts:3353-3367
  confermata_at, confermata_da, contenuto (Json), created_at, divergenze (Json), fonte_immagine_id, fonte_riferimento, fonte_tipo, id, laboratorio_id, lavoro_id, numero_prescrizione, updated_at. Scrittura SOLO via RPC (commento src/app/api/lavori/[id]/route.ts:65)
· Campo = 'consegna' | 'tecnico' | 'dentista' | 'note' [campo-ui] — src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx:24 (+TITOLI 26-31)
  Union discriminante dello sheet di modifica per-riga: la riga «Colore» con gesto typo-vs-divergenza aggiunge un membro (e il suo titolo). ⚠️ salva() oggi fa SOLO PATCH /api/lavori/{id} (113-120): il ramo typo devia verso la RPC — due vie di scrittura nello stesso sheet
· ModificaRigaSheet (prop) [simbolo-esportato] — src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx:80-88
  aperto, onChiudi, lavoroId, campo, valoreIniziale (unknown), onSalvato(patch), onErrore(msg). L'aggiornamento ottimistico lo applica il padre SchedaLavoroV3
· RigaOpzionale nome="Colore" / chiave stato `colore` [campo-ui] — src/components/features/wizard/PassoPaziente.tsx:91-98 (union CampoOpzionale :35, prop :42)
  La casella colore del Passo 3 che riceve il framing trascrizione (D223 variante B). RigaOpzionale (138-…) è module-private: prop nome, esempio?, valore, ultima, onAttiva, onCambia. ⚠️ PillVoce montata a :118 è ABROGATA (D13, spec 267-276): chi tocca il passo la rimuove
· FrameFatto [simbolo-esportato] — src/components/features/wizard/FrameFatto.tsx:112-124
  Prop: lavoro{id,numero_lavoro}, accessoriFalliti, dentista, lavoroLabel, pz, giorni, daStoria, dataConsegna, onTornaHome, oggi?. D224 lo spacca in due carte: oggi ha UNA CardInfo «Il lavoro» (230-234) + TastoPrimario «Fotografa impronta e prescrizione» (250-252) + LinkQuieto «Torna alla home» (265)
· categoria = 'prescrizione' / 'impronta' [categoria] — src/components/features/wizard/FrameFatto.tsx:185 + src/lib/domain/categorie-foto.ts:30,34
  Oggi il Fatto manda UN solo upload con categoria 'prescrizione' (D97) su POST /api/lavori/{id}/immagini (:186). Col CTA sdoppiato: 'impronta' esiste già in CATEGORIE_FOTO (:30). Validazione: isCategoriaFoto (:51) — MAI una terza copia dell'elenco (avvertimento :45-50, spia migration)
· richiedente_nome [colonna] — src/types/database.types.ts:2497,2597,2697 + src/types/domain.ts:274
  Colonna viva di lavori. Lettori ODIERNI: fatture/batch/route.ts:124 e fatture/[id]/xml/route.ts:108 (select FatturaPA), lib/pdf/generate-ddc.ts:146 (prescrittore_nome DdC, con fallback cliente), lib/consegna/precheck.ts:12,23 (precheck consegna), features/pdf/BuonoTemplate.tsx:312 (fallback cliente), form legacy TabDati.tsx:224-311 (chips+input). Scrittori: POST api/lavori/route.ts:273, PATCH allowlist api/lavori/[id]/route.ts:186. P37 wizard lo popola dal mini-foglio d1
· istituzione_sanitaria [colonna] — src/types/database.types.ts:2472,2572,2672 + src/types/domain.ts:276-278
  Colonna viva di lavori, nata in B②. Scrittori: POST api/lavori/route.ts:278 → RPC lavoro_crea_atomico (migration :60,:83); PATCH allowlist api/lavori/[id]/route.ts:187-189. ⚠️ ZERO lettori oggi in tutta src/ (né DdC né fatture né UI): il grep completo trova solo tipi e scrittori
· crea_rifacimento_atomico — INSERT clone [simbolo-esportato] — supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql:376-491 (colonne clonate 411-427, VALUES 428-444)
  PUNTO ESATTO del fix D221: la versione più recente NON copia né richiedente_nome né istituzione_sanitaria nel lavoro clonato — il rifacimento oggi PERDE il prescrittore. Clona già la trascrizione (471-479, D214: contenuto+fonte+numero, azzera divergenze/conferma). CREATE OR REPLACE azzera proconfig: SET search_path + REVOKE/GRANT da ri-emettere (avvertimento 373-375)
· lavoro_crea_atomico (p_lavoro chiavi) [chiave-json] — src/app/api/lavori/route.ts:264-294 + migration :54-83
  Il POST passa già richiedente_nome (:273) e istituzione_sanitaria (:278) dentro p_lavoro; ?? null = chiave assente per la RPC. Il mini-foglio d1 del wizard alimenta queste due chiavi del body, l'API non si tocca
· pastiglia di provenienza (§5.10) [campo-ui] — docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md:244-247
  EMENDA: riga 246 (anatomia chiave/valore — dove la pastiglia si aggancia) e riga 247 («L'unico valore che può essere rosso è la consegna imminente» — oggi vieta ogni altro segno visivo sulla riga)
· primario del Fatto (§7.3) [campo-ui] — docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md:425,427
  EMENDA: riga 425 (percorso minimo 3 tocchi che finisce su «Fotografa impronta e prescrizione») e riga 427 (Fatto! monolitico con quel TastoPrimario) — D224 due carte + CTA «Allega la prescrizione» → poi «Fotografa l'impronta»
· §5.34 MenuVoce / §5.16 Sheet (righe lette, non emendate) [campo-ui] — docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md:317 e 277-280
  Citate dal mandato: 317 = anatomia MenuVoce (min-h 56, icona Ø38 r11, .butta); 277-280 = Sheet (radius 28 top, grabber 36×4, max 92%, mai X unica uscita, mai modal centrato su mobile). Per i vincoli 7-8 non risultano da emendare; §5.42 (riga 354) ricorda che Sheet ha z-index 1000 cablato
· POST /api/clienti (risposta { cliente }) [route] — src/components/features/wizard/NuovoDentistaSheet.tsx:89-105
  La route che il pattern d1 chiama; il mini-foglio «Chi ha prescritto?» ne eredita il contratto se crea un collega di studio

LETTURE (R-P2): (base di tutti i percorsi: /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app) | docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md — righe 244-283 e 424-463 (Read); righe 21, 285, 303, 317, 348, 354 (grep con testo integrale) | src/components/ds/CardInfo.tsx — righe 1-121 (integrale) | src/components/ds/MenuVoce.tsx — righe 1-83 (integrale) | src/components/ds/LinkQuieto.tsx — righe 1-79 (integrale) | src/components/ds/Sheet.tsx — righe 1-540 (integrale) | src/components/ds/TileScelta.tsx — righe 1-217 (integrale) | src/components/features/wizard/NuovoDentistaSheet.tsx — righe 1-156 (integrale) | src/app/api/clienti/[id]/studio-members/route.ts — righe 1-62 (integrale) | src/app/api/lavori/[id]/route.ts — righe 160-219 (+ grep righe 32, 65, 186-189) | src/app/api/lavori/route.ts — righe 255-294 (+ grep 214, 301) | src/types/database.types.ts — righe 2440-2499, 3352-3399, 6162-6201 (+ grep 2472/2497/2572/2597/2672/2697) | src/components/features/wizard/FrameFatto.tsx — righe 100-229 (+ grep con testo: 6-33, 230-331) | src/components/features/wizard/PassoPaziente.tsx — righe 75-149 (+ grep con testo: 6-125) | src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx — righe 1-120 | supabase/migrations/20260804152403_ondata_b_prescrizioni_rpc.sql — righe 141-320 e 367-506 (+ grep: 30, 47-364 esiti, 512-522) | src/lib/supabase/lab-context-allowlist.ts — righe 1-33 (integrale) | src/types/domain.ts — righe 255-284 | src/lib/domain/categorie-foto.ts — righe 1-89 (integrale) | src/app/api/fatture/[id]/xml/route.ts — righe 100-112 (sed, testo integrale) | src/app/api/fatture/batch/route.ts — righe 118-128 (sed, testo integrale) | ls completo di src/components/ds/ e find delle route sotto src/app/api/clienti/

SORPRESE: SETTE, in ordine di peso. ① `RigaDato` NON esiste come file: è un export di `CardInfo.tsx` (righe 27-81) — un piano che dice «apri RigaDato.tsx» cerca un file che non c'è. ② Il backend P37 è GIÀ atterrato in ②: `istituzione_sanitaria` sta già nell'allowlist PATCH (api/lavori/[id]/route.ts:186-189 con commento «P37 (ondata B ②)»), nel POST (route.ts:273-278) e dentro `lavoro_crea_atomico` (migration :60,:83) — la ③ per P37-wizard costruisce SOLO la UI, e un piano che «aggiunge la colonna all'allowlist» duplicherebbe lavoro fatto. ③ Il clone P37 nel rifacimento manca DAVVERO, ma più largo dell'atteso: `crea_rifacimento_atomico` (versione 20260804152403:411-444) non copia NÉ `istituzione_sanitaria` NÉ `richiedente_nome` — oggi ogni rifacimento perde il prescrittore, non solo l'istituzione; il fix D221 deve coprire entrambe le colonne o dichiarare perché no. ④ Le tre RPC dei gesti esistono già con nomi PREFISSATI (`lavoro_prescrizione_allega_fonte` / `_correggi_typo` / `_registra_divergenza`, non i nomi corti del mandato), sono SECURITY DEFINER service_role-only: le route dei gesti passano da `getServiceClient()`, e NON sono nella LAB_CONTEXT_ROUTE_ALLOWLIST (regola: route nuove → getFreshLabContext). ⑤ `istituzione_sanitaria` non ha NESSUN lettore oggi in tutta src/ (né DdC né FatturaPA né UI): finché la ③ non monta la riga sulla scheda, è un dato che si salva e non si vede da nessuna parte. ⑥ GET studio-members risponde un ARRAY NUDO (route:42,59), non `{members: …}` — e il confronto case-sensitive atteso c'è davvero (`.eq('studio_nome', …)`, riga 50). ⑦ §5.15 PillVoce è ABROGATA (D13, spec:267-276) ma ancora montata in PassoPaziente.tsx:118: chi tocca il Passo 3 per la casella colore ha l'obbligo di spec di rimuoverla, non di rimontarla — un piano ③ che non lo prevede viola la nota di spec.
