# SESSION ACTIVE — 11/07/2026

**Stato:** Ondata 1 portale COMPLETATA e in prod (`main 708abf1`). **Ondata 2 (storico fatture nel portale): pre-check I-6 ESEGUITO (esito VERDE) + piano scritto** in `docs/superpowers/plans/2026-07-11-portale-dentista-v2-ondata-2-storico-fatture.md`.

**Esito I-6:** bucket `fatture-pdf` PRIVATO con RLS solo membri lab — nessuna porta aperta; `xml_url` persiste publicUrl inerti (0 righe in prod, 1 sola fattura draft) → igiene inclusa nel piano (stop scrittura/lettura `xml_url`, Task 4-5). Scoperta: NON esiste un PDF della fattura — il piano include `FatturaCortesiaTemplate` generato con l'XML in `generaFatturaPA` (coerenza fiscale) + colonna `fatture.pdf_storage_path` (migration Task 1, GATE apply Francesco).

**Prossimo:** esecuzione piano (9 task, SDD raccomandato, worktree `ondata-2-storico-fatture`). Gate precoci: Task 1 apply migration via `db push` (Francesco); Task 2 mockup sezione «Fatture» → approvazione.

**Gotcha:** `preview_start` lancia il dev server nel checkout principale (usare `PORT=xxxx npm run dev` dal worktree); PNG mockup con `git add -f`; QA su lab E2E, MAI lab Filippo.
