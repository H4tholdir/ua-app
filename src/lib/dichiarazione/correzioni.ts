import { testoVivo } from '@/lib/utils/testo'
import { validaDenti, type DenteNormalizzato } from '@/lib/domain/denti-validazione'
import { normalizzaContenuto } from '@/lib/domain/prescrizione-mapper'
import type { LavoroDettaglio, Paziente } from '@/types/domain'

/**
 * LE SEI VOCI CORREGGIBILI DEL DOCUMENTO — Task C dell'ondata «correggi e
 * rifai la dichiarazione».
 *
 * 🛑 NON SONO «i campi di `lavori`», e la differenza è tutto il modulo. Una
 * penna generica sul lavoro nascerebbe senza le ~200 righe di regole che la
 * PATCH conosce (colore di caso, tinta risolta, sentinelle, blocco fiscale
 * D308) — cioè una SECONDA penna che diverge in silenzio dalla prima. Qui si
 * correggono le voci che il DOCUMENTO stampa, e sono quelle e basta.
 *
 * ⚖️ UN NOME, UNA RIGA — SEI NOMI PER SEI VOCI A SCHERMO, dalla D320
 * (08/08/2026). Fino a ieri i nomi erano sette perché il paziente si poteva
 * correggere in DUE modi; da oggi il modo è uno solo, e l'altro ha una
 * destinazione scritta:
 *   · **ho sbagliato PERSONA** → `paziente_id`, che punta a un'altra
 *     anagrafica. **Resta qui**, ed è una voce del documento.
 *   · **il NOME è scritto male** → 🛑 **NON si corregge da qui.** Si corregge
 *     **dove il nome vive**, cioè in anagrafica: `PATCH /api/pazienti/[id]`
 *     (`nome`/`cognome`), la via scritta per l'**Art. 16 GDPR**, a schermo
 *     `PazienteEditSheet` su `/pazienti/[id]`.
 * 🔑 IL MOTIVO TECNICO, ed è tutta la decisione: `generate-ddc.ts:304` legge
 * `paziente_nome_snapshot ?? paziente?.nome_cognome ?? paziente?.codice_paziente`.
 * **Lo snapshot VINCE.** Scriverlo da qui congelerebbe su quel lavoro un nome
 * che l'anagrafica non governa più: ogni correzione futura in anagrafica **non
 * arriverebbe** su quel documento — l'opposto di «*e poi tutto si deve
 * aggiornare di conseguenza*», che è la frase con cui la decisione è nata.
 * ⚠️ E UN CONTRATTO SI GIUDICA PER CIÒ CHE PERMETTE, non per ciò che oggi gli
 * si chiede: nessuna schermata manda quella chiave (`DevoIntervenire.tsx` non
 * la nomina), ma finché la porta è aperta l'unica cosa che la tiene chiusa è
 * una schermata.
 * 📌 LA COLONNA NON SI CANCELLA e i suoi lettori restano tutti (il generatore,
 * il precheck MDR, l'etichetta, il buono, la ricevuta, il portale, l'agenda,
 * la ricerca a testo pieno): D320 chiude **una penna**, non uccide il dato.
 *
 * ⚖️ ERANO OTTO PER SETTE FINO A D319 (08/08/2026): `numero_prescrizione` è
 * uscito da questo elenco, e la ragione è normativa, non di prodotto. Sulla
 * prescrizione l'**Allegato XIII punto 1** chiede DUE cose — «il nome della
 * persona che ha prescritto il dispositivo… e, se del caso, il nome
 * dell'istituzione sanitaria» e «le caratteristiche specifiche del prodotto
 * indicate nella prescrizione». **Un numero non compare fra gli otto trattini:**
 * non è un contenuto dovuto, quindi non sta sul documento e non c'è niente da
 * correggere. Le sei voci rimaste sono tutte e sei dovute dall'Allegato XIII.
 * 🛑 E ciò che serviva davvero — ritrovare la prescrizione di carta — è già il
 * mestiere di `fonte_tipo`/`fonte_riferimento` (ondata B): il numero sarebbe
 * stato un secondo modo di fare la stessa cosa.
 *
 * 📌 L'elenco è lo stesso della RPC (`c_su_lavori || c_su_penne`). Sono due
 * scritture della stessa verità e si guardano in faccia in
 * `tests/unit/correzioni-documento.test.ts`: la RPC resta la penna, questo è
 * il filtro che sta DAVANTI al render — e il davanti conta, perché il PDF si
 * costruisce e si carica PRIMA della transazione.
 */
