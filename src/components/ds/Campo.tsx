'use client'

// DS v3 §5.27 — Campo: gli input di testo/numero/data per wizard e sheet.
// Usati SOLO dentro wizard e sheet (mai in una lista o in una card di sola
// lettura): sono l'unica famiglia di componenti che chiede qualcosa
// all'odontotecnico, una domanda alla volta.
//
// Anatomia comune (§5.27): H 64 · card `raggio.riga` (18) · testo 19/700 ·
// label SOPRA, 13/800 MAIUSCOLA `--faint` · anello di focus 2px `--blue`
// su `:focus` (non `:focus-visible`): a differenza dei tasti, qui contano
// sia la tastiera sia il tocco diretto — un tap che porta il focus su un
// campo deve mostrare subito dove si sta scrivendo.

import { useId, useState, type ChangeEvent, type CSSProperties } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { tipografia, raggio, spazio } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

const ALTEZZA_CAMPO = 64 // §5.27 — letterale, non in scala spazio/raggio

const stileLabel: CSSProperties = {
  display: 'block',
  fontSize: tipografia.size.label,
  fontWeight: tipografia.weight.extrabold,
  textTransform: 'uppercase',
  letterSpacing: tipografia.tracking.label,
  color: 'var(--faint)',
  marginBottom: spazio.xs,
}

function stileCampo(extra?: CSSProperties): CSSProperties {
  return {
    display: 'block',
    boxSizing: 'border-box',
    width: '100%',
    height: ALTEZZA_CAMPO,
    borderRadius: raggio.riga,
    border: '1px solid var(--line)',
    background: 'var(--card)',
    color: 'var(--ink)',
    fontFamily: tipografia.famiglia,
    fontSize: 19, // §5.27 — letterale, fuori scala tipografica standard
    fontWeight: 700,
    padding: '0 20px',
    ...extra,
  }
}

/**
 * CampoTesto — input di testo libero (§5.27).
 *
 * Usato SOLO dentro wizard e sheet. Label sopra, maiuscola. Nessun
 * suono/vibrazione sulla digitazione: è un flusso continuo, non un gesto
 * discreto da confermare.
 */
