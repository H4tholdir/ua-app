# BRIEF — Task D: il foglio, il passo di correzione (D322, variante A)

**Ramo:** `intervento-post-consegna` (🛑 **MAI un worktree**) · **Base:** il salvataggio che porta questo brief
**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`, sezione «Task D»
**Decisioni eseguite:** ⚖️ **D322** (variante A) · **D320** (il nome del paziente si corregge in
anagrafica) · **D316** · **D314** · **D315**
**Mockup APPROVATO da Francesco:** `docs/design/mockups/2026-08-08-passo-correzione.html`
(screenshot in `docs/design/mockups/screenshots/`) — 🔑 **è la forma approvata: il React le è fedele, e
ogni scostamento si dichiara nel resoconto col perché.**

---

## 0. IL MANDATO IN UNA FRASE

**Nel foglio «Devo intervenire», dopo il motivo «C'è un dato sbagliato sulla dichiarazione», nasce un
passo nuovo — «Che cosa c'è di sbagliato?» — che mostra le SEI voci stampate col loro valore di adesso,
ne fa correggere una o più, e al tocco finale registra l'evento e chiama l'atto unico.**

🛑 **NON è in questo compito la prova a schermo** (FASE 9) **né il gate estetico L2**: sono il **Task
D-bis**, che va a un esecutore diverso. Tu ti fermi alla FASE 7.

---

## 1. DOVE SI INNESTA — e questo è già misurato, non lo devi scoprire

`src/components/features/lavori/scheda-v3/DevoIntervenire.tsx` è una **macchina a stati** dentro **un
solo** `Sheet`:

```
type Fase = 'chiuso' | 'domanda' | 'motivo' | 'domandaUscito' | 'dettagli' | 'proposta' | 'esito'
```

⚖️ **D322 — variante A: la correzione viene PRIMA delle quattro caselle di legge.** L'ordine diventa:

```
motivo → correzione (NUOVA) → dettagli → proposta / esito
```

🛑 **Solo per il motivo `errore_dato_dichiarazione`.** Ogni altro motivo va a `dettagli` come oggi
(`scegliMotivo`, riga 213-221). ⚠️ `errore_registrazione` va a `domandaUscito`: **non toccarlo**, è il
Task A, chiuso e revisionato.

🛑 **MAI un secondo overlay.** Si **cambia fase** dentro lo stesso `Sheet`: la pila di
`storia-overlay.ts` è già stata pagata una volta con un tasto «indietro» morto.

---

## 2. 🔴 IL PEZZO CHE IL PIANO NON DICE E CHE DEVI RISOLVERE PER PRIMO: DA DOVE ARRIVANO I VALORI

`provato:` (orchestratore) `SchedaLavoroV3.tsx:590` monta il foglio con **DUE sole** proprietà:

```tsx
<DevoIntervenire lavoroId={lavoro.id} descrizione={lavoro.descrizione} />
```

➡️ **Le sei voci e il gettone di concorrenza OGGI NON ARRIVANO AL COMPONENTE.** Prima riga del tuo
lavoro: decidere da dove arrivano, e **scrivere nel resoconto perché hai scelto così**.

🔑 **IL VINCOLO CHE DECIDE, ed è misurato (P13 · P14 del piano):**

- **Il valore mostrato e l'`updated_at` devono venire dalla STESSA lettura e viaggiare insieme.** Il
  contratto della rotta è «*i valori che hai visto sono ancora quelli*», non «la riga non è cambiata
  negli ultimi 200 ms». Se il gettone lo producesse una lettura fresca al momento dell'invio, la guardia
  **non potrebbe quasi mai accendersi** — cioè una guardia che non può fallire, che è **la lezione della
  giornata applicata a un cancello invece che a una sonda**.
- 🛑 **IL GETTONE SI RIMANDA INTATTO. MAI un `new Date(...)`, mai un `.toISOString()` di ritorno.**
  `provato:` `denti/route.ts:88-93` — `timestamptz` ha precisione al **microsecondo**, `Date` di JS al
  **millisecondo**: un solo riparsing tronca `.123456` a `.123`, il confronto non torna **mai** uguale, e
  il risultato è un **409 permanente che nemmeno ricaricando si sana**. Viaggia come stringa, così com'è.

📌 La strada che raccomando (**ma la scelta è tua, e se ne trovi una migliore la motivi**): estendere le
proprietà da `SchedaLavoroV3`, che ha già l'oggetto `lavoro` intero — così valori e gettone nascono dalla
stessa lettura del server per costruzione, senza doverlo garantire a mano. **Verifica** che `lavoro` porti
davvero tutte e sei le voci **e** `updated_at`: se una manca, dillo, non inventarla.

---

## 3. LE SEI RIGHE — l'elenco si conta sull'array, non su questo brief

🛑 **L'elenco autoritativo è `CAMPI_CORREGGIBILI_DOCUMENTO` in `src/lib/dichiarazione/correzioni.ts`.**
Aprilo e contale. È sceso **due volte in un giorno** (otto → sette con D319, sette → sei con D320) e
tutt'e due le volte un commento vicino al codice è rimasto indietro.

| riga a schermo | chiave | forma del valore da MANDARE |
|---|---|---|
| Chi ha prescritto | `richiedente_nome` | testo |
| Paziente | `paziente_id` | **UUID** — si sceglie un'altra persona, **non si scrive un nome** |
| Tipo di dispositivo | `tipo_dispositivo` | testo (⚠️ vocabolario chiuso: **cerca il selettore che esiste già**) |
| Descrizione | `descrizione` | testo |
| Denti | `denti_coinvolti` | 🔴 **oggetti `{fdi, ruolo, …}`, NON la lista di stringhe che la colonna mostra** |
| Caratteristiche prescritte | `prescrizione_caratteristiche` | oggetto `{elementi, colore}` |

### 🔴 Tre trappole in questa tabella, tutte già pagate

- **`denti_coinvolti`**: la chiave **si chiama come la colonna denormalizzata** (`["26"]`) e **invita
  all'errore**. Il contratto vuole il carico della **penna**: oggetti con `fdi` (intero) e `ruolo`.
  `provato:` è il difetto ③ trovato dall'esecutore del Task B, che moriva due funzioni più in là con
  `23502`. **Validatore di casa:** `src/lib/domain/denti-validazione.ts` (`validaDenti`). 🔑 **E un
  selettore di denti nell'app ESISTE**: `src/components/features/odontogramma/` — **cercalo per
  COMPORTAMENTO e riusalo**, non farne un secondo.
- **`prescrizione_caratteristiche`**: **due caselle, `elementi` e `colore`. NON `tipo`.** Il controllo
  d'ingresso accetterebbe `tipo`, ma sul documento **non arriva mai** (`caratteristiche-prescritte.ts:66-71`,
  D213: è ciò che il laboratorio **ha fatto**, non ciò che il medico ha **prescritto**). *Una riga che si
  può toccare e non cambia niente sul foglio è una riga che mente.*
  ⚠️ **E una casella non si può SVUOTARE**: `{colore: ''}` e `{colore: null}` prendono **422**
  (`correzioni.ts:242-252`), perché la voce 6 dell'Allegato XIII è un contenuto dovuto. A schermo va
  **detto prima**, non scoperto con un errore.
- **`paziente_id` è un UUID, non un nome.** ⚖️ **D320**: da questo foglio si cambia **quale persona**,
  mai **come si chiama**. Il nome si corregge in **Anagrafica** — la via esiste ed è viva
  (`PazienteEditSheet` su `/pazienti/[id]`, scritta per l'Art. 16 GDPR).
  🛑 Se la riga «paziente» avesse un campo di testo, D320 sarebbe disattesa **e la fotografia del nome
  tornerebbe dalla finestra**: la chiave `paziente_nome_snapshot` **è stata tolta dal contratto proprio
  ieri sera** (Task C-sexies) e la rotta la **rifiuta**.

---

## 4. I PASSI

- [ ] **Passo 1 — le prove, PRIMA del codice** (TDD, FASE 6).
- [ ] **Passo 2 — il passo mostra VALORI, non controlli.** Titolo **«Che cosa c'è di sbagliato?»**, le
  sei righe con **il valore che c'è adesso**. Si tocca una riga → **cambia fase**, si corregge, si torna
  all'elenco e la riga mostra `vecchio → nuovo` con la pastiglia **«da rifare»** (v. mockup).
- [ ] **Passo 3 — il blocco «Da qui non si corregge»**, e nomina **DUE** cose (D316 · D320):
  - i dati del **laboratorio** → **Impostazioni**;
  - il **nome del paziente** → **Anagrafica**, «*così vale per tutti i suoi lavori. Poi torni qui e rifai
    la dichiarazione*».
  🛑 **Navigare da dentro un overlay v3 si fa SOLO con `useNavigaDaOverlay`**
  (`src/components/ds/useNavigaDaOverlay.ts`), **mai `router.push` nudo**: quegli overlay tengono una
  entry di storia che è un doppione della pagina, e con un `push` la pagina nuova ci si impila sopra e
  resta sepolta — difetto già pagato.
- [ ] **Passo 4 — il tasto finale dice quello che fa:** **«Correggi e rifai la dichiarazione»**, mai
  «Salva». **Spento finché non si è corretto niente, COL PERCHÉ SCRITTO SOTTO** (v. mockup): un tasto
  grigio senza spiegazione non è il disegno approvato.
- [ ] **Passo 5 — niente si salva prima di quel tocco.** Prova: monta, correggi, **smonta** → **nessuna**
  chiamata al server.
- [ ] **Passo 6 — il tocco finale sono DUE chiamate in fila:**
  1. `POST /api/lavori/{id}/eventi-qualita` — è `registra()`, che **esiste già**. ✅ Su questo motivo
     l'effetto è **`azione: null`** (`provato:` `effetti.ts:112-115`), quindi **l'evento nasce pulito e
     nessuna azione automatica lo consuma**.
  2. `POST /api/lavori/{id}/dichiarazione/riemetti` con
     `{ evento_id, correzioni, atteso_updated_at }`.
  🛑 **L'`evento_id` si TIENE NELLO STATO e si RIUSA** se la seconda fallisce e la persona riprova.
  Crearne uno nuovo a ogni tentativo lascerebbe eventi orfani — e riusare quello vecchio è anche ciò che
  rende utile la porta d'idempotenza della rotta, che **dopo un successo restituisce il successore**.
- [ ] **Passo 7 — gli errori si LEGGONO.** La rotta risponde **422** con messaggi scritti per chi sta al
  banco (compreso il vuoto in profondità, **col percorso dentro**: «*La correzione di
  «prescrizione_caratteristiche.colore» è vuota…*»), **409** sul conflitto del gettone, e traduce
  `23505`. **Mostrali**, non sostituirli con un «qualcosa è andato storto». ⚠️ E il 409 è onesto: dillo
  come «*qualcuno ha cambiato questo lavoro mentre eri qui: riapri e riprova*».
- [ ] **Passo 8 — FASE 7** e salva.

---

## 5. LE REGOLE DI CASA CHE VALGONO SU QUESTO FILE

- **Animazioni SOLO da token v3** (`src/design-system/v3/motion.ts`) — **MAI** `duration: 0.3` inline.
  Suoni/haptic da `src/design-system/v3/{sound,haptic}.ts`. Componenti **solo** da `src/components/ds/`.
- **Bersagli premibili ≥ 44 px**; il colore non è **mai** l'unica fonte di stato.
- **In tema scuro una superficie premibile NON si dipinge del colore del pannello che la contiene**:
  sale a `--elv` dentro un `--card`. Il mockup lo fa e lo dichiara.
- **`prefers-reduced-motion`** rispettato.
- ⚖️ **D318 — `git add <percorsi>`, MAI `git add -A`.** ⚠️ Con `git commit -m` la shell **esegue i
  backtick**: per i messaggi lunghi `-F <file>`.
- ⚠️ `npm run verify:full` **ci mette più di due minuti**: `timeout: 600000`, e l'uscita si legge **da
  variabile** (`npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"`).

