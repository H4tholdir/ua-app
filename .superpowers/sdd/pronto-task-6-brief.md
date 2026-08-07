# BRIEF — Task 6 del piano «Torna a `pronto` col documento intatto»

**Piano:** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md` (Task 6)
**Spec:** `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md` — §0 e §1
**Ramo:** `intervento-post-consegna` (già in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `83a899fd`. I Task 1-5 sono **COMPLETI** e non si rifanno.

🛑 **QUESTO TASK NON HA MIGRATION.** Niente `date -u`, niente `db push`, niente FASE 6b, niente
credenziali. È tutto TypeScript in due file di prove e un modulo.

⚖️ **IL TASK È STATO EMENDATO POCO FA (D312) — il Passo 0 è nuovo e non era nel piano di ieri sera.**

---

## Task 6 — L'elenco degli effetti impara il bivio

**File:**
- Modifica: `src/lib/qualita/effetti.ts`
- Prova: `tests/unit/qualita-effetti.test.ts` (esiste)

**Interfacce:**
- Produce: `export type Scelta = 'si_sistema' | 'si_rifa'` ·
  `export function effettoDaMotivoEScelta(motivo: Motivo, scelta: Scelta | null): Effetto` ·
  `AzioneAutomatica = 'riapri_lavoro' | 'torna_pronto' | 'crea_rifacimento'` ·
  `export const MOTIVI_CON_SCELTA: readonly Motivo[]`.
- Modifica anche: la riga fissa `EFFETTI_PER_MOTIVO.destinatario_errato` (Passo 0) ·
  `tests/unit/eventi-qualita-route.test.ts` (una sola asserzione, Passo 0 ②).

- [ ] **Passo 0 — 🔴 EMENDAMENTO DEL 07/08 NOTTE (censimento prima di scrivere): «PERSONA SBAGLIATA» NON HA UN PADRONE**

La spec **§0** elenca **TRE** motivi che devono riportare il lavoro fra i pronti lasciando viva la
dichiarazione. Questo task ne costruisce **due** (`MOTIVI_CON_SCELTA`); il terzo —
`destinatario_errato` — vive in una riga **fissa** di `EFFETTI_PER_MOTIVO` e oggi porta `azione: null`
(`src/lib/qualita/effetti.ts:124-131`). `effettoDaMotivoEScelta` **non la raggiunge**: per quel motivo
`richiedeScelta` è falso e la funzione restituisce `base`.
`provato:` `grep -n "EFFETTI_PER_MOTIVO" docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`
→ **zero risultati**: nessuno dei dieci task la tocca.

➡️ **Conseguenza misurata, non temuta:** il Task 7 smisterà su `effetto.azione`, che per quel motivo
resta `null` → nessun ramo si accende; e il **Task 10 chiede una prova** — «① `destinatario_errato` →
lavoro a `pronto`, dichiarazione ancora viva, `prima_immissione_at` invariata» — che **nascerebbe
rossa**, tre task più in là e con l'aria di una regressione.

⚖️ **D312 — scelta di Francesco, 07/08/2026: il terzo motivo entra in QUESTO task.**

**① La riga fissa passa a `azione: 'torna_pronto'`**, e il commento che le sta accanto va corretto:
dice «*la transizione «pronto col documento intatto» NON ESISTE ancora*» — 🛑 **è scaduto dal
PRONTO-4**, che ha costruito `riporta_a_pronto_atomica`. Un commento che nega l'esistenza di una cosa
costruita è la stessa trappola del file di prove del Task 10.

**② Tre affermazioni già scritte dicono l'opposto, e si correggono INSIEME alla riga** — l'elenco non
lo decide chi scrive, lo decide il censimento (R-P6):
- `tests/unit/qualita-effetti.test.ts:31-34` — «è l'UNICO dei nove con un'azione automatica».
  Diventano **due**: `['destinatario_errato', 'errore_registrazione']` — `provato:`
  `src/lib/domain/qualita-costanti.ts:21-31`, `destinatario_errato` è la **quarta** voce di `MOTIVI` e
  `errore_registrazione` l'**ottava**, quindi quest'ordine è quello vero. **Riverifica sull'output**,
  non su questa riga.
- `tests/unit/qualita-effetti.test.ts:38-46` — l'asserzione `expect(e.azione).toBeNull()` **e** il suo
  commento di tre righe (`:42-44`), che è il testo scaduto del punto ①.
- `tests/unit/eventi-qualita-route.test.ts:823-838` — il ciclo «GLI ALTRI OTTO MOTIVI NON la chiamano»
  asserisce `azione` nulla su sette motivi, `destinatario_errato` compreso. 🛑 **La riga
  `expect(mockRpc).not.toHaveBeenCalled()` RESTA VERA e non si tocca:** a questo task la rotta smista
  ancora solo `riapri_lavoro` (`src/app/api/lavori/[id]/eventi-qualita/route.ts:383-386`). Si toglie
  quel motivo dal ciclo e gli si dà **la sua asserzione**, con entrambe le cose che afferma: azione
  `'torna_pronto'` **e** nessuna chiamata alla RPC.

🔑 **Perché dichiarare un'azione che a questo task nessuno esegue NON è uno degli «otto rami inerti»
che il modulo vieta** (`effetti.ts:26-31`): è **la stessa finestra di un task** che il piano accetta
già per i due difetti — il **T6 dichiara**, il **T7 esegue**. Il divieto riguarda i rami finti che
sembrano agire per sempre, non la dichiarazione che il compito successivo cabla.

- [ ] **Passo 1 — le prove, PRIMA del codice**

```typescript
describe('effettoDaMotivoEScelta — il bivio dei due difetti (D304)', () => {
  it('difetto_lavorazione + si_sistema → il lavoro torna pronto, la dichiarazione resta valida', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', 'si_sistema')
    expect(e.lavoro).toBe('torna_pronto')
    expect(e.documento).toBe('resta_valido')
    expect(e.azione).toBe('torna_pronto')
  })
  it('difetto_materiale + si_rifa → nasce un lavoro nuovo, il vecchio resta consegnato', () => {
    const e = effettoDaMotivoEScelta('difetto_materiale', 'si_rifa')
    expect(e.lavoro).toBe('lavoro_nuovo')
    expect(e.documento).toBe('resta_valido')
    expect(e.azione).toBe('crea_rifacimento')
  })
  it('senza scelta restituisce la riga NON risolta, e nessuna azione', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', null)
    expect(e.lavoro).toBe('scelta_richiesta')
    expect(e.azione).toBeNull()
  })
  it('una scelta su un motivo che non la ammette NON produce nessuna azione', () => {
    const e = effettoDaMotivoEScelta('errore_prezzo_quantita', 'si_rifa')
    expect(e).toEqual(effettoDaMotivo('errore_prezzo_quantita'))
    expect(e.azione).toBeNull()
  })
  it('una chiave del prototipo non risale a Object e non porta azioni', () => {
    const e = effettoDaMotivoEScelta('constructor' as never, 'si_rifa' as never)
    expect(e.azione).toBeNull()
    expect(typeof e.perche).toBe('string')
  })
  it('il testo risolto NON ripete la domanda a cui la persona ha già risposto', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', 'si_sistema')
    expect(e.perche).not.toMatch(/oppure se ne fa uno nuovo\?/)
  })
  // ⚖️ D312 — il TERZO motivo della spec §0, che non passa dal bivio: la sua
  // azione vive nella riga fissa, e questa prova la copre da entrambe le porte.
  it('«persona sbagliata» porta ORA la sua azione, e la porta anche senza scelta (D291 · D312)', () => {
    for (const e of [
      effettoDaMotivo('destinatario_errato'),
      effettoDaMotivoEScelta('destinatario_errato', null),
      effettoDaMotivoEScelta('destinatario_errato', 'si_rifa'), // una scelta che quel motivo non ammette
    ]) {
      expect(e.lavoro).toBe('torna_pronto')
      expect(e.documento).toBe('resta_valido')
      expect(e.azione).toBe('torna_pronto')
    }
  })
})
```
🔑 **L'ultima prova non è cosmesi:** `DevoIntervenire.tsx:468` stampa `effetto.perche`, e il testo di
`effetti.ts:113` è **una domanda aperta**. Senza questa prova, la schermata finale richiede una scelta
già fatta.

- [ ] **Passo 2 — falle fallire, e CONTA** (R-P4)

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run tests/unit/qualita-effetti.test.ts 2>&1 | tail -20
```
**Atteso:** rosso da «`effettoDaMotivoEScelta` is not a function». Poi metti un **abbozzo inerte**
(`export const effettoDaMotivoEScelta = () => NEUTRO`) e **conta quante asserzioni si accendono**:
scrivi il numero nel resoconto (`N su M`).
⚠️ **E dichiara che cosa quel numero NON misura, o è falsa precisione.** Tre delle prove del Passo 1
poggiano su valori che vengono dalla **tabella fissa**, non dal ramo nuovo — la riga «senza scelta»
(`scelta_richiesta`), la riga «una scelta su un motivo che non la ammette» (`toEqual(effettoDaMotivo(…))`)
e quella di D312: possono passare **senza che il bivio sia giusto**. Le prove che misurano davvero il
ramo nuovo sono le due dei difetti più quella del testo. Scrivi entrambi i numeri.
📌 L'abbozzo inerte fa protestare `tsc` («*Expected 0 arguments, but got 2*») sui punti di chiamata:
è atteso e non è un guasto — `vitest` non guarda i tipi, quindi il conteggio gira lo stesso.

