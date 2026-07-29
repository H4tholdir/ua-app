# Sessione attiva — ondata (b): T6 chiuso, tocca a T8 (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-blocco3-handoff.md`** (sostituisce quello
«fondamenta», rimasto vero sui fatti e falso su «sei task» e «si riparte da T6»), poi il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md` (§6 T6 **riscritto oggi**, dieci punti).
**Ledger: `.superpowers/sdd/progress.md` — i task completi lì SONO completi.**

**Ramo `ondata-b-schermate`** (mai un worktree). **Niente pubblicato su `origin`.**
✅ **Sette task chiusi e revisionati: T1 · T4 · T2 · T3 · T5 · T7 · T6** (T6: due revisioni + due giri di
correzione, l'ultimo verificato da me perché l'esecutore era caduto senza rapporto).
**FASE 7 (mia):** `tsc` 0 · `next build` 0 · `vitest` **3806**/19 — ⚠️ verde in **5 esecuzioni intere su 8**, e
🔑 **la vittima RUOTA**: `PassoTipo.test.tsx:165` (23,6 s), `lavoro-form-messaggio-errore.test.tsx` (8,9 s),
una non attribuita. Sempre **un solo test**, sempre con durata anomala, sempre in file **mai toccati sul
ramo** e verdi in isolamento 3 giri su 3 — è il flake già diagnosticato
(`.superpowers/sdd/diagnosi-flake-vitest.md:235`). **Non è una regressione.** DB **294 · 0 · 916 · 48**.

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

➡️ **Prossimo: T8, NON iniziato** (`DELETE` immagine soft + **otto letture**). Il suo brief va scritto
con lo stesso trattamento di quello di T6.
