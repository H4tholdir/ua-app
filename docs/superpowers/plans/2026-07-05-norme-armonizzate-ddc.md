# Norme armonizzate applicate — popolamento e rendering su DdC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Popolare e renderizzare l'elenco delle normative armonizzate applicate (`dichiarazioni_conformita.norme_json`, MDR §7) sulla Dichiarazione di Conformità, oggi sempre `null` e mai mostrato.

**Architecture:** Estende `rischi_tipo_dispositivo` (già la lookup per-lab/per-tipo-dispositivo che alimenta la DdC) con una colonna `norme_json`, invece di creare una tabella parallela. `generateDdC()` legge questa colonna e la propaga nell'oggetto insertito su `dichiarazioni_conformita`; `DdcTemplate.tsx` la renderizza in una nuova sezione §6-bis. L'editor esistente (`RischiEditor.tsx`) e le rotte API esistenti (`/api/qualita/rischi`, `/api/qualita/rischi/[id]`) vengono estesi, non duplicati.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + PostgREST), TypeScript, Vitest, `@react-pdf/renderer`.

## Global Constraints

- La migration SQL richiede **conferma esplicita di Francesco prima dell'apply sul progetto Supabase live** (`iagibumwjstnveqpjbwq`) — pattern obbligatorio per ogni migration in questo progetto (vedi `CLAUDE.md`). Il Task 1 si ferma dopo aver scritto il file di migration: l'apply e la rigenerazione di `database.types.ts` sono un passo separato eseguito dalla sessione di controllo, non da un subagent implementer.
- Dopo l'apply: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` seguito da `npx tsc --noEmit` (regola CLAUDE.md).
- `npx tsc --noEmit` deve restare pulito dopo ogni task.
- `npx vitest run` deve restare verde (nessuna regressione) dopo ogni task. Baseline all'inizio di questo piano: 466 passed / 4 skipped.
- Ogni elemento di `norme_json` ha la forma `{codice: string, titolo: string, anno?: number}` — nessun campo `id` autogenerato (a differenza di `RischioItem`, l'array non è referenziato altrove per id).
- Nessuna nuova tabella, nessuna nuova policy RLS — `rischi_tipo_dispositivo` è già scoped su `laboratorio_id`.
- Commit message format: `feat(qualita): ...` / `fix(pdf): ...` / `test(...): ...` a seconda del contenuto del task.

---

### Task 1: Migration + tipo di dominio

**Files:**
- Create: `supabase/migrations/20260705090000_rischi_tipo_dispositivo_norme_json.sql`
- Modify: `src/types/domain.ts` (interfaccia `DichiarazioneConformita`, riga ~519-529)
- Modify: `src/types/database.types.ts` (rigenerato, non editare a mano)

**Interfaces:**
- Produces: campo `norme_json: Array<{ codice: string; titolo: string; anno?: number }> | null` su `DichiarazioneConformita` — usato dal Task 4 (generatore) e dal Task 5 (template).
- Produces: colonna `rischi_tipo_dispositivo.norme_json JSONB NOT NULL DEFAULT '[]'` — usata dal Task 2 (API) e dal Task 4 (generatore).

- [ ] **Step 1: Scrivi il file di migration**

```sql
-- supabase/migrations/20260705090000_rischi_tipo_dispositivo_norme_json.sql
-- Estende rischi_tipo_dispositivo con l'elenco delle normative armonizzate
-- applicate per tipo di dispositivo (MDR 2017/745 — Fascicolo Tecnico Art.
-- 10(4)/Allegato II-III). Colonna additiva, default '[]', nessun backfill
-- necessario, nessuna nuova policy RLS (la tabella è già scoped su
-- laboratorio_id).

ALTER TABLE rischi_tipo_dispositivo
  ADD COLUMN norme_json JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN rischi_tipo_dispositivo.norme_json IS
  'Array: [{codice, titolo, anno}] — normative armonizzate applicate al tipo di dispositivo';
```

- [ ] **Step 2: STOP — applica la migration al progetto Supabase live**

Questo step NON va eseguito da un subagent implementer. La sessione di controllo deve:
1. Mostrare il contenuto esatto della migration a Francesco e attendere conferma esplicita prima di procedere (pattern obbligatorio, vedi Global Constraints).
2. Dopo conferma, applicare la migration al progetto `iagibumwjstnveqpjbwq` (via MCP Supabase `apply_migration` o `npx supabase db push`, secondo lo strumento disponibile nella sessione).
3. Rigenerare i tipi:

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```

4. Rimuovere l'eventuale messaggio CLI residuo in fondo al file generato (se presente).

- [ ] **Step 3: Verifica che la rigenerazione sia corretta**

Run: `grep -n "norme_json" src/types/database.types.ts`
Expected: la colonna compare nei blocchi `Row`/`Insert`/`Update` di `rischi_tipo_dispositivo` (in `Insert`/`Update` con `?` — ha un default).

- [ ] **Step 4: Aggiungi il campo al tipo di dominio**

In `src/types/domain.ts`, dentro `export interface DichiarazioneConformita { ... }`, subito dopo la riga `rischi_residui_snapshot: string | null;` (fine dell'interfaccia, riga ~528), aggiungi:

```typescript
  // Normative armonizzate applicate (da rischi_tipo_dispositivo, MDR §7 — Fascicolo Tecnico)
  norme_json: Array<{ codice: string; titolo: string; anno?: number }> | null;
```

- [ ] **Step 5: Verifica**

Run: `npx tsc --noEmit`
Expected: nessun errore (il campo è opzionale a livello di utilizzo perché nullable, nessun consumer esistente lo richiede ancora).

Run: `npx vitest run`
Expected: 466 passed / 4 skipped, invariato (nessun consumer tocca ancora questo campo).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260705090000_rischi_tipo_dispositivo_norme_json.sql src/types/domain.ts src/types/database.types.ts
git commit -m "feat(db): aggiungi norme_json a rischi_tipo_dispositivo

Colonna additiva (default '[]', nessun backfill) per l'elenco delle
normative armonizzate applicate per tipo di dispositivo (MDR §7 —
Fascicolo Tecnico Art. 10(4)/Allegato II-III). Migration applicata
al progetto live con conferma esplicita di Francesco. Aggiunto il
campo mancante anche al tipo applicativo DichiarazioneConformita."
```

---

### Task 2: API — validazione e persistenza `norme_json`

**Files:**
- Modify: `src/app/api/qualita/rischi/[id]/route.ts`
- Modify: `src/app/api/qualita/rischi/route.ts`
- Test: `tests/unit/qualita-rischi-id-route.test.ts`

**Interfaces:**
- Consumes: nessuna dipendenza da task precedenti oltre alla colonna DB (Task 1).
- Produces: `PATCH /api/qualita/rischi/[id]` accetta e valida `norme_json` nel body, la persiste insieme a `rischi_json`.

- [ ] **Step 1: Scrivi i test di validazione (RED)**

Aggiungi a `tests/unit/qualita-rischi-id-route.test.ts`, dentro il blocco `describe('PATCH /api/qualita/rischi/[id]', ...)`:

```typescript
  it('norme_json con codice mancante → 422', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({
        rischi_json: [RISCHIO_VALIDO],
        norme_json: [{ codice: '', titolo: 'Dental ceramic materials' }],
      }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('codice')
    expect(updatedData).toBeNull()
  })

  it('norme_json con titolo mancante → 422', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({
        rischi_json: [RISCHIO_VALIDO],
        norme_json: [{ codice: 'EN ISO 6872:2015', titolo: '' }],
      }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('titolo')
  })

  it('norme_json con anno non numerico → 422', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({
        rischi_json: [RISCHIO_VALIDO],
        norme_json: [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 'duemila' }],
      }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('anno')
  })

  it('norme_json valido → 200, persistito con anno opzionale', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({
        rischi_json: [RISCHIO_VALIDO],
        norme_json: [
          { codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 },
          { codice: 'EN ISO 22674:2016', titolo: 'Metallic materials' },
        ],
      }),
      patchParams()
    )

    expect(res.status).toBe(200)
    expect(updatedData?.norme_json).toEqual([
      { codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 },
      { codice: 'EN ISO 22674:2016', titolo: 'Metallic materials' },
    ])
  })

  it('norme_json assente → salvato come array vuoto', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(patchRequest({ rischi_json: [RISCHIO_VALIDO] }), patchParams())
    await res.json()

    expect(updatedData?.norme_json).toEqual([])
  })
```

- [ ] **Step 2: Verifica che i test falliscano**

Run: `npx vitest run tests/unit/qualita-rischi-id-route.test.ts`
Expected: FAIL sui 5 nuovi test — la rotta non legge/valida ancora `norme_json`, quindi `updatedData?.norme_json` è `undefined` e le validazioni non esistono (nessun 422 sui casi non validi).

- [ ] **Step 3: Implementa la validazione e la persistenza**

In `src/app/api/qualita/rischi/[id]/route.ts`, dopo la funzione `validaRischi` esistente (righe 20-62), aggiungi:

```typescript
interface NormaValidata {
  codice: string
  titolo: string
  anno?: number
}

type ValidazioneNorme =
  | { ok: true; value: NormaValidata[] }
  | { ok: false; error: string }

function validaNorme(norme: unknown): ValidazioneNorme {
  if (norme === undefined) {
    return { ok: true, value: [] }
  }
  if (!Array.isArray(norme)) {
    return { ok: false, error: 'Il campo "norme_json" deve essere un array' }
  }

  const out: NormaValidata[] = []

  for (let i = 0; i < norme.length; i++) {
    const n = norme[i] as Record<string, unknown>

    if (typeof n.codice !== 'string' || !n.codice.trim()) {
      return { ok: false, error: `Norma #${i + 1}: campo "codice" obbligatorio` }
    }
    if (typeof n.titolo !== 'string' || !n.titolo.trim()) {
      return { ok: false, error: `Norma #${i + 1}: campo "titolo" obbligatorio` }
    }

    const validata: NormaValidata = { codice: n.codice.trim(), titolo: n.titolo.trim() }

    if (n.anno !== undefined && n.anno !== null && n.anno !== '') {
      const anno = Number(n.anno)
      if (!Number.isInteger(anno)) {
        return { ok: false, error: `Norma #${i + 1}: "anno" deve essere un numero intero` }
      }
      validata.anno = anno
    }

    out.push(validata)
  }

  return { ok: true, value: out }
}
```

Poi, nel corpo di `PATCH`, subito dopo il blocco `validaRischi` esistente (dopo la riga `if (!validated.ok) { ... }`), aggiungi:

```typescript
  const validatedNorme = validaNorme(body.norme_json)
  if (!validatedNorme.ok) {
    return NextResponse.json({ error: validatedNorme.error }, { status: 422 })
  }
