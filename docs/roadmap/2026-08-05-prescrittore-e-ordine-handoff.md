# Handoff — La Dichiarazione non esce più senza il nome del medico, e «appena arrivati» torna a voler dire arrivati

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 5 agosto 2026, tardo pomeriggio (`provato:` `date` → `2026-08-05 16:30 CEST`).
**Stato:** `main` **pubblicato e allineato a `origin/main`** (0 salvataggi in attesa) · ultimo commit
`000cfd32` · **due rilasci in produzione oggi pomeriggio**, entrambi con CI e CD verdi e verificati
sul sito vero.
📌 MISURATO IN CHIUSURA (`provato:` `npm run verify:full`, uscita **0**): tsc 0 · eslint 0 ·
vitest **4983 passate | 19 saltate** (418 file | 3 saltati) · build ok · **sei guardie verdi**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🛑 IL GATE ESTETICO L2 NON È STATO FATTO — ed è il SECONDO giorno di fila
La §0① dell'handoff precedente lo dichiarava dovuto sulle due superfici toccate stamattina
(`TabImmagini` e le frasi del wizard). **Non è stato fatto neanche oggi**, e a quel debito si
aggiunge una domanda nuova: la modifica dell'ordine (D244) cambia **che cosa** compare nella pila
blu della home, non **come** appare — nessun token, nessuna spaziatura, nessun colore.
🔑 **La scelta di non fare il gate è MIA e la dichiaro**, non è passata inosservata: il gate L2
guarda l'aspetto di una superficie, e qui l'aspetto non cambia. ⚠️ **Ma la regola non distingue**,
e chi legge deve poterlo sapere. `provato:` `ls docs/design/screenshots/ | grep 2026-08-05` → esistono
solo `2026-08-05-giro-caricamento-diretto.png` e `2026-08-05-ondata-b3-giro`, **nessun audit L2**.

### ② La FASE 9 (browser, 3 viewport × 2 temi) non è stata percorsa su nessuna delle due modifiche
Al suo posto c'è una verifica **funzionale** sul sito vero, che prova **il dato** e non **l'aspetto**:
la casella vuota che diventa `null`, e l'ordine nuovo letto nell'HTML della home autenticata. Sono
prove buone per ciò che dimostrano, e **non sostituiscono** un giro a schermo.

### ③ La prova su iPhone dalla LIBRERIA FOTO non è stata fatta
Francesco, il 05/08: «*il telefono adesso non l'ho tra le mani*». ✅ **La prova dalla FOTOCAMERA è
fatta e misurata** (v. §1), ma resta scoperto il percorso «scegli una foto dalla libreria», dove il
selettore di iOS si comporta diversamente. È **l'ultimo caso aperto della riga 16** (HEIC).

### ④ `CRON_SECRET`: invariata dalla mattina — non verificabile da questa sessione
Nessuna credenziale Vercel su questa macchina. Si conferma su **Vercel → Settings → Cron Jobs**.
⚠️ Piano Hobby: l'orario ha **±1 ora** — il `20 4 * * *` parte fra le **4:20 e le 5:19**.

### ⑤ Nessuna misura su RETE MOBILE VERA
Invariata dalla mattina: l'XHR non ha né ritentativo né ripresa, e i file arrivano a 50 MB.
**Non verificato.**

### ⑥ La carta di un caricamento fallito ancora NON si può togliere
`provato:` **oggi, nel codice, non ricordato** — `src/components/features/lavori/form/TabImmagini.tsx:250-253`:
sul fallimento la foto locale **resta** nella lista con il suo `error`, e
`grep -c "rimuoviFoto|onRimuovi|chiudiErrore"` su quel file → **0**. Si toglie solo ricaricando.

