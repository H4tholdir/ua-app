# Task 9-ter — LE TRE DECISIONI DI CONTENUTO (⚖️ D356 · D357 · D358, tornata 154)

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` (già attivo — MAI worktree)
**Nasce da:** verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
centocinquantaquattresima tornata (10/08/2026, 11:09). **BASE:** `1a1bf42b`. **Zero migration.**

Tre modifiche piccole, decise da Francesco stamattina. Ognuna chiude un rilievo a ledger.

---

## 1. ⚖️ D356 — l'archivio porta IL NUMERO DEL LAVORO su ogni riga (chiude M-T9-2)

**Dove:** la sezione «Comunicazioni» di `src/app/(app)/clienti/[id]/page.tsx` + `src/lib/avvisi/archivio.ts`.
`RigaArchivioCliente.lavoroId` è GIÀ popolato (`archivio.ts:141` e `:229`) ma mai letto: è il tuo aggancio.
- Si **autorizza una lettura di supporto** per `numero_lavoro`, sul modello di `nomiComunicatori`
  (stesso file: lettura batch per id, gestione errori identica — log + fallback, mai un crash).
  Il vincolo «nessuna query nuova sulla tabella avvisi» resta intatto: la lettura è su `lavori`.
- `provato:` `database.types.ts:2688` — sulla tabella `lavori` il tipo è `numero_lavoro: string`,
  non nullabile (la riga nullabile a 6219 è una VISTA: non usarla). ⚠️ Verifica comunque sul tipo la
  forma esatta della select che scrivi.
- Il formato a schermo: coerente con come la pagina/il resto dell'app mostra i numeri di lavoro
  (guarda un uso esistente e citalo nel resoconto — non inventare un formato nuovo).
- Se il lavoro non si risolve (id orfano, lettura fallita): la riga si mostra SENZA numero, mai un
  crash, e il caso è provato.

## 2. ⚖️ D357 — la riga ANCORA APERTA dice «Non ancora comunicata» (chiude M-T9-3)

**Dove:** il testo oggi vive nel render (`page.tsx`, `RigaComunicazione`, ~riga 185: quando
`vistoLabel` è `null` stampa sempre «Non ancora vista dal dentista»).
- Su una riga con promemoria ANCORA APERTO (`riga.chiuso === false` — il campo esiste già): il testo è
  **«Non ancora comunicata»**.
- Su una riga CHIUSA ma non vista: resta «Non ancora vista dal dentista».
- Su una riga vista: resta la data di visione com'è oggi.
- ⚖️ D337 regge: NESSUN cambio di colore/stile fra i tre casi — cambia solo la parola.
- Le tre forme si provano separatamente (aperta / chiusa-non-vista / vista).

## 3. ⚖️ D358 — il foglio senza nome paziente usa LA FRASE COL NUMERO DEL LAVORO (chiude M-T6-1)

**Dove:** il foglio dell'avviso nella scheda v3 (`src/components/features/lavori/scheda-v3/AvvisoDentista.tsx`
e/o dove la frase è composta — trovalo e cita le righe nel resoconto). Oggi, senza
`paziente_nome_snapshot`, stampa «Hai rifatto la dichiarazione di —».
- Col nome presente: **NON cambia NIENTE** (frase attuale identica, provato).
- Senza nome: la frase diventa quella col numero del lavoro — es. «Hai rifatto la dichiarazione del
  lavoro #2026/0042» (adatta l'articolo/preposizione alla frase vera che trovi nel codice; il numero
  arriva dal dato già presente nel componente — verifica sul tipo come si chiama).
- 🛑 Questo è il FOGLIO a schermo, NON il messaggio WhatsApp: `buildAvvisoMessage` e il testo inviato
  NON si toccano (GDPR: il messaggio non porta mai il nome — già così, non è affar tuo).
- La superficie è **DS v3**: niente valori inline nuovi; se tocchi solo il testo, non tocchi lo stile.
- Prova per entrambe le forme (con nome / senza nome), e la prova «senza nome» deve fallire contro il
  codice di oggi (RED vero).

## Regole di casa (vincolanti)

- Directory `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app`, ramo attivo.
- TDD RED→GREEN per ciascuna delle tre; dopo il primo rosso, conteggio `N su M` sull'abbozzo inerte
  dove ha senso (per modifiche di testo puro basta il RED vero contro il codice attuale, dichiarato).
- FASE 7 prima del commit: `npx tsc --noEmit` · `npx vitest run` · `npx next build`.
- 🛑 `git status` PRIMA · `git add <percorsi>`, MAI `-A` · **NIENTE push** · un difetto fuori mandato
  si RIFERISCE (R-E2).
- D336 regge ovunque: mai un valore vecchio a schermo.
- Commit: `feat(avvisi): …` (uno solo va bene, o uno per decisione — a tua scelta, dichiarata).

## Il resoconto

Completo in `.superpowers/sdd/avviso-dentista-task-9ter-report.md` (per ognuna delle tre: dove viveva
il testo/dato, cosa hai cambiato, RED/GREEN). Poi rispondi con SOLO (max 12 righe): **Status** ·
commit · una riga sui test · riserve · percorso del resoconto.
