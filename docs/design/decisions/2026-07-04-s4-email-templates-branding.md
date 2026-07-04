# S4 — Email Templates Branding (Supabase Auth) — Decisioni Approvate (sessione 04/07/2026)

**Approvato da Francesco Formicola — 4 luglio 2026**
**Mockup:** `docs/design/mockups/2026-07-04-s4-email-templates-branding.html`
**HTML finale pronto per Supabase:** `docs/email-templates-supabase.md`

---

## Contesto

La bozza HTML precedente (in `docs/email-templates-supabase.md`, scritta prima dell'adozione di DS v2.3) era minimale: nessun colore/font brandizzato, nessun logo, link di fallback non cliccabile. S4 prevedeva solo l'applicazione manuale su Supabase Dashboard — in fase di ripresa del task si è deciso di ridisegnare prima i 3 template per rispettare il design system attuale.

## Decisioni

1. **Rebrand DS v2.3 Warm Panna** — palette hardcoded in hex (email non legge CSS custom properties): `#DDD8D3` bg, `#EDEDEA` card, `#1C1916` t1, `#4A3D33` t2, `#6B5C51` t3, `#D90012` primary. Font `'DM Sans', Helvetica, Arial, sans-serif` (fallback necessario per compatibilità client email). Layout a tabelle inline, non flexbox/grid (supporto Outlook desktop).

2. **Logo reale in alto** (feedback Francesco, round 1) — sostituito il wordmark testuale "UÀ" con l'immagine `ua-logo-email.png` (asset già presente in `public/`, 120×120, ottimizzato per email, stessa icona della pagina di login), servita in produzione da `https://uachelab.com/ua-logo-email.png`.

3. **Link di fallback cliccabile e integralmente leggibile** (feedback Francesco, round 1) — sostituito il testo statico troncato ("...") con un vero `<a href="{{ .ConfirmationURL }}">` che mostra l'URL completo, con `word-break: break-all` per non tagliare su mobile.

4. **Link di fallback nascosto sotto spoiler** (feedback Francesco, round 2) — avvolto in `<details><summary>Il bottone non funziona?</summary>...</details>`, unico meccanismo di disclosure disponibile in HTML email (nessun JS permesso). **Trade-off accettato esplicitamente:** il supporto è incostante tra client — Apple Mail e la maggior parte dei client moderni lo rendono come spoiler vero e proprio; Outlook desktop (motore Word) e alcune versioni di Gmail ignorano l'interattività e mostrano il contenuto già espanso. Degrado sicuro in ogni caso: il link resta sempre raggiungibile, mai nascosto in modo irrecuperabile.

5. **`{{ .ConfirmationURL }}` unica variabile usata** — stessa variabile standard di Supabase in tutti e 3 i template (Confirm Signup, Reset Password, Invite User), sia nel bottone sia nel testo del link sotto lo spoiler.

## Verifica applicata

- Screenshot Playwright del mockup (3 round: v1 rebrand base, v2 logo+link cliccabile, v3 spoiler collassato/espanso) in `docs/design/mockups/screenshots/`.
- Verificato via `preview_eval` che le 3 immagini logo caricano (`naturalWidth: 120`) e che i 6 link (bottone + spoiler × 3 template) hanno `href` reali (non `#`).
- Non verificato in questa sessione: rendering reale in Gmail/Outlook/Apple Mail via invio di test effettivo (richiede applicazione su Supabase Dashboard — passo successivo).

## Non toccato

Le email custom dell'app (inviti collaboratore/rete) — `send-invito-email.ts`, `send-invito-rete-email.ts` — sono già brandizzate e con escaping HTML condiviso (hardening B8, 04/07/2026), fuori scope di S4.
