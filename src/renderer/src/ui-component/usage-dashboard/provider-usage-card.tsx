import type { ReactElement } from 'react'

import { UsageBar } from '#src/renderer/src/ui-component/usage-dashboard/usage-bar'
import { UsageResetRing } from '#src/renderer/src/ui-component/usage-dashboard/usage-reset-ring'
import { UsageRing } from '#src/renderer/src/ui-component/usage-dashboard/usage-ring'
import { usageStatusUtil } from '#src/renderer/src/util/usage-status-util'
import { type IProviderSnapshot, UsageStatus } from '#src/shared/usage-model'

export const ProviderUsageCard = (props: { providerSnapshot: IProviderSnapshot }): ReactElement => {
  const { providerSnapshot } = props
  const usageWindows = providerSnapshot.usage?.windows ?? []
  const primaryWindow = usageWindows[0]
  const secondaryWindows = usageWindows.slice(1)

  return (
    <section className="provider-card">
      <header className="provider-card-header">
        <h2 className="provider-card-title">{providerSnapshot.providerName}</h2>
        <span className={`provider-card-status provider-card-status-${providerSnapshot.status.toLowerCase()}`}>
          {usageStatusUtil.resolveStatusText(providerSnapshot.status)}
        </span>
      </header>
      {providerSnapshot.status === UsageStatus.OK && primaryWindow !== undefined && (
        <div className="provider-card-body">
          <div className="provider-card-rings">
            <UsageRing caption={primaryWindow.label} percent={primaryWindow.usedPercent} />
            {primaryWindow.estimatedResetAt !== undefined && (
              <UsageResetRing estimatedResetAt={primaryWindow.estimatedResetAt} />
            )}
          </div>
          <div className="provider-card-windows">
            {secondaryWindows.map((usageWindow) => {
              return <UsageBar key={usageWindow.label} label={usageWindow.label} percent={usageWindow.usedPercent} />
            })}
          </div>
        </div>
      )}
      {providerSnapshot.status === UsageStatus.UNCONFIGURED && (
        <p className="provider-card-message">Add an access token in settings to track usage.</p>
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
