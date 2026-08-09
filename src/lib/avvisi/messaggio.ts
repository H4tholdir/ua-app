/**
 * IL TESTO PROPOSTO PER L'AVVISO AL DENTISTA, e i nomi leggibili delle voci
 * corrette. Due funzioni, e stanno **separate di proposito**: v. il confine più
 * sotto.
 *
 * ⚖️ D331 — quello che questo modulo produce è una **PROPOSTA**: l'odontotecnico
 *    la legge, la modifica se vuole, e **la manda lui**. Da qui non parte
 *    niente, e nessuna funzione di questo file conosce WhatsApp: il collegamento
 *    `wa.me` lo compone `buildWhatsappUrl`
 *    (`src/lib/consegna/whatsapp-template.ts:66-70`), che è anche l'unico posto
 *    dove il testo viene **codificato**. Qui si produce testo piano.
 * ⚖️ D334 — su WhatsApp **solo il fatto**; il dettaglio **solo** nel portale.
 * ⚖️ D336 — **il valore vecchio non si mostra mai**: nessuna funzione qui lo
 *    RICEVE, quindi non può mostrarlo. È una garanzia della firma, non una
 *    disciplina di chi scrive.
 * ⚖️ D339 — **si registra solo il testo mandato, la bozza non si conserva**: in
 *    questo modulo non c'è, e non ci va, nessuna funzione che salvi la proposta.
 *    Chi ha bisogno di conservare scrive `testo_inviato` dalla rotta (Task 4).
 *
 * 🛑 GDPR — i messaggi WhatsApp **non portano mai il nome del paziente**
 *    (`CLAUDE.md` §9). La difesa NON è la buona volontà di chi compone la
 *    stringa: è la **firma**, che non ha un parametro capace di portarlo. La
 *    prova sta in `tests/unit/avviso-messaggio.test.ts`, ed è una prova di
 *    TIPO (`@ts-expect-error`, verificata da `tsc --noEmit`): il giorno in cui
 *    quel parametro nascesse, il cancello si accende con `TS2578`.
 *    `provato:` firma allargata con `pazienteNome?: string` → `npx tsc --noEmit`
 *    → `tests/unit/avviso-messaggio.test.ts(84,1): error TS2578: Unused
 *    '@ts-expect-error' directive.` (09/08/2026)
 *
 * 📌 Gemello di `src/lib/consegna/whatsapp-template.ts`, e per la stessa
 *    ragione: là si annuncia una consegna, qui che la dichiarazione è stata
 *    rifatta. Le due forme si somigliano **perché è la stessa regola**.
 */
import type { CampoCorreggibile } from '@/lib/dichiarazione/correzioni'

/**
 * L'indirizzo pubblico dell'app.
 *
 * ⚠️ NON esiste in casa una fonte sola da cui prenderlo, e va detto invece di
 * lasciarlo credere: `provato:` `grep -rn "NEXT_PUBLIC_APP_URL" src` →
 * **7 punti**, tutti con questo stesso ripiego scritto a mano
 * (`api/rete/[id]/inviti:93` · `api/tecnici/invite:45` ·
 * `api/admin/labs/[id]/impersonate:25` · `api/admin/invite:54` ·
 * `api/stripe/portal:7` e `api/stripe/checkout:9` con `!` · `whatsapp-template.ts:22`
 * · `PortaleLinkButtons.tsx:151`). Il commento di `PortaleLinkButtons.tsx:145-149`
 * censisce lui stesso quei «sette punti»: la ripetizione è la convenzione di
 * casa, non una dimenticanza di oggi.
 * ➡️ Questa è l'ottava copia, e **unificarle è fuori dal mandato del Task 3**
 * (toccherebbe sette file e una prova): riferito, non corretto (R-E2).
 * 🔑 E il ripiego NON è cosmetico: è l'indirizzo che il dentista riceve. Il
 * precedente pagato è P18 — con `window.location.origin` il collegamento
 * portava l'origine da cui il laboratorio stava navigando, e dallo studio del
 * dentista quell'indirizzo **non esiste**
 * (`tests/unit/PortaleLinkButtons-indirizzo.test.tsx`).
 */
function indirizzoApp(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://uachelab.com'
}

/** La firma della PWA nei messaggi al dentista, uguale al gemello. Non è il nome
 *  del laboratorio: quello è un dato del cliente e non ci va. */
const MITTENTE = '— UÀ Lab'

