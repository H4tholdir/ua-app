-- 20260802090000_lavori_immagini_categoria_prescrizione.sql
-- D91 · D92 — la prescrizione diventa la SETTIMA categoria della foto, e prende
-- il quinto posto nell'ordine: subito prima della radiografia.
--
-- Perché una migration NUOVA e non una modifica di quella del 30/07:
--   la migration del 30/07 è già applicata e registrata nel ledger. Un vincolo
--   non si "aggiorna": si TOGLIE e si RIMETTE. Il file vecchio resta la storia
--   di com'era, questo è il vincolo in vigore.
--
-- 🛑 NESSUN BACKFILL, ed è una scelta e non una dimenticanza: le sei categorie
--    di prima sono tutte dentro le sette di adesso, quindi ogni riga esistente
--    resta valida. Un UPDATE qui toccherebbe righe che non hanno niente da
--    correggere.
--    ⚠️ Le foto che il wizard ha instradato su 'altro' PRIMA di questa
--    decisione (T11-bis, 01/08) NON si possono recuperare a colpo sicuro: nel
--    database sono indistinguibili dalle foto di chi ha scelto «Altro» — è il
--    costo che D74 aveva già dichiarato («l'album NON potrà distinguere "ho
--    scelto Altro" da "non ho risposto"»). Restano dove sono e si correggono a
--    mano dalla scheda, come ogni altro campo del lavoro.
--
-- 🔑 L'ORDINE non vive qui e non può vivere qui: un CHECK non ordina niente, e
--    l'ordinamento alfabetico darebbe 'altro' davanti a tutto (D71). L'ordine
--    sta in `src/lib/domain/categorie-foto.ts`, e la prova che i due elenchi
--    non divergano è `tests/unit/categorie-foto-spia-migration.test.ts`, che
--    da oggi legge QUESTO file.

-- ── provato: (R-P1) — il COMPORTAMENTO del vincolo, non la sua sintassi ────
-- Un `ADD CONSTRAINT` che riesce prova solo che il SQL si scrive così. La prova
-- che conta è un valore che DEVE essere rifiutato.
-- `provato:` 02/08/2026, questo file eseguito dentro `BEGIN … ROLLBACK` sul
-- database vero (🛑 transazione ANNULLATA: nessuna migration registrata, ledger
-- fermo — stesso confine della sonda del 30/07):
--   vincolo PRIMA → CHECK (categoria = ANY (ARRAY['impronta','pre_lavoro','colore','post_prova','rx','altro']))
--   vincolo DOPO  → CHECK (categoria = ANY (ARRAY['impronta','pre_lavoro','colore','post_prova','prescrizione','rx','altro']))
--   UPDATE categoria='pippo'        → RIFIUTATO  23514  new row for relation "lavori_immagini" violates check constraint "lavori_immagini_categoria_check"
--   UPDATE categoria='Prescrizione' → RIFIUTATO  23514  (stesso errore) 🔑 il vincolo distingue le MAIUSCOLE: l'etichetta a schermo è «Prescrizione», il valore è 'prescrizione'
--   UPDATE categoria='prescrizione' → ACCETTATO
--   UPDATE categoria='rx'           → ACCETTATO  (le sei di prima restano valide: è la ragione per cui non serve backfill)

-- 1. via il vincolo vecchio.
-- 🛑 `IF EXISTS` perché un ambiente ricostruito da zero potrebbe non averlo:
--    la migration deve poter girare due volte senza abortire (§8 — una
--    migration che aborta disallinea il ledger anche su dati di prova).
ALTER TABLE lavori_immagini
  DROP CONSTRAINT IF EXISTS lavori_immagini_categoria_check;

-- 2. il vincolo nuovo, con la settima.
ALTER TABLE lavori_immagini
  ADD CONSTRAINT lavori_immagini_categoria_check
  CHECK (categoria IN ('impronta','pre_lavoro','colore','post_prova','prescrizione','rx','altro'));

COMMENT ON COLUMN lavori_immagini.categoria IS
  'Categoria fotografica, elenco CHIUSO: sei voci ratificate da Francesco il 30/07/2026 (D72) piu'' ''prescrizione'', aggiunta il 02/08/2026 (D91). Asse distinto dal formato del file, che si deriva dall''estensione di storage_path. L''ordine di presentazione NON e'' qui: vive in src/lib/domain/categorie-foto.ts (D71, corretto da D92).';
