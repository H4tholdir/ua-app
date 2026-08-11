## Task 5 — L'accento nella nomina del PRRC

**Files:**
- Modify: `src/components/features/pdf/NominaPrrcTemplate.tsx:341`
- Test: `tests/unit/generate-nomina-prrc.test.ts` (oggi verifica **solo** che il buffer non sia vuoto)

**Interfaces:** nessuna.

- [ ] **Step 1: la prova, prima**

Il test attuale non legge il contenuto del PDF. Aggiungi in `tests/unit/generate-nomina-prrc.test.ts`:

```ts
import { PDFParse } from 'pdf-parse'

  it('il titolo di sezione porta l\'accento: «Responsabilità ai sensi dell\'Art. 15(1)»', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    const buffer = await generateNominaPrrc('lab-test-001')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    expect(result.text).toContain('Responsabilità ai sensi')
    expect(result.text).not.toContain('Responsabilita ai sensi')
  }, 30_000)
```

- [ ] **Step 2: esegui e verifica il rosso**

Run: `npx vitest run tests/unit/generate-nomina-prrc.test.ts`
Atteso: **rosso**, con il titolo senza accento nel messaggio.

- [ ] **Step 3: correggi**

In `src/components/features/pdf/NominaPrrcTemplate.tsx:340-342`:

```tsx
        <Text style={styles.sectionTitle}>
          Responsabilità ai sensi dell&apos;Art. 15(1) MDR 2017/745
        </Text>
```

⚠️ `&apos;` resta com'è: è l'apostrofo di `dell'Art.`, non un accento.

- [ ] **Step 4: verde**

Run: `npx vitest run tests/unit/generate-nomina-prrc.test.ts`
Atteso: **verde**.

- [ ] **Step 5: commit**

```bash
git add src/components/features/pdf/NominaPrrcTemplate.tsx tests/unit/generate-nomina-prrc.test.ts
git commit -F <messaggio fuori dal repo>
```

Messaggio: `fix(prrc): l'accento nel titolo della nomina, e il test che ora legge il documento (D104)`

---

