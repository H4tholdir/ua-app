# Decisione — Un solo fondo pagina in tutta l'app (26/07/2026)

**Ratificata da:** Francesco, verifica finale wave H.
**Origine:** verbale QA `2026-07-24-qa-device-meta-ondata.md`, APPEND 26/07, **difetto 3b**.
**Stato:** RATIFICATA e implementata. Sostituisce i valori di fondo v2.3 della spec
`docs/superpowers/specs/2026-05-27-design-system-v2-3.md`.

## Il difetto

Sul telefono, la banda dietro la barra gesture Android è di un tono leggermente più scuro dello
sfondo dell'app. Parole di Francesco: «c'è una piccola striscia leggermente più scura di sfondo,
non si può ottenere dello stesso colore del nostro sfondo della pwa?» — con riferimento alle app
di sistema Android, dove quella barra è trasparente e lascia vedere il contenuto sotto.

## La causa, misurata

Nell'app convivevano **due fondi pagina**:

| | chiaro | scuro | dichiarato in |
|---|---|---|---|
| v2.3 (legacy) | `#DDD8D3` | `#1A1916` | `globals.css` (`--bg`), dipinto sul `body` |
| v3 | `#F4F0E7` | `#171411` | `ds-v3.css` (`--bg`), scoped `[data-ds="v3"]` |

L'`<html>` non ha sfondo proprio su nessuna rotta v3 (misurato: `htmlBg: rgba(0,0,0,0)`), quindi
lo sfondo del `body` — cioè quello **v2.3** — si propaga alla tela del browser, inclusa l'area
sotto la barra di sistema. Lì affiorava `#DDD8D3`: 19 punti per canale più scuro della superficie
v3 sopra. Esattamente il gradino descritto.

`viewport-fit: cover` era già impostato (`layout.tsx`); `themeColor: '#D90012'` colora la barra
URL in alto, **non** la barra gesture — non era la leva.

## Cosa è stato deciso

**Un solo fondo in tutta l'app:** i token v2.3 si allineano ai valori v3
(`#DDD8D3 → #F4F0E7` in chiaro, `#1A1916 → #171411` in scuro).

Il valore vive in **tre** posti, che si muovono insieme — scoperta della verifica, non era noto:

1. `src/app/globals.css` — `--bg` (`:root` e `.dark`): il fondo di tutte le pagine v2.3.
2. `src/app/globals.css` — `--ua-bg` (`.login-root`, chiaro e scuro): la schermata di accesso
   porta una **copia propria** della tavolozza legacy. Senza questa, la prima schermata che si
   vede aprendo l'app sarebbe rimasta del vecchio colore mentre tutto il resto cambiava.
3. `src/app/admin/admin.css` — `--adm-bg` (chiaro e scuro): area amministrativa.

Allineato anche `src/design-system/tokens.ts` (specchio TS dei token v2.3) e i 32 fallback
`var(--bg, #DDD8D3)` sparsi nel sorgente: un ripiego che dichiara un colore diverso dal token è
codice che afferma due cose.

## Il costo, misurato e ACCETTATO

La riserva è stata sollevata **prima** della ratifica, con evidenza visiva alla mano
(`docs/design/screenshots/2026-07-26-sfondo-globale/`, 92 screenshot su 8 pagine legacy ×
390/768/1280 × light/dark). Francesco ha confermato la scelta dopo averla vista.

**In chiaro, sulle pagine ancora v2.3, il rilievo delle card si perde.** Non è il rapporto di
contrasto a peggiorare — quello sale — è il **segno** che si ribalta:

| Superficie | contrasto prima → dopo | segno (card − fondo) | esito |
|---|---|---|---|
| `--sfc` `#E4DFD9` (card standard) | 1,069 → 1,165 | **+0,0509 → −0,1304** | si ribalta: da rilevata a incassata |
| `--elv` `#EDEDEA` (pill, pannelli) | 1,207 → 1,031 | +0,1533 → −0,0281 | riempimento quasi piatto |
| `--prs` `#D4CFC9` (campi incassati) | 1,094 → 1,361 | −0,0635 → −0,2448 | ✅ più stacco |
| `--primary` `#D90012` (bottoni) | 3,748 → 4,664 | invariato | ✅ più stacco |

L'ombra `--sh-c` è costruita sul presupposto che la card sia più chiara del fondo; il suo alone
bianco (`rgba(255,255,255,.72)`) scende da 1,290 a 1,098 di contrasto sul fondo, quindi su una
pagina così chiara il riflesso non si legge più. Si aggiunge uno stonare di tinta: il fondo è
panna caldo, la card grigia è fredda — sul vecchio fondo appartenevano alla stessa famiglia.
Il caso più evidente è la lista lunga (`clienti-lista-densa-390-light-*`).

**In scuro il cambio è quasi impercettibile:** scostamento medio 2,51/255 contro 12,81/255 in
chiaro, nessun segno che si ribalta.

**Sui testi: zero peggioramenti e zero nuove violazioni WCAG.** Tutto il testo appoggiato al
fondo migliora (titoli 12,36 → 15,39; secondario 7,39 → 9,20; il caso più stretto, «Sicurezza»
a 10px, 4,53 → 5,64, sopra AA).

