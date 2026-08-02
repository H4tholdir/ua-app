# Handoff — P17: il codice è scritto e verde, ma la pagina nessuno l'ha ancora GUARDATA

> 🔄 **SUPERATO NELLA §0, il 02/08/2026 in serata — si legge PRIMA del resto.**
> **Il Task 5 è stato ESEGUITO:** collaudo dal vivo (documento **scaricato davvero**, nome
> **`DPA-2026-0001.pdf`**, **nessun numero bruciato**) e **FASE 9b percorsa** — 8 stati × 390·768·1280 ×
> chiaro·scuro, scatti e misure in `docs/design/screenshots/2026-08-02-p17/`, referto in
> `docs/design/audit-ui-ux/LIVELLO-2-2026-08-02-p17-scarico-dpa-ESITI.md`.
> ✅ **Le QUATTRO cose di §0 ② sono state raccolte tutte e quattro:** il bordo `--t3` **corretto**
> (ed erano **quattro** comandi, non tre) · l'altezza 34px → **40px, D167** · il fondo scuro del «guasto»
> **misurato e deferito col numero** · «Ricarico…» in `role="alert"` **corretto** (`aria-atomic="false"`).
> 🛑 **Resta vero tutto il resto**, §0 ③ ④ ⑤ ⑥ compresi, e resta vero che **il ramo non è unito**.
> 🔑 **Questa riga sta qui e non solo altrove** perché quando due documenti si contraddicono vince quello
> letto per primo: un handoff che continua a dire «*nessuno ha guardato la pagina*» manderebbe la sessione
> successiva a rifare un gate già fatto.

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** 🛑 **NON `main`.** Si lavora su **`p17-scarico-che-fallisce`** = **`299043ed`**, albero
**pulito**, **15 salvataggi da pubblicare**. ✅ **NIENTE di questo è in produzione**, ed è voluto.
**Riferimento misurato ADESSO** (i tre comandi, eseguiti in chiusura): `tsc` **0** · `vitest` **4439 passate |
19 saltate** (379 file | 3 saltati) · `next build` **uscita 0** · **due guardie verdi**.

> 📅 **SECONDO handoff del 2 agosto**, e il primo è `2026-08-02-p7-in-produzione-e-la-deriva-delle-date-handoff.md`.
> `provato:` `date` → `Sun Aug 2 22:03 CEST 2026`. ⚠️ **Si chiama «sera» per una ragione pratica:** ordinato
> per nome, `p17` finirebbe **prima** di `p7` (perché `1` < `7`), cioè il documento più nuovo sembrerebbe il
> più vecchio. **Non è pedanteria: è la stessa famiglia di trappola delle date, D155.**

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① 🔴 **P17 NON È FINITA: nessuno ha ancora APERTO la pagina**

`provato:` `ls docs/design/screenshots/ | grep -i p17` → **nessuna cartella**. Il **GATE ESTETICO L2**
(FASE 9b) **non è stato eseguito**, e con esso il **collaudo dal vivo**: la scheda non è mai stata aperta a
390 · 768 · 1280 in chiaro e scuro, e **il documento non è mai stato scaricato davvero**.

🛑 **Quindi il ramo NON si unisce.** Su **questa stessa superficie** quel cancello è già stato saltato una
volta (04/08, e ci è voluta una sessione di rimedio). ⚠️ **È il Task 5 del piano, e non è stato nemmeno
iniziato** — non è una dimenticanza: **D166**, deciso da Francesco, perché il gate estetico chiede di
**guardare** e la stanchezza fa non vedere.

🔑 **Attenzione a come si legge «4439 prove verdi»:** dice che il codice fa ciò che i test chiedono. **Non dice
che sullo schermo si veda bene**, né che il PDF arrivi col nome giusto su un telefono vero. Le due cose non si
sostituiscono.

### ② 🔴 **Quattro cose sono state RIMANDATE al gate estetico — e il gate non c'è stato**

Trovate dagli esecutori e **riferite, non corrette** (R-E2). ⚠️ **Se il gate non le raccoglie una per una,
spariscono:** un rilievo rimandato a un cancello che non scatta è un rilievo perso.

