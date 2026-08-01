# Handoff — la §0 dell'handoff precedente è chiusa, e gli accenti sono in produzione

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`ad2b0324`**, allineato con `origin` (zero da pubblicare), **albero pulito**.
CI verde, deploy Vercel `success`, https://uachelab.com risponde.
**Riferimento misurato ora, su `main`:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19** prove ·
`next build` **ok**.
**Non c'è niente a metà.**

⚠️ **Sulla data.** L'orologio della macchina è passato al **1° agosto** durante la sessione; i documenti del
progetto seguono il **3 agosto**. Il fatto misurato resta quello di ieri: **la dichiarazione emessa in
produzione porta stampata la data della macchina**, non quella dei nomi dei file.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

**Nessuno ha guardato una Dichiarazione di Conformità uscita dalla PRODUZIONE dopo il rilascio degli
accenti.**

`provato:` il documento è stato guardato **con gli occhi**, una pagina intera, con **tutte** le sezioni
popolate — comprese `§6-bis` (norme armonizzate) e `§8` (rischi residui), che la fixture dei test lascia
sempre vuote. Ma quel PDF è stato **reso in locale** (`scripts/tmp/guarda-ddc-piena.tsx`, usa e getta) con il
codice che ora è online, **non emesso da uachelab.com**.

🔑 **Perché non è una formalità, ed è la stessa lezione della §0 di ieri:** fra il modello e il foglio che
arriva al dentista ci sono l'orchestratore della consegna, i dati veri del laboratorio, lo storage e il
runtime di Vercel. Ieri quella distanza ha nascosto per giorni due colonne mai scritte. **Oggi non c'è
motivo di sospettare un problema** — il deploy è verde e il codice è lo stesso — ma la catena completa,
dopo *questa* modifica, non è stata percorsa.

➡️ **Come si chiude, ed è un giro reversibile di dieci minuti:** la ricetta è già scritta in
`docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md` §6 — accesso col link monouso
(`npx tsx scripts/giro-guardia-overlay.ts` **no**: quello è un altro collaudo; qui serve
`npx tsx scripts/tmp/link-accesso.ts <email> <percorso>`), consegna di un lavoro **pronto e senza DdC
attiva**, si scarica il PDF, **si guarda**, e si annulla la consegna entro dieci minuti.
🛑 **Prima di consegnare, i due controlli che rendono la prova valida:** stato `pronto`/`in_ritardo`, e
**nessuna DdC con stato ≠ `annullata`** — altrimenti il guard di idempotenza (`generate-ddc.ts:85-95`)
restituisce la dichiarazione vecchia **senza generarne una nuova**, e si legge un rosso falso.

⚠️ **Costo dichiarato:** il giro brucia un numero progressivo di dichiarazione e uno di buono. Il contatore
**non torna indietro** (`genera_progressivo`, `supabase/schema.sql:93`), quindi non nascono duplicati.

---

## 1. Che cosa è successo

| | |
|---|---|
| **La §0 di ieri, primo braccio** | ✅ **Le due impronte della DdC sono provate in produzione.** Consegnato `TEST-DdC-001` su uachelab.com e poi **annullato**: `DDC-2026-0002` nasce con `payload_sha256` (64 esadecimali) e `template_version='ddc-v1'`; la `DDC-2026-0001` dello stesso lavoro, emessa prima della riparazione, le ha **entrambe `NULL`**. Il prima e il dopo nella stessa tabella. Referto: `docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md` |
| **La §0 di ieri, secondo braccio** | ✅ **Il primo braccio della guardia navigazione-overlay ha misurato** (quattro bracci su quattro verdi) — **ma la guardia si rompeva e va riparata prima**: la lettura non reggeva una traversal cross-document (sonda: **12 rotture su 12**, col rimedio **0 su 12**) e **un'eccezione di un braccio uccideva l'intera guardia**. Il ricambio che prepara e rimette la fixture è ora nel repo: `scripts/giro-guardia-overlay.ts` |
| **La voce degli accenti** | ✅ **IN PRODUZIONE** (merge `00517d2c`). Dieci punti corretti nei due documenti generati, nasce **`§2 — Data di emissione`**, il DEFAULT della frase in banca dati allineato con **migration applicata**, la versione del modello **resta `ddc-v1`** (D105) e per la prima volta ha un **registro**. Spec: `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md` · piano: `…/plans/2026-08-03-accenti-documenti.md` |
| **Come si è lavorato** | 7 task, un **esecutore fresco per ciascuno** (R-E1), revisione indipendente fra l'uno e l'altro, più una revisione finale dell'intero ramo. **Otto difetti trovati eseguendo, nessuno arrivato al documento** |
| **Decisioni di Francesco** | **D103** (accesso al banco con i dati di `.env.local`) · **D104** (si correggono tutti i punti, frase congelata compresa, **solo i segni**) · **D105** (la versione resta `ddc-v1`) · **D106** (il §2 entra nello stesso giro) · **D107** (niente guardia automatica anti-refuso) |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① Una prova che sembra solida va rotta apposta, non riletta.** Tre difetti su otto stavano **dentro le
prove**, e nessuno era visibile leggendo il codice: un test che leggeva il dato **di un altro test** (il
blocco non puliva i mock: funzionava per coincidenza); un'asserzione **morta** (`not.toContain('…CONFORMITA ')`
con uno spazio finale che l'estrattore non emette mai); e una rete sui metadati del file **cieca per
costruzione** — cercava il refuso in UTF-16BE, ma lo strato PDF passa a UTF-16BE **solo** quando la stringa ha
un carattere non-ASCII, quindi il refuso, tutto ASCII, non stava dove la prova lo cercava.
🔑 **Il gesto che le ha prese tutte e tre è lo stesso: guastare il codice e guardare se la prova reagisce.**
L'ultima è stata trovata **dieci minuti dopo averla scritta**, e sembrava perfetta.

