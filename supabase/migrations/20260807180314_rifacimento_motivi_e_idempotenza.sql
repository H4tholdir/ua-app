-- Ondata «si deve sempre poter intervenire» — §4.1 e §4.2 della spec (D306 · D307).
--
-- ① IL VOCABOLARIO. I due motivi del percorso qualità non hanno un corrispondente
--    fra i sette storici (provato: lavori_rifacimenti_motivo_check, generato dal
--    CHECK inline di supabase/migrations/005_v1_foundation.sql:77-82 — Postgres
--    dà questo nome a un vincolo senza nome esplicito). Scriverci 'altro'
--    perderebbe l'unica informazione che conta.
--    ⚠️ Da qui nascono TRE allowlist sullo stesso campo, e va detto invece di
--    lasciarlo scoprire: il database ne accetta 9, la rotta HTTP del rifacimento
--    resta a 7 (deliberato — quei due non si scelgono a mano), e la RPC non valida
--    p_motivo affatto (20260805201640:113,157). L'unico guardiano dei due valori
--    nuovi è la derivazione dentro la rotta degli eventi di qualità.
--    provato (censimento righe esistenti, prima di allargare il vincolo):
--    SELECT motivo, count(*) FROM public.lavori_rifacimenti GROUP BY motivo →
--    2 righe: 'fusione_difettosa' (1), 'misura_errata' (1) — entrambe già nei
--    sette storici, quindi già dentro i nove nuovi: nessuna riga esistente
--    viola il vincolo nuovo.
ALTER TABLE public.lavori_rifacimenti
  DROP CONSTRAINT IF EXISTS lavori_rifacimenti_motivo_check;
ALTER TABLE public.lavori_rifacimenti
  ADD CONSTRAINT lavori_rifacimenti_motivo_check
  CHECK (motivo IN (
    'colore_sbagliato','misura_errata','fusione_difettosa',
    'rottura_produzione','non_confortevole','errore_prescrizione','altro',
    'difetto_lavorazione','difetto_materiale'
  ));

-- ② L'IDEMPOTENZA (D307). Da oggi il rifacimento NON nasce più da un tasto premuto
--    a mano: lo crea l'app dentro un altro flusso. Senza questo vincolo, un doppio
--    tocco o un ritentativo dopo un timeout crea DUE lavori e brucia due
--    progressivi (crea_rifacimento_atomico incrementa progressivi_anno,
--    20260805201640:65-69), e il guard del client è solo in memoria
--    (DevoIntervenire.tsx:147). Col vincolo, il secondo tentativo è un 23505
--    riconoscibile: la rotta lo traduce e restituisce il lavoro già creato.
--    provato: l'indice esistente lavori_rifacimenti_evento_idx (creato in
--    20260806142910_correzione_eventi_qualita_cross_tenant.sql:107-108, su
--    (evento_id) soltanto) NON è unique.
--    ⚠️ Parziale, perché evento_id è nullable: i rifacimenti creati a mano non
--    hanno un evento, e un UNIQUE pieno su NULL non li disturberebbe comunque —
--    ma il parziale dichiara l'intenzione invece di appoggiarsi a un dettaglio
--    della semantica dei NULL.
--    provato (censimento righe esistenti, prima di creare l'indice): SELECT
--    laboratorio_id, evento_id, count(*) FROM public.lavori_rifacimenti WHERE
--    evento_id IS NOT NULL GROUP BY laboratorio_id, evento_id HAVING count(*) >
--    1 → 0 righe: nessuna coppia duplicata già in banca dati.
CREATE UNIQUE INDEX IF NOT EXISTS rifacimento_evento_unique
  ON public.lavori_rifacimenti (laboratorio_id, evento_id)
  WHERE evento_id IS NOT NULL;
