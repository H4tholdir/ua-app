-- Task 8b (Nota di Credito TD04): quando un TD04 viene RIFIUTATO da SdI
-- (stato_sdi='rifiutata'), gli effetti dello storno vanno ANNULLATI
-- atomicamente — altrimenti al ri-storno la RPC ricalcolerebbe v_pagato e
-- inserirebbe un SECONDO movimento 'storno' (doppio credito). Spec §116 +
-- adjudicazione review Task 4.
-- Spec: docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md
--
-- SCELTA TRIGGER (non RPC applicativa): nessun writer applicativo setta oggi
-- stato_sdi='rifiutata' (grep in src/ → solo letture/filtri/label; nessun
-- writer in migration). Il trigger DB intercetta OGNI transizione a
-- 'rifiutata', inclusi gli update manuali dalla dashboard Supabase.
--
-- Additiva: solo CREATE FUNCTION + CREATE TRIGGER, nessuna migration applicata
-- viene modificata. Nessun cambiamento di shape su tabelle/RPC → gen types non
-- necessario.

CREATE OR REPLACE FUNCTION public.annulla_effetti_storno_td04()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_lavoro_id uuid;
BEGIN
  -- NEW è il TD04 rifiutato. L'originale è NEW.fattura_collegata_id.
  -- Ogni statement è filtrato su NEW.laboratorio_id (isolamento tenant esplicito,
  -- non delegato a RLS: la funzione è SECURITY DEFINER e la bypassa).

  -- 1. Ri-abilita lo storno dell'originale azzerando stornata_at — MA SOLO se
  -- non collide con l'indice parziale fatture_lavoro_attiva_unique
  -- (laboratorio_id, lavoro_id) WHERE lavoro_id IS NOT NULL AND
  -- stato_sdi<>'rifiutata' AND stornata_at IS NULL. Se nel frattempo il lavoro
  -- è stato ri-fatturato su un nuovo TD01 attivo, azzerare stornata_at
  -- reintrodurrebbe l'originale nell'indice → 23505 che farebbe fallire
  -- l'INTERO UPDATE del rifiuto (il TD04 non verrebbe nemmeno registrato come
  -- rifiutato). In quel caso si lascia stornata_at valorizzato: l'originale
  -- resta non ri-stornabile (ha già completato un ciclo di storno e il lavoro
  -- vive su un'altra fattura), e si demanda al commercialista.
  -- FLAG COMMERCIALISTA: rifiuto TD04 con lavoro già ri-fatturato su nuovo TD01
  -- → originale non ri-stornabile automaticamente, gestione manuale.
  UPDATE public.fatture o SET stornata_at = NULL
   WHERE o.id = NEW.fattura_collegata_id
     AND o.laboratorio_id = NEW.laboratorio_id
     AND NOT EXISTS (
       SELECT 1 FROM public.fatture c
        WHERE c.laboratorio_id = o.laboratorio_id
          AND c.lavoro_id IS NOT NULL
          AND c.lavoro_id = o.lavoro_id
          AND c.id <> o.id
          AND c.stato_sdi <> 'rifiutata'
          AND c.stornata_at IS NULL
     );

  -- 2. Neutralizza il movimento credito 'storno' creato per quell'originale:
  -- il TD04 rifiutato non è mai esistito fiscalmente, quindi il credito che ne
  -- derivava non esiste. DELETE (non compensazione) lab-filtered.
  -- Se il credito è già stato parzialmente applicato nel frattempo il saldo può
  -- andare negativo: NON gestito con logica extra.
  -- FLAG COMMERCIALISTA: rifiuto TD04 dopo applicazione del credito → saldo
  -- negativo, gestione manuale.
  DELETE FROM public.credito_clienti_movimenti
   WHERE laboratorio_id = NEW.laboratorio_id
     AND tipo = 'storno'
     AND fattura_id = NEW.fattura_collegata_id;

  -- 3. Ripristina lo stato fiscale del lavoro dell'originale allo stato «già
  -- fatturato» = (incluso_in_fattura=true, decisione_fatturazione='fatturare').
  -- 'fatturare' è il valore che il flusso di fatturazione normale (batch route)
  -- lascia sul lavoro dopo averlo incluso in fattura (è la precondizione del
  -- claim, mai riscritta post-inclusione); l'enum/CHECK non ammette 'fatturata'
  -- (valori: in_attesa|fatturare|non_fatturare). MAI toccare
  -- stato/conformato/data_consegna_effettiva/dichiarazioni_conformita (MDR).
  SELECT o.lavoro_id INTO v_lavoro_id
    FROM public.fatture o
   WHERE o.id = NEW.fattura_collegata_id
     AND o.laboratorio_id = NEW.laboratorio_id;

  IF v_lavoro_id IS NOT NULL THEN
    UPDATE public.lavori
       SET incluso_in_fattura = true, decisione_fatturazione = 'fatturare'
     WHERE id = v_lavoro_id AND laboratorio_id = NEW.laboratorio_id;
  END IF;

  RETURN NULL; -- AFTER trigger: valore di ritorno ignorato
END;
$$;

-- Solo la transizione VERSO 'rifiutata' di un TD04 innesca l'annullamento
-- (idempotente: un update che lascia stato_sdi='rifiutata' — OLD già rifiutata
-- — non ri-innesca il trigger).
DROP TRIGGER IF EXISTS trg_fatture_td04_rifiutata ON public.fatture;
CREATE TRIGGER trg_fatture_td04_rifiutata
  AFTER UPDATE OF stato_sdi ON public.fatture
  FOR EACH ROW
  WHEN (NEW.tipo_documento = 'TD04'
        AND NEW.stato_sdi = 'rifiutata'
        AND OLD.stato_sdi IS DISTINCT FROM 'rifiutata')
  EXECUTE FUNCTION public.annulla_effetti_storno_td04();

-- Disciplina privilegi coerente con le RPC del progetto: la funzione è
-- invocata solo dal trigger, mai chiamabile direttamente.
REVOKE ALL ON FUNCTION public.annulla_effetti_storno_td04() FROM PUBLIC, anon, authenticated;
