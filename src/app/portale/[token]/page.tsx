import { getServiceClient } from '@/lib/supabase/server-service'
import { headers } from 'next/headers'
import type { LavoroPortale, StatoLavoro, TipoDispositivo } from '@/types/domain'

type PageProps = { params: Promise<{ token: string }> }

/**
 * PHI minimizzata: "ROSSI MARIO" → "R. MARIO"
 */
function minimizzaPhi(nomeSnapshot: string | null): string | null {
  if (!nomeSnapshot) return null
  const parti = nomeSnapshot.trim().split(/\s+/)
  if (parti.length < 2) return parti[0]?.[0] ? `${parti[0][0]}.` : null
  const cognomeAbbreviato = `${parti[0][0]}.`
  const resto = parti.slice(1).join(' ')
  return `${cognomeAbbreviato} ${resto}`
}

const statoLabels: Record<StatoLavoro, string> = {
  ricevuto: 'Ricevuto',
  in_lavorazione: 'In lavorazione',
  in_prova: 'In prova',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
  in_ritardo: 'In ritardo',
}

const statoColors: Record<StatoLavoro, string> = {
  ricevuto: '#8899CC',
  in_lavorazione: '#4C6EF5',
  in_prova: '#FD7E14',
  pronto: '#2ECC9A',
  consegnato: '#2ECC9A',
  annullato: '#FA5252',
  in_ritardo: '#FA5252',
}

const tipoLabels: Record<TipoDispositivo, string> = {
  protesi_fissa: 'Protesi fissa',
  protesi_mobile: 'Protesi mobile',
  implantologia: 'Implantologia',
  cad_cam: 'CAD/CAM',
  scheletrato: 'Scheletrato',
  ortodonzia: 'Ortodonzia',
  provvisorio: 'Provvisorio',
  riparazione: 'Riparazione',
  altro: 'Altro',
}

function formatDataIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function LavoroCard({ lavoro }: { lavoro: LavoroPortale }) {
  const stato = lavoro.stato as StatoLavoro
  const tipo = lavoro.tipo_dispositivo as TipoDispositivo
  const statoColor = statoColors[stato] ?? '#8899CC'
  const statoLabel = statoLabels[stato] ?? stato
  const tipoLabel = tipoLabels[tipo] ?? tipo

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
          #{lavoro.numero_lavoro}
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            color: statoColor,
            background: `${statoColor}22`,
            borderRadius: '6px',
            padding: '3px 10px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {statoLabel}
        </span>
      </div>

      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          fontWeight: 600,
          color: '#111827',
          margin: '0 0 4px',
        }}
      >
        {lavoro.paziente_nome_snapshot ?? lavoro.descrizione}
      </p>

      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: '#6B7280',
          margin: '0 0 8px',
        }}
      >
        {tipoLabel}
        {lavoro.descrizione && lavoro.paziente_nome_snapshot
          ? ` — ${lavoro.descrizione}`
          : ''}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9CA3AF' }}>
          Consegna prevista
        </span>
        <time
          dateTime={lavoro.data_consegna_prevista}
          style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#374151' }}
        >
          {formatDataIT(lavoro.data_consegna_prevista)}
        </time>
      </div>

      {lavoro.spedizione_stato && lavoro.spedizione_tracking && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            background: '#F3F4F6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280' }}>
            Tracking:
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {lavoro.spedizione_tracking}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Link scaduto ──────────────────────────────────────────────
function LinkScaduto() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#F8F9FA',
      }}
    >
      <div
        style={{
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '40px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
          }}
        >
          ⚠
        </div>
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 12px',
          }}
        >
          Link scaduto
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: '#6B7280',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Questo link non è più valido.
          <br />
          Contatta il laboratorio per ricevere un nuovo link.
        </p>
      </div>
    </main>
  )
}

