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
function vuotoConNota(dove: string, errore: { message?: string } | null): [] {
  console.error(`[AVVISI] ${dove}: lettura fallita, il promemoria non è visibile —`, errore?.message)
  return []
}

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
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  if (error || !data) return vuotoConNota('avvisiDaComunicare', error)
  return data as unknown as AvvisoRiga[]
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
