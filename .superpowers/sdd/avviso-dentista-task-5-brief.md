# Mandato — Task 5: il foglio dell'avviso, variante A2 (⚖️ D344)

**Data:** 09/08/2026, sera. **Ramo:** `intervento-post-consegna` (attivo, pubblicato).
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, **Task 5** (aggiornato con D344).
**Disegno approvato:** `docs/design/mockups/2026-08-09-avviso-al-dentista.html` — **colonna centrale della
sezione A**, quella con la targhetta «Variante A2 · due strade pari». 🛑 **Quel file è la fonte del
disegno: si guarda, non si reinventa.** Scatti: `docs/design/mockups/screenshots/2026-08-09-avviso-al-dentista/`.
**Verbale:** centoquarantanovesima tornata (D344 → D349).

## Il perimetro

**SOLO** `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` + la sua prova + (v. punto ①) il
campo multilinea nel design system. 🛑 **NON montarlo sulla scheda del lavoro: quello è il Task 6.**
Nessuna migration, nessuna rotta (la rotta c'è già: Task 4).

## Che cosa fa il foglio, secondo la A2 approvata

**Passo 1 — una domanda sola:** «*Come avvisi il dentista?*» e **due righe di scelta con lo STESSO peso
visivo** (`--fondo-superficie`, bordo `--filo-superficie`, `raggio.riga` 18, `minHeight` 60, gallone `›`):
«*Glielo mando su WhatsApp*» / «*L'ho avvisato io, a voce*», ognuna con la sua riga di spiegazione. Sotto,
la superficie «*Perché te lo chiedo*» che dice che il promemoria **non si spegne da solo**.
🛑 **Nessuna delle due più invitante dell'altra: è il punto di ⚖️ D335, ed è il motivo per cui Francesco ha
scelto la A2.** Se ti viene voglia di dare più peso a WhatsApp, **fermati**: sarebbe la A1, che è stata
scartata.

**Passo 2 — solo se sceglie WhatsApp:** il testo **modificabile** (⚖️ D334) e il tasto di invio.

## 🔴 I punti che possono bloccarti, misurati da me

### ① IL DESIGN SYSTEM NON HA UN CAMPO PER IL TESTO LUNGO

`provato:` `Campo.tsx` esporta **`CampoTesto` · `CampoNumero` · `CampoData`** e basta (h **64**, una riga);
`grep -rln textarea src/components/ds/` → **solo `trappola-focus.ts`**, dove `textarea` è un *selettore* di
elementi focalizzabili; `NotaDentista.tsx` **non ha nessun input** (è in sola lettura); nessuna `<textarea>`
in tutte le superfici v3.
➡️ **Il campo multilinea va CREATO, e la scelta di dove va scritta.** La strada che consiglio e che devi
confermare o rifiutare **con una ragione**: un `CampoTestoLungo` **accanto ai suoi fratelli in
`src/components/ds/Campo.tsx`** — stessi token, stesso anello di focus (`2px var(--blue)`, offset 2),
stessa didascalia. 🛑 **Non una textarea locale dentro il foglio:** sarebbe il primo campo multilinea
dell'app, e nascerebbe fuori dal design system.
📌 Dal mockup: fondo `--fondo-superficie`, bordo 1px `--filo-superficie`, `raggio.riga` 18, padding
**14/16**, testo **17**/600 con `line-height 1.45`, altezza **misurata** — nel mockup 296px, perché il
contenuto ne chiedeva 225 a 1280 e di più a 390. **Rimisurala tu invece di ricopiarla.**

### ② LA A2 HA DUE PASSI, QUINDI EREDITA UN DIFETTO GIÀ MISURATO

Il foglio gemello (`DevoIntervenire.tsx`) usa **un solo `Sheet` che cambia passo**, e `Sheet.tsx`
**non azzera mai `scrollTop`** (`grep scrollTop Sheet.tsx` → zero): misurato sul gemello, al cambio di
passo lo scorrimento resta a **380**, con titolo e nastro **fuori schermo** a 390.
➡️ **Misuralo sul tuo foglio a 390** (il passo 2 porta un campo alto, quindi il caso è plausibile) e
**scrivi la misura nel resoconto**. 🛑 **Non toccare `Sheet.tsx`**: è un componente di sistema e la
correzione vale per tutti i fogli a passi (R-E2 → si riferisce). Se il difetto si manifesta, la via locale
è un `ref` sul contenitore: **decidi, e scrivi perché**.

### ③ IL CHECK IN BANCA DATI È STRETTO: «a voce» NON PUÒ PORTARE UN TESTO

`avviso_testo_solo_se_dall_app` pretende: `comunicato_dall_app` ⇒ testo **presente**;
**ogni altro stato** ⇒ testo **assente** (stretto dal Task 1, di proposito, per ⚖️ D339).
➡️ Quando l'utente scegli «a voce», il corpo della richiesta **non porta `testo`**. Se lo portasse, la
rotta risponde **422** (il Task 4 lo ha già chiuso). **Provalo.**

### ④ ⚖️ D339 — LA BOZZA NON SI CONSERVA

**Nessun salvataggio automatico del testo mentre l'utente lo modifica**, nessuna scrittura prima
dell'invio. Si registra **solo il testo mandato**.

### ⑤ IL MOMENTO IN CUI SI REGISTRA — è una scelta di disegno, non un dettaglio

⚖️ **D331: l'app propone, l'odontotecnico manda.** L'app **non può sapere** se il messaggio è davvero
partito (è scritto nella rotta del Task 4). Quindi: si registra la chiusura **al tap**, e ciò che resta
scritto è **un'autodichiarazione** — vale per entrambe le strade.
➡️ **Scrivi nel resoconto in quale ordine avvengono le due cose** (aprire `wa.me` e chiamare la rotta) e
**cosa succede se la rotta fallisce dopo che il messaggio è partito**: è il caso peggiore, e va deciso, non
scoperto. 📌 L'advisor di prodotto ha suggerito una **conferma che rilegge ciò che resterà scritto**
(«*resta scritto: hai avvisato lo Studio Rossi a voce, oggi alle 14:32*») e un **Annulla breve su
entrambe** le strade: valutalo, e se lo scarti scrivi perché.

### ⑥ `buildAvvisoMessage` ORA PRETENDE IL NOME DEL LABORATORIO

⚖️ **D345**, chiuso poche ore fa: la firma è **il nome del laboratorio**, e la funzione lo **richiede**.
**Il tuo foglio è il suo primo chiamante.** Da dove arriva il nome? **Censiscilo** — e se non è in mano al
componente, riferisci come pensi di portarlo: 🛑 **non inventare una seconda via di lettura.**
📌 Il modulo della firma è `src/lib/messaggi/firma.ts`: **una fonte sola**, e il caso «nome assente» è già
deciso lì (la riga della firma non esiste).

### ⑦ IL GETTONE DEL PORTALE NON SI RIGENERA PIÙ QUI

⚖️ **D348** — non scade più a tempo. **Togli dal disegno qualunque ramo «gettone scaduto»:** se il
collegamento è spento perché la collaborazione è finita, è un altro discorso (riga **49** della coda).

### ⑧ I DUE DIFETTI CHE EREDITERAI, e che NON devi aggiustare

⚖️ **D349**: `TastoPrimario.tsx:90` (spento, **1,15:1** in scuro) e `Campo.tsx:28` (didascalia, **4,17:1**
in chiaro). Se il tuo foglio mostra un tasto spento o una didascalia di campo, **li eredita**.
🛑 **Non toccarli** (v3 §14: la migrazione è per route, mai per componente) **ma dichiarali nel resoconto
con la misura**, così non tornano invisibili.

## Le regole di casa, quelle che valgono su una superficie

- **Componenti SOLO da `src/components/ds/`** · **motion SOLO da `src/design-system/v3/motion.ts`** (le
  cinque molle: `snappy · smooth · bouncy · press · wizard`) 🛑 **mai una `duration` inline** ·
  suoni e vibrazione da `src/design-system/v3/{sound,haptic}.ts`.
- 🛑 **Navigare da dentro un overlay: `useNavigaDaOverlay`, MAI `router.push`** (`CLAUDE.md` §9 — difetto
  già pagato: il tasto primario si comportava come un annulla).
- **Bersagli ≥ 44px** · **testo di lettura ≥ 17px** · **contrasto 4,5:1 in ENTRAMBI i temi** · **il colore
  non è mai l'unica fonte di stato** (Legge 3) · `prefers-reduced-motion` rispettato.
- **Parole del banco, mai del software** (Legge 2): niente «form», «record», «submit», «stato».
- **FASE 9 obbligatoria:** 390 · 768 · 1280, **chiaro e scuro**, con gli scatti in
  `docs/design/screenshots/2026-08-09-avviso-dentista/`. **Misura i contrasti sul DOM vivo**, non a occhio.
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — da variabile, **mai dietro una
  pipe**, timeout 600000 ms. 📌 Base dopo il Task 4-ter: **`5833 | 119` su 464 file** — **rimisurala**.
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**; `git status` prima di salvare; messaggi lunghi con `-F`.
- 🛑 Niente `push`, niente `main`, niente worktree. **R-E2:** i difetti fuori mandato si riferiscono.
- **Fixture:** il formato maggioritario del numero di lavoro è **`STOR/2021/016`** (276 righe su 299), non
  `2026/0042` (19). Usa il primo, o entrambi.

## Il resoconto

In `.superpowers/sdd/avviso-dentista-task-5-report.md`: ① la tua decisione sul campo multilinea e perché ·
② la misura dello scorrimento al cambio di passo a 390 · ③ l'ordine fra invio e registrazione, e cosa
succede se la rotta fallisce dopo · ④ da dove arriva il nome del laboratorio · ⑤ `N su M` di R-P4 e le
forme d'input enumerate · ⑥ i contrasti misurati sui tre viewport × due temi, e i due difetti eredati con
la loro misura · ⑦ i numeri (`VERIFY_EXIT`, passate/saltate prima e dopo) · ⑧ `non provato` col motivo ·
⑨ ritrovamenti fuori mandato · ⑩ il salvataggio.

🛑 **Non ricopiare nessun numero da questo brief senza rifare il conto**, e **non dichiarare «fatto» ciò
che non hai misurato.**