export const CAMPI_CORREGGIBILI_DOCUMENTO = [
  'richiedente_nome',
  'paziente_id',
  'tipo_dispositivo',
  'descrizione',
  'denti_coinvolti',
  'prescrizione_caratteristiche',
] as const

export type CampoCorreggibile = (typeof CAMPI_CORREGGIBILI_DOCUMENTO)[number]

/** Le tre voci che sono TESTO su `lavori`. `paziente_id` non è fra queste:
 *  è un identificativo, e ha la sua forma.
 *  ⚖️ Erano CINQUE fino a D319 (`numero_prescrizione`) e QUATTRO fino a D320
 *  (`paziente_nome_snapshot`): ogni nome è uscito di qui insieme all'allowlist
 *  sopra — un nome tolto da un elenco e lasciato nell'altro sarebbe un tipo
 *  dichiarato che non esiste più (e `tsc` lo direbbe subito). */
const CAMPI_TESTO: readonly CampoCorreggibile[] = [
  'richiedente_nome',
  'tipo_dispositivo',
  'descrizione',
]

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export type Correzioni = Partial<Record<CampoCorreggibile, unknown>>

/** L'esito è un DATO, non un `Response`: questo modulo non conosce Next. È la
 *  rotta a trasformarlo in 422, come fa `denti-validazione.ts`. */
export type EsitoValidazioneCorrezioni =
  | { ok: true; correzioni: Correzioni }
  | { ok: false; errore: string; valore?: unknown }

