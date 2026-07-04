-- Rimuove l'indice esplicito su inviti_rete.token_hash: il vincolo UNIQUE
-- sulla colonna crea già un indice B-tree univoco identico, questo era
-- un secondo indice ridondante senza benefici in lettura (findings review
-- finale B8 5/5).
DROP INDEX IF EXISTS idx_inviti_rete_token_hash;
