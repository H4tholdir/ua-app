### Task 1: A5 — theme_color PWA

**Files:**
- Modify: `public/manifest.json:7-8`
- Modify: `public/offline.html:6` (+ CSS body)

Asset statici: niente unit test (nessun runtime da testare); la verifica è grep + build nel task finale.

- [ ] **Step 1:** in `manifest.json`: `"background_color": "#DDD8D3"` (bg light da `src/design-system/tokens.ts:8`), `"theme_color": "#D90012"`.
- [ ] **Step 2:** in `offline.html`: `<meta name="theme-color" content="#D90012">`; nel CSS: `body { background: #DDD8D3; color: #1C1916; ... }`, `p { color: #4A3D33; ... }`, `.retry { background: #D90012; color: #FFFFFF; ... }` (via il gold su blu, fuori palette).
- [ ] **Step 3:** verifica: `grep -rn "0F1E52\|D4A843" public/manifest.json public/offline.html` → atteso: nessun match.
- [ ] **Step 4:** commit `fix(pwa): theme_color e splash allineati al brand (#D90012 / panna) — A5`

