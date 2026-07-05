// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import type Stripe from 'stripe'

const { mockTransitionLabStato } = vi.hoisted(() => ({
  mockTransitionLabStato: vi.fn(),
}))

vi.mock('@/lib/stripe/state-machine', () => ({
  transitionLabStato: mockTransitionLabStato,
}))

import {
  handleCheckoutCompleted,
  handlePaymentSucceeded,
  handlePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '../../src/lib/stripe/webhook-handlers'

function checkoutEvent(): Stripe.Event {
  return {
    id: 'evt_checkout_1',
    created: 1751500000,
    data: {
      object: {
        client_reference_id: 'lab-1',
        metadata: {},
        subscription: 'sub_123',
        customer: 'cus_123',
        line_items: { data: [{ price: { id: 'price_123' } }] },
      },
    },
  } as unknown as Stripe.Event
}

function invoiceEvent(subId: string | null, nextPaymentAttempt: number | null = null): Stripe.Event {
  return {
    id: 'evt_invoice_1',
    created: 1751500000,
    data: {
      object: {
        parent: subId ? { subscription_details: { subscription: subId } } : null,
        next_payment_attempt: nextPaymentAttempt,
      },
    },
  } as unknown as Stripe.Event
}

function subscriptionEvent(id: string, status: string): Stripe.Event {
  return {
    id: 'evt_subscription_1',
    created: 1751500000,
    data: {
      object: {
        id,
        status,
        items: { data: [{ price: { id: 'price_456' } }] },
      },
    },
  } as unknown as Stripe.Event
}

function fakeSupabaseFound(lab: { id: string; stato: string }) {
  return {
    from: (table: string) => {
      if (table === 'laboratori') {
        return {
          select: () => createChain({ data: lab, error: null }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function fakeSupabaseNotFound() {
  return {
    from: (table: string) => {
      if (table === 'laboratori') {
        return { select: () => createChain({ data: null, error: { message: 'no rows' } }) }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('webhook-handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransitionLabStato.mockResolvedValue({ success: true })
  })

  describe('handleCheckoutCompleted', () => {
    it('happy path: chiama transitionLabStato con i dati corretti', async () => {
      await handleCheckoutCompleted(checkoutEvent(), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(
        expect.anything(), 'lab-1', 'attivo', 'stripe_webhook',
        expect.objectContaining({ extraFields: expect.objectContaining({ stripe_subscription_id: 'sub_123' }) })
      )
    })

    it('lancia se transitionLabStato fallisce in modo retryable', async () => {
      mockTransitionLabStato.mockResolvedValue({ success: false, error: 'Lab non trovato', retryable: true })
      await expect(
        handleCheckoutCompleted(checkoutEvent(), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      ).rejects.toThrow('Lab non trovato')
    })

    it('non lancia se transitionLabStato fallisce in modo terminale (solo log)', async () => {
      mockTransitionLabStato.mockResolvedValue({ success: false, error: 'Stato blacklist è terminale' })
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(
        handleCheckoutCompleted(checkoutEvent(), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      ).resolves.toBeUndefined()
      expect(errSpy).toHaveBeenCalled()
      errSpy.mockRestore()
    })
  })

  describe('handlePaymentSucceeded', () => {
    it('happy path', async () => {
      await handlePaymentSucceeded(invoiceEvent('sub_123'), fakeSupabaseFound({ id: 'lab-1', stato: 'trial' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'attivo', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato per la subscription (race checkout/invoice)', async () => {
      await expect(handlePaymentSucceeded(invoiceEvent('sub_sconosciuto'), fakeSupabaseNotFound()))
        .rejects.toThrow()
      expect(mockTransitionLabStato).not.toHaveBeenCalled()
    })
  })

  describe('handlePaymentFailed', () => {
    it('non fa nulla se next_payment_attempt non è null (Stripe sta ancora ritentando)', async () => {
      await handlePaymentFailed(invoiceEvent('sub_123', 123456), fakeSupabaseFound({ id: 'lab-1', stato: 'attivo' }))
      expect(mockTransitionLabStato).not.toHaveBeenCalled()
    })

    it('happy path quando i retry Stripe sono esauriti', async () => {
      await handlePaymentFailed(invoiceEvent('sub_123', null), fakeSupabaseFound({ id: 'lab-1', stato: 'attivo' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'sospeso', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato quando i retry sono esauriti', async () => {
      await expect(handlePaymentFailed(invoiceEvent('sub_sconosciuto', null), fakeSupabaseNotFound()))
        .rejects.toThrow()
    })
  })

  describe('handleSubscriptionDeleted', () => {
    it('happy path', async () => {
      await handleSubscriptionDeleted(subscriptionEvent('sub_123', 'canceled'), fakeSupabaseFound({ id: 'lab-1', stato: 'attivo' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'scaduto', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato', async () => {
      await expect(handleSubscriptionDeleted(subscriptionEvent('sub_sconosciuto', 'canceled'), fakeSupabaseNotFound()))
        .rejects.toThrow()
    })
  })

  describe('handleSubscriptionUpdated', () => {
    it('ripristina attivo se il lab era sospeso e Stripe segnala active', async () => {
      await handleSubscriptionUpdated(subscriptionEvent('sub_123', 'active'), fakeSupabaseFound({ id: 'lab-1', stato: 'sospeso' }))
      expect(mockTransitionLabStato).toHaveBeenCalledWith(expect.anything(), 'lab-1', 'attivo', 'stripe_webhook', expect.anything())
    })

    it('lancia se il lab non viene trovato', async () => {
      await expect(handleSubscriptionUpdated(subscriptionEvent('sub_sconosciuto', 'active'), fakeSupabaseNotFound()))
        .rejects.toThrow()
    })

    it('ramo metadata-only: logga se l\'update fallisce, senza lanciare', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const supabase = {
        from: (table: string) => {
          if (table === 'laboratori') {
            return {
              select: () => createChain({ data: { id: 'lab-1', stato: 'attivo' }, error: null }),
              update: () => ({ eq: async () => ({ error: { message: 'update fallito' } }) }),
            }
          }
          throw new Error(`Tabella inattesa nel mock: ${table}`)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
      await expect(
        handleSubscriptionUpdated(subscriptionEvent('sub_123', 'past_due'), supabase)
      ).resolves.toBeUndefined()
      expect(mockTransitionLabStato).not.toHaveBeenCalled()
      expect(errSpy).toHaveBeenCalled()
      errSpy.mockRestore()
    })
  })
})
