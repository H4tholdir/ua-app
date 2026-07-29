# Sessione attiva — ondata (b): T6 scritto, corretto e in ri-revisione (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-fondamenta-handoff.md`**, poi il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md` (§6 T6 **riscritto oggi**, dieci punti).
**Ledger: `.superpowers/sdd/progress.md` — i task completi lì SONO completi.**

**Ramo `ondata-b-schermate`** (mai un worktree). **Niente pubblicato su `origin`.**
✅ **Sette task: T1 · T4 · T2 · T3 · T5 · T7 · T6** (T6 in ri-revisione sul solo commit di correzione).
**FASE 7 rieseguita da me:** `tsc` 0 · `vitest` **3806**/19 · `next build` exit 0. DB **294 · 0 · 916 · 48**.

🆕 **D46-D50** (panel di 3 advisor + 2 revisioni): forma **unica** della risposta · `nome_cognome`
**rientra** nel filtro (emenda D44) · escape a **quattro** metacaratteri + guardia sul vuoto ·
`?q=` vuoto → elenco vuoto · tetto 64 che **non tronca**.

🔑 **La regola nata oggi, e vale oltre T6:** una guardia sulla proiezione si scrive con
un'**uguaglianza sulla stringa esatta**, mai con un elenco di ciò che non deve esserci — un elenco di
divieti non vede il jolly che li aggira tutti (`select('*')` lasciava **104 prove su 104** verdi).

🔴 **In attesa di Francesco, ALTA:** `GET /api/clienti` manda al browser il **`portale_token`** di ogni
dentista — apre DdC e buono di lavorazione **senza PIN** (roadmap **TOK-1**).

➡️ **Poi: T8** (`DELETE` immagine soft + **otto letture**).
