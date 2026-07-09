# UÀ — Roadmap Ufficiale
**Ultimo aggiornamento:** 09 luglio 2026 — **REDESIGN DS v3 «Una cosa alla volta» — Sotto-progetto 2 (componenti core) COMPLETATO E APPROVATO DA FRANCESCO (gate §14.2 chiuso 09/07/2026), IN MERGE su `main`** (pivot deciso da Francesco, B20-successivi in pausa). **Sotto-progetto 2** su worktree `.claude/worktrees/ds-v3-componenti`, branch `worktree-ds-v3-componenti` — 16 task base via `superpowers:subagent-driven-development` + refinement rounds dopo 2 round di feedback live di Francesco sul catalogo: tutti e 27 i componenti §5 completi in `src/components/ds/` (TastoPrimario/Secondario/Tondo, LinkQuieto, PillTempo/PillStato/PillFase, TastoPiu, Avatar, TileScelta/Nuovo, RigaCerca, Pila, StrisciaStato, CardLavoro, CardInfo/RigaDato, RigaFase/CheckTondo, Sheet, DialogConferma, Avviso, Skeleton, Vuoto, Campi testo/numero/data, BarraMateriale, EroeTuttoAPosto, CardUAHaFatto, NotaDentista, GiornoAgenda/RigaAgenda, PillVoce). **2 redesign nati dal feedback live e ora legge:** TastoPiu «il punto rosso» (spec §5.2 rev 2) e PillVoce «la pill di carta» (spec §5.15 rev 2); **suoni reali** scelti da Francesco (tap/fatta/arrivo/errore, sostituiscono la sintesi provvisoria — `ua` resta sintetico); Sheet con swipe-to-dismiss (§5.16, gap chiuso) e bug scroll-lock Critical risolto. Catalogo pubblico `/ds-v3-catalogo` ora **14 sezioni** (+Suoni, §9.1), toggle tema, in `PUBLIC_ROUTES`, con 6 screenshot QA rigenerati post-approvazione in `docs/design/catalogo-v3/` (390/768/1280 × light/dark). Suite **1106 passed | 4 skipped** (era 707 alla baseline `main`, +399), `tsc` pulito, zero regressioni. Spec (legge di riferimento): `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (evoluta on-branch: §5.2 rev 2, §5.15 rev 2, §9.1). Dettaglio completo: `memory/MEMORY.md` §0. **Prossimo:** merge su `main` (non fast-forward, main avanzato a `3de835d`) → push → deploy Vercel → verifica prod → **sotto-progetto 3 «Il cuore»** (Home, pile, wizard, scheda lavoro, flusso Consegna — spec §14.3).

**Aggiornamento precedente:** 08 luglio 2026 — **REDESIGN DS v3 «Una cosa alla volta» IN CORSO** (pivot deciso da Francesco, B20-successivi in pausa). **Sotto-progetto 1 (fondamenta in codice) COMPLETATO** su worktree `.claude/worktrees/ds-v3-fondamenta`, branch `worktree-ds-v3-fondamenta` — **MERGIATO E DEPLOYATO** (fast-forward `12246d0..9fde21d` su `main`, worktree e branch rimossi; nota di correzione: questa voce diceva erroneamente "non ancora mergiato" quando fu scritta). 10 task via `superpowers:subagent-driven-development`, tutti review-approvati: font Plus Jakarta Sans self-hosted, dizionario parole vietate + linter runtime, token v3 (con correzione WCAG ambra light → `#9A5C00`), CSS scoped `[data-ds="v3"]` (mai `:root`, coesistenza totale con v2.3), motion v3 (5 molle Apple + 8 coreografie), 5 suoni WAV provvisori + player Web Audio, haptic Android-only, estensione DS-compliance guard. Suite 707 passed | 4 skipped (era 670), `tsc`/`next build` puliti. Spec (legge di riferimento): `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`. Dettaglio completo: `memory/MEMORY.md` §0.

**Aggiornamento precedente:** 07 luglio 2026 — **B20 (PSUR/PMS Report differenziato per classe di rischio) RISOLTO, MERGIATO E DEPLOYATO IN PRODUZIONE** (fast-forward `58ac033..3f106ea` su `main`, pushato, CI verde, deploy Vercel confermato, `uachelab.com` risponde 200 — worktree e branch rimossi, 10 task via `superpowers:subagent-driven-development`). Sostituisce l'attuale "PSUR" unico indifferenziato con: Classe I → PMS Report (Art. 85, nessuna cadenza fissa), Classe IIa → PSUR biennale (Art. 86), Classe IIb/III → PSUR annuale (Art. 86). Migration DB live applicata (`psur.gruppo_classe` + vincolo UNIQUE esteso, conferma esplicita di Francesco). 2 finding Important corretti in review (fail-closed su chiavi ereditate da `Object.prototype` in `rilevaGruppi`; colore testo `--gold` non WCAG-conforme nel badge "Bozza", CLAUDE.md violato dal codice del piano stesso — confermato da Francesco prima della correzione). **QA browser manuale eseguita (lab E2E, mai lab Filippo) ha scoperto un bug bloccante reale**: il bottone "Genera" falliva sempre con 400 (form HTML nativo invia `application/x-www-form-urlencoded`, la route leggeva solo JSON — bug preesistente a B20, reso bloccante dal nuovo campo obbligatorio `gruppo_classe`) — corretto e riverificato dal vivo (PMS Report e PSUR generati con successo, coesistenza confermata, 390/768/1280px light/dark OK). `tsc`/`vitest` (663/4 skipped, era 645)/`next build`/DS-compliance tutti puliti. Dettaglio completo: `memory/MEMORY.md` §0. Spec: `docs/superpowers/specs/2026-07-07-b20-psur-pms-classe-rischio-design.md`. Piano: `docs/superpowers/plans/2026-07-07-b20-psur-pms-classe-rischio.md`. **Prossimi Blocker aperti dopo B20:** B6 (Service Worker offline, fix rapido), B14 (`tecnici.compenso_base` ambiguo), B16 (query `/ordini` non supportata).

