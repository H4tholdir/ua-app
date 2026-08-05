# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md`, da T1.**
(L'handoff `docs/roadmap/2026-08-05-caricamento-handoff.md` resta valido **tolta la sua §0②**, che
è fatta.)

**Fatto oggi (D238, commit `f5f80b8e`):** i due difetti vivi del caricamento sono chiusi. Il formato
passa da **WebP a JPEG** — su Safari/iPhone il WebP non veniva prodotto affatto e tornava un PNG in
silenzio, e la libreria tagliava risoluzione — e ora si **controlla che tipo è tornato**.
`TabImmagini` ha il **controllo di peso**, messo **dopo** la compressione (a monte rifiuterebbe le
foto da 6MB che oggi passano). La frase d'errore ora **si legge**: prima era un triangolino muto.
**D239:** il §4 del piano dava per aperte D236 e D237, già decise — allineato.

📌 **Misurato** (`npm run verify:full`): tsc 0 · eslint 0 · vitest **4888 passate | 19 saltate**
(412 file) · build ok · sei guardie verdi.
⚠️ **La prova che manca:** il comportamento su un **iPhone vero**.

⛔ **Non pubblicato:** il ramo `fix-limite-caricamento` esce **con** la soluzione (D235).

➡️ **Prima cosa: T1**, dopo le due condizioni non negoziabili del §2 del piano (C1 il percorso lo
ricalcola il server; C2 la conferma prova che il file c'è).

📎 **239 decisioni in 89 tornate; la prossima è D240.**
