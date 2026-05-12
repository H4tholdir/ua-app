import 'server-only'

export const STRIPE_PRICES = {
  lab_monthly:  process.env.STRIPE_PRICE_LAB_MONTHLY!,
  lab_yearly:   process.env.STRIPE_PRICE_LAB_YEARLY!,
  rete_monthly: process.env.STRIPE_PRICE_RETE_MONTHLY!,
  rete_yearly:  process.env.STRIPE_PRICE_RETE_YEARLY!,
} as const

export type StripePriceKey = keyof typeof STRIPE_PRICES

export function isPriceAllowed(priceId: string): boolean {
  return (Object.values(STRIPE_PRICES) as string[]).includes(priceId)
}

export function getPlanName(priceId: string): string {
  const entries = Object.entries(STRIPE_PRICES)
  const match = entries.find(([, id]) => id === priceId)
  return match ? match[0].replace('_', ' ') : 'sconosciuto'
}
