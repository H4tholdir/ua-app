# Piano A — Security + Fix Critici Pre-Launch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere i 5 rischi di sicurezza trovati dalla Codex adversarial review + 5 fix operativi urgenti dall'audit prima che Filippo usi l'app in produzione.

**Architecture:** Fix chirurgici e mirati — nessun refactoring, nessuna nuova feature. Ogni task modifica max 2-3 file. Il tenant-isolation pattern è aggiungere `.eq('laboratorio_id', labId)` a ogni service-role write. Il CSRF pattern è importare `isSameOrigin` dove manca.

**Tech Stack:** Next.js 16 App Router, Supabase service-role client, TypeScript strict, Vitest per i test unitari.

---

## TASK 1 — FK Tenant Validation on POST /api/lavori

**Problema (Codex):** `POST /api/lavori` accetta `cliente_id`, `paziente_id`, `tecnico_id` di altri lab senza validarli. Il PATCH lo fa già correttamente con `FK_FIELDS`.

**Files:**
- Modify: `src/app/api/lavori/route.ts`

- [ ] **Step 1: Leggi il PATCH handler per capire il pattern esistente**

Apri `src/app/api/lavori/[id]/route.ts` righe 142-167. Vedrai:
```typescript
const FK_FIELDS: { field: string; table: string }[] = [
  { field: 'cliente_id', table: 'clienti' },
  { field: 'paziente_id', table: 'pazienti' },
  { field: 'tecnico_id', table: 'tecnici' },
]
for (const { field, table } of FK_FIELDS) {
  const fkId = body[field]
  if (fkId) {
    const { data: fkRow } = await svc.from(table).select('laboratorio_id').eq('id', fkId).single()
    if (!fkRow || fkRow.laboratorio_id !== labId) {
      return NextResponse.json({ error: `${field} non appartiene a questo laboratorio` }, { status: 403 })
    }
  }
}
```

- [ ] **Step 2: Aggiungi la stessa validazione nel POST handler**

In `src/app/api/lavori/route.ts`, trova il blocco POST (cerca `method === 'POST'` o la funzione `POST`). Subito PRIMA dell'insert, aggiungi:

```typescript
// Validate FK tenant ownership before insert
const FK_FIELDS: { field: keyof typeof insertData; table: string }[] = [
  { field: 'cliente_id', table: 'clienti' },
  { field: 'paziente_id', table: 'pazienti' },
  { field: 'tecnico_id', table: 'tecnici' },
]
for (const { field, table } of FK_FIELDS) {
  const fkId = insertData[field]
  if (fkId) {
    const { data: fkRow } = await svc
      .from(table)
      .select('laboratorio_id')
      .eq('id', fkId)
      .single()
    if (!fkRow || fkRow.laboratorio_id !== labId) {
      return NextResponse.json(
        { error: `${String(field)} non appartiene a questo laboratorio` },
        { status: 403 }
      )
    }
  }
}
```

- [ ] **Step 3: Scrivi il test**

In `src/app/api/lavori/__tests__/route.test.ts` (crea se non esiste), aggiungi:

```typescript
describe('POST /api/lavori — FK tenant validation', () => {
  it('should reject cliente_id from another lab', async () => {
    // Arrange: mock svc.from('clienti').select returns laboratorio_id !== labId
    const mockSvc = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { laboratorio_id: 'other-lab-id' },
              error: null,
            }),
          }),
        }),
      }),
    }
    // Act: POST with mismatched cliente_id
    // Assert: returns 403
    // (adatta al pattern di mock già usato negli altri test del progetto)
  })
})
```

- [ ] **Step 4: Verifica TypeScript**

```bash
cd "ua-app" && npx tsc --noEmit
```
Expected: zero errori.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/lavori/route.ts
git commit -m "fix(security): validate FK tenant ownership on POST /api/lavori"
```

---

## TASK 2 — Tenant Predicate su Service-Role Writes (4 file)

**Problema (Codex):** `orchestrate.ts`, `segnala`, `risolvi`, `generate-buono` fanno UPDATE solo su `.eq('id', ...)` senza `.eq('laboratorio_id', ...)`. Se il service-role client viene usato con ID sbagliato, può scrivere su dati di un altro tenant.

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts`
- Modify: `src/lib/pdf/generate-buono.ts`
- Modify: `src/app/api/lavori/[id]/segnala/route.ts`
- Modify: `src/app/api/lavori/[id]/segnala/risolvi/route.ts`

