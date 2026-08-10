# Task 10-B — IL GIRO SUL BANCO VERO + LE PROVE A SCHERMO (FASI 9 dei Task 6·7·8·9)

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` (attivo — MAI worktree)
**Piano:** Task 10 (`docs/superpowers/plans/2026-08-09-avviso-al-dentista.md:531`). **BASE:** `baaf9912`.
**Zero migration. Zero codice di produzione** (se un difetto emerge: si RIFERISCE, R-E2 — unica
eccezione ammessa: un difetto che BLOCCA il giro stesso, e allora BLOCKED con il caso esatto).

---

## 0. Che cosa prova questo task

Tutto il canale è costruito e provato PEZZO PER PEZZO, ma **il giro completo sul banco vero non è mai
avvenuto**: riemissione reale → l'avviso nasce → scheda e striscia lo mostrano → il portale mostra la
card (D354: UNIONE) → la ricevuta di lettura si scrive → la chiusura chiude TUTTO → l'archivio
racconta. E **nessuna superficie nuova è mai stata fotografata** (le FASI 9 dei Task 6·7·8·9 sono
accorpate qui — anche M-T9-1: l'archivio va reso CON righe, mai successo in nessuna prova).

## 1. Preparazione

- **Leggi PRIMA** `.superpowers/sdd/task-11-giro-report.md` (il giro dell'ondata precedente): come ha
  accesso, come verifica in banca dati, come ha rimesso a posto. Segui quel modello dove regge.
- **Server:** app locale del ramo (il codice NUOVO non è su uachelab.com: `main` non è stato toccato).
  Usa la skill `webapp-testing` (Playwright) per server e screenshot.
- **Accesso (D103):** `npx tsx scripts/link-accesso.ts [email] [percorso]` genera un link con
  `token_hash`. ⚠️ Il link punta a uachelab.com: LEGGI lo script e costruisci l'URL equivalente su
  `http://localhost:3000/auth/callback?token_hash=…&type=magiclink&next=…` (stesso Supabase, stesso
  hash). Se lo script accetta già una base diversa, usala e dichiaralo.
  ⚠️ Nota della riga 38 della coda: `TEST_EMAIL` di `.env.local` può puntare a UN ALTRO laboratorio
  rispetto alla fixture che scegli — verifica PRIMA a quale laboratorio appartiene il lavoro che usi,
  e genera il link per un utente di QUEL laboratorio (ruolo `titolare` o `tecnico`).
- **Verifiche in banca dati:** `node scripts/psql.mjs -c "SELECT …"` (sola lettura per le verifiche).
- **La fixture:** un lavoro CONSEGNATO con dichiarazione emessa non annullata (se non c'è, portane
  uno a consegna: stato `pronto`/`in_ritardo` e nessuna DdC ≠ `annullata` — v. `ua-app/CLAUDE.md`,
  blocco D103 — e ricorda la finestra di annullo di 10 minuti). Scrivi nel resoconto QUALE lavoro,
  QUALE laboratorio, e lo stato di partenza ESATTO (per il ripristino).

## 2. Il giro, in ordine (ogni passo: azione a schermo + verifica in banca dati)

