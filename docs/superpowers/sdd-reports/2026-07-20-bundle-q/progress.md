# Ledger Bundle Q — worktree-bundle-q-quick-wins
Baseline: 2153 pass | 19 skipped @ 94d2072
Task 1: complete (commit 55bd006, review clean)
Task 2: complete (commits efae4a1+2f1555e, review clean dopo 1 fix loop)
  Follow-up A6-bis (fuori scope, per final review + backlog): qualita/page.tsx:147,358 usano --c-amber come testo; estendere regex check #1 dello script; sweep ~25 file con stesso pattern
Task 3: complete (commit 333a479, review clean)
Task 4: complete (commit 32c3332, review clean)
Task 5: complete (commit c631c16, review clean)
  Minor T5: aria-label link portale non contiene testo visibile (WCAG 2.5.3) — per final review
Task 6: complete (commit 311bc35, review clean; deviazione call-site-2 = YAGNI adjudicato)
Task 7: complete (commit dbfa7ca, review clean)
  Minor T7: coverage gap rami scadenza-0/annullato del banner (linee non toccate) — nota informativa
Task 8: complete (commit be865b8, review clean — opus)
  Follow-up: bug pre-esistente prove/route.ts:225 passa tecnico_id grezzo a triggerPushToUser (push prova mai recapitato) — chip spawn_task già creato dall'implementer
  Minor T8: doppio round-trip su tecnici (fondibile nella select FK) — nota informativa
Task 9: complete (commit 14ab4c9, review clean)
  Minor T9: commento sul CHECK DB come base della safety tipo_dispositivo; timeout assente su webpush (pre-esistente) — note informative
Task 10: complete (commit bdd11af, review clean)
Task 11: complete (commit 787658f, review clean — opus)
  Minor T11: aggiungere nota su getSegnaleStriscia (non emette sTecAccount/sTitTecnici) — candidata alla fix wave finale

## Fix wave finale (review finale Bundle Q)
Commit: 04cf00b03bbb5d97378417c82b89692ab3c31365
- M1: src/app/api/portale/richiedi/route.ts — push usa LABEL_MACRO[body.tipo_dispositivo] ?? slug invece dello slug grezzo nel body della notifica (import da @/lib/domain/tipi-lavoro + type TipoDispositivo da @/types/domain)
- M2: src/app/portale/[token]/page.tsx — rimosso aria-label="Richiedi un nuovo lavoro al laboratorio" dal link «➕ Richiedi nuovo lavoro» (WCAG 2.5.3, testo visibile già descrittivo)
- M3: src/app/(app)/qualita/page.tsx righe 147 e 358 — var(--c-amber, #F59E0B) → var(--c-amber-ink, #92400E) (colore testo, entrambi i punti)
- tests/unit/portale-richiedi-route.test.ts — 2 assert sul body del push aggiornati da 'protesi_fissa' a 'Protesi fissa' (label umana)

Esito verifiche:
- npx vitest run tests/unit/portale-richiedi-route.test.ts → 7 passed (1 file)
- npx tsc --noEmit → nessun errore
- bash scripts/check-ds-compliance.sh → ✅ DS compliance OK (v2.3 legacy + v3)
- pre-commit hook (eslint --max-warnings=0 + DS compliance) → passato
Fix wave finale: complete (commit 04cf00b — M1 LABEL_MACRO, M2 aria-label, M3 amber-ink 147/358). FASE 7 rerun: tsc 0, 2190 pass|19 skip, build ok, check-ds ok.
FASE 9 QA browser (dev server worktree, lab E2E): portale→richiedi→success→ritorno OK a 390px; copy nuova OK; link entrambi OK; home titolare striscia invariata OK; /qualita amber-ink applicato (PSUR link rgb(146,64,14)). Deferiti con motivo: PilaAperta chiudi-ricerca (serve >soglia lavori; coperto da RTL), segnali O1f positivi (serve account rotto; coperto da unit), push reali (servono subscription), dark visivo (token dark verificato a codice). Trovato hydration mismatch PRE-esistente layout portale (html/body annidati) — follow-up.
Lavoro QA 2026/0010 rimosso dal lab E2E.
