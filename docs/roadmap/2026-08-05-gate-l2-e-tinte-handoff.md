# Handoff — Il gate che mancava da due giorni è stato fatto, e poi si è tornati a costruire

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 5 agosto 2026, sera (`provato:` `date` → `2026-08-05 17:52 CEST`).
**Stato:** ramo **`tinte-manufatto`** nel repo principale, **4 salvataggi**, **NON pubblicato**.
`main` allineato a `origin/main` (0 in attesa) e **intatto**. Albero di lavoro pulito.
⚠️ **Due migration sono APPLICATE AL DATABASE VERO mentre il ramo non è unito** — v. §0④.

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0**, registrata alle 17:55):
tsc **0** · eslint **0** · `next build` ok · **sei guardie verdi**.
`provato:` `npx vitest run` → **4991 passate | 19 saltate** (**419 file | 3 saltati**, 422 in tutto) —
il numero è misurato a parte perché la coda di `verify:full` non lo aveva catturato.
📈 Riferimento di ieri sera: 4983 passate | 19 saltate su 418 file → **+8 prove, +1 file** (il Task 3).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🟡 Le due superfici del WIZARD non hanno avuto il gate estetico L2
Il gate arretrato è stato percorso, ma **su una superficie sola**: la scheda «Foto» del form del lavoro.
Le altre due che il censimento aveva trovato — il foglio «Allega la prescrizione» e la schermata
«Fatto!» — **non sono state guardate**.
🔑 **Il motivo è tecnico e va detto, perché decide quanto costa farlo:** `provato:` `FrameFatto` si
raggiunge **solo dopo aver creato un lavoro** (`WizardNuovoLavoro.tsx:647`) e
`AllegaPrescrizioneSheet` è montato **dentro** `FrameFatto` (`FrameFatto.tsx:483`). Percorrerle su tre
formati e due temi vuol dire **creare sei lavori veri** e poi cancellarli.
📌 **Ciò che il gate di oggi dice comunque su di loro:** le loro frasi escono dallo **stesso** `Avviso`
messo alla prova col caso peggiore (229 caratteri, quattro impilati); le frasi nuove del wizard sono di
**63 e 108** caratteri. Il rischio residuo è **la posa dell'avviso sulla loro schermata**, non la sua tenuta.
➡️ Il modo è già scritto e provato: `scripts/tmp/gate-l2-0805/gate-s1.ts`, cambiando percorso e innesco.

