# B20 — PSUR/PMS differenziato per classe di rischio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Differenziare l'obbligo di sorveglianza post-vendita MDR per classe di rischio del dispositivo — Classe I → PMS Report (Art. 85, nessuna cadenza fissa), Classe IIa → PSUR biennale (Art. 86), Classe IIb/III → PSUR annuale (Art. 86) — sostituendo l'attuale "PSUR" unico indifferenziato.

**Architecture:** Un record per gruppo-classe per anno nella tabella `psur` esistente (nuova colonna `gruppo_classe`, vincolo UNIQUE esteso). Logica di cadenza/alert calcolata a runtime da una funzione pura (mai persistita), stesso pattern di `isTrialExpiringSoon()`. La route filtra gli aggregati per classe di rischio del dispositivo; la pagina renderizza una sezione per gruppo rilevato.

**Tech Stack:** Next.js 16 App Router (server component + route handler), Supabase (Postgres + RLS), TypeScript, Vitest + Testing Library.

## Global Constraints

- Ogni valore `classe_rischio` fuori dalle 4 classi attese va sempre contato e segnalato, mai scartato in silenzio (dominio a fail-closed obbligatorio — sorveglianza post-vendita MDR).
- Soglie di cadenza in **giorni esatti**: 365gg (annuale), 730gg (biennale) — mai "mesi" ambigui.
- Nessuna stringa "PSUR"/"Art. 86" hardcoded nella sezione `classe_i` — l'etichetta viene sempre da `getStatoSorveglianza().tipoDocumento`.
- Dopo la migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` poi `npx tsc --noEmit` (CLAUDE.md FASE 6b, obbligatorio).
- Verifica finale su tutti e 3: `npx tsc --noEmit`, `npx vitest run`, `npx next build`.
- Spec di riferimento: `docs/superpowers/specs/2026-07-07-b20-psur-pms-classe-rischio-design.md`.

---

### Task 1: Migration — colonna `gruppo_classe` + vincolo UNIQUE esteso

**Files:**
- Create: `supabase/migrations/20260707140000_psur_gruppo_classe.sql`
- Modify: `src/types/database.types.ts` (rigenerato via CLI, non manuale)

**Interfaces:**
- Produce: colonna `psur.gruppo_classe TEXT NOT NULL CHECK (IN ('classe_i','classe_iia','classe_iib_iii'))`, vincolo `psur_lab_anno_gruppo_key UNIQUE (laboratorio_id, anno_riferimento, gruppo_classe)` sostituisce `psur_laboratorio_id_anno_riferimento_key`.

- [ ] **Step 1: Verifica pre-condizione — tabella `psur` ancora vuota**

Query diretta (via Supabase MCP `execute_sql` sul progetto `iagibumwjstnveqpjbwq`, mai `psql` locale):
```sql
SELECT count(*) FROM psur;
```
Expected: `0`. Se non è 0, FERMARSI e tornare al chiamante — la migration `NOT NULL` senza default non è più sicura, serve rivedere lo spec (backfill).

- [ ] **Step 2: Scrivi la migration**

```sql
-- supabase/migrations/20260707140000_psur_gruppo_classe.sql
-- B20: differenzia PSUR (Art. 86) da PMS Report (Art. 85) per classe di
-- rischio del dispositivo. Tabella verificata vuota il 07/07/2026 — NOT
-- NULL senza default sicuro, nessun backfill necessario. Il vincolo UNIQUE
-- passa da "un record per laboratorio/anno" a "un record per
-- laboratorio/anno/gruppo-classe", perché MDR (MDCG 2025-10) richiede
-- documenti distinti e coesistenti per Classe I vs Classe IIa/IIb/III.
-- Rollback non pulito una volta scritte righe multi-gruppo per lo stesso
-- anno — vedi spec §6.

ALTER TABLE psur ADD COLUMN gruppo_classe TEXT NOT NULL
  CHECK (gruppo_classe IN ('classe_i', 'classe_iia', 'classe_iib_iii'));

ALTER TABLE psur DROP CONSTRAINT psur_laboratorio_id_anno_riferimento_key;
ALTER TABLE psur ADD CONSTRAINT psur_lab_anno_gruppo_key
  UNIQUE (laboratorio_id, anno_riferimento, gruppo_classe);

COMMENT ON COLUMN psur.gruppo_classe IS
  'classe_i = PMS Report (Art. 85); classe_iia = PSUR biennale; classe_iib_iii = PSUR annuale (Art. 86)';
```

- [ ] **Step 3: Applica la migration al DB live**

Usa lo strumento MCP Supabase `apply_migration` (project_id `iagibumwjstnveqpjbwq`, name `psur_gruppo_classe`, query = contenuto del file sopra) — non `execute_sql` per DDL. Conferma esplicita dell'utente prima di applicare (tocca schema DB live, MDR-critico).

- [ ] **Step 4: Rigenera i tipi TypeScript**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```
Rimuovi manualmente eventuale riga di messaggio CLI in fondo al file generato (nota CLAUDE.md).

- [ ] **Step 5: Verifica tipi**

```bash
npx tsc --noEmit
```
Expected: 0 errori (il file `route.ts`/`page.tsx` non sono ancora stati toccati in questo task, quindi non devono comparire nuovi errori legati a `gruppo_classe` mancante lato codice applicativo).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260707140000_psur_gruppo_classe.sql src/types/database.types.ts
git commit -m "feat(db): aggiungi gruppo_classe a psur per differenziare PMS/PSUR (B20)"
```

---

### Task 2: Domain types — `GruppoClassePsur` + mapping classe↔gruppo

**Files:**
- Modify: `src/types/domain.ts` (interfaccia `Psur`, righe 71-98)
- Test: `tests/unit/psur-gruppo-classe-map.test.ts`

**Interfaces:**
- Consuma: `ClasseRischio` (già esistente, `src/types/domain.ts:208`)
- Produce: `GruppoClassePsur`, `CLASSE_RISCHIO_TO_GRUPPO: Record<ClasseRischio, GruppoClassePsur>`, `GRUPPO_TO_CLASSI_RISCHIO: Record<GruppoClassePsur, ClasseRischio[]>`, `Psur.gruppo_classe: GruppoClassePsur` — usati da Task 3-9.

- [ ] **Step 1: Scrivi il test di round-trip (fallirà — i tipi non esistono ancora)**

```ts
// tests/unit/psur-gruppo-classe-map.test.ts
import { describe, it, expect } from 'vitest'
import {
  CLASSE_RISCHIO_TO_GRUPPO,
  GRUPPO_TO_CLASSI_RISCHIO,
  type ClasseRischio,
} from '../../src/types/domain'

