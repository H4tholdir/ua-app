# P17 — Lo scarico del contratto che non va a buon fine · Piano di esecuzione

> **Per chi esegue:** un task alla volta, a esecutore fresco (**R-E1**), con revisione fra l'uno e l'altro.
> Nel brief di ogni task va l'istruzione esplicita di **cercare attivamente dove questo piano sbaglia**.
> Un difetto trovato **fuori** dal proprio mandato si **riferisce**, non si corregge di nascosto (**R-E2**).

**Obiettivo:** quando lo scarico del contratto DPA non può riuscire, il titolare lo scopre **prima** di premere
o lo legge **sulla sua pagina** — mai su una schermata di codice.

**Architettura:** tre pezzi con confini dichiarati — un **codice d'errore** leggibile a macchina che nasce
nell'emettitore e arriva al browser · un **blocco d'avviso** di presentazione pura (v2.3, riusabile, non sa
di DPA) · un **tasto vivo** che governa il proprio esito. La pagina resta un componente server e guadagna
due cose: legge il **ruolo** e legge i **dati fiscali del laboratorio**.

**Stack:** Next.js 16 (App Router) · React · TypeScript · vitest + @testing-library/react · **DS v2.3**
(`src/design-system/tokens.ts`) — questa route **non** è migrata a v3.

**Nasce da:** `docs/superpowers/specs/2026-08-02-p17-scarico-dpa-design.md` (spec, passata al piano senza
rilettura per **D163**) · `docs/design/decisions/2026-08-02-p17-scarico-dpa.md` (design, **D157-D162**)

---

## Vincoli globali — valgono per OGNI task

1. 🛑 **DS v2.3, mai v3.** Niente `src/components/ds/*`, niente `src/design-system/v3/*`, niente
   `data-ds="v3"`. I colori si importano da `src/design-system/tokens.ts` o si usano le variabili CSS
   (`var(--t1)`, `var(--primary)`…): **mai un valore inventato**.
2. 🛑 **Ogni testo NUOVO sta su `--t1`.** `misurato`: `--t2` dà **4,45:1** e `--t3` **2,24:1** sul fondo card
   scuro `#232018`, sotto il minimo di 4,5. È **P16**, **deferita da D134** e **non si riapre** — ma un testo
   nuovo non deve nascere col suo difetto.
3. 🛑 **Il colore non è mai l'unica fonte di stato**: ogni blocco porta la sua **icona** e il suo **testo**.
4. 🛑 **Niente attributo `disabled`** su un tasto che si può riattivare: si usa **`aria-disabled="true"`**,
   perché `disabled` toglie l'elemento dalla navigazione da tastiera e dai lettori di schermo.
5. **Bersagli ≥ 44px** di altezza. **Tre viewport**: 390 · 768 · 1280, **chiaro e scuro**.
6. 🛑 **Mai un git worktree.** Si lavora sul ramo `p17-scarico-che-fallisce`, già creato.
7. **Salvataggio:** mai `git add -A`; `git commit -F <file>` col messaggio **fuori dal repo**.
8. **Il numero dei test invecchia:** ci si fida dell'**output**, non di un numero scritto qui.

---

## Struttura dei file

| file | responsabilità |
|---|---|
| 🆕 `src/lib/pdf/permessi-dpa.ts` | **l'unico** elenco dei ruoli che possono emettere. Oggi vive solo dentro la rotta: la pagina ne ha bisogno, e due copie divergono |
| `src/lib/pdf/errori-dpa.ts` | la classe d'errore guadagna un **codice** leggibile a macchina, unione chiusa |
| `src/lib/pdf/generate-dpa.ts` | **solo** i 4 `throw` che ora devono passare il codice. Nessun'altra riga |
| `src/app/api/clienti/[id]/dpa/route.ts` | mette il codice nel corpo JSON; usa l'elenco condiviso dei ruoli |
| 🆕 `src/components/feedback/BloccoAvviso.tsx` | presentazione pura v2.3: tipo, titolo, testo, azione facoltativa. **Non sa di DPA** — è il pezzo che l'ondata della firma erediterà (**D162**) |
| 🆕 `src/components/features/clienti/ScaricaDpaButton.tsx` | il tasto vivo: stati, richiesta, **nome del file**, mappatura codice → messaggio |
| `src/app/(app)/clienti/[id]/page.tsx` | legge ruolo e dati fiscali del laboratorio, monta il tasto, rende i **tre** casi dell'ultima emissione |
| 🆕 `tests/unit/BloccoAvviso.test.tsx` · 🆕 `tests/unit/ScaricaDpaButton.test.tsx` · 🆕 `tests/unit/errori-dpa-codice.test.ts` | le prove |

---

## Task 0 — Provare le assunzioni PRIMA di costruirci sopra

> 🔑 **Perché è un task e non un preambolo:** la spec dichiara **quattro** assunzioni **NON provate**. Se **A1**
> è falsa, il Task 3 cambia forma. Provarle dopo significa scoprirlo a lavoro fatto.
> 🛑 **Le sonde sono usa e getta e NON si committano.**

**File:** nessuno modificato. Sonde in `scripts/tmp/` (già ignorato da git).

- [ ] **Passo 1 — A1: `Content-Disposition` è leggibile da `fetch` di pari origine?**

Serve l'app accesa e una sessione vera (le credenziali sono in `.env.local`, **D103**: non si chiede il
permesso, e si usa il link d'accesso monouso — mai digitare una password in un campo).

Con l'app in esecuzione, nella console del browser sulla scheda di un dentista:

```js
const r = await fetch(location.pathname.replace('/clienti/', '/api/clienti/') + '/dpa')
console.log(r.status, JSON.stringify(r.headers.get('content-disposition')))
```

**Atteso:** `200 "attachment; filename=\"DPA-2026-….pdf\""` — **incollare l'output vero nel referto.**
**Se è `null`:** A1 è falsa → la rotta deve aggiungere
`'Access-Control-Expose-Headers': 'Content-Disposition'`, e il Task 1 se ne fa carico. **Fermarsi e riferire.**

- [ ] **Passo 2 — A3: il predicato è `&&`, non `||`**

