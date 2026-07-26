# Handoff — «Un tema solo» è chiuso. Da qui in avanti (26/07/2026, notte)

**Per:** la sessione successiva, con contesto pulito.
**Prima di tutto:** BP-0 — `memory/MEMORY.md`, **voce 48** (e 47, 46, 45 per il filo del ragionamento).
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md` §0D) ·
**Regola Advisor** (panel 2-3 prima di ogni decisione significativa) · **mockup PRIMA del codice** (§0B) ·
**BP-2** (le 12 fasi) · **BP-1** (memoria, sempre, prima di fermarsi).

---

## 0. In una riga

**Il lavoro sul tema è finito: tutte e tre le tappe sono in produzione e verificate.** Non resta
niente da fare su quel fronte. Il prossimo passo **non è codice: è una scelta di Francesco** fra sei
proposte già disegnate (nome e cognome del paziente nel wizard). Tutto il resto è in coda dietro.

---

## 1. Che cosa sostituisce, e che cosa di quello muore

**Sostituisce** `docs/roadmap/2026-07-26-tema-unico-handoff.md` come punto di ripresa.

| Di quel file | Stato ora |
|---|---|
| §3 — tappa 3, i 7 task | ✅ **fatti tutti**, mergiati (`e42601b8`), in produzione, verificati live |
| §4.1 — nome+cognome paziente nel wizard | ⏳ **si porta avanti — è il punto 1 qui sotto** |
| §4.2 — la linguetta stretta | ⏳ **si porta avanti — punto 2** |
| §4.3 — centro notifiche ULTIMO | ⏳ **si porta avanti — punto 6, resta ultimo** |
| §4.4 — voci di backlog dalla spec | ⏳ **si porta avanti, una è diventata certezza — punto 4** |
| §4.5 — difetto latente `PareteClient` | ⏳ **ancora vivo — punto 5** |
| §2 — i due appunti sulle barre Android | ✅ chiusi come conoscenza, **niente da fare**; resta la **trappola** del punto 5 |

🛑 **Non rimettere in coda le tappe del tema.** È esattamente l'errore che la coda della roadmap
documenta su sé stessa: T16 e T17 sono rimasti scritti come «da fare» **dopo** essere stati
pubblicati, e chi leggeva li rimetteva in lista.

---

## 2. ✅ FATTO OGGI E IN PRODUZIONE

| Tappa | Merge | Che cosa |
|---|---|---|
| **1 — il meccanismo** | `03ec7595` | La barra di stato segue **dal vivo** il tema risolto |
| **2 — avvio e offline** | `850e3f26` | `manifest.json` e `offline.html` al fondo unico, con blocco scuro |
| **3 — la regola unica** | `e42601b8` | **Da sette posti con quattro regole a UNO:** Impostazioni → Aspetto → Tema |

**Verificato su `uachelab.com`:** lo script legge `ua-tema` (×2) e **cancella** `ua-theme` (×2),
**zero** `getItem('ua-theme')`; `offline.html` è alla chiave nuova; `#F4F0E7`/`#171411` serviti,
**nessun `#D90012`**. tsc 0 · vitest **3364 verdi / 19 skip** · build ok · QA **18/18** + prova dal
vivo su `/impostazioni` con Francesco dentro l'app.

Dettaglio pieno, comprese le quattro cose trovate che nel piano non c'erano: **MEMORY.md voce 48**.

---

## 3. 🔨 DA FARE, IN ORDINE

### 1. Nome e cognome del paziente nel wizard — **APRE CHIEDENDO A FRANCESCO, non leggendo codice**

🛑 **Non è bloccato dall'ingegneria: è bloccato da una scelta sua.** Sei proposte sono già disegnate:
`docs/design/mockups/2026-07-26-nomi-paziente.html`. La sessione nuova **apre mostrandogliele** e
aspetta che indichi quale.

**Perché serve** (ratificato 26/07: «facciamo chiedere nome e cognome al wizard, ovviamente un campo
non obbligatorio»): oggi l'app **non sa quale parola è il cognome**. Wizard e form paziente
compongono `nome_cognome` in **ordine opposto**, e alla parete arriva solo la stringa già composta.
**Percorso BP-2 pieno.**

### 2. La linguetta stretta

Stato `piena`: **18px di respiro ratificati nel mockup** contro `padding: 0` spedito
(`ds-v3.css:1613`). 🛑 **Non abbassare `min-height` da 96 a 78:** sistemerebbe il filo, di cui
nessuno si è lamentato. Lavoro piccolo, si chiude in fretta.

### 3. Ondata **B «giro clienti»** — la prossima della migrazione v3

