# Handoff — ondata (b): le fondamenta sono in piedi, tocca al Blocco 3

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md`. **Il ledger operativo è `.superpowers/sdd/progress.md`:
i task che risultano completi lì SONO completi — non rieseguirli.**
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **R-P1/R-P2/R-P6** · **R-E1/R-E2** ·
**«il numero si dà subito»** (§0A-bis) · **BP-1**.

> 🛑 **Sostituisce `docs/roadmap/2026-07-30-ondata-b-apertura-handoff.md`**, il cui §0 («il cancello è
> aperto, T1 può aprire il ramo») è **assolto**. Quello resta come storia.

---

## 0. In una riga

**Ramo `ondata-b-schermate` aperto, sei task chiusi e revisionati (T1 · T4 · T2 · T3 · T5 · T7), l'indice
unico sul codice paziente è IN PRODUZIONE, e otto decisioni nuove sono a verbale (D38-D45).**
FASE 7 sul ramo, eseguita dal coordinatore: **`tsc` 0 · `vitest` 3754 passati / 19 saltati ·
`next build` exit 0**. **Nulla è pubblicato su `origin`.** Baseline **294 · 0 · 916 · 48**.

---

## 1. Che cosa esiste ora, e a che cosa serve

| pezzo | dove | a che cosa serve |
|---|---|---|
| **T4** il contratto dei passi | `src/lib/wizard/passi.ts` | il passo si identifica **per NOME, mai per indice** — una bozza sopravvive più di un rilascio, e riaperta per indice riaprirebbe **sul passo sbagliato coi dati giusti** |
| **T2** i 38 tipi parlanti | `src/lib/domain/tipi-lavoro.ts` | `prevedeDenti` · `prevedeColore: 'catalogo' \| 'libero' \| 'nessuno'` · `prevedeArcata` |
| **T3** la macchina | `src/lib/wizard/sequenza-passi.ts` | `sequenzaPassi(tipo)` e **`cosaSiPerde(precedente, successivo)` a due STATI** (D17) |
| **T5** il divieto | migration `20260729140000` | l'indice unico **in produzione**: `(laboratorio_id, lower(btrim(codice_paziente)))`, **senza filtro di stato** |
| **T7** il riconoscimento | `src/lib/domain/codice-paziente-unicita.ts` | `trovaOccupanteCodice` — **stessa portata dell'indice**: niente `cliente_id`, niente `limit`, niente stato |

---

## 2. 🔑 Le cinque lezioni di questa sessione — valgono più dei sei task

1. 🛑 **Una prova può essere TAUTOLOGICA, e la misura R-P4 non la vede.** In T4 un test attendeva
   `!isPrimoPasso(...)` mentre l'implementazione **è** `!isPrimoPasso(...)`: non poteva fallire mai. E
   contro l'abbozzo inerte **si accendeva**, quindi il conteggio `N su M` la dava per buona.
   ➡️ **La forza di un test si misura contro lo stub E contro l'implementazione vera.** Valori attesi
   **scritti a mano**, sempre.
2. 🛑 **Una FINTA può essere infedele proprio sull'asse che conta.** In T7 la finta simulava `ILIKE` con
   `.includes()` di JavaScript: capace di far fallire una regressione di **portata** (un `limit`, un
   filtro di stato), **strutturalmente incapace** di vedere la semantica dei metacaratteri — ed è lì che
   si nascondeva il difetto vero (il backslash). ➡️ **Quando sposti la fonte di verità, chiediti se la
   finta la segue.**
3. 🛑 **Un numero misurato sui DATI DI PROVA non diventa una regola di prodotto** (D45, rilievo di
   Francesco). Prima di farne una regola si chiede **da dove viene**: dal **codice** (allora vale anche
   domani) o dai **dati** (allora sparisce con la pulizia, `ua-app/CLAUDE.md` §8).
   🔑 Esempio vivo: le 911 schede senza cognome **non sono dati sporchi** — sono
   `src/lib/wizard/crea-lavoro.ts:229-230`, che scrive il codice dentro `cognome` e `nome: ''` **fissi**.
4. 🛑 **Il piano continua a portare coordinate stantie: sei trovate in questa sessione**, tutte aprendo il
   file. `:362-364`→`:363-371` · `:74-76`→`:86-88` · `~15 etichette`→**9** · `Duplicato protesi` **non**
   è fra le lunghe · `nome-paziente-scrittura.ts`→**`parco-shared.ts:69`** · `:209`→`:250`.
   ➡️ **In un brief, le righe si riverificano al momento di scriverlo.**
5. 🛑 **Un solo scrittore per volta sul ramo.** Un `git add -A` del coordinatore ha inglobato i file che un
   esecutore stava preparando (`b31ca1c5`): contenuto integro, storia sporca, **non riscritta** perché
   c'era un esecutore vivo. ➡️ **Commit coi percorsi espliciti** (`git commit -F msg -- <percorsi>`), e i
   revisori (che leggono) possono girare in parallelo, gli implementatori no.

---

## 3. Le otto decisioni nuove (D38-D45) — in una riga ciascuna

- **D38** la cassetta creata dal wizard **nasce col lavoro**, non prima → **T18 sbloccato**, forma
  dell'atomicità da decidere lì.
- **D39** briciola troppo lunga → **nome corto dedicato**; le etichette oltre i 17 caratteri sono **9**,
  e la misura vera è **in pixel, dentro T11**.
- **D40 → D42** il colore **non dentale** (placca · apparecchio funzionale · paradenti): **niente passo
  nell'ondata (b)**, tavolozza **nominata** in ondata propria (**roadmap voce 6**), catalogo **separato**.
- **D41** niente colore sulla **dima chirurgica**.
- **D43** l'indice unico **si applica subito in produzione** (P2 rieseguita nello stesso turno).
- **D44** la ricerca pazienti restituisce **quattro** chiavi (`id, codice_paziente, alias, ultimoLavoro`)
  e filtra su **`codice_paziente | cognome | nome`**, mai `nome_cognome`. **B2 emendata.**
- **D45** quando la ricerca **non trova nulla, lo dice** + la regola di metodo del §2.3.

---

## 4. 🔴 Che cosa NON è coperto — e chi lo eredita

| cosa | chi |
|---|---|
| **Il contratto FAIL-OPEN di `trovaOccupanteCodice`**: su errore risponde «libero». **Mai trattarlo come «sicuro scrivere»** — la rete vera è l'indice | **T15** |
| **Il «primo codice libero»** da proporre quando quello proposto è occupato (D36 lo dà per necessario) | **T15** / generatore |
| **Chi è il dentista dell'occupante** — fuori da D36, per ora | aperto |
| **`%chiave%` non usa mai l'indice btree**: irrilevante a 916 righe, collo di bottiglia **se T15 chiama a ogni battitura** → serve un ritardo | **T15** |
| **Lo stesso innesto «ultimo lavoro» servirà a T6**: attenzione a non farne **due copie** che decidono diversamente | **T6** |
| **La leva «si può saltare»** di `riparazione`/`ribasatura` (W17) non ha sede: la **sede** è un campo su `tipi-lavoro.ts` (è un default **per tipo**), il **consumo** sta in T21 — 🔴 **decisione di Francesco, non presa** | Francesco |
| **Un tipo scelto come TESTO LIBERO** cadrebbe nel ramo «id ignoto» → sequenza minima, **mai denti né colore**: difendibile ma **silenzioso** | **T21** |
| **`btrim` non toglie tabulazioni né spazi unicode**, `trim()` di JS sì: buco aperto solo per chi scrive **fuori dalle rotte** | primo importatore |

**Minori a verbale, per la review finale del ramo:** `SEQUENZA_CANONICA` non congelata a runtime · il
conteggio `23/47` di R-P4 in T4 è **a mano** · la tabella §2.3 di T3 è 2 righe + una regola inline ·
l'ordine di ritorno di `cosaSiPerde` è **per causa**, non per ordine dei passi · `NomeDatoPerso` e
`NomePasso` divergono su singolare/plurale (`colori` vs `colore`) · in T2 i `typeof … === 'boolean'` sono
quasi vacui (la guardia vera è lunghezza fissa + fixture a 38 chiavi + `tsc`).

---

## 5. Da dove si riparte

**Blocco 3, nell'ordine:** **T6** (`GET /api/pazienti?q=` — ora **sbloccato da D44**, e §4-ter del piano
dice cosa resta da sciogliere **dentro** T6: piano e spec non concordano su **quando** la proiezione
stretta si applica) · **T8** (`DELETE` immagine soft + **otto letture**).
Poi **Blocco 4** (T9 · T10), **Blocco 5** (T11 · T12 · T13), **Blocco 6** (T14-T21), **Blocco 7** (T22 ·
T23 col **gate estetico L2**).

🚧 **Restano dietro gate, e non li sblocca il codice:** i **mockup di denti e colore** (T19/T20, da
riverificare in larghezza, D14) · la **portata della guardia B7** (T13: «zero occorrenze» copre anche
commenti e `docs/`? se sì i file passano da **17 a 21**).

---

## 6. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su tutte le route): `git checkout -b`.
🛑 **Mai `git add -A`** finché un esecutore è vivo: `git commit -F <messaggio> -- <percorsi>`.
⚠️ Per un file **non ancora tracciato** serve `git add` prima del commit con pathspec.
⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` → `/usr/bin/trash .next`.
⚠️ I **backtick nel messaggio di commit vengono eseguiti dalla shell** → `-F` da file.
⚠️ `.gitignore` ignora `*.png` → `git add -f`.
🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — 🛑 **non è nel repo**, vive solo su questo disco.
🔑 **Il server MCP di Supabase NON è autenticato** in questa sessione.
🔑 **Le sonde girano in transazione annullata o su tabella temporanea**, MAI su una migration registrata.
🛑 **Lasciare il database alla baseline** e riverificarla: **294 · 0 · 916 · 48**.
🔑 La tabella dei colori è **`colori_dentali`**, non `colori`.
⚠️ **`ANALISI/` vive FUORI dal repo git.**
⚠️ **Date:** i documenti e i nomi di file datati «30 luglio» stanno su commit **del 29** — dichiarato nel
verbale (nona tornata), **nessuna rinomina retroattiva**.

---

## 7. Lo stato del repo

- Ramo **`ondata-b-schermate`**, aperto da `b4b09d52` su `main`. **Niente pubblicato su `origin`**:
  il push su `main` innesca il deploy, e **non è stato chiesto**.
- **`main` è allineato con `origin/main`** (il ramo porta anche due commit di documenti nati su `main`).
- **45 decisioni in nove tornate** nel verbale. Guardia di coerenza **verde**.
