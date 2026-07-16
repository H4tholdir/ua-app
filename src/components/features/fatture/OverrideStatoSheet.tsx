'use client'

// Foglio generico di override manuale dello stato SdI (Task 12/12b: POST
// /api/fatture/[id]/stato-sdi-override) — titolare-only, lingua visiva
// ricalcata da NotaCreditoButton.tsx (bottom sheet mobile / dialog ancorato
// desktop, token globali v2.3, animazioni SOLO da design-system/motion.ts).
//
// Payload anti-stale-read (spec R1 §7): `stato_sdi_atteso` è SEMPRE lo stato
// che l'operatore ha visto a schermo (mai un valore fisso) — il chiamante lo
// passa via prop `statoAtteso`. Quando la transizione è un TD04 → 'rifiutata'
// il foglio mostra l'elenco effetti (storno annullato, fattura ri-stornabile)
// e richiede una spunta esplicita PRIMA di abilitare «Sì, procedi» — stesso
// pattern della causale obbligatoria di NotaCreditoButton.
//
// NOTA (Task 16, riconciliazioni pendenti): questo componente è generico e
// pienamente funzionante/testato in isolamento, ma NON è agganciato al CTA
// «Riprova lo storno» della pagina /fatture/riconciliazioni — vedi il
// commento RiprovaStornoSheet in RiconciliazioniClient.tsx per il perché
// (gap di dati: fetchPendenzeRiconciliazione, Task 14, espone l'id della
// fattura ORIGINALE + il numero del TD04 come stringa, non l'id del TD04 né
// il suo stato_sdi corrente — e il TD04 in quel gruppo è già 'rifiutata',
// quindi un nuovo override sarebbe bloccato dalla monotonia rank lato route.
// Punto di escalation esplicito per Francesco/orchestrator).

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticError, hapticMedium } from '@/lib/feedback/haptic'
import { soundError } from '@/lib/feedback/sounds'

const FONT = 'var(--font-dm-sans, "DM Sans", system-ui, sans-serif)'
const BORDER = '1px solid var(--elv)'
const SCRIM = 'rgba(0,0,0,0.45)'

export type NuovoStatoOverride = 'pec_consegnata' | 'accettata' | 'rifiutata'

export interface OverrideStatoSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  fatturaId: string
  numero: string
  tipoDocumento: string
  /** Stato mostrato all'operatore in questo momento — anti-stale-read. */
  statoAtteso: string
  nuovoStato: NuovoStatoOverride
  /** Importo dello storno visto dall'operatore (solo TD04→rifiutata). */
  importoStornoVisto?: number
}

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

