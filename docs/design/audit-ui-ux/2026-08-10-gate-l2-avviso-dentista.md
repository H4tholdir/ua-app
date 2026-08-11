# GATE ESTETICO L2 (⚖️ D245) — ondata «l'avviso al dentista»

| | |
|---|---|
| **Livello** | 2 — gate di fine ondata (`README.md` §Livello 2) |
| **Perimetro** | SOLO le superfici toccate dall'ondata, sui 33 scatti già presi |
| **Scatti** | `docs/design/screenshots/2026-08-10-avviso-task10/` — 33 PNG |
| **Lista** | `CHECKLIST-DS-V3-UI-UX.md`, 12 sezioni |
| **Metodo** | lettura di tutti e 33 gli scatti come immagini + campionamento pixel (Python/PIL, formula WCAG relative-luminance) per ogni contrasto dubbio |
| **Referto scritto il** | 11/08/2026 (`provato:` `date` → `Tue Aug 11 00:27:24 CEST 2026`) — audita gli scatti del 10/08, nome file invariato come da mandato |
| **Mandato** | SOLO audit, nessuna modifica al codice — ogni ❌ è quindi **deferito per costruzione**, mai «corretto ora» |
| **Limite del mezzo — dichiarato, non nascosto** | uno screenshot statico non prova assenza di scorrimento orizzontale (serve `doc==viewport` dal DOM), non mostra `:focus-visible`, non prova motion/suono/haptic, non mostra stati non fotografati. Dove il mezzo non basta la tabella dice **«non verificato»**, non ✅ — per lo Statuto delle fonti (`CLAUDE.md` §Statuto): «un vuoto dichiarato vale più di una certezza presa in prestito» |

**Nota preliminare — un artefatto in ogni scatto, escluso dai riscontri.** Il cerchio nero con la
lettera «N» in basso a sinistra in **tutti** i 33 scatti è il pulsante del **devtool di Next.js**
(«N Issue» — confermato leggendolo esteso in `portale-card-avviso-*`, dove appare come «N 1 Issue ✕»).
Non è UI di produzione: non compare nella build reale. A **1280** nei due `home-striscia-1280-*` copre
in parte il banner dei promemoria in sospeso — ma essendo un overlay di sviluppo, **non è contato come
❌ §3**. Segnalato per trasparenza, non come difetto.

---

## 1. Tabella per superficie

Legenda: ✅ conforme (con prova) · ⚠️ da migliorare · ❌ difetto (misurato) · **non verificato** (il
mezzo — screenshot statico — non può provarlo, motivo dichiarato) · n.a. (non pertinente, con motivo).

### A. `scheda-promemoria` — card «Avvisa il dentista» / «Devo intervenire» + callout tracciabilità (scheda lavoro, **v3**)