**Aggiornamento precedente:** 06 luglio 2026 — **CRUD `cicli_produzione` COMPLETATO, MERGIATO E DEPLOYATO** (merge fast-forward `65777ac` su `main`, pushato su `origin/main`, worktree e branch feature rimossi) — chiude il follow-up scoperto durante la QA di B5 ("nessun modo di creare un ciclo via UI/API"). Migration live (indice UNIQUE parziale `(laboratorio_id, codice) WHERE deleted_at IS NULL`, pattern B18), nuove route `POST`/`PATCH`/`DELETE /api/cicli[/id]`, sheet create/edit e bottone elimina in UI. Review finale (Opus) "Ready to merge: Yes" dopo 2 fix Important (validazione PATCH allineata a POST, payload PATCH costruito come delta per non rompere modifica su valori storici fuori lista canonica). 626/626 test, tsc/build puliti. QA browser end-to-end su creazione/modifica/eliminazione (mai lab Filippo); non verificato manualmente il blocco 409 su DELETE referenziato né il viewport tablet. Dettaglio completo: `memory/MEMORY.md` §0. Spec: `docs/superpowers/specs/2026-07-06-cicli-produzione-crud-design.md`. Piano: `docs/superpowers/plans/2026-07-06-cicli-produzione-crud.md`.

**Correzione doc (06/07/2026):** verificato via `git log`/`git branch --contains` che B4 (as any PDF), le norme armonizzate MDR §7, e B13 (1/2 + 2/2, entrambe le parti) sono **già mergiati su `main`** da sessioni precedenti — i relativi paragrafi più sotto e in `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` dicevano ancora "non ancora mergiato", testo non aggiornato dopo il merge effettivo. Nessun'azione di merge necessaria per queste voci, restano solo come riferimento storico.

**Prossima priorità (07/07/2026): B20** (PSUR/PMS Report non differenziato per classe di rischio, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B20) — unico Blocker aperto senza piano dettagliato, richiede prima una sessione di brainstorming/design. Altri Blocker aperti dopo B20: B6 (Service Worker offline, fix rapido), B14 (`tecnici.compenso_base` ambiguo), B16 (query `/ordini` non supportata). Handoff completo: `memory/SESSION_ACTIVE.md`.

**Aggiornamento precedente:** 05 luglio 2026 — **Norme armonizzate applicate (MDR §7) RISOLTO E COMMITTATO** (worktree `worktree-norme-armonizzate-ddc`, 5 commit, non ancora mergiato su `main`) — chiude il follow-up aperto da B4. `rischi_tipo_dispositivo` estesa con `norme_json JSONB` (migration applicata al DB live con conferma esplicita di Francesco), editor/API/`generateDdC()`/`DdcTemplate.tsx` tutti aggiornati per validare, persistere e stampare l'elenco delle normative armonizzate (`{codice, titolo, anno?}`) in una nuova sezione condizionale §6-bis della DdC. 6 task via `superpowers:subagent-driven-development`, tutti approvati senza Critical/Important. `tsc`/`vitest` (478/4 skipped, era 466)/`eslint`/`next build` puliti. Dettaglio completo: `memory/MEMORY.md` §0. Spec: `docs/superpowers/specs/2026-07-05-norme-armonizzate-ddc-design.md`. Piano: `docs/superpowers/plans/2026-07-05-norme-armonizzate-ddc.md`. **Ancora da fare:** merge su `main`, push, deploy, QA browser.

**Aggiornamento precedente:** 05 luglio 2026 — **B4 RISOLTO** (`as any` nei generatori PDF MDR, 11/11 eliminati, branch `worktree-b4-pdf-generators-type-safety`, non ancora mergiato su `main`). Helper `renderPdfDocument()` isola il cast boundary renderer (9 occorrenze → 1); `getTypedServiceClient()` (nuovo, dopo un pivot tecnico scoperto durante l'implementazione — la tecnica di design originaria non compilava su un client Supabase non tipizzato) sostituisce i cast di accesso dati senza toccare il client condiviso `getServiceClient()`. Aggiunta `validateDpaData()` (unico gap reale di validazione trovato). Test coverage costruita da zero per gli 8 generatori (prima solo `DdcTemplate` era testato): 466/4 skipped (era 450). **Scoperto e corretto come effetto collaterale (Task 12): bug di produzione reale** — `generateDdC()` falliva su ogni chiamata reale su `main` (colonna `testo_conformita` NOT NULL mai valorizzata + colonna fantasma `norma_riferimento` inviata all'INSERT), mascherato dal client non tipizzato. `tsc`/`vitest`/`eslint`/`next build` tutti puliti. Dettaglio completo: `memory/MEMORY.md` §0. Spec: `docs/superpowers/specs/2026-07-05-b4-pdf-generators-type-safety-design.md`. Piano: `docs/superpowers/plans/2026-07-05-b4-pdf-generators-type-safety.md`. **Backlog aperto:** tipizzare `getServiceClient()` con `<Database>` (147 file, root cause reale); `precheck-mdr.ts` non verifica P.IVA del laboratorio; `norme_json` (MDR §7) mai popolato da `generateDdC()` — task separato in corso.

