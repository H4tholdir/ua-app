# Sessione attiva — il cancello saltato, percorso a valle

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-04-dpa-registro-chiusura-handoff.md`** — resta il documento
maestro. La sua voce 🔴 1 è **chiusa** da questa sessione (v. sotto); la 🔴 2 è la prossima cosa.

✅ **FATTO: il GATE ESTETICO L2 (FASE 9b) sulla superficie DPA**, la voce 🔴 1 dell'handoff del 4 agosto.
Referto: `docs/design/audit-ui-ux/LIVELLO-2-2026-08-04-dpa-scheda-cliente-ESITI.md` · scatti e misure:
`docs/design/screenshots/2026-08-04-dpa-scheda-cliente/` (**45 file**). 12 sezioni × 2 stati ×
390·768·1280 × chiaro·scuro. 🛑 Il referto dichiara in testa di essere un **RIMEDIO**, non un cancello
che ha retto. **Esito ✅ 7 · ⚠️ 2 · ❌ 2**, nessuno corretto di sfuggita (R-E2).

🔑 **Il modello che mancava:** checklist v3 su pagina legacy v2.3 → tre criteri **N/A con la ragione
scritta accanto** (segnarli ❌ farebbe violare la migrazione per-route), gli altri nove a peso pieno,
**contrasto compreso**.

✍️ **D134 — P16 SI DEFERISCE** all'ondata di migrazione a v3 della route `clienti/[id]`. Francesco ha
scelto fra tre col gate in mano: **(A)** allineare i token a v3 · **(B) esclusa dalle misure** ·
**(C) deferire** ← scelta. 🔑 **Il prezzo è scritto:** restano illeggibili in scuro **un impegno verso
lo studio dentistico** e **il numero che rende dimostrabile l'emissione**. ✅ Ragionevole perché
l'ondata di migrazione porta i valori v3 **per costruzione**. ⚠️ Nodo per quell'ondata: `#928778` sta a
**4,06 sull'elevato `#2C2A27`**. 📌 Se la migrazione slitta, si riapre (A) — col suo panel.
**Verbale: 134 decisioni in 46 tornate.**

🆕 **Aperte:** **P17** (lo scarico che fallisce mostra `{"error":"…"}`, zero elementi interattivi) ·
**P18** (idratazione disallineata su `PortaleLinkButtons`, fa divergere il link mandato al dentista).

✅ **FATTO ANCHE: il panel normativo su D128**, la voce 🔴 2 dell'handoff. Referto:
`docs/roadmap/2026-08-04-panel-d128-referto.md`. Tre advisor a mandato disgiunto, tutti e tre
**REGGE CON CONDIZIONI**. 🔄 Il testo vero dice «**in forma scritta**», non «per iscritto» — è
l'espressione su cui il **CAD art. 20 co. 1-bis** costruisce tutto. ✅ Davanti al Garante **regge**;
🛑 in causa, se il dentista nega, **non regge da sola** (il flusso non identifica nessuno).
🔴 **P7 RIVALUTATA da 🟢 a 🔴 — precondizione dell'ondata 2:** il registro che dovrà contenere la prova
è **riscrivibile dalla parte che la prova deve vincolare**, e la finestra per ripararlo senza toccare
prove vere è **adesso** (2 righe, **0 firmate**).

✍️ **D135 — Francesco ha deciso DUE cose su tre.** **(a)** Il modo di firmare **resta l'accettazione
tracciata**, con le condizioni C1-C11 del referto. **(b)** **Si accetta l'ORDINE: prima le correzioni di
TESTO, poi la firma** — le quattro si fanno in un colpo solo, perché ognuna da sola sposterebbe la
versione, e oggi costano **zero** (0 dentisti hanno accettato).

✍️ **D136 — C1 CAMBIA NATURA: non è più «riscrivere la frase», è COSTRUIRE L'ANELLO.** Francesco ha
chiesto «*non possiamo fare la stessa cosa con UÀ?*» e ratificato: **UÀ si dà Condizioni di Servizio col
contratto sui dati incorporato, accettate all'abbonamento** — il meccanismo dei suoi fornitori.
🔑 **Non è che «non serve firmare»: la firma è quella delle condizioni.** UÀ può farlo solo perché oggi
**non ha condizioni**. Tre pezzi: ① **testo** nuovo **coi ruoli rovesciati** (laboratorio = **titolare**,
UÀ = **responsabile**) — ⚠️ dati sanitari, **serve un occhio legale** · ② **il momento in cui si
accetta**, che non esiste · ③ **la traccia**, ✅ **già esistente** (macchina dell'ondata 1; `provato:` il
vincolo prevede già `'sub_responsabile'`, righe **zero**). ⏱️ **ADESSO perché** `provato:` **3 laboratori,
tutti di prova**: nessuno da rincorrere.
🛑 **PANEL IN CORSO**, 3 advisor a mandato disgiunto: **forma** del click-wrap (artt. **1341-1342 c.c.**,
clausole che vogliono approvazione specifica) · **contenuto** e ciò che UÀ **NON deve promettere**
(monito: **D126**) · **dove si attacca** nel prodotto (onboarding, Stripe, cambio di versione).

