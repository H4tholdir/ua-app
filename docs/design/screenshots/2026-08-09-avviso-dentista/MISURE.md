# FASE 9 — «Avvisa il dentista» (Task 5): gli scatti e le MISURE sul DOM vivo

**Quando:** 9 agosto 2026, 20:30-20:47 (`provato:` `date` → `Sun Aug  9 20:47:00 CEST 2026`, letto
dall'orologio e non da un documento — D155).
**Superficie:** `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` — la riga sulla scheda e il
foglio a tre passi della **variante A2** (⚖️ **D344**).
**Perimetro:** 390 · 768 · 1280 × chiaro · scuro, **sette schermate ciascuna** = 42 combinazioni; più un
giro a **movimento ridotto** (in `Sheet` è un ramo di codice diverso, `SheetRidotto`, §8.4) e due giri
dedicati allo **scorrimento**.

> 🛑 **Il foglio non è montato da nessuna parte: lo monta il Task 6.** Per arrivare a schermo è stato usato
> un **banco di prova usa-e-getta** (`src/app/ds-v3-catalogo/banco-avviso-t5/page.tsx`, sotto la rotta
> pubblica del catalogo perché il middleware protegge tutto il resto), con la rotta **finta** per poter
> arrivare fino alla schermata che rilegge la riga salvata. 🗑️ **Cancellato prima del salvataggio**: gli
> spike non si committano (R-P1). Gli script della sonda vivono in `scripts/tmp/` (cartella ignorata da git).

---

## 1. I contrasti — misurati, non guardati

Sonda sul DOM vivo: **ogni nodo con testo proprio** dentro il foglio, colore e fondo **risolti** da
`getComputedStyle`, contrasto con la formula WCAG 2.1, soglia **4,5** (3,0 per il testo grande: ≥ 24 px,
oppure ≥ 18,66 px con peso ≥ 700).

| esito | valore |
|---|---|
| schermate sondate | **42** (7 passi × 3 viewport × 2 temi) |
| **testi sotto soglia** | **0 su 42** |
| peggiore in **chiaro** | **4,11** contro soglia **3** — bianco 21/800 sul gradiente del `TastoPrimario` (§5.1, valore ratificato) |
| peggiore in **scuro** | **3,52** contro soglia **3** — lo stesso testo |
| peggiore fra i testi a soglia **4,5** | **4,58** — bianco 17,5/800 sullo stop chiaro del verde WhatsApp `#208650` (§3.3.4, valore ratificato) |
| movimento ridotto (`SheetRidotto`) | **0 sotto soglia**, peggiori **4,66** chiaro · **6,07** scuro |
| sbordatura orizzontale | **nessuna**: `document.scrollWidth == window.innerWidth` a 390 · 768 · 1280 · 195 |

⚠️ **Il primo giro della sonda ha prodotto 15 falsi positivi, e vale scrivere perché:** leggeva solo
`background-color`, che su un tasto a gradiente è `transparent` — quindi risaliva al pannello e misurava
«bianco su carta» = **1,01**. La sonda corretta legge gli **stop del gradiente** e giudica sul **peggiore**.
Un difetto della misura, non del foglio.

### 🔴 Due testi erano davvero sotto soglia, ed erano MIEI — corretti

Il riquadro d'esito era stato scritto ricopiando la forma del foglio gemello (`DevoIntervenire.tsx`,
funzione `Esito`), che colora il **titolo** col colore del tono a **16 px/700**. A quella misura la soglia è
**4,5** e non 3 («testo grande» comincia a 18,66 px):

| coppia | misurato | soglia | esito |
|---|---|---|---|
| `--green` su `--green-tint`, chiaro | **4,50** (esatto **4,499**) | 4,5 | ❌ sotto |
| `--red` sul red-tint composto, scuro (`rgb(64,33,30)`) | **4,09** | 4,5 | ❌ sotto |

✅ **Corretto:** il titolo del riquadro passa a `--ink` — **15,53 · 15,44 · 15,35** in chiaro e
**11,42 · 12,49 · 11,19** in scuro sui tre fondi. Non si perde niente su L3: il significato stava nelle
**parole** del titolo, la tinta resta come seconda fonte.
📮 **Il gemello ha la stessa costruzione e lo stesso difetto: riferito, non corretto da qui** (R-E2).

---

## 2. Lo scorrimento al cambio di passo — il difetto ereditato da `Sheet`

`provato:` `grep -n scrollTop src/components/ds/Sheet.tsx` → **zero righe**. Il pannello dello `Sheet` è il
contenitore che scorre (`overflowY: 'auto'`, `Sheet.tsx:507`) e **nessuno lo riporta in cima** quando il
contenuto cambia.

**Dove il caso NON esiste** (e per questo la prova andava cercata altrove): a **390×844** e a **390×667**
(regime device-corti §4.2) il passo 1 **non scorre affatto** — `scrollHeight` 517 su `clientHeight` 517 e
517 su 614.

