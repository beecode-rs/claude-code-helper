import { type ReactElement, useEffect, useState } from 'react'

import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'

const RING_RADIUS = 60
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const TICK_INTERVAL_MS = 30_000

export const UsageResetRing = (props: { resetAt: number }): ReactElement => {
  const { resetAt } = props
  const [now, setNow] = useState(() => {
    return Date.now()
  })

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now())
    }, TICK_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const remainingMs = Math.max(0, resetAt - now)
  const elapsedFraction = Math.min(Math.max(1 - remainingMs / usageResetUtil.fiveHourWindowMs, 0), 1)
  const roundedElapsedPercent = Math.round(elapsedFraction * 100)
  const dashOffset = RING_CIRCUMFERENCE * (1 - elapsedFraction)

  return (
    <div
      aria-label="time until five hour window reset"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={roundedElapsedPercent}
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
          stroke="var(--meter-accent)"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="12"
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div className="usage-ring-center">
        <span className="reset-ring-time">{usageResetUtil.resolveRemainingText({ remainingMs })}</span>
        <span className="usage-ring-caption">5-hour reset in</span>
      </div>
    </div>
  )
}
