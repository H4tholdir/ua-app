import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockVerifyTitolare, mockUpsertInvito, mockSendInvitoEmail, mockListInvitiPendenti } = vi.hoisted(() => ({
  mockVerifyTitolare: vi.fn(),
  mockUpsertInvito: vi.fn(),
  mockSendInvitoEmail: vi.fn(),
  mockListInvitiPendenti: vi.fn(),
}))

vi.mock('@/lib/invito/verify-titolare', () => ({
  verifyTitolare: mockVerifyTitolare,
}))
vi.mock('@/lib/invito/upsert-invito', () => ({
  upsertInvito: mockUpsertInvito,
}))
vi.mock('@/lib/invito/send-invito-email', () => ({
  sendInvitoEmail: mockSendInvitoEmail,
}))
vi.mock('@/lib/invito/list-inviti-pendenti', () => ({
  listInvitiPendenti: mockListInvitiPendenti,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({}),
}))

import { POST, GET } from '../../src/app/api/tecnici/invite/route'

const TITOLARE_CONTEXT = { userId: 'user-titolare-legit', laboratorioId: 'lab-legit' }

function postRequest(body: unknown) {
  return new Request('http://localhost/api/tecnici/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/tecnici/invite — anti tenant-leak', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyTitolare.mockResolvedValue(TITOLARE_CONTEXT)
    mockUpsertInvito.mockResolvedValue({ ok: true, token: 'tok-123', labNome: 'Lab Legit' })
    mockSendInvitoEmail.mockResolvedValue({ emailSent: true })
  })

  it('un laboratorio_id nel body viene ignorato: usa sempre titolare.laboratorioId', async () => {
    const req = postRequest({
      email: 'mario@rossi.it',
      ruolo: 'tecnico',
      laboratorio_id: 'lab-di-un-altro-titolare',
    })

    const res = await POST(req)

    expect(res.status).toBe(201)
    expect(mockUpsertInvito).toHaveBeenCalledTimes(1)
    const [, params] = mockUpsertInvito.mock.calls[0]
    expect(params.laboratorioId).toBe(TITOLARE_CONTEXT.laboratorioId)
    expect(params.laboratorioId).not.toBe('lab-di-un-altro-titolare')
  })

  it('senza laboratorio_id nel body si comporta identicamente (nessuna dipendenza dal body per lo scoping)', async () => {
    const req = postRequest({ email: 'mario@rossi.it', ruolo: 'tecnico' })

    await POST(req)

    expect(mockUpsertInvito).toHaveBeenCalledTimes(1)
    expect(mockUpsertInvito.mock.calls[0][1].laboratorioId).toBe(TITOLARE_CONTEXT.laboratorioId)
  })

  it('utente non titolare → 403, upsertInvito mai chiamato (anche con laboratorio_id nel body)', async () => {
    mockVerifyTitolare.mockResolvedValue(null)
    const req = postRequest({ email: 'mario@rossi.it', ruolo: 'tecnico', laboratorio_id: 'lab-x' })

    const res = await POST(req)

    expect(res.status).toBe(403)
    expect(mockUpsertInvito).not.toHaveBeenCalled()
  })
})

describe('GET /api/tecnici/invite — scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyTitolare.mockResolvedValue(TITOLARE_CONTEXT)
    mockListInvitiPendenti.mockResolvedValue([])
  })

  it('lista sempre gli inviti del lab del chiamante (nessun parametro esterno di scoping)', async () => {
    await GET()

    expect(mockListInvitiPendenti).toHaveBeenCalledTimes(1)
    expect(mockListInvitiPendenti.mock.calls[0][1]).toBe(TITOLARE_CONTEXT.laboratorioId)
  })

  it('utente non titolare → 403', async () => {
    mockVerifyTitolare.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(403)
    expect(mockListInvitiPendenti).not.toHaveBeenCalled()
  })
})
