### Task 2: A6-res — gold come testo in /qualita

**Files:**
- Modify: `src/app/(app)/qualita/page.tsx:25`

- [ ] **Step 1:** `lieve: 'var(--gold, #D4A843)'` → `lieve: 'var(--c-amber, #B45309)'` (fallback = valore di `--c-amber` in `globals.css`; verificarlo lì e usare quello esatto).
- [ ] **Step 2:** `bash scripts/check-ds-compliance.sh` → atteso: nessuna violazione gold-testo su questo file.
- [ ] **Step 3:** commit `fix(qualita): gravità lieve usa --c-amber, mai --gold come testo — A6`

