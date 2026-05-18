# Piano F — V1 Go-Live: Bug Fix + Funzionalità Bloccanti

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Risolvere tutti i bug bloccanti e completare le funzionalità mancanti necessarie per dare accesso a Filippo Opromolla alla versione V1 stabile di UÀ.

**Architecture:** Next.js 15 App Router + Supabase + Stripe. Le modifiche toccano principalmente le pagine `(app)/impostazioni/*`, il form nuovo lavoro, e una nuova pagina onboarding wizard. Nessuna modifica al design system (già v2.2 warm panna).

**Tech Stack:** Next.js 16, TypeScript, Supabase (auth + db + vault), nodemailer (PEC SMTP), TailwindCSS + shadcn/ui, Motion 12.x (tokens da `src/design-system/motion.ts`)

**Repo:** https://github.com/H4tholdir/ua-app  
**Prod:** https://uachelab.com  
**Supabase project:** `iagibumwjstnveqpjbwq`  
**Lab Filippo ID:** `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`

---

## Contesto codebase essenziale

```
src/app/(app)/
  lavori/nuovo/page.tsx          ← form nuovo lavoro (ha già ClienteComboBox)
  impostazioni/page.tsx          ← read-only oggi, serve edit mode
  impostazioni/pec/              ← DA CREARE
  impostazioni/profilo/          ← DA CREARE
  onboarding/                    ← DA CREARE (wizard 6-step)

src/app/api/
  impostazioni/route.ts          ← GET + PATCH laboratorio (esclude pec_password)
  lavori/route.ts                ← POST crea lavoro

src/lib/
  fattura/send-pec.ts            ← usa nodemailer + pec_vault_key_id
  consegna/pec-idempotency.ts    ← idempotenza invio PEC

src/components/features/lavori/form/
  TabDati.tsx                    ← usa ClienteComboBox (connesso)
  LavoroFormShell.tsx            ← shell con tab

src/components/layout/
  UserProfileSheet.tsx           ← profilo utente (già creato)
```

**Regole design obbligatorie:**
- Colori: `--bg:#DDD8D3`, `--sfc:#E4DFD9`, `--elv:#EDEDEA`, `--prs:#D4CFC9`
- Font: DM Sans — MAI Inter
- Shadow: warm-tinted (vedi admin.css) — MAI cobalt o `#cacaca`
- Animazioni: SOLO da `src/design-system/motion.ts` — MAI `duration:0.3` inline
- Logout button: `.ua-profile-logout-btn` (CSS in globals.css)
- Toggle tema: `.ua-profile-theme-switch` (CSS in globals.css)
- MAI `Date.now()` durante il render — calcolare in Server Component o `useState`

---

## Task 1: Debug e fix form Nuovo Lavoro

**Problema:** Il form `/lavori/nuovo` mostra `ClienteComboBox` ma potrebbe non salvare correttamente `cliente_id` o la selezione non essere visibile all'utente. Verificare il flusso completo.

**Files:**
- Read: `src/app/(app)/lavori/nuovo/page.tsx`
- Read: `src/components/features/lavori/form/TabDati.tsx`
- Read: `src/components/features/clienti/ClienteComboBox.tsx`
- Read: `src/app/api/lavori/route.ts` (POST handler)
- Possibly modify: `src/app/(app)/lavori/nuovo/page.tsx`

- [ ] **Step 1: Leggi e analizza il flusso cliente_id**

```bash
# Leggi questi 4 file per capire il flusso completo
cat src/app/(app)/lavori/nuovo/page.tsx
cat src/components/features/lavori/form/TabDati.tsx
cat src/components/features/clienti/ClienteComboBox.tsx
# Poi cerca nel POST di /api/lavori dove viene usato cliente_id
grep -n "cliente_id\|clienteId" src/app/api/lavori/route.ts
```

- [ ] **Step 2: Testa il form manualmente su uachelab.com**

Vai a `https://uachelab.com/lavori/nuovo` loggato come titolare Filippo. Verifica:
1. La ComboBox dentista è visibile e funzionante
2. Cerca "Dental Center" — vedi risultati?
3. Seleziona un dentista — viene impostato?
4. Compila tutti i campi obbligatori e premi Salva
5. Ottieni un errore? Quale?

Se il form funziona correttamente → Task 1 done (era già fixato).
Se il form non mostra la ComboBox → continua Step 3.

- [ ] **Step 3: Fix se ClienteComboBox non è visibile (condizionale)**

In `TabDati.tsx`, la ComboBox viene renderizzata solo `{onClienteChange && ...}`. Verificare che il prop venga passato correttamente da `page.tsx`. Se il rendering è condizionale e il prop non arriva, fixare così:

In `src/app/(app)/lavori/nuovo/page.tsx`, assicurarsi che `TabDati` riceva entrambi i props:
```tsx
<TabDati
  data={formData}
  onChange={handleChange}
  clienteId={clienteId}
  onClienteChange={handleClienteChange}  // ← deve essere presente
/>
```

- [ ] **Step 4: Fix firma handleClienteChange se non matcha interface**

`ClienteComboBox` chiama `onChange(id: string, label: string)` ma page.tsx ha `handleClienteChange(id: string)`. La firma deve accettare entrambi:

```typescript
// src/app/(app)/lavori/nuovo/page.tsx — linea ~44
const handleClienteChange = useCallback((id: string, _label?: string) => {
  setClienteId(id)
  setError(null)
}, [])
```

- [ ] **Step 5: Verifica API POST accetta cliente_id**

```bash
grep -n "cliente_id\|required\|obbligatori" src/app/api/lavori/route.ts
```

Assicurarsi che il POST body includa `cliente_id` e che sia required nella validazione.

- [ ] **Step 6: TypeScript check**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx tsc --noEmit 2>&1
```

Atteso: zero errori.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(app\)/lavori/nuovo/page.tsx
git add src/components/features/lavori/form/TabDati.tsx
git commit -m "fix(lavori): verifica e fix ClienteComboBox in form nuovo lavoro"
```

