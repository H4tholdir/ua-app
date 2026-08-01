# Handoff — l'audit dei documenti, e la rete che ha imparato i suoi due difetti

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`227643b9`**, allineato con `origin` (**zero** da pubblicare), **albero pulito**.
`https://uachelab.com` risponde **307 → `/login` 200** (la radice reindirizza: è il comportamento normale, non
un guasto — ⚠️ l'handoff precedente scriveva «200» sulla radice, che è impreciso).
**Riferimento misurato ADESSO, su `main`:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19** prove ·
`next build` **uscita 0**.
**Nessuna riga di codice dell'applicazione è stata toccata.** L'unico codice cambiato è lo **script di
controllo** `scripts/guardia-coerenza-documenti.mjs`, che non gira in produzione: gira sul computer prima di
ogni salvataggio.

⚠️ **Sulla data.** L'orologio della macchina dice **1° agosto**; i documenti del progetto seguono la serie del
**3 agosto**, e questo handoff la tiene.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① Il difetto più grave dell'audit è stato **trovato e tracciato, non risolto**

**Il contratto sul trattamento dei dati che i dentisti scaricano promette una cosa che l'app ha smesso di
fare.** `DpaTemplate.tsx:149` (ripetuto a `:169` e `:197`) promette «conservazione dei dati per **almeno 10
anni** … ai sensi dell'**Art. 10(8) MDR**», mentre la **cancellazione fisica** delle foto è **in produzione dal
02/08**: `provato:` `src/app/api/lavori/[id]/immagini/[imgId]/route.ts:214` →
`svc.storage.from('documenti').remove([existing.storage_path])`, raggiungibile dal menù ⋯ della scheda.

🛑 **Era già una decisione di Francesco — D62, 30/07** — con una **precondizione esplicita**: correggere il DPA
*prima* che la cancellazione fisica entrasse in produzione. La cancellazione è entrata; il DPA no. La decisione
era tracciata **dentro un blocco «ONDATA (c) — da pianificare»**, e nessuno l'ha riletta quando la sua
condizione si è avverata.
🔧 **Due errori in più nello stesso documento**, già accertati dal panel del 29/07: ① l'**Art. 10(8) non è la
norma dei dispositivi su misura** (base giusta: **Art. 10(5) + Allegato XIII punto 4**); ② «almeno 10 anni» è
scritto piatto, mentre per gli **impiantabili** l'All. XIII punto 4 dice **15**.
✅ **Costa poco:** `provato:` il documento **non è congelato** — `generate-dpa.ts` lo rigenera dal modello vivo
a ogni scarico, la rotta non persiste nulla, `data_processing_agreements` ha **zero scrittori applicativi**.
➡️ **È la voce 10 della roadmap.** È **PICCOLA** (un solo template, nessuna migration) ma **normativa**: vuole
un panel prima di toccare il testo.

### ② Il **§6-bis** della Dichiarazione non è ancora stato percorso in produzione

Eredità dell'handoff precedente, **intatta**: la sezione delle norme armonizzate non compare perché per
`protesi_fissa` di quel laboratorio `rischi_tipo_dispositivo.norme_json` è **vuoto**. Costa un giro a parte con
una riga di prova da preparare e **rimettere** (modello: `scripts/giro-guardia-overlay.ts`).
📄 Referto: `docs/roadmap/2026-08-03-ddc-produzione-referto.md` §4.

### ③ Di D42 non è stata scritta **nessuna riga di codice**

Il piano è pronto — `docs/superpowers/plans/2026-08-03-tinte-manufatto.md`, **9 task**, e da D121 non è più
«la parte 1»: è **D42 per intero**. L'esecuzione **non è iniziata**. Vale ancora, per intero, l'avvertenza
dell'handoff precedente: **quel piano l'ha scritto e riletto la stessa persona**, e va eseguito con **R-E1** —
un task alla volta a un esecutore fresco, revisione indipendente in mezzo, e nel brief l'istruzione esplicita
di **cercare dove il piano sbaglia**.

### ④ Quattro voci dell'audit restano aperte, e il **round 2** non è stato fatto

**AUD-1** («Dimmelo a voce» dichiarato in tre modi incompatibili) · **AUD-3** (tre decisioni dicono «voce
propria» e la voce non esiste) · **AUD-4** (D36: un riconoscimento costruito, pubblicato e collegato a nulla) ·
**AUD-5** (il portale pubblico col colore cotto a mano). **AUD-2 è chiusa** (§1).
🛑 **E il confine dichiarato dell'audit:** il round 1 ha filtrato le decisioni su «cancella o rimanda **e**
osservabile nel codice» — **20 in filtro su 140 esaminate, 15 coerenti, 5 no**. Le altre **120 non sono state
provate**. Non sono «a posto»: sono **non verificate**.

### ⑤ Che cosa NON è verificabile da qui, dichiarato

Le **migrazioni applicate al database vero** (il collegamento Supabase non è autorizzato in questa sessione) e
i **collaudi nel browser** dichiarati nelle voci chiuse.

---

## 1. Che cosa è successo

| | |
|---|---|
| **D121** | 🧭 **Il passo della tinta ESCE da D42.** L'ondata chiude con **due superfici** (pagina di modifica + scheda in sola lettura); il passo nasce nell'ondata che costruirà le schermate del wizard. **D112 e D118 emendate per RINVIO, non per revoca.** 🔑 **L'ha prodotta un'obiezione di Francesco** che ha demolito la raccomandazione che stavo per fare (v. §2 ①) |
| **Il fatto che ha aperto tutto** | 🔴 **L'ondata (b) era stata dichiarata chiusa avendone costruita una parte.** In produzione è andato **l'album delle foto** — aggiunto al perimetro il 30/07 con D60 — mentre passo paziente rifatto · ricerca paziente · passi denti/colore/foto/cassetta · briciole · bozza `v:2` · nome e cognome separati **non sono partiti**. `provato:` `WizardNuovoLavoro.tsx:50-59` → `passo: 1 \| 2 \| 3`; i due moduli-motore (`src/lib/wizard/passi.ts`, `sequenza-passi.ts`, 53 prove) **li usano solo i loro test** |
| **L'AUDIT, round 1** | 🔎 Chiesto da Francesco: «*se ricapitano cose come questa di oggi, e non me ne accorgevo, lasciavamo un buco nella produzione*». 🟢 **Il difetto NON si ripete:** ondata (a) **14 su 14** · parete cassette **9 su 9** · redesign parete/home **12 su 12** · accenti **10 su 10** (provato su un documento vero uscito dalla produzione) · nome e cognome tappa 1 **ridotta e dichiarata tale tre volte** · un tema solo **13 su 14**. Referto: `docs/roadmap/2026-08-03-audit-documenti-referto.md` |
| **Cinque bugie corrette** | Tutte **del verso opposto** — documenti che **negavano** un lavoro fatto: tre rotte dell'ondata (a) date per «di ramo, non in produzione» in `memory/MEMORY.md`; l'ondata (a) data per «mai mergiata» in `ua-app/CLAUDE.md`; i «tre posti» del fondo pagina che sono **quattro** — con la correzione **già scritta** in un verbale del 26/07 e mai propagata |
| **La RETE** | 🛡️ `scripts/guardia-coerenza-documenti.mjs` passa da **quattro a SEI controlli**. **5** — una voce di roadmap ✅/🚀 non può citare una spec che non si dichiara eseguita; **6** — una decisione che rimanda lavoro deve nominare la **destinazione**. **Tarati prima di scriverli** (1 riscontro su 10 voci · 6 su 121 decisioni) e **provati rompendo, uno per controllo** |
| **AUD-2 → DS v3 rev. 3.5** | 🎨 Il design system descriveva **cinque comportamenti che il codice contraddice** e taceva su **tre componenti** in produzione. 🔑 **Tutte e otto le divergenze avevano già una decisione ratificata dietro:** il difetto non era nel codice, era che il canale per emendare la spec (**§13.1 p.3**) **è stato usato una volta su nove** |
| **D122** | 🔊 **Il numero del lavoro resta nel nome accessibile** della cassetta (la targa dipinta resta senza). Era **l'unica divergenza senza ratifica dietro**: trovata da un verificatore, **non sanata da lui**, portata a Francesco |
| **Salvataggi** | `5914e14f` · `ca94d06f` · `03a2dae0` · `509f0431` · `227643b9` — **tutti pubblicati**. Rami `guardia-audit` e `ds-v3-allineamento` mergiati in fast-forward su `main` |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① Un audit fatto rileggendo i documenti avrebbe riprodotto il punto cieco su scala più grande.**
Il 3 agosto **handoff, roadmap e memoria erano d'accordo fra loro**: dicevano tutti «ondata (b) in
produzione». Nessuno dei tre era falso *rispetto agli altri*. A romperli è stato il confronto fra **intenzione
dichiarata** e **codice vero** — e a farlo è stato **Francesco con una domanda**, non una rilettura.
🛑 **Conseguenza operativa:** ogni verifica di «è stato fatto?» si ancora a `grep` e `file:riga`, mai alla
concordanza fra documenti. La concordanza è ciò che il difetto produce, non ciò che lo esclude.

**② Io stavo per raccomandare una cosa sbagliata, e l'ha fermata Francesco.** Stavo per proporre di mettere la
tavolozza delle tinte dentro il blocco «Se vuoi, aggiungi» del passo paziente. La sua obiezione — «*stiamo
ragionando sul comportamento della pwa di com'è adesso non di come l'abbiamo progettata*» — è risultata esatta
alla verifica: la spec ratificata dell'ondata (b) §4 dice che **quel blocco sparisce**. Avrei arredato una
stanza in lista di demolizione.
🔑 **La regola che ne esce:** prima di proporre *dove* mettere una cosa, si guarda **il progetto di quella
superficie**, non solo il suo stato attuale. Il codice dice com'è; solo la spec dice **come sarà**.

**③ Il rinvio più pericoloso non è quello dimenticato: è quello scritto con una PRECONDIZIONE che poi nessuno
controlla.** D62 era tracciata, con la sua condizione scritta chiara («prima che la cancellazione fisica entri
in produzione»). L'ondata (b) le è passata sopra pubblicando proprio quella cancellazione, e il documento che
la contraddice **continua a uscire dal laboratorio**. Una condizione va riletta **quando l'evento accade**, non
quando si apre l'ondata che la conteneva. Nessuno script può farlo al posto nostro.

**④ Non si allinea la legge al codice per comodità.** Le otto divergenze del design system avevano **tutte** una
decisione ratificata dietro: allinearle era legittimo, e ogni riga emendata porta la decisione che l'ha
superata **con le sue parole**. La nona — il numero nel nome accessibile — **non ne aveva**, ed è stata portata
a Francesco invece che sanata (D122). 🔑 **Allineare un documento al codice senza una decisione è il modo in
cui una deviazione diventa norma senza che nessuno l'abbia scelta.**

**⑤ Una sezione «chiusa» non si cancella: si sostituisce.** §8.3 del design system dice «le coreografie
canoniche — **uniche ammesse**» e «ogni altra transizione è `instant`». Cancellare la voce 7 (l'animazione
superata) avrebbe lasciato **fuori legge** l'animazione che gira in produzione al suo posto. Vale per ogni
elenco dichiarato esaustivo.

**⑥ Una regola nuova per una guardia si TARA prima di scriverla.** Quel file porta scritta la lezione «*una
guardia che grida al lupo viene spenta*» — la prima versione produsse 99 segnalazioni. Le due nuove sono state
misurate **prima**: **1 riscontro su 10 voci** e **6 su 121 decisioni**, tutte difetti veri. E ognuna ha la
sua prova rosso-poi-verde **separata**: due controlli, due prove — una sola dimostrerebbe che il file viene
letto, non che la regola **discrimina**.

**⑦ Anche una nota di abrogazione va scritta dove qualcuno la leggerà.** §5.15 del design system prescriveva
«Dimmelo a voce» in fondo a **ogni** passo del wizard, mentre D13 ne aveva deciso l'uscita **totale**. Senza la
nota aggiunta ora, la prossima ondata del wizard **l'avrebbe rimontato** — cioè l'esatto contrario della
decisione, e per la ragione che l'aveva motivata: «*sennò poi dobbiamo intervenire su tutti i punti dove lo
inseriamo*».

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **Il DPA promette 10 anni mentre l'app cancella davvero** (§0 ①) — **voce 10**, PICCOLA ma **normativa**: panel prima di toccare il testo | `DpaTemplate.tsx:149,169,197` · roadmap voce 10 |
| 🔴 **2** | **Eseguire il piano di D42** — 9 task, **R-E1**, ramo `tinte-manufatto` **nel repo principale** (🛑 mai un worktree) | `docs/superpowers/plans/2026-08-03-tinte-manufatto.md` |
| 🔴 **3** | **Il buono di consegna non si rigenera dopo un annullo**, e il dialogo promette il contrario | roadmap, sezione dedicata |
| 🟠 **4** | **AUD-1** — «Dimmelo a voce» dichiarato in tre modi incompatibili. La nota di abrogazione è stata scritta nel DS, ma **il componente è ancora montato** in `PassoDentista.tsx:93`, `PassoTipo.tsx:116`, `PassoPaziente.tsx:118` e nel catalogo | roadmap AUD-1 |
| 🟠 **5** | **La DdC cita `Art. 2(1)(3)` MDR, che non esiste** — va `Art. 2(3)`. ⚠️ Fonte secondaria: si riconferma sul testo **italiano** di EUR-Lex prima di correggere | `DdcTemplate.tsx:461` |
| 🟠 **6** | **Il luogo di fabbricazione non è mai stampato** · **«Sostanze / tessuti: No»** codificato a mano · **la nomina PRRC riscrive la data** | roadmap, «I documenti che escono dal laboratorio» |
| 🟠 **7** | **AUD-3 · AUD-4 · AUD-5** — tre decisioni senza destinazione · D36 collegata a nulla · il portale col colore a mano | roadmap, sezione dell'audit |
| 🟡 **8** | **Il §6-bis non provato in produzione** (§0 ②) | referto DdC §4 |
| 🟡 **9** | **Il round 2 dell'audit**: **120 decisioni non provate** — non «a posto»: **non verificate** | referto §4 |
| 🟡 **10** | La riga «Colore — es. A2» compare per tutti e **38** i tipi e per un paradenti il valore digitato **viene scartato dal server**. La sua sede naturale è l'ondata delle schermate (che quel blocco lo elimina) — ma se tarda, si toglie prima | `PassoPaziente.tsx:91-98` · `crea-lavoro.ts:386` |
| 🟢 **11** | D42, domande minori: la riga sulla scheda muta o cliccabile (si decide in collaudo) · `useLavoroForm.ts` **non è stato letto**, ed è l'innesco del Task 8 | piano, §Domande 2 e 3 |

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`.** Due voci si contendono il primo posto, e la scelta è di
Francesco:

- **voce 10 — il DPA** (§0 ①): piccola, ma è l'unica cosa dell'audit arrivata a un **documento che i dentisti
  hanno già in mano**. Percorso: panel normativo → correzione del testo → prova che il documento nuovo esce
  giusto.
- **voce 6 — D42**: il piano è pronto, l'esecuzione è da iniziare, e va fatta con R-E1.

🔑 **E il round 2 dell'audit resta il modo per chiudere del tutto la domanda di Francesco** («non perdere
nessuna decisione passata»): 120 decisioni non ancora provate.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md`, sempre per primi. ⚠️ `MEMORY.md` è grosso
  (~63k token): si legge **la testa**, non tutto.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centoventidue** decisioni in
  **trentanove** tornate. La prossima è **D123**.
- 🆕 **La guardia ha SEI controlli** (`node scripts/guardia-coerenza-documenti.mjs`), e due sono nuovi: una voce
  ✅/🚀 non può citare una spec che non si dichiara **eseguita**; una decisione che **rimanda** lavoro deve
  nominare una **destinazione** che esista. Gira al pre-commit: se si accende, il difetto è quasi sempre tuo.
- **REGOLA ADVISOR:** ogni decisione significativa passa da un panel di 2-3 con mandato di **confutare** — e
  **le sue affermazioni portanti si riverificano a mano**. In questa sessione il panel ha corretto la mia
  raccomandazione, e io ho corretto una sua cifra (i tipi senza colore sono **10**, non 13).
- **R-E1 / R-E2:** un compito alla volta a un esecutore fresco; un difetto fuori dal proprio mandato si
  **riferisce**.
- **FASE 7 per intero, output incollato.** I tre comandi sono tre: `tsc` non vede la firma degli handler di
  rotta. **Riferimento misurato oggi:** `tsc` 0 · `vitest` **370 | 3** file e **4275 | 19** prove ·
  `next build` uscita 0.
- **FASE 6b:** dopo ogni migration, `supabase gen types` + `tsc`. Il CI **non** applica le migrazioni.
- **D103 — l'accesso al banco:** credenziali di `.env.local`, **link monouso**
  (`npx tsx scripts/tmp/link-accesso.ts <email> <percorso>`). ⚠️ `scripts/tmp/` è **ignorato da git**.
- 🛑 **Prima di consegnare un lavoro per prova, due controlli:** stato `pronto`/`in_ritardo` **e** nessuna DdC
  con stato ≠ `annullata`, altrimenti il guard di idempotenza restituisce quella vecchia e si legge un
  **rosso falso**.
- **Se tocchi gli overlay v3:** `npx tsx scripts/giro-guardia-overlay.ts`, a mano.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
