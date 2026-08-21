import type { ReactElement } from 'react'

import { UsageBar } from '#src/renderer/src/ui-component/usage-dashboard/usage-bar'
import { UsageResetRing } from '#src/renderer/src/ui-component/usage-dashboard/usage-reset-ring'
import { UsageRing } from '#src/renderer/src/ui-component/usage-dashboard/usage-ring'
import { dateUtil } from '#src/renderer/src/util/date-util'
import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'
import { usageStatusUtil } from '#src/renderer/src/util/usage-status-util'
import { type IProviderSnapshot, UsageStatus } from '#src/shared/usage-model'

export const ProviderUsageCard = (props: {
  onOpenSettings: () => void
  providerSnapshot: IProviderSnapshot
}): ReactElement => {
  const { onOpenSettings, providerSnapshot } = props
  const usageWindows = providerSnapshot.usage ?? []
  const primaryWindow = usageWindows[0]
  const secondaryWindows = usageWindows.slice(1)
  const windowStartedAt = usageResetUtil.resolveWindowStartedAt({ resetAt: primaryWindow?.resetAt })

  return (
    <section className="provider-card">
      <header className="provider-card-header">
        <div className="provider-card-heading">
          <h2 className="provider-card-title">{providerSnapshot.trackerName}</h2>
          {windowStartedAt !== undefined && (
            <span className="provider-card-window-start">since {dateUtil.formatHourMinute(windowStartedAt)}</span>
          )}
        </div>
        <div className="provider-card-actions">
          <span className={`provider-card-status provider-card-status-${providerSnapshot.status.toLowerCase()}`}>
            {usageStatusUtil.resolveStatusText(providerSnapshot.status)}
          </span>
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
          <div className="provider-card-rings">
            <UsageRing caption={primaryWindow.label} percent={primaryWindow.usedPercent} />
            {primaryWindow.resetAt !== undefined && <UsageResetRing resetAt={primaryWindow.resetAt} />}
          </div>
          <div className="provider-card-windows">
            {secondaryWindows.map((usageWindow) => {
              return <UsageBar key={usageWindow.label} label={usageWindow.label} percent={usageWindow.usedPercent} />
            })}
          </div>
        </div>
      )}
      {providerSnapshot.status === UsageStatus.PENDING && <p className="provider-card-message">Loading usage…</p>}
      {providerSnapshot.status === UsageStatus.UNCONFIGURED && (
        <p className="provider-card-message">Add an access token in this tracker&apos;s settings to track usage.</p>
      )}
      {providerSnapshot.status === UsageStatus.ERROR && (
        <p className="provider-card-message provider-card-message-error">{providerSnapshot.errorMessage}</p>
      )}
      {providerSnapshot.status === UsageStatus.OK && primaryWindow === undefined && (
        <p className="provider-card-message">No usage windows returned.</p>
      )}
    </section>
  )
}
