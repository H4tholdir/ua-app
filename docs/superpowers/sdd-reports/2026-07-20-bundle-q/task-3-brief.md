### Task 3: A3 — guard prefill passkey

**Files:**
- Modify: `src/app/(auth)/login/login-form.tsx:~193` (blocco `savedEmail`)
- Test: `tests/unit/login-passkey-prefill.test.tsx` (nuovo)

- [ ] **Step 1 (RED):** test che monta `LoginForm` con `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable` mockata come promise controllabile e `localStorage.ua_passkey_email = 'salvata@lab.it'`; l'utente digita `mia@lab.it` nel campo email PRIMA di risolvere la promise; poi si risolve con `true`; atteso: il campo vale ancora `mia@lab.it`. Secondo caso: campo vuoto → dopo resolve vale `salvata@lab.it` e il flusso bio resta abilitato.
- [ ] **Step 2:** run → FAIL (il primo caso trova `salvata@lab.it`).
- [ ] **Step 3 (GREEN):**
```tsx
const savedEmail = localStorage.getItem(PASSKEY_EMAIL_KEY)
if (savedEmail) {
  // Non sovrascrivere un'email già digitata (race mount→promise, device condivisi — A3)
  setEmail(prev => (prev === '' ? savedEmail : prev))
  setHasSavedPasskey(true)
}
```
- [ ] **Step 4:** run → PASS. Verificare che i test N14 esistenti su login restino verdi (`npx vitest run tests/unit/ -t login` o file dedicati).
- [ ] **Step 5:** commit `fix(auth): il prefill passkey non sovrascrive l'email digitata — A3`

