# Handoff — il Task 7 è fatto, il Task 8 è a metà, e il Passo 1 ha trovato un difetto che il task stesso avrebbe creato

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 6 agosto 2026, mattina (`provato:` `date` → `2026-08-06 08:07 CEST`; il lavoro è stato fatto
la sera del 5 e chiuso qui).
**Stato:** ramo **`tinta-scheda-t7`** = `c5aaac9c`, **11 salvataggi avanti a `main`**, albero **pulito**,
⛔ **NON pubblicato**. *(Gli ultimi tre sono la coda di chiusura: D255 e l'allineamento dei conteggi.)*
`main` resta a **`affec7ae`** — in produzione ci sono ancora solo **T1-T6**.

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0** letta da file e non da pipe,
ore 08:12): tsc **0** · eslint **0** · `npm run build` ok · **sette guardie verdi** ·
`vitest` **5057 passate | 19 saltate** (**427 file | 3 saltati**, 430 in tutto).
📈 Riferimento di ieri sera: 5016 | 19 su 422 file → **+41 prove, +5 file**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🛑 UN RILIEVO SU DUE RESTA APERTO — e la ragione per cui non è stato chiuso vale più della correzione
`provato:` `grep -c "RILIEVO DELLA REVISIONE DI RAMO" src/app/api/lavori/[id]/route.ts` → **1**
(`route.ts:553`).

- ✅ **CHIUSO — «`colore_scartato` non ha un lettore»:** ora ce l'ha. `provato:`
  `src/hooks/useLavoroForm.ts:417` legge il campo e lo porta a schermo. Era **in produzione** senza
  lettore dal 28/07 (rilievo M2), ed era il difetto che D248 aveva aperto a metà.
- 🔴 **APERTO — «mezza coppia di tinta azzera senza dichiararlo»** (`route.ts:553-568`): il blocco entra
  su *una qualsiasi* delle due chiavi, mentre il contratto dice «insieme o nessuna».

🔑 **PERCHÉ NON È STATO CHIUSO, e non è stanchezza.** La decisione di chiuderlo «insieme al gemello del
colore» poggiava su una frase: *«la forma è identica al gemello»*. Aprendo `useLavoroForm` per il T8 è
emerso che **per il colore mezza coppia è il caso NORMALE e VOLUTO**: il form manda `colore_codice` e
**toglie apposta** `colore_scala`, perché la scala la deduce il server dal catalogo (blocco «IL COLORE DI
CASO», `useLavoroForm.ts`). Per la tinta, invece, mezza coppia è un corpo malformato.
➡️ **Quindi la premessa su cui si era deciso di trattarli insieme va RIVERIFICATA prima di scrivere una
regola sola per due casi che potrebbero non essere lo stesso caso.** Scriverla senza verificare sarebbe
esattamente il difetto che l'ondata combatte: **una regola sola dove servono due**, o due dove ne serve una.

### ② 🔴 IL COLLAUDO A SCHERMO NON È MAI STATO FATTO — e da adesso non c'è più la scusa
Né per il T7 né per il T8. `provato:` **0 lavori con tinta** in banca dati.
📌 **Ieri sera era IMPOSSIBILE e lo era per un motivo vero:** col solo T7 non esisteva alcun modo,
dall'interfaccia, di **mettere** una tinta (la riga compariva solo se una tinta c'era già). Una scrittura
diretta in banca dati è stata tentata ed è stata **bloccata dal classificatore dei comandi** — e la scelta
di non insistere resta giusta: una riga scritta a mano avrebbe provato che la riga si disegna, **saltando
il percorso che conta**.
🔴 **Ora il percorso c'è:** il T8 ha messo il campo sulla pagina di modifica. **La prima cosa da fare nella
sessione nuova è accendere il banco e mettere una tinta a mano dall'app**, poi guardarla sulla scheda.

