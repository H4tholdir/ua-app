// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateSchedaFabbricazione } from '../../src/lib/pdf/generate-scheda-fabbricazione'

describe('generateSchedaFabbricazione', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('genera una Scheda di Fabbricazione con fasi presenti', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    const buffer = await generateSchedaFabbricazione('lav-test-001', 'lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('la query su lavori include il join tecnico:tecnici(nome, cognome) dentro fasi', async () => {
    let selectArg = ''
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') {
        const chain = createChain({ data: LAVORO_FIXTURE, error: null })
        const originalSelect = chain.select as (...args: unknown[]) => unknown
        chain.select = (...args: unknown[]) => {
          selectArg = String(args[0])
          return originalSelect(...args)
        }
        return chain
      }
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await generateSchedaFabbricazione('lav-test-001', 'lab-test-001')
    expect(selectArg).toContain('tecnico:tecnici(nome, cognome)')
  })

  it('lavoro non trovato → lancia errore esplicito', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: null, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await expect(
      generateSchedaFabbricazione('lav-inesistente', 'lab-test-001')
    ).rejects.toThrow('Lavoro non trovato')
  })

  it('laboratorio non trovato → lancia errore esplicito', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: null, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await expect(
      generateSchedaFabbricazione('lav-test-001', 'lab-inesistente')
    ).rejects.toThrow('Laboratorio non trovato')
  })
})
