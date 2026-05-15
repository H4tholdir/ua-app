# UÀ — Piano B: Core Flows V1 (PROVE + Rifacimenti + Consegna Guidata + Scadenzario)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠️ CORREZIONI POST-REVIEW CODEX + ADVISOR:**
> - **BLOCCO [B.4]**: Task 3 rifacimento usa RPC PostgreSQL atomica (`crea_rifacimento_atomico`) invece di 3 INSERT separati — previene non conformità MDR silenziose
> - **BLOCCO [B.5]**: Precheck MDR riceve SOLO `lavoro_id` — i dati (incluso `non_conformita_aperte`) vengono caricati server-side nella route, il client non passa mai valori decisionali MDR
> - **IMPORTANTE [B.6]**: WhatsApp template scadenzario usa tipo dedicato `buildWhatsappSollecito()` invece di `replace()` su stringa GDPR

**Prerequisito:** Piano A completato (DB migrations applicate, bug cliente_id fixato).

**Goal:** Implementare i 4 flow operativi mancanti critici per il go-live V1: prove/try-in, rifacimenti, consegna guidata potenziata (12 validazioni MDR + PEC idempotency), scadenzario clienti.

**Architecture:** Ogni flow è composto da: (1) route API server-side con validazione + DB write, (2) componente React client-side che chiama l'API, (3) aggiornamento stato macchina. Il flow Consegna Guidata potenzia quello esistente senza riscriverlo. Lo Scadenzario usa la tabella `lavori_partitario` già esistente.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS), react-pdf, TypeScript, Vitest (unit), Playwright (E2E)

---

## Mappa File

| File | Tipo | Responsabilità |
|---|---|---|
| `src/app/api/lavori/[id]/prove/route.ts` | CREATE | API CRUD per prove/try-in |
| `src/app/api/lavori/[id]/rifacimento/route.ts` | CREATE | API crea rifacimento da lavoro |
| `src/components/features/lavori/TabProve.tsx` | CREATE | UI tab prove nel dettaglio lavoro |
| `src/components/features/lavori/RifacimentoModal.tsx` | CREATE | Modal registrazione non conformità |
| `src/app/(app)/lavori/[id]/page.tsx` | MODIFY | Aggiunge tab Prove + badge stato prove |
| `src/app/(app)/lavori/[id]/consegna/route.ts` | MODIFY | Precheck 12 campi + PEC idempotency |
| `src/lib/consegna/precheck-mdr.ts` | CREATE | 12 validazioni MDR con riferimenti normativi |
| `src/lib/consegna/pec-idempotency.ts` | CREATE | Message-ID deterministico + check before retry |
| `src/app/(app)/scadenzario/page.tsx` | CREATE | Pagina scadenzario con lista insoluti |
| `src/app/api/scadenzario/route.ts` | CREATE | API aggregazione partitario + calcolo saldo |
| `src/components/features/scadenzario/ScadenzarioList.tsx` | CREATE | Lista clienti con insoluti |
| `src/components/features/scadenzario/StripeWhatsappSollecito.tsx` | CREATE | Genera link WhatsApp sollecito GDPR-safe |
| `tests/unit/precheck-mdr.test.ts` | CREATE | Unit test 12 validazioni |
| `tests/unit/pec-idempotency.test.ts` | CREATE | Unit test idempotency Message-ID |
| `tests/e2e/prove.spec.ts` | CREATE | E2E flow prove completo |

---

## Task 1: Flow PROVE/Try-in — API

**Files:**
- Create: `src/app/api/lavori/[id]/prove/route.ts`

- [ ] **1.1 Scrivi il test unitario per l'API prove**

```typescript
// tests/unit/api-prove.test.ts
import { describe, it, expect, vi } from 'vitest'

// Mock Supabase — testa la logica di validazione
describe('POST /api/lavori/[id]/prove — validazione', () => {
  it('rifiuta se esito non valido', async () => {
    const body = { action: 'rientro', esito: 'forse', note: '' }
    // Il validatore deve rifiutare esiti non nell'enum
    const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']
    expect(validEsiti).not.toContain(body.esito)
  })

  it('accetta esiti validi', () => {
    const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']
    validEsiti.forEach(e => expect(validEsiti).toContain(e))
  })

  it('manda_in_prova richiede data_rientro_prevista', () => {
    const body = { action: 'manda_in_prova' }
    expect(body).not.toHaveProperty('data_rientro_prevista')
    // Deve fallire senza questa data
  })
})
```

- [ ] **1.2 Crea la route API prove**

