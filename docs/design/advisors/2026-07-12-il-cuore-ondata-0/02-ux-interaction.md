# Parere UX / Interaction Design — DS v3 «Il cuore», Ondata 0

**Advisor:** Interaction/UX Designer senior (mobile-first, utenti non-tech) · **Ruolo:** consulente indipendente, non gate
**Data:** 11/07/2026 · **Materiale:** worktree `mockup-il-cuore-ondata-0`, 6 HTML + screenshot 3 viewport × 2 temi
**Lente:** percorsi quotidiani al banco, modello mentale, ergonomia 390px, stati mancanti prima del React

---

### Giudizio complessivo — **voto UX 8/10**

È lavoro maturo, non un abbozzo. Le tre metriche-sentinella di §13 sono **strutturalmente rispettate** già sui mockup: consegna urgente in 3 tocchi dalla home, nuovo lavoro in ≤4, e la scheda risponde a «dov'è il lavoro» a colpo d'occhio.

**Conteggio tocchi delle tre azioni quotidiane (la lente le nomina esplicitamente):**
- **Creare un lavoro — 4 tocchi, verificato nel codice.** `wizard.html` (nota budget): tile dentista (1, auto-avanza) → tile tipo (2, auto-avanza) → chip «Va bene ✓» sulla consegna (3) → primario «Fotografa impronta e prescrizione» (4). Il Passo 3 paziente è tutto «Salta» e fuori dal conteggio. Le tile avanzano da sole: nessun «Continua» intermedio nel percorso minimo. ✓ ≤4.
- **Consegnare l'urgente — 3 tocchi.** home → pila rossa (1) → `CONSEGNA` inline (2) → `DialogConferma` (3). ✓ ≤3.
- **Confermare un arrivo — 2 tocchi per *raggiungere* il wizard di conferma, ma il wizard non è disegnato in Ondata 0.** pila blu (1) → «Conferma» sulla card (2) → [wizard di conferma con data proposta + minimi MDR]. Il corpo del flusso è **volutamente rinviato all'Ondata 2** (`pila-aperta.html:97,334` — «solo accennato, Ondata 2»). È una scoping-decision documentata, non una svista; ma va detto che **una delle tre azioni quotidiane non sarà esercitabile per intero nel collaudo di Francesco** (v. R2). La disciplina L1/L3 è alta e visibile: numeri display giganti + parole del banco + colore + posizione fissa fanno passare il *test in bianco e nero* su ogni schermata (home, pila, scheda). La honestidad della `CardUAHaFatto` («Fattura **in preparazione**», non «fatta») è esattamente L5 fatto bene ed è raro vederlo rispettato.

Non è un 9-10 per tre ragioni concrete, tutte risolvibili: (1) mancano dalla dotazione i **quattro stati non-felici** — vuoto, offline, errore, caricamento — e uno di questi (fallimento della consegna, che è fiscale) è il singolo stato più pericoloso dell'intera app; (2) il frame **«Fatto!» del wizard è l'unico punto dove due decisioni convivono** su una vista, in tensione con L1; (3) le **prove esterne non hanno casa nella home**, gap che la spec stessa conosce e che il collaudo #3 è progettato per far esplodere.

Nessuno di questi è, a mio avviso, un blocco insormontabile: sono fix mirati, non ridisegni. Il cuore del sistema è solido.

---

### Punti forti

1. **Consegna urgente in 3 tocchi, e sono i 3 giusti.** `pila-aperta` (frame rossa): home → tap pila rossa (1) → `CONSEGNA` inline sulla prima card (2) → `DialogConferma` con «Corona n.147 → Dr. Esposito» a corpo gigante (3). Il doppio tap distinto + dentista/numero enormi nel dialog rende la consegna accidentale quasi impossibile senza aggiungere un «Sei sicuro?» generico. Best practice applicata correttamente.

2. **Il modello delle 3 pile è leggibile al primo colpo perché le parole fanno il lavoro, non il colore.** `home-390-light`: «DA CONSEGNARE OGGI / SUL BANCO / APPENA ARRIVATI» sono parole del banco (L2), il numero display 52px è la prima cosa che l'occhio prende, il colore è rinforzo terziario. Un over-50 che non ha mai visto l'app capisce le tre pile senza spiegazioni. Ordine sempre fisso = memoria muscolare.

3. **Il sheet «Prima di consegnare» è il pezzo di UX migliore del set.** `consegna` (frame bloccanti): «Due cose da sistemare» con ciascun bloccante *tappabile per risolvere* («Manca il lotto della zirconia → Registralo»). Trasforma un muro normativo in una lista d'azione — l'opposto del dialog «errore, riprova». Passa L6 e non spaventa.