- [ ] **Passo 3 — il codice**

```typescript
/** Il bivio dei due difetti: la sceglie chi registra, e non si indovina (D290 · D297 · D304). */
export type Scelta = 'si_sistema' | 'si_rifa'

/** I soli motivi che ammettono — e pretendono — una scelta. 🔑 Questa è la FONTE:
 *  il database porta solo l'implicazione «se c'è una scelta, il motivo è uno di
 *  questi», perché il biconditionale abortirebbe sulle righe già esistenti. */
export const MOTIVI_CON_SCELTA = ['difetto_lavorazione', 'difetto_materiale'] as const satisfies readonly Motivo[]

export function richiedeScelta(motivo: Motivo): boolean {
  return (MOTIVI_CON_SCELTA as readonly string[]).includes(motivo)
}

/** L'effetto RISOLTO. Senza scelta restituisce la riga non risolta — che dichiara
 *  `scelta_richiesta` e non agisce — invece di indovinare un ramo. */
export function effettoDaMotivoEScelta(motivo: Motivo, scelta: Scelta | null): Effetto {
  const base = effettoDaMotivo(motivo)
  if (!richiedeScelta(motivo) || scelta === null) return base
  if (scelta === 'si_sistema') {
    return {
      lavoro: 'torna_pronto',
      documento: 'resta_valido',
      azione: 'torna_pronto',
      perche:
        'Si sistema questo manufatto. Il lavoro torna fra quelli pronti e la dichiarazione resta valida: il manufatto è lo stesso, e nessuno dei dati stampati cambia.',
      decisione: `${base.decisione} · D304 · D310`,
    }
  }
  if (scelta === 'si_rifa') {
    return {
      lavoro: 'lavoro_nuovo',
      documento: 'resta_valido',
      azione: 'crea_rifacimento',
      perche:
        'Se ne fa uno nuovo. Nasce subito un lavoro nuovo, collegato a questo; il lavoro di prima resta consegnato con la sua dichiarazione, e il manufatto nuovo avrà la sua quando lo consegnerai.',
      decisione: `${base.decisione} · D304 · D306`,
    }
  }
  return base
}
```
E in cima al file, l'unione allargata:
```typescript
/** Le cose che l'app fa DA SOLA, senza altre domande. */
export type AzioneAutomatica = 'riapri_lavoro' | 'torna_pronto' | 'crea_rifacimento'
```

