# Sessione attiva — ondata (b): T8 COMPLETO e revisionato, tocca al task del bottone (29/07/2026)

🛑 **PUNTO DI RIPRESA: `.superpowers/sdd/progress.md`** (coda del ledger: T8 completo con revisione severa)
+ `docs/roadmap/2026-07-29-ondata-b-t8-referto.md` (referto dell'esecutore) + il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md` per i task che restano.

**Ramo `ondata-b-schermate`** (mai un worktree). **Niente pubblicato su `origin`.**
✅ **OTTO task chiusi e revisionati: T1 · T4 · T2 · T3 · T5 · T7 · T6 · T8.** DB **294 · 0 · 916 · 48**.

🆕 **T8 (98fa1e43) — eseguito secondo D54** (modello potente sovraccarico → esecutore fresco **leggero** +
revisione **severa** col potente): `DELETE` soft su `deleted_at` con tre `.eq()` sulla mutazione + conteggio
fail-closed + 409 su `consegnato` · fix D52 sul `PATCH` (guardia `deleted_at`, errore mascherato) · filtro
sugli **otto** siti di lettura (grafia P12). **Revisione: APPROVATO** — 12 mutazioni tutte uccise, R-P4
riprodotta (6/28), FASE 7 rieseguita (tsc 0 · vitest 3850 · build con la rotta in tabella). Le prove vuote
attese dal modello leggero **non si sono materializzate**.
🔑 **Difetto vero del brief trovato dall'esecutore:** il nome di rapporto prescritto (`*-report.md`) cadeva
in `.gitignore:77` — rinominato `-t8-referto.md`.
🔴 **Eredità per il task del bottone (2 Important, nessuno di comportamento):** ① la «prova che morde» dei
siti 1/2 andava fatta sul predicato `deleted_at` (chiusa dal revisore con la sonda inversa: figli 0 contro
riferimento 2); ② **race residua nel PATCH** — la guardia filtra `deleted_at` ma l'`update()` no: fra i due
viaggi un DELETE concorrente lascia il PATCH rispondere 200 su un fantasma (impatto basso, ereditata dal
brief che chiedeva solo il fix della guardia).

🔴 **In attesa, ALTA (D53):** TOK-1 + CLI-1 si chiudono a **fine ondata, prima della pubblicazione**.
Il difetto è **vivo in produzione oggi** (`portale_token` nella proiezione su `origin/main`).

➡️ **PROSSIMO: il task UI «Elimina foto»** (D51): bottone con spiegazione visibile fuori finestra +
contatore `TabImmagini.tsx:571` + la race del PATCH qui sopra. **Passa dal §0B** (mockup → screenshot
light+dark → approvazione di Francesco → poi React).
