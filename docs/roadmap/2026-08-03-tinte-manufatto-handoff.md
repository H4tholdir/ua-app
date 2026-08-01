# Handoff — la DdC è stata guardata in produzione, e D42 è arrivata fino al piano

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`b7926c3f`**, allineato con `origin` (**zero** da pubblicare), **albero pulito**.
uachelab.com risponde `200`.
**Riferimento misurato ADESSO, su `main`:** `tsc` **0** · `vitest` **370 | 3** file e **4275 | 19** prove ·
`next build` **uscita 0**.
**Nessuna riga di codice è stata toccata in tutta la sessione.** Solo documenti.

⚠️ **Sulla data.** L'orologio della macchina dice **1° agosto**; i documenti del progetto seguono la serie del
**3 agosto**, e questo handoff la tiene — **non c'è nulla che provi che il progetto sia passato al 4**, e una
data inventata è peggio di una ferma. 🔑 Il fatto misurato: la dichiarazione emessa in produzione porta
stampato **01/08/2026**, cioè l'orologio della macchina.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① Il piano di D42 l'ho scritto io e l'ho riletto io. **Nessun altro l'ha guardato.**

`docs/superpowers/plans/2026-08-03-tinte-manufatto.md` — 9 task, 1050 righe. La mia rilettura ha trovato
**sette rimandi incrociati sbagliati** fra un task e l'altro e **un nome dato per esportato che nel codice è
privato**, e li ho corretti. **Non è una garanzia: è un indizio nella direzione opposta.**

🔑 **Perché conta, misurato e non temuto:** l'ultima volta un piano di questo progetto — 2.200 righe, riletto
dal suo autore — ha portato **8 difetti su 8 task**, e **tre stavano nel piano stesso**. Nessuno dei tre
sarebbe stato visto rileggendolo: sono emersi perché un **esecutore fresco si è fermato** invece di adattare
l'asserzione finché passava.

➡️ **Come si chiude:** si esegue con **R-E1** — un task alla volta a un esecutore fresco, revisione
indipendente in mezzo, e nel brief l'istruzione esplicita di **cercare dove il piano sbaglia**. L'esecutore
del **Task 1** ha in più il compito di verificare che i tre registri (prove, letture, censimento) **ci siano**
— presenza, non verità — e se mancano **si ferma e riferisce**.

### ② Il **§6-bis** della Dichiarazione non è stato percorso in produzione

Il giro del 3 agosto ha guardato una DdC vera uscita da uachelab.com: **otto criteri su otto verdi**. Ma la
sezione **§6-bis (norme armonizzate) non è comparsa**, perché per `protesi_fissa` di quel laboratorio
`rischi_tipo_dispositivo.norme_json` è **vuoto** — letto **prima** di premere, non scoperto dopo.

🛑 **Conseguenza:** resta non osservabile anche la voce 🟡 9 del censimento («§6-bis e §7 attaccati, senza lo
stacco che hanno le altre sezioni»), che è **invisibile alla suite** perché la fixture non popola mai
`norme_json`.
➡️ **Costa un giro a parte**, con una riga di prova da preparare e **rimettere** (il modello è
`scripts/giro-guardia-overlay.ts`: prepara → esegue → ripristina rileggendo la riga vera).
📄 Referto: `docs/roadmap/2026-08-03-ddc-produzione-referto.md` §4.

### ③ La domanda che **blocca la parte 2** di D42 non ha risposta

Il piano copre catalogo, dato, vincoli, API, scheda e correzione. **Il passo del wizard è fuori**, e non per
scelta di comodo:

`provato:` `grep -rn "sequenzaPassi\|SEQUENZA_CANONICA\|NomePasso\|passoSuccessivo\|passoPrecedente" src/ | grep -v "src/lib/wizard/"` → **nessun riscontro**
`provato:` `WizardNuovoLavoro.tsx:50-59` → `passo: 1 | 2 | 3`, un **numero**
`provato:` `persistenza.ts:12-24` → la bozza salvata porta `v: 1` e lo stesso numero

**L'impalcatura dei passi adattivi esiste, ha le sue prove, e non è agganciata a nessuna schermata: la usano
solo i suoi test.** Il wizard vero è a tre passi numerati e si ferma al paziente.
➡️ **Serve una decisione di Francesco (sarà D121):** agganciare l'impalcatura — lavoro rimasto aperto
dell'ondata (b), tocca la bozza a 24 ore e la porta a `v: 2` — oppure bullonare un quarto passo numerato al
modello vecchio, che poi va disfatto.

---

## 1. Che cosa è successo

