# Task 7 — IL PROMEMORIA PARLA DALLA HOME

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna`
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — Task 7, righe 402-422.

---

## 0. Dove sta questo compito

Il Task 6 ha portato il promemoria **sulla scheda del lavoro**: chi apre quel lavoro vede che deve avvisare
il dentista. Ma per vederlo bisogna **sapere che c'è** — cioè aprire proprio quel lavoro.

Questo compito lo fa **parlare dalla home**: la striscia in cima alla dashboard, che è il posto dove
l'app dice «*guarda questo*» quando qualcosa aspetta. Da lì si arriva alla scheda con un tocco.

**Due file soltanto:** `src/lib/dashboard/striscia.ts` (modifica) · `tests/unit/striscia.test.ts` (modifica).
🔑 **E quasi certamente un terzo, che il piano non nomina — v. §3.**

---

## 1. 🔴 LA TRAPPOLA, e va guardata PRIMA di scrivere una riga

`provato:` `striscia.ts:200` —

```ts
const perRuolo = LIVELLO1_PER_RUOLO[ruolo] ?? LIVELLO1_PER_RUOLO.tecnico
```

`LIVELLO1_PER_RUOLO` ha **quattro** chiavi (`titolare` · `admin_rete` · `front_desk` · `tecnico`,
`striscia.ts:193-197`). 🛑 **I ruoli in questa casa sono CINQUE**: `admin_sistema` **non è fra le chiavi**,
quindi **ripiega su `tecnico`**.

➡️ **Conseguenza diretta sul tuo compito: se metti `sAvvisoDentista` nella lista di `tecnico`, lo vede
anche `admin_sistema`** — che ⚖️ D342 esclude **per nome**, con questa motivazione:

> «*`admin_sistema` esce perché è personale UÀ: responsabile del trattamento che agisce su istruzione
> documentata (GDPR Art. 28(3)(a)), e non era presente alla telefonata.*»
> — `src/app/api/lavori/[id]/avviso/route.ts:50-52`

🔑 **Non ti sto dicendo come chiuderla: ti sto dicendo che esiste.** Verificala tu (l'ipotesi potrebbe
essere sbagliata: forse un `admin_sistema` non arriva mai a questa funzione — **guarda chi la chiama, con
quale ruolo, e scrivilo nel resoconto**). Se è vera, la chiudi **e scrivi come**; se è falsa, **dimmi
perché**, che è un fatto utile quanto la correzione.

⚠️ **Questa è la stessa famiglia di difetto già pagata in questo progetto:** un elenco che *sembra*
completo e non lo è è il modo classico per scrivere un controllo di permessi che dimentica un caso.

---

## 2. Il perimetro per ruolo È GIÀ DECISO — non riaprirlo, e non riscriverlo

⚖️ **D342** (09/08/2026, panel a tre, verbale centoquarantottesima tornata): **`titolare` · `tecnico` ·
`front_desk`.** Esclusi `admin_rete` **e** `admin_sistema`, entrambi **per nome**.

🛑 **`tecnico` resta DENTRO**, e non è una svista: il panel ha **ribaltato** la proposta di escluderlo,
perché se il tecnico ha telefonato e non può registrarlo, **registra un altro** — e nella riga resta
scritto un nome che non corrisponde al fatto (*attribuzione falsa*: la modifica peggiora la prova che
voleva proteggere). Il piano lo dice alla **riga 416**, dove la vecchia proposta è **barrata**.

🛑 **L'elenco NON si riscrive: si importa.** Vive in `src/lib/avvisi/ruoli.ts` — ci è stato **spostato**
dal Task 6 apposta perché una superficie client potesse leggerlo (la rotta lo ri-esporta per compatibilità,
ma **tu importi dal modulo**). Un terzo elenco degli stessi tre nomi è esattamente il difetto che quel
lavoro ha chiuso.

### 🛑 E c'è un'incoerenza PREESISTENTE che NON devi risolvere

`striscia.ts:270-274` dà a **`admin_rete`** i candidati fiscali e i pagamenti come al titolare, mentre
quattro rotte che parlano col cliente lo **escludono**. È la **riga 47** della coda della roadmap,
segnalata da tutti e tre gli advisor del panel di D342.

➡️ **Il Task 7 non lo risolve** — deve solo applicare D342 al **proprio** candidato. Toccare il perimetro
degli altri candidati è un'ondata a sé («che cosa può fare chi sta **sopra** più laboratori dentro il
laboratorio di un altro»). **Se lo tocchi, ti sei allargato.**

---

## 3. 🔑 IL DATO CHE MANCA — e il piano non lo nomina

Il candidato che il piano propone legge `i.avvisoDaComunicare`:

```ts
const sAvvisoDentista: Candidato = (i) => i.avvisoDaComunicare
  ? { attenzione: true, forte: `n.${i.avvisoDaComunicare.numero}`, testo: 'aspetta l\'avviso al dentista',
      azione: { etichetta: 'Apri ›', href: `/lavori/${i.avvisoDaComunicare.id}` } }
  : null
