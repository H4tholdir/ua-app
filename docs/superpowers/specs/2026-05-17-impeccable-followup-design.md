# Piano: Impeccable Follow-up — 3 Feature Rimanenti

**Data**: 2026-05-17
**Contesto**: Dopo audit impeccable completo (detect 0, audit 17/20, critique 26/40), restano 3 feature aperte che richiedono implementazione nuova, non solo fix.

---

## Phase 0: Findings da Documentation Discovery (già eseguita)

### Allowed APIs e Pattern Confermati

**Supabase lista lavori** — `src/app/(app)/lavori/page.tsx:63-87`:
```typescript
let query = svc.from('lavori')
  .select('id, numero_lavoro, stato, ..., paziente_nome_snapshot, cliente:clienti(id, nome, cognome, studio_nome)')
  .eq('laboratorio_id', labId)
  .is('deleted_at', null)
  .order('data_consegna_prevista', { ascending: true })
  .limit(200)
```
La ricerca `q` è già nell'API route (`src/app/api/lavori/route.ts:60`) ma non nella page server.

**Consegna orchestration** — `src/lib/consegna/orchestrate.ts:191-218`:
Aggiorna `lavori`: `stato → consegnato`, `conformato`, `data_consegna_effettiva`, `consegna_completata_at` + crea `dichiarazioni_conformita` + `buoni_consegna` + draft `fatture`.

**Token CSS residui** — `src/app/globals.css`:
- Definiti: `--primary #D90012`, `--success #16A34A`
- Mancanti: `--gold #D4A843` (32 occorrenze), `--amber #FD7E14` (15 occorrenze)

---

## Feature 1: Ricerca Full-Text Lista Lavori

**Nielsen H7 Flexibility: 1/4 → 3/4**

### Descrizione
Aggiungere una search bar nella pagina `/lavori` che filtri per `numero_lavoro`, `paziente_nome_snapshot`, e `studio_nome/cliente`. La ricerca è server-side via searchParams Next.js (nessun client-side filtering).

### Phase 1.1 — Aggiornare la query server nella page

**File**: `src/app/(app)/lavori/page.tsx`

Aggiungere `q` ai searchParams e applicarlo alla query:
```typescript
// Aggiungere ai params della Page:
const q = searchParams?.q ?? ''

// Dopo la costruzione della query base, aggiungere:
if (q.trim()) {
  const term = `%${q.trim()}%`
  query = query.or(
    `numero_lavoro.ilike.${term},paziente_nome_snapshot.ilike.${term},descrizione.ilike.${term}`
  )
}
```

Pattern OR Supabase: `.or('field1.ilike.%term%,field2.ilike.%term%')`.
Riferimento: `src/app/api/lavori/route.ts:60` (pattern ILIKE esistente da copiare).

**Verifica**: con `?q=corona`, la query deve filtrare per numero/paziente/descrizione.

### Phase 1.2 — Aggiungere la SearchBar UI

**File da creare**: `src/components/features/lavori/LavoriSearchBar.tsx`

Componente client che usa `useRouter` + `useSearchParams` per aggiornare `?q=`:
```typescript
'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'

// Input neumorphico con shadow --ua-sh-i (inset)
// Debounce 300ms prima di aggiornare la URL
// Mostra spinner durante isPending (useTransition)
// Placeholder: "Cerca lavoro, paziente o dentista..."
```

**Posizione nell'UI**: tra AppHeader e i filtri stato, padding `0 20px 12px`.

Pattern da seguire per stile input: `src/app/globals.css:.ua-inp` (outline none, shadow inset, DM Sans 16px).

**Anti-pattern da evitare**:
- NON filtrare client-side (fetch i 200 + filtra in JS) — farlo server-side via URL
- NON usare `useState` + `useEffect` con timer manuale — usare `useDebouncedCallback` da `use-debounce` (già in package.json)
- NON usare `router.push` con full reload — usare `router.replace` per non aggiungere history

### Phase 1.3 — Aggiungere count/feedback

Mostrare `"N lavori trovati"` sotto la barra se `q` è attivo. Usare il campo `length` dell'array già disponibile.

### Checklist Verifica Feature 1
- [ ] `?q=test` sulla page filtra correttamente i lavori
- [ ] Typing nella barra aggiorna la URL dopo 300ms debounce
- [ ] Con `?q=` vuoto mostra tutti i lavori
- [ ] Il filtro stato e la ricerca funzionano insieme (`?q=corona&stato=pronto`)
- [ ] TypeScript 0 errori
- [ ] `npx impeccable detect src/` exit 0

---

## Feature 2: Annulla Consegna (Grace Period 5 min)

**Nielsen H3 User Control: 2/4 → 3/4**

### Approccio scelto: Grace Period invece di Undo istantaneo

La consegna crea DdC PDF, buono, e draft fattura. Un undo vero richiederebbe rollback di S3/storage. La soluzione pragmatica: finestra di annullamento di 5 minuti durante la quale il laboratorio può tornare allo stato `pronto`.

**Non implementare**: undo istantaneo (toast 5sec) — la consegna genera documenti PDF e notifiche che non possono essere "annullate" in 5 secondi.

### Phase 2.1 — API endpoint annulla-consegna

**File da creare**: `src/app/api/lavori/[id]/annulla-consegna/route.ts`

```typescript
// POST /api/lavori/[id]/annulla-consegna
// Vincoli:
// 1. stato === 'consegnato'
// 2. data_consegna_effettiva entro 5 minuti (NOW() - data_consegna_effettiva < interval '5 minutes')
// 3. RLS: stessa laboratorio_id

// Operazioni:
// 1. Aggiornare lavori: stato → 'pronto', conformato → false, data_consegna_effettiva → null,
//    consegna_completata_at → null, consegna_in_corso → false
// 2. Aggiornare dichiarazioni_conformita: stato → 'annullata' (se esiste campo stato)
// 3. NON toccare i PDF già generati (rimangono come artefatti storici)
// 4. NON toccare la fattura draft (rimane come draft)
```

