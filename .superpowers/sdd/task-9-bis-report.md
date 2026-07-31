# Task 9-bis — `FoglioConferma` (D80) — Referto

## 1. Che cosa ho costruito

`src/components/ds/FoglioConferma.tsx` — il foglio di conferma prima di cancellare una foto (§5.42),
seconda forma ammessa di conferma distruttiva accanto a `DialogConferma` (§5.17). Test:
`tests/unit/ds-v3/componenti/FoglioConferma.test.tsx` (37 prove).

**Non montato da nessuna parte** (come da mandato): è un componente puro, pronto per l'innesto di T12.

### Firma finale

```ts
FoglioConferma(props: {
  aperto: boolean
  titolo: string
  testo: ReactNode                 // ← scostamento 1: era `string` nel piano
  etichettaDistruttiva: string
  etichettaSicura: string           // ← scostamento 2 (già nel mandato corretto, F-10)
  distruttivaDisabilitata?: boolean // ← scostamento 3 (già nel mandato corretto, §5.42 stati)
  foto: FotoAlbum                   // ← scostamento 4 (già nel mandato corretto, F-10 «anteprima»)
  ancoraFocus: RefObject<HTMLElement | null>  // ← scostamento 5 (già nel mandato corretto, F-12)
  onConferma: () => void
  onAnnulla: () => void
})
```

Più: `export function variantePannello(reduced: boolean)` — la variante di movimento, dato puro,
esportata per la stessa ragione di `Sheet.deveChiudere` e di `FoglioCategoria.variantePannello`
(Motion non applica mai `animate` sotto `skipAnimations` nei test).

### Le divergenze dall'interfaccia del piano, e perché

Il piano dichiarava solo `{ aperto, titolo, testo, etichettaDistruttiva, onConferma, onAnnulla }`.
Tre scostamenti erano **già istruiti** dal mandato corretto (§2 del task): `ancoraFocus`, `foto`
(l'anteprima), `etichettaSicura` + `distruttivaDisabilitata`. Li ho implementati così:

- **`foto: FotoAlbum`** (non un oggetto anonimo `{url, categoria, created_at}`): riuso il tipo già
  esportato da `CartaAlbum.tsx` e già consumato da `VisoreFoto.tsx:73` con un `import type` — stessa
  ragione («il tipo vive in un posto solo»). Il chiamante di T12 ha già in mano la `FotoAlbum`
  corrente (è la stessa forma che `VisoreFoto` riceve): non deve fabbricare una copia solo per
  questo foglio. Questo NON è un consumo di BLOCCO A/B (il dato/la cancellazione) — è un tipo e una
  funzione di dominio (`etichettaCategoria`) già usati da due componenti pari nello stesso BLOCCO C.

- **`distruttivaDisabilitata?: boolean`**: passato a `TastoPrimario` come `disabled` +
  `motivoDisabilitato="Un attimo…"` (la frase che il dizionario stesso suggerisce al posto di
  «loading»/«caricamento in corso»). Scelta esplicita e testata: **«Annulla», Esc, il velo e lo
  swipe restano SEMPRE attivi** — solo il tasto distruttivo si spegne. La gestione della corsa (un
  utente che preme Annulla mentre la `DELETE` è già partita) resta del chiamante: questo componente
  non la conosce e non deve.

- **Quarto scostamento, non anticipato dal mandato corretto — `testo: ReactNode` invece di
  `string`.** §5.42 prescrive: «testo `callout` 15.5 `--muted` **con la parte che pesa in
  `--ink`/700**». Un prop `string` non può portare QUALE sottostringa pesa — non c'è un contratto per
  dedurlo (niente parsing di markdown, niente convenzione preesistente in `DialogConferma`, che non
  ha questo requisito). Ho allargato `testo` a `ReactNode` (superset compatibile: una stringa piana
  resta valida) e aggiunto una regola CSS scoped nel `<style>` del componente
  (`.ds-foglioconferma-testo strong, .ds-foglioconferma-testo b { color: var(--ink); font-weight:
  700 }`): il chiamante marca la clausola che pesa con `<strong>`/`<b>`, il pannello la rende
  automaticamente nel peso giusto. **Per T12: la parte che pesa, per costruzione del testo
  ratificato, è «e dall'archivio»** — è precisamente la correzione D61 (la vecchia copia diceva che
  il file restava conservato, il che era falso); non è un'invenzione mia, è la lettura naturale del
  perché quella frase è in grassetto nella spec.

