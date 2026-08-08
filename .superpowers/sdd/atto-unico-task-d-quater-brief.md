# BRIEF — Task D-quater: il gettone si muove solo se cambia qualcosa (D323)

**Ramo:** `intervento-post-consegna` (🛑 **MAI un worktree**) · **Base:** il salvataggio che porta questo brief
**Nasce da:** il **CRITICO C1** della revisione del Task D-ter, confermato sul catalogo vivo, e dal
**panel a tre** che ne è seguito (regola advisor). **Ratificata da Francesco: ⚖️ D323**, centoquarantunesima
tornata di `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **leggila prima**, porta le
controindicazioni per intero.

---

## 0. IL MANDATO — tre pezzi, e il primo è una migration

**① Il gettone di `lavori` si muove solo se cambia davvero qualcosa che non sia il contatore ·
② il controllo del gettone si sposta PRIMA del render del PDF · ③ il foglio raccoglie l'`updated_at`
che il server già gli restituisce.**

---

## 1. IL DIFETTO, provato — non devi riprovarlo, devi chiuderlo

L'atto unico fa **due chiamate HTTP**: ① `POST …/eventi-qualita` · ② `POST …/dichiarazione/riemetti`
con `{ evento_id, correzioni, atteso_updated_at }`.

- `provato:` `eventi-qualita/route.ts:688-718` — la ① esegue **sempre** `incrementaCorrezioni`, che fa
  `UPDATE lavori SET post_consegna_correzioni = …` (salta **solo** su `mai_uscito_dal_lab`);
- `provato:` sul **catalogo vivo** — `trg_lavori_updated_at`, **BEFORE UPDATE FOR EACH ROW**, esegue
  `trigger_set_updated_at()` il cui corpo è `NEW.updated_at = now();`, **senza `WHEN` e senza
  condizioni**;
- due richieste HTTP = **due transazioni** = **due `now()` diversi**;
- `provato:` la ② **non rilegge** il gettone (`riemetti/route.ts:255` → `:361`).

➡️ **Conflitto falso**, e ogni tentativo **brucia un progressivo e lascia un PDF orfano** (il documento si
rende **prima** della transazione, `generate-ddc.ts:457-460`).

🛑 **E la cosa più grave non è il blocco: è la via d'uscita che la persona scopre da sola.** La pastiglia
`stato_dispositivo` è raggiungibile sul percorso di correzione (la fase `dettagli` è condivisa) e
rispondere **«mai uscito dal laboratorio»** fa saltare l'incremento e **fa funzionare tutto**: è **la
bugia che il Task A ha tolto stamattina**, su un campo che alimenta `classifica()`.
⚠️ **Conseguenza per le tue prove:** una prova che voglia riprodurre il difetto **deve fissare
`stato_dispositivo`**, o sarà una prova che fallisce a caso.

---

## 2. ① LA MIGRATION — la forma è quella provata dal panel, con la PINZATURA

🕛 Nome con l'orologio **UNIVERSALE**, in un comando **separato**: `date -u "+%Y%m%d%H%M%S"`.
**Pavimento: `20260808154033`.**

🛑 **`trigger_set_updated_at` è CONDIVISA da tutte le tabelle (`apply_updated_at_trigger`,
`schema.sql:58-83`) e NON si tocca.** `lavori` riceve **la sua**, con un nome proprio.

```sql
CREATE OR REPLACE FUNCTION public.lavori_set_updated_at() RETURNS trigger … AS $f$
BEGIN
  IF to_jsonb(OLD) - 'post_consegna_correzioni' - 'updated_at'
     IS NOT DISTINCT FROM
     to_jsonb(NEW) - 'post_consegna_correzioni' - 'updated_at'
  THEN NEW.updated_at = OLD.updated_at;   -- 🛑 si PINZA al valore vero
  ELSE NEW.updated_at = now();
  END IF;  RETURN NEW; END; $f$;
