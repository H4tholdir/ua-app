# BRIEF — Task C-bis del piano «Correggi e rifai la dichiarazione»

**L'irrigidimento in SQL: `p_nuova` smette di accettare ciò che non deve.**

**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md` — 🛑 leggi la
sezione **«Task C»**, e dentro di essa **C0 · C1** (le due cose che chiudi) e le **misure di apertura
P13-P17**. Poi il blocco **«MISURE DI APERTURA DEL TASK B» (P7-P12)**, che descrive la funzione che stai
per modificare.
**Ramo:** `intervento-post-consegna` (già in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `0379450d`. **Task A e Task B sono COMPLETI** e non si rifanno.

⚠️ **QUESTO TASK HA UNA MIGRATION** → `date -u "+%Y%m%d%H%M%S"` in un comando **separato** (D311),
`npx supabase db push --linked --yes` **senza chiedere** (D284), **FASE 6b dovuta**.
🕛 **PAVIMENTO NUOVO: `20260808093513`** — l'ha alzato il Task B stamattina, non è più `20260807185858`.

🛑 **MIGRATION NUOVA, MAI UNA MODIFICA A QUELLA DEL TASK B.** `20260808093513_correggi_e_riemetti_atomica.sql`
è **già applicata e registrata nel ledger**: toccarla disallineerebbe il ledger dal catalogo. L'idioma di
casa è un file nuovo con `DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`.

---

## 🔴 IL COMPITO IN UNA FRASE

`correggi_e_riemetti_atomica` valida `p_correzioni` con un'allowlist di otto nomi scritti a mano, **ma
`p_nuova` no**: lì il controllo ereditato chiede solo «*è una colonna di `dichiarazioni_conformita`?*».
Devi chiudere **due porte** che quel controllo lascia aperte, **in una sola `CREATE OR REPLACE`**.

### 🔴 C0 — `stato` passa, e la strada gentile porta allo stato peggiore

`stato` **è** una colonna, quindi supera il controllo. `provato:` dalla revisione indipendente:
`{"stato":"annullata"}` in `p_nuova` torna **`esito: ok`** e lascia `totali: 2 · VIVE: 0` — cioè **un
lavoro consegnato senza nessuna dichiarazione viva**, raggiunto dalla **porta principale** invece che
forzando. È lo stato che il commento della funzione stessa (righe 111-118) dichiara **non segnalabile da
nessun indice**, perché «zero dichiarazioni» è legittimo per un lavoro mai consegnato.

📌 **È EREDITATO**: `riemetti_ddc_atomica` fa lo stesso (riprovato dal revisore). E **oggi non ci passa
nessuno** — `costruisciDichiarazione` non mette `stato` fra le chiavi (P16). 🔑 **Si chiude lo stesso,
perché un contratto si giudica per ciò che PERMETTE, non per ciò che oggi gli si chiede**, e questa RPC
non conosce i suoi chiamanti futuri.

### 🔴 C1 — `numero_ddc` si DERIVA, non si accetta

`provato:` sui vincoli vivi — gli unici CHECK su `dichiarazioni_conformita` sono `ddc_no_self_ref`,
`…_classe_rischio_check`, `…_stato_check: **nessuno lega `numero_ddc` alla coppia
`anno_ddc`+`progressivo_ddc`**, che è invece l'unico indice unico
(`dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key`).

➡️ Omettere `progressivo_ddc` collide **rumorosamente**; passare un `numero_ddc` **incoerente** con la
sua coppia **non collide affatto** → **due documenti a valore legale con lo stesso numero stampato**, con
`esito: ok`.

⚠️ **Il resoconto del Task B dice questo in modo sbagliato a metà** (§7d): porta già la nota di
correzione, ma se leggi solo la riga originale esci col fatto sbagliato.

🔑 **La regola che ti si chiede è la più stretta delle due possibili:** non «*il chiamante deve passare un
numero nuovo*» (che va ricordato, quindi si dimentica), ma **«`numero_ddc` si DERIVA da
`anno_ddc`+`progressivo_ddc` dentro la funzione, e non si accetta MAI dal chiamante»**.
⚠️ **Guarda come lo compone oggi `costruisciDichiarazione`** (`src/lib/pdf/generate-ddc.ts:225-226`) e
**deriva con la stessa forma** — due modi diversi di comporre lo stesso numero sarebbero **due fonti
della stessa verità**, cioè il difetto che questa ondata ha già incontrato tre volte.
🛑 Se la derivazione in SQL ti risultasse **non equivalente** a quella TypeScript, **fermati e riferisci**:
è una domanda di perimetro, non un dettaglio da decidere di fretta.

---

## 📋 I PASSI

- [ ] **Passo 0 — apri e leggi**, e scrivi nel resoconto cosa hai trovato:
  - il corpo **vivo** di `correggi_e_riemetti_atomica` (🛑 **dal catalogo, non dal file**:
    `node scripts/psql.mjs -c "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='correggi_e_riemetti_atomica'"`);
  - `supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql` (com'è scritta l'allowlist delle otto);
  - `src/lib/pdf/generate-ddc.ts:225-226` e `:233-364` (come nasce oggi la riga, e il numero);
  - `.superpowers/sdd/atto-unico-task-b-review.md` (le prove di C0 e C1, già incollate).
