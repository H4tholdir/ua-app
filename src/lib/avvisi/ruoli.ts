// src/lib/avvisi/ruoli.ts
//
// CHI PUÒ CHIUDERE UN AVVISO AL DENTISTA, E CHI PUÒ VEDERLO — ⚖️ D342.
//
// 🔑 PERCHÉ QUESTO MODULO ESISTE, E PERCHÉ È UNA FOGLIA SENZA IMPORT.
//    L'elenco è nato dentro `src/app/api/lavori/[id]/avviso/route.ts` (Task 4) ed
//    è stato SPOSTATO qui dalla revisione del Task 6 — non ricopiato: nella rotta
//    resta una ri-esportazione, così chi lo importava da lì continua a trovarlo.
//    Il motivo è misurato e non estetico: `route.ts` è un file speciale di Next e
//    importa `getServiceClient`, che apre con `import 'server-only'`. Chiunque lo
//    importi come VALORE si trascina nel proprio grafo l'intero gestore della
//    rotta (`next/server`, csrf, `lab-guard`, il client di servizio), e da un
//    componente client il fagotto non compila nemmeno.
//    `provato:` (09/08/2026, Task 6) innestato l'import in `SchedaLavoroV3.tsx` e
//    lanciato `npx next build` → uscita `1`, «*'server-only' cannot be imported
//    from a Client Component module*», con la traccia `server-service.ts →
//    avviso/route.ts → SchedaLavoroV3.tsx [Client Component Browser]`.
//    ➡️ Qui dentro NON si importa niente, di proposito: questo modulo deve poter
//    essere letto dal server, dal browser e da una prova, senza condizioni.
//
// 📮 AL TASK 7 (la striscia della home): è QUESTO l'indirizzo. La striscia deve
//    mostrare il promemoria **agli stessi** ruoli, e «la visibilità è un
//    sottoinsieme del permesso» regge solo se i posti leggono un elenco solo.

/**
 * 🛑 **I TRE CHE POSSONO CHIUDERE UN AVVISO — ⚖️ D342, e i due esclusi lo sono
 * PER NOME.**
 *
 * **Allowlist, mai blocklist** (`CLAUDE.md` §9): si elencano i **tre ammessi**.
 * Un ruolo nuovo in banca dati nasce quindi **fuori**, e per entrare qualcuno
 * deve scriverlo qui — che è il verso giusto per un permesso.
 *
 * - **`tecnico` resta DENTRO** — ed è il ribaltamento della proposta che il Task
 *   4 aveva portato: escluderlo non protegge la prova, la **peggiora**. Se ha
 *   telefonato lui e non può registrarlo, registra un altro, e nella riga resta
 *   scritto un nome che non corrisponde al fatto: un'**attribuzione falsa**. E in
 *   un laboratorio di due persone il titolare *è* il tecnico — un cancello può
 *   lasciare **zero** persone in grado di adempiere.
 * - **`admin_rete` esce** perché sta sopra più laboratori e chiuderebbe l'obbligo
 *   di un laboratorio in cui non lavora.
 * - **`admin_sistema` esce** perché è personale UÀ: responsabile del trattamento
 *   che agisce su istruzione documentata (GDPR **Art. 28(3)(a)**), e **non era
 *   presente alla telefonata**.
 *
 * 🛑 **Il ruolo è una `string`, non un'unione: `tsc` NON protegge da un `'admin'`
 * nudo scritto per sbaglio**, e `admin` nudo **non esiste** in questo progetto.
 * Il refuso lo prende una **prova** che confronta questo elenco con i cinque
 * ruoli veri (`tests/unit/avvisi-ruoli.test.ts`), non il compilatore.
 * `provato:` il CHECK vivo, letto sul catalogo il 09/08/2026 —
 * `pg_get_constraintdef` di `utenti_ruolo_check` →
 * `CHECK ((ruolo = ANY (ARRAY['titolare','tecnico','front_desk','admin_rete','admin_sistema'])))`
 * e, con un valore che **deve** essere rifiutato (R-P1), `UPDATE … SET
 * ruolo='admin'` in transazione annullata → `❌ 23514 … violates check
 * constraint "utenti_ruolo_check"`.
 *
 * 🔑 **PERCHÉ `admin_sistema` STA IN QUESTA RIGA E NON SOLO NEL 403 DELLA ROTTA.**
 * `lab-context.ts:16` dice che *laboratorio nullo ⟹ `admin_sistema`*, **non** il
 * converso: non è provato che ogni `admin_sistema` abbia il laboratorio nullo, e
 * il banco **permette il contrario**. `provato:` in transazione annullata,
 * `UPDATE public.utenti SET laboratorio_id=(un laboratorio vero) WHERE
 * ruolo='admin_sistema'` → **`[2] UPDATE — 1 righe`, accettato** (l'altro
 * vincolo, `utenti_lab_required_for_non_admin`, chiede soltanto *`ruolo =
 * 'admin_sistema'` **OR** `laboratorio_id IS NOT NULL`*: è un'implicazione in una
 * direzione sola). ➡️ Il giorno in cui a quell'utente si valorizzasse il
 * laboratorio, il 403 di `!laboratorioId` **non scatterebbe più** e senza questa
 * riga passerebbe. Un cancello che si regge su un invariante mai misurato è la
 * classe di difetto che `CLAUDE.md` §9 nomina per prima.
 *
 * 📌 Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
 * **centoquarantottesima tornata**.
 */
