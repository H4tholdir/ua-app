import { describe, it, expect, vi } from 'vitest'
import { getSignedUrl } from '@/lib/storage/signed-url'

function mockSupabase(result: { data: { signedUrl: string } | null; error: unknown }) {
  const createSignedUrl = vi.fn().mockResolvedValue(result)
  return {
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
    createSignedUrl,
  }
}

describe('getSignedUrl', () => {
  it('ritorna la signedUrl quando createSignedUrl ha successo', async () => {
    const supa = mockSupabase({ data: { signedUrl: 'https://example.test/signed?token=abc' }, error: null })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await getSignedUrl(supa as any, 'documenti', 'lab-1/ddc/2026/DDC-2026-0001.pdf', 300)

    expect(url).toBe('https://example.test/signed?token=abc')
    expect(supa.storage.from).toHaveBeenCalledWith('documenti')
    expect(supa.createSignedUrl).toHaveBeenCalledWith('lab-1/ddc/2026/DDC-2026-0001.pdf', 300)
  })

  it('ritorna null se Supabase restituisce un errore', async () => {
    const supa = mockSupabase({ data: null, error: { message: 'not found' } })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await getSignedUrl(supa as any, 'documenti', 'path/inesistente.pdf', 300)

    expect(url).toBeNull()
  })

  it('ritorna null se data.signedUrl è assente', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supa = mockSupabase({ data: null as any, error: null })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await getSignedUrl(supa as any, 'documenti', 'path.pdf', 300)

    expect(url).toBeNull()
  })
})
