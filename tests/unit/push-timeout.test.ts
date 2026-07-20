// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: mockSend },
}))

import { sendPushToSubscription } from '../../src/lib/notifications/push'

const SUB = { endpoint: 'https://push.example/e', keys: { p256dh: 'k', auth: 'a' } }
const PAYLOAD = { title: 'Prova rientrata', body: 'n.147' }

describe('sendPushToSubscription — timeout (request-path)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.clearAllMocks() })

  it('endpoint che non risponde mai → rigetta dopo 5s (non resta appeso)', async () => {
    mockSend.mockReturnValue(new Promise(() => {})) // mai risolta
    const p = sendPushToSubscription(SUB, PAYLOAD)
    const esito = expect(p).rejects.toThrow(/timeout/)
    await vi.advanceTimersByTimeAsync(5000)
    await esito
  })

  it('endpoint veloce → risolve senza errori e senza timer pendenti', async () => {
    mockSend.mockResolvedValue(undefined)
    await expect(sendPushToSubscription(SUB, PAYLOAD)).resolves.toBeUndefined()
    expect(vi.getTimerCount()).toBe(0) // il timer del race è stato ripulito
  })
})
