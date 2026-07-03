# Sessione chiusa — 03/07/2026 (B2 chiuso e mergiato, prossima sessione: B7)

**Versione in produzione:** main `abe1796` (dopo merge B2 `05612ec` + fix SW/backlog `7fc181b`) · 219/219 test · tsc/build puliti.

**Questa sessione — B2 "Contabilità Clienti" implementato, chiuso, mergiato e deployato:**
Piano di 16 task eseguito con subagent-driven-development (subagent dedicato per task, review indipendente spec+qualità con round di fix dove necessario). 5 bug reali trovati e corretti SOLO grazie alla review adversariale, mai in una singola passata: race condition nel trigger DB di ricalcolo pagamenti, un `DROP TABLE` irreversibile che aveva rotto una funzione admin Postgres, un consumer frontend che sarebbe andato in crash per il cambio di forma di una risposta API, un bug di netting scoperto in verifica finale, e — trovato solo dalla review sull'intero branch dopo che ogni singolo task era già stato approvato — un secondo disaccordo tra Scadenzario e le altre 3 superfici su due casi specifici (lavori "fatturare non incluso", fatture bozza). Tutti risolti. Merge fast-forward pulito su `main`, pushato, deploy Vercel.

Due follow-up noti (SW cache RSC stale-dopo-mutazione + backlog disallineato) risolti in sessione successiva, stesso giorno — commit `7fc181b`, verificato dal vivo con Playwright (non solo lettura codice).

**Dettaglio tecnico completo:** `memory/MEMORY.md` §0 (sezione B2, molto estesa — include causa radice, ogni bug trovato in review con evidenza, fix, verifica). Piano: `docs/superpowers/plans/2026-07-02-contabilita-clienti.md` (self-review finale inclusa).

**Nessuna azione residua su B2** — è chiuso, non serve riaprirlo.

**Prossima sessione — copiare e incollare:**
```
Inizia da BP-0. B1 e B2 (i 2 blocker critici del re-audit 02/07) sono risolti e mergiati su main.

Prossimo item in roadmap: B7 — "Invita tecnico" irraggiungibile dalla UI
(docs/roadmap/BACKLOG-TECNICO-2026-07-02.md, sezione Blocker — leggi il dettaglio completo lì).

Causa: nessun link da nessuna parte della UI (bottom-nav, menu profilo, /impostazioni) verso un
flow di invito tecnico funzionante per il titolare. L'unico endpoint esistente (POST /api/admin/invite)
è riservato ad admin_sistema (Francesco), non al titolare del laboratorio.

Questo richiede una decisione di design (nuovo endpoint lato titolare, dove metterlo in UI:
/impostazioni/team o /tecnici/invita) — non è un fix meccanico. Usa superpowers:brainstorming
prima di procedere a un piano, come da FASE 2 del workflow BP-2 in CLAUDE.md.

Dopo B7: B8 (5 route CRUD → 404) e B9 (lista pazienti non navigabile, fix da 15-30 min) sono
i prossimi due blocker, entrambi più meccanici — non richiedono brainstorming.
```

**Backlog:** 🔴 Blocker 2/16 risolti (B1 ✅, B2 ✅) · 🟠 Alto 0/18 (A4 🔄 parziale, vedi sotto) · 🟡 Medio 0/30 · 🟢 Basso 2/4.

**Nota A4 (Alto, non blocker):** parzialmente risolta insieme a B2 — il Service Worker non cachea più le fetch RSC di `router.refresh()` (causa di UI stale dopo mutazioni, in tutta l'app). Resta aperto: versioning cache legato a `NEXT_PUBLIC_BUILD_ID` invece del bump manuale `ua-v1→ua-v2`, e pulizia TTL delle entry vecchie in cache.
