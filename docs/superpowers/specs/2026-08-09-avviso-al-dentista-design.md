# L'avviso al dentista quando una dichiarazione viene rifatta — spec di design

**Quando:** 9 agosto 2026 (`provato:` `date`, letto in un comando separato).
**Decide:** Francesco Formicola · **Stato:** ratificato in sessione, **da approvare come spec**.
**Nasce da:** ⚖️ **D317** (Task E del piano `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md`), **mai iniziato** — il piano stesso lo dichiarava aperto: «*File: **da decidere** leggendo il codice esistente degli avvisi*» (`:461`).
**Decisioni che la reggono:** ⚖️ **D331 · D332 · D334 · D335** — verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, **centoquarantacinquesima tornata**.

---

## 1. Perché esiste, ed è un obbligo — non una cortesia

Quando una dichiarazione già consegnata viene **corretta e rifatta**, il dentista ha in mano un
documento **superato**. Due norme, e vanno citate separate perché chiedono cose diverse:

- **GDPR Art. 19** — il titolare **comunica** la rettifica **a ciascun destinatario** cui i dati
  sono stati comunicati.
- **GDPR Art. 5(2)** — il titolare deve essere **in grado di dimostrarlo** (*accountability*).

🔑 **La seconda è quella che decide il disegno.** Comunicare senza lasciarne traccia soddisfa l'Art.
19 e **non** l'Art. 5(2): dal punto di vista di un controllo, **ciò che non è registrato non è
avvenuto**.

⚠️ **Vincolo di casa, non negoziabile** (`ua-app/CLAUDE.md` §9): **i messaggi WhatsApp non portano
mai il nome del paziente.** Questo non è un dettaglio di stile — è il confine che divide i due canali.

---

## 2. Che cosa esiste già — verificato leggendo il codice, non ricordato

| cosa | dove | stato |
|---|---|---|
| Il messaggio alla consegna | `src/lib/consegna/whatsapp-template.ts` · `orchestrate.ts:384-394` | ✅ **c'è**, e porta **solo** numero di lavoro + link al portale |
| L'app **non manda** WhatsApp da sola | `buildWhatsappUrl` prepara un link `wa.me` che si apre nell'applicazione di chi lo tocca | ✅ **c'è**, ed è **già** il comportamento che D331 chiede |
| Il portale del dentista | `src/app/portale/[token]/page.tsx` | ✅ **c'è**: lavori aperti e consegnati, con dichiarazione e buono scaricabili (`:155-185`) |
| La traccia degli accessi | `src/lib/portale/audit.ts` — `download_ddc`, `view_lavori`, `pin_ok`… | ✅ **c'è**, ed è **già metà della prova dell'Art. 5(2)** |
| Il destinatario | `lavori.cliente_id` — **uno solo** (`provato:` `information_schema`) | ✅ nessuna domanda su «a chi» |
| La riemissione | `correggi_e_riemetti_atomica` · `CAMPI_CORREGGIBILI_DOCUMENTO` (`src/lib/dichiarazione/correzioni.ts:58`, **sei voci**) | ✅ **c'è** |
| La striscia in cima alla home | `src/lib/dashboard/striscia.ts` — candidati che mostrano **un solo** segnale, il primo che si accende | ✅ **c'è**, ed è il posto giusto per il promemoria |
| 🔴 **Un posto per gli AVVISI** | — | ❌ **NON esiste**: il portale ha i documenti, **non le comunicazioni** |

---

## 3. Il disegno

### 3.1 Che cosa succede, nell'ordine

1. **La riemissione riesce** → nasce **un avviso** legato a quel lavoro, in stato **`da_comunicare`**.
   🛑 **Non parte niente da sola** (D331): nasce **solo** il promemoria.
2. **Il promemoria si vede in due posti**: sulla **scheda del lavoro**, e nella **striscia** in cima
   alla home (che mostra un segnale alla volta, il più importante).
3. **L'odontotecnico apre l'avviso** e trova **un testo già scritto, che può cambiare** (D334). Due
   strade, e **nessuna delle due è più «vera» dell'altra**:
   - **«Mandalo su WhatsApp»** → si apre WhatsApp col messaggio pronto. **Solo il fatto**: numero di
     lavoro e link al portale. **Nulla del paziente.**
   - **«L'ho avvisato di persona»** → l'avviso si chiude, e restano scritti **chi** l'ha dichiarato e
     **quando** (D335).
4. **Nel portale**, il dentista trova una sezione **«Avvisi»** con la comunicazione **per intero**:
   quale lavoro, **che cosa è stato corretto**, e la dichiarazione nuova da scaricare.
   🔑 **Il dettaglio vive solo lì** (D334), perché il portale è dietro **token e PIN** e traccia gli
   accessi; WhatsApp no.
