-- ════════════════════════════════════════════════════════════════════════════
-- T2 (05/08/2026) — la regola di isolamento dello Storage deve NEGARE, non
-- andare in errore.
--
-- 🔴 IL DIFETTO, MISURATO PRIMA DI TOCCARE (transazione annullata, ogni prova
--    col suo SAVEPOINT — senza, il primo errore aborta tutto e le prove dopo
--    non girano affatto):
--
--      SELECT ((storage.foldername('971061a1-…/lavori/x/y.jpg'))[1])::uuid
--        → 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c          ✅ consentito
--      SELECT ((storage.foldername('lavori/7dba9a57-…/1.webp'))[1])::uuid
--        → 🛑 ERRORE [22P02] invalid input syntax for type uuid: "lavori"
--      SELECT ((storage.foldername('../../etc/passwd'))[1])::uuid
--        → 🛑 ERRORE [22P02] invalid input syntax for type uuid: ".."
--      SELECT ((storage.foldername('soloilnome.jpg'))[1])::uuid
--        → NULL                                           ✅ già negava
--
-- 🔑 PERCHÉ UN ERRORE NON È UN DINIEGO. Una policy che nega restituisce zero
--    righe: il chiamante vede «non c'è», e il sistema resta in piedi. Una
--    policy che ESPLODE fa fallire l'intera istruzione con un errore di
--    database — e un errore non è una decisione di sicurezza: è un
--    comportamento non progettato, che a seconda di come il chiamante lo
--    gestisce può diventare qualunque cosa. Per giunta il messaggio dice il
--    nome del tipo e il valore, cioè racconta com'è fatto il controllo a chi
--    lo sta sondando.
--
-- 🛑 OGGI QUELLA MINA DORME, e per un motivo che sta per finire: ogni scrittura
--    e ogni lettura passa dal client di servizio, che salta le policy. Il
--    caricamento diretto (T3) porta il BROWSER dentro quel corridoio.
--
-- 🔎 E LE POLICY SONO OTTO, NON QUATTRO. Il piano ne nominava quattro (bucket
--    `documenti`). Il censimento sul catalogo vivo (`pg_policies`) ne trova
--    **8** con lo stesso identico cast: 4 su `documenti` e 4 su `fatture-pdf`.
--    Si chiudono tutte, e con UNA funzione sola — cinque repliche dello stesso
--    difetto insegnano che va censito il *modo di scrivere il controllo*, non
--    la singola istanza.
--
-- ⚠️ LE POLICY NON ERANO IN `supabase/migrations/`: sono nate da pannello
--    (`provato:` grep `'documenti'` su `supabase/` → 0 hit). Da qui in avanti
--    vivono nel repo, come tutto il resto.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── La guardia di forma, PRIMA del cast ────────────────────────────────────
-- Restituisce il laboratorio scritto nella prima cartella, oppure NULL se
-- quella cartella non ha la forma di un uuid. `NULL IN (…)` in una policy vale
-- come «no»: il diniego arriva senza che nulla esploda.
--
-- 🔑 Il confronto della forma è `~*` (senza distinzione fra maiuscole e
--    minuscole) perché il cast a uuid accetta entrambe: una guardia più severa
--    del controllo che protegge cambierebbe il comportamento su percorsi che
--    oggi sono legittimi.
CREATE OR REPLACE FUNCTION public.storage_lab_del_percorso(nome text)
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN (storage.foldername(nome))[1] ~*
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ((storage.foldername(nome))[1])::uuid
    ELSE NULL
  END
$$;

COMMENT ON FUNCTION public.storage_lab_del_percorso(text) IS
  'T2 (05/08/2026): il laboratorio scritto nella prima cartella di un percorso di Storage, o NULL se quella cartella non ha forma di uuid. Esiste perché il cast nudo ((storage.foldername(name))[1])::uuid NON nega su un percorso malformato: va in ERRORE 22P02, e un errore non è una decisione di sicurezza.';

-- Le policy sono valutate come l'utente che fa la richiesta.
GRANT EXECUTE ON FUNCTION public.storage_lab_del_percorso(text) TO anon, authenticated, service_role;

-- ─── Le otto policy, riscritte sulla guardia ────────────────────────────────
-- Stessa semantica di prima per ogni percorso VALIDO; su un percorso malformato
-- si passa da «errore» a «negato». La condizione in più di `fatture-pdf`
-- (le ricevute SdI restano fuori) è conservata parola per parola.

DROP POLICY IF EXISTS "documenti: lettura per membri lab" ON storage.objects;
CREATE POLICY "documenti: lettura per membri lab" ON storage.objects FOR SELECT
USING (
  bucket_id = 'documenti'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documenti: upload per membri lab" ON storage.objects;
CREATE POLICY "documenti: upload per membri lab" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documenti'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documenti: update per membri lab" ON storage.objects;
CREATE POLICY "documenti: update per membri lab" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documenti'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'documenti'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documenti: delete per membri lab" ON storage.objects;
CREATE POLICY "documenti: delete per membri lab" ON storage.objects FOR DELETE
USING (
  bucket_id = 'documenti'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "fatture-pdf: lettura per membri lab" ON storage.objects;
CREATE POLICY "fatture-pdf: lettura per membri lab" ON storage.objects FOR SELECT
USING (
  bucket_id = 'fatture-pdf'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
  AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
);

DROP POLICY IF EXISTS "fatture-pdf: upload per membri lab" ON storage.objects;
CREATE POLICY "fatture-pdf: upload per membri lab" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fatture-pdf'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
  AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
);

DROP POLICY IF EXISTS "fatture-pdf: update per membri lab" ON storage.objects;
CREATE POLICY "fatture-pdf: update per membri lab" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fatture-pdf'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
  AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
)
WITH CHECK (
  bucket_id = 'fatture-pdf'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
  AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
);

DROP POLICY IF EXISTS "fatture-pdf: delete per membri lab" ON storage.objects;
CREATE POLICY "fatture-pdf: delete per membri lab" ON storage.objects FOR DELETE
USING (
  bucket_id = 'fatture-pdf'
  AND public.storage_lab_del_percorso(name) IN (
    SELECT laboratorio_id FROM public.lab_memberships WHERE user_id = auth.uid()
  )
  AND COALESCE((storage.foldername(name))[2], '') <> 'ricevute-sdi'
);
