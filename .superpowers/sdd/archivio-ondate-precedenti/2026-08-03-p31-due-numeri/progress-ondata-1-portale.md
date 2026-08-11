# Ledger SDD — Ondata 1 portale dentista (lista+proposta+conferma)
Piano: docs/superpowers/plans/2026-07-10-portale-dentista-v2-ondata-1-lista-proposta-conferma.md
Worktree: .claude/worktrees/ondata-1-portale · branch worktree-ondata-1-portale · base df10237
Baseline test: 1168 pass | 4 skipped

## Stato task
Task 1: complete (commits df10237..199a59a: 0141777+199a59a, review clean dopo 1 fix round — leak updateError.message chiuso, test FK ramo positivo aggiunto)

## Finding Minor rimandati alla review finale
- GET /api/clienti/[id] pre-esistente: `error?.message ?? 'Cliente non trovato'` nella risposta (route.ts:75-80) — stile pre-esistente, fuori scope Task 1
- Fix commit 199a59a: evidenza full-suite non ri-dichiarata nel fix report (blast radius trascurabile; la suite intera gira comunque nei task successivi)
Task 2: complete (commit 1ef72df, review clean — trascrizione byte-exact verificata, delta RPC annullo = solo reset proposta)
Task 3: complete (commit 019d660, review clean — 6 check di sicurezza passati; Minor: cap difensivo su N/r/p in verifyPin se mai esposta a stored non-DB)
Task 4: complete (commits 557a85d+fe9a6e0, review + 1 fix round — colonna stampa Proposta→Esito, nowrap 390px; nota: PNG richiedono git add -f, .gitignore blanket *.png)
Task 5: complete (commit 269abb3, review clean — nota per Francesco: token t3 dark (#5A5652 su #232018, ~2.2:1) sbiadito, problema del token DS v2.3 non del mockup)
Task 6: IN ATTESA GATE FRANCESCO (mockup portale + mockup lab + db push migration 20260710180000 + env Vercel PORTALE_PIN_PEPPER/PORTALE_SESSION_SECRET)
Task 6: complete (gate Francesco OK 10/07 sera: mockup approvati entrambi; db push eseguito + verifica post-apply OK; env dev in .env.local; env PROD consegnate a Francesco — token vercel CLI scaduto, DA INSERIRE PRIMA DEL DEPLOY)
Task 7: complete (commit b27f4ac, review Approved — Minor per review finale: test interruttore_off simmetrico mancante; docstring audit.ts su fail-loud senza rollback (retry multi-campo → generation++ doppio); GET clienti pre-esistente error?.message; +365gg vs +1 anno calendario)
Task 8: complete (commit bbedead, review Approved — Minor per review finale: 403 interruttore-off/pin-non-impostato non auditati né rate-limitati; timing side-channel grossolano token valido/invalido (rischio basso, token alta entropia))
Task 9: complete (commit 322a12d, review Approved — Minor per review finale: test dedicato route stampa mancante; ipotesi NULL fail-open su stato_sdi indagata e esclusa (colonna NOT NULL))
Task 10: complete (commit 1f3a602, review Approved — Minor per review finale: rami push cntErr/catch non testati; TOCTOU gate-fatture→update accettato dal piano (finestra minima, inerte))
Task 11: complete (commit 3e70289, review Approved zero finding)
Task 12: complete (commits 1062797+b585197, review + 1 fix round — rollback locale vero sul toggle, nome lab nella stampa via prop, h3 extra rimosso)
Task 13: complete (commit 4164d94, review Approved — QA visiva 390/768/1280 x light/dark della card ESPLICITAMENTE a carico del Task 15; Minor: no Annulla su Cambia PIN, flash input post-set)
Task 14: complete (commit 53405d2, review Approved — Minor: sottoriga descrizione del mockup non implementabile senza campo dati, backlog)
Task 15 QA: COMPLETATA (lab E2E, mai Filippo) — PIN banale 400, PIN errato 4→1 tentativi, lockout 429 al 5°, cambio PIN sblocca+invalida sessioni (401 sessione_scaduta), QA3 con fattura via lavoro_id ESCLUSO dalla lista (vincolo doppia sorgente LIVE), proposta scritta+persistita, scadenzario mostra proposta+bottone evidenziato, conferma difforme mostrata nel portale (decisione lab + proposta iniziale), 409 non_modificabile post-conferma, 409 gia_fatturato su lavoro con fattura, interruttore OFF nasconde sezione (403), rigenera link invalida vecchio token (401 uniforme), annullo RPC azzera proposta e decisione sopravvive (M-4), audit completo con IP/UA/autore/lavoro_id/dettaglio, stampa con header lab+studio e colonna Esito, card lab 390px light+dark flat fedele al mockup. Cleanup a baseline: 0 residui. NOTA pre-esistente: hydration warning PortaleLinkButtons (URL localhost vs prod), non toccato da quest'ondata.
Task 15: complete (QA + review finale Opus Ready-to-merge YES + fix a0911da + BP-1). BRANCH PRONTO AL MERGE — gate: env Vercel + conferma Francesco.
