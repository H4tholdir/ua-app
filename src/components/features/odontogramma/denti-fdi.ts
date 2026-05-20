export type TipoDente = 'molare' | 'premolare' | 'canino' | 'incisivo_laterale' | 'incisivo_centrale'
export type StatoDente = 'normale' | 'selezionato' | 'mancante' | 'implanto'
export type ArcataType = 'superiore' | 'inferiore'

export interface DenteFDI {
  numero: number
  tipo: TipoDente
  arcata: ArcataType
  quadrante: 1 | 2 | 3 | 4
  larghezza: number   // px
}

// Adulto FDI — 32 denti
// Quadrante 1 (sup dx): 18→11, Quadrante 2 (sup sx): 21→28
// Quadrante 4 (inf dx): 48→41, Quadrante 3 (inf sx): 31→38
export const DENTI_ADULTO: DenteFDI[] = [
  // Q1 superiore DX (da periferia verso centro)
  { numero: 18, tipo: 'molare',            arcata: 'superiore', quadrante: 1, larghezza: 18 },
  { numero: 17, tipo: 'molare',            arcata: 'superiore', quadrante: 1, larghezza: 19 },
  { numero: 16, tipo: 'molare',            arcata: 'superiore', quadrante: 1, larghezza: 20 },
  { numero: 15, tipo: 'premolare',         arcata: 'superiore', quadrante: 1, larghezza: 16 },
  { numero: 14, tipo: 'premolare',         arcata: 'superiore', quadrante: 1, larghezza: 16 },
  { numero: 13, tipo: 'canino',            arcata: 'superiore', quadrante: 1, larghezza: 14 },
  { numero: 12, tipo: 'incisivo_laterale', arcata: 'superiore', quadrante: 1, larghezza: 13 },
  { numero: 11, tipo: 'incisivo_centrale', arcata: 'superiore', quadrante: 1, larghezza: 15 },
  // Q2 superiore SX (da centro verso periferia)
  { numero: 21, tipo: 'incisivo_centrale', arcata: 'superiore', quadrante: 2, larghezza: 15 },
  { numero: 22, tipo: 'incisivo_laterale', arcata: 'superiore', quadrante: 2, larghezza: 13 },
  { numero: 23, tipo: 'canino',            arcata: 'superiore', quadrante: 2, larghezza: 14 },
  { numero: 24, tipo: 'premolare',         arcata: 'superiore', quadrante: 2, larghezza: 16 },
  { numero: 25, tipo: 'premolare',         arcata: 'superiore', quadrante: 2, larghezza: 16 },
  { numero: 26, tipo: 'molare',            arcata: 'superiore', quadrante: 2, larghezza: 20 },
  { numero: 27, tipo: 'molare',            arcata: 'superiore', quadrante: 2, larghezza: 19 },
  { numero: 28, tipo: 'molare',            arcata: 'superiore', quadrante: 2, larghezza: 18 },
  // Q4 inferiore DX (da periferia verso centro)
  { numero: 48, tipo: 'molare',            arcata: 'inferiore', quadrante: 4, larghezza: 18 },
  { numero: 47, tipo: 'molare',            arcata: 'inferiore', quadrante: 4, larghezza: 19 },
  { numero: 46, tipo: 'molare',            arcata: 'inferiore', quadrante: 4, larghezza: 20 },
  { numero: 45, tipo: 'premolare',         arcata: 'inferiore', quadrante: 4, larghezza: 16 },
  { numero: 44, tipo: 'premolare',         arcata: 'inferiore', quadrante: 4, larghezza: 16 },
  { numero: 43, tipo: 'canino',            arcata: 'inferiore', quadrante: 4, larghezza: 14 },
  { numero: 42, tipo: 'incisivo_laterale', arcata: 'inferiore', quadrante: 4, larghezza: 12 },
  { numero: 41, tipo: 'incisivo_centrale', arcata: 'inferiore', quadrante: 4, larghezza: 13 },
  // Q3 inferiore SX (da centro verso periferia)
  { numero: 31, tipo: 'incisivo_centrale', arcata: 'inferiore', quadrante: 3, larghezza: 13 },
  { numero: 32, tipo: 'incisivo_laterale', arcata: 'inferiore', quadrante: 3, larghezza: 12 },
  { numero: 33, tipo: 'canino',            arcata: 'inferiore', quadrante: 3, larghezza: 14 },
  { numero: 34, tipo: 'premolare',         arcata: 'inferiore', quadrante: 3, larghezza: 16 },
  { numero: 35, tipo: 'premolare',         arcata: 'inferiore', quadrante: 3, larghezza: 16 },
  { numero: 36, tipo: 'molare',            arcata: 'inferiore', quadrante: 3, larghezza: 20 },
  { numero: 37, tipo: 'molare',            arcata: 'inferiore', quadrante: 3, larghezza: 19 },
  { numero: 38, tipo: 'molare',            arcata: 'inferiore', quadrante: 3, larghezza: 18 },
]

// Deciduo FDI — 20 denti (Q5-Q8)
export const DENTI_DECIDUO: DenteFDI[] = [
  { numero: 55, tipo: 'molare',            arcata: 'superiore', quadrante: 1, larghezza: 16 },
  { numero: 54, tipo: 'molare',            arcata: 'superiore', quadrante: 1, larghezza: 16 },
  { numero: 53, tipo: 'canino',            arcata: 'superiore', quadrante: 1, larghezza: 13 },
  { numero: 52, tipo: 'incisivo_laterale', arcata: 'superiore', quadrante: 1, larghezza: 11 },
  { numero: 51, tipo: 'incisivo_centrale', arcata: 'superiore', quadrante: 1, larghezza: 12 },
  { numero: 61, tipo: 'incisivo_centrale', arcata: 'superiore', quadrante: 2, larghezza: 12 },
  { numero: 62, tipo: 'incisivo_laterale', arcata: 'superiore', quadrante: 2, larghezza: 11 },
  { numero: 63, tipo: 'canino',            arcata: 'superiore', quadrante: 2, larghezza: 13 },
  { numero: 64, tipo: 'molare',            arcata: 'superiore', quadrante: 2, larghezza: 16 },
  { numero: 65, tipo: 'molare',            arcata: 'superiore', quadrante: 2, larghezza: 16 },
  { numero: 85, tipo: 'molare',            arcata: 'inferiore', quadrante: 4, larghezza: 16 },
  { numero: 84, tipo: 'molare',            arcata: 'inferiore', quadrante: 4, larghezza: 16 },
  { numero: 83, tipo: 'canino',            arcata: 'inferiore', quadrante: 4, larghezza: 13 },
  { numero: 82, tipo: 'incisivo_laterale', arcata: 'inferiore', quadrante: 4, larghezza: 11 },
  { numero: 81, tipo: 'incisivo_centrale', arcata: 'inferiore', quadrante: 4, larghezza: 12 },
  { numero: 71, tipo: 'incisivo_centrale', arcata: 'inferiore', quadrante: 3, larghezza: 12 },
  { numero: 72, tipo: 'incisivo_laterale', arcata: 'inferiore', quadrante: 3, larghezza: 11 },
  { numero: 73, tipo: 'canino',            arcata: 'inferiore', quadrante: 3, larghezza: 13 },
  { numero: 74, tipo: 'molare',            arcata: 'inferiore', quadrante: 3, larghezza: 16 },
  { numero: 75, tipo: 'molare',            arcata: 'inferiore', quadrante: 3, larghezza: 16 },
]