| | cosa | dove |
|---|---|---|
| **a** | il **bordo `--t3`** di un comando dà **1,72:1 in scuro** (WCAG 1.4.11 chiede **3:1** al confine di un comando). **TRE occorrenze**: tasto dell'azione · tasto principale inerte · tasto «Ricarica». 🛑 **Non è P16** — P16 è sul *testo*, questo è un *bordo* | `BloccoAvviso.tsx` · `ScaricaDpaButton.tsx` |
| **b** | il tasto dell'azione è alto **34px**, il vincolo del piano dice **≥ 44px**. ⚠️ Il mockup approvato dice 34 **di proposito**, per distinguerlo dal tasto principale — e WCAG 2.5.8 AA chiede 24×24, quindi **non è una violazione**: è una scelta da confermare guardandola | `BloccoAvviso.tsx` |
| **c** | il fondo del tipo «guasto» **in modo scuro** resta quello chiaro: il mockup ne ha **due**, un solo stile in linea non può renderne due. **Vuoto dichiarato**, composto `53,29,23` invece di `63,28,24` | `BloccoAvviso.tsx` |
| **d** | l'etichetta «Ricarico…» dentro un blocco `role="alert"`: un lettore di schermo **probabilmente riannuncia l'intero blocco** a ogni pressione — e succede a chi è già bloccato. Stato **non coperto dal mockup** | `BloccoAvvisoRicarica.tsx` |

### ③ 🟠 **Il mockup approvato mostra un tasto CHE NON ESISTE PIÙ**

`provato:` `grep -c "Aggiungi il dato" docs/design/mockups/2026-08-02-p17-scarico-dpa.html` → **1**.
Quel tasto è stato **tolto da D165** perché sarebbe stato **morto**. Il mockup **non** è stato riscritto (è un
documento storico: registra ciò che è stato approvato *in quel momento*), e la correzione vive **solo** nel
documento di decisione.
🔑 **Chi rilegge il mockup senza il documento accanto disegnerà di nuovo un tasto che non funziona.**

### ④ 🟡 **La frase falsa al dentista è ancora viva — ma NON è più FASE 1**

`provato:` `grep -c "per contratto" src/components/features/pdf/DpaTemplate.tsx` → **1**.
🔄 **Cambiata di stato oggi:** **D156** l'ha spostata in **FASE 2** come **P19-d**, da fare **insieme a
P19-a**. ⚠️ **Non è stata rimandata per stanchezza: è stata rimandata perché la premessa che la rendeva urgente
era FALSA** — quel PDF non raggiunge nessuno. **Non riaprire la questione senza leggere D156.**

### ⑤ 🔴 **Le tre cose di Francesco: invariate**

🔴 **P24** il piano Vercel vieta l'uso commerciale · 🔴 **P20** il piano Supabase gratuito non ha copie
ripristinabili · 🔴 **D140** UÀ non esiste come soggetto giuridico. **Nessuna è codice, nessuna è stata
toccata.**

### ⑥ Restano intatte, dagli handoff precedenti

**P28** (un laboratorio che ha emesso un contratto non si può cancellare) · **P27** · **P26** · **P25** ·
**P16** (deferita, D134) · **P18** · **P9 · P10 · P11 · P12 · P13 · P15** · la spec **P19-a** mai riletta ·
il **ripristino vero mai provato** · **AUD-1…AUD-5** · il **round 2** dell'audit.

---

## 1. Che cosa è successo

| | |
|---|---|
| 🔨 **P17 scritta per intero, e nulla è in produzione** | **5 esecutori freschi** (R-E1), uno per compito, con revisione fra l'uno e l'altro. `provato:` 15 salvataggi sul ramo, albero pulito |
| 🛡️ **I quattro pezzi** | ① **codice d'errore** leggibile a macchina su unione chiusa (`CodiceDatiDpa`) — il compilatore obbliga ogni `throw` a scegliere · ② **`BloccoAvviso`**, presentazione pura v2.3 che **non sa di DPA** (ereditabile, D162) · ③ **`ScaricaDpaButton`**, il tasto vivo che **conserva il nome del file** · ④ la **pagina** legge il ruolo e i dati fiscali del laboratorio, e la riga «ultima emissione» dice **tre** cose invece di due |
| 🔎 **DICIASSETTE difetti del piano trovati dagli esecutori** | e **nessuno è arrivato al codice finale**. Fra i più gravi: un colore che sullo schermo sarebbe stato **diverso da quello approvato** (P29) · un tasto che sarebbe stato **morto** (D165) · un file di prova **dimenticato due volte su due** · un guasto di lettura che sarebbe diventato **un'accusa all'utente** («mancano i tuoi dati» quando i dati ci sono) |
| ✍️ **Undici decisioni** | **D156** nessuno usa la PWA · **D157** si parte da P17 · **D158** il tasto sparisce a chi non può usarlo · **D159** prevenire + raccontare · **D160** a chi non è titolare resta il riquadro · **D161** variante «a blocco» · **D162** costruita per essere ereditata · **D163** la spec passa al piano senza rilettura · **D164** esecutori freschi · **D165** si costruisce la pagina di modifica del dentista · **D166** si completa il codice, poi si chiude |
| 🆕 **Due voci nuove di roadmap** | **P29** (una parola, due colori) · **P30** (la scheda del dentista non ha una pagina di modifica) |
| 📐 **Il percorso §0B, per intero** | ricerca delle buone pratiche (2 fonti) → mockup → **12 scatti** (390·768·1280 × chiaro·scuro × 2 varianti) → **approvazione di Francesco** → codice |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① «È IN PRODUZIONE» E «QUALCUNO LO STA USANDO» SONO DUE FATTI DIVERSI.** Per **tre sessioni** la frase falsa
del contratto è stata trattata come urgente perché «*l'app la produce OGGI*». `provato:` **3 laboratori, tutti
di prova**; quel PDF non è mai arrivato a un dentista. **Francesco l'ha smontata in una riga** — «*non la sta
usando e non la userà nessuno finché non andremo in distribuzione*». 🔑 **Stessa forma della deriva delle date
(D155): una premessa tramandata e mai confrontata con un fatto.** Due volte in due giorni.

