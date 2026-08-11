## Task 2 — Il dizionario e i tre test, nell'ordine ministeriale

🔑 **È il task su cui si gioca la correttezza normativa dell'ondata.** Funzioni pure: nessun accesso
al database, quindi tutto provabile.

**File**
- Crea: `src/lib/domain/qualita-costanti.ts` · `src/lib/qualita/classifica.ts` 🆕
- Test: `tests/unit/qualita-classifica.test.ts` 🆕
- Leggi (R-P2): `src/lib/domain/prescrizione-costanti.ts:53-58` — `richiesta_dentista` **è già il
  caso 5**, e il nostro `nuova_esigenza_clinica` **vi rimanda, non lo duplica**

**Interfacce prodotte**
```typescript
export type Natura = 'dato_documentale' | 'difetto_fisico' | 'identificazione_destinatario'
  | 'nuova_esigenza_clinica' | 'nessun_difetto' | 'commerciale' | 'errore_registrazione'
export type Esito = 'nessuna_azione' | 'non_conformita_interna' | 'reclamo' | 'incidente' | 'incidente_grave'
export function naturaDaMotivo(motivo: Motivo): Natura | null   // null solo per 'altro'
export function classifica(f: FattiEvento): Proposta            // { esito, perche, ramoIso, termineOre }
```

- [ ] **Passo 1 — scrivi le prove che devono fallire**

```typescript
import { describe, it, expect } from 'vitest'
import { classifica } from '@/lib/qualita/classifica'

const base = {
  natura: 'difetto_fisico', origine: 'odontoiatra',
  statoDispositivo: 'applicato', potenzialeDiDanno: 'nessuno',
} as const

describe('classifica — ordine ministeriale (D268)', () => {
  it('il difetto segnalato dal dentista PRIMA dell applicazione è un RECLAMO, non lavoro interno', () => {
    // È il caso 2 ribaltato dal panel: il Ministero lo chiama il caso TIPICO di reclamo
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('reclamo')
  })

  it('il danno POSSIBILE fa incidente ANCHE se il dispositivo non era applicato', () => {
    // Il test dell incidente viene PRIMA: invertirlo nasconderebbe l obbligo dell Art. 88
    const p = classifica({ ...base, statoDispositivo: 'consegnato_non_applicato', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  it('il danno ACCERTATO su persona è incidente GRAVE, con il termine dei 15 giorni', () => {
    const p = classifica({ ...base, potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('«da valutare» NON scivola in reclamo: resta candidato incidente', () => {
    // Art. 87(7): nel dubbio si segnala. Un default prudente non deve essere aggirabile
    const p = classifica({ ...base, potenzialeDiDanno: 'da_valutare' })
    expect(p.esito).toBe('incidente')
  })

  it('il difetto visto DAL LABORATORIO, senza danno, è non conformità interna — non reclamo', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'consegnato_non_applicato' })
    expect(p.esito).toBe('non_conformita_interna')
    expect(p.ramoIso).toBe('8.3.3')   // era già uscito dal controllo
  })

  it('il difetto visto in casa PRIMA che esca è §8.3.2, non §8.3.3', () => {
    const p = classifica({ ...base, origine: 'laboratorio_interno', statoDispositivo: 'mai_uscito_dal_lab' })
    expect(p.ramoIso).toBe('8.3.2')
  })

  it('la richiesta clinica nuova NON è una non conformità', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', origine: 'odontoiatra' })
    expect(p.esito).toBe('nessuna_azione')
  })

  it('«non lo so» sullo stato del dispositivo non blocca e non declassa', () => {
    // Francesco, 06/08: «spesso non lo sappiamo». I tre test non chiedono mai se fosse applicato
    const p = classifica({ ...base, statoDispositivo: 'non_noto', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })

  it('ogni proposta porta il PERCHÉ in chiaro', () => {
    expect(classifica(base).perche.length).toBeGreaterThan(10)
  })

  // ⚖️ D276 — le due prove che chiudono il difetto trovato dal controllo pre-volo.
  // Senza queste, l'uscita anticipata dei tre motivi tornerebbe senza far rumore.
  it('🛑 «richiesta clinica nuova» NON scavalca il test dell\'incidente: col danno accertato è incidente GRAVE', () => {
    const p = classifica({ ...base, natura: 'nuova_esigenza_clinica', potenzialeDiDanno: 'accertato' })
    expect(p.esito).toBe('incidente_grave')
    expect(p.termineOre).toBe(15 * 24)
  })

  it('🛑 «registrato per sbaglio» NON scavalca il test dell\'incidente', () => {
    const p = classifica({ ...base, natura: 'errore_registrazione', potenzialeDiDanno: 'possibile' })
    expect(p.esito).toBe('incidente')
  })
})
```

