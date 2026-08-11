# BRIEF — Task C-sexies: lo snapshot del nome del paziente esce dal contratto (D320)

**Ramo:** `intervento-post-consegna` (🛑 **MAI un worktree**) · **Base:** il salvataggio che porta questo brief
**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`, sezione «Task C-sexies»
**Decisione eseguita:** ⚖️ **D320** — centotrentanovesima tornata di
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

---

## 0. IL MANDATO IN UNA FRASE

**`paziente_nome_snapshot` esce dalle DUE allowlist delle correzioni** — quella TypeScript
(`src/lib/dichiarazione/correzioni.ts`) e quella SQL dentro `correggi_e_riemetti_atomica` — **e la sua
destinazione è scritta: `pazienti.nome`/`pazienti.cognome`, via `PATCH /api/pazienti/[id]`.**
🛑 **Non si cancella nessuna colonna. Non si tocca il generatore. Non si tocca il foglio.**

---

## 1. LA DECISIONE, con le parole di Francesco

> «*aspetta se ho sbagliato anagrafica di paziente, è giusto cambiare l'anagrafica, ma se il nome in
> anagrafica è sbagliato, non va cambiato da qua, ma va cambiato in anagrafica e poi tutto si deve
> aggiornare di conseguenza*»

**Cioè due cose diverse, e solo la prima resta sul foglio della dichiarazione:**
- **ho sbagliato PERSONA** → si punta a un'altra anagrafica: `paziente_id`, che **resta** correggibile;
- **il NOME è scritto male** → si corregge **dove il nome vive**, cioè in anagrafica, e da lì si propaga.

🔑 **Il motivo tecnico per cui la seconda non può stare qui, e va capito prima di toccare il codice:**
`src/lib/pdf/generate-ddc.ts:304` legge
`lavoro.paziente_nome_snapshot ?? lavoro.paziente?.nome_cognome ?? lavoro.paziente?.codice_paziente ?? ''`.
**Lo snapshot VINCE.** Scriverlo dal foglio congelerebbe su quel lavoro un nome che l'anagrafica non
governa più: ogni correzione futura in anagrafica **non arriverebbe** su quel documento. È l'opposto di
«*e poi tutto si deve aggiornare di conseguenza*».

📌 **È il ritrovamento `I2`**, riferito dalla revisione del Task C-quater e rimandato «da decidere nel
Task D». **Questa è quella decisione**, e arriva **prima** del foglio.

---

## 2. 📋 REGISTRO DELLE PROVE (R-P1) — che cosa è misurato e che cosa NO

| # | assunzione | esito |
|---|---|---|
| **S1** | lo snapshot vince sul nome vivo nel generatore | ✅ `provato:` (orchestratore) `generate-ddc.ts:304` letto: `paziente_nome_snapshot ?? paziente?.nome_cognome ?? paziente?.codice_paziente ?? ''` |
| **S2** | **la via di rettifica in anagrafica esiste già ed è viva** — senza questa, D320 manderebbe la persona in un posto che non c'è | ✅ `provato:` (orchestratore) `src/app/api/pazienti/[id]/route.ts:99-140` porta la correzione di `nome`/`cognome`, scritta per l'**Art. 16 GDPR** (rilievo G4), col commento che dichiara il motivo: «*un cognome scritto male finisce in `dichiarazioni_conformita.paziente_nome`, che si conserva 10 anni*». A schermo: `PazienteEditSheet.tsx` (`method: 'PATCH'`, riga 51), montata su `/pazienti/[id]` (`page.tsx:86`) |
| **S3** | lo snapshot ha oggi **zero scrittori** | 📌 **dal piano, non rimisurato oggi**: P5 («nessuno la scrive» in `PATCHABLE_FIELDS`) e P3 (**1 riga su 299** piena, la fixture del seed `supabase/seed.sql:133`). ⚠️ **Da riverificare dall'esecutore se una sonda gli costa poco**, perché è esattamente il tipo di affermazione che questa giornata ha smentito **tre volte** |
| **S4** | il precheck MDR usa la **stessa** catena di ripieghi | ✅ `provato:` `src/lib/consegna/precheck.ts:99-101` — identica a `generate-ddc.ts:304`. ➡️ **Non si tocca**: cambia niente, perché la colonna resta e resta letta per prima |
| **S5** | 🔴 **quanti posti nominano lo snapshot** — il censimento, e **non lo decide chi scrive questo brief** | ✅ `provato:` `grep -rn` escludendo `database.types.ts`: `src/app` **17** · `src/lib` **11** · `src/components` **14** · `src/types` **5** · `tests` **42** · `supabase/migrations` **14**. 🛑 **La stragrande maggioranza sono LETTORI e non si toccano** — v. §4 |
| **S6** | la RPC viva porta lo snapshot in due punti | ✅ `provato:` l'ultima migration del ledger (`20260808142358_atto_unico_senza_numero_prescrizione.sql`) lo nomina a **:110** (allowlist `c_su_lavori`), **:325** (`UPDATE … = v_lavoro_atteso.paziente_nome_snapshot`) e **:456** (il `COMMENT`). 🛑 **Il file NON è la prova: la verità è il catalogo vivo** (`pg_get_functiondef`) |

🛑 **Ogni blocco di codice che scriverai nasce `non eseguito`.** Le sonde si provano, e **una prova nuova
non è finita finché non l'hai vista diventare ROSSA** rompendo apposta il codice.

---

## 3. I PASSI

### Passo 1 — TypeScript: `src/lib/dichiarazione/correzioni.ts`

- [ ] `paziente_nome_snapshot` esce da **`CAMPI_CORREGGIBILI_DOCUMENTO`** (riga 44) → **sette nomi → SEI**.
- [ ] `paziente_nome_snapshot` esce da **`CAMPI_TESTO`** (riga 60) → **quattro voci → TRE**.
      ⚠️ Un nome tolto da un elenco e lasciato nell'altro sarebbe un tipo dichiarato che non esiste più —
      `tsc` lo direbbe subito, ma il punto è non scriverlo.
- [ ] 🔴 **I COMMENTI VICINI AL CODICE TOCCATO — è il difetto `B3` del C-quinquies, e ricade qui uguale.**
      L'intestazione del modulo (righe 6-40) porta **due** cose che diventano false:
      - «**SETTE NOMI PER SEI VOCI A SCHERMO**» (riga 16) → da qui in avanti **un nome, una riga**: sei
        nomi, sei righe;
      - **tutto il paragrafo che spiega il doppione del paziente** (righe 16-21: «*chi ha sbagliato
        persona usa la prima, chi ha sbagliato a scrivere il nome usa la seconda*») → **cade**, e al suo
        posto va la riga di D320 con **la destinazione**: il nome si corregge in anagrafica.
      - la riga 53 («*Le **quattro** voci che sono TESTO*») → **tre**.
      - la riga 80 cita lo snapshot dentro il racconto di `C2`: è **storia di una misura**, e la storia
        non si riscrive — ma se resta, va chiarito che quella chiave **oggi non è più accettata**.
      🔑 *Il commento più vicino al codice toccato è quello che nessuno rilegge e che resta stantìo.*

### Passo 2 — SQL: la nuova migration

- [ ] 🕛 **Il nome si prende con l'orologio UNIVERSALE, in un comando SEPARATO** (D311):
      `date -u "+%Y%m%d%H%M%S"`. **Pavimento: `20260808142358`.**
- [ ] **Si ribatte il corpo VIVO dal catalogo** (`pg_get_functiondef`), **non dal file**: pagato due volte
      in quest'ondata.
- [ ] `paziente_nome_snapshot` esce dall'allowlist `c_su_lavori`.
- [ ] ⚠️ **La riga dell'`UPDATE`** (`paziente_nome_snapshot = v_lavoro_atteso.paziente_nome_snapshot`) è
      **la copia del valore ATTESO su sé stesso**, non una scrittura di una correzione. **Guardala e
      decidi con la tua testa** se debba restare: se la chiave non può più arrivare, quella riga riscrive
      il valore con sé stesso. **Qualunque cosa decidi, scrivila nel resoconto col perché.**
- [ ] **Il `COMMENT` porta la destinazione**, che è il cuore di R-P6: `paziente_nome_snapshot` →
      *si corregge in anagrafica*, `PATCH /api/pazienti/[id]`. Un nome tolto senza destinazione è un dato
      che smette di salvarsi **in silenzio**.
- [ ] 🛑 **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`, nella stessa migration.** Dopo un `CREATE`
      fresco Postgres concede `EXECUTE` a **`PUBLIC`, `anon` e `authenticated`** (misurato): il `REVOKE`
      è **portante**, non cosmetico.
