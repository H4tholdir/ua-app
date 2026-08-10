// src/lib/avvisi/queries.ts
//
// LE DUE LETTURE di `avvisi_dentista`, e non ce n'è una terza (piano, riga 397).
// Task 6 dell'ondata «l'avviso al dentista».
//
// 🔑 PERCHÉ UN MODULO IN `src/lib/` E NON UNA ROTTA. Il modello è
//    `src/lib/lavori/tinta-scheda.ts`, e la ragione è la stessa: le superfici
//    che hanno bisogno di questi dati sono **componenti server** — la scheda del
//    lavoro (`lavori/[id]/page.tsx`) e, per l'archivio, la scheda del dentista
//    (`clienti/[id]/page.tsx`, Task 9). Una rotta sarebbe una seconda strada per
//    lo stesso dato, e il compito dopo dovrebbe sceglierne una.
//
// 🛑 IL CLIENT È QUELLO DI SERVIZIO, E QUESTO CAMBIA CHI DIFENDE IL CONFINE.
//    `service_role` ha `rolbypassrls = true`: le politiche del Task 1
//    (`laboratorio_id = public.current_lab_id()`) **non toccano questa strada**.
//    Su ogni lettura di questo file l'isolamento fra laboratori è la `.eq()` che
//    si legge nel codice, e nient'altro — la stessa ragione per cui la rotta del
//    Task 4 porta lo stesso filtro sull'UPDATE (`avviso/route.ts:59-75`).
//    ➡️ `laboratorioId` è un parametro OBBLIGATORIO in tutte e due le firme, e
//    non ha un valore di ripiego: un ripiego sarebbe il modo di dimenticarlo.
//
// 📌 Il vocabolario degli stati arriva da `stati.ts`, mai battuto a mano qui:
//    due elenchi che si somigliano divergono, e questo è già il terzo posto che
//    lo legge (tabella · rotta · lettura).

import {
  STATI_AVVISO,
  chiudeIlPromemoria,
  type StatoAvviso,
} from '@/lib/avvisi/stati'
import { puoVedereAvviso, puoVedereArchivioCliente } from '@/lib/avvisi/ruoli'
import type { getServiceClient } from '@/lib/supabase/server-service'

type Svc = ReturnType<typeof getServiceClient>

/**
 * Gli stati che **non** chiudono il promemoria, **derivati** e non riscritti.
 *
 * 🔑 È la stessa espressione di `avviso/route.ts:136`, di proposito: chi legge
 * il promemoria e chi lo chiude devono guardare lo stesso elenco, o il giorno in
 * cui nasce un quarto stato la scheda mostrerebbe una riga che la rotta rifiuta
 * (o, peggio, la nasconderebbe pur restando l'obbligo aperto).
 * ⚠️ Oggi vale `['da_comunicare']`. Non si scrive quella stringa: la si deriva.
 */
const STATI_APERTI: StatoAvviso[] = STATI_AVVISO.filter((s) => !chiudeIlPromemoria(s))

/**
 * Una riga di `avvisi_dentista` come esce dal banco.
 *
 * 🛑 `stato` è `string` e non `StatoAvviso`: arriva da fuori, dove il tipo è una
 * promessa e non un fatto (stessa riga di `isStatoAvviso` in `stati.ts`). Chi
 * deve ramificare su di lui lo restringe con quella funzione.
 */
export interface AvvisoRiga {
  id: string
  lavoro_id: string
  cliente_id: string
  dichiarazione_id: string
  stato: string
  campi_corretti: string[]
  testo_inviato: string | null
  comunicato_at: string | null
  comunicato_da: string | null
  visto_dal_dentista_at: string | null
  created_at: string
}

