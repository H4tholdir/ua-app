# Handoff sessione — B7 chiuso, prossima sessione: B8 → B9 → S4 (03/07/2026)

**B7 completato, mergiato e deployato in questa sessione.** Nessun worktree residuo da riprendere — tutto pulito su `main` (commit `1eb6a03`, pushato su `origin/main`). Dettaglio completo: `memory/MEMORY.md` §0 (voce "✅ B7 RISOLTO").

**Nessuna azione di follow-up obbligatoria su B7** prima di procedere. Backlog non bloccante aperto (facoltativo, vedi MEMORY.md per dettaglio): vincolo UNIQUE mancante su `inviti(laboratorio_id,email)`, test di regressione persistente per l'idempotenza di `accept_invite_atomic`, flusso e2e con email reale non ancora testato da Francesco.

---

## Prossima sessione — ordine di priorità (da `docs/roadmap/ROADMAP-UFFICIALE.md`)

```
Leggi docs/roadmap/BACKLOG-TECNICO-2026-07-02.md sezione BLOCKER (B8, B9).
Priorità in ordine:
1. B8 — 5 route CRUD che portano a 404
2. B9 — Lista pazienti non navigabile (fix da 15-30 min, quasi banale)
Poi procedere con S4 (Email template branding, bozza già pronta in docs/email-templates-supabase.md).
```

### B8 — 5 route CRUD portano a pagine 404
Link che puntano a pagine mai create (i POST API sottostanti funzionano già per almeno 2 di questi):
| Link | Destinazione mancante |
|---|---|
| `magazzino/page.tsx:71` CTA "aggiungi articolo" | `/magazzino/nuovo` |
| `listino/page.tsx:51` "Nuova voce" | `/listino/nuovo` |
| `qualita/rischi/page.tsx:175` "Modifica →" | `/qualita/rischi/[id]` |
| `rete/page.tsx:149` "Crea rete" | `/rete/nuova` |
| `rete/page.tsx:277` "Gestisci rete →" | `/rete/[id]` |

**Fix suggerito:** creare le pagine mancanti, oppure sostituire i link con modal/sheet coerenti col pattern già usato altrove (es. `ListinoEditSheet`) — verificare caso per caso quale pattern è più coerente con la pagina genitore. `POST /api/magazzino` e `POST /api/listino` funzionano già, manca solo la UI.
**Effort stimato:** 1-3h per route, 5 route indipendenti — buon candidato per un piano con task paralleli o sequenziali via `superpowers:subagent-driven-development`.

### B9 — Lista pazienti non navigabile (BUG #13, noto da settimane)
**Causa:** `src/components/features/pazienti/PazientiSearchList.tsx:164-219` — ogni riga è un `<li><div>` senza `Link`/`href`/`onClick`, a differenza di `ClientiSearchList.tsx` che usa correttamente `<Link>`. `pazienti/[id]/page.tsx` esiste e funziona (R/U/D), ma zero occorrenze di `pazienti/${` in tutto `src/`.
**Fix:** aggiungere `<Link href={\`/pazienti/${p.id}\`}>` in `PazientiSearchList.tsx`.
**Effort:** basso, 15-30 minuti — verosimilmente non serve un piano formale, solo TDD rapido o fix diretto con verifica.

### S4 — Email template branding (dopo B8/B9)
Bozza HTML già pronta in `docs/email-templates-supabase.md`, manca solo applicazione manuale su Supabase dashboard. ~3h, non richiede piano di sviluppo.

---

## Stato backlog complessivo
🔴 Blocker: 3/16 risolti (B1 ✅, B2 ✅, B7 ✅) — B8, B9 e altri 11 ancora aperti (vedi `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`).
🟠 Alto: 1/18 (A4 ✅).
🟡 Medio: 0/30.
🟢 Basso: 2/4.

**Nota:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` è uno snapshot di audit congelato — non più la fonte di verità corrente per lo stato (quello è `memory/MEMORY.md` §0), ma resta valido per la lista di problemi/causa/fix non ancora risolti.
