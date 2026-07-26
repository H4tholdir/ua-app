# Allineamento dei documenti allo stato vero — 26/07/2026

**Cos'è questo file.** Il verbale di una sessione di sola **chirurgia sui documenti**: nessuna riga
di codice è stata toccata (`src/`, `tests/` intatti). Un audit aveva trovato che **i primi file che
una sessione nuova è obbligata a leggere aprivano dicendo cose false**. Qui c'è cosa è stato
corretto, dove, e **cosa c'era scritto prima** — perché un errore corretto in silenzio è un errore
che torna.

**Regola seguita ovunque: non si cancella mai la storia di uno sbaglio.** Dove una conclusione era
sbagliata, resta scritto cosa si era creduto, perché sembrava ragionevole, e qual è la verità.

> ℹ️ **Nota di provenienza, per onestà del verbale.** All'inizio di questa sessione il file
> `docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md` **aveva già modifiche non
> committate**, lasciate da una sessione precedente: il blocco «🛑 METODO IMPOSTO DA FRANCESCO»
> del §2, la riscrittura del §3 sul centro notifiche (compresa la collocazione «in fondo alla
> roadmap», cioè **la parte già fatta del punto 9**) e il riordino dell'«Ordine consigliato».
> **Quel lavoro non è mio**: è stato conservato e portato in salvo nel commit `7c0b2633` insieme
> alle mie correzioni. Dove qui sotto si legge «ora», per quel file può voler dire «già fatto da
> chi mi ha preceduto e non ancora committato».

---

## Lo stato vero, quello contro cui è stato allineato tutto

Verificato con `git`, non riferito:

- `main` è a **`8c482e90`**; il ramo dell'ondata si è fermato a `ca913236`; il merge è **`5504a20a`**.
- CI verde, deploy verde, `uachelab.com` verificata.
- Suite **3283 passati / 19 saltati**, `tsc` 0 errori, build ok.
- I due worktree ancora su disco (`redesign-parete-home` @ `ca913236`,
  `ondata-a-mini-triage` @ `50e6b79d`) sono **indietro rispetto a `main`**: non si misura più lì.

---

## 1. I due file letti per primi dicevano che l'ondata non era mergiata

**Dove:** `memory/MEMORY.md:2` (voce 42) · `docs/roadmap/ROADMAP-UFFICIALE.md:2`

**Diceva prima:**
- MEMORY: «ONDATA «REDESIGN PARETE/HOME»: T16 E T17 CHIUSI, **RAMO PRONTO AL MERGE — 🛑 MERGE SOLO A
  PAROLA DI FRANCESCO**» — e poi, **nella stessa riga**, «**MERGE FATTO E PUBBLICATO**». La voce si
  contraddiceva da sola, e la metà falsa era quella che si legge per prima.
- ROADMAP: «TUTTI I TASK CHIUSI (T16 + T17), RAMO PRONTO. **🛑 NON MERGIATA** — il merge è a parola
  di Francesco.»

**Ora:** entrambe aprono dichiarando merge fatto, pubblicato e verificato, con i numeri di commit. Il
resto delle due voci è quello originale. In tutt'e due è scritto **cosa c'era prima e perché era
grave**: sono le prime righe che si leggono a ogni avvio, quindi l'errore si propagava a valle.

---

## 2. Una conclusione che Francesco ha smentito col suo telefono era ancora scritta come verità

**Dove:** `memory/MEMORY.md:2` (coda della voce 42) · `docs/roadmap/2026-07-27-post-ondata-handoff.md`
§«La prova della PWA installata»

**Diceva prima:** che la prova della PWA installata serviva «a chiudere la questione della barra
gesture, **che NON è un difetto dell'app**» — perché in una scheda di browser quell'area appartiene
al browser, `env(safe-area-inset-bottom)` resta 0 e `viewport-fit: cover` non ha effetto.

**È falso.** Francesco ha installato la PWA il 26/07 e **il difetto c'è**: barra dei gesti non
trasparente, fondo di colore diverso dal resto dell'app in home, e su `/cassette` in più una striscia
panna appena sopra (`docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md`).

**Ora:** in entrambi i posti il ragionamento vecchio **resta scritto**, con accanto perché era
sbagliato — era al massimo metà della storia, ed è finito a verbale come questione *chiusa* mentre
era falsa. La questione è dichiarata **APERTA**, e si riparte da ricerca e misure sul device, **mai**
da quella conclusione.