/**
 * Le colonne, scritte una volta sola.
 *
 * 🔑 Non `*`: la ricevuta di lettura del dentista e il testo mandato sono dati
 * che si chiedono per nome, così l'elenco di ciò che esce da questa tabella si
 * legge in un posto solo. E il Task 9 ha bisogno di **tutte** queste — «quando ·
 * come · chi · se e quando l'ha aperta» sono `created_at` · `stato` ·
 * `comunicato_da` · `visto_dal_dentista_at`.
 *
 * 🛑 **ED È ESPORTATA PERCHÉ UNA PROVA LA LEGA ALLO SCHEMA VERO.** Il ripiego a
 * lista vuota qui sotto (`vuotoConNota`) è deliberato — una lettura caduta non
 * porta giù la scheda — ma ha un prezzo: il giorno in cui una di queste colonne
 * venisse rinominata, la lettura risponderebbe errore, il promemoria **ex Art. 19
 * GDPR sparirebbe per sempre e in silenzio**, e le dodici prove unitarie
 * resterebbero verdi perché interrogano un finto. La rete è
 * `tests/integration/avvisi-colonne-schema.test.ts`: una lettura a zero righe
 * contro il banco vero, che fallisce su qualunque nome sbagliato.
 * ⚠️ Chi importa questa costante lo fa per **verificarla**, non per comporre una
 * seconda lettura: le letture di questa tabella sono due, e stanno qui.
 */
export const COLONNE =
  'id, lavoro_id, cliente_id, dichiarazione_id, stato, campi_corretti, testo_inviato, comunicato_at, comunicato_da, visto_dal_dentista_at, created_at'

/**
 * Un guasto di lettura non porta giù la schermata — ma non è nemmeno muto.
 *
 * 🔑 La prima metà è la scelta di `caricaTinteScheda` («un catalogo
 * irraggiungibile non porta giù la scheda»): il lavoro si vede e si consegna.
 * 🛑 La seconda metà è nuova, e la differenza è dichiarata: qui ciò che sparisce
 * è **un obbligo di legge** (GDPR Art. 19), non l'etichetta di un colore. Una
 * riga vuota restituita in silenzio spegnerebbe un promemoria che invece è
 * ancora acceso in banca dati — cioè esattamente ciò che tutta quest'ondata
 * esiste per impedire. Nei log resta scritto.
 */
function logGuasto(dove: string, errore: { message?: string } | null): void {
  console.error(`[AVVISI] ${dove}: lettura fallita, il promemoria non è visibile —`, errore?.message)
}

function vuotoConNota(dove: string, errore: { message?: string } | null): [] {
  logGuasto(dove, errore)
  return []
}

/** Come `vuotoConNota`, per le letture che consegnano **una riga sola**. */
function nienteConNota(dove: string, errore: { message?: string } | null): null {
  logGuasto(dove, errore)
  return null
}

/**
 * ⚖️ **SI CONSUMA PRIMA L'OBBLIGO NATO PRIMA — e la regola vive QUI, in un posto solo.**
 *
 * Quando su un lavoro (o in un laboratorio) ci sono **due** promemoria aperti — e ci possono
 * essere: `correggi_e_riemetti_atomica` fa un `INSERT` incondizionato
 * (`20260809133546:488`) — quello che si mostra è il **più vecchio**. I due portano
 * `campi_corretti` diversi e sono **due rettifiche distinte** ex Art. 19 GDPR: il registro si
 * legge nell'ordine in cui i fatti sono avvenuti, e chiudendo il primo il promemoria **ricompare**
 * per il secondo — che è la verità, non un difetto.
 *
 * 🛑 **È UNA COSTANTE E NON UNA RIGA RIPETUTA PERCHÉ LA SCELTA È A PANEL.** La scheda del lavoro
 * (Task 6) e la striscia della home (Task 7) mostrano lo **stesso** promemoria: se un giorno si
 * decidesse di mostrare il più recente, due `ascending: true` scritti a mano in due funzioni
 * diverse si cambierebbero **uno solo**, e le due superfici direbbero cose diverse sulla stessa
 * schermata. Da qui si cambiano insieme.
 *
 * ⚠️ **`archivioCliente` NON usa questa costante, ed è giusto così:** è una regola diversa —
 * un archivio si legge dal più recente (⚖️ D337), non dal più vecchio. Due ordini che si
 * somigliano non sono la stessa decisione.
 */
const DAL_PIU_VECCHIO = { ascending: true } as const

