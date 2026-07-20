### Task 4: A9 — copy successo richiesta

**Files:**
- Modify: `src/components/features/portale/RichiestaClientForm.tsx:207,214`
- Test: aggiornare l'eventuale test esistente del form (cercare in `tests/unit/`); altrimenti aggiungere assert sul testo in `tests/unit/richiesta-client-form-copy.test.tsx`.

- [ ] **Step 1 (RED):** assert: la schermata successo contiene «la esaminerà e ti contatterà per la conferma» e NON contiene «ha ricevuto la tua richiesta».
- [ ] **Step 2 (GREEN):** riga 207-208: `Il laboratorio <strong>{labNome}</strong> la esaminerà e ti contatterà per la conferma.`; rimuovere il `<p>` a riga ~214 («Ti contatteranno per la conferma.») spostando il suo margine sul paragrafo precedente (`margin: '0 0 32px'`).
- [ ] **Step 3:** run → PASS · commit `fix(portale): copy successo richiesta senza contraddizione — A9`

