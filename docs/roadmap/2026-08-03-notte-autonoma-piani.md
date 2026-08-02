# I piani scritti PRIMA — P13 e P11 (notte D168)

> Il mandato della notte chiedeva un **piano scritto prima** per le due voci a raggio largo. Eccoli, come
> sono stati scritti: **non ripuliti dopo**, perché il valore di un piano sta anche in ciò che dava per
> buono e in ciò che si è rivelato diverso.
> ⚠️ **Erano nati in `scripts/tmp/`, che è ignorato da git** — cioè sarebbero spariti, mentre i messaggi
> dei salvataggi li citano. Portati qui alla chiusura.

---

# Piano — P13: le rotte che producono un documento si mettono d'accordo su chi ha sbagliato

**Scritto PRIMA di toccare il codice**, come chiede il mandato della notte per le voci a raggio largo.
**Ramo:** `p13-chi-ha-sbagliato` · **Data:** 3 agosto 2026, `provato:` `date` → `Mon Aug 3 01:35 CEST 2026`.

---

## 1. Il censimento — e sono SETTE, non quattro

La voce di roadmap ne nominava tre più il DPA. `provato:` `grep -rln "application/pdf" src/app/api` →
**sette** rotte che restituiscono un documento (l'ottava, `lavori/[id]/immagini`, **riceve** file e non ne
genera: fuori perimetro, e i suoi stati sono suoi).

| # | rotta | `catch` finale | che cosa manda al chiamante | `letto:` |
|---|---|---|---|---|
| 1 | `clienti/[id]/dpa` | **500** | `e.message`, **con ragione scritta** | righe 95-126 |
| 2 | `tecnici/[id]/cedolino` | **500** | `e.message` | righe 60-84 |
| 3 | `lavori/[id]/scheda-fabbricazione` | **500** | **testo fisso** ✅ | righe 44-52 |
| 4 | `impostazioni/nomina-prrc` | 🛑 **400** | `e.message` | righe 21-25 |
| 5 | `lavori/[id]/etichetta` | 🛑 **400** | `e.message` | righe 46-51 |
| 6 | `lavori/[id]/ifu` | 🛑 **400** | `e.message` | righe 14-50 |
| 7 | `lavori/[id]/ricevuta-consegna` | 🛑 **400** | `e.message` | righe 45-50 |

🔑 **Il modello NON va inventato: è già in casa, ed è la ③.** `scheda-fabbricazione` fa **500 + testo
fisso**, che è esattamente la coppia giusta. Il DPA (①) è il modello per *distinguere* i cammini a monte
(`ErroreDatiDpa` con 404/422), ma sul messaggio tiene `e.message` **per una ragione sua, scritta nel file**:
lì arrivano solo testi fissi e curati, chiusi a monte in `generate-dpa.ts`.

## 2. Il difetto, in una riga per ciascuno

**① Lo stato dice la cosa sbagliata.** `400` significa «**hai sbagliato tu**», `500` significa «**ho
sbagliato io**». Nelle quattro rotte marcate 🛑 il `catch` prende **i guasti della generazione** — il
database che non risponde, un modello che esplode — e li racconta come colpa di chi ha premuto il tasto.

**② Il messaggio interno esce.** `e.message` va dritto nel corpo della risposta. È il difetto di **P11**
visto da un'altra strada: qui non passa da `generaProgressivo`, ma il risultato è lo stesso — il testo di
un guasto interno arriva a chi sta davanti allo schermo.

⚠️ **Le due cose stanno sulla STESSA RIGA**, quindi si toccano una volta sola. Non è un allargamento del
mandato: è che quella riga non si può correggere a metà. (Stessa forma di P23, dove il terzo pezzo era ciò
che rendeva vivi i primi due.)

## 3. Che cosa si fa — e che cosa NON si fa

✅ **Si fa:** le quattro rotte a `400` passano a **`500` con testo fisso**, copiando la forma della ③.
✅ **Si fa:** `cedolino` (②) tiene il suo `500` ma passa al **testo fisso** — oggi manda `e.message`, e a
differenza del DPA **non ha nessuna garanzia a monte** che quei testi siano curati.
🛑 **NON si fa:** toccare il DPA. Il suo `e.message` ha una ragione **scritta e verificata** nel file, e
riaprirla senza il suo panel sarebbe disfare una decisione presa.
🛑 **NON si fa:** introdurre `ErroreDatiDpa` (o una classe gemella) nelle altre sei per distinguere
404/422 alla fonte. È un lavoro vero, per ognuna delle sei, e va oltre «mettersi d'accordo sullo stato».
Resta come voce.
🛑 **NON si fa:** P11 alla sorgente (`src/lib/db/progressivi.ts`). Raggio: **tutti** i documenti.

## 4. Il rischio, misurato prima

- `provato:` **nessuna prova esistente** verifica un `400` su queste rotte
  (`grep "toBe(400)"` sui loro file di prova → **zero righe**).
