// Helper data PURI, condivisibili tra server e client (Ondata 2 — fix bug QA).
//
// Storia: queste 3 funzioni vivevano in `src/components/ds/Campo.tsx`, che ha
// la direttiva `'use client'` in cima. Next.js marca OGNI export di un
// modulo `'use client'` come client reference: chiamarle da codice
// server-side (RSC, `server-only`) crasha a runtime con
// "Attempted to call X() from the server but X is on the client." —
// jsdom (vitest) non applica quel confine, quindi la suite unitaria non lo
// coglieva.
//
// Nessuna direttiva qui (né 'use client' né 'server-only'): sono funzioni
// pure su `Date`, senza dipendenze da API browser o server — importabili
// da entrambi i lati senza violare il confine RSC.

/** Mezzanotte locale dello stesso giorno di `d` — azzera l'ora, non il fuso. */
export function inizioGiorno(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Somma `n` giorni (anche negativi) attraversando correttamente mese/anno. */
export function aggiungiGiorni(d: Date, n: number): Date {
  const risultato = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
  return risultato
}

export function stessoGiorno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
