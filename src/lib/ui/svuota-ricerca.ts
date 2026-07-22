// P7 (collaudo device 22/07, ratifica Francesco): la «×» di pulizia è NOSTRA e identica sui due
// OS — il clear nativo di type="search" esiste su Chrome e non su Safari. La logica è una sola;
// lo stile lo mette ogni superficie col SUO design system (v3 o v2.3, mai misti).
export function svuotaRicerca(input: HTMLInputElement | null, svuota: () => void): void {
  svuota()
  input?.focus()
}
