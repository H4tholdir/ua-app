# BRIEF — Task D-bis: la prova a schermo e i DUE gate estetici arretrati

**Ramo:** `intervento-post-consegna` (🛑 **MAI un worktree**) · **Base:** il salvataggio che porta questo brief
**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`, Task D, Passo 5
**Perché esiste come compito a sé:** il Task D era **due mestieri** — costruire e **guardare**. Chi ha
costruito guarda male ciò che ha costruito.

---

## 0. IL MANDATO IN UNA FRASE

**Tre cose, e nessuna si copre con le altre: ① la FASE 9 — la superficie nuova provata DAL VIVO su 390 ·
768 · 1280, chiaro e scuro · ② il GATE ESTETICO L2, che qui è dovuto DUE VOLTE · ③ la guardia sulla
navigazione dentro gli overlay, che TRE compiti di fila non hanno lanciato.**

🛑 **È l'ULTIMA cosa che tiene bloccata la pubblicazione del ramo.** Senza il gate, il merge non si fa
(REGOLA ZERO di `ua-app/CLAUDE.md` §0C).

---

## 1. LA SUPERFICIE — che cos'è cambiato e va guardato

Il foglio **«Devo intervenire»** sulla scheda del lavoro
(`src/components/features/lavori/scheda-v3/DevoIntervenire.tsx`), e in particolare:

| che cosa | da quale compito | perché è ASPETTO (D245) |
|---|---|---|
| La finestra «Il manufatto è uscito dal laboratorio?» | **Task A** | cambiano **titolo, corpo ed entrambe le etichette**, e nasce **un riquadro** |
| Il passo nuovo «Che cosa c'è di sbagliato?» — l'elenco delle **sei righe** coi valori | **Task D** | superficie **nuova** |
| I sotto-passi: testo · **selettore di persone** · **odontogramma** · le due caselle delle caratteristiche | **Task D** | superfici **nuove** |
| Il blocco «Da qui non si corregge» coi due collegamenti | **Task D** | superficie **nuova** |
| Il nastro del percorso | **Task D** | superficie **nuova** |
| 🆕 **Il riquadro del conflitto (409)** | **Task D-ter** | **dichiarato dall'esecutore stesso come dovuto al gate** |

⚖️ **D245 — il confine, e si guarda IL CODICE TOCCATO, non l'effetto percepito:** token, classi, stili,
spaziature, testi visibili o struttura del markup → **è aspetto, il gate è dovuto**.

---

## 2. 🔴 TRE CANDIDATI A UN ❌ GIÀ SEGNALATI — guardali per primi, ma NON fermarti a questi

1. 🔴 **L'ODONTOGRAMMA DENTRO IL FOGLIO.** Segnalato da **esecutore e revisore**: è nato **per una pagina
   intera** e usa token **v2.3**, mentre il foglio è **v3**. ⚠️ Attenzione al confine di convivenza
   (DS v3 §14): la migrazione è **per route, mai per componente** — quindi qui non si tratta di
   «migrarlo», ma di stabilire **se dentro un foglio v3 stia o non stia**, e con quale rimedio.
2. 🔴 **LE TINTE DELLE QUATTRO SUPERFICI NUOVE — «scostamento numero sette», NON dichiarato.** Il mockup
   approvato scrive **`--elv`** su tutte e quattro; il codice usa **`--bg-deep`**. `provato:` dal
   revisore — `ds-v3.css:52` dà `--bg-deep: #100E0B` contro `--card: #211D18`: in tema scuro
   **`--bg-deep` è più SCURO del pannello che la contiene**, quindi una riga premibile **scende sotto il
   fondo pagina** invece di salire. 🔑 La regola è già registrata come esito di un gate L2 del 22 luglio
   (`Sheet.tsx:499-501`): *in tema scuro una superficie premibile sale a `--elv` dentro un `--card`*.
   ⚠️ **Il commento che diceva il contrario è già stato corretto** dal D-ter: **il codice no**. È tuo.