describe('CLASSE_RISCHIO_TO_GRUPPO / GRUPPO_TO_CLASSI_RISCHIO', () => {
  const TUTTE_LE_CLASSI: ClasseRischio[] = ['classe_i', 'classe_iia', 'classe_iib', 'classe_iii']

  it('ogni classe di rischio ha un gruppo mappato', () => {
    for (const classe of TUTTE_LE_CLASSI) {
      expect(CLASSE_RISCHIO_TO_GRUPPO[classe]).toBeDefined()
    }
  })

  it('round-trip: ogni classe, mappata al suo gruppo, torna inclusa nella lista classi del gruppo', () => {
    for (const classe of TUTTE_LE_CLASSI) {
      const gruppo = CLASSE_RISCHIO_TO_GRUPPO[classe]
      expect(GRUPPO_TO_CLASSI_RISCHIO[gruppo]).toContain(classe)
    }
  })

  it('classe_iib e classe_iii condividono lo stesso gruppo classe_iib_iii', () => {
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_iib).toBe('classe_iib_iii')
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_iii).toBe('classe_iib_iii')
  })

  it('classe_i e classe_iia hanno gruppi propri, non condivisi', () => {
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_i).toBe('classe_i')
    expect(CLASSE_RISCHIO_TO_GRUPPO.classe_iia).toBe('classe_iia')
  })
})
```

- [ ] **Step 2: Esegui e verifica il fallimento**

Run: `npx vitest run tests/unit/psur-gruppo-classe-map.test.ts`
Expected: FAIL — `CLASSE_RISCHIO_TO_GRUPPO` non esportato da `domain.ts`.

- [ ] **Step 3: Estendi `domain.ts`**

In `src/types/domain.ts`, sostituisci il blocco righe 71-98 (interfaccia `Psur` e commento header) con:

```ts
// ============================================================
// PSUR / PMS Report — sorveglianza post-vendita (MDR Art. 85/86)
// ============================================================
export type GruppoClassePsur = 'classe_i' | 'classe_iia' | 'classe_iib_iii'

// Unica fonte di verità del raggruppamento — classe_iib e classe_iii
// condivise nello stesso gruppo/documento per semplicità pratica (stessa
// cadenza annuale), non una lettura letterale di MDCG 2025-10 (che
// raggrupperebbe per uso previsto/materiali/processo). Vedi spec B20 §3.2.
export const CLASSE_RISCHIO_TO_GRUPPO: Record<ClasseRischio, GruppoClassePsur> = {
  classe_i: 'classe_i',
  classe_iia: 'classe_iia',
  classe_iib: 'classe_iib_iii',
  classe_iii: 'classe_iib_iii',
}

export const GRUPPO_TO_CLASSI_RISCHIO: Record<GruppoClassePsur, ClasseRischio[]> = {
  classe_i: ['classe_i'],
  classe_iia: ['classe_iia'],
  classe_iib_iii: ['classe_iib', 'classe_iii'],
}

export interface Psur {
  id: string;
  laboratorio_id: string;
  anno_riferimento: number;
  gruppo_classe: GruppoClassePsur;
  periodo_inizio: string;            // ISO date
  periodo_fine: string;              // ISO date
  // Dati aggregati (calcolati al momento della generazione, filtrati per gruppo_classe)
  totale_dispositivi: number;
  totale_non_conformita: number;
  totale_incidenti: number;
  totale_reclami: number;
  totale_rifacimenti: number;
  // Testi liberi (PRRC compila)
  valutazione_benefici_rischi: string | null;
  conclusioni: string | null;
  misure_correttive: string | null;
  // Documento generato
  pdf_url: string | null;
  pdf_sha256: string | null;
  firmato_at: string | null;
  prrc_nome_snapshot: string | null;
  stato: 'bozza' | 'completato' | 'firmato';
  created_at: string;
  updated_at: string;
}
```

Nota: `ClasseRischio` è definito più sotto nel file (riga 208 originale) — se TypeScript segnala uso-prima-di-dichiarazione, sposta la dichiarazione di `type ClasseRischio` sopra questo blocco (i `type`/`const` a livello di modulo in TS non richiedono ordine per i tipi, ma `CLASSE_RISCHIO_TO_GRUPPO` è un valore `const` che referenzia il tipo, non il valore — nessun problema atteso; verifica comunque con lo step successivo).

- [ ] **Step 4: Esegui e verifica il successo**

Run: `npx vitest run tests/unit/psur-gruppo-classe-map.test.ts`
Expected: 4/4 PASS.

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit`
Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/types/domain.ts tests/unit/psur-gruppo-classe-map.test.ts
git commit -m "feat(domain): aggiungi GruppoClassePsur e mapping classe-rischio<->gruppo (B20)"
```

---

### Task 3: Funzione pura `getStatoSorveglianza`

**Files:**
- Create: `src/lib/utils/sorveglianza-postvendita.ts`
- Test: `tests/unit/sorveglianza-postvendita.test.ts`

**Interfaces:**
- Consuma: `GruppoClassePsur` (Task 2)
- Produce: `getStatoSorveglianza(gruppoClasse, ultimaData, now?): StatoSorveglianza`, `StatoSorveglianza` — usati da Task 8 (componente UI).

- [ ] **Step 1: Scrivi la suite di test (fallirà — il file non esiste)**

```ts
// tests/unit/sorveglianza-postvendita.test.ts
import { describe, it, expect } from 'vitest'
import { getStatoSorveglianza } from '../../src/lib/utils/sorveglianza-postvendita'