| | |
|---|---|
| **La §0 dell'handoff precedente** | ✅ **CHIUSA.** Consegnato `TEST-DdC-001` su uachelab.com, scaricata e **guardata** la DdC emessa, **annullato in 26 secondi**. **Otto criteri su otto verdi**: titolo con `À`, PRRC con `à`, «è conforme», **`§2 — DATA DI EMISSIONE`** presente (paragrafi `1…8` senza buchi), metadati del file accentati. `testo_conformita_snapshot` porta `è`; sulla riga di ieri porta ancora `e'`. Referto: `docs/roadmap/2026-08-03-ddc-produzione-referto.md` |
| **La rete di lettura** | 🔑 **Provata rompendola:** gli stessi otto criteri sul foglio **vecchio** danno **otto rossi su otto**. E un **nono criterio è stato buttato** perché passava anche lì |
| **Le voci aperte sulla DdC** | 📄 **Trasferite dall'handoff alla ROADMAP** (sezione «I documenti che escono dal laboratorio»), con **ogni riferimento riaperto e riverificato**: tre erano invecchiati dopo il rilascio degli accenti, e due fatti sono stati **misurati** invece che riportati |
| **D42 — le tinte del manufatto** | ✅ **Brainstorming → spec ratificata → mockup scelti → piano scritto.** Dodici decisioni in tre tornate (**D109-D120**) |
| **Decisioni di Francesco** | **D108** (si parte con D42, e prima si appunta tutto il resto) · **D109-D114** (una tinta sola · catalogo chiuso · due famiglie col vincolo nel database · scheda + passo wizard · facoltativa e saltabile · pallino solo dove è onesto) · **D115-D118** (coppia sulla riga del lavoro · contenuto preso così · al cambio di tipo si toglie e si dichiara · tre superfici) · **D119** (la tavolozza è la **griglia**) · **D120** (i 211 scatti entrano nel repo) |
| **Salvataggi** | `d37405ef` · `54e8b1c8` · `85f7d839` · `6d2ee042` · `5805e065` · `84ca031f` · `33f62cc2` · `b7926c3f` — tutti pubblicati |

📌 **Una scelta deliberata, dichiarata perché non sembri un numero perso:** il «sì, premi Consegna» **non ha
un numero di decisione**. Era l'autorizzazione a eseguire un giro già scritto nella roadmap, non una scelta
di progetto. Se la prossima sessione preferisce numerare anche quelle, è un cambio di regola da fare
esplicito.

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① Una rete che non è mai stata contata non è una rete.** Il file delle esclusioni di git buttava via
`*.png` con la ragione «screenshot di debug», mentre la regola §0B **rende gli scatti dei mockup obbligatori
e li vuole nel repo**. In quella cartella ce n'erano già **343 versionati**, ognuno **forzato a mano**: e
**211 non ci erano mai arrivati** (56 MB, comprese le anteprime su cui sono state approvate ondate passate).
🔑 Un gesto da ricordare a ogni ondata è un gesto che prima o poi salta — e **era già saltato 211 volte senza
che nessuno se ne accorgesse**, perché il file ignorato non compare in `git status`.
🛑 **Il rimedio è l'eccezione, non il gesto:** due righe nel file delle esclusioni, con la prova che le
immagini di **debug** restano fuori.

**② Quando una guardia ti ferma, il difetto è quasi sempre tuo.** Due volte in questa sessione:
la guardia BP-1 ha bloccato un salvataggio che toccava una spec senza toccare la memoria (**aveva ragione**),
e la guardia dei documenti ha bloccato il piano perché citava dieci file inesistenti — **aveva ragione a
metà**: non esistono perché è il piano a crearli, ma **la via d'uscita esisteva già nella guardia**
(«(nuovo)», «da creare», «🆕») e il piano non l'aveva usata.
🛑 **Si è messo in regola il documento, non allentata la guardia.** Allargare un controllo perché dà fastidio
è il modo in cui i controlli smettono di controllare.

**③ Un'affermazione portante di un NOSTRO referto si riverifica come quella di un panel.** Il referto del
3 agosto scriveva che la consegna aveva «bruciato un numero di buono», e che una vecchia DdC «probabilmente
non nasceva da una consegna completa». **Entrambe false, misurate.** E la prima l'ho **ripetuta a Francesco
un'ora prima di premere**. È la lezione ⑥ dell'handoff precedente, applicata a noi stessi.

**④ Il mockup trova cose che il ragionamento non trova.** Due difetti sono usciti **guardando gli scatti**:
«Glitter multicolore» andava a capo e sfasava la riga della griglia, e il blocco dell'avviso era formattato
male. Nessuno dei due si vedeva descrivendo il disegno a parole — e uno l'ha visto **Francesco**, non io.

**⑤ Il censimento dei file cambia il perimetro, non lo conferma.** Aprire i file di D42 ha prodotto **due
fatti che nessun documento diceva** — nel wizard il passo del colore non esiste per **nessun** tipo, e la
tendina della scheda offre **19 codici su 48** — e **una correzione a un'affermazione portante del panel del
28/07**: il vincolo famiglia↔tipo che il panel dava per impossibile **è possibile**, perché la divisione
resina/sport cade sulla categoria **grossa**, che sul lavoro c'è.

**⑥ I file che il piano crea vanno dichiarati tali.** Vale per ogni piano futuro: la guardia dei documenti
controlla i riferimenti anche dentro `docs/superpowers/plans/`.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **Eseguire il piano di D42 parte 1** — 9 task, R-E1, ramo `tinte-manufatto` **nel repo principale** (🛑 mai un worktree) | `docs/superpowers/plans/2026-08-03-tinte-manufatto.md` |
| 🔴 **2** | **La decisione sul passo del wizard** (§0 ③) — sarà **D121** | piano, §Domande 1 |
| 🔴 **3** | **Il buono di consegna non si rigenera dopo un annullo**, e il dialogo promette il contrario. `buoni_consegna` esiste con lo stato `'annullato'` previsto e ha **zero righe** | roadmap, sezione dedicata |
| 🟠 **4** | **La DdC cita `Art. 2(1)(3)` MDR, che non esiste** — va `Art. 2(3)`. ⚠️ Fonte **secondaria**: prima di correggere si riconferma sul testo **italiano** di EUR-Lex | roadmap, sezione dedicata · `DdcTemplate.tsx:461` |
| 🟠 **5** | **Il luogo di fabbricazione non è mai stampato** (trattino 1, obbligatorio) · **«Sostanze / tessuti: No»** codificato a mano · **la nomina PRRC riscrive la data** e `prrc_nomine` non la legge nessuno | roadmap, «I documenti che escono dal laboratorio», voci 1-3 |
| 🟡 **6** | **Il §6-bis non provato in produzione** (§0 ②) | referto §4 · roadmap voce 9 |
| 🟡 **7** | Le altre voci del censimento DdC: `payload_sha256` non ricalcolabile · il paziente che può ridursi a un trattino · la contraddizione fra due panel sulla conservazione decennale · il refuso **nei dati** «dell Allegato I» · le minori | roadmap, voci 6-11 |
| 🟡 **8** | **`useLavoroForm.ts` non è stato letto** — è l'innesco del primo passo del Task 8 | piano, §Domande 3 |
| 🟢 **9** | La scheda: riga muta o riga che porta alla modifica? Emendamento di una riga, si decide in collaudo | piano, §Domande 2 |

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`.** La voce **6** (D42) è **in corso**: spec ratificata,
mockup scelti, piano scritto, **esecuzione da iniziare**.

