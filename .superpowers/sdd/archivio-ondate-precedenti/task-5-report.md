# Task 5 — Report: l'accento nella nomina del PRRC

> Nota: questo file conteneva un referto di un task diverso e non correlato (un vecchio Task 5
> «PATCH /api/pazienti/[id]» di un'altra ondata). Sostituito col referto del task effettivamente
> assegnato in questa sessione (brief: `.superpowers/sdd/task-5-brief.md`, «L'accento nella nomina
> del PRRC»).

## Scarto rispetto al brief

Nessuno sui numeri di riga: il brief indicava `NominaPrrcTemplate.tsx:341` come target di modifica
e `340-342` come blocco di codice. Trovato `<Text style={styles.sectionTitle}>` in apertura a riga
340 e la stringa col refuso a riga 341 — combacia esattamente, nessuno spostamento.

**Uno scarto vero c'è, ed è quello che il brief avvisava di controllare (punto 4 del contesto):**
il brief proponeva l'asserzione

```ts
expect(result.text).toContain('Responsabilità ai sensi')
expect(result.text).not.toContain('Responsabilita ai sensi')
```

in forma mista. Prima di scriverla ho guardato lo stile `sectionTitle`
(`NominaPrrcTemplate.tsx:108-117`):

```ts
sectionTitle: {
  fontSize: 9,
  fontFamily: 'Helvetica-Bold',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
  color: '#0f1e52',
  ...
}
```

`textTransform: 'uppercase'` è presente. Precedente già in casa: `DdcTemplate.tsx` ha lo stesso
stile sul proprio `sectionTitle` (riga 86) e `tests/unit/ddc-pdf-content.test.ts:110-138` prova
esplicitamente che react-pdf rende le maiuscole VERE nel testo estratto («provato:
scripts/tmp/sonda-accenti.tsx», commento a riga 110-113 di quel file), À compresa. Ho quindi scritto
l'asserzione pretendendo la forma maiuscola, non quella mista del brief — e l'ho verificato empiricamente
in fase rossa (vedi sotto): la forma maiuscola è esattamente quella uscita dal parser.

Se avessi seguito l'asserzione del brief alla lettera, il test sarebbe rimasto rosso ANCHE dopo la
correzione del componente (quarto difetto dello stesso tipo trovato nei task di questa ondata, per
usare le parole del contesto).

## Step 1 — la prova, prima (RED)

Aggiunto in `tests/unit/generate-nomina-prrc.test.ts`: import di `PDFParse` da `pdf-parse`, e un
nuovo test che genera il PDF, ne estrae il testo, e verifica il titolo di sezione.

## Step 2 — rosso, verificato

Comando:
```
npx vitest run tests/unit/generate-nomina-prrc.test.ts
```
Output reale (troncato alle righe rilevanti):
```
 FAIL  tests/unit/generate-nomina-prrc.test.ts > generateNominaPrrc > il titolo di sezione porta l'accento: «Responsabilità ai sensi dell'Art. 15(1)»
AssertionError: expected 'Laboratorio Odontotecnico Opromolla S…' to contain 'RESPONSABILITÀ AI SENSI'
...
+ RESPONSABILITA AI SENSI DELL'ART. 15(1) MDR 2017/745
...
 Test Files  1 failed (1)
      Tests  1 failed | 2 passed (3)
```
Rosso confermato, e per il motivo giusto: il testo estratto dal PDF contiene letteralmente
`RESPONSABILITA AI SENSI DELL'ART. 15(1) MDR 2017/745` — maiuscolo (per il `textTransform`) e senza
accento (il refuso). Questo dump è anche la controprova empirica che l'asserzione del brief (forma
mista) sarebbe stata cieca: quella stringa non compare mai in questo documento.

## Step 3 — correzione

