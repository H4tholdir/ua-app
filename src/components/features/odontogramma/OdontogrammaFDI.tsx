'use client'

import { useRef, useState, useCallback } from 'react'
import { motionTokens } from '@/design-system/motion'
import { DENTI_ADULTO, DENTI_DECIDUO, type DenteFDI, type StatoDente, type TipoDente, type ArcataType } from './denti-fdi'

// ─── Duration costante da motion tokens (no inline arbitrari) ────
const TAP_DURATION_MS = motionTokens.duration.instant * 1000  // 80ms

// ─── Props ────────────────────────────────────────────────────────
interface OdontogrammaFDIProps {
  selezionati: number[]
  mancanti: number[]
  impianti: number[]
  onSelezionati: (v: number[]) => void
  onMancanti: (v: number[]) => void
  onImpianti: (v: number[]) => void
}

// ─── SVG anatomico per singolo dente ─────────────────────────────
interface ToothSVGProps {
  tipo: TipoDente
  arcata: ArcataType
  stato: StatoDente
  larghezza: number
}

function getToothColors(stato: StatoDente) {
  switch (stato) {
    case 'selezionato':
      return {
        coronaFill: 'var(--primary, #D90012)',
        coronaStroke: 'color-mix(in srgb, var(--primary, #D90012) 70%, black)',
        radiceFill: 'color-mix(in srgb, var(--primary, #D90012) 55%, black)',
        radiceStroke: 'color-mix(in srgb, var(--primary, #D90012) 40%, black)',
        showHighlight: false,
        showX: false,
        showFiletti: false,
      }
    case 'mancante':
      return {
        coronaFill: 'transparent',
        coronaStroke: 'var(--t3, #6B5C51)',
        radiceFill: 'none',
        radiceStroke: 'none',
        showHighlight: false,
        showX: true,
        showFiletti: false,
      }
    case 'implanto':
      return {
        coronaFill: 'var(--c-blue, #3B82F6)',
        coronaStroke: 'color-mix(in srgb, var(--c-blue, #3B82F6) 70%, black)',
        radiceFill: 'color-mix(in srgb, var(--c-blue, #3B82F6) 70%, black)',
        radiceStroke: 'color-mix(in srgb, var(--c-blue, #3B82F6) 50%, black)',
        showHighlight: true,
        showX: false,
        showFiletti: true,
      }
    default:
      return {
        coronaFill: 'var(--elv, #EDEDEA)',
        coronaStroke: 'var(--prs, #D4CFC9)',
        radiceFill: 'var(--prs, #D4CFC9)',
        radiceStroke: 'var(--t3, #6B5C51)',
        showHighlight: true,
        showX: false,
        showFiletti: false,
      }
  }
}

