# Compito 5 — Il campo condiviso impara due cose

> **Questo è il tuo mandato completo.** I valori esatti (nomi, righe, codice) si usano **alla lettera**: sono stati verificati sul codice vero.

## Vincoli globali del progetto (valgono per ogni passo)

- **Ruoli: CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo.
- **RLS:** `public.current_lab_id()`, **mai** `auth.current_lab_id()`.
- **Motion:** solo da token (`src/design-system/v3/motion.ts` per v3). Mai `duration` in linea.
- **Componenti:** superficie v3 → solo da `src/components/ds/`. **Mai** mischiare v3 e v2.3 nella stessa pagina.
- **Testo:** DS v3 §2.3 — niente gergo. «cellulare», «fisso», mai «numero di telefono mobile».
- **PATCH:** sempre **allowlist esplicita**, mai blocklist.
- **Commit:** `feat(ambito): …` / `fix(ambito): …`. Mai `--no-verify` senza motivo scritto nel messaggio.
- **Dopo ogni migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit` (**FASE 6b**).
- **FASE 7 a fine ondata:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`. Tutti e tre.

---


**File:**
- Modifica: `src/components/ds/Campo.tsx:57-95` (`CampoTesto`)
- Crea: `tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx`

**Interfacce:**
- Produce: `CampoTesto` accetta `aiuto?: string` e `inputMode?: 'tel'` — **entrambe opzionali**.

🛑 **`CampoTesto` è usato da 13 schermate.** Dove non si passa nulla, **non deve cambiare niente**.

- [ ] **Passo 1 — Le prove**

```tsx
// tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CampoTesto } from '@/components/ds/Campo'

describe('CampoTesto — aiuto e tastiera (P31, D184)', () => {
  it('senza aiuto non rende nessun testo in piu', () => {
    const { container } = render(<CampoTesto label="Nome" valore="" onCambia={() => {}} />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('con aiuto lo rende, e lo LEGA all-input per chi usa un lettore di schermo', () => {
    render(<CampoTesto label="Cellulare WhatsApp" valore="" onCambia={() => {}}
                       aiuto="Qui arrivano i messaggi di consegna. Dev'essere un cellulare, non il fisso." />)
    const input = screen.getByLabelText('Cellulare WhatsApp')
    const idAiuto = input.getAttribute('aria-describedby')
    expect(idAiuto).toBeTruthy()
    expect(document.getElementById(idAiuto!)?.textContent).toContain('cellulare')
  })

  it('senza inputMode resta come prima: nessun inputMode imposto', () => {
    render(<CampoTesto label="Nome" valore="" onCambia={() => {}} />)
    expect(screen.getByLabelText('Nome').getAttribute('inputmode')).toBeNull()
  })

  // 🔑 Su una PWA da telefono: per un numero deve uscire il tastierino,
  //    non la tastiera delle lettere.
  it('con inputMode tel chiede al telefono il tastierino', () => {
    render(<CampoTesto label="Telefono" valore="" onCambia={() => {}} inputMode="tel" />)
    expect(screen.getByLabelText('Telefono').getAttribute('inputmode')).toBe('tel')
  })
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx
```

Atteso: **2 fallite** (aiuto, inputMode), **2 passate** (i due casi «senza»). 🔑 **Le due che passano
sono la rete di non-regressione per le altre 13 schermate**, e passano *prima* del cambiamento: è
quello che le rende credibili.

- [ ] **Passo 3 — Il componente**

```tsx
export function CampoTesto(props: {
  label: string
  valore: string
  onCambia: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  /** Riga sotto il campo che spiega a che cosa serve (P31, D184). Legata
   *  all'input con `aria-describedby`. Opzionale: senza, non cambia niente
   *  per le 13 schermate che usavano questo campo prima. */
  aiuto?: string
  /** Tastiera da chiedere al telefono. `'tel'` fa uscire il tastierino
   *  numerico: su una PWA da telefono, per un numero, la tastiera delle
   *  lettere è un attrito reale. Stesso motivo per cui `CampoNumero` usa
   *  `inputMode="decimal"`. */
  inputMode?: 'tel'
}) {
  const { label, valore, onCambia, placeholder, autoFocus = false, aiuto, inputMode } = props
  const id = useId()
  const idAiuto = `${id}-aiuto`

  return (
    <div>
      <style>{`
        .ds-campo-testo:focus {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <label htmlFor={id} style={stileLabel}>
        {label}
      </label>
      <input
        id={id}
        className="ds-campo-testo"
        type="text"
        inputMode={inputMode}
        aria-describedby={aiuto ? idAiuto : undefined}
        value={valore}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onCambia(e.target.value)}
        style={stileCampo()}
      />
      {aiuto && (
        <p id={idAiuto} style={stileAiuto}>
          {aiuto}
        </p>
      )}
    </div>
  )
}
```

E lo stile, accanto a `stileLabel`:

```ts
/** L'aiuto sotto un campo. `--muted` e NON `--faint`: dentro un foglio in
 *  tema scuro `--faint` scende a 4,25:1, sotto il 4,5 che WCAG 1.4.3 chiede
 *  a un testo piccolo (è P30-bis, difetto già aperto — qui lo si evita, non
 *  lo si corregge). E non è un messaggio d'errore: mai un colore semantico. */
const stileAiuto: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 13,
  lineHeight: 1.35,
  color: 'var(--muted)',
}
```

- [ ] **Passo 4 — Verde, e le 13 schermate non si accorgono di niente**

```bash
npx vitest run tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx && npx vitest run && npx tsc --noEmit
```

- [ ] **Passo 5 — Salva**

```bash
git add src/components/ds/Campo.tsx tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx
git commit -m "feat(ds): CampoTesto impara l'aiuto e la tastiera del telefono (P31, D184)"
```

---
