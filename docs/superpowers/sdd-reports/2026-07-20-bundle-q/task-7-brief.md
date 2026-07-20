### Task 7: A17-res — hydration AnnullaConsegnaBanner

**Files:**
- Modify: `src/components/features/lavori/AnnullaConsegnaBanner.tsx:15-33`
- Test: `tests/unit/annulla-consegna-banner.test.tsx` (se esiste, estendere)

- [ ] **Step 1 (RED):** test: al primo render (pre-effect, usare fake timers) il componente NON mostra un countdown calcolato da `Date.now()` ma il placeholder; dopo il mount (act/effect) mostra mm:ss corretto per una `dataConsegnaEffettiva` nota.
- [ ] **Step 2 (GREEN):** stato iniziale `null` (= non ancora calcolato), calcolo nel `useEffect`:
```tsx
const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

useEffect(() => {
  const elapsed = Date.now() - new Date(dataConsegnaEffettiva).getTime()
  setSecondsLeft(Math.max(0, Math.floor((FINESTRA_ANNULLO_MS - elapsed) / 1000)))
}, [dataConsegnaEffettiva])
```
Il tick esistente parte solo quando `secondsLeft !== null`; render: `if (secondsLeft === null) return null` (il banner appare al mount, un frame dopo — niente mismatch SSR/client); `if (secondsLeft <= 0 || annullato) return null` resta.
- [ ] **Step 3:** run → PASS · commit `fix(lavori): countdown AnnullaConsegnaBanner fuori dal render iniziale — A17`

