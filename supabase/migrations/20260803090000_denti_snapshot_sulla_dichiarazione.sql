-- D102 ② — la fotografia dei denti+colore si sposta da `lavori` a
-- `dichiarazioni_conformita`, dove le appartiene.
--
-- ═══ IL DIFETTO, ed è di CARDINALITÀ ═════════════════════════════════════════
-- `lavori.denti_snapshot` è UNA riga per lavoro. Le dichiarazioni per lavoro
-- sono N: `ddc_lavoro_attiva_unique` (20260710090000) è un unique PARZIALE
-- `WHERE stato <> 'annullata'` — una attiva, quante si vuole annullate. Alla
-- seconda emissione dopo un annullo, lo snapshot della prima verrebbe
-- SOVRASCRITTO: la dichiarazione annullata — che è l'unica prova di che cosa fu
-- dichiarato quel giorno, e per questo `20260710090000:11-12` la tiene «come
-- storia» — resterebbe col solo testo, senza il dato strutturato che lo
-- giustifica.
--
-- 🔑 La migration che le ha create (`20260727120200:51-58`) lo aveva già scritto
-- nel proprio commento, con un argomento PER EMISSIONE — «se nel frattempo viene
-- emessa una Dichiarazione che riporta il colore per dente, quella resta valida e
-- va conservata 10 anni. Lo schema non si aggiunge dopo un documento a valore
-- legale» — e poi le ha messe sulla riga MUTABILE. Il commento contraddiceva la
-- propria DDL. Qui si allinea la DDL al commento, non il contrario: la premessa
-- («lo schema nasce prima del writer») resta giusta, cambia solo dove.
--
-- ═══ PREREQUISITO VERIFICATO PRIMA DI APPLICARE ══════════════════════════════
-- Nessuno SCRIVE e nessuno LEGGE quelle due colonne. `grep -rn denti_snapshot`
-- su `src/`, `tests/` e `supabase/` (esclusi i tipi generati) restituisce **una
-- sola occorrenza**: la migration che le ha create. Il writer era dichiaratamente
-- rinviato a un'ondata futura. Quindi qui NON si migra un dato: si sposta dello
-- spazio riservato, e non c'è niente da perdere.
-- 🛑 Ed è esattamente il momento in cui costa zero. Fra un'ondata sarebbe una
-- migration su una tabella a valore legale, con dentro dei dati veri e dieci anni
-- di conservazione addosso.
--
-- ⚠️ Nessuna policy RLS, nessuna vista, nessun vincolo e nessuna funzione
-- PL/pgSQL nomina queste colonne: `DROP` e `ADD` non toccano il perimetro
-- tenant. Le due tabelle portano già `laboratorio_id` e sono già nella purga.

ALTER TABLE lavori
  DROP COLUMN IF EXISTS denti_snapshot,
  DROP COLUMN IF EXISTS denti_snapshot_at;

ALTER TABLE dichiarazioni_conformita
  ADD COLUMN IF NOT EXISTS denti_snapshot    jsonb,
  ADD COLUMN IF NOT EXISTS denti_snapshot_at timestamptz;

COMMENT ON COLUMN dichiarazioni_conformita.denti_snapshot IS
  'Fotografia strutturata di denti + colore AL MOMENTO DELL''EMISSIONE DI QUESTA dichiarazione. Writer in un''ondata futura; lo schema esiste prima del writer perché non si aggiunge uno schema dopo un documento a valore legale. Sta QUI e non su `lavori` perché le dichiarazioni per lavoro sono N (unique parziale su stato <> annullata): sulla riga del lavoro la seconda emissione sovrascriverebbe la prima, e la dichiarazione annullata resterebbe senza la prova di ciò che dichiarò (D102 ②).';

COMMENT ON COLUMN dichiarazioni_conformita.denti_snapshot_at IS
  'Quando la fotografia qui sopra è stata presa. Distinta da `data_emissione`: se un giorno la fotografia venisse presa prima dell''emissione, la differenza fra le due date è un fatto e va poter essere letta.';
