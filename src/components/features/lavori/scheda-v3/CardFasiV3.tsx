'use client'
import { useRef, useState } from 'react'
import { CardInfo } from '@/components/ds/CardInfo'
import { RigaFase } from '@/components/ds/RigaFase'
import type { LavoroFase } from '@/types/domain'

// §5 spec 3a: fasi read-only tranne il gesto di completamento. La prima fase
// non eseguita è `prossima` (RigaFase mostra la PillFase FATTA). Il PATCH è
// ottimistico con rollback (pattern di LavoroFormClient.handleUpdateFase,
// incluso il request-id ref anti doppio-tap). L'editing avanzato (esito/
// non-conformità) è 3b: qui non si tocca.
//
// Nota `fase.nome`: il join reale (`fasi:lavori_fasi(*, fase:fasi_produzione(*))`)
// non espone un campo `nome` — il nome umano della fase vive in
// `descrizione` (tabella fasi_produzione, vedi src/types/domain.ts e
// database.types.ts). Si usa quindi `f.fase?.descrizione`.
export function CardFasiV3(props: { lavoroId: string; fasi: LavoroFase[]; onErrore: (msg: string) => void }) {
  const { lavoroId, onErrore } = props
  const [fasi, setFasi] = useState<LavoroFase[]>(props.fasi)
  const reqRef = useRef<Record<string, number>>({})

  const idxProssima = fasi.findIndex((f) => !f.eseguita_at)

  async function marcaFatta(f: LavoroFase) {
    const eseguita_at = new Date().toISOString()
    const prev = f
    const req = (reqRef.current[f.id] ?? 0) + 1
    reqRef.current[f.id] = req
    setFasi((p) => p.map((x) => (x.id === f.id ? { ...x, eseguita_at } : x)))
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/fasi/${f.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eseguita_at }),
      })
      if (reqRef.current[f.id] !== req) return
      if (!res.ok) {
        setFasi((p) => p.map((x) => (x.id === f.id ? prev : x)))
        onErrore('Non è stato possibile segnare la fase come fatta. Riprova.')
      }
    } catch {
      if (reqRef.current[f.id] !== req) return
      setFasi((p) => p.map((x) => (x.id === f.id ? prev : x)))
      onErrore('Non è stato possibile segnare la fase come fatta. Riprova.')
    }
  }

  function chiQuando(f: LavoroFase): string | undefined {
    if (!f.eseguita_at) return undefined
    const d = new Date(f.eseguita_at)
    return d.toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <CardInfo>
      {fasi.map((f, i) => (
        <RigaFase
          key={f.id}
          nome={f.fase?.descrizione ?? 'Fase'}
          fatto={!!f.eseguita_at}
          chiQuando={chiQuando(f)}
          prossima={i === idxProssima}
          onFatta={i === idxProssima ? () => marcaFatta(f) : undefined}
        />
      ))}
    </CardInfo>
  )
}
