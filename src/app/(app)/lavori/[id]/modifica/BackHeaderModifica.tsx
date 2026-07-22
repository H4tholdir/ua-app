'use client'

// Ondata 3a Task 9 — header v3 minimo per il ponte /lavori/[id]/modifica.
// Solo il back ‹ (nessun titolo/menu: la scheda-vista già li mostra, qui il
// form bridged è raggiunto in deep-link dalle 4 voci pesanti del menu, Task 4).
// TastoTondo è 'use client' e richiede un onClick — non un href — quindi non
// può vivere direttamente nella page.tsx (Server Component): questo wrapper
// isola l'unico bit interattivo (tornaIndietro) dietro il confine client.
// Direttiva permanente 22/07/2026 (CLAUDE.md §9): back = pagina precedente.
// Fallback dinamico alla scheda lavoro solo se non c'è storia (deep-link).

import { useRouter } from 'next/navigation'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { spazio } from '@/design-system/v3/tokens'
import { tornaIndietro } from '@/lib/nav/torna-indietro'

export function BackHeaderModifica({ lavoroId }: { lavoroId: string }) {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spazio.sm,
        padding: `${spazio.m}px ${spazio.ml}px 0`,
      }}
    >
      <TastoTondo
        glifo="‹"
        etichettaAria="Torna indietro"
        onClick={() => tornaIndietro(router, `/lavori/${lavoroId}`)}
      />
    </div>
  )
}