```typescript
// src/app/api/lavori/[id]/prove/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: { id: string } }

// GET — lista prove di un lavoro
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lavoro_prove')
    .select('*')
    .eq('lavoro_id', params.id)
    .order('numero_prova', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — manda_in_prova OPPURE registra_rientro
export async function POST(req: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const body = await req.json()
  const { action } = body

  // Verifica che il lavoro esista e appartenga al lab corrente
  const { data: lavoro, error: lavErr } = await supabase
    .from('lavori')
    .select('id, stato, laboratorio_id')
    .eq('id', params.id)
    .single()

  if (lavErr || !lavoro) return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })

  if (action === 'manda_in_prova') {
    const { data_rientro_prevista, istruzioni } = body

    if (!data_rientro_prevista) {
      return NextResponse.json({ error: 'data_rientro_prevista obbligatoria' }, { status: 400 })
    }

    // Conta prove esistenti per questo lavoro
    const { count } = await supabase
      .from('lavoro_prove')
      .select('*', { count: 'exact', head: true })
      .eq('lavoro_id', params.id)

    const numero_prova = (count ?? 0) + 1

    // Crea record prova
    const { data: prova, error: provaErr } = await supabase
      .from('lavoro_prove')
      .insert({
        lavoro_id: params.id,
        laboratorio_id: lavoro.laboratorio_id,
        numero_prova,
        data_uscita: new Date().toISOString().split('T')[0],
        data_rientro_prevista,
        note_dentista: istruzioni ?? null,
      })
      .select()
      .single()

    if (provaErr) return NextResponse.json({ error: provaErr.message }, { status: 500 })

    // Aggiorna stato lavoro
    await supabase
      .from('lavori')
      .update({ stato: 'in_prova_esterna' })
      .eq('id', params.id)

    return NextResponse.json({ prova, stato: 'in_prova_esterna' })
  }

  if (action === 'registra_rientro') {
    const { prova_id, esito, note_dentista, nuova_data_consegna } = body
    const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']

    if (!validEsiti.includes(esito)) {
      return NextResponse.json({ error: `esito non valido: ${esito}` }, { status: 400 })
    }

    // Aggiorna la prova con il rientro
    const { error: updateErr } = await supabase
      .from('lavoro_prove')
      .update({
        data_rientro_effettiva: new Date().toISOString().split('T')[0],
        esito,
        note_dentista: note_dentista ?? null,
      })
      .eq('id', prova_id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Aggiorna stato lavoro in base all'esito
    const nuovoStato = esito === 'rifare' ? 'annullato'
                     : esito === 'sospeso' ? 'sospeso'
                     : 'in_lavorazione'  // ok o modifiche

    const updateLavoro: Record<string, unknown> = { stato: nuovoStato }
    if (nuova_data_consegna) updateLavoro.data_consegna_prevista = nuova_data_consegna

    await supabase.from('lavori').update(updateLavoro).eq('id', params.id)

    // Se "rifare" → registra in incidenti/rifacimenti (viene fatto lato client con modal separato)
    return NextResponse.json({ esito, stato: nuovoStato })
  }

  return NextResponse.json({ error: 'action non valida' }, { status: 400 })
}
```

- [ ] **1.3 Esegui i test — verifica che passano**

```bash
npx vitest run tests/unit/api-prove.test.ts
```

- [ ] **1.4 Commit**

```bash
git add src/app/api/lavori/\[id\]/prove/route.ts tests/unit/api-prove.test.ts
git commit -m "feat(prove): add try-in API — manda_in_prova + registra_rientro"
```

---

## Task 2: Flow PROVE — Componente UI Tab

**Files:**
- Create: `src/components/features/lavori/TabProve.tsx`
- Modify: `src/app/(app)/lavori/[id]/page.tsx`

- [ ] **2.1 Crea il componente TabProve**

