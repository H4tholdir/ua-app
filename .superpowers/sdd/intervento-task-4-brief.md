# Brief — Task 4 dell'ondata «si deve sempre poter intervenire»: le due rotte

**Per:** l'esecutore fresco del Task 4 (R-E1: un compito solo, questo).
**Piano:** `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md`, **§ Task 4** (righe 519-563).
**Spec ratificata:** `docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md` (§4, §5, §6, §9, §17.2).
**Ramo:** `intervento-post-consegna` (già attivo, albero pulito). 🛑 **Worktree VIETATI** in questo progetto.
**Scritto il:** 06/08/2026, 22:35 CEST (`provato:` `date`).

---

## 0. Le tre regole che valgono su di te, prima del mandato

- **R-E1** — questo è il tuo unico compito. Non ne apri altri.
- **R-E2** — 🛑 **un difetto che trovi FUORI da questo mandato si RIFERISCE, non si corregge di
  nascosto.** Raccoglili in una sezione «RITROVAMENTI (R-E2)» del tuo referto. Una correzione
  silenziosa lascia il piano sbagliato per tutti i compiti successivi.
- **Cerca attivamente dove il piano sbaglia.** In quest'ondata i primi tre compiti hanno trovato
  **difetti veri del piano** (due Critici nel Task 1, tre rilievi di qualità nel Task 2). Il piano non
  è un'autorità: è codice non ancora eseguito, con in più il difetto di sembrare prosa.

**FASE 6 (TDD) piena, e in quest'ordine:** prova rossa → **abbozzo inerte** → **conta quante asserzioni
si accendono** (R-P4: il numero si scrive nel referto, `N su M`; il rosso da «modulo non trovato» non
prova niente) → implementa → verde → **FASE 7 completa** (`npx tsc --noEmit` + `npx vitest run` +
`npx next build`, output reale incollato).
⚠️ **Prima delle asserzioni, enumera le FORME D'INPUT** (vedi §4 qui sotto): ognuna col suo caso o col
suo «non coperta, perché».

---

## 1. Il mandato — due rotte, e la seconda non è la prima

**Crea:**
- `src/app/api/lavori/[id]/eventi-qualita/route.ts` 🆕 — `POST`: registra **il fatto** e **restituisce
  la proposta**.
- `src/app/api/eventi-qualita/[id]/valutazioni/route.ts` 🆕 — `POST`: deposita **il giudizio**, con
  l'utente che conferma.
- `tests/unit/eventi-qualita-route.test.ts` 🆕

**Le quattro regole non negoziabili del piano:**
1. `isSameOrigin` sempre (la guardia CSRF del pre-commit lo verifica: se manca, il commit non passa).
2. 🔑 **La prima rotta NON deposita la classificazione.** Torna `{ evento, proposta }`; è la **seconda**
   rotta a scrivere in `valutazioni_evento`. Il motivo sta nella spec §6: *l'app propone, una persona
   conferma* — la firma è dell'utente, non dell'applicazione.
3. Incrementa `lavori.post_consegna_correzioni` (`provato:` colonna esistente,
   `supabase/migrations/002_fase2_schema.sql:75`, `SMALLINT NOT NULL DEFAULT 0`; presente nei tipi
   generati, `src/types/database.types.ts:2563`). Mai usata finora.
4. `conosciuto_il` arriva **dal client** ed è modificabile: è il **momento zero dei termini di legge**
   (Art. 87), e **non** è la data di creazione della riga. Assente → **422**.

---

## 2. Le PRECONDIZIONI DICHIARATE — tre, e una l'ho già sciolta per te

Vengono dal registro `.superpowers/sdd/progress.md` (Task 2 e Task 3). Non sono suggerimenti.

### ① `p_laboratorio_id` dalla SESSIONE, mai dal corpo della richiesta
Vale per ogni scrittura di questo compito. Il modello di rotta da imitare è
`src/app/api/lavori/[id]/rifacimento/route.ts` (`isSameOrigin`, `getFreshLabContext`,
`assertLabOperativo`): **aprilo per primo** (R-P2) e imita **quello**, non la memoria.
Secondo modello utile: `src/app/api/qualita/incidenti/route.ts`.

