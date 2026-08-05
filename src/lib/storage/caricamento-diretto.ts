/**
 * Il caricamento diretto: il permesso da dare al browser, e la verifica di ciò
 * che è atterrato davvero.
 *
 * 🔑 PERCHÉ ESISTE QUESTO CORRIDOIO. Un file che passa dalla funzione trova il
 *    tetto della piattaforma — misurato in produzione: 4,10 MB arriva (401),
 *    4,30 MB no (413) — e quel tetto **non si compra**: è uguale su ogni piano
 *    Vercel. Il magazzino invece accetta già 50 MB. Il collo di bottiglia è il
 *    corridoio, non la destinazione: qui il file salta la funzione e va dritto.
 *
 * 🔒 CIÒ CHE RENDE SICURO IL PERMESSO, misurato con le sonde (piano §1):
 *    · S2 — la chiave **anonima** (quella del browser) **non può** firmare:
 *      «new row violates row-level security policy». Solo il server concede.
 *    · S4 — il permesso è **INCHIODATO al suo percorso**: usato altrove
 *      risponde «Invalid signature». È la ragione per cui il percorso lo
 *      decide il server e il browser non lo può spostare di un carattere.
 *    · S5 — non si riusa sullo stesso percorso: «The resource already exists».
 *    · S6 — il bucket filtra il tipo **anche** per via firmata.
 *    · S7 — dura **2 ore** (letta la scadenza dentro il permesso). Fra la
 *      firma e la conferma può quindi passare parecchio: il lavoro può essere
 *      cancellato e l'abbonamento sospeso, ed è per questo che la conferma
 *      ripete TUTTI i controlli invece di fidarsi della firma.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PermessoCaricamento {
  /** Il percorso, deciso dal SERVER. */
  percorso: string
  /** Il gettone da passare a `uploadToSignedUrl` nel browser. */
  gettone: string
}

/**
 * Concede al browser il permesso di scrivere UN file in UN percorso.
 * 🛑 `percorso` non arriva mai dal client: lo compone il chiamante dalla
 *    sessione (`<laboratorio_id>/lavori/<lavoro_id>/<uuid>.<ext>`).
 */
export async function creaPermessoCaricamento(
  supabase: SupabaseClient,
  bucket: string,
  percorso: string,
): Promise<PermessoCaricamento> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(percorso)
  if (error || !data) {
    throw new Error(`Permesso di caricamento non concesso: ${error?.message ?? 'nessun dato'}`)
  }
  return { percorso: data.path, gettone: data.token }
}

export interface OggettoTrovato {
  esiste: boolean
  /** Peso VERO, letto dal magazzino — mai quello dichiarato dal client. */
  byte: number | null
  /** Tipo VERO, idem. */
  tipo: string | null
}

/**
 * Guarda se il file è davvero atterrato, e con che peso e che tipo.
 *
 * 🛑 PERCHÉ NON BASTA CREDERE AL CLIENT (condizione C2 del piano). Misurato
 *    (S8): `storage.remove` su una chiave **inesistente** NON dà errore —
 *    restituisce `data: []` e nessun `error`. Quindi una riga che punta al
 *    nulla verrebbe un giorno cancellata «con successo», traccia di
 *    cancellazione compresa: una bugia silenziosa dentro il meccanismo
 *    costruito apposta per non mentire. La conferma deve PROVARE che il file
 *    c'è, prima di scrivere la riga che lo rappresenta.
 *
 * 🔑 Si usa `list` con `search` sul prefisso, non un `download`: serve sapere
 *    che c'è e quanto pesa, non portarsi in memoria decine di MB.
 */
export async function trovaOggetto(
  supabase: SupabaseClient,
  bucket: string,
  percorso: string,
): Promise<OggettoTrovato> {
  const taglio = percorso.lastIndexOf('/')
  const cartella = taglio >= 0 ? percorso.slice(0, taglio) : ''
  const nome = taglio >= 0 ? percorso.slice(taglio + 1) : percorso

  const { data, error } = await supabase.storage.from(bucket).list(cartella, { search: nome, limit: 100 })
  if (error) throw new Error(`Verifica del file fallita: ${error.message}`)

  // 🛑 `search` è un CONTIENE, non un uguale: senza il confronto esatto un
  //    nome che comincia allo stesso modo passerebbe per un altro.
  const trovato = (data ?? []).find((f) => f.name === nome)
  if (!trovato) return { esiste: false, byte: null, tipo: null }

  const meta = trovato.metadata as { size?: unknown; mimetype?: unknown } | null
  return {
    esiste: true,
    byte: typeof meta?.size === 'number' ? meta.size : null,
    tipo: typeof meta?.mimetype === 'string' ? meta.mimetype : null,
  }
}

/**
 * Toglie un file che non deve restare.
 * 🔑 Non solleva mai: si usa nei rami di rifiuto, dove il fallimento della
 *    pulizia non deve coprire il motivo VERO del rifiuto. Il residuo, se
 *    resta, lo raccoglie il mietitore degli orfani (T6).
 */
export async function togliOggetto(
  supabase: SupabaseClient,
  bucket: string,
  percorso: string,
): Promise<void> {
  try {
    await supabase.storage.from(bucket).remove([percorso])
  } catch {
    /* v. sopra */
  }
}