- [ ] ⚖️ **Applicare la migration NON si chiede** (D284): `npx supabase db push --linked --yes`, dalla
      cartella `ua-app/`. `--yes` è obbligatorio o il comando resta appeso a una domanda e **sembra
      fallito senza esserlo**.

### Passo 3 — le sonde

- [ ] **Una invocazione per sonda**, in **transazione annullata**, con la fixture costruita **dentro**.
- [ ] ① `p_correzioni = {"paziente_nome_snapshot": "Mario Russo"}` → **deve essere RIFIUTATA**, e il
      messaggio va **incollato nel resoconto**.
- [ ] ② il giro buono con una chiave che resta (per esempio `descrizione`) → **ok**, e si verifica
      **l'atterraggio**: il valore si legge dove dovrebbe essere finito.
- [ ] ③ 🔑 **La sonda che dice se il lavoro è servito a qualcosa:** dopo una correzione andata a buon
      fine, `lavori.paziente_nome_snapshot` **non è cambiato**.
- [ ] 🛑 **`scripts/psql.mjs` si collega come `postgres`, cioè come PROPRIETARIO**: una sonda sui permessi
      **senza `SET LOCAL ROLE` non prova niente**. Accetta sia un percorso di file sia `-c "SQL"`, ma
      **non** `\echo`. Credenziali: `set -a && . ./.env.local; set +a`.