**R1 — la prima riemissione.** Dalla scheda del lavoro: correggi UNA voce correggibile (annota valore
vecchio e nuovo) e riemetti (l'atto unico). Verifica: ① nasce UNA riga `avvisi_dentista`
`da_comunicare` con i `campi_corretti` giusti · ② la scheda mostra il promemoria · ③ la striscia in
home lo mostra (ruolo ammesso) · ④ l'archivio in `clienti/[id]` mostra la riga **«Non ancora
comunicata»** (D357) col **numero del lavoro** (D356).
📸 **Scatti del blocco R1** (v. §3): scheda col promemoria · home con la striscia · archivio con la
riga aperta.

**R2 — la seconda riemissione (D354 dal vivo).** Correggi UN'ALTRA voce e riemetti. Verifica: ① le
righe aperte ora sono DUE (voci diverse) · ② la scheda mostra UN promemoria (il più vecchio) · ③ il
**portale** (link `wa.me` a parte, l'URL del portale sta nel token del cliente): la sezione «Avvisi
dal laboratorio» mostra **UNA card per il lavoro con l'UNIONE delle voci** e la dichiarazione
**ULTIMA** scaricabile · ④ dopo l'apertura del portale, `visto_dal_dentista_at` è scritto su
**ENTRAMBE** le righe (e un secondo accesso NON lo riscrive: rileggi i timestamp) · ⑤ una riga
`view_avviso` in `portale_accessi`.
📸 Portale con la card (390/768/1280, tema chiaro — il portale non ha tema scuro).

**R3 — la chiusura che chiude TUTTO (D354).** Dal foglio dell'avviso sulla scheda: chiudi con
**«l'ho avvisato di persona»** (a voce). Verifica: ① ENTRAMBE le righe passano a `comunicato_a_voce`
con **STESSI** `comunicato_at` e `comunicato_da`, `testo_inviato` NULL · ② il promemoria SPARISCE da
scheda e striscia · ③ l'archivio mostra le due righe chiuse («quando · come · chi», e lo stato di
visione: se il portale era stato aperto prima, la data di visione c'è).
📸 Foglio APERTO prima della chiusura (390/768/1280 × chiaro/scuro) · archivio DOPO (le righe chiuse).

**R4 — il secondo modo (dall'app), su un giro nuovo.** Correggi ancora una voce, riemetti (avviso
nuovo), e chiudi stavolta col percorso **WhatsApp** (il tasto apre `wa.me` — intercetta/lascia fallire
l'apertura esterna, ciò che conta è la conferma in app). Verifica: la riga è `comunicato_dall_app`
con `testo_inviato` = il testo mostrato (⚖️ D339), e il testo NON contiene il nome del paziente (GDPR).

## 3. Gli scatti (FASE 9 — e sono la base del gate L2 con Francesco)

**Cartella:** `docs/design/screenshots/2026-08-10-avviso-task10/` (nomi parlanti:
`scheda-promemoria-390-light.png`, ecc.).
- **App (scheda col promemoria · home con striscia · foglio aperto · archivio con righe):**
  390 · 768 · 1280 × **chiaro E scuro** = fino a 24 scatti app.
- **Portale (card avvisi):** 390 · 768 · 1280, solo chiaro.
- Gli scatti si fanno nei momenti giusti del giro (R1-R3): l'ordine sopra li segna con 📸.
- ⚠️ `prefers-reduced-motion` NON attivo negli scatti (le superfici v3 hanno molle: aspetta il riposo).

## 4. Il ripristino («rimetti il banco com'era e scrivi come»)

I dati sono di prova (§8 del CLAUDE.md), ma il mandato resta: riporta il lavoro allo stato di
partenza documentato al §1 e scrivi nel resoconto ESATTAMENTE cosa resta nel banco (righe avvisi
chiuse, dichiarazioni annullate + l'ultima emessa, righe di audit) e perché ciò che resta non
inquina le prove future. Segui il modello del giro precedente (`task-11-giro-report.md`). MAI
cancellare righe di registri (avvisi/audit/dichiarazioni): si documentano, non si cancellano.

## 5. Regole di casa

- 🛑 NIENTE push · `git add <percorsi>` (gli scatti SÌ, si committano) · R-E2 per ogni difetto.
- Il banco è CONDIVISO: durante il giro non lanciare la suite d'integrazione in parallelo.
- Se un passo non torna (una verifica fallisce): FERMATI lì, fotografa lo stato, riporta — non
  improvvisare correzioni.

## 6. Il resoconto

Completo in `.superpowers/sdd/avviso-dentista-task-10b-report.md`: la fixture e lo stato di partenza ·
ogni passo con la verifica in banca dati INCOLLATA · l'elenco degli scatti · il ripristino fatto e
ciò che resta · difetti riferiti. Poi rispondi con SOLO (max 15 righe): **Status** · commit degli
scatti (sha) · il giro in tre righe (R1-R4 esiti) · difetti trovati, se ci sono · percorso del resoconto.
