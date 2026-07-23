# Decisione — Abrogazione delle guardie stanza-parete (Task 12, D2)

**Data:** 25/07/2026 · **Ondata:** «Redesign parete/home» · **Task:** 12 — «L'embed della parete
vera nella home»
**Spec:** `docs/superpowers/specs/2026-07-23-redesign-parete-home-design.md` §3.1 (D2) e §5.4
(guardie test, panel ARCH R6 + FE R2)

## Che cosa muore

`StanzaParete.tsx` — l'anteprima cap-8 (5/8 cassette + tile «Tutte le cassette ›») della stanza
Parete in home — sparisce col proprio test (`tests/unit/stanza-parete.test.tsx`). Al suo posto la
stanza Parete monta la **`PareteClient` vera**, la stessa che serve `/cassette` (`contesto="stanza"`
spegne il chrome di pagina — niente back, niente ☰, che la home ha già nella stanza Pile), dentro
un contenitore di scroll nuovo (`.ua-stanza-parete-scroll`). Con questo la home smette di avere una
propria superficie CSS per il muro: eredita `.ds-parete-shell`/`.ds-parete`/`.ds-parete-grid` (e le
loro container query fluide, riserva ARCH R7 del Task 11) **per costruzione**, non per
duplicazione — riserva ARCH R6 di spec §5.4.

CSS rimosso da `src/app/ds-v3.css`: `.ua-stanza-parete`, `.ua-stanza-parete-corpo`,
`.ua-parete-titolo` (2 regole), l'override colonne `.ua-stanza-parete .ds-parete-grid` (Task 11 lo
aveva già previsto: «muore col Task 12»), il ramo `@media (max-height: 780px)` dedicato alla home
(padding/gap/row-gap fissi «compatta R3b»), `.ds-cella-parete-home` (2 regole) e il suo
`@media (max-width: 767px)`. `.ds-tile-tutte` **resta**, deliberatamente: non è mai stato nel
perimetro `.ua-stanza-parete*`, non ha altri consumatori ora che `StanzaParete.tsx` è morto, ma la
sua rimozione non è nel file-list di questo task — segnalato come cleanup separato, non fatto qui
in silenzio.

## Guardie abrogate (`tests/unit/ds-v3/parete-fluida.test.ts`)

Spec §5.4 prescrive l'abrogazione (non l'estensione) degli assert 4 e 5 del primo `describe` del
file. In implementazione è emersa una terza conseguenza, meccanica e non prescritta dal piano, nel
secondo `describe`: documentata qui per intero, così che nessuna delle tre resti un «test sistemato
in silenzio».

1. **Assert 4 — «ogni cqw…vettore di leak reale…che la home riusa».** Presidiava che rendere fluida
   la regola BASE `.ds-parete-grid` (fuori da `.ds-parete-shell`) avrebbe fatto trapelare i cqw
   nella home, perché la home — prima del Task 12 — renderizzava `.ds-parete`/`.ds-parete-grid`
   SENZA passare da `.ds-parete-shell` (un proprio `.ua-stanza-parete .ds-parete-grid` sovrascriveva
   solo le colonne). Quella premessa è falsa oggi: la home monta la stessa `PareteClient`, quindi
   il SUO `.ds-parete-shell` è il perimetro anche per la home. Le due asserzioni strutturali (loop
   cqw→shell, valori base verbatim) sono vere e restano — sotto un titolo che non promette più una
   guardia home-specifica.

2. **Assert 5 — «la home resta FUORI dal perimetro: nessuna regola fluida tocca
   .ua-stanza-parete».** Il suo oggetto (le regole `.ua-stanza-parete*`) non esiste più:
   `regole.length` cadrebbe a 0 by design — non un difetto, la certificazione che il componente è
   morto. **Nota tecnica:** il regex `/\.ua-stanza-parete[^{]*\{/` avrebbe per coincidenza
   continuato a fare match sulla NUOVA regola `.ua-stanza-parete-scroll` (stesso prefisso
   letterale) e il test sarebbe rimasto verde — un falso positivo da manuale (guardia cieca che
   promette di guardare l'oggetto sbagliato). Abrogato comunque, per la lettera e lo spirito di
   spec §5.4. Sostituito da una guardia sul nuovo contratto: `.ua-stanza-parete-scroll` è il
   contenitore di scroll (`overflow-y: auto` + `overscroll-behavior-y: contain`).

3. **Il terzo `expect` di «il row-gap:0 vince…e nel ramo home a device corti (max-height:780px)»**
   (nel secondo `describe`, Task 8 — NON uno degli assert 4-5 del piano). Presidiava che
   `.ua-stanza-parete .ds-parete-grid { row-gap: 0; }` ribadisse la quantizzazione dentro
   `@media (max-height:780px)`, perché lì `.ua-stanza-parete .ds-parete-grid { gap: 12px; }`
   (shorthand, azzerava anche row-gap) vinceva per specificità sulla regola base. Quella coppia di
   regole home-specifiche (gap fisso + il suo contro-effetto) è sparita con la rimozione sopra: la
   home non ha più un proprio ramo di gap fisso, usa lo stesso `.ds-parete-shell .ds-parete-grid`
   fluido di `/cassette` — la quantizzazione della regola base (Task 8) vale già, senza bisogno di
   un contro-effetto home-specifico. Rimosso il solo terzo `expect`; le prime due asserzioni
   (perimetro shell, invariate) restano nello stesso test.

## Perché si abroga e non si «ripara»

Reintrodurre una regola home-specifica solo per far ripassare un test che presidiava un difetto di
specificità CSS ormai inesistente produrrebbe una guardia verde ma cieca — l'esatto rischio che le
guardie testuali di `parete-fluida.test.ts` esistono per evitare (v. nota di testa del file: «il CSS
è verificato come testo»). Dopo il Task 12 la home non ha più bisogno di correggersi da sola: eredita
il comportamento di `/cassette` per costruzione (riserva ARCH R6 — nessuna divergenza CSS tra le due
superfici che mostrano lo stesso muro), e il mount differito (riserva ARCH R3, `StanzaParete` locale
in `StanzePager.tsx`) tiene sotto controllo il costo di questa unificazione.

## Riferimenti

- Spec: `docs/superpowers/specs/2026-07-23-redesign-parete-home-design.md` §3.1 (D2 — le due
  stanze, senza copie), §5.4 (guardie test, panel ARCH R6 + FE R2)
- Riserve: ARCH R2 (refresh gated), ARCH R3 (mount differito), ARCH R6 (nessuna divergenza CSS
  home/`/cassette`), ARCH R7 (colonne in container query, Task 11), FE R2 (guardie riscritte)
- Decision record precedente sullo stesso perimetro CSS: `2026-07-22-gap-cassette-tablet.md`
  (dichiarava esplicitamente che la home ne restava fuori «finché non arriva l'ondata» — questo
  task È quell'ondata)
- L'altra abrogazione prescritta dal piano dell'ondata è nel Task 14, fuori dal perimetro di
  questo file