function ToothSVG({ tipo, arcata, stato, larghezza }: ToothSVGProps) {
  const colors = getToothColors(stato)
  const w = larghezza
  const totalH = 38
  const coronaH = stato === 'mancante' ? 16 : getCoronaH(tipo)
  const radiceH = totalH - coronaH

  // Per arcata superiore: radice in ALTO, corona in BASSO
  // Per arcata inferiore: corona in ALTO, radice in BASSO
  const coronaY = arcata === 'superiore' ? radiceH : 0
  const radiceY = arcata === 'superiore' ? 0 : coronaH

  const cx = w / 2

  return (
    <svg
      width={w}
      height={totalH}
      viewBox={`0 0 ${w} ${totalH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* ── Radice (non per mancante) ── */}
      {stato !== 'mancante' && (
        <RadiceSVG
          tipo={tipo}
          w={w}
          radiceH={radiceH}
          radiceY={radiceY}
          cx={cx}
          fill={colors.radiceFill}
          stroke={colors.radiceStroke}
          showFiletti={colors.showFiletti}
        />
      )}

      {/* ── Corona ── */}
      <CoronaSVG
        tipo={tipo}
        arcata={arcata}
        w={w}
        coronaH={coronaH}
        coronaY={coronaY}
        cx={cx}
        fill={colors.coronaFill}
        stroke={colors.coronaStroke}
        showHighlight={colors.showHighlight}
        showX={colors.showX}
        stato={stato}
      />
    </svg>
  )
}

function getCoronaH(tipo: TipoDente): number {
  switch (tipo) {
    case 'molare': return 16
    case 'premolare': return 14
    case 'canino': return 15
    case 'incisivo_laterale': return 13
    case 'incisivo_centrale': return 14
  }
}

// ─── Corona SVG per tipo ──────────────────────────────────────────
interface CoronaSVGProps {
  tipo: TipoDente
  arcata: ArcataType
  w: number
  coronaH: number
  coronaY: number
  cx: number
  fill: string
  stroke: string
  showHighlight: boolean
  showX: boolean
  stato: StatoDente
}

function CoronaSVG({ tipo, arcata, w, coronaH, coronaY, cx, fill, stroke, showHighlight, showX, stato }: CoronaSVGProps) {
  const dashArray = stato === 'mancante' ? '2 2' : undefined

  if (tipo === 'molare') {
    const margin = 1
    const x0 = margin
    const x1 = w - margin
    const y0 = coronaY
    const y1 = coronaY + coronaH
    const r = 3
    const cuspW = (x1 - x0) / 3
    const cuspH = 3

    // Bordo occlusale con 3 bump (cuspidi) — puntano verso l'arcata opposta
    let path: string
    if (arcata === 'superiore') {
      // Cuspidi sul bordo INFERIORE della corona (y1), sporgono verso il basso
      path = `
        M ${x0 + r} ${y0}
        L ${x1 - r} ${y0}
        Q ${x1} ${y0} ${x1} ${y0 + r}
        L ${x1} ${y1 - r}
        Q ${x1} ${y1} ${x1 - 2} ${y1}
        Q ${x0 + cuspW * 2.5} ${y1 + cuspH} ${x0 + cuspW * 2} ${y1}
        Q ${x0 + cuspW * 1.5} ${y1 + cuspH} ${x0 + cuspW} ${y1}
        Q ${x0 + cuspW * 0.5} ${y1 + cuspH} ${x0 + 2} ${y1}
        Q ${x0} ${y1} ${x0} ${y1 - r}
        L ${x0} ${y0 + r}
        Q ${x0} ${y0} ${x0 + r} ${y0}
        Z
      `
    } else {
      // Cuspidi sul bordo SUPERIORE della corona (y0), sporgono verso l'alto
      path = `
        M ${x0 + 2} ${y0}
        Q ${x0 + cuspW * 0.5} ${y0 - cuspH} ${x0 + cuspW} ${y0}
        Q ${x0 + cuspW * 1.5} ${y0 - cuspH} ${x0 + cuspW * 2} ${y0}
        Q ${x0 + cuspW * 2.5} ${y0 - cuspH} ${x1 - 2} ${y0}
        Q ${x1} ${y0} ${x1} ${y0 + r}
        L ${x1} ${y1 - r}
        Q ${x1} ${y1} ${x1 - r} ${y1}
        L ${x0 + r} ${y1}
        Q ${x0} ${y1} ${x0} ${y1 - r}
        L ${x0} ${y0 + r}
        Q ${x0} ${y0} ${x0 + 2} ${y0}
        Z
      `
    }
    const highlightY = arcata === 'superiore' ? y0 + 2 : y0 + cuspH + 1
    return (
      <g>
        <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeDasharray={dashArray} />
        {showHighlight && (
          <rect x={x0 + 2} y={highlightY} width={w - 6} height={3} rx={1.5} fill="rgba(255,255,255,.35)" />
        )}
        {showX && (
          <>
            <line x1={x0 + 2} y1={y0 + 2} x2={x1 - 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
            <line x1={x1 - 2} y1={y0 + 2} x2={x0 + 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
          </>
        )}
      </g>
    )
  }

  if (tipo === 'premolare') {
    // Ovale con 2 cuspidi (bicuspide) — puntano verso il piano occlusale
    const margin = 1.5
    const x0 = margin
    const x1 = w - margin
    const y0 = coronaY
    const y1 = coronaY + coronaH
    const r = 4
    const cuspH = 3

    let path: string
    if (arcata === 'superiore') {
      // cuspidi sul bordo inferiore
      path = `
        M ${x0 + r} ${y0}
        L ${x1 - r} ${y0}
        Q ${x1} ${y0} ${x1} ${y0 + r}
        L ${x1} ${y1 - r}
        Q ${x1} ${y1} ${cx + 2} ${y1}
        Q ${cx} ${y1 + cuspH} ${cx - 2} ${y1}
        Q ${x0} ${y1} ${x0} ${y1 - r}
        L ${x0} ${y0 + r}
        Q ${x0} ${y0} ${x0 + r} ${y0}
        Z
      `
    } else {
      // cuspidi sul bordo superiore
      path = `
        M ${x0 + r} ${y0}
        Q ${cx - 2} ${y0 - cuspH} ${cx} ${y0 - 1}
        Q ${cx + 2} ${y0 - cuspH} ${x1 - r} ${y0}
        Q ${x1} ${y0} ${x1} ${y0 + r}
        L ${x1} ${y1 - r}
        Q ${x1} ${y1} ${x1 - r} ${y1}
        L ${x0 + r} ${y1}
        Q ${x0} ${y1} ${x0} ${y1 - r}
        L ${x0} ${y0 + r}
        Q ${x0} ${y0} ${x0 + r} ${y0}
        Z
      `
    }
    const highlightY = arcata === 'superiore' ? y0 + 2 : y0 + cuspH + 1
    return (
      <g>
        <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeDasharray={dashArray} />
        {showHighlight && (
          <rect x={x0 + 2} y={highlightY} width={w - 7} height={3} rx={1.5} fill="rgba(255,255,255,.35)" />
        )}
        {showX && (
          <>
            <line x1={x0 + 2} y1={y0 + 2} x2={x1 - 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
            <line x1={x1 - 2} y1={y0 + 2} x2={x0 + 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
          </>
        )}
      </g>
    )
  }

  if (tipo === 'canino') {
    // Forma a punta/lancetta — cuspide appuntita sul lato occlusale
    const margin = 1.5
    const x0 = margin
    const x1 = w - margin
    const y0 = coronaY
    const y1 = coronaY + coronaH

    let path: string
    if (arcata === 'superiore') {
      // Punta sul bordo inferiore (verso l'arcata inferiore)
      path = `
        M ${x0 + 2} ${y0}
        L ${x1 - 2} ${y0}
        L ${x1} ${y1 - 3}
        Q ${cx} ${y1 + 2} ${x0} ${y1 - 3}
        Z
      `
    } else {
      // Punta sul bordo superiore (verso l'arcata superiore)
      path = `
        M ${cx} ${y0 - 2}
        L ${x1} ${y0 + 3}
        L ${x1 - 2} ${y1}
        L ${x0 + 2} ${y1}
        L ${x0} ${y0 + 3}
        Z
      `
    }
    const highlightY = arcata === 'superiore' ? y0 + 2 : y0 + 4
    return (
      <g>
        <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeDasharray={dashArray} />
        {showHighlight && (
          <rect x={x0 + 2} y={highlightY} width={w - 7} height={3} rx={1.5} fill="rgba(255,255,255,.35)" />
        )}
        {showX && (
          <>
            <line x1={x0 + 2} y1={y0 + 2} x2={x1 - 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
            <line x1={x1 - 2} y1={y0 + 2} x2={x0 + 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
          </>
        )}
      </g>
    )
  }

  // incisivo_laterale e incisivo_centrale — rettangolo stretto arrotondato, bordo quasi piatto
  const margin = tipo === 'incisivo_centrale' ? 1 : 1.5
  const x0 = margin
  const x1 = w - margin
  const y0 = coronaY
  const y1 = coronaY + coronaH
  const r = 2.5

  const path = `
    M ${x0 + r} ${y0}
    L ${x1 - r} ${y0}
    Q ${x1} ${y0} ${x1} ${y0 + r}
    L ${x1} ${y1 - r}
    Q ${x1} ${y1} ${x1 - r} ${y1}
    L ${x0 + r} ${y1}
    Q ${x0} ${y1} ${x0} ${y1 - r}
    L ${x0} ${y0 + r}
    Q ${x0} ${y0} ${x0 + r} ${y0}
    Z
  `
  const highlightY = arcata === 'superiore' ? y0 + 2 : y0 + 2

  return (
    <g>
      <path d={path} fill={fill} stroke={stroke} strokeWidth="1" strokeDasharray={dashArray} />
      {showHighlight && (
        <rect x={x0 + 2} y={highlightY} width={w - margin * 2 - 4} height={3} rx={1.5} fill="rgba(255,255,255,.35)" />
      )}
      {showX && (
        <>
          <line x1={x0 + 2} y1={y0 + 2} x2={x1 - 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
          <line x1={x1 - 2} y1={y0 + 2} x2={x0 + 2} y2={y1 - 2} stroke="#6B5C51" strokeWidth="1.5" />
        </>
      )}
    </g>
  )
}

// ─── Radice SVG ───────────────────────────────────────────────────
interface RadiceSVGProps {
  tipo: TipoDente
  w: number
  radiceH: number
  radiceY: number
  cx: number
  fill: string
  stroke: string
  showFiletti: boolean
}

function RadiceSVG({ tipo, w, radiceH, radiceY, cx, fill, stroke, showFiletti }: RadiceSVGProps) {
  if (showFiletti) {
    // Impianto: radice = rettangolo stretto con filetti orizzontali (vite)
    const rw = Math.max(w * 0.35, 4)
    const rx0 = cx - rw / 2
    const rx1 = cx + rw / 2
    const ry0 = radiceY
    const ry1 = radiceY + radiceH
    const step = radiceH / 5

    return (
      <g opacity="0.85">
        <rect x={rx0} y={ry0} width={rw} height={radiceH} rx={1} fill={fill} stroke={stroke} strokeWidth="0.75" />
        {[1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={rx0}
            y1={ry0 + step * i}
            x2={rx1}
            y2={ry0 + step * i}
            stroke={stroke}
            strokeWidth="0.75"
            opacity="0.7"
          />
        ))}
        <line x1={rx0} y1={ry1} x2={cx} y2={ry1 + 2} stroke={stroke} strokeWidth="0.75" opacity="0.6" />
      </g>
    )
  }

  if (tipo === 'molare') {
    // 2-3 radici biforcate (path a Y rovesciata)
    const rw = w * 0.28
    const gap = 2
    // Radice sinistra
    const lx = cx - rw - gap / 2
    // Radice destra
    const rx = cx + gap / 2
    // Radice centrale (solo per molari superiori con 3 radici)
    const hasTre = w >= 18

    return (
      <g opacity="0.55">
        {hasTre && (
          <path
            d={`M ${cx - 1} ${radiceY} L ${cx - 1} ${radiceY + radiceH * 0.7} Q ${cx} ${radiceY + radiceH} ${cx} ${radiceY + radiceH}`}
            fill="none"
            stroke={fill === 'none' ? stroke : fill}
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        <path
          d={`M ${lx + rw / 2} ${radiceY} L ${lx + rw / 2} ${radiceY + radiceH * 0.65} Q ${lx} ${radiceY + radiceH} ${lx} ${radiceY + radiceH}`}
          fill="none"
          stroke={fill === 'none' ? stroke : fill}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={`M ${rx + rw / 2} ${radiceY} L ${rx + rw / 2} ${radiceY + radiceH * 0.65} Q ${rx + rw} ${radiceY + radiceH} ${rx + rw} ${radiceY + radiceH}`}
          fill="none"
          stroke={fill === 'none' ? stroke : fill}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    )
  }

  if (tipo === 'premolare') {
    // 1 radice sottile, a volte biforcata
    return (
      <g opacity="0.55">
        <path
          d={`M ${cx} ${radiceY} L ${cx} ${radiceY + radiceH * 0.75} Q ${cx - 2} ${radiceY + radiceH} ${cx - 2} ${radiceY + radiceH}`}
          fill="none"
          stroke={fill === 'none' ? stroke : fill}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx} ${radiceY + radiceH * 0.4} Q ${cx + 2} ${radiceY + radiceH} ${cx + 3} ${radiceY + radiceH}`}
          fill="none"
          stroke={fill === 'none' ? stroke : fill}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    )
  }

  if (tipo === 'canino') {
    // Singola radice, la più lunga, sottile e dritta
    return (
      <g opacity="0.55">
        <path
          d={`M ${cx} ${radiceY} L ${cx} ${radiceY + radiceH - 1} Q ${cx} ${radiceY + radiceH} ${cx} ${radiceY + radiceH}`}
          fill="none"
          stroke={fill === 'none' ? stroke : fill}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    )
  }

  // incisivo_laterale e incisivo_centrale — singola radice dritta
  return (
    <g opacity="0.55">
      <path
        d={`M ${cx} ${radiceY} L ${cx} ${radiceY + radiceH - 2} Q ${cx} ${radiceY + radiceH} ${cx} ${radiceY + radiceH}`}
        fill="none"
        stroke={fill === 'none' ? stroke : fill}
        strokeWidth={tipo === 'incisivo_centrale' ? '2.5' : '2'}
        strokeLinecap="round"
      />
    </g>
  )
}

