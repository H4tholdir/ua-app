'use client'

import { useEffect, useRef, useState } from 'react'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'
import { CicloNuovoSheet } from './CicloNuovoSheet'
import { CicloDeleteButton } from './CicloDeleteButton'

export interface FaseItem {
  id?: string
  codice_fase: string
  descrizione: string
  obbligatoria: boolean
  attrezzatura: string | null
  controllo_misura: string | null
  esito_atteso: string | null
  materiali_nota: string | null
}

interface LibreriaResult {
  codice_fase: string
  descrizione: string
  attrezzatura: string | null
  controllo_misura: string | null
  esito_atteso: string | null
  materiali_nota: string | null
  obbligatoria: boolean
}

interface CicloFasiEditorProps {
  cicloId: string
  nomeCiclo: string
  fasiIniziali: FaseItem[]
  ultimaModificaLabel: string | null
  headerActions?: {
    codice: string
    tipoDispositivo: string
    classeRischio: string | null
    creatoDaLabel: string | null
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

function faseVuota(): FaseItem {
  return {
    codice_fase: '',
    descrizione: '',
    obbligatoria: true,
    attrezzatura: null,
    controllo_misura: null,
    esito_atteso: null,
    materiali_nota: null,
  }
}

export function CicloFasiEditor({ cicloId, nomeCiclo, fasiIniziali, ultimaModificaLabel, headerActions }: CicloFasiEditorProps) {
  const [fasi, setFasi] = useState<FaseItem[]>(fasiIniziali)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [libreriaQuery, setLibreriaQuery] = useState('')
  const [libreriaResults, setLibreriaResults] = useState<LibreriaResult[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  function handleLibreriaSearch(q: string) {
    setLibreriaQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setLibreriaResults([]); return }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/fasi-produzione/ricerca?q=${encodeURIComponent(q)}`)
      const json = res.ok ? await res.json() : { fasi: [] }
      setLibreriaResults(Array.isArray(json.fasi) ? json.fasi : [])
    }, 200)
  }

  function aggiungiDaLibreria(r: LibreriaResult) {
    setFasi((prev) => [...prev, {
      codice_fase: r.codice_fase,
      descrizione: r.descrizione,
      obbligatoria: r.obbligatoria,
      attrezzatura: r.attrezzatura,
      controllo_misura: r.controllo_misura,
      esito_atteso: r.esito_atteso,
      materiali_nota: r.materiali_nota,
    }])
    setLibreriaQuery('')
    setLibreriaResults([])
    hapticLight()
  }

  function aggiungiVuota() {
    setFasi((prev) => [...prev, faseVuota()])
    hapticLight()
  }

  function aggiornaFase(index: number, patch: Partial<FaseItem>) {
    setFasi((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function rimuoviFase(index: number) {
    setFasi((prev) => prev.filter((_, i) => i !== index))
    hapticLight()
  }

  async function handleSave() {
    setError(null)

    for (let i = 0; i < fasi.length; i++) {
      if (!fasi[i].codice_fase.trim()) {
        setError(`Fase ${i + 1}: campo "codice" obbligatorio`)
        return
      }
      if (!fasi[i].descrizione.trim()) {
        setError(`Fase ${i + 1}: campo "descrizione" obbligatorio`)
        return
      }
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch(`/api/cicli/${cicloId}/fasi`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fasi }),
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

  return (
    <div style={{ padding: '0 20px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6, fontFamily }}>
          {nomeCiclo}
        </div>
        {ultimaModificaLabel && (
          <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily }}>
            Ultima modifica di {ultimaModificaLabel}
          </div>
        )}
        {headerActions?.creatoDaLabel && (
          <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily }}>
            Creato da {headerActions.creatoDaLabel}
          </div>
        )}
        {headerActions && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <CicloNuovoSheet
              mode="edit"
              cicloId={cicloId}
              initialValues={{
                codice: headerActions.codice,
                nome: nomeCiclo,
                tipo_dispositivo: headerActions.tipoDispositivo,
                classe_rischio: headerActions.classeRischio,
              }}
            />
            <CicloDeleteButton cicloId={cicloId} cicloNome={nomeCiclo} />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" style={{ margin: 0, fontFamily, fontSize: 13, color: 'var(--primary, #D90012)' }}>
          {error}
        </p>
      )}

      {fasi.length === 0 && (
        <p style={{ margin: 0, fontFamily, fontSize: 14, color: 'var(--t2)' }}>
          Nessuna fase definita per questo ciclo.
        </p>
      )}

      {fasi.map((f, i) => (
        <div key={f.id ?? `nuova-${i}`} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', fontFamily }}>Fase {i + 1}</span>
            <button
              type="button"
              onClick={() => rimuoviFase(i)}
              aria-label={`Rimuovi fase ${i + 1}`}
              style={{ background: 'none', border: 'none', color: 'var(--primary, #D90012)', cursor: 'pointer', fontSize: 12, fontFamily, minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 10px' }}
            >
              Rimuovi
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={labelStyle} htmlFor={`fase-${i}-codice`}>Fase {i + 1} — Codice</label>
              <input id={`fase-${i}-codice`} style={inputStyle} value={f.codice_fase} onChange={(e) => aggiornaFase(i, { codice_fase: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle} htmlFor={`fase-${i}-descrizione`}>Fase {i + 1} — Descrizione</label>
              <input id={`fase-${i}-descrizione`} style={inputStyle} value={f.descrizione} onChange={(e) => aggiornaFase(i, { descrizione: e.target.value })} />
            </div>
          </div>
        </div>
      ))}

      <div style={cardStyle}>
        <label style={labelStyle} htmlFor="cerca-libreria">Cerca nella libreria fasi esistenti</label>
        <input
          id="cerca-libreria"
          style={inputStyle}
          placeholder="Cerca nella libreria per codice o descrizione..."
          value={libreriaQuery}
          onChange={(e) => handleLibreriaSearch(e.target.value)}
        />
        {libreriaResults.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
            {libreriaResults.map((r, i) => (
              <li
                key={`${r.codice_fase}-${i}`}
                onMouseDown={() => aggiungiDaLibreria(r)}
                style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily, color: 'var(--t1)' }}
              >
                <strong>{r.codice_fase}</strong> — <span>{r.descrizione}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={aggiungiVuota}
        style={{ padding: '10px 14px', borderRadius: 10, border: '1px dashed var(--prs, #D4CFC9)', background: 'transparent', color: 'var(--t2)', fontWeight: 600, fontSize: 13, fontFamily, cursor: 'pointer', minHeight: 44 }}
      >
        + Aggiungi fase
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{ padding: '13px', background: saving ? 'var(--prs)' : 'var(--primary, #D90012)', color: 'white', borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily, minHeight: 48 }}
      >
        {saving ? 'Salvataggio...' : 'Salva modifiche'}
      </button>
    </div>
  )
}