**Aggiornamento precedente:** 05 luglio 2026 — **2 fix minori segnalati da Francesco (QA sessioni precedenti) RISOLTI E DEPLOYATI** (merge fast-forward `85faad1` su `main`, pushato, CI verde, deploy Vercel confermato). (1) `PazientiSearchList.tsx` migrato al layout responsive `ua-list-grid` (era `flex-column` inline) — chiude il follow-up aperto da B9 (`task_8422a838`); scoperto in verifica visiva live che anche `ClientiSearchList.tsx` (il riferimento) aveva lo stesso bug (card edge-to-edge, 0px padding orizzontale) — corretto in entrambi con conferma di Francesco, non solo replicato. (2) `useReducedMotion()` in `motion.ts` aveva lo stesso hydration mismatch già risolto in B18 per `useTheme.ts` — risolto con lo stesso pattern "mounted guard", trade-off (breve flash animazione) approvato da Francesco. TDD completo, 450/450 test, tsc/build/lint puliti, review "Ready to merge: Yes". **Verificato in questa sessione: il bug z-index bottom-sheet vs `BottomNavPill` (segnalato da Francesco) è GIÀ RISOLTO** nel codice attuale (era stato corretto durante B8 4/5 e con l'hotfix `fix-listino-zindex` del 03/07) — nessuna azione necessaria. **Corretto: l'infrastruttura di test locale per le RPC NON è mancante** — era già stata costruita nella sessione precedente (`worktree-rpc-integration-tests`, merge `ab2e02c`); resta aperta solo l'estensione ad altre RPC `SECURITY DEFINER`. Dettaglio: `memory/MEMORY.md` §0. **Prossima priorità: B4** (`as any` nei generatori PDF MDR).

**Aggiornamento precedente:** 04 luglio 2026 — **B19 (Supabase Security Advisor hardening) RISOLTO per i 10 ERROR critici, committato ma non ancora mergiato su `main`** (branch `worktree-security-advisor-hardening`, 5 commit tecnici): non da audit tecnico precedente — segnalato da Francesco direttamente dalla dashboard Supabase Security Advisor. Chiusi tutti e 10 gli ERROR (RLS mancante su 3 tabelle, 7 Security Definer View senza `security_invoker`) più i WARN di sicurezza selezionati (8 funzioni `SECURITY DEFINER` con `REVOKE` da `anon`/`authenticated`, 33 funzioni con `search_path` fissato, 3 funzioni dead code eliminate). 5 funzioni helper RLS lasciate intenzionalmente intatte (WARN accettato, romperebbero tutte le policy). `get_advisors` ri-eseguito conferma **0 ERROR residui**. Leaked password protection resta ⛔ **non risolto** (bloccato: richiede piano Supabase Pro, progetto è su FREE). 445/445 test, tsc/build puliti. Dettaglio: `memory/MEMORY.md` §0, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B19). **Prossima priorità invariata: B4** (`as any` nei generatori PDF MDR) — questo era un fuori-programma di sicurezza, non sposta le priorità pianificate.

**Aggiornamento precedente:** 04 luglio 2026 — **B18 RISOLTO E DEPLOYATO** (branch `worktree-b18-hardening`, 5 commit, merge fast-forward `06a497d` su `main`, pushato su `origin/main`): chiusi tutti e 8 i finding di hardening trasversale emersi durante B3 (escape PostgREST, indice UNIQUE parziale, dedup React, CSS fallback, mock test, race condition, 2 hydration mismatch). Durante il lavoro scoperto e risolto separatamente (hotfix `23e0d15`, prima di B18) un bug critico nella RPC `salva_fasi_ciclo_atomico()` che soft-deletava ogni fase appena inserita — nessun dato reale perso. 445/445 test, tsc/build puliti, review finale "Ready to merge: Yes". Dettaglio: `memory/MEMORY.md` §0. **Prossima priorità: B4** (`as any` nei generatori PDF MDR).

**Aggiornamento precedente:** 04 luglio 2026 — **B3 RISOLTO E DEPLOYATO** (branch `worktree-b3-cicli-produzione`, 18 commit, merge fast-forward `c609a93` su `main`, pushato su `origin/main`, autorizzato esplicitamente da Francesco): cicli di produzione ora generano automaticamente le fasi alla creazione lavoro, `TabProduzione` persiste realmente esito/non conformità (2 bug di regressione corretti). Review finale whole-branch "Ready to merge: Yes" dopo un fix critico (RPC atomica per il salvataggio batch fasi). Dettaglio: `memory/MEMORY.md` §0.
**Fonte di verità:** questo file + MEMORY.md + `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` + `docs/roadmap/FEATURES-E-FLUSSI-2026-07-02.md`

> ⚠️ Questo documento è la **fonte di verità unica** per le decisioni di roadmap.
> Aggiornarlo ad ogni sessione di lavoro.

---

## VERSIONE CORRENTE: V1.9.3 (in produzione) — RE-AUDIT 02/07/2026 COMPLETATO

