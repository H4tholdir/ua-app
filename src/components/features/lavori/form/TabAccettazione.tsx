'use client'

import { motion } from 'motion/react'
import type { Lavoro } from '@/types/domain'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticLight } from '@/lib/feedback/haptic'
import {
  inputBase,
  labelStyle,
  fieldStyle,
  sectionSeparator,
  sectionTitle,
  raisedShadow,
  insetShadow,
} from './styles'

// ─── Opzioni ──────────────────────────────────────────────────────
const TIPI_IMPRONTA = [
  { value: '',                                label: '— Seleziona —' },
  { value: 'Alginato',                        label: 'Alginato' },
  { value: 'Silicone per addizione (PVS)',    label: 'Silicone per addizione (PVS)' },
  { value: 'Silicone per condensazione',      label: 'Silicone per condensazione' },
  { value: 'Polivinilsilossano',              label: 'Polivinilsilossano' },
  { value: 'Scansione digitale / STL',        label: 'Scansione digitale / STL' },
  { value: 'Gesso',                           label: 'Gesso' },
  { value: 'Altro',                           label: 'Altro' },
] as const

const DISINFETTANTI = [
  { value: '',                      label: '— Seleziona —' },
  { value: 'Korsolex Plus',         label: 'Korsolex Plus' },
  { value: 'Surgikos',              label: 'Surgikos' },
  { value: 'MD 520',                label: 'MD 520' },
  { value: 'Gigasept Instru AF',    label: 'Gigasept Instru AF' },
  { value: 'Deconex',               label: 'Deconex' },
  { value: 'Altro',                 label: 'Altro' },
] as const

type MaterialeKey = 'modelli_gesso' | 'bite' | 'fotografie' | 'radiografie' | 'articolatore' | 'altro'

const MATERIALI: { key: MaterialeKey; label: string }[] = [
  { key: 'modelli_gesso', label: 'Modelli in gesso' },
  { key: 'bite',          label: 'Bite / Registrazione occlusale' },
  { key: 'fotografie',    label: 'Fotografie colore' },
  { key: 'radiografie',   label: 'Radiografie' },
  { key: 'articolatore',  label: 'Articolatore' },
  { key: 'altro',         label: 'Altro' },
]

// ─── Toggle switch animato ────────────────────────────────────────
interface ToggleSwitchProps {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  sub?: string
  reduced: boolean
}

function ToggleSwitch({ id, checked, onChange, label, sub, reduced }: ToggleSwitchProps) {
  const spring = motionTokens.spring.snappy

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '14px 16px',
        background: 'var(--sfc, #E4DFD9)',
        borderRadius: '14px',
        boxShadow: raisedShadow,
        cursor: 'pointer',
        minHeight: '44px',
        marginBottom: '12px',
        userSelect: 'none',
      }}
      onClick={() => {
        hapticLight()
        onChange(!checked)
      }}
    >
      <div style={{ flex: 1 }}>
        <p
          id={`${id}-label`}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--t1, #1C1916)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'var(--t2, #96918D)',
              margin: '2px 0 0',
            }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* Track */}
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={(e) => {
          e.stopPropagation()
          hapticLight()
          onChange(!checked)
        }}
        style={{
          position: 'relative',
          width: '48px',
          height: '28px',
          borderRadius: '14px',
          border: 'none',
          background: checked ? 'var(--primary, #D90012)' : 'var(--elv, #EDEDEA)',
          cursor: 'pointer',
          flexShrink: 0,
          padding: 0,
          transition: reduced ? 'none' : `background ${motionTokens.duration.fast}s`,
          boxShadow: insetShadow,
        }}
      >
        {/* Knob — layout anima la posizione left automaticamente */}
        <motion.span
          layout
          transition={reduced ? { duration: 0 } : spring}
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '22px',
            height: '22px',
            borderRadius: '11px',
            background: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,.25)',
            display: 'block',
          }}
        />
      </button>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────
interface TabAccettazioneProps {
  data: Partial<Lavoro>
  onChange: (u: Partial<Lavoro>) => void
}

// ─── Helpers ─────────────────────────────────────────────────────
function toggleMateriale(
  current: string[],
  key: MaterialeKey,
): string[] {
  return current.includes(key)
    ? current.filter((k) => k !== key)
    : [...current, key]
}

function mdrScore(data: Partial<Lavoro>): number {
  let score = 0
  if (data.tipo_impronte) score++
  if (data.disinfettante_usato && data.lotto_disinfettante) score++
  if ((data.materiali_allegati ?? []).length > 0) score++
  return score
}

