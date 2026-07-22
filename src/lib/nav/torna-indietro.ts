// Direttiva permanente di Francesco (22/07/2026, CLAUDE.md §9): il back, ovunque nella PWA,
// torna alla pagina PRECEDENTE. Il fallback scatta solo senza storia (deep-link, shortcut PWA,
// notifica push): `history.length` è il segnale migliore disponibile — Next non espone lo stack.
// Firma duck-typed (back/push) e non `useRouter` di proposito: testabile senza Next.
export function tornaIndietro(
  router: { back: () => void; push: (href: string) => void },
  fallback = '/dashboard'
): void {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    router.push(fallback)
  }
}
