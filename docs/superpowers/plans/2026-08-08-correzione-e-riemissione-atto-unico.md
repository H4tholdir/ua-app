# «Correggi e rifai la dichiarazione» — piano di esecuzione dell'atto unico

**Data:** 8 agosto 2026 (`provato:` `date` → `08/08/2026, 10:00 CEST`, comando **separato**)
**Nasce da:** il **Critico** trovato dalla revisione del Task 8 — *la strada che il rifiuto indica
riporta nella stessa stanza* — e dal **panel a tre** che ne è seguito.
**Decisioni che lo reggono:** **D314** (si corregge ogni campo che alimenta il documento) · **D315**
(atto unico) · **D316** (sette voci) · **D317** (il dentista va avvisato) · e, invariate, D293 · D299 ·
D305 · D308.
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, **centotrentacinquesima e
centotrentaseiesima tornata**.
**Ramo:** `intervento-post-consegna` — 🛑 **MAI un git worktree.**

> 🔑 **Questo piano è il seguito di** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`,
> di cui i Task 1-8 sono **COMPLETI**. I suoi Task **9** (il foglio) e **10** (le prove d'integrazione)
> restano validi e si eseguono **DOPO** i cinque compiti qui sotto: il Task 9 tocca lo stesso foglio, e
> il Task 10 è la chiusura dell'intera ondata.

---

## 0. Il difetto in una frase

Un lavoro consegnato ha una dichiarazione viva. Un refuso su un dato **stampato** non si corregge:
non **prima** (il cancello di D308 risponde 422), non **durante** (la riemissione annulla e inserisce
nella stessa transazione), non **dopo** (la nuova nasce già viva). E il documento rifatto sarebbe
**identico**, perché ricopia i dati dalla riga che nessuno ha potuto correggere.
➡️ **L'unico percorso funzionante è «ho premuto consegna per sbaglio», che dichiara una consegna mai
avvenuta.** Su un manufatto realmente uscito è una dichiarazione falsa (D293).

---

## 📋 REGISTRO DELLE PROVE (R-P1) — eseguite l'08/08/2026, mattina

| # | assunzione | esito |
|---|---|---|
| **P1** | **Il generatore NON rilegge la riga del lavoro** — è la giuntura che rende possibile l'atto unico | ✅ `provato:` letto `src/lib/pdf/generate-ddc.ts:203-218`: `costruisciDichiarazione(supabase, lavoro)` riceve il lavoro **come oggetto in memoria** e dal database legge **solo** `laboratori` e `rischi_tipo_dispositivo`. 🛑 Se un riordino futuro la facesse rileggere, **questo piano crolla**: il Task B lo protegge con una prova |
| **P2** | L'indice unico su `annullata_da_evento_id` è **applicabile ai dati attuali** (righe già duplicate lo farebbero abortire) | ✅ `provato:` `scripts/psql.mjs` sulla sonda A → **`0 righe`**. Nessun doppione: l'indice si crea |
| **P3** | `paziente_nome_snapshot` è **di fatto vuota** sul banco | ✅ `provato:` sonda B → **`con_snapshot: 1 · senza_snapshot: 298 · totale: 299`**. L'unica piena è la fixture del seed (`supabase/seed.sql:133`). ➡️ **Oggi l'identità del paziente sulla dichiarazione arriva interamente dall'anagrafica condivisa** |
| **P4** | Le **sette voci stampate** e la loro provenienza | ✅ `provato:` `generate-ddc.ts:251-275` — `prescrittore_nome` ← `lavoro.richiedente_nome` (ripiego `cliente.cognome+nome`) · `prescrizione_id` ← `lavoro.numero_prescrizione` · `paziente_nome` ← `lavoro.paziente_nome_snapshot ?? paziente.nome_cognome ?? paziente.codice_paziente` · `tipo_dispositivo` · `descrizione_dispositivo` ← `lavoro.descrizione` · `denti_coinvolti` · `prescrizione_caratteristiche` ← `lavoro.prescrizione?.contenuto` |
| **P5** | 🔴 **Quante delle sette hanno oggi una via di correzione** | 🔴 `provato:` estratta l'allowlist vera (`route.ts:198-250`, 33 voci) e confrontata voce per voce: **dentro** `richiedente_nome` · `paziente_id` · `tipo_dispositivo` · `descrizione` — **FUORI** `numero_prescrizione` · `paziente_nome_snapshot` · `denti_coinvolti`. ➡️ **TRE delle sette voci stampate non si correggono da nessuna PATCH**, e `numero_prescrizione` è stampato su un documento di legge **senza nessuno scrittore da nessuna parte** |
| **P6** | 🛑 **La bugia è cablata nel foglio** | 🔴 `provato:` `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:208` → `stato_dispositivo: sbaglio ? 'mai_uscito_dal_lab' : statoDisp`. La guardia dell'API (`eventi-qualita/route.ts:246`) **non può accendersi mai** da quel percorso. Effetto collaterale: `post_consegna_correzioni` non si incrementa (`:695`) |

> ⚠️ **Una correzione a me stesso, e sta qui perché è la classe di errore che questo piano combatte.**
> Il primo tentativo di misurare P5 estraeva l'allowlist con `/PATCHABLE_FIELDS/,/^]/` e ha risposto
> **«FUORI» per tutte e sette** — compreso `tipo_dispositivo`, che è una delle cinque su cui D308 è
> costruita. L'intervallo era sbagliato, non il codice. **Un controllo che risponde in modo troppo
> netto va rifatto prima di essere creduto.**

### 📐 MISURE DI APERTURA DEL TASK B — eseguite l'08/08/2026, 11:00 circa

> Le due incognite che l'autorevisione dichiarava aperte sono chiuse, e **una terza è comparsa da sola
> e rovescia l'ordine dei passi del Task B**. Sono misure sul **catalogo vivo**, non sui file.

| # | assunzione | esito |
|---|---|---|
| **P7** | `denti_coinvolti` è colonna di `lavori` o vista? | ✅ **colonna reale** `text[]` (`relkind='r'`) — **ma è una DENORMALIZZAZIONE**: la fonte è `lavori_denti`, e `20260727120300:218` dichiara `lavoro_denti_sostituisci_atomica` + `lavoro_crea_atomico` **uniche penne**, responsabili di tenerla in sincronia. ➡️ La RPC nuova **chiama** la penna, **mai** un `UPDATE lavori SET denti_coinvolti` |
| **P8** | `prescrizione_caratteristiche` è un campo di `lavori`? | 🔴 **NO, e il censimento lo dava per tale.** È colonna di **`dichiarazioni_conformita`**; la fonte è **`lavori_prescrizioni.contenuto`**, che è **`jsonb NOT NULL`** (non testo). La penna è `lavoro_prescrizione_correggi_typo(p_campo, p_valore jsonb, p_atteso_updated_at)`, e **accetta solo tre campi**: `elementi` · `colore` · `tipo` (`p_campo NOT IN (…) → campo_non_valido`) |
| **P9** | 🔴 **la penna della prescrizione con una dichiarazione VIVA** | 🔴 `provato:` sul catalogo — `IF EXISTS (… stato <> 'annullata') THEN RETURN … 'congelata'`, col commento *«il typo si corregge annullando la dichiarazione, non riscrivendo la storia sotto di essa»*. ➡️ **L'ordine del piano (③ correggi → ④ annulla → ⑤ inserisci) fa fallire SEMPRE la correzione della prescrizione**, perché l'atto unico opera esattamente col documento vivo. **L'ordine giusto è ④ annulla → ③ correggi → ⑤ inserisci**, ed è quello che la penna era stata scritta per servire |
| **P10** | chi tocca `lavori.updated_at` → 409 spurii? | trigger **`trg_lavori_updated_at`** BEFORE UPDATE: **ogni** UPDATE di `lavori` lo muove. 🔑 Entrambe le penne confrontano il gettone **su `lavori`** (non sulla propria tabella) **e restituiscono quello fresco** (`'updated_at', v_updated_at`). ➡️ Passare alla penna successiva **il valore di ritorno della precedente** è la forma giusta. 🔄 **MA LA RAGIONE CHE AVEVO SCRITTO ERA SBAGLIATA — v. P10-bis.** |
| **P10-bis** | 🔄 **correzione a P10, trovata dall'esecutore del Task B e riprovata da me** | 🔴 Avevo scritto «*il gettone si rinfresca a OGNI passaggio*». **Falso.** `provato:` sonda in transazione annullata → `now() = transaction_timestamp()` è **`true`**, e `clock_timestamp() = now()` è **`false`**: dentro una transazione `now()` **non avanza**, quindi il gettone si muove **una volta sola** (dal valore vecchio a quello della transazione) e poi resta fermo. Passare il valore di ritorno resta **giusto e difensivo** — funziona in entrambi i mondi — ma non per il motivo che avevo dato. 🛑 **E la conseguenza vera è più insidiosa di quella che temevo:** una fixture creata **dentro** la stessa transazione nasce già col `now()` della transazione, quindi la sonda del `conflitto` **passerebbe per finta**. L'esecutore l'ha chiusa arretrando `updated_at` di un'ora nella fixture. *Una prova che non può fallire non è una prova.* |
| **P11** | `annullata_da_evento_id` è popolata? | 🔴 **`0` non-NULL su `6` righe** (e `sostituisce_id` **0**): `riemetti_ddc_atomica` **non è mai stata eseguita sul banco**. ➡️ **P2 era vera per VACUITÀ** — «0 doppioni» non provava l'applicabilità ai dati, provava che dati non ce n'erano. **L'indice resta la scelta giusta**, e per una ragione misurata: la RPC esistente scrive `annullata_da_evento_id = p_evento_id` **sulla dichiarazione VECCHIA**, quindi un secondo invio con lo stesso evento collide davvero |
| **P12** | le penne interne sono chiamabili da dentro la RPC nuova? | `prosecdef = true` per tutt'e tre, ACL **`postgres=X` + `service_role=X`**. Una chiamata annidata da un `SECURITY DEFINER` di proprietà `postgres` passa (utente effettivo = definer) — 🛑 **da provare con una sonda, non da assumere** |

🛑 **CONSEGUENZA SUL CENSIMENTO (R-P6): le otto voci vivono in TRE DEPOSITI, non in uno.**

| deposito | voci | penna |
|---|---|---|
| colonne di `lavori` | `richiedente_nome` · `paziente_id` · `paziente_nome_snapshot` · `numero_prescrizione` · `tipo_dispositivo` · `descrizione` | l'`UPDATE` dentro la RPC nuova |
| `lavori_denti` (+ denormalizzazione) | `denti_coinvolti` | `lavoro_denti_sostituisci_atomica` |
| `lavori_prescrizioni.contenuto` (jsonb) | `prescrizione_caratteristiche` | `lavoro_prescrizione_correggi_typo` — **solo** `elementi`/`colore`/`tipo` |

🟠 **RITROVAMENTO FUORI MANDATO (R-E2 — riferito, non corretto):** `numero_prescrizione` esiste **in due
posti** — `lavori.numero_prescrizione` (che il generatore legge, `generate-ddc.ts:256`) **e**
`lavori_prescrizioni.numero_prescrizione`. Due fonti della stessa verità, cioè la lezione ⑤ dell'handoff
di stamattina in un altro punto. **Il Task B corregge la prima, che è quella stampata**; la seconda resta
com'è e va in coda.

🛑 **Tutti i blocchi di codice di questo piano nascono marcati `non eseguito`**, col comando che
l'esecutore userà per verificarli scritto accanto.

---

## 📖 REGISTRO DELLE LETTURE (R-P2)

| file | stato |
|---|---|
| `src/lib/pdf/generate-ddc.ts` | **letto** 190-290 (il costruttore e le sette voci) e 370-400 (la porta di idempotenza) |
| `src/app/api/lavori/[id]/route.ts` | **letto** 118-125 (lo scarto silenzioso), 198-250 (l'allowlist), 480-500 (il cancello D308) |
| `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` | **letto** 96-130 (i tipi), 200-215 (`registra`), 495-540 (i riquadri d'esito) · ⚠️ **DA LEGGERE PER INTERO dall'esecutore dei Task A e D** |
| `supabase/migrations/20260807143623_riemissione_ddc.sql` | **letto** 1-200 (atomicità, indici, la RPC) |
| `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts` | ⚠️ **NON letto** — **il Task C lo apre per primo**: è la rotta che va estesa, non riscritta |
| `src/app/api/lavori/[id]/denti/route.ts` | ⚠️ **NON letto** — **il Task C lo apre**: porta il gettone di concorrenza (`p_atteso_updated_at` → 409) che il Task B riusa |
| `supabase/migrations/20260715110000_credito_storno_nota_credito.sql` | **letto** :154 — il precedente della nota di credito (congelamento **+ atto compensativo**) |
| `src/hooks/useLavoroForm.ts` | **letto** :316 — manda `{ ...data }`, cioè l'intera riga |

---

## 🧬 CENSIMENTO DEGLI IDENTIFICATORI (R-P6) — ogni nome porta la sua destinazione

| identificatore | oggi | dopo | dove |
|---|---|---|---|
| `stato_dispositivo` nel foglio | **cablato** a `mai_uscito_dal_lab` sul percorso corto | **chiesto** con una domanda, e la risposta viaggia vera | Task A |
| `ddc_evento_annulla_unique` | non esiste | indice unico parziale su `(laboratorio_id, annullata_da_evento_id) WHERE NOT NULL` | Task B |
| `correggi_e_riemetti_atomica` | non esiste | **nuova** RPC: applica le correzioni **e** riemette, una transazione | Task B |
| `CAMPI_CORREGGIBILI_DOCUMENTO` | non esiste | **nuova** allowlist **stretta**, sette voci — 🛑 mai «i campi di `lavori`» | Task C |
| `paziente_nome_snapshot` | esiste, **nessuno la scrive** (P3) | **scritta** dalla correzione, normalizzata come i testi vivi | Task C |
| `numero_prescrizione` | stampato, **nessuno scrittore** (P5) | scritto dalla correzione | Task C |
| `denti_coinvolti` | via propria (`PUT …/denti`) | scritto **dentro l'atto unico**, riusando la stessa RPC | Task B · C |
| `prescrizione_caratteristiche` | RPC dell'ondata B | idem | Task B · C |
| `p_atteso_updated_at` | esiste su `…/denti` | **riusato** dalla RPC nuova | Task B |
| `esito_azione` | tre stati | invariato — 🛑 nessun nome esce | — |

---

## Task A — La bugia smette di essere silenziosa

**File:** `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` · prove:
`tests/unit/DevoIntervenire.test.tsx`

🔑 **Perché è il primo e non l'ultimo:** finché la strada che mente costa **meno** di quella onesta,
tutto il resto di questo piano è una porta che nessuno apre. E la bugia oggi **non la dice la persona:
la dice l'app** (P6).

- [ ] **Passo 1 — le prove, PRIMA del codice.** Il percorso corto deve **chiedere**, e la risposta
  «sì, è uscito» **non deve** registrare l'evento: deve riportare all'elenco dei motivi.
- [ ] **Passo 2 — il codice.** Il `DialogConferma` del percorso corto esiste già: cambia le **parole**,
  da conferma a domanda.
  - Titolo: **«Il manufatto è uscito dal laboratorio?»**
  - Testo: «Con questo motivo il lavoro torna fra quelli pronti e la dichiarazione già emessa viene
    **annullata** — non superata: annullata. Va bene solo se il manufatto non è mai uscito di qui.»
  - **[ No, è sempre rimasto qui ]** → come oggi · **[ Sì, è uscito ]** → torna all'elenco, con in cima:
    «Allora la consegna è avvenuta davvero. Se il problema è un dato scritto sulla dichiarazione, scegli
    **«C'è un dato sbagliato sulla dichiarazione»**: si corregge il dato e si rifà il documento, e
    quello vecchio resta in archivio.»
  🛑 **Zero tocchi in più** (D269): la finestra c'è già, cambia solo che cosa chiede.
- [ ] **Passo 3 — `stato_dispositivo` smette di essere cablato:** la risposta della persona viaggia.
  ⚠️ Verifica che la guardia dell'API **ora possa accendersi**, e provalo con una richiesta che deve
  essere **rifiutata** (422), col messaggio incollato.
- [ ] **Passo 4 — verde + salva.**

---

## Task B — L'atto unico in banca dati

**File:** `supabase/migrations/<ts>_correggi_e_riemetti_atomica.sql` (🕛 `date -u "+%Y%m%d%H%M%S"`, in un
comando **separato** — D311; pavimento `20260807185858`)

- [ ] **Passo 1 — l'indice che rende l'evento MONOUSO.**
  `UNIQUE (laboratorio_id, annullata_da_evento_id) WHERE annullata_da_evento_id IS NOT NULL`, sul
  modello di `rifacimento_evento_unique` (`20260807180314:46`). **P2 dice che si crea** (0 doppioni).
  🔑 Senza, un doppio tocco riemette due volte e **brucia due progressivi**.
- [ ] **Passo 2 — ribatti il corpo VIVO** di `riemetti_ddc_atomica` **dal catalogo**
  (`pg_get_functiondef`), non dal file: *il file di migration non è la prova, la verità è il catalogo
  vivo* — pagato due volte in quest'ondata.
- [ ] **Passo 3 — la RPC nuova**, `correggi_e_riemetti_atomica`, che in **una transazione** —
  🔄 **ORDINE EMENDATO DA P9: l'annullo viene PRIMA delle correzioni**, e non è un dettaglio di stile:
  con la dichiarazione ancora viva la penna della prescrizione risponde `congelata` e **non scrive**.
  ① `SELECT … FOR UPDATE` sul lavoro · ② confronta `p_atteso_updated_at` → se diverso, esito
  `conflitto` (modello `…/denti`) · ③ **annulla la dichiarazione viva**, scrivendo
  `annullata_da_evento_id` come fa `riemetti_ddc_atomica` (è la riga che rende efficace l'indice del
  Passo 1) · ④ applica `p_correzioni` **ai tre depositi**, nell'ordine che rispetta i gettoni ·
  ⑤ inserisce la nuova con `sostituisce_id`.
  🛑 **Le voci fuori da `lavori` si CHIAMANO, non si ricopiano** (P7 · P8): `lavoro_denti_sostituisci_atomica`
  e `lavoro_prescrizione_correggi_typo` sono penne uniche dichiarate — un `UPDATE` gemello farebbe
  divergere `lavori_denti` dalla denormalizzazione che il documento stampa. La chiamata annidata è nella
  stessa transazione: **l'atomicità di D315 non si perde**.
  🛑 **IL GETTONE SI RINFRESCA A OGNI PASSAGGIO** (P10): ogni penna restituisce l'`updated_at` nuovo, e
  quello — non il valore d'ingresso — va alla penna successiva. Col gettone originale la **seconda**
  chiamata torna `conflitto` sempre, e sembra un difetto del codice invece che dell'ordine.
  🛑 **Controllo sul catalogo per `p_correzioni`**, gemello di quello già presente in
  `20260807143623:105-113`: **nessuna chiave si perde muta** (R-P6). ⚠️ Qui il controllo **non può**
  essere «le colonne di `lavori`»: tre voci non lo sono. L'elenco è **la tabella dei tre depositi**, e il
  `COMMENT` della funzione la porta scritta.
  🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT` nella stessa migration**, e la prova è una
  chiamata vera **con la chiave pubblica** che deve dare `42501`.
