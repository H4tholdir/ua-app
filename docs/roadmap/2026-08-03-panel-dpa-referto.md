# Referto del panel — il contratto sul trattamento dei dati (riga 10), e le due domande di D123

**Data:** 3 agosto 2026 · **Chiesto da:** D124 (Francesco sceglie la riga 10 col panel **allargato** alle domande di D123)
**Panel:** tre advisor con lenti diverse e **mandato di confutare** — ① norma MDR sui dispositivi su misura ·
② GDPR e contratto · ③ prodotto e ciclo di vita del dato.
**Stato:** ⛔ **nessuna riga di codice né di template è stata toccata.** Il panel decide prima.

> 🔑 **La riga da tenere, se si legge una cosa sola.** La premessa che ha guidato **D62, l'audit del 03/08,
> la riga 10 della roadmap e l'handoff** — «l'app cancella le foto mentre il contratto promette dieci anni» —
> **descrive un caso che il codice non permette**. E al suo posto, cercando, si è trovato un difetto **più
> grande**: quel contratto **afferma ai dentisti misure di sicurezza che il prodotto non ha**.

---

## 0. Che cosa è provato, e da chi

**Riverificato DA ME, aprendo i file o il testo di legge** (non «lo dice il panel»):

| Fatto | Prova |
|---|---|
| La cancellazione di una foto è **rifiutata** se il lavoro è consegnato | `src/app/api/lavori/[id]/immagini/[imgId]/route.ts:200-205` → 409 «Lavoro già consegnato — non è più possibile eliminare le foto». Il blocco nasce col commit `98fa1e43` del **30/07**, prima della cancellazione fisica (`cdb96f6a`, stesso giorno) |
| **Allegato XIII punti 1-2-4**, testo consolidato italiano | scaricato per intero da EUR-Lex, CELEX `02017R0745-20260101` — verbatim in §2 |
| **Art. 52(8)** verbatim, **entrambi i commi** | stessa fonte — verbatim in §2 |
| Gli stati del lavoro sono **NOVE**, non sei | `supabase/migrations/005_v1_foundation.sql:31-37` (ultima che tocca `lavori_stato_check`); `supabase/schema.sql:917-920` è una **baseline stantia** |
| `consegnato` è **terminale per comportamento** | `src/lib/lavori/transizioni.ts:8-16` — zero transizioni uscenti; `:6` dichiara che non è nemmeno una destinazione |
| Il PATCH del lavoro **non ha alcun cancello di stato** | `src/app/api/lavori/[id]/route.ts` legge solo `incluso_in_fattura, tecnico_id, numero_lavoro`; `paziente_id` (`:204`), `tipo_dispositivo` (`:179`), `descrizione` (`:180`) restano scrivibili |
| **Autenticazione a più fattori: NON esiste** | `grep -riE "\bmfa\b\|two.factor\|2fa\|totp\|secondo fattore" src` → **0 riscontri** |
| **Il registro non registra le letture, e copre due sole tabelle** | `supabase/migrations/20260704120000_b3_cicli_fasi_audit.sql:7,11` → trigger su `cicli_produzione` e `fasi_produzione`, e basta |
| **Nessuna pseudonimizzazione** del nome paziente | `supabase/schema.sql:891` (`paziente_nome_snapshot TEXT`, in chiaro) e `:1011` (indice full-text GIN che lo include) |
| La DdC emessa **non si rifà** | `src/lib/pdf/generate-ddc.ts:98-107`, `.neq('stato','annullata')` |
| Il DPA **non è persistito** | `src/lib/pdf/generate-dpa.ts` + `src/app/api/clienti/[id]/dpa/route.ts` — `grep insert\|upsert` → **0** |

**NON verificabile da qui, e dichiarato:** lo stato del vincolo `lavori_stato_check` **applicato al database
vero** · il flag pubblico/privato del contenitore `documenti` su Storage (nessuna migration lo crea; il
collegamento Supabase non è autorizzato in questa sessione) · le misure infrastrutturali del fornitore
(cifratura a riposo, backup replicati).

