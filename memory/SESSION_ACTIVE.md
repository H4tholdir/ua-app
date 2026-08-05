# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-05-caricamento-handoff.md`** — la §0 per prima.

**§0 in una frase:** la sessione ③ è **in produzione** (CI+CD verdi), ma il check post-deploy ha
trovato un difetto vivo — il limite di caricamento diceva 20 MB contro i **~4,2 MB veri** — e da lì
è nato un cantiere: **il piano del caricamento diretto è scritto (T1-T7) e NON eseguito**, e restano
**due difetti vivi in produzione** (comprimiamo in WebP, che per specifica non può avere il colore
pieno e su iPhone non viene nemmeno prodotto; `TabImmagini` non ha alcun controllo di peso).

**Stato:** ramo `fix-limite-caricamento`, **8 commit non su `main`** · `main` pubblicato e allineato
a `origin/main` · il fix del limite **non si pubblica da solo** (D235: va in produzione con la
soluzione).

📌 **Misurato in chiusura** (`npm run verify:full`): tsc 0 · eslint 0 · vitest **4868 passate | 19
saltate** (411 file) · build ok · sei guardie verdi.

➡️ **Prima cosa:** i due difetti vivi della §0②, poi T1 del piano
`docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md`.

📎 **237 decisioni in 88 tornate; la prossima è D238.**
