import { type ReactElement, useEffect, useState } from 'react'

import { dateUtil } from '#src/renderer/src/util/date-util'
import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'

const RING_RADIUS = 46
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const TICK_INTERVAL_MS = 30_000
const WINDOW_DURATION_MS = 5 * 60 * 60 * 1000

export const UsageResetRing = (props: { estimatedResetAt: number }): ReactElement => {
  const { estimatedResetAt } = props
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

  const remainingMs = Math.max(0, estimatedResetAt - now)
  const elapsedFraction = Math.min(Math.max(1 - remainingMs / WINDOW_DURATION_MS, 0), 1)
  const roundedElapsedPercent = Math.round(elapsedFraction * 100)
  const dashOffset = RING_CIRCUMFERENCE * (1 - elapsedFraction)

  return (
    <div
      aria-label="time until window reset"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={roundedElapsedPercent}
      className="reset-ring"
      role="meter"
    >
      <svg className="reset-ring-svg" viewBox="0 0 112 112">
        <circle className="reset-ring-track" cx="56" cy="56" fill="none" r={RING_RADIUS} strokeWidth="10" />
        <circle
          className="reset-ring-fill"
          cx="56"
          cy="56"
          fill="none"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="10"
          transform="rotate(-90 56 56)"
        />
      </svg>
      <div className="reset-ring-center">
        <span className="reset-ring-caption">5-hour reset in</span>
        <span className="reset-ring-remaining">{usageResetUtil.resolveRemainingText({ remainingMs })}</span>
        <span className="reset-ring-caption">resets ~{dateUtil.formatHourMinute(estimatedResetAt)}</span>
      </div>
    </div>
  )
}