## 2. `N su M` dell'abbozzo inerte

**4 su 37** verdi sull'abbozzo che esporta i tipi e rende `null`:

| Prova verde sull'abbozzo | Perché è legittima (non una prova finta) |
|---|---|
| `chiuso: niente a schermo e il corpo non si tocca` | Prova di **assenza**: un componente che rende sempre `null` la supera per costruzione — è il caso «non c'è nulla da vedere», corretto anche sull'abbozzo. |
| `nome_file non finisce da nessuna parte nel reso` | Prova di **assenza** (G5): se non si rende NIENTE, `nome_file` non può comparire. Diventa una prova vera solo insieme alla prova gemella G5 (l'URL compare come `src`), che invece è rossa sull'abbozzo. |
| `«riduci movimento» a preferenza SPENTA` | Prova su **dato puro**: `variantePannello(false)` è già implementata nell'abbozzo (serve per l'abbozzo stesso a tipizzare correttamente) e restituisce l'oggetto vero. |
| `«riduci movimento» a preferenza ACCESA` | Idem: dato puro, non comportamento del componente montato. |

Le altre 33 erano rosse (comprese quelle di `distruttivaDisabilitata` — l'abbozzo non rende alcun
bottone, quindi anche «non disabilitata di default» falliva su `getByRole` che non trova nulla).
Nessuna prova è rimasta verde per un difetto della prova stessa: le quattro sono o assenza legittima
o dato puro, non comportamento del componente mascherato da falso positivo.

## 3. Le forme d'ingresso — coperte e non coperte

**Coperte:**
- `aperto` true/false
- le due azioni (tap distruttiva, tap Annulla) e le quattro vie di annullo non-bottone (velo, Esc,
  popstate/«indietro», ghost-click che non deve annullare)
