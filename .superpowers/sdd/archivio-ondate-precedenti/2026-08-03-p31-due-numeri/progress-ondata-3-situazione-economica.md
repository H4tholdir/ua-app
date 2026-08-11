# Ledger SDD — Ondata 3: Situazione economica portale
Piano: docs/superpowers/plans/2026-07-11-portale-dentista-v2-ondata-3-situazione-economica.md
Worktree: .claude/worktrees/ondata-3-situazione-economica (branch worktree-ondata-3-situazione-economica)
Baseline: d7d4e1a — suite 1274 passed | 4 skipped

## Stato task
(nessun task completato)

## Minor findings (per review finale)
(nessuno)
Task 1: complete (commit e3887b9, gate Francesco OK)
Task 2: complete (commits d06ff5c..ad5dd5a, review clean dopo 1 fix round: asserzioni filtri multi-tenant nel fake)
Minor (round 2, non bloccante): test fail-closed con rejects.toThrow() generico — asserire prefisso messaggio per distinguere la via (contabilita-pagamenti-cliente.test.ts:198-206)
Task 3: complete (commit 3aeef12 via cherry-pick, review clean) — INCIDENTE: implementer aveva committato su main del checkout principale (24d657b, con placeholder di getPagamentiCliente); recovery: cherry-pick con --ours su queries.ts + reset main a d7d4e1a; verifiche rieseguite nel worktree (tsc pulito, 23/23)
Minor: test route non asserisce user_agent nell'audit (solo ip_address) — portale-situazione-get-route.test.ts:136
Task 4: complete (commit c71dc16, review clean) — divergenze visive tutte coperte dal mockup approvato; riga «Saldata» = importo TOTALE barrato + tag (mockup vince sul brief; da mostrare a Francesco in QA)
Minor: (a) body ok-ma-malformato crasherebbe in render (pattern pre-esistente del gemello FattureStoricoSection); (b) manca aria-controls/id sui collassabili (aria-expanded presente); (c) test non asseriscono data null e ordine anni desc; (d) chiavi React con indice
Task 5: complete (commit 8629d9a, review clean, 0 issues; suite 1293 pass | 4 skipped, tsc 0, build ok)
Task 6: complete (QA browser E2E) — PIN sblocca; sezione fedele al mockup; saldo 130/250/20/380 IDENTICO allo scadenzario lab (cross-check live via /api/scadenzario); dettaglio dovuti con badge ritardo 5gg e fattura Saldata barrata; 3 pagamenti con metodo+destinazione per anno; payload live 0 campi vietati (nemmeno UUID); guardie 401 uniforme/401 sessione/403 interruttore (con e senza sessione); audit view_situazione con IP/UA; 390+768 screenshot ok, 1280 verificato via metriche DOM (colonna centrata 600px — glitch di cattura del browser pane, non dell'app); hydration warning console = pre-esistente noto (layout portale, backlog Ondata 1). Cleanup a baseline ESATTO verificato (3 lavori ripristinati, 0 fatture/pagamenti/movimenti, 5 accessi, 3 progressivi, cliente false/null/0, storage fatture-pdf vuoto). Env temp rimosse, script tmp rimosso, dev server spento.
Nota di dominio emersa (non bloccante, pre-esistente): il batch fattura le LAVORAZIONI del lavoro (totale 112,00) mentre prezzo_unitario era 322 — divergenza prezzo_unitario vs righe listino, da segnalare.

## Review finale whole-branch (Opus): Ready to merge YES
0 Critical, 0 Important bloccanti. Verifiche riprodotte dal reviewer: tsc pulito, 1293 pass | 4 skipped (baseline esatta).
Backlog post-merge consigliato:
1. getContabilitaCliente ingoia errori query fatture/lavori (pre-esistente, non leak, simmetrico lab): aggiungere .error → throw
2. aria-controls/id sui collassabili SituazioneEconomicaSection (a11y)
3. Indagine divergenza dominio prezzo_unitario vs righe listino nel batch (fattura QA 112 vs prezzo 322)
4. Minor test: prefisso messaggio nei fail-closed; user_agent nell'assert audit; data null/ordine anni; chiavi React indice
