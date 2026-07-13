'use client'

// Ondata 3a Task 3 — ModificaRigaSheet: lo `Sheet` di modifica per-riga della
// scheda-vista v3 (§3, `CardInfo` con righe editabili). Discriminato su
// `campo`: rende il controllo giusto e, al salvataggio, invia SEMPRE un PATCH
// `/api/lavori/{lavoroId}` con SOLO le chiavi pertinenti a quel campo — tutte
// e 4 (`note_interne`, `data_consegna_prevista`+`ora_consegna`, `tecnico_id`,
// `cliente_id`) sono nella allowlist di `PATCHABLE_FIELDS` (vedi
// `src/app/api/lavori/[id]/route.ts`). Aggiornamento ottimistico: `onSalvato(patch)`
// passa il patch grezzo al padre (Task 6, `SchedaLavoroV3`), che decide come
// applicarlo (stato locale per i campi scalari, `router.refresh()` per le FK
// — vedi piano §Task 6). Nessuna gestione di errore silenziosa: `onErrore`
// riceve sempre un messaggio in italiano, mai propagato lo `status`/l'oggetto
// errore grezzo (L6, coerente con `CardFasiV3`).

import { useEffect, useState, type ChangeEvent } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto, CampoData } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TileScelta } from '@/components/ds/TileScelta'
import { ClienteComboBox } from '@/components/features/clienti/ClienteComboBox'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'

type Campo = 'consegna' | 'tecnico' | 'dentista' | 'note'

const TITOLI: Record<Campo, string> = {
  consegna: 'Data di consegna',
  tecnico: 'Tecnico assegnato',
  dentista: 'Dentista',
  note: 'Note interne',
}

const MESSAGGIO_ERRORE = 'Non è stato possibile salvare la modifica. Riprova.'

/** Forma di `valoreIniziale`/stato interno per `campo="consegna"` — rispecchia
 * di proposito i nomi delle colonne DB (`data_consegna_prevista`,
 * `ora_consegna`), così il patch finale è lo stato stesso, senza rimappature:
 * il chiamante (Task 6) passa direttamente i valori grezzi già presenti su
 * `lavoro`, senza dover costruire `Date`. */
type ValoreConsegna = {
  data_consegna_prevista: string | null
  ora_consegna: string | null
}

function normalizzaConsegna(v: unknown): ValoreConsegna {
  const obj = (v ?? {}) as Partial<ValoreConsegna>
  return {
    data_consegna_prevista: obj.data_consegna_prevista ?? null,
    ora_consegna: obj.ora_consegna ?? null,
  }
}

/** "2026-07-20" (data locale, stesso formato di `<input type="date">`) → `Date` locale. */
function parseDataISO(v: string): Date | null {
  const [anno, mese, giorno] = v.split('-').map(Number)
  if (!anno || !mese || !giorno) return null
  return new Date(anno, mese - 1, giorno)
}

/** `Date` locale → "2026-07-20", l'inverso di `parseDataISO`. */
function formattaDataISO(d: Date): string {
  const anno = String(d.getFullYear()).padStart(4, '0')
  const mese = String(d.getMonth() + 1).padStart(2, '0')
  const giorno = String(d.getDate()).padStart(2, '0')
  return `${anno}-${mese}-${giorno}`
}

interface TecnicoOpzione {
  id: string
  nome: string
  cognome: string
}

/**
 * ModificaRigaSheet — lo `Sheet` di modifica di UNA riga della scheda-vista
 * (§3). `campo` sceglie il ramo di render; `salva(patch)` è l'unica via
 * verso il backend, condivisa da tutti e 4 i rami (niente logica PATCH
 * duplicata per campo).
 */