Il re-audit dell'11 agenti (02/07/2026) ha verificato con codice + test live che **il claim "DS v2.3 compliant al 100%" era falso** (login WCAG-fail, violazioni residue in `qualita/page.tsx`, migrazione palette parziale). Ha inoltre trovato **2 blocker critici nuovi** non coperti dalla roadmap precedente: tracciabilità MDR materiali/lotti strutturalmente rotta, e dati contrastanti tra Dashboard e Scadenzario sui crediti clienti.

**Prima di procedere con qualunque item sotto, leggere `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`** — sostituisce come priorità operativa la sessione S4 originariamente pianificata qui sotto.

---

## 🎨 SESSIONE DESIGN — CHIUSA (28/05/2026)

### ✅ Design System v2.3 — Completato

**Cosa è stato fatto:**
- Spec completa `docs/superpowers/specs/2026-05-27-design-system-v2-3.md`
- Token CSS: t2/t3 WCAG-compliant, alias `--sfc`, rainbow vars `--c-*`
- Token TS: `src/design-system/tokens.ts` — importa da qui, mai inline
- Motion: `src/design-system/motion.ts` v2.1 — 4 categorie, frequency gate
- Enforcement: `scripts/check-ds-compliance.sh` + `.husky/pre-commit`

**Applicato su tutta la PWA:**
- ~70 file: fallback t2/t3 aggiornati
- ~33 file: gold-as-text → `var(--c-amber)`
- ~47 file: shadow inline → `var(--sh-b/c/i/red)` (dark mode ora funziona)
- 14 file: CSS transition timing → `var(--tr)`
- KpiCard, StatoBadge: rainbow semantic colors
- BottomNavPill: CTA → `.ua-tasto-plus` fisico con `::before` corona

**Escluse** (da non toccare): `src/app/(auth)/` · `src/app/admin/`

**Regola DS — OBBLIGATORIA per ogni nuova sessione:**
> Prima di scrivere qualsiasi UI → rispetta `docs/superpowers/specs/2026-05-27-design-system-v2-3.md`.
> Nessun colore/shadow/font/animazione inline. Tutto da token.

---

## ✅ B18 RISOLTO (04/07/2026) — PROSSIMA SESSIONE → B4