**② UN TASTO DISEGNATO SEMBRA SEMPRE UN TASTO CHE FUNZIONA.** Il mockup approvato aveva un «Aggiungi il dato»
che in produzione **non avrebbe fatto niente**: il pannello di modifica del dentista non ha indirizzo. Nessuno
poteva vederlo **guardando** — è saltato fuori solo quando qualcuno ha provato a **collegarlo**. 🔑 **Un
mockup prova che una cosa si vede bene, mai che si possa fare.**

**③ UN ABBOZZO INERTE SUPERA OGNI PROVA CHE CHIEDE UN'ASSENZA.** Il conteggio delle asserzioni (R-P4) è stato
previsto **quattro volte** e sbagliato **due**: sempre nella stessa direzione, perché il piano contava su ciò
che l'abbozzo *serve a fare* invece che su ciò che *fa*. 🔑 **Le prove a forma di «non deve succedere X» sono
le più facili da scrivere e le più deboli**, e un abbozzo vuoto le supera tutte.

**④ LA TRAPPOLA PEGGIORE È QUELLA IN CUI IL NOME È GIUSTO.** `amber` nei token vale `#F59E0B`, `--amber` nel
foglio di stile vale `#FD7E14` (P29). Chi apre i token — dichiarati «**fonte di verità**» — scrive
`var(--amber)` in perfetta buona fede e ottiene **un altro colore**. ⚠️ E il piano scriveva
`var(--amber, #F59E0B)`: **un nome e un ripiego che non concordano fra loro**, la forma peggiore, perché in
locale il ripiego non si vede mai. **Preso campionando il pixel dello scatto approvato.**

**⑤ UNA CONCLUSIONE GIUSTA PER LA RAGIONE SBAGLIATA REGGE FINCHÉ NESSUNO LA VERIFICA.** Avevo scritto che il
ruolo viene «*dai claim del token*»: falso (`lab-context.ts:34-45` legge la tabella `utenti` a ogni
richiesta). La **conclusione** era giusta — nascondere il tasto non sostituisce il controllo della rotta — ma
poggiava su un meccanismo inventato. 🔑 **Crolla nel momento peggiore: quando qualcuno ci costruisce sopra.**

**⑥ IL FILE DIMENTICATO È UNA PROVA — DUE VOLTE SU DUE.** Il censimento del piano aveva elencato i `throw` ma
non i **costruttori** (le prove ne creano altri tre), e più avanti una prova di pagina il cui finto di banca
dati **esplode** su ogni tabella sconosciuta. 🔑 **Chi censisce «dove il codice cambia» dimentica «dove il
codice è chiamato», e i test sono chiamanti.**

**⑦ UN'AFFERMAZIONE NELL'AUTOREVISIONE PUÒ FARE PIÙ DANNO DI UN ERRORE NEL CODICE.** La mia autorevisione del
piano diceva «*in questo repo non ci sono prove di componenti server*». **È falsa**, e non è stata gratis: è
la frase che ha fatto uscire un task **senza un solo passo di prova**. 🔑 **Una riga che dichiara un vuoto
chiude la ricerca di chi legge.**