4. **Modifica per-riga a sheet = L1 da manuale.** `scheda-lavoro-768` (frame modifica): tap sulla riga consegna → sheet con UNA domanda «Quando va consegnata?» + chip rapidi Oggi/Domani/Lun 13/Scegli. Morte pulita del form multi-tab, zero ambiguità su cosa fare.

5. **Il desktop 1280 è un vero terzo progetto, non uno stiramento.** `home-1280-light`: nav 240px con badge numerici per pila + «+ Nuovo lavoro» in cima + `Sistemala ›` a footer; tre pannelli lista/scheda/fasi con `FATTA ✓` inline. Coerente e tastiera-friendly senza tradire il modello mobile.

6. **Racconto onesto delle automazioni.** `consegna` (frame Consegnato!): la `CardUAHaFatto` elenca solo ciò che è realmente avvenuto e tiene la fattura su «in preparazione» finché la finestra è aperta. Integrità di L5 mantenuta anche quando sarebbe stato più «bello» dire «fatto».

7. **Il countdown dell'annullo NON crea ansia — scelta di framing corretta.** `consegna` (frame scheda consegnata): l'annullo vive in un `LinkQuieto` muted «Aspetta, annulla la consegna (9:47)», non in un timer rosso a tutta larghezza. La copy «Puoi ancora annullare per 9:47» è rassicurante («puoi *ancora*» = rete di sicurezza, non conto alla rovescia che incalza). Dopo una celebrazione di successo, il countdown è periferico e discreto: comunica «hai tempo», non «decidi subito». È esattamente il registro giusto per L6 senza generare pressione.

---

### Rischi per il gate

**R1 — Frame «Fatto!» del wizard: due decisioni su una vista (L1).** *`wizard-390-light`, frame FATTO!.*
La vista propone in sequenza: chip «Va bene ✓ / Decido dopo» sulla consegna suggerita **e** primario rosso «FOTOGRAFA IMPRONTA E PRESCRIZIONE» **e** LinkQuieto «Torna alla home». Sono tre uscite di cui due decisionali. Alla domanda-test «qual è LA cosa da fare qui?» la risposta non è univoca: c'è una conferma (consegna) *sopra* l'azione primaria (foto). Da notare: il chip «Va bene» **non è un residuo dimenticato** — la nota-budget di `wizard.html` lo conta come tocco 3 sanzionato del percorso minimo. Il team ha però difeso questo frame solo sul *budget del rosso* (un solo rosso per vista), non sul *budget delle decisioni* di L1: la tensione L1 resta non affrontata. La gerarchia visiva salva parzialmente (il rosso vince, il chip «Va bene» è pre-selezionato verde), ma per la lettura stretta di L1 questo è il punto che un revisore severo può contestare. **È il rischio gate n.1**, che classifico come *flag da sistemare*, non blocco fatale — con il vincolo che qualsiasi fix deve preservare il percorso ≤4 tocchi.

**R2 — Stati non-felici assenti (+ un flusso quotidiano solo accennato), e uno è fiscale.** Nessun mockup copre: consegna che **fallisce dopo la scrittura ottimistica** (offline/timeout sul `POST consegna`), home/pila **vuote**, errore generico. In più, il **wizard di conferma arrivo** (§4, «data proposta + minimi MDR») è dichiaratamente rinviato all'Ondata 2 — quindi «confermare un arrivo», una delle tre azioni quotidiane, non ha corpo disegnato in questa dotazione. La consegna è l'unico flusso che innesca DdC + fattura (outbox): se il collaudo di Francesco capita su rete instabile o su un lab a zero lavori, si testa a mani nude una superficie mai disegnata. Non blocca l'Ondata 0 in sé (non è tra le 7 schermate), ma **diventa gate-blocking per l'Ondata 1 e 4b** se arriva al React senza mockup: il comportamento di riconciliazione (L6, Avviso) va deciso ora, non improvvisato in QA. Il rinvio del wizard-conferma è invece scoping accettabile *purché* il collaudo non pretenda di misurare quell'azione in Ondata 0.

**Resilienza alle interruzioni (contesto «interruzioni continue»).** Il wizard ha persistenza 24h + frame «Riprendo da dove eri?» (`wizard` frame Riprendi) — ottimo. Restano non dichiarati due casi frequentissimi al banco: cosa succede se il telefono si blocca con la `DialogConferma` di consegna aperta, o con uno sheet di modifica a metà. Vanno chiariti nel React (il dialog consegna dovrebbe semplicemente svanire senza effetti — l'orchestrazione parte solo al tap su CONSEGNA; lo sheet modifica dovrebbe scartare senza salvare). Una riga di intento su questo chiude il tema oltre il solo wizard.

**R3 — Prove esterne senza casa nella home (findability).** `scheda-lavoro-768` mostra correttamente «È tornata» sul lavoro `in_prova`, ma **dalla home non c'è alcun luogo per il lavoro in prova**: vive solo in Agenda + StrisciaStato. Il collaudo-sentinella #3 («Dov'è il lavoro in prova dal Dr. X?» in ≤10s) è costruito apposta per far emergere questo buco. La spec §4 lo dichiara e accetta il rischio, ma va detto chiaro: **se Francesco esita >5s sul concetto, si riapre §4** — quindi è un rischio *sospeso sopra il gate finale*, non chiuso.