```

Infine, nell'oggetto `updates` esistente, aggiungi il campo:

```typescript
  const updates = {
    rischi_json: validated.value,
    norme_json: validatedNorme.value,
    rischi_residui: typeof rischiResidui === 'string' && rischiResidui.trim() ? rischiResidui.trim() : null,
    misure_controllo: typeof misureControllo === 'string' && misureControllo.trim() ? misureControllo.trim() : null,
    versione: existing.versione + 1,
    data_ultima_revisione: new Date().toISOString().slice(0, 10),
  }
```

- [ ] **Step 4: Estendi anche la POST di creazione (upsert)**

In `src/app/api/qualita/rischi/route.ts`, nell'oggetto `upsertData` esistente (righe 77-85), aggiungi il campo opzionale:

```typescript
  const upsertData = {
    laboratorio_id: utente.laboratorio_id,
    tipo_dispositivo: (body.tipo_dispositivo as string).trim(),
    rischi_json: body.rischi_json ?? [],
    norme_json: body.norme_json ?? [],
    rischi_residui: body.rischi_residui ?? null,
    misure_controllo: body.misure_controllo ?? null,
    data_ultima_revisione: body.data_ultima_revisione ?? new Date().toISOString().slice(0, 10),
    versione: body.versione ?? 1,
  }