/**
 * Il promemoria ancora aperto di **quel** lavoro.
 *
 * ⚠️ TORNA UNA LISTA, E IL PLURALE NON È DECORATIVO: `correggi_e_riemetti_atomica`
 * fa un `INSERT` **incondizionato** (migration `20260809133546:488`) e nessun
 * indice unico parziale impedisce due righe aperte sullo stesso lavoro — due
 * riemissioni non comunicate fanno **due** avvisi. Chi rende la schermata decide
 * che cosa mostrare; questa funzione non nasconde il fatto.
 *
 * 🔑 L'ORDINE È CRESCENTE, e la ragione è normativa prima che estetica: i due
 * avvisi portano `campi_corretti` diversi e sono **due rettifiche distinte** ai
 * sensi dell'Art. 19 GDPR. Si consuma prima l'obbligo nato prima, così il
 * registro si legge nell'ordine in cui i fatti sono avvenuti.
 * 🛑 `id` come secondo criterio: senza, due righe nate nello stesso istante
 * escono in un ordine indefinito e la scheda mostrerebbe ora l'una ora l'altra.
 */
export async function avvisiDaComunicare(
  svc: Svc,
  filtro: { lavoroId: string; laboratorioId: string }
): Promise<AvvisoRiga[]> {
  const { data, error } = await svc
    .from('avvisi_dentista')
    .select(COLONNE)
    .eq('lavoro_id', filtro.lavoroId)
    .eq('laboratorio_id', filtro.laboratorioId)
    .in('stato', STATI_APERTI)
    .order('created_at', DAL_PIU_VECCHIO)
    .order('id', DAL_PIU_VECCHIO)

  if (error || !data) return vuotoConNota('avvisiDaComunicare', error)
  return data as unknown as AvvisoRiga[]
}

/**
 * IL PROMEMORIA DA METTERE SULLA SCHEDA — il cancello di ⚖️ D342 e la lettura
 * **dentro la stessa funzione**, così non esistono a due passi diversi.
 *
 * 🔴 PERCHÉ ESISTE, ED È UN DIFETTO DI PROVA CHIUSO, NON UN ABBELLIMENTO.
 *    Prima (revisione del Task 6) `lavori/[id]/page.tsx` teneva un ternario —
 *    `puoVedereAvviso(ruolo) ? avvisiDaComunicare(…) : Promise.resolve([])`.
 *    Il cancello era giusto e il predicato provato, ma **il ternario no**:
 *    `provato:` capovolgendolo (`!mostraIlPromemoria ? …`) **tutte e 68 le prove
 *    restavano verdi** mentre a vedere il promemoria sarebbero rimasti **solo**
 *    `admin_rete` e `admin_sistema`, cioè esattamente i due che D342 esclude.
 *    Il motivo è strutturale: quel file è un componente server asincrono che
 *    nessuna prova unitaria rende, quindi nessuna mutazione al suo interno può
 *    diventare rossa. ➡️ La riga si è **spostata qui**, dove una prova la
 *    esercita davvero (`tests/unit/avvisi-queries.test.ts`).
 *
 * 🛑 **`ruolo` È OBBLIGATORIO, E LA CHIUSURA È PER COSTRUZIONE, NON PER
 *    DISCIPLINA.** La chiave non è opzionale: chi dimentica di dichiarare *chi
 *    guarda* non compila. Il tipo ammette `null`/`undefined` perché i chiamanti
 *    veri li hanno davvero (`SchedaLavoroV3` riceve `ruolo?: string | null`), e
 *    quei valori **non passano il cancello**: fail-closed senza un secondo ramo.
 *
 * 🔑 **UNO SOLO, ANCHE QUANDO SONO DUE**, e il fatto è vero, non teorico:
 *    `correggi_e_riemetti_atomica` fa un `INSERT` **incondizionato**
 *    (`20260809133546:488`), quindi due riemissioni non comunicate lasciano DUE
 *    righe aperte sullo stesso lavoro. Si torna la **più vecchia** (la lettura
 *    ordina crescente): due righe identiche sulla stessa carta non direbbero
 *    niente a nessuno, e chiudendo la prima il promemoria **ricompare** per la
 *    seconda — che è la verità, non un difetto. I due avvisi portano
 *    `campi_corretti` diversi e sono **due rettifiche distinte** ex Art. 19 GDPR:
 *    si consuma prima l'obbligo nato prima.
 *
 * ⚠️ **`avvisiDaComunicare` NON cambia firma** e resta esportata: è la lettura
 *    grezza, e le sue dodici prove restano quelle. Questa la chiama.
 *    🛑 Chi rende una schermata usa **questa**, non quella: chiamare la grezza
 *    vuol dire rifare il cancello a mano, cioè ricreare il ternario che questa
 *    funzione esiste per togliere. Una sentinella lo controlla su `page.tsx`
 *    (`tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx`).
 */