**B3 è RISOLTO E DEPLOYATO (04/07/2026, branch `worktree-b3-cicli-produzione`, merge fast-forward `c609a93` su `main`, pushato su `origin/main`, autorizzato esplicitamente da Francesco).** Cicli di produzione non generavano mai fasi per i lavori nuovi: `TabProduzione.tsx` prometteva un selettore ciclo mai esistito in `TabDati.tsx`, nessun trigger materializzava `lavori_fasi` da `fasi_produzione`. Fix: piano di 13 task con TDD + subagent-driven-development, 2 migration live (audit `updated_by`/trigger + RPC atomica `salva_fasi_ciclo_atomico` per salvataggio batch transazionale), 3 nuove route API, 2 componenti (`CicloComboBox`/`CicloFasiEditor`), 2 pagine nuove `/cicli-produzione`. Corretti anche 2 bug di regressione trovati in audit: persistenza esito fase mai avvenuta, `non_conforme` mai sincronizzato. Review finale whole-branch (Opus): "Ready to merge: With fixes" → 1 Important bloccante (scrittura silenziosa senza controllo errori in `PATCH /api/cicli/[id]/fasi`, risolto con RPC atomica) + fix "Invalid Date" pre-esistente in `/qualita` → ri-review "Ready to merge: Yes". 421/421 test, tsc/build puliti. QA E2E completa su lab isolato (mai il lab Filippo), dati rimossi, baseline verificata. Dettaglio completo: `memory/MEMORY.md` §0, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B3). **Su richiesta esplicita di Francesco, aggiunta voce B18** (hardening trasversale — 8 finding non bloccanti emersi durante B3), **risolta lo stesso giorno** (branch `worktree-b18-hardening`, merge `06a497d`) — vedi `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B18) per il dettaglio completo, incluso il bug critico scoperto e risolto come hotfix separato durante il lavoro (`salva_fasi_ciclo_atomico()`). **Prossima priorità: B4** (`as any` nei generatori PDF MDR).

**B10 è RISOLTO (chiuso 04/07/2026, merge fast-forward `fab5437`).** `/api/fornitori` mancante bloccava la creazione ordini: `NuovoOrdineSheet.tsx` chiamava una route inesistente (errore ingoiato), select "Fornitore" sempre vuoto, bottoni invio ordine WhatsApp/Email sempre disabilitati. Fix: nuova `GET /api/fornitori`, stesso pattern già in produzione di `GET /api/listino` (scoping lab, `attivo=true`, mapping `ragione_sociale`→`nome`), nessuna migration necessaria. TDD, 376/376 test, tsc/build puliti, review "Ready to merge: Yes" (zero Critical/Important). QA manuale in browser reale confermata: select popolato, bottoni WhatsApp/Email abilitati dopo selezione fornitore. Dettaglio completo: `memory/MEMORY.md` §0, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B10).

**S4 (Email template branding) è COMPLETO (04/07/2026, commit `01e915c`).** I 3 template Supabase Auth (Confirm Signup, Reset Password, Invite User) sono stati ridisegnati con palette Warm Panna, logo reale (`ua-logo-email.png`), link di fallback cliccabile/copiabile nascosto sotto spoiler `<details>` — approvati da Francesco in 2 round di feedback su mockup, poi **applicati direttamente su Supabase Dashboard da Claude via `claude-in-chrome`** (Francesco ha installato l'estensione e connesso la sessione), verificati byte-per-byte e con un invio reale (reset password su `francesco.formicola@live.it`, confermato `mail.send` nei log Auth senza errori). HTML finale in `docs/email-templates-supabase.md`, decisione in `docs/design/decisions/2026-07-04-s4-email-templates-branding.md`. Dettaglio completo: `memory/MEMORY.md` §0.

**B9 è RISOLTO (chiuso 04/07/2026, merge `ea2a3a9`).** Lista pazienti (BUG #13, noto da settimane) ora navigabile: `PazientiSearchList.tsx` usava righe `<li><div>` statiche senza `Link`; la pagina di dettaglio `/pazienti/[id]` esisteva già e funzionava ma era irraggiungibile. Fix minimo (`<Link href>` + pattern flex/chevron gemello di `ClientiSearchList.tsx`), TDD, review "Ready to merge: Yes". Dettaglio completo: `memory/MEMORY.md` §0. ~~Follow-up non bloccante aperto separatamente (`spawn_task task_8422a838`): migrare `PazientiSearchList` al layout `ua-list-grid` per coerenza responsive con `ClientiSearchList`.~~ ✅ risolto 05/07/2026 (merge `85faad1`), vedi aggiornamento in testa al file.

**B8 è COMPLETO (5/5, chiuso 04/07/2026).** Tutte e 5 le route del backlog sono risolte e in produzione: magazzino/nuovo (1/5), listino/nuovo (2/5), qualita/rischi/[id] (3/5), rete/nuova (4/5), rete/[id] (5/5, merge `0c3e040`). Il link "Gestisci rete →" ora apre un dettaglio rete funzionante con rinomina, inviti lab-a-rete, rimozione membri e sezione admin. Dettaglio completo B8 (5/5): `memory/MEMORY.md` §0. **Prossima priorità: S4** (Email template branding, bozza HTML già pronta in `docs/email-templates-supabase.md`).

**A4 (Alto, non blocker) è chiuso definitivamente (03/07/2026, merge `4a36f89`).** Cache versioning automatico nel Service Worker: `public/sw.js` è diventato un file generato (gitignored) da `scripts/generate-sw.mjs`, con `CACHE_NAME` legato al build-id (git sha in produzione, `ua-dev` in sviluppo) invece del bump manuale `ua-v1→ua-v2`. Nessun TTL/pulizia cache aggiunto (decisione esplicita in brainstorming — il fix RSC di B2 aveva già eliminato la crescita illimitata). Spec: `docs/superpowers/specs/2026-07-03-a4-cache-versioning-design.md`. Piano: `docs/superpowers/plans/2026-07-03-a4-cache-versioning.md`. Dettaglio completo: `memory/MEMORY.md` §0.

**B7 (blocker critico) è risolto, mergiato su `main` (`fe81be6`) e deployato (03/07/2026).** Il titolare ora può invitare tecnico/front_desk/co-titolare direttamente dall'UI in `/tecnici`; fix incluso della RPC `accept_invite_atomic` che non creava la riga `tecnici` mancante, più un secondo fix di idempotenza (bug di duplicazione righe trovato dalla review finale verificando direttamente su Supabase live). Dettaglio completo: `memory/MEMORY.md` §0. Handoff strutturato per la prossima sessione: `memory/SESSION_ACTIVE.md`.

**B1 e B2 (i 2 blocker critici del re-audit 02/07) sono risolti, mergiati su `main` e deployati.** Da eseguire subito all'avvio della prossima sessione, PRIMA di S4 o di qualunque nuova feature:

```
Leggi docs/roadmap/BACKLOG-TECNICO-2026-07-02.md sezione BLOCKER.
Priorità: procedere con S4 (Email template branding, bozza già pronta in docs/email-templates-supabase.md).