`/agenda` + `/clienti` + `/clienti/[id]`. Qui si **generalizza il chrome v3** (il sostituto di
`AppHeader`/`PageWrapper`). Se `/clienti/[id]` sfora, si spezza in B1/B2 **senza rimescolare** le
altre ondate. Calendario completo: `ROADMAP-UFFICIALE.md` §calendario ondate (ratificato 20/07).

### 4. Voci di backlog aperte dalla spec del tema

| Voce | Stato |
|---|---|
| **`next-themes` rimovibile** | ✅ **non più un sospetto: verificato.** `grep` su `src/`, `tests/`, `scripts/` → **zero import**. Resta dichiarato in `package.json:39`. Per chiuderlo: `npm rm next-themes` + lockfile + **build e CI completi** (una dipendenza rimossa può rompere il lockfile in CI, non solo in locale). ~5 minuti con la verifica attaccata |
| **`color-scheme` mai dichiarato** | Non compare in tutto `src/`. Serve a far seguire il tema anche a scrollbar, campi di input e menu nativi del browser |
| **`safe-area-inset-top` mai usato** | Nessuna intestazione lo padda. **Legato alla trappola del punto 5** |
| **iOS (`appleWebApp.statusBarStyle`)** | Altra piattaforma, altro meccanismo: mai toccato, mai provato |
| **`--bg-deep` sotto la barra** | **Da MISURARE, non assumere** |

### 5. ⚠️ La trappola dell'edge-to-edge — da preparare **prima**, non quando arriva

Il giorno in cui Chrome accende l'edge-to-edge per le PWA installate, **insieme** alla cosa bella
arrivano due conseguenze, in produzione, senza che nessuno abbia toccato niente:

- i **28 `env(safe-area-inset-bottom)`** che oggi valgono 0 **si accendono tutti insieme**;
- `safe-area-inset-top` diventa non nullo e **nessuna intestazione lo padda** → il contenuto
  scivolerebbe **sotto l'orologio**.

📌 **Verifica a costo zero, da rifare dopo ogni aggiornamento maggiore di Chrome:** rimisurare
`safe-area-inset-top/bottom` sul device. Se diventano ≠ 0, la correzione è arrivata.
Ricerca completa con fonti primarie: `docs/roadmap/2026-07-26-ricerca-barre-pwa-android.md`.

### 6. Centro notifiche — **ULTIMO**

Per decisione esplicita di Francesco («implementiamolo alla fine della roadmap che abbiamo»). Quando
arriverà: percorso **GRANDE** con panel di advisor prima di ratificare l'architettura — è un dominio
nuovo (tabella, RLS con `public.current_lab_id()`, letto/non letto, consegna, ruoli, GDPR), non uno
spostamento di UI. ⚠️ **Non duplicare:** V2.0 n.1 (portale dentista bidirezionale) e V2.0 n.8 (log
WhatsApp) parlano già di parte di questa materia. Il pezzo davvero senza casa è la messaggistica
**fra operatori dello stesso laboratorio**.

---

## 4. ➕ Aperto OGGI, da non perdere

### D6-bis — l'approvazione di `blocked` e `billing` è **CONDIZIONATA**

Francesco non ha approvato le due rese mai viste (sospensione in chiaro, abbonamento in scuro): ha
posto una **condizione** — «se poi le rivediamo nel passaggio a v3, lascia pure come è». La
condizione è **verificata**: entrambe stanno nell'ondata **F2 «accessi»**.
🛑 **Se F2 cambiasse, o se quelle due ne uscissero, l'approvazione DECADE** e le rese vanno riviste
prima. Scritto in `docs/design/decisions/2026-07-26-un-tema-solo.md` §D6-bis.

### Token secondari v2.3 in tema scuro, sotto soglia → ondata **F1**

Misurato durante il QA sulla scheda di `/impostazioni` in tema scuro: **`--t3` `#5A5652` → 2,24:1**,
**`--t2` `#8A8580` → 4,45:1**, contro il 4,5:1 minimo. **Non è un uso sbagliato di un token: sono i
token.** La nota preesistente «Le pile restano raggiungibili…» ha **lo stesso identico 2,24:1**, e
con lei ogni testo secondario di ogni pagina ancora v2.3 in tema scuro.

⚠️ **Perché adesso conta più di ieri:** prima il tema scuro era difficile da tenere, quindi si vedeva
di rado. **Ora si blocca da Impostazioni con un tap.** Tamponata **solo** la frase di stato della riga
«Tema» (a `--t2`, 4,45). Appuntato in `ROADMAP-UFFICIALE.md` §difetti di leggibilità.

---

## 5. Difetti latenti vivi (non ipotetici)

1. **`PareteClient` chiama `router.refresh()`**; con l'URL spinto a `/cassette` dal pager, quei
   refresh rifanno il fetch della **rotta vera** e ne sostituiscono il contenuto dentro la home.
   `StanzePager.tsx:278-288` lo annota come **limitazione nota, non risolta** — verificato ancora
   presente il 26/07 notte. Nasce dalla scelta «due superfici, un indirizzo».