---

## 3. L'osservazione di Francesco era appesa alla voce di backlog sbagliata

**Dove:** `docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md` §1 · voce **52** di
`docs/roadmap/2026-07-26-backlog-ondata-parete-home.md`

**Diceva prima:** che le parole di Francesco — «la linguetta non dà il giusto spazio al suo contenuto,
la parte inferiore si chiude troppo sotto alla scritta cassette» — erano la conferma a vista della
voce **52**, che passava «da rimandata a da fare».

**Perché è sbagliato, e perché conta.** Sono due cose diverse, e seguire il testo vecchio avrebbe
sistemato quella sbagliata:

| | voce 52 | ciò che ha visto Francesco |
|---|---|---|
| stato della linguetta | **`is-filo`** (la scheggia rossa dopo 3 accessi) | **`piena`** (la linguetta intera, con la scritta) |
| testo della voce 52 | «La colonna rossa **del filo** è a tutta altezza del bottone (96px) contro i ~78px dello schema» | «la parte inferiore si chiude troppo sotto **alla scritta cassette**» |
| da dove vengono i numeri | `.lng.slim` del mockup (riga **53**): 22 + 34 + 22 = 78 | `.lng.big` del mockup (riga **51**): `padding:18px 0` |

**La deviazione vera dello stato pieno:** lo schema ratificato
(`docs/design/mockups/2026-07-25-linguetta-e-piede-proposte.html:51`) dà **18px di respiro sopra e
sotto il contenuto**; il codice spedito dichiara **`padding: 0`** (`src/app/ds-v3.css:1613`). Del
mockup era stata importata la larghezza (34px, giusta) e **dimenticata l'imbottitura**.

**Ora** §1 nomina lo stato giusto, mette i 18px ratificati contro lo 0 spedito, tiene la **52 aperta
e separata** sullo stato `is-filo`, e porta due avvertimenti:

- 🛑 **non abbassare `min-height` da 96 a 78**: assottiglierebbe il filo di cui nessuno si è
  lamentato e lascerebbe intatta la deviazione vera, che non dipende da `min-height`;
- ⚠️ **che nello stato pieno l'altezza sia guidata dal contenuto e non da `min-height` è una LETTURA
  DEL CSS, non una misura.** Plausibile, non verificato: quanto sia alto davvero quel contenuto sul
  telefono di Francesco non l'ha misurato nessuno. **Va misurato sul device prima di toccare
  qualsiasi cosa** — «misure, non ipotesi» è la regola di questo progetto, ed è la stessa regola la
  cui violazione ha prodotto l'errore del punto 2.

Corretto anche il percorso: `LinguettaCassette.tsx` sta in
`src/components/features/home/`, **non** fra i componenti del design system in `src/components/ds/`.

---

## 4. L'inventario di dove vive il rosso era incompleto

**Dove:** `docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md` §2, sotto il titolo «Cosa è
già verificato nel codice»

**Diceva prima:** due posti — `public/manifest.json` e `src/app/layout.tsx:28`.

**Ne manca un terzo:** `public/offline.html:6` → `<meta name="theme-color" content="#D90012">`. È la
pagina che il service worker serve quando la rete manca: **sistemandone due su tre, la pagina offline
sarebbe rimasta rossa** — cioè il difetto sarebbe ricomparso nel momento peggiore.

---

## 5. Una riga di backlog dava per risolto il difetto di adesso

**Dove:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`, riga **A5**

**Diceva prima:** «`manifest.json` theme_color sbagliato | **✅** | 20/07/2026 · Bundle Q (`04cf00b`)
| `#D90012` in manifest + offline.html».

Quel `#D90012` è **esattamente** il valore oggi identificato come parte del problema della barra dei
gesti. Chi vedeva la spunta verde concludeva che l'argomento fosse chiuso.

**Ora:** riga **RIAPERTA**, con scritto per esteso che **era corretta per il suo scopo di luglio** —
allora il fondo dell'app non era ancora unificato — ed **è diventata un difetto dopo**, quando
l'ondata del 26/07 ha unificato lo sfondo. Non è una svista: è una decisione che va **rifatta**.

---

## 6. La roadmap elencava come da fare lavoro già finito

Tutte in `docs/roadmap/ROADMAP-UFFICIALE.md`:

| Dove | Diceva prima | Verità, e come si verifica |
|---|---|---|
| coda dell'ondata (T16, T17) | erano ancora in lista come lavoro da fare | fatti, mergiati e in produzione dal 26/07 |
| dettatura vocale | «⏳ Confermato non iniziato (**grep SpeechRecognition → 0 risultati**)» | **falso**: `src/components/ds/PillVoce.tsx` implementa la Web Speech API ed è montata nei **tre** passi del wizard (`PassoTipo`, `PassoDentista`, `PassoPaziente`) e nel catalogo `/ds-v3-catalogo`. Il grep era stato lanciato prima che il componente nascesse, o fuori da `src/`, e la riga non è più stata riletta. Resta a backlog la variante Whisper, che è un'altra cosa |
| template email | «manca solo applicazione manuale» — mentre **la stessa roadmap**, più in alto, dava S4 per completata il 04/07 (`01e915c`), applicata su Supabase e verificata con un invio reale | contraddizione interna, sciolta a favore di quello che mostrano il commit e il verbale. Corretta anche la «Nota» gemella più in alto |
| route ancora v2.3 | «**30** route ancora v2.3» in apertura, «sono **37**» trenta righe più sotto | apertura allineata a **37**; la copertura delle ondate era già giusta, era sbagliato solo il numero in testa |
| puntatore all'handoff | `2026-07-26-wave-h-handoff.md` | ne sono arrivati altri due dopo: punta al più recente, `2026-07-26-collaudo-pwa-installata-handoff.md` |

E in `docs/roadmap/2026-07-27-post-ondata-handoff.md`: diceva «Su `main` **non pushati**:
`8b8dd40`+`2b069f0` (rm-guard) — partono col prossimo deploy». **Sono pushati** — entrambi risultano
contenuti in `origin/main` (`git branch -r --contains`).

---

## 7. Il backlog dell'ondata contraddiceva il proprio triage

**Dove:** `docs/roadmap/2026-07-26-backlog-ondata-parete-home.md`

**Diceva prima:** la tabella in testa dava **30** voci rimandate, ma l'elenco nel corpo mostrava
ancora **65 caselle vuote** e chiudeva con «**Aperte: 65**». Motivo: il corpo è l'estrazione
meccanica dal ledger, scritta **prima** del triage e mai riaperta dopo. Così voci che il triage aveva
dichiarato «GIÀ RISOLTO» o «NON È UN PROBLEMA» — 3, 14, 18, 23, 48, 49, 50, 54, 62, 64, 65, 68 fra le
altre — continuavano a leggersi come lavoro da fare.

**Ora:** il verdetto del triage è **propagato su tutte e 69 le voci**, una per una, **senza
rigiudicare niente** — il triage resta quello che era, qui è solo scritto accanto a ogni riga.

| | N. |
|---|---|
| Chiuse dal triage (GIÀ RISOLTO 17 + NON È UN PROBLEMA 19) → `[x]` | **36** |
| DA FARE DOPO, le 30 rimandate con motivazione → `[ ]` | **30** |
| DA APPROFONDIRE, le 3 visive → `[ ]` | **3** |
| Bloccanti | **0** |

36 + 30 + 3 = 69, e i numeri tornano con la tabella d'apertura. Due voci hanno richiesto una nota nel
merito: la **52** (attribuzione corretta, v. punto 3 — resta aperta) e la **61**, che sta a cavallo
delle due sezioni: la *decisione* è chiusa (resta 500), quello che resta aperto è il commento nel
sorgente che dichiara ancora «⚠️ PUNTO APERTO».

---

## 8. Dettagli scaduti, corretti dove comparivano

