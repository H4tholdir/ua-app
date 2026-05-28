# UÀ — Piano Implementazione Design System v2.3

**Creato:** 28/05/2026  
**Spec di riferimento:** `docs/superpowers/specs/2026-05-27-design-system-v2-3.md`  
**Mockup approvato:** `docs/design/mockups/2026-05-27-design-system-v2-3.html`

**Istruzione di avvio:**
```
Implementa il Design System v2.3 seguendo il piano
docs/superpowers/plans/2026-05-28-ds-v2-3-implementation.md.
Inizia da Task 1. Usa superpowers:executing-plans.
```

---

## Obiettivo

Applicare sistematicamente i token DS v2.3 al codebase esistente senza rompere funzionalità.  
Le modifiche sono **visive e CSS only** — zero cambiamenti a logica, DB, API.

**Ambito:** Solo i file che usano i vecchi token t2/t3 e shadow. NON riscrivere componenti funzionanti.

---

## Contesto tecnico

- **Token aggiornati in:** `src/design-system/tokens.ts` (creato), `src/design-system/motion.ts` (aggiornato)
- **CSS variables in:** `src/app/globals.css` — da aggiornare
- **Componenti con stili inline:** usano `color: '#96918D'` hardcoded — da trovare e aggiornare
- **Componenti con shadcn:** usano Tailwind — non toccare (conforme a Design System v2.2+)

---

## Task 1: Aggiorna globals.css — token t2, t3, dark sfc

**File:** `src/app/globals.css`

**Step 1:** Trova e aggiorna la sezione `:root` con i nuovi token:

| Token | Valore precedente | Valore v2.3 |
|-------|-------------------|-------------|
| `--t2` light | `#96918D` | `#4A3D33` |
| `--t3` light | `#B8B3AE` | `#6B5C51` |
| `--t3` dark | `#4A4845` | `#5A5652` |
| `--sfc` dark | `#222019` | `#232018` |

**Step 2:** Aggiunge nella sezione `:root` i colori semantici rainbow se non presenti:
```css
--c-blue:   #3B82F6;
--c-green:  #22C55E;
--c-amber:  #F59E0B;
--c-orange: #F97316;
--c-red:    #EF4444;
--c-purple: #8B5CF6;
```

**Step 3:** Verifica: `npx tsc --noEmit && npx vitest run`

**Commit:** `fix(design-system): aggiorna token t2/t3 a WCAG-compliant, aggiungi rainbow colors`

---

## Task 2: Aggiorna componenti dashboard — KPI colors rainbow

**File:** `src/components/features/dashboard/KpiCard.tsx`

I numeri KPI attualmente usano `--primary` (rosso) o `--gold` per tutti i valori.  
Aggiornare con la semantica corretta:

| KPI | Colore attuale | Colore v2.3 |
|-----|---------------|-------------|
| "In ritardo" | rosso | `#EF4444` (var --c-red) |
| "Da fatturare" | gold | `#22C55E` (var --c-green) |
| "In lavoraz." | default | `#3B82F6` (var --c-blue) |
| "Consegnati oggi" | success | `#22C55E` (var --c-green) |
| "MDR incompleti" | warning | `#F59E0B` (var --c-amber) |
| "Sospesi" | default | `#F59E0B` (var --c-amber) |

**Controlla anche:**
- `DashboardTitolare.tsx` — badge stati lavori
- `DashboardTecnico.tsx` — badge stati
- `DashboardFrontDesk.tsx` — badge stati

**Commit:** `feat(dashboard): KPI rainbow colors — semantica corretta per ogni stato`

---

## Task 3: Badge e stato lavoro — colori semantici

**File:** `src/components/features/lavori/StatoBadge.tsx`

Aggiorna il mapping stato → colore:

```typescript
const statoColor = {
  bozza:        { bg: 'rgba(139,92,246,.12)',  text: '#8B5CF6' },  // purple
  in_lavorazione:{ bg: 'rgba(59,130,246,.12)', text: '#3B82F6' },  // blue
  in_ritardo:   { bg: 'rgba(239,68,68,.12)',   text: '#EF4444' },  // red
  pronto:       { bg: 'rgba(34,197,94,.12)',   text: '#22C55E' },  // green
  in_prova:     { bg: 'rgba(245,158,11,.12)',  text: '#F59E0B' },  // amber
  sospeso:      { bg: 'rgba(245,158,11,.12)',  text: '#F59E0B' },  // amber
  consegnato:   { bg: 'rgba(34,197,94,.12)',   text: '#22C55E' },  // green
  annullato:    { bg: 'rgba(107,92,81,.12)',   text: '#6B5C51' },  // t3
}
```

**Commit:** `feat(lavori): StatoBadge rainbow colors — semantica stato coerente`

---

## Task 4: Aggiorna BottomNavPill — tasto + circolare

**File:** `src/components/layout/BottomNavPill.tsx`

Aggiorna il tab CTA ("Nuovo lavoro") per usare lo stile tasto+ circolare v2.3:

**Light mode:**
```css
background: #EFEEEB;
box-shadow: /* raised circular — from tokens.ts */
  rgba(82,72,62,.28) 0 0 0 1.5px inset,
  rgba(255,255,255,.72) 0 2px 3px inset,
  /* corona via ::before */;
```

**Dark mode:**
```css
background: radial-gradient(circle at 35% 30%, #2E2C2A, #252320, #1E1C1A);
box-shadow:
  0 0 0 7px #181614,
  /* ... */;
```

**Versione CTA rossa** (quando `isCta: true` per `/lavori/nuovo`):
```css
background: radial-gradient(circle at 35% 30%, #D90012, #B8000F, #8A000A);
box-shadow: 0 0 0 7px #6A0008, /* ... */;
```

**Commit:** `feat(nav): BottomNavPill CTA → tasto+ circolare v2.3`

---

## Task 5: Fix t2 hardcoded nei componenti

Cerca tutti i valori hardcoded del vecchio t2 e t3:

```bash
grep -rn "#96918D\|#B8B3AE\|#968D85" src/components/ src/app/ --include="*.tsx" --include="*.ts"
```

Per ogni occorrenza trovata, sostituisci con `var(--t2)` o `var(--t3)`.

**Priorità alta:** componenti usati ad alta frequenza (LavoroCard, AppHeader, PageWrapper)

**Commit:** `fix(design-system): sostituisci t2/t3 hardcoded con CSS variables`

---

## Task 6: Fix gold inutilizzabile — sostituisci con semantica

Cerca tutti gli usi di `--gold` / `#D4A843` come testo:

```bash
grep -rn "gold\|D4A843\|d4a843" src/ --include="*.tsx" --include="*.ts" --include="*.css"
```

Per ogni uso come **testo**: sostituisci con `var(--c-amber)` o `var(--c-green)` in base al contesto.  
Per ogni uso come **accent decorativo** (bordi, icone non-testuali): lascia invariato.

**Commit:** `fix(design-system): rimuovi gold come testo, sostituisci con c-amber/c-green`

---

## Task 7: Verifica finale build + visual audit

```bash
npx tsc --noEmit
npx vitest run
npx next build
```

Verifica visiva:
- Dashboard light: KPI con rainbow colors
- Dashboard dark: stile admin flat, nessun glow
- StatoBadge: colori semantici corretti
- BottomNavPill: tasto+ circolare

**Commit:** `chore(design-system): v2.3 applicato — build verde`

---

## Regole operative per questa sessione

1. **NON riscrivere componenti funzionanti** — modifica solo i token colore e shadow
2. **Dopo ogni Task**: `npx tsc --noEmit` — zero errori prima del commit
3. **Se un componente ha stili complessi**: modifica solo le righe con i vecchi token, non riorganizzare
4. **Dark mode**: verifica sempre sia light che dark dopo ogni modifica
5. **BP-1 obbligatorio** al termine della sessione

---

*Piano creato: 28/05/2026 — Francesco Formicola + Claude*
