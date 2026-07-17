export function isTrialExpiringSoon(
  stato: string,
  trialEndsAt: string | null,
  now: Date = new Date()
): boolean {
  if (stato !== 'trial' || !trialEndsAt) return false
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  return new Date(trialEndsAt).getTime() - now.getTime() < sevenDaysMs
}

// N13: predicato unico "trial scaduto" — usato sia dal gate UX del layout (app)
// sia dalla guard API (lab-guard.ts). trial_ends_at NULL = override admin,
// non scade mai.
export function isTrialScaduto(
  stato: string,
  trialEndsAt: string | null,
  now: Date = new Date()
): boolean {
  if (stato !== 'trial' || trialEndsAt === null) return false
  return new Date(trialEndsAt) < now
}
