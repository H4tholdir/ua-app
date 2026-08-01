# Sessione attiva — il contratto ai dentisti: premessa caduta, documento riscritto, piano non eseguito

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-dpa-handoff.md`** — leggilo per intero.
📄 Sotto di lui: il referto del panel `docs/roadmap/2026-08-03-panel-dpa-referto.md`, la spec
`docs/superpowers/specs/2026-08-03-dpa-registro-emissioni-design.md` e il piano
`docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` (9 task, da eseguire con R-E1).

🔴 **La sua §0 va per prima, e sono sei cose.** ① **Del piano scritto oggi non esiste una riga di codice**:
il registro e la migration **non esistono** (`grep` → 0). Il Task 1 si **ferma** sulla migration da applicare:
il CI non le applica, e `supabase db push` da questa macchina è **non verificato**. ② **Una frase FALSA è viva
in produzione**: `src/app/(app)/clienti/[id]/page.tsx:276` promette la conservazione decennale del contratto —
falsa dopo D126. ③ Il **panel su D128** (Art. 28(9) letto alla fonte) non è stato fatto: blocca l'ondata 2, non
la 1. ④ Le citazioni emendate da D125 restano in **cinque documenti**, per scelta — ma **uno è una SPEC**, non
un handoff. ⑤ Restano **D42**, **§6-bis**, **AUD-1/3/4/5** e il **round 2** (120 decisioni non provate).
⑥ Non verificabili da qui: migrazioni sul database vero e collaudi nel browser.

✅ **Chiuso oggi:** la **premessa è caduta** (la foto non si cancella dopo la consegna: `route.ts:200-205`) ·
**D126** il testo del contratto riscritto e **provato in produzione, 18 su 18** · **D125** emendata una
ratifica sul testo consolidato letto · il contenitore `documenti` è **privato** (nessuna esposizione) ·
**D127-D131** con spec e piano.

📌 **Riferimento misurato a chiusura:** `tsc` **0** · `vitest` **371 | 3** file e **4292 | 19** prove ·
`next build` **0** · `uachelab.com` → **307 verso `/login`, che dà 200**.

🚀 `main` = **`665b26e8`**, albero pulito, **2 commit da pubblicare** (spec e piano, soli documenti).
📎 Verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`: **centotrentuno** decisioni in
**quarantatré** tornate; la prossima è **D132**.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**.
