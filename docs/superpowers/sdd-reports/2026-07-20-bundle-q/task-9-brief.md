### Task 9: A8 — push al lab su richiesta dal portale

**Files:**
- Modify: `src/app/api/portale/richiedi/route.ts` (dopo insert riuscito, prima del 201)
- Test: estendere il test esistente della route (`grep -rl "portale/richiedi" tests/unit/`)

**Interfaces:** `triggerPushByRole(laboratorio_id, ruolo, payload)` — una chiamata per `'titolare'` e una per `'front_desk'`.

- [ ] **Step 1 (RED):** test: POST valido → `triggerPushByRole` chiamato per titolare E front_desk, body con nome studio/dentista e tipo lavoro, MAI paziente/`paziente_codice_richiesta`; POST che fallisce l'insert → mai chiamato; push reject → risposta resta 201; POST oltre rate-limit (mock count ≥10) → 429 e mai chiamato.
- [ ] **Step 2 (GREEN):** dopo l'insert riuscito:
```ts
const pushPayload = {
  title: 'Nuova richiesta dal portale',
  body: `${nomeStudioODentista} ha richiesto: ${body.tipo_dispositivo} (n.${numero_lavoro})`,
  url: `/lavori/${lavoro.id}`,
}
void triggerPushByRole(labId, 'titolare', pushPayload)
void triggerPushByRole(labId, 'front_desk', pushPayload)
```
`nomeStudioODentista`: la route ha già i dati cliente della verifica token (ampliare la select del punto 3 con `studio_nome, nome, cognome` se non già presenti; usare `studio_nome ?? \`${nome} ${cognome}\``).
- [ ] **Step 3:** run → PASS · commit `feat(portale): push a titolare/front_desk su nuova richiesta — A8`