5. **Quando il dentista apre l'avviso**, l'apertura si registra — come già succede per i download.

### 3.2 Gli stati dell'avviso, e sono tre

```
da_comunicare ──► comunicato_dall_app     (mandato su WhatsApp dall'app)
              └─► comunicato_a_voce       (dichiarato: «l'ho avvisato di persona»)
```

🛑 **Non esiste uno stato «annullato».** Un avviso nasce da un fatto — *il documento è stato
rifatto* — e quel fatto non si disfa. Se si potesse cancellare il promemoria senza comunicare,
la riga tornerebbe a essere **una casella da spuntare**, che è il modo in cui gli obblighi
diventano finzione.
⚠️ **E il promemoria non ha scadenza:** resta finché uno dei due stati finali non arriva. *Un
allarme che si spegne da solo non è un allarme.*

### 3.3 Che cosa dice il testo

**Su WhatsApp** — solo il fatto, e nient'altro:

> *La dichiarazione del lavoro #2026/0042 è stata rifatta. Trovi quella nuova qui: <link>*

**Nel portale** — il fatto **e** quali voci sono cambiate, in parole comuni («il nome del paziente»,
«i denti indicati»). ⚖️ **D336: SOLO IL FATTO, MAI IL VALORE VECCHIO.**

🔑 **La ragione, e vale come regola oltre questo caso:** il valore vecchio di un campo corretto è
spesso **il dato di un'altra persona** — un nome digitato per sbaglio è il nome di **qualcun altro**.
Mostrarlo significherebbe **risolvere un problema di protezione dei dati creandone un secondo**, e
per giunta verso un destinatario che quel dato non deve avere.
📌 **E non serve:** il dentista deve sapere **che** quel documento è superato e **dove** trovare
quello nuovo. Il confronto fra vecchio e nuovo lo fa **con il documento**, non con l'avviso.

---

## 4. I dati

**Una tabella nuova**, `avvisi_dentista` — nome di lavoro, da confermare in fase di piano:

| colonna | perché |
|---|---|
| `laboratorio_id` | isolamento fra laboratori (RLS con `public.current_lab_id()`) |
| `lavoro_id` · `cliente_id` | a quale lavoro e a quale destinatario si riferisce |
| `dichiarazione_id` | **quale** dichiarazione è stata rifatta — l'avviso è di quella, non del lavoro in generale |
| `stato` | `da_comunicare` · `comunicato_dall_app` · `comunicato_a_voce` (CHECK, tre valori) |
| `campi_corretti` | quali voci sono cambiate — l'elenco viene da `CAMPI_CORREGGIBILI_DOCUMENTO` |
| `testo_inviato` | **il testo davvero mandato**, non quello proposto: è ciò che si dimostra |
| `comunicato_at` · `comunicato_da` | **quando** e **chi** — il cuore dell'Art. 5(2) |
| `visto_dal_dentista_at` | quando il destinatario ha aperto l'avviso nel portale |
| `created_at` | quando è nato |

🔑 **Perché una tabella e non una colonna su `dichiarazioni_conformita`:** un avviso è **un fatto
con una sua storia** (nasce, viene comunicato, viene visto), e una dichiarazione può essere rifatta
**più volte** — a ogni riemissione nasce **un avviso nuovo**. Una colonna terrebbe **solo l'ultimo**.

🛑 **L'avviso nasce DENTRO la stessa transazione della riemissione.** Se nascesse dopo, una
riemissione riuscita potrebbe restare **senza** il suo promemoria — e nessuno se ne accorgerebbe,
perché il documento nuovo c'è.

---

## 5. Le superfici

| superficie | che cosa cambia |
|---|---|
| **Scheda del lavoro** | una riga «il dentista va avvisato», che apre il foglio dell'avviso |
| **Il foglio dell'avviso** | 🆕 il testo modificabile + i due tasti. **Componenti solo da `src/components/ds/`**, token da `src/design-system/v3/` |
| **Striscia della home** | un candidato nuovo in `striscia.ts`, nella forma già in uso: `{ attenzione: true, forte: 'n.2026/0042', testo: 'aspetta l'avviso al dentista', azione: { etichetta: 'Apri ›', href: … } }` |
| **Portale, sezione «Avvisi»** | 🆕 non esiste: **cancello §0B** — mockup a più varianti, chiaro e scuro, 390/768/1280, **prima** del codice |
| **Scheda del dentista, «Comunicazioni»** | 🆕 ⚖️ **D337** — `src/app/(app)/clienti/[id]/page.tsx`: **l'archivio** di tutto ciò che è stato comunicato a quel destinatario (quando · come · chi · se e quando l'ha aperto). 🛑 **È un archivio, NON un allarme:** niente pastiglie rosse, niente conteggi che chiamano — chi ci entra ci entra apposta |
| **`AzionePortale`** | una voce nuova (`view_avviso`) in `src/lib/portale/audit.ts:10` |