- [ ] **Step 1: Fix orchestrate.ts — update stato consegna**

Trova il blocco che fa UPDATE dello stato del lavoro (cerca `.update({ stato: 'consegnato'`). Aggiungi `.eq('laboratorio_id', laboratorio_id)`:

```typescript
// PRIMA (vulnerabile):
await svc.from('lavori').update({ stato: 'consegnato', data_consegna_effettiva: now }).eq('id', lavoro_id)

// DOPO (sicuro):
const { error: updateError } = await svc
  .from('lavori')
  .update({ stato: 'consegnato', data_consegna_effettiva: now })
  .eq('id', lavoro_id)
  .eq('laboratorio_id', laboratorio_id)  // ← aggiunto
if (updateError) throw new Error(`Consegna update failed: ${updateError.message}`)
```

Assicurati che `laboratorio_id` sia passato come parametro alla funzione. Se non lo è, aggiungilo alla firma:
```typescript
export async function orchestraConsegna(
  lavoro_id: string,
  laboratorio_id: string,  // aggiungi se manca
  ...resto
)
```

- [ ] **Step 2: Fix generate-buono.ts**

Trova `.update(...).eq('id', lavoro.id)`. Aggiungi:
```typescript
.eq('id', lavoro.id)
.eq('laboratorio_id', lavoro.laboratorio_id)  // ← aggiunto
```

- [ ] **Step 3: Fix segnala/route.ts**

Trova il blocco update (circa riga 74-85). Aggiungi `.eq('laboratorio_id', labId)`:
```typescript
const { error } = await svc
  .from('lavori')
  .update({
    segnalazione_tipo: tipo,
    segnalazione_nota: nota,
    segnalazione_at: new Date().toISOString(),
  })
  .eq('id', lavoroId)
  .eq('laboratorio_id', labId)  // ← aggiunto
```

- [ ] **Step 4: Fix segnala/risolvi/route.ts**

Stesso pattern — aggiungi `.eq('laboratorio_id', labId)` all'update.

- [ ] **Step 5: Verifica TypeScript + test**

```bash
npx tsc --noEmit && npx vitest run
```
Expected: zero errori TypeScript, test verdi.

- [ ] **Step 6: Commit**

```bash
git add src/lib/consegna/orchestrate.ts src/lib/pdf/generate-buono.ts \
  src/app/api/lavori/[id]/segnala/route.ts \
  src/app/api/lavori/[id]/segnala/risolvi/route.ts
git commit -m "fix(security): add laboratorio_id predicate to all service-role writes"
```

---

## TASK 3 — CSRF su segnala e risolvi

**Problema (Codex):** `segnala` e `risolvi` non chiamano `isSameOrigin()`. Qualsiasi pagina può fare POST contro questi endpoint se l'utente è loggato.

**Files:**
- Modify: `src/app/api/lavori/[id]/segnala/route.ts`
- Modify: `src/app/api/lavori/[id]/segnala/risolvi/route.ts`
- Modify: `src/app/api/admin/labs/[id]/hard-delete/route.ts`

- [ ] **Step 1: Leggi il pattern isSameOrigin esistente**

Apri `src/lib/utils/csrf.ts`. Vedrai:
```typescript
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Aggiungi CSRF check a segnala/route.ts**

All'inizio della funzione POST (prima di qualsiasi logica), aggiungi:
```typescript
import { isSameOrigin } from '@/lib/utils/csrf'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... resto della funzione invariato
}
```

- [ ] **Step 3: Aggiungi CSRF check a risolvi/route.ts**

Stesso pattern — aggiungi `if (!isSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })` all'inizio.

- [ ] **Step 4: Fix hard-delete — usa isSameOrigin invece di substring check**

In `src/app/api/admin/labs/[id]/hard-delete/route.ts`, sostituisci il check custom con:
```typescript
// PRIMA (bug: usa includes con substring):
if (!origin || !origin.includes(host.split(':')[0])) { ... }

