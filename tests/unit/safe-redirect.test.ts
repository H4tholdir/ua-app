import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'

describe('safeRedirectPath', () => {
  it('ritorna il path se inizia con /', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
  })

  it('ritorna il fallback per path nullo', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard')
  })

  it('ritorna il fallback per stringa vuota', () => {
    expect(safeRedirectPath('')).toBe('/dashboard')
  })

  it('blocca URL assoluti (open redirect)', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/dashboard')
  })

  it('blocca protocol-relative URL (//evil.com)', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard')
  })

  it('blocca percorsi senza slash iniziale', () => {
    expect(safeRedirectPath('evil.com/path')).toBe('/dashboard')
  })

  it('usa fallback personalizzato se fornito', () => {
    expect(safeRedirectPath(null, '/login')).toBe('/login')
  })

  it('accetta percorsi profondi validi', () => {
    expect(safeRedirectPath('/lavori/123/consegna')).toBe('/lavori/123/consegna')
  })

  it('blocca javascript: URI (XSS)', () => {
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard')
  })
})
