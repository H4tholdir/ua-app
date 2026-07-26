# Handoff — chiusura del collaudo PWA installata (26/07/2026, sera)

**Per:** la sessione successiva.
**Prima di tutto:** BP-0 — `memory/MEMORY.md` (voce **44** e le sue tre aggiunte della giornata).
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md`
§0D) · **Regola Advisor** · mockup PRIMA del codice · BP-2.

**Sostituisce** `2026-07-26-collaudo-pwa-installata-handoff.md` come punto di ripresa. Quello resta
valido per i **punti 1, 3 e 4**, che non sono stati toccati.

---

## 0. In una riga

Il **punto 2** dell'handoff di collaudo si è spaccato in due, ed entrambe le metà sono chiuse:
la **striscia panna è risolta, in produzione e presidiata da una guardia**; la **fascia dietro la
barretta dei gesti non è nostra** — è un bug di Chrome aperto dal 2021, documentato con fonti
primarie. Restano aperti i punti **1**, **3** e **4** dell'handoff precedente.

---

## 1. ✅ CHIUSO — la striscia panna

**Merge `bf047904`** (fix `aed94a32`), pulizia `732fcceb`, CI+CD verdi, **verificata in produzione**.

**Causa:** `/cassette` è **un indirizzo e tre superfici**. Dall'icona non si apre la pagina delle
cassette: si apre la **home**, e alla parete ci si arriva con la linguetta — il pager fa
`pushState('/cassette')`, quindi l'indirizzo cambia ma il documento resta la home. Lì
`.ua-home` portava il respiro verticale **anche in fondo** e la stanza parete ci stava dentro.

**Rimedio:** il respiro è stato tolto alla cornice e **restituito alla stanza pile**; la parete non
lo prende. È **lo stesso schema già ratificato per l'asse orizzontale** (`ds-v3.css:1541`+`1579`+
`1589`) ruotato di 90° — non una regola nuova, una migrazione lasciata a metà.

**Misure in produzione (3 superfici × 3 viewport):** parete **19,4 → 0,38 px** · standalone
invariata a 0 · **`.corpo` content box 715,75 → 715,75**, le pile non si sono mosse · TastoPiù
ancora staccato dal bordo. Catture prima/dopo in
`docs/design/screenshots/2026-07-26-striscia-parete-home/`.

**Presidio:** `tests/unit/home-parete-fino-in-fondo.test.ts` — 7 controlli, RED→GREEN provato.
Legge **anche il blocco `<style>` di `HomeV3.tsx`**, che la guardia precedente non apriva nemmeno.
Suite: **3290 verdi / 19 skip**.

### 🛑 L'unica cosa che manca, ed è di Francesco

**La conferma a vista sul suo telefono.** Ha scritto «abbiamo risolto» e su quella parola è stata
rimossa la strumentazione temporanea, ma **nessuno ha misurato sul suo device dopo il fix**: le
misure sono del banco e della produzione via Playwright. Se la striscia ricomparisse, si riparte
da qui — la causa è nota e la guardia è in piedi, quindi sarebbe un **secondo** contributo, non
questo.

---

## 2. ✅ CHIUSO COME CONOSCENZA — la fascia dietro la barretta dei gesti

**Non è un difetto nostro.** Documento completo con fonti primarie:
`docs/roadmap/2026-07-26-ricerca-barre-pwa-android.md`.

- **Bug Chromium 40759522** (aperto 06/04/2021, tuttora In Progress), parole di un ingegnere del
  progetto: «WebAPKs correctly set the status bar colour / **WebAPKs do *not* set the navigation
  bar colour**». Il manifest **non ha** un campo per quella fascia.
- 🛑 **Il `theme_color` NON tocca la fascia in basso.** Barra di stato (voce **A5**, riaperta) e
  fascia dei gesti sono **due lavori indipendenti**: chiudere il punto 2 sistemando il rosso
  sarebbe sbagliato.
- **La trasparenza che Francesco vuole** è il bug **407420295**: in review, due revert, nessun
  milestone. Le due condizioni per averla — `display: standalone` + `viewport-fit=cover` — **le
  dichiariamo già**, quindi arriverebbe senza modifiche. ⚠️ **Ma non è scontato per lui:**
  `safe-area-inset-bottom` misura **0 anche da browser** sul suo device (Android 16, Chrome 150),
  quindi l'edge-to-edge di Chrome 135 **non è attivo lì**.

### ⚠️ Trappola da preparare, non urgente ma nemmeno rinviabile all'infinito

**28 punti del codice usano `env(safe-area-inset-bottom)`.** Oggi vale 0 e non fanno nulla. Il
giorno in cui Chrome rilascia la correzione **si accendono tutti insieme, in produzione**, senza
che nessuno abbia toccato niente. Vanno riguardati **prima**.

---

## 3. Cosa resta aperto, in ordine di concretezza

1. **Voce A5 del backlog tecnico** — riaperta: che colore deve avere la **barra di stato** ora che
   il fondo è unificato. **Verificato oggi: il rosso `#D90012` vive in TRE posti**, e vanno mossi
   insieme — `public/manifest.json:8` · `src/app/layout.tsx:28` · **`public/offline.html:6`**, la
   pagina servita quando manca la rete (correggendone due su tre resterebbe rossa nel momento
   peggiore). ⚠️ In `offline.html` il rosso compare **due volte**: riga 6 è il `theme-color`, riga
   27 è un colore di sfondo del suo contenuto — sono cose diverse, non cambiarle a tappeto.
   ⚠️ Da verificare prima di proporre la variante chiaro/scuro col `media`: l'intent Chromium
   nomina «installed PWAs **on Desktop**» e «all websites **on Android**», **non** le PWA installate
   su Android — che è il nostro caso (§3.3 della ricerca).