describe('getStatoSorveglianza', () => {
  const NOW = new Date('2026-07-07T12:00:00Z')

  it('classe_i, mai creato (null) → PMS Report, mai scaduto, alert info', () => {
    const r = getStatoSorveglianza('classe_i', null, NOW)
    expect(r).toEqual({
      tipoDocumento: 'PMS Report',
      cadenzaLabel: 'Nessuna cadenza fissa (MDR Art. 85) — aggiornare quando necessario',
      scaduto: false,
      alertLivello: 'info',
    })
  })

  it('classe_i, ultimo report 100gg fa (<365) → nessun alert', () => {
    const data = new Date('2026-03-29T12:00:00Z').toISOString() // 100gg prima di NOW
    const r = getStatoSorveglianza('classe_i', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('nessuno')
  })

  it('classe_i, ultimo report 400gg fa (>365) → mai scaduto, ma alert info (promemoria soft)', () => {
    const data = new Date('2025-06-02T12:00:00Z').toISOString() // ~400gg prima
    const r = getStatoSorveglianza('classe_i', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('info')
  })

  it('classe_iia, mai creato (null) → PSUR, scaduto true, alert urgente', () => {
    const r = getStatoSorveglianza('classe_iia', null, NOW)
    expect(r.tipoDocumento).toBe('PSUR')
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })

  it('classe_iia, ultimo report 700gg fa (<730) → non scaduto', () => {
    const data = new Date(NOW.getTime() - 700 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iia', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('nessuno')
  })

  it('classe_iia, ultimo report 731gg fa (>730) → scaduto, urgente', () => {
    const data = new Date(NOW.getTime() - 731 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iia', data, NOW)
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })

  it('classe_iib_iii, mai creato (null) → PSUR, scaduto true, urgente', () => {
    const r = getStatoSorveglianza('classe_iib_iii', null, NOW)
    expect(r.tipoDocumento).toBe('PSUR')
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })

  it('classe_iib_iii, ultimo report 300gg fa (<365) → non scaduto', () => {
    const data = new Date(NOW.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iib_iii', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('nessuno')
  })

  it('classe_iib_iii, ultimo report 366gg fa (>365) → scaduto, urgente', () => {
    const data = new Date(NOW.getTime() - 366 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iib_iii', data, NOW)
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })
})
```

- [ ] **Step 2: Esegui e verifica il fallimento**

Run: `npx vitest run tests/unit/sorveglianza-postvendita.test.ts`
Expected: FAIL — modulo `src/lib/utils/sorveglianza-postvendita.ts` non trovato.

- [ ] **Step 3: Implementa**

```ts
// src/lib/utils/sorveglianza-postvendita.ts
import type { GruppoClassePsur } from '@/types/domain'

export interface StatoSorveglianza {
  tipoDocumento: 'PMS Report' | 'PSUR'
  cadenzaLabel: string
  scaduto: boolean
  alertLivello: 'nessuno' | 'info' | 'urgente'
}

const GIORNO_MS = 24 * 60 * 60 * 1000

export function getStatoSorveglianza(
  gruppoClasse: GruppoClassePsur,
  ultimaData: string | null,
  now: Date = new Date()
): StatoSorveglianza {
  if (gruppoClasse === 'classe_i') {
    const cadenzaLabel = 'Nessuna cadenza fissa (MDR Art. 85) — aggiornare quando necessario'
    if (!ultimaData) {
      return { tipoDocumento: 'PMS Report', cadenzaLabel, scaduto: false, alertLivello: 'info' }
    }
    const giorni = (now.getTime() - new Date(ultimaData).getTime()) / GIORNO_MS
    return {
      tipoDocumento: 'PMS Report',
      cadenzaLabel,
      scaduto: false,
      alertLivello: giorni > 365 ? 'info' : 'nessuno',
    }
  }

  const sogliaGiorni = gruppoClasse === 'classe_iia' ? 730 : 365
  const cadenzaLabel =
    gruppoClasse === 'classe_iia'
      ? 'Almeno ogni 2 anni (MDR Art. 86)'
      : 'Almeno annuale (MDR Art. 86)'

  if (!ultimaData) {
    return { tipoDocumento: 'PSUR', cadenzaLabel, scaduto: true, alertLivello: 'urgente' }
  }

  const giorni = (now.getTime() - new Date(ultimaData).getTime()) / GIORNO_MS
  const scaduto = giorni > sogliaGiorni
  return { tipoDocumento: 'PSUR', cadenzaLabel, scaduto, alertLivello: scaduto ? 'urgente' : 'nessuno' }
}
```

- [ ] **Step 4: Esegui e verifica il successo**

Run: `npx vitest run tests/unit/sorveglianza-postvendita.test.ts`
Expected: 9/9 PASS.

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit` — Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/sorveglianza-postvendita.ts tests/unit/sorveglianza-postvendita.test.ts
git commit -m "feat(qualita): getStatoSorveglianza, cadenza PMS/PSUR per classe (B20)"
```

---

### Task 4: Funzione pura `rilevaGruppi`

**Files:**
- Modify: `src/lib/utils/sorveglianza-postvendita.ts` (aggiunge una seconda funzione allo stesso file — stessa responsabilità di dominio)
- Test: `tests/unit/sorveglianza-postvendita.test.ts` (nuovo `describe` block, stesso file di Task 3)

**Interfaces:**
- Consuma: `CLASSE_RISCHIO_TO_GRUPPO` (Task 2)
- Produce: `rilevaGruppi(classiRischio: string[]): { gruppiRilevati: GruppoClassePsur[]; nonClassificabili: number }` — usato da Task 6 (route GET) e Task 9 (pagina).

- [ ] **Step 1: Aggiungi i test (falliranno — la funzione non esiste)**

Aggiungi in fondo a `tests/unit/sorveglianza-postvendita.test.ts`:

```ts
import { rilevaGruppi } from '../../src/lib/utils/sorveglianza-postvendita'

describe('rilevaGruppi', () => {
  it('nessun lavoro → nessun gruppo rilevato, zero non classificabili', () => {
    expect(rilevaGruppi([])).toEqual({ gruppiRilevati: [], nonClassificabili: 0 })
  })

  it('solo classe_i → un solo gruppo rilevato', () => {
    expect(rilevaGruppi(['classe_i', 'classe_i'])).toEqual({
      gruppiRilevati: ['classe_i'],
      nonClassificabili: 0,
    })
  })

  it('classe_iib e classe_iii → un solo gruppo accorpato classe_iib_iii', () => {
    expect(rilevaGruppi(['classe_iib', 'classe_iii'])).toEqual({
      gruppiRilevati: ['classe_iib_iii'],
      nonClassificabili: 0,
    })
  })

  it('classi miste → gruppi rilevati in ordine fisso classe_i, classe_iia, classe_iib_iii', () => {
    expect(rilevaGruppi(['classe_iii', 'classe_i', 'classe_iia'])).toEqual({
      gruppiRilevati: ['classe_i', 'classe_iia', 'classe_iib_iii'],
      nonClassificabili: 0,
    })
  })

  it('valore imprevisto (stringa vuota/legacy) → mai scartato in silenzio, contato in nonClassificabili', () => {
    expect(rilevaGruppi(['classe_i', '', 'classe_vecchia_non_valida'])).toEqual({
      gruppiRilevati: ['classe_i'],
      nonClassificabili: 2,
    })
  })
})
```

- [ ] **Step 2: Esegui e verifica il fallimento**

Run: `npx vitest run tests/unit/sorveglianza-postvendita.test.ts`
Expected: FAIL sui nuovi test — `rilevaGruppi` non esportata.

- [ ] **Step 3: Implementa**

Aggiungi in fondo a `src/lib/utils/sorveglianza-postvendita.ts`:

```ts
import { CLASSE_RISCHIO_TO_GRUPPO, type ClasseRischio } from '@/types/domain'

const ORDINE_GRUPPI: GruppoClassePsur[] = ['classe_i', 'classe_iia', 'classe_iib_iii']

export function rilevaGruppi(classiRischio: string[]): {
  gruppiRilevati: GruppoClassePsur[]
  nonClassificabili: number
} {
  const mappa = CLASSE_RISCHIO_TO_GRUPPO as Record<string, GruppoClassePsur | undefined>
  const gruppiTrovati = new Set<GruppoClassePsur>()
  let nonClassificabili = 0

  for (const classe of classiRischio) {
    const gruppo = mappa[classe]
    if (gruppo) {
      gruppiTrovati.add(gruppo)
    } else {
      nonClassificabili++
    }
  }

  return {
    gruppiRilevati: ORDINE_GRUPPI.filter((g) => gruppiTrovati.has(g)),
    nonClassificabili,
  }
}
```

Aggiorna l'import in cima al file: sostituisci `import type { GruppoClassePsur } from '@/types/domain'` con `import { CLASSE_RISCHIO_TO_GRUPPO, type GruppoClassePsur } from '@/types/domain'` (un solo import consolidato, `ClasseRischio` non serve qui — rimuovilo se aggiunto per errore).

- [ ] **Step 4: Esegui e verifica il successo**

Run: `npx vitest run tests/unit/sorveglianza-postvendita.test.ts`
Expected: 14/14 PASS (9 di Task 3 + 5 nuovi).

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit` — Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/sorveglianza-postvendita.ts tests/unit/sorveglianza-postvendita.test.ts
git commit -m "feat(qualita): rilevaGruppi, mai scarta classe_rischio non mappata (B20)"
```

---

### Task 5: Estendi il mock helper condiviso con `.in()`

**Files:**
- Modify: `tests/unit/helpers/supabase-chain-mock.ts:26`

**Interfaces:**
- Produce: `createChain(...)` ora supporta anche `.in(col, values)` come passthrough — usato da Task 6/7.

- [ ] **Step 1: Aggiungi `'in'` alla lista dei metodi passthrough**

In `tests/unit/helpers/supabase-chain-mock.ts`, riga 26, cambia:
```ts
const passthroughMethods = [
  'select', 'eq', 'is', 'or', 'order', 'limit', 'not', 'gte', 'lt', 'overrideTypes',
] as const
```
in:
```ts
const passthroughMethods = [
  'select', 'eq', 'in', 'is', 'or', 'order', 'limit', 'not', 'gte', 'lte', 'overrideTypes',
] as const
```
(aggiunto anche `'lte'`, usato dalla route psur per il filtro di periodo — verificato assente anche se `'lt'` già presente, sono metodi diversi).

- [ ] **Step 2: Verifica che i test esistenti restino verdi (nessuna regressione)**

Run: `npx vitest run`
Expected: stesso numero di test passanti di prima di questo task (nessuna modifica comportamentale, solo passthrough aggiuntivi).

- [ ] **Step 3: Commit**

```bash
git add tests/unit/helpers/supabase-chain-mock.ts
git commit -m "test: aggiungi .in()/.lte() al mock chain condiviso (serve a B20)"
```

---

### Task 6: Route `GET /api/qualita/psur` — gruppi rilevati + non classificabili

**Files:**
- Modify: `src/app/api/qualita/psur/route.ts:8-39`
- Test: `tests/unit/qualita-psur-route.test.ts` (nuovo)

**Interfaces:**
- Consuma: `rilevaGruppi` (Task 4)
- Produce: risposta GET `{ psur: Psur[], gruppiRilevati: GruppoClassePsur[], nonClassificabili: number }` — consumata da Task 9 (pagina).

- [ ] **Step 1: Scrivi i test (falliranno — il campo non esiste ancora nella risposta)**

```ts
// tests/unit/qualita-psur-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { GET } from '../../src/app/api/qualita/psur/route'

const LAB_ID = 'lab-1'

function mockTabelle(opts: {
  psurRows: Array<Record<string, unknown>>
  lavoriClassi: Array<{ classe_rischio: string }>
  lavoriClassiError?: { message: string } | null
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'psur') {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: opts.psurRows, error: null }),
          }),
        }),
      }
    }
    if (table === 'lavori') {
      return {
        select: () => ({
          eq: async () =>
            opts.lavoriClassiError
              ? { data: null, error: opts.lavoriClassiError }
              : { data: opts.lavoriClassi, error: null },
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('GET /api/qualita/psur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('nessun lavoro → gruppiRilevati vuoto, nonClassificabili 0', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [] })
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.gruppiRilevati).toEqual([])
    expect(json.nonClassificabili).toBe(0)
  })

  it('lavori di classe mista → gruppi rilevati in ordine fisso', async () => {
    mockTabelle({
      psurRows: [],
      lavoriClassi: [{ classe_rischio: 'classe_iii' }, { classe_rischio: 'classe_i' }],
    })
    const res = await GET()
    const json = await res.json()
    expect(json.gruppiRilevati).toEqual(['classe_i', 'classe_iib_iii'])
  })

  it('classe_rischio non mappata → mai scartata, contata in nonClassificabili', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [{ classe_rischio: 'boh' }] })
    const res = await GET()
    const json = await res.json()
    expect(json.gruppiRilevati).toEqual([])
    expect(json.nonClassificabili).toBe(1)
  })

  it('errore Supabase su query classi rischio → 500, mai un 200 con dati parziali', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [], lavoriClassiError: { message: 'boom' } })
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Esegui e verifica il fallimento**

