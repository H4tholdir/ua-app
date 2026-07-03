// PATCH rimosso — B2: fatture.pagata/importo_pagato sono derivati via trigger
// (vedi supabase/migrations/20260702185348_b2_contabilita_clienti.sql).
// Registrare un pagamento: POST /api/pagamenti con { fattura_id, importo, ... }.
export {}