---

## 1. La premessa che è caduta

**D62 (30/07)** scriveva: «*Cancellare fisicamente prima dei dieci anni sarebbe inadempimento del nostro
stesso DPA*», e da lì l'audit del 03/08, la riga 10 della roadmap e la §0 dell'handoff hanno tutti descritto
un conflitto **vivo** fra il contratto e il codice.

**Il conflitto non esiste**, e per una ragione sola: la finestra in cui una foto si può cancellare **si chiude
esattamente dove l'orologio dei dieci anni comincia**. Il contratto fa decorrere i dieci anni «*dalla consegna
di ciascun dispositivo*» (`DpaTemplate.tsx:149`); la rotta rifiuta la cancellazione da `consegnato` in poi
(`route.ts:200-205`). Le due cose non si sovrappongono mai.

🔑 **Perché era sfuggito:** D62 è stata presa **lo stesso giorno** in cui quel blocco entrava nel codice, e
nessuno dei tre documenti che l'hanno ripetuta è andato a chiedersi *se* quella cancellazione fosse
raggiungibile dopo la consegna. È lo stesso difetto che l'audit del 03/08 aveva appena finito di descrivere:
**la concordanza fra documenti non è una prova**.

⚠️ **Un residuo vero resta, ed è di prodotto, non contrattuale:** l'annullo della consegna riporta il lavoro a
«pronto» e **riapre la finestra di cancellazione senza limite di tempo** (`api/lavori/[id]/annulla-consegna/route.ts:138`).

---

## 2. La norma, col testo in mano — e una ratifica del progetto da emendare

### Verbatim, EUR-Lex, MDR consolidato al 01/01/2026, CELEX `02017R0745-20260101` (versione italiana)

- **Art. 10(4):** «I fabbricanti di dispositivi **diversi dai dispositivi su misura** redigono e tengono aggiornata una documentazione tecnica per tali dispositivi.»
- **Art. 10(5):** «I fabbricanti di dispositivi su misura redigono, tengono aggiornata e mettono a disposizione delle autorità competenti la documentazione conformemente all'**allegato XIII, punto 2**.»
- **Art. 10(6):** «…i fabbricanti di dispositivi, **diversi dai dispositivi su misura** od oggetto di indagine, redigono una dichiarazione di conformità UE ai sensi dell'articolo 19…»
- **Art. 10(8):** «I fabbricanti conservano **la documentazione tecnica, la dichiarazione di conformità UE** e, se del caso, **una copia del certificato pertinente rilasciato a norma dell'articolo 56** … per un periodo di almeno 10 anni dall'immissione sul mercato dell'**ultimo** dispositivo oggetto della dichiarazione di conformità UE. Per i dispositivi impiantabili, il periodo è di almeno 15 anni…»
- **Art. 2(28):** «"immissione sul mercato": la **prima messa a disposizione** di un dispositivo … sul mercato dell'Unione»
- **Art. 52(8), primo comma:** «I fabbricanti di dispositivi su misura seguono la procedura di cui all'allegato XIII e redigono la **dichiarazione** prevista al punto 1. di detto allegato **prima dell'immissione** di tali dispositivi sul mercato.»
- **Art. 52(8), secondo comma:** «In aggiunta alla procedura applicabile a norma del primo comma, i fabbricanti di **dispositivi su misura impiantabili appartenenti alla classe III** sono soggetti alla valutazione della conformità di cui all'allegato IX, capo I.»
- **Allegato XIII, punto 2:** «Il fabbricante si impegna a tenere a disposizione delle autorità nazionali competenti la documentazione che indica il luogo o i luoghi di fabbricazione e che consenta di formare una comprensione della progettazione, della fabbricazione e delle prestazioni del dispositivo…» — 🛑 **nessun termine**.
- **Allegato XIII, punto 4:** «**La dichiarazione di cui alla parte introduttiva del punto 1** è conservata per un periodo di almeno **10 anni** dalla data di immissione sul mercato del dispositivo. Nel caso di dispositivi impiantabili, il periodo in questione è di almeno **15 anni**. Si applica l'allegato IX, punto 8.»

