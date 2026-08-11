# Referto — D187: due chiusure dalla revisione del compito 8 (P31)

Stato: **FATTO**. Non ancora committato al momento in cui scrivo questo referto (il commit segue,
messaggio da file come richiesto).

## ① La riga di contesto torna al testo del disegno

**File:** `src/components/features/clienti/ChiediCellulareSheet.tsx:80` (+ commento :39-48) ·
`docs/design/mockups/2026-08-03-p31-due-numeri.html:292`.

**Formulazione scelta:**

> Per «**{nomeDestinatario}**» manca ancora un cellulare: il messaggio parte da qui.

**Perché regge con qualunque nome, e non solo con «Studio Piegari»:** ho verificato come
`nomeDestinatario` arriva a questo componente in tutti e cinque i punti di montaggio — è sempre
testo libero derivato da `cliente.studio_nome ?? \`${nome} ${cognome}\`` (stessa derivazione in
`FrameConsegnato`/`FlussoConsegna` — lì si chiama `dentista` —, `ScadenzarioList`, `EstrattoContoView`
e ora `TabAccettazione`), quindi può essere un nome di studio o un "nome cognome" di persona, di
genere e numero non prevedibili. Il disegno usava «Per lo Studio Piegari…», che funziona solo
perché «Studio» è maschile singolare con S impura: con «la Dott.ssa Rossi» o «i fratelli Bianchi»
l'articolo giusto cambia e il componente non ha modo di saperlo (stesso principio già scritto nel
commento precedente, D186). Ho **evitato l'articolo del tutto**, mettendo il nome fra virgolette
caporali dopo «Per» — la preposizione non richiede accordo di genere/numero quando il nome è
un'unità testuale fra virgolette, quindi la frase è grammaticalmente corretta per qualsiasi valore
di `nomeDestinatario`, mantenendo però l'ordine voluto da Francesco (il nome prima di «manca ancora
un cellulare») e togliendo «di consegna» (D185: il foglio serve anche ai solleciti di pagamento, in
tre punti su cinque «messaggio di consegna» sarebbe falso).

**Mockup aggiornato in parallelo** (riga 292) con lo stesso identico testo, perché torni a
combaciare col codice — non ho lasciato la vecchia formulazione «Per lo Studio Piegari…» nel
disegno mentre il codice diceva altro.

**Prove:** nessuna prova esistente tocca questo testo (verificato con grep su `tests/` e `src/`
prima di scrivere — zero risultati per «Manca ancora un cellulare» o «di consegna parte da qui»
fuori dal componente e dal mockup), quindi per ① non ho aggiunto un test nuovo, come da istruzione
("basta che le prove esistenti restino verdi, più una che verifichi il testo se già ne esiste una
che lo tocca" — non esisteva). Le prove esistenti (`consegna-chiede-il-cellulare.test.tsx`,
`scadenzario-chiede-il-cellulare.test.tsx`) restano verdi (v. sotto).

## ② Il quinto punto: anche l'accettazione chiede il numero

**File:** `src/components/features/lavori/form/TabAccettazione.tsx` (sezione 5, ~riga 717 in poi) ·
`src/components/features/lavori/LavoroFormClient.tsx` (~riga 149, chiamante).

**Verifica preliminare sull'id del cliente (fatta PRIMA di scrivere, come richiesto):**
`TabAccettazione` è montato in un solo punto reale, `LavoroFormClient.tsx:147-157` (l'altro
riferimento, in `lavori/nuovo/page.tsx`, è solo un commento — quel form è morto lì, sostituito dal
wizard v3). Il chiamante riceve `lavoro: LavoroDettaglio`, che include `cliente: Cliente` **non
opzionale** (`src/types/domain.ts:401`), con `cliente.id: string` sempre presente (`lavori.cliente_id`
è `NOT NULL` in schema). **L'id c'era già, senza bisogno di risalirlo con una chiamata in più** —
esattamente il caso opposto della consegna (dove D183 lo aveva dovuto aggiungere al contratto).

