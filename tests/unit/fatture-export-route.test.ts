// tests/unit/fatture-export-route.test.ts
// Task 5 (audit letture storno TD04, Gruppo B): l'export CSV mostra il TD04
// come riga a importi negativi, nel proprio mese di emissione — l'originale
// stornato NON viene filtrato via e resta nel suo mese con l'importo intero.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(), mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/fatture/export/route'

function req(year = '2026'): Request {
  return new Request(`http://localhost/api/fatture/export?year=${year}`) as never
}

let fatture: Array<Record<string, unknown>>

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  fatture = []
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1' }, error: null }) }) }) }) }
    }
    if (table === 'fatture') {
      const builder = {
        select: () => builder,
        eq: () => builder,
        is: () => builder,
        gte: () => builder,
        lte: () => builder,
        order: async () => ({ data: fatture, error: null }),
      }
      return builder
    }
    throw new Error(`tabella inattesa: ${table}`)
  })
})

describe('GET /api/fatture/export', () => {
  it('riga TD01 normale: importi invariati, colonna Tipo Documento = Fattura', async () => {
    fatture = [{
      numero: '2026-0010', data: '2026-03-05', cliente_denominazione: 'Studio Rossi',
      cliente_cf: 'RSSMRA80A01H501Z', cliente_piva: null, imponibile: 100, iva_importo: 22,
      totale: 122, bollo: 0, stato_sdi: 'accettata', pagata: true, inviata_via: 'pec',
      tipo_documento: 'TD01',
    }]
    const res = await GET(req())
    const csv = await res.text()
    const righe = csv.split('\n')
    expect(righe[0]).toContain('Tipo Documento')
    expect(righe[1]).toContain('Fattura')
    expect(righe[1]).toContain('122,00')
    expect(righe[1]).not.toContain('-122,00')
  })

  it('riga TD04: importi negativi, colonna Tipo Documento = Nota di Credito', async () => {
    fatture = [{
      numero: '2026-0011', data: '2026-04-12', cliente_denominazione: 'Studio Bianchi',
      cliente_cf: null, cliente_piva: '01234567890', imponibile: 75, iva_importo: 0,
      totale: 75, bollo: 0, stato_sdi: 'smtp_inviata', pagata: false, inviata_via: 'sdi_coop',
      tipo_documento: 'TD04',
    }]
    const res = await GET(req())
    const csv = await res.text()
    const righe = csv.split('\n')
    expect(righe[1]).toContain('Nota di Credito')
    expect(righe[1]).toContain('-75,00')
  })

  it('originale e TD04 coesistono come righe distinte (nessun filtro stornata_at)', async () => {
    fatture = [
      {
        numero: '2026-0012', data: '2026-05-01', cliente_denominazione: 'Studio Verdi',
        cliente_cf: null, cliente_piva: null, imponibile: 200, iva_importo: 44,
        totale: 244, bollo: 0, stato_sdi: 'accettata', pagata: true, inviata_via: 'pec',
        tipo_documento: 'TD01', stornata_at: '2026-06-01T10:00:00.000Z',
      },
      {
        numero: '2026-0013', data: '2026-06-01', cliente_denominazione: 'Studio Verdi',
        cliente_cf: null, cliente_piva: null, imponibile: 200, iva_importo: 44,
        totale: 244, bollo: 0, stato_sdi: 'smtp_inviata', pagata: false, inviata_via: 'pec',
        tipo_documento: 'TD04',
      },
    ]
    const res = await GET(req())
    const csv = await res.text()
    const righe = csv.split('\n').filter((r) => r.trim().length > 0)
    // header + 2 righe: l'originale (stornata_at valorizzato) NON è filtrata via.
    expect(righe).toHaveLength(3)
    expect(righe[1]).toContain('244,00')
    expect(righe[2]).toContain('-244,00')
  })
})
