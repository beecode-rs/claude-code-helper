import type { ReactElement } from 'react'

import { usageSeverityUtil } from '#src/renderer/src/util/usage-severity-util'

export const UsageBar = (props: { label: string; percent: number }): ReactElement => {
  const { label, percent } = props
  const clampedPercent = Math.min(Math.max(percent, 0), 100)
  const severityColor = usageSeverityUtil.resolveSeverityColorVar(clampedPercent)

  return (
    <div
      aria-label={`${label} usage`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clampedPercent)}
      className="usage-bar"
      role="meter"
    >
      <div className="usage-bar-header">
        <span className="usage-bar-label">{label}</span>
        <span className="usage-bar-value">{Math.round(clampedPercent)}%</span>
      </div>
      <div className="usage-bar-track">
        <div
          className="usage-bar-fill"
          style={{ backgroundColor: severityColor, width: `${String(clampedPercent)}%` }}
        />
      </div>
    </div>
  )
}
