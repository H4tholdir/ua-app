# Audit dei documenti — round 1: «ciò che i documenti dichiarano, il codice lo conferma?»

**Data:** 3 agosto 2026 · **Chiesto da Francesco** dopo la scoperta di D121 («*se ricapitano cose come questa
di oggi, e non me ne accorgevo, lasciavamo un buco nella produzione e non va bene*»).
**Nessuna riga di codice è stata toccata durante l'audit.**

---

## 0. Il metodo, e perché NON è una rilettura

🔑 **Il difetto di oggi era invisibile alla lettura.** Handoff, roadmap e memoria **erano d'accordo fra loro**:
dicevano tutti «ondata (b) in produzione». A romperlo non è stata una rilettura ma il confronto fra
**intenzione dichiarata** e **codice vero** — e a farlo è stato Francesco con una domanda. Un audit fatto
leggendo prosa avrebbe riprodotto lo stesso punto cieco su scala più grande.

Quindi il round 1 è ancorato a `grep` e al codice, non alle parole:

1. si prende ogni lavoro **dichiarato chiuso o in produzione**;
2. si estrae il suo **perimetro voce per voce** dalla spec e dal piano;
3. **per ogni voce** si cerca la prova nel codice: `file:riga` se c'è, ricerca a vuoto **incollata** se non c'è;
4. si distingue un **numero invecchiato** (conteggi di test, versioni: è storia, non un difetto) da
   un'**affermazione falsa** («X è fatto» e X non esiste);
5. in più, il meccanismo preciso del difetto di oggi: **le ondate il cui perimetro è stato emendato dopo
   l'apertura** — dove la consegna segue la parte nuova e la dichiarazione di chiusura copre il tutto;
6. e le **decisioni che cancellano o rimandano lavoro**, che la regola §0A-bis dichiara «le più pericolose
   da perdere».

**Confine dichiarato:** il round 1 finisce qui. La verifica decisione-per-decisione di tutte e 140 è un
round 2, e lo decide Francesco.

---

## 1. 🟢 La buona notizia, misurata: il difetto di oggi NON si ripete

| lavoro dichiarato chiuso | esito | prova |
|---|---|---|
| **Ondata (a) del wizard** (in produzione 28/07) | ✅ **14 voci di perimetro su 14** | modello per-dente, 2 RPC atomiche, `PUT /api/lavori/[id]/denti`, sentinelle sui 7 campi, i due scrittori reindirizzati — tutti provati nel codice. E i moduli puri sono importati da **codice di produzione**, non solo dai test |
| **Parete delle cassette** (21/07) | ✅ **9 su 9** | 4 migration, 12 funzioni, route `/cassette`, sheet, drag, miniature, liberazione/riassegnazione, accesso globale |
| **Redesign parete/home** (23/07) | ✅ **12 su 12** | rete, gancetto, targa, ricerca «filtra e risali», due suoni, embed, linguetta, striscia. La sola voce revocata (il disambiguatore di targa) **ha un numero e un verbale** |
| **Accenti nei documenti** (03/08) | ✅ **10 su 10 + registro 3 su 3 + prove 5 su 5** | verificato **su documento vero uscito dalla produzione** |
| **Nome e cognome paziente, tappa 1** | ✅ perimetro **ridotto**, e la riduzione è dichiarata **tre volte** | «*chi legge questo piano fra sei mesi non deve credere che la lamentela ratificata sia stata risolta qui*» |
| **Un tema solo / sfondo unico** (26/07) | 🟡 **13 su 14** | manca **una decisione**, non del codice: il portale pubblico (sotto, §2.6) |

➡️ **L'ondata (b) è, per ora, un caso isolato.** Non è un modo di lavorare: è un incidente, ed è successo
in quella dove il perimetro è cresciuto in corsa.

---

## 2. 🔴 Quello che invece è emerso, in ordine di gravità

### 2.1 🔴 **D62 — il contratto che esce dal laboratorio promette una cosa che l'app ha smesso di fare**

