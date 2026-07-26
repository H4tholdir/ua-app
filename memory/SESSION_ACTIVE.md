# Sessione attiva — tappa 3 «un tema solo» (26/07/2026, notte)

**Dove:** worktree `un-tema-solo`, branch `worktree-un-tema-solo`, 4 commit oltre l'handoff.
**Piano:** `docs/superpowers/plans/2026-07-26-tappa-3-un-tema-solo.md` (le tappe 1 e 2 sono in
produzione e verificate sul device — dettaglio nelle voci 45-47 di `MEMORY.md`).

**Fatti:**
- Task 2 `c7585bd` — lo script inline passa a `ua-tema`, ignora e cancella `ua-theme`. I test
  tengono la preferenza **contro** il sistema in entrambe le direzioni (uno concorde non
  distinguerebbe una chiave sbagliata) + **matrice** che confronta `SCRIPT_TEMA` con `risolviTema`
  su ogni combinazione: la regola vive in due copie e nessuna guardia verificava che concordassero.
- Task 3 `22b149d` — `useTheme` a tre stati; via `toggle`/`isDark`; espone `sistemaScuro`.
- Task 4 `e099bfb` — `SceltaTema` in Impostazioni, variante A + frase di stato (DS v2.3).
- Task 5 quasi tutto `6d130a7` — tutti gli interruttori, i 4 form auth, **tutte e 11** le occorrenze
  `data-login-theme` di `globals.css` (il piano ne prevedeva 2: le altre 9 sono override scuri e
  ne' `tsc` ne' i test li avrebbero visti), admin senza `ua-admin-theme`, sonner senza
  `next-themes`, `offline.html` alla chiave nuova, −202 righe di CSS morto.

**tsc 0 · vitest 3359 verdi / 19 skip.**

⏳ **Bloccato su:** `blocked` e `billing`, UI mai vista prima → serve l'ok di Francesco (§0B).
Anteprime: `docs/design/mockups/screenshots/2026-07-26-{blocked,billing}-390-{chiaro,scuro}-*.png`.
**Task 6 dipende da quelle due** (assert su `data-login-theme` sparito).

**Poi:** Task 6 (guardia del censimento) → Task 7 (verifica, QA 390/768/1280 × light+dark, gate
estetico L2, deploy, BP-1).
