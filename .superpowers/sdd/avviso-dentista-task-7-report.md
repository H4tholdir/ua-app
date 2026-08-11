# Task 7 — resoconto: «il promemoria parla dalla home»

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` · **10/08/2026** (`date` → `Mon Aug 10 00:59:16 CEST 2026`)
**Salvataggi:** `ba831dea` (implementazione + prove) · `a006f940` (questo resoconto) · `5a59ff85` (§11 — un commento falso che avevo scritto io, corretto e pinnato)
**Stato:** `DONE_WITH_CONCERNS` — il lavoro è finito e verde; restano **una prova a schermo non fatta** (§8) e **un contro-argomento sull'ordine** che non è di un esecutore chiudere (§7).

---

## 1. 🔴 LA TRAPPOLA DEL §1: il meccanismo era FALSO, la conclusione VERA per un'altra strada

Il brief chiedeva di verificare che `LIVELLO1_PER_RUOLO[ruolo] ?? LIVELLO1_PER_RUOLO.tecnico`
(`striscia.ts:200`) facesse ereditare a `admin_sistema` la lista del tecnico. **L'ho misurato guardando
chi chiama la funzione e con quale ruolo, come chiesto.**

**I produttori della striscia sono due, e sono tutti:**

| chiamante | ruolo che arriva a `scegliSegnale` | esito |
|---|---|---|
| `src/app/(app)/dashboard/page.tsx:104` | `context.ruolo`, ma **`:27` rimanda al login** chi non è fra `titolare · admin_rete · tecnico · front_desk` — con tanto di commento «*admin_sistema usa /admin*» | `admin_sistema` **non arriva mai** |
| `src/app/admin/labs/[id]/live/page.tsx:58` | la stringa **cablata `'titolare'`** | `'admin_sistema'` **non arriva mai** |

➡️ **Il ripiego è irraggiungibile dai due chiamanti vivi**: ogni ruolo che gli passano è già una chiave.
La stringa `'admin_sistema'` non raggiunge `scegliSegnale` da nessuna strada esistente.
🛑 **Il ripiego resta però fail-OPEN nella forma** — un ruolo nuovo in banca dati erediterebbe la lista
del tecnico — e questo vale per **tutti** gli altri candidati, non solo per il mio: v. §9.

**Ma la conclusione del brief era giusta, e la strada è peggiore di quella che sospettava.**
`/admin/labs/[id]/live/page.tsx` **pretende** `admin_sistema` (`:24`) e poi calcola la striscia **come
se fosse il titolare** (`:58`). Quindi:

> Se la lettura del promemoria fosse finita dentro `fetchIngressiStriscia`, l'anteprima admin l'avrebbe
> eseguita **col ruolo 'titolare'** — e il cancello per ruolo non l'avrebbe fermata, perché il ruolo che
> riceve *è* ammesso. **Il personale UÀ avrebbe visto il promemoria di un laboratorio in cui non lavora**,
> cioè esattamente ciò che ⚖️ D342 esclude per nome (GDPR Art. 28(3)(a), «non era presente alla telefonata»).

🔑 **E la casa lo sapeva già, per un'altra query.** `striscia.ts:333-341`, sopra
`leggiTecniciSenzaAnagrafica`, dichiara **questa identica trappola** e la stessa soluzione: tenere la
lettura **fuori** da `fetchIngressiStriscia` e farla portare al chiamante, «*se la query vivesse qui
dentro, l'anteprima mostrerebbe segnali reali sui tecnici scoperti del lab osservato*».
➡️ Ho fatto come fa lei. **La difesa è strutturale, non un `if`.**

---

## 2. Che cosa ho scritto, e dove

| file | cosa |
|---|---|
| `src/lib/avvisi/queries.ts` | `avvisoPerLaStriscia` (la terza lettura) · `AvvisoStriscia` · `DAL_PIU_VECCHIO` · `logGuasto`/`nienteConNota` |
| `src/lib/dashboard/striscia.ts` | ingresso `avvisoDaComunicare` · candidato `sAvvisoDentista` · posizione nei 4 array · filtro `puoVedereAvviso` in `candidatiLivello1` |
| `src/app/(app)/dashboard/page.tsx` | la chiamata nel `Promise.all` e la propagazione a `scegliSegnale` |
| `tests/unit/striscia.test.ts` | +16 prove (13 sul candidato, 3 di sentinella) |
| `tests/unit/avvisi-queries.test.ts` | +14 prove sulla lettura, `.limit()` aggiunto al finto |
| `tests/integration/avvisi-colonne-schema.test.ts` | +2 prove (il `JOIN` in CI · l'embed PostgREST) |

### 🛑 I file sono SEI, e il brief ne prevedeva tre

Il brief §0 diceva «due file soltanto» + «quasi certamente un terzo» (`queries.ts`). Il **quarto** è
`dashboard/page.tsx`, e **non è un allargamento: è la conseguenza diretta del §1**. Se la lettura non può
stare in `fetchIngressiStriscia`, qualcuno deve chiamarla, e quel qualcuno è la home — come già fanno
`trial`, `tecniciSenzaAnagrafica`, `parete` e `liberazioneRecente`. Il **quinto** e il **sesto** sono le
prove che coprono il quarto e la lettura nuova.
✅ **Nessuna migration**, come da mandato. **Nessuna interfaccia toccata:** `SegnaleStriscia` non guadagna
campi, il candidato restituisce la forma standard `{attenzione, forte, testo, azione}` — identica a `s2` o
`s6` — quindi `StrisciaStato`/`HomeV3`/`NavDesk` lo rendono senza sapere che esiste.

### Le due ambiguità che il brief mi ha lasciato decidere

- **`i.avvisoDaComunicare.id` — id di che cosa?** Risolto togliendo il nome che mente: i campi si chiamano
  **`lavoroId`** e **`numeroLavoro`**. Nessun `id` dentro una struttura chiamata «avviso» che contenga
  l'identificativo di un'altra cosa. ⚠️ **E il piano sbagliava anche la colonna:** `numero` non esiste su
  `lavori`, si chiama **`numero_lavoro`** (`supabase/schema.sql`, tabella `lavori`) — la `select` del
  piano non avrebbe compilato contro il banco, e l'errore sarebbe stato **inghiottito** dal ripiego.
- **Se ce ne fosse più d'uno?** Stessa scelta della scheda — **il più vecchio** — ma **non ricopiata**: il
  brief avvisava che la regola è a panel e «deve cambiare in un posto solo». Vive in **`DAL_PIU_VECCHIO`**
  (`queries.ts`), usata da `avvisiDaComunicare` **e** dalla lettura nuova. La mutazione **M8** lo prova:
  capovolgere quella costante accende una prova del Task 6 **e** una del Task 7 insieme.
  ⚠️ `archivioCliente` **non** la usa, ed è dichiarato: un archivio si legge dal più recente (D337), è una
  regola diversa che si somiglia — e due ordini che si somigliano non sono la stessa decisione.

### 🔑 La scelta che vale la pena spiegare: il candidato sta in TUTTI E QUATTRO gli array

Il brief insisteva: «l'elenco NON si riscrive, si importa — un terzo elenco degli stessi tre nomi è
esattamente il difetto che il Task 6 ha chiuso». **Metterlo a mano in esattamente tre array sarebbe stato
proprio quello**: scrivere D342 una terza volta, in forma di appartenenza a una lista.
➡️ Quindi: **l'array dice DOVE parla** (l'ordine), **`puoVedereAvviso` dice SE parla** (il permesso). Il
candidato sta anche nella lista di `admin_rete`, che non lo vedrà mai — e il filtro chiude nello stesso
gesto il ripiego fail-open per i ruoli sconosciuti.

---

## 3. Il conteggio R-P4

**Primo rosso, con zero righe di sorgente cambiate:** `10 falliti | 60 passati (70)`.
Delle 16 prove nuove: **10 rosse, 6 verdi** — le verdi sono quelle che asseriscono un'**assenza**
(`silenzio`), che un modulo che ignora del tutto il campo produce comunque.

**Con l'abbozzo inerte** (ingresso dichiarato, candidato `() => null`, lettura `async () => null`,
cablaggio completo): `10 falliti | 60 passati (70)`, ma **un insieme diverso** —
➡️ **9 prove su 13 del candidato si accendono.** Le 4 che restano verdi sono, ancora, quelle di assenza
(`null` · `undefined` · `admin_rete` · ruolo sconosciuto): **da sole non distinguono un candidato inerte da
uno giusto**, e lo scrivo perché è precisamente ciò che R-P4 serve a rendere visibile. Il loro valore non
viene da qui ma dalle mutazioni **M1/M2** (§6), che le accendono.

🔴 **E la decima rossa era colpa mia, non del codice.** La sentinella cercava la **stringa**
`avvisoPerLaStriscia` dentro `striscia.ts` — e `striscia.ts` quel nome lo cita eccome, **nei commenti che
spiegano perché la lettura sta altrove**. Una sentinella rossa a causa della prosa che documenta la
difesa che sorveglia. Riscritta per guardare l'**import** (`from '@/lib/avvisi/queries'`) e la **forma di
chiamata**: l'import è la condizione *necessaria* per eseguirla, e nessun commento lo produce.

---

## 4. Le forme d'ingresso, e la copertura di ciascuna

| forma | coperta da | esito |
|---|---|---|
| nessun avviso (`null`) | `nessun avviso (null) → …silenzio` | ✅ |
| campo **assente** (`undefined`) — è il caso dell'anteprima admin | `campo ASSENTE (undefined) → …` | ✅ |
| **un** avviso | `titolare, un avviso aperto → …` | ✅ |
| **più d'uno** | provata **sulla lettura**, non sul candidato: `DUE promemoria aperti…` + `chiede UNA riga sola, la PIÙ VECCHIA…` | ✅ |
| `titolare` · `tecnico` · `front_desk` · `admin_rete` · `admin_sistema` | `i cinque ruoli: …ESATTAMENTE chi puoVedereAvviso ammette` (su **tutti e due** gli strati) | ✅ |
| ruolo **sconosciuto** | `un ruolo SCONOSCIUTO non lo vede, benché … ripieghi sulla lista del tecnico` | ✅ |
| ruolo `null`/`undefined` | `ruolo assente → fail-closed senza un secondo ramo` | ✅ |
| avviso **+ ritardo** insieme | `acceso INSIEME a un ritardo: parla il ritardo…` | ✅ |
| avviso **+ pagamento** insieme | `acceso INSIEME a un pagamento scaduto: parla il promemoria…` | ✅ |
| avviso + ritardo + pagamento (`altri: 2`) | `un ritardo e un pagamento insieme…` | ✅ |
| avviso **+ trial ≤3gg** | `il trial ≤3gg resta in TESTA anche al promemoria` | ✅ |
| avviso + racconti quieti (parete, DdC) | `è un allarme, non un racconto` | ✅ |
| embed come **oggetto** / come **array** | due prove distinte | ✅ |
| embed **nullo** o senza numero | `riga SENZA numero incorporato → null e un log` | ✅ |
| banco **guasto** | `se il banco non risponde → null, e lo dice nei log` | ✅ |
| zero righe **senza** guasto | `nessun promemoria aperto → null, e non è un guasto` (asserisce che **non** si logga) | ✅ |
| **due avvisi sullo stesso lavoro nella stessa striscia** | ❌ **non coperta, e non è coprivile qui:** la lettura consegna un oggetto solo, quindi a `scegliSegnale` il plurale non arriva mai. La scelta è nella lettura, ed è lì che è provata. |

---

## 5. `verify:full` — l'esito letto da variabile

```
npm run verify:full > …/verify.log 2>&1; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
→ VERIFY_EXIT=0
```
(🛑 **mai dietro una pipe**: il redirect scrive su file, `$?` è quello di `npm`.)

```
Test Files  459 passed | 10 skipped (469)
      Tests  5980 passed | 128 skipped (6108)
