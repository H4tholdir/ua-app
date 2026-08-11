# Task 2 — Il «chi» nel codice: il parametro obbligatorio

**File:**
- Modifica: `src/lib/pdf/generate-dpa.ts:88` (firma) e `:286` (payload)
- Modifica: `src/app/api/clienti/[id]/dpa/route.ts:49`
- Modifica: `tests/unit/dpa-registro.test.ts` (**50** chiamate) · `tests/unit/generate-dpa.test.ts` (**3**) · `tests/unit/dpa-route.test.ts` (**1** + l'asserzione sugli argomenti alla riga **85**)

**Interfacce:**
- Consuma: la colonna `emesso_da` nei tipi generati (Task 1).
- Produce: `generateDpa(laboratorio_id: string, cliente_id: string, emesso_da: string): Promise<EmissioneDpa>`. 🛑 `EmissioneDpa` resta **a 4 campi**.

- [ ] **Step 1: scrivere le due prove nuove — PRIMA del codice**

In `tests/unit/dpa-registro.test.ts`, in coda al blocco che asserisce sul payload:

```typescript
  it('✅ T3a — su un\'emissione NUOVA il registro sa dire CHI ha premuto', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001', 'utente-007')

    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    // 🔑 `toBe`, non `toBeDefined()`: una colonna che esiste ed e' vuota e'
    //    ESATTAMENTE il difetto di dichiarazioni_conformita.generated_by
    //    (5 righe, 0 riempite — voce P26). «Definita» non basta.
    expect(riga.emesso_da).toBe('utente-007')
    // 🛑 E non si e' scritto nella colonna sbagliata: `firmato_da` e' il nome
    //    della CONTROPARTE allo studio, non chi opera in UA.
    expect(riga.firmato_da).toBeUndefined()
  })

  it('🛑 T3b — sul RIUSO il «chi» NON si riscrive, nemmeno se scarica un altro utente', async () => {
    montaTabelle(CORRENTE)   // esiste gia' un'emissione riusabile

    const r = await generateDpa('lab-test-001', 'cli-001', 'utente-DIVERSO')

    // 🔑 Perche' questa prova esiste: senza di lei, chi legge solo T3a fa
    //    riscrivere `emesso_da` sul ramo di riuso «per coerenza» — cioe'
    //    riscrive un campo del REGISTRO DELLE PROVE, che e' il difetto che P7
    //    esiste per chiudere. La colonna dice CHI HA EMESSO, e l'emissione e'
    //    avvenuta una volta sola.
    expect(r.riemessa).toBe(false)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
```

- [ ] **Step 2: farle fallire, e CONTARE (R-P4)**

```bash
npx tsc --noEmit 2>&1 | grep -c "TS2554"
```

Atteso: **54** errori «Expected 3 arguments, but got 2» — 50 da `dpa-registro.test.ts`, 3 da `generate-dpa.test.ts`, 1 dalla rotta.
🛑 **Se il numero non è 54, il censimento di questo piano è sbagliato: fermarsi e riferire.**
⚠️ **La 55ª chiamata NON compare qui e non è un errore del conteggio:** in `dpa-route.test.ts` `generateDpa` è sostituita da una finta, quindi `tsc` non la vede. Quel file si rompe **a prove**, allo Step 6.

```bash
npx vitest run tests/unit/dpa-registro.test.ts -t "T3a"
```

Atteso: **FAIL** — `expected undefined to be 'utente-007'`.

🔑 **Il rosso da «argomento in più» non prova che la prova provi qualcosa.** Dopo il primo rosso: si mette un **abbozzo inerte** (terzo parametro accettato e **ignorato**), si rilancia, e si **CONTA quante asserzioni si accendono**. Si scrive il numero: **N su M**. Attese accese: `riga.emesso_da` di T3a. Attese **verdi anche con l'abbozzo**: tutta T3b (è il comportamento già esistente) — 🔑 **ed è giusto così: T3b è una prova di NON-REGRESSIONE, esiste per restare verde e diventare rossa solo se qualcuno tocca il ramo di riuso.** Va scritto nel referto, o sembrerà una prova debole.

**Forme d'input da enumerare** (R-P4), sul terzo parametro: id valido ✅ (T3a) · stringa vuota ⚠️ **non coperta, perché**: `tsc` non la distingue da un id e la chiave esterna la rifiuterebbe solo a runtime — si copre col Task 3 T5 · `undefined` esplicito ✅ (lo blocca `tsc`) · id di un utente di **altro laboratorio** ⚠️ **non coperta, perché**: il chiamante è la rotta, che passa `context.userId` — un utente di un altro laboratorio non arriva mai lì · id inesistente ✅ (Task 3 T5, la chiave esterna deve mordere).

- [ ] **Step 3: la firma e il payload**

In `src/lib/pdf/generate-dpa.ts`, riga **88**:

```typescript
export async function generateDpa(
  laboratorio_id: string,
  cliente_id: string,
  /** Chi ha PREMUTO. 🛑 OBBLIGATORIO per scelta, non per rigore inutile: la
   *  colonna gemella della DdC (`dichiarazioni_conformita.generated_by`) e'
   *  facoltativa da mesi e ha 5 righe con ZERO valori. Una colonna che si puo'
   *  dimenticare e' una colonna dimenticata, e la dimenticanza non fa rumore.
   *  Qui il rumore lo fa `tsc`. */
  emesso_da: string,
): Promise<EmissioneDpa> {
```

E dentro il payload dell'INSERT, riga **~300**, accanto a `emesso_at`:

```typescript
      emesso_at: new Date().toISOString(),
      emesso_da,
```

🛑 **Non si tocca il ramo di riuso (162-171).** È T3b.

- [ ] **Step 4: il chiamante vero**

In `src/app/api/clienti/[id]/dpa/route.ts`, riga **49**:

```typescript
      const emissione = await generateDpa(labId, clienteId, context.userId)
```

- [ ] **Step 5: i 55 punti di prova**

I test passano un id **riconoscibile**, non un uuid a caso: un valore che, se finisse dove non deve, si vede.

```bash
sed -i '' "s/generateDpa('lab-test-001', 'cli-001')/generateDpa('lab-test-001', 'cli-001', 'utente-007')/g" tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts
npx tsc --noEmit 2>&1 | grep -c "TS2554"
```

`provato:` la forma esatta cercata dalla `sed` esiste **53 volte** (`grep -c` → `dpa-registro.test.ts` **50**, `generate-dpa.test.ts` **3**). La **54ª** è la rotta, già sistemata allo Step 4.
Atteso dopo la `sed`: **0**.

🛑 **Ma `dpa-route.test.ts` è ancora ROSSO, e non lo dice `tsc`.** La riga **85** asserisce `expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)`: la rotta ora ne passa **tre**, quindi la prova fallisce **a esecuzione**. Va portata a:

```typescript
    // …e l'emissione è stata chiesta per QUESTO laboratorio, QUESTO cliente e
    // da QUESTO utente, in quest'ordine (`generateDpa(laboratorio_id, cliente_id, emesso_da)`).
    expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID, CONTESTO.userId)
```

`provato:` **il contesto finto porta già il «chi»** — `tests/unit/dpa-route.test.ts:42` ha `userId: 'user-1'` dentro `CONTESTO`. **Nessun mock da toccare**, e nessuna costante nuova da inventare.
🔑 **Questa asserzione è la prova che il «chi» arriva DALLA ROTTA e non è inventato dentro `generateDpa`** — senza di lei, un'implementazione che ci scrivesse una costante resterebbe verde.

- [ ] **Step 6: verde**

```bash
npx vitest run tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts tests/unit/dpa-route.test.ts
```

Atteso: tutte verdi, **due prove in più** di prima.

- [ ] **Step 7: Commit**

```bash
git add src/lib/pdf/generate-dpa.ts "src/app/api/clienti/[id]/dpa/route.ts" tests/unit/dpa-registro.test.ts tests/unit/generate-dpa.test.ts tests/unit/dpa-route.test.ts
git commit -F <messaggio fuori dal repo>
```

---