Pattern da seguire per la struttura route: `src/app/api/lavori/[id]/consegna/route.ts`.

**Anti-pattern**:
- NON usare service role per la verifica — usare il client utente con RLS
- NON esporre la logica di annullamento senza vincolo temporale

### Phase 2.2 — UI nella pagina consegnato

**File**: `src/app/(app)/lavori/[id]/page.tsx`

Dopo il fetch del lavoro, se `stato === 'consegnato'` e `data_consegna_effettiva` è entro 5 minuti:
- Mostrare un banner neumorphico con countdown `"Puoi annullare la consegna entro X:XX"`
- Pulsante "Annulla consegna" che chiama `POST /api/lavori/[id]/annulla-consegna`
- Dopo l'annullamento: `router.refresh()` per ricaricare i dati

```typescript
// Componente client per il countdown:
'use client'
// Calcola secondsRemaining = 300 - (Date.now() - new Date(data_consegna_effettiva).getTime()) / 1000
// Aggiorna ogni secondo con setInterval
// Nasconde il banner quando secondsRemaining <= 0
```

**Pattern timer**: usare `useEffect` con `setInterval` e cleanup. Nessun effetto globale.

### Phase 2.3 — Aggiornare il tipo StatoLavoro (se necessario)

Verificare che la transizione `consegnato → pronto` sia ammessa dal tipo. Se il tipo `StatoLavoro` è un enum/union, non richiede modifiche (entrambi gli stati esistono).

### Checklist Verifica Feature 2
- [ ] POST entro 5 minuti: ritorna 200, lavoro torna a `pronto`
- [ ] POST dopo 5 minuti: ritorna 400 con messaggio chiaro
- [ ] Banner visibile nella pagina dettaglio lavoro consegnato entro i 5 min
- [ ] Countdown aggiorna in tempo reale
- [ ] Dopo annullamento: stato torna a `pronto` e banner sparisce
- [ ] TypeScript 0 errori

---

## Feature 3: Completare Migrazione Token CSS

**Theming P2 — riduce hex hardcoded da 152 a ~50**

### Phase 3.1 — Aggiungere `--gold` e `--amber` ai CSS vars

**File**: `src/app/globals.css`

Nella sezione `:root` (linee 59-73), aggiungere dopo `--success`:
```css
--gold:    #D4A843;  /* CTA cerimoniale: CONSEGNA, firma DdC */
--amber:   #FD7E14;  /* Warning MDR: PSUR mancante, rischi */
--purple:  #7C3AED;  /* STL non assegnati */
```

Dark mode (sezione `.dark`, linee 137-196): questi colori non cambiano in dark mode (invarianti semantici), quindi non aggiungere varianti dark.

### Phase 3.2 — Sostituzione globale via sed

```bash
cd src && find . -name "*.tsx" -not -path "*/node_modules/*" | xargs sed -i '' \
  "s/'#D4A843'/'var(--gold, #D4A843)'/g; \
   s/'#FD7E14'/'var(--amber, #FD7E14)'/g; \
   s/'#7C3AED'/'var(--purple, #7C3AED)'/g"
```

**Anti-pattern**: NON sostituire hex dentro i valori CSS shadow/gradient (i rgba non sono token).

### Phase 3.3 — Verifica

Dopo la sostituzione:
```bash
grep -r "'#D4A843'\|'#FD7E14'\|'#7C3AED'" src/ --include="*.tsx" | wc -l
# Atteso: 0
npx tsc --noEmit  # 0 errori
npx impeccable detect src/  # exit 0
```

### Checklist Verifica Feature 3
- [ ] `--gold`, `--amber`, `--purple` definiti in `:root`
- [ ] 0 occorrenze di `'#D4A843'`, `'#FD7E14'`, `'#7C3AED'` nei TSX
- [ ] TypeScript 0 errori
- [ ] detect exit 0

---

## Phase 4: Verifica Finale Integrata

Dopo tutte e 3 le feature:

```bash
cd ua-app

# 1. TypeScript
npx tsc --noEmit

# 2. Anti-pattern scan
npx impeccable detect src/

# 3. Ricerca funziona
# Aprire /lavori?q=test nel browser e verificare filtro

# 4. Token completi
grep -r "'#D4A843'\|'#FD7E14'\|'#D90012'" src/ --include="*.tsx" | grep -v "var(--" | wc -l
# Atteso: 0 o vicino allo 0

# 5. Build production
npm run build
```

**Score atteso post-feature**:
- Audit tecnico: 17/20 → **18/20**
- Critique heuristic: 26/40 → **30/40** (H3 +1, H7 +2, H4 +1)

---

## Note Aggiuntive

### Fix urgente: Deploy Vercel token scaduto

Il CD `25984261828` fallisce con: `"The token provided via --token argument is not valid"`.

**Soluzione** (2 minuti):
1. vercel.com → Settings → Tokens → "Create Token" (scope: Full Account)
2. github.com/H4tholdir/ua-app → Settings → Secrets and variables → Actions → `VERCEL_TOKEN` → Update

### Ordine consigliato di esecuzione

1. **Feature 3 prima** (15 min) — è il refactor più semplice e a zero rischi
2. **Feature 1** (45 min) — aggiunge valore immediato agli utenti
3. **Feature 2** (90 min) — la più complessa, richiede test attento dell'orchestrazione consegna