export function OverrideStatoSheet(props: OverrideStatoSheetProps) {
  const { open, onClose, onSuccess, fatturaId, numero, tipoDocumento, statoAtteso, nuovoStato, importoStornoVisto } = props
  const reducedMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  const [motivo, setMotivo] = useState('')
  const [confermaEffetti, setConfermaEffetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const richiedeConferma = tipoDocumento === 'TD04' && nuovoStato === 'rifiutata'

  // Nessun effect di reset-su-`open`: il chiamante (RiconciliazioniClient)
  // monta questo foglio SOLO quando serve (target non-null) e lo smonta alla
  // chiusura — ogni apertura è quindi già un mount fresco con stato pulito
  // dagli useState iniziali sopra.

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, isPending, onClose])

  const motivoTrim = motivo.trim()
  const canSubmit = motivoTrim.length > 0 && (!richiedeConferma || confermaEffetti) && !isPending

  async function handleSubmit() {
    if (!canSubmit) return
    hapticMedium()
    setIsPending(true)
    setError(null)
    let res: Response
    try {
      res = await fetch(`/api/fatture/${fatturaId}/stato-sdi-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stato_sdi_atteso: statoAtteso,
          nuovo_stato: nuovoStato,
          motivo: motivoTrim,
          ...(richiedeConferma ? { conferma_effetti_storno: true } : {}),
          ...(importoStornoVisto !== undefined ? { importo_storno_visto: importoStornoVisto } : {}),
        }),
      })
    } catch {
      hapticError()
      soundError()
      setIsPending(false)
      setError('Connessione assente. Riprova.')
      return
    }
    if (res.ok) {
      setIsPending(false)
      onSuccess()
      return
    }
    hapticError()
    soundError()
    setIsPending(false)
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    setError(data?.error ?? "Impossibile completare l'operazione. Riprova.")
  }

  const ctaRed: React.CSSProperties = {
    flex: 2, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, background: 'var(--primary)', border: 'none', color: '#fff',
    fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
    outline: 'none', boxShadow: canSubmit ? 'var(--sh-red)' : 'none', opacity: canSubmit ? 1 : 0.42,
  }
  const ctaNeutral: React.CSSProperties = {
    flex: 1, minHeight: 48, borderRadius: 12, background: 'var(--elv)', border: BORDER, color: 'var(--t2)',
    fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer', outline: 'none',
  }
  const label: React.CSSProperties = {
    fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--t3)', margin: '0 0 8px',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="ovr-scrim"
            onClick={() => !isPending && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast')}
            style={{ position: 'fixed', inset: 0, background: SCRIM, zIndex: 300 }}
            aria-hidden="true"
          />
          <motion.div
            key="ovr-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ovr-sheet-title"
            initial={reducedMotion ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.97, y: 4 } : { y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : isDesktop ? t('normal') : { ...motionTokens.spring.soft }}
            style={
              isDesktop
                ? {
                    position: 'fixed', top: 76, right: 24, width: 440, maxHeight: 'calc(100vh - 100px)',
                    overflowY: 'auto', zIndex: 301, background: 'var(--bg)', border: BORDER, borderRadius: 20,
                    boxShadow: 'var(--sh-b)', padding: 20,
                  }
                : {
                    position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '92vh', overflowY: 'auto',
                    zIndex: 301, background: 'var(--bg)', borderRadius: '22px 22px 0 0',
                    paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: 'var(--sh-b)',
                  }
            }
          >
            <div style={{ padding: isDesktop ? 0 : 18 }}>
              {!isDesktop && (
                <div aria-hidden="true" style={{ width: 34, height: 4, borderRadius: 2, background: 'var(--elv)', margin: '0 auto 14px' }} />
              )}

              <h2 id="ovr-sheet-title" style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: '0 0 3px' }}>
                Forza lo stato SdI
              </h2>
              <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', margin: '0 0 14px' }}>
                Fattura {numero}
              </p>

              {richiedeConferma && (
                <>
                  <div
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12,
                      margin: '0 0 14px', background: 'color-mix(in srgb, var(--primary) 9%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                    }}
                  >
                    <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: 15, lineHeight: 1.2 }}>⚠</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t1)', lineHeight: 1.45 }}>
                      <b style={{ fontWeight: 700 }}>Solo tu (titolare) puoi farlo.</b> Segnare la nota di credito TD04
                      come rifiutata annulla gli effetti dello storno.
                    </span>
                  </div>

                  <p style={label}>Cosa succede se confermi</p>
                  <div style={{ border: BORDER, borderRadius: 14, padding: '2px 12px', margin: '0 0 14px' }}>
                    <Effetto
                      tint="var(--c-red)"
                      ink="var(--primary)"
                      icon="↩"
                      titolo={
                        importoStornoVisto !== undefined
                          ? `Il credito di ${importoStornoVisto.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} torna indietro`
                          : 'Il credito dello storno torna indietro'
                      }
                      sub="Il credito dato al cliente per lo storno viene tolto dal suo conto."
                    />
                    <Effetto
                      tint="var(--c-green)"
                      ink="var(--success)"
                      icon="↻"
                      titolo="Potrai rifare lo storno"
                      sub={`La fattura ${numero} torna stornabile: potrai preparare una nuova nota di credito.`}
                      last
                    />
                  </div>

                  <label
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12,
                      background: 'var(--sfc)', border: confermaEffetti ? '1.5px solid color-mix(in srgb, var(--primary) 45%, transparent)' : `1.5px solid var(--elv)`,
                      margin: '0 0 14px', fontFamily: FONT, fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.4, cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={confermaEffetti}
                      onChange={(e) => setConfermaEffetti(e.target.checked)}
                      style={{ width: 22, height: 22, flexShrink: 0, marginTop: 1, accentColor: 'var(--primary)' }}
                    />
                    Ho letto cosa succede e voglio procedere.
                  </label>
                </>
              )}

              <p style={label}>
                Motivo <span style={{ color: 'var(--primary)' }}>*</span>
              </p>
              <textarea
                aria-label="Motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Es. verificato sul portale SdI…"
                style={{
                  width: '100%', minHeight: 74, background: 'var(--sfc)', border: BORDER, borderRadius: 12,
                  padding: '11px 12px', fontFamily: FONT, fontSize: 13, lineHeight: 1.45, color: 'var(--t1)',
                  resize: 'none', outline: 'none', boxSizing: 'border-box', display: 'block', margin: '0 0 14px',
                }}
              />

              {error && (
                <p role="alert" style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--primary)', margin: '0 0 10px' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose} disabled={isPending} style={ctaNeutral}>
                  Annulla
                </button>
                <button type="button" onClick={handleSubmit} disabled={!canSubmit} style={ctaRed}>
                  {isPending ? 'Invio…' : 'Sì, procedi'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Effetto({
  tint, ink, icon, titolo, sub, last,
}: { tint: string; ink: string; icon: string; titolo: string; sub: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 0', borderBottom: last ? 'none' : BORDER }}>
      <span
        aria-hidden="true"
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 13, background: `color-mix(in srgb, ${tint} 16%, transparent)`, color: ink,
        }}
      >
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.35 }}>
          {titolo}
        </span>
        <span style={{ display: 'block', fontFamily: FONT, fontSize: 11, color: 'var(--t2)', marginTop: 2, lineHeight: 1.35 }}>
          {sub}
        </span>
      </span>
    </div>
  )
}
