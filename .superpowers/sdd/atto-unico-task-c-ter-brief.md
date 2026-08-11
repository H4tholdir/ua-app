# BRIEF — Task C-ter del piano «Correggi e rifai la dichiarazione»

**La coppia `anno_ddc` / `progressivo_ddc` è INDIVISIBILE.**

**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md` — sezione
**«Task C»**, e dentro di essa la voce **Task C-ter** (il tuo mandato, con le due prove già incollate) e
le misure **P13-P17 + P16-bis**.
**Prima di tutto:** `.superpowers/sdd/atto-unico-task-c-bis-review.md` — è la revisione che ha trovato
questo buco, e porta l'output delle sonde.
**Ramo:** `intervento-post-consegna` (in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `2e9b4960`. **Task A · B · C-bis sono COMPLETI** e non si rifanno.

⚠️ **HA UNA MIGRATION** → `date -u "+%Y%m%d%H%M%S"` in comando **separato** (D311) ·
`npx supabase db push --linked --yes` **senza chiedere** (D284) · **FASE 6b** · **FASE 7 piena**.
🕛 **PAVIMENTO: `20260808103515`** (l'ha alzato il C-bis un'ora fa).
🛑 **MIGRATION NUOVA, mai una modifica ai due file già applicati e nel ledger.**

---

## 🔴 IL COMPITO IN UNA FRASE

`correggi_e_riemetti_atomica` ora **deriva** `numero_ddc` da `anno_ddc` + `progressivo_ddc` (C1). Ma la
**coppia da cui lo deriva non è protetta**: se ne arriva **una sola**, l'altra **si eredita in silenzio**
dalla dichiarazione vecchia, e il numero che ne esce è **plausibile e sbagliato**.

**Le due prove, già misurate — non devi riscoprirle, devi partire da lì:**

| chi | sonda | esito di oggi |
|---|---|---|
| esecutore C-bis | `p_nuova = {'progressivo_ddc': 999005}`, **senza** anno, su una vecchia del 2098 | `"numero": "DDC-2098-999005"` — **l'anno si eredita** |
| revisione | `p_nuova = {'anno_ddc': 2099}`, **senza** progressivo | `esito: ok`, nasce **`DDC-2099-998001`** — un progressivo **mai prenotato per quell'anno** |

🛑 **LA REGOLA È `XOR`: o entrambe, o nessuna.** ⚠️ **Non** quella asimmetrica del resoconto del C-bis
(«pretendi l'anno quando c'è il progressivo»): ne chiuderebbe **metà**, ed è la metà che l'esecutore
aveva visto — non l'altra.

🔑 **Perché è sicuro imporlo, e non è un'assunzione:** mandarne **zero** già fallisce rumorosamente
(`23505` sull'indice della coppia), e **l'unico chiamante legittimo le manda sempre tutte e due**
(`costruisciDichiarazione`, `src/lib/pdf/generate-ddc.ts:234-236`). La funzione **non ha ancora
chiamanti**: irrigidirla oggi costa una `RAISE`, dopo il Task C costerebbe **contratto più chiamante**.

---

## ⚠️ LA TRAPPOLA CHE HA NASCOSTO QUESTO DIFETTO, e che nasconderà il prossimo

Nessuna delle nove sonde del Task B né delle sette del C-bis aveva preso questo buco. **Non per
distrazione:** la fixture vive nel **2099** e la dichiarazione vecchia è **anch'essa** del 2099, quindi
l'anno ereditato **coincide per caso** e l'asserzione sul numero resta verde.

➡️ **Nella tua fixture l'anno della vecchia DEVE essere DIVERSO da quello che passi** (per esempio
vecchia 2098, nuova 2099). Se non lo fai, le tue sonde saranno verdi **senza provare niente**.

🔑 *È la terza volta oggi che questa ondata incontra la stessa famiglia: una prova che non può fallire.
Le altre due — `now()` costante in transazione, e `psql.mjs` che si collega come proprietario — sono
qui sotto, perché valgono anche per te.*

---

## 📋 I PASSI

- [ ] **Passo 0 — apri e leggi**, e scrivi nel resoconto cosa hai trovato: il corpo **vivo** di
  `correggi_e_riemetti_atomica` (🛑 **dal catalogo**, `pg_get_functiondef`, non dal file) · la migration
  del C-bis `20260808103515_atto_unico_p_nuova_irrigidita.sql` (com'è scritta la guardia che estendi) ·
  `src/lib/pdf/generate-ddc.ts:225-226` e `:234-236`.
- [ ] **Passo 1 — le due sonde ROSSE**, riprodotte da te sull'oggetto vivo di adesso, **con l'anno della
  vecchia diverso**: ① solo `progressivo_ddc` · ② solo `anno_ddc`. Incolla gli output: sono la prova che
  il difetto esiste, e la ② è quella che il C-bis non aveva visto.
- [ ] **Passo 2 — la regola `XOR`**, in una `CREATE OR REPLACE`. Il messaggio dell'eccezione dice **che
  cosa fare**, non solo che è vietato (D262: «la PWA non dà blocchi, dà aiuti» — vale anche per un
  messaggio che leggerà chi scrive il Task C).
  ⚠️ Rifai `REVOKE` / `GRANT` / `COMMENT`, e **aggiorna il `COMMENT`** perché dica anche questa regola.
  🛑 **Il resto del corpo NON si tocca.** Se lì trovi un difetto: **R-E2, lo riferisci.**
- [ ] **Passo 3 — le sonde VERDI**, una invocazione per sonda, in transazione annullata, fixture
  **dentro** la transazione. 🛑 **La revisione ha già scritto quali sono le quattro dovute — leggile
  nel suo giudizio** (`atto-unico-task-c-bis-review.md`), e nota che la sonda di non-regressione del
  C-bis **non manda `anno_ddc`**, quindi sotto la regola nuova **alzerebbe**: va aggiornata, non
  ricopiata.
  In più: ⑤ la coppia **completa** passa (è il caso vero) · ⑥ `42501` con la **chiave pubblica**.
- [ ] **Passo 4 — applica**, **rileggi dal catalogo**, poi **FASE 6b** (`gen types` → `tsc`).
- [ ] **Passo 5 — FASE 7 PIENA:**
  ```bash
  npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
  ```
  timeout ≥ 400000 ms, uscita **da variabile**. 📌 Atteso: **5492 | 68 su 451**, fermo — sei SQL. **Se
  resta fermo, scrivi perché**; se si muove, spiega cosa l'ha mosso.
- [ ] **Passo 6 — salva.** ⚖️ **D318: `git add <percorsi>` coi tuoi file, MAI `git add -A`.**

---

## 🛑 LE TRE TRAPPOLE MISURATE OGGI — nessuna si ripaga due volte

1. **`scripts/psql.mjs` si collega come `postgres`, cioè come PROPRIETARIO** (`current_user = postgres`):
   una sonda sui **permessi** senza `SET LOCAL ROLE` **non prova niente**.
2. **`now()` è COSTANTE dentro una transazione** (`now() = transaction_timestamp()` → `true`): una
   fixture creata lì dentro nasce col gettone già «giusto», e una sonda sul conflitto **non può fallire**.
3. **Una fixture che sceglie i propri valori può nascondere il difetto che dovrebbe mostrare** — è
   questo compito (l'anno che coincide per caso).

## 🛑 E LE REGOLE DI CASA

- **R-E2 — un difetto fuori mandato si RIFERISCE, non si corregge.** Già noti, da **non** toccare:
  `riemetti_ddc_atomica` porta ancora entrambi i buchi ed è quella col **chiamante vivo** (roadmap,
  riga **26** della coda) · `p_correzioni` non rifiuta il **vuoto** (C2, è del Task C) ·
  `{"denti_coinvolti": []}` cancella tutti i denti · `numero_prescrizione` vive in due posti.
- **Il file di migration non è la prova: la verità è il catalogo vivo.**
- **Cerca attivamente dove questo brief sbaglia.** Oggi: il Task B ha trovato **cinque** difetti nel
  proprio brief (due dell'orchestratore), il C-bis **tre**, e la revisione del C-bis ne ha trovati
  **due miei** nel piano (P16 e P17, sbagliate). Se il brief dice una cosa e il catalogo un'altra,
  **vince il catalogo**, e lo scrivi.
- Credenziali: `set -a && . ./.env.local; set +a`. Niente `rm -rf` fuori dalle aree temporanee.
- **Resoconto** in `.superpowers/sdd/atto-unico-task-c-ter-report.md`: output **reale incollato** di ogni
  sonda (rossa e verde), R-P4, difetti del brief, ritrovamenti fuori mandato, e **cosa NON hai fatto**.
