# Task 2 Report: Helper di contesto `lab-context.ts` (TDD)

**Date:** 2026-07-17
**Status:** DONE_WITH_CONCERNS
**Commit Hash:** `767a684`

---

## Summary

Implementato `src/lib/supabase/lab-context.ts` con `getLabContext`, `getLabContextWithTimings`,
`getFreshLabContext`, seguendo TDD (RED → GREEN). Codice sorgente adottato **verbatim** dal
brief (`task-2-brief.md` Step 3), nessuna modifica di logica. Filtro `.is('deleted_at', null)`
presente, embed `laboratori(...)` senza `!inner`, shape `LabContext` esatta come da spec.

**Due deviazioni rispetto al brief, entrambe obbligate dai pattern reali del repo — dettagliate
sotto.** Nessuna deviazione di logica applicativa o di sicurezza (N11 rispettato).

---

## Deviazione 1: percorso del file di test

Il brief indica `src/lib/supabase/__tests__/lab-context.test.ts`. Il repo **non** usa questa
convenzione: tutti i 238+ file di test esistenti vivono in `tests/unit/*.test.ts` (flat), e
`vitest.config.ts` lo conferma esplicitamente:

```ts
include: [
  'tests/unit/**/*.test.ts',
  'tests/unit/**/*.test.tsx',
  'tests/integration/**/*.test.ts',
],
```

