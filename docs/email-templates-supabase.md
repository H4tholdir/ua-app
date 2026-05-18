# Email Templates Supabase — Branding UÀ

Configurare manualmente su: https://supabase.com/dashboard/project/iagibumwjstnveqpjbwq/auth/templates

## Template: Confirm Signup (Invite User)
```html
<h2>Benvenuto in UÀ!</h2>
<p>Sei stato invitato a gestire il tuo laboratorio odontotecnico su UÀ.</p>
<p><a href="{{ .ConfirmationURL }}">Accetta l'invito →</a></p>
<p style="font-size:12px;color:#999;">UÀ — Il laboratorio più rapido, più semplice, più UÀ.</p>
```

## Template: Reset Password
```html
<h2>Reset password — UÀ</h2>
<p>Hai richiesto il reset della password per il tuo account UÀ.</p>
<p><a href="{{ .ConfirmationURL }}">Reimposta la password →</a></p>
<p style="font-size:12px;color:#999;">Se non hai richiesto questo reset, ignora questa email.</p>
```

## Template: Invite User
```html
<h2>Sei invitato in UÀ</h2>
<p>Qualcuno ti ha invitato a collaborare nel laboratorio su UÀ.</p>
<p><a href="{{ .ConfirmationURL }}">Accetta l'invito e imposta la password →</a></p>
<p style="font-size:12px;color:#999;">UÀ — Dalla prescrizione alla consegna, tutto in un tap.</p>
```
