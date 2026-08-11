# Mandato — Task 5-bis: «a voce» con UN tocco, e la via di fuga (⚖️ D351)

**Data:** 09/08/2026, 21:14. **Ramo:** `intervento-post-consegna` (attivo, pubblicato).
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, **centocinquantesima
tornata**. **Leggila prima di toccare il codice.**
**Il lavoro su cui intervieni:** `AvvisoDentista.tsx` (Task 5, già revisionato) e la sua prova.

## Le due decisioni appena ratificate

⚖️ **D350 — il nome del paziente SI VEDE nel foglio** (terza deroga a §2.1 del DS v3, già scritta nella
spec). ✅ **Per te non cambia niente:** il componente riceve `pazienteMostrato` e fa già la cosa giusta.
**Non toccarlo.** 📌 Chi decide *cosa* passare è il Task 6.

⚖️ **D351 — «l'ho avvisato io, a voce» chiude con UN TOCCO SOLO.** 🔴 **Questo cambia ciò che hai
costruito:** il passo di conferma che rilegge ciò che resterà scritto **va via**.

## 🔴 E la conseguenza NON è negoziabile: serve una via di fuga

Con la conferma, la via di fuga della **Legge 6** («*ogni azione irreversibile ha una via di fuga
visibile… entro 10s*») viveva **prima** della scrittura — e il resoconto del Task 5 lo diceva
esplicitamente. **Togliendo la conferma, quella via di fuga scompare**, e la Legge 6 resta violata.
➡️ **Va ricostruita dopo la scrittura, e il come lo decidi tu**, motivandolo nel resoconto.

**I vincoli veri, misurati, che restringono il campo:**
- 🛑 **La tabella NON ha uno stato «annullato»** — scelta del Task 1, scritta nel `COMMENT`: *un promemoria
  cancellabile è una casella da spuntare*.
- 🛑 **La rotta risponde 409 a un avviso già chiuso** (Task 4): oggi **non esiste** una strada che riporti
  un avviso a `da_comunicare`.
- ✅ **Ma il vincolo in banca dati lo permetterebbe:** `avviso_comunicato_ha_autore_e_data` chiede che
  `da_comunicare` abbia autore e data **a `NULL`** — quindi un ritorno è **scrivibile**, se si azzerano
  i due campi. **Verificalo tu sul catalogo prima di costruirci sopra.**
- 📌 **Il precedente in casa:** `FINESTRA_ANNULLO_MS = 10 * 60 * 1000` — **dieci minuti** —
  `src/lib/consegna/costanti.ts:7`, la finestra con cui si annulla una **consegna**. 🔑 **Censisci come è
  fatta quella via di fuga** (chi la mostra, chi la esegue, cosa scrive) prima di inventarne una nuova:
  due modi diversi di annullare nella stessa app sono due modi che divergeranno.

**Le due strade che vedo, e nessuna delle due è già decisa:**
1. **Differire la scrittura** di N secondi con l'annullo dentro l'avviso a schermo (pattern «undo»): non
   tocca la rotta, e se l'app si chiude nel frattempo **il promemoria resta aperto** — cioè la direzione
   recuperabile, la stessa che hai già scelto per il caso «la rotta fallisce dopo l'invio».
   ⚠️ Ma per N secondi il foglio **dice una cosa che non è ancora vera**.
2. **Scrivere subito e permettere il ritorno** entro una finestra: la registrazione è immediata e onesta,
   **ma serve un ramo nuovo nella rotta** (oggi 409) — cioè un lavoro fuori dal tuo perimetro, che va
   **riferito** e non fatto di nascosto.
🛑 **Se scegli la 2, fermati e riferisci prima di toccare la rotta.** Se scegli la 1, la costruisci qui.

## Il perimetro

`AvvisoDentista.tsx` + la sua prova. 🛑 **Non toccare la rotta**, non toccare `Sheet.tsx`, non montare
niente sulla scheda (Task 6), nessuna migration.

## Che cosa deve restare vero dopo la tua modifica

- [ ] **Le due strade restano pari** (⚖️ D335): «a voce» ora costa **un** tocco. ⚠️ Guarda cosa diventa
      WhatsApp: se lì i tocchi restano due, la parità **si sposta** — dillo nel resoconto, con il conto
      dei tocchi di ciascuna strada. **Non riequilibrare togliendo un passo a WhatsApp** senza chiederlo:
      il passo del messaggio è ⚖️ D334 (il testo è modificabile) e non si tocca.
- [ ] **Nessuna delle due strade è più invitante dell'altra** (è il motivo per cui la A2 è stata scelta).
- [ ] **⚖️ D339 — la bozza non si conserva:** invariato.
- [ ] **Il vincolo stretto in banca dati:** «a voce» **non porta testo**, altrimenti 422.
- [ ] **Le prove che avevi scritto per la conferma** vanno riviste: quelle che sorvegliavano il secondo
      passo **devono diventare rosse**. 🔑 **Se restano verdi, non sorvegliavano quel passo** — e quello è
      un fatto da riferire, più importante della modifica di stasera.

## Le regole di casa

- Componenti **solo** da `src/components/ds/` · motion **solo** dai token v3, **mai** una `duration`
  inline · suoni e vibrazione dai token v3 · `useNavigaDaOverlay` se navighi, **mai** `router.push`.
- **Bersagli ≥ 44px · testo ≥ 17px · contrasto 4,5:1 in ENTRAMBI i temi · il colore non è mai l'unica
  fonte di stato · `prefers-reduced-motion` rispettato.**
- **FASE 9:** rifai il giro sui **tre viewport × due temi** sui passi che hai cambiato, con gli scatti.
  🛑 **Misura i contrasti sul DOM vivo** — e ricorda il tuo stesso inciampo: la prima sonda dava **15
  falsi positivi** perché leggeva `background-color` e i gradienti rispondono `transparent`.
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — da variabile, mai dietro una
  pipe, timeout 600000 ms. 📌 Base dopo il Task 5: **`5891 | 119` su 465 file** — **rimisurala**.
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**; `git status` prima di salvare. Niente `push`, niente
  `main`, niente worktree. **R-E2:** i difetti fuori mandato si riferiscono.

## Il resoconto

In `.superpowers/sdd/avviso-dentista-task-5bis-report.md`: ① quale strada hai scelto per la via di fuga e
**perché**, col censimento del precedente della consegna · ② il conto dei tocchi di ciascuna strada, prima
e dopo · ③ quali prove sono diventate rosse togliendo la conferma (e se **nessuna**, che cosa significa) ·
④ `N su M` · ⑤ i contrasti rimisurati sui passi cambiati · ⑥ i numeri (`VERIFY_EXIT`, passate/saltate prima
e dopo) · ⑦ `non provato` col motivo · ⑧ ritrovamenti fuori mandato · ⑨ il salvataggio.