```bash
sed -n '76,85p' src/lib/pdf/generate-dpa.ts
```

**Atteso:** `if (!lab.partita_iva && !lab.codice_fiscale)` — cioè **basta uno dei due** perché l'emissione
proceda. **Incollare le righe.** Questo valore governa il caso di prova più importante del Task 3.

- [ ] **Passo 3 — chi altro chiama questa rotta?**

```bash
grep -rn "clienti/.*\/dpa\|/dpa'" src/ --include="*.tsx" --include="*.ts" | grep -v "api/clienti"
```

**Atteso:** solo `src/app/(app)/clienti/[id]/page.tsx:329`. **Incollare il numero di occorrenze.**
Se ce ne sono altre, il campo aggiunto al corpo JSON va verificato anche lì (è un'aggiunta, quindi
retro-compatibile, ma l'elenco dei chiamanti non lo decide chi scrive).

- [ ] **Passo 4 — scrivere gli esiti nel referto del task**, con gli output incollati. Nessun commit.

---

## Task 1 — Il codice d'errore, dall'emettitore al browser

**File:**
- 🆕 Crea: `src/lib/pdf/permessi-dpa.ts`
- Modifica: `src/lib/pdf/errori-dpa.ts` (la classe, in fondo al file)
- Modifica: `src/lib/pdf/generate-dpa.ts:81,84,124,125` (i 4 `throw`)
- Modifica: `src/app/api/clienti/[id]/dpa/route.ts:22,69-71`
- 🆕 Test: `tests/unit/errori-dpa-codice.test.ts`

**Interfacce prodotte** (i task dopo si appoggiano a questi nomi esatti):
```ts
export type CodiceDatiDpa = 'LAB_DATI_FISCALI' | 'CLIENTE_DATI_FISCALI' | 'LAB_ASSENTE' | 'CLIENTE_ASSENTE'
export class ErroreDatiDpa extends Error { readonly stato: 404 | 422; readonly codice: CodiceDatiDpa }
export const RUOLI_EMISSIONE_DPA: readonly string[]   // da permessi-dpa.ts
export function puoEmettereDpa(ruolo: string | null | undefined): boolean
```
Il corpo d'errore della rotta diventa `{ error: string, codice?: CodiceDatiDpa }`.

- [ ] **Passo 1 — Scrivere il test che fallisce**

🆕 `tests/unit/errori-dpa-codice.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { ErroreDatiDpa } from '../../src/lib/pdf/errori-dpa'
import { RUOLI_EMISSIONE_DPA, puoEmettereDpa } from '../../src/lib/pdf/permessi-dpa'

describe('ErroreDatiDpa — il codice viaggia con l\'errore', () => {
  it('porta il codice accanto allo stato', () => {
    const e = new ErroreDatiDpa('DPA: cliente privo di Partita IVA e Codice Fiscale', 422, 'CLIENTE_DATI_FISCALI')
    expect(e.stato).toBe(422)
    expect(e.codice).toBe('CLIENTE_DATI_FISCALI')
  })

  it('resta un Error vero (instanceof regge oltre il transpile)', () => {
    const e = new ErroreDatiDpa('x', 404, 'CLIENTE_ASSENTE')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(ErroreDatiDpa)
    expect(e.name).toBe('ErroreDatiDpa')
  })
})

describe('permessi-dpa — l\'elenco dei ruoli sta in UN posto solo', () => {
  it('ammette i tre ruoli della rotta, e nessun altro', () => {
    expect([...RUOLI_EMISSIONE_DPA].sort()).toEqual(['admin_rete', 'admin_sistema', 'titolare'])
  })

  // 🛑 Il vincolo si prova con un valore che DEVE essere rifiutato (R-P1).
  it.each(['tecnico', 'front_desk', 'admin', '', null, undefined])(
    'rifiuta %s', (ruolo) => {
      expect(puoEmettereDpa(ruolo as string | null | undefined)).toBe(false)
    },
  )

  it.each(['titolare', 'admin_rete', 'admin_sistema'])('ammette %s', (ruolo) => {
    expect(puoEmettereDpa(ruolo)).toBe(true)
  })
})
```

- [ ] **Passo 2 — Eseguirlo e verificare che fallisca**

```bash
npx vitest run tests/unit/errori-dpa-codice.test.ts
```
**Atteso:** FALLISCE su `Failed to resolve import ".../permessi-dpa"`.
🛑 **Il rosso da «modulo non trovato» non prova che il test provi qualcosa** (**R-P4**): si va al passo 3.

- [ ] **Passo 3 — Abbozzo INERTE e conteggio delle asserzioni**

🆕 Creare `src/lib/pdf/permessi-dpa.ts` con un abbozzo che **non fa il lavoro**:

```ts
export const RUOLI_EMISSIONE_DPA = [] as const
export function puoEmettereDpa(_ruolo: string | null | undefined): boolean {
  return true   // INERTE — di proposito sbagliato
}
```

Rieseguire e **CONTARE quante asserzioni si accendono**. **Atteso: 10 su 13** — falliscono l'elenco (1) e i
sei rifiuti (6), passano i tre `ammette` (che l'abbozzo indovina per caso) e le tre di `ErroreDatiDpa`, che
questo abbozzo non tocca. **Scrivere il numero vero nel referto.** Se se ne accendono meno di 7, i test sono
più deboli di quanto sembrano: **fermarsi e riferire.**

- [ ] **Passo 4 — L'implementazione vera**

🆕 `src/lib/pdf/permessi-dpa.ts`:

```ts
import 'server-only'

/** 🔑 Chi può EMETTERE un DPA — l'unico elenco, e per questo sta qui.
 *  Fino al 02/08/2026 viveva solo dentro `api/clienti/[id]/dpa/route.ts:22`,
 *  e la scheda cliente non lo conosceva affatto: mostrava il tasto a tutti
 *  (P17/D158). Due copie di un elenco di permessi divergono — è già successo
 *  in questo progetto con `admin_sistema`, che mancava da un elenco «completo»
 *  pur essendo usato 15 volte.
 *  🛑 I ruoli del sistema sono CINQUE (`titolare`, `tecnico`, `front_desk`,
 *  `admin_rete`, `admin_sistema`): qui ne stanno TRE, e `admin` nudo NON
 *  esiste in banca dati. La fonte autoritativa è il CHECK su `public.utenti.ruolo`. */
export const RUOLI_EMISSIONE_DPA = ['titolare', 'admin_rete', 'admin_sistema'] as const

export function puoEmettereDpa(ruolo: string | null | undefined): boolean {
  return ruolo != null && (RUOLI_EMISSIONE_DPA as readonly string[]).includes(ruolo)
}
```

In `src/lib/pdf/errori-dpa.ts`, sostituire **solo** la classe in fondo (il commento sopra resta):

```ts
/** I quattro cammini che NON sono guasti del servizio, nominati.
 *  🛑 Unione CHIUSA di proposito: il compilatore obbliga ogni `throw` a
 *  scegliere da che parte sta. È lo stesso meccanismo di `emesso_da` in P7 —
 *  il rumore lo fa `tsc`, non la memoria di chi scrive.
 *  🔑 Serve perché i due 422 (`LAB_DATI_FISCALI` e `CLIENTE_DATI_FISCALI`)
 *  portano l'utente in DUE POSTI DIVERSI a rimediare, e distinguerli dal
 *  TESTO del messaggio sarebbe la mappa fragile che questo file dichiara
 *  poco sopra di aver evitato — solo spostata di un piano più su. */
export type CodiceDatiDpa =
  | 'LAB_DATI_FISCALI'
  | 'CLIENTE_DATI_FISCALI'
  | 'LAB_ASSENTE'
  | 'CLIENTE_ASSENTE'

export class ErroreDatiDpa extends Error {
  /** 404 = il dato a cui la richiesta punta non c'è.
   *  422 = il dato c'è ma non basta per emettere. */
  readonly stato: 404 | 422
  /** 🛑 OBBLIGATORIO: senza, il browser non sa dove mandare a rimediare. */
  readonly codice: CodiceDatiDpa

  constructor(message: string, stato: 404 | 422, codice: CodiceDatiDpa) {
    super(message)
    this.name = 'ErroreDatiDpa'
    this.stato = stato
    this.codice = codice
  }
}
```

- [ ] **Passo 5 — Contare gli errori di compilazione, e SOLO ADESSO**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```
**Atteso: 4** — i quattro `throw new ErroreDatiDpa` di `generate-dpa.ts` (`:81` `:84` `:124` `:125`), che ora
hanno un argomento in meno.
⚠️ **Il numero conta SOLO dopo aver messo il terzo parametro obbligatorio.** Prima è **0**, e chi si aspetta 4
troppo presto va a caccia di un difetto che non c'è.

- [ ] **Passo 6 — Passare il codice ai quattro `throw`**

In `src/lib/pdf/generate-dpa.ts`, **solo** queste quattro righe:

```ts
// :81
throw new ErroreDatiDpa('DPA: laboratorio privo di Partita IVA e Codice Fiscale', 422, 'LAB_DATI_FISCALI')
// :84
throw new ErroreDatiDpa('DPA: cliente privo di Partita IVA e Codice Fiscale', 422, 'CLIENTE_DATI_FISCALI')
// :124
if (!labRaw) throw new ErroreDatiDpa('Laboratorio non trovato', 404, 'LAB_ASSENTE')
// :125
if (!clienteRaw) throw new ErroreDatiDpa('Cliente non trovato', 404, 'CLIENTE_ASSENTE')
```

- [ ] **Passo 7 — La rotta espone il codice e usa l'elenco condiviso**

In `src/app/api/clienti/[id]/dpa/route.ts`, riga 22 — sostituire l'elenco letterale:

```ts
import { puoEmettereDpa } from '@/lib/pdf/permessi-dpa'
// …
if (!puoEmettereDpa(context.ruolo)) {
  return NextResponse.json({ error: 'Non autorizzato — solo titolari' }, { status: 403 })
}
```

E righe 69-71 — il corpo guadagna il codice:

```ts
if (e instanceof ErroreDatiDpa) {
  // 📌 `codice` è un'AGGIUNTA: chi legge solo `error` continua a funzionare.
  //    Serve al browser per sapere DOVE mandare a rimediare, senza diramare
  //    sul testo italiano del messaggio.
  return NextResponse.json({ error: e.message, codice: e.codice }, { status: e.stato })
}
```

- [ ] **Passo 8 — Verde e verifica**

```bash
npx vitest run tests/unit/errori-dpa-codice.test.ts
npx tsc --noEmit
```
**Atteso:** 13 passate · `tsc` **0 errori**.

- [ ] **Passo 9 — Salvare**

```bash
git add src/lib/pdf/permessi-dpa.ts src/lib/pdf/errori-dpa.ts src/lib/pdf/generate-dpa.ts src/app/api/clienti/[id]/dpa/route.ts tests/unit/errori-dpa-codice.test.ts
git commit -F <messaggio fuori dal repo>
```

---

## Task 2 — Il blocco d'avviso (presentazione pura, v2.3, riusabile)

**File:**
- 🆕 Crea: `src/components/feedback/BloccoAvviso.tsx`
- 🆕 Test: `tests/unit/BloccoAvviso.test.tsx`

**Interfacce consumate:** nessuna. **Interfacce prodotte:**
```tsx
export type TipoAvviso = 'attesa' | 'guasto'
export function BloccoAvviso(props: {
  tipo: TipoAvviso
  titolo: string
  testo: string
  azione?: { etichetta: string; href: string } | { etichetta: string; onClick: () => void }
}): React.ReactElement
```

> 🔑 **Perché non sa di DPA (D162):** è il pezzo che l'ondata della firma a distanza erediterà. Se conoscesse
> il contratto, quell'ondata lo riscriverebbe.
> ⚠️ **Segue il modo di casa** (`TracciabilitaMaterialiBanner.tsx`), **con una correzione**: quel precedente usa
> `--t2` per il corpo, che in modo scuro fallisce. Qui **tutto su `--t1`** (vincolo globale 2).

- [ ] **Passo 1 — Il test che fallisce**

🆕 `tests/unit/BloccoAvviso.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BloccoAvviso } from '../../src/components/feedback/BloccoAvviso'

describe('BloccoAvviso — il blocco che dice cosa non va e cosa fare', () => {
  it('annuncia il contenuto alle tecnologie assistive', () => {
    render(<BloccoAvviso tipo="attesa" titolo="Manca un dato" testo="Serve la Partita IVA." />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('rende titolo e testo', () => {
    render(<BloccoAvviso tipo="attesa" titolo="Manca un dato" testo="Serve la Partita IVA." />)
    expect(screen.getByText('Manca un dato')).toBeInTheDocument()
    expect(screen.getByText('Serve la Partita IVA.')).toBeInTheDocument()
  })

  it('senza azione non rende nessun elemento premibile', () => {
    render(<BloccoAvviso tipo="guasto" titolo="Rotto" testo="Riprova più tardi." />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('con azione a collegamento rende un link col suo indirizzo', () => {
    render(
      <BloccoAvviso tipo="attesa" titolo="T" testo="X"
        azione={{ etichetta: 'Completa i dati', href: '/impostazioni' }} />,
    )
    expect(screen.getByRole('link', { name: 'Completa i dati' })).toHaveAttribute('href', '/impostazioni')
  })

  it('con azione a pressione chiama la funzione', () => {
    const premuto = vi.fn()
    render(<BloccoAvviso tipo="guasto" titolo="T" testo="X" azione={{ etichetta: 'Riprova', onClick: premuto }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(premuto).toHaveBeenCalledTimes(1)
  })

  // 🛑 Il colore non è mai l'unica fonte di stato: ogni tipo porta la sua icona.
  it('ogni tipo porta un\'icona propria, non solo un colore', () => {
    const { container: attesa } = render(<BloccoAvviso tipo="attesa" titolo="T" testo="X" />)
    const { container: guasto } = render(<BloccoAvviso tipo="guasto" titolo="T" testo="X" />)
    expect(attesa.querySelector('svg')).not.toBeNull()
    expect(guasto.querySelector('svg')).not.toBeNull()
    expect(attesa.querySelector('svg')?.innerHTML).not.toBe(guasto.querySelector('svg')?.innerHTML)
  })

  // 🛑 Nessun testo nuovo su --t2/--t3: fallirebbero WCAG in modo scuro (P16).
  it('non usa --t2 né --t3 per il testo', () => {
    const { container } = render(<BloccoAvviso tipo="attesa" titolo="T" testo="X" />)
    expect(container.innerHTML).not.toContain('var(--t2')
    expect(container.innerHTML).not.toContain('var(--t3')
  })
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/BloccoAvviso.test.tsx
```
**Atteso:** FALLISCE su import non risolto.

- [ ] **Passo 3 — Abbozzo inerte e conteggio**

```tsx
export type TipoAvviso = 'attesa' | 'guasto'
export function BloccoAvviso(_props: { tipo: TipoAvviso; titolo: string; testo: string; azione?: unknown }) {
  return <div />   // INERTE
}
```
Rieseguire e **contare**. **Atteso: 5 su 7** (passano «senza azione niente di premibile» e il controllo sui
token, che un `<div/>` vuoto soddisfa per caso — ed è esattamente il motivo per cui si conta). **Scrivere il
numero vero.**

- [ ] **Passo 4 — L'implementazione**

🆕 `src/components/feedback/BloccoAvviso.tsx`:

```tsx
'use client'

// UÀ — BloccoAvviso (DS v2.3)
// Il blocco che dice CHE COSA non va e CHE COSA si può fare. Presentazione
// pura: non sa di DPA, di contratti né di documenti — è ciò che lo rende
// ereditabile dall'ondata della firma a distanza (D162).
//
// 🛑 v2.3 e non v3: le superfici che lo usano oggi non sono migrate, e i due
//    sistemi non si mischiano MAI nella stessa pagina (DS v3 §14).
// 🛑 Ogni testo su `--t1`: `--t2` (4,45:1) e `--t3` (2,24:1) falliscono WCAG
//    sul fondo card scuro. È P16, deferita da D134 — ma un testo NUOVO non
//    deve nascere col difetto che si è scelto di rimandare.
// ⚠️ Il precedente di casa (`TracciabilitaMaterialiBanner`) usa `--t2` per il
//    corpo: qui si segue il suo impianto, NON quel colore.

import type { ReactElement } from 'react'

export type TipoAvviso = 'attesa' | 'guasto'

type Azione =
  | { etichetta: string; href: string }
  | { etichetta: string; onClick: () => void }

interface Props {
  /** `attesa` = manca un dato, l'utente può rimediare · `guasto` = si è rotto qualcosa di nostro */
  tipo: TipoAvviso
  titolo: string
  testo: string
  azione?: Azione
}

const COLORE: Record<TipoAvviso, { bordo: string; fondo: string }> = {
  attesa: { bordo: 'var(--amber, #F59E0B)', fondo: 'rgba(245, 158, 11, 0.14)' },
  guasto: { bordo: 'var(--primary, #D90012)', fondo: 'rgba(217, 0, 18, 0.10)' },
}

function Icona({ tipo }: { tipo: TipoAvviso }) {
  // Due disegni DIVERSI, non lo stesso in due colori: il colore non deve mai
  // essere l'unica fonte di stato (chi non lo distingue vede comunque la forma).
  return tipo === 'attesa' ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: '1px' }}>
      <path d="M8 1.5L15 14H1L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6.2v3.4M8 11.6v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: '1px' }}>
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const stileAzione = {
  display: 'inline-flex',
  alignItems: 'center',
  height: '34px',
  marginTop: '8px',
  padding: '0 12px',
  borderRadius: '8px',
  border: '1px solid var(--t3, #6B5C51)',
  background: 'transparent',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12.5px',
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
} as const

export function BloccoAvviso({ tipo, titolo, testo, azione }: Props): ReactElement {
  const colore = COLORE[tipo]
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        borderRadius: '10px',
        padding: '10px 12px',
        margin: '10px 0 0',
        borderLeft: `3px solid ${colore.bordo}`,
        background: colore.fondo,
        color: colore.bordo,
      }}
    >
      <Icona tipo={tipo} />
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12.5px', lineHeight: 1.5, color: 'var(--t1, #1C1916)' }}>
        <strong style={{ display: 'block', fontWeight: 700, marginBottom: '2px' }}>{titolo}</strong>
        {testo}
        {azione && (
          <div>
            {'href' in azione ? (
              <a href={azione.href} style={stileAzione}>{azione.etichetta}</a>
            ) : (
              <button type="button" onClick={azione.onClick} style={stileAzione}>{azione.etichetta}</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Passo 5 — Verde**

```bash
npx vitest run tests/unit/BloccoAvviso.test.tsx
```
**Atteso:** 7 passate.

- [ ] **Passo 6 — Salvare**

---

## Task 3 — Il tasto vivo

**File:**
- 🆕 Crea: `src/components/features/clienti/ScaricaDpaButton.tsx`
- 🆕 Test: `tests/unit/ScaricaDpaButton.test.tsx`

**Interfacce consumate:** `BloccoAvviso` (Task 2) · `CodiceDatiDpa` (Task 1).
**Interfacce prodotte:**
```tsx
export function ScaricaDpaButton(props: {
  clienteId: string
  /** `null` = i dati fiscali ci sono. Altrimenti: di chi mancano. */
  mancanza: 'laboratorio' | 'cliente' | null
}): React.ReactElement
```

> 🛑 **IL NOME DEL FILE È UN REQUISITO, non un dettaglio.** Passando a `fetch`, il browser smette di onorare
> `Content-Disposition`: senza rileggerlo in JavaScript il file si salva con un nome inventato.
> **Disferebbe il Task 8 del 01/08 (`c1a1145d`)**, dove due emissioni dello stesso dentista, a un anno di
> distanza e con testi diversi, arrivavano con lo **stesso nome**.
> ⚠️ **Il precedente in casa NON aiuta:** `PacchettoConsegnaSheet.tsx:264` **si fabbrica il nome a mano**.
> `provato:` 14 occorrenze di `content-disposition` in `src/`, **nessuna** lato client.

- [ ] **Passo 1 — Il test che fallisce**

🆕 `tests/unit/ScaricaDpaButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScaricaDpaButton } from '../../src/components/features/clienti/ScaricaDpaButton'

function rispostaOk(nomeFile = 'DPA-2026-0007.pdf') {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-disposition': `attachment; filename="${nomeFile}"` }),
    blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
  } as unknown as Response
}
function rispostaErrore(status: number, corpo: unknown) {
  return {
    ok: false,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => corpo,
  } as unknown as Response
}

describe('ScaricaDpaButton', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    // jsdom non implementa createObjectURL
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:finto'),
      revokeObjectURL: vi.fn(),
    }))
  })
  afterEach(() => vi.unstubAllGlobals())

  // ── prevenzione ───────────────────────────────────────────────────────────
  it('con i dati completi il tasto è premibile', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    expect(screen.getByRole('button', { name: /Scarica DPA PDF/i })).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('se mancano i dati del CLIENTE il tasto è inerte e dice dove rimediare', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="cliente" />)
    expect(screen.getByRole('button', { name: /Scarica DPA PDF/i })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/studio/i)
  })

  it('se mancano i dati del LABORATORIO l\'azione porta alle impostazioni', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="laboratorio" />)
    expect(screen.getByRole('link', { name: /Completa i dati/i })).toHaveAttribute('href', '/impostazioni')
  })

  // 🛑 `disabled` toglierebbe il tasto dalla navigazione da tastiera: vietato.
  it('il tasto inerte NON usa l\'attributo disabled', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="cliente" />)
    expect(screen.getByRole('button', { name: /Scarica DPA PDF/i })).not.toBeDisabled()
  })

  it('premere un tasto inerte non chiama la rotta', () => {
    render(<ScaricaDpaButton clienteId="cli-1" mancanza="cliente" />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(fetch).not.toHaveBeenCalled()
  })

  // ── il nome del file ──────────────────────────────────────────────────────
  it('IL NOME DEL FILE viene dal Content-Disposition, non inventato', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaOk('DPA-2026-0042.pdf'))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    const ancora = click.mock.instances[0] as HTMLAnchorElement
    expect(ancora.download).toBe('DPA-2026-0042.pdf')
    click.mockRestore()
  })

  it('se il Content-Disposition manca usa un nome di ripiego, non uno inventato dal browser', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true, status: 200, headers: new Headers({}),
      blob: async () => new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    } as unknown as Response)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('contratto-dpa.pdf')
    click.mockRestore()
  })

  // ── gli esiti ─────────────────────────────────────────────────────────────
  it('sul 500 mostra il guasto CON un riprova', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(500, { error: 'DPA: archivio non raggiungibile' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non è stato possibile/i)
    expect(screen.getByRole('button', { name: /Riprova/i })).toBeInTheDocument()
  })

  // 🛑 Un «Riprova» che non può funzionare insegna a ignorare i tasti.
  it('sul 401 NON offre un riprova', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(401, { error: 'Non autorizzato' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/sessione/i)
    expect(screen.queryByRole('button', { name: /Riprova/i })).toBeNull()
  })

  it('sul 403 NON offre un riprova', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(403, { error: 'Non autorizzato — solo titolari' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Riprova/i })).toBeNull()
  })

  // 🔑 I due 422 si distinguono dal CODICE, mai dal testo italiano.
  it('il 422 del laboratorio manda alle impostazioni', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(422, { error: 'x', codice: 'LAB_DATI_FISCALI' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('link', { name: /Completa i dati/i })).toHaveAttribute('href', '/impostazioni')
  })

  it('il 422 del cliente NON manda alle impostazioni', async () => {
    vi.mocked(fetch).mockResolvedValue(rispostaErrore(422, { error: 'x', codice: 'CLIENTE_DATI_FISCALI' }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/studio/i)
    expect(screen.queryByRole('link', { name: /Completa i dati/i })).toBeNull()
  })

  // A4: il corpo può NON essere JSON (pagina d'errore della piattaforma, 502 del bordo).
  it('se il corpo non è JSON non si rompe', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false, status: 502, headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => { throw new SyntaxError('Unexpected token <') },
    } as unknown as Response)
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/non è stato possibile/i)
  })

  it('se la rete cade non si rompe', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/connessione|non è stato possibile/i)
  })

  it('mentre prepara il tasto è inerte e lo dice', async () => {
    let sblocca: (r: Response) => void = () => {}
    vi.mocked(fetch).mockReturnValue(new Promise<Response>((res) => { sblocca = res }))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    fireEvent.click(screen.getByRole('button', { name: /Scarica DPA PDF/i }))
    expect(await screen.findByText(/Preparo il documento/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Preparo il documento/i })).toHaveAttribute('aria-disabled', 'true')
    sblocca(rispostaOk())
  })

  it('due pressioni rapide chiamano la rotta UNA volta sola', async () => {
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(() => {}))
    render(<ScaricaDpaButton clienteId="cli-1" mancanza={null} />)
    const tasto = screen.getByRole('button', { name: /Scarica DPA PDF/i })
    fireEvent.click(tasto)
    fireEvent.click(tasto)
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  })
})
```

- [ ] **Passo 2 — Rosso, poi abbozzo inerte e conteggio**

```bash
npx vitest run tests/unit/ScaricaDpaButton.test.tsx
```
Poi l'abbozzo:
```tsx
export function ScaricaDpaButton(_props: { clienteId: string; mancanza: 'laboratorio' | 'cliente' | null }) {
  return <button type="button">Scarica DPA PDF</button>   // INERTE
}
```
**Contare le asserzioni che si accendono. Atteso: 14 su 16** (passano «tasto premibile coi dati completi» e
«non usa disabled», che l'abbozzo soddisfa per caso). **Scrivere il numero vero.**

- [ ] **Passo 3 — L'implementazione**

🆕 `src/components/features/clienti/ScaricaDpaButton.tsx`:

```tsx
'use client'

// UÀ — ScaricaDpaButton (P17, DS v2.3)
// Il tasto che scarica il contratto DPA, e che sa raccontare perché non ci
// riesce. Prima era un `<a href>` nudo: premerlo era una NAVIGAZIONE, quindi
// un errore della rotta finiva a schermo come `{"error":"…"}` — titolo vuoto,
// zero elementi premibili, e in una PWA installata nemmeno un «indietro».

import { useCallback, useState } from 'react'
import { BloccoAvviso } from '@/components/feedback/BloccoAvviso'
import { hapticLight } from '@/lib/feedback/haptic'

const NOME_DI_RIPIEGO = 'contratto-dpa.pdf'

interface Props {
  clienteId: string
  /** `null` = i dati fiscali ci sono. Altrimenti di chi mancano — lo sa la
   *  pagina, che li ha già letti entrambi: così il titolare non prova nemmeno. */
  mancanza: 'laboratorio' | 'cliente' | null
}

type Esito = { titolo: string; testo: string; riprova: boolean; vaiAImpostazioni: boolean }

/** 🛑 Il nome del file viene SEMPRE dal server, mai costruito qui.
 *  `generate-dpa.ts` lo ricava dal numero progressivo, che è il nome VERO del
 *  documento — quello scritto nel registro e stampato dentro il PDF. Un nome
 *  costruito dal browser tornerebbe al difetto già pagato: due emissioni dello
 *  stesso dentista, a un anno di distanza, con lo stesso nome. */
function nomeDaHeader(intestazione: string | null): string {
  if (!intestazione) return NOME_DI_RIPIEGO
  // `filename="X"` oppure `filename=X`; RFC 5987 (`filename*=`) qui non serve —
  // i nostri nomi sono ASCII (DPA-AAAA-NNNN.pdf) — ma se arrivasse si ricade
  // sul ripiego invece di produrre spazzatura.
  const conApici = /filename="([^"]+)"/i.exec(intestazione)
  if (conApici?.[1]) return conApici[1]
  const nudo = /filename=([^;]+)/i.exec(intestazione)
  return nudo?.[1]?.trim() || NOME_DI_RIPIEGO
}

/** Dal codice/stato al messaggio. 🔑 MAI dal testo del messaggio: sarebbe la
 *  mappa fragile che `errori-dpa.ts` dichiara di aver evitato, un piano più su. */
function esitoDa(stato: number, codice: unknown): Esito {
  if (stato === 401) {
    return { titolo: 'Sessione scaduta', testo: 'Rientra e riprova: la tua sessione non è più valida.', riprova: false, vaiAImpostazioni: false }
  }
  if (stato === 403) {
    return { titolo: 'Non puoi emettere questo documento', testo: 'Il contratto lo emette il titolare del laboratorio.', riprova: false, vaiAImpostazioni: false }
  }
  if (codice === 'LAB_DATI_FISCALI') {
    return { titolo: 'Mancano i dati del tuo laboratorio', testo: 'Senza Partita IVA il contratto non si può emettere per nessuno studio.', riprova: false, vaiAImpostazioni: true }
  }
  if (codice === 'CLIENTE_DATI_FISCALI') {
    return { titolo: 'Manca un dato dello studio', testo: 'Per emettere il contratto serve la Partita IVA o il Codice Fiscale del dentista.', riprova: false, vaiAImpostazioni: false }
  }
  if (codice === 'CLIENTE_ASSENTE') {
    return { titolo: 'Questo studio non risulta più', testo: 'Potrebbe essere stato cancellato. Torna all\'elenco dei dentisti.', riprova: false, vaiAImpostazioni: false }
  }
  return { titolo: 'Non è stato possibile preparare il documento', testo: 'Non dipende dai tuoi dati. Se succede di nuovo, segnalacelo.', riprova: true, vaiAImpostazioni: false }
}

const MANCANZA: Record<'laboratorio' | 'cliente', Esito> = {
  laboratorio: esitoDa(422, 'LAB_DATI_FISCALI'),
  cliente: esitoDa(422, 'CLIENTE_DATI_FISCALI'),
}

const stileTasto = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '44px',
  padding: '0 18px',
  borderRadius: '10px',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 700,
  fontSize: '14px',
  border: 0,
} as const

export function ScaricaDpaButton({ clienteId, mancanza }: Props) {
  const [inCorso, setInCorso] = useState(false)
  const [esito, setEsito] = useState<Esito | null>(null)

  const scarica = useCallback(async () => {
    // Due pressioni rapide devono chiamare la rotta UNA volta: ogni emissione
    // lascia una riga nel registro.
    if (inCorso || mancanza) return
    hapticLight()
    setInCorso(true)
    setEsito(null)
    try {
      const risposta = await fetch(`/api/clienti/${clienteId}/dpa`)
      if (!risposta.ok) {
        // A4: il corpo può NON essere JSON (pagina d'errore della piattaforma).
        let codice: unknown = null
        try {
          codice = (await risposta.json())?.codice ?? null
        } catch {
          codice = null
        }
        setEsito(esitoDa(risposta.status, codice))
        return
      }
      const blob = await risposta.blob()
      const nome = nomeDaHeader(risposta.headers.get('content-disposition'))
      const url = URL.createObjectURL(blob)
      const ancora = document.createElement('a')
      ancora.href = url
      ancora.download = nome
      document.body.appendChild(ancora)
      ancora.click()
      ancora.remove()
      URL.revokeObjectURL(url)
    } catch {
      setEsito({ titolo: 'Non è stato possibile preparare il documento', testo: 'Controlla la connessione e riprova.', riprova: true, vaiAImpostazioni: false })
    } finally {
      setInCorso(false)
    }
  }, [clienteId, inCorso, mancanza])

  const inerte = Boolean(mancanza) || inCorso
  const mostrato = mancanza ? MANCANZA[mancanza] : esito

  return (
    <>
      <button
        type="button"
        onClick={scarica}
        // 🛑 `aria-disabled`, NON `disabled`: quest'ultimo toglierebbe il tasto
        //    dalla navigazione da tastiera e dai lettori di schermo, proprio
        //    quando accanto c'è il messaggio che spiega come rimediare.
        aria-disabled={inerte || undefined}
        style={{
          ...stileTasto,
          background: inCorso ? 'var(--t3, #6B5C51)' : mancanza ? 'transparent' : 'var(--primary, #D90012)',
          color: mancanza ? 'var(--t1, #1C1916)' : '#fff',
          border: mancanza ? '1px solid var(--t3, #6B5C51)' : 0,
          boxShadow: inerte ? 'none' : 'var(--sh-red)',
          cursor: inCorso ? 'progress' : mancanza ? 'not-allowed' : 'pointer',
        }}
      >
        {inCorso ? (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" strokeOpacity=".35" />
              <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Preparo il documento…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v8M5 8l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Scarica DPA PDF
          </>
        )}
      </button>

      {mostrato && (
        <BloccoAvviso
          tipo={mostrato.riprova ? 'guasto' : 'attesa'}
          titolo={mostrato.titolo}
          testo={mostrato.testo}
          azione={
            mostrato.vaiAImpostazioni
              ? { etichetta: 'Completa i dati del laboratorio', href: '/impostazioni' }
              : mostrato.riprova
                ? { etichetta: 'Riprova', onClick: () => void scarica() }
                : undefined
          }
        />
      )}
    </>
  )
}
```

- [ ] **Passo 4 — Verde**

```bash
npx vitest run tests/unit/ScaricaDpaButton.test.tsx
npx tsc --noEmit
```
**Atteso:** 16 passate · `tsc` 0.

- [ ] **Passo 5 — Salvare**

---

## Task 4 — La pagina: ruolo, dati del laboratorio, le tre righe

**File:**
- Modifica: `src/app/(app)/clienti/[id]/page.tsx` (import · `:165-186` · `:312-368`)

**Interfacce consumate:** `ScaricaDpaButton` (Task 3) · `BloccoAvviso` (Task 2) · `puoEmettereDpa` (Task 1).

- [ ] **Passo 1 — La lettura in più, in PARALLELO**

🛑 `getLabContext()` **non** porta i dati fiscali: `provato:` `lab-context.ts:19` →
`lab: { stato, trial_ends_at, nome } | null`. Serve leggerli, e **mai in fila** con l'altra query (A2).

Sostituire il blocco `:165-174` con:

```ts
  const [{ data: emissioneRaw, error: erroreRegistro }, { data: labFiscale }] = await Promise.all([
    svc
      .from('data_processing_agreements')
      .select('numero_dpa, emesso_at')
      .eq('laboratorio_id', context.laboratorioId)
      .eq('dentista_id', c.id)
      .not('numero_dpa', 'is', null)
      .is('deleted_at', null)
      .order('emesso_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // 🔑 I dati fiscali del laboratorio NON stanno nel contesto (lab-context.ts:19
    //    porta solo stato, trial_ends_at e nome): senza questa lettura la scheda
    //    non può sapere in anticipo che l'emissione fallirà, e il titolare di un
    //    laboratorio senza Partita IVA lo scoprirebbe premendo — su OGNI dentista.
    svc
      .from('laboratori')
      .select('partita_iva, codice_fiscale')
      .eq('id', context.laboratorioId)
      .maybeSingle(),
  ])
```

- [ ] **Passo 2 — Il predicato di prevenzione, identico a quello dell'emettitore**

Dopo il blocco della data (`:196-200`), aggiungere:

```ts
  // 🛑 `&&` e non `||`, IDENTICO a validateDpaData (generate-dpa.ts:80,83):
  //    ne basta UNO dei due perché l'emissione proceda. Con `||` il tasto si
  //    spegnerebbe su clienti che emetterebbero benissimo.
  const mancaLab = !labFiscale?.partita_iva && !labFiscale?.codice_fiscale
  const mancaCliente = !c.partita_iva && !c.codice_fiscale
  const mancanzaDpa: 'laboratorio' | 'cliente' | null = mancaLab ? 'laboratorio' : mancaCliente ? 'cliente' : null

  // D158: chi non può emettere non vede il tasto — non lo vede SPENTO, non lo
  // vede affatto. Fino al 02/08/2026 questa pagina non guardava il ruolo, unica
  // fra le undici che lo guardano: un tecnico vedeva un tasto che per lui non
  // si sarebbe acceso MAI, e premendolo riceveva un 403 in JSON a schermo.
  const puoEmettere = puoEmettereDpa(context.ruolo)
```

Import da aggiungere in testa:
```ts
import { puoEmettereDpa } from '@/lib/pdf/permessi-dpa'
import { ScaricaDpaButton } from '@/components/features/clienti/ScaricaDpaButton'
import { BloccoAvviso } from '@/components/feedback/BloccoAvviso'
```

- [ ] **Passo 3 — Il riquadro: tasto condizionato e TRE righe invece di due**

Sostituire il corpo del riquadro «Privacy — GDPR» (`:313-368`):

```tsx
        <SectionCard title="Privacy — GDPR">
          <div style={{ padding: '12px 0' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--t2)', marginBottom: '10px', lineHeight: 1.5 }}>
              Accordo di Responsabile del Trattamento (DPA) ex Art. 28 GDPR — da firmare con lo studio dentistico.
            </p>

            {/* D160: a chi non può emettere resta TUTTO tranne il tasto. Chi sta
                al banco deve poter rispondere allo studio al telefono («sì,
                risulta emesso il 12 marzo») senza poterlo riemettere. */}
            {puoEmettere && <ScaricaDpaButton clienteId={c.id} mancanza={mancanzaDpa} />}

            {/* 🛑 TRE casi, non due. Prima, se il registro non si leggeva, la riga
                spariva — identica a «mai emesso». Sono fatti opposti: uno dice
                «ho letto e non c'è», l'altro «non sono riuscito a leggere», e
                confonderli può far riemettere un contratto che esiste già. */}
            {erroreRegistro ? (
              <BloccoAvviso
                tipo="attesa"
                titolo="Non riesco a leggere il registro"
                testo="Il contratto potrebbe essere già stato emesso: questa riga non fa fede."
              />
            ) : ultimaEmissione?.numero_dpa && dataUltimaEmissione ? (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t2)', marginTop: '6px' }}>
                Ultima emissione: <strong>{ultimaEmissione.numero_dpa}</strong> — {dataUltimaEmissione}
              </p>
            ) : (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t2)', marginTop: '6px' }}>
                Non ancora emesso per questo studio.
              </p>
            )}

            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t3)', marginTop: '6px' }}>
              {puoEmettere
                ? 'Stampa e firma in duplice copia con lo studio: una copia al laboratorio, una allo studio. Ogni versione emessa resta conservata da UÀ.'
                : 'Il contratto lo emette il titolare. Ogni versione emessa resta conservata da UÀ.'}
            </p>
          </div>
        </SectionCard>
```

⚠️ **`--t2`/`--t3` restano SOLO sulle righe che c'erano già** (P16, deferita da D134): non si aggiunge testo
nuovo su quei token, e non si «corregge» qui ciò che è stato deferito.

- [ ] **Passo 4 — Verifica**

```bash
npx tsc --noEmit && npx vitest run && npx next build
```
**Atteso:** 0 · tutte verdi · uscita 0. ⚠️ `tsc` **non** valida la firma degli handler di rotta: i tre comandi
sono tre, e nessuno sostituisce l'altro.

- [ ] **Passo 5 — Salvare**

---

## Task 5 — Collaudo dal vivo, FASE 9b e chiusura

**File:** nessuno modificato — referti in `docs/design/audit-ui-ux/` e `docs/design/screenshots/`.

- [ ] **Passo 1 — Collaudo dal vivo (D103)**

Accesso col link monouso (mai digitare una password):
```bash
npx tsx scripts/tmp/link-accesso.ts <email> /clienti/<id>
```
Percorrere: ① dati completi → scarica, **e verificare il NOME del file salvato** (deve essere
`DPA-AAAA-NNNN.pdf`) · ② cliente senza dati fiscali → tasto inerte · ③ i tre casi della riga.

- [ ] **Passo 2 — FASE 9b: gate estetico L2**

Micro-audit della **sola** superficie contro `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md`, ai tre
viewport × chiaro/scuro, con scatti **prima/dopo** in `docs/design/screenshots/2026-08-02-p17/`.
🛑 **Obbligatorio prima di unire** — è una pagina in produzione, e questo cancello è già stato saltato una
volta su questa stessa superficie (04/08).

- [ ] **Passo 3 — FASE 7 per intero, output incollato**

```bash
npx tsc --noEmit ; npx vitest run ; npx next build
```

- [ ] **Passo 4 — BP-1**

Aggiornare `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md`: **P17 si dichiara chiusa SOLO se tutte
le prove sono verdi**, altrimenti si scrive «eseguita in parte» **col motivo**, come per P7.

- [ ] **Passo 5 — I ritrovamenti fuori mandato (R-E2), in UNA sezione dell'handoff**

Già noto e da riferire, **non** da correggere qui:
- **`PacchettoConsegnaSheet.tsx:264`** si fabbrica i nomi dei file a mano invece di leggere l'intestazione:
  possono divergere dai nomi che le rotte dichiarano.
- **I numeri di riga nei commenti** di `errori-dpa.ts` e `route.ts` (`:106`, `:159`, `:182`…) **non
  corrispondono più** alle righe vere (`:115`, `:168`, `:191`…): il file è cresciuto e i riferimenti no.

---

## Autorevisione del piano

**Copertura della spec:** §5 ① → Task 3 · §5 ② → Task 1 · §5 ③ → Task 2 · le tre righe → Task 4 · §4
assunzioni → Task 0 · §6 forme d'input → tutte in Task 1-3 · §7 FASE 3 → nessuna migration, quindi niente
FASE 6b · FASE 9b → Task 5.
**Segnaposto:** nessuno — ogni passo porta il codice o il comando vero.
**Coerenza dei nomi:** `ScaricaDpaButton`, `BloccoAvviso`, `puoEmettereDpa`, `RUOLI_EMISSIONE_DPA`,
`CodiceDatiDpa`, `mancanza`, `esitoDa`, `nomeDaHeader` — usati identici in tutti i task.
**Buco noto e dichiarato:** il caso ⑦c (registro illeggibile) **non ha un test unitario** — è un componente
server, e in questo repo non ci sono prove di componenti server. Si verifica **a mano** nel Task 5, passo 1.
