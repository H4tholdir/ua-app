'use client'

import type { Lavoro, LavoroAppuntamento, Corriere } from '@/types/domain'
import { inputBase, labelStyle, fieldStyle, sectionSeparator, sectionTitle } from './styles'

// ─── URL tracking corrieri ───────────────────────────────────
const TRACKING_URLS: Record<Corriere, string | null> = {
  gls:     'https://www.gls-italy.com/it/privati/strumenti/tracking/',
  brt:     'https://vas.brt.it/vas/sped_det_show.hsm',
  dhl:     'https://www.dhl.com/it-it/home/tracking.html',
  sda:     'https://www.sda.it/SDA_WEB_BASE/jsp/GetSpedMonitoraggio.do',
  ups:     'https://www.ups.com/track',
  fedex:   'https://www.fedex.com/it-it/tracking.html',
  interno: null,
  altro:   null,
}

interface TabDateProps {
  data: Partial<Lavoro>
  onChange: (u: Partial<Lavoro>) => void
  appuntamenti: LavoroAppuntamento[]
}

export function TabDate({ data, onChange }: TabDateProps) {
  const corriere = data.spedizione_corriere ?? null
  const tracking = data.spedizione_tracking ?? null
  const trackingUrl = corriere && tracking ? TRACKING_URLS[corriere] : null

  return (
    <div>
      {/* ═══ DATE PROVE ══════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionTitle}>Date prove</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
          }}
        >
          {/* Prima prova */}
          <div style={fieldStyle}>
            <label htmlFor="data_prima_prova" style={labelStyle}>
              1ª prova
            </label>
            <input
              id="data_prima_prova"
              type="date"
              value={data.data_prima_prova ?? ''}
              onChange={(e) =>
                onChange({ data_prima_prova: e.target.value || null })
              }
              style={{ ...inputBase, colorScheme: 'light' }}
            />
          </div>

          {/* Seconda prova */}
          <div style={fieldStyle}>
            <label htmlFor="data_seconda_prova" style={labelStyle}>
              2ª prova
            </label>
            <input
              id="data_seconda_prova"
              type="date"
              value={data.data_seconda_prova ?? ''}
              onChange={(e) =>
                onChange({ data_seconda_prova: e.target.value || null })
              }
              style={{ ...inputBase, colorScheme: 'light' }}
            />
          </div>

          {/* Terza prova */}
          <div style={fieldStyle}>
            <label htmlFor="data_terza_prova" style={labelStyle}>
              3ª prova
            </label>
            <input
              id="data_terza_prova"
              type="date"
              value={data.data_terza_prova ?? ''}
              onChange={(e) =>
                onChange({ data_terza_prova: e.target.value || null })
              }
              style={{ ...inputBase, colorScheme: 'light' }}
            />
          </div>
        </div>
      </div>

      <div style={sectionSeparator} />

      {/* ═══ SPEDIZIONE ═══════════════════════════════════════ */}
      <div>
        <p style={sectionTitle}>Spedizione</p>

        {/* Corriere */}
        <div style={fieldStyle}>
          <label htmlFor="spedizione_corriere" style={labelStyle}>
            Corriere
          </label>
          <select
            id="spedizione_corriere"
            value={data.spedizione_corriere ?? ''}
            onChange={(e) =>
              onChange({
                spedizione_corriere: (e.target.value as Corriere) || null,
              })
            }
            style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
          >
            <option value="">Seleziona corriere...</option>
            <option value="gls">GLS</option>
            <option value="brt">BRT / Bartolini</option>
            <option value="dhl">DHL</option>
            <option value="sda">SDA</option>
            <option value="ups">UPS</option>
            <option value="fedex">FedEx</option>
            <option value="interno">Consegna interna</option>
            <option value="altro">Altro</option>
          </select>
        </div>

        {/* Tracking */}
        <div style={fieldStyle}>
          <label htmlFor="spedizione_tracking" style={labelStyle}>
            Numero tracking
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              id="spedizione_tracking"
              type="text"
              placeholder="Es. 12345678901"
              value={data.spedizione_tracking ?? ''}
              onChange={(e) =>
                onChange({ spedizione_tracking: e.target.value || null })
              }
              style={{ ...inputBase, flex: 1 }}
            />
            {trackingUrl && tracking && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '48px',
                  minHeight: '52px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  background: 'var(--surface, #E4DFD9)',
                  color: '#D4A843',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  flexShrink: 0,
                  boxShadow:
                    'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                }}
                aria-label={`Traccia spedizione su ${corriere?.toUpperCase()}`}
              >
                Traccia
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 10L10 2M5 2h5v5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Data prevista spedizione */}
        <div style={fieldStyle}>
          <label htmlFor="spedizione_data_prevista" style={labelStyle}>
            Data prevista spedizione
          </label>
          <input
            id="spedizione_data_prevista"
            type="date"
            value={data.spedizione_data_prevista ?? ''}
            onChange={(e) =>
              onChange({ spedizione_data_prevista: e.target.value || null })
            }
            style={{ ...inputBase, colorScheme: 'light' }}
          />
        </div>
      </div>
    </div>
  )
}
