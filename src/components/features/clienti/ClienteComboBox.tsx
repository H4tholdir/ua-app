'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser-anon'

// ─── Stili condivisi (allineati a TabDati.tsx) ────────────────
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#0F1E52',
  border: '1px solid #243580',
  color: '#F0F4FF',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow:
    'inset 3px 3px 8px hsl(230 100% 4% / 0.8), inset -2px -2px 6px hsl(220 80% 35% / 0.4)',
  outline: 'none',
  boxSizing: 'border-box',
}

interface ClienteOption {
  id: string
  nome: string
  cognome: string
  studio_nome: string | null
}

export interface ClienteComboBoxProps {
  value: string
  onChange: (id: string, label: string) => void
  placeholder?: string
}

function buildLabel(option: ClienteOption): string {
  return option.studio_nome
    ? `${option.studio_nome} — ${option.nome} ${option.cognome}`
    : `${option.nome} ${option.cognome}`
}

export function ClienteComboBox({
  value,
  onChange,
  placeholder = 'Cerca dentista o studio...',
}: ClienteComboBoxProps) {
  const inputId = useId()
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<ClienteOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset display when parent clears the value externally.
  // Using a subscription-style pattern: we subscribe to external value changes
  // and update the controlled display state accordingly.
  const prevValueRef = useRef(value)
  useEffect(() => {
    // This effect subscribes to external state (the `value` prop from the parent)
    // and mirrors it into local display state — a valid useEffect use case.
    if (prevValueRef.current !== '' && value === '') {
      prevValueRef.current = value
      setSelectedLabel('')
      setQuery('')
    } else {
      prevValueRef.current = value
    }
  }, [value])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setOptions([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      const supabase = getBrowserClient()
      const { data, error } = await supabase
        .from('clienti')
        .select('id, nome, cognome, studio_nome')
        .or(
          `nome.ilike.%${q}%,cognome.ilike.%${q}%,studio_nome.ilike.%${q}%`
        )
        .limit(8)

      if (!error && data) {
        setOptions(data as ClienteOption[])
        setOpen(data.length > 0)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    // Clear selection if user edits the text after selecting
    if (value) {
      onChange('', '')
      setSelectedLabel('')
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  function closeDropdown() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function handleSelect(option: ClienteOption) {
    const label = buildLabel(option)
    setSelectedLabel(label)
    setQuery(label)
    closeDropdown()
    setOptions([])
    onChange(option.id, label)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && options[activeIndex]) {
        handleSelect(options[activeIndex])
      }
    } else if (e.key === 'Escape') {
      closeDropdown()
    }
  }

  const displayValue = selectedLabel || query

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        autoComplete="off"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query && options.length > 0) setOpen(true)
        }}
        placeholder={placeholder}
        style={{
          ...inputBase,
          paddingRight: loading ? '40px' : (inputBase.padding as string),
        }}
      />

      {/* Loading indicator */}
      {loading && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid #243580',
            borderTopColor: '#D4A843',
            animation: 'combobox-spin 0.7s linear infinite',
            display: 'inline-block',
          }}
        />
      )}

      {/* Dropdown */}
      {open && options.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Risultati ricerca dentista"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            margin: 0,
            padding: '4px',
            listStyle: 'none',
            borderRadius: '12px',
            background: '#1B2D6B',
            border: '1px solid #243580',
            boxShadow:
              '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {options.map((option, index) => {
            const isActive = index === activeIndex

            return (
              <li
                key={option.id}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(e) => {
                  // Prevent blur before click registers
                  e.preventDefault()
                  handleSelect(option)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: '#F0F4FF',
                  background: isActive ? '#243580' : 'transparent',
                  transition: 'background 0.1s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {option.nome} {option.cognome}
                </span>
                {option.studio_nome && (
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#8899CC',
                    }}
                  >
                    {option.studio_nome}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Spinner keyframe — injected once */}
      <style>{`
        @keyframes combobox-spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