2. **La terza superficie non è mai stata misurata.** La forma «solo parete» (`is-parete-sola`) è
   stata corretta **su parere del panel senza misura preventiva**, per decisione esplicita di
   Francesco. Misurarla richiede di cambiargli temporaneamente la preferenza home: **da concordare
   con lui.**

---

## 6. ⚠️ La tensione fra i due ordinamenti — **decisione di Francesco, non di una sessione**

`ROADMAP-UFFICIALE.md` contiene **due ordini mai riconciliati**: il **calendario di migrazione**
(che finisce con la milestone finale, e mette il centro notifiche **ultimo**) e la **sequenza
operativa ratificata il 17/07** (problemi → funzioni attive → design → audit → collaudo), per cui una
**funzione nuova** cadrebbe al **passo 2**, cioè prima di tutto il design: l'opposto.

**Vale la decisione di Francesco: ultimo.** 🛑 **Nessuno lo rimetta al passo 2 leggendo la sequenza
del 17/07 e ragionando da solo.** Se i due ordini vanno riconciliati, è una scelta sua.

---

## 7. Base di lavoro

- **`main` è a `33b7a4ad`**, pulito, in produzione, CI e CD verdi. Worktree e branch del tema
  **rimossi**: quel lavoro è storia.
- **Worktree ancora in piedi** (di altre ondate, non di questa): `ondata-a-mini-triage`,
  `redesign-parete-home`.
- 🛑 **NEL WORKTREE IL DEV SERVER NON PARTE.** Accertato stasera, non supposto, e costa tempo vero:
  due `package-lock.json` fanno scegliere a Turbopack la radice del **repo principale** → **tutte le
  route rispondono 404** (i file statici di `public/` no, quelli rispondono, e questo inganna);
  forzando `turbopack.root` non trova `next`, perché il worktree eredita `node_modules` dal padre;
  un **symlink** manda Turbopack **in panico** («Symlink is invalid, it points out of the filesystem
  root»).
  ✅ **Via d'uscita usata:** un **ramo di sola verifica nel repo principale** sullo stesso commit
  (`git branch qa-xxx <sha> && git checkout qa-xxx`), QA lì, poi `git checkout main` e
  `git branch -D qa-xxx`. **Ricordarsi di tornare su `main`:** lasciare il repo principale su un
  ramo di servizio significa che `main` non è checked out da nessuna parte.
- ⚠️ **Un worktree nuovo nasce senza `.env.local`/`.env.test`** (non tracciati): senza copiarli,
  `next build` fallisce su `/api/admin/labs` via Stripe.
- ⚠️ **`.gitignore` riga 62 ignora `*.png`:** gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ **Il pre-commit ferma il commit su `--max-warnings=0`.** `tsc` **non** vede un import rimasto
  senza uso: solo ESLint. Dopo ogni bonifica che rimuove codice, **passare `npx eslint src/`
  prima di committare** — stasera ha fermato il merge per due `useEffect`.
- ⚠️ **Nei blocchi `<style>{\`…\`}` e nelle stringhe di script dei `.tsx` non si possono usare
  backtick nei commenti:** chiudono il template literal (`TS1381` oscuro). Apici singoli.
- ⚠️ **La skill `ua-app:review` è inutilizzabile:** pretende `.claude/skills/review/checklist.md`,
  che non esiste nel repo. La review si fa con revisori indipendenti.
- **Credenziali di prova:** `memory/MEMORY.md` §1. 🛑 **Le password non le digita l'assistente:** per
  il QA di superfici dietro login (`/impostazioni`, `/admin`) si chiede a Francesco di entrare lui
  nel browser, e poi si guida la verifica da lì. Stasera ha funzionato bene.

---

## 8. 📌 Quello che questa giornata lascia al progetto

> **Nessun controllo automatico guarda dentro i colori.**

Le due cose peggiori trovate oggi hanno la **stessa forma**, e nessuna delle due poteva essere vista
dai 3364 controlli verdi né dal compilatore:

- **nove selettori di tema scuro** che il piano non nominava: convertirne due su undici avrebbe reso
  le schermate d'accesso **testo chiaro su fondo chiaro**;
- una **frase illeggibile a 2,24:1** proprio nel tema in cui serviva.

Servono **occhi e misure sul pixel reso**. Una suite verde dice che il codice fa quello che il codice
dice di fare — non che si veda.

**E un corollario sulle approvazioni:** «lascia pure come è» era una risposta **condizionata**.
Registrarla come incondizionata sarebbe stato lo stesso errore che ha riaperto la voce A5 — un
archivio che conserva una **conclusione** al posto di una **relazione** invecchia in silenzio, e
nessuno se ne accorge finché non è tardi.
