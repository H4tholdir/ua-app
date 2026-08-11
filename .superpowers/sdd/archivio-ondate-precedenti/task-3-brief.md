## Task 3 — La frase congelata: solo i segni, il resto byte per byte

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts:119`
- Modify: `tests/unit/ddc-pdf-content.test.ts:68-69` (fixture)

**Interfaces:** nessuna. `testoConformita` resta una costante locale di `generateDdC`.

- [ ] **Step 1: la prova, prima**

In `tests/unit/generate-ddc.test.ts` aggiungi:

Stesso `describe` e stesso apparecchio del Task 1 (`mockInsert.mock.calls[0][0]` dopo `generateDdC`):

```ts
  it('il testo di conformità porta «è conforme», non «e\' conforme»', async () => {
    await generateDdC(LAVORO_FIXTURE)
    const riga = mockInsert.mock.calls[0][0]
    expect(riga.testo_conformita).toContain('dispositivo è conforme')
    expect(riga.testo_conformita).not.toContain("dispositivo e' conforme")
    // le due colonne ricevono lo stesso letterale (generate-ddc.ts:147-148)
    expect(riga.testo_conformita_snapshot).toBe(riga.testo_conformita)
  })
```

- [ ] **Step 2: esegui e verifica il rosso**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Atteso: **rosso**, con il testo attuale (`e' conforme`) nel messaggio.

- [ ] **Step 3: cambia UN SOLO carattere**

In `src/lib/pdf/generate-ddc.ts:119`:

```ts
  const testoConformita = "Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745."
```

🛑 **Confronta la stringa nuova con la vecchia carattere per carattere e dichiara la differenza nel referto:
deve essere `e'` → `è`, e nient'altro.** Comando suggerito, da eseguire e incollare:

```bash
git diff -U0 --word-diff=porcelain src/lib/pdf/generate-ddc.ts | head -20
```

- [ ] **Step 4: verde**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Atteso: **verde**.

- [ ] **Step 5: allinea la fixture che porta il testo vecchio**

In `tests/unit/ddc-pdf-content.test.ts:68-69`, dentro `DDC_FIXTURE`:

```ts
  testo_conformita_snapshot:
    "Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745.",
```

Senza questo, la suite continuerebbe a rendere un payload che il generatore **non produce più**.

- [ ] **Step 6: l'intera suite dei PDF**

Run: `npx vitest run tests/unit/ddc-pdf-content.test.ts tests/unit/generate-ddc.test.ts`
Atteso: **tutti verdi**.

- [ ] **Step 7: commit**

```bash
git add src/lib/pdf/generate-ddc.ts tests/unit/ddc-pdf-content.test.ts tests/unit/generate-ddc.test.ts
git commit -F <messaggio fuori dal repo>
```

Messaggio: `fix(ddc): «è conforme» nella frase congelata — un solo carattere, il resto invariato (D104)`

---

