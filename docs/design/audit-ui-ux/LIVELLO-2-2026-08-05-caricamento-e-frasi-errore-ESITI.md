# GATE ESTETICO L2 (FASE 9b) — il caricamento e le frasi d'errore del 05/08

> 🔴 **QUESTO È UN RIMEDIO, NON UN CANCELLO CHE HA RETTO — ed è il SECONDO giorno.**
> La REGOLA ZERO dice «*MAI mergere una superficie di cui è cambiato l'aspetto senza il GATE
> ESTETICO L2*». Il codice di questa superficie **è in produzione dalle 14:54 del 05/08/2026**, e il
> gate non è stato percorso né quel giorno né il precedente. Le due §0① degli handoff del 05/08 lo
> dichiarano entrambe. Questo documento percorre il gate **a valle**, e non retrodata niente.

| | |
|---|---|
| **Livello** | 2 — gate di fine ondata (`README.md` §Livello 2) |
| **Superficie** | scheda **«Foto»** del form del lavoro — `/lavori/[id]/modifica?tab=immagini` · `src/components/features/lavori/form/TabImmagini.tsx` + `LavoroFormClient.tsx` |
| **Regime** | **v3 a peso pieno.** `misurato:` `data-ds="v3"` presente (2 nodi) · carattere `"Plus Jakarta Sans", system-ui, sans-serif`. **Nessun criterio della lista va marcato N/A**: si giudicano tutti e 12 |
| **Lista** | `CHECKLIST-DS-V3-UI-UX.md`, 12 sezioni |
| **Copertura** | **4 stati** × **390 · 768 · 1280** × **chiaro · scuro** = **24 combinazioni**, tutte percorse |
| **Scatti** | `docs/design/screenshots/2026-08-05-caricamento-frasi-errore/` — 18 dei primi tre stati + 12 del caso peggiore (6 in cima, 6 scorsi in fondo) = **30** |
| **Misure** | `scripts/tmp/gate-l2-0805/referto-s1.json` + `referto-s1-peggiore.json` ⚠️ `scripts/tmp/` è ignorato da git: **i numeri che contano sono incollati qui**, non lì |
| **Banco** | build del 05/08 17:00 su `localhost:3020`, sessione vera via link monouso (D103) |
| **Data** | 05/08/2026 (`provato:` `date` → `2026-08-05 16:53 CEST`) |

---

## 0. Il perimetro non l'ho deciso io — l'ha deciso il censimento (R-P2)

Gli handoff dicevano **due superfici** («`TabImmagini` e le frasi del wizard»). Il diff dice
**nove file**. L'elenco non lo decide chi scrive il piano:

```
git diff --stat f584393a..HEAD -- 'src/**/*.tsx' 'src/**/*.css' 'src/design-system/**'
```

