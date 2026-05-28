'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticMedium, hapticLight } from '@/lib/feedback/haptic'
import type { OrdineRow, ArticoloSottoScorta } from '@/app/(app)/ordini/page'

interface Fornitore {
  id: string
  nome: string
  telefono: string | null
  email: string | null
}

interface ArticoloMagazzino {
  id: string
  nome: string
  um_scarico: string
  fornitore_id: string | null
  scorta_attuale: number
  scorta_minima: number
}

interface NuovoOrdineSheetProps {
  open: boolean
  articoliSottoScorta: ArticoloSottoScorta[]
  onClose: () => void
  onOrdineCreato: (ordine: OrdineRow) => void
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

function getTodayPlus7(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

export function NuovoOrdineSheet({
  open,
  articoliSottoScorta,
  onClose,
  onOrdineCreato,
}: NuovoOrdineSheetProps) {
  const reducedMotion = useReducedMotion()

  const [allArticoli, setAllArticoli] = useState<ArticoloMagazzino[]>([])
  const [fornitori, setFornitori] = useState<Fornitore[]>([])
  const [selectedMagazzinoId, setSelectedMagazzinoId] = useState<string>('')
  const [selectedFornitoreId, setSelectedFornitoreId] = useState<string>('')
  const [quantita, setQuantita] = useState<number>(1)
  const [unitaMisura, setUnitaMisura] = useState<string>('pz')
  const [dataConsegna, setDataConsegna] = useState<string>(getTodayPlus7())
  const [note, setNote] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Haptic all'apertura
  useEffect(() => {
    if (open) hapticLight()
  }, [open])

  // Blocca scroll body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Carica articoli magazzino
  useEffect(() => {
    if (!open) return
    fetch('/api/magazzino?limit=500')
      .then((r) => r.ok ? r.json() : { articoli: [] })
      .then((d) => {
        const art = (d.articoli ?? d.magazzino ?? []) as ArticoloMagazzino[]
        setAllArticoli(art)
        // Pre-seleziona il primo articolo sotto scorta
        if (articoliSottoScorta.length > 0) {
          const found = art.find((a) => a.id === articoliSottoScorta[0].id)
          if (found) {
            setSelectedMagazzinoId(found.id)
            setUnitaMisura(found.um_scarico)
            if (found.fornitore_id) setSelectedFornitoreId(found.fornitore_id)
          }
        }
      })
      .catch(() => {})
  }, [open, articoliSottoScorta])

  // Carica fornitori
  useEffect(() => {
    if (!open) return
    fetch('/api/fornitori')
      .then((r) => r.ok ? r.json() : { fornitori: [] })
      .then((d) => setFornitori(d.fornitori ?? []))
      .catch(() => {})
  }, [open])

  // Quando cambia il materiale, aggiorna fornitore e um
  const handleMagazzinoChange = (id: string) => {
    setSelectedMagazzinoId(id)
    const art = allArticoli.find((a) => a.id === id)
    if (art) {
      setUnitaMisura(art.um_scarico)
      if (art.fornitore_id) setSelectedFornitoreId(art.fornitore_id)
    }
  }

  const selectedFornitore = fornitori.find((f) => f.id === selectedFornitoreId)
  const selectedArticolo = allArticoli.find((a) => a.id === selectedMagazzinoId)

  const buildWhatsappMsg = (numeroOrdine: string) => {
    const labNome = '' // non disponibile qui — viene dal lab del server
    const righe = [
      `Ordine ${numeroOrdine}`,
      labNome ? `Lab: ${labNome}` : '',
      `Articolo: ${selectedArticolo?.nome ?? ''}`,
      `Qt: ${quantita} ${unitaMisura}`,
      `Consegna richiesta: ${dataConsegna}`,
      note ? `Note: ${note}` : '',
    ].filter(Boolean)
    return encodeURIComponent(righe.join('\n'))
  }

  const handleCreaOrdine = async (canale: 'bozza' | 'whatsapp' | 'email') => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ordini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          magazzino_id: selectedMagazzinoId || null,
          fornitore_id: selectedFornitoreId || null,
          quantita_ordinata: quantita,
          unita_misura: unitaMisura,
          data_consegna_richiesta: dataConsegna || null,
          note: note || null,
        }),
      })

      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Errore durante la creazione')
        setLoading(false)
        return
      }

      const { ordine } = await res.json() as { ordine: OrdineRow & { numero_ordine: string } }
      hapticMedium()

      if (canale === 'whatsapp' && selectedFornitore?.telefono) {
        const msg = buildWhatsappMsg(ordine.numero_ordine)
        const waUrl = `https://wa.me/${selectedFornitore.telefono.replace(/\D/g, '')}?text=${msg}`
        window.open(waUrl, '_blank', 'noopener,noreferrer')
        // Aggiorna stato ordine
        await fetch(`/api/ordini/${ordine.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp_inviato: true, stato: 'inviato' }),
        })
        ordine.whatsapp_inviato = true
        ordine.stato = 'inviato'
      }

      if (canale === 'email' && selectedFornitore?.email) {
        const msg = buildWhatsappMsg(ordine.numero_ordine).replace(/%0A/g, '%0D%0A')
        const subject = encodeURIComponent(`Ordine ${ordine.numero_ordine} - ${selectedArticolo?.nome ?? ''}`)
        const mailtoUrl = `mailto:${selectedFornitore.email}?subject=${subject}&body=${msg}`
        window.location.href = mailtoUrl
        // Aggiorna stato ordine
        await fetch(`/api/ordini/${ordine.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_inviato: true, stato: 'inviato' }),
        })
        ordine.email_inviato = true
        ordine.stato = 'inviato'
      }

      const ordineArricchito: OrdineRow = {
        ...ordine,
        materiale_nome: selectedArticolo?.nome ?? null,
        fornitore_nome: selectedFornitore?.nome ?? null,
        fornitore_telefono: selectedFornitore?.telefono ?? null,
        fornitore_email: selectedFornitore?.email ?? null,
      }

      onOrdineCreato(ordineArricchito)

      // Reset form
      setSelectedMagazzinoId('')
      setSelectedFornitoreId('')
      setQuantita(1)
      setUnitaMisura('pz')
      setDataConsegna(getTodayPlus7())
      setNote('')
    } catch {
      setError('Errore di rete — controlla la connessione')
    } finally {
      setLoading(false)
    }
  }

  const sheetTransition = reducedMotion
    ? { duration: 0 }
    : motionTokens.spring.soft

  const overlayTransition = reducedMotion
    ? { duration: 0 }
    : { duration: motionTokens.duration.normal, ease: motionTokens.easing.standard }

  const hasWhatsapp = !!selectedFornitore?.telefono
  const hasEmail = !!selectedFornitore?.email

  // Opzioni select materiale: prima sotto scorta, poi tutti
  const sottoScortaIds = new Set(articoliSottoScorta.map((a) => a.id))
  const materialiOrdinati = [
    ...allArticoli.filter((a) => sottoScortaIds.has(a.id)),
    ...allArticoli.filter((a) => !sottoScortaIds.has(a.id)),
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="nuovo-ordine-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(28,25,22,.55)',
              zIndex: 200,
            }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="nuovo-ordine-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nuovo-ordine-title"
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
            {/* Handle */}
            <div
              aria-hidden="true"
              style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--t3, #6B5C51)',
                margin: '12px auto 0',
              }}
            />

            <div style={{ padding: '16px 20px 20px' }}>
              <h2
                id="nuovo-ordine-title"
                style={{
                  margin: '0 0 20px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--t1, #1C1916)',
                }}
              >
                Nuovo ordine
              </h2>

              {/* Materiale */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="ordine-materiale" style={labelStyle}>
                  Materiale
                </label>
                <select
                  id="ordine-materiale"
                  value={selectedMagazzinoId}
                  onChange={(e) => handleMagazzinoChange(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  aria-label="Seleziona materiale"
                >
                  <option value="">Seleziona materiale...</option>
                  {articoliSottoScorta.length > 0 && (
                    <optgroup label="Sotto scorta minima">
                      {materialiOrdinati
                        .filter((a) => sottoScortaIds.has(a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome} (scorta: {a.scorta_attuale} {a.um_scarico})
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <optgroup label="Tutti i materiali">
                    {materialiOrdinati
                      .filter((a) => !sottoScortaIds.has(a.id))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {/* Fornitore */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="ordine-fornitore" style={labelStyle}>
                  Fornitore
                </label>
                <select
                  id="ordine-fornitore"
                  value={selectedFornitoreId}
                  onChange={(e) => setSelectedFornitoreId(e.target.value)}
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  aria-label="Seleziona fornitore"
                >
                  <option value="">Seleziona fornitore...</option>
                  {fornitori.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantità */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>
                  Quantità
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setQuantita((q) => Math.max(1, q - 1))}
                    aria-label="Diminuisci quantità"
                    style={{
                      width: '48px',
                      height: '48px',
                      minWidth: '48px',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(0,0,0,.08)',
                      background: 'var(--elv, #EDEDEA)',
                      color: 'var(--t1, #1C1916)',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '20px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '-2px -2px 5px rgba(255,255,255,.72), 3px 4px 8px -1px rgba(148,128,118,.28)',
                    }}
                  >
                    −
                  </button>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: 'var(--t1, #1C1916)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    aria-live="polite"
                    aria-label={`Quantità: ${quantita} ${unitaMisura}`}
                  >
                    {quantita}
                  </span>
                  <input
                    type="text"
                    value={unitaMisura}
                    onChange={(e) => setUnitaMisura(e.target.value)}
                    aria-label="Unità di misura"
                    style={{
                      ...inputStyle,
                      width: '60px',
                      height: '48px',
                      textAlign: 'center',
                      padding: '0 8px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantita((q) => q + 1)}
                    aria-label="Aumenta quantità"
                    style={{
                      width: '48px',
                      height: '48px',
                      minWidth: '48px',
                      borderRadius: '12px',
                      border: '1.5px solid rgba(0,0,0,.08)',
                      background: 'var(--elv, #EDEDEA)',
                      color: 'var(--primary, #D90012)',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '20px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '-2px -2px 5px rgba(255,255,255,.72), 3px 4px 8px -1px rgba(148,128,118,.28)',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Data consegna */}
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="ordine-data-consegna" style={labelStyle}>
                  Consegna entro
                </label>
                <input
                  id="ordine-data-consegna"
                  type="date"
                  value={dataConsegna}
                  onChange={(e) => setDataConsegna(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'light' }}
                  aria-label="Data consegna richiesta"
                />
              </div>

              {/* Note */}
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="ordine-note" style={labelStyle}>
                  Note (opzionale)
                </label>
                <textarea
                  id="ordine-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Specifiche, urgenza, colore..."
                  style={{
                    ...inputStyle,
                    height: 'auto',
                    padding: '12px 14px',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Errore */}
              {error && (
                <p
                  role="alert"
                  style={{
                    margin: '0 0 12px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    color: 'var(--primary, #D90012)',
                  }}
                >
                  {error}
                </p>
              )}

              {/* Azioni */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => void handleCreaOrdine('whatsapp')}
                  disabled={loading || !hasWhatsapp}
                  aria-label={hasWhatsapp ? 'Crea ordine e invia su WhatsApp' : 'Fornitore senza numero WhatsApp'}
                  style={{
                    minHeight: '52px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: hasWhatsapp ? '#25D366' : 'var(--t3, #6B5C51)',
                    color: '#fff',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: hasWhatsapp && !loading ? 'pointer' : 'not-allowed',
                    opacity: loading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span aria-hidden="true">📱</span>
                  WhatsApp
                </button>

                {/* Email */}
                <button
                  type="button"
                  onClick={() => void handleCreaOrdine('email')}
                  disabled={loading || !hasEmail}
                  aria-label={hasEmail ? 'Crea ordine e invia via email' : 'Fornitore senza email'}
                  style={{
                    minHeight: '52px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: hasEmail ? 'var(--gold, #D4A843)' : 'var(--t3, #6B5C51)',
                    color: 'var(--t1, #1C1916)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: hasEmail && !loading ? 'pointer' : 'not-allowed',
                    opacity: loading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span aria-hidden="true">📧</span>
                  Email
                </button>

                {/* Solo bozza */}
                <button
                  type="button"
                  onClick={() => void handleCreaOrdine('bozza')}
                  disabled={loading}
                  aria-label="Salva ordine come bozza"
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
                  Salva come bozza
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
