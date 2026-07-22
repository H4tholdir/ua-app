# Handoff — Ondata «Collaudo R1 — bug fix»: ESECUZIONE
**Data:** 22/07/2026 sera · **Per:** sessione NUOVA a contesto pulito
**Stato:** design e piano COMPLETI e ratificati. Questa sessione ESEGUE il piano con subagent
(scelta esplicita di Francesco: subagent-driven, sessione nuova). Nessuna decisione di design
aperta: sono state tutte prese — non riaprirle.

## Documenti (in ordine di lettura)

1. **Piano (da eseguire):** `docs/superpowers/plans/2026-07-22-collaudo-r1.md` — 8 task TDD con
   codice completo per ogni step. Global Constraints in testa al piano: valgono per OGNI task.
2. **Spec (contesto e root cause):** `docs/superpowers/specs/2026-07-22-collaudo-r1-design.md`
   (§2 root cause ACCERTATE con file:riga — P9 emendata in fase piano: leggere la versione nel file).
3. **Triage e ratifiche:** `docs/roadmap/2026-07-22-collaudo-device-parete-triage.md` — cosa ha
   visto Francesco sui device e cosa ha ratificato (4 decisioni + direttiva back permanente,
   già in CLAUDE.md §9).

## Sequenza esatta

1. **FASE 5 — worktree:** `superpowers:using-git-worktrees` → branch `worktree-collaudo-r1` da
   `main` (≥ `b657fd7`). Base pulita: tutto è committato e pushato.
2. **Esecuzione:** `superpowers:subagent-driven-development` — un implementer per task nel
   worktree, review per task (prassi SDD del progetto: ledger in `.superpowers/sdd/progress.md`
   del worktree, brief estratti dal piano). Ordine task 1→7, poi Task 8 (chiusura).
3. **Task 8 — chiusura:** FASE 7 output reali → review finale whole-branch → FASE 9 QA browser
   sul lab E2E `00000000-0000-0000-0000-000000000001` (MAI lab Filippo) → FASE 9b Gate L2
   (screenshot in `docs/design/screenshots/2026-07-22-collaudo-r1/`) → **🛑 STOP: merge/push SOLO
   su ratifica esplicita di Francesco.** P9 e P11 si chiudono davvero solo con la sua prova su
   device DOPO il deploy.
4. **FASE 11 — BP-1** dopo il merge (MEMORY + ROADMAP + SESSION_ACTIVE).

## Vincoli operativi (pagati con difetti veri nelle ondate precedenti — NON derogare)

- **UN solo implementer/commit alla volta sul branch**: lint-staged fa stash/unstash del
  non-staged e corrompe il lavoro in volo di un altro agente.
- **Test in `tests/unit/`, MAI `src/**/__tests__/`** (D-O1: vitest non li scopre → RED finto).
- **L'albero non resta MAI rosso su tsc**: l'hook pre-commit esegue `tsc --noEmit` sull'INTERO
  progetto a ogni commit.
- **MAI hex nei .tsx** (unica sede TS legittima: `src/design-system/v3/tokens.ts` — il piano
  Task 4 la usa); motion SOLO da token; superfici v2.3 restano v2.3 (DS v3 §14).
- **Nei dispatch niente istruzioni a voce come «documenti che vincono»** — il brief è il piano.
- **Un esito di tool che contraddice le attese si verifica alla fonte** prima di agire.
- **Task 3 (P9): se il test RED non fallisce come previsto, FERMARSI e riportare** — l'ipotesi
  sarebbe sbagliata, non «sistemare» a caso (il piano lo prescrive allo Step 2).
- **Flake vitest noto**: se ricompare sotto carico non è di quest'ondata (intervento di classe
  già calendarizzato come task post-merge separato) — annotare, non inseguire.

## Contesto minimo sul perché (per non riaprire decisioni)

I 5 bug vengono dal collaudo su device di Francesco (22/07, Android + iPhone) dopo il deploy
della Parete delle Cassette. Ratifiche del 22/07 sera già incise: back = pagina precedente
OVUNQUE (direttiva permanente, CLAUDE.md §9) · «×» ricerca su TUTTI i campi · le altre decisioni
del collaudo (swipe→parete, ricerca «filtra e risali», «Metti un lavoro» sulla libera) sono di
ondate SUCCESSIVE — fuori scope qui, non anticiparle.

Dopo questa ondata, l'ordine ratificato è: intervento di classe flake vitest → ondata «iOS
fluidità» (punti 1, 2, 8) → ondata «Redesign parete/home» (punti 4, 6, 12 + 5 + 13) →
«Miniature 38 + legenda» → D-11. È in ROADMAP-UFFICIALE.md.
