// Etichette granulari stato SDI — modulo CONDIVISO server/client (niente
// 'use client', niente 'server-only'): importabile sia dal Server Component
// /fatture/[id] sia dal client component InviaPecButton. NON spostare dentro
// un file 'use client': gli export di un client component diventano client
// reference nei Server Component e il Record risulterebbe undefined a runtime
// (bug trovato in QA browser N10).
// Mappa da mockup approvato docs/design/mockups/2026-07-15-invia-pec-sdi.html.

export const STATO_SDI_LABEL: Record<string, string> = {
  draft: 'Bozza — XML non generato',
  generata: "Pronta per l'invio",
  smtp_inviata: 'Inviata a SdI — in attesa di ricevuta',
  pec_consegnata: 'PEC consegnata',
  ricevuta_sdi: 'Ricevuta da SdI',
  accettata: 'Accettata da SdI',
  rifiutata: 'Rifiutata da SdI',
  scaduta: 'Senza risposta SdI (scaduta)',
}
