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

interface LavoroFormClientProps {
  lavoro: LavoroDettaglio
}

export function LavoroFormClient({ lavoro }: LavoroFormClientProps) {
  const router = useRouter()

  // Stato form campi Lavoro (colonne tabella)
  const { data, update, save, saving, saved, isDirty } = useLavoroForm(lavoro)

  // Stato relazioni join — separate dal hook (non sono colonne di lavori)
  const [lavorazioni, setLavorazioni] = useState<LavoroLavorazione[]>(
    lavoro.lavorazioni ?? []
  )
  const [fasi, setFasi] = useState<LavoroFase[]>(lavoro.fasi ?? [])
  const [immagini, setImmagini] = useState<LavoroImmagine[]>(lavoro.immagini ?? [])

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
          bottom: '72px', // sopra BottomTabBar
          left: 0,
          right: 0,
          padding: '12px 20px',
          display: 'flex',
          gap: '10px',
          background: 'linear-gradient(to top, #0F1E52 60%, transparent)',
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
              background: saving ? '#243580' : '#1B2D6B',
              color: saving ? '#8899CC' : '#F0F4FF',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow:
                '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
              transition: 'background 0.08s',
            }}
            aria-busy={saving}
            aria-label={saving ? 'Salvataggio in corso...' : 'Salva modifiche'}
          >
            {saving ? 'Salvataggio...' : saved ? 'Salvato' : 'Salva'}
          </button>
        )}

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
            background: '#D4A843',
            color: '#0F1E52',
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
    </div>
  )
}
