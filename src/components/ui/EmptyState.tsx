'use client'
import { motion } from 'motion/react'
import { motionTokens } from '@/design-system/motion'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  cta?: { label: string; href?: string; onClick?: () => void }
}

export function EmptyState({ icon = '📋', title, description, cta }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.enter }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
        minHeight: 280,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{icon}</div>
      <h3 style={{
        fontSize: 18, fontWeight: 700, color: 'var(--t1, #1C1916)',
        marginBottom: description ? 8 : cta ? 20 : 0, fontFamily: 'DM Sans, sans-serif',
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: 14, color: 'var(--t2, #4A3D33)',
          marginBottom: cta ? 24 : 0, maxWidth: 280, lineHeight: 1.5,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {description}
        </p>
      )}
      {cta && (
        <a
          href={cta.href}
          onClick={cta.onClick}
          style={{
            display: 'inline-block', padding: '12px 24px',
            background: 'var(--primary, #D90012)', color: 'white',
            borderRadius: 12, fontWeight: 700, fontSize: 14,
            textDecoration: 'none', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {cta.label}
        </a>
      )}
    </motion.div>
  )
}
