# B20 RISOLTO, MERGIATO E DEPLOYATO (07/07/2026)

PSUR/PMS Report ora differenziato per classe di rischio (Art. 85 Classe I / Art. 86 Classe IIa-IIb-III). Fast-forward `58ac033..3f106ea` su `main`, pushato, CI verde, deploy Vercel confermato, `uachelab.com` risponde 200. 10 task via `superpowers:subagent-driven-development`, tutti approvati (2 finding Important corretti: fail-closed su `Object.prototype` in `rilevaGruppi`, colore testo `--gold` non WCAG-conforme nel badge "Bozza"). Migration DB live applicata (`psur.gruppo_classe`).

**QA browser manuale ha trovato e corretto un bug bloccante reale:** bottone "Genera" sempre 400 — form HTML nativo invia form-urlencoded, la route leggeva solo JSON (bug preesistente, reso bloccante da B20). Fix verificato dal vivo: PMS Report + PSUR generati con successo, coesistenza confermata, 390/768/1280px light/dark OK.

`tsc`/`vitest` (663/4 skipped, era 645)/`next build`/DS-compliance tutti puliti. Worktree e branch rimossi.

Backlog separato aperto (non-bloccante): race condition su insert concorrente POST ritorna 500 grezzo invece di 409 (`task_e02b92d8`).

Dettaglio completo: `memory/MEMORY.md` §0, `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B20. Prossimi Blocker: B6, B14, B16.