---

## Task 2: Impostazioni — Edit mode dati laboratorio

**Problema:** `/impostazioni` è read-only. Serve un form per modificare tutti i campi del laboratorio (nome, indirizzo, ITCA, PRRC, ecc.). L'API PATCH esiste già.

**Files:**
- Modify: `src/app/(app)/impostazioni/page.tsx`
- Read: `src/app/api/impostazioni/route.ts` (capire quali campi accetta PATCH)

- [ ] **Step 1: Leggi i campi accettati dal PATCH**

```bash
grep -A 30 "ALLOWED_FIELDS\|allowedFields\|patchable\|const fields" src/app/api/impostazioni/route.ts
```

Nota tutti i campi che il PATCH accetta. Questi sono i campi che il form deve esporre.

- [ ] **Step 2: Crea ImpostazioniEditForm come Client Component**

Crea `src/components/features/impostazioni/ImpostazioniEditForm.tsx`:

```typescript
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Audio feedback
let _ac: AudioContext | null = null
function sndClick() {
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const c = _ac; const len = Math.floor(c.sampleRate * 0.022)
    const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
    const src = c.createBufferSource(); src.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.5
    const g = c.createGain(); g.gain.setValueAtTime(0.45, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.022)
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start()
  } catch { /* silent */ }
}

interface LabFormData {
  nome: string; ragione_sociale: string; partita_iva: string; codice_fiscale: string
  indirizzo: string; cap: string; citta: string; provincia: string
  telefono: string; email: string; pec: string
  codice_itca: string; srn_eudamed: string
  prrc_nome: string; prrc_qualifica: string
  regime_fiscale: string; codice_iva_default: string
}

interface Props {
  initialData: Partial<LabFormData>
}

export function ImpostazioniEditForm({ initialData }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<LabFormData>({
    nome: initialData.nome ?? '',
    ragione_sociale: initialData.ragione_sociale ?? '',
    partita_iva: initialData.partita_iva ?? '',
    codice_fiscale: initialData.codice_fiscale ?? '',
    indirizzo: initialData.indirizzo ?? '',
    cap: initialData.cap ?? '',
    citta: initialData.citta ?? '',
    provincia: initialData.provincia ?? '',
    telefono: initialData.telefono ?? '',
    email: initialData.email ?? '',
    pec: initialData.pec ?? '',
    codice_itca: initialData.codice_itca ?? '',
    srn_eudamed: initialData.srn_eudamed ?? '',
    prrc_nome: initialData.prrc_nome ?? '',
    prrc_qualifica: initialData.prrc_qualifica ?? '',
    regime_fiscale: initialData.regime_fiscale ?? 'RF01',
    codice_iva_default: initialData.codice_iva_default ?? 'N4',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [open, setOpen] = useState(false)

  const setF = (key: keyof LabFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); sndClick()
    setLoading(true); setMsg(null)
    const res = await fetch('/api/impostazioni', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) { setMsg({ type: 'ok', text: 'Salvato.' }); setOpen(false); router.refresh() }
    else { setMsg({ type: 'err', text: data.error ?? 'Errore salvataggio' }) }
  }, [form, router])

  // Stili inline che seguono il design system v2.2
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
    background: 'var(--prs, #D4CFC9)',
    boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)',
    outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--t2, #96918D)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'block',
  }
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { sndClick(); setOpen(true) }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 18px', borderRadius: '12px', border: 'none',
          background: 'var(--elv, #EDEDEA)', cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700,
          color: 'var(--t2, #96918D)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
        Modifica
      </button>
    )
  }

  return (
    <form onSubmit={handleSave} style={{ marginTop: '16px' }}>
      {/* Identità */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px' }}>
        Identità
      </div>
      <div style={fieldStyle}><label style={labelStyle}>Nome commerciale *</label><input style={inputStyle} value={form.nome} onChange={setF('nome')} required /></div>
      <div style={fieldStyle}><label style={labelStyle}>Ragione sociale</label><input style={inputStyle} value={form.ragione_sociale} onChange={setF('ragione_sociale')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>Partita IVA</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.partita_iva} onChange={setF('partita_iva')} maxLength={11} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Codice Fiscale</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.codice_fiscale} onChange={setF('codice_fiscale')} /></div>
      </div>
      {/* Sede */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '4px' }}>Sede</div>
      <div style={fieldStyle}><label style={labelStyle}>Indirizzo</label><input style={inputStyle} value={form.indirizzo} onChange={setF('indirizzo')} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 80px', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>CAP</label><input style={inputStyle} value={form.cap} onChange={setF('cap')} maxLength={5} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Città</label><input style={inputStyle} value={form.citta} onChange={setF('citta')} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Prov.</label><input style={{ ...inputStyle, textTransform: 'uppercase' }} value={form.provincia} onChange={setF('provincia')} maxLength={2} /></div>
      </div>
      {/* Contatti */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '4px' }}>Contatti</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>Telefono</label><input style={inputStyle} type="tel" value={form.telefono} onChange={setF('telefono')} /></div>
        <div style={fieldStyle}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={setF('email')} /></div>
      </div>
      {/* Normativo */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '4px' }}>Normativo MDR</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>Codice ITCA</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.codice_itca} onChange={setF('codice_itca')} placeholder="ITCAxxxxxxx" /></div>
        <div style={fieldStyle}><label style={labelStyle}>SRN EUDAMED</label><input style={{ ...inputStyle, fontFamily: 'monospace' }} value={form.srn_eudamed} onChange={setF('srn_eudamed')} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}><label style={labelStyle}>PRRC Nome</label><input style={inputStyle} value={form.prrc_nome} onChange={setF('prrc_nome')} /></div>
        <div style={fieldStyle}><label style={labelStyle}>PRRC Qualifica</label><input style={inputStyle} value={form.prrc_qualifica} onChange={setF('prrc_qualifica')} /></div>
      </div>
      {/* Fatturazione */}
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '8px', marginTop: '4px' }}>Fatturazione</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Regime fiscale</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.regime_fiscale} onChange={setF('regime_fiscale')}>
            <option value="RF01">RF01 — Ordinario</option>
            <option value="RF19">RF19 — Forfettario</option>
            <option value="RF02">RF02 — Minimi</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Codice IVA default</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.codice_iva_default} onChange={setF('codice_iva_default')}>
            <option value="N4">N4 — Esente Art.10 n.18</option>
            <option value="N2.2">N2.2 — Non soggetto Art.7</option>
            <option value="22">22% — IVA ordinaria</option>
          </select>
        </div>
      </div>
      {/* Azioni */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 22px', borderRadius: '12px', border: 'none',
            background: 'var(--primary, #D90012)', color: '#fff',
            fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
          }}
        >
          {loading ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px' }}>
          Annulla
        </button>
      </div>
      {msg && (
        <div style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '10px', fontSize: '13px',
          background: msg.type === 'ok' ? 'rgba(22,163,74,.08)' : 'rgba(217,0,18,.07)',
          color: msg.type === 'ok' ? '#16A34A' : '#D90012' }}>
          {msg.text}
        </div>
      )}
    </form>
  )
}
```

