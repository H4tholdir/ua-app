# Parere visual designer indipendente — Mockup DS v3 «Il cuore», Ondata 0

**Autore:** Senior Product/Visual Designer (parere indipendente, non-gate)
**Data:** 11/07/2026
**Materiale visionato:** 38 screenshot (home 390/390corto/768/1280 · pila-aperta 390/dark · wizard 390/dark · scheda-lavoro 390 · consegna 390 light/dark, 1280 light · tutto-il-resto 390) × 2 temi, `_base.css`, spec 2026-07-09 + legge madre 2026-07-07, e il riferimento approvato `2026-07-07-redesign-A-materico-full.html` reso a 375px.

---

### Giudizio complessivo — voto craft **8 / 10**

Questo è lavoro da agenzia, non da template. C'è una mano sola e la si riconosce in tutte e sei le schermate: stessa scala tipografica, stessa materia, stesso vocabolario di stato. Il craft materico regge davvero — la ghiera ceramica del TastoPiu in `home-390-light` ha gloss, solco e cappello che leggono come oggetto fisico, non come effetto; il TastoPrimario CONSEGNA ha corsa e faccia gradiente credibili; le card in luce hanno l'ombra ambiente giusta senza il gloss plasticoso che la v2.3 vieta. La gerarchia è pulita: nella home il numero-pila grande e colorato (2 rosso / 5 ambra / 2 blu) è un vero ancoraggio dell'occhio, la StrisciaStato resta discreta, e il principio L1 «una cosa alla volta» è visibilmente rispettato — nessuna schermata affoga in due richieste concorrenti. La disciplina del rosso è, se possibile, **più** matura del riferimento approvato: là il rosso dilagava in un intero domo glossy del «+», qui è ristretto a glifo +, CONSEGNA e urgenza-consegna, e proprio per questo la firma pesa di più dove appare. Tolgo due punti per due cose concrete e non estetiche-di-gusto: (1) il tema **dark** conserva la struttura ma perde parte della personalità materica — l'oggetto-eroe (TastoPiu) rischia di sparire; (2) alcune superfici desktop e alcuni tagli di testo tradiscono che è un mockup statico e non un'esperienza provata su tutti i viewport. Nessuna delle due, da sola, è un veto.

---

### Punti forti

1. **Coerenza cross-schermata reale.** `home-390-light`, `pila-aperta-390-light`, `scheda-lavoro-390-light`, `consegna-390-light`, `wizard-390-light`, `tutto-il-resto-390-light`: stesso header (eyebrow caption in tracking + saluto display), stesse card radius 24, stesso separatore `--line` 1.5px nelle RigheDato, stesse PillStato/PillTempo. Sembra un prodotto, non sei esercizi. Questo è il risultato più difficile da ottenere ed è centrato.

2. **Materia in luce genuinamente premium.** Il TastoPiu ceramico (`home-390-light`) e la PillVoce «Dillo a voce» (`wizard-390-light`) hanno una fisicità da hardware — luce radente inset, solco inciso, corsa alla pressione codificata in `_base.css`. Il TastoPrimario CONSEGNA (`consegna-1280-light`, `pila-aperta-390-light`) legge come tasto vero. È esattamente il linguaggio «Push 3D fisico» promesso dalla legge, eseguito con misura.

3. **Gerarchia e disciplina del rosso.** Nella home il percorso dell'occhio è corretto: numero-pila → etichetta → subline, poi giù al «+». Il rosso non si diluisce: eyebrow grigio, corpi in `--ink`/`--muted`, e il rosso solo su segnale fiscale («Sistemala ›»), numero rosso della pila rossa, glifo + e CONSEGNA. La scelta di non colorare di rosso l'intero TastoPiu (a differenza del riferimento) rende il punto rosso più sacro, non meno.

4. **Wizard esemplare per L1.** I 4 frame (`wizard-390-light/dark`) sono la miglior prova del principio: una domanda enorme per schermo («Per quale dentista?»), TileScelta a bersaglio grande, «Salta» quieto, «Fatto!» con check e riepilogo. Zero rumore. Questo passerebbe qualsiasi review di onboarding.

---

### Rischi per il gate (cose che Francesco dovrebbe guardare due volte prima di approvare così)

