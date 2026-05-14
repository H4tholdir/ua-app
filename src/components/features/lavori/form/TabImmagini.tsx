'use client'

import { useRef, useState } from 'react'
import type { LavoroImmagine } from '@/types/domain'
import { raisedShadow } from './styles'

interface TabImmaginiProps {
  immagini: LavoroImmagine[]
  lavoro_id: string
  onAdd: (img: LavoroImmagine) => void
}

export function TabImmagini({ immagini, lavoro_id, onAdd }: TabImmaginiProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/lavori/${lavoro_id}/immagini`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Upload fallito: ${res.status}`)
      }

      const json = await res.json()
      if (json.immagine) {
        onAdd(json.immagine as LavoroImmagine)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fallito')
    } finally {
      setUploading(false)
      // Reset file input per poter caricare lo stesso file di nuovo
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function formatData(iso: string | null): string {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div>
      {/* Pulsante upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        aria-hidden="true"
        onChange={handleFileChange}
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '14px',
          borderRadius: '14px',
          border: '1.5px dashed #243580',
          background: uploading ? '#1B2D6B' : 'transparent',
          color: uploading ? '#8899CC' : '#F0F4FF',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          fontWeight: 600,
          cursor: uploading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
          minHeight: '56px',
          opacity: uploading ? 0.7 : 1,
        }}
        aria-busy={uploading}
        aria-label="Aggiungi foto o scan"
      >
        {uploading ? (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle
                cx="9"
                cy="9"
                r="7"
                stroke="#8899CC"
                strokeWidth="2"
                strokeDasharray="30 14"
              />
            </svg>
            Caricamento...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2" y="4" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="9" cy="9.5" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            Aggiungi foto / scan
          </>
        )}
      </button>

      {/* Errore upload */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#3A1A1A',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#FA5252',
          }}
        >
          {error}
        </div>
      )}

      {/* Lista immagini */}
      {immagini.length === 0 ? (
        <div
          style={{
            background: '#1B2D6B',
            borderRadius: '14px',
            padding: '28px 20px',
            textAlign: 'center',
            boxShadow: raisedShadow,
          }}
          role="status"
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: '#8899CC',
              margin: 0,
            }}
          >
            Nessuna immagine allegata
          </p>
        </div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
          aria-label="Immagini allegate"
        >
          {immagini.map((img) => (
            <li
              key={img.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#1B2D6B',
                borderRadius: '12px',
                padding: '10px 14px',
                boxShadow: raisedShadow,
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  minWidth: '48px',
                  borderRadius: '8px',
                  background: '#243580',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {img.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={img.nome_file ?? 'Immagine allegata'}
                    width={48}
                    height={48}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                    loading="lazy"
                  />
                )}
              </div>

              {/* Dettagli */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#F0F4FF',
                    margin: '0 0 2px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {img.nome_file ?? 'Immagine'}
                </p>
                {img.descrizione && (
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px',
                      color: '#8899CC',
                      margin: '0 0 2px',
                    }}
                  >
                    {img.descrizione}
                  </p>
                )}
                {img.data_scatto && (
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '11px',
                      color: '#6677AA',
                      margin: 0,
                    }}
                  >
                    {formatData(img.data_scatto)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
