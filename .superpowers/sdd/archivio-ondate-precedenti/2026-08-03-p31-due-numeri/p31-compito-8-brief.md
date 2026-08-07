# Compito 8 — Il tasto che chiede il numero (D183 · **D185**)

> **Questo è il tuo mandato completo.** I valori esatti si usano **alla lettera**.

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


⛔ **Non iniziare senza l'approvazione del compito 6.**

🔄 **ALLARGATO il 03/08 da D185.** Il foglio non serve solo alla consegna: lo montano **quattro**
schermate. Quindi **nasce condiviso**, e vive in `src/components/features/clienti/` — è un pezzo di
**anagrafica**, non di consegna.

| # | dove | che cosa cambia |
|---|---|---|
| ① | `FrameConsegnato.tsx:123` | la consegna (D183) |
| ② | `EstrattoContoView.tsx:224` | sollecito globale dell'estratto conto |
| ③ | `EstrattoContoView.tsx:38` (`DovutoBottomSheet`) | sollecito su un singolo dovuto |
| ④ | `ScadenzarioList.tsx:85` | sollecito dall'elenco |

🛑 **Il compito 4 ha reso quei tre tasti dello scadenzario condizionati a `cellulare_whatsapp`:** oggi
**spariscono** se il numero manca. D185 dice che devono **restare e chiedere**. Quindi in ognuno dei tre
il gate va **rimosso** e sostituito con la stessa scelta fra tasto-che-apre-WhatsApp e
tasto-che-chiede-il-numero già descritta al passo 4.

⚠️ **Ognuno dei quattro punti ha già l'id del cliente sottomano?** `provato:` **no** per la consegna —
è il motivo del passo 6.1 (`ConsegnaResult.cliente_id`). Per i tre dello scadenzario **verificalo prima
di scrivere**: se un punto non ce l'ha, **fermati e riferisci** invece di risalirlo con una chiamata in
più.

**File:**
- Crea: `src/components/features/clienti/ChiediCellulareSheet.tsx` *(condiviso — **non** in `consegna-v3/`)*
- Modifica: `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx:123`
- Crea: `tests/unit/consegna-chiede-il-cellulare.test.tsx`

**Interfacce:**
- Consuma: `ConsegnaResult.cliente_id` (compito 4); `CampoTesto` con `aiuto`/`inputMode` (compito 5);
  `PATCH /api/clienti/[id]` con `cellulare_whatsapp` (compito 3).

- [ ] **Passo 1 — Le prove**

```tsx
// tests/unit/consegna-chiede-il-cellulare.test.tsx
describe('D183 — se il cellulare manca, il tasto lo chiede e lo salva', () => {
  it('col cellulare presente il tasto apre WhatsApp e NON chiede niente', async () => {
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/393331234567?text=x' }} />)
    await userEvent.click(screen.getByRole('link', { name: /invia messaggio whatsapp/i }))
    expect(screen.queryByLabelText('Cellulare WhatsApp')).not.toBeInTheDocument()
  })

  it('senza cellulare il tasto CI SIA LO STESSO e apra il foglio', async () => {
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' }} />)
    const tasto = screen.getByRole('button', { name: /invia messaggio whatsapp/i })
    expect(tasto).toBeInTheDocument()
    await userEvent.click(tasto)
    expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
  })

  // 🔑 IL VINCOLO DI D183: si salva PRIMA di aprire WhatsApp.
  it('salva il numero PRIMA di aprire WhatsApp', async () => {
    const ordine: string[] = []
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      ordine.push('salvato'); return new Response('{}', { status: 200 })
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => { ordine.push('whatsapp'); return null })
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' }} />)
    await userEvent.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await userEvent.click(screen.getByRole('button', { name: /salva e invia/i }))
    expect(ordine).toEqual(['salvato', 'whatsapp'])
    expect(fetchSpy.mock.calls[0][0]).toContain(`/api/clienti/${esitoBase.cliente_id}`)
  })

  // 🔑 IL VALORE CHE DEVE ESSERE RIFIUTATO: se il salvataggio fallisce,
  //    WhatsApp NON si apre — o si separano i due fatti.
  it('se il salvataggio fallisce, WhatsApp NON si apre e lo dice', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }))
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    render(<FrameConsegnato esito={{ ...esitoBase, whatsapp_url: 'https://wa.me/?text=x' }} />)
    await userEvent.click(screen.getByRole('button', { name: /invia messaggio whatsapp/i }))
    await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
    await userEvent.click(screen.getByRole('button', { name: /salva e invia/i }))
    expect(openSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx
```

