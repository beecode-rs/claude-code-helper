import type { ReactElement } from 'react'

import { usageSeverityUtil } from '#src/renderer/src/util/usage-severity-util'

const RING_RADIUS = 60
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export const UsageRing = (props: { caption: string; percent: number }): ReactElement => {
  const { caption, percent } = props
  const clampedPercent = Math.min(Math.max(percent, 0), 100)
  const roundedPercent = Math.round(clampedPercent)
  const dashOffset = RING_CIRCUMFERENCE * (1 - clampedPercent / 100)
  const severityColor = usageSeverityUtil.resolveSeverityColorVar(clampedPercent)
  const severityLabel = usageSeverityUtil.resolveSeverityLabel(clampedPercent)

  return (
    <div
      aria-label={`${caption} usage`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={roundedPercent}
      className="usage-ring"
      role="meter"
    >
      <svg className="usage-ring-svg" viewBox="0 0 160 160">
        <circle className="usage-ring-track" cx="80" cy="80" fill="none" r={RING_RADIUS} strokeWidth="12" />
        <circle
          className="usage-ring-fill"
          cx="80"
          cy="80"
          fill="none"
          r={RING_RADIUS}
          stroke={severityColor}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="12"
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div className="usage-ring-center">
        <span className="usage-ring-percent">{roundedPercent}%</span>
        <span className="usage-ring-caption">{caption}</span>
        {severityLabel !== '' && <span className="usage-ring-severity">{severityLabel}</span>}
      </div>
    </div>
  )
}