---

## 6. Che cosa NON si fa

- ❌ **Nessun invio automatico** — né WhatsApp né email (D331).
- ❌ **Nessun blocco**: l'avviso non impedisce di lavorare, consegnare o fatturare. *Il laboratorio
  ha il diritto di lavorare; l'app ricorda, non sequestra.*
- ❌ **Nessuna email**: il canale è WhatsApp + portale (D332). Se un giorno servirà, sarà un'ondata.
- ❌ **Nessun avviso per le correzioni PRIMA della consegna**: finché il documento non è uscito, non
  c'è nessun destinatario da informare — è il confine dell'Art. 2(28) MDR, già ratificato.
- ❌ **Nessuna scrittura di «come» si è avvisato a voce** (D335: scartata per costo, non perché
  sbagliata).

---

## 7. Le questioni aperte — TRE SU QUATTRO CHIUSE il 09/08

1. ✅ **CHIUSA — ⚖️ D336: solo il fatto, mai il valore vecchio.** Francesco: «*solo il fatto senza il
   valore vecchio*». Motivo per intero al §3.3.
2. ✅ **CHIUSA — ⚖️ D337, e la risposta è più grande della domanda.** Avevo chiesto *se dirti che il
   dentista non ha ancora aperto l'avviso*; Francesco ha risposto spostando il problema: «*possiamo
   creare una sezione nella scheda del dentista, che tenga conto delle comunicazioni dirette a lui.
   Poi tanto abbiamo il registro che segna quando l'ha aperto*».
   🔑 **Perché è meglio della domanda che avevo fatto:** un «non l'ha ancora aperto» attaccato al
   promemoria sarebbe stato **un secondo allarme su una cosa che non dipende dall'odontotecnico** —
   il difetto che volevo evitare. Una **sezione nella scheda del dentista** invece è un **archivio**,
   non un allarme: si guarda quando serve, ed è **esattamente la forma che l'Art. 5(2) chiede** —
   *tutto ciò che è stato comunicato a quel destinatario, in un posto solo.*
   ➡️ **Va nella scheda cliente** (`src/app/(app)/clienti/[id]/page.tsx`), e mostra per ogni
   comunicazione: **quando**, **come** (dall'app / a voce), **chi** l'ha fatta, e **se e quando** il
   dentista l'ha aperta.
3. ✅ **CHIUSA — ⚖️ D338: si parte da zero.** Nessun avviso retroattivo per le dichiarazioni già
   rifatte. Francesco: «*si parte da zero*». Il database contiene **solo dati di prova**
   (`CLAUDE.md` §8), quindi non si perde nulla di reale — **ma la riga sta qui perché la scelta sia
   scritta invece che capitata**, e perché **alla prima onboarding vera vada riletta**: da quel
   momento «partire da zero» vorrebbe dire lasciare scoperto un obbligo su documenti veri.
4. 🟡 **APERTA — se conservare anche il testo PROPOSTO dall'app**, oltre a quello davvero mandato.
   Spiegata a Francesco il 09/08, in attesa di risposta. Due usi diversi: ① in un contenzioso, poter
   mostrare che l'app proponeva un testo corretto; ② capire, se **tutti** lo cambiano allo stesso
   modo, che **il testo proposto è scritto male**. Per la legge basta quello mandato.

---

## 8. Le prove

- **Unitarie:** l'avviso nasce **solo** su riemissione riuscita · i tre stati e nessun quarto · il
  testo per WhatsApp **non contiene mai** il nome del paziente (prova esplicita, con un nome vero
  nella fixture) · la chiusura «a voce» scrive autore e data.
- **D'integrazione, contro il database vero:** l'avviso nasce **nella stessa transazione** della
  riemissione — se la riemissione fallisce, **nessun avviso resta**.
- 🛑 **La prova che conta più delle altre**, ed è la lezione dell'08/08: il corpo che il foglio manda
  alla rotta **si giudica col contratto della rotta**, non con una finzione (v. `docs/roadmap/`,
  riga 38 della coda, e il modo già usato nel Task 10).
- **A schermo:** FASE 9 su 390 · 768 · 1280, chiaro e scuro, **più** il portale — che è una superficie
  usata **da un'altra persona, su un altro telefono**.

---

## 9. Il percorso

**Dominio critico** (dati personali + un obbligo di legge + una migration) → **percorso GRANDE**
(`CLAUDE.md` §0C): FASE 3 piena, panel prima della ratifica del piano, cancello §0B per il portale,
FASE 9 e gate estetico L2 prima del merge.