✓ Compiled successfully in 3.2s
```
(Rilanciato dopo la correzione della §11 — il giro precedente diceva `5979`, cioè una prova in meno:
è quella aggiunta lì.)
`npx tsc --noEmit` → **nessun output** (zero errori), lanciato anche a parte.

**Il riferimento del brief torna esatto, e la quadratura è la prova che non ho mosso altro:**
5949 → **5979** = **+30** (poi **5980**, +31, con la prova della §11), che è precisamente `+16` (striscia,
poi 17) `+14` (avvisi-queries) misurate contro
`HEAD` (`git show HEAD:<file> | grep -cE "^\s+it\("`). 126 → **128** = **+2**, che sono esattamente le due
prove d'integrazione nuove, saltate in locale perché `verify:full` non carica `.env.local`.
➡️ **Nessuna prova preesistente cambia stato.**

---

## 6. Le mutazioni — otto, tutte rosse, e i due cancelli provati SEPARATAMENTE

Riferimento a mutazione zero: `Tests  106 passed (106)` sui due file unitari.

| # | mutazione | esito | la prova che si accende |
|---|---|---|---|
| **M1** | **tolgo SOLO il filtro dell'array** in `candidatiLivello1` | `3 failed \| 103 passed` | `admin_rete NON lo vede NEMMENO se il dato gli arriva` · `un ruolo SCONOSCIUTO non lo vede` · `i cinque ruoli` |
| **M2** | **inverto** il filtro dell'array | `11 failed \| 95 passed` | tutte le positive (titolare/tecnico/front_desk) + ordine + aggregato |
| **M3** | **tolgo SOLO il cancello** dentro `avvisoPerLaStriscia` | `3 failed \| 103 passed` | `un ruolo escluso … non lo interroga` · `i CINQUE ruoli veri` · `ruolo assente` |
| **M4** | **inverto** il cancello della lettura | `13 failed \| 93 passed` | tutte le prove della lettura |
| **M5** | la lettura **rientra** in `striscia.ts` | `1 failed \| 105 passed` | `🛑 striscia.ts NON può eseguire la lettura: se ci finisse dentro, l'anteprima admin la eseguirebbe` |
| **M6** | sposto il promemoria **in testa** alla lista del titolare | `2 failed \| 104 passed` | `acceso INSIEME a un ritardo: parla il ritardo` · `…altri vale 2` |
| **M7** | tolgo `.eq('laboratorio_id', …)` dalla lettura | `2 failed \| 104 passed` | `interroga … i filtri giusti, e sono TUTTI E DUE` · `il filtro sul laboratorio porta il laboratorio CHIESTO` |
| **M8** | `DAL_PIU_VECCHIO` → `{ ascending: false }` | `2 failed \| 104 passed` | **una del Task 6** (`DUE riemissioni fanno DUE avvisi aperti…`) **e una del Task 7** (`chiede UNA riga sola, la PIÙ VECCHIA…`) |
| **M9** | sposto il promemoria appena **sopra `s1`** — la mutazione che il commento falso della §11 invitava a fare | `3 failed \| 68 passed` | `🛑 ma sta SOTTO la fattura scartata…` (la prova nuova) + le due dell'ordine |

