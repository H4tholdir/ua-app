import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockGetClaims, mockCreateMiddlewareClient, getCapturedResponse } = vi.hoisted(() => {
  const mockGetClaims = vi.fn()
  let capturedResponse: { cookies: { set: (n: string, v: string, o?: unknown) => void } } | null = null
  const mockCreateMiddlewareClient = vi.fn((_req: unknown, res: never) => {
    capturedResponse = res
    return { auth: { getClaims: mockGetClaims } }
  })
  return {
    mockGetClaims,
    mockCreateMiddlewareClient,
    getCapturedResponse: () => capturedResponse,
  }
})

vi.mock('@/lib/supabase/middleware-client', () => ({
  createMiddlewareClient: mockCreateMiddlewareClient,
}))

import { middleware } from '@/middleware'

const req = (path: string) => new NextRequest(new URL(`https://uachelab.com${path}`))
const CLAIMS = { data: { claims: { sub: 'u-1' } }, error: null }
const NO_CLAIMS = { data: null, error: null }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('middleware', () => {
  it('route pubblica senza sessione → next, no redirect', async () => {
    mockGetClaims.mockResolvedValue(NO_CLAIMS)
    const res = await middleware(req('/login'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    expect(res.headers.get('server-timing')).toMatch(/auth;dur=\d+/)
  })

  it('route protetta senza claims → redirect /login?next=...', async () => {
    mockGetClaims.mockResolvedValue(NO_CLAIMS)
    const res = await middleware(req('/lavori'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?next=%2Flavori')
    expect(res.headers.get('server-timing')).toMatch(/auth;dur=\d+/)
  })

  it('route protetta con claims → next, x-pathname sui request headers, server-timing', async () => {
    mockGetClaims.mockResolvedValue(CLAIMS)
    const res = await middleware(req('/lavori'))
    expect(res.status).toBe(200)
    expect(res.headers.get('x-middleware-request-x-pathname')).toBe('/lavori')
    expect(res.headers.get('server-timing')).toMatch(/auth;dur=\d+/)
    expect(mockGetClaims).toHaveBeenCalledTimes(1)
  })

  it('/auth/callback → passthrough (nessuna chiamata a getClaims)', async () => {
    const res = await middleware(req('/auth/callback'))
    expect(res.status).toBe(200)
    expect(mockGetClaims).not.toHaveBeenCalled()
  })

  it('autenticato su /login → redirect /dashboard con Server-Timing', async () => {
    mockGetClaims.mockResolvedValue(CLAIMS)
    const res = await middleware(req('/login'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
    expect(res.headers.get('server-timing')).toMatch(/auth;dur=\d+/)
  })

  it('refresh: cookie riscritti quando il client li setta (setAll → Set-Cookie sulla response)', async () => {
    mockGetClaims.mockImplementation(async () => {
      getCapturedResponse()!.cookies.set('sb-access-token', 'nuovo', {})
      return CLAIMS
    })
    const res = await middleware(req('/dashboard'))
    expect(res.headers.get('set-cookie')).toContain('sb-access-token=nuovo')
  })

  it('refresh: cookie riscritti anche quando il ramo finale è un redirect (autenticato dopo refresh su /login)', async () => {
    mockGetClaims.mockImplementation(async () => {
      getCapturedResponse()!.cookies.set('sb-access-token', 'refreshed', {})
      return CLAIMS
    })
    const res = await middleware(req('/login'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
    expect(res.headers.get('set-cookie')).toContain('sb-access-token=refreshed')
  })

  it('refresh fallito (getClaims → {data:null}) → redirect /login senza throw', async () => {
    mockGetClaims.mockResolvedValue(NO_CLAIMS)
    await expect(middleware(req('/dashboard'))).resolves.toBeTruthy()
    const res = await middleware(req('/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })
})