- `distruttivaDisabilitata` true/false (con «Annulla» sempre vivo)
- `foto.created_at` valida / non interpretabile (guardia `Number.isNaN`)
- `testo` stringa piana / `ReactNode` con `<strong>` marcato
- due strati sovrapposti (con `Sheet` sotto), chiusi nell'ordine giusto e in quello sbagliato
- àncora del focus presente / assente (con l'avviso di sviluppo)
- `Tab`/`Shift+Tab` con due soli elementi raggiungibili

**Non coperta, e perché:**
- **Lo swipe giù reale (il gesto di trascinamento Motion).** Stessa scelta già in casa per
  `FoglioCategoria` e per `Sheet`: jsdom non simula in modo affidabile pan/velocity reali, e
  `deveChiudere` — la soglia pura da cui dipende `fineTrascinamento` — è già esportata e provata a
  parte (`Sheet.tsx:41`). Ho verificato a occhio che `fineTrascinamento` chiama `onAnnulla()` quando
  `deveChiudere` è vera e altrimenti anima il ritorno a `y:0`, ma non c'è una prova end-to-end del
  gesto: sarebbe un test che non morde (Motion in test ignora comunque `animate`).
- **Il click reale su «Elimina foto»/«Annulla» che emette `suona()`/`vibra()` dei DUE TASTI.** Sono
  comportamenti di `TastoPrimario`/`TastoSecondario`, già coperti dai LORO test — riverificarli qui
  avrebbe testato codice non mio. Ho invece verificato la riga che è mia: **nessuna via di uscita
  non-bottone (Esc) chiama mai `suona()`/`vibra()`** — quella è la garanzia che questo componente non
  ne chiama nessuno per conto proprio (§1.10).
- **`color: var(--ink)` via `getComputedStyle` per la parte «che pesa».** Coperta più a fondo del
  previsto: ho misurato (non assunto) che jsdom/cssstyle applica davvero la cascata di un `<style>`
  iniettato e che `getComputedStyle(...).color` per una custom property non sostituita risolve al
  valore letterale `'var(--ink)'` (non a stringa vuota) — quindi la prova asserisce sia `fontWeight:
  '700'` sia `color: 'var(--ink)'` sull'elemento vero, non solo sul testo del foglio di stile.

## 4. Le mutazioni, e quante prove ha acceso ciascuna

Tutte e quattro eseguite e verificate (poi ripristinato il file corretto, verificato bit-a-bit con
`diff` contro il backup):

| Mutazione | Prove accese (rosse) |
|---|---|
| «Annulla» chiama anche `onConferma` | **1** — esattamente il controllo positivo dedicato (`🔑 il controllo positivo che manca sempre`) |
| Rimosso `bloccaScorrimento()` | **2** — la prova diretta del blocco/sblocco e quella dei due strati chiusi in ordine sbagliato (le uniche due che esercitano il contratto dello scorrimento) |
| Focus iniziale cercato per `etichettaDistruttiva` invece che `etichettaSicura` | **2** — la prova del focus iniziale e quella del `Tab` trattenuto (che parte assumendo il focus sulla sicura) |
| `y` tolta dal bersaglio della variante ridotta | **1** — la prova «riduci movimento» a preferenza accesa |

Ogni mutazione ha acceso esattamente le prove pertinenti, nessuna di più: la suite non ha zone cieche
sulle quattro proprietà che il task chiedeva di blindare.

## 5. FASE 7 — output vero

```
$ npx tsc --noEmit
(nessun output — 0 errori)

$ npx vitest run
 Test Files  368 passed | 3 skipped (371)
      Tests  4179 passed | 19 skipped (4198)

$ npx next build
✓ Compiled successfully in 6.1s
✓ Generating static pages using 15 workers (81/81) in 230ms
(exit code 0; unico warning preesistente: "middleware" deprecato verso "proxy", non toccato da me)
```

Riferimento dato dal task, ad albero pulito prima del mio lavoro: `vitest` 367 file | 3 saltati, 4141
prove | 19 saltate. Delta osservato: **+1 file di test, +38 prove** — 37 sono le mie, la 38ª è
`tests/unit/home-style-parsabile.test.ts` che genera un caso in più perché `FoglioConferma.tsx` porta
un blocco `<style>` (la regola per `<strong>`/`<b>` dentro `.ds-foglioconferma-testo`). Il numero
torna esattamente com'era stato previsto nel mandato.

`bash scripts/check-ds-compliance.sh` → `✅ DS compliance OK (v2.3 legacy + v3)`.
`npx eslint src/components/ds/FoglioConferma.tsx tests/unit/ds-v3/componenti/FoglioConferma.test.tsx`
→ 0 errori, 0 warning (un warning di import inutilizzato è stato corretto durante il lavoro).

## 6. Auto-revisione — dove il mio lavoro è più debole

- **La copertura dello swipe giù è dichiarata ma non provata end-to-end** (v. §3): mi affido
  interamente al fatto che `deveChiudere` sia già provata altrove e che la mia `fineTrascinamento`
  ricalchi lo stesso schema di `Sheet`/`FoglioCategoria` riga per riga. Se un domani
  `fineTrascinamento` venisse rotta (es. invertendo `onAnnulla()` e `animaValore`), nessuna prova di
  questo file se ne accorgerebbe — solo una review visiva o un collaudo device la troverebbe.
- **`formattaCaricamento` usa `Europe/Rome` di mia iniziativa**, non richiesto esplicitamente da
  §5.42 (che dice solo «quando è stata caricata»). È una scelta difensiva coerente con
  `data-roma.ts` (lo stesso genere di bug — un giorno sbagliato a cavallo di mezzanotte — è già
  costato caro altrove nel progetto), ma è una mia interpretazione, non un requisito scritto: se il
  chiamante si aspettava l'ora del browser dell'utente (non Roma), qui divergerebbe. Lo segnalo
  perché non l'ho validata con un panel.
- **Il testo «Caricata il {data}» è un'invenzione mia**, non ratificata da nessun mockup: §5.42 dice
  solo che la data deve esserci, non la frase esatta. Se un mockup successivo la smentisce, va
  corretta lì, non è un difetto di questa implementazione ma un punto che nessuna fonte delle quattro
  richieste da CLAUDE.md (fonte esterna, prova nel codice, obbligo di legge, decisione di Francesco)
  copre — l'ho scritta e la dichiaro non verificata.
- **Il meccanismo di enfasi (`<style>` scoped su `strong`/`b`)** è una soluzione che ho progettato
  per colmare un buco della spec (v. §7 sotto), non un pattern già visto altrove nel design system:
  è la parte più "nuova" del file, e quindi quella con meno precedenti a garantirne la solidità nel
  tempo (per esempio: se in futuro il chiamante annidasse un altro `<strong>` per un motivo diverso,
  erediterebbe lo stesso trattamento senza poterlo escludere).

## 7. 🔴 Ritrovamenti fuori mandato

1. **`testo: string` nel piano non può portare «la parte che pesa in `--ink`/700» che §5.42
   richiede.** Non è un difetto altrui da correggere silenziosamente altrove: l'ho risolto qui,
   dentro il mio stesso task (allargando il tipo a `ReactNode` + regola CSS scoped), perché la
   firma del componente è esattamente il mio mandato. Lo riporto comunque come scostamento
   dell'interfaccia del piano rispetto alla spec ratificata — nessun altro file tocca questo punto.

2. **Possibile perdita di contrasto di `TastoSecondario` («Annulla») in scuro, quando montato dentro
   questo foglio.** Misurato, non assunto: `ds-v3.css:13` fissa `--elv: var(--card)` in chiaro (stesso
   valore) ma `ds-v3.css:48` fissa `--card:#211D18` e `--elv:#2B2620` in **scuro** (valori diversi).
   `FoglioConferma` usa `background: 'var(--elv)'` per il pannello (corretto: è la lettura di «faccia
   `--card` (`--elv` in scuro)» di §5.42, verificata contro `ds-v3.css:13` — la stessa lettura già
   usata da `FoglioCategoria.tsx:302`). Ma `TastoSecondario.tsx` usa **anch'esso** `background:
   'var(--elv)'` come propria faccia, e in scuro perde pure il bordo pieno (sostituito da una
   hairline `rgba(255,255,255,.06)` via `ds-v3.css:65-68`) e la sua ombra (`--sh-press: none` in
   scuro). Risultato: in tema scuro, il tasto «Annulla» e il pannello che lo contiene avrebbero
   **esattamente lo stesso colore di sfondo** (`#2B2620`), distinti solo da un bordo 1px al 6% di
   opacità — un contrasto molto più debole di quello che «Annulla» ha ovunque altro (dentro
   `DialogConferma`/`Sheet`, il cui pannello è `var(--card)`, diverso da `--elv`). Non l'ho corretto:
   toccherebbe `TastoSecondario.tsx` (fuori mandato esplicito, «così come sono») o `ds-v3.css` (fuori
   mandato: nessuna riga del task mi assegna quel file, e una modifica al design system condiviso
   passa dal gate §13.1, non da una correzione silenziosa dentro T9-bis). La casa ha già il pattern
   di rimedio pronto — `ds-v3.css:83-87` rimappa `--card → --elv` per `ChipScelta`/`TastoTondo`
   **dentro `.ds-sheet`** — quindi la via, se Francesco la vuole, è la stessa: una regola scoped
   `[data-theme="dark"] [data-ds="v3"] .ds-foglioconferma-pannello .ds-tasto-secondario` che rimappi
   `--elv` a qualcos'altro (o torni al bordo pieno). Verificabile a schermo con un semplice screenshot
   dark del foglio aperto.

3. **Nessuno degli altri tre `FoglioCategoria`/`VisoreFoto`/`TendinaMenu` è stato toccato**, come da
   mandato — non ho trovato, in questo giro, altri difetti nel loro codice che non fossero già
   annotati nei loro stessi file.

---

## 8. Correzioni dei rilievi di revisione (T9-bis, chiusura)

File toccati: `src/components/ds/FoglioConferma.tsx`, `tests/unit/ds-v3/componenti/FoglioConferma.test.tsx`.
Non toccati (per mandato): `TastoPrimario.tsx`, `TastoSecondario.tsx`, `Sheet.tsx`, `trappola-focus.ts`,
`FoglioCategoria.tsx`, `VisoreFoto.tsx`, `TendinaMenu.tsx`, `MEMORY.md`, `SESSION_ACTIVE.md`, roadmap.

### A1 — la dida visibile, tolta

Rimossa la prop `motivoDisabilitato="Un attimo…"` dalla chiamata a `TastoPrimario`
(`FoglioConferma.tsx`, dentro le due azioni): il tasto resta disabilitato, ma non porta più nessun
`<p>` visibile sotto di sé. Commento aggiunto sul posto che spiega la scelta e riferisce il conflitto
(sotto).

**Conflitto riferito, non risolto:** ho letto `TastoPrimario.tsx:40-46` prima di toccare qualunque
cosa, come richiesto. `TastoPrimario` fa `console.warn` in sviluppo quando `disabled` è vero e
`motivoDisabilitato` è assente — ma è **solo** un avviso di diagnostica (`console.warn`), non
renderizza nulla quando la prop è `undefined` (il suo `{disabled && motivoDisabilitato && <p/>}` è
falso in entrambi i casi in cui `motivoDisabilitato` manca). Non c'è quindi vero conflitto con
l'anatomia chiusa di §5.42: il componente resta conforme, e il prezzo è un `console.warn` che
comparirà in sviluppo quando `FoglioConferma` è montato con `distruttivaDisabilitata: true` (tre casi
nella suite). Non ho toccato `TastoPrimario` (fuori mandato — ha altri chiamanti).

**Prova:** `🔴 A1 — disabilitata: NESSUNA dida visibile sotto il tasto` (`FoglioConferma.test.tsx`).
**Mutazione:** ripristinata `motivoDisabilitato={distruttivaDisabilitata ? 'Un attimo…' : undefined}`
→ **1 prova si accende** (esattamente quella dedicata).

### A2 — il commento corretto, non la browser-proof

Riscritto il commento su `distruttivaDisabilitata` (JSDoc della prop): non afferma più che «Annulla,
Esc, il velo e lo swipe restano SEMPRE attivi» come fatto generico. Ora dice due cose separate: (1)
quel che è **garantito e provato** — il componente non disabilita mai «Annulla», e nessuno dei tre
rami di uscita (Esc, tap velo, swipe) legge `distruttivaDisabilitata` — con riferimento al test che lo
prova; (2) quel che **non è provato e resta da verificare a browser** — la regola HTML del reset del
focus: se il focus è sul tasto distruttivo quando il chiamante lo disabilita, il browser lo sposta al
`body`, e da lì l'`Escape` non arriva più al pannello (jsdom non riproduce questo comportamento — non
c'è un modo onesto di provarlo in questa suite). Non ho tentato una prova a browser (fuori dal mandato
di questa sessione, che è correzione di test unitari); ho scritto il vero invece di lasciare
un'affermazione non provata su una superficie distruttiva. Nessuna mutazione applicabile: è un
commento, non comportamento.

