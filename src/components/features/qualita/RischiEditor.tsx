'use client'
import { useRef, useState } from 'react'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

export interface RischioItem {
  id: string
  rischio: string
  causa: string
  probabilita: number
  gravita: number
  rpn: number
  misura: string
}

export interface NormaItem {
  codice: string
  titolo: string
  anno?: number
}

interface RischiEditorProps {
  rischioId: string
  tipoDispositivoLabel: string
  versioneIniziale: number
  dataRevisioneIniziale: string
  rischiIniziali: RischioItem[]
  rischiResiduiIniziali: string | null
  misureControlloIniziali: string | null
  normeIniziali: NormaItem[]
}

const LIVELLI: Array<[number, string]> = [
  [1, 'Bassa'],
  [2, 'Media'],
  [3, 'Alta'],
]

function rpnColor(rpn: number): string {
  if (rpn <= 3) return 'var(--c-green, #22C55E)'
  if (rpn <= 6) return 'var(--c-amber, #F59E0B)'
  return 'var(--c-red, #EF4444)'
}

function nuovoRischioVuoto(numero: number): RischioItem {
  return {
    id: `R${String(numero).padStart(2, '0')}`,
    rischio: '',
    causa: '',
    probabilita: 1,
    gravita: 1,
    rpn: 1,
    misura: '',
  }
}

function nuovaNormaVuota(): NormaItem {
  return { codice: '', titolo: '' }
}

function prossimoNumero(rischi: RischioItem[]): number {
  let max = 0
  for (const r of rischi) {
    const match = r.id.match(/(\d+)$/)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > max) max = n
    }
  }
  return max
}

