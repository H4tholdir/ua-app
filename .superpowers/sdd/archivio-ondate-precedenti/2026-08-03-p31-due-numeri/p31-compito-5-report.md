# Referto — Compito 5: «Il campo condiviso impara due cose»

Ramo: `p31-due-numeri-per-il-cliente`. Commit: `06f5f626`.

## Cosa ho fatto

`CampoTesto` (`src/components/ds/Campo.tsx`) impara due cose, entrambe come prop opzionali:

1. **`aiuto?: string`** — riga sotto il campo (`<p>`), legata all'input con `aria-describedby`
   (solo quando `aiuto` è passato — altrimenti l'attributo è `undefined` e non compare nel DOM).
   Colore `var(--muted)`, mai `var(--faint)` — vedi verifica del contrasto sotto.
2. **`inputMode?: 'tel'`** — passato direttamente all'`<input>`; se non specificato resta
   `undefined` e React non renderizza l'attributo `inputmode`, quindi nessun cambiamento per chi
   non lo passa.

Nessun nuovo import necessario: `useId`, `ChangeEvent`, `CSSProperties` erano già importati in
cima al file per gli altri usi dello stesso modulo.

## Verifica preliminare (prima di scrivere)

Ho letto `src/components/ds/Campo.tsx:57-90` prima di toccare qualunque cosa, come richiesto.
**La firma vera combaciava esattamente con quella mostrata nel brief** (`label`, `valore`,
`onCambia`, `placeholder`, `autoFocus?`), e anche `stileLabel` (righe 22-30) era identico a quanto
il brief presupponeva. Nessun adattamento necessario: ho potuto usare il codice del brief alla
lettera.

## TDD — le prove, il rosso, il verde

**Passo 1** — creato `tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx` (4 test, testo
del brief usato alla lettera).

**Passo 2 — Rosso**, PRIMA di toccare `Campo.tsx`:

```
npx vitest run tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx

 ❯ tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx (4 tests | 2 failed) 42ms
     × con aiuto lo rende, e lo LEGA all-input per chi usa un lettore di schermo 9ms
     × con inputMode tel chiede al telefono il tastierino 3ms

 Test Files  1 failed (1)
      Tests  4 failed... → 2 failed | 2 passed (4)
```

**Conteggio al primo rosso: 2 fallite, 2 passate — esattamente l'atteso del brief.**
Le due che falliscono non fanno «modulo non trovato» (rosso debole, R-P4): falliscono
sull'asserzione vera —
`AssertionError: expected null to be truthy` (su `aria-describedby`) e
`AssertionError: expected null to be 'tel'` (su `inputmode`) — cioè il test *misura* il
comportamento mancante, non un errore di importazione.
Le due che passano («senza aiuto zero `<p>`», «senza inputMode nessun attributo») sono la rete di
non-regressione per le altre 13 schermate, e passano **prima** del mio cambiamento: è quello che
le rende credibili.

**Passo 3** — implementato `aiuto`/`inputMode` in `CampoTesto` + `stileAiuto` accanto a
`stileLabel`, codice del brief usato alla lettera (nessun adattamento necessario).

**Passo 4 — Verde:**

```
npx vitest run tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx
 Test Files  1 passed (1)
      Tests  4 passed (4)

npx vitest run tests/unit/ds-v3/componenti/campo.test.tsx   (suite esistente dello stesso componente)
 Test Files  1 passed (1)
      Tests  37 passed (37)

npx vitest run   (suite intera)
 Test Files  389 passed | 3 skipped (392)
      Tests  4515 passed | 19 skipped (4534)

npx tsc --noEmit
(nessun output — zero errori)
```

Il messaggio `Not implemented: navigation to another Document` che compare nell'output della
suite intera **non è nuovo e non è mio**: viene da `window.location.href =` usato altrove
(`src/app/admin/admin-nav.tsx`, `src/components/features/ordini/NuovoOrdineSheet.tsx`,
`src/app/admin/labs/[id]/lab-actions.tsx`, `src/components/features/rete/AccettaInvitoReteForm.tsx`)
— nessuno di questi file è stato toccato in questo compito.

## File cambiati

- `src/components/ds/Campo.tsx` — `CampoTesto` (righe 68-116 circa) + nuova costante `stileAiuto`
  (accanto a `stileLabel`). +29/-1 righe.
- `tests/unit/ds-v3/componenti/campo-aiuto-e-tastiera.test.tsx` — nuovo, 4 test.

Nessun altro file toccato.

## Deviazione dal Passo 5 del brief (segnalata, non nascosta)

Il brief propone `git commit -m "feat(ds): ..."`. Il mandato di sessione vieta esplicitamente il
messaggio da riga di comando (`git commit -F <file>`, mai `-m`) — coerente col fatto che il
messaggio contiene un apostrofo (`impara l'aiuto`), la stessa categoria di carattere che ha già
causato problemi due volte in questa sessione. Ho scritto il messaggio in un file di scratchpad e
committato con `git commit -F`. Il commit `06f5f626` è passato con tutti i pre-commit hook verdi
(lint, DS compliance v2.3+v3, guardia CSRF, guardia coerenza documenti, guardia reduced-motion,
guardia salvataggio automatico) e **senza `--no-verify`**.

## Autorevisione

- **Completezza:** entrambe le prop ci sono. `aria-describedby` è collegato: punta a
  `${id}-aiuto`, e quel `<p>` esiste con quello stesso `id` solo quando `aiuto` è passato — nessun
  riferimento pendente nel caso senza `aiuto` (l'attributo stesso è `undefined`, non una stringa
  vuota).
- **Qualità dei commenti:** il commento su `stileAiuto` spiega perché `--muted` e non `--faint`
  (P30-bis) e perché non è un colore semantico (non è un errore). L'ho **verificato con un calcolo
  vero**, non solo trascritto dal brief (vedi sotto).
- **Disciplina sulle 13 schermate:** verificate con `grep -rln "CampoTesto" src/ | grep -v
  components/ds/Campo.tsx` → **13 file esatti** (elenco: `ds-v3-catalogo/page.tsx`,
  `SchedaPersonaSheet.tsx`, `InvitoPersonaSheet.tsx`, `ModificaRigaSheet.tsx`,
  `PassoPaziente.tsx`, `CatalogoTipiSheet.tsx`, `NuovoDentistaSheet.tsx`, `PassoDentista.tsx`,
  `PilaAperta.tsx`, `PassoTipo.tsx`, `ConfermaCassettaSheet.tsx`, `NuovaCassettaSheet.tsx`,
  `CassettaSheet.tsx`) — **il numero del brief regge**, contato non ereditato. Nessuno di questi
  passa oggi `aiuto` o `inputMode` (nessuna delle due prop esisteva prima di questo commit), quindi
  il comportamento per tutti e 13 non cambia. La suite intera (4515 test verdi) lo conferma
  empiricamente, inclusi i 37 test di `campo.test.tsx` dedicati proprio a questo componente.
- **Prove pulite:** nessun avviso nuovo nell'output (l'unico avviso presente, `navigation to
  another Document`, è preesistente e tracciato sopra a file non toccati).

