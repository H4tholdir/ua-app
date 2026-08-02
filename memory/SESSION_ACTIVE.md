# Sessione attiva — P7: la FASE 1 è iniziata, spec e PIANO pronti

🚪 **PUNTO DI RIPRESA: `docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md`** — piano
**scritto e auto-rivisto**, 4 task. Spec: `docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md`.
⏩ **D149: la spec è passata al piano SENZA rilettura a freddo** — offerta e **saltata per scelta** («*procedi con
il piano*»). 🔑 Diverso da **P19-a**, dove la rilettura era stata **chiesta e la risposta non era arrivata**.
🔎 **Il piano porta i tre registri (R-P1 · R-P2 · R-P6)** e ha già trovato **due difetti di sé stesso**: gli errori
di compilazione attesi sono **54, non 55** (in `dpa-route.test.ts` la funzione è **finta**: si rompe a prove, non a
compilazione) · e il contesto finto di quel file **porta già** `userId: 'user-1'`, quindi nessun mock da toccare.
⏭️ **Prossimo passo: esecuzione**, un task alla volta a esecutore fresco (R-E1). 🛑 **Il Task 1 Step 6 si FERMA e
aspetta Francesco:** applicare una migration su un ambiente vero è una sua decisione, non una mancanza di password.

🔨 **La FASE 1 non è più ferma.** Francesco ha scelto **P7** (**D146**) fra tre partenze presentate col **costo
reale ricalcolato**: l'handoff chiamava P17 «la più breve», **è la più lunga** (pagina in produzione → §0B +
gate L2); la correzione di `DpaTemplate.tsx:210` è **mezza giornata**, non mezz'ora (scelta normativa → panel).

🛡️ **D147** — P7 = **cancello** (regola di riga a **sola lettura**, modello `sdi_receipts`) **+ traccia** (da
**dieci** tabelle sorvegliate a **undici**). La guardia «una firma non si riscrive» → **P19-b**.
👤 **D148** — la traccia deve dire anche **CHI**: colonna `emesso_da`, e il parametro che la porta è
**OBBLIGATORIO** (~60 punti nei test da aggiornare, prezzo accettato).

📏 **Dieci misure riverificate OGGI**, `read_only:true` — la lettura che l'altra sessione trovò bloccata dal
filtro stavolta è **passata**: **2 righe, 0 firmate** (finestra ancora gratuita) · regola `cmd=ALL`,
`with_check` **nullo** · `audit_log` **senza chiavi esterne** e `admin_delete_laboratorio` **SECURITY DEFINER
di `postgres`** → nulla si rompe.

🔴 **DUE trappole fuori mandato → P25 · P26:** il registro **non sa dire chi** (**1.587/1.588** senza attore) ·
la **DdC ha già** la colonna «chi ha premuto» e **non la riempie mai** (5 righe, **0**) — è la ragione per cui
il parametro nasce obbligatorio.

🔍 **La spec è stata RIVISTA prima della rilettura, e portava tre difetti** (`a211173a`): la chiave esterna di
`emesso_da` non dichiarava cosa fare quando l'utente sparisce (ora **nuda e provata**: 18 su 18 così, e in
`admin_delete_laboratorio` le righe DPA se ne vanno alla **155**, gli utenti alla **163** — ordine **portante**) ·
**T3 induceva il difetto che P7 chiude** (sul **riuso** la funzione non riscrive: ora T3a + **T3b «il chi resta
invariato»**) · T4 era una formalità, ora si prova con `emesso_da` **davvero riempito**.

🔄 **Chiusa la voce 🔴 4 dell'handoff:** V1.9 e V2.0 non portano più il trigger «Filippo». E la roadmap diceva
«P1-P24, nessun buco» in **due** punti mentre ne conteneva **26** — stesso difetto, corretto.
🛑 **Zero righe di codice applicativo.** 📎 **148** decisioni in **52** tornate; la prossima è **D149**.