2. **Punto 1 dell'handoff precedente — la linguetta stretta**, stato `piena`: 18px di respiro
   ratificati nel mockup contro `padding: 0` spedito (`ds-v3.css:1613`). 🛑 **Non abbassare
   `min-height` da 96 a 78**: sistemerebbe il filo, di cui nessuno si è lamentato.
3. **Il resto della roadmap**, a partire da **nome+cognome del paziente nel wizard** (sei proposte
   già disegnate, in attesa della scelta di Francesco).
4. **Punto 3 — il centro notifiche: ULTIMO**, per decisione esplicita di Francesco.
5. **Difetto latente segnalato dal panel, fuori perimetro:** `PareteClient` chiama
   `router.refresh()`; con l'URL spinto a `/cassette` dal pager, quei refresh rifanno il fetch della
   **rotta vera** e ne sostituiscono il contenuto dentro la home
   (`StanzePager.tsx:283-285` lo annota come limitazione nota, non risolta). **Difetto vivo**, non
   ipotetico, e nasce dalla stessa scelta «due superfici, un indirizzo».
6. **La terza superficie non è mai stata misurata.** La forma «solo parete» (`is-parete-sola`) è
   stata corretta **su parere del panel senza misura preventiva**, per decisione esplicita di
   Francesco. Misurarla richiede di cambiargli temporaneamente la preferenza home: **da concordare
   con lui.**

---

## 4. 📌 La regola che questa giornata lascia al progetto

> **Ogni misura, ogni guardia e ogni screenshot devono dichiarare la SUPERFICIE, mai l'indirizzo.**

A `/cassette` rispondono in tre — rotta standalone, stanza parete del pager, forma «solo parete» —
e **nessuna delle tre lo dice**. Guardare l'URL non basta, e uno screenshot da solo non identifica
dove è stato preso.

### E tre errori di metodo, tutti della stessa famiglia, tutti commessi oggi

Valgono più della soluzione, perché si ripetono:

1. **Una spiegazione elegante non è una prova.** Il §7.3-ter legava tre osservazioni a un unico
   numero letto sul device ed era **falso**: quel numero era stato preso su una pagina **che non
   scorreva**, cioè in una condizione diversa da quella del difetto.
2. **Uno strumento può essere cieco.** `DiagFondo` era montato solo sulla superficie sana: ogni suo
   numero parlava dell'altra pagina, e ha prodotto un'esclusione sbagliata a verbale.
3. **Una guardia può dimostrare la premessa sbagliata.** `parete-fino-in-fondo.test.ts` presidiava
   una proprietà **del muro** mentre «arriva fino in fondo» è una proprietà dell'**intera catena**
   di antenati — e dava la sensazione della copertura.

**Il filo comune:** un numero letto in una condizione diversa da quella del difetto **non è una
misura del difetto**. Vale per gli strumenti, per le guardie e per gli screenshot.

---

## 5. Base di lavoro

- **Il codice è su `main`**, in produzione (`732fcceb`). Nessun worktree aperto da questa sessione;
  il ramo `fix/striscia-panna-parete-home` è stato mergiato e cancellato.
- **Banco di collaudo:** `npx next build && npx next start -p 3020 -H 0.0.0.0`. ⚠️ Dopo OGNI build
  **riavvia il server** e lancia **`node scripts/guardia-stili-collaudo.mjs`**: senza quel controllo
  la pagina sembra giusta ma ogni misura è falsa. ⚠️ Il server tiene in memoria l'elenco dei file
  statici: un file nuovo in `public/` **non compare** finché non lo si riavvia.
- ⚠️ `.gitignore` **riga 62** ignora `*.png`: gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ **`scripts/tmp/` è ignorato**: gli script di misura di questa sessione (riproduzione del
  percorso di Francesco, verifica su tre superfici, catture prima/dopo) **non sono nel repo**.
  Chi ne avrà bisogno li riscrive — la ricetta è nei commit e in §7.3-sexies della ricerca.
- ⚠️ **Nei blocchi `<style>{\`…\`}` dei `.tsx` non si possono usare backtick nei commenti**: chiudono
  il template literal. Costano un errore di compilazione oscuro (`TS1381`). Usare apici singoli,
  come fa il resto di `HomeV3.tsx`.
- **Credenziali di prova** e comandi: `memory/MEMORY.md` §1 e `ua-app/CLAUDE.md` §2.