```

Nessun test dedicato per questa rotta (oggi priva di test — gap preesistente, fuori scope di questo task).

- [ ] **Step 5: Verifica**

Run: `npx vitest run tests/unit/qualita-rischi-id-route.test.ts`
Expected: tutti i test PASS (9 esistenti + 5 nuovi = 14).

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: nessuna regressione sul totale.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/qualita/rischi/route.ts src/app/api/qualita/rischi/[id]/route.ts tests/unit/qualita-rischi-id-route.test.ts
git commit -m "feat(qualita): valida e persisti norme_json nelle rotte rischi

PATCH /api/qualita/rischi/[id] valida norme_json (codice/titolo
obbligatori, anno opzionale numerico) con lo stesso pattern di
validaRischi. POST /api/qualita/rischi accetta il campo opzionale
nell'upsert."
```

---

### Task 3: UI — sezione "Norme armonizzate" nell'editor

**Files:**
- Modify: `src/components/features/qualita/RischiEditor.tsx`
- Modify: `src/app/(app)/qualita/rischi/[id]/page.tsx`
- Test: `tests/unit/RischiEditor.test.tsx`

**Interfaces:**
- Consumes: `PATCH /api/qualita/rischi/[id]` ora accetta `norme_json` (Task 2).
- Produces: `RischiEditor` accetta una nuova prop `normeIniziali: NormaItem[]`, esporta il tipo `NormaItem` (usato dalla pagina).

