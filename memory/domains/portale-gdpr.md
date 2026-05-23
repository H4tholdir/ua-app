# Portale Dentista & GDPR
**Carica quando:** task tocca portale dentista, token portale, PHI, WhatsApp, privacy, GDPR.

## File chiave
- `src/app/portale/[token]/page.tsx` — accesso senza auth Supabase via `portale_token`
- `src/lib/consegna/whatsapp-template.ts` — template GDPR-safe
- `src/app/api/portale/richiedi/route.ts` — dentista crea richiesta lavoro via token
- `src/app/api/clienti/[id]/portale-token/route.ts` — refresh token portale

## Invariante critica
**ZERO PHI in comunicazioni esterne.** Nessun nome paziente, tipo prestazione clinica, nome lab in WhatsApp o portale.
Solo: numero lavoro + link token portale. Regola: GDPR Art. 9 — dato sanitario.
La funzione `minimizzaPhi` nel portale riduce il nome del paziente anche per il dentista: `"ROSSI MARIO"` → `"R. MARIO"`.

## Regole operative
- WhatsApp: deep links `wa.me` — MAI `open-wa` (ToS violation)
- Il portale usa `service_role` senza autenticazione Supabase — l'unica protezione è la validità del token e `portale_token_scade_at`
- Token refresh: il vecchio token deve essere invalidato quando se ne genera uno nuovo
- Il portale è intenzionalmente accessibile senza account Supabase — non aggiungere auth Supabase al percorso portale