**R4 — Troncamenti sui sub delle pile home.** `home-390-light`: «n.144 da ieri — poi n.147 all…» e «n.151 del Dr. Esposito da c…». Il taglio a metà parola dà un'impressione di incompiuto su una schermata che deve trasmettere controllo. Non gate-blocking, ma è la prima cosa che l'occhio nota su quella vista.

---

### Raccomandazioni

#### Da fare ORA, sui mockup (prima del React)

1. **Sciogliere il doppio-decisione del frame «Fatto!»** (R1, `wizard` frame FATTO!). Opzione A (consigliata): rendere la consegna suggerita una **riga informativa già risolta** («Pronta per giovedì 16 · cambia») con un solo LinkQuieto per modificarla, togliendo i due chip → resta UNA azione primaria (Fotografa). Opzione B: spostare la conferma consegna a *dopo* la foto. Va deciso su mockup, non in React.

2. **Aggiungere 2 frame di stato vuoto** (R2): home con pile a 0 (§5.26 «Nessun lavoro sul banco. Goditi il caffè ☕») e una pila vuota. Sono economici e ad alto valore: chiudono il rischio che il collaudo su lab nuovo cada su schermate mai viste. La `EroeTuttoAPosto` esiste già come componente: applicarla.

3. **Mockuppare il frame «consegna non riuscita»** (R2, fiscale): cosa vede l'utente se il `POST consegna` fallisce dopo l'ottimismo — Avviso + stato che torna indietro + «Riprovo?». È l'unico stato d'errore che tocca DdC/fattura: merita un frame esplicito ora, perché la 4b-UI lo consumerà.

4. **Rifinire i sub delle pile perché non tronchino a metà parola** (R4): copy calibrato sulla larghezza reale a 390 (es. «n.144 da ieri · n.147 alle 16» invece del taglio). Micro-fix, alto ritorno percettivo.

#### Da tenere per il React / ondate successive (non ora)

5. **Skeleton di caricamento**: §5.25 è già normato (skeleton carta, niente spinner). Non serve mockup dedicato — basta rispettare la geometria in implementazione. Rischio basso, si difala.

6. **Pila ambra a 40 lavori**: la `RigaCerca >15` + sub «prossimo vincolo» sono definiti; è essenzialmente uno scroll lungo di un «luogo», accettabile. Verificare in QA che l'ordinamento per urgenza regga, ma non serve mockup nuovo.

7. **Offline PWA globale** (banner/coda): pattern trasversale, non specifico del «cuore». Rinviabile all'audit multi-agente (E7), purché il singolo errore-consegna (racc. 3) sia coperto.

8. **Watch al collaudo #3 (prove esterne, R3)**: non toccare i mockup ora, ma preparare mentalmente il piano-B (segnale StrisciaStato «la prova di Dr. X rientra oggi» come scorciatoia in home) da attivare *solo se* Francesco esita sul concetto. Decisione condizionata, non preventiva.

#### Note ergonomiche 390 (confermate, nessuna azione)

- `TastoPiu` in basso-centro = zona pollice ottimale; sotto di esso **niente** (bottom nav morta) → zero tap accidentali. Ottimo.
- Azioni quotidiane pesanti (`CONSEGNA`, `+`) stanno tutte nella metà bassa/centrale = raggiungibili. `⋯` e `☰` in alto a destra sono l'angolo lontano per il pollice destro, ma ospitano azioni infrequenti → accettabile.
- Verificare in implementazione che i **chip** del wizard Fatto e le voci del menu `⋯` mantengano target ≥44px (sui mockup i chip appaiono al limite).
- Dark mode (`home-390-dark`): piatto e pulito come da spec; il `TastoPiu` conserva un lieve rilievo fisico — coerente con L4 (tasti fisici) ma in tensione con la vecchia regola v2.3 «mai raised in dark». Segnalo solo per allineamento esplicito, non è un difetto.

---

*Chiusura: il «cuore» batte bene. I tre rischi gate sono chirurgici — un frame da semplificare, due-tre stati da disegnare, un buco noto da sorvegliare. Consiglio di chiudere R1 e R2-vuoto/errore sui mockup prima di aprire il React dell'Ondata 1.*