~~B8 — 5 route CRUD che portavano a 404~~ — ✅ COMPLETO 04/07/2026 (magazzino/nuovo, listino/nuovo, qualita/rischi/[id], rete/nuova, rete/[id] tutte risolte e in produzione).
~~B9 — Lista pazienti non navigabile (BUG #13)~~ — ✅ RISOLTO 04/07/2026 (merge `ea2a3a9`).
```

**Storico B1/B2/B7 (per contesto, non richiede più azione):**
- B1 — Tracciabilità MDR materiali/lotti — ✅ RISOLTO 02/07 (commit `31cc47c`)
- B2 — Dashboard/Scadenzario dati contrastanti sui crediti clienti — ✅ RISOLTO e MERGIATO 03/07 (piano 16 task su worktree `b2-contabilita-clienti`, merge `05612ec`). Due round di bug trovati SOLO in verifica finale/review whole-branch (mai in review di singolo task) e corretti prima della chiusura: (1) Task 16 → `scadenzario/route.ts` non nettava `importo_pagato` sulle fatture con pagamento parziale (fix `cbc034b`); (2) review finale sull'intero branch → `scadenzario/route.ts` escludeva i lavori `fatturare`-non-inclusi che le altre superfici contano, e `getContabilitaCliente` non escludeva le fatture bozza (fix `ac48530`). Dettaglio completo in MEMORY.md §0.
- B7 — "Invita tecnico" irraggiungibile da UI — ✅ RISOLTO e MERGIATO 03/07 (piano 12 task su worktree `worktree-b7-invito-collaboratori`, merge `fe81be6`). Bug reale trovato SOLO dalla review finale whole-branch verificando direttamente su Supabase live (stesso pattern di B2: mai nelle review di singolo task): `accept_invite_atomic` duplicava la riga `tecnici` su re-invito+re-accettazione, corretto con una seconda migration (`WHERE NOT EXISTS`) prima del merge. QA e2e reale in browser eseguita post-merge. Dettaglio completo in MEMORY.md §0.
- **Follow-up collegati, risolti in sessione separata (commit `7fc181b`):** bug Service Worker PWA (cache RSC di `router.refresh()`, causava UI stale su tutta l'app dopo mutazioni — scoperto durante B2, backlog A4) + allineamento `BACKLOG-TECNICO-2026-07-02.md` (B2 ✅, A4 🔄 parziale, B7 ✅).

**Nota:** S4 Email template branding resta valida come task (bozza HTML già pronta, manca solo applicazione manuale su Supabase dashboard, 3h) ma non è la priorità — B8/B9 vengono prima.

---

## V1.9 — Completamento Pre-Collaudo
**Priorità:** Massima — da fare PRIMA che Filippo usi l'app seriamente.

| # | Feature | Priorità | Stima | Stato |
|---|---------|----------|-------|-------|
| DS | **Design System v2.3** | P0 | — | ⚠️ **Parziale, non 100%** (re-audit 02/07: login WCAG-fail, 2 violazioni residue in qualita/page.tsx, migrazione palette parziale — vedi backlog B12, A6, M6) |
| 1 | **Dettatura vocale** (Web Speech API) | P0 | 4h | ⏳ Confermato non iniziato (grep SpeechRecognition → 0 risultati) |
| 2 | **Email template branding** (Supabase) | P0 | 3h | ⏳ Bozza HTML pronta in `docs/email-templates-supabase.md`, manca solo applicazione manuale |
| 3 | **Rifacimenti UI** | P0 | 6h | ✅ Completato S2 (26/05/2026) |
| 4 | **Logo + firma DdC** | P0 | 4h | 🟡 **Quasi completo, non ⏳** — rendering già implementato in `DdcTemplate.tsx`; manca solo l'hash SHA-256 di integrità firma (backlog A18) |
| NEW | **2 Blocker critici da re-audit 02/07** (B1 materiali/lotti MDR, B2 dashboard/scadenzario) | 🔴 P0 | non stimato | ✅ Entrambi risolti — B1 (31cc47c, 02/07) · B2 (cbc034b, 03/07, dopo fix del bug residuo trovato in verifica finale), vedi sopra |
~~5 Magazzino visivo → spostato in V2.0~~ |

**Vedi `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` per altri 14 item Blocker, 18 Alto e 30 Medio non elencati qui per brevità.**

---

## V2.0 — Post-Collaudo Filippo
**Priorità:** Alta — sviluppare dopo le prime 2-3 settimane di uso reale
**Trigger:** Filippo usa l'app quotidianamente e dà feedback reali

| # | Feature | Priorità | Note |
|---|---------|----------|------|
| 1 | **Portale dentista V2** | P0 | Comunicazione bidirezionale, ordine lavoro dal portale, download DdC |
| 2 | **Analytics avanzate** | P0 | Top clienti, margine per tipo dispositivo, lead time, tasso rifacimento |
| 3 | **Multi-tier pricing avanzato** | P1 | listino_prezzi_tier con assegnazione per cliente. Ora 4 tier, serve 6+ |
| 4 | **Dettatura vocale avanzata (Whisper)** | P1 | Whisper API OpenAI per accuracy su termini tecnici italiani (~€0.006/min) |
| 5 | **Sezione Rete funzionale** | P1 | Dashboard multi-lab per admin_rete. Architettura: reti + reti_members già in DB |
| 6 | **WhatsApp Cloud API ufficiale** | P2 | Notifiche automatiche (Meta Business + 360dialog/Twilio). Ora solo deep links |
| 7 | **Allegati clinici avanzati** | P2 | Note vocali (audio), file STL scansioni, PDF prescrizione digitale |
| 8 | **Log WhatsApp (agenda_messaggi_clienti)** | P2 | Tracciamento ogni messaggio mandato: data, testo, esito |
| 9 | **Magazzino visivo** (Mixel-inspired) | P2 | Concept C: tile 3 col, 12 glifo SVG, fill-bar semaforo. Toggle lista↔vetrina. Vedi `MAGAZZINO-VISIVO-BRAINSTORM.md` |

---

## V2.1 — AI Assistant
**Priorità:** Alta business value — pricing già pianificato
**Modello:** Stripe metered billing €24,90/mese (1.000 msg) + scaglioni

| # | Feature | Note |
|---|---------|------|
| 1 | **Voce continua** (stile ChatGPT) | Web Speech API V1 → Whisper V2 |
| 2 | **Chat AI** per inserimento dati | "Crea lavoro per Dr. Rossi, corona ceramica urgente" |
| 3 | **TTS risposta** | Web Speech Synthesis gratuita |
| 4 | **Smart routing modelli** | 40% Haiku 4.5 + 60% Sonnet = blended ~€0.008/msg |
| 5 | **Billing metered Stripe** | €24,90/mese base + €11 ogni 1.000 msg extra |
| 6 | **Caching prompt** | 8.000 token system cached → riduce costo input a $0.0024/msg |

---

## V2.2 — Compliance Avanzata MDR
**Trigger:** Se Filippo cerca certificazione ISO 13485 o ha clienti PA

| # | Feature | Note |
|---|---------|------|
| 1 | **CAPA** (Corrective and Preventive Action) | Link a incidenti/non conformità. ISO 13485 |
| 2 | **Fascicolo Tecnico MDR** | 6 tab: specifiche, FMEA, valutazione clinica, test, DdC, PSUR |
| 3 | **PMCF follow-up automatico** | Reminder 6/12 mesi post-consegna. MDR Art. 83 obbligatorio |
| 4 | **Firma Digitale P7M** | Per FatturaPA alla PA (Regioni, ASL). Richiede AgID |
| 5 | **Nota di credito XML (TD04)** | Per correggere fatture già emesse |

---

## V3.0 — Platform Scale
**Trigger:** Secondo cliente + espansione

| # | Feature | Note |
|---|---------|------|
| 1 | **Migrazione DentalMaster completa** | 30 anni storico. FileMaker fp7 → UÀ. Import batch |
| 2 | **Prescrizione digitale dentista** | Form digitale dal portale con firma digitale |
| 3 | **SDI diretto** | Senza PEC. Richiede accordi HUB SDI accreditato |
| 4 | **Terzismo inter-lab** | Lavori in subappalto tra laboratori della rete |
| 5 | **Onboarding self-service** | Nuovo lab si iscrive, paga Stripe, riceve seed automatico |
| 6 | **API pubblica** | Per integratori CAD/CAM, software clinici |
| 7 | **CAD/CAM integration** | Import STL nativi, link scansione digitale in Tab Clinica |
| 8 | **White label** | Lab con marchio proprio |

---

## DECISIONI ARCHITETTURALI PERMANENTI

| Decisione | Rationale |
|-----------|-----------|
| WhatsApp: solo `wa.me` deep links | ToS Meta-compliant. Cloud API solo se serve V2 |
| Tecnici: disattiva (non cancella) | Storico lavori collegato. `lab_memberships.attivo=false` |
| Fatture: generate durante `orchestraConsegna` | `incluso_in_fattura` = discriminatore. No fatturazione separata |
| Pazienti: pseudonimizzazione GDPR | Solo `codice_paziente`, mai nome in WhatsApp/portale |
| Push notifications: lazy-init VAPID | No crash build CI se chiavi mancanti |
| Stack voice V1: Web Speech API nativa | Zero costi. Whisper solo per V2 se serve accuracy |

---

## VANTAGGI COMPETITIVI UNICI (non toccare)

| Vantaggio | vs Competitor |
|-----------|--------------|
| 1-tap CONSEGNA (DdC+Fattura+Stock) | DentalMaster = 6+ click |
| Mobile-first PWA | OrisLab, OdontoSoft, ODIX = solo desktop |
| WhatsApp nativo | Tutti = messaggistica interna |
| WebAuthn passkey (Touch ID) | Nessun competitor |
| SaaS multi-tenant zero IT | Nessun competitor |
| GDPR pseudonimizzazione nativa | DentalMaster = zero |
| Portale dentista senza login | Nessun competitor |
| Numero progressivo DdC nativo | DentalMaster non ce l'ha |

---

## MAGAZZINO VISIVO — Feature Brainstorm (V1.9)
*Da espandere dopo ricerca Mixel — vedi docs/roadmap/MAGAZZINO-VISIVO-BRAINSTORM.md*

---

## STACK DI ORCHESTRAZIONE

Il progetto usa 3 orchestratori in layers:

| Orchestratore | Layer | Quando | Installato |
|--------------|-------|--------|-----------|
| **Superpowers** | Esecuzione TDD + subagenti | Sempre | ✅ (marketplace Anthropic) |
| **gstack** (Garry Tan, YC) | Decisioni strategiche (23 specialisti simulati) | Feature media/grande | ✅ `~/.agents/skills/gstack` |
| **GSD** (Lex Christopherson) | Stabilità spec multi-sessione | Feature grande (10+ file) | ⚠️ Procedurale (no SKILL.md) |

Procedura completa: `docs/processes/WORKFLOW-STANDARD.md`

---

## CHANGELOG ROADMAP

| Data | Modifica | Chi |
|------|----------|-----|
| 22/05/2026 | Documento creato da riconciliazione 6 file HTML + sessioni di sviluppo | Francesco + Claude |
| 22/05/2026 | V1.9 aggiunta (dettatura vocale, email template, rifacimenti UI, logo DdC, magazzino visivo) | Francesco + Claude |
| 22/05/2026 | Magazzino visivo: Concept C selezionato (Mixel-inspired, tile+glifo+fill-bar) | Francesco + Claude |
| 22/05/2026 | Stack orchestratori documentato: Superpowers + gstack + GSD | Francesco + Claude |
| 25/05/2026 | V1.9.1: S1 fix residui completati — badge LIVE rimosso, preferenza_dashboard toggle, Da fatturare lista inline | Francesco + Claude |
| 26/05/2026 | S2 completato: RifacimentoButton bottom sheet 7 motivi, motion policy, mockup approvato | Francesco + Claude |
| 28/05/2026 | DS v2.3 brainstorming + approvazione: spec completa, tokens.ts, motion.ts v2.1, 4-cat taxonomy | Francesco + Claude |
| 28/05/2026 | DS v2.3 implementazione completa: compliance 100% su tutta la PWA, pre-commit guard attivo — V1.9.3 | Francesco + Claude |
| 05/06/2026 | Sessione design chiusa. Prossimo: S4 email template branding (Supabase) | Francesco + Claude |
| 02/07/2026 | Re-audit completo (11 agenti persona) dopo quasi un mese di inattività (zero commit dal 05/06). Score medio 7.29/10 (era 7.1). Claim "DS v2.3 100%" smentito. 2 blocker critici nuovi trovati (materiali/lotti MDR, dashboard/scadenzario disallineati). Prodotti `BACKLOG-TECNICO-2026-07-02.md` e `FEATURES-E-FLUSSI-2026-07-02.md` come nuova fonte di verità tecnica. | Francesco + Claude |
| 03/07/2026 | B2 risolto: Task 16 (verifica finale) aveva trovato un bug residuo in `src/app/api/scadenzario/route.ts` (non nettava `importo_pagato` sulle fatture con pagamento parziale/credito, disaccordo Scadenzario vs Dashboard/Contabilità cliente) e correttamente riportato BLOCKED — fix applicato (netta il residuo come già fanno le altre superfici), tsc/vitest/build verdi, ri-verificato con dati reali (commit `cbc034b`). Entrambi i 2 blocker critici del re-audit 02/07 sono ora risolti. | Francesco + Claude |
| 03/07/2026 | Review finale sull'intero branch B2 (26 commit) trova un secondo disaccordo tra superfici, invisibile a qualunque review di singolo task: Scadenzario escludeva i lavori "fatturare non ancora inclusi" che Dashboard/Contabilità cliente contano già, e `getContabilitaCliente` non escludeva le fatture in bozza. Chiesto a Francesco quale comportamento adottare (nessuna risposta nel timeout, applicata l'opzione raccomandata coerente con lo spec) — fix `ac48530`, re-review "Ready to merge: Yes". Branch mergiato fast-forward su `main` (`05612ec`) e pushato — deploy Vercel. **B2 chiuso.** | Francesco + Claude |
| 03/07/2026 | 2 follow-up B2 risolti in sessione separata (commit `7fc181b`): bug Service Worker PWA scoperto durante B2 (cachava le fetch RSC di `router.refresh()` nonostante `Cache-Control: no-cache` di Next, causando UI stale su tutta l'app dopo ogni mutazione — verificato dal vivo con Playwright, non solo lettura codice) + allineamento `BACKLOG-TECNICO-2026-07-02.md` (B2 ✅, A4 🔄 parziale). | Francesco + Claude |
| 04/07/2026 | B19 aggiunto e risolto per i 10 ERROR critici: hardening Supabase Security Advisor segnalato da Francesco fuori dal backlog tecnico esistente (RLS mancante su 3 tabelle, 7 Security Definer View, 8 funzioni `SECURITY DEFINER` con `REVOKE`, 33 `search_path` fissati, 3 funzioni dead code eliminate, 5 helper RLS WARN accettato). `get_advisors` conferma 0 ERROR residui. Leaked password protection resta bloccato (piano Free). Branch `worktree-security-advisor-hardening` committato, non ancora mergiato su `main`. Priorità B4 invariata. | Francesco + Claude |
| 05/07/2026 | 2 fix minori risolti e deployati: `PazientiSearchList` migrato a `ua-list-grid` (chiude follow-up B9), stesso bug scoperto e corretto anche in `ClientiSearchList` (card edge-to-edge in produzione); `useReducedMotion()` hydration mismatch risolto con pattern "mounted guard" (stesso di B18/`useTheme.ts`), trade-off approvato da Francesco. Verificato che il bug z-index bottom-sheet segnalato era già risolto (B8 4/5 + hotfix listino) e che l'infrastruttura test RPC locale era già stata costruita la sessione precedente (non mancante, solo da estendere). Merge `85faad1`, CI verde, deploy confermato. Priorità B4 invariata. | Francesco + Claude |
| 05/07/2026 | B4 risolto e mergiato (`as any` nei generatori PDF MDR, 11/11 cast eliminati) — scoperto e corretto come effetto collaterale un bug di produzione reale in `generateDdC()`. A seguire: norme armonizzate applicate (MDR §7, `dichiarazioni_conformita.norme_json`) implementate in worktree dedicato — migration `rischi_tipo_dispositivo.norme_json` applicata al DB live, editor/API/generatore/template DdC aggiornati, 6 task via `superpowers:subagent-driven-development`, 478/4 test verdi. Chiude il follow-up aperto da B4. Non ancora mergiato su `main`. | Francesco + Claude |
| 06/07/2026 | CRUD completo `cicli_produzione` implementato (worktree `worktree-cicli-produzione-crud`) — chiude il follow-up scoperto in QA B5 ("nessun modo di creare un ciclo via UI/API"). Migration live (indice UNIQUE parziale su `codice`, pattern B18), nuove route `POST`/`PATCH`/`DELETE /api/cicli[/id]`, sheet create/edit e bottone elimina. Review finale (Opus) "Ready to merge: Yes" dopo 2 fix Important (validazione PATCH allineata a POST, payload PATCH costruito come delta). 626/626 test, tsc/build puliti. QA browser end-to-end (mai lab Filippo); non verificato manualmente il blocco 409 su DELETE referenziato né il tablet. Non ancora mergiato su `main`. | Francesco + Claude |
