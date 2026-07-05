// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { transitionLabStato } from '../../src/lib/stripe/state-machine'
import type { SupabaseClient } from '@supabase/supabase-js'

function fakeSupabase(
  labRow: { stato: string; last_stripe_event_at: string | null } | null,
  updateError: { message: string } | null = null
): SupabaseClient {
  return {
    from: (table: string) => {
      if (table === 'laboratori') {
        return {
          select: () => createChain({ data: labRow, error: labRow ? null : { message: 'no rows' } }),
          update: () => ({ eq: async () => ({ error: updateError }) }),
        }
      }
      if (table === 'lab_stato_log') {
        return { insert: async () => ({ error: null }) }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    },
  } as unknown as SupabaseClient
}

describe('transitionLabStato', () => {
  it('ritorna retryable:true quando il lab non viene trovato', async () => {
    const supabase = fakeSupabase(null)
    const result = await transitionLabStato(supabase, 'lab-inesistente', 'attivo', 'stripe_webhook')
    expect(result).toEqual({ success: false, error: 'Lab non trovato', retryable: true })
  })

  it('non imposta retryable per lo stato blacklist (terminale)', async () => {
    const supabase = fakeSupabase({ stato: 'blacklist', last_stripe_event_at: null })
    const result = await transitionLabStato(supabase, 'lab-1', 'attivo', 'stripe_webhook')
    expect(result.success).toBe(false)
    expect(result.retryable).toBeUndefined()
  })

  it('non imposta retryable per una transizione non consentita', async () => {
    const supabase = fakeSupabase({ stato: 'scaduto', last_stripe_event_at: null })
    const result = await transitionLabStato(supabase, 'lab-1', 'attivo', 'stripe_webhook')
    expect(result.success).toBe(false)
    expect(result.retryable).toBeUndefined()
  })

  it('ritorna success:true su una transizione valida (happy path)', async () => {
    const supabase = fakeSupabase({ stato: 'trial', last_stripe_event_at: null })
    const result = await transitionLabStato(supabase, 'lab-1', 'attivo', 'stripe_webhook')
    expect(result).toEqual({ success: true })
  })

  it('ritorna retryable:true quando fallisce l\'UPDATE che scrive la transizione', async () => {
    const supabase = fakeSupabase(
      { stato: 'trial', last_stripe_event_at: null },
      { message: 'connection reset by peer' }
    )
    const result = await transitionLabStato(supabase, 'lab-1', 'attivo', 'stripe_webhook')
    expect(result.success).toBe(false)
    expect(result.retryable).toBe(true)
  })
})