🔴 **PANEL D136 COMPLETO — tre referti su tre, tutti REGGE CON CONDIZIONI.** Referto:
`docs/roadmap/2026-08-04-panel-d136-referto.md`. **Il meccanismo regge, il MOMENTO no.**

🔴 **PRIMA DI TUTTO, e non c'entra col contratto: IL DATABASE DI PRODUZIONE NON HA COPIE DI SICUREZZA.**
`provato:` Management API → `pitr_enabled:false`, **`backups:[]`**. Oggi il danno sarebbe zero (solo dati
di prova), **ma è il rischio che diventa principale il giorno del primo laboratorio vero**, e **si compra,
non si scrive**. → **P20**.

**① Il MOMENTO è sbagliato** (verificato nel codice): laboratorio nasce `'trial'`
(`admin/labs/route.ts:86`), **in prova tutte le scritture passano** (`lab-guard.ts:55-58`) → entrano dati
veri di pazienti **senza contratto**. Giusto: **il primo accesso**, dentro `accept_invite_atomic`.

**② CASSAZIONE 20945/2026** (20 giugno, **posteriore alla mia conoscenza**): fra professionisti, online,
**la sola spunta NON basta** per una clausola vessatoria — serve **firma elettronica anche semplice**
(esempio della Corte: **codice usa-e-getta per SMS/email**). ⚠️ PDF della Corte **non apribile**; riscontro
**verbatim** su fonte indipendente + 9 conferme. 🔑 **ASIMMETRIA:** l'art. 1341 co. 2 colpisce **solo le
difese di UÀ** (tetto, sospensione, rinnovo, foro); **il DPA non è vessatorio e sopravvive** → in causa UÀ
resta **legata a ogni dovere e priva di ogni difesa**, **senza tetto**, con dati sanitari di mezzo.
➡️ condizioni + DPA con un clic; **le difese di UÀ in un secondo passaggio separato**.

**③ La macchina dell'ondata 1 NON si riusa** (catalogo vivo): il vincolo pretende
`dentista_id NOT NULL AND tipo_controparte='dentista'`; l'indice anti-doppione è **sul dentista** → col
dentista NULL **la deduplicazione muore in silenzio**. **Tabella nuova, in sola aggiunta.**

**④ Due difetti nuovi, misurati:** **P21** cancellare un laboratorio **fabbrica una copia di ciò che
cancella** (`provato:` 15 righe orfane di 5 laboratori morti; **82 su 82** cancellazioni di lavori portano
**il nome del paziente**) · **P22** UÀ entra nei dati di un cliente **con l'identità del cliente**, senza
traccia.

🔴 **DA DECIDERE (referto §7):** ① si sposta il momento al primo accesso? ② si accetta il secondo
passaggio con codice usa-e-getta? ③ **L1 copie di sicurezza · L2 cancellazione vera · L3 tracciare gli
accessi di UÀ** vanno **prima** della prima accettazione? 🛑 **L1 va comunque e subito.**

🔴 **LA VOCE È P19.** Francesco: «*no, oggi non firma niente*».
**UÀ non ha un contratto sulla protezione dei dati con i laboratori che la usano**, e il documento che
quei laboratori consegnano ai dentisti dice che ce l'ha (`DpaTemplate.tsx:210`). Stessa classe di
difetto di **D126** — ma il buco è **di UÀ come servizio**, non del laboratorio di Francesco: ogni
laboratorio abbonato affida a UÀ **dati sanitari**, quindi ciascuno ha bisogno del **proprio** accordo.
**C1 è un documento da produrre**, e blocca l'inizio dell'ondata 2.

✅ **Catena a valle A POSTO**, verificata alla fonte su richiesta di Francesco: i DPA di **Supabase**
(v1, 01/08/2026), **Vercel** (31/03/2026) e **Resend** (31/12/2025) si perfezionano **automaticamente**
con l'accettazione delle condizioni — nessuna casella da spuntare. 🛑 Non verificabile dalle API (la
Management API di Supabase non ha endpoint legali: **404**): la prova sta nel testo dei documenti.
⚠️ **Due code:** quale **piano Vercel** è in uso · l'organizzazione Supabase è sul piano **`free`**, e
l'Art. 32(1)(b)(c) nomina **disponibilità e resilienza** — osservazione, non ritrovamento del panel.

📌 **PUBBLICATO** su autorizzazione di Francesco: `7d6ee54c` → **`7c4a36cb`**, quattro salvataggi (gate
estetico L2 · D134 · referto del panel su D128 · tre correzioni di rigore). **Nessuna riga di codice
toccata: sono tutti documenti.**
⚠️ L'orologio della macchina dice 2 agosto; i documenti seguono la serie del **4 agosto**.