### A3 — il ripiego del focus: la metà provabile lo è ora, l'altra è dichiarata «non coperta»

`trappolaFocus` pretende per contratto `tabIndex={-1}` sul pannello (`trappola-focus.ts:33-34`). Ho
aggiunto la prova diretta: il pannello è programmaticamente focusabile (`p.focus()` sposta davvero
`document.activeElement`) — in jsdom `.focus()` su un `<div>` senza `tabindex` è un no-op, quindi è
una prova onesta del contratto.

**La seconda metà (la ricerca per etichetta che fallisce e il ripiego che ne consegue) è dichiarata
NON COPERTA, con la ragione:** `etichettaSicura` è una `string` passata dal chiamante e resa verbatim
dentro `TastoSecondario` come `children` — `textContent.trim()` la trova sempre, per costruzione del
componente. Il caso «la ricerca fallisce» richiederebbe o un `TastoSecondario` con contenuto interno
extra (cambierebbe un componente fuori mandato) o un'etichetta scritta diversamente dal chiamante (un
bug del CHIAMANTE, non di questo componente) — non ho contraffatto un mismatch artificiale per far
vedere rosso: sarebbe stata una prova che finge, non una prova vera.

**Prova:** `il pannello è programmaticamente focusabile ('tabIndex={-1}')`.
**Mutazione:** tolto `tabIndex={-1}` dal pannello → **1 prova si accende** (esattamente quella
dedicata; gli altri test del focus restano verdi perché non passano dal ripiego — la ricerca per
etichetta riesce sempre, come sopra).

