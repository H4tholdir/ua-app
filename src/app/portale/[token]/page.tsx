import { getServiceClient } from '@/lib/supabase/server-service'
import { statoLabDaEmbed, portaleNonDisponibile } from '@/lib/portale/guardie'
import { headers } from 'next/headers'
import type { LavoroPortale, StatoLavoro, TipoDispositivo } from '@/types/domain'
import { minimizzaPhi } from '@/lib/portale/minimizza-phi'
import { FatturazioneSection } from '@/components/features/portale/FatturazioneSection'
import { LABEL_MACRO } from '@/lib/domain/tipi-lavoro'
// Task 8 dell'ondata «l'avviso al dentista» — la sezione «Avvisi dal
// laboratorio» (⚖️ D346, eredità ⚖️ D354). La lettura grezza degli avvisi
// resta `archivioCliente` (Task 6/9); la logica di raggruppamento/unione e la
// scrittura della ricevuta vivono in `avvisi/portale.ts`, testabili — questo
// file è un componente server asincrono che nessuna prova unitaria rende.
import { archivioCliente } from '@/lib/avvisi/queries'
import {
  raggruppaPerLavoro,
  lavoriPerLeCard,
  costruisciCardAvviso,
  segnaAvvisiVisti,
  type CardAvvisoPortale,
} from '@/lib/avvisi/portale'
import type { AzionePortale } from '@/lib/portale/audit'

type PageProps = { params: Promise<{ token: string }> }

const statoLabels: Record<StatoLavoro, string> = {
  ricevuto: 'Ricevuto',
  in_lavorazione: 'In lavorazione',
  in_prova: 'In prova',
  in_prova_esterna: 'In prova esterna',
  pronto: 'Pronto',
  consegnato: 'Consegnato',
  annullato: 'Annullato',
  sospeso: 'Sospeso',
  in_ritardo: 'In ritardo',
}

const statoColors: Record<StatoLavoro, string> = {
  ricevuto: '#8899CC',
  in_lavorazione: '#4C6EF5',
  in_prova: 'var(--amber, #FD7E14)',
  in_prova_esterna: '#E67700',
  pronto: '#2ECC9A',
  consegnato: '#2ECC9A',
  annullato: '#FA5252',
  sospeso: '#868E96',
  in_ritardo: '#FA5252',
}

// B4: label identiche allo standard → import diretto da LABEL_MACRO
const tipoLabels: Record<TipoDispositivo, string> = LABEL_MACRO

function formatDataIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Come `formatDataIT`, ma per un `timestamptz` vero (`created_at` di un
 * avviso) e non per una colonna DATE: qui NON si aggiunge `'T00:00:00'` — il
 * valore porta già un'ora, e sommarne un'altra produrrebbe una stringa non
 * valida.
 * 🛑 `timeZone: 'Europe/Rome'` è ESPLICITO: questo è un componente server, e
 * senza fuso `toLocaleDateString` formatta nel fuso del PROCESSO (UTC su
 * Vercel) — un avviso creato alle 00:30 di Roma mostrerebbe il giorno prima.
 */