// ─── Mini menu contestuale (long press) ──────────────────────────
interface ContextMenuProps {
  denteFDI: DenteFDI
  stato: StatoDente
  x: number
  y: number
  onSelezione: () => void
  onMancante: () => void
  onImpianto: () => void
  onRipristina: () => void
  onClose: () => void
}

function ContextMenu({ denteFDI, stato, x, y, onSelezione, onMancante, onImpianto, onRipristina, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const items: { label: string; icon: string; action: () => void; active?: boolean }[] = [
    { label: 'Seleziona per lavoro', icon: '✓', action: onSelezione, active: stato === 'selezionato' },
    { label: 'Segna come mancante', icon: '✕', action: onMancante, active: stato === 'mancante' },
    { label: 'Segna come impianto', icon: '⬡', action: onImpianto, active: stato === 'implanto' },
    { label: 'Ripristina normale', icon: '↩', action: onRipristina },
  ]

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 49,
        }}
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Opzioni dente ${denteFDI.numero}`}
        style={{
          position: 'fixed',
          left: Math.min(x, window.innerWidth - 200),
          top: y,
          zIndex: 50,
          background: 'var(--elv, #EDEDEA)',
          border: '1px solid var(--prs, #D4CFC9)',
          borderRadius: '10px',
          boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
          padding: '6px',
          minWidth: '180px',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <p style={{
          margin: '0 0 4px 6px',
          fontSize: '10px',
          fontWeight: 700,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Dente {denteFDI.numero}
        </p>
        {items.map((item) => (
          <button
            key={item.label}
            role="menuitem"
            type="button"
            onClick={() => { item.action(); onClose() }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 10px',
              border: 'none',
              borderRadius: '7px',
              background: item.active ? 'var(--prs, #D4CFC9)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: item.active ? 600 : 400,
              color: 'var(--t1, #1C1916)',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '12px', width: '14px', textAlign: 'center', flexShrink: 0 }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Singolo bottone dente ────────────────────────────────────────
interface DenteButtonProps {
  dente: DenteFDI
  stato: StatoDente
  onTap: () => void
  onLongPress: (x: number, y: number) => void
}

function DenteButton({ dente, stato, onTap, onLongPress }: DenteButtonProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)
  const startPos = useRef<{ x: number; y: number } | null>(null)
  // Coords captured synchronously at press start — needed because React clears
  // currentTarget and TouchList are empty by the time the 500ms timer fires.
  const pressCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [pressing, setPressing] = useState(false)

  const startLongPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    didLongPress.current = false
    // Capture position synchronously before React clears the event
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    pressCoords.current = {
      x: buttonRect.left,
      y: buttonRect.bottom + 4,
    }
    const pos = 'touches' in e
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
    startPos.current = pos
    setPressing(true)
    // Snapshot coords so the closure captures the value, not the ref
    const capturedX = pressCoords.current.x
    const capturedY = pressCoords.current.y
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      setPressing(false)
      onLongPress(capturedX, capturedY)
    }, 500)
  }, [onLongPress])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setPressing(false)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startPos.current) return
    const dx = e.touches[0].clientX - startPos.current.x
    const dy = e.touches[0].clientY - startPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 8) {
      cancelLongPress()
    }
  }, [cancelLongPress])

  const handleClick = useCallback(() => {
    if (!didLongPress.current) {
      onTap()
    }
    didLongPress.current = false
  }, [onTap])

  return (
    <button
      type="button"
      aria-label={`Dente ${dente.numero}${stato !== 'normale' ? ` (${stato})` : ''}`}
      aria-pressed={stato === 'selezionato'}
      onMouseDown={startLongPress}
      onMouseUp={cancelLongPress}
      onMouseLeave={cancelLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        width: `${dente.larghezza + 6}px`,
        minHeight: '44px',
        padding: '3px 3px 1px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
        transform: pressing ? 'scale(0.92)' : 'scale(1)',
        transition: `transform ${TAP_DURATION_MS}ms ease`,
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <ToothSVG
        tipo={dente.tipo}
        arcata={dente.arcata}
        stato={stato}
        larghezza={dente.larghezza}
      />
      <span style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '8px',
        fontWeight: 600,
        color: stato === 'selezionato'
          ? 'var(--primary, #D90012)'
          : stato === 'implanto'
            ? 'var(--c-blue, #3B82F6)'
            : 'var(--t2, #4A3D33)',
        lineHeight: 1,
        marginTop: '1px',
      }}>
        {dente.numero}
      </span>
    </button>
  )
}

// ─── Componente principale ────────────────────────────────────────
export function OdontogrammaFDI({
  selezionati,
  mancanti,
  impianti,
  onSelezionati,
  onMancanti,
  onImpianti,
}: OdontogrammaFDIProps) {
  const [dentizione, setDentizione] = useState<'adulto' | 'deciduo'>('adulto')
  const [menu, setMenu] = useState<{
    dente: DenteFDI
    x: number
    y: number
  } | null>(null)

  const denti = dentizione === 'adulto' ? DENTI_ADULTO : DENTI_DECIDUO

  // Calcola stato di un dente (mutualmente esclusivi)
  function getStatoDente(num: number): StatoDente {
    if (mancanti.includes(num)) return 'mancante'
    if (impianti.includes(num)) return 'implanto'
    if (selezionati.includes(num)) return 'selezionato'
    return 'normale'
  }

  // Rimuove un numero da tutti e tre gli array (reset)
  function rimossoDaTutti(num: number) {
    return {
      newSelezionati: selezionati.filter((n) => n !== num),
      newMancanti: mancanti.filter((n) => n !== num),
      newImpianti: impianti.filter((n) => n !== num),
    }
  }

  function handleTap(dente: DenteFDI) {
    const stato = getStatoDente(dente.numero)
    if (stato === 'selezionato') {
      onSelezionati(selezionati.filter((n) => n !== dente.numero))
    } else if (stato === 'normale') {
      onSelezionati([...selezionati, dente.numero])
    }
    // Tap su mancante/impianto: no-op (usa long press per cambiare)
  }

  function handleLongPress(dente: DenteFDI, x: number, y: number) {
    setMenu({ dente, x, y })
  }

  function handleSelezione(dente: DenteFDI) {
    const { newMancanti, newImpianti } = rimossoDaTutti(dente.numero)
    onMancanti(newMancanti)
    onImpianti(newImpianti)
    if (!selezionati.includes(dente.numero)) {
      onSelezionati([...selezionati.filter((n) => n !== dente.numero), dente.numero])
    } else {
      onSelezionati(selezionati.filter((n) => n !== dente.numero))
    }
  }

  function handleMancante(dente: DenteFDI) {
    const { newSelezionati, newImpianti } = rimossoDaTutti(dente.numero)
    onSelezionati(newSelezionati)
    onImpianti(newImpianti)
    if (!mancanti.includes(dente.numero)) {
      onMancanti([...mancanti, dente.numero])
    }
  }

  function handleImpianto(dente: DenteFDI) {
    const { newSelezionati, newMancanti } = rimossoDaTutti(dente.numero)
    onSelezionati(newSelezionati)
    onMancanti(newMancanti)
    if (!impianti.includes(dente.numero)) {
      onImpianti([...impianti, dente.numero])
    }
  }

  function handleRipristina(dente: DenteFDI) {
    const { newSelezionati, newMancanti, newImpianti } = rimossoDaTutti(dente.numero)
    onSelezionati(newSelezionati)
    onMancanti(newMancanti)
    onImpianti(newImpianti)
  }

  // Righe arcata superiore: Q1 + Q2
  const superioreQ1 = denti.filter((d) => d.arcata === 'superiore' && d.quadrante === 1)
  const superioreQ2 = denti.filter((d) => d.arcata === 'superiore' && d.quadrante === 2)
  // Righe arcata inferiore: Q4 + Q3
  const inferioreQ4 = denti.filter((d) => d.arcata === 'inferiore' && d.quadrante === 4)
  const inferioreQ3 = denti.filter((d) => d.arcata === 'inferiore' && d.quadrante === 3)

  const tuttiSelezionati = selezionati.filter((n) =>
    denti.some((d) => d.numero === n)
  ).sort((a, b) => a - b)

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* ── Toggle dentizione ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {(['adulto', 'deciduo'] as const).map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setDentizione(tipo)}
            aria-pressed={dentizione === tipo}
            style={{
              padding: '5px 14px',
              borderRadius: '20px',
              border: '1px solid var(--prs, #D4CFC9)',
              background: dentizione === tipo ? 'var(--t1, #1C1916)' : 'var(--elv, #EDEDEA)',
              color: dentizione === tipo ? 'var(--bg, #DDD8D3)' : 'var(--t2, #4A3D33)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: `background ${TAP_DURATION_MS}ms ease, color ${TAP_DURATION_MS}ms ease`,
            }}
          >
            {tipo === 'adulto' ? 'Adulto' : 'Deciduo'}
          </button>
        ))}
      </div>

      {/* ── Card odontogramma ── */}
      <div style={{
        background: 'var(--sfc, #E4DFD9)',
        borderRadius: '14px',
        padding: '12px 8px 10px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Label arcata superiore */}
        <p style={{
          margin: '0 0 6px',
          fontSize: '9px',
          fontWeight: 700,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          textAlign: 'center',
        }}>
          Arcata superiore
        </p>

        {/* Riga superiore */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '0' }}>
          {/* Q1 */}
          <div style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
            {superioreQ1.map((d) => (
              <DenteButton
                key={d.numero}
                dente={d}
                stato={getStatoDente(d.numero)}
                onTap={() => handleTap(d)}
                onLongPress={(x, y) => handleLongPress(d, x, y)}
              />
            ))}
          </div>

          {/* Separatore verticale centrale */}
          <div style={{
            width: '1.5px',
            alignSelf: 'stretch',
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,.08) 20%, rgba(0,0,0,.08) 80%, transparent)',
            margin: '0 2px',
            flexShrink: 0,
          }} />

          {/* Q2 */}
          <div style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
            {superioreQ2.map((d) => (
              <DenteButton
                key={d.numero}
                dente={d}
                stato={getStatoDente(d.numero)}
                onTap={() => handleTap(d)}
                onLongPress={(x, y) => handleLongPress(d, x, y)}
              />
            ))}
          </div>
        </div>

        {/* Linea mediana */}
        <div style={{
          height: '1px',
          background: 'rgba(0,0,0,.06)',
          margin: '4px 0',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--sfc, #E4DFD9)',
            padding: '0 8px',
            fontSize: '9px',
            fontWeight: 700,
            color: 'var(--t3, #6B5C51)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            whiteSpace: 'nowrap',
          }}>
            piano occlusale
          </span>
        </div>

        {/* Riga inferiore */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '0' }}>
          {/* Q4 */}
          <div style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
            {inferioreQ4.map((d) => (
              <DenteButton
                key={d.numero}
                dente={d}
                stato={getStatoDente(d.numero)}
                onTap={() => handleTap(d)}
                onLongPress={(x, y) => handleLongPress(d, x, y)}
              />
            ))}
          </div>

          {/* Separatore verticale centrale */}
          <div style={{
            width: '1.5px',
            alignSelf: 'stretch',
            background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,.08) 20%, rgba(0,0,0,.08) 80%, transparent)',
            margin: '0 2px',
            flexShrink: 0,
          }} />

          {/* Q3 */}
          <div style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
            {inferioreQ3.map((d) => (
              <DenteButton
                key={d.numero}
                dente={d}
                stato={getStatoDente(d.numero)}
                onTap={() => handleTap(d)}
                onLongPress={(x, y) => handleLongPress(d, x, y)}
              />
            ))}
          </div>
        </div>

        {/* Label arcata inferiore */}
        <p style={{
          margin: '6px 0 0',
          fontSize: '9px',
          fontWeight: 700,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          textAlign: 'center',
        }}>
          Arcata inferiore
        </p>

        {/* Legenda */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '10px',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Sano', color: 'var(--elv, #EDEDEA)', border: 'var(--prs, #D4CFC9)', icon: '●' },
            { label: 'Sel.', color: 'var(--primary, #D90012)', border: 'var(--primary, #D90012)', icon: '●' },
            { label: 'Impianto', color: 'var(--c-blue, #3B82F6)', border: 'var(--c-blue, #3B82F6)', icon: '●' },
            { label: 'Mancante', color: 'var(--t3, #6B5C51)', border: 'var(--t3, #6B5C51)', icon: '✕' },
          ].map((item) => (
            <span key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              color: 'var(--t2, #4A3D33)',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              <span style={{ color: item.color, fontSize: '11px', lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Chip denti selezionati ── */}
      {tuttiSelezionati.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--t2, #4A3D33)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 6px',
          }}>
            Selezionati
          </p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {tuttiSelezionati.map((n) => (
              <span key={n} style={{
                padding: '2px 8px',
                borderRadius: '20px',
                background: 'var(--primary, #D90012)',
                color: '#fff',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                fontWeight: 600,
              }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Context menu long press ── */}
      {menu && (
        <ContextMenu
          denteFDI={menu.dente}
          stato={getStatoDente(menu.dente.numero)}
          x={menu.x}
          y={menu.y}
          onSelezione={() => handleSelezione(menu.dente)}
          onMancante={() => handleMancante(menu.dente)}
          onImpianto={() => handleImpianto(menu.dente)}
          onRipristina={() => handleRipristina(menu.dente)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