### A4 — la decisione dello swipe, catturata e provata (non aggirata con un'astrazione)

Analisi (validata con l'advisor prima di scrivere): estrarre la decisione in una funzione pura
separata (tipo `azioneSwipeGiu(chiude): 'onAnnulla'|'altro'`) avrebbe provato la MAPPA, non la riga
vera — un'inversione `onAnnulla()` → `onConferma()` scritta dentro `fineTrascinamento` sarebbe rimasta
invisibile a quella prova, esattamente come oggi. Non è la via scelta.

**Via scelta:** un mock parziale di `motion/react` (stesso pattern di `sheet-dialog.test.tsx`,
`importOriginal` + spread di `actual`) che intercetta **solo** `motion.div` con un wrapper-spia:
cattura le props quando `onDragEnd` è presente (solo il pannello lo passa, mai il velo) e poi rende
l'originale intatto — ogni altra prova di geometria/velo/manico continua a vedere il vero `motion.div`,
verificato (le 47 prove passavano intatte prima di aggiungere le nuove). Nessuna riga di
`FoglioConferma.tsx` è cambiata per questo punto: il diff su A4 è tutto nel test.

**Insidia trovata e risolta:** `motion` non è un oggetto con chiavi enumerabili — è un Proxy che genera
`motion.button`/`motion.span`/… al volo (misurato: `Object.keys(actual.motion)` → `[]`). Il primo
tentativo, `{ ...actual.motion, div: DivSpia }`, perdeva **ogni altro tag**: `TastoPrimario`/
`TastoSecondario` (che usano `motion.button`) smettevano di renderizzare (`Element type is invalid`).
Risolto avvolgendo `actual.motion` in un secondo `Proxy` che intercetta solo la chiave `div` e inoltra
il resto all'originale.

Con l'`onDragEnd` vero in mano, due prove dirette: superata la soglia (offset 1000, altezza jsdom = 0
→ `deveChiudere` vera per costruzione) chiama `onAnnulla` e MAI `onConferma`; non superata, non chiama
nessuna delle due.