export const RUOLI_CHIUSURA_AVVISO = ['titolare', 'tecnico', 'front_desk'] as const

/**
 * Può **chiudere** l'avviso? È il permesso, cioè la domanda che si fa la rotta
 * prima di scrivere.
 *
 * 🛑 **FAIL-CLOSED SENZA UN SECONDO RAMO.** Il tipo accetta `null` e `undefined`
 * perché i chiamanti veri li hanno davvero — `SchedaLavoroV3` riceve
 * `ruolo?: string | null` — ma non c'è nessun `if` in più a trattarli: un ruolo
 * assente, nuovo o scritto male semplicemente **non è nell'elenco**, e
 * `includes()` risponde `false` da sé. Un ramo dedicato sarebbe un posto in più
 * dove sbagliare il verso del confronto.
 */
export function puoChiudereAvviso(ruolo: string | null | undefined): boolean {
  return (RUOLI_CHIUSURA_AVVISO as readonly string[]).includes(ruolo ?? '')
}

/**
 * Può **vedere** il promemoria? È la domanda che si fa chi rende una schermata.
 *
 * 🔑 **DUE NOMI, E NON È UN DOPPIONE: SONO DUE DOMANDE DIVERSE CHE OGGI HANNO LA
 * STESSA RISPOSTA.** ⚖️ D342 lo dice per esteso — «*la visibilità è un
 * SOTTOINSIEME del permesso: nessuno vede un promemoria che non può chiudere.
 * **Non è un bicondizionale** — si può mostrare *meno* di ciò che si permette,
 * mai il contrario*». Un nome solo scriverebbe nel codice un bicondizionale che
 * la decisione nega, e il giorno in cui la visibilità dovesse restringersi
 * qualcuno la restringerebbe sul permesso — cioè chiudendo fuori dall'adempimento
 * qualcuno che invece deve adempiere.
 *
 * 🛑 **E IL SOTTOINSIEME È GARANTITO DALLA FORMA, non da una nota:** questa
 * funzione è *derivata* da `puoChiudereAvviso`, quindi non può diventare più
 * larga di lei per sbaglio. Restringerla, il giorno in cui servisse, vuol dire
 * aggiungere una condizione **qui** — mai togliere un nome dall'elenco.
 */
export function puoVedereAvviso(ruolo: string | null | undefined): boolean {
  return puoChiudereAvviso(ruolo)
}
