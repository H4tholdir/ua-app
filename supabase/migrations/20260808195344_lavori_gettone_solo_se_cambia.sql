-- ⚖️ D323 — IL GETTONE DI `lavori` SI MUOVE SOLO SE CAMBIA DAVVERO QUALCOSA.
--
-- Centoquarantunesima tornata di
-- `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`.
--
-- ── IL DIFETTO CHE QUESTA MIGRATION CHIUDE ──────────────────────────────────
--
-- L'atto unico «correggi e rifai la dichiarazione» fa DUE chiamate HTTP:
--   ① `POST /api/lavori/[id]/eventi-qualita`   → registra l'evento di qualità
--   ② `POST /api/lavori/[id]/dichiarazione/riemetti` con `atteso_updated_at`
--
-- La ① incrementa `lavori.post_consegna_correzioni`
-- (`eventi-qualita/route.ts`, `incrementaCorrezioni`), e fin qui è un contatore
-- interno che NESSUNO legge. Ma il trigger `trg_lavori_updated_at` esegue
-- `trigger_set_updated_at()`, il cui corpo è `NEW.updated_at = now();` senza
-- nessuna condizione: quindi la ① sposta da sola il gettone di concorrenza che
-- la ② deve mandare. Due richieste HTTP = due transazioni = due `now()`.
--
-- ➡️ CONFLITTO FALSO su ogni tentativo, e non è «solo» un 409: il PDF si rende
--    e il progressivo si prende PRIMA della transazione (`generate-ddc.ts`),
--    quindi ogni tentativo brucia un numero e lascia un file orfano.
--
-- 🛑 E LA COSA PIÙ GRAVE NON È IL BLOCCO: è la via d'uscita che la persona
--    scopre da sola. `incrementaCorrezioni` salta l'incremento quando
--    `stato_dispositivo = 'mai_uscito_dal_lab'`, quindi rispondere «il
--    manufatto non è mai uscito dal laboratorio» fa funzionare tutto — cioè
--    esattamente la dichiarazione falsa che il Task A ha tolto lo stesso
--    giorno, su un campo che alimenta la classificazione ISO. Un difetto che
--    rende impossibile la strada onesta e funzionante quella disonesta è
--    peggio di un difetto che blocca tutto.
--
-- ── PERCHÉ UNA FUNZIONE PROPRIA E NON UNA MODIFICA A QUELLA CONDIVISA ───────
--
-- 🛑 `trigger_set_updated_at()` è CONDIVISA da tutte le tabelle del progetto
--    (`apply_updated_at_trigger`, `supabase/schema.sql:58-83`, ~20 chiamate) e
--    NON si tocca: cambiarla cambierebbe il significato di `updated_at` su
--    laboratori, clienti, pazienti, fatture, magazzino… cioè su venti tabelle
--    per risolvere il problema di una. `lavori` riceve la SUA, con un nome
--    proprio, e questo commento esiste perché una pulizia futura non la
--    «unifichi ai duplicati» riaprendo tutto in silenzio.
--
-- ── IL CRITERIO DELL'ESENZIONE, scritto qui perché non si deduce dal codice ─
--
-- Si esenta SOLO una colonna che non compare su NESSUN documento e su NESSUNA
-- schermata che l'operatrice conferma. `post_consegna_correzioni` è l'unica:
-- è un contatore interno, non stampato da nessuna parte, e il censimento del
-- panel ha misurato ZERO consumatori in tutta l'app.
-- ⚠️ ATTENUANTE DICHIARATA: il predicato è scritto per SOTTRAZIONE, quindi una
--    colonna nuova entra DA SOLA dalla parte protetta (fail-closed). Chi
--    aggiunge una colonna non deve ricordarsi di niente; chi vuole esentarne
--    una deve venire qui e scriverlo.

