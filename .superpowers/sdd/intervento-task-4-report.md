# Referto — Task 4 dell'ondata «si deve sempre poter intervenire»: le due rotte

**Esecutore:** fresco, un compito solo (R-E1).
**Ramo:** `intervento-post-consegna` · **Salvataggi:** `a3abf4aa` (implementazione) · `245c81f2`
(tre forme d'ingresso mancanti + rimisura R-P4). Nessun `git push`. Nessun worktree. Nessuna migration.
**Scritto il:** 06/08/2026 (`provato:` `date` → `Thu Aug  6 23:03:43 CEST 2026`).

---

## 1. File creati

| File | Salvataggio |
|---|---|
| `src/app/api/lavori/[id]/eventi-qualita/route.ts` 🆕 | `a3abf4aa` |
| `src/app/api/eventi-qualita/[id]/valutazioni/route.ts` 🆕 | `a3abf4aa` |
| `tests/unit/eventi-qualita-route.test.ts` 🆕 | `a3abf4aa`, esteso in `245c81f2` |

Nessun altro file toccato. ⚠️ `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` risultava
già modificato nell'albero **prima** che cominciassi: **non l'ho toccato e non l'ho salvato**.

---

## 2. Le letture (R-P2)

**Le sei della tabella del brief — tutte lette:**

| Percorso | Esito |
|---|---|
| `src/app/api/lavori/[id]/rifacimento/route.ts` | letto: righe 1-200 (intero) |
| `src/app/api/qualita/incidenti/route.ts` | letto: righe 1-119 (intero) |
| `supabase/migrations/20260806140823_eventi_qualita.sql` | letto: righe 1-89 (intero) |
| `supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql` | letto: righe 1-108 (intero) |
| `src/lib/domain/qualita-costanti.ts` | letto: righe 1-185 (intero) |
| `src/lib/qualita/classifica.ts` | letto: righe 1-185 (intero) |

**Aperti in più, perché il censimento ce li ha portati** (nessuno era nella tabella):
`supabase/migrations/20260806170700_d274_difetti_vivi_intervento.sql` (intero) ·
`supabase/migrations/20260806210400_riapri_lavoro_atomica.sql` (righe 1-165) ·
`src/lib/supabase/lab-context.ts` (1-80) · `src/lib/supabase/lab-guard.ts` (intero) ·
`src/lib/utils/csrf.ts` (intero) · `src/app/api/lavori/[id]/cassetta/route.ts` (1-40 + firma di `POST`) ·
`tests/unit/lavori-id-cassetta-route.test.ts` (1-120) · `tests/unit/helpers/supabase-chain-mock.ts` (1-60) ·
`src/types/database.types.ts` (1113-1158 · 2558-2570 · 5891-5927) ·
`src/app/api/fatture/[id]/xml/route.ts` (130-265) · `src/app/api/fatture/batch/route.ts` (145-215) ·
`src/types/domain.ts` (360-375) · `src/lib/fattura/generate-xml.ts` (solo ricerca mirata) ·
spec §3-§5 (175-260), §8-§10 (395-470), §17 (intero) · piano righe 505-585, 600-680, 680-818 ·
`.husky/pre-commit` · `package.json` (script).

**NON letti, dichiarati:** `src/app/api/lavori/[id]/annulla-consegna/route.ts` — **solo le righe 1-60**,
quanto bastava a stabilire chi chiama `riapri_lavoro_atomica` (ritrovamento R2 più sotto) ·
`SchedaLavoroV3.tsx` — **NON letto**, è dei compiti 6-8 e fuori dal mio mandato.

---

## 3. Il conteggio R-P4 — **66 asserzioni rosse su 141**, e perché il numero è cambiato

**Definizione fissata PRIMA di misurare** (i referti di quest'ondata e della precedente hanno
sbagliato tre conteggi su tre, uno dei quali col **segno invertito**):
`N` = asserzioni che **falliscono** contro l'abbozzo inerte · `M` = asserzioni totali del file.

**L'abbozzo inerte:** esporta `POST`, risponde `NextResponse.json({abbozzo:true}, {status:200})` e non
fa nient'altro — nessuna lettura del corpo, nessun accesso al database. **200 è scelto apposta:**
nessun caso del file si aspetta 200, quindi nessuno può passare per coincidenza.

| Momento | Casi | Rosse (`N`) | Totali (`M`) |
|---|---|---|---|
| Primo rosso — «modulo non trovato» | 0 | **0** | — (non prova niente, R-P4) |
| Prima misura, contro l'abbozzo | 63 su 63 falliti | **63** | 135 |
| Misura FINALE, dopo le tre forme aggiunte | **66 su 66 falliti** | **66** | **141** |

`M` verificato due volte con conteggio di **occorrenze**, non di righe:
`grep -o "expect(" | wc -l` → **131** · meno le **2** dentro l'helper `nessunTestoGrezzo`
· più **6 chiamate × 2** = **141**.
`N` = 66 perché vitest ferma ogni caso alla **prima** asserzione rossa: una per caso, e i casi rossi
sono 66 su 66 (`Failed Tests 66` incollato dall'esecuzione).

🔑 **La seconda misura non è cosmesi.** Dopo aver aggiunto tre casi ho **rimesso i due abbozzi inerti**
e rilanciato, poi ho ripristinato l'implementazione verificando con `git diff --stat -- src/app/api`
che i due file fossero **identici** al salvataggio. Senza quel giro il referto avrebbe portato «63 su
135», cioè un numero misurato su un file che non esiste più.

---

## 4. Le forme d'ingresso — l'elenco minimo tutto coperto, 4 dichiarate scoperte

**Le quindici dell'elenco minimo del brief, tutte coperte:**

| Forma | Copertura |
|---|---|
| corpo non-JSON | ✅ **entrambe** le rotte → 400, e `not.toBe(500)` |
| corpo `null` | ✅ entrambe → 400, e `not.toBe(500)` |
| corpo `{}` | ✅ entrambe → 422 |
| `motivo` fuori vocabolario | ✅ `'pippo'` **e** `'constructor'` **e** `'__proto__'` → 422, nessun insert |
| `motivo` numerico / array | ✅ due casi → 422 |
| `motivo:'altro'` senza `motivo_libero` | ✅ → 422 |
| `motivo_libero` di soli spazi | ✅ → 422 |
| `conosciuto_il` assente | ✅ → 422 |
| `conosciuto_il` non-data (`'domani'`) | ✅ + variante numerica → 422 |
| `conosciuto_il` nel futuro | ✅ **tre** casi: +30 min → 422 · +1 min → 201 · un anno fa → 201 |
| `stato_dispositivo` fuori vocabolario | ✅ → 422 |
| `origine_informazione` fuori vocabolario | ✅ → 422 |
| `potenziale_di_danno` assente | ✅ prova che la chiave **non viene inviata** (`Object.hasOwn` falso) |
| `id` di path non UUID | ✅ **entrambe** → 404, `mockFrom` mai chiamato, nessun testo grezzo |
| lavoro / evento di **un altro laboratorio** | ✅ 404 su entrambe **+** prova da `chain.calls` che `.eq('laboratorio_id', LAB_ID)` è stato davvero chiamato |

**Tre in più, aggiunte da me** (sono la voce «tipo sbagliato» di R-P4, e i tre rami di validazione
esistevano già ma non erano esercitati): `motivo_libero` numerico · `note` oggetto ·
`giustificazione` numerica → 422.
**E altre in più:** corpo **array** alla radice → 400 · tutti i campi a **`null`** → 422 mai 500 ·
`potenziale_di_danno` fuori vocabolario → 422 · `natura` incoerente col motivo → 422 · `natura`
coerente → 201 · `risposta_gravita` nel corpo → 422 · `esito` array → 422 · `superata`/`sostituisce_id`/
`motivo_riclassificazione` dal client → 422 · `23505` → 409 · `laboratorio_id` fasullo nel corpo →
ignorato a favore della sessione.

**NON coperte, col perché:**

1. **Il rifiuto vero del database** (un `23514`/`23505` sollevato dal banco vivo). Qui i codici
   d'errore sono **simulati**: la prova contro il database vero è di integrazione e vive in
   `tests/integration/eventi-qualita-schema.rpc.test.ts`, che è del Task 1 — estenderlo è fuori dal
   mio mandato (R-E1). ➡️ **Riferito**: la mappatura `23505 → 409` non è mai stata esercitata contro
   `valutazione_viva_unique` vera.
2. **La corsa sull'incremento** di `post_consegna_correzioni`: serve concorrenza reale, non
   simulabile in una prova unitaria. La corsa è **dichiarata nel codice**, e la chiusura vera
   (`SET x = x + 1` in una RPC) sarebbe una migration — vietata da questo mandato.
3. **`Content-Type` sbagliato**: irrilevante, `req.json()` non guarda l'intestazione — sarebbe una
   prova sul comportamento della piattaforma, non sul mio codice.
4. **Chiavi ignote nel corpo** (`{ pippo: 1 }`): accettate e ignorate di proposito. Rifiuto **solo**
   le chiavi **note-ma-non-qui** (`natura` incoerente, `sostituisce_id`, `motivo_riclassificazione`,
   `superata`, `risposta_gravita`), perché quelle sono le uniche che un client può mandare
   *credendo* che facciano qualcosa.

---

## 5. La precondizione ③ — **SCIOLTA, e provata, non affermata**

Il brief chiedeva di **provare** che `classifica()` non possa ricevere spazzatura dalla rotta.
Le tre prove chieste esistono e sono verdi: `body = null` → **400** · corpo non-JSON → **400** ·
tutti i campi a `null` → **422**. In tutti e tre `expect(res.status).not.toBe(500)` è esplicito, e nel
terzo si asserisce anche che **nessun insert è partito**.
➡️ **`classifica()` non è raggiungibile con un `FattiEvento` malformato**, e D262 regge per
costruzione: la difesa sta alla porta, e `classifica()` **non è stata toccata**.

---

## 6. Le decisioni che ho preso da solo (dichiarate come tali)

| # | Decisione | Perché |
|---|---|---|
| **D-a** | **La `natura` per `motivo:'altro'` si CHIEDE al client**, obbligatoria e dal vocabolario | Non è una scelta mia: la **spec §5 lo ratifica già** in tabella («si chiede, non si indovina: l'utente sceglie la natura fra le precedenti»). Le altre due vie erano peggiori: rifiutare `altro` toglierebbe una voce del vocabolario del database, e una natura di ripiego **cambierebbe la classificazione**, cioè un numero che finisce in un documento dovuto per legge. Il difetto qui è **del piano**, che non nominava la colonna `NOT NULL` |
| **D-b** | **Una `natura` inviata su un motivo derivabile: 422 se diversa, accettata se uguale** | Uno scarto muto è la classe «Salvato su un dato che non c'è» (`lavori/[id]/route.ts:259-264`). Accettarla quando coincide evita di rompere un client che rimanda indietro l'oggetto intero |
| **D-c** | **`conosciuto_il` nel futuro si RIFIUTA**, con tolleranza di **5 minuti**; **nessun limite inferiore** | Una data futura sposta **avanti** una scadenza di legge e non descrive nessun fatto possibile. Una data sbagliata nel **passato** stringe la scadenza: è la direzione dell'**Art. 87(7)** (nel dubbio si segnala), quindi nessun limite sotto. La tolleranza è **necessaria**, non difensiva: la spec §5 precompila con «adesso» preso dal telefono, e un orologio avanti di due minuti rifiuterebbe il valore predefinito legittimo. Provata al confine (+1 min passa, +30 min no) |
| **D-d** | **`id` di path non UUID → 404**, non 400 né 422 | Un id che **non può** esistere dev'essere indistinguibile da uno che non esiste — la stessa risposta del lavoro di un altro laboratorio. Chiude anche il rilievo noto **M3-T4-1** (oggi altrove un `22P02` esce come **500 con messaggio Postgres grezzo**) |
| **D-e** | **Il `potenziale_di_danno` assente NON viene inviato**: il default resta **uno solo**, quello del database; la proposta si calcola **sulla riga salvata** | Il brief chiedeva esplicitamente che non ci fossero due default. Se il ripiego di lettura dovesse mai servire, è **`da_valutare`, mai `nessuno`**: `nessuno` salta del tutto il test dell'incidente (`classifica.ts:136`) ed è il «generatore silenzioso di sotto-classificazione» che la spec §5 vieta |
| **D-f** | **`post_consegna_correzioni` si incrementa SOLO se il manufatto era uscito** (`stato_dispositivo !== 'mai_uscito_dal_lab'`), **fail-soft** | Scostamento **dichiarato** dalla lettera del piano («incrementa», senza condizioni). La colonna è una metrica di consegna (`src/types/domain.ts:367`, «Tracking CONSEGNA — metriche NSM») e si chiama *post_consegna*: contarci un evento su un lavoro mai uscito la falserebbe. Il predicato è **lo stesso** che governa la biforcazione ISO in `classifica.ts:128`, non un secondo criterio inventato. Fail-soft perché quando parte **l'evento è già salvato**: una richiesta che fallisce dopo la scrittura fa registrare il fatto due volte. **Punto per Francesco** |
| **D-g** | **`risposta_gravita` non si accetta alla registrazione** → 422 | D277: la gravità si chiede a chi **conferma**, non a chi registra; e non ha colonna in banca dati. Rifiutata invece che scartata in silenzio |
| **D-h** | **Nessun cancello di stato sul lavoro** | Il modello imitato (`rifacimento/route.ts:136`) rifiuta i lavori annullati. Qui **no**: D266 (l'evento non tocca lo stato del lavoro) + D262 (registrare resta economico). Un fatto su un lavoro annullato è comunque un fatto, e rifiutarlo lo farebbe sparire dal registro invece che dal problema. **Assenza dichiarata, non dimenticata** |
| **D-i** | **Nessun testo di Postgres esce dalle rotte**, in nessun ramo | Precondizione ②. ⚠️ **Qui NON ho imitato i due modelli:** `rifacimento/route.ts:190` e `incidenti/route.ts:109` rispondono entrambi `{ error: error.message }` con 500. Ho imitato la **struttura** delle guardie, non il ramo d'errore. Sei prove asseriscono che la risposta non contiene `violates` / `constraint` / `duplicate key` / `invalid input syntax` / i codici SQLSTATE |

---

## 7. FASE 7 — i tre comandi, output ed **esito numerico reale**

```
$ npx tsc --noEmit
uscita tsc: 0

$ npx vitest run
 Test Files  433 passed | 5 skipped (438)
      Tests  5234 passed | 56 skipped (5290)
   Duration  116.50s
uscita vitest: 0

$ npx next build
uscita next build: 0
✓ Compiled successfully in 7.1s
├ ƒ /api/eventi-qualita/[id]/valutazioni
├ ƒ /api/lavori/[id]/eventi-qualita
```

⚠️ `tsc` **non** valida la firma degli handler di rotta: le due righe `ƒ /api/…` sopra sono la prova
che le vede solo `next build` — entrambe le rotte sono **registrate come dinamiche**.

**In più** (non richiesti, ma è il cancello del commit): `npx eslint src --max-warnings 0` → **0** ·
`bash scripts/check-csrf.sh` → **verde** («ogni route mutante verifica l'origine»), che è la guardia
citata dalla regola 1 del mandato · le altre cinque guardie del pre-commit, verdi su entrambi i salvataggi.

---

## 8. RITROVAMENTI (R-E2) — riferiti, **non corretti**

### 🔴 R1 — `riapri_lavoro_atomica` non ha NESSUN chiamante, e nessun compito ne prende uno

`provato:` `grep -rn "riapri_lavoro_atomica" src/` → **solo `src/types/database.types.ts`**. L'unico
altro uso è la prova d'integrazione del Task 3.
La **precondizione ②** del mio brief dice che «la `RAISE EXCEPTION` di `riapri_lavoro_atomica` va
**tradotta prima di uscire dalla rotta**» — ma **nessuna rotta la chiama**, e nel mio mandato non ce
n'è una che debba. Guardando gli altri compiti: il **Task 6** è interfaccia (e il suo dettaglio si
scrive dopo il mockup), il **Task 7** è la rimozione della finestra dei dieci minuti e nomina
`annulla-consegna/route.ts` **senza dire** che quella rotta debba passare alla RPC nuova.
➡️ **Il piano ha una RPC senza porta.** Va deciso **esplicitamente** in quale compito nasce il
chiamante, o l'ondata si chiude con la funzione più importante del Task 3 mai eseguita in produzione.

### 🔴 R2 — la spec §17.2 assegna al Task 4 una cosa che lo schema del Task 1 ha reso impossibile

L'autorevisione del piano (riga ~«Copertura della spec») dice: «**§17.2 … → Task 4, nel calcolo di
completezza della valutazione**». La spec §17.2 stabilisce che per un laboratorio **`non_certificato`**
la giustificazione del reclamo non indagato è **«Proposta», e la sua assenza non rende la valutazione
incompleta**.
🛑 Ma il CHECK `valutazione_nessuna_azione_giustificata` (`20260806140823:48-49`) la pretende
**sempre**, senza guardare la certificazione. **La rotta non ha alternativa** e ho tenuto il
comportamento uniforme: leggere `certificazione_iso13485` e ramificare produrrebbe o un 422 che il
database avrebbe sollevato comunque, o un tentativo di insert che torna come `23514` grezzo.
➡️ Serve una **decisione**: o §17.2 si emenda (la giustificazione è pretesa da tutti), o serve una
**migration** che allenti il CHECK — e una migration è fuori dal mio mandato, per istruzione esplicita.

### 🟠 R3 — `post_consegna_correzioni`: censita l'esistenza, mai la conseguenza

Il piano (A4) prova che la colonna **esiste**. Non prova **chi la legge** — ed è la domanda che conta,
perché due dei suoi tre siti stanno in rotte **fiscali**.
`provato:` `grep -rn post_consegna_correzioni src/` → **sei righe** prima del mio lavoro (ricontato:
avevo scritto «cinque» e non tornava):
`src/types/domain.ts:368` (il tipo) · **tre** in `database.types.ts` (generati) ·
`src/app/api/fatture/batch/route.ts:164` e `src/app/api/fatture/[id]/xml/route.ts:148`.
Questi ultimi due la nominano **solo dentro l'elenco `select(...)`** che costruisce il
`LavoroDettaglio` intero; `src/lib/fattura/generate-xml.ts` **non la legge** e non serializza il
lavoro in blocco.
➡️ **Accendere l'incremento NON cambia nessun documento fiscale.** Verificato prima di scrivere una
riga, perché se fosse stato il contrario sarebbe scattato l'override «dominio critico» di `CLAUDE.md`.
La riga resta come **avvertimento di metodo**: un piano che prova l'esistenza di una colonna non ha
provato niente sull'effetto di scriverla.

### 🟠 R4 — i due modelli di rotta indicati dal brief perdono il testo grezzo di Postgres

`rifacimento/route.ts:190` → `{ error: error.message }` con 500 · `incidenti/route.ts:109` → identico.
Sono **i due file che il brief indica come modelli**, e contraddicono la precondizione ② del brief
stesso. Non li ho toccati (fuori mandato). ➡️ Candidati a un giro di igiene: sono due rotte in
produzione che mostrano a un'operatrice il testo di un vincolo di banca dati.

### 🟠 R5 — `tests/unit/helpers/supabase-chain-mock.ts` non sa simulare `insert`/`update`

La lista `passthroughMethods` non li contiene, quindi **nessuna rotta che scrive** può usare l'helper
condiviso. Ho costruito il mio banco nel file di prova per restare nel mandato, ma è duplicazione che
nascerà di nuovo al prossimo compito che scrive. ➡️ Aggiungere `insert`/`update`/`upsert`/`delete` alla
lista è additivo e costa una riga.

### 🟠 R6 — l'ordine dei rimandi nel brief §3B è giusto, e ora ha la prova che lo distingue

Il brief chiede di non invertire `isMotivo` e `naturaDaMotivo`. Segnalo che **`'pippo'` non basta a
provarlo**: con le guardie invertite `'pippo'` darebbe comunque `undefined`. Solo `'constructor'` e
`'__proto__'` risalgono al prototipo di `Object` e restituiscono un valore **truthy e sbagliato** —
sono nelle prove per questo, e sono ciò che fa fallire l'inversione.

### 🟡 R7 — due dei quattro campi che `classifica()` produce non hanno dove atterrare

`ramoIso` e `termineOre` escono nella risposta della prima rotta ma **non hanno colonna** in
`valutazioni_evento`: chi conferma il giudizio non li conserva. Già riferito dal Task 2, **ancora
aperto**, e ora è visibile nel contratto HTTP: la proposta dice un termine di legge che, dopo la
conferma, nessuno ritrova.

### 🟡 R8 — `motivo:'altro'` è una via **scelta dal client** verso le esenzioni

Con `motivo:'altro'` il client sceglie la `natura`, e tre nature (`commerciale`,
`errore_registrazione`, `nuova_esigenza_clinica`) portano a `nessuna_azione` per il ramo ①-bis.
**Non è un buco**: D276 mette il test dell'incidente **prima** delle esenzioni, quindi nessun
incidente ci si può nascondere. Ma è una via che l'interfaccia del Task 6 dovrebbe **non** rendere la
più rapida. Punto per Francesco, non un cambio di disegno.

---

## 9. Che cosa aspetta una decisione

1. **D-f** — l'incremento di `post_consegna_correzioni` **solo per i manufatti usciti** (io ho scelto
   così; il piano diceva «incrementa» e basta).
2. **R1** — in quale compito nasce il chiamante di `riapri_lavoro_atomica`.
3. **R2** — §17.2 si emenda, o il CHECK si allenta con una migration.
4. **C-R4** (giro di correzione, 06/08) — `conosciuto_il` **senza fuso** si accetta o si pretende il
   fuso? Chiuderla ora è gratis (nessun client chiama ancora), ma vincola come il **Task 6** compone
   il campo: è una decisione sul contratto, non una correzione di prove.

---

# GIRO DI CORREZIONE — 06/08/2026

**Esecutore:** fresco, mandato CHIUSO ai sei rilievi della revisione (R-E1). Le rotte **non** sono state
riscritte oltre a quanto elencato: il verdetto di conformità resta ✅, e i difetti stavano nella **rete di
prove**, non nella logica.
**Scritto il:** 06/08/2026 (`provato:` `date` → `Thu Aug  6 23:25:28 CEST 2026`).
**Ramo:** `intervento-post-consegna`. Nessun `git push`, nessun worktree, **nessuna migration**.

## A. Che cosa è cambiato, punto per punto

| # | Rilievo | Rimedio | Dove |
|---|---|---|---|
| 🔴 1 | La fixture rispondeva sempre `potenziale_di_danno:'nessuno'` — una riga che Postgres **non potrebbe mai produrre** | La fixture dell'insert fa **l'eco del payload** e applica il **default del database** (`da_valutare`) alle sole chiavi assenti; `chain()` accetta un risultato **pigro**, risolto all'uscita | `tests/unit/eventi-qualita-route.test.ts:39-70` (chain pigro) · `:130-152` (`rigaSalvataDa`) · `:196-203` (uso) · **test nuovo** `:455` |
| 🟠 2 | Un test-lucchetto: titolo «→ 500», fixture `23514`, asserzione `toBeGreaterThanOrEqual(400)` | Sostituito da **tre test**, uno per ramo, ognuno con `toBe` esatto e `nessunTestoGrezzo` | `:741` (`23503`→**404**) · `:748` (`23514`→**422**) · `:755` (generico→**500**) |
| 🟠 3 | Nessun tetto di lunghezza su tre campi di testo | `LIMITE_TESTO_LIBERO = 1000` sulle due rotte, messaggio che nomina il limite | `eventi-qualita/route.ts:73` · `:147-149` (`motivo_libero`) · `:238-240` (`note`) · `valutazioni/route.ts:42` · `:91-93` (`giustificazione`). Test: `:388`, `:398`, `:412`, `:420`, `:841`, `:854` |
| 🟡 4 | Il confronta-e-scambia dell'incremento non era coperto | Test che asserisce i **tre** `.eq` dell'`UPDATE`, incluso `('post_consegna_correzioni', 3)` | `:700` |
| 🟡 6a | `conosciuto_il` passava per `Date.parse` senza controllo di forma | Controllo di **forma prima del valore**: `ISO_8601_RE`, 422 con messaggio che dice cosa mandare | `eventi-qualita/route.ts:75-90` (regex e il perché) · `:213-220` (guardia). Test: `:565` (`01/08/2026`→422), `:577` (senza fuso→201, vedi **C-R4**), `:587`, `:597` |
| 🟡 6b | `motivo_libero` di soli spazi finiva in banca dati come **stringa vuota** | Stessa normalizzazione di `note`: soli spazi → `null` | `eventi-qualita/route.ts:150-153`. Test: `:377` |
| ⛔ 5 | `error` scartato sulla pre-verifica | **NON toccato**, per istruzione: è l'idioma di casa (`rifacimento/route.ts:123-133`) e correggerlo qui creerebbe due dialetti. Resta riferito come debito trasversale | — |

## B. La mutazione di verifica del Critico 1 — **da 0 asserzioni a 1**

**La prova del revisore, rifatta da me.** Sostituito in `route.ts:308-313` il valore letto dalla riga
salvata con il valore **grezzo del client**, e il ripiego con `'nessuno'`:

```
const potenzialeSalvato: PotenzialeDiDanno = inVocabolario(POTENZIALI_DI_DANNO, potenzialeGrezzo)
    ? potenzialeGrezzo
    : 'nessuno'
```

```
× potenziale_di_danno assente → la proposta si calcola sulla riga SALVATA … esito `incidente`
AssertionError: expected 'reclamo' to be 'incidente'
      Tests  1 failed | 66 passed (67)
```

➡️ **1 asserzione si accende** (prima erano **0 su 66**: la suite restava tutta verde). Il numero è 1 e
non di più perché vitest ferma ogni caso alla **prima** asserzione rossa, e il caso è uno.
✅ **Codice RIPRISTINATO:** `git checkout` del file, poi `git diff --stat -- src/app/api` → **vuoto**, e
67/67 verdi. Il ripristino è stato verificato **prima** di proseguire.

**Ordine seguito, e il passo di mezzo non è cerimonia:** ① corretta la fixture → ② **rilanciata la suite
prima di aggiungere qualsiasi cosa** (66/66 verdi, stesso conteggio di prima) → ③ aggiunto il test
mancante → ④ mutazione → ⑤ ripristino. Il passo ② serviva a scoprire se qualche test si appoggiava alla
riga impossibile: **nessuno** — informazione che valeva il minuto speso.

**Le altre due mutazioni, fatte e ripristinate allo stesso modo:**
- cancellati i rami `23503` e `23514` (`route.ts:296-299`) → **2 rossi** (prima: 0).
- cancellato `.eq('post_consegna_correzioni', valoreLetto)` (`route.ts:382`) → **1 rosso** (prima: 0).
`git diff --stat -- src/app/api` verificato vuoto dopo ciascuna.

## C. TDD — dove il rosso è vero e dove no, dichiarato

🛑 **Tre dei sei rimedi non hanno un rosso onesto**, e va detto invece che simulato: per il **Critico 1**,
l'**Importante 2** e il **Minore 4** la logica della rotta era **già giusta** — mancava la prova. I loro
test nascono verdi, e i denti glieli dà la **mutazione** (sezione B), non il rosso.

**Rosso vero, prima del codice, per gli altri tre** (un solo lancio, sei casi rossi insieme):
```
× motivo_libero di soli spazi su un motivo DERIVABILE → salvato come `null`, mai stringa vuota
× motivo_libero oltre il tetto → 422 e nessun insert
× note oltre il tetto → 422 e nessun insert
× conosciuto_il in formato italiano (`01/08/2026`) → 422, MAI letto come 8 gennaio
× conosciuto_il con data e ora ma SENZA fuso → 422: il fuso non si indovina
× giustificazione oltre il tetto → 422 e nessun insert
      Tests  6 failed | 75 passed (81)
```

## D. Il conteggio R-P4, **rimisurato** (non stimato)

| | Prima del giro | Dopo |
|---|---|---|
| Casi | 66 | **81** |
| `N` — rossi contro l'abbozzo inerte | 66 | **81 su 81** |
| `M` — asserzioni totali | 141 | **184** |

`M` con lo stesso metodo dichiarato dal referto originale (occorrenze, non righe):
`grep -o "expect(" | wc -l` → **168** · meno le **2** dentro la definizione di `nessunTestoGrezzo`
· più **9 chiamate × 2** = **184**. (Le chiamate erano 6, ora 9: i tre rami nuovi del punto 2 la
portano ognuno.)
`N` = 81 perché vitest ferma ogni caso alla prima asserzione rossa: uno per caso, e i casi rossi contro
l'abbozzo sono **81 su 81** (`Failed Tests 81`, incollato dall'esecuzione). Abbozzo rimesso e poi
ripristinato dal salvataggio, `git diff` verificato.

## E. Le decisioni prese da solo, dichiarate

| # | Decisione | Perché |
|---|---|---|
| **C-a** | Il tetto di lunghezza risponde **422**, non 400 come il modello | Del modello (`rifacimento/route.ts:167-169`) ho copiato ciò che il rilievo nomina — **il limite (1000)** e **la forma della risposta** (`{ error: … }` che dice il limite). Il **codice** no: in queste due rotte **400 significa «non sono riuscita a leggere i dati»** e 422 «li ho letti, uno non va bene». Un testo troppo lungo è letto benissimo. Copiare 400 renderebbe indistinguibili due fatti diversi — la stessa classe di difetto del lucchetto `toBeGreaterThanOrEqual(400)` che questo giro chiude |
| **C-b** | `conosciuto_il` pretende **ISO 8601 e basta**: sola data, oppure data e ora **con o senza** fuso. Fuori resta ciò che il formato non è (`01/08/2026`, `Aug 1 2026`, `2026-08-01 10:00:00`) | 🔄 **CORRETTA DA ME, dopo averla scritta più stretta.** Avevo rifiutato anche data+ora **senza fuso** — ma `2026-08-06T10:00` **è** ISO 8601 valido, ed è esattamente ciò che restituisce un campo `datetime-local`. Il rilievo chiedeva di «pretendere una data ISO 8601»: rifiutare una data ISO 8601 valida non è quello, è pretendere un sottoinsieme più stretto, e vincolerebbe l'interfaccia del **Task 6** a una scelta che non ho il mandato di fare. Il difetto nominato dal rilievo (`'01/08/2026'` letto come 8 gennaio) è chiuso dal solo controllo di forma. L'ambiguità del fuso resta **reale** ed è riferita in F come **C-R4**, non decisa qui |
| **C-c** | Il tetto si misura sul testo **grezzo**, prima del `trim` | Il tetto serve a limitare ciò che **entra**, non solo ciò che si salva: 5 MB di spazi resterebbero 5 MB letti e trasportati |

## F. RITROVAMENTI (R-E2) di questo giro — riferiti, non corretti

### 🟠 C-R1 — l'helper condiviso dei test non sa ancora simulare una scrittura
Già riferito come **R5** nel referto originale, e questo giro lo conferma dal vivo: il banco pigro con
l'eco del payload è stato scritto **dentro il file di prova**, perché `tests/unit/helpers/supabase-chain-mock.ts`
non ha `insert`/`update` fra i `passthroughMethods`. Ogni prossimo compito che scrive rifarà questo lavoro.
➡️ Aggiungere `insert`/`update`/`upsert`/`delete` **e il risultato pigro** all'helper è additivo.

### 🟠 C-R2 — il tetto di 1000 caratteri è ora in **tre** posti, e non ha una casa
`rifacimento/route.ts:167` · `eventi-qualita/route.ts:73` · `valutazioni/route.ts:42`. Tre costanti
uguali che nessuno tiene insieme: il giorno in cui una cambia, le altre due non lo sanno.
➡️ Candidata a una costante di dominio condivisa — fuori da questo mandato.

### 🟡 C-R3 — il messaggio del formato data è scritto per chi programma, non per chi sta al banco
Il testo del 422 su `conosciuto_il` nomina `2026-08-06T14:30:00Z`. Un'operatrice non digita quel campo
a mano — lo compila l'interfaccia — quindi il messaggio serve a chi collega il Task 6. **Non è una
violazione della precondizione ②** (dice esattamente cosa fare, e nessun testo di Postgres esce), ma è
il solo messaggio di queste rotte il cui destinatario **non** è l'operatrice. Se il Task 6 mette una
maschera di data, quel testo va riscritto per chi guarda lo schermo.

### 🟠 C-R4 — `conosciuto_il` senza fuso: l'ambiguità resta aperta, e aspetta una decisione
`'2026-08-06T10:00'` è ISO 8601 valido e viene **accettato**, ma JavaScript lo legge nell'ora **locale
di chi esegue**: sul server (UTC) e sul telefono dell'operatrice (CEST) lo stesso testo è un istante
diverso, e la differenza si scarica **in avanti** su una scadenza dell'Art. 87.
🔑 **Chiuderla è facile** (pretendere `Z` o `±HH:MM`) **e va fatto adesso, finché nessun client chiama
queste rotte** — ma è una decisione sul **contratto con il client**, cioè su come il Task 6 comporrà il
campo: non la prende un mandato di correzione delle prove. ⚠️ Scritta anche **nel codice**, sopra
`ISO_8601_RE`, perché non si scopra a posteriori. ➡️ **Voce per Francesco**, in coda alla §9 del referto.

### 🟡 C-R5 — correzione a un numero del referto originale: le prove di `nessunTestoGrezzo` erano **sei**, ora sono **nove**
La §6 (riga **D-i**) dichiara «**Sei prove** asseriscono che la risposta non contiene `violates` /
`constraint` / …». Con i tre rami nuovi del punto 2, che se la portano ognuno, le chiamate sono **9**
(`provato:` `grep -n 'nessunTestoGrezzo(' …` → dieci righe, meno la definizione).
🛑 Lo scrivo qui invece di correggere in silenzio la riga sopra: è esattamente il modo in cui la §3 di
questo stesso referto dice che «tre conteggi su tre non hanno retto».

## G. FASE 7 — i tre comandi, output reale

```
$ npx tsc --noEmit
uscita tsc: 0

$ npx vitest run
 Test Files  433 passed | 5 skipped (438)
      Tests  5249 passed | 56 skipped (5305)
   Duration  39.38s
uscita vitest: 0

$ npx next build
uscita next build: 0
✓ Compiled successfully in 3.0s
├ ƒ /api/eventi-qualita/[id]/valutazioni
├ ƒ /api/lavori/[id]/eventi-qualita
```

**In più** (il cancello del commit): `npx eslint src --max-warnings 0` → **0** ·
`bash scripts/check-csrf.sh` → **verde**.

📌 **Le prove del file sono passate da 66 a 81** (+15); la suite intera da 5.234 a **5.249** passate
(+15), coerente: nessun test di altri file è stato toccato.
