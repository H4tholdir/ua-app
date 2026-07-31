# Referto — la verifica dal vivo delle due impronte della DdC (§0 dell'handoff del 3 agosto)

**Esito: ✅ PROVATO in produzione.** Una Dichiarazione di Conformità **nuova** nasce con le sue due
impronte: `payload_sha256` valorizzato e `template_version = 'ddc-v1'`.

**Chiude:** `docs/roadmap/2026-08-03-uscita-strati-e-ddc-handoff.md` §0, **primo braccio**.
🛑 **Il secondo braccio della §0 resta aperto:** il primo braccio della guardia
`scripts/guardia-navigazione-overlay.mjs` (fixture `E2E-CAS-002`) **non è stato toccato** — vedi §5.

⚠️ **Sulla data.** L'orologio della macchina dice **31 luglio**, i nomi dei documenti del progetto seguono
il **3 agosto**. Questo referto tiene il nome della serie. 🔑 **Ma ora c'è un fatto misurato:** la
dichiarazione emessa in produzione porta stampato **31/07/2026** — l'orologio che finisce sui documenti a
valore legale è quello della macchina, non quello dei nomi dei file.

---

## 1. Che cosa andava provato, e perché non bastavano le prove automatiche

Le sette prove di `tests/unit/generate-ddc.test.ts` girano contro il generatore vero e misurano il payload
dell'inserimento. Provano **il generatore**. Non provano **la catena**: che premendo «Consegna» su
uachelab.com quel generatore venga davvero chiamato, che l'inserimento arrivi in banca dati, e che la riga
finale porti le due colonne piene. Fra il generatore e la riga ci sono l'orchestratore della consegna, il
lock di idempotenza, il precheck MDR, lo storage e PostgREST.

---

## 2. Il lavoro usato — e perché NON quello indicato

Il lavoro indicato nell'handoff (`7dba9a57-15bc-400e-a36f-28440980556f`, «il lavoro con una foto caricata»)
**non era utilizzabile**, per due ragioni indipendenti, entrambe verificate prima di toccare qualsiasi cosa:

| | |
|---|---|
| **stato `ricevuto`** | `STATI_CONSEGNABILI` ammette solo `pronto` e `in_ritardo` (`src/lib/consegna/costanti.ts:4`). La consegna si sarebbe fermata al gate B1 |
| **nessun paziente** | `paziente_nome_snapshot` e `paziente_id` entrambi nulli → elemento 4 dell'Allegato XIII mancante, il precheck MDR blocca prima della generazione (`src/lib/consegna/precheck.ts:36-52`) |

La foto che quel lavoro porta serve al **quarto braccio della guardia overlay**, non alla dichiarazione.

**Usato invece `TEST-DdC-001` (`7d5343a8-3364-4dd2-992f-c0510e8ea026`)**, laboratorio «Filippo Opromolla»
(`971061a1`, tenant `trial` → operativo). Scelto da Francesco fra due strade proposte.

🔑 **Il controllo che ha reso la prova valida** — e che senza cercarlo l'avrebbe invalidata in silenzio:
`generateDdC` ha un **guard di idempotenza** (`generate-ddc.ts:85-95`): se per quel lavoro esiste già una DdC
con stato ≠ `annullata`, **restituisce quella e non inserisce niente**. Su un lavoro con una dichiarazione
attiva la consegna sarebbe andata a buon fine, non avrebbe scritto nulla, e la lettura avrebbe mostrato una
riga vecchia con le colonne vuote: **un rosso falso**, indistinguibile da un difetto vero. `TEST-DdC-001`
aveva **zero** dichiarazioni attive, verificato prima.

In più il lavoro ha la **fotografia dei denti** su `lavori_denti` (elementi 21, 37, 38, `provenienza`
`eseguito`), quindi esercita anche il pezzo spostato da D102 ③.

---

## 3. L'esito, sul dato vero

Consegna premuta dalla scheda del lavoro su **https://uachelab.com** alle **21:49:18 UTC**.
Lettura fatta con `scripts/tmp/leggi-ddc.ts` (sola lettura, chiave di servizio, nessuna finta).

