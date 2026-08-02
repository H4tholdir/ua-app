# Handoff — P17 è in produzione, e comincia una notte di lavoro autonomo

**Per:** la sessione nuova, a contesto pulito — che lavorerà **da sola fino alle 07:00** (**D168**).
**Stato del ramo:** ✅ **`main`**, e P17 **è in produzione**. `main` = **`fdf90dac`** + **un salvataggio locale
non pubblicato** (il verbale D168-D169, tenuto fermo per **D169**).
**Riferimento misurato ADESSO** (i tre comandi, eseguiti in chiusura, `main` pulito):
`tsc` **0** · `vitest` **4439 passate | 19 saltate** (379 file | 3 saltati) · `next build` **uscita 0** ·
**due guardie verdi**.

> 📅 **TERZO handoff del 2 agosto.** `provato:` `date` → `Sun Aug 2 23:32 CEST 2026`.
> ⚠️ **Si chiama «tarda-notte» per la stessa ragione pratica del «sera» di prima:** ordinati per nome,
> `p7` → `sera` → `tarda-notte` vengono nell'ordine giusto (`p` < `s` < `t`). **«notte» sarebbe finito
> PRIMA di tutti** (`n` < `p`), cioè il più nuovo sarebbe sembrato il più vecchio. È **D155** applicata al
> nome invece che alla data.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① 🟠 **Il gate estetico NON ha usato un lettore di schermo vero**

La correzione più delicata della serata — `aria-atomic="false"` sul blocco d'avviso — è stata fatta
**seguendo la specifica ARIA, non osservando un lettore di schermo**. `role="alert"` porta
`aria-atomic="true"` per difetto, quindi ogni cambio di parola faceva rileggere l'intero riquadro; la cura è
corretta **sulla carta**. ⚠️ **Il comportamento reale di VoiceOver e NVDA non è stato visto.** È scritto nel
referto (§6) come vuoto dichiarato, e resta tale.

### ② 🟡 **Il giro visivo ha usato UN SOLO motore**

Gli scatti e le misure vengono da **Chromium**. ✅ **Lo scarico invece è stato provato sui tre**
(Chromium · Firefox · **WebKit**) — ed è lì che serviva, perché è **il nome del file** a dipendere dal
motore. Ma la **resa dei caratteri** su un secondo motore non è stata guardata.
🔑 **E questa voce esiste perché per poco non veniva scritta:** la prima stesura del referto elencava tre
vuoti e **non questo**, cioè dichiarava «*ecco cosa non ho fatto*» **omettendo una cosa non fatta** — la
forma di difetto peggiore, perché una riga che dichiara un vuoto **chiude la ricerca di chi legge**.

### ③ 🟡 **54 MB di immagini sono entrati nella storia del progetto, e nessuno l'ha deciso**

Il gate ha prodotto **375 file** fra scatti e misure, ed è la procedura che li vuole su disco. ⚠️ **Ma la
storia di git non si ripulisce**: da stasera quei 54 MB ci sono per sempre, e **ogni ondata con grafica ne
aggiungerà altrettanti**. Non è un difetto — è la regola applicata — ma è **un costo preso senza chiederlo**.
➡️ **Da decidere con Francesco, non stanotte:** se tenerli tutti, se tenere solo i «prima/dopo» delle cose
davvero corrette, o se metterli fuori dal repository.

### ④ 🟡 **Tre ritrovamenti fuori mandato sono stati RIFERITI e non corretti** (R-E2)

- **`role="alert"` su stati STATICI.** Gli stati ②, ③ e ⑦c del riquadro sono resi **dal server**: il blocco è
  già lì quando la pagina si apre, non compare in risposta a un gesto. `role="alert"` è semantica per ciò che
  **accade**. ➡️ La cura è dare a `BloccoAvviso` un modo di distinguere «comparso adesso» da «già qui», cioè
  una scelta di disegno del componente che **D162** vuole ereditabile: appartiene all'ondata della firma.