function formatDataAvviso(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  })
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
            background: `color-mix(in srgb, ${statoColor} 13%, transparent)`,
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

      {(lavoro.ddc_signed_url || lavoro.buono_signed_url) && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {lavoro.ddc_signed_url && (
            <a
              href={lavoro.ddc_signed_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                background: '#F3F4F6',
                borderRadius: '8px',
                padding: '6px 10px',
                textDecoration: 'none',
              }}
              aria-label="Scarica Dichiarazione di Conformità"
            >
              📄 Dichiarazione di Conformità
            </a>
          )}
          {lavoro.buono_signed_url && (
            <a
              href={lavoro.buono_signed_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                background: '#F3F4F6',
                borderRadius: '8px',
                padding: '6px 10px',
                textDecoration: 'none',
              }}
              aria-label="Scarica Buono di Consegna"
            >
              🧾 Buono di Consegna
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Avvisi dal laboratorio (⚖️ D346, mockup B1 — «una sezione come le
//     altre», stessa card che il dentista già conosce) ───────────────────
function AvvisoCard({ avviso }: { avviso: CardAvvisoPortale }) {
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
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
          #{avviso.numeroLavoro}
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            color: '#92400E',
            background: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '6px',
            padding: '3px 10px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
        >
          Aggiornata
        </span>
      </div>

      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          fontWeight: 600,
          color: '#111827',
          margin: '6px 0 0',
        }}
      >
        {avviso.pazienteMostrato}
      </p>

      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: '#6B7280',
          margin: '3px 0 0',
        }}
      >
        {avviso.frase}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginTop: '10px',
        }}
      >
        {/* #6B7280 e non #9CA3AF: una parte NUOVA non eredita il difetto di
            contrasto misurato altrove nel portale (2,54:1 su bianco). */}
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B7280' }}>
          {formatDataAvviso(avviso.dataPiuRecente)}
        </span>
        {avviso.ddcUrl && (
          <a
            href={avviso.ddcUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '44px',
              padding: '0 14px',
              background: '#F3F4F6',
              borderRadius: '8px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              color: '#374151',
              textDecoration: 'none',
              border: '1px solid #E5E7EB',
            }}
            aria-label="Scarica la dichiarazione aggiornata"
          >
            📄 Dichiarazione aggiornata
          </a>
        )}
      </div>
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

  // Verifica token + TTL (portale_token_scade_at)
  const { data: cliente, error: clienteError } = await svc
    .from('clienti')
    .select('id, nome, cognome, studio_nome, laboratorio_id, portale_token, portale_token_scade_at, portale_fatturazione_attiva, laboratori(stato)')
    .eq('portale_token', token)
    .is('deleted_at', null)
    .single()

  if (clienteError || !cliente) {
    return <LinkScaduto />
  }

  // N13: lab blacklist → la pagina sparisce come un link non valido (stessa
  // risposta del token inesistente, PRIMA del check scadenza — no info-leak).
  // Senza questo check le API 404-ano ma la pagina servirebbe ancora dati
  // clinici/anagrafici a terzi. Shadow/kill-switch gestiti dal helper.
  const labStato = statoLabDaEmbed((cliente as { laboratori?: unknown }).laboratori)
  if (portaleNonDisponibile(labStato, 'portale/page')) {
    return <LinkScaduto />
  }

  // Verifica TTL token (portale_token_scade_at)
  const tokenScadenza = (cliente as Record<string, unknown>).portale_token_scade_at as string | null
  if (tokenScadenza && new Date(tokenScadenza) < new Date()) {
    return <LinkScaduto />
  }

  // Log accesso (IP da header x-forwarded-for)
  const hdrs = await headers()
  const ipRaw = hdrs.get('x-forwarded-for')
  const ip = ipRaw ? ipRaw.split(',')[0].trim() : null

  // Tentativo log in portale_accessi (tabella opzionale — fallisce silenziosamente)
  try {
    const { error: logErr } = await svc.from('portale_accessi').insert({
      cliente_id: cliente.id,
      laboratorio_id: cliente.laboratorio_id,
      ip_address: ip,
      azione: 'view_lavori',
    })
    if (logErr) console.error('[Portale] Audit log failed:', logErr.message)
  } catch {
    // Tabella non ancora nel DB — ignora
  }

  // ─── Task 8 — «Avvisi dal laboratorio»: UNA card per lavoro (⚖️ D354) ───
  // Lettura grezza riusata com'è (checklist §1): `archivioCliente` non ha un
  // cancello di ruolo — per il portale va bene così, il cancello è il token.
  const righeAvviso = await archivioCliente(svc, { clienteId: cliente.id, laboratorioId: cliente.laboratorio_id })
  const gruppiAvviso = raggruppaPerLavoro(righeAvviso)
  const lavoriConAvviso = await lavoriPerLeCard(svc, {
    lavoroIds: gruppiAvviso.map((g) => g.lavoroId),
    clienteId: cliente.id,
    laboratorioId: cliente.laboratorio_id,
  })
  const avvisiCards = costruisciCardAvviso(gruppiAvviso, lavoriConAvviso, { token })

  // Il visto (e il suo audit) si scrivono SOLO se c'è almeno una card
  // MOSTRATA — mai per una sezione vuota (trappola nota, §3 del brief). Gli
  // id vengono da `avvisiCards`, cioè DOPO il filtro sui lavori risolti: un
  // avviso il cui lavoro non si è risolto (difensivo) non riceve un visto per
  // qualcosa che il dentista non ha visto.
  if (avvisiCards.length > 0) {
    const azioneAvviso: AzionePortale = 'view_avviso'
    try {
      const { error: logAvvisoErr } = await svc.from('portale_accessi').insert({
        cliente_id: cliente.id,
        laboratorio_id: cliente.laboratorio_id,
        ip_address: ip,
        azione: azioneAvviso,
      })
      if (logAvvisoErr) console.error('[Portale] Audit log (view_avviso) failed:', logAvvisoErr.message)
    } catch {
      // Tabella non ancora nel DB — ignora, stesso ripiego del log sopra.
    }

    const idsDaSegnareVisti = avvisiCards.flatMap((c) => c.avvisoIds)
    await segnaAvvisiVisti(svc, idsDaSegnareVisti, cliente.laboratorio_id)
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
      paziente_nome_snapshot, conformato, spedizione_stato, spedizione_tracking,
      buono_storage_path,
      ddc:dichiarazioni_conformita(storage_path_pdf)
    `)
    .eq('cliente_id', cliente.id)
    .eq('laboratorio_id', cliente.laboratorio_id)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')
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

  const mapLavoroConsegnato = (l: Record<string, unknown>): LavoroPortale => {
    const base = mapLavoro(l)
    // Normalizzazione difensiva: PostgREST può restituire una relazione
    // embedded come oggetto singolo o array a seconda di come inferisce la
    // cardinalità — non assumere una forma specifica per questo confine esterno.
    const ddcRaw = l.ddc as { storage_path_pdf: string | null } | { storage_path_pdf: string | null }[] | null
    const ddcRow = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw
    const hasDdc = !!ddcRow?.storage_path_pdf
    const hasBuono = !!(l.buono_storage_path as string | null)
    return {
      ...base,
      ddc_signed_url: hasDdc ? `/api/portale/${token}/lavori/${l.id as string}/ddc` : null,
      buono_signed_url: hasBuono ? `/api/portale/${token}/lavori/${l.id as string}/buono` : null,
    }
  }

  const lavoriAperti = (lavoriApertiRaw ?? []).map(mapLavoro)
  const lavoriConsegnati = (lavoriConsegnatiRaw ?? []).map(mapLavoroConsegnato)

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
          <a
            href={`/richiedi/${token}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '44px',
              padding: '0 14px',
              marginTop: '12px',
              borderRadius: '8px',
              background: '#F3F4F6',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: '#374151',
              textDecoration: 'none',
            }}
          >
            ➕ Richiedi nuovo lavoro
          </a>
        </div>

        {/* Avvisi dal laboratorio — ⚖️ D346 (Variante B1), eredità ⚖️ D354.
            In cima, SOPRA i lavori in corso; niente sezione se non c'è nulla
            da mostrare (checklist §3: zero avvisi → niente scrittura visto). */}
        {avvisiCards.length > 0 && (
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
              Avvisi dal laboratorio ({avvisiCards.length})
            </h3>
            {avvisiCards.map((avviso) => (
              <AvvisoCard key={avviso.lavoroId} avviso={avviso} />
            ))}
          </section>
        )}

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

        {/* Sezione economica — solo se l'interruttore lab è attivo */}
        {cliente.portale_fatturazione_attiva && (
          <FatturazioneSection token={token} nomeLaboratorio={lab?.ragione_sociale ?? null} />
        )}
      </div>
    </main>
  )
}
