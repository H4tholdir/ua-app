## Task 5 — Server: composizione snapshot + POST/PATCH (TDD)

**Files:**
- Create: `src/lib/prescrizione/componi-snapshot.ts` (funzione pura)
- Test: `tests/unit/componi-snapshot.test.ts`
- Modify: `src/app/api/lavori/route.ts` (POST: ~riga 233, blocco `p_lavoro`/chiamata RPC)
- Test: il file di test esistente della route POST (censirlo: `grep -rl "api/lavori/route" tests/unit/`)
- Modify: `src/app/api/lavori/[id]/route.ts:178-213` (allowlist) e `:54-63` (commento-ragioni)
- Modify: `src/types/domain.ts` (tipo `LavoroPrescrizione` + `Lavoro.istituzione_sanitaria`)

**Interfaces (produce):**
```typescript
// src/lib/prescrizione/componi-snapshot.ts
export interface PrescrizioneInput {
  colore?: string          // testo COME DIGITATO dall'addetta (D210) — mai normalizzato qui
  numero_prescrizione?: string
}
export interface DentiInput { fdi: number; provenienza?: string }
// Ritorna il jsonb per p_prescrizione, o null se non c'è NULLA di prescritto (V2).
export function componiSnapshot(denti: DentiInput[], p?: PrescrizioneInput):
  { contenuto: Record<string, unknown>; numero_prescrizione: string | null } | null
```

- [ ] **Step 5.1** Test RED di `componiSnapshot` — forme d'input enumerate (R-P4): denti vuoti+niente → `null`; denti [11,12] → `{contenuto:{elementi:[11,12]}}`; colore `" a3 "` → PRESERVATO ESATTO (`" a3 "`, con spazi: fedeltà D210); colore assente → chiave assente (V2, MAI `colore:null`); solo numero → contenuto `{}` con numero; denti con `provenienza:'eseguito'` → ESCLUSI dagli elementi (solo i prescritti entrano, W20); `tipo` MAI presente (entra in conferma, D213). Run: `npx vitest run tests/unit/componi-snapshot.test.ts` → Expected: FAIL (modulo non trovato).
- [ ] **Step 5.2** R-P4: abbozzo inerte (`return null`) → contare le asserzioni che si accendono, scrivere `N su M` nel report del task.
- [ ] **Step 5.3** Implementare `componiSnapshot` (pura, ~20 righe). Run → Expected: PASS.
- [ ] **Step 5.4** POST `route.ts`: accettare `body.istituzione_sanitaria` (→ `p_lavoro`) e `body.prescrizione` (`PrescrizioneInput`); comporre `p_prescrizione = componiSnapshot(denti, body.prescrizione)` e passarlo alla RPC SOLO se non null. Il client non manda MAI testo MDR composto (V3): manda dati, il server compone. Test: body senza campi nuovi → chiamata RPC identica a oggi (retro-compatibilità); body con prescrizione → `p_prescrizione` presente e fedele.
- [ ] **Step 5.5** PATCH: `'istituzione_sanitaria'` in `PATCHABLE_FIELDS` (dopo `'richiedente_nome'`, r.181) + commento 54-63 aggiornato: `numero_prescrizione` esce dall'elenco «senza ragione» e riceve la sua — «vive su lavori_prescrizioni, scrittura via RPC dedicate (ondata B, spec §3)». Test: PATCH con `istituzione_sanitaria` → salvata; con `numero_prescrizione` → ancora scartata.
- [ ] **Step 5.6** `domain.ts`: `istituzione_sanitaria: string | null` su `Lavoro` (dopo r.275) + interfaccia `LavoroPrescrizione` (rispecchia la tabella).
- [ ] **Step 5.7** Run mirato dei test toccati → PASS. Commit: `git commit -m "feat(lavori): snapshot prescrizione server-side nel POST + istituzione_sanitaria patchabile (ondata B ②, V3)"`.

