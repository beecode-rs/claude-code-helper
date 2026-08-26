import type { ReactElement } from 'react'

const DEFAULT_ICON_SIZE = 13

export const PeakIcon = (props: { size?: number }): ReactElement => {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 13" />
    </svg>
  )
}
