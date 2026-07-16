'use client'

// Ondata 16/07 §3.2 — FlussoConsegna: il rito della consegna in-place (D-5,
// spec sp.3 §8: la pagina intermedia è morta). Due tocchi: CONSEGNA → GET
// precheck fresco → verde: DialogConferma (primario sopra, deroga §5.17;
// warnings D-6 come nota ambra) → POST → frame «Consegnato!»; rosso: sheet
// «Prima di consegnare» (RigaBloccante → si risolve DOVE serve). Mappa esiti
// POST (shape reali, riserva backend #1-2): `tipo` è affidabile SOLO per
// precheck_fallito e stato_non_consegnabile; errore_pdf è SOVRACCARICO su 7
// esiti (incluso «già in corso») → copy generica + Riprova, MAI match sulla
// stringa. Il retry è sicuro: lock idempotente sempre rilasciato; ritentare
// su «già in corso» ricade nel ramo idempotente → 200 (eventualmente
// degradato: url documenti vuote → il frame li nasconde).
//
// ⚠️ Adattamenti vs brief (contratti reali):
//  - Caricamento.tsx esporta `Skeleton` (non `Caricamento`): è uno skeleton
//    inline → lo montiamo in un overlay portale coerente (OverlayCaricamento).
//  - Sheet renderizza GIÀ la sua via di fuga «Chiudi» (LinkQuieto in fondo) e
//    accetta `titolo`: usiamo `titolo` al posto degli span manuali e NON
//    aggiungiamo un secondo «Chiudi» (creerebbe due bottoni /chiudi/i).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sheet } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { RigaBloccante } from '@/components/ds/RigaBloccante'
import { Skeleton } from '@/components/ds/Caricamento'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { tipografia, spazio } from '@/design-system/v3/tokens'
import { FrameConsegnato } from './FrameConsegnato'
import type { ConsegnaResult, ConsegnaError, PrecheckConsegnaResponse } from '@/types/domain'

type Bloccanti = PrecheckConsegnaResponse['bloccanti']

type Stato =
  | { fase: 'verifica' }
  | { fase: 'dialog'; warnings: string[] }
  | { fase: 'bloccanti'; bloccanti: Bloccanti }
  | { fase: 'invio' }
  | { fase: 'consegnato'; esito: ConsegnaResult }
  | { fase: 'messaggio'; testo: string }
  | { fase: 'riprova'; erroreGet: boolean }

// Copy del «cosa fare» dei bloccanti: derivato dalla route (oggi sempre 'dati'
// → il ponte di modifica). «cosa» = la descrizione del precheck di produzione.
const COSA_FARE: Record<string, string> = { dati: 'Completa i dati del lavoro' }

// Overlay di attesa (§5.25): lo Skeleton è uno skeleton inline — qui lo
// montiamo in un portale coerente centrato sotto `[data-ds="v3"]`, così vale
// per il GET del precheck e per il POST della consegna.
function OverlayCaricamento() {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      data-ds="v3"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: spazio.l, background: 'var(--bg)' }}
    >
      <div style={{ width: '100%', maxWidth: 320 }}>
        <Skeleton righe={3} />
      </div>
    </div>,
    document.body,
  )
}

