# Handoff — Ondata «Redesign parete/home», WAVE H (25/07 pomeriggio)

**Per:** sessione NUOVA a contesto pulito (direttiva esplicita di Francesco: da qui tutto
scritto/certificato e svolto in sessione nuova). **Prassi:** BP-0 →
`superpowers:subagent-driven-development` (un subagent fresco per task/fix, review a due
stadi — prassi consolidata di tutta l'ondata).
**⚠️ Direttiva permanente «Come parlare con Francesco»** (CLAUDE.md §7 / ua-app §0D) — sempre.
**⚠️ rm-guard attivo:** mai `rm -r` fuori dalle aree temporanee (deviazione su `trash`).
**⚠️ Regola Advisor (17/07):** decisioni significative → panel 2-3 advisor PRIMA della ratifica.

## Base di lavoro (NON ricreare niente)

- **Worktree ESISTENTE:** `.claude/worktrees/redesign-parete-home`, branch
  `worktree-redesign-parete-home`, codice a **`aa4993a`** (+ verbale `e8770d9`).
  Suite: **2980 verdi / 19 skip · tsc 0 · build ok.**
- **Ledger (mappa fedele di tutto, incl. MINOR accumulati per la review finale T17):**
  `<worktree>/.superpowers/sdd/progress.md`. Report per fix: `.superpowers/sdd/fix{A..L}-report.md`
  (gitignorati, solo su disco). Brief: `fix{F,H,I,J,K,L}-brief.md`.
- **Verbale QA (È LEGGE):** `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` —
  contiene TUTTI e tre i ri-collaudi, le ratifiche e la fix-list wave H in fondo.
- **Server collaudo:** build produzione su :3020 (processo della sessione precedente — se giù:
  `npx next build && npx next start -p 3020 -H 0.0.0.0` DAL worktree; IP `ipconfig getifaddr en0`;
  utente `e2e-titolare@ua-test.local`; ⚠️ `preview_start {name}` risolve il checkout PADRE,
  non il worktree — usare `preview_start {url}` o server manuale, nota nei report FIX-C/L).
- Su **main** non pushati: `8b8dd40`+`2b069f0` (rm-guard) — col prossimo deploy.

## Stato (wave G COMPLETA, verificata al ri-collaudo #3)

Task 1-14 ✅ · T15 in corso (QA device iterativo). Wave D (D1-D10) e wave G (G1-G10) chiuse
con review a due stadi. Al ri-collaudo #3 Francesco ha confermato PASS: gancetto sul filo,
cornice, back-chiude-sheet, miniatura immediata, lista V2, pile ariose, ricerca. Restano i
punti wave H sotto. Dopo la wave H: T16 striscia (valori ratificati, brief nel piano) e T17
chiusura (FASE 7 reale · FASE 8 review whole-branch con la LISTA MINOR dal ledger · FASE 9
Playwright 390/768/1280×2 temi · FASE 9b GATE ESTETICO L2 · 🛑 merge solo su parola di
Francesco · FASE 11 BP-1 pieno su MEMORY.md + ROADMAP).

## Sequenza wave H (dal verbale, ordine di Francesco)

1. **H1 — Suoni primo tocco (terzo giro, metodo nuovo):** i primi due fix (unlock su
   pointerdown `8ddf2ef` + init anticipata su tutte le superfici `2725565`/`11a2902`) sono
   corretti ma NON bastano sul device. STOP ai fix alla cieca — nell'ordine:
   (a) ricerca web mirata: autoplay/user-activation policy di Chrome Android, timing reale
   di `AudioContext.resume()` + `decodeAudioData` al primo gesto, pattern noti (unlock con
   buffer muto sincrono nel gesto, pool di sorgenti, `touchstart` vs `pointerdown`);
   (b) evidenza DAL device: overlay diagnostico temporaneo (pattern P-STATUSBAR del
   Collaudo R3) che mostri a schermo stato ctx/buffers/tempi al primo tocco;
   (c) PANEL ADVISOR (Regola 17/07: es. frontend-ui-builder + solution-architect + un
   terzo su web-audio) sulla diagnosi; POI il fix con collaudo device.
2. **H2 — Cassetta: proposta design PRIMA del codice** (due implementazioni consecutive non
   hanno soddisfatto — cambiare metodo). Vincoli di Francesco, sue parole a verbale:
   UNA sola sagoma (via `is-nome-lungo` e fascia elastica) · fascia nella PANCIA come le
   libere, ALTEZZA SEMPRE FISSA «piena e vuota» · nomi NON troncati di netto.
   ⚠ Tensione altezza-fissa ↔ nomi-interi: preparare mockup con opzioni concrete di
   conciliazione (es. fascia fissa a 2 righe sempre + abbreviazione intelligente del clinico
   «Studi M. Di Santi G.» + paziente sempre intero; oppure fascia fissa + corpo variabile),
   screenshot, SCELTA di Francesco, POI implementare. Base valori: la resa delle LIBERE
   nella build aa4993a (quella gli piace) — fotografarla come riferimento.
3. **H3 — Bug riordino:** indagine su `useDragRiordino.ts`/`riordino-core.ts` — al lift
   (stacco) altre cassette si riordinano PRIMA del rilascio/movimento. Verificare quando
   parte il primo `calcolaNuovoOrdine`/FLIP: al pointerdown+soglia? con quale indice?
   Riprodurre in browser reale (harness tipo FIX-C). Distinguere: indice errato al lift
   (bug) vs «buca» che si apre subito (design da rivedere con Francesco). Nota: il fix
   pitchY (FIX-F `2634570`) ha cambiato il calcolo di riga — sospetto naturale da
   verificare/escludere per primo.
4. **H4 — Ratifiche da implementare:**
   - Linguetta **F2** (impara-e-si-assottiglia: 3 passaggi piena → filo rosso sempre
     tappabile, mai sparita) + **T2** (34px, testo più leggibile). Mockup di riferimento:
     `docs/design/mockups/2026-07-25-linguetta-e-piede-proposte.html` (F2+T2).
   - Piede **C2** («il tasto si ritira») — PRIMA demo ANIMATA C1 vs C2 (HTML con le molle
     v3 vere da `src/design-system/v3/motion.ts`, tipo la demo striscia
     `2026-07-24-striscia-animazioni.html`) → conferma di Francesco → implementazione.
5. Ri-collaudo device #4 su tutto → APPEND al verbale → se pulito, chiudere 🛑 T15 → T16 → T17.

## Vincoli tecnici accumulati (non ripetere gli errori)

- I test jsdom NON fanno layout: per geometria/clipping usare harness Playwright reale
  (pattern dei report FIX-L round 2/3: misure numeriche, contro-prova).
- `.ds-parete` NON deve mai avere `overflow:hidden` (guardia in
  `tests/unit/ds-v3/parete-gancio-cornice.test.ts`, gancetti sporgono 20px).
- Nomi in fascia: regola vigente `width:min(100%,96px)` su dent/paz + `align-items:center`
  sul cont (3 round di review — la storia è nei commenti di ds-v3.css e nel fixL-report).
- Il pattern del muro segue `--passo-maglia` (MAI ri-hardcodare 44), snap `hook ≡ 10 mod passo`.
- Sheet: entry history `{uaSheet:true}`, cleanup gated su `history.state?.uaSheet` (limiti
  noti: DialogConferma senza entry propria; marker condiviso non per-istanza).
- Refresh embedded gated + overlay ottimistico `pareteVista` (7 percorsi) — non
  reintrodurre `router.refresh()` nudi nel percorso parete.

## Decisioni/aperture rimaste in coda (oltre la wave H)

- Campi ricerca AGGIUNTIVI (tecnico assegnato, data consegna prevista, descrizione/tipo):
  elenco già dato a Francesco, decisione rimandata.
- Note del lavoro APPENA assegnato non cercabili fino a riletta (estendere lavori-liberi se
  serve). · Spec DS v3 §9.1 «5 suoni»→7 da allineare in T17. · Minor list completa nel ledger.
- Dopo l'ondata (ROADMAP invariata): iOS fluidità 🛑 device · Miniature 38+legenda · D-11
  purga · coda lunga (A8 Resend · sessione DB · perf-budget · §B).