🔑 **M1 e M3 sono le due che contano davvero**, ed erano il punto debole da chiudere: invertire
`puoVedereAvviso` capovolge **tutti e due** gli strati insieme, quindi proverebbe solo «un cancello
esiste» — che è esattamente ciò che il Task 6 ha misurato non bastare. Togliendone **uno solo per volta**
si accendono **3 prove per parte**: nessuno dei due strati è codice non provato.
🔑 **M8 è la prova che la regola vive in un posto solo:** un'unica riga cambiata rende rosse due superfici.

Dopo ogni mutazione: ripristino e ricontrollo → `Tests 106 passed (106)`.

---

## 7. ⚠️ L'ordine: ho seguito il piano, e scrivo qui il contro-argomento

Posizione: **dopo i ritardi operativi, prima dei pagamenti**, come chiede il piano (riga non barrata —
e nel piano una proposta caduta si barra, come è stato fatto alla riga 416 per il perimetro).
L'argomento **a favore**, scritto nel commento sopra `LIVELLO1_PER_RUOLO`: un ritardo ha dall'altra parte
un dentista che sta già aspettando e scade **oggi**; il promemoria è un obbligo «senza ingiustificato
ritardo», che si misura in giorni. Fra due cose che chiedono di essere fatte parla prima quella che scade
prima. E sta **sopra** i pagamenti perché un arretrato non peggiora se lo guardi domani, un obbligo di
informazione sì.

