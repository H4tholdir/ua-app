# Wizard «Nuovo lavoro» — Ondata (a): il dato esiste e non si perde più

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare in casa il modello dati per-dente (denti + colore), renderlo scrivibile in modo atomico e isolato per tenant, e spostarci sopra i due scrittori esistenti **senza cambiare un pixel**.

**Architettura:** una tabella nuova `lavori_denti` (una riga per dente, `fdi smallint` con vincolo strutturale a 52 codici) più una tabella di riferimento non-tenant `colori_dentali`. La scrittura passa **solo** da due RPC `SECURITY DEFINER` (le tabelle sono in `REVOKE ALL`, anche per `service_role`), esposte da un endpoint dedicato `PUT /api/lavori/[id]/denti` e da un `POST /api/lavori` reso atomico. Le 5 vecchie colonne diventano **sentinelle** nello stesso deploy, e i due scrittori odierni (`crea-lavoro.ts`, `TabClinica.tsx`) vengono reindirizzati a grafica invariata.

**Tech stack:** Next.js 16 App Router · TypeScript strict · Supabase PostgreSQL + RLS + PL/pgSQL · vitest.

**Spec ratificata:** `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md` (§12 = questa ondata)
**Verbale (fonte di ogni «W*n*»):** `docs/design/decisions/2026-07-27-wizard-nuovo-lavoro-brainstorming.md`

---

## Global Constraints

- **RLS:** sempre `public.current_lab_id()` — MAI `auth.current_lab_id()` (non esiste in questo schema).
- **`service_role` va nel `REVOKE`** di ogni tabella nuova: in questo repo un `SET LOCAL ROLE service_role; DELETE` cross-tenant **è già stato riprodotto davvero** (nota E8, `20260721090000_parete_cassette.sql:126-137`).
- **Ogni RPC `SECURITY DEFINER`:** `SET search_path = public, pg_temp` + `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE … TO service_role`.
- **Mai `BEGIN;`/`COMMIT;` dentro una migration** — il runner Supabase la avvolge già; un COMMIT interno la chiuderebbe prima della registrazione (N6, verificato).
- **Chiamata a una RPC dalla route:** `callRpcWithRetry(() => svc.rpc(...))` di `src/lib/supabase/rpc-retry.ts`, che vuole una **thunk ri-invocabile**. MAI `void svc.rpc(...)` (thenable pigro), MAI solo `try/catch` (postgrest non lancia: si controlla `error`).
- **PATCH API: allowlist esplicita, MAI blocklist.**
- **Nessun cambiamento visivo in questa ondata.** Se un task tocca un pixel, il task è sbagliato.
- **Pre-commit:** `npx eslint src/` prima di ogni commit (`tsc` non vede un import inutilizzato e il gate è `--max-warnings=0`).
- **Branch nel repo principale**, mai worktree (nel worktree il dev server non parte: doppio `package-lock.json` → tutte le route 404).
- **Commit format:** `feat(lavori): …` / `fix(db): …`
- 🔑 **Il rosso da «modulo non trovato» NON prova che il test provi qualcosa** (scoperto eseguendo il Task 2). Un test vuoto produce lo stesso errore. Dove il piano dichiara `Atteso: FAIL — Failed to resolve import`, **quello è solo il primo rosso**: prima di scrivere l'implementazione vera, metti un abbozzo che restituisce sempre `null` (o l'equivalente inerte) e guarda **quanti** test si accendono. Se se ne accendono pochi, il test è debole lì. Nel Task 2 quattro asserzioni su sette passavano contro una funzione che non faceva nulla.

---

## File Structure

| File | Responsabilità |
|---|---|
| `src/lib/domain/denti-fdi-dominio.ts` | **Creare.** L'insieme dei 52 codici FDI validi + quadrante derivato. Pura, senza React, importabile da route e da UI. |
| `src/components/features/odontogramma/denti-fdi.ts` | **Modificare.** Il campo `quadrante` smette di essere un dato scritto a mano e si deriva. |
| `src/lib/domain/colore-dente.ts` | **Creare.** La precedenza riga→caso (§3.2 spec), **scritta una volta sola** perché wizard, scheda e DdC ne leggano una sola. |
| `supabase/migrations/20260727120000_lavori_denti.sql` | **Creare.** `UNIQUE (id, laboratorio_id)` + `colori_dentali` + seed. |
| `supabase/migrations/20260727120100_lavori_denti_tabella.sql` | **Creare.** `lavori_denti` + RLS + REVOKE/GRANT. |
| `supabase/migrations/20260727120200_lavori_colore_caso.sql` | **Creare.** Colonne su `lavori` + `DROP COLUMN` W23 + `admin_delete_laboratorio`. |
| `supabase/migrations/20260727120300_lavori_denti_rpc.sql` | **Creare.** Le due RPC atomiche. |
| `src/app/api/lavori/[id]/denti/route.ts` | **Creare.** `PUT` a sostituzione integrale, validazione 422, 409 su concorrenza. |
| `src/app/api/lavori/[id]/route.ts:73-110` | **Modificare.** Sentinelle: i 5 nomi escono da `PATCHABLE_FIELDS`. |
| `src/app/api/lavori/route.ts:153-203` | **Modificare.** Il POST passa da `lavoro_crea_atomico`. |
| `src/lib/wizard/crea-lavoro.ts:184-203` | **Modificare.** Sparisce la PATCH fail-soft dei dettagli. |
| `src/hooks/useLavoroForm.ts:36-80` | **Modificare.** È **qui** che la scheda del lavoro salva (non in `TabClinica.tsx`). Grafica invariata. |

---

## 🔎 Censimento dei sette campi — fatto, non da rifare

Eseguito il 27/07/2026 su tutto `src/`. Il motivo per cui non basta fidarsi delle etichette del verbale: `route.ts:259-264` **scarta in silenzio** ogni chiave fuori allowlist. Un ottavo scrittore non prenderebbe un 422 — smetterebbe semplicemente di salvare, senza un errore da nessuna parte.

```bash
grep -rn "denti_coinvolti\|denti_mancanti\|denti_impianti\|colore_dente\|colore_collo\|colore_corpo\|colore_incisale" \
  src/ --include="*.tsx" --include="*.ts" | grep -v "denti-fdi" | grep -v "database.types"
```

**Scrittori: due, entrambi coperti.**

| Chi | Dove | Task |
|---|---|---|
| Il wizard | `crea-lavoro.ts:195-196` | 11 |
| Il form del lavoro | `useLavoroForm.ts:45` (`{ ...data }`), alimentato da `TabClinica.tsx:31-33, 58, 78, 98, 118` via `LavoroFormClient.tsx:148` | 12 |

**Lettori: cinque — tre vivi, due morti.**

| Chi | Dove | Sorte in questa ondata |
|---|---|---|
| La Dichiarazione di Conformità | `DdcTemplate.tsx:258-259` | 🔴 **vivo** — regge sulla denormalizzazione del Task 7 |
| Lo snapshot della DdC | `generate-ddc.ts:97` | 🔴 **vivo** — idem |
| La scheda del lavoro | `SchedaLavoroV3.tsx:286` → `RigaLavoroDenti.tsx` | 🔴 **vivo** — idem |
| La FatturaPA | `fatture/[id]/xml/route.ts:109-116` | ✅ **morto**: nella `SELECT`, mai usato (verbale ①). Rischio fiscale **zero** |
| La FatturaPA in blocco | `fatture/batch/route.ts:125-132` | ✅ **morto**, idem |

🔑 **È questo censimento ad aver imposto la denormalizzazione del Task 7.** Senza, i tre lettori vivi resterebbero a secco per tutta la durata fra l'ondata (a) e la (c) — e uno dei tre è un documento a valore legale.

---

## Task 1: Il dominio dei denti — 52 codici, non un intervallo

Chiude il rischio **R2** alla radice e il difetto ⑥ (`DENTI_DECIDUO` coi quadranti sbagliati, `denti-fdi.ts:56-77`: il 55 è marcato quadrante 1).

**Files:**
- Create: `src/lib/domain/denti-fdi-dominio.ts`
- Modify: `src/components/features/odontogramma/denti-fdi.ts:5-11`, `:56-77`
- Test: `tests/unit/denti-fdi-dominio.test.ts`

**Interfaces:**
- Produces:
  - `DENTI_FDI_VALIDI: ReadonlySet<number>` — esattamente **52** membri
  - `isFdiValido(v: unknown): v is number`
  - `quadranteDa(fdi: number): 1|2|3|4|5|6|7|8`
  - `arcataDa(fdi: number): 'superiore' | 'inferiore'`

- [ ] **Step 1: Scrivi il test che fallisce**

`tests/unit/denti-fdi-dominio.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { DENTI_FDI_VALIDI, isFdiValido, quadranteDa, arcataDa } from '@/lib/domain/denti-fdi-dominio'
import { DENTI_ADULTO, DENTI_DECIDUO } from '@/components/features/odontogramma/denti-fdi'

describe('dominio FDI — 52 codici strutturati, non un intervallo (spec §3.1, verbale ⑤)', () => {
  it('ha esattamente 52 membri', () => {
    expect(DENTI_FDI_VALIDI.size).toBe(52)
  })

  it('coincide con i denti dichiarati dai due cataloghi', () => {
    const daiCataloghi = new Set([...DENTI_ADULTO, ...DENTI_DECIDUO].map((d) => d.numero))
    expect(daiCataloghi.size).toBe(52)
    for (const n of daiCataloghi) expect(DENTI_FDI_VALIDI.has(n)).toBe(true)
  })

  it('rifiuta i buchi che un BETWEEN 11 AND 48 lascerebbe passare', () => {
    for (const buco of [19, 20, 29, 30, 39, 40, 49, 50]) {
      expect(isFdiValido(buco)).toBe(false)
    }
  })

  it('rifiuta i decidui inesistenti (sesta posizione)', () => {
    for (const buco of [56, 66, 76, 86]) expect(isFdiValido(buco)).toBe(false)
  })

  it('rifiuta tutto ciò che non è un intero nel dominio', () => {
    for (const v of [0, -11, 4.5, '11 ', '2.6', '11', null, undefined, NaN, Infinity, 100]) {
      expect(isFdiValido(v)).toBe(false)
    }
  })

  it('deriva il quadrante dalla decina, non da un campo scritto a mano', () => {
    expect(quadranteDa(18)).toBe(1)
    expect(quadranteDa(28)).toBe(2)
    expect(quadranteDa(38)).toBe(3)
    expect(quadranteDa(48)).toBe(4)
    expect(quadranteDa(55)).toBe(5) // ⑥: era 1
    expect(quadranteDa(65)).toBe(6)
    expect(quadranteDa(75)).toBe(7)
    expect(quadranteDa(85)).toBe(8)
  })

  it('deriva l arcata: quadranti 1,2,5,6 sopra — 3,4,7,8 sotto', () => {
    expect(arcataDa(11)).toBe('superiore')
    expect(arcataDa(51)).toBe('superiore')
    expect(arcataDa(61)).toBe('superiore')
    expect(arcataDa(31)).toBe('inferiore')
    expect(arcataDa(81)).toBe('inferiore')
  })
})

describe('DENTI_DECIDUO — quadranti corretti (difetto ⑥)', () => {
  it('nessun deciduo porta più un quadrante 1-4', () => {
    for (const d of DENTI_DECIDUO) {
      expect(d.quadrante).toBe(quadranteDa(d.numero))
      expect(d.quadrante).toBeGreaterThanOrEqual(5)
    }
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
npx vitest run tests/unit/denti-fdi-dominio.test.ts
```

Atteso: FAIL — `Failed to resolve import "@/lib/domain/denti-fdi-dominio"`.

- [ ] **Step 3: Scrivi il dominio**

`src/lib/domain/denti-fdi-dominio.ts`:

```typescript
// Dominio dei codici dente FDI (ISO 3950) — unica fonte di verità per «questo
// numero è un dente che esiste».
//
// 🔴 L'insieme NON è un intervallo (verbale §6-sexies ⑤): un
// `BETWEEN 11 AND 48` accetterebbe 19, 20, 29, 30, 39, 40 — denti che non
// esistono. La forma è strutturale: decina = quadrante, unità = posizione.
//   quadranti 1-4 → permanenti, 8 posizioni  → 32 denti
//   quadranti 5-8 → decidui,    5 posizioni  → 20 denti
// Totale: 52 codici validi.
//
// Lo stesso vincolo vive in SQL sulla tabella `lavori_denti`
// (20260727120100_lavori_denti_tabella.sql): qui e lì devono dire la stessa
// cosa, ed è il test `denti-fdi-dominio.test.ts` a tenerle allineate.

export type Quadrante = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type ArcataFdi = 'superiore' | 'inferiore'

function costruisciInsieme(): ReadonlySet<number> {
  const s = new Set<number>()
  for (let q = 1; q <= 4; q++) for (let p = 1; p <= 8; p++) s.add(q * 10 + p)
  for (let q = 5; q <= 8; q++) for (let p = 1; p <= 5; p++) s.add(q * 10 + p)
  return s
}

/** I 52 codici FDI che esistono davvero. */
export const DENTI_FDI_VALIDI: ReadonlySet<number> = costruisciInsieme()

/**
 * Vero solo per un intero appartenente ai 52. Rifiuta stringhe («'11'», «'2.6'»,
 * «'11 '»), decimali, NaN/Infinity e null/undefined: la porta d'ingresso della
 * route non deve mai lasciar arrivare al CHECK del database un valore che
 * produrrebbe un 500 invece di un 422 leggibile.
 */
export function isFdiValido(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && DENTI_FDI_VALIDI.has(v)
}

/** Il quadrante si DERIVA dalla decina. Mai letto da un campo scritto a mano (⑥). */
export function quadranteDa(fdi: number): Quadrante {
  return Math.floor(fdi / 10) as Quadrante
}

/** Quadranti 1, 2, 5, 6 stanno sopra; 3, 4, 7, 8 sotto. */
export function arcataDa(fdi: number): ArcataFdi {
  const q = quadranteDa(fdi)
  return q === 1 || q === 2 || q === 5 || q === 6 ? 'superiore' : 'inferiore'
}
```

