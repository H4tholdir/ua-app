# Handoff — Mini-triage design, poi A8 email, poi sessione DB
**Data:** 20 luglio 2026 (tarda sera) · **Da eseguire in sessione NUOVA a contesto pulito** (decisione Francesco)

## Contesto (30 secondi)

Sessione 20/07 sera chiusa con TRE blocchi completati e in produzione (CI+CD verdi, smoke OK):
- **Ledger migration riconciliato** (76/76 registrate) → **`db push` di nuovo utilizzabile**; regola: o `db push` o registrazione contestuale nel ledger, MAI DDL manuale senza INSERT.
- **Bundle E / A16** (merge `da8e436`): `GET /api/lavori/export` (esente N13 portabilità + blocco blacklist) + `GET /api/tecnici/cedolini-batch` (guarded, RBAC titolare/admin_rete) + helper `src/lib/utils/{csv,paginate,mese}.ts` + retrofit `fatture/export`. **Nessuna UI**: i bottoni download vanno disegnati ora (Punto 1).
- **P2-d1** (merge `cc29822`): draft di anno precedente emesso → la bozza DIVENTA la fattura dell'anno corrente (rinumerazione + traccia in `fatture.note`). Punto 2 del handoff precedente CHIUSO.

Stato: MEMORY voci (14)-(16) · ROADMAP voci (4)-(5) · spec/piani in `docs/superpowers/{specs,plans}/2026-07-20-*` · report SDD in `docs/superpowers/sdd-reports/2026-07-20-{bundle-e,p2-nye}/`.

---

## Punto 1 — Mini-triage design (regola 0B: mockup PRIMA del React, UN unico giro)

