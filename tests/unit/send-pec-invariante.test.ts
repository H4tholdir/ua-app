// tests/unit/send-pec-invariante.test.ts
// CONTRATTO N10: sendFatturaPEC non deve MAI lanciare dopo che sendMail è
// riuscito. Il release-del-claim nel catch delle route chiamanti presume che
// un throw significhi «mail NON partita»; violare l'invariante = doppio invio
// fiscale a SdI. Se questo test fallisce dopo un refactor, NON rilassarlo:
// rivedere il refactor.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mockSendMail } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockSendMail: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: mockSendMail }) },
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/storage/signed-url', () => ({
  getSignedUrl: async () => 'https://signed.example/xml',
}))

import { sendFatturaPEC } from '@/lib/fattura/send-pec'

const FATTURA = {
  id: 'fat-1', numero: '2026-0007', nome_file_xml: 'IT123_00007.xml',
  xml_storage_path: 'lab-1/2026/IT123_00007.xml', laboratorio_id: 'lab-1', data: '2026-07-15',
  laboratorio: {
    id: 'lab-1', nome: 'Lab Test', pec_host: 'pec.example.com', pec_port: 465,
    pec_user: 'lab@pec.example.com', pec_smtp_configurata: true, pec_vault_key_id: 'k1',
  },
}

function selectChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq']) c[m] = () => c
  c.single = async () => result
  return c
}
function updateChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  // 'select' incluso: send-pec.ts ora chiama .select('id') dopo l'update (guardia D-7)
  for (const m of ['update', 'eq', 'select']) c[m] = () => c
  ;(c as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(result)
  return c
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new TextEncoder().encode('<xml/>').buffer,
  })))
  mockRpc.mockResolvedValue({ data: 'pec-password', error: null })
  mockSendMail.mockResolvedValue({ messageId: '<msg-1>' })
})

describe('sendFatturaPEC — invariante «mai throw dopo sendMail riuscito»', () => {
  it('sendMail ok + UPDATE stato fallito → NON rilancia (logga soltanto)', async () => {
    let updates = 0
    mockFrom.mockImplementation(() => {
      // 1ª chiamata: select fattura; 2ª: update stato (fallisce)
      if (updates++ === 0) return selectChain({ data: FATTURA, error: null })
      return updateChain({ data: null, error: { message: 'update fallito' } })
    })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendFatturaPEC('fat-1')).resolves.toBeUndefined()
    expect(mockSendMail).toHaveBeenCalledTimes(1)
    errSpy.mockRestore()
  })
  it('sendMail fallito → rilancia (la mail non è partita, il claim va rilasciato)', async () => {
    mockFrom.mockImplementation(() => selectChain({ data: FATTURA, error: null }))
    mockSendMail.mockRejectedValue(new Error('ECONNREFUSED'))
    await expect(sendFatturaPEC('fat-1')).rejects.toThrow()
  })
})