- [ ] ⚠️ **`now()` è COSTANTE dentro una transazione**: una fixture creata lì dentro nasce col gettone
      già «giusto». Se ti serve provare un `conflitto`, **arretra `updated_at`** nella fixture.

### Passo 4 — le prove automatiche, e devono diventare ROSSE

- [ ] `tests/unit/correzioni-documento.test.ts` — la chiave rifiutata dal filtro TypeScript.
- [ ] **R-P4:** dopo il primo rosso, abbozzo inerte e **CONTA** quante asserzioni si accendono (`N su M`,
      il numero si scrive nel resoconto).
- [ ] **Le forme d'input da enumerare** (ognuna col suo caso o col suo «non coperta, perché»):
      `paziente_nome_snapshot` da sola · insieme a una chiave valida · con valore vuoto (deve dare **il
      messaggio della chiave ignota**, non quello del vuoto: l'ordine dei controlli conta) · con
      `paziente_id` insieme.
- [ ] 🛑 **Ci sono 42 occorrenze nelle prove**: alcune asseriscono l'elenco esatto delle chiavi e
      **falliranno**. Si **aggiornano sul posto**, non si cancellano — è ciò che il C-quinquies ha fatto
      bene (`+4` prove, zero cancellate).
- [ ] 📌 **Aspettativa dichiarata: il numero delle prove DEVE muoversi.** Base: **5621 | 68 su 454**.
      Se resta fermo, qualcosa non è stato provato.

### Passo 5 — FASE 6b e FASE 7

- [ ] `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
      → togliere l'eventuale messaggio della CLI in fondo → `npx tsc --noEmit`.
      📌 **Nessuna differenza è un esito possibile e legittimo**: la **firma** della RPC non cambia, cambia
      il **corpo** — e i tipi generati il corpo non lo descrivono. Dichiaralo, non nasconderlo.
- [ ] `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — 🛑 **l'uscita si legge DA VARIABILE**
      (dietro una pipe è quella dell'ultimo comando). ⚠️ **Ci mette PIÙ DI DUE MINUTI**: con un limite di
      due minuti si interrompe senza aver finito e **sembra un guasto**. Usa un timeout di **600000 ms**.
- [ ] **Salva** con ⚖️ **D318 — `git add <percorsi>`, MAI `git add -A`.** ⚠️ Con `git commit -m` la shell
      **esegue i backtick e ti mangia la parola**: per i messaggi lunghi si usa `-F <file>`.

---

## 4. 🛑 CHE COSA NON DEVI FARE — e il censimento dice perché

**`paziente_nome_snapshot` è nominata in ~103 punti del codice (S5), e quasi tutti sono LETTORI che
restano esattamente come sono.** Toccarli è fuori mandato:

- 🛑 **NON cancellare la colonna** né alcuna delle sue letture. D320 non uccide il dato: chiude **una
  penna**. (Stesso trattamento delle tre colonne di D319.)
- 🛑 **NON toccare `generate-ddc.ts:304`** né `precheck.ts:99`. Il ripiego `snapshot ?? nome_cognome`
  resta: su **1 riga su 299** lo snapshot è pieno, e cambiare quel ripiego cambierebbe che cosa stampa
  una riemissione **di quel lavoro**. Se vada tolto è **una decisione a sé**.
- 🛑 **NON toccare `PATCH /api/pazienti/[id]` né `PazienteEditSheet`**: sono la destinazione, funzionano,
  e sono stati scritti per l'Art. 16 GDPR.
- 🛑 **NON toccare `DevoIntervenire.tsx`**: il foglio è il **Task D**, e lo scrive un esecutore diverso.
- 🛑 **NON toccare le altre allowlist** (`PATCHABLE_FIELDS` di `lavori/[id]/route.ts`), né
  `riemetti_ddc_atomica`, né il clone del rifacimento (`007_rpc_rifacimento.sql:52-60`).

---

## 5. ⚠️ TRE COSE GIÀ NOTE E FUORI DAL TUO MANDATO — non correggerle, e non ri-riferirle come nuove

Sono già scritte nella mappa di recupero (`.superpowers/sdd/progress.md`). **Se le incontri, tirai
dritto** — R-E2 vale anche al contrario: ri-riferire come nuovo un difetto già noto fa perdere tempo.

- **I3** — la porta d'idempotenza ha **una sola** asserzione: con le colonne invertite le due prove di
  comportamento restano verdi. **Vive in
  `src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts`, che tu NON tocchi.**
- **M1** — lo `switch` di quella stessa rotta è senza `default` né guardia di esaustività.
- **`{"denti_coinvolti": []}`** cancella tutti i denti ed è indistinguibile da una correzione voluta
  (oggi lo blocca la regola sul vuoto).

---

## 6. CHE COSA IL RESOCONTO DEVE CONTENERE

`.superpowers/sdd/atto-unico-task-c-sexies-report.md`, e queste voci sono obbligatorie:

1. **Che cosa hai cambiato**, percorso per percorso.
2. **Le sonde**, col SQL e con l'**output incollato** — comprese quelle che dovevano fallire.
3. **R-P4: il conteggio delle asserzioni** che si accendono sull'abbozzo inerte (`N su M`), e
   **l'enumerazione delle forme d'input** con il loro caso o il loro «non coperta, perché».
4. **La prova che una prova nuova sa diventare ROSSA**: che cosa hai rotto apposta, e che cosa si è
   acceso.
5. **La FASE 7 con l'uscita letta da variabile** e il conto delle prove (base **5621 | 68 su 454**).
6. 🔴 **DOVE QUESTO BRIEF SBAGLIA.** Cercalo attivamente: è il meccanismo che in quest'ondata ha trovato
   **otto difetti di piano su otto compiti**. Se non trovi niente, **scrivilo** — ma cercalo davvero.
7. **I ritrovamenti FUORI MANDATO (R-E2): si riferiscono, non si correggono.**
8. **Che cosa NON hai fatto**, per intero.

---

## 7. 🔑 LE CINQUE LEZIONI DELLA GIORNATA, perché valgono per te

**QUATTRO VOLTE, in un giorno, una prova che non poteva fallire — e nessuna era una svista:**
① `now()` è costante in transazione → la sonda sul conflitto era verde per forza ·
② `scripts/psql.mjs` si collega come **proprietario** → ogni sonda sui permessi senza `SET LOCAL ROLE`
non provava niente · ③ la fixture viveva nell'anno che faceva **coincidere per caso** il valore
ereditato: **sedici** sonde di fila non hanno visto il buco · ④ il finto rispondeva **per ordine di
chiamata** e inghiottiva i filtri → le prove restavano verdi **con le letture invertite**.
**E una quinta, di specie diversa:** una prova che passava **sia con la regola vecchia sia con quella
nuova** — era decorazione, non una prova.

➡️ **UNA PROVA NUOVA NON È FINITA FINCHÉ NON L'HAI VISTA DIVENTARE ROSSA rompendo apposta il codice.**
➡️ **E UN CONTRATTO SI GIUDICA PER CIÒ CHE PERMETTE, non per ciò che oggi gli si chiede.** È l'intera
ragione di questo compito: nessuno oggi manda quella chiave — ma finché la porta è aperta, la sola cosa
che la tiene chiusa è una schermata.
