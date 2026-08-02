# Sessione attiva — P7: la FASE 1 è iniziata

🚪 **PUNTO DI RIPRESA: `docs/superpowers/specs/2026-08-04-p7-registro-dpa-cancello-traccia-design.md`** — spec
**APPROVATA in sessione**, in attesa della **rilettura di Francesco**. Poi FASE 4 (piano), poi codice.

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

🔄 **Chiusa la voce 🔴 4 dell'handoff:** V1.9 e V2.0 non portano più il trigger «Filippo».
🛑 **Zero righe di codice applicativo.** 📎 **148** decisioni in **52** tornate; la prossima è **D149**.
