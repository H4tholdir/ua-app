# Advisor 06 — DS/Frontend Engineer · Mockup «Il cuore» Ondata 0 → React Ondate 1-4

Parere indipendente nella prospettiva di chi trasformerà i 6 mockup in componenti React.
Base letta: `_base.css` + README + i 6 mockup (CSS di pagina di TUTTI) + i 27 componenti in
`src/components/ds/` + `src/design-system/v3/tokens.ts` + `src/app/ds-v3.css` + spec madre
`2026-07-07-design-system-v3-una-cosa-alla-volta.md` §3-§9 (in particolare il catalogo §5) +
`scripts/screenshot-mockups.mjs`. Non ho modificato nulla (worktree in sola lettura).

---

## Giudizio complessivo (implementabilità: 8/10)

Materiale di partenza **notevolmente pulito**. I mockup non sono bozze: ogni valore è citato a §,
il cast è identico su tutte le schermate, i 3 viewport × 2 temi sono cablati con regimi
non-sovrapposti (una sola sezione visibile per screenshot), la disciplina anti-slop è rispettata
(zero Inter, zero viola, rosso di legge, dark flat). Soprattutto: **~20 dei ~26 componenti §5
esistono già** in `src/components/ds/` (sottoprogetti 1-2 chiusi, catalogo approvato) e i mockup
li rispecchiano fedelmente. `_base.css` è per dichiarazione propria un **mirror mockup-only** dei
componenti spediti (token copiati verbatim da `ds-v3.css`), non una fonte concorrente.

Il voto non è più alto per tre motivi, tutti **decidibili prima di scrivere**, nessuno un rewrite:
1. una **dualità route↔pannello** non ancora risolta (mobile = navigazione, desktop 1280 =
   3 pannelli co-visibili) su un App Router che **non ha ancora route parallele**;
2. un **gate di processo** della spec (§ riga 435: «un componente non in spec = review respinta»)
   che impone di aggiungere una sezione §5.x e farla approvare da Francesco **prima** di scrivere
   ognuno dei ~8 pattern realmente nuovi;
3. gli stati non-happy (vuoto/loading/liste lunghe/undo timer) che i mockup non esercitano.

Nota che tiene onesto il voto: `tutto-il-resto` mappa 9 sezioni su route `(app)` **già esistenti**
(clienti, fatture, magazzino, agenda, qualita, tecnici, listino, rete, impostazioni). Le Ondate 1-4
sono quindi **una nuova shell + il "cuore"** (home/pile/wizard/scheda/consegna/nav) sopra pagine
foglia in gran parte già costruite — non una riscrittura dell'app.

---

## Ciò che è già pronto

- **Il grosso del catalogo §5** come componenti React spediti e approvati: TastoPrimario, TastoPiu,
  TastoSecondario, TastoTondo, PillFase, Pill (PillStato/PillTempo), PillVoce, LinkQuieto,
  CardLavoro (con `onConsegna`/TastoConsegnaInline interno), CardInfo/RigaDato, RigaFase, TileScelta,
  Sheet, DialogConferma, Avviso, StrisciaStato, NotaDentista, CardUAHaFatto, Pila, RigaCerca, Campo,
  Avatar, RigaAgenda, BarraMateriale, EroeTuttoAPosto, Caricamento, Vuoto.
- **Pipeline token e materia**: `tokens.ts` + `ds-v3.css` sono coerenti col mockup; TastoPiu e
  PillVoce hanno già la loro fonte-di-verità visiva verbatim (`.tpB`/`.pvA`), i mockup non driftano.
- **Motion policy** già rispettata dai componenti (`molla.press`, `cssEase.*` in `v3/motion.ts`):
  le transizioni `120ms cubic-bezier(0.32,0.72,0,1)` inline dei mockup hanno già il loro token.
- **Dark mode** risolto strutturalmente (elevazione = superficie, `--sh-*` → `none`, `border-top`
  a luce radente); i mockup gestiscono i casi limite (liste box-shadow multi-valore) come i componenti.
- **Screenshot pipeline** (`screenshot-mockups.mjs`): 3vp×2temi + `fonts.ready` + strip del chrome
  + assert no-scroll — meccanismo sano e riusabile.
- **La 1280 "Tutto il resto" è già risolta**: non è una pagina, è la nav; il mockup lo dichiara.

