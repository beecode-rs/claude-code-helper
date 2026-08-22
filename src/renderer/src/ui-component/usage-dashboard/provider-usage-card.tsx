import type { ReactElement } from 'react'

import { ProviderIcon } from '#src/renderer/src/ui-component/provider/provider-icon'
import { UsageBar } from '#src/renderer/src/ui-component/usage-dashboard/usage-bar'
import { UsageWindowBox } from '#src/renderer/src/ui-component/usage-dashboard/usage-window-box'
import { dateUtil } from '#src/renderer/src/util/date-util'
import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'
import { usageStatusUtil } from '#src/renderer/src/util/usage-status-util'
import { zaiPeakUtil } from '#src/renderer/src/util/zai-peak-util'
import { type IProviderSnapshot, UsageStatus } from '#src/shared/usage-model'

export const ProviderUsageCard = (props: {
  isAutoRefreshPaused: boolean
  isRefreshing: boolean
  nowMs: number
  onOpenSettings: () => void
  onRefresh: () => void
  onToggleAutoRefresh: () => void
  providerSnapshot: IProviderSnapshot
  refreshIntervalSeconds?: number
}): ReactElement => {
  const {
    isAutoRefreshPaused,
    isRefreshing,
    nowMs,
    onOpenSettings,
    onRefresh,
    onToggleAutoRefresh,
    providerSnapshot,
    refreshIntervalSeconds,
  } = props
  const usageWindows = providerSnapshot.usage ?? []
  const primaryWindow = usageWindows[0]
  const secondaryWindows = usageWindows.slice(1)
  const windowStartedAt = usageResetUtil.resolveWindowStartedAt({
    resetAt: primaryWindow?.resetAt,
    windowMs: primaryWindow?.windowMs ?? usageResetUtil.fiveHourWindowMs,
  })
  const peakInfo = zaiPeakUtil.resolvePeakInfo({ nowMs, providerId: providerSnapshot.providerId })

  const resolveCardClassName = (): string => {
    if (peakInfo?.isPeakHour === true) {
      return 'provider-card is-peak-hour'
    }

    return 'provider-card'
  }

  const resolveRefreshButtonClassName = (): string => {
    if (isRefreshing) {
      return 'provider-card-refresh is-refreshing'
    }

    return 'provider-card-refresh'
  }

  const resolvePauseButtonClassName = (): string => {
    if (isAutoRefreshPaused) {
      return 'provider-card-pause is-paused'
    }

    return 'provider-card-pause'
  }

  const resolvePauseButtonAriaLabel = (): string => {
    if (isAutoRefreshPaused) {
      return 'Resume auto-refresh'
    }

    return 'Pause auto-refresh'
  }

  const renderPauseIcon = (): ReactElement => {
    if (isAutoRefreshPaused) {
      return (
        <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15">
          <polygon points="6 4 20 12 6 20 6 4" />
        </svg>
      )
    }

    return (
      <svg fill="none" height="15" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15">
        <line x1="9" x2="9" y1="5" y2="19" />
        <line x1="15" x2="15" y1="5" y2="19" />
      </svg>
    )
  }

  const resolvePendingMessage = (): string => {
    if (isAutoRefreshPaused) {
      return 'Auto-refresh is paused. Refresh to load usage.'
    }

    return 'Loading usage…'
  }

  const renderPeakIcon = (): ReactElement => {
    return (
      <svg
        fill="none"
        height="13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="13"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 13" />
      </svg>
    )
  }

  const renderPeakItem = (): ReactElement | undefined => {
    if (peakInfo === undefined) {
      return undefined
    }

    const tooltipText = `Premium models are billed at 3× credits on weekdays 14:00–18:00 (UTC+8) — ${peakInfo.peakWindowText} your time.`

    if (peakInfo.isPeakHour) {
      return (
        <span aria-label={tooltipText} className="provider-card-footer-item is-peak-active" data-tooltip={tooltipText}>
          {renderPeakIcon()}
          3× peak until {peakInfo.peakEndsAtText}
        </span>
      )
    }

    return (
      <span aria-label={tooltipText} className="provider-card-footer-item" data-tooltip={tooltipText}>
        {renderPeakIcon()}
        Peak {peakInfo.peakWindowText}
      </span>
    )
  }

  const renderUpdatedItem = (): ReactElement | undefined => {
    if (providerSnapshot.fetchedAt === undefined) {
      return undefined
    }

    const elapsedText = dateUtil.formatDuration(nowMs - providerSnapshot.fetchedAt)
    const tooltipText = `Updated ${elapsedText} ago`

    return (
      <span aria-label={tooltipText} className="provider-card-footer-item" data-tooltip={tooltipText}>
        <svg
          fill="none"
          height="13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="13"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {elapsedText}
      </span>
    )
  }

  const renderWindowStartedItem = (): ReactElement | undefined => {
    if (windowStartedAt === undefined) {
      return undefined
    }

    const startedAtText = dateUtil.formatHourMinute(windowStartedAt)
    const tooltipText = `Window started at ${startedAtText}`

    return (
      <span aria-label={tooltipText} className="provider-card-footer-item" data-tooltip={tooltipText}>
        <svg
          fill="none"
          height="13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="13"
        >
          <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
        {startedAtText}
      </span>
    )
  }

  const renderPausedItem = (): ReactElement | undefined => {
    if (!isAutoRefreshPaused) {
      return undefined
    }

    return (
      <span aria-label="Auto-refresh paused" className="provider-card-footer-item" data-tooltip="Auto-refresh paused">
        <svg
          fill="none"
          height="13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="13"
        >
          <line x1="10" x2="10" y1="5" y2="19" />
          <line x1="14" x2="14" y1="5" y2="19" />
        </svg>
        Paused
      </span>
    )
  }

  const renderNextRefreshItem = (): ReactElement | undefined => {
    if (providerSnapshot.nextRefreshAt === undefined) {
      return undefined
    }

    const countdownText = dateUtil.formatCountdown(providerSnapshot.nextRefreshAt - nowMs)
    const tooltipText = `Next refresh in ${countdownText}`

    return (
      <span aria-label={tooltipText} className="provider-card-footer-item" data-tooltip={tooltipText}>
        <svg
          fill="none"
          height="13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="13"
        >
          <line x1="10" x2="14" y1="2" y2="2" />
          <line x1="12" x2="15" y1="14" y2="11" />
          <circle cx="12" cy="14" r="8" />
        </svg>
        {countdownText}
      </span>
    )
  }

  const renderIntervalItem = (): ReactElement | undefined => {
    if (isAutoRefreshPaused || refreshIntervalSeconds === undefined) {
      return undefined
    }

    const intervalText = dateUtil.formatDuration(refreshIntervalSeconds * 1000)
    const tooltipText = `Auto-refreshes every ${intervalText}`

    return (
      <span aria-label={tooltipText} className="provider-card-footer-item" data-tooltip={tooltipText}>
        <svg
          fill="none"
          height="13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="13"
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        {intervalText}
      </span>
    )
  }

  const resolveRefreshProgressPercent = (): number | undefined => {
    if (isAutoRefreshPaused || providerSnapshot.nextRefreshAt === undefined || refreshIntervalSeconds === undefined) {
      return undefined
    }

    const intervalMs = refreshIntervalSeconds * 1000
    const remainingMs = Math.max(0, providerSnapshot.nextRefreshAt - nowMs)
    const elapsedMs = intervalMs - remainingMs

    return Math.min(100, Math.max(0, (elapsedMs / intervalMs) * 100))
  }

  const footerItems = [
    renderPeakItem(),
    renderUpdatedItem(),
    renderWindowStartedItem(),
    renderPausedItem(),
    renderNextRefreshItem(),
    renderIntervalItem(),
  ].filter((item): item is ReactElement => {
    return item !== undefined
  })
  const refreshProgressPercent = resolveRefreshProgressPercent()
  const hasFooterContent = footerItems.length > 0 || refreshProgressPercent !== undefined

  return (
    <section className={resolveCardClassName()}>
      <header className="provider-card-header">
        <div className="provider-card-heading">
          <ProviderIcon providerId={providerSnapshot.providerId} />
          <h2 className="provider-card-title">{providerSnapshot.trackerName}</h2>
        </div>
        <div className="provider-card-actions">
          <span className={`provider-card-status provider-card-status-${providerSnapshot.status.toLowerCase()}`}>
            {usageStatusUtil.resolveStatusText(providerSnapshot.status)}
          </span>
          <button
            aria-label={resolvePauseButtonAriaLabel()}
            className={resolvePauseButtonClassName()}
            onClick={onToggleAutoRefresh}
            type="button"
          >
            {renderPauseIcon()}
          </button>
          <button
            aria-label="Refresh tracker"
            className={resolveRefreshButtonClassName()}
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            <svg
              fill="none"
              height="15"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="15"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
          <button aria-label="Tracker settings" className="provider-card-gear" onClick={onOpenSettings} type="button">
            <svg
              fill="none"
              height="15"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="15"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>
      {providerSnapshot.status === UsageStatus.OK && primaryWindow !== undefined && (
        <div className="provider-card-body">
          <UsageWindowBox
            resetAt={primaryWindow.resetAt}
            title={primaryWindow.label}
            usedPercent={primaryWindow.usedPercent}
            windowMs={primaryWindow.windowMs ?? usageResetUtil.fiveHourWindowMs}
          />
          <div className="provider-card-windows">
            {secondaryWindows.map((usageWindow) => {
              if (usageWindow.windowMs !== undefined) {
                return (
                  <UsageWindowBox
                    key={usageWindow.label}
                    resetAt={usageWindow.resetAt}
                    title={usageWindow.label}
                    usedPercent={usageWindow.usedPercent}
                    windowMs={usageWindow.windowMs}
                  />
                )
              }

              return <UsageBar key={usageWindow.label} label={usageWindow.label} percent={usageWindow.usedPercent} />
            })}
          </div>
        </div>
      )}
      {providerSnapshot.status === UsageStatus.PENDING && (
        <p className="provider-card-message">{resolvePendingMessage()}</p>
      )}
      {providerSnapshot.status === UsageStatus.UNCONFIGURED && (
        <p className="provider-card-message">Add an access token in this tracker&apos;s settings to track usage.</p>
      )}
      {providerSnapshot.status === UsageStatus.ERROR && (
        <p className="provider-card-message provider-card-message-error">{providerSnapshot.errorMessage}</p>
      )}
      {providerSnapshot.status === UsageStatus.OK && primaryWindow === undefined && (
        <p className="provider-card-message">No usage windows returned.</p>
      )}
      {hasFooterContent && (
        <footer className="provider-card-footer">
          {footerItems.length > 0 && <div className="provider-card-footer-meta">{footerItems}</div>}
          {refreshProgressPercent !== undefined && (
            <div
              aria-label="Time until next auto-refresh"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(refreshProgressPercent)}
              className="provider-card-progress-track"
              role="meter"
            >
              <div className="provider-card-progress-fill" style={{ width: `${String(refreshProgressPercent)}%` }} />
            </div>
          )}
        </footer>
      )}
    </section>
  )
}