- [ ] **Step 3: Integra ImpostazioniEditForm nella pagina impostazioni**

In `src/app/(app)/impostazioni/page.tsx`, importa e aggiungi il form prima del primo SectionCard:

```typescript
import { ImpostazioniEditForm } from '@/components/features/impostazioni/ImpostazioniEditForm'

// Dentro il return, dopo l'AppHeader:
<PageWrapper>
  <div style={{ padding: '0 20px 24px' }}>
    <ImpostazioniEditForm initialData={lab} />  {/* ← aggiungere */}
    {/* ... existing SectionCards */}
  </div>
</PageWrapper>
```

- [ ] **Step 4: TypeScript + lint check**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx tsc --noEmit && npx eslint src/components/features/impostazioni/ImpostazioniEditForm.tsx 2>&1
```

Atteso: zero errori.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/impostazioni/ImpostazioniEditForm.tsx
git add src/app/\(app\)/impostazioni/page.tsx
git commit -m "feat(impostazioni): aggiungi form modifica dati laboratorio"
```

---

## Task 3: Impostazioni PEC — Configurazione SMTP

**Problema:** Non esiste una UI per configurare le credenziali SMTP PEC. Il DB ha `pec_host`, `pec_port`, `pec_user`, `pec_vault_key_id`. La password viene salvata su Supabase Vault.

**Files:**
- Create: `src/app/(app)/impostazioni/pec/page.tsx`
- Create: `src/app/api/impostazioni/pec/route.ts`

**Nota architetturale:** Supabase Vault non è accessibile via client-side. La password PEC viene salvata via `vault.create_secret()` in una PostgreSQL function. L'approccio V1: API server-side che aggiorna i campi non-sensibili via PATCH e chiama una RPC per la password.

- [ ] **Step 1: Crea migration per RPC salvataggio PEC password in Vault**

Crea `supabase/migrations/20260518_pec_vault_upsert.sql`:

```sql
-- Funzione per salvare/aggiornare password PEC nel Vault di Supabase
-- Richiede l'estensione vault (già abilitata nei progetti Supabase)
CREATE OR REPLACE FUNCTION upsert_pec_vault_secret(
  p_lab_id   UUID,
  p_password TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing_key_id UUID;
  v_new_key_id      UUID;
BEGIN
  -- Leggi il key_id esistente
  SELECT pec_vault_key_id INTO v_existing_key_id
  FROM laboratori WHERE id = p_lab_id;

  IF v_existing_key_id IS NOT NULL THEN
    -- Aggiorna il secret esistente
    PERFORM vault.update_secret(v_existing_key_id, p_password);
  ELSE
    -- Crea nuovo secret
    v_new_key_id := vault.create_secret(
      p_password,
      'pec_password_' || p_lab_id::text,
      'PEC SMTP password for lab ' || p_lab_id::text
    );
    UPDATE laboratori SET pec_vault_key_id = v_new_key_id WHERE id = p_lab_id;
  END IF;
END;
$$;

-- Funzione per leggere la password PEC dal Vault (solo server-side / SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_pec_vault_secret(p_lab_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key_id UUID;
  v_secret TEXT;
BEGIN
  SELECT pec_vault_key_id INTO v_key_id FROM laboratori WHERE id = p_lab_id;
  IF v_key_id IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$$;
```

- [ ] **Step 2: Applica migration al remote Supabase**

```bash
# Via Supabase MCP oppure:
npx supabase db push --project-ref iagibumwjstnveqpjbwq
```

Oppure eseguila manualmente via `mcp__plugin_supabase_supabase__apply_migration`.

- [ ] **Step 3: Crea API route per configurazione PEC**

Crea `src/app/api/impostazioni/pec/route.ts`:

```typescript
import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import nodemailer from 'nodemailer'

async function getLabId(userId: string): Promise<string | null> {
  const svc = getServiceClient()
  const { data } = await svc.from('utenti').select('laboratorio_id, ruolo').eq('id', userId).single()
  if (!data || !['titolare', 'admin_rete'].includes(data.ruolo ?? '')) return null
  return data.laboratorio_id ?? null
}

// PATCH /api/impostazioni/pec — salva host/port/user + password in vault
export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const labId = await getLabId(user.id)
  if (!labId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    pec_host?: string; pec_port?: number; pec_user?: string; pec_password?: string
  } | null
  if (!body) return NextResponse.json({ error: 'Body non valido' }, { status: 400 })

  const svc = getServiceClient()

  // Aggiorna campi non-sensibili
  const updateFields: Record<string, unknown> = {}
  if (body.pec_host !== undefined) updateFields.pec_host = body.pec_host || null
  if (body.pec_port !== undefined) updateFields.pec_port = body.pec_port || null
  if (body.pec_user !== undefined) updateFields.pec_user = body.pec_user || null

  if (Object.keys(updateFields).length > 0) {
    const { error } = await svc.from('laboratori').update(updateFields).eq('id', labId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Salva password in Vault se fornita
  if (body.pec_password) {
    const { error } = await svc.rpc('upsert_pec_vault_secret', {
      p_lab_id: labId,
      p_password: body.pec_password,
    })
    if (error) return NextResponse.json({ error: 'Errore salvataggio password: ' + error.message }, { status: 500 })
  }

  // Aggiorna pec_smtp_configurata se tutti i campi sono presenti
  const { data: lab } = await svc.from('laboratori')
    .select('pec_host, pec_port, pec_user, pec_vault_key_id').eq('id', labId).single()
  if (lab) {
    const configured = !!(lab.pec_host && lab.pec_port && lab.pec_user && lab.pec_vault_key_id)
    await svc.from('laboratori').update({ pec_smtp_configurata: configured }).eq('id', labId)
  }

  return NextResponse.json({ success: true })
}

// POST /api/impostazioni/pec/test — invia email di test
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const labId = await getLabId(user.id)
  if (!labId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const svc = getServiceClient()
  const { data: lab } = await svc.from('laboratori')
    .select('pec_host, pec_port, pec_user, pec_vault_key_id, pec').eq('id', labId).single()

  if (!lab?.pec_host || !lab?.pec_port || !lab?.pec_user || !lab?.pec_vault_key_id) {
    return NextResponse.json({ error: 'PEC non configurata. Compila tutti i campi prima.' }, { status: 400 })
  }

  const { data: secret } = await svc.rpc('get_pec_vault_secret', { p_lab_id: labId })
  if (!secret) return NextResponse.json({ error: 'Password PEC non trovata nel vault.' }, { status: 400 })

  try {
    const transporter = nodemailer.createTransport({
      host: lab.pec_host,
      port: lab.pec_port,
      secure: lab.pec_port === 465,
      auth: { user: lab.pec_user, pass: secret },
    })
    await transporter.verify()
    await transporter.sendMail({
      from: lab.pec_user,
      to: lab.pec ?? lab.pec_user,
      subject: 'UÀ — Test PEC',
      text: 'Configurazione PEC verificata con successo.',
    })
    return NextResponse.json({ success: true, message: 'Email di test inviata correttamente.' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore connessione SMTP'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
```

- [ ] **Step 4: Crea pagina /impostazioni/pec**

Crea `src/app/(app)/impostazioni/pec/page.tsx`:

```typescript
'use client'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

// (stile inputBase, labelStyle, fieldStyle — stessi di Task 2)
const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
  background: 'var(--prs, #D4CFC9)',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)',
  outline: 'none', boxSizing: 'border-box',
}

export default function PecPage() {
  const [form, setForm] = useState({ pec_host: '', pec_port: '465', pec_user: '', pec_password: '' })
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const setF = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMsg(null)
    const res = await fetch('/api/impostazioni/pec', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, pec_port: parseInt(form.pec_port) }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (res.ok) setMsg({ type: 'ok', text: 'Configurazione salvata.' })
    else setMsg({ type: 'err', text: data.error ?? 'Errore salvataggio' })
  }, [form])

  const handleTest = useCallback(async () => {
    setTesting(true); setMsg(null)
    const res = await fetch('/api/impostazioni/pec', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setTesting(false)
    if (res.ok) setMsg({ type: 'ok', text: data.message ?? 'Test OK' })
    else setMsg({ type: 'err', text: data.error ?? 'Test fallito' })
  }, [])

  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }
  const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.08em' }

  return (
    <>
      <AppHeader title="Configurazione PEC" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>
          <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px', lineHeight: 1.6 }}>
            Inserisci le credenziali SMTP del tuo provider PEC (Aruba, Legalmail, ecc.).
            La password viene salvata in modo cifrato.
          </p>
          <form onSubmit={handleSave}>
            <div style={fieldStyle}><label style={labelStyle}>Host SMTP PEC *</label>
              <input style={inputBase} value={form.pec_host} onChange={setF('pec_host')} placeholder="smtp.pec.aruba.it" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
              <div style={fieldStyle}><label style={labelStyle}>Porta *</label>
                <input style={inputBase} type="number" value={form.pec_port} onChange={setF('pec_port')} placeholder="465" required />
              </div>
              <div style={fieldStyle}><label style={labelStyle}>Utente (indirizzo PEC) *</label>
                <input style={inputBase} type="email" value={form.pec_user} onChange={setF('pec_user')} placeholder="lab@pec.it" required />
              </div>
            </div>
            <div style={fieldStyle}><label style={labelStyle}>Password PEC</label>
              <input style={inputBase} type="password" value={form.pec_password} onChange={setF('pec_password')} placeholder="Lascia vuoto per non modificare" />
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>Lascia vuoto se la password è già salvata</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
              <button type="submit" disabled={loading} style={{
                padding: '10px 22px', borderRadius: '12px', border: 'none',
                background: 'var(--primary, #D90012)', color: '#fff',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
              }}>
                {loading ? 'Salvataggio…' : 'Salva'}
              </button>
              <button type="button" onClick={handleTest} disabled={testing} style={{
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                background: 'var(--elv, #EDEDEA)', color: 'var(--t2)',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
                cursor: testing ? 'not-allowed' : 'pointer',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
              }}>
                {testing ? 'Test in corso…' : 'Testa connessione'}
              </button>
            </div>
            {msg && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                background: msg.type === 'ok' ? 'rgba(22,163,74,.08)' : 'rgba(217,0,18,.07)',
                color: msg.type === 'ok' ? '#16A34A' : '#D90012' }}>
                {msg.text}
              </div>
            )}
          </form>
          <div style={{ marginTop: '24px', padding: '14px 16px', borderRadius: '14px', background: 'var(--elv)', fontSize: '12px', color: 'var(--t2)' }}>
            <strong>Provider comuni:</strong><br/>
            Aruba PEC: smtp.pec.aruba.it · porta 465<br/>
            Legalmail: smtp.legalmail.it · porta 465<br/>
            Namirial: smtps.pec.namirial.com · porta 465
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 5: Aggiungi link alla PEC dalla pagina impostazioni**

In `src/app/(app)/impostazioni/page.tsx`, trova la sezione PEC e aggiungi un Link alla pagina di configurazione:

```typescript
import Link from 'next/link'
// Dopo il chip "Non configurato" / "Configurato":
<Link href="/impostazioni/pec" style={{ fontSize: '12px', color: 'var(--primary, #D90012)', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '6px' }}>
  {lab.pec_smtp_configurata ? 'Modifica configurazione PEC →' : 'Configura PEC →'}