**Dove esiste, ed è la condizione che §13.3 rende obbligatoria** — **195×422**, cioè 390×844 letto con lo
**zoom del browser al 200%** (in Chrome lo zoom scala anche i px, quindi il viewport in px CSS si dimezza):

| momento | prima della correzione | dopo |
|---|---|---|
| passo 1, scorrimento disponibile | `scrollHeight` **1100** su `clientHeight` **388** | idem |
| passo 1 scorso in fondo | `scrollTop` **712** | `scrollTop` **712** |
| **cambio di passo → passo 2** | `scrollTop` **216** | `scrollTop` **0** |
| **titolo del passo 2** | a **−150 px**: **fuori dal pannello** | **dentro** |

🛑 **La correzione vera sta in `Sheet.tsx` e non è stata fatta qui:** è un componente di sistema e il
difetto vale per **ogni** foglio a passi — **riferito** (R-E2). ✅ **La via locale c'è perché il difetto si
manifesta:** un'àncora invisibile in cima ai figli del foglio, e da lei `closest('[role="dialog"]')` →
`scrollTop = 0`. `role="dialog"` e non `.ds-sheet` perché è la marca comune ai **due** rami del componente,
animato e ridotto. Prova del meccanismo: `tests/unit/AvvisoDentista.test.tsx`, «*al cambio di passo lo
scorrimento torna in cima*».

Scatti: `z-195x422-zoom200-1-scelta-scorsa-*.png` · `z-195x422-zoom200-2-messaggio-dopo-*.png` ·
`z-390x667-*.png`.

---

## 3. L'altezza del campo del messaggio — rimisurata, non ricopiata

| cosa | misura |
|---|---|
| altezza **chiesta dal contenuto** (clone a `height:auto`) | **225 px** — a 390, a 768 **e** a 1280 |
| altezza **resa** (`minHeight` del componente) | **296 px** |
| testo tagliato in altezza a 390/768/1280 | **no** (`scrollHeight` 294 = `clientHeight` 294) |
| sbordatura **orizzontale** dentro il campo | **no** (`scrollWidth` 340 = `clientWidth` 340 a 390) |
| a zoom 200% (195×422) | il campo **scorre al proprio interno** (`scrollHeight` 595 su `clientHeight` 294) e resta allargabile (`resize: vertical`) — nessun contenuto perso |

🔄 **Il mockup diceva «225 a 1280 e di più a 390»: la seconda metà NON si riproduce.** Il contenuto chiede
**225 a tutti e tre i viewport**, perché il pannello del foglio ha `maxWidth: 480` e a 390 il collegamento
**va a capo** invece di allargare la riga. **296 resta** — è il valore del disegno approvato, e i 71 px di
gioco valgono circa **due righe** a `line-height` 1,45: spazio per una firma più lunga o una frase in più
prima che il campo cominci a scorrere.

---

## 4. I due difetti EREDITATI (⚖️ D349), con la misura su QUESTA superficie

| difetto | dove compare qui | misura |
|---|---|---|
| **`TastoPrimario.tsx:90`** — faccia spenta | il tasto «Mandalo su WhatsApp» **spento** quando il messaggio è vuoto | faccia `--bg-deep` contro pannello `--card`: **1,15:1 in scuro** · **1,23:1 in chiaro** — il tasto non si stacca dal pannello |
| **`TastoPrimario.tsx:91`** — testo spento | l'etichetta dello stesso tasto | `--faint` su `--bg-deep` = **4,17:1**. A 21/800 è **testo grande**, soglia **3** → **passa** come 1.4.3, ma è lo stesso 4,17 che ⚖️ D349 cita |
| **`Campo.tsx:28`** — didascalia del campo | la label «IL MESSAGGIO CHE MANDERAI» | `--faint` su `--card` = **5,14 in chiaro** · **5,28 in scuro** → **NON si manifesta**: quel 4,17 è `--faint` su `--fondo-superficie`, e questa label sta sul pannello `--card` |
| **⚖️ D330 ❌1** (deferito da Francesco) | il campo del messaggio e le due righe della scelta | fondo `--fondo-superficie` contro pannello `--card` = **1,23:1 in chiaro**, con `--filo-superficie` = `transparent`: le superfici non hanno un confine visibile. **Non è un difetto nuovo di questo foglio** |

🛑 Nessuno dei quattro è stato toccato: stanno in `src/components/ds/` e in `ds-v3.css`, e la migrazione è
**per route, mai per componente** (v3 §14).

---

## 5. Gli scatti — 60 file

`00-riga` · `01-scelta` · `02-messaggio` · `03-messaggio-vuoto` · `04-voce` · `05-fatto` ·
`06-non-registrato` · `07-senza-gettone`, ognuno in `--{390,768,1280}-{light,dark}`; più
`r-ridotto-{scelta,messaggio}--390-{light,dark}` (movimento ridotto) e gli otto `z-*` dello scorrimento.

📌 **FASE 9b (gate estetico L2, D245) non è questo documento**: è dovuta a **fine ondata, prima del merge**,
e sta nel **Task 10** del piano.
