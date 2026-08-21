import { type ReactElement, useEffect, useState } from 'react'

import { dateUtil } from '#src/renderer/src/util/date-util'

const TICK_INTERVAL_MS = 1000

export const DashboardFooter = (props: { lastFetchedAt?: number; pollIntervalSeconds?: number }): ReactElement => {
  const { lastFetchedAt, pollIntervalSeconds } = props
  const [nowMs, setNowMs] = useState((): number => {
    return Date.now()
  })

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowMs(Date.now())
    }, TICK_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const refreshIntervalMs = (pollIntervalSeconds ?? 0) * 1000

  const resolveUpdatedLabel = (): string => {
    if (lastFetchedAt === undefined) {
      return 'Waiting for first refresh…'
    }

    return `Updated ${dateUtil.formatClockTime(lastFetchedAt)}`
  }

  const resolveNextRefreshLabel = (): string => {
    if (lastFetchedAt === undefined || refreshIntervalMs === 0) {
      return ''
    }

    const remainingMs = Math.max(0, lastFetchedAt + refreshIntervalMs - nowMs)

    if (remainingMs === 0) {
      return 'Refreshing…'
    }

    return `Next refresh in ${dateUtil.formatCountdown(remainingMs)}`
  }

  const resolveFillPercent = (): number => {
    if (lastFetchedAt === undefined || refreshIntervalMs === 0) {
      return 0
    }

    const elapsedMs = Math.max(0, nowMs - lastFetchedAt)

    return Math.min(100, (elapsedMs / refreshIntervalMs) * 100)
  }

  return (
    <footer className="dashboard-footer">
      <span className="dashboard-footer-text">{resolveUpdatedLabel()}</span>
      <span className="dashboard-footer-text">{resolveNextRefreshLabel()}</span>
      <div className="dashboard-footer-track">
        <div
          className="dashboard-footer-fill"
          key={lastFetchedAt ?? 0}
          style={{ width: `${String(resolveFillPercent())}%` }}
        />
      </div>
    </footer>
  )
}
