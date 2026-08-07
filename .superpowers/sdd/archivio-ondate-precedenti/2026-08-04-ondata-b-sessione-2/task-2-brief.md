## Task 2 — Migration A: strutture (tabella + P37)

**Files:**
- Create: `supabase/migrations/<TS>_ondata_b_lavori_prescrizioni.sql` (TS = `date +%Y%m%d%H%M%S` — D155: la data si legge dall'orologio)

**Interfaces (produce):** tabella `lavori_prescrizioni` (DDL sotto), vincolo
`lavori_immagini_id_lab_uk`, colonna `lavori.istituzione_sanitaria text`.

- [ ] **Step 2.1** Scrivere la migration — contenuto INTEGRALE (DDL `provato:` sonde S1-S8; RLS/REVOKE `non eseguito`, collaudo in Step 2.3):

```sql
-- <TS>_ondata_b_lavori_prescrizioni.sql — Ondata B, sessione ②, parte 1/3.
-- Spec §3 (D214). NON aggiungere BEGIN;/COMMIT;.
-- Modello: lavori_denti (20260727120100) — FK composite, scrittura solo via RPC.

-- Il supporto per la FK composita verso l'immagine fonte (assente fino a oggi;
-- su lavori esiste già come lavori_id_lab_uk, 20260727120000:8).
ALTER TABLE lavori_immagini
  ADD CONSTRAINT lavori_immagini_id_lab_uk UNIQUE (id, laboratorio_id);

-- La casa dello snapshot: la trascrizione della prescrizione, fotografata al
-- momento T (D204). JSONB deliberato: fedeltà > integrità referenziale — il
-- vincolo UNIQUE(lavoro_id,fdi) + DELETE&INSERT di lavoro_denti_sostituisci_atomica
-- cancellerebbe la trascrizione alla prima modifica in lavorazione (spec §3).
CREATE TABLE lavori_prescrizioni (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id      uuid NOT NULL REFERENCES laboratori(id),
  lavoro_id           uuid NOT NULL,

  -- Chiave presente = trascritta dal documento; assente = non prescritta (V2).
  -- MAI una dicitura "nessuna caratteristica prescritta" (D101).
  -- Chiavi note: elementi int[] · colore testo COME DIGITATO (mai normalizzato)
  -- · tipo (entra SOLO alla conferma di consegna, D213).
  contenuto           jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Divergenze prescritto/eseguito col motivo (V9, D212): array di
  -- {campo, motivo, nota, utente_id, registrata_at}. Il rifacimento le azzera.
  divergenze          jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Le 4 forme di D202. NULL con fonte_riferimento valorizzato = V7,
  -- "in attesa di conferma scritta" (a voce/telefono non è MAI una fonte).
  fonte_tipo          text CHECK (fonte_tipo IN ('foglio','email','modulo','piattaforma')),
  fonte_immagine_id   uuid,
  fonte_riferimento   text,

  -- P38: il numero facoltativo trova casa QUI; lavori.numero_prescrizione resta
  -- (la legge generate-ddc.ts:148) con la sua ragione scritta nella route.
  numero_prescrizione text,

  -- V5: la conferma guardando il foglio, registrata server-side (chi, quando).
  -- Modello: data_processing_agreements.emesso_da (20260804120000:58-62).
  confermata_da       uuid REFERENCES utenti(id),
  confermata_at       timestamptz,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Una trascrizione per lavoro; il rifacimento è un ALTRO lavoro e clona.
  CONSTRAINT lavori_prescrizioni_lavoro_uk UNIQUE (lavoro_id),

  -- FK COMPOSITE anti cross-tenant (modello lavori_denti_lavoro_fk).
  CONSTRAINT lavori_prescrizioni_lavoro_fk FOREIGN KEY (lavoro_id, laboratorio_id)
    REFERENCES lavori (id, laboratorio_id),
  CONSTRAINT lavori_prescrizioni_fonte_img_fk FOREIGN KEY (fonte_immagine_id, laboratorio_id)
    REFERENCES lavori_immagini (id, laboratorio_id),

  -- Una fonte dichiarata deve avere un corpo: immagine o riferimento (V1 morde
  -- al precheck; qui si impedisce solo la forma vuota).
  CONSTRAINT lavori_prescrizioni_fonte_ck CHECK (
    fonte_tipo IS NULL OR fonte_immagine_id IS NOT NULL OR fonte_riferimento IS NOT NULL
  ),

  -- Il "chi" e il "quando" della conferma viaggiano insieme.
  CONSTRAINT lavori_prescrizioni_conferma_ck CHECK ((confermata_da IS NULL) = (confermata_at IS NULL))
);

CREATE INDEX lavori_prescrizioni_lab_idx ON lavori_prescrizioni (laboratorio_id);

SELECT apply_updated_at_trigger('lavori_prescrizioni');

-- ============ RLS: lettura per tenant, scrittura SOLO via RPC ============
ALTER TABLE lavori_prescrizioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY lavori_prescrizioni_tenant_select ON lavori_prescrizioni
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

-- E8: service_role nella lista del REVOKE (default privileges Supabase gli
-- darebbero tutto; il DELETE cross-tenant è già stato riprodotto — nota E8,
-- 20260721090000). Le RPC scrivono perché SECURITY DEFINER.
REVOKE ALL ON lavori_prescrizioni FROM anon, authenticated, service_role;
GRANT SELECT ON lavori_prescrizioni TO authenticated, service_role;

COMMENT ON TABLE lavori_prescrizioni IS
  'Trascrizione della prescrizione (spec ondata B §3, D214). Scrittura SOLO via RPC lavoro_crea_atomico / lavoro_prescrizione_*: REVOKE ALL, service_role compreso. Il rifacimento clona contenuto+fonte+numero, azzera divergenze e conferma.';

-- ============ P37: la seconda casella dell'Allegato XIII p.1 ============
-- "il nome della persona che ha prescritto ... e, se del caso, il nome
-- dell'istituzione sanitaria" — due caselle unite da "e" (spec §0).
-- Nullable: il dottore singolo la lascia legittimamente vuota (D206②).
ALTER TABLE lavori ADD COLUMN istituzione_sanitaria text;

COMMENT ON COLUMN lavori.istituzione_sanitaria IS
  'All. XIII p.1: istituzione sanitaria "se del caso" (P37, D206). Persona: richiedente_nome.';
```

- [ ] **Step 2.2** Applicare: `npx supabase db push` (progetto `iagibumwjstnveqpjbwq`). Expected: `Applying migration <TS>_ondata_b_lavori_prescrizioni.sql... Finished`.
- [ ] **Step 2.3** Collaudo strutture vive (sola lettura):
`node scripts/tmp/sql.mjs "SELECT conname FROM pg_constraint WHERE conrelid='public.lavori_prescrizioni'::regclass ORDER BY conname"` → attesi i 5 vincoli + PK + FK lab/utenti;
`node scripts/tmp/sql.mjs "SELECT policyname, cmd FROM pg_policies WHERE tablename='lavori_prescrizioni'"` → SOLO `lavori_prescrizioni_tenant_select, SELECT`;
`node scripts/tmp/sql.mjs "SELECT column_name FROM information_schema.columns WHERE table_name='lavori' AND column_name='istituzione_sanitaria'"` → 1 riga.
- [ ] **Step 2.4** Commit: `git add supabase/migrations/ && git commit -m "feat(db): tabella lavori_prescrizioni + colonna P37 istituzione_sanitaria (ondata B ②, spec §3)"`.

