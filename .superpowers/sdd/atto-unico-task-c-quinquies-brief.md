# BRIEF — Task C-quinquies: il numero di prescrizione esce (D319)

**Una voce in meno sul documento, e un compito intero cancellato.**

**Decisione che lo ordina:** ⚖️ **D319** — `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
**centotrentottesima tornata**. Leggila per prima: porta la fonte, i tre fatti misurati e **l'elenco di
ciò che cade**.
**Ramo:** `intervento-post-consegna` (in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `f41565a7`. **Task A · B · C-bis · C-ter · C · C-quater sono COMPLETI**.

⚠️ **HA UNA MIGRATION** (la quarta) → `date -u "+%Y%m%d%H%M%S"` in comando **separato** (D311) ·
`npx supabase db push --linked --yes` **senza chiedere** (D284) · **FASE 6b** · **FASE 7 piena**.
🕛 **PAVIMENTO: `20260808112700`.** 🛑 **Migration NUOVA**, mai una modifica alle tre già nel ledger.

---

## 🔴 IL COMPITO IN UNA FRASE

Il **numero di prescrizione** non è un contenuto dovuto dall'Allegato XIII: **esce dal documento e dalle
voci correggibili**. Le due colonne in banca dati **restano** — non si cancella niente — ma da oggi
**nessuno le legge e nessuno le scrive**, e questo va **scritto accanto a entrambe**.

**Perché:** l'Allegato XIII punto 1, sulla prescrizione, chiede **due** cose — *«il nome della persona che
ha prescritto il dispositivo… e, se del caso, il nome dell'istituzione sanitaria»* e *«le caratteristiche
specifiche del prodotto indicate nella prescrizione»*. **Un numero non compare fra gli otto trattini.**
E i fatti: **0 su 299** lavori lo portano · `lavori_prescrizioni` **non ha nemmeno una riga** · la riga
sul PDF è **condizionale** e non si è **mai** avverata · il wizard **non ha la casella**.

---

## 📋 IL PERIMETRO — cinque punti, e il quinto è quello che si dimentica

- [ ] **1. Il generatore** — `src/lib/pdf/generate-ddc.ts:257`: via `prescrizione_id`.
  ⚠️ **MISURA PRIMA di togliere:** `payload_sha256` (`:360`) è calcolato su quella riga? Se sì, togliere
  una chiave **cambia l'impronta** delle emissioni future. **Scrivilo nel resoconto**, non scoprirlo dopo.
- [ ] **2. Il foglio** — `src/components/features/pdf/DdcTemplate.tsx:402-406`: via il blocco condizionale
  «N. prescrizione» dal **§3 Prescrittore**. ⚠️ Resta il nome del prescrittore, che è **dovuto**.
- [ ] **3. L'allowlist TypeScript** — `src/lib/dichiarazione/correzioni.ts`: `numero_prescrizione` esce da
  `CAMPI_CORREGGIBILI_DOCUMENTO` **e** da `CAMPI_TESTO`. ➡️ **Otto nomi diventano SETTE**, e le voci a
  schermo **sette diventano SEI**. Aggiorna il commento in testa al file, che oggi dice «otto nomi per
  sette voci».
- [ ] **4. L'allowlist SQL** — la migration: `numero_prescrizione` esce dall'allowlist di `p_correzioni`
  nella RPC `correggi_e_riemetti_atomica`. 🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`**
  (l'idioma di casa, e l'unica forma in cui il `REVOKE` è portante: dopo un `CREATE` fresco Postgres
  concede `EXECUTE` a `PUBLIC`, `anon` e `authenticated` — **misurato** dalla revisione del C-ter).
  ⚠️ **Il resto del corpo NON si tocca.** Se lì trovi un difetto: **R-E2, lo riferisci.**
