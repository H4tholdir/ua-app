// Predicato puro: un INSERT su `lavori` è una nuova richiesta dal portale dentista?
// Sostituisce il vecchio check `note_interne.startsWith('RICHIESTA_DENTISTA')`.
export function isNuovaRichiestaDentista(nuovo: Record<string, unknown>, ruolo: string): boolean {
  return nuovo.da_portale === true && (ruolo === 'titolare' || ruolo === 'front_desk')
}
