# Task 6 — IL MONTAGGIO: resoconto

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna`
**Base:** `d3cc8c1a` · **Salvataggio del codice:** `a9e3e0d7` · **Data:** 09/08/2026 (`date` → `Sun Aug  9 23:03:42 CEST 2026`)
**Stato:** `DONE_WITH_CONCERNS` — il lavoro è finito e verde; **una riga del brief è risultata
impossibile** (§8①), e restano due scelte che meritano una ratifica (§8②, §8③).

---

## 1. Che cosa è cambiato

| file | che cosa |
|---|---|
| `src/lib/avvisi/queries.ts` 🆕 | le due letture: `avvisiDaComunicare` · `archivioCliente` |
| `src/app/(app)/lavori/[id]/page.tsx` | la lettura dall'alto, dentro il `Promise.all` che c'era già, dietro il cancello di ruolo ⚖️ D342 |
| `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` | il montaggio di `AvvisoDentista` con le sue otto proprietà |
| `src/types/domain.ts` | `LavoroDettaglio.avvisoDaComunicare?` — stesso modello di `tinta?` |
| `tests/unit/avvisi-queries.test.ts` 🆕 | 12 prove sulle letture |
| `tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx` 🆕 | 10 prove sul cablaggio |

---

## 2. Il censimento — le righe LETTE, file per file (R-P2 · R-P6)

**Il file che il piano dichiarava NON letto, e che era il mio primo passo:**

- `src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx` — **righe 1-1185, TUTTE**, in
  quattro letture (1-220 · 220-639 · 640-969 · 968-1185). Struttura: cappello (1-48, tre correzioni
  storiche già scritte lì) · `clienteDisplay` (108-111) · `SchedaLavoroV3` che si auto-avvolge in
  `AvvisiProvider` (144-150) · `SchedaLavoroV3Corpo` con `lavoroLocale` e la risincronizzazione
  «adjusting state while rendering» (171-191) · gli stati dei quattro strati dell'album (228-242) ·
  `pazienteTesto`/`tecnicoTesto` (412-415) · `rigaColore` (430-435) e `rigaTinta` (460-490) · il
  `return` con `scheda-shell` (552-982) · i cinque componenti locali in coda (985-1185).

**Aperti per decidere:**

| file | righe lette |
|---|---|
| `.superpowers/sdd/avviso-dentista-task-6-brief.md` | 1-272, tutte |
| `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` | 380-420 (Task 6 e i suoi vicini) · 440-480 (Task 9, Task 10, autorevisione) |
| `src/app/(app)/lavori/[id]/page.tsx` | 1-123, tutte |
| `src/lib/lavori/tinta-scheda.ts` | 1-80, tutte (il modello) |
| `src/lib/avvisi/stati.ts` | 1-50, tutte |
| `src/app/api/lavori/[id]/avviso/route.ts` | 1-413, tutte |
| `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` | 1-340 (cappello + le otto proprietà + gli stati) · 440-590 (`chiudi`, `registra`, `alTapDiInvio`) · 595-685 (la RIGA e lo `Sheet`) · 679-810 (passo 1 e passo 2) · 944-1015 (`RigaStrada`) · censimento a grep sul resto (`chiuso`, `return (`, `function `, e i sei nomi di proprietà) |
| `supabase/migrations/20260809123206_avvisi_dentista.sql` | tutta (colonne, i tre `CHECK`, i due indici, RLS, `REVOKE`/`GRANT`) |
| `supabase/migrations/20260809133546_correggi_e_riemetti_con_avviso.sql` | 37-93 (i rilievi del Task 2) · 488-548 (l'`INSERT` e il `COMMENT`) |
| `src/types/domain.ts` | 160-200 (`Cliente`) · 540-600 (`LavoroDettaglio`) · grep su `numero_lavoro` |
| `src/lib/avvisi/messaggio.ts` | 1-80 |
| `src/lib/supabase/lab-context.ts` | 1-60 (`LabContext.ruolo` è `string`, non un'unione) |
| `src/lib/supabase/server-service.ts` | 1-25 (**`import 'server-only'` alla riga 1** — v. §8①) |
| `src/lib/consegna/whatsapp-template.ts` | 55-100 (`numeroPerWhatsapp`, `buildWhatsappUrl`) |
| `tests/unit/tinta-scheda.test.ts` | 1-148, tutte (il modello del finto con la spia) |
| `tests/unit/scheda-v3/scheda-riga-tinta.test.tsx` | 1-90 (il modello della prova di cablaggio) |
| `tests/unit/firma-messaggi-nome-laboratorio.test.ts` | 1-45 (l'idioma della sentinella sul sorgente) |
| `vitest.config.ts` · `package.json` | interi / gli script |
| `docs/design/mockups/2026-08-09-avviso-al-dentista.html` | 170-195 (dove sta la riga nel mockup approvato) |

**Censimento degli identificatori (R-P6).** `RUOLI_CHIUSURA_AVVISO` (2 usi nel sorgente, 5 nella sua
prova, **0 consumatori applicativi prima di oggi**) · `STATI_AVVISO`/`STATI_CHIUSI`/`chiudeIlPromemoria`
· `AvvisoDentista` (prima di oggi **una sola occorrenza fuori dal proprio file, ed era un commento** —
`Campo.tsx:141`) · `caricaTinteScheda` (3 chiamanti) · `clienteDisplay` (7 usi nella scheda) ·
`pazienteTesto` · le 11 colonne di `avvisi_dentista`. **Nessun nome è stato tolto da un'allowlist:**
questo compito non ne tocca nessuna.

---

## 3. Le tre decisioni, e perché

**① Il cancello di ruolo sta nel componente SERVER, non nella scheda.** Non è una preferenza: è la
sola strada che esista (§8① — misurato). Sta in `page.tsx:105`, ed è meglio anche nel merito —
l'identificativo dell'avviso non entra nemmeno nella pagina di chi non potrebbe chiuderlo.
**Ruolo assente → non si vede niente:** `includes()` risponde `false` da sé, quindi il fail-closed
non ha un secondo ramo in cui sbagliare il verso del confronto.

**② Il tipo va su `LavoroDettaglio`, non in una proprietà nuova di `SchedaLavoroV3`.** Il motivo è
meccanico, non estetico: la scheda tiene uno specchio locale (`lavoroLocale`) e si risincronizza
sul confronto `props.lavoro !== lavoroPropPrecedente` (righe 187-191). Tutto ciò che la carta rende
passa da lì. Una proprietà a parte avrebbe introdotto una **seconda strada di aggiornamento** verso
lo stesso render — ed è la classe di difetto che quel file ha già pagato una volta (il cappello alle
righe 11-25 racconta il bug FK-refresh). `avvisoDaComunicare?` è opzionale come `tinta?`, e la
distinzione `undefined` («nessuno ha guardato») / `null` («guardato, non ce n'è») è scritta sul tipo.

**③ Uno solo, anche quando sono due.** Il caso è reale: `correggi_e_riemetti_atomica` fa un `INSERT`
**incondizionato** (`20260809133546:488`) e nessun indice unico parziale lo impedisce. La lettura
ordina **crescente** e la pagina mostra il **più vecchio**. La ragione non è il gusto: i due avvisi
portano `campi_corretti` diversi e sono **due rettifiche distinte** ex Art. 19 GDPR, quindi si
consuma prima l'obbligo nato prima. Chiudendo il primo la riga **ricompare** per il secondo: è la
verità, non un difetto. Due righe identiche sulla stessa carta sarebbero state la scelta peggiore, e
nessuna decisione le autorizza. ⚠️ **Va ratificata** (§8③).

---

## 4. Le prove

### 4.1 R-P4 — il conteggio

| momento | esito |
|---|---|
| primo rosso su `queries.ts` | «modulo non trovato»: **non prova niente**, ed è per questo che si conta dopo |
| abbozzo **inerte** (funzioni che tornano `[]` senza interrogare nulla) | **10 asserzioni su 12 si accendono** |
| le 2 che restavano verdi | «nessun avviso → `[]`» e «cliente senza comunicazioni → `[]`»: su un abbozzo inerte sono **vacue**, e si scrive invece di nasconderlo. Valgono contro una lettura che *sbagli*, non contro una che *manchi*. |
| primo rosso sul cablaggio (componente non ancora montato = abbozzo inerte naturale) | **9 asserzioni su 10 si accendono** — la decima è «senza avviso la riga NON esiste», vacua finché la riga non esiste |

### 4.2 La forma debole, evitata e **misurata**

Il brief avverte: un finto che risponde per ordine di chiamata e inghiotte i filtri lascia verdi le
prove **con le letture invertite**. Qui il finto registra la **LISTA** delle coppie
`[colonna, valore]` e le prove asseriscono **l'insieme intero** con `toEqual`.
🔑 **E c'è una correzione al modello di casa:** la spia di `tinta-scheda.test.ts` tiene *l'ultimo*
valore di `.eq()`; qui i filtri sono **tre**, e una spia a campo singolo sarebbe rimasta verde
togliendone due.

**Ogni filtro tolto dal sorgente, uno per volta → la suite diventa rossa:**

```
① .eq('laboratorio_id') in avvisiDaComunicare  →  Tests  2 failed | 10 passed (12)
② .in('stato', STATI_APERTI)                   →  Tests  2 failed | 10 passed (12)
③ .eq('lavoro_id')                             →  Tests  1 failed | 11 passed (12)
④ .eq('cliente_id') in archivioCliente         →  Tests  1 failed | 11 passed (12)
⑤ .order('id', {ascending:true})               →  Tests  1 failed | 11 passed (12)
   ripristinato                                →  Tests  12 passed (12)
```

**Stessa disciplina sul cablaggio:**

```
① telefonoStudio ← telefono invece di cellulare_whatsapp  →  1 failed | 9 passed (10)
② guardia del gemello copiata (stato === 'consegnato')     →  1 failed | 9 passed (10)
③ pazienteMostrato ← una seconda derivazione ('PZ-0231')   →  1 failed | 9 passed (10)
④ cancello di ruolo tolto da page.tsx                      →  1 failed | 9 passed (10)
   ripristinato                                            →  10 passed (10)
```

### 4.3 Le forme d'ingresso, e la loro copertura

| forma | copertura |
|---|---|
| nessun avviso | ✅ prova sulle letture **e** sul montaggio |
| un avviso aperto | ✅ entrambe |
| **due** avvisi aperti | ✅ sulla lettura (ordine crescente, `id` come secondo criterio). ⚠️ **La scelta del primo in `page.tsx` NON è coperta da una prova:** quel file è un componente server asincrono con sessione e client di servizio — renderlo in una prova unitaria vorrebbe dire fingere mezzo mondo, e la prova finirebbe per provare la finzione. Il giro vero è il **Task 10**. |
| un avviso **già chiuso** | ✅ **provata sul FILTRO, non sul dato**, ed è deliberato: dare una riga chiusa al finto non proverebbe niente — un finto che ignora i filtri la restituirebbe comunque. Si asserisce che nessuno stato di `STATI_CHIUSI` entra nell'`.in()`, cioè la cosa che davvero la esclude sul banco. |
| una riga di **un altro laboratorio** | ✅ stessa forma, stessa ragione: si asserisce che il filtro c'è, con il valore giusto, una volta sola |
| **ruolo assente** (`null`/`undefined`/sconosciuto) | ✅ per costruzione (`includes()` → `false`) + sentinella sul sorgente che pretende che la lettura stia dietro `puoVedereAvviso`. ⚠️ Nessuna prova di *rendering*: v. sopra, il file è un componente server |
| **ruolo escluso per nome** (`admin_rete`, `admin_sistema`) | ✅ sentinella: la pagina non contiene nessuno dei quattro nomi di ruolo come letterale, e legge l'elenco dalla rotta. Che l'elenco sia *quello giusto* è già provato dal Task 4 (`api-avviso.test.ts` ㉔, che lo confronta coi cinque ruoli veri) |
| lettura fallita (banco muto) | ✅ torna vuoto **e** lo scrive nei log (asserito) |
| cliente **senza** `portale_token` / **senza** cellulare | ➖ **non coperta da prove nuove, e non serve:** i due rami sono già provati nelle 56 del Task 5 (`AvvisoDentista.tsx:758-777`, i due riquadri «va senza collegamento» / «non ho il cellulare»). Qui il cablaggio passa `?? ''` e `?? null`, cioè proprio ciò che quei rami si aspettano |
| `laboratorio` nullo | ➖ non coperta: la proprietà è `string \| null` **per contratto** (⚖️ D345) e `firmaMessaggio` ha già il suo ramo provato |

### 4.4 FASE 7 — l'esito, letto da variabile

```
$ npm run verify:full > …/verify.log 2>&1; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
VERIFY_EXIT=0

 Test Files  458 passed | 9 skipped (467)
      Tests  5924 passed | 119 skipped (6043)
✓ Compiled successfully in 9.3s
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde
✅ reduced-motion: …
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
```

📌 Riferimento del brief: **5902 passate | 119 saltate su 465 file**. Ora **5924 su 467**: +22 prove
(esattamente le mie) e +2 file. Le 119 saltate sono le prove d'integrazione, che in locale non
vedono `.env.local`: **non è una regressione**, e in CI girano tutte.
🛑 `$?` letto **da variabile**, mai dietro una pipe.

---

## 5. Autorevisione

- **Nessun placeholder, nessun «lo aggiungiamo dopo».** `archivioCliente` è l'unico pezzo senza
  consumatore, e non è un placeholder: è la funzione che il **Task 9** deve chiamare invece di
  scriverne una seconda. Il commento lo dice per nome, con la ragione per cui non va creduta morta.
- **DS v3:** questo compito **non scrive una riga di interfaccia**. `AvvisoDentista` disegna sé
  stesso (§4.2 del brief), quindi non c'è nessun token, nessuna classe, nessuna `duration` inline da
  giudicare. Nessun componente fuori da `src/components/ds/` è stato introdotto.
- **Overlay v3 / «indietro»:** nessuna navigazione nuova. `useNavigaDaOverlay` non serve — questo
  montaggio non naviga da nessuna parte.
- **Nessuna migration**, come da mandato. Non me ne è servita nessuna e non ho cambiato idea.
- **GDPR:** il nome del paziente resta fuori dal messaggio, e c'è una prova che lo asserisce sul
  testo composto davvero (non sulla buona volontà).
- **Salvataggi:** `git status` prima, `git add` dei sei percorsi per nome, **mai `-A`**. Messaggio
  con `-F`. **Nessun `git push`** (mandato).
- **BP-1 (memoria e roadmap): NON fatto, e di proposito** — il piano lo assegna al **Task 10**
  («BP-1: memoria, roadmap, verbale»). Lo scrivo perché il silenzio non venga letto come una
  dimenticanza.
- **FASE 9 e FASE 9b: NON fatte, e di proposito.** Il piano le assegna esplicitamente al **Task 10**
  («FASE 9: 390 · 768 · 1280, chiaro e scuro, app e portale» · «FASE 9b — gate estetico L2 (D245):
  superfici nuove → **dovuto**»). ⚠️ Va detto chiaro: **il gate L2 è dovuto** — montare un
  componente cambia la struttura del markup, che D245 mette dalla parte dell'ASPETTO. Non è saltato,
  è di un altro compito.
- **Dove questo lavoro può sbagliare:** ① la scelta del «più vecchio» fra due avvisi aperti non ha
  una prova che la guardi in faccia (§4.3) e non ha una ratifica (§8③) · ② la sentinella sul
  sorgente di `page.tsx` è una prova **statica**: protegge dal togliere il cancello, non prova che a
  runtime un `admin_rete` non veda la riga — quella la dà il giro del Task 10.
- 🔄 **UNA PROVA L'HO SCRITTA FRAGILE E L'HO RIFATTA, e vale scriverlo.** La prova di ⚖️ D350
  contava le occorrenze del nome a schermo («devono essere **due**»): un numero che dipende da quante
  volte la **carta** nomina il paziente, cioè da qualcosa che con D350 non c'entra niente. Il giorno
  in cui la scheda lo mostrasse anche in testata, quella prova sarebbe diventata rossa parlando di
  tutt'altro. Ora si guarda **dentro il foglio** (`within(getByRole('dialog'))`), che è la domanda
  vera: «il foglio mostra lo stesso valore della carta?». Rifatta la mutazione ③ dopo il cambio —
  **ancora rossa**, quindi la forza è intatta e l'aggancio di troppo non c'è più.
- ⚠️ **Un limite dichiarato della sentinella di `page.tsx`:** le sue asserzioni negative
  (`not.toMatch(/'titolare'/)` e le altre tre) passano oggi perché quel file **non contiene nessun
  nome di ruolo**. Sono un **proxy**, non la regola: il giorno in cui la pagina gaterà qualcos'altro
  su `titolare` per una ragione sua, quella prova diventerà rossa dicendo «hai ricopiato l'elenco
  degli avvisi», che sarà **falso**. Chi ci arriva restringa l'asserzione al contorno della lettura
  degli avvisi invece di cancellarla.

---

## 6. Salvataggi

| hash | contenuto |
|---|---|
| `a9e3e0d7` | `feat(avvisi): il promemoria arriva sulla scheda del lavoro (Task 6)` — 6 file, 803 righe aggiunte, 1 tolta |
| `dc120fec` | `docs(avvisi): il resoconto del Task 6, e la riga del brief che non si poteva scrivere` |
| `633c7bcd` | `test(avvisi): la prova di D350 guarda DENTRO il foglio, invece di contare le occorrenze` — la prova fragile rifatta, e la mutazione ripetuta (v. §5) |

📌 Questa riga è l'ultima aggiunta al resoconto, quindi il salvataggio che la contiene **non può**
comparire nella tabella che è dentro: la catena completa si legge con
`git log --oneline a9e3e0d7~1..` sul ramo.

🛑 **Nessun `git push`**: il ramo lo pubblica l'orchestratore.

---

## 7. Ciò che ho trovato FUORI MANDATO (R-E2)

### 7.1 🔴 IL BRIEF §4.1 CHIEDE UNA COSA IMPOSSIBILE — e questo è il ritrovamento che conta

Il brief dice: «*La riga si mostra solo ai ruoli di quell'elenco*», nota che `SchedaLavoroV3` riceve
già `ruolo` («**Il ruolo c'è già. Ti servirà**») e cita come precedente `PATCHABLE_FIELDS`, «*letto
dalla sua prova*».

🛑 **Quel precedente non è dello stesso tipo, e la differenza è tutto:** una prova gira in Node, un
componente client gira nel browser. `RUOLI_CHIUSURA_AVVISO` vive in `avviso/route.ts`, che importa
`getServiceClient`, che apre con `import 'server-only'` (`server-service.ts:1`).

`provato:` innestato l'import vero dentro `SchedaLavoroV3.tsx` e lanciato la build —

```
$ npx next build ; echo "SONDA_BUILD_EXIT=$?"
SONDA_BUILD_EXIT=1

./src/lib/supabase/server-service.ts:1:1
'server-only' cannot be imported from a Client Component module
> 1 | import 'server-only'

Import traces:
  Client Component Browser:
    ./src/lib/supabase/server-service.ts [Client Component Browser]
    ./src/app/api/lavori/[id]/avviso/route.ts [Client Component Browser]
    ./src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx [Client Component Browser]
```

➡️ **Il cancello non può stare nella scheda.** Le tre uscite erano: ricopiare l'elenco (vietato dal
brief stesso, e giustamente), spostare la costante in un modulo condiviso (fuori mandato: è il file
del Task 4), oppure **decidere dal server**. Ho preso la terza, che è anche l'unica che *migliora*
qualcosa: l'identificativo dell'avviso non entra nella pagina di chi non può chiuderlo.
⚠️ `tsc --noEmit` **non** vede questa classe di errore: solo `next build`. È la stessa nota che
`CLAUDE.md` §0C porta sulla FASE 7.
📮 **Al Task 7 (la striscia della home):** stesso muro, stessa domanda. `striscia.ts` è un modulo
puro, ma se il candidato finisse per essere filtrato in un componente client, l'elenco non ci arriva.

### 7.2 Il commento della proprietà `telefonoStudio` dice il campo sbagliato — **non toccato**

`AvvisoDentista.tsx:268-269` documenta la proprietà come «`clienti.telefono` — il numero da comporre
su `wa.me`». È il campo sbagliato: `domain.ts:174-176` dice che chi manda WhatsApp legge **SEMPRE**
`cellulare_whatsapp`, «*altrimenti il messaggio riparte su un fisso*».
**Non l'ho corretto** (è il file del Task 5): ho cablato `cellulare_whatsapp`, ho scritto la ragione
al mio punto di chiamata, e c'è una prova che diventa rossa se qualcuno «riallinea il codice al
commento». ⚠️ Ma il commento resta lì, e ora **contraddice il suo unico chiamante**: chi lo legge
per primo crederà a lui. Merita una riga di correzione da chi ha mandato in quel file.

### 7.3 `caricaTinteScheda` è un'attesa in fila che poteva stare nel `Promise.all` — **non spostata**

`page.tsx:97` fa `await caricaTinteScheda(...)` da solo, e dieci righe più sotto c'è già un
`Promise.all`. La mia lettura è entrata **dentro** quel `Promise.all` (costo zero); quella della
tinta è rimasta dov'era. Spostarla è un cambiamento di prestazioni su una pagina che non è mia da
riscrivere, e non l'ho fatto di nascosto.

### 7.4 Il testo del piano per il Task 6 avrebbe aperto un buco fra laboratori

Il piano (riga 397) scrive le due firme così: `avvisiDaComunicare(lavoroId)` e
`archivioCliente(clienteId)` — **senza `laboratorioId`**. Con il client di servizio, che scavalca la
RLS, quelle due firme sono letture che attraversano i laboratori. Il brief l'aveva già intercettato
(§3.1) e io ho seguito il brief; lo scrivo perché **il piano, sul disco, dice ancora così**, e i
compiti che vengono dopo lo leggeranno.

### 7.5 Rilievi già aperti che continuano a valere, e nessuno li ha ancora presi

- `avvisi_dentista.dichiarazione_id` è `ON DELETE CASCADE`: cancellare una dichiarazione porta via
  **in silenzio** la prova che il dentista fu avvisato (già riferito dal Task 2, ancora aperto).
- `anon` e `authenticated` hanno `SELECT` su `avvisi_dentista` (già riferito dal Task 1).
- `avvisi_dentista` non è nominata in `admin_delete_laboratorio`, quindi il conteggio che quella
  funzione restituisce tace su di essa (già riferito dal Task 1).
- Lo scorrimento dello `Sheet` non si azzera al cambio di passo: la cura vera sta in `Sheet.tsx` e
  vale per **ogni** foglio a passi (già riferito dal Task 5).

---

## 8. Che cosa aspetta una risposta

1. **§8① è chiuso da una misura, non da un'opinione** — ma il brief resta sbagliato sul disco per
   chi lo rilegge, e la nota vale per il Task 7.
2. **Dove sta la riga sulla carta.** L'ho messa **sopra** «Devo intervenire» e sotto il banner
   dell'annullo consegna: nel mockup approvato la riga sta in alto, subito sotto il titolo del
   lavoro, e un obbligo aperto viene prima di un'azione facoltativa. Nessuna decisione lo fissava:
   **è una mia scelta**, e si sposta in una riga.
3. **Due avvisi aperti: si mostra il più vecchio, uno solo.** Il piano non lo dice, il brief lo
   segnalava come domanda. La scelta e la sua ragione normativa stanno al §3③. **Va ratificata** —
   e se la risposta fosse «il più recente», si cambia un `ascending` e una prova.

---

# 9. Correzioni della revisione (09/08/2026 — `date` → `Sun Aug  9 23:50:59 CEST 2026`)

**Esecutore:** passaggio di correzione, mandato dell'orchestratore.
**Stato:** `DONE_WITH_CONCERNS` — le cinque voci sono chiuse e misurate; **una riga del
mandato di correzione era sbagliata e l'ho cambiata** (§9.6①), e **un buco resta aperto per
scelta motivata** (§9.6②).

| voce | esito |
|---|---|
| 🔴 1+2 — cancello per ruolo provabile · niente import di rotta nella pagina | ✅ chiuse dallo stesso cambiamento |
| 🔴 3 — `COLONNE` legate allo schema vero | ✅ prova d'integrazione, lanciata a mano, mutazione provata |
| 🟡 4 — il commento di `domain.ts` che il codice smentiva | ✅ corretto il commento (il codice ha ragione) |
| 🟡 5 — la frase sull'indice che la riga sotto smentiva | ✅ corretta la frase (il secondo criterio resta) |
| 🚫 6 — `pazienteTesto` = `'—'` | non toccato, come da mandato |
| `verify:full` | **`VERIFY_EXIT=0`** — 5939 passate \| 122 saltate su 469 file |

---

## 9.1 🔴 IMPORTANTE 1+2 — un solo cambiamento, e il file nuovo è una FOGLIA

**Che cosa ho fatto.** Creato `src/lib/avvisi/ruoli.ts`: l'elenco `RUOLI_CHIUSURA_AVVISO` è stato
**spostato** lì dalla rotta, insieme a **tutta la sua motivazione** — le tre ragioni per nome di
⚖️ D342 e le due misure `provato:` sul catalogo vivo. `avviso/route.ts` ora **ri-esporta**
(`export { RUOLI_CHIUSURA_AVVISO } from '@/lib/avvisi/ruoli'`) e importa il predicato; il suo
riquadro rimanda al posto nuovo, e il riferimento «*il Task 7 deve leggere lo stesso*» è stato
riscritto in «*il Task 7 legge da `@/lib/avvisi/ruoli`*». `lavori/[id]/page.tsx` importa da lì, e
l'import della rotta **non c'è più**.

🔑 **`ruoli.ts` non importa NIENTE, ed è il punto.** Un modulo foglia lo possono leggere il server,
il browser e una prova, senza condizioni — che è esattamente ciò che sbatteva contro il muro
`server-only` e che sbloccherà il Task 7.

**Perché la motivazione è stata spostata e non lasciata nella rotta.** Se l'elenco va in un posto e
il *perché di ogni nome* resta in un altro, si è costruita la divergenza che la correzione voleva
chiudere. `CLAUDE.md` §9 lo dice per esteso: in un documento lungo vince ciò che si legge per primo.
Per la stessa ragione ho **riscritto in cima** (non annotato in fondo) il cappello dell'import in
`page.tsx`, che apriva ancora con «*è esportata dalla rotta … v. il riquadro a `avviso/route.ts:185-190`*».

### DUE NOMI, e perché non uno

`puoChiudereAvviso` (il permesso) e `puoVedereAvviso` (la visibilità), **il secondo derivato dal
primo**. La ragione è nel testo stesso di D342: «*la visibilità è un SOTTOINSIEME del permesso …
**non è un bicondizionale** — si può mostrare meno di ciò che si permette, mai il contrario*».
Un nome solo scriverebbe nel codice un bicondizionale che la decisione **nega**, e il giorno in cui
la visibilità dovesse restringersi qualcuno la restringerebbe sul permesso — cioè chiudendo fuori
dall'adempimento chi invece deve adempiere. La derivazione garantisce il verso *per forma*: la
visibilità non può diventare più larga del permesso per sbaglio.

Firma allargata a `string | null | undefined`: i chiamanti veri hanno davvero il ruolo assente
(`SchedaLavoroV3` riceve `ruolo?: string | null`). **Nessun ramo in più**: `includes()` risponde
`false` da sé, così non esiste un secondo posto in cui sbagliare il verso.

### La prova nuova — `tests/unit/avvisi-ruoli.test.ts`, 15 asserzioni

I **cinque ruoli veri** con la loro risposta attesa, **scritti a mano**, più `null`, `undefined`,
`''`, `'admin'` nudo, `'front-desk'` col trattino e `'Titolare'` maiuscolo.
🛑 **Nessun ciclo su `RUOLI_CHIUSURA_AVVISO`**: è la trappola già pagata in questa casa e scritta in
`api-avviso.test.ts:559` — un ciclo sulla costante è **tautologico**, chi togliesse `front_desk`
farebbe girare il ciclo su due nomi e la prova si adatterebbe al difetto invece di trovarlo.

### LE MUTAZIONI, PROVATE UNA PER UNA

**① `puoChiudereAvviso` capovolto** (`return !(…).includes(…)`):
```
$ npx vitest run tests/unit/avvisi-ruoli.test.ts tests/unit/api-avviso.test.ts
 Test Files  2 failed (2)
      Tests  39 failed | 7 passed (46)
AssertionError: expected true to be false // Object.is equality
 ❯ tests/unit/avvisi-ruoli.test.ts:107:35
```
Ripristinato → verde.

**② solo `puoVedereAvviso` capovolto** (`return !puoChiudereAvviso(ruolo)`) — la mutazione che
smaschera un involucro non provato:
```
 Test Files  1 failed | 1 passed (2)
      Tests  7 failed | 39 passed (46)
AssertionError: expected false to be true
 ❯ tests/unit/avvisi-ruoli.test.ts:120:96
   expect(puoChiudereAvviso(ruolo), `«${ruolo}» vedrebbe un avviso che non può chiudere`)
```
🔑 `api-avviso.test.ts` resta **verde**, ed è giusto: la rotta usa solo il permesso. L'involucro ha
la sua prova, non l'ombra di quella dell'altro. Ripristinato → verde.

---

## 9.2 🔴 IMPORTANTE 3 — `COLONNE` legate allo schema, e **una riga del mandato era sbagliata**

**Che cosa ho fatto.** `COLONNE` è ora **esportata** da `queries.ts` (senza l'export la prova
ricopierebbe i nomi e proverebbe la propria copia), e c'è
`tests/integration/avvisi-colonne-schema.test.ts` — **sola lettura, zero righe**, tre prove:
la `select` di `queries.ts` contro il banco vero; gli stessi nomi in posizione di **filtro** e di
**ordinamento**, più `laboratorio_id` che in `COLONNE` non c'è ed è ciò che regge l'isolamento fra
laboratori; e il verso opposto — `COLONNE` è **tutta la tabella meno `laboratorio_id`**, così un
nome *tolto* (che non farebbe fallire nessuna `select`: la riga arriva con un campo `undefined`) si
vede lo stesso.

### 🛑 IL MANDATO PRESCRIVEVA UNA STRADA CHE IN CI SI SAREBBE SALTATA — e l'ho cambiata

Il mandato scriveva `svc.from('avvisi_dentista').select(COLONNE).limit(0)`, cioè il client di
servizio via PostgREST. `provato:` letto `.github/workflows/ci.yml` — il passo «Unit tests» riceve
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_DB_URL`, e **NON**
`SUPABASE_SERVICE_ROLE_KEY`. Una prova gattata su quella chiave si sarebbe **saltata in CI**: cioè
esattamente il silenzio che il rilievo esiste per rompere. (Per giunta `getServiceClient` non è
nemmeno importabile da una prova: `server-only/index.js` è un `throw` nudo.)
➡️ Scritta con `pg` + `withRollback` + `skipIntegrationTests`, che è il cancello che **CI onora**
(D333) ed è quello di tutte le sorelle in quella cartella. `COLONNE` è un semplice elenco di
colonne: SQL e PostgREST rifiutano gli stessi nomi.
⚠️ Il prezzo, dichiarato nel file: se un giorno `COLONNE` guadagnasse sintassi PostgREST (un alias,
un embed), la prova diventerebbe rossa — **con ragione**, perché quel giorno la lettura non è più un
elenco di colonne.

### Lanciata a mano, e l'esito incollato

```
$ set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-colonne-schema.test.ts
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

### LA MUTAZIONE ③ — un nome storpiato dentro `COLONNE` (`created_at` → `creato_at`)

```
 Test Files  1 failed (1)
      Tests  3 failed (3)

- Expected  + Received
-   "created_at",
+   "creato_at",
 ❯ tests/integration/avvisi-colonne-schema.test.ts:94:35
```
Tutte e tre arrossiscono. Ripristinato → 3 passate.

---

## 9.3 🟡 MINORE 4 — ha ragione il CODICE, e il commento è stato riscritto

`domain.ts` dichiarava `undefined` = «nessuno ha guardato (…**o un ruolo che non può chiudere
l'avviso**)», ma l'unico scrittore assegna sempre `avvisiAperti[0] ?? null`: per un ruolo escluso il
valore è `null`.

**Scelta: si corregge il commento, non il codice.** 🔑 E non per pigrizia: un ruolo escluso **deve**
ricevere esattamente lo stesso silenzio di «non ce n'è». Distinguere i due casi vorrebbe dire far
sapere a chi guarda che da qualche parte esiste un promemoria che lui non può chiudere — il
contrario di ⚖️ D342, che quel promemoria lo nasconde apposta. **L'indistinguibilità è la funzione,
non un ripiego**, e ora il tipo lo dice. Resta la distinzione che il codice garantisce davvero:
`undefined` = nessun chiamante ha attaccato il campo · `null` = il chiamante l'ha attaccato e non
c'è niente da mostrare.

## 9.4 🟡 MINORE 5 — il secondo criterio resta, la frase cambia

La frase diceva che l'ordine decrescente è quello che `idx_avvisi_per_cliente (cliente_id,
created_at DESC)` «sa dare senza ordinare a parte», ma i criteri sono **due** e `id` in
quell'indice non c'è. Ora la frase dice come stanno le cose: l'indice serve `created_at DESC`;
`id DESC` è il **pareggio deterministico** e per averlo il pianificatore può dover ordinare
comunque. Si accetta — su un archivio di poche righe per cliente un sort non si sente, mentre due
righe nate nello stesso istante che escono ora in un ordine ora nell'altro si vedono benissimo, e su
un registro che è la prova ex Art. 5(2) GDPR un ordine ballerino è un difetto vero.
📌 Nessuna prova cambia: `avvisi-queries.test.ts` asseriva già i due criteri.

## 9.5 Le sentinelle vecchie: **declassate**, non cancellate

Le tre di `scheda-avviso-dentista.test.tsx` ora aprono con un riquadro che dice che cosa **non**
provano, e ne è stata aggiunta una: `page.tsx` **non deve contenere nessun import da `@/app/api/`**.
Le altre due seguono il posto nuovo (`@/lib/avvisi/ruoli`, `puoVedereAvviso(context.ruolo)`).

---

## 9.6 Ciò che ho trovato FUORI MANDATO, e ciò che resta aperto (R-E2)

**① Il mandato di correzione sbagliava sul trasporto della prova d'integrazione** — §9.2. Non è
un dettaglio: la forma prescritta si sarebbe **saltata proprio in CI**. Riferito, e cambiato con la
misura in mano.

**② 🔴 IL BUCO CHE IL REVISORE HA TROVATO NON È CHIUSO DEL TUTTO, e lo scrivo per intero.**
Il rilievo 1 nasceva da una mutazione precisa: **capovolgere il ternario in `page.tsx`**. La
correzione prescritta chiede di provare il **predicato** («*capovolgi il predicato, lancia la prova,
incolla il rosso*»), e quello ora è provato. Ma il ternario **no**. Misurato, non supposto:

```
--- MUTAZIONE ④ (di controllo): `mostraIlPromemoria` → `!mostraIlPromemoria` in page.tsx ---
$ npx vitest run tests/unit/avvisi-ruoli.test.ts tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx \
                 tests/unit/avvisi-queries.test.ts tests/unit/api-avviso.test.ts
 Test Files  4 passed (4)
      Tests  68 passed (68)
```
**Verdi.** Il motivo è strutturale: `page.tsx` è un componente server asincrono che apre una
sessione e un client di servizio, e nessuna prova unitaria lo rende.

🛑 **Ho valutato due modi di chiuderlo e li ho SCARTATI, con la ragione:**
- un involucro `avvisiVisibiliPer(svc, {ruolo, …})` che tenga dentro sé il cancello — resta
  aggirabile chiamando la funzione grezza, e aggiunge un terzo nome esportato su cui i Task 9 e 10
  dovranno scegliere;
- infilare `ruolo` dentro `avvisiDaComunicare` (fail-closed per costruzione: non si può leggere
  senza dichiarare chi guarda) — è **più forte**, ma cambia una firma che i Task 9 e 10 leggeranno e
  fa riscrivere dodici prove verdi.

Sono **decisioni di progetto che toccano i compiti a valle**, non correzioni: la regola di casa
(§0C, regola advisor) le manda a un panel, non a un esecutore su un passaggio di correzione.
➡️ **Riferite qui.** Nel frattempo il limite è **scritto sulla riga stessa** in `page.tsx` e nel
riquadro delle sentinelle, così chi ci arriva lo legge prima di fidarsi. La copertura vera resta il
giro sul banco del **Task 10**.

**③ Restano aperti** i rilievi già elencati al §7.5 (nessuno di essi è stato preso da questo
passaggio), e il §7.2 — il commento di `AvvisoDentista.tsx:268-269` che documenta `telefonoStudio`
come `clienti.telefono`: **ancora fuori mandato, ancora non corretto**.

---

## 9.7 Le prove rilanciate

```
$ npx tsc --noEmit ; echo TSC_EXIT=$?
TSC_EXIT=0

$ npx vitest run tests/unit/avvisi-ruoli.test.ts tests/unit/avvisi-queries.test.ts \
                 tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx tests/unit/api-avviso.test.ts
 Test Files  4 passed (4)
      Tests  68 passed (68)

$ set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-colonne-schema.test.ts
 Test Files  1 passed (1)
      Tests  3 passed (3)
```
🔑 **Le prove della rotta dell'avviso NON hanno cambiato esito** — `api-avviso.test.ts` importa
ancora `RUOLI_CHIUSURA_AVVISO` **dalla rotta** e la trova, perché la rotta la ri-esporta. Era il
tripwire di perimetro: se fosse arrossita, mi sarei allargato.
📌 `next build` (dentro `verify:full`) è ciò che vede la firma degli export di un `route.ts`, non
`tsc`: la ri-esportazione è passata di lì.

### FASE 7 — l'esito, letto da variabile

```
$ npm run verify:full > …/verify2.log 2>&1; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
VERIFY_EXIT=0

 Test Files  459 passed | 10 skipped (469)
      Tests  5939 passed | 122 skipped (6061)
✓ Compiled successfully in 4.8s
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
✅ reduced-motion: …
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma
✅ copia allineata al progetto, e la rete di sicurezza è recente
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
```

📌 **I conti tornano esattamente**, e vale scriverlo perché un numero che non torna è un file che
non gira: era **5924 \| 119 su 467**, ora **5939 \| 122 su 469**. +15 passate = le quindici di
`avvisi-ruoli.test.ts`; +3 saltate = le tre della prova d'integrazione, che in locale non vede
`.env.local` (in CI gira, v. §9.2); +2 file.

⚠️ **IL PRIMO GIRO ERA ROSSO, E LO SCRIVO INVECE DI NASCONDERLO.** `VERIFY_EXIT=1`, due prove
cadute: `DevoIntervenire.test.tsx` e `devo-intervenire-contratto.test.tsx`, **entrambe per
`Test timed out in 5000ms`**. Non c'entrano con questo lavoro — non toccano nessun file che ho
cambiato — ed è il **flake da carico** già noto in questo repo: nel giro rosso quel file solo ha
impiegato **135 secondi**, lanciato da solo ne impiega **11**.
`provato:` `npx vitest run tests/unit/DevoIntervenire.test.tsx tests/unit/devo-intervenire-contratto.test.tsx`
→ `Test Files 2 passed (2) · Tests 99 passed (99)`. Secondo giro pieno: `VERIFY_EXIT=0`.

### 9.8 I salvataggi di questo passaggio

| hash | contenuto |
|---|---|
| `798f5655` | `fix(avvisi): il cancello per ruolo diventa una funzione pura, e la pagina non importa più una rotta` — rilievi 1+2 · 5 file, 310 righe aggiunte, 89 tolte |
| `9f8c72c5` | `test(avvisi): le colonne che il codice chiede sono legate allo schema vero` — rilievo 3 + minori 4 e 5 · 3 file, 137 aggiunte, 8 tolte |
| — | il salvataggio che porta questo resoconto **non può nominare sé stesso**: si legge con `git log --oneline 798f5655~1..` |

📌 **Un controllo che mancava e che ho fatto dopo, perché né `tsc` né le prove lo vedono:**
`avviso/route.ts` è un file speciale di Next e prima esportava un valore **definito nel file**, ora
**inoltra** un legame da un altro modulo — sono due cose diverse per l'analisi delle rotte.
`provato:` nel registro di `verify:full` la rotta compare fra quelle costruite
(`ƒ /api/lavori/[id]/avviso`) e **non c'è nessun avviso di build** sugli export: l'unico `⚠` del
registro è quello preesistente sulla deprecazione di `middleware`, che con questo lavoro non
c'entra.

🛑 **Nessun `git push`**: il ramo lo pubblica l'orchestratore.

---

# 10. Terzo giro — il ternario chiuso, e la strada vera provata (10/08/2026 — `date` → `Mon Aug 10 00:08:07 CEST 2026`)

**Stato:** `DONE`. I due buchi che il secondo giro aveva **dichiarato aperti** sono chiusi, ed
entrambi con una mutazione che diventa rossa. Nessun nuovo buco dichiarato.

| voce | esito |
|---|---|
| ① l'involucro: cancello + lettura in una funzione sola | ✅ `avvisoPerLaScheda`, 10 prove nuove, 2 mutazioni rosse |
| ② la strada vera: le letture attraverso il client di servizio | ✅ 4 prove nuove, mutazione rossa **col messaggio vero del banco** |
| ③ il `.gitignore` | chiuso dall'orchestratore, niente da fare qui |
| `verify:full` | **`VERIFY_EXIT=0`** — 5949 passate \| 126 saltate su 469 file |

---

## 10.1 ① L'INVOLUCRO — il ternario non ha più dove vivere

**Che cosa ho fatto.** `avvisoPerLaScheda({ svc, lavoroId, laboratorioId, ruolo })` in
`src/lib/avvisi/queries.ts`: tiene **il cancello di ⚖️ D342 e la lettura dentro la stessa funzione**,
e torna l'avviso aperto oppure `null`. `page.tsx` è ora **una chiamata sola**, senza nessun ternario
e senza nessuna variabile di cancello. `avvisiDaComunicare` **non cambia firma** — l'involucro la
chiama, e le sue dodici prove sono rimaste quelle.

🛑 **`ruolo` è una chiave OBBLIGATORIA del tipo, non opzionale:** chi dimentica di dichiarare *chi
guarda* **non compila**. È la differenza fra fail-closed **per costruzione** e fail-closed *per
disciplina* — e la disciplina è esattamente ciò che il ternario aveva lasciato scoperto.

🔑 **E si è spostata anche la scelta «uno solo, anche quando sono due»**, che stava in `page.tsx`
come `avvisiAperti[0] ?? null`: aveva lo stesso identico problema — una decisione vera in un file che
nessuna prova rende. Ora ha la sua asserzione.

**Le prove sono dieci, e guardano LA SPIA, non solo il valore di ritorno.** Il motivo è che
«torna `null`» non distingue «non ha letto» da «ha letto e non c'era», mentre tutto il senso del
cancello è che l'identificativo dell'avviso **non entri nemmeno** nella pagina di chi non potrebbe
chiuderlo. Quindi: per i tre ammessi `spia.consultato === 1` e l'avviso torna; per i due esclusi
`spia.consultato === 0` e torna `null` — **con il finto che ha una riga aperta da dare**, così un
cancello girato dalla parte sbagliata la restituirebbe. I cinque nomi sono scritti a mano.

### LE MUTAZIONI — questa volta su ciò che ha preso il posto del ternario

**Ⓐ il cancello CAPOVOLTO dentro l'involucro** (`if (puoVedereAvviso(arg.ruolo)) return null`):
```
$ npx vitest run tests/unit/avvisi-queries.test.ts
 Test Files  1 failed (1)
      Tests  10 failed | 12 passed (22)

AssertionError: expected undefined to be 'avv-vecchio'
 ❯ tests/unit/avvisi-queries.test.ts:316:23
AssertionError: expected "error" to be called at least once
 ❯ tests/unit/avvisi-queries.test.ts:326:21
```
**Tutte e dieci** le prove dell'involucro arrossiscono. 🔑 **Ed è esattamente la mutazione che il
giro scorso restava verde:** nella forma vecchia lo stesso capovolgimento dava `4 files, 68 passed`.

**Ⓑ il cancello TOLTO** (riga commentata):
```
 Test Files  1 failed (1)
      Tests  3 failed | 19 passed (22)

AssertionError: admin_rete non deve vedere nessun avviso: expected { id: 'avv-1', …(10) } to be null
AssertionError: admin_sistema non deve vedere nessun avviso: expected { id: 'avv-1', …(10) } to be null
AssertionError: «null» non deve vedere nessun avviso: expected { id: 'avv-1', …(10) } to be null
```
Ripristinato → `22 passed (22)`.

### Le sentinelle vecchie: da unica difesa a **guardia di forma**

Le tre di `scheda-avviso-dentista.test.tsx` non provano più il cancello — non ne sono più capaci e
non devono esserlo. Ora provano ciò che una sentinella sul sorgente sa fare davvero:
① la pagina non tiene copie dei nomi di ruolo e **non importa da `@/app/api/`** ·
② 🔑 **la pagina NON chiama `avvisiDaComunicare`** — è l'unico modo in cui il cancello potrebbe
tornare aggirabile, perché quella funzione non ha nessun parametro `ruolo` e chiamarla da lì vorrebbe
dire rifare il ternario a mano · ③ il ruolo che le arriva è `context.ruolo`, non una costante (senza
questa riga la pagina potrebbe passare `'titolare'` fisso e tutto resterebbe verde).

## 10.2 ② LA STRADA VERA — le letture attraverso il client di servizio

**Il dubbio era fondato, e la conseguenza pesava più di quanto avessi scritto.** Con `pg` si prova
che i nomi delle colonne **esistano**, non che **PostgREST** — la strada che il codice usa davvero —
li accetti nella forma in cui gliela passiamo. Sull'unico ambiente autorevole restavano provate solo
contro un finto.

➡️ **Aggiunto un secondo gruppo nello stesso file**, con il client di servizio vero. Quattro prove:
`avvisiDaComunicare`, `archivioCliente`, `avvisoPerLaScheda` con un ruolo ammesso — e la quarta,
che è la migliore: **con un ruolo escluso `svc.from` non viene chiamato nemmeno una volta**, cioè
⚖️ D342 provato sulla strada vera e non su un finto.

🔑 **E si guarda `console.error`, non il valore di ritorno**, perché è tutto il punto della faccenda:
`vuotoConNota` **inghiotte** l'errore e torna una lista vuota, indistinguibile da «non c'è nessun
avviso». Una prova che guardasse il ritorno sarebbe verde **anche con lo schema rotto** — cioè
riprodurrebbe il silenzio che stiamo chiudendo.

🛑 **Il cancello di questo gruppo è dichiarato dentro il file, non silenzioso:** salta quando manca
`SUPABASE_SERVICE_ROLE_KEY`, cioè **in CI** — e il commento dice perché, e dice che è il motivo per
cui il gruppo `pg` esiste separato e gira **sempre**. ⚠️ Il giorno in cui quella chiave entrasse nei
segreti del passo «Unit tests», questo gruppo comincerebbe a girare in CI **da solo**.

```
$ set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-colonne-schema.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

### MUTAZIONE Ⓒ — e qui si legge il messaggio VERO del banco

`created_at` → `creato_at` dentro `COLONNE`, **6 prove su 7 rosse**, e questa è la riga che vale:
```
AssertionError: PostgREST ha rifiutato la lettura: expected '[AVVISI] avvisiDaComunicare: lettura …' to be ''
+ [AVVISI] avvisiDaComunicare: lettura fallita, il promemoria non è visibile —
  column avvisi_dentista.creato_at does not exist
```
🔑 **Quello è, alla lettera, ciò che in produzione sarebbe finito nei log mentre il promemoria ex
Art. 19 GDPR spariva dalla scheda senza che nessuno se ne accorgesse.** Ripristinato → 7 passate.

## 10.3 Un difetto MIO, trovato dalla catena e non da me

Il primo `verify:full` di questo giro è uscito **`VERIFY_EXIT=2`**:
```
tests/integration/avvisi-colonne-schema.test.ts(159,36): error TS7006: Parameter 'c' implicitly has an 'any' type.
```
Avevo tenuto la spia in una variabile tipizzata `ReturnType<typeof vi.spyOn>` e ci leggevo
`.mock.calls`. **`npx vitest run` non se ne accorge — non compila i tipi — e `tsc` sì.** Le prove
erano verdi e il codice non compilava: è esattamente il motivo per cui la FASE 7 sono **tre** comandi
e non uno. Rifatto raccogliendo il **testo** dei guasti invece della spia, e — 🛑 **la parte che
conta** — **ho rifatto la mutazione Ⓒ sulla forma nuova** per accertarmi che l'asserzione non fosse
diventata vacua: **ancora 6 rosse su 7**, con lo stesso messaggio.

## 10.4 Le prove, e FASE 7

```
$ npx tsc --noEmit ; echo TSC_EXIT=$?
TSC_EXIT=0

$ npx vitest run tests/unit/avvisi-ruoli.test.ts tests/unit/avvisi-queries.test.ts \
                 tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx tests/unit/api-avviso.test.ts
 Test Files  4 passed (4)
      Tests  78 passed (78)

$ set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-colonne-schema.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)

$ npm run verify:full > …/verify4.log 2>&1; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
VERIFY_EXIT=0

 Test Files  459 passed | 10 skipped (469)
      Tests  5949 passed | 126 skipped (6075)
✓ Compiled successfully in 3.1s
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde · ✅ reduced-motion · ✅ Coerenza verde
✅ copia allineata al progetto · ✅ 2 progetti dichiarati, 2 con prove
```
📌 **I conti tornano:** era **5939 | 122 su 469**, ora **5949 | 126**. +10 passate = le dieci
dell'involucro; +4 saltate = le quattro del client di servizio, che in `verify:full` non vedono
`.env.local`; nessun file nuovo. 🔑 **Le prove della rotta dell'avviso non hanno cambiato esito**,
ancora una volta: era il tripwire di perimetro.

## 10.5 Ciò che resta, e non è un buco

- **`avvisiDaComunicare` resta esportata e senza cancello.** È deliberato: è la lettura grezza, e le
  sue dodici prove valgono. Chi rende una schermata usa `avvisoPerLaScheda`; la sentinella su
  `page.tsx` controlla che quella pagina non torni alla grezza. 📮 **Al Task 9:** l'archivio del
  dentista (`archivioCliente`) **non ha un cancello di ruolo**, e non gliene ho messo uno — chi lo
  vede è una decisione di quella superficie, non di questa, e inventarla qui vorrebbe dire farla
  senza il verbale.
- **Il giro sul banco del Task 10 resta dovuto**, ma non più come *unica* copertura del cancello:
  ora prova il giro dell'utente, non una riga che nessuno guardava.
- **Restano aperti** i rilievi del §7.5 e del §7.2 (il commento di `telefonoStudio` nel componente
  del Task 5), invariati.

### 10.6 I salvataggi del terzo giro

| hash | contenuto |
|---|---|
| `4d8bddd9` | `fix(avvisi): il cancello e la lettura in una funzione sola, e il ternario non ha più dove vivere` — ① e ② · 5 file, 370 righe aggiunte, 84 tolte |
| — | il salvataggio che porta questa sezione non può nominare sé stesso: `git log --oneline 4d8bddd9~1..` |
