# B7 pronto per esecuzione — worktree preparato (03/07/2026)

**Non ancora eseguito.** Design (brainstorming) e piano di implementazione completati e approvati in questa sessione. L'esecuzione dei 12 task va fatta in una **nuova sessione**, con `superpowers:subagent-driven-development`.

**Worktree già pronto** (creato in questa sessione, non serve ricrearlo):
- Path: `.claude/worktrees/worktree-b7-invito-collaboratori`
- Branch: `worktree-b7-invito-collaboratori` (da `main` @ `22a64a0`)
- `.env.local` già copiato, `npm install` già eseguito
- Baseline verificata pulita: `npx tsc --noEmit` 0 errori, `npx vitest run` 224/224 verdi

**Documenti:**
- Spec: `docs/superpowers/specs/2026-07-03-b7-invito-collaboratori-design.md`
- Piano: `docs/superpowers/plans/2026-07-03-b7-invito-collaboratori.md` — 12 task TDD

**Cosa risolve B7:** il titolare non ha modo di invitare un tecnico/front_desk/co-titolare dall'UI (`/tecnici` punta a un link rotto). Include anche il fix della RPC `accept_invite_atomic` che oggi non crea la riga `tecnici` mancante — senza quel fix un tecnico invitato non comparirebbe mai in `/tecnici`.

**Prossima sessione — copiare e incollare:**
```
Entra nel worktree .claude/worktrees/worktree-b7-invito-collaboratori (già pronto, non ricrearlo)
ed esegui il piano docs/superpowers/plans/2026-07-03-b7-invito-collaboratori.md con
superpowers:subagent-driven-development, partendo dal Task 1.
```

**Backlog:** 🔴 Blocker 2/16 risolti (B1 ✅, B2 ✅), B7 in esecuzione · 🟠 Alto 1/18 (A4 ✅) · 🟡 Medio 0/30 · 🟢 Basso 2/4.