/**
 * Il fatto: «la dichiarazione di quel lavoro è stata rifatta», più il
 * collegamento al portale dove sta quella nuova.
 *
 * 🛑 «LA DICHIARAZIONE», e mai «DdC» né «dichiarazione di conformità» né
 *    «certificato» (`CLAUDE.md` §6): per i dispositivi **su misura** quel nome è
 *    improprio — l'Art. 10(6) MDR riserva la *dichiarazione di conformità UE* ai
 *    dispositivi diversi dai su misura, e MDCG 2021-3 Q9 dice che i su misura
 *    sono accompagnati, «*in place of a declaration of conformity*», da una
 *    dichiarazione ex **Allegato XIII**. Ogni testo NUOVO usa il nome corretto,
 *    e questo è un testo nuovo che finisce **sotto gli occhi di un dentista**.
 *    Sorvegliato da una prova, non da questo commento.
 *
 * 🔑 DUE SOLI DATI, ED È IL PUNTO: il numero del lavoro e il gettone del
 *    portale. Nient'altro entra, perché nient'altro può entrare — la firma è la
 *    difesa (v. l'intestazione del file). ⚠️ Il numero del lavoro **non è** un
 *    dato del paziente: è il riferimento con cui il dentista e il laboratorio si
 *    parlano già oggi, ed è lo stesso che il gemello manda alla consegna.
 *
 * 🔴 IL RAMO SENZA GETTONE È PORTANTE, e il piano non l'aveva. Senza, il testo
 *    proposto conterrebbe «…/portale/» — un indirizzo che non porta da nessuna
 *    parte, mandato a un dentista. Il gemello ha lo stesso ramo per la stessa
 *    ragione (`whatsapp-template.ts:14-20`).
 *    ⚠️ È RAGGIUNGIBILE: `clienti.portale_token` è `NOT NULL DEFAULT
 *    gen_random_uuid()` (misurato su `information_schema`), ma il valore arriva
 *    qui da una **lettura**, e `src/lib/consegna/orchestrate.ts:131` fa già
 *    `?? ''` quando l'embed del cliente manca dalla `select`.
 *    📌 Resta il fatto che un avviso senza collegamento è **metà** di ⚖️ D332
 *    («l'avviso vive nel portale, WhatsApp è la spinta»): la spinta parte, il
 *    posto dove guardare no. Non si risolve qui — lanciare trasformerebbe un
 *    dato mancante in un guasto sul promemoria che il laboratorio sta provando a
 *    chiudere. **Riferito** al Task 5, che ha il contesto per chiedere di
 *    rigenerare il gettone prima di proporre il testo.
 */
export function buildAvvisoMessage({
  numeroLavoro,
  portalToken,
}: {
  numeroLavoro: string
  portalToken: string
}): string {
  const fatto = `📄 La dichiarazione del lavoro #${numeroLavoro} è stata rifatta.`

  if (!portalToken) return [fatto, ``, MITTENTE].join('\n')

  return [fatto, ``, `Trovi quella aggiornata qui:`, `${indirizzoApp()}/portale/${portalToken}`, ``, MITTENTE].join(
    '\n'
  )
}

/**
 * I nomi leggibili delle sei voci correggibili del documento.
 *
 * 🛑 `Record` COMPLETO DI PROPOSITO, e la chiave è `CampoCorreggibile` — non
 *    `string`. È la sola difesa che si accende **da sola**: il giorno in cui
 *    `CAMPI_CORREGGIBILI_DOCUMENTO` guadagna una settima voce, `tsc` si accende
 *    QUI invece di lasciare una descrizione vuota sotto gli occhi di un
 *    dentista. Con `Record<string, string>` non si accenderebbe niente.
 *
 * ⚖️ D336 — QUESTE SONO DESCRIZIONI DEL **FATTO**, mai del valore: «la
 *    descrizione», non «la descrizione: era X». Il valore vecchio non entra in
 *    questo modulo da nessuna porta.
 */
const NOME_CAMPO: Record<CampoCorreggibile, string> = {
  richiedente_nome: 'il nome del dentista che ha prescritto',
  paziente_id: 'il paziente',
  tipo_dispositivo: 'il tipo di lavorazione',
  descrizione: 'la descrizione',
  denti_coinvolti: 'i denti indicati',
  prescrizione_caratteristiche: 'le caratteristiche prescritte',
}

