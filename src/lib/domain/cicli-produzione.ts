// Valori realmente in uso oggi in cicli_produzione.tipo_dispositivo (140
// righe, verificato via query diretta sul DB il 06/07/2026) — testo libero
// in italiano, NESSUN CHECK constraint a livello DB. Dominio distinto
// dall'enum a slug in TabDati.tsx (lavori.tipo_dispositivo: 'protesi_fissa',
// 'cad_cam', ecc.) — nessun join tra i due campi, non riusare quell'enum qui.
// "Riferimento" (1 riga su 140, dato anomalo) escluso di proposito.
export const TIPO_DISPOSITIVO_CICLO_OPTIONS = [
  'Protesi fissa',
  'Protesi mobile',
  'Protesi combinata',
  'Protesi provvisoria',
  'Protesi scheletrica',
  'Protesi ortodontica',
] as const

// Stessi 4 valori del CHECK constraint cicli_produzione_classe_rischio_check.
export const CLASSE_RISCHIO_CICLO_OPTIONS = [
  'classe_i',
  'classe_iia',
  'classe_iib',
  'classe_iii',
] as const
