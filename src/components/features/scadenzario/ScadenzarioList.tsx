'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'
import { buildWhatsappSollecito, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClienteSnap {
  id: string
  nome: string
  cognome: string
  studio_nome: string | null
  telefono: string | null
}

interface FatturaInsoluta {
  id: string
  numero: string
  data: string
  totale: number
  stato_sdi: string
  pagata: boolean
}

interface InsolutoCliente {
  cliente: ClienteSnap
  fatture: FatturaInsoluta[]
  totale_insoluto: number
  giorni_max_ritardo: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

function urgencyColor(giorni: number): string {
  if (giorni > 60) return '#D90012'   // rosso urgente
  if (giorni >= 30) return 'var(--gold, #D4A843)'  // oro / amber
  return 'var(--t2, #96918D)'                    // blu cobalto normale
}

function urgencyLabel(giorni: number): string {
  if (giorni > 60) return 'Urgente'
  if (giorni >= 30) return 'In ritardo'
  return 'In sospeso'
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function InsolutoCard({
  item,
  index,
}: {
  item: InsolutoCliente
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const reducedMotion = useReducedMotion()
  const color = urgencyColor(item.giorni_max_ritardo)
  const label = urgencyLabel(item.giorni_max_ritardo)
  const nomeDisplay =
    item.cliente.studio_nome ?? `${item.cliente.nome} ${item.cliente.cognome}`

  // Capture render time once via lazy useState initializer
  // (ESLint react-hooks/purity disallows Date.now() in render body directly)
  const [now] = useState<number>(() => Date.now())
  const fattureConGiorni = useMemo(
    () =>
      item.fatture.map((f) => ({
        ...f,
        giorniRitardo: Math.floor(
          (now - new Date(f.data).getTime()) / 86_400_000
        ),
      })),
    [item.fatture, now]
  )

  const whatsappMsg = buildWhatsappSollecito({
    studioNome: item.cliente.studio_nome ?? `${item.cliente.nome} ${item.cliente.cognome}`,
    totaleInsoluto: item.totale_insoluto,
  })
  const whatsappUrl = buildWhatsappUrl(whatsappMsg, item.cliente.telefono ?? undefined)

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface, #E4DFD9)',
    borderRadius: '16px',
    padding: '16px',
    margin: '0 16px 12px',
    boxShadow:
      'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
    cursor: 'pointer',
    userSelect: 'none',
  }

  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(12px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={reducedMotion ? { duration: 0 } : { ...t('normal', 'enter'), delay: index * 0.04 }}
    >
      {/* Main card row */}
      <div
        style={cardStyle}
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${nomeDisplay} — ${fmt.format(item.totale_insoluto)} in sospeso`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v)
        }}
      >
        {/* Row top: nome + badge urgenza */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                color: 'var(--t1, #1C1916)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nomeDisplay}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--t2, #96918D)',
              }}
            >
              {item.fatture.length} {item.fatture.length === 1 ? 'fattura' : 'fatture'} non pagate
            </p>
          </div>

          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              color: color,
              background: `${color}22`,
              borderRadius: '8px',
              padding: '3px 8px',
              flexShrink: 0,
              border: `1px solid ${color}44`,
            }}
          >
            {label}
          </span>
        </div>

        {/* Row bottom: totale + giorni */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              color: color,
            }}
          >
            {fmt.format(item.totale_insoluto)}
          </span>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--t2, #96918D)',
            }}
          >
            max {item.giorni_max_ritardo}gg
          </span>
        </div>
      </div>

      {/* Expanded detail — CSS grid-template-rows evita animate su height */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          transition: reducedMotion ? 'none' : 'grid-template-rows var(--tr, 0.18s cubic-bezier(0.2,0,0,1))',
          margin: '0 16px',
          overflow: 'hidden',
        }}
      >
        <div style={{ minHeight: 0 }}>
            <div
              style={{
                background: 'var(--elv, #EDEDEA)',
                borderRadius: '0 0 14px 14px',
                padding: '12px 16px 16px',
                marginBottom: '12px',
                boxShadow:
                  'inset 3px 3px 8px rgba(0,0,0,.06), inset -2px -2px 6px rgba(255,255,255,.70)',
              }}
            >
              {/* Fatture list */}
              <ul
                style={{
                  listStyle: 'none',
                  margin: '0 0 14px',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {fattureConGiorni.map((f) => (
                  <li
                    key={f.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        color: 'var(--t1, #1C1916)',
                      }}
                    >
                      {f.numero}
                    </span>
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '13px',
                        color: 'var(--t2, #96918D)',
                      }}
                    >
                      {new Date(f.data).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {f.giorniRitardo}gg
                    </span>
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        fontWeight: 600,
                        color: urgencyColor(f.giorniRitardo),
                        marginLeft: 'auto',
                      }}
                    >
                      {fmt.format(f.totale)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* WhatsApp sollecito CTA */}
              {item.cliente.telefono && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '52px',
                    padding: '12px 20px',
                    background: '#25D366',
                    color: '#fff',
                    borderRadius: '100px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: '15px',
                    textDecoration: 'none',
                    boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Invia sollecito WhatsApp a ${nomeDisplay}`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Invia sollecito
                </a>
              )}
            </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── ScadenzarioList ──────────────────────────────────────────────────────────

export function ScadenzarioList() {
  const [items, setItems] = useState<InsolutoCliente[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/scadenzario', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Errore ${res.status}`)
        return res.json() as Promise<InsolutoCliente[]>
      })
      .then(setItems)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      })

    return () => controller.abort()
  }, [])

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          color: '#D90012',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
        }}
      >
        Impossibile caricare lo scadenzario: {error}
      </div>
    )
  }

  if (items === null) {
    return (
      <div
        style={{
          padding: '20px',
          color: 'var(--t2, #96918D)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
        }}
      >
        Caricamento...
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 32px',
          textAlign: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '40px', lineHeight: 1 }}>✅</span>
        <p
          style={{
            margin: 0,
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            fontSize: '17px',
            color: 'var(--success, #16A34A)',
          }}
        >
          Nessun insoluto
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: 'var(--t2, #96918D)',
          }}
        >
          Tutti i pagamenti sono in regola.
        </p>
      </div>
    )
  }

  // Summary header
  const totaleComplessivo = items.reduce((sum, i) => sum + i.totale_insoluto, 0)

  return (
    <div>
      {/* Summary banner */}
      <div
        style={{
          margin: '0 16px 20px',
          padding: '14px 16px',
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '14px',
          boxShadow:
            'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'var(--t2, #96918D)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Totale insoluto
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              color: 'var(--gold, #D4A843)',
            }}
          >
            {fmt.format(totaleComplessivo)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'var(--t2, #96918D)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Clienti
          </p>
          <p
            style={{
              margin: '2px 0 0',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              color: 'var(--t1, #1C1916)',
            }}
          >
            {items.length}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div>
        {items.map((item, index) => (
          <InsolutoCard key={item.cliente.id} item={item} index={index} />
        ))}
      </div>
    </div>
  )
}
