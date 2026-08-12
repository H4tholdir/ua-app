# Panel — la delega del merge su `main` (candidata ⚖️ D362)

**Quando:** 12 agosto 2026, mattina (`provato:` `date`, comando separato → `Wed Aug 12 08:31:55 CEST 2026`).
**Perché:** §0① dell'handoff `docs/roadmap/2026-08-12-code-58-59-in-produzione-handoff.md` — due merge
dello stesso tipo, due prassi diverse, nessuna regola scritta.
**Stato:** 🛑 **NON RATIFICATA.** L'indirizzo l'ha scelto Francesco; il testo **non è suo** e il panel
ha trovato che, alla lettera, **un cancello su cinque non è misurabile**. Serve un suo passaggio prima
del numero. Il conteggio delle decisioni resta a **361**.

> 🔑 **Perché questa decisione non si ratifica da sola, ed è la ragione più importante di questo
> documento:** D362 governa **l'autorità di chi la scrive**. `CLAUDE.md` §9 registra già il principio,
> pagato: *«non posso allargarmi i permessi da solo, ed è giusto così — un assistente che può
> riscrivere le proprie regole non ha regole»*. Un testo che amplia la delega, redatto interamente
> dal delegato, è esattamente quel caso.

---

## 1. Che cosa ha scelto Francesco

Domanda posta il 12/08: *il merge su `main` è sempre tuo, o è delegato quando i cancelli sono verdi?*
**Risposta: «Delegato, con lista chiusa»** — cioè la delega vale solo con tutti i cancelli verdi, e
la lista è chiusa, non un giudizio a naso. I cinque cancelli proposti con la domanda erano:

① ondata completa · ② zero difetti dichiarati nella §0 dell'handoff · ③ `verify:full` con
`VERIFY_EXIT=0` letto da variabile · ④ CI verde letta due volte a distanza di minuti · ⑤ revisione
finale di ramo con «Ready to merge: Yes».

---

## 2. 🔴 IL FATTO CHE COSTRINGE A RISCRIVERE IL CANCELLO ④

**La CI non gira sui rami di lavoro.** `.github/workflows/ci.yml:3-7` la fa partire **solo** su push a
`main`/`develop` e sulle pull request verso `main`.

`provato:` 12/08/2026, letto da me dopo il rilievo del primo revisore —

```
gh run list --branch code-58-59-prova-inalterabile   →  (vuoto)
gh run view 31516616997 --json headBranch,headSha,event,conclusion
  →  {"headBranch":"main","headSha":"2f1d8d83…","event":"push","conclusion":"success",
      "createdAt":"2026-08-11T17:15:16Z"}
```

🛑 **Cioè: la CI dichiarata verde per l'ondata di ieri è girata su `main`, sullo SHA del merge, alle
19:15 di Roma — DOPO il merge, non prima.** Non è stato un errore di lettura: sul ramo non c'era e non
poteva esserci niente da leggere. Il cancello ④, applicato alla lettera prima di un merge, **oggi non
è soddisfacibile** — e un cancello che non si può misurare si finisce per dichiarare verde guardando
l'ultima corsa di `main`, cioè **il verde di codice diverso da quello che si sta pubblicando**.

