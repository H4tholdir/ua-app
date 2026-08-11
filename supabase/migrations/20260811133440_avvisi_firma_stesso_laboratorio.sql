-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- Riga 59 della coda (revisione finale di ramo, 11/08/2026): comunicato_da era
-- una FK SEMPLICE verso utenti(id) — la RLS vincola solo laboratorio_id, quindi
-- la chiusura poteva essere attribuita a un utente di UN ALTRO laboratorio.
-- `provato:` 11/08, transazione annullata: la firma di un avviso chiuso si
-- spostava su un utente con laboratorio_id NULL, senza errori.
-- È la stessa classe che il ramo ha bollato CRITICA e chiuso con la FK
-- COMPOSITA in 20260806142910 (tre volte: eventi_qualita→lavori,
-- valutazioni_evento→eventi_qualita, lavori_rifacimenti→eventi_qualita) —
-- qui non applicata perché a utenti mancava il bersaglio UNIQUE.
--
-- ═══ I DUE ATTI ══════════════════════════════════════════════════════════════
-- ① Il bersaglio: UNIQUE (id, laboratorio_id) su utenti. id è già PK, quindi
--    la coppia è unica per costruzione: il vincolo non può fallire sui dati
--    esistenti e costa un indice. Modello di nome: lavori_id_lab_uk
--    (20260727120000), eventi_qualita_id_lab_uk (20260806142910).
-- ② La sostituzione: via la _fkey semplice, dentro la composita. MATCH SIMPLE
--    (default): sulle righe APERTE comunicato_da è NULL e la FK non morde;
--    sulle righe CHIUSE la coppia (autore, laboratorio dell'avviso) DEVE
--    esistere in utenti — cioè l'autore è del laboratorio dell'avviso.
--    NO ACTION (default), come il modello e come la _fkey che sostituisce.
--
-- `provato:` prima di scrivere: 0 firme cross-tenant nei dati vivi (la ADD
-- CONSTRAINT valida le righe esistenti senza pulizia) · admin_delete_laboratorio
-- porta via gli avvisi IN CASCATA (dichiarazioni_conformita e lavori) PRIMA di
-- toccare utenti, quindi la composita non cambia la cancellazione di un lab ·
-- l'unico admin_sistema (lab NULL) non è mai una firma legittima: D342 esclude
-- admin_rete e admin_sistema PER NOME dalla chiusura (RUOLI_CHIUSURA_AVVISO).
--
-- ⚠️ Il nome cambia (…_fkey → …_fk, convenzione delle composite): i tre punti
-- che lo nominavano sono censiti nel piano — database.types.ts (rigenerato),
-- avvisi-dentista-schema.rpc.test.ts:349 (aggiornato nello stesso task),
-- ROADMAP riga 43 (citazione storica, resta).

ALTER TABLE public.utenti
  ADD CONSTRAINT utenti_id_lab_uk UNIQUE (id, laboratorio_id);

ALTER TABLE public.avvisi_dentista
  DROP CONSTRAINT avvisi_dentista_comunicato_da_fkey,
  ADD CONSTRAINT avvisi_dentista_comunicato_da_fk
    FOREIGN KEY (comunicato_da, laboratorio_id)
    REFERENCES public.utenti (id, laboratorio_id);

COMMENT ON CONSTRAINT avvisi_dentista_comunicato_da_fk ON public.avvisi_dentista IS
  'Riga 59: la firma della chiusura è un utente DELLO STESSO laboratorio. '
  'Composita anti cross-tenant, modello 20260806142910. MATCH SIMPLE: le righe '
  'aperte (comunicato_da NULL) non sono vincolate.';
