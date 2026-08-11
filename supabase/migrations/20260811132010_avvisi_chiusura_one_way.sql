-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- Riga 58 della coda (revisione finale di ramo, 11/08/2026, area banca dati):
-- un avviso GIÀ COMUNICATO restava riscrivibile — e perfino riapribile — da
-- chiunque avesse il GRANT delle quattro colonne (20260809124517): il ritorno
-- a 'da_comunicare' coi tre NULL soddisfa avviso_comunicato_ha_autore_e_data
-- e avviso_testo_solo_se_dall_app, e nessun trigger esisteva (pg_trigger: 0).
-- `provato:` 11/08/2026, transazione annullata sul banco vero — riapertura coi
-- tre NULL: RIUSCITA; riattribuzione della firma a un altro utente: RIUSCITA.
-- COMMENT ON TABLE dichiara questa tabella «la prova che è avvenuta» (GDPR
-- Art. 5(2)): una prova riscrivibile a piacere non è una prova.
--
-- ═══ IL RIMEDIO: TRIGGER DI TRANSIZIONE ONE-WAY ══════════════════════════════
-- Una riga con stato ≠ 'da_comunicare' non cambia MAI più le quattro colonne
-- della chiusura: stato, comunicato_at, comunicato_da, testo_inviato. Le altre
-- colonne restano libere DI PROPOSITO: visto_dal_dentista_at è la ricevuta di
-- lettura (avvisi_segna_visti scrive DOPO la chiusura, è il suo mestiere) e
-- campi_corretti ha già una nota che ne anticipa gli update su avvisi vecchi
-- (20260809133546:60-67).
--
-- PERCHÉ IL TRIGGER E NON IL MODELLO REVOKE+RPC (valutazione_supera,
-- 20260806142910): là l'UPDATE era revocabile PER INTERO perché nessuna rotta
-- lo usava; qui la chiusura legittima È un UPDATE di rotta
-- (src/app/api/lavori/[id]/avviso/route.ts:414-420, ridisegnato da D354 e
-- collaudato sul banco vero il 10/08). Revocare e spostare in RPC
-- riscriverebbe una rotta appena approvata; il trigger chiude il buco per
-- OGNI attore (service_role col suo BYPASSRLS compreso) senza toccare una
-- riga di server. Il GRANT per colonna resta: serve alle righe APERTE.
--
-- I flussi vivi NON incontrano il trigger, misurato prima di scriverlo:
-- · la rotta di chiusura filtra .in('stato', STATI_APERTI) — mai una riga chiusa;
-- · correggi_e_riemetti_atomica fa un INSERT, mai update (20260809133546:488);
-- · avvisi_segna_visti tocca solo visto_dal_dentista_at (20260810072748:41-45).

CREATE FUNCTION public.avviso_chiusura_one_way()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stato         IS DISTINCT FROM OLD.stato
  OR NEW.comunicato_at IS DISTINCT FROM OLD.comunicato_at
  OR NEW.comunicato_da IS DISTINCT FROM OLD.comunicato_da
  OR NEW.testo_inviato IS DISTINCT FROM OLD.testo_inviato
  THEN
    RAISE EXCEPTION
      'trg_avviso_chiusura_one_way: l''avviso % è già comunicato (stato %): stato, autore, data e testo non si riscrivono — la riga è la prova (GDPR Art. 5(2))',
      OLD.id, OLD.stato;
  END IF;
  RETURN NEW;
END;
$$;

-- Una funzione RETURNS trigger non è chiamabile direttamente («trigger
-- functions can only be called as triggers»), ma l'idioma di casa REVOca
-- comunque: dopo un CREATE, Postgres concede EXECUTE a PUBLIC.
REVOKE ALL ON FUNCTION public.avviso_chiusura_one_way() FROM PUBLIC, anon, authenticated;

-- La WHEN tiene il trigger FUORI dal percorso caldo: sulle righe aperte
-- (la chiusura legittima, l'unico UPDATE che l'app esegue) non scatta affatto.
CREATE TRIGGER trg_avviso_chiusura_one_way
  BEFORE UPDATE ON public.avvisi_dentista
  FOR EACH ROW
  WHEN (OLD.stato <> 'da_comunicare')
  EXECUTE FUNCTION public.avviso_chiusura_one_way();

COMMENT ON FUNCTION public.avviso_chiusura_one_way() IS
  'Riga 58: dopo la chiusura, stato/comunicato_at/comunicato_da/testo_inviato '
  'sono congelati per OGNI attore (service_role compreso). visto_dal_dentista_at '
  'e campi_corretti restano liberi di proposito. La riga è la prova ex Art. 5(2) '
  'GDPR: one-way, senza strada di ritorno.';