**La decisione era stata presa da Francesco** (verbale, D62): correggere il DPA — il contratto sul
trattamento dei dati che i dentisti scaricano — perché prometteva la conservazione dei dati per «almeno 10
anni». Motivo: stava per arrivare la **cancellazione fisica** delle foto, e quella promessa l'avrebbe resa
un **inadempimento contrattuale nostro**, a prescindere dal MDR.

**Stato oggi, verificato a mano:**
- la cancellazione fisica **è in produzione** dal 02/08 — `src/app/api/lavori/[id]/immagini/[imgId]/route.ts:214`
  chiama `storage.from('documenti').remove(...)`, ed è raggiungibile dal menù ⋯ della scheda;
- il DPA **non è stato toccato**: `src/components/features/pdf/DpaTemplate.tsx:149` promette ancora
  «conservazione dei dati per almeno 10 anni … ai sensi dell'**Art. 10(8) MDR**», e lo ripete a `:169` e `:197`.

🛑 **Due errori in più, nello stesso documento, già accertati dal panel del 29/07:** ① l'**Art. 10(8) NON è
la norma dei dispositivi su misura** (è riservato ai dispositivi «diversi dai dispositivi su misura»; la
base giusta è **Art. 10(5) + Allegato XIII punto 4**); ② «almeno 10 anni» è scritto **piatto**, mentre per
gli **impiantabili** l'Allegato XIII punto 4 dice **15**.

✅ **Costa quasi nulla:** il documento **non è congelato** — `generate-dpa.ts` lo rigenera dal modello vivo a
ogni scarico, la rotta non persiste nulla, e la tabella `data_processing_agreements` ha **zero scrittori
applicativi**. Corretto il testo, la promessa cambia per tutti al prossimo scarico.

⚠️ **Perché è sfuggito:** D62 **era tracciata**, ma dentro il blocco «ONDATA (c) — da pianificare»
(`ROADMAP-UFFICIALE.md:919`), mentre la sua **precondizione** — «prima che la cancellazione fisica entri in
produzione» — veniva superata da un'altra ondata. 🔑 **Il rinvio più pericoloso non è quello dimenticato: è
quello scritto con una precondizione che poi nessuno controlla.**

### 2.2 🟠 **«Dimmelo a voce»: tre documenti vivi dicono tre cose incompatibili**

| dove | dice |
|---|---|
| verbale, **D13** | «**esce — del tutto.** Via dai tre passi del wizard, dalla vetrina, dal design system, e **il componente si cancella coi suoi test**» |
| `ROADMAP-UFFICIALE.md:506` | «✅ **FATTA** — `PillVoce.tsx` implementa la Web Speech API ed è **montata nei tre passi del wizard**» |
| `ROADMAP-UFFICIALE.md:61`, voce 4 | «Assistente vocale completo che sostituisca «Dimmelo a voce» (**oggi non funziona**)» |

**Il codice, verificato:** `src/components/ds/PillVoce.tsx` esiste, l'etichetta predefinita è ancora
«Dimmelo a voce» (`:69`), ed è montato in **tutti e tre** i passi (`PassoDentista.tsx:93`,
`PassoTipo.tsx:116`, `PassoPaziente.tsx:118`), più la vetrina. **D13 non è stata attuata in nessuna delle
sue parti** — coerente col fatto che apparteneva al perimetro dell'ondata (b) mai costruito, ma le due
righe di roadmap restano incompatibili fra loro **a prescindere**.
🛑 **Il rischio concreto:** la spec DS v3 **§5.15 lo prescrive ancora** in fondo a ogni passo del wizard —
chi costruirà le schermate nuove leggendola **lo rimonterà**, che è l'esatto contrario di ciò che Francesco
ha deciso («*sennò poi dobbiamo intervenire su tutti i punti dove lo inseriamo*»).

### 2.3 🟠 **Il design system — «unica fonte di verità per l'UI» — descrive cinque cose che il codice contraddice**

