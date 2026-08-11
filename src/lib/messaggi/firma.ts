/**
 * LA FIRMA DI OGNI MESSAGGIO CHE L'APP PROPONE — ⚖️ **D345** (09/08/2026,
 * centoquarantanovesima tornata).
 *
 * > Francesco: «*ricorda che ogni messaggio che inviamo non deve essere firmato
 * > da UA lab, ma dal nome del laboratorio*»
 *
 * 🔑 **PERCHÉ È UN MODULO E NON DUE RIGHE COPIATE.** D345 dice «OGNI messaggio»,
 *    e i messaggi in casa nascono in **due moduli gemelli** già oggi
 *    (`src/lib/avvisi/messaggio.ts` e `src/lib/consegna/whatsapp-template.ts`),
 *    più i punti che compongono a mano. Due copie della stessa regola sono due
 *    elenchi che un giorno divergono: la stessa ragione per cui l'ordine dei
 *    campi corretti non si riordina due volte
 *    (`src/lib/avvisi/messaggio.ts`, blocco «L'ORDINE NON SI TOCCA»).
 *    ➡️ Chi scrive un messaggio nuovo importa da qui e non decide di nuovo né la
 *    forma del gallone né cosa fare quando il nome manca.
 *
 * 🛑 **IL NOME CHE MANCA NON DIVENTA UNA FIRMA FINTA, e la scelta è scritta.**
 *    Le alternative erano tre, e due sono peggio del difetto che D345 corregge:
 *    - `— undefined` / `— null` → un messaggio rotto sotto gli occhi di un
 *      dentista (è il caso che il mandato del Task 4-ter vieta per nome);
 *    - un gallone nudo (`—`) → dice che qualcosa si è rotto e non dice chi
 *      scrive;
 *    - il nome dello STRUMENTO («UÀ Lab») come ripiego → è esattamente ciò che
 *      D345 mette fuori legge, rimesso dentro dalla porta di servizio.
 *      📌 E la vecchia firma non si ricopia per intero nemmeno qui: la sentinella
 *      di `tests/unit/firma-messaggi-nome-laboratorio.test.ts` legge il sorgente
 *      e non distingue il codice dalla prosa — una guardia che si aggira
 *      spiegandole le proprie ragioni non è una guardia.
 *    ✅ Resta la quarta: **la riga della firma non c'è**. Il messaggio esce senza
 *    firma invece che con una firma falsa. **Non è un ripiego inventato oggi:**
 *    è già il comportamento del punto che in casa firmava correttamente da prima
 *    di D345 — `src/components/features/lavori/form/TabAccettazione.tsx:272`
 *    (`labNome ? \`— ${labNome}\` : ''` + `.filter(Boolean)`).
 *
 * ⚠️ **QUANTO È RAGGIUNGIBILE IL RAMO SENZA NOME.** `laboratori.nome` è
 *    **`NOT NULL`** sul catalogo (`src/types/database.types.ts`, riga `nome:
 *    string` — non `string | null`, a differenza di `ragione_sociale`). Quindi
 *    qui non si arriva con un dato mancante in banca dati: si arriva con una
 *    **lettura** che non ha portato l'incastro del laboratorio — ed è già il modo
 *    in cui `src/lib/consegna/orchestrate.ts` produce un gettone vuoto (`?? ''`).
 *    Un solo caso è legittimo per progetto: `admin_sistema` ha
 *    `laboratorio_id` **NULL**, quindi `LabContext.lab` è `null`
 *    (`src/lib/supabase/lab-context.ts:16,23`).
 *
 * 📌 **`undefined` è accettato nel tipo benché il catalogo non lo produca:** questi
 *    moduli stanno a valle di letture castate (`as unknown as {…}` sugli embed
 *    PostgREST), e un embed che manca dà `undefined`, non `null`. La difesa non
 *    può essere solo il tipo.
 *
 * 🛑 QUALE CAMPO È «IL NOME DEL LABORATORIO»: **`laboratori.nome`**, non
 *    `ragione_sociale`. Le ragioni stanno nel resoconto del Task 4-ter
 *    (`.superpowers/sdd/avviso-dentista-task-4ter-report.md` §②) e la prima è di
 *    tipo: `ragione_sociale` è **nullable**, quindi scegliere quello
 *    *garantirebbe* il ramo senza firma che questo modulo esiste per evitare.
 */

/**
 * La riga di firma pronta da accodare, oppure `null` se il nome non c'è.
 *
 * 🔑 Torna `null` e non `''`: chi compone deve poter **togliere anche la riga
 *    vuota** che sta sopra la firma. Con `''` il messaggio finirebbe con una
 *    riga vuota in coda — e le prove per intero di
 *    `tests/unit/firma-messaggi-nome-laboratorio.test.ts` lo vedono.
 * ⚠️ **`.filter(Boolean)` sulle righe di un messaggio è un difetto**, non una
 *    scorciatoia: le righe vuote di separazione sono volute e falsy. Si filtra
 *    `null`, o si accoda condizionalmente (l'idioma usato dai due gemelli).
 */
export function firmaMessaggio(nomeLaboratorio: string | null | undefined): string | null {
  const nome = nomeLaboratorio?.trim()
  return nome ? `— ${nome}` : null
}