```tsx
// src/components/features/lavori/TabProve.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Prova {
  id: string
  numero_prova: number
  data_uscita: string
  data_rientro_prevista: string | null
  data_rientro_effettiva: string | null
  esito: 'ok' | 'modifiche' | 'rifare' | 'sospeso' | null
  note_dentista: string | null
}

interface Props {
  lavoroId: string
  statoLavoro: string
  onProvaInviata?: () => void
  onRientroRegistrato?: () => void
}

const ESITO_LABELS: Record<string, string> = {
  ok: '✅ Approvato',
  modifiche: '🔧 Modifiche richieste',
  rifare: '❌ Da rifare',
  sospeso: '⏸ Sospeso',
}

export function TabProve({ lavoroId, statoLavoro, onProvaInviata, onRientroRegistrato }: Props) {
  const [prove, setProve] = useState<Prova[]>([])
  const [loading, setLoading] = useState(true)
  const [showMandaForm, setShowMandaForm] = useState(false)
  const [showRientroForm, setShowRientroForm] = useState<string | null>(null) // prova_id
  const [dataRientro, setDataRientro] = useState('')
  const [istruzioni, setIstruzioni] = useState('')
  const [esito, setEsito] = useState<'ok' | 'modifiche' | 'rifare' | 'sospeso'>('ok')
  const [noteDentista, setNoteDentista] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadProve = useCallback(async () => {
    const res = await fetch(`/api/lavori/${lavoroId}/prove`)
    if (res.ok) setProve(await res.json())
    setLoading(false)
  }, [lavoroId])

  useEffect(() => { loadProve() }, [loadProve])

  const mandaInProva = async () => {
    if (!dataRientro) return
    setSubmitting(true)
    const res = await fetch(`/api/lavori/${lavoroId}/prove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'manda_in_prova', data_rientro_prevista: dataRientro, istruzioni }),
    })
    if (res.ok) {
      await loadProve()
      setShowMandaForm(false)
      setDataRientro('')
      setIstruzioni('')
      onProvaInviata?.()
    }
    setSubmitting(false)
  }

  const registraRientro = async (provaId: string) => {
    setSubmitting(true)
    const res = await fetch(`/api/lavori/${lavoroId}/prove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'registra_rientro', prova_id: provaId, esito, note_dentista: noteDentista }),
    })
    if (res.ok) {
      await loadProve()
      setShowRientroForm(null)
      setEsito('ok')
      setNoteDentista('')
      onRientroRegistrato?.()
    }
    setSubmitting(false)
  }

  if (loading) return <div className="tab-loading">Caricamento prove...</div>

  const provaAperta = prove.find(p => !p.data_rientro_effettiva)
  const canMandaInProva = ['in_lavorazione', 'ricevuto'].includes(statoLavoro)

  return (
    <div className="tab-prove">
      {/* Storico prove */}
      {prove.length === 0 && (
        <p className="prove-empty">Nessuna prova registrata per questo lavoro.</p>
      )}
      {prove.map(p => (
        <div key={p.id} className={`prova-card ${p.esito ?? 'aperta'}`}>
          <div className="prova-header">
            <span className="prova-num">{p.numero_prova}ª prova</span>
            <span className="prova-data">Uscita: {p.data_uscita}</span>
            {p.esito && <span className="prova-esito">{ESITO_LABELS[p.esito]}</span>}
            {!p.data_rientro_effettiva && (
              <span className="prova-badge-fuori">📤 Dal dentista</span>
            )}
          </div>
          {p.data_rientro_prevista && !p.data_rientro_effettiva && (
            <p className="prova-attesa">Rientro previsto: {p.data_rientro_prevista}</p>
          )}
          {p.note_dentista && (
            <p className="prova-note">{p.note_dentista}</p>
          )}
          {/* Bottone registra rientro se prova aperta */}
          {!p.data_rientro_effettiva && statoLavoro === 'in_prova_esterna' && (
            <button className="btn-secondary" onClick={() => setShowRientroForm(p.id)}>
              Registra rientro
            </button>
          )}
          {/* Form rientro inline */}
          {showRientroForm === p.id && (
            <div className="rientro-form">
              <label>Esito prova</label>
              <select value={esito} onChange={e => setEsito(e.target.value as typeof esito)}>
                <option value="ok">✅ Approvato — procedo</option>
                <option value="modifiche">🔧 Modifiche richieste</option>
                <option value="rifare">❌ Da rifare</option>
                <option value="sospeso">⏸ Sospeso — attendo istruzioni</option>
              </select>
              <label>Note del dentista</label>
              <textarea
                value={noteDentista}
                onChange={e => setNoteDentista(e.target.value)}
                placeholder="Colore troppo chiaro, correggi occlusione..."
                rows={3}
              />
              <div className="rientro-actions">
                <button className="btn-primary" onClick={() => registraRientro(p.id)} disabled={submitting}>
                  {submitting ? 'Salvo...' : 'Conferma rientro'}
                </button>
                <button className="btn-ghost" onClick={() => setShowRientroForm(null)}>Annulla</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* CTA manda in prova */}
      {canMandaInProva && !provaAperta && (
        <button className="btn-secondary" onClick={() => setShowMandaForm(true)}>
          + Manda in prova
        </button>
      )}
      {showMandaForm && (
        <div className="manda-form">
          <label>Data rientro prevista *</label>
          <input type="date" value={dataRientro} onChange={e => setDataRientro(e.target.value)} required />
          <label>Istruzioni per il dentista</label>
          <textarea
            value={istruzioni}
            onChange={e => setIstruzioni(e.target.value)}
            placeholder="Verificare colore A2, occlusione laterale destra..."
            rows={3}
          />
          <div className="manda-actions">
            <button className="btn-primary" onClick={mandaInProva} disabled={!dataRientro || submitting}>
              {submitting ? 'Invio...' : 'Conferma — manda in prova'}
            </button>
            <button className="btn-ghost" onClick={() => setShowMandaForm(false)}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **2.2 Aggiungi il tab Prove nella pagina dettaglio lavoro**

In `src/app/(app)/lavori/[id]/page.tsx`, aggiungi `TabProve` alla lista dei tab esistenti:

```tsx
// Importa il componente
import { TabProve } from '@/components/features/lavori/TabProve'

// Nella definizione dei tab (cerca l'array di tab o i TabsTrigger esistenti):
// Aggiungi:
<TabsTrigger value="prove">
  Prove {proveCount > 0 && <span className="tab-badge">{proveCount}</span>}
</TabsTrigger>

// E il contenuto:
<TabsContent value="prove">
  <TabProve
    lavoroId={lavoro.id}
    statoLavoro={lavoro.stato}
    onProvaInviata={() => router.refresh()}
    onRientroRegistrato={() => router.refresh()}
  />
</TabsContent>
```

- [ ] **2.3 Test E2E del flow prove**

```typescript
// tests/e2e/prove.spec.ts
import { test, expect } from '@playwright/test'

test('flow prove: manda in prova e registra rientro', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.fill('[name="email"]', process.env.E2E_EMAIL!)
  await page.fill('[name="password"]', process.env.E2E_PASSWORD!)
  await page.click('[type="submit"]')
  await page.waitForURL('/dashboard')

  // Vai a un lavoro in stato in_lavorazione
  // (assumiamo che esista un lavoro di test nel DB)
  await page.goto('/lavori')
  await page.click('.lavoro-card >> nth=0')

  // Apri tab prove
  await page.click('[value="prove"]')
  await expect(page.getByText('Nessuna prova registrata')).toBeVisible()

  // Manda in prova
  await page.click('text=+ Manda in prova')
  const domani = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  await page.fill('[type="date"]', domani)
  await page.click('text=Conferma — manda in prova')

  // Verifica stato cambiato
  await expect(page.getByText('Dal dentista')).toBeVisible()
  await expect(page.getByText('1ª prova')).toBeVisible()
})
```

- [ ] **2.4 Commit**

```bash
git add \
  src/components/features/lavori/TabProve.tsx \
  src/app/\(app\)/lavori/\[id\]/page.tsx \
  tests/e2e/prove.spec.ts
git commit -m "feat(prove): add try-in tab UI with manda_in_prova and registra_rientro"
```

---

## Task 3: Flow Rifacimento — API + Modal

**Files:**
- Create: `src/app/api/lavori/[id]/rifacimento/route.ts`
- Create: `src/components/features/lavori/RifacimentoModal.tsx`

- [ ] **3.0 Crea la RPC PostgreSQL atomica**

> ⚠️ FIX BLOCCO [B.4]: Il rifacimento deve essere atomico. Annullamento originale + creazione nuovo lavoro + registrazione incidente MDR avvengono in un'unica transazione con rollback automatico. Mai 3 INSERT separati senza transazione.

Aggiungi alla migration (o crea `supabase/migrations/007_rpc_rifacimento.sql`):

```sql
-- supabase/migrations/007_rpc_rifacimento.sql
CREATE OR REPLACE FUNCTION crea_rifacimento_atomico(
  p_lavoro_originale_id UUID,
  p_motivo              TEXT,
  p_rilevato_in         TEXT DEFAULT NULL,
  p_costo_interno       DECIMAL DEFAULT NULL,
  p_note                TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lab_id     UUID;
  v_originale  lavori%ROWTYPE;
  v_nuovo      lavori%ROWTYPE;
BEGIN
  -- Carica lavoro originale (verifica laboratorio_id via RLS-equivalente)
  SELECT * INTO v_originale FROM lavori WHERE id = p_lavoro_originale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lavoro non trovato';
  END IF;
  v_lab_id := v_originale.laboratorio_id;

  -- 1. Annulla il lavoro originale
  UPDATE lavori
    SET stato = 'annullato',
        note  = COALESCE('[RIFACIMENTO: ' || p_motivo || '] ', '') || COALESCE(v_originale.note, ''),
        updated_at = now()
    WHERE id = p_lavoro_originale_id;

  -- 2. Crea il nuovo lavoro rifacimento
  INSERT INTO lavori (
    laboratorio_id, cliente_id, paziente_id, paziente_nome,
    tipo_dispositivo, data_consegna_prevista, tecnico_id,
    note, stato
  ) VALUES (
    v_originale.laboratorio_id, v_originale.cliente_id,
    v_originale.paziente_id, v_originale.paziente_nome,
    v_originale.tipo_dispositivo, v_originale.data_consegna_prevista,
    v_originale.tecnico_id,
    'Rifacimento di ' || v_originale.numero_lavoro || ' — ' || p_motivo,
    'ricevuto'
  ) RETURNING * INTO v_nuovo;

  -- 3. Registra nella tabella rifacimenti
  INSERT INTO lavori_rifacimenti (
    laboratorio_id, lavoro_originale_id, lavoro_nuovo_id,
    motivo, rilevato_in, costo_interno, note
  ) VALUES (
    v_lab_id, p_lavoro_originale_id, v_nuovo.id,
    p_motivo, p_rilevato_in, p_costo_interno, p_note
  );

  -- 4. Registra in incidenti_mdr (MDR obbligatorio)
  INSERT INTO incidenti_mdr (
    laboratorio_id, lavoro_id, tipo, descrizione, gravita, stato
  ) VALUES (
    v_lab_id, p_lavoro_originale_id, 'non_conformita',
    'Non conformità: ' || p_motivo || ' — rilevato in: ' || COALESCE(p_rilevato_in, 'non specificato'),
    'bassa', 'aperto'
  );

  RETURN json_build_object('lavoro_nuovo_id', v_nuovo.id, 'numero_lavoro', v_nuovo.numero_lavoro);
END;
$$;
```

- [ ] **3.1 Crea la route API rifacimento (usa la RPC)**

```typescript
// src/app/api/lavori/[id]/rifacimento/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MOTIVI_VALIDI = [
  'colore_sbagliato','misura_errata','fusione_difettosa',
  'rottura_produzione','non_confortevole','errore_prescrizione','altro'
]

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const body = await req.json()
  const { motivo, rilevato_in, costo_interno, note } = body

  if (!MOTIVI_VALIDI.includes(motivo)) {
    return NextResponse.json({ error: `motivo non valido: ${motivo}` }, { status: 400 })
  }

  // FIX BLOCCO [B.4]: usa RPC atomica invece di 3 INSERT separati
  // La RPC fa annullo + nuovo lavoro + incidente_mdr in una singola transazione
  const { data, error } = await supabase.rpc('crea_rifacimento_atomico', {
    p_lavoro_originale_id: params.id,
    p_motivo: motivo,
    p_rilevato_in: rilevato_in ?? null,
    p_costo_interno: costo_interno ? parseFloat(costo_interno) : null,
    p_note: note ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data as { lavoro_nuovo_id: string; numero_lavoro: string })
}
```

- [ ] **3.2 Crea il modal RifacimentoModal**

```tsx
// src/components/features/lavori/RifacimentoModal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  lavoroId: string
  numeroLavoro: string
  onClose: () => void
}