---

## Inventario componenti

Mappato per **ruolo/comportamento** contro i 27 file (non per classe CSS, per non gonfiare la
colonna "nuovo"). Colonna "Riconciliare" = divergenza numerica tra mockup e componente/spec.

| Componente (ruolo) | Esiste già? | Nuovo (serve §5.x + approvazione) | Fork/drift da riconciliare |
|---|---|---|---|
| TastoPrimario `.tasto-primario` | ✅ TastoPrimario.tsx | — | ombra ambiente: wrapper (React) vs box-shadow multi-valore (mockup) → usare il pattern React |
| TastoPiu `.tp` | ✅ TastoPiu.tsx | — | nessuno (verbatim `.tpB`) |
| TastoSecondario `.tasto-secondario` / `.conferma` | ✅ TastoSecondario.tsx | — | `.conferma` = solo width page-local |
| TastoTondo `.tasto-tondo` | ✅ TastoTondo.tsx | — | — |
| PillFase `.pill-fase` | ✅ PillFase.tsx | — | **padding 18 (mockup) vs 24 (React)** — §5.4 tace |
| PillStato/PillTempo `.pill.*` | ✅ Pill.tsx | — | usare le props, non ri-derivare `.fam-*`/`.tempo` a mano |
| LinkQuieto `.link-quieto` | ✅ LinkQuieto.tsx | — | — |
| TileScelta `.tile-scelta` | ✅ TileScelta.tsx | — | variante **avatar Ø60** vs **glifo 64**: la slot avatar va aggiunta come prop |
| RigaCerca `.riga-cerca` | ✅ RigaCerca.tsx | — | — |
| Campo `.campo-*` | ✅ Campo.tsx | — | — |
| CardLavoro `.cl-*` / `.top/.num` | ✅ CardLavoro.tsx | — | **3 valori per lo stesso componente**: home 10/2 · pila-aperta+scheda 12/3 · React gap 8 → §5.8 tace → almeno 2 su 3 vanno scartati |
| TastoConsegnaInline `.consegna-inline` | ✅ interno a CardLavoro | — | **radius 16 vs 20** · **corsa 5px vs 4px** · **tracking .06 vs .04** — §5.8 tace |
| CardInfo/RigaDato `.card`+`.riga-dato` | ✅ CardInfo.tsx | — | **DRIFT vs SPEC**: mockup usa `.card` (24 · 20/22); §5.10 impone CardInfo **22 · 4/20** → fix mockup |
| RigaFase `.riga-fase`/`.check` | ✅ RigaFase.tsx | — | — |
| Sheet `.sheet`/`.scrim` | ✅ Sheet.tsx | — | `.sheet-stage`/`.peek`/`position:absolute` = **scaffolding mockup-only**, non componenti |
| DialogConferma `.dialog` | ✅ DialogConferma.tsx | modo "conferma azione desiderata" | **deroga §5.17**: primario SOPRA + `occhiello 16.5 + oggetto 21/800` invece di `titolo 21/800`, ordine invertito |
| Avviso `.avviso` | ✅ Avviso.tsx | — | non esercitato nei mockup |
| StrisciaStato `.striscia` | ✅ StrisciaStato.tsx | — | — |
| NotaDentista `.nota` | ✅ NotaDentista.tsx | — | — |
| CardUAHaFatto `.ua-fatto`/`.ua-riga` | ✅ CardUAHaFatto.tsx | — | **radius 24 (mockup `.card`) vs 22 (§5.22)** → fix mockup; riga "attesa" (orologio ambra) = variante nuova |
| Pila `.pila` | ✅ Pila.tsx | — | — |
| **Header-morph `.morph`** | — | ✅ (§4.1/§8.3.1) | card-pila → testata; il morph vero è animazione shared-element |
| **Schermata Fatto!/Consegnato! `.fatto-*`** | parziale (EroeTuttoAPosto ≠) | ✅ | composito celebrazione §8.3.4 (check che si disegna + suono UÀ + cascata) |
| **WhatsApp `.wa-btn`** | — | ✅ + **nuovo token** | gradiente `#2FBE68→#1F9E52` corsa `#14602C` **assente da `tokens.ts`** |
| **Bloccante precheck `.bloccante`** | — | ✅ (§8 ramo rosso) | riga ambra tappabile (cosa + azione + chev) |
| **Chip scelta rapida `.chip`** | — | ✅ (§5.27 data/consegna) | usato in wizper + sheet data — è l'UI del CampoData |
| **Progress dots `.dots`** | — | ✅ (§7.3) | 11px · attivo 30px rosso · fatti verdi |
| **Foto-strip `.foto-strip`/`.foto-thumb`** | — | ✅ (§7.4) | thumb 72 · radius 12 · 1 riga scroll |
| **Menu ⋯ `.menu-voce`** (contenuto sheet) | — | ✅ (§7.1) | righe H56 + "Butta via" rossa → DialogConferma |
| **Grp-tab desktop `.grp-tab`** | — | ✅ (§4.1) | tab raggruppamento 1280 con count colorato |
| **Nav desktop `.nav-desk`/`.voce`/`.badge`** | — | ✅ (§12.3) | shell laterale 240px |
| Banner annullo `.annullo` (§9) | — | page-local | undo 10 min + countdown |
| Card-sezione `.sez` (tutto-il-resto) | riusa CardUAHaFatto? (§5.22) | page-local | riga-sezione con emoji (licenza §4.4) |