- [ ] **Step 1: Scrivi i test (RED)**

Aggiungi a `tests/unit/RischiEditor.test.tsx`:

1. Modifica `renderEditor` per accettare anche le norme iniziali:

```typescript
function renderEditor(rischi = [RISCHIO_BASE], norme: Array<{ codice: string; titolo: string; anno?: number }> = []) {
  render(
    <RischiEditor
      rischioId="rischio-1"
      tipoDispositivoLabel="Protesi Fissa"
      versioneIniziale={1}
      dataRevisioneIniziale="2026-05-19"
      rischiIniziali={rischi}
      rischiResiduiIniziali="I rischi residui sono accettabili"
      misureControlloIniziali="Controllo qualità visivo"
      normeIniziali={norme}
    />
  )
}
```

2. Aggiungi questi nuovi test dentro `describe('RischiEditor', ...)`:

```typescript
  it('mostra le norme armonizzate iniziali', () => {
    renderEditor([RISCHIO_BASE], [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials' }])

    expect(screen.getByLabelText('Norma 1 — Codice')).toHaveValue('EN ISO 6872:2015')
    expect(screen.getByLabelText('Norma 1 — Titolo')).toHaveValue('Dental ceramic materials')
  })

  it('bottone "+ Aggiungi norma" aggiunge una nuova riga vuota', () => {
    renderEditor()

    fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi norma' }))

    expect(screen.getByLabelText('Norma 1 — Codice')).toHaveValue('')
  })

  it('submit include norme_json nel payload PATCH', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rischio: { id: 'rischio-1', tipo_dispositivo: 'protesi_fissa', versione: 2, data_ultima_revisione: '2026-07-05' } }),
    })
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })

    renderEditor([RISCHIO_BASE], [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }])
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => expect(reloadMock).toHaveBeenCalledTimes(1))

    const [, options] = fetchMock().mock.calls[0]
    const body = JSON.parse(options.body as string)
    expect(body.norme_json).toEqual([{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }])
  })
```

- [ ] **Step 2: Verifica che i test falliscano**