3. 🟠 **Il riquadro del conflitto**, nuovo di ieri sera.

🛑 **Questi tre sono un punto di partenza, non l'elenco.** L'elenco lo fa **la checklist**, e un audit che
trova solo ciò che gli era stato annunciato non è un audit.

---

## 3. I TRE LAVORI

### ① FASE 9 — la prova a schermo, DAL VIVO

- [ ] **390 · 768 · 1280**, **chiaro e scuro** — sei combinazioni, su **ogni** passo del foglio.
- [ ] 🔑 **Non è «si vede bene»: è «il contenuto vero ci sta dentro».** Cerca il testo che va a capo dove
  non deve, il valore lungo che sfonda la riga, il tasto che scende sotto la piega, l'elenco delle
  persone che copre il resto.
- [ ] **Bersagli premibili ≥ 44 px** · il colore **mai** unica fonte di stato · `prefers-reduced-motion`.

### ② IL GATE ESTETICO L2 — dovuto DUE VOLTE

**Framework:** `docs/design/audit-ui-ux/README.md` (Livello 2) · **checklist:**
`docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni × 3 viewport × 2 temi).
**Precedente da imitare:** `docs/design/screenshots/2026-08-06-tinte/GATE-L2.md`.

- [ ] **Uno è arretrato dell'ondata**, l'altro l'ha aggiunto il **Task A**. Coprili **entrambi**: gli
  screenshot devono includere **anche la finestra del Task A**, non solo il passo nuovo.
- [ ] **Ogni ❌ risolto oppure deferito CON IL MOTIVO SCRITTO.** Un deferimento senza motivo è un ❌
  nascosto.
- [ ] **Screenshot before/after** in `docs/design/screenshots/<data>-<superficie>/`, con il suo
  `GATE-L2.md`.

### ③ LA GUARDIA SULLA NAVIGAZIONE DENTRO GLI OVERLAY — TRE compiti non l'hanno lanciata

`scripts/guardia-navigazione-overlay.mjs`. **È manuale** e non è agganciabile al commit: le servono
**l'app accesa**, le **credenziali del banco** e **un lavoro preparato apposta** che il seed standard non
crea — la ricetta della fixture sta **nell'intestazione dello script**. ⚠️ **Il suo terzo braccio preme
davvero un'azione distruttiva** e poi la annulla: leggi l'intestazione prima di lanciarla.

🔑 **Perché è dovuta proprio qui:** il passo nuovo aggiunge **due navigazioni da dentro un overlay** (i
collegamenti a Impostazioni e ad Anagrafica). La regola di casa (`ua-app/CLAUDE.md` §9) è che da dentro
un `Sheet` v3 si naviga **solo** con `useNavigaDaOverlay`, mai `router.push` nudo — e questa guardia è la
rete che lo prova **dal vivo**, non su carta.
🛑 **Se la guardia non si può lanciare** (fixture impossibile, credenziali, qualunque motivo), **si
scrive perché**, con l'errore incollato. *Una guardia dichiarata e mai lanciata è peggio di una guardia
che non c'è: la terza volta è oggi.*

---

## 4. COME ARRIVARE A QUELLA SCHERMATA — la parte che costa più tempo se non è scritta

- ⚖️ **D103 — l'accesso al banco NON si chiede** quando le credenziali sono in `.env.local`. Il modo
  preferito è il **link d'accesso monouso**:
  ```
  npx tsx scripts/link-accesso.ts [email] [percorso]
  ```
  (l'email si può omettere: ripiega su `TEST_EMAIL`). Credenziali: `set -a && . ./.env.local; set +a`.
- **Il foglio compare solo su un lavoro CONSEGNATO.** ⚠️ E per consegnarne uno per prova servono **due**
  condizioni, o la prova non prova niente: lo stato dev'essere `pronto`/`in_ritardo`
  (`src/lib/consegna/costanti.ts:4`) **e** non deve esistere una dichiarazione con stato ≠ `annullata`,
  altrimenti la porta d'idempotenza restituisce quella vecchia **senza generare niente**
  (`generate-ddc.ts:99-108`).
- **Il passo di correzione compare solo col motivo** «C'è un dato sbagliato sulla dichiarazione».
- ⚠️ **Il sotto-passo delle caratteristiche prescritte richiede una PRESCRIZIONE sul lavoro**, e sul
  banco `lavori_prescrizioni` **aveva ZERO righe**: se serve, **creala**, e scrivi come.
- 🛑 **Il server si avvia con gli strumenti di anteprima o `npm run dev`, MAI con un comando che resta
  appeso.** Per gli screenshot: Playwright è già installato — uno script in `scripts/tmp/` (che è
  ignorato da git) è il modo di casa.

---

## 5. LE REGOLE

- 🛑 **Tu GUARDI e RIFERISCI. Le correzioni di aspetto che il gate impone le puoi fare** — è il senso del
  gate — **ma NON toccare la logica**: se trovi un difetto di comportamento, **lo riferisci** (R-E2).
- **Animazioni SOLO da `src/design-system/v3/motion.ts`**; componenti da `src/components/ds/`.
- **Se cambi codice: FASE 7 completa.** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` —
  🛑 **`timeout: 600000`**, ci mette più di due minuti; l'uscita si legge **da variabile**. Base:
  **5659 | 68 su 454**.
