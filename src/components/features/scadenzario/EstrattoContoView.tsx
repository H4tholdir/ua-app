'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { buildWhatsappSollecito, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import type { EstrattoContoResponse, FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { RegistraPagamentoSheet, type TargetPagamento } from './RegistraPagamentoSheet'
import { FatturaCard } from './FatturaCard'
import { KpiBar } from './KpiBar'
import { TabellaFatture } from './TabellaFatture'
import { ClienteInfoCard } from './ClienteInfoCard'
import { DS, fmt, formatData, urgencyColor, urgencyEmoji, urgencyLabel, urgencyPillBg, urgencyPillBorder, labelStatoSDI } from './estratto-conto-shared'

// ─── FatturaBottomSheet ───────────────────────────────────────────────────────

interface BottomSheetProps {
  fattura: FatturaEstratto | null
  telefono: string | null
  studioNome: string
  onClose: () => void
  onRegistraPagamento: (target: TargetPagamento) => void
}

function FatturaBottomSheet({ fattura, telefono, studioNome, onClose, onRegistraPagamento }: BottomSheetProps) {
  const reducedMotion = useReducedMotion()

  const color = fattura ? urgencyColor(fattura) : DS.t2

  const whatsappMsg = fattura
    ? buildWhatsappSollecito({
        studioNome,
        totaleInsoluto: fattura.totale,
      })
    : ''
  const whatsappUrl = (fattura && telefono)
    ? buildWhatsappUrl(whatsappMsg, telefono)
    : ''

  return (
    <AnimatePresence>
      {fattura && (
        <>
          {/* Overlay */}
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

          {/* Sheet */}
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
            aria-label={`Dettaglio fattura ${fattura.numero}`}
          >
            {/* Handle */}
            <div style={{
              width: 36, height: 4,
              background: DS.t3,
              borderRadius: 99,
              margin: '12px auto 20px',
            }} />

            {/* Header: numero + badge urgenza */}
            <div style={{ padding: '0 20px 16px', borderBottom: `1px solid rgba(0,0,0,.06)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h2 style={{
                  margin: 0,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: DS.t1,
                  letterSpacing: '-0.02em',
                }}>
                  Fattura {fattura.numero}
                </h2>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: color,
                  background: urgencyPillBg(fattura),
                  border: urgencyPillBorder(fattura),
                  borderRadius: 8,
                  padding: '3px 8px',
                  flexShrink: 0,
                }}>
                  {urgencyEmoji(fattura)} {urgencyLabel(fattura)}
                </span>
              </div>
            </div>

            {/* KPI mini — 3 in riga */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              padding: '16px 20px',
            }}>
              <KpiMini
                label="Importo"
                value={fmt.format(fattura.totale)}
                color={color}
              />
              <KpiMini
                label="Data emissione"
                value={formatData(fattura.data)}
                color={DS.t1}
              />
              <KpiMini
                label="Stato SDI"
                value={labelStatoSDI(fattura.stato_sdi)}
                color={DS.t2}
              />
            </div>

            {/* Azioni */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* WhatsApp sollecito */}
              {telefono && !fattura.pagata && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 52,
                    padding: '12px 20px',
                    background: '#25D366',
                    color: '#fff',
                    borderRadius: 100,
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: 15,
                    textDecoration: 'none',
                    boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                  }}
                >
                  <WhatsAppIcon />
                  Invia sollecito WhatsApp
                </a>
              )}

              {/* Registra pagamento */}
              {!fattura.pagata && (
                <button
                  type="button"
                  onClick={() => {
                    onRegistraPagamento({
                      tipo: 'fattura',
                      id: fattura.id,
                      residuo: fattura.totale,
                      etichetta: `Fattura ${fattura.numero}`,
                    })
                    onClose()
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 52,
                    padding: '12px 20px',
                    background: 'transparent',
                    color: DS.green,
                    border: `2px solid ${DS.green}`,
                    borderRadius: 100,
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  💳 Registra pagamento
                </button>
              )}

              {/* Apri fattura */}
              <Link
                href={`/fatture/${fattura.id}`}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 52,
                  padding: '12px 20px',
                  background: DS.elv,
                  color: DS.t1,
                  borderRadius: 100,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: DS.shB,
                }}
              >
                📄 Apri fattura
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: DS.elv,
      borderRadius: 14,
      padding: '10px 12px',
      boxShadow: DS.shB,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        fontWeight: 600,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  )
}

// ─── Sezione header ───────────────────────────────────────────────────────────

function SezioneHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '0 16px 8px',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 11,
      fontWeight: 700,
      color: DS.t3,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      {label}
    </div>
  )
}

// ─── EstrattoContoView — componente principale ────────────────────────────────

interface Props {
  dati: EstrattoContoResponse
}

export function EstrattoContoView({ dati }: Props) {
  const reducedMotion = useReducedMotion()
  const [fatture] = useState<FatturaEstratto[]>(dati.fatture)
  const [selectedFattura, setSelectedFattura] = useState<FatturaEstratto | null>(null)
  const [targetPagamento, setTargetPagamento] = useState<TargetPagamento | null>(null)

  const handleRegistrato = useCallback(() => {
    // Il residuo/stato effettivo arriva al prossimo refresh server (router.refresh
    // non è invocato qui: la lista fatture di questa vista non mostra ancora un
    // residuo parziale — lo farà Task 15 evolvendo FatturaCard/TabellaFatture).
  }, [])

  // Calcoli derivati
  const nonPagate = fatture.filter((f) => !f.pagata)
  const pagate = fatture.filter((f) => f.pagata)
  const saldo_insoluto = nonPagate.reduce((s, f) => s + f.totale, 0)

  const openSheet = useCallback((f: FatturaEstratto) => setSelectedFattura(f), [])
  const closeSheet = useCallback(() => setSelectedFattura(null), [])

  // WhatsApp sollecito globale cliente (solo se insoluto > 0 e telefono disponibile)
  const whatsappMsgGlobale = buildWhatsappSollecito({
    studioNome: dati.cliente.studio_nome ?? `${dati.cliente.nome} ${dati.cliente.cognome}`,
    totaleInsoluto: saldo_insoluto,
  })
  const whatsappUrlGlobale = dati.cliente.telefono
    ? buildWhatsappUrl(whatsappMsgGlobale, dati.cliente.telefono)
    : null

  // Aggiorna selectedFattura se è stata modificata
  const selectedFatturaAggiornata = selectedFattura
    ? (fatture.find((f) => f.id === selectedFattura.id) ?? selectedFattura)
    : null

  return (
    <>
      {/* ── Layout desktop (1280px) — colonna unica, tabella ── */}
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

      {/* KPI Bar — sempre visibile */}
      <KpiBar
        saldo_insoluto={saldo_insoluto}
        totale_fatture={fatture.length}
        fatture_pagate_count={pagate.length}
      />

      <div className="estratto-layout">
        {/* Colonna principale */}
        <div className="estratto-col-main">

          {/* ── Sezione non pagate (card list — mobile e tablet) ── */}
          <div className="estratto-card-list">
            {nonPagate.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Da incassare (${nonPagate.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {nonPagate.map((f, i) => (
                      <FatturaCard
                        key={f.id}
                        fattura={f}
                        index={i}
                        onTap={openSheet}
                        reducedMotion={reducedMotion}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {pagate.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Storico pagamenti (${pagate.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {pagate.map((f, i) => (
                      <FatturaCard
                        key={f.id}
                        fattura={f}
                        index={i}
                        onTap={openSheet}
                        reducedMotion={reducedMotion}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {fatture.length === 0 && (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 15,
                color: DS.t2,
              }}>
                Nessuna fattura per questo cliente.
              </div>
            )}
          </div>

          {/* ── Tabella desktop (1280px+) ── */}
          <div className="estratto-table-view">
            {fatture.length > 0 ? (
              <TabellaFatture fatture={fatture} onTap={openSheet} />
            ) : (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 15,
                color: DS.t2,
              }}>
                Nessuna fattura per questo cliente.
              </div>
            )}
          </div>

          {/* WhatsApp CTA globale — solo su mobile/tablet, solo se insoluto > 0 */}
          {saldo_insoluto > 0 && whatsappUrlGlobale && (
            <div style={{ padding: '0 16px 24px' }} className="estratto-card-list">
              <a
                href={whatsappUrlGlobale}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 52,
                  padding: '12px 20px',
                  background: '#25D366',
                  color: '#fff',
                  borderRadius: 100,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                }}
              >
                <WhatsAppIcon />
                Sollecito totale — {fmt.format(saldo_insoluto)}
              </a>
            </div>
          )}
        </div>

        {/* ── Sidebar tablet/desktop ── */}
        <div className="estratto-col-sidebar">
          <ClienteInfoCard cliente={dati.cliente} saldo_insoluto={saldo_insoluto} />

          {/* WhatsApp CTA sidebar — solo se insoluto > 0 */}
          {saldo_insoluto > 0 && whatsappUrlGlobale && (
            <div style={{ marginTop: 12 }}>
              <a
                href={whatsappUrlGlobale}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 52,
                  padding: '12px 20px',
                  background: '#25D366',
                  color: '#fff',
                  borderRadius: 100,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                }}
              >
                <WhatsAppIcon />
                Invia sollecito WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheet fattura */}
      <FatturaBottomSheet
        fattura={selectedFatturaAggiornata}
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

// ─── WhatsApp icon SVG ────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