### ② L'eccezione del fail-closed arriva a un OPERATORE, non a uno sviluppatore
Se una guardia rifiuta, il messaggio deve dire **cosa fare**, in parole comuni. Non «constraint
violation», non il testo grezzo di Postgres. La `RAISE EXCEPTION` di `riapri_lavoro_atomica` (Task 3)
va **tradotta** prima di uscire dalla rotta.

### ③ `classifica(null)` — 🟢 **SCIOLTA, e non è una decisione: è un fatto da PROVARE**
Il registro la lasciava aperta («va deciso se la proposta si calcola prima o dopo il salvataggio»).
**Non serve deciderlo**, e il motivo è nella forma della funzione:
`provato:` `src/lib/qualita/classifica.ts:127` → `export function classifica(f: FattiEvento,
rispostaGravita?: RispostaGravitaIncidente): Proposta`. `FattiEvento` (righe 45-50) ha **quattro campi
obbligatori**, tutti unioni chiuse.
➡️ **Se la rotta valida il corpo PRIMA di costruire `FattiEvento`**, `classifica()` non può ricevere
`null` né un campo spazzatura: il `TypeError` diventa **irraggiungibile dalla rotta**, e **D262 regge
per costruzione** (un 500 al posto di un 422 sarebbe un blocco, e la PWA non dà blocchi).
🛑 **Ma «irraggiungibile» è un'affermazione, e in questo progetto un'affermazione senza prova vale
zero:** scrivi il test che manda `body = null`, il test col corpo non-JSON e quello coi campi a `null`,
e **verifica che escano 400/422 e mai 500**. Se anche uno solo esce 500, la precondizione **non** è
sciolta e lo scrivi nel referto.
⚠️ **Non «riparare» `classifica()`**: la sua firma stretta è una scelta ratificata (Task 2). La difesa
sta alla porta, non dentro la funzione.

---

## 3. I due buchi del piano che devi affrontare — e il piano non li nomina

🛑 **Li ho trovati leggendo lo schema, non il piano. Non sono ipotesi: sono vincoli in banca dati.**

### A. `natura` è `NOT NULL`, ma per il motivo «altro» nessuno la sa dedurre
`provato:` `supabase/migrations/20260806140823_eventi_qualita.sql:16-18` → colonna `natura TEXT NOT
NULL CHECK (natura IN (…))`. E `provato:` `src/lib/domain/qualita-costanti.ts:139` →
`naturaDaMotivo(motivo: Motivo): Natura | null` **restituisce `null` solo per `altro`** (firma stretta,
ripristinata nel Task 2).
➡️ **Un `POST` con `motivo: 'altro'` non ha una `natura` da scrivere.** Le vie sono: chiederla al
client · rifiutare `altro` in questa rotta · dedurre un valore di ripiego (🛑 **sconsigliato**: una
natura sbagliata cambia la classificazione, cioè cambia un numero che finisce in un documento dovuto
per legge). **Scegli, motiva nel referto, e riferisci la scelta come punto per Francesco (R-E2).**
⚠️ Ricorda il CHECK gemello: `motivo = 'altro'` **pretende** `motivo_libero` non vuoto
(`:29`, `evento_altro_ha_testo`).

### B. La spazzatura e il vocabolario si distinguono con DUE guardie diverse
`provato:` `qualita-costanti.ts:128` → `isMotivo(v: unknown): v is Motivo` (regge qualunque
schifezza) · `:139` → `naturaDaMotivo(motivo: Motivo)` (firma stretta, presuppone un motivo **già
valido**). **Il confine HTTP deve distinguerli:** prima `isMotivo`, poi la derivazione. Invertirli
significa passare `'pippo'` a una funzione che non lo aspetta.

### C. La seconda rotta deposita la PRIMA valutazione, **non riclassifica**
🛑 **La riclassificazione è FUORI da quest'ondata** (D273, terza riga della tabella: «l'avviso non ha il
gesto che lo risolve», e i suoi pezzi sono rotti a metà). Quindi in questa rotta:
- `sostituisce_id` e `motivo_riclassificazione` **non si accettano dal client**.
- Non chiami `valutazione_supera()`.
`provato:` i vincoli che ti riguardano, `20260806140823_eventi_qualita.sql:47-55`:
`valutazione_nessuna_azione_giustificata` (esito `nessuna_azione` **pretende** una `giustificazione`
non vuota) · `valutazione_viva_unique` (`:58-59`, indice unico su `(laboratorio_id, evento_id)` dove
`superata = false`: **una seconda deposizione sullo stesso evento sbatte contro l'indice** — decidi il
codice HTTP e il messaggio, e non lasciarlo uscire come 500).
📌 **`classificato_da` viene dalla sessione**, come `p_laboratorio_id`.

