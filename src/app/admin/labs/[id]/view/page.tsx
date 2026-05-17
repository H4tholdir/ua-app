import 'server-only'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getServerUserClient } from '@/lib/supabase/server-user'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

async function verifyAdmin() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo').eq('id', user.id).single()
  return utente?.ruolo === 'admin_sistema' ? user : null
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default async function AdminLabViewPage({ params }: Props) {
  const admin = await verifyAdmin()
  if (!admin) redirect('/login')

  const { id } = await params
  const svc = getServiceClient()

  const [labRes, utentiRes, clientiRes, lavoriRes] = await Promise.all([
    svc.from('laboratori').select('id, nome, ragione_sociale, partita_iva, codice_itca, stato, piano, created_at, trial_ends_at, stripe_subscription_status').eq('id', id).single(),
    svc.from('utenti').select('id, nome, cognome, email, ruolo, created_at').eq('laboratorio_id', id).is('deleted_at', null),
    svc.from('clienti').select('id, nome, cognome, ragione_sociale, partita_iva, created_at').eq('laboratorio_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(20),
    svc.from('lavori').select('id, numero_lavoro, stato, created_at, consegnato_at').eq('laboratorio_id', id).order('created_at', { ascending: false }).limit(10),
  ])

  const lab = labRes.data
  if (!lab) redirect('/admin/labs')

  const utenti = utentiRes.data ?? []
  const clienti = clientiRes.data ?? []
  const lavori = lavoriRes.data ?? []

  // KPI
  const totalClienti = clienti.length
  const totalLavori = lavori.length
  const lavoriConsegnati = lavori.filter(l => l.consegnato_at).length
  const lavoriInLavorazione = lavori.filter(l => !l.consegnato_at && l.stato !== 'annullato').length

  return (
    <div className="adm-detail">
      <Link href={`/admin/labs/${id}`} className="adm-back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        Torna al dettaglio lab
      </Link>

      {/* Header */}
      <div className="adm-dcard adm-animate">
        <div className="adm-dcard-title">
          Vista dati operativi — read-only
          <span className={`adm-badge ${lab.stato}`}>{lab.stato}</span>
        </div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Nome</div>
            <div className="adm-info-value">{lab.nome}</div>
          </div>
          <div>
            <div className="adm-info-label">Ragione sociale</div>
            <div className="adm-info-value">{lab.ragione_sociale ?? lab.nome}</div>
          </div>
          <div>
            <div className="adm-info-label">P.IVA</div>
            <div className="adm-info-value mono">{lab.partita_iva ?? '—'}</div>
          </div>
          <div>
            <div className="adm-info-label">Codice ITCA</div>
            <div className={`adm-info-value mono${lab.codice_itca ? ' ok' : ' warn'}`}>
              {lab.codice_itca ?? 'NON REGISTRATO'}{lab.codice_itca ? ' ✓' : ' ⚠'}
            </div>
          </div>
          <div>
            <div className="adm-info-label">Piano</div>
            <div className="adm-info-value">{lab.piano}</div>
          </div>
          <div>
            <div className="adm-info-label">Registrato il</div>
            <div className="adm-info-value dim">{fmtDate(lab.created_at)}</div>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.04s' }}>
        <div className="adm-dcard-title">KPI operativi</div>
        <div className="adm-info-grid">
          <div>
            <div className="adm-info-label">Utenti registrati</div>
            <div className="adm-info-value">{utenti.length}</div>
          </div>
          <div>
            <div className="adm-info-label">Clienti totali (ultimi 20)</div>
            <div className="adm-info-value">{totalClienti}</div>
          </div>
          <div>
            <div className="adm-info-label">Lavori (ultimi 10)</div>
            <div className="adm-info-value">{totalLavori}</div>
          </div>
          <div>
            <div className="adm-info-label">In lavorazione</div>
            <div className="adm-info-value">{lavoriInLavorazione}</div>
          </div>
          <div>
            <div className="adm-info-label">Consegnati</div>
            <div className="adm-info-value ok">{lavoriConsegnati}</div>
          </div>
        </div>
      </div>

      {/* Utenti */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.08s' }}>
        <div className="adm-dcard-title">Utenti ({utenti.length})</div>
        {utenti.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--adm-t3)' }}>Nessun utente</p>
        ) : (
          <div className="adm-user-list">
            {utenti.map(u => (
              <div key={u.id} className="adm-user-item">
                <div className="adm-avatar">
                  {(u.nome?.[0] ?? '?').toUpperCase()}{(u.cognome?.[0] ?? '').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="adm-user-name">{u.nome} {u.cognome ?? ''}</div>
                  <div className="adm-user-email">{u.email ?? '—'} · reg. {fmtDate(u.created_at)}</div>
                </div>
                <span className={`adm-badge ${u.ruolo}`}>{u.ruolo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ultimi 10 lavori */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.12s' }}>
        <div className="adm-dcard-title">Ultimi 10 lavori</div>
        {lavori.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--adm-t3)' }}>Nessun lavoro</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>N. Lavoro</th>
                  <th>Stato</th>
                  <th>Creato il</th>
                  <th>Consegnato il</th>
                </tr>
              </thead>
              <tbody>
                {lavori.map(l => (
                  <tr key={l.id}>
                    <td className="mono">{l.numero_lavoro ?? l.id.slice(0, 8)}</td>
                    <td>
                      <span className={`adm-badge ${l.stato ?? ''}`}>{l.stato ?? '—'}</span>
                    </td>
                    <td className="dim">{fmtDateTime(l.created_at)}</td>
                    <td className="dim">{l.consegnato_at ? fmtDateTime(l.consegnato_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ultimi 20 clienti */}
      <div className="adm-dcard adm-animate" style={{ animationDelay: '.16s' }}>
        <div className="adm-dcard-title">Clienti recenti ({clienti.length} mostrati)</div>
        {clienti.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--adm-t3)' }}>Nessun cliente</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Nome / Ragione sociale</th>
                  <th>P.IVA</th>
                  <th>Registrato il</th>
                </tr>
              </thead>
              <tbody>
                {clienti.map(c => (
                  <tr key={c.id}>
                    <td>
                      {c.ragione_sociale
                        ? c.ragione_sociale
                        : `${c.nome ?? ''} ${c.cognome ?? ''}`.trim() || '—'}
                    </td>
                    <td className="mono">{c.partita_iva ?? '—'}</td>
                    <td className="dim">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