### Recupero del rilievo — NON fatto qui
Il rilievo si recupererebbe schiarendo anche `--sfc` (e `--elv`) sopra il nuovo fondo. È un
intervento **separato**, deliberatamente non incluso: cambia il linguaggio materico della v2.3 e
va deciso a parte, guardandolo. Annotato per Francesco.

## Alternativa scartata (per memoria)

Regola mirata `html[data-ds-route="v3"] body { background: #F4F0E7 }` — dà la banda del colore
giusto sulle sole rotte v3 senza toccare le pagine legacy. **Provata e funzionante** (body al
panna su `/dashboard`, nessun cambiamento su `/clienti`, token legacy intatto). Scartata da
Francesco a favore del fondo unico, che chiude anche la disomogeneità fra le due generazioni di
pagine invece di mascherarla su una sola superficie.

## Verifica

`npx tsc --noEmit` 0 errori · `npx vitest run` 3078 verdi / 19 skip · `npx next build` ok.
Nessun test guardava i valori cambiati (verificato: nessun riferimento a `#DDD8D3` in `tests/`).

## Conseguenze documentali

- La spec `2026-05-27-design-system-v2-3.md` riporta ancora `--bg: #1A1916`: da allineare.
- La spec `2026-05-22-dashboard-v2-redesign.md` riporta `#1A1916` come «carbonio warm»: idem.
- `CLAUDE.md` §8 elenca come non-migrate a v3 anche `/tecnici` e `/cassette`, che invece **sono
  già v3** (sondato il DOM: montano `data-ds="v3"`). Da correggere.

## Fuori scope, emerso misurando (violazioni WCAG PREESISTENTI, non causate da qui)

- `/analytics`: `#D4A843` come **testo** a 28px → **1,67:1**. Viola una regola scritta del
  progetto (`CLAUDE.md`: «MAI `--gold` come testo»).
- Bottoni oro con testo bianco (`/impostazioni`, `/impostazioni/profilo`, `/clienti/[id]`): ~2,2:1.
- `/qualita/psur`: alert blu e arancio su tinta chiara, 2,4-2,1:1 (migliorano col cambio, restano
  insufficienti).
- `/impostazioni`: badge ambra `#F59E0B` a 12px, 1,62:1.

## Nota sugli screenshot (trappola registrata)

`.gitignore:58` ignora `*.png`: gli screenshot storici del progetto sono stati aggiunti con
`git add -f`, e un normale `git add -A` li **salta in silenzio**. Nel repo sono stati messi i
soli fotogrammi citati sopra (`clienti-lista-densa`, `clienti`, `analytics`, `login`, tutti a
390 light) più il prima/dopo dei fix 1a/1b: il set completo dei 92 resta su disco nel worktree,
in `docs/design/screenshots/2026-07-26-sfondo-globale/`. Chi rigenera la cartella deve
ricordarsi il `-f`, altrimenti la crede committata e non lo è.

## Ri-misura dei token con affermazioni di contrasto (26/07, dopo il cambio di fondo)

Sei commenti di `globals.css` dichiaravano un rapporto di contrasto misurato contro il **vecchio**
fondo. Ri-misurati tutti sul nuovo; **nessuno era diventato insicuro — tutti hanno guadagnato**,
ma il numero scritto non era più quello vero, e un'affermazione che non corrisponde più al
render è la stessa classe di difetto del `padding` sovrascritto in cascata. Corretti in questo
stesso giro (solo commenti, zero effetto sul comportamento):

| token | dichiarava | su card `--sfc` (invariata) | su fondo NUOVO |
|---|---|---|---|
| `--t1` `#1C1916` | 12,4:1 su `--bg` | — | **15,39:1** |
| `--t2` `#4A3D33` | 7,4:1 su `--bg` | — | **9,20:1** |
| `--t3` `#6B5C51` | 4,5:1 su `--bg` (al pelo) | — | **5,64:1** |
| `--c-amber-ink` `#92400E` | 5,01:1 «su tinta ambra chiara» | 5,35:1 | **6,23:1** |
| `--c-orange-ink` `#9A3412` | ~5,5:1 «su --sfc chiaro» | 5,52:1 | **6,42:1** |
| `--red-ink` `#B00010` | 5,6:1 «su --sfc light» | 5,56:1 | **6,47:1** |

Nota: il 5,01 di `--c-amber-ink` coincide **esattamente** col valore sul vecchio `#DDD8D3` —
conferma che quei numeri erano tarati sul fondo pagina di allora, non sulla tinta citata nel
commento. I commenti ora dicono su quale superficie vale ciascun numero.

## Residuo trovato al collaudo device (26/07, dopo il rientro di Francesco)

`public/manifest.json` portava ancora `"background_color": "#DDD8D3"` — il **vecchio** fondo.
È il colore della schermata di avvio della PWA **installata**: sarebbe rimasto un lampo del
tono vecchio a ogni apertura dell'app da icona, mentre tutto il resto è passato al panna.
Sfuggito al censimento perché la ricerca era stata fatta su `src/`, e il manifest sta in
`public/`. **Allineato a `#F4F0E7`.**
Lezione: i tre posti dichiarati sopra erano tre di quattro. Il quarto è il manifest.
