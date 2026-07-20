### Task 8: A1 — push su assegnazione tecnico

**Files:**
- Modify: `src/app/api/lavori/[id]/route.ts` (PATCH: select `existing` + trigger post-update)
- Test: estendere il test esistente della route PATCH lavori in `tests/unit/` (trovarlo con `grep -rl "api/lavori" tests/unit/`)

**Interfaces:** `triggerPushToUser(user_id, laboratorio_id, {title, body, url})` da `@/lib/notifications/trigger` (fire-and-forget, silent on error). NOTA: `tecnici.id ≠ utenti.id`? VERIFICARE: `triggerPushToUser` filtra `push_subscriptions.user_id`; controllare se `lavori.tecnico_id` referenzia `tecnici.id` e in tal caso risolvere lo `utenti.id` del tecnico (select su `tecnici` colonna user/utente) prima del trigger. Il pattern funzionante è in `prove/route.ts:225` — copiarne la risoluzione.

- [ ] **Step 1 (RED):** test: PATCH con `tecnico_id` nuovo → `triggerPushToUser` (mockato) chiamato una volta con body contenente il numero lavoro e MAI il nome paziente; PATCH senza cambio `tecnico_id` (stesso valore) o con `tecnico_id: null` → mai chiamato; errore del push (mock reject) → la risposta resta 200.
- [ ] **Step 2 (GREEN):** ampliare la select di `existing` (riga ~189): `.select('incluso_in_fattura, tecnico_id, numero_lavoro')`. Dopo l'update riuscito (riga ~268):
```ts
if (payload.tecnico_id && payload.tecnico_id !== existing.tecnico_id) {
  // fire-and-forget — mai bloccare la risposta (pattern prove/route.ts)
  void notificaAssegnazione(svc, payload.tecnico_id, context.laboratorioId, existing.numero_lavoro)
}
```
con `notificaAssegnazione` piccola funzione locale che risolve l'eventuale mapping tecnici→utenti e chiama `triggerPushToUser(..., { title: 'Nuovo lavoro assegnato', body: `Il lavoro n.${numero} è stato assegnato a te`, url: `/lavori/${id}` })`.
- [ ] **Step 3:** run → PASS (incluso il caso lab-guard: i mock context hanno già `lab`).
- [ ] **Step 4:** commit `feat(lavori): push al tecnico su assegnazione lavoro — A1`

