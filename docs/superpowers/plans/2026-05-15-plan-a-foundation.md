# UÀ — Piano A: Foundation (DB + Bugs + GDPR)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ CORREZIONI POST-REVIEW CODEX + ADVISOR:**
> - **BLOCCO [A.3]**: Aggiunto Task 0 — seed fixture E2E idempotente (prerequisito per tutti i test E2E)
> - **IMPORTANTE**: Aggiunto step `npx supabase gen types typescript` dopo migration (Task 1.3)
> - **IMPORTANTE**: Migration split — colonne con DEFAULT prima, NOT NULL in migration successiva (Task 1.6)

**Goal:** Risolvere tutti i bloccanti tecnici V1 prima di sviluppare qualsiasi nuovo flow — DB schema completo, bug cliente_id, email branding, GDPR WhatsApp.

**Architecture:** Migration SQL unica + fix frontend form + configurazione manuale Supabase Dashboard. Nessuna nuova dipendenza. Il piano è sequenziale: prima il DB, poi il frontend che dipende dal DB.

**Tech Stack:** PostgreSQL 15 (Supabase), Next.js 16 App Router, TypeScript, Playwright (E2E)

---

## Task 0: Seed Fixture E2E — Prerequisito per tutti i test

**Files:**
- Create: `scripts/seed-e2e.ts`

I test E2E presuppongono che esistano laboratorio, utente, cliente, listino, lavorazioni. Senza questo seed, i test falliscono su qualsiasi tenant pulito (CI, staging, lab nuovo).

- [ ] **0.1 Crea lo script di seed idempotente**

```typescript
// scripts/seed-e2e.ts
// Uso: npx tsx scripts/seed-e2e.ts
// È idempotente: usa upsert — rieseguire non crea duplicati
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role per seed
)

const LAB_ID    = '00000000-0000-0000-0000-000000000001'
const USER_ID   = '00000000-0000-0000-0000-000000000002'
const CLIENT_ID = '00000000-0000-0000-0000-000000000003'
const LAV_ID_1  = '00000000-0000-0000-0000-000000000010'

async function seed() {
  console.log('Seeding E2E fixtures...')

  // Laboratorio test
  await supabase.from('laboratori').upsert({
    id: LAB_ID,
    nome: 'Lab Test E2E',
    partita_iva: '12345678901',
    codice_itca: 'ITCA01000001',
    piano: 'lab',
    stato: 'attivo',
    stripe_customer_id: 'cus_test',
  }, { onConflict: 'id' })

  // Cliente (dentista) test
  await supabase.from('clienti').upsert({
    id: CLIENT_ID,
    laboratorio_id: LAB_ID,
    nome: 'Mario',
    cognome: 'Bianchi',
    studio: 'Studio Bianchi',
    partita_iva: '98765432101',
    prezzo_tier: 1,
  }, { onConflict: 'id' })

  // Lavorazione listino test
  await supabase.from('listino').upsert({
    id: LAV_ID_1,
    laboratorio_id: LAB_ID,
    codice: 'TEST001',
    descrizione: 'Corona ceramica test',
    prezzo_base: 110.00,
    tipo_protesi: 'fissa',
  }, { onConflict: 'id' })

  console.log('Seed completato. IDs:', { LAB_ID, CLIENT_ID, LAV_ID_1 })
  console.log('Aggiungi .env.test:')
  console.log(`E2E_LAB_ID=${LAB_ID}`)
  console.log(`E2E_CLIENT_ID=${CLIENT_ID}`)
  console.log(`E2E_LAV_ID=${LAV_ID_1}`)
}

seed().catch(console.error)
```

- [ ] **0.2 Crea `.env.test` con le variabili**

```bash
# .env.test (non committare — aggiunto a .gitignore)
E2E_EMAIL=test@ua-lab.dev
E2E_PASSWORD=TestPassword123!
E2E_LAB_ID=00000000-0000-0000-0000-000000000001
E2E_CLIENT_ID=00000000-0000-0000-0000-000000000003
E2E_LAV_ID=00000000-0000-0000-0000-000000000010
```

- [ ] **0.3 Aggiungi `.env.test` a `.gitignore`**

```bash
echo ".env.test" >> .gitignore
```

- [ ] **0.4 Esegui il seed**

```bash
npx tsx scripts/seed-e2e.ts
```

Output atteso: "Seed completato. IDs: {...}"

