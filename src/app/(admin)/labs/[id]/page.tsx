import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase/server-service'
import LabActions from './lab-actions'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function AdminLabDetailPage({ params }: Props) {
  const { id } = await params
  const svc = getServiceClient()

  const [labRes, utentiRes, invitesRes, logRes] = await Promise.all([
    svc.from('laboratori').select('*').eq('id', id).single(),
    svc.from('utenti').select('id, nome, cognome, email, ruolo').eq('laboratorio_id', id),
    svc.from('inviti')
      .select('id, email, ruolo, expires_at, created_at')
      .eq('laboratorio_id', id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
    svc.from('lab_stato_log')
      .select('stato_from, stato_to, source, actor, created_at')
      .eq('laboratorio_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const lab = labRes.data
  if (!lab) redirect('/admin/labs')

  const utenti = utentiRes.data ?? []
  const invites = invitesRes.data ?? []
  const log = logRes.data ?? []

  const isYearly = lab.stripe_price_id?.includes('yearly') ?? false
  const piano = lab.piano === 'rete' ? 'Rete' : 'Lab'
  const freq  = isYearly ? 'annuale' : 'mensile'
  const price = lab.piano === 'rete' ? (isYearly ? 1490 : 149) : (isYearly ? 490 : 49)
  const priceLabel = isYearly
    ? `€${price.toLocaleString('it-IT')}/anno (€${Math.round(price / 12)}/mese)`
    : `€${price}/mese`

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="adm-detail">
      <Link href="/admin/labs" className="adm-back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        Tutti i laboratori
      </Link>

      {/* 1 — ANAGRAFICA COMPLETA */}
      <div className="adm-dcard adm-animate">
        <div className="adm-dcard-title">
          Anagrafica laboratorio
          <span className={`adm-badge ${lab.stato}`}>{lab.stato}</span>
          {lab.piano === 'rete' && <span className="adm-badge rete">Rete</span>}
        </div>

        <div className="adm-sub-label">Identità</div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Nome commerciale</div>
            <div className="adm-info-value">{lab.nome}</div>
          </div>
          <div>
            <div className="adm-info-label">Ragione sociale</div>
            <div className="adm-info-value">{lab.ragione_sociale ?? lab.nome}</div>
          </div>
          <div>
            <div className="adm-info-label">Forma giuridica</div>
            <div className="adm-info-value adm-info-value--dim">{(lab as Record<string, string>).forma_giuridica ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Titolare / Responsabile</div>
            <div className="adm-info-value">{utenti.find(u => u.ruolo === 'titolare')
              ? `${utenti.find(u => u.ruolo === 'titolare')!.nome} ${utenti.find(u => u.ruolo === 'titolare')!.cognome ?? ''}`.trim()
              : '—'}
            </div>
          </div>
        </div>

        <div className="adm-sub-label">Dati fiscali</div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">P.IVA</div>
            <div className="adm-info-value mono">{lab.partita_iva}</div>
          </div>
          <div>
            <div className="adm-info-label">Codice Fiscale</div>
            <div className="adm-info-value mono">{(lab as Record<string, string>).codice_fiscale ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Codice ATECO</div>
            <div className="adm-info-value mono">32.50.20</div>
          </div>
          <div>
            <div className="adm-info-label">N. REA</div>
            <div className="adm-info-value mono">{(lab as Record<string, string>).numero_rea ?? '—'}</div>
          </div>
        </div>

        <div className="adm-sub-label">Registro sanitario</div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Codice ITCA</div>
            <div className={`adm-info-value mono${lab.codice_itca ? ' ok' : ' warn'}`}>
              {lab.codice_itca ?? 'NON REGISTRATO'}{lab.codice_itca ? ' ✓' : ' ⚠'}
            </div>
          </div>
          <div>
            <div className="adm-info-label">N. iscrizione Min. Salute</div>
            <div className="adm-info-value mono">{(lab as Record<string, string>).numero_ministeriale ?? '—'}</div>
          </div>
        </div>

        <div className="adm-sub-label">Sedi</div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Sede legale</div>
            <div className="adm-info-value">{(lab as Record<string, string>).indirizzo_legale ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Sede operativa</div>
            <div className="adm-info-value">{(lab as Record<string, string>).indirizzo_operativo ?? '—'}</div>
          </div>
        </div>

        <div className="adm-sub-label">Contatti</div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">PEC</div>
            <div className="adm-info-value">{(lab as Record<string, string>).pec ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Email</div>
            <div className="adm-info-value">{(lab as Record<string, string>).email ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Telefono</div>
            <div className="adm-info-value">{(lab as Record<string, string>).telefono ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Sito web</div>
            <div className="adm-info-value dim">{(lab as Record<string, string>).sito_web ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* 2 — ABBONAMENTO */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.04s' }}>
        <div className="adm-dcard-title">Abbonamento &amp; Fatturazione</div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Piano</div>
            <div className="adm-info-value">
              <span className={`adm-badge ${lab.piano === 'rete' ? 'rete' : 'mensile'}`}>{piano}</span>
            </div>
          </div>
          <div>
            <div className="adm-info-label">Frequenza · Prezzo</div>
            <div className="adm-info-value">
              <span className={`adm-badge ${isYearly ? 'annuale' : 'mensile'}`}>{freq}</span>
              {' '}· {priceLabel}
            </div>
          </div>
          <div>
            <div className="adm-info-label">Stato Stripe</div>
            <div className={`adm-info-value ${lab.stripe_subscription_status === 'active' ? 'ok' : lab.stripe_subscription_status === 'past_due' ? 'err' : 'dim'}`}>
              {lab.stripe_subscription_status ? `● ${lab.stripe_subscription_status}` : '—'}
            </div>
          </div>
          <div>
            <div className="adm-info-label">Trial ends at</div>
            <div className="adm-info-value dim">{fmtDate(lab.trial_ends_at)}</div>
          </div>
          <div>
            <div className="adm-info-label">Stripe Customer ID</div>
            <div className="adm-info-value mono">{lab.stripe_customer_id ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Stripe Subscription ID</div>
            <div className="adm-info-value mono">{lab.stripe_subscription_id ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Price ID</div>
            <div className="adm-info-value mono">{lab.stripe_price_id ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Registrato il</div>
            <div className="adm-info-value dim">{fmtDate(lab.created_at)}</div>
          </div>
        </div>
      </div>

      {/* 3 — AZIONI (client component) */}
      <LabActions
        labId={id}
        currentStato={lab.stato}
        trialEndsAt={lab.trial_ends_at}
        stripeCustomerId={lab.stripe_customer_id}
        utenti={utenti}
        invites={invites}
        log={log}
      />
    </div>
  )
}
