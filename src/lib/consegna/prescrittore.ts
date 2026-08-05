import { testoVivo } from '@/lib/utils/testo'

/**
 * Il nome del prescrittore da scrivere su un documento (D242).
 *
 * Allegato XIII, elemento 3: la dichiarazione porta il nome di chi ha
 * prescritto il dispositivo. Se il lavoro non lo dice, quel nome è il cliente
 * — cioè lo studio o il medico che ha mandato il lavoro: è la stessa regola
 * che il controllo di consegna applica da sempre (`precheck.ts`, elemento 3).
 *
 * 🔑 Perché i due testi arrivano come STRINGHE e non come oggetto `lavoro`:
 * la regola di ripiego è una sola e vive qui, ma la GRAFIA del nome del
 * cliente resta di chi stampa — la Dichiarazione scrive «Cognome Nome», il
 * buono di consegna «Nome Cognome», e ognuno dei due è coerente con il resto
 * del proprio foglio. Unificare anche la grafia cambierebbe l'aspetto di un
 * documento senza che nessuno l'abbia chiesto.
 *
 * Torna `null` quando non c'è NESSUN nome: non se ne inventa uno, e chi
 * chiama decide cosa stampare al suo posto.
 */
export function nomePrescrittore(
  richiedenteNome: string | null | undefined,
  nomeCliente: string | null | undefined,
): string | null {
  return testoVivo(richiedenteNome) ?? testoVivo(nomeCliente)
}
