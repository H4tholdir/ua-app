# Task 10 — report

La carta album (§5.38) entra sulla scheda al posto della vecchia FotoStrip (§5.33, superata). Primo
innesto dei quattro componenti nuovi dell'album fotografico: qui monta SOLO la carta — visore,
tendina e i due fogli restano di T12.

**Commit:** `fbda7ff2d1502fee90a24b57271ce620f5661e12` — branch `ondata-b-schermate`.

## 1. Che cosa ho cambiato, e dove

| File | Cosa |
|---|---|
| `tests/unit/SchedaLavoroV3.test.tsx` | **Aggiunto** un caso con due foto (TDD, Passo 1): monta `SchedaLavoroV3` con `immagini` popolato e verifica titolo «Foto», conteggio «2 foto», assenza della vecchia striscia. |
| `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` | **Innesto** (Passo 2): import `FotoStrip` → `CartaAlbum`; riga `:316` (vecchia) sostituita con `<CartaAlbum foto={lavoro.immagini} onApri={() => {}} onCorreggiCategoria={() => {}} />`, stessa posizione fra `NotaLaboratorio`/`NotaLaboratorioVuota` e `CardFasiV3`. `lavoro.immagini` è `LavoroImmagine[]` (`types/domain.ts:475-491`), che porta già `categoria`/`created_at`/`nome_file` — **nessuna trasformazione**, passato diretto (verificato: struttura compatibile 1:1 con `FotoAlbum`). |
| `src/app/ds-v3-catalogo/page.tsx` | **Catalogo** (Passo 3): import riga 42, voce indice riga 81 (`foto-strip`/`FotoStrip` → `carta-album`/`CartaAlbum`), sezione 1165-1170 sostituita con `CartaAlbum` a 2 foto demo (`impronta`+`rx`) e `onApri`/`onCorreggiCategoria` no-op. Il commento «nel catalogo le thumb non caricano» è stato **riscritto per restare vero**: ora cita le geometrie reali della carta (foto grande 4/3·16/9, miniature 60×60 raggio 12) invece del 72×72 della striscia scomparsa. |
| `tests/unit/ds-v3/componenti/catalogo.test.tsx` | **Fix di conseguenza, non nel censimento del brief** (v. §3): riga 128, `'FotoStrip'` → `'CartaAlbum'` nell'elenco atteso di `INDICE` (22 sezioni, invariato in numero). |
| `tests/unit/ds-v3/componenti/CartaAlbum.test.tsx` | **Aggiunta** una sola prova ereditata da `FotoStrip.test.tsx` (Passo 4): `objectFit: cover` su foto grande e miniatura — l'UNICA delle sue misure non già coperta altrove in questo file (v. §3). |
| `src/components/ds/FotoStrip.tsx` | **Eliminato** (Passo 5): zero chiamanti funzionali residui dopo i punti sopra. |
| `tests/unit/ds-v3/componenti/FotoStrip.test.tsx` | **Eliminato**: le sue 3 prove sono state riscritte/verificate come già coperte (v. §3), non cancellate in silenzio. |
| `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` | **Annotazione** (v. §5-bis, non richiesta dal brief ma imposta dal pre-commit): 7 righe che citavano `FotoStrip.tsx`/`FotoStrip.test.tsx` fra backtick marcate `(eliminato in T10)`, nessun'altra parola toccata. |
| `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md` | **Annotazione** (v. §5-bis): stessa marcatura su 1 riga, più il tempo verbale corretto da presente a passato («esisteva già, al momento di questa spec»). |

Entrambi i file eliminati sono stati spostati nel Cestino (`/usr/bin/trash`, per il guard `rm` del
repo), non cancellati in modo irreversibile.

## 2. Le prove — quante si accendono

