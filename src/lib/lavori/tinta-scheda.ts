// D42 — Task 7. Il catalogo delle tinte letto DAL SERVER, una volta sola, per
// le due cose che ne hanno bisogno sulla stessa schermata: la RIGA (che mostra
// nome e pallino) e la TAVOLOZZA (che li mostra tutti e diciassette).
//
// 🔑 PERCHÉ LA LETTURA STA QUI E NON IN UNA ROTTA. Le due superfici della tinta
//    — la scheda (`lavori/[id]/page.tsx`) e la pagina di modifica
//    (`lavori/[id]/modifica/page.tsx`, che dichiara di replicare «FEDELMENTE il
//    pattern dati» della prima) — sono ENTRAMBE componenti server. Una rotta
//    `/api/tinte` sarebbe una seconda strada per lo stesso dato, e il T8
//    dovrebbe poi sceglierne una: è la classe di difetto che quest'ondata
//    combatte. Una funzione sola, importata da tutte e due.
// 📮 AL TASK 8: questa è la funzione da chiamare, non da riscrivere. Restituisce
//    già `disponibili` per la tavolozza della pagina di modifica.
//
// 🛑 IL CLIENT È QUELLO DI SERVIZIO (`getServiceClient`), come nel resto delle
//    due pagine. `provato:` i permessi del catalogo, che senza RLS sono l'unica
//    difesa: `has_table_privilege` → `authenticated` SELECT **true**, `anon`
//    **false**, e `service_role` ha il suo GRANT esplicito nella migration
//    `20260805174000_tinte_manufatto.sql:97`.
import { famigliaDiMacro, type TintaManufatto, type TintaScelta } from '@/lib/domain/tinta'
import type { getServiceClient } from '@/lib/supabase/server-service'

export type TinteScheda = {
  /** La tinta del lavoro, o `null` se non ne ha (o se la coppia non è in catalogo). */
  scelta: TintaScelta | null
  /** Le tinte fra cui si può scegliere, nell'ordine del catalogo. Vuoto se il
   *  tipo di lavoro non prevede tinte. */
  disponibili: TintaManufatto[]
}

const NIENTE: TinteScheda = { scelta: null, disponibili: [] }

/**
 * Carica ciò che serve alla tinta su una schermata di lavoro.
 *
 * @param lavoro la riga vera in banca dati — `tipo_dispositivo` è la categoria
 *   GROSSA (i 10 valori macro), la stessa che il CHECK `lavori_tinta_tipo_ck`
 *   guarda.
 */
export async function caricaTinteScheda(
  svc: ReturnType<typeof getServiceClient>,
  lavoro: { tipo_dispositivo: string; tinta_famiglia: string | null; tinta_codice: string | null }
): Promise<TinteScheda> {
  // Una corona non ha tinte: non si interroga nemmeno il catalogo. Non è
  // un'ottimizzazione, è la stessa regola di `risolviTinta` — la famiglia
  // ammessa la decide il TIPO del lavoro.
  const famiglia = famigliaDiMacro(lavoro.tipo_dispositivo)
  if (famiglia === null) return NIENTE

  const { data, error } = await svc
    .from('tinte_manufatto')
    .select('famiglia, codice, nome, ordine, hex')
    .eq('famiglia', famiglia)
    .order('ordine')

  // Un catalogo irraggiungibile non porta giù la scheda: la riga sparisce e la
  // tavolozza resta vuota, ma il lavoro si vede e si consegna. Stessa scelta
  // di `risolviTinta`, dove un catalogo muto scarta la tinta invece di far
  // fallire la scrittura.
  if (error || !data) return NIENTE

  const disponibili = data as TintaManufatto[]

  // La scelta si mostra SOLO se la coppia sta davvero in catalogo e appartiene
  // alla famiglia di questo tipo di lavoro. Un dato incoerente (che i vincoli
  // del database impediscono, ma che una lettura non deve dare per scontato)
  // fa sparire la riga: meglio nessuna riga che una riga con un nome inventato
  // su un dispositivo su misura.
  const trovata =
    lavoro.tinta_famiglia === famiglia && lavoro.tinta_codice
      ? disponibili.find((t) => t.codice === lavoro.tinta_codice)
      : undefined

  return {
    scelta: trovata
      ? { famiglia: trovata.famiglia, codice: trovata.codice, nome: trovata.nome, hex: trovata.hex }
      : null,
    disponibili,
  }
}
