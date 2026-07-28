# Sessione attiva — ONDATA (b): SPEC RATIFICATA, 20 decisioni, ZERO codice (28/07/2026, sera)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-ondata-b-piano-handoff.md`** (aggiornato dopo la ratifica).
Poi la spec **`docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md`** — ora ✅ **RATIFICATA** —
e il verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (**tre tornate: D1-D8, D9-D16, D17-D20**).

**La ratifica ha portato quattro emendamenti**, due nati da domande di Francesco che la spec non si era posta:
**D17** briciole **toccabili**, il ritorno conserva i passi, e chi cambia una risposta a monte è avvisato
**solo se qualcosa si perde** (variante a) — casi veri: cambiare tipo svuota denti/colore, cambiare dentista
invalida il paziente scelto (`cliente_id` NOT NULL) · **D18** **via d'uscita esplicita con conferma**, che azzera
il salvataggio locale, **più la correzione della freccia indietro** (`WizardNuovoLavoro.tsx:219-222` fa
`router.push('/dashboard')`, contro la direttiva del 22/07) · **D19** la **rete di ripresa 24h resta com'è**
(non è una bozza nel gestionale: `localStorage`, `persistenza.ts:26-79`, una sola, senza foto, non viaggia) ·
**D20** l'aiuto dice «puoi cambiarlo» sul codice paziente.
**Ratificate le 4 chiusure della spec**, una **con modifica**: la **data dell'ultimo lavoro SI TIENE** — se costa
si ottimizza (lettura aggregata, mai una query per riga), non si degrada.

⚠️ **Le anteprime mancanti sono QUATTRO, non tre:** passo foto · passo cassetta · avviso «codice già in uso» ·
🆕 **testata** (briciole toccabili + tasto d'uscita). **Prossimo: i mockup, poi il piano** (R-P1/R-P2/R-P6),
poi ramo (🛑 **mai worktree**).
🔑 Baseline DB invariata: **294 lavori · 0 denti · 916 pazienti · 48 colori** (nessuna scrittura).