Atteso: **1 passata** (col cellulare, comportamento di oggi), **3 fallite**.

- [ ] **Passo 3 — Il foglio**

```tsx
// src/components/features/clienti/ChiediCellulareSheet.tsx
'use client'
import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'

/**
 * D183 — alla consegna il cellulare WhatsApp può mancare. Il tasto non muore:
 * chiede il numero, lo salva in anagrafica, POI apre WhatsApp.
 *
 * 🛑 L'ORDINE È VINCOLANTE. Salvare dopo l'invio separa due fatti che devono
 * restare insieme: la consegna successiva richiederebbe lo stesso numero.
 */
export function ChiediCellulareSheet(props: {
  aperto: boolean
  clienteId: string
  onChiudi: () => void
  onSalvato: (cellulare: string) => void
}) {
  const { aperto, clienteId, onChiudi, onSalvato } = props
  const [cellulare, setCellulare] = useState('')
  const [invio, setInvio] = useState(false)
  const [guasto, setGuasto] = useState(false)

  async function salvaEInvia() {
    if (!cellulare.trim()) return
    setInvio(true); setGuasto(false)
    try {
      const res = await fetch(`/api/clienti/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellulare_whatsapp: cellulare.trim() }),
      })
      if (!res.ok) { setGuasto(true); setInvio(false); return }
      onSalvato(cellulare.trim())
    } catch {
      setGuasto(true); setInvio(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Manca il cellulare">
      <CampoTesto
        label="Cellulare WhatsApp"
        valore={cellulare}
        onCambia={setCellulare}
        placeholder="333 1234567"
        inputMode="tel"
        aiuto="Lo salvo nell'anagrafica del dentista: la prossima volta non te lo chiedo più."
        autoFocus
      />
      {guasto && (
        <p role="alert" style={{ margin: '10px 0 0', fontSize: 14.5, color: 'var(--red)' }}>
          Non sono riuscita a salvare il numero. Riprova.
        </p>
      )}
      <TastoPrimario onClick={salvaEInvia} disabled={invio || !cellulare.trim()}
                     motivoDisabilitato={invio ? 'Un attimo…' : 'Scrivi il cellulare'}>
        Salva e invia
      </TastoPrimario>
    </Sheet>
  )
}
```

⚠️ **Verifica le firme vere di `Sheet` e `TastoPrimario` prima di scrivere** (`src/components/ds/`): se
non combaciano, **si adatta questo codice**, non i componenti.

- [ ] **Passo 4 — `FrameConsegnato` sceglie fra tasto e foglio**

Riga 123. Il segnale che il cellulare manca è **nell'URL**: `https://wa.me/?text=…` senza cifre.

```tsx
const senzaDestinatario = esito.whatsapp_url.startsWith('https://wa.me/?')
```

```tsx
        <div style={{ marginTop: spazio.m, display: 'flex', justifyContent: 'center' }}>
          {senzaDestinatario ? (
            <TastoWhatsAppChiede onClick={() => setChiediAperto(true)} />
          ) : (
            <TastoWhatsApp waUrl={esito.whatsapp_url}>Invia messaggio WhatsApp</TastoWhatsApp>
          )}
        </div>
```

E il foglio, accanto a `DialogConferma`:

```tsx
      <ChiediCellulareSheet
        aperto={chiediAperto}
        clienteId={esito.cliente_id}
        onChiudi={() => setChiediAperto(false)}
        onSalvato={(cell) => {
          setChiediAperto(false)
          const numero = numeroPerWhatsapp(cell)
          const testo = esito.whatsapp_url.split('?text=')[1] ?? ''
          window.open(`https://wa.me/${numero}?text=${testo}`, '_blank', 'noopener,noreferrer')
        }}
      />
```

🛑 **`TastoWhatsApp` è un collegamento e rifiuta un `waUrl` che non comincia con `https://wa.me/`** (v.
il suo commento di sicurezza): per questo il caso «manca il numero» usa un **tasto**, non un
collegamento. Se `TastoWhatsAppChiede` non esiste, **si usa `TastoPrimario` con lo stesso testo** —
non si allenta il controllo di `TastoWhatsApp`.

- [ ] **Passo 5 — Verde, e FASE 7 intera**

```bash
npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx && npx tsc --noEmit && npx vitest run && npx next build
```

- [ ] **Passo 6 — Salva**

```bash
git add src/components/features/lavori/consegna-v3 tests/unit/consegna-chiede-il-cellulare.test.tsx
git commit -m "feat(consegna): P31/D183 — il tasto WhatsApp chiede il cellulare che manca e lo salva PRIMA di inviare"
```

---
