# Ondata 3a — Scheda lavoro v3 — SDD Progress Ledger

Plan: docs/superpowers/plans/2026-07-13-ds-v3-il-cuore-ondata-3a-scheda.md
Worktree: .claude/worktrees/ondata-3a-scheda (branch worktree-ondata-3a-scheda)
Baseline: 1561 pass | 4 skipped @ 8e55ebe

## Tasks
- [x] Task 1: Helper pillStatoScheda
- [x] Task 2: CardFasiV3
- [x] Task 3: ModificaRigaSheet
- [x] Task 4: MenuSchedaSheet
- [x] Task 5: DocumentiSheet
- [x] Task 6: SchedaLavoroV3 orchestratore
- [x] Task 7: Montare su /lavori/[id]
- [x] Task 8: LavoroFormClient bridged+defaultTab
- [x] Task 9: Route-ponte /lavori/[id]/modifica
- [x] Task 10: Responsive desktop + temi (code)
- [x] Task 11: Verifica finale (FASE7 verde) + BP-1 done; QA browser + merge PENDING (gate Francesco)

## Minor findings (per final review triage)
- Task 1: dead-code default `?? {...}` in stato-pill.ts:72 (defensive, unreachable given current StatoLavoro union) — harmless, no action

## Log

Task 1: complete (commits 8e55ebe..eec71f7, review clean; neutral->amber applied)
- Task 2: CardInfo shows dev-only console.warn above 5 rows (§5.10); a ciclo can have 6-8 fasi. Renders fine; note for Task 6/7 integration & final review.
Task 2: complete (commits eec71f7..665eb4a, review clean; fase.nome->descrizione)
- Task 3 (Minor, non-blocking): no 'currently-selected' highlight for tecnico/dentista (TileScelta/ClienteComboBox limitation); hardcoded id=ora-consegna-input (safe: Task 6 mounts single sheet — useId() only if that changes).
Task 3: complete (commits 665eb4a..807d5be, review clean; Important test-gap fixed: tecnico+dentista covered)
- Task 4 (Minor, systemic): inline-styled DS v3 buttons lack :focus-visible outline (shared gap with sibling components); no 11px radius token (raggio.riga-7 derived). Out of scope; a11y follow-up.
Task 4: complete (commits 807d5be..b87fc09, review clean)
- Task 5 CROSS-TASK for Task 6: DocumentiSheet.lavoro = { id, numero_lavoro, cliente_display, haFasi, haDdc, ddcUrl? }. NO /api/lavori/{id}/ddc route exists; DdC is a signed storage URL (ddc.pdf_url, target=_blank). Task 6 MUST pass ddcUrl or the DdC row hides even when haDdc true.
Task 5: complete (commits b87fc09..3134098, review clean; Important DdC true-path test added + aria-hidden chevron)
- Task 6 DECISION (Francesco): NotaDentista mismatch resolved -> note_interne shown as honest 'Note (laboratorio)', no dentist attribution, tappable to edit. Real dentist note (new note_dentista column + portal authoring + read-only display) = 3b BACKLOG.
- Task 6 (Minor/follow-up): empty-note-add not supported from scheda (card shows only when note present) -> add-first-note flow deferred; RifacimentoButton reused carries DS-v2 tokens (accepted); aria-label 'Modifica scadenza' on consegna row (WCAG label-in-name, test-driven); NotaLaboratorio lacks :focus-visible ring (native outline present) -> 3b polish.
Task 6: complete (commits 3134098..abb1fd9, review clean; NotaDentista product decision applied + re-reviewed)
- Task 7 (design note, Francesco): v3 scheda drops LavoroTimeline per-step dates (data_ingresso, data_consegna_effettiva) — replaced by status pill; NOT MDR-required (compliance lives in DdC PDF + tracciabilita signal, both preserved). Mockup-driven choice.
- Task 7 (Minor cleanup -> backlog): dead v2.3 files after replacement: LavoroTimeline.tsx (dead), TracciabilitaMaterialiBanner.tsx (logic inlined as AvvisoTracciabilita, dead). NOTE: LavoroFormClient.tsx is NOT dead — Task 9 bridge route re-imports it.
Task 7: complete (commits abb1fd9..b460550, review clean; build OK, query+signing byte-identical, MDR signal preserved)
Task 8: complete (commits b460550..adde05e, review clean; surgical, all 11 existing LavoroFormClient tests still pass)
- Task 9 (Minor -> backlog): LavoroDettaglio loader now duplicated verbatim in [id]/page.tsx and [id]/modifica/page.tsx (no shared loader). Follow-up: extract lib/lavori/get-dettaglio.ts so schema/signing changes apply once.
Task 9: complete (commits adde05e..06ff555, review clean; build OK, signing+auth parity, §11.6 audit clean, +BackHeaderModifica.tsx client)
Task 10 (code): complete (commits 06ff555..e77248e; centered card CSS class, sheets unaffected). Screenshots -> QA phase (Task 11).

## Final whole-branch review (opus) on 8e55ebe..e77248e: "Ready to merge: With fixes"
- 1 Important (NEW, missed by all per-task gates): FK edits (tecnico/dentista) didn't re-render in-session — lavoroLocale useState never synced to the fresh props.lavoro after router.refresh(). FIXED in 5b1d748 via guarded render-phase prop->state sync (React canonical pattern; ESLint-clean) + regression test (proven to fail without fix). Scalars unaffected.
- All accepted tradeoffs confirmed contained (RifacimentoButton DS-v2 tokens, aria-label, focus-visible, duplicated loader, empty-note-add, dropped timeline dates, dead v2.3 files).
- Post-fix verification: tsc clean, 1590 pass | 4 skipped, build OK, DS-compliance OK.
Branch HEAD: 0c431f0 (BP-1 docs committed; QA browser + merge PENDING gate Francesco)

## FASE 9 — QA browser live (13/07, lab E2E ...0001, dev worktree :3013) — OK
Verificato live sui 3 lavori esistenti (0 creati; unica mutazione 2026/0004 ricevuto<->pronto, ripristinata; DB baseline esatto riverificato):
- scheda rende (ricevuto/consegnato); pill APPENA ARRIVATO / CONSEGNATO / -3 GIORNI; CardInfo righe editabili
- CONSEGNA disabled+callout (ricevuto/consegnato) e enabled->/consegna v2.3 (pronto); Rifacimento su pronto/consegnato
- AvvisoTracciabilita MDR; menu 6 voci + Annulla disabled; ponte->form bridged senza CONSEGNA (§11.6 live)
- DocumentiSheet: DdC signed URL storage reale + IFU/Etichetta/Ricevuta endpoint + Pacchetto MDR; Scheda-Fabbricazione assente (0 fasi)
- responsive 390 + 1280 card centrata; temi dark+light; zero errori console
- Non coperti live (unit-tested): persistenza edit per-riga, FATTA CardFasiV3 (0 fasi E2E), assegnazione tecnico (0 tecnici E2E)
STATO: tutte le fasi del piano complete tranne merge (FASE 10) = gate Francesco.