### Che cosa ne discende

1. **L'obbligo dei 10/15 anni cade sulla DICHIARAZIONE, e su nient'altro.** Non sulle foto, non sulle
   impronte, non sulle immagini cliniche. **Nessuna norma MDR impone di conservare una foto clinica per dieci
   anni.**
2. **La base ratificata dal progetto — «Art. 10(5) + Allegato XIII punto 4» — salda due obblighi diversi.**
   Il 10(5) rimanda al **punto 2**, che impone **disponibilità senza termine**; il termine sta nel **punto 4**
   e riguarda la **dichiarazione**. La correzione del 29/07 aveva ragione a togliere l'Art. 10(8); ha sbagliato
   il pezzo che gli ha messo al posto. 📍 Quella citazione vive in **`ua-app/CLAUDE.md` §9**, nel verbale
   `docs/roadmap/2026-07-29-ondata-b-panel-validazione.md` §5-ter e nella riga 8 della sezione «I documenti
   che escono dal laboratorio» di `docs/roadmap/ROADMAP-UFFICIALE.md`, che la dava per **contraddizione non
   risolta**. ➡️ **È una ratifica da emendare: decisione di Francesco.**
3. **La decorrenza scritta nel contratto è GIUSTA.** Il punto 4 dice «dalla data di immissione sul mercato
   **del dispositivo**» — singolare; la formula «dall'ultimo dispositivo» è quella dell'Art. 10(8), cioè della
   produzione in serie, e per un su misura sarebbe **sbagliata**. Con l'Art. 2(28), «dalla consegna di ciascun
   dispositivo» è corretto e si tiene.
4. **`DpaTemplate.tsx:146` (Art. 52(8)) è GIUSTA** e non si tocca — al più si rifinisce citando anche
   l'Allegato XIII punto 1, perché il MDR chiama quel documento «dichiarazione», non «dichiarazione di
   conformità UE».
5. **`DpaTemplate.tsx:147` è SBAGLIATA** — è la quarta riga, trovata il 03/08 rileggendo il template per
   intero: cita l'**Art. 10(4)**, riservato ai dispositivi «diversi dai su misura», e chiama «Fascicolo
   Tecnico» una cosa che per un su misura non esiste. Base giusta: **Art. 10(5) + Allegato XIII punto 2**.
6. ⚠️ **Un limite del nostro ragionamento, dichiarato.** Non si può dire che l'Art. 10(8) sia «senza oggetto»
   in assoluto: il suo terzo oggetto — la copia del certificato ex Art. 56 — **esiste** per i dispositivi su
   misura **impiantabili di classe III** (Art. 52(8), secondo comma). Che un laboratorio odontotecnico non ci
   arrivi mai dipende dalla Regola 8 dell'Allegato VIII (ciò che è destinato a essere collocato **nei denti**
   scende di classe): **non verificato** per i casi di confine.

---

## 3. Il difetto più grande, che non stavamo cercando

Il contratto che i dentisti scaricano **afferma sei misure di sicurezza**. Tre sono **false**, misurate:

| Affermazione (`DpaTemplate.tsx`) | Esito |
|---|---|
| `:176` «Autenticazione a più fattori per l'accesso al sistema gestionale» | 🔴 **FALSA** — zero riscontri in `src/`. Le passkey esistono ma sono un **accesso alternativo**, non un secondo fattore |
| `:177` «Pseudonimizzazione dei dati paziente (GDPR Art. 25)» | 🔴 **FALSA** nel senso dell'Art. 4(5): è **mascheramento in lettura per ruolo**; il nome sta **in chiaro** nella riga del lavoro (`schema.sql:891`) ed è dentro un indice full-text (`:1011`) |
| `:180` «Log immutabile di **tutti gli accessi** ai dati sanitari» | 🔴 **FALSA due volte** — registra le **modifiche**, non gli accessi, ed è agganciato a **due sole tabelle** (`cicli_produzione`, `fasi_produzione`): né `lavori` né `pazienti` |
| `:175` cifratura in transito e a riposo | 🟡 **non verificato** — dipende dal fornitore |
| `:178` accesso per ruolo (RBAC) | 🟢 **vera**, con un'eccezione: il DELETE di una foto **non ha cancello di ruolo** (segnalato dal panel, `immagini/[imgId]/route.ts:146-147`) |
| `:179` backup giornaliero con replica UE | 🟡 **non verificato** — dipende dal piano Supabase |