- `provato:` il corpo della risposta è **identico** nei tre casi (`{ error: … }`): cambia solo lo stato.
- ⚠️ **Da verificare durante il lavoro, non dopo:** che nessun codice del client dirami sullo stato di
  queste sei rotte. Il DPA lo fa (`esitoDa`), ma è fuori perimetro.

## 5. L'ordine, e la prova che conta

1. **Prima il rosso.** Una prova per ciascuna delle sei rotte: se la generazione fallisce, la risposta è
   **500** e il corpo **non contiene** il testo interno. Modello: `tests/unit/scheda-fabbricazione-route.test.ts`.
   ⚠️ **La prova che vale è la seconda metà** — che il messaggio interno **non esca**: un test che guarda
   solo il numero 500 passerebbe anche lasciando il difetto peggiore.
2. Correzione, una rotta alla volta.
3. Verde.
4. **FASE 7 intera.**
5. Roadmap + verbale (**D175**) + memoria, poi salvataggio sul ramo. 🛑 **Niente pubblicazione** (D169).

## 6. Le assunzioni che questo piano dà per buone, e come si provano

| assunzione | come si prova | esito |
|---|---|---|
| nessuna prova verifica quei `400` | `grep -rn "toBe(400)"` sui file di prova delle sei rotte | ✅ zero righe |
| `scheda-fabbricazione` è già nella forma giusta | letto: righe 44-52 | ✅ `500` + testo fisso |
| le sei rotte hanno tutte la stessa forma di `catch` | letto: una per una, §1 | ✅ quattro identiche, `cedolino` simile |
| nessun client dirama sullo stato | 🔲 **da provare durante il lavoro** | — |


---

# Piano — P11: il messaggio del database smette di uscire da `generaProgressivo`

**Scritto PRIMA di toccare il codice.** **Ramo:** `p11-il-messaggio-del-database`
`provato:` `date` → **01:05 di lunedì 3 agosto 2026**.

## 1. Il difetto, alla fonte

`src/lib/db/progressivi.ts:31` — `throw new Error(\`generaProgressivo fallito (tipo=${tipo}): ${error.message}\`)`.
Su un guasto vero `error.message` è il testo di PostgREST: contiene **l'INSERT per intero**, il nome di
`public.progressivi_anno` e la firma della funzione. Se il chiamante non cattura, quel testo risale fino
alla risposta HTTP.

## 2. Il censimento — sei chiamate in cinque file

| file | chiamate | `try` attorno alla chiamata? |
|---|---|---|
| `src/lib/pdf/generate-dpa.ts:237` | 1 | ✅ **sì**, con testo fisso — è il modello |
| `src/lib/pdf/generate-ddc.ts:127` | 1 | 🛑 no (il file ha un `try`, ma non lì) |
| `src/lib/pdf/generate-buono.ts:36` | 1 | 🛑 no |
| `src/lib/fattura/generate-xml.ts:216,231,237` | 3 | 🛑 no |
| `src/app/api/fatture/batch/route.ts:215` | 1 | 🛑 da verificare |

🔑 **Il raggio si è già ristretto stanotte:** con **P13** cinque rotte non rimandano più `e.message` al
chiamante. Restano esposte le vie che passano da rotte non toccate (fatture, DdC, buono).

## 3. La correzione — alla FONTE, non nei sei chiamanti

🔑 **Perché alla fonte e non mettendo un `try` in ognuno dei sei:** sei `try` sono sei occasioni di
dimenticarne uno, e il settimo chiamante nascerebbe scoperto. È la stessa ragione di **D171** (le funzioni
condivise per il fuso) e di **D170-bis** (la guardia invece della sola riparazione).

- il messaggio dell'`Error` diventa **fisso**, e tiene solo il `tipo` (che dice *quale documento*, e non è
  un fatto interno);
- il dettaglio va **nel log del server**, come fa già il DPA;
- l'errore originale resta agganciato come **`cause`** (standard JS), così chi ripara ce l'ha in mano.
  ⚠️ `provato:` `{ cause: … }` **non è mai usato in questo progetto** — quindi è un modo nuovo, e va scritto
  perché il prossimo lo riconosca.

🛑 **NON si tocca** il `try` del DPA: ha una ragione sua scritta (distingue «numero non assegnato» dagli
altri guasti) e resta valido anche dopo.

## 4. La prova che conta

Non «lancia un errore» — quello lo faceva già. **Che il testo del database NON sia nel messaggio**, e che
il dettaglio **non sia andato perso** (log + `cause`). Un test che guarda solo «lancia» passerebbe col
difetto intatto.

## 5. Ordine

Rosso → correzione → verde → **FASE 7 intera** → roadmap, verbale (**D176**), memoria → salvataggio sul
ramo. 🛑 Niente pubblicazione (**D169**).
