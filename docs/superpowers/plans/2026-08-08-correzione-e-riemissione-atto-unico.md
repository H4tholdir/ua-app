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
- [ ] **Passo 3 — la RPC nuova**, `correggi_e_riemetti_atomica`, che in **una transazione**:
  ① `SELECT … FOR UPDATE` sul lavoro · ② confronta `p_atteso_updated_at` → se diverso, esito
  `conflitto` (modello `…/denti`) · ③ applica `p_correzioni` a `lavori` · ④ annulla la dichiarazione
  viva · ⑤ inserisce la nuova con `sostituisce_id` e `annullata_da_evento_id`.
  🛑 **Controllo sul catalogo per `p_correzioni`**, gemello di quello già presente in
  `20260807143623:105-113`: **nessuna chiave si perde muta** (R-P6).
  🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT` nella stessa migration**, e la prova è una
  chiamata vera **con la chiave pubblica** che deve dare `42501`.
- [ ] **Passo 4 — le sonde**, una invocazione per sonda, in transazione annullata, con la fixture
  costruita **dentro** la transazione: ① un `evento_id` già usato → `23505` · ② `p_atteso_updated_at`
  sbagliato → `conflitto` · ③ una chiave fuori allowlist → **rifiutata**, col messaggio · ④ il giro
  buono → il lavoro è corretto **e** la nuova dichiarazione esiste **e** la vecchia è `annullata`.
- [ ] **Passo 5 — FASE 6b** (`gen types` → `tsc`) e salva.

---

## Task C — La rotta che riceve le correzioni

**File:** `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts` (si **estende**, non si riscrive) ·
allowlist nuova · prove.

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
  `annullata_da_evento_id = evento_id`? → restituisci quella. 🛑 **Mai** una porta su «esiste una
  dichiarazione viva»: quella è vietata alla riemissione (`generate-ddc.ts:378-392`).
- [ ] **Passo 5 — fondi in memoria** (`lavoroCorretto = merge(riga, correzioni)`) e passa **quello** al
  generatore. ⚠️ I testi passano da `CAMPI_TESTO_NORMALIZZATI`: uno snapshot **vuoto** vincerebbe sul
  nome vivo e stamperebbe **un'identificazione paziente assente** — è il difetto già pagato sul gemello
  `richiedente_nome` (D242).
- [ ] **Passo 6 — traduci `23505`** in un esito leggibile, e `conflitto` in **409**.
- [ ] **Passo 7 — verde + salva.**

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

---

## Autorevisione del piano

- 🔴 **Il rischio più probabile di attuazione sbagliata:** `p_correzioni` che diventa una PATCH
  generica. Il Task C lo blocca con l'allowlist stretta, ma è la cosa che un esecutore di fretta
  allargherà «tanto siamo già in transazione».
- 🟠 **Non ho verificato** se qualcosa oltre alla PATCH tocchi `lavori.updated_at` (trigger, altre RPC):
  se lo tocca spesso, il gettone di concorrenza produrrebbe **409 spurii**. ➡️ Il Task B lo misura
  **prima** di adottarlo.
- 🟠 **Non ho verificato** se `denti_coinvolti` sia una colonna di `lavori` o una vista su
  `lavori_denti`: il generatore legge `lavoro.denti_coinvolti`, ma la scrittura passa da una rotta
  dedicata. ➡️ **Il Task B lo apre per primo**, e se è una vista il piano del Task B cambia.
- 🟠 **`contiene_sostanze_o_tessuti` è stampato e cablato a `false`**: non è fra le sette. O si dichiara
  fuori perimetro con il motivo, o l'ondata gli dà uno scrittore. **Riferito, non deciso.**
- 🔵 L'ordine fra la correzione e le quattro caselle di legge: ho messo la correzione **prima**, perché
  è la cosa per cui la persona ha aperto il foglio. **Non ho una prova** per preferire un ordine
  all'altro.