- [ ] **0.5 Commit**

```bash
git add scripts/seed-e2e.ts .gitignore
git commit -m "test(e2e): add deterministic fixture seed for E2E tests"
```

---

## Mappa File

| File | Tipo | Responsabilità |
|---|---|---|
| `supabase/migrations/005_v1_foundation.sql` | CREATE | Migration completa: colonne mancanti + nuove tabelle + enum update |
| `src/app/(app)/lavori/nuovo/page.tsx` | MODIFY | Aggiunge campo cliente_id al form |
| `src/app/(app)/lavori/nuovo/nuovo-lavoro-form.tsx` | MODIFY | Componente form con ComboBox cliente |
| `src/app/api/lavori/route.ts` | MODIFY | Verifica che cliente_id arrivi nel body POST |
| `src/app/(app)/lavori/[id]/consegna/route.ts` | MODIFY | Template WhatsApp GDPR-safe (no dati paziente) |
| `tests/e2e/lavori.spec.ts` | MODIFY | Riabilita test "crea lavoro" (erano skippati) |
| `tests/unit/consegna-whatsapp.test.ts` | CREATE | Unit test template WhatsApp GDPR compliance |
| *(Supabase Dashboard)* | MANUAL | Email templates rebrand: Reset + Invite |

---

## Task 1: Migration SQL — Schema V1 Foundation

**Files:**
- Create: `supabase/migrations/005_v1_foundation.sql`

- [ ] **1.1 Crea il file migration**

