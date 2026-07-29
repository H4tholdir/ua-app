# Sessione attiva — ondata (b): T6 scritto, corretto e in ri-revisione (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-fondamenta-handoff.md`**, poi il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md` (§6 T6 **riscritto oggi**, dieci punti).
**Ledger: `.superpowers/sdd/progress.md` — i task completi lì SONO completi.**

**Ramo `ondata-b-schermate`** (mai un worktree). **Niente pubblicato su `origin`.**
✅ **Sette task chiusi e revisionati: T1 · T4 · T2 · T3 · T5 · T7 · T6** (T6: due revisioni + due giri di
correzione, l'ultimo verificato da me perché l'esecutore era caduto senza rapporto).
**FASE 7 (mia):** `tsc` 0 · `next build` 0 · `vitest` **3806**/19 — ⚠️ verde in **2 esecuzioni su 4**: le due
rosse portano **un solo test**, `PassoTipo.test.tsx:165`, **mai toccato sul ramo**, 14/14 in isolamento e già
nominato nella diagnosi del flake (`.superpowers/sdd/diagnosi-flake-vitest.md:235`). **Non è una regressione.**
DB **294 · 0 · 916 · 48**.

🆕 **D46-D50** (panel di 3 advisor + 2 revisioni): forma **unica** della risposta · `nome_cognome`
**rientra** nel filtro (emenda D44) · escape a **quattro** metacaratteri + guardia sul vuoto ·
`?q=` vuoto → elenco vuoto · tetto 64 che **non tronca**.

🔑 **La regola nata oggi, e vale oltre T6:** una guardia sulla proiezione si scrive con
un'**uguaglianza sulla stringa esatta**, mai con un elenco di ciò che non deve esserci — un elenco di
divieti non vede il jolly che li aggira tutti (`select('*')` lasciava **104 prove su 104** verdi).
🔑 **E la seconda:** non si scrive **quante** istanze di un difetto restano («chiusa alla terza» era falso, ce
n'era una quarta) — si scrive il **metodo** e lo si rilancia. Una dichiarazione di completezza sbagliata
sulla proprietà che si sta correggendo **chiude la caccia**.

🔴 **In attesa di Francesco, ALTA:** `GET /api/clienti` manda al browser il **`portale_token`** di ogni
dentista — apre DdC e buono di lavorazione **senza PIN** (roadmap **TOK-1**).

➡️ **Poi: T8** (`DELETE` immagine soft + **otto letture**).
