# Handoff — «Un tema solo, e la barra lo segue» (26/07/2026, sera tardi)

**Per:** la sessione successiva.
**Prima di tutto:** BP-0 — `memory/MEMORY.md`, voci **45**, **46**, **47**.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md`
§0D) · **Regola Advisor** (panel 2-3 prima di ogni decisione significativa) · **mockup PRIMA del
codice** (§0B) · **BP-2**.

**Sostituisce** `2026-07-26-chiusura-collaudo-pwa-handoff.md` come punto di ripresa. Di quello
restano validi il **punto 1** (linguetta stretta) e il **punto 3** (centro notifiche, ULTIMO).

---

## 0. In una riga

La voce **A5** non esiste più come «che colore mettere»: è diventata **una relazione in tre tappe**,
di cui **due sono in produzione e verificate**. Resta la tappa 3 — la regola unica del tema — con il
piano scritto e il primo passo già fatto sul ramo. **I due appunti di Francesco sul collaudo sono
chiusi come conoscenza: nessuno dei due è nostro, e si chiuderanno entrambi con la stessa correzione
di Chrome.**

---

## 1. ✅ FATTO E IN PRODUZIONE

| Tappa | Merge | Che cosa |
|---|---|---|
| **1 — il meccanismo** | `03ec7595` | La barra di stato segue **dal vivo** il tema risolto. Nuovo `src/design-system/colore-barra-sistema.ts` (nessun hex, deriva dai token v3, **valida** i propri valori) · `ThemeInitializer.tsx` esporta `SCRIPT_TEMA`, fa **upsert** sui meta e osserva `data-theme` · `layout.tsx` **non dichiara più** `themeColor` |
| **2 — avvio e offline** | `850e3f26` | `manifest.json` `theme_color` → `#F4F0E7` (ora coincide con `background_color`: si vedono **insieme** nello splash) · `offline.html` al fondo unico **con blocco scuro che prima non esisteva** · guardia `tests/unit/un-tema-solo-e-la-barra-lo-segue.test.ts` (10 controlli, con **controprova**) |

**Suite 3319 verdi / 19 skip · tsc 0 · build ok · verificato live su `uachelab.com`.**

### 🎯 La prova sul device è passata, e ha chiuso una lacuna documentale

Parole di Francesco (26/07, 19:28): «la barra ha cambiato colore, in modo corretto e in base alla
sezione del tema cambia colore in automatico».

**Questo ha stabilito empiricamente ciò che nessuna fonte diceva:** il meta `theme-color` **è
onorato nelle PWA installate su Android, anche mutato a runtime**. L'intent Chromium nominava
«installed PWAs **on Desktop**» e «all websites **on Android**» — non il nostro caso (§3.3 della
ricerca). Ora è misurato su Android 16 / Chrome 150.

---

## 2. ✅ I DUE APPUNTI DI FRANCESCO — chiusi come conoscenza, **non** come lavoro

Ricerca completa: `docs/roadmap/2026-07-26-ricerca-barre-pwa-android.md` **§9**.

**(a) La fascia sotto la barretta dei gesti** segue il **color scheme di SISTEMA**, non l'app —
accertato **sul device**: col telefono in scuro diventa scura. 🎯 **La decisione D4 la rende coerente
per costruzione**: la discrepanza sopravvive solo per chi blocca il tema divergente dal telefono,
cioè per scelta dichiarata.

**(b) La strisciolina fra barra di stato e contenuto (`#dbd7cc`) NON è nostra.** Verificato: quel
colore non compare in `src/` né `public/`; è `#F4F0E7` scurito del ~10% **uniformemente sui tre
canali** (un **velo**, non un colore scelto); zero `border-top` globali, zero `box-shadow` sul primo
elemento, **zero `safe-area-inset-top` in tutto `src/`**. **In scuro è più chiara del fondo** → si
inverte col tema: firma di un elemento disegnato **dal sistema** per il contrasto.
🛑 **Non è il bug 421933373**: quello mostrerebbe il `theme_color` del manifest, ancora **rosso** sul
device al momento delle catture — si sarebbe vista rossa.

