# SESSION ACTIVE — 13/07/2026 — ONDATA 2 (WIZARD) COMPLETATA, MERGIATA, DEPLOYATA

**Stato:** CHIUSA. `/lavori/nuovo` è il wizard v3 a 3 passi, in produzione su uachelab.com (`432e5f8..d5ffd3c` su `main`, 25 commit, CI+CD verdi, smoke `/lavori/nuovo`→307). Suite 1561 pass | 4 skipped. Migration `bite_splint` applicata in prod. Worktree `ondata-2-wizard` rimosso.

**Riepilogo:** tassonomia 38 tipi/10 famiglie (macro in tipo_dispositivo, label granulare in descrizione, classe default); enum 422 (B2) + label consolidate (B4); ChipScelta/ProgressDots; TileScelta due-righe (nomeRiga2, ratifica Francesco); tempi medi (GIORNI_FALLBACK_LIBERO=7); sheet Nuovo dentista; catalogo + Descrivilo; Passo 3 alias opt-in GDPR + foto; creazione fail-soft + Fatto (Cambia data PATCH); persistenza 24h; modulo neutro `src/lib/date/giorni.ts` (fix bug server/client scoperto in QA). QA browser funzionale su lab E2E con invarianti DB verificati + cleanup a baseline.

**Backlog aperti (BACKLOG-TECNICO §O5):** ESLint `no-restricted-imports` per helper client (`@/components/ds/Campo`) da moduli server/`src/lib`; `chiudiRipresa` lascia `pronto=false` per il mount corrente; ratifica visiva ripresa/animazioni quando il browser pane è visibile (in QA il pane era `document.visibilityState=hidden`, Motion congelato); deviazione `stimaGiorni` fallback difensivo; buco progressivi lavoro (non fiscale) su cleanup QA.

**PROSSIMO:** Ondata 3 (Scheda lavoro v3) o 4b UI Consegna, salvo ripriorizzazione di Francesco.
