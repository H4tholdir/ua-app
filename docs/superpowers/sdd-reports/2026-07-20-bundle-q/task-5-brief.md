### Task 5: A7 — link incrociati portale ↔ richiedi

**Files:**
- Modify: `src/app/portale/[token]/page.tsx` (header/zona azioni, accanto a «Condividi»)
- Modify: `src/components/features/portale/RichiestaClientForm.tsx` (schermata successo)
- Test: estendere `tests/unit/richiesta-client-form-copy.test.tsx` (link ritorno); portale page è RSC → verifica nel task finale via build + QA.

**Interfaces:** stesso `portale_token` per entrambe le route (verificato: `clienti.portale_token`). `RichiestaClientForm` riceve già il token (verificare nome prop nel file; se assente, derivarlo da `useParams()`).

- [ ] **Step 1 (RED):** test: schermata successo contiene un link con `href="/portale/<token>"` e testo «← Torna allo stato lavori».
- [ ] **Step 2 (GREEN, form):** nella schermata successo, sotto il bottone reset, aggiungere:
```tsx
<a href={`/portale/${token}`} style={{ display: 'inline-block', marginTop: '16px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, color: 'var(--t1, #1C1916)', textDecoration: 'underline', minHeight: '44px', lineHeight: '44px' }}>
  ← Torna allo stato lavori
</a>
```
- [ ] **Step 3 (GREEN, portale):** in `portale/[token]/page.tsx` aggiungere accanto/sotto le azioni esistenti un link `href={`/richiedi/${token}`}` con testo «➕ Richiedi nuovo lavoro», stile copiato dal bottone/link esistente della stessa pagina (superficie neomorphic fuori-app; riusare le classi/style inline già presenti, touch ≥44px).
- [ ] **Step 4:** run test → PASS · commit `feat(portale): navigazione incrociata portale ↔ richiedi — A7`