🎯 **Le due si chiudono con LA STESSA CORREZIONE:** l'edge-to-edge per le PWA installate («short-edges
cutout mode», cambi «newly landed» su Gerrit, **nessuna data**), che è **lo stesso lavoro del bug
407420295** del §2.6. Le due condizioni — `display: standalone` + `viewport-fit=cover` — **le
dichiariamo già**: arriverà senza modifiche.

⚠️ **Non dimostrato, e va detto così:** la fonte parla di «strip» (la fascia intera), la strisciolina
è il suo **bordo**. Molto probabile ma non provato, e **non verificabile sul device oggi**.

### 🛑 La trappola: non sono due eventi, è UNO

Il giorno in cui Chrome accende l'edge-to-edge, **insieme** alla cosa bella arrivano:

- i **28 `env(safe-area-inset-bottom)`** che oggi valgono 0 si accendono **tutti insieme, in
  produzione**, senza che nessuno abbia toccato niente;
- `safe-area-inset-top` diventa non nullo e **nessuna intestazione lo padda** → il contenuto
  scivolerebbe **sotto l'orologio**.

📌 **Vanno preparati PRIMA.** Verifica a costo zero: **rimisurare `safe-area-inset-top/bottom` sul
device dopo ogni aggiornamento maggiore di Chrome.** Se diventano ≠ 0, la correzione è arrivata.

---

## 3. 🔨 DA FARE — tappa 3, la regola unica

**Piano:** `docs/superpowers/plans/2026-07-26-tappa-3-un-tema-solo.md` — 7 task.
🛑 **Il piano e il Task 1 vivono SOLO sul ramo `worktree-un-tema-solo`, non su `main`.**

| Task | Stato |
|---|---|
| 1 — `src/lib/preferenze/tema.ts` (tre stati, chiave `ua-tema`, `risolviTema`) | ✅ **fatto**, 6 test verdi, commit `1fcbcac6` |
| 2 — lo script inline passa alla chiave nuova e **cancella** `ua-theme` | ⬜ **si riparte da qui** |
| 3 — `useTheme` a tre stati (via `toggle` e `isDark`) | ⬜ |
| 4 — `SceltaTema` in Impostazioni (variante **A** ratificata) | ⬜ |
| 5 — bonifica dei 5 punti di accesso + auth + `blocked`/`billing` + toast + `offline.html` | ⬜ |
| 6 — guardia del censimento | ⬜ |
| 7 — verifica, QA, gate estetico L2, deploy, BP-1 | ⬜ |

### Vincoli che non si possono perdere

- 🛑 **Task 4 e Task 5 nello stesso deploy.** Rimuovere gli interruttori prima che l'opzione esista
  lascerebbe un intervallo in cui il tema si cambia solo da `localStorage`.
- 🛑 **`/impostazioni` è DS v2.3**, non v3: token da `src/design-system/tokens.ts`, stile inline con
  `var(--x, fallback)`, anatomia copiata da `SceltaHome.tsx`. **MAI** componenti v3 lì (regola di
  convivenza §14).
- 📌 **D8 ratificata:** variante **A** (righe col pallino) **+ frase di stato**. Francesco preferisce
  la forma **B** (tre pulsanti), ma **B esiste già pronta in v3** (`ChipScelta`) e in v2.3 andrebbe
  ricostruita a mano e **buttata** alla migrazione: arriverà **gratis** con l'ondata v3 di
  `/impostazioni`. Mockup e catture: `docs/design/mockups/2026-07-26-tema-impostazioni.html`.
