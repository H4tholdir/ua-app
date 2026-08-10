# Task 10-A — La prova a contratto: il corpo del foglio giudicato dalla rotta VERA

**Ramo:** `intervento-post-consegna` · **10 agosto 2026** (`provato:` `date` → verificata prima di scrivere questo file)
**Mandato:** `.superpowers/sdd/avviso-dentista-task-10a-brief.md`
**Modello copiato:** `tests/unit/devo-intervenire-contratto.test.tsx`

| cosa | esito |
|---|---|
| File nuovo | `tests/unit/avviso-foglio-contratto.test.tsx` — **4 prove**, tutte verdi al primo giro |
| File di produzione toccati | **zero** — `git status` prima e dopo, invariato |
| Le quattro forme (§1 del brief) | **tutte coperte**, una per riga (①②③④) |
| La misura (censimento) | **`sempre_testo`: 2 su 4** · **`rinomina_avviso_id`: 3 su 4** — misurate, non stimate |
| FASE 7 | `tsc` **0** · `vitest run` **6066 passate / 137 saltate / 0 rosse** · `next build` **riuscito** |
| Riserve | interpretazione della «misura» diverge dal precedente (dichiarata sotto) |

---

## ① L'approccio, copiato dal modello

`devo-intervenire-contratto.test.tsx` smette di fingere `fetch`: lo trasforma in un adattatore che
costruisce una `Request` vera e la consegna alla `POST` autentica della rotta, restituendo al
componente la `Response` che il server produrrebbe davvero. Questo file fa lo stesso, per la coppia
`AvvisoDentista.tsx` ↔ `src/app/api/lavori/[id]/avviso/route.ts`:

- **Le due finzioni della rotta**, identiche a `api-avviso.test.ts`: `@/lib/supabase/server-service`
  (`getServiceClient` → `{ from: mockFrom }`) e `@/lib/supabase/lab-context` (`getFreshLabContext`).
  Nessuna finzione di `isSameOrigin`: la `Request` non porta `origin`, e `csrf.ts:9` la considera
  sicura per costruzione (caso server-to-server) — stessa nota del modello.
- **Le due finzioni del componente**: `next/navigation` (`useRouter` → `refresh`/`push`/`replace`
  finti, il foglio non naviga mai) — non serve fingere `useNavigaDaOverlay`, perché
  `AvvisoDentista.tsx` non lo importa (a differenza del foglio gemello).
- **Il banco finto** distingue la VERIFICA (`select().eq().eq().eq().maybeSingle()`, risolta da un
  metodo esplicito) dall'AGGIORNAMENTO (`update().eq().eq().in().select()`, risolto dall'`await`
  sull'intera catena via `then`) — due percorsi di risoluzione che non si scontrano mai, quindi un
  solo oggetto catena basta per entrambi.
- **Il ponte** (`instradaVersoLaRottaVera`) legge il `lavoroId` per `params` **dall'URL catturato**,
  non da una costante: un foglio che componesse l'indirizzo sbagliato lo vedrebbe passare, se qui si
  fosse ripiegato su `LAVORO_ID` (correzione fatta prima di scrivere, su indicazione ricevuta in
  revisione preventiva — v. §④).

**Differenza dal modello, dichiarata:** questa rotta risponde **200**, non 201 (`route.ts:470`). Il
modello copre `POST /eventi-qualita`, che crea una riga nuova; `/avviso` ne aggiorna una esistente.
Un `toBe(201)` copiato alla lettera sarebbe stato un difetto silenzioso nella prova stessa.

---

## ② Le quattro forme, una per riga

| # | forma | esito atteso | test |
|---|---|---|---|
| ① | WhatsApp, testo modificato dall'utente | 200 | `① WhatsApp, testo modificato dall'utente → la rotta VERA accetta (200)` |
| ② | «l'ho avvisato io, a voce», senza testo | 200 | `② «l'ho avvisato io, a voce», senza testo → la rotta VERA accetta (200)` |
| ③ | «a voce» con un testo già in mano | il foglio NON lo manda (200, chiave assente) **+** se lo mandasse, 422 | `③ «a voce» con un testo già in mano: …` |
| ④ | mutazione plausibile del corpo (chiave rinominata, chiave in più) | 422 | `④ una mutazione PLAUSIBILE del corpo …` |

**Su ①:** gesti veri — apri il foglio, scegli WhatsApp, cambia il testo nel campo, tocca il collegamento
verde. Il corpo catturato dal ponte è `{ avviso_id, come: 'dall_app', testo }` con il testo **modificato
a mano**, non quello proposto di default: prova che ⚖️ D334 («il testo modificato è quello che parte»)
non solo compone giusto in isolamento, ma **supera anche il contratto vero**.

