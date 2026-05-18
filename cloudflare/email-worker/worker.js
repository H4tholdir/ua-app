// Cloudflare Email Worker — riceve email su verify+*@uachelab.com
// e chiama il callback Next.js per confermare la verifica PEC
export default {
  async email(message, env, ctx) {
    const to = message.to ?? ''
    const match = to.match(/verify\+([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})@/i)
    if (!match) {
      console.log('[pec-worker] No UUID token found in TO:', to)
      return
    }
    const token = match[1]
    console.log('[pec-worker] Received verification email, token:', token.slice(0, 8))
    try {
      const res = await fetch(`${env.APP_URL}/api/internal/pec-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('[pec-worker] Callback failed:', res.status, text)
      } else {
        console.log('[pec-worker] Verification confirmed for token:', token.slice(0, 8))
      }
    } catch (err) {
      console.error('[pec-worker] Network error:', err.message)
    }
  },
}
