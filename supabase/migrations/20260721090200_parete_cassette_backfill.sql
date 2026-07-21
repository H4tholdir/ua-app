-- 20260721090200_parete_cassette_backfill.sql
-- Backfill della Parete: popola cassette + cassette_lavori dai `lavori.numero_cassetta` esistenti.
-- Spec: docs/superpowers/specs/2026-07-21-parete-cassette-design.md §4.4
-- SQL corretto e collaudato: .superpowers/sdd/panel-backend.md §3.10 · decisioni: R-1, R-2.
--
-- Va DOPO 20260721090000 (DDL/RPC) e DOPO 20260721090100 (purga tenant), stesso deploy.
-- È l'unico pezzo idempotente e ri-eseguibile dell'ondata: si può rilanciare da solo, senza
-- toccare lo schema, dopo aver letto i gate di conteggio (panel-backend.md §5.1 pre-apply,
-- §5.2 post-apply).
--
-- COSTO (N1): ogni UPDATE su `lavori` fa scattare trg_dashboard_lavori (002_fase2_schema.sql:376),
-- che ricalcola i KPI dell'INTERO lab e serializza su dashboard_kpi_cache(laboratorio_id) —
-- una volta per riga. Se il gate §5.1(d) conta più di ~2.000 righe, eseguire fuori orario.
--
-- NON aggiungere BEGIN;/COMMIT; (N6, verificato).
--
-- ============================================================================
-- COSA SUCCEDE ALLE TARGHE (R-2, tre popolazioni, tre trattamenti):
--  1. Nomi > 20 caratteri → NON si perdono: si accorciano. Il troncamento è allineato su
--     ENTRAMBI i lati del join (era il bug: statement 1 troncava, statement 2 no → nessun match
--     → la targa veniva azzerata) e la denorm del vincitore viene risincronizzata sul nome
--     effettivo della cassetta, così card e parete dicono la stessa cosa dal minuto zero.
--  2. Perdenti delle collisioni → perdono la targa (D-9, ratificata), ma il valore originale
--     finisce in `cassette_backfill_audit`: l'operazione è reversibile.
--  3. Targhe di soli spazi → NON vengono toccate: l'azzeramento è ristretto esattamente ai
--     perdenti delle collisioni, non a «tutto ciò che non ha una riga viva».
-- ============================================================================

-- ============ REGISTRO DI AUDIT (R-2) ============
-- Nessuna FOREIGN KEY: è un registro storico, non un dato relazionale vivo. Le FK su lavori e
-- laboratori riprodurrebbero esattamente il difetto di classe che la migration precedente chiude
-- (un lab con righe qui tornerebbe incancellabile).
-- Resta vuota se non si perde nulla: costo zero nel caso buono.
-- IF NOT EXISTS: questo file, a differenza del DDL della Parete, DEVE poter essere rilanciato
-- da solo (R-1) — tabella, indice, RLS e privilegi sono tutti idempotenti.
CREATE TABLE IF NOT EXISTS cassette_backfill_audit (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id            uuid NOT NULL,   -- volutamente SENZA FK
  lavoro_id                 uuid NOT NULL,   -- volutamente SENZA FK
  numero_cassetta_originale text NOT NULL,
  motivo                    text NOT NULL,
  creato_at                 timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE cassette_backfill_audit IS
  'Targhe (lavori.numero_cassetta) azzerate dal backfill della Parete, con il valore originale. '
  'Registro storico senza FK, leggibile solo dal service_role. Purgata col tenant da cassette_purge_lab.';

-- indice per la purga per-tenant (public.cassette_purge_lab) e per le letture di supporto
CREATE INDEX IF NOT EXISTS cassette_backfill_audit_lab_idx ON cassette_backfill_audit (laboratorio_id);

-- RLS attiva SENZA policy = nessuno legge via PostgREST; il service_role la vede perché bypassa RLS.
ALTER TABLE cassette_backfill_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cassette_backfill_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON cassette_backfill_audit TO service_role;  -- esplicito, non default privileges

-- ============ 1) CASSETTE dai nomi distinti dei lavori APERTI ============
-- troncamento e normalizzazione UNA VOLTA SOLA; ordinamento naturale della serie C con ::numeric
-- (con ::bigint, `C9999999999999999999` abortiva l'intera migration — riprodotto).
WITH aperti AS (
  SELECT laboratorio_id, btrim(left(btrim(numero_cassetta),20)) AS nome
  FROM lavori
  WHERE numero_cassetta IS NOT NULL AND btrim(numero_cassetta) <> ''
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato')
  GROUP BY laboratorio_id, btrim(left(btrim(numero_cassetta),20))
), norm AS (
  SELECT laboratorio_id, nome,
         row_number() OVER (
           PARTITION BY laboratorio_id
           ORDER BY CASE WHEN nome ~ '^[Cc][0-9]+$'
                         THEN (substring(nome from 2))::numeric END NULLS LAST,
                    lower(nome)
         ) - 1 AS pos
  FROM aperti
)
INSERT INTO cassette (laboratorio_id, nome, colore, posizione)
SELECT DISTINCT ON (laboratorio_id, lower(nome)) laboratorio_id, nome, 'bianca', pos
FROM norm
ORDER BY laboratorio_id, lower(nome), pos
ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL DO NOTHING;

-- ============ 2) RIGA VIVA per il lavoro vincente ============
-- join sulla STESSA normalizzazione della statement 1 (troncamento allineato su entrambi i lati:
-- è il bug che faceva sparire ogni targa più lunga di 20 caratteri).
-- Vince l'updated_at più recente; `l.id` come spareggio deterministico.
WITH candidati AS (
  SELECT l.id AS lavoro_id, l.laboratorio_id, c.id AS cassetta_id, l.updated_at,
         row_number() OVER (PARTITION BY c.id ORDER BY l.updated_at DESC, l.id) AS rk
  FROM lavori l
  JOIN cassette c ON c.laboratorio_id = l.laboratorio_id
    AND lower(btrim(left(btrim(l.numero_cassetta),20))) = lower(btrim(c.nome))
    AND c.deleted_at IS NULL
  WHERE l.numero_cassetta IS NOT NULL AND btrim(l.numero_cassetta) <> ''
    AND l.deleted_at IS NULL AND l.stato NOT IN ('consegnato','annullato')
)
INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id, assegnato_at)
SELECT laboratorio_id, cassetta_id, lavoro_id, updated_at FROM candidati
WHERE rk = 1
  AND NOT EXISTS (SELECT 1 FROM cassette_lavori v WHERE v.cassetta_id = candidati.cassetta_id AND v.liberato_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM cassette_lavori v WHERE v.lavoro_id  = candidati.lavoro_id  AND v.liberato_at IS NULL);