1. **[GATE — moderato] Il flusso Consegna su desktop non è mai mostrato dentro il suo contesto.** In `consegna-1280-light` il DialogConferma galleggia su un vuoto taupe piatto (è lo scrim `rgba(29,25,19,.35)` steso su sfondo vuoto). Su mobile è corretto — lo scrim copre la pagina reale sotto. Su desktop è marooned: non c'è il layout a 3 pannelli dietro, quindi «Consegnato!», la CardUAHaFatto e la sheet-bloccanti a 1280 sono, di fatto, **non collaudate in contesto**. L'ingresso è provato (in `home-1280-light` la scheda con CONSEGNA disabled vive nel pannello destro), ma la celebrazione e i bloccanti a desktop no. Non blocca l'idea, ma prima del gate serve **un frame desktop del Consegnato!/sheet composto nella shell a 3 pannelli**, o almeno un impegno esplicito che in React quegli stati rendano sopra il contesto reale e non su un void. Rischio: scoprirlo in QA a implementazione fatta.

2. **[GATE — verificare in QA a device corto] Troncamenti nelle subline delle pile.** In `home-390-light` e soprattutto `home-390corto-light` le subline si tagliano: «n.144 da ieri — poi n.147 all…», «n.151 del Dr. Esposito da co…». La subline della pila è il secondo livello informativo più importante della home (dice *cosa* c'è dietro il numero); troncata a metà parola sembra un bug, non una scelta. Da decidere ora, nel mockup, la regola di ellissi/priorità (mostrare l'orario? il numero-lavoro? troncare il nome dentista prima?), non improvvisarla in React. La variante corta (§3.3) è la più esposta.

3. **[NON gate — ma da nominare] Il tema dark perde l'eroe.** Il TastoPiu che in luce è stupendo, in `home-390-dark` diventa un disco scuro con un piccolo glifo rosso su bg scuro: la fisicità ceramica evapora, resta un cerchio anonimo poco distinguibile dal fondo. Il dark-flat regge bene sulle card e sulle pile (border-top a luce radente = scelta corretta), ma sul singolo controllo-firma della home la personalità cala di un gradino. È una conseguenza fisiologica del dark-flat, non un errore — ma è il punto dove la domanda «il dark regge la stessa personalità del light?» ha risposta onesta: **quasi, tranne qui.**

---

### Raccomandazioni

**Da sistemare ORA nel mockup (prima del gate):**

- **Subline pile — regola di troncamento esplicita.** `home-390-light` + `home-390corto-light`: definire cosa cade per primo e non troncare mai a metà parola. È il difetto più «da bug» dell'intero set ed è l'unico che sporca la prima schermata.
- **Un frame desktop del Consegna in contesto.** Aggiungere a `consegna-1280` almeno il «Consegnato!» (o la sheet-bloccanti) reso sopra la shell a 3 pannelli, non su scrim-void. Chiude il rischio gate #1 con mezz'ora di lavoro.
- **TastoPiu dark — dargli un filo di presenza.** Non serve rosso pieno: basta un anello/luce radente leggermente più marcato sulla ghiera in `[data-theme="dark"] .tp .ghiera`, o un alone rosso appena percettibile dietro il glifo, così l'eroe della home non sparisce nel fondo. Verificabile subito in `home-390-dark`.

**Da tenere per il React (poi), non bloccante per il gate:**

- **TastoConsegnaInline nella pila rossa — pesa molto.** In `pila-aperta-390-light` lo slab rosso CONSEGNA dentro la prima card è corretto per intento (solo primo elemento, 2 tocchi), ma visivamente è il singolo elemento più «gridato» del set. In React valutare se la faccia possa essere leggermente meno satura in lista rispetto al TastoPrimario di pagina, per non appiattire la gerarchia primario-vs-inline.
- **`consegna-390` Consegnato! — il verde della celebrazione.** In luce funziona; in `consegna-390-dark` il check-tondo verde su green-tint scuro è un po' timido per essere «il picco della coreografia». In implementazione, la spinta emotiva la darà l'animazione+suono (§8.3.4), non lo statico — ok così nel mockup, ma è il frame dove il fermo-immagine sottovende il momento.
- **Densità RigheDato scheda.** `scheda-lavoro-390-light` è corretta ma un filo compatta rispetto al respiro della CardInfo nel riferimento (`redesign-A` a 375 ha padding più generoso). In React, con più aria verticale, la CardInfo guadagnerebbe autorità. Non urgente.

**Verdetto sintetico per il gate:** approvabile in direzione e in craft. I due fix di mockup (subline + frame desktop consegna) andrebbero fatti prima del sì definitivo; il resto è raffinatura da fase React.
