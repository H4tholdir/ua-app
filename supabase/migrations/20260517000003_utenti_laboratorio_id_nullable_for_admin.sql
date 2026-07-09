-- Fix: utenti.laboratorio_id era NOT NULL assoluto, ma gli utenti admin_sistema
-- devono poter esistere senza un laboratorio (quando il loro lab viene eliminato).
-- Rimuoviamo NOT NULL e aggiungiamo un CHECK che lo richiede solo per ruoli normali.

ALTER TABLE utenti ALTER COLUMN laboratorio_id DROP NOT NULL;

ALTER TABLE utenti ADD CONSTRAINT utenti_lab_required_for_non_admin
  CHECK (ruolo = 'admin_sistema' OR laboratorio_id IS NOT NULL);
