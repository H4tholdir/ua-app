# Referto — Compito 8: «Il tasto che chiede il numero» (P31, D183 · D185)

Stato: **FATTO**. Commit `3f66b8ed` sul ramo `p31-due-numeri-per-il-cliente`.

## Cosa ho fatto

Creato il foglio condiviso `ChiediCellulareSheet` (`src/components/features/clienti/ChiediCellulareSheet.tsx`,
NON in `consegna-v3/`, come richiesto da D185) e montato in **quattro** punti:

| # | file | che cosa |
|---|------|----------|
| ① | `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx:123` | tasto WhatsApp della consegna |
| ② | `src/components/features/scadenzario/EstrattoContoView.tsx` (~360, ~375) | sollecito globale (card-list + colonna laterale) |
| ③ | `src/components/features/scadenzario/EstrattoContoView.tsx` (`DovutoBottomSheet`, ~41) | sollecito sul singolo dovuto |
| ④ | `src/components/features/scadenzario/ScadenzarioList.tsx` (`InsolutoCard`, ~55) | sollecito dall'elenco |

In tutti e tre i punti dello scadenzario (②③④) il gate del compito 4
(`cellulare_whatsapp &&` / `whatsappUrlGlobale &&`) è stato **rimosso** e sostituito dalla stessa
scelta della consegna: link diretto se il cellulare c'è, tasto che apre il foglio se manca.

**Il vincolo non negoziabile (D183) è rispettato**: `ChiediCellulareSheet.salvaEInvia()` fa
`await fetch(PATCH /api/clienti/[id])`, verifica `res.ok`, e **solo se il salvataggio riesce**
chiama `onSalvato(cellulare)` — è il chiamante (in tutti e 4 i punti) ad aprire WhatsApp dentro
`onSalvato`. Se il salvataggio fallisce, `onSalvato` non viene mai chiamato: WhatsApp non si apre.

## Adattamenti rispetto al brief (dichiarati, come richiesto)