Run: `npx vitest run tests/unit/RischiEditor.test.tsx`
Expected: FAIL — `RischiEditorProps` non ha ancora `normeIniziali`, nessun elemento con label `Norma 1 — Codice` esiste.

- [ ] **Step 3: Implementa la sezione UI**

In `src/components/features/qualita/RischiEditor.tsx`:

1. Aggiungi l'export del tipo, subito dopo `RischioItem`:

```typescript
export interface NormaItem {
  codice: string
  titolo: string
  anno?: number
}
```

2. Aggiungi la prop all'interfaccia `RischiEditorProps`:

```typescript
interface RischiEditorProps {
  rischioId: string
  tipoDispositivoLabel: string
  versioneIniziale: number
  dataRevisioneIniziale: string
  rischiIniziali: RischioItem[]
  rischiResiduiIniziali: string | null
  misureControlloIniziali: string | null
  normeIniziali: NormaItem[]
}
```

3. Aggiungi la funzione helper, vicino a `nuovoRischioVuoto`:

```typescript
function nuovaNormaVuota(): NormaItem {
  return { codice: '', titolo: '' }
}
```

4. Nella firma del componente, destruttura la nuova prop e aggiungi lo state:

```typescript
export function RischiEditor({
  rischioId,
  tipoDispositivoLabel,
  versioneIniziale,
  dataRevisioneIniziale,
  rischiIniziali,
  rischiResiduiIniziali,
  misureControlloIniziali,
  normeIniziali,
}: RischiEditorProps) {
  const [rischi, setRischi] = useState<RischioItem[]>(rischiIniziali)
  const [rischiResidui, setRischiResidui] = useState(rischiResiduiIniziali ?? '')
  const [misureControllo, setMisureControllo] = useState(misureControlloIniziali ?? '')
  const [norme, setNorme] = useState<NormaItem[]>(normeIniziali)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contatore = useRef(prossimoNumero(rischiIniziali))
```

5. Aggiungi le funzioni di gestione norme, vicino a `aggiornaRischio`/`aggiungiRischio`/`rimuoviRischio`:

```typescript
  const aggiornaNorma = (index: number, patch: Partial<NormaItem>) => {
    setNorme(prev => prev.map((n, i) => (i === index ? { ...n, ...patch } : n)))
  }

  const aggiungiNorma = () => {
    setNorme(prev => [...prev, nuovaNormaVuota()])
    hapticLight()
  }

  const rimuoviNorma = (index: number) => {
    setNorme(prev => prev.filter((_, i) => i !== index))
    hapticLight()
  }
```

6. Nel body di `handleSave`, aggiungi `norme_json` al payload JSON inviato (dentro `body: JSON.stringify({...})`):

```typescript
        body: JSON.stringify({
          rischi_json: rischi,
          norme_json: norme,
          rischi_residui: rischiResidui.trim() || null,
          misure_controllo: misureControllo.trim() || null,
        }),
```

7. Nel JSX, subito dopo il bottone "+ Aggiungi rischio" e prima della card "Rischi residui (sintesi)", aggiungi la nuova sezione:

```tsx
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 10, fontFamily }}>
          Norme armonizzate applicate
        </div>
        {norme.map((n, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle} htmlFor={`norma-${i}-codice`}>Norma {i + 1} — Codice</label>
                <input
                  id={`norma-${i}-codice`}
                  style={inputStyle}
                  value={n.codice}
                  onChange={e => aggiornaNorma(i, { codice: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => rimuoviNorma(i)}
                aria-label={`Rimuovi norma ${i + 1}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #D90012)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily,
                  minHeight: 44,
                  alignSelf: 'flex-end',
                }}
              >
                Rimuovi
              </button>
            </div>
            <div>
              <label style={labelStyle} htmlFor={`norma-${i}-titolo`}>Norma {i + 1} — Titolo</label>
              <input
                id={`norma-${i}-titolo`}
                style={inputStyle}
                value={n.titolo}
                onChange={e => aggiornaNorma(i, { titolo: e.target.value })}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={aggiungiNorma}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px dashed var(--prs, #D4CFC9)',
            background: 'transparent',
            color: 'var(--t2)',
            fontWeight: 600,
            fontSize: 13,
            fontFamily,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          + Aggiungi norma
        </button>
      </div>

```

(Nessuna validazione client-side obbligatoria sulle norme — a differenza dei rischi, l'elenco può restare vuoto; la validazione server-side su codice/titolo non vuoti scatta solo se l'utente aggiunge una riga e la lascia incompleta.)

- [ ] **Step 4: Aggiorna la pagina che istanzia l'editor**

In `src/app/(app)/qualita/rischi/[id]/page.tsx`:

1. Aggiungi `norme_json` alla select:

```typescript
  const { data: rischio } = await svc
    .from('rischi_tipo_dispositivo')
    .select('id, tipo_dispositivo, rischi_json, norme_json, rischi_residui, misure_controllo, data_ultima_revisione, versione')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()
```

2. Aggiorna l'import del tipo e la prop passata a `RischiEditor`:

```typescript
import { RischiEditor } from '@/components/features/qualita/RischiEditor'
import type { RischioItem, NormaItem } from '@/components/features/qualita/RischiEditor'
```

```tsx
        <RischiEditor
          rischioId={rischio.id}
          tipoDispositivoLabel={formatTipoDispositivo(rischio.tipo_dispositivo)}
          versioneIniziale={rischio.versione}
          dataRevisioneIniziale={rischio.data_ultima_revisione ?? '—'}
          rischiIniziali={(Array.isArray(rischio.rischi_json) ? rischio.rischi_json : []) as unknown as RischioItem[]}
          rischiResiduiIniziali={rischio.rischi_residui}
          misureControlloIniziali={rischio.misure_controllo}
          normeIniziali={(Array.isArray(rischio.norme_json) ? rischio.norme_json : []) as unknown as NormaItem[]}
        />
```

- [ ] **Step 5: Verifica**

Run: `npx vitest run tests/unit/RischiEditor.test.tsx`
Expected: tutti i test PASS (8 esistenti + 3 nuovi = 11).

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: nessuna regressione sul totale.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/qualita/RischiEditor.tsx src/app/\(app\)/qualita/rischi/\[id\]/page.tsx tests/unit/RischiEditor.test.tsx
git commit -m "feat(qualita): sezione Norme armonizzate in RischiEditor

Nuova prop normeIniziali + tipo NormaItem esportato. Stesso pattern
UI della sezione rischi (array editabile, + Aggiungi/Rimuovi),
incluso nello stesso salvataggio PATCH."
```

---

### Task 4: `generate-ddc.ts` — popola `norme_json` nell'insert

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts`
- Test: `tests/unit/generate-ddc.test.ts`

**Interfaces:**
- Consumes: colonna `rischi_tipo_dispositivo.norme_json` (Task 1); campo `DichiarazioneConformita.norme_json` (Task 1).
- Produces: l'oggetto `ddc` costruito da `generateDdC()` include ora `norme_json`, propagato sia all'insert su `dichiarazioni_conformita` sia al render del template (a differenza di `norma_riferimento`, `norme_json` è una colonna reale — nessuno split `ddcConNorma` necessario per questo campo).

- [ ] **Step 1: Scrivi i test (RED per il caso "con norme", caratterizzazione per il fallback)**

Aggiungi a `tests/unit/generate-ddc.test.ts`, dentro `describe('generateDdC', ...)`:

```typescript
  it('propaga norme_json da rischi_tipo_dispositivo all\'insert', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'rischi_tipo_dispositivo') return createChain({
        data: { rischi_residui: null, norme_json: [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }] },
        error: null,
      })
      if (table === 'dichiarazioni_conformita') return { insert: mockInsert }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await generateDdC(LAVORO_FIXTURE)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        norme_json: [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }],
      })
    )
  })

  it('nessuna riga in rischi_tipo_dispositivo → norme_json vuoto nell\'insert', async () => {
    mockTables(LAB_FIXTURE)
    await generateDdC(LAVORO_FIXTURE)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ norme_json: [] })
    )
  })