```

🛑 **Quel campo non esiste**, e nessuno lo popola. `IngressiStriscia` (`striscia.ts:36-63`) ha oggi otto
voci e nessuna riguarda gli avvisi.

**Quindi serve una lettura nuova: «c'è un avviso da comunicare in QUESTO laboratorio?»** — che è **diversa**
da entrambe quelle del Task 6 (`avvisoPerLaScheda` guarda **un lavoro**, `archivioCliente` guarda **un
cliente**). ⚠️ Il piano dichiara «*due letture della stessa tabella, niente terza fonte*»: **una terza
lettura non viola quella regola se sta nello stesso posto delle altre due** (`src/lib/avvisi/queries.ts`) e
usa lo stesso vocabolario. **Violarla sarebbe scriverla altrove.**

**Le tre cose che quella lettura deve avere, e le prime due sono le stesse del Task 6:**
1. 🛑 **`laboratorio_id` esplicito.** Il client di servizio **scavalca RLS**: quella `.eq()` è l'unica difesa.
2. 🛑 **Lo stato dal vocabolario** (`src/lib/avvisi/stati.ts`), mai una stringa a mano.
3. 🛑 **Il cancello per ruolo, o la non-lettura.** `provato:` è già il modo di casa —
   `fetchIngressiStriscia` (`striscia.ts:398-408`) **non legge** i dati fiscali per chi non li vede:
   `usaFiscali(ruolo) ? leggi… : Promise.resolve(null)`. **Fai come fa lei**: chi non può vedere il
   promemoria non deve nemmeno interrogare il banco.

### Due punti dove il codice del piano è ambiguo, e li decidi tu

- **`i.avvisoDaComunicare.id` — id di che cosa?** L'`href` è `/lavori/${…id}`, quindi è **il lavoro**;
  ma `numero` accanto è il numero del lavoro. 🔑 **Un campo che si chiama `id` in una struttura che si
  chiama «avviso» e contiene l'id di un'altra cosa è una trappola per chi legge dopo.** Dagli un nome che
  non menta, e **di' quale hai scelto**.
- **Se ce ne fosse più d'uno?** Il Task 6 ha misurato che **due riemissioni fanno due avvisi**, e sulla
  scheda mostra **il più vecchio**. 🛑 **Fai la stessa scelta e cita quella** — due superfici che scelgono
  in modo diverso sono una contraddizione a schermo. ⚠️ **La scelta è a panel proprio ora**: se cambiasse,
  deve cambiare **in un posto solo** — tienilo presente quando decidi **dove** vive quella regola.

---

## 4. L'ordine dell'array, e perché è una decisione e non una riga

```
// L'ORDINE DI QUESTO ARRAY È ORA PORTANTE — prima era ininfluente […] ora decide QUALE allarme
// parla quando 2+ sono accesi insieme.        — striscia.ts:180-186
```

Quando più allarmi sono accesi, **vince il primo**: nomina la striscia con le proprie parole, gli altri si
contano soltanto. Il piano chiede: **dopo i ritardi operativi, prima dei pagamenti** — e chiede di
**scrivere perché** nel commento.

🔑 **Scrivilo davvero, e con un argomento tuo**, non ricopiando la riga del piano. Chi legge fra sei mesi
deve poter dire se la scelta regge ancora. Un aiuto: un lavoro in ritardo è **una consegna che slitta**, un
avviso non dato è **un obbligo di legge aperto** — ma quale dei due debba parlare per primo dipende anche
da quanto spesso ciascuno è acceso.

---

## 5. Le prove

**TDD (FASE 6): la prova prima del codice.** Dopo il primo rosso, abbozzo inerte e **conteggio delle
asserzioni che si accendono** (`N su M`, R-P4). Prima delle asserzioni **enumera le forme d'ingresso** —
nessun avviso · un avviso · più d'uno · ciascuno dei **cinque** ruoli · un ruolo sconosciuto · l'avviso
acceso **insieme** a un ritardo (chi parla?) — ognuna col suo caso o col suo «non coperta, perché».

`tests/unit/striscia.test.ts` **esiste già**: leggilo prima, e segui la sua forma.

🛑 **Il criterio che conta più di ogni altro in questa casa, ed è costato quattro volte:** *una prova che
resta verde anche togliendo ciò che dovrebbe proteggere non prova niente.* Per ogni prova che scrivi,
chiediti: **se tolgo il cancello, questa diventa rossa? se INVERTO il cancello, diventa rossa?**
⚠️ **L'inversione è quella che conta** — nel Task 6 le prove sorvegliavano che il controllo *esistesse*, e
capovolgendolo restavano tutte verdi mentre a vedere il promemoria erano rimasti **solo gli esclusi**.
**Prova la mutazione, incolla il rosso, ripristina.**

**FASE 7, in chiusura:**
```bash
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
```
🛑 **timeout 600000 ms** · **MAI dietro una pipe** (`$?` leggerebbe l'ultimo comando della pipe: un
`VERIFY_EXIT=0` falso è già stato pagato qui).
📌 **Riferimento del giorno: 5949 passate | 126 saltate su 469 file**, `tsc` 0, build ok. Le saltate sono
le prove d'integrazione — `verify:full` **non carica `.env.local`** — e **non sono una regressione**.

---

## 6. I vincoli che non si discutono

- 🛑 **Ruoli: sono CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. **MAI
  `admin` nudo.** La fonte è il `CHECK` vivo su `public.utenti.ruolo`, **non** `schema.sql`, che ne
  dichiara quattro.
- 🛑 **Isolamento fra laboratori:** ogni lettura col client di servizio porta il proprio `laboratorio_id`.
- 🛑 **DS v3** dove tocchi interfaccia: componenti da `src/components/ds/`, token e motion da
  `src/design-system/v3/`. **Mai una `duration` inline.** (Probabilmente non tocchi interfaccia: la
  striscia è un modulo di logica. **Se ti accorgi di doverla toccare, fermati e dimmelo** — cambia il
  perimetro e fa scattare la FASE 9.)
- 🛑 **Nessuna migration in questo compito.** Se ti convinci che serva, **fermati e riferisci**.
- 🛑 **Nessun placeholder, nessun «lo aggiungiamo dopo».**
- 🛑 **Salvataggi:** `git status` **prima**, poi `git add <percorsi>` — **MAI `-A`**: l'albero è condiviso.
  Messaggi lunghi con `-F <file>` (con `-m` i backtick vengono **eseguiti**). Messaggio in italiano,
  forma di casa (`feat(avvisi): …`).
- ⛔ **`git push` ti verrà rifiutato: non provarci.** Pubblica l'orchestratore.
- 🛑 **Niente worktree.** Si lavora su questo ramo.
- 🛑 **`date` in un comando SEPARATO**, mai dedotta.

---

## 7. Come si chiude

1. **Salva**, e metti **l'hash vero** nel resoconto — non «il commit».
2. **Scrivi il resoconto** in `.superpowers/sdd/avviso-dentista-task-7-report.md`: le righe **lette** file
   per file · il conteggio R-P4 · le forme d'ingresso e la loro copertura · **le mutazioni provate con il
   rosso incollato** · l'esito di `verify:full` **letto da variabile** · l'autorevisione · e una sezione
   **«ciò che ho trovato fuori mandato»** (R-E2: si riferisce, non si corregge di nascosto).
3. **Torna solo:** stato (`DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED`), gli hash, una riga
   sull'esito delle prove, e i dubbi. **Il resto sta nel file.**

## 8. 🔑 Il tuo secondo mestiere: CERCA DOVE QUESTO BRIEF SBAGLIA

**R-E1.** In quest'ondata **sette compiti su sette hanno trovato un difetto** nel piano o nel mandato che
li governava — **compreso il Task 6, che ha smentito una mia riga misurando invece di dedurre** (gli avevo
chiesto un cancello dentro un componente client: non si poteva, e me l'ha provato con la build in mano).

**Dove guarderei per primo, e sono ipotesi mie, non fatti:** ① la trappola del §1 (il ripiego su `tecnico`)
· ② se `fetchIngressiStriscia` sia davvero il posto giusto per la lettura nuova, o se questo dato debba
essere **propagato dal chiamante** come `trial` e `tecniciSenzaAnagrafica` — `striscia.ts:41-49` spiega
perché alcuni ingressi stanno **fuori** di lei, e la ragione potrebbe valere anche qui · ③ se l'ordine
proposto dal piano regga davvero, o se un obbligo di legge debba parlare prima di un ritardo · ④ se
esistano **altre** superfici che mostrano la striscia oltre alla dashboard.

🛑 **Un difetto fuori dal tuo mandato si RIFERISCE, non si corregge di nascosto** (R-E2).
🛑 **E se qualcosa qui dentro ti sembra falso: fermati e chiedi.** Un brief non è una legge — è il lavoro
di qualcuno che può aver letto male, ed è già successo.