1. **Copia del foglio**: il brief (`.superpowers/sdd/p31-compito-8-brief.md`) portava ancora
   titolo `"Manca il cellulare"` e tasto `"Salva e invia"` — codice d'esempio superato. Ho
   verificato il mockup approvato D186 (`docs/design/mockups/2026-08-03-p31-due-numeri.html`,
   righe 288-300) e lo screenshot (`docs/design/mockups/screenshots/2026-08-03-p31/consegna-390-light.png`):
   titolo reale **"Il cellulare per WhatsApp"**, tasto reale **"Salva e apri WhatsApp"** (nomina
   entrambe le cose, nell'ordine — coerente col messaggio di Francesco in chat), aiuto esatto
   come da messaggio. Ho anche aggiunto la riga di contesto col nome del destinatario
   ("Manca ancora un cellulare per **{nomeDestinatario}**: il messaggio parte da qui.") visibile
   nello screenshot ma non nell'interfaccia del brief — riformulata in modo neutro rispetto al
   genere (il mockup diceva "Per lo Studio Piegari…", ma il nome è testo libero e il componente
   non può sapere l'articolo giusto in italiano per un nome qualsiasi). **Questa riga di contesto
   non era fra le "due cose" esplicitamente ratificate oggi da Francesco — è una mia estensione
   per fedeltà visiva allo screenshot approvato: se il testo non va bene, va corretto.**
2. **v3 nello scadenzario (v2.3)**: `TastoWhatsAppChiede`/`TastoPrimario` (v3, da
   `src/components/ds/`) resta **solo** in `FrameConsegnato` (già dentro `data-ds="v3"`).
   Nei tre punti dello scadenzario (pagine v2.3) il trigger è un `<button>` in stile locale
   (`whatsappCtaStyle`, identico allo stile del link che sostituisce) — `TastoPrimario` non si
   auto-scopa con `data-ds="v3"` e lo mischierebbe nella pagina v2.3, violazione della regola
   "mai mischiare v3 e v2.3 nella stessa pagina" (CLAUDE.md §4, spec v3 §14). `ChiediCellulareSheet`
   invece è legittimo ovunque perché **`Sheet` porta con sé `data-ds="v3"` sul proprio portale**
   verso `document.body` — eccezione già sanzionata nel commento di `Sheet.tsx` ("essendo l'unico
   overlay che deve scappare dallo scope del catalogo… porta con sé `data-ds="v3"`"). Verificato
   con l'advisor prima di scrivere codice.
3. **`cliente_id` nei tre punti scadenzario**: verificato PRIMA di scrivere, come richiesto.
   Disponibile in tutti e tre senza chiamate in più: `dati.cliente.id` (②), thread come nuova prop
   `clienteId` su `DovutoBottomSheet` (③, prop-drilling da un valore già caricato — non una
   chiamata in più), `item.cliente.id` (④). Nessun punto bloccato.
4. **Aggiornamento della vista dopo il salvataggio** (di mia iniziativa, per coerenza): in
   `EstrattoContoView` chiamo `router.refresh()` dopo il salvataggio (stesso pattern già usato da
   `handleRegistrato`), così un secondo sollecito nella stessa sessione trova il collegamento
   diretto. In `ScadenzarioList` (che non usa il router, gestisce il proprio `fetch`) aggiorno lo
   stato locale della lista con il valore appena salvato (`patchCellulare`), senza chiamate in
   più. Non richiesto dal brief, ma evita un'inconsistenza visibile nella stessa sessione.

## Le prove TDD (Passo 1/2, task ①) — output vero

Rosso (prima di scrivere `ChiediCellulareSheet.tsx` e modificare `FrameConsegnato.tsx`):

```
$ npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx
 Test Files  1 failed (1)
      Tests  3 failed | 1 passed (4)
```

Atteso dal brief: "1 passata (col cellulare presente, comportamento di oggi), 3 fallite." ✅ Riscontrato esattamente.

Verde (dopo l'implementazione):

```
$ npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

I 4 test coprono: (a) cellulare presente → link diretto, nessun foglio; (b) cellulare assente →
tasto presente (non link), apre il foglio; (c) **l'ordine salva→apri** (spia su `fetch` e
`window.open`, asserzione `expect(ordine).toEqual(['salvato', 'whatsapp'])`); (d) **il valore
rifiutato**: salvataggio fallito (500) → `window.open` MAI chiamato, `role="alert"` visibile.

## Le prove per i punti ②③④ (scritte dopo l'implementazione — vedi nota sotto)

Il brief prescrive TDD passo-per-passo solo per il task ① (Passo 1/2 del documento); per i tre
punti scadenzario dà solo la descrizione del comportamento atteso ("stessa scelta... già descritta
al passo 4"), senza codice di test. Ho comunque scritto una prova per ciascuno, in
`tests/unit/scadenzario-chiede-il-cellulare.test.tsx` (6 test), verificando SOLO il ramo
(cellulare presente → link; assente → tasto che apre il foglio) — l'ordine salva→apri è già
provato una volta dentro il foglio condiviso e non l'ho riprovato a ogni punto di montaggio, come
suggerito in fase di revisione:

```
$ npx vitest run tests/unit/scadenzario-chiede-il-cellulare.test.tsx
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Nota onesta: per questi 6 test non ho fatto rosso-poi-verde in senso stretto (li ho scritti dopo
aver già implementato ②③④, poi li ho verificati e corretti finché sono diventati verdi — due
correzioni di query ambigue nel test stesso, non nel componente: dettagliate sotto). Se questo non
va bene per il rigore richiesto, è un punto su cui mi fermo volentieri a rifare rosso-verde vero.

## Il conteggio (autorevisione, richiesto esplicitamente)

- **Punti di montaggio: 4 su 4** — FrameConsegnato, EstrattoContoView (globale), DovutoBottomSheet, ScadenzarioList.
- **Gate del compito 4 rimossi: 3 su 3** — tutti e tre i punti dello scadenzario.
- **Qualità**: l'ordine salva→apri è provato con una spia sull'ordine di due chiamate
  (`fetch`/`window.open`), non solo scritto nel commento.
- **Disciplina**: il controllo di sicurezza di `TastoWhatsApp` (rifiuta `waUrl` che non inizia per
  `https://wa.me/`) **non è stato toccato** — verificato leggendo di nuovo il file dopo le
  modifiche. Il caso "manca il numero" non passa mai da `TastoWhatsApp`.
- **Prove**: output pulito — nessun warning/errore nei due file di test nuovi (verificato anche
  isolandoli dal resto della suite, dove un `"Not implemented: navigation to another Document"`
  di jsdom risulta preesistente e non originato dai miei file).

## Prove esistenti modificate — una per una col perché

**Nessuna prova esistente è stata modificata.** Ho cercato test che assumessero il comportamento
"il tasto sparisce se manca il cellulare" (introdotto dal compito 4) su `EstrattoContoView`,
`DovutoBottomSheet`, `ScadenzarioList`: non esistono (`grep -rl "EstrattoContoView\|ScadenzarioList\|DovutoBottomSheet" tests/` → nessun file). Il compito 4 aveva aggiunto solo
`orchestra-consegna-whatsapp-cellulare.test.ts` (lato server, non tocca questi componenti UI) e
alcuni test su `ClienteEditSheet`/`NuovoDentistaSheet` non correlati a questo gate.

## File cambiati

- **Creato**: `src/components/features/clienti/ChiediCellulareSheet.tsx`
- **Creato**: `tests/unit/consegna-chiede-il-cellulare.test.tsx`
- **Creato**: `tests/unit/scadenzario-chiede-il-cellulare.test.tsx`
- **Modificato**: `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx`
- **Modificato**: `src/components/features/scadenzario/EstrattoContoView.tsx`
- **Modificato**: `src/components/features/scadenzario/ScadenzarioList.tsx`

## FASE 7 — output vero, tutti e tre

```
$ npx tsc --noEmit
(nessun output — zero errori)

$ npx vitest run
 Test Files  393 passed | 3 skipped (396)
      Tests  4536 passed | 19 skipped (4555)

$ npx next build
✓ Compiled successfully in 2.9s
(exit 0, tutte le route elencate, nessun errore)
```

## Autorevisione

- **Completezza**: 4/4 punti montati, 3/3 gate rimossi (contati sopra).
- **Qualità**: ordine salva→apri provato con spia sull'ordine, non solo affermato.
- **Disciplina**: controllo di sicurezza di `TastoWhatsApp` intatto.
- **Componenti reali verificati prima di scrivere**: `Sheet`, `CampoTesto`, `TastoPrimario`,
  `TastoWhatsApp` — le firme combaciavano col brief, nessun adattamento di codice necessario oltre
  al testo (punto 1 sopra) e alla scelta del trigger v2.3 vs v3 (punto 2 sopra).
- **Commit**: messaggio passato da file (`git commit -F`), pre-commit hook passato pulito
  (eslint, DS compliance, CSRF, reduced-motion, coerenza documenti, salvataggio installato).

## Dubbi e ritrovamenti fuori mandato

1. **Dubbio principale, risolto con l'advisor prima di scrivere codice**: il brief mostra
   `ChiediCellulareSheet` costruito con componenti v3 (`Sheet`, `TastoPrimario`) e chiede di
   montarlo anche in due pagine v2.3 (`EstrattoContoView`, `ScadenzarioList`) — apparente
   contraddizione con la regola "mai mischiare v3 e v2.3 nella stessa pagina". Risolto: `Sheet`
   si auto-scopa con `data-ds="v3"` sul proprio portale verso `document.body` (eccezione già
   scritta nel commento di `Sheet.tsx`), quindi il foglio è legittimo ovunque; il **trigger**
   (bottone che apre il foglio) resta invece nello stile del design system della pagina che lo
   monta — v3 (`TastoPrimario`) solo alla consegna, v2.3 (bottone locale) nello scadenzario.
   Nessun difetto: una lettura attenta della regola di convivenza (spec v3 §14, "migrazione per
   route, mai per componente") e del commento di `Sheet.tsx` risolve l'apparente contraddizione.
2. **R-E2 — nessun difetto fuori mandato trovato.** Non ho toccato nulla fuori dai file elencati
   sopra. L'unica cosa "fuori mandato letterale" che ho fatto (aggiungere `router.refresh()` /
   `patchCellulare` per la freschezza della vista dopo il salvataggio) è dentro lo stesso file e lo
   stesso scopo funzionale del compito, non un difetto preesistente scoperto altrove — l'ho
   comunque dichiarata sopra invece di farla passare in silenzio.
3. **Dubbio aperto per Francesco**: la riga di contesto col nome del destinatario dentro il
   foglio ("Manca ancora un cellulare per **{nome}**: il messaggio parte da qui.") è una mia
   estensione fedele allo screenshot ma non fra le "due cose" esplicitamente ratificate oggi. Se
   il testo non convince, è il punto più facile da correggere (una sola stringa, in un solo file).