| Cosa | Diceva prima | Ora |
|---|---|---|
| regola `*.png` in `.gitignore` | «`.gitignore:58`» in **tre** documenti | riga **62**. L'avvertimento in sé era ed è giusto: `git add -A` salta gli screenshot in silenzio |
| percorso di `LinguettaCassette.tsx` | nome nudo, in un file dove i riferimenti vicini portano `src/components/ds/` | percorso per esteso, `src/components/features/home/`, con la nota che **non** è un componente del design system |
| dove si misura | «il checkout PADRE è su `main`: **ogni misura va fatta NEL WORKTREE**» | **rovesciata dal merge**: i worktree sono indietro rispetto a `main`. Si misura su `main` o su un ramo aperto da `main` |
| `memory/SESSION_ACTIVE.md` | **due** puntatori «RIPRESA» a file diversi, col più vecchio per primo | uno solo, il più recente |
| `docs/roadmap/PROSSIMA-SESSIONE.md` | titolo «Prossima Sessione», fermo al 22 maggio, pianifica un re-audit già fatto il 2 luglio | marcato **obsoleto** in testa, non cancellato: resta come storia |
| `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` | ammette da sé che tabella e sezioni narrative non concordano, ma la roadmap ci rimanda come se fosse stato corrente | dichiarato **archivio** in prima riga: prezioso per il *dettaglio* di un item, mai per sapere se è fatto |
| nome di `2026-07-27-post-ondata-handoff.md` | il nome dice 27/07 | scritto il **26/07** (commit `bfe3feab`, 11:29). **Non rinominato** — ci puntano altri documenti — ma la data vera è dichiarata in testa |

---

## 9. Il centro notifiche, collocato — con la sua tensione dichiarata

**Decisione di Francesco, 26/07/2026:** «per il centro notifiche, ok, ma **implementiamolo alla fine
della roadmap che abbiamo**».

**Registrata** in `docs/roadmap/ROADMAP-UFFICIALE.md`, nel calendario delle ondate v3: il centro va
**dopo la «Milestone finale — ritiro chrome legacy globale»**, cioè ultimo, come dicono le sue parole.
*(La collocazione era già stata scritta nell'handoff del collaudo da una sessione precedente, fra le
modifiche non committate — v. la nota di provenienza in testa. Qui è stata portata sulla roadmap, che
è il posto dove un ordine di lavori si legge davvero.)*

⚠️ **La tensione, scritta perché nessuno la sciolga di nascosto.** La roadmap contiene **due ordini
mai riconciliati**: il **calendario di migrazione** (che finisce con la milestone finale) e la
**sequenza operativa ratificata il 17/07** (risolvere i problemi → funzioni attive → design coerente
→ audit multi-agente → collaudo di Francesco). Secondo il calendario il centro va **ultimo**; secondo
la sequenza del 17/07 una **funzione nuova** cadrebbe al **passo 2**, prima del lavoro di design —
l'opposto. Vale la decisione di Francesco: **ultimo**. E se un domani i due ordini vanno davvero
riconciliati, **è una decisione sua, non di una sessione**.

⚠️ **Agganciate, per non portare due volte la stessa cosa:** `ROADMAP-UFFICIALE.md` «Portale dentista
V2 — comunicazione bidirezionale» (è il pezzo lab↔clinico) e «Log WhatsApp
(`agenda_messaggi_clienti`)» (è metà dello schema che servirebbe comunque) rimandano ora alla nuova
voce. Il pezzo davvero **nuovo e senza casa** è la messaggistica **fra gli operatori dello stesso
laboratorio**: quella non esiste da nessuna parte.

---

## L'unica correzione NON applicata, e perché

**`ua-app/CLAUDE.md` §2 — «`npx vitest run` # 136 test unitari», che oggi sono 3283.**

**Il numero è sbagliato e la correzione è giusta**: la suite è a **3283 passati / 19 saltati**,
verificato. **Non l'ho applicata io** per una ragione di perimetro, non di merito: `CLAUDE.md` è il
file di istruzioni operative del progetto, e le regole di sicurezza sotto cui giro non mi permettono
di modificarlo su richiesta di un altro agente — solo Francesco può autorizzarlo, direttamente.

**È una modifica di una riga.** In `ua-app/CLAUDE.md`, dentro il blocco dei comandi:

```diff
-npx vitest run                 # 136 test unitari
+npx vitest run                 # 3283 test unitari (3283 passati / 19 saltati, 26/07/2026)
```

Finché resta com'è, chiunque legga quel file crederà che la rete di sicurezza automatica sia grande
un ventesimo di quello che è davvero.

---

## Cosa NON è stato fatto, di proposito

- **Nessuna riga di codice.** `src/` e `tests/` non sono stati toccati.
- **Nessun rigiudizio** dei 69 rilievi: il triage è stato **propagato**, non rifatto.
- **Nessuna voce di roadmap inventata.** L'unica aggiunta è la collocazione di una decisione che
  Francesco aveva già preso.
- **Niente cancellato.** Dove un documento era sbagliato, lo sbaglio resta leggibile accanto alla
  correzione.
