# Handoff — Riconciliazioni pendenti + ricevute PEC (item B) — 15/07/2026

> **Preparato:** 2026-07-15, a valle del deploy N10+N9. **Owner:** Francesco (item B scelto esplicitamente dal menu post-TD04, esteso col follow-up ricevute PEC di N10).
> Eseguibile da una sessione Claude Code fresca. **BP-0: leggere `memory/MEMORY.md` + questo handoff prima di iniziare.**

## 0. Stato di partenza
- N10+N9 (invio PEC a SdI) **mergiata e deployata** (`main` `9310d21`, BP-1 `20518d8`; CI+CD verdi, smoke OK). Nessun Blocker aperto. Albero pulito, nessun worktree feature.
- Suite: **1795 pass | 19 skipped**. Nessuna migration pendente.

## 1. Il problema (perimetro dell'item)
Tre stati-limite oggi silenziosi, tutti «post-invio/post-storno», da trattare come UNA feature di riconciliazione:

1. **Saldo credito negativo** (rifiuto TD04 dopo credito già speso): oggi numero grigio, sezione azioni nascosta con `disponibile ≤ 0`. Serve alert esplicito. *(riserva advisor TD04 2/3)*
2. **Collisione storno/ri-fatturazione** (lavoro ri-fatturato nella finestra SdI → TD04 `rifiutata` ma l'originale resta `stornata`): serve lista fatture `stornata_at NOT NULL` con TD04 collegato `rifiutata`, e valutare **contro-movimento + riga di audit al posto del DELETE** nel trigger `trg_fatture_td04_rifiutata`. *(riserva advisor TD04 2/3)*
3. **Ricevute PEC mai riconciliate** (follow-up N10, consigliato prioritario dalla review finale): dopo `smtp_inviata` nessun processo porta la fattura a `pec_consegnata`/`ricevuta_sdi`/`accettata`; inoltre il **cron di riconciliazione è il rimedio strutturale al claim orfano** (crash tra sendMail e UPDATE → `smtp_inviata_at` valorizzato con `stato_sdi='generata'`, sblocco oggi SOLO manuale dopo verifica cartella «inviata» della casella PEC — `pec_message_id` NULL NON è prova di non-invio; commento in `src/lib/fattura/invio-claim.ts`).

## 2. Riferimenti obbligatori (BP-0 esteso)
- `docs/roadmap/2026-07-15-post-td04-handoff.md` §B — formulazione originale delle riserve advisor
- `docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md` — trigger `trg_fatture_td04_rifiutata`, movimenti credito `storno`, indice `fatture_lavoro_attiva_unique`
- `docs/superpowers/specs/2026-07-15-n10-n9-invio-pec-sdi-design.md` — claim su `smtp_inviata_at`, stati SDI, invariante send-pec
- `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — voci: cron riconciliazione ricevute PEC · rate-limit per-lab · «N10 polish» (valutare se accorpare i micro-fix attinenti, es. `.eq('laboratorio_id')` sul re-fetch)
- `memory/domains/fatturazione-sdi.md` — invarianti dominio

## 3. Vincoli di processo (dal CLAUDE.md)
- **Dominio fiscale (FatturaPA) → percorso GRANDE**: FASE 2 brainstorming → FASE 3 validazione architetturale (5 domande, migration probabile per audit/contro-movimenti → FASE 6b `gen types`) → spec + panel advisor → piano `writing-plans` → esecuzione `subagent-driven-development` in worktree dedicato.
- **Ha UI** (alert saldo negativo, lista riconciliazioni) → **gate §0B**: mockup HTML multi-variante light+dark → screenshot → 🛑 scelta di Francesco PRIMA del React. Gate L2 a fine ondata.
- **La riconciliazione ricevute PEC legge una casella PEC reale (IMAP?)**: decisione architetturale delicata (credenziali in Vault, scheduling, parsing ricevute SdI) — da sviscerare in brainstorming; NON improvvisare in esecuzione.
- QA: lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo, MAI caselle PEC reali (fixture/mocking per le ricevute). Progressivi E2E consumati finora: 2026-0001..0006.
- 🛑 Merge/push = gate esplicito di Francesco, review finale whole-branch prima.

## 4. Domande aperte per il brainstorming (FASE 2)
- Le tre parti sono un'unica ondata o una sequenza (es. cron ricevute prima, UI riconciliazioni poi)? Il cron tocca infrastruttura (pg_cron? route + scheduler esterno? Vercel cron?) — l'esperienza 4a-server (pg_cron+pg_net poi rimossa) è un precedente da rileggere.
- Contro-movimento vs DELETE nel trigger: impatti su saldo, idempotenza, audit trail.
- Il claim orfano: il cron può sbloccarlo in autonomia solo se la verifica «mail in inviata» è automatizzabile (IMAP); altrimenti superficie admin con azione manuale documentata.

## 5. Nota operativa
Le credenziali E2E in `.env.test` erano stantie: la password di `e2e-titolare@ua-test.local` è stata reimpostata durante il QA N10 (valore noto alla sessione N10, non committato). Se serve login browser E2E, reimpostarla via `auth.admin.updateUserById` con lo service client e annotarla nel report QA.