`src/components/features/pdf/NominaPrrcTemplate.tsx:341`:
```diff
-          Responsabilita ai sensi dell&apos;Art. 15(1) MDR 2017/745
+          Responsabilità ai sensi dell&apos;Art. 15(1) MDR 2017/745
```
`&apos;` (l'apostrofo di `dell'Art.`) lasciato intatto, come da avviso del contesto — non è un
accento.

## Step 4 — verde, verificato

```
npx vitest run tests/unit/generate-nomina-prrc.test.ts
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Rete rafforzata dopo autorevisione (advisor)

L'asserzione negativa iniziale era `not.toContain('RESPONSABILITA AI SENSI')` — la frase intera,
non lo stem nudo. Confrontato con il precedente diretto (`ddc-pdf-content.test.ts:125-126`, che usa
`not.toContain('CONFORMITA')` nudo), ho verificato che lo stem nudo `RESPONSABILITA` passa comunque
sul foglio reso da questa fixture (nessun'altra occorrenza fuori dal titolo), e l'ho adottato:
```ts
expect(result.text).toContain('RESPONSABILITÀ AI SENSI')
expect(result.text).not.toContain('RESPONSABILITA')
```
Rieseguito: verde, invariato (3/3).

## Verifica di non regressione — grep sull'intero repo

```
grep -rni "responsabilita\b" tests/ src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```
Output:
```
tests/unit/generate-nomina-prrc.test.ts:51:    expect(result.text).not.toContain('RESPONSABILITA')
src/components/features/pdf/NominaPrrcTemplate.tsx:232:// ─── Responsabilita Art. 15(1) ─────────────────────────────────────────────
src/components/features/pdf/NominaPrrcTemplate.tsx:339:        {/* ── RESPONSABILITA ART. 15(1) ── */}
```
Nessun'altra occorrenza del refuso in codice o test al di fuori di questo file. Le due rimanenti
sono commenti sorgente (mai renderizzati nel PDF) — vedi «Ritrovamenti fuori mandato» sotto.

## Suite intera

```
npx vitest run
Not implemented: navigation to another Document
 Test Files  370 passed | 3 skipped (373)
      Tests  4274 passed | 19 skipped (4293)
   Duration  28.41s
```
Tutto verde, nessuna regressione. Il warning jsdom `Not implemented: navigation to another Document`
è preesistente e non correlato (già documentato nei report dei task precedenti dell'ondata).

## Autorevisione

- Toccati solo i due file autorizzati: `src/components/features/pdf/NominaPrrcTemplate.tsx` e
  `tests/unit/generate-nomina-prrc.test.ts` (verificato con `git diff` — vedi sotto).
- `&apos;` non toccato in nessuno dei suoi punti (301, 311, 312, 341, 385, 390, 417).
- Il titolo di sezione esce MAIUSCOLO nel PDF renderizzato (`textTransform: 'uppercase'` su
  `styles.sectionTitle`, riga 111): la forma pretesa dal test finale è
  `RESPONSABILITÀ AI SENSI DELL'ART. 15(1) MDR 2017/745`, non quella mista proposta dal brief.
- Nessun altro riferimento al refuso resta raggiungibile dal testo estratto del PDF.

```
git diff --stat -- src/components/features/pdf/NominaPrrcTemplate.tsx tests/unit/generate-nomina-prrc.test.ts
 src/components/features/pdf/NominaPrrcTemplate.tsx | 2 +-
 tests/unit/generate-nomina-prrc.test.ts             | 18 ++++++++++++++++++
 2 files changed, 19 insertions(+), 1 deletion(-)
```

## Ritrovamenti fuori mandato (R-E2 — riferiti, non corretti)

- `NominaPrrcTemplate.tsx:232` — commento di codice `// ─── Responsabilita Art. 15(1) ───` senza
  accento. Non raggiunge mai il PDF (è un commento sorgente), fuori dal mandato del task (che
  riguarda il testo renderizzato). Non toccato.
- `NominaPrrcTemplate.tsx:339` — commento JSX `{/* ── RESPONSABILITA ART. 15(1) ── */}`, stessa
  situazione. Non toccato.

Entrambi cosmetici e senza impatto sull'utente finale; segnalati per completezza, non corretti
(fuori dal file/riga assegnati dal brief).

## Memoria (BP-0/BP-1)

Non aggiornati `memory/MEMORY.md` né `docs/roadmap/ROADMAP-UFFICIALE.md`: task atomico (Task 5 di
un'ondata multi-task ancora in corso), stesso schema seguito dai report dei task precedenti
dell'ondata (nessuno di essi tocca la memoria per un singolo task SDD).