---

## 6. TDD — R-P4, e il numero si scrive

- Dopo il primo rosso, **abbozzo inerte** e **CONTA** quante asserzioni si accendono (`N su M`).
- **Le forme d'input da enumerare**, ognuna col suo caso o col suo «non coperta, perché»: nessuna
  correzione fatta (tasto spento) · una sola voce · più voci insieme · una voce corretta e poi
  **rimessa al valore di prima** (è ancora una correzione?) · valore svuotato · sotto-chiave svuotata ·
  denti azzerati · smontaggio a metà · **seconda chiamata fallita e ritentata** (l'evento si riusa?) ·
  409 · 422 · corpo illeggibile.
- 🛑 **UNA PROVA NUOVA NON È FINITA FINCHÉ NON L'HAI VISTA DIVENTARE ROSSA rompendo apposta il codice.**
  In questa giornata **quattro** prove scritte bene non potevano fallire, e una quinta passava **sia con
  la regola vecchia sia con quella nuova**. Se una tua prova resta verde con la mutazione ovvia, **non è
  una prova: è decorazione**.

---

## 7. 🛑 CHE COSA NON DEVI FARE

- 🛑 **Niente FASE 9 e niente gate L2**: sono il **Task D-bis**, a un esecutore diverso.
- 🛑 **Non toccare** `src/lib/dichiarazione/correzioni.ts`, la rotta `…/riemetti`, la RPC,
  `generate-ddc.ts`, `precheck.ts`, `PATCH /api/pazienti/[id]`, `PazienteEditSheet`. Sono contratti
  **fermi e revisionati**: se uno ti sembra sbagliato, **lo riferisci** (R-E2), non lo pieghi per far
  tornare il tuo codice. *È il rischio numero uno che questo piano si attribuisce da solo.*
- 🛑 **Non toccare il percorso di `errore_registrazione`** (Task A, chiuso e revisionato) né gli altri
  motivi.
- 🛑 **Non allargare l'elenco delle voci correggibili.**

---

## 8. ⚠️ RITROVAMENTI GIÀ NOTI — non segnalarli come nuovi

**I3** (la porta d'idempotenza della rotta `…/riemetti` ha **una sola** asserzione) · **M1** (lo `switch`
di quella rotta senza `default` né guardia di esaustività) · **`{"denti_coinvolti": []}`** cancella tutti
i denti · **`Esc` sopra la finestra fa scattare due ascoltatori** (`Sheet.tsx:160` +
`DialogConferma.tsx:87`, preesistente) · **la riga 8 del corpo vivo della RPC dice «SETTE NOMI» sopra un
elenco di sei** (R1: si corregge solo se qualcuno riemette quella funzione — tu non la riemetti).

---

## 9. CHE COSA IL RESOCONTO DEVE CONTENERE

`.superpowers/sdd/atto-unico-task-d-report.md`:

1. **Da dove arrivano i valori e il gettone**, e **perché** hai scelto così (§2).
2. **Che cosa hai cambiato**, percorso per percorso.
3. **R-P4:** il conteggio (`N su M`) e l'enumerazione delle forme d'input col loro esito.
4. **Che cosa hai rotto apposta** per vedere le prove diventare rosse, e che cosa si è acceso.
5. **La FASE 7** con l'uscita letta da variabile e il conto delle prove. Base: **5628 | 68 su 454**.
   📌 **Aspettativa dichiarata: qui il numero DEVE muoversi parecchio** — è il compito più grosso
   dell'ondata.
6. **Gli scostamenti dal mockup**, se ce ne sono, col perché.
7. 🔴 **DOVE QUESTO BRIEF SBAGLIA.** Cercalo attivamente: in quest'ondata **otto compiti su otto** hanno
   trovato un difetto reale nel proprio brief, e alcuni erano gravi. Se non trovi niente, **scrivilo** —
   ma cercalo davvero.
8. **I ritrovamenti FUORI MANDATO (R-E2): si riferiscono, non si correggono.**
9. **Che cosa NON hai fatto**, per intero.