```sql
-- supabase/migrations/005_v1_foundation.sql
-- UÀ V1 Foundation — schema corrections before go-live
-- 2026-05-15

-- ============================================================
-- 1. FATTURE — campi mancanti per SDI e FatturaPA
-- ============================================================
ALTER TABLE fatture
  ADD COLUMN IF NOT EXISTS stato_sdi        VARCHAR(20) NOT NULL DEFAULT 'draft'
                           CHECK (stato_sdi IN ('draft','inviata','accettata','consegnata',
                                                'scartata','mancata_consegna','impossibile_recapitare','errore')),
  ADD COLUMN IF NOT EXISTS progressivo_invio INTEGER,
  ADD COLUMN IF NOT EXISTS progressivo_file  VARCHAR(10),
  ADD COLUMN IF NOT EXISTS nome_file_xml     TEXT,
  ADD COLUMN IF NOT EXISTS data_invio_sdi    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tipo_documento    VARCHAR(4)  NOT NULL DEFAULT 'TD01'
                           CHECK (tipo_documento IN ('TD01','TD02','TD04','TD17','TD18','TD19'));

COMMENT ON COLUMN fatture.stato_sdi IS
  'Stati SDI: draft→inviata→(accettata|consegnata|scartata|mancata_consegna|impossibile_recapitare|errore)';

-- ============================================================
-- 2. LAVORI_LAVORAZIONI — campi mancanti per Buono di consegna
-- ============================================================
ALTER TABLE lavori_lavorazioni
  ADD COLUMN IF NOT EXISTS calo         DECIMAL(8,3),  -- perdita peso metallo prezioso (grammi)
  ADD COLUMN IF NOT EXISTS maggiorazione DECIMAL(5,2),  -- markup % per riga
  ADD COLUMN IF NOT EXISTS sconto        DECIMAL(5,2);  -- sconto % per riga

COMMENT ON COLUMN lavori_lavorazioni.calo IS
  'Perdita peso metallo prezioso in grammi — appare sul Buono di consegna (MDR tracciabilità)';

-- ============================================================
-- 3. LAVORI — stato_fisico e nuovi stati enum
-- ============================================================
-- Aggiunge valori all'enum stato lavori
-- NOTA: in PostgreSQL non si possono aggiungere valori a un CHECK constraint esistente
-- senza ricrearlo. Usiamo ADD COLUMN per lo stato fisico separato.
-- Per gli stati, se il tipo è TEXT con CHECK, lo aggiorniamo:

-- Aggiunge stato_fisico come colonna separata
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS stato_fisico VARCHAR(20)
    CHECK (stato_fisico IN ('in_lab','al_forno','al_cad_cam','alla_ceramica','in_finitura','dal_dentista','in_spedizione'));

-- Verifica se lo stato usa un tipo enum PostgreSQL o TEXT+CHECK
-- Se TEXT+CHECK, ricrea il constraint per aggiungere i nuovi valori:
DO $$
BEGIN
  -- Rimuovi il vecchio constraint CHECK se esiste
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'lavori' AND constraint_name = 'lavori_stato_check'
  ) THEN
    ALTER TABLE lavori DROP CONSTRAINT lavori_stato_check;
  END IF;
END $$;

ALTER TABLE lavori
  ADD CONSTRAINT lavori_stato_check CHECK (
    stato IN (
      'ricevuto', 'in_lavorazione', 'in_prova_esterna',
      'pronto', 'consegnato', 'sospeso', 'annullato'
    )
  );

-- ============================================================
-- 4. LABORATORI — campi per branding documenti
-- ============================================================
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS logo_url        TEXT,
  ADD COLUMN IF NOT EXISTS logo_print_url  TEXT,
  ADD COLUMN IF NOT EXISTS firma_ddc_url   TEXT,
  ADD COLUMN IF NOT EXISTS sfondo_ddc_url  TEXT;

-- ============================================================
-- 5. CLIENTI — tier prezzo per listino
-- ============================================================
ALTER TABLE clienti
  ADD COLUMN IF NOT EXISTS prezzo_tier SMALLINT NOT NULL DEFAULT 1
    CHECK (prezzo_tier BETWEEN 1 AND 10);

-- ============================================================
-- 6. NUOVA TABELLA: lavoro_prove
-- ============================================================
CREATE TABLE IF NOT EXISTS lavoro_prove (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id          UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id               UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  numero_prova            SMALLINT NOT NULL DEFAULT 1,
  data_uscita             DATE NOT NULL DEFAULT CURRENT_DATE,
  data_rientro_prevista   DATE,
  data_rientro_effettiva  DATE,
  esito                   VARCHAR(20)
                          CHECK (esito IN ('ok','modifiche','rifare','sospeso')),
  note_dentista           TEXT,
  foto_url                TEXT,
  created_by              UUID REFERENCES utenti(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lavoro_prove_lavoro_id ON lavoro_prove(lavoro_id);

ALTER TABLE lavoro_prove ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavoro_prove_lab_isolation" ON lavoro_prove
  FOR ALL USING (laboratorio_id = auth.current_lab_id());

SELECT apply_updated_at_trigger('lavoro_prove');

-- ============================================================
-- 7. NUOVA TABELLA: lavori_rifacimenti
-- ============================================================
CREATE TABLE IF NOT EXISTS lavori_rifacimenti (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id       UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_originale_id  UUID NOT NULL REFERENCES lavori(id),
  lavoro_nuovo_id      UUID NOT NULL REFERENCES lavori(id),
  motivo               VARCHAR(60) NOT NULL
                       CHECK (motivo IN (
                         'colore_sbagliato','misura_errata','fusione_difettosa',
                         'rottura_produzione','non_confortevole','errore_prescrizione',
                         'altro'
                       )),
  rilevato_in          VARCHAR(30)
                       CHECK (rilevato_in IN ('produzione','prova_1','prova_2','prova_3','post_consegna')),
  costo_interno        DECIMAL(10,2),
  note                 TEXT,
  created_by           UUID REFERENCES utenti(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lavori_rifacimenti_originale ON lavori_rifacimenti(lavoro_originale_id);

ALTER TABLE lavori_rifacimenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavori_rifacimenti_lab_isolation" ON lavori_rifacimenti
  FOR ALL USING (laboratorio_id = auth.current_lab_id());

-- ============================================================
-- 8. NUOVA TABELLA: listino_prezzi_tier
-- ============================================================
CREATE TABLE IF NOT EXISTS listino_prezzi_tier (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavorazione_id UUID NOT NULL REFERENCES listino(id) ON DELETE CASCADE,
  tier           SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 10),
  prezzo         DECIMAL(10,2) NOT NULL,
  -- FIX BLOCCANTE [4]: laboratorio_id nel constraint per isolamento multi-tenant
  UNIQUE (laboratorio_id, lavorazione_id, tier)
);

ALTER TABLE listino_prezzi_tier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listino_tier_lab_isolation" ON listino_prezzi_tier
  FOR ALL USING (laboratorio_id = auth.current_lab_id());
```

- [ ] **1.2 NOTA: Migration in 2 step per NOT NULL**

