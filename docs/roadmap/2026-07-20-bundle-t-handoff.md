# Handoff — Sessione Bundle T (poi E, poi mini-triage design)
**Data:** 20 luglio 2026 · **Da eseguire in sessione NUOVA a contesto pulito** (decisione Francesco)

## Contesto (30 secondi)

Sequenza (1) «resto dei problemi»: censimento §A/§O completato e **ratificato integralmente** da Francesco (tabella + riserve advisor: `docs/roadmap/2026-07-20-censimento-a-o.md`, sezione «RATIFICA»). **Bundle Q deployato in prod** il 20/07 (main `04cf00b`, 11 quick-win — MEMORY.md voce 11). In coda di sessione chiusi anche: bug push «prova rientrata» (`notificaProvaRientrata` in prove/route.ts) e cron perf-budget → login multi-run+mediana+warn-mode (opzione (c) ratificata; validato sul runner US: mediana 1041ms). Tutto su main ≥ `699c8b1`.

## Obiettivo di questa sessione (ordine certificato, delegato dalla ratifica)

1. **Bundle T — tecnico** (worktree, TDD, FASE 7, review, deploy):
   - **O1b** helper unico «oggi» Europe/Rome (PRIMA di O1a — riserva advisor): oggi `oggiISO()` in `src/lib/dashboard/queries.ts:26` è UTC (00:00-02:00 Roma = giorno sbagliato); `adessoRoma()`+`GIORNI`/`MESI`/`saluto()` duplicati verbatim fra `(app)/dashboard/page.tsx:14-20` e `admin/labs/[id]/live/page.tsx:15-21`. Test di confine espliciti: 23:59 UTC, 00:30 Roma, DST marzo/ottobre. Verificare che DdC/fatture NON condividano l'helper UTC (rischio data documento — riserva appsec).
   - **O1a** debito test rami prose pile/striscia (in `src/lib/dashboard/pile-home-shared.ts`: pillFase 0-branch riga ~110, subAmbra inCima ~136, subBlu ≥3 ~156, subViola fallback ~148) — DOPO O1b, mai in parallelo.
   - **O4a** ClienteComboBox → `GET /api/clienti` (oggi `getBrowserClient`+ilike, bypassa il choke-point N13): PRIMA dello swap verificare parità funzionale (ricerca/ordinamento/shape) della API. Componente vivo in TabDati + ModificaRigaSheet.
   - **A18** hash SHA-256 del file firma DdC (`generate-ddc.ts:83` `firma_ddc_sha256: null`; il pattern hash esiste già per il PDF a riga ~96-123). **⚠ decisione Francesco a inizio task:** backfill retroattivo sui DdC storici o cut-off documentato (1 riga di decisione).
   - **Fix commento falso** `src/lib/domain/tipi-lavoro.ts:12-13` (dice «10 valori = CHECK a DB», ma nessuna CHECK a DB contiene `bite_splint` — drift O4b a tre vie, la migration resta deferita).
   - **Candidati da assorbire se il bundle regge** (follow-up tracciati, tutti piccoli): timeout su `webpush.sendNotification` centralizzato in `src/lib/notifications/trigger.ts` (ora 3 call-site lo attendono nel request-path) · commento esplicativo su `getSegnaleStriscia` (non emette sTecAccount/sTitTecnici) · A6-bis regex script check-ds (`color:.*var(--c-amber\b` escludendo `-ink`) + sweep ~25 file `--c-amber`-come-testo · coverage rami scadenza/annullato di AnnullaConsegnaBanner. Non forzarli: se allargano troppo, restano in backlog.
2. **Bundle E** — A16: `GET /api/lavori/export` + `GET /api/tecnici/cedolini-batch` sul pattern di `fatture/export/route.ts`; riserva advisor: escaping anti CSV-injection (`=`,`+`,`@` a inizio cella) + test scoping tenant.
3. **Mini-triage design** — preparare mockup (regola 0B, `docs/design/mockups/`, PIÙ VARIANTI light+dark) per: A13 ponte minimo verso l'odontogramma · A14 cassetta in card (conflitto DS v3 §5.8 «4 righe» — decisione di sistema) · O1h back PilaAperta · O1i (voce «Esci» in Tutto-il-resto §7.16, riga identità footer NavDesk, segnale trial StrisciaStato). Presentarli a Francesco in UN unico giro + fargli confermare i deferral A10/A11.

## Decisioni Francesco da raccogliere in sessione

- **A18 backfill** (vedi sopra — blocca solo quel task).
- **Email Resend per A8** (fallback per lab senza push; l'advisor UX raccomandava di deciderla presto — opzionale ma da non lasciar morire).

## Promemoria calendarizzati

- **Ricalibrazione perf-budget** tra ~7-14 giorni dal 20/07: soglia login = mediana storica dei run multi-run + 15-20% (probabile ~1200-1500), poi rimuovere `PERF_BUDGET_LOGIN_MODE=warn` dal workflow. Baseline nei log del cron («login→dashboard (giro N)»).
- Dopo la chiusura §A/§O: **sessione DB dedicata A20 + O4b** (opzione (a) created_by/updated_by ratificata dal panel; migration CHECK listino). Poi sequenza (2) «funzioni attive».

## Pulizia ambiente (se non già fatta)

Worktree `.claude/worktrees/bundle-q` + branch `worktree-bundle-q-quick-wins` mergiati e rimovibili (dentro `.superpowers/sdd/` ci sono i report per-task gitignored — chiedere a Francesco se conservarli prima di rimuovere). Config `bundle-q-dev` nel launch.json di root e `scripts/tmp/` = residui innocui.

## Regole di ingaggio (invariate)

CLAUDE.md §0C (12 fasi + Regola Advisor) · guard N13: ogni nuova route chiama `assertLabOperativo`, i mock context includono `lab` · UI: mockup + varianti + approvazione Francesco PRIMA del React (0B) · lab E2E `00000000-…-0001` per QA, MAI lab Filippo · MAI committare/pushare senza richiesta esplicita (la ratifica del 20/07 copre l'esecuzione dei bundle T/E col loro deploy) · BP-0/BP-1 obbligatori · 3 viewport + light/dark per ogni UI.

## Residui fuori scope (solo da tenere d'occhio)

N1 (firma DdC → audit multi-agente), N2 (deprecazione `in_ritardo` → migration post-sp.3), N3 (race inviti → gate pre-utenti-reali), hydration mismatch layout portale (`<html>/<body>` annidati — pre-esistente, scoperto in QA 20/07), A15/O2/A19/O4c/O3 = deferral calendarizzati.