**E il difetto formale che sovrasta tutto** (valutazione del panel ② — *attribuita, non è una mia
conclusione di diritto*): **non esiste un contratto dimostrabile con nessuno.** Il documento si rigenera dal
vivo, non viene persistito, le colonne `firmato_at` / `firmato_da` / `documento_url` (`schema.sql:2855-2857`)
non hanno scrittori, e `template_versione` (`:2854`) non viene mai valorizzato. L'Art. 28(9) GDPR vuole la
forma scritta e l'Art. 5(2) mette l'onere della prova in capo al **Titolare**, cioè al dentista.

🔑 **Ed è questo il fatto che fa cadere «basta correggere il testo»:** il numero del documento è
`DPA-{anno}-{primi 8 caratteri dell'id cliente}` — **stabile per cliente e per anno**. Due scarichi con testo
**diverso** portano **lo stesso numero**, e lo stesso accordo cambia numero a gennaio. Finché è così, **nessuno
può sapere quale testo ha in mano un dentista**.

Il panel ② segnala inoltre che la catena dei sub-responsabili è descritta male: Supabase, Vercel e Resend sono
sub-responsabili **di UÀ**, non del laboratorio, e **UÀ stessa non è dichiarata** pur essendo nominata a
`:175`; mentre Agenzia delle Entrate/Sogei e Ministero della Salute **non sono** sub-responsabili (sono
titolari autonomi per obbligo di legge) — ed è il **seed del progetto** a sbagliare su questo
(`supabase/schema.sql:2926-2927`), non il contratto.

---

## 4. Le domande di D123, e la risposta che il codice dà

**«UÀ oggi non è né rigido né flessibile: è rigido sul foglio e molle sul dato.»** È il contrario di ciò che
D123 chiede, ed è misurato:

- **Molle sul dato:** il PATCH del lavoro non ha **nessun** cancello di stato. Dopo che la DdC ha cristallizzato
  descrizione, tipo di dispositivo, denti e paziente, quei campi **restano scrivibili** — `paziente_id`
  compreso: si può ripuntare un lavoro consegnato su un altro paziente mentre il foglio emesso ne nomina un
  altro.
- **Rigido sul foglio:** la DdC emessa non si rigenera, e il buono di consegna nemmeno.
- **Il rifacimento NON è la riapertura:** crea un **secondo dispositivo** con numero proprio e lascia
  l'originale consegnato con la sua dichiarazione valida (`20260728103000_rifacimento_clona_denti_colore.sql:44-46`
  lo dichiara e lo prova). Sul piano MDR è la lettura più difendibile — due dispositivi, due dichiarazioni — ma
  non corregge un errore di battitura.
- **Una trappola trovata dal panel ③:** se la consegna fallisce **dopo** la generazione della DdC (lo Step del
  buono o il cambio di stato, `src/lib/consegna/orchestrate.ts:281` e `:300-302`), la riga della DdC **resta**
  e il lavoro torna `pronto`; ma l'unico strumento che porta una DdC ad `annullata` **rifiuta se il lavoro non
  è consegnato** (`20260710091500…:66`). Il documento diventa **non annullabile**, e il tentativo successivo
  spedisce quello vecchio marcando `conformato = true`.