- ⚠️ **`blocked` e `billing` sono UI NUOVA, non pulizia:** prendono una resa **mai esistita** (la
  sospensione in chiaro, l'abbonamento in scuro) → workflow §0B **su queste due specificamente** e
  gate estetico L2 prima del merge.
- ⚠️ **`public/offline.html` legge la chiave del tema:** va aggiornato a `ua-tema` **nello stesso
  lavoro**, o la pagina del momento peggiore si sfasa in silenzio. Il commento nel file lo avvisa.

### Due cose trovate fuori mappa dalla code review, da chiudere in tappa 3

1. **Metà del CSS è agganciata a `.dark`, metà a `data-theme`.** Solo `useTheme.applyTheme` e lo
   script inline muovono **entrambi**; `admin-nav.tsx:36,44` e `ds-v3-catalogo/page.tsx:172,174`
   muovono **solo l'attributo**. Su `/admin` c'è una **corsa reale** fra `ua-theme` e
   `ua-admin-theme`: la barra **lampeggia** dopo l'idratazione.
2. **`portale/[token]/layout.tsx:15`** ha un fondo `#F8F9FA` cotto a mano ed era **fuori dal
   censimento**: è la pagina che vede **il dentista**, non l'odontotecnico.

---

## 4. Cosa resta aperto oltre a questo, in ordine

1. **Il resto della roadmap**, a partire da **nome+cognome del paziente nel wizard** (sei proposte
   già disegnate, in attesa della scelta di Francesco).
2. **Punto 1 dell'handoff precedente — la linguetta stretta**, stato `piena`: 18px di respiro
   ratificati nel mockup contro `padding: 0` spedito (`ds-v3.css:1613`). 🛑 **Non abbassare
   `min-height` da 96 a 78**: sistemerebbe il filo, di cui nessuno si è lamentato.
3. **Centro notifiche: ULTIMO**, per decisione esplicita di Francesco.
4. **Voci di backlog aperte dalla spec** (§10): `color-scheme` mai dichiarato in tutto `src/` ·
   `safe-area-inset-top` mai usato · iOS (`appleWebApp.statusBarStyle`) · `--bg-deep` sotto la barra
   (da **misurare**, non assumere) · `next-themes` forse rimuovibile dopo la bonifica di `sonner.tsx`.
5. **Difetto latente vivo:** `PareteClient` chiama `router.refresh()`; con l'URL spinto a `/cassette`
   dal pager quei refresh rifanno il fetch della **rotta vera** dentro la home
   (`StanzePager.tsx:283-285`).

---

## 5. Base di lavoro

- **`main` è a `9927da61`**, pulito, in produzione, CI e CD verdi.
- **Ramo `worktree-un-tema-solo`** in `.claude/worktrees/un-tema-solo`, **2 commit avanti su `main`**
  (il piano della tappa 3 e il Task 1). È lì che si riprende.
- ⚠️ **Un worktree nuovo nasce senza `.env.local`/`.env.test`** (non tracciati): senza copiarli dal
  repo principale, `npx next build` fallisce su `/api/admin/labs` via Stripe. Costa cinque minuti di
  diagnosi ogni volta.
- ⚠️ `.gitignore` **riga 62** ignora `*.png`: gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ **Nei blocchi `<style>{\`…\`}` e nelle stringhe di script dei `.tsx` non si possono usare
  backtick nei commenti**: chiudono il template literal (errore oscuro `TS1381`). Apici singoli.
- ⚠️ **La skill `ua-app:review` è inutilizzabile**: pretende `.claude/skills/review/checklist.md`,
  che **non esiste** nel repo (c'è solo `SKILL.md`), e la skill stessa impone di fermarsi in quel
  caso. La FASE 8 si è fatta con due revisori indipendenti — ed è stata **produttiva**: tre rilievi
  misurati e corretti prima del merge.
- **Credenziali di prova** e comandi: `memory/MEMORY.md` §1 e `ua-app/CLAUDE.md` §2.

---

## 6. 📌 Quello che questa giornata lascia al progetto

> **Un backlog che conserva una CONCLUSIONE invece di una RELAZIONE si riapre.**

La voce A5 era stata chiusa il 20/07 con «`theme_color` = `#D90012`», ed era **giusta** per il suo
scopo di allora. È diventata falsa **in silenzio** il giorno in cui il fondo è stato unificato,
perché il backlog conservava il *valore* e non la *regola*. Riscritta come relazione — «la barra di
stato è il fondo della superficie corrente» — non può più invecchiare senza che qualcosa se ne
accorga: la guardia non contiene **nessun colore letterale**, tranne il rosso della pillola
«Riprova», che è lì apposta per far fallire rumorosamente una sostituzione a tappeto.

**E un corollario di metodo, dalla code review:** due revisori su tre avevano concluso che
`offline.html` sarebbe rimasta congelata sui device, perché `public/sw.js` dichiara una cache dal
nome costante. **Era falso**: quel file è **generato**, e in produzione il nome contiene il numero
della build. Avevano letto l'artefatto di sviluppo. 📌 **Quando due pareri concordano su un fatto
verificabile, si verifica il fatto** — non si conta la maggioranza.
