# Parere accessibilità — DS v3 «Il cuore», Ondata 0

**Reviewer:** Accessibility specialist (WCAG 2.2 AA, mobile a11y) — parere indipendente, advisor non-gate.
**Materiale:** `docs/design/mockups/2026-07-09-il-cuore/*.html` + `_base.css` + screenshot 390/768/1280 light+dark.
**Utente bersaglio:** titolare 45-65 anni, presbite, luce da laboratorio, una mano libera.
**Metodo contrasti:** rapporti WCAG calcolati sui valori reali dei token (`_base.css`), tint dark compositati a α=0.14 sulla superficie effettiva (card `#211D18` / bg `#171411`). Script in scratchpad, valori riportati sotto.

---

### Giudizio complessivo

**Conformità AA raggiungibile: SÌ, senza toccare l'architettura visiva. Voto 7/10.**

L'impianto è sostanzialmente sano: gli inchiostri (`--ink`, `--muted`) hanno margini abbondanti, il colore non è quasi mai unica fonte di stato, i touch target dei componenti-legge sono generosi (50/56/70px), la gerarchia tipografica dei corpi grandi è eccellente per un presbite (numeri 52px, valori 17px, titoli 31px). I focus-visible sono già previsti su ogni classe interattiva del kit.

Ciò che tiene il voto a 7 sono **due famiglie di violazioni sistematiche e ratificabili adesso** — quindi da fixare NEI MOCKUP prima che i token vengano cristallizzati:
1. **`--faint` usato come colore di testo informativo**: fallisce AA ovunque, in entrambi i temi. È il difetto più diffuso (eyebrow, caption, chi-quando, countdown, esempi wizard).
2. **Testo bianco sui gradienti verdi** (WhatsApp e PillFase): il verde-chiaro «brand» non regge il bianco.

Nessuna delle due impone di cambiare il linguaggio: si risolvono con ritocchi di token/superficie. Il resto sono note per il build React (semantica, ARIA, aria-live del countdown, focus trap).

---

### Ciò che già funziona

- **Inchiostri primari**: `ink` 15.4:1 (light) / 15.9:1 (dark) su bg; `muted` 5.1–5.7 (light) / 6.1–6.7 (dark). Solidi.
- **Colori-famiglia su card**: red 5.26/4.76 · amber 5.33/7.66 · green 5.02/7.37 · blue 6.05/6.04 — tutti ≥ AA su superficie carta.
- **Colore mai unica fonte** (buona ridondanza): le 3 pile si distinguono per **etichetta + numero + posizione + colore** (non solo colore); le PillStato portano sempre il testo (+ spesso spunta ✓); «Fattura in preparazione» usa **icona-orologio ambra vs spunta verde** + testo; StrisciaStato allarme/sereno usa **triangolo vs check** + colore + testo. Esemplare.
- **Truncation della StrisciaStato**: pattern corretto — `.txt` tronca con ellissi ma il numero fattura (in `<b>` a inizio riga) e la CTA `.azione` (flex:none) **non troncano mai**. L'informazione critica sopravvive.
- **Touch target dei componenti-legge**: TastoTondo Ø50, chip 48, menu-voce 56, PillFase 44, LinkQuieto 44 (via padding+margin), bloccante ~72, TastoPiù 110, PillVoce 64, TastoPrimario 70/60. Tutti ≥44.
- **Focus-visible**: anello 2px `--blue` offset 2 su tutte le classi interattive del kit. Da estendere agli elementi page-local (vedi React).
- **Icone-grafiche su tint** (spunte check): ≥4.5:1, superano la soglia 3:1 di 1.4.11.

---

### Violazioni da fixare NEI MOCKUP

> Soglie: testo normale **4.5:1**; testo grande (≥18.66px bold o ≥24px) **3:1**; componenti UI/grafici **3:1** (1.4.11).

