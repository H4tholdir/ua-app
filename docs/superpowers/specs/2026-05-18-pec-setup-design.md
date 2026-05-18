# PEC Setup — Design Spec
**Data:** 2026-05-18  
**Autore:** Francesco Formicola  
**Status:** Approvato — pronto per implementazione

---

## 1. Obiettivo

Sostituire il form tecnico attuale (`/impostazioni/pec`) con un flow guidato ultra-semplice che permetta a qualsiasi odontotecnico — senza conoscenze tecniche — di configurare e **verificare realmente** la propria PEC in meno di 2 minuti.

Il sistema deve essere **sicuro, stabile e inequivocabile**: la verifica avviene end-to-end tramite un loop email in cui UÀ riceve un messaggio dalla PEC del lab e ne conferma la ricezione automaticamente.

---

## 2. Componente: `PecSetupWidget`

Un unico componente React riutilizzabile, usato in due contesti:
- **Onboarding wizard** (step 4 di 6) — primo accesso
- **Pagina impostazioni** (`/impostazioni/pec`) — modifica successiva

---

## 3. Flow completo — 6 stati

### Stato 1: IDLE
- 2 soli campi visibili: **Indirizzo PEC** + **Password PEC**
- Bottone "Connetti e verifica →" disabilitato finché entrambi i campi non sono compilati
- Testo di supporto: "Supportiamo: Aruba · Legalmail · Namirial · Tim · Poste e altri"

### Stato 2: PROVIDER_DETECTED
- Trigger: `onBlur` sul campo email PEC
- Sistema esegue lookup domain → tabella provider hardcoded
- Se trovato: badge verde `✓ [Nome Provider]` appare inline nell'input
- Messaggio: "Impostazioni SMTP precompilate in automatico" (verde)
- Bottone attivo
- Opzione "Configura dopo" (skip consentito, reminder nella dashboard)

### Stato 3: VERIFYING
- Al click "Connetti e verifica →":
  1. Chiama `POST /api/impostazioni/pec/start-verify` → riceve `{ token: UUID }`
  2. Chiama `PATCH /api/impostazioni/pec` → salva credenziali in Vault
  3. Chiama internamente `POST /api/impostazioni/pec/send-test` → invia email a `verify+{token}@uachelab.com`
  4. Avvia polling `GET /api/impostazioni/pec/verify-status?token={token}` ogni 2 secondi
- UI mostra 4 step sequenziali:
  - ✓ Connessione SMTP
  - ✓ Autenticazione  
  - ✓ Email inviata a UÀ
  - ⟳ Attendo conferma da UÀ… (animazione)
- Mostra indirizzo destinatario: `verify+a3f8…@uachelab.com`
- Timeout: 60 secondi → se nessuna conferma → Stato 6

### Stato 4: SUCCESS
- Trigger: polling riceve `{ verified: true }`
- Cerchio verde animato ✅
- Titolo: "PEC confermata!"
- Sottotitolo: "UÀ ha ricevuto la tua email PEC e verificato l'intera catena."
- Checklist 4 voci (tutte ✓ verdi)
- Avanzamento automatico dopo 2 secondi (barra di progress animata)
- In wizard: avanza allo step successivo
- In impostazioni: rimane nella pagina, mostra stato "Verificata il [data]"

### Stato 5: UNKNOWN_PROVIDER (fallback)
- Trigger: dominio email non in lookup table
- Badge grigio `? Non riconosciuto`
- Warning: "Inserisci manualmente le impostazioni SMTP"
- Accordion aperto automaticamente con campi: Host SMTP / Porta / Utente SMTP
- Porta default: 465, SSL attivo di default
- Poi procede a verifica (stessi stati 3/4/6)

### Stato 6: ERROR + SUPPORT
- Trigger: errore nodemailer O timeout 60s polling
- Messaggio errore human-friendly (mappa da codice SMTP → testo italiano)
- Causa più comune: "password sbagliata"
- Pulsante primario: "💬 Contatta il supporto" → apre WhatsApp con messaggio precompilato
- Link secondario: "← Riprova con credenziali diverse" → torna a Stato 2
- Info box: 3 errori comuni PEC in italiano

---

## 4. Architettura — Inbound Verification Loop

```
Lab PEC → sendMail() → verify+{token}@uachelab.com
                              │
                    Cloudflare Email Routing
                    (DNS già su Cloudflare)
                              │
                    Supabase Edge Function
                    /functions/pec-verify
                              │
                    UPDATE laboratori
                    SET pec_verificata = true,
                        pec_verified_at = now()
                    WHERE pec_verify_token = {token}
                              │
                    Frontend polling 2s → ✅
```

**Perché Cloudflare Email Routing:**
- DNS già gestito su Cloudflare (zero setup aggiuntivo)
- Gratuito (tier free: 100 regole, email illimitate)
- Webhook nativo verso HTTP endpoint (Supabase Edge Function)
- Zero dipendenze esterne aggiuntive

