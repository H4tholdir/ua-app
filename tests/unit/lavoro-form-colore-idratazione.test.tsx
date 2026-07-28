import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { LavoroFormClient } from '../../src/components/features/lavori/LavoroFormClient'
import type { LavoroDettaglio } from '../../src/types/domain'

// LavoroFormClient usa useRouter() — va mockato fuori dall'App Router.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// ═══════════════════════════════════════════════════════════════════════════
// Task 12 — la SALDATURA della strada del ritorno, provata dove l'utente la
// vede: dalla riga di `lavori_denti` fino al valore dentro la tendina.
//
// Le quattro `lavori.colore_*` nella fixture portano valori DIVERSI e tutti
// legittimi (sono nella scala VITA che la tendina offre): se la scheda si
// idratasse ancora da lì, il test mostrerebbe quelli. È ciò che lo rende
// discriminante — una fixture con le colonne a `null` passerebbe anche col
// difetto.
// ═══════════════════════════════════════════════════════════════════════════

function makeLavoro(overrides: Record<string, unknown> = {}): LavoroDettaglio {
  return {
    id: 'lavoro-1',
    laboratorio_id: 'lab-1',
    numero_lavoro: '2026-0001',
    cliente_id: 'cliente-id',
    tipo_dispositivo: 'protesi_fissa',
    descrizione: 'Corona',
    stato: 'in_lavorazione',
    priorita: 'normale',
    updated_at: '2026-07-27T09:00:00.123456+00:00',
    incluso_in_fattura: false,
    // Le quattro colonne ORFANE: nessuno le scrive più (Task 10), e nessuno
    // deve più leggerle.
    colore_dente: 'D4',
    colore_collo: 'C4',
    colore_corpo: 'C3',
    colore_incisale: 'C2',
    colore_scala: null,
    colore_codice: null,
    denti_coinvolti: ['11'],
    denti_mancanti: [],
    denti_impianti: [],
    anamnesi_bruxismo: false,
    materiali_allegati: [],
    cliente: { id: 'cliente-id', nome: 'Mario', cognome: 'Rossi', studio_nome: null, telefono: null },
    paziente: null,
    tecnico: null,
    lavorazioni: [],
    appuntamenti: [],
    immagini: [],
    fasi: [],
    materiali: [],
    ddc: null,
    laboratorio: { nome: 'Lab Test', telefono: null },
    ...overrides,
  } as unknown as LavoroDettaglio
}

const valoreDi = (id: string) => (screen.getByLabelText(new RegExp(id.replace('_', ' '), 'i')) as HTMLSelectElement).value

describe('la scheda clinica si idrata dalle righe di lavori_denti', () => {
  it('la riga vince sulle quattro colonne orfane di lavori', () => {
    render(
      <LavoroFormClient
        defaultTab="clinica"
        lavoro={makeLavoro({
          denti: [{
            fdi: 11, ruolo: 'elemento',
            scala: 'vita_classical', codice: 'B1',
            codice_collo: 'A2', codice_corpo: 'A3', codice_incisale: 'A1',
          }],
        })}
      />
    )

    expect(valoreDi('colore_dente')).toBe('B1')
    expect(valoreDi('colore_collo')).toBe('A2')
    expect(valoreDi('colore_corpo')).toBe('A3')
    expect(valoreDi('colore_incisale')).toBe('A1')
  })

  it('senza colore sulle righe si mostra il default di caso (lavoro nato dal wizard)', () => {
    render(
      <LavoroFormClient
        defaultTab="clinica"
        lavoro={makeLavoro({
          colore_scala: 'vita_classical',
          colore_codice: 'A2',
          denti: [{
            fdi: 11, ruolo: 'elemento', scala: null, codice: null,
            codice_collo: null, codice_corpo: null, codice_incisale: null,
          }],
        })}
      />
    )

    expect(valoreDi('colore_dente')).toBe('A2')
    expect(valoreDi('colore_collo')).toBe('')
  })

  it('senza righe e senza caso le tendine sono vuote — mai il residuo delle colonne', () => {
    render(<LavoroFormClient defaultTab="clinica" lavoro={makeLavoro({ denti: [] })} />)

    expect(valoreDi('colore_dente')).toBe('')
    expect(valoreDi('colore_collo')).toBe('')
    expect(valoreDi('colore_corpo')).toBe('')
    expect(valoreDi('colore_incisale')).toBe('')
  })
})

describe('chi legge il lavoro per la scheda deve chiedere anche le righe', () => {
  // Guardia di sorgente (stesso mestiere di ddc-lettori-gruppo-b.test.ts):
  // senza l'embed la funzione di idratazione riceve `undefined` e il colore
  // sparisce alla ricarica, in silenzio e senza che nessun test di unità se ne
  // accorga.
  const LETTORI = [
    'src/app/(app)/lavori/[id]/modifica/page.tsx',
    'src/app/api/lavori/[id]/route.ts',
  ]

  for (const f of LETTORI) {
    it(`${f} incorpora lavori_denti nella select`, () => {
      expect(readFileSync(f, 'utf-8')).toContain('denti:lavori_denti(*)')
    })
  }
})