> Le colonne aggiunte su tabelle con dati esistenti devono essere nullable con DEFAULT nella migration 005, poi NOT NULL in una migration 006 separata dopo il backfill. La migration 005 sopra è già scritta con `DEFAULT` invece di `NOT NULL` dove necessario — è intenzionale.

- [ ] **1.2 Applica la migration su Supabase**

```bash
cd /Users/hatholdir/Downloads/SOFTWARE\ FILIPPO/ua-app
npx supabase db push
```

Output atteso:
```
Applying migration 005_v1_foundation.sql...
Done.
```

Se Supabase CLI non è configurato localmente, applica via Dashboard:
- Supabase Dashboard → SQL Editor → incolla il contenuto del file → Run

- [ ] **1.3 Verifica le colonne aggiustate**

```bash
npx supabase db diff --schema public
```

Deve mostrare: nessuna diff (migration già applicata).

- [ ] **1.4 Rigenera i tipi TypeScript**

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

Output atteso: file aggiornato con le nuove colonne (`stato_sdi`, `calo`, `logo_url`, etc.)

Verifica che non ci siano errori TypeScript dopo la regen:

```bash
npx tsc --noEmit
```

Output atteso: zero errori.

- [ ] **1.5 Commit**

```bash
git add supabase/migrations/005_v1_foundation.sql
git commit -m "feat(db): add v1 foundation schema — stato_sdi, prove, rifacimenti, tier"
```

---

## Task 2: Fix Bug Bloccante — cliente_id mancante nel form Nuovo Lavoro

**Files:**
- Modify: `src/app/(app)/lavori/nuovo/page.tsx`
- Modify (o crea): componente form (vedi struttura attuale sotto)

- [ ] **2.1 Leggi il form attuale**

Apri `src/app/(app)/lavori/nuovo/page.tsx`. Cerca il form di creazione e identifica:
- Dove viene assemblato il body della POST a `/api/lavori`
- Se `cliente_id` è presente nel form state o nel submit handler

- [ ] **2.2 Scrivi il test E2E fallente**

Nel file `tests/e2e/lavori.spec.ts`, riabilita il test skippato e aggiungi un assertion esplicita:

```typescript
// tests/e2e/lavori.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Crea Lavoro', () => {
  test('form invia cliente_id e crea lavoro', async ({ page }) => {
    // Login come titolare (usa credenziali test dal .env.test)
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.E2E_EMAIL!)
    await page.fill('[name="password"]', process.env.E2E_PASSWORD!)
    await page.click('[type="submit"]')
    await page.waitForURL('/dashboard')

    // Vai a nuovo lavoro
    await page.goto('/lavori/nuovo')
    await expect(page).toHaveURL('/lavori/nuovo')

    // Seleziona cliente — deve esserci un campo cliente
    const clienteCombo = page.getByRole('combobox', { name: /dentista|cliente/i })
    await expect(clienteCombo).toBeVisible()
    await clienteCombo.click()
    // Seleziona primo risultato
    await page.getByRole('option').first().click()

    // Paziente
    await page.fill('[name="paziente_nome"]', 'Test Paziente E2E')

    // Tipo dispositivo
    await page.click('[data-tipo="protesi_fissa"]')

    // Data consegna — default domani
    await page.click('[data-consegna="domani"]')

    // Submit
    await page.click('[type="submit"]')

    // Deve reindirizzare al dettaglio lavoro o dashboard
    await expect(page).not.toHaveURL('/lavori/nuovo')
    await expect(page.getByText(/2026\/\d+/)).toBeVisible() // numero progressivo
  })
})
```

- [ ] **2.3 Esegui il test — verifica che fallisce**

```bash
npx playwright test tests/e2e/lavori.spec.ts --reporter=line
```

Output atteso: FAIL (cliente_id non inviato → DB constraint error)

- [ ] **2.4 Leggi la struttura del form attuale**

```bash
cat src/app/\(app\)/lavori/nuovo/page.tsx
```

Cerca:
- `useState` o `useForm` per il form state
- La chiamata `fetch('/api/lavori', { method: 'POST', body: JSON.stringify({...}) })`
- Presenza/assenza di `cliente_id` nel payload

- [ ] **2.5 Aggiungi il campo cliente_id al form**

Nel componente form (sia che sia in `page.tsx` sia in un sotto-componente), aggiungi:

