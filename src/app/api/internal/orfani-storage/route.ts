import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { timingSafeEqual } from 'node:crypto'

/**
 * `POST /api/internal/orfani-storage` — il mietitore dei file senza riga.
 *
 * 🔑 PERCHÉ ESISTE, e non è igiene. Col caricamento diretto il file atterra
 *    PRIMA della riga che lo rappresenta: se la conferma non arriva (rete
 *    persa, scheda chiusa, ascensore) resta un file che l'applicazione non sa
 *    di avere. La finestra c'era già — un guasto fra due istruzioni — ma era
 *    larga millisecondi; adesso è larga quanto un viaggio in ascensore.
 *
 * 🛑 E NON È SOLO SPAZIO SPRECATO: `DpaTemplate.tsx` dichiara ai clienti che le
 *    immagini di lavorazione «*sono conservate per il solo tempo necessario
 *    alla lavorazione*». La cancellazione parte SEMPRE dalla riga: un file che
 *    nessuna riga nomina non lo cancella nessuno, mai. È una promessa scritta
 *    che il sistema non può mantenere da solo — GDPR art. 5(1)(e), limitazione
 *    della conservazione.
 *
 * 🔒 CHI PUÒ CHIAMARLA: solo chi porta il segreto in `Authorization: Bearer`,
 *    che è la forma con cui Vercel Cron chiama le sue rotte. Se il segreto NON
 *    è configurato la rotta **rifiuta** (503) invece di aprirsi: una porta
 *    senza serratura non si lascia socchiusa.
 *    ⚠️ `x-internal-secret` (il precedente in casa, `internal/pec-verify`) è
 *    l'altra forma accettata: le due convivono perché la pianificazione può
 *    arrivare da Vercel o da fuori.
 *
 * ⏳ LA FINESTRA DI 24 ORE NON È PRUDENZA GENERICA: il permesso di caricamento
 *    dura **2 ore** (misurato), e un file può quindi atterrare fino a 2 ore
 *    dopo la firma. Cancellare un file «giovane» vorrebbe dire cancellare un
 *    caricamento ancora in corso. 24h lascia un margine di dodici volte.
 */

const BUCKET = 'documenti'
const ORE_DI_GRAZIA = 24

/** Confronto a tempo costante: un `===` su un segreto perde informazione a ogni
 *  carattere. Stesso trattamento di `internal/pec-verify`. */
function segretoValido(ricevuto: string | null, atteso: string): boolean {
  if (!ricevuto) return false
  const a = Buffer.from(ricevuto)
  const b = Buffer.from(atteso)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const atteso = process.env.CRON_SECRET
  if (!atteso) {
    console.error('[orfani-storage] CRON_SECRET non configurato: la rotta resta chiusa')
    return NextResponse.json({ error: 'Non configurato' }, { status: 503 })
  }

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null
  const interno = req.headers.get('x-internal-secret')
  if (!segretoValido(bearer, atteso) && !segretoValido(interno, atteso)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const limite = Date.now() - ORE_DI_GRAZIA * 60 * 60 * 1000

  // ① Tutti i file sotto `<laboratorio>/lavori/<lavoro>/`. Si naviga per
  //    livelli perché `list` non è ricorsivo.
  const percorsi: Array<{ percorso: string; creatoIl: number }> = []
  const { data: radici, error: erroreRadici } = await svc.storage.from(BUCKET).list('', { limit: 1000 })
  if (erroreRadici) {
    console.error('[orfani-storage] lettura del magazzino fallita:', erroreRadici.message)
    return NextResponse.json({ error: 'Lettura fallita' }, { status: 500 })
  }

  for (const lab of radici ?? []) {
    const { data: lavori } = await svc.storage.from(BUCKET).list(`${lab.name}/lavori`, { limit: 1000 })
    for (const lavoro of lavori ?? []) {
      const cartella = `${lab.name}/lavori/${lavoro.name}`
      const { data: files } = await svc.storage.from(BUCKET).list(cartella, { limit: 1000 })
      for (const f of files ?? []) {
        // `created_at` manca su alcune voci di sistema: senza data non si
        // cancella — l'ignoto si lascia stare, non si mangia.
        const quando = f.created_at ? Date.parse(f.created_at) : NaN
        if (!Number.isFinite(quando)) continue
        percorsi.push({ percorso: `${cartella}/${f.name}`, creatoIl: quando })
      }
    }
  }

  // ② Quali sono nominati da una riga? Si chiede al database UNA volta sola.
  const { data: righe, error: erroreRighe } = await svc
    .from('lavori_immagini')
    .select('storage_path')
  if (erroreRighe) {
    // 🛑 FAIL-CLOSED: se non si sa quali file sono nominati, NON si cancella
    //    niente. Il contrario — cancellare in dubbio — è irreversibile.
    console.error('[orfani-storage] lettura delle righe fallita:', erroreRighe.message)
    return NextResponse.json({ error: 'Lettura fallita' }, { status: 500 })
  }
  const nominati = new Set((righe ?? []).map((r) => r.storage_path))

  // ③ Orfani abbastanza vecchi da non essere caricamenti in corso.
  const daTogliere = percorsi
    .filter((p) => !nominati.has(p.percorso))
    .filter((p) => p.creatoIl < limite)
    .map((p) => p.percorso)

  const giovani = percorsi.filter((p) => !nominati.has(p.percorso) && p.creatoIl >= limite).length

  if (daTogliere.length === 0) {
    return NextResponse.json({ esaminati: percorsi.length, tolti: 0, ancoraGiovani: giovani })
  }

  const { error: erroreRimozione } = await svc.storage.from(BUCKET).remove(daTogliere)
  if (erroreRimozione) {
    console.error('[orfani-storage] rimozione fallita:', erroreRimozione.message)
    return NextResponse.json({ error: 'Rimozione fallita' }, { status: 500 })
  }

  // Si registra COSA è stato tolto: un mietitore che lavora in silenzio è un
  // mietitore di cui nessuno si accorge quando sbaglia.
  console.warn(
    `[orfani-storage] tolti ${daTogliere.length} file senza riga (più vecchi di ${ORE_DI_GRAZIA}h):`,
    daTogliere.join(' · '),
  )

  return NextResponse.json({
    esaminati: percorsi.length,
    tolti: daTogliere.length,
    ancoraGiovani: giovani,
  })
}
