/**
 * Escapa i caratteri HTML speciali in una stringa per prevenire injection
 * quando il valore viene interpolato in un template HTML (es. email transazionali).
 *
 * Sostituisce: & < > " '
 */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => map[char])
}
