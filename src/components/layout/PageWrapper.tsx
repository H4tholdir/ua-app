import type { ReactNode } from 'react'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export function PageWrapper({ children, className = '' }: PageWrapperProps) {
  return (
    <div
      className={className}
      style={{ paddingBottom: '120px' }}
    >
      {children}
    </div>
  )
}
