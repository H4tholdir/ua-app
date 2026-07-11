# SESSION ACTIVE — 11/07/2026 (pomeriggio, 3)

**Stato:** **Follow-up review Ondata 3 CHIUSO e deployato** (`main acd39c1`, 3 commit): fail-closed su `getContabilitaCliente`/`fetchMovimentiCreditoValidi` (+try/catch in scadenzario cliente e credito applica/rimborsa), a11y `aria-controls` sui collassabili portale. Suite 1297 pass | 4 skipped. Tracciati **N4** (fonte di verità prezzo lavoro: `prezzo_unitario` vs righe `lavori_lavorazioni`, route PUT lavorazioni orfana — decisione di design nel redesign scheda lavoro DS v3) e **N5** (TD01 hardcoded — prerequisito note di credito) nel BACKLOG-TECNICO §N. Il Portale Dentista v2 resta completo (ondate 0-3).

**Prossimo task:** sequenza **DS v3 «Il cuore»** — piano mockup Ondata 0 già pronto (`docs/superpowers/plans/2026-07-09-ds-v3-il-cuore-ondata-0-mockup.md`). Salvo ripriorizzazione di Francesco.

**Gotcha:** subagent implementer possono committare sul checkout sbagliato (2 incidenti) — imporre verifica `git rev-parse --show-toplevel` + branch nel dispatch; env portale non in `.env.local` (solo Vercel); screenshot browser pane inaffidabili a 1280px (verificare via DOM).
