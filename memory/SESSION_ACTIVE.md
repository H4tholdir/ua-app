# Sessione attiva — punto di ripresa

🚪 **PUNTO DI RIPRESA:** `docs/design/screenshots/2026-08-06-tinte/GATE-L2.md` — **la §1 per prima**
(i due difetti chiusi), poi la **§4** (i cinque deferiti, uno dei quali è una decisione).

**Stato (06/08/2026, 10:35):** ramo **`tinta-scheda-t7`**, ⛔ **NON pubblicato**. `main` = `affec7ae` —
in produzione solo **T1-T6**.

✅ **Fatto oggi:** **D260** (il rilievo aperto chiuso su entrambi i gemelli — la premessa messa in dubbio
**reggeva**, per il verso opposto) · **collaudo a schermo**, il primo mai fatto sulle tinte, 4 passi su 4,
col ramo **D117 acceso per la prima volta** · **gate estetico L2** sulle due superfici.

🔴 **Il gate ha trovato un campo IRRAGGIUNGIBILE**, e nasce da una mia correzione **incompleta**: la prima
passata aveva chiuso la *leggibilità* dell'avviso ma non la *copertura* (la barra è `sticky`, galleggia
comunque). Rimisurando: con l'avviso aperto la barra è alta 167px e le **Note interne** restavano sotto di
lei anche scorrendo in fondo. ✅ Chiuso misurando la barra con `ResizeObserver`, mai con un numero a mano.
Chiuse anche le righe della scheda: **43,5 → 44px**.

✅ **La tavolozza è promossa:** 18 caselle, altezza unica 60px, «Glitter multicolore» su una riga sola —
il timore della §0③ era **infondato**, e ora è verificato invece che temuto.

🟡 **ASPETTA UNA DECISIONE:** la pagina di modifica monta **due design system insieme** (DM Sans ereditato
dal body v2.3 + tavolozza v3). Non è un difetto da gate — la convivenza migra **per route, mai per
componente** — è un'**ondata di migrazione della route**, da decidere. Gli altri quattro deferiti stanno
nella §4 del gate.

🟡 **Restano:** **T9** e poi il merge · gate L2 arretrato del **wizard** · igiene (32 rami,
`.superpowers/sdd/`) e **riordino memoria** (D257), dopo T8/T9.

📌 **Misurato:** `verify:full` **uscita 0** · **5069 passate | 19 saltate** (429 file).
📎 260 decisioni in centoquattro tornate; la prossima è **D261**.
