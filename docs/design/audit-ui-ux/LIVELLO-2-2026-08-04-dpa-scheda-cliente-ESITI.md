# GATE ESTETICO L2 (FASE 9b) — superficie DPA della scheda cliente

> 🔴 **QUESTO È UN RIMEDIO, NON UN CANCELLO CHE HA RETTO.**
> La REGOLA ZERO dice «*MAI mergere una superficie UI nuova/modificata senza il GATE ESTETICO L2
> (FASE 9b)*». **La superficie è stata unita e pubblicata il 04/08/2026** (merge `35172e70`, 41 commit)
> **senza questo gate**: il piano dell'ondata non l'ha mai previsto — `provato:`
> `grep -c "9b\|GATE ESTETICO" ` sul piano → **1 hit, ed è un frammento di impronta** — e nessun
> esecutore né revisore l'ha visto, perché **la fase finale non era di nessun task**.
> Questo documento percorre il gate **a valle**. Non retrodata niente: la regola è stata disattesa, e
> ciò che segue è il modo di chiuderla senza dichiararla superflua.

| | |
|---|---|
| **Livello** | 2 — gate di fine ondata (`README.md` §Livello 2) |
| **Superficie** | blocco «Privacy — GDPR» in `src/app/(app)/clienti/[id]/page.tsx:312-368` |
| **Ondata** | registro delle emissioni del contratto ai dentisti — ondata 1 |
| **Checklist** | `CHECKLIST-DS-V3-UI-UX.md`, 12 sezioni |
| **Copertura** | **2 stati** × **390 · 768 · 1280** × **chiaro · scuro** = **12 combinazioni**, tutte percorse |
| **Scatti** | `docs/design/screenshots/2026-08-04-dpa-scheda-cliente/` — 12 a riposo + 12 di contesto + 12 col fuoco + 6 in fondo pagina + 2 dello stato d'errore |
| **Misure** | `docs/design/screenshots/2026-08-04-dpa-scheda-cliente/misure-prima.json` |
| **Data** | 04/08/2026 (serie dei documenti; l'orologio della macchina dice 2 agosto) |

---

## 0. 🛑 Come si applica una checklist v3 a una pagina v2.3 — si legge PRIMA della tabella

`clienti/[id]` è una **pagina legacy v2.3**, non ancora migrata. La regola di convivenza (DS v3 §14,
`ua-app/CLAUDE.md` §0) dice che **la migrazione è per route, MAI per componente**. Quindi tre criteri
della checklist — che sono criteri *di sistema*, non *di qualità* — **non si applicano qui**, e vanno
marcati N/A **con la loro ragione**:

| criterio | esito | perché |
|---|---|---|
| §4 «Plus Jakarta Sans ovunque» | **N/A** | v2.3 usa **DM Sans**. `misurato:` `"DM Sans", sans-serif` su tutti e quattro gli elementi. Portare Plus Jakarta su questo solo blocco **violerebbe** la regola per-route |
| §5 «solo token v3 / `ds-v3.css`» | **N/A** | la pagina non monta `[data-ds="v3"]`. I token corretti qui sono `src/design-system/tokens.ts` + `globals.css` |
| §6 «motion da `v3/motion.ts`» | **N/A** | idem. ⚠️ **Il divieto di valori inline resta e vale a pieno**: verificato, il blocco **non ha** `duration`/easing/cubic-bezier inline (non ha animazioni affatto) |

🔑 **Perché sta scritto in testa e non in nota:** se questi tre finissero in tabella come ❌, il primo
che legge li «aggiusta» e **rompe la regola di convivenza**. Un N/A senza ragione accanto è un difetto
travestito.

**Tutti gli altri nove criteri si applicano a peso pieno**, giudicati contro v2.3 — compresa **la metà
del §5 che riguarda il contrasto**, che non dipende da quale design system sia in vigore.

---

## 1. Esiti — 12 sezioni

**Legenda:** ✅ conforme · ⚠️ da migliorare (Minor) · ❌ difetto · N/A.

| § | sezione | esito | prova |
|---|---|---|---|
| **1** | Layout & allineamento | ✅ | `misurato:` i quattro elementi hanno **tutti `x = 36`** — descrizione, tasto, riga emissione, frase. Card `x = 36`, larghezza `318` a 390px → margini **36 / 36**, simmetrici. Titolo, filetto e contenuto sulla stessa colonna |
| **2** | Proporzioni & spazio | ⚠️ | Ritmo verticale **10 → 6 → 6 px**: coerente ma **stretto sotto il tasto**, dove la riga «Ultima emissione» si attacca otticamente al bottone invece di leggersi come fatto separato. 🔴 **E a 1280 la card è larga `1208 px`** per un contenuto che ne occupa ~250: **spazio morto su tutta la banda destra**. ⚠️ **Di PAGINA, non di questa ondata** — nessuna card di `clienti/[id]` ha un `max-width` → **deferito**, v. §3 |
| **3** | Sovrapposizioni & z-index | ✅ | `provato:` sonda a **pagina scorsa in fondo**, 3 viewport × 2 temi → **0 collisioni**. La barra inferiore è `position: sticky` (`.ua-bottom-nav`, z 50): **partecipa al flusso**, non copre. L'unico altro flottante è il tasto avatar (z 60, in alto a destra), che non interseca mai la card. ⚠️ **Uno scatto agli atti sembra dire il contrario, e va letto sapendo cosa mostra:** in `prima-con-emissione-768-chiaro-contesto.png` la barra **sta sopra** la riga «Ultima emissione». È lo stato **di passaggio** a metà scorrimento — la barra è appiccicata al bordo e il contenuto le scorre sotto, che è il suo comportamento previsto. **A fine scorrimento**, cioè dove l'utente si ferma per leggere il blocco, il fondo della card è a **664 px** su un viewport di **844** (390) e a **844 su 1024** (768): libero |
| **4** | Tipografia & gerarchia | ✅ (+N/A §0) | `misurato:` 13px/400 (descrizione) · 14px/**700** (tasto) · 11px/400 (emissione) · 11px/400 (frase). Interlinea 1,5. **Nessun troncamento** (`scrollWidth ≤ clientWidth` su tutti e quattro) e **nessun clip verticale**. A 390 la descrizione va a 2 righe e la frase a 3; a 768 e 1280 tutte a 1 riga |
| **5** | Colore, contrasto, tema | ❌ | 🔴 **In SCURO due testi su tre falliscono WCAG AA.** `misurato:` sul fondo **vero** (la card `#232018`, non `--bg`): frase di conservazione (`--t3`) **2,24 : 1** · riga «Ultima emissione» (`--t2`) **4,45 : 1** — minimo **4,5**. ✅ In chiaro passano tutti: **4,84** · **7,90** · **7,90**. ✅ Tasto **5,30** chiaro e **4,72** scuro. ✅ Nessun hex crudo: solo `var(--token, fallback)` col fallback pari al token. → **P16, aggravata: le righe sono DUE, non una**. Dettaglio e decisione in §2 |
| **6** | Motion & micro-interazioni | ✅ | Il blocco **non ha animazioni**: nessun `duration`, easing o cubic-bezier inline (`misurato:` `transition` computato = valore iniziale). Niente da rispettare per `prefers-reduced-motion` perché non c'è moto. Stato di fuoco presente (§11) |
| **7** | Suono & haptic | ⚠️ | Il tasto **non ha né suono né haptic**. ⚠️ **Ma è COERENTE con la pagina**, e la coerenza è ciò che la checklist chiede: `provato:` su **6** componenti della scheda cliente **uno solo** usa il feedback (`PortaleLinkButtons.tsx:82`, `hapticLight`). Aggiungerlo a questo tasto e basta renderebbe la pagina **meno** coerente → **deferito** all'ondata di migrazione a v3 della route, che porterà lo strato di feedback per intero |
| **8** | Touch target & interazione | ✅ | `misurato:` tasto **171,63 × 44 px** su tutti e tre i viewport → **≥ 44 px**, invariante alla larghezza. Nessun altro bersaglio tappabile nel blocco: **nessuna ambiguità di bersaglio** |
| **9** | Stati (empty · loading · error · disabled) | ❌ | 🔴 **Lo stato d'ERRORE mostra al titolare una stringa tecnica grezza.** Il tasto è un `<a href>` **nudo**: la pressione è una **navigazione**, non una fetch. `provato:` con un id di cliente inesistente il browser atterra su una pagina che contiene letteralmente `{"error":"Cliente non trovato"}`, **titolo vuoto**, **zero elementi interattivi** — nessuna via di ritorno se non il tasto indietro del browser, che in una PWA installata può non esserci. Scatto: `prima-errore-scarico-390-{chiaro,scuro}.png`. ⚠️ **E lo stato VUOTO non si distingue da un guasto di lettura**: se il registro non è leggibile, `page.tsx:169-171` scrive nel log e **non rende la riga** — esattamente come per uno studio mai emesso. Chi guarda vede la stessa cosa in due situazioni opposte. **Loading:** N/A, il blocco è reso dal server. **Disabled:** N/A, il tasto non ha stato disabilitato |
| **10** | Responsive (3 viewport) | ✅ / ⚠️ | ✅ `provato:` **nessuno scorrimento orizzontale** su 390 · 768 · 1280 (`scrollWidth == clientWidth` in tutte e 12 le combinazioni). ✅ 390 card-first, 768 corretto. ⚠️ 1280: v. §2, spazio morto — stesso difetto, stessa deferizione |
| **11** | Accessibilità | ✅ | `misurato:` nome accessibile = testo visibile («Scarica DPA PDF»), **nessun `aria-label` divergente** → WCAG 2.5.3 rispettato · icona `aria-hidden="true"` · **`:focus-visible` presente e visibile** (`a.matches(':focus-visible')` → **true** in tutte e 12; anello raggiunto alla **9ª tabulazione**, elemento nel viewport). Scatti: `*-fuoco.png`. ⚠️ Nota: l'anello è quello **predefinito del browser**, non un anello del DS — accettabile su v2.3, che non definisce un anello proprio · `lang="it"` sul documento |
| **12** | Copy & microcopy | ✅ | Italiano corretto, accenti compresi («**UÀ**»); tono coerente; nessun segnaposto; nessun gergo verso l'utente. ⚠️ Minore: la frase «*Ogni versione emessa resta conservata da UÀ*» compare **anche su uno studio a cui non è mai stato emesso niente** — non è falsa (è un'affermazione generale) ma in quel contesto non dice nulla all'utente |

**Conteggio:** ✅ **7** · ⚠️ **2** (§2, §7) · ❌ **2** (§5, §9) · N/A **3 criteri** (dentro §4, §5, §6) — v. §0.

---

## 2. I due ❌ — che cosa si fa

### ❌ §5 — In modo scuro il contratto promette e non si legge (**P16, ampliata**)

**Il fatto misurato**, sul fondo vero della card (`#232018`), non su `--bg`:

| riga | token | scuro | chiaro | esito |
|---|---|---|---|---|
| «*Stampa e firma… Ogni versione emessa resta conservata da UÀ*» | `--t3` | **2,24** | 4,84 | ❌ **fallisce di netto** |
| «*Ultima emissione: DPA-2026-0001 — 2 agosto 2026*» | `--t2` | **4,45** | 7,90 | ❌ **fallisce di un pelo** |
| «*Accordo di Responsabile del Trattamento…*» | `--t2` | 4,45 | 7,90 | ❌ stessa riga di sopra |
| tasto «Scarica DPA PDF» | bianco su `--primary` | 4,72 | 5,30 | ✅ |

🔑 **La voce P16 in roadmap dice «la frase»: le righe sono DUE**, perché `--t2` a 4,45 è **sotto** il
minimo di 4,5 tanto quanto `--t3` — solo di poco. E `--t2` porta il **numero del contratto**, cioè il
fatto che rende dimostrabile l'emissione.

🛑 **E il difetto è più largo di questa pagina.** I due token dark falliscono anche altrove:

| valore | su card `#232018` | su fondo `#171411` | su elevato `#2C2A27` |
|---|---|---|---|
| `--t2` `#8A8580` (v2.3 scuro) | **4,45** ❌ | 5,02 ✅ | **3,92** ❌ |
| `--t3` `#5A5652` (v2.3 scuro) | **2,24** ❌ | **2,52** ❌ | **1,97** ❌ |

`provato:` `--t3` compare **120 volte in 52 file**, `--t2` **322 volte in 91 file**. **Non è una riga:
è il listino dei testi in modo scuro di tutta la parte legacy dell'app.**

🔑 **E la correzione esiste già, fatta una volta, altrove.** Il design system v3 ha attraversato
*questo stesso* difetto e l'ha risolto — `src/design-system/v3/tokens.ts:15`, con il motivo scritto
accanto: «*faint: rev. 3.1 — era `#6E6457` (WCAG fail)*». I valori v3 scuri, misurati sul fondo card
di v2.3:

| valore v3 | su card `#232018` | su fondo `#171411` | su elevato `#2C2A27` |
|---|---|---|---|
| `muted` `#A69B8C` | **5,95** ✅ | 6,72 ✅ | 5,24 ✅ |
| `faint` `#928778` | **4,61** ✅ | 5,21 ✅ | 4,06 ❌ |

**➡️ Decisione da portare a Francesco — NON eseguita in questo gate.** Le opzioni sono tre, e la
seconda è già esclusa dalle misure:

- **(A) Allineare i token scuri v2.3 a quelli v3**, `--t2 → #A69B8C` e `--t3 → #928778`. Ripara il modo
  scuro di **tutta** la parte legacy in un colpo, e **converge** i due sistemi invece di allontanarli —
  ha un precedente ratificato, l'unificazione del fondo del 26/07 (`2026-07-26-sfondo-unico.md`).
  🛑 **Costo vero:** tocca la resa di 91 + 52 file, quindi **vuole il suo panel e il suo giro visivo**,
  non un commit di sfuggita. E `#928778` resta **sotto soglia sull'elevato** (4,06): va deciso se `--t3`
  possa vivere su `--elv`.
- **(B) Correggere solo questo blocco** — ❌ **non praticabile**: `misurato:`, **nessun token di testo
  v2.3 scuro passa su quella card** tranne `--t1` (14,06), che come corpo minuto distruggerebbe la
  gerarchia. L'unica strada sarebbe un colore letterale in linea, cioè un'isola fuori dal listino:
  vietato dalle istruzioni permanenti.
- **(C) Deferire**, lasciando P16 aperta fino all'ondata di migrazione a v3 di questa route — è la sede
  che la roadmap indica oggi. Costo: la promessa contrattuale resta illeggibile in modo scuro fino ad
  allora.

### ❌ §9 — Quando lo scarico fallisce, il titolare finisce su una pagina di codice

**`provato:`** navigando a `/api/clienti/<id inesistente>/dpa` con la sessione vera:
`HTTP 404` · `content-type: application/json` · testo visibile a schermo:
`{"error":"Cliente non trovato"}` · **titolo vuoto** · **0 elementi interattivi**.

**Non è un caso di laboratorio.** La rotta ha **quattro** cammini che non sono guasti del servizio
(`route.ts:66-69`: due per la Partita IVA mancante, due per «non trovato») e **sette** che lo sono. Il
più probabile in campo è il **422 dei dati fiscali incompleti**: un laboratorio che non ha ancora messo
la Partita IVA lo incontra **al primo tentativo**, e quello che vede è una schermata bianca con una
graffa.

🛑 **Non si corregge dentro un gate estetico, e la ragione è la sua stessa forma.** La cura non è un
colore: è **cambiare il modo in cui il tasto scarica** — da navigazione a richiesta con esito gestito,
cioè trasformare un elemento server in un componente client con i suoi stati. È un cambiamento di
comportamento su una **superficie in produzione**, e va progettato: quale messaggio, dove appare, che
cosa si può fare dopo. → **voce nuova, sede naturale l'ondata 2**, che rimette comunque mano a questi
stati per la firma.

⚠️ **La seconda metà della stessa sezione** — vuoto e guasto di lettura indistinguibili
(`page.tsx:169-171`) — è **la stessa famiglia** e si progetta insieme: entrambe nascono dal fatto che
questo blocco non ha un modo di *dire* qualcosa all'utente.

---

## 3. I due ⚠️ — deferiti, col motivo

| ⚠️ | motivo della deferizione |
|---|---|
| **§2 / §10 — spazio morto a 1280** (card `1208 px`) | ⚠️ **Non è della superficie: è della pagina.** `misurato:` **nessuna** card di `clienti/[id]` ha un `max-width`; il difetto è identico su Anagrafica, Dati fiscali, Commerciale, Portale. Metterne uno **solo** su questa card la renderebbe l'unica diversa, cioè un difetto di allineamento al posto di uno di proporzione (§1). Sede: **l'ondata di migrazione a v3 della route**, che ridisegna il contenitore |
| **§7 — nessun suono né haptic sul tasto** | ⚠️ **La coerenza chiede di non farlo adesso.** `provato:` su 6 componenti della scheda cliente **1** usa il feedback. Il blocco è **allineato alla pagina**; l'isola sarebbe l'aggiunta. Sede: la stessa ondata di migrazione, che porta lo strato di feedback per intero |

---

## 4. 🔎 Fuori mandato — si riferisce, non si corregge (R-E2)

**La scheda cliente ha un disallineamento di idratazione**, e non è del blocco DPA.
`PortaleLinkButtons.tsx:134-137` calcola l'indirizzo di base come
`typeof window !== 'undefined' ? window.location.origin : 'https://uachelab.com'`: il server stampa
sempre `uachelab.com`, il client stampa l'origine **vera**. `provato:` in locale React solleva
«*Hydration failed because the server rendered text didn't match the client*» e **rigenera il sottoalbero**.

⚠️ **In produzione oggi non morde** — le due origini coincidono — **ma morde su qualsiasi altra origine**:
un rilascio di anteprima Vercel, un dominio di prova, un accesso dall'indirizzo di rete locale. E ciò che
diverge è **il collegamento che il laboratorio condivide col dentista**: per un istante è uno, dopo
l'idratazione è un altro. → **da aprire come voce propria.**

---

## 5. Che cosa questo gate NON ha coperto

- **Non ha guardato l'indirizzo di produzione** — ma **ha misurato il codice che è in produzione**.
  `provato:` all'inizio del gate `main` = **`7d6ee54c`**, albero **pulito**, **0 commit da pubblicare**:
  ciò che gira in locale è **lo stesso commit** che serve `uachelab.com`, e la banca dati è **la stessa**
  (progetto `iagibumwjstnveqpjbwq`). L'unica differenza è l'**host**. La ragione della scelta è scritta
  nell'handoff: un giro L2 sono decine di caricamenti, e in produzione dopo ~40 richieste Vercel accende
  la sfida anti-bot e tutto risponde 403.
  ⚠️ **Una cosa che l'host cambia davvero**, ed è il ritrovamento §4: il disallineamento di idratazione
  di `PortaleLinkButtons` **esiste solo perché l'origine locale è diversa** da quella compilata. In
  produzione le due coincidono e non si vede — è per questo che è un difetto **latente**, non un difetto
  del locale.
- **Non ha percorso i cammini d'errore 422 e 500** con dati veri: richiederebbe di **scrivere** sul banco
  (togliere la Partita IVA al laboratorio). Il 404 è stato scelto perché è l'unico raggiungibile **senza
  scrivere niente**, e mostra la stessa forma di risposta degli altri (`route.ts:70-72` — un solo ramo per
  tutti gli `ErroreDatiDpa`).
- **Non ha misurato su un dispositivo vero**, solo su emulazione di viewport. I bersagli tappabili sono
  misurati in pixel CSS, che è ciò che la regola dei 44 px chiede.
- 🛑 **NON esiste il giro «dopo», e lo strumento che ha fatto il «prima» NON sopravvive.** Tutti gli
  scatti si chiamano `prima-*`, il che promette un `dopo` che oggi non c'è: i due ❌ sono stati
  **portati come decisione** (P16 → **D134**, si deferisce) e **aperti come voce** (P17), non corretti.
  Lo script che ha prodotto misure e scatti stava in `scripts/tmp/`, che è **ignorato da git**: non è
  nel repo e non ci sarà. **Quando l'ondata 2 correggerà P17 su questa stessa superficie, il giro
  «dopo» va riscritto.** La ricetta, perché non si riparta da zero: due studi (uno **con** emissione,
  uno **mai emesso**) × 390·768·1280 × chiaro·scuro; accesso al banco con un link monouso; il tema si
  fissa scrivendo `ua-tema` nella memoria del browser, non affidandosi al sistema; e 🔑 **la sonda dei
  contrasti misura il fondo EFFETTIVO risalendo dall'elemento stesso** — non `--bg`, e non partendo dal
  padre, o il tasto rosso risulta 1,32 anziché 5,30.

---

## 6. Stato del gate

**PERCORSO.** 12 sezioni × 2 stati × 3 viewport × 2 temi, con scatti su disco e misure numeriche.
**2 ❌** — entrambi **portati come decisione**, nessuno corretto di sfuggita (R-E2).
**2 ⚠️** — entrambi **deferiti col motivo scritto**, come il framework consente.
**1 ritrovamento fuori mandato** — riferito.

🔑 **E ha chiuso per strada la §0 ⑦ dell'handoff:** lo stato «con emissione» della scheda cliente
**non era mai stato guardato**. Adesso lo è, in sei combinazioni, e la riga «Ultima emissione:
DPA-2026-0001 — 2 agosto 2026» è **vista**, non solo dedotta dal codice — data compresa, nel fuso di
Roma come deve.