🔴 **Il contro-argomento, che riferisco invece di agire (R-E2):**
i **quattro ritardi operativi** hanno **una seconda voce sulla stessa schermata** — s2→pila rossa,
s2b→ambra, s3→viola, s4→blu, ognuna col suo numero subito sotto la striscia. **Il promemoria non ha
nessuna pila.** Quando non nomina la striscia gli resta solo il «e un'altra» dell'aggregato, che non dice
*quale*; e siccome un laboratorio ha un lavoro in ritardo quasi ogni giorno, **in pratica tacerebbe quasi
sempre** — cioè proprio il difetto che questo compito esiste per chiudere.
📌 **Il precedente di casa è più forte del mio ragionamento:** il trial ≤3gg è stato portato in **testa** il
26/07 con la motivazione «*a giorni dal blocco dell'app dev'essere lui a parlare, non un allarme operativo
qualsiasi*». Stessa forma: **raro, conseguente, senza altra voce.**
➡️ Spostarlo è una **decisione significativa** (Regola Advisor: panel 2-3), non una scelta d'esecutore. Se
il panel l'accoglie, è **una riga** in ognuno dei quattro array. Il commento nel codice porta già
entrambe le facce, così chi legge fra sei mesi può pesarle invece di scoprirle.

---

## 8. 🛑 Ciò che NON ho fatto, e va deciso da qualcun altro