```
*(`non eseguito` da te: il panel l'ha provata, tu la riprovi.)*

🔑 **PERCHÉ LA PINZATURA E NON LA SOLA CLAUSOLA `WHEN`, ed è misurato:** `PATCH /api/lavori/[id]:803`
mette **sempre** `updated_at` nel payload (`new Date().toISOString()`). Con la sola `WHEN` il trigger non
scatterebbe e **quel valore atterrerebbe**: l'orologio di Node scriverebbe il gettone. Con la pinzatura
**non atterra** — `provato:` dal panel, sonda 7: payload con `updated_at = '2000-01-01Z'` → in riga resta
il valore vero.

- [ ] 🛑 **`PATCH /api/lavori/[id]:803` va TOLTA nello stesso giro**, o resta una riga bugiarda.
- [ ] **Il `COMMENT` sulla funzione dice PERCHÉ è separata da quella condivisa**, o una pulizia futura
  «unifica i duplicati» e riapre tutto in silenzio.
- [ ] **Il criterio dell'esenzione si scrive accanto:** *solo colonne che non compaiono su nessun
  documento e su nessuna schermata che l'operatrice conferma.* Attenuante da dichiarare: il predicato è
  per **sottrazione**, quindi una colonna nuova entra **da sola** dalla parte protetta (fail-closed).
- [ ] ⚖️ **Applicare la migration NON si chiede** (D284): `npx supabase db push --linked --yes`.
- [ ] **FASE 6b** dopo (`gen types` → `tsc`).

### 🔴 LA PROVA CHE IL PANEL DICHIARA MANCANTE, ed è tua

D323 **cambia il significato di `lavori.updated_at` per tutti**. Il panel *crede* che nessuno si rompa
(«un gettone che non si muove **continua a combaciare**») ma lo dichiara **una convinzione, non una
prova**. ➡️ **Provala oggetto per oggetto**, e scrivi l'elenco:
`correggi_e_riemetti_atomica` · `lavoro_denti_sostituisci_atomica` · `lavoro_prescrizione_correggi_typo`
(le tre del catalogo che usano il gettone) · `PATCH /api/lavori/[id]` · `PUT …/denti` ·
`…/prescrizione/typo` · `ModificaColoreSheet` · `ModificaRigaSheet`.

---

## 3. ② IL CONTROLLO PRIMA DEL RENDER — costa zero query

`provato:` `riemetti/route.ts:82-99` carica **l'intera riga** del lavoro (`updated_at` compreso)
**prima** che `correggiERifai` parta a `:169`. Confrontare lì il gettone arrivato dal corpo **non costa
nessuna query in più**.

- [ ] Confronto **prima del render**, con **409** e il messaggio onesto.
- [ ] 🛑 **Il controllo dentro la RPC RESTA**: è l'unico che copre la finestra fra la lettura e la
  transazione. Quello anticipato è **un filtro, non un sostituto** — scrivilo nel commento, o fra sei
  mesi qualcuno lo cancella credendolo un doppione.
- [ ] 🛑 **E non scrivere che «adesso non ci sono più file orfani»: sarebbe falso.** Resta una finestra
  fra la lettura e la transazione. Il commento lo deve dire.

---

## 4. ③ IL FOGLIO RACCOGLIE IL GETTONE CHE IL SERVER GIÀ MANDA

`provato:` (orchestratore) la rotta restituisce `updated_at` **sul successo** (`riemetti/route.ts:375`,
col commento che dice perché: «*senza, una seconda correzione di fila troverebbe sempre un conflitto*»)
**e sul 409** (`:393`). Il foglio legge solo `numero` e `numero_superato`, e sul 409 solo il messaggio:
**entrambi finiscono per terra.**

- [ ] Il foglio li **raccoglie e li usa**. **Il precedente in casa** è `ModificaColoreSheet.tsx:180`
  e `:228`: cercalo per **comportamento** e riusalo.
- [ ] 🛑 **Il gettone non si riconverte MAI** (`new Date(...)`, `toISOString()`): `timestamptz` è al
  microsecondo, `Date` di JS al millisecondo → **409 permanente**. Le prove devono portare un valore
  **con i microsecondi**, o non provano niente.

---

## 5. E UNA COSA CHE NON È D323 MA STA NELLO STESSO FILE E VA CHIUSA

🔴 **Il tasto «Ricarica e riprendi» MENTE:** `ricomincia()` fa `setCorrezioni({})`
(`DevoIntervenire.tsx:494-506`) — **cancella le correzioni appena digitate a mano**. Non riprende:
azzera. Trovato da **due advisor su tre**, indipendentemente.
- [ ] O il tasto **tiene** le correzioni (e allora «riprendi» è vero), o **dice quello che fa**. 🔑 La
  prima è meglio: il costo vero di ogni conflitto, oggi, è **un giro intero da ridigitare**.

---

## 6. 🟠 RIFERITI DAL PANEL — riferisci, NON correggere

- **Gli indici unici su `dichiarazioni_conformita` sono QUATTRO, non tre**, e
  `src/lib/dichiarazione/atto-unico-errori.ts:89-96` ne mappa **tre**: manca **`ddc_lavoro_attiva_unique`**.
  Se si accende → `throw` → **500 illeggibile**. *L'elenco che sembra completo e non lo è, ancora.*
- **I sei 409 si distinguono solo a parole**, senza codice leggibile a macchina: il riquadro non può
  scegliere il gesto giusto. Un advisor li raggruppa in **tre gesti** (ricarica e rifai · guarda prima di
  rifare · **ripremi e basta**) e nota che oggi il terzo riceve il consiglio sbagliato.
- **Il lucchetto resta grossolano:** anche a difetto chiuso, cambiare cassetta/tracking/stato farà
  scattare il blocco. La forma definitiva (**il gettone sono le sei voci stampate**) è **la destinazione
  dichiarata**, non oggi.
- **`to_jsonb(OLD)`/`to_jsonb(NEW)` serializzano la riga intera due volte a ogni `UPDATE` di `lavori`**,
  e `lavori` è larga. Su 299 righe è nulla; **non è stato misurato**.

---

## 7. LE REGOLE

- 🛑 **UNA PROVA NUOVA NON È FINITA FINCHÉ NON L'HAI VISTA DIVENTARE ROSSA** rompendo apposta il codice.
  **R-P4:** dopo il primo rosso, abbozzo inerte e **CONTA** (`N su M`).
- **Le sonde:** una invocazione per sonda, **in transazione annullata**, fixture **dentro**. ⚠️ **`now()`
  è COSTANTE dentro una transazione** — una sonda che simuli le due chiamate dentro un solo `BEGIN`
  **non può mostrare la differenza** (l'orchestratore ci è già cascato oggi). E `scripts/psql.mjs` **si
  collega come `postgres`, cioè come PROPRIETARIO**: una sonda sui permessi senza `SET LOCAL ROLE` non
  prova niente. `set -a && . ./.env.local; set +a`.
- **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`**, e la verità è **il catalogo vivo**.
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — 🛑 **`timeout: 600000`**,
  uscita **da variabile**. Base: **5659 | 68 su 454**.
- ⚖️ **D318 — `git add <percorsi>`, MAI `git add -A`.** Messaggi lunghi con `-F <file>`.
- **R-E2:** un difetto fuori mandato si **riferisce**.
- 🛑 **Niente FASE 9 e niente gate L2** (Task D-bis, dopo di te).

---

## 8. IL RESOCONTO — `.superpowers/sdd/atto-unico-task-d-quater-report.md`

1. La migration, e **il corpo riletto dal catalogo vivo** (non dal file).
2. **Le sonde**, con SQL e output — comprese quelle che devono **fallire**.
3. 🔴 **La prova oggetto per oggetto** che le tre funzioni del catalogo e le tre rotte non si rompono
   (§2, ultimo blocco): è **la prova che il panel dichiara mancante**.
4. **R-P4** e le mutazioni viste diventare rosse.
5. **La FASE 7** con l'uscita letta da variabile.
6. 🔴 **DOVE QUESTO BRIEF SBAGLIA.** Cercalo davvero.
7. **I ritrovamenti fuori mandato.**
8. **Che cosa NON hai fatto.**