- [ ] **Passo 4 — le sonde**, una invocazione per sonda, in transazione annullata, con la fixture
  costruita **dentro** la transazione: ① un `evento_id` già usato → `23505` · ② `p_atteso_updated_at`
  sbagliato → `conflitto` · ③ una chiave fuori allowlist → **rifiutata**, col messaggio · ④ il giro
  buono → il lavoro è corretto **e** la nuova dichiarazione esiste **e** la vecchia è `annullata`.
  🛑 **E una sonda PER CHIAVE, che verifica l'ATTERRAGGIO**: rifiutare l'ignoto è metà del lavoro —
  una chiave accettata e instradata da nessuna parte è lo scarto silenzioso di `route.ts:259-264`
  rifatto dentro una RPC. Ogni voce delle otto si legge dopo, dove dovrebbe essere finita.
- [ ] **Passo 5 — FASE 6b** (`gen types` → `tsc`) e salva.

---

## Task C — La rotta che riceve le correzioni

🔄 **SPEZZATO IN DUE l'08/08, dopo la revisione del Task B — e la ragione è un rischio di cui questo
piano si accusa da solo.** C0 e C1 non si chiudono in TypeScript: vivono **nella RPC**, quindi il Task C
comincia con **una migration**. E se lo stesso esecutore scrivesse **il contratto e il suo
consumatore**, sarebbe libero di piegare il primo per far tornare il secondo — cioè esattamente
«*`p_correzioni` che diventa una PATCH generica… la cosa che un esecutore di fretta allargherà*»,
il rischio numero uno dell'autorevisione. **Una revisione in mezzo è il cancello.**