| § | esito |
|---|---|
| 1 Layout | ✅ righe allineate, header coerente sui 3 viewport |
| 2 Spazio | ✅ card dimensionate coerentemente; 1280 usa 2 colonne, nessuno spazio morto |
| 3 Sovrapposizioni | ✅ nessuna sulla superficie |
| 4 Tipografia | ✅ (spot-check mirato: «Avvisa il dentista» a 2 righe e «è» accentata leggibili senza clip a 390 — vedi §3 sotto; non ripassato su ogni riga di ogni scatto) |
| 5 Colore | ✅ **misurato** — corpo del callout ambra «Corona ceramica test — distinta base (BOM)…»: `rgb(110,100,87)` su `rgb(248,240,225)` → **5,12:1** chiaro; `rgb(166,155,140)` su `rgb(53,40,24)` → **5,24:1** scuro (soglia AA 4,5) |
| 6 Motion | non verificato — screenshot statico |
| 7 Suono/haptic | non verificato — screenshot statico |
| 8 Tocco | ✅ **misurato** — le due card promemoria ≈86-90px di altezza (soglia 44px) |
| 9 Stati | ✅ **disabled** — il bottone CONSEGNA disattivato è fotografato in entrambi gli scatti 1280, col motivo esplicito sotto («Lavoro già consegnato il 6 lug»); contrasto **misurato** 4,17:1 chiaro / 6,07:1 scuro, leggibile (regola di casa, non l'esenzione WCAG 1.4.3). ⚠️ empty/loading/error **non verificato** — non fotografati |
| 10 Responsive | ✅ nessuna rottura visibile ai 3 breakpoint; scorrimento orizzontale **non verificato** (serve `doc==viewport` dal DOM, non ricavabile da un PNG già ritagliato alla larghezza del viewport) |
| 11 Accessibilità | ✅ icona+testo su entrambe le card (non solo iconico); focus-visible/aria-label **non verificato** |
| 12 Copy | ✅ italiano corretto, coerente con C |

### B. `home-striscia` — banner «n.… aspetta conferma … e altre 2 · Conferma ›» (home, **v3**)

| § | esito |
|---|---|
| 1 Layout | ✅ |
| 2 Spazio | ✅ (il vuoto a destra a 1280 è del layout home preesistente, non di questo banner — fuori mandato) |
| 3 Sovrapposizioni | ✅ nell'app reale — copertura parziale dal solo devtool Next.js (vedi nota) |
| 4 Tipografia | ✅ ellissi corretta su «n.2026/0004 …», nessun taglio brutale |
| 5 Colore | ✅ testo scuro/rosso su tint rosa, alto contrasto a vista; non ricampionato a parte perché lo stesso token è già provato altrove nel DS |
| 6 Motion | non verificato |
| 7 Suono | non verificato |
| 8 Tocco | ✅ **misurato** — banner ≈51px di altezza (soglia 44px) |
| 9 Stati | n.a. — solo lo stato «promemoria in sospeso» esiste per questo banner (compare/non compare, non ha stati intermedi) |
| 10 Responsive | ✅ nessuna rottura; scorrimento orizzontale **non verificato** |
| 11 Accessibilità | non verificato |
| 12 Copy | ✅ «e altre 2 · Conferma ›» chiaro e azionabile |

### C. `foglio-avviso-aperto` — sheet «Come avvisi il dentista?» (DS foglio, **v3**)

| § | esito |
|---|---|
| 1 Layout | ✅ header, righe opzione, box motivazione, chiudi — tutti allineati |
| 2 Spazio | ✅ pattern bottom-sheet mantenuto anche a 1280 (~480px, centrato) — scelta coerente, non spazio morto |
| 3 Sovrapposizioni | ✅ backdrop attenuato corretto, «Chiudi» sempre dentro il viewport nei 3 formati |
| 4 Tipografia | ✅ titolo «Come avvisi il dentista?» e box «PERCHÉ TE LO CHIEDO» (É accentata) controllati a 390: nessun clip verticale |
| 5 Colore | ✅ **misurato** — corpo del box motivazione: **4,66:1** chiaro / **7,06:1** scuro (soglia 4,5) |
| 6 Motion | non verificato |
| 7 Suono | non verificato |
| 8 Tocco | ✅ **misurato** — righe opzione 46-47px (soglia 44px); ⚠️ «Chiudi» — vedi §3 «da verificare al dito» |
| 9 Stati | n.a. — sheet a stato singolo, nessun loading/error atteso qui |
| 10 Responsive | ✅ nessuna rottura; scorrimento orizzontale **non verificato** |
| 11 Accessibilità | ✅ icona+testo su entrambe le righe (non solo iconico); focus/aria **non verificato** |
| 12 Copy | ✅ spiega il «perché», coerente con A |

### D. `archivio-riga-aperta` + `archivio-righe-chiuse` — sezione COMUNICAZIONI (pagina cliente, **v2.3 legacy** — token/contrasti a peso pieno, molle v3 n.a. per la pagina)

| § | esito |
|---|---|
| 1 Layout | ✅ righe e card allineate |
| 2 Spazio | ⚠️ card quasi edge-to-edge a 1280 — **preesistente**, non introdotto da questa ondata (le sezioni COMMERCIALE/PORTALE/PRIVACY non toccate dall'ondata condividono lo stesso pattern) — riferito, non corretto qui (R-E2) |
| 3 Sovrapposizioni | ✅ nessuna sulla sezione comunicazioni |
| 4 Tipografia | non verificato — non ripassato riga per riga su questa superficie |
| 5 Colore | **✅ RISOLTO l'11/08/2026 — vedi §2 sotto** |
| 6 Motion | n.a. — pagina v2.3, molle v3 non si applicano qui |
| 7 Suono | non verificato |
| 8 Tocco | n.a. — righe di log senza chevron, non risultano interattive di per sé; «DA COMUNICARE» — vedi «da verificare al dito» |
| 9 Stati | n.a. — solo stato «con comunicazioni presenti/passate» fotografato |
| 10 Responsive | ✅ nessuna rottura visibile; scorrimento orizzontale **non verificato** |
| 11 Accessibilità | non verificato |
| 12 Copy | ✅ «a voce» coerente col foglio C |

### E. `portale-card-avviso` — card «AVVISI DAL LABORATORIO» (portale, **stile proprio pre-v3, ⚖️ D347** — solo chiaro, deliberato: non si segna come difetto l'assenza di v3/scuro)

| § | esito |
|---|---|
| 1 Layout | ✅ card ordinata, badge allineato col titolo |
| 2 Spazio | ✅ coerente sui 3 viewport |
| 3 Sovrapposizioni | ✅ — il devtool «N/1 Issue» non copre contenuto del portale |
| 4 Tipografia | ✅ gerarchia titolo/corpo/badge chiara |
| 5 Colore | ✅ **misurato** — pillola «AGGIORNATA»: **6,37:1** |
| 6 Motion | n.a. — fuori dal perimetro v3 (D347) |
| 7 Suono | non verificato |
| 8 Tocco | **❌ vedi §2 sotto** |
| 9 Stati | n.a. — solo stato «con avviso attivo» fotografato |
| 10 Responsive | ✅ nessuna rottura; scorrimento orizzontale **non verificato** |
| 11 Accessibilità | ✅ icona+testo, non solo iconico |
| 12 Copy | ✅ |

---

## 2. I ❌, uno per uno — con la misura

Mandato originario solo-audit: **tutti e tre erano deferiti** al momento della scrittura (11/08/2026,
00:27). ❌1 e ❌2 sono stati **corretti nella stessa giornata**, sessione dedicata (ramo
`intervento-post-consegna`, mandato «correzione piccola dal gate estetico L2»): righe riscritte qui
sotto invece che aggiunte in fondo. ❌3 resta deferito — fuori mandato di quella sessione (superficie
`portale-card-avviso`, non `archivio-*`).

### ❌1 — §5 colore · «Non ancora comunicata» sotto soglia AA in tema scuro — ✅ RISOLTO l'11/08/2026 (commit `8063c3be`)

**Scatto (difetto):** `archivio-riga-aperta-390-scuro.png` (stesso componente confermato a occhio anche
su `-768-scuro.png`).

`misurato allora:` (WCAG relative-luminance, campionamento pixel) — testo `rgb(90,86,82)` su fondo card
`rgb(35,32,24)` → **2,0–2,24 : 1** (AA chiede 4,5). In **chiaro** lo stesso testo passava, risicato:
**4,1–4,8 : 1** su `archivio-riga-aperta-390-chiaro.png` — **il chiaro non è stato toccato dal fix**.

**Causa:** `RigaComunicazione` (`src/app/(app)/clienti/[id]/page.tsx`) coloriva con `var(--t3, #6B5C51)`
tre elementi sullo stesso fondo card (`--surface` scuro `#232018`): il testo di `etichettaVisto`
(«Non ancora comunicata» / «Non ancora vista dal dentista» / «Vista dal dentista il…», stesso stile per
tutti e tre gli stati, ⚖️ D337) **e anche** `riga.quando` e `#riga.numeroLavoro`, non fotografati a
parte nello scatto ma con lo stesso token e lo stesso fondo — stessa origine, stesso valore fallito.
`--t3` scuro (`#5A5652`) è già segnalato altrove in `globals.css:103-118` come insufficiente
(`--brd-cmd`, uso da BORDO, esplicitamente vietato come colore di testo).

**Fix:** i tre `var(--t3, #6B5C51)` sono diventati `var(--t1, #1C1916)` — stesso token già in uso in
questa pagina (`InfoRow` riga 85, `chi` riga 190+, nota cliente riga 459, «Non ancora emesso» riga
565-567: **quest'ultimo il precedente diretto**, `--t2` scartato lì per lo stesso identico motivo,
4,45:1 in scuro sotto soglia). Applicato UGUALE su ogni stato — nessuna differenza fra riga aperta e
chiusa, il vincolo D337 resta rispettato (nessun colore d'allarme, solo leggibilità).

`misurato ora` (stesso metodo, pixel campionati da `archivio-riga-aperta-390-scuro-FIX.png`, banco
reale — vedi §5-bis): testo `rgb(240,237,232)` (quando/numeroLavoro) e `rgb(229,226,221)`
(«Vista dal dentista…», font 11px) su fondo card `rgb(35,32,24)` → **13,93 : 1** e **12,59 : 1**. Il
banco non aveva, in questo giro, nessuna riga «da comunicare»/«non vista» aperta (tutte e tre le righe
del giro del 10/08 erano già chiuse e già viste dal dentista — dichiarato, non nascosto: vedi §5-bis) —
il token e lo stile sono gli stessi per i tre stati, quindi la misura sul testo presente vale anche per
gli altri due, mai fotografati in questo giro.

**Riserva dichiarata:** il fix cambia ANCHE la resa in tema chiaro (verificato a schermo, non solo
dedotto): `--t1` chiaro è quasi nero (`#1C1916`, 15,4:1) contro il grigio-marrone attenuato di `--t3`
chiaro (`#6B5C51`, 5,6:1) usato prima — il testo è ora percepibilmente più scuro/deciso, non solo più
leggibile. Nessun token esistente nella pagina ha lo stesso valore chiaro di `--t3` E un valore scuro
sopra 4,5:1 per uso testo (l'unico con lo stesso chiaro, `--brd-cmd`, è vietato per testo da
`globals.css:109`). Non bloccato — vedi la decisione motivata più sotto — ma la resa chiaro NON è più
byte-identica a prima: **riserva per Francesco**, non un difetto nascosto.

### ❌2 — §5 colore · pillole «DA COMUNICARE» / «A VOCE» sotto soglia AA in tema scuro — ✅ RISOLTO l'11/08/2026 (commit `8063c3be`)

**Scatti (difetto):** `archivio-riga-aperta-390-scuro.png` (pillola «DA COMUNICARE»),
`archivio-righe-chiuse-390-scuro.png` (pillola «A VOCE»).

`misurato allora:` testo `rgb(138,133,128)` su fondo pillola `rgb(44,42,39)` → **3,92 : 1** (soglia
4,5). In chiaro: **8,92 : 1**, ok.

**Causa:** stesso componente, pillola `comeLabel` colorata `var(--t2, #4A3D33)` su fondo
`var(--elv, #EDEDEA)` — in scuro `--t2` (`#8A8580`) su `--elv` (`#2C2A27`) dà 3,92:1. **Non era un fix
disponibile restare su `--t2`**: lo stesso token dà 4,45:1 anche sul fondo card (`--surface` scuro,
nota già scritta a `page.tsx:561-564` per un altro testo, P16/D134 deferito, non toccato qui) — sotto
soglia comunque.

**Fix:** stesso token scelto per ❌1, `var(--t1, #1C1916)`.

`misurato ora` (pixel, `archivio-riga-aperta-390-scuro-FIX.png`, pillola «A VOCE», riquadro confinato
al solo interno della pillola): testo `rgb(240,237,232)` su fondo pillola `rgb(44,42,39)` →
**12,25 : 1**. Stessa riserva dichiarata di ❌1 sul tema chiaro (il testo della pillola era già
`--t2`, non `--t3`, quindi lo scarto visivo in chiaro è più piccolo: `--t2` chiaro `#4A3D33` vs `--t1`
chiaro `#1C1916` — comunque un cambio, non due grigi identici).

### §5-bis — come sono state prese le misure nuove (11/08/2026)

Server locale (`next dev`, porta 3000) · accesso D103 via `scripts/link-accesso.ts`
(`e2e-titolare@ua-test.local`, stesso laboratorio/cliente/lavoro del giro Task 10-B —
`.superpowers/sdd/avviso-dentista-task-10b-report.md`) · tema forzato scrivendo `localStorage['ua-tema']
= 'scuro'` (valore ITALIANO, non `'dark'` — `src/lib/preferenze/tema.ts:13`) e ricaricando · screenshot
Playwright a 390×1200 CSS-px · campionamento pixel Python/PIL, stessa formula WCAG relative-luminance
dell'audit originale (`(L1+0.05)/(L2+0.05)`), colore di sfondo = colore più frequente nel riquadro,
colore di testo = colore più chiaro con almeno 5 pixel (scarta rumore di anti-aliasing a 1 pixel).
Il banco, ereditato dal giro Task 10-B del 10/08, aveva le tre righe del lavoro `2026/0005` **tutte
già chiuse e già viste** (nessuna riga «da comunicare» aperta) — dichiarato al mandato e confermato qui,
non nascosto: gli scatti `-FIX.png` mostrano quindi lo stesso contenuto testuale sia per
«riga-aperta» sia per «righe-chiuse» (nessuna riga aperta da fotografare separatamente), come il
mandato stesso prevedeva come esito possibile.

### ❌3 — §8 tocco · bottone «Dichiarazione aggiornata» sotto i 44px

**Scatti:** `portale-card-avviso-390-chiaro.png`, `-768-chiaro.png`, `-1280-chiaro.png` (stessa misura
sui tre — unico tema per D347).

`misurato:` bordo superiore/inferiore del bottone su più colonne x → altezza **42–43px** (soglia §8:
44px). Il bersaglio è largo abbastanza (>150px), solo l'altezza è corta di 1-2px.

**Deferito — priorità bassa.** Fix indicativo: 1-2px di padding verticale in più; un solo componente,
basso rischio.

---

## 3. Da verificare al dito (tappabilità)

- **«Chiudi»** nel foglio `foglio-avviso-aperto` (tutti e 3 i viewport) — è un link testuale
  sottolineato; il glifo visibile misura ~16px senza padding visibile nello scatto. L'area di tap reale
  (spesso allargata via CSS oltre il testo) non è verificabile da un'immagine statica.
- **Pillola «DA COMUNICARE»** in `archivio-riga-aperta` — non è chiaro dagli scatti se sia solo
  un'etichetta di stato o anche un invito ad agire cliccabile; visivamente alta ~15px. Se è un
  controllo, va verificata l'area di tap.
- **Banner «… e altre 2 · Conferma ›»** in `home-striscia` — l'intero banner misura ~51px (sopra
  soglia), ma non è chiaro dallo scatto se l'area cliccabile sia tutto il banner o solo il testo
  «Conferma ›» a destra.

---

## 4. Giudizio finale

**PASSA CON RISERVE.**

**Riserve misurate (1, minore) — aggiornato l'11/08/2026:** ❌1 e ❌2 (contrasto sotto soglia AA in
tema scuro su testi secondari della sezione COMUNICAZIONI, pagina cliente v2.3 legacy) sono stati
**risolti nella giornata stessa** — vedi §2, misure nuove 12,25–13,93:1 — e non contano più come
riserva aperta; resta ❌3 — bottone «Dichiarazione aggiornata» nel portale 1-2px sotto i 44px di tocco
minimo, ancora deferito, fuori mandato della sessione di correzione. Nessuna blocca il flusso
principale: le tre superfici v3 (`scheda-promemoria`, `home-striscia`, `foglio-avviso-aperto`) passano
su tutti i controlli misurabili, su tutti e 3 i viewport e i due temi; il portale (D347) è coerente
internamente a parte ❌3.

**Che cosa resta non verificato, e perché il quadro non è «3 riserve e per il resto tutto pulito».**
Uno screenshot statico non prova: scorrimento orizzontale reale (serve `doc==viewport` dal DOM, come
fece il gate del 05/08 con `referto-s1.json`), `:focus-visible` e ordine di tabulazione, motion/suono/
haptic, gli stati loading/error/empty (mai fotografati su nessuna di queste 5 superfici — solo lo stato
«con dati/avviso presente» è stato catturato). Per chiudere questi punti serve un giro dal vivo sul
banco (come nei gate precedenti), non altri screenshot. Questo referto certifica ciò che i pixel
possono provare; il resto è scritto «non verificato», non assunto conforme.