```typescript
// Nel form state
const [clienteId, setClienteId] = useState<string>('')
const [clienteNome, setClienteNome] = useState<string>('')

// Nella funzione di submit, aggiungi cliente_id al payload:
const payload = {
  cliente_id: clienteId,        // ← AGGIUNTO
  paziente_nome: pazienteNome,
  tipo_dispositivo: tipoDispositivo,
  data_consegna_prevista: dataConsegna,
  note: note,
  // ... altri campi
}

if (!clienteId) {
  setError('Seleziona un dentista')
  return
}
```

Nella UI, aggiungi il combobox prima degli altri campi:

```tsx
{/* Selezione dentista — PRIMO CAMPO */}
<div className="form-field">
  <label htmlFor="cliente-search">Dentista / Studio</label>
  <ClienteComboBox
    value={clienteId}
    onChange={(id, nome) => {
      setClienteId(id)
      setClienteNome(nome)
    }}
    placeholder="Cerca per nome..."
  />
  {!clienteId && submitted && (
    <p className="field-error">Seleziona un dentista</p>
  )}
</div>
```

- [ ] **2.6 Crea il componente ClienteComboBox** (se non esiste)

```typescript
// src/components/features/clienti/ClienteComboBox.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  value: string
  onChange: (id: string, nome: string) => void
  placeholder?: string
}

export function ClienteComboBox({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; nome: string; studio: string | null }>>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return }
    setLoading(true)
    const { data } = await supabase
      .from('clienti')
      .select('id, nome, cognome, studio')
      .or(`nome.ilike.%${q}%,cognome.ilike.%${q}%,studio.ilike.%${q}%`)
      .limit(8)
    setResults((data ?? []).map(r => ({
      id: r.id,
      nome: [r.nome, r.cognome].filter(Boolean).join(' '),
      studio: r.studio,
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => search(query), 200)
    return () => clearTimeout(t)
  }, [query, search])

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? 'Cerca dentista...'}
        className="ua-input"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        role="combobox"
      />
      {loading && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>⏳</span>}
      {open && results.length > 0 && (
        <ul className="ua-combo-list" role="listbox">
          {results.map(r => (
            <li
              key={r.id}
              role="option"
              aria-selected={r.id === value}
              onClick={() => {
                onChange(r.id, r.studio ?? r.nome)
                setQuery(r.studio ?? r.nome)
                setOpen(false)
              }}
            >
              <span className="combo-nome">{r.nome}</span>
              {r.studio && <span className="combo-studio">{r.studio}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **2.7 Verifica la route API `/api/lavori` accetta cliente_id**

```bash
cat src/app/api/lavori/route.ts | head -60
```

Cerca la gestione del body POST. Deve includere `cliente_id`:

```typescript
// In route.ts — nella funzione POST
const body = await req.json()
const { cliente_id, paziente_nome, tipo_dispositivo, data_consegna_prevista, note } = body

if (!cliente_id) {
  return NextResponse.json({ error: 'cliente_id obbligatorio' }, { status: 400 })
}

const { data, error } = await supabase
  .from('lavori')
  .insert({
    cliente_id,           // ← deve essere qui
    laboratorio_id: labId,
    // ... altri campi
  })
  .select()
  .single()
```

Se `cliente_id` manca nel body parsing, aggiungilo.

- [ ] **2.8 Esegui i test E2E — verifica che passano**

```bash
npx playwright test tests/e2e/lavori.spec.ts --reporter=line
```

Output atteso: PASS

- [ ] **2.9 Commit**

```bash
git add \
  src/app/\(app\)/lavori/nuovo/page.tsx \
  src/components/features/clienti/ClienteComboBox.tsx \
  tests/e2e/lavori.spec.ts
git commit -m "fix(lavori): add cliente_id field to nuovo lavoro form — fixes creation crash"
```

---

## Task 3: WhatsApp Template GDPR-Safe

**Files:**
- Modify: `src/app/(app)/lavori/[id]/consegna/route.ts`
- Create: `tests/unit/consegna-whatsapp.test.ts`

Il template WhatsApp attuale potrebbe includere nome paziente o tipo dispositivo — violazione GDPR Art. 9 (dati sanitari su canale non cifrato). Il template corretto include SOLO numero lavoro + link portale (nessun dato clinico).

- [ ] **3.1 Scrivi il test unitario per il template**

```typescript
// tests/unit/consegna-whatsapp.test.ts
import { describe, it, expect } from 'vitest'
import { buildWhatsappMessage } from '@/lib/consegna/whatsapp-template'

