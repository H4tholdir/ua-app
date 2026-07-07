# Fix race doppia-fatturazione POST /api/admin/labs — RISOLTO, MERGIATO, DEPLOYATO (07/07/2026)

`laboratori.partita_iva` non aveva vincolo UNIQUE a DB (solo indice non-unique) — pre-check applicativo senza backstop, race poteva creare 2 lab + 2 clienti Stripe per la stessa P.IVA. Migration live: indice UNIQUE parziale (stato trial/attivo, deleted_at null). Route riordinata: insert prima di Stripe, 23505→409, precheck allineato. Fast-forward `69ba089..b39077f` su `main`, pushato, CI verde, deploy Vercel confermato, `uachelab.com` risponde 200. Worktree e branch rimossi.

Finding review: nome file migration non corrispondeva al timestamp reale in schema_migrations (MCP timestampa da sé) — corretto rinominando (anche per la migration B20 già in main, stesso drift). `IF NOT EXISTS` aggiunto per idempotenza.

`tsc`/`vitest` (670/4 skipped, era 665)/`next build` puliti. Review Opus: Ready to merge Yes.

`rete/[id]/inviti`: stesso gap, impatto basso, documentato soltanto (nessun codice toccato).

Dettaglio completo: `memory/MEMORY.md` §0.
