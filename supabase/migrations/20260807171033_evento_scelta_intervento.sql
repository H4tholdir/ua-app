-- Ondata «si deve sempre poter intervenire» — il bivio dei due difetti (D304 · D305).
-- Spec: docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md §4.1
--
-- 🛑 PERCHÉ UNA SOLA IMPLICAZIONE E NON IL BICONDIZIONALE («presente ⇔ motivo ∈ {due}»):
-- provato: in banca dati esistono GIÀ 2 righe con motivo='difetto_lavorazione' e
-- nessuna scelta. Il biconditionale farebbe abortire questa migration (23514), e
-- NOT VALID non salva: lascerebbe quelle righe non più aggiornabili al primo UPDATE.
-- L'altra metà della regola vive nel 422 della rotta, dove sta la regola viva:
-- metterla qui creerebbe la seconda fonte di verità accanto a src/lib/qualita/effetti.ts
-- (riga 22 della coda: «le liste scritte due volte»).
ALTER TABLE public.eventi_qualita
  ADD COLUMN IF NOT EXISTS scelta_intervento TEXT;

ALTER TABLE public.eventi_qualita
  DROP CONSTRAINT IF EXISTS evento_scelta_vocabolario;
ALTER TABLE public.eventi_qualita
  ADD CONSTRAINT evento_scelta_vocabolario
  CHECK (scelta_intervento IS NULL OR scelta_intervento IN ('si_sistema','si_rifa'));

ALTER TABLE public.eventi_qualita
  DROP CONSTRAINT IF EXISTS evento_scelta_solo_sui_difetti;
ALTER TABLE public.eventi_qualita
  ADD CONSTRAINT evento_scelta_solo_sui_difetti
  CHECK (scelta_intervento IS NULL
         OR motivo IN ('difetto_lavorazione','difetto_materiale'));

COMMENT ON COLUMN public.eventi_qualita.scelta_intervento IS
  'Il bivio dei due difetti (D290 · D297 · D304): si_sistema → il lavoro torna a '
  'pronto e la dichiarazione resta valida; si_rifa → il lavoro resta consegnato e '
  'nasce un rifacimento. NULL sugli altri sette motivi.';