| DS v3 dice | il codice dice |
|---|---|
| §7.1 — «**Peek 28px** fisso e bilaterale» | `src/app/ds-v3.css:1563` — «**Morte del peek 28px**: ogni stanza occupa il viewport INTERO» |
| §5.35 — stato «**spenta**» (opacity .3 + desaturazione) | `is-spenta` → **0 occorrenze** in `ds-v3.css` (`is-accesa` invece vive) |
| §5.35 + §7.20 — targa con «n.{numero} · {dentista}» | la targa porta **dentista + paziente**, «mai il numero lavoro» |
| §7.20 — ricerca «**che accende**», le non-match si spengono | `PareteClient.tsx` — ricerca «**filtra e risali**», che ha sostituito la vecchia |
| §8.3.7 — coreografia «**L'accensione**» | idem |

E non sono mai entrate nella spec: rete disegnata, gancetto, linguetta. **La spec è stata revisionata due
volte da allora (rev. 3.3 e 3.4) senza correggerle**, e nessun documento registra la divergenza.
🔑 È la lezione della «voce 57» applicata al documento più normativo che abbiamo: **quando due documenti si
contraddicono vince quello letto per primo** — e questo è quello che si legge per primo.

### 2.4 🟠 **Tre decisioni dicono «voce propria», e la voce non è mai stata aperta**

| decisione | cosa spostava | dove è finita |
|---|---|---|
| **D5** | unione delle schede doppie + `/pazienti` in scrittura | solo in una riga di **changelog** datata 28/07 |
| **D1** | i due difetti della home | idem |
| **D98** | la galleria vecchia di `/lavori/[id]/modifica` | solo nell'handoff del 02/08 |

🔑 **Una voce di changelog datata non è un elenco di cose da fare, e nessuno la rilegge.** Una decisione di
*spostare* lavoro, se la destinazione non esiste, produce lo stesso effetto di una decisione di
*cancellarlo*.

### 2.5 🟠 **D36 — un riconoscimento costruito, pubblicato e collegato a nulla**

D36 rimandava «È lei: usa la sua scheda» a «T7+T15». **«T15» non compare in nessun elenco di cose da fare**
(ricerca su roadmap, memoria e backlog → zero righe fuori da un changelog). Intanto il motore esiste ed è
mergiato: `trovaOccupanteCodice` ha **un solo importatore, il suo test**. Resta codice morto accanto a un
avviso che chiede all'operatore di indovinare un codice libero.

### 2.6 🟠 **Il portale pubblico: un colore cotto a mano e una decisione mai presa**

La spec «un tema solo» §3.1(b) chiedeva di decidere in tappa 3 **oppure di dichiarare esplicitamente di non
seguire il tema**. Non è stato fatto né l'uno né l'altro: `src/app/portale/[token]/layout.tsx:15` porta
`'#F8F9FA'` scritto a mano, e la ricerca su roadmap, memoria e verbali dà **una sola riga**, in un handoff
del 26/07. È un rinvio senza destinazione — ciò che R-P6 vieta per gli identificatori.

### 2.7 🟡 **Documenti che negano un lavoro fatto** (l'inverso del difetto di oggi, e altrettanto pericoloso)

| dove | dice | verità |
|---|---|---|
| `memory/MEMORY.md`, tabella «API Routes Chiave» | tre route (`PATCH /api/lavori/[id]`, `POST /api/lavori`, `PUT /api/lavori/[id]/denti`) sono «🌿 ramo, **NON in produzione**» | sono in produzione dal 28/07 — **lo dice lo stesso file, altrove** |
| `ua-app/CLAUDE.md` §8 | ondata (a) «8 task su 13, **mai mergiata**» | mergiata il 28/07, `a3e52379`, 78 commit |
| `ROADMAP-UFFICIALE.md`, voce 1 (a) | «Fuori dal deploy, può seguire: **T11-bis**» | T11-bis è **dentro** il merge (`8d5e90ba`) |
| `ua-app/CLAUDE.md` §8 | il fondo pagina «vive in **tre** posti» | sono **quattro** (il quarto è `public/manifest.json`) — e **la correzione era già scritta** nel verbale del 26/07, mai propagata |
| spec «un tema solo», riga 3 | «Stato: approvato da Francesco, **da pianificare**» | tutte e tre le tappe in produzione dal 26/07 |
| spec «nome e cognome», §6 | il file della **scala** «creato dall'esecuzione si chiama `nome-paziente-scrittura.ts`» | falso: quel file è la regola di **scrittura** della tappa 1. Chi apre la tappa 2 crede che il lavoro sia già fatto |

