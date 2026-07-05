import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'

interface RischioValidato {
  id: string
  rischio: string
  causa: string
  probabilita: number
  gravita: number
  rpn: number
  misura: string
}

type ValidazioneRischi =
  | { ok: true; value: RischioValidato[] }
  | { ok: false; error: string }

function validaRischi(rischi: unknown): ValidazioneRischi {
  if (!Array.isArray(rischi) || rischi.length === 0) {
    return { ok: false, error: 'La lista dei rischi non può essere vuota' }
  }

  const out: RischioValidato[] = []

  for (let i = 0; i < rischi.length; i++) {
    const r = rischi[i] as Record<string, unknown>

    if (typeof r.rischio !== 'string' || !r.rischio.trim()) {
      return { ok: false, error: `Rischio #${i + 1}: campo "rischio" obbligatorio` }
    }
    if (typeof r.causa !== 'string' || !r.causa.trim()) {
      return { ok: false, error: `Rischio #${i + 1}: campo "causa" obbligatorio` }
    }
    if (typeof r.misura !== 'string' || !r.misura.trim()) {
      return { ok: false, error: `Rischio #${i + 1}: campo "misura" obbligatorio` }
    }

    const probabilita = Number(r.probabilita)
    if (!Number.isInteger(probabilita) || probabilita < 1 || probabilita > 3) {
      return { ok: false, error: `Rischio #${i + 1}: "probabilita" deve essere un intero tra 1 e 3` }
    }

    const gravita = Number(r.gravita)
    if (!Number.isInteger(gravita) || gravita < 1 || gravita > 3) {
      return { ok: false, error: `Rischio #${i + 1}: "gravita" deve essere un intero tra 1 e 3` }
    }

    out.push({
      id: typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `R${String(i + 1).padStart(2, '0')}`,
      rischio: r.rischio.trim(),
      causa: r.causa.trim(),
      probabilita,
      gravita,
      rpn: probabilita * gravita,
      misura: r.misura.trim(),
    })
  }

  return { ok: true, value: out }
}

interface NormaValidata {
  codice: string
  titolo: string
  anno?: number
}

type ValidazioneNorme =
  | { ok: true; value: NormaValidata[] }
  | { ok: false; error: string }

function validaNorme(norme: unknown): ValidazioneNorme {
  if (norme === undefined) {
    return { ok: true, value: [] }
  }
  if (!Array.isArray(norme)) {
    return { ok: false, error: 'Il campo "norme_json" deve essere un array' }
  }

  const out: NormaValidata[] = []

  for (let i = 0; i < norme.length; i++) {
    const n = norme[i] as Record<string, unknown>

    if (typeof n.codice !== 'string' || !n.codice.trim()) {
      return { ok: false, error: `Norma #${i + 1}: campo "codice" obbligatorio` }
    }
    if (typeof n.titolo !== 'string' || !n.titolo.trim()) {
      return { ok: false, error: `Norma #${i + 1}: campo "titolo" obbligatorio` }
    }

    const validata: NormaValidata = { codice: n.codice.trim(), titolo: n.titolo.trim() }

    if (n.anno !== undefined && n.anno !== null && n.anno !== '') {
      const anno = Number(n.anno)
      if (!Number.isInteger(anno)) {
        return { ok: false, error: `Norma #${i + 1}: "anno" deve essere un numero intero` }
      }
      validata.anno = anno
    }

    out.push(validata)
  }

  return { ok: true, value: out }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const { data: existing } = await svc
    .from('rischi_tipo_dispositivo')
    .select('id, versione')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Analisi rischi non trovata' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const validated = validaRischi(body.rischi_json)
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 422 })
  }

  const validatedNorme = validaNorme(body.norme_json)
  if (!validatedNorme.ok) {
    return NextResponse.json({ error: validatedNorme.error }, { status: 422 })
  }

  const rischiResidui = body.rischi_residui
  const misureControllo = body.misure_controllo

  const updates = {
    rischi_json: validated.value,
    norme_json: validatedNorme.value,
    rischi_residui: typeof rischiResidui === 'string' && rischiResidui.trim() ? rischiResidui.trim() : null,
    misure_controllo: typeof misureControllo === 'string' && misureControllo.trim() ? misureControllo.trim() : null,
    versione: existing.versione + 1,
    data_ultima_revisione: new Date().toISOString().slice(0, 10),
  }

  const { data: result, error: updateError } = await svc
    .from('rischi_tipo_dispositivo')
    .update(updates)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .select('id, tipo_dispositivo, versione, data_ultima_revisione')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ rischio: result })
}
