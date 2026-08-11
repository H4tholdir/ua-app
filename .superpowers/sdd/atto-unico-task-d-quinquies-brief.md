# BRIEF — Task D-quinquies: la sentinella che manca a D323 (rilievo I1)

**Ramo:** `intervento-post-consegna` (🛑 **MAI un worktree**) · **Base:** il salvataggio che porta questo brief
**Nasce da:** `.superpowers/sdd/atto-unico-task-d-quater-review.md`, **rilievo I1**
**Decisione protetta:** ⚖️ **D323 e il suo EMENDAMENTO**, centoquarantunesima tornata

---

## 0. IL MANDATO IN UNA FRASE

**Il cuore di D323 non ha nessuna prova: tre mutazioni della migration restano VERDI, e una delle tre è
esattamente la regressione che l'emendamento dichiara di temere. Serve la sentinella.**

---

## 1. LE TRE MUTAZIONI CHE OGGI RESTANO VERDI

`provato:` dal revisore del Task D-quater, sul codice attuale:

1. 🔴 **Rimettere `- 'updated_at'`** nel predicato di `public.lavori_set_updated_at`. È **la regressione
   che l'emendamento di D323 nomina per intero**: sottraendo anche quel campo, un `UPDATE` che assegna
   **soltanto** `updated_at` diventa indistinguibile da un no-op e viene **pinzato** — e
   `lavoro_denti_sostituisci_atomica` fa `DELETE` + `INSERT` dell'intera collezione, quindi
   **l'aggiornamento perso è TOTALE**. Misurato: forma ratificata **4 casi su 6**, forma spedita **6 su 6**.
2. **Cambiare la colonna esente** (oggi `post_consegna_correzioni`).
3. **Non riagganciare il trigger** alla funzione nuova — cioè **il difetto B1** che l'esecutore aveva
   trovato nel brief: applicata così, la migration sarebbe **un no-op verde**, e ogni sonda avrebbe
   misurato il comportamento **vecchio**.

🔑 **Perché una sentinella e non «stare attenti»:** l'emendamento di D323 dice che **la guardia dei
documenti controlla la coerenza, non la verità** — non può vedere uno scarto fra un verbale e una
funzione in banca dati. Senza una prova meccanica, la prima «pulizia» che nota la differenza rimette il
token **credendo di sistemare un refuso**.

---

## 2. IL MODELLO È GIÀ IN CASA — non se ne inventa uno

🛑 **Cerca il precedente per COMPORTAMENTO, non per nome:** `tests/**/*-spia-migration.test.ts` (o come si
chiamano davvero: **guardali**). Sono prove che sorvegliano **il contenuto di una migration** e che
**girano dentro `verify:full`**, cioè in CI — a differenza delle sonde SQL, che non ci girano.
**Riusa quel modello**, non farne un secondo.

- [ ] **Passo 1 — apri il modello esistente** e scrivi nel resoconto **come funziona** e perché è quello
  giusto (o perché non lo è, se lo trovi inadatto: allora dillo e proponi).
- [ ] **Passo 2 — la sentinella**, che deve accendersi su **tutte e tre** le mutazioni del §1.
  ⚠️ **Il perimetro minimo**: il predicato sottrae **`post_consegna_correzioni` e basta** · il trigger
  `trg_lavori_updated_at` su `lavori` punta a **`public.lavori_set_updated_at`** · la
  `trigger_set_updated_at` **condivisa non è stata toccata**.
- [ ] **Passo 3 — 🛑 VEDILE DIVENTARE ROSSE, tutte e tre**, rompendo apposta il file della migration, e
  **incolla l'output**. Una sentinella che non si accende è **peggio** di nessuna sentinella: dichiara una
  protezione che non c'è. *È la lezione ripetuta tutto il giorno.*
- [ ] **Passo 4 — la sentinella deve dire PERCHÉ**, non solo fallire: nel messaggio va **il rimando a
  D323 e al suo emendamento**, e la ragione in una riga («*sottrarre anche `updated_at` pinza un UPDATE
  che assegna solo quel campo: `lavoro_denti_sostituisci_atomica` fa DELETE+INSERT, l'aggiornamento perso
  è totale*»). Chi la vede rossa fra sei mesi deve capire **subito** che non è un refuso.
- [ ] **Passo 5 — 🔑 E COPRI L'ACCOPPIAMENTO DICHIARATO NELL'EMENDAMENTO:** il trigger e la riga
  `payload.updated_at = new Date()…` di `PATCH /api/lavori/[id]` sono **accoppiati** — rimettere quella
  riga spegnerebbe la pinzatura su **ogni** PATCH. L'emendamento dice «*serve una sentinella che li tenga
  insieme*»: **questa è quella sentinella.** Se decidi che vada in una prova separata, **scrivi perché**.
- [ ] **Passo 6 — FASE 7** e salva.

---

## 3. LE REGOLE

- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — 🛑 **`timeout: 600000`**,
  uscita **da variabile**. Base: **5676 | 68 su 455**.
- ⚖️ **D318 — `git add <percorsi>`, MAI `git add -A`.** Messaggi lunghi con `-F <file>`.
- 🛑 **Nessuna migration nuova** (non serve): il database è già a posto. Se ti sembra di averne bisogno,
  **fermati e riferisci**.
- **R-E2:** un difetto fuori mandato si **riferisce**.
- 🛑 **Niente FASE 9 e niente gate L2** (Task D-bis, dopo).
- 🔴 **Cerca dove questo brief sbaglia.** In quest'ondata **quattordici compiti su quattordici** hanno
  trovato un difetto reale nel proprio mandato.

---

## 4. ⚠️ GIÀ NOTI — non segnalarli come nuovi

**I2** (il `COMMENT` dice «fail-closed»: vero per le colonne, falso per gli scrittori) · **I3** (la
scorciatoia del carico vuoto può rispondere `200 {lavoro: null}`) · **I4** (il censimento vero è 20
funzioni, ma **nessun oggetto rotto** in più) · `ddc_lavoro_attiva_unique` mancante da
`atto-unico-errori.ts` · i **sette** 409 indistinguibili · `useLavoroForm.ts:291` con `?? null` ·
`_audit_lavori` che registra righe con `old_data.updated_at == new_data.updated_at` (interagisce con
**D324**) · **la domanda aperta della FASE 9**: il foglio si chiude con `setFase('chiuso')` ma è montato
con `onChiudi={ricomincia}`, e **in jsdom quel meccanismo è finto**.

---

## 5. IL RESOCONTO — `.superpowers/sdd/atto-unico-task-d-quinquies-report.md`

1. **Il modello che hai riusato**, e come funziona.
2. **Le tre mutazioni viste diventare ROSSE**, con l'output incollato.
3. **Che cosa hai deciso sull'accoppiamento** col `PATCH` e perché.
4. **La FASE 7** con l'uscita letta da variabile.
5. 🔴 **Dove questo brief sbaglia.**
6. **I ritrovamenti fuori mandato.**
7. **Che cosa NON hai fatto.**
