import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { RUOLI_INVIO_PEC } from '@/lib/fattura/invio-claim'
import { ingestRicevuta } from '@/lib/fattura/ricevute/ingest-ricevuta'

// ─── POST /api/pec/ricevute ────────────────────────────────────────────────
// Upload manuale di una ricevuta SdI (RC/NS/MC/NE/DT/AT) scaricata dalla PEC
// del laboratorio (spec R1 §5, D-1: parser-first, poller IMAP rinviato).
// Route sottile: auth/ruolo/CSRF/validazioni superficiali del multipart qui,
// tutta la logica di parse/firma/match/persistenza in ingestRicevuta (Task
// 10 — vedi src/lib/fattura/ricevute/ingest-ricevuta.ts).

// Size cap applicato PRIMA di leggere il body in memoria (anti-DoS) — lo
// stesso limite è imposto di nuovo dentro parseRicevutaSdI (difesa in
// profondità), ma qui evitiamo di sprecare sha256/DB su un file già oversize.
const MAX_SIZE_BYTES = 1_048_576

// Duck-typing invece di `instanceof File`: in ambienti dove i globali
// File/FormData e Request provengono da realm diversi (es. jsdom + undici
// nei test) `instanceof` fallisce anche su un File autentico.
function isFileLike(value: unknown): value is { arrayBuffer(): Promise<ArrayBuffer>; name: string; size: number; type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function' &&
    typeof (value as { size?: unknown }).size === 'number'
  )
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  if (!RUOLI_INVIO_PEC.includes(context.ruolo as (typeof RUOLI_INVIO_PEC)[number])) {
    return NextResponse.json({ error: 'Ruolo non autorizzato al caricamento ricevute SdI' }, { status: 403 })
  }
  const svc = getServiceClient()

  const labId: string = context.laboratorioId

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'FormData non valido' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!isFileLike(file)) {
    return NextResponse.json({ error: 'Campo "file" mancante o non valido' }, { status: 400 })
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ esito: 'non_valida' }, { status: 422 })
  }

  // Content-type dichiarato O estensione .xml — il CONTENUTO fa comunque
  // fede (parse reale dentro ingestRicevuta): questo è solo un fast-reject
  // per payload palesemente non XML.
  const contentType = file.type || ''
  const hasXmlContentType = contentType === 'text/xml' || contentType === 'application/xml'
  const hasXmlExtension = /\.xml$/i.test(file.name || '')
  if (!hasXmlContentType && !hasXmlExtension) {
    return NextResponse.json({ esito: 'non_valida' }, { status: 422 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let result
  try {
    result = await ingestRicevuta(svc, labId, context.userId, {
      buffer,
      filename: file.name || 'ricevuta.xml',
    })
  } catch (err) {
    console.error('[PEC-RICEVUTE] ingest fallito:', err)
    return NextResponse.json({ error: 'Errore durante il caricamento — riprova' }, { status: 500 })
  }

  if (result.esito === 'non_valida') {
    return NextResponse.json(result, { status: 422 })
  }
  if (result.esito === 'cap_superato') {
    return NextResponse.json(result, { status: 429 })
  }

  return NextResponse.json(result, { status: 200 })
}
