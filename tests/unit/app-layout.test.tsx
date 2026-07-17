import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'

const { mockGetLabContextWithTimings, mockHeaders, mockHeadersGet, mockRedirect } = vi.hoisted(() => {
  const mockHeadersGet = vi.fn()
  const mockHeaders = vi.fn(async () => ({ get: mockHeadersGet }))
  const mockGetLabContextWithTimings = vi.fn()
  const mockRedirect = vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  })
  return { mockGetLabContextWithTimings, mockHeaders, mockHeadersGet, mockRedirect }
})

vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))
vi.mock('next/headers', () => ({
  headers: mockHeaders,
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import AppLayout from '@/app/(app)/layout'

type Ctx = {
  userId: string
  email: string | null
  ruolo: string
  laboratorioId: string | null
  nome: string | null
  cognome: string | null
  lab: { stato: string; trial_ends_at: string | null; nome: string } | null
}

const BASE_CONTEXT: Ctx = {
  userId: 'u-1',
  email: 'a@b.it',
  ruolo: 'titolare',
  laboratorioId: 'lab-1',
  nome: 'Anna',
  cognome: 'Bianchi',
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
}

const TIMINGS = { authMs: 12.3, dbMs: 4.5 }

function mockContext(context: Ctx | null) {
  mockGetLabContextWithTimings.mockResolvedValue({ context, timings: TIMINGS })
}

async function callLayout(): Promise<ReactElement> {
  return AppLayout({ children: 'children' }) as unknown as ReactElement
}

beforeEach(() => {
  vi.clearAllMocks()
  mockHeadersGet.mockReturnValue('/dashboard')
})

describe('AppLayout (app)', () => {
  it('context null → redirect /login (log emesso PRIMA del redirect)', async () => {
    mockContext(null)
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await expect(callLayout()).rejects.toThrow('REDIRECT:/login')

    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy.mock.calls[0][0]).toContain('authMs')
    consoleSpy.mockRestore()
  })

  it("ruolo admin_sistema con lab null → redirect /admin/labs (NON /login?error=no_lab, ordine admin-first)", async () => {
    mockContext({ ...BASE_CONTEXT, ruolo: 'admin_sistema', laboratorioId: null, lab: null })

    await expect(callLayout()).rejects.toThrow('REDIRECT:/admin/labs')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
    expect(mockRedirect).not.toHaveBeenCalledWith('/login?error=no_lab')
  })

  it('context con lab null (non admin) → redirect /login?error=no_lab', async () => {
    mockContext({ ...BASE_CONTEXT, lab: null, laboratorioId: null })

    await expect(callLayout()).rejects.toThrow('REDIRECT:/login?error=no_lab')
  })

  it('lab blacklist → redirect /blocked', async () => {
    mockContext({ ...BASE_CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Uno' } })

    await expect(callLayout()).rejects.toThrow('REDIRECT:/blocked')
  })

  it('lab sospeso → redirect /billing', async () => {
    mockContext({ ...BASE_CONTEXT, lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab Uno' } })

    await expect(callLayout()).rejects.toThrow('REDIRECT:/billing')
  })

  it('lab scaduto → redirect /billing?expired=true', async () => {
    mockContext({ ...BASE_CONTEXT, lab: { stato: 'scaduto', trial_ends_at: null, nome: 'Lab Uno' } })

    await expect(callLayout()).rejects.toThrow('REDIRECT:/billing?expired=true')
  })

  it('trial scaduto → redirect /billing?trial_expired=true', async () => {
    mockContext({
      ...BASE_CONTEXT,
      lab: { stato: 'trial', trial_ends_at: '2020-01-01T00:00:00.000Z', nome: 'Lab Uno' },
    })

    await expect(callLayout()).rejects.toThrow('REDIRECT:/billing?trial_expired=true')
  })

  it('lab attivo → render (nessun redirect); console.log chiamato una volta con authMs', async () => {
    mockContext(BASE_CONTEXT)
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const el = await callLayout()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy.mock.calls[0][0]).toContain('authMs')
    expect(el).toBeTruthy()
    consoleSpy.mockRestore()
  })

  it('legge x-pathname dagli headers e lo include nel log come route', async () => {
    mockContext(BASE_CONTEXT)
    mockHeadersGet.mockReturnValue('/lavori/123')
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await callLayout()

    expect(mockHeadersGet).toHaveBeenCalledWith('x-pathname')
    expect(consoleSpy.mock.calls[0][0]).toContain('/lavori/123')
    consoleSpy.mockRestore()
  })
})