Run: `npx vitest run tests/unit/qualita-psur-route.test.ts`
Expected: FAIL — `json.gruppiRilevati` è `undefined`.

- [ ] **Step 3: Implementa**

Sostituisci in `src/app/api/qualita/psur/route.ts` le righe 1-39 con:

```ts
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { rilevaGruppi } from '@/lib/utils/sorveglianza-postvendita'

// GET /api/qualita/psur
// Lista PSUR/PMS del laboratorio + gruppi-classe rilevati dai lavori esistenti
export async function GET() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const { data, error } = await svc
    .from('psur')
    .select(
      'id, anno_riferimento, gruppo_classe, periodo_inizio, periodo_fine, totale_dispositivi, totale_non_conformita, totale_incidenti, totale_reclami, totale_rifacimenti, stato, pdf_url, pdf_sha256, firmato_at, prrc_nome_snapshot, created_at, updated_at'
    )
    .eq('laboratorio_id', utente.laboratorio_id)
    .order('anno_riferimento', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: lavoriClassi, error: lavoriClassiError } = await svc
    .from('lavori')
    .select('classe_rischio')
    .eq('laboratorio_id', utente.laboratorio_id)

  if (lavoriClassiError) {
    return NextResponse.json({ error: lavoriClassiError.message }, { status: 500 })
  }

  const { gruppiRilevati, nonClassificabili } = rilevaGruppi(
    (lavoriClassi ?? []).map((l) => l.classe_rischio as string)
  )

  return NextResponse.json({ psur: data ?? [], gruppiRilevati, nonClassificabili })
}
```

