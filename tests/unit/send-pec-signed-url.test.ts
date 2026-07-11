// tests/unit/send-pec-signed-url.test.ts
// I-6: send-pec scarica l'XML SOLO via signed URL da xml_storage_path.
// Senza storage path deve fallire con errore esplicito (mai URL pubblici).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSignedUrl: vi.fn(async (): Promise<string | null> => 'https://signed.example/xml?token=abc'),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: vi.fn(async () => ({ data: 'pec-password', error: null })) }),
}))
vi.mock('@/lib/storage/signed-url', () => ({ getSignedUrl: mockGetSignedUrl }))

import { sendFatturaPEC } from '@/lib/fattura/send-pec'

function fatturaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fatt-1', numero: '2026-0001', nome_file_xml: 'IT123_00001.xml',
    xml_storage_path: 'lab-1/2026/IT123_00001.xml', laboratorio_id: 'lab-1', data: '2026-07-11',
    laboratorio: { id: 'lab-1', nome: 'Lab', pec_host: 'smtp.pec.it', pec_port: 465, pec_user: 'lab@pec.it', pec_smtp_configurata: true, pec_vault_key_id: 'k1' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSignedUrl.mockResolvedValue('https://signed.example/xml?token=abc')
})

describe('sendFatturaPEC — I-6 solo signed URL', () => {
  it('senza xml_storage_path → errore esplicito, nessun tentativo di download', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: fatturaRow({ xml_storage_path: null }), error: null }) }) }),
    }))
    await expect(sendFatturaPEC('fatt-1')).rejects.toThrow(/XML non generato/)
    expect(mockGetSignedUrl).not.toHaveBeenCalled()
  })

  it('signed URL non ottenibile → errore, mai fallback a URL pubblici', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: fatturaRow(), error: null }) }) }),
    }))
    mockGetSignedUrl.mockResolvedValueOnce(null)
    await expect(sendFatturaPEC('fatt-1')).rejects.toThrow(/Download XML fallito/)
  })
})