export function FlussoConsegna(props: {
  lavoroId: string
  numero: string
  dentista: string
  descrizione: string
  aperto: boolean
  onChiudi: () => void
  onConsegnato?: () => void
  onFrameChiuso: () => void
  onRisolvi?: (route: string) => void
}) {
  const { lavoroId, numero, dentista, descrizione, aperto, onChiudi, onConsegnato, onFrameChiuso, onRisolvi } = props
  const [stato, setStato] = useState<Stato>({ fase: 'verifica' })
  // il GET parte a ogni apertura: precheck sempre FRESCO (riserva UX #2)
  const apertoPrec = useRef(false)

  useEffect(() => {
    if (aperto && !apertoPrec.current) {
      apertoPrec.current = true
      setStato({ fase: 'verifica' })
      void verifica()
    }
    if (!aperto) apertoPrec.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto])

  async function verifica() {
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/precheck-consegna`)
      if (!res.ok) throw new Error(String(res.status))
      const pre = (await res.json()) as PrecheckConsegnaResponse
      if (pre.consegnabile) setStato({ fase: 'dialog', warnings: pre.warnings })
      else setStato({ fase: 'bloccanti', bloccanti: pre.bloccanti })
    } catch {
      setStato({ fase: 'riprova', erroreGet: true })
    }
  }

  async function invia() {
    // Guard anti double-submit: un POST già in volo non si raddoppia.
    if (stato.fase === 'invio') return
    setStato({ fase: 'invio' })
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/consegna`, { method: 'POST' })
      const json = (await res.json()) as ConsegnaResult | ConsegnaError
      if (json.ok) {
        onConsegnato?.()
        setStato({ fase: 'consegnato', esito: json })
        return
      }
      if (json.tipo === 'precheck_fallito' && json.errori_precheck) {
        setStato({ fase: 'bloccanti', bloccanti: json.errori_precheck })
        return
      }
      if (json.tipo === 'stato_non_consegnabile') {
        setStato({ fase: 'messaggio', testo: json.messaggio })
        return
      }
      // errore_pdf & co. — copy GENERICA + Riprova (mai la stringa server)
      setStato({ fase: 'riprova', erroreGet: false })
    } catch {
      setStato({ fase: 'riprova', erroreGet: false })
    }
  }

  if (!aperto) return null

  const notaWarnings =
    stato.fase === 'dialog' && stato.warnings.length > 0
      ? stato.warnings.length === 1
        ? stato.warnings[0]
        : `${stato.warnings.length} avvisi — si può consegnare, ma dai un occhio a magazzino e accettazione`
      : undefined

  const titoloEsito = stato.fase === 'messaggio' ? 'Non si può consegnare' : 'Non è andata a buon fine'

  return (
    <>
      {(stato.fase === 'verifica' || stato.fase === 'invio') && <OverlayCaricamento />}

      <DialogConferma
        aperto={stato.fase === 'dialog'}
        primarioSopra
        centraTesto
        occhiello="Consegno?"
        titolo={`${descrizione} n.${numero} → ${dentista}`}
        testo="DdC e buono di consegna si generano al tocco."
        nota={notaWarnings}
        etichettaDistruttiva="Consegna"
        etichettaSicura="Non ancora"
        onConferma={() => void invia()}
        onAnnulla={onChiudi}
      />

      <Sheet aperto={stato.fase === 'bloccanti'} onChiudi={onChiudi} titolo="Prima di consegnare">
        {stato.fase === 'bloccanti' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <span style={{ fontSize: 15, fontWeight: tipografia.weight.semibold, color: 'var(--muted)' }}>
              {stato.bloccanti.length === 1 ? 'Una cosa da sistemare. Tocca per risolvere.' : `${stato.bloccanti.length} cose da sistemare. Tocca per risolvere.`}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: spazio.s }}>
              {stato.bloccanti.map((b) => (
                <RigaBloccante
                  key={`${b.elemento}-${b.campo}`}
                  cosa={b.descrizione}
                  cosaFare={COSA_FARE[b.route] ?? 'Apri e completa'}
                  onTap={() => onRisolvi?.(b.route)}
                />
              ))}
            </div>
          </div>
        )}
      </Sheet>

      {(stato.fase === 'messaggio' || stato.fase === 'riprova') && (
        <Sheet aperto onChiudi={onChiudi} titolo={titoloEsito}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <span style={{ fontSize: 15.5, fontWeight: tipografia.weight.semibold, color: 'var(--muted)' }}>
              {stato.fase === 'messaggio' ? stato.testo : 'Nessun documento è stato perso. Puoi riprovare subito.'}
            </span>
            {stato.fase === 'riprova' && (
              <TastoSecondario onClick={() => (stato.erroreGet ? void verifica() : void invia())}>Riprova</TastoSecondario>
            )}
          </div>
        </Sheet>
      )}

      {stato.fase === 'consegnato' && (
        <FrameConsegnato
          esito={stato.esito}
          lavoroId={lavoroId}
          descrizione={descrizione}
          dentista={dentista}
          onChiudi={onFrameChiuso}
        />
      )}
    </>
  )
}
