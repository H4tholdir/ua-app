# Handoff — l'ondata (b) ha un piano: si fa validare dagli advisor, poi si esegue

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi
**il piano `docs/roadmap/2026-07-28-ondata-b-piano.md` (e la sua §9 per prima)**. Il resto solo se serve.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **REGOLE DI PIANO R-P1/R-P2/R-P6** ·
**REGOLE DI ESECUZIONE R-E1/R-E2** · **BP-1**.

> 🛑 **Sostituisce `docs/roadmap/2026-07-28-ondata-b-piano-handoff.md`**, che resta come storia della
> giornata del disegno. Quello racconta **come si è arrivati alle decisioni**; questo dice **cosa fare
> adesso**.

---

## 0. In una riga

**Trentadue decisioni ratificate, spec ratificata, quattro anteprime approvate, un piano scritto — e il
piano dichiara di NON essere eseguibile.** Zero righe di codice. Banca dati toccata **solo in lettura**
per l'intera giornata, baseline riverificata dopo ogni sonda: **294 lavori · 0 denti · 916 pazienti ·
48 colori**.

---

## 1. 🛑 LA PRIMA COSA DA FARE — richiesta esplicita di Francesco (28/07, chiusura)

> «nella nuova sessione facciamo controllare da advisor specializzati il piano da eseguire e tutti i
> passaggi successivi»

**Il piano NON si esegue prima di un panel di advisor.** È anche la **Regola Advisor** (`ua-app/CLAUDE.md`
§0C): ogni decisione significativa va validata da **2-3 advisor con prospettive diverse PRIMA** della
ratifica — e un piano di venti task su percorso GRANDE è la decisione più significativa che ci sia.

**Composizione suggerita (dominio → lente), da adattare:**
| advisor | cosa deve cercare |
|---|---|
| **solution-architect** | l'ordine dei task regge? T3 (`sequenzaPassi` + `cosaSiPerde`) è davvero **una funzione sola**, o si sta nascondendo un secondo motore? La bozza `v:2` è una migrazione di stato mascherata? |
| **appsec-auditor** | il `DELETE` nuovo sulle immagini · il filtro di tenant su `q=` · l'indice unico **per laboratorio e mai globale** · la deroga D7 sui nomi a schermo |
| **backend-api** / **data-engineer** | la lettura «ultimo lavoro» in una sola andata (P6) · la migration e il suo rollback · il drift noto della CHECK su `bite_splint` |
| **ux-designer** | la fila a pagine · le due conferme · il passo foto che può restare vuoto · l'accessibilità della testata a 44 px |

**E il panel deve ricevere un mandato scritto, non un «che ne pensate»:** *cercate dove il piano sbaglia*.
È il meccanismo che nell'ondata (a) ha reso visibili **8 difetti su 8**.

⚠️ **Poi servono anche i panel già dichiarati aperti** (piano §9): il **panel normativo** sul `DELETE`
soft-o-hard (Art. 10(8) MDR contro la direttiva «ogni campo si corregge fino alla consegna»).

---

## 2. Dove sta ogni cosa

| documento | cosa contiene |
|---|---|
| **`docs/roadmap/2026-07-28-ondata-b-piano.md`** | **il piano**: 20 task, registro letture (R-P2), censimento identificatori (R-P6), registro prove (R-P1), e **§9 «cosa manca»** |
| `docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md` | la **spec ratificata** |
| `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` | il **verbale, D1-D32 in cinque tornate**, con le parole di Francesco e le prove |
| `docs/design/mockups/2026-07-28-wizard-testata-uscita.html` | testata: la **§5 è la forma definitiva**, ed è **viva** (la fila si trascina). Le sezioni prima sono la storia delle alternative |
| `…-wizard-passo-foto-e-cassetta.html` · `…-wizard-avviso-codice-gia-in-uso.html` | foto/cassetta e avviso: la **§3 / §2** portano la forma scelta |
| `docs/design/mockups/screenshots/ob-*.png` | **92 screenshot** (contati: `git ls-files … | grep -c ob-`), 390/768/1280 × chiaro/scuro |
| `docs/roadmap/2026-07-28-ondata-b-piano-handoff.md` | la **storia** della giornata del disegno (superato da questo) |

---

## 3. Cosa manca al piano — l'elenco, per non riscoprirlo

Sta in **§9 del piano**, e non è un dettaglio: è la ragione per cui il piano non parte.

1. **10 file `NON letto`**, fra cui **4 file di test che si romperanno di sicuro**
   (`WizardNuovoLavoro.test.tsx`, `PassoPaziente.test.tsx`, `PassoTipo.test.tsx`,
   `wizard-persistenza.test.ts`).
2. **4 sonde da eseguire**: P3 (la proiezione ridotta non rompe `crea-lavoro.ts:213`) · P5 (cancellare una
   riga di `lavori_immagini` toglie anche il file, o lo lascia orfano?) · P6 (costo della query «ultimo
   lavoro») — più P2 da **rieseguire** immediatamente prima della migration, perché decade col tempo.
3. **Il censimento dei token orfani** (`pillVoce`, `coreografie:56`, le regole CSS) **non è stato fatto**.
4. **3 domande aperte** (§9 del piano): `DELETE` soft o hard · il tetto libero delle foto da misurare su un
   device vero · la chiave di `localStorage` cambia nome o no.

