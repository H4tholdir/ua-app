export type RuoloInvito = 'titolare' | 'tecnico' | 'front_desk' | 'admin_rete'

export const RUOLI_INVITABILI_DA_TITOLARE = ['tecnico', 'front_desk', 'titolare'] as const

export type RuoloInvitabileDaTitolare = (typeof RUOLI_INVITABILI_DA_TITOLARE)[number]

export function isRuoloInvitabileDaTitolare(
  ruolo: unknown
): ruolo is RuoloInvitabileDaTitolare {
  return (
    typeof ruolo === 'string' &&
    (RUOLI_INVITABILI_DA_TITOLARE as readonly string[]).includes(ruolo)
  )
}