**Come l'ho montato — stessa forma degli altri quattro, non una nuova:**
1. `TabAccettazioneProps` guadagna `clienteId?: string` e `clienteNome?: string` (opzionali per non
   rompere `tests/unit/tab-accettazione-cassetta.test.tsx`, che monta il tab con un `data` parziale
   senza cliente reale — non è un difetto, è lo stesso motivo per cui `clienteCellulare` è già
   opzionale in quell'interfaccia).
2. Nuovo stato locale `chiediAperto` (identico a `FrameConsegnato`/`ScadenzarioList`).
3. La sezione 5 non è più tutta dentro `{clienteCellulare && (...)}`: quel gate copriva anche
   l'anteprima del messaggio, che però non dipende dal cellulare (è solo testo) — ora resta sempre
   visibile, e SOLO il CTA finale si biforca: `<a>` (link WhatsApp diretto) se `clienteCellulare`
   c'è, `<button>` che apre `ChiediCellulareSheet` se manca — stessa faccia in entrambi i rami
   (`confermaRicezioneCtaStyle` condiviso, stesso pattern di `whatsappCtaStyle` in
   `EstrattoContoView`/`ScadenzarioList`).
4. `ChiediCellulareSheet` montato in fondo al componente con `clienteId`/`nomeDestinatario={clienteNome}`;
   `onSalvato` ricostruisce l'URL con `buildWhatsappUrl(messaggioPreview, cellulare)` e apre
   WhatsApp — stesso ordine salva→apri di tutti gli altri quattro punti (garantito dentro il foglio
   condiviso, non riscritto qui).
5. `LavoroFormClient.tsx` passa `clienteId={lavoro.cliente?.id ?? ''}` e `clienteNome` con la STESSA
   derivazione già usata lì per `PacchettoConsegnaSheet`/`SegnalaProblemaSheet`
   (`studio_nome ?? "${nome} ${cognome}"`), invece di inventarne una nuova.

**Verifica DS v2.3/v3 (fatta come richiesto):** `TabAccettazione.tsx` e `LavoroFormClient.tsx` sono
v2.3 (token `var(--sfc, #E4DFD9)`, `var(--t1, #1C1916)`, `motionTokens`/`useReducedMotion` da
`@/design-system/motion`, non da `v3/*`). Il tasto che apre il foglio resta un `<button>` in stile
locale v2.3 (`confermaRicezioneCtaStyle`, non `TastoPrimario`), esattamente come nei tre punti dello
scadenzario — coerente con "il trigger resta nello stile della pagina che lo ospita". Il foglio
`ChiediCellulareSheet` (v3) può montare qui perché `Sheet` porta `data-ds="v3"` sul proprio portale
verso `document.body`, fuori dal sottoalbero della pagina — eccezione già documentata nel commento
di `Sheet.tsx` e già sfruttata dagli altri tre punti v2.3.

**Bersaglio tappabile:** il bottone eredita `confermaRicezioneCtaStyle` (`minHeight: 52px`,
`width: 100%`) — sopra i 44px richiesti, invariato rispetto al link che sostituisce.

## Prove — output vero

```
$ npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx tests/unit/scadenzario-chiede-il-cellulare.test.tsx tests/unit/accettazione-chiede-il-cellulare.test.tsx --reporter=verbose

 ✓ tests/unit/scadenzario-chiede-il-cellulare.test.tsx > EstrattoContoView — sollecito globale (D183/D185, punto ②) > col cellulare presente: link diretto, nessun tasto che chiede 99ms
 ✓ tests/unit/consegna-chiede-il-cellulare.test.tsx > D183 — se il cellulare manca, il tasto lo chiede e lo salva > col cellulare presente il tasto apre WhatsApp e NON chiede niente 112ms
 ✓ tests/unit/consegna-chiede-il-cellulare.test.tsx > D183 — se il cellulare manca, il tasto lo chiede e lo salva > senza cellulare il tasto CI SIA LO STESSO e apra il foglio 46ms
 ✓ tests/unit/accettazione-chiede-il-cellulare.test.tsx > D187 — TabAccettazione, sezione 5: il tasto non sparisce senza cellulare > col cellulare presente: link diretto, nessun tasto che chiede 115ms
 ✓ tests/unit/accettazione-chiede-il-cellulare.test.tsx > D187 — TabAccettazione, sezione 5: il tasto non sparisce senza cellulare > senza cellulare: il tasto CI SIA LO STESSO (non un link) e apra il foglio 63ms
 ✓ tests/unit/scadenzario-chiede-il-cellulare.test.tsx > EstrattoContoView — sollecito globale (D183/D185, punto ②) > senza cellulare: il tasto CI SIA LO STESSO (non un link) e apra il foglio 60ms
 ✓ tests/unit/scadenzario-chiede-il-cellulare.test.tsx > EstrattoContoView — sollecito sul singolo dovuto (D183/D185, punto ③, DovutoBottomSheet) > col cellulare presente: link diretto dentro il dettaglio del dovuto 38ms
 ✓ tests/unit/consegna-chiede-il-cellulare.test.tsx > D183 — se il cellulare manca, il tasto lo chiede e lo salva > salva il numero PRIMA di aprire WhatsApp 96ms
 ✓ tests/unit/consegna-chiede-il-cellulare.test.tsx > D183 — se il cellulare manca, il tasto lo chiede e lo salva > se il salvataggio fallisce, WhatsApp NON si apre e lo dice 83ms
 ✓ tests/unit/scadenzario-chiede-il-cellulare.test.tsx > EstrattoContoView — sollecito sul singolo dovuto (D183/D185, punto ③, DovutoBottomSheet) > senza cellulare: il tasto nel dettaglio del dovuto CHIEDE il numero invece di sparire 54ms
 ✓ tests/unit/scadenzario-chiede-il-cellulare.test.tsx > ScadenzarioList — sollecito dall'elenco (D183/D185, punto ④) > col cellulare presente: link diretto 21ms
 ✓ tests/unit/scadenzario-chiede-il-cellulare.test.tsx > ScadenzarioList — sollecito dall'elenco (D183/D185, punto ④) > senza cellulare: il tasto CI SIA LO STESSO e apra il foglio 31ms
 ✓ tests/unit/accettazione-chiede-il-cellulare.test.tsx > D187 — TabAccettazione, sezione 5: il tasto non sparisce senza cellulare > salva il numero PRIMA di aprire WhatsApp 105ms
 ✓ tests/unit/accettazione-chiede-il-cellulare.test.tsx > D187 — TabAccettazione, sezione 5: il tasto non sparisce senza cellulare > se il salvataggio fallisce, WhatsApp NON si apre e lo dice 88ms

 Test Files  3 passed (3)
      Tests  14 passed (14)
```

`tests/unit/accettazione-chiede-il-cellulare.test.tsx` (nuovo, 4 casi): il tasto c'è anche senza
cellulare (non è un link) · premendolo apre il foglio (`getByLabelText('Cellulare WhatsApp')`) ·
il numero si salva PRIMA di aprire WhatsApp (`ordine === ['salvato', 'whatsapp']`, fetch verso
`/api/clienti/CLI-9`) · se il salvataggio fallisce (500), `window.open` NON viene mai chiamato e
compare `role="alert"`.

Ho anche rilanciato la suite di regressione già esistente per la cassetta
(`tests/unit/tab-accettazione-cassetta.test.tsx`, 3 casi, verde) per assicurarmi che aggiungere
prop opzionali e nuovo stato non l'avesse toccata — non serviva modificarla.

```
$ npx tsc --noEmit
(nessun output — zero errori)

$ npx vitest run
 Test Files  394 passed | 3 skipped (397)
      Tests  4540 passed | 19 skipped (4559)

$ npx next build
✓ Compiled successfully in 2.9s
✓ Running TypeScript ... Finished TypeScript in 10.0s
✓ Generating static pages using 15 workers (81/81)
(81 rotte generate, incluse tutte le rotte lavori/scadenzario/clienti; nessun errore)
```

## Dubbi e ritrovamenti fuori mandato

- **Nessun difetto nuovo trovato fuori mandato.** Ho controllato se `TabAccettazione` avesse altri
  punti con lo stesso gate (`cellulare_whatsapp &&` o simili) oltre alla sezione 5: non ce ne sono
  altri in questo file.
- **Un dubbio dichiarato, non un difetto:** la sezione 5 mostrava PRIMA solo se `clienteCellulare`
  era valorizzato — ora l'anteprima del messaggio è sempre visibile (anche col tasto che chiede).
  L'ho giudicato corretto perché l'anteprima non dipende dal cellulare (è testo puro, sempre vero),
  ma segnalo la scelta esplicitamente: se Francesco preferisce nascondere anche l'anteprima finché
  il numero non è salvato, è un cambiamento di un paio di righe (richiuderei l'anteprima nello
  stesso ternario del CTA).
- **`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` risultava già modificato**
  all'inizio di questa sessione (riga D187 già scritta nel verbale, evidentemente dalla revisione
  che ha generato questo stesso task) — non l'ho toccato oltre a quanto già presente, l'ho incluso
  nel commit perché è la documentazione a monte delle due decisioni che ho eseguito.

## File toccati

- `src/components/features/clienti/ChiediCellulareSheet.tsx` — ①, testo + commento
- `docs/design/mockups/2026-08-03-p31-due-numeri.html` — ①, mockup allineato al codice
- `src/components/features/lavori/form/TabAccettazione.tsx` — ②, quinto montaggio
- `src/components/features/lavori/LavoroFormClient.tsx` — ②, nuove prop passate al chiamante
- `tests/unit/accettazione-chiede-il-cellulare.test.tsx` — ②, prova nuova
- `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — già modificato in sessione (D187 nel verbale), incluso nel commit
