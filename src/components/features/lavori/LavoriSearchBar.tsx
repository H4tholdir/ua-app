'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { useDebouncedCallback } from 'use-debounce'

export function LavoriSearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }, 300)

  return (
    <div
      style={{
        padding: '0 20px 12px',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg, #DDD8D3)',
          borderRadius: '14px',
          padding: '0 14px',
          boxShadow: 'inset 4px 4px 9px rgba(148,128,118,.32), inset -3px -3px 7px rgba(255,255,255,.66)',
        }}
      >
        {/* Icona ricerca */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0, color: 'var(--t3, #6B5C51)' }}
        >
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          type="search"
          defaultValue={defaultValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cerca lavoro, paziente o dentista..."
          aria-label="Cerca lavori"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            height: '48px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '16px',
            fontWeight: 400,
            color: 'var(--t1, #1C1916)',
          }}
        />

        {/* Spinner durante navigazione */}
        {isPending && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{
              flexShrink: 0,
              color: 'var(--t2, #4A3D33)',
              animation: 'spin 0.8s linear infinite',
            }}
          >
            <path
              d="M8 1.5A6.5 6.5 0 111.5 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