- [ ] **Step 4: Correggi i quadranti dei decidui**

In `src/components/features/odontogramma/denti-fdi.ts`, allarga il tipo alla riga 9:

```typescript
  quadrante: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
```

e nelle righe 57-77 sostituisci il valore di `quadrante` di ogni deciduo con la sua decina reale:
`55,54,53,52,51 → 5` · `61,62,63,64,65 → 6` · `71,72,73,74,75 → 7` · `81,82,83,84,85 → 8`.

Esempio delle prime due righe (le altre seguono lo stesso schema):

```typescript
  { numero: 55, tipo: 'molare',            arcata: 'superiore', quadrante: 5, larghezza: 16 },
  { numero: 54, tipo: 'molare',            arcata: 'superiore', quadrante: 5, larghezza: 16 },
```

⚠️ **Verifica di non aver rotto chi legge quel campo** prima di committare:

```bash
grep -rn "quadrante" src/components/features/odontogramma/ src/components/features/lavori/
```

🔴 **ESITO REALE (27/07/2026) — questa parentesi del piano era SBAGLIATA, e seguirla alla lettera avrebbe spedito una schermata vuota.** Il piano diceva che un raggruppamento su 1-4 «oggi non fa danno perché adulto e deciduo non convivono mai sullo stesso schermo». Le due dentizioni non condividono lo schermo, ma **condividono il codice**: `OdontogrammaFDI.tsx:728` fa passare **entrambi** i cataloghi per gli stessi quattro filtri (`:798-802`) tramite l'interruttore adulto/deciduo. Controprova eseguita sui dati nuovi col filtro vecchio: **0 denti su 20** renderizzati in dentizione decidua.

➡️ **Adeguamento applicato:** il raggruppamento si basa sulla *posizione nel disegno*, non sul quadrante nudo — `((q - 1) % 4) + 1`, perché Q5↔Q1, Q6↔Q2, Q7↔Q3, Q8↔Q4. Equivalenza verificata elemento per elemento contro i dati letti da `git show HEAD`: tutti e otto gli array identici, stesso ordine, resa invariata.

🔑 **Nessun gate lo avrebbe visto:** `d.quadrante === 1` continua a compilare contro il tipo allargato, eslint è indifferente, e **nessun test nomina `Odontogramma`**. Test verdi e `tsc` pulito qui **non sono una prova**. È la stessa lezione del collaudo del 27/07: un difetto di resa non lo vede la suite, lo vede chi guarda.

- [ ] **Step 5: Esegui il test e verifica che passi**

```bash
npx vitest run tests/unit/denti-fdi-dominio.test.ts
```

Atteso: PASS, 8 test.

- [ ] **Step 6: Commit**

```bash
npx eslint src/
git add src/lib/domain/denti-fdi-dominio.ts src/components/features/odontogramma/denti-fdi.ts src/components/features/odontogramma/OdontogrammaFDI.tsx tests/unit/denti-fdi-dominio.test.ts
git commit -m "feat(lavori): dominio FDI a 52 codici strutturati + fix quadranti decidui"
```

⚠️ **I file sono QUATTRO, non tre** (il piano ne elencava tre): `OdontogrammaFDI.tsx` porta l'adeguamento del raggruppamento. Lasciarlo fuori dallo stage significa committare i quadranti nuovi **senza** l'adeguamento — cioè spedire la vista dei denti da latte vuota.

⚠️ **La tabella «File Structure» in testa dice che `quadrante` "si deriva": nel file resta un valore scritto a mano** (corretto, ma letterale). La derivazione vive in `quadranteDa()`, che è la fonte per chi calcola; il catalogo resta dati. Le due cose convivono, e il test lo verifica (`d.quadrante === quadranteDa(d.numero)` per ogni deciduo).

---

## Task 2: La precedenza colore riga→caso — scritta una volta sola

Spec §3.2: le righe di `lavori_denti` sono **override**, `lavori.colore_scala/colore_codice` è il **default di caso**. 🛑 «La precedenza si scrive UNA VOLTA SOLA»: due letture divergenti dello stesso default sono il difetto che questa modifica introdurrebbe.

⚠️ **Dichiarato, non nascosto: in questa ondata la funzione non ha consumatori.** I suoi lettori — wizard, scheda, Dichiarazione — arrivano in (b) e (c). È una deroga consapevole a YAGNI, chiesta dalla spec §3.2 per una ragione precisa: se la regola non esiste già scritta e provata quando (b) e (c) ne hanno bisogno, ognuna delle due se ne scrive una propria — ed è esattamente il difetto che questo task esiste per prevenire. Il costo è un file di 30 righe che per un'ondata resta fermo.

**Files:**
- Create: `src/lib/domain/colore-dente.ts`
- Test: `tests/unit/colore-dente.test.ts`

**Interfaces:**
- Produces:
  - `type ScalaColore = 'vita_classical' | 'vita_3d_master' | 'fuori_scala'`
  - `type ColoreRisolto = { scala: ScalaColore; codice: string; da: 'dente' | 'caso' } | null`
  - `type DefaultCaso = { colore_scala: string | null; colore_codice: string | null }`
  - `type RigaDente = { fdi: number; scala: string | null; codice: string | null }`
  - `risolviColore(riga: RigaDente | undefined, caso: DefaultCaso): ColoreRisolto`

- [ ] **Step 1: Scrivi il test che fallisce**

`tests/unit/colore-dente.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { risolviColore } from '@/lib/domain/colore-dente'

const CASO_A3 = { colore_scala: 'vita_classical', colore_codice: 'A3' }
const CASO_VUOTO = { colore_scala: null, colore_codice: null }

describe('precedenza colore: la riga vince sul caso (spec §3.2)', () => {
  it('senza riga usa il default di caso — è la protesi totale', () => {
    expect(risolviColore(undefined, CASO_A3)).toEqual({ scala: 'vita_classical', codice: 'A3', da: 'caso' })
  })

  it('la riga con colore proprio vince — sono i denti di colore diverso', () => {
    const riga = { fdi: 11, scala: 'vita_classical', codice: 'B1' }
    expect(risolviColore(riga, CASO_A3)).toEqual({ scala: 'vita_classical', codice: 'B1', da: 'dente' })
  })

  it('la riga senza colore ricade sul caso — è l abutment in un lavoro colorato', () => {
    const riga = { fdi: 11, scala: null, codice: null }
    expect(risolviColore(riga, CASO_A3)).toEqual({ scala: 'vita_classical', codice: 'A3', da: 'caso' })
  })

  it('niente riga e niente caso: null, non una stringa vuota', () => {
    expect(risolviColore(undefined, CASO_VUOTO)).toBeNull()
    expect(risolviColore({ fdi: 11, scala: null, codice: null }, CASO_VUOTO)).toBeNull()
  })

  it('una scala senza codice non è un colore', () => {
    expect(risolviColore({ fdi: 11, scala: 'vita_classical', codice: null }, CASO_VUOTO)).toBeNull()
    expect(risolviColore(undefined, { colore_scala: 'vita_classical', colore_codice: null })).toBeNull()
  })

  it('un codice senza scala non è un colore: A3 esiste in una scala sola per convenzione, non per legge', () => {
    expect(risolviColore({ fdi: 11, scala: null, codice: 'A3' }, CASO_VUOTO)).toBeNull()
  })

  it('una scala sconosciuta non passa: il dominio è chiuso', () => {
    expect(risolviColore({ fdi: 11, scala: 'inventata', codice: 'A3' }, CASO_VUOTO)).toBeNull()
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
npx vitest run tests/unit/colore-dente.test.ts
```

Atteso: FAIL — `Failed to resolve import "@/lib/domain/colore-dente"`.

- [ ] **Step 3: Scrivi la funzione**

`src/lib/domain/colore-dente.ts`:

```typescript
// La precedenza «riga di dente → default di caso» (spec §3.2, pattern exocad /
// 3Shape). Vive QUI e solo qui: wizard, scheda del lavoro e Dichiarazione di
// Conformità devono leggere lo stesso default con la stessa regola. Due
// letture divergenti dello stesso fatto sono il difetto che questa modifica
// introdurrebbe — è la classe già pagata una volta con `numero_cassetta`.
//
// Un colore è una COPPIA (scala, codice), non una stringa (W10): «A3» da solo
// non identifica nulla in un mondo con due scale VITA. Mezza coppia non è
// mezzo colore: è nessun colore.

export const SCALE_COLORE = ['vita_classical', 'vita_3d_master', 'fuori_scala'] as const
export type ScalaColore = (typeof SCALE_COLORE)[number]

export type DefaultCaso = { colore_scala: string | null; colore_codice: string | null }
export type RigaDente = { fdi: number; scala: string | null; codice: string | null }
export type ColoreRisolto = { scala: ScalaColore; codice: string; da: 'dente' | 'caso' } | null

function isScala(v: string | null): v is ScalaColore {
  return v !== null && (SCALE_COLORE as readonly string[]).includes(v)
}

function coppia(
  scala: string | null,
  codice: string | null,
  da: 'dente' | 'caso'
): ColoreRisolto {
  if (!isScala(scala) || !codice) return null
  return { scala, codice, da }
}

/**
 * Il colore effettivo di un dente. La riga vince se porta una coppia completa;
 * altrimenti si ricade sul default del lavoro; se non c'è nemmeno quello, `null`
 * — mai una stringa vuota, che a valle si confonderebbe con «bianco».
 */
export function risolviColore(riga: RigaDente | undefined, caso: DefaultCaso): ColoreRisolto {
  return coppia(riga?.scala ?? null, riga?.codice ?? null, 'dente')
      ?? coppia(caso.colore_scala, caso.colore_codice, 'caso')
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

```bash
npx vitest run tests/unit/colore-dente.test.ts
```

Atteso: PASS, 7 test.

- [ ] **Step 5: Commit**

```bash
npx eslint src/
git add src/lib/domain/colore-dente.ts tests/unit/colore-dente.test.ts
git commit -m "feat(lavori): precedenza colore riga-dente su default-caso, in una funzione sola"
```

---

## Task 3: Migration 1 — il vincolo che manca e la tabella dei colori

Chiude ⑧ (`lavori` non ha un `UNIQUE (id, laboratorio_id)`, senza il quale la FK composita non è costruibile) e ⑦ (VITA classical ha **16** codici, non 19: `T`, `BL`, `OM` sono fuori scala e l'app **le offre già oggi** — un vincolo sui soli 16 rifiuterebbe valori esistenti).

**Files:**
- Create: `supabase/migrations/20260727120000_lavori_denti.sql`

**Interfaces:**
- Produces: vincolo `lavori_id_lab_uk` · tabella `colori_dentali (scala, codice)` con 48 righe.

- [ ] **Step 1: Scrivi la migration**

`supabase/migrations/20260727120000_lavori_denti.sql`:

```sql
-- 20260727120000_lavori_denti.sql — Ondata (a) del wizard «Nuovo lavoro», parte 1/4.
-- Spec: docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md §8 passi 1-2.
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration.

-- ============ 1. Il vincolo che serve alla FK composita (verbale ⑧) ============
-- Senza questo, `lavori_denti (lavoro_id, laboratorio_id) → lavori (id, laboratorio_id)`
-- non è costruibile, e una riga potrebbe portare il laboratorio B su un lavoro di A.
ALTER TABLE lavori ADD CONSTRAINT lavori_id_lab_uk UNIQUE (id, laboratorio_id);

-- ============ 2. colori_dentali — riferimento NON-tenant ============
-- Non ha laboratorio_id e non ha RLS: è un catalogo pubblico in sola lettura,
-- come lo sono le scale VITA nel mondo reale.
CREATE TABLE colori_dentali (
  scala    text NOT NULL CHECK (scala IN ('vita_classical','vita_3d_master','fuori_scala')),
  codice   text NOT NULL CHECK (char_length(btrim(codice)) BETWEEN 1 AND 8),
  famiglia text NOT NULL,
  ordine   smallint NOT NULL,
  -- ⚠️ hex resta NULL in questa ondata, DELIBERATAMENTE. I valori colorimetrici
  -- pubblicati (Bayindir et al., J Prosthet Dent 2007;98:175-185) servono alla
  -- resa a schermo di W9, che è ondata (b): si popolano leggendo la fonte, non
  -- inventandoli qui. Una tinta inventata su un dispositivo medico non è un
  -- segnaposto innocuo.
  hex      text CHECK (hex IS NULL OR hex ~ '^#[0-9A-Fa-f]{6}$'),
  PRIMARY KEY (scala, codice)
);

-- VITA classical — 16 codici (⑦: sono SEDICI, non 19)
INSERT INTO colori_dentali (scala, codice, famiglia, ordine) VALUES
  ('vita_classical','A1','A',1), ('vita_classical','A2','A',2),
  ('vita_classical','A3','A',3), ('vita_classical','A3.5','A',4),
  ('vita_classical','A4','A',5),
  ('vita_classical','B1','B',6), ('vita_classical','B2','B',7),
  ('vita_classical','B3','B',8), ('vita_classical','B4','B',9),
  ('vita_classical','C1','C',10), ('vita_classical','C2','C',11),
  ('vita_classical','C3','C',12), ('vita_classical','C4','C',13),
  ('vita_classical','D2','D',14), ('vita_classical','D3','D',15),
  ('vita_classical','D4','D',16);