---

## 5. Provider PEC italiani — Lookup table

```typescript
const PEC_PROVIDERS: Record<string, { name: string; host: string; port: number }> = {
  'pec.aruba.it':        { name: 'Aruba PEC',       host: 'smtps.pec.aruba.it',           port: 465 },
  'cert.legalmail.it':   { name: 'Legalmail',        host: 'sendm.cert.legalmail.it',       port: 465 },
  'sicurezzapostale.it': { name: 'Namirial',          host: 'smtps.sicurezzapostale.it',     port: 465 },
  'pec.namirial.com':    { name: 'Namirial PRO',      host: 'pro-smtps.sicurezzapostale.it', port: 465 },
  'postecert.it':        { name: 'Poste Italiane',    host: 'mail.postecert.it',             port: 465 },
  'pectim.it':           { name: 'TIM PEC',           host: 'smtps.pectim.it',               port: 465 },
  'pecmessages.it':      { name: 'PEC Messages',      host: 'smtp.pecmessages.it',           port: 465 },
  'legalmail.it':        { name: 'Legalmail (legacy)', host: 'sendm.cert.legalmail.it',      port: 465 },
}
// Tutti i provider PEC italiani usano porta 465 + SSL
// username = indirizzo PEC completo
```

---

## 6. Schema DB — Modifiche

```sql
-- Nuove colonne in tabella laboratori
ALTER TABLE laboratori 
  ADD COLUMN IF NOT EXISTS pec_verificata BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pec_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pec_verify_token UUID;

-- Indice per lookup veloce dal token
CREATE INDEX IF NOT EXISTS idx_laboratori_pec_verify_token 
  ON laboratori(pec_verify_token) 
  WHERE pec_verify_token IS NOT NULL;
```

---

## 7. API Routes

### `POST /api/impostazioni/pec/start-verify`
- Genera UUID token
- Salva `pec_verify_token = token` in DB
- Resetta `pec_verificata = false`
- Restituisce `{ token: string }`

### `GET /api/impostazioni/pec/verify-status?token={token}`
- Legge `pec_verificata` dal DB per il lab dell'utente
- Restituisce `{ verified: boolean, verified_at: string | null }`
- Sicurezza: verifica che `pec_verify_token` del lab corrisponda al token richiesto

### Supabase Edge Function: `pec-verify`
- Riceve webhook da Cloudflare con email raw
- Estrae `+{token}` dall'indirizzo TO
- Esegue: `UPDATE laboratori SET pec_verificata=true, pec_verified_at=now(), pec_verify_token=null WHERE pec_verify_token=token`
- Non richiede auth (endpoint pubblico ma token monouso)

---

## 8. Configurazione Cloudflare Email Routing

1. Dashboard Cloudflare → **Email Routing** → **Enable**
2. Aggiungi regola: `verify+*@uachelab.com` → **Send to Worker** (o HTTP endpoint)
3. Target: `https://iagibumwjstnveqpjbwq.supabase.co/functions/v1/pec-verify`
4. Costo: gratuito (Cloudflare free tier)

---

## 9. Error mapping — Messaggi italiani

| Codice SMTP / errore | Messaggio utente |
|---------------------|-----------------|
| `535 Authentication failed` | "Email o password non corretti. Usa la password della casella PEC, non quella del sito web del provider." |
| `Connection timeout` | "Non riusciamo a raggiungere il server. Controlla la connessione internet." |
| `SSL handshake failed` | "Problema di sicurezza con il server PEC. Contatta il supporto." |
| `550 Relay denied` | "Il provider non permette l'invio da applicazioni esterne. Controlla le impostazioni SMTP nel pannello del tuo provider." |
| Polling timeout 60s | "La verifica ha impiegato troppo tempo. La tua email potrebbe essere bloccata da un filtro. Contatta il supporto." |

---

## 10. WhatsApp Support Link

```
https://wa.me/39XXXXXXXXXX?text=Ciao%20Francesco%2C%20ho%20bisogno%20di%20aiuto%20per%20configurare%20la%20PEC%20su%20U%C3%80.%20Il%20mio%20provider%20%C3%A8%3A%20{provider_name}
```

Il messaggio è precompilato con il nome del provider (se rilevato).

---

## 11. Decisioni di design confermate

| Decisione | Scelta |
|-----------|--------|
| Approccio UI | Ultra-minimal (2 campi) con auto-detect provider |
| Fallback provider sconosciuto | Accordion inline con campi avanzati |
| Verifica SMTP | End-to-end loop: lab PEC → UÀ verifica ricezione |
| Stato successo | Auto-avanzamento 2 secondi con barra progress |
| Errore persistente | WhatsApp support + riprova |
| Componente | Unico `PecSetupWidget` in wizard e impostazioni |
