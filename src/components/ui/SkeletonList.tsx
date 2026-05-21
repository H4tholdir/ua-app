import { SkeletonCard } from './SkeletonCard'

interface SkeletonListProps {
  count?: number
  hasAvatar?: boolean
}

export function SkeletonList({ count = 4, hasAvatar = false }: SkeletonListProps) {
  return (
    <div style={{ padding: '0 16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasAvatar={hasAvatar} lines={i % 2 === 0 ? 3 : 2} />
      ))}
    </div>
  )
}
