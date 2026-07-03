'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticMedium } from '@/lib/feedback/haptic'

export interface FornitoreOption {
  id: string
  ragione_sociale: string
}

export interface ArticoloCreato {
  id: string
  codice_articolo: string
  nome: string
  produttore: string | null
  categoria: string | null
  um_scarico: string
  scorta_attuale: number
  scorta_minima: number
  dispositivo_medico: boolean
}

interface MagazzinoAddSheetProps {
  open: boolean
  categorieEsistenti: string[]
  fornitori: FornitoreOption[]
  onClose: () => void
  onArticoloCreato: (articolo: ArticoloCreato) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  padding: '0 14px',
  borderRadius: '12px',
  border: '1px solid rgba(0,0,0,.06)',
  background: 'var(--bg, #DDD8D3)',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.10), inset -2px -2px 5px rgba(255,255,255,.70)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px',
}

function emptyForm() {
  return {
    nome: '',
    codiceArticolo: '',
    categoria: '',
    umAcquisto: 'pz',
    umScarico: 'g',
    scortaMinima: 0,
    dispositivoMedico: false,
    tracciaLotto: false,
    tracciaLottoTouched: false,
    produttore: '',
    fornitoreId: '',
    sottoCategoria: '',
    quantitaPerConfezione: 1,
    costoUnitario: '',
    prezzoUnitario: '',
    scortaAttuale: 0,
    codiceCe: '',
    schedaTecnicaUrl: '',
    schedaSicurezzaUrl: '',
  }
}

