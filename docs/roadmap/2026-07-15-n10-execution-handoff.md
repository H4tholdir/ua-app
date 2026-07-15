# N10+N9 — Invio PEC a SdI — Handoff esecuzione (sessione nuova, contesto pulito)

> **Preparato:** 2026-07-15, a fine brainstorming+spec+panel advisor+piano. **Owner:** Francesco.
> Eseguibile da una sessione Claude Code fresca senza la conversazione precedente.
> BP-0: leggere `memory/MEMORY.md` + questo handoff prima di iniziare.

---

## 0. Cosa è già fatto (sessione precedente)
- **Spec rev.2 approvata** e validata da **3 advisor specializzati** (solution-architect + backend-api + appsec-auditor, tutti «CONFERMATA CON RISERVE», zero bloccanti, riserve recepite nella rev.2): `docs/superpowers/specs/2026-07-15-n10-n9-invio-pec-sdi-design.md` (commit `e36a16f`+`af5539f`).
- **Piano pronto**, 6 task TDD con codice e test completi: `docs/superpowers/plans/2026-07-15-n10-n9-invio-pec-sdi.md` (commit `79d52f1`).
- `main` locale avanti di commit **docs-only** su `origin/main` (spec×2 + piano + handoff — pushabili, CD Vercel inerte).
- Nessun codice scritto: la sessione nuova **esegue il piano**.

## 1. Il problema (una riga)
Nessuna fattura parte via PEC dall'app (nemmeno le TD01: `sendFatturaPEC` non ha caller vivi) e il TD04 si ferma a `stato_sdi='generata'`. N10+N9 = endpoint dedicato `POST /api/fatture/[id]/invia-pec` che invia l'XML **già congelato** (zero rigenerazione, zero progressivi) + bottone «Invia a SdI» in `/fatture/[id]`.

## 2. Come eseguire
1. **FASE 5 — worktree dedicato:** `superpowers:using-git-worktrees` → `.claude/worktrees/n10-invia-pec` (branch `worktree-n10-invia-pec`) dal **HEAD locale** (contiene spec+piano); copia `.env.local`; baseline test attesa ~**1749 pass | 19 skipped** (verifica il numero reale).
2. **Esecuzione:** `superpowers:subagent-driven-development` sul piano (6 task, review spec+qualità per task, review finale whole-branch).
3. **Nessuna migration** → niente FASE 6b / `gen types`.
4. **🛑 GATE Task 4 (mockup §0B):** fermarsi, presentare le varianti A/B (light+dark) a Francesco e ATTENDERE la scelta prima del Task 5 (React). Decisione in `docs/design/decisions/2026-07-15-invia-pec-sdi.md`.
5. **QA browser (Task 6):** lab E2E `00000000-0000-0000-0000-000000000001`, **MAI lab Filippo**, **NESSUNA PEC REALE** — configurare PEC fittizia `smtp.invalid` sul lab E2E, verificare il 502 pulito + rilascio claim, poi cleanup a baseline ESATTO (config PEC fittizia inclusa).
6. **BP-1** a fine lavoro; **merge/push = gate esplicito di Francesco** (review finale whole-branch prima).

## 3. Punti caldi da non perdere (dal panel advisor)
- **Claim anti-doppio-invio** su `smtp_inviata_at` (helper `src/lib/fattura/invio-claim.ts`, Task 1): `error` Postgres → 500, 0 righe → 409; release nel catch. L'invariante «ogni `generata` ha `smtp_inviata_at` NULL» è verificato per costruzione (unico writer: `send-pec.ts:138-146`).
- **Invariante `send-pec.ts` (Task 2):** «mai throw dopo `sendMail` riuscito» — il test di regressione DEVE passare subito; se fallisce → BLOCKED (cade l'assunzione della spec). Logica del modulo INVARIATA (solo commento+test).
- **Ramo `invia_pec` di `/xml` (Task 3):** riceve gate ruolo `titolare`+`front_desk` (PRIMA della generazione, per non bruciare progressivi), claim e `pec_errore` sanitizzato. **Gate N7 intatto**; generazione senza invio resta senza gate ruolo.
- **Dettagli errori grezzi (host SMTP, Vault, Postgres) MAI nel body** — solo log server.
- **Ruoli invio: SOLO `titolare`+`front_desk`** (decisione D-3 di Francesco; `admin_rete` e `tecnico` esclusi).
- **Stati invio: SOLO `generata`** (D-2); messaggi 409 esatti nel piano (Global Constraints).
- UI: riga di stato SDI granulare nella card («Inviata a SdI — in attesa di ricevuta» per `smtp_inviata`) — senza, il successo sarebbe invisibile.

## 4. Fuori scope (convertirli è un BUG)
- Re-invio per `scaduta`/`rifiutata` · cron riconciliazione ricevute PEC · RBAC su batch/nota-credito · bottone nella lista fatture · modifiche alla logica di `send-pec.ts` · rate-limit per-lab (follow-up BACKLOG) · colonna `inviata_da` (audit operatore = log server).

## 5. Regole operative (dal CLAUDE.md)
- Dominio fiscale (FatturaPA) → percorso GRANDE (già seguito: spec + panel + piano; ora esecuzione + review per-task + review finale + gate L2).
- Lab E2E `…0001`, MAI lab Filippo. FASE 7 (tsc + vitest + build, output reale) prima del merge.