/**
 * 🛑 LA REGOLA SOLA — C2. «Una correzione vuota non è una correzione.»
 *
 * 🔑 Il fatto che l'ha generata, misurato dalla revisione del Task B: una sola
 * chiamata con `denti_coinvolti: []`, `paziente_id: null` e stringhe vuote su
 * `descrizione`, `richiedente_nome` e `paziente_nome_snapshot` è tornata
 * `esito: ok` e ha **svuotato tutti e cinque i campi**. Il database accetta il
 * vuoto: per lui `''` è un valore come un altro.
 * 📌 La storia di una misura non si riscrive — ma da ⚖️ D320 quella chiave
 * **non è più accettata affatto**: `{paziente_nome_snapshot: ''}` oggi non
 * arriva nemmeno a questa regola, perché il controllo delle chiavi ignote sta
 * PRIMA (v. `validaCorrezioni`) e risponde «da qui non si corregge».
 *
 * ⚠️ E il precedente già pagato è D242: uno snapshot **vuoto** vince sul nome
 * vivo (`generate-ddc.ts:304` ripiega con `??`, che conosce solo `null`) e
 * stampa **un'identificazione paziente assente** su un documento di legge.
 * 🛑 D320 chiude quella porta **all'allowlist, non nel generatore**: il
 * ripiego di `generate-ddc.ts:304` resta esattamente com'è, e con lui il
 * pericolo per chiunque scriva quella colonna da un'altra strada.
 *
 * 📌 UNA regola e non tre casi speciali: è la stessa idea di «vuoto» per un
 * testo, per un elenco e per un oggetto — non dice niente. Il vuoto dei testi
 * lo decide `testoVivo`, che è già la regola di casa e non si ricopia qui.
 *
 * 🔴 E DA OGGI VALE IN PROFONDITÀ — C3, Task C-quater (08/08/2026). La regola
 * c'era ed era giusta, ma si fermava al PRIMO livello, e un livello sotto
 * cancellava un contenuto obbligatorio del documento. Misurata dalla revisione
 * anello per anello: `prescrizione_caratteristiche: {colore: ''}` passava con
 * `ok: true`; sul documento la caratteristica **spariva**
 * (`caratteristichePrescritte` scarta i valori vuoti, e la riga del modello è
 * condizionale — con la sola caratteristica corretta a vuoto **la voce 6
 * dell'Allegato XIII non compariva affatto**, cioè D295 di nuovo); e la penna
 * scriveva `""` sulla riga vera rispondendo `ok`, perché
 * `lavoro_prescrizione_correggi_typo` valida **il nome del campo e mai il
 * valore**. Esito finale: HTTP 200 «rifatta», e il dato buono perso da tutt'e
 * due le parti.
 *
 * 🔑 L'ESTENSIONE È DELLA STESSA REGOLA, non un caso speciale per la
 * prescrizione: un oggetto qui è una **mappa di correzioni** — la penna scrive
 * ogni sotto-chiave per conto suo (`jsonb_set` una alla volta) — quindi non
 * dice niente se è vuoto **oppure se anche UNA SOLA delle sue voci non dice
 * niente**. Basta una: quella voce verrebbe scritta vuota, e il resto passerebbe
 * con lei.
 *
 * ⚠️ E si scende SOLO dentro gli oggetti, mai dentro gli array. Un array non è
 * una mappa di correzioni: è **un** valore (i denti sono una lista sola, che si
 * sostituisce intera). Chi ci sta dentro lo validano `validaDenti` e
 * `normalizzaContenuto`, che hanno le loro allowlist e i loro ripieghi
 * legittimi — `{fdi: 22, scala: null}` è un dente **senza colore**, non un
 * dente vuoto. Scenderci qui rifiuterebbe carichi che quelle porte accettano.
 */
function primoVuoto(v: unknown, percorso: string): string | null {
  if (v === null || v === undefined) return percorso
  if (typeof v === 'string') return testoVivo(v) === null ? percorso : null
  if (Array.isArray(v)) return v.length === 0 ? percorso : null
  if (typeof v === 'object') {
    const voci = Object.entries(v as Record<string, unknown>)
    if (voci.length === 0) return percorso
    for (const [k, sotto] of voci) {
      // Il PERCORSO e non un `true`: «colore» dentro le caratteristiche non è
      // «le caratteristiche», e chi sta al banco deve sapere quale casella ha
      // svuotato.
      const dove = primoVuoto(sotto, `${percorso}.${k}`)
      if (dove !== null) return dove
    }
    return null
  }
  return null
}

const ELENCO_AMMESSE = CAMPI_CORREGGIBILI_DOCUMENTO.join(', ')

/**
 * Legge le correzioni che arrivano dal corpo della richiesta e le restituisce
 * NORMALIZZATE, cioè nella forma che il contratto SQL si aspetta.
 *
 * 🔑 PERCHÉ QUI E NON SOLO NELLA RPC, benché la RPC controlli le stesse cose:
 * il PDF si rende e si carica **prima** della transazione (scelta dichiarata in
 * `generate-ddc.ts:457-460` — è ciò che permette alla transazione di esistere).
 * Un rifiuto che arriva dal database costa quindi **un file orfano su Storage e
 * un progressivo bruciato**, e un messaggio scritto per chi legge i log invece
 * che per chi sta al banco. Questa è la rete davanti; la RPC resta la penna.
 */
