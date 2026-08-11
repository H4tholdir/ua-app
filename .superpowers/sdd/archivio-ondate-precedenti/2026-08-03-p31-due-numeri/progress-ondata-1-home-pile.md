# SDD progress — Ondata 1 Home+pile (worktree ondata-1-home-pile)
Base: bb0c084 (main) · Baseline suite: 1297 pass | 4 skipped · P1-P9 ratificate 12/07
Piano: docs/superpowers/plans/2026-07-12-ds-v3-il-cuore-ondata-1-home-pile.md

## Task
Task 1: complete (commits bb0c084..ffd85de + ratifica, review clean) — ADR B6 RATIFICATO da Francesco 12/07: Candidato A searchParams server-driven (P2 confermata). Task 7-9 sbloccati.
Task 2: complete (commits a2f2545..81cd625 = ee099e0+81cd625, review clean — spec OK verbatim, Approved; fix round coerenza §6.1/§13.2/§12.3/header autorizzato dal controller)
Task 3: complete (commit 2e7afac, review clean — spec OK, Approved; suite 1302|4, deviazioni test pre-esistenti verificate minime)
Task 4: complete (commit 3783ffb, review clean — trascrizione fedele, DST ok, E4 rispettato; suite 1316|4)
Task 5: complete (commit 11f50d7, review Opus clean — E4/GDPR/tenant/P6-P8 verificati, deviazioni SDI_SCARTATE=[rifiutata] e nomeGiornoSettimana adjudicate legittime; suite 1330|4)
Task 11: complete (commits 2d5dea8+523e4ba steps 1-4; QA 29/29, DB baseline esatto; review finale Fable «With fixes» → fix wave 6884e68+35ae47e+01f23ea → re-review «YES»)
Addendum admin (richiesta Francesco): complete (2e62cbb+ee1355a+bee02fa — admin live-preview a Home v3 read-only inert, DashboardTitolare/KpiCard/SpotlightCard + export orfani CANCELLATI grep-verified; review addendum: 1 Critical RSC fixato con 'use client'; verdetto finale bb0c084..bee02fa: YES subordinato a smoke admin manuale + autorizzazione Francesco)
Decisioni Francesco al gate: fail-closed perimetro tecnico SÌ · avatar ritirato da route migrate (advisor UX+DS convergenti; destinazione finale a roadmap: «Esci» in §7.16, riga-identità NavDesk, trial→StrisciaStato) · emoji Vuoti RATIFICATE · merge solo con autorizzazione esplicita post-fix
Suite finale: 1373 pass | 4 skipped · tsc/build/DS-compliance verdi
Backlog dal triage review finale (da portare in BACKLOG-TECNICO al BP-1): debito test rami prose pile/striscia · unificazione convenzione «oggi» (Rome/local/UTC) · a11y sub nelle card Tutto il resto + pile sr-only in admin inert · affordance chiusura ricerca · back ‹ PilaAperta da «Le pile» · console.warn dev su esclusione CardLavoro · limit 500 segnale · flake avviso-caricamento-vuoto (isolamento timer) · duplicazione adessoRoma/saluto in 2 pagine · line-height 1.5 Tailwind su testi DS non stilati (nota sistemica) · segnale striscia «tecnico senza anagrafica»
Task 10: complete (commit bcee8db, review clean — 9 voci/emoji/href mockup-exact, P9 esatto non-prefix, error isolation per-query; fix hooks-rule adjudicato minimale; suite 1367|4)
Task 9: complete (commits 8a95666+cbb7e4d, review Opus clean dopo 1 fix round — ADR B6 note 1-4 onorate, tecnici embed verificato, ring dark-safe; consegna in ritardo esplicita; suite 1358|4)
Extra: fix RigaAgenda/GiornoAgenda ring OGGI dark-safe (e4f70e4, richiesta Francesco via chip — TDD, suite 1358|4)
Task 8: complete (commits 0f0d22d+2276f6f, review clean dopo 1 fix round — P1/P3/P4 verbatim, ring dark-safe strutturale, esclusione conferma/onConsegna type-enforced con guardia @ts-expect-error; suite 1353|4)
Task 7: complete (commits 0d94182+4c6632e, review clean — pattern v3/ruoli/dizionario/SVG mockup verificati, fix scala device-corti autorizzato e minimale; suite 1340|4)
Task 6: complete (commit 48d1ef4, review clean — interfacce verbatim, mockup fidelity byte-level, consumer repair completo; no href su CardLavoro adjudicato corretto; suite 1337|4)

