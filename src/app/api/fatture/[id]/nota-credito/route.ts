import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generaFatturaPA } from '@/lib/fattura/generate-xml'

// ─── POST /api/fatture/[id]/nota-credito ──────────────────────────────────
// Orchestrazione a due fasi (Nota di Credito TD04, Task 6):
//   Fase 1 — RPC `emetti_nota_credito_atomica` (claim-first, snapshot,
//            reset fiscale). Tutta la logica transazionale/gate vive lì.
//   Fase 2 — `generaFatturaPA` (XML + PDF cortesia), FUORI dalla transazione:
//            genera il progressivo SDI solo se il draft è stato creato.
// Se la fase 2 fallisce, il draft TD04 resta in stato 'draft' e la risposta
// è comunque 200 con `xml_pending: true` — un retry (stessa chiamata) risolve
// via il ramo "resume" sotto, senza creare un secondo TD04 (Task 8 completa
// i test end-to-end del resume/idempotenza).
//
// [id] nei params è l'id della FATTURA ORIGINALE (TD01) da stornare.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: originaleId } = await params
  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const laboratorioId: string = utente.laboratorio_id

  // ── Valida body.causale PRIMA di toccare la RPC ──────────────────────────
  // p_causale NULL non è guardato nella RPC (viola il CHECK causale_storno su
  // tipo_documento='TD04' con un'eccezione Postgres grezza): la route deve
  // impedirlo qui, non lasciarlo passare come raw exception.
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // body assente/non JSON → trattato come causale mancante sotto
  }
  const causale = typeof body.causale === 'string' ? body.causale.trim() : ''
  if (!causale) {
    return NextResponse.json({ error: 'Causale obbligatoria' }, { status: 400 })
  }

  // ── Resume (Task 8 completa test end-to-end) ─────────────────────────────
  // Se esiste già un TD04 draft/generata collegato a questo originale, non
  // richiamare la RPC — il backstop unique (fatture_td04_collegata_unique)
  // garantisce al più un draft/generata non-rifiutata per originale, quindi
  // qui si riprende solo la fase 2 invece di tentare (e fallire) un secondo
  // claim-first.
  const { data: esistente } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi')
    .eq('fattura_collegata_id', originaleId)
    .eq('laboratorio_id', laboratorioId)
    .in('stato_sdi', ['draft', 'generata'])
    .maybeSingle()

  let td04Id: string

  if (esistente) {
    if (esistente.stato_sdi === 'generata') {
      // Già completata: idempotente, nessuna nuova generazione XML.
      return NextResponse.json({ td04_id: esistente.id, numero: esistente.numero })
    }
    td04Id = esistente.id
  } else {
    const { data, error } = await svc.rpc('emetti_nota_credito_atomica', {
      p_originale_id: originaleId,
      p_causale: causale,
      p_laboratorio_id: laboratorioId,
    })

    if (error) {
      console.error('[NOTA-CREDITO] RPC error:', error.message)
      return NextResponse.json(
        { error: 'Errore durante l\'emissione della nota di credito' },
        { status: 500 }
      )
    }

    const esito = (data as { esito: string; td04_id?: string } | null)?.esito

    switch (esito) {
      case 'ok':
        td04Id = (data as { td04_id: string }).td04_id
        break
      case 'non_trovato':
        return NextResponse.json({ error: 'Fattura originale non trovata' }, { status: 404 })
      case 'non_stornabile':
        return NextResponse.json({ error: 'Fattura non stornabile' }, { status: 409 })
      default:
        console.error('[NOTA-CREDITO] esito RPC inatteso:', esito)
        return NextResponse.json(
          { error: 'Errore durante l\'emissione della nota di credito' },
          { status: 500 }
        )
    }
  }

  // ── Fase 2: generazione XML (fuori dalla transazione RPC) ────────────────
  // Il ramo TD04 di generaFatturaPA legge tutto dallo snapshot congelato sul
  // draft (numero/imponibile/cliente/causale) — nessun `lavoro` da passare.
  try {
    const risultato = await generaFatturaPA(null, td04Id)
    return NextResponse.json({ td04_id: td04Id, numero: risultato.numero })
  } catch (err) {
    console.error('[NOTA-CREDITO] generaFatturaPA fallita:', err)
    // Il draft TD04 resta in stato 'draft': retry idempotente (vedi ramo resume sopra).
    return NextResponse.json({ td04_id: td04Id, xml_pending: true })
  }
}