**Da NON trasformare in componenti** (scaffolding dei mockup, dichiarato tale nei commenti):
`.frames`, `.frame-sep`, `.sheet-stage`, `.peek`, `.stage`, `.single`, `.split`, i trucchi
`position:absolute`, `.toggle-tema`, `.grain` (già `ds-grana` in `ds-v3.css`).

---

## Rischi per le Ondate 1-4

1. **[TOP] Dualità route↔pannello — decisione fondativa, non differibile.**
   Su mobile home → pila-aperta → scheda sono **route separate** (navigazione); su desktop 1280
   sono **pannelli co-visibili** (nav 240 + lista 400 + scheda). Ho verificato: **nessuna route
   parallela (`@folder`) esiste** in `src/app`. Riconciliare "route su mobile, pannello su desktop"
   (route parallele con default slot · master-detail client con shallow routing · intercepting
   routes) **plasma l'intero albero di route** e va deciso PRIMA di qualunque componente. È il
   primo bivio React, prima ancora del design dei componenti.

2. **Gate di processo sui componenti nuovi (§ riga 435).** «Se manca un componente → si propone QUI
   (nuova sezione §5.x con anatomia completa) PRIMA di scriverlo. Un componente non in spec = review
   respinta.» Gli ~8 pattern nuovi (morph, wa-btn, bloccante, chip, dots, foto-strip, menu-voce,
   grp-tab, nav-desk) **non sono solo work item: ognuno richiede un emendamento alla spec approvato**.
   Se le Ondate partono senza, la review li respinge a valle.

3. **Prerequisito token (WhatsApp).** `.wa-btn` usa un gradiente riservato da §3.3.4 che **non è in
   `tokens.ts`**. La schermata "Consegnato!" non è scrivibile finché non si aggiunge il token — è un
   prerequisito di pipeline, non un dettaglio di componente.

4. **Vocabolario PillStato non ratificato.** "In prova" (scheda F5) e "Fermo" (pila ambra) sono
   flaggati **nei commenti stessi dei mockup** come estensioni in attesa del gate Task 8; §5.9
   dichiara il set chiuso e §117 vieta un quinto colore. Da ratificare prima di renderli.

