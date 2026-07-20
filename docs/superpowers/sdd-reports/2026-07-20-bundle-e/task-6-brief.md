### Task 6: Retrofit `fatture/export` (helper CSV + paginazione)

**Files:**
- Modify: `src/app/api/fatture/export/route.ts` (righe 64-131: BOM/SEP/escapeField/num → helper; fetch → fetchAllPages)
- Modify: `tests/unit/fatture-export-route.test.ts` (SOLO il mock builder: `order` torna il builder, si aggiunge `range` che risolve i dati; gli assert esistenti NON si toccano)

**Interfaces:**
- Consumes: Task 1 (`CSV_BOM`, `csvCell`, `csvNumIT`, `csvRiga`), Task 2 (`fetchAllPages`, `PageResult`).

- [ ] **Step 1: Add the failing test (anti-injection) + adegua il mock**

Nel mock builder esistente di `tests/unit/fatture-export-route.test.ts` (righe 33-43), sostituire il ramo `fatture` con:

```typescript
    if (table === 'fatture') {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        gte: () => builder,
        lte: () => builder,
        order: () => builder,
        range: async () => ({ data: fatture, error: null }),
      }
      return builder
    }
```

E aggiungere in coda al `describe` esistente:

```typescript
  it('anti CSV-injection: denominazione che inizia con = viene neutralizzata', async () => {
    fatture = [{
      numero: '2026-0014', data: '2026-07-01', cliente_denominazione: '=CMD()|studio',
      cliente_cf: null, cliente_piva: null, imponibile: 10, iva_importo: 0,
      totale: 10, bollo: 0, stato_sdi: 'accettata', pagata: true, inviata_via: 'pec',
      tipo_documento: 'TD01',
    }]
    const res = await GET(req())
    const csv = await res.text()
    expect(csv).toContain(`"'=CMD()|studio"`)
    expect(csv.split('\n')[1]).not.toMatch(/^=|;=/)
  })
```

- [ ] **Step 2: Run test to verify the new one fails**

Run: `npx vitest run tests/unit/fatture-export-route.test.ts --reporter=dot`
Expected: 3 PASS (esistenti, col mock adeguato falliranno finché la route non usa `.range` — accettato: in questo step falliscono TUTTI per il mock; il GREEN arriva allo Step 3) — in pratica: eseguire e annotare il fallimento.

- [ ] **Step 3: Retrofit della route**

In `src/app/api/fatture/export/route.ts`:

1. Aggiungere import:
```typescript
import { CSV_BOM, CSV_SEP, csvCell, csvNumIT, csvRiga } from '@/lib/utils/csv'
import { fetchAllPages, type PageResult } from '@/lib/utils/paginate'
```
2. Definire il tipo riga (sopra `GET`):
```typescript
type FatturaExportRow = {
  numero: string | null
  data: string | null
  cliente_denominazione: string | null
  cliente_cf: string | null
  cliente_piva: string | null
  imponibile: number | null
  iva_importo: number | null
  totale: number | null
  bollo: number | null
  stato_sdi: string | null
  pagata: boolean | null
  inviata_via: string | null
  tipo_documento: string | null
}
```
3. Sostituire il fetch (righe 35-62) con:
```typescript
  const { data: fatture, error } = await fetchAllPages<FatturaExportRow>(
    (from, to) =>
      svc
        .from('fatture')
        .select(
          `
          numero, data, cliente_denominazione, cliente_cf, cliente_piva,
          imponibile, iva_importo, totale, bollo, stato_sdi, pagata,
          inviata_via, tipo_documento
        `
        )
        .eq('laboratorio_id', labId)
        .is('deleted_at', null)
        .gte('data', dateFrom)
        .lte('data', dateTo)
        .order('data', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to) as unknown as PromiseLike<PageResult<FatturaExportRow>>
  )
  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }
```
4. Rimuovere `const BOM = …` e `const SEP = ';'` locali; `header` diventa `csvRiga([...])`; nel map righe: rimuovere `escapeField` e `num` locali e usare:
```typescript
    return csvRiga([
      f.numero ?? '',
      isTD04 ? 'Nota di Credito' : 'Fattura',
      f.data?.split('T')[0] ?? '',
      csvCell(f.cliente_denominazione),
      f.cliente_cf ?? '',
      cfPiva,
      csvNumIT(f.imponibile, segno),
      csvNumIT(f.iva_importo, segno),
      csvNumIT(f.bollo, segno),
      csvNumIT(f.totale, segno),
      labelStatoSDI[f.stato_sdi ?? 'draft'] ?? f.stato_sdi ?? 'bozza',
      f.pagata ? 'Sì' : 'No',
      f.inviata_via === 'pec' ? 'PEC' : f.inviata_via === 'sdi_coop' ? 'SDI-Coop' : '',
    ])
```
5. `const csv = CSV_BOM + [header, ...rows].join('\n')` (il commento TD04 esistente alle righe 100-107 NON si tocca).

- [ ] **Step 4: Run tests to verify all green**

Run: `npx vitest run tests/unit/fatture-export-route.test.ts tests/unit/csv-utils.test.ts --reporter=dot`
Expected: PASS — 4 test fatture (3 esistenti con assert invariati + injection) + helper.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/fatture/export/route.ts tests/unit/fatture-export-route.test.ts
git commit -m "refactor(export): fatture/export su helper CSV condiviso + paginazione fail-closed"
```

---