```

- [ ] **Step 2: Verifica che il primo test fallisca**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Expected: FAIL sul primo nuovo test (`norme_json` non compare nell'insert, `generateDdC()` non legge ancora la colonna). Il secondo test PASSA già oggi per puro caso (l'insert non include affatto la chiave `norme_json`, quindi `objectContaining({ norme_json: [] })` fallisce comunque — verifica che FALLISCA anche questo, non solo il primo).

- [ ] **Step 3: Implementa**

In `src/lib/pdf/generate-ddc.ts`, sostituisci la select su `rischi_tipo_dispositivo`:

```typescript
    supabase
      .from('rischi_tipo_dispositivo')
      .select('rischi_residui')
      .eq('laboratorio_id', lavoro.laboratorio_id)
      .eq('tipo_dispositivo', lavoro.tipo_dispositivo)
      .maybeSingle(),
```

con:

```typescript
    supabase
      .from('rischi_tipo_dispositivo')
      .select('rischi_residui, norme_json')
      .eq('laboratorio_id', lavoro.laboratorio_id)
      .eq('tipo_dispositivo', lavoro.tipo_dispositivo)
      .maybeSingle(),
```

Poi, nell'oggetto `ddc`, aggiungi il campo subito dopo `rischi_residui_snapshot`:

```typescript
    rischi_residui_snapshot: (rischiRow?.rischi_residui ?? lab.testo_rischi_default ?? null) as string | null,
    norme_json: rischiRow?.norme_json ?? [],
```

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Expected: tutti i test PASS (5 esistenti + 2 nuovi = 7).

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: nessuna regressione sul totale.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/generate-ddc.ts tests/unit/generate-ddc.test.ts
git commit -m "feat(pdf): popola norme_json in generateDdC() da rischi_tipo_dispositivo

norme_json è una colonna reale su dichiarazioni_conformita (a
differenza di norma_riferimento) — entra direttamente nell'oggetto
ddc condiviso tra insert e rendering, nessuno split necessario."
```

---

### Task 5: `DdcTemplate.tsx` — rendering §6-bis

**Files:**
- Modify: `src/components/features/pdf/DdcTemplate.tsx`
- Modify: `tests/unit/ddc-pdf-content.test.ts`

**Interfaces:**
- Consumes: `ddc.norme_json` (Task 1, popolato dal Task 4).

- [ ] **Step 1: Aggiorna la fixture condivisa e scrivi il nuovo test**

In `tests/unit/ddc-pdf-content.test.ts`, nell'oggetto `DDC_FIXTURE` esistente, aggiungi subito dopo `rischi_residui_snapshot: null,`:

```typescript
  norme_json: null,
```

Poi aggiungi un nuovo test dentro `describe('DdcTemplate — PDF content validation ...', ...)`, dopo il blocco "§8 PRRC" esistente (o in una nuova sezione "§6-bis NORME ARMONIZZATE"):

```typescript
  // ── §6-bis Norme armonizzate applicate ───────────────────────────────────

  it('§6-bis stampa codice e titolo delle norme armonizzate quando presenti', async () => {
    const ddcConNorme = {
      ...DDC_FIXTURE,
      norme_json: [
        { codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials' },
        { codice: 'EN ISO 22674:2016', titolo: 'Metallic materials', anno: 2016 },
      ],
    }
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: ddcConNorme,
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    expect(result.text).toContain('EN ISO 6872:2015')
    expect(result.text).toContain('Dental ceramic materials')
    expect(result.text).toContain('EN ISO 22674:2016')
    expect(result.text).toContain('2016')
  })

  it('§6-bis non compare quando norme_json è vuoto o assente', () => {
    // DDC_FIXTURE (usata in beforeAll per pdfText) ha norme_json: null
    expect(pdfText.toLowerCase()).not.toContain('norme armonizzate')
  })
```

