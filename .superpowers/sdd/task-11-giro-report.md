# Task 11 — Il PRIMO giro end-to-end del percorso prescrizione + FASE 9

**Quando:** 5 agosto 2026. **Ramo:** `ondata-b-sessione-3` (repo principale, MAI worktree).
**Mandato:** PROVARE, non correggere. Ogni difetto trovato è RIFERITO con la sua prova (R-E2).
**Perché conta:** handoff ② §0① — «il percorso nuovo in produzione è MORTO finché la ③ non lo
accende, e nessun giro end-to-end l'ha mai percorso». Questo è quel giro.

---

## 0. Il banco

| Cosa | Come | Esito |
|---|---|---|
| Server di collaudo | `PORT=3020 npm run dev` | `GET /login` → **200** |
| Guardia stili (build vera, non stantia) | `node scripts/guardia-stili-collaudo.mjs` | **exit 0** — `CSS con errore: nessuno` · `{"uaBg":"#f4f0e7","bodyBg":"rgb(244, 240, 231)","bgToken":"#f4f0e7"}` · «✅ stili applicati davvero» |
| Accesso senza password (D103) | `BASE=http://localhost:3020 npx tsx scripts/tmp/link-accesso-locale.ts h4t@live.it /dashboard` | link monouso → `http://localhost:3020/dashboard`, titolo «UÀ che lab!» |
| Browser | Playwright, browser PERSISTENTE su CDP 9222 (`scripts/tmp/banco-avvia.mjs`), viewport del giro **390×844 @2x**, `document.fonts.ready` prima di ogni scatto | — |
| Utente | `h4t@live.it` → `utenti.id = eb161af4-…`, ruolo `titolare`, lab `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` («Filippo Opromolla») | — |

**Metodo del tema (dichiarato, come chiesto dal mandato).** Il CSS di questa app **non** ascolta
`prefers-color-scheme`: il tema è la classe `dark` + l'attributo `data-theme` su `<html>`
(`globals.css:7` `@custom-variant dark (&:is(.dark *))`, `ds-v3.css:51`
`[data-theme="dark"] [data-ds="v3"]`). A scriverli sono due punti soli — lo script inline di
`ThemeInitializer` (prima della prima pittura) e `applicaAlDocumento` di `useTheme`. Ma `useTheme`
è montato **solo** in `ui/sonner.tsx` e `impostazioni/SceltaTema.tsx`, e **nessuno dei due sta sulle
pagine del giro**: cambiare la sola media query a pagina aperta non ridipinge nulla, e ricaricare
chiuderebbe i fogli aperti. Quindi ogni scatto scuro scrive **le stesse due righe di
`applicaAlDocumento`** ed emula in più `prefers-color-scheme: dark` perché le due fonti restino
coerenti. Nessun colore di questa ondata è letto da JS (i componenti importano solo
`tipografia/spazio/raggio` da `v3/tokens.ts`: i colori arrivano tutti da variabili CSS), quindi
l'attributo è la leva vera. **Ogni scatto verifica `document.documentElement.getAttribute('data-theme')`
prima di scattare e fallisce rumorosamente se non combacia col nome del file** — un PNG chiaro
chiamato `-scuro` è esattamente la misura falsa che questo repo ha già pagato due volte.

---

## 1. Baseline PRIMA del giro (misurata, non ricordata)

`node scripts/tmp/sql.mjs "SELECT 'lavori' AS t, count(*)::int AS n, max(created_at)::text AS ultimo FROM lavori WHERE deleted_at IS NULL UNION ALL …"`

```
[
  { "t": "lavori",              "n": 295, "ultimo": "2026-07-31 16:21:15.263846+00" },
  { "t": "lavori_prescrizioni", "n": 0,   "ultimo": null },
  { "t": "lavori_immagini",     "n": 5,   "ultimo": "2026-07-31 18:46:32.880458+00" },
  { "t": "lavori_denti",        "n": 3,   "ultimo": "2026-07-31 16:27:42.164331+00" },
  { "t": "clienti",             "n": 39,  "ultimo": "2026-05-20 05:12:15.467857+00" }
]
```