export function validaCorrezioni(grezzo: unknown): EsitoValidazioneCorrezioni {
  if (grezzo === null || typeof grezzo !== 'object' || Array.isArray(grezzo)) {
    return {
      ok: false,
      errore: `Le correzioni devono essere un elenco di voci da correggere (si correggono: ${ELENCO_AMMESSE}).`,
      valore: grezzo,
    }
  }

  const corpo = grezzo as Record<string, unknown>
  const chiavi = Object.keys(corpo)

  // ⚠️ `{}` mandato apposta è una richiesta che non chiede niente. Chi vuole
  //    solo RIFARE la carta omette la chiave `correzioni`: quella strada resta
  //    aperta ed è l'altra metà di questa regola.
  if (chiavi.length === 0) {
    return { ok: false, errore: 'Non hai corretto nessuna voce: indica almeno una cosa da correggere.' }
  }

  const ignote = chiavi.filter((k) => !(CAMPI_CORREGGIBILI_DOCUMENTO as readonly string[]).includes(k)).sort()
  if (ignote.length > 0) {
    // 🛑 Si RIFIUTA, non si scarta in silenzio: lo scarto muto è
    //    `route.ts:259-264`, dove l'utente legge «Salvato» su un dato che non
    //    c'è. Su una carta a valore legale non si fa.
    return {
      ok: false,
      errore: `Da qui non si corregge ${ignote.map((k) => `«${k}»`).join(', ')} (si correggono: ${ELENCO_AMMESSE}).`,
      valore: ignote,
    }
  }

  for (const k of chiavi) {
    const dove = primoVuoto(corpo[k], k)
    if (dove !== null) {
      return {
        ok: false,
        errore: `La correzione di «${dove}» è vuota: un campo svuotato finirebbe sul documento come un'informazione mancante.`,
        valore: corpo[k],
      }
    }
  }

  const correzioni: Correzioni = {}

  for (const k of CAMPI_TESTO) {
    if (!(k in corpo)) continue
    const v = corpo[k]
    if (typeof v !== 'string') {
      return { ok: false, errore: `«${k}» dev'essere un testo.`, valore: v }
    }
    // Ripulito ai bordi, come ogni testo che entra da un corpo di richiesta
    // (D242): chi scrive di fretta al banco lascia uno spazio, e uno spazio non
    // è un dato diverso.
    correzioni[k] = testoVivo(v)
  }

  if ('paziente_id' in corpo) {
    const v = corpo.paziente_id
    if (typeof v !== 'string' || !UUID_RE.test(v.trim())) {
      // Senza questa riga il database riceve `(… ->> 'paziente_id')::uuid` e
      // risponde `22P02`, cioè un 500 illeggibile invece di un «controlla il
      // paziente che hai scelto».
      return { ok: false, errore: 'Il paziente indicato non è valido.', valore: v }
    }
    correzioni.paziente_id = v.trim()
  }

  if ('denti_coinvolti' in corpo) {
    // 🔑 LA VALIDAZIONE DEI DENTI È UNA SOLA, e vive già in `lib/domain`: la
    //    chiamano la sostituzione (`PUT …/denti`) e la creazione
    //    (`POST /api/lavori`). Questa è la terza porta e usa la stessa, così
    //    non nasce un terzo elenco di regole che si aggiorna per conto suo.
    // ⚠️ Il carico che il contratto vuole è quello della PENNA — oggetti
    //    `{fdi, ruolo, …}` — NON il valore della colonna denormalizzata: la
    //    chiave si chiama come la colonna e invita all'errore.
    const esito = validaDenti(corpo.denti_coinvolti)
    if (!esito.ok) {
      return {
        ok: false,
        errore: `I denti indicati non vanno bene: ${esito.errore}. Servono le voci complete dei denti, non i soli numeri.`,
        valore: esito.valore,
      }
    }
    correzioni.denti_coinvolti = esito.denti
  }

  if ('prescrizione_caratteristiche' in corpo) {
    const v = corpo.prescrizione_caratteristiche
    if (v === null || typeof v !== 'object' || Array.isArray(v)) {
      return { ok: false, errore: 'Le caratteristiche prescritte devono essere un elenco di voci.', valore: v }
    }
    // 🛑 CAPACITÀ CHE QUESTA PORTA DECLINA, DICHIARATA (C3, 08/08/2026): la
    //    penna sa CANCELLARE una sotto-chiave (`lavoro_prescrizione_correggi_typo`
    //    fa `contenuto - p_campo` quando il valore è `null`), ma da qui
    //    `{colore: null}` è **rifiutato** come vuoto, insieme a `''`.
    //    Il motivo è lo stesso della regola sul vuoto: la voce 6 dell'Allegato
    //    XIII è un contenuto obbligatorio, e toglierle una caratteristica la fa
    //    sparire dal documento. Fail-closed.
    // ➡️ CONSEGUENZA PER IL TASK D, che va scritta nel suo brief e non qui:
    //    a schermo «svuota il colore» prende 422 — cancellare una
    //    caratteristica NON è raggiungibile da questa strada. Se un giorno
    //    servirà, è una decisione a sé, non un allargamento silenzioso.
    // 🔑 L'ALLOWLIST DELLE SOTTO-CHIAVI NON SI RICOPIA: la si fa applicare
    //    dalla stessa funzione che normalizza il contenuto letto dal database
    //    (`normalizzaContenuto`), che scarta ciò che non riconosce. Se scarta
    //    qualcosa, quel qualcosa non sarebbe arrivato sul documento — e a
    //    quel punto è un rifiuto, non uno scarto muto.
    // 🛑 Perché QUI e non alla penna: la penna risponde `campo_non_valido`
    //    DOPO l'annullo, e il contratto trasforma quella risposta in
    //    un'eccezione — cioè un 500 dove c'era un refuso del chiamante.
    const tenute = normalizzaContenuto(v)
    const scartate = Object.keys(v as object).filter((k) => !(k in tenute))
    if (scartate.length > 0) {
      return {
        ok: false,
        errore: `Delle caratteristiche prescritte non si corregge ${scartate.map((k) => `«${k}»`).join(', ')}: si correggono elementi, colore e tipo.`,
        valore: scartate,
      }
    }
    // 🔑 E LE SOTTO-CHIAVI SI RIPULISCONO AI BORDI come i TRE testi di primo
    //    livello (D242, C3): chi scrive di fretta al banco lascia uno spazio, e
    //    uno spazio non è un colore diverso. Prima di questa riga `'  A3  '`
    //    arrivava sulla riga vera **con dentro i suoi spazi**, mentre lo stesso
    //    testo su `descrizione` arrivava pulito — due regole per la stessa cosa.
    // ⚠️ Il vuoto è già stato rifiutato sopra, quindi `testoVivo` non può
    //    tornare `null` qui: il `?? sv` è la rete, non il caso previsto.
    // 📌 Si scorre ciò che `normalizzaContenuto` ha TENUTO, senza nominare
    //    `colore` e `tipo` a mano: l'elenco delle sotto-chiavi resta uno solo.
    const ripulite = tenute as Record<string, unknown>
    for (const [sottoChiave, valore] of Object.entries(ripulite)) {
      if (typeof valore === 'string') ripulite[sottoChiave] = testoVivo(valore) ?? valore
    }
    correzioni.prescrizione_caratteristiche = tenute
  }

  return { ok: true, correzioni }
}