- **Il costo di fare la cosa giusta è minore del previsto:** la macchina «annulla e rigenera» **esiste già**
  (decisione del 10/07, indice unico **parziale** che ammette N annullate + 1 viva). Il costo vero è la
  **numerazione**: ogni rigenerazione brucia un progressivo. ➡️ **La domanda da portare al panel non è «si può
  rifare», è «la serie deve restare senza buchi?»**

---

## 5. Che cosa serve a Francesco per decidere

1. **Emendare la base ratificata** «Art. 10(5) + Allegato XIII punto 4» in tre documenti, incluse le sue
   istruzioni permanenti (`ua-app/CLAUDE.md` §9). Chiude anche la riga 8 di «I documenti che escono dal
   laboratorio», oggi «non ratificata né scartata».
2. **L'ampiezza della riscrittura del contratto:** solo le citazioni e la conservazione (piccola, un template),
   oppure la riscrittura piena proposta dal panel ② — ruolo doppio del laboratorio, catena dei
   sub-responsabili con UÀ dichiarata, clausole Art. 28 mancanti, e **persistenza + versione + numero
   progressivo per emissione**, che è ciò che rende il contratto dimostrabile.
3. **Il contenitore `documenti` su Storage è pubblico o privato?** Serve il suo occhio sul pannello Supabase:
   il repo non può dirlo e il collegamento non è autorizzato qui.

---

## 6. Ritrovamenti fuori mandato — riferiti, NON corretti (R-E2)

Tutti con destinazione, come vuole il sesto controllo della guardia.

| # | Cosa | Destinazione |
|---|---|---|
| 🔴 1 | **La DdC orfana dopo un fallimento parziale della consegna** non è annullabile, e il tentativo dopo spedisce il foglio vecchio marcandolo conforme | sezione «I documenti che escono dal laboratorio» di `docs/roadmap/ROADMAP-UFFICIALE.md` |
| 🔴 2 | **Il PATCH del lavoro non ha cancello di stato**: `paziente_id`, `descrizione`, `tipo_dispositivo`, denti restano scrivibili dopo l'emissione della DdC | stessa sezione |
| 🟠 3 | **Il DELETE di una foto non ha cancello di ruolo** | stessa sezione |
| 🟠 4 | **L'annullo della consegna riapre la finestra di cancellazione senza limite di tempo** | stessa sezione |
| 🟠 5 | **`getPublicUrl` su un contenitore dichiarato privato** (`generate-ddc.ts:195`, `generate-buono.ts:55` contro `20260705200000…:14`) — **non risolvibile dal repo**: serve il pannello Supabase | stessa sezione |
| 🟡 6 | **`supabase/schema.sql` è una baseline stantia** sugli stati del lavoro: chi la legge crede a sei stati mentre il vincolo vivo ne ammette nove | stessa sezione |
| 🟡 7 | **Il seed chiama sub-responsabili AdE/Sogei e Ministero della Salute** (`supabase/schema.sql:2926-2927`), che sono titolari autonomi | stessa sezione |
| 🟡 8 | **Due cancelli che non si parlano sul rifacimento**: la rotta blocca solo `annullato`, la RPC ne rifiuta tre e solleva → arriva all'utente come 500 | stessa sezione |

---

## 7. Metodo — che cosa ha funzionato

**Il panel ha corretto ME, non solo il documento.** Avevo provato «`consegnato` è l'ultimo stato» con
`supabase/schema.sql`, che è una fotografia vecchia: gli stati vivi sono nove. La conclusione reggeva, la
prova no — ed è esattamente il caso che la regola del panel esiste per intercettare. Le tre righe emendate
portano la correzione **con le sue parole**, in `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`
(D123), in `docs/roadmap/ROADMAP-UFFICIALE.md` e in `memory/MEMORY.md`.

**E il panel non è stato preso per buono.** Il panelista ② ha ripetuto la base ratificata «Art. 10(5) +
Allegato XIII punto 4» come cosa chiusa; il panelista ① è andato al testo; io ho scaricato il testo
consolidato e ho letto **le stesse parole**. Non è un pareggio fra due pareri: è una lettura contro una
citazione di seconda mano.