- **`PortaleLinkButtons.tsx:134-137`** — il disallineamento di idratazione, già noto come **P18**, intatto.
- **La misura del fuoco sui tre cammini extra (401 · 403 · 422) non è affidabile** e va letta come **non
  misurata**, non come verde: in quegli stati il blocco non ha tasti e la sonda si è fermata su un
  contenitore il cui testo contiene comunque «Scarica DPA PDF».

### ⑤ 🟡 **Due cose restano deferite su questa stessa superficie, e non sono state toccate**

**P16** — in modo scuro la riga «Ultima emissione» (che porta **il numero del contratto**) e la frase di
conservazione **restano illeggibili**: **D134**, si aspetta l'ondata di migrazione a v3 della route.
🔑 **Effetto collaterale visibile e dichiarato:** la riga nuova «Non ancora emesso per questo studio», che sta
su `--t1`, è **più leggibile** della descrizione più grande sopra di lei. Gerarchia rovesciata, prezzo scelto.
**La fascia larga a 1280** — il riquadro d'avviso occupa **1240 px** per ~500 px di contenuto. Difetto **di
pagina** (nessuna card di `clienti/[id]` ha un `max-width`), stessa deferizione del gate precedente.

### ⑥ 🔴 **Le tre cose di Francesco: invariate**

🔴 **P24** il piano Vercel vieta l'uso commerciale · 🔴 **P20** il piano Supabase gratuito non ha copie
ripristinabili · 🔴 **D140** UÀ non esiste come soggetto giuridico. **Nessuna è codice.**

### ⑦ ⚙️ **Due cose di ambiente da sapere subito**