export async function avvisoPerLaScheda(arg: {
  svc: Svc
  lavoroId: string
  laboratorioId: string
  ruolo: string | null | undefined
}): Promise<AvvisoRiga | null> {
  if (!puoVedereAvviso(arg.ruolo)) return null

  const aperti = await avvisiDaComunicare(arg.svc, {
    lavoroId: arg.lavoroId,
    laboratorioId: arg.laboratorioId,
  })
  return aperti[0] ?? null
}

/**
 * TUTTE le comunicazioni di **quel** cliente, dalla più recente.
 *
 * 📮 AL TASK 9 — È QUESTA LA FUNZIONE, e non ce n'è una seconda da scrivere. Il
 * suo consumatore è `src/app/(app)/clienti/[id]/page.tsx`, la sezione
 * «Comunicazioni» di ⚖️ D337, che al momento in cui questa riga è stata scritta
 * **non esiste ancora**. Perciò la forma qui è deliberatamente **minima**: le
 * righe di quel cliente, in ordine, e basta. Nessun nome di autore risolto,
 * nessuna etichetta da stampare, nessun conteggio — inventarli contro una
 * schermata che nessuno ha ancora visto vorrebbe dire farli rifare.
 * 🛑 E se un giorno questa funzione non avesse più chiamanti, la risposta NON è
 * «è morta»: è che il Task 9 non è ancora arrivato.
 *
 * 🛑 NESSUN FILTRO SULLO STATO, ed è la differenza portante con la lettura di
 * sopra: è un **archivio**, non un allarme (piano, Task 9). Le righe chiuse sono
 * proprio quelle che servono — sono la prova, ex Art. 5(2) GDPR, che il dentista
 * fu avvisato. Un filtro qui cancellerebbe l'archivio invece di comporlo.
 *
 * 📌 L'ORDINE, E LA FRASE CHE C'ERA QUI DICEVA UNA COSA CHE IL CODICE SMENTIVA.
 * Diceva che il decrescente «è quello che `idx_avvisi_per_cliente (cliente_id,
 * created_at DESC)` sa dare senza ordinare a parte» — ma i criteri sono **due**, e
 * `id` in quell'indice **non c'è**. Come stanno davvero le cose:
 * - `created_at DESC` è il criterio che l'indice serve, ed è il motivo per cui è
 *   fatto così;
 * - `id DESC` è il **pareggio deterministico**, e per ottenerlo il pianificatore
 *   può dover ordinare comunque. Si accetta: su un archivio di poche righe per
 *   cliente un sort non si sente, mentre due righe nate nello stesso istante che
 *   escono ora in un ordine ora nell'altro si vedono benissimo — e su un registro
 *   che è la **prova ex Art. 5(2) GDPR** un ordine ballerino è un difetto vero.
 */
/**
 * Ciò che serve alla striscia della home, e **nient'altro**.
 *
 * 🔑 **DUE CAMPI, E NESSUNO DEI DUE SI CHIAMA `id`.** La cosa si chiama «avviso», ma
 * l'identificativo che serve è quello del **lavoro** — la CTA apre `/lavori/…`, perché l'avviso
 * una schermata propria non ce l'ha — e il numero è il numero del lavoro. Un campo `id` dentro
 * una struttura chiamata «avviso», contenente l'id di un'altra cosa, è una trappola per chi legge
 * dopo: qui i nomi dicono di chi sono.
 * ⚠️ Non è `AvvisoRiga`: la striscia scrive **una riga di testo**, e portarsi dietro
 * `campi_corretti`, `testo_inviato` o la ricevuta di lettura del dentista vorrebbe dire far
 * viaggiare fino alla home dati che nessuno mostra.
 */
export interface AvvisoStriscia {
  lavoroId: string
  numeroLavoro: string
}