export function ModificaRigaSheet(props: {
  aperto: boolean
  onChiudi: () => void
  lavoroId: string
  campo: Campo
  valoreIniziale: unknown
  onSalvato: (patch: Record<string, unknown>) => void
  onErrore: (msg: string) => void
}) {
  const { aperto, onChiudi, lavoroId, campo, onSalvato, onErrore } = props
  const [valore, setValore] = useState<unknown>(props.valoreIniziale)
  const [salvando, setSalvando] = useState(false)
  const [tecnici, setTecnici] = useState<TecnicoOpzione[]>([])

  // «tecnico»: la lista si carica on-open (non al mount) — lo sheet può
  // restare montato col padre mentre resta chiuso (§Task 6, un solo Sheet
  // condiviso per campo attivo).
  useEffect(() => {
    if (!aperto || campo !== 'tecnico') return
    let annullato = false
    fetch('/api/tecnici')
      .then((res) => (res.ok ? res.json() : { tecnici: [] }))
      .then((json) => {
        if (!annullato) setTecnici(json.tecnici ?? [])
      })
      .catch(() => {
        if (!annullato) setTecnici([])
      })
    return () => {
      annullato = true
    }
  }, [aperto, campo])

  async function salva(patch: Record<string, unknown>) {
    setSalvando(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        onErrore(MESSAGGIO_ERRORE)
        return
      }
      onSalvato(patch)
      onChiudi()
    } catch {
      onErrore(MESSAGGIO_ERRORE)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo={TITOLI[campo]}>
      {campo === 'note' && (
        <>
          <CampoTesto
            label="Note interne"
            valore={String(valore ?? '')}
            onCambia={setValore as (v: string) => void}
          />
          <TastoPrimario
            disabled={salvando}
            onClick={() => salva({ note_interne: String(valore ?? '') })}
          >
            Salva
          </TastoPrimario>
        </>
      )}

      {campo === 'consegna' && (
        <RamoConsegna
          valore={normalizzaConsegna(valore)}
          onCambia={setValore}
          salvando={salvando}
          onSalva={salva}
        />
      )}

      {campo === 'tecnico' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spazio.sm }}>
          {tecnici.map((t) => (
            <TileScelta
              key={t.id}
              nome={`${t.nome} ${t.cognome}`}
              onClick={() => salva({ tecnico_id: t.id })}
            />
          ))}
        </div>
      )}

      {campo === 'dentista' && (
        <ClienteComboBox
          value={String(valore ?? '')}
          onChange={(id) => {
            if (id) salva({ cliente_id: id })
          }}
        />
      )}
    </Sheet>
  )
}

/**
 * Ramo «consegna» — estratto in componente separato SOLO per tenere pulito
 * il corpo di `ModificaRigaSheet` (nessuna logica propria oltre al derive di
 * `Date | null` per `CampoData`): `CampoData` vuole un `Date`, la colonna DB è
 * una stringa "YYYY-MM-DD" — il parse/format vive qui, il resto (stato,
 * salvataggio) resta nel genitore.
 */
function RamoConsegna(props: {
  valore: ValoreConsegna
  onCambia: (v: ValoreConsegna) => void
  salvando: boolean
  onSalva: (patch: Record<string, unknown>) => void
}) {
  const { valore, onCambia, salvando, onSalva } = props
  const dataSelezionata = valore.data_consegna_prevista ? parseDataISO(valore.data_consegna_prevista) : null

  function handleOraCambia(e: ChangeEvent<HTMLInputElement>) {
    onCambia({ ...valore, ora_consegna: e.target.value })
  }

  return (
    <>
      <CampoData
        label="Data di consegna"
        valore={dataSelezionata}
        onCambia={(d) => onCambia({ ...valore, data_consegna_prevista: formattaDataISO(d) })}
      />
      <div>
        <label htmlFor="ora-consegna-input" style={stileLabelOra}>
          Ora di consegna
        </label>
        <input
          id="ora-consegna-input"
          type="time"
          value={valore.ora_consegna ?? ''}
          onChange={handleOraCambia}
          style={stileInputOra}
        />
      </div>
      <TastoPrimario
        disabled={salvando || !valore.data_consegna_prevista}
        onClick={() =>
          onSalva({
            data_consegna_prevista: valore.data_consegna_prevista,
            ora_consegna: valore.ora_consegna,
          })
        }
      >
        Salva
      </TastoPrimario>
    </>
  )
}

const stileLabelOra = {
  display: 'block',
  fontSize: tipografia.size.label,
  fontWeight: tipografia.weight.extrabold,
  textTransform: 'uppercase',
  letterSpacing: tipografia.tracking.label,
  color: 'var(--faint)',
  marginBottom: spazio.xs,
} as const

const stileInputOra = {
  display: 'block',
  boxSizing: 'border-box',
  width: '100%',
  height: 64,
  borderRadius: raggio.riga,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--ink)',
  fontFamily: tipografia.famiglia,
  fontSize: 19,
  fontWeight: 700,
  padding: '0 20px',
} as const
