'use client'

// DS v3 §5.14 — Avatar: colore deterministico dal nome + iniziali, nessuna foto.
// Ø 60 nelle tile del wizard (§5.12 TileScelta), Ø 46 nelle liste e nel portale.

import { avatarPalette, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'

/**
 * coloreAvatar — colore deterministico dalla `avatarPalette` (§5.14).
 *
 * Somma dei codepoint del nome intero, modulo la lunghezza della palette:
 * stesso nome → sempre lo stesso colore, senza stato né rete.
 */
export function coloreAvatar(nome: string): string {
  let somma = 0
  for (const carattere of nome) {
    somma += carattere.codePointAt(0) ?? 0
  }
  return avatarPalette[somma % avatarPalette.length]
}

/** Iniziali (§5.14): prime lettere dei primi due "parole" del nome, maiuscole. */
function inizialiAvatar(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter(Boolean)
  if (parole.length === 0) return ''
  if (parole.length === 1) return parole[0].charAt(0).toUpperCase()
  return (parole[0].charAt(0) + parole[1].charAt(0)).toUpperCase()
}

/**
 * Avatar — identità di un dentista/studio (§5.14).
 *
 * Nessuna foto: colore deterministico (`coloreAvatar`) + iniziali bianche
 * 21/800. Decorativo (`aria-hidden`): il nome completo è sempre leggibile
 * come testo accanto a ogni uso reale dell'Avatar (TileScelta, liste, portale).
 */
export function Avatar(props: { nome: string; diametro?: 60 | 46 }) {
  const { nome, diametro = 60 } = props
  const colore = coloreAvatar(nome)
  const iniziali = inizialiAvatar(nome)

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: diametro,
        height: diametro,
        borderRadius: '50%',
        background: colore,
        color: testoSuFaccia,
        fontSize: 21,
        fontWeight: tipografia.weight.extrabold,
        lineHeight: 1,
      }}
    >
      {iniziali}
    </span>
  )
}
