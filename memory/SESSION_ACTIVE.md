# Sessione attiva — ondata (b): l'ultimo bloccante di T6 è sciolto (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-fondamenta-handoff.md`**, poi il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md` (§6 T6, **riscritto oggi**).
**Ledger: `.superpowers/sdd/progress.md` — i task completi lì SONO completi.**

**Ramo `ondata-b-schermate`** (mai un worktree). **Niente pubblicato su `origin`.**
✅ **Sei task chiusi e revisionati: T1 · T4 · T2 · T3 · T5 · T7.** FASE 7 sul ramo verde
(`tsc` 0 · `vitest` 3754/19 · `next build` exit 0). Baseline DB **294 · 0 · 916 · 48**, solo letture.

🆕 **D46 · D47 · D48** (panel di 3 advisor, fatti-perno riverificati di persona):
**D46** una **forma sola** di risposta su entrambi i percorsi (`id, codice_paziente, alias, ultimoLavoro`),
`cliente_id` obbligatorio con `q`, ramo su **`q !== null`** (mai `if (q)`), **400** non 422 ·
**D47 emenda D44**: `nome_cognome` **rientra** nel filtro, quattro colonne ·
**D48** l'escape ha **quattro** metacaratteri (`*` si **rimuove**) + **guardia sul vuoto**, `pgrestQuote` ultimo.

🔴 **Fuori perimetro, ALTA, decisione di Francesco:** `GET /api/clienti` manda al browser il
**`portale_token`** di ogni dentista — apre DdC e buono di lavorazione **senza PIN** (roadmap **TOK-1**).

➡️ **Prossimo passo: scrivere il brief di T6** e affidarlo a un esecutore fresco (R-E1). Poi T8.