-- ═══════════════════════════════════════════════════════════════════════════
--  🔴 DOVE LA FORMA RATIFICATA È STATA CORRETTA, E LA CORREZIONE È MISURATA
-- ═══════════════════════════════════════════════════════════════════════════
--
-- La forma provata dal panel escludeva dal confronto DUE chiavi:
--
--     to_jsonb(OLD) - 'post_consegna_correzioni' - 'updated_at'
--        IS NOT DISTINCT FROM
--     to_jsonb(NEW) - 'post_consegna_correzioni' - 'updated_at'
--
-- Quella forma pinza il gettone anche quando il chiamante ha assegnato
-- `updated_at` DI PROPOSITO — ed è proprio così che DUE penne del catalogo
-- fanno avanzare il gettone quando il cambiamento vero vive in un'ALTRA
-- tabella:
--
--   · `lavoro_prescrizione_correggi_typo` scrive su `lavori_prescrizioni` e poi
--     fa `UPDATE lavori SET updated_at = now()` — l'unica riga che tocca
--     `lavori`;
--   · `lavoro_denti_sostituisci_atomica` riscrive `lavori_denti` e denormalizza
--     su `lavori` i soli ELENCHI di fdi: una correzione che cambia SOLO il
--     codice colore di un dente (`codice`, `scala`, `codice_collo`,
--     `codice_corpo`, `codice_incisale`) lascia i tre array IDENTICI, e la sola
--     differenza su `lavori` è `updated_at`.
--
-- La seconda è la peggiore, perché quella penna fa DELETE + INSERT dell'intera
-- collezione: l'aggiornamento perso sarebbe TOTALE, non per-chiave. E la penna
-- lo aveva previsto per iscritto: «*farlo dipendere da un trigger dichiarato in
-- un'altra migration significherebbe che rimuovendo quel trigger si otterrebbero
-- aggiornamenti persi in silenzio*».
--
-- `provato:` sonda B (due candidate × sei casi), transazione annullata, penna
-- VERA invocata:
--
--   | caso                                   | forma del panel | questa forma |
--   |----------------------------------------|-----------------|--------------|
--   | denti, cambia solo il codice colore     | NON avanza  ❌  | avanza    ✅ |
--   | typo prescrizione (UPDATE … = now())    | NON avanza  ❌  | avanza    ✅ |
--   | contatore post_consegna_correzioni      | NON avanza  ✅  | NON avanza ✅|
--   | cambiamento vero (descrizione)          | avanza      ✅  | avanza    ✅ |
--   | updated_at falso '2000-01-01' nel corpo | non atterra ✅  | non atterra ✅|
--   | salvataggio a vuoto (descr. = descr.)   | NON avanza  ✅  | NON avanza ✅|
--
-- ➡️ La correzione è UN TOKEN: si toglie `- 'updated_at'` dal confronto. Il
--    predicato diventa «pinza SE E SOLO SE la sostanza è identica E il
--    chiamante non ha assegnato `updated_at`».
--
-- 🛑 IL COSTO ONESTO DI QUESTA SCELTA, e va detto: la forma del panel avrebbe
--    difeso anche da `PATCH /api/lavori/[id]` SE QUALCUNO SI FOSSE DIMENTICATO
--    di toglierne la riga `payload.updated_at = new Date().toISOString()`.
--    Questa forma no. ➡️ Le due modifiche sono ACCOPPIATE: quella riga è tolta
--    nello STESSO salvataggio, e una prova unitaria si accende se un domani
--    `updated_at` rientra nel carico della PATCH
--    (`tests/unit/lavori-patch-senza-updated-at.test.ts`).
--
-- 🔑 QUELLO CHE NON CAMBIA: il trigger sovrascrive SEMPRE `updated_at`, con
--    `OLD` oppure con `now()`. Un valore arbitrario spedito dal chiamante non
--    atterra MAI — l'orologio di Node non scrive il gettone in nessun caso. Lo
--    scopo della sonda 7 del panel regge; la sua formulazione letterale («resta
--    il valore vero», cioè `OLD`) no: qui diventa `now()`.
--
-- ⚠️ LIMITE DICHIARATO, perché è meglio scriverlo che farlo trovare: `to_jsonb`
--    confronta i numerici per VALORE, non per forma testuale — su una colonna
--    `numeric` un `10.0` che diventa `10.00` si legge come «non è cambiato
--    niente». Innocuo qui (nessun documento stampa la forma testuale di un
--    numerico di `lavori`), ma è una proprietà del predicato, non un caso.
--
-- ⚠️ E `to_jsonb(OLD)`/`to_jsonb(NEW)` serializzano la riga intera due volte a
--    ogni UPDATE di `lavori`, che è una tabella larga. Su 299 righe è nulla;
--    NON è stato misurato su volumi maggiori.