| file | ultimo tocco | classificato (D245) | esito |
|---|---|---|---|
| `form/TabImmagini.tsx` | 12:36 | **ASPETTO** — 153 righe, tutta la resa dell'errore rifatta | ✅ **AUDITATA QUI** |
| `lavori/LavoroFormClient.tsx` | 11:24 | **ASPETTO** — l'`AvvisiProvider` è *ciò che fa comparire* l'avviso su questa superficie | ✅ **auditata dentro S1**, non come riga a sé: se S1 passa, l'involucro è provato per costruzione |
| `wizard/AllegaPrescrizioneSheet.tsx` | 12:45 | **ASPETTO** — testi visibili (frasi 413/415) | 🟡 **§4 di questo documento** |
| `wizard/FrameFatto.tsx` | 12:36 | **ASPETTO** — testi visibili (frase d'errore foto) | 🟡 **§4 di questo documento** |
| `ds/Avviso.tsx` | 08:35 | **ASPETTO** — tetto d'altezza + scorrimento | ✅ **coperto dal giro delle 08:40** (v. sotto) e **riprovato qui nel caso peggiore** |
| `scheda-v3/ModificaColoreSheet.tsx` | 08:35 | **ASPETTO** — 13.5px + `--muted` | ✅ **coperto dal giro delle 08:40** |
| `scheda-v3/SchedaLavoroV3.tsx` | 09:59 | **CONTENUTO** — filtro delle foto senza URL | ➡️ FASE 9, non gate (D245) |
| `pdf/BuonoTemplate.tsx` | 15:28 | **CONTENUTO** — quale nome si stampa | ➡️ non è una schermata |
| `ds/CardInfo.tsx` | 08:35 | **niente** — solo un commento | — |

🔑 **Il fatto che restringe il perimetro, e va scritto perché è il motivo per cui il gate è di UNA
superficie e non di sei.** I 66 scatti del gate della ③ sono **tutti successivi alle correzioni delle
08:35**: `provato:` `find … -newermt "2026-08-05 08:35"` → **66 su 66**, il più recente delle **08:40**.
Quindi `ModificaColoreSheet` e `Avviso` sono stati rifotografati **dopo** essere stati corretti, e non
devono un secondo giro. `TabImmagini` invece è cambiata alle **11:01, 11:24 e 12:36** — dopo — e fra
le undici scene di quel giro **non c'è**.

---

## 1. Che cosa ha retto — e si dice per primo, perché un gate che elenca solo i ❌ non dice se la cosa funziona

| | misura |
|---|---|
| 🔑 **Il tetto d'altezza della pila di avvisi FUNZIONA, e la prova è il CASO PEGGIORE** | La scena a quattro errori con nomi corti **non prova il tetto**: la pila misura 720px e ci sta in 796. Rifatta con quattro nomi da 139-141 caratteri (messaggi da **229**): a 390 il contenuto è **976px** in **796** di spazio → **scorre** (`overflow-y:auto`), **non sfonda la piega** (bottom 820 su 844), e il «Chiudi» dell'ultima carta — l'unica via d'uscita di un errore — passa da **fuori schermo (top 949)** a **dentro (top 769)** scorrendo. È il controllo positivo della lezione ② del 05/08 |
| **Contrasto del testo dell'avviso** | **17,33:1** chiaro · **14,49:1** scuro (AA chiede 4,5) — tutte e 24 le combinazioni |
| **Il «Chiudi»** | **45×48px** ovunque, sopra i 44 di §8 |
| **Troncamento (D234 tiene)** | `troncato:false` su **tutti** gli avvisi, in tutte e 24 |
| **Scorrimento orizzontale** | **assente** in tutte e 24 (doc = vista: 390/390, 768/768, 1280/1280) |
| **Scuro** | piatto, nessuna ombra sollevata; la carta è più chiara del fondo |
| **Console** | zero errori dell'app. L'unico è `_vercel/speed-insights/script.js` **404**, che è del banco locale (in produzione quello script esiste) |
| **La frase è azionabile** | «*Questo documento pesa 51,0 MB e il massimo è 50MB: allegane uno più leggero*» — dice il peso vero, il limite e la mossa (§9 «error»: messaggio azionabile, mai stringa tecnica) |

---

## 2. I riscontri — tabella `elemento × sezione`

**Legenda:** ✅ conforme · ⚠️ da migliorare · ❌ difetto · N/A.

| elemento | §1 layout | §2 spazio | §3 sovrap. | §4 tipo | §5 colore | §6 motion | §7 suono | §8 tocco | §9 stati | §10 resp. | §11 access. | §12 copy |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Striscia delle schede | **❌ G6** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **❌ G6** | ⚠️ G6 | ✅ |
| Tasti «Camera» / «Galleria» | ✅ | ✅ | **❌ G1** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **⚠️ G4** | **⚠️ G4** |
| Carta d'avviso (errore) | ✅ | ✅ | **❌ G1** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **⚠️ G5** |
| Pila di avvisi (4 impilati) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tessera documento in errore | ✅ | ✅ | ✅ | ⚠️ G2 | **❌ G2** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Griglia foto + conteggio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **❌ G3** |
| Tasto «pacchetto documenti» | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **⚠️ G4** | **⚠️ G4** |

---

## 3. I ❌ e i ⚠️, uno per uno — con la misura, non con l'impressione

### ❌ G1 — §3 · L'avviso d'errore **copre i due tasti** e li rende non premibili (390 e 768)

**La misura, non l'impressione.** `document.elementFromPoint` al **centro** di ciascun tasto:

| vista | «Camera» → chi risponde | «Galleria» → chi risponde | è il tasto? | area coperta |
|---|---|---|---|---|
| **390** | `BUTTON.ds-link-quieto` (il «Chiudi» dell'avviso) | `P.` (il testo dell'avviso) | **NO / NO** | **98%** di ciascuno |
| **768** | `DIV.ds-avviso-card` | `DIV.` | **NO / NO** | parziale |
| **1280** | `BUTTON.` | `BUTTON.` | **sì / sì** | parziale (l'avviso è centrato, x424-856; i tasti sono larghi 615 e il centro resta scoperto) |

🔑 **Perché non è cosmetico, e perché è il riscontro peggiore del gate.** La frase dice
«*allegane uno più leggero*». La mossa che segue è premere **«Galleria»**. Quel tasto è **sotto la
frase che lo chiede**: per eseguire l'istruzione bisogna prima **far sparire l'istruzione**. Sui due
formati dove quasi tutti useranno l'app — il telefono e il tablet — il gesto naturale non arriva a
destinazione, e non c'è niente a schermo che spieghi perché.

**Dove vive:** il contenitore della pila è `position: fixed; top: spazio.l` (`ds/Avviso.tsx:294-316`)
e i due tasti stanno a **y130** (`form/TabImmagini.tsx:421-429`), cioè subito sotto la testata.
⚠️ **Non è un difetto di `TabImmagini`**: è di **dove l'`Avviso` si posa**. Ogni superficie che ha
un'azione primaria in alto lo incontrerà. Per questo la correzione va decisa, non improvvisata.

### ❌ G2 — §5 · Il nome del file sulla tessera d'errore sta **sotto** il velo rosso: **1,47:1**

`provato:` **sui pixel dello scatto**, non sui colori dichiarati — perché sotto un velo al 72% il
colore dichiarato non è quello che si vede: testo **`rgb(187,28,37)`** su fondo **`rgb(221,62,74)`**
→ **1,47:1** (identico a 390, 768 e 1280; AA chiede **4,5**).

🔑 **La conferma che sta sotto e non sopra:** `elementFromPoint` al centro della didascalia risponde
`DIV.[aria-hidden]` — cioè il velo `rgba(217,0,18,.72)` (`TabImmagini.tsx:599`), che è dichiarato
decorativo e sta **davanti** al nome del file (`TesseraDocumento`, `TabImmagini.tsx:78-119`).

⚠️ **E un secondo numero, che vale anche SENZA il velo:** la didascalia è `--t2` su `--sfc` a **10px**
→ **4,38:1 in chiaro** (5,95 in scuro). Sotto AA di suo, sulle tessere **non** in errore.

📌 **Quanto è largo il difetto — misurato, non supposto.** `provato:` `grep -rn "TesseraDocumento" src/`
→ **2 usi**, `TabImmagini.tsx:536` (la carta del caricamento in corso) e `:660` (le foto già salvate),
**entrambi su questa schermata**. Il componente non vive altrove: il riscontro **non si allarga** oltre
la superficie auditata, e questa riga esiste perché la portata di un difetto va contata, non intuita.

📌 **Onestà sull'origine:** il velo è del **20/05/2026**, la tessera del **31/07**. La combinazione
**precede** le modifiche di oggi. Entra lo stesso in questo referto perché **il gate L2 audita la
superficie, non il delta** (`README.md` §Livello 2: «*mini-audit estetico sulla sola superficie*»).

### ❌ G3 — §12 · «1 foto allegate» — e l'interruttore che sembra gestirlo ha **lo stesso valore da tutt'e due i lati**

`src/components/features/lavori/form/TabImmagini.tsx:639`

```tsx
{immagini.length} {immagini.length === 1 ? 'foto' : 'foto'} allegate
```

Il ternario distingue singolare e plurale e restituisce **`'foto'` in entrambi i rami**, mentre la
parola che andava accordata — **«allegate»** — sta **fuori** dall'interruttore. `provato:` la frase
resa è **«1 foto allegate»** in tutte e quattro le combinazioni sondate.

🔑 **Perché merita una riga e non una spunta:** un interruttore che c'è e non fa niente è **peggio**
di un interruttore che manca — chi legge il codice vede il caso gestito e non guarda oltre. È la
stessa forma di «un elenco che sembra completo e non lo è» (§6 di `CLAUDE.md`, i cinque ruoli).

### ⚠️ G4 — §11/§12 · Emoji al posto delle icone, e un comando che è **solo** un'emoji

`misurato:` tre comandi con emoji al posto di un'icona del sistema —
**«📸 Camera»** e **«🖼️ Galleria»** (170×52 a 390, 615×52 a 1280), più **«📦»** (56×52), che ha
`aria-label="Apri pacchetto documenti MDR"` e **nessun testo visibile**. Più **«📄»** dentro la
tessera del documento.

§11 chiede che il contenuto informativo **non sia solo iconico**: un tasto il cui unico contenuto
visibile è un'emoji lo è. E le emoji cambiano disegno da un sistema all'altro — su un dispositivo
non-Apple quel 📦 non è lo stesso oggetto.

### ⚠️ G5 — §12 · Con nomi lunghi il **nome del file mangia il messaggio**

`misurato:` con nomi da 139-141 caratteri il messaggio arriva a **229 caratteri** e la carta passa
da **174px a 244px** a 390: l'azione da fare («*allegane uno più leggero*») si legge **dopo nove
righe di nome file**.

📌 **La scelta di mettere il nome nella frase è dichiarata e ha la sua ragione**
(`TabImmagini.tsx:255-256`: con più carte uguali in griglia, «pesa 51,0 MB» senza il nome non dice
quale togliere). **Manca il troncamento**, non la ragione: un'ellissi centrale terrebbe l'inizio e
l'estensione e restituirebbe la frase alla prima riga.

### ❌ G6 — §1/§10 · La striscia delle schede **non porta in vista la scheda attiva**

`misurato:` a **390 e 768** la scheda attiva («Foto», `aria-selected="true"`) è **fuori dalla vista**
della striscia, insieme a Prove, Date e Docs: si leggono `Dati · Accett. · Prezzi · Clinica · Prod.`
e **niente dice all'utente dove si trova**. A **1280** tutte e nove sono dentro.

Chi arriva qui da un collegamento diretto (`?tab=immagini` — ed è **esattamente** come ci arrivano i
bloccanti della consegna, `risolvi-tab.ts`) vede una striscia in cui nessuna voce è evidenziata.

### ⚪ G7 — fuori perimetro, **riferito e non corretto** (R-E2)

Il collegamento di servizio **«Vai al contenuto»** misura **139×37px**, sotto i 44 di §8. Compare in
**tutte e 24** le combinazioni ma **non appartiene a questa superficie**: è globale.
➡️ **Destinazione:** riga nuova di `docs/roadmap/ROADMAP-UFFICIALE.md`, insieme alle due reti
meccaniche mancanti già tracciate alla riga 14 (contrasto su tutti i fondi, griglia spaziature).

---

## 4. 🟡 Quello che questo gate NON ha percorso, e che cosa serve per percorrerlo

**Le due superfici del wizard — `AllegaPrescrizioneSheet` (frasi 413/415) e `FrameFatto` (frase
d'errore della foto).**

**Perché non sono qui:** entrambe vivono **solo dentro la conclusione del wizard**. `FrameFatto` si
raggiunge unicamente **dopo aver creato un lavoro** (`WizardNuovoLavoro.tsx:647`), e
`AllegaPrescrizioneSheet` è montato **dentro** `FrameFatto` (`FrameFatto.tsx:483`). Percorrerle su
tre formati e due temi significa **creare sei lavori veri** e cancellarli.

**Ciò che il gate di oggi dice comunque su di loro, e che non è niente:** le loro frasi escono dallo
**stesso** componente `Avviso` appena messo alla prova qui col caso peggiore (**229 caratteri**,
quattro impilati). Le frasi nuove del wizard sono di **63 e 108 caratteri** — meno della metà. Il
rischio residuo è quindi **la posa dell'avviso sulla loro schermata** (il G1), non la sua tenuta.

➡️ **Destinazione, e non è un rinvio senza indirizzo:** §5 di questo stesso documento, appena il giro
sul wizard viene percorso. Il modo è già scritto e provato: `scripts/tmp/gate-l2-0805/gate-s1.ts`
cambiando percorso e innesco.

---

## 4-bis. ✅ FASE 9 su D244 — il nuovo ordine della pila blu, a schermo

**Non è un gate L2, ed è proprio il caso che D245 descrive:** l'ordine cambia il **contenuto** della
pila, non il suo aspetto. Il gate non è dovuto; **la FASE 9 sì**, e non era stata fatta (§0② dell'handoff).

**Copertura:** casa + pila aperta × 390 · 768 · 1280 × chiaro · scuro = **12 combinazioni**, 12 scatti
(`home-casa-*` e `home-pila-blu-*` nella stessa cartella). Misure: `referto-fase9-pila.json`.

| | esito |
|---|---|
| **L'ordine, letto a schermo** | ✅ `n.2026/0020 · 0019 · 0018 · 0017 · 0011 · 0008 · 0007 · 0006 · 0005 · 0004` — **decrescente per arrivo**, identico a 390 e 768, chiaro e scuro. D244 fa quello che dice |
| **Scorrimento orizzontale** | ✅ assente in tutte e 12 (390/390 · 768/768 · 1280/1280) |
| **La pila aperta** | ✅ nessun troncamento, nessuna sovrapposizione; carte, pastiglia «APPENA ARRIVATO» e tasto «Conferma» a posto in entrambi i temi |
| ⚠️ **Un riscontro, e lo trova esattamente la FASE 9** | La frase di riepilogo in casa è **tagliata dentro il numero del lavoro**: a 390 si legge «*n.2026/0020, n.2026/001…*» — resi **226px** su **393** necessari. L'ellissi è gestita (§4 ✅, non è un taglio brutale), ma cade **in mezzo alla seconda targa** e mostra un numero **che non esiste**. A 768 resi 316 su 393: stesso taglio, più tardi. 📌 **Non è una regressione di D244** — la frase vecchia («n.2026/0002, n.2026/0001…») era lunga uguale — ma è un difetto vero di questa superficie, e prima di oggi nessuno l'aveva guardato |
| 📌 **A 1280 la pila non si apre da quell'etichetta** | La casa desktop è un'altra composizione (`HomeDesktop`): «Appena arrivati 13» è un numero di riepilogo, non un premibile. `provato:` il clic sull'etichetta va in timeout a 1280 e riesce a 390/768. **Non è un difetto** — è un layout diverso — ma va detto, perché significa che **la prova dell'ordine a 1280 non è stata fatta** e resta da fare dalla via giusta della pagina desktop |

---

## 5. Che cosa si fa dei riscontri

🛑 **Nessuna correzione è stata applicata in questo passaggio, ed è voluto.** L'handoff del mattino lo
diceva già: «*se trova qualcosa si corregge in un rilascio a sé*». Un gate che corregge mentre misura
non lascia un prima e un dopo confrontabili.

| # | riscontro | dimensione | chi decide |
|---|---|---|---|
| **G1** | l'avviso copre i tasti di caricamento | 🔴 **media, e NON locale** — si decide dove si posa l'`Avviso`, e la scelta vale per ogni superficie futura | **Francesco** (è una scelta di sistema, §0C panel) |
| **G2** | nome file a 1,47:1 sotto il velo | 🟡 piccola — o il nome sale sopra il velo, o non si rende affatto (il disegno dice che la tessera è «il segno», la frase sta nell'avviso) | tecnica |
| **G3** | «1 foto allegate» | 🟢 una riga | tecnica |
| **G6** | la scheda attiva fuori vista | 🟡 piccola (`scrollIntoView` sulla voce attiva al montaggio) | tecnica |
| **G4** | emoji al posto delle icone | 🟡 media — tocca il dizionario delle icone del DS | **Francesco** |
| **G5** | il nome mangia il messaggio | 🟢 un'ellissi centrale | tecnica |
| **G7** | «Vai al contenuto» 139×37 | fuori perimetro | riferito in roadmap |
| **G8** | la targa tagliata a metà nella frase di casa (§4-bis) | 🟢 piccola — troncare per elementi interi invece che per caratteri | tecnica |

---

## 6. Il banco non ha lasciato niente dietro di sé

`provato:`, a giro finito, **sul database vero**:

```
foto sul lavoro 2026/0020: 1        →  impronta | image.jpg | 2026-08-05T13:14:03Z  (quella dell'iPhone, invariata)
lavori totali nel progetto: 299     →  erano 299 a inizio sessione
file nel magazzino per il lavoro: 0 →  nessun file orfano
```

🔑 **E la ragione per cui non poteva lasciare niente è la stessa cosa che il gate stava provando:**
il controllo di peso scatta **prima** che parta un byte (`TabImmagini.tsx:225-228`), quindi ogni
rifiuto è avvenuto nel browser. Nessuna riga creata, nessuna riga cancellata, nessuna pulizia da fare.

**I file di prova** (quattro da 51 MB, più quattro con nomi da 139-141 caratteri) erano in
`scripts/tmp/gate-l2-0805/`, che git ignora. Si rifanno in una riga:
`mkfile -n 51m <nome>.pdf`.
