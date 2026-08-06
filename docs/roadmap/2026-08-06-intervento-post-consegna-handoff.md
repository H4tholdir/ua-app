# Handoff — l'ondata dell'intervento è aperta: spec ratificata, piano scritto, primo compito fatto

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 6 agosto 2026, pomeriggio (`provato:` `date` → `2026-08-06 15:20 CEST`).
**Stato:** ramo **`intervento-post-consegna`**, **12 salvataggi avanti a `main`**, **NON pubblicato**.
Albero **pulito**. ⚠️ L'hash non si ricopia da qui: `git log --oneline -1`.

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0 letta da variabile e non da
pipe**, ore 15:20): tsc **0** · eslint **0** · `npm run build` ok · **sei guardie verdi** ·
`vitest` **5069 passate | 19 saltate** (**429 file | 3 saltati**, 432 in tutto).
📈 **Riferimento invariato rispetto a stamattina** — ed è un fatto, non un dettaglio: **§0①**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 L'ONDATA NON HA ANCORA **UNA SOLA PROVA AUTOMATICA**, ed è colpa di come ho scritto il piano
`provato:` `grep -rln "eventi_qualita\|valutazioni_evento\|valutazione_supera" tests/` → **nessun
file**. E il conteggio delle prove è **identico** a stamattina (5069), pur avendo creato due tabelle,
tre chiavi esterne composite, quattro vincoli `CHECK`, un indice unico parziale e una funzione
`SECURITY DEFINER`.

🔑 **Le prove ci sono state, e sono state serie** — nove verifiche di rifiuto in transazione annullata,
fra cui le tre cross-tenant e quella sul `service_role` — **ma sono state eseguite a mano, e non sono
ripetibili**. Vivono in un rapporto (`.superpowers/sdd/intervento-task-1-report.md`, **fuori da git**)
e in uno spike usa-e-getta. **Se domani qualcuno tocca quella migration, nessun controllo se ne
accorge.**

⚠️ **Perché è un difetto del piano e non dell'esecutore:** il Task 1 chiedeva prove *manuali* come
passo di verifica, e non chiedeva **un file di test in suite**. I task 2-5 invece hanno i loro test
scritti. ➡️ **La sessione nuova aggiunga `tests/unit/eventi-qualita-schema.test.ts` (🆕 da creare)** che rifà in
suite almeno: seconda valutazione viva **rifiutata** · evento su lavoro di altro laboratorio
**rifiutato** · valutazione su evento di altro laboratorio **rifiutata** · `UPDATE` diretto come
`service_role` **rifiutato** · e la controprova che una valutazione legittima **passa**.

### ② 🟠 QUATTRO RITROVAMENTI DEL TASK 1 SONO APERTI — riferiti e non corretti (R-E2)
Elenco e precedenti in `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md`, sezione
«RITROVAMENTI ESEGUENDO — Task 1»:
1. **`valutazioni_evento.sostituisce_id` è ancora una chiave esterna semplice** — **quarto** caso della
   stessa famiglia cross-tenant. Serve prima `UNIQUE (id, laboratorio_id)` su `valutazioni_evento`.
2. **`valutazione_supera()` fa metà lavoro**: fra «supera la vecchia» e «inserisci la nuova» c'è una
   finestra a **zero valutazioni vive**. Il task della riclassificazione le faccia **in una sola
   transazione**.
3. **`eventi_qualita` non ha alcun `REVOKE`**: il **fatto** è modificabile e cancellabile via
   PostgREST da un utente dello stesso laboratorio. **Va deciso** se anche il fatto debba diventare
   non modificabile — è l'unica voce di oggi che aspetta una decisione di Francesco.
4. **`TRUNCATE` resta concesso ad `anon`/`authenticated`** su ogni tabella — pattern preesistente,
   esposizione teorica (PostgREST non lo emette). Non introdotto qui.