</Link>
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260518_pec_vault_upsert.sql
git add src/app/api/impostazioni/pec/route.ts
git add src/app/\(app\)/impostazioni/pec/page.tsx
git add src/app/\(app\)/impostazioni/page.tsx
git commit -m "feat(impostazioni): configurazione PEC SMTP con Supabase Vault"
```

---

## Task 4: Impostazioni Profilo — Cambio password + dati personali

**Problema:** `/impostazioni/profilo` restituisce 404. Il `UserProfileSheet` punta a questa pagina.

**Files:**
- Create: `src/app/(app)/impostazioni/profilo/page.tsx`

- [ ] **Step 1: Crea la pagina profilo**

Crea `src/app/(app)/impostazioni/profilo/page.tsx`:

```typescript
'use client'
import { useState, useCallback } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '12px', border: 'none',
  background: 'var(--prs, #D4CFC9)',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: '4px', display: 'block',
}
const sectionLabel: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase',
  letterSpacing: '.1em', marginBottom: '10px', marginTop: '20px',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
  marginBottom: '12px',
}

export default function ProfiloPage() {
  const router = useRouter()
  const [pwd, setPwd] = useState({ current: '', new_: '', confirm: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleChangePwd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.new_ !== pwd.confirm) {
      setPwdMsg({ type: 'err', text: 'Le nuove password non coincidono.' }); return
    }
    if (pwd.new_.length < 8) {
      setPwdMsg({ type: 'err', text: 'La password deve essere almeno 8 caratteri.' }); return
    }
    setPwdLoading(true); setPwdMsg(null)
    const sb = getBrowserClient()
    const { error } = await sb.auth.updateUser({ password: pwd.new_ })
    setPwdLoading(false)
    if (error) {
      setPwdMsg({ type: 'err', text: error.message })
    } else {
      setPwdMsg({ type: 'ok', text: 'Password aggiornata. Verrai reindirizzato al login.' })
      setTimeout(() => { sb.auth.signOut(); router.push('/login') }, 2000)
    }
  }, [pwd, router])

  const btnPrimary: React.CSSProperties = {
    padding: '10px 22px', borderRadius: '12px', border: 'none',
    background: 'var(--primary, #D90012)', color: '#fff',
    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
  }

  return (
    <>
      <AppHeader title="Profilo" backHref="/impostazioni" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px', maxWidth: '480px' }}>

          {/* Cambio password */}
          <div style={sectionLabel}>Sicurezza</div>
          <div style={cardStyle}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '14px' }}>
              Cambia password
            </div>
            <form onSubmit={handleChangePwd}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                <label style={labelStyle}>Nuova password *</label>
                <input style={inputStyle} type="password" value={pwd.new_}
                  onChange={e => setPwd(p => ({ ...p, new_: e.target.value }))}
                  placeholder="Almeno 8 caratteri" required minLength={8} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <label style={labelStyle}>Conferma nuova password *</label>
                <input style={inputStyle} type="password" value={pwd.confirm}
                  onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Ripeti la nuova password" required />
              </div>
              <button type="submit" disabled={pwdLoading} style={{ ...btnPrimary, opacity: pwdLoading ? .6 : 1 }}>
                {pwdLoading ? 'Aggiornamento…' : 'Aggiorna password'}
              </button>
              {pwdMsg && (
                <div style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '10px', fontSize: '13px',
                  background: pwdMsg.type === 'ok' ? 'rgba(22,163,74,.08)' : 'rgba(217,0,18,.07)',
                  color: pwdMsg.type === 'ok' ? '#16A34A' : '#D90012' }}>
                  {pwdMsg.text}
                </div>
              )}
            </form>
          </div>

          {/* Info account */}
          <div style={sectionLabel}>Account</div>
          <div style={cardStyle}>
            <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>
              Per modificare nome, cognome o email contatta il supporto: <strong>supporto@ua.app</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '8px' }}>
              La modifica dell&rsquo;email richiede verifica. Verrà implementata nella versione V1.1.
            </p>
          </div>

        </div>
      </PageWrapper>
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/impostazioni/profilo/page.tsx
git commit -m "feat(impostazioni): pagina profilo con cambio password"
```

---

## Task 5: Onboarding Wizard — 6 step per nuovi laboratori

**Problema:** I nuovi lab che si iscrivono tramite invito non hanno una guida per completare la configurazione iniziale. Serve un wizard 6-step accessibile dopo il primo login.

**Strategia:** Mostrare il wizard automaticamente quando `lab.codice_itca` è NULL (lab non ancora configurato). Lo stato "wizard completato" viene segnato mettendo `onboarding_completato = true` nel laboratorio.

**Files:**
- Create: `src/app/(app)/onboarding/page.tsx`
- Create: `src/app/(app)/onboarding/wizard.tsx` (Client Component)
- Modify: `src/app/(app)/layout.tsx` (redirect a /onboarding se non completato)
- Modify: DB: aggiungere colonna `onboarding_completato` a `laboratori`

- [ ] **Step 1: Migration per colonna onboarding_completato**

Crea `supabase/migrations/20260518_onboarding_completato.sql`:

```sql
ALTER TABLE laboratori ADD COLUMN IF NOT EXISTS onboarding_completato BOOLEAN NOT NULL DEFAULT false;
-- Lab già esistenti con ITCA: segnali come completati
UPDATE laboratori SET onboarding_completato = true WHERE codice_itca IS NOT NULL AND codice_itca != '';
```

Applica via Supabase MCP: `mcp__plugin_supabase_supabase__apply_migration`.

- [ ] **Step 2: Aggiorna layout per redirect automatico al wizard**

In `src/app/(app)/layout.tsx`, aggiungi dopo il check del lab stato:

```typescript
// Dopo la riga "const { data: lab } ..."
// Aggiungi alla select: onboarding_completato
const { data: lab } = await svc
  .from('laboratori')
  .select('stato, trial_ends_at, nome, onboarding_completato')
  .eq('id', utente.laboratorio_id)
  .single()