#### V1 — `--faint` come testo informativo — FAIL SISTEMICO (light **2.40**, dark **3.17** su bg; **2.71/2.89** su card)
`--faint` (#A69B8C light / #6E6457 dark) è usato come colore-testo in decine di punti; **nessuno** raggiunge AA. Elenco (tutti < 4.5):

| Uso | file / selettore | dim/peso | light | dark |
|---|---|---|---|---|
| Eyebrow data | home.html `.eyebrow` | 13/800 | 2.40 | 3.17 |
| Caption card | tutti `.card-title` | 12.5/800 | 2.71 | 2.89 |
| Chiave RigaDato | `_base.css .riga-dato .chiave` | 12.5/800 | 2.71 | 2.89 |
| Chi·quando fase | `_base.css .riga-fase .chi-quando` | 13.5/600 | 2.71 | 2.89 |
| Frame-sep / section-label | home/scheda/consegna | 12.5/800 | 2.40 | 3.17 |
| ua-titolo | consegna.html `.ua-titolo` | 12.5/800 | 2.71 | 2.89 |
| Countdown annullo | consegna.html `.countdown` | 14.5/700 | 2.40 | 3.17 |
| Esempi opzione | wizard.html `.opz-eg` | 14.5/600 | 2.71 | 2.89 |
| Cl-num «Lavoro» | scheda/pila `.cl-num small` | 12.5/800 | 2.71 | 2.89 |

**È l'intervento più importante.** Il maiuscoletto + tracking .14em aiuta la forma ma non il contrasto. `--faint` va **riservato al non-testo** (bordi dashed, chevron decorativi aria-hidden). Per tutti i ruoli-testo qui sopra:
- **Fix consigliato**: usare **`--muted`** (già AA: 5.1+/6.1+). Le caption maiuscole in muted restano leggibili e nettamente distinte dai valori ink.
- In alternativa, se si vuole mantenere una terza gerarchia più chiara del muted, **ridefinire `--faint` a ~#7A6E5E (light) / ~#928778 (dark)** così da superare 4.5 su bg e card. (Con l'attuale valore non c'è scampo.)

Il `.callout` del disabled («Completa il controllo finale…») usa già `--muted` (5.10) — bene, tenerlo come modello.

#### V2 — Testo bianco sui gradienti verdi — FAIL (need 4.5, testo normale)
- **WhatsApp `.wa-btn`** (consegna.html), «Avvisa lo studio su WhatsApp» 17.5/800 bianco su gradiente `#2FBE68→#1F9E52`: **top 2.42 · bottom 3.46**. È una CTA grande e prominente — la peggiore del set. Visibile nello screenshot `consegna-390-dark`: il testo bianco «galleggia» sul verde chiaro.
- **PillFase «FATTA ✓»** (home/scheda `.pill-fase`) 14.5/800 bianco su `#269950→var(--green)`: light **top 3.65 / bottom 5.07** (media sotto soglia sulla metà alta); **dark: top 3.65 / bottom 2.27** (`var(--green)`=#34C468) — grave in dark.

**Fix consigliato NEI MOCKUP:**
- WhatsApp: scurire il gradiente a ~`#1F9E52→#157A3E` (bianco → ~4.7/6.0). Il verde resta «WhatsApp», il bianco diventa AA. Se il brand impone il verde chiaro, non basta un text-shadow per certificare AA: serve la faccia più scura.
- PillFase: **non usare `var(--green)`** come stop inferiore (in dark diventa #34C468, 2.27). Fissare un verde scuro costante, es. `#1F8A45→#14602C`, così regge in entrambi i temi.

#### V3 — PillStato/PillTempo rossa su card in DARK — FAIL (**4.10**, need 4.5)
`red #FF3B44` su red-tint α.14 **compositato sopra la card** `#211D18` = 4.10. Colpisce le PillTempo `fam-rossa` («Da ieri», «Oggi · 16:00») quando la pill sta dentro una CardLavoro in dark (768/1280 e liste). Sopra `--bg` invece è 4.53 (passa di poco). Le famiglie amber/green/blue dark passano (5.9/5.8/4.86).
**Fix**: in dark alzare l'alpha del `--red-tint` (es. .18–.20) **oppure** schiarire il rosso-testo dark a ~#FF5A61 sulla card. Verificare il ricalcolo dopo la modifica.

#### V4 — Testo a colore su `--bg-deep` in LIGHT — FAIL (red 4.27 · amber 4.32 · green 4.07)
I token colore sono tarati su card/bg (≥4.45) ma **scendono sotto 4.5 su `--bg-deep`** (#ECE6D9) in light. Caso concreto: **`.azione` «Sistemala ›» rossa nel `nav-foot` desktop** (home.html) siede su bg-deep → 4.27. Regola: **niente testo colorato su `--bg-deep` in light** (usare card, o scurire i token). In dark bg-deep è ok (5.5–8.8).

#### V5 — Anello CheckTondo «da fare» e bordi dashed — FAIL 1.4.11 **solo in LIGHT** (**1.76** su card, **1.57** su bg)
Il cerchio dashed `#CBC1B0` che segna la fase **da fare** (`.riga-fase .check`) e il bordo di `TileNuovo`/chip-nuovo sono quasi invisibili in light. Distinguere «fatta vs da fare» è un componente UI significativo (soglia 3:1). C'è ridondanza (fatta = fill verde + nome in 600 muted), ma l'affordance «cerchio vuoto tappabile» sparisce. **Nota**: `#CBC1B0` è fisso (nessun override dark in `_base.css`) → in dark sta su card scura a ~9:1, quindi il problema è **esclusivamente light**. **Fix theme-aware**: scurire il dashed a ≥3:1 in light (es. ~#8A7E6E su card) **senza** toccare il rendering dark, o introdurre un valore dedicato per tema. (Il `--faint` light attuale 2.71 non basta.)

#### V6 — Touch target: `.azione` «Sistemala ›» < 44px
La CTA d'allarme della home (riparare fattura scartata) è un `<a>` inline 14.5px senza area minima: altezza ~20px. È **critica e piccola**. Il resto del set è a norma. **Fix mockup/React**: garantire 44×44 (padding verticale + margin negativo, come `.link-quieto`).

#### Marginali (passano ma fragili — < 5:1, tenere d'occhio)
- Pill light su tint: red **4.65** · amber **4.75** · green **4.50** (esatto limite) · blue 5.37. Green è al filo: qualsiasi ritocco di tint lo fa cadere.
- `.annullo .a-sub b` verde-bold su green-tint light = **4.50** (esatto limite).
- TastoPrimario dark, bianco su `#FF3B44` = **3.52** (testo grande 21px → soglia 3:1, passa ma stretto); faccia alta `#F2263A` = 4.11.

---

### Note per il build React (non-fix mockup)

**Semantica / heading**
- Le **3 pile** della home sono `div` non interattivi: devono diventare `button`/`a` (aprono la pila) con **nome accessibile composto** = numero + label + sub (es. «2, da consegnare oggi, n.144 da ieri…»). Racchiuderle in `<ul><li>`.
- **NavDesktop `.voce`**: sono `div` — usare `<a>` con `aria-current="page"` su `.sel` (il colore/bg non basta per SR).
- **NotaDentista**: `<blockquote>` + `<cite>` per la firma.
- Heading order: home `h1` greeting ok; le caption card («IL LAVORO», «LE FASI») non sono heading — valutare `h2/h3` o `aria-label` sulla region, così lo screen reader naviga per sezioni.

**Nomi accessibili dei tasti-icona** — già buoni nei mockup: ☰ `aria-label="Tutto il resto"`, ‹ «Indietro», ⋯ «Altro», TastoPiù «Nuovo lavoro», wa-btn ha testo. Mantenere. Le `⋯`/`‹` nei `peek` sono giustamente in `aria-hidden`.

**Overlay (Sheet / DialogConferma)**: `role="dialog"` + `aria-label` già presenti. Aggiungere `aria-modal="true"`, **focus trap**, spostamento focus all'apertura (primo elemento o titolo), **Esc** per chiudere, **return focus** al trigger. Scrim click-to-dismiss anche da tastiera.

**aria-live**
- **«Consegnato!»**: annunciare l'esito (focus al titolo o region `aria-live="polite"`).
- **Avviso/toast §5.18**: successo `role="status"` (polite), errore `role="alert"` (assertive) — coerente con «l'errore non scompare da solo».
- **Countdown annullo «(9:47)»**: **NON** in una region live che aggiorna al secondo (spammerebbe lo screen reader). Renderlo `aria-hidden` e fornire un testo statico accessibile («puoi annullare per 10 minuti»); eventualmente annunci a intervalli larghi (es. 5 min / 1 min).

**Stato disabled**
- Il TastoPrimario disabled è **volutamente mai nascosto** (bene). Ma `--faint` su `--bg-deep` = 2.20 (light)/3.33 (dark): pur essendo il disabled **esente** da 1.4.3, per un 55enne il tasto-chiave della schermata deve restare leggibile. Consigliato `aria-disabled="true"` + `aria-describedby` verso il `.callout` (così lo SR legge il perché) invece di `disabled` nativo, e alzare un filo la leggibilità della faccia.

**Selezione / form**
- **Chips data** («Oggi/Domani/Lun 13/Scegli…»): sono una scelta singola → `role="radiogroup"` con `role="radio"`+`aria-checked`, o `aria-pressed`. Oggi la selezione è solo verde+check: va esposta programmaticamente. Salvataggio ottimistico → annunciare l'avvenuto cambio.
- **foto-strip**: scroll orizzontale accessibile da tastiera; ogni thumb, se apre un viewer, è un `button` con label; se decorativa, `aria-hidden`.

**Motion** — `prefers-reduced-motion`: disegno del check (450ms), bounce, coreografia «Consegnato!», slide-up sheet, corsa TastoPiù. Fornire fallback statico (lo spec cita già §8.1 press-fallback). La grana `mix-blend` è statica, ok.

---

### Raccomandazioni (in ordine di impatto)

1. **Bandire `--faint` dai ruoli-testo.** Sostituire con `--muted` (o ridefinire faint a ~#7A6E5E/#928778). Un solo intervento risolve ~10 pattern che oggi falliscono AA in entrambi i temi — il maggior guadagno di conformità del progetto.
2. **Scurire i due verdi con testo bianco** (WhatsApp `.wa-btn` e `.pill-fase`, quest'ultimo togliendo `var(--green)` come stop). Sono CTA/azioni, non decorazioni: devono passare 4.5:1 su tutta la faccia, dark compreso.
3. **Chiudere le fragilità di superficie**: red-tint dark (pill rossa su card 4.10→≥4.5), niente colore su `--bg-deep` in light, dashed «da fare» a ≥3:1, e 44px per «Sistemala ›». Poi, per il build: focus trap sugli overlay, `aria-live` corretto su Consegnato/toast e **countdown non-live**, pile/nav come elementi realmente interattivi.

**Presbiopia**: fissato il contrasto, il floor tipografico è accettabile ma tirato. Le caption-chiave a **12.5px** (DENTISTA/PAZIENTE, che sono le etichette-identità dei dati) sono il minimo tollerabile per un 55enne **solo** se passano a `--muted`; a parità di sforzo, valutare un floor a **13px** per `.riga-dato .chiave` e `.card-title`. I corpi grandi (numeri/valori/nomi) sono ottimi, nessun intervento.