- [ ] **5. 🛑 LE DUE COLONNE ORFANE PORTANO LA LORO RIGA SCRITTA.** `lavori.numero_prescrizione` e
  `lavori_prescrizioni.numero_prescrizione` **restano vive in banca dati e non le legge né le scrive più
  nessuno**. Scrivi **accanto a entrambe** (commento nel codice dove sono nominate, e una riga in
  roadmap) che **da D319 sono un cimitero dichiarato**.
  🔑 **È R-P6 alla lettera:** *ogni nome tolto da un'allowlist porta la sua destinazione* — e qui la
  destinazione è **«nessuna, e per scelta»**. ⚠️ Il progetto ha **già pagato** questo esatto errore:
  `R34` nel verbale racconta di una colonna rimasta senza scrittori e di otto lettori che «*sorvegliano
  uno stato che niente produce*», con la nota che è «*la cosa che confonderà qualcuno fra sei mesi*».

---

## 📌 `ddc-v3` NON DIVENTA `ddc-v4`, e non è una scorciatoia

La regola è **già scritta** nel registro (`generate-ddc.ts:104-110`): *il registro salta quando cambia ciò
che il documento **dice***. Qui **nessuna dichiarazione emessa cambia di una riga**, perché quella riga
**non è mai stata stampata** (condizionale mai avverata, colonna vuota su 299 lavori su 299). È lo stesso
ragionamento, con gli stessi termini, già applicato a `contiene_sostanze_o_tessuti`.
🛑 **Se misurando trovi che una dichiarazione emessa la porta davvero, FERMATI E RIFERISCI:** cadrebbe il
presupposto, e il salto di versione tornerebbe dovuto.

---

## ✅ LE PROVE

- Le prove che oggi asseriscono `numero_prescrizione` fra i campi correggibili vanno **aggiornate, non
  cancellate**: devono ora asserire che quel nome è **rifiutato** — sia dal TypeScript sia dalla RPC.
- **R-P4:** dimostra che la prova nuova **diventa rossa** se rimetti il nome nell'allowlist. 🔑 *Oggi
  questa ondata ha incontrato **quattro volte** una prova che non poteva fallire, e l'ultimo compito ne
  ha trovata una che era pura decorazione — passava sia con la regola vecchia sia con quella nuova.*
- **FASE 7 piena:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — timeout ≥ 400000 ms,
  uscita **da variabile**. Base: **`5617 | 68 su 454`**. ⚠️ Qui il numero **può scendere** (togli una
  voce): se scende, **scrivi di quanto e perché**; se sale, spiega cosa l'ha mosso.

## 🛑 LE REGOLE DI CASA

- ⚖️ **D318 — `git add <percorsi>` coi tuoi file, MAI `git add -A`.** ⚠️ Con `-m` attento ai **backtick**:
  la shell li esegue e ti mangia la parola — usa `-F <file>`.
- **BP-1** (§0A): `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md`. ⚠️ In MEMORY.md «voce N» è
  **riservata** alle sezioni della memoria: per la roadmap si scrive «la riga N della coda» — la guardia
  blocca il commit, e l'ha già fatto oggi.
- **FASE 9 / 9b:** il **PDF** non è una superficie dell'app (non ha viewport né temi) → non dovute. 🛑 Ma
  **guarda il documento generato**, almeno una volta: il §3 non deve restare con un buco o un'etichetta
  orfana.
- **R-E2 — i difetti fuori mandato si riferiscono.** Già noti, da **non** toccare: **I3** la porta
  d'idempotenza ha **una sola** asserzione (con le colonne invertite le prove di comportamento restano
  verdi — *stessa famiglia dei due critici appena chiusi, e vive nel file che tocchi*) · **M1** lo
  `switch` della rotta senza `default` · **I2** `paziente_nome_snapshot` vince sull'embed (va deciso nel
  Task D) · `riemetti_ddc_atomica` accetta ancora tutto (roadmap, riga 26) · `{anno_ddc: null}`.
- **Cerca dove questo brief sbaglia.** Oggi: cinque difetti nel brief del Task B (due dell'orchestratore),
  tre nel C-bis, tre nel C-ter, due nel Task C, cinque nel C-quater; e le revisioni ne hanno trovati
  **quattro** dell'orchestratore nel piano — righe marcate «provato» che erano **false**.
- **Resoconto** in `.superpowers/sdd/atto-unico-task-c-quinquies-report.md`, con gli output incollati e
  **cosa NON hai fatto**.
