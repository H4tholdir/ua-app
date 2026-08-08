# Sessione attiva — 09/08/2026 notte

🚪 **PUNTO DI RIPRESA: far vedere a Francesco le TRE varianti del tema chiaro.** Sezione «D326 —
applicata» in fondo a `docs/design/screenshots/2026-08-09-devo-intervenire/GATE-L2.md`; scatti
`d326-chiaro-c1-filo` (bordo, **3,08:1**) · `c2-ombra` (materia, **1,26:1**, gratis in scuro) ·
`c3-riga-scura` (tinta, separazione **1,23 → 1,43**, **l'unica che chiude anche il ❌3**).

🎨 **⚖️ D326 ① FATTA — tema scuro.** Il filo è un **token**, non una riga nel componente:
`--filo-superficie` (`ds-v3.css:37` chiaro `transparent` · `:82` scuro `var(--line)`), consumato dalle
**cinque** superfici (`DevoIntervenire.tsx:988 · 1352 · 1465 · 1687 · 1734`). Motivo: uno **style inline
batte sempre una regola CSS**. ⚠️ **(b) delimita e basta:** riga↔pannello resta **1,15:1**.

🔴 **Riferito, non corretto:** le superfici `--bg-deep` in quel foglio sono **SEI** — l'undicesima sul
DOM è **il tasto primario spento** (`TastoPrimario.tsx:90`), stesso difetto del ❌1, componente del
design system (R-E2).

📌 `verify:full` → **`VERIFY_EXIT=0`** · **5685 | 68 su 456** · `tsc` 0 · build ok — **identica alla
base**. Banco lasciato com'era (fixture intatta, `eventi_qualita` 0 → 0).

🌿 Ramo `intervento-post-consegna`, `main` intatto a `7427a680`.