5. **Drift geometrico enumerato (economico ma va sciolto).** CardInfo e CardUAHaFatto renderizzati
   con `.card` (24 · 20/22) invece di 22 (§5.10 4/20 · §5.22) → **fix del mockup**. CardLavoro con
   3 spaziature diverse, PillFase 18 vs 24, ConsegnaInline 16/5/.06 vs 20/4/.04 → **riconciliazioni**
   (default: componente spedito canonico, salvo che l'approvazione visiva del mockup lo superi).
   Direzione della verità non risolvibile dal file dove §5 tace: il mockup è più recente (07-09) ed
   è ciò che Francesco approva a vista → può essere una correzione intenzionale del componente.

6. **Stati non-happy da progettare una volta sola.** La **home a 100vh no-scroll assume esattamente
   3 pile non vuote**: che succede con una pila a 0 o un 4° raggruppamento? Il layout ad altezza
   fissa è fragile qui. **Liste lunghe** (pila-aperta mostra ≤5, il reale può essere 50) →
   virtualizzazione. **Undo consegna (§9)**: il countdown "(9:47)" è un timer client su verità
   server (outbox+cron) — decidere ora se è cosmetico o riconciliato al reload dentro la finestra.

7. **CSS di pagina come debito potenziale.** Il drift attuabile non vive in `_base.css` (mirror
   dichiarato) ma nei **`<style>` di pagina**, dove ogni schermata ri-deriva valori di componenti già
   spediti (es. `.consegna-inline`, `.pill-fase`, `.morph`, `.cardlav .cl-*`). In React vanno chiamati
   i componenti con le loro props, non ricopiati.

---

## Decisioni da prendere PRIMA del primo piano React

1. **Architettura route↔pannello desktop** (route parallele vs master-detail client vs intercepting).
   Blocca l'intero albero `src/app` del "cuore". Vedi rischio 1.
2. **Ratificare gli ~8 componenti nuovi come sezioni §5.x** (morph, wa-btn, bloccante, chip, dots,
   foto-strip, menu-voce, grp-tab, nav-desk) con anatomia completa + approvazione Francesco. Senza,
   la review a valle li respinge (§ riga 435).
3. **Sciogliere i drift numerici** contro §5 e l'approvazione visiva: (a) fix mockup su CardInfo 22/4-20
   e CardUAHaFatto radius 22; (b) canonizzare una sola spaziatura CardLavoro; (c) decidere
   ConsegnaInline (16/5/.06 mockup vs 20/4/.04 componente) e PillFase padding (18 vs 24).
4. **Aggiungere il token WhatsApp** (`gradiente.whatsapp` + corsa) a `tokens.ts` — prerequisito di
   "Consegnato!".
5. **Ratificare/rifiutare il vocabolario PillStato esteso** ("In prova", "Fermo").
6. **Ratificare la deroga DialogConferma §5.17** (azione desiderata: primario sopra, occhiello+oggetto)
   come modo esplicito del componente, non come one-off.
7. **Congelare i contratti degli stati non-happy** (home con N≠3 pile · liste lunghe/virtualizzazione ·
   timer undo cosmetico vs server-truth) prima che vengano progettati due volte.

---

## Raccomandazioni

- **Ordine di attacco Ondata 1**: prima la decisione route↔pannello e la shell (nav-desk + layout
  responsive 240/400/1fr), poi la Home (Pila esiste; serve solo morph + StrisciaStato + TastoPiu già
  pronti), perché sblocca il pattern master-detail per pila-aperta e scheda.
- **Un solo PR "spec amendment §5.x"** che introduce in blocco gli ~8 componenti nuovi + il token
  WhatsApp, approvato prima di aprire i PR di implementazione. Evita il respingimento a valle.
- **Riconciliare il drift alla fonte, non nei componenti**: dove il componente spedito ha già il
  valore (ConsegnaInline, PillFase, CardLavoro spacing), correggere il **mockup** verso il componente
  e allineare la spec dove tace; dove il mockup corregge il componente per approvazione visiva,
  aggiornare il componente **e** la spec, mai lasciare due valori vivi.
- **Portare la screenshot pipeline a regime come visual regression sui componenti React.** Il
  meccanismo (`screenshot-mockups.mjs`: 3vp×2temi, `fonts.ready`, strip del chrome, assert
  no-scroll) è già corretto: cambia solo il target da `file://` alla route in esecuzione, e
  **`ds-v3-catalogo` esiste già come harness naturale** (montare lì ogni componente/stato). Vale
  l'investimento: il sistema ha molte varianti tema×viewport×stato che una diff visiva protegge meglio
  degli unit test.
- **Non componentizzare lo scaffolding dei mockup** (`.sheet-stage`, `.peek`, `.frames`, `position:
  absolute`): Sheet/DialogConferma reali gestiscono già portal e fixed positioning.
- **Motion**: ogni tempo dei nuovi componenti passa da `v3/motion.ts` (`molla.press`, `cssEase.*`,
  `bouncy`/`snappy` per check e Consegnato! §8.3.4). Nessun `120ms`/`cubic-bezier` inline nel React.