-- Fuori scala — i 3 codici che TabClinica.tsx:8-14 offre già oggi accanto ai 16.
-- ⚠️ La ragione è «valori che il menu può PRODURRE», non «valori esistenti da
-- salvare»: verificato sul database il 27/07, su 294 lavori le quattro colonne
-- colore sono NULL ovunque — non c'era nessun dato da proteggere.
-- Senza queste righe la scheda clinica rifiuterebbe tre voci del proprio menu.
INSERT INTO colori_dentali (scala, codice, famiglia, ordine) VALUES
  ('fuori_scala','T','speciale',1),
  ('fuori_scala','BL','speciale',2),
  ('fuori_scala','OM','speciale',3);

-- VITA 3D-Master — 29 codici. Famiglia = livello di luminosità (0-5), che è
-- l'ordinamento vero della scala: luminosità → croma → tinta, non l'alfabeto.
INSERT INTO colori_dentali (scala, codice, famiglia, ordine) VALUES
  ('vita_3d_master','0M1','0',1), ('vita_3d_master','0M2','0',2), ('vita_3d_master','0M3','0',3),
  ('vita_3d_master','1M1','1',4), ('vita_3d_master','1M2','1',5),
  ('vita_3d_master','2L1.5','2',6), ('vita_3d_master','2L2.5','2',7),
  ('vita_3d_master','2M1','2',8), ('vita_3d_master','2M2','2',9), ('vita_3d_master','2M3','2',10),
  ('vita_3d_master','2R1.5','2',11), ('vita_3d_master','2R2.5','2',12),
  ('vita_3d_master','3L1.5','3',13), ('vita_3d_master','3L2.5','3',14),
  ('vita_3d_master','3M1','3',15), ('vita_3d_master','3M2','3',16), ('vita_3d_master','3M3','3',17),
  ('vita_3d_master','3R1.5','3',18), ('vita_3d_master','3R2.5','3',19),
  ('vita_3d_master','4L1.5','4',20), ('vita_3d_master','4L2.5','4',21),
  ('vita_3d_master','4M1','4',22), ('vita_3d_master','4M2','4',23), ('vita_3d_master','4M3','4',24),
  ('vita_3d_master','4R1.5','4',25), ('vita_3d_master','4R2.5','4',26),
  ('vita_3d_master','5M1','5',27), ('vita_3d_master','5M2','5',28), ('vita_3d_master','5M3','5',29);

-- Catalogo pubblico in sola lettura: nessuno lo scrive dall'applicazione.
REVOKE ALL ON colori_dentali FROM anon, authenticated, service_role;
GRANT SELECT ON colori_dentali TO authenticated, service_role;

COMMENT ON TABLE colori_dentali IS
  'Scale colore dentali (W10). Non-tenant, sola lettura. hex NULL finché i valori colorimetrici pubblicati non vengono importati dalla fonte — ondata (b).';
```

- [ ] **Step 2: Applica la migration e verifica il conteggio**

```bash
npx supabase db push --yes
```

⚠️ **`--yes` serve davvero:** senza, il comando si ferma su un prompt `[Y/n]` che in sessione non interattiva non riceve risposta. La riga `Skipping migration MANUAL_000_auth_helpers.sql` nell'output è preesistente e innocua (quel file non ha il prefisso timestamp).

🔑 **Le verifiche SQL si fanno da qui, non a mano:** `node scripts/tmp/sql.mjs "<query>"` legge `SUPABASE_DB_URL` da `.env.local` e non stampa mai la stringa di connessione.

Poi:

```sql
SELECT scala, count(*) FROM colori_dentali GROUP BY scala ORDER BY scala;
```

Atteso, esattamente:
```
fuori_scala      |  3
vita_3d_master   | 29
vita_classical   | 16
```

Se un numero non torna, **fermati**: il seed è la fonte da cui il vincolo del Task 4 giudicherà ogni colore.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727120000_lavori_denti.sql
git commit -m "feat(db): unique (id, laboratorio_id) su lavori + tabella colori_dentali con 48 codici"
```

---

## Task 4: Migration 2 — `lavori_denti`, con il vincolo strutturale e il REVOKE che conta

**Files:**
- Create: `supabase/migrations/20260727120100_lavori_denti_tabella.sql`

**Interfaces:**
- Produces: tabella `lavori_denti` — **nessuno può scriverci direttamente**, nemmeno `service_role`. Le RPC del Task 7 sono l'unica penna.

- [ ] **Step 1: Scrivi la migration**

`supabase/migrations/20260727120100_lavori_denti_tabella.sql`:

```sql
-- 20260727120100_lavori_denti_tabella.sql — Ondata (a), parte 2/4.
-- Spec §3.1 + §4 (RLS). NON aggiungere BEGIN;/COMMIT;.

CREATE TABLE lavori_denti (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id   uuid NOT NULL REFERENCES laboratori(id),
  lavoro_id        uuid NOT NULL,

  -- 🔴 smallint, MAI text: '2.6'::smallint è già un errore di tipo. Il difetto
  -- «il wizard salva 2.6 e l'odontogramma non accende nulla» diventa così
  -- IRRAPPRESENTABILE, invece di marcire in silenzio fino alla Dichiarazione.
  fdi              smallint NOT NULL,

  -- L'insieme NON è un intervallo (verbale ⑤): un BETWEEN 11 AND 48
  -- accetterebbe 19, 20, 29, 30, 39, 40. Decina = quadrante, unità = posizione.
  CONSTRAINT lavori_denti_fdi_ck CHECK (
       (fdi / 10 BETWEEN 1 AND 4 AND fdi % 10 BETWEEN 1 AND 8)   -- 32 permanenti
    OR (fdi / 10 BETWEEN 5 AND 8 AND fdi % 10 BETWEEN 1 AND 5)   -- 20 decidui
  ),

  -- `ruolo` unifica denti_mancanti e denti_impianti (oggi INTEGER[] accanto a
  -- denti_coinvolti text[]: stesso dominio, due tipi) e copre gratis «denti da
  -- escludere» degli allineatori e «da incollare» della contenzione.
  ruolo            text NOT NULL DEFAULT 'elemento'
                   CHECK (ruolo IN ('elemento','mancante','impianto','escluso','incollato')),

  -- Il ponte: forma riservata ora, gesto dopo (spec §3.4). Nullable e non
  -- popolate in questa ondata. Costo oggi: due righe. Costo se si rimanda del
  -- tutto: la DdC scriverebbe «elementi 13, 12, 11» invece di «ponte su tre
  -- elementi» — che ai fini dell'Allegato XIII descrive un dispositivo diverso.
  gruppo           smallint,
  gruppo_ruolo     text CHECK (gruppo_ruolo IS NULL OR gruppo_ruolo IN ('pilastro','intermedio')),

  -- Il colore è una COPPIA (scala, codice), mai una stringa (W10).
  scala            text,
  codice           text,
  codice_collo     text,
  codice_corpo     text,
  codice_incisale  text,

  -- W20: da dove viene il valore. ⚠️ Dopo W21 NON decide più che cosa si
  -- stampa sul documento (si stampa la realtà del manufatto consegnato): serve
  -- al precheck di consegna per poter dire «questo colore non è mai stato
  -- confrontato con la prescrizione». Costa una colonna e non toglie nulla.
  provenienza      text NOT NULL DEFAULT 'prescritto'
                   CHECK (provenienza IN ('prescritto','eseguito')),

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- FK COMPOSITA (⑧): lega la riga al lavoro **e** al suo laboratorio in un
  -- vincolo solo. Con due FK separate una riga potrebbe portare il laboratorio
  -- B su un lavoro di A e il database non se ne accorgerebbe.
  CONSTRAINT lavori_denti_lavoro_fk
    FOREIGN KEY (lavoro_id, laboratorio_id) REFERENCES lavori (id, laboratorio_id),

  -- Un dente compare una volta sola per lavoro.
  CONSTRAINT lavori_denti_lavoro_fdi_uk UNIQUE (lavoro_id, fdi),

  -- Una scala senza codice non è un colore; un codice senza scala nemmeno.
  CONSTRAINT lavori_denti_coppia_ck CHECK ((scala IS NULL) = (codice IS NULL)),

  -- Le zone del ceramista non possono esistere senza la scala che le legge.
  CONSTRAINT lavori_denti_zone_ck CHECK (
    scala IS NOT NULL
    OR (codice_collo IS NULL AND codice_corpo IS NULL AND codice_incisale IS NULL)
  ),

  -- Il colore, se c'è, deve essere un codice che esiste davvero.
  CONSTRAINT lavori_denti_colore_fk
    FOREIGN KEY (scala, codice) REFERENCES colori_dentali (scala, codice)
);

CREATE INDEX lavori_denti_lavoro_idx ON lavori_denti (lavoro_id, fdi);
CREATE INDEX lavori_denti_lab_idx    ON lavori_denti (laboratorio_id);

-- ============ RLS: lettura per tenant, scrittura solo via RPC ============
ALTER TABLE lavori_denti ENABLE ROW LEVEL SECURITY;

-- public.current_lab_id() — MAI auth.current_lab_id(), che in questo schema
-- non esiste (../CLAUDE.md §6).
CREATE POLICY lavori_denti_tenant_select ON lavori_denti
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

-- ⚠️ E8 — `service_role` va nella lista del REVOKE. Le default privileges di
-- Supabase gli darebbero tutto, e in questo repo un
-- `SET LOCAL ROLE service_role; DELETE` cross-tenant è già stato riprodotto
-- DAVVERO (nota E8, 20260721090000_parete_cassette.sql:126-137). Le RPC del
-- Task 7 continuano a scrivere perché sono SECURITY DEFINER: girano coi
-- privilegi dell'owner, non del chiamante.
REVOKE ALL ON lavori_denti FROM anon, authenticated, service_role;
GRANT SELECT ON lavori_denti TO authenticated, service_role;

COMMENT ON TABLE lavori_denti IS
  'Una riga per dente del lavoro (spec §3.1). Scrittura SOLO via lavoro_denti_sostituisci_atomica / lavoro_crea_atomico: la tabella è in REVOKE ALL, service_role compreso.';
```

- [ ] **Step 2: Applica e verifica che il vincolo morda davvero**

```bash
npx supabase db push
```

Dalla console SQL, provare a inserire i valori che devono essere rifiutati (l'INSERT diretto qui gira come `postgres`, che è l'owner — serve appunto a provare il **CHECK**, non i permessi):

```sql
-- Ognuno di questi deve fallire con violazione di lavori_denti_fdi_ck
INSERT INTO lavori_denti (laboratorio_id, lavoro_id, fdi)
SELECT laboratorio_id, id, 19 FROM lavori LIMIT 1;
```

Ripetere con `29`, `30`, `49`, `50`, `86`, `0`. Atteso ogni volta:
`new row for relation "lavori_denti" violates check constraint "lavori_denti_fdi_ck"`.

Poi con `11` deve **riuscire**; cancellare subito la riga di prova:

```sql
DELETE FROM lavori_denti WHERE fdi = 11;
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260727120100_lavori_denti_tabella.sql
git commit -m "feat(db): tabella lavori_denti con vincolo FDI strutturale, FK composita e RLS"
```

---

## Task 5: Migration 3 — il default di caso, la fotografia, e la colonna morta che se ne va

Include **W23** (`dichiarazioni_conformita.colore_dente` si elimina) con la verifica preventiva chiesta dalla spec §8, e l'allineamento di `admin_delete_laboratorio` senza il quale un tenant con righe `lavori_denti` diventerebbe **incancellabile** (rischio R5).

**Files:**
- Create: `supabase/migrations/20260727120200_lavori_colore_caso.sql`

- [ ] **Step 1: Verifica sul database che la colonna sia davvero vuota**

**Prima** di scrivere la migration, dalla console SQL:

```sql
SELECT count(*) FROM dichiarazioni_conformita WHERE colore_dente IS NOT NULL;
```

Atteso: `0`. È dichiarata morta (`generate-ddc.ts:80-114` non la costruisce mai), ma «dichiarata» non è «verificata» — e un `DROP COLUMN` non restituisce i dati.
🛑 **Se il conteggio non è 0, fermati e riferisci a Francesco**: la colonna ha uno scrittore che nessuno ha censito, e W23 va riaperta.

- [ ] **Step 2: Apri la versione vigente della funzione di purga**

```bash
sed -n '104,207p' supabase/migrations/20260721090100_admin_delete_laboratorio_cassette.sql
```

**Fatti verificati che il piano assume** (letti da quel file, non ricordati): la firma è `admin_delete_laboratorio(p_lab_id UUID)` — il parametro è **`p_lab_id`**, non `p_lab` · il tipo di ritorno è **`JSONB`**, non `void` · ogni riga conta le cancellazioni in `v_counts` con `GET DIAGNOSTICS` · il precedente del 21/07 ha inserito la purga della Parete **immediatamente prima** di `DELETE FROM lavori` (riga 143-147).

⚠️ `lavori_denti` va nello stesso punto e per la stessa ragione: la referenzia.

- [ ] **Step 3: Scrivi la migration**

`supabase/migrations/20260727120200_lavori_colore_caso.sql`:

```sql
-- 20260727120200_lavori_colore_caso.sql — Ondata (a), parte 3/4.
-- Spec §3.2 (default di caso), §3.5 (congelamento), §8 passi 4-5. W23.
-- NON aggiungere BEGIN;/COMMIT;.

-- ============ Il default di caso (spec §3.2) ============
-- Il colore che non ha denti NON si modella con una riga senza dente: si
-- modella come default del lavoro, e le righe di lavori_denti sono override.
-- È il pattern di exocad e 3Shape. Protesi totale → solo default, nessuna riga.
ALTER TABLE lavori
  ADD COLUMN colore_scala  text CHECK (colore_scala IS NULL OR colore_scala IN ('vita_classical','vita_3d_master','fuori_scala')),
  ADD COLUMN colore_codice text;

ALTER TABLE lavori
  ADD CONSTRAINT lavori_colore_caso_coppia_ck CHECK ((colore_scala IS NULL) = (colore_codice IS NULL)),
  ADD CONSTRAINT lavori_colore_caso_fk
    FOREIGN KEY (colore_scala, colore_codice) REFERENCES colori_dentali (scala, codice);

-- ============ La fotografia (spec §3.5) ============
-- Lo SCHEMA nasce col primo giorno anche se il writer arriva nell'ondata (c):
-- se nel frattempo viene emessa una Dichiarazione che riporta il colore per
-- dente, quella resta valida e va conservata 10 anni. Lo schema non si aggiunge
-- dopo un documento a valore legale.
ALTER TABLE lavori
  ADD COLUMN denti_snapshot    jsonb,
  ADD COLUMN denti_snapshot_at timestamptz;

COMMENT ON COLUMN lavori.denti_snapshot IS
  'Fotografia dei denti+colore al momento della consegna. Writer nell''ondata (c); lo schema esiste dal primo giorno (spec §3.5).';

-- ============ W23: la colonna morta se ne va ============
-- «se serve usala sennò togli, il codice nella nostra pwa deve essere più
-- ordinato e pulito possibile» (Francesco, 27/07/2026). Col colore per-dente
-- non serve più a niente: la sostituisce il testo collassato in
-- prescrizione_caratteristiche (ondata c).
-- ⚠️ Prerequisito verificato a mano prima di applicare: zero righe con valore.
ALTER TABLE dichiarazioni_conformita DROP COLUMN colore_dente;
```

Poi, **nello stesso file**, la riga di cancellazione del tenant, adattata alla forma trovata allo Step 2 — va inserita **prima** della cancellazione di `lavori`, perché `lavori_denti` la referenzia:

```sql
-- ============ R5: il tenant deve restare cancellabile ============
-- Ogni tabella con laboratorio_id deve comparire nella purga, altrimenti
-- l'esercizio dell'art. 17 GDPR sbatte contro la FK e il tenant diventa
-- INCANCELLABILE. Precedente identico: la Parete delle Cassette, 21/07/2026.
--
-- 🛑 PROCEDURA OBBLIGATORIA, NON ABBREVIABILE:
-- `CREATE OR REPLACE FUNCTION` sostituisce il corpo INTERO. Si copia
-- integralmente il blocco righe 120-201 di
-- 20260721090100_admin_delete_laboratorio_cassette.sql — tutte e ~50 le righe
-- DELETE, ognuna con il suo GET DIAGNOSTICS — e si aggiunge la SOLA riga qui
-- sotto. Un corpo riassunto qui NON è un piano incompleto: è una purga
-- monca che cancella metà tenant e lascia l'altra metà orfana.
--
-- Firma esatta (verificata sul file, riga 120-121):
--   admin_delete_laboratorio(p_lab_id UUID) RETURNS JSONB
--   LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
--
-- La riga nuova va inserita nello stesso punto della purga Parete: subito
-- PRIMA di `DELETE FROM lavori` (riga 147 del file vigente), perché
-- lavori_denti referenzia lavori con FK composita.

CREATE OR REPLACE FUNCTION public.admin_delete_laboratorio(p_lab_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_counts JSONB := '{}'::jsonb;
  v_n INTEGER;
BEGIN
  -- ⬇️ RIGHE 132-141 DEL FILE VIGENTE, COPIATE VERBATIM
  --    (lavori_materiali, lavori_fasi, lavori_lavorazioni, lavori_immagini,
  --     lavori_rifacimenti, lavori_appuntamenti, lavoro_prove,
  --     dichiarazioni_conformita, buoni_consegna, appuntamenti)

  -- ⬇️ RIGA 146 DEL FILE VIGENTE, COPIATA VERBATIM: PERFORM public.cassette_purge_lab(p_lab_id);

  -- ⬇️ AGGIUNTA 27/07/2026 (ondata a del wizard). DEVE stare PRIMA di
  --    `DELETE FROM lavori`: lavori_denti lo referenzia con FK composita.
  DELETE FROM lavori_denti WHERE laboratorio_id = p_lab_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('lavori_denti', v_n);

  -- ⬇️ RIGHE 147-201 DEL FILE VIGENTE, COPIATE VERBATIM
  --    (da `DELETE FROM lavori` fino a `DELETE FROM laboratori` e al RETURN)
END;
$$;

-- Il CREATE OR REPLACE conserva l'ACL, ma la si ri-emette per non dipendere da
-- quel dettaglio (stessa scelta del 21/07, righe 206-207).
REVOKE ALL   ON FUNCTION public.admin_delete_laboratorio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_laboratorio(uuid) TO service_role;
```

⚠️ **I tre commenti «COPIATE VERBATIM» qui sopra non sono segnaposto da lasciare:** vanno **sostituiti** col testo reale delle righe indicate, aperte con lo `sed` dello Step 2. Se la migration finisce col commento al posto delle righe, la purga cancella una decina di tabelle su cinquanta.

- [ ] **Step 4: Applica e verifica**

```bash
npx supabase db push
```

Dalla console SQL:

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'dichiarazioni_conformita' AND column_name = 'colore_dente';
```

Atteso: **zero righe**.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260727120200_lavori_colore_caso.sql
git commit -m "feat(db): default colore di caso + snapshot denti su lavori; drop colonna morta colore_dente (W23)"
```

---

## Task 6: FASE 6b — i tipi generati e il compilatore

REGOLA ZERO di `ua-app/CLAUDE.md` §0C: **mai saltare la FASE 6b** se in sessione è stata scritta una migration.

**Files:**
- Modify: `src/types/database.types.ts` (generato — non editare a mano, salvo il taglio descritto sotto)

- [ ] **Step 1: Rigenera i tipi**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```

- [ ] **Step 2: Togli il messaggio della CLI in fondo al file**

La CLI a volte appende una riga di testo che non è TypeScript. Apri la fine del file e cancellala se c'è (è l'unica modifica manuale ammessa su un file generato).

- [ ] **Step 3: Verifica che il compilatore trovi la rottura attesa**

```bash
npx tsc --noEmit
```

⚠️ **Atteso: errori, ed è il punto.** `dichiarazioni_conformita.colore_dente` non esiste più: ogni punto che la nomina si accende adesso. Trovali:

```bash
grep -rn "colore_dente" src/ | grep -v "lavori"
```

Correggi **solo** i riferimenti alla colonna della DdC (rimozione: il campo non ha mai avuto un valore). ⚠️ **NON toccare** `lavori.colore_dente`, che in questa ondata resta viva e passa a sentinella nel Task 10.

- [ ] **Step 4: Verifica che il compilatore sia pulito**

```bash
npx tsc --noEmit
```

Atteso: nessun output.

- [ ] **Step 5: Commit**

```bash
npx eslint src/
git add src/types/database.types.ts src/
git commit -m "chore(db): FASE 6b — rigenera database.types dopo le migration dell'ondata (a)"
```

---

## Task 7: Le due RPC atomiche — l'unica penna che scrive i denti

`lavori_denti` è in `REVOKE ALL`: **nemmeno `service_role` può scriverci**. Queste due funzioni `SECURITY DEFINER` sono l'unico accesso, ed è il motivo per cui il REVOKE non è teatro.

`lavoro_crea_atomico` ha un **motivo normativo**, non di comodità: un colore perso in silenzio produce una Dichiarazione priva di un contenuto obbligatorio dell'Allegato XIII.

**Files:**
- Create: `supabase/migrations/20260727120300_lavori_denti_rpc.sql`

**Interfaces:**
- Produces:
  - `lavoro_denti_sostituisci_atomica(p_lab uuid, p_lavoro uuid, p_denti jsonb, p_atteso_updated_at timestamptz) RETURNS json`
    → `{"esito":"ok","updated_at":"…"}` · `{"esito":"non_trovato"}` · `{"esito":"conflitto","updated_at":"…"}`
  - `lavoro_crea_atomico(p_lab uuid, p_lavoro jsonb, p_denti jsonb) RETURNS json`
    → `{"esito":"ok","id":"…","numero_lavoro":"2026/0042","stato":"ricevuto"}` · `{"esito":"errore","dettaglio":"…"}`

- [ ] **Step 1: Scrivi la migration**

`supabase/migrations/20260727120300_lavori_denti_rpc.sql`:

```sql
-- 20260727120300_lavori_denti_rpc.sql — Ondata (a), parte 4/4.
-- Spec §4. NON aggiungere BEGIN;/COMMIT;.
--
-- Perché due RPC e non due UPDATE dalla route: lavori_denti è in REVOKE ALL
-- (service_role compreso, nota E8). Queste funzioni sono SECURITY DEFINER,
-- quindi girano coi privilegi dell'owner. Ogni funzione riceve p_lab e lo
-- applica in OGNI clausola WHERE: il tenant non si deduce, si impone.