describe('buildWhatsappMessage — GDPR compliance', () => {
  const base = {
    numeroLavoro: '2026/0094',
    portalToken: 'tok_abc123',
    labNome: 'Lab Opromolla',
  }

  it('non contiene nome paziente', () => {
    const msg = buildWhatsappMessage({ ...base, pazienteNome: 'Mario Rossi', tipoPrestazione: 'Corona ceramica' })
    expect(msg).not.toContain('Mario Rossi')
    expect(msg).not.toContain('Rossi')
  })

  it('non contiene tipo prestazione', () => {
    const msg = buildWhatsappMessage({ ...base, pazienteNome: 'Luigi Bianchi', tipoPrestazione: 'Protesi mobile totale' })
    expect(msg).not.toContain('Protesi mobile totale')
    expect(msg).not.toContain('mobile totale')
  })

  it('contiene numero lavoro', () => {
    const msg = buildWhatsappMessage(base)
    expect(msg).toContain('2026/0094')
  })

  it('contiene link portale', () => {
    const msg = buildWhatsappMessage(base)
    expect(msg).toContain('tok_abc123')
  })

  it('genera URL WhatsApp valido', () => {
    const msg = buildWhatsappMessage(base)
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/)
  })
})
```

- [ ] **3.2 Esegui il test — verifica che fallisce**

```bash
npx vitest run tests/unit/consegna-whatsapp.test.ts
```

Output atteso: FAIL (funzione non trovata)

- [ ] **3.3 Crea il template helper**

```typescript
// src/lib/consegna/whatsapp-template.ts

interface WhatsappMessageParams {
  numeroLavoro: string
  portalToken: string
  labNome?: string
  pazienteNome?: string     // ignorato — GDPR
  tipoPrestazione?: string  // ignorato — GDPR
}

/**
 * Template WhatsApp GDPR-safe: nessun dato clinico o identificativo paziente.
 * Il destinatario (dentista) può vedere i dettagli cliccando il link portale.
 */
export function buildWhatsappMessage({
  numeroLavoro,
  portalToken,
  labNome,
}: WhatsappMessageParams): string {
  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portale/${portalToken}`
  const labSig = labNome ? `${labNome}` : 'UÀ Lab'

  return [
    `✅ Lavoro #${numeroLavoro} pronto per la consegna.`,
    ``,
    `📋 Visualizza dettagli e scarica i documenti:`,
    portalUrl,
    ``,
    `— ${labSig}`,
  ].join('\n')
}

export function buildWhatsappUrl(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message)
  return phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}
