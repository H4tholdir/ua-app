import { describe, it, expect } from 'vitest'
import { isSameOrigin } from '@/lib/utils/csrf'

function makeReq(origin: string | null, host: string | null): Request {
  const headers = new Headers()
  if (origin) headers.set('origin', origin)
  if (host) headers.set('host', host)
  return new Request('http://localhost:3000/api/test', { method: 'POST', headers })
}

describe('isSameOrigin', () => {
  it('ritorna true se origin è assente (same-origin browser request)', () => {
    expect(isSameOrigin(makeReq(null, 'localhost:3000'))).toBe(true)
  })

  it('ritorna true se origin corrisponde a host', () => {
    expect(isSameOrigin(makeReq('http://localhost:3000', 'localhost:3000'))).toBe(true)
  })

  it('ritorna false se origin è diverso dal host (CSRF)', () => {
    expect(isSameOrigin(makeReq('https://evil.com', 'localhost:3000'))).toBe(false)
  })

  it('ritorna false se host è assente ma origin è presente', () => {
    expect(isSameOrigin(makeReq('http://localhost:3000', null))).toBe(false)
  })

  it('gestisce origin con porta diversa', () => {
    expect(isSameOrigin(makeReq('http://localhost:4000', 'localhost:3000'))).toBe(false)
  })

  it('gestisce dominio di produzione', () => {
    expect(isSameOrigin(makeReq('https://app.ua.it', 'app.ua.it'))).toBe(true)
  })
})
