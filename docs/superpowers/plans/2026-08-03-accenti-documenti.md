# Gli accenti nei documenti generati — piano di esecuzione

> **Per chi esegue:** usa `superpowers:subagent-driven-development` (consigliato) o
> `superpowers:executing-plans`, un task alla volta (R-E1). Gli step hanno le caselle `- [ ]`.
> 🛑 **R-E2: un difetto trovato FUORI dal tuo task si RIFERISCE, non si corregge di nascosto.**

**Obiettivo:** togliere i refusi ortografici dai due documenti generati (Dichiarazione di Conformità e
nomina PRRC), far comparire il **§2** che manca dalla numerazione, e — poiché la versione del modello **non**
cambia (D105) — scrivere il registro che dice cosa quella versione contiene.

**Come:** dieci correzioni di testo, una sezione nuova nel modello PDF, una migration che allinea un DEFAULT,
e i test che oggi **fissano il refuso** girati al contrario perché la regressione futura non sia silenziosa.

**Spec (LEGGE):** `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md`
**Decisioni:** D104 · D105 · D106 · D107 (`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`)

---

## Vincoli globali

- 🛑 **Sul testo di conformità si cambiano SOLO i segni d'accento, il resto byte per byte** (D104). Nessuna
  riformulazione: le proposte di miglioramento del testo sono il referral ① della spec §5, non questo lavoro.
- 🛑 **`VERSIONE_TEMPLATE_DDC` resta `'ddc-v1'`** (D105). Chi la tocca sta sbagliando task.
- 🛑 **Non si riscrive una migration storica.** Il DEFAULT si allinea con una migration **nuova**.
- 🛑 **Nessuna guardia automatica anti-refuso** (D107): fuori perimetro.
- Ogni commit: `git add <file espliciti>` — **mai `git add -A`** — e messaggio da file fuori dal repo
  (`git commit -F`).
- Al termine, FASE 7 per intero con output incollato: `npx tsc --noEmit` · `npx vitest run` · `npx next build`.

---

## Registro delle PROVE (R-P1)

Si provano le **assunzioni sull'ambiente**, non il codice del piano. Il codice qui sotto nasce
`non eseguito`, col comando che lo verificherà scritto nel suo step.

