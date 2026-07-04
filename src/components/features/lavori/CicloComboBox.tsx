'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'var(--bg, #DDD8D3)',
  border: '1px solid var(--elv, #EDEDEA)',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow:
    'inset 3px 3px 8px rgba(0,0,0,.07), inset -2px -2px 6px rgba(255,255,255,.70)',
  outline: 'none',
  boxSizing: 'border-box',
}

interface CicloOption {
  id: string
  codice: string
  nome: string
  tipo_dispositivo: string
}

export interface CicloComboBoxProps {
  value: string
  onChange: (id: string, label: string) => void
  placeholder?: string
  id?: string
}

function buildLabel(option: CicloOption): string {
  return `${option.codice} — ${option.nome}`
}

export function CicloComboBox({
  value,
  onChange,
  placeholder = 'Cerca ciclo per codice o nome...',
  id,
}: CicloComboBoxProps) {
  const inputId = useId()
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<CicloOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  const prevValueRef = useRef(value)
  useEffect(() => {
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
    const thisRequest = ++requestIdRef.current
    try {
      const res = await fetch(`/api/cicli?q=${encodeURIComponent(q)}`)
      const json = res.ok ? await res.json() : { cicli: [] }
      if (thisRequest !== requestIdRef.current) return
      setOptions(Array.isArray(json.cicli) ? json.cicli : [])
      setOpen((Array.isArray(json.cicli) ? json.cicli : []).length > 0)
    } finally {
      if (thisRequest === requestIdRef.current) setLoading(false)
    }
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
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

  function handleSelect(option: CicloOption) {
    const label = buildLabel(option)
    setSelectedLabel(label)
    setQuery(label)
    closeDropdown()
    setOptions([])
    onChange(option.id, label)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
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
        id={id ?? inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (query && options.length > 0) setOpen(true) }}
        placeholder={placeholder}
        style={{ ...inputBase, paddingRight: loading ? '40px' : '14px' }}
      />

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
            border: '2px solid rgba(0,0,0,.12)',
            borderTopColor: 'var(--primary, #D90012)',
            animation: 'ciclo-combobox-spin 0.7s linear infinite',
            display: 'inline-block',
          }}
        />
      )}

      {open && options.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Risultati ricerca ciclo"
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
            background: 'var(--surface, #E4DFD9)',
            border: '1px solid var(--elv, #EDEDEA)',
            boxShadow: 'var(--sh-b)',
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
                onMouseDown={(e) => { e.preventDefault(); handleSelect(option) }}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: 'var(--t1, #1C1916)',
                  background: isActive ? 'var(--elv, #EDEDEA)' : 'transparent',
                  transition: 'background var(--tr)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span style={{ fontWeight: 600 }}>{option.nome}</span>
                <span style={{ fontSize: '12px', color: 'var(--t2, #4A3D33)' }}>
                  {option.codice} · <span>{option.tipo_dispositivo}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <style>{`
        @keyframes ciclo-combobox-spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