### ② 🟡 L'ordine della pila blu a 1280 NON è provato
La FASE 9 su D244 è stata fatta a **390 e 768** (l'ordine legge `0020 · 0019 · 0018 · 0017 · 0011 …`).
`provato:` a **1280** il clic sull'etichetta «Appena arrivati» va in **timeout**: la casa desktop è
un'altra composizione (`HomeDesktop`) e quel numero **non è premibile**. Non è un difetto — è un layout
diverso — ma **l'ordine a 1280 resta non verificato**, e va provato dalla via giusta di quella pagina.

### ③ 🛑 Sei task su nove dell'ondata «tinte» NON sono fatti
Fatti: **T1** catalogo · **T2** colonne e vincoli · **T3** dominio.
Restano: **T4** `risolviTinta` (`provato:` `grep -rl risolviTinta src/` → **0**) · **T5** la PATCH ·
**T6** il rifacimento che si porta dietro la tinta · **T7** la riga sulla scheda · **T8** il campo sulla
pagina di modifica con la tavolozza · **T9** chiusura, collaudo e gate estetico.
`provato:` `tinta_famiglia` e `tinta_codice` compaiono in `src/` **solo** in `database.types.ts`
(generato): **nessuno scrive e nessuno legge ancora la tinta**.

### ④ ⚠️ Le migration sono nel DATABASE VERO, il codice è su un ramo NON UNITO
`provato:` `SELECT version FROM supabase_migrations.schema_migrations` → **`20260805174000`** e
**`20260805174500`** entrambe applicate; `tinte_manufatto` ha **34 righe**; `lavori` ha le due colonne
coi tre vincoli.
🔑 **Perché non è un problema oggi e perché va comunque saputo:** il cambiamento è **additivo e inerte**
(`provato:` **0 lavori con tinta**), quindi `main` in produzione non se ne accorge. Ma se il ramo non
venisse mai unito, il database resterebbe con due oggetti che **nessun codice pubblicato conosce**.
📌 È il modo normale di lavorare qui (le migration si applicano a mano, il CI non le applica), non una
deviazione: sta in §0 perché la sessione nuova lo sappia **prima** di decidere del ramo.

### ⑤ 🟡 Tre «da decidere» del piano sono ancora aperti — controllati uno per uno, non ricordati
`provato:` rileggendo la sezione «Domande aperte» del piano:
1. ✅ **chiusa** da D121 (il passo del wizard va alla sua ondata);
2. 🟡 **la riga sulla scheda: muta, o porta alla modifica?** Il T7 la fa **muta** come dice la spec;
   `RigaLavoroDenti` usa già il secondo modo. «Se in collaudo risulta frustrante, è un emendamento di
   una riga» — **il collaudo non c'è ancora stato**, quindi la decisione è viva e **non è mai arrivata
   a Francesco**;
3. 🟡 **`useLavoroForm.ts` non è ancora stato letto** — è l'innesco del primo passo del T8.

### ⑥ ⏳ Restano scoperte le cose che venivano da ieri
Invariate, e nessuna toccata oggi: la **foto dalla LIBRERIA** dell'iPhone (riga 16, HEIC) ·
**`CRON_SECRET`** da confermare su Vercel → Cron Jobs (piano Hobby: ±1 ora, parte fra le 4:20 e le 5:19) ·
nessuna misura su **rete mobile vera** · e **perché il telefono mostrasse 12 invece di 13** resta
**non verificato**.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ⚖️ **Quando è dovuto il gate estetico L2** (D245) | ✅ **DECISO E SCRITTO.** Dovuto quando cambia l'**aspetto**, non quando cambia il solo **contenuto** — e lì resta obbligatoria la FASE 9. Il confine si legge **sul codice toccato**, non sull'effetto percepito. In dubbio si fa il gate. Propagata in **tre** posti: verbale, `CLAUDE.md` §0C (FASE 9b + REGOLA ZERO), `docs/design/audit-ui-ux/README.md` |
| 🔎 **Il perimetro del gate non era quello dichiarato** | Gli handoff dicevano «due superfici»: il censimento (`git diff f584393a..HEAD`) ne ha trovate **nove**. Poi il contrario: `provato:` i **66** scatti del giro delle 08:40 sono **tutti** successivi alle correzioni delle 08:35 (`find -newermt` → 66 su 66), quindi `ModificaColoreSheet` e `Avviso` erano **già coperti**. Superficie mai fotografata: **una** |
| 🖼️ **Il gate arretrato** | ✅ **FATTO** — 4 stati × 3 formati × 2 temi + 12 scatti della FASE 9 = **42 scatti**. Referto: `docs/design/audit-ui-ux/LIVELLO-2-2026-08-05-caricamento-e-frasi-errore-ESITI.md` |
| ✅ **Ciò che ha retto, e come lo si è provato** | Il **tetto d'altezza della pila di avvisi funziona** — e la scena a quattro nomi corti **non lo provava** (720px in 796: ci stava comunque). Col **caso peggiore** (quattro messaggi da 229 caratteri) la pila chiede **976** e ne ha **796** → **scorre**, non sfonda la piega, e il «Chiudi» dell'ultima carta passa da **fuori schermo (949)** a **dentro (769)** |
| 🔴 **Sei riscontri** | Il primo è **di sistema**: l'avviso d'errore **copre i due tasti di caricamento e li rende non premibili** a 390 e 768 (`elementFromPoint` risponde il «Chiudi» dell'avviso, **98%** di area). Più cinque minori, fra cui un nome file a **1,47:1** misurato **sui pixel** e un «1 foto allegate» prodotto da un interruttore con **lo stesso valore da tutt'e due i lati** |
| 🛑 **E Francesco ha fermato il seguito** (D246) | «*lascia perdere la storia dell'avviso, quella pagina dovrà essere rifatta e migrata al v3*». Le righe **19-20-21** restano ma **cambiano natura**: da «da correggere» a **requisiti della migrazione**. Sopravvivono solo il difetto **di sistema** dell'`Avviso` e la targa tagliata a metà nella frase di casa |
| 🎨 **Ripartita l'ondata «tinte del manufatto»** (riga 6) | ✅ **3 task su 9**, ognuno con le sue prove e il suo salvataggio. Ramo `tinte-manufatto` |
| 🔴 **Il piano aveva CINQUE difetti, e uno grave** | Il peggiore: il blocco SQL del T1 **non aveva né `REVOKE` né `GRANT`**, e in questo progetto **ogni tabella nuova nasce con tutti i permessi per `anon`** — il catalogo sarebbe stato **scrivibile e troncabile da chiunque abbia la chiave pubblica**, che viaggia nel browser |

## 2. 🔑 Le lezioni

1. 🔴 **«Senza RLS» non vuol dire «pubblica in lettura»: vuol dire «protetta dai soli permessi».** Il
   piano ha confuso le due cose e la confusione produceva una tabella **aperta in scrittura**. Su questo
   progetto i privilegi predefiniti danno **tutto** (`arwdDxtm`) ad `anon`, `authenticated` e
   `service_role` su ogni tabella nuova di `public`: `provato:` creando una tabella usa-e-getta su
   transazione annullata e leggendone i grant. ➡️ **Chi crea un catalogo pubblico ricalca le due righe
   del gemello** (`20260727120000_lavori_denti.sql:64-65`), non le reinventa e non le omette.
2. 🔑 **Una prova che non tocca niente non è una prova che passa: è una prova che non è avvenuta.**
   Tre volte oggi, in tre linguaggi diversi: un `UPDATE` su **zero righe** (`bite_splint` non esiste in
   banca dati — quattro sonde su sette del piano, **compreso il controllo positivo**); un `for` su un
   **elenco vuoto** (l'abbozzo inerte di R-P4); e — nel gate — quattro errori impilati che **stavano
   dentro lo schermo comunque**. ➡️ **Si legge il conteggio**, non il colore del risultato.
3. 🔑 **Un controllo positivo va messo su OGNI lato che la regola tocca, non su uno.** Il piano provava
   la coppia da un lato solo e il positivo su una sola famiglia: un vincolo **sbilanciato** sarebbe
   passato. Vale come regola: se una regola ha due versi, i versi da provare sono due.
4. **Un interruttore che c'è e non fa niente è peggio di uno che manca.**
   `immagini.length === 1 ? 'foto' : 'foto'` — chi legge il codice vede il caso gestito e non guarda
   oltre. È la stessa forma di «un elenco che sembra completo e non lo è».
5. **Il contrasto di un testo sotto un velo NON è quello dichiarato.** `--t2` su `--sfc` dice 4,38:1;
   sotto un velo rosso al 72% quello che si vede è **1,47:1**, `provato:` **sui pixel dello scatto**.
   ➡️ Dove c'è una sovrapposizione, il colore si **misura**, non si legge dal token.
6. **Una decisione che CANCELLA lavoro si scrive per prima, o il lavoro viene rifatto.** D246 esiste
   solo per questo: senza, la sessione nuova avrebbe letto le righe 19-21 e si sarebbe messa a
   correggere una schermata destinata a essere rifatta.
7. **Il perimetro non lo decide chi scrive il piano, ma nemmeno chi legge l'handoff.** Oggi il
   censimento ha **allargato** (due superfici → nove file) e poi **ristretto** (l'orario degli scatti ne
   ha scagionate due). Entrambe le mosse erano misure, non opinioni.

## 3. Che cosa resta aperto (in ordine)

1. 🔨 **Il Task 4 dell'ondata tinte** (`risolviTinta`, la normalizzazione server-side), poi T5-T9. È il
   lavoro vivo, ed è quello che Francesco ha chiesto: «*dobbiamo andare avanti con lo sviluppo della pwa*».
2. 🟡 **La decisione ⑤.2**: la riga della tinta sulla scheda, **muta** o che porta alla modifica. Va
   portata a Francesco **al collaudo del T7**, non dopo.
3. 🟡 **Il gate L2 sulle due superfici del wizard** (§0①) e **l'ordine a 1280** (§0②).
4. 🔴 **Il resto di P37**: la Dichiarazione stampa come prescrittore una **ragione sociale** dove la
   norma vuole una **persona con qualifiche professionali**, e la casella dell'**istituzione sanitaria**
   non esiste nel documento.
5. 🟡 **Righe 13, 14, 17**: il buco del tema scuro alla quarta e quinta replica · le due reti meccaniche
   mancanti · **`middleware.ts` deprecato da Next 16**.
6. 🟡 **Riga 19** — l'avviso che copre le azioni in alto: **di sistema**, sopravvive al rifacimento della
   scheda «Foto», **senza urgenza**.
7. 🟡 **Riga 16** (la foto dalla libreria) · **`CRON_SECRET`** · **rete mobile vera**.

## 4. Da dove ripartire

1. **`docs/superpowers/plans/2026-08-03-tinte-manufatto.md`** — e **prima della sua prosa** si leggono i
   **«RITROVAMENTI ESEGUENDO»** in fondo: cinque difetti del piano, uno grave.
2. **Task 4** — `risolviTinta`. Il piano lo descrive per intero; ⚠️ **il nome della sua migration, se ne
   ha una, va preso dall'orologio** (D155): quelli del piano sono anteriori all'ultima applicata.
3. **`docs/roadmap/ROADMAP-UFFICIALE.md`** riga **6** per il quadro, righe **19-21** per capire perché
   NON vanno toccate.

## 5. Il minimo per non sbagliare

- 🛑 **Ogni tabella nuova in `public` nasce con TUTTI i permessi per `anon`.** Un catalogo pubblico si
  chiude con `REVOKE ALL … FROM anon, authenticated, service_role` + `GRANT SELECT TO authenticated,
  service_role`. Modello: `supabase/migrations/20260727120000_lavori_denti.sql:64-65`.
- 🛑 **I nomi di migration si prendono dall'orologio** (D155), mai dal piano: `provato:` l'ultima
  applicata era `20260805113700`, e i nomi del piano (`20260803…`) le sarebbero finiti **davanti**.
- **Per provare più vincoli in una transazione servono i PUNTI DI RIPRISTINO** (`SAVEPOINT` +
  `ROLLBACK TO`): al primo errore la transazione si annulla e tutto il resto viene **ignorato in
  silenzio** — `provato:` otto istruzioni su undici saltate al primo tentativo.
- **`UPDATE … LIMIT 1` non esiste in Postgres**: si usa `WHERE id = (SELECT id … LIMIT 1)`.
- **Il ponte SQL:** `node scripts/tmp/tinte/psql.mjs <file.sql>` — una connessione sola, stampa l'esito
  di **ogni** istruzione, errori compresi, senza fermarsi. ⚠️ `scripts/tmp/sql.mjs` non serve per più
  istruzioni: legge `res.rows`, che su un elenco di risultati è `undefined`.
- ⚠️ **`scripts/tmp/` è IGNORATO da git**: gli attrezzi di oggi (il ponte SQL, il banco del gate)
  **non esistono per la sessione nuova**. Le misure che contano sono incollate nei documenti.
- **Banco:** `npm run build && PORT=3020 npm run start`, accesso con
  `BASE=http://localhost:3020 npx tsx scripts/tmp/link-accesso-locale.ts h4t@live.it <percorso>` (D103).
  ⚠️ **Controllare che sulla 3020 non ci sia già un banco vecchio**: oggi ce n'era uno acceso dalle 13:22
  che serviva **codice di prima** delle modifiche del pomeriggio — una prova falsa che sembra vera.
- 🛑 **«Voce» e «riga» non sono sinonimi**, e la guardia **ferma il commit**: la roadmap ha **righe**;
  «voce N» in `MEMORY.md` è un'altra cosa. Pagato oggi.
- ⚠️ **Il verbale delle decisioni è FUORI dalla catena della guardia**: il suo conteggio va verificato a
  mano (oggi: **246 dichiarate, 246 reali, nessun buco**).
- **Il prossimo numero di decisione è D247**; il conteggio vive in testa al verbale (246 in 95 tornate).
