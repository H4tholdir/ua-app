-- ============================================================
-- P31 — Il telefono dello studio e il cellulare WhatsApp sono
-- due dati diversi con lo stesso nome (D181, 03/08/2026).
--
-- `telefono` RESTA il numero dello studio: è quello che si
-- chiama, quello che va sui documenti, e può essere un fisso.
-- provato: l'unico numero in banca dati è un fisso (0976...),
--          quindi quella colonna si comporta già così.
-- Nasce `cellulare_whatsapp`: dove arrivano consegna e solleciti.
--
-- Nessun backfill: cellulare_whatsapp nasce NULL per tutti, ed
-- è corretto — nessuno l'ha mai inserito.
--
-- Nessun CHECK sul formato: un vincolo renderebbe NON SALVABILE
-- un numero scritto male, contro la direttiva permanente del
-- 27/07 («ogni campo si corregge, fino alla consegna»). La forma
-- si sistema quando si costruisce il link, non quando si salva.
-- ============================================================

ALTER TABLE public.clienti ADD COLUMN cellulare_whatsapp TEXT;

COMMENT ON COLUMN public.clienti.telefono IS
  'Telefono dello studio: si chiama, va sui documenti. Puo'' essere un fisso. NON e'' il numero WhatsApp — v. cellulare_whatsapp (P31, D181).';

COMMENT ON COLUMN public.clienti.cellulare_whatsapp IS
  'Cellulare su cui il dentista riceve i messaggi (consegna, solleciti). Il prefisso internazionale lo aggiunge il codice, non l''utente (P31, D182).';
