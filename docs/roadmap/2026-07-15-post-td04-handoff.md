# Handoff post-TD04 — 15/07/2026

**Stato:** Nota di Credito TD04 **mergiata e deployata** (`main` `d0d83c8` --no-ff, BP-1 `9dcaa3f`; CI+CD verdi, smoke uachelab.com OK). 1749 test pass, albero pulito, un solo worktree (principale), branch feature eliminata. **Nessun Blocker aperto.** Dettagli completi: `memory/MEMORY.md` (entry 15/07) e spec `docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md`.

## Menu per la prossima sessione (scelta di Francesco)

### A. N10 — Invio TD04 → SdI (consigliato, completa la feature fiscalmente)
Il TD04 oggi si ferma a `stato_sdi='generata'`: la route `POST /api/fatture/[id]/xml` gatea su `draft` (N7) e richiede lavori → 409/422 per un TD04 (`lavoro_id` NULL). Gli effetti dello storno sono già attivi all'emissione.
**Direzione:** endpoint/opzione che re-invii l'XML **già congelato** senza rigenerarlo né consumare progressivi — da **accorpare con N9** (PEC-resend per invii falliti, stesso meccanismo). Dominio FatturaPA → percorso GRANDE (BP-2). Backlog: `BACKLOG-TECNICO-2026-07-02.md` §N9+N10.

### B. Superficie «riconciliazioni pendenti» + audit rifiuto TD04 (riserve advisor 2/3)
Due stati-limite oggi silenziosi: saldo credito negativo (rifiuto TD04 dopo credito già speso) e collisione (lavoro ri-fatturato nella finestra SdI → originale resta stornata). Serve: alert esplicito su saldo negativo (oggi numero grigio, sezione azioni nascosta con `disponibile ≤ 0`), lista fatture `stornata_at NOT NULL` con TD04 collegato `rifiutata`, e valutare contro-movimento + riga di audit al posto del DELETE nel trigger. Ha UI → workflow §0B (mockup → approvazione).

### C. Follow-up minori TD04 (batch tecnico, no UI)
Asimmetria `scaduta` gate-storno/revenue · bollo per-lab config vs hardcoded nell'XML (3 punti duplicati, flag commercialista) · guard `p_causale` NULL + `deleted_at` nelle RPC · normalizzazione `.toUpperCase()` provincia + troncamento Indirizzo TD01 · test scadenzario · coverage trigger (cross-tenant, non-TD04). Tutti dormienti/minori — un'unica sessione piccola-media.

### D. Altro dalla roadmap (sequenza DS v3 «Il cuore», ecc.)
Vedi `docs/roadmap/ROADMAP-UFFICIALE.md`.

## Note operative per chi esegue
- BP-0 obbligatorio: `memory/MEMORY.md` + questo handoff.
- Worktree per qualsiasi implementazione; QA solo lab E2E `00000000-0000-0000-0000-000000000001`.
- Le 6 migration TD04 sono già applicate al DB live; migration future SOLO additive.
- Il lab E2E ha consumato i progressivi fattura 2026-0001..0005 (QA FASE 9, fixture ripulite).
