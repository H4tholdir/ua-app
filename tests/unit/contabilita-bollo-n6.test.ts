// tests/unit/contabilita-bollo-n6.test.ts
// N6 (decisione C, spec 2026-07-14): il dovuto PRE-FATTURA è tenuto
// sull'imponibile SENZA bollo; il bollo di €2 (imponibile > 77,47€) è
// un'imposta documentale che matura con l'EMISSIONE e finisce solo in
// fatture.totale. La differenza di €2 tra pre-fattura e fatturato è
// INTENZIONALE, non un drift.
//
// Questo test congela la decisione: se un domani qualcuno "correggesse" il
// salto piegando il bollo dentro prezzoEffettivoLavoro (opzione A fatta male),
// questo test rompe e punta alla spec.
import { describe, it, expect } from 'vitest'
import { prezzoEffettivoLavoro } from '@/lib/domain/prezzo-lavoro'

// Regola bollo, unica fonte in generate-xml.ts (qui replicata SOLO per
// asserire il contrasto pre/post — NON è codice di produzione).
const bolloAtteso = (imponibile: number) => (imponibile > 77.47 ? 2.0 : 0)

describe('N6 — il bollo NON entra nel dovuto pre-fattura', () => {
  it('prezzoEffettivoLavoro (dovuto pre-fattura) resta bollo-free anche sopra soglia', () => {
    // Lavoro con righe che sommano a 100 (> 77,47): imponibile puro.
    const lavoro = {
      prezzo_unitario: 999,
      lavorazioni: [{ importo: 60 }, { importo: 40 }],
    } as never
    const dovutoPreFattura = prezzoEffettivoLavoro(lavoro)
    expect(dovutoPreFattura).toBe(100) // nessun +2: il bollo non esiste ancora
  })

  it('il totale fattura per lo stesso imponibile include il bollo: salto di €2 intenzionale', () => {
    const imponibile = prezzoEffettivoLavoro({
      prezzo_unitario: null,
      lavorazioni: [{ importo: 100 }],
    } as never)
    const totaleFattura = imponibile + bolloAtteso(imponibile)
    expect(imponibile).toBe(100)          // pre-fattura (contabilità)
    expect(totaleFattura).toBe(102)       // post-fattura (fatture.totale)
    expect(totaleFattura - imponibile).toBe(2) // il salto documentato
  })

  it('sotto soglia (≤ 77,47€) non c\'è bollo: nessun salto', () => {
    const imponibile = prezzoEffettivoLavoro({
      prezzo_unitario: null,
      lavorazioni: [{ importo: 50 }],
    } as never)
    expect(imponibile + bolloAtteso(imponibile)).toBe(50)
  })
})