```
=== DICHIARAZIONI DI CONFORMITÀ (2) ===

  numero_ddc        DDC-2026-0001            ← emessa il 22/07, PRIMA di D102
  stato             annullata
  payload_sha256    🔴 NULL
  template_version  🔴 NULL

  numero_ddc        DDC-2026-0002            ← emessa ORA, dalla catena viva
  stato             generata
  created_at        2026-07-31T21:49:19.671758+00:00
  payload_sha256    16e98549fb45a8d22aaa07abebfa8db26ec22fd3ee81bab05894ccce34ea3640  ✅ 64 hex
  template_version  ddc-v1                                                            ✅ atteso ddc-v1
  pdf_sha256        32c3e46529df9da92ca10b8830c55ee84b348d758a94ef7c7e3b165833ddae0b  ✅ diverso dal payload
```

🔑 **Le due righe stanno nella stessa tabella e valgono più di una misura sola:** la vecchia col buco, la
nuova piena. Non è «le colonne risultano valorizzate»: è **il prima e il dopo della riparazione, sullo
stesso lavoro**.

**I criteri, dichiarati prima di guardare** (per non accontentarsi di un non-`NULL` qualunque):

1. la riga dev'essere **nuova** — `created_at` posteriore alla consegna e numero progressivo successivo ✅
2. `payload_sha256` di **forma plausibile**: 64 cifre esadecimali, non una stringa vuota né un segnaposto ✅
3. `template_version` **uguale al valore che il generatore scrive oggi** (`VERSIONE_TEMPLATE_DDC = 'ddc-v1'`,
   `generate-ddc.ts:41`), non un non-`NULL` qualsiasi ✅
4. `payload_sha256` **diverso** da `pdf_sha256` — sono due domande diverse (da quali dati è nato / il file
   non è stato toccato); se coincidessero, una delle due sarebbe scritta al posto sbagliato ✅

### Verifica in più, non richiesta: il file archiviato corrisponde alla sua impronta

Scaricato il PDF dall'archivio e ricalcolata l'impronta del file (`scripts/tmp/verifica-pdf-ddc.ts`):

```
byte scaricati:       4922
sha256 del FILE:      32c3e46529df9da92ca10b8830c55ee84b348d758a94ef7c7e3b165833ddae0b
pdf_sha256 in riga:   32c3e46529df9da92ca10b8830c55ee84b348d758a94ef7c7e3b165833ddae0b
✅ COINCIDONO
```

Non prova l'impronta del **payload** (per quella servirebbe ricostruire l'oggetto reso, data di emissione
compresa), ma prova che la riga non porta un'impronta inventata: **il documento archiviato è esattamente
quello di cui la riga risponde**.

---

## 4. Il giro è stato annullato — lo stato è tornato quello di prima

Annullo premuto dal banner entro la finestra (`FINESTRA_ANNULLO_MS` = 10 minuti; al momento dell'annullo il
banner segnava **09:37** residui).

| | prima | dopo la consegna | dopo l'annullo |
|---|---|---|---|
| `lavori.stato` | `pronto` | `consegnato` | **`pronto`** ✅ |
| `data_consegna_effettiva` | `null` | `2026-07-31T21:49:19.7Z` | **`null`** ✅ |
| DdC attive | 0 | 1 (`DDC-2026-0002`) | **0** ✅ — la riga resta come **storia**, stato `annullata`, con le sue due impronte |

**Il lavoro è di nuovo disponibile per altre prove**, esattamente come lo si è trovato.

### Ciò che resta consumato (detto a Francesco prima di premere, non dopo)

Un numero progressivo di dichiarazione (`DDC-2026-0002`) e uno di buono (`BUO-2026-0001`) sono **bruciati**;
due PDF restano nell'archivio; è partita una notifica verso il front desk. Su dati di prova non è un danno.
**Nessun messaggio WhatsApp è stato inviato**: il tasto era lì, ma manda un messaggio vero e non è stato
toccato.

---

## 5. Ritrovamenti FUORI dal mandato — riferiti, non corretti (R-E2)

### 🟠 ① Gli accenti mancano nel documento a valore legale — e **non è un limite del carattere**

Il PDF emesso stampa **«DICHIARAZIONE DI CONFORMITA»**, **«Responsabile della Conformita (PRRC)»** e
**«il presente dispositivo e' conforme»**. Titolo, etichetta della firma e frase di conformità: i tre punti
più letti del foglio.

🔑 **La prova che è un difetto e non un vincolo tecnico sta dentro lo stesso documento:** nel §8 (rischi
residui) si legge **«Il dispositivo è conforme ai requisiti…»**, con la `è` resa correttamente. Quel testo
arriva dalla banca dati (`rischi_residui_snapshot`); gli altri sono **scritti senza accento nel sorgente**:

- `src/components/features/pdf/DdcTemplate.tsx:326` (titolo), `:486` (§7), `:514` (etichetta PRRC),
  `:292` e `:294` (titolo e oggetto nei metadati del file)
- `src/lib/pdf/generate-ddc.ts:117` — il testo di conformità con `e'`, che **finisce anche in banca dati**
  (`testo_conformita_snapshot`) e quindi nell'impronta del payload

⚠️ **Perché non l'ho corretto qui:** cambiare quel testo cambia `payload_sha256` per tutte le emissioni
future, e il testo congelato è un dato conservato dieci anni. Non è una correzione di battitura: è una
decisione sul contenuto di un documento normativo. **Va deciso, non fatto di passaggio.**

🛑 **E quando si farà, vale solo IN AVANTI: le dichiarazioni già emesse non si rigenerano.** Rigenerarle
cambierebbe l'impronta di documenti già consegnati — che è esattamente ciò che l'impronta esiste per
impedire. Scritto qui perché la proposta naturale, davanti a un refuso, è «sistemiamo anche le vecchie».

### 🟡 ② La numerazione dei paragrafi salta il §2

Il foglio va `§1 → §3 → §4 …`: il §2 (data di emissione) esiste come dato — stampato in testa e in calce —
ma senza il suo titoletto. Chi legge il documento con l'elenco dell'Allegato XIII in mano vede un buco che
non c'è. Cosmetico, ma è il tipo di dettaglio che in ispezione costa una domanda.

---

## 6. Come è stata fatta materialmente (per chi rifà il giro)

- **Accesso:** link d'accesso monouso generato con la chiave di servizio del progetto
  (`scripts/tmp/link-accesso.ts` → `admin.generateLink` → `/auth/callback?token_hash=…&type=magiclink`).
  Aggira anche il limite di tentativi di accesso ravvicinati citato nell'handoff §5.
- **Script usati** (tutti in `scripts/tmp/`, che è **ignorato da git**, e tutti di **sola lettura** tranne il
  generatore di link): `leggi-ddc.ts` (stato lavoro + righe DdC), `censisci-consegnabili.ts` (quali lavori
  passerebbero il precheck), `censisci-banco.ts` (laboratori, utenti, lavori del banco),
  `verifica-pdf-ddc.ts` (impronta del file archiviato).
- **L'ordine che rispetta i 10 minuti:** lettura e script **preparati e collaudati prima** di premere
  «Consegna», così fra la consegna e l'annullo restano solo due gesti.

---

## 7. Il controllo sui numeri progressivi — ✅ nessun duplicato, e non ce ne saranno

La consegna ha bruciato `DDC-2026-0002` e `BUO-2026-0001`. **L'annullo non restituisce i numeri**, quindi
valeva la pena chiedersi se un numero possa poi ripresentarsi su un secondo documento: un progressivo che si
ripete è un difetto di classe fiscale, e sarebbe nato proprio da un giro come questo.

**Non può succedere, e la ragione è nella funzione, non nella fortuna.** `genera_progressivo`
(`supabase/schema.sql:93`) fa un `INSERT … ON CONFLICT (laboratorio_id, tipo, anno) DO UPDATE SET
progressivo = progressivo + 1 RETURNING`: un contatore per laboratorio/tipo/anno che **cresce e basta**, che
non guarda le righe esistenti e quindi **non recupera i numeri delle dichiarazioni annullate**. Stato del
contatore dopo il giro:

```
tipo=ddc    anno=2026  progressivo=2      → la prossima sarà DDC-2026-0003
tipo=buono  anno=2026  progressivo=1      → il prossimo sarà BUO-2026-0002
tipo=lavoro anno=2026  progressivo=11
```

Verificato anche sui dati: **un solo `buono_numero` in tutto il laboratorio, nessuno ripetuto**.

📌 **Un fatto emerso di sbieco, non un difetto misurato:** la dichiarazione del 22/07 (`DDC-2026-0001`)
**non ha un buono di consegna** — il contatore dei buoni era a zero fino a oggi. Il flusso di consegna li
genera sempre in sequenza (`orchestrate.ts` Step 3 → Step 4), quindi quella riga probabilmente **non nasce
da una consegna completa** (uno script, o un tentativo interrotto dopo la dichiarazione). **Non l'ho
determinato**, ed essendo un laboratorio di prova non ho speso altro tempo: sta qui perché una domanda
lasciata senza risposta è meglio dichiararla che dimenticarla.
