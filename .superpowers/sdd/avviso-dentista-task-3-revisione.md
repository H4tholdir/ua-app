# Revisione del Task 3 — «L'avviso al dentista»

**Quando:** 09/08/2026, pomeriggio. **Chi:** l'orchestratore, sul codice vivo.
**Esito:** ✅ **il Task 3 si chiude.** Nessuna affermazione del resoconto è stata smentita.
🔑 **E per la prima volta l'esecutore ha smentito una premessa del MIO brief**, misurandola.

## 1. Verificato da me

| cosa | esito |
|---|---|
| Albero, salvataggi, `main` | pulito (tranne il **mio** brief, non tracciato — colpa mia, §4) · 3 salvataggi · `main` intatta a `7427a680` |
| Le due funzioni restano separate | `provato:` `grep descriviCampiCorretti src/lib/avvisi/messaggio.ts` → **una sola occorrenza, la definizione**. `buildAvvisoMessage` non la chiama ✅ |
| La prova **deriva** le frasi vietate | `tests/unit/avviso-messaggio.test.ts:74` importa `CAMPI_CORREGGIBILI_DOCUMENTO` e lo usa a `:216` — **non un elenco ricopiato** ✅ |
| La difesa a compilazione è conservata | `NOME_CAMPO: Record<CampoCorreggibile, string>` (`:127`) ✅ — una voce nuova accende `tsc` qui |
| Il confine col tipo largo è chiuso | `descriviCampiCorretti(campi: readonly string[])` + `NOME_CAMPO[c as CampoCorreggibile] ?? CAMPO_NON_PIU_PREVISTO` — **nessun `undefined` può arrivare a schermo** ✅ |
| Prove | `npx vitest run tests/unit/avviso-messaggio.test.ts` → **14 passate su 14** ✅ |
| Tipi | `npx tsc --noEmit` → **`TSC_EXIT=0`** ✅ |

**Riferito, non verificato da me:** `verify:full` a `5762 | 119` su 462 file. **Non ho rilanciato la
verifica intera** — ho misurato il pezzo nuovo (14 su 14) e i tipi (0), e il conto torna sulla mia base di
poche ore prima (`5748 + 14 = 5762`, `461 + 1 = 462`). ➡️ **La cosa che conta è che le saltate NON sono
salite**: 119 prima, 119 dopo. Le prove di questo task sono unitarie, quindi la verifica locale **le
esegue** — al contrario delle 35 dei due task precedenti.

## 2. 🔴 Il difetto ① era vero, e stavolta è MISURATO invece che argomentato

Il brief sosteneva che la prova scritta nel piano «passa per costruzione». L'esecutore non si è fermato a
darmi ragione: **l'ha messa alla prova.** Contro un abbozzo vuoto, **3 `it` su 14 passano — e uno dei tre
è esattamente quello del piano.**

🔑 **Questa è la differenza fra un rilievo e una prova.** Il piano controllava che il messaggio non
contenesse `'Mario'`, un nome che la funzione **non riceve**: quella riga è verde anche su una funzione
che restituisce stringa vuota. Ora il confine è tenuto da una prova che **deriva** le frasi vietate
dall'elenco vivo dei campi correggibili: **se un giorno nasce una settima voce, entra nella prova da
sola.**

## 3. 🟠 I tre difetti nuovi, e il primo è di sostanza

**N1 — il tipo strettо era una bugia al confine.** Il piano dichiarava
`descriviCampiCorretti(campi: readonly CampoCorreggibile[])`, ma la colonna da cui quei valori arrivano è
**`campi_corretti: string[]`** (`provato:` `src/types/database.types.ts:161`) — **senza vincolo, per
scelta del Task 2**, perché un registro dell'Art. 19 GDPR deve poter dire cosa fu corretto *allora*, anche
quando l'elenco di oggi è cambiato. 🔑 **Con la firma stretta il chiamante avrebbe forzato il tipo, e
`NOME_CAMPO[c]` avrebbe messo `undefined` dentro uno `string[]`: «undefined» stampato a un dentista.**
Risolto allargando il parametro e **tenendo** la difesa a compilazione dove serve (nel `Record`).
📌 Precedente in casa citato dall'esecutore: `isStatoAvviso` in `stati.ts`, nato per la stessa ragione.

**N2** — la prova dipendeva dall'ambiente (l'indirizzo dell'app non fissato): ora è fissata come il
precedente già in casa. **N3** — tre sue asserzioni erano **vacue**, e le ha trovate **il conteggio di
R-P4**, non la lettura: è la dimostrazione che quel conteggio serve.

## 4. 🔴 Due cose mie

**① Il brief del Task 3 non era salvato.** L'ha notato l'esecutore (suo ritrovamento ⑧④): l'ho scritto e
non l'ho aggiunto a git, mentre i due precedenti sono dentro. È la stessa famiglia del difetto delle
sonde in `scripts/tmp/`: **un documento che governa il lavoro e vive in un posto solo.** Salvato in questa
tornata.

**② Una premessa del mio brief era falsa, e l'ha misurata lui.** Al punto ⑥ avevo scritto «*se esiste già
un posto solo da cui si prende l'indirizzo dell'app, usa quello*». **Non esiste:** `provato:`
`grep -rn NEXT_PUBLIC_APP_URL src/ | wc -l` → **10** occorrenze, e **due** danno la variabile per certa
con l'asserzione `!` (`src/app/api/stripe/portal/route.ts:7`, `src/app/api/stripe/checkout/route.ts:9`),
dove tutti gli altri usano un ripiego. ➡️ **Riga 45 della coda.**
🔑 **La forma condizionale mi ha salvato per caso, non per merito:** «se esiste» non è un'affermazione,
ma è arrivata all'esecutore come un'aspettativa — e un'aspettativa in un mandato pesa come un fatto.

## 5. Che cosa passa al Task 4

1. 🛑 **Il pavimento delle migration è invariato: `20260809133546`** (questo task non ne ha scritte).
2. 🔑 **Il gettone del portale è per CLIENTE, non per lavoro** — `public.clienti.portale_token`, `uuid`
   `NOT NULL DEFAULT gen_random_uuid()`, con scadenza a un anno su `portale_token_scade_at` e una rotta
   che lo rigenera. **È raggiungibile** dalla scheda del lavoro (il cliente arriva intero al componente).
   ⚠️ **Ma `GET /api/clienti` non lo restituisce, di proposito:** chi costruirà il foglio (Task 5) **non
   deve cercarlo da una lista clienti**.
3. ⚠️ **La scadenza del gettone non è controllata da nessuno in questa catena:** `buildAvvisoMessage`
   riceve una stringa. Un avviso con un gettone scaduto manderebbe il dentista su una porta chiusa.
   **Marcato `non provato` dall'esecutore, e va deciso al Task 4 o 5.**
4. 📌 **Il formato del numero di lavoro:** la fixture `2026/0042` è vera ma **minoritaria** — 19 righe su
   299; la maggioranza è `STOR/2021/016` (**276**). Chi scrive fixture nei task seguenti usi la forma
   maggioritaria, o entrambe.
5. 🟠 Restano aperti dal Task 2: le nove difese senza prove e il commento sbagliato di `correzioni.ts`
   (riga **44**).
