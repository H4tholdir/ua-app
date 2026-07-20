### Task 11: O1f — segnale «tecnico senza anagrafica»

**Files:**
- Modify: `src/lib/dashboard/striscia.ts` (input + 2 candidati + gerarchie)
- Modify: il chiamante che costruisce l'input striscia (trovarlo: `grep -rn "getStriscia\|StrisciaInput" src/lib/dashboard/ src/app/(app)/dashboard/`) per passare i nuovi campi
- Test: estendere `tests/unit/` del modulo striscia (`grep -rl "striscia" tests/unit/`)

**Interfaces:** estendere l'input `i` con `senzaAnagrafica?: boolean` (già calcolato da `getPerimetroHome`, va solo propagato) e `tecniciSenzaAnagrafica?: string[]` (nomi; nuova query lato titolare: utenti attivi `ruolo='tecnico'` non-deleted del lab senza riga `tecnici` — LEFT JOIN o due select confrontate, scoped `laboratorio_id`).

- [ ] **Step 1 (RED):** test: (a) input tecnico con `senzaAnagrafica: true` → striscia = segnale attenzione «Il tuo account non è ancora configurato — avvisa il titolare», che vince su s9 e anche su s2-s8 (pile comunque vuote in quel caso); (b) input titolare con `tecniciSenzaAnagrafica: ['Marco']` e nessun segnale s1-s7 attivo → «Account di Marco da completare» con azione verso `/tecnici`; con s1 attivo → vince s1; (c) input titolare senza tecnici scoperti → s8/s9 come oggi.
- [ ] **Step 2 (GREEN):**
```ts
const sTecAccount: Candidato = (i) => i.senzaAnagrafica
  ? { attenzione: true, forte: 'Il tuo account', testo: 'non è ancora configurato — avvisa il titolare', azione: null }
  : null
const sTitTecnici: Candidato = (i) => i.tecniciSenzaAnagrafica?.length
  ? { attenzione: true, forte: `Account di ${i.tecniciSenzaAnagrafica[0]}`, testo: 'da completare', azione: { etichetta: 'Apri ›', href: '/tecnici' } }
  : null
```
Gerarchie: `tecnico: [sTecAccount, s2, s3, s4, s6, s8, s9]` · `titolare/admin_rete: [s1..s7, sTitTecnici, s8, s9]` (front_desk invariato).
- [ ] **Step 3:** propagare i dati nel chiamante (perimetro già disponibile per il tecnico; per il titolare aggiungere la query al punto in cui si compone l'input striscia, stessa transazione di dati della home — Promise.all esistente).
- [ ] **Step 4:** run → PASS · commit `feat(dashboard): segnale striscia per tecnico senza anagrafica — O1f`