DROP TRIGGER IF EXISTS trg_lavori_updated_at ON public.lavori;
DROP FUNCTION IF EXISTS public.lavori_set_updated_at();

CREATE FUNCTION public.lavori_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $f$
BEGIN
  -- Pinza SE E SOLO SE: la sostanza della riga è identica (al netto del solo
  -- contatore esente) E il chiamante non ha assegnato `updated_at`.
  IF to_jsonb(OLD) - 'post_consegna_correzioni'
     IS NOT DISTINCT FROM
     to_jsonb(NEW) - 'post_consegna_correzioni'
  THEN
    NEW.updated_at = OLD.updated_at;   -- 🛑 si PINZA al valore vero
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$f$;

-- 🛑 IL NOME DEL TRIGGER NON CAMBIA, e non è pigrizia: i trigger scattano in
--    ordine ALFABETICO di nome, e su `lavori` c'è un secondo BEFORE UPDATE —
--    `trg_lavori_ritardo` → `check_lavoro_ritardo()`, che può portare
--    `NEW.stato` da `in_lavorazione` a `in_ritardo`. Con l'ordine di oggi
--    (`trg_lavori_ritardo` < `trg_lavori_updated_at`) questa funzione vede la
--    riga GIÀ corretta, e un passaggio in ritardo conta come cambiamento vero —
--    che è la lettura giusta. Rinominare il trigger in qualcosa che venga prima
--    invertirebbe l'ordine in silenzio.
--    `provato:` `SELECT tgname … FROM pg_trigger WHERE tgrelid='public.lavori'::regclass`
--    → `_audit_lavori` (AFTER) · `trg_dashboard_lavori` (AFTER) ·
--      `trg_lavori_ritardo` (BEFORE) · `trg_lavori_updated_at` (BEFORE).
CREATE TRIGGER trg_lavori_updated_at
  BEFORE UPDATE ON public.lavori
  FOR EACH ROW EXECUTE FUNCTION public.lavori_set_updated_at();

-- Una funzione di trigger non è invocabile direttamente da nessun ruolo
-- applicativo: si toglie comunque, come per ogni funzione di questo progetto.
REVOKE ALL ON FUNCTION public.lavori_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lavori_set_updated_at() FROM anon, authenticated;

COMMENT ON FUNCTION public.lavori_set_updated_at() IS
'⚖️ D323 — muove `lavori.updated_at` SOLO se cambia davvero qualcosa che non sia il contatore `post_consegna_correzioni`; altrimenti lo PINZA al valore vecchio.
🛑 È SEPARATA DA `trigger_set_updated_at()` DI PROPOSITO, e NON va unificata: quella è condivisa da ~20 tabelle, e cambiarla cambierebbe il significato di `updated_at` ovunque per risolvere il problema di una tabella sola.
🔑 PERCHÉ ESISTE: `lavori.updated_at` è il gettone di concorrenza dell''atto unico «correggi e rifai la dichiarazione». La registrazione dell''evento incrementa `post_consegna_correzioni`, e il vecchio trigger muoveva il gettone: due richieste HTTP = due transazioni = due `now()` = conflitto FALSO, con un progressivo bruciato e un PDF orfano a ogni tentativo.
📌 CRITERIO DELL''ESENZIONE: si esenta solo una colonna che non compare su nessun documento e su nessuna schermata che l''operatrice conferma. Il predicato è per SOTTRAZIONE: una colonna nuova entra da sola dalla parte protetta (fail-closed).
🔴 IL CONFRONTO TIENE DENTRO `updated_at` DI PROPOSITO: un chiamante che lo assegna sta CHIEDENDO di far avanzare il gettone, ed è così che `lavoro_prescrizione_correggi_typo` e `lavoro_denti_sostituisci_atomica` lo fanno avanzare quando il cambiamento vero vive in un''altra tabella (`lavori_prescrizioni`, `lavori_denti`). Togliere `updated_at` dal confronto disattiva il controllo di concorrenza di quelle due penne — misurato, non temuto.
🛑 ACCOPPIAMENTO: per questo `PATCH /api/lavori/[id]` NON deve più mettere `updated_at` nel carico. Prova che lo tiene fermo: `tests/unit/lavori-patch-senza-updated-at.test.ts`.
⚠️ In ogni caso il valore spedito dal chiamante NON atterra mai: si scrive sempre `OLD.updated_at` oppure `now()`.';