**Passo 1 (TDD, innesto).** Prova scritta PRIMA del codice, in `tests/unit/SchedaLavoroV3.test.tsx`
(la scheda monta con due foto → titolo «Foto», conteggio, niente `[aria-label="Foto del lavoro"]`
della vecchia striscia).
- **Rosso genuino:** lanciata subito dopo averla scritta (codice ancora con `FotoStrip`): **1 fallita
  su 11** nel file, motivo esatto atteso — `getByRole('heading', { name: 'Foto' })` non trova nulla
  (la striscia non ha mai avuto un titolo).
- **Verde dopo l'innesto:** **11 su 11**.
- **Mutazione deliberata** (per verificare che la prova morda davvero, come richiesto): ho rimesso
  `FotoStripMutazioneTemporanea` (import temporaneo di `FotoStrip`, mai committato) al posto di
  `CartaAlbum` nello stesso identico punto e rilanciato. Risultato: **esattamente 1 su 11 torna
  rossa** — proprio e SOLO la prova nuova; le altre 10 (consegna abilitata/disabilitata, riga
  editabile, nota laboratorio, tracciabilità, refresh FK…) restano verdi. Nessun effetto
  collaterale, la prova morde con precisione chirurgica sul suo bersaglio. Ripristinato subito
  dopo → di nuovo 11 su 11.

**Passo 4 (misure ereditate da FotoStrip).** Prima di riscrivere, ho controllato quali delle 3 prove
di `FotoStrip.test.tsx` erano già coperte in `CartaAlbum.test.tsx` (39 prove preesistenti, scritte dal
task che ha costruito il componente):
- *72×72, radius 12, objectFit cover, scroll orizzontale* → **radius 12** già provato (miniature
  60×60, riga «miniature 60×60… con raggio 12»); **scroll orizzontale** già provato (fascia gruppi,
  riga «la fascia dei gruppi scorre in orizzontale»); **72×72 NON ha equivalente** — la carta non ha
  una misura fissa che corrisponda (miniature 60×60, foto grande ad aspect-ratio, non px fissi):
  nessuna riga scritta per un valore che sulla carta non esiste, per scelta dichiarata, non per
  distrazione. **objectFit: cover NON era provato da nessuna parte** su questo file → **1 prova
  nuova aggiunta** (2 asserzioni: foto grande + miniatura).