// ... (existing checks for blacklist/sospeso/scaduto/trial)

// Redirect al wizard se onboarding non completato
// (non per admin_sistema e non se già su /onboarding)
const isOnboardingRoute = false // la URL non è disponibile server-side nel layout,
// quindi usiamo un cookie o prop. Più semplice: controlla dal middleware.
// Per V1: redirect solo se onboarding_completato è false e ruolo è titolare
if (
  utenteData.ruolo === 'titolare' &&
  !(lab as Record<string,unknown>).onboarding_completato
) {
  redirect('/onboarding')
}
```

**NOTA:** Il redirect dal layout funziona ma bisogna fare attenzione al loop. La pagina `/onboarding` stessa deve essere fuori dalla `(app)` group O bisogna escluderla dal check. Soluzione: metti la pagina `/onboarding` nella route group `(app)` ma aggiungi un check `pathname !== '/onboarding'` nel middleware.

**Alternativa più semplice per V1:** Non fare redirect automatico. Mostra un banner nella dashboard "Completa la configurazione →" con Link a /onboarding. Questo evita loop e complessità.

Aggiunge il banner alla pagina `/dashboard` (vedi Task 5.3).

- [ ] **Step 3: Aggiungi banner dashboard "Completa configurazione"**

Nel file della dashboard (`src/app/(app)/dashboard/page.tsx` oppure nel componente DashboardTitolare), aggiungi all'inizio:

```typescript
// Questo va nel server component della dashboard, prima di restituire il JSX
// Aggiungi alla query lab: onboarding_completato
// Poi passa la prop onboardingCompletato={!lab.onboarding_completato} al componente

// Nel componente DashboardTitolare, aggiungi prop:
// onboardingPending?: boolean

// Dentro il render, prima dei KPI cards:
{onboardingPending && (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderRadius: '14px', margin: '0 20px 12px',
    background: 'rgba(217,0,18,.07)', gap: 12,
  }}>
    <span style={{ fontSize: '13px', color: 'var(--primary, #D90012)', fontWeight: 600 }}>
      ⚙️ Completa la configurazione del laboratorio
    </span>
    <a href="/onboarding" style={{
      fontSize: '12px', fontWeight: 700, color: 'var(--primary, #D90012)',
      textDecoration: 'none', padding: '4px 12px', borderRadius: '8px',
      background: 'rgba(217,0,18,.12)',
    }}>
      Inizia →
    </a>
  </div>
)}
```

- [ ] **Step 4: Crea la pagina onboarding wizard**

Crea `src/app/(app)/onboarding/page.tsx` (Server Component che carica dati lab) e `src/app/(app)/onboarding/wizard.tsx` (Client Component con stato dei 6 step).

`src/app/(app)/onboarding/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import OnboardingWizard from './wizard'

export default async function OnboardingPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id, nome, cognome').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: lab } = await svc.from('laboratori')
    .select('id, nome, ragione_sociale, partita_iva, indirizzo, cap, citta, provincia, telefono, email, pec, codice_itca, prrc_nome, prrc_qualifica, pec_smtp_configurata, onboarding_completato')
    .eq('id', utente.laboratorio_id).single()

  if (!lab) redirect('/login?error=no_lab')

  const nomeTitolare = `${utente.nome ?? ''} ${utente.cognome ?? ''}`.trim()

  return (
    <OnboardingWizard
      labId={utente.laboratorio_id}
      nomeTitolare={nomeTitolare}
      initialData={lab as Record<string, string | boolean | null>}
    />
  )
}
```

`src/app/(app)/onboarding/wizard.tsx`:
```typescript
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// 6 step: Benvenuto | Dati lab | Registro sanitario | PEC | Prima DdC | Completo
const STEPS = [
  { id: 'benvenuto', title: 'Benvenuto in UÀ' },
  { id: 'dati', title: 'Dati laboratorio' },
  { id: 'normativo', title: 'Registro sanitario' },
  { id: 'pec', title: 'Configurazione PEC' },
  { id: 'ddc', title: 'Dichiarazione di conformità' },
  { id: 'completo', title: 'Tutto pronto!' },
] as const
type StepId = typeof STEPS[number]['id']

interface Props {
  labId: string
  nomeTitolare: string
  initialData: Record<string, string | boolean | null>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: '14px', border: 'none',
  background: 'var(--prs, #D4CFC9)',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
  fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: 'var(--t1, #1C1916)',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: '4px', display: 'block',
}
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '14px', borderRadius: '16px', border: 'none',
  background: 'var(--primary, #D90012)', color: '#fff',
  fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
}

