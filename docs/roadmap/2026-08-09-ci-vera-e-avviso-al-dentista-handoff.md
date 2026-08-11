# Handoff — 09/08/2026: la CI gira per la prima volta contro il database vero, e il Task E ha spec e piano ma zero codice

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 9 agosto 2026, **14:08** (`provato:` `date`, letto in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO**, albero **pulito**.
🔑 **`main` NON è stato toccato** ed è `7427a680`.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(al momento della scrittura: **205**).
📬 **PR #1 aperta IN BOZZA** — `https://github.com/H4tholdir/ua-app/pull/1`. **Non è pronta per il
merge, ed è in bozza apposta:** esiste per **far girare la CI**, che da un ramo di lavoro non partiva.

📌 **MISURATO IN CHIUSURA** (`npm run verify:full`, uscita letta **da variabile e SENZA pipe**):
`vitest` **5725 passate | 84 saltate** su **458 file** (451 passati, 7 saltati) · `tsc` 0 · build ok ·
guardie verdi.
🔴 **E LE 84 «SALTATE» SONO IL DATO NUOVO DELLA GIORNATA:** sono le prove d'integrazione, che in locale
si saltano perché `verify:full` **non carica `.env.local`**. **Sulla CI invece girano tutte.**
➡️ **Da oggi la pubblicazione automatica è PIÙ SEVERA della verifica locale**, ed è la prima volta.
📈 **Riferimento di ieri sera: 5685 | 68 su 456.** Oggi: **+40 prove e +2 file**.
🌐 **`provato:` sulla CI vera** (esecuzione `31312042122`, esito `success`):
**458 file passati (458) · 5809 prove passate (5809) · ZERO saltate.**

⚖️ **QUINDICI DECISIONI: D325 → D339.** Totale: **339 in centoquarantasei tornate.**
🗄️ **Nessuna migration nuova.** Pavimento invariato: **`20260808195344`**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 IL TASK E HA SPEC E PIANO, E **ZERO RIGHE DI CODICE**
`provato:` `grep -rc "avvisi_dentista" src/ supabase/` → **nessun risultato**.
Esistono: la spec `docs/superpowers/specs/2026-08-09-avviso-al-dentista-design.md` (**senza questioni
aperte**) e il piano `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` (**dieci task**, col
cancello §0B fra il quarto e il quinto).
⚖️ **Francesco ha deciso COME eseguirlo:** «*un compito alla volta con esecutore e revisione*», **in
una sessione nuova**. ➡️ **È la prima cosa da fare.**
🔴 **E il piano porta TRE punti dichiarati dove può sbagliare** (§ «Autorevisione»): un nome di
variabile **presunto** nel Task 2 · il perimetro per ruolo del Task 7, che è **una proposta e non una
decisione di Francesco** · tre `CHECK` del Task 1 **mai eseguiti insieme**.

### ② 🟠 `contiene_sostanze_o_tessuti` È ANCORA CABLATO A `false`
`provato:` `generate-ddc.ts:349`. **Non è una dimenticanza:** ⚖️ **D327** ha spostato il segno **dal
lavoro al materiale**, e quel lavoro è **la riga 34 della coda** — percorso **GRANDE** (colonna nuova →
migration → dominio critico), col **dimensionamento da rifare sul magazzino**, non ereditato dal lavoro.
⚠️ Oggi il documento **tace** (la riga è dentro un `? :`), e tacere quando la sostanza non c'è **è la
forma giusta**: il difetto è che **se ci fosse, non esisterebbe una strada per dirlo**.

### ③ 🔴 IL MERGE SU `main` NON È STATO FATTO, e la PR è in bozza apposta
La CI è **verde** e i due motivi che bloccavano ieri sono caduti (gate estetico fatto · qualcosa ha
girato contro il database da un chiamante vero). **Ma l'ondata non è finita:** manca il Task E, che è
**un obbligo di legge** (GDPR Art. 19). ➡️ **Il merge resta un giudizio, e oggi la risposta è ancora NO
— per una casella con un nome, non per prudenza.**

### ④ 🟠 QUATTRO RILIEVI DEL GATE L2 RESTANO APERTI — riga **37** della coda
① il foglio **non torna in cima** quando cambia passo (a 390 si apre a scrollTop 380, titolo e nastro
fuori schermo) · ② nella finestra del Task A **la risposta che ANNULLA il documento è quella grande e
rossa** · ③ **l'odontogramma** dentro un foglio v3 (44 testi su 55 sotto soglia in scuro) · ④ dopo un
409 **la stessa frase compare tre volte** e copre il titolo. **Più due riferiti oggi:** il **nastro del
percorso non dice più «sei qui»** (nasce da D329, e il rimedio **riaprirebbe** il ❌3) e il **tasto
primario spento**, che ha lo stesso difetto di contrasto su un componente **condiviso**.
🛑 **Il ❌1 in tema chiaro è deferito PER DECISIONE di Francesco (⚖️ D330), non per dimenticanza.**

### ⑤ 🟠 LE RIGHE DI CODA APERTE OGGI — dalla **34** alla **41**
**34** 🔴 D327+D325: il segno sul materiale e «altro» come lavoro neutro · **35** 🔴 D328: il **moncone**
classificato `classe_iia` mentre MDCG 2021-24 Rev.1 Regola 8 dice **IIb** (→ **la scadenza PSUR detta
all'odontotecnico è quella sbagliata**), **panel normativo obbligatorio** · **36** 🔴 tre difetti vivi
riferiti dal panel (`precheck.ts:141` **vicolo cieco** · `api/lavori/route.ts:293` **senza
validazione** · `psur/route.ts:37-49` **senza filtro**) · **37** i rilievi estetici · **38** la
categoria «il corpo del foglio contro il contratto della rotta», **chiusa in una direzione sola** ·
**39** la CI (v. §1) · **40** il deadlock, **chiuso** · **41** 🟠 `trg_refresh_dashboard` è `FOR EACH
ROW` e **ricalcola tutti i KPI su una riga sola**: due scritture qualunque sullo stesso laboratorio
**si mettono in fila** — è **architettura, non riparazione**.

### ⑥ 🔴 I MIEI ERRORI, e sono SETTE — nessuno è stato nascosto, tutti sono stati trovati dagli esecutori
1. **Il mandato del Task D-bis portava un rimedio SBAGLIATO** (ereditato dall'handoff senza verificarlo):
   applicare `--elv` senza condizione di tema **faceva sparire le righe in chiaro**. Confutato **con una
   misura**, non discusso.
2. **Ho consigliato la variante C3 su un conteggio PARZIALE:** «chiude due difetti invece di uno»
   contava **i quattro testi che il rilievo nominava**, trattandoli come il totale. Misurati tutti,
   erano **tredici**.
3. **Ho committato il lavoro a metà di un esecutore** (`a06870e2`): `git add <percorsi>` protegge da
   ciò che **aggiungi**, non da **ciò che c'era già in attesa** in un albero condiviso.
4. **Il mandato sul TD04 dava la data sbagliata** — «rosse dal 06/08», erano del **15/07**: ha mandato a
   cercare nelle migration sbagliate.
5. **Il mandato sul deadlock sbagliava TRE cose:** frequenza **1 su 10** (era **5 su 10**), **il file**
   (quello indicato era la **vittima**), e il metodo («guarda quali **righe** condividono» porta a metà
   del cerchio: l'altra metà è un **lucchetto di tabella**).
6. **Il mandato sulla CI citava il PASSO (`ci.yml:33-37`) e mai le righe 3-7**, quelle che decidono
   **se** quel passo gira: la riga è stata aggiunta e **la CI non è partita lo stesso**.
7. **Il mandato del Task 9 diceva «cinque passi»** (sono **sette**) e «`motivi-ui.ts` contiene due
   formulazioni» (è **la stessa stringa scritta due volte**).

### ⑦ 🟡 INVARIATI dalla sessione precedente
La **terza copia dei nove campi** in `annulla_consegna_atomica` · il compito del **ritiro** (D273) senza
numero · la riga «**reso senza difetto**» vuota · la **§17.2** · `psur/route.ts:190` · **`CRON_SECRET`**
· i cinque deferiti delle tinte · l'igiene **D257** · le righe di roadmap **8-bis · 9 · 10 · 24 · 25 ·
26 · 27** · i **quattro difetti ereditati** dal rifacimento · i ritrovamenti **I3** e **M1** · `Esc` con
due ascoltatori.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| 🌐 **LA CI GIRA CONTRO IL DATABASE VERO, per la prima volta** | `provato:` esecuzione **`31312042122`**, `success`: **458/458 file · 5809/5809 prove · zero saltate** |
| 🔴 **…ma ci sono voluti QUATTRO passaggi**, e tre erano ostacoli che non sapevamo di avere | ① le 4 prove rosse del TD04 ② un deadlock ③ i filtri del workflow ④ la forma del segreto |
| ✅ **Task D-bis**: FASE 9 + gate L2 ×2 + la guardia sugli overlay | **90 scatti**, guardia **lanciata dopo quattro compiti** (uscita 0), **7 rilievi**, zero corretti **col motivo** |
| ✅ **Task 9**: tutti e nove i motivi funzionano | prima **due davano 422 a schermo**; **+21 prove**; 72 scatti; **nove difetti nel piano** |
| ✅ **Task 10**: il piano del 07/08 è **completo, 10 su 10** | **35 prove nuove**; la categoria del difetto **chiusa in una direzione e MISURATA** |
| ✅ **Le 4 prove rosse del TD04**: chiuse | il difetto era **nella prova**, non in produzione, e datava **15/07** |
| ✅ **Il deadlock**: chiuso | **5 su 10 → 0 su 10**, e la prova è pure **più veloce** (2429 → 1119 ms) |
| 📚 **Una ricerca normativa** su sostanze e tessuti | **38 voci** esaminate una per una · perimetro del reg. 722/2012 · **Regola 18** |
| 📄 **Il Task E**: spec **senza questioni aperte** + piano **a dieci task** | **zero righe di codice** |
| ⚖️ **Quindici decisioni** (D325 → D339) | fra cui **quattro** che nascono da un **panel a tre** |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **UN ELENCO CHE NOMINA N COSE FA TROVARE N COSE.** Tre volte in due giorni sullo stesso oggetto:
   le superfici erano **quattro → cinque → SEI**; i testi sotto soglia **quattro → TREDICI**. Ogni volta
   il numero giusto è venuto da una **sonda sul DOM vivo**, mai da un file. ➡️ *Contando solo ciò che un
   elenco nomina si trova sempre ciò che l'elenco dice.*
2. 🛑 **UN NUMERO PRESO DA UN CONTESTO E USATO IN UN ALTRO SENZA RIFARE IL CONTO.** Due volte: «i quattro
   testi restano a 12,11» (erano **14,06**, perché 12,11 era il valore *sul fondo scurito*) e «accendere
   le prove non costa» (misura **storta**: dieci giri accesi *seguiti* da tre spenti, su una macchina che
   deriva. Rifatta **alternando**: costa).
3. 🛑 **`git add <percorsi>` NON PROTEGGE QUANDO L'AREA DI STAGING È CONDIVISA.** D318 copre **cosa
   aggiungi**, non **cosa c'era già**. ➡️ **Prima di salvare si guarda `git status`.** ⚠️ E il `push`
   porta su **tutta la catena**: protegge il commit, non la pubblicazione.
4. 🛑 **UN DIFETTO INTERMITTENTE NON SI CHIUDE «RIPROVANDO».** Si chiude trovando **le due cose che si
   aspettano a vicenda** — e **una delle due può non essere una riga**: qui era un lucchetto di
   **tabella**, che nessun censimento di righe trova. 🔑 **E due dei tre rimedi proposti non avrebbero
   funzionato, uno fallendo nel modo peggiore: SEMBRANDO riuscito** (separare per laboratorio avrebbe
   cambiato **la frequenza** lasciando **la causa** intatta).
5. 🛑 **UNA PROVA CHE NESSUNO ESEGUE È PEGGIO DI UNA CHE NON C'È: fa credere che l'area sia coperta.**
   16 prove verdi in locale, **zero** sorveglianza. E il silenzio è la forma peggiore del guasto: la CI
   **non falliva**, semplicemente **non partiva**.
6. 🛑 **UN MANDATO CHE INDICA IL PEZZO DA MODIFICARE E NON LE CONDIZIONI CHE LO ATTIVANO.** `ci.yml:33-37`
   è il passo; **le righe 3-7 decidono se quel passo gira**. La riga era giusta e non è successo niente.
7. 🔑 **UNA DOMANDA POSTA MALE SI RISPIEGA, NON SI DÀ PER DECISA.** «*questa non l'ho capita, spiegamela
   meglio*» → rispiegata nello stesso turno, e la risposta (D339) ha cambiato il disegno.
8. 🔑 **UNA RISPOSTA DI FRANCESCO PUÒ MIGLIORARE LA DOMANDA.** Avevo chiesto «*ti segnalo che il dentista
   non ha aperto l'avviso?*»; lui ha risposto con **una sezione «Comunicazioni» nella scheda del
   dentista** — che non è un **allarme** ma un **archivio**, ed è **la forma che l'Art. 5(2) chiede**.
9. 🔑 **IL PANEL CHE NON APPROVA, MA TROVA UNA QUARTA STRADA.** Tre strade proposte a Francesco per il
   segno delle sostanze; **due advisor su tre, indipendenti e da estremi opposti**, ne hanno indicata una
   **quarta** (il segno sul **materiale**), ed è quella scelta. 📌 E lo stesso panel, **fuori dal proprio
   mandato**, ha trovato che **il moncone è classificato nella classe sbagliata**.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Il Task E** — piano pronto, **un compito alla volta con revisione** (deciso da Francesco), in
   **sessione nuova**. §0①.
2. 🔴 **Il moncone** (riga **35**) — difetto **vivo** che sposta una scadenza di legge; **panel
   normativo obbligatorio**.
3. 🔴 **I tre difetti del panel** (riga **36**) — due diventano raggiungibili **proprio con D325**.
4. 🟠 **La riga 34** — il segno sulle sostanze sul materiale, **dimensionamento da rifare**.
5. 🟠 **I rilievi estetici** (riga **37**) e **la riga 41** (il trigger che ricalcola tutto).
6. 🟠 **La PR #1**: in bozza. Diventa pronta **quando il Task E è dentro**.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. Il **piano**: `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — e la sua **autorevisione**,
   che dice **dove il piano può sbagliare**.
3. La **spec**: `docs/superpowers/specs/2026-08-09-avviso-al-dentista-design.md`.
4. Il **verbale**, centoquarantaduesima → centoquarantaseiesima tornata (**D325 → D339**).
5. La **coda della roadmap**, righe **34-41**.

## 5. Il minimo per non sbagliare

- 🛑 **`date` in un comando SEPARATO** — e per le **migration** l'orologio è **UNIVERSALE**:
  `date -u "+%Y%m%d%H%M%S"` (**D311**). **Pavimento: `20260808195344`.**
- ⚠️ **L'ora si legge, non si deduce:** oggi alle 09:23 stavo per datare «notte» una decisione delle
  nove del mattino, perché la sessione era cominciata alle 23:49.
- 📌 **D318 — `git add <percorsi>`, MAI `git add -A`.** 🔴 **E prima di salvare si guarda `git status`:**
  l'albero è condiviso con gli esecutori, e l'errore è stato pagato **in tutte e due le direzioni**.
- 🛑 **`verify:full` si legge DA VARIABILE e SENZA PIPE**, con **timeout 600000 ms**.
- 🔴 **`verify:full` NON carica `.env.local`:** in locale le **84** prove d'integrazione **si saltano**.
  Per lanciarle: `set -a && . ./.env.local; set +a && npx vitest run` → **5809/5809**.
  ➡️ **La CI è ora più severa della verifica locale**: un verde locale **non** garantisce un verde in CI.
- 🌐 **La CI parte solo su `main`, `develop` e sulle PR verso `main`.** Un ramo di lavoro **non la fa
  partire**: `gh run list --branch <ramo>` resta **vuoto**, senza errori. **Per questo esiste la PR #1.**
- ⚖️ **D284 — applicare una migration NON si chiede:** `npx supabase db push --linked --yes`. **Dopo è
  dovuta la FASE 6b.**
- ⚖️ **D296 — il push del RAMO non si chiede, e OGGI HA FUNZIONATO** (dieci volte, mai bloccato).
  🛑 **`main` è un'altra cosa: `git push origin main` FA PARTIRE VERCEL.**
- 🛑 **`scripts/psql.mjs`** accetta un file **e** `-c "SQL"` (non `\echo`), e si collega **come
  proprietario**: una sonda sui permessi **senza `SET LOCAL ROLE` non prova niente**.
- 🛑 **`now()` è COSTANTE dentro una transazione** · **il gettone di concorrenza non si riconverte MAI** ·
  **`DROP`→`CREATE`→`REVOKE`→`GRANT`→`COMMENT`** · **il file di migration non è la prova: la verità è il
  catalogo vivo**.
- ⚖️ **D103 — l'accesso al banco non si chiede:** `npx tsx scripts/link-accesso.ts`.
  ⚠️ **La ricetta scritta nel §7 del `GATE-L2.md` porta a un 404**: `TEST_EMAIL` punta a **un altro
  laboratorio** rispetto alla fixture. Guarda come ha fatto il Task 9.
- 🛑 **Niente `rm -rf` fuori dalle aree temporanee** (`/usr/bin/trash`); temporanei in `scripts/tmp/`.
- ⚠️ **In `memory/MEMORY.md` la formula «voce N» è RISERVATA** alle sezioni: per la roadmap si scrive
  «**la riga N della coda**». **La guardia blocca il commit.**
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- 🛑 **Worktree VIETATI.** Branch nel repo principale.