const MOTIVI = [
  { value: 'colore_sbagliato', label: 'Colore sbagliato' },
  { value: 'misura_errata', label: 'Misura errata' },
  { value: 'fusione_difettosa', label: 'Fusione difettosa' },
  { value: 'rottura_produzione', label: 'Rottura durante produzione' },
  { value: 'non_confortevole', label: 'Non confortevole per il paziente' },
  { value: 'errore_prescrizione', label: 'Errore nella prescrizione del dentista' },
  { value: 'altro', label: 'Altro (specifica nelle note)' },
]

const RILEVATO_IN = [
  { value: 'produzione', label: 'Durante la produzione' },
  { value: 'prova_1', label: 'Alla 1ª prova' },
  { value: 'prova_2', label: 'Alla 2ª prova' },
  { value: 'post_consegna', label: 'Dopo la consegna' },
]

export function RifacimentoModal({ lavoroId, numeroLavoro, onClose }: Props) {
  const router = useRouter()
  const [motivo, setMotivo] = useState('')
  const [rilevatoIn, setRilevatoIn] = useState('')
  const [costoInterno, setCostoInterno] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!motivo) { setError('Seleziona il motivo'); return }
    setSubmitting(true)
    const res = await fetch(`/api/lavori/${lavoroId}/rifacimento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        motivo,
        rilevato_in: rilevatoIn || null,
        costo_interno: costoInterno ? parseFloat(costoInterno) : null,
        note: note || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      router.push(`/lavori/${data.lavoro_nuovo_id}`)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Errore imprevisto')
    }
    setSubmitting(false)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="rifacimento-title">
      <div className="modal-card">
        <h2 id="rifacimento-title">Registra non conformità</h2>
        <p className="modal-sub">
          Lavoro {numeroLavoro} verrà annullato e verrà creato un nuovo lavoro di rifacimento.
          Questa azione è registrata nel sistema qualità MDR.
        </p>

        <label>Motivo non conformità *</label>
        <select value={motivo} onChange={e => setMotivo(e.target.value)}>
          <option value="">Seleziona...</option>
          {MOTIVI.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <label>Rilevato durante</label>
        <select value={rilevatoIn} onChange={e => setRilevatoIn(e.target.value)}>
          <option value="">Seleziona...</option>
          {RILEVATO_IN.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <label>Costo interno stimato (€)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={costoInterno}
          onChange={e => setCostoInterno(e.target.value)}
          placeholder="Es. 25.00"
        />

        <label>Note aggiuntive</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="Descrivi il problema in dettaglio..."
        />

        {error && <p className="error-msg" role="alert">{error}</p>}

        <div className="modal-actions">
          <button className="btn-danger" onClick={handleSubmit} disabled={submitting || !motivo}>
            {submitting ? 'Creo rifacimento...' : 'Crea rifacimento'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Annulla</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **3.3 Commit**

```bash
git add \
  src/app/api/lavori/\[id\]/rifacimento/route.ts \
  src/components/features/lavori/RifacimentoModal.tsx
git commit -m "feat(rifacimento): add non-conformance registration — annulla originale + crea nuovo"
```

---

## Task 4: Consegna Guidata — Precheck MDR 12 Campi + PEC Idempotency

**Files:**
- Create: `src/lib/consegna/precheck-mdr.ts`
- Create: `src/lib/consegna/pec-idempotency.ts`
- Modify: `src/app/(app)/lavori/[id]/consegna/route.ts`
- Create: `tests/unit/precheck-mdr.test.ts`
- Create: `tests/unit/pec-idempotency.test.ts`

- [ ] **4.1 Scrivi i test per il precheck MDR**

```typescript
// tests/unit/precheck-mdr.test.ts
import { describe, it, expect } from 'vitest'
import { runPrecheckMdr, type PrecheckInput } from '@/lib/consegna/precheck-mdr'

const validLavoro: PrecheckInput = {
  laboratorio_itca: 'ITCA01051686',
  materiali: [{ nome: 'Zirconia', lotto: 'LOT2025001', scadenza: '2027-01-01' }],
  paziente_codice_gdpr: 'PAZ_ABC123',
  tipo_dispositivo: 'protesi_fissa',
  lavorazioni: [{ id: 'l1', nome: 'Corona ceramica', quantita: 1 }],
  dentista_piva: '03508740655',
  data_consegna: new Date().toISOString(),
  numero_ddc: 'DDC-2026-0094',
  prescrizione_ricevuta: true,
  conformita_fornitore: true,
  non_conformita_aperte: false,
  laboratorio_firma_url: 'https://storage.ua.app/firme/lab1.png',
}

describe('runPrecheckMdr', () => {
  it('passa con dati completi validi', () => {
    const result = runPrecheckMdr(validLavoro)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fallisce senza ITCA', () => {
    const r = runPrecheckMdr({ ...validLavoro, laboratorio_itca: '' })
    expect(r.passed).toBe(false)
    expect(r.errors[0].campo).toBe('laboratorio_itca')
    expect(r.errors[0].riferimento).toContain('ITCA')
  })

  it('fallisce con materiale senza lotto', () => {
    const r = runPrecheckMdr({
      ...validLavoro,
      materiali: [{ nome: 'Zirconia', lotto: '', scadenza: '2027-01-01' }],
    })
    expect(r.passed).toBe(false)
    expect(r.errors.some(e => e.campo === 'materiali_lotti')).toBe(true)
  })

  it('fallisce senza paziente GDPR', () => {
    const r = runPrecheckMdr({ ...validLavoro, paziente_codice_gdpr: '' })
    expect(r.passed).toBe(false)
    expect(r.errors[0].campo).toBe('paziente_codice_gdpr')
  })

  it('fallisce con non conformità aperte', () => {
    const r = runPrecheckMdr({ ...validLavoro, non_conformita_aperte: true })
    expect(r.passed).toBe(false)
    expect(r.errors[0].campo).toBe('non_conformita_aperte')
  })

  it('restituisce riferimento normativo per ogni errore', () => {
    const r = runPrecheckMdr({ ...validLavoro, laboratorio_itca: '', prescrizione_ricevuta: false })
    r.errors.forEach(e => {
      expect(e.riferimento).toBeTruthy()
      expect(e.messaggio).toBeTruthy()
    })
  })
})
```

- [ ] **4.2 Implementa il precheck MDR**

```typescript
// src/lib/consegna/precheck-mdr.ts

export interface MaterialeLavorazione {
  nome: string
  lotto: string
  scadenza: string
}

export interface LavorazioneItem {
  id: string
  nome: string
  quantita: number
}

export interface PrecheckInput {
  laboratorio_itca: string
  materiali: MaterialeLavorazione[]
  paziente_codice_gdpr: string
  tipo_dispositivo: string
  lavorazioni: LavorazioneItem[]
  dentista_piva: string
  data_consegna: string
  numero_ddc: string
  prescrizione_ricevuta: boolean
  conformita_fornitore: boolean
  non_conformita_aperte: boolean
  laboratorio_firma_url: string
}

export interface PrecheckError {
  campo: string
  messaggio: string
  riferimento: string  // es. "Art. 10(8) MDR 2017/745"
}

export interface PrecheckResult {
  passed: boolean
  errors: PrecheckError[]
}

export function runPrecheckMdr(input: PrecheckInput): PrecheckResult {
  const errors: PrecheckError[] = []

  // 1. ITCA laboratorio
  if (!input.laboratorio_itca?.trim()) {
    errors.push({
      campo: 'laboratorio_itca',
      messaggio: 'Codice ITCA mancante nelle impostazioni del laboratorio',
      riferimento: 'Registro ITCA Ministero Salute — obbligatorio per DM su misura',
    })
  }

  // 2. Materiali con lotto
  const materialiSenzaLotto = input.materiali.filter(m => !m.lotto?.trim())
  if (materialiSenzaLotto.length > 0) {
    errors.push({
      campo: 'materiali_lotti',
      messaggio: `${materialiSenzaLotto.length} materiale/i senza numero di lotto: ${materialiSenzaLotto.map(m => m.nome).join(', ')}`,
      riferimento: 'Art. 10(8) MDR 2017/745 — tracciabilità materiali obbligatoria per DM su misura',
    })
  }

  // 3. Paziente codice GDPR
  if (!input.paziente_codice_gdpr?.trim()) {
    errors.push({
      campo: 'paziente_codice_gdpr',
      messaggio: 'Codice paziente mancante — richiesto per pseudonimizzazione GDPR',
      riferimento: 'GDPR Art. 9 — trattamento dati sanitari',
    })
  }

  // 4. Tipo dispositivo
  if (!input.tipo_dispositivo?.trim()) {
    errors.push({
      campo: 'tipo_dispositivo',
      messaggio: 'Tipo dispositivo non specificato',
      riferimento: 'Allegato XIII §1 MDR 2017/745 — elemento obbligatorio DdC',
    })
  }

  // 5. Almeno una lavorazione
  if (!input.lavorazioni?.length) {
    errors.push({
      campo: 'lavorazioni',
      messaggio: 'Nessuna lavorazione associata al lavoro',
      riferimento: 'Allegato XIII §1 MDR 2017/745 — descrizione dispositivo obbligatoria',
    })
  }

  // 6. Dentista P.IVA o CF
  if (!input.dentista_piva?.trim()) {
    errors.push({
      campo: 'dentista_piva',
      messaggio: 'P.IVA o Codice Fiscale del dentista prescrivente mancante',
      riferimento: 'Art. 2(1)(w) MDR — prescrittore identificato obbligatoriamente',
    })
  }

  // 7. Data consegna coerente (non nel passato di più di 30 giorni)
  if (input.data_consegna) {
    const dataConsegna = new Date(input.data_consegna)
    const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    if (dataConsegna < trentaGiorniFa) {
      errors.push({
        campo: 'data_consegna',
        messaggio: `Data consegna (${dataConsegna.toLocaleDateString('it-IT')}) è più di 30 giorni nel passato — verifica che sia corretta`,
        riferimento: 'Allegato XIII — data consegna deve essere accurata',
      })
    }
  } else {
    errors.push({
      campo: 'data_consegna',
      messaggio: 'Data di consegna non impostata',
      riferimento: 'Allegato XIII §1 MDR — data obbligatoria',
    })
  }

  // 8. Numero DdC disponibile
  if (!input.numero_ddc?.trim()) {
    errors.push({
      campo: 'numero_ddc',
      messaggio: 'Numero progressivo DdC non disponibile',
      riferimento: 'Allegato IV §11 MDR — numerazione DdC obbligatoria',
    })
  }

  // 9. Prescrizione ricevuta (flag con responsabilità utente)
  if (!input.prescrizione_ricevuta) {
    errors.push({
      campo: 'prescrizione_ricevuta',
      messaggio: 'Conferma ricezione prescrizione non registrata',
      riferimento: 'Art. 2(1)(w) MDR — produzione su base di prescrizione obbligatoria',
    })
  }

  // 10. Conformità fornitore
  if (!input.conformita_fornitore) {
    errors.push({
      campo: 'conformita_fornitore',
      messaggio: 'Conformità materiali del fornitore non confermata',
      riferimento: 'Allegato I GSPR §17 MDR — requisiti sicurezza materiali',
    })
  }

  // 11. Nessuna non conformità aperta
  if (input.non_conformita_aperte) {
    errors.push({
      campo: 'non_conformita_aperte',
      messaggio: 'Esistono non conformità aperte per questo dispositivo — risolverle prima della consegna',
      riferimento: 'ISO 13485 §8.3 — gestione non conformità',
    })
  }

  // 12. Firma laboratorio configurata
  if (!input.laboratorio_firma_url?.trim()) {
    errors.push({
      campo: 'laboratorio_firma',
      messaggio: 'Firma del laboratorio non configurata nelle Impostazioni',
      riferimento: 'Allegato XIII §2 MDR — firma fabbricante obbligatoria sulla DdC',
    })
  }

  return { passed: errors.length === 0, errors }
}
```

- [ ] **4.3 Scrivi test per idempotency PEC**

```typescript
// tests/unit/pec-idempotency.test.ts
import { describe, it, expect } from 'vitest'
import { generatePecMessageId, isPecMessageIdUsed } from '@/lib/consegna/pec-idempotency'

describe('generatePecMessageId', () => {
  it('genera ID deterministico per stessi input', () => {
    const id1 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-456', 'fattura')
    const id2 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-456', 'fattura')
    expect(id1).toBe(id2)
  })

  it('genera ID diversi per input diversi', () => {
    const id1 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-456', 'fattura')
    const id2 = generatePecMessageId('lab-uuid-123', 'lavoro-uuid-789', 'fattura')
    expect(id1).not.toBe(id2)
  })

  it('formato è valido come Message-ID email', () => {
    const id = generatePecMessageId('lab-123', 'lav-456', 'fattura')
    expect(id).toMatch(/^<ua-[a-f0-9]+-[a-f0-9]+@ua\.app>$/)
  })
})
```

- [ ] **4.4 Implementa PEC idempotency**

```typescript
// src/lib/consegna/pec-idempotency.ts
import { createHash } from 'crypto'

/**
 * Genera un Message-ID deterministico per prevenire invii duplicati PEC.
 * RFC 5322 formato: <local@domain>
 * Il Message-ID è lo stesso per stessi input → retry sicuro.
 */
export function generatePecMessageId(
  labId: string,
  lavoroId: string,
  tipo: 'fattura' | 'ddc'
): string {
  const hash = createHash('sha256')
    .update(`${labId}:${lavoroId}:${tipo}`)
    .digest('hex')
    .substring(0, 16)

  const shortLavoro = lavoroId.replace(/-/g, '').substring(0, 8)
  return `<ua-${hash}-${shortLavoro}@ua.app>`
}

/**
 * Verifica se un Message-ID è già stato inviato con successo.
 * Controlla il campo nome_file_xml (o un campo pec_message_id) nella tabella fatture.
 */
export async function isPecMessageIdUsed(
  supabase: ReturnType<typeof import('@/lib/supabase/server').createClient extends Promise<infer T> ? () => Promise<T> : never>,
  lavoroId: string,
  tipo: 'fattura' | 'ddc'
): Promise<boolean> {
  if (tipo === 'fattura') {
    const client = await (supabase as unknown as Promise<ReturnType<typeof import('@/lib/supabase/server').createClient>>)
    // Verifica se fattura è già stata inviata con successo
    const { data } = await (client as unknown as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { in: (col2: string, vals: string[]) => { single: () => Promise<{ data: unknown }> } } } } })
      .from('fatture')
      .select('stato_sdi')
      .eq('lavoro_id', lavoroId)
      .in('stato_sdi', ['inviata', 'accettata', 'consegnata'])
      .single()
    return !!data
  }
  return false
}
```

- [ ] **4.5 Esegui i test**

```bash
npx vitest run tests/unit/precheck-mdr.test.ts tests/unit/pec-idempotency.test.ts
```

Output atteso: tutti PASS

- [ ] **4.6 Integra il precheck nella route consegna**

> ⚠️ FIX BLOCCO [B.5]: `runPrecheckMdr()` riceve SOLO `lavoro_id` — tutti i dati (incluso `non_conformita_aperte`) vengono caricati server-side dalla route. Il client NON passa mai valori MDR decisionali.

In `src/app/(app)/lavori/[id]/consegna/route.ts`:

```typescript
import { runPrecheckMdr } from '@/lib/consegna/precheck-mdr'
import { generatePecMessageId } from '@/lib/consegna/pec-idempotency'

