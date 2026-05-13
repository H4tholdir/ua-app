/**
 * Validates that a redirect path is safe (local, no open-redirect).
 * Rejects: null, non-strings, absolute URLs, protocol-relative //..., external hosts.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || typeof raw !== 'string') return fallback
  // Must start with / but NOT with // (protocol-relative)
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  // Reject anything that looks like an absolute URL after stripping leading /
  if (raw.includes('://')) return fallback
  return raw
}
