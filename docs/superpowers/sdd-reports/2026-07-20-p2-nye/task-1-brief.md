### Task 1: Branch rinumerazione in `generaFatturaPA` (TDD)

**Files:**
- Modify: `src/lib/fattura/generate-xml.ts` (§0 DraftRow ~riga 65-97, §2 ~righe 200-228, §12 ~righe 515-531)
- Modify: `tests/unit/generate-xml-td04.test.ts` (SOLO fixture: `anno` + `note: null` nei mock draft; spia su `generaProgressivo` se serve; assert INVARIATI)
- Test: `tests/unit/generate-xml-draft-nye.test.ts` (nuovo)

**Interfaces:**
- Consumes: `annoRoma`, `oggiRomaISO` (già importate), `generaProgressivo` (già importata), `DraftRow` esteso con `anno: number; note: string | null`.
- Produces: comportamento — vedi spec §Comportamento; nessuna API nuova.

- [ ] **Step 1: Aggiorna le fixture esistenti (pre-requisito, suite ancora verde)**

In `tests/unit/generate-xml-td04.test.ts`: ogni oggetto draft mockato dal ramo `fatturaId` (fixture `DRAFT_TD04` e simili, e la select mockata su `fatture`) guadagna:

```typescript
anno: new Date().getFullYear(),   // pari all'anno del clock del test (nessun fake timer in quel file)
note: null,
```

Se il file usa fake timers, allineare `anno` all'anno del clock finto. NON toccare alcun assert.
Run: `npx vitest run tests/unit/generate-xml-td04.test.ts --reporter=dot` → PASS invariato.

- [ ] **Step 2: Write the failing tests**

Creare `tests/unit/generate-xml-draft-nye.test.ts` replicando l'harness di mock di `generate-xml-td04.test.ts` (stessi vi.mock per supabase client/storage/pdf/progressivi — copiare la struttura, adattare le fixture). Il mock di `generaProgressivo` deve essere una spia che registra `(serie, anno)` e ritorna valori distinti (es. sdi_invio → 7, fattura → 3). Casi (spec §Test):

```typescript
// 1. REGRESSIONE stesso anno: draft { anno: <anno clock>, numero: '<anno>-0045', data: '<anno>-06-01', note: null }
//    → UPDATE senza chiavi numero/anno/data/note; generaProgressivo MAI chiamato con serie 'fattura'
// 2. RINUMERATO: fake timers a '2027-01-02T10:00:00Z', draft { anno: 2026, numero: '2026-0045', data: '2026-12-28', note: null }
//    → generaProgressivo chiamato con ('fattura', 2027); UPDATE contiene numero '2027-0003',
//      anno 2027, progressivo 3, data '2027-01-02',
//      note contenente "sostituisce la bozza 2026-0045 del 2026-12-28";
//      il payload XML uploadato contiene <Numero>2027-0003</Numero> e <Data>2027-01-02</Data>
// 3. CAPODANNO ROMA: fake timers a '2026-12-31T23:30:00Z' (= 2027 a Roma), draft anno 2026 → RINUMERATO a 2027
// 4. TD04 anno precedente: come (2) su draft TD04 → rinumerato E l'UPDATE NON contiene chiavi collegata_numero/collegata_data/causale_storno
// 5. NOTA PREESISTENTE: draft note: 'Nota esistente' → note aggiornata = 'Nota esistente\nRinumerata all'emissione: …'
```

Run: `npx vitest run tests/unit/generate-xml-draft-nye.test.ts --reporter=dot`
Expected: FAIL (il codice congela ancora numero/data; UPDATE non contiene le chiavi attese).

- [ ] **Step 3: Implementa**

`src/lib/fattura/generate-xml.ts`:

(a) §0 — `DraftRow` guadagna `anno: number` e `note: string | null`; la select diventa:
```typescript
'numero, progressivo, anno, data, note, tipo_documento, imponibile, collegata_numero, collegata_data, causale_storno, cliente_id, cliente_denominazione, cliente_piva, cliente_cf, cliente_indirizzo, cliente_codice_sdi, cliente_pec, laboratorio_id'
```

(b) §2 — sostituire il blocco `if (fatturaId) { … } else { … }` (righe 218-228) e le due righe finali del commento (206-207, «Ramo draft (fatturaId): numero/anno/data restano CONGELATI sul draft — deliberato (piano 2026-07-20 §Constraints).») con:

```typescript
  // Ramo draft (fatturaId): stesso anno → numero/anno/data CONGELATI sul
  // draft; anno PRECEDENTE → la bozza DIVENTA la fattura dell'anno corrente
  // (rinumerazione d1, spec 2026-07-20-draft-nye-rinumerazione: decisione
  // Francesco 20/07 — la traccia dell'ex numero finisce in fatture.note).
```
e

```typescript
  let numero: string
  let progressivoFattura: number
  let dataFattura: string
  let rinumerataDa: { exNumero: string; exData: string } | null = null

  if (fatturaId && draft!.anno === anno) {
    // draft già caricato in Sezione 0 — stesso anno: congelato
    numero = draft!.numero
    progressivoFattura = draft!.progressivo
    dataFattura = draft!.data
  } else if (fatturaId) {
    // draft di un anno precedente: rinumera nella serie corrente (d1)
    progressivoFattura = await generaProgressivo(supabase, laboratorioId, 'fattura', anno)
    numero = `${anno}-${String(progressivoFattura).padStart(4, '0')}`
    dataFattura = oggi
    rinumerataDa = { exNumero: draft!.numero, exData: draft!.data }
  } else {
    // Nuovo insert: genera progressivo fresco
    progressivoFattura = await generaProgressivo(supabase, laboratorioId, 'fattura', anno)
    numero = `${anno}-${String(progressivoFattura).padStart(4, '0')}`
    dataFattura = oggi
  }
```

(c) §12 — `xmlFields` guadagna lo spread condizionale dopo `totale,`:

```typescript
    // P2-d1: rinumerazione a cavallo d'anno — il DB si allinea a XML/PDF
    ...(rinumerataDa
      ? {
          numero,
          anno,
          progressivo: progressivoFattura,
          data: dataFattura,
          note:
            (draft!.note ? `${draft!.note}\n` : '') +
            `Rinumerata all'emissione: sostituisce la bozza ${rinumerataDa.exNumero} del ${rinumerataDa.exData} (serie anno precedente).`,
        }
      : {}),
```

- [ ] **Step 4: Run tests to verify green**

Run: `npx vitest run tests/unit/generate-xml-draft-nye.test.ts tests/unit/generate-xml-td04.test.ts tests/unit/generate-xml-lavoro-id.test.ts tests/unit/generate-xml-prezzo.test.ts tests/unit/generate-xml-pdf-cortesia.test.ts tests/unit/fatture-xml-errori.test.ts tests/unit/fatture-xml-gate-stato-sdi.test.ts --reporter=dot`
Expected: tutti PASS (nuovi + regressioni ramo fatturaId e INSERT).

- [ ] **Step 5: Commit**

```bash
git add src/lib/fattura/generate-xml.ts tests/unit/generate-xml-draft-nye.test.ts tests/unit/generate-xml-td04.test.ts
git commit -m "feat(fiscale): rinumerazione draft a cavallo d'anno all'emissione (d1)"
```

---

