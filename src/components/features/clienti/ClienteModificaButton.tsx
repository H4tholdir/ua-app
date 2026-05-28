'use client'

import { useState } from 'react'
import { ClienteEditSheet, type ClienteEditData } from './ClienteEditSheet'

interface ClienteModificaButtonProps {
  cliente: ClienteEditData
}

export function ClienteModificaButton({ cliente }: ClienteModificaButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Modifica cliente"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '40px',
          minHeight: '52px',
          padding: '0 16px',
          borderRadius: '12px',
          background: 'var(--elv, #EDEDEA)',
          color: 'var(--t1, #1C1916)',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow:
            'var(--sh-b)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M10 2l2 2-7 7H3v-2l7-7z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Modifica
      </button>

      <ClienteEditSheet
        cliente={cliente}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