**② Un difetto corretto come occorrenza torna. Si corregge la classe.** Il piano pretendeva la forma mista
su titoli che lo stile rende **MAIUSCOLI**: è successo **tre volte**, perché la prima volta ho corretto
*quell'asserzione* invece di cercare tutte le altre che citavano un titolo di sezione.
🛑 **La regola operativa:** quando un difetto del piano viene corretto, la domanda successiva non è «è
corretto?» ma **«dove altro vale la stessa cosa?»** — e si cerca, non si ricorda.

**③ Chi ha scritto il pezzo non è chi trova il difetto.** In tutti e otto i casi il difetto è emerso da un
**esecutore fresco che si è fermato** invece di adattare l'asserzione finché passava, o da un **revisore che
ha guastato il codice**. Tre degli otto erano **nel piano che avevo scritto io**, e nessuno di quei tre
sarebbe stato visto rileggendolo.

**④ Una rete mai eseguita non è una rete: è una promessa.** La guardia degli overlay era in casa da giorni,
dichiarata come protezione di una direttiva permanente, e il suo primo braccio non era **mai** stato fatto
girare: bastava una fixture. Alla prima esecuzione vera si è rotta **in due punti**, nessuno dei quali era un
difetto dell'applicazione. Il verde degli altri tre bracci non diceva niente su questo, e non poteva.

**⑤ Una procedura che esiste solo come istruzione da copiare a mano è una procedura che nessuno esegue.**
La ricetta della fixture viveva come due `UPDATE` in un commento, coi valori di ripristino **cablati** e
vecchi di una settimana. È anche il motivo per cui quel braccio non era mai stato provato. Ora è uno script
nel repo, e il ripristino **rilegge la riga vera** invece di riscrivere valori annotati.

**⑥ Le affermazioni portanti di un panel si riverificano.** Il parere normativo sconsigliava il salto di
versione sostenendo che **nessuna** dichiarazione portasse `ddc-v1`. **Falso, misurato:** su 4 righe in
archivio **una** ce l'ha — quella emessa durante la verifica di ieri. La sua raccomandazione restava
difendibile per altra via, ma non per quella.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **Guardare una DdC emessa dalla PRODUZIONE** dopo questo rilascio (v. §0) | §0 |
| 🟠 **2** | **Il luogo di fabbricazione non è mai stampato** — ed è il **trattino 1 dell'Allegato XIII, obbligatorio**. La colonna esiste (`supabase/schema.sql:1242`, default `'Italia'`) e non arriva sul foglio | spec §5 ② |
| 🟠 **3** | **Il foglio afferma «Sostanze / tessuti: No»** con un valore **codificato a mano** (`generate-ddc.ts:144`), mai raccolto né verificato. Il trattino 8 è condizionale: l'indicazione serve **solo se vero**. Una negazione affermata su materiali di origine animale è un falso negativo | spec §5 ③ |
| 🟠 **4** | **La nomina del PRRC non si conserva e si riscrive la data a ogni scaricamento** (`generate-nomina-prrc.ts:15-23`): due copie firmate dello stesso atto portano date diverse. E la tabella `prrc_nomine` con `has_prrc_valido()` **esiste in banca dati e nessuno la legge** | spec §5 ⑥ |
| 🟠 **5** | **Il dato «PRESCRITTO» non esiste in banca dati** — l'ondata a cui D101 rimanda, e il prerequisito delle due righe distinte sulla dichiarazione | roadmap, voce 9 |
| 🟡 **6** | **`payload_sha256` non è ricalcolabile**, misurato: `data_emissione` non sopravvive al giro di andata e ritorno (scritta `…983Z`, riletta `…983+00:00`) e `norma_riferimento` entra nell'impronta senza essere una colonna della riga. Verificatori esistenti: **zero** | spec §5 ⑦ |
| 🟡 **7** | **L'identificazione del paziente può ridursi a un trattino** su un foglio che dichiara «esclusivamente per il paziente indicato» (`generate-ddc.ts:137` finisce in `?? ''`) | spec §5 ④ |
| 🟡 **8** | **Contraddizione fra due panel, da sciogliere**: la base della conservazione decennale è «Art. 10(5) + Allegato XIII punto 4» (ratificata il 29/07) o **l'Allegato XIII punto 4 da solo**? Quella citazione vive in **tre documenti**. **Non ratificata né scartata** | spec §5 ⑧ |
| 🟡 **9** | **Il §6-bis e il §7 sono attaccati** quando ci sono norme armonizzate: manca lo stacco che hanno tutte le altre sezioni. Preesistente, e **invisibile alla suite** perché la fixture non popola mai `norme_json` — trovato guardando il foglio | `DdcTemplate.tsx:482-493` |
| 🟢 **10** | Minori dalla revisione finale: la rete `not.toContain` è cieca a un refuso tutto minuscolo · lo stesso difetto dei blocchi fratelli esiste in altri due punti di `generate-ddc.test.ts` (lì mascherato da `toHaveBeenCalledWith`) · «Non Conformita Recenti» in `src/app/(app)/qualita/page.tsx:83` · un test di D104 vive nel blocco «D102» · il refuso nei **commenti** di `NominaPrrcTemplate.tsx:232,339` | ledger `.superpowers/sdd/progress.md` |