- **Task C-bis — l'irrigidimento in SQL** (C0 + C1, **una sola** `CREATE OR REPLACE`). ✅ **COMPLETO**
  (`20260808103515`, revisione **APPROVATO CON RILIEVI, nessun critico**).
- **Task C-ter — la coppia `anno_ddc`/`progressivo_ddc` è INDIVISIBILE.** 🔄 **AGGIUNTO dopo la revisione
  del C-bis**, e non è un compito nuovo: è **la seconda metà di C1**. Chiudendo `numero_ddc` è rimasta
  scoperta la coppia da cui quel numero si deriva.
  - `provato:` (esecutore) `p_nuova = {progressivo_ddc: N}` senza anno → **l'anno si eredita** dalla
    vecchia; `provato:` (revisione, **il rovescio, che l'esecutore non aveva visto**)
    `p_nuova = {anno_ddc: 2099}` da solo → `esito: ok`, e nasce `DDC-2099-998001` con un progressivo
    **mai prenotato per quell'anno**.
  - 🛑 **La regola è `XOR`: o entrambe, o nessuna** — non quella asimmetrica («pretendi l'anno quando
    c'è il progressivo»), che ne chiuderebbe **metà**.
  - 🔑 **Perché ORA e non dopo:** la funzione **non ha chiamanti**, quindi irrigidirla costa una `RAISE`.
    Dopo il Task C costerebbe **contratto più chiamante**. E che sia sicuro imporlo lo dimostra il fatto
    che mandarne **zero** già fallisce rumorosamente (`23505`), e l'unico chiamante legittimo le manda
    **sempre tutte e due**.
  - ⚠️ **Perché nessuna sonda l'aveva preso, ed è la lezione:** la fixture vive nel **2099**, quindi
    l'anno ereditato **coincide per caso**. Spostandola al 2098 e lasciando tutto il resto identico,
    l'asserzione sul numero diventa **rossa**. *Una fixture che sceglie i propri valori può nascondere
    proprio il difetto che dovrebbe mostrare.*
- **Task C — la rotta**, dopo la revisione del C-ter, **su contratto fermo**.

**File:** `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts` (si **estende**, non si riscrive) ·
allowlist nuova · prove.

### 📐 MISURE DI APERTURA DEL TASK C — 08/08/2026

| # | assunzione | esito |
|---|---|---|
| **P13** | 🔑 **da dove arriva `p_atteso_updated_at`** — è ciò che decide se il cancello può accendersi | ✅ `provato:` `denti/route.ts:104-111` — **dal CORPO della richiesta** (`body.atteso_updated_at`), ed è **obbligatorio** dal rilievo M1 della revisione pre-merge del 28/07. ➡️ Il contratto è **«i valori che hai visto sono ancora quelli»**, non «la riga non è cambiata negli ultimi 200 ms». 🛑 Se il gettone lo producesse la rotta da una lettura fresca, la finestra sarebbe **il solo rendering del PDF** e la guardia non potrebbe quasi mai accendersi: una guardia che non può fallire, cioè **P10-bis applicato a un cancello invece che a una sonda**. **Il Task D dovrà quindi portarsi dietro l'`updated_at` che ha mostrato.** |
| **P14** | il gettone si può riconvertire per comodità? | 🛑 **NO, e il perché è misurato** (`denti/route.ts:88-93`): `timestamptz` ha precisione al **microsecondo**, `Date` di JS al **millisecondo**. Un solo giro di `new Date(...)` tronca `.123456` a `.123`, e il confronto `IS DISTINCT FROM` **non torna MAI uguale**: **409 permanente**, che nemmeno ricaricando si sana. Il valore viaggia **così com'è**; il `.trim()` serve solo a decidere se è vuoto |
| **P15** | il chiamante può scegliere il proprio laboratorio? | `denti/route.ts:129-130`: `laboratorio_id` e `lavoro_id` presenti nel corpo si **IGNORANO** — si derivano da sessione e URL. **Il client non sceglie il proprio tenant.** L'idioma è già in casa: si ricopia, non si reinventa |
| ~~**P16**~~ | ~~oggi `p_nuova` porta `stato`?~~ | 🔴 **SBAGLIATA, E LA CORREZIONE È MIA.** Avevo scritto «*`stato` non è fra le chiavi*» dopo aver letto **solo la coda** di `costruisciDichiarazione`. `provato:` `generate-ddc.ts:323` → **`stato: 'generata' as const`** (🔄 **diceva `:326`, ed era la parentesi di chiusura** — corretto dall'esecutore del C-ter: chi fosse andato lì per togliere la chiave non l'avrebbe trovata), dentro l'oggetto `ddc`. ➡️ **La porta non era aperta e inutilizzata: era in uso a ogni riemissione**, con un valore per ora innocuo. *Un controllo fatto su una parte del blocco risponde per tutto il blocco, e sembra una misura.* |
| ~~**P17**~~ | ~~e `numero_ddc`?~~ | 🔴 **SBAGLIATA A METÀ, stessa causa.** Vero che il **chiamante HTTP** non lo sceglie; **falso** che non arrivi alla RPC: `provato:` `:234-236` → `riga` porta `numero_ddc`, `anno_ddc` **e** `progressivo_ddc`. ➡️ La conclusione che ne traevo — «*C0 e C1 sono difensivi, oggi non ci passa nessuno*» — **era falsa per entrambi**. Restano dovuti per la ragione giusta, che è l'altra che avevo scritto: **un contratto si giudica per ciò che permette** |
| **P16-bis** | 🔴 **conseguenza operativa sul TASK C**, che nasce da quelle due righe sbagliate | 🛑 **`riemettiDdC` passa `riga` come `p_nuova`** (`generate-ddc.ts:461-468`), e `riga` porta **`stato` e `numero_ddc`** — che da C-bis in poi sono **rifiutati**. ➡️ **Il Task C NON può passare `riga` così com'è**: deve toglierle quelle due chiavi prima di chiamare la RPC nuova. 🔑 E questo vale **solo** per la funzione nuova: la vecchia continua ad accettarle, il che è precisamente il pericolo del punto ⑤ |

🛑 **E UN COSTO DA DICHIARARE, non da scoprire:** il PDF si rende e si carica **PRIMA** della transazione
(`generate-ddc.ts:457-460`, scelta dichiarata: è ciò che permette alla transazione di esistere). Quindi
**un `conflitto` costa un file orfano su Storage e un progressivo bruciato**. È accettabile — nessuno dei
due rompe niente — ma **il messaggio del 409 deve essere onesto**, e il Passo 3 (validare il laboratorio
**prima** del render) vale per la stessa ragione.

### 🔴 QUATTRO COSE CHE IL TASK B HA LASCIATO SUL TAVOLO, e questo compito le raccoglie

> Vengono dalla revisione indipendente del Task B (`.superpowers/sdd/atto-unico-task-b-review.md`,
> **APPROVATO CON RILIEVI, nessun critico**) e dal resoconto dell'esecutore. **Nessuna è stata introdotta
> dal Task B**: tre sono ereditate, una è un errore del resoconto.

- [ ] 🔴 **C0 — `p_nuova` PUÒ PORTARE `stato`, e la strada gentile porta a zero dichiarazioni vive.**
  `provato:` dalla revisione — `{"stato":"annullata"}` in `p_nuova` torna `esito: ok` e lascia
  `totali: 2 · VIVE: 0`, cioè **un lavoro consegnato senza nessuna dichiarazione viva**. Il controllo
  R-P6 di `p_nuova` chiede «è una colonna di `dichiarazioni_conformita`?», e `stato` **lo è**; gli
  override forzati dalla funzione non lo coprono. 🛑 **Ereditato: `riemetti_ddc_atomica` fa lo stesso**
  (riprovato dal revisore) — ma *gravità dello stato* e *attribuzione della colpa* sono assi diversi.
  ➡️ **Il Task C chiude con un'allowlist su `p_nuova`**, non solo su `p_correzioni`.
  🛑 **E il DOVE non è libero: l'allowlist di `p_nuova` va in SQL, dentro la RPC.** Se vivesse nella
  rotta, il buco resterebbe aperto nel database **per ogni chiamante futuro** — ed è la definizione
  della **seconda penna** che l'autorevisione di questo piano indica come rischio numero uno. In
  TypeScript ci va semmai una seconda rete, mai la sola.
- [ ] 🔴 **C1 — una riga del resoconto del Task B è SBAGLIATA A METÀ, e la metà che manca è quella
  muta.** Il §7d dice che `p_nuova` deve portare numero e progressivo nuovi «o l'insert collide».
  `provato:` dalla revisione: omettere `progressivo_ddc` collide **rumorosamente**; omettere
  `numero_ddc` **non collide affatto** — su quella colonna **non c'è indice unico**. Esito: **due
  documenti a valore legale con lo stesso numero stampato**, ed `esito: ok`. 🔑 È l'unica affermazione
  del resoconto che, se creduta, porta a scrivere codice sbagliato.
  🔑 **E la regola giusta è più stretta di quella che il resoconto suggerisce.** `provato:` sui vincoli
  vivi — gli unici CHECK sono `ddc_no_self_ref`, `…_classe_rischio_check`, `…_stato_check`: **nessuno
  lega `numero_ddc` alla coppia `anno_ddc`+`progressivo_ddc`**, che è invece l'unico indice unico.
  ➡️ Non «*passa numero e progressivo nuovi*», ma **«`numero_ddc` si DERIVA dalla coppia, e non si
  accetta MAI dal chiamante»**. Una regola che non si può sbagliare per distrazione batte una regola
  che va ricordata.
- [ ] 🟠 **C2 — `p_correzioni` valida la FORMA e non rifiuta mai il VUOTO.** `provato:` una sola chiamata
  con `denti_coinvolti: []`, `paziente_id: null` e stringhe vuote su `descrizione`,
  `richiedente_nome`, `paziente_nome_snapshot` è tornata `ok` **e ha svuotato tutti e cinque**.
  ➡️ **Una regola sola nel Task C**, non tre casi speciali — ed è il pericolo D242 che il Passo 5 già
  nomina a metà: uno snapshot vuoto **vince** sul nome vivo e stampa un'identificazione paziente assente.
- [ ] 🟠 **C3 — `23505` ORA SIGNIFICA TRE VINCOLI DIVERSI**, quindi la traduzione del Passo 6 **deve
  ramificare sul NOME del vincolo**, mai sul solo codice: `ddc_evento_annulla_unique` (doppio invio) ·
  `ddc_sostituisce_unique` · `dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key`.
  📌 E il nuovo indice **irrigidisce anche `riapri_lavoro_atomica`**: `correggi(E) → riapri(E)` con lo
  stesso evento ora dà `23505`. Confermato dalla revisione come **irrigidimento accettabile, non
  regressione** (l'evento nasce nella stessa POST che lo consuma —
  `eventi-qualita/route.ts:378-383` → `:457`) — ma **la porta d'idempotenza del Passo 4 diventa
  portante**, non più una comodità.

- [ ] **Passo 1 — leggi la rotta per intero** e scrivi nel resoconto che cosa fa oggi.
- [ ] **Passo 2 — `CAMPI_CORREGGIBILI_DOCUMENTO`**, sette voci e **basta**:
  `richiedente_nome` · `paziente_id` · `paziente_nome_snapshot` · `numero_prescrizione` ·
  `tipo_dispositivo` · `descrizione` · `denti_coinvolti` · `prescrizione_caratteristiche`.
  ⚠️ Sono **otto nomi per sette voci a schermo**: il paziente si può correggere **scegliendone un
  altro** (`paziente_id`) **o** correggendo l'identificativo per questo documento
  (`paziente_nome_snapshot`). Scrivilo, o il prossimo lettore penserà a un doppione.
  🛑 **Mai «i campi di `lavori`»**: nascerebbe una **seconda penna** che non conosce le ~200 righe di
  regole della PATCH (colore di caso, tinta, sentinelle, blocco fiscale).
- [ ] **Passo 3 — 🛑 LA VALIDAZIONE DEL LABORATORIO STA PRIMA DEL RENDER.** `cliente_id`/`paziente_id`
  arrivano dal corpo: se il PDF si genera prima di verificarli, **un documento col paziente di un altro
  laboratorio resta su Storage anche dopo il rollback**. Prova: una richiesta con un `paziente_id` di
  un altro laboratorio → rifiutata, **e nessun file caricato**.
- [ ] **Passo 4 — la porta d'ingresso sull'EVENTO:** esiste già una dichiarazione con
  `annullata_da_evento_id = evento_id`? → 🔄 **restituisci il SUCCESSORE, mai «quella».**
  🛑 **QUESTA RIGA ERA SBAGLIATA, e nel modo che il piano stesso chiama il peggiore possibile** —
  trovata dall'esecutore del Task C. La riga che porta `annullata_da_evento_id` **è quella ANNULLATA**:
  restituirla significa **consegnare il documento vecchio dicendo «rifatto»**. Il successore si trova per
  `sostituisce_id`.
  ⚠️ **E il caso «predecessore senza successore» è raggiungibile davvero** (riferito, non ipotetico):
  `riapri_lavoro_atomica` e `riporta_a_pronto_atomica` scrivono `annullata_da_evento_id` **senza** creare
  nessun successore. ➡️ Lì la risposta onesta è un **409**, mai un 200 vuoto.
  🛑 **Mai** una porta su «esiste una dichiarazione viva»: quella è vietata alla riemissione
  (`generate-ddc.ts:378-392`).
- [ ] **Passo 5 — fondi in memoria** (`lavoroCorretto = merge(riga, correzioni)`) e passa **quello** al
  generatore. ⚠️ I testi passano da `CAMPI_TESTO_NORMALIZZATI`: uno snapshot **vuoto** vincerebbe sul
  nome vivo e stamperebbe **un'identificazione paziente assente** — è il difetto già pagato sul gemello
  `richiedente_nome` (D242).
- [ ] **Passo 5-bis — 🛑 TOGLI DA `riga` LE CHIAVI CHE LA RPC NUOVA NON ACCETTA PIÙ** (P16-bis):
  `stato` e `numero_ddc`, che `costruisciDichiarazione` mette sempre (`:234` e **`:323`**). Senza questo, la
  prima chiamata vera **alza**. ⚠️ `anno_ddc` e `progressivo_ddc` invece **restano tutte e due** — è la
  regola `XOR` del C-ter, e `riga` le porta già entrambe.
- [ ] **Passo 6 — traduci `23505`** in un esito leggibile, e `conflitto` in **409**.
  🛑 **Ramifica sul NOME del vincolo, mai sul solo codice** (C3), e misura **prima** dove PostgREST mette
  quel nome (`message` / `details` / `hint`): le eccezioni `RAISE` della RPC tornano invece come `P0001`
  con messaggio nostro. **Due forme diverse, una sonda sola le misura entrambe.**
- [ ] **Passo 7 — verde + salva.** 📌 **Aspettativa dichiarata: qui il numero delle prove DEVE muoversi.**
  Il Task B e il C-bis l'hanno lasciato fermo a **5492** con ragione (erano SQL, e le sonde non girano in
  CI). Il Task C è TypeScript: **se dopo il Task C `verify:full` torna ancora 5492, qualcosa non è stato
  provato.** Forme d'input da enumerare (R-P4): corpo non-JSON · `correzioni` assente · `correzioni` non
  oggetto · chiave fuori dalle otto · **valori vuoti** (C2) · `paziente_id` di un altro laboratorio ·
  gettone assente · gettone non interpretabile.

---

## Task D — Il foglio: il passo di correzione

**File:** `DevoIntervenire.tsx` · `src/lib/qualita/motivi-ui.ts` se servono parole nuove.

- [ ] **Passo 1 — il passo mostra VALORI, non controlli.** Titolo: **«Che cosa c'è di sbagliato?»**,
  poi le sette righe con accanto il valore che c'è adesso. Si tocca la riga, il **foglio cambia passo**
  (🛑 **mai un secondo overlay** — `storia-overlay.ts`, difetto già pagato), si corregge, si torna
  all'elenco e la riga dice: `Paziente — Mario Rossi → **Mario Russo** · da rifare`.
- [ ] **Passo 2 — la riga che dichiara ciò che NON si corregge da qui** (D316): «Se è sbagliato un dato
  del laboratorio — ragione sociale, indirizzo, partita IVA, luogo di fabbricazione — si corregge in
  Impostazioni, e vale per tutte le dichiarazioni da lì in avanti.»
  🔑 Un elenco che sembra completo e non lo è è il difetto che questo progetto ha già pagato tre volte.
- [ ] **Passo 3 — il tasto finale dice quello che fa:** **«Correggi e rifai la dichiarazione»**, mai
  «Salva». Disabilitato finché non si è corretto nulla, **col perché scritto**.
- [ ] **Passo 4 — niente si salva prima di quel tocco.** Prova: monta, correggi, **smonta** → nessuna
  chiamata al server.
- [ ] **Passo 5 — FASE 9**: 390 · 768 · 1280, chiaro e scuro.

---

## Task E — Il dentista viene avvisato (D317)

**File:** da decidere leggendo il codice esistente degli avvisi.

- [ ] **Passo 1 — cerca il precedente per COMPORTAMENTO**, non per nome: come l'app avvisa oggi il
  cliente (portale? PEC? WhatsApp?), e **con quali limiti**. ⚠️ Vincolo già in casa: i messaggi
  WhatsApp **non portano mai il nome del paziente** — solo numero lavoro e link al portale.
- [ ] **Passo 2 — il contenuto minimo**, che discende da GDPR Art. 19: che il documento è stato
  **rifatto**, quale sostituisce, e **come raggiungerlo**. 🛑 Il nome del paziente **non** viaggia nel
  messaggio.
- [ ] **Passo 3 — fail-soft:** se l'avviso non parte, **la correzione resta valida** e l'esito lo dice.
  🔑 Un avviso che fa fallire una correzione dovuta per legge è peggio di un avviso mancato.
- [ ] **Passo 4 — la prova che l'obbligo è tracciabile** (GDPR Art. 5(2): il titolare deve poter
  **dimostrare** di aver comunicato).