export function MagazzinoAddSheet({
  open,
  categorieEsistenti,
  fornitori,
  onClose,
  onArticoloCreato,
}: MagazzinoAddSheetProps) {
  const reducedMotion = useReducedMotion()

  const [form, setForm] = useState(emptyForm())
  const [showAltriDettagli, setShowAltriDettagli] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDispositivoMedicoChange = (checked: boolean) => {
    setForm((f) => ({
      ...f,
      dispositivoMedico: checked,
      tracciaLotto: f.tracciaLottoTouched ? f.tracciaLotto : checked,
    }))
  }

  const handleTracciaLottoChange = (checked: boolean) => {
    setForm((f) => ({ ...f, tracciaLotto: checked, tracciaLottoTouched: true }))
  }

  const handleClose = () => {
    setForm(emptyForm())
    setShowAltriDettagli(false)
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)

    if (!form.nome.trim()) {
      setError('Il campo "nome" è obbligatorio')
      return
    }
    if (!form.codiceArticolo.trim()) {
      setError('Il campo "codice articolo" è obbligatorio')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/magazzino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          codice_articolo: form.codiceArticolo.trim(),
          categoria: form.categoria.trim() || null,
          um_acquisto: form.umAcquisto,
          um_scarico: form.umScarico,
          scorta_minima: form.scortaMinima,
          dispositivo_medico: form.dispositivoMedico,
          traccia_lotto: form.tracciaLotto,
          produttore: form.produttore.trim() || null,
          fornitore_id: form.fornitoreId || null,
          sotto_categoria: form.sottoCategoria.trim() || null,
          quantita_per_confezione: form.quantitaPerConfezione,
          costo_unitario: form.costoUnitario === '' ? null : Number(form.costoUnitario),
          prezzo_unitario: form.prezzoUnitario === '' ? null : Number(form.prezzoUnitario),
          scorta_attuale: form.scortaAttuale,
          codice_ce: form.codiceCe.trim() || null,
          scheda_tecnica_url: form.schedaTecnicaUrl.trim() || null,
          scheda_sicurezza_url: form.schedaSicurezzaUrl.trim() || null,
        }),
      })

      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
        setLoading(false)
        return
      }

      const { articolo } = await res.json() as {
        articolo: { id: string; codice_articolo: string; nome: string; scorta_attuale: number; scorta_minima: number }
      }
      hapticMedium()

      onArticoloCreato({
        id: articolo.id,
        codice_articolo: articolo.codice_articolo,
        nome: articolo.nome,
        produttore: form.produttore.trim() || null,
        categoria: form.categoria.trim() || null,
        um_scarico: form.umScarico,
        scorta_attuale: articolo.scorta_attuale,
        scorta_minima: articolo.scorta_minima,
        dispositivo_medico: form.dispositivoMedico,
      })

      setForm(emptyForm())
      setShowAltriDettagli(false)
    } catch {
      setError('Errore di rete — controlla la connessione')
    } finally {
      setLoading(false)
    }
  }

  const sheetTransition = reducedMotion ? { duration: 0 } : motionTokens.spring.soft
  const overlayTransition = reducedMotion
    ? { duration: 0 }
    : { duration: motionTokens.duration.normal, ease: motionTokens.easing.standard }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="magazzino-add-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(28,25,22,.55)', zIndex: 200 }}
            aria-hidden="true"
          />

          <motion.div
            key="magazzino-add-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="magazzino-add-title"
            initial={{ transform: 'translateY(100%)' }}
            animate={{ transform: 'translateY(0%)' }}
            exit={{ transform: 'translateY(100%)' }}
            transition={sheetTransition}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              background: 'var(--sfc, #E4DFD9)',
              borderRadius: '20px 20px 0 0',
              padding: '0 0 env(safe-area-inset-bottom, 20px)',
              maxHeight: '92dvh',
              overflowY: 'auto',
            }}
          >
            <div aria-hidden="true" style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'var(--t3, #6B5C51)', margin: '12px auto 0' }} />

            <div style={{ padding: '16px 20px 20px' }}>
              <h2 id="magazzino-add-title" style={{ margin: '0 0 20px', fontFamily: 'DM Sans, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--t1, #1C1916)' }}>
                Nuovo articolo
              </h2>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-nome" style={labelStyle}>Nome *</label>
                <input
                  id="magazzino-nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  style={inputStyle}
                  aria-required="true"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-codice" style={labelStyle}>Codice articolo *</label>
                <input
                  id="magazzino-codice"
                  type="text"
                  value={form.codiceArticolo}
                  onChange={(e) => setForm((f) => ({ ...f, codiceArticolo: e.target.value }))}
                  style={inputStyle}
                  aria-required="true"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-categoria" style={labelStyle}>Categoria</label>
                <input
                  id="magazzino-categoria"
                  type="text"
                  list="magazzino-categorie-esistenti"
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  style={inputStyle}
                  placeholder="Es. Gessi, Ceramiche, Leghe..."
                />
                <datalist id="magazzino-categorie-esistenti">
                  {categorieEsistenti.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="magazzino-um-acquisto" style={labelStyle}>UM acquisto</label>
                  <select
                    id="magazzino-um-acquisto"
                    value={form.umAcquisto}
                    onChange={(e) => setForm((f) => ({ ...f, umAcquisto: e.target.value }))}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="pz">pz</option>
                    <option value="Kg">Kg</option>
                    <option value="litro">litro</option>
                    <option value="confezione">confezione</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="magazzino-um-scarico" style={labelStyle}>UM scarico</label>
                  <select
                    id="magazzino-um-scarico"
                    value={form.umScarico}
                    onChange={(e) => setForm((f) => ({ ...f, umScarico: e.target.value }))}
                    style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="pezzo">pezzo</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="magazzino-scorta-minima" style={labelStyle}>Scorta minima</label>
                <input
                  id="magazzino-scorta-minima"
                  type="number"
                  min={0}
                  value={form.scortaMinima}
                  onChange={(e) => setForm((f) => ({ ...f, scortaMinima: Number(e.target.value) }))}
                  style={inputStyle}
                />
              </div>

              <div style={checkboxRowStyle}>
                <input
                  id="magazzino-dispositivo-medico"
                  type="checkbox"
                  checked={form.dispositivoMedico}
                  onChange={(e) => handleDispositivoMedicoChange(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="magazzino-dispositivo-medico" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)' }}>
                  È un dispositivo medico
                </label>
              </div>

              <div style={checkboxRowStyle}>
                <input
                  id="magazzino-traccia-lotto"
                  type="checkbox"
                  checked={form.tracciaLotto}
                  onChange={(e) => handleTracciaLottoChange(e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                <label htmlFor="magazzino-traccia-lotto" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'var(--t1, #1C1916)' }}>
                  Richiede tracciabilità lotto in lavorazione
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowAltriDettagli((v) => !v)}
                aria-expanded={showAltriDettagli}
                aria-controls="magazzino-altri-dettagli"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 0',
                  marginBottom: showAltriDettagli ? '16px' : '20px',
                  color: 'var(--t2, #4A3D33)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {showAltriDettagli ? '− Nascondi altri dettagli' : '+ Altri dettagli'}
              </button>

              {showAltriDettagli && (
                <div id="magazzino-altri-dettagli">
                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-produttore" style={labelStyle}>Produttore</label>
                    <input
                      id="magazzino-produttore"
                      type="text"
                      value={form.produttore}
                      onChange={(e) => setForm((f) => ({ ...f, produttore: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-fornitore" style={labelStyle}>Fornitore</label>
                    <select
                      id="magazzino-fornitore"
                      value={form.fornitoreId}
                      onChange={(e) => setForm((f) => ({ ...f, fornitoreId: e.target.value }))}
                      style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Nessun fornitore</option>
                      {fornitori.map((f) => (
                        <option key={f.id} value={f.id}>{f.ragione_sociale}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-sotto-categoria" style={labelStyle}>Sotto-categoria</label>
                    <input
                      id="magazzino-sotto-categoria"
                      type="text"
                      value={form.sottoCategoria}
                      onChange={(e) => setForm((f) => ({ ...f, sottoCategoria: e.target.value }))}
                      style={inputStyle}
                      placeholder="Es. Denti confezionati"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-qta-confezione" style={labelStyle}>Quantità per confezione</label>
                    <input
                      id="magazzino-qta-confezione"
                      type="number"
                      min={0}
                      value={form.quantitaPerConfezione}
                      onChange={(e) => setForm((f) => ({ ...f, quantitaPerConfezione: Number(e.target.value) }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="magazzino-costo-unitario" style={labelStyle}>Costo unitario</label>
                      <input
                        id="magazzino-costo-unitario"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.costoUnitario}
                        onChange={(e) => setForm((f) => ({ ...f, costoUnitario: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="magazzino-prezzo-unitario" style={labelStyle}>Prezzo unitario</label>
                      <input
                        id="magazzino-prezzo-unitario"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.prezzoUnitario}
                        onChange={(e) => setForm((f) => ({ ...f, prezzoUnitario: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-scorta-attuale" style={labelStyle}>Scorta attuale</label>
                    <input
                      id="magazzino-scorta-attuale"
                      type="number"
                      min={0}
                      value={form.scortaAttuale}
                      onChange={(e) => setForm((f) => ({ ...f, scortaAttuale: Number(e.target.value) }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-codice-ce" style={labelStyle}>Codice CE</label>
                    <input
                      id="magazzino-codice-ce"
                      type="text"
                      value={form.codiceCe}
                      onChange={(e) => setForm((f) => ({ ...f, codiceCe: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label htmlFor="magazzino-scheda-tecnica" style={labelStyle}>Scheda tecnica (URL)</label>
                    <input
                      id="magazzino-scheda-tecnica"
                      type="text"
                      value={form.schedaTecnicaUrl}
                      onChange={(e) => setForm((f) => ({ ...f, schedaTecnicaUrl: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="magazzino-scheda-sicurezza" style={labelStyle}>Scheda di sicurezza (URL)</label>
                    <input
                      id="magazzino-scheda-sicurezza"
                      type="text"
                      value={form.schedaSicurezzaUrl}
                      onChange={(e) => setForm((f) => ({ ...f, schedaSicurezzaUrl: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  style={{
                    minHeight: '52px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--primary, #D90012)',
                    color: '#fff',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Salvataggio...' : 'Salva articolo'}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    minHeight: '48px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(0,0,0,.08)',
                    background: 'transparent',
                    color: 'var(--t2, #4A3D33)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