> **`lavori_prescrizioni` = 0.** La tabella esiste dalla ② e non ha **mai** avuto una riga: la prova
> più secca che l'handoff ② §0① diceva il vero.

Nulla è nato dopo il 31/07: ogni riga con `created_at` del 5 agosto è, per costruzione, roba di
questo giro. Il registro degli id creati è tenuto passo per passo (§ sotto) e la pulizia cancella
**per id**, non per data.

---

## 2. 🛑 Il primo difetto: sul banco in `npm run dev` il foglio P37 **non si può usare**

**Prima ancora del giro.** Nel lab di prova (`971061a1…`, «Filippo Opromolla») ci sono **18 clienti,
tutti con `studio_nome`, e nessuno studio condiviso da due**: `GET /api/clienti/76115a50…/studio-members`
→ `200 []`. Il gate del wizard (`WizardNuovoLavoro.tsx:330`, `if (altri.length === 0)`) manda quindi
avanti al Passo 2 **senza aprire il foglio** — coerente con la decisione dichiarata nel report del
Task 10 §2, **ma incompatibile con la riga del mandato** («il foglio deve salire con ALMENO il toccato
anteposto»). Per poter percorrere il resto del giro si è creato dal wizard stesso un collega di studio,
**Bianchi Marta** (`clienti.32c7c527…`, studio «Dental Center s.r.l. uninominale»), poi cancellato in
pulizia.

**Poi il difetto vero.** Con il collega in casa, `studio-members` torna una riga — e **il foglio sale e
si richiude da solo dopo ~80 ms**, mandando avanti il wizard. Traccia a 80 ms di passo:

```
0ms passo1 … 320ms passo1 | 405ms P37 | 480ms passo2 | … | 2880ms passo2
```

Chi lo chiude, con lo stack:

```
763ms pushState {"uaSheet":true}
763ms history.back()  ←  at esciOverlay (…) | at Sheet.useEffect (…)
764ms pushState {"uaSheet":true}
781ms POPSTATE  → alPop() → chiudi() → chiudiSheetPrescrittore() → avanzaConCliente()
```

**Meccanismo:** `ChiHaPrescrittoSheet` è montato con `key={chiavePrescrittore}`, e la chiave viene
incrementata subito prima dell'apertura (`WizardNuovoLavoro.tsx:345-347`) — quindi il componente si
**rimonta**. In `npm run dev` Next.js accende React StrictMode, che su un mount **invoca l'effect due
volte**: `entraOverlay` → cleanup `esciOverlay` (che chiama `history.back()`, **asincrona**) →
`entraOverlay` di nuovo. Il `back` in volo arriva **dopo** il secondo `pushState` e si mangia l'entry
appena spinta: `alPop` chiude il foglio.

**`provato:` sulla BUILD DI PRODUZIONE lo stesso gesto tiene il foglio aperto** (`npm run build` exit 0 →
`PORT=3020 npm run start`; traccia: `499ms pushState {"uaSheet":true}` e poi `P37` fino a 2402 ms,
`P37 aperto ORA: true`). Quindi **non è un difetto di produzione** — è un difetto **del banco**, e conta
lo stesso: il banco è dove si collauda a mano, e lì questa funzione è inservibile. Resta inoltre come
fragilità latente: **rimontare un `Sheet` aperto lo chiude**, perché `esciOverlay` spara un
`history.back()` che nessuno annulla.

> **Deviazione dalla ricetta del banco, dichiarata:** dal punto 2 in poi il giro gira contro la
> **build di produzione** servita sulla stessa porta 3020 (`npm run build` → `npm run start`), non
> contro `npm run dev`. La guardia degli stili è stata **rilanciata su quel server** ed è verde
> (exit 0, stessi valori). È anche la configurazione più onesta per un giro che esiste per rispondere
> alla domanda «il percorso in **produzione** funziona?».
---

## 3. Il giro, passo per passo (output DB VERO incollato)

### Passo 1 — Accesso
Link monouso generato con la chiave di servizio, aperto sul banco: `→ http://localhost:3020/dashboard`,
titolo «UÀ che lab!». Nessuna password digitata (D103). ✅

### Passo 2 — Wizard `/lavori/nuovo`

