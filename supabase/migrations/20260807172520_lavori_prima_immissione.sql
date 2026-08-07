-- Ondata «si deve sempre poter intervenire» — Task 2.
-- 🔑 La memoria della PRIMA immissione sul mercato non può vivere in
-- data_consegna_effettiva: quella colonna viene azzerata da ogni riapertura
-- (riapri_lavoro_atomica) e riscritta a ogni consegna (orchestrate.ts). Dopo
-- una riconsegna direbbe la data SBAGLIATA (la seconda, non la prima) e un
-- laboratorio che si fidasse distruggerebbe la dichiarazione troppo presto.
-- Allegato XIII punto 4 + Art. 2(28): i 10 anni di conservazione della
-- dichiarazione decorrono dalla PRIMA messa a disposizione.
ALTER TABLE public.lavori
  ADD COLUMN IF NOT EXISTS prima_immissione_at TIMESTAMPTZ;

-- Backfill: solo i lavori GIA' consegnati hanno una prima immissione nota.
-- provato: 223 lavori consegnati su 224 hanno data_consegna_effettiva
-- valorizzata; il 224esimo resta NULL, ed è corretto — non si inventa una
-- data che non c'è.
UPDATE public.lavori
   SET prima_immissione_at = data_consegna_effettiva
 WHERE stato = 'consegnato'
   AND data_consegna_effettiva IS NOT NULL
   AND prima_immissione_at IS NULL;

COMMENT ON COLUMN public.lavori.prima_immissione_at IS
  'La PRIMA volta che il manufatto è stato messo a disposizione (Art. 2(28)): da '
  'qui decorrono i 10 anni di conservazione della dichiarazione (Allegato XIII p.4). '
  'Si scrive una volta sola e NESSUNA riapertura la azzera — a differenza di '
  'data_consegna_effettiva, che descrive la consegna CORRENTE.';
