# Auth & Invite
**Carica quando:** task tocca login, invite, WebAuthn/passkey, CSRF, token, registrazione utenti.

## File chiave
- `src/app/api/auth/accept-invite/route.ts` — claim atomico su `inviti.accepted_at IS NULL`
- `src/app/(auth)/invite/[token]/page.tsx` — UI del flusso
- `src/lib/webauthn/config.ts` — `RP_ID`, `ALLOWED_ORIGINS` per passkey
- `src/lib/utils/csrf.ts` — `isSameOrigin()` usato in ogni route mutante
- `src/middleware.ts` — redirect su sessioni scadute (solo visivo, non security boundary)

## Invariante critica
**MAI `inviteUserByEmail` di Supabase — incompatibile con il flusso custom.**
Il token SHA-256 su tabella `inviti` è il meccanismo reale. Il claim è atomico via `.is('accepted_at', null)` nella stessa UPDATE che setta `accepted_at`.

## Issue nota (Codex — alta priorità)
Il claim brucia il token PRIMA che lab-state validation e creazione `utenti` siano completati. Un crash tra questi step lascia il token consumato e l'utente non provisionato. Da consolidare in una RPC/transazione atomica.

## Regole operative
- Two-step atomico: claim + provisioning devono stare in una transazione o RPC
- WebAuthn `RP_ID`: deve corrispondere all'origine — non cambiare senza verificare i dispositivi registrati
- `isSameOrigin()` va chiamato in ogni route che accetta mutazioni — non rimuovere
- Il `middleware.ts` fa solo redirect visivo — non è un boundary di sicurezza
