## Task 2 — Gli accenti nella Dichiarazione di Conformità (sei punti)

**Files:**
- Modify: `src/components/features/pdf/DdcTemplate.tsx:292, 294, 326, 446, 486, 514`
- Test: `tests/unit/ddc-pdf-content.test.ts:111` (da girare) + un caso nuovo

**Interfaces:** nessuna firma cambia. Solo stringhe rese.

- [ ] **Step 1: gira il test che oggi FISSA il refuso**

In `tests/unit/ddc-pdf-content.test.ts`, sostituisci il test a riga 109-112 con:

```ts
  it('il titolo porta l\'accento: «DICHIARAZIONE DI CONFORMITÀ»', () => {
    // textTransform:'uppercase' — react-pdf rende le maiuscole nel PDF, À compresa
    // (provato: scripts/tmp/sonda-accenti.tsx). Questo test PRETENDE l'accento:
    // fino al 03/08/2026 pretendeva il refuso, quindi la regressione sarebbe
    // tornata silenziosa in entrambe le direzioni.
    expect(pdfText).toContain('DICHIARAZIONE DI CONFORMITÀ')
    expect(pdfText).not.toContain('DICHIARAZIONE DI CONFORMITA ')
  })

  it('l\'etichetta della firma porta l\'accento', () => {
    expect(pdfText).toContain('Responsabile della Conformità (PRRC)')
  })

  it('il titolo del §7 porta l\'accento', () => {
    expect(pdfText).toContain('§7 — Dichiarazione di Conformità')
  })
```

- [ ] **Step 2: esegui e CONTA quanti rossi si accendono (R-P4)**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Atteso: **3 rossi su 3 asserzioni nuove**, con messaggi che mostrano il testo senza accento.
🛑 Scrivi il numero che hai visto nel referto del task. Se i rossi sono meno di 3, una delle asserzioni non
misura quello che crede: fermati e riferisci.

- [ ] **Step 3: correggi le sei stringhe**

In `src/components/features/pdf/DdcTemplate.tsx`, una alla volta:

```tsx
// :292
      title={`Dichiarazione di Conformità ${ddc.numero_ddc ?? ''}`}
// :294
      subject="Dichiarazione di Conformità MDR 2017/745"
// :326
          <Text style={styles.titolo}>Dichiarazione di Conformità</Text>
// :446
                : (ddc.sostanze_tessuti_dettaglio ?? 'Sì — vedere documentazione allegata')
// :486
          <Text style={styles.sectionTitle}>§7 — Dichiarazione di Conformità</Text>
// :514
            <Text style={styles.firmaLabel}>Responsabile della Conformità (PRRC)</Text>
```

⚠️ `:446` sta dentro un ternario: **l'ordine dei rami non cambia**, cambia solo la stringa del ramo
`?? '…'`. Rileggi le righe 444-448 dopo la modifica e verifica di non aver invertito nulla.

- [ ] **Step 4: verde**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Atteso: **tutti verdi**.

- [ ] **Step 5: copri la riga del «Sì», che oggi NON ha rete**

`:446` si raggiunge solo con `contiene_sostanze_o_tessuti === true`, e la fixture del file lo mette a
`false` (riga 62): oggi **zero asserzioni** toccano quella riga. Aggiungi in fondo al file:

```ts
describe('DdcTemplate — sostanze o tessuti presenti (ramo non coperto fino al 03/08/2026)', () => {
  it('rende «Sì» con l\'accento quando il dispositivo contiene sostanze o tessuti', async () => {
    const element = createElement(DdcTemplate, {
      lavoro: LAVORO_FIXTURE,
      lab: LAB_FIXTURE,
      ddc: { ...DDC_FIXTURE, contiene_sostanze_o_tessuti: true, sostanze_tessuti_dettaglio: null },
    })
    const buffer = await renderPdfDocument(element)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    expect(result.text).toContain('Sì — vedere documentazione allegata')
  }, 30_000)
})
```

⚠️ `DDC_FIXTURE` è dichiarata `const` a livello di modulo: **usala con lo spread, non modificarla** — le
altre prove del file leggono `pdfText` costruito da quella fixture in `beforeAll`.

- [ ] **Step 6: esegui il caso nuovo**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Atteso: **verde**, compreso il caso nuovo.
🛑 Prova che morde: cambia a mano `'Sì —'` in `'Si —'` nel template, rilancia, **deve diventare rosso**,
poi rimetti. Scrivi nel referto che l'hai fatto.

- [ ] **Step 7: commit**

```bash
git add src/components/features/pdf/DdcTemplate.tsx tests/unit/ddc-pdf-content.test.ts
git commit -F <messaggio fuori dal repo>
```

Messaggio: `fix(ddc): gli accenti nel documento — e il test smette di fissare il refuso (D104)`

---