**⑧ CERCARE IL PRECEDENTE SERVE A SMONTARE L'IDEA.** L'unico scarico via `fetch` del progetto
(`PacchettoConsegnaSheet.tsx:264`) **si fabbrica il nome del file a mano**: il precedente **confermava il
rischio**, non la soluzione. Seguirlo avrebbe disfatto in silenzio una riparazione già pagata e misurata sui
tre motori.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **Il Task 5 di P17**: collaudo dal vivo · **FASE 9b** · BP-1 · poi merge. **Senza questo P17 non è finita e il ramo non si unisce** | §0 ① · piano Task 5 |
| 🔴 **2** | **Le quattro cose rimandate al gate** (bordo `--t3` ×3 · altezza 34px · fondo scuro del «guasto» · «Ricarico…» in `role="alert"`) | §0 ② |
| 🟠 **3** | **P30** — la pagina di modifica del dentista non esiste (**D165**: si costruisce). ⚠️ Pagina nuova → §0B per intero + FASE 9b | roadmap · **D165** |
| 🟠 **4** | **P29** — una parola, due colori. **Su P17 è corretto, la trappola resta armata** per la prossima superficie | roadmap |
| 🟠 **5** | **P28** un laboratorio che ha emesso un contratto non si cancella · **P27** · **P25** · **P26** | roadmap |
| 🟠 **6** | **La FASE 1 prosegue:** **P16 · P18 · P9 · P13 · P11** · la DdC orfana · il buono che non si rigenera · **P6 · P8 · P14 · P4 · P15 · P5 · P23** | roadmap, FASE 1 ② e ③ |
| 🟠 **7** | **Le tre cose di Francesco:** **P24 · P20 · D140** · e la **spec P19-a** che aspetta la rilettura | §0 ⑤ |
| 🟡 **8** | Il mockup di P17 mostra un tasto tolto da D165 | §0 ③ |
| 🟡 **9** | `route.ts` e `page.tsx` hanno **commenti riscritti oggi** perché erano diventati falsi col tasto vivo: **riletti e corretti**, ma è la classe di difetto che quel file ha già pagato due volte | `route.ts:39,95` |
| 🟡 **10** | Rumore `Not implemented: navigation to another Document` nella suite: **preesistente**, colpevole **non identificato**, `provato:` presente anche togliendo i file di P17 | — |

---

## 4. Da dove ripartire

**🔨 Si finisce P17 — il Task 5 del piano `docs/superpowers/plans/2026-08-02-p17-scarico-dpa.md`.**

1. **Collaudo dal vivo** (D103: le credenziali sono in `.env.local`, non si chiede il permesso). Percorrere:
   dati completi → **scaricare davvero e guardare il NOME del file** · cliente senza dati fiscali → tasto
   inerte · i tre casi della riga «ultima emissione».
2. **FASE 9b — gate estetico L2**, con le **quattro** cose di §0 ② raccolte una per una, scatti prima/dopo in
   `docs/design/screenshots/2026-08-02-p17/`.
3. **BP-1** (memoria + roadmap), poi **merge e pubblicazione** — 🛑 **solo se Francesco lo autorizza**.
4. 🛑 **P17 si dichiara chiusa SOLO se tutto è verde**; altrimenti «eseguita in parte» **col motivo**, come P7.

**Poi:** **P30** (la pagina di modifica del dentista, D165) oppure il resto della **FASE 1**.
🛑 **La FASE 2 non si tocca finché la FASE 1 non è finita** (D144), eccetto le **tre azioni di Francesco**.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/SESSION_ACTIVE.md` e la **testa** di `memory/MEMORY.md` (è grosso: si legge la testa).
- 📅 **`CLAUDE.md` §0F — LA DATA SI LEGGE DALL'OROLOGIO** (`date`), mai dal documento precedente.
  ⚠️ **E il nome deve ORDINARE bene:** `p17` finisce prima di `p7` — è la ragione del «sera» in questo titolo.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centosessantasei** decisioni in
  **cinquantasei** tornate. La prossima è **D167**.
- **Le guardie sono DUE, al pre-commit.** ⚠️ **Una lezione nuova di oggi:** la guardia di coerenza controlla i
  documenti **VIVI**, cioè quelli raggiungibili dalla memoria. **Un piano diventa vivo nel momento in cui la
  memoria lo nomina** — e da lì i suoi riferimenti a file non ancora creati diventano errori. La via d'uscita
  prevista è marcare quelle righe con **🆕**.
- **FASE 7 per intero, output incollato.** **Riferimento di oggi:** `tsc` **0** · `vitest` **4439 | 19**
  (379 file) · `next build` **0**.
- ⚠️ **`next build` in una pipe non dà la sua uscita:** `npx next build > file 2>&1; echo $?`.
- ⚠️ **Playwright da script:** il modulo si risolve accanto allo **script**, non alla cartella di lavoro →
  gli script vanno in `scripts/tmp/` (già ignorato da git), non nello scratchpad di sistema.
- **Leggere il database dal terminale:** `SUPABASE_ACCESS_TOKEN` da `.env.local` → Management API con
  `{"query":"…","read_only":true}`. 🛑 **`read_only:true` SEMPRE**, e da uno **script `.mjs`**, non da un
  `node -e` con apostrofi italiani.
- 🛑 **Scrivere sul database è una decisione di Francesco.**
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
