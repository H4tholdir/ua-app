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
  runtime un `admin_rete` non veda la riga — quella la dà il giro del Task 10 · ③ la prova ⚖️ D350
  conta **due** occorrenze del nome a schermo: se un domani la carta lo mostrasse in un terzo posto,
  quella prova andrebbe letta di nuovo prima di «aggiustare il numero».

---

## 6. Salvataggi

| hash | contenuto |
|---|---|
| `a9e3e0d7` | `feat(avvisi): il promemoria arriva sulla scheda del lavoro (Task 6)` — 6 file, 803 righe aggiunte, 1 tolta |
| *(questo file)* | il resoconto, salvato subito dopo |

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
