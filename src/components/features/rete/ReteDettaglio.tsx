'use client'
import { useState } from 'react'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'
import { InvitaLabSheet } from './InvitaLabSheet'

export interface MembroRete {
  laboratorioId: string
  ruolo: 'admin_rete' | 'membro'
  joinedAt: string
  nome: string
  citta: string | null
  piano: string | null
}

export interface InvitoPendenteRete {
  id: string
  email: string
  expiresAt: string
}

interface ReteDettaglioProps {
  reteId: string
  isAdminLab: boolean
  adminLaboratorioId: string
  membriIniziali: MembroRete[]
  invitiPendentiIniziali: InvitoPendenteRete[]
}

const fontFamily = "'DM Sans', system-ui, sans-serif"

const PIANO_LABEL: Record<string, string> = {
  freemium: 'Freemium',
  solo: 'Solo',
  lab: 'Lab',
  studio: 'Studio',
}

// NOTA: `lab` usava `--c-purple` (colore semantico "premium", vedi globals.css:87)
// come correzione del brief originale che prescriveva `--gold` (contrasto 1.6:1,
// vietato). Hardening successivo (review B8 5/5): a fontSize 12/weight 700 il
// badge è SOTTO la soglia WCAG "large text" (serve 14pt/18.66px bold), quindi
// richiede 4.5:1 e non 3:1. `--c-purple` misura solo 3.20:1 contro `--sfc`
// (#E4DFD9) → FAIL. Nessun colore rainbow/semantico disponibile (--c-blue,
// --c-green, --c-amber, --c-orange, --c-red, --c-purple, --success, --primary)
// raggiunge 4.5:1 su `--sfc` (vedi .superpowers/sdd/hardening-4-report.md per
// la tabella completa). Fallback scelto: `--t1`, colore testo principale ad
// alto contrasto (13.21:1), neutro e distinto da `--t2` (freemium/solo) e da
// `--success` (Admin/studio) — nessuna ambiguità visiva tra i badge.
const PIANO_COLOR: Record<string, string> = {
  freemium: 'var(--t2, #4A3D33)',
  solo: 'var(--t2, #4A3D33)',
  lab: 'var(--t1, #1C1916)',
  studio: 'var(--success, #16A34A)',
}

export function ReteDettaglio({
  reteId,
  isAdminLab,
  adminLaboratorioId,
  membriIniziali,
  invitiPendentiIniziali,
}: ReteDettaglioProps) {
  const [rimuovendoId, setRimuovendoId] = useState<string | null>(null)
  const [revocandoId, setRevocandoId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRimuovi = async (laboratorioId: string) => {
    setError(null)
    setRimuovendoId(laboratorioId)
    hapticLight()
    try {
      const res = await fetch(`/api/rete/${reteId}/membri/${laboratorioId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante la rimozione, riprova')
        setRimuovendoId(null)
        return
      }
      hapticMedium()
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setRimuovendoId(null)
    }
  }

  const handleRevoca = async (invitoId: string) => {
    setError(null)
    setRevocandoId(invitoId)
    hapticLight()
    try {
      const res = await fetch(`/api/rete/${reteId}/inviti/${invitoId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante la revoca, riprova')
        setRevocandoId(null)
        return
      }
      hapticMedium()
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setRevocandoId(null)
    }
  }

  return (
    <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <p role="alert" style={{ margin: 0, fontFamily, fontSize: 13, color: 'var(--primary, #D90012)' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {membriIniziali.map((m) => (
          <div
            key={m.laboratorioId}
            style={{
              background: 'var(--sfc, #E4DFD9)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p style={{ color: 'var(--t1, #1C1916)', fontSize: 14, fontWeight: 600, fontFamily, margin: '0 0 2px' }}>
                {m.nome}
              </p>
              {m.citta && (
                <p style={{ color: 'var(--t2, #4A3D33)', fontSize: 12, fontFamily, margin: 0 }}>{m.citta}</p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              {m.piano && (
                <span style={{ color: PIANO_COLOR[m.piano] ?? 'var(--t2, #4A3D33)', fontSize: 12, fontWeight: 700, fontFamily, textTransform: 'uppercase' }}>
                  {PIANO_LABEL[m.piano] ?? m.piano}
                </span>
              )}
              {m.ruolo === 'admin_rete' && (
                <span style={{ color: 'var(--success, #16A34A)', fontSize: 12, fontWeight: 700, fontFamily, textTransform: 'uppercase' }}>
                  Admin
                </span>
              )}
              <span style={{ color: 'var(--t3, #6B5C51)', fontSize: 11, fontFamily }}>
                Dal {new Date(m.joinedAt).toLocaleDateString('it-IT')}
              </span>
              {isAdminLab && m.laboratorioId !== adminLaboratorioId && (
                <button
                  type="button"
                  onClick={() => handleRimuovi(m.laboratorioId)}
                  disabled={rimuovendoId === m.laboratorioId}
                  aria-label={`Rimuovi ${m.nome} dalla rete`}
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
                  {rimuovendoId === m.laboratorioId ? 'Rimozione...' : 'Rimuovi'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isAdminLab && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <h3 style={{ color: 'var(--t1, #1C1916)', fontSize: 15, fontWeight: 700, fontFamily, margin: 0 }}>
              Inviti in attesa
            </h3>
            <InvitaLabSheet reteId={reteId} />
          </div>

          {invitiPendentiIniziali.length === 0 ? (
            <p style={{ color: 'var(--t2, #4A3D33)', fontSize: 13, fontFamily, margin: 0 }}>
              Nessun invito in attesa.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {invitiPendentiIniziali.map((i) => (
                <div
                  key={i.id}
                  style={{
                    background: 'var(--elv, #EDEDEA)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ color: 'var(--t1, #1C1916)', fontSize: 13, fontWeight: 600, fontFamily, margin: '0 0 2px' }}>
                      {i.email}
                    </p>
                    <p style={{ color: 'var(--t2, #4A3D33)', fontSize: 12, fontFamily, margin: 0 }}>
                      Scade il {new Date(i.expiresAt).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoca(i.id)}
                    disabled={revocandoId === i.id}
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
                    {revocandoId === i.id ? 'Revoca...' : 'Revoca'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
