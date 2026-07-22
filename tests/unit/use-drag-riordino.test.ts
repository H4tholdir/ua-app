// Task 13 — useDragRiordino: il GUSCIO DOM del drag. Qui si prova SOLO ciò che jsdom sa reggere
// (§6.3 della ricerca): la macchina a stati vista da fuori (sollevamento → sheet vs drop), il
// payload della POST e il rollback, le guardie. Ciò che jsdom NON sa (preventDefault reale,
// scroll, rect, FLIP, fluidità) è device/Playwright (§6.4, FASE 9) — nessun test qui finge di
// coprirlo. In jsdom i rect sono zeri: l'INDICE di caduta è degenere (clampato a 0), quindi non si
// asserisce MAI su quale ordine esatto venga POSTato — si asserisce sulla DECISIONE (sheet vs
// drop) e sul fatto che la POST parta e il refresh segua l'esito.
import React, { useRef } from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { useDragRiordino } from '@/components/features/cassette/useDragRiordino'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

afterEach(cleanup)

const PARETE: CassettaParete[] = [
  { id: 'a', nome: 'C1', colore: 'rossa', posizione: 0, lavoro: null },
  { id: 'b', nome: 'C2', colore: 'blu', posizione: 1, lavoro: null },
  { id: 'c', nome: 'C3', colore: 'verde', posizione: 2, lavoro: null },
]

type HarnessProps = {
  disabilitato?: boolean
  onSheet: (id: string) => void
  inviaOrdine: (ordine: string[]) => Promise<boolean>
  onRefresh: () => void
}

// Espone la superficie testabile dell'hook. `onSollevata(id, evento)` è ciò che Cassetta chiama al
// lift; qui lo invochiamo a mano con un evento sintetico, poi guidiamo `window` come farebbe il dito.
function Harness(props: HarnessProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const drag = useDragRiordino({
    parete: PARETE,
    disabilitato: props.disabilitato ?? false,
    gridRef,
    onSheet: props.onSheet,
    inviaOrdine: props.inviaOrdine,
    onRefresh: props.onRefresh,
  })
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { ref: gridRef, className: 'ds-parete-grid' },
      PARETE.map((c) =>
        React.createElement('button', {
          key: c.id,
          'data-cassetta-id': c.id,
          onPointerDown: (e: React.PointerEvent) => drag.onSollevata(c.id, e as React.PointerEvent<HTMLButtonElement>),
        }, c.nome),
      ),
    ),
    React.createElement('span', { 'data-testid': 'trascinato' }, drag.idTrascinato ?? ''),
  )
}

function sollevaC(id: string) {
  const bottone = screen.getByText(PARETE.find((c) => c.id === id)!.nome)
  act(() => {
    bottone.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 10, clientY: 10, bubbles: true }),
    )
  })
}

function muoviWindow(clientX: number, clientY: number) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX, clientY }))
  })
}

function rilasciaWindow(clientX = 10, clientY = 10) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX, clientY }))
  })
}

describe('useDragRiordino — guardia: niente drag quando disabilitato (ricerca attiva / <2 cassette)', () => {
  it('a drag disabilitato, il sollevamento è un no-op: nessuna cassetta trascinata, nessuna POST', () => {
    const inviaOrdine = vi.fn().mockResolvedValue(true)
    const onSheet = vi.fn()
    render(React.createElement(Harness, { disabilitato: true, onSheet, inviaOrdine, onRefresh: vi.fn() }))
    sollevaC('c')
    expect(screen.getByTestId('trascinato')).toHaveTextContent('')
    rilasciaWindow()
    expect(inviaOrdine).not.toHaveBeenCalled()
    expect(onSheet).not.toHaveBeenCalled()
  })
})

describe('useDragRiordino — sollevamento poi RILASCIO FERMO = sheet (mai drop, §2.5)', () => {
  it('senza movimento oltre soglia, il rilascio apre lo sheet e NON POSTa nulla', () => {
    const inviaOrdine = vi.fn().mockResolvedValue(true)
    const onSheet = vi.fn()
    render(React.createElement(Harness, { onSheet, inviaOrdine, onRefresh: vi.fn() }))
    sollevaC('c')
    expect(screen.getByTestId('trascinato')).toHaveTextContent('c')
    rilasciaWindow(10, 10) // fermo
    expect(onSheet).toHaveBeenCalledWith('c')
    expect(inviaOrdine).not.toHaveBeenCalled()
    expect(screen.getByTestId('trascinato')).toHaveTextContent('') // gesto concluso
  })
})

describe('useDragRiordino — sollevamento poi MOVIMENTO = drop: UNA POST della lista completa (§2.4.6)', () => {
  it('con movimento oltre soglia, il rilascio POSTa (drop) e NON apre lo sheet', async () => {
    const inviaOrdine = vi.fn().mockResolvedValue(true)
    const onSheet = vi.fn()
    const onRefresh = vi.fn()
    render(React.createElement(Harness, { onSheet, inviaOrdine, onRefresh }))
    sollevaC('c')
    muoviWindow(200, 200) // oltre gli 8px dal lift
    await act(async () => {
      rilasciaWindow(200, 200)
    })
    expect(onSheet).not.toHaveBeenCalled()
    expect(inviaOrdine).toHaveBeenCalledTimes(1)
    // Payload = lista COMPLETA degli id (una permutazione dei tre), mai un sottoinsieme.
    const ordine = inviaOrdine.mock.calls[0][0] as string[]
    expect([...ordine].sort()).toEqual(['a', 'b', 'c'])
    // refresh SOLO dopo una POST riuscita (mai `router.refresh()` pre-drag — §8.2).
    await act(async () => {})
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('drop fallito (POST → false) → nessun refresh (rollback quieto, §2.4.6)', async () => {
    const inviaOrdine = vi.fn().mockResolvedValue(false)
    const onRefresh = vi.fn()
    render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh }))
    sollevaC('c')
    muoviWindow(200, 200)
    await act(async () => {
      rilasciaWindow(200, 200)
    })
    expect(inviaOrdine).toHaveBeenCalledTimes(1)
    await act(async () => {})
    expect(onRefresh).not.toHaveBeenCalled()
  })
})