- [ ] **Step 2: Verifica che il primo nuovo test fallisca**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Expected: FAIL sul test "stampa codice e titolo" — il template non renderizza ancora `norme_json`. Il secondo test ("non compare quando vuoto") PASSA già oggi (nessuna sezione esiste), è un test di caratterizzazione che deve restare verde anche dopo l'implementazione.

- [ ] **Step 3: Implementa il rendering**

In `src/components/features/pdf/DdcTemplate.tsx`, subito dopo il blocco `{/* ── §6 CLASSIFICAZIONE ── */}` esistente (dopo la riga `</View>` che chiude quella sezione, prima di `{/* ── §7 CONFORMITA ── */}`), aggiungi:

```tsx
        {/* ── §6-BIS NORME ARMONIZZATE ── */}
        {ddc.norme_json && ddc.norme_json.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>§6-bis — Norme Armonizzate Applicate</Text>
            {ddc.norme_json.map((norma, i) => (
              <Text key={i} style={styles.value}>
                • {norma.codice} — {norma.titolo}{norma.anno ? ` (${norma.anno})` : ''}
              </Text>
            ))}
          </View>
        ) : null}

```

- [ ] **Step 4: Verifica**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Expected: tutti i test PASS (compreso il test "non compare quando vuoto", ancora verde).

Run: `npx tsc --noEmit`
Expected: nessun errore.

Run: `npx vitest run`
Expected: nessuna regressione sul totale.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/pdf/DdcTemplate.tsx tests/unit/ddc-pdf-content.test.ts
git commit -m "feat(pdf): renderizza norme armonizzate applicate su DdC (§6-bis)

Sezione condizionale, subito dopo §6 Classificazione MDR (dove vive
già norma_riferimento singolare) — non rinumera §7/§8 esistenti."
```

---

### Task 6: Verifica finale + memoria progetto

**Files:** nessuno (solo verifica + documentazione)

- [ ] **Step 1: Type check completo**

Run: `npx tsc --noEmit`
Expected: nessun errore.

- [ ] **Step 2: Suite di test completa**

Run: `npx vitest run`
Expected: tutti i test PASS. Conteggio atteso: 466 (baseline) + 5 (Task 2) + 3 (Task 3) + 2 (Task 4) + 2 (Task 5) = 478 passed / 4 skipped.

- [ ] **Step 3: Lint**

Run: `npx eslint src/ --ext .ts,.tsx --max-warnings 0`
Expected: nessun errore/warning.

- [ ] **Step 4: Build production**

Run: `npx next build`
Expected: build pulita, nessun errore.

- [ ] **Step 5: Aggiorna memoria progetto (BP-1, obbligatorio da CLAUDE.md)**

Aggiorna `memory/MEMORY.md` (nuova voce in testa) e `docs/roadmap/ROADMAP-UFFICIALE.md`/`docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (rimuovi la voce "norme_json ... task avviato separatamente" dal backlog aperto B4, segnala come chiuso): estensione `rischi_tipo_dispositivo` con `norme_json`, editor/API estesi, `generateDdC()` popola il campo, `DdcTemplate.tsx` lo renderizza in §6-bis. Nota che il requisito è del Fascicolo Tecnico (non dell'Allegato XIII §1 della DdC stessa) — implementato comunque su richiesta esplicita di Francesco per coprire più norme direttamente sulla DdC.

- [ ] **Step 6: Commit finale della memoria**

```bash
git add memory/MEMORY.md docs/roadmap/ROADMAP-UFFICIALE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "docs: aggiorna memoria progetto — norme armonizzate su DdC completato

rischi_tipo_dispositivo estesa con norme_json, editor/API/generatore/
template aggiornati. Chiude il follow-up aperto dopo B4."
```
