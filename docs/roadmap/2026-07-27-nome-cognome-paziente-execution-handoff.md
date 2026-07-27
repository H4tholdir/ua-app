# Handoff — Nome e cognome del paziente: spec ratificata, si esegue (27/07/2026)

**Per:** la sessione successiva, con contesto pulito.
**Prima di tutto:** BP-0 — `memory/MEMORY.md` **voce 49** (e 48 per il filo della giornata prima),
poi **la spec: `docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md`**.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md`
§0D) · **Regola Advisor** · **mockup PRIMA del codice** (§0B) · **BP-2** · **BP-1** prima di
fermarsi.

---

## 0. In una riga

**La spec è confermata da Francesco e non è stata scritta una riga di codice.** Si riparte da
**FASE 4** (`superpowers:writing-plans`) sulla **tappa 1**. Il grosso del lavoro di pensiero è
fatto: leggi la spec e scrivi il piano, non ri-brainstormare.

---

## 1. Che cosa è successo il 27/07

Percorso BP-2 pieno: FASE 1 (goal) → FASE 2 (brainstorming) → **FASE 3 (gate, tutte e 5 risposte
nella spec §3)** → **panel 3×** (architettura · UX · GDPR/sicurezza) → riserve verificate una per
una sul codice → spec riscritta → confermata.

**Esito del panel: 1 «confermata con riserve», 2 «da rivedere».** Non è stato un timbro: **ha
cambiato la forma del lavoro**, l'ordine delle tappe e i numeri della resa.

🛑 **Nessun codice, per scelta.** Le tre trappole qui sotto sarebbero passate tutte e tre da
`tsc`, dai 3364 test e da una review di diff. Una avrebbe reso **non consegnabile** ogni lavoro
creato dal wizard senza nome, e il sintomo sarebbe comparso settimane dopo.

---

## 2. 🎯 La scoperta che ha ribaltato il piano

**`pazienti.nome` e `pazienti.cognome` esistono già** (nullable), e il trigger
`sync_paziente_nome_cognome` (`supabase/migrations/002_fase2_schema.sql:121-134`) compone
`nome_cognome := upper(cognome) || ' ' || upper(nome)` **quando entrambi sono non-null**.

Conseguenza: **appena il wizard scrive le due parti, la targa mostra già il cognome davanti** e la
sfumatura di coda passa a mangiare il **nome proprio**. La lamentela ratificata — «taglia la coda,
sparisce il cognome» — **si risolve senza toccare `Cassetta.tsx`**.

**Prova vivente:** i pazienti creati dalla scheda paziente hanno da sempre i due campi, e la loro
targa è già a posto oggi.

⚠️ **La roadmap diceva «wizard e form paziente compongono `nome_cognome` in ordine opposto»: era
sbagliato.** Il wizard infila **tutta la stringa dentro `cognome`** e lascia `nome` vuoto
(`src/lib/wizard/crea-lavoro.ts:134-147`). Non è un ordine opposto: è che uno dei due non
distingue affatto le due parti. Riga già corretta in `ROADMAP-UFFICIALE.md`.

**Niente migration · percorso Media · rollback = revert del codice** (i nomi già scritti separati
restano validi e il trigger continua a comporre: la targa precedente funzionerebbe comunque).

---

## 3. ⚠️ LE TRE TRAPPOLE — leggerle prima di toccare `crea-lavoro.ts`

Tutte e tre **verificate riga per riga**, non riferite.

### 3.1 La consegna che si blocca (la peggiore)

Il wizard oggi scrive `cognome: alias || pz` — cioè **il codice paziente dentro il campo cognome**.
Sembra un residuo brutto: è **portante**.

Togliendolo, con entrambe le caselle vuote `nome_cognome` diventa `' '` (uno spazio: soddisfa il
`NOT NULL`, **nessun errore visibile**). Poi:

- `src/lib/consegna/precheck.ts:40-43` — `' '.trim()` = `''`, che **non è nullish**: la catena `??`
  si ferma lì e **non arriva mai a `codice_paziente`** → `haPaziente = false` → elemento 4
  Allegato XIII «Paziente non identificabile» → **consegna bloccata**;
- `src/lib/pdf/generate-ddc.ts:93` — stessa catena → **campo paziente vuoto in un documento
  firmato**.

### 3.2 La creazione del lavoro che muore

Mandare `null` invece di `''` a casella vuota: il trigger non compone, `nome_cognome` viola il
`NOT NULL` → 500 → `crea-lavoro.ts` lo tratta come **bloccante** → **nessun lavoro creato**.
**`nome: ''` è un invariante**, da presidiare con un test, non con un commento.

### 3.3 Il codice ricasato in targa

Cognome vuoto + nome pieno, **tenendo** il fallback `cognome: pz` → `PZ-0042 GIUSEPPE`, che
`derivaAlias` (`src/lib/cassette/parco-shared.ts:69-75`) **non annulla** (non coincide col codice)
→ la targa scrive **«Pz-0042 Giuseppe»**, col codice passato per `titleCase` contro la regola che
lo vuole sempre letterale. Ci si arriva **in un tap**.

👉 **Il rimedio a tutte e tre è la tabella delle quattro combinazioni, spec §5.** Il principio:
**quando è piena una sola casella, ci si comporta come la casella unica di oggi** — quel valore va
nel cognome, il nome resta `''`.

---

## 4. ⚠️ I numeri della scala erano sbagliati (tappa 2)

| | Valore vero | Il brief diceva |
|---|---|---|
| Corpo del paziente | **11,5px, peso 800** (`ds-v3.css:721-728`) | 10px |
| Fascia | **78px** dal 26/07, ratifica A3 (`ds-v3.css:334`) | 72px (il mockup ha calcolato l'89% su questo) |
| Asse della misura | il paziente è **`nowrap` 1 riga** quando il clinico è a 2 (`ds-v3.css:955-960`) → serve la misura **orizzontale** | verticale (`scrollHeight`/`clientHeight`) |

«10 → 9,5 → 9» è la scala **del clinico** (`nome-studio.ts:181-185`): applicarla al paziente lo
taglia subito del 13% e a 9px lo porta **sotto** lo studio, ribaltando la gerarchia ratificata il
24/07. E con la misura verticale **la scala non si accenderebbe mai nell'89% dei casi**.

🛑 **La tappa 2 non è progettabile finché questi tre numeri non sono rifatti.** Prerequisiti
completi: spec §5-bis.

---

## 5. 🔨 DA FARE — tappa 1

**Contenuto esatto e file:riga: spec §6 «TAPPA 1».** In sintesi:

1. **Il passo 3 del wizard:** **una sola riga** in «Se vuoi, aggiungi», che continua a chiamarsi
   **«Nome o alias»** e si apre in **due caselle impilate, Cognome sopra**. Un solo «Salta».
   **UI nuova → mockup obbligatorio prima del React** (§0B: mockup → 390/768/1280 × chiaro/scuro →
   approvazione → decision record).
2. **La tabella delle quattro combinazioni**, letterale, in `crea-lavoro.ts` + test per riga.
3. **La rettifica:** `nome`/`cognome` nell'allowlist PATCH **e** le due caselle nel pannello di
   modifica del paziente — oggi la porta lato server sarebbe aperta su un muro.
4. **`EtichettaTemplate.tsx:117-124`:** `codice_paziente` per primo, come già fanno gli altri due.
5. **`ANALISI/17`** allineata alla D8.

**La cassetta non si tocca.** Nessuna misura nuova, nessun rischio prestazioni.

---

## 6. 🛑 D9 — il nodo che NON si improvvisa

Francesco ha chiesto di poter correggere il nome **anche dalla scheda del lavoro**, con la
conseguenza dichiarata sul tavolo. Quella scheda mostra `paziente_nome_snapshot`, che **nessuno
popola** (verificato: fuori dall'insert di `POST /api/lavori`, fuori da `PATCHABLE_FIELDS`, nessun
trigger — solo copia in `007_rpc_rifacimento.sql:52,60`): oggi scrive «—».

E la fotografia **esiste apposta per non cambiare**: i documenti a valore legale devono riportare
il nome *di allora*. Tensione fra **rettifica** (Art. 16 GDPR) e **immutabilità della
documentazione** (MDR Art. 10(8), 10 anni).

**Tappa 1-bis, percorso GRANDE, panel normativo, brainstorming proprio.** Le quattro domande a cui
rispondere prima di scrivere: spec §4, riquadro «Il nodo che D9 apre».

---

## 6-bis. 🔑 NUOVA DIRETTIVA PERMANENTE — «ogni campo del lavoro si corregge, fino alla consegna»

Enunciata da Francesco a fine sessione, **vale ben oltre questa ondata** ed è già **incisa in
`ua-app/CLAUDE.md` §9** (col «come si applica quando si progetta») e in `ROADMAP-UFFICIALE.md`.

> «una volta creato, io devo avere la possibilità di poter modificare sempre ogni campo del lavoro
> […] se l'addetta al front desk fa un errore di digitazione o altro, bisogna sempre poter
> intervenire, fino a poi la consegna con l'eventuale fatturazione.»

**Perché conta qui:** scioglie la seconda delle quattro domande del nodo D9 — la finestra è
**creazione → consegna/fatturazione**. Prima la correzione propaga, dopo no. E il modello **esiste
già**: `LOCKED_PRICE_FIELDS` tiene i campi del prezzo editabili finché il lavoro non è
`incluso_in_fattura`. Si generalizza, non si reinventa.

**Stato misurato:** la direttiva è rispettata **a metà**. `PATCHABLE_FIELDS`
(`src/app/api/lavori/[id]/route.ts`) esclude **16 campi** con la motivazione «nessun writer nel
form React attuale» — non una ragione, un buco: `arcata`, `colorazione_esterna`,
`impronta_digitale`, `numero_prescrizione`, `norma_riferimento`, `richiedente_email`,
`stato_fisico`, `tipo_arco`, `codice_interno`, `anamnesi_note`, `classe_rischio`,
`paziente_nascita_snapshot`, `paziente_nome_snapshot`, `prescrizione_digitale_id`,
`spedizione_note`, `spedizione_stato`.

🛑 **Non confonderle con le esclusioni legittime**, che restano: `numero_cassetta` (RPC atomiche) ·
`proposta_dentista` (sentinella D7) · i calcolati server-side · i congelati dopo l'emissione.

**Voce di lavoro «Il lavoro si corregge»** (roadmap, collocazione da ratificare): censimento dei 16,
generalizzazione della finestra, schermate di correzione. ⚠️ **Interseca la tappa 1-bis** — stessa
materia, da progettare **insieme e mai due volte**.

**Richiesta collegata, esplicita:** «dovremmo studiare bene come abbiamo sviluppato la creazione di
un nuovo lavoro». Revisione del percorso d'ingresso del lavoro in laboratorio. Non è questa ondata:
è il contesto in cui la direttiva vive.

---

## 7. Base di lavoro (trappole logistiche, ereditate e ancora vere)

- **`main` è a `11e05dd0`**, pulito. Worktree in piedi (di altre ondate): `ondata-a-mini-triage`,
  `redesign-parete-home`.
- 🛑 **NEL WORKTREE IL DEV SERVER NON PARTE** — doppio `package-lock.json` → Turbopack sceglie la
  radice del repo principale → **tutte le route 404** (i file statici di `public/` rispondono, e
  questo inganna). Via d'uscita usata: **ramo di sola verifica nel repo principale** sullo stesso
  commit, QA lì, poi `git checkout main` e cancellazione del ramo.
- ⚠️ Un worktree nuovo nasce **senza `.env.local`/`.env.test`**: senza copiarli `next build`
  fallisce su `/api/admin/labs` via Stripe.
- ⚠️ **`.gitignore` riga 62 ignora `*.png`:** gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ **Il pre-commit ferma su `--max-warnings=0`** e `tsc` **non** vede un import rimasto senza uso:
  dopo ogni bonifica, `npx eslint src/` **prima** di committare.
- ⚠️ Nei blocchi `<style>{\`…\`}` dei `.tsx` **niente backtick nei commenti** (`TS1381` oscuro).
- ⚠️ **La skill `ua-app:review` è inutilizzabile** (pretende un file che nel repo non esiste): la
  review si fa con revisori indipendenti.
- 🛑 **Le password non le digita l'assistente:** per il QA dietro login si chiede a Francesco di
  entrare lui nel browser, poi si guida la verifica da lì.
- ⚠️ **Attenzione alle date a cavallo della mezzanotte.** La prima stesura di questa spec portava
  26/07 mentre era già il 27; e `2026-07-27-post-ondata-handoff.md` è in realtà del **26**. Prima
  di datare un file, **guardare l'orologio**, non l'ultimo documento letto.

---

## 8. Che cosa resta in coda dietro a questo

Dall'handoff precedente (`2026-07-26-un-tema-solo-chiuso-handoff.md` §3), invariato: **linguetta
stretta** · **ondata B «giro clienti»** (`/agenda` + `/clienti` + `/clienti/[id]`) · le voci di
backlog aperte dal tema (`next-themes` rimovibile, `color-scheme` mai dichiarato,
`safe-area-inset-top`, iOS) · la **trappola dell'edge-to-edge** · **centro notifiche ULTIMO**.

Nuove da questa sessione, tracciate nella spec §7: fotografia congelata (→ tappa 1-bis) ·
sovra-lettura `pazienti(*)` in 4 generatori PDF · `minimizzaPhi` da rendere deterministico ·
la lista `/pazienti` che **cambierà resa da sola** (`PazientiSearchList.tsx:173-174` rende già
`cognome nome` quando ci sono entrambi) · registro dei trattamenti e informativa.

---

## 9. 📌 Quello che questa sessione lascia

> **Il valore era nella prima metà del lavoro, e nessuno se n'era accorto.**

Il mockup approvato descriveva una scaletta di rimpicciolimenti e abbreviazioni. La cosa che
Francesco voleva — leggere il cognome — arrivava invece dal pezzo che sembrava solo preparatorio:
**far chiedere il dato**. La parte spettacolare era un miglioramento; la parte noiosa era la cura.

E il corollario: **un fallback che sembra brutto può essere portante.** `cognome: alias || pz`
aveva tutta l'aria del residuo da ripulire. Toglierlo avrebbe bloccato le consegne — in silenzio,
settimane dopo, senza che un solo test diventasse rosso.