export default function OnboardingWizard({ labId, nomeTitolare, initialData }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<StepId>('benvenuto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: (initialData.nome as string) ?? '',
    ragione_sociale: (initialData.ragione_sociale as string) ?? '',
    partita_iva: (initialData.partita_iva as string) ?? '',
    indirizzo: (initialData.indirizzo as string) ?? '',
    cap: (initialData.cap as string) ?? '',
    citta: (initialData.citta as string) ?? '',
    provincia: (initialData.provincia as string) ?? '',
    telefono: (initialData.telefono as string) ?? '',
    codice_itca: (initialData.codice_itca as string) ?? '',
    prrc_nome: (initialData.prrc_nome as string) ?? '',
    prrc_qualifica: (initialData.prrc_qualifica as string) ?? '',
    pec: (initialData.pec as string) ?? '',
    pec_host: '', pec_port: '465', pec_user: '', pec_password: '',
  })

  const setF = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const saveLabData = useCallback(async (fields: Partial<typeof form>) => {
    setLoading(true); setError(null)
    const res = await fetch('/api/impostazioni', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Errore'); return false }
    return true
  }, [])

  const complete = useCallback(async () => {
    setLoading(true)
    await fetch('/api/impostazioni', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarding_completato: true }),
    })
    setLoading(false)
    router.push('/dashboard')
  }, [router])

  const stepIndex = STEPS.findIndex(s => s.id === step)
  const progress = ((stepIndex) / (STEPS.length - 1)) * 100

  // Contenuto di ogni step
  const renderStep = () => {
    switch(step) {
      case 'benvenuto':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--t1)', marginBottom: '8px' }}>
              Ciao {nomeTitolare.split(' ')[0]}!
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '24px' }}>
              In 5 minuti configuriamo tutto. Dal momento in cui finisci, UÀ gestisce il tuo lab da solo.
            </p>
            <button style={btnPrimary} onClick={() => setStep('dati')}>
              Inizia la configurazione →
            </button>
          </div>
        )

      case 'dati':
        return (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--t1)' }}>Dati del laboratorio</h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px' }}>
              Questi dati appaiono sulle DdC e sulle fatture.
            </p>
            {[
              { key: 'nome', label: 'Nome commerciale *', placeholder: 'Es. Lab Opromolla' },
              { key: 'ragione_sociale', label: 'Ragione sociale', placeholder: 'Se diversa dal nome' },
              { key: 'partita_iva', label: 'Partita IVA *', placeholder: '00000000000' },
              { key: 'indirizzo', label: 'Indirizzo', placeholder: 'Via...' },
              { key: 'cap', label: 'CAP', placeholder: '00000' },
              { key: 'citta', label: 'Città', placeholder: '' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} value={(form as Record<string,string>)[key]} onChange={setF(key)} placeholder={placeholder} />
              </div>
            ))}
            {error && <div style={{ color: '#D90012', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
            <button style={btnPrimary} disabled={loading} onClick={async () => {
              const ok = await saveLabData({ nome: form.nome, ragione_sociale: form.ragione_sociale, partita_iva: form.partita_iva, indirizzo: form.indirizzo, cap: form.cap, citta: form.citta })
              if (ok) setStep('normativo')
            }}>
              {loading ? 'Salvataggio…' : 'Avanti →'}
            </button>
          </div>
        )

      case 'normativo':
        return (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--t1)' }}>Registro sanitario</h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px' }}>
              Il codice ITCA è obbligatorio per legge (Registro Ministero della Salute). Il PRRC firma le DdC.
            </p>
            {[
              { key: 'codice_itca', label: 'Codice ITCA *', placeholder: 'ITCA01051686' },
              { key: 'prrc_nome', label: 'Nome PRRC *', placeholder: 'Es. Mario Rossi' },
              { key: 'prrc_qualifica', label: 'Qualifica PRRC', placeholder: 'Odontotecnico abilitato' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} value={(form as Record<string,string>)[key]} onChange={setF(key)} placeholder={placeholder} />
              </div>
            ))}
            <div style={{ background: 'rgba(37,99,235,.06)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--t2)' }}>
              ℹ️ Non hai ancora il codice ITCA? Registrati sul portale del Ministero della Salute. Puoi completare questo step dopo.
            </div>
            {error && <div style={{ color: '#D90012', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
            <button style={btnPrimary} disabled={loading} onClick={async () => {
              const ok = await saveLabData({ codice_itca: form.codice_itca, prrc_nome: form.prrc_nome, prrc_qualifica: form.prrc_qualifica })
              if (ok) setStep('pec')
            }}>
              {loading ? 'Salvataggio…' : 'Avanti →'}
            </button>
            <button onClick={() => setStep('pec')} style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer' }}>
              Salta per ora
            </button>
          </div>
        )

      case 'pec':
        return (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px', color: 'var(--t1)' }}>Configurazione PEC</h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px' }}>
              UÀ invierà automaticamente le fatture al SDI via PEC. Inserisci le credenziali del tuo provider.
            </p>
            {[
              { key: 'pec', label: 'Indirizzo PEC', placeholder: 'lab@pec.it' },
              { key: 'pec_host', label: 'Host SMTP', placeholder: 'smtp.pec.aruba.it' },
              { key: 'pec_port', label: 'Porta', placeholder: '465' },
              { key: 'pec_user', label: 'Utente SMTP', placeholder: 'lab@pec.it' },
              { key: 'pec_password', label: 'Password PEC', placeholder: '••••••••', type: 'password' as const },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} type={type ?? 'text'} value={(form as Record<string,string>)[key]} onChange={setF(key)} placeholder={placeholder} />
              </div>
            ))}
            {error && <div style={{ color: '#D90012', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
            <button style={btnPrimary} disabled={loading} onClick={async () => {
              if (form.pec_host && form.pec_user && form.pec_password) {
                setLoading(true)
                const res = await fetch('/api/impostazioni/pec', {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pec: form.pec, pec_host: form.pec_host, pec_port: parseInt(form.pec_port), pec_user: form.pec_user, pec_password: form.pec_password }),
                })
                setLoading(false)
                if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Errore'); return }
              }
              setStep('ddc')
            }}>
              {loading ? 'Salvataggio…' : 'Avanti →'}
            </button>
            <button onClick={() => setStep('ddc')} style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer' }}>
              Configura dopo
            </button>
          </div>
        )

      case 'ddc':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: 'var(--t1)' }}>
              Dichiarazione di Conformità
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6, marginBottom: '20px' }}>
              Per ogni lavoro consegnato, UÀ genera automaticamente la DdC secondo il MDR 2017/745 Allegato XIII.
              La firma viene appostata con il nome del PRRC che hai inserito.
            </p>
            <div style={{ background: 'rgba(22,163,74,.08)', borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', textAlign: 'left', fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>
              ✅ DdC configurata automaticamente con:<br/>
              · Codice ITCA: <strong>{form.codice_itca || '(da compilare)'}</strong><br/>
              · PRRC: <strong>{form.prrc_nome || '(da compilare)'}</strong><br/>
              · Riferimento normativo: MDR Art. 52(8) + Allegato XIII
            </div>
            <button style={btnPrimary} onClick={() => setStep('completo')}>
              Ottimo, avanti →
            </button>
          </div>
        )

      case 'completo':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-.02em', marginBottom: '8px', color: 'var(--t1)' }}>
              Tutto pronto!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '28px' }}>
              Il tuo laboratorio è configurato. Inizia subito creando il tuo primo lavoro.
            </p>
            <button style={btnPrimary} disabled={loading} onClick={complete}>
              {loading ? 'Completamento…' : 'Vai alla dashboard →'}
            </button>
          </div>
        )
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg, #DDD8D3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Progress bar */}
        {step !== 'benvenuto' && step !== 'completo' && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px', textAlign: 'right' }}>
              {stepIndex} di {STEPS.length - 2}
            </div>
            <div style={{ height: '4px', borderRadius: '99px', background: 'var(--prs)' }}>
              <div style={{ height: '100%', borderRadius: '99px', background: 'var(--primary, #D90012)', width: `${progress}%`, transition: 'width .3s ease' }} />
            </div>
          </div>
        )}
        {/* Card */}
        <div style={{
          background: 'var(--sfc, #E4DFD9)', borderRadius: '28px', padding: '32px 24px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
        }}>
          {renderStep()}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Aggiungi `onboarding_completato` alla PATCH di /api/impostazioni**