**Prova:** `supera la soglia di 'deveChiudere': chiama SOLO 'onAnnulla', MAI 'onConferma'`.
**Mutazione — quella esatta descritta dal rilievo:** invertito `onAnnulla()` in `onConferma()` dentro
il ramo `if (deveChiudere(...))` di `fineTrascinamento` → **1 prova si accende** (esattamente quella
dedicata). Il gesto fisico resta non provato (dichiarato, stessa ragione di `Sheet`/`FoglioCategoria`);
la decisione — quale delle due callback riceve la chiamata — sì.

### A5 — i cinque requisiti scoperti, tutti provati

| Requisito | Prova aggiunta | Mutazione | Prove accese |
|---|---|---|---|
| `aria-describedby` sul testo | assertion aggiunta nel test «è un dialogo vero» | tolto `aria-describedby={idTesto}` | 2 (quella diretta + A7, che lo usa per trovare l'elemento) |
| `tabIndex={-1}` sul pannello | v. A3 | tolto `tabIndex={-1}` | 1 |
| padding `spazio.sm`/`spazio.ml` | nuova prova sui 4 longhand | `spazio.ml` → `spazio.sm` nel lato destro/sinistro/sotto | 1 |
| `gap spazio.m` fra le azioni | nuova prova, con `className="ds-foglioconferma-azioni"` aggiunta al div (l'unico cambio non-commento in produzione oltre ad A1) | `spazio.m` → `spazio.s` | 1 |
| `exit` sul pannello | catturato dal mock A4, confrontato con `variantePannello(false).exit` | tolta la prop `exit` dal pannello | 1 |

Il `className` aggiunto (`ds-foglioconferma-azioni`) è l'unico cambiamento strutturale nel JSX oltre
alla rimozione di A1: serve a rendere il div del gap trovabile senza dipendere dalla struttura interna
di `TastoSecondario` (che è un `Fragment`, non un wrapper — fragile da cui non contare).

### A6 — i due tasti di casa, provati per tratto (non per altezza su entrambi)

Aggiunta la prova che «Annulla» porti la classe `ds-tasto-secondario` (più l'altezza inline 58, senza
media query) e che «Elimina foto» porti `ds-tasto-primario`. **Scelta dichiarata:** non ho provato
l'altezza 70 di `TastoPrimario` via `getComputedStyle` — la sua altezza vive in un `<style>` iniettato
con `@media (min-width: 1024px) { height: 60px }`, e **jsdom risolve `window.innerWidth` a 1024 di
default** (misurato: `1024x768`), cioè AL confine della media query — un'assertion sull'altezza
calcolata sarebbe stata fragile e legata al default di jsdom, non al componente. La classe è un tratto
altrettanto esclusivo e non ha questo problema.

**Prova:** le due nuove `it` in «i due tasti sono quelli di casa».
**Mutazione:** sostituito `<TastoSecondario onClick={onAnnulla}>{etichettaSicura}</TastoSecondario>`
con un `<button>` nudo → **1 prova si accende** (esattamente quella dedicata).

### A7 — il testo ratificato, verbatim, e provato a schermo intero

La fixture di default in `props()` portava il testo TRONCATO (mancava «Resta annotato chi l'ha
eliminata e quando.»). Sostituita con una costante `TESTO_RATIFICATO` che porta la frase per intero,
usata come default in `props()`; aggiunta una prova dedicata che legge l'elemento via
`aria-describedby` e ne confronta il `textContent` byte-per-byte con la costante.

**Prova:** `🔴 A7 — il testo ratificato arriva a schermo INTERO, verbatim, non troncato`.
**Mutazione:** ripristinata la vecchia fixture troncata (nel solo test, mantenendo la prova A7) →
**1 prova si accende** (esattamente quella dedicata; le altre non se ne accorgono perché non
verificavano mai il testo per intero).

### A8 — il riconteggio con l'abbozzo DAVVERO inerte

Costruito un secondo abbozzo, questa volta inerte anche sull'asse che l'originale non lo era:
`variantePannello` ignora l'argomento `reduced` e torna sempre `coreografie.sheetSu` (mai la variante
ridotta), il componente rende sempre `null`. Eseguita l'intera suite di 47 prove (37 originali + 10 di
questa chiusura) contro questo abbozzo.