✅ **Già provate, non rifarle:** **P1** (l'indice unico rifiuta davvero, col messaggio incollato **e** il
controllo positivo fra due laboratori) · **P2** (0 duplicati su 916 pazienti, il 28/07 sera).

---

## 4. Le cose che questa giornata ha imparato e che valgono nel codice

Cinque, tutte trovate **misurando o guardando**, non ragionando. Chi scrive la testata le eviti tutte:

1. **`text-overflow: ellipsis` non funziona dentro un contenitore flex** — il testo si taglia a metà
   lettera, senza puntini. La pastiglia dev'essere un **blocco**.
2. **`justify-content: flex-end` su un contenitore che scorre rende IRRAGGIUNGIBILE** ciò che esce dal
   bordo sinistro.
3. **Una fila che scorre taglia sempre il bordo.** Il modello a **pagine** è l'unico che non taglia — ed è
   per questo che icone e sfumature sono decadute (D31).
4. **Le frecce di pagina rubavano 68 px su 230**: misurato, tolte.
5. **La larghezza vera arriva DOPO il primo disegno** (vista a schermo intero, passi larghi): un flag
   «primo giro» lascia la testata mezza vuota.

E la lezione di metodo della serata, che vale oltre il codice:
> **D22 è stata scritta tre volte. Solo al terzo giro si è visto che il modello giusto rendeva inutili le
> due cose aggiunte per rattoppare i primi due.** Quando servono dei rattoppi, spesso è il modello a essere
> sbagliato.

---

## 4-bis. Fatti già verificati — NON riscoprirli, e soprattutto non «ritrovarli»

Aprendo i file, non per sentito dire. L'elenco lungo sta in **`2026-07-28-ondata-b-piano-handoff.md` §4**;
qui i cinque che una sessione nuova rischia di rifare da capo:

| fatto | prova |
|---|---|
| **La colonna del wizard è bloccata a 480 px** → **768 e 1280 si comportano IDENTICI** (320 px alle briciole contro 230 a 390). Lo spazio vero arriva **sui passi larghi** (D14), non sui dispositivi grandi | `WizardNuovoLavoro.tsx:533-538` |
| 🚫 **Il «difetto» del colore delle cassette NON ESISTE — R11 è ritirato.** Il doppio formato (sei parole **oppure** esadecimale) è **previsto**: `normalizzaColore` accetta entrambi e nient'altro, `facciaHex` traduce già le parole. **Chi lo rivede in banca dati non lo segnali di nuovo** | `src/lib/cassette/colore.ts:6,11` · `v3/tokens.ts:121-128` · `ds-v3.css:494-499` |
| 🔴 **R12 — un'immagine del lavoro non si può cancellare:** la route espone **solo `PATCH`**. Caricarne più d'una è già possibile (`lavori_immagini` è una tabella), toglierne una no | `api/lavori/[id]/immagini/[imgId]/route.ts` |
| **Le etichette delle foto esistono già** (sei valori) e si cambiano già: il wizard è l'unico posto che manda `descrizione: 'impronta'` **fissa** | `TabImmagini.tsx:15-22` · `crea-lavoro.ts:333` |
| **Le molle esistono già** (`snappy`, `smooth`, `bouncy`, `press`, `wizard`): nessuna animazione si inventa, nessun `duration` inline | `v3/motion.ts:24-30` |

⚠️ **E un drift noto, ereditato, che T4 deve conoscere:** `tipi-lavoro.ts:12-15` dichiara che **nessuna CHECK
a banca dati contiene `bite_splint`** — deferito a una sessione DB dedicata. T2 non lo tocca (aggiunge flag,
non valori di `macro`), ma chi scrive la migration lo sappia.

---

## 5. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su tutte le route): si fa `git checkout -b`.
⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit → `/usr/bin/trash .next`.
⚠️ I **backtick nel messaggio di commit vengono eseguiti dalla shell** → messaggi lunghi con `-F` da file.
⚠️ `.gitignore` ignora `*.png` → `git add -f`.
⚠️ La cancellazione ricorsiva è bloccata fuori dalle cartelle temporanee, **e il blocco legge l'intero
comando** (scatta anche dentro un messaggio di commit).
🔑 **Mockup nel browser:** `file://` è bloccato per Playwright → `python3 -m http.server 8899` dentro
`docs/design/mockups/`, poi `127.0.0.1`.
🔑 **`fileURLToPath`, mai `new URL(...).pathname`**: il percorso del disco contiene uno spazio.
🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — 🛑 **non è nel repo**, vive solo su questo disco.
🔑 **Le sonde girano su tabella temporanea o transazione annullata**, MAI su una migration registrata.
🛑 **Lasciare il database alla baseline** e riverificarla: **294 · 0 · 916 · 48**.

---

## 6. Lo stato del repo

- **Diciassette commit su `main` locale non pubblicati** (contati: `git rev-list --count origin/main..main`), di cui **nove di questa sessione**. Solo documenti, mockup, screenshot, memoria.
- **Nessuna riga di codice dell'applicazione toccata** in tutta la giornata.
- **Nessun ramo aperto**: il ramo dell'ondata (b) lo crea **T1**, nel repo principale.
