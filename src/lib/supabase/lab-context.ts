import 'server-only'
import { cache } from 'react'
import { getServerUserClient } from './server-user'
import { getServiceClient } from './server-service'

// Contesto utente corrente — UNICA via per il lookup `utenti` self (N11: filtro
// deleted_at SEMPRE, allineato a public.current_lab_id()/has_role()).
// Due vie d'identità (spec R2 §D-2):
// - getLabContext: getClaims() locale (zero rete) — SOLO Server Components e GET
//   categoria A (allowlist in lab-context-allowlist.ts, test di guardia).
// - getFreshLabContext: getUser() di rete — mutazioni, fiscale, admin, borderline.
export type LabContext = {
  userId: string
  email: string | null
  ruolo: string
  laboratorioId: string | null // null legale SOLO per admin_sistema
  nome: string | null
  cognome: string | null
  lab: { stato: string; trial_ends_at: string | null; nome: string } | null
}
export type ContextTimings = { authMs: number; dbMs: number }

// Embed LEFT (MAI !inner): admin_sistema ha laboratorio_id NULL by design.
const SELECT_CONTEXT = 'ruolo, laboratorio_id, nome, cognome, laboratori(stato, trial_ends_at, nome)'

type UtenteRow = {
  ruolo: string
  laboratorio_id: string | null
  nome: string | null
  cognome: string | null
  laboratori: { stato: string; trial_ends_at: string | null; nome: string } | null
}

async function fetchUtenteRow(userId: string): Promise<UtenteRow | null> {
  const svc = getServiceClient()
  const { data, error } = await svc
    .from('utenti')
    .select(SELECT_CONTEXT)
    .eq('id', userId)
    .is('deleted_at', null)
    .single()
  if (error && error.code !== 'PGRST116') {
    console.error('[lab-context] lookup utenti fallito — fail-closed:', error.code, error.message)
  }
  return (data as UtenteRow | null) ?? null
}

function toContext(userId: string, email: string | null, row: UtenteRow): LabContext {
  return {
    userId,
    email,
    ruolo: row.ruolo,
    laboratorioId: row.laboratorio_id,
    nome: row.nome,
    cognome: row.cognome,
    lab: row.laboratori,
  }
}

const getLabContextCached = cache(
  async (): Promise<{ context: LabContext | null; timings: ContextTimings }> => {
    const t0 = performance.now()
    const supabase = await getServerUserClient()
    const { data } = await supabase.auth.getClaims()
    const authMs = performance.now() - t0
    const sub = data?.claims?.sub as string | undefined
    const email = (data?.claims?.email as string | undefined) ?? null
    if (!sub) return { context: null, timings: { authMs, dbMs: 0 } }
    const t1 = performance.now()
    const row = await fetchUtenteRow(sub)
    const dbMs = performance.now() - t1
    if (!row) return { context: null, timings: { authMs, dbMs } }
    return { context: toContext(sub, email, row), timings: { authMs, dbMs } }
  }
)

export async function getLabContext(): Promise<LabContext | null> {
  return (await getLabContextCached()).context
}

export async function getLabContextWithTimings(): Promise<{
  context: LabContext | null
  timings: ContextTimings
}> {
  return getLabContextCached()
}

export async function getFreshLabContext(
  timings?: Partial<ContextTimings>
): Promise<LabContext | null> {
  const t0 = performance.now()
  const supabase = await getServerUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (timings) timings.authMs = performance.now() - t0
  if (!user) return null
  const t1 = performance.now()
  const row = await fetchUtenteRow(user.id)
  if (timings) timings.dbMs = performance.now() - t1
  if (!row) return null
  return toContext(user.id, user.email ?? null, row)
}