| | |
|---|---|
| Passo 1 | tile **«Dental Center s.r.l. uninominale»** (cliente `76115a50…`, Esposito Ciro) |
| Foglio P37 | sale con **2 righe** — «Esposito Ciro» (**il toccato, anteposto**) e «Bianchi Marta»; sottotitolo col conteggio VERO: *«Da Dental Center s.r.l. uninominale risultano 2 medici. Sulla Dichiarazione va il nome della persona, non dello studio.»* |
| Scelto | **Esposito Ciro** |
| Passo 2 | tipo **«Corona zirconia»** (protesi fissa) |
| Passo 3 | Elemento **2.6** · Colore **A3** (del catalogo) |

**Scatti:** `p37-chi-ha-prescritto-{390,768,1280}-{chiaro,scuro}.png` ·
`passo3-riga-colore-chiusa-*` (variante B: *«Colore — come scritto sulla prescrizione · es. A2»* col
link quieto «Salta») · `passo3-riga-colore-aperta-A3-*` (framing aperto: *«COLORE — COME SCRITTO SULLA
PRESCRIZIONE»*, riga d'aiuto *«Quello che scrivi qui vale come **trascrizione** del foglio del dentista,
e finisce così sulla Dichiarazione»*, e il quieto *«Non è sulla prescrizione: lo scegliamo noi»*).

**Le righe medico in dark sono VISIBILI** — guardate, non dedotte, e misurate:

```
chiaro: riga #FFFEFA su pannello #FFFEFA, con ombra;  testo #1D1913
scuro : riga #2B2620 (--elv) su pannello #211D18 (--sfc), inset chiaro; testo #F2EEE7
```