### ③ 🟡 OTTO COMPITI SU NOVE NON SONO STATI FATTI
Fatto solo il **Task 1**. Restano: ② il dizionario e i tre test · ③ `riapri_lavoro_atomica` · ④ le due
rotte · ⑤ la riemissione nell'ordine annulla→riemetti · ⑥ «Devo intervenire» · ⑦ la finestra dei 10
minuti che sparisce · ⑧ il testo della riga bloccata · ⑨ gate estetico L2.
⚠️ **I task 6 e 8 passano dal cancello §0B** (mockup → screenshot → approvazione di Francesco), e il
piano **dichiara di non conoscere `SchedaLavoroV3.tsx`**: il loro dettaglio si scrive dopo che il
primo esecutore lo apre.

### ④ 🟡 INVARIATI DALL'HANDOFF DI STAMATTINA
Il **gate estetico L2 arretrato del wizard** (fermo da cinque giorni) · i **cinque deferiti** del gate
L2 delle tinte, di cui uno è una decisione (la route `/lavori/[id]/modifica` monta due design system) ·
**D253** sul colore, che aspetta D254 · l'ordine della pila blu a 1280 · **riga 16** (`image/heic`,
`src/lib/storage/tipi-immagine.ts:11`) · **`CRON_SECRET`** su Vercel · rete mobile vera · il 12 contro
13 · il resto di **P37**.

### ⑤ 🟠 IGIENE, PEGGIORATA DI POCO E DICHIARATA
`provato:` **33 rami locali** (era 32: ne ho aggiunto uno) · `.superpowers/sdd/` con **44 file** (erano
42). Rientra nell'ondata di riordino **D257**, che resta da fare.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ✅ **La §0 della ripresa era la CI** | **Verde** su entrambi i giri lasciati aperti (`31090252774`, `31090603988`), sito 200 |
| 🔬 **Panel di 3 advisor su dominio critico** | Tre premesse poste, **due falsificate e una invertita** |
| 🛑 **Il confine è stato RIBALTATO** | Non è l'applicazione al paziente: è la **consegna**. Il caso 2 — il dentista che segnala prima di applicare — è il caso **TIPICO di reclamo** (Min. Salute, 29/11/2022), non lavoro interno. Avevamo classificato al contrario |
| 🔴 **Un difetto sfiorato, e non era nel codice** | Un advisor proponeva una derivazione che assegnava «reclamo» **senza prima escludere l'incidente**: nasconde l'obbligo di **trend reporting Art. 88**. Adottato l'ordine ministeriale, **rifiutata** l'altra |
| ⚖️ **D264-D272, due tornate** | Perimetro casi 1/2/3/5 · documento sanitario e fiscale separati · `eventi_qualita` sopra il rifacimento · fatti non conseguenze · il confine è la consegna · **i 10 minuti spariscono del tutto** · correzione per sovrapposizione · la certificazione è un dato · **la dichiarazione NON si anticipa** |
| 🛑 **EUDAMED: risolto col testo primario** | La riga «esenti» era **falsa oltre il pre-market**, e stava in **TRE copie**: tutte corrette |
| 🔴 **Il Task 1 ha trovato DUE difetti Critici — del PIANO** | `REVOKE` senza `service_role` (che ha `bypassrls`) e chiavi esterne **semplici** invece che composite. Il progetto **aveva già pagato e risolto entrambi altrove** |
| ✅ **Chiusi e riprovati** | Cinque famiglie di prove, fra cui tre cross-tenant. Più la funzione `valutazione_supera()` che il `REVOKE` ha reso necessaria |

## 2. 🔑 Le lezioni

1. 🛑 **Una norma letta alla lettera può generare un problema che NON esiste.** Avevo proposto di
   anticipare la dichiarazione al «pronto» perché l'Art. 52(8) la vuole «prima dell'immissione sul
   mercato». Francesco: *«mica è una questione di timestamp con minutaggi o geolocalizzazioni… UÀ
   risolve i problemi, non deve crearne di nuovi»*. **D272**, e la voce si **chiude**.
   ➡️ **La provenienza nobile di un vincolo non lo rende utile.** Al mattino il panel aveva trovato un
   vincolo sopravvissuto alla sua architettura (i 10 minuti); al pomeriggio se ne stava creando uno
   nuovo dello stesso genere, ma partendo da una fonte autorevole invece che da una costante
   dimenticata.
