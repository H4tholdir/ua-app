-- 20260730150100_lavori_immagini_eliminazioni_log.sql
-- D63 — la rete di sicurezza della cancellazione FISICA della foto: chi ha
-- cancellato, quando, quale lavoro, quale percorso. 🛑 MAI l'immagine.
--
-- Perché serve: da D61 il DELETE della foto smette di essere morbido e toglie
-- davvero il file dall'archivio. Da quel momento il dato non è più
-- recuperabile, e l'unica cosa che resta a dimostrare che l'operazione è
-- avvenuta — e per mano di chi — è questa riga.
--
-- Base normativa, DICHIARATA per quello che è: Art. 28(3)(h) GDPR obbliga il
-- responsabile a mettere a disposizione del titolare «all information
-- necessary to demonstrate compliance». Che questo richieda UNA RIGA PER
-- CANCELLAZIONE è INFERENZA DICHIARATA, non citazione: la norma impone di
-- poter dimostrare, non prescrive la forma del registro.
--
-- 🛑 Quello che la tabella NON contiene, e non conterrà: nessun byte
--    dell'immagine, nessuna URL firmata, nessun dato del paziente. Un registro
--    di cancellazioni che conservasse la cosa cancellata sarebbe la
--    cancellazione annullata (Art. 5(1)(c), minimizzazione).
--
-- Forma ricalcata su `lab_stato_log` (001_commercial_infra.sql:85-97), che è
-- il precedente in casa di tabella di sola traccia: RLS abilitata e NESSUNA
-- policy pubblica — vi scrive e vi legge solo il ruolo di servizio.
CREATE TABLE IF NOT EXISTS lavori_immagini_eliminazioni (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id      UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id           UUID NOT NULL,
  lavori_immagine_id  UUID NOT NULL,
  storage_path        TEXT NOT NULL,
  eliminata_da        UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 🛑 Nessuna FK verso `lavori_immagini`: la riga di destinazione NON esiste
--    più nel momento stesso in cui questa viene scritta — una FK renderebbe
--    impossibile scrivere la traccia proprio nel caso per cui esiste.
-- 🛑 Nessuna FK verso `lavori` per la stessa ragione di durata: il lavoro può
--    sparire dopo, e la traccia deve sopravvivergli.
-- ⚠️ `laboratorio_id` la FK invece ce l'ha, con CASCADE: se il laboratorio se
--    ne va, la sua traccia se ne va con lui — è la stessa scelta di
--    `lab_stato_log`, ed è coerente con le quattro migrazioni di cancellazione
--    totale del laboratorio già in casa.
-- ⚠️ `eliminata_da` è NULLABLE e SENZA FK verso `utenti`: l'utente può essere
--    cancellato dopo, e una traccia che sparisce quando sparisce chi ha agito
--    è esattamente la traccia che non serve a niente.

CREATE INDEX IF NOT EXISTS idx_lav_img_elim_lab
  ON lavori_immagini_eliminazioni(laboratorio_id, created_at DESC);

ALTER TABLE lavori_immagini_eliminazioni ENABLE ROW LEVEL SECURITY;
-- Nessuna policy pubblica — solo service role (stesso regime di lab_stato_log
-- e di `inviti`). Senza policy, con RLS attiva, `anon` e `authenticated` non
-- leggono e non scrivono NULLA: fail-closed per costruzione.

COMMENT ON TABLE lavori_immagini_eliminazioni IS
  'D63 — traccia delle cancellazioni FISICHE di foto di lavoro. Contiene chi, quando, quale lavoro, quale percorso. MAI l''immagine, MAI una URL firmata, MAI dati del paziente.';
COMMENT ON COLUMN lavori_immagini_eliminazioni.storage_path IS
  'Percorso del file rimosso dal bucket `documenti`. È un percorso, non un collegamento: non è firmato e da solo non dà accesso a niente.';
COMMENT ON COLUMN lavori_immagini_eliminazioni.eliminata_da IS
  'utenti.id di chi ha eseguito la cancellazione. Nullable e senza FK: la traccia deve sopravvivere alla cancellazione dell''utente.';
