# BRIEF — Task B del piano «Correggi e rifai la dichiarazione» (atto unico)

**Piano:** `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md` — 🛑 **leggi PRIMA
il blocco «📐 MISURE DI APERTURA DEL TASK B» (P7-P12)**: sono misure fatte stamattina sul catalogo vivo, e
**due di esse hanno già cambiato il tuo compito**. Poi il «Task B».
**Ramo:** `intervento-post-consegna` (già in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `3d11fedd`. Il **Task A è COMPLETO** e non si rifà.

⚠️ **QUESTO TASK HA UNA MIGRATION.** Quindi: nome col **`date -u "+%Y%m%d%H%M%S"` in un comando SEPARATO**
(D311 — pavimento `20260807185858`), `npx supabase db push --linked --yes` **senza chiedere** (D284), e
**FASE 6b dovuta** (`gen types` → `tsc`).

---

## 🔴 IL COMPITO IN UNA FRASE

Costruire `correggi_e_riemetti_atomica`: una funzione di database che, in **una sola transazione**,
corregge i dati sbagliati di un lavoro **e** rifà la sua dichiarazione — o fa tutto, o non fa niente.
Più l'indice che rende quell'atto **usabile una volta sola**.

🔑 **Perché esiste:** oggi un refuso su un dato *stampato* non si corregge in nessun momento — non prima
(il cancello D308 risponde 422), non durante (l'annullo e l'inserimento stanno nella stessa transazione),
non dopo (la nuova nasce già viva). L'unico percorso che funziona dichiara una consegna mai avvenuta,
cioè **mente**.

---

## 🛑 LE CINQUE COSE MISURATE CHE TI EVITANO I DUE GIORNI PEGGIORI

Sono nel piano come P7-P12. Le ripeto qui perché sono **il compito**, non il contorno.

### 1. Le otto voci vivono in TRE DEPOSITI, non in uno

| deposito | voci | come si scrive |
|---|---|---|
| colonne di `lavori` | `richiedente_nome` · `paziente_id` · `paziente_nome_snapshot` · `numero_prescrizione` · `tipo_dispositivo` · `descrizione` | `UPDATE` dentro la tua RPC |
| `lavori_denti` (+ la denormalizzazione `lavori.denti_coinvolti`) | `denti_coinvolti` | **chiami** `lavoro_denti_sostituisci_atomica` |
| `lavori_prescrizioni.contenuto` (**`jsonb`**, non testo) | `prescrizione_caratteristiche` | **chiami** `lavoro_prescrizione_correggi_typo` |

🛑 **Le ultime due si CHIAMANO, mai si ricopiano.** `20260727120300:218` dichiara quelle funzioni **penne
uniche**: un `UPDATE lavori SET denti_coinvolti = …` scritto da te farebbe divergere `lavori_denti` dalla
denormalizzazione **che il documento stampa**, e la divergenza sarebbe silenziosa. La chiamata annidata
sta nella stessa transazione: **l'atomicità di D315 non si perde.**

⚠️ **`lavoro_prescrizione_correggi_typo` accetta SOLO tre campi:** `elementi` · `colore` · `tipo`. Se una
correzione a `prescrizione_caratteristiche` non mappa su uno di quei tre, **non la inventare**: fermati e
riferisci — è una domanda di perimetro, non un difetto da tappare.

### 2. 🔴 L'ANNULLO VA PRIMA DELLE CORREZIONI, e questo rovescia il piano originale

`lavoro_prescrizione_correggi_typo` contiene questo, misurato sul catalogo:

```
IF EXISTS (SELECT 1 FROM dichiarazioni_conformita
            WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND stato <> 'annullata')
  THEN RETURN json_build_object('esito', 'congelata');
```

col commento: *«il typo si corregge annullando la dichiarazione, non riscrivendo la storia sotto di
essa»*. **L'atto unico opera esattamente col documento vivo** → con l'ordine del piano originale quella
correzione **fallisce sempre**.

➡️ **L'ordine è:** ① lock sul lavoro · ② gettone · ③ **annulla la vecchia** · ④ correggi i tre depositi ·
⑤ inserisci la nuova. La finestra utile è **fra l'annullo e l'inserimento**, perché anche la nuova nasce viva.

### 3. 🛑 IL GETTONE SI RINFRESCA A OGNI PASSAGGIO

`trg_lavori_updated_at` è BEFORE UPDATE su `lavori`: **ogni** scrittura lo muove. Entrambe le penne
confrontano il gettone **su `lavori`** (non sulla propria tabella) **e restituiscono quello nuovo**
(`'updated_at', v_updated_at`).

➡️ Passa alla penna successiva **il valore di ritorno della precedente**, mai `p_atteso_updated_at`
d'ingresso. Col gettone originale la **seconda** chiamata torna `conflitto` **sempre** — e la sonda del
giro buono fallirebbe facendoti diagnosticare il tuo codice invece del tuo **ordine di chiamate**.

### 4. L'indice è efficace, ma per una ragione precisa — e la RPC deve scriverla

`riemetti_ddc_atomica` scrive `annullata_da_evento_id = p_evento_id` **sulla dichiarazione VECCHIA**.
Perciò `UNIQUE (laboratorio_id, annullata_da_evento_id) WHERE NOT NULL` ferma davvero il doppio invio: il
secondo tentativo annullerebbe un'**altra** riga **con lo stesso evento** → `23505`.

🛑 **La tua RPC deve scrivere quella colonna allo stesso modo.** Se non la scrive, **l'indice è
decorativo** e il doppio tocco passa: riemette due volte e **brucia due progressivi**.

⚠️ **E una correzione al registro prove che devi conoscere:** P2 diceva «0 doppioni → l'indice si crea».
Misurato oggi: `annullata_da_evento_id` è **NULL su tutte e 6 le righe**, e `sostituisce_id` pure — cioè
`riemetti_ddc_atomica` **non è mai stata eseguita sul banco**. **P2 era vera per vacuità.** L'indice resta
giusto, ma non perché i dati lo abbiano provato.

### 5. Il modello da ribattere è il **catalogo**, non il file

`riemetti_ddc_atomica` viva è in `scripts/tmp/riemetti-vivo.txt` (estratta oggi con
`pg_get_functiondef`). ⚠️ **`scripts/tmp/` è IGNORATO da git**, quindi quel file può non esserci: si
rifà, e il comando è la fonte vera —

```bash
node scripts/psql.mjs -c "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='riemetti_ddc_atomica'" > scripts/tmp/riemetti-vivo.txt
```

Da lì prendi: la guardia sull'evento (`evento_non_valido`), la definizione di
«viva» (**`stato <> 'annullata'`** — 🛑 mai un elenco di stati), il **fail-closed** sull'annullo
(`GET DIAGNOSTICS … IF v_rows <> 1 THEN RAISE`), il controllo R-P6 sulle chiavi, e i campi **azzerati a
mano** sulla nuova (`firmata_at`, `firma_digitale_url`, `inviata_al_dentista*`, `deleted_at`,
`annullata_da_evento_id`).

⚠️ **Il controllo R-P6 sulle chiavi NON può essere copiato tale e quale:** l'originale valida contro «le
colonne di `dichiarazioni_conformita`». Per `p_correzioni` l'elenco è **la tabella dei tre depositi** —
otto nomi, scritti a mano. E il `COMMENT` della funzione porta la tabella chiave→destinazione.

---

## 📋 I PASSI

- [ ] **Passo 0 — apri e leggi**, e scrivi nel resoconto cosa hai trovato: `scripts/tmp/riemetti-vivo.txt`
  (il modello), `supabase/migrations/20260807143623_riemissione_ddc.sql` (la migration che l'ha creata),
  `supabase/migrations/20260727120300_lavori_denti_rpc.sql` (la penna dei denti e il perché della
  denormalizzazione), `supabase/migrations/20260807180314_*.sql:46` (il modello dell'indice unico parziale).
- [ ] **Passo 1 — l'indice** `ddc_evento_annulla_unique`, unico parziale su
  `(laboratorio_id, annullata_da_evento_id) WHERE annullata_da_evento_id IS NOT NULL`.
- [ ] **Passo 2 — la RPC** `correggi_e_riemetti_atomica`, con l'ordine del punto 2 qui sopra,
  `SECURITY DEFINER` + `SET search_path` identici al modello, e
  **`DROP` → `CREATE` → `REVOKE` → `GRANT service_role` → `COMMENT`** nella stessa migration.
- [ ] **Passo 3 — le sonde.** 🛑 **UNA INVOCAZIONE PER SONDA** (`node scripts/psql.mjs <file.sql>` —
  accetta anche `-c "SQL"`, **ma non `\echo`**), in **transazione annullata**, con la fixture costruita
  **dentro** la transazione (una sonda che aggiorna righe inesistenti dà **falso verde** — difetto già
  pagato). Credenziali: `set -a && . ./.env.local; set +a`.
  1. `evento_id` già usato → **`23505`**, messaggio incollato;
  2. `p_atteso_updated_at` sbagliato → **`conflitto`**;
  3. chiave fuori dalle otto → **rifiutata**, messaggio incollato;
  4. chiamata **con la chiave pubblica** (`anon`) → **`42501`**;
  5. **la chiamata annidata funziona davvero** (P12: `SECURITY DEFINER` che ne chiama un altro — provalo,
     non assumerlo);
  6. **il giro buono**, e qui la prova è **l'ATTERRAGGIO, una voce per volta**: dopo la chiamata, ognuna
     delle otto si rilegge **dove dovrebbe essere finita** (le sei su `lavori`, i denti su `lavori_denti`
     **e** sulla denormalizzazione, le caratteristiche dentro `lavori_prescrizioni.contenuto`), **e** la
     nuova dichiarazione esiste **e** la vecchia è `annullata` col suo `annullata_da_evento_id`.
     🔑 *Rifiutare l'ignoto è metà del lavoro: una chiave accettata e instradata da nessuna parte è lo
     scarto silenzioso di `route.ts:259-264` rifatto dentro una RPC.*
- [ ] **Passo 4 — applica** (`npx supabase db push --linked --yes`), poi **FASE 6b**: `gen types` → `tsc`.
- [ ] **Passo 5 — salva.** ⚖️ **D318: `git add <percorsi>` nominando i TUOI file, MAI `git add -A`.**
  Il titolo nomina il compito (`feat(db): …`), perché il Task A è finito dentro salvataggi che non lo
  nominavano e la rintracciabilità si è persa.

---

## 🛑 LE REGOLE DI CASA CHE VALGONO QUI

- **R-E2 — un difetto FUORI dal tuo mandato si RIFERISCE, non si corregge di nascosto.** Ne hai già uno
  noto da non toccare: `numero_prescrizione` esiste **in due posti** (`lavori` e `lavori_prescrizioni`).
  Tu correggi **quello su `lavori`**, che è lo stampato. L'altro va in coda.
- **Cerca attivamente dove questo brief e il piano SBAGLIANO**, e scrivilo. Gli otto task del piano
  precedente hanno trovato **otto difetti su otto**, e le misure di stamattina ne hanno già trovati tre in
  questo. Il piano non è prosa: è codice non ancora eseguito.
- **Il file di migration NON è la prova: la verità è il catalogo vivo** (`pg_get_functiondef`, `proacl`).
  Dopo `db push`, **rileggi dal catalogo** ciò che hai scritto.
- **Niente `rm -rf`** fuori dalle aree temporanee (c'è una guardia: `/usr/bin/trash`).
- **R-P4:** dopo il primo rosso, abbozzo inerte e **conta** quante asserzioni si accendono (`N su M`).
  ⚠️ Qui il «rosso» sono le sonde SQL: la sonda 6 dev'essere **rossa prima** che la RPC esista.
- **Il resoconto** va in `.superpowers/sdd/atto-unico-task-b-report.md`, e dice anche **cosa NON hai
  fatto**.