### ③ 🟡 IL GATE ESTETICO L2 ORA È DOVUTO SU DUE SUPERFICI, NON UNA
La scheda (D247 cambia l'aspetto della carta) **e** la pagina di modifica (il campo nuovo).
`provato:` in `docs/design/screenshots/` **non esiste** alcuna cartella per le tinte.
⚠️ La tavolozza è stata approvata **su mockup** (D119), mai vista nel componente vero: la geometria
(righe a 60px fisse, 2 colonne a 390 e 3 da 768) è stata ricopiata **verbatim** dal mockup, ma
`grid-auto-rows` esiste proprio perché un nome lungo — «Glitter multicolore» — sfasava la riga, e quello
si vede **solo guardando**.

### ④ 🟡 Il gate L2 arretrato sul WIZARD è fermo da quattro giorni
Invariato: il foglio «Allega la prescrizione» e la schermata «Fatto!» non sono mai stati fotografati.
Si raggiungono **solo creando lavori veri** (sei, per tre formati × due temi).

### ⑤ 🟡 D253 sul COLORE è sospesa, e sa perché
La riga «Nessuna» premibile è stata fatta **per la tinta**. Per il **colore** aspetta **D254**: senza l'id
fine del tipo di lavoro, l'app non può sapere se un lavoro salvato preveda un colore
(`provato:` quattro macro su nove sono **miste**; l'id fine **non è persistito**).

### ⑥ 🟡 Invariati da ieri
L'ordine della pila blu a **1280** non provato · **riga 16** (`image/heic` fuori lista,
`src/lib/storage/tipi-immagine.ts:11`) · **`CRON_SECRET`** su Vercel · **rete mobile vera** · **il 12
contro 13** · il resto di **P37** (la Dichiarazione stampa una ragione sociale dove la norma vuole una
persona).

### ⑦ 🟠 Igiene, peggiorata di un ramo
`provato:` **32 rami locali** (erano 25: +7, fra cui `tinta-scheda-t7` che è **vivo**, gli altri no) ·
`.superpowers/sdd/` **ignorata da git** con **42 file** dentro, mai archiviata.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| 🔨 **T7 — la riga della tinta sulla scheda** | ✅ **Fatta e verde.** Si preme e apre il foglietto **sulla scheda** (D247); il catalogo si legge **una volta sola lato server** (`caricaTinteScheda`); la tavolozza vive **fuori** dai suoi due chiamanti |
| 🔨 **T8 — il campo sulla pagina di modifica** | 🟡 **A metà.** Fatti: il campo con la **stessa** tavolozza, i **tre lettori**, D253 sulla tinta. Manca: il rilievo aperto, il collaudo, il gate |
| 🔴 **P8-① — il difetto che il T8 avrebbe CREATO** | Il form mandava **sempre** la tinta nel corpo della PATCH (`{ ...data }`), rendendo **irraggiungibile** il ramo **D117**. Chi cambiava tipo si sarebbe sentito dire «*non sono riuscita a registrare la tinta che hai chiesto*» — un invito a riprovare **un gesto mai fatto** |
| ⚖️ **D251** | I due campi del T5 hanno un lettore ciascuno. **Premessa verificata prima di ratificare:** `ModificaRigaSheet.tsx:149` salva **davvero** dalla PATCH |
| ⚖️ **D252** | La **riga 22** collocata: **punto ⑤ della FASE 2**, col rischio accettato scritto (`METODI_VALIDI` in tre rotte) |
| ⚖️ **D253** | La riga non sparisce: dice «Nessuna» e si preme — **tinta subito, colore quando c'è il dato** |
| ⚖️ **D254** | L'**id fine del tipo di lavoro si persiste**, con l'ondata del **wizard**. 🛑 Confine duro: **prima della prima onboarding reale** |
| 📐 **Piano emendato** | Il Task 7 riscritto **prima** di eseguirlo (D247 + D251), coi registri **R-P1** (tre prove d'ambiente) e **R-P4** (sette forme d'input) |
| 🧾 **Documenti** | Testata della roadmap riallineata: era ferma a **241 decisioni in 91 tornate** contro **250 in 98** |

## 2. 🔑 Le lezioni

1. 🔴 **La premessa di una decisione va verificata come la decisione.** D251 poggiava su «il foglietto
   salva dalla PATCH»: verificato, **reggeva**. I due rilievi poggiavano su «forma identica al gemello»:
   **nessuno l'aveva verificata**, e a guardarla si scopre che forse è falsa. ➡️ **Una frase che regge una
   scelta è un'affermazione, e vale la regola delle altre.**
2. 🔴 **Il Passo 1 «apri il file che il piano non ha letto» ha pagato la sua intera esistenza.** P8-① non
   era un difetto **trovato**: era un difetto che il task **stava per creare**, invisibile finché il campo
   non fosse arrivato in pagina. R-P2 esiste per questo.
3. 🔑 **Un abbozzo inerte non si recupera dopo.** Sulla tavolozza è stato saltato e poi rifatto a
   posteriori (6 su 7). Ha funzionato **perché il componente era piccolo**: su qualcosa di più grande, a
   quel punto, si sarebbe scritto il test per farlo passare.
4. 🔑 **Un blocco del sistema di sicurezza può essere un favore.** La scrittura diretta della tinta in
   banca dati è stata rifiutata, e la prova che ne sarebbe uscita era **più debole** di quella vera: la
   riga si disegna ≠ il percorso funziona.
5. 🛑 **Correzione a sé stessi, due:** ① è stato scritto «letti memoria, roadmap» quando **i due tentativi
   di lettura di `MEMORY.md` erano falliti** per dimensione — corretto e riletto davvero; ② una sezione è
   stata datata **06/08 alle 00:24** mentre l'orologio diceva **05/08 23:59** — la data **dedotta** invece
   che letta, esattamente ciò che D155 vieta.
6. 🟠 **La guardia del dizionario si accende su due generic nella stessa riga:** il `>` del primo e il `<`
   del secondo racchiudono «Record», che è parola vietata. **Firma spezzata, guardia intatta** — mai
   ammorbidire la guardia per far passare il proprio codice.

## 3. Che cosa resta aperto (in ordine)

1. 🔴 **Riverificare se tinta e colore siano lo stesso caso** (§0①), poi chiudere il rilievo — o chiuderne
   **due diversi**, se sono due.
2. 🔴 **Il collaudo a schermo**, ora possibile: mettere una tinta dalla pagina di modifica, rileggerla
   **dalla banca dati**, vederla sulla scheda, cambiare il tipo e verificare che l'avviso dica **«ti ho
   tolto la tinta»** (è il ramo D117, che fino a ieri non poteva essere raggiunto).
3. 🟡 **Il gate estetico L2 su DUE superfici** (§0③) — 3 formati × 2 temi.
4. 🟡 **T9**: chiusura dell'ondata, poi **merge** (D249 delega il quando a chi esegue, non il **se le prove
   servono**).