/**
 * 🛑 IL RIPIEGO PER UN NOME CHE NON È PIÙ FRA LE SEI. Non è pessimismo: è già
 * successo **due volte in un giorno** — `numero_prescrizione` è uscito con ⚖️
 * D319 e `paziente_nome_snapshot` con ⚖️ D320 (08/08/2026), entrambi per ragione
 * normativa.
 *
 * 🔑 E LA COLONNA È SENZA `CHECK` **PER SCELTA** (revisione del Task 2 §5): un
 * `CHECK` con le sei voci di oggi romperebbe la storia — il giorno in cui cade
 * la settima, ogni aggiornamento di un avviso vecchio che la nomina
 * fallirebbe, **compreso quello che lo segna come comunicato**. Un registro
 * dell'Art. 19 GDPR deve continuare a dire cosa fu corretto *allora*.
 * ➡️ Quindi `campi_corretti` è, per progetto, un elenco che può contenere nomi
 * che oggi non sono più voci del documento. Questa costante è ciò che rende
 * quella scelta sostenibile a schermo.
 *
 * ⚠️ SI RIPIEGA, NON SI SCARTA. Lo scarto muto è il difetto di
 * `src/app/api/lavori/[id]/route.ts:259-264` — l'utente legge «Salvato» su un
 * dato che non c'è — e qui costerebbe di più: togliere una voce
 * **sotto-dichiarerebbe** al dentista quante cose sono state corrette, su un
 * registro che esiste per provare cosa gli è stato comunicato.
 */
const CAMPO_NON_PIU_PREVISTO = 'una voce del documento'

/**
 * Traduce i nomi tecnici di `avvisi_dentista.campi_corretti` in frasi che un
 * dentista legge — **nel PORTALE** (⚖️ D334), mai su WhatsApp.
 *
 * 🛑 `readonly string[]` E NON `readonly CampoCorreggibile[]`, benché il piano
 *    chiedesse il secondo. Il dato arriva da `avvisi_dentista.campi_corretti`,
 *    che `src/types/database.types.ts:161` tipizza — correttamente — `string[]`.
 *    Con la firma stretta il chiamante avrebbe dovuto **forzare il tipo**, e un
 *    cast è esattamente il punto in cui una bugia entra: `NOME_CAMPO[c]`
 *    restituirebbe `undefined` dentro uno `string[]` dichiarato, e a schermo si
 *    leggerebbe «undefined». Il precedente in casa è
 *    `src/lib/avvisi/stati.ts:22-29` (`isStatoAvviso`), col suo commento: al
 *    confine con l'esterno un tipo è «una promessa e non un fatto».
 *    🔑 La difesa a compilazione NON si perde: vive nel `Record`, che resta
 *    chiuso su `CampoCorreggibile`.
 *
 * 📌 L'ORDINE NON SI TOCCA. Lo ha già deciso la RPC, che scrive
 *    `ARRAY(SELECT k FROM jsonb_object_keys(v_correzioni) AS k ORDER BY k)` —
 *    e quell'`ORDER BY` c'è perché `jsonb` tiene le chiavi ordinate per
 *    lunghezza (revisione del Task 2 §2). Riordinare qui sarebbe una **seconda**
 *    regola sulla stessa cosa, cioè due elenchi che un giorno divergono.
 *
 * 📌 Elenco vuoto → elenco vuoto. `campi_corretti` è `text[] NOT NULL DEFAULT
 *    '{}'`, ma dal contratto pubblico **non è raggiungibile vuoto**: la rotta
 *    rifiuta `correzioni: {}` (`correzioni.ts:189-191`) e chi vuole solo rifare
 *    la carta omette la chiave, prendendo l'altra RPC — `riemetti_ddc_atomica`,
 *    che non crea nessun avviso
 *    (`src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts:195-200`).
 *    Come si renda un elenco vuoto è una decisione del Task 8, non di qui.
 *
 * 🛑 IL CONFINE COL TESTO DI WHATSAPP, E PERCHÉ È SCRITTO QUI.
 *    `buildAvvisoMessage` **non chiama questa funzione**, e non deve: dire a un
 *    dentista su WhatsApp che «è cambiato il paziente» è un dettaglio clinico su
 *    un canale non protetto, e ⚖️ D334 lo vieta anche quando non c'è nessun
 *    nome. Il confine è fissato da una prova che deriva le stringhe vietate da
 *    `CAMPI_CORREGGIBILI_DOCUMENTO` — così una settima voce entra da sola nella
 *    sorveglianza (`tests/unit/avviso-messaggio.test.ts`, blocco «IL CONFINE»).
 */
export function descriviCampiCorretti(campi: readonly string[]): string[] {
  return campi.map((c) => NOME_CAMPO[c as CampoCorreggibile] ?? CAMPO_NON_PIU_PREVISTO)
}
