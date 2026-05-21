'use client'

import { useState, useCallback } from 'react'

interface Props {
  portaleToken: string
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

export function PortaleLinkButtons({ portaleToken }: Props) {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://uachelab.com'

  const portaleUrl = `${base}/portale/${portaleToken}`
  const richiestaUrl = `${base}/richiedi/${portaleToken}`

  return (
    <div style={{ padding: '10px 0' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t2, #96918D)', margin: '0 0 10px', wordBreak: 'break-all' }}>
        {richiestaUrl}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
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
