// src/components/features/scadenzario/EstrattoContoView.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { buildWhatsappSollecito, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import type { EstrattoContoResponse, DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { RegistraPagamentoSheet, type TargetPagamento } from './RegistraPagamentoSheet'
import { FatturaCard } from './FatturaCard'
import { KpiBar } from './KpiBar'
import { TabellaFatture } from './TabellaFatture'
import { ClienteInfoCard } from './ClienteInfoCard'
import { LavoriInAttesaSection } from './LavoriInAttesaSection'
import { CreditoDisponibileSection } from './CreditoDisponibileSection'
import {
  DS, fmt, urgencyColor, urgencyEmoji, urgencyLabel, urgencyPillBg, urgencyPillBorder,
  labelStatoSDI, labelOrigine,
} from './estratto-conto-shared'

// ─── DovutoBottomSheet ────────────────────────────────────────────────────────

interface BottomSheetProps {
  dovuto: DovutoEstratto | null
  telefono: string | null
  studioNome: string
  onClose: () => void
  onRegistraPagamento: (target: TargetPagamento) => void
}

function DovutoBottomSheet({ dovuto, telefono, studioNome, onClose, onRegistraPagamento }: BottomSheetProps) {
  const reducedMotion = useReducedMotion()
  const color = dovuto ? urgencyColor(dovuto) : DS.t2

  const whatsappMsg = dovuto ? buildWhatsappSollecito({ studioNome, totaleInsoluto: dovuto.residuo }) : ''
  const whatsappUrl = (dovuto && telefono && !dovuto.pagata) ? buildWhatsappUrl(whatsappMsg, telefono) : ''

  return (
    <AnimatePresence>
      {dovuto && (
        <>
          <motion.div
            key="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast', 'exit')}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 70,
              background: 'rgba(0,0,0,.32)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />

          <motion.div
            key="sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 71,
              background: DS.sfc,
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
              paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
              maxHeight: '80dvh',
              overflowY: 'auto',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Dettaglio ${labelOrigine(dovuto.origine)} ${dovuto.numero}`}
          >
            <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 20px' }} />

            <div style={{ padding: '0 20px 16px', borderBottom: `1px solid rgba(0,0,0,.06)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h2 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: DS.t1, letterSpacing: '-0.02em' }}>
                  {labelOrigine(dovuto.origine)} {dovuto.numero}
                </h2>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color,
                  background: urgencyPillBg(dovuto), border: urgencyPillBorder(dovuto),
                  borderRadius: 8, padding: '3px 8px', flexShrink: 0,
                }}>
                  {urgencyEmoji(dovuto)} {urgencyLabel(dovuto)}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '16px 20px' }}>
              <KpiMini label={dovuto.pagata ? 'Importo' : 'Residuo'} value={fmt.format(dovuto.pagata ? dovuto.totale : dovuto.residuo)} color={color} />
              <KpiMini label="Giorni" value={dovuto.pagata ? '—' : `${dovuto.giorni_ritardo}gg`} color={DS.t1} />
              {dovuto.origine === 'fattura' ? (
                <KpiMini label="Stato SDI" value={labelStatoSDI(dovuto.stato_sdi ?? 'draft')} color={DS.t2} />
              ) : (
                <KpiMini label="Origine" value="Lavoro diretto" color={DS.t2} />
              )}
            </div>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {telefono && !dovuto.pagata && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    minHeight: 52, padding: '12px 20px', background: '#25D366', color: '#fff',
                    borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                    textDecoration: 'none', boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                  }}
                >
                  <WhatsAppIcon />
                  Invia sollecito WhatsApp
                </a>
              )}

              {!dovuto.pagata && (
                <button
                  type="button"
                  onClick={() => {
                    onRegistraPagamento({
                      tipo: dovuto.origine === 'fattura' ? 'fattura' : 'lavoro',
                      id: dovuto.id,
                      residuo: dovuto.residuo,
                      etichetta: `${labelOrigine(dovuto.origine)} ${dovuto.numero}`,
                    })
                    onClose()
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    minHeight: 52, padding: '12px 20px', background: 'transparent', color: DS.green,
                    border: `2px solid ${DS.green}`, borderRadius: 100, fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  💳 Registra pagamento
                </button>
              )}

              {dovuto.origine === 'fattura' && (
                <Link
                  href={`/fatture/${dovuto.id}`}
                  onClick={onClose}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    minHeight: 52, padding: '12px 20px', background: DS.elv, color: DS.t1,
                    borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                    textDecoration: 'none', boxShadow: DS.shB,
                  }}
                >
                  📄 Apri fattura
                </Link>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: DS.elv, borderRadius: 14, padding: '10px 12px', boxShadow: DS.shB, textAlign: 'center' }}>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 10, fontWeight: 600, color: DS.t3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Sezione header ───────────────────────────────────────────────────────────

function SezioneHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '0 16px 8px', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700,
      color: DS.t3, textTransform: 'uppercase', letterSpacing: '0.1em',
    }}>
      {label}
    </div>
  )
}

// ─── Entry point ────────────────────────────────────────────────────────────

interface Props {
  dati: EstrattoContoResponse
}

