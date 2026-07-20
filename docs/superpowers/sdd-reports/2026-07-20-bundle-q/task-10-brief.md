### Task 10: O1c — tre fix a11y v3

**Files:**
- Modify: `src/components/features/tutto-il-resto/TuttoIlResto.tsx:62`
- Modify: `src/components/features/pile/PilaAperta.tsx:85-86`
- Modify: `src/components/ds/CardLavoro.tsx` (guard dev)
- Test: estendere i test esistenti dei tre componenti (in `tests/unit/ds-v3/componenti/` e `tests/unit/`)

- [ ] **Step 1 (RED):** tre assert: (a) la card «Tutto il resto» ha `aria-label` = `"<nome>. <sub>"`; (b) con ricerca aperta esiste un bottone `aria-label="Chiudi ricerca"` che riporta a `RigaCerca` (dopo click il campo sparisce e riappare la riga); (c) `CardLavoro` con `conferma` E `onConsegna` insieme emette `console.warn` in dev (spy) e non in produzione (`vi.stubEnv('NODE_ENV','production')`).
- [ ] **Step 2 (GREEN a):** `aria-label={s.sub ? `${s.nome}. ${s.sub}` : s.nome}`.
- [ ] **Step 3 (GREEN b):** in `PilaAperta`, quando `cerca !== null`, affiancare a `CampoTesto` un `TastoTondo` (già importato) `glifo="×" etichettaAria="Chiudi ricerca" onClick={() => setCerca(null)}` in un wrapper flex `gap: 10, alignItems: 'center'` (il CampoTesto prende `flex: 1`).
- [ ] **Step 4 (GREEN c):** in `CardLavoro`, all'inizio del componente:
```tsx
if (process.env.NODE_ENV !== 'production' && conferma && onConsegna) {
  console.warn('CardLavoro: conferma e onConsegna sono mutuamente esclusivi — onConsegna ignorato')
}
```
(coerente con la precedenza già implementata a type-level; verificare quale variante vince nel file e allineare il messaggio).
- [ ] **Step 5:** run → PASS · commit `fix(a11y): sub udibile, chiusura ricerca, warn dev CardLavoro — O1c`