Preparare i mockup HTML in `docs/design/mockups/` (MAI /tmp), **PIÙ VARIANTI light+dark** per superficie, screenshot Playwright in `docs/design/mockups/screenshots/`, e presentarli a Francesco in **UN solo giro di approvazione**. Poi (dopo l'ok) implementare. Superfici:

1. **A13 — ponte minimo odontogramma**: oggi raggiungibile SOLO da `/lavori/[id]/modifica` legacy; il wizard v3 non lo include. Ponte = link/accesso, il redesign resta per l'ondata futura.
2. **A14 — numero cassetta in card lavoro**: `numero_cassetta` è a DB; conflitto con DS v3 §5.8 («4 righe» per card) — è una decisione di sistema, serve la variante che mostra il trade-off.
3. **O1h — back di PilaAperta**: `PilaAperta.tsx:75` ha hardcoded `/dashboard`.
4. **O1i — profilo v3 ×3**: voce «Esci» (spec v3 §7.16) · riga identità nel footer NavDesk · segnale trial in StrisciaStato.
5. **NUOVO — bottoni download export (da Bundle E)**: punto di download per `GET /api/lavori/export` (pagina `/lavori` = superficie **v3**: token/componenti `src/components/ds/`, wrapper `[data-ds="v3"]`) e per `GET /api/tecnici/cedolini-batch` (pagina `/tecnici` = superficie **v2.3**: pattern del bottone export esistente in `fatture/page.tsx:191`). NB il link fatture usa `new Date().getFullYear()` client-side → nei nuovi punti usare l'anno/mese di Roma o lasciare il default della route (che è già `annoRoma()`).
6. **Da far confermare in coda al giro**: deferral A10 (CTA «+» allo scroll, solo v2.3) e A11 («MDR Allegato XIII» esposto) → ondate delle rispettive superfici.

Riferimenti: censimento `docs/roadmap/2026-07-20-censimento-a-o.md` (§A tabella) · DS v3 spec `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` · regola di convivenza §14 (migrazione per route, MAI per componente).

## Punto 2 — A8: fallback email Resend (ratificata da Francesco il 20/07, riga in ROADMAP tabella V1.9)

Se l'utente non ha push attive, la notifica arriva via email. Provider Resend; pattern riusabile in `send-invito-email.ts`. Effort stimato 4-6h. Percorso Media §0C (brainstorm → gate FASE 3 → piano → worktree → TDD → review → deploy).

## Punto 3 — Sessione DB dedicata (breve, dominio critico → percorso Grande)

Ora sbloccata dal ledger riconciliato. Tre voci nella stessa sessione:
1. **A20** — audit actor_id NULL: opzione (a) ratificata = colonne `created_by`/`updated_by` (pattern cicli). Gap di compliance attivo, non far slittare.
2. **O4b** — drift CHECK `listino.categoria` (a tre vie: listino 9v ≠ lavori 9v ≠ LABEL_MACRO 10v): migration di riallineamento.
3. **NUOVO — RPC `outbox_prepara_draft` orfana**: l'outbox è stata smontata il 10/07 (`20260710150000_ondata0_pulizia_outbox`), ma la migration date-fiscali del 20/07 (`20260720150000`) l'ha ricreata per errore: nessun caller applicativo, referenzia una tabella droppata. Verificare (grep caller + pg_proc) e rimuoverla con migration dedicata.

Per ogni migration: FASE 6b (gen types + tsc) + `db push` O registrazione contestuale nel ledger.

## Calendarizzati (invariati)

- **Ricalibrazione perf-budget** ~27/07-03/08: soglia login = mediana multi-run +15-20%, poi togliere `PERF_BUDGET_LOGIN_MODE=warn`.
- A15 (analytics ricca) e O2 (redesign admin) → sequenza (3) design. A19 (CAD/STL) → V2. O4c → sp.4 fatture. N1/N2/N3 invariati.

## Backlog minore tracciato (non forzare, solo non perdere)

**Nuovi da questa sessione (final review Bundle E + review P2):**
- Validazione parametri unificata: `year` su `fatture/export` non validato (allineare a `/^\d{4}$/` di lavori) + regex `mese` stretta `^\d{4}-(0[1-9]|1[0-2])$` su ENTRAMBE le route cedolino (singola + batch).
- Cedolini: decidere soft-delete (`lavori.deleted_at` non filtrato in singolo né batch) e voci di listino omonime con prezzi diversi (si fondono) — sistemare singolo+batch INSIEME per non divergere.
- Route cedolino singola: default mese ancora UTC (`route.ts:16`) — allineare a `oggiRomaISO()` quando la si tocca.
- Fixture test `getFullYear()` (draft-nye, td04, pdf-cortesia): flake teorico solo a capodanno su CI non-Roma — fake timer fisso se dà noia.
- `csvNumIT` può dare `-0,00` su arrotondamenti negativi→zero (cosmetico, irraggiungibile con dati reali).

**Carry-over dal handoff precedente (invariati):**
- Serie `lavoro`/`ordine` con anno UTC (lavori/route:154, portale/richiedi:114, ordini/route:93) — non fiscali, fix 2 righe con `annoRoma()` quando capita.
- Guard 422 data fattura: aggiungere regex `^\d{4}-\d{2}-\d{2}$` (opzionale).
- TOCTOU hash/PDF firma DdC (fetch unico → buffer sia a hash sia a `<Image>`).
- Param `limit` su `GET /api/clienti` (fino a 500 righe per keystroke del combobox).
- Residui UTC non fiscali: striscia `oggiMezzanotte`, sheet client (NuovoOrdine/RegistraPagamento/RichiestaClientForm), range produttività/cedolino, clienti/[id] cutoff.
- A6-bis: regex check-ds (`color:.*var(--c-amber\b` escludendo `-ink`) + sweep ~25 file.
- Hydration mismatch layout portale (pre-esistente).

## Pulizia ambiente

Nessun worktree residuo (bundle-q/bundle-e/p2-nye rimossi, report archiviati). `scripts/tmp/` contiene ancora gli script QA del 20/07 (`qa-bundle-t*.ts`, perf) — residui innocui.

## Regole di ingaggio (invariate)

CLAUDE.md §0C (12 fasi + Regola Advisor: panel 2-3 advisor per ogni decisione significativa) · guard N13 su ogni nuova route + mock context con `lab` · UI: mockup + PIÙ VARIANTI light+dark + approvazione PRIMA del React (0B) + 3 viewport (390/768/1280) · GATE ESTETICO L2 (FASE 9b) prima del merge di ondate con UI · lab E2E `00000000-…-0001` per QA, MAI lab Filippo · MAI committare/pushare senza richiesta esplicita (per il mini-triage: l'implementazione post-approvazione mockup è coperta dall'ok di Francesco sul giro di design; per A8 e sessione DB chiedere conferma a fine lavoro) · BP-0/BP-1 obbligatori.