export function EstrattoContoView({ dati }: Props) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [selectedDovuto, setSelectedDovuto] = useState<DovutoEstratto | null>(null)
  const [targetPagamento, setTargetPagamento] = useState<TargetPagamento | null>(null)

  const nonSaldati = dati.dovuti.filter((d) => !d.pagata)
  const saldati = dati.dovuti.filter((d) => d.pagata)

  const openSheet = useCallback((d: DovutoEstratto) => setSelectedDovuto(d), [])
  const closeSheet = useCallback(() => setSelectedDovuto(null), [])

  const handleRegistrato = useCallback(() => {
    router.refresh()
  }, [router])

  const whatsappMsgGlobale = buildWhatsappSollecito({
    studioNome: dati.cliente.studio_nome ?? `${dati.cliente.nome} ${dati.cliente.cognome}`,
    totaleInsoluto: dati.creditoCliente.confermato,
  })
  const whatsappUrlGlobale = dati.cliente.telefono
    ? buildWhatsappUrl(whatsappMsgGlobale, dati.cliente.telefono)
    : null

  const selectedDovutoAggiornato = selectedDovuto
    ? (dati.dovuti.find((d) => d.id === selectedDovuto.id) ?? selectedDovuto)
    : null

  return (
    <>
      <style>{`
        .estratto-col-sidebar { display: none; }
        @media (min-width: 768px) {
          .estratto-layout {
            display: grid !important;
            grid-template-columns: 1fr 340px;
            gap: 24px;
            padding: 0 24px;
            align-items: start;
          }
          .estratto-col-main { min-width: 0; }
          .estratto-col-sidebar { display: block; position: sticky; top: 80px; }
        }
        @media (min-width: 1280px) {
          .estratto-card-list { display: none !important; }
          .estratto-table-view { display: block !important; }
        }
        @media (max-width: 1279px) {
          .estratto-table-view { display: none !important; }
        }
      `}</style>

      <KpiBar
        confermato={dati.creditoCliente.confermato}
        potenziale={dati.creditoCliente.potenziale}
        disponibile={dati.creditoCliente.disponibile}
        totale={dati.creditoCliente.totale}
      />

      <div className="estratto-layout">
        <div className="estratto-col-main">
          <div className="estratto-card-list">
            {nonSaldati.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Da incassare (${nonSaldati.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {nonSaldati.map((d, i) => (
                      <FatturaCard key={d.id} dovuto={d} index={i} onTap={openSheet} reducedMotion={reducedMotion} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {saldati.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Storico pagamenti (${saldati.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {saldati.map((d, i) => (
                      <FatturaCard key={d.id} dovuto={d} index={i} onTap={openSheet} reducedMotion={reducedMotion} />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {dati.dovuti.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t2 }}>
                Nessun dovuto per questo cliente.
              </div>
            )}
          </div>

          <div className="estratto-table-view">
            {dati.dovuti.length > 0 ? (
              <TabellaFatture dovuti={dati.dovuti} onTap={openSheet} />
            ) : (
              <div style={{ padding: '40px 24px', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t2 }}>
                Nessun dovuto per questo cliente.
              </div>
            )}
          </div>

          <LavoriInAttesaSection lavori={dati.lavoriInAttesa} />

          <CreditoDisponibileSection
            disponibile={dati.creditoCliente.disponibile}
            clienteId={dati.cliente.id}
            dovutiApplicabili={nonSaldati}
          />

          {dati.creditoCliente.confermato > 0 && whatsappUrlGlobale && (
            <div style={{ padding: '0 16px 24px' }} className="estratto-card-list">
              <a href={whatsappUrlGlobale} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                minHeight: 52, padding: '12px 20px', background: '#25D366', color: '#fff',
                borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                textDecoration: 'none', boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
              }}>
                <WhatsAppIcon />
                Sollecito totale — {fmt.format(dati.creditoCliente.confermato)}
              </a>
            </div>
          )}
        </div>

        <div className="estratto-col-sidebar">
          <ClienteInfoCard cliente={dati.cliente} saldo_insoluto={dati.creditoCliente.confermato} />
          {dati.creditoCliente.confermato > 0 && whatsappUrlGlobale && (
            <div style={{ marginTop: 12 }}>
              <a href={whatsappUrlGlobale} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                minHeight: 52, padding: '12px 20px', background: '#25D366', color: '#fff',
                borderRadius: 100, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, fontSize: 15,
                textDecoration: 'none', boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
              }}>
                <WhatsAppIcon />
                Invia sollecito WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      <DovutoBottomSheet
        dovuto={selectedDovutoAggiornato}
        telefono={dati.cliente.telefono}
        studioNome={dati.cliente.studio_nome ?? `${dati.cliente.nome} ${dati.cliente.cognome}`}
        onClose={closeSheet}
        onRegistraPagamento={setTargetPagamento}
      />

      <RegistraPagamentoSheet
        target={targetPagamento}
        onClose={() => setTargetPagamento(null)}
        onRegistrato={handleRegistrato}
      />
    </>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.87 9.87 0 0 0 12.04 2Z" />
    </svg>
  )
}
