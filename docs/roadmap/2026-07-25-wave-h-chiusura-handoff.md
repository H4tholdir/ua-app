# Handoff — Ondata «Redesign parete/home», CHIUSURA (post wave H + 2 giri fix)

**Per:** sessione NUOVA a contesto pulito (richiesta esplicita di Francesco, contesto >60%).
**Prassi:** BP-0 → `superpowers:subagent-driven-development` (un subagent fresco per task/fix,
review a due stadi — prassi di tutta l'ondata, ha retto anche stavolta).
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (CLAUDE.md §7/§0D) · rm-guard
(mai `rm -r`, deviazione su trash) · Regola Advisor (panel per decisioni significative) ·
mockup PRIMA del codice per ogni scelta visiva (e CONTROLLARE i mockup prima di inoltrarli —
lezione doppia di questa sessione: due respingimenti per mockup non verificati).

## Base di lavoro (NON ricreare niente)

- **Worktree ESISTENTE:** `.claude/worktrees/redesign-parete-home`, branch
  `worktree-redesign-parete-home`, codice a **`800dd45`**. Suite: **3071 verdi / 19 skip ·
  tsc 0 · build ok.** Server collaudo: build produzione su **:3020** @ 800dd45 — ⚠️ **VERIFICARE SEMPRE ALL'AVVIO** (`curl -s -o /dev/null -w '%{http_code}' http://localhost:3020/`, atteso 307): i server avviati in una sessione precedente vengono terminati con essa. Riavvio sganciato che sopravvive:
  `(setsid nohup npx next start -p 3020 -H 0.0.0.0 > /tmp/ua-3020.log 2>&1 < /dev/null &)` DAL worktree.
  (se serve ricostruire:
  `npx next build && npx next start -p 3020 -H 0.0.0.0` DAL worktree; IP
  `ipconfig getifaddr en0`; ⚠️ :3020 è una build CONGELATA — le verifiche live di sessione
  si fanno sul dev :3042). Login collaudo: `e2e-titolare@ua-test.local` / fixture E2E.
- **Ledger fedele di TUTTO** (incl. lista MINOR per la review finale T17):
  `<worktree>/.superpowers/sdd/progress.md`. Report/brief per task: `.superpowers/sdd/*.md`
  (gitignorati, su disco).
- **Verbale QA unico (È LEGGE):** `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`
  — tutti i collaudi (#1-#4 + verifiche 1°/2° giro), le ratifiche e le abrogazioni.
- **Decisioni wave H:** `docs/design/decisions/2026-07-25-wave-h-scelte.md` (cassetta B +
  nome completo · riordino aggancio-al-dito · piede C2 POI ABROGATA → statico · fascia C).
- Su **main** non pushati: `8b8dd40`+`2b069f0` (rm-guard) — col prossimo deploy.

## Stato: TUTTO il codice della wave chiuso con review a due stadi

| Fronte | Esito | Commit chiave |
|---|---|---|
| H1 suoni primo tocco | ✅ device-ok + H1d WebKit (restart al running) | 6823daa · 761c2cc |
| Primo-gesto=drag muto | ✅ LIMITE PIATTAFORMA accettato da Francesco, documentato nel ramo 4b di sound.ts | — |
| H4a linguetta F2/T2 | ✅ device-ok | 29c38b0 |
| H2 cassetta B + nome completo | ✅ device-ok | 11b86eb+21a0b17 |
| H2b fascia variante C + hardening iOS | ✅ device-ok (contrasti AA misurati) | 7a221b0 |
| H3 riordino aggancio-al-dito | ✅ device-ok | c0b260d |
| Cassette «rotte» iPad | ✅ RISOLTO (width fascia — indagine su Safari macOS reale) | 1303d1f |
| Sfumatura discendenti | ✅ fix chiuso (clip-path breathing + is-troncato PRE-PAINT) — da vedere su device | 20015ba+800dd45 |
| Piede | ✅ C2 ABROGATA → STATICO dentro il pannello home (−71 test coreografia) — da vedere su device | d232808 |

## Prossimi passi, in ordine

1. **🛑 Verifica finale Francesco su build 800dd45** (:3020): (a) piede statico — swipe
   secco, niente animazioni, niente fascia panna, ritorno con piede fermo; feel del gesto;
   (b) sfumatura discendenti sparita (medici E pazienti, anche su nomi con g/p/q/y);
   (c) per scrupolo: primo tap su telefono E iPad (il path Chromium è cambiato con H1d —
   gate del reviewer). Esiti → APPEND al verbale.
2. **Chiudere 🛑 T15** (QA device iterativo) se il punto 1 è pulito.
3. **T16 — striscia:** valori già ratificati, brief nel piano
   `docs/superpowers/plans/2026-07-23-redesign-parete-home.md` (+ demo animazioni
   `docs/design/mockups/2026-07-24-striscia-animazioni.html` ratificata).
4. **T17 — chiusura ondata:** rimozione overlay diagnostico `?diag=suoni` + canale
   `sound-diag.ts` (commit dedicato, pattern `9416d25`) · FASE 7 reale (tsc+vitest+build,
   output) · FASE 8 review WHOLE-BRANCH con la **LISTA MINOR dal ledger** (cerca «Minor
   (per review finale)» in progress.md — sono 29 voci, contate) · allineamento spec DS
   v3 §9 (7 suoni + semantica enqueue/restart) e §piede (statico) · FASE 9 Playwright
   390/768/1280 × 2 temi · FASE 9b GATE ESTETICO L2 · 🛑 **merge SOLO a parola di
   Francesco** · FASE 11 BP-1 pieno (MEMORY (41) + ROADMAP (14)).

## Parcheggiati / deferiti (NON toccare senza Francesco)

- **Parete centrata su tablet/desktop** — richiesta VERA di Francesco (verbale Add.3):
  «a me serve solo che venga centrato nella visualizzazione tablet e desktop, punto».
  NIENTE redesign del filo. I mockup rete (105c6ba/f1236d5) sono ARCHIVIATI, non ratificati.
- **Priorità paziente/clinico nella fascia** — deferita («per i nomi lasciamo così per adesso»).
  Proposta pronta se la riapre: paziente sempre 2 righe, clinico 1 + sfumatura.
- **Drag scattoso iPad** → filone «iOS fluidità» in ROADMAP (root cause misurata: FLIP
  `layout="position"` = 169 recalc/24.9ms vs 0.6ms compositor — preesistente alla wave).

## Vincoli tecnici accumulati (non ripetere gli errori)

- Tutti quelli dell'handoff wave H (jsdom non fa layout → harness reale; `.ds-parete` mai
  overflow:hidden; pattern muro `--passo-maglia`; sheet history `uaSheet`; refresh gated) PIÙ:
- **Il checkout PADRE è a main:** ogni grep/misura/lettura va fatta NEL WORKTREE (un'indagine
  è stata ritrattata per questo). Prima azione di ogni subagent: verificare branch/HEAD.
- **Playwright-WebKit ≠ Safari reale:** i bug di paint WebKit si riproducono con Safari
  macOS (harness `cliclick`+`screencapture -l`; `safaridriver` richiede Allow Remote
  Automation). Pattern in `.superpowers/sdd/h6-indagine-safari-report.md`.
- **Misure, non ipotesi:** le tre indagini vincenti (H5/H6/H7) hanno chiuso solo con
  pixel-diff/misure reali a DPR frazionari; i fix «a tavolino» sono stati bocciati dal device.
- **is-troncato si misura PRE-PAINT** (useIsomorphicLayoutEffect) — non tornare a useEffect.
- La fascia ha `width:calc(100% - 8px)` per Safari — non rimuoverla «perché su Chrome non serve».