**Perché conta:** chi legge «non è in produzione» tocca un contratto pubblicato credendolo di prova.

---

## 3. Che cosa impedisce che ricapiti — la rete, non il buon proposito

🔑 **Un audit è un documento, e i documenti invecchiano: è esattamente il difetto che stiamo auditando.** La
sola cosa che regge nel tempo è un controllo che gira da solo.

`scripts/guardia-coerenza-documenti.mjs` oggi controlla la coerenza **fra documenti** (conteggi, riferimenti,
voci fantasma, punto di ripresa). **Non può accorgersi che un documento e il codice si contraddicono** — ed è
lì che è passato il difetto di oggi.

> ✅ **SCELTE DA FRANCESCO E IN VIGORE dal 03/08/2026** — sono i **controlli 5 e 6** di
> `scripts/guardia-coerenza-documenti.mjs`, agganciati al pre-commit come gli altri quattro.
> **Tarati prima di scriverli** (la nota in testa a quel file dice che *una guardia che grida al lupo viene
> spenta*): il 5 accende su **1 voce su 10**, il 6 su **6 decisioni su 121** — e ogni riscontro del primo
> giro era un difetto vero, non un falso allarme.
> 🔑 **Provati rompendo, uno per controllo, e rimessi:** ① tolta la parola «eseguita» dalla spec degli
> accenti → rosso sulla voce 8; ② tolta la destinazione a **D62** → rosso su D62. Entrambi verdi dopo il
> ripristino. **FASE 7:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19** prove · `next build`
> uscita **0** — ⚠️ dichiarato: nessuno dei tre tocca uno script `.mjs`, quindi la prova vera sono i due
> rosso-poi-verde qui sopra.

**Le due regole nuove, entrambe meccanizzabili:**

1. **Una voce dichiarata ✅/🚀 porta il suo commit di merge, e ogni voce del suo perimetro porta una prova
   citabile (`file:riga`) o una riga di rinvio esplicita.** Senza, la guardia si accende. È il controllo che
   avrebbe fermato l'ondata (b): la spec elencava nove cose, il merge non ne toccava nessuna.
2. **Una decisione che rimanda lavoro deve nominare la sua DESTINAZIONE**, e la destinazione dev'essere una
   voce che esiste — non un changelog, non «T15», non «voce propria» senza voce. Stessa forma del controllo
   già attivo sulle «voci fantasma» della memoria, esteso ai verbali.

⚠️ **E la regola di processo che nessuno script può sostituire:** un rinvio con una **precondizione**
(«prima che X entri in produzione») va riletto **quando X accade**, non quando si apre l'ondata che lo
conteneva. È il caso D62, ed è l'unico difetto di questo audit che è arrivato fino a un documento a valore
legale.

---

## 4. Che cosa NON è stato verificato in questo round — dichiarato

- Le **140 decisioni una per una**: sono state filtrate su «cancella o rimanda **e** osservabile nel codice»
  (20 in filtro, 15 coerenti, 5 no). Le altre 120 non sono state provate: è il round 2.
- Le **57 spec** e i **93 file di `docs/roadmap/`** non sono stati letti tutti: gli handoff sono **documenti
  storici** — devono dire ciò che era vero allora — e auditarli produce rumore. Sono però il **veicolo**: la
  frase falsa di oggi è nata in un handoff ed è stata ereditata dalla roadmap.
- Lo **stato del database in produzione** (migration applicate) non è verificabile da qui: il collegamento
  Supabase non è autorizzato in questa sessione.
- **FASE 9 / collaudi nel browser** dichiarati nelle voci chiuse: non verificabili dal codice.