// ─── Componente ───────────────────────────────────────────────────
export function TabAccettazione({ data, onChange }: TabAccettazioneProps) {
  const reduced = useReducedMotion()
  const spring = motionTokens.spring.snappy
  const materialiAttuali = data.materiali_allegati ?? []
  const score = mdrScore(data)
  const scorePercent = Math.round((score / 3) * 100)

  return (
    <div>
      {/* ═══ 1. POSIZIONE FISICA ═══════════════════════════════════ */}
      <div style={fieldStyle}>
        <label htmlFor="numero_cassetta" style={labelStyle}>
          N° cassetta
        </label>
        <input
          id="numero_cassetta"
          type="text"
          inputMode="numeric"
          placeholder="Es. 42"
          value={data.numero_cassetta ?? ''}
          onBlur={(e) => onChange({ numero_cassetta: e.target.value || null })}
          onChange={(e) => onChange({ numero_cassetta: e.target.value || null })}
          aria-label="Numero cassetta"
          style={{
            ...inputBase,
            fontSize: '28px',
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '0.04em',
            fontVariantNumeric: 'tabular-nums',
            padding: '16px 14px',
          }}
        />
      </div>

      <div style={sectionSeparator} />

      {/* ═══ 2. MATERIALI RICEVUTI ══════════════════════════════════ */}
      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <p style={{ ...sectionTitle, margin: 0 }}>Materiali ricevuti</p>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: '20px',
            padding: '0 8px',
            borderRadius: '10px',
            background: 'var(--elv, #EDEDEA)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--t2, #96918D)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          MDR Allegato XIII
        </span>
      </div>

      {/* Tipo impronta */}
      <div style={fieldStyle}>
        <label htmlFor="tipo_impronte" style={labelStyle}>
          Tipo impronta <span aria-hidden="true" style={{ color: 'var(--primary, #D90012)' }}>*</span>
        </label>
        <select
          id="tipo_impronte"
          value={data.tipo_impronte ?? ''}
          onBlur={(e) => onChange({ tipo_impronte: e.target.value || null })}
          onChange={(e) => onChange({ tipo_impronte: e.target.value || null })}
          aria-label="Tipo di impronta ricevuta"
          aria-required="true"
          style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
        >
          {TIPI_IMPRONTA.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Disinfettante + Lotto — 2 colonne */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <label htmlFor="disinfettante_usato" style={labelStyle}>
            Disinfettante
          </label>
          <select
            id="disinfettante_usato"
            value={data.disinfettante_usato ?? ''}
            onBlur={(e) => onChange({ disinfettante_usato: e.target.value || null })}
            onChange={(e) => onChange({ disinfettante_usato: e.target.value || null })}
            aria-label="Disinfettante usato per decontaminazione"
            style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
          >
            {DISINFETTANTI.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lotto_disinfettante" style={labelStyle}>
            Lotto
          </label>
          <input
            id="lotto_disinfettante"
            type="text"
            placeholder="Es. LOT-2024-01"
            value={data.lotto_disinfettante ?? ''}
            onBlur={(e) => onChange({ lotto_disinfettante: e.target.value || null })}
            onChange={(e) => onChange({ lotto_disinfettante: e.target.value || null })}
            aria-label="Numero di lotto del disinfettante"
            style={{ ...inputBase, fontVariantNumeric: 'tabular-nums' }}
          />
        </div>
      </div>

      {/* Materiali allegati — checkbox card */}
      <div style={{ marginBottom: '18px' }}>
        <p style={labelStyle}>Materiali allegati</p>
        <ul
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}
          aria-label="Materiali fisici allegati al lavoro"
        >
          {MATERIALI.map((m) => {
            const checked = materialiAttuali.includes(m.key)
            return (
              <li key={m.key}>
                <motion.div
                  role="checkbox"
                  aria-checked={checked}
                  tabIndex={0}
                  onClick={() => {
                    hapticLight()
                    onChange({ materiali_allegati: toggleMateriale(materialiAttuali, m.key) })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      hapticLight()
                      onChange({ materiali_allegati: toggleMateriale(materialiAttuali, m.key) })
                    }
                  }}
                  whileTap={reduced ? {} : { scale: 0.97 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    background: checked ? 'var(--sfc, #E4DFD9)' : 'var(--elv, #EDEDEA)',
                    borderRadius: '12px',
                    boxShadow: raisedShadow,
                    cursor: 'pointer',
                    minHeight: '44px',
                    userSelect: 'none',
                    border: checked ? '1.5px solid rgba(212,168,67,.35)' : '1.5px solid transparent',
                    transition: reduced ? 'none' : `border-color ${motionTokens.duration.fast}s, background ${motionTokens.duration.fast}s`,
                  }}
                >
                  {/* Checkbox custom */}
                  <motion.div
                    animate={
                      reduced
                        ? {}
                        : checked
                        ? { scale: [1, 0.94, 1] }
                        : { scale: 1 }
                    }
                    transition={spring}
                    style={{
                      width: '22px',
                      height: '22px',
                      minWidth: '22px',
                      borderRadius: '6px',
                      border: checked ? 'none' : '2px solid var(--t3, #B8B3AE)',
                      background: checked ? 'var(--gold, #D4A843)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {checked && (
                      <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true">
                        <path
                          d="M1.5 5L5 8.5L11.5 1.5"
                          stroke="#1C1916"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </motion.div>

                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '15px',
                      fontWeight: checked ? 600 : 400,
                      color: 'var(--t1, #1C1916)',
                      transition: reduced ? 'none' : `font-weight ${motionTokens.duration.fast}s`,
                    }}
                  >
                    {m.label}
                  </span>
                </motion.div>
              </li>
            )
          })}
        </ul>
      </div>

      <div style={sectionSeparator} />

      {/* ═══ 3. NOTE CLINICHE ═══════════════════════════════════════ */}
      <p style={sectionTitle}>Note cliniche</p>

      <ToggleSwitch
        id="anamnesi_bruxismo"
        checked={data.anamnesi_bruxismo ?? false}
        onChange={(v) => onChange({ anamnesi_bruxismo: v })}
        label="Paziente bruxista"
        sub="Modifica il design occlusale"
        reduced={reduced}
      />

      <ToggleSwitch
        id="anamnesi_difficolta_manuali"
        checked={data.anamnesi_difficolta_manuali ?? false}
        onChange={(v) => onChange({ anamnesi_difficolta_manuali: v })}
        label="Difficoltà manuali"
        sub="Scarsa manualità nella gestione"
        reduced={reduced}
      />

      {/* Nota tecnica */}
      <div style={fieldStyle}>
        <label htmlFor="anamnesi_precauzioni_acc" style={labelStyle}>
          Nota tecnica
        </label>
        <textarea
          id="anamnesi_precauzioni_acc"
          rows={3}
          placeholder="Es. Impronta spostata sul dente 16, modello con bolla..."
          value={data.anamnesi_precauzioni ?? ''}
          onBlur={(e) => onChange({ anamnesi_precauzioni: e.target.value || null })}
          onChange={(e) => onChange({ anamnesi_precauzioni: e.target.value || null })}
          aria-label="Note tecniche sull'impronta e sul materiale ricevuto"
          style={{ ...inputBase, resize: 'vertical' }}
        />
      </div>

      <div style={sectionSeparator} />

      {/* ═══ 4. PROGRESS BAR MDR ════════════════════════════════════ */}
      <div
        style={{
          padding: '16px 18px',
          borderRadius: '16px',
          background: 'var(--elv, #EDEDEA)',
          boxShadow: raisedShadow,
          marginBottom: '24px',
        }}
        role="status"
        aria-label={`Completezza MDR: ${scorePercent}%`}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--t2, #96918D)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            Completezza MDR Allegato XIII
          </p>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: score === 3 ? 'var(--success, #16A34A)' : 'var(--t2, #96918D)',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {scorePercent}%
          </p>
        </div>

        {/* Progress bar track */}
        <div
          style={{
            height: '6px',
            borderRadius: '3px',
            background: 'var(--prs, #D4CFC9)',
            overflow: 'hidden',
            marginBottom: '12px',
          }}
          aria-hidden="true"
        >
          <motion.div
            animate={reduced ? {} : { width: `${scorePercent}%` }}
            initial={{ width: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.enter }}
            style={{
              height: '100%',
              borderRadius: '3px',
              background: score === 3 ? 'var(--success, #16A34A)' : score === 2 ? 'var(--gold, #D4A843)' : 'var(--t3, #B8B3AE)',
              width: reduced ? `${scorePercent}%` : undefined,
            }}
          />
        </div>

        {/* Checklist items */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { ok: !!data.tipo_impronte, label: 'Tipo impronta' },
            {
              ok: !!(data.disinfettante_usato && data.lotto_disinfettante),
              label: 'Disinfettante + lotto',
            },
            { ok: materialiAttuali.length > 0, label: 'Materiali allegati' },
          ].map((item, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: item.ok ? 'var(--success, #16A34A)' : 'var(--t2, #96918D)',
              }}
            >
              <span aria-hidden="true">{item.ok ? '✓' : '⚠'}</span>
              <span>{item.label}</span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {item.ok ? 'completato' : 'mancante'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
