export function isTrialExpiringSoon(
  stato: string,
  trialEndsAt: string | null,
  now: Date = new Date()
): boolean {
  if (stato !== 'trial' || !trialEndsAt) return false
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  return new Date(trialEndsAt).getTime() - now.getTime() < sevenDaysMs
}
