-- 20260730150000_lavori_immagini_categoria.sql
-- D72 · D73 — la categoria della foto diventa un dato che il database difende,
-- e la colonna `tipo` se ne va.
--
-- Perché `tipo` si elimina e non si allarga (D73, panel di due advisor):
--   • non è l'asse del "formato": due dei suoi quattro valori (`rx`, `altro`)
--     sono già due delle sei CATEGORIE, e 'foto' dentro una tabella che si
--     chiama lavori_immagini non dice nulla;
--   • il formato è già derivabile da storage_path (NOT NULL) che porta sempre
--     l'estensione, presa da un'allowlist chiusa di sei
--     (api/lavori/[id]/immagini/route.ts:11-18);
--   • non la legge nessuno: otto siti innestano (*) e nessuno la consuma.
-- Pareggio del panel rotto da W23 (Francesco, 27/07): «se serve usala sennò togli».

-- 1. nullable, nessun vincolo ancora.
ALTER TABLE lavori_immagini ADD COLUMN IF NOT EXISTS categoria TEXT;

-- 2. backfill TOTALE.
-- 🛑 NESSUN filtro su deleted_at: è l'abitudine di casa (la fa la RLS, la fanno
--    tutti e otto i lettori) e QUI sarebbe un difetto — le righe cancellate
--    resterebbero NULL e il SET NOT NULL del passo 4 ABORTIREBBE.
-- 🛑 Il CASE è TOTALE per costruzione (ELSE 'altro'): il rischio smette di
--    dipendere dal contenuto di `descrizione`.
--    ✅ MISURATO il 30/07 su transazione annullata: delle 3 righe vive, 1 ha
--    `descrizione` fuori elenco (NULL) — senza l'ELSE il passo 4 SAREBBE
--    ABORTITO davvero. La riga non era un'ipotesi: esiste.
UPDATE lavori_immagini
SET categoria = CASE
      WHEN descrizione IN ('impronta','pre_lavoro','colore','post_prova','rx','altro')
        THEN descrizione
      ELSE 'altro'
    END
WHERE categoria IS NULL;

-- 3. il vincolo DOPO il backfill.
-- 🛑 Se venisse prima, validerebbe SUBITO le righe esistenti e aborterebbe sul
--    primo `descrizione` fuori elenco.
ALTER TABLE lavori_immagini
  ADD CONSTRAINT lavori_immagini_categoria_check
  CHECK (categoria IN ('impronta','pre_lavoro','colore','post_prova','rx','altro'));

-- 4. obbligatoria, SENZA DEFAULT.
-- 🔑 Con un ripiego uno scrittore che dimentica la categoria passa inosservato
--    e la riga si salva SBAGLIATA in silenzio — cioè D65 riprodotta di una
--    colonna più in là. Senza, chi dimentica prende un errore dal database:
--    fail-closed, la direzione di guasto giusta.
-- 🛑 CORREZIONE DEL PIANO (T1, 30/07): il piano motivava questa scelta con
--    «`gen types` la rende obbligatoria nell'Insert e `tsc` si accende sullo
--    scrittore». La PRIMA metà è vera (`Insert.categoria: string`, senza `?`),
--    la SECONDA è FALSA in questo repo: i quattro fabbricanti di client
--    (`src/lib/supabase/{server-service,server-user,browser-anon,
--    middleware-client}.ts`) creano il client SENZA il generico `<Database>`,
--    quindi il builder non è tipizzato e `tsc` non vede NULLA.
--    Provato: aggiunta `colonna_che_non_esiste_sonda: 42` all'`.insert()` di
--    `api/lavori/[id]/immagini/route.ts` → `npx tsc --noEmit` uscita 0, zero
--    errori. Il guardiano di questa colonna è il DATABASE, a runtime, non il
--    compilatore. La scelta «senza DEFAULT» resta giusta; la sua ragione no.
ALTER TABLE lavori_immagini ALTER COLUMN categoria SET NOT NULL;

-- 5. via la colonna che mente.
-- ✅ Verificato prima dell'apply: nessuna vista/regola dipende da `tipo`
--    (pg_depend + pg_rewrite → 0 righe), nessuna policy la cita, e le 3 righe
--    vive portano TUTTE il valore 'foto' — nessuna informazione muore qui.
ALTER TABLE lavori_immagini DROP COLUMN tipo;

COMMENT ON COLUMN lavori_immagini.categoria IS
  'Categoria fotografica, elenco CHIUSO ratificato da Francesco il 30/07/2026 (D72). Asse distinto dal formato del file, che si deriva dall''estensione di storage_path.';
COMMENT ON COLUMN lavori_immagini.descrizione IS
  'Testo libero. Fino al 30/07/2026 ha ospitato IMPROPRIAMENTE la categoria: i valori vecchi restano ma non si leggono più come categoria (D73).';
