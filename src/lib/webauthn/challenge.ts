import 'server-only'
import { getServiceClient } from '@/lib/supabase/server-service'

export async function storeChallenge(challenge: string, userId?: string): Promise<string> {
  const svc = getServiceClient()
  const { data, error } = await svc
    .from('webauthn_challenges')
    .insert({ challenge, user_id: userId ?? null })
    .select('id')
    .single()
  if (error) throw new Error('Impossibile salvare challenge WebAuthn')
  return data.id
}

export async function consumeChallenge(challengeId: string): Promise<string> {
  const svc = getServiceClient()

  const { data, error } = await svc
    .from('webauthn_challenges')
    .select('challenge, expires_at, used_at')
    .eq('id', challengeId)
    .single()

  if (error || !data) throw new Error('Challenge non trovata')
  if (data.used_at) throw new Error('Challenge già usata')
  if (new Date(data.expires_at) < new Date()) throw new Error('Challenge scaduta')

  // Marca come usata
  await svc
    .from('webauthn_challenges')
    .update({ used_at: new Date().toISOString() })
    .eq('id', challengeId)

  return data.challenge
}
