'use client'
// DS v3 §5.28 (rev. 3.1) — MorphPila: la card-pila «salita» a testata della lista
// aperta (stato finale del morph §8.3.1 — l'animazione condivisa arriverà con la
// scheda; qui lo stato morphato, statico). Fonte visiva: pila-aperta.html .morph.
import { tipografia } from '@/design-system/v3/tokens'

const FAMIGLIA: Record<'rossa' | 'ambra' | 'viola' | 'blu', string> = {
  rossa: 'var(--red)', ambra: 'var(--amber)', viola: 'var(--purple)', blu: 'var(--blue)',
}

export function MorphPila(props: { pila: keyof typeof FAMIGLIA; numero: number; label: string; sub?: string }) {
  const { pila, numero, label, sub } = props
  const colore = FAMIGLIA[pila]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
      <span style={{ fontSize: tipografia.size.display, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.display, lineHeight: 1, minWidth: 56, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: colore }}>
        {numero}
      </span>
      <span style={{ flex: 1, minWidth: 0, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: tipografia.size.label, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.label, textTransform: 'uppercase', color: colore }}>{label}</span>
        {sub && <span style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </span>
    </div>
  )
}