### Verifica del numero di contrasto (non solo trascritto)

Il brief e `CLAUDE.md` citano «`--faint` scende a 4,25:1 dentro un foglio in tema scuro». L'ho
ricalcolato io stesso (formula WCAG, luminanza relativa) invece di limitarmi a copiarlo:

```
--faint (#928778) su --elv (#2B2620, fondo del foglio in tema scuro) → 4.254:1   ← combacia col 4,25:1 citato
--muted (#A69B8C) su --elv (#2B2620)                                  → 5.489:1   ← sopra soglia
--muted (#A69B8C) su --card (#211D18, fondo piatto in tema scuro)     → 6.133:1   ← sopra soglia
```

`--muted` è sicuro sia che il fondo vero del foglio in tema scuro sia `--elv` (come misurato in
P30-bis) sia che sia `--card` (quanto scrive oggi `Sheet.tsx:508`, `background: 'var(--card)'` —
i due documenti non concordano su quale sia il fondo vero, ma non serve risolverlo qui: `--muted`
regge in entrambi i casi, quindi la scelta imposta dal brief è corretta indipendentemente da quella
domanda aperta).

## Ritrovamenti fuori mandato (riferiti, non corretti — R-E2)

1. **Il catalogo v3 (`src/app/ds-v3-catalogo/page.tsx:938-943`) non mostra le nuove varianti di
   `CampoTesto`.** La sezione «Campo» (§914-947) monta un solo `CampoTesto` demo (senza `aiuto` né
   `inputMode`). Se il catalogo ha la funzione di enumerare esaustivamente gli stati di un
   componente, questa prop nuova meriterebbe una riga demo lì — ma è fuori dall'elenco file di
   questo compito, quindi non l'ho toccato.
2. **Discrepanza fra `Sheet.tsx` e la documentazione P30-bis sul fondo del foglio in tema scuro.**
   `Sheet.tsx:508` scrive `background: 'var(--card)'` col commento «il pannello... è anch'esso
   `--card`», mentre P30-bis (roadmap + spec P31) misura il contrasto di `--faint` contro `--elv`
   («il fondo di un foglio»). Ho verificato che questo non cambia la mia scelta (`--muted` regge
   contro entrambi), ma la discrepanza fra codice e documentazione sul "quale sia il vero sfondo di
   un foglio in scuro" resta aperta e potrebbe meritare un chiarimento in futuro — non l'ho
   indagata oltre perché fuori mandato.

Nessun altro difetto trovato fuori mandato.

## Stato

✅ **FATTO.** Pronto per il Compito 7 (i due numeri nel wizard nuovo dentista).
