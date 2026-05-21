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
            'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
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