**Su ②:** `programmaAVoce()` differisce la scrittura di `FINESTRA_ANNULLO_AVVISO_MS` (⚖️ D351): serve un
orologio finto, avanzato dentro `act` (mai `waitFor` in quel blocco — gira su `setTimeout` finto, e
`AvvisoDentista.test.tsx:398` porta già l'avvertimento scritto). Il corpo catturato è esattamente
`{ avviso_id, come: 'a_voce' }`: nessuna chiave `testo`, nemmeno `null`.

**Su ③:** lo stato `testo` del componente è **uno solo**, condiviso dalle due strade
(`AvvisoDentista.tsx:288-290`), e nasce già valorizzato da `buildAvvisoMessage` al montaggio — «in
mano» prima ancora che qualcuno apra il passo del messaggio. La prova passa dal passo WhatsApp solo
per **confermare** che quel testo non è vuoto, poi torna alla scelta e prende la strada «a voce»: il
corpo composto dal foglio non porta `testo` (verificato con `'testo' in corpo === false`, non con
un controllo di lunghezza — la chiave dev'essere **assente**, non vuota). La seconda metà della prova
— «se lo mandasse, la rotta lo rifiuterebbe» — manda un corpo scritto a mano con `testo` su `a_voce`
e legge **422** dalla rotta vera: è la coppia che il brief chiede, e nessuna delle due metà da sola
la dimostrerebbe.

**Su ④:** due mutazioni, entrambe plausibili invece che rotte apposta:
- **chiave rinominata** — `avviso_id` → `avvisoId` (la convenzione camelCase che il resto del
  componente usa altrove): 422, e `mockFrom` mai chiamato — il rifiuto arriva dall'allowlist, prima
  di ogni lettura.
- **chiave in più** — `comunicato_da` aggiunta al corpo (un tentativo, anche innocente, di far
  scrivere l'autore dal client): 422, stessa allowlist, stesso `mockFrom` mai chiamato.

Nessuna delle due forme ha mai fatto arrivare la richiesta al database finto: il giudizio è tutto nel
contratto (`CHIAVI_AMMESSE`, `route.ts:179`), non in una copia di quel contratto scritta da questa
prova.

**Nessuna rotta ha rifiutato un corpo vero del foglio.** Le quattro prove sono passate al primo giro —
niente da riportare come BLOCKED.

---

## ③ La misura — «quante prove si accendono se il corpo composto cambia»

### La scelta di metodo, e perché diverge dal precedente

Il brief chiede la misura «con le prove nuove in piedi e il foglio INTATTO». Il precedente (Task 10,
`devo-intervenire`) l'ha ottenuta mutando **temporaneamente il componente di produzione**
(`DevoIntervenire.tsx`), contando le prove rosse, e poi **annullando** la mutazione (`git checkout`)
prima di chiudere. Qui non l'ho fatto: **nessun file di produzione è stato toccato, nemmeno in modo
transitorio**, per rispettare alla lettera sia la regola d'ingaggio di questo compito («Nessun file di
produzione si tocca») sia la lettera del brief («il foglio INTATTO»).

La leva sta invece nel **ponte** (codice di prova, non di produzione): `mutaSeRichiesto` applica una
mutazione plausibile al corpo **in transito**, sempre inerte a meno che la variabile d'ambiente
`AVVISO_MUTAZIONE` non sia valorizzata. Durante una corsa normale (`npx vitest run …`, anche dentro
`verify:full` o CI) quella variabile non è mai impostata: la suite eseguita è **sempre** quella scritta,
mai una copia mutata. La misura si ottiene rilanciando il file da fuori con la variabile accesa e
leggendo l'uscita reale.

⚠️ **Divergenza dichiarata, non nascosta:** le due ondate misurano la stessa domanda («quante prove
noterebbero un rifacimento plausibile del corpo?») con un meccanismo diverso (componente mutato e
ripristinato vs. ponte che muta il transito), quindi **i numeri delle due ondate non sono la stessa
unità di misura** — non sono comparabili riga per riga. Chi confronta «7 su 9» del Task 10 con i numeri
sotto deve saperlo.

### Le due mutazioni, e perché sono plausibili

- **`sempre_testo`** — «mandiamo sempre il testo, anche a voce»: è esattamente il rifacimento contro
  cui mette in guardia il commento in produzione (`AvvisoDentista.tsx:504`, «*il corpo cambia con la
  strada, e non per eleganza*»). Tocca **solo** il percorso «a voce».
- **`rinomina_avviso_id`** — `avviso_id` → `avvisoId`: un refuso di refactor verso la convenzione
  camelCase. Tocca **ogni** corpo, indipendentemente dalla strada.

### I numeri, misurati

```
provato: npx vitest run tests/unit/avviso-foglio-contratto.test.tsx
→ Test Files  1 passed (1) | Tests  4 passed (4)                              [baseline, M=4]

provato: AVVISO_MUTAZIONE=sempre_testo npx vitest run tests/unit/avviso-foglio-contratto.test.tsx
→ Test Files  1 failed (1) | Tests  2 failed | 2 passed (4)
   × ② «l'ho avvisato io, a voce», senza testo → la rotta VERA accetta (200)
     AssertionError: expected 422 to be 200
   × ③ «a voce» con un testo già in mano: …
     AssertionError: expected 422 to be 200

provato: AVVISO_MUTAZIONE=rinomina_avviso_id npx vitest run tests/unit/avviso-foglio-contratto.test.tsx
→ Test Files  1 failed (1) | Tests  3 failed | 1 passed (4)
   × ① WhatsApp, testo modificato dall'utente → la rotta VERA accetta (200)
   × ② «l'ho avvisato io, a voce», senza testo → la rotta VERA accetta (200)
   × ③ «a voce» con un testo già in mano: …
```

**`sempre_testo`: 2 su 4** si accendono (②③ — le due prove che passano dalla strada «a voce»).
**`rinomina_avviso_id`: 3 su 4** si accendono (①②③ — ogni prova che passa dal ponte componendo un
corpo vero; solo ④ resta verde, e per un motivo dichiarato sotto, non per un buco).

🔑 **Perché ④ non si accende mai, sotto nessuna delle due mutazioni — e non è un buco.** ④ manda corpi
**già** scorretti di suo (chiave rinominata a mano, chiave in più a mano): applicarci sopra una
mutazione del censimento non cambia l'esito (422 resta 422, o perché la mutazione è un no-op su un
corpo che non ha `avviso_id` da rinominare una seconda volta, o perché `sempre_testo` non tocca `come:
'dall_app'`). ④ misura una cosa diversa da ①②③ — non «il ponte arriva al contratto», ma «il contratto
rifiuta un corpo già rotto» — ed è corretto che sia invariante al censimento.

---

## ④ Confini dichiarati (NON affrontati, per mandato)

- **Il verso opposto — risposta del server → schermata.** Nessuna prova di questo file rende il passo
  «Fatto» a partire da una risposta che la rotta ha davvero costruito. `leggiRiuscita` resta scritta a
  mano contro un tipo (`RigaSalvata`) mai confrontato col tipo di ritorno della rotta.
- **La chiusura a livello di tipo.** Perché sparisse anche la classe di difetto «campo rinominato
  compila lo stesso», la rotta dovrebbe esportare il tipo del corpo e della risposta, e il componente
  comporre `satisfies` contro quel tipo. Non l'ho fatto: è un cambiamento alla rotta, fuori da questo
  mandato (R-E2).
- **Il client Supabase resta finto.** Questo file misura il contratto HTTP, non la banca dati — quella
  resta a `api-avviso.test.ts` (che finge la rotta per isolare 29 forme d'input) e a
  `tests/integration/` (database vero).
- **`TETTO_TESTO`/`LIMITE_TESTO`, i due numeri paralleli.** Il commento in `AvvisoDentista.tsx:154-162`
  dichiara già la divergenza possibile fra `TETTO_TESTO` (componente) e `LIMITE_TESTO` (rotta): non
  l'ho toccata, non è il soggetto di questo compito.

---

## ⑤ FASE 7 — output reale

```
npx tsc --noEmit
→ TSC_EXIT=0

npx vitest run
→ Test Files  462 passed | 11 skipped (473)
   Tests  6066 passed | 137 skipped (6203)

npx next build
→ BUILD_EXIT=0 (tutte le rotte generate, incluso /api/lavori/[id]/avviso)
```

`git status` prima e dopo: solo due file nuovi, entrambi sotto `.superpowers/sdd/` e `tests/unit/` —
nessun file sotto `src/` toccato.

---

## ⑥ Che cosa NON ho fatto

- Non ho toccato `memory/MEMORY.md` né `docs/roadmap/ROADMAP-UFFICIALE.md`: il mandato del Task 10-A
  non lo chiede (è lavoro di test, non un cambiamento di stato del prodotto), e la chiusura a ledger
  segue lo stesso schema delle ondate precedenti (`docs(sdd): Task N chiuso a ledger`, un passo
  separato).
- Non ho pubblicato il ramo (`git push`): resta locale, nessuna istruzione a farlo in questo mandato.
- Non ho esteso il censimento a una terza mutazione: due bastano a mostrare che il ponte è sensibile
  su assi diversi (un solo percorso vs. entrambi), ed è la stessa cardinalità che l'advisor consultato
  in fase di progettazione ha indicato come sufficiente.