## Minor findings (per la review finale)
- [Task 1] ADR riga 43: parenthetical "già previsto" su React.cache() non evidenziato — da tagliare o riformulare come suggerimento
- [Task 1] ADR: evidenze solo Chromium/Playwright 1280×800 — caveat browser-engine se Safari/iPadOS diventa rilevante
- [Task 2] Header «IN VIGORE»: dicitura non tracciabile al decision record — governance documento, decisione controller
- [Task 2] §5.29 cita «§3.3.4» che non esiste come heading (è item 4 della lista §3.3) — refuso ereditato dal PIANO, valutare fix in coda
- [Task 2] §5.28-5.35 header style «(rev. 3.1) — …» difforme dallo stile corsivo di §5.2/§5.15 — cosmetico
- [Task 2] frase meta a fine §5 (riga 205) non richiesta — innocua
- [Task 3] catalogo riga ~363: caption «PillTempo — quattro famiglie colore» stantia (ora 5 famiglie) — fix 1 riga in coda
- [Task 5] pillFase: «tutte fasi eseguite» cade nel ramo PER <giorno> riservato a «nessuna fase configurata» (pile-home.ts:100-103) — edge non testato
- [Task 5] rami prose senza copertura test: pillFase 0-branch, subAmbra inCima, subBlu ≥3, subViola fallback, consegnaOggiNonPronta/provaRientroOggi, s2 sub-rami — da considerare nella review finale
- [Task 5] limit 500 su getPileHome = truncation silenziosa (spec-mandated) — nessun segnale oltre soglia
- [Task 5] return s9 finale irraggiungibile in scegliSegnale — dead code innocuo
- [Task 6] StrisciaStato: <style> focus-visible iniettato anche senza azione — wrappare in {azione && …}, cosmetico
- [Task 6] pila-striscia.test.tsx:26,232: titoli describe «le tre pile» stantii (ora quattro) — cosmetico
- [Task 7] tests/e2e/dashboard.spec.ts (credential-gated, fuori da vitest run) asserisce ancora il markup delle 4 dashboard — adeguare/rimuovere al Task 11
- [Task 7] <main> annidati (layout app + HomeV3) — dal piano; valutare al Task 11/review finale
- [Task 7→10] collisione BottomNavPill con layout no-scroll 100dvh su /dashboard — attesa risoluzione P9 al Task 10, verificare in QA
- [Task 8] esclusione conferma/onConsegna solo compile-time: console.warn dev-only chiuderebbe il gap as any/JS — precedente TastoPrimario.motivoDisabilitato
- [Task 8] Vuoto ambra: glifo emoji ☕ dove il mockup indica line-SVG neutro — ereditato dal contratto di Vuoto (catalogo demoed con emoji): sign-off design da Francesco in QA/review finale
- [Task 8] subMorph viola: giornoBreve può collassare a «oggi/domani» al confine — non testato, plausibilmente voluto
- [Task 8] PilaAperta: nessuna affordance per richiudere CampoTesto→RigaCerca — gap UX minore non richiesto dal piano
- [Task 8] ~~latent: RigaAgenda.tsx bug shadow none+lista~~ FIXATO in e4f70e4 su richiesta di Francesco
- [Task 7→11] impostazioni/page.tsx:400: PreferenzaDashboardToggle ora scrive una colonna che nessuno legge — dead setting esposto agli utenti, pulizia al Task 11
- [Task 7→11] etichetta «Nuovo lavoro» del TastoPiù clippata sotto il viewport: ~45px a 667, ~16px a 844 (contenuto ≈726px su 667) — divergenza dal mockup (che passava no-scroll con tutto visibile): confronto fianco-a-fianco in QA Task 11

- [Task 9] test nuovi SchedaAnteprima ritardo: teorica race di mezzanotte fra i due new Date() — solo record, nessuna azione
- [Task 10] FAB tooltip: effetti one-shot girano anche su route nascoste (localStorage consumato mentre la pill è null) — fix a basso costo: guard degli effetti con lo stesso check di route; triage al Task 11
- [Task 10] aria-label={s.nome} sulle card Link sopprime il sub agli screen reader — pattern del mockup, follow-up a11y
- [Task 10] oggi via toISOString UTC (non Rome) vicino a mezzanotte — convenzione pre-esistente (queries.ts oggiISO), non regressione