| # | Assunzione | Esito |
|---|---|---|
| 1 | Il carattere dei PDF rende gli accenti minuscoli, in tondo e in grassetto | `provato:` `npx tsx scripts/tmp/sonda-accenti.tsx` → PDF letto a occhio: `è perché così più già città qualità unità sanità` ✅ |
| 2 | **Rende la À MAIUSCOLA prodotta da `textTransform:'uppercase'`** — la strada del titolo, il caso a rischio | `provato:` stessa sonda, riga ①: «Dichiarazione di Conformità» + `uppercase` → **DICHIARAZIONE DI CONFORMITÀ** ✅ |
| 3 | I **metadati** del file (`title`/`subject`) reggono un accento senza mojibake | `provato:` `npx tsx scripts/tmp/sonda-metadati.tsx` → i tre campi escono `(\xfe\xff…)` = **UTF-16BE con BOM** ✅ |
| 4 | **L'estrattore usato dai test restituisce gli accenti** (senza questo, un test che li pretende è impossibile) | `provato:` `npx tsx scripts/tmp/sonda-estrazione.ts` → sul PDF accentato `CONFORMITÀ`=true, `CONFORMITA`=false; **e sul PDF vero di oggi il contrario** ✅ |
| 5 | Esiste già una riga in archivio con `template_version='ddc-v1'` (contro l'affermazione del panel) | `provato:` `npx tsx scripts/tmp/censo-versioni.ts` → 4 DdC in archivio, **1 con `ddc-v1`**, 3 con `NULL` ✅ |

## Registro delle LETTURE (R-P2)

L'elenco **non** è deciso dall'autore: viene dal censimento sotto.

| file | letto |
|---|---|
| `src/components/features/pdf/DdcTemplate.tsx` | righe 11-64, 285-300, 320-352, 368-382, 440-460, 480-520 |
| `src/components/features/pdf/NominaPrrcTemplate.tsx` | righe 335-345 |
| `src/lib/pdf/generate-ddc.ts` | righe 28-56, 73-95, 100-215 |
| `tests/unit/ddc-pdf-content.test.ts` | righe 1-40, 55-115, 250-256 |
| `tests/unit/generate-nomina-prrc.test.ts` | righe 1-35 (intero) |
| `supabase/migrations/002_fase2_schema.sql` | righe 186-190 |
| `supabase/migrations/20260803090000_denti_snapshot_sulla_dichiarazione.sql` | righe 1-20 (forma di riferimento) |
| `supabase/schema.sql` | righe 1247-1250 |
| `src/lib/consegna/precheck.ts` | righe 1-20 (quale elemento è il §2) |

## Censimento (R-P6) — ogni identificatore toccato, con la sua destinazione

| identificatore / stringa | dove | destinazione |
|---|---|---|
| `'Dichiarazione di Conformita …'` (title) | `DdcTemplate.tsx:292` | Task 2 |
| `"Dichiarazione di Conformita MDR 2017/745"` (subject) | `:294` | Task 2 |
| `Dichiarazione di Conformita` (titolo reso) | `:326` | Task 2 |
| `'Si — vedere documentazione allegata'` | `:446` | Task 2, **con il caso che lo raggiunge** |
| `§7 — Dichiarazione di Conformita` | `:486` | Task 2 |
| `Responsabile della Conformita (PRRC)` | `:514` | Task 2 |
| `Responsabilita ai sensi dell'Art. 15(1)…` | `NominaPrrcTemplate.tsx:341` | Task 5 |
| `testoConformita` (`…e' conforme…`) | `generate-ddc.ts:119` | Task 3 |
| DEFAULT di `testo_conformita_snapshot` | `002_fase2_schema.sql:188-189` | Task 6 (migration nuova) |
| `VERSIONE_TEMPLATE_DDC` | `generate-ddc.ts:41` | Task 1 — **resta `'ddc-v1'`**, cambia il commento |
| commento `-- Es. "ddc-v1.2.0"` | `supabase/schema.sql:1249` | Task 1 |
| intestazione `N. … | Data: …` | `DdcTemplate.tsx:337-339` | Task 4 — la data **esce di lì** |
| `VERSIONE_ATTESA = 'ddc-v1'` | `scripts/tmp/leggi-ddc.ts:32` | **nessuna**: file usa-e-getta, ignorato da git, resta valido perché la versione non cambia |
| `testo_conformita` in `seed.sql:196-198` | seed | **nessuna in questo piano**: è il referral ① (testo diverso nella sostanza) |

---

## Task 1 — Il registro delle versioni, e le due definizioni che si contraddicono

**Files:**
- Modify: `src/lib/pdf/generate-ddc.ts:33-41`
- Modify: `supabase/schema.sql:1249`
- Test: `tests/unit/generate-ddc.test.ts`

**Interfaces:** produce nulla di nuovo. `VERSIONE_TEMPLATE_DDC` resta `'ddc-v1'` e resta privata al modulo.

- [ ] **Step 1: scrivi la prova che fissa il valore**

In `tests/unit/generate-ddc.test.ts`, nel `describe` che già contiene le prove sulle due impronte (quelle a
`:202` e `:210`) e che ha già il suo
`beforeEach(() => { mockTables(LAB_FIXTURE) })`:

```ts
  it('template_version resta `ddc-v1` — il salto è riservato a un cambiamento di SOSTANZA (D105)', async () => {
    // Non è tautologico: fissa una DECISIONE. La prova vicina (`:202`) chiede solo
    // che la colonna sia valorizzata (`toBeTruthy`), quindi un bump passerebbe
    // inosservato. Chi alzerà la versione passa di qui, e il registro accanto alla
    // costante gli dice quando è lecito farlo.
    await generateDdC(LAVORO_FIXTURE)
    const riga = mockInsert.mock.calls[0][0]
    expect(riga.template_version).toBe('ddc-v1')
  })
```

- [ ] **Step 2: esegui e verifica che passi (è una rete, non un rosso)**

Run: `npx vitest run tests/unit/generate-ddc.test.ts`
Atteso: **verde**. Questo test nasce verde di proposito: fissa lo stato attuale perché un cambio futuro
diventi visibile. Se nasce rosso, hai sbagliato l'apparecchio: fermati e riferisci.

- [ ] **Step 3: scrivi il registro accanto alla costante**

In `src/lib/pdf/generate-ddc.ts`, sostituisci il blocco di commento alle righe 33-40 con:

```ts
/** La versione della FORMA del documento. Cambia quando cambia **ciò che il
 *  documento dice** — non a ogni ritocco di codice, e non per un glifo.
 *
 *  🛑 Introdotta con D102, e «introdotta» è la parola giusta: la colonna
 *  `template_version` esiste in `supabase/schema.sql` dal primo giorno e non
 *  l'ha mai scritta nessuno. Fra dieci anni (quindici per gli impiantabili) è la
 *  riga che permette di rileggere un documento sapendo come andava letto.
 *
 *  ═══ REGISTRO DELLE VERSIONI ═════════════════════════════════════════════
 *  `ddc-v1` — dalla prima emissione con le impronte (03/08/2026) a oggi.
 *     Comprende, per decisione **D105**, anche la correzione ortografica del
 *     03/08 (gli accenti in titolo, §7 ed etichetta della firma, e `e'` → `è`
 *     nel testo di conformità) e la comparsa del **§2 — Data di emissione**:
 *     nessuna delle due cambia ciò che il documento DICE.
 *  🔑 Il salto a `ddc-v2` è riservato al primo cambiamento di **sostanza** —
 *     un contenuto dell'Allegato XIII che entra, esce o cambia significato.
 *     I candidati sono già in `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md`
 *     §5 (referral ①②③④): la clausola «e ai disposti dell'Allegato XIII», il
 *     luogo di fabbricazione mancante, il «Sostanze/tessuti: No» affermato senza
 *     dato, l'identificazione del paziente che può ridursi a un trattino.
 *  ═════════════════════════════════════════════════════════════════════════ */