- *renderizza una img per foto, alt esplicito o fallback* → **comportamento CAMBIATO dalla spec
  ratificata**, non semplicemente spostato: FotoStrip accettava un `alt` per-foto dal chiamante;
  CartaAlbum FISSA `alt` all'etichetta della categoria (§5.38, «mai la sigla interna, mai il nome del
  file») — già provato in `CartaAlbum.test.tsx` («\`alt\` = l'ETICHETTA della categoria»). Non è una
  prova mancante, è la vecchia prova che descriveva un contratto che la spec ha sostituito.
- *lista vuota → non renderizza nulla* → stesso comportamento, già provato («elenco vuoto → non
  rende NULLA»).
- **Non ho duplicato nulla**: 40 prove totali in `CartaAlbum.test.tsx` dopo la mia unica aggiunta
  (39 + 1), verificato con `npx vitest run` (40 passate) e con un conteggio diretto di `it(` nel
  file.

## 3. Il conto delle prove (tolte / aggiunte / totale)

| | Prima (rif. brief, albero pulito) | Dopo |
|---|---|---|
| File di test | 368 passati \| 3 saltati (371) | **367 passati \| 3 saltati (370)** |
| Prove | 4192 passate \| 19 saltate (4211) | **4191 passate \| 19 saltate (4210)** |

Aritmetica dichiarata: **-3** (le 3 prove di `FotoStrip.test.tsx`, file eliminato) **+1** (innesto,
`SchedaLavoroV3.test.tsx`) **+1** (objectFit cover, `CartaAlbum.test.tsx`) = **-1 netto**. Torna
esattamente: 371→370 file, 4211→4210 prove, 368→367 e 4192→4191 passate. Zero rossi in file che non
ho toccato.

## 4. FASE 7 — output vero

```
$ npx tsc --noEmit
(nessun output — 0 errori)

$ npx vitest run
 RUN  v4.1.6 …
 Test Files  367 passed | 3 skipped (370)
      Tests  4191 passed | 19 skipped (4210)
   Duration  85.46s

$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 5.9s
  Running TypeScript ...
  Finished TypeScript in 12.6s ...
  Generating static pages using 15 workers (81/81) in 288ms
  Finalizing page optimization ...
(tutte le route elencate, incluse /lavori/[id] e /ds-v3-catalogo, nessun errore)
```

Ho anche lanciato `npx eslint` sui 5 file toccati (non richiesto esplicitamente dal brief, controllo
extra): nessun rilievo.

## 5-bis. Il salvataggio — bloccato una volta, dal controllo giusto

Il primo tentativo di commit è stato **bloccato dal pre-commit** (`guardia-coerenza-documenti.mjs`),
e non l'ho aggirato: ho letto cosa diceva. Il piano e la spec dell'album
(`docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` e
`docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md` — i documenti che HANNO
generato il brief di questo task) citano `src/components/ds/FotoStrip.tsx` e il suo test in una
decina di punti, scritti PRIMA che io li eliminassi. La guardia ha una regola esplicita e già
prevista per questo caso simmetrico («una spec cita legittimamente un file che non esiste più,
quando è quella stessa spec ad averlo fatto eliminare... si dichiara sulla riga»): ho marcato
`(eliminato in T10)` su ogni riga che citava uno dei due percorsi fra backtick senza già dichiararlo
(7 righe nel piano, 1 nella spec — verificato riga per riga con `grep -n`), **senza toccare
nient'altro** del testo storico di quei documenti — tranne un singolo tempo verbale nella spec
(«esiste già» → «esisteva già, al momento di questa spec», perché lasciarlo al presente sarebbe stato
falso ora, non solo privo del marcatore). Rilanciato `node scripts/guardia-coerenza-documenti.mjs
--staged` isolatamente prima di ricommittare: verde. Il commit finale include questi due file insieme
al resto.

⚠️ **Questi due file sono stati modificati DOPO la FASE 7** (il blocco del pre-commit è arrivato al
momento del salvataggio, a valle della verifica). Sono markdown — non toccano `tsc` né `next build`
— ma questo repo ha prove che PARSANO documenti veri (`colore-dente-idratazione.test.ts` legge una
migration, `home-style-parsabile.test.ts` un mockup): non ho dato per scontato che fosse innocuo.
Verificato: `grep -rln "album-foto-scheda-lavoro" tests/` → **zero riscontri**. Nessuna prova legge
questi due documenti: la FASE 7 già eseguita resta valida senza bisogno di rilanciarla.

## 5. Auto-revisione — dove il mio lavoro è più debole

- **QA visiva non completata.** Ho provato ad aprire il catalogo nel Browser pane per uno screenshot
  di conferma (390/768/1280, chiaro/scuro) come da FASE 9 del workflow generale. Il DOM è verificato
  corretto in ogni dettaglio (`get_page_text` mostra la sezione «CartaAlbum» con «FOTO», «2 foto»,
  «⤢ Apri», gruppi «IMPRONTA»/«RADIOGRAFIA» nell'ordine giusto; JS in pagina conferma
  `#carta-album` esiste, `data-theme="light"`), ma lo strumento di screenshot del pane ha smesso di
  catturare pixel reali a metà sessione (restituiva sempre un rettangolo color crema vuoto, anche su
  pagine che un attimo prima avevo visto renderizzate bene) — un problema dello strumento in questa
  sessione, non del codice: non sono riuscito a produrre uno screenshot verificabile. Mi affido alle
  40 prove jsdom di `CartaAlbum.test.tsx` (che asseriscono radius/colore/aspect-ratio/objectFit/
  focus-ring in modo più preciso di un occhio su uno screenshot) e alla build statica riuscita, ma
  la verifica visiva vera e propria di questo innesto specifico resta da fare — la segnalo invece di
  spacciarla per fatta.
- **Nessuna prova diretta sul flusso `onApri`/`onCorreggiCategoria` dalla scheda reale**, oltre alla
  presenza dei due no-op. Il rischio applicativo che questo apre è serio abbastanza da avere una voce
  propria in §6 (ritrovamento 1: controlli vivi che promettono un'azione che non esiste ancora) — qui
  segnalo solo il buco di prova: non ho scritto un test che verifichi ESPLICITAMENTE che quei due
  no-op sono quello che arriva a `CartaAlbum` dentro `SchedaLavoroV3` (es. un mock che verifica che il
  tap sulla foto grande non lanci un'eccezione né navighi da nessuna parte).
  Nella scheda reale (`/lavori/[id]/page.tsx`) `lavoro.immagini` **spesso è vuoto** (la maggior parte
  dei lavori non ha foto): la prova d'innesto usa 2 foto per costruzione, quindi il caso comune
  (0 foto → `CartaAlbum` ritorna `null`, coerente con la vecchia `FotoStrip`) resta scoperto in
  QUESTO file — ma è lo stesso comportamento già in produzione, e la fixture di default del file
  (`immagini: []`) lo esercita implicitamente su ogni altro test qui dentro senza mai crashare
  (11 prove passano con quella fixture, la mia inclusa è l'unica con foto).
- **Non ho verificato a mano `scripts/check-ds-compliance.sh`** oltre a farlo girare nel pre-commit
  al momento del salvataggio (§5-bis): non l'ho lanciato isolatamente per leggerne l'output prima.
- **`categoria` sulle foto vere — non l'ho preso per fede, l'ho trovato in una migration committata.**
  Le mie fixture (test e demo del catalogo) passano `categoria: 'impronta'`/`'rx'` puliti; non era
  scontato che le righe VERE di `lavori_immagini` abbiano sempre un valore nell'elenco chiuso di sei.
  Prova, non assunzione: `supabase/migrations/20260730150000_lavori_immagini_categoria.sql` (T1,
  30/07/2026) aggiunge la colonna, la riempie con un `CASE` TOTALE (`ELSE 'altro'` — commento a riga
  22-26: misurato su transazione annullata che 1 riga viva aveva `descrizione` fuori elenco, e
  SAREBBE abortito senza quell'`ELSE`), poi mette il `CHECK` e `NOT NULL`. Ogni riga oggi in banca
  dati ha quindi `categoria` valida per costruzione — e anche se un giorno non lo fosse,
  `etichettaCategoria` (già provato in `CartaAlbum.test.tsx`) ripiega sul valore grezzo invece di
  rompersi. Non ho interrogato Supabase (MCP non autorizzato in questa sessione): la fonte è il file
  di migration committato, non una supposizione.

## 6. 🔴 Ritrovamenti fuori mandato

1. **🔴 IL PIÙ SERIO — l'innesto crea due controlli vivi che promettono un'azione che non esiste
   ancora, su una rotta di produzione (`/lavori/[id]`).** Prima di questo task, `FotoStrip` rendeva
   `<img>` nudi: niente era tappabile, niente prometteva niente. Dopo l'innesto, la scheda mostra un
   `<button>` con la pastiglia «⤢ Apri» (nome accessibile «Apri la foto grande: Impronta, 1 di N») e
   un `<button>` «Cambia la categoria: Impronta» — ENTRAMBI chiamano `vibra()` al tocco (il telefono
   VIBRA per confermare un'azione) e poi non aprono nulla, perché il visore e il foglio della
   categoria sono di T12 e non esistono ancora. Non è un difetto del mio codice — è la conseguenza
   diretta e inevitabile del mandato di T10 («monta SOLO la carta», visore/tendina/fogli vietati) — ma
   è un peggioramento reale e visibile per un utente vero SE questo ramo raggiungesse la produzione
   prima di T12: un tecnico al banco tocca «⤢ Apri» su una foto vera di un paziente vero, sente la
   vibrazione di conferma, e non succede niente. Contro il principio di CLAUDE.md «nessun
   placeholder, nessun "aggiungiamo dopo"» — qui il placeholder è temporaneo e dichiarato SOLO se
   resta dentro l'ondata, non se esce da sola. **Il vincolo che questo comporta, e che il brief non
   scrive da nessuna parte: questo ramo (o comunque questo commit) non deve raggiungere `main` /
   produzione prima che T12 monti il visore e i due fogli.** Segnalo, non correggo: montare il visore
   è esplicitamente fuori dal mio mandato.
2. **Un quinto punto che nominava «FotoStrip», mancante sia dal censimento originale (grep→3) sia
   dalla correzione dell'orchestratore (→4): `tests/unit/ds-v3/componenti/catalogo.test.tsx:128`.**
   Questo file non chiama mai il componente `FotoStrip` — importa `INDICE` da `page.tsx` e ne
   confronta il titolo come stringa letterale (`expect(INDICE.map(...)).toEqual([...])`, con
   `'FotoStrip'` in mezzo alla lista attesa di 22). È un effetto MECCANICO e diretto del Passo 3 (che
   mi chiede esplicitamente di cambiare la voce dell'indice a riga 81): non l'ho quindi trattato come
   un difetto "fuori mandato" da limitarsi a segnalare, ma corretto — cambiare l'indice senza
   aggiornare questo test avrebbe lasciato la build verde solo perché il test non è mai stato
   eseguito insieme al mio cambiamento, salvo poi rompersi al primo `vitest run` completo. Lo segnalo
   comunque qui perché è un'ulteriore istanza dello stesso schema di questa ondata: un elenco («i
   punti che nominano FotoStrip sono N») che sembrava completo e non lo era, di nuovo.
3. **Due commenti in `src/components/ds/CartaAlbum.tsx` (righe 4 e 183) citano ancora `FotoStrip.tsx`
   per nome**, come riferimento storico/di stile («sostituisce FotoStrip», «stessa scelta di
   FotoStrip.tsx e TabImmagini.tsx»). Non sono chiamate né import — non si rompe nulla se il file
   citato non esiste più — ma dopo la mia eliminazione di `FotoStrip.tsx` quella seconda citazione
   nomina un file che non c'è più nell'albero. `CartaAlbum.tsx` è esplicitamente fuori dal mio
   mandato («non toccare i componenti del design system… ne sei utente»): non l'ho toccato, lo
   riferisco qui invece di correggerlo di nascosto.
4. **Il piano stesso si contraddice sul numero del task** (stesso schema delle 4 ondate precedenti,
   dove 3 volte su 4 il difetto stava nel piano): `docs/superpowers/plans/2026-07-30-album-foto-
   scheda-lavoro.md:54` e `:148` chiamano l'assorbimento di `FotoStrip` **«T11»** («➡️ T11 li tocca
   tutti e tre»· «🔄 T11: assorbita dalla carta album»), ma la sezione che descrive ESATTAMENTE
   questo lavoro è intestata **«### Task 10»** (riga 1377) — ed è la sezione da cui il mio brief è
   stato copiato quasi verbatim. Non ho corretto la numerazione nel piano (è un documento storico,
   fuori dal mio mandato di editing sostanziale): la segnalo qui perché è un'inconsistenza REALE, non
   un mio fraintendimento — il testo dice letteralmente due numeri diversi per lo stesso lavoro.
5. **Comportamento cambiato, non regredito, ma degno di nota per chi userà `descrizione` in futuro:**
   la vecchia `FotoStrip` accettava un `alt` per-foto dal chiamante (in `SchedaLavoroV3.tsx` era
   `img.descrizione`); `CartaAlbum` fissa sempre `alt` all'etichetta della categoria (scelta di
   design ratificata, §5.38). Il campo `descrizione` su `lavori_immagini` resta nel tipo
   (`LavoroImmagine.descrizione`) e continua a essere usato altrove (es.
   `src/components/features/lavori/form/TabImmagini.tsx:634`, superficie legacy non toccata da
   questo task) — ma sulla scheda v3 quel testo, se mai scritto per una foto specifica, non compare
   più da nessuna parte nella carta album. Non è una mia decisione (il contratto di `CartaAlbum` è
   già scritto e fuori dal mio mandato) e non risulta un obbligo di leggere/mostrare `descrizione`
   in nessun documento che ho letto: la segnalo perché è un cambio di comportamento visibile
   all'utente che nessun task precedente sembra aver dichiarato esplicitamente.

## 7. Nota per chi aggiorna la memoria a valle

Il pre-commit ha acceso l'avviso BP-1 previsto per questo caso: «questo salvataggio tocca un
VERBALE o una SPEC ma NON la memoria». È **atteso**, non ignorato per fretta: il mio mandato vieta
esplicitamente di toccare `MEMORY.md`/`SESSION_ACTIVE.md`/roadmap («la memoria la aggiorno io a
valle»). Lo segnalo qui perché chi fa l'aggiornamento a valle deve sapere che QUESTO commit ha
toccato due documenti vivi (`docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` e la
sua spec gemella) — non per una decisione di sostanza, solo per marcare `(eliminato in T10)` dove
la guardia di coerenza lo richiedeva (§5-bis). Non è una decisione nuova da registrare come tale,
ma la memoria dovrebbe comunque sapere che quei due file sono cambiati in questo giro.

## Correzione del rilievo di revisione

**Il rilievo (Importante, §2/§3 sopra riletti con occhio diverso):** la prova d'innesto in
`tests/unit/SchedaLavoroV3.test.tsx:117-124` (la mia stessa prova del Passo 1) guardava solo
titolo, conteggio e assenza della vecchia striscia — tre cose che sopravvivono anche se l'innesto
passasse una `categoria` finta per ogni foto, perché nessuna delle tre dipende dal VALORE di
`categoria`/`created_at`, solo dal fatto che le foto ci siano. Il revisore ha mutato la riga
dell'innesto in:

```tsx
<CartaAlbum foto={lavoro.immagini.map((i) => ({ ...i, categoria: 'altro', created_at: '2000-01-01T00:00:00Z' }))} … />
```

e le 11 prove del file restavano tutte verdi. Non è un difetto vivo nel codice consegnato (la
scheda passa davvero `lavoro.immagini` intatto, senza trasformazioni — v. riga del §1 sopra), ma
una guardia mancante: la prova non avrebbe accorto nessuno se domani quel passaggio si rompesse.

**Cosa ho aggiunto — solo al file di test, `src/components/features/lavori/scheda-v3/
SchedaLavoroV3.tsx` non è stato toccato (verificato: `git diff` sul file di produzione vuoto sia
prima sia dopo).**

1. **Guardia su `categoria`.** La fixture aveva già due categorie diverse (`impronta` su `img-1`,
   `rx` su `img-2` — non ho dovuto cambiarla per questo). Ho aggiunto, dentro la stessa prova:
   ```tsx
   expect(screen.getByRole('group', { name: 'Impronta' })).toBeInTheDocument()
   expect(screen.getByRole('group', { name: 'Radiografia' })).toBeInTheDocument()
   ```
   Uso la superficie pubblica di accessibilità (`role="group"` + `aria-labelledby`, già la stessa
   che `CartaAlbum` espone e già provata a livello di componente in
   `tests/unit/ds-v3/componenti/CartaAlbum.test.tsx`), non la classe interna `.ds-album-gr-et` —
   per non duplicare la prova d'ordine D71 che quel file possiede già e che non è compito di
   questa prova ripetere: qui si prova SOLO che l'innesto porti la categoria vera di ciascuna
   foto, non come la carta la mostri.
2. **Guardia su `created_at`.** Con due sole foto di categoria diversa, `created_at` non è
   osservabile: l'ordine FRA gruppi segue il rango D71 (impronta prima di rx), mai la data, e con
   una sola foto per categoria non c'è un ordine INTERNO al gruppo da poter rompere. L'ho reso
   osservabile aggiungendo una terza foto alla fixture, `img-3`, stessa categoria di `img-1`
   (`impronta`) ma `created_at` precedente (08:00 contro le 09:00 di `img-1`) — l'unica modifica
   al resto della fixture, e mirata: non ho toccato `img-1`/`img-2`. Poi:
   ```tsx
   const primaImpronta = screen.getByRole('button', { name: 'Impronta, 1 di 3' })
   expect((primaImpronta.querySelector('img') as HTMLImageElement).src).toContain('imp-presto.jpg')
   ```
   Se l'innesto passasse un `created_at` fisso per tutte le foto, lo spareggio diventerebbe l'`id`
   (`ordinaFotoPerCategoria`, `src/lib/domain/categorie-foto.ts:55-61`) e `'img-1' < 'img-3'`
   alfabeticamente: la prima foto del gruppo «Impronta» diventerebbe `img-1`, non `img-3`, e
   l'asserzione cadrebbe.
   Anche il conteggio è passato da «2 foto» a «3 foto» di conseguenza (unico altro punto toccato
   nella prova esistente).

**La verifica obbligatoria — ho rifatto io la mutazione del revisore, tale e quale, sulla riga
dell'innesto in `SchedaLavoroV3.tsx`, e poi le sue due metà separate per capire quale guardia
mordeva su cosa. Ripristinato il sorgente subito dopo ciascuna prova (`git diff` sul file di
produzione tornato vuoto ogni volta).**

| Mutazione applicata (temporanea, mai committata) | Esito su `SchedaLavoroV3.test.tsx` | Prova che si accende |
|---|---|---|
| Baseline, nessuna mutazione | **11 su 11 verdi** | — |
| `categoria: 'altro'` **e** `created_at: '2000-01-01T00:00:00Z'` (mutazione ESATTA del revisore) | **1 su 11 rossa**, 10 verdi | la prova d'innesto, sull'asserzione `getByRole('group', { name: 'Impronta' })` — le tre asserzioni preesistenti (titolo, conteggio, assenza striscia) restano verdi sotto questa mutazione, esattamente come segnalato dal revisore |
| Solo `categoria: 'altro'` (creato_at reale) | **1 su 11 rossa** | stessa asserzione di gruppo — la guardia su `categoria` morde da sola |
| Solo `created_at: '2000-01-01T00:00:00Z'` (categoria reale) | **1 su 11 rossa** | `AssertionError: expected 'https://esempio/imp.jpg' to contain 'imp-presto.jpg'` — la guardia su `created_at` morde da sola, indipendentemente dall'altra |

Le due guardie sono quindi indipendenti: ciascuna delle due metà della mutazione del revisore fa
cadere la prova anche da sola, non solo in combinazione.

**Verifica finale, output vero:**

```
$ npx tsc --noEmit
(nessun output — 0 errori)

$ npx vitest run
 RUN  v4.1.6 …
 Test Files  367 passed | 3 skipped (370)
      Tests  4191 passed | 19 skipped (4210)
```

I numeri tornano **identici** al riferimento di prima di questa correzione (367|3|370 file,
4191|19|4210 prove): ho rinforzato un'asserzione dentro una prova ESISTENTE, non aggiunto una
prova nuova — quindi il conteggio non doveva muoversi, e infatti non si è mosso.

`next build` non rilanciato: nessun handler di rotta toccato (solo un file di test).

**Stato:** rilievo chiuso. `git diff` sul file di produzione (`SchedaLavoroV3.tsx`) è vuoto;
l'unico file modificato da questa correzione è `tests/unit/SchedaLavoroV3.test.tsx`.
