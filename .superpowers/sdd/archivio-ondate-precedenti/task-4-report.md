# Task 4 — Referto: il §2 che manca dalla numerazione (D106)

## Stato: COMPLETATO

## File toccati
- `src/components/features/pdf/DdcTemplate.tsx`
- `tests/unit/ddc-pdf-content.test.ts`

Nessun altro file modificato/committato (i due file `docs/superpowers/plans/2026-08-03-accenti-documenti.md`
e `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md` risultavano già modificati da lavoro
precedente all'avvio di questo task — non è farina di questo task e non sono stati aggiunti al commit).

## Riscontro sui numeri di riga del brief

I numeri di riga citati dal brief **corrispondevano esattamente** al file al momento della lettura:
- `:335-341` intestazione con la data → confermato (il blocco `numero_ddc` era proprio a `336-341`)
- `:374` chiusura `</View>` del §1, `:376` commento `{/* ── §3 PRESCRITTORE ── */}` → confermati
- `:198` `formatData` → confermato
- `:504-507` blocco firma con `Data di emissione:` → confermato, non toccato

Nessuno scarto da segnalare per questo task (a differenza del Task 3, dove `119` era diventato `132`).

## Step eseguiti, con output reale

### Step 1-2 — la prova, prima del codice, e il rosso

Aggiunto in `tests/unit/ddc-pdf-content.test.ts` (dopo la riga 190, prima del commento «§3 Prescrittore»):

```ts
it('il §2 — Data di emissione esiste e porta la data', () => {
  expect(pdfText).toContain('§2 — Data di emissione')
  expect(pdfText).toContain('15/05/2026')
})
```

`npx vitest run tests/unit/ddc-pdf-content.test.ts`:

```
Test Files  1 failed (1)
     Tests  1 failed | 39 passed (40)
```

Rosso esattamente come previsto dal brief: fallisce sulla prima asserzione
(`expect(pdfText).toContain('§2 — Data di emissione')`), perché la sezione non esiste ancora — la data
è già nel testo (intestazione), ma senza il suo titoletto. I due test preesistenti «§2 stampa numero DdC»
(:184) e «§2 stampa data di emissione formattata» (:188) erano fra i 39 verdi.

### Step 3 — nasce la sezione

Inserito in `DdcTemplate.tsx`, fra la chiusura di §1 (`</View>`, riga 374) e il commento di §3 (riga 376),
esattamente il blocco proposto dal brief:

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

### Step 4 — la data esce dall'intestazione

Righe 336-341, sostituite esattamente come da brief (tolto il ramo che stampava
`| Data: ${formatData(...)}` dentro `styles.numeroDdc`):

```tsx
{ddc.numero_ddc ? (
  <Text style={styles.numeroDdc}>
    N. {ddc.numero_ddc}
  </Text>
) : null}
```

Il blocco firma (`:504-507`, ora spostato di 8 righe per l'inserimento del §2 ma **testualmente
identico**) continua a stampare `Data di emissione:` + `formatData(ddc.data_emissione)` — non toccato.

### Step 5 — verde, con un difetto del brief trovato e corretto nel mio stesso task

Prima esecuzione dopo Step 3+4: **ancora rosso**, stessa asserzione:

```
Tests  1 failed | 39 passed (40)
```

Causa: `styles.sectionTitle` ha `textTransform: 'uppercase'` (come per ogni altro titolo di sezione —
vedi il test preesistente `il titolo del §7 porta l'accento` che pretende `'§7 — DICHIARAZIONE DI
CONFORMITÀ'` tutto maiuscolo). Il testo estratto dal PDF per la nuova sezione è quindi
`'§2 — DATA DI EMISSIONE'`, non `'§2 — Data di emissione'` come scritto nel brief al passo 1. **Questo è
un difetto nel codice di test che il brief stesso proponeva** — non un difetto di un altro task, è dentro
al perimetro di questo Step 1/Step 5, sui due file che sono il mio mandato. L'ho corretto nel test (non
nello stile — cambiare lo stile avrebbe reso il §2 incoerente con §1/§3/§4/§5/§6/§7, tutti uppercase),
aggiungendo un commento che spiega perché, e ho rieseguito:

```
Test Files  1 passed (1)
     Tests  40 passed (40)
```

Tutti e 40 verdi, inclusi i due test preesistenti «§2 stampa numero DdC» (:184, invariato) e «§2 stampa
data di emissione formattata» (:188, invariato) — nessuno dei due è stato toccato né rinominato.

Anche verificato: `npx tsc --noEmit` → nessun output (pulito). Rieseguito insieme a
`tests/unit/generate-ddc-annullata.test.ts` (che mocka `DdcTemplate` interamente, quindi non poteva
rompersi, ma verificato comunque): 41/41 verdi.

### Step 6 — il foglio, guardato davvero

Script usa-e-getta: `scripts/tmp/task4-sonda-ddc.tsx` (gitignored, non committato — copia 1:1 di
`DDC_FIXTURE` dal file di test + `LAB_FIXTURE`/`LAVORO_FIXTURE` condivise, per rendere lo stesso identico
documento che i test verificano).

```
$ npx tsx scripts/tmp/task4-sonda-ddc.tsx
scritto scripts/tmp/task4-ddc-sample.pdf (4980 byte)
```

Verifica strutturale (conteggio oggetti `/Type /Page` nel PDF grezzo): **1 pagina**.

Ho poi aperto il PDF con lo strumento di lettura file (rende le pagine come immagine). Confermato a vista:
- **una sola pagina**, nessun salto di pagina;
- **§1 · §2 · §3 · §4 · §5 · §6 · §7 in fila**, ordine e numerazione continui, nessun buco;
- l'intestazione ora mostra solo `N. DDC-2026-0001` (niente più data lì);
- il blocco firma in basso, invariato: a sinistra «Data di emissione: 15/05/2026 / Serre (SA), Italia»,
  a destra «Responsabile della Conformità (PRRC) / Filippo Opromolla / Odontotecnico abilitato»;
- resta ampio margine bianco sotto la firma — nessun rischio di sconfinamento imminente su questa fixture.

## Autorevisione

- I due test «§2 …» preesistenti (:184, :188) restano verdi, non rinominati, non spostati.
- Nessun refuso introdotto: la rete `not.toContain('CONFORMITA')` / `not.toContain('Conformita')` (test
  «il titolo porta l'accento») resta verde — la nuova sezione non contiene la parola.
- Il dato compare in due posti (§2 e blocco firma), non tre, come richiesto.
- Nessun file fuori dai due dichiarati è stato aggiunto al commit.

## Ritrovamento fuori mandato

Nessuno ulteriore oltre a quello già assorbito nel mio stesso Step 5 (vedi sopra) — non ho toccato
`generate-ddc.ts`, `NominaPrrcTemplate.tsx`, o le migration, tutti fuori dal mio perimetro dichiarato.

## Commit

```
git add src/components/features/pdf/DdcTemplate.tsx tests/unit/ddc-pdf-content.test.ts
git commit -F <messaggio esterno>
```

Messaggio: `feat(ddc): il §2 — Data di emissione entra nella numerazione (D106)`

## Correzioni dopo revisione

### Il rilievo

Nel test `'il §2 — Data di emissione esiste e porta la data'` (era righe 192-201), la seconda
asserzione era `expect(pdfText).toContain('15/05/2026')` e non discriminava niente: la data compare
comunque nel blocco firma (`DdcTemplate.tsx:515-518`), quindi svuotare il valore della sola sezione
§2 (sostituendo `formatData(ddc.data_emissione)` con `'—'`, titoletto intatto) lasciava **tutti i 40
test verdi**. Il titolo del test prometteva «…porta la data», ma provava solo l'esistenza del
titoletto.

### La correzione

Sostituita l'asserzione con un conteggio delle occorrenze della data nel foglio intero
(`tests/unit/ddc-pdf-content.test.ts:211-212`):

```ts
const occorrenzeData = pdfText.split('15/05/2026').length - 1
expect(occorrenzeData).toBe(2)
```

Accompagnata da un commento (righe 201-210) che spiega perché due occorrenze (§2 +
blocco firma) e quale mutazione l'ha resa necessaria (lo svuotamento della §2 che il revisore ha
provato).