- ⚖️ **D318 — `git add <percorsi>`, MAI `git add -A`.** Per i messaggi lunghi `-F <file>`.
- 🛑 **Niente `rm -rf` fuori dalle aree temporanee** (c'è una guardia, si usa `/usr/bin/trash`).
- ⚠️ **Francesco vuole vedere PIÙ VARIANTI quando si sceglie**, mai una sola: se un ❌ ha due rimedi
  plausibili, **mostrali tutti e due** invece di scegliere per lui.

---

## 6. ⚠️ GIÀ NOTI — non segnalarli come nuovi

**I3** · **M1** · `Esc` sopra la finestra fa scattare **due** ascoltatori (`Sheet.tsx:160` +
`DialogConferma.tsx:87`, preesistente) · la riga 8 del corpo vivo della RPC · **F1** (chiuso dal D-ter) ·
**F2** (`tipo_dispositivo` senza vocabolario nell'atto unico) · **F3** («Protesi **F**issa» sulla carta
contro «Protesi fissa» a schermo — ⚠️ **questo è un testo visibile: se il gate lo incrocia, è tuo**) ·
i **sei 409 indistinguibili** · il **secondo commento falso** a `DevoIntervenire.tsx:457-465` ·
`--bg-deep` usato anche in **tre punti preesistenti** (⚠️ **preesistenti = fuori dal tuo gate**, che
copre la superficie dell'ondata: se li tocchi, dillo e spiega perché).

---

## 7. CHE COSA IL RESOCONTO DEVE CONTENERE

`.superpowers/sdd/atto-unico-task-d-bis-report.md` **più** il `GATE-L2.md` nella cartella degli
screenshot:

1. **La FASE 9**: le sei combinazioni, che cosa hai visto, e **gli screenshot**.
2. **Il gate L2**: la checklist percorsa, **ogni ❌ con esito** (risolto / deferito **col motivo**).
3. **La guardia sugli overlay**: lanciata, col suo output — **oppure il motivo per cui non si è potuta
   lanciare, con l'errore incollato**.
4. **Che cosa hai cambiato**, se hai cambiato qualcosa, e la **FASE 7**.
5. 🔴 **DOVE QUESTO BRIEF SBAGLIA.** Cercalo attivamente: in quest'ondata **undici compiti su undici**
   hanno trovato un difetto reale nel proprio mandato. Se non trovi niente, **scrivilo**.
6. **I ritrovamenti fuori mandato (R-E2).**
7. **Che cosa NON hai fatto**, per intero — e in particolare **che cosa non sei riuscito a guardare**.
