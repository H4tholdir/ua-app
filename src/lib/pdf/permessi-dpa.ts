import 'server-only'

/** 🔑 Chi può EMETTERE un DPA — l'unico elenco, e per questo sta qui.
 *  Fino al 02/08/2026 viveva solo dentro `api/clienti/[id]/dpa/route.ts:22`,
 *  e la scheda cliente non lo conosceva affatto: mostrava il tasto a tutti
 *  (P17/D158). Due copie di un elenco di permessi divergono — è già successo
 *  in questo progetto con `admin_sistema`, che mancava da un elenco «completo»
 *  pur essendo usato 15 volte.
 *  🛑 I ruoli del sistema sono CINQUE (`titolare`, `tecnico`, `front_desk`,
 *  `admin_rete`, `admin_sistema`): qui ne stanno TRE, e `admin` nudo NON
 *  esiste in banca dati. La fonte autoritativa è il CHECK su `public.utenti.ruolo`. */
export const RUOLI_EMISSIONE_DPA = ['titolare', 'admin_rete', 'admin_sistema'] as const

export function puoEmettereDpa(ruolo: string | null | undefined): boolean {
  return ruolo != null && (RUOLI_EMISSIONE_DPA as readonly string[]).includes(ruolo)
}