export function CampoTesto(props: {
  label: string
  valore: string
  onCambia: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const { label, valore, onCambia, placeholder, autoFocus = false } = props
  const id = useId()

  return (
    <div>
      <style>{`
        .ds-campo-testo:focus {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <label htmlFor={id} style={stileLabel}>
        {label}
      </label>
      <input
        id={id}
        className="ds-campo-testo"
        type="text"
        value={valore}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onCambia(e.target.value)}
        style={stileCampo()}
      />
    </div>
  )
}

/**
 * CampoNumero — input numerico con tastierino nativo (§5.27).
 *
 * `inputMode="decimal"` per il tastierino nativo con virgola/punto (importi).
 * Resta un `<input type="text">`: `type="number"` nasconde il suffisso e
 * introduce spinner nativi (vietati, §5.25) — la validazione del formato
 * numerico è responsabilità del chiamante (wizard), non di questo campo.
 * `suffisso` (es. '€') è mostrato dentro il campo, a destra.
 */
export function CampoNumero(props: {
  label: string
  valore: string
  onCambia: (v: string) => void
  suffisso?: string
}) {
  const { label, valore, onCambia, suffisso } = props
  const id = useId()

  return (
    <div>
      <style>{`
        .ds-campo-numero:focus {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <label htmlFor={id} style={stileLabel}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          className="ds-campo-numero"
          type="text"
          inputMode="decimal"
          value={valore}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onCambia(e.target.value)}
          style={stileCampo({ paddingRight: suffisso ? 44 : 20 })}
        />
        {suffisso && (
          <span
            data-ds-suffisso=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 19,
              fontWeight: 700,
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          >
            {suffisso}
          </span>
        )}
      </div>
    </div>
  )
}

// --- CampoData: date math puro (testabile in isolamento) -------------------

/** Mezzanotte locale dello stesso giorno di `d` — azzera l'ora, non il fuso. */
export function inizioGiorno(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Somma `n` giorni (anche negativi) attraversando correttamente mese/anno. */
export function aggiungiGiorni(d: Date, n: number): Date {
  const risultato = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  return risultato
}

export function stessoGiorno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Prossimo lunedì SEMPRE strettamente successivo a `oggi` — mai oggi stesso.
 *
 * Decisione di legge (§5.27, documentata qui perché non ovvia): se `oggi` è
 * già lunedì, la pill non mostra oggi (sarebbe ridondante con «Oggi») ma il
 * lunedì della settimana successiva, +7 giorni. Se `oggi` è domenica, il
 * prossimo lunedì è domani (+1 giorno) — il caso limite più stretto.
 */
export function prossimoLunedi(oggi: Date): Date {
  const base = inizioGiorno(oggi)
  const giornoSettimana = base.getDay() // 0=domenica … 1=lunedì … 6=sabato
  const distanza = ((8 - giornoSettimana) % 7) || 7 // sempre in 1..7, mai 0
  return aggiungiGiorni(base, distanza)
}

/** «Lun 14» — giorno breve in italiano (Intl, prima lettera maiuscola) + numero del giorno. */
export function formattaGiornoBreve(d: Date): string {
  const giornoSettimana = new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(d)
  const capitalizzato = giornoSettimana.charAt(0).toUpperCase() + giornoSettimana.slice(1)
  return `${capitalizzato} ${d.getDate()}`
}

/** "2026-08-20" (formato nativo di `<input type="date">`) → Date locale, senza sfasamento di fuso. */
function parseInputData(v: string): Date | null {
  const parti = v.split('-').map(Number)
  const [anno, mese, giorno] = parti
  if (!anno || !mese || !giorno) return null
  return new Date(anno, mese - 1, giorno)
}

/** Date locale → "YYYY-MM-DD" per popolare il valore di `<input type="date">`. */
function formattaInputData(d: Date): string {
  const anno = String(d.getFullYear()).padStart(4, '0')
  const mese = String(d.getMonth() + 1).padStart(2, '0')
  const giorno = String(d.getDate()).padStart(2, '0')
  return `${anno}-${mese}-${giorno}`
}

const stilePill = (selezionata: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44, // constraint 10 — hit area, indipendente dalla resa visiva
  padding: '0 16px',
  borderRadius: raggio.pill,
  border: selezionata ? '1px solid var(--blue)' : '1px solid var(--line)',
  background: selezionata ? 'var(--blue-tint)' : 'var(--card)',
  color: selezionata ? 'var(--blue)' : 'var(--ink)',
  fontFamily: tipografia.famiglia,
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.extrabold,
  cursor: 'pointer',
})

/**
 * CampoData — scelte rapide di data (§5.27).
 *
 * MAI un calendario a griglia come default (L1-adiacente: una domanda alla
 * volta, non 30 caselle). Le prime tre pill («Oggi», «Domani», «Lun n») sono
 * calcolate da `oggi` (iniettabile per i test). «Scegli…» rivela un
 * `<input type="date">` nativo — l'unico punto in cui compare davvero un
 * calendario, ed è quello del sistema operativo, non uno disegnato da noi.
 * Selezione = `vibra('selection')`, mai suono (è una scelta silenziosa,
 * non una conferma sonora). La pill selezionata porta sempre un ✓ e
 * `aria-pressed`, mai solo il tint blu (L3).
 */
export function CampoData(props: {
  label: string
  valore: Date | null
  onCambia: (v: Date) => void
  oggi?: Date
}) {
  const { label, valore, onCambia, oggi = new Date() } = props
  const [sceltaAperta, setSceltaAperta] = useState(false)
  const idInputData = useId()
  const idLabel = useId()

  const oggiInizio = inizioGiorno(oggi)
  const domaniData = aggiungiGiorni(oggiInizio, 1)
  const lunData = prossimoLunedi(oggi)
  const valoreInizio = valore ? inizioGiorno(valore) : null

  const oggiSelezionata = !!valoreInizio && stessoGiorno(valoreInizio, oggiInizio)
  const domaniSelezionata = !!valoreInizio && stessoGiorno(valoreInizio, domaniData)
  const lunSelezionata = !!valoreInizio && stessoGiorno(valoreInizio, lunData)
  const sceltaSelezionata = !!valoreInizio && !oggiSelezionata && !domaniSelezionata && !lunSelezionata

  function scegli(data: Date) {
    vibra('selection')
    onCambia(data)
  }

  function handleInputData(e: ChangeEvent<HTMLInputElement>) {
    const data = parseInputData(e.target.value)
    if (!data) return
    scegli(data)
  }

  return (
    <div>
      <style>{`
        .ds-campo-data-pill:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
        .ds-campo-data-input:focus {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <span id={idLabel} style={stileLabel}>{label}</span>
      <div
        role="group"
        aria-labelledby={idLabel}
        style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}
      >
        <motion.button
          type="button"
          className="ds-campo-data-pill"
          aria-pressed={oggiSelezionata}
          onClick={() => scegli(oggiInizio)}
          whileTap={{ scale: 0.97 }}
          transition={molla.press}
          style={stilePill(oggiSelezionata)}
        >
          {oggiSelezionata && <span aria-hidden="true">✓ </span>}
          Oggi
        </motion.button>
        <motion.button
          type="button"
          className="ds-campo-data-pill"
          aria-pressed={domaniSelezionata}
          onClick={() => scegli(domaniData)}
          whileTap={{ scale: 0.97 }}
          transition={molla.press}
          style={stilePill(domaniSelezionata)}
        >
          {domaniSelezionata && <span aria-hidden="true">✓ </span>}
          Domani
        </motion.button>
        <motion.button
          type="button"
          className="ds-campo-data-pill"
          aria-pressed={lunSelezionata}
          onClick={() => scegli(lunData)}
          whileTap={{ scale: 0.97 }}
          transition={molla.press}
          style={stilePill(lunSelezionata)}
        >
          {lunSelezionata && <span aria-hidden="true">✓ </span>}
          {formattaGiornoBreve(lunData)}
        </motion.button>
        <motion.button
          type="button"
          className="ds-campo-data-pill"
          aria-pressed={sceltaSelezionata}
          aria-expanded={sceltaAperta}
          onClick={() => setSceltaAperta(true)}
          whileTap={{ scale: 0.97 }}
          transition={molla.press}
          style={stilePill(sceltaSelezionata)}
        >
          {sceltaSelezionata && <span aria-hidden="true">✓ </span>}
          Scegli…
        </motion.button>
      </div>
      {sceltaAperta && (
        <input
          id={idInputData}
          className="ds-campo-data-input"
          type="date"
          defaultValue={sceltaSelezionata && valoreInizio ? formattaInputData(valoreInizio) : undefined}
          onChange={handleInputData}
          style={{ ...stileCampo(), marginTop: spazio.s }}
        />
      )}
    </div>
  )
}
