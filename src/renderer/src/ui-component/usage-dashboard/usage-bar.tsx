import type { ReactElement } from 'react'

import { usageSeverityUtil } from '#src/renderer/src/util/usage-severity-util'

export const UsageBar = (props: {
  ariaLabel?: string
  fillColor?: string
  label: string
  percent: number
  valueText?: string
}): ReactElement => {
  const { ariaLabel, fillColor, label, percent, valueText } = props
  const clampedPercent = Math.min(Math.max(percent, 0), 100)
  const resolvedAriaLabel = ariaLabel ?? `${label} usage`
  const resolvedFillColor = fillColor ?? usageSeverityUtil.resolveSeverityColorVar(clampedPercent)
  const resolvedValueText = valueText ?? `${String(Math.round(clampedPercent))}%`

  return (
    <div
      aria-label={resolvedAriaLabel}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clampedPercent)}
      className="usage-bar"
      role="meter"
    >
      <div className="usage-bar-header">
        <span className="usage-bar-label">{label}</span>
        <span className="usage-bar-value">{resolvedValueText}</span>
      </div>
      <div className="usage-bar-track">
        <div
          className="usage-bar-fill"
          style={{ backgroundColor: resolvedFillColor, width: `${String(clampedPercent)}%` }}
        />
      </div>
    </div>
  )
}
