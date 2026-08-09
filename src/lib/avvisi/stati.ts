/**
 * Il vocabolario degli stati di un avviso al dentista — UNA FONTE SOLA.
 *
 * 🛑 Specchio del CHECK vivo `avviso_stato_vocabolario`
 * (`supabase/migrations/20260809123206_avvisi_dentista.sql`): un valore in più
 * qui sarebbe un 23514 illeggibile a runtime invece di un 422 pulito.
 */
export const STATI_AVVISO = ['da_comunicare', 'comunicato_dall_app', 'comunicato_a_voce'] as const

export type StatoAvviso = (typeof STATI_AVVISO)[number]

/**
 * I due stati che chiudono il promemoria.
 *
 * Non è `STATI_AVVISO.slice(1)`: due elenchi che si somigliano si accorciano
 * per sbaglio.
 */
export const STATI_CHIUSI = ['comunicato_dall_app', 'comunicato_a_voce'] as const

export type StatoAvvisoChiuso = (typeof STATI_CHIUSI)[number]

/**
 * Vero se la stringa è uno stato conosciuto. Serve al confine con l'esterno
 * (corpo di una richiesta, riga letta da una tabella non tipizzata), dove
 * `StatoAvviso` è una promessa e non un fatto.
 */
export function isStatoAvviso(v: unknown): v is StatoAvviso {
  return typeof v === 'string' && (STATI_AVVISO as readonly string[]).includes(v)
}

/**
 * Vero se lo stato chiude il promemoria.
 *
 * 🔑 Il promemoria si chiude anche con «l'ho avvisato di persona» (⚖️ D335):
 * i due modi valgono uguale, e questa funzione è il punto in cui quella
 * decisione è scritta una volta sola.
 */
export function chiudeIlPromemoria(v: StatoAvviso): v is StatoAvvisoChiuso {
  return (STATI_CHIUSI as readonly string[]).includes(v)
}

/**
 * 🛑 Il testo mandato si conserva SOLO per l'invio dall'app (⚖️ D339: la bozza
 * proposta non si conserva). Specchio del CHECK `avviso_testo_solo_se_dall_app`,
 * che rifiuta un testo su qualunque altro stato — compresa una bozza salvata
 * su `da_comunicare`.
 */
export function ammetteTestoInviato(v: StatoAvviso): boolean {
  return v === 'comunicato_dall_app'
}
