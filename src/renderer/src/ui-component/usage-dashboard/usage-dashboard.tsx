import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { SettingsPanel } from '#src/renderer/src/ui-component/settings/settings-panel'
import { DashboardFooter } from '#src/renderer/src/ui-component/usage-dashboard/dashboard-footer'
import { ProviderUsageCard } from '#src/renderer/src/ui-component/usage-dashboard/provider-usage-card'
import '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard.css'
import type { IUsageSnapshot } from '#src/shared/usage-model'

export const UsageDashboard = (): ReactElement => {
  const [snapshot, setSnapshot] = useState<IUsageSnapshot | undefined>(undefined)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState<number | undefined>(undefined)

  const loadSettings = async (): Promise<void> => {
    const settings = await usageClientService.getSettings()

    setPollIntervalSeconds(settings.pollIntervalSeconds)
  }

  const refreshUsage = async (): Promise<void> => {
    setIsRefreshing(true)
    await usageClientService.refreshNow()
    setIsRefreshing(false)
  }

  useEffect(() => {
    const unsubscribe = usageClientService.subscribeToUsageUpdates({
      onUpdate: (updatedSnapshot) => {
        setSnapshot(updatedSnapshot)
      },
    })

    void usageClientService.refreshNow()

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [])

  const hasSnapshot = snapshot !== undefined
  const providerSnapshots = snapshot?.providers ?? []

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Usage Pulse</h1>
          <p className="dashboard-subtitle">Claude and z.ai plan limits</p>
        </div>
        <div className="dashboard-actions">
          <button
            className="button"
            disabled={isRefreshing}
            onClick={() => {
              void refreshUsage()
            }}
            type="button"
          >
            Refresh
          </button>
          <button
            className="button"
            onClick={() => {
              setIsSettingsOpen(true)
            }}
            type="button"
          >
            Settings
          </button>
        </div>
      </header>
      <main className="dashboard-grid">
        {providerSnapshots.map((providerSnapshot) => {
          return <ProviderUsageCard key={providerSnapshot.providerId} providerSnapshot={providerSnapshot} />
        })}
        {!hasSnapshot && <p className="dashboard-empty">Loading usage…</p>}
      </main>
      <DashboardFooter lastFetchedAt={snapshot?.fetchedAt} pollIntervalSeconds={pollIntervalSeconds} />
      {isSettingsOpen && (
        <SettingsPanel
          onClose={() => {
            setIsSettingsOpen(false)
          }}
          onSaved={() => {
            void loadSettings()
            void refreshUsage()
          }}
        />
      )}
    </div>
  )
}