```

- [ ] **Step 4: togli la contraddizione nello schema**

In `supabase/schema.sql:1249` sostituisci:

```sql
  template_version      TEXT,               -- Es. "ddc-v1.2.0" — versione template react-pdf
```

con:

```sql
  template_version      TEXT,               -- Es. "ddc-v1" — versione della FORMA del documento; il registro
                                            -- di cosa contiene ogni versione vive accanto alla costante in
                                            -- src/lib/pdf/generate-ddc.ts. NON è un semver: si conta 1, 2, 3.
```

⚠️ `supabase/schema.sql` è il ritratto dello schema, non una migration: si modifica il commento e basta,
**nessun `ALTER`**, nessun file nuovo in `supabase/migrations/`.

- [ ] **Step 5: verifica che non hai rotto niente**

Run: `npx tsc --noEmit && npx vitest run tests/unit/generate-ddc.test.ts`
Atteso: tsc **0 errori**, suite del file **verde**.

- [ ] **Step 6: commit**

```bash
git add src/lib/pdf/generate-ddc.ts supabase/schema.sql tests/unit/generate-ddc.test.ts
git commit -F <messaggio fuori dal repo>
```

Messaggio: `docs(ddc): il registro delle versioni, e le due definizioni smettono di contraddirsi (D105)`

---

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
    // 🛑 Nessun refuso residuo, in NESSUN punto del foglio: «CONFORMITA» senza
    //    accento non è sottostringa di «CONFORMITÀ» (À ≠ A), quindi questa riga
    //    si accende su qualunque occorrenza rimasta — comprese quelle che le
    //    asserzioni puntuali non guardano.
    expect(pdfText).not.toContain('CONFORMITA')
    expect(pdfText).not.toContain('Conformita')
  })

  it('l\'etichetta della firma porta l\'accento', () => {
    expect(pdfText).toContain('Responsabile della Conformità (PRRC)')
  })

  it('il titolo del §7 porta l\'accento', () => {
    // ⚠️ CORRETTO IN CORSA (difetto del piano, trovato dall'esecutore del Task 2):
    //    `styles.sectionTitle` (DdcTemplate.tsx:86) ha `textTransform:'uppercase'`,
    //    quindi il foglio stampa il §7 in MAIUSCOLO. L'etichetta della firma no
    //    (`firmaLabel` non ha uppercase): le due asserzioni hanno forme diverse
    //    perché i due stili sono diversi, non per distrazione.
    expect(pdfText).toContain('§7 — DICHIARAZIONE DI CONFORMITÀ')
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

## Task 6 — La copia dormiente nel database (migration nuova)

**Files:**
- Create: `supabase/migrations/20260803120000_default_testo_conformita_accentato.sql`
- Test: verifica sul database vero (sotto)

**Interfaces:** nessuna. Il DEFAULT non compare nei tipi generati.

- [ ] **Step 1: scrivi la migration**

```sql
-- D104 — il DEFAULT di `testo_conformita_snapshot` porta la stessa frase del
-- generatore, e fino a oggi portava la stessa frase SENZA accento.
--
-- ═══ PERCHÉ ESISTE QUESTO FILE ═══════════════════════════════════════════════
-- La frase vive in due posti: `src/lib/pdf/generate-ddc.ts` (che la scrive a ogni
-- emissione) e il DEFAULT di questa colonna, messo da `002_fase2_schema.sql:188-189`.
-- Oggi il default NON spara mai — il generatore valorizza sempre entrambe le
-- colonne (`generate-ddc.ts:147-148`) — ma `supabase/seed.sql` inserisce righe
-- senza lo snapshot, e quelle lo prendono. Correggendo solo il TypeScript
-- resterebbero in casa DUE verità canoniche, e la seconda tornerebbe a valere il
-- giorno in cui un writer futuro omettesse la colonna: una dichiarazione marcata
-- con la forma nuova, e dentro il testo vecchio.
--
-- 🛑 La migration del 2026-05 NON si riscrive: è il registro di ciò che è
--    successo. Si allinea qui.
-- 🛑 Non si usa DROP DEFAULT, che pure sarebbe più pulito: la colonna è NOT NULL
--    e il seme inserisce righe senza valorizzarla — toglierlo lo romperebbe.

