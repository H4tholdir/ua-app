'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import type { Lavoro } from '@/types/domain'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'
import {
  inputBase,
  labelStyle,
  fieldStyle,
  sectionSeparator,
  sectionTitle,
  raisedShadow,
  insetShadow,
} from './styles'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

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
  { value: 'Non dichiarato',        label: 'Non dichiarato' },
  { value: 'Korsolex Plus',         label: 'Korsolex Plus' },
  { value: 'Surgikos',              label: 'Surgikos' },
  { value: 'MD 520',                label: 'MD 520' },
  { value: 'Gigasept Instru AF',    label: 'Gigasept Instru AF' },
  { value: 'Deconex',               label: 'Deconex' },
  { value: 'Altro',                 label: 'Altro' },
] as const

const DISINFETTANTI_VALUES = DISINFETTANTI.map((o) => o.value)

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
            fontFamily: 'var(--font-v3, sans-serif)',
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
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '12px',
              color: 'var(--t2, #4A3D33)',
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
  clienteTelefono?: string | null
  numeroLavoro?: string | null
  labNome?: string | null
  labTelefono?: string | null
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
export function TabAccettazione({
  data,
  onChange,
  clienteTelefono,
  numeroLavoro,
  labNome,
  labTelefono,
}: TabAccettazioneProps) {
  const reduced = useReducedMotion()
  const spring = motionTokens.spring.snappy
  const materialiAttuali = data.materiali_allegati ?? []

  // ─── Disinfettante "Altro" — testo libero ─────────────────────────
  const isAltroDisinfettante =
    !!data.disinfettante_usato && !DISINFETTANTI_VALUES.includes(data.disinfettante_usato as typeof DISINFETTANTI_VALUES[number])
  const [altroDisinfettanteText, setAltroDisinfettanteText] = useState<string>(
    isAltroDisinfettante ? (data.disinfettante_usato ?? '') : ''
  )
  const selectDisinfettanteValue = isAltroDisinfettante ? 'Altro' : (data.disinfettante_usato ?? '')
  const score = mdrScore(data)
  const scorePercent = Math.round((score / 3) * 100)

  // ─── WhatsApp — costruzione messaggio (GDPR: NO nome paziente) ───
  const dataConsegnaFormatted = data.data_consegna_prevista
    ? new Date(data.data_consegna_prevista + 'T00:00:00')
        .toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const messaggioPreview = [
    'Buongiorno,',
    `abbiamo ricevuto il lavoro ${numeroLavoro ?? ''}.`,
    dataConsegnaFormatted ? `Consegna prevista: ${dataConsegnaFormatted}.` : '',
    labNome ? `— ${labNome}` : '',
    labTelefono ? labTelefono : '',
  ].filter(Boolean).join(' ')

  const whatsappUrl = clienteTelefono
    ? `https://wa.me/${clienteTelefono.replace(/\D/g, '')}?text=${encodeURIComponent(messaggioPreview)}`
    : ''

  return (
    <div>
      {/* ═══ 1. POSIZIONE FISICA ═══════════════════════════════════ */}
      {/* Task 16 / spec §10 (riserva R1): il campo «N° cassetta» editabile è
          MORTO — la posizione fisica si assegna SOLO dalla Parete (POST
          /api/lavori/[id]/cassetta via lo sheet «dal parco»), MAI dal PATCH del
          form (numero_cassetta è fuori da PATCHABLE_FIELDS: era un no-op
          silenzioso). Qui resta al più una riga di SOLA LETTURA + il rimando
          alla parete. Superficie v2.3 (questo file importa da @/design-system/
          motion e @/lib/feedback/*): niente componenti ds v3 (es. LinkQuieto) —
          il link è un <a> stilato coi token/pattern già in uso nel file. */}
      {data.numero_cassetta && (
        <>
          <div style={fieldStyle}>
            <label style={labelStyle}>Posizione fisica</label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-v3, sans-serif)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--t1, #1C1916)',
                  letterSpacing: '0.02em',
                }}
              >
                Cassetta {data.numero_cassetta}
              </span>
              <a
                href="/cassette"
                style={{
                  fontFamily: 'var(--font-v3, sans-serif)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--t2, #4A3D33)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '44px',
                }}
              >
                Cambia dalla parete
              </a>
            </div>
          </div>

          <div style={sectionSeparator} />
        </>
      )}

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
            fontFamily: 'var(--font-v3, sans-serif)',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--t2, #4A3D33)',
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
          <InfoTooltip text="MDR Allegato XIII §4: registra il tipo di impronta ricevuta. Alginato e silicone = impronte fisiche convenzionali. STL / Scansione = file digitale da scanner intraorale." />
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
            <InfoTooltip text="Obbligatorio per tracciabilità MDR Art. 13(8): specifica il disinfettante usato per igienizzare impronta/modello. Scrivi 'Non dichiarato' se non comunicato dal dentista." />
          </label>
          <select
            id="disinfettante_usato"
            value={selectDisinfettanteValue}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'Altro') {
                // Switch to Altro: keep select on "Altro", clear stored text until user types
                setAltroDisinfettanteText('')
                onChange({ disinfettante_usato: null })
              } else {
                setAltroDisinfettanteText('')
                onChange({ disinfettante_usato: v || null })
              }
            }}
            aria-label="Disinfettante usato per decontaminazione"
            style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
          >
            {DISINFETTANTI.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(selectDisinfettanteValue === 'Altro') && (
            <input
              type="text"
              placeholder="Specifica disinfettante utilizzato..."
              value={altroDisinfettanteText}
              onChange={(e) => {
                const txt = e.target.value
                setAltroDisinfettanteText(txt)
                onChange({ disinfettante_usato: txt || null })
              }}
              style={{
                marginTop: 8,
                width: '100%',
                padding: '10px 12px',
                background: 'var(--sfc, #E4DFD9)',
                border: '1px solid var(--prs, #D4CFC9)',
                borderRadius: 10,
                fontSize: 14,
                color: 'var(--t1, #1C1916)',
                fontFamily: 'var(--font-v3, sans-serif)',
                minHeight: 44,
                boxSizing: 'border-box',
                outline: 'none',
              }}
              aria-label="Specifica disinfettante"
            />
          )}
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
                      border: checked ? 'none' : '2px solid var(--t3, #6B5C51)',
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
                      fontFamily: 'var(--font-v3, sans-serif)',
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
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--t2, #4A3D33)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            Completezza MDR Allegato XIII
          </p>
          <p
            style={{
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '13px',
              fontWeight: 700,
              color: score === 3 ? 'var(--success, #16A34A)' : 'var(--t2, #4A3D33)',
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
              background: score === 3 ? 'var(--success, #16A34A)' : score === 2 ? 'var(--gold, #D4A843)' : 'var(--t3, #6B5C51)',
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
                fontFamily: 'var(--font-v3, sans-serif)',
                fontSize: '13px',
                color: item.ok ? 'var(--success, #16A34A)' : 'var(--t2, #4A3D33)',
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

      {/* ═══ 5. CONFERMA RICEZIONE AL DENTISTA (WhatsApp) ═══════════ */}
      {clienteTelefono && (
        <div style={{ marginTop: '16px' }}>
          {/* Anteprima messaggio */}
          <div style={{
            background: 'rgba(37,211,102,.07)',
            border: '1px solid rgba(37,211,102,.2)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '10px',
          }}>
            <p style={{
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--success, #16A34A)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: '0 0 4px',
            }}>
              Messaggio WhatsApp (anteprima)
            </p>
            <p style={{
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '12px',
              color: 'var(--t1, #1C1916)',
              margin: 0,
              lineHeight: 1.4,
              fontStyle: 'italic',
            }}>
              &ldquo;{messaggioPreview}&rdquo;
            </p>
          </div>

          {/* Bottone WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => hapticMedium()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '15px',
              borderRadius: '14px',
              background: '#25D366',
              color: '#fff',
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '15px',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(37,211,102,.35)',
              minHeight: '52px',
            }}
            aria-label="Apri WhatsApp per confermare la ricezione al dentista"
          >
            {/* WhatsApp SVG icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              role="img"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Conferma ricezione al dentista
          </a>
        </div>
      )}
    </div>
  )
}