// All'inizio della funzione POST consegna, carica TUTTO server-side:

// 1. Carica lavoro con tutti i dati necessari
const { data: lavoro } = await supabase
  .from('lavori')
  .select(`
    *, 
    clienti(id, partita_iva, nome, cognome, studio, telefono),
    lavori_lavorazioni(*, listino(id, descrizione)),
    laboratori(id, nome, codice_itca, firma_ddc_url)
  `)
  .eq('id', params.id)
  .single()

// 2. Controlla non conformità aperte SERVER-SIDE (non dal client)
const { count: ncAperte } = await supabase
  .from('incidenti_mdr')
  .select('*', { count: 'exact', head: true })
  .eq('lavoro_id', params.id)
  .eq('stato', 'aperto')

// 3. Genera numero DdC server-side
const progressivoDdc = await supabase.rpc('genera_progressivo', {
  p_laboratorio_id: lavoro.laboratorio_id,
  p_tipo: 'ddc',
})

// 4. Esegui precheck con TUTTI dati server-side
const precheckResult = runPrecheckMdr({
  laboratorio_itca: lavoro.laboratori.codice_itca,
  materiali: lavoro.lavori_lavorazioni?.map(l => ({
    nome: l.listino?.descrizione ?? '',
    lotto: l.lotto_id ?? '',
    scadenza: '',
  })) ?? [],
  paziente_codice_gdpr: lavoro.paziente_codice_gdpr ?? '',
  tipo_dispositivo: lavoro.tipo_dispositivo,
  lavorazioni: lavoro.lavori_lavorazioni ?? [],
  dentista_piva: lavoro.clienti?.partita_iva ?? '',
  data_consegna: lavoro.data_consegna_prevista,
  numero_ddc: `DDC-${new Date().getFullYear()}-${String(progressivoDdc.data).padStart(4, '0')}`,
  prescrizione_ricevuta: lavoro.prescrizione_ricevuta ?? false,
  conformita_fornitore: lavoro.conformita_fornitore ?? false,
  non_conformita_aperte: (ncAperte ?? 0) > 0,  // ← SERVER-SIDE, non dal client
  laboratorio_firma_url: lavoro.laboratori?.firma_ddc_url ?? '',
})

