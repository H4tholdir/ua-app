# Supabase Configuration — Configurazione manuale

## Email Templates (Task 4 Piano A — MANUALE)

Configura manualmente in: **Supabase Dashboard → Authentication → Email Templates**

Progetto: `iagibumwjstnveqpjbwq.supabase.co`

---

### Reset Password

**Subject:**
```
Reimposta la tua password UÀ
```

**Body (HTML):**
```html
<div style="font-family:'DM Sans',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <img src="{{ .SiteURL }}/ua-icon.png" alt="UÀ" width="64" height="64" style="border-radius:16px;">
  </div>
  <h1 style="font-size:22px;font-weight:800;color:#1A1714;text-align:center;margin:0 0 8px;">
    Reimposta la password
  </h1>
  <p style="color:#6B6460;font-size:15px;text-align:center;margin:0 0 28px;">
    Clicca il pulsante qui sotto per scegliere una nuova password per il tuo account UÀ.
  </p>
  <div style="text-align:center;">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#D90012;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      Reimposta password
    </a>
  </div>
  <p style="color:#9C9490;font-size:12px;text-align:center;margin:24px 0 0;">
    Se non hai richiesto questo reset, ignora questa email.<br>
    Il link scade tra 1 ora.
  </p>
</div>
```

---

### Invite User

**Subject:**
```
Sei stato invitato su UÀ — {{ .SiteURL }}
```

**Body (HTML):**
```html
<div style="font-family:'DM Sans',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:24px;">
    <img src="{{ .SiteURL }}/ua-icon.png" alt="UÀ" width="64" height="64" style="border-radius:16px;">
  </div>
  <h1 style="font-size:22px;font-weight:800;color:#1A1714;text-align:center;margin:0 0 8px;">
    Benvenuto in UÀ!
  </h1>
  <p style="color:#6B6460;font-size:15px;text-align:center;margin:0 0 28px;">
    Sei stato invitato ad attivare il tuo laboratorio su UÀ.<br>
    Clicca qui sotto per completare la registrazione — ci vogliono meno di 5 minuti.
  </p>
  <div style="text-align:center;">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:#D90012;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      Attiva il mio account
    </a>
  </div>
  <p style="color:#9C9490;font-size:12px;text-align:center;margin:24px 0 0;">
    Il link scade tra 24 ore.<br>
    Problemi? Scrivi a supporto@ua.app
  </p>
</div>
```

---

### Magic Link (se abilitato)

**Subject:**
```
Il tuo link di accesso UÀ
```

**Body:** Stesso schema degli altri — logo UÀ, bottone rosso `#D90012`, link scadenza.

---

## Verifica post-configurazione

Dopo aver salvato i template:
1. Supabase Dashboard → Authentication → Users → seleziona utente test
2. Clicca "Send magic link" o "Reset password"
3. Verifica email ricevuta:
   - ✅ Nessuna menzione di "Supabase"
   - ✅ Logo UÀ visibile
   - ✅ Bottone rosso funzionante
   - ✅ Link di destinazione corretto

---

*Ultima modifica: 2026-05-15 — Piano A Foundation*
