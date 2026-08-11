-- supabase/migrations/20260806170700_d274_difetti_vivi_intervento.sql
-- D274 (centodecima tornata del verbale, 06/08/2026): i due difetti VIVI trovati dal panel
-- su D273, chiusi subito benché fuori dal mandato dell'ondata «si deve sempre poter
-- intervenire». Nessuno dei due era nella proposta: sono usciti cercando dove si rompeva.
--
-- 🛑 CIÒ CHE QUESTA MIGRATION **NON** FA, E NON DEVE FARE FINCHÉ NON ARRIVA IL RITIRO.
-- D273 ① dice che un evento di qualità non si cancella. Il `REVOKE DELETE` su
-- `eventi_qualita` **non è qui**, ed è deliberato: senza il ritiro morbido (② di D273 —
-- un evento ritirato con motivo, escluso dagli elenchi E dai conteggi) il solo divieto di
-- cancellare è il difetto che il panel ha trovato, non la sua correzione. Un evento nato da
-- un dito scivolato che non si può togliere resta per sempre dentro i conteggi, e quei
-- conteggi finiscono nel rapporto periodico dovuto per legge
-- (`src/app/api/qualita/psur/route.ts:190`).
-- ➡️ ① e ② di D273 vanno insieme, in un compito solo. Chi «completasse» questa migration
--    aggiungendo il REVOKE DELETE da solo costruirebbe un generatore di numeri falsi.