/**
 * Fonde le correzioni nel lavoro **in memoria**, e restituisce una copia.
 *
 * 🛑 PERCHÉ IN MEMORIA, E PERCHÉ PRIMA. Il documento si costruisce e si carica
 * su Storage **prima** che la transazione cominci: se le correzioni entrassero
 * solo nella RPC, la carta nuova ristamperebbe **l'errore che si sta
 * correggendo**, e la riga in banca dati direbbe una cosa diversa dal file. Le
 * due metà vanno tenute insieme, e il punto di giuntura è questa funzione.
 *
 * 🔴 `pazienteNuovo` NON è un lusso: `generate-ddc.ts:304` ripiega su
 * `lavoro.paziente?.nome_cognome` quando lo snapshot è nullo. Correggere il
 * solo `paziente_id` e lasciare l'embed stantìo scriverebbe sul documento il
 * nome della persona **sbagliata**, mentre la riga punta a quella giusta.
 *
 * ⚠️ LIMITE DICHIARATO DA ⚖️ D320, e va detto qui perché è dove si vede: il
 * ripiego funziona **quando lo snapshot è nullo**, cioè su 298 lavori su 299
 * (misurato l'08/08/2026). Sul lavoro che uno snapshot ce l'ha, correggere
 * `paziente_id` cambia la riga e l'embed, ma il documento continua a stampare
 * **lo snapshot vecchio**, che vince a `generate-ddc.ts:304` — e da D320 quello
 * snapshot non è più correggibile da nessuna strada. Non è una regressione
 * (nessuna schermata mandava quella chiave): è una **riparazione che il foglio
 * non potrà offrire**, e se vada tolto il ripiego è una decisione a sé.
 */
