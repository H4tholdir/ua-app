# Ondata 3b (slice) — Handoff esecuzione (sessione nuova, contesto pulito)

> **Preparato:** 2026-07-14, a fine brainstorming+piano. **Owner:** Francesco.
> Eseguibile da una sessione Claude Code fresca senza la conversazione precedente.
> Il hook BP-0 inietta PINNED.md + MEMORY.md all'avvio: leggerli prima di iniziare.

---

## 0. Cosa è già fatto (questa sessione)
- **Design approvato** con 2 review specializzate integrate (solution-architect + frontend-ui-builder): `docs/superpowers/specs/2026-07-14-ondata-3b-nota-dentista-reskin-ponte-design.md` (commit `9b7f426`, **solo locale**).
- **Piano pronto**, 10 task TDD con codice reale: `docs/superpowers/plans/2026-07-14-ondata-3b-nota-dentista-reskin-ponte.md` (commit `80cea7d`, **solo locale**).
- `main` locale = `80cea7d`, avanti di **2 commit** su `origin/main` (spec + piano, docs-only, **non pushati** — decidere se pushare, triggera CD Vercel inerte).
- Nessun codice scritto: la sessione nuova **esegue il piano**.

## 1. Scope della slice (deciso in brainstorming)
Ondata 3b è stata **decomposta**. Questa slice = **P1 (nota dentista) + P4 (reskin form ponte)**. Deferiti (tracciati, NON in questa slice):
- **P3** rebuild nativo flussi ⋯ pesanti → YAGNI (BACKLOG O6j).
- **P2/N4** fonte di verità del prezzo (`prezzo_unitario` vs righe `lavori_lavorazioni`, portale 322€/fattura 112€) → **task fiscale GRANDE dedicato** (BACKLOG N4). Non bloccante su DB di test.
- **Chat portale** WhatsApp dentista↔lab → feature futura su tabella `messaggi`.

## 2. Come eseguire
1. **FASE 5 — worktree dedicato:** `superpowers:using-git-worktrees` → `worktree-ondata-3b-nota-reskin` (copia `.env.local`; baseline test attesa **1596 pass | 4 skipped**).
2. **Esecuzione:** `superpowers:subagent-driven-development` sul piano (10 task, ogni task review spec+qualità).
3. **⚠️ Task 1 si ferma al GATE apply migration:** l'`ALTER TABLE lavori` (3 colonne additive) va applicato al DB live **solo su conferma esplicita di Francesco** (`npx supabase db push`), poi FASE 6b (`gen types` + `tsc`).
4. **QA browser:** lab E2E `00000000-0000-0000-0000-000000000001`, **MAI lab Filippo**.
5. **Gate estetico L2 (FASE 9b):** matrice **dark × 3 viewport non negoziabile** (è lì il bug dark scoperto), screenshot before/after inclusi dark in `docs/design/screenshots/2026-07-14-ondata-3b/`.
6. **BP-1** a fine lavoro; **merge/push = gate esplicito di Francesco** (review finale whole-branch prima).

## 3. Punti caldi da non perdere (dai review specializzati)
- **🔴 Task 3 (bloccante):** `useRealtimeNotifiche.ts` rileva le nuove richieste dal portale su `note_interne.startsWith('RICHIESTA_DENTISTA')`. Svuotando `note_interne` senza il fix, **il lab smette di ricevere la notifica realtime**. Fix = predicato `da_portale===true` (Task 2/3). Verificare a runtime che `da_portale` sia nel payload INSERT Realtime.
- **Task 6:** il buono di lavorazione stampa `note_interne` come «Note»; spostando la nota in `note_dentista` sparirebbe dal cartaceo d'officina → il buono deve stampare `note_dentista` (decisione Francesco: SÌ).
- **Task 8 (leva del reskin):** NON find/replace su `form/styles.ts` (usa già le CSS-vars, gli hex sono solo fallback). La leva è **aliasare le variabili** (`--t1/--t2/--sh-b/--sh-i/--line`) su uno scope `[data-ds="v3"] .lavoro-form-v3` in `ds-v3.css` → fixa anche il **bug dark** (shadow raised dove v3 vuole flat). Il vero lavoro manuale è lo **sweep del font** `DM Sans`→`var(--font-v3)` (Task 9, sparso nei tab).

## 4. Regole operative (dal CLAUDE.md)
- Lab E2E `…0001`, **MAI lab Filippo**.
- Migration presente → FASE 6b obbligatoria; apply = gate Francesco.
- Le 3 colonne nuove **fuori** da `PATCHABLE_FIELDS` (read-only per il lab) — Task 7 lo blinda.
- Ogni ondata con UI: gate estetico L2 prima del merge.
- Merge/push = gate esplicito di Francesco.