/**
 * IL PROMEMORIA DA METTERE NELLA STRISCIA DELLA HOME — «c'è un avviso da comunicare in **questo
 * laboratorio**?». Task 7.
 *
 * 🔑 **È LA TERZA LETTURA DI QUESTA TABELLA, E LA REGOLA DEL PIANO REGGE LO STESSO.** «Due letture,
 * niente terza fonte» vieta una seconda *strada* per lo stesso dato — una rotta, un'altra query
 * sparsa in una pagina — non una domanda nuova. E la domanda è davvero nuova: `avvisiDaComunicare`
 * guarda **un lavoro**, `archivioCliente` guarda **un cliente**, questa guarda **un laboratorio
 * intero**. Nessuna delle due poteva rispondere. Sta qui, con le altre, e usa lo stesso
 * vocabolario: violare quella regola sarebbe scriverla altrove.
 *
 * 🛑 **IL CANCELLO È DENTRO, E LA NON-LETTURA È IL CANCELLO.** Chi ⚖️ D342 non ammette non riceve
 * `null` dopo aver interrogato il banco: **non lo interroga**. È il modo di casa — `usaFiscali` in
 * `src/lib/dashboard/striscia.ts` fa esattamente questo per i dati fiscali — e insieme è la lezione
 * del Task 6: un ternario nel chiamante (`puoVedere ? leggi : null`) è **invertibile senza che una
 * sola prova diventi rossa**, perché nessuna prova unitaria rende un componente server. Qui la
 * riga sta dove una prova la esercita (`tests/unit/avvisi-queries.test.ts`) e dove capovolgerla si
 * vede.
 *
 * 🛑 **`laboratorio_id` NON È DECORATIVO.** Il client è quello di servizio, che **scavalca la RLS**:
 * quella `.eq()` è l'unica cosa che impedisce alla home di un laboratorio di annunciare il
 * promemoria di un altro.
 *
 * 🔑 **UNO SOLO, ANCHE QUANDO SONO DUE** — il **più vecchio**, come sulla scheda: v.
 * `DAL_PIU_VECCHIO`, dove la regola è scritta una volta per tutte e due le superfici.
 *
 * ⚠️ **L'INDICE C'È GIÀ E VA BENE COSÌ:** `idx_avvisi_da_comunicare (laboratorio_id, created_at
 * DESC) WHERE stato = 'da_comunicare'` (migration `20260809123206`) è **parziale** ed è guidato da
 * `laboratorio_id`, cioè esattamente questa domanda. È dichiarato `DESC` e qui si chiede `ASC`:
 * non è un problema, un indice si percorre anche all'indietro. ⚠️ Il predicato parziale però
 * enumera lo stato **a mano**: il giorno in cui nascesse un quarto stato aperto, `STATI_APERTI` lo
 * includerebbe e l'indice **no** — la lettura resterebbe corretta e diventerebbe una scansione.
 * Sta nella coda della roadmap, non qui.
 */
export async function avvisoPerLaStriscia(arg: {
  svc: Svc
  laboratorioId: string
  ruolo: string | null | undefined
}): Promise<AvvisoStriscia | null> {
  if (!puoVedereAvviso(arg.ruolo)) return null

  const { data, error } = await arg.svc
    .from('avvisi_dentista')
    // 🛑 NON `COLONNE`: quella è la riga intera, per la scheda e per l'archivio. Qui servono due
    //    campi, e il numero del lavoro **non è su questa tabella** — si incorpora da `lavori`
    //    (FK `lavoro_id`). ⚠️ La colonna è `numero_lavoro`, non `numero`.
    .select('lavoro_id, lavori(numero_lavoro)')
    .eq('laboratorio_id', arg.laboratorioId)
    .in('stato', STATI_APERTI)
    .order('created_at', DAL_PIU_VECCHIO)
    .order('id', DAL_PIU_VECCHIO)
    .limit(1)

  if (error || !data) return nienteConNota('avvisoPerLaStriscia', error)

  // Senza un generic `Database` sul client, postgrest-js tipa anche un embed to-one come array —
  // stessa cautela di `leggiLiberazioneRecente` in `striscia.ts`: si normalizzano tutt'e due le
  // forme.
  const riga = (data as unknown as Array<{
    lavoro_id: string
    lavori: { numero_lavoro: string } | { numero_lavoro: string }[] | null
  }> | null)?.[0]
  if (!riga) return null

  const numeroLavoro = Array.isArray(riga.lavori) ? riga.lavori[0]?.numero_lavoro : riga.lavori?.numero_lavoro
  // 🛑 Senza numero non si scrive «n.undefined» in cima alla home: si tace. Non dovrebbe accadere
  //    (`lavoro_id` è `NOT NULL` con FK), ma il ripiego di questa lettura è il silenzio, e un
  //    silenzio va **dichiarato nei log** — è un promemoria di legge che sparisce dalla vista.
  if (!numeroLavoro) return nienteConNota('avvisoPerLaStriscia', { message: 'riga senza numero_lavoro incorporato' })

  return { lavoroId: riga.lavoro_id, numeroLavoro }
}

