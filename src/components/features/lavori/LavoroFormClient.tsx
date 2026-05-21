'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  LavoroDettaglio,
  LavoroLavorazione,
  LavoroFase,
  LavoroImmagine,
} from '@/types/domain'
import { useLavoroForm } from '@/hooks/useLavoroForm'
import { LavoroFormShell } from './form/LavoroFormShell'
import { TabDati } from './form/TabDati'
import { TabLavorazioni } from './form/TabLavorazioni'
import { TabClinica } from './form/TabClinica'
import { TabProduzione } from './form/TabProduzione'
import { TabDate } from './form/TabDate'
import { TabImmagini } from './form/TabImmagini'
import { TabDocumenti } from './form/TabDocumenti'
import { TabAccettazione } from './form/TabAccettazione'
import { TabProve } from './TabProve'
import { PacchettoConsegnaSheet } from './PacchettoConsegnaSheet'

interface LavoroFormClientProps {
  lavoro: LavoroDettaglio
}

export function LavoroFormClient({ lavoro }: LavoroFormClientProps) {
  const router = useRouter()

  // Stato form campi Lavoro (colonne tabella)
  const { data, update, save, saving, saved, saveError, isDirty } = useLavoroForm(lavoro)

  // Stato relazioni join — separate dal hook (non sono colonne di lavori)
  const [lavorazioni, setLavorazioni] = useState<LavoroLavorazione[]>(
    lavoro.lavorazioni ?? []
  )
  const [fasi, setFasi] = useState<LavoroFase[]>(lavoro.fasi ?? [])
  const [immagini, setImmagini] = useState<LavoroImmagine[]>(lavoro.immagini ?? [])

  // Stato bottom sheet Pacchetto Consegna MDR
  const [pacchettoOpen, setPacchettoOpen] = useState(false)

  function handleUpdateFase(id: string, updates: Partial<LavoroFase>) {
    setFasi((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    )
  }

  function handleAddImmagine(img: LavoroImmagine) {
    setImmagini((prev) => [...prev, img])
  }

  return (
    <div>
      <LavoroFormShell>
        {(activeTab) => {
          switch (activeTab) {
            case 'dati':
              return <TabDati data={data} onChange={update} />

            case 'accettazione':
              return (
                <TabAccettazione
                  data={data}
                  onChange={update}
                  clienteTelefono={lavoro.cliente?.telefono ?? null}
                  numeroLavoro={lavoro.numero_lavoro}
                  labNome={lavoro.laboratorio?.nome ?? null}
                  labTelefono={lavoro.laboratorio?.telefono ?? null}
                />
              )

            case 'lavorazioni':
              return (
                <TabLavorazioni
                  lavorazioni={lavorazioni}
                  lavoro_id={lavoro.id}
                  onChange={setLavorazioni}
                />
              )

            case 'clinica':
              return <TabClinica data={data} onChange={update} />

            case 'produzione':
              return (
                <TabProduzione
                  fasi={fasi}
                  onUpdateFase={handleUpdateFase}
                />
              )

            case 'prove':
              return (
                <TabProve
                  lavoroId={lavoro.id}
                  statoLavoro={data.stato ?? lavoro.stato}
                  onProvaInviata={() => router.refresh()}
                  onRientroRegistrato={() => router.refresh()}
                />
              )

            case 'date':
              return (
                <TabDate
                  data={data}
                  onChange={update}
                  appuntamenti={lavoro.appuntamenti ?? []}
                />
              )

            case 'immagini':
              return (
                <TabImmagini
                  immagini={immagini}
                  lavoro_id={lavoro.id}
                  onAdd={handleAddImmagine}
                />
              )

            case 'documenti':
              return (
                <TabDocumenti
                  ddc={lavoro.ddc ?? null}
                  lavoro_id={lavoro.id}
                />
              )

            default:
              return null
          }
        }}
      </LavoroFormShell>

      {/* Barra azioni fissa in fondo */}
      <div
        style={{
          position: 'sticky',
          bottom: '72px', // sopra BottomNavPill
          left: 0,
          right: 0,
          padding: '12px 20px',
          display: 'flex',
          gap: '10px',
          background: 'linear-gradient(to top, var(--bg, #DDD8D3) 60%, transparent)',
          zIndex: 10,
        }}
      >
        {/* Pulsante Salva — visibile solo se dirty */}
        {isDirty && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(lavoro.id)}
            style={{
              flex: 1,
              height: '52px',
              borderRadius: '14px',
              border: 'none',
              background: saving ? 'var(--elv, #EDEDEA)' : 'var(--surface, #E4DFD9)',
              color: saving ? 'var(--t2, #96918D)' : 'var(--t1, #1C1916)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow:
                'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
              transition: 'background 0.08s',
            }}
            aria-busy={saving}
            aria-label={saving ? 'Salvataggio in corso...' : 'Salva modifiche'}
          >
            {saving ? 'Salvataggio...' : saved ? '✓ Salvato' : saveError ? '⚠ Errore — riprova' : 'Salva'}
          </button>
        )}

        {saveError && !isDirty && (
          <p
            role="alert"
            style={{
              position: 'absolute',
              bottom: '72px',
              left: '20px',
              right: '20px',
              margin: 0,
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(217,0,18,0.08)',
              border: '1px solid rgba(217,0,18,0.25)',
              color: 'var(--primary, #D90012)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {saveError}
          </p>
        )}

        {/* Pulsante Documenti MDR */}
        <button
          type="button"
          onClick={() => setPacchettoOpen(true)}
          aria-label="Apri pacchetto documenti MDR"
          style={{
            flex: '0 0 auto',
            height: '52px',
            padding: '0 16px',
            borderRadius: '14px',
            border: '1.5px solid rgba(0,0,0,.10)',
            background: 'var(--elv, #EDEDEA)',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Pacchetto Documenti MDR"
        >
          📦
        </button>

        {/* Pulsante CONSEGNA */}
        <button
          type="button"
          onClick={() => router.push(`/lavori/${lavoro.id}/consegna`)}
          style={{
            flex: isDirty ? '0 0 auto' : 1,
            height: '52px',
            padding: '0 24px',
            borderRadius: '14px',
            border: 'none',
            background: 'var(--gold, #D4A843)',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 800,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            boxShadow: '0 0 20px hsl(43 65% 55% / 0.4)',
            whiteSpace: 'nowrap',
          }}
          aria-label="Vai alla consegna del lavoro"
        >
          CONSEGNA
          <span aria-hidden="true" style={{ marginLeft: '6px' }}>
            →
          </span>
        </button>
      </div>

      {/* Bottom sheet Pacchetto Consegna MDR */}
      <PacchettoConsegnaSheet
        lavoro={{
          id: lavoro.id,
          numero_lavoro: lavoro.numero_lavoro,
          cliente_display: lavoro.cliente
            ? `${lavoro.cliente.studio_nome ?? ''} ${lavoro.cliente.cognome} ${lavoro.cliente.nome}`.trim()
            : lavoro.numero_lavoro,
        }}
        isOpen={pacchettoOpen}
        onClose={() => setPacchettoOpen(false)}
      />
    </div>
  )
}
