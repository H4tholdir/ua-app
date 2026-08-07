# Task 8 — Report: `PazienteEditSheet` — la via di correzione

## Cosa è stato scritto

### File modificati

1. **`src/components/features/pazienti/PazienteEditSheet.tsx`**
   - Import di `cognomeEffettivo` da `@/lib/domain/nome-paziente-scrittura`.
   - `PazienteEditProps.paziente` esteso con `nome: string | null` e `cognome: string | null`.
   - `useState(form)` esteso con:
     - `cognome: cognomeEffettivo(paziente.cognome, paziente.codice_paziente)` — pre-riempimento
       che nasconde il «codice travestito» (vedi §2 del brief): se `cognome` in DB coincide
       (case-insensitive) col `codice_paziente`, la casella parte vuota.
     - `nome: paziente.nome ?? ''`
   - Due nuove caselle inserite subito dopo quella del codice paziente, con `htmlFor`/`id`
     espliciti (`paz-cognome`, `paz-nome`) — le uniche due associazioni label↔input aggiunte,
     come da perimetro indicato (non toccate le altre label del file).
   - `handleSave` invariato nella struttura: continua a spedire `JSON.stringify(form)` per
     intero, quindi `cognome`/`nome` entrano automaticamente nel payload PATCH.

2. **`src/app/(app)/pazienti/[id]/page.tsx`**
   - `select('...')` esteso con `nome, cognome`.
   - Oggetto passato a `<PazienteEditSheet paziente={{ ... }}>` esteso con
     `nome: (paziente as Record<string, unknown>).nome as string | null ?? null` e lo stesso
     pattern per `cognome`, coerente con lo stile già usato nel file per `anamnesi`/`asl`/`sesso`/
     `data_nascita` (il tipo di `paziente` ritornato da Supabase non è tipizzato a grana fine, da
     qui il cast già presente per gli altri campi opzionali).

3. **`tests/unit/PazienteEditSheet.test.tsx`** (nuovo) — esattamente il contenuto del brief
   (Step 1), nessuna modifica.

Nessun altro file toccato. Verificato con `git status --porcelain`: solo i 2 file sopra risultano
modificati, più il test nuovo (oltre a file non tracciati pre-esistenti e non miei: cartelle
`.claude/skills/*` e un ledger in `docs/design/screenshots/`, non toccati da questo task).

## Fase RED — output reale

Comando: `npx vitest run tests/unit/PazienteEditSheet.test.tsx` (prima dell'implementazione,
solo col test scritto e nessuna casella Cognome/Nome nel componente).

Esito: **3 test falliti su 3**. Il fallimento chiave (troncato per brevità, il primo dei tre):

```
❯ Object.getElementError node_modules/@testing-library/dom/dist/config.js:37:19
❯ getAllByLabelText node_modules/@testing-library/dom/dist/queries/label-text.js:111:38
❯ tests/unit/PazienteEditSheet.test.tsx:38:29
    36|     const user = userEvent.setup()
    37|     await user.click(screen.getByRole('button', { name: /modifica/i }))
    38|     await user.clear(screen.getByLabelText(/Cognome/i))
      |                             ^
    39|     await user.type(screen.getByLabelText(/Cognome/i), 'Bagheria')
    40|     await user.click(screen.getByRole('button', { name: /salva/i }))

 Test Files  1 failed (1)
      Tests  3 failed (3)
```

I tre falliscono per lo stesso motivo: `getByLabelText(/Cognome/i)` non trova alcun elemento —
le caselle non esistono ancora nel DOM renderizzato (confermato dal dump completo del DOM, che
mostra Codice paziente → Sesso → Data nascita → ASL → Anamnesi → Note, nessun Cognome/Nome).

## Fase GREEN — output reale

Dopo l'implementazione (Step 3), stesso comando:

```
RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  838ms
```

## Prove di mutazione — esito reale

**Mutazione 1** — pre-riempimento del cognome col valore grezzo invece di `cognomeEffettivo`:
```ts
// prima:
cognome: cognomeEffettivo(paziente.cognome, paziente.codice_paziente),
// mutato in:
cognome: paziente.cognome ?? '',
```
Rieseguito `npx vitest run tests/unit/PazienteEditSheet.test.tsx`:
```
× 🛑 il «codice travestito» NON compare nella casella Cognome (inviterebbe a cancellarlo) 17ms
Error: expect(element).toHaveValue()
Expected the element to have value: (empty)
Received: PZ-0042
 Tests  1 failed | 2 passed (3)
```
**Diventa rosso**, esattamente il test previsto ("il codice travestito"). Ripristinato subito dopo
alla versione con `cognomeEffettivo`.

**Mutazione 2** — il salvataggio non include `cognome` nell'invio:
```ts
// prima:
body: JSON.stringify(form),
// mutato in:
body: JSON.stringify({ ...form, cognome: undefined }),
```
Rieseguito lo stesso comando:
```
× salvare invia nome e cognome nella PATCH
AssertionError: expected { codice_paziente: 'PZ-0042', …(6) } to match object { cognome: 'Bagheria', …(1) }
- "cognome": "Bagheria",
  "nome": "Giuseppe",
 Tests  1 failed | 2 passed (3)
```
**Diventa rosso**, esattamente il test previsto ("salvare invia nome e cognome"). Ripristinato
subito dopo alla versione `body: JSON.stringify(form)`.

Nessun buco: entrambe le mutazioni sono state colte dal test dedicato, senza effetti collaterali
sugli altri due test in nessuno dei due casi.

## `tsc --noEmit`

```
$ npx tsc --noEmit
(nessun output — zero errori)
```

## `eslint`

```
$ npx eslint src/components/features/pazienti/ "src/app/(app)/pazienti/"
(nessun output — zero warning/errori)
```

## Suite intera

```
$ npx vitest run
 Test Files  336 passed | 3 skipped (339)
      Tests  3414 passed | 19 skipped (3433)
   Duration  56.75s
```

Riferimento del brief: 3411 passati / 19 saltati + i 3 nuovi test di questo task = 3414. Combacia
esattamente. Nessuna regressione altrove.

## Autorevisione

- **Perimetro rispettato**: non toccato il wizard (`src/components/features/wizard/*`,
  `src/lib/wizard/*`), non toccate le route `src/app/api/pazienti/[id]/route.ts` o
  `src/app/api/pazienti/route.ts` (solo lette per confermare l'allowlist server-side già
  presente da Task 5).
- **Design system**: nessun componente `src/components/ds/` né token `src/design-system/v3/*`
  importato. Riusati `inputStyle`/`labelStyle` e `motionTokens` già presenti nel file — nessuna
  duration/easing inventata.
- **Accessibilità**: aggiunta `htmlFor`/`id` solo sulle due caselle nuove (`paz-cognome`,
  `paz-nome`), come richiesto — le altre label del file restano non associate, non essendo nel
  perimetro di questo task.
- **Trappola del codice travestito**: verificata concretamente sia in fase GREEN (test dedicato)
  sia in mutazione (la casella torna a mostrare `PZ-0042` se si bypassa `cognomeEffettivo` —
  esattamente il comportamento che il brief descrive come pericoloso).
- **Rischio residuo**: nessuno identificato. Il salvataggio invia l'intero `form` (comportamento
  preesistente, non modificato), e la protezione contro un cognome/nome vuoto o dannoso è
  interamente lato server (Task 5), come da disegno esplicito del brief — qui si è solo aperta
  la via di input, senza duplicare validazioni che già vivono nella route PATCH.
- Nessun dubbio aperto.
