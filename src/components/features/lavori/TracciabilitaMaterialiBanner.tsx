import type { MaterialeIncompletoDettaglio } from '@/types/domain'

interface Props {
  dettaglio: MaterialeIncompletoDettaglio[]
}

const MOTIVO_LABEL: Record<MaterialeIncompletoDettaglio['motivo'], string> = {
  lotto_assente: 'nessun lotto disponibile in magazzino',
  bom_mancante: 'distinta base (BOM) non definita nel listino',
}

export function TracciabilitaMaterialiBanner({ dettaglio }: Props) {
  if (dettaglio.length === 0) return null

  return (
    <div
      role="alert"
      style={{
        margin: '0 20px 16px',
        borderRadius: '14px',
        padding: '14px 16px',
        background: 'rgba(212, 168, 67, 0.10)',
        border: '1px solid rgba(212, 168, 67, 0.35)',
      }}
    >
      <p style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--t1, #1C1916)',
        margin: '0 0 6px',
      }}>
        Tracciabilità materiali incompleta
      </p>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {dettaglio.map((item, i) => (
          <li
            key={`${item.magazzino_id ?? 'bom'}-${i}`}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--t2, #4A3D33)',
            }}
          >
            {item.nome_materiale} — {MOTIVO_LABEL[item.motivo]}
          </li>
        ))}
      </ul>
    </div>
  )
}