---

## 4. Le forme d'input da enumerare (R-P4) — l'elenco minimo, non quello completo

Corpo non-JSON · corpo `null` · corpo `{}` · `motivo` fuori vocabolario (`'pippo'`) · `motivo`
numerico/array invece che stringa · `motivo: 'altro'` senza `motivo_libero` · `motivo_libero` di soli
spazi · `conosciuto_il` assente · `conosciuto_il` non-data (`'domani'`) · `conosciuto_il` **nel
futuro** (decidi se si rifiuta, e motiva) · `stato_dispositivo`/`origine_informazione` fuori
vocabolario · `potenziale_di_danno` assente (la colonna ha `DEFAULT 'da_valutare'`: decidi se il
default lo mette il database o la rotta, **e che non siano due default diversi**) · `id` di path non
UUID (⚠️ rilievo noto **M3-T4-1** del registro: oggi altrove un `22P02` diventa **500 con messaggio
Postgres grezzo** — qui puoi fare meglio) · lavoro di **un altro laboratorio** (dev'essere indistinguibile
da «non esiste») · evento di un altro laboratorio, sulla seconda rotta.
➡️ Ognuna: **un caso**, oppure **«non coperta, perché»**. Il conteggio finale `N su M` va nel referto.

---

## 5. Vincoli globali dell'ondata — valgono anche se questo compito non ha migration

Non stai scrivendo SQL, ma **se ti accorgi di averne bisogno**, fermati e riferisci: i due vincoli
globali nati dal Task 1 sono `REVOKE` che deve includere **`service_role`** (ha `bypassrls` e riceve
`ALL` dalle default privileges) e **FK composite** `(x_id, laboratorio_id)` fra tabelle di tenant.
Sono nel piano, righe 688-698.

**Sul linguaggio:** ogni testo che un umano legge usa **«la dichiarazione»**, mai «dichiarazione di
conformità» (per i dispositivi su misura quel nome è improprio: è la dichiarazione ex Allegato XIII).

**Decisione di stasera, D285** (verbale, centosedicesima tornata): «errore di registrazione» **resta**
un evento vero, esaminato, che **rimane nei conteggi delle cose esaminate**; solo il **ritiro** (compito
successivo, non tuo) toglie una riga dai conteggi. ➡️ **Per te significa solo questo: non inventare
colonne o filtri di ritiro. Non esistono ancora.**

---

## 6. Da leggere per primo (R-P2) — e la lettura si dichiara nel referto

| Percorso | Perché |
|---|---|
| `src/app/api/lavori/[id]/rifacimento/route.ts` | il modello di rotta da imitare |
| `src/app/api/qualita/incidenti/route.ts` | secondo modello, dominio qualità |
| `supabase/migrations/20260806140823_eventi_qualita.sql` | **le colonne e i CHECK veri** delle due tabelle |
| `supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql` | le FK composite: cambiano cosa devi passare negli INSERT |
| `src/lib/domain/qualita-costanti.ts` | i vocabolari e le due guardie |
| `src/lib/qualita/classifica.ts` | firma, `FattiEvento`, e i «perché» già scritti in parole comuni |

Ogni percorso torna nel referto come `letto: righe X-Y` **oppure** `NON letto`.

---

## 7. Il referto — dove e cosa

`.superpowers/sdd/intervento-task-4-report.md` (🛑 **prefisso `intervento-` obbligatorio**: i nomi in
questa cartella **non** sono distinti per ondata, e una collisione è già stata pagata il 05/08).

Dentro: le letture R-P2 · il conteggio R-P4 `N su M` · le forme d'input coperte e quelle no col perché ·
l'output reale della FASE 7 · **la sezione RITROVAMENTI (R-E2)** · e le decisioni che hai preso da solo,
dichiarate come tali.
⚠️ **I numeri del referto si misurano due volte.** In quest'ondata e nella precedente, **tre conteggi di
referto su tre** non hanno retto alla verifica.

**Salva** con `feat(qualita): …` quando è verde. Non pubblicare nulla (`git push` è di Francesco).