**Conteggio vero: 3 su 47** (non 4 su 37 come nel referto originale):

| Prova verde sull'abbozzo INERTE | Perché è legittima |
|---|---|
| `chiuso: niente a schermo e il corpo non si tocca` | Assenza: `null` sempre, per costruzione. |
| `nome_file non finisce da nessuna parte nel reso` | Assenza (G5): niente si rende, quindi `nome_file` non può comparire. |
| `«riduci movimento» a preferenza SPENTA` | Dato puro, e **vera anche su un `variantePannello` inerte**: per `reduced=false` OGNI implementazione corretta deve tornare `coreografie.sheetSu`, e un abbozzo che lo torna SEMPRE lo soddisfa per quel solo ramo — non è un falso positivo, è l'unico ramo su cui l'abbozzo indovina per costruzione. |

**La correzione rispetto al referto originale:** la prova ACCESA (`🛑 a preferenza ACCESA...`), che il
referto contava fra le 4 verdi «dato puro», ora è **rossa** sull'abbozzo davvero inerte — perché
`ridotta.animate.transition.y` risolve a `molla.smooth.y` (`undefined`), che non è `istantaneo`. Il
referto originale l'aveva contata come verde perché l'abbozzo di allora aveva GIÀ l'implementazione
vera e completa di `variantePannello` (corretta su entrambi i rami): non era inerte proprio sull'asse
che quella prova misura, quindi il suo verde non diceva niente sulla forza della prova. Con questo
secondo abbozzo, genuinamente cieco su quell'asse, si vede che la prova morde davvero.

