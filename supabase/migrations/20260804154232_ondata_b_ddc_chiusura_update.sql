-- 20260804154232_ondata_b_ddc_chiusura_update.sql — Ondata B, sessione ②, parte 3/3.
-- L'immutabilità della DdC era una CONVENZIONE (policy UPDATE tenant piena,
-- schema.sql:1292-1294): da oggi è struttura. Modello: il cancello DPA
-- (20260804120000:30-34). Censimento 04/08: NESSUN .update() applicativo su
-- dichiarazioni_conformita in src/ — l'unico UPDATE legittimo è dentro
-- annulla_consegna_atomica (SECURITY DEFINER: le policy non la toccano).
-- Rollback: CREATE POLICY inversa (spec §7) — il testo esatto è in schema.sql
-- alla versione precedente di questo commit.
DROP POLICY "ddc_laboratorio_update" ON dichiarazioni_conformita;

-- ============ Correzione dei due COMMENT storpiati del Task 3 ============
-- 20260804152403_ondata_b_prescrizioni_rpc.sql (righe 496-497 e 504-505) ha
-- scritto le lettere accentate come lettera+doppio apostrofo ("gia''", "e''",
-- "finche''"): SBAGLIATO. In SQL si raddoppia SOLO l'apostrofo — l'accento si
-- scrive normale (à, è, é...). "dell''ondata" e "nell''ondata", nello stesso
-- file, ERANO invece corretti (apostrofo vero di "dell'"/"nell'", raddoppiato
-- come un apostrofo dentro una stringa deve essere): non si toccano.
-- Quel file è già applicato: un ALTER del suo testo sorgente nel repo non lo
-- ri-esegue — per questo i due COMMENT si ri-emettono qui, sul DB vivo. Lo
-- stesso testo corretto è stato riportato anche nel file sorgente del Task 3,
-- per fedeltà della fotografia a chi ricostruisce lo schema da zero.
COMMENT ON FUNCTION public.lavoro_prescrizione_allega_fonte(uuid,uuid,text,uuid,text) IS
  'Allega o sostituisce la fonte della trascrizione (D202). UPSERT: i lavori nati prima dell''ondata B non hanno la riga. Con DdC attiva una fonte già presente è congelata (V8, esito fonte_congelata); la fonte senza corpo la respinge il CHECK fonte_ck.';
COMMENT ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) IS
  'Crea il lavoro di rifacimento copiando dal lavoro originale. QUARTA penna su lavori_prescrizioni insieme alle RPC lavoro_crea_atomico / lavoro_prescrizione_*: clona le righe dei denti conservando provenienza, copia colore_scala/colore_codice, e clona la trascrizione della prescrizione (contenuto+fonte+numero) azzerando divergenze e conferma (D214). colore_dente resta copiata finché main la legge in produzione — si toglie nell''ondata (c).';