---

## Poi, e solo poi

1. **Task 9** del piano precedente — il bivio a schermo e i sei testi d'esito (di cui la parte «non
   dire il falso» è **già fatta**: v. il Passo 5 emendato).
2. **Task 10** — le prove d'integrazione e la chiusura dell'ondata.
3. **Il gate estetico L2** (FASE 9b), dovuto prima del merge.

### 🛑 CHE COSA IL TASK 10 È DAVVERO — riscritto l'08/08, e non è un adempimento di chiusura

**Nulla di questa ondata ha mai girato contro Postgres da un chiamante reale.** Tre migration e una rotta
sono verdi su **prove unitarie col contratto finto**, e l'esecutore del Task C lo dichiara per primo:
«*non ho provato l'atto unico contro il database vero end-to-end — è il limite più pesante di questo
compito*».

🔑 **E i finti hanno già mentito una volta, dentro questo stesso compito:** il finto rispondeva **per
ordine di chiamata** e inghiottiva i filtri, quindi le prove della porta d'idempotenza sarebbero state
verdi **anche con le due letture invertite** — cioè col difetto peggiore possibile in opera.

➡️ **Il Task 10 non è la chiusura formale: è il primo momento in cui sapremo se le tre migration e la
rotta si parlano.** Serve un lavoro consegnato, con dichiarazione viva, evento del motivo giusto e
prescrizione. Fino a lì, «verde» vuol dire *coerente con ciò che abbiamo immaginato del database*.