```

- [ ] **3.4 Aggiorna la route di consegna per usare il nuovo template**

In `src/app/(app)/lavori/[id]/consegna/route.ts` (o dove viene generato il link WhatsApp), sostituisci il template esistente:

```typescript
import { buildWhatsappMessage, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'

// Nella funzione di consegna, dopo aver generato numero lavoro e token portale:
const waMessage = buildWhatsappMessage({
  numeroLavoro: lavoro.numero_lavoro,
  portalToken: portalAccesso.token,
  labNome: laboratorio.nome,
})
const waUrl = buildWhatsappUrl(waMessage, cliente.telefono_whatsapp ?? undefined)
```

Rimuovi qualsiasi riferimento al nome paziente o tipo dispositivo nel messaggio WhatsApp.

- [ ] **3.5 Esegui i test — verifica che passano**

```bash
npx vitest run tests/unit/consegna-whatsapp.test.ts
```

Output atteso: PASS (tutti e 5 i test)

- [ ] **3.6 Commit**

```bash
git add \
  src/lib/consegna/whatsapp-template.ts \
  src/app/\(app\)/lavori/\[id\]/consegna/route.ts \
  tests/unit/consegna-whatsapp.test.ts
git commit -m "fix(gdpr): WhatsApp template — remove patient data, use portal link only"
```

---

## Task 4: Email Templates — Rebrand da Supabase a UÀ

Questo task è **manuale** — si esegue dal Supabase Dashboard, non dal codice.

- [ ] **4.1 Accedi a Supabase Dashboard**

Vai su: https://supabase.com/dashboard → progetto UÀ → **Authentication** → **Email Templates**

- [ ] **4.2 Aggiorna template "Reset Password"**

Subject:
```
Reimposta la tua password UÀ
```

Body (HTML):
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

- [ ] **4.3 Aggiorna template "Invite User"**

Subject:
```
Sei stato invitato su UÀ — {{ .SiteURL }}
```

Body (HTML):
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

- [ ] **4.4 Aggiorna template "Magic Link"** (se abilitato)

Subject:
```
Il tuo link di accesso UÀ
```

Body: stesso stile degli altri — logo UÀ + bottone rosso + scadenza.

- [ ] **4.5 Testa inviando un'email reale**

Nel Supabase Dashboard → Authentication → Users → clicca su un utente test → "Send magic link" o "Reset password".
Verifica che l'email ricevuta:
- ✅ Mostra "UÀ" come mittente (non "Supabase Auth")
- ✅ Ha il logo UÀ
- ✅ Bottone rosso funzionante
- ✅ Non menciona "Supabase"

- [ ] **4.6 Documenta la configurazione**

Non c'è file da committare per questo task (è config Supabase).
Aggiungi una nota nel README del progetto o in `docs/ops/supabase-config.md`:

```markdown
## Email Templates
Configurati manualmente in Supabase Dashboard → Authentication → Email Templates.
- Reset Password: UÀ branded, bottone rosso, link scadenza 1h
- Invite User: UÀ branded, CTA attivazione
Ultima modifica: 2026-05-15
```

```bash
git add docs/ops/supabase-config.md
git commit -m "docs(ops): document Supabase email template configuration"
```

---

## Task 5: Verifica Finale Piano A

- [ ] **5.1 Esegui la suite di test completa**

```bash
npx vitest run
npx playwright test --reporter=line
```

Output atteso:
- Vitest: tutti i test passano (inclusi i nuovi unit test WhatsApp)
- Playwright: il test "crea lavoro" deve passare

- [ ] **5.2 Verifica manuale form nuovo lavoro**

```bash
npm run dev
```

Vai su http://localhost:3000/lavori/nuovo e verifica:
- [ ] Campo dentista appare come primo campo
- [ ] Autocomplete funziona cercando "Bianchi" o "GDA"
- [ ] Selezionando un dentista si popola il campo
- [ ] Submit crea il lavoro senza errori
- [ ] Redirect al dettaglio lavoro con numero progressivo

- [ ] **5.3 Verifica manuale WhatsApp**

Crea un lavoro di test → portalo a stato "pronto" → apri la schermata consegna → verifica che il link WhatsApp generato NON contenga nome paziente né tipo prestazione.

- [ ] **5.4 Verifica migration applicata**

```bash
npx supabase db pull --schema public
```

Verifica che le nuove colonne siano presenti:
- `fatture.stato_sdi` ✓
- `lavori_lavorazioni.calo` ✓
- `lavoro_prove` tabella ✓
- `lavori_rifacimenti` tabella ✓
- `listino_prezzi_tier` tabella ✓ con UNIQUE (laboratorio_id, lavorazione_id, tier)

- [ ] **5.5 Commit di chiusura Piano A**

```bash
git tag v1-foundation-complete
git push origin main --tags
```

---

## Checklist Self-Review

### Copertura spec
- [x] Bug cliente_id → Task 2
- [x] Migration fatture.stato_sdi → Task 1
- [x] Migration lavori_lavorazioni.calo → Task 1
- [x] Migration lavoro_prove → Task 1
- [x] Migration lavori_rifacimenti → Task 1
- [x] Migration listino_prezzi_tier (con laboratorio_id) → Task 1
- [x] Enum stato lavori espanso → Task 1
- [x] WhatsApp GDPR-safe → Task 3
- [x] Email templates rebrand → Task 4
- [x] laboratori.logo_url / firma_ddc_url → Task 1

### Non coperti da Piano A (rimandati ai piani successivi)
- PEC SMTP credentials → Piano B (configurazione con Filippo durante onboarding)
- Precheck MDR 12 validazioni → Piano B (dentro Flow Consegna Guidata)
- DdC PDF validation test E2E → Piano E
- PEC idempotency Message-ID → Piano B
- Scadenzario UI → Piano B
- Dashboard OGGI RBAC → Piano C
- UI redesign → Piano D

---

*Piano A salvato il 2026-05-15. Prerequisito per tutti gli altri piani.*
*Tempo stimato: 4-6 ore di sviluppo.*