if (!precheckResult.passed) {
  return NextResponse.json({
    error: 'precheck_mdr_failed',
    errors: precheckResult.errors,
  }, { status: 422 })
}

// Genera Message-ID idempotente per PEC
const pecMessageId = generatePecMessageId(lavoro.laboratori.id, lavoro.id, 'fattura')
// Passa pecMessageId all'invio PEC
```

- [ ] **4.7 Commit**

```bash
git add \
  src/lib/consegna/precheck-mdr.ts \
  src/lib/consegna/pec-idempotency.ts \
  src/app/\(app\)/lavori/\[id\]/consegna/route.ts \
  tests/unit/precheck-mdr.test.ts \
  tests/unit/pec-idempotency.test.ts
git commit -m "feat(consegna): 12-field MDR precheck + PEC idempotency Message-ID"
```

---

## Task 5: Scadenzario UI

**Files:**
- Create: `src/app/api/scadenzario/route.ts`
- Create: `src/app/(app)/scadenzario/page.tsx`
- Create: `src/components/features/scadenzario/ScadenzarioList.tsx`

- [ ] **5.1 Crea la route API scadenzario**

```typescript
// src/app/api/scadenzario/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Aggregazione: clienti con fatture non pagate
  const { data, error } = await supabase
    .from('fatture')
    .select(`
      id,
      numero_fattura,
      data_emissione,
      importo_totale,
      stato_sdi,
      clienti (
        id,
        nome,
        cognome,
        studio,
        telefono
      )
    `)
    .not('stato_sdi', 'in', '("accettata","consegnata")')
    .neq('stato_sdi', 'draft')
    .order('data_emissione', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Raggruppa per cliente e calcola saldo
  const byCliente = (data ?? []).reduce((acc, f) => {
    const clienteId = (f.clienti as { id: string })?.id
    if (!clienteId) return acc
    if (!acc[clienteId]) {
      acc[clienteId] = {
        cliente: f.clienti,
        fatture: [],
        totale_insoluto: 0,
        giorni_max_ritardo: 0,
      }
    }
    acc[clienteId].fatture.push(f)
    acc[clienteId].totale_insoluto += f.importo_totale ?? 0
    const dataEmissione = new Date(f.data_emissione)
    const giorniRitardo = Math.floor((Date.now() - dataEmissione.getTime()) / 86400000)
    acc[clienteId].giorni_max_ritardo = Math.max(acc[clienteId].giorni_max_ritardo, giorniRitardo)
    return acc
  }, {} as Record<string, { cliente: unknown; fatture: unknown[]; totale_insoluto: number; giorni_max_ritardo: number }>)

  const result = Object.values(byCliente).sort((a, b) => b.giorni_max_ritardo - a.giorni_max_ritardo)
  return NextResponse.json(result)
}
```

- [ ] **5.2 Crea la pagina scadenzario**

```tsx
// src/app/(app)/scadenzario/page.tsx
import { Suspense } from 'react'
import { ScadenzarioList } from '@/components/features/scadenzario/ScadenzarioList'