-- ============================================================================
-- DIFETTO 1 — la cancellazione di un laboratorio si sarebbe rotta al primo tenant
--             con un evento di qualità registrato
-- ============================================================================
-- `admin_delete_laboratorio` enumera le tabelle A MANO, e le due nate col Task 1 non
-- c'erano. `eventi_qualita_lavoro_fk` è NO ACTION (misurato: `confdeltype='a'`), quindi
-- `DELETE FROM lavori` **aborta**.
-- `provato:` prima di questa migration, su transazione annullata, con 1 evento e 1
-- valutazione sul lab E2E:
--   SQLSTATE 23503: update or delete on table "lavori" violates foreign key constraint
--   "eventi_qualita_lavoro_fk" on table "eventi_qualita"
-- ⚠️ Latente, non già rotto: le due tabelle hanno 0 righe. Sarebbe scattato al primo
-- laboratorio vero — cioè quando costa un incidente invece di niente.
--
-- 🔑 È LO STESSO PASSO FALSO GIÀ DOCUMENTATO TRE RIGHE SOPRA, nella stessa funzione
-- («DEVE stare PRIMA di DELETE FROM lavori», 21/07 per le cassette e 27/07 per i denti).
-- Il commento c'era, la lezione no: chi crea una tabella che punta a `lavori` non passa
-- da qui. Per questo l'ordine sotto porta di nuovo il suo perché scritto.
--
-- L'ORDINE È PORTANTE, e sono tre vincoli, non uno:
--   · `lavori_rifacimenti.evento_id → eventi_qualita` (composita, NO ACTION) → i
--     rifacimenti si cancellano PRIMA degli eventi. Già a posto: riga «lavori_rifacimenti»
--     più su, invariata.
--   · `valutazioni_evento.evento_id → eventi_qualita` (composita, NO ACTION) → le
--     valutazioni PRIMA degli eventi.
--   · `eventi_qualita.lavoro_id → lavori` (composita, NO ACTION) → gli eventi PRIMA dei
--     lavori.
CREATE OR REPLACE FUNCTION public.admin_delete_laboratorio(p_lab_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_nome TEXT;
  v_counts JSONB := '{}';
  v_n INT;
BEGIN
  SELECT nome INTO v_nome FROM laboratori WHERE id = p_lab_id;
  IF v_nome IS NULL THEN
    RETURN jsonb_build_object('error', 'Laboratorio non trovato');
  END IF;

  DELETE FROM lavori_materiali        WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_materiali', v_n);
  DELETE FROM lavori_fasi             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_fasi', v_n);
  DELETE FROM lavori_lavorazioni      WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_lavorazioni', v_n);
  DELETE FROM lavori_immagini         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_immagini', v_n);
  DELETE FROM lavori_rifacimenti      WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_rifacimenti', v_n);
  DELETE FROM lavori_appuntamenti     WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_appuntamenti', v_n);
  DELETE FROM lavoro_prove            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavoro_prove', v_n);
  DELETE FROM dichiarazioni_conformita WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('dichiarazioni_conformita', v_n);
  DELETE FROM buoni_consegna          WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('buoni_consegna', v_n);
  DELETE FROM appuntamenti            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('appuntamenti', v_n);

  -- ⬇️ AGGIUNTA 21/07/2026 (Parete delle Cassette). DEVE stare PRIMA di DELETE FROM lavori:
  --    cassette_lavori.lavoro_id → lavori(id) è NO ACTION.
  v_counts := v_counts || public.cassette_purge_lab(p_lab_id);


  -- ⬇️ AGGIUNTA 27/07/2026 (ondata a del wizard «Nuovo lavoro»). DEVE stare PRIMA
  --    della cancellazione di lavori: lavori_denti la referenzia con FK composita
  --    (lavoro_id, laboratorio_id) → lavori (id, laboratorio_id), NO ACTION.
  DELETE FROM lavori_denti WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_denti', v_n);

  -- ⬇️ AGGIUNTA 06/08/2026 (D274, ondata «si deve sempre poter intervenire»).
  --    DUE righe e il loro ordine è portante:
  --    ① valutazioni_evento PRIMA di eventi_qualita
  --       (valutazioni_evento.evento_id → eventi_qualita, FK composita NO ACTION);
  --    ② eventi_qualita PRIMA di lavori
  --       (eventi_qualita.lavoro_id → lavori, FK composita NO ACTION).
  --    lavori_rifacimenti.evento_id → eventi_qualita è già coperta: quella riga sta più
  --    su, e cancella i rifacimenti prima che gli eventi spariscano.
  --    ⚠️ Un `DELETE ... WHERE laboratorio_id` unico basta anche per l'auto-riferimento
  --    valutazioni_evento.sostituisce_id: è NO ACTION, e il controllo avviene a fine
  --    istruzione, quando le righe che si puntavano a vicenda sono già andate insieme.
  DELETE FROM valutazioni_evento WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('valutazioni_evento', v_n);
  DELETE FROM eventi_qualita     WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('eventi_qualita', v_n);

  DELETE FROM lavori                  WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori', v_n);
  DELETE FROM portale_accessi         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('portale_accessi', v_n);
  DELETE FROM prescrizioni_digitali   WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('prescrizioni_digitali', v_n);
  DELETE FROM pazienti                WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('pazienti', v_n);
  DELETE FROM clienti                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('clienti', v_n);
  DELETE FROM fatture_righe           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fatture_righe', v_n);
  DELETE FROM fatture_pagamenti       WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fatture_pagamenti', v_n);
  DELETE FROM sdi_receipts            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('sdi_receipts', v_n);
  DELETE FROM fatture                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fatture', v_n);
  DELETE FROM lotti_magazzino         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lotti_magazzino', v_n);
  DELETE FROM magazzino               WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('magazzino', v_n);
  DELETE FROM ordini_righe            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('ordini_righe', v_n);
  DELETE FROM ordini_acquisto         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('ordini_acquisto', v_n);
  DELETE FROM fornitori               WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fornitori', v_n);
  DELETE FROM listino_prezzi_tier     WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('listino_prezzi_tier', v_n);
  DELETE FROM listino                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('listino', v_n);
  DELETE FROM rischi_tipo_dispositivo WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('rischi_tipo_dispositivo', v_n);
  DELETE FROM risk_analyses           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('risk_analyses', v_n);
  DELETE FROM incidenti_mdr           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('incidenti_mdr', v_n);
  DELETE FROM fascicoli_tecnici       WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fascicoli_tecnici', v_n);
  DELETE FROM psur                    WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('psur', v_n);
  DELETE FROM fasi_produzione         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fasi_produzione', v_n);
  DELETE FROM cicli_produzione        WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cicli_produzione', v_n);
  DELETE FROM istruzioni_uso          WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('istruzioni_uso', v_n);
  DELETE FROM nomine_prrc             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('nomine_prrc', v_n);
  DELETE FROM prrc_nomine             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('prrc_nomine', v_n);
  DELETE FROM prima_nota              WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('prima_nota', v_n);
  DELETE FROM messaggi                WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('messaggi', v_n);
  DELETE FROM notifiche               WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('notifiche', v_n);
  DELETE FROM data_processing_agreements WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('data_processing_agreements', v_n);
  DELETE FROM reti_membri             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('reti_membri', v_n);
  DELETE FROM tecnici                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('tecnici', v_n);
  DELETE FROM dashboard_kpi_cache     WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('dashboard_kpi_cache', v_n);
  DELETE FROM lab_stato_log           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lab_stato_log', v_n);
  DELETE FROM lab_memberships         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lab_memberships', v_n);
  DELETE FROM inviti                  WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('inviti', v_n);

  DELETE FROM utenti
    WHERE laboratorio_id = p_lab_id AND ruolo <> 'admin_sistema';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('utenti', v_n);

  -- Scollega admin_sistema dal lab (NULL) senza eliminarli
  UPDATE utenti
    SET laboratorio_id = NULL
    WHERE laboratorio_id = p_lab_id AND ruolo = 'admin_sistema';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('utenti_admin_scollegati', v_n);

  DELETE FROM laboratori WHERE id = p_lab_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('laboratori', v_n);

  RETURN jsonb_build_object('ok', true, 'nome', v_nome, 'deleted', v_counts);
END;
$function$;

-- ============================================================================
-- DIFETTO 2 — «la garanzia la dà il DATABASE» era una frase FALSA: TRUNCATE
--             era rimasto concesso
-- ============================================================================
-- `20260806140823_eventi_qualita.sql:78` dichiara `valutazioni_evento` sola-aggiunta «la
-- garanzia la dà il DATABASE», e `20260806142910:64` revoca UPDATE e DELETE ai tre ruoli
-- (E8, service_role compreso). Ma il permesso TRUNCATE è rimasto: `TRUNCATE` **ignora la
-- RLS** e svuota la tabella di TUTTI i laboratori insieme.
-- `provato:` prima di questa migration, in transazione annullata:
--   BEGIN; SET LOCAL ROLE authenticated; TRUNCATE public.valutazioni_evento;  → RIUSCITO
--
-- La forma corretta è già in casa e porta il suo perché: `REVOKE ALL` (che chiude anche
-- TRUNCATE/REFERENCES/TRIGGER) più il `GRANT` esplicito di ciò che serve davvero —
-- `20260721090000_parete_cassette.sql:122-139`.
-- ⚠️ Il GRANT sotto è esattamente `SELECT, INSERT`: né UPDATE né DELETE tornano, o si
-- riaprirebbe la sola-aggiunta nella migration che la difende.
REVOKE ALL ON public.valutazioni_evento FROM anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.valutazioni_evento TO anon, authenticated, service_role;

-- `eventi_qualita`: qui si revoca SOLO TRUNCATE, con la mano leggera.
-- Un `REVOKE ALL` obbligherebbe a ri-concedere SELECT, INSERT **e UPDATE**, e sbagliare
-- quel terzo verbo romperebbe D262 («la PWA non dà blocchi») dentro la migration che lo
-- cita. TRUNCATE invece non è mai un gesto legittimo di nessun utente — svuota tutti i
-- tenant insieme — e toglierlo non blocca nessuna correzione.
-- `provato:` nessun uso di TRUNCATE nel codice applicativo (`grep` su src/ e scripts/) e
-- nessuna funzione del progetto lo contiene (`pg_proc.prosrc ILIKE '%TRUNCATE%'` → 0).
REVOKE TRUNCATE ON public.eventi_qualita FROM anon, authenticated, service_role;

COMMENT ON TABLE public.valutazioni_evento IS
  'Append-only (D270). Una classificazione sbagliata si supera con una riga nuova che punta alla '
  'precedente e ne dichiara il motivo; la vecchia si marca superata=true via valutazione_supera(). '
  'MAI un UPDATE del giudizio: ISO 13485 §4.2.5 chiede che le modifiche a una registrazione restino '
  'identificabili. ⚠️ 06/08/2026 (D274): fino a questa migration la frase «la garanzia la dà il '
  'DATABASE» era FALSA — UPDATE e DELETE erano revocati ma TRUNCATE no, e TRUNCATE ignora la RLS.';

COMMENT ON TABLE public.eventi_qualita IS
  'Il FATTO: cosa è successo, chi lo ha segnalato, quando lo si è saputo. Non cambia lo stato del '
  'lavoro (D266). ⚠️ D273 (06/08/2026) ha stabilito che un evento non si cancella mai in modo '
  'definitivo ma si RITIRA dichiarando il motivo, uscendo da elenchi e conteggi. Qui è chiuso solo '
  'TRUNCATE: il REVOKE DELETE arriva INSIEME al ritiro, mai prima — da solo terrebbe dentro i '
  'conteggi ogni riga nata da un tocco sbagliato.';