Apri `src/app/api/impostazioni/route.ts` e aggiungi `'onboarding_completato'` alla lista dei campi consentiti nel PATCH.

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260518_onboarding_completato.sql
git add src/app/\(app\)/onboarding/page.tsx
git add src/app/\(app\)/onboarding/wizard.tsx
git commit -m "feat(onboarding): wizard 6-step per nuovi laboratori"
```

---

## Task 6: Email Templates Supabase — Branding UÀ

**Problema:** Le email di reset password e invito utente mostrano il branding Supabase generico. Devono avere il brand UÀ.

**Files:** Solo configurazione da Supabase Dashboard — non codice.

- [ ] **Step 1: Accedi a Supabase Dashboard → Authentication → Email Templates**

URL: https://supabase.com/dashboard/project/iagibumwjstnveqpjbwq/auth/templates

- [ ] **Step 2: Aggiorna template "Confirm signup"**

```html
<h2>Benvenuto in UÀ!</h2>
<p>Sei stato invitato a gestire il tuo laboratorio odontotecnico su UÀ.</p>
<p><a href="{{ .ConfirmationURL }}">Accetta l'invito →</a></p>
<p style="font-size:12px;color:#999;">UÀ — Il laboratorio più rapido, più semplice, più UÀ.</p>
```

- [ ] **Step 3: Aggiorna template "Reset Password"**

```html
<h2>Reset password — UÀ</h2>
<p>Hai richiesto il reset della password per il tuo account UÀ.</p>
<p><a href="{{ .ConfirmationURL }}">Reimposta la password →</a></p>
<p style="font-size:12px;color:#999;">Se non hai richiesto questo reset, ignora questa email.</p>
```

- [ ] **Step 4: Aggiorna template "Invite User"**

```html
<h2>Sei invitato in UÀ</h2>
<p>Qualcuno ti ha invitato a collaborare nel laboratorio su UÀ.</p>
<p><a href="{{ .ConfirmationURL }}">Accetta l'invito e imposta la password →</a></p>
<p style="font-size:12px;color:#999;">UÀ — Dalla prescrizione alla consegna, tutto in un tap.</p>
```

- [ ] **Step 5: Documenta il cambiamento nel MEMORY.md**

Aggiungi in `memory/MEMORY.md` sezione 10:
```
- Email templates Supabase: aggiornati con branding UÀ il 18/05/2026
```

---

## Task 7: Push, deploy e verifica finale

- [ ] **Step 1: Esegui test suite**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app"
npx vitest run 2>&1 | tail -20
```

Atteso: tutti i test verdi (136 test presenti).

- [ ] **Step 2: Push a main e verifica CI**

```bash
git push origin main
```

Attendi che il CI GitHub Actions passi (TypeScript + ESLint + Unit Tests → green).

- [ ] **Step 3: Test manuale su produzione**

Su `https://uachelab.com` loggato come Filippo Opromolla:
1. ✓ Dashboard — banner onboarding se non completato?
2. ✓ Nuovo lavoro — seleziono dentista, compilo, salvo → crea lavoro senza errori
3. ✓ /impostazioni → vedo pulsante Modifica → modifico un campo → salvo
4. ✓ /impostazioni/pec → compilo credenziali Filippo → testa connessione → OK
5. ✓ /impostazioni/profilo → cambio password → funziona

- [ ] **Step 4: Aggiorna MEMORY.md**

```markdown
## 1. Stato del Progetto
**Ultimo commit pushato:** [nuovo hash]
Piano F: completato
Prossimi: Piano G (pagine detail, stato_sdi, design consistency)
```

---

## Checklist finale Piano F

- [ ] Form nuovo lavoro funziona (cliente_id salvato correttamente)
- [ ] /impostazioni ha edit mode completo
- [ ] /impostazioni/pec con vault password funzionante
- [ ] /impostazioni/profilo con cambio password
- [ ] Onboarding wizard 6-step accessibile
- [ ] Email templates con brand UÀ
- [ ] TypeScript zero errori
- [ ] CI verde
- [ ] Test manuale su produzione OK
