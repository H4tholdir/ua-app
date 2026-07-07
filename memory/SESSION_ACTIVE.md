# Fix 409 race condition POST /api/qualita/psur (07/07/2026)

Follow-up di B20: rilevato `insertError.code === '23505'` sull'insert, ritorna 409 pulito invece di 500 con messaggio Postgres grezzo (stesso pattern di `cicli/route.ts`). Worktree `worktree-psur-race-409-fix`, commit `92b216c`, TDD (2 nuovi test), review indipendente senza finding.

`tsc`/`vitest` (665/4 skipped, era 663)/`next build` puliti.

Survey completo: stesso gap trovato in `admin/labs/route.ts` e `rete/[id]/inviti/route.ts` — task separati aperti (`task_33371aa2`, `task_289b814f`).

Dettaglio completo: `memory/MEMORY.md` §0. Prossimi Blocker: B6, B14, B16.