- 🛌 **Il Mac è tenuto sveglio da un `caffeinate` avviato a mano** (`caffeinate -dimsu`, PID **41560** al
  momento dell'avvio). **Va spento alla fine della notte** — `pkill -x caffeinate` — o il Mac non dormirà più.
- 📤 **C'è UN salvataggio locale non pubblicato**: il verbale con **D168-D169**. Tenuto fermo apposta, perché
  **D169 dice che di notte non si pubblica niente**. `main` e `origin/main` divergono di quella riga sola.

---

## 1. Che cosa è successo

| | |
|---|---|
| 🚀 **P17 è FINITA ED È IN PRODUZIONE** | Il Task 5 del piano eseguito per intero: collaudo dal vivo → **FASE 9b** → merge → pubblicazione. `main` = **`bea6fe53`** (merge di **19** salvataggi), poi `fdf90dac` (memoria). **CI verde · CD verde**, due volte |
| 🔑 **Il nome del file, provato sui TRE motori** | **`DPA-2026-0001.pdf`** su Chromium · Firefox · **WebKit**, 13.291 byte, PDF integro (`%PDF-` in testa, `%%EOF` in coda). 🛑 Il ripiego `contratto-dpa.pdf` **non compare da nessuna parte**. 🔑 **Tre e non uno perché la riparazione che questo codice non deve disfare era stata misurata sui tre** — e P17 non eredita quel meccanismo, lo **sostituisce** (`fetch` → `blob:` → `revokeObjectURL` alla riga dopo il clic, che è dove WebKit storicamente tronca) |
| ✅ **Verificata su `uachelab.com`, non solo in locale** | `provato:` nella card «Privacy — GDPR» ci sono **1 bottone e 0 collegamenti** verso `/dpa` (il tasto vivo è quello servito davvero) · il token nuovo risponde **`#6b5c51` chiaro / `#928778` scuro** (la correzione è arrivata in **entrambi** i temi) · documento scaricato **dalla produzione**, integro · **nessun errore di console** · **nessun numero bruciato** (registro 3 righe prima e dopo, ultima emissione invariata) |
| 🎯 **Il gate ha trovato 3 difetti su un codice già «verde e finito»** | **48 combinazioni** (8 stati × 3 formati × 2 temi) + 6 cammini d'errore, in **tre giri**. 🔑 **Il codice passava tsc, 4439 prove e la build: i tre difetti li ha trovati solo qualcuno che ha GUARDATO** |
| 🛡️ **Le QUATTRO cose rimandate al gate, raccolte tutte e quattro** | **(a)** il bordo dei comandi in scuro dava **1,71-2,24:1** contro il 3:1 di WCAG 1.4.11, **e il bordo è l'unica cosa che delimita il tasto** (fondo trasparente) → **corretto**, e **i comandi erano QUATTRO, non tre** · **(b)** altezza 34px → **D167: 40** · **(c)** fondo scuro del «guasto» → **misurato e deferito col numero** (10 su 255, un canale) · **(d)** «Ricarico…» in `role="alert"` → **corretto** con `aria-atomic="false"` |
| 🎨 **La correzione del bordo NON tocca il tema chiaro** | Token nuovo **`--brd-cmd`**: in chiaro vale **esattamente `--t3`** (l'aspetto approvato non cambia di un pixel), in scuro prende il valore che **v3 aveva già scelto per lo stesso difetto**. 🔑 **Scartato `--t2`**, che pure passava: avrebbe scurito il bordo **anche in chiaro**, dove non c'era nessun difetto |
| ✍️ **Tre decisioni** | **D167** i tasti di rimedio 34 → 40 px · **D168** la notte di lavoro autonomo · **D169** di notte non si pubblica niente |

**FASE 7 in chiusura, output reale, eseguita su `main`:** `tsc` **0** · `vitest` **4439 passate | 19
saltate** (379 file | 3 saltati, in 33,50 s) · `next build` **uscita 0** · guardia di coerenza documenti
**verde** · guardia del salvataggio **verde**.

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① UN CODICE VERDE NON È UN CODICE GUARDATO, ED È MISURABILE QUANTO.** P17 arrivava al gate con `tsc` a
zero, **4439 prove verdi** e la build a posto. Il gate ha trovato **tre difetti**, di cui uno che rendeva
quattro comandi indistinguibili dal fondo in modo scuro. 🔑 **Le prove dicono che il codice fa ciò che i test
chiedono; non dicono che sullo schermo si veda.** Le due cose non si sostituiscono mai.

**② IL CONTO DI UN DIFETTO NON LO FA CHI L'HA TROVATO.** L'handoff diceva «bordo `--t3`, **tre** occorrenze».
Aprendo tutti gli stati sono risultati **quattro** comandi — il quarto non era mai stato visto da nessuno,
perché per vederlo bisogna **forzare** una situazione che da sola non capita. 🔑 **Un difetto contato senza
aver percorso tutti gli stati è un difetto contato per difetto.**

**③ UNA MISURA GIUSTA SULLO STRUMENTO SBAGLIATO INVENTA UN DIFETTO.** Il collaudo contava **1**
`role="alert"` dopo uno scarico riuscito — sembrava un blocco d'errore comparso senza motivo. Non lo era:
Playwright **perfora lo shadow DOM** e stava contando `next-route-announcer`, l'annunciatore di rotta di
Next, **vuoto e presente su ogni pagina anche prima del clic**. `provato:` `querySelectorAll` → **0**.
🔑 **Prima di credere a una misura sorprendente, si guarda che cosa ha misurato.**

**④ CERCARE IL PRECEDENTE, DI NUOVO, PER SMONTARE.** Lo scarico sembrava provato: nome giusto, PDF integro.
Ma il commento nel file diceva che la riparazione originale era stata **misurata sui tre motori** — e P17
quel meccanismo non lo eredita, lo **sostituisce**. `revokeObjectURL` chiamato subito dopo il clic è
esattamente dove WebKit tronca. **Provato: non succede.** 🔑 **Ma la prova su un motore solo, presentata come
prova sul comportamento, sarebbe stata la forma di P28 e della lezione ⑤ del 02/08 — di nuovo.**

**⑤ UN VUOTO DICHIARATO IN MODO INCOMPLETO È PEGGIO DI NESSUN ELENCO.** Il referto elencava tre cose non
fatte e **ometteva** «il giro visivo ha usato un motore solo». Un elenco di vuoti che sembra completo
**chiude la ricerca di chi legge**: è la lezione ⑦ del 02/08, ripresentata dalla parte opposta.

**⑥ IL RIPIEGO DI UNA VARIABILE È UNA DECISIONE, NON UNA FORMALITÀ.** `var(--brd-cmd, #6B5C51)` porta come
ripiego **il valore CHIARO**: in un ambito che non definisce la variabile, un fondo scuro tornerebbe a
**2,24:1** — il difetto appena chiuso, di nuovo e in silenzio. Oggi non morde, ma **D162 dichiara quel
componente costruito per essere ereditato**. La riga di avvertenza è scritta in `globals.css`.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **P30** — la scheda del dentista non ha una pagina di modifica (**D165**: si costruisce). ⚠️ **Pagina nuova → §0B per intero + FASE 9b.** 🛑 **Il §0B si ferma alla firma di Francesco:** stanotte si arriva ai **mockup e agli scatti**, non oltre | roadmap · **D165** |
| 🟠 **2** | **P15** — tre progetti Playwright puntano a spec che **non esistono**, e la CI non esegue Playwright: una rete che non protegge | `playwright.config.ts:22,32,36` |
| 🟠 **3** | **P9** — i PDF stampano la data nel **fuso della macchina**, e in produzione la macchina gira a UTC: fra le 00:00 e le 02:00 un documento porta un numero di un giorno e una data dell'altro. 🔑 **Metà del lavoro c'è già** (`data-roma.ts`) | `src/lib/utils/data-roma.ts` |
| 🟠 **4** | **P23** — il salvataggio dei file si ferma a **1000 per cartella** e **non lo dice**: si dichiara riuscito | `scripts/salvataggio-archivio.mjs` |
| 🟠 **5** | **P18** — idratazione disallineata: diverge **il collegamento che il laboratorio manda al dentista** | `PortaleLinkButtons.tsx:134-137` |
| 🟡 **6** | **P11** — il messaggio del database arriva all'utente, e il raggio è **tutti** i documenti | `src/lib/db/progressivi.ts:30-32` |
| 🟡 **7** | **P13** — le rotte PDF sorelle non concordano sullo stato d'errore. ⚠️ **Il modello ora esiste** (`ErroreDatiDpa`, P17) | roadmap |
| 🟠 **8** | **P29** una parola due colori · **P28** · **P27** · **P26** · **P25** · **P16** (D134) · **P4 · P5 · P6 · P8 · P14** | roadmap |
| 🟠 **9** | **Le tre cose di Francesco: P24 · P20 · D140** · e la **spec P19-a** mai riletta | §0 ⑥ |
| 🟡 **10** | I **54 MB di scatti** nella storia di git — da decidere | §0 ③ |
| 🟡 **11** | Rumore `Not implemented: navigation to another Document` nella suite: **preesistente**, colpevole non identificato | — |

---

## 4. Da dove ripartire — 🌙 LA NOTTE (D168)

**Fino alle 07:00 si lavora da soli.** Il lavoro è **doppio**, e l'ordine è questo:

### Prima: i difetti che NON chiedono una scelta di Francesco

Uno alla volta, **ciascuno sul proprio ramo**, ciascuno con **FASE 7 per intero** prima di dirlo fatto.
Ordine consigliato, e la ragione del primo posto conta:

1. **P15** — le reti di prova che puntano nel vuoto. 🔑 **Va per prima perché è una rete di sicurezza**: se
   quella non tiene, tutto ciò che si fa dopo è meno protetto di quanto sembri.
2. **P9** — il fuso orario dei PDF. Metà del lavoro esiste già; il difetto è su **documenti con valore
   legale**, quindi vale più degli altri.
3. **P23** — il salvataggio che si ferma a 1000 e si dichiara riuscito.
4. **P18** — l'idratazione della scheda cliente.
5. **P11** e **P13** — **solo se resta tempo VERO**, e con un piano scritto prima: hanno raggio largo.

### Poi: P30 fino alla soglia dell'approvazione

**Ricerca delle buone pratiche** → **mockup HTML** in `docs/design/mockups/` → **scatti** a 390 · 768 · 1280
in chiaro e scuro, **più varianti** → e ci si **ferma lì**. 🛑 **Nessuna riga di React su P30**: la firma di
Francesco sta in mezzo, ed è tutto il senso di §0B. Modello in casa: `lavori/[id]/modifica`.

### Le regole della notte — non negoziabili

| | |
|---|---|
| 🛑 **Niente si pubblica** | **D169.** Ogni cosa resta su un ramo, provata e verde. Nessun merge, nessun push. Vale **anche** per il salvataggio locale già presente |
| 🛑 **Niente si scrive sul database** | Nessuna migration applicata, nessuna riga. Le letture **solo** `read_only: true` |
| 🛑 **Se serve una decisione di Francesco, si SCRIVE LA DOMANDA e si passa alla voce dopo** | Non ci si ferma ad aspettare, e **non si indovina**. Le domande si raccolgono **tutte in un posto solo** |
| ✅ **FASE 7 per intero prima di dire «fatto»** | `npx tsc --noEmit` · `npx vitest run` · `npx next build` — ⚠️ **fuori da una pipe**, o l'uscita non si vede: `npx next build > file 2>&1; echo $?` |
| ✅ **Meglio TRE cose finite bene che sei a metà** | È la lezione della giornata: un lavoro dichiarato finito e non guardato è costato una sessione di rimedio |
| 🕖 **Alle 07:00 si smette e si scrive** | Handoff + **tutte le domande raccolte in un unico messaggio**, poi si spegne il `caffeinate` |

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/SESSION_ACTIVE.md` e la **testa** di `memory/MEMORY.md` (è grosso: si legge la testa).
- 📅 **`CLAUDE.md` §0F — LA DATA SI LEGGE DALL'OROLOGIO** (`date`), mai dal documento precedente.
  ⚠️ **E il nome deve ORDINARE bene** (`p7` → `sera` → `tarda-notte`).
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centosessantanove** decisioni in
  **cinquantotto** tornate. La prossima è **D170**.
- **Le guardie sono DUE, al pre-commit** (coerenza documenti · salvataggio installato).
- ⚠️ **`next build` in una pipe non dà la sua uscita.**
- ⚠️ **Playwright da script:** il modulo si risolve accanto allo **script** → gli script vanno in
  `scripts/tmp/` (già ignorato da git), non nello scratchpad di sistema.
- 🔧 **Strumenti già pronti in `scripts/tmp/`, riusabili stanotte:** `leggi.mjs` (lettura DB **read_only**) ·
  `gate-l2-p17.ts` (il gate visivo completo: accesso, tre formati, due temi, contrasti sul fondo **vero**,
  bordi, bersagli tappabili, fuoco — **si adatta, non si riscrive**) · `collaudo-p17-motori.ts` (scarico sui
  tre motori) · `verifica-prod-p17.ts` (verifica su `uachelab.com`).
- **Collaudo dal vivo (D103):** credenziali in `.env.local`, accesso col **link monouso**, mai una password
  digitata. Ricetta in `ua-app/CLAUDE.md` §9.
- 🛑 **Scrivere sul database è una decisione di Francesco.**
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
- 🔑 **Il dentista di prova con emissione** è `76115a50-aed8-4d54-b8ff-1d52c211ae5b` (`DPA-2026-0001`); uno
  **senza dati fiscali** è `f8df10db-f2d1-4f95-9f42-39f922ccdbd3`; il **tecnico** per provare i permessi è
  `e2e-tecnico@ua-test.local`.