- [ ] **Passo 1 — le sonde PRIMA, e devono essere ROSSE.** Sull'oggetto **vivo di adesso**, in transazione
  annullata: ① `p_nuova` con `{"stato":"annullata"}` → oggi torna **`ok`** (incolla l'output: è la prova
  che il difetto esiste) · ② `p_nuova` con un `numero_ddc` incoerente → oggi **passa** (idem).
  🔑 *Sono il tuo rosso: senza, non sai se la correzione corregge qualcosa.*
- [ ] **Passo 2 — una sola `CREATE OR REPLACE`** che chiude entrambe. Rifai `REVOKE` / `GRANT` /
  `COMMENT`, e **aggiorna il `COMMENT`** perché descriva anche il nuovo confine di `p_nuova`.
  ⚠️ **Il resto del corpo NON si tocca**: ordine annulla → correggi → inserisci, fail-closed
  sull'annullo, allowlist delle otto, chiamate alle penne. Se ti accorgi che qualcosa lì è sbagliato,
  **R-E2: lo riferisci, non lo correggi.**
- [ ] **Passo 3 — le sonde di nuovo, e ora devono essere VERDI**, più:
  ③ una chiamata **buona** che deve continuare a funzionare (**la non-regressione**: il giro completo
  del Task B, con l'atterraggio verificato) · ④ `42501` con la **chiave pubblica** · ⑤ una chiave di
  `p_nuova` che **deve restare ammessa** (per non aver chiuso troppo).
  🛑 **UNA INVOCAZIONE PER SONDA**, fixture creata **dentro** la transazione annullata.
  ⚠️ **Due trappole misurate, che ti fanno credere a un verde che non c'è:**
  - **`scripts/psql.mjs` si collega come `postgres`, cioè come PROPRIETARIO** (`current_user = postgres`):
    una sonda sui **permessi** senza `SET LOCAL ROLE` **non prova niente**;
  - **`now()` è COSTANTE dentro una transazione** (`now() = transaction_timestamp()` → `true`): una
    fixture creata lì dentro nasce col gettone già «giusto», quindi una sonda sul conflitto **non può
    fallire**. Il Task B l'ha chiusa **arretrando `updated_at` di un'ora** nella fixture.
- [ ] **Passo 4 — applica** (`npx supabase db push --linked --yes`), **rileggi dal catalogo** ciò che hai
  scritto, poi **FASE 6b**: `gen types` → `tsc`.
- [ ] **Passo 5 — FASE 7 PIENA, e non ti fermare a `tsc`:**
  ```bash
  npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
  ```
  ⚠️ **Ci mette più di due minuti** (dagli ≥ 400000 ms) e **l'uscita si legge da variabile**: dietro una
  pipe è quella dell'ultimo comando. 📌 Il Task B si era fermato a `tsc` e l'ha dovuto rifare
  l'orchestratore: la regola di casa è che «fatto» non si dichiara con **uno** dei tre controlli.
  📌 **Aspettativa dichiarata:** questo compito è SQL, quindi il numero delle prove automatiche
  **resterà 5492** — e se resta, **scrivi perché**, come ha fatto il Task B. Un numero fermo che nessuno
  spiega somiglia a una misura non fatta.
- [ ] **Passo 6 — salva.** ⚖️ **D318: `git add <percorsi>` nominando i tuoi file, MAI `git add -A`.**
  Titolo che nomina il compito.

---

## 🛑 LE REGOLE DI CASA

- **R-E2 — un difetto fuori mandato si RIFERISCE, non si corregge.** Ne conosci già alcuni da **non**
  toccare: `{"denti_coinvolti": []}` cancella tutti i denti ed è indistinguibile da una correzione
  voluta · `p_correzioni` non rifiuta mai il **vuoto** (C2) · `numero_prescrizione` vive in due posti ·
  `tipo` è accettato dalla penna della prescrizione ma non arriva mai sul documento (D213).
  🔑 **C2 in particolare NON è tuo**: è del Task C, e sta nella rotta.
- **Il file di migration non è la prova: la verità è il catalogo vivo.**
- **Cerca attivamente dove questo brief sbaglia**, e scrivilo. Gli otto compiti del piano precedente
  hanno trovato otto difetti su otto; il Task B ne ha trovati cinque nel suo brief, di cui **due miei**.
- **Niente `rm -rf`** fuori dalle aree temporanee (`/usr/bin/trash`).
- Credenziali per le sonde: `set -a && . ./.env.local; set +a`.
- **Il resoconto** va in `.superpowers/sdd/atto-unico-task-c-bis-report.md`, con **l'output reale
  incollato** di ogni sonda (rossa **e** verde), i difetti del brief, i ritrovamenti fuori mandato, e
  **cosa NON hai fatto**.