### 📌 DUE COSE CHE IL TASK D DEVE SAPERE, e che non erano scritte

- 🛑 **Il gate estetico L2 è dovuto DUE VOLTE** (§0③ dell'handoff): quello arretrato dell'ondata **più**
  quello del Task A, deferito qui perché tocca la stessa superficie. **Se il Task D si chiude senza, il
  gate resta scoperto e il merge è bloccato.** E la FASE 9 (390 · 768 · 1280, chiaro e scuro) resta
  dovuta a parte: le due non si coprono a vicenda.
- 🔑 **Il foglio deve PORTARSI DIETRO l'`updated_at` che ha mostrato** (P13) e restituirlo **intatto**
  (P14, mai un `new Date(...)`). Il Passo 1 descrive righe con «il valore che c'è adesso»: quel valore e
  il gettone **arrivano dalla stessa lettura e vanno tenuti insieme**, o il contratto «i valori che hai
  visto sono ancora quelli» non ha modo di funzionare.
- ⚠️ **E un caso raggiungibile proprio dal foglio:** `riapri_lavoro_atomica` e `riporta_a_pronto_atomica`
  scrivono `annullata_da_evento_id` **senza creare un successore**. Con l'indice del Task B, uno di quei
  percorsi **brucia l'evento**: `correggi(E)` dopo `riapri(E)` prende `23505`. La rotta lo tratta come
  409 onesto — ma è il **foglio** a generare l'evento quando la persona sceglie il motivo, quindi è lì
  che si decide se quel caso può nascere.

---

## Autorevisione del piano

- 🔴 **Il rischio più probabile di attuazione sbagliata:** `p_correzioni` che diventa una PATCH
  generica. Il Task C lo blocca con l'allowlist stretta, ma è la cosa che un esecutore di fretta
  allargherà «tanto siamo già in transazione».
- ✅ ~~**Non ho verificato** se qualcosa oltre alla PATCH tocchi `lavori.updated_at`~~ → **MISURATO
  (P10):** un trigger BEFORE UPDATE lo muove a ogni scrittura, ma le penne restituiscono il gettone
  fresco. **Non produce 409 spurii, a patto di rinfrescarlo** — vincolo scritto nel Passo 3.
- ✅ ~~**Non ho verificato** se `denti_coinvolti` sia una colonna o una vista~~ → **MISURATO (P7):**
  colonna reale, **ma denormalizzata**, con penna unica dichiarata. Il piano del Task B **è cambiato**:
  si chiama, non si scrive.
- 🔴 **E una terza è comparsa da sola, che nessuno aveva pensato a cercare (P9):** la penna della
  prescrizione **si rifiuta di lavorare finché la dichiarazione è viva**. L'ordine dei passi era
  sbagliato, e la sonda ④ sarebbe fallita facendo sembrare difettoso il codice nuovo.
  🔑 *Due incognite dichiarate ne hanno scoperta una terza non dichiarata: è il motivo per cui il
  censimento si fa aprendo, non elencando.*
- 🟠 **`contiene_sostanze_o_tessuti` è stampato e cablato a `false`**: non è fra le sette. O si dichiara
  fuori perimetro con il motivo, o l'ondata gli dà uno scrittore. **Riferito, non deciso.**
- 🔵 L'ordine fra la correzione e le quattro caselle di legge: ho messo la correzione **prima**, perché
  è la cosa per cui la persona ha aperto il foglio. **Non ho una prova** per preferire un ordine
  all'altro.
