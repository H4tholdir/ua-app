-- 20260727120100_lavori_denti_tabella.sql — Ondata (a), parte 2/4.
-- Spec §3.1 + §4 (RLS). NON aggiungere BEGIN;/COMMIT;.

CREATE TABLE lavori_denti (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id   uuid NOT NULL REFERENCES laboratori(id),
  lavoro_id        uuid NOT NULL,

  -- 🔴 smallint, MAI text: '2.6'::smallint è già un errore di tipo. Il difetto
  -- «il wizard salva 2.6 e l'odontogramma non accende nulla» diventa così
  -- IRRAPPRESENTABILE, invece di marcire in silenzio fino alla Dichiarazione.
  fdi              smallint NOT NULL,

  -- L'insieme NON è un intervallo (verbale ⑤): un BETWEEN 11 AND 48
  -- accetterebbe 19, 20, 29, 30, 39, 40. Decina = quadrante, unità = posizione.
  CONSTRAINT lavori_denti_fdi_ck CHECK (
       (fdi / 10 BETWEEN 1 AND 4 AND fdi % 10 BETWEEN 1 AND 8)   -- 32 permanenti
    OR (fdi / 10 BETWEEN 5 AND 8 AND fdi % 10 BETWEEN 1 AND 5)   -- 20 decidui
  ),

  -- `ruolo` unifica denti_mancanti e denti_impianti (oggi INTEGER[] accanto a
  -- denti_coinvolti text[]: stesso dominio, due tipi) e copre gratis «denti da
  -- escludere» degli allineatori e «da incollare» della contenzione.
  ruolo            text NOT NULL DEFAULT 'elemento'
                   CHECK (ruolo IN ('elemento','mancante','impianto','escluso','incollato')),

  -- Il ponte: forma riservata ora, gesto dopo (spec §3.4). Nullable e non
  -- popolate in questa ondata. Costo oggi: due righe. Costo se si rimanda del
  -- tutto: la DdC scriverebbe «elementi 13, 12, 11» invece di «ponte su tre
  -- elementi» — che ai fini dell'Allegato XIII descrive un dispositivo diverso.
  gruppo           smallint,
  gruppo_ruolo     text CHECK (gruppo_ruolo IS NULL OR gruppo_ruolo IN ('pilastro','intermedio')),

  -- Il colore è una COPPIA (scala, codice), mai una stringa (W10).
  scala            text,
  codice           text,
  codice_collo     text,
  codice_corpo     text,
  codice_incisale  text,

  -- W20: da dove viene il valore. ⚠️ Dopo W21 NON decide più che cosa si
  -- stampa sul documento (si stampa la realtà del manufatto consegnato): serve
  -- al precheck di consegna per poter dire «questo colore non è mai stato
  -- confrontato con la prescrizione». Costa una colonna e non toglie nulla.
  provenienza      text NOT NULL DEFAULT 'prescritto'
                   CHECK (provenienza IN ('prescritto','eseguito')),

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- FK COMPOSITA (⑧): lega la riga al lavoro **e** al suo laboratorio in un
  -- vincolo solo. Con due FK separate una riga potrebbe portare il laboratorio
  -- B su un lavoro di A e il database non se ne accorgerebbe.
  CONSTRAINT lavori_denti_lavoro_fk
    FOREIGN KEY (lavoro_id, laboratorio_id) REFERENCES lavori (id, laboratorio_id),

  -- Un dente compare una volta sola per lavoro.
  CONSTRAINT lavori_denti_lavoro_fdi_uk UNIQUE (lavoro_id, fdi),

  -- Una scala senza codice non è un colore; un codice senza scala nemmeno.
  CONSTRAINT lavori_denti_coppia_ck CHECK ((scala IS NULL) = (codice IS NULL)),

  -- Le zone del ceramista non possono esistere senza la scala che le legge.
  CONSTRAINT lavori_denti_zone_ck CHECK (
    scala IS NOT NULL
    OR (codice_collo IS NULL AND codice_corpo IS NULL AND codice_incisale IS NULL)
  ),

  -- Il colore, se c'è, deve essere un codice che esiste davvero.
  CONSTRAINT lavori_denti_colore_fk
    FOREIGN KEY (scala, codice) REFERENCES colori_dentali (scala, codice)
);

CREATE INDEX lavori_denti_lavoro_idx ON lavori_denti (lavoro_id, fdi);
CREATE INDEX lavori_denti_lab_idx    ON lavori_denti (laboratorio_id);

-- ============ RLS: lettura per tenant, scrittura solo via RPC ============
ALTER TABLE lavori_denti ENABLE ROW LEVEL SECURITY;

-- public.current_lab_id() — MAI auth.current_lab_id(), che in questo schema
-- non esiste (../CLAUDE.md §6).
CREATE POLICY lavori_denti_tenant_select ON lavori_denti
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

-- ⚠️ E8 — `service_role` va nella lista del REVOKE. Le default privileges di
-- Supabase gli darebbero tutto, e in questo repo un
-- `SET LOCAL ROLE service_role; DELETE` cross-tenant è già stato riprodotto
-- DAVVERO (nota E8, 20260721090000_parete_cassette.sql:126-137). Le RPC del
-- Task 7 continuano a scrivere perché sono SECURITY DEFINER: girano coi
-- privilegi dell'owner, non del chiamante.
REVOKE ALL ON lavori_denti FROM anon, authenticated, service_role;
GRANT SELECT ON lavori_denti TO authenticated, service_role;

COMMENT ON TABLE lavori_denti IS
  'Una riga per dente del lavoro (spec §3.1). Scrittura SOLO via lavoro_denti_sostituisci_atomica / lavoro_crea_atomico: la tabella è in REVOKE ALL, service_role compreso.';
