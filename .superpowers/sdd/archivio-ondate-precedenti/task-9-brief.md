## Task 9: `EtichettaTemplate` — il codice paziente per primo

**Files:**
- Modify: `src/components/features/pdf/EtichettaTemplate.tsx:117-124`
- Test: `tests/unit/etichetta-paziente.test.ts` (**nuovo**)

**Interfaces:**
- Consumes: nulla di nuovo.
- Produces: nulla a valle.

**Il difetto (riserva G1):** dei tre template che stampano il paziente, l'Etichetta è **l'unico che non passa mai da `codice_paziente`**. `IFUTemplate.tsx:169-176` e `RicevutaConsegnaTemplate.tsx:186-193` hanno **la stessa identica funzione** `codiceGDPR`, che prova il codice per primo. Qui si allinea l'Etichetta a loro — **ricopiando il loro ordine, non inventandone uno**.

⚠️ **Cosa cambia in un documento:** oggi l'Etichetta stampa lo snapshot (che nessuno popola, `spec §7`) e ricade su `cognome` + iniziale del nome. Domani stampa `PAZ-<codice>` quando il codice c'è — cioè **meno** dato personale, non di più. È un miglioramento di minimizzazione, non una perdita di informazione utile: il codice è l'identificatore che il laboratorio usa davvero.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/unit/etichetta-paziente.test.ts`. Estrarre la funzione da testare **esportandola** dal template (oggi è privata):

```typescript
import { describe, it, expect } from 'vitest'
import { pazienteEtichetta } from '@/components/features/pdf/EtichettaTemplate'
import type { LavoroDettaglio } from '@/types/domain'

const l = (p: Partial<LavoroDettaglio>) => p as LavoroDettaglio

describe('EtichettaTemplate — il paziente, allineato a IFU e Ricevuta (G1)', () => {
  it('il CODICE viene per primo, come negli altri due template', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: 'BAGHERIA GIUSEPPE',
      paziente: { codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: 'Bagheria' },
    }))).toBe('PAZ-PZ-0042')
  })

  it('senza codice: iniziale del nome + cognome (anonimizzazione parziale)', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: null,
      paziente: { codice_paziente: null, nome: 'Giuseppe', cognome: 'Bagheria' },
    }))).toBe('G. Bagheria')
  })

  it('senza codice e senza nome/cognome: si ricade sullo snapshot, abbreviato', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: 'BAGHERIA GIUSEPPE',
      paziente: { codice_paziente: null, nome: null, cognome: null },
    }))).toBe('B. GIUSEPPE')
  })

  it('niente di niente → la stessa sentinella degli altri due', () => {
    expect(pazienteEtichetta(l({ paziente_nome_snapshot: null, paziente: null })))
      .toBe('N.A. (GDPR)')
  })
})
```

- [ ] **Step 2: Eseguire e verificare che FALLISCA**

```bash
npx vitest run tests/unit/etichetta-paziente.test.ts
```

Atteso: FAIL — `pazienteEtichetta` non è esportata.

- [ ] **Step 3: Implementare**

⚠️ **Leggere prima `src/components/features/pdf/IFUTemplate.tsx:169-185`** e ricopiarne il corpo verbatim. Sostituire `inizialeCognomePaziente` (`:117-124`) con:

```typescript
/**
 * Il paziente sull'etichetta. Allineata verbatim a `codiceGDPR` di
 * IFUTemplate.tsx:169-185 e RicevutaConsegnaTemplate.tsx:186-193 (riserva
 * G1): dei tre template questo era l'UNICO che non passava mai da
 * `codice_paziente`, e stampava direttamente cognome + iniziale. Ora l'ordine
 * è lo stesso ovunque: prima il codice pseudonimizzato, poi (solo se manca)
 * l'iniziale + cognome, poi lo snapshot abbreviato.
 *
 * Esportata per il test; il template la usa internamente.
 */
export function pazienteEtichetta(lavoro: LavoroDettaglio): string {
  if (lavoro.paziente?.codice_paziente) return `PAZ-${lavoro.paziente.codice_paziente}`
  if (lavoro.paziente) {
    const iniziale = lavoro.paziente.nome ? lavoro.paziente.nome.charAt(0).toUpperCase() + '.' : ''
    const cognome = lavoro.paziente.cognome ?? ''
    if (iniziale || cognome) return `${iniziale} ${cognome}`.trim()
  }
  if (lavoro.paziente_nome_snapshot) {
    const parts = lavoro.paziente_nome_snapshot.split(' ')
    if (parts.length > 1) return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(' ')}`
    return lavoro.paziente_nome_snapshot
  }
  return 'N.A. (GDPR)'
}
```

Aggiornare il punto di consumo nel corpo del componente (cercare `inizialeCognomePaziente(` e sostituire con `pazienteEtichetta(`).

- [ ] **Step 4: Eseguire e verificare che PASSI**

```bash
npx vitest run tests/unit/etichetta-paziente.test.ts
```

- [ ] **Step 5: Lint + commit**

```bash
npx eslint src/components/features/pdf/EtichettaTemplate.tsx
git add src/components/features/pdf/EtichettaTemplate.tsx tests/unit/etichetta-paziente.test.ts
git commit -m "fix(pdf): l'etichetta passa dal codice paziente come IFU e ricevuta"
```

---

