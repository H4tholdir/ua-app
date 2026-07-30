# Handoff — l'album delle foto: si passa all'esecuzione

> 🛑 **DOCUMENTO SUPERATO il 30/07/2026 — NON è più il punto di ripresa.**
> Descrive lo stato **prima** dell'esecuzione. Da allora: **T1-T4 fatti**, il gate T5 **scritto e fermato da
> un panel**, e T5-bis ha **riparato alla radice** la seconda delle tre trappole qui sotto (D84), mentre il
> punto 1 di §4 è stato **deciso** da Francesco (D80: la conferma è un **foglio**, S1 ritirato).
> ➡️ **Il punto di ripresa è `docs/roadmap/2026-07-30-album-ripresa-post-panel.md`.**
> Resta utile per: le decisioni D57-D79 in tabella, le trappole ① e ③ (ancora vere) e le regole operative.

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi il piano
`docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` (**è il documento operativo**).
La spec **ratificata** è `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`; il verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` porta **settantanove** decisioni (D57-D79
riguardano l'album). ⚠️ Il ledger `.superpowers/sdd/progress.md` è **fuori dal repo git**: non può essere
un punto di ripresa.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **§0B mockup prima del codice** · **R-P1/R-P2/R-P6** · **R-E1/R-E2** ·
**«il numero si dà subito»** (§0A-bis) · **BP-1**.

---

## 0. In una riga

**Design chiuso, spec ratificata, mockup approvato, piano scritto: resta solo eseguire.** Ramo
`ondata-b-schermate`, **niente su `origin`**, albero pulito, tutte le guardie verdi.
➡️ **Si comincia dal Task 1**, con un esecutore fresco (R-E1).

---

## 1. Che cosa è già deciso, e non si riapre

| # | decisione | in una riga |
|---|---|---|
| **D61** | la foto è **materiale di lavoro** | la cancellazione è **fisica**: riga **e** file |
| **D63** | rete = conferma + **traccia** | chi cancella, quando, quale percorso — **mai** l'immagine |
| **D64** | **carta con foto grande + visore a tutto schermo** | il visore nasce col posto per l'editor già previsto |
| **D65** | la categoria **si chiede allo scatto** | dopo lo scatto, mai prima; **una volta per gruppo** |
| **D66** | **editor fuori**, visore **predisposto** | ruota/ritaglia sono l'ondata (c) |
| **D67** | 📎 **allegati e condivisione**: ondata propria | **settima riga della roadmap** |
| **D68 · D71** | ordine **per categoria**, gruppi **cronologici** | `impronta → pre_lavoro → colore → post_prova → rx → altro` |
| **D69 · D78** | eliminazione sotto il menù ⋯, che è una **tendina** | voce distruttiva **in fondo** |
| **D70** | categoria correggibile da **entrambe** le superfici | 🛑 **una sola** funzione di scrittura |
| **D72** | elenco **chiuso**, sei voci **ratificate** | prima non le aveva mai scelte Francesco |
| **D73** | `tipo` **si elimina**, nasce `categoria` | `NOT NULL` **senza ripiego** |
| **D74** | foglio chiuso senza scegliere → **`altro`** | costo accettato: l'album non distingue «scelto» da «non risposto» |
| **D75** | durata dei collegamenti → **ondata di D67** | qui è un **vuoto dichiarato**, con la sua contropartita |
| **D76·D77·D79** | album **A1** · visore **V1** · categoria **C1** | mockup approvato del 30/07 |
| **D80** | la conferma di eliminazione è un **foglio dal basso** | S1 **ritirato** · nasce **T9-bis** · deroga a **§5.17** |

---

## 2. 🔴 Le tre trappole misurate — si leggono PRIMA di aprire il piano

Nessuna era deducibile a tavolino: sono uscite dalle letture obbligatorie (R-P2).

1. **La finta della catena Supabase espone SOLO `from`**
   (`tests/unit/lavori-id-immagini-imgid-route.test.ts:60-62`). ➡️ Il primo `svc.storage.remove` del **Task
   4** **romperà un test esistente** (`:210`) per una ragione che **non è un difetto del codice**. Il piano
   dice come estendere la finta: farlo **prima**.
2. **Due blocchi dello scorrimento del corpo si INCASTRANO.** `Sheet.tsx:248-253` si difende solo dalla
   propria rientranza: un secondo strato che bloccasse catturerebbe `overflow:'hidden'` come «valore
   precedente» e lo **ripristinerebbe a hidden per sempre**. ➡️ **Blocca solo il visore** (lo strato più
   basso). Tendina e conferma **no**.
3. **Esc non è mediato dalla pila.** `Sheet.tsx:158-165` e `DialogConferma.tsx:78-85` ascoltano **entrambi
   su `window`** → **un solo Escape collassa tutti e tre gli strati**, mentre il tasto «indietro» ne chiude
   uno solo. ➡️ Va risolto nel **Task 12**, e **se la soluzione tocca `storia-overlay.ts` o `Sheet.tsx` è
   FUORI mandato: si riferisce** (R-E2).

---

## 3. Ciò che il piano ha già chiuso, e non va ridiscusso

- ✅ **La marca dell'overlay: si riusa `'uaSheet'`.** `provato:` il **valore** della marca non cambia
  **nessun** comportamento in `storia-overlay.ts` (il gate a `:131` è sull'**esistenza** dell'entry), e
  `type Marca` (`:67`) è un'unione **chiusa e non esportata** — `'uaVisore'` **non compilerebbe**. Tiene
  anche verde `scripts/guardia-navigazione-overlay.mjs:97`.
- ✅ **DS v3 §5.33 è già emendata** (rev. 3.3): la striscia è dichiarata superata, la fonte di verità visiva
  ripuntata al mockup del 30/07, e la riga che prescriveva un **worktree** corretta.
- ✅ **`gen types` NON restringe il `CHECK`** (esce `string`, non l'unione) → la **prova-spia del Task 2 è
  necessaria**, non decorativa.
- ✅ **Una colonna senza ripiego esce OBBLIGATORIA nell'`Insert`** → il rosso di `tsc` previsto dal Task 1
  **è un fatto misurato**, non una speranza.

---

## 4. 🟡 Ciò che è APERTO e va portato a Francesco

1. ✅ ~~Scostamento S1~~ — **CHIUSO il 30/07 all'apertura dell'esecuzione: è la decisione D80.** Chiesto a
   Francesco, ha scelto il **foglio dal basso** del mockup, non la card centrata. **S1 è ritirato**, il piano
   torna fedele al mockup, e la deroga è verso **§5.17** (il «UNICA card centrata» di
   `src/components/ds/DialogConferma.tsx:3-9`), **non** verso §5.16 — l'invariante «su mobile mai un modal
   centrato» il foglio lo **rispetta**. ➡️ Nasce **T9-bis** (`FoglioConferma`), la sua §5.x si propone nel
   gate **T5**, e **T12** lo usa. 🔴 **Costo misurato da risolvere nel gate, non dentro T12:** `Sheet` tiene
   il valore precedente dello scorrimento in un `useRef` **per istanza** (`Sheet.tsx:222`, cattura a
   `:248-252`) → un secondo foglio **sopra il visore** lascerebbe la pagina **bloccata per sempre**.
2. **Le icone vere delle sei categorie.** Nel mockup sono **emoji, dichiarate segnaposto**. È un passo
   proprio, col suo §0B.
3. **Dove collocare l'ondata di D67** (allegati + condivisione) nella roadmap.

---

## 5. Da dove si riparte, e in che ordine

**Task 1**, esecutore fresco, **un compito per volta** (R-E1), con **revisione fra l'uno e l'altro** e il
mandato esplicito di **cercare dove il piano sbaglia**.

```
A (il dato)          T1 → T2 → T3
B (la cancellazione) T4                              ← può viaggiare in parallelo a C
C (i componenti)     T5 🚪gate → T6 → T7 → T8 → T9 → T9-bis
D (l'innesto)        T10 → T11 → T12
E (la chiusura)      T13
```
🆕 **T9-bis è nato il 30/07 da D80** (il foglio di conferma). Numerato «bis» apposta: rinumerare i task
romperebbe i riferimenti in memoria, spec e verbale.

🛑 **Due vincoli d'ordine non negoziabili:**
- **A prima di D**: T11 tocca `TabImmagini`, che oggi scrive la categoria in `descrizione`. Farlo prima di
  T1 significherebbe scrivere in una colonna che sta per cambiare.
- **B prima di D-T12**: senza la cancellazione vera, «Elimina foto» **dice il falso**.

🚪 **T5 è un GATE e non contiene codice:** le §5.x dei quattro componenti si **propongono prima** che i
componenti esistano (spec v3 §13.1 p.3). Saltarlo significa scriverli e poi descriverli.

---

## 6. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su **tutte** le route): `git checkout -b`.
🛑 **Mai `git add -A`**: `git commit -F <file-messaggio> -- <percorsi>`; i **backtick nel messaggio vengono
eseguiti dalla shell**.
⚠️ **`.gitignore` ignora `*.png`** → `git add -f` per gli screenshot. E ignora **`.superpowers/sdd/`** per
intero, **`scripts/tmp/`** e **`*-report.*`**: un rapporto chiamato `…-report.md` **non entra nel repo**.
⚠️ **Un percorso citato in un documento vivo deve esistere**, o la guardia blocca il salvataggio: un file
futuro si dichiara **«da creare»** o **🆕** **sulla stessa riga**. *(Il piano è stato rifiutato tre volte
per questo motivo prima di passare.)*
🔑 **Riferimenti misurati il 30/07:** `tsc --noEmit` **pulito** · suite **3850 passati | 19 saltati** (358
file) · baseline banca dati **294 · 0 · 916 · 48**.
🛑 **Mai stampare righe di `pazienti`** (Art. 9): solo conteggi.
⚠️ **`vitest` non è deterministico:** un solo rosso con durata anomala su un file **non toccato** → isolalo
(`.superpowers/sdd/diagnosi-flake-vitest.md:235`); la stessa firma su un file **toccato** è un difetto tuo
finché non provi il contrario.
⚠️ **La guardia degli overlay è MANUALE** (`scripts/guardia-navigazione-overlay.mjs`): le serve una **build
di produzione già in esecuzione su `:3020`** (🛑 **non** `npm run dev`, che è 3000), le credenziali
(`UA_EMAIL` · `UA_PASSWORD` · `LAVORO_ID`) e una **fixture che il seed standard non crea**. **Uscita 2 =
fixture mancante**, non «tutto a posto».
🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — **non è nel repo**, si riscrive.
**Il server MCP di Supabase NON è autenticato.**
🔑 **Il pre-commit gira:** `lint-staged` · `tsc --noEmit` · `check-ds-compliance.sh` · `check-csrf.sh` ·
`guardia-reduced-motion.mjs` · `guardia-coerenza-documenti.mjs`.

---

## 7. Lo stato del repo

Ramo **`ondata-b-schermate`**, **niente pubblicato su `origin`**, **albero pulito**.
Ultimi salvataggi della giornata: `fc7aaa45` (D67-D70) · `39acc667` (D71-D73) · `5289ac57` (D74-D75) ·
`993bc3ab` (spec) · `4eac7712` (memoria + roadmap + perimetri) · `1a509dcd` (i quattro mockup) ·
`74650ceb` (D76-D79) · `0f5207d2` (DS v3 rev. 3.3) · `9d4d6ef6` (**il piano**) · `3d0d3783` (ratifica).
**Guardia di coerenza: verde su 12 documenti vivi.**

🔴 **E una cosa che NON è ancora fatta e non va dimenticata:** **T8 dell'ondata (la rotta `DELETE`) è ancora
a cancellazione morbida.** L'handler lo dichiara per iscritto
(`src/app/api/lavori/[id]/immagini/[imgId]/route.ts:91-93`). È il **Task 4** di questo piano.

**Fuori da questo piano, ma dentro l'ondata (b), prima della pubblicazione:** la correzione del **DPA**
(**D62**) e **TOK-1 + CLI-1** (**D53** — 🔴 `portale_token` è nella proiezione **su `origin/main`**: quel
difetto è **vivo in produzione oggi**).