- [ ] **Passo 2 — falle fallire, e CONTA (R-P4)**

```bash
npx vitest run tests/unit/qualita-classifica.test.ts 🆕
```

Atteso: fallimento da modulo non trovato. **Poi metti un abbozzo inerte**
(`export function classifica() { return { esito: 'nessuna_azione', perche: '', ramoIso: '8.3.2', termineOre: null } }`)
e **rilancia**: scrivi nel referto **quante asserzioni si accendono** (`N su 11`). Un rosso da modulo
mancante non prova che le prove provino qualcosa.

- [ ] **Passo 3 — implementa, nell'ordine ministeriale**

```typescript
export function classifica(f: FattiEvento): Proposta {
  // 🛑 D276 — NESSUN MOTIVO SALTA LA FILA. Il test dell'incidente sta PRIMA di ogni
  // esenzione: qui c'era l'uscita anticipata dei tre motivi «non è un problema del
  // dispositivo», e faceva sparire un danno accertato dietro un «nessuna azione».
  // ① IL TEST DELL'INCIDENTE VIENE PRIMA — invertirlo nasconde l'obbligo dell'Art. 88 (D268)
  if (f.potenzialeDiDanno !== 'nessuno') {
    if (f.potenzialeDiDanno === 'accertato')
      return { esito: 'incidente_grave', perche: 'Ci sono state conseguenze accertate sulla salute: va valutata la segnalazione all\'autorità.', ramoIso: '8.3.3', termineOre: 15 * 24 }
    return { esito: 'incidente', perche: 'C\'è un potenziale di danno da valutare: prima di parlare di reclamo va escluso l\'incidente.', ramoIso: '8.3.3', termineOre: null }
  }

  // ①-bis — SOLO ORA le esenzioni (D276): non sono problemi del dispositivo, quindi
  // non entrano nei conteggi del rapporto periodico (D273). Ma ci si arriva solo dopo
  // che l'incidente è stato escluso, mai prima.
  if (f.natura === 'nuova_esigenza_clinica')
    return { esito: 'nessuna_azione', perche: 'Il medico chiede una cosa nuova: il dispositivo era conforme alla prescrizione con cui è stato fatto. Serve una prescrizione nuova, non una correzione.', ramoIso: null, termineOre: null }
  if (f.natura === 'commerciale' || f.natura === 'errore_registrazione')
    return { esito: 'nessuna_azione', perche: 'Non tocca il dispositivo né il documento sanitario.', ramoIso: null, termineOre: null }

  // ② e ③ — coinvolgimento, poi conseguenze (che qui sono già escluse)
  const uscito = f.statoDispositivo !== 'mai_uscito_dal_lab'
  if (uscito && f.origine !== 'laboratorio_interno')
    return { esito: 'reclamo', perche: 'Il dispositivo aveva lasciato il laboratorio e la segnalazione arriva da fuori: per la norma è un reclamo, anche se non è ancora stato applicato.', ramoIso: '8.3.3', termineOre: null }

  return { esito: 'non_conformita_interna', perche: uscito
    ? 'Ce ne siamo accorti noi, a dispositivo già uscito.'
    : 'Ce ne siamo accorti noi, prima che uscisse.', ramoIso: uscito ? '8.3.3' : '8.3.2', termineOre: null }
}
```

- [ ] **Passo 4 — verde, e censisci le forme d'input (R-P4)**

```bash
npx vitest run tests/unit/qualita-classifica.test.ts 🆕
```

Atteso: **11 passate**. Poi scrivi nel referto, per ognuna: valore fuori vocabolario · campo assente ·
`null` · tipo sbagliato → **coperta da quale prova, oppure «non coperta, perché»**.

- [ ] **Passo 5 — salva**

```bash
git add src/lib/domain/qualita-costanti.ts src/lib/qualita/classifica.ts tests/unit/qualita-classifica.test.ts 🆕
git commit -m "feat(qualita): i tre test nell'ordine ministeriale, come funzione pura"
```

---