Se D42 dovesse essere messa in pausa, le voci pronte restano: **registrare ciò che il dentista prescrive**
(voce 9, GRANDE con migration, è dove rimanda D101) · **allegati e condivisione** (D67, ondata propria,
destinazione di D75 e R20) · **avviso alla consegna su dente/colore mancanti** (🛑 ha la dipendenza dura
dell'id fine del tipo, non persistito).

🔑 **E le voci normative della sezione «I documenti che escono dal laboratorio» meritano di essere pesate
prima delle ondate di prodotto:** riguardano che cosa un documento a valore legale **afferma**, e due di esse
— il «Sostanze / tessuti: No» e il buono con la data sbagliata — sono affermazioni che oggi nessuno ha
verificato.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md`, sempre per primi.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centoventi** decisioni in
  trentasette tornate. La prossima è **D121**.
- **REGOLA ADVISOR:** ogni decisione significativa passa da un panel di 2-3 con mandato di confutare — e
  **le sue affermazioni portanti si riverificano a mano** (in questa sessione una del panel del 28/07 era
  troppo pessimista, v. lezione ⑤).
- **R-E1 / R-E2:** un compito alla volta a un esecutore fresco; un difetto fuori dal proprio mandato si
  **riferisce**.
- **FASE 7 per intero, output incollato.** I tre comandi sono tre: `tsc` non vede la firma degli handler di
  rotta. **Riferimento misurato oggi:** `tsc` 0 · `vitest` **370 | 3** file e **4275 | 19** prove ·
  `next build` uscita 0.
- **FASE 6b:** dopo ogni migration, `supabase gen types` + `tsc`. La CLI **funziona da qui**
  (`npx supabase db push --yes`): il CI **non** applica le migrazioni, si fanno a mano.
- **D103 — l'accesso al banco:** credenziali di `.env.local`, **link monouso**
  (`npx tsx scripts/tmp/link-accesso.ts <email> <percorso>`). ⚠️ `scripts/tmp/` è **ignorato da git**: gli
  script di questa sessione (`preflight-ddc.ts`, `dopo-consegna.ts`, `annulla-fallback.ts`, `sonda-buono.ts`,
  `scatti-tinte.mjs`) **non sopravvivono a un altro computer** — l'elenco di cosa fanno è nel referto §8.
- 🛑 **Prima di consegnare un lavoro per prova, due controlli:** stato `pronto`/`in_ritardo` **e** nessuna DdC
  con stato ≠ `annullata`, altrimenti il guard di idempotenza restituisce quella vecchia e si legge un
  **rosso falso**. Il banco è pulito: `TEST-DdC-001` è `pronto`, **zero DdC attive** (verificato adesso).
- **Se tocchi gli overlay v3:** `npx tsx scripts/giro-guardia-overlay.ts`.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