### ⑦ Perché il telefono di Francesco mostrasse **12** non è stato misurato
`provato:` il sito vero risponde **13** sia in casa sia nella pila. Il service worker è **escluso dal
suo stesso codice** (`public/sw.js:35-52`: navigazioni rete-per-prime mai scritte in cache, richieste
RSC lasciate passare). Resta il ridisegno lato client, che l'aritmetica sostiene (12 sta fra 0019
delle 13:12 e 0020 delle 13:13) ma **non prova**: **non verificato**.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| 🔴 **La DdC poteva uscire senza il nome del prescrittore** (D242) | ✅ **CHIUSO E IN PRODUZIONE.** La stringa vuota si ferma **al confine di scrittura** (POST e PATCH) e la regola di «vuoto» è **una sola** per il controllo di consegna e per i due documenti |
| 🔎 **Il censimento ha trovato due cose che l'handoff non diceva** | ① un **secondo lettore** collo stesso difetto: `BuonoTemplate.tsx:312`, il **buono di consegna**, che esce dal laboratorio col lavoro ② il rimedio suggerito (`\|\|` al posto di `??`) **non bastava**: `'   '` è truthy e `TabDati.tsx:311` lo salva davvero |
| 📊 **Quanti documenti c'erano da riparare** | ✅ **ZERO.** `provato:` 299 lavori (`richiedente_nome` vuoto-non-nullo: **0**) e 6 dichiarazioni emesse (`prescrittore_nome` vuoto: **0**). Percorso aperto e mai percorso |
| 🚀 **Primo rilascio** (D243) | ✅ `c9408d99..800a7c0c` · CI verde 11m56s · CD verde 2m58s · sito 200/307 |
| 🔬 **Check post-rilascio, col suo controllo positivo** | ✅ PATCH di produzione con **soli spazi** → in banca dati **`null`**; poi `'  Dott. Bianchi  '` → **`"Dott. Bianchi"`**, trimmato e vivo. Baseline ripristinata. ⚠️ Senza il secondo, il primo non prova niente |
| 🍏 **La prova iPhone (riga 16)** | ✅ **FATTA da Francesco, misurata sui byte:** due lavori dal telefono (2026/0019, 2026/0020), foto **dalla fotocamera** → il magazzino ha registrato **`image/jpeg`** (2,06 MB e 2,55 MB). **Safari converte: l'HEIC non ci arriva** |
| 🔢 **«Appena arrivati» in ordine incomprensibile** (D244) | ✅ **CHIUSO E IN PRODUZIONE.** Ora si ordina per **arrivo**, il più recente in cima; le altre tre pile restano per **consegna**, perché parlano di scadenze |
| ⚖️ **E l'ordine arbitrario a parità di data** | ✅ chiuso insieme: criterio di spareggio dichiarato, con una prova che legge le stesse righe **al contrario** e pretende lo stesso esito |
| 🚀 **Secondo rilascio** | ✅ `800a7c0c..000cfd32` · CI verde 16m17s · CD verde 3m37s. **Verificato sul sito vero:** la home dice «13 APPENA ARRIVATI — n.2026/0020, n.2026/0019 e altri 11», e la pila aperta elenca `0020 · 0019 · 0018 · 0017 · 0011 · 0008 …` (prima apriva con `0002 · 0001`) |
| 📉 **Il 13 contro 12** | ✅ **non è un difetto di calcolo:** casa e pila leggono la stessa funzione, e il sito vero risponde 13 a entrambe. La causa del 12 sul telefono resta **non verificata** (§0⑦) |

## 2. 🔑 Le lezioni

1. 🔴 **Un dato con DUE ortografie per «non c'è» rompe il LETTORE, non lo scrittore — e lo rompe in
   silenzio.** `null` e `''` convivevano su `richiedente_nome`: il controllo di consegna ne conosceva
   due, i due documenti una sola. Lo stesso flusso diceva «va bene» e stampava un foglio senza nome.
   ➡️ **La cura non è un carattere cambiato nel lettore: è togliere la seconda ortografia dove il
   dato ENTRA.**
2. **Il rimedio scritto in un handoff è un'ipotesi, non un ordine.** «`||` invece di `??`» sembrava
   la correzione ovvia ed era **incompleta**: tre spazi sono truthy. Chi eredita un rimedio lo
   verifica come verificherebbe il difetto.
3. **Un difetto schivato in un punto solo torna dal punto che nessuno ha guardato.** Il wizard aveva
   già incontrato questa trappola (P37, Task 10) e l'aveva spiegata per intero in un commento —
   `crea-lavoro.ts:365-368` — ma l'aveva evitata **per sé**, lasciando la strada aperta a ogni altro
   scrittore. Un commento che spiega una trappola è un ottimo indizio che la trappola è **ancora lì**.
4. 🔑 **Un controllo positivo non è un lusso: senza, una prova non discrimina.** «La casella vuota
   diventa `null`» lo supererebbe anche una correzione che azzera **tutto** — e distruggerebbe il
   dato vero. La coppia (deve sparire / deve restare) è la prova; una sola metà non lo è.
5. **Cambiare un ORDINE cambia il significato di ogni `find` su quella lista.** La striscia cercava
   «chi aspetta da più tempo» prendendo il primo — corretto finché la testa era il più urgente,
   sbagliato dal momento in cui la testa è il più recente. ➡️ Chi tocca un ordinamento **censisce chi
   legge quella lista per posizione**, non solo chi la mostra.
6. **«Provato e verde» e «risolto per chi usa l'app» sono due fatti diversi**, e in mezzo c'è una
   pubblicazione. Un ramo fermo è un difetto vivo.

## 3. Che cosa resta aperto (in ordine)