cioè in scuro la riga è una **superficie più chiara** del pannello (DS v3 §3.2, «in dark l'elevazione
è una superficie, mai un'ombra») — il rimedio del gate L2 del 22/07 (`ds-v3.css:100`) fa il suo lavoro.

### Passo 3 — «Fatto!» e la PRIMA riga di `lavori_prescrizioni` mai nata

Payload vero del POST (dal browser, non ricostruito):

```
→ POST /api/lavori
{"cliente_id":"76115a50-aed8-4d54-b8ff-1d52c211ae5b","paziente_id":"39068991-…","tipo_dispositivo":"protesi_fissa",
 "descrizione":"Corona zirconia","data_consegna_prevista":"2026-09-04","classe_rischio":"classe_iia",
 "richiedente_nome":"Esposito Ciro","istituzione_sanitaria":"Dental Center s.r.l. uninominale",
 "denti":[{"fdi":26,"ruolo":"elemento","provenienza":"prescritto"}],"colore_codice":"A3","prescrizione":{"colore":"A3"}}
← 201 {"lavoro":{"id":"941e7cfa-b779-4978-bb18-cd6c42f9a44a","numero_lavoro":"2026/0012","stato":"ricevuto"},"colore_scartato":false}
```

A schermo, le **due carte** (scatti `fatto-due-carte-*`):
*IL LAVORO* → DENTISTA · **PRESCRITTO DA: Esposito Ciro** · LAVORO · PAZIENTE ·
*LA PRESCRIZIONE* → ELEMENTI **dente 26** ✓ DALLA PRESCRIZIONE · COLORE **A3** ✓ DALLA PRESCRIZIONE ·
FOGLIO DEL DENTISTA **DA ALLEGARE** (ambra).

A DB:

```
lavori_prescrizioni
  contenuto  = {"colore": "A3", "elementi": [26]}      ← elementi dedotti dal dente 2.6 → FDI 26
  fonte_tipo = null   fonte_immagine_id = null   divergenze = []
lavori
  numero_lavoro='2026/0012'  richiedente_nome='Esposito Ciro'
  istituzione_sanitaria='Dental Center s.r.l. uninominale'  colore_codice='A3'  stato='ricevuto'
lavori_denti
  fdi=26  ruolo='elemento'  provenienza='prescritto'
```

✅ Tutto come atteso. **`lavori_prescrizioni` passa da 0 righe (mai nessuna) a 1.**

### Passo 4 — Il foglio a2 e la fonte allegata

CTA **«Allega la prescrizione»** → foglio con le **tre voci** (scatti `foglio-a2-allega-prescrizione-*`):
«Scatta una foto» · «Dalla galleria o un PDF» · «Non ce l'ho ancora qui». Caricata dalla galleria
un'immagine di prova (PNG 800×1100, 74.816 byte, generata su canvas).

```
POST /api/lavori/941e7cfa…/immagini            → 201  id=3a74c8de-6477-4e67-bdc9-350106aa0388
                                                     storage_path=lavori/941e7cfa…/1785892183019.png
POST /api/lavori/941e7cfa…/prescrizione/fonte  → 200  {"fonte":{"fonte_tipo":"foglio",
                                                     "fonte_immagine_id":"3a74c8de-…","fonte_riferimento":null}}
```

A DB:

```
lavori_immagini      categoria = 'prescrizione'   nome_file = 'prescrizione-prova.png'
lavori_prescrizioni  fonte_tipo = 'foglio'  fonte_immagine_id = '3a74c8de-6477-4e67-bdc9-350106aa0388'
```

A schermo la riga diventa **verde** — «✓ ALLEGATA · FOGLIO A MANO», con la miniatura — e il CTA rosso
torna a essere **«Fotografa l'impronta»**. Scatti `fatto-fonte-verde-*`. ✅

### Passo 5 — Scheda del lavoro, riga Colore, e il typo (D212)

Scheda `/lavori/941e7cfa…`: riga **COLORE A3** con pastiglia **«✓ DALLA PRESCRIZIONE»**
(scatti `scheda-riga-colore-pastiglia-*`). Toccata la riga: il foglio dice
*«Adesso è A3 — trascritto dalla prescrizione di Dental Center s.r.l. uninominale.»*
Scritto **B1** → Salva → **sale D212** (scatti `d212-domanda-colore-*`):

> **Era scritto così sulla prescrizione?** *Il colore di questo lavoro è trascritto dal foglio di Dental
> Center s.r.l. uninominale. Dimmi che cosa sta succedendo, così la Dichiarazione dice la verità.*
> `A3 TRASCRITTO → B1 NUOVO` · «Sul foglio c'è scritto B1 — avevo copiato male: correggo la trascrizione»
> · «No: lo stiamo cambiando noi — il foglio resta A3…» · «Lascia stare, non cambio niente»

Scelta la **prima** (typo):

```
POST /api/lavori/941e7cfa…/prescrizione/typo → 200 {"updated_at":"2026-08-05T01:14:11.398841+00:00"}
PATCH /api/lavori/941e7cfa…                  → 200 {"lavoro":{…,"updated_at":"2026-08-05T01:14:12.199433+00:00"}}
```

A DB, subito dopo:

```
lavori_prescrizioni  contenuto = {"colore": "B1", "elementi": [26]}   divergenze = []
                     updated_at = 2026-08-05T01:14:11.398Z   (prima: 01:09:44.164Z)
lavori               colore_codice = 'B1'
                     updated_at = 2026-08-05T01:14:12.199Z   (prima: 01:07:36.642Z)
```

✅ **Entrambi**: la trascrizione e il colore vivo — l'adjudicazione ① regge, e nessuna divergenza è nata
(un typo non è una divergenza). La pastiglia resta «✓ DALLA PRESCRIZIONE», che è la verità.

### Passo 6 — La divergenza («lo stiamo cambiando noi»)

Riaperto il foglio Colore, scritto **A2** → Salva → D212 → **«No: lo stiamo cambiando noi»** → sale il
foglio motivo (scatti `foglio-motivo-divergenza-*`):

> **Perché cambia?** *Il prescritto resta B1, il realizzato diventa A2. Una riga di motivo, e la
> differenza è coperta.* — «Me l'ha chiesto il dentista» · **«Esigenza tecnica»** · «Materiale non
> disponibile» · «Altro» · NOTA (SE SERVE) · **REGISTRA IL CAMBIO** (disabilitato finché non si sceglie:
> *«Scegli prima perché il colore cambia»*)

```
PATCH /api/lavori/941e7cfa…                        → 200 {…"updated_at":"2026-08-05T01:15:02.003627+00:00"}
POST  /api/lavori/941e7cfa…/prescrizione/divergenza → 200 {"divergenze":1}
```

A DB, **misurato in quel momento**:

```
lavori_prescrizioni.contenuto  = {"colore": "B1", "elementi": [26]}     ← INVARIATO, come deve
lavori_prescrizioni.divergenze = [
    { "nota": null, "campo": "colore", "motivo": "esigenza_tecnica",
      "utente_id": "eb161af4-0232-4e8e-b0e2-3283d551e2fd",
      "registrata_at": "2026-08-05T01:15:02.339418+00:00" }
]                                                   ← UNA voce sola, col dizionario chiuso
lavori.colore_codice = 'A2'                         ← il colore VIVO
```

`utente_id` combacia con l'utente del banco (`utenti.id` di `h4t@live.it`). A schermo la riga diventa
**«COLORE A2 · prescritto: B1»** — la pastiglia sparisce, perché non è più «dalla prescrizione». ✅

> ⚠️ **Nota di lettura:** al passo 8 le tre prove del gettone hanno aggiunto **altre due voci**
> (`materiale_non_disponibile`, `altro`) e portato il colore vivo a **D2**. Lo stato finale del lavoro
> prima della pulizia è quindi `divergenze` = **3** e `colore_codice` = `D2`, con `contenuto.colore`
> sempre **B1**. Il passo 6 sopra è misurato **nel momento in cui è avvenuto**: è quello il verdetto.

### Passo 7 — La fonte non si può cancellare

Scheda → foto → visore → ⋯ → «Elimina foto» → conferma «ELIMINA»:

```
DELETE /api/lavori/941e7cfa…/immagini/3a74c8de-6477-4e67-bdc9-350106aa0388
  → 409 {"error":"Questa immagine è la fonte della prescrizione di questo lavoro — non si può eliminare
                  finché resta collegata.","motivo":"fonte_in_uso"}
```

Il codice è **409** e il motivo macchina è **`fonte_in_uso`**; la frase all'utente è quella umana sopra
(scatti `errore-fonte-in-uso-*`). E la foto **non è sparita**:

```
lavori_immagini  id=3a74c8de-…  categoria='prescrizione'
                 storage_path='lavori/941e7cfa…/1785892183019.png'   deleted_at = null
```

✅ Il pre-check fail-closed del Task 8 regge dal vivo.

### Passo 8 — Il gettone: **NON riprodotto** (risultato negativo, dichiarato)

Il foglio «Tecnico assegnato» del banco è **vuoto**: nel lab non esiste nessun utente con ruolo
`tecnico` (solo due `titolare`) — **fatto d'ambiente, non difetto**. Si è quindi provato il gettone su
**due** sequenze equivalenti, entrambe senza ricaricare la pagina:

1. **PATCH della data di consegna → subito modifica del colore** → PATCH `200`, divergenza `200`
   (`{"divergenze":2}`). Nessun «modificato da qualcun altro».
2. **`POST …/prescrizione/divergenza` → subito un'altra modifica del colore** → PATCH `200`,
   divergenza `200` (`{"divergenze":3}`). Nessun conflitto.

**Meccanismo osservato:** la `PATCH /api/lavori/[id]` risponde sempre con l'`updated_at` fresco e il
client lo riprende, quindi in queste due vie il gettone non resta mai indietro. **Sono due degli
inneschi possibili del Minor censito, non tutti:** il rilievo **non è confutato**, è **non riprodotto qui**.

> Nota: dal secondo cambio in poi **D212 non risale** — si va dritti al foglio motivo, perché il lavoro
> è già in stato divergente. È il comportamento voluto («D212 mai da stato divergente», Task 7).
---

## 4. FASE 9 — gli scatti

**60 file** in `docs/design/screenshots/2026-08-05-ondata-b3-giro/`: **10 superfici × 3 viewport
(390 · 768 · 1280) × 2 temi (chiaro · scuro)**, tutti a densità **2×** (`Emulation.setDeviceMetricsOverride`
via CDP — riattaccandosi a un browser vivo Playwright perde il `deviceScaleFactor` del contesto:
misurato, `devicePixelRatio` tornava 1).

| Superficie | Prefisso del file |
|---|---|
| Foglio P37 «Chi ha prescritto?» | `p37-chi-ha-prescritto-` |
| Passo 3 — riga Colore CHIUSA (variante B) | `passo3-riga-colore-chiusa-` |
| Passo 3 — riga Colore APERTA col framing | `passo3-riga-colore-aperta-A3-` |
| «Fatto!» a due carte (fonte da allegare) | `fatto-due-carte-` |
| Foglio a2 «La prescrizione del dentista» | `foglio-a2-allega-prescrizione-` |
| «Fatto!» con la fonte VERDE | `fatto-fonte-verde-` |
| Scheda — riga Colore con la pastiglia | `scheda-riga-colore-pastiglia-` |
| D212 «Era scritto così sulla prescrizione?» | `d212-domanda-colore-` |
| Foglio motivo «Perché cambia?» | `foglio-motivo-divergenza-` |
| Errore «fonte in uso» sulla cancellazione | `errore-fonte-in-uso-` |

Ogni scatto è passato per **due controlli prima dello scatto**: `document.fonts.ready`, e la verifica
che `document.documentElement.getAttribute('data-theme')` sia davvero quello dichiarato nel nome —
altrimenti lo script **fallisce** invece di salvare un PNG che mente.

---

## 5. Difetti e rilievi (etichettati NUOVO / CONFERMA)

| # | Etichetta | Cosa | Prova |
|---|---|---|---|
| **G1** | **NUOVO** | **In `npm run dev` il foglio P37 sale e si richiude da solo dopo ~80 ms**, mandando avanti il wizard: la funzione è **inservibile sul banco**. Causa: `key={chiavePrescrittore}` fa **rimontare** il `Sheet`, StrictMode (acceso in dev) invoca l'effect due volte, e l'`esciOverlay` della cleanup spara un `history.back()` **asincrono** che si mangia l'entry appena ri-spinta. **Non si riproduce in build di produzione.** Fragilità latente che resta: **rimontare un `Sheet` aperto lo chiude.** | traccia con stack, §2 |
| **G2** | **CONFERMA** (Task 10 §2) **+ scarto brief-vs-codice** | Uno studio «di uno solo» **non apre il foglio P37**. Nel lab di prova questo è il caso di **tutti e 18** i clienti-entità: senza creare a mano un collega, il percorso P37 **non è raggiungibile**. Il codice fa ciò che il Task 10 ha dichiarato; il mandato di questo giro dice l'opposto («deve salire con ALMENO il toccato anteposto»). **Da adjudicare** (candidata al gate L2). | `GET …/studio-members` → `200 []`; `WizardNuovoLavoro.tsx:330` |
| **G3** | **NON RIPRODOTTO** (Minor «gettone stantio» della review finale) | Due sequenze provate (PATCH data → colore; `divergenza` → colore): **nessun 409**, perché la `PATCH /api/lavori/[id]` restituisce l'`updated_at` fresco e il client lo riprende. **Non è una confutazione**: sono due inneschi, non tutti. | §3, passo 8 |
| **G4** | **AMBIENTE, non difetto** | Il foglio «Tecnico assegnato» è **vuoto**: nel lab non esiste nessun utente con ruolo `tecnico` (due `titolare`). Il passo 8 del mandato è stato quindi girato su un altro campo. | `SELECT … FROM utenti WHERE laboratorio_id='971061a1…'` |
| **G5** | **NOTA DI PULIZIA** | `progressivi_anno(lab,'lavoro',2026)` è un **contatore memorizzato** (`genera_progressivo`: `INSERT … ON CONFLICT DO UPDATE progressivo+1`), **non** un `max()`. Cancellare il lavoro **non lo riporta indietro**: resta **12**, mentre nessun lavoro `2026/0012` esiste più. **Dichiarato, non «corretto»** — riavvolgere un contatore sarebbe una scrittura che nessuno ha chiesto. (`codice_paziente` invece si ricalcola da `max(PZ-…)`, `dati-wizard.ts:98-105`: quello torna da sé.) | sorgente RPC + `progressivi_anno` |

**Non-difetto, per il verbale:** il tasto primario dei fogli si chiama **«Salva»**, non «SALVA» — le
maiuscole sono `text-transform` del CSS. Un `getByRole('button', {name:/SALVA/})` non lo trova. È una
trappola per chi scrive script, non un problema di accessibilità (il nome accessibile c'è).

---

## 6. Pulizia — baseline PRIMA vs DOPO

Cancellazione **per id**, **fuori transazione**, nell'ordine dettato dalle FK `NO ACTION` censite
(`lavori_prescrizioni` tiene sia `lavoro_id` sia `fonte_immagine_id`, quindi va per prima).
Prima di cancellare, **enumerati tutti** i figli possibili del lavoro su 23 tabelle con FK: solo
**3** avevano righe (`lavori_prescrizioni` 1 · `lavori_denti` 1 · `lavori_immagini` 1), tutte le altre 0.

```
PRIMA: lavori 296 · lavori_prescrizioni 1 · lavori_immagini 6 · lavori_denti 4 · clienti 40 · pazienti 918
  lavori_prescrizioni: 1        storage.remove → rimosso (74.816 byte, eTag 01c6875743c2…)
  lavori_immagini: 1            storage.list della cartella dopo → []
  lavori_denti: 1
  lavori: 1
  pazienti: 1
  clienti: 1
DOPO:  lavori 295 · lavori_prescrizioni 0 · lavori_immagini 5 · lavori_denti 3 · clienti 39 · pazienti 917

RESTI (col nostro id):        tutti 0
NATI DOPO IL 04/08:           tutti 0
```

| Tabella | Baseline | Dopo | |
|---|---|---|---|
| `lavori` (non cancellati) | 295 | **295** | ✅ |
| `lavori_prescrizioni` | 0 | **0** | ✅ |
| `lavori_immagini` | 5 | **5** | ✅ |
| `lavori_denti` | 3 | **3** | ✅ |
| `clienti` (non cancellati) | 39 | **39** | ✅ |
| `pazienti` | 917 *(ricostruito: 918 meno l'unico nato dopo il 04/08 — è l'unica riga della baseline non misurata in anticipo)* | **917** | ✅ |
| **file nello storage** | — | cartella `documenti/lavori/941e7cfa…/` **vuota** | ✅ |
| `progressivi_anno('lavoro',2026)` | 11 | **12** | ⚠️ **non ripristinato, per scelta** (G5) |

**Il conteggio da solo non basta** — un id sbagliato cancellato più uno giusto creato pareggiano lo
stesso — quindi la conferma vera sono le due righe sotto: **nessuna riga col nostro id sopravvive** e
**nessuna riga di nessuna delle sei tabelle è nata dopo il 4 agosto**.

---

## 7. Verdetto

**Il percorso prescrizione, percorso per la prima volta da un client vero, FUNZIONA.** Dal tile del
dentista alla riga in banca dati, dalla fonte allegata al typo, dalla divergenza col suo motivo fino
al rifiuto della cancellazione: **otto passi su otto hanno fatto quello che dovevano**, e ogni passo
è verificato col dato vero in banca dati, non con quello che il codice dice di scrivere.

Le cose da portare a Francesco sono due, e nessuna delle due è nel percorso stesso:

1. **Sul banco in modalità sviluppo il foglio «Chi ha prescritto?» non si riesce a usare** (G1) —
   in produzione sì. Chi collauderà a mano deve saperlo, o penserà che la funzione sia rotta.
2. **Con i clienti che ci sono adesso quel foglio non comparirebbe mai** (G2), perché nessuno studio
   del laboratorio ha due medici. È una scelta già presa e dichiarata, ma il mandato di oggi diceva
   il contrario: va deciso una volta sola, e scritto.

E una nota di igiene: **il contatore dei numeri di lavoro è andato avanti di uno e lì resta** (G5).
Il prossimo lavoro sarà `2026/0013`, non `2026/0012`. Nessun dato manca; manca un numero nella serie.

**Non è stata toccata una riga di codice dell'applicazione.** Gli unici file nuovi sono i 60 scatti
e gli script usa-e-getta del banco in `scripts/tmp/`.
