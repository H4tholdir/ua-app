# Ledger SDD — Ondata 0 pulizia (piano docs/superpowers/plans/2026-07-10-portale-dentista-v2-ondata-0-pulizia.md)
Task 1: complete (commits 6628ace..1cd0e4e, review clean, minor: rinumerazione commenti Step — cosmetico)
Task 2: complete (commits 1cd0e4e..c7c5801, review clean)
  - Nota reviewer (pre-esistente, fuori scope O0): /api/fatture/[id]/xml con lavori_ids multipli (i>0) inserisce fatture NUOVE senza lavoro_id via generaFatturaPA(undefined); se il lavoro non è passato dal claim batch, il doppio gate annullo non lo vede. Percorso legacy (1 fattura=1 lavoro in pratica, fatture_righe vuota in prod). Da segnalare a review finale + BP-1.
  - Minor: 23505 mappato uniformemente (anche collisione progressivo mostrerebbe "fattura già esistente") — plan-mandated, awareness only.
Task 3: complete (commits c7c5801..cbfa25a, review clean — SQL verbatim, ordine (a)-(e) verificato contro le migration 4a reali)
  - Minor (spec-inherited): DROP TABLE senza IF EXISTS a riga 128 — nel replay ordinato le tabelle esistono sempre (le crea la 4a prima); asimmetria stilistica, non bloccante.
  - Nota: implementer aveva riportato "12 failed" → verifica controller: 1136 pass/0 fail (artefatto transitorio).
Task 4: complete (commits cbfa25a..2774fb2, review clean)
  - Minor: nessun test esplicito del green-path del gate (coperto di fatto da orchestra-consegna-no-fattura.test.ts che consegna un lavoro 'pronto').
Task 5: complete (commits 2774fb2..974c3a7, review clean)
  - Minor: filtro .neq del recovery 23505 senza assertion di regressione dedicata (guard coperto, recovery visibile nel diff) — follow-up possibile in review finale.
Task 6: complete (commits 974c3a7..62a6250, review clean)
  - Minor (pre-esistente): embed ddc:dichiarazioni_conformita(*) nei 3 generator PDF non è consumato dai rispettivi template (dead weight nel select) — filtro comunque corretto/innocuo; nota per pruning futuro.
Task 7: complete (commits 62a6250..316c98a, review clean)
  - Minor: in portale/[token]/page.tsx il filtro è prima di .order()/.limit() invece che immediatamente prima del terminale — funzionalmente identico.
Task 8: complete (commits 316c98a..fb023ed, review clean)
  - ⚠️ risolto dal controller: tenant isolation delegata alla RPC — il corpo di annulla_consegna_atomica (Task 3) filtra ogni statement su laboratorio_id, SELECT FOR UPDATE incluso (cross-tenant → non_trovato).
  - Minor: ddc_assente della RPC non esposto nella risposta 200 (non richiesto; eventuale per UI 4b). Nessun test per rami 403 CSRF / 404 utente (non nel brief).
Task 9: complete (commits fb023ed..8c91f41, review clean)
  - Nota: lista negativa test isStatoConsegnabile ridotta a 2 stati (plan-mandated) — i 7 stati non consegnabili restano coperti dai test del gate B1 (Task 4).
PROSSIMO: Task 10 = GATE apply migration DB live — SOLO con conferma esplicita di Francesco. Poi FASE 6b + Task 11 QA lab E2E.
REVIEW FINALE whole-branch (Opus): READY TO MERGE — 0 Critical, 0 Important. Copertura 8/8 punti spec §3 verificata con evidenze. Minor triaged: tutti dopo-merge/wontfix. Condizioni = solo verifiche pre-apply DB.
PRE-APPLY CHECK DB LIVE (10/07 sera, read-only): pg_cron ✓ · pg_net presente (da droppare) ✓ · 3 tabelle outbox presenti ✓ · 0 job residui ✓ · firma nuova non preesistente ✓ · fatture_outbox vuota ✓ · 0 DdC annullate ✓. Migration applicabile in sicurezza, UNA SOLA VOLTA (CREATE FUNCTION non replay-safe).
IN ATTESA: conferma esplicita Francesco per apply (Task 10) → poi npx supabase db push, verifiche post-apply, FASE 6b gen types, Task 11 QA lab E2E, merge.
Task 10: complete (GATE confermato da Francesco via AskUserQuestion, apply db push OK una-tantum, history 20260710150000 registrata)
  - Post-apply: 0 job, 0 funzioni outbox, firma unica (uuid,uuid), 0 tabelle outbox, pg_net rimossa, indici ereditati vivi (2), grants solo postgres+service_role.
  - FASE 6b: types rigenerati (0 fatture_outbox, fatture.lavoro_id presente), tsc OK, vitest 1159 pass, next build OK — commit 9d0808b.
Task 11: complete — QA lab E2E (browser fetch autenticate via dev server worktree :3013, utente e2e-titolare):
  ✓ B-1 live: consegna cliente SDI → 200, fattura:null, 0 righe fatture, 0 progressivi fiscali, DdC generata
  ✓ Annullo → 200, lavoro pronto, DdC 0004 'annullata' (P2-1 chiuso); riconsegna → DdC NUOVA 0005 'generata' (D2)
  ✓ BUG PRE-ESISTENTE SCOPERTO E FIXATO IN QA (commit c8cac17, review approved): batch load filtrava incluso_in_fattura=false DOPO il claim → batch falliva SEMPRE + claim orfano. Fix: filtro rimosso dalla load + rollback claim su load fallita, 2 test TDD.
  ✓ B-2 live post-fix: batch → fattura 2026-0001 con lavoro_id valorizzato; annullo → 409 nota di credito (gate i)
  ✓ Gate B1 live: consegna lavoro 'ricevuto' → 422 stato_non_consegnabile
  ✓ Cintura gate (ii) provata incidentalmente: claim orfano senza fattura → annullo 409
  ✓ Cleanup: DB baseline esatto (0 fatture, 3 lavori, 2 ddc, progressivi 6/3/3, sdi null), 6 oggetti storage rimossi via Storage API, 0 residui
  - Follow-up (pre-esistente, review fix1): ramo draft-insert fallito del batch (incl. 23505) non fa rollback del claim — stesso pattern orfano, da tracciare fuori ondata.
