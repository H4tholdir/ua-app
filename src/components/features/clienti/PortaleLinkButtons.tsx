'use client'

import { useState, useCallback } from 'react'
import { hapticLight } from '@/lib/feedback/haptic'

interface Props {
  portaleToken: string
  clienteNome?: string
}

function CopyButton({
  url,
  label,
  successLabel,
}: {
  url: string
  label: string
  successLabel: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
        await navigator.share({ url, title: label })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Fallback: tenta clipboard comunque
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // ignore
      }
    }
  }, [url, label])

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '44px',
        padding: '0 16px',
        borderRadius: '10px',
        background: copied ? 'var(--success, #16A34A)' : 'var(--elv, #EDEDEA)',
        border: 'none',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '13px',
        fontWeight: 700,
        color: copied ? '#fff' : 'var(--t1, #1C1916)',
        cursor: 'pointer',
        transition: 'background 0.14s',
        marginRight: '8px',
        marginBottom: '8px',
      }}
      aria-label={copied ? successLabel : label}
    >
      {copied ? '✓ Copiato!' : label}
    </button>
  )
}

function SharePortaleButton({
  portaleUrl,
  clienteNome,
}: {
  portaleUrl: string
  clienteNome: string
}) {
  const [loading, setLoading] = useState(false)

  const handleShare = useCallback(async () => {
    hapticLight()
    setLoading(true)

    const text = `Gentile ${clienteNome},\npuò seguire i Suoi lavori in tempo reale qui:\n${portaleUrl}`

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Portale UÀ', text, url: portaleUrl })
      } else {
        // Desktop fallback: open WhatsApp web with prefilled message
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
      }
    } catch {
      // User cancelled share — silent
    } finally {
      setLoading(false)
    }
  }, [portaleUrl, clienteNome])

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '44px',
        padding: '0 16px',
        borderRadius: '10px',
        background: 'var(--primary, #D90012)',
        border: 'none',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '13px',
        fontWeight: 700,
        color: '#fff',
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'opacity 0.14s',
        marginRight: '8px',
        marginBottom: '8px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.18), 0 4px 12px -2px rgba(180,0,0,.34)',
      }}
      aria-label="Condividi portale dentista"
    >
      {loading ? '...' : '📤 Condividi portale'}
    </button>
  )
}

export function PortaleLinkButtons({ portaleToken, clienteNome }: Props) {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://uachelab.com'

  const portaleUrl = `${base}/portale/${portaleToken}`
  const richiestaUrl = `${base}/richiedi/${portaleToken}`

  const nomeDisplay = clienteNome ?? 'Dottore'

  return (
    <div style={{ padding: '10px 0' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t2, #96918D)', margin: '0 0 10px', wordBreak: 'break-all' }}>
        {richiestaUrl}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
        <SharePortaleButton portaleUrl={portaleUrl} clienteNome={nomeDisplay} />
        <CopyButton
          url={richiestaUrl}
          label="📎 Copia link ordinazione"
          successLabel="Link ordinazione copiato"
        />
        <CopyButton
          url={portaleUrl}
          label="🔗 Copia link stato lavori"
          successLabel="Link portale copiato"
        />
      </div>
    </div>
  )
}