(Lascia invariata la funzione `POST` sottostante per ora — viene modificata nel Task 7, che aggiungerà il proprio import `GRUPPO_TO_CLASSI_RISCHIO`/`GruppoClassePsur` all'header. Non aggiungere qui import non ancora usati — il pre-commit hook del progetto include lint-staged/eslint, un import inutilizzato farebbe fallire il commit di questo task.)

- [ ] **Step 4: Esegui e verifica il successo**

Run: `npx vitest run tests/unit/qualita-psur-route.test.ts`
Expected: 4/4 PASS.

- [ ] **Step 5: Verifica tipi**

```bash
npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/qualita/psur/route.ts tests/unit/qualita-psur-route.test.ts
git commit -m "feat(api): GET /api/qualita/psur ritorna gruppiRilevati/nonClassificabili (B20)"
```

---

### Task 7: Route `POST /api/qualita/psur` — filtro per gruppo-classe + fail-closed sugli aggregati

**Files:**
- Modify: `src/app/api/qualita/psur/route.ts:43-161` (funzione `POST`)
- Modify: `tests/unit/qualita-psur-route.test.ts` (nuovo `describe` block)

**Interfaces:**
- Consuma: `GRUPPO_TO_CLASSI_RISCHIO` (Task 2)
- Produce: POST richiede `gruppo_classe` nel body, ritorna 400/409/500/201 come da spec §4.4.

- [ ] **Step 1: Aggiungi i test POST (falliranno — `gruppo_classe` non ancora richiesto/gestito)**

Aggiungi in fondo a `tests/unit/qualita-psur-route.test.ts`:

```ts
import { POST } from '../../src/app/api/qualita/psur/route'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/qualita/psur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockTabellePost(opts: {
  existing: { id: string; stato: string } | null
  lavoriClasseIds: string[]
  lavoriClasseError?: { message: string } | null
  aggregatiError?: boolean
}) {
  let psurCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'psur') {
      psurCallCount++
      if (psurCallCount === 1) {
        // check "existing"
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: opts.existing, error: null }) }),
              }),
            }),
          }),
        }
      }
      // insert
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'psur-nuovo', gruppo_classe: 'classe_i' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'lavori') {
      // Distingue il fetch-ids iniziale (.select('id'), nessuna opzione) dalle
      // query di conteggio aggregato (.select('id', {count, head:true})) —
      // altrimenti un test su "errore nella query di aggregazione" finirebbe
      // per colpire invece il fetch-ids, che avviene prima nel flusso reale.
      let isCountQuery = false
      const chain = {
        select: (_cols: string, selectOpts?: { count?: string; head?: boolean }) => {
          isCountQuery = Boolean(selectOpts?.count)
          return chain
        },
        eq: () => chain,
        in: () => chain,
        not: () => chain,
        gte: () => chain,
        lte: () => chain,
        then: (resolve: (v: unknown) => void) => {
          if (isCountQuery) {
            if (opts.aggregatiError) return resolve({ data: null, error: { message: 'boom' }, count: null })
            return resolve({ data: null, error: null, count: opts.lavoriClasseIds.length })
          }
          if (opts.lavoriClasseError) return resolve({ data: null, error: opts.lavoriClasseError, count: null })
          return resolve({ data: opts.lavoriClasseIds.map((id) => ({ id })), error: null, count: null })
        },
      }
      return chain
    }
    if (table === 'lavori_fasi' || table === 'incidenti_mdr') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        then: (resolve: (v: unknown) => void) =>
          resolve(opts.aggregatiError ? { data: null, error: { message: 'boom' }, count: null } : { data: null, error: null, count: 0 }),
      }
      return chain
    }
    if (table === 'laboratori') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { prrc_nome: 'Mario Rossi' }, error: null }) }) }) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('POST /api/qualita/psur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('gruppo_classe mancante o non valido → 400', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: [] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'boh' }))
    expect(res.status).toBe(400)
  })

  it('gruppo_classe valido, nessun duplicato → 201, insert include gruppo_classe', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: ['l1', 'l2'] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(201)
  })

  it('record già esistente per lab+anno+gruppo → 409', async () => {
    mockTabellePost({ existing: { id: 'psur-1', stato: 'bozza' }, lavoriClasseIds: [] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_iia' }))
    expect(res.status).toBe(409)
  })

  it('errore Supabase nel fetch id lavori per classe → 500, mai un insert con aggregati a 0 mascherati da errore', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: [], lavoriClasseError: { message: 'boom' } })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })

  it('errore Supabase in una query di aggregazione → 500, mai un 201 con conteggio errato', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: ['l1'], aggregatiError: true })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Esegui e verifica il fallimento**

Run: `npx vitest run tests/unit/qualita-psur-route.test.ts`
Expected: FAIL sui nuovi test — `POST` non richiede ancora `gruppo_classe`, nessun controllo di errore sugli aggregati.

- [ ] **Step 3: Implementa**

Aggiungi all'header import di `src/app/api/qualita/psur/route.ts` (dopo l'import di `rilevaGruppi` introdotto nel Task 6):

```ts
import { GRUPPO_TO_CLASSI_RISCHIO, type GruppoClassePsur } from '@/types/domain'
```

Poi sostituisci l'intera funzione `POST` (righe 43-161 dell'originale) con:

```ts
// POST /api/qualita/psur
// Crea nuovo PMS Report/PSUR per (anno, gruppo_classe), aggregati filtrati per classe di rischio
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const labId = utente.laboratorio_id

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // body vuoto — gruppo_classe resterà mancante, gestito sotto come 400
  }

  const gruppo = body.gruppo_classe
  if (typeof gruppo !== 'string' || !(gruppo in GRUPPO_TO_CLASSI_RISCHIO)) {
    return NextResponse.json({ error: 'gruppo_classe non valido' }, { status: 400 })
  }
  const gruppoClasse = gruppo as GruppoClassePsur
  const classiRischio = GRUPPO_TO_CLASSI_RISCHIO[gruppoClasse]

  const anno: number =
    typeof body.anno_riferimento === 'number'
      ? body.anno_riferimento
      : new Date().getFullYear() - 1

  const { data: existing } = await svc
    .from('psur')
    .select('id, stato')
    .eq('laboratorio_id', labId)
    .eq('anno_riferimento', anno)
    .eq('gruppo_classe', gruppoClasse)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: `Documento per l'anno ${anno} e gruppo ${gruppoClasse} già esistente`, psur: existing },
      { status: 409 }
    )
  }

  const inizio = `${anno}-01-01`
  const fine = `${anno}-12-31`

  // Lavori del laboratorio nella classe richiesta (non filtrati per periodo —
  // servono come chiave di join per fasi/incidenti, che hanno le proprie date)
  const { data: lavoriClasseData, error: lavoriClasseError } = await svc
    .from('lavori')
    .select('id')
    .eq('laboratorio_id', labId)
    .in('classe_rischio', classiRischio)

  if (lavoriClasseError) {
    return NextResponse.json({ error: 'Errore nel calcolo degli aggregati' }, { status: 500 })
  }
  const lavoriClasseIds = (lavoriClasseData ?? []).map((l) => l.id)

  const [disp, nc, inc, rifac] = await Promise.all([
    svc
      .from('lavori')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .not('stato', 'eq', 'annullato')
      .in('classe_rischio', classiRischio)
      .gte('data_consegna_effettiva', inizio)
      .lte('data_consegna_effettiva', fine),
    lavoriClasseIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : svc
          .from('lavori_fasi')
          .select('id', { count: 'exact', head: true })
          .eq('laboratorio_id', labId)
          .eq('non_conforme', true)
          .in('lavoro_id', lavoriClasseIds)
          .gte('created_at', `${inizio}T00:00:00`)
          .lte('created_at', `${fine}T23:59:59`),
    lavoriClasseIds.length === 0
      ? Promise.resolve({ count: 0, error: null })
      : svc
          .from('incidenti_mdr')
          .select('id', { count: 'exact', head: true })
          .eq('laboratorio_id', labId)
          .is('deleted_at', null)
          .in('lavoro_id', lavoriClasseIds)
          .gte('data_evento', inizio)
          .lte('data_evento', fine),
    svc
      .from('lavori')
      .select('id', { count: 'exact', head: true })
      .eq('laboratorio_id', labId)
      .eq('is_rifacimento', true)
      .in('classe_rischio', classiRischio)
      .gte('created_at', `${inizio}T00:00:00`)
      .lte('created_at', `${fine}T23:59:59`),
  ])

  if (disp.error || nc.error || inc.error || rifac.error) {
    return NextResponse.json({ error: 'Errore nel calcolo degli aggregati' }, { status: 500 })
  }

  const { data: lab } = await svc
    .from('laboratori')
    .select('prrc_nome')
    .eq('id', labId)
    .single()

  const insertData = {
    laboratorio_id: labId,
    anno_riferimento: anno,
    gruppo_classe: gruppoClasse,
    periodo_inizio: inizio,
    periodo_fine: fine,
    totale_dispositivi: disp.count ?? 0,
    totale_non_conformita: nc.count ?? 0,
    totale_incidenti: inc.count ?? 0,
    totale_reclami: 0, // Non ancora implementato — nessuna tabella reclami
    totale_rifacimenti: rifac.count ?? 0,
    stato: 'bozza' as const,
    prrc_nome_snapshot: lab?.prrc_nome ?? null,
  }

  const { data: psur, error: insertError } = await svc
    .from('psur')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ psur }, { status: 201 })
}
```

- [ ] **Step 4: Esegui e verifica il successo**

Run: `npx vitest run tests/unit/qualita-psur-route.test.ts`
Expected: tutti i test PASS (4 GET + 5 POST = 9).

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit` — Expected: 0 errori (l'import `GRUPPO_TO_CLASSI_RISCHIO`/`GruppoClassePsur` introdotto nel Task 6 è ora usato).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/qualita/psur/route.ts tests/unit/qualita-psur-route.test.ts
git commit -m "feat(api): POST /api/qualita/psur filtra per gruppo-classe, fail-closed sugli aggregati (B20)"
```

---

### Task 8: Componente `PsurGruppoSezione`

**Files:**
- Create: `src/components/features/qualita/PsurGruppoSezione.tsx`
- Test: `tests/unit/PsurGruppoSezione.test.tsx`

**Interfaces:**
- Consuma: `getStatoSorveglianza` (Task 3), `Psur`/`GruppoClassePsur` (Task 2)
- Produce: `<PsurGruppoSezione gruppoClasse psurDelGruppo annoRendiconto />` — usato da Task 9 (pagina).

- [ ] **Step 1: Scrivi i test (falliranno — il componente non esiste)**

```tsx
// tests/unit/PsurGruppoSezione.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PsurGruppoSezione } from '../../src/components/features/qualita/PsurGruppoSezione'
import type { Psur } from '../../src/types/domain'

const ANNO_RENDICONTO = 2025

function psurFixture(overrides: Partial<Psur>): Psur {
  return {
    id: 'psur-1',
    laboratorio_id: 'lab-1',
    anno_riferimento: ANNO_RENDICONTO,
    gruppo_classe: 'classe_iib_iii',
    periodo_inizio: '2025-01-01',
    periodo_fine: '2025-12-31',
    totale_dispositivi: 10,
    totale_non_conformita: 0,
    totale_incidenti: 0,
    totale_reclami: 0,
    totale_rifacimenti: 0,
    valutazione_benefici_rischi: null,
    conclusioni: null,
    misure_correttive: null,
    pdf_url: null,
    pdf_sha256: null,
    firmato_at: null,
    prrc_nome_snapshot: null,
    stato: 'bozza',
    created_at: '2025-12-31T00:00:00Z',
    updated_at: '2025-12-31T00:00:00Z',
    ...overrides,
  }
}

describe('PsurGruppoSezione', () => {
  it('classe_i senza storico → etichetta "PMS Report", mai la stringa "PSUR"', () => {
    render(<PsurGruppoSezione gruppoClasse="classe_i" psurDelGruppo={[]} annoRendiconto={ANNO_RENDICONTO} />)
    expect(screen.getByText(/PMS Report/i)).toBeInTheDocument()
    expect(screen.queryByText(/\bPSUR\b/)).not.toBeInTheDocument()
  })

  it('classe_iia senza storico → alert urgente, etichetta "PSUR"', () => {
    render(<PsurGruppoSezione gruppoClasse="classe_iia" psurDelGruppo={[]} annoRendiconto={ANNO_RENDICONTO} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getAllByText(/PSUR/i).length).toBeGreaterThan(0)
  })

  it('classe_iib_iii con storico recente (periodo_fine quest\'anno) → nessun alert urgente', () => {
    const oggi = new Date().toISOString().slice(0, 10)
    render(
      <PsurGruppoSezione
        gruppoClasse="classe_iib_iii"
        psurDelGruppo={[psurFixture({ periodo_fine: oggi })]}
        annoRendiconto={ANNO_RENDICONTO}
      />
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('bottone Genera include i campi nascosti anno_riferimento e gruppo_classe corretti', () => {
    const { container } = render(
      <PsurGruppoSezione gruppoClasse="classe_i" psurDelGruppo={[]} annoRendiconto={ANNO_RENDICONTO} />
    )
    const annoInput = container.querySelector('input[name="anno_riferimento"]') as HTMLInputElement
    const gruppoInput = container.querySelector('input[name="gruppo_classe"]') as HTMLInputElement
    expect(annoInput.value).toBe(String(ANNO_RENDICONTO))
    expect(gruppoInput.value).toBe('classe_i')
  })

  it('storico renderizza i KPI del record', () => {
    render(
      <PsurGruppoSezione
        gruppoClasse="classe_iib_iii"
        psurDelGruppo={[psurFixture({ totale_incidenti: 3 })]}
        annoRendiconto={ANNO_RENDICONTO}
      />
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui e verifica il fallimento**

Run: `npx vitest run tests/unit/PsurGruppoSezione.test.tsx`
Expected: FAIL — modulo non trovato.

- [ ] **Step 3: Implementa**

```tsx
// src/components/features/qualita/PsurGruppoSezione.tsx
import type { Psur, GruppoClassePsur } from '@/types/domain'
import { getStatoSorveglianza } from '@/lib/utils/sorveglianza-postvendita'

const LABEL_GRUPPO: Record<GruppoClassePsur, string> = {
  classe_i: 'Classe I',
  classe_iia: 'Classe IIa',
  classe_iib_iii: 'Classe IIb / III',
}

const STATO_LABEL: Record<Psur['stato'], string> = {
  bozza: 'Bozza',
  completato: 'Completato',
  firmato: 'Firmato',
}

const STATO_COLOR: Record<Psur['stato'], string> = {
  bozza: 'var(--gold, #D4A843)',
  completato: 'var(--t2, #4A3D33)',
  firmato: 'var(--success, #16A34A)',
}

const STATO_BG: Record<Psur['stato'], string> = {
  bozza: 'hsl(43 65% 55% / 0.12)',
  completato: 'hsl(220 50% 65% / 0.12)',
  firmato: 'hsl(159 63% 49% / 0.12)',
}

const fontFamily = "'DM Sans', system-ui, sans-serif"

function formatDataIT(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function PsurGruppoSezione({
  gruppoClasse,
  psurDelGruppo,
  annoRendiconto,
}: {
  gruppoClasse: GruppoClassePsur
  psurDelGruppo: Psur[] // già filtrato per questo gruppo, ordinato anno_riferimento DESC
  annoRendiconto: number
}) {
  const ultimoRecord = psurDelGruppo[0] ?? null
  const stato = getStatoSorveglianza(gruppoClasse, ultimoRecord?.periodo_fine ?? null)

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ color: 'var(--t1, #1C1916)', fontSize: '16px', fontWeight: 700, fontFamily, margin: 0 }}>
        {stato.tipoDocumento} — {LABEL_GRUPPO[gruppoClasse]}
      </h2>
      <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '12px', fontFamily, margin: '-8px 0 0' }}>
        {stato.cadenzaLabel}
      </p>

      {stato.alertLivello !== 'nessuno' && (
        <div
          role="alert"
          style={{
            background: stato.alertLivello === 'urgente' ? 'rgba(253, 126, 20, 0.10)' : 'rgba(59, 130, 246, 0.08)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: `1px solid ${stato.alertLivello === 'urgente' ? 'rgba(253, 126, 20, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`,
          }}
        >
          <p style={{
            color: stato.alertLivello === 'urgente' ? 'var(--amber, #FD7E14)' : 'var(--c-blue, #3B82F6)',
            fontSize: '14px', fontWeight: 700, fontFamily, margin: '0 0 4px',
          }}>
            {stato.alertLivello === 'urgente'
              ? `${stato.tipoDocumento} ${annoRendiconto} mancante`
              : `${stato.tipoDocumento} — revisione consigliata`}
          </p>
          <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '13px', fontFamily, margin: '0 0 12px', lineHeight: '1.5' }}>
            {stato.cadenzaLabel}. Genera il documento per l&apos;anno {annoRendiconto}.
          </p>
          <form action="/api/qualita/psur" method="POST">
            <input type="hidden" name="anno_riferimento" value={annoRendiconto} />
            <input type="hidden" name="gruppo_classe" value={gruppoClasse} />
            <button
              type="submit"
              style={{
                height: '40px', padding: '0 18px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'var(--gold, #D4A843)', color: 'var(--t1, #1C1916)', fontFamily, fontSize: '14px', fontWeight: 700,
              }}
            >
              Genera {stato.tipoDocumento} {annoRendiconto}
            </button>
          </form>
        </div>
      )}

      {psurDelGruppo.length === 0 ? (
        <div style={{ background: 'var(--surface, #E4DFD9)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '14px', fontFamily, margin: 0 }}>
            Nessun {stato.tipoDocumento} generato
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {psurDelGruppo.map((p) => (
            <div key={p.id} style={{ background: 'var(--surface, #E4DFD9)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--t1, #1C1916)', fontSize: '17px', fontWeight: 700, fontFamily }}>
                  {stato.tipoDocumento} {p.anno_riferimento}
                </span>
                <span style={{
                  color: STATO_COLOR[p.stato], background: STATO_BG[p.stato], fontSize: '11px', fontWeight: 700,
                  fontFamily, padding: '3px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {STATO_LABEL[p.stato]}
                </span>
              </div>
              <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '13px', fontFamily, margin: '0 0 10px' }}>
                {formatDataIT(p.periodo_inizio)} — {formatDataIT(p.periodo_fine)}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <KpiChip label="Dispositivi" value={p.totale_dispositivi} />
                <KpiChip label="Non conformita" value={p.totale_non_conformita} alert={p.totale_non_conformita > 0} />
                <KpiChip label="Incidenti" value={p.totale_incidenti} alert={p.totale_incidenti > 0} />
                <KpiChip label="Rifacimenti" value={p.totale_rifacimenti} alert={p.totale_rifacimenti > 0} />
              </div>
              {p.prrc_nome_snapshot && (
                <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '12px', fontFamily, margin: '0 0 10px' }}>
                  PRRC: {p.prrc_nome_snapshot}
                  {p.firmato_at ? ` — firmato il ${formatDataIT(p.firmato_at.slice(0, 10))}` : ''}
                </p>
              )}
              {p.pdf_url ? (
                <a href={p.pdf_url} target="_blank" rel="noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--c-amber, #F59E0B)',
                  fontSize: '13px', fontWeight: 600, fontFamily, textDecoration: 'none',
                }}>
                  Scarica PDF →
                </a>
              ) : (
                <span style={{ color: 'var(--t2, #4A3D33)', fontSize: '12px', fontFamily, fontStyle: 'italic' }}>
                  PDF non ancora generato
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function KpiChip({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div style={{
      background: 'var(--elv, #EDEDEA)', borderRadius: '8px', padding: '6px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px',
    }}>
      <span style={{
        color: alert && value > 0 ? 'var(--primary, #D90012)' : 'var(--t1, #1C1916)',
        fontSize: '16px', fontWeight: 700, fontFamily,
      }}>
        {value}
      </span>
      <span style={{ color: 'var(--t2, #4A3D33)', fontSize: '10px', fontFamily, textAlign: 'center', lineHeight: '1.2' }}>
        {label}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Esegui e verifica il successo**

Run: `npx vitest run tests/unit/PsurGruppoSezione.test.tsx`
Expected: 5/5 PASS.

- [ ] **Step 5: Verifica tipi**

Run: `npx tsc --noEmit` — Expected: 0 errori.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/qualita/PsurGruppoSezione.tsx tests/unit/PsurGruppoSezione.test.tsx
git commit -m "feat(qualita): componente PsurGruppoSezione, etichetta sempre da getStatoSorveglianza (B20)"
```

---

### Task 9: Riscrivi `qualita/psur/page.tsx` — orchestrazione multi-gruppo

**Files:**
- Modify: `src/app/(app)/qualita/psur/page.tsx` (intero file)

**Interfaces:**
- Consuma: `rilevaGruppi` (Task 4), `PsurGruppoSezione` (Task 8), risposta GET estesa (Task 6) — letta qui via query diretta Supabase (pattern server component esistente, non fetch HTTP)

Nessun test dedicato per questo task: la pagina è un componente server "sottile" che orchestra dati già coperti da `rilevaGruppi`/`getStatoSorveglianza`/`PsurGruppoSezione` (tutti testati nei task precedenti) — stesso principio già applicato in questo progetto per altre pagine server di sola composizione (es. integrazione `CicloNuovoSheet` in `cicli-produzione/page.tsx`).

- [ ] **Step 1: Sostituisci l'intero file**

```tsx
// src/app/(app)/qualita/psur/page.tsx
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'
import type { Psur } from '@/types/domain'
import { rilevaGruppi } from '@/lib/utils/sorveglianza-postvendita'
import { PsurGruppoSezione } from '@/components/features/qualita/PsurGruppoSezione'

export const metadata = { title: 'Sorveglianza post-vendita — Qualita MDR' }

export default async function PsurPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) return null

  const { data: psurList } = await svc
    .from('psur')
    .select(
      'id, anno_riferimento, gruppo_classe, periodo_inizio, periodo_fine, totale_dispositivi, totale_non_conformita, totale_incidenti, totale_reclami, totale_rifacimenti, stato, pdf_url, firmato_at, prrc_nome_snapshot'
    )
    .eq('laboratorio_id', utente.laboratorio_id)
    .order('anno_riferimento', { ascending: false })

  const { data: lavoriClassi } = await svc
    .from('lavori')
    .select('classe_rischio')
    .eq('laboratorio_id', utente.laboratorio_id)

  const { gruppiRilevati, nonClassificabili } = rilevaGruppi(
    (lavoriClassi ?? []).map((l) => l.classe_rischio as string)
  )

  const annoRendiconto = new Date().getFullYear() - 1
  const fontFamily = "'DM Sans', system-ui, sans-serif"

  return (
    <PageWrapper>
      <AppHeader
        title="Sorveglianza post-vendita"
        subtitle="PMS Report (Classe I) e PSUR (Classe IIa/IIb/III) — MDR Art. 85/86"
        backHref="/qualita"
      />

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Link
          href="/qualita"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--t2, #4A3D33)',
            fontSize: '13px', textDecoration: 'none', fontFamily, marginBottom: '4px',
          }}
        >
          ← Qualita
        </Link>

        {nonClassificabili > 0 && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.10)',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            <p style={{ color: 'var(--c-red, #EF4444)', fontSize: '13px', fontWeight: 700, fontFamily, margin: 0 }}>
              {nonClassificabili} lavor{nonClassificabili === 1 ? 'o' : 'i'} non classificabil{nonClassificabili === 1 ? 'e' : 'i'} per classe di rischio — verificare i dati anagrafici.
            </p>
          </div>
        )}

        {gruppiRilevati.length === 0 ? (
          <div style={{ background: 'var(--surface, #E4DFD9)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '14px', fontFamily, margin: 0 }}>
              Nessun dispositivo classificato — nessun obbligo di sorveglianza post-vendita rilevato ancora.
            </p>
          </div>
        ) : (
          gruppiRilevati.map((gruppo) => (
            <PsurGruppoSezione
              key={gruppo}
              gruppoClasse={gruppo}
              psurDelGruppo={(psurList ?? []).filter((p) => p.gruppo_classe === gruppo) as Psur[]}
              annoRendiconto={annoRendiconto}
            />
          ))
        )}
      </div>
    </PageWrapper>
  )
}
```

- [ ] **Step 2: Verifica tipi**

Run: `npx tsc --noEmit` — Expected: 0 errori.

- [ ] **Step 3: Verifica criterio di accettazione — nessuna etichetta per-gruppo hardcoded in questo file**

Run: `grep -n "PSUR\|Art\. 86" "src/app/(app)/qualita/psur/page.tsx"`
Expected: **un solo match**, la riga del `subtitle` dell'`AppHeader` ("PMS Report (Classe I) e PSUR (Classe IIa/IIb/III) — MDR Art. 85/86") — testo di orientamento generale sulla pagina, corretto perché descrive entrambi i documenti realmente coperti, non un'etichetta di sezione. L'acceptance criterion vero e proprio ("mai PSUR nella sezione classe_i") è già verificato dai test di `PsurGruppoSezione` (Task 8) — nessuna sezione per-gruppo in questo file usa stringhe fisse, tutte le etichette vengono da `PsurGruppoSezione`/`getStatoSorveglianza`. Se il grep produce più di un match, individua la riga aggiuntiva e correggila prima di committare.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/qualita/psur/page.tsx"
git commit -m "feat(qualita): pagina sorveglianza post-vendita multi-gruppo, mai PSUR hardcoded (B20)"
```

---

### Task 10: Verifica finale e chiusura

**Files:** nessuno (solo comandi di verifica)

- [ ] **Step 1: TypeScript**

```bash
npx tsc --noEmit
```
Expected: 0 errori.

- [ ] **Step 2: Suite di test completa**

```bash
npx vitest run
```
Expected: tutti i test passano (baseline pre-B20 + i nuovi test di Task 2/3/4/6/7/8, verificare il totale nell'output).

- [ ] **Step 3: Build production**

```bash
npx next build
```
Expected: compilazione TypeScript pulita, route `/qualita/psur` e `/api/qualita/psur` presenti nel manifest.

- [ ] **Step 4: DS compliance (se lo script esiste nel progetto)**

```bash
./scripts/check-ds-compliance.sh 2>/dev/null || true
```

- [ ] **Step 5: Aggiorna memoria (BP-1, obbligatorio da CLAUDE.md)**

Aggiorna `memory/MEMORY.md` (nuova sezione in testa) e `docs/roadmap/ROADMAP-UFFICIALE.md`/`docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (B20 → ✅ RISOLTO, con riferimento a spec/piano/commit) seguendo lo stile delle voci precedenti (B17, B13, ecc.).

- [ ] **Step 6: QA browser manuale (FASE 9, CLAUDE.md)**

Su lab E2E isolato (mai il lab Filippo): creare lavori di test con `classe_rischio` diverse (almeno `classe_i` e `classe_iib`), verificare che `/qualita/psur` mostri le sezioni corrette con etichette corrette, generare un PMS Report e un PSUR distinti per lo stesso anno e verificare che coesistano senza conflitto (nessun 409 tra gruppi diversi), verificare 390/768/1280px light/dark. Rimuovere i dati di test a fine sessione.

---

## Riepilogo copertura spec

| Sezione spec | Task |
|---|---|
| §4.1 Migration | Task 1 |
| §4.2 Domain types | Task 2 |
| §4.3 getStatoSorveglianza | Task 3 |
| Rilevamento gruppi (§4.4) | Task 4 |
| §4.4 Route GET | Task 6 |
| §4.4 Route POST + fail-closed | Task 7 |
| §4.5 UI (componente + pagina) | Task 8, 9 |
| §6 Rollback | Documentato in Task 1 (commento migration) |
| §7 Testing | Task 2-9 (ogni task porta i propri test) |
