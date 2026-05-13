/**
 * Verifies that a mutating request originates from the same host.
 * Protects cookie-authenticated API routes against CSRF.
 * Returns true (safe) if Origin header is absent (same-origin requests from
 * non-browser contexts typically omit it) or matches the Host header.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true // server-to-server calls; no browser CSRF risk
  const host = req.headers.get('host')
  if (!host) return false
  try {
    const { host: originHost } = new URL(origin)
    return originHost === host
  } catch {
    return false
  }
}