### A9 — il token importato, non ricopiato

Le due assertion su `ridotta.animate.transition.y`/`ridotta.exit.transition.y` confrontano ora contro
`istantaneo` (importato da `@/design-system/v3/motion`), non più contro `{ duration: 0 }` scritto a
mano. **Nessuna mutazione rossa/verde applicabile oggi:** il valore del token e il vecchio letterale
coincidono bit-a-bit in questo istante, quindi non c'è un modo onesto di far accendere questa prova
adesso — il guadagno è contro la deriva futura del token (se `istantaneo` cambiasse forma, un
componente che lo importa correttamente resterebbe allineato per costruzione; un componente che lo
avesse ricopiato a mano andrebbe fuori sincrono, ed è esattamente quella divergenza — sul componente,
non sul token — che questa forma di prova saprebbe accendere). Lo dichiaro invece di inventare una
mutazione che non prova niente.

### Verifica finale — output vero

```
$ npx tsc --noEmit
(nessun output — 0 errori)

$ npx vitest run
 Test Files  368 passed | 3 skipped (371)
      Tests  4189 passed | 19 skipped (4208)

$ npx next build
✓ Compiled successfully in 6.3s
(exit 0; stessa build di 81 pagine della sessione precedente)
```

Riferimento dato dal task prima di questa chiusura: 368 file | 3 saltati, 4179 prove | 19 saltate.
Delta: **+10 prove** (37 → 47 nel file di `FoglioConferma`), file di test invariati (368) — nessun
nuovo file di test creato, solo il file esistente esteso.

`bash scripts/check-ds-compliance.sh` → `✅ DS compliance OK (v2.3 legacy + v3)`.
`npx eslint src/components/ds/FoglioConferma.tsx tests/unit/ds-v3/componenti/FoglioConferma.test.tsx`
→ 0 errori, 0 warning (un errore `react/display-name` sul wrapper-spia del mock è stato corretto
nominando la funzione passata a `forwardRef`).
`bash scripts/check-csrf.sh` e `node scripts/guardia-reduced-motion.mjs` → verdi, invariati.

### Riferito, non corretto

- **Il conflitto A1** (`TastoPrimario` avvisa in sviluppo quando `disabled` è vero senza
  `motivoDisabilitato`) — v. sopra, sezione A1. Non tocca `TastoPrimario`.
- **A3, la seconda metà** (la ricerca per etichetta che fallisce e il ripiego conseguente) — dichiarata
  non coperta con la ragione, non contraffatta. V. sopra, sezione A3.
- **A2** — non tentata una prova a browser del reset del focus; il commento dice il vero invece di
  affermare ciò che non è provato. V. sopra, sezione A2.
- **Confermati, non toccati per mandato esplicito (§B del brief), i due rilievi già giudicati fuori dal
  mio mandato:** ① l'`exit` della variante non gira perché nessuno dei quattro strati monta
  `AnimatePresence` (condiviso, `FoglioCategoria`/`VisoreFoto`/`TendinaMenu` compresi) — il mio test A5
  su `exit` verifica solo che la PROP porti la variante giusta, non che l'animazione di uscita giochi
  davvero: non ho toccato né provato quell'asse, resta esattamente il difetto già annotato; ② l'effect
  del focus dipende dall'identità dell'oggetto `ancoraFocus` (condiviso con `FoglioCategoria`) — non
  l'ho toccato.
- **Nessun nuovo difetto trovato fuori mandato** in questo giro, oltre a quelli già registrati al §7.