### Prova 1 — mutazione «sezione §2 svuotata»

Stato di partenza verificato pulito:

```
$ git diff --stat src/components/features/pdf/DdcTemplate.tsx
(nessun output)
```

Sostituito a mano in `src/components/features/pdf/DdcTemplate.tsx` (righe 375-384), SOLO il valore
della §2:

```diff
-              {ddc.data_emissione ? formatData(ddc.data_emissione) : '—'}
+              {'—'}
```

```
$ npx vitest run tests/unit/ddc-pdf-content.test.ts
 ❯ tests/unit/ddc-pdf-content.test.ts (40 tests | 1 failed) 275ms
     × il §2 — Data di emissione esiste e porta la data 2ms

 FAIL  tests/unit/ddc-pdf-content.test.ts > DdcTemplate — PDF content validation (Allegato XIII MDR 2017/745) > il §2 — Data di emissione esiste e porta la data
AssertionError: expected 1 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 1

 ❯ tests/unit/ddc-pdf-content.test.ts:212:28

 Test Files  1 failed (1)
      Tests  1 failed | 39 passed (40)
```

**Rosso confermato** (prima restava tutto verde). Ripristinato:

```
$ git checkout -- src/components/features/pdf/DdcTemplate.tsx
$ git status --porcelain src/components/features/pdf/DdcTemplate.tsx
(nessun output — pulito)
```

### Prova 2 — mutazione «data rimessa in intestazione»

Rimesso a mano in `src/components/features/pdf/DdcTemplate.tsx` (righe 336-339), il ramo che lo
Step 4 aveva tolto dal blocco `styles.numeroDdc`:

```diff
         {ddc.numero_ddc ? (
           <Text style={styles.numeroDdc}>
             N. {ddc.numero_ddc}
+            {ddc.data_emissione ? ` | Data: ${formatData(ddc.data_emissione)}` : ''}
           </Text>
         ) : null}
```

```
$ npx vitest run tests/unit/ddc-pdf-content.test.ts
 ❯ tests/unit/ddc-pdf-content.test.ts (40 tests | 1 failed) 281ms
     × il §2 — Data di emissione esiste e porta la data 2ms

 FAIL  tests/unit/ddc-pdf-content.test.ts > DdcTemplate — PDF content validation (Allegato XIII MDR 2017/745) > il §2 — Data di emissione esiste e porta la data
AssertionError: expected 3 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 3

 ❯ tests/unit/ddc-pdf-content.test.ts:212:28

 Test Files  1 failed (1)
      Tests  1 failed | 39 passed (40)
```

**Rosso confermato** (nell'altra direzione: 3 occorrenze invece di 2). Ripristinato:

```
$ git checkout -- src/components/features/pdf/DdcTemplate.tsx
$ git status --porcelain
 M tests/unit/ddc-pdf-content.test.ts
```

`DdcTemplate.tsx` assente dall'elenco = pulito, come richiesto. Solo il test resta modificato.

### Run finale (stato pulito, nessuna mutazione)

```
$ npx vitest run tests/unit/ddc-pdf-content.test.ts
 Test Files  1 passed (1)
      Tests  40 passed (40)
```

### Esito

Entrambe le mutazioni hanno acceso il rosso, in direzioni opposte (1 e 3, contro l'atteso 2) — la
prova misura esattamente ciò che deve misurare. Correzione ratificata.
