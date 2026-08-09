-- ═══════════════════════════════════════════════════════════════════════════
-- avvisi_dentista — l'UPDATE si stringe alle QUATTRO colonne della chiusura.
--
-- 🔴 IL DIFETTO CHE QUESTA MIGRATION CHIUDE, e l'ho introdotto io un'ora fa.
--
-- La migration 20260809123206 ha aggiunto `REVOKE ALL` + `GRANT SELECT,
-- UPDATE` con la motivazione giusta — «la RLS non basta, service_role la
-- aggira» — e poi ha concesso un UPDATE **su tutta la riga**. Il ragionamento
-- era stato fatto per l'INSERT e lasciato a metà per l'UPDATE.
--
-- Perché è grave su QUESTA tabella: `COMMENT ON TABLE` la dichiara «la prova
-- che è avvenuta» e cita GDPR Art. 5(2), dove l'onere della prova è del
-- titolare. Con l'UPDATE su tutta la riga, chiunque poteva riscrivere
-- `comunicato_da` (cambiare l'autore), retrodatare `comunicato_at`, riscrivere
-- il `testo_inviato` già mandato, o ripuntare la riga a un altro lavoro. Una
-- prova riscrivibile a piacere non è una prova.
--
-- 🔑 E il ruolo non protegge niente: `getServiceClient` — cioè `service_role`,
-- che ha `rolbypassrls = true` — è il client sia delle rotte
-- (`src/app/api/lavori/[id]/route.ts:2`) sia del portale
-- (`src/app/portale/[token]/page.tsx:1`). Quindi **il permesso per colonna è
-- l'unica cosa che limita davvero cosa una rotta può scrivere.**
--
-- Il precedente in casa andava già in questa direzione e non l'avevo seguito
-- fino in fondo: `valutazioni_evento` riceve `GRANT SELECT, INSERT` e
-- **nessun UPDATE**, con l'unica transizione legittima dentro una funzione
-- SECURITY DEFINER (D274 ②, migration 20260806170700).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Si toglie l'UPDATE su tutta la riga, e si toglie del tutto ad `anon`:
--    il portale non scrive con la chiave anonima, scrive con service_role.
REVOKE UPDATE ON public.avvisi_dentista FROM anon, authenticated, service_role;

-- 2. Le QUATTRO colonne della chiusura del promemoria, e nessuna di più.
--    Sono esattamente quelle che serve scrivere per passare da
--    `da_comunicare` a uno dei due stati chiusi (⚖️ D335 · D339):
--      stato · comunicato_at · comunicato_da · testo_inviato
GRANT UPDATE (stato, comunicato_at, comunicato_da, testo_inviato)
  ON public.avvisi_dentista TO authenticated, service_role;

-- 🛑 `visto_dal_dentista_at` NON È CONCESSO A NESSUNO, ED È DELIBERATO.
--    È la traccia che il dentista ha aperto l'avviso nel portale (⚖️ D332):
--    è l'unico campo di questa tabella che NON è un atto del laboratorio.
--    Se il laboratorio potesse scriverlo, potrebbe **fabbricare la prova di
--    essere stato letto** — cioè esattamente il fatto che la tabella esiste
--    per documentare. Con `service_role` che aggira la RLS, il solo confine
--    possibile è questo permesso.
--    ➡️ Il Task 8 (la sezione «Avvisi» del portale) NON potrà scriverlo con un
--    UPDATE diretto: dovrà passare da una funzione SECURITY DEFINER, che è il
--    modello già in casa (`valutazione_supera`) e il posto giusto per
--    registrare un fatto che nessun ruolo dell'app deve poter alterare.
--    🔴 Se il Task 8 preferisse un GRANT di colonna, quella è una decisione
--    che va scritta, non presa di striscio: è la differenza fra una ricevuta
--    di lettura e un'autocertificazione.

-- ⚠️ E `has_table_privilege(ruolo, tabella, 'UPDATE')` ora risponde **false**:
--    con un permesso per colonna il privilegio di tabella non c'è più. La
--    verifica giusta è `has_column_privilege`, colonna per colonna — ed è così
--    che la prova (p2) è stata riscritta. Una prova che DEVE cambiare è la
--    dimostrazione che il permesso si è mosso davvero.

COMMENT ON COLUMN public.avvisi_dentista.visto_dal_dentista_at IS
  'Quando il dentista ha aperto l''avviso nel portale (D332). Non chiude il '
  'promemoria: chiuderlo e'' un atto del laboratorio, non del destinatario. '
  'UPDATE NON concesso a nessun ruolo dell''app: il laboratorio non deve '
  'poter fabbricare la prova di essere stato letto. Serve una SECURITY '
  'DEFINER (modello: valutazione_supera).';
