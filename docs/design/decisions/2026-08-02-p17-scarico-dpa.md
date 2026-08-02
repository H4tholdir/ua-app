# Decisione di design — P17, lo scarico del contratto che non va a buon fine

**Data:** 2 agosto 2026 (`provato:` `date` → `Sun Aug 2 18:34 CEST 2026`, regola §0F) ·
**Decide:** Francesco Formicola · **Stato:** approvata sui mockup
**Superficie:** il riquadro «Privacy — GDPR» della scheda dentista — `src/app/(app)/clienti/[id]/page.tsx`
**Design system:** **v2.3** — questa route non è fra quelle migrate a v3 (`ua-app/CLAUDE.md` §8), e i due sistemi non si mischiano mai nella stessa pagina (DS v3 §14).
**Mockup:** `docs/design/mockups/2026-08-02-p17-scarico-dpa.html` · **12 scatti** in `docs/design/mockups/screenshots/` (390 · 768 · 1280 × chiaro · scuro × variante A · B)
**Decisioni di verbale:** **D157** (si riparte da P17) · **D158** · **D159** · **D160** · **D161** · **D162** —
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

---

## 1. Il difetto, e quanto è grande davvero

Il tasto «Scarica DPA PDF» è un collegamento nudo (`<a href>`): premerlo è una **navigazione**, non una
richiesta di cui qualcuno controlla l'esito. Se la rotta risponde male, il browser mostra quello che ha
ricevuto — cioè `{"error":"Cliente non trovato"}` a schermo, **titolo vuoto, zero elementi premibili**. In una
PWA installata il tasto «indietro» del browser può non esserci affatto.

**Il censimento, fatto aprendo i file e non fidandosi della voce di roadmap** (R-P2):

`provato:` `grep -n "throw new" src/lib/pdf/generate-dpa.ts` → **11** righe.

| | cammini | esito | chi ha sbagliato |
|---|---|---|---|
| Dati fiscali incompleti | `:81` laboratorio · `:84` cliente | **422** | nessuno — manca un dato |
| «Non trovato» | `:124` laboratorio · `:125` cliente | **404** | la richiesta punta a un dato che non c'è |
| Guasti del servizio | `:115` `:168` `:191` `:215` `:240` `:290` `:394` | **500** | **UÀ** |

⚠️ **`:124` («Laboratorio non trovato») non è raggiungibile da questa rotta**, e la ragione è già scritta e
provata in `src/lib/pdf/errori-dpa.ts`: la chiave esterna `utenti_laboratorio_id_fkey` garantisce che, se
`context.laboratorioId` non è nullo, quella riga esista. **I cammini che cambiano faccia all'utente sono
quindi TRE**, più la famiglia dei guasti.

🆕 **E uno che la voce di roadmap non aveva** (trovato aprendo i file, → **D158**): la scheda **non guarda il
ruolo**. `provato:` `grep -n "ruolo" src/app/(app)/clienti/[id]/page.tsx` → **0** righe, mentre **10** altre
pagine sotto `src/app/(app)/` lo guardano. La rotta invece ammette solo `titolare · admin_rete ·
admin_sistema` (`route.ts:22`). **Quindi oggi un `tecnico` o un `front_desk` vede un tasto rosso che per lui
non funzionerà mai**, e premendolo riceve la stessa pagina di codice.

**Il secondo pezzo, sulla stessa scheda:** se il registro delle emissioni non si legge, `page.tsx:182-184`
scrive nel log e **non rende la riga** — cioè uno studio **mai emesso** e un **guasto di lettura** si vedono
**identici**. È il caso da manuale: «vuoto» significa *ho letto e non c'è niente*, «errore» significa *non
sono riuscito a leggere*, e mostrare il vuoto quando la lettura fallisce è un difetto, non una semplificazione.
🔑 **Il danno concreto:** un titolare può riemettere un contratto che esiste già.

---

## 2. Le decisioni prese, e perché

### ① Prevenire dove si può, raccontare dove non si può (**D159**)

**La scoperta che l'ha resa possibile: la scheda sa già, prima che si prema, se il documento fallirà.**
`page.tsx:126` legge `partita_iva, codice_fiscale` del cliente, e il contesto porta il laboratorio — cioè
**esattamente** i due dati che `generate-dpa.ts:81` e `:84` controllano.

- **Mossa ①** — manca un dato → il tasto nasce **inerte**, col motivo scritto e la via per rimediare. Il
  titolare **non prova nemmeno**.
- **Mossa ②** — guasto del servizio → il tasto diventa **vivo**: si resta sulla scheda, compare il messaggio,
  c'è un **Riprova**.

🛑 **La ① non rende inutile la ②.** I dati possono cambiare fra il caricamento della pagina e la pressione:
il **422 resta gestito** anche nel percorso vivo. Una prevenzione che togliesse il caso d'errore sarebbe una
prevenzione che si fida di una fotografia.

### ② Il tasto sparisce a chi non può usarlo, il riquadro resta (**D158** · **D160**)

Chi non è titolare **non vede il tasto**, ma vede tutto il resto: il testo che spiega cos'è il contratto, la
riga «Ultima emissione» e la promessa di conservazione.
🔑 **La ragione è di lavoro:** chi sta al banco deve poter rispondere allo studio al telefono — «*sì, risulta
emesso il 12 marzo*» — **senza poterlo riemettere**. Informazione e potere di agire sono cose separate.
🛑 **Scartato «tasto visibile ma spento»:** mostrerebbe a ogni tecnico, a ogni apertura di scheda, un tasto che
per lui non si accenderà **mai**. Diverso dai casi «manca la Partita IVA», dove lo spento è **temporaneo e
risolvibile da chi guarda**. ⚠️ **Quindi in questa superficie «spento» vuol dire una cosa sola: manca un dato,
e puoi rimediare tu.**

