import type { ReactElement } from 'react'

const DEFAULT_ICON_SIZE = 15

export const ServerIcon = (props: { size?: number }): ReactElement => {
  const { size } = props
  const resolvedSize = size ?? DEFAULT_ICON_SIZE

  return (
    <svg
      fill="none"
      height={resolvedSize}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width={resolvedSize}
    >
      <rect height="8" rx="2" ry="2" width="20" x="2" y="2" />
      <rect height="8" rx="2" ry="2" width="20" x="2" y="14" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  )
}