- [ ] **Passo 4 — 🔴 EMENDAMENTO: la guardia delle parole NON vede i testi nuovi**

`provato:` `tests/unit/qualita-effetti.test.ts:117-123` — la guardia di **D301/D302** scorre `MOTIVI` e
chiama `effettoDaMotivo`, cioè **la sola tabella fissa**. I due `perche` nuovi li produce
`effettoDaMotivoEScelta`, quindi la guardia **non li esamina nemmeno**: passerebbero per non essere
stati guardati. 🛑 È la stessa famiglia dei due falsi verdi già pagati in quest'ondata — *una prova che
non guarda la cosa non è una prova che la cosa sia giusta*.
➡️ **Allarga l'INGRESSO della guardia** (non i testi: quelli del Passo 3 sono già puliti) ai quattro
esiti risolti — `MOTIVI_CON_SCELTA` × `si_sistema`/`si_rifa` — in modo che il divieto valga anche per
chi scriverà la prossima frase.

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run tests/unit/qualita-effetti.test.ts tests/unit/eventi-qualita-route.test.ts 2>&1 | tail -8
```
**Atteso:** tutte verdi in **entrambi** i file — il secondo perché il Passo 0 ② lo tocca — compresa la
guardia allargata che vieta «pezzo» e «carta».

- [ ] **Passo 5 — salva**

```bash
git add -A && git commit -m "feat(qualita): effettoDaMotivoEScelta — il bivio risolto, mai indovinato (D304), e «persona sbagliata» prende la sua azione (D312)"
```

---