**Il buco era già stato incontrato e aggirato a mano una volta:** la sola pull request mai aperta nel
repo (#1, ramo `intervento-post-consegna`) porta scritto nel titolo che è stata *«aperta per far
girare la CI»*.

➡️ **Due rimedi possibili, e la scelta è di Francesco:** (a) prima del merge si apre una PR bozza
verso `main`, come già fatto una volta; oppure (b) si aggiungono i rami ai trigger di `ci.yml`.
In entrambi i casi la corsa si identifica **per SHA di testa**, non per ramo.

---

## 3. Il panel — tre prospettive, tre volte «ratificare con emendamenti»

| Revisore | Verdetto | Il colpo migliore |
|---|---|---|
| **Rilascio / SRE** | ratificare con emendamenti | il buco della CI (§2) · «due letture» non è la cura giusta: la cura è **attendere lo stato terminale**, perché due misure premature sbagliano uguale · **assenza di corsa ≠ verde** |
| **Governance** | ratificare con emendamenti | il cancello ② **è rosso sempre**: la §0 è per costruzione l'elenco di ciò che non è stato fatto — tre handoff su tre ne hanno · e la §0 si scrive **dopo** il merge, quindi al momento del merge non esiste |
| **Avvocato del diavolo** | ratificare con emendamenti | ①②⑤ li compila **lo stesso soggetto che poi li legge** · e la **metà irreversibile** di un'ondata (la migration sul banco vivo) avviene **già oggi fuori da tutti e cinque i cancelli**, perché non esiste uno staging |

### 3.1 ⚠️ Un rilievo del terzo revisore è SBAGLIATO, e va detto

Ha accusato una «traduzione» del verdetto: da *«PRONTO AL MERGE CON RISERVE A CODA»* a *«Yes»*.
**Falso, e per una confusione di documenti:** quel verdetto sta in
`docs/roadmap/2026-08-11-revisione-finale-ramo-referto.md:13-15`, che è la revisione del ramo
**`intervento-post-consegna` (298 commit)** — cioè l'ondata *precedente*, quella che **aprì** le righe
58 e 59. La revisione delle code 58-59 disse davvero «Ready to merge? YES»
(`.superpowers/sdd/progress.md`, RI-REVISIONE 2). L'accusa di forma **cade**; i suoi rilievi
strutturali no.

🔑 **Vale come lezione sul panel stesso:** un revisore che cerca il difetto trova anche difetti che non
ci sono. I pareri si verificano, non si recepiscono.

### 3.2 Dove i revisori CONVERGONO (e quindi pesa di più)

1. **Il cancello ② va spostato prima del merge e reso specifico.** Oggi rimanda a un documento che al
   momento del merge non esiste ancora, e mescola cose diverse: lavoro non fatto, righe di coda,
   errori di misura già corretti. Due revisori su tre propongono lo stesso rimedio: un **censimento
   pre-merge** (il passo ③ di `/chiudi`, anticipato), in cui ogni voce esce classificata **bloccante**
   oppure **riga di coda numerata** — e la riclassificazione non è libera.
2. **③④⑤ devono nominare lo SHA.** `verify:full` misura la cartella, non un commit; la revisione
   benedice un albero che i fix successivi cambiano. Prova che non è teorica: ieri il secondo
   Important è nato **dentro** la correzione del primo. ➡️ **ogni riga toccata dopo il verdetto lo
   riapre**, e sul fix guarda un revisore diverso da chi l'ha scritto.
3. **La delega deve poter morire da sola.** Tutti e tre notano che «tanto non ci sono clienti veri»
   è appeso a un evento senza innesco. Il terzo ha contato **quattro obblighi già appesi** alla «prima
   onboarding reale», nessuno con un meccanismo: è un modo di guasto **già documentato quattro volte**.

### 3.3 I due emendamenti più pesanti, su cui i revisori NON concordano fra loro

- **Un cancello sul banco dati** (proposto dal primo): `npx supabase migration list --linked` allineato,
  perché D284 fa applicare le migration **durante** il lavoro di ramo e il banco può restare **avanti**
  a `main` per giorni.
- **Escludere del tutto dalla delega** (proposto dal terzo) le ondate che contengono migration, invii
  verso l'esterno, documenti a valore legale, auth/RLS, cancellazioni di dati, **e le modifiche ai
  cancelli stessi**. 🛑 **È l'emendamento più costoso: applicato, l'ondata di ieri NON sarebbe stata
  delegabile**, e non lo sarebbe la maggior parte del lavoro di banca dati.
  ➡️ **Questa è una scelta di Francesco, non del panel.**

---

## 4. Testo proposto — 🛑 DA APPROVARE, non ratificato

> **⚖️ D362 — Il merge su `main` è delegato a cancelli chiusi.**
> Il merge su `main` (= pubblicazione su uachelab.com) è **delegato all'assistente** quando **tutti**
> i cancelli sono verdi. Se anche uno solo manca **o è opinabile**, la decisione **torna a Francesco**:
> il dubbio stesso è il cancello rosso. Il push di un **ramo** resta libero e incondizionato (D296).
>
> **① Ondata completa** contro il perimetro **scritto nel piano prima di iniziare** (FASE 4). Il
> perimetro non si ridefinisce a valle.
> **② Censimento pre-merge senza bloccanti**, fatto **prima** del merge cercando **nel codice** (è il
> passo ③ di `/chiudi`, anticipato — non una procedura nuova). Ogni voce esce **bloccante** (correttezza,
> sicurezza, isolamento fra laboratori, obbligo di legge, o un cancello di processo dovuto e non fatto)
> oppure **riga di coda numerata** in `ROADMAP-UFFICIALE.md`. Lo stesso testo si ricopia poi nella §0.
> **③ `verify:full` con `VERIFY_EXIT=0`** letto da variabile, senza pipe, **con `git status --porcelain`
> vuoto e lo SHA scritto accanto al numero**. Se l'ondata tocca la banca dati vale **solo con
> l'ambiente caricato** (integrazione **zero saltate**): senza `SUPABASE_DB_URL` le prove d'integrazione
> si spengono **in silenzio** (`tests/integration/helpers/pg-client.ts:9`).
> **④ CI verde SUL CODICE CHE SI STA PER MERGIARE.** 🛑 La CI **non gira sui rami**
> (`ci.yml:3-7`): serve una **PR bozza** verso `main`, oppure aggiungere il ramo ai trigger. La corsa
> si cerca **per SHA** (`gh run list --commit <sha>`), si **attende lo stato terminale**, poi si legge
> `conclusion`. 🛑 **Nessuna corsa per quello SHA = ROSSO.** Un'assenza non è mai un verde.
> **⑤ Revisione finale di ramo con «Ready to merge: Yes»** riportato **alla lettera**: «with fixes»,
> «con riserve», «pronto con riserve» **non sono un Yes**. **Ogni riga toccata dopo il verdetto lo
> riapre** sul diff del fix, con un revisore **diverso** da chi ha scritto il fix.
> **⑥ Banco e `main` si muovono insieme** — `npx supabase migration list --linked` allineato: D284 fa
> applicare le migration durante il lavoro di ramo, e senza questo il banco resta **avanti** a `main`.
>
> **DOPO il merge non è un cancello, è un dovere:** il merge non è finito finché non si è atteso lo
> stato terminale di CI e CD **per lo SHA del merge** (l'**ultima** corsa di quello SHA) e non si è
> guardato il sito **da fuori**. 🛑 **CD verde non prova che il sito serva:** `deploy.yml:45-53`
> stampa «verifica manualmente» e **non fallisce mai**. Se è rosso: `git revert` e **si dichiara**.
>
> 📌 **Perimetro, e muore con la §8.** La delega vale **finché** `ua-app/CLAUDE.md` §8 contiene la riga
> «solo dati di prova, nessun cliente reale» — è da lì che viene il rischio basso, come per D103 e D284.
> 🛑 **Cancellata quella sezione (prima onboarding reale), D362 DECADE con lei**, senza bisogno di
> un'altra decisione.
>
> ⚠️ **La via del ritorno vale per il codice, non per il banco.** D296 poggia su «possiamo sempre
> tornare indietro»: vero per `git revert`, **falso per una migration** (§8 sul ledger disallineato,
> D311). Un merge che porta migration si dichiara **irreversibile lato dati** prima di partire.

### Le tre domande che restano a Francesco

1. **Il cancello ④:** PR bozza prima di ogni merge, oppure la CI anche sui rami?
2. **L'esclusione del terzo revisore:** le ondate con migration / invii esterni / auth restano **sempre**
   sue, anche a cancelli verdi? (Costo: quasi tutto il lavoro di banca dati torna a lui.)
3. **La scadenza:** oltre alla decadenza con la §8, si vuole anche una **data** (es. 90 giorni)?

---

## 5. Da riscrivere INSIEME alla ratifica (non dopo)

- 🛑 **In cima** alla sezione D296 di `ua-app/CLAUDE.md` (oggi: «il MERGE su `main` resta un
  giudizio»): quel titolo è ciò che si legge per primo, e una riga nuova altrove **lo lascia in piedi**
  — è la lezione già pagata in §9.
- **La citazione sbagliata di D361.** `memory/MEMORY.md:2` e `ROADMAP-UFFICIALE.md:2` attribuiscono il
  merge `2f1d8d83` a «⚖️ D361», ma nel verbale D361 è *«il prossimo lavoro sono le code 58-59»*.
  `provato:` `grep -c 2f1d8d83` sul verbale → **0**: quel merge **non ha una riga**. La causa è
  strutturale — la tabella del verbale ha la colonna «Testo di Francesco», e **un atto delegato non ce
  l'ha**. ➡️ serve una forma per gli atti delegati («— delegato ex D362»).
- **La traccia dell'atto**, proposta dal secondo revisore e da tenere: i cancelli misurati vanno
  scritti **nel corpo del commit di merge**, che è l'unico artefatto dentro l'atto e non riscrivibile
  in silenzio (`git log --merges` li rilegge tutti in un comando).

## 6. 🔴 VERIFICATO IL 12/08 — E LA RISPOSTA CAMBIA LA PREMESSA: QUALCOSA ESCE DAVVERO

La domanda era: la §8 dice che i **dati** sono di prova, ma dice qualcosa sugli **invii**? **No.** E il
censimento dei canali (12/08/2026) trova che **due canali sono vivi oggi**, con destinatari veri, e
**nessuno dei percorsi d'invio ha un interruttore su `NODE_ENV`**.

| canale | esce davvero? | destinatario | verificato |
|---|---|---|---|
| **Email d'invito** (Resend) | 🔴 **SÌ** | l'indirizzo vero digitato da chi invita | `src/lib/invito/send-invito-email.ts:21-24,32-34` — unico freno: la chiave assente |
| **Email di autenticazione** (Supabase) | 🔴 **SÌ**, e `/forgot-password` è **pubblica** | i 7 utenti veri in `utenti` | `src/app/(auth)/forgot-password/forgot-form.tsx:64` |
| **Notifiche push** (VAPID) | 🔴 **SÌ — c'è già 1 iPhone iscritto** | endpoint veri in `push_subscriptions` | `src/lib/notifications/push.ts:19-27,45` · `provato:` `count(push_subscriptions)` → **1** |
| **PEC → SdI** | codice **senza freno**, ma oggi bloccato da precondizione | AdE vera (`sdi01@pec.fatturapa.it`) | `send-pec.ts:113-138` · `provato:` **3 laboratori, 0 con PEC configurata**, 0 PEC mai partite |
| **Stripe** | codice **senza freno**; l'addebito dipende **solo dalla chiave** | email dell'utente | `src/lib/stripe/server.ts:4` · `provato:` **0 abbonamenti** in banca dati |
| **WhatsApp** | **no**: solo un link `wa.me`, serve un dito umano | — | `src/lib/consegna/whatsapp-template.ts:83` |

**Un push parte anche da una rotta pubblica — ma è LIMITATO, e la prima stesura di questa riga
esagerava.** `src/app/api/portale/richiedi/route.ts` si dichiara alle righe 3-5 **«Accesso PUBBLICO —
nessun token di autenticazione richiesto»** e alle righe 179-182 fa partire un push a `titolare` e
`front_desk`: chi possiede un `portale_token` fa squillare quel telefono senza avere un account.
🔄 **Ma esiste un tetto che il censimento non aveva visto e che ho trovato controllando:** righe 96-110,
**massimo 10 richieste per cliente in 24 ore**, oltre le quali risponde `429`. Quindi non è «squillo a
volontà»: è al più dieci notifiche al giorno per token. `provato:` lette le righe, 12/08/2026.
⚠️ Resta una nota vera, dichiarata nel codice stesso (righe 103-105): se **il conteggio fallisce**, la
rotta **procede lo stesso** — il limite si apre invece di chiudersi. È una scelta scritta, non una
svista, e vale la pena riguardarla quando si toccherà quella rotta.

➡️ **Conseguenza sulla delega:** «nessun cliente vero» copre i **dati**, non le **uscite**. Un'ondata
che tocca invii, notifiche o pagamenti **non è coperta dal ragionamento di §8** — ed è un argomento
concreto a favore dell'esclusione proposta dal terzo revisore, almeno per quei percorsi.

### Resta NON determinabile dal repository (va guardato nei pannelli, non nel codice)

- **Le chiavi di produzione vivono su Vercel**, non qui: `STRIPE_SECRET_KEY` (il prefisso `sk_test_` o
  `sk_live_` **chiude da solo la domanda sugli addebiti veri**), `RESEND_API_KEY`, `EMAIL_FROM`,
  `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`. In locale Stripe è di **prova**; **la produzione non l'ho
  vista**, e non la si deduce.
- **Chi spedisce materialmente le email di autenticazione** (SMTP integrato di Supabase o proprio) sta
  nel pannello Supabase.
- **Il flag meccanico** che dovrebbe far decadere la delega alla comparsa del primo laboratorio vero
  non esiste: oggi la decadenza è solo scritta.
- Nota a margine: `.env.example:16-20` elenca ancora `SMTP_HOST/PORT/USER/PASS`, che **nessuna riga di
  `src/` legge** — righe morte.
