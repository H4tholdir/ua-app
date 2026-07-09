-- REPLICA IDENTITY FULL per Supabase Realtime
-- Senza FULL, payload.old contiene SOLO la primary key.
-- I confronti in useRealtimeNotifiche (old.stato, old.segnalazione_tipo, old.priorita)
-- richiedono i vecchi valori completi per evitare falsi positivi.

ALTER TABLE public.lavori REPLICA IDENTITY FULL;

-- Per sicurezza: stessa impostazione per le altre tabelle già in pubblicazione realtime
ALTER TABLE public.fatture REPLICA IDENTITY FULL;
