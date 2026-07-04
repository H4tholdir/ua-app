# Email Templates Supabase — Branding UÀ (DS v2.3, S4)

Configurare manualmente su: https://supabase.com/dashboard/project/iagibumwjstnveqpjbwq/auth/templates

Rebrand DS v2.3 (Warm Panna) approvato da Francesco (04/07/2026). Mockup e decisione:
`docs/design/mockups/2026-07-04-s4-email-templates-branding.html` ·
`docs/design/decisions/2026-07-04-s4-email-templates-branding.md`.

**Note tecniche (email HTML, non React):**
- Colori hardcoded in hex (i client email non leggono CSS custom properties) — stessi valori di `src/design-system/tokens.ts`.
- Font `'DM Sans', Helvetica, Arial, sans-serif` — fallback necessario, molti client email ignorano i webfont.
- Layout a tabelle (`role="presentation"`), non flexbox/grid — supporto Outlook desktop.
- Logo: `https://uachelab.com/ua-logo-email.png` (asset già esistente in `public/`, 120×120, ottimizzato per email — stessa icona della pagina di login).
- Link di fallback sotto il bottone nascosto in `<details><summary>` (spoiler nativo HTML, nessun JS). Degrado sicuro: Apple Mail/client moderni lo mostrano collassato e cliccabile; Outlook desktop e alcune versioni di Gmail ignorano l'interattività e lo mostrano già espanso — mai nascosto in modo irraggiungibile.
- `{{ .ConfirmationURL }}` è la variabile standard di Supabase, sostituita a invio con l'URL reale — usata sia nel bottone sia nel testo del link copiabile (che quindi mostrerà l'URL completo, non troncato).

## Template: Confirm Signup
```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#DDD8D3;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#EDEDEA;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px 28px 20px;text-align:center;">
        <img src="https://uachelab.com/ua-logo-email.png" width="64" height="64" alt="UÀ" style="display:block;margin:0 auto;border-radius:16px;border:0;" />
      </td></tr>
      <tr><td style="padding:0 28px 24px;">
        <p style="margin:0 0 4px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#D90012;">Conferma il tuo indirizzo</p>
        <h2 style="margin:0 0 14px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#1C1916;">Benvenuto in UÀ!</h2>
        <p style="margin:0 0 20px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#4A3D33;">
          Sei stato invitato a gestire il tuo laboratorio odontotecnico su UÀ. Conferma il tuo indirizzo email per attivare l'account.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#D90012;border-radius:12px;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Conferma email →</a>
        </td></tr></table>
        <details style="margin-top:22px;">
          <summary style="cursor:pointer;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:#6B5C51;">Il bottone non funziona?</summary>
          <p style="margin:8px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B5C51;">
            Copia e incolla questo link nel browser:
          </p>
          <p style="margin:4px 0 0;word-break:break-all;">
            <a href="{{ .ConfirmationURL }}" style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;color:#D90012;text-decoration:underline;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </p>
        </details>
      </td></tr>
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #D4CFC9;">
        <p style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#6B5C51;">
          UÀ — Il laboratorio più rapido, più semplice, più UÀ.<br>Non hai richiesto questo? Ignora questa email.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

## Template: Reset Password
```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#DDD8D3;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#EDEDEA;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px 28px 20px;text-align:center;">
        <img src="https://uachelab.com/ua-logo-email.png" width="64" height="64" alt="UÀ" style="display:block;margin:0 auto;border-radius:16px;border:0;" />
      </td></tr>
      <tr><td style="padding:0 28px 24px;">
        <p style="margin:0 0 4px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#D90012;">Richiesta reset password</p>
        <h2 style="margin:0 0 14px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#1C1916;">Reimposta la tua password</h2>
        <p style="margin:0 0 20px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#4A3D33;">
          Hai richiesto il reset della password per il tuo account UÀ. Il link è valido per 1 ora.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#D90012;border-radius:12px;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Reimposta password →</a>
        </td></tr></table>
        <details style="margin-top:22px;">
          <summary style="cursor:pointer;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:#6B5C51;">Il bottone non funziona?</summary>
          <p style="margin:8px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B5C51;">
            Copia e incolla questo link nel browser:
          </p>
          <p style="margin:4px 0 0;word-break:break-all;">
            <a href="{{ .ConfirmationURL }}" style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;color:#D90012;text-decoration:underline;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </p>
        </details>
      </td></tr>
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #D4CFC9;">
        <p style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#6B5C51;">
          Non hai richiesto questo reset? Ignora questa email — la tua password resterà invariata.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

## Template: Invite User
```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#DDD8D3;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#EDEDEA;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px 28px 20px;text-align:center;">
        <img src="https://uachelab.com/ua-logo-email.png" width="64" height="64" alt="UÀ" style="display:block;margin:0 auto;border-radius:16px;border:0;" />
      </td></tr>
      <tr><td style="padding:0 28px 24px;">
        <p style="margin:0 0 4px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#D90012;">Invito a collaborare</p>
        <h2 style="margin:0 0 14px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#1C1916;">Sei stato invitato su UÀ</h2>
        <p style="margin:0 0 20px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#4A3D33;">
          Qualcuno ti ha invitato a collaborare in un laboratorio su UÀ. Accetta l'invito e imposta la tua password per iniziare.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#D90012;border-radius:12px;">
          <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:13px 26px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Accetta invito →</a>
        </td></tr></table>
        <details style="margin-top:22px;">
          <summary style="cursor:pointer;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:#6B5C51;">Il bottone non funziona?</summary>
          <p style="margin:8px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#6B5C51;">
            Copia e incolla questo link nel browser:
          </p>
          <p style="margin:4px 0 0;word-break:break-all;">
            <a href="{{ .ConfirmationURL }}" style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;color:#D90012;text-decoration:underline;word-break:break-all;">{{ .ConfirmationURL }}</a>
          </p>
        </details>
      </td></tr>
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #D4CFC9;">
        <p style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#6B5C51;">
          UÀ — Dalla prescrizione alla consegna, tutto in un tap.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
```