ALTER TABLE public.dichiarazioni_conformita
  ALTER COLUMN testo_conformita_snapshot SET DEFAULT
    'Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all''Allegato I e ai disposti dell''Allegato XIII del Reg. (UE) 2017/745.';
```

⚠️ In SQL l'apostrofo si raddoppia (`all''Allegato`), **l'accento no**: `è` si scrive tale e quale.

- [ ] **Step 2: applica sul progetto reale**

Run: `npx supabase db push --yes`
Atteso: la migration risulta applicata. 🔑 Il CI **non** applica le migrazioni: si fanno a mano.

- [ ] **Step 3: prova che il default è cambiato DAVVERO, con un valore che lo esercita**

Un `ALTER` riuscito prova la sintassi, non il comportamento (R-P1). Scrivi uno scriptino usa-e-getta in
`scripts/tmp/` che legga il default dal catalogo:

```sql
SELECT column_default
  FROM information_schema.columns
 WHERE table_name = 'dichiarazioni_conformita'
   AND column_name = 'testo_conformita_snapshot';
```

Atteso: la stringa contiene `dispositivo è conforme` e **non** `dispositivo e'' conforme`.
🛑 Incolla l'output nel referto.

- [ ] **Step 4: FASE 6b — i tipi e il compilatore**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: `tsc` **0 errori**. Il file dei tipi non dovrebbe cambiare (i default non ci finiscono): se cambia,
guarda il diff e riferiscilo.

- [ ] **Step 5: commit**

```bash
git add supabase/migrations/20260803120000_default_testo_conformita_accentato.sql src/types/database.types.ts
git commit -F <messaggio fuori dal repo>
```

Messaggio: `fix(db): il DEFAULT della frase di conformità porta l'accento (D104)`

---

## Task 7 — Chiusura: FASE 7 intera, il documento vero, e la memoria

**Files:**
- Modify: `memory/MEMORY.md`, `memory/SESSION_ACTIVE.md`, `docs/roadmap/ROADMAP-UFFICIALE.md`

- [ ] **Step 1: FASE 7 per intero, output incollato**

```bash
npx tsc --noEmit
npx vitest run
npx next build
```

Atteso: `tsc` **0** · `vitest` verde (riferimento ad albero pulito prima di questo lavoro: **370 | 3** file e
**4267 | 19** prove — il numero cresce coi test nuovi) · `next build` **ok**.
🛑 `tsc` non valida la firma degli handler di rotta: i tre comandi sono tre, nessuno sostituisce l'altro.

- [ ] **Step 2: emetti un documento VERO e guardalo**

Il difetto di partenza è stato trovato **guardando un foglio**, non misurando. Ripeti il giro della verifica
del 03/08, che è reversibile:

Segui la ricetta del referto `docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md` §6: accedi al
banco con il link monouso, consegna un lavoro **pronto e senza DdC attiva**, scarica il PDF e **guardalo**;
poi **annulla la consegna** entro dieci minuti. Controlla a occhio: titolo con l'accento, §1 · §2 · §3 in
fila, §7 e firma accentati, una sola pagina.

- [ ] **Step 3: aggiorna roadmap e memoria (BP-1)**

- `ROADMAP-UFFICIALE.md`: la **voce 8** passa a fatta (restano i referral della spec §5, che diventano voci).
- `MEMORY.md` + `SESSION_ACTIVE.md`: cosa è cambiato, con i numeri di FASE 7 misurati.

- [ ] **Step 4: commit e pubblicazione**

```bash
git add memory/MEMORY.md memory/SESSION_ACTIVE.md docs/roadmap/ROADMAP-UFFICIALE.md
git commit -F <messaggio fuori dal repo>
```

🛑 **La pubblicazione (`git push`) si chiede a Francesco**, non si dà per acquisita.

---

## Cosa questo piano NON fa

I **nove referral** della spec §5 restano fuori: la clausola «e ai disposti dell'Allegato XIII», il luogo di
fabbricazione mai stampato, il «Sostanze/tessuti: No» affermato senza dato, il paziente che può ridursi a un
trattino, la citazione «Art. 2(1)(3)», la nomina PRRC che non si conserva e si riscrive la data, l'impronta
del payload non ricalcolabile, la contraddizione sulla base normativa della conservazione, e «Non Conformita
Recenti» in una schermata. **Ognuno è una voce sua.** Chi esegue e ne incontra uno lo **riferisce** (R-E2).
