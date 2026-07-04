-- supabase/migrations/20260704140000_b18_fasi_produzione_partial_unique_index.sql
-- UÀ Migration — B18: indice UNIQUE parziale su fasi_produzione.
--
-- Il vincolo UNIQUE (ciclo_id, codice_fase) esistente
-- (fasi_produzione_ciclo_id_codice_fase_key) conta anche le righe
-- soft-deletate (deleted_at IS NOT NULL). Riusare un codice_fase appena
-- rimosso — nella stessa richiesta batch di salva_fasi_ciclo_atomico() o in
-- una richiesta successiva — collide con la riga soft-deletata invece di
-- poter essere reinserito (500 pulito grazie all'atomicità della RPC, ma
-- comunque un blocco reale e visibile all'utente). Finding B18.2.
--
-- Fix: sostituire il vincolo con un indice UNIQUE parziale, valido solo per
-- le righe attive — un Postgres CONSTRAINT non supporta una clausola WHERE,
-- quindi serve un indice esplicito al suo posto.
--
-- Verificato prima dell'applicazione (04/07/2026): 371 righe in fasi_produzione,
-- tutte attive (deleted_at IS NULL), 0 soft-deletate — nessun conflitto
-- possibile con i dati esistenti.

ALTER TABLE fasi_produzione
  DROP CONSTRAINT fasi_produzione_ciclo_id_codice_fase_key;

CREATE UNIQUE INDEX fasi_produzione_ciclo_id_codice_fase_active_key
  ON fasi_produzione (ciclo_id, codice_fase)
  WHERE deleted_at IS NULL;
