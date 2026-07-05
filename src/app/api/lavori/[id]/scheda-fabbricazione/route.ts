import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generateSchedaFabbricazione } from '@/lib/pdf/generate-scheda-fabbricazione'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id: lavoro_id } = await params

  const supabaseService = getServiceClient()
  const { data: utente } = await supabaseService
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()
  if (!utente) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  // Verifica appartenenza al lab (guard cross-tenant)
  const { data: lavoro } = await supabaseService
    .from('lavori')
    .select('id, numero_lavoro')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()
  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

  try {
    const buffer = await generateSchedaFabbricazione(lavoro_id, utente.laboratorio_id)
    const filename = `Scheda_Fabbricazione_${lavoro.numero_lavoro}.pdf`.replace(/\s+/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Errore nella generazione del documento' }, { status: 500 })
  }
}