// DOPO (corretto):
if (!isSameOrigin(req)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

- [ ] **Step 5: Verifica**

```bash
npx tsc --noEmit && npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/lavori/[id]/segnala/route.ts \
  src/app/api/lavori/[id]/segnala/risolvi/route.ts \
  src/app/api/admin/labs/[id]/hard-delete/route.ts
git commit -m "fix(security): add isSameOrigin CSRF check to segnala, risolvi, hard-delete"
```

---

## TASK 4 — Block Delivery When Form is Dirty

**Problema (Codex):** Il form autosalva ogni 30 secondi, ma CONSEGNA è navigabile anche con dati non salvati. Si rischia di consegnare con MDR data vecchia.

**Files:**
- Modify: `src/components/features/lavori/LavoroFormClient.tsx`
- Modify: `src/components/features/lavori/ConsegnaButton.tsx`

- [ ] **Step 1: Trova isDirty in useLavoroForm.ts**

Apri `src/hooks/useLavoroForm.ts`. Cerca `isDirty` — dovrebbe essere un boolean nello state. Se non esiste, aggiungilo:
```typescript
const [isDirty, setIsDirty] = useState(false)
// Settalo a true su ogni modifica del form
// Settalo a false dopo ogni save riuscito
```

- [ ] **Step 2: Esporta isDirty da useLavoroForm**

Assicurati che `isDirty` sia nel return dell'hook:
```typescript
return {
  // ... altri valori
  isDirty,
  // ...
}
```

- [ ] **Step 3: Blocca navigazione a /consegna quando dirty**

In `src/components/features/lavori/LavoroFormClient.tsx`, trova il punto dove viene navigato a `/consegna` (cerca `router.push` o link al path consegna). Aggiungi:

```typescript
const { isDirty, save } = useLavoroForm(...)

const handleConsegnaClick = async () => {
  if (isDirty) {
    // Salva prima di navigare
    await save(lavoro.id)
  }
  router.push(`/lavori/${lavoro.id}/consegna`)
}
```

Se il link a consegna è un `<Link>`, sostituiscilo con un `<button onClick={handleConsegnaClick}>`.

- [ ] **Step 4: Set loading state prima del precheck in ConsegnaButton**

In `src/components/features/lavori/ConsegnaButton.tsx`, trova `handleClick`. Sposta `setLoading(true)` all'inizio della funzione, PRIMA del precheck:

```typescript
const handleClick = async () => {
  if (loading) return  // ← blocca doppio-tap
  setLoading(true)     // ← PRIMA (era dopo il precheck)
  try {
    const precheckRes = await fetch(...)
    // ... resto invariato
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 5: Verifica**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/features/lavori/LavoroFormClient.tsx \
  src/components/features/lavori/ConsegnaButton.tsx
git commit -m "fix(ux): block delivery navigation when form is dirty, prevent double-tap"
```

---

## TASK 5 — Opzione "Non dichiarato" per Disinfettante (MDR Compliance)

**Problema (FrontDesk audit):** Il campo disinfettante ha solo 6 opzioni commerciali. Il 40% dei casi reali usa un disinfettante non in lista. Front desk non può procedere → compliance bloccata.

**Files:**
- Modify: `src/components/features/lavori/form/TabAccettazione.tsx`

- [ ] **Step 1: Trova la lista delle opzioni disinfettante**

In `src/components/features/lavori/form/TabAccettazione.tsx`, cerca `DISINFETTANTI` o la select del disinfettante. Troverai un array tipo:
```typescript
const DISINFETTANTI = ['Korsolex Plus', 'Surgikos', 'MD 520', ...]
```

- [ ] **Step 2: Aggiungi "Non dichiarato" come prima opzione**

```typescript
const DISINFETTANTI = [
  'Non dichiarato',    // ← aggiunto primo
  'Korsolex Plus',
  'Surgikos',
  'MD 520',
  // ... resto invariato
]
```

- [ ] **Step 3: Aggiungi campo testo libero per "altro"**

Subito dopo la select disinfettante, aggiungi un input condizionale:
```tsx
{formData.disinfettante_usato === 'Altro' && (
  <input
    type="text"
    placeholder="Specifica disinfettante..."
    value={formData.disinfettante_altro ?? ''}
    onChange={(e) => setFormData(prev => ({ ...prev, disinfettante_altro: e.target.value }))}
    style={{ marginTop: 8, width: '100%' }}
  />
)}
```

Se la select non ha già "Altro", aggiungilo:
```typescript
const DISINFETTANTI = [
  'Non dichiarato',
  'Korsolex Plus',
  'Surgikos',
  'MD 520',
  'Altro',  // ← aggiunto
]
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/features/lavori/form/TabAccettazione.tsx
git commit -m "fix(mdr): add 'Non dichiarato' and 'Altro' options to disinfettante select"
```

---

## TASK 6 — GSAP Removal (Bundle Size)

**Problema (Codex):** GSAP è in `package.json` con 0 import in tutto il codebase. ~300KB di bundle inutile.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json` (auto)

- [ ] **Step 1: Verifica che GSAP non sia importato**

```bash
grep -r "from 'gsap'" src/ --include="*.ts" --include="*.tsx" | wc -l
grep -r "from '@gsap" src/ --include="*.ts" --include="*.tsx" | wc -l
```
Expected: 0 e 0. Se trovi imports, NON procedere con questo task.

- [ ] **Step 2: Rimuovi GSAP**

```bash
npm uninstall gsap @gsap/react 2>/dev/null; npm uninstall gsap 2>/dev/null
```

- [ ] **Step 3: Verifica build**

```bash
npx next build 2>&1 | tail -20
```
Expected: Build completed successfully, nessun warning su GSAP.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): remove unused gsap dependency (~300KB bundle savings)"
```

---

## TASK 7 — Fix Magazzino Anomalia (Codice 243)

**Problema (MEMORY.md):** Articolo codice 243 ha €708.940 di giacenza — errore data entry. Da azzerare.

**Files:**
- Database (Supabase UI o migration)

- [ ] **Step 1: Verifica il record**

Esegui in Supabase SQL editor:
```sql
SELECT id, codice_articolo, nome, scorta_attuale, prezzo_unitario
FROM magazzino
WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
AND scorta_attuale * prezzo_unitario > 100000;
```
Expected: 1 riga con codice 243.

- [ ] **Step 2: Azzera la scorta anomala**

```sql
UPDATE magazzino
SET scorta_attuale = 0, note = 'Anomalia data entry corretta il 2026-05-21'
WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
AND codice_articolo = '243';
```

- [ ] **Step 3: Verifica**

```sql
SELECT codice_articolo, nome, scorta_attuale FROM magazzino
WHERE laboratorio_id = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
AND codice_articolo = '243';
```
Expected: scorta_attuale = 0.

---

## TASK 8 — NEXT_PUBLIC_SUPPORT_PHONE in .env.local

**Problema (MEMORY.md):** Variabile d'ambiente mancante.

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Aggiungi la variabile**

```bash
echo "NEXT_PUBLIC_SUPPORT_PHONE=+39XXXXXXXXXX" >> .env.local
```
Sostituisci con il numero reale di supporto.

- [ ] **Step 2: Aggiungi anche su Vercel**

```bash
npx vercel env add NEXT_PUBLIC_SUPPORT_PHONE production
```
Inserisci il numero quando richiesto.

- [ ] **Step 3: Verifica**

```bash
grep NEXT_PUBLIC_SUPPORT_PHONE .env.local
```
Expected: la riga è presente.

---

## TASK 9 — Soft-Block Consegna su MDR Incompleto

**Problema (FrontDesk + ODontotecnico audit):** Si può consegnare anche se il precheck MDR ha dati incompleti — il warning è solo informativo.

**Files:**
- Modify: `src/components/features/lavori/ConsegnaButton.tsx`
- Modify: `src/components/features/lavori/MaterialiWarningSheet.tsx`

- [ ] **Step 1: Identifica dove si mostra il warning**

In `ConsegnaButton.tsx`, cerca `setShowWarningSheet(true)` o simile. Il warning attualmente mostra una sheet ma permette di proseguire.

- [ ] **Step 2: Aggiungi flag "mdr_incompleto" nel precheck response**

In `src/lib/consegna/precheck.ts`, aggiungi al response object:
```typescript
const mdrIncompleto = !lavoro.tipo_impronte || !lavoro.disinfettante_usato
return {
  ok: materiali_ok && !mdrIncompleto,
  materiali_carenti: [...],
  mdr_incompleto: mdrIncompleto,
  mdr_campi_mancanti: [
    !lavoro.tipo_impronte && 'Tipo impronta',
    !lavoro.disinfettante_usato && 'Disinfettante',
  ].filter(Boolean),
}
```

- [ ] **Step 3: Nel ConsegnaButton, mostra warning specifico per MDR**

Aggiungi nella warning sheet il dettaglio MDR:
```tsx
{data.mdr_incompleto && (
  <div style={{ color: '#D90012', fontWeight: 600, marginBottom: 12 }}>
    ⚠️ Dati MDR incompleti: {data.mdr_campi_mancanti.join(', ')}
    <br />
    <small>Torna alla Tab Accettazione per completarli prima di consegnare.</small>
  </div>
)}
```

Il bottone "Procedi comunque" rimane (non si blocca completamente), ma la dicitura diventa più esplicita:
```tsx
<button onClick={handleForceConsegna}>
  {data.mdr_incompleto ? 'Consegna senza dati MDR completi' : 'Procedi comunque'}
</button>
```

- [ ] **Step 4: Verifica TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/consegna/precheck.ts src/components/features/lavori/ConsegnaButton.tsx
git commit -m "fix(mdr): show explicit MDR incomplete warning before delivery"
```

---

## TASK 10 — Run Full Verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: zero errori.

- [ ] **Step 2: ESLint check**

```bash
npx eslint src/ --ext .ts,.tsx --max-warnings 0
```
Expected: zero warning.

- [ ] **Step 3: Test suite**

```bash
npx vitest run
```
Expected: tutti i test verdi (attualmente 141).

- [ ] **Step 4: Build production**

```bash
npx next build
```
Expected: `Compiled successfully`.

- [ ] **Step 5: Final commit con tag**

```bash
git add -A
git commit -m "chore: Piano A security fixes complete — v1.5.1"
git tag v1.5.1
git push origin main --tags
```

---

## Checklist Manuale (non automatizzabile)

Queste azioni richiedono accesso manuale e non possono essere fatte via codice:

- [ ] **Prorogare trial Filippo** — vai su https://uachelab.com/admin/labs → trova Filippo Opromolla → estendi trial oltre il 31/05/2026
- [ ] **PEC reale** — avvisa Filippo di configurare `/impostazioni/pec` con le sue credenziali SMTP PEC reali
- [ ] **NEXT_PUBLIC_SUPPORT_PHONE su Vercel** — aggiungi la variabile anche nel dashboard Vercel (vedi Task 8)
- [ ] **Test consegna reale** — con Filippo su uachelab.com: crea un lavoro finto, fallo passare tutti gli stati, tappa CONSEGNA, verifica DdC+Fattura generati
- [ ] **FatturaPA XML** — scarica un XML generato e caricalo su https://fatturapa.agenziaentrate.gov.it per validazione
- [ ] **DdC PDF** — stampalo su carta, verifica leggibilità e firma

### Test Manuali Aggiuntivi (con Filippo — da fare in sessione dedicata)

- [ ] **Portale dentista `/portale/[token]`** — genera un token da `/clienti/[id]`, apri il link in un browser separato (in incognito), verifica che il dentista veda i propri lavori, che lo stato sia aggiornato, che non si vedano dati di altri clienti
- [ ] **Sezione Rete `/rete`** — accedi alla pagina, verifica che mostri empty state corretto se non in piano Rete, verifica che il piano Rete PRO sia distinguibile da quello Lab (Stripe price IDs: Lab=`price_1TWCfaRsMhN7mg7YVt0UfeNB`, Rete=`price_1TWCfbRsMhN7mg7YDXKFJkdN`)
- [ ] **Modulo qualità end-to-end** — esegui il percorso completo: `/qualita` → crea nuovo incidente → assegna a un lavoro → verifica che appaia nella lista incidenti → segna come risolto → verifica storico. Controlla che il campo `ministero_segnalazione` (flag MDR obbligatorio) sia visibile e funzionante
- [ ] **PSUR PDF** — vai su `/qualita/psur` → crea un PSUR → scarica il PDF → verifica che contenga: ragione sociale lab, periodo di sorveglianza, numero dispositivi consegnati, incidenti registrati, firma PRRC. Controlla leggibilità su carta e che le sezioni MDR Allegato III §7 siano presenti

---

*Piano A generato il 2026-05-21. Da eseguire PRIMA del Piano B e Piano C.*
