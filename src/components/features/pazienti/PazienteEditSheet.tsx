'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight } from '@/lib/feedback/haptic'
import { cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'

interface PazienteEditProps {
  paziente: {
    id: string
    codice_paziente: string | null
    nome: string | null
    cognome: string | null
    note: string | null
    anamnesi: string | null
    asl: string | null
    sesso: string | null
    data_nascita: string | null
  }
}

export function PazienteEditSheet({ paziente }: PazienteEditProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [form, setForm] = useState({
    codice_paziente: paziente.codice_paziente ?? '',
    // `cognomeEffettivo`: sui pazienti creati dal wizard senza nome il CODICE
    // vive dentro `cognome` (invariante 2 della regola §5). Mostrarlo in una
    // casella etichettata «Cognome» inviterebbe a cancellarlo — e cancellarlo
    // è esattamente il gesto che, senza la guardia server (Task 5), bloccava
    // la consegna. Qui lo si nasconde: la casella parte vuota, e se resta
    // vuota il server rimette il codice da sé.
    cognome: cognomeEffettivo(paziente.cognome, paziente.codice_paziente),
    nome: paziente.nome ?? '',
    asl: paziente.asl ?? '',
    sesso: paziente.sesso ?? '',
    data_nascita: paziente.data_nascita ?? '',
    anamnesi: paziente.anamnesi ?? '',
    note: paziente.note ?? '',
  })

  const handleSave = async () => {
    setSaving(true)
    setErrore(null)
    hapticLight()
    try {
      const res = await fetch(`/api/pazienti/${paziente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        // 🟠 ALTO 2 — il messaggio mostrato è quello della route (già
        // generico e sicuro, G9): mai il testo grezzo del DB, ma nemmeno più
        // un fallimento invisibile. Se la lettura del corpo fallisce, un
        // testo di ripiego.
        let messaggio = 'Non è stato possibile salvare le modifiche'
        try {
          const corpo = await res.json()
          if (corpo?.error) messaggio = corpo.error
        } catch {
          // ripiego: il corpo non è JSON valido, resta il messaggio generico
        }
        setErrore(messaggio)
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setErrore('Non è stato possibile salvare le modifiche')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--elv, #EDEDEA)',
    border: '1px solid var(--prs, #D4CFC9)',
    borderRadius: 10,
    fontSize: 14,
    color: 'var(--t1)',
    fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--t2)',
    fontFamily: 'DM Sans, sans-serif',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setErrore(null); hapticLight() }}
        style={{
          padding: '10px 16px',
          background: 'var(--sfc)',
          border: '1px solid var(--prs)',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--t1)',
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        ✏️ Modifica
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionTokens.duration.fast }}
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 80 }}
            />

            {/* Bottom sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ ...motionTokens.spring.soft }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--sfc, #E4DFD9)',
                borderRadius: '20px 20px 0 0',
                zIndex: 81,
                maxHeight: '92dvh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Intestazione fissa: drag handle + titolo — non scorre mai */}
              <div style={{ flexShrink: 0, padding: '20px 20px 0' }}>
                <div style={{
                  width: 36, height: 4,
                  background: 'var(--prs)',
                  borderRadius: 2,
                  margin: '0 auto 20px',
                }} />

                <h3 style={{
                  margin: '0 0 20px',
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--t1)',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  Modifica paziente
                </h3>
              </div>

              {/* Corpo scorrevole: i campi del form — fratello del piede,
                  MAI antenato del tasto Salva (v. tests/unit/PazienteEditSheet.test.tsx). */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Codice paziente */}
                  <div>
                    <label style={labelStyle}>Codice paziente (GDPR)</label>
                    <input
                      style={inputStyle}
                      value={form.codice_paziente}
                      placeholder="es. PAZ/2024/001"
                      onChange={e => setForm(p => ({ ...p, codice_paziente: e.target.value }))}
                    />
                  </div>

                  {/* Cognome + Nome — la via di rettifica (Art. 16 GDPR).
                      Cognome sopra: è la parte che identifica il lavoro. */}
                  <div>
                    <label style={labelStyle} htmlFor="paz-cognome">Cognome</label>
                    <input
                      id="paz-cognome"
                      style={inputStyle}
                      value={form.cognome}
                      placeholder="Anche solo un soprannome"
                      onChange={e => setForm(p => ({ ...p, cognome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="paz-nome">Nome</label>
                    <input
                      id="paz-nome"
                      style={inputStyle}
                      value={form.nome}
                      onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    />
                  </div>

                  {/* Sesso + Data nascita */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Sesso</label>
                      <select
                        style={{ ...inputStyle }}
                        value={form.sesso}
                        onChange={e => setForm(p => ({ ...p, sesso: e.target.value }))}
                      >
                        <option value="">—</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Data nascita</label>
                      <input
                        type="date"
                        style={inputStyle}
                        value={form.data_nascita}
                        onChange={e => setForm(p => ({ ...p, data_nascita: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* ASL */}
                  <div>
                    <label style={labelStyle}>ASL / Ente sanitario</label>
                    <input
                      style={inputStyle}
                      value={form.asl}
                      placeholder="es. ASL Salerno 1"
                      onChange={e => setForm(p => ({ ...p, asl: e.target.value }))}
                    />
                  </div>

                  {/* Anamnesi */}
                  <div>
                    <label style={labelStyle}>Anamnesi</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                      value={form.anamnesi}
                      placeholder="Allergie, patologie rilevanti..."
                      onChange={e => setForm(p => ({ ...p, anamnesi: e.target.value }))}
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label style={labelStyle}>Note</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
                      value={form.note}
                      onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Piede fisso: errore + tasto Salva — fratello del corpo
                  scorrevole qui sopra, mai al suo interno: resta sempre
                  raggiungibile senza scorrere, a ogni larghezza. */}
              <div style={{
                flexShrink: 0,
                padding: '14px 20px calc(14px + env(safe-area-inset-bottom, 0px))',
              }}>
                {/* Messaggio d'errore — visibile in tema chiaro e scuro: usa le
                    stesse variabili colore del resto del pannello (--sfc/--prs
                    per lo sfondo/bordo, --t1 per il testo), niente colori
                    scritti a mano. */}
                {errore && (
                  <div
                    role="alert"
                    style={{
                      marginBottom: 14,
                      padding: '10px 12px',
                      background: 'var(--sfc)',
                      border: '1px solid var(--primary, #D90012)',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--t1)',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {errore}
                  </div>
                )}

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: saving ? 'var(--prs)' : 'var(--primary, #D90012)',
                    color: 'white',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {saving ? 'Salvataggio...' : 'Salva modifiche'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