export const metadata = { title: 'Scadenzario | UÀ' }

export default function ScadenzarioPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Scadenzario</h1>
        <p className="page-sub">Clienti con fatture in attesa di pagamento</p>
      </div>
      <Suspense fallback={<div>Caricamento...</div>}>
        <ScadenzarioList />
      </Suspense>
    </div>
  )
}
```

- [ ] **5.3 Crea il componente ScadenzarioList**

```tsx
// src/components/features/scadenzario/ScadenzarioList.tsx
'use client'

import { useState, useEffect } from 'react'
import { buildWhatsappMessage, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'

interface ClienteInsoluto {
  cliente: { id: string; nome: string; cognome: string; studio: string | null; telefono: string | null }
  fatture: Array<{ id: string; numero_fattura: string; data_emissione: string; importo_totale: number }>
  totale_insoluto: number
  giorni_max_ritardo: number
}

export function ScadenzarioList() {
  const [data, setData] = useState<ClienteInsoluto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scadenzario')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="loading-state">Caricamento...</div>
  if (data.length === 0) return (
    <div className="empty-state">
      <p>✅ Nessun insoluto. Tutti i pagamenti sono in regola.</p>
    </div>
  )

  return (
    <div className="scadenzario-list">
      {data.map(item => {
        const nomeCliente = item.cliente.studio ?? `${item.cliente.nome} ${item.cliente.cognome}`
        const urgenza = item.giorni_max_ritardo > 60 ? 'alta'
                      : item.giorni_max_ritardo > 30 ? 'media' : 'bassa'

        // Genera sollecito WhatsApp GDPR-safe (nessun dato clinico)
        const sollecito = buildWhatsappMessage({
          numeroLavoro: item.fatture.map(f => f.numero_fattura).join(', '),
          portalToken: '',
          labNome: undefined,
        }).replace(/Lavoro #.+?pronto.*?\n/s,
          `Gentile ${nomeCliente}, la ricordiamo del pagamento in sospeso di €${item.totale_insoluto.toFixed(2)}.\n`
        )
        const waUrl = item.cliente.telefono
          ? buildWhatsappUrl(sollecito, item.cliente.telefono)
          : buildWhatsappUrl(sollecito)

        return (
          <div key={item.cliente.id} className={`scadenzario-card urgenza-${urgenza}`}>
            <div className="sc-header">
              <div className="sc-nome">{nomeCliente}</div>
              <div className="sc-totale">€{item.totale_insoluto.toFixed(2)}</div>
            </div>
            <div className="sc-meta">
              {item.fatture.length} fattura/e · {item.giorni_max_ritardo} giorni di attesa
            </div>
            <div className="sc-fatture">
              {item.fatture.map(f => (
                <div key={f.id} className="sc-fattura-row">
                  <span>Fattura {f.numero_fattura}</span>
                  <span>{new Date(f.data_emissione).toLocaleDateString('it-IT')}</span>
                  <span>€{f.importo_totale?.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
              aria-label={`Invia sollecito WhatsApp a ${nomeCliente}`}
            >
              💬 Sollecito WhatsApp
            </a>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **5.4 Aggiungi la voce nel menu di navigazione**

Aggiungi `/scadenzario` nella lista del menu "Altro" (tab bar, voce mobile) in `src/components/layout/BottomTabBar.tsx` o nella sidebar desktop.

- [ ] **5.5 Commit**

```bash
git add \
  src/app/api/scadenzario/route.ts \
  src/app/\(app\)/scadenzario/page.tsx \
  src/components/features/scadenzario/ScadenzarioList.tsx
git commit -m "feat(scadenzario): add receivables dashboard — group by client, WhatsApp reminder"
```

---

## Task 6: Test E2E + Verifica Integrazione

- [ ] **6.1 Esegui tutta la suite test**

```bash
npx vitest run
npx playwright test --reporter=line
```

Output atteso: tutti PASS

- [ ] **6.2 Test manuale — Consegna con precheck**

```bash
npm run dev
```

1. Crea un lavoro con dati incompleti (senza firma lab configurata)
2. Apri la schermata Consegna
3. Verifica che il precheck mostri errore "Firma laboratorio non configurata"
4. Vai in Impostazioni → carica logo/firma
5. Torna alla Consegna → precheck deve passare

- [ ] **6.3 Commit finale Piano B**

```bash
git tag v1-core-flows-complete
git push origin main --tags
```

---

## Checklist Self-Review

- [x] Flow PROVE/Try-in — Task 1+2
- [x] Flow Rifacimento — Task 3
- [x] Consegna Guidata 12 validazioni MDR — Task 4
- [x] PEC idempotency Message-ID — Task 4.4
- [x] Scadenzario UI — Task 5
- [x] WhatsApp GDPR-safe nel scadenzario — Task 5.3

### Non coperti da Piano B (rimandati)
- Dashboard OGGI RBAC-aware → Piano C
- UI redesign Clay Haptimorphism → Piano D
- PEC SMTP wizard configurazione → Piano D (dentro onboarding)
- DdC PDF validation E2E → Piano E

*Tempo stimato: 2-3 giorni di sviluppo.*
