// Task 15 — scrittura fire-and-forget del flag «intro Parete vista» al tap del racconto backfill
// in StrisciaStato (spec §6, dismissal per-utente in `nav_preferences.parete_intro_vista`).
//
// «Fire-and-forget» NON è «silenzioso-e-rotto»: la navigazione a /cassette non deve MAI
// attendere questa PATCH (è una riga una tantum, non un'operazione critica), ma un errore va
// LOGGATO, mai ingoiato. Nessun `await`, nessun ritorno: chi chiama tappa e va.
//
// Contratto route (src/app/api/impostazioni/preferenze/route.ts): PATCH allowlist, accetta
// SOLO `{ parete_intro_vista: true }`, same-origin (il fetch relativo porta l'Origin corretto).
export function segnaPareteIntroVista(): void {
  void fetch('/api/impostazioni/preferenze', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parete_intro_vista: true }),
  })
    .then((res) => {
      if (!res.ok) console.error('[segnaPareteIntroVista] PATCH non riuscita:', res.status)
    })
    .catch((err) => console.error('[segnaPareteIntroVista] PATCH fallita:', err))
}