export function RischiEditor({
  rischioId,
  tipoDispositivoLabel,
  versioneIniziale,
  dataRevisioneIniziale,
  rischiIniziali,
  rischiResiduiIniziali,
  misureControlloIniziali,
  normeIniziali,
}: RischiEditorProps) {
  const [rischi, setRischi] = useState<RischioItem[]>(rischiIniziali)
  const [rischiResidui, setRischiResidui] = useState(rischiResiduiIniziali ?? '')
  const [misureControllo, setMisureControllo] = useState(misureControlloIniziali ?? '')
  const [norme, setNorme] = useState<NormaItem[]>(normeIniziali)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contatore = useRef(prossimoNumero(rischiIniziali))

  const aggiornaRischio = (index: number, patch: Partial<RischioItem>) => {
    setRischi(prev =>
      prev.map((r, i) => {
        if (i !== index) return r
        const next = { ...r, ...patch }
        return { ...next, rpn: next.probabilita * next.gravita }
      })
    )
  }

  const aggiungiRischio = () => {
    contatore.current += 1
    setRischi(prev => [...prev, nuovoRischioVuoto(contatore.current)])
    hapticLight()
  }

  const rimuoviRischio = (index: number) => {
    setRischi(prev => prev.filter((_, i) => i !== index))
    hapticLight()
  }

  const aggiornaNorma = (index: number, patch: Partial<NormaItem>) => {
    setNorme(prev => prev.map((n, i) => (i === index ? { ...n, ...patch } : n)))
  }

  const aggiungiNorma = () => {
    setNorme(prev => [...prev, nuovaNormaVuota()])
    hapticLight()
  }

  const rimuoviNorma = (index: number) => {
    setNorme(prev => prev.filter((_, i) => i !== index))
    hapticLight()
  }

  const handleSave = async () => {
    setError(null)

    if (rischi.length === 0) {
      setError('Aggiungi almeno un rischio prima di salvare')
      return
    }

    for (let i = 0; i < rischi.length; i++) {
      const r = rischi[i]
      if (!r.rischio.trim()) {
        setError(`Rischio #${i + 1}: campo "rischio" obbligatorio`)
        return
      }
      if (!r.causa.trim()) {
        setError(`Rischio #${i + 1}: campo "causa" obbligatorio`)
        return
      }
      if (!r.misura.trim()) {
        setError(`Rischio #${i + 1}: campo "misura" obbligatorio`)
        return
      }
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch(`/api/qualita/rischi/${rischioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rischi_json: rischi,
          norme_json: norme,
          rischi_residui: rischiResidui.trim() || null,
          misure_controllo: misureControllo.trim() || null,
        }),
      })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setSaving(false)
        return
      }

      hapticMedium()
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setSaving(false)
    }
  }

  const fontFamily = "'DM Sans', system-ui, sans-serif"

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    background: 'var(--elv, #EDEDEA)',
    border: '1px solid var(--prs, #D4CFC9)',
    borderRadius: 9,
    fontSize: 13,
    color: 'var(--t1)',
    fontFamily,
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--t2)',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    fontFamily,
    marginBottom: 3,
    display: 'block',
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  }

  return (
    <div style={{ padding: '0 20px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6, fontFamily }}>
          {tipoDispositivoLabel}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--t2)', fontFamily }}>
          <span>Versione attuale: v{versioneIniziale}</span>
          <span>Ultima revisione: {dataRevisioneIniziale}</span>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontFamily, fontSize: 13, color: 'var(--primary, #D90012)' }}>
          {error}
        </p>
      )}

      {rischi.map((r, i) => (
        <div key={r.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', fontFamily }}>Rischio {i + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 100,
                  color: rpnColor(r.rpn),
                  background: 'var(--elv, #EDEDEA)',
                  fontFamily,
                }}
              >
                RPN {r.rpn}
              </span>
              <button
                type="button"
                onClick={() => rimuoviRischio(i)}
                aria-label={`Rimuovi rischio ${i + 1}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #D90012)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily,
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 10px',
                }}
              >
                Rimuovi
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle} htmlFor={`rischio-${i}-descrizione`}>Rischio {i + 1} — Descrizione rischio</label>
              <input
                id={`rischio-${i}-descrizione`}
                style={inputStyle}
                value={r.rischio}
                onChange={e => aggiornaRischio(i, { rischio: e.target.value })}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor={`rischio-${i}-causa`}>Rischio {i + 1} — Causa</label>
              <input
                id={`rischio-${i}-causa`}
                style={inputStyle}
                value={r.causa}
                onChange={e => aggiornaRischio(i, { causa: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle} htmlFor={`rischio-${i}-probabilita`}>Rischio {i + 1} — Probabilità</label>
                <select
                  id={`rischio-${i}-probabilita`}
                  style={inputStyle}
                  value={r.probabilita}
                  onChange={e => aggiornaRischio(i, { probabilita: Number(e.target.value) })}
                >
                  {LIVELLI.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor={`rischio-${i}-gravita`}>Rischio {i + 1} — Gravità</label>
                <select
                  id={`rischio-${i}-gravita`}
                  style={inputStyle}
                  value={r.gravita}
                  onChange={e => aggiornaRischio(i, { gravita: Number(e.target.value) })}
                >
                  {LIVELLI.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle} htmlFor={`rischio-${i}-misura`}>Rischio {i + 1} — Misura di controllo</label>
              <textarea
                id={`rischio-${i}-misura`}
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={r.misura}
                onChange={e => aggiornaRischio(i, { misura: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={aggiungiRischio}
        style={{
          padding: '10px 14px',
          borderRadius: 10,
          border: '1px dashed var(--prs, #D4CFC9)',
          background: 'transparent',
          color: 'var(--t2)',
          fontWeight: 600,
          fontSize: 13,
          fontFamily,
          cursor: 'pointer',
          minHeight: 44,
        }}
      >
        + Aggiungi rischio
      </button>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 10, fontFamily }}>
          Norme armonizzate applicate
        </div>
        {norme.map((n, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle} htmlFor={`norma-${i}-codice`}>Norma {i + 1} — Codice</label>
                <input
                  id={`norma-${i}-codice`}
                  style={inputStyle}
                  value={n.codice}
                  onChange={e => aggiornaNorma(i, { codice: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => rimuoviNorma(i)}
                aria-label={`Rimuovi norma ${i + 1}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #D90012)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily,
                  minHeight: 44,
                  alignSelf: 'flex-end',
                }}
              >
                Rimuovi
              </button>
            </div>
            <div>
              <label style={labelStyle} htmlFor={`norma-${i}-titolo`}>Norma {i + 1} — Titolo</label>
              <input
                id={`norma-${i}-titolo`}
                style={inputStyle}
                value={n.titolo}
                onChange={e => aggiornaNorma(i, { titolo: e.target.value })}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={aggiungiNorma}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px dashed var(--prs, #D4CFC9)',
            background: 'transparent',
            color: 'var(--t2)',
            fontWeight: 600,
            fontSize: 13,
            fontFamily,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          + Aggiungi norma
        </button>
      </div>

      <div style={cardStyle}>
        <label style={labelStyle} htmlFor="rischi-residui">Rischi residui (sintesi)</label>
        <textarea
          id="rischi-residui"
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical', marginBottom: 12 }}
          value={rischiResidui}
          onChange={e => setRischiResidui(e.target.value)}
        />

        <label style={labelStyle} htmlFor="misure-controllo">Misure di controllo generali</label>
        <textarea
          id="misure-controllo"
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={misureControllo}
          onChange={e => setMisureControllo(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: '13px',
          background: saving ? 'var(--prs)' : 'var(--primary, #D90012)',
          color: 'white',
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 15,
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily,
          minHeight: 48,
        }}
      >
        {saving ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </div>
  )
}