**La FASE 9 (prova a schermo) su questo segnale non è stata fatta.** Il gate estetico L2 (FASE 9b) **non è
dovuto** — per ⚖️ D245 è **contenuto**, non aspetto: nessun token, nessuna classe, nessuno stile, nessuna
struttura di markup toccati, e `SegnaleStriscia` non guadagna campi. Ma la stessa riga di `CLAUDE.md` dice
che **la FASE 9 resta obbligatoria anche per il contenuto**, perché una riga nuova in cima può andare a
capo o essere troncata.
**Perché non l'ho fatta:** per vedere il segnale serve una riga `avvisi_dentista` **aperta**, e quella
tabella ha l'`INSERT` **revocato** a `service_role` (migration `20260809123206`) — non si crea senza
passare dalla RPC di riemissione col suo corredo di lavoro, evento e dichiarazione. È lo stesso motivo per
cui il Task 6 ha rimandato «il giro completo dell'utente sul banco vero» al **Task 10**.
📌 **Il rischio è però limitato e dichiarabile:** il testo `aspetta l'avviso al dentista` è più **corto** di
copy già in produzione sulla stessa riga (`non è ancora pronto per le 16:00`), e `StrisciaStato` tronca
`testo` con ellissi CSS a 390px per costruzione. ➡️ **Proposta: la prova a schermo si accorpa al Task 10**,
dove la fixture esiste già. Se preferisci farla prima, va preparata a mano una riemissione.

---

## 9. Ciò che ho trovato FUORI dal mio mandato (R-E2 — riferito, non corretto)

1. 🔴 **`LIVELLO1_PER_RUOLO[ruolo] ?? LIVELLO1_PER_RUOLO.tecnico` è fail-OPEN per tutti gli altri
   candidati.** Il mio è protetto da `puoVedereAvviso`; `s2 · s2bDedup · s3 · s4 · s6` no. Oggi è
   irraggiungibile (§1), ma è **un ripiego che sceglie di mostrare *qualcosa* a un ruolo sconosciuto**
   invece di tacere — il verso sbagliato per un default in un modulo di permessi. Un ruolo nuovo in banca
   dati nascerebbe **dentro** invece che fuori. Una prova lo pinna oggi come **fatto**, non come intenzione.
   *Non toccato: cambia il comportamento di cinque candidati che non sono miei.*
2. 🟡 **`/admin/labs/[id]/live/page.tsx:58` cabla `'titolare'`,** e da lì il personale UÀ vede già oggi
   `s1` (fattura scartata) e `s7` (pagamento scaduto) di un laboratorio altrui. Per quei due può essere
   voluto (è uno strumento di assistenza); **la riga però non lo dichiara da nessuna parte**, e ogni
   candidato futuro eredita quella scelta **in silenzio**, come sarebbe successo al mio. Vale una riga di
   roadmap: *«che cosa vede il personale UÀ nell'anteprima, e chi lo decide».*
3. 🟡 **L'indice `idx_avvisi_da_comunicare` enumera lo stato a mano** nel predicato parziale
   (`WHERE stato = 'da_comunicare'`), mentre il codice deriva `STATI_APERTI` dal vocabolario. Il giorno in
   cui nascesse un quarto stato aperto, il codice lo includerebbe e l'indice **no**: la lettura resterebbe
   **corretta** e diventerebbe una scansione. Non urgente, dichiarato nel commento della funzione.
4. ⚪ **Il piano diceva `numero`, la colonna è `numero_lavoro`** (§2). Corretto nel mio codice; segnalo che
   se altri task del piano hanno copiato quello snippet, portano lo stesso errore.
