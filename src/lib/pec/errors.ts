export function mapSmtpError(raw: string): string {
  if (/535|authentication|invalid.*credenti|wrong.*pass/i.test(raw))
    return 'Email o password non corretti. Usa la password della casella PEC (non quella del sito web del provider).'
  if (/timeout|timed out|ETIMEDOUT|ECONNREFUSED/i.test(raw))
    return 'Non riusciamo a raggiungere il server. Controlla la connessione internet e riprova.'
  if (/ssl|tls|certificate|ECONNRESET/i.test(raw))
    return 'Problema di sicurezza con il server PEC. Contatta il supporto.'
  if (/550|relay|not allowed|spam/i.test(raw))
    return 'Il provider non permette l\'invio da applicazioni esterne. Controlla le impostazioni SMTP nel pannello del tuo provider.'
  if (/quota|storage|full/i.test(raw))
    return 'La casella PEC è piena. Libera spazio e riprova.'
  return 'Errore di connessione. Verifica le credenziali e riprova, oppure contatta il supporto.'
}