1. 🟡 **Il gate estetico L2**, ora su **due giorni** di superfici (§0①) — e la domanda dichiarata: se
   valga anche quando cambia il contenuto e non l'aspetto.
2. 🟡 **La foto dalla LIBRERIA dell'iPhone** e, da lì, la chiusura definitiva della **riga 16** (HEIC).
3. 🟡 **Riga 18 ③ — la home non si ridisegna da sola** dopo che crei un lavoro: da decidere se debba
   farlo al rientro sulla pagina. È la stessa famiglia del difetto già pagato con le richieste RSC nel
   service worker (03/07/2026, `public/sw.js:45-52`).
4. 🔴 **Il resto di P37**: la Dichiarazione stampa come prescrittore una **ragione sociale** dove la
   norma vuole una **persona con qualifiche professionali**, e la casella dell'**istituzione
   sanitaria** non esiste nel documento. Questa sessione ha chiuso **solo** il sotto-difetto della
   stringa vuota.
5. 🟡 **Righe 13, 14, 17**: il buco del tema scuro alla quarta e quinta replica (visibile in
   produzione) · le due reti meccaniche mancanti (contrasto su tutti i fondi, griglia spaziature) ·
   **`middleware.ts` deprecato da Next 16**.
6. 🟡 **Rete mobile vera** (§0⑤) · **`CRON_SECRET` su Vercel** (§0④) · **la carta d'errore non
   rimovibile** (§0⑥).

## 4. Da dove ripartire

1. **`docs/roadmap/ROADMAP-UFFICIALE.md`** — la tabella delle righe aperte è la fonte.
2. Il candidato naturale è il **gate estetico L2** (§3.1): è l'unica regola del progetto **saltata due
   volte di fila**, e più aspetta più superfici accumula.
3. Se si preferisce un difetto che l'utente incontra: **riga 13** (il buco del tema scuro, visibile in
   produzione) è piccola come correzione e **media come censimento** — cinque repliche dicono che il
   difetto è del *modo* di scrivere un premibile dentro uno sheet, non dei singoli componenti.

## 5. Il minimo per non sbagliare

- 🔑 **La regola di «vuoto» è UNA e vive in due file:** `src/lib/utils/testo.ts` (`testoVivo`,
  `testoVivoDaCorpo`) e `src/lib/consegna/prescrittore.ts` (`nomePrescrittore`). Chi aggiunge un
  documento che stampa il prescrittore **chiama quella**, non riscrive un `??`.
- 🛑 **Al confine, i campi normalizzati sono DUE e stanno in un elenco esplicito:**
  `CAMPI_TESTO_NORMALIZZATI` in `src/app/api/lavori/[id]/route.ts`. Aggiungere un campo di testo che
  finisce su un documento vuol dire aggiungerlo lì, o accettare che `''` ci arrivi.
- 🛑 **`testoVivoDaCorpo` NON inventa un tipo:** normalizza solo le stringhe, e lascia passare numeri
  e oggetti com'erano. È voluto — chi manda una sciocchezza incontra il database come prima.
- **L'ordine delle pile ora è di DUE specie** (`pile-home-shared.ts`): la **blu** per arrivo, le altre
  tre per consegna, e tutte con un **criterio di spareggio** sul numero del lavoro. ⚠️ Chi legge una
  di quelle liste **per posizione** (`[0]`, `.find`) deve sapere che cosa c'è in testa: la striscia lo
  ha già pagato una volta.
- **Banco:** `npm run build && PORT=3020 npm run start`, accesso con
  `BASE=http://localhost:3020 npx tsx scripts/tmp/link-accesso-locale.ts h4t@live.it <percorso>` (D103).
  In produzione: `scripts/tmp/link-accesso.ts` (stessa forma, senza `BASE`).
- ⚠️ **`scripts/tmp/` è IGNORATO da git** (`.gitignore:141`): gli script di censimento di oggi **non
  esistono per la sessione nuova**. Le misure che contano sono incollate nei documenti, non lì.
- ⚠️ **`verify:full` lancia eslint sul solo `src`**: gli avvisi sui file di prova li prende il
  **pre-commit**, che guarda anche `tests/`.
- 🛑 **«Voce» e «riga» non sono sinonimi**: la roadmap ha **righe**, e la guardia ferma il commit.
- ⚠️ **La catena della guardia dei documenti è a 1**: `SESSION_ACTIVE` cita solo i due archivi
  (MEMORY e ROADMAP), che per costruzione non entrano nella catena. Torna a 3 appena un handoff
  vivo — questo — viene citato dal punto di ripresa.
- **Il prossimo numero di decisione è D245**; il conteggio vive in testa al verbale (244 in 93 tornate).
