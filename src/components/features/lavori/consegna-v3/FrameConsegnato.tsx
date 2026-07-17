'use client'

// Ondata 16/07 §3.4 — Frame «Consegnato!» (mockup consegna.html Frame 3 =
// legge). role=status + focus programmatico sul titolo (riserva UX d);
// countdown FUORI dalla regione live (bucket C); lista = SOLO cose vere (L5):
// DdC ✓ · Buono ✓ · WhatsApp «pronto da inviare» (MAI ✓ prima dell'invio,
// riserva UX #1). D-2: niente fattura — riga quieta statica senza link.
// Ramo idempotente degradato (riserva backend #4): url documenti vuote → le
// voci restano (sono avvenute) ma senza link. Annullo: LinkQuieto + countdown
// (Frame 3); la trasparenza «Annullando…» vive nel DialogConferma di annullo.
//
// ⚠️ Adattamenti vs brief (contratti reali):
//  - LinkQuieto: contratto reale con `onClick` (rende un <button>) — l'annullo
//    apre il dialog via `onClick`, coerente col brief.
//  - `tipografia.size.question` (= 35) esiste: usato per il titolo, mai inline.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CardUAHaFatto } from '@/components/ds/CardUAHaFatto'
import { TastoWhatsApp } from '@/components/ds/TastoWhatsApp'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { tipografia, spazio } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import type { ConsegnaResult } from '@/types/domain'

const FINESTRA_MS = 10 * 60 * 1000

export function FrameConsegnato(props: {
  esito: ConsegnaResult
  lavoroId: string
  descrizione: string
  dentista: string
  onChiudi: () => void
}) {
  const { esito, lavoroId, descrizione, dentista, onChiudi } = props
  const titoloRef = useRef<HTMLHeadingElement>(null)
  const [t0] = useState(() => Date.now())
  const [rimasti, setRimasti] = useState(FINESTRA_MS)
  const [annulloAperto, setAnnulloAperto] = useState(false)
  const [annulloInCorso, setAnnulloInCorso] = useState(false)
  // Feedback D-6 sul fallimento dell'annullo: il dialog RESTA aperto con una
  // nota ambra generica (mai la stringa server) — un'azione che annulla DdC e
  // buono non può fallire in silenzio. Reset alla riapertura del dialog.
  const [annulloFallito, setAnnulloFallito] = useState(false)

  // §9.1: «ua» è LA FIRMA del Consegnato! (palette chiusa dei 5 suoni) —
  // abbinamento notification-success (§9.3). Una volta sola, al mount.
  useEffect(() => { titoloRef.current?.focus(); suona('ua'); vibra('success') }, [])
  useEffect(() => {
    const timer = setInterval(() => {
      const r = Math.max(0, FINESTRA_MS - (Date.now() - t0))
      setRimasti(r)
      // Fine finestra: oltre a far sparire il link, chiude anche il dialog di
      // annullo eventualmente aperto — non deve restare azionabile oltre.
      if (r === 0) setAnnulloAperto(false)
    }, 1000)
    return () => clearInterval(timer)
  }, [t0])

  const mm = Math.floor(rimasti / 60000)
  const ss = Math.floor((rimasti % 60000) / 1000).toString().padStart(2, '0')

  async function annulla() {
    setAnnulloInCorso(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/annulla-consegna`, { method: 'POST' })
      if (res.ok) { setAnnulloAperto(false); onChiudi(); return }
      // Fallimento (HTTP non-ok): il dialog resta aperto con la nota — mai
      // una chiusura muta su un'azione che annulla DdC e buono.
      setAnnulloFallito(true)
    } catch {
      // Fallimento di rete: stesso trattamento, copy generica.
      setAnnulloFallito(true)
    } finally {
      setAnnulloInCorso(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div data-ds="v3" style={{ position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 24px 40px' }}>
        <TastoTondo glifo="‹" etichettaAria="Chiudi" onClick={onChiudi} />

        {/* Regione live: il countdown resta FUORI (sotto) */}
        <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, marginTop: spazio.l }}>
          <span aria-hidden="true" style={{ width: 92, height: 92, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--green-tint)', color: 'var(--green)' }}>
            <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 12.5l5 5 10-11" /></svg>
          </span>
          <h1 ref={titoloRef} tabIndex={-1} style={{ fontSize: tipografia.size.question, fontWeight: tipografia.weight.extrabold, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0, outline: 'none' }}>
            Consegnato!
          </h1>
          <p style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', maxWidth: 300, margin: 0 }}>
            La {descrizione} n.{esito.numero_lavoro} è andata al {dentista}
          </p>
        </div>

        <div style={{ marginTop: spazio.l }}>
          <CardUAHaFatto voci={[
            { nome: 'Dichiarazione di Conformità', sub: `Generata a ogni consegna ✓ · ${esito.ddc.numero}` },
            { nome: 'Buono di consegna', sub: esito.buono.numero },
            { nome: 'Messaggio WhatsApp', sub: 'Pronto da inviare', fatto: false },
          ]} />
        </div>

        {/* D-2 — riga quieta STATICA, stile proprio (mai LinkQuieto §5.5) */}
        <p style={{ fontSize: 14.5, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', textAlign: 'center', margin: `${spazio.m}px 0 0` }}>
          La fatturazione si decide con il dentista
        </p>

        <div style={{ marginTop: spazio.m, display: 'flex', justifyContent: 'center' }}>
          <TastoWhatsApp waUrl={esito.whatsapp_url}>Invia messaggio WhatsApp</TastoWhatsApp>
        </div>

        {/* Annullo (Frame 3): LinkQuieto + countdown NON-live; sparisce a 0 */}
        {rimasti > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <LinkQuieto onClick={() => { setAnnulloFallito(false); setAnnulloAperto(true) }}>Annulla la consegna</LinkQuieto>
            <span aria-hidden="true" style={{ fontSize: 14.5, fontWeight: tipografia.weight.bold, color: 'var(--faint)', fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</span>
          </div>
        )}
      </div>

      {/* Trasparenza dell'annullo (riserva UX #6): vive QUI, ordine standard
          (sicura sopra) — il default distruttivo di DialogConferma. */}
      <DialogConferma
        aperto={annulloAperto}
        titolo="Annullo la consegna?"
        testo={`Annullando, la Dichiarazione di Conformità e il buono vengono annullati. La ${descrizione} n.${esito.numero_lavoro} torna sul banco.`}
        etichettaDistruttiva={annulloInCorso ? 'Annullo…' : 'Annulla la consegna'}
        etichettaSicura="No, resta consegnato"
        nota={annulloFallito ? 'Non è andata a buon fine — la consegna resta valida. Riprova.' : undefined}
        onConferma={() => void annulla()}
        onAnnulla={() => setAnnulloAperto(false)}
      />
    </div>,
    document.body,
  )
}