5. 🟡 Il gate L2 arretrato del wizard · l'ordine a 1280 · le righe 13/14/16/17 · `CRON_SECRET`.
6. 🟠 **L'igiene di §0⑦** e, quando arriverà l'ondata del wizard, **D254**.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. **`docs/superpowers/plans/2026-08-03-tinte-manufatto.md`** — ⚠️ **prima della prosa** si leggono i
   «RITROVAMENTI ESEGUENDO» in fondo: ora sono **sette sezioni** (T1-T5, T7, T8) più **«Stato del Task 8
   alla chiusura»**, che dice esattamente cosa manca. Il **Task 7 è emendato due volte in testa** (D247 e
   D251).
3. **`docs/roadmap/ROADMAP-UFFICIALE.md`** — testata e **voce 6**; la **voce 1** ha ereditato **D254**.

## 5. Il minimo per non sbagliare

- **Il ramo è `tinta-scheda-t7`**, 8 salvataggi avanti a `main`, **non pubblicato**. 🛑 Mai un worktree.
- **Il banco:** `npm run build`, poi la configurazione **`ua-prod-3020`** che **esiste già**.
- **L'accesso:** `BASE=http://localhost:3020 npx tsx scripts/link-accesso.ts [email] [percorso]` —
  🛑 il link vale un accesso: si usa e si butta.
- **Il ponte SQL:** `node scripts/psql.mjs -c "SQL"`. ⚠️ **La scrittura in banca dati può essere bloccata
  dal classificatore**: se serve, la si chiede a Francesco invece di aggirarla.
- 🛑 **Per stabilire un'ASSENZA, un percorso alla volta** — in zsh un glob vuoto **abortisce tutto il
  comando** (ricapitato ieri, con `grep --include=*.ts` non quotato).
- 🛑 **Ogni sostituzione automatica porta la sua verifica nello stesso comando.**
- 🛑 **L'uscita di un comando dietro una pipe è quella dell'ULTIMO della pipe.**
- 🛑 **La data e l'ora si leggono da `date`, sempre** — ieri notte la deduzione ha sbagliato di 25 minuti e
  di un giorno.
- ⚠️ **Il verbale è fuori dalla catena della guardia:** il conteggio si verifica a mano.
- ⌨️ **`/chiudi` ORA È UN COMANDO VERO (D255):** `ua-app/.claude/commands/chiudi.md`, un **puntatore** alla
  skill. 🛑 Il **collegamento** che lo rende visibile dalla cartella superiore **vive fuori da git**: se la
  barra non risponde, si rifà con le due righe in `ua-app/CLAUDE.md` §0E.
- **Il prossimo numero di decisione è D256.**
