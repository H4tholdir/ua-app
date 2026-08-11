## Task 4 — Il §2 che manca dalla numerazione (D106)

**Files:**
- Modify: `src/components/features/pdf/DdcTemplate.tsx:335-341` (l'intestazione perde la data) e
  `:374-376` (nasce la sezione)
- Test: `tests/unit/ddc-pdf-content.test.ts`

**Interfaces:** nessuna. `formatData` (`:198`) esiste già ed è quella che si usa.

- [ ] **Step 1: la prova, prima**

```ts
  it('il §2 — Data di emissione esiste e porta la data', () => {
    // I paragrafi ricalcano gli otto elementi dell'Allegato XIII punto 1: il n. 2
    // è la data di emissione (src/lib/consegna/precheck.ts:8). Fino al 03/08/2026
    // il dato c'era ma senza il suo titoletto, e il foglio saltava da §1 a §3.
    expect(pdfText).toContain('§2 — Data di emissione')
    expect(pdfText).toContain('15/05/2026')     // data della fixture
  })
```

- [ ] **Step 2: esegui e verifica il rosso**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Atteso: **rosso** sul `§2 — Data di emissione` (la data invece è già presente: la stampa l'intestazione).
🛑 Se fosse verde su entrambe le asserzioni, il test non misura la sezione: fermati e riferisci.

- [ ] **Step 3: fai nascere la sezione**

In `src/components/features/pdf/DdcTemplate.tsx`, fra la chiusura del §1 (riga 374, `</View>`) e il commento
del §3 (riga 376), inserisci:

```tsx
        {/* ── §2 DATA DI EMISSIONE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>§2 — Data di emissione</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Data:</Text>
            <Text style={styles.valueBold}>
              {ddc.data_emissione ? formatData(ddc.data_emissione) : '—'}
            </Text>
          </View>
        </View>
```

- [ ] **Step 4: togli la data dall'intestazione, perché non compaia tre volte**

Il dato è già stampato nel blocco della firma (`:504-507`), che **non si tocca**. Alle righe 336-341
sostituisci:

```tsx
        {ddc.numero_ddc ? (
          <Text style={styles.numeroDdc}>
            N. {ddc.numero_ddc}
          </Text>
        ) : null}
```

- [ ] **Step 5: verde**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts`
Atteso: **tutti verdi** (la data resta nel testo estratto: la stampano il §2 e il blocco firma).

- [ ] **Step 6: guarda il foglio, non solo i numeri**

Un titoletto in più sposta il flusso e può spingere contenuto **oltre il salto di pagina** — rilievo del
panel, spec §2.3. Genera un PDF e **aprilo**:

```bash
npx tsx scripts/tmp/sonda-accenti.tsx   # esempio di come si scrive un PDF su file
```

Scrivi uno scriptino usa-e-getta in `scripts/tmp/` che renda `DdcTemplate` con la fixture del test e salvi il
PDF, poi **guardalo**: il documento deve restare **di una pagina**, con §1 · §2 · §3 in fila e la firma al suo
posto. 🛑 Se è andato a due pagine, **fermati e riferisci**: la forma va decisa da Francesco, non aggiustata
di nascosto.

- [ ] **Step 7: commit**

```bash
git add src/components/features/pdf/DdcTemplate.tsx tests/unit/ddc-pdf-content.test.ts
git commit -F <messaggio fuori dal repo>
```

Messaggio: `feat(ddc): il §2 — Data di emissione entra nella numerazione (D106)`

---