5. ⚪ **`admin_rete` (riga 47 della coda della roadmap): confermo di NON averlo toccato**, come da mandato.
   Aggiungo un dato utile per quando lo si affronterà: `usaFiscali`/`usaPagamenti` (`striscia.ts:270-275`)
   sono **una terza e una quarta lista di ruoli scritte a mano** nello stesso file. Chi affronterà quella
   riga trova qui la stessa domanda che D342 ha già risposto per gli avvisi.
6. ⚪ **BP-1 non eseguito di proposito.** `MEMORY.md` e `ROADMAP-UFFICIALE.md` li allinea l'orchestratore
   dopo l'approvazione — è il ritmo che il ramo mostra (`fa561de9 docs(bp-1): il Task 6 è chiuso e
   approvato…`). Un esecutore che li toccasse dichiarerebbe chiuso un task che non è ancora stato rivisto.

---

## 10. Autorevisione — dove questo lavoro è più debole

- **La sentinella è una prova sul TESTO di un file, e le prove sul testo invecchiano male.** Se un giorno
  la lettura cambiasse nome, `not.toMatch(/from '@\/lib\/avvisi\/queries'/)` continuerebbe a proteggere
  (è il modulo, non la funzione), ma `not.toMatch(/avvisoPerLaStriscia\s*\(/)` diventerebbe muto. Ho
  scelto due asserzioni apposta perché la prima regge da sola; resta che **la difesa vera è strutturale e
  la sentinella è solo il suo allarme.**
- **Le quattro prove d'assenza sono deboli in isolamento** (§3) e lo dichiaro invece di contarle come
  copertura. Reggono solo insieme a M1/M2.
- **L'embed PostgREST è provato solo dal gruppo che in CI si salta.** L'ho mitigato mettendo il `JOIN`
  equivalente nel gruppo `pg`, che in CI gira: quello prova che `lavori.numero_lavoro` e la chiave
  esistano. **Ciò che resta scoperto in CI è la sintassi dell'embed**, non i nomi. È il meglio ottenibile
  senza `SUPABASE_SERVICE_ROLE_KEY` fra i segreti del passo «Unit tests».
- **Non ho misurato il costo della query aggiunta sulla home**, che è la pagina più caricata dell'app. Sta
  nel `Promise.all` (zero latenza aggiunta in serie) e usa un indice parziale guidato da `laboratorio_id`,
  ma è un ragionamento, non una misura.

---

## 11. 🔴 Una correzione a me stesso, trovata in revisione finale

**Avevo scritto nel commento sopra `LIVELLO1_PER_RUOLO` una frase che l'array subito sotto smentiva:**

> ~~«② Sta **sopra** i pagamenti **e la fattura scartata**…»~~

**Falso.** `s1` (fattura scartata) — e `s5` (materiale) — precedono `sAvvisoDentista` in **tutte e quattro**
le liste. Il promemoria sta sopra `s7` **e basta**. Il piano diceva «prima dei pagamenti», non «prima di
tutto il fiscale», e l'array era giusto: era la **prosa** a promettere più di quello che il codice fa.

🔑 **È esattamente la patologia che `CLAUDE.md` §9 nomina due volte** — «*la frase che c'era qui diceva una
cosa che il codice smentiva*» e «*vince ciò che si legge per primo e in grassetto, non ciò che è vero*». Un
commento che descrive un ordine diverso da quello reale non è un refuso: **è un invito a “sistemare”
l'array per farlo combaciare**, cioè a introdurre il difetto che il commento descrive.

**Corretto**, e — perché non sia solo prosa migliore — **pinnato con una prova che prima non c'era**:
`🛑 ma sta SOTTO la fattura scartata…`, su `titolare` **e** `front_desk` (dove `s1` sta a metà lista, non
in testa). La mutazione **M9** conferma che ora quel riordino diventa rosso: prima sarebbe passato verde,
perché nessuna asserzione confrontava il promemoria con `s1`.

⚠️ **La §7 di questo resoconto era invece già giusta** («sopra i pagamenti», senza aggiunte): la frase
sbagliata viveva **solo nel codice**. È il verso peggiore dei due — il resoconto lo legge una persona una
volta, il commento lo legge chiunque tocchi quel file da qui in avanti.
