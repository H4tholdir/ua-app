# Decisione design — Sezione «Fatture» del portale dentista (Ondata 2)

**Data:** 11 luglio 2026
**Approvata da:** Francesco Formicola («Ok, procedi» al gate visivo, sessione Ondata 2)
**Mockup di riferimento:** `docs/design/mockups/2026-07-11-portale-storico-fatture.html`
**Screenshot:** `docs/design/mockups/screenshots/2026-07-11-portale-storico-fatture-390.png` (+ variante 768px)

## Scelte approvate

- La sezione «Fatture» vive **dentro l'area riservata esistente** (stesso contenitore sbloccato dal PIN), **sotto** la lista «Da fatturare» — un solo punto di sblocco, nessun tastierino duplicato.
- Raggruppamento **per anno** (etichetta uppercase grigia), fatture ordinate per data desc.
- Riga fattura: etichetta tipo documento + numero ("Fattura 2026-0001"; TD04 → "Nota di credito"), data estesa it-IT, totale a destra (700).
- **Nota di credito (TD04): colore ambra** (non rosso primario, per non creare ambiguità semantica col rosso UÀ) e importo negativo.
- Bottone «📄 PDF» (min-height 44px) SOLO quando la copia di cortesia esiste (`pdf: true`); nessun bottone altrimenti.
- Stato vuoto dedicato: icona 🧾 + "Nessuna fattura emessa finora."
- **Niente stato pagamento** (pagata/da pagare): rinviato all'Ondata 3 (situazione economica) per spec §3.

## Implementazione

Task 8 del piano `docs/superpowers/plans/2026-07-11-portale-dentista-v2-ondata-2-storico-fatture.md` — componente `FattureStoricoSection.tsx` montato da `FatturazioneSection` in fase `lista`, fedele a questo mockup.
