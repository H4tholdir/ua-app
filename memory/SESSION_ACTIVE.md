# Sessione attiva — UÀ

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-08-05-caricamento-diretto-storage.md`, da T2.**
(L'handoff `docs/roadmap/2026-08-05-caricamento-handoff.md` resta valido **tolta la sua §0②**, che
è fatta.)

✅ **T1 FATTO** (commit `63911666`): il percorso è
`<laboratorio_id>/lavori/<lavoro_id>/<uuid>.<ext>`, il laboratorio viene dalla **sessione** e
`Date.now()` è uscito (R23). **I 5 file esistenti sono stati spostati e verificati**: stessi cinque
pesi prima e dopo, `lavori/` vuota, l'orfano tolto dopo averne scaricato una copia.
🔎 **Riferito (R-E2):** il censimento del piano diceva «nessuno interpreta `storage_path`», ma il
suo grep non elencava `endsWith` — e un lettore c'è (`TabImmagini.tsx:124`). Non ha morso.

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

➡️ **Prima cosa: T2** — la policy dello storage deve **negare**, non andare in errore, su un
percorso con prima cartella non-uuid. 🛑 Le 4 policy **non sono** in `supabase/migrations/`: sono
nate da pannello, quindi l'irrobustimento si scrive **come migration** o vivrà solo lì. La prova
richiesta è **un valore che DEVE essere rifiutato** (percorso non-uuid → NEGATO, non ERRORE).
Poi T3, con le due condizioni non negoziabili del §2 (C1 il percorso lo ricalcola il server; C2 la
conferma prova che il file c'è).

📎 **239 decisioni in 89 tornate; la prossima è D240.**