export async function archivioCliente(
  svc: Svc,
  filtro: { clienteId: string; laboratorioId: string }
): Promise<AvvisoRiga[]> {
  const { data, error } = await svc
    .from('avvisi_dentista')
    .select(COLONNE)
    .eq('cliente_id', filtro.clienteId)
    .eq('laboratorio_id', filtro.laboratorioId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (error || !data) return vuotoConNota('archivioCliente', error)
  return data as unknown as AvvisoRiga[]
}

/**
 * L'ARCHIVIO, VISTO DALLA SCHEDA DEL CLIENTE — il cancello di ⚖️ D352 e la
 * lettura **nella stessa funzione**, esattamente come `avvisoPerLaScheda`
 * (⚖️ D342) fa per il promemoria aperto. Task 9.
 *
 * 🔴 PERCHÉ ESISTE, E NON È UN BLOCCO NUDO DENTRO `archivioCliente`. Da
 *    stamattina (Task 8) `archivioCliente` ha DUE chiamanti con DUE autorità
 *    diverse: il portale (`src/app/portale/[token]/page.tsx`), la cui
 *    autorità è il TOKEN — nessun ruolo utente, e la funzione grezza deve
 *    restare **utilizzabile senza un ruolo** — e la scheda cliente (qui),
 *    la cui autorità è il RUOLO (D352). Mettere il cancello dentro
 *    `archivioCliente` stesso avrebbe rotto il primo chiamante (gli
 *    servirebbe un `ruolo` che non ha) o l'avrebbe costretto a passare un
 *    ruolo finto — un bicondizionale che D352 non chiede. Il modello di casa
 *    è invece un SECONDO entry point che avvolge il primo, come `striscia.ts`
 *    fa con `usaFiscali` e come `avvisoPerLaScheda`/`avvisoPerLaStriscia`
 *    fanno già in questo stesso file: la lettura/il ruolo si PROPAGA dal
 *    chiamante, con una sentinella, e il ripiego è fail-closed.
 *
 * 🛑 `ruolo` È OBBLIGATORIO, E LA CHIUSURA È PER COSTRUZIONE, NON PER
 *    DISCIPLINA — stessa forma di `avvisoPerLaScheda`: la chiave non è
 *    opzionale (chi dimentica di dichiarare *chi guarda* non compila), ma il
 *    TIPO ammette `null`/`undefined` perché il chiamante vero
 *    (`clienti/[id]/page.tsx`, componente server) li ha davvero, e quei
 *    valori non passano il cancello — nessun secondo ramo, `includes()`
 *    risponde `false` da sé (`puoVedereArchivioCliente`).
 *
 * 🔑 **`RUOLI_ARCHIVIO_CLIENTE`, MAI `RUOLI_CHIUSURA_AVVISO`.** L'elenco di
 *    oggi coincide (v. `ruoli.ts`), ma la costante è un'altra: due decisioni
 *    che oggi rispondono uguale possono divergere domani.
 *
 * ⚠️ **`archivioCliente` NON CAMBIA FIRMA, e resta esportata**: è la lettura
 *    grezza che il portale continua a chiamare esattamente com'è
 *    (`portale/[token]/page.tsx:467`) — le sue prove del Task 8
 *    (`avvisi-portale.test.ts`) non hanno bisogno di sapere che questa
 *    funzione esiste. 🛑 Chi rende la scheda del cliente usa **questa**, non
 *    quella: chiamare la grezza da lì vorrebbe dire rifare il cancello a
 *    mano — lo stesso ternario invisibile che il Task 6 ha già pagato una
 *    volta (v. il riquadro su `avvisoPerLaScheda`, sopra).
 */
export async function archivioPerSchedaCliente(arg: {
  svc: Svc
  clienteId: string
  laboratorioId: string
  ruolo: string | null | undefined
}): Promise<AvvisoRiga[]> {
  if (!puoVedereArchivioCliente(arg.ruolo)) return []

  return archivioCliente(arg.svc, { clienteId: arg.clienteId, laboratorioId: arg.laboratorioId })
}
