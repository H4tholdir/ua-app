'use client'
import { motion } from 'motion/react'

interface SkeletonCardProps {
  lines?: number
  hasAvatar?: boolean
}

export function SkeletonCard({ lines = 3, hasAvatar = false }: SkeletonCardProps) {
  return (
    <motion.div
      style={{
        background: 'var(--sfc, #E4DFD9)',
        borderRadius: 14,
        padding: '16px',
        marginBottom: 12,
      }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {hasAvatar && (
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--prs, #D4CFC9)', marginBottom: 12,
        }} />
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 14,
          background: 'var(--prs, #D4CFC9)',
          borderRadius: 7,
          marginBottom: 8,
          width: i === lines - 1 ? '60%' : '100%',
        }} />
      ))}
    </motion.div>
  )
}