-- ============ 3) La denorm dei VINCITORI adotta il nome canonico della cassetta ============
-- (targhe troncate a 20, case e spazi normalizzati): card e parete dicono la stessa cosa dal
-- minuto zero. Senza questo, l'invariante «card == parete» nascerebbe già rotta.
UPDATE lavori l SET numero_cassetta = c.nome
FROM cassette_lavori cl JOIN cassette c ON c.id = cl.cassetta_id
WHERE cl.lavoro_id = l.id AND cl.laboratorio_id = l.laboratorio_id AND cl.liberato_at IS NULL
  AND l.numero_cassetta IS DISTINCT FROM c.nome;

-- ============ 4) I PERDENTI delle collisioni: prima si registra, poi si azzera ============
-- Popolazione definita in POSITIVO (non «tutto ciò che non ha una riga viva»):
--   targa non vuota  +  nessuna riga viva per questo lavoro  +  esiste una cassetta viva con
--   quel nome normalizzato  +  quella cassetta è occupata da qualcun altro
-- ⇒ è esattamente «ho perso la collisione». Le targhe di soli spazi restano fuori (R-2 §3).
--
-- Un'unica statement: la CTE `perdenti` legge i valori PRIMA dell'UPDATE (lo snapshot dello
-- statement non vede le proprie modifiche), l'UPDATE azzera, il RETURNING restituisce il valore
-- originale che l'INSERT registra. Nessuna finestra fra lettura e scrittura.
--
-- Idempotente: alla seconda esecuzione quelle righe hanno numero_cassetta NULL, quindi non
-- rientrano nella popolazione — nessun azzeramento e NESSUNA riga di audit duplicata.
WITH perdenti AS (
  SELECT l.id, l.laboratorio_id, l.numero_cassetta
  FROM lavori l
  WHERE l.numero_cassetta IS NOT NULL
    AND btrim(l.numero_cassetta) <> ''
    AND l.deleted_at IS NULL
    AND l.stato NOT IN ('consegnato','annullato')
    AND NOT EXISTS (SELECT 1 FROM cassette_lavori v
                    WHERE v.lavoro_id = l.id AND v.liberato_at IS NULL)
    AND EXISTS (SELECT 1 FROM cassette c
                WHERE c.laboratorio_id = l.laboratorio_id
                  AND c.deleted_at IS NULL
                  AND lower(btrim(c.nome)) = lower(btrim(left(btrim(l.numero_cassetta),20)))
                  AND EXISTS (SELECT 1 FROM cassette_lavori v2
                              WHERE v2.cassetta_id = c.id AND v2.liberato_at IS NULL))
), azzerati AS (
  UPDATE lavori l SET numero_cassetta = NULL
  FROM perdenti p
  WHERE l.id = p.id AND l.laboratorio_id = p.laboratorio_id
  RETURNING p.laboratorio_id AS laboratorio_id, p.id AS lavoro_id,
            p.numero_cassetta AS numero_cassetta_originale
)
INSERT INTO cassette_backfill_audit (laboratorio_id, lavoro_id, numero_cassetta_originale, motivo)
SELECT laboratorio_id, lavoro_id, numero_cassetta_originale, 'collisione' FROM azzerati;