### ③ Variante **B — a blocco** (**D161**)

Ciò che non va è un riquadro con striscia colorata, titolo in grassetto e **un tasto vero**.
🔑 **Ha deciso l'uso, non il gusto: l'app si tocca in piedi al banco**, e un bersaglio grande da premere col
pollice vale più di un link sottolineato. ⚠️ Costa altezza **solo quando c'è qualcosa che non va**.

### ④ Costruita per essere ereditata (**D162**)

Messaggi e stati vivono in un **pezzo separato e riusabile**, non cuciti dentro la scheda dentista — così
l'ondata della firma a distanza, che rimetterà mano a questi stessi stati, **ci aggiunge** invece di
ricominciare. 🛑 **Non significa progettare la firma adesso:** significa non incollare questi stati a questa
sola scheda.

---

## 3. Gli otto stati approvati

| # | quando | tasto | cosa dice |
|---|---|---|---|
| ① | tutto a posto | attivo | — |
| ② | manca P.IVA/CF **del cliente** | inerte | «Manca un dato dello studio» → **Aggiungi il dato** (la modifica è già su questa scheda) |
| ③ | manca P.IVA/CF **del laboratorio** | inerte | «Mancano i dati del tuo laboratorio» → **Completa i dati del laboratorio** |
| ④ | mentre prepara | occupato | «Preparo il documento…» |
| ⑤ | guasto del servizio (7 cammini) | attivo | «Non è stato possibile preparare il documento — non dipende dai tuoi dati» → **Riprova** |
| ⑥ | non sei il titolare | **assente** | il riquadro resta, senza tasto |
| ⑦a | registro letto, emissione c'è | — | «Ultima emissione: DPA-… — 12 marzo 2026» |
| ⑦b | registro letto, **niente** | — | «Non ancora emesso per questo studio.» |
| ⑦c | registro **non leggibile** | — | «Non riesco a leggere il registro» → **Ricarica** |

⚠️ **Il 404 «Cliente non trovato»** (collegamento vecchio, cliente cancellato, id di un altro laboratorio)
ricade nel percorso vivo con il suo messaggio: la scheda però è stata caricata, quindi il caso si vede solo se
il cliente sparisce fra il caricamento e la pressione.

---

## 4. Accessibilità — le due misure che hanno cambiato il disegno

**① Il tasto inerte NON usa l'attributo `disabled`.** Quell'attributo toglie l'elemento dalla navigazione da
tastiera e chi usa un lettore di schermo non sa nemmeno che esiste — proprio nel caso in cui il messaggio
accanto spiega come rimediare. Si usa **`aria-disabled`**, che lascia l'elemento raggiungibile e annunciato.
Fonti lette il 02/08/2026: [CSS-Tricks](https://css-tricks.com/making-disabled-buttons-more-inclusive/) ·
[Kitty Giraudel](https://kittygiraudel.com/2024/03/29/on-disabled-and-aria-disabled-attributes/).

**② Il colore non è mai l'unica fonte di stato, e sui testi nuovi si usa `--t1`.**
`misurato` sul fondo vero della card (`sfc`, chiaro `#E4DFD9` · scuro `#232018`):

| colore | su card chiara | su card scura | verdetto |
|---|---|---|---|
| `--t1` | ~13:1 | **14,06:1** | ✅ ovunque |
| `--t2` `#8A8580` | 7,9:1 | **4,45:1** | ❌ scuro (P16) |
| `--t3` `#5A5652` | 4,85:1 | **2,24:1** | ❌ scuro (P16) |
| rosso `#D90012` come **testo** | **4,01:1** | — | ❌ sotto 4,5 |
| ambra `#F59E0B` come **testo** | ~2,1:1 | — | ❌ sotto 4,5 |

➡️ **Quindi il colore sta nell'icona e nella striscia** (un segno grafico deve reggere **3:1**, e li regge),
**il testo sta su `--t1`.**

🛑 **P16 NON si riapre qui, ed è già deciso.** Le righe «Ultima emissione…» (`--t2`) e «Stampa e firma…»
(`--t3`) restano illeggibili in modo scuro: è **P16**, misurata il 04/08 e **deferita da D134** all'ondata di
migrazione a v3 di questa route, perché **nessun colore di testo v2.3 scuro passa su questa card** tranne
quello dei titoli. 🔑 **Deferire un difetto esistente è una scelta; nascere con lo stesso difetto su testo
nuovo non lo è** — per questo tutto ciò che P17 **aggiunge** sta su `--t1`.

---

## 5. Che cosa questo lavoro NON fa

- **Non tocca `generate-dpa.ts`.** Gli stati HTTP sono già giusti e già provati (D133 e il lavoro del 01/08):
  P17 è un difetto di **come si presenta** l'esito, non di come si decide.
- **Non riapre P16** (deferita, **D134**), **né P13** (le rotte PDF sorelle che non concordano sullo stato
  d'errore: stessa famiglia, **altre rotte**), **né P11** (il messaggio del database che arriva all'utente).
- **Non introduce una sorveglianza degli errori.** `provato:` in questo repo non ce n'è
  (`grep -rniE "sentry|captureException" src package.json` → nessuna riga): dirlo serve a non appoggiare
  nessuna scelta su un sistema che non esiste.
- **Non cambia chi può emettere.** Il controllo di autorizzazione della rotta resta identico: cambia solo che
  la scheda smette di offrire un tasto a chi quel controllo respingerà.
