# Sessione attiva — regole ratificate + guardie agganciate; l'ondata (a) riprende dal T9 (28/07/2026)

🛑 **PUNTO DI RIPRESA dell'ondata:** `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md`.
🛑 **Branch `ondata-a-denti-colore`**, repo principale. **Niente in produzione, mai mergiato.**

⚖️ **REGOLE DI METODO PERMANENTI** (`CLAUDE.md` §0C, «REGOLE DI PIANO»): **R-P1** blocco senza marchio
= NON provato · **R-P2** l'elenco dei file da aprire **non lo decide l'autore** · **R-P6** 🆕 censimento
su ogni *identificatore* · **R-P4** abbozzo inerte + conteggio · **R-E1** un compito, un esecutore
fresco · **R-E2** si riferisce, non si patcha. Verbale del panel: post-mortem §7.
🛑 **NON retroattive su T9-T13** (piano anteriore). Unico innesto: **al T10 la tabella di destinazione
R-P6** — ogni nome che esce da `PATCHABLE_FIELDS` con scritto chi lo scriverà.

🛡️ **GUARDIE — ramo `guardie-agganciate` (da `main`), commit `eddb6996`, PRONTO AL MERGE**, indipendente
dal wizard. Nessuna delle 4 era eseguita da niente; **2 non potevano nemmeno fallire**. Agganciate al
pre-commit: `check-csrf.sh` (0,33 s, riscritta) + `guardia-reduced-motion.mjs` (4,6 s). Manuali per
scelta: `guardia-navigazione-overlay` (serve app+credenziali+fixture) e `guardia-stili-collaudo`
(strumento da banco). Tolte 104 righe su 149 di config morta in `.claude/settings.json`.
🔑 husky esegue il gancio con **`sh -e`**: il primo comando che fallisce ferma il commit.
⚠️ **`.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit** — cestinare `.next`.
⏸️ **Aperto:** 2 route WebAuthn senza verifica d'origine → panel di sicurezza dedicato.
⚠️ **Riferito, non toccato:** `statusLine` punta a `.claude/helpers/statusline.cjs`, cartella **vuota**.

**ONDATA (a) — 8 task su 13**, parte database/API finita. **3453 test verdi · tsc 0 · eslint 0 · build ok
· DB pulito (294 lavori, 0 denti).**
**RESTANO:** T9 POST atomico · T10 sentinelle · T11 wizard · T12 form del lavoro · T13 prove + FASE 7 + BP-1.
🛑 **T10, T11, T12 nello STESSO deploy:** appena i 7 campi escono dall'allowlist i due scrittori odierni
smettono di salvare **in silenzio** (`route.ts:259-264` scarta senza errore).

🔑 `node scripts/tmp/sql.mjs "<query>"` · `npx supabase db push --yes`.