-- ============ 1. Sostituzione integrale dei denti di un lavoro ============
-- Idempotente per costruzione: 6 denti = 1 chiamata, non 6. Chi chiama manda
-- la lista che vuole vedere, non un delta.
CREATE FUNCTION public.lavoro_denti_sostituisci_atomica(
  p_lab                uuid,
  p_lavoro             uuid,
  p_denti              jsonb,
  p_atteso_updated_at  timestamptz
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_updated_at timestamptz;
BEGIN
  -- Il lock sul lavoro ordina tutto il resto ed è anche il controllo di
  -- esistenza + appartenenza al tenant in un colpo solo: un lavoro di un altro
  -- laboratorio semplicemente non si trova.
  SELECT updated_at INTO v_updated_at
    FROM lavori
   WHERE id = p_lavoro AND laboratorio_id = p_lab AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('esito', 'non_trovato');
  END IF;

  -- Controllo di concorrenza: due persone sullo stesso lavoro non si
  -- sovrascrivono in silenzio. Chi arriva secondo riceve indietro il timestamp
  -- corrente e può rileggere. ⚠️ È un pattern NUOVO per questo repo: introdotto
  -- qui deliberatamente (spec §4), non ereditato.
  IF p_atteso_updated_at IS NOT NULL AND v_updated_at IS DISTINCT FROM p_atteso_updated_at THEN
    RETURN json_build_object('esito', 'conflitto', 'updated_at', v_updated_at);
  END IF;

  DELETE FROM lavori_denti WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab;

  INSERT INTO lavori_denti (
    laboratorio_id, lavoro_id, fdi, ruolo,
    scala, codice, codice_collo, codice_corpo, codice_incisale, provenienza
  )
  SELECT
    p_lab,
    p_lavoro,
    (d->>'fdi')::smallint,
    COALESCE(d->>'ruolo', 'elemento'),
    d->>'scala',
    d->>'codice',
    d->>'codice_collo',
    d->>'codice_corpo',
    d->>'codice_incisale',
    COALESCE(d->>'provenienza', 'prescritto')
  FROM jsonb_array_elements(COALESCE(p_denti, '[]'::jsonb)) AS d;

  -- 🔴 DENORMALIZZAZIONE OBBLIGATORIA — non è una comodità, chiude un buco che
  -- il taglio in ondate creerebbe. Dopo il Task 10 nessuno scrive più
  -- `lavori.denti_coinvolti` dall'applicazione, ma TRE lettori la leggono
  -- ancora e restano tali fino all'ondata (c):
  --   · DdcTemplate.tsx:258      → la Dichiarazione stamperebbe zero denti
  --   · generate-ddc.ts:97       → lo snapshot congelerebbe un vuoto
  --   · SchedaLavoroV3.tsx:286   → la scheda del lavoro non li mostrerebbe più
  -- Un lavoro creato dopo l'ondata (a) e consegnato prima della (c) uscirebbe
  -- con un documento a valore legale privo di un elemento dell'Allegato XIII.
  -- La colonna resta quindi VIVA come denormalizzazione, tenuta in sincronia
  -- SOLO da questa RPC — stesso pattern di `numero_cassetta`. La sentinella del
  -- Task 10 non è in contraddizione: dice «nessuno la scrive a mano», non
  -- «nessuno la scrive».
  -- Muore nell'ondata (c), quando i lettori passano a `lavori_denti`.
  UPDATE lavori SET
    denti_coinvolti = (SELECT array_agg(fdi::text ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND ruolo = 'elemento'),
    denti_mancanti  = (SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND ruolo = 'mancante'),
    denti_impianti  = (SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND ruolo = 'impianto'),
    updated_at = now()
   WHERE id = p_lavoro AND laboratorio_id = p_lab
  RETURNING updated_at INTO v_updated_at;

  RETURN json_build_object('esito', 'ok', 'updated_at', v_updated_at);
END $$;

-- ============ 2. Creazione atomica: lavoro + denti, o niente ============
-- Perimetro: SOLO lavoro + denti. Le fasi da ciclo restano fuori e fail-soft
-- (spec §4): sono correggibili dopo, un colore perso no.
CREATE FUNCTION public.lavoro_crea_atomico(
  p_lab    uuid,
  p_lavoro jsonb,
  p_denti  jsonb
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_anno        integer := (p_lavoro->>'anno_lavoro')::integer;
  v_progressivo integer;
  v_numero      text;
  v_id          uuid;
BEGIN
  -- Il progressivo è race-safe e vive già in casa: si riusa, non si reinventa.
  v_progressivo := public.genera_progressivo(p_lab, 'lavoro', v_anno);
  IF v_progressivo IS NULL THEN
    RETURN json_build_object('esito', 'errore', 'dettaglio', 'progressivo non generato');
  END IF;
  v_numero := v_anno::text || '/' || lpad(v_progressivo::text, 4, '0');

  INSERT INTO lavori (
    laboratorio_id, numero_lavoro, anno_lavoro, stato,
    tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna,
    richiedente_nome, priorita, dispositivo_semilavorato, note_interne,
    cliente_id, paziente_id, tecnico_id, ciclo_id,
    classe_rischio, da_conformare, codice_iva, natura_iva, data_ingresso,
    colore_scala, colore_codice
  ) VALUES (
    p_lab, v_numero, v_anno, 'ricevuto',
    p_lavoro->>'tipo_dispositivo',
    p_lavoro->>'descrizione',
    (p_lavoro->>'data_consegna_prevista')::date,
    p_lavoro->>'ora_consegna',
    p_lavoro->>'richiedente_nome',
    COALESCE(p_lavoro->>'priorita', 'normale'),
    COALESCE((p_lavoro->>'dispositivo_semilavorato')::boolean, false),
    p_lavoro->>'note_interne',
    (p_lavoro->>'cliente_id')::uuid,
    NULLIF(p_lavoro->>'paziente_id', '')::uuid,
    NULLIF(p_lavoro->>'tecnico_id', '')::uuid,
    NULLIF(p_lavoro->>'ciclo_id', '')::uuid,
    COALESCE(p_lavoro->>'classe_rischio', 'classe_i'),
    COALESCE((p_lavoro->>'da_conformare')::boolean, true),
    COALESCE(p_lavoro->>'codice_iva', 'N4'),
    COALESCE(p_lavoro->>'natura_iva', 'N4'),
    (p_lavoro->>'data_ingresso')::date,
    p_lavoro->>'colore_scala',
    p_lavoro->>'colore_codice'
  ) RETURNING id INTO v_id;

  -- 🔑 Nessun BEGIN/EXCEPTION qui intorno: se questo INSERT fallisce, l'intera
  -- funzione fallisce e il lavoro NON resta orfano. È il rischio R1, ed è il
  -- motivo per cui questa funzione esiste.
  INSERT INTO lavori_denti (
    laboratorio_id, lavoro_id, fdi, ruolo,
    scala, codice, codice_collo, codice_corpo, codice_incisale, provenienza
  )
  SELECT
    p_lab, v_id,
    (d->>'fdi')::smallint,
    COALESCE(d->>'ruolo', 'elemento'),
    d->>'scala', d->>'codice',
    d->>'codice_collo', d->>'codice_corpo', d->>'codice_incisale',
    COALESCE(d->>'provenienza', 'prescritto')
  FROM jsonb_array_elements(COALESCE(p_denti, '[]'::jsonb)) AS d;

  -- Stessa denormalizzazione della RPC sopra, e per la stessa ragione: la
  -- Dichiarazione di Conformità legge ancora `lavori.denti_coinvolti` fino
  -- all'ondata (c). Vedi il commento esteso in
  -- lavoro_denti_sostituisci_atomica: le due funzioni devono mantenere la
  -- colonna nello STESSO modo, o la scheda mostrerebbe una cosa e il documento
  -- un'altra a seconda di come il lavoro è nato.
  UPDATE lavori SET
    denti_coinvolti = (SELECT array_agg(fdi::text ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND ruolo = 'elemento'),
    denti_mancanti  = (SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND ruolo = 'mancante'),
    denti_impianti  = (SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND ruolo = 'impianto')
   WHERE id = v_id AND laboratorio_id = p_lab;

  RETURN json_build_object('esito', 'ok', 'id', v_id, 'numero_lavoro', v_numero, 'stato', 'ricevuto');
END $$;

-- ============ Permessi: firme identiche alle definizioni ============
REVOKE EXECUTE ON FUNCTION public.lavoro_denti_sostituisci_atomica(uuid,uuid,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb)                          FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.lavoro_denti_sostituisci_atomica(uuid,uuid,jsonb,timestamptz) TO service_role;
GRANT  EXECUTE ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb)                          TO service_role;
```

- [ ] **Step 2: Applica e prova l'atomicità sul database vero (rischio R1)**

```bash
npx supabase db push
```

Dalla console SQL, con un `cliente_id` reale del laboratorio di prova, chiama la funzione con **un dente non valido** e conta i lavori prima e dopo:

```sql
SELECT count(*) FROM lavori;   -- annota il numero

SELECT public.lavoro_crea_atomico(
  (SELECT id FROM laboratori LIMIT 1),
  jsonb_build_object(
    'anno_lavoro', 2026, 'tipo_dispositivo', 'protesi_fissa',
    'descrizione', 'prova atomicità', 'data_consegna_prevista', '2026-08-30',
    'data_ingresso', '2026-07-27',
    'cliente_id', (SELECT id FROM clienti LIMIT 1)
  ),
  '[{"fdi": 19}]'::jsonb            -- 19 non esiste: deve far fallire tutto
);

SELECT count(*) FROM lavori;   -- DEVE essere identico a prima
```

Atteso: errore di violazione di `lavori_denti_fdi_ck`, e **nessun lavoro creato**. Se il conteggio è cresciuto, l'atomicità non c'è e il task non è finito.

- [ ] **Step 2-bis: Prova che la Dichiarazione continua a vedere i denti**

Ripeti la stessa chiamata con denti **validi** e ruoli diversi, poi controlla la denormalizzazione:

```sql
SELECT public.lavoro_crea_atomico(
  (SELECT id FROM laboratori LIMIT 1),
  jsonb_build_object(
    'anno_lavoro', 2026, 'tipo_dispositivo', 'protesi_fissa',
    'descrizione', 'prova denormalizzazione', 'data_consegna_prevista', '2026-08-30',
    'data_ingresso', '2026-07-27', 'cliente_id', (SELECT id FROM clienti LIMIT 1)
  ),
  '[{"fdi":11,"ruolo":"elemento"},{"fdi":13,"ruolo":"elemento"},{"fdi":26,"ruolo":"mancante"}]'::jsonb
);

SELECT denti_coinvolti, denti_mancanti FROM lavori ORDER BY created_at DESC LIMIT 1;
```

Atteso, esattamente: `denti_coinvolti = {11,13}` · `denti_mancanti = {26}`.

🔴 **Se `denti_coinvolti` è NULL, fermati.** È il buco che il taglio in ondate crea: `DdcTemplate.tsx:258` legge quella colonna, e un lavoro creato dopo questa ondata e consegnato prima dell'ondata (c) uscirebbe con una Dichiarazione **priva dei denti** — un elemento dell'Allegato XIII su un documento a valore legale.

- [ ] **Step 3: Rigenera i tipi (le due RPC nuove devono comparire)**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260727120300_lavori_denti_rpc.sql src/types/database.types.ts
git commit -m "feat(db): RPC atomiche per denti (sostituzione integrale) e creazione lavoro"
```

---

## Task 8: `PUT /api/lavori/[id]/denti` — la porta, con il 422 che dice quale dente

Il vincolo del database è la rete; questa route è la porta. Un valore fuori dominio deve tornare **422 col numero incriminato**, mai un 500 dal CHECK (rischio R2).

**Files:**
- Create: `src/app/api/lavori/[id]/denti/route.ts`
- Test: `tests/unit/lavori-denti-put-route.test.ts`

**Interfaces:**
- Consumes: `isFdiValido` (Task 1) · `lavoro_denti_sostituisci_atomica` (Task 7) · `callRpcWithRetry` (`src/lib/supabase/rpc-retry.ts`)
- Produces: `PUT` → `200 { denti, updated_at }` · `422 { error, valore }` · `404` · `409 { error, updated_at }`

- [ ] **Step 1: Scrivi il test che fallisce**

`tests/unit/lavori-denti-put-route.test.ts` — segue il modello di `tests/unit/lavori-id-route.test.ts` per i mock di `getFreshLabContext` / `getServiceClient`; apri quel file e ricalca i suoi `vi.mock`.

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
const fromMock = vi.fn()

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: rpcMock, from: fromMock }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: async () => ({ laboratorioId: 'lab-A', ruolo: 'titolare' }),
}))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PUT } from '@/app/api/lavori/[id]/denti/route'

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori/L1/denti', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const params = { params: Promise.resolve({ id: 'L1' }) }

beforeEach(() => {
  rpcMock.mockReset()
  fromMock.mockReset()
})

describe('PUT /api/lavori/[id]/denti — la porta rifiuta prima del database (R2)', () => {
  it('422 col valore incriminato su un dente che non esiste', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }, { fdi: 19 }] }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).valore).toBe(19)
    expect(rpcMock).not.toHaveBeenCalled()   // non arriva mai al database
  })

  it('422 sulla stringa «2.6», che è il difetto storico', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: '2.6' }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su un ruolo inventato', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11, ruolo: 'inventato' }] }), params)
    expect(res.status).toBe(422)
  })

  it('422 su un dente ripetuto: la lista è un insieme', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }, { fdi: 11 }] }), params)
    expect(res.status).toBe(422)
  })

  it('404 quando la RPC non trova il lavoro — è anche il caso cross-tenant (R4)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'non_trovato' }, error: null })
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(404)
  })

  it('409 col timestamp corrente quando qualcun altro ha scritto nel frattempo', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'conflitto', updated_at: '2026-07-27T10:00:00Z' }, error: null })
    const res = await PUT(richiesta({ atteso_updated_at: '2026-07-27T09:00:00Z', denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(409)
    expect((await res.json()).updated_at).toBe('2026-07-27T10:00:00Z')
  })

  it('ignora laboratorio_id e lavoro_id mandati dal client: si derivano da sessione e URL', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'X' }, error: null })
    await PUT(richiesta({ laboratorio_id: 'lab-B', lavoro_id: 'L9', denti: [{ fdi: 11 }] }), params)
    const args = rpcMock.mock.calls[0][1]
    expect(args.p_lab).toBe('lab-A')
    expect(args.p_lavoro).toBe('L1')
  })

  it('una lista vuota è legittima: vuol dire «nessun dente»', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'X' }, error: null })
    const res = await PUT(richiesta({ denti: [] }), params)
    expect(res.status).toBe(200)
  })

  it('500 se la RPC torna un errore — mai ignorato', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
npx vitest run tests/unit/lavori-denti-put-route.test.ts
```

Atteso: FAIL — modulo `@/app/api/lavori/[id]/denti/route` non risolto.

- [ ] **Step 3: Scrivi la route**

`src/app/api/lavori/[id]/denti/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
import { isFdiValido } from '@/lib/domain/denti-fdi-dominio'

// PUT a SOSTITUZIONE INTEGRALE (spec §4): il client manda la lista che vuole
// vedere, non un delta. Idempotente per costruzione; 6 denti = 1 chiamata.
//
// La validazione vive QUI e non solo nel CHECK del database perché il CHECK
// produrrebbe un 500 illeggibile: chi sbaglia un dente deve sapere QUALE.

const RUOLI = ['elemento', 'mancante', 'impianto', 'escluso', 'incollato'] as const
const PROVENIENZE = ['prescritto', 'eseguito'] as const

type DenteIn = {
  fdi: number
  ruolo?: string
  scala?: string | null
  codice?: string | null
  codice_collo?: string | null
  codice_corpo?: string | null
  codice_incisale?: string | null
  provenienza?: string
}

function errore422(messaggio: string, valore?: unknown) {
  return NextResponse.json({ error: messaggio, valore }, { status: 422 })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })

  const guard = assertLabOperativo(context, 'PUT')
  if (guard) return guard

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!Array.isArray(body.denti)) return errore422('denti deve essere una lista')
  const denti = body.denti as DenteIn[]

  const visti = new Set<number>()
  for (const d of denti) {
    if (!d || typeof d !== 'object') return errore422('ogni dente deve essere un oggetto', d)
    if (!isFdiValido(d.fdi)) return errore422('numero di dente non valido', d.fdi)
    if (visti.has(d.fdi)) return errore422('dente ripetuto: la lista è un insieme', d.fdi)
    visti.add(d.fdi)
    if (d.ruolo !== undefined && !(RUOLI as readonly string[]).includes(d.ruolo)) {
      return errore422('ruolo non valido', d.ruolo)
    }
    if (d.provenienza !== undefined && !(PROVENIENZE as readonly string[]).includes(d.provenienza)) {
      return errore422('provenienza non valida', d.provenienza)
    }
    // Mezza coppia non è mezzo colore (stessa regola di risolviColore e del
    // CHECK lavori_denti_coppia_ck: tre punti, una sola idea).
    if ((d.scala == null) !== (d.codice == null)) {
      return errore422('scala e codice vanno insieme', d.scala ?? d.codice)
    }
  }

  // laboratorio_id e lavoro_id eventualmente presenti nel body si IGNORANO:
  // si derivano da sessione e URL. Il client non sceglie il proprio tenant.
  const svc = getServiceClient()
  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_denti_sostituisci_atomica', {
      p_lab: context.laboratorioId as string,
      p_lavoro: id,
      p_denti: denti.map((d) => ({
        fdi: d.fdi,
        ruolo: d.ruolo ?? 'elemento',
        scala: d.scala ?? null,
        codice: d.codice ?? null,
        codice_collo: d.codice_collo ?? null,
        codice_corpo: d.codice_corpo ?? null,
        codice_incisale: d.codice_incisale ?? null,
        provenienza: d.provenienza ?? 'prescritto',
      })),
      p_atteso_updated_at: (body.atteso_updated_at as string | undefined) ?? null,
    })
  )

  // postgrest NON lancia: l'errore si controlla, non si aspetta in un catch.
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const esito = data as { esito: string; updated_at?: string } | null
  if (esito?.esito === 'non_trovato') {
    // Anche il caso cross-tenant finisce qui: un lavoro di un altro laboratorio
    // non esiste, non è «vietato». 404, non 403 (R4).
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }
  if (esito?.esito === 'conflitto') {
    return NextResponse.json(
      { error: 'Il lavoro è stato modificato da qualcun altro', updated_at: esito.updated_at },
      { status: 409 }
    )
  }
  if (esito?.esito !== 'ok') {
    return NextResponse.json({ error: 'Esito inatteso' }, { status: 500 })
  }

  return NextResponse.json({ denti, updated_at: esito.updated_at })
}
```

- [ ] **Step 4: Esegui il test e verifica che passi**

```bash
npx vitest run tests/unit/lavori-denti-put-route.test.ts
```

Atteso: PASS, 9 test.

- [ ] **Step 5: Commit**

```bash
npx eslint src/
git add src/app/api/lavori/\[id\]/denti/route.ts tests/unit/lavori-denti-put-route.test.ts
git commit -m "feat(lavori): PUT /api/lavori/[id]/denti a sostituzione integrale, 422 col dente incriminato"
```

---

## Task 9: Il POST del lavoro passa dall'RPC atomica

Chiude il rischio **R1** dal lato della creazione: oggi il lavoro nasce con un INSERT e i denti arrivano dopo con una PATCH che, se fallisce, lascia il lavoro in piedi e il dato no.

**Files:**
- Modify: `src/app/api/lavori/route.ts:153-203`
- Test: `tests/unit/lavori-post-atomico.test.ts`

**Interfaces:**
- Consumes: `lavoro_crea_atomico` (Task 7) · `isFdiValido` (Task 1)
- Produces: `POST /api/lavori` accetta in più `denti?: DenteIn[]`, `colore_scala?`, `colore_codice?`. Risposta invariata: `{ lavoro: { id, numero_lavoro, stato } }`.

- [ ] **Step 1: Scrivi il test che fallisce**

`tests/unit/lavori-post-atomico.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
const fromMock = vi.fn(() => ({
  select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-A' } }) }) }) }),
}))

vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ rpc: rpcMock, from: fromMock }) }))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: async () => ({ laboratorioId: 'lab-A', ruolo: 'titolare' }),
  getLabContextWithTimings: async () => ({ context: { laboratorioId: 'lab-A' }, timings: {} }),
}))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '@/app/api/lavori/route'

const CORPO_BASE = {
  cliente_id: 'C1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona',
  data_consegna_prevista: '2026-08-30',
}

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  rpcMock.mockReset()
  rpcMock.mockResolvedValue({
    data: { esito: 'ok', id: 'L1', numero_lavoro: '2026/0042', stato: 'ricevuto' },
    error: null,
  })
})

describe('POST /api/lavori — lavoro e denti nascono insieme o non nascono (R1)', () => {
  it('chiama lavoro_crea_atomico, non un insert separato', async () => {
    await POST(richiesta({ ...CORPO_BASE, denti: [{ fdi: 11, codice: 'A3', scala: 'vita_classical' }] }))
    expect(rpcMock).toHaveBeenCalledWith('lavoro_crea_atomico', expect.objectContaining({ p_lab: 'lab-A' }))
    const args = rpcMock.mock.calls.find((c) => c[0] === 'lavoro_crea_atomico')![1]
    expect(args.p_denti).toEqual([expect.objectContaining({ fdi: 11, codice: 'A3' })])
  })

  it('senza denti funziona come prima: la lista è facoltativa', async () => {
    const res = await POST(richiesta(CORPO_BASE))
    expect(res.status).toBe(201)
    expect((await res.json()).lavoro.numero_lavoro).toBe('2026/0042')
  })

  it('422 su un dente non valido, PRIMA di bruciare un progressivo', async () => {
    const res = await POST(richiesta({ ...CORPO_BASE, denti: [{ fdi: 19 }] }))
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('500 se la RPC torna errore, e nessun lavoro viene dichiarato creato', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    const res = await POST(richiesta(CORPO_BASE))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
npx vitest run tests/unit/lavori-post-atomico.test.ts
```

Atteso: FAIL — la route chiama ancora `genera_progressivo` + `.insert(...)`.

- [ ] **Step 3: Sostituisci il blocco di creazione**

In `src/app/api/lavori/route.ts`, **subito dopo** la validazione delle FK (che resta dov'è, alla riga ~151: valida prima di bruciare progressivi), aggiungi la validazione dei denti:

```typescript
  // Validazione dei denti PRIMA della RPC: un valore fuori dominio deve tornare
  // 422 leggibile, non un 500 dal CHECK — e senza bruciare un progressivo.
  const dentiIn = Array.isArray(body.denti) ? (body.denti as Array<Record<string, unknown>>) : []
  const vistiFdi = new Set<number>()
  for (const d of dentiIn) {
    if (!isFdiValido(d?.fdi)) {
      return NextResponse.json({ error: 'numero di dente non valido', valore: d?.fdi }, { status: 422 })
    }
    if (vistiFdi.has(d.fdi as number)) {
      return NextResponse.json({ error: 'dente ripetuto', valore: d.fdi }, { status: 422 })
    }
    vistiFdi.add(d.fdi as number)
  }
```

con l'import in testa al file:

```typescript
import { isFdiValido } from '@/lib/domain/denti-fdi-dominio'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'
```

Poi **sostituisci** il blocco dalle righe 153 a 203 (da `// Genera progressivo numero lavoro` fino alla chiusura di `if (insertError)`) con:

```typescript
  // Creazione ATOMICA: progressivo + lavoro + denti in una transazione sola.
  // Motivo NORMATIVO, non di comodità (spec §4): un colore perso in silenzio
  // produce una Dichiarazione priva di un contenuto obbligatorio dell'Allegato
  // XIII. Prima di questa modifica i denti arrivavano con una PATCH fail-soft
  // dopo il POST, e se falliva il lavoro esisteva e il dato no.
  const anno = new Date().getFullYear()
  const { data: esitoRpc, error: rpcError } = await callRpcWithRetry(() =>
    svc.rpc('lavoro_crea_atomico', {
      p_lab: labId,
      p_lavoro: {
        anno_lavoro: anno,
        tipo_dispositivo: body.tipo_dispositivo,
        descrizione: body.descrizione,
        data_consegna_prevista: body.data_consegna_prevista,
        ora_consegna: body.ora_consegna ?? null,
        richiedente_nome: body.richiedente_nome ?? null,
        priorita: body.priorita ?? 'normale',
        dispositivo_semilavorato: body.dispositivo_semilavorato ?? false,
        note_interne: body.note_interne ?? null,
        cliente_id: body.cliente_id,
        paziente_id: body.paziente_id ?? null,
        tecnico_id: body.tecnico_id ?? null,
        ciclo_id: body.ciclo_id ?? null,
        classe_rischio: body.classe_rischio ?? 'classe_i',
        da_conformare: body.da_conformare ?? true,
        codice_iva: body.codice_iva ?? 'N4',
        natura_iva: body.natura_iva ?? 'N4',
        data_ingresso: oggiRomaISO(),
        colore_scala: body.colore_scala ?? null,
        colore_codice: body.colore_codice ?? null,
      },
      p_denti: dentiIn,
    })
  )

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const esito = esitoRpc as { esito: string; id?: string; numero_lavoro?: string; stato?: string; dettaglio?: string } | null
  if (esito?.esito !== 'ok' || !esito.id) {
    return NextResponse.json({ error: esito?.dettaglio ?? 'Creazione non riuscita' }, { status: 500 })
  }

  const lavoro = { id: esito.id, numero_lavoro: esito.numero_lavoro!, stato: esito.stato! }
```

⚠️ Il codice **sotto** (generazione delle fasi da ciclo, che resta fail-soft) legge `lavoro.id`: continua a funzionare invariato. Non toccarlo.

- [ ] **Step 4: Esegui il test e verifica che passi**

```bash
npx vitest run tests/unit/lavori-post-atomico.test.ts
npx vitest run tests/unit/lavori-post-ciclo.test.ts tests/unit/api-lavori-tipo-validazione.test.ts
```

Atteso: PASS su tutti. ⚠️ I due test esistenti provano che il resto del contratto del POST non è cambiato: se si accendono, la sostituzione ha spostato qualcosa che doveva restare fermo.

- [ ] **Step 5: Commit**

```bash
npx eslint src/
git add src/app/api/lavori/route.ts tests/unit/lavori-post-atomico.test.ts
git commit -m "feat(lavori): POST /api/lavori crea lavoro e denti in una transazione sola"
```

---

## Task 10: Le sentinelle — cinque nomi escono dall'allowlist

Rischio **R3**: due fonti dello stesso fatto. Chiude anche ⑨: `denti_mancanti` e `denti_impianti` passano oggi **senza alcuna validazione** — stessa classe del «2.6».

**Files:**
- Modify: `src/app/api/lavori/[id]/route.ts:49-58` (commento), `:89-95` (allowlist)
- Test: `tests/unit/lavori-patch-sentinella-denti.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce**

`tests/unit/lavori-patch-sentinella-denti.test.ts` — calco di `tests/unit/lavori-patch-sentinella-cassetta.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { PATCHABLE_FIELDS } from '@/app/api/lavori/[id]/route'

/**
 * Sentinella denti+colore (spec §4, modello invariante D7 e sentinella cassetta).
 * Dal momento in cui esiste `lavori_denti`, questi cinque campi hanno una sola
 * penna: PUT /api/lavori/[id]/denti. Lasciarli patchabili significherebbe due
 * sorgenti dello stesso fatto clinico — la classe di difetto già pagata una
 * volta con `numero_cassetta`.
 */
const SENTINELLE = [
  'denti_coinvolti',
  'colore_dente',
  'colore_collo',
  'colore_corpo',
  'colore_incisale',
] as const

describe('sentinella denti e colore (spec §4)', () => {
  for (const campo of SENTINELLE) {
    it(`${campo} NON è mai patchabile: scrive solo PUT /denti`, () => {
      expect(PATCHABLE_FIELDS).not.toContain(campo)
    })
  }

  it('denti_mancanti e denti_impianti restano fuori: il ruolo li ha assorbiti', () => {
    expect(PATCHABLE_FIELDS).not.toContain('denti_mancanti')
    expect(PATCHABLE_FIELDS).not.toContain('denti_impianti')
  })

  it('la sentinella cassetta e quella D7 restano in piedi', () => {
    expect(PATCHABLE_FIELDS).not.toContain('numero_cassetta')
    expect(PATCHABLE_FIELDS).not.toContain('proposta_dentista')
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
npx vitest run tests/unit/lavori-patch-sentinella-denti.test.ts
```

Atteso: FAIL su 7 dei 8 casi — i campi sono ancora in allowlist (righe 89-95).

- [ ] **Step 3: Togli i sette nomi e scrivi la ragione accanto**

In `src/app/api/lavori/[id]/route.ts`, cancella dalle righe 89-95 le voci `denti_coinvolti`, `denti_mancanti`, `denti_impianti`, `colore_dente`, `colore_collo`, `colore_corpo`, `colore_incisale`, e aggiungi **sopra** `export const PATCHABLE_FIELDS`, accanto alle due sentinelle già presenti:

```typescript
// ═══ SENTINELLA DENTI + COLORE (spec wizard-nuovo-lavoro §4) ═══════════════
// denti_coinvolti, denti_mancanti, denti_impianti, colore_dente, colore_collo,
// colore_corpo, colore_incisale NON devono MAI rientrare in questa allowlist.
// Il dato clinico per-dente vive in `lavori_denti` e si scrive SOLO da
// PUT /api/lavori/[id]/denti (RPC lavoro_denti_sostituisci_atomica).
//
// 🔑 La ragione, come chiede la direttiva D10, è scritta qui e non è «nessun
// writer nel form React»: sono DUE SORGENTI DELLO STESSO FATTO CLINICO. Con le
// colonne ancora scrivibili, la scheda del lavoro e il wizard potrebbero
// dichiarare denti diversi per lo stesso lavoro senza che nulla se ne accorga —
// ed è la classe di difetto già pagata una volta con `numero_cassetta`.
// Bonus chiuso qui: denti_mancanti/denti_impianti passavano SENZA VALIDAZIONE
// (verbale §6-sexies ⑨), stessa classe del difetto «2.6».
// Il ruolo della riga (`elemento|mancante|impianto|escluso|incollato`) li
// assorbe tutti e tre in una colonna sola, tipata.
//
// ⚠️ ATTENZIONE, non è una contraddizione: le colonne `denti_coinvolti`,
// `denti_mancanti`, `denti_impianti` su `lavori` restano VIVE come
// denormalizzazione, scritta dalle due RPC atomiche insieme alle righe di
// `lavori_denti`. La Dichiarazione di Conformità (DdcTemplate.tsx:258) e la
// scheda (SchedaLavoroV3.tsx:286) le leggono ancora fino all'ondata (c).
// «Sentinella» qui vuol dire: nessuno le scrive A MANO. Non: nessuno le
// scrive. È lo stesso regime di `numero_cassetta`.
// Test di regressione: tests/unit/lavori-patch-sentinella-denti.test.ts
// ═══════════════════════════════════════════════════════════════════════════
```

Aggiorna anche il commento della riga 36-39 (`- TabClinica.tsx: denti_coinvolti, …`): quei campi non passano più di lì.

- [ ] **Step 4: Esegui il test e verifica che passi**

```bash
npx vitest run tests/unit/lavori-patch-sentinella-denti.test.ts tests/unit/lavori-patch-sentinella-cassetta.test.ts tests/unit/lavori-patch-invariante-d7.test.ts
```

Atteso: PASS su tutti e tre i file.

- [ ] **Step 5: Commit**

```bash
npx eslint src/
git add src/app/api/lavori/\[id\]/route.ts tests/unit/lavori-patch-sentinella-denti.test.ts
git commit -m "feat(lavori): sentinelle su denti e colore — una penna sola per il dato clinico"
```

---

## Task 11: Il wizard smette di perdere il dato in silenzio

🛑 Questo task e il Task 12 sono **obbligatori nello stesso deploy del Task 10**: appena le colonne escono dall'allowlist, i due scrittori odierni smettono di funzionare.

🔴 **PREREQUISITO TROVATO ESEGUENDO IL TASK 3 — il colore del wizard è testo libero, e il catalogo distingue maiuscole e minuscole.** `PassoPaziente.tsx:94-97` non è una tendina: è una casella con il segnaposto «es. A2», e `crea-lavoro.ts:196` scrive quello che l'utente ha digitato, senza normalizzare. Provato sul database: `A3` si trova, **`a3` no**, `bl` no. Oggi un `a3` minuscolo viene accettato in silenzio; **dal Task 4 in poi** la chiave esterna su `colori_dentali` lo farebbe **fallire di netto** — e al banco si digita di fretta.

➡️ **Questo task deve quindi anche:** portare il codice a maiuscolo e confrontarlo col catalogo **prima** di spedirlo (`A3.5` resta `A3.5`, `a3` diventa `A3`, `bl` diventa `BL`); se dopo la normalizzazione il codice **non** è in catalogo, non mandarlo come colore — il lavoro si crea lo stesso e il colore si corregge dalla scheda, che ha la tendina. **Mai** far fallire la creazione del lavoro per un colore digitato male.
⚠️ La casella resta una casella: **nessun cambiamento visivo** in questa ondata. La tendina è ondata (b).

**Files:**
- Modify: `src/lib/wizard/crea-lavoro.ts:107-223`
- Test: `tests/unit/crea-lavoro-denti.test.ts`

**Interfaces:**
- Produces: `EsitoCreazione.accessoriFalliti` perde il ramo `'dettagli'` → `Array<'foto'>`.

- [ ] **Step 1: Scrivi il test che fallisce**

`tests/unit/crea-lavoro-denti.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { creaLavoroDaWizard } from '@/lib/wizard/crea-lavoro'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const INPUT = {
  cliente: { id: 'C1' },
  tipo: { kind: 'libero' as const, testo: 'Corona' },
  pz: 'PZ-0001',
  alias: '',
  denti: [{ fdi: 11, scala: 'vita_classical', codice: 'A3', provenienza: 'prescritto' as const }],
  foto: null,
  dataConsegna: new Date(2026, 7, 30),
}

function rispostaOk(corpo: unknown) {
  return { ok: true, json: async () => corpo }
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation((url: string) => {
    if (url.startsWith('/api/pazienti?')) return Promise.resolve(rispostaOk({ pazienti: [{ id: 'P1', codice_paziente: 'PZ-0001' }] }))
    if (url === '/api/lavori') return Promise.resolve(rispostaOk({ lavoro: { id: 'L1', numero_lavoro: '2026/0042' } }))
    return Promise.resolve(rispostaOk({}))
  })
})

describe('creaLavoroDaWizard — i denti viaggiano col lavoro, non dopo (R1)', () => {
  it('manda i denti dentro il POST, senza PATCH successiva', async () => {
    await creaLavoroDaWizard(INPUT)
    const chiamataPost = fetchMock.mock.calls.find((c) => c[0] === '/api/lavori')!
    expect(JSON.parse(chiamataPost[1].body).denti).toEqual(INPUT.denti)
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(false)
  })

  it('se il POST fallisce, il lavoro è null: nessun dato a metà', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/pazienti?')) return Promise.resolve(rispostaOk({ pazienti: [{ id: 'P1', codice_paziente: 'PZ-0001' }] }))
      return Promise.resolve({ ok: false, json: async () => ({ error: 'no' }) })
    })
    const esito = await creaLavoroDaWizard(INPUT)
    expect(esito.lavoro).toBeNull()
  })

  it('la foto resta accessoria — ma il fallimento si vede (W22)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/pazienti?')) return Promise.resolve(rispostaOk({ pazienti: [{ id: 'P1', codice_paziente: 'PZ-0001' }] }))
      if (url === '/api/lavori') return Promise.resolve(rispostaOk({ lavoro: { id: 'L1', numero_lavoro: '2026/0042' } }))
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    const esito = await creaLavoroDaWizard({ ...INPUT, foto: new File(['x'], 'p.jpg') })
    expect(esito.lavoro).not.toBeNull()
    expect(esito.accessoriFalliti).toEqual(['foto'])
  })
})
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

```bash
npx vitest run tests/unit/crea-lavoro-denti.test.ts
```

Atteso: FAIL — la firma vuole ancora `elemento: string` / `colore: string` e fa la PATCH.

- [ ] **Step 3: Riscrivi la parte interessata**

In `src/lib/wizard/crea-lavoro.ts`:

**(a)** il tipo dell'esito (riga 44-47) perde il ramo `'dettagli'`:

```typescript
export type EsitoCreazione = {
  lavoro: { id: string; numero_lavoro: string } | null
  // 'dettagli' non c'è più: denti e colore nascono DENTRO la transazione del
  // lavoro (RPC lavoro_crea_atomico). Non possono più fallire da soli.
  accessoriFalliti: Array<'foto'>
}
```

**(b)** la firma (righe 107-117): `elemento: string` e `colore: string` diventano

```typescript
  denti: Array<{
    fdi: number
    ruolo?: 'elemento' | 'mancante' | 'impianto' | 'escluso' | 'incollato'
    scala?: string | null
    codice?: string | null
    provenienza?: 'prescritto' | 'eseguito'
  }>
```

**(c)** il corpo del POST (righe 168-175) riceve la lista:

```typescript
        classe_rischio: corpo.classe_rischio,
        denti,
```

**(d)** l'intero **Passo 4** (righe 184-203, la PATCH fail-soft) si **cancella**, e la riga 185 diventa:

```typescript
  // Da qui in poi il lavoro ESISTE. Denti e colore sono già dentro: l'unico
  // accessorio rimasto è la foto.
  const accessoriFalliti: Array<'foto'> = []
```

**(e)** aggiorna il commento di testa (righe 5-17): i passi sono 4, non 5, e il passo «PATCH dettagli» non esiste più.

⚠️ **Il chiamante:** `grep -rn "accessoriFalliti\|creaLavoroDaWizard" src/components/` e adegua `WizardNuovoLavoro` alla firma nuova — **senza cambiare la grafica**. Il testo dell'avviso, se nomina i «dettagli», ora deve nominare **solo la prescrizione**: è la decisione di Francesco del 27/07 (fallire in silenzio è il difetto, fallire visibilmente è la cura).

- [ ] **Step 4: Esegui i test e verifica che passino**

```bash
npx vitest run tests/unit/crea-lavoro-denti.test.ts
npx vitest run tests/unit/ --silent 2>&1 | tail -20
```

Atteso: il file nuovo verde; **nessuna regressione** altrove. Se un test del wizard si accende sulla firma, adeguarlo è parte di questo task.

- [ ] **Step 5: Commit**

```bash
npx eslint src/
git add src/lib/wizard/crea-lavoro.ts src/components/features/wizard/ tests/unit/crea-lavoro-denti.test.ts
git commit -m "feat(lavori): il wizard manda i denti col lavoro — via la PATCH fail-soft"
```

---

## Task 12: La scheda del lavoro scrive sul nuovo endpoint — grafica invariata

🔑 **Il punto di scrittura NON è `TabClinica.tsx`.** Il componente è controllato (`onChange(u: Partial<Lavoro>)`) e non salva da sé: `LavoroFormClient.tsx:148` lo monta, ma la PATCH la fa **`src/hooks/useLavoroForm.ts:36-80`**, che spedisce `{ ...data }` — cioè **tutto** il lavoro caricato, campi ora sentinella compresi.

🎁 **Il precedente esatto è già lì, tre righe sopra:** `useLavoroForm.ts:51-57` toglie `numero_cassetta` dal corpo *alla sorgente*, col commento «il server l'ha tolta da PATCHABLE_FIELDS (**no-op silenzioso**), ma va tolta ALLA SORGENTE così il PATCH del form non la invia MAI». **Si ricalca quello.** È anche la prova del perché questo task è obbligatorio nello stesso deploy del Task 10: senza, i sette campi partono, il server li scarta **senza dire niente**, e l'utente vede «Salvato» su un dato che non è stato salvato.

**Files:**
- Modify: `src/hooks/useLavoroForm.ts:36-80` (il punto di scrittura)
- Modify: `src/components/features/lavori/LavoroFormClient.tsx:148` (passa l'id e l'`updated_at` al salvataggio dei denti)
- Test: `tests/unit/lavoro-form-denti-endpoint.test.ts`

- [ ] **Step 1: Leggi il precedente da ricalcare**

```bash
sed -n '36,80p' src/hooks/useLavoroForm.ts
sed -n '1,40p' tests/unit/lavoro-form-no-cassetta-patch.test.tsx
```

Il secondo file asserisce **esattamente** questa classe di invariante sul form del lavoro: è il modello del test, non un'ispirazione.

- [ ] **Step 2: Scrivi il test che fallisce**

`tests/unit/lavoro-form-denti-endpoint.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLavoroForm } from '@/hooks/useLavoroForm'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const LAVORO = {
  id: 'L1',
  updated_at: '2026-07-27T09:00:00Z',
  incluso_in_fattura: false,
  denti_coinvolti: ['11'],
  denti_mancanti: [26],
  denti_impianti: [],
  colore_dente: 'A3',
  colore_collo: null,
  colore_corpo: null,
  colore_incisale: null,
  descrizione: 'Corona',
} as never

const SENTINELLE = [
  'denti_coinvolti', 'denti_mancanti', 'denti_impianti',
  'colore_dente', 'colore_collo', 'colore_corpo', 'colore_incisale',
]

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ updated_at: 'X' }) })
})

describe('il form del lavoro scrive i denti sul loro endpoint (sentinelle, Task 10)', () => {
  it('nessuno dei sette campi parte più nella PATCH', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ descrizione: 'Corona zirconia' }) })
    await act(async () => { await result.current.save('L1') })

    const patch = fetchMock.mock.calls.find((c) => c[1]?.method === 'PATCH')!
    const corpo = JSON.parse(patch[1].body)
    for (const campo of SENTINELLE) expect(corpo).not.toHaveProperty(campo)
    expect(corpo.descrizione).toBe('Corona zirconia')   // il resto passa come prima
  })

  it('i denti vanno in PUT /denti, con ruoli tradotti e updated_at per il conflitto', async () => {
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ denti_coinvolti: ['11', '13'] }) })
    await act(async () => { await result.current.save('L1') })

    const put = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/denti'))!
    expect(put[1].method).toBe('PUT')
    const corpo = JSON.parse(put[1].body)
    expect(corpo.atteso_updated_at).toBe('2026-07-27T09:00:00Z')
    expect(corpo.denti).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fdi: 11, ruolo: 'elemento', codice: 'A3', scala: 'vita_classical',
                                  codice_collo: null, codice_corpo: null, codice_incisale: null }),
        expect.objectContaining({ fdi: 13, ruolo: 'elemento' }),
        expect.objectContaining({ fdi: 26, ruolo: 'mancante' }),
      ])
    )
  })

  it('🔴 le tre zone del ceramista NON diventano tendine morte', async () => {
    // Le colonne escono da PATCHABLE_FIELDS col Task 10: se non viaggiassero
    // qui, l'utente sceglierebbe un valore e lo vedrebbe sparire in silenzio.
    // Direttiva permanente: ogni campo si corregge fino alla consegna.
    const { result } = renderHook(() => useLavoroForm({
      ...LAVORO, colore_collo: 'A2', colore_corpo: 'A3', colore_incisale: 'B1',
    } as never))
    act(() => { result.current.update({ denti_coinvolti: ['11'] }) })
    await act(async () => { await result.current.save('L1') })

    const put = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/denti'))!
    expect(JSON.parse(put[1].body).denti[0]).toMatchObject({
      codice_collo: 'A2', codice_corpo: 'A3', codice_incisale: 'B1',
    })
  })

  it('i tre codici fuori scala restano ammessi: l app li offre da sempre', async () => {
    const { result } = renderHook(() => useLavoroForm({ ...LAVORO, colore_dente: 'BL' } as never))
    act(() => { result.current.update({ denti_coinvolti: ['11'] }) })
    await act(async () => { await result.current.save('L1') })

    const put = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/denti'))!
    expect(JSON.parse(put[1].body).denti[0]).toMatchObject({ codice: 'BL', scala: 'fuori_scala' })
  })

  it('🔴 due salvataggi di fila: il secondo NON prende un 409 da solo', async () => {
    // Il difetto che questo test esiste per impedire: la RPC tocca updated_at,
    // quindi il valore in memoria invecchia a ogni salvataggio. Senza
    // riallineamento il secondo salvataggio manda un timestamp vecchio e si
    // becca un conflitto che non esiste — con un utente solo collegato.
    let updatedAtCorrente = '2026-07-27T09:00:00Z'
    fetchMock.mockImplementation((url: string, opts: { body: string }) => {
      if (String(url).endsWith('/denti')) {
        const inviato = JSON.parse(opts.body).atteso_updated_at
        if (inviato !== updatedAtCorrente) {
          return Promise.resolve({ ok: false, status: 409, json: async () => ({ updated_at: updatedAtCorrente }) })
        }
        updatedAtCorrente = new Date(Date.parse(updatedAtCorrente) + 1000).toISOString()
        return Promise.resolve({ ok: true, json: async () => ({ updated_at: updatedAtCorrente }) })
      }
      return Promise.resolve({ ok: true, json: async () => ({ lavoro: { updated_at: updatedAtCorrente } }) })
    })

    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ denti_coinvolti: ['11'] }) })
    await act(async () => { await result.current.save('L1') })
    act(() => { result.current.update({ denti_coinvolti: ['11', '13'] }) })
    await act(async () => { await result.current.save('L1') })

    expect(result.current.saveError).toBeNull()
    const put = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/denti'))
    expect(put).toHaveLength(2)
  })

  it('su 409 il salvataggio segnala l errore e NON prosegue con la PATCH', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).endsWith('/denti')
        ? Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'conflitto' }) })
        : Promise.resolve({ ok: true, json: async () => ({}) })
    )
    const { result } = renderHook(() => useLavoroForm(LAVORO))
    act(() => { result.current.update({ denti_coinvolti: ['11'] }) })
    await act(async () => { await result.current.save('L1').catch(() => {}) })

    expect(result.current.saveError).toBeTruthy()
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(false)
  })
})
```

- [ ] **Step 3: Esegui il test e verifica che fallisca**

```bash
npx vitest run tests/unit/lavoro-form-denti-endpoint.test.ts
```

Atteso: FAIL — `{ ...data }` porta ancora i sette campi e nessun `PUT /denti` viene mai spedito.

- [ ] **Step 4: Sposta la scrittura, non la grafica**

In `src/hooks/useLavoroForm.ts`, dentro `save`, **prima** della `fetch` della PATCH:

```typescript
      // ═══ DENTI E COLORE: endpoint dedicato, PRIMA della PATCH ═══════════
      // Stessa logica di `delete patchBody.numero_cassetta` poche righe sotto:
      // il server li ha tolti da PATCHABLE_FIELDS e li scarterebbe in SILENZIO
      // (`route.ts:259-264`) — l'utente vedrebbe «Salvato» su un dato mai
      // salvato. Si tolgono ALLA SORGENTE e si spediscono dove vivono adesso.
      // Traduzione dal modello vecchio a quello nuovo: tre liste separate
      // diventano righe con un `ruolo`.
      const denti = [
        ...(data.denti_coinvolti ?? []).map(Number).filter(Number.isInteger)
            .map((fdi) => ({ fdi, ruolo: 'elemento' as const })),
        ...(data.denti_mancanti ?? []).map((fdi) => ({ fdi, ruolo: 'mancante' as const })),
        ...(data.denti_impianti ?? []).map((fdi) => ({ fdi, ruolo: 'impianto' as const })),
      ].map((r) => ({
        ...r,
        // Finché l'ondata (b) non offre il colore per dente, il colore del
        // lavoro va sui soli elementi.
        scala: r.ruolo === 'elemento' && data.colore_dente ? scalaDi(data.colore_dente) : null,
        codice: r.ruolo === 'elemento' ? (data.colore_dente || null) : null,
        // 🔴 LE TRE ZONE DEL CERAMISTA VENGONO ANCH'ESSE, e non è un di più.
        // Una stesura precedente di questo piano le lasciava «dove stanno»
        // mentre il Task 10 le toglieva dall'allowlist: risultato, TRE TENDINE
        // MORTE nella scheda clinica — l'utente sceglie un valore, il codice lo
        // cancella prima di spedirlo, e nessun errore compare da nessuna parte.
        // Viola la direttiva permanente «ogni campo del lavoro si corregge,
        // fino alla consegna» (ua-app/CLAUDE.md §9).
        // Le colonne esistono già in `lavori_denti` (§3.1): non c'è niente da
        // inventare, solo da collegare.
        codice_collo:    r.ruolo === 'elemento' ? (data.colore_collo    || null) : null,
        codice_corpo:    r.ruolo === 'elemento' ? (data.colore_corpo    || null) : null,
        codice_incisale: r.ruolo === 'elemento' ? (data.colore_incisale || null) : null,
        // Scritto in laboratorio dalla scheda, non copiato dalla prescrizione:
        // è la distinzione che servirà al precheck di consegna (W20/W22).
        provenienza: 'eseguito' as const,
      }))

      const resDenti = await fetch(`/api/lavori/${id}/denti`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atteso_updated_at: data.updated_at ?? null, denti }),
      })

      if (!resDenti.ok) {
        const json = await resDenti.json().catch(() => ({}))
        const msg = resDenti.status === 409
          ? 'Qualcun altro ha modificato questo lavoro: ricarica la pagina'
          : (json.error ?? `Salvataggio denti fallito (${resDenti.status})`)
        setSaveError(msg)
        throw new Error(msg)   // niente PATCH dopo un salvataggio denti fallito
      }

      // 🔴 OBBLIGATORIO, non una rifinitura. La RPC fa `UPDATE lavori SET
      // updated_at = now()`: da questo istante il valore che abbiamo in memoria
      // è VECCHIO. Senza riallinearlo, il salvataggio SUCCESSIVO manderebbe
      // ancora il timestamp di prima e prenderebbe un 409 — **anche senza
      // nessun altro utente collegato**. Cioè: il primo salvataggio riesce, il
      // secondo no, e il form resta bloccato finché non si ricarica la pagina.
      // Il controllo di concorrenza deve accorgersi dei conflitti VERI, non
      // inciampare sul proprio passo.
      const { updated_at: nuovoUpdatedAt } = await resDenti.json()
      if (nuovoUpdatedAt) setData((prev) => ({ ...prev, updated_at: nuovoUpdatedAt }))
```

⚠️ **Stessa cura dopo la PATCH:** anche `PATCH /api/lavori/[id]` scrive `updated_at` server-side (`route.ts:322`) e lo restituisce nella `select` (`route.ts:329`). Riallinea anche lì, subito dopo il controllo `res.ok`:

```typescript
      const { lavoro: salvato } = await res.json().catch(() => ({ lavoro: null }))
      if (salvato?.updated_at) setData((prev) => ({ ...prev, updated_at: salvato.updated_at }))
```

e, in testa al file, la scala dedotta dal codice — perché la tendina odierna chiede solo il codice:

```typescript
// I 3 codici che TabClinica.tsx:8-14 offre da sempre accanto ai 16 VITA
// classical (verbale §6-sexies ⑦: sono SEDICI, non 19 — T/BL/OM sono fuori
// scala). Questa deduzione muore nell'ondata (b), quando la scala si sceglie.
const FUORI_SCALA = ['T', 'BL', 'OM']
const scalaDi = (c: string) => (FUORI_SCALA.includes(c) ? 'fuori_scala' : 'vita_classical')
```

e i sette campi si tolgono dal corpo della PATCH, accanto a `numero_cassetta`:

```typescript
      delete patchBody.numero_cassetta
      // Sentinelle denti+colore (spec §4): la loro penna è PUT /denti, qui sopra.
      for (const campo of ['denti_coinvolti', 'denti_mancanti', 'denti_impianti',
                           'colore_dente', 'colore_collo', 'colore_corpo', 'colore_incisale'] as const) {
        delete patchBody[campo]
      }
```

⚠️ **Zero modifiche visive.** `TabClinica.tsx` **non si tocca affatto**: continua a chiamare `onChange` come oggi. Se cambia un pixel, il task è sbagliato.
⚠️ **Il 409 non ha una schermata sua:** riusa il canale d'errore già esistente (`saveError`). Una vera gestione del conflitto è ondata (b).

- [ ] **Step 5: Esegui il test e verifica che passi**

```bash
npx vitest run tests/unit/lavoro-form-denti-endpoint.test.ts tests/unit/lavoro-form-no-cassetta-patch.test.tsx
```

Atteso: PASS su entrambi — il secondo prova che la sentinella cassetta non è stata disturbata.

- [ ] **Step 6: Commit**

```bash
npx eslint src/
git add src/hooks/useLavoroForm.ts src/components/features/lavori/ tests/unit/lavoro-form-denti-endpoint.test.ts
git commit -m "feat(lavori): il form del lavoro salva i denti sul loro endpoint, grafica invariata"
```

---

## Task 13: Le prove che nessun test unitario può dare — isolamento e cancellabilità

**R4** (un laboratorio vede i denti di un altro) e **R5** (il tenant diventa incancellabile) si provano **sul database vero**, con richieste ostili. Un mock non può falsificarli.

**Files:**
- Create: `docs/superpowers/plans/evidenze/2026-07-27-ondata-a-isolamento.md`

- [ ] **Step 1: R4 — la porta del tenant, quattro colpi**

Dalla console SQL del progetto, con due laboratori `A` e `B` e un lavoro di `A`:

**(1) Il `service_role` non può cancellare a mano** — è la prova che il REVOKE morde (nota E8):

```sql
SET LOCAL ROLE service_role;
DELETE FROM lavori_denti WHERE laboratorio_id = '<lab-A>';
RESET ROLE;
```
Atteso: `ERROR: permission denied for table lavori_denti`.

**(2) La RPC con il laboratorio sbagliato non scrive niente:**

```sql
SELECT public.lavoro_denti_sostituisci_atomica('<lab-B>', '<lavoro-di-A>', '[{"fdi":11}]'::jsonb, NULL);
SELECT count(*) FROM lavori_denti WHERE lavoro_id = '<lavoro-di-A>';
```
Atteso: `{"esito":"non_trovato"}` e conteggio **invariato**.

**(3) La RLS filtra in lettura** — con un JWT del laboratorio B su PostgREST:

```bash
curl -s "https://iagibumwjstnveqpjbwq.supabase.co/rest/v1/lavori_denti?select=laboratorio_id" \
  -H "apikey: <anon>" -H "Authorization: Bearer <jwt-di-B>" | head
```
Atteso: solo righe con il laboratorio di B — mai una di A.

**(4) La route risponde 404, non 403:** `PUT /api/lavori/<lavoro-di-A>/denti` da una sessione del laboratorio B.
Atteso: **404**. Un 403 direbbe «esiste, ma non puoi» — che è già un'informazione di troppo.

- [ ] **Step 2: R5 — il tenant resta cancellabile**

Su un laboratorio di prova con almeno una riga in `lavori_denti`:

```sql
SELECT public.admin_delete_laboratorio('<lab-di-prova>');
```
Atteso: **nessun errore di foreign key**.

Poi l'asserzione strutturale — nessuna tabella con `laboratorio_id` deve mancare dalla funzione:

```sql
SELECT c.table_name
  FROM information_schema.columns c
 WHERE c.column_name = 'laboratorio_id'
   AND c.table_schema = 'public'
   AND c.table_name NOT IN (
     SELECT unnest(regexp_matches(prosrc, 'DELETE FROM (\w+)', 'g'))
       FROM pg_proc WHERE proname = 'admin_delete_laboratorio'
   );
```
Atteso: **zero righe**, oppure solo tabelle di cui si sa e si scrive perché sono escluse.

- [ ] **Step 3: Archivia le evidenze**

Scrivi `docs/superpowers/plans/evidenze/2026-07-27-ondata-a-isolamento.md` con, per ognuna delle sei prove: il comando eseguito, **l'output reale copiato**, e la data. Niente parafrasi: la prova è l'output.

- [ ] **Step 4: FASE 7 — i tre controlli, con output vero**

```bash
npx tsc --noEmit
```
```bash
npx vitest run
```
```bash
npx next build
```

Atteso: `tsc` senza output · vitest verde (il totale è cresciuto rispetto alla base: annota il numero **letto**, non stimato) · build completata.
🛑 REGOLA ZERO: **mai dichiarare «fatto» senza aver eseguito tutti e tre con output reale.**

- [ ] **Step 5: Commit ed evidenze**

```bash
git add docs/superpowers/plans/evidenze/2026-07-27-ondata-a-isolamento.md
git commit -m "test(lavori): evidenze di isolamento tenant e cancellabilità per l'ondata (a)"
```

- [ ] **Step 6: BP-1 — la memoria, prima di fermarsi**

1. `ua-app/memory/MEMORY.md` → nuova voce: cosa è entrato, i numeri **letti** dall'output, le due RPC nuove nella tabella delle API.
2. `ua-app/docs/roadmap/ROADMAP-UFFICIALE.md` → l'ondata (a) passa a completata; (b) e (c) restano aperte con il loro perimetro.
3. `ua-app/memory/SESSION_ACTIVE.md` → **sostituire**, non appendere. Max 200 token.

⚠️ Non chiudere il lavoro senza questi tre. Il hook `Stop` lo ricorda: non ignorarlo.

---

## Cosa questa ondata NON fa — e va detto

- **Nessun pixel cambia.** Il wizard chiede ancora «es. 2.6» in una casella di testo: la mappa dei denti è ondata (b). Quello che cambia è che quel valore ora **non può più entrare sbagliato**.
- **La Dichiarazione non stampa ancora il colore.** `prescrizione_caratteristiche` resta `null` fino all'ondata (c). Lo **schema** della fotografia però esiste già, ed è deliberato (spec §3.5).
- **Il precheck di consegna non guarda ancora denti e colore.** Il gancio è ondata (c).
- **`gruppo` / `gruppo_ruolo` esistono e restano vuote.** Il ponte è forma riservata, non funzione (spec §3.4).
- **`hex` in `colori_dentali` è NULL.** I valori colorimetrici veri si importano dalla fonte pubblicata quando servono a schermo, ondata (b). Inventarli qui sarebbe un dato falso su un dispositivo medico.

## Due cose verificate perché non vengano ri-dedotte

**R7 (la Dichiarazione non cambia dopo l'emissione) resta soddisfatto anche con questa ondata — verificato, non assunto.** `generate-ddc.ts:41-50` cerca una DdC non annullata per quel lavoro e, se la trova, **restituisce il PDF già su Storage senza rigenerarlo**. Cambiare i denti con `PUT /denti` su un lavoro con DdC emessa non tocca né il record né il file, quindi nemmeno lo `sha256`. La prova R7 resta assegnata all'ondata (c), dove il template inizierà a leggere lo snapshot: è lì che l'invariante può rompersi, non qui.
⚠️ Resta vero il rilievo del verbale ④: l'immutabilità **poggia su un solo appiglio** (il file già su Storage). Questa ondata non lo peggiora, ma nemmeno lo rinforza.

**L'autosave non entra in ciclo su un 409 — verificato.** `useLavoroForm.ts:92-116` rischeda il timer solo quando `data` cambia (`[data, save]`), e un salvataggio fallito **non** cambia `data`. Il conflitto quindi non si ripete da solo. Ma il riallineamento di `updated_at` del Task 12 resta obbligatorio per un'altra ragione, che è più grave: senza, è il **secondo salvataggio ordinario** a prendere un 409 fasullo, con un utente solo collegato.

