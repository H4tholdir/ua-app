# Decisione design — Sezione «Situazione economica» del portale dentista (Ondata 3)

**Data:** 2026-07-11 · **Approvato da:** Francesco («Ok procedi» sul mockup, gate 0B)
**Mockup:** `docs/design/mockups/2026-07-11-portale-situazione-economica.html`
**Screenshot di riferimento:** `docs/design/mockups/screenshots/2026-07-11-portale-situazione-economica-390.png`
**Spec:** `docs/superpowers/specs/2026-07-11-portale-dentista-v2-ondata-3-situazione-economica-design.md` (D-O3-1…4)

## Scelte approvate

- **Posizione:** terza sezione della fase lista del portale, SOTTO «Fatture», stesso divider `#E5E7EB` — un solo PIN gate (pattern Ondata 2).
- **Card saldo** in cima: «Da saldare» (confermato), «In attesa di tua decisione» (potenziale, riga presente solo se > 0, con sottotesto che rimanda alla sezione «Da fatturare»), «Tuo credito» (disponibile, in verde `#15803D`, riga presente SOLO se > 0), separatore, «Totale» (19px, 800).
- **Dettaglio dovuti:** blocco collassabile (React: collassato di default; nel mockup mostrato espanso). Righe: etichetta «Fattura N» / «Lavoro N», data estesa it-IT; a destra residuo (700) e badge ambra «in ritardo di N gg» (`#B45309` su `#FEF3C7`) se in ritardo; righe saldate quiete (`#9CA3AF`, etichetta «Saldata»).
- **Pagamenti registrati:** blocco collassabile, gruppi per anno (etichetta uppercase grigia), righe metodo (Contanti/Bonifico/…) + data + destinazione «per Fattura N» / «per Lavoro N»; importo neutro `#111827` (denaro già versato, non un delta).
- **Stato vuoto:** card con ⚖️ e «Nessun movimento economico registrato.»
- **Minimizzazione visiva:** nessun id interno, nessuno stato SDI, mai la nota interna del metodo (`metodo_nota`).
- Stile: pattern portale esistente (DM Sans, card bianche radius 16, shadow leggere, CSS inline esadecimale — NON DS v3).