**Verifica empirica** (comando esatto richiesto dall'orchestrator, eseguito prima di adattare):

```
$ npx vitest run src/lib/supabase/__tests__/lab-context.test.ts
No test files found, exiting with code 1
filter: src/lib/supabase/__tests__/lab-context.test.ts
include: tests/unit/**/*.test.ts, tests/unit/**/*.test.tsx, tests/integration/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**
```

Un file sotto `src/lib/supabase/__tests__/` non viene scoperto da Vitest indipendentemente dal
path passato in CLI, perché non rientra nei glob di `include`. Ho quindi creato il test in
**`tests/unit/lab-context.test.ts`**, seguendo la convenzione reale del repo (coerente con
l'istruzione del task: "Guarda i pattern mock dei test esistenti nel repo... e adeguati").

---

## Deviazione 2: pattern di mock (`vi.hoisted` invece di `const` top-level)

Lo scheletro del brief dichiara i mock come `const mockGetClaims = vi.fn()` a livello di modulo,
poi li referenzia dentro `vi.mock(...)`. Il pattern usato in tutti i test esistenti del repo che
mockano `@/lib/supabase/server-user` / `@/lib/supabase/server-service` (es.
`tests/unit/admin-labs-route.test.ts`) usa invece `vi.hoisted(() => ({...}))`, necessario perché
`vi.mock` viene issato (hoisted) sopra le dichiarazioni `const` nello stesso file, causando un
errore di TDZ ("Cannot access before initialization") altrimenti. Ho adottato `vi.hoisted` per
coerenza con la convenzione consolidata del repo. Comportamento dei test e asserzioni sono
identici allo scheletro del brief (stessa chain `select().eq().is().single()`, stessa verifica
`toContain('laboratori(')` / `not.toContain('!inner')`, stessa verifica
`toHaveBeenCalledWith('deleted_at', null)`).

---

## Step 1-2: RED

Test scritto in `tests/unit/lab-context.test.ts` (8 case, copre tutti i 6 casi obbligatori del
brief §6 + 2 aggiuntivi di guardia). Rieseguito con path adattato, PRIMA di creare il sorgente:

```
$ npx vitest run tests/unit/lab-context.test.ts
Error: Failed to resolve import "@/lib/supabase/lab-context" from "tests/unit/lab-context.test.ts".
Does the file exist?
 FAIL  tests/unit/lab-context.test.ts [ tests/unit/lab-context.test.ts ]
 Test Files  1 failed (1)
      Tests  no tests
```

RED confermato (modulo inesistente), come da Step 2 del brief.

---

## Step 3: Implementazione

`src/lib/supabase/lab-context.ts` creato **verbatim** dal codice del brief (Step 3), incluso:
- `import 'server-only'` (già mockato globalmente in `tests/setup.ts:5` con `vi.mock('server-only', () => ({}))`, nessun intervento necessario)
- `SELECT_CONTEXT = 'ruolo, laboratorio_id, nome, cognome, laboratori(stato, trial_ends_at, nome)'` — nessun `!inner`
- `fetchUtenteRow` con `.is('deleted_at', null)` sempre presente prima di `.single()`
- `getLabContextCached` via `React.cache()`, condivisa da `getLabContext` e `getLabContextWithTimings`
- `getFreshLabContext` via `getUser()` di rete, non cached, con sink `timings` opzionale

Nessuna modifica di logica rispetto al brief.

---

## Step 4: GREEN — output reali

### `npx vitest run tests/unit/lab-context.test.ts`

```
 RUN  v4.1.6 /Users/hatholdir/.../ua-app/.claude/worktrees/p0-perf-r2


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  11:51:53
   Duration  529ms (transform 31ms, setup 49ms, import 22ms, tests 4ms, environment 365ms)
```

8/8 test passati:
1. claims validi → LabContext completo (verifica anche `mockIs` chiamato con `('deleted_at', null)` e select senza `!inner`)
2. claims assenti → null
3. utente soft-deleted (riga assente da `.single()`) → null
4. admin_sistema senza lab (`laboratorio_id: null`, `laboratori: null`) → `laboratorioId: null`, `lab: null`
5. `getFreshLabContext`: user presente → context via `getUser()` (NON `getClaims`), timings numerici
6. `getFreshLabContext`: user assente → null
7. `getLabContextWithTimings`: context + timings numerici
8. `getLabContext` chiamato 2× → shape stabile (dedup — vedi nota sotto)

### `npx tsc --noEmit`

```
(nessun output = 0 errori)
```

### Suite completa (`npm run test:unit`) — verifica non-regressione

```
 RUN  v4.1.6 ...
 Test Files  239 passed (239)
      Tests  2016 passed (2016)
   Start at  11:48:28
   Duration  35.65s
```

239 file di test passati (238 preesistenti + 1 nuovo), 2016 test case (2008 preesistenti da
Task 1 + 8 nuovi). Nessuna regressione.

---

## Nota sul caso 6 (memoizzazione `React.cache()`)

Come anticipato nel brief §6 punto 6, ho verificato empiricamente che `React.cache()` **non**
deduplica fuori da un render pass RSC in ambiente Vitest/jsdom. Ho temporaneamente forzato
un'asserzione con valore sentinella per leggere il conteggio reale delle chiamate a
`mockSingle` (poi rimossa prima del commit):

```
- Expected: 999
+ Received: 2
```

**Osservazione:** con due chiamate concorrenti a `getLabContext()` nello stesso test, la query
`utenti` (`mockSingle`) viene eseguita **2 volte**, non 1. Questo conferma quanto previsto dal
brief: la memoizzazione di `React.cache()` è garantita da React solo all'interno di un singolo
render pass di Server Components reale (Next.js RSC), non riproducibile in un ambiente di test
Vitest/jsdom che non esegue un vero render pass React. Il test finale (`tests/unit/lab-context.test.ts`,
ultimo case) verifica quindi solo che le due chiamate ritornino **lo stesso shape** (requisito
soddisfatto), documentando esplicitamente nel commento del test che la dedup reale è garanzia di
React in RSC e non verificabile in questo ambiente — in linea con l'istruzione esplicita del
brief per questo caso.

---

## Vincoli rispettati (verifica esplicita)

- ✅ MAI `!inner` nella select — asserito in 2 test (`not.toContain('!inner')`)
- ✅ `.is('deleted_at', null)` obbligatorio — asserito in 2 test (`toHaveBeenCalledWith('deleted_at', null)`)
- ✅ Shape `LabContext` esatto dal brief: `{ userId: string; email: string | null; ruolo: string; laboratorioId: string | null; nome: string | null; cognome: string | null; lab: {...} | null }`
- ✅ Nessuna riga soft-deleted esposta (query ritorna `null` → context `null`)
- ✅ `getFreshLabContext` usa `getUser()`, mai `getClaims()` (asserito: `expect(mockGetClaims).not.toHaveBeenCalled()`)

---

## Step 5: Commit

**Comando adattato** (path di test reale, messaggio verbatim dal brief):

```bash
git add src/lib/supabase/lab-context.ts tests/unit/lab-context.test.ts .superpowers/sdd/task-2-report.md
git commit -m "feat(auth): helper di contesto getLabContext/getFreshLabContext con filtro deleted_at (N11)"
```

Nota: il comando letterale del brief (`git add src/lib/supabase/lab-context.ts
src/lib/supabase/__tests__/lab-context.test.ts`) avrebbe fallito con "pathspec did not match"
sul secondo argomento, dato che quella directory non è mai stata creata (deviazione 1).

**Nota pre-commit hook:** il primo tentativo di commit è stato bloccato dall'hook `eslint
--max-warnings=0` (husky), per 7 warning `@typescript-eslint/no-unused-vars` sui parametri tipati
dei mock (`_cols`, `_col`, `_val`, `_table`) usati solo per far inferire a TS la call-signature
corretta di `mock.calls[0][0]`. Risolto rimuovendo i parametri tipati e usando
`vi.fn().mockReturnValue(chain)` (pattern già presente altrove nel repo, es.
`tests/unit/lavori-id-route.test.ts`), che lascia TS inferire `calls: any[][]` senza bisogno di
parametri nominati. Nessun impatto sulla logica di test; secondo tentativo di commit riuscito
(hook verde, `✅ DS compliance OK`).

**Commit hash:** `767a684`

---

## Concerns

1. **Percorso del test spostato** da `src/lib/supabase/__tests__/` (brief) a `tests/unit/`
   (convenzione reale del repo) — necessario perché Vitest non lo avrebbe altrimenti scoperto.
   Documentato sopra con output empirico.
2. **Pattern di mock** adattato a `vi.hoisted` per coerenza con la convenzione esistente del repo
   (evita TDZ) — nessun impatto sulle asserzioni o sulla copertura richiesta.
3. Il caso 6 (memoizzazione) è testato per shape, non per singola invocazione della query — come
   esplicitamente consentito dal brief, con osservazione empirica allegata (2 chiamate, non 1).

Nessun altro concern. Il file `lab-context.ts` è pronto per essere consumato dai task successivi.

---

---

## Fix Round 1: Log errori DB non-attesi (osservabilità)

**Date:** 2026-07-17  
**Review Finding:** Task 2 review — `fetchUtenteRow` scarta l'`error` di Supabase, zero osservabilità su timeout/connessione del DB.

### Cosa è stato fatto

1. **Modifica `fetchUtenteRow` in `src/lib/supabase/lab-context.ts`:**
   - Destruttura anche `error` dal risultato di `.single()`
   - Se `error` presente E `error.code !== 'PGRST116'` (PGRST116 = zero rows atteso per soft-deleted/non trovato), logga UNA riga:
     ```ts
     console.error('[lab-context] lookup utenti fallito — fail-closed:', error.code, error.message)
     ```
   - Valore di ritorno **immutato**: `null` in ogni caso di non-successo (fail-closed mantenuto)

2. **Aggiunti test case in `tests/unit/lab-context.test.ts`:**
   - **Test: errore DB inatteso (57014 timeout)** → context `null` + `console.error` loggato con codice/messaggio
   - **Test: errore atteso PGRST116** → context `null` + `console.error` NON loggato

### Output test reali

```
$ npx vitest run tests/unit/lab-context.test.ts
 RUN  v4.1.6 /Users/hatholdir/.../ua-app/.claude/worktrees/p0-perf-r2

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  11:59:33
   Duration  530ms (transform 30ms, setup 45ms, import 22ms, tests 5ms, environment 368ms)
```

10/10 test passati (8 originali + 2 nuovi).

```
$ npx tsc --noEmit
(nessun output = 0 errori)
```

TypeScript type check: **0 errori**.

---

**End of Report**
