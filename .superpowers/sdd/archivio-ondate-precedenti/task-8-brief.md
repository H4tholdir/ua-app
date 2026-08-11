## Task 8: `PazienteEditSheet` — la via di correzione

**Files:**
- Modify: `src/components/features/pazienti/PazienteEditSheet.tsx:8-31` (props + form), `:144-155` (le caselle)
- Modify: `src/app/(app)/pazienti/[id]/page.tsx` (passare `nome`, `cognome` al componente)
- Test: `tests/unit/PazienteEditSheet.test.tsx` (**nuovo**)

**Interfaces:**
- Consumes: `cognomeEffettivo` (Task 2); `PATCH /api/pazienti/[id]` con `nome`/`cognome` (Task 5).
- Produces: nulla a valle.

⚠️ **Questa pagina è v2.3 legacy** (spec §7): si resta su `motionTokens` da `@/design-system/motion` e sugli stili inline già presenti nel file. **Nessun componente `ds/` v3 qui.**

🛑 **Senza il Task 5 questa schermata è la seconda porta della trappola:** `handleSave` invia l'intero `form` a ogni salvataggio. È il Task 5 a renderla sicura — non invertire l'ordine.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/unit/PazienteEditSheet.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PazienteEditSheet } from '@/components/features/pazienti/PazienteEditSheet'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const BASE = {
  id: 'pz-1',
  codice_paziente: 'PZ-0042',
  nome: null as string | null,
  cognome: null as string | null,
  note: null, anamnesi: null, asl: null, sesso: null, data_nascita: null,
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))) })
afterEach(() => { vi.unstubAllGlobals() })

describe('PazienteEditSheet — correzione di nome e cognome (D9 parte paziente, G4)', () => {
  it('il pannello mostra le caselle Cognome e Nome', async () => {
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagheria', nome: 'Giuseppe' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /modifica/i }))
    expect(screen.getByLabelText(/Cognome/i)).toHaveValue('Bagheria')
    expect(screen.getByLabelText(/^Nome/i)).toHaveValue('Giuseppe')
  })

  it('🛑 il «codice travestito» NON compare nella casella Cognome (inviterebbe a cancellarlo)', async () => {
    // I pazienti creati dal wizard senza nome hanno il CODICE dentro `cognome`.
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'PZ-0042', nome: '' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /modifica/i }))
    expect(screen.getByLabelText(/Cognome/i)).toHaveValue('')
  })

  it('salvare invia nome e cognome nella PATCH', async () => {
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagherra', nome: 'Giuseppe' }} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /modifica/i }))
    await user.clear(screen.getByLabelText(/Cognome/i))
    await user.type(screen.getByLabelText(/Cognome/i), 'Bagheria')
    await user.click(screen.getByRole('button', { name: /salva/i }))

    const [url, opt] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/pazienti/pz-1')
    expect(opt.method).toBe('PATCH')
    expect(JSON.parse(opt.body)).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })
})
```

- [ ] **Step 2: Eseguire e verificare che FALLISCA**

```bash
npx vitest run tests/unit/PazienteEditSheet.test.tsx
```

- [ ] **Step 3: Implementare**

In `src/components/features/pazienti/PazienteEditSheet.tsx`:

```typescript
import { cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'

interface PazienteEditProps {
  paziente: {
    id: string
    codice_paziente: string | null
    nome: string | null
    cognome: string | null
    note: string | null
    anamnesi: string | null
    asl: string | null
    sesso: string | null
    data_nascita: string | null
  }
}
```

```typescript
  const [form, setForm] = useState({
    codice_paziente: paziente.codice_paziente ?? '',
    // `cognomeEffettivo`: sui pazienti creati dal wizard senza nome il CODICE
    // vive dentro `cognome` (invariante 2 della regola §5). Mostrarlo in una
    // casella etichettata «Cognome» inviterebbe a cancellarlo — e cancellarlo
    // è esattamente il gesto che, senza la guardia server (Task 5), bloccava
    // la consegna. Qui lo si nasconde: la casella parte vuota, e se resta
    // vuota il server rimette il codice da sé.
    cognome: cognomeEffettivo(paziente.cognome, paziente.codice_paziente),
    nome: paziente.nome ?? '',
    asl: paziente.asl ?? '',
    sesso: paziente.sesso ?? '',
    data_nascita: paziente.data_nascita ?? '',
    anamnesi: paziente.anamnesi ?? '',
    note: paziente.note ?? '',
  })
```

Aggiungere le due caselle **subito dopo** quella del codice paziente (`:145-154`), con gli stessi `inputStyle`/`labelStyle` del file e `htmlFor`/`id` espliciti (il file usa `<label>` senza associazione: qui serve, per l'accessibilità e per i test):

```tsx
                {/* Cognome + Nome — la via di rettifica (Art. 16 GDPR).
                    Cognome sopra: è la parte che identifica il lavoro. */}
                <div>
                  <label style={labelStyle} htmlFor="paz-cognome">Cognome</label>
                  <input
                    id="paz-cognome"
                    style={inputStyle}
                    value={form.cognome}
                    placeholder="Anche solo un soprannome"
                    onChange={e => setForm(p => ({ ...p, cognome: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="paz-nome">Nome</label>
                  <input
                    id="paz-nome"
                    style={inputStyle}
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>
```

In `src/app/(app)/pazienti/[id]/page.tsx`: aggiungere `nome` e `cognome` alla `select` del paziente e all'oggetto passato a `<PazienteEditSheet paziente={…} />`.

- [ ] **Step 4: Eseguire e verificare che PASSI**

```bash
npx vitest run tests/unit/PazienteEditSheet.test.tsx
```

- [ ] **Step 5: Lint + commit**

```bash
npx eslint src/components/features/pazienti/ "src/app/(app)/pazienti/"
git add src/components/features/pazienti/PazienteEditSheet.tsx "src/app/(app)/pazienti/[id]/page.tsx" tests/unit/PazienteEditSheet.test.tsx
git commit -m "feat(pazienti): cognome e nome correggibili dalla scheda paziente"
```

---