export default async function PortalePage({ params }: PageProps) {
  const { token } = await params

  const svc = getServiceClient()

  // Verifica token
  const { data: cliente, error: clienteError } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome, laboratorio_id, portale_token')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .single()

  if (clienteError || !cliente) {
    return <LinkScaduto />
  }

  // Log accesso (IP da header x-forwarded-for)
  const hdrs = await headers()
  const ipRaw = hdrs.get('x-forwarded-for')
  const ip = ipRaw ? ipRaw.split(',')[0].trim() : null

  // Tentativo log in portale_accessi (tabella opzionale — fallisce silenziosamente)
  try {
    await svc.from('portale_accessi').insert({
      cliente_id: cliente.id,
      laboratorio_id: cliente.laboratorio_id,
      ip_address: ip,
      accessed_at: new Date().toISOString(),
    })
  } catch {
    // Tabella non ancora nel DB — ignora
  }

  // Dati laboratorio
  const { data: lab } = await svc
    .from('laboratori')
    .select('nome, ragione_sociale, logo_url, telefono, email')
    .eq('id', cliente.laboratorio_id)
    .single()

  // Lavori aperti
  const { data: lavoriApertiRaw } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, stato, tipo_dispositivo, descrizione,
      data_consegna_prevista, data_consegna_effettiva,
      paziente_nome_snapshot, conformato, spedizione_stato, spedizione_tracking
    `)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .not('stato', 'in', '("consegnato","annullato")')
    .is('deleted_at', null)
    .order('data_consegna_prevista', { ascending: true })

  // Lavori consegnati (max 10)
  const { data: lavoriConsegnatiRaw } = await svc
    .from('lavori')
    .select(`
      id, numero_lavoro, stato, tipo_dispositivo, descrizione,
      data_consegna_prevista, data_consegna_effettiva,
      paziente_nome_snapshot, conformato, spedizione_stato, spedizione_tracking
    `)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .order('data_consegna_effettiva', { ascending: false })
    .limit(10)

  const mapLavoro = (l: Record<string, unknown>): LavoroPortale => ({
    id: l.id as string,
    numero_lavoro: l.numero_lavoro as string,
    stato: l.stato as LavoroPortale['stato'],
    tipo_dispositivo: l.tipo_dispositivo as LavoroPortale['tipo_dispositivo'],
    descrizione: l.descrizione as string,
    data_consegna_prevista: l.data_consegna_prevista as string,
    data_consegna_effettiva: (l.data_consegna_effettiva as string | null) ?? null,
    paziente_nome_snapshot: minimizzaPhi(l.paziente_nome_snapshot as string | null),
    conformato: l.conformato as boolean,
    ddc_signed_url: null,
    buono_signed_url: null,
    spedizione_stato: (l.spedizione_stato as LavoroPortale['spedizione_stato']) ?? null,
    spedizione_tracking: (l.spedizione_tracking as string | null) ?? null,
  })

  const lavoriAperti = (lavoriApertiRaw ?? []).map(mapLavoro)
  const lavoriConsegnati = (lavoriConsegnatiRaw ?? []).map(mapLavoro)

  const nomeStudio =
    cliente.studio_nome ??
    `Studio ${cliente.cognome}`

  return (
    <main style={{ minHeight: '100vh', background: '#F8F9FA' }}>
      {/* Header laboratorio */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          padding: '16px 20px',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {lab?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lab.logo_url}
              alt={lab.nome}
              style={{ height: '40px', objectFit: 'contain', marginBottom: '8px' }}
            />
          )}
          <h1
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              color: '#111827',
              margin: 0,
            }}
          >
            {lab?.nome ?? 'Laboratorio'}
          </h1>
          {lab?.telefono && (
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: '#6B7280',
                margin: '2px 0 0',
              }}
            >
              Tel: {lab.telefono}
            </p>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px 40px' }}>
        {/* Intestazione cliente */}
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '22px',
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 4px',
            }}
          >
            Ciao, {nomeStudio}
          </h2>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: '#6B7280',
              margin: 0,
            }}
          >
            Qui trovi lo stato dei tuoi lavori in corso e l&apos;archivio degli ultimi consegnati.
          </p>
        </div>

        {/* Lavori aperti */}
        <section style={{ marginBottom: '32px' }}>
          <h3
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 12px',
            }}
          >
            Lavori in corso ({lavoriAperti.length})
          </h3>

          {lavoriAperti.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '28px 20px',
                textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: '#9CA3AF',
                  margin: 0,
                }}
              >
                Nessun lavoro in corso
              </p>
            </div>
          ) : (
            lavoriAperti.map((lavoro) => (
              <LavoroCard key={lavoro.id} lavoro={lavoro} />
            ))
          )}
        </section>

        {/* Lavori consegnati */}
        {lavoriConsegnati.length > 0 && (
          <section>
            <h3
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 700,
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: '0 0 12px',
              }}
            >
              Ultimi consegnati
            </h3>
            {lavoriConsegnati.map((lavoro) => (
              <LavoroCard key={lavoro.id} lavoro={lavoro} />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
