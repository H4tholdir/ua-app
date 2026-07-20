### Task 6: A12 — a11y ClienteComboBox

**Files:**
- Modify: `src/components/features/clienti/ClienteComboBox.tsx` (props + input)
- Modify: `src/components/features/lavori/form/TabDati.tsx:113-119`
- Modify: `src/components/features/lavori/scheda-v3/ModificaRigaSheet.tsx:~174` (stesso pattern; verificare l'id dell'errore lì)
- Test: `tests/unit/cliente-combobox-a11y.test.tsx` (nuovo)

**Interfaces:** nuova prop opzionale `errorId?: string` su `ClienteComboBoxProps`.

- [ ] **Step 1 (RED):** test: render con `hasError` e `errorId="error-cliente_id"` → l'input ha `aria-invalid="true"` e `aria-describedby="error-cliente_id"`; senza `hasError` → nessuno dei due attributi.
- [ ] **Step 2 (GREEN):** aggiungere a `ClienteComboBoxProps` `errorId?: string`; sull'`<input>`:
```tsx
aria-invalid={hasError || undefined}
aria-describedby={hasError && errorId ? errorId : undefined}
```
- [ ] **Step 3:** in `TabDati.tsx` passare `errorId="error-cliente_id"` (lo span d'errore ha già quell'id, riga 122). In `ModificaRigaSheet.tsx` fare lo stesso con l'id del suo messaggio d'errore (aggiungere l'id allo span se manca).
- [ ] **Step 4:** run → PASS · commit `fix(a11y): aria-invalid/aria-describedby su ClienteComboBox — A12`

