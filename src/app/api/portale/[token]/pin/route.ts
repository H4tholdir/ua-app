// src/app/api/portale/[token]/pin/route.ts
// Spec §5/§7 — verifica PIN e apertura sessione economica.
// F4: incremento tentativi SOLO via RPC atomica. F5: rate limit per-IP.
// F13: 401 uniforme per token invalido/scaduto. Audit fail-loud.
import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { verifyPin } from '@/lib/portale/pin'
import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE, SESSIONE_ECONOMICA_DURATA_MS } from '@/lib/portale/sessione'
import { logPortaleAudit, ipDaRequest } from '@/lib/portale/audit'
import { risolviClientePortale } from '@/lib/portale/guardie'

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_FINESTRA_MS = 15 * 60 * 1000
const MAX_TENTATIVI_PIN = 5

type RouteContext = { params: Promise<{ token: string }> }

export async function POST(req: Request, { params }: RouteContext) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ errore: 'forbidden' }, { status: 403 })
    const { token } = await params

    let body: { pin?: unknown }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ errore: 'body_non_valido' }, { status: 400 })
    }
    if (typeof body.pin !== 'string' || !/^\d{6}$/.test(body.pin)) {
      return NextResponse.json({ errore: 'formato_pin' }, { status: 400 })
    }

    const svc = getServiceClient()
    const ris = await risolviClientePortale(svc, token)
    if (ris.esito === 'errore') return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
    if (ris.esito === 'non_autorizzato') return NextResponse.json({ errore: 'non_autorizzato' }, { status: 401 })
    const cliente = ris.cliente

    // F5 — rate limit per-IP, contato sugli eventi audit PIN degli ultimi 15 min.
    // Best-effort sul conteggio (il lockout per-cliente resta la difesa primaria).
    const ip = ipDaRequest(req)
    if (ip) {
      const { count, error: rlErr } = await svc
        .from('portale_accessi')
        .select('id', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .in('azione', ['pin_ok', 'pin_errato', 'pin_bloccato'])
        .gte('created_at', new Date(Date.now() - RATE_LIMIT_FINESTRA_MS).toISOString())
      if (rlErr) {
        console.error('[portale pin] conteggio rate limit:', rlErr.message)
      } else if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return NextResponse.json({ errore: 'troppi_tentativi' }, { status: 429 })
      }
    }

    if (!cliente.portale_fatturazione_attiva) {
      return NextResponse.json({ errore: 'sezione_disattivata' }, { status: 403 })
    }
    if (!cliente.portale_pin_hash) {
      return NextResponse.json({ errore: 'pin_non_impostato' }, { status: 403 })
    }

    if (cliente.portale_pin_bloccato_fino_a && new Date(cliente.portale_pin_bloccato_fino_a).getTime() > Date.now()) {
      const okAudit = await logPortaleAudit(svc, {
        laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'pin_bloccato', req,
      })
      if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      return NextResponse.json(
        { errore: 'pin_bloccato', riprova_alle: cliente.portale_pin_bloccato_fino_a },
        { status: 429 },
      )
    }

    if (!verifyPin(body.pin, cliente.portale_pin_hash)) {
      const { data: esito, error: rpcErr } = await svc.rpc('portale_pin_tentativo_fallito', {
        p_cliente_id: cliente.id,
      })
      if (rpcErr || !esito || esito.length === 0) {
        console.error('[portale pin] rpc tentativo fallito:', rpcErr?.message)
        return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      }
      const { tentativi, bloccato_fino_a } = esito[0] as { tentativi: number; bloccato_fino_a: string | null }
      const appenaBloccato = bloccato_fino_a != null && new Date(bloccato_fino_a).getTime() > Date.now()
      const okAudit = await logPortaleAudit(svc, {
        laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id,
        azione: appenaBloccato ? 'pin_bloccato' : 'pin_errato',
        dettaglio: { tentativi }, req,
      })
      if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
      if (appenaBloccato) {
        return NextResponse.json({ errore: 'pin_bloccato', riprova_alle: bloccato_fino_a }, { status: 429 })
      }
      return NextResponse.json(
        { errore: 'pin_errato', tentativi_rimasti: Math.max(0, MAX_TENTATIVI_PIN - tentativi) },
        { status: 401 },
      )
    }

    // PIN corretto: reset contatori (best-effort), audit fail-loud, cookie di sessione.
    const { error: resetErr } = await svc
      .from('clienti')
      .update({ portale_pin_tentativi: 0, portale_pin_bloccato_fino_a: null })
      .eq('id', cliente.id)
    if (resetErr) console.error('[portale pin] reset tentativi:', resetErr.message)

    const okAudit = await logPortaleAudit(svc, {
      laboratorio_id: cliente.laboratorio_id, cliente_id: cliente.id, azione: 'pin_ok', req,
    })
    if (!okAudit) return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })

    const sessione = creaSessioneEconomica(cliente.id, cliente.portale_pin_generation)
    const res = NextResponse.json({ ok: true })
    res.headers.set(
      'Set-Cookie',
      `${SESSIONE_ECONOMICA_COOKIE}=${sessione}; Max-Age=${Math.floor(SESSIONE_ECONOMICA_DURATA_MS / 1000)}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    )
    return res
  } catch (err) {
    console.error('[portale pin] errore:', err)
    return NextResponse.json({ errore: 'errore_interno' }, { status: 500 })
  }
}