⚠️ **Un commento che NON è stato corretto, di proposito:** la migration `20260803120000` cita
`generate-ddc.ts:147-148` mentre le righe vere sono `160-161`. **Il file è già applicato al database:** non lo
si riscrive per un commento, il rischio di disallineare il ledger delle migration supera il beneficio.

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`.** Dopo la §0, le voci pronte:

- **Registrare ciò che il dentista prescrive** (voce 9) — è dove D101 rimanda, ed è il prerequisito delle due
  righe distinte sulla dichiarazione («indicate nella prescrizione» / «come realizzato»). **GRANDE, con
  migration.**
- **Le tinte del manufatto** (D42) — ratificata «dopo l'ondata (b)», cioè adesso. 🛑 Catalogo separato con voci
  che hanno un NOME; niente esadecimale libero, niente scale nuove dentro `colori_dentali`.
- **Allegati e condivisione** (D67) — ondata propria, destinazione di **D75** e **R20**.
- **Avviso alla consegna su dente/colore mancanti** — 🛑 ha la **dipendenza dura** dell'id fine del tipo, che
  non è persistito: senza, l'avviso è rumore garantito.

🔑 **E le tre voci normative di §3 (2, 3, 4) meritano di essere pesate prima delle ondate di prodotto:**
riguardano che cosa un documento a valore legale **afferma** — e una di esse (il «Sostanze / tessuti: No»)
è un'affermazione che oggi nessuno ha mai verificato.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md`, sempre per primi.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centosette** decisioni in
  trentatré tornate. La prossima è **D108**.
- **REGOLA ADVISOR:** ogni decisione significativa passa da un **panel di 2-3 con mandato di confutare** —
  e **le sue affermazioni portanti si riverificano a mano** (oggi una era falsa, v. lezione ⑥).
- **R-E1 / R-E2:** un compito alla volta a un esecutore fresco, con l'istruzione esplicita di **cercare dove
  il piano sbaglia**; un difetto fuori dal proprio mandato si **riferisce**, non si corregge.
- **FASE 7 per intero, output incollato.** I tre comandi sono tre: `tsc` non vede la firma degli handler di
  rotta. **Riferimento misurato oggi su `main`:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19**
  prove · `next build` ok.
- **FASE 6b:** dopo ogni migration, `supabase gen types` + `tsc`. 🔑 La CLI Supabase **funziona da qui**
  (`npx supabase db push --yes`): il CI **non** applica le migrazioni, si fanno a mano.
- **D103 — l'accesso al banco:** si usano le credenziali di `.env.local` senza chiedere ogni volta. Il modo
  preferito è il **link monouso** (`npx tsx scripts/tmp/link-accesso.ts <email> <percorso>`), che non richiede
  di digitare una password e aggira il limite di tentativi ravvicinati. Ricetta completa in
  `ua-app/CLAUDE.md` §9 e nel referto del 03/08 §6.
- **Se tocchi gli overlay v3:** `npx tsx scripts/giro-guardia-overlay.ts` — prepara la fixture, lancia la
  guardia e **rimette la riga com'era**, rileggendola invece di fidarsi di valori annotati.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