export function fondiCorrezioni(
  lavoro: LavoroDettaglio,
  correzioni: Correzioni,
  pazienteNuovo?: Paziente | null
): LavoroDettaglio {
  // Vista non tipizzata sulla COPIA: le SEI chiavi sono nomi che arrivano da
  // fuori, e forzarne una per una il tipo esatto qui non aggiungerebbe nessuna
  // garanzia — la forma l'ha già decisa `validaCorrezioni`.
  // ⚠️ Il numero qui NON si ricopia da una riga di prosa: si conta su
  //    `CAMPI_CORREGGIBILI_DOCUMENTO`. È sceso due volte in un giorno — otto →
  //    sette (D319) → sei (D320) — e tutt'e due le volte un commento vicino al
  //    codice toccato è rimasto indietro.
  const fuso: Record<string, unknown> = { ...lavoro }

  for (const k of CAMPI_TESTO) {
    if (k in correzioni) fuso[k] = correzioni[k]
  }

  if ('paziente_id' in correzioni) {
    fuso.paziente_id = correzioni.paziente_id as string
    fuso.paziente = pazienteNuovo ?? null
  }

  if ('denti_coinvolti' in correzioni) {
    // 🔑 SI DENORMALIZZA COME LA PENNA, non «più o meno come»:
    //    `array_agg(fdi::text ORDER BY fdi)` filtrato per ruolo, e `fdi` è un
    //    INTERO — quindi l'ordine è numerico, non alfabetico. Sbagliarlo qui
    //    darebbe una carta con i denti in un ordine e la riga in un altro.
    const denti = correzioni.denti_coinvolti as DenteNormalizzato[]
    const conRuolo = (r: string) => denti.filter((d) => d.ruolo === r).sort((a, b) => a.fdi - b.fdi)
    fuso.denti_coinvolti = conRuolo('elemento').map((d) => String(d.fdi))
    fuso.denti_mancanti = conRuolo('mancante').map((d) => d.fdi)
    fuso.denti_impianti = conRuolo('impianto').map((d) => d.fdi)
  }

  const prescrizione = fuso.prescrizione as LavoroDettaglio['prescrizione']
  if ('prescrizione_caratteristiche' in correzioni && prescrizione) {
    // La penna fa `jsonb_set(contenuto, [campo], valore)` UNA SOTTO-CHIAVE ALLA
    // VOLTA: correggere il colore non cancella gli elementi. La fusione qui
    // dev'essere la stessa cosa, o carta e riga divergono.
    fuso.prescrizione = {
      ...prescrizione,
      contenuto: {
        ...prescrizione.contenuto,
        ...(correzioni.prescrizione_caratteristiche as Record<string, unknown>),
      },
    }
  }

  return fuso as unknown as LavoroDettaglio
}
