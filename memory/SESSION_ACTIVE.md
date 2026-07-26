# Sessione attiva — tappa 3 «un tema solo» (26/07/2026, notte)

**Dove:** worktree `un-tema-solo`, branch `worktree-un-tema-solo`, **9 commit** oltre `main` (`9927da61`).
**Stato: COMPLETA sul ramo, NON mergiata.**

**Verifiche fatte (output reale):** tsc **0** · vitest **3364 verdi / 19 skip** · `next build`
**Compiled successfully** · QA **18/18** (3 viewport × 2 temi × 3 rotte, telefono sempre chiaro:
il tema scuro poteva venire solo dalla preferenza). Catture:
`docs/design/screenshots/2026-07-26-tema-unico/`.

⏳ **MANCA SOLO:**
1. QA di `/impostazioni` (la nuova riga «Tema») e `/admin` — **servono le credenziali**: chiesto a
   Francesco di entrare lui nel browser, non digitate da me.
2. Il via libera al merge (FASE 10) e la verifica su `uachelab.com`.

📌 **D6-bis:** l'approvazione di `blocked`/`billing` è **condizionata** alla revisione nell'ondata
F2 «accessi». Se F2 cambia, decade. Scritta in `docs/design/decisions/2026-07-26-un-tema-solo.md`.

⚠️ **Nel worktree il dev server non parte** (doppio lockfile → Turbopack sceglie la radice sbagliata;
il symlink di `node_modules` lo fa andare in panico). Via d'uscita: ramo di sola verifica nel repo
principale sullo stesso commit, QA lì, poi ritorno su `main`. Dettaglio in MEMORY.md voce 47.