2. 🔴 **Un piano può essere fedele alla spec e sbagliato allo stesso tempo.** I due Critici del Task 1
   non erano visibili rileggendo il piano: erano visibili solo **confrontandolo con ciò che il progetto
   aveva già imparato**. ➡️ Prima di scrivere un oggetto di database, si cerca il precedente **per
   COMPORTAMENTO** («chi altro qui protegge un riferimento fra tenant?»), **mai per nome**.
3. 🔑 **L'ORDINE in cui si fanno i controlli è esso stesso una regola.** Due derivazioni con gli stessi
   ingredienti, in ordine diverso, producono un adempimento e un'omissione. Non l'avrebbe trovato
   nessun test: sarebbe entrato dalla porta principale, dentro un parere autorevole.
4. 🔴 **Due decisioni giuste possono collidere in una CHIAMATA.** D265 e D269 si scontravano su
   `annulla_consegna_atomica`, che porta i cancelli fiscali. ➡️ **Si controllano dove il codice le fa
   incontrare, non nel documento che le enuncia.**
5. 🟠 **Una prova eseguita a mano non è una prova che resta** (§0①). Nove verifiche serie, e domani
   nessuna di loro difende più niente.

## 3. Che cosa resta aperto (in ordine)

1. 🔴 **Le prove in suite delle tabelle nuove** (§0①) — prima di qualunque altro compito.
2. 🟠 **I quattro ritrovamenti aperti** (§0②); il **terzo aspetta una decisione di Francesco**.
3. 🟡 **I task 2-9 del piano** — il 2 è quello su cui si gioca la correttezza normativa.
4. 🟡 Il **gate L2 arretrato del wizard** e i cinque deferiti (§0④).
5. 🟠 Il **riordino D257** e l'igiene (§0⑤).

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `docs/superpowers/plans/2026-08-06-intervento-post-consegna.md` — **i vincoli globali in cima** (ne
   sono stati aggiunti due dopo il Task 1) e la sezione **«RITROVAMENTI ESEGUENDO — Task 1»** in fondo.
3. La spec `docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md`, **ratificata**.
4. Il registro dei progressi: `.superpowers/sdd/progress.md` — **il Task 1 è complete, non
   ri-eseguirlo.**

## 5. Il minimo per non sbagliare

- **Worktree VIETATI.** Si usa una branch nel repo principale.
- **La data si legge dall'orologio** (`date`), mai dedotta.
- **L'uscita dietro una pipe è quella dell'ULTIMO comando**: `verify:full` si legge da variabile.
- **Per un'ASSENZA, un percorso alla volta**: un glob non quotato in zsh aborta tutto il comando.
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- **Il banco è `ua-prod-3020`**, nel launch.json della **cartella superiore**. Per il collaudo serve un
  utente **del laboratorio** (`h4t@live.it`): `francesco.formicola@live.it` è `admin_sistema` e viene
  dirottato su `/admin/labs`.
- **Il browser interno non preme le linguette della scheda**: si usa Playwright.
- **Le sonde sul database vivo** si modellano su `scripts/tmp/sonda-intervento-r-p1.mjs` (`pg` +
  `SUPABASE_DB_URL` da `.env.local`). ⚠️ Le prove di rifiuto girano in `BEGIN … ROLLBACK`, **mai** in una
  migration registrata.
- ⚠️ **I nomi dei file in `.superpowers/sdd/` NON sono distinti per ondata** — si usa il prefisso
  `intervento-`: una collisione è già stata pagata il 05/08.
- **Il push può essere rifiutato dal classificatore**: si chiede, non si aggira.
